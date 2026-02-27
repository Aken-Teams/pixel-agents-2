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
		answer: 'AI-Agents Office 是一個像素風格的虛擬辦公室，每個角色代表一個 Claude Code AI 代理。啟動 Claude Code 後，角色就會自動出現在辦公室裡工作！',
	},
	{
		keywords: ['怎麼用', '使用', '開始', '入門', 'how', 'start', '怎麼開', '如何'],
		answer: '只要在終端機執行 `claude` 指令，角色就會自動出現在辦公室。你可以點擊角色與他們聊天，或在 Team 模式下讓他們協作完成任務！',
	},
	{
		keywords: ['角色', '人物', 'character', '代理', 'agent', '幾個'],
		answer: '每個角色代表一個 Claude Code 工作階段。每個 skill 定義了角色的外觀和專業，例如前端、後端、設計師等。同時最多可有 15 個角色在線！',
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
		keywords: ['團隊', 'team', '模式', '專案', '協作', '分工'],
		answer: 'Team 模式下，一個 Orchestrator 角色會分析你的任務，並自動分派給各專業角色（前端、後端、QA 等）協作完成！',
	},
	{
		keywords: ['skill', '技能', '定義', 'prompt', '系統'],
		answer: 'Skill 是定義角色行為的設定檔（Markdown 格式），放在 `skills/` 資料夾。每個 skill 包含角色名稱、外觀設定和系統提示詞。',
	},
	{
		keywords: ['聲音', 'sound', '音效', '通知', '提示音'],
		answer: '右上角有聲音開關 🔔，可以控制是否播放通知音效。角色完成工作時會有提示聲哦！',
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
	'抱歉，我不太確定這個問題的答案。你可以問我關於以下主題：辦公室介紹、使用方式、角色說明、Team 模式、skill 定義、佈局編輯等！';

/**
 * Find a FAQ answer for the given user message using keyword matching.
 */
export function findAnswer(userMessage: string): string {
	const msg = userMessage.toLowerCase();
	for (const entry of FAQ) {
		if (entry.keywords.some((kw) => msg.includes(kw))) {
			return entry.answer;
		}
	}
	return DEFAULT_ANSWER;
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
