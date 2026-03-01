import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ── Server ──────────────────────────────────────────────────
export const HTTP_PORT = parseInt(process.env.PORT || '3000', 10);

// ── Authentication ──────────────────────────────────────────
// Set AUTH_PASSWORD env var to enable password protection.
// If not set, the app is open (for local-only use).
export const AUTH_PASSWORD: string | null = process.env.AUTH_PASSWORD || null;

// ── Character Limit ─────────────────────────────────────────
export const MAX_CHARACTERS = 21;

// ── Timing (ms) ──────────────────────────────────────────────
export const JSONL_POLL_INTERVAL_MS = 1000;
export const FILE_WATCHER_POLL_INTERVAL_MS = 2000;
export const PROJECT_SCAN_INTERVAL_MS = 1000;
export const TOOL_DONE_DELAY_MS = 300;
export const PERMISSION_TIMER_DELAY_MS = 7000;
export const TEXT_IDLE_DELAY_MS = 5000;

// ── Display Truncation ──────────────────────────────────────
export const BASH_COMMAND_DISPLAY_MAX_LENGTH = 30;
export const TASK_DESCRIPTION_DISPLAY_MAX_LENGTH = 40;

// ── PNG / Asset Parsing ─────────────────────────────────────
export const PNG_ALPHA_THRESHOLD = 128;
export const WALL_PIECE_WIDTH = 16;
export const WALL_PIECE_HEIGHT = 32;
export const WALL_GRID_COLS = 4;
export const WALL_BITMASK_COUNT = 16;
export const FLOOR_PATTERN_COUNT = 7;
export const FLOOR_TILE_SIZE = 16;
export const CHARACTER_DIRECTIONS = ['down', 'up', 'right'] as const;
export const CHAR_FRAME_W = 16;
export const CHAR_FRAME_H = 32;
export const CHAR_FRAMES_PER_ROW = 7;
export const CHAR_COUNT = 21;

// ── User-Level Layout Persistence ────────────────────────────
export const LAYOUT_FILE_DIR = '.pixel-agents';
export const LAYOUT_FILE_NAME = 'layout.json';
export const LAYOUT_FILE_POLL_INTERVAL_MS = 2000;
export const SETTINGS_FILE_NAME = 'settings.json';

// ── Paths ────────────────────────────────────────────────────
export const CLAUDE_DIR = path.join(os.homedir(), '.claude');
export const CLAUDE_PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');
export const PIXEL_AGENTS_DIR = path.join(os.homedir(), LAYOUT_FILE_DIR);

// ── Assets ──────────────────────────────────────────────────
export function getAssetsRoot(): string {
	// In dev (tsx): import.meta.dirname = server/src/ → go up 2 levels
	// In prod (dist/server.js): import.meta.dirname = dist/ → go up 1 level
	const candidate = path.resolve(import.meta.dirname, '..', '..');
	if (fs.existsSync(path.join(candidate, 'client'))) {
		return candidate;
	}
	return path.resolve(import.meta.dirname, '..');
}

export function getWorkspaceRoot(): string {
	return path.join(os.homedir(), LAYOUT_FILE_DIR, 'workspace');
}

export function getClientAssetsDir(): string {
	return path.join(getAssetsRoot(), 'client', 'public', 'assets');
}

export function getTilesetDir(): string {
	return path.join(getAssetsRoot(), 'assets', 'office-tileset');
}
