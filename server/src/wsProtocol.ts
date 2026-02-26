// ── Server → Client Messages ──────────────────────────────────

export type ServerMessage =
	| { type: 'agentCreated'; id: number; name?: string; role?: 'orchestrator' | 'worker' }
	| { type: 'agentClosed'; id: number }
	| { type: 'agentSelected'; id: number }
	| { type: 'existingAgents'; agents: number[]; agentMeta: Record<string, AgentMeta> }
	| { type: 'agentStatus'; id: number; status: 'active' | 'waiting' | 'idle' }
	| { type: 'agentToolStart'; id: number; toolId: string; status: string }
	| { type: 'agentToolDone'; id: number; toolId: string }
	| { type: 'agentToolsClear'; id: number }
	| { type: 'agentToolPermission'; id: number }
	| { type: 'agentToolPermissionClear'; id: number }
	| { type: 'subagentToolStart'; id: number; parentToolId: string; toolId: string; status: string }
	| { type: 'subagentToolDone'; id: number; parentToolId: string; toolId: string }
	| { type: 'subagentClear'; id: number; parentToolId: string }
	| { type: 'subagentToolPermission'; id: number; parentToolId: string }
	| { type: 'furnitureAssetsLoaded'; catalog: unknown[]; sprites: Record<string, string[][]> }
	| { type: 'characterSpritesLoaded'; characters: unknown[] }
	| { type: 'floorTilesLoaded'; sprites: string[][][] }
	| { type: 'wallTilesLoaded'; sprites: string[][][] }
	| { type: 'layoutLoaded'; layout: Record<string, unknown> | null }
	| { type: 'settingsLoaded'; soundEnabled: boolean; mode?: 'chat' | 'team' }
	| { type: 'chatCreated'; chatId: string; agentId: number }
	| { type: 'chatClosed'; chatId: string }
	| { type: 'chatStreamChunk'; chatId: string; text: string }
	| { type: 'chatStreamEnd'; chatId: string; agentId: number }
	| { type: 'chatError'; chatId: string; error: string }
	| { type: 'chatAlertBubble'; chatId: string; agentId: number }
	| { type: 'chatThinkingChunk'; chatId: string; agentId: number; text: string }
	| { type: 'existingChats'; chatIds: string[] }
	// Team mode
	| { type: 'teamLoaded'; members: TeamMemberInfo[]; orchestratorSkillId?: string }
	| { type: 'teamStreamChunk'; skillId: string; text: string }
	| { type: 'teamStreamEnd'; skillId: string; agentId: number }
	| { type: 'teamError'; skillId: string; error: string }
	| { type: 'teamAlertBubble'; skillId: string; agentId: number }
	// Orchestrator
	| { type: 'taskDispatched'; taskId: string; targetSkillId: string; targetAgentId: number; description: string }
	| { type: 'taskCompleted'; taskId: string; targetSkillId: string }
	| { type: 'orchestratorBusy'; busy: boolean }
	| { type: 'teamToolActivity'; skillId: string; status: string | null }
	// Idle chat
	| { type: 'idleChatMessage'; agentId: number; text: string }
	| { type: 'idleChatEnd'; agentId: number };

// ── Client → Server Messages ──────────────────────────────────

export type ClientMessage =
	| { type: 'webviewReady' }
	| { type: 'openClaude'; cwd?: string }
	| { type: 'focusAgent'; id: number }
	| { type: 'closeAgent'; id: number }
	| { type: 'saveAgentSeats'; seats: Record<string, AgentMeta> }
	| { type: 'saveLayout'; layout: Record<string, unknown> }
	| { type: 'setSoundEnabled'; enabled: boolean }
	| { type: 'importLayout'; layout: Record<string, unknown> }
	| { type: 'createChat'; cwd?: string }
	| { type: 'sendChatMessage'; chatId: string; message: string }
	| { type: 'closeChat'; chatId: string }
	// Team mode
	| { type: 'sendTeamMessage'; skillId: string; message: string }
	| { type: 'setMode'; mode: 'chat' | 'team' }
	// Orchestrator
	| { type: 'sendOrchestratorMessage'; message: string };

export interface AgentMeta {
	palette?: number;
	hueShift?: number;
	seatId?: string;
}

export interface TeamMemberInfo {
	skillId: string;
	name: string;
	agentId: number;
	palette?: number;
	hueShift?: number;
	role?: 'orchestrator' | 'worker';
}
