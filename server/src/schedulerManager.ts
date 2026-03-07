import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { Broadcast } from './timerManager.js';

// ── Types ────────────────────────────────────────────────────

export interface ScheduledTask {
	id: string;
	type: 'once' | 'recurring' | 'memory';
	description: string;
	createdBy: string;          // skillId | 'user'
	createdAt: string;          // ISO datetime
	// Trigger config
	triggerAt?: string;         // ISO datetime (for 'once')
	recurring?: {
		pattern: 'daily' | 'weekly' | 'monthly';
		time: string;           // "HH:mm" (24h format)
		dayOfWeek?: number;     // 0=Sun, 1=Mon, ..., 6=Sat (for weekly)
		dayOfMonth?: number;    // 1-31 (for monthly)
	};
	// Execution config
	action: 'orchestrator' | 'notify';
	message: string;
	enabled: boolean;
	lastRun?: string;
	nextRun?: string;           // Pre-computed ISO datetime
}

// ── Persistence ──────────────────────────────────────────────

const TASKS_FILE = path.join(os.homedir(), '.pixel-agents', 'scheduled-tasks.json');

function loadTasksFromDisk(): ScheduledTask[] {
	try {
		if (fs.existsSync(TASKS_FILE)) {
			return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'));
		}
	} catch (err) {
		console.error('[Scheduler] Failed to load tasks:', err);
	}
	return [];
}

function saveTasksToDisk(): void {
	try {
		fs.mkdirSync(path.dirname(TASKS_FILE), { recursive: true });
		fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
	} catch (err) {
		console.error('[Scheduler] Failed to save tasks:', err);
	}
}

// ── State ────────────────────────────────────────────────────

let tasks: ScheduledTask[] = [];
let checkTimer: ReturnType<typeof setInterval> | null = null;
let broadcastRef: Broadcast | null = null;
let orchestratorMessageFn: ((message: string, broadcast: Broadcast) => void) | null = null;

const CHECK_INTERVAL_MS = 30_000; // Check every 30 seconds

// ── Next Run Calculation ─────────────────────────────────────

function computeNextRun(task: ScheduledTask): string | undefined {
	if (task.type === 'memory') return undefined;

	if (task.type === 'once') {
		if (!task.triggerAt) return undefined;
		const trigger = new Date(task.triggerAt);
		return trigger > new Date() ? trigger.toISOString() : undefined;
	}

	if (task.type === 'recurring' && task.recurring) {
		const now = new Date();
		const { pattern, time, dayOfWeek, dayOfMonth } = task.recurring;
		const [hours, minutes] = time.split(':').map(Number);

		// Start from today, find next matching datetime
		const candidate = new Date(now);
		candidate.setHours(hours, minutes, 0, 0);

		if (pattern === 'daily') {
			if (candidate <= now) candidate.setDate(candidate.getDate() + 1);
			return candidate.toISOString();
		}

		if (pattern === 'weekly' && dayOfWeek !== undefined) {
			const currentDay = candidate.getDay();
			let daysAhead = dayOfWeek - currentDay;
			if (daysAhead < 0 || (daysAhead === 0 && candidate <= now)) {
				daysAhead += 7;
			}
			candidate.setDate(candidate.getDate() + daysAhead);
			return candidate.toISOString();
		}

		if (pattern === 'monthly' && dayOfMonth !== undefined) {
			candidate.setDate(dayOfMonth);
			if (candidate <= now) {
				candidate.setMonth(candidate.getMonth() + 1);
				candidate.setDate(dayOfMonth);
			}
			return candidate.toISOString();
		}
	}

	return undefined;
}

// ── Core Logic ───────────────────────────────────────────────

function checkScheduledTasks(): void {
	if (!broadcastRef) return;

	const now = new Date();

	for (const task of tasks) {
		if (!task.enabled || !task.nextRun) continue;

		const nextRun = new Date(task.nextRun);
		if (nextRun > now) continue;

		// Task is due — execute it
		console.log(`[Scheduler] Firing task: ${task.description} (${task.id})`);

		task.lastRun = now.toISOString();

		if (task.action === 'orchestrator' && orchestratorMessageFn) {
			// Send as orchestrator message (CTO processes it)
			const schedulerNote = `[排程任務觸發] ${task.description}\n\n${task.message}`;
			orchestratorMessageFn(schedulerNote, broadcastRef);
		}

		// Always broadcast notification to client
		broadcastRef({ type: 'scheduledTaskFired', task, message: task.message });

		if (task.type === 'once') {
			// One-time task: disable after firing
			task.enabled = false;
			task.nextRun = undefined;
		} else if (task.type === 'recurring') {
			// Recurring: compute next run
			task.nextRun = computeNextRun(task);
		}

		broadcastRef({ type: 'scheduledTaskUpdated', task });
	}

	saveTasksToDisk();
}

// ── Public API ───────────────────────────────────────────────

export function initScheduler(
	broadcast: Broadcast,
	sendOrchestratorMsg: (message: string, broadcast: Broadcast) => void,
): void {
	broadcastRef = broadcast;
	orchestratorMessageFn = sendOrchestratorMsg;
	tasks = loadTasksFromDisk();

	// Recompute nextRun for all active tasks (in case server was restarted)
	for (const task of tasks) {
		if (task.enabled && task.type !== 'memory') {
			task.nextRun = computeNextRun(task);
		}
	}
	saveTasksToDisk();

	// Start periodic check
	if (checkTimer) clearInterval(checkTimer);
	checkTimer = setInterval(checkScheduledTasks, CHECK_INTERVAL_MS);

	console.log(`[Scheduler] Initialized with ${tasks.length} task(s)`);
}

export function stopScheduler(): void {
	if (checkTimer) {
		clearInterval(checkTimer);
		checkTimer = null;
	}
}

export function addScheduledTask(input: Omit<ScheduledTask, 'id' | 'createdAt' | 'nextRun'>): ScheduledTask {
	const task: ScheduledTask = {
		...input,
		id: crypto.randomUUID(),
		createdAt: new Date().toISOString(),
	};
	task.nextRun = computeNextRun(task);
	tasks.push(task);
	saveTasksToDisk();

	if (broadcastRef) {
		broadcastRef({ type: 'scheduledTaskCreated', task });
	}

	console.log(`[Scheduler] Added task: ${task.description} (${task.id}), type=${task.type}, nextRun=${task.nextRun || 'N/A'}`);
	return task;
}

export function updateScheduledTask(id: string, updates: Partial<ScheduledTask>): ScheduledTask | null {
	const task = tasks.find(t => t.id === id);
	if (!task) return null;

	Object.assign(task, updates);

	// Recompute nextRun if trigger config changed
	if (updates.triggerAt || updates.recurring || updates.enabled !== undefined) {
		task.nextRun = computeNextRun(task);
	}

	saveTasksToDisk();

	if (broadcastRef) {
		broadcastRef({ type: 'scheduledTaskUpdated', task });
	}

	return task;
}

export function deleteScheduledTask(id: string): boolean {
	const idx = tasks.findIndex(t => t.id === id);
	if (idx === -1) return false;

	tasks.splice(idx, 1);
	saveTasksToDisk();

	if (broadcastRef) {
		broadcastRef({ type: 'scheduledTaskDeleted', taskId: id });
	}

	return true;
}

export function listScheduledTasks(): ScheduledTask[] {
	return [...tasks];
}

export function getMemoryNotes(): ScheduledTask[] {
	return tasks.filter(t => t.type === 'memory' && t.enabled);
}

// ── [SCHEDULE] Block Parsing ─────────────────────────────────

/**
 * Parse [SCHEDULE]...[/SCHEDULE] blocks from orchestrator response.
 * Returns cleaned text (blocks removed) and parsed tasks.
 */
export function parseScheduleBlocks(text: string): { cleanText: string; scheduledTasks: Omit<ScheduledTask, 'id' | 'createdAt' | 'nextRun'>[] } {
	const scheduledTasks: Omit<ScheduledTask, 'id' | 'createdAt' | 'nextRun'>[] = [];

	const cleanText = text.replace(
		/\[SCHEDULE\]\s*([\s\S]*?)\s*\[\/SCHEDULE\]/g,
		(_match, body: string) => {
			const parsed = parseScheduleBody(body.trim());
			if (parsed) scheduledTasks.push(parsed);
			return '';
		},
	).trim();

	return { cleanText, scheduledTasks };
}

/**
 * Parse a time value — supports:
 * - Relative: +1m, +5m, +1h, +2h, +30s
 * - ISO 8601: 2026-03-07T15:00:00
 * - Time-only: 15:00 (today or tomorrow if past)
 */
function parseTimeValue(value: string): string {
	// Relative time: +Nm, +Nh, +Ns
	const relMatch = value.match(/^\+(\d+)\s*(s|m|h|min|sec|hour)s?$/i);
	if (relMatch) {
		const amount = parseInt(relMatch[1], 10);
		const unit = relMatch[2].toLowerCase();
		const now = new Date();
		if (unit === 's' || unit === 'sec') {
			now.setSeconds(now.getSeconds() + amount);
		} else if (unit === 'm' || unit === 'min') {
			now.setMinutes(now.getMinutes() + amount);
		} else if (unit === 'h' || unit === 'hour') {
			now.setHours(now.getHours() + amount);
		}
		return now.toISOString();
	}

	// Time-only: HH:mm — schedule for today; if just passed (within 5 min), fire soon
	const timeMatch = value.match(/^(\d{1,2}):(\d{2})$/);
	if (timeMatch) {
		const now = new Date();
		const candidate = new Date(now);
		candidate.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), 0, 0);
		if (candidate <= now) {
			const diffMs = now.getTime() - candidate.getTime();
			if (diffMs < 5 * 60 * 1000) {
				// Just passed (within 5 minutes) — fire in 10 seconds instead of pushing to tomorrow
				return new Date(now.getTime() + 10_000).toISOString();
			}
			// More than 5 minutes ago — assume they mean tomorrow
			candidate.setDate(candidate.getDate() + 1);
		}
		return candidate.toISOString();
	}

	// ISO datetime or any parseable string
	const parsed = new Date(value);
	if (!isNaN(parsed.getTime())) {
		return parsed.toISOString();
	}

	// Fallback: return as-is (will likely be invalid, but won't crash)
	return value;
}

function parseScheduleBody(body: string): Omit<ScheduledTask, 'id' | 'createdAt' | 'nextRun'> | null {
	const fields: Record<string, string> = {};

	// Known field names for splitting single-line formats like "type: once time: 11:52 message: ..."
	const knownFields = ['type', 'trigger', 'time', 'pattern', 'action', 'message', 'description', 'dayofweek', 'dayofmonth'];

	// Normalize: split inline key-value pairs onto separate lines
	// "type: once time: +5m message: hello" → "type: once\ntime: +5m\nmessage: hello"
	const normalized = body.replace(
		new RegExp(`\\s+(${knownFields.join('|')})\\s*:`, 'gi'),
		(_m, key: string) => `\n${key}:`,
	);

	for (const line of normalized.split('\n')) {
		const match = line.match(/^(\w+)\s*:\s*(.+)$/);
		if (match) {
			fields[match[1].toLowerCase()] = match[2].trim();
		}
	}

	const type = (fields.type as ScheduledTask['type']) || 'once';
	const message = fields.message;
	const description = fields.description || message?.slice(0, 50) || '排程任務';

	if (!message) return null;

	const task: Omit<ScheduledTask, 'id' | 'createdAt' | 'nextRun'> = {
		type,
		description,
		createdBy: 'techlead',
		message,
		action: (fields.action as 'orchestrator' | 'notify') || 'orchestrator',
		enabled: true,
	};

	if (type === 'once') {
		const triggerValue = fields.trigger || fields.time;
		if (triggerValue) {
			task.triggerAt = parseTimeValue(triggerValue);
		}
	}

	if (type === 'recurring') {
		const pattern = (fields.pattern as 'daily' | 'weekly' | 'monthly') || 'daily';
		const time = fields.time || '09:00';
		task.recurring = { pattern, time };

		if (pattern === 'weekly' && fields.dayofweek) {
			task.recurring.dayOfWeek = parseInt(fields.dayofweek, 10);
		}
		if (pattern === 'monthly' && fields.dayofmonth) {
			task.recurring.dayOfMonth = parseInt(fields.dayofmonth, 10);
		}
	}

	return task;
}
