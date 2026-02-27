import * as fs from 'fs';
import * as path from 'path';
import { watch } from 'chokidar';
import { getAssetsRoot } from './config.js';

export interface SkillDefinition {
	/** Filename without extension, used as stable ID */
	id: string;
	/** Display name from frontmatter */
	name: string;
	/** Optional palette index (0-5) */
	palette?: number;
	/** Optional hue shift in degrees */
	hueShift?: number;
	/** Role: 'orchestrator' = main dispatcher, 'worker' (default) = sub-agent */
	role?: 'orchestrator' | 'worker';
	/** Short description from frontmatter */
	description?: string;
	/** First sentence of system prompt, used as character bio */
	bio?: string;
	/** Display order (lower = first) */
	order?: number;
	/** The markdown body = system prompt content */
	systemPrompt: string;
}

function getSkillsDir(): string {
	return path.join(getAssetsRoot(), 'skills');
}

/**
 * Parse a skill markdown file with --- frontmatter.
 * Returns null if the file is invalid or missing required fields.
 */
function parseSkillFile(filePath: string): SkillDefinition | null {
	try {
		const raw = fs.readFileSync(filePath, 'utf-8');
		const id = path.basename(filePath, '.md');

		// Split on --- delimiters
		const parts = raw.split(/^---\s*$/m);
		if (parts.length < 3) {
			// No frontmatter — use filename as name, entire content as prompt
			const prompt = raw.trim();
			if (!prompt) return null;
			return { id, name: id, systemPrompt: prompt };
		}

		// parts[0] = before first ---, parts[1] = frontmatter, parts[2+] = body
		const frontmatter = parts[1];
		const body = parts.slice(2).join('---').trim();

		// Parse simple key: value frontmatter
		let name = id;
		let palette: number | undefined;
		let hueShift: number | undefined;
		let role: 'orchestrator' | 'worker' | undefined;
		let description: string | undefined;
		let order: number | undefined;

		for (const line of frontmatter.split('\n')) {
			const match = line.match(/^\s*(\w+)\s*:\s*(.+?)\s*$/);
			if (!match) continue;
			const [, key, value] = match;
			if (key === 'name') name = value;
			else if (key === 'palette') palette = parseInt(value, 10);
			else if (key === 'hueShift') hueShift = parseInt(value, 10);
			else if (key === 'role' && (value === 'orchestrator' || value === 'worker')) role = value;
			else if (key === 'description') description = value.replace(/^["']|["']$/g, '');
			else if (key === 'order') order = parseInt(value, 10);
		}

		if (!body) return null;
		// Extract first sentence as bio (split on 。or . followed by whitespace/newline)
		const firstSentence = body.split(/。|(?<=\w)\.\s/)[0]?.trim().replace(/^#+\s*/, '') ?? '';
		const bio = firstSentence.length > 0 && firstSentence.length < 200 ? firstSentence : undefined;
		return { id, name, palette, hueShift, role, description, bio, order, systemPrompt: body };
	} catch {
		return null;
	}
}

/** Load all skill definitions from the skills/ directory */
export function loadSkills(): SkillDefinition[] {
	const dir = getSkillsDir();
	if (!fs.existsSync(dir)) return [];

	const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
	const skills: SkillDefinition[] = [];
	for (const file of files) {
		const skill = parseSkillFile(path.join(dir, file));
		if (skill) skills.push(skill);
	}
	// Sort by order field (lower first), unordered skills go to end
	skills.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
	return skills;
}

/** Watch the skills/ directory for changes and invoke callback with updated skills */
export function watchSkills(onChange: (skills: SkillDefinition[]) => void): { close: () => void } | null {
	const dir = getSkillsDir();
	if (!fs.existsSync(dir)) return null;

	const watcher = watch(path.join(dir, '*.md'), {
		ignoreInitial: true,
		awaitWriteFinish: { stabilityThreshold: 300 },
	});

	const reload = () => {
		const skills = loadSkills();
		onChange(skills);
	};

	watcher.on('add', reload);
	watcher.on('change', reload);
	watcher.on('unlink', reload);

	return { close: () => watcher.close() };
}
