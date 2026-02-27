import * as fs from 'fs';
import * as path from 'path';
import { getWorkspaceRoot } from './config.js';
import type { ChatMessage } from './types.js';

// ── Types ────────────────────────────────────────────────────

export interface TaskRecord {
	skillId: string;
	status: 'dispatched' | 'completed' | 'failed';
	description: string;
	phase?: number;
}

export interface ProjectState {
	name: string;
	createdAt: string;
	updatedAt: string;
	status: 'running' | 'paused' | 'completed';
	currentPhase: number;
	userMessage: string;
	responseCounter: number;
	history: Record<string, ChatMessage[]>;
	tasks: Record<string, TaskRecord>;
}

export interface ProjectSummary {
	name: string;
	dir: string;
	status: 'running' | 'paused' | 'completed';
	updatedAt: string;
	currentPhase: number;
}

const PROJECT_FILE = 'project.json';

// Debounce: at most one write per 2 seconds per project
const pendingWrites = new Map<string, ReturnType<typeof setTimeout>>();
const DEBOUNCE_MS = 2_000;

// ── Public API ───────────────────────────────────────────────

/**
 * Initialize a new project.json when a project directory is created.
 */
export function initProjectState(projectDir: string, userMessage: string): void {
	const name = path.basename(projectDir);
	const now = new Date().toISOString();
	const state: ProjectState = {
		name,
		createdAt: now,
		updatedAt: now,
		status: 'running',
		currentPhase: 0,
		userMessage,
		responseCounter: 0,
		history: {},
		tasks: {},
	};
	writeProjectFile(projectDir, state);
}

/**
 * Save project state with debouncing to avoid excessive disk writes.
 */
export function saveProjectState(projectDir: string, state: Partial<ProjectState>): void {
	const existing = loadProjectState(projectDir);
	if (!existing) return;

	const merged: ProjectState = {
		...existing,
		...state,
		updatedAt: new Date().toISOString(),
	};

	// Debounce writes
	const pending = pendingWrites.get(projectDir);
	if (pending) clearTimeout(pending);

	pendingWrites.set(projectDir, setTimeout(() => {
		pendingWrites.delete(projectDir);
		writeProjectFile(projectDir, merged);
	}, DEBOUNCE_MS));
}

/**
 * Immediately flush project state (no debounce). Use for critical updates
 * like status changes.
 */
export function saveProjectStateImmediate(projectDir: string, state: Partial<ProjectState>): void {
	const existing = loadProjectState(projectDir);
	if (!existing) return;

	const merged: ProjectState = {
		...existing,
		...state,
		updatedAt: new Date().toISOString(),
	};

	// Cancel any pending debounced write
	const pending = pendingWrites.get(projectDir);
	if (pending) {
		clearTimeout(pending);
		pendingWrites.delete(projectDir);
	}

	writeProjectFile(projectDir, merged);
}

/**
 * Load project state from disk.
 */
export function loadProjectState(projectDir: string): ProjectState | null {
	const filePath = path.join(projectDir, PROJECT_FILE);
	try {
		const raw = fs.readFileSync(filePath, 'utf-8');
		return JSON.parse(raw) as ProjectState;
	} catch {
		return null;
	}
}

/**
 * List all projects under workspace/.
 */
export function listProjects(): ProjectSummary[] {
	const workspaceDir = getWorkspaceRoot();
	if (!fs.existsSync(workspaceDir)) return [];

	const results: ProjectSummary[] = [];
	try {
		const entries = fs.readdirSync(workspaceDir, { withFileTypes: true });
		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			const projectDir = path.join(workspaceDir, entry.name);
			const state = loadProjectState(projectDir);
			if (state) {
				results.push({
					name: state.name,
					dir: projectDir,
					status: state.status,
					updatedAt: state.updatedAt,
					currentPhase: state.currentPhase,
				});
			}
		}
	} catch {
		// workspace dir not readable
	}

	// Sort by updatedAt descending (most recent first)
	results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
	return results;
}

// ── Internal ─────────────────────────────────────────────────

function writeProjectFile(projectDir: string, state: ProjectState): void {
	const filePath = path.join(projectDir, PROJECT_FILE);
	try {
		fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf-8');
	} catch (err) {
		console.error(`[ProjectPersistence] Failed to write ${filePath}:`, err);
	}
}
