import { spawn } from 'child_process';
import type { ChatSession } from './types.js';
import type { Broadcast } from './timerManager.js';

const chatSessions = new Map<string, ChatSession>();
let chatCounter = 0;

export function createChat(cwd: string, broadcast: Broadcast): string {
	const chatId = `chat-${++chatCounter}`;
	const sessionId = crypto.randomUUID();

	const session: ChatSession = {
		chatId,
		sessionId,
		cwd,
		activeProcess: null,
	};

	chatSessions.set(chatId, session);
	console.log(`[Chat] Created chat ${chatId} (session ${sessionId})`);
	broadcast({ type: 'chatCreated', chatId });
	return chatId;
}

export function sendMessage(chatId: string, message: string, broadcast: Broadcast): void {
	const session = chatSessions.get(chatId);
	if (!session) {
		broadcast({ type: 'chatError', chatId, error: 'Chat session not found' });
		return;
	}

	if (session.activeProcess) {
		broadcast({ type: 'chatError', chatId, error: 'Previous message still processing' });
		return;
	}

	// Strip CLAUDECODE env var to avoid "cannot be launched inside another Claude Code session" error
	const cleanEnv = { ...process.env };
	delete cleanEnv.CLAUDECODE;

	// Spawn claude in print mode with session continuity
	// --verbose is required for --output-format stream-json with -p
	// stdin must be 'ignore' — using 'pipe' causes Claude CLI to hang waiting for stdin
	const proc = spawn('claude', [
		'-p', message,
		'--session-id', session.sessionId,
		'--output-format', 'stream-json',
		'--verbose',
	], {
		cwd: session.cwd,
		shell: true,
		stdio: ['ignore', 'pipe', 'pipe'],
		env: cleanEnv,
	});

	session.activeProcess = proc;

	let stdoutBuffer = '';
	let sentFromDeltas = false;

	proc.stdout.on('data', (data: Buffer) => {
		stdoutBuffer += data.toString();

		// Process complete lines (stream-json outputs one JSON per line)
		const lines = stdoutBuffer.split('\n');
		stdoutBuffer = lines.pop() || ''; // Keep incomplete line in buffer

		for (const line of lines) {
			if (!line.trim()) continue;
			try {
				const parsed = JSON.parse(line);
				// stream-json format emits multiple message types:
				// - content_block_delta: incremental text chunks (streaming)
				// - assistant: complete message with all content blocks
				// - result: final summary (duplicates assistant text, skip to avoid double-send)
				if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
					broadcast({ type: 'chatStreamChunk', chatId, text: parsed.delta.text });
					sentFromDeltas = true;
				} else if (parsed.type === 'assistant' && parsed.message?.content) {
					// Only send full assistant message if we didn't already stream via deltas
					if (!sentFromDeltas) {
						for (const block of parsed.message.content) {
							if (block.type === 'text' && block.text) {
								broadcast({ type: 'chatStreamChunk', chatId, text: block.text });
							}
						}
					}
				}
				// Skip 'result' type — it duplicates the assistant message text
			} catch {
				// Not valid JSON, might be raw text — send as-is
				broadcast({ type: 'chatStreamChunk', chatId, text: line });
			}
		}
	});

	proc.stderr.on('data', (data: Buffer) => {
		const text = data.toString();
		// Ignore noise like progress indicators; log for debugging
		if (text.trim()) {
			console.log(`[Chat ${chatId}] stderr: ${text.trim()}`);
		}
	});

	proc.on('error', (err) => {
		console.error(`[Chat ${chatId}] Process error:`, err.message);
		session.activeProcess = null;
		broadcast({ type: 'chatError', chatId, error: err.message });
	});

	proc.on('exit', (code) => {
		// Flush any remaining buffer (skip 'result' type to avoid duplicates)
		if (stdoutBuffer.trim()) {
			try {
				const parsed = JSON.parse(stdoutBuffer);
				if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
					broadcast({ type: 'chatStreamChunk', chatId, text: parsed.delta.text });
				} else if (parsed.type === 'assistant' && parsed.message?.content && !sentFromDeltas) {
					for (const block of parsed.message.content) {
						if (block.type === 'text' && block.text) {
							broadcast({ type: 'chatStreamChunk', chatId, text: block.text });
						}
					}
				}
			} catch {
				if (stdoutBuffer.trim()) {
					broadcast({ type: 'chatStreamChunk', chatId, text: stdoutBuffer });
				}
			}
		}

		session.activeProcess = null;
		if (code !== 0 && code !== null) {
			console.log(`[Chat ${chatId}] Process exited with code ${code}`);
		}
		broadcast({ type: 'chatStreamEnd', chatId });
	});
}

export function closeChat(chatId: string, broadcast: Broadcast): void {
	const session = chatSessions.get(chatId);
	if (!session) return;

	if (session.activeProcess) {
		try {
			session.activeProcess.kill('SIGTERM');
		} catch { /* process may already be dead */ }
	}

	chatSessions.delete(chatId);
	console.log(`[Chat] Closed chat ${chatId}`);
	broadcast({ type: 'chatClosed', chatId });
}

export function getExistingChatIds(): string[] {
	return Array.from(chatSessions.keys());
}

export function closeAllChats(broadcast: Broadcast): void {
	for (const chatId of chatSessions.keys()) {
		closeChat(chatId, broadcast);
	}
}
