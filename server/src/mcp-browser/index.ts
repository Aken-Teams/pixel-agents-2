#!/usr/bin/env node
/**
 * MCP Browser Server — Puppeteer-based browser automation for AI agents.
 * Exposes browser tools via MCP protocol (stdio transport).
 * Uses puppeteer-extra + stealth plugin to avoid bot detection.
 * Default search engine: DuckDuckGo.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, Page } from 'puppeteer';

// puppeteer-extra ESM compat — default export may be wrapped
const puppeteer = (puppeteerExtra as any).default || puppeteerExtra;

// Enable stealth plugin — hides headless browser fingerprints
puppeteer.use(StealthPlugin());

// ── Browser lifecycle ──────────────────────────────────────────
let browser: Browser | null = null;
let page: Page | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

async function getPage(): Promise<Page> {
	if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }

	if (!browser) {
		browser = await puppeteer.launch({
			headless: true,
			args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
		}) as unknown as Browser;
	}

	if (!page || page.isClosed()) {
		page = await browser.newPage();
		await page.setViewport({ width: 1280, height: 800 });
		await page.setUserAgent(
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
		);
	}

	idleTimer = setTimeout(closeBrowser, IDLE_TIMEOUT);
	return page;
}

async function closeBrowser() {
	if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
	if (page && !page.isClosed()) {
		try { await page.close(); } catch { /* */ }
	}
	page = null;
	if (browser) {
		try { await browser.close(); } catch { /* */ }
	}
	browser = null;
}

// ── Tool implementations ───────────────────────────────────────

async function browserSearch(query: string): Promise<string> {
	const p = await getPage();
	const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
	await p.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

	// Wait for results to load
	await p.waitForSelector('[data-testid="result"]', { timeout: 10000 }).catch(() => {});

	const results = await p.evaluate(() => {
		// DuckDuckGo result selectors
		const items = document.querySelectorAll('[data-testid="result"]');
		if (items.length > 0) {
			return Array.from(items).slice(0, 8).map(item => ({
				title: item.querySelector('h2')?.textContent?.trim() || '',
				url: item.querySelector('a')?.getAttribute('href') || '',
				snippet: item.querySelector('[data-result="snippet"]')?.textContent?.trim()
					|| item.querySelector('.result__snippet')?.textContent?.trim()
					|| '',
			}));
		}
		// Fallback: try generic link extraction
		const links = document.querySelectorAll('.results .result');
		return Array.from(links).slice(0, 8).map(item => ({
			title: item.querySelector('.result__a')?.textContent?.trim() || '',
			url: item.querySelector('.result__a')?.getAttribute('href') || '',
			snippet: item.querySelector('.result__snippet')?.textContent?.trim() || '',
		}));
	});

	if (results.length === 0) {
		return `Search for "${query}" returned no results. The page may have loaded differently. Try browser_get_text to see what's on the page.`;
	}

	return results
		.map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet}`)
		.join('\n\n');
}

async function browserNavigate(url: string): Promise<string> {
	const p = await getPage();
	await p.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
	const title = await p.title();
	const text = await p.evaluate(() => {
		const body = document.body;
		if (!body) return '';
		// Remove script/style content
		const clone = body.cloneNode(true) as HTMLElement;
		clone.querySelectorAll('script, style, noscript').forEach(el => el.remove());
		return clone.innerText?.slice(0, 8000) || '';
	});
	return `Page: ${title}\nURL: ${p.url()}\n\n${text}`;
}

async function browserClick(selector: string): Promise<string> {
	const p = await getPage();
	try {
		await p.waitForSelector(selector, { timeout: 5000 });
		await p.click(selector);
		// Wait for potential navigation
		await p.waitForNetworkIdle({ timeout: 3000 }).catch(() => {});
		return `Clicked: ${selector}\nCurrent URL: ${p.url()}`;
	} catch (err) {
		return `Failed to click "${selector}": ${err instanceof Error ? err.message : String(err)}`;
	}
}

async function browserType(selector: string, text: string, pressEnter?: boolean): Promise<string> {
	const p = await getPage();
	try {
		await p.waitForSelector(selector, { timeout: 5000 });
		await p.click(selector, { clickCount: 3 }); // Select existing text
		await p.type(selector, text, { delay: 30 });
		if (pressEnter) {
			await p.keyboard.press('Enter');
			await p.waitForNetworkIdle({ timeout: 5000 }).catch(() => {});
		}
		return `Typed "${text}" into ${selector}${pressEnter ? ' and pressed Enter' : ''}`;
	} catch (err) {
		return `Failed to type into "${selector}": ${err instanceof Error ? err.message : String(err)}`;
	}
}

async function browserScreenshot(fullPage?: boolean): Promise<{ base64: string; mimeType: string }> {
	const p = await getPage();
	const buffer = await p.screenshot({
		fullPage: fullPage ?? false,
		type: 'png',
	});
	return {
		base64: Buffer.from(buffer).toString('base64'),
		mimeType: 'image/png',
	};
}

async function browserGetText(selector?: string): Promise<string> {
	const p = await getPage();
	const text = await p.evaluate((sel) => {
		const el = sel ? document.querySelector(sel) : document.body;
		if (!el) return `Element not found: ${sel}`;
		const clone = el.cloneNode(true) as HTMLElement;
		clone.querySelectorAll('script, style, noscript').forEach(e => e.remove());
		return clone.innerText?.slice(0, 10000) || '';
	}, selector || null);
	return text;
}

async function browserBack(): Promise<string> {
	const p = await getPage();
	await p.goBack({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
	return `Navigated back. Current URL: ${p.url()}`;
}

async function browserEvaluate(script: string): Promise<string> {
	const p = await getPage();
	try {
		const result = await p.evaluate(script);
		return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
	} catch (err) {
		return `Evaluation error: ${err instanceof Error ? err.message : String(err)}`;
	}
}

// ── MCP Server setup ───────────────────────────────────────────

const server = new Server(
	{ name: 'browser', version: '1.0.0' },
	{ capabilities: { tools: {} } },
);

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
	tools: [
		{
			name: 'browser_search',
			description: 'Search the web using DuckDuckGo. Returns top results with titles, URLs, and snippets.',
			inputSchema: {
				type: 'object' as const,
				properties: {
					query: { type: 'string', description: 'Search query' },
				},
				required: ['query'],
			},
		},
		{
			name: 'browser_navigate',
			description: 'Navigate to a URL and return the page title and text content.',
			inputSchema: {
				type: 'object' as const,
				properties: {
					url: { type: 'string', description: 'URL to navigate to' },
				},
				required: ['url'],
			},
		},
		{
			name: 'browser_click',
			description: 'Click an element on the page by CSS selector.',
			inputSchema: {
				type: 'object' as const,
				properties: {
					selector: { type: 'string', description: 'CSS selector of the element to click' },
				},
				required: ['selector'],
			},
		},
		{
			name: 'browser_type',
			description: 'Type text into an input field. Optionally press Enter after typing.',
			inputSchema: {
				type: 'object' as const,
				properties: {
					selector: { type: 'string', description: 'CSS selector of the input field' },
					text: { type: 'string', description: 'Text to type' },
					pressEnter: { type: 'boolean', description: 'Press Enter after typing (default: false)' },
				},
				required: ['selector', 'text'],
			},
		},
		{
			name: 'browser_screenshot',
			description: 'Take a screenshot of the current page. Returns a PNG image.',
			inputSchema: {
				type: 'object' as const,
				properties: {
					fullPage: { type: 'boolean', description: 'Capture full page (default: false, viewport only)' },
				},
			},
		},
		{
			name: 'browser_get_text',
			description: 'Get text content of the page or a specific element.',
			inputSchema: {
				type: 'object' as const,
				properties: {
					selector: { type: 'string', description: 'CSS selector (optional, defaults to entire page)' },
				},
			},
		},
		{
			name: 'browser_back',
			description: 'Navigate back to the previous page.',
			inputSchema: {
				type: 'object' as const,
				properties: {},
			},
		},
		{
			name: 'browser_evaluate',
			description: 'Execute JavaScript code in the browser page context.',
			inputSchema: {
				type: 'object' as const,
				properties: {
					script: { type: 'string', description: 'JavaScript code to execute' },
				},
				required: ['script'],
			},
		},
	],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;

	try {
		switch (name) {
			case 'browser_search': {
				const text = await browserSearch(args?.query as string);
				return { content: [{ type: 'text', text }] };
			}
			case 'browser_navigate': {
				const text = await browserNavigate(args?.url as string);
				return { content: [{ type: 'text', text }] };
			}
			case 'browser_click': {
				const text = await browserClick(args?.selector as string);
				return { content: [{ type: 'text', text }] };
			}
			case 'browser_type': {
				const text = await browserType(
					args?.selector as string,
					args?.text as string,
					args?.pressEnter as boolean | undefined,
				);
				return { content: [{ type: 'text', text }] };
			}
			case 'browser_screenshot': {
				const result = await browserScreenshot(args?.fullPage as boolean | undefined);
				return {
					content: [{
						type: 'image',
						data: result.base64,
						mimeType: result.mimeType,
					}],
				};
			}
			case 'browser_get_text': {
				const text = await browserGetText(args?.selector as string | undefined);
				return { content: [{ type: 'text', text }] };
			}
			case 'browser_back': {
				const text = await browserBack();
				return { content: [{ type: 'text', text }] };
			}
			case 'browser_evaluate': {
				const text = await browserEvaluate(args?.script as string);
				return { content: [{ type: 'text', text }] };
			}
			default:
				return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
		}
	} catch (err) {
		return {
			content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
			isError: true,
		};
	}
});

// Start server
async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error('[MCP Browser] Server started');

	// Clean up on exit
	process.on('SIGINT', async () => { await closeBrowser(); process.exit(0); });
	process.on('SIGTERM', async () => { await closeBrowser(); process.exit(0); });
}

main().catch((err) => {
	console.error('[MCP Browser] Fatal error:', err);
	process.exit(1);
});
