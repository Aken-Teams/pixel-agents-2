import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { TeamSession, ChatMessage } from './types.js';
import type { TeamMemberInfo } from './wsProtocol.js';
import type { Broadcast } from './timerManager.js';
import type { SkillDefinition } from './skillLoader.js';
import { getAssetsRoot } from './config.js';
import { formatToolStatus } from './transcriptParser.js';

const teamSessions = new Map<string, TeamSession>();
let cachedSkills: SkillDefinition[] = [];

let nextAgentIdRef: { current: number } = { current: 1000 };

// Orchestrator state
let orchestratorSkillId: string | null = null;
let orchestratorBusy = false;
let taskIdCounter = 0;

// Current project directory (under workspace/)
let currentProjectDir: string | null = null;

const MAX_ORCHESTRATION_DEPTH = 10;

export function initTeamManager(ref: { current: number }): void {
	nextAgentIdRef = ref;
}

export function getOrchestratorSkillId(): string | null {
	return orchestratorSkillId;
}

/**
 * Load team from skill definitions. Creates pixel characters for each member.
 * Called at server startup and when skill files change.
 */
export function loadTeam(skills: SkillDefinition[], broadcast: Broadcast): void {
	// Remove members whose skills were deleted
	for (const [skillId, session] of teamSessions) {
		if (!skills.find((s) => s.id === skillId)) {
			if (session.activeProcess) {
				try { session.activeProcess.kill('SIGTERM'); } catch { /* */ }
			}
			broadcast({ type: 'agentClosed', id: session.agentId });
			teamSessions.delete(skillId);
			console.log(`[Team] Removed member ${session.name} (skill ${skillId})`);
		}
	}

	// Identify orchestrator
	orchestratorSkillId = null;
	for (const skill of skills) {
		if (skill.role === 'orchestrator') {
			orchestratorSkillId = skill.id;
			break;
		}
	}

	cachedSkills = skills;

	// Add or update members
	for (const skill of skills) {
		const existing = teamSessions.get(skill.id);
		if (existing) {
			// Update system prompt if changed, keep history
			existing.name = skill.name;
			existing.systemPrompt = buildSystemPrompt(skill, skills);
			continue;
		}

		const agentId = nextAgentIdRef.current++;
		const session: TeamSession = {
			skillId: skill.id,
			name: skill.name,
			agentId,
			activeProcess: null,
			history: [],
			systemPrompt: buildSystemPrompt(skill, skills),
		};
		teamSessions.set(skill.id, session);

		console.log(`[Team] Added member ${skill.name} (skill ${skill.id}, agent ${agentId}${skill.role === 'orchestrator' ? ', ORCHESTRATOR' : ''})`);
		broadcast({ type: 'agentCreated', id: agentId, name: skill.name });
	}

	// Broadcast full team info
	broadcast({
		type: 'teamLoaded',
		members: getTeamMemberInfos(skills),
		orchestratorSkillId: orchestratorSkillId ?? undefined,
	});

	if (orchestratorSkillId) {
		console.log(`[Team] Orchestrator identified: ${orchestratorSkillId}`);
	}
}

/**
 * Build the system prompt for a skill. For orchestrator, inject team member list.
 */
function buildSystemPrompt(skill: SkillDefinition, allSkills: SkillDefinition[]): string {
	const langRule = '\n\n## 語言規則\n- 你必須全程使用繁體中文回覆，不可使用英文回答。';

	if (skill.role !== 'orchestrator') return skill.systemPrompt + langRule;

	// Build team member list for orchestrator
	const workers = allSkills.filter((s) => s.id !== skill.id);
	const memberList = workers.map((w) => {
		const desc = w.description || w.systemPrompt.split('\n').find((l) => l.trim() && !l.startsWith('#'))?.trim() || '';
		return `- **${w.name}** (${w.id}) — ${desc.slice(0, 100)}`;
	}).join('\n');

	return `${skill.systemPrompt}

## 你的團隊成員

你可以指派任務給以下團隊成員。使用 [TASK:skillId]...[/TASK] 格式指派：

${memberList}

## 指派規則
- 一次只指派一個任務給一個成員（等結果回來再指派下一個）
- 任務描述要具體、完整，包含所有成員需要的上下文
- 收到 [RESULT] 後，審核結果，決定下一步
- 不需要所有成員都參與，根據任務需要選擇
- 當所有任務完成，直接回覆用戶總結成果（不要用 [TASK] 標記）
- 如果需要討論，可以把上一個成員的結果作為下一個成員的上下文
${langRule}`;
}

function getTeamMemberInfos(skills: SkillDefinition[]): TeamMemberInfo[] {
	return skills.map((skill) => {
		const session = teamSessions.get(skill.id);
		return {
			skillId: skill.id,
			name: skill.name,
			agentId: session?.agentId ?? -1,
			palette: skill.palette,
			hueShift: skill.hueShift,
			role: skill.role,
		};
	}).filter((m) => m.agentId >= 0);
}

/** Get team member infos for sending to new clients */
export function getExistingTeamMembers(): TeamMemberInfo[] {
	return getTeamMemberInfos(cachedSkills);
}

function buildPromptWithHistory(history: ChatMessage[], newMessage: string): string {
	if (history.length === 0) return newMessage;
	const lines = history.map((m) =>
		m.role === 'user' ? `Human: ${m.content}` : `Assistant: ${m.content}`,
	);
	return `${lines.join('\n')}\nHuman: ${newMessage}\n\nContinue the conversation above. Respond to the latest Human message only.`;
}

// ── Task Block Parsing ──────────────────────────────────────

interface ParsedTask {
	skillId: string;
	description: string;
}

/**
 * Parse [TASK:skillId]...[/TASK] blocks from orchestrator output.
 * Returns the clean text (with TASK blocks removed) and extracted tasks.
 */
export function parseTaskBlocks(text: string): { cleanText: string; tasks: ParsedTask[] } {
	const tasks: ParsedTask[] = [];
	const cleanText = text.replace(
		/\[TASK:(\w[\w-]*)\]\s*([\s\S]*?)\s*\[\/TASK\]/g,
		(_match, skillId: string, description: string) => {
			tasks.push({ skillId: skillId.trim(), description: description.trim() });
			return ''; // remove from clean text
		},
	).trim();

	return { cleanText, tasks };
}

// ── Project Directory & Response Persistence ────────────────

let responseCounter = 0;

/**
 * Create a project directory from the user's message.
 * Sanitizes the message into a valid folder name.
 */
function createProjectDir(message: string): string {
	const workspaceDir = path.join(getAssetsRoot(), 'workspace');
	// Extract meaningful keywords from the message for the folder name
	const sanitized = message
		.replace(/[<>:"/\\|?*]/g, '')
		.replace(/\s+/g, '-')
		.slice(0, 40)
		.replace(/-+$/, '');
	const folderName = sanitized || `project-${Date.now()}`;
	const projectDir = path.join(workspaceDir, folderName);
	fs.mkdirSync(path.join(projectDir, 'docs'), { recursive: true });
	return projectDir;
}

/** Get the current working directory for agents */
function getAgentCwd(): string {
	if (currentProjectDir) return currentProjectDir;
	const fallback = path.join(getAssetsRoot(), 'workspace');
	fs.mkdirSync(fallback, { recursive: true });
	return fallback;
}

/**
 * Save agent response as a markdown file in {projectDir}/docs/.
 * Skips orchestrator dispatch messages that only contain [TASK] blocks.
 */
function saveAgentResponse(session: TeamSession, response: string): void {
	try {
		// Skip orchestrator responses that are purely task dispatches
		const { cleanText } = parseTaskBlocks(response);
		if (!cleanText.trim()) return;

		const docsDir = path.join(getAgentCwd(), 'docs');
		fs.mkdirSync(docsDir, { recursive: true });

		const now = new Date();
		const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
		const idx = String(++responseCounter).padStart(3, '0');
		const fileName = `${idx}-${session.skillId}-${session.name}-${ts}.md`;

		const header = `<!-- Agent: ${session.name} (${session.skillId}) -->\n<!-- Time: ${now.toISOString()} -->\n\n`;
		fs.writeFileSync(path.join(docsDir, fileName), header + response, 'utf-8');
		console.log(`[Team] Saved: docs/${fileName}`);
	} catch (err) {
		console.error(`[Team] Failed to save response for ${session.name}:`, err);
	}
}

// ── Core: Send message to a team member (direct) ───────────

function spawnClaudeForSkill(
	session: TeamSession,
	fullPrompt: string,
	broadcast: Broadcast,
): Promise<string> {
	return new Promise((resolve, reject) => {
		const cleanEnv = { ...process.env };
		delete cleanEnv.CLAUDECODE;

		const proc = spawn('claude', [
			'-p',
			'--no-session-persistence',
			'--output-format', 'stream-json',
			'--verbose',
			'--dangerously-skip-permissions',
		], {
			cwd: getAgentCwd(),
			shell: true,
			stdio: ['pipe', 'pipe', 'pipe'],
			env: cleanEnv,
		});

		// Embed system prompt in stdin to avoid Windows cmd.exe ~8191 char limit
		// for --append-system-prompt argument.
		const stdinPayload = `<role>\n${session.systemPrompt}\n</role>\n\n${fullPrompt}`;
		proc.stdin.write(stdinPayload);
		proc.stdin.end();

		session.activeProcess = proc;

		broadcast({ type: 'agentStatus', id: session.agentId, status: 'active' });
		broadcast({ type: 'teamAlertBubble', skillId: session.skillId, agentId: session.agentId });

		let stdoutBuffer = '';
		let sentFromDeltas = false;
		let assistantResponse = '';

		proc.stdout.on('data', (data: Buffer) => {
			stdoutBuffer += data.toString();
			const lines = stdoutBuffer.split('\n');
			stdoutBuffer = lines.pop() || '';

			for (const line of lines) {
				if (!line.trim()) continue;
				try {
					const parsed = JSON.parse(line);

					if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
						const text = parsed.delta.text;
						broadcast({ type: 'teamStreamChunk', skillId: session.skillId, text });
						assistantResponse += text;
						sentFromDeltas = true;
					} else if (parsed.type === 'assistant' && parsed.message?.content) {
						const blocks = parsed.message.content as Array<{
							type: string; id?: string; name?: string; input?: Record<string, unknown>; text?: string;
						}>;
						// Detect tool_use blocks and broadcast activity
						for (const block of blocks) {
							if (block.type === 'tool_use' && block.name) {
								const status = formatToolStatus(block.name, block.input || {});
								broadcast({ type: 'teamToolActivity', skillId: session.skillId, status });
							}
						}
						if (!sentFromDeltas) {
							for (const block of blocks) {
								if (block.type === 'text' && block.text) {
									broadcast({ type: 'teamStreamChunk', skillId: session.skillId, text: block.text });
									assistantResponse += block.text;
								}
							}
						} else {
							for (const block of blocks) {
								if (block.type === 'text' && block.text) {
									assistantResponse = block.text;
								}
							}
						}
					} else if (parsed.type === 'user' && Array.isArray(parsed.message?.content)) {
						// Tool results = tool finished, clear activity
						const blocks = parsed.message.content as Array<{ type: string; tool_use_id?: string }>;
						if (blocks.some(b => b.type === 'tool_result')) {
							broadcast({ type: 'teamToolActivity', skillId: session.skillId, status: null });
						}
					}
				} catch {
					broadcast({ type: 'teamStreamChunk', skillId: session.skillId, text: line });
					assistantResponse += line;
				}
			}
		});

		proc.stderr.on('data', (data: Buffer) => {
			const text = data.toString();
			if (text.trim()) {
				console.log(`[Team ${session.name}] stderr: ${text.trim()}`);
			}
		});

		proc.on('error', (err) => {
			console.error(`[Team ${session.name}] Process error:`, err.message);
			session.activeProcess = null;
			broadcast({ type: 'teamError', skillId: session.skillId, error: err.message });
			reject(err);
		});

		proc.on('exit', (_code) => {
			// Flush remaining buffer
			if (stdoutBuffer.trim()) {
				try {
					const parsed = JSON.parse(stdoutBuffer);
					if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
						broadcast({ type: 'teamStreamChunk', skillId: session.skillId, text: parsed.delta.text });
						assistantResponse += parsed.delta.text;
					} else if (parsed.type === 'assistant' && parsed.message?.content && !sentFromDeltas) {
						for (const block of parsed.message.content) {
							if (block.type === 'text' && block.text) {
								broadcast({ type: 'teamStreamChunk', skillId: session.skillId, text: block.text });
								assistantResponse += block.text;
							}
						}
					}
				} catch {
					if (stdoutBuffer.trim()) {
						broadcast({ type: 'teamStreamChunk', skillId: session.skillId, text: stdoutBuffer });
						assistantResponse += stdoutBuffer;
					}
				}
			}

			if (assistantResponse.trim()) {
				session.history.push({ role: 'assistant', content: assistantResponse.trim() });
				// Save agent response as document in workspace/docs/{skillId}/
				saveAgentResponse(session, assistantResponse.trim());
			}

			session.activeProcess = null;

			broadcast({ type: 'agentStatus', id: session.agentId, status: 'waiting' });
			broadcast({ type: 'teamStreamEnd', skillId: session.skillId, agentId: session.agentId });
			setTimeout(() => {
				broadcast({ type: 'agentStatus', id: session.agentId, status: 'idle' });
			}, 3000);

			resolve(assistantResponse.trim());
		});
	});
}

/**
 * Send a direct message to a team member (non-orchestrated).
 * Used when user manually talks to a sub-agent, or when there's no orchestrator.
 */
export function sendTeamMessage(skillId: string, message: string, broadcast: Broadcast): void {
	const session = teamSessions.get(skillId);
	if (!session) {
		broadcast({ type: 'teamError', skillId, error: 'Team member not found' });
		return;
	}

	if (session.activeProcess) {
		broadcast({ type: 'teamError', skillId, error: 'Previous message still processing' });
		return;
	}

	const fullPrompt = buildPromptWithHistory(session.history, message);
	session.history.push({ role: 'user', content: message });

	spawnClaudeForSkill(session, fullPrompt, broadcast).catch((err) => {
		console.error(`[Team] Error sending to ${skillId}:`, err.message);
	});
}

// ── Orchestrator: Main entry point ─────────────────────────

/**
 * Send a message through the orchestrator. The orchestrator will analyze
 * and potentially dispatch tasks to sub-agents.
 */
export function sendOrchestratorMessage(message: string, broadcast: Broadcast): void {
	if (!orchestratorSkillId) {
		broadcast({ type: 'teamError', skillId: '', error: 'No orchestrator configured' });
		return;
	}

	if (orchestratorBusy) {
		broadcast({ type: 'teamError', skillId: orchestratorSkillId, error: 'Orchestrator is still processing' });
		return;
	}

	// Create a project directory from the user's message
	if (!currentProjectDir) {
		currentProjectDir = createProjectDir(message);
		console.log(`[Orchestrator] Project directory: ${currentProjectDir}`);
	}

	orchestratorBusy = true;
	broadcast({ type: 'orchestratorBusy', busy: true });

	orchestrateStep(orchestratorSkillId, message, broadcast, 0).finally(() => {
		orchestratorBusy = false;
		broadcast({ type: 'orchestratorBusy', busy: false });
	});
}

/**
 * Recursive orchestration step:
 * 1. Send message to orchestrator
 * 2. Parse response for [TASK] blocks
 * 3. If tasks found: dispatch to sub-agents, collect results, feed back to orchestrator
 * 4. If no tasks: orchestration complete
 */
async function orchestrateStep(
	orchSkillId: string,
	message: string,
	broadcast: Broadcast,
	depth: number,
): Promise<void> {
	if (depth >= MAX_ORCHESTRATION_DEPTH) {
		console.log(`[Orchestrator] Max depth ${MAX_ORCHESTRATION_DEPTH} reached, stopping`);
		const session = teamSessions.get(orchSkillId);
		if (session) {
			broadcast({ type: 'teamStreamChunk', skillId: orchSkillId, text: '\n\n（已達最大調度深度，自動結束）' });
			broadcast({ type: 'teamStreamEnd', skillId: orchSkillId, agentId: session.agentId });
		}
		return;
	}

	const session = teamSessions.get(orchSkillId);
	if (!session) return;

	// Wait for any active process to finish
	if (session.activeProcess) {
		console.log(`[Orchestrator] Waiting for active process to finish...`);
		return;
	}

	const fullPrompt = buildPromptWithHistory(session.history, message);
	session.history.push({ role: 'user', content: message });

	console.log(`[Orchestrator] Step ${depth}: sending message to ${session.name}`);

	let response: string;
	try {
		response = await spawnClaudeForSkill(session, fullPrompt, broadcast);
	} catch (err) {
		console.error(`[Orchestrator] Error:`, err);
		return;
	}

	if (!response) return;

	// Parse for task blocks
	const { tasks } = parseTaskBlocks(response);

	if (tasks.length === 0) {
		// No tasks dispatched — orchestration complete for this round
		console.log(`[Orchestrator] No tasks in response — round complete`);
		return;
	}

	// Process tasks sequentially
	const results: string[] = [];
	for (const task of tasks) {
		const targetSession = teamSessions.get(task.skillId);
		if (!targetSession) {
			console.log(`[Orchestrator] Unknown skill: ${task.skillId}, skipping`);
			results.push(`[RESULT:${task.skillId}] 錯誤：找不到成員 ${task.skillId} [/RESULT]`);
			continue;
		}

		const taskId = `task-${++taskIdCounter}`;

		// Notify client about task dispatch
		broadcast({
			type: 'taskDispatched',
			taskId,
			targetSkillId: task.skillId,
			targetAgentId: targetSession.agentId,
			description: task.description,
		});

		console.log(`[Orchestrator] Dispatching task ${taskId} to ${targetSession.name}: ${task.description.slice(0, 80)}...`);

		// Send to sub-agent and wait for result
		const subPrompt = buildPromptWithHistory(targetSession.history, task.description);
		targetSession.history.push({ role: 'user', content: task.description });

		try {
			const result = await spawnClaudeForSkill(targetSession, subPrompt, broadcast);
			results.push(`[RESULT:${task.skillId}]\n${targetSession.name} 的回覆：\n${result}\n[/RESULT]`);
			broadcast({ type: 'taskCompleted', taskId, targetSkillId: task.skillId });
			console.log(`[Orchestrator] Task ${taskId} completed by ${targetSession.name}`);
		} catch (err) {
			const errMsg = err instanceof Error ? err.message : String(err);
			results.push(`[RESULT:${task.skillId}] 錯誤：${errMsg} [/RESULT]`);
			console.error(`[Orchestrator] Task ${taskId} failed:`, errMsg);
		}
	}

	// Feed results back to orchestrator for review
	const feedbackMessage = results.join('\n\n');
	console.log(`[Orchestrator] Feeding ${results.length} result(s) back to orchestrator`);

	await orchestrateStep(orchSkillId, feedbackMessage, broadcast, depth + 1);
}

/** Reset current project so next orchestrator message creates a new one */
export function resetProject(): void {
	currentProjectDir = null;
	responseCounter = 0;
}

export function getTeamAgentIds(): number[] {
	return Array.from(teamSessions.values()).map((s) => s.agentId);
}

export function closeTeam(broadcast: Broadcast): void {
	for (const session of teamSessions.values()) {
		if (session.activeProcess) {
			try { session.activeProcess.kill('SIGTERM'); } catch { /* */ }
		}
		broadcast({ type: 'agentClosed', id: session.agentId });
	}
	teamSessions.clear();
	orchestratorSkillId = null;
	orchestratorBusy = false;
	currentProjectDir = null;
}
