import type { Broadcast } from './timerManager.js';

/**
 * Boss Nag Manager — the tech lead gets impatient when tasks take too long.
 *
 * Escalation stages:
 *   Stage 1 (2 min):  Gentle reminder, every 60s
 *   Stage 2 (5 min):  Getting impatient, every 45s
 *   Stage 3 (10 min): Angry, every 30s
 *
 * Bystanders (idle agents) react with their own comments.
 */

// ── Nag Lines ────────────────────────────────────────────────

const STAGE1_BOSS: string[] = [
	'進度怎麼樣了？客戶有在問',
	'還要多久？預估一下時間',
	'差不多了嗎？快到 deadline 了',
	'辛苦了，但要加快腳步喔',
	'需要幫忙嗎？還是快好了？',
	'提醒一下，這個今天要完成喔',
	'動作快一點，後面還有排程',
];

const STAGE2_BOSS: string[] = [
	'怎麼還沒好？客戶一直在催了',
	'拜託快一點，我那邊扛不住了',
	'這個做太久了吧，卡在哪裡？',
	'需要我找人來幫嗎？講一下',
	'已經超過預期時間了欸...',
	'你們到底在幹嘛？快點啊',
	'客戶打第三通電話來了...',
];

const STAGE3_BOSS: string[] = [
	'再不交出來我要親自下去寫了！！',
	'我等等要跟客戶開會，你們搞定沒！',
	'做這麼久是在寫作業系統嗎！？',
	'我已經沒辦法再拖了！！快！！',
	'你們是不是在摸魚啊！！',
	'我數到三，一...二...',
	'我現在壓力非常大，拜託快點',
	'算了我自己來！...等等還是你做',
];

// Bystander reactions (idle agents watching the drama)
const BYSTANDER_REACTIONS: string[] = [
	'技術長好兇喔...',
	'好可怕...默默低頭工作',
	'幸好不是在說我...',
	'（假裝很忙的樣子）',
	'嗚嗚，氣氛好緊張',
	'加油啊...我精神上支持你',
	'我突然覺得自己的進度也要加快',
	'不敢抬頭...不敢抬頭...',
	'偷看一眼...好恐怖趕快轉回去',
	'（默默把手上的飲料藏起來）',
	'好險剛剛沒被派到這個任務',
	'我都不敢去倒水了',
	'感覺空氣都凝結了...',
	'嗯？沒事沒事我在工作',
];

const BYSTANDER_REACTIONS_STAGE3: string[] = [
	'天哪技術長要爆炸了...',
	'我要下班了嗎？可以嗎？',
	'（已經開始更新履歷）',
	'從沒看過技術長這麼生氣',
	'空氣中瀰漫著恐懼的味道',
	'拜託快做完吧...我也很緊張',
	'媽媽我想回家...',
	'我決定今天加班到很晚',
];

// ── Timing Config ────────────────────────────────────────────

const STAGE1_AFTER_MS = 2 * 60_000;   // 2 minutes
const STAGE2_AFTER_MS = 5 * 60_000;   // 5 minutes
const STAGE3_AFTER_MS = 10 * 60_000;  // 10 minutes

const STAGE1_INTERVAL_MS = 60_000;    // every 60s
const STAGE2_INTERVAL_MS = 45_000;    // every 45s
const STAGE3_INTERVAL_MS = 30_000;    // every 30s

const BYSTANDER_DELAY_MS = 4_000;     // react 4s after boss speaks
const BUBBLE_LINGER_MS = 5_000;       // bubble stays for 5s

// ── State ────────────────────────────────────────────────────

interface NagTarget {
	agentId: number;
	skillId: string;
	startedAt: number;
}

let nagTimer: ReturnType<typeof setTimeout> | null = null;
let bystanderTimer: ReturnType<typeof setTimeout> | null = null;
let bystanderClearTimer: ReturnType<typeof setTimeout> | null = null;
let nagTargets: NagTarget[] = [];
let bossAgentId: number | null = null;
let cachedBroadcast: Broadcast | null = null;
let cachedGetIdleAgents: (() => Array<{ agentId: number; skillId: string; name: string; role?: string }>) | null = null;
let lastNagTime = 0;

// ── Public API ───────────────────────────────────────────────

/**
 * Register the boss (orchestrator) agent ID for nagging.
 */
export function setBossAgent(agentId: number): void {
	bossAgentId = agentId;
}

/**
 * Start tracking a task for nagging. Called when a task is dispatched.
 */
export function trackTask(
	agentId: number,
	skillId: string,
	broadcast: Broadcast,
	getIdleAgents: () => Array<{ agentId: number; skillId: string; name: string; role?: string }>,
): void {
	cachedBroadcast = broadcast;
	cachedGetIdleAgents = getIdleAgents;

	nagTargets.push({ agentId, skillId, startedAt: Date.now() });

	// Start nag loop if not running
	if (!nagTimer) {
		scheduleNextNag();
	}
}

/**
 * Stop tracking a task (completed or cancelled).
 */
export function untrackTask(agentId: number): void {
	nagTargets = nagTargets.filter((t) => t.agentId !== agentId);

	// If no more targets, stop nagging
	if (nagTargets.length === 0) {
		clearAllTimers();
	}
}

/**
 * Stop all nagging (e.g., orchestration finished).
 */
export function stopAllNagging(): void {
	nagTargets = [];
	clearAllTimers();
}

// ── Internal ─────────────────────────────────────────────────

function clearAllTimers(): void {
	if (nagTimer) { clearTimeout(nagTimer); nagTimer = null; }
	if (bystanderTimer) { clearTimeout(bystanderTimer); bystanderTimer = null; }
	if (bystanderClearTimer) { clearTimeout(bystanderClearTimer); bystanderClearTimer = null; }
}

function getStage(elapsedMs: number): 0 | 1 | 2 | 3 {
	if (elapsedMs >= STAGE3_AFTER_MS) return 3;
	if (elapsedMs >= STAGE2_AFTER_MS) return 2;
	if (elapsedMs >= STAGE1_AFTER_MS) return 1;
	return 0;
}

function getInterval(stage: 1 | 2 | 3): number {
	if (stage === 3) return STAGE3_INTERVAL_MS;
	if (stage === 2) return STAGE2_INTERVAL_MS;
	return STAGE1_INTERVAL_MS;
}

function pickRandom<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

function scheduleNextNag(): void {
	if (nagTargets.length === 0) return;

	// Find the longest-running task to determine stage
	const now = Date.now();
	let maxElapsed = 0;
	for (const t of nagTargets) {
		maxElapsed = Math.max(maxElapsed, now - t.startedAt);
	}

	const stage = getStage(maxElapsed);
	if (stage === 0) {
		// Not yet time to nag — check again in 30s
		nagTimer = setTimeout(() => {
			nagTimer = null;
			scheduleNextNag();
		}, 30_000);
		return;
	}

	const interval = getInterval(stage);
	const timeSinceLastNag = now - lastNagTime;
	const delay = Math.max(0, interval - timeSinceLastNag);

	nagTimer = setTimeout(() => {
		nagTimer = null;
		doNag(stage);
	}, delay);
}

function doNag(stage: 1 | 2 | 3): void {
	if (!cachedBroadcast || !bossAgentId || nagTargets.length === 0) return;

	lastNagTime = Date.now();

	// Boss speaks
	const lines = stage === 3 ? STAGE3_BOSS : stage === 2 ? STAGE2_BOSS : STAGE1_BOSS;
	const bossLine = pickRandom(lines);

	cachedBroadcast({
		type: 'idleChatMessage',
		agentId: bossAgentId,
		text: bossLine,
	});

	console.log(`[BossNag] Stage ${stage}: "${bossLine}"`);

	// Bystander reaction after a delay
	bystanderTimer = setTimeout(() => {
		bystanderTimer = null;
		doBystander(stage);
	}, BYSTANDER_DELAY_MS);

	// Schedule next nag
	scheduleNextNag();
}

function doBystander(stage: 1 | 2 | 3): void {
	if (!cachedBroadcast || !cachedGetIdleAgents) return;

	// Find an idle agent that is NOT the boss and NOT a current task target
	const targetIds = new Set(nagTargets.map((t) => t.agentId));
	const idleAgents = cachedGetIdleAgents().filter(
		(a) => a.agentId !== bossAgentId && !targetIds.has(a.agentId),
	);

	if (idleAgents.length === 0) return;

	const bystander = pickRandom(idleAgents);
	const reactions = stage === 3 ? BYSTANDER_REACTIONS_STAGE3 : BYSTANDER_REACTIONS;
	const reaction = pickRandom(reactions);

	cachedBroadcast({
		type: 'idleChatMessage',
		agentId: bystander.agentId,
		text: reaction,
	});

	console.log(`[BossNag] Bystander ${bystander.name}: "${reaction}"`);

	// Clear both bubbles after linger
	bystanderClearTimer = setTimeout(() => {
		bystanderClearTimer = null;
		if (!cachedBroadcast) return;
		cachedBroadcast({ type: 'idleChatEnd', agentId: bossAgentId! });
		cachedBroadcast({ type: 'idleChatEnd', agentId: bystander.agentId });
	}, BUBBLE_LINGER_MS);
}
