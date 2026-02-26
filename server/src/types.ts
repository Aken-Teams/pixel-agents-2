import type { ChildProcess } from 'child_process';

export interface AgentState {
	id: number;
	processHandle: ChildProcess | null; // null for monitored (not launched) sessions
	projectDir: string;
	jsonlFile: string;
	fileOffset: number;
	lineBuffer: string;
	activeToolIds: Set<string>;
	activeToolStatuses: Map<string, string>;
	activeToolNames: Map<string, string>;
	activeSubagentToolIds: Map<string, Set<string>>;
	activeSubagentToolNames: Map<string, Map<string, string>>;
	isWaiting: boolean;
	permissionSent: boolean;
	hadToolsInTurn: boolean;
	sessionId: string;
}

export interface PersistedAgent {
	id: number;
	jsonlFile: string;
	projectDir: string;
	sessionId: string;
}

export interface ChatMessage {
	role: 'user' | 'assistant';
	content: string;
}

export interface ChatSession {
	chatId: string;
	cwd: string;
	activeProcess: ChildProcess | null; // null when idle (between messages)
	history: ChatMessage[]; // conversation history for context
}

export interface TeamSession {
	skillId: string;
	name: string;
	agentId: number;
	activeProcess: ChildProcess | null;
	history: ChatMessage[];
	systemPrompt: string;
}
