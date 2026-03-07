import type { ProjectSummary, TaskRecord } from './projectPersistence.js';
import type { ScheduledTask } from './schedulerManager.js';

// ── Shared interfaces ────────────────────────────────────────

export interface DocMeta {
	fileName: string;
	agentName: string;
	skillId: string;
	time: string;
	summary: string;
	sizeBytes: number;
}

// ── Server → Client Messages ──────────────────────────────────

export type ServerMessage =
	| { type: 'agentCreated'; id: number; name?: string; role?: 'orchestrator' | 'worker'; preferredSeatId?: string }
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
	| { type: 'settingsLoaded'; soundEnabled: boolean; mode?: 'chat' | 'team'; aiProvider?: string; deepseekModel?: string }
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
	// Pipeline
	| { type: 'pipelineStarted'; pipelineId: string; taskCount: number }
	| { type: 'pipelineTaskCompleted'; pipelineId: string; taskIndex: number; taskId: string; targetSkillId: string }
	| { type: 'pipelineCompleted'; pipelineId: string }
	| { type: 'pipelineCollaboration'; skillId: string; agentId: number; summary: string }
	// Interview (pre-development questionnaire)
	| { type: 'interviewRequest'; questions: { id: string; question: string }[] }
	// Idle chat
	| { type: 'idleChatMessage'; agentId: number; text: string }
	| { type: 'idleChatEnd'; agentId: number }
	// Project persistence
	| { type: 'projectList'; projects: ProjectSummary[] }
	| { type: 'projectLoaded'; projectDir: string; name: string; status: string }
	| { type: 'projectHistoryRestored'; history: Record<string, { role: string; content: string }[]> }
	// Portfolio
	| { type: 'projectDetail'; projectDir: string; name: string; status: string; currentPhase: number; userMessage: string; tasks: Record<string, TaskRecord>; docs: DocMeta[] }
	| { type: 'docContent'; projectDir: string; fileName: string; content: string }
	// Scheduler
	| { type: 'scheduledTaskList'; tasks: ScheduledTask[] }
	| { type: 'scheduledTaskCreated'; task: ScheduledTask }
	| { type: 'scheduledTaskUpdated'; task: ScheduledTask }
	| { type: 'scheduledTaskDeleted'; taskId: string }
	| { type: 'scheduledTaskFired'; task: ScheduledTask; message: string }
	| { type: 'projectCleared' };

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
	| { type: 'sendOrchestratorMessage'; message: string }
	// Interview response
	| { type: 'submitInterviewResponse'; response: string }
	// Project persistence
	| { type: 'listProjects' }
	| { type: 'resumeProject'; projectDir: string }
	| { type: 'resetProject' }
	// Portfolio
	| { type: 'getProjectDetail'; projectDir: string }
	| { type: 'getDocContent'; projectDir: string; fileName: string }
	// AI Provider
	| { type: 'setAIProvider'; provider: string; apiKey?: string; model?: string }
	// Scheduler
	| { type: 'listScheduledTasks' }
	| { type: 'createScheduledTask'; task: Omit<ScheduledTask, 'id' | 'createdAt' | 'nextRun'> }
	| { type: 'updateScheduledTask'; taskId: string; updates: Partial<ScheduledTask> }
	| { type: 'deleteScheduledTask'; taskId: string };

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
	description?: string;
	bio?: string;
	preferredSeatId?: string;
}
