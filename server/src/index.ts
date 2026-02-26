import * as fs from 'fs';
import * as path from 'path';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { AgentState } from './types.js';
import type { ClientMessage } from './wsProtocol.js';
import type { Broadcast } from './timerManager.js';
import { HTTP_PORT, MAX_CHARACTERS, getAssetsRoot, getClientAssetsDir } from './config.js';
import {
	launchNewSession,
	removeAgent,
	closeAgent,
	sendExistingAgents,
	getAllProjectDirs,
} from './sessionManager.js';
import { ensureProjectScan } from './fileWatcher.js';
import {
	loadFurnitureAssets,
	loadFloorTiles,
	loadWallTiles,
	loadCharacterSprites,
	loadDefaultLayout,
} from './assetLoader.js';
import { sliceTileset } from './tilesetSlicer.js';
import {
	loadLayout,
	writeLayoutToFile,
	watchLayoutFile,
	type LayoutWatcher,
} from './layoutPersistence.js';
import {
	getSoundEnabled,
	setSoundEnabled,
	saveAgentSeats,
	getAgentSeats,
	getMode,
	setMode,
} from './settingsPersistence.js';
import {
	createChat,
	sendMessage as sendChatMessage,
	closeChat as closeChatSession,
	getExistingChatIds,
	getChatAgentIds,
	initChatManager,
} from './chatManager.js';
import { loadSkills, watchSkills } from './skillLoader.js';
import {
	initTeamManager,
	loadTeam,
	sendTeamMessage,
	sendOrchestratorMessage,
	getTeamAgentIds,
	getExistingTeamMembers,
	getOrchestratorSkillId,
} from './teamManager.js';

// ── State ────────────────────────────────────────────────────
const agents = new Map<number, AgentState>();
const nextAgentId = { current: 1 };
const knownJsonlFiles = new Set<string>();
const projectScanTimer = { current: null as ReturnType<typeof setInterval> | null };

// Per-agent timers
const fileWatchers = new Map<number, fs.FSWatcher>();
const pollingTimers = new Map<number, ReturnType<typeof setInterval>>();
const waitingTimers = new Map<number, ReturnType<typeof setTimeout>>();
const permissionTimers = new Map<number, ReturnType<typeof setTimeout>>();
const jsonlPollTimers = new Map<number, ReturnType<typeof setInterval>>();

// Layout watcher
let layoutWatcher: LayoutWatcher | null = null;

// Connected WebSocket clients
const clients = new Set<WebSocket>();

// Cached assets (loaded once at startup)
let cachedAssets: {
	furnitureCatalog: unknown[] | null;
	furnitureSprites: Record<string, string[][]> | null;
	characterSprites: unknown[] | null;
	floorTiles: string[][][] | null;
	wallTiles: string[][][] | null;
	defaultLayout: Record<string, unknown> | null;
} = {
	furnitureCatalog: null,
	furnitureSprites: null,
	characterSprites: null,
	floorTiles: null,
	wallTiles: null,
	defaultLayout: null,
};

// ── Broadcast ────────────────────────────────────────────────
const broadcast: Broadcast = (msg: unknown) => {
	const data = JSON.stringify(msg);
	for (const client of clients) {
		if (client.readyState === WebSocket.OPEN) {
			client.send(data);
		}
	}
};

// ── Express App ──────────────────────────────────────────────
const app = express();
app.use(express.json());

// Serve client static files (production build)
const clientDistPath = path.join(getAssetsRoot(), 'dist', 'client');
if (fs.existsSync(clientDistPath)) {
	app.use(express.static(clientDistPath));
}

// API routes
app.get('/api/status', (_req, res) => {
	res.json({
		agents: agents.size,
		clients: clients.size,
	});
});

app.get('/api/layout', (_req, res) => {
	const layout = loadLayout(cachedAssets.defaultLayout);
	res.json(layout || {});
});

// ── HTTP Server + WebSocket ──────────────────────────────────
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
	clients.add(ws);
	console.log(`[Pixel Agents] WebSocket client connected (total: ${clients.size})`);

	ws.on('message', (raw) => {
		try {
			const message = JSON.parse(raw.toString()) as ClientMessage;
			handleClientMessage(ws, message);
		} catch (err) {
			console.error('[Pixel Agents] Invalid message:', err);
		}
	});

	ws.on('close', () => {
		clients.delete(ws);
		console.log(`[Pixel Agents] WebSocket client disconnected (total: ${clients.size})`);
	});
});

function handleClientMessage(_ws: WebSocket, message: ClientMessage): void {
	switch (message.type) {
		case 'webviewReady':
			handleWebviewReady();
			break;

		case 'openClaude': {
			const cwd = message.cwd || process.cwd();
			launchNewSession(
				cwd, nextAgentId, agents, knownJsonlFiles,
				fileWatchers, pollingTimers, waitingTimers, permissionTimers,
				jsonlPollTimers, broadcast,
			);
			break;
		}

		case 'focusAgent':
			// In web version, we don't have terminals to focus. Just send selection.
			broadcast({ type: 'agentSelected', id: message.id });
			break;

		case 'closeAgent':
			closeAgent(
				message.id, agents,
				fileWatchers, pollingTimers, waitingTimers, permissionTimers,
				jsonlPollTimers, broadcast,
			);
			break;

		case 'saveAgentSeats':
			console.log(`[Pixel Agents] saveAgentSeats:`, JSON.stringify(message.seats));
			saveAgentSeats(message.seats);
			break;

		case 'saveLayout':
			layoutWatcher?.markOwnWrite();
			writeLayoutToFile(message.layout);
			break;

		case 'setSoundEnabled':
			setSoundEnabled(message.enabled);
			break;

		case 'importLayout':
			if (message.layout && message.layout.version === 1 && Array.isArray(message.layout.tiles)) {
				layoutWatcher?.markOwnWrite();
				writeLayoutToFile(message.layout);
				broadcast({ type: 'layoutLoaded', layout: message.layout });
			}
			break;

		case 'createChat': {
			const totalCharacters = agents.size + getChatAgentIds().length + getTeamAgentIds().length;
			if (totalCharacters >= MAX_CHARACTERS) {
				broadcast({ type: 'chatError', chatId: '', error: `Character limit reached (max ${MAX_CHARACTERS})` });
				break;
			}
			const chatCwd = message.cwd || process.cwd();
			createChat(chatCwd, broadcast);
			break;
		}

		case 'sendChatMessage':
			sendChatMessage(message.chatId, message.message, broadcast);
			break;

		case 'closeChat':
			closeChatSession(message.chatId, broadcast);
			break;

		case 'sendTeamMessage':
			sendTeamMessage(message.skillId, message.message, broadcast);
			break;

		case 'sendOrchestratorMessage':
			sendOrchestratorMessage(message.message, broadcast);
			break;

		case 'setMode':
			setMode(message.mode);
			broadcast({ type: 'settingsLoaded', soundEnabled: getSoundEnabled(), mode: message.mode });
			break;
	}
}

function handleWebviewReady(): void {
	// Send settings (including mode)
	broadcast({ type: 'settingsLoaded', soundEnabled: getSoundEnabled(), mode: getMode() });

	// Send cached assets
	if (cachedAssets.characterSprites) {
		broadcast({ type: 'characterSpritesLoaded', characters: cachedAssets.characterSprites });
	}
	if (cachedAssets.floorTiles) {
		broadcast({ type: 'floorTilesLoaded', sprites: cachedAssets.floorTiles });
	}
	if (cachedAssets.wallTiles) {
		broadcast({ type: 'wallTilesLoaded', sprites: cachedAssets.wallTiles });
	}
	if (cachedAssets.furnitureCatalog && cachedAssets.furnitureSprites) {
		broadcast({
			type: 'furnitureAssetsLoaded',
			catalog: cachedAssets.furnitureCatalog,
			sprites: cachedAssets.furnitureSprites,
		});
	}

	// Send layout
	const layout = loadLayout(cachedAssets.defaultLayout);
	broadcast({ type: 'layoutLoaded', layout });

	// Send existing agents
	const agentMeta = getAgentSeats();
	sendExistingAgents(agents, agentMeta, broadcast);

	// Send existing chats and their agent characters
	const chatIds = getExistingChatIds();
	if (chatIds.length > 0) {
		broadcast({ type: 'existingChats', chatIds });
		// Re-create pixel characters for each existing chat
		for (const chatAgentId of getChatAgentIds()) {
			broadcast({ type: 'agentCreated', id: chatAgentId });
		}
	}

	// Send existing team members
	const teamMembers = getExistingTeamMembers();
	if (teamMembers.length > 0) {
		broadcast({ type: 'teamLoaded', members: teamMembers, orchestratorSkillId: getOrchestratorSkillId() ?? undefined });
		for (const member of teamMembers) {
			broadcast({ type: 'agentCreated', id: member.agentId, name: member.name });
		}
	}
}

// ── Asset Loading ────────────────────────────────────────────
async function loadAllAssets(): Promise<void> {
	const assetsRoot = getAssetsRoot();
	const clientAssetsDir = getClientAssetsDir();

	// Check if we need to find assets in client/public path
	const clientRoot = path.join(assetsRoot, 'client', 'public');

	// Slice tileset if needed
	const furnitureCatalogPath = path.join(clientAssetsDir, 'furniture', 'furniture-catalog.json');
	if (!fs.existsSync(furnitureCatalogPath)) {
		console.log('[Pixel Agents] Slicing tileset...');
		await sliceTileset();
	}

	// Load character sprites
	const charSprites = await loadCharacterSprites(clientRoot);
	if (charSprites) {
		cachedAssets.characterSprites = charSprites.characters;
		console.log('[Pixel Agents] Character sprites loaded');
	}

	// Load floor tiles
	const floorTiles = await loadFloorTiles(clientRoot);
	if (floorTiles) {
		cachedAssets.floorTiles = floorTiles.sprites;
		console.log('[Pixel Agents] Floor tiles loaded');
	}

	// Load wall tiles
	const wallTiles = await loadWallTiles(clientRoot);
	if (wallTiles) {
		cachedAssets.wallTiles = wallTiles.sprites;
		console.log('[Pixel Agents] Wall tiles loaded');
	}

	// Load furniture
	const furnitureAssets = await loadFurnitureAssets(clientRoot);
	if (furnitureAssets) {
		cachedAssets.furnitureCatalog = furnitureAssets.catalog;
		const spritesObj: Record<string, string[][]> = {};
		for (const [id, spriteData] of furnitureAssets.sprites) {
			spritesObj[id] = spriteData;
		}
		cachedAssets.furnitureSprites = spritesObj;
		console.log('[Pixel Agents] Furniture assets loaded');
	}

	// Load default layout
	cachedAssets.defaultLayout = loadDefaultLayout(clientRoot);
}

// ── Startup ──────────────────────────────────────────────────
async function start(): Promise<void> {
	console.log('[Pixel Agents] Starting server...');

	// Initialize chat manager and team manager with shared agent ID counter
	initChatManager(nextAgentId);
	initTeamManager(nextAgentId);

	// Load all assets
	await loadAllAssets();

	// Load team skills and start watcher
	const skills = loadSkills();
	if (skills.length > 0) {
		loadTeam(skills, broadcast);
		console.log(`[Pixel Agents] Loaded ${skills.length} team skills`);
	}
	watchSkills((updatedSkills) => {
		console.log(`[Pixel Agents] Skills changed — reloading ${updatedSkills.length} skills`);
		loadTeam(updatedSkills, broadcast);
	});

	// Start project scanning to discover Claude CLI sessions
	const projectDirs = getAllProjectDirs();
	if (projectDirs.length > 0) {
		ensureProjectScan(
			projectDirs, knownJsonlFiles, projectScanTimer,
			nextAgentId, agents,
			fileWatchers, pollingTimers, waitingTimers, permissionTimers,
			jsonlPollTimers, broadcast,
		);
		console.log(`[Pixel Agents] Scanning ${projectDirs.length} project directories`);
	}

	// Start layout watcher for cross-window sync
	layoutWatcher = watchLayoutFile((layout) => {
		console.log('[Pixel Agents] External layout change — pushing to clients');
		broadcast({ type: 'layoutLoaded', layout });
	});

	// Start HTTP server
	server.listen(HTTP_PORT, () => {
		console.log(`[Pixel Agents] Server running at http://localhost:${HTTP_PORT}`);
		console.log(`[Pixel Agents] WebSocket endpoint: ws://localhost:${HTTP_PORT}/ws`);
	});
}

start().catch((err) => {
	console.error('[Pixel Agents] Fatal error:', err);
	process.exit(1);
});
