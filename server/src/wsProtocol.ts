// ── Server → Client Messages ──────────────────────────────────

export type ServerMessage =
	| { type: 'agentCreated'; id: number }
	| { type: 'agentClosed'; id: number }
	| { type: 'agentSelected'; id: number }
	| { type: 'existingAgents'; agents: number[]; agentMeta: Record<string, AgentMeta> }
	| { type: 'agentStatus'; id: number; status: 'active' | 'waiting' }
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
	| { type: 'settingsLoaded'; soundEnabled: boolean };

// ── Client → Server Messages ──────────────────────────────────

export type ClientMessage =
	| { type: 'webviewReady' }
	| { type: 'openClaude'; cwd?: string }
	| { type: 'focusAgent'; id: number }
	| { type: 'closeAgent'; id: number }
	| { type: 'saveAgentSeats'; seats: Record<string, AgentMeta> }
	| { type: 'saveLayout'; layout: Record<string, unknown> }
	| { type: 'setSoundEnabled'; enabled: boolean }
	| { type: 'importLayout'; layout: Record<string, unknown> };

export interface AgentMeta {
	palette?: number;
	hueShift?: number;
	seatId?: string;
}
