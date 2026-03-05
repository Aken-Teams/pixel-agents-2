import { spawn, type ChildProcess } from 'child_process';
import type { AIProvider, AIMessage, GenerateCallbacks, GenerateOptions, GenerateHandle } from '../aiProvider.js';
import { formatToolStatus } from '../transcriptParser.js';

/**
 * Convert AIMessage[] to Claude CLI stdin format.
 * System messages become <role>...</role>, conversation history becomes
 * Human:/Assistant: pairs, matching the format Claude CLI expects.
 */
function messagesToStdin(messages: AIMessage[]): string {
	const systemMessages = messages.filter(m => m.role === 'system');
	const conversationMessages = messages.filter(m => m.role !== 'system');

	let stdin = '';

	// System prompt wrapped in <role> tags
	if (systemMessages.length > 0) {
		const systemPrompt = systemMessages.map(m => m.content).join('\n\n');
		stdin += `<role>\n${systemPrompt}\n</role>\n\n`;
	}

	if (conversationMessages.length <= 1) {
		// Single message — just send it
		stdin += conversationMessages[0]?.content || '';
	} else {
		// Multiple messages — format as Human:/Assistant: conversation
		const history = conversationMessages.slice(0, -1);
		const latest = conversationMessages[conversationMessages.length - 1];
		const lines = history.map(m =>
			m.role === 'user' ? `Human: ${m.content}` : `Assistant: ${m.content}`,
		);
		lines.push(`Human: ${latest.content}`);
		stdin += `${lines.join('\n')}\n\nContinue the conversation above. Respond to the latest Human message only.`;
	}

	return stdin;
}

export class ClaudeCLIProvider implements AIProvider {
	generate(messages: AIMessage[], callbacks: GenerateCallbacks, options?: GenerateOptions): GenerateHandle {
		let proc: ChildProcess | null = null;
		let assistantResponse = '';

		const done = new Promise<string>((resolve, reject) => {
			const cleanEnv = { ...process.env };
			delete cleanEnv.CLAUDECODE;

			const args = [
				'-p',
				'--output-format', 'stream-json',
				'--verbose',
			];

			// Session persistence: use --session-id for persistent sessions,
			// --no-session-persistence for one-shot calls
			if (options?.sessionId) {
				args.push('--session-id', options.sessionId);
			} else {
				args.push('--no-session-persistence');
			}

			if (options?.dangerouslySkipPermissions) {
				args.push('--dangerously-skip-permissions');
			}

			proc = spawn('claude', args, {
				cwd: options?.cwd || process.cwd(),
				shell: true,
				stdio: ['pipe', 'pipe', 'pipe'],
				env: cleanEnv,
			});

			// For persistent sessions after the first call, send only the latest user message
			// (Claude remembers the system prompt and conversation history)
			let stdinPayload: string;
			if (options?.sessionId && !options.isFirstSessionCall) {
				// Extract just the latest user message
				const lastUserMsg = messages.filter(m => m.role === 'user').pop();
				stdinPayload = lastUserMsg?.content || '';
			} else {
				stdinPayload = messagesToStdin(messages);
			}
			proc.stdin!.write(stdinPayload);
			proc.stdin!.end();

			let stdoutBuffer = '';
			let sentFromDeltas = false;

			proc.stdout!.on('data', (data: Buffer) => {
				stdoutBuffer += data.toString();
				const lines = stdoutBuffer.split('\n');
				stdoutBuffer = lines.pop() || '';

				for (const line of lines) {
					if (!line.trim()) continue;
					try {
						const parsed = JSON.parse(line);

						// Thinking deltas
						if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'thinking_delta' && parsed.delta?.thinking) {
							callbacks.onThinkingChunk?.(parsed.delta.thinking);
						}

						if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
							callbacks.onTextChunk(parsed.delta.text);
							assistantResponse += parsed.delta.text;
							sentFromDeltas = true;
						} else if (parsed.type === 'assistant' && parsed.message?.content) {
							const blocks = parsed.message.content as Array<{
								type: string; id?: string; name?: string; input?: Record<string, unknown>; text?: string;
							}>;
							// Detect tool_use blocks
							for (const block of blocks) {
								if (block.type === 'tool_use' && block.name) {
									const status = formatToolStatus(block.name, block.input || {});
									callbacks.onToolActivity?.(status);
								}
							}
							if (!sentFromDeltas) {
								for (const block of blocks) {
									if (block.type === 'text' && block.text) {
										callbacks.onTextChunk(block.text);
										assistantResponse += block.text;
									}
								}
							}
						} else if (parsed.type === 'user' && Array.isArray(parsed.message?.content)) {
							const blocks = parsed.message.content as Array<{ type: string; tool_use_id?: string }>;
							if (blocks.some(b => b.type === 'tool_result')) {
								callbacks.onToolActivity?.(null);
							}
						}
					} catch {
						callbacks.onTextChunk(line);
						assistantResponse += line;
					}
				}
			});

			let stderrContent = '';
			proc.stderr!.on('data', (data: Buffer) => {
				const text = data.toString();
				stderrContent += text;
				if (text.trim()) {
					console.log(`[ClaudeCLI] stderr: ${text.trim()}`);
				}
			});

			proc.on('error', (err) => {
				console.error('[ClaudeCLI] Process error:', err.message);
				proc = null;
				reject(err);
			});

			proc.on('exit', (code) => {
				// Flush remaining buffer
				if (stdoutBuffer.trim()) {
					try {
						const parsed = JSON.parse(stdoutBuffer);
						if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
							callbacks.onTextChunk(parsed.delta.text);
							assistantResponse += parsed.delta.text;
						} else if (parsed.type === 'assistant' && parsed.message?.content && !sentFromDeltas) {
							for (const block of parsed.message.content) {
								if (block.type === 'text' && block.text) {
									callbacks.onTextChunk(block.text);
									assistantResponse += block.text;
								}
							}
						}
					} catch {
						if (stdoutBuffer.trim()) {
							callbacks.onTextChunk(stdoutBuffer);
							assistantResponse += stdoutBuffer;
						}
					}
				}

				proc = null;

				if (code !== 0 && code !== null) {
					const errDetail = stderrContent.trim();
					reject(new Error(`Claude CLI exited with code ${code}${errDetail ? `: ${errDetail}` : ''}`));
				} else {
					resolve(assistantResponse.trim());
				}
			});
		});

		return {
			abort: () => {
				if (proc) {
					try { proc.kill('SIGTERM'); } catch { /* */ }
				}
			},
			done,
		};
	}
}
