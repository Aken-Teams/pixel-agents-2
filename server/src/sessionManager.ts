import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn, type ChildProcess } from 'child_process';
import type { AgentState } from './types.js';
import { cancelWaitingTimer, cancelPermissionTimer } from './timerManager.js';
import type { Broadcast } from './timerManager.js';
import { startFileWatching, readNewLines } from './fileWatcher.js';
import { JSONL_POLL_INTERVAL_MS, CLAUDE_PROJECTS_DIR } from './config.js';

export function getProjectDirPath(cwd: string): string {
	const dirName = cwd.replace(/[:\\/]/g, '-');
	return path.join(os.homedir(), '.claude', 'projects', dirName);
}

export function getAllProjectDirs(): string[] {
	const dirs: string[] = [];
	try {
		if (!fs.existsSync(CLAUDE_PROJECTS_DIR)) return dirs;
		const entries = fs.readdirSync(CLAUDE_PROJECTS_DIR, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.isDirectory()) {
				dirs.push(path.join(CLAUDE_PROJECTS_DIR, entry.name));
			}
		}
	} catch { /* ignore */ }
	return dirs;
}

export function launchNewSession(
	cwd: string,
	nextAgentIdRef: { current: number },
	agents: Map<number, AgentState>,
	knownJsonlFiles: Set<string>,
	fileWatchers: Map<number, fs.FSWatcher>,
	pollingTimers: Map<number, ReturnType<typeof setInterval>>,
	waitingTimers: Map<number, ReturnType<typeof setTimeout>>,
	permissionTimers: Map<number, ReturnType<typeof setTimeout>>,
	jsonlPollTimers: Map<number, ReturnType<typeof setInterval>>,
	broadcast: Broadcast,
): number {
	const sessionId = crypto.randomUUID();
	const projectDir = getProjectDirPath(cwd);

	// Pre-register expected JSONL file
	const expectedFile = path.join(projectDir, `${sessionId}.jsonl`);
	knownJsonlFiles.add(expectedFile);

	// Spawn Claude CLI process
	const proc = spawn('claude', ['--session-id', sessionId], {
		cwd,
		shell: true,
		stdio: ['pipe', 'pipe', 'pipe'],
	});

	const id = nextAgentIdRef.current++;
	const agent: AgentState = {
		id,
		processHandle: proc,
		projectDir,
		jsonlFile: expectedFile,
		fileOffset: 0,
		lineBuffer: '',
		activeToolIds: new Set(),
		activeToolStatuses: new Map(),
		activeToolNames: new Map(),
		activeSubagentToolIds: new Map(),
		activeSubagentToolNames: new Map(),
		isWaiting: false,
		permissionSent: false,
		hadToolsInTurn: false,
		sessionId,
	};

	agents.set(id, agent);
	console.log(`[Pixel Agents] Agent ${id}: launched session ${sessionId}`);
	broadcast({ type: 'agentCreated', id });

	// Handle process exit
	proc.on('exit', (code) => {
		console.log(`[Pixel Agents] Agent ${id}: process exited with code ${code}`);
		removeAgent(id, agents, fileWatchers, pollingTimers, waitingTimers, permissionTimers, jsonlPollTimers);
		broadcast({ type: 'agentClosed', id });
	});

	// Poll for the specific JSONL file to appear
	const pollTimer = setInterval(() => {
		try {
			if (fs.existsSync(agent.jsonlFile)) {
				console.log(`[Pixel Agents] Agent ${id}: found JSONL file ${path.basename(agent.jsonlFile)}`);
				clearInterval(pollTimer);
				jsonlPollTimers.delete(id);
				startFileWatching(id, agent.jsonlFile, agents, fileWatchers, pollingTimers, waitingTimers, permissionTimers, broadcast);
				readNewLines(id, agents, waitingTimers, permissionTimers, broadcast);
			}
		} catch { /* file may not exist yet */ }
	}, JSONL_POLL_INTERVAL_MS);
	jsonlPollTimers.set(id, pollTimer);

	return id;
}

export function removeAgent(
	agentId: number,
	agents: Map<number, AgentState>,
	fileWatchers: Map<number, fs.FSWatcher>,
	pollingTimers: Map<number, ReturnType<typeof setInterval>>,
	waitingTimers: Map<number, ReturnType<typeof setTimeout>>,
	permissionTimers: Map<number, ReturnType<typeof setTimeout>>,
	jsonlPollTimers: Map<number, ReturnType<typeof setInterval>>,
): void {
	const agent = agents.get(agentId);
	if (!agent) return;

	const jpTimer = jsonlPollTimers.get(agentId);
	if (jpTimer) { clearInterval(jpTimer); }
	jsonlPollTimers.delete(agentId);

	fileWatchers.get(agentId)?.close();
	fileWatchers.delete(agentId);
	const pt = pollingTimers.get(agentId);
	if (pt) { clearInterval(pt); }
	pollingTimers.delete(agentId);

	cancelWaitingTimer(agentId, waitingTimers);
	cancelPermissionTimer(agentId, permissionTimers);

	agents.delete(agentId);
}

export function closeAgent(
	agentId: number,
	agents: Map<number, AgentState>,
	fileWatchers: Map<number, fs.FSWatcher>,
	pollingTimers: Map<number, ReturnType<typeof setInterval>>,
	waitingTimers: Map<number, ReturnType<typeof setTimeout>>,
	permissionTimers: Map<number, ReturnType<typeof setTimeout>>,
	jsonlPollTimers: Map<number, ReturnType<typeof setInterval>>,
	broadcast: Broadcast,
): void {
	const agent = agents.get(agentId);
	if (!agent) return;

	// Kill the process if it was launched by us
	if (agent.processHandle) {
		try {
			agent.processHandle.kill('SIGTERM');
		} catch { /* process may already be dead */ }
	}

	removeAgent(agentId, agents, fileWatchers, pollingTimers, waitingTimers, permissionTimers, jsonlPollTimers);
	broadcast({ type: 'agentClosed', id: agentId });
}

export function sendExistingAgents(
	agents: Map<number, AgentState>,
	agentMeta: Record<string, unknown>,
	broadcast: Broadcast,
): void {
	const agentIds: number[] = [];
	for (const id of agents.keys()) {
		agentIds.push(id);
	}
	agentIds.sort((a, b) => a - b);

	console.log(`[Pixel Agents] sendExistingAgents: agents=${JSON.stringify(agentIds)}`);

	broadcast({
		type: 'existingAgents',
		agents: agentIds,
		agentMeta,
	});

	sendCurrentAgentStatuses(agents, broadcast);
}

export function sendCurrentAgentStatuses(
	agents: Map<number, AgentState>,
	broadcast: Broadcast,
): void {
	for (const [agentId, agent] of agents) {
		for (const [toolId, status] of agent.activeToolStatuses) {
			broadcast({
				type: 'agentToolStart',
				id: agentId,
				toolId,
				status,
			});
		}
		if (agent.isWaiting) {
			broadcast({
				type: 'agentStatus',
				id: agentId,
				status: 'waiting',
			});
		}
	}
}
