import * as fs from 'fs';
import * as path from 'path';
import { PIXEL_AGENTS_DIR, SETTINGS_FILE_NAME } from './config.js';
import type { AgentMeta } from './wsProtocol.js';

interface Settings {
	soundEnabled: boolean;
	agentSeats: Record<string, AgentMeta>;
	mode: 'chat' | 'team';
	activeProjectDir: string | null;
	aiProvider: 'claude-cli' | 'deepseek';
	deepseekApiKey: string;
	deepseekModel: string;
}

const defaultSettings: Settings = {
	soundEnabled: true,
	agentSeats: {},
	mode: 'chat',
	activeProjectDir: null,
	aiProvider: 'claude-cli',
	deepseekApiKey: '',
	deepseekModel: 'deepseek-chat',
};

let cachedSettings: Settings | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function getSettingsPath(): string {
	return path.join(PIXEL_AGENTS_DIR, SETTINGS_FILE_NAME);
}

export function loadSettings(): Settings {
	if (cachedSettings) return cachedSettings;

	const filePath = getSettingsPath();
	try {
		if (fs.existsSync(filePath)) {
			const raw = fs.readFileSync(filePath, 'utf-8');
			const parsed = { ...defaultSettings, ...JSON.parse(raw) };
			cachedSettings = parsed;
			return parsed;
		}
	} catch (err) {
		console.error('[Pixel Agents] Failed to read settings:', err);
	}

	cachedSettings = { ...defaultSettings };
	return cachedSettings;
}

function saveSettingsDebounced(): void {
	if (saveTimer) clearTimeout(saveTimer);
	saveTimer = setTimeout(() => {
		saveTimer = null;
		const filePath = getSettingsPath();
		try {
			if (!fs.existsSync(PIXEL_AGENTS_DIR)) {
				fs.mkdirSync(PIXEL_AGENTS_DIR, { recursive: true });
			}
			fs.writeFileSync(filePath, JSON.stringify(cachedSettings, null, 2), 'utf-8');
		} catch (err) {
			console.error('[Pixel Agents] Failed to save settings:', err);
		}
	}, 500);
}

export function setSoundEnabled(enabled: boolean): void {
	const settings = loadSettings();
	settings.soundEnabled = enabled;
	saveSettingsDebounced();
}

export function getSoundEnabled(): boolean {
	return loadSettings().soundEnabled;
}

export function saveAgentSeats(seats: Record<string, AgentMeta>): void {
	const settings = loadSettings();
	settings.agentSeats = seats;
	saveSettingsDebounced();
}

export function getAgentSeats(): Record<string, AgentMeta> {
	return loadSettings().agentSeats;
}

export function setMode(mode: 'chat' | 'team'): void {
	const settings = loadSettings();
	settings.mode = mode;
	saveSettingsDebounced();
}

export function getMode(): 'chat' | 'team' {
	return loadSettings().mode || 'chat';
}

export function setActiveProjectDir(dir: string | null): void {
	const settings = loadSettings();
	settings.activeProjectDir = dir;
	saveSettingsDebounced();
}

export function getActiveProjectDir(): string | null {
	return loadSettings().activeProjectDir || null;
}

export function setAIProvider(provider: 'claude-cli' | 'deepseek'): void {
	const settings = loadSettings();
	settings.aiProvider = provider;
	saveSettingsDebounced();
}

export function getAIProvider(): 'claude-cli' | 'deepseek' {
	return loadSettings().aiProvider || 'claude-cli';
}

export function setDeepseekApiKey(apiKey: string): void {
	const settings = loadSettings();
	settings.deepseekApiKey = apiKey;
	saveSettingsDebounced();
}

export function getDeepseekApiKey(): string {
	return loadSettings().deepseekApiKey || '';
}

export function setDeepseekModel(model: string): void {
	const settings = loadSettings();
	settings.deepseekModel = model;
	saveSettingsDebounced();
}

export function getDeepseekModel(): string {
	return loadSettings().deepseekModel || 'deepseek-chat';
}
