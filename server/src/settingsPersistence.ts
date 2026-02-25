import * as fs from 'fs';
import * as path from 'path';
import { PIXEL_AGENTS_DIR, SETTINGS_FILE_NAME } from './config.js';
import type { AgentMeta } from './wsProtocol.js';

interface Settings {
	soundEnabled: boolean;
	agentSeats: Record<string, AgentMeta>;
}

const defaultSettings: Settings = {
	soundEnabled: true,
	agentSeats: {},
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
