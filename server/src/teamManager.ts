import { spawn } from 'child_process';
import type { TeamSession, ChatMessage } from './types.js';
import type { TeamMemberInfo } from './wsProtocol.js';
import type { Broadcast } from './timerManager.js';
import type { SkillDefinition } from './skillLoader.js';
import { getAssetsRoot } from './config.js';

const teamSessions = new Map<string, TeamSession>();

let nextAgentIdRef: { current: number } = { current: 1000 };

export function initTeamManager(ref: { current: number }): void {
	nextAgentIdRef = ref;
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

	// Add or update members
	for (const skill of skills) {
		const existing = teamSessions.get(skill.id);
		if (existing) {
			// Update system prompt if changed, keep history
			existing.name = skill.name;
			existing.systemPrompt = skill.systemPrompt;
			continue;
		}

		const agentId = nextAgentIdRef.current++;
		const session: TeamSession = {
			skillId: skill.id,
			name: skill.name,
			agentId,
			activeProcess: null,
			history: [],
			systemPrompt: skill.systemPrompt,
		};
		teamSessions.set(skill.id, session);

		console.log(`[Team] Added member ${skill.name} (skill ${skill.id}, agent ${agentId})`);
		broadcast({ type: 'agentCreated', id: agentId, name: skill.name });
	}

	// Broadcast full team info
	broadcast({ type: 'teamLoaded', members: getTeamMemberInfos(skills) });
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
		};
	}).filter((m) => m.agentId >= 0);
}

/** Get team member infos for sending to new clients */
export function getExistingTeamMembers(): TeamMemberInfo[] {
	const members: TeamMemberInfo[] = [];
	for (const session of teamSessions.values()) {
		members.push({
			skillId: session.skillId,
			name: session.name,
			agentId: session.agentId,
		});
	}
	return members;
}

function buildPromptWithHistory(history: ChatMessage[], newMessage: string): string {
	if (history.length === 0) return newMessage;
	const lines = history.map((m) =>
		m.role === 'user' ? `Human: ${m.content}` : `Assistant: ${m.content}`,
	);
	return `${lines.join('\n')}\nHuman: ${newMessage}\n\nContinue the conversation above. Respond to the latest Human message only.`;
}

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

	const cleanEnv = { ...process.env };
	delete cleanEnv.CLAUDECODE;

	const proc = spawn('claude', [
		'-p',
		'--no-session-persistence',
		'--output-format', 'stream-json',
		'--verbose',
		'--append-system-prompt', session.systemPrompt,
	], {
		cwd: getAssetsRoot(),
		shell: true,
		stdio: ['pipe', 'pipe', 'pipe'],
		env: cleanEnv,
	});

	proc.stdin.write(fullPrompt);
	proc.stdin.end();

	session.activeProcess = proc;

	broadcast({ type: 'agentStatus', id: session.agentId, status: 'active' });
	broadcast({ type: 'teamAlertBubble', skillId, agentId: session.agentId });

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
					broadcast({ type: 'teamStreamChunk', skillId, text });
					assistantResponse += text;
					sentFromDeltas = true;
				} else if (parsed.type === 'assistant' && parsed.message?.content) {
					if (!sentFromDeltas) {
						for (const block of parsed.message.content) {
							if (block.type === 'text' && block.text) {
								broadcast({ type: 'teamStreamChunk', skillId, text: block.text });
								assistantResponse += block.text;
							}
						}
					} else {
						for (const block of parsed.message.content) {
							if (block.type === 'text' && block.text) {
								assistantResponse = block.text;
							}
						}
					}
				}
			} catch {
				broadcast({ type: 'teamStreamChunk', skillId, text: line });
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
		broadcast({ type: 'teamError', skillId, error: err.message });
	});

	proc.on('exit', (_code) => {
		// Flush remaining buffer
		if (stdoutBuffer.trim()) {
			try {
				const parsed = JSON.parse(stdoutBuffer);
				if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
					broadcast({ type: 'teamStreamChunk', skillId, text: parsed.delta.text });
					assistantResponse += parsed.delta.text;
				} else if (parsed.type === 'assistant' && parsed.message?.content && !sentFromDeltas) {
					for (const block of parsed.message.content) {
						if (block.type === 'text' && block.text) {
							broadcast({ type: 'teamStreamChunk', skillId, text: block.text });
							assistantResponse += block.text;
						}
					}
				}
			} catch {
				if (stdoutBuffer.trim()) {
					broadcast({ type: 'teamStreamChunk', skillId, text: stdoutBuffer });
					assistantResponse += stdoutBuffer;
				}
			}
		}

		if (assistantResponse.trim()) {
			session.history.push({ role: 'assistant', content: assistantResponse.trim() });
		}

		session.activeProcess = null;

		broadcast({ type: 'agentStatus', id: session.agentId, status: 'waiting' });
		broadcast({ type: 'teamStreamEnd', skillId, agentId: session.agentId });
		setTimeout(() => {
			broadcast({ type: 'agentStatus', id: session.agentId, status: 'idle' });
		}, 3000);
	});
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
}
