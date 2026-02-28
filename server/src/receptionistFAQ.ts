/**
 * Receptionist FAQ — Static keyword-based Q&A for the AI-Agents Office receptionist.
 * No Claude API calls; responses are matched from a predefined FAQ list.
 */

interface FAQEntry {
	keywords: string[];
	answer: string;
}

const FAQ: FAQEntry[] = [
	{
		keywords: ['是什麼', '介紹', '功能', 'what', '幹嘛', '幹什麼', '做什麼', '這是', '這個'],
		answer: 'AI-Agents Office 是一個像素風格的虛擬辦公室，每個角色代表一個 AI 代理。支援 Claude CLI 和 DeepSeek 兩種 AI 引擎，可以在設定中切換！',
	},
	{
		keywords: ['怎麼用', '使用', '開始', '入門', 'how', 'start', '怎麼開', '如何'],
		answer: '只要在終端機執行 `claude` 指令，角色就會自動出現在辦公室。你可以點擊角色與他們聊天，或在 Team 模式下讓他們協作完成任務！也可以在設定裡切換 AI 引擎和辦公室布景。',
	},
	{
		keywords: ['角色', '人物', 'character', '代理', 'agent', '幾個'],
		answer: '每個角色代表一個 AI 工作階段。每個 skill 定義了角色的外觀和專業，例如前端、後端、設計師等。同時最多可有 15 個角色在線！',
	},
	{
		keywords: ['聊天', 'chat', '對話', '怎麼聊', '互動'],
		answer: '點擊畫面中的角色，右側就會開啟聊天面板。你可以直接和角色對話，請他幫你完成程式設計任務！',
	},
	{
		keywords: ['編輯', '佈局', 'layout', '家具', '辦公室', '擺設', '裝潢'],
		answer: '點擊底部工具列的 ✏️ 編輯按鈕，就能進入辦公室編輯模式！可以自由擺放桌椅、牆壁、裝飾品，打造你專屬的辦公室風格。',
	},
	{
		keywords: ['布景', '場景', 'scene', '地圖', '地板', '牆壁', '換場', '主題', 'theme', '切換', '換'],
		answer: '點擊底部工具列的地圖圖示，可以切換不同的辦公室布景！目前有多種場景可選，每個布景有不同的地板和牆壁風格。',
	},
	{
		keywords: ['團隊', 'team', '模式', '專案', '協作', '分工'],
		answer: 'Team 模式下，一個 Orchestrator（技術長）會分析你的任務，並自動分派給各專業角色（前端、後端、QA 等）協作完成！',
	},
	{
		keywords: ['skill', '技能', '定義', 'prompt', '系統'],
		answer: 'Skill 是定義角色行為的設定檔（Markdown 格式），放在 `skills/` 資料夾。每個 skill 包含角色名稱、外觀設定和系統提示詞。',
	},
	{
		keywords: ['ai', 'AI', 'provider', '引擎', '模型', 'model', 'deepseek', 'DeepSeek', 'claude', '切換'],
		answer: '在設定（齒輪圖示）中可以切換 AI 引擎：Claude CLI（預設，完整工具能力）或 DeepSeek（文字對話模式，支援 deepseek-chat 和 deepseek-reasoner 兩種模型）。切換後所有角色都會使用新引擎。',
	},
	{
		keywords: ['設定', 'setting', '齒輪', '選項', '配置'],
		answer: '點擊底部工具列的齒輪圖示開啟設定！可以切換 AI 引擎（Claude CLI / DeepSeek）、選擇模型、設定 API Key、開關音效通知。',
	},
	{
		keywords: ['api', 'API', 'key', 'Key', '金鑰', '密鑰'],
		answer: '使用 DeepSeek 時需要在設定中輸入 API Key。API Key 儲存在你的本機設定檔中，不會上傳到任何地方。如需取得 DeepSeek API Key，請到 DeepSeek 官網申請。',
	},
	{
		keywords: ['聲音', 'sound', '音效', '通知', '提示音'],
		answer: '在設定中可以開關聲音通知。角色完成工作時會有提示聲哦！',
	},
	{
		keywords: ['座位', '座位', 'seat', '位置', '移動'],
		answer: '角色會自動分配座位。在角色出現後，可以拖拉角色到不同的座位上，位置會自動儲存。',
	},
	{
		keywords: ['歷史', '記錄', '對話紀錄', 'history', '之前'],
		answer: '每個角色的對話歷史都會保存在工作階段中。如果是 Team 模式，專案的聊天記錄還會儲存到 project.json 檔案！',
	},
	{
		keywords: ['你好', 'hello', 'hi', '嗨', '哈囉'],
		answer: '你好！我是 AI-Agents Office 的小幫手 👋 有什麼關於辦公室的問題都可以問我喔！',
	},
	{
		keywords: ['謝謝', '感謝', 'thank', '謝了'],
		answer: '不客氣！有其他問題隨時找我 😊',
	},
];

const DEFAULT_ANSWER =
	'抱歉，我不太確定這個問題的答案。你可以問我關於以下主題：辦公室介紹、使用方式、角色說明、Team 模式、AI 引擎切換、布景更換、skill 定義、佈局編輯等！';

/**
 * Find a FAQ answer for the given user message using keyword matching.
 */
export function findAnswer(userMessage: string): string {
	const msg = userMessage.toLowerCase();

	// Score each entry by number of keyword matches — pick the best
	let bestEntry: FAQEntry | null = null;
	let bestScore = 0;
	for (const entry of FAQ) {
		const score = entry.keywords.filter((kw) => msg.includes(kw.toLowerCase())).length;
		if (score > bestScore) {
			bestScore = score;
			bestEntry = entry;
		}
	}

	return bestEntry ? bestEntry.answer : DEFAULT_ANSWER;
}

/** Rotating welcome messages displayed as idle chat bubbles */
export const RECEPTIONIST_WELCOME_MESSAGES = [
	'歡迎來到 AI-Agents Office！有什麼需要幫忙的嗎？',
	'需要了解辦公室功能嗎？點我聊聊吧！',
	'我是小幫手，可以回答關於這個專案的問題喔 😊',
	'想知道怎麼使用嗎？隨時問我！',
	'每個角色都代表一個 Claude Code AI 代理喔',
	'試試點擊其他角色，可以看到他們在忙什麼！',
	'歡迎使用 AI-Agents Office，有任何問題請找我 👋',
];
