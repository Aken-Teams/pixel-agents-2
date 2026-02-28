import type { AIProvider, AIMessage, GenerateCallbacks, GenerateOptions, GenerateHandle } from '../aiProvider.js';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

export class DeepSeekProvider implements AIProvider {
	constructor(
		private apiKey: string,
		private model: string = 'deepseek-chat',
	) {}

	generate(messages: AIMessage[], callbacks: GenerateCallbacks, _options?: GenerateOptions): GenerateHandle {
		const controller = new AbortController();
		let assistantResponse = '';

		const done = new Promise<string>(async (resolve, reject) => {
			if (!this.apiKey) {
				reject(new Error('DeepSeek API key is not configured. Please set it in Settings.'));
				return;
			}

			const body = {
				model: this.model,
				messages: messages.map(m => ({ role: m.role, content: m.content })),
				stream: true,
			};

			try {
				const response = await fetch(DEEPSEEK_API_URL, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${this.apiKey}`,
					},
					body: JSON.stringify(body),
					signal: controller.signal,
				});

				if (!response.ok) {
					const errorText = await response.text();
					reject(new Error(`DeepSeek API error ${response.status}: ${errorText}`));
					return;
				}

				const reader = response.body?.getReader();
				if (!reader) {
					reject(new Error('No response body from DeepSeek API'));
					return;
				}

				const decoder = new TextDecoder();
				let buffer = '';

				while (true) {
					const { done: streamDone, value } = await reader.read();
					if (streamDone) break;

					buffer += decoder.decode(value, { stream: true });

					// Process complete SSE lines
					const lines = buffer.split('\n');
					buffer = lines.pop() || '';

					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed || trimmed.startsWith(':')) continue;

						if (trimmed === 'data: [DONE]') {
							continue;
						}

						if (trimmed.startsWith('data: ')) {
							const jsonStr = trimmed.slice(6);
							try {
								const chunk = JSON.parse(jsonStr);
								const delta = chunk.choices?.[0]?.delta;
								if (!delta) continue;

								// Reasoning content (deepseek-reasoner thinking mode)
								if (delta.reasoning_content) {
									callbacks.onThinkingChunk?.(delta.reasoning_content);
								}

								// Text content
								if (delta.content) {
									callbacks.onTextChunk(delta.content);
									assistantResponse += delta.content;
								}
							} catch {
								// Skip malformed JSON chunks
							}
						}
					}
				}

				resolve(assistantResponse.trim());
			} catch (err: unknown) {
				if (controller.signal.aborted) {
					resolve(assistantResponse.trim());
				} else {
					reject(err instanceof Error ? err : new Error(String(err)));
				}
			}
		});

		return {
			abort: () => controller.abort(),
			done,
		};
	}
}
