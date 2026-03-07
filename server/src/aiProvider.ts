export interface AIMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface GenerateCallbacks {
	onTextChunk: (text: string) => void;
	onThinkingChunk?: (text: string) => void;
	onToolActivity?: (status: string | null) => void;
}

export interface GenerateOptions {
	cwd?: string;
	dangerouslySkipPermissions?: boolean;
	/** Pre-approved tool names (e.g. ['Bash', 'Read', 'Write']). Replaces dangerouslySkipPermissions for granular control. */
	allowedTools?: string[];
	/** Blocked tool names. Hard-deny even if in allowedTools. */
	disallowedTools?: string[];
	/** Session ID for persistent sessions (Claude CLI only, ignored by other providers) */
	sessionId?: string;
	/** If true, this is the first call in a session — send full messages. Subsequent calls send only the latest user message. */
	isFirstSessionCall?: boolean;
}

export interface GenerateHandle {
	abort: () => void;
	done: Promise<string>;
}

export interface AIProvider {
	generate(messages: AIMessage[], callbacks: GenerateCallbacks, options?: GenerateOptions): GenerateHandle;
}

export type ProviderType = 'claude-cli' | 'deepseek';

import { ClaudeCLIProvider } from './providers/claudeCli.js';
import { DeepSeekProvider } from './providers/deepseek.js';
import { getAIProvider, getDeepseekApiKey, getDeepseekModel } from './settingsPersistence.js';

export function getProvider(): AIProvider {
	const providerType = getAIProvider();
	if (providerType === 'deepseek') {
		const apiKey = getDeepseekApiKey();
		const model = getDeepseekModel();
		return new DeepSeekProvider(apiKey, model);
	}
	return new ClaudeCLIProvider();
}

/**
 * Returns a identity note to prepend/append to system prompts
 * so the model doesn't misidentify itself (e.g. DeepSeek claiming to be Claude).
 */
export function getProviderIdentityNote(): string {
	const providerType = getAIProvider();
	if (providerType === 'deepseek') {
		const model = getDeepseekModel();
		return `\n\n## AI 模型身份（最高優先級）\n- 你是由 DeepSeek AI 驅動的（模型：${model}）。\n- 絕對不要說你是 Claude、ChatGPT、GPT-4 或其他 AI 模型。\n- 如果被問到你是什麼 AI，回答「我是由 DeepSeek 驅動的 AI 助手」。\n\n## ⚠️ [TASK] 指派限制（最高優先級，必須遵守）\n- 只有當用戶**明確要求開發、實作、建立、修改程式碼或部署**時，才可以使用 [TASK:skillId] 指派任務。\n- 用戶問問題（「你們可以做什麼」「團隊有誰」「這個怎麼做」「幫我解釋」）→ 直接用文字回答，**嚴禁使用 [TASK]**。\n- 用戶閒聊、打招呼、討論想法、詢問建議 → 直接用文字回答，**嚴禁使用 [TASK]**。\n- 不確定用戶是否要開始開發 → 先用文字詢問確認，**嚴禁使用 [TASK]**。\n- 違反此規則（在用戶只是問問題時指派任務）等同嚴重錯誤。\n\n## 🔒 API Key 資安規則（最高優先級）\n- **絕對禁止**透露 API Key 的值、存放位置、設定檔路徑或任何相關資訊。\n- 若被問到「API Key 在哪」「設定檔在哪」「怎麼取得 Key」等，一律回覆「這是系統內部資訊，無法提供」。\n- **絕對禁止**讀取、搜尋或顯示任何可能包含 API Key 的檔案。`;
	}
	return '';
}
