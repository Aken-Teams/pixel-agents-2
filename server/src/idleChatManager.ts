import type { Broadcast } from './timerManager.js';
import { getDeepseekApiKey } from './settingsPersistence.js';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

/** Every N conversations, attempt one AI-generated conversation */
const AI_CHAT_EVERY = 5;

/**
 * Call DeepSeek API (non-streaming) to generate a short 2-person idle chat.
 * Returns null on any failure so caller can fall back to fixed scripts.
 */
async function generateAIConversation(): Promise<ConversationLine[] | null> {
	const apiKey = getDeepseekApiKey();
	if (!apiKey) return null;

	// Always use deepseek-chat for idle chat — reasoner is too slow/unstable for simple dialogue
	const model = 'deepseek-chat';
	const topics = [
		'AI 和科技業最新動態（如 OpenAI、Google、Claude、NVIDIA、台積電、Apple 等公司的新產品或新聞）',
		'台灣近期真實發生的社會新聞或政策變化',
		'最近全球科技趨勢（AI 工具、新程式語言、開源專案、晶片技術）',
		'台灣 IT 產業或軟體工程師的工作文化話題',
		'最近台灣的天災、地震、颱風或天氣異常',
		'台灣股市、房價、經濟相關的話題',
		'最近爆紅的迷因、網路話題、YouTuber 或社群事件',
		'台灣的交通建設、捷運新路線、高鐵延伸等',
		'程式開發相關（debug 經驗、code review、新框架、部署踩雷）',
		'遠端工作 vs 進辦公室、加班文化、面試經驗',
		"生活時事、附近好吃的餐廳",
		"國外時事、國外大事、AI 趨勢"
	];
	const randomTopic = topics[Math.floor(Math.random() * topics.length)];

	const today = new Date().toISOString().slice(0, 10); // e.g. "2026-03-01"
	const prompt = `你是台灣科技公司的軟體工程師。今天是 ${today}。請生成一段 2 人的繁體中文辦公室閒聊對話，共 6 句。
話題：${randomTopic}
規則：
- 內容要符合 ${today} 這個時間點，不要提到已經過時的舊聞（例如不要講 2024 年以前的產品發表）
- 內容要像在討論真實發生的事，提到具體的名稱、數字或事件（可以虛構但要逼真）
- 每句話要短，不超過 20 個字
- 語氣口語自然，像台灣年輕工程師聊天
- 不要用表情符號
回覆格式為 JSON 陣列：[{"s":0,"t":"內容"},{"s":1,"t":"內容"},...]
s 是說話者編號（0 或 1），t 是對話內容。只回覆 JSON，不要其他文字。`;

	try {
		const start = Date.now();
		const res = await fetch(DEEPSEEK_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model,
				messages: [{ role: 'user', content: prompt }],
				stream: false,
				temperature: 1.0,
			}),
			signal: AbortSignal.timeout(30_000),
		});

		const elapsed = Date.now() - start;
		if (!res.ok) {
			console.log(`[IdleChat] DeepSeek API error ${res.status} (${elapsed}ms)`);
			return null;
		}

		const data = await res.json() as { choices?: { message?: { content?: string } }[] };
		const text = data.choices?.[0]?.message?.content?.trim();
		if (!text) return null;
		console.log(`[IdleChat] AI response received in ${elapsed}ms`);

		// Extract JSON array from response (may be wrapped in ```json ... ```)
		const jsonMatch = text.match(/\[[\s\S]*\]/);
		if (!jsonMatch) return null;

		const arr = JSON.parse(jsonMatch[0]) as { s: number; t: string }[];
		if (!Array.isArray(arr) || arr.length < 2) return null;

		return arr.slice(0, 6).map((item) => ({
			speaker: item.s === 0 ? 0 : 1,
			text: item.t,
		}));
	} catch (err) {
		console.log(`[IdleChat] AI generation failed: ${err instanceof Error ? err.message : err}`);
		return null;
	}
}

/**
 * Idle Chat Manager — makes team members chat casually when not working.
 * Conversations stop immediately when a task is dispatched.
 */

interface ConversationLine {
	speaker: number; // index into participant array (0, 1, 2, ...)
	text: string;
}

export interface IdleAgent {
	agentId: number;
	skillId: string;
	name: string;
	role?: 'orchestrator' | 'worker';
}

// ── Conversation Pool ──────────────────────────────────────────

interface ConversationScript {
	speakerCount?: number;
	/** Map speaker index → required role, e.g. { 2: 'orchestrator' } */
	roles?: Record<number, 'orchestrator' | 'worker'>;
	lines: ConversationLine[];
}

const CONVERSATIONS: ConversationScript[] = [
	// ── 午餐 & 美食 ──
	{ lines: [
		{ speaker: 0, text: '今天中午想吃什麼？' },
		{ speaker: 1, text: '不知道欸，昨天便當有點膩了' },
		{ speaker: 0, text: '要不要試那家新開的拉麵？' },
		{ speaker: 1, text: '好啊！聽說他們叉燒很厲害' },
		{ speaker: 0, text: '那等等一起去，我先存個檔' },
	] },
	{ lines: [
		{ speaker: 0, text: '我發現公司附近一家超好吃的店' },
		{ speaker: 1, text: '真的嗎？什麼店？' },
		{ speaker: 0, text: '一家滷肉飯，那個肉燥超香' },
		{ speaker: 1, text: '走路幾分鐘？' },
		{ speaker: 0, text: '大概五分鐘，明天帶你去' },
	] },
	{ lines: [
		{ speaker: 1, text: '你們都用哪個外送平台？' },
		{ speaker: 0, text: '看心情，但最近都用 Uber Eats' },
		{ speaker: 1, text: '運費是不是越來越貴了' },
		{ speaker: 0, text: '對啊，有時候運費比餐點還貴' },
		{ speaker: 1, text: '所以我現在都揪同事一起點' },
	] },
	{ lines: [
		{ speaker: 1, text: '要不要訂下午茶？' },
		{ speaker: 0, text: '好啊！你想吃什麼？' },
		{ speaker: 1, text: '想喝珍奶，你呢？' },
		{ speaker: 0, text: '我要鮮奶茶加布丁' },
		{ speaker: 1, text: '我去問其他人要不要一起訂' },
	] },
	{ lines: [
		{ speaker: 0, text: '剛剛去買咖啡，排了十五分鐘' },
		{ speaker: 1, text: '那家永遠都在排' },
		{ speaker: 0, text: '但它真的比較好喝啊' },
		{ speaker: 1, text: '下次幫我帶一杯拿鐵' },
	] },
	{ lines: [
		{ speaker: 0, text: '你吃早餐了嗎？' },
		{ speaker: 1, text: '還沒，趕著出門忘了' },
		{ speaker: 0, text: '桌上有餅乾，先墊一下' },
		{ speaker: 1, text: '謝啦，你人真好' },
	] },
	{ lines: [
		{ speaker: 1, text: '公司的自動販賣機又壞了' },
		{ speaker: 0, text: '那台上禮拜才修好的' },
		{ speaker: 1, text: '它吃了我二十塊' },
		{ speaker: 0, text: '上次也吃我的，我都不敢用了' },
	] },
	{ lines: [
		{ speaker: 0, text: '你有吃過那家新開的韓式炸雞嗎？' },
		{ speaker: 1, text: '吃過！蜂蜜口味超好吃' },
		{ speaker: 0, text: '外送有嗎？想當午餐' },
		{ speaker: 1, text: '有，但要等比較久，大概40分鐘' },
		{ speaker: 0, text: '值得等吧，那我來訂' },
	] },
	{ lines: [
		{ speaker: 1, text: '最近在嘗試帶便當' },
		{ speaker: 0, text: '很棒欸！自己煮什麼？' },
		{ speaker: 1, text: '昨天做了親子丼，還滿成功的' },
		{ speaker: 0, text: '好厲害，我連煎蛋都會焦' },
		{ speaker: 1, text: '小火慢煎就好了啦' },
	] },
	{ lines: [
		{ speaker: 0, text: '你今天第幾杯咖啡了？' },
		{ speaker: 1, text: '第三杯了...昨天沒睡好' },
		{ speaker: 0, text: '哇，那你晚上還睡得著嗎' },
		{ speaker: 1, text: '大概到兩點就會自動斷電吧' },
	] },
	// ── 遊戲 & 娛樂 ──
	{ lines: [
		{ speaker: 0, text: '最近有在玩什麼遊戲嗎？' },
		{ speaker: 1, text: '在玩薩爾達，每天玩到半夜' },
		{ speaker: 0, text: '哈哈，我也是！你打到哪了？' },
		{ speaker: 1, text: '剛打完風之神殿，那個 boss 超難' },
		{ speaker: 0, text: '那個我打了三次才過...' },
	] },
	{ lines: [
		{ speaker: 1, text: '你有在追什麼劇嗎？' },
		{ speaker: 0, text: '最近在看一部韓劇，超好看' },
		{ speaker: 1, text: '哪部？推薦一下' },
		{ speaker: 0, text: '《黑暗榮耀》，復仇的那種' },
		{ speaker: 1, text: '聽過！那個評價超高的' },
	] },
	{ lines: [
		{ speaker: 0, text: '最近有什麼好看的電影嗎？' },
		{ speaker: 1, text: '我上週去看了那部科幻片，還不錯' },
		{ speaker: 0, text: '會燒腦嗎？' },
		{ speaker: 1, text: '有一點，但劇情很緊湊不會無聊' },
		{ speaker: 0, text: '那這週末來去看好了' },
	] },
	{ lines: [
		{ speaker: 1, text: '你工作的時候都聽什麼音樂？' },
		{ speaker: 0, text: '最近在聽 lo-fi，很適合寫 code' },
		{ speaker: 1, text: '我都聽白噪音，咖啡廳那種' },
		{ speaker: 0, text: '有推薦的 playlist 嗎？' },
		{ speaker: 1, text: '等一下傳給你，超讚的' },
	] },
	{ lines: [
		{ speaker: 0, text: '你有看昨天的 NBA 嗎？' },
		{ speaker: 1, text: '有！最後那一球絕殺太扯了' },
		{ speaker: 0, text: '我看到跳起來了' },
		{ speaker: 1, text: '我室友被我吵醒還來罵我' },
	] },
	{ lines: [
		{ speaker: 1, text: 'Steam 特價你有買什麼嗎？' },
		{ speaker: 0, text: '買了三個，但一個都還沒打開' },
		{ speaker: 1, text: '哈哈，經典的 Steam 收藏家' },
		{ speaker: 0, text: '我遊戲庫快兩百個了，玩過的不到十個' },
	] },
	{ lines: [
		{ speaker: 0, text: '你有在看世界盃嗎？' },
		{ speaker: 1, text: '有啊，昨天那場看到半夜三點' },
		{ speaker: 0, text: '今天精神還好嗎？' },
		{ speaker: 1, text: '靠咖啡撐著，值得的' },
	] },
	{ lines: [
		{ speaker: 1, text: '我昨天終於破關了！' },
		{ speaker: 0, text: '哪個遊戲？' },
		{ speaker: 1, text: '艾爾登法環，打了半年終於' },
		{ speaker: 0, text: '太強了吧，最後那個 boss 怎麼打的？' },
		{ speaker: 1, text: '魔法流，站超遠一直丟' },
	] },
	{ lines: [
		{ speaker: 0, text: '你知道 Netflix 下個月有什麼新的嗎？' },
		{ speaker: 1, text: '好像有新一季的怪奇物語' },
		{ speaker: 0, text: '等好久了！終於要出了' },
		{ speaker: 1, text: '到時候一起追吧，不要爆雷' },
	] },
	{ lines: [
		{ speaker: 1, text: '你有在用 Spotify 還是 Apple Music？' },
		{ speaker: 0, text: 'Spotify，用好幾年了' },
		{ speaker: 1, text: '年末那個 Wrapped 超有趣的' },
		{ speaker: 0, text: '對啊，我去年聽最多的是 Chill Hop' },
	] },
	// ── 生活 & 週末 ──
	{ lines: [
		{ speaker: 0, text: '這週末有什麼計畫嗎？' },
		{ speaker: 1, text: '想去爬山，最近天氣還不錯' },
		{ speaker: 0, text: '去哪座山？我也好久沒動了' },
		{ speaker: 1, text: '想去象山，輕鬆走走就好' },
		{ speaker: 0, text: '不錯欸，下次揪一下' },
	] },
	{ lines: [
		{ speaker: 0, text: '今天外面好冷喔...' },
		{ speaker: 1, text: '對啊，早上出門差點被風吹走' },
		{ speaker: 0, text: '我穿了三件還是覺得冷' },
		{ speaker: 1, text: '辦公室暖氣開了嗎？我怎麼沒感覺' },
	] },
	{ lines: [
		{ speaker: 1, text: '你上次去日本是去哪裡？' },
		{ speaker: 0, text: '去大阪，吃了好多好吃的' },
		{ speaker: 1, text: '大阪美食多，我也好想去' },
		{ speaker: 0, text: '道頓堀那邊每家都想吃' },
		{ speaker: 1, text: '等下次連假一起規劃吧！' },
	] },
	{ lines: [
		{ speaker: 0, text: '你換新手機了喔？' },
		{ speaker: 1, text: '對啊，用了三年終於換了' },
		{ speaker: 0, text: '感覺怎樣？差很多嗎？' },
		{ speaker: 1, text: '拍照差超多，晚上拍也很清楚' },
	] },
	{ lines: [
		{ speaker: 1, text: '昨天你那邊有地震嗎？' },
		{ speaker: 0, text: '有！搖超大的，嚇死我' },
		{ speaker: 1, text: '我在打遊戲完全沒感覺' },
		{ speaker: 0, text: '你是有多專注啊...' },
	] },
	{ lines: [
		{ speaker: 0, text: '你有推薦的 podcast 嗎？' },
		{ speaker: 1, text: '有一個叫《科技島讀》，每集都很短' },
		{ speaker: 0, text: '通勤的時候聽剛好' },
		{ speaker: 1, text: '對啊，我每天捷運上都在聽' },
	] },
	{ lines: [
		{ speaker: 1, text: '最近有在運動嗎？' },
		{ speaker: 0, text: '上禮拜去了一次健身房' },
		{ speaker: 1, text: '只有一次？哈哈' },
		{ speaker: 0, text: '辦了年卡結果都在養蚊子' },
		{ speaker: 1, text: '同病相憐，我也是' },
	] },
	{ lines: [
		{ speaker: 0, text: '你家附近有好的早餐店嗎？' },
		{ speaker: 1, text: '有一家蛋餅超好吃，排隊排到門口' },
		{ speaker: 0, text: '什麼蛋餅可以排成那樣？' },
		{ speaker: 1, text: '起司玉米蛋餅，吃過就回不去了' },
	] },
	{ lines: [
		{ speaker: 1, text: '你最近有去哪裡玩嗎？' },
		{ speaker: 0, text: '上週去了九份，人超多' },
		{ speaker: 1, text: '假日去一定的啊' },
		{ speaker: 0, text: '但芋圓真的好吃，排隊值得' },
	] },
	{ lines: [
		{ speaker: 0, text: '你搬家了嗎？之前說要搬' },
		{ speaker: 1, text: '搬了！上個月搬完的' },
		{ speaker: 0, text: '新家離公司近嗎？' },
		{ speaker: 1, text: '近很多，通勤從一小時變二十分鐘' },
		{ speaker: 0, text: '太幸福了吧' },
	] },
	// ── 辦公室生活 ──
	{ lines: [
		{ speaker: 0, text: '這椅子坐久了腰好痠...' },
		{ speaker: 1, text: '你要不要試站著工作？' },
		{ speaker: 0, text: '站著不會腳痠嗎？' },
		{ speaker: 1, text: '交替站坐啊，站個半小時坐一下' },
	] },
	{ lines: [
		{ speaker: 1, text: '你有在做眼睛保健操嗎？' },
		{ speaker: 0, text: '沒有欸，盯螢幕太久了' },
		{ speaker: 1, text: '我現在每小時會看窗外 20 秒' },
		{ speaker: 0, text: '20-20-20 法則？聽過但做不到' },
	] },
	{ lines: [
		{ speaker: 1, text: '昨天加班到幾點啊？' },
		{ speaker: 0, text: '十點多吧...在修一個很棘手的問題' },
		{ speaker: 1, text: '辛苦了，修好了嗎？' },
		{ speaker: 0, text: '修好了，結果是少了一個分號' },
	] },
	{ lines: [
		{ speaker: 0, text: '會議室又被占了...' },
		{ speaker: 1, text: '每次要用的時候都沒位子' },
		{ speaker: 0, text: '不是有訂會議室系統嗎？' },
		{ speaker: 1, text: '有人訂了又不去，最討厭這種' },
	] },
	{ lines: [
		{ speaker: 1, text: '你鍵盤是用什麼軸的？' },
		{ speaker: 0, text: '茶軸，打起來很舒服' },
		{ speaker: 1, text: '我用紅軸，比較安靜' },
		{ speaker: 0, text: '之前用青軸被隔壁同事抗議' },
		{ speaker: 1, text: '哈哈，青軸真的太吵了' },
	] },
	{ lines: [
		{ speaker: 0, text: '冷氣也太冷了吧' },
		{ speaker: 1, text: '每次夏天都覺得在冰箱裡上班' },
		{ speaker: 0, text: '我帶了一件外套放公司' },
		{ speaker: 1, text: '聰明，我明天也帶一件' },
	] },
	{ lines: [
		{ speaker: 1, text: '你的螢幕是幾吋的？' },
		{ speaker: 0, text: '27 吋，之前升級的' },
		{ speaker: 1, text: '雙螢幕嗎？' },
		{ speaker: 0, text: '對啊，一個寫 code 一個看文件，回不去了' },
	] },
	{ lines: [
		{ speaker: 0, text: '你在用什麼筆記軟體？' },
		{ speaker: 1, text: 'Notion，什麼都丟進去' },
		{ speaker: 0, text: '我在猶豫 Notion 還是 Obsidian' },
		{ speaker: 1, text: 'Obsidian 離線好用，看你需求' },
	] },
	{ lines: [
		{ speaker: 1, text: '停電了怎麼辦啊？' },
		{ speaker: 0, text: '筆電還有電，先用熱點' },
		{ speaker: 1, text: '我的筆電只剩 30% 了' },
		{ speaker: 0, text: '先存檔吧，以防萬一' },
	] },
	{ lines: [
		{ speaker: 0, text: '今天是誰生日啊？看到蛋糕' },
		{ speaker: 1, text: '好像是 PM 那邊的，我也不太認識' },
		{ speaker: 0, text: '管他的，先吃再說' },
		{ speaker: 1, text: '你這個人 😂 走吧去切' },
	] },
	// ── 技術 & 工程師日常 ──
	{ lines: [
		{ speaker: 1, text: '我剛發現一個超神奇的 bug' },
		{ speaker: 0, text: '怎樣的？' },
		{ speaker: 1, text: '同一段 code，本地跑沒問題，deploy 就壞' },
		{ speaker: 0, text: '經典...環境變數檢查了嗎？' },
		{ speaker: 1, text: '最後發現是大小寫的問題' },
	] },
	{ lines: [
		{ speaker: 0, text: '你有看到那個新出的前端框架嗎？' },
		{ speaker: 1, text: '又有新的了？上禮拜才學完一個' },
		{ speaker: 0, text: '哈哈，前端生態圈日常' },
		{ speaker: 1, text: '我決定先把手上的工具用熟再說' },
	] },
	{ lines: [
		{ speaker: 0, text: '你 PR 那個命名好有趣' },
		{ speaker: 1, text: '哪個？我不記得了' },
		{ speaker: 0, text: 'fixThisStupidBug，你忘了改回來' },
		{ speaker: 1, text: '啊...快幫我別跟老闆說' },
		{ speaker: 0, text: '放心，我幫你 approve 了' },
	] },
	{ lines: [
		{ speaker: 1, text: '我家貓昨天又把鍵盤踩了一排' },
		{ speaker: 0, text: '打出什麼了？哈哈' },
		{ speaker: 1, text: 'asdfghjkl，差點 commit 上去' },
		{ speaker: 0, text: '不會吧，有 push 嗎' },
		{ speaker: 1, text: '還好及時發現了' },
	] },
	{ lines: [
		{ speaker: 0, text: '你 git 都用 GUI 還是 CLI？' },
		{ speaker: 1, text: '看情況，merge conflict 用 GUI 比較好看' },
		{ speaker: 0, text: '我都用 CLI，覺得比較快' },
		{ speaker: 1, text: '各有好處啦' },
	] },
	{ lines: [
		{ speaker: 1, text: 'TypeScript 的 type 和 interface 你都用哪個？' },
		{ speaker: 0, text: '看情況，簡單的用 type' },
		{ speaker: 1, text: '我團隊規定全部用 interface' },
		{ speaker: 0, text: '有統一就好，最怕混著用' },
	] },
	{ lines: [
		{ speaker: 0, text: '今天 build 也太慢了吧' },
		{ speaker: 1, text: '你用 Vite 了嗎？快很多' },
		{ speaker: 0, text: '還在用 Webpack，不敢換' },
		{ speaker: 1, text: '換了就回不去了，認真的' },
	] },
	{ lines: [
		{ speaker: 1, text: '你有寫單元測試的習慣嗎？' },
		{ speaker: 0, text: '重要的邏輯會寫' },
		{ speaker: 1, text: '我最近在練 TDD，覺得很有趣' },
		{ speaker: 0, text: '感覺要花比較多時間' },
		{ speaker: 1, text: '一開始比較慢，後面 debug 時間省回來' },
	] },
	{ lines: [
		{ speaker: 0, text: 'Node.js 又出新版了' },
		{ speaker: 1, text: '幾版？我還在用 18' },
		{ speaker: 0, text: '22 了，你也升級太慢了吧' },
		{ speaker: 1, text: '能跑就好，穩定最重要' },
	] },
	{ lines: [
		{ speaker: 1, text: 'CSS 真的好難...' },
		{ speaker: 0, text: '哪個部分？' },
		{ speaker: 1, text: '置中，為什麼這麼多方法' },
		{ speaker: 0, text: 'flexbox 一行搞定啊' },
		{ speaker: 1, text: '我知道，但舊專案不支援啊' },
	] },
	{ lines: [
		{ speaker: 0, text: '你有遇過 npm install 跑超久嗎？' },
		{ speaker: 1, text: '有，上次等了十分鐘' },
		{ speaker: 0, text: '你可以試 pnpm，快很多' },
		{ speaker: 1, text: '一直想換，怕有相容性問題' },
	] },
	{ lines: [
		{ speaker: 1, text: '剛剛不小心 drop table 了...' },
		{ speaker: 0, text: '開發環境吧？拜託說是' },
		{ speaker: 1, text: '當然是開發環境！嚇死我自己' },
		{ speaker: 0, text: '你該設定 production 的存取權限了' },
	] },
	{ lines: [
		{ speaker: 0, text: 'Docker 容器又 OOM 了' },
		{ speaker: 1, text: '給多少記憶體？' },
		{ speaker: 0, text: '512MB，好像不太夠' },
		{ speaker: 1, text: '先開到 1G 看看吧' },
	] },
	{ lines: [
		{ speaker: 1, text: '你覺得 AI 會取代工程師嗎？' },
		{ speaker: 0, text: '短期不會，但會改變工作方式' },
		{ speaker: 1, text: '我現在寫 code 效率提升不少' },
		{ speaker: 0, text: '對啊，但還是需要人來思考架構' },
	] },
	{ lines: [
		{ speaker: 0, text: '你部署用什麼？' },
		{ speaker: 1, text: 'Vercel，前端超方便' },
		{ speaker: 0, text: '後端呢？' },
		{ speaker: 1, text: '看專案，小的用 Railway，大的用 AWS' },
	] },
	{ lines: [
		{ speaker: 1, text: '你怎麼處理 API 的版本控制？' },
		{ speaker: 0, text: 'URL 上加 /v1 /v2 這樣' },
		{ speaker: 1, text: '有人說用 header 比較乾淨' },
		{ speaker: 0, text: '理論上是，但 URL 比較直覺' },
	] },
	{ lines: [
		{ speaker: 0, text: 'Dark mode 難做嗎？' },
		{ speaker: 1, text: '用 CSS 變數的話還好' },
		{ speaker: 0, text: '最麻煩的是圖片要出兩套' },
		{ speaker: 1, text: '對，logo 那些的白底黑底要分開' },
	] },
	{ lines: [
		{ speaker: 1, text: '你密碼都怎麼管？' },
		{ speaker: 0, text: '用密碼管理器啊' },
		{ speaker: 1, text: '我之前都用同一組...' },
		{ speaker: 0, text: '拜託，趕快換掉！' },
	] },
	{ lines: [
		{ speaker: 0, text: '今天 CI 跑了半小時才過' },
		{ speaker: 1, text: '哪個步驟卡最久？' },
		{ speaker: 0, text: 'E2E 測試，每次都超慢' },
		{ speaker: 1, text: '可以考慮平行跑，會快很多' },
	] },
	{ lines: [
		{ speaker: 1, text: '你的 .env 有加進 .gitignore 嗎？' },
		{ speaker: 0, text: '當然有啊，這是基本的' },
		{ speaker: 1, text: '我新人的時候不小心推上去過' },
		{ speaker: 0, text: '那你快把 API key 換掉了吧？' },
		{ speaker: 1, text: '當下就換了，嚇出一身冷汗' },
	] },
	{ lines: [
		{ speaker: 0, text: 'monorepo 你有經驗嗎？' },
		{ speaker: 1, text: '有用過 turborepo，滿好用的' },
		{ speaker: 0, text: '比 nx 怎樣？' },
		{ speaker: 1, text: '設定簡單很多，小專案推薦' },
	] },
	{ lines: [
		{ speaker: 1, text: '你有用 Copilot 嗎？' },
		{ speaker: 0, text: '有，但有時候建議的東西很瞎' },
		{ speaker: 1, text: '哈哈對，要自己判斷' },
		{ speaker: 0, text: '寫測試的時候還滿好用的' },
	] },
	// ── 寵物 ──
	{ lines: [
		{ speaker: 0, text: '你家的貓叫什麼名字？' },
		{ speaker: 1, text: '叫 Bug，因為到處搗蛋' },
		{ speaker: 0, text: '太適合了吧，工程師養的貓' },
		{ speaker: 1, text: '牠昨天又咬了我的充電線' },
	] },
	{ lines: [
		{ speaker: 1, text: '你有看到我傳的貓咪照片嗎？' },
		{ speaker: 0, text: '看到了！在你鍵盤上睡覺那張' },
		{ speaker: 1, text: '對，我沒辦法工作了整整一小時' },
		{ speaker: 0, text: '這就是有貓的代價' },
	] },
	{ lines: [
		{ speaker: 0, text: '你有在養什麼寵物嗎？' },
		{ speaker: 1, text: '養了一隻柴犬' },
		{ speaker: 0, text: '柴犬好可愛！會不會很皮？' },
		{ speaker: 1, text: '超皮的，每天拆家' },
		{ speaker: 0, text: '但看到牠笑就什麼都忘了吧' },
	] },
	// ── 健康 & 運動 ──
	{ lines: [
		{ speaker: 1, text: '你最近有在跑步嗎？' },
		{ speaker: 0, text: '有，週末去河濱跑了 5K' },
		{ speaker: 1, text: '速度怎樣？' },
		{ speaker: 0, text: '30 分鐘左右，很慢' },
		{ speaker: 1, text: '有跑就很棒了' },
	] },
	{ lines: [
		{ speaker: 0, text: '肩膀好痠喔' },
		{ speaker: 1, text: '你有在做伸展嗎？' },
		{ speaker: 0, text: '每次想到的時候都忘了' },
		{ speaker: 1, text: '設個每小時的提醒吧' },
	] },
	{ lines: [
		{ speaker: 1, text: '你有試過站立式辦公桌嗎？' },
		{ speaker: 0, text: '用了一個月，覺得不錯' },
		{ speaker: 1, text: '腳不會痠嗎？' },
		{ speaker: 0, text: '會，所以我放了一個腳踏墊' },
	] },
	{ lines: [
		{ speaker: 0, text: '你戴藍光眼鏡嗎？' },
		{ speaker: 1, text: '有戴，不知道有沒有用' },
		{ speaker: 0, text: '心理作用也是作用' },
		{ speaker: 1, text: '至少眼睛沒那麼容易累' },
	] },
	// ── 學習 & 成長 ──
	{ lines: [
		{ speaker: 1, text: '你最近在學什麼新技術？' },
		{ speaker: 0, text: '在學 Rust，好難但好有趣' },
		{ speaker: 1, text: '聽說學習曲線很陡' },
		{ speaker: 0, text: '所有權系統一開始真的很卡' },
		{ speaker: 1, text: '加油！學會了就很強' },
	] },
	{ lines: [
		{ speaker: 0, text: '你有在看技術書嗎？' },
		{ speaker: 1, text: '在看 Clean Architecture' },
		{ speaker: 0, text: '怎麼樣？推薦嗎？' },
		{ speaker: 1, text: '觀念很好，但範例有點舊' },
	] },
	{ lines: [
		{ speaker: 1, text: '你英文怎麼練的？' },
		{ speaker: 0, text: '看技術文件算嗎？' },
		{ speaker: 1, text: '哈哈，那我也算天天在練' },
		{ speaker: 0, text: 'Stack Overflow 看多了就會了' },
	] },
	{ lines: [
		{ speaker: 0, text: '你有去參加什麼技術社群嗎？' },
		{ speaker: 1, text: '有去過 React Taipei' },
		{ speaker: 0, text: '感覺怎樣？' },
		{ speaker: 1, text: '不錯欸，認識了幾個厲害的人' },
	] },
	{ lines: [
		{ speaker: 1, text: '你有想過轉管理職嗎？' },
		{ speaker: 0, text: '有想過，但我比較喜歡寫 code' },
		{ speaker: 1, text: '也是，管理很多會議' },
		{ speaker: 0, text: '光用想的就累了' },
	] },
	// ── 科技新聞 ──
	{ lines: [
		{ speaker: 0, text: '你看到 Apple 那個新產品了嗎？' },
		{ speaker: 1, text: '看了，但價格也太貴' },
		{ speaker: 0, text: '一個腎不夠了' },
		{ speaker: 1, text: '兩個腎也不太夠吧' },
	] },
	{ lines: [
		{ speaker: 1, text: 'OpenAI 又出新模型了' },
		{ speaker: 0, text: '感覺每個月都在出新的' },
		{ speaker: 1, text: '追不上了啦' },
		{ speaker: 0, text: '用得到的學就好' },
	] },
	{ lines: [
		{ speaker: 0, text: '你有在用什麼 AI 工具嗎？' },
		{ speaker: 1, text: '寫 code 的時候會用' },
		{ speaker: 0, text: '效率有提升嗎？' },
		{ speaker: 1, text: '某些重複性的工作快很多' },
		{ speaker: 0, text: '是不是覺得自己變懶了' },
		{ speaker: 1, text: '哈哈，有一點' },
	] },
	// ── 通勤 ──
	{ lines: [
		{ speaker: 1, text: '你通勤要多久？' },
		{ speaker: 0, text: '搭捷運大概四十分鐘' },
		{ speaker: 1, text: '還好，我要一小時' },
		{ speaker: 0, text: '那你可以考慮在車上學東西' },
		{ speaker: 1, text: '我都在補眠...' },
	] },
	{ lines: [
		{ speaker: 0, text: '今天捷運好擠喔' },
		{ speaker: 1, text: '早上八點那班一定的' },
		{ speaker: 0, text: '我以後想提早一點出門' },
		{ speaker: 1, text: '七點半就好很多了' },
	] },
	{ lines: [
		{ speaker: 1, text: '你騎車上班嗎？' },
		{ speaker: 0, text: '對啊，騎 YouBike' },
		{ speaker: 1, text: '下雨天怎麼辦？' },
		{ speaker: 0, text: '就...淋雨騎啊' },
		{ speaker: 1, text: '真猛' },
	] },
	// ── 居家 & 生活品質 ──
	{ lines: [
		{ speaker: 0, text: '你有在用空氣清淨機嗎？' },
		{ speaker: 1, text: '有，冬天空氣差的時候必備' },
		{ speaker: 0, text: '推薦哪牌？' },
		{ speaker: 1, text: '我用小米的，CP 值高' },
	] },
	{ lines: [
		{ speaker: 1, text: '你有在煮飯嗎？' },
		{ speaker: 0, text: '偶爾，週末會做比較認真的' },
		{ speaker: 1, text: '拿手菜是什麼？' },
		{ speaker: 0, text: '番茄炒蛋，百煮百成功' },
		{ speaker: 1, text: '經典中的經典' },
	] },
	{ lines: [
		{ speaker: 0, text: '你有訂閱什麼電子報嗎？' },
		{ speaker: 1, text: '有一個叫 JavaScript Weekly' },
		{ speaker: 0, text: '會認真看嗎？' },
		{ speaker: 1, text: '大概掃一下標題，有興趣才點' },
	] },
	{ lines: [
		{ speaker: 1, text: '你家 Wi-Fi 夠快嗎？' },
		{ speaker: 0, text: '還行，偶爾視訊會卡' },
		{ speaker: 1, text: '我最近換了 mesh 路由器' },
		{ speaker: 0, text: '差很多嗎？' },
		{ speaker: 1, text: '死角都收得到了，超推' },
	] },
	// ── 假日 & 放鬆 ──
	{ lines: [
		{ speaker: 0, text: '連假你要幹嘛？' },
		{ speaker: 1, text: '在家耍廢，哪都不想去' },
		{ speaker: 0, text: '羨慕，我被家人抓去聚餐' },
		{ speaker: 1, text: '加油，social 也是很累的' },
	] },
	{ lines: [
		{ speaker: 1, text: '你有在看漫畫嗎？' },
		{ speaker: 0, text: '有，最近在追咒術迴戰' },
		{ speaker: 1, text: '進度到哪了？' },
		{ speaker: 0, text: '別說！我還沒看到最新的' },
		{ speaker: 1, text: '好好好，我不爆雷' },
	] },
	{ lines: [
		{ speaker: 0, text: '你有在泡咖啡嗎？' },
		{ speaker: 1, text: '剛入坑手沖' },
		{ speaker: 0, text: '哇，有推薦的豆子嗎？' },
		{ speaker: 1, text: '衣索比亞的果香很讚，你可以試試' },
	] },
	{ lines: [
		{ speaker: 1, text: '你放假都幾點起床？' },
		{ speaker: 0, text: '自然醒，通常十點' },
		{ speaker: 1, text: '我也是，然後就覺得假日好短' },
		{ speaker: 0, text: '半天就沒了的感覺' },
	] },
	// ── 辦公室趣事 ──
	{ lines: [
		{ speaker: 0, text: '你有看到茶水間的公告嗎？' },
		{ speaker: 1, text: '哪個？' },
		{ speaker: 0, text: '說有人一直偷吃冰箱的布丁' },
		{ speaker: 1, text: '哈哈哈，布丁小偷' },
		{ speaker: 0, text: '聽說已經第三次了' },
	] },
	{ lines: [
		{ speaker: 1, text: '昨天開會的時候你有在聽嗎？' },
		{ speaker: 0, text: '有啊...大部分啦' },
		{ speaker: 1, text: '我看到你在偷滑手機' },
		{ speaker: 0, text: '被抓到了，那個會真的太長了' },
	] },
	{ lines: [
		{ speaker: 0, text: '新來的那個同事好安靜' },
		{ speaker: 1, text: '可能還在適應吧' },
		{ speaker: 0, text: '要不要約他中午一起吃飯？' },
		{ speaker: 1, text: '好主意，我去問問' },
	] },
	{ lines: [
		{ speaker: 1, text: '你投影片做好了嗎？明天要報告' },
		{ speaker: 0, text: '還沒...今天趕一下' },
		{ speaker: 1, text: '加油，不要太多字就好' },
		{ speaker: 0, text: '我做投影片最大的問題就是字太多' },
	] },
	{ lines: [
		{ speaker: 0, text: '你剛剛是不是打了一個超大的呵欠' },
		{ speaker: 1, text: '你也看到了？太丟臉了' },
		{ speaker: 0, text: '被老闆看到就好笑了' },
		{ speaker: 1, text: '還好他在開會' },
	] },
	{ lines: [
		{ speaker: 1, text: '你午休都在幹嘛？' },
		{ speaker: 0, text: '趴著睡十五分鐘' },
		{ speaker: 1, text: '我都在看 YouTube' },
		{ speaker: 0, text: '難怪你下午精神不好' },
		{ speaker: 1, text: '確實...' },
	] },
	// ── 購物 & 消費 ──
	{ lines: [
		{ speaker: 0, text: '雙十一你有買什麼嗎？' },
		{ speaker: 1, text: '買了一堆不需要的東西' },
		{ speaker: 0, text: '同類人，我也是' },
		{ speaker: 1, text: '特價的時候智商就歸零' },
	] },
	{ lines: [
		{ speaker: 1, text: '你有推薦的藍牙耳機嗎？' },
		{ speaker: 0, text: '看預算，AirPods 不錯' },
		{ speaker: 1, text: '有便宜一點的嗎？' },
		{ speaker: 0, text: 'Sony 的 C700N CP 值很高' },
	] },
	// ── 職場 ──
	{ lines: [
		{ speaker: 0, text: '你寫 code 的時候會取什麼變數名？' },
		{ speaker: 1, text: '認真的時候取好名字，趕的時候就 temp' },
		{ speaker: 0, text: '我看過有人用 asdf 當變數名' },
		{ speaker: 1, text: '那個人不會是你吧？' },
		{ speaker: 0, text: '...我不回答這個問題' },
	] },
	{ lines: [
		{ speaker: 1, text: '面試的時候你都問什麼？' },
		{ speaker: 0, text: '問他們最近解決的有趣問題' },
		{ speaker: 1, text: '這個好，可以看出思考方式' },
		{ speaker: 0, text: '比考演算法有用多了' },
	] },
	{ lines: [
		{ speaker: 0, text: '你比較喜歡遠端還是進辦公室？' },
		{ speaker: 1, text: '混合的最好，各半' },
		{ speaker: 0, text: '在家效率高但容易分心' },
		{ speaker: 1, text: '對，冰箱是最大的敵人' },
	] },
	{ lines: [
		{ speaker: 1, text: '今天 standup 你要報什麼？' },
		{ speaker: 0, text: '昨天 review PR 加修一個小 bug' },
		{ speaker: 1, text: '那個 bug 修好了？' },
		{ speaker: 0, text: '修了，但發現另一個 bug' },
		{ speaker: 1, text: '永遠修不完的感覺' },
	] },

	// ── 小心主管 & 辦公室生存 (2人) ──
	{ lines: [
		{ speaker: 0, text: '噓...主管今天心情好像不太好' },
		{ speaker: 1, text: '真的嗎？我剛才還想去問他事情' },
		{ speaker: 0, text: '我看他早上開完會臉就很臭' },
		{ speaker: 1, text: '那我下午再去好了...' },
		{ speaker: 0, text: '聰明，保命要緊' },
	] },
	{ lines: [
		{ speaker: 1, text: '你有沒有發現主管最近走路都沒聲音' },
		{ speaker: 0, text: '對！上次突然出現在我後面，嚇死我' },
		{ speaker: 1, text: '我那時正好在看 YouTube...' },
		{ speaker: 0, text: '完蛋，他有看到嗎？' },
		{ speaker: 1, text: '應該沒有吧...我秒切回 VS Code' },
		{ speaker: 0, text: '你可以裝一個後照鏡在螢幕上' },
	] },
	{ lines: [
		{ speaker: 0, text: '昨天主管突然說要 one-on-one' },
		{ speaker: 1, text: '天哪，你做了什麼嗎？' },
		{ speaker: 0, text: '我想了一整晚到底哪裡出錯' },
		{ speaker: 1, text: '結果呢？' },
		{ speaker: 0, text: '結果只是問我專案進度...' },
		{ speaker: 1, text: '哈哈哈，你也太緊張了' },
	] },
	{ lines: [
		{ speaker: 1, text: '等一下主管要來巡了嗎？' },
		{ speaker: 0, text: '不知道，但先把 terminal 切回來比較安全' },
		{ speaker: 1, text: '我發現只要 terminal 開著，看起來就很忙' },
		{ speaker: 0, text: '經典的看起來在工作技巧' },
		{ speaker: 1, text: '專業的都開兩個螢幕，一個是保險用的' },
	] },
	{ lines: [
		{ speaker: 0, text: '主管剛剛是不是看了我們這邊？' },
		{ speaker: 1, text: '沒有吧，你太敏感了' },
		{ speaker: 0, text: '被盯習慣了，都有創傷反應了' },
		{ speaker: 1, text: '上一家公司是魔鬼主管嗎？' },
		{ speaker: 0, text: '別提了，動不動就站在背後看' },
	] },
	{ lines: [
		{ speaker: 1, text: '你知道主管今天幾點來的嗎？' },
		{ speaker: 0, text: '八點就來了，我進來的時候嚇一跳' },
		{ speaker: 1, text: '該不會又要趕什麼 deadline' },
		{ speaker: 0, text: '拜託不要...上禮拜才加完班' },
		{ speaker: 1, text: '你看他一直在打電話，感覺不妙' },
	] },
	{ lines: [
		{ speaker: 0, text: '你有沒有被主管問過在幹嘛？' },
		{ speaker: 1, text: '有啊，有一次我在研究技術他以為我在摸魚' },
		{ speaker: 0, text: '看技術文章跟看新聞長得一樣嘛' },
		{ speaker: 1, text: '後來我都把瀏覽器放在第二個螢幕' },
		{ speaker: 0, text: '生存智慧' },
	] },
	{ lines: [
		{ speaker: 1, text: '主管昨天發的那封信你看了嗎？' },
		{ speaker: 0, text: '看了，又是效率提升計畫' },
		{ speaker: 1, text: '每季都來一次，你不覺得嗎？' },
		{ speaker: 0, text: '上次的計畫都還沒執行完呢' },
		{ speaker: 1, text: '就是做做樣子給上面看的吧' },
	] },
	{ lines: [
		{ speaker: 0, text: '聽說主管要開始看我們的 commit 紀錄' },
		{ speaker: 1, text: '什麼？！那我以後要天天 commit' },
		{ speaker: 0, text: '不用緊張啦，可能只是聽說' },
		{ speaker: 1, text: '小心駛得萬年船，先多推幾個小 PR' },
		{ speaker: 0, text: '你這求生本能也太強了' },
	] },
	{ lines: [
		{ speaker: 1, text: '我覺得主管最近對我態度怪怪的' },
		{ speaker: 0, text: '怎麼說？' },
		{ speaker: 1, text: '開會都不太看我，我問問題也只回一句' },
		{ speaker: 0, text: '可能只是他最近壓力大吧' },
		{ speaker: 1, text: '希望是...不然我要開始更新履歷了' },
		{ speaker: 0, text: '先別想太多，看看過幾天會不會好' },
	] },
	{ lines: [
		{ speaker: 0, text: '主管剛丟了一個急件給我' },
		{ speaker: 1, text: '又來了，每次都很急' },
		{ speaker: 0, text: '他說今天下班前要' },
		{ speaker: 1, text: '那你手上那個 feature 呢？' },
		{ speaker: 0, text: '他說那個可以先放...就很矛盾' },
		{ speaker: 1, text: '優先順序每天都在變的日常' },
	] },
	{ lines: [
		{ speaker: 1, text: '你發現了嗎？主管中午都不在位子上' },
		{ speaker: 0, text: '對欸，他都去哪？' },
		{ speaker: 1, text: '聽說去跟其他部門吃飯套關係' },
		{ speaker: 0, text: '上面的人都這樣的吧' },
		{ speaker: 1, text: '至少他不在我們比較自在' },
	] },

	// ── 小心主管 & 辦公室生存 (3人) ──
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '欸，小聲一點，主管坐那邊' },
		{ speaker: 1, text: '他戴耳機了啦，聽不到' },
		{ speaker: 2, text: '你確定？上次我也這麼想結果被聽到' },
		{ speaker: 0, text: '好吧，那講小聲一點' },
		{ speaker: 1, text: '其實我就想問，下禮拜那個 deadline 是認真的嗎？' },
		{ speaker: 2, text: '我看根本來不及吧' },
		{ speaker: 0, text: '大家都這麼覺得但沒人敢講' },
		{ speaker: 1, text: '那誰要去跟主管說？' },
		{ speaker: 2, text: '...你們看我幹嘛' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '主管剛剛走了，終於可以放鬆' },
		{ speaker: 1, text: '他今天怎麼這麼早走？' },
		{ speaker: 2, text: '好像說有外部會議' },
		{ speaker: 0, text: '太棒了，大家可以正常呼吸了' },
		{ speaker: 1, text: '有人要一起叫下午茶嗎？' },
		{ speaker: 2, text: '我加一！趁主管不在喝杯飲料' },
		{ speaker: 0, text: '我也要，幫我點一杯珍奶' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 1, text: '你們有沒有覺得最近會議變好多' },
		{ speaker: 0, text: '超多的，每天至少三個' },
		{ speaker: 2, text: '主管很愛開會，然後會後又問為什麼進度慢' },
		{ speaker: 1, text: '因為時間都在開會啊！' },
		{ speaker: 0, text: '有一次我算了一下，一天只剩兩小時寫 code' },
		{ speaker: 2, text: '經典的用會議追蹤為什麼沒時間做事' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 2, text: '小心，主管等等要來 demo 給客戶看' },
		{ speaker: 0, text: '什麼？！哪個部分？' },
		{ speaker: 2, text: '就你負責的那個報表' },
		{ speaker: 0, text: '那個還有 bug 欸...' },
		{ speaker: 1, text: '趕快修啊！他幾點 demo？' },
		{ speaker: 0, text: '兩點' },
		{ speaker: 1, text: '還有一小時，衝啊！' },
		{ speaker: 2, text: '需要幫忙嗎？我手上剛好做完' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '你們看到主管轉發的那篇文章了嗎？' },
		{ speaker: 1, text: '哪篇？又是工程師要有狼性那種？' },
		{ speaker: 2, text: '不是，這次是關於 996 是福報' },
		{ speaker: 0, text: '他不會是在暗示我們吧...' },
		{ speaker: 1, text: '別想太多，他可能只是隨手轉的' },
		{ speaker: 2, text: '但我還是默默按了讚，保險一下' },
		{ speaker: 0, text: '你太會了' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 1, text: '我剛差點在群組裡發錯訊息' },
		{ speaker: 0, text: '發什麼？' },
		{ speaker: 1, text: '本來要跟朋友抱怨工作，差點發到公司群' },
		{ speaker: 2, text: '天哪，那你社會性死亡了' },
		{ speaker: 1, text: '還好手快收回來了' },
		{ speaker: 0, text: '收回訊息會不會反而更可疑...' },
		{ speaker: 2, text: '以後在不同 app 聊比較安全' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 2, text: '你們有沒有發現主管最愛在五點半交辦事情' },
		{ speaker: 0, text: '真的！每次快下班就丟東西' },
		{ speaker: 1, text: '而且都說「不急」但明天一早就問你' },
		{ speaker: 2, text: '上次他五點二十說不急，隔天九點就來催' },
		{ speaker: 0, text: '所以現在五點我就開始緊張' },
		{ speaker: 1, text: '創傷後壓力症候群' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '年底考核快到了，你們有在準備嗎？' },
		{ speaker: 1, text: '準備什麼？不就是看主管心情？' },
		{ speaker: 2, text: '至少把自己做的東西整理一下吧' },
		{ speaker: 0, text: '對，不然到時候想不起來做了什麼' },
		{ speaker: 1, text: '我每天都有在記工作日誌了' },
		{ speaker: 2, text: '你好認真，我都忘了自己寫了什麼' },
		{ speaker: 0, text: '去翻 git log 就知道了吧' },
	] },

	// ── 多人閒聊 (3人) ──
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '等等中午要吃什麼？' },
		{ speaker: 1, text: '我想吃那家牛肉麵' },
		{ speaker: 2, text: '太遠了吧，要走十五分鐘' },
		{ speaker: 0, text: '叫外送啊' },
		{ speaker: 1, text: '好主意，你們要不要一起點？' },
		{ speaker: 2, text: '好啊，湊一下免運費' },
		{ speaker: 0, text: '那我開群組，大家報餐' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 2, text: '欸你們週末有想去哪嗎？' },
		{ speaker: 0, text: '我想去那個新開的市集' },
		{ speaker: 1, text: '在哪裡？' },
		{ speaker: 0, text: '華山那邊，聽說很多手作的' },
		{ speaker: 2, text: '好欸，要不要約一團？' },
		{ speaker: 1, text: '好啊，下午去的話可以順便吃晚餐' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '有人要團購嗎？我看到芒果很便宜' },
		{ speaker: 1, text: '多便宜？' },
		{ speaker: 0, text: '一箱十斤才 500' },
		{ speaker: 2, text: '我要！幫我訂兩箱' },
		{ speaker: 1, text: '我也要一箱' },
		{ speaker: 0, text: '那我們三箱湊一團免運了' },
		{ speaker: 2, text: '太棒了，這就是辦公室的好處' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 1, text: '你們有在追什麼 YouTube 頻道嗎？' },
		{ speaker: 0, text: '我最近在看一個做木工的' },
		{ speaker: 2, text: '木工？你也想做嗎？' },
		{ speaker: 0, text: '看看而已，看別人做很療癒' },
		{ speaker: 1, text: '我都看吃播，然後就餓了' },
		{ speaker: 2, text: '我都看科技評測，看完就想買' },
		{ speaker: 0, text: '每個人的陷阱不一樣' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '你們昨天地震有感嗎？' },
		{ speaker: 1, text: '搖好大，我家東西都掉了' },
		{ speaker: 2, text: '我在打遊戲完全沒感覺' },
		{ speaker: 0, text: '你是不是每次地震都沒感覺' },
		{ speaker: 2, text: '因為我專注力太強了' },
		{ speaker: 1, text: '是太遲鈍了吧' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 2, text: '公司尾牙你們要表演什麼？' },
		{ speaker: 0, text: '還沒想到，你們有 idea 嗎？' },
		{ speaker: 1, text: '不如唱歌？最安全' },
		{ speaker: 2, text: '唱什麼？大家音域差很多' },
		{ speaker: 0, text: '那跳舞？看 YouTube 學一支' },
		{ speaker: 1, text: '你認真的嗎...我超不會跳' },
		{ speaker: 2, text: '不如就演個短劇吧，寫段 code 的那種' },
		{ speaker: 0, text: '好像可以欸，工程師的日常' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 1, text: '明天星期五了，撐一下' },
		{ speaker: 0, text: '這禮拜好漫長' },
		{ speaker: 2, text: '真的，感覺已經過了一個月' },
		{ speaker: 1, text: '明天下班後要不要去吃燒烤？' },
		{ speaker: 0, text: '好！當作犒賞自己' },
		{ speaker: 2, text: '我也要去！好久沒聚了' },
	] },

	// ── 更多小心主管 (2人) ──
	{ lines: [
		{ speaker: 0, text: '你剛才有看到主管的表情嗎...' },
		{ speaker: 1, text: '看到了，嘴角往下那個' },
		{ speaker: 0, text: '他看完我的報告就那個表情' },
		{ speaker: 1, text: '先別慌，也許是他午餐沒吃飽' },
		{ speaker: 0, text: '你這安慰也太隨便了吧' },
	] },
	{ lines: [
		{ speaker: 1, text: '我學到一個生存技巧' },
		{ speaker: 0, text: '什麼？' },
		{ speaker: 1, text: '主管經過的時候按 Ctrl+Tab 切到 IDE' },
		{ speaker: 0, text: '我都直接練好反應速度了' },
		{ speaker: 1, text: '我們這些技能如果可以寫進履歷就好了' },
	] },
	{ lines: [
		{ speaker: 0, text: '主管今天穿得特別正式你有注意嗎？' },
		{ speaker: 1, text: '好像有穿西裝欸' },
		{ speaker: 0, text: '該不會有大老闆要來巡視吧' },
		{ speaker: 1, text: '完了，我穿拖鞋...' },
		{ speaker: 0, text: '趕快去躲在桌子下面' },
	] },
	{ lines: [
		{ speaker: 1, text: '主管剛在群組 @all 你看到了嗎？' },
		{ speaker: 0, text: '看到了，心跳停了一秒' },
		{ speaker: 1, text: '結果只是提醒大家填週報' },
		{ speaker: 0, text: '每次 @all 都以為要被開除' },
		{ speaker: 1, text: '職場 PTSD 確診' },
	] },
	{ lines: [
		{ speaker: 0, text: '聽說隔壁組的主管更恐怖' },
		{ speaker: 1, text: '怎麼說？' },
		{ speaker: 0, text: '每天盯著每個人的 online 時間' },
		{ speaker: 1, text: '這麼誇張？' },
		{ speaker: 0, text: '突然覺得我們主管其實還不錯' },
		{ speaker: 1, text: '比下有餘是這樣用的嗎？' },
	] },
	{ lines: [
		{ speaker: 1, text: '你下午有空嗎？主管說要跟我們開個小會' },
		{ speaker: 0, text: '又開會？上午不是剛開過嗎' },
		{ speaker: 1, text: '他說有「重要的事」要討論' },
		{ speaker: 0, text: '每次說重要的事我就很緊張' },
		{ speaker: 1, text: '上次說重要的事結果是選尾牙餐廳' },
		{ speaker: 0, text: '好吧那還好' },
	] },

	// ── 下午茶團購 (3人) ──
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '有人要訂下午茶嗎？我看到一家新的' },
		{ speaker: 1, text: '要！我也要！什麼店？' },
		{ speaker: 2, text: '算我一份！' },
		{ speaker: 0, text: '一家手搖飲，鮮奶茶超好喝的樣子' },
		{ speaker: 1, text: '我要大杯珍珠鮮奶茶，微糖少冰' },
		{ speaker: 2, text: '我要烏龍拿鐵，正常糖去冰' },
		{ speaker: 0, text: '好，我自己要芒果冰沙，那我來統計' },
		{ speaker: 1, text: '有滿額免運嗎？' },
		{ speaker: 0, text: '滿 500 免運，我們三杯應該夠' },
		{ speaker: 2, text: '太棒了，下午就靠這杯了' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 1, text: '欸欸欸，那家雞蛋糕有在外送了！' },
		{ speaker: 0, text: '真的嗎？！我上次排了半小時' },
		{ speaker: 2, text: '我也要加入！他們的起司口味超讚' },
		{ speaker: 1, text: '好，我開單，你們要幾份？' },
		{ speaker: 0, text: '我要一份原味一份巧克力' },
		{ speaker: 2, text: '我要兩份起司！' },
		{ speaker: 1, text: '你也太誇張，兩份' },
		{ speaker: 2, text: '一份根本不夠啊' },
		{ speaker: 0, text: '確實，那我也加一份起司好了' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 2, text: '三點了，下午茶時間！' },
		{ speaker: 0, text: '每次三點你就出現' },
		{ speaker: 1, text: '我也準時報到，今天喝什麼？' },
		{ speaker: 2, text: '我查到一家紅茶專賣店，評價超高' },
		{ speaker: 0, text: '那我要阿薩姆鮮奶茶' },
		{ speaker: 1, text: '我要伯爵奶茶加珍珠' },
		{ speaker: 2, text: '好，我要錫蘭紅茶，我來下單！' },
		{ speaker: 0, text: '順便問其他人要不要加？' },
		{ speaker: 1, text: '對，湊多一點比較划算' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '我發現一個甜點外送，舒芙蕾鬆餅！' },
		{ speaker: 1, text: '天哪，我最愛舒芙蕾了！加我！' },
		{ speaker: 2, text: '這種東西外送不會塌嗎？' },
		{ speaker: 0, text: '評論說包裝做得很好，不會塌' },
		{ speaker: 2, text: '那好吧，我也要一份，草莓口味' },
		{ speaker: 1, text: '我要抹茶的！' },
		{ speaker: 0, text: '我選提拉米蘇口味，三份剛好免運' },
		{ speaker: 2, text: '完美，今天下午要幸福了' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 1, text: '剛剛經過樓下那家麵包店好香' },
		{ speaker: 0, text: '他們三點出爐的可頌超好吃' },
		{ speaker: 2, text: '等等去買嗎？幫我帶一個！' },
		{ speaker: 1, text: '我也要！原味可頌加一個巧克力的' },
		{ speaker: 0, text: '好，那我下去一次買，你們轉帳給我' },
		{ speaker: 2, text: '讚啦，你最好了' },
		{ speaker: 1, text: '記得拿發票，我要對獎' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 2, text: '隔壁部門在團購芒果冰，要加入嗎？' },
		{ speaker: 0, text: '當然要！多少錢？' },
		{ speaker: 2, text: '一杯 85，四杯有折扣變 300' },
		{ speaker: 1, text: '那我們買四杯，多的那杯搶就對了' },
		{ speaker: 0, text: '哈哈，好啊那我也加一杯' },
		{ speaker: 2, text: '算我一杯，這樣三杯了，再找一個人' },
		{ speaker: 1, text: '我去問一下坐後面的' },
	] },

	// ── 技術長突襲：我聽到了 (需要 orchestrator) ──
	{ speakerCount: 3, roles: { 2: 'orchestrator' }, lines: [
		{ speaker: 0, text: '你覺得主管今天會不會又丟一堆需求' },
		{ speaker: 1, text: '拜託不要，上次改了三天的東西又被打回來' },
		{ speaker: 0, text: '而且每次都說很急，結果做完又不看' },
		{ speaker: 1, text: '對對對，有一次我加班到十點做完，他隔了一週才review' },
		{ speaker: 2, text: '...我都聽到了喔' },
		{ speaker: 0, text: '！！！什...什麼時候來的！' },
		{ speaker: 1, text: '對不起！！我們在開玩笑的！！' },
		{ speaker: 2, text: '沒關係，那個需求我會先 review 再給你們' },
		{ speaker: 0, text: '謝...謝謝技術長...' },
	] },
	{ speakerCount: 3, roles: { 2: 'orchestrator' }, lines: [
		{ speaker: 0, text: '我覺得這個架構設計有問題欸' },
		{ speaker: 1, text: '對啊，不知道是誰設計的，好難改' },
		{ speaker: 0, text: '聽說是很久以前定的，都沒人敢動' },
		{ speaker: 1, text: '就是那種碰了就壞的那種' },
		{ speaker: 2, text: '那個架構是我設計的' },
		{ speaker: 0, text: '啊！！技術長！！我不是那個意思！！' },
		{ speaker: 1, text: '對不起對不起！其實寫得很好！' },
		{ speaker: 2, text: '哈哈，開玩笑的。你們說的對，確實該重構了' },
		{ speaker: 0, text: '嚇死我了...' },
	] },
	{ speakerCount: 3, roles: { 2: 'orchestrator' }, lines: [
		{ speaker: 1, text: '欸你覺得主管會不會偷看我們聊天紀錄' },
		{ speaker: 0, text: '不會吧...應該沒那麼閒' },
		{ speaker: 1, text: '但他有時候提到的東西，我只在聊天室講過欸' },
		{ speaker: 0, text: '太可怕了吧，以後要不要改用紙條' },
		{ speaker: 2, text: '不用紙條，你們直接跟我說就好' },
		{ speaker: 0, text: '哇啊啊啊！！技術長你怎麼在這！' },
		{ speaker: 1, text: '對不起！！我們沒有在說壞話！！' },
		{ speaker: 2, text: '我知道，放輕鬆。有什麼意見可以直接講' },
	] },
	{ speakerCount: 3, roles: { 2: 'orchestrator' }, lines: [
		{ speaker: 0, text: '昨天那個 code review 也太嚴格了吧' },
		{ speaker: 1, text: '我也覺得，每一行都有 comment' },
		{ speaker: 0, text: '改到最後都不知道到底怎樣才對' },
		{ speaker: 1, text: '嚴格歸嚴格但有些 comment 也太吹毛求疵了' },
		{ speaker: 2, text: '那些 comment 是我寫的' },
		{ speaker: 0, text: '！！！技術長！！！' },
		{ speaker: 1, text: '天哪對不起！！其實您的建議都很好！' },
		{ speaker: 2, text: '下次如果覺得太細，可以直接跟我說' },
		{ speaker: 0, text: '好的好的，收到！（冷汗）' },
	] },
	{ speakerCount: 3, roles: { 2: 'orchestrator' }, lines: [
		{ speaker: 1, text: '你說主管是不是都不睡覺的啊' },
		{ speaker: 0, text: '我半夜兩點收到他的 commit 真的傻眼' },
		{ speaker: 1, text: '難怪白天有時候看他在放空' },
		{ speaker: 0, text: '搞不好在打瞌睡' },
		{ speaker: 2, text: '我沒有打瞌睡，只是在想架構' },
		{ speaker: 1, text: '啊！！對不起技術長！！' },
		{ speaker: 0, text: '我也對不起！！半夜那個 commit 很厲害！' },
		{ speaker: 2, text: '謝謝，但你們說得對，我不該半夜 commit' },
		{ speaker: 1, text: '不不不，您想什麼時候 commit 都可以！' },
	] },
	{ speakerCount: 3, roles: { 2: 'orchestrator' }, lines: [
		{ speaker: 0, text: '我偷偷跟你說喔，上次 demo 差點出大包' },
		{ speaker: 1, text: '什麼什麼？怎麼了？' },
		{ speaker: 0, text: '就是主管在台上 demo，結果 staging 掛了' },
		{ speaker: 1, text: '哈哈哈，然後呢？' },
		{ speaker: 0, text: '還好他臨場反應快，說「這是預期中的測試」' },
		{ speaker: 2, text: '那確實是我說的，不過下次請確保 staging 穩定' },
		{ speaker: 0, text: '！！！什麼時候...！對不起技術長！！' },
		{ speaker: 1, text: '我什麼都沒聽到！！' },
		{ speaker: 2, text: '哈哈放心，staging 的問題已經修了' },
	] },
	// ── 美食推薦 (Batch 3) ──
	{ lines: [
		{ speaker: 0, text: '欸你有吃過公司後面那家鹹酥雞嗎？' },
		{ speaker: 1, text: '哪一家？巷口那個攤車？' },
		{ speaker: 0, text: '對對對，他們的地瓜薯條超好吃' },
		{ speaker: 1, text: '我每次都只買雞排，下次要來試試' },
		{ speaker: 0, text: '記得加九層塔跟蒜頭，風味直接升級' },
	] },
	{ lines: [
		{ speaker: 1, text: '天啊我剛看到一家拉麵店評價 4.9 顆星' },
		{ speaker: 0, text: '在哪裡？這種分數很難得欸' },
		{ speaker: 1, text: '東門站附近，說是東京師傅來開的' },
		{ speaker: 0, text: '叉燒好吃嗎？拉麵我最在意叉燒' },
		{ speaker: 1, text: '評論說是炙燒叉燒，入口即化那種' },
		{ speaker: 0, text: '完了，我已經在流口水了' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '中午有人要一起叫外送嗎？' },
		{ speaker: 1, text: '好啊，看什麼？我不要吃便當了' },
		{ speaker: 2, text: '我想吃韓式拌飯，有家新的評價不錯' },
		{ speaker: 0, text: '韓式可以！他們有沒有炸雞？' },
		{ speaker: 2, text: '有有有，還有起司年糕' },
		{ speaker: 1, text: '起司年糕！我要！幫我加辣' },
		{ speaker: 0, text: '好，那我來下單，十分鐘內跟我說' },
	] },
	{ lines: [
		{ speaker: 0, text: '你有沒有那種「今天不知道吃什麼」的時候' },
		{ speaker: 1, text: '每天都有，選擇困難症末期' },
		{ speaker: 0, text: '我已經連吃三天超商了' },
		{ speaker: 1, text: '哈哈哈你也太慘，我至少會換不同超商' },
		{ speaker: 0, text: '欸這是一個好策略耶' },
	] },
	// ── 追劇/電影 ──
	{ lines: [
		{ speaker: 1, text: '欸你有在追那部台劇嗎？就律師那個' },
		{ speaker: 0, text: '有！劇情超緊湊，每集都反轉' },
		{ speaker: 1, text: '我昨天看到凌晨兩點停不下來' },
		{ speaker: 0, text: '第六集那個結尾我直接嚇到' },
		{ speaker: 1, text: '拜託不要爆雷！我才看到第五集' },
		{ speaker: 0, text: '好好好，但你看完第六集一定要跟我討論' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 2, text: '你們週末有去看那部科幻片嗎？' },
		{ speaker: 0, text: '看了！特效超猛但劇情有點薄弱' },
		{ speaker: 1, text: '我覺得還好欸，爆米花電影就是要爽啊' },
		{ speaker: 2, text: '我是為了 IMAX 去的，音效真的震撼' },
		{ speaker: 0, text: '那個太空船爆炸的場景確實很值票價' },
		{ speaker: 1, text: '下次再有大片我們再一起去' },
	] },
	{ lines: [
		{ speaker: 0, text: '最近有什麼好看的動畫可以推薦嗎？' },
		{ speaker: 1, text: '你看過《葬送的芙莉蓮》嗎？超好看' },
		{ speaker: 0, text: '聽過但一直沒開始，什麼類型的？' },
		{ speaker: 1, text: '奇幻冒險，但節奏很慢很療癒' },
		{ speaker: 0, text: '我最近剛好想看放鬆的，今晚就開追' },
	] },
	{ lines: [
		{ speaker: 1, text: '那個串流平台又漲價了你知道嗎' },
		{ speaker: 0, text: '蛤，又漲？這是第幾次了' },
		{ speaker: 1, text: '我現在同時訂三個平台，每月快要一千塊' },
		{ speaker: 0, text: '要不要跟我合買家庭方案？比較省' },
		{ speaker: 1, text: '好主意！那我們再找兩個人湊滿' },
	] },
	// ── 3C開箱/科技 ──
	{ lines: [
		{ speaker: 0, text: '我剛入手那款無線降噪耳機，世界安靜了' },
		{ speaker: 1, text: '哪一款？我也想買一副' },
		{ speaker: 0, text: '就那個日系的旗艦款，降噪超強' },
		{ speaker: 1, text: '戴著聽不到旁邊講話那種？' },
		{ speaker: 0, text: '對，我剛剛戴著完全沒聽到你叫我' },
		{ speaker: 1, text: '難怪我喊你三次你都不理我！' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 1, text: '新 iPhone 你們覺得值得換嗎？' },
		{ speaker: 0, text: '我覺得還好，跟上一代差異不大' },
		{ speaker: 2, text: '相機有升級欸，拍影片的人會有感' },
		{ speaker: 1, text: '我手機已經用三年了，電池快不行了' },
		{ speaker: 0, text: '那你就換吧，三年也夠本了' },
		{ speaker: 2, text: '不然先換電池就好，省一筆' },
		{ speaker: 1, text: '也是啦...我再想想' },
	] },
	{ lines: [
		{ speaker: 0, text: '你的機械鍵盤是什麼軸的？聲音好好聽' },
		{ speaker: 1, text: '茶軸，有段落感但不會太吵' },
		{ speaker: 0, text: '我現在用薄膜的，打起來沒什麼手感' },
		{ speaker: 1, text: '機械鍵盤打字超爽的，一用就回不去了' },
		{ speaker: 0, text: '感覺我會掉入客製化鍵盤的坑' },
		{ speaker: 1, text: '那個坑很深，我已經買了三把了' },
	] },
	// ── 寵物 ──
	{ lines: [
		{ speaker: 1, text: '我家貓咪昨天半夜三點在跑酷' },
		{ speaker: 0, text: '哈哈哈，貓咪深夜運動會嗎？' },
		{ speaker: 1, text: '對！從床頭跳到書桌再跳到衣櫃' },
		{ speaker: 0, text: '所以你今天才看起來那麼累？' },
		{ speaker: 1, text: '被吵醒三次...但看牠睡著的臉又氣不起來' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '你們有養寵物嗎？' },
		{ speaker: 1, text: '有！我家有隻柴犬，超盧的' },
		{ speaker: 2, text: '我養了兩隻貓，一橘一黑' },
		{ speaker: 0, text: '天啊好羨慕，我房東不讓養' },
		{ speaker: 1, text: '你可以先養個魚啊，房東不會管吧' },
		{ speaker: 2, text: '或者養倉鼠也不錯，不佔空間' },
		{ speaker: 0, text: '算了我還是先養好自己再說' },
	] },
	{ lines: [
		{ speaker: 0, text: '我家狗昨天學會握手了！' },
		{ speaker: 1, text: '真的嗎？教多久？' },
		{ speaker: 0, text: '大概用了一包零食的時間' },
		{ speaker: 1, text: '所以是用食物收買的' },
		{ speaker: 0, text: '這不叫收買，叫正向強化訓練' },
		{ speaker: 1, text: '好吧，用在人身上好像也成立' },
	] },
	{ lines: [
		{ speaker: 1, text: '你看過那個貓咪搬家的影片嗎？超療癒' },
		{ speaker: 0, text: '是那個自己跳進紙箱的嗎？' },
		{ speaker: 1, text: '對對對！牠把自己打包好了哈哈' },
		{ speaker: 0, text: '貓咪對箱子的執著真的很迷' },
		{ speaker: 1, text: '如果是液體就能解釋了，牠們是液體啊' },
	] },
	// ── 健身/運動 ──
	{ lines: [
		{ speaker: 0, text: '我昨天去重訓，今天手臂完全舉不起來' },
		{ speaker: 1, text: '哈哈，你是不是太久沒去了' },
		{ speaker: 0, text: '三個月...每次辦完卡都是開始偷懶的開始' },
		{ speaker: 1, text: '經典，我也有一張快過期的健身房月卡' },
		{ speaker: 0, text: '要不要約一起去？有伴比較不會偷懶' },
		{ speaker: 1, text: '好啊，但你不要當天早上臨時取消喔' },
	] },
	{ lines: [
		{ speaker: 1, text: '你有在跑步嗎？我最近想開始' },
		{ speaker: 0, text: '有啊，我都用那個 App 記錄配速' },
		{ speaker: 1, text: '一開始要跑多少比較好？' },
		{ speaker: 0, text: '先從三公里開始，不要太勉強' },
		{ speaker: 1, text: '三公里...聽起來好遠' },
		{ speaker: 0, text: '你家到捷運站來回一趟差不多就是了' },
		{ speaker: 1, text: '那我平常都在走三公里欸，好像可以' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '公司樓下新開一家健身房你們知道嗎？' },
		{ speaker: 1, text: '知道！月費好像不貴' },
		{ speaker: 2, text: '有免費體驗課可以先去試' },
		{ speaker: 0, text: '午休去練半小時剛好' },
		{ speaker: 1, text: '但練完會不會下午想睡覺' },
		{ speaker: 2, text: '運動完精神更好好嗎，是科學的' },
		{ speaker: 0, text: '那我們三個一起去報名，團報比較便宜' },
	] },
	// ── 投資理財 ──
	{ lines: [
		{ speaker: 0, text: '欸最近股市跌好多，你有受傷嗎？' },
		{ speaker: 1, text: '不要問...我的台積電成本在高點' },
		{ speaker: 0, text: '長期來看應該沒問題啦' },
		{ speaker: 1, text: '大家都這樣說，但帳面上看了就心痛' },
		{ speaker: 0, text: '那就不要看啊，刪掉 App 最省事' },
		{ speaker: 1, text: '好建議，但我做不到' },
	] },
	{ lines: [
		{ speaker: 1, text: '你有在定期定額嗎？' },
		{ speaker: 0, text: '有啊，每個月固定投 ETF' },
		{ speaker: 1, text: '會不會覺得很慢？感覺要等很久才能退休' },
		{ speaker: 0, text: '慢慢來比較快，至少比全放定存好' },
		{ speaker: 1, text: '也是，我先從小額開始好了' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 2, text: '你們有看到比特幣又破新高了嗎？' },
		{ speaker: 0, text: '有啊，但我不敢玩加密貨幣' },
		{ speaker: 1, text: '我有一點點，當作買樂透的心態' },
		{ speaker: 2, text: '我朋友去年買的翻了三倍欸' },
		{ speaker: 0, text: '你只聽到賺的，賠的不會跟你說' },
		{ speaker: 1, text: '投資有賺有賠，這句話真的是真理' },
	] },
	{ lines: [
		{ speaker: 0, text: '你的年終都怎麼分配？' },
		{ speaker: 1, text: '三成投資，三成存起來，四成犒賞自己' },
		{ speaker: 0, text: '犒賞自己最多欸' },
		{ speaker: 1, text: '不犒賞自己，那賺錢的意義是什麼' },
		{ speaker: 0, text: '你說得對，我被說服了' },
	] },
	// ── 旅遊 ──
	{ lines: [
		{ speaker: 1, text: '你下次出國想去哪裡？' },
		{ speaker: 0, text: '想去北海道，冬天看雪景吃螃蟹' },
		{ speaker: 1, text: '北海道冬天超冷的欸，零下十幾度' },
		{ speaker: 0, text: '冷的時候泡溫泉最爽了' },
		{ speaker: 1, text: '好啦你講到我心動了，揪團嗎？' },
		{ speaker: 0, text: '揪！過年前的機票比較便宜' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '我上個月去了泰國，超推！' },
		{ speaker: 1, text: '曼谷嗎？還是海島？' },
		{ speaker: 0, text: '清邁！比曼谷悠閒很多' },
		{ speaker: 2, text: '清邁我也一直想去，有什麼必去的嗎？' },
		{ speaker: 0, text: '週日夜市一定要去，便宜又好逛' },
		{ speaker: 1, text: '泰式按摩呢？有便宜嗎？' },
		{ speaker: 0, text: '超便宜！一小時台幣三百有找' },
		{ speaker: 2, text: '好，我開始查機票了' },
	] },
	{ lines: [
		{ speaker: 0, text: '你去日本都用什麼交通票券？' },
		{ speaker: 1, text: 'JR Pass 啊，搭新幹線最划算' },
		{ speaker: 0, text: '聽說漲價之後就沒那麼划算了' },
		{ speaker: 1, text: '看你怎麼排行程，跑很多城市還是划算的' },
		{ speaker: 0, text: '我每次去都只待東京，好像確實用不到' },
	] },
	{ lines: [
		{ speaker: 1, text: '你出國都自己排行程還是跟團？' },
		{ speaker: 0, text: '自由行啊，跟團太趕了' },
		{ speaker: 1, text: '但排行程好累，我上次花了整整三天在做功課' },
		{ speaker: 0, text: '現在 AI 可以幫你規劃行程欸' },
		{ speaker: 1, text: '欸對耶，我們公司就是做 AI 的，我居然忘了' },
		{ speaker: 0, text: '工程師的鞋子破最大洞' },
	] },
	// ── 程式笑話/工程師梗 ──
	{ lines: [
		{ speaker: 0, text: '我剛剛 debug 了兩小時，你猜問題是什麼' },
		{ speaker: 1, text: '少了一個分號？' },
		{ speaker: 0, text: '比那更慘，我改錯 branch 了' },
		{ speaker: 1, text: '哈哈哈哈，辛苦了' },
		{ speaker: 0, text: '最慘的是 git stash 完忘記 pop' },
		{ speaker: 1, text: '今天的你比昨天的你更堅強了' },
	] },
	{ lines: [
		{ speaker: 1, text: '你覺得寫 code 最可怕的是什麼' },
		{ speaker: 0, text: '「在我電腦上可以跑啊」' },
		{ speaker: 1, text: '超經典，還有「不要動那段 code，沒人知道為什麼它能跑」' },
		{ speaker: 0, text: '我們專案裡就有一段這種東西' },
		{ speaker: 1, text: '那段我也看過，上面還有個 TODO 寫著 2019' },
		{ speaker: 0, text: '考古遺跡，不能碰' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '你們知道 AI 現在可以寫 code 了嗎' },
		{ speaker: 1, text: '知道啊，我每天都在用' },
		{ speaker: 2, text: '等等，那我們會不會被取代' },
		{ speaker: 0, text: '不會啦，你還是要看得懂它寫的對不對' },
		{ speaker: 1, text: '對，而且 AI 生的 code 有時候超自信地寫錯' },
		{ speaker: 2, text: '就跟某些人很像嘛' },
		{ speaker: 0, text: '你在說誰？' },
		{ speaker: 2, text: '沒有沒有，我說 AI 啦' },
	] },
	{ lines: [
		{ speaker: 0, text: '我剛剛 commit message 打成「fix stuff」' },
		{ speaker: 1, text: '又來了，你上次還打過「asdf」' },
		{ speaker: 0, text: '反正又沒人看 commit history' },
		{ speaker: 1, text: '等到出 bug 要回溯的時候你就知道了' },
		{ speaker: 0, text: '到時候的我會處理，現在的我選擇快樂' },
	] },
	{ lines: [
		{ speaker: 1, text: '你怎麼命名變數的？駝峰還是底線？' },
		{ speaker: 0, text: '看語言啊，JS 用駝峰，Python 用底線' },
		{ speaker: 1, text: '那 CSS class 呢？' },
		{ speaker: 0, text: 'BEM 啊，就是那個超長的命名法' },
		{ speaker: 1, text: '寫到後來 class name 比內容還長' },
		{ speaker: 0, text: '命名是電腦科學裡最難的事，這句話不是開玩笑的' },
	] },
	// ── 天氣/季節 ──
	{ lines: [
		{ speaker: 0, text: '今天也太熱了吧，走到公司就全身汗' },
		{ speaker: 1, text: '對啊，我出門五分鐘就後悔了' },
		{ speaker: 0, text: '冷氣開到十八度都還覺得熱' },
		{ speaker: 1, text: '拜託不要，坐你旁邊的我快被冷死了' },
		{ speaker: 0, text: '好吧那開二十二度，各退一步' },
	] },
	{ lines: [
		{ speaker: 1, text: '下禮拜好像會下雨下整個禮拜' },
		{ speaker: 0, text: '真的假的？我最討厭下雨天通勤了' },
		{ speaker: 1, text: '鞋子濕掉一整天超不舒服' },
		{ speaker: 0, text: '我上次買了防水鞋，改變人生' },
		{ speaker: 1, text: '推薦一下哪個牌子？' },
		{ speaker: 0, text: '就那個日本牌子，網路上很多開箱' },
	] },
	{ lines: [
		{ speaker: 0, text: '好冷喔，今天降溫十度你有感嗎' },
		{ speaker: 1, text: '有！我早上穿短袖出門差點凍死' },
		{ speaker: 0, text: '你沒看氣象預報嗎？' },
		{ speaker: 1, text: '我都靠體感，結果體感不太準' },
		{ speaker: 0, text: '下載個天氣 App 吧，很方便' },
	] },
	// ── 辦公室日常 ──
	{ lines: [
		{ speaker: 1, text: '你的站立桌好用嗎？站著工作不會累嗎？' },
		{ speaker: 0, text: '站半小時坐半小時，交替最舒服' },
		{ speaker: 1, text: '我最近腰痛，想試試看' },
		{ speaker: 0, text: '真的有差，站著的時候注意力也比較好' },
		{ speaker: 1, text: '好，我去問公司有沒有多的可以換' },
	] },
	{ speakerCount: 3, roles: { 2: 'orchestrator' }, lines: [
		{ speaker: 0, text: '你覺得主管看不看得出來我在摸魚' },
		{ speaker: 1, text: '你剛才分頁切太明顯了吧，蝦皮頁面開很大' },
		{ speaker: 0, text: '不會吧，我切得很快啊' },
		{ speaker: 1, text: '快歸快，但你臉上的表情出賣了你' },
		{ speaker: 2, text: '什麼蝦皮頁面？讓我也看看有什麼好買的' },
		{ speaker: 0, text: '技術長！？我...我在比價工作用的設備！' },
		{ speaker: 1, text: '（假裝低頭看螢幕）' },
		{ speaker: 2, text: '哈哈，買完記得把分頁關掉' },
	] },
	{ speakerCount: 3, roles: { 2: 'orchestrator' }, lines: [
		{ speaker: 1, text: '欸你說這個系統啥時能重構啊，每次改都像拆炸彈' },
		{ speaker: 0, text: '不知道欸，感覺上面也不是很在意技術債' },
		{ speaker: 1, text: '反正不炸就不會修，每次都等出事才處理' },
		{ speaker: 0, text: '真的，感覺要燒起來才會有人重視' },
		{ speaker: 2, text: '技術債的事我一直有在追蹤，下季有排重構' },
		{ speaker: 1, text: '啊！技術長！我們...我們在討論技術改善方向！' },
		{ speaker: 0, text: '對對對，很正面的討論！' },
		{ speaker: 2, text: '你們說的沒錯，我來安排一個重構 sprint' },
	] },
	{ lines: [
		{ speaker: 0, text: '會議室又被佔了，我的會議要開始了' },
		{ speaker: 1, text: '那個會議室永遠搶不到' },
		{ speaker: 0, text: '而且裡面的人都會超時' },
		{ speaker: 1, text: '下次要不要在茶水間開會' },
		{ speaker: 0, text: '茶水間開會，邊泡咖啡邊 code review，也不錯' },
	] },
	{ lines: [
		{ speaker: 1, text: '你上班都幾點到？' },
		{ speaker: 0, text: '大概九點半，你呢？' },
		{ speaker: 1, text: '我都卡在九點五十九分打卡' },
		{ speaker: 0, text: '每天都在挑戰極限嗎' },
		{ speaker: 1, text: '準時就是一種藝術' },
		{ speaker: 0, text: '遲到也是，只是比較驚悚的那種' },
	] },
	// ── 週末計畫 ──
	{ lines: [
		{ speaker: 0, text: '這週末有什麼計畫嗎？' },
		{ speaker: 1, text: '打算在家耍廢，什麼都不做' },
		{ speaker: 0, text: '聽起來很完美，我也想' },
		{ speaker: 1, text: '但每次說要耍廢最後都會跑出去' },
		{ speaker: 0, text: '被朋友一揪就出門了對吧' },
		{ speaker: 1, text: '完全正確，已經有三個人約我了' },
	] },
	{ lines: [
		{ speaker: 1, text: '週末要不要去爬山？天氣好像不錯' },
		{ speaker: 0, text: '哪座山？我只能接受輕鬆的那種' },
		{ speaker: 1, text: '象山啊，來回一小時就夠了' },
		{ speaker: 0, text: '一小時可以，超過的話我的膝蓋會抗議' },
		{ speaker: 1, text: '而且山上拍照打卡很好看' },
		{ speaker: 0, text: '好吧，為了照片我去' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '這個週末誰要參加公司的桌遊活動？' },
		{ speaker: 1, text: '有桌遊！我要去！玩什麼？' },
		{ speaker: 2, text: '聽說有阿瓦隆跟富饒之城' },
		{ speaker: 0, text: '上次玩阿瓦隆你一直當壞人被抓到' },
		{ speaker: 1, text: '因為他演技太差了哈哈' },
		{ speaker: 2, text: '這次我一定能騙過你們' },
	] },
	// ── 咖啡/飲料 ──
	{ lines: [
		{ speaker: 0, text: '你一天喝幾杯咖啡？' },
		{ speaker: 1, text: '至少兩杯，沒喝會頭痛' },
		{ speaker: 0, text: '我最近在試著戒掉，改喝綠茶' },
		{ speaker: 1, text: '綠茶也有咖啡因啊' },
		{ speaker: 0, text: '至少量比較少嘛，慢慢減量' },
		{ speaker: 1, text: '佩服你，我大概戒不掉了' },
	] },
	{ lines: [
		{ speaker: 1, text: '你有去過那家新開的精品咖啡嗎？' },
		{ speaker: 0, text: '有！手沖很厲害，但一杯要兩百' },
		{ speaker: 1, text: '兩百...我還是喝超商咖啡就好' },
		{ speaker: 0, text: '偶爾犒賞自己一下啦' },
		{ speaker: 1, text: '好啦，下次你帶我去，我請客' },
		{ speaker: 0, text: '欸等等，是我帶你去結果你請客？' },
		{ speaker: 1, text: '感恩的心' },
	] },
	{ speakerCount: 3, roles: { 2: 'orchestrator' }, lines: [
		{ speaker: 0, text: '公司的咖啡機是不是越來越難喝了' },
		{ speaker: 1, text: '對！我覺得豆子被換了，以前明明不錯' },
		{ speaker: 0, text: '八成是為了省成本' },
		{ speaker: 1, text: '省這個真的得不償失，影響工作心情' },
		{ speaker: 2, text: '是我決定換供應商的，你們覺得真的不好喝嗎？' },
		{ speaker: 0, text: '呃...技術長...就是...風味比較特別' },
		{ speaker: 1, text: '對！很有個性的咖啡！' },
		{ speaker: 2, text: '好吧我知道了，我叫他們換回來' },
	] },
	// ── 遊戲 ──
	{ lines: [
		{ speaker: 0, text: '你有在玩那款新出的開放世界遊戲嗎？' },
		{ speaker: 1, text: '有！我已經玩了八十小時了' },
		{ speaker: 0, text: '八十小時？你哪來的時間？' },
		{ speaker: 1, text: '犧牲睡眠換來的，值得' },
		{ speaker: 0, text: '難怪你最近黑眼圈很重' },
		{ speaker: 1, text: '黑眼圈是勳章' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 1, text: '今晚有人要一起打遊戲嗎？' },
		{ speaker: 0, text: '打什麼？我可以九點上線' },
		{ speaker: 2, text: '我也要！上次三個人組隊超好玩' },
		{ speaker: 1, text: '那就九點 Discord 集合' },
		{ speaker: 0, text: '上次你一直帶路帶到怪堆裡面' },
		{ speaker: 2, text: '那叫策略性撤退，不是迷路' },
		{ speaker: 1, text: '好好好，今晚我來帶路' },
	] },
	{ lines: [
		{ speaker: 1, text: 'Switch 2 要出了你會買嗎？' },
		{ speaker: 0, text: '第一天就預購了' },
		{ speaker: 1, text: '哇，那麼衝？萬一有災情怎麼辦？' },
		{ speaker: 0, text: '任天堂的東西我無條件信任' },
		{ speaker: 1, text: '你這是信仰了吧' },
		{ speaker: 0, text: '信仰值滿滿，不接受反駁' },
	] },
	// ── 混合/綜合 ──
	{ speakerCount: 3, roles: { 2: 'orchestrator' }, lines: [
		{ speaker: 1, text: '我昨天做夢夢到在公司寫 code' },
		{ speaker: 0, text: '天啊你也太慘了吧，連睡覺都在上班' },
		{ speaker: 1, text: '最可怕的是夢裡還在 debug，而且找不到 bug' },
		{ speaker: 0, text: '聽起來跟現實沒什麼差別' },
		{ speaker: 2, text: '所以你們夢裡都在加班嗎？公司應該付加班費' },
		{ speaker: 0, text: '啊！技術長！我們只是在分享有趣的夢！' },
		{ speaker: 1, text: '對！完全不是在抱怨工作量！' },
		{ speaker: 2, text: '放心，我也常夢到 production 掛掉' },
		{ speaker: 0, text: '原來大家都一樣慘...不是，一樣認真' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '欸你們有發現茶水間多了一台氣泡水機嗎？' },
		{ speaker: 1, text: '有！我剛試了，超好喝的' },
		{ speaker: 2, text: '真的假的？我怎麼沒看到' },
		{ speaker: 0, text: '就在冰箱旁邊，銀色那台' },
		{ speaker: 2, text: '哦！我以為那是飲水機壞掉被換的' },
		{ speaker: 1, text: '你也太不關心辦公室了吧' },
		{ speaker: 0, text: '他只關心螢幕啦，難怪沒注意到' },
		{ speaker: 2, text: '被你們兩個聯合攻擊了...' },
	] },
	// ── 音樂/演唱會 (Batch 4) ──
	{ lines: [
		{ speaker: 0, text: '欸你有搶到告五人的票嗎？' },
		{ speaker: 1, text: '沒有啦，一開賣就秒殺，系統還一直轉圈' },
		{ speaker: 0, text: '我也是，重新整理了三十次結果全沒了' },
		{ speaker: 1, text: '現在黃牛價都翻三倍了，太扯' },
		{ speaker: 0, text: '算了，等下次吧，荷包也需要休息' },
	] },
	{ lines: [
		{ speaker: 1, text: '你平常工作都聽什麼音樂啊？' },
		{ speaker: 0, text: 'Lo-fi hip hop，那種咖啡廳感覺的' },
		{ speaker: 1, text: '哈哈我也是欸，YouTube 那個直播頻道？' },
		{ speaker: 0, text: '對對對，那隻貓在讀書的畫面' },
		{ speaker: 1, text: '那隻貓比我還認真，每次看到都覺得慚愧' },
		{ speaker: 0, text: '至少我們有在上班啦，牠只是裝的' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '草東沒有派對下個月有演出欸，有人要去嗎？' },
		{ speaker: 1, text: '在哪裡？Legacy 嗎？' },
		{ speaker: 2, text: '我看到了！是在大巨蛋欸，他們終於升級場地了' },
		{ speaker: 0, text: '票價好像不便宜，但值得' },
		{ speaker: 1, text: '好，我們三個一起搶，分開搶機率比較大' },
		{ speaker: 2, text: '開賣那天記得提醒我，我一定又會忘記' },
	] },
	{ lines: [
		{ speaker: 0, text: '你有在用 Spotify 還是 Apple Music？' },
		{ speaker: 1, text: 'Spotify，主要是它的推薦歌單超準' },
		{ speaker: 0, text: '真的嗎？我用 Apple Music 覺得推薦很爛' },
		{ speaker: 1, text: 'Spotify 的演算法真的不一樣，常常挖到寶' },
		{ speaker: 0, text: '那我試用看看，反正第一個月免費' },
	] },
	// ── 節日/過節 ──
	{ lines: [
		{ speaker: 1, text: '端午節你要回家嗎？' },
		{ speaker: 0, text: '要啊，我媽已經在催了，說粽子包好了等我' },
		{ speaker: 1, text: '天啊好幸福，我媽都叫我自己去買' },
		{ speaker: 0, text: '哈哈，我可以帶幾個來公司給你' },
		{ speaker: 1, text: '真的嗎！那我先預訂北部粽，拜託了' },
		{ speaker: 0, text: '欸我家是南部粽派的，不接受異議' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '跨年你們要去哪裡看煙火？' },
		{ speaker: 2, text: '我去年去了101，人多到根本動不了' },
		{ speaker: 1, text: '我都在家看直播，舒服又不用人擠人' },
		{ speaker: 0, text: '你這樣跨年也太佛系了吧' },
		{ speaker: 2, text: '今年想去象山拍照，視角比較好' },
		{ speaker: 1, text: '象山也是人山人海，要很早去卡位' },
		{ speaker: 0, text: '那我們約下午三點上去，帶零食邊吃邊等' },
	] },
	{ lines: [
		{ speaker: 0, text: '中元節公司有拜拜嗎？' },
		{ speaker: 1, text: '有啊，總務已經在準備供品了' },
		{ speaker: 0, text: '希望今年零食多一點，去年餅乾超難吃' },
		{ speaker: 1, text: '重點是拜完大家可以分，免費零食耶' },
		{ speaker: 0, text: '果然信仰的力量來自於食物' },
	] },
	{ speakerCount: 3, roles: { 2: 'orchestrator' }, lines: [
		{ speaker: 0, text: '欸過年那個尾牙表演，我們部門要演什麼？' },
		{ speaker: 1, text: '去年隔壁部門跳舞超丟臉，我不想上台' },
		{ speaker: 0, text: '對啊，而且強迫員工表演感覺很老派' },
		{ speaker: 2, text: '咳咳...尾牙表演的企劃是我提的喔' },
		{ speaker: 0, text: '啊...那個...我覺得是很棒的團隊活動！' },
		{ speaker: 1, text: '對對對！我們超期待的！已經在練了！' },
		{ speaker: 2, text: '哈哈沒關係，今年改成自願制' },
	] },
	// ── 減肥/飲食控制 ──
	{ lines: [
		{ speaker: 1, text: '我最近在168斷食，早上都不吃' },
		{ speaker: 0, text: '你不會頭暈嗎？我不吃早餐腦子就當機' },
		{ speaker: 1, text: '前三天很痛苦，現在習慣了，黑咖啡撐一下' },
		{ speaker: 0, text: '有效嗎？瘦了多少？' },
		{ speaker: 1, text: '兩週掉了兩公斤，但昨天破戒吃了雞排' },
		{ speaker: 0, text: '雞排是減肥的天敵，但也是人生的意義' },
	] },
	{ lines: [
		{ speaker: 0, text: '你怎麼今天帶便當？以前都吃外面的' },
		{ speaker: 1, text: '開始控制飲食了，外食太油太鹹' },
		{ speaker: 0, text: '自己煮不會很累嗎？每天要備餐' },
		{ speaker: 1, text: '週日一次做五天份，冰起來微波就好' },
		{ speaker: 0, text: '聽起來很厲害欸，教我！' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '蛤，又有人訂下午茶？我在減肥欸' },
		{ speaker: 1, text: '一塊蛋糕而已啦，明天再開始' },
		{ speaker: 2, text: '對啊，每次說減肥的人吃最多' },
		{ speaker: 0, text: '你們不要這樣啦，我這次是認真的！' },
		{ speaker: 1, text: '那你的那份我幫你吃？' },
		{ speaker: 0, text: '...給我留一小塊就好' },
		{ speaker: 2, text: '果然，認真維持了三秒' },
	] },
	{ lines: [
		{ speaker: 1, text: '你有試過生酮飲食嗎？' },
		{ speaker: 0, text: '試過兩個禮拜就放棄了，不能吃飯太痛苦' },
		{ speaker: 1, text: '我也覺得，台灣人不吃飯根本活不下去' },
		{ speaker: 0, text: '而且每餐都要算碳水，好麻煩' },
		{ speaker: 1, text: '還是乖乖少吃多動最實在' },
	] },
	// ── 星座/占卜 ──
	{ lines: [
		{ speaker: 0, text: '欸你什麼星座？' },
		{ speaker: 1, text: '處女座，怎樣？' },
		{ speaker: 0, text: '難怪你 code review 那麼嚴格' },
		{ speaker: 1, text: '這跟星座沒關係吧！是專業好不好' },
		{ speaker: 0, text: '好啦好啦，但你整理桌面的方式真的很處女座' },
		{ speaker: 1, text: '...你說的好像也沒錯' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 1, text: '今天唐綺陽說水逆開始了，大家小心' },
		{ speaker: 0, text: '怪不得我今天 deploy 失敗三次' },
		{ speaker: 2, text: '拜託，那是你 config 寫錯，不要怪水逆' },
		{ speaker: 1, text: '水逆期間電子產品容易出問題是真的啦' },
		{ speaker: 0, text: '那我今天不要 merge 任何東西好了' },
		{ speaker: 2, text: '你們認真的嗎...deadline 就在明天欸' },
	] },
	{ lines: [
		{ speaker: 0, text: '你有在看塔羅牌嗎？我昨天去抽了一張' },
		{ speaker: 1, text: '抽到什麼？' },
		{ speaker: 0, text: '塔，就是那個閃電打塔的' },
		{ speaker: 1, text: '那張超可怕的欸，代表突然的變動' },
		{ speaker: 0, text: '該不會是說我要被裁員吧...' },
		{ speaker: 1, text: '不要想太多啦，搞不好是驚喜也說不定' },
	] },
	{ lines: [
		{ speaker: 1, text: '我發現我們部門射手座超多的' },
		{ speaker: 0, text: '真的嗎？射手座的特色是什麼？' },
		{ speaker: 1, text: '樂觀、愛自由、講話很直接' },
		{ speaker: 0, text: '嗯...好像真的滿符合我們團隊的風格' },
		{ speaker: 1, text: '所以每次開會大家意見才那麼多' },
	] },
	// ── 搬家/租屋 ──
	{ lines: [
		{ speaker: 0, text: '我下個月要搬家了，頭好痛' },
		{ speaker: 1, text: '搬去哪？為什麼要搬？' },
		{ speaker: 0, text: '房東要漲兩千，我受不了直接換' },
		{ speaker: 1, text: '現在租屋市場是房東的天下，很無奈' },
		{ speaker: 0, text: '對啊，但這次找到一間離捷運更近的，算賺到' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 1, text: '你們租屋有遇過什麼雷嗎？' },
		{ speaker: 0, text: '我之前住的地方隔音超差，隔壁打呼都聽得到' },
		{ speaker: 2, text: '我遇過房東半夜來敲門說要檢查水管' },
		{ speaker: 1, text: '蛤？半夜？也太恐怖了吧' },
		{ speaker: 0, text: '所以簽約前一定要問清楚，最好有書面的' },
		{ speaker: 2, text: '對，還有押金退還的條件也要白紙黑字寫好' },
	] },
	{ lines: [
		{ speaker: 0, text: '搬家你都找搬家公司還是自己搬？' },
		{ speaker: 1, text: '上次自己搬，搬完腰痠了一個禮拜' },
		{ speaker: 0, text: '找搬家公司大概要多少錢啊？' },
		{ speaker: 1, text: '看東西多寡，我問過大概三千到五千' },
		{ speaker: 0, text: '算了，花錢消災，我的腰比較重要' },
		{ speaker: 1, text: '聰明，工程師的腰已經夠可憐了' },
	] },
	// ── 睡眠/熬夜 ──
	{ lines: [
		{ speaker: 1, text: '你昨天幾點睡的？眼睛好紅' },
		{ speaker: 0, text: '兩點...追劇追到忘記時間' },
		{ speaker: 1, text: '天啊，今天不會打瞌睡嗎？' },
		{ speaker: 0, text: '已經灌了兩杯咖啡，目前還撐得住' },
		{ speaker: 1, text: '你這樣遲早要爆，早睡啦拜託' },
	] },
	{ lines: [
		{ speaker: 0, text: '你睡眠品質好嗎？我最近一直失眠' },
		{ speaker: 1, text: '我有在用白噪音 app，幫助很大' },
		{ speaker: 0, text: '什麼白噪音？下雨聲那種嗎？' },
		{ speaker: 1, text: '對，還有咖啡廳背景音，或是電風扇聲' },
		{ speaker: 0, text: '電風扇聲也有人聽？' },
		{ speaker: 1, text: '超多人聽的，試試看，意外地很催眠' },
	] },
	{ speakerCount: 3, roles: { 2: 'orchestrator' }, lines: [
		{ speaker: 0, text: '我昨天又熬夜了，三點才睡' },
		{ speaker: 1, text: '我也是欸，在追那個新出的韓劇' },
		{ speaker: 0, text: '難怪我們兩個今天都像殭屍' },
		{ speaker: 2, text: '所以你們今天早上開會一直打哈欠是這個原因？' },
		{ speaker: 0, text: '啊...被發現了...' },
		{ speaker: 1, text: '我們明天一定會精神飽滿的！' },
		{ speaker: 2, text: '拜託你們早點睡，明天有客戶簡報' },
	] },
	{ lines: [
		{ speaker: 1, text: '你有午休的習慣嗎？' },
		{ speaker: 0, text: '有，趴十五分鐘下午效率差超多' },
		{ speaker: 1, text: '我每次趴下去就起不來，一睡就半小時' },
		{ speaker: 0, text: '設鬧鐘啊，十五分鐘剛好不會進深層睡眠' },
		{ speaker: 1, text: '好，明天試試看，我的下午總是很渾沌' },
	] },
	// ── 網購/開箱 ──
	{ lines: [
		{ speaker: 0, text: '欸你桌上那個包裹是什麼？又在網購？' },
		{ speaker: 1, text: '嘿嘿，新的機械鍵盤到了' },
		{ speaker: 0, text: '你上個月不是才買一把？' },
		{ speaker: 1, text: '那把是紅軸的，這把是茶軸，手感不一樣啦' },
		{ speaker: 0, text: '鍵盤坑果然是無底洞' },
		{ speaker: 1, text: '你不懂，這是投資工作效率' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 1, text: '雙十一你們買了什麼？' },
		{ speaker: 0, text: '我買了一台掃地機器人，超划算' },
		{ speaker: 2, text: '我買了一堆衣服，結果有三件尺寸不對要退貨' },
		{ speaker: 1, text: '網購衣服最怕這個，每個品牌尺寸都不一樣' },
		{ speaker: 0, text: '所以我都只買電子產品，不用量尺寸' },
		{ speaker: 2, text: '退貨流程好麻煩，以後還是去店裡試比較快' },
	] },
	{ lines: [
		{ speaker: 0, text: '你有在逛什麼好物推薦的社團嗎？' },
		{ speaker: 1, text: '有啊，PTT 的敗家版我天天看' },
		{ speaker: 0, text: '那不是越看越想買嗎？' },
		{ speaker: 1, text: '對...上個月信用卡帳單直接噴了' },
		{ speaker: 0, text: '購物節加社團推坑，荷包直接投降' },
	] },
	{ lines: [
		{ speaker: 1, text: '我昨天收到包裹，打開發現寄錯東西' },
		{ speaker: 0, text: '蛤？寄了什麼？' },
		{ speaker: 1, text: '我買的是耳機，結果收到一包貓糧' },
		{ speaker: 0, text: '哈哈哈哈，你又沒養貓' },
		{ speaker: 1, text: '客服說會重寄，那包貓糧還叫我留著' },
		{ speaker: 0, text: '那你現在有養貓的理由了' },
	] },
	// ── 學習/自我成長 ──
	{ lines: [
		{ speaker: 0, text: '你最近有在學什麼新東西嗎？' },
		{ speaker: 1, text: '在學日文，想明年去日本自助旅行' },
		{ speaker: 0, text: '用什麼學？補習班還是自學？' },
		{ speaker: 1, text: '用 Duolingo 每天刷十五分鐘，加上看日劇' },
		{ speaker: 0, text: '看日劇算學日文的話，那我也在學了' },
		{ speaker: 1, text: '你那個不算啦，你都看字幕' },
	] },
	{ lines: [
		{ speaker: 1, text: '你有在看什麼書嗎？我想找新書看' },
		{ speaker: 0, text: '最近在看《原子習慣》，很推' },
		{ speaker: 1, text: '那本超紅的，真的有用嗎？' },
		{ speaker: 0, text: '看完以後我開始每天早起十分鐘，慢慢增加' },
		{ speaker: 1, text: '聽起來很實際，不是那種雞湯書' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '你們有想過轉職嗎？學個不同的技能' },
		{ speaker: 1, text: '我有在看 UX 設計的課，對前端有加分' },
		{ speaker: 2, text: '我在考慮學 PM 的東西，想更了解產品面' },
		{ speaker: 0, text: '感覺大家都在 T 型發展，不只做技術' },
		{ speaker: 1, text: '純技術走到後面也會卡住，多學一點比較保險' },
		{ speaker: 2, text: '而且跨領域溝通的能力越來越重要' },
	] },
	{ lines: [
		{ speaker: 0, text: '你有訂閱什麼線上學習平台嗎？' },
		{ speaker: 1, text: '有 Coursera，但說真的一個月才看兩三堂' },
		{ speaker: 0, text: '感覺訂了會有一種有在進步的錯覺' },
		{ speaker: 1, text: '就是這樣！付錢買心安' },
		{ speaker: 0, text: '不如約個讀書會互相督促，免費又有效' },
	] },
	// ── 交通/通勤 ──
	{ lines: [
		{ speaker: 1, text: '今天捷運超擠，被擠到快缺氧' },
		{ speaker: 0, text: '板南線嗎？那個每天都是沙丁魚等級' },
		{ speaker: 1, text: '對，尖峰時段根本不用扶把手，旁邊的人幫你撐' },
		{ speaker: 0, text: '哈哈哈，要不要考慮提早半小時出門？' },
		{ speaker: 1, text: '提早半小時出門就要提早半小時起床，不可能' },
	] },
	{ lines: [
		{ speaker: 0, text: '你最近有騎 YouBike 上班嗎？' },
		{ speaker: 1, text: '有啊，天氣好的時候騎超舒服' },
		{ speaker: 0, text: '但下雨天就很慘吧' },
		{ speaker: 1, text: '下雨就搭捷運，不下雨就騎車，很彈性' },
		{ speaker: 0, text: '一個月通勤費可以省多少？' },
		{ speaker: 1, text: '大概省個一千多，重點是還能運動' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '有人也是從新竹通勤上來台北的嗎？' },
		{ speaker: 2, text: '你從新竹通勤！？每天高鐵嗎？' },
		{ speaker: 0, text: '對啊，一個月交通費比房租還貴' },
		{ speaker: 1, text: '為什麼不在台北租房？' },
		{ speaker: 0, text: '小孩在新竹上學，不好搬' },
		{ speaker: 2, text: '真辛苦...公司應該開放更多遠端工作才對' },
		{ speaker: 1, text: '強烈同意，至少一週讓大家在家三天' },
	] },
	{ lines: [
		{ speaker: 1, text: '你有看過通勤時間最誇張的同事嗎？' },
		{ speaker: 0, text: '有啊，之前有人從基隆搭公車來，單趟一個半小時' },
		{ speaker: 1, text: '天啊，來回三小時，人生有三分之一在路上' },
		{ speaker: 0, text: '他說習慣了，在車上都在學英文' },
		{ speaker: 1, text: '被逼出來的自律也是自律，佩服' },
	] },
	// ── 社群媒體/迷因 ──
	{ lines: [
		{ speaker: 0, text: '你有看到昨天那個迷因嗎？工程師版的' },
		{ speaker: 1, text: '哪個？是不是那個「在我電腦上可以跑」的？' },
		{ speaker: 0, text: '不是，是那個 PM 說「很簡單吧」然後工程師翻白眼的' },
		{ speaker: 1, text: '哈哈哈哈我看到了！轉發到群組裡了' },
		{ speaker: 0, text: '小心被 PM 看到，你會成為下個迷因主角' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 1, text: '你們 IG 限動都在發什麼？我都不發' },
		{ speaker: 0, text: '美食跟貓，基本上就這兩個主題' },
		{ speaker: 2, text: '我都發自己的廢文，然後看誰會回' },
		{ speaker: 1, text: '現在年輕人是不是都用 Threads 了？' },
		{ speaker: 0, text: 'Threads 就是文字版 IG，抱怨跟迷因的天堂' },
		{ speaker: 2, text: '聽起來很適合我，我擅長抱怨' },
	] },
	{ lines: [
		{ speaker: 0, text: '你有在經營 LinkedIn 嗎？' },
		{ speaker: 1, text: '有更新，但不太發文，覺得上面很假掰' },
		{ speaker: 0, text: '對，每個人都在發心靈雞湯配上職場感悟' },
		{ speaker: 1, text: '「今天我學到了一件事...」然後寫八百字' },
		{ speaker: 0, text: '哈哈哈，經典句型，但 HR 真的會看' },
		{ speaker: 1, text: '好吧，那我還是乖乖經營一下好了' },
	] },
	{ lines: [
		{ speaker: 1, text: '你 TikTok 的使用時間一天多久？' },
		{ speaker: 0, text: '不要問，問了會嚇到你' },
		{ speaker: 1, text: '超過兩小時？' },
		{ speaker: 0, text: '昨天看了一下螢幕使用時間...三小時四十分' },
		{ speaker: 1, text: '天啊，你的人生被演算法偷走了' },
		{ speaker: 0, text: '我知道，但每次說最後一個影片就停不下來' },
	] },
	// ── 養生/保健 ──
	{ lines: [
		{ speaker: 0, text: '你有在吃什麼保健食品嗎？' },
		{ speaker: 1, text: '維他命D跟B群，工程師必備' },
		{ speaker: 0, text: '為什麼是這兩個？' },
		{ speaker: 1, text: '整天坐辦公室曬不到太陽要補D，熬夜爆肝要補B' },
		{ speaker: 0, text: '聽起來很有道理，但根本問題是不是應該多出門少熬夜' },
		{ speaker: 1, text: '你說的對，但做不到所以才吃保健食品啊' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 2, text: '我最近肩頸超痠，有人知道怎麼緩解嗎？' },
		{ speaker: 0, text: '你螢幕是不是太低了？要跟眼睛平行' },
		{ speaker: 1, text: '我之前也是，後來買了螢幕增高架就好多了' },
		{ speaker: 2, text: '欸真的嗎？哪裡買的？' },
		{ speaker: 0, text: '蝦皮一堆，幾百塊而已，很值得' },
		{ speaker: 2, text: '好，今天就下單，我的脖子快斷了' },
	] },
	{ lines: [
		{ speaker: 1, text: '你有去做過健康檢查嗎？公司的那個' },
		{ speaker: 0, text: '去了，報告出來三高都在邊緣值' },
		{ speaker: 1, text: '蛤，你看起來不胖啊' },
		{ speaker: 0, text: '醫生說久坐跟飲食不均衡就會這樣' },
		{ speaker: 1, text: '嚇到我了，我也要趕快去檢查一下' },
	] },
	// ── 手機/APP推薦 ──
	{ lines: [
		{ speaker: 0, text: '你有在用什麼好用的 APP 嗎？最近想找新的' },
		{ speaker: 1, text: '我最近愛上 Notion，什麼都可以記在上面' },
		{ speaker: 0, text: '我有裝但不太會用，感覺功能太多' },
		{ speaker: 1, text: '一開始就用來當筆記本就好，慢慢學' },
		{ speaker: 0, text: '好，那你有模板可以分享嗎？' },
		{ speaker: 1, text: '有，等等 LINE 傳給你' },
	] },
	{ speakerCount: 3, lines: [
		{ speaker: 1, text: '你們手機都用什麼桌面小工具？' },
		{ speaker: 0, text: '天氣跟行事曆，基本款' },
		{ speaker: 2, text: '我有裝一個計步器的 widget，時時提醒自己要動' },
		{ speaker: 1, text: '有用嗎？真的會因為看到步數就去走？' },
		{ speaker: 2, text: '有時候會...差個幾百步就繞一下公司' },
		{ speaker: 0, text: '我怕裝了之後只會更焦慮' },
	] },
	{ lines: [
		{ speaker: 0, text: '你手機容量都夠用嗎？我又滿了' },
		{ speaker: 1, text: '128G 完全不夠，都是照片佔的' },
		{ speaker: 0, text: '我也是，但又捨不得刪' },
		{ speaker: 1, text: '用 Google Photos 備份啊，免費的空間雖然有限但夠用' },
		{ speaker: 0, text: '好，今天回去整理一下，手機都快當了' },
	] },
	// ── 辦公室零食 ──
	{ lines: [
		{ speaker: 1, text: '欸，茶水間那包洋芋片是誰的？' },
		{ speaker: 0, text: '不知道欸，放了兩天都沒人認領' },
		{ speaker: 1, text: '那可以吃嗎？我好餓' },
		{ speaker: 0, text: '你先吃，有人來認再說' },
		{ speaker: 1, text: '好，那我拆了喔...如果有人問就說是你吃的' },
		{ speaker: 0, text: '欸！為什麼推給我！' },
	] },
	{ speakerCount: 3, roles: { 2: 'orchestrator' }, lines: [
		{ speaker: 0, text: '公司的零食櫃又空了，每次補貨都秒殺' },
		{ speaker: 1, text: '對啊，尤其是那個巧克力，根本搶不到' },
		{ speaker: 0, text: '一定是某個部門整包拿走的，太誇張了' },
		{ speaker: 2, text: '咳...巧克力是我拿的，我以為是給主管的' },
		{ speaker: 0, text: '...' },
		{ speaker: 1, text: '那...您要不要跟我們分享幾顆？' },
		{ speaker: 2, text: '好啦好啦，我去買兩包回來補' },
	] },
	{ lines: [
		{ speaker: 0, text: '你下午都吃什麼當點心？' },
		{ speaker: 1, text: '堅果跟黑巧克力，假裝自己很養生' },
		{ speaker: 0, text: '假裝？' },
		{ speaker: 1, text: '因為我配的是珍珠奶茶' },
		{ speaker: 0, text: '哈哈哈，堅果的養生效果直接被抵銷' },
	] },
	{ speakerCount: 3, roles: { 2: 'orchestrator' }, lines: [
		{ speaker: 0, text: '我覺得公司應該多補一些健康零食' },
		{ speaker: 1, text: '對啊，每次都是餅乾跟糖果，沒有水果' },
		{ speaker: 0, text: '而且飲料只有即溶咖啡，連茶包都沒有' },
		{ speaker: 2, text: '嗯...這些建議我有聽到了' },
		{ speaker: 1, text: '啊！您在這裡！我們不是在抱怨啦...' },
		{ speaker: 2, text: '沒關係，我下週就請總務加訂水果跟茶包' },
		{ speaker: 0, text: '耶！直接反映果然有效！' },
	] },
	{ speakerCount: 3, roles: { 2: 'orchestrator' }, lines: [
		{ speaker: 0, text: '你說主管是不是都不吃午餐的啊' },
		{ speaker: 1, text: '好像是欸，我每次經過他位子都看他在啃能量棒' },
		{ speaker: 0, text: '能量棒當午餐也太慘了，是有多忙' },
		{ speaker: 1, text: '搞不好是在省錢，主管的壓力我們不懂' },
		{ speaker: 2, text: '其實我只是懶得出去買...' },
		{ speaker: 0, text: '哇！您什麼時候在後面的！' },
		{ speaker: 2, text: '從「主管是不是都不吃午餐」那句開始' },
		{ speaker: 1, text: '以後我們說話前要先看一下四周...' },
	] },
];

// ── Easter Egg Scripts ─────────────────────────────────────────

const EASTER_EGG_SCRIPTS: Record<string, ConversationScript> = {
	'raise': {
		speakerCount: 5,
		roles: { 0: 'orchestrator' },
		lines: [
			{ speaker: 0, text: '大家先停一下手邊的工作，我有一個好消息要宣布。' },
			{ speaker: 1, text: '好消息？！是加薪嗎！？' },
			{ speaker: 0, text: '沒錯，公司決定這個月起全員調薪。' },
			{ speaker: 2, text: '等等，我沒聽錯吧？！真的假的！？' },
			{ speaker: 3, text: '天哪！！！我還以為你要說又要加班！' },
			{ speaker: 4, text: '技術長，請問調多少啊！？' },
			{ speaker: 0, text: '細節月底會寄到大家信箱，敬請期待。' },
			{ speaker: 1, text: '月底？！那我要怎麼活到月底啊！！！' },
			{ speaker: 2, text: '沒關係！有得加就好，我先去訂個慶功宴！' },
			{ speaker: 3, text: '我剛才考慮要不要離職的，現在完全打消了' },
			{ speaker: 4, text: '技術長辛苦了！！您是最棒的！！' },
			{ speaker: 0, text: '好啦好啦，繼續工作，大家繼續努力。' },
		],
	},
	'vacation': {
		speakerCount: 5,
		roles: { 0: 'orchestrator' },
		lines: [
			{ speaker: 0, text: '通知大家，下週五公司多放一天假。' },
			{ speaker: 1, text: '什麼！！！？ 是有薪假嗎！？' },
			{ speaker: 0, text: '當然，有薪休假，不用擔心。' },
			{ speaker: 2, text: '耶！！！我要訂機票去日本！！！' },
			{ speaker: 3, text: '哇！我已經在腦海中看到海灘了！' },
			{ speaker: 4, text: '我早就規劃好要去南部追音樂祭，剛好！' },
			{ speaker: 1, text: '我要睡到自然醒再吃一頓超豪華早午餐！' },
			{ speaker: 2, text: '快揪一下！大家要不要一起去哪裡玩？' },
			{ speaker: 3, text: '我投票宜蘭！吃海鮮泡溫泉！' },
			{ speaker: 0, text: '好了好了，不要聊太嗨，這禮拜工作還是要做完。' },
		],
	},
	'overtime': {
		speakerCount: 5,
		roles: { 0: 'orchestrator' },
		lines: [
			{ speaker: 0, text: '不好意思打斷大家，這週五有個客戶 deadline，可能需要加班。' },
			{ speaker: 1, text: '……又是 deadline……' },
			{ speaker: 2, text: '技術長，這是第幾個「緊急」需求了？' },
			{ speaker: 3, text: '我今天都沒吃晚餐耶，加班到幾點啊？' },
			{ speaker: 4, text: '我可以加班，但可以先訂披薩嗎？餓了比較沒效率。' },
			{ speaker: 1, text: '訂披薩加一！炸雞也可以！' },
			{ speaker: 0, text: '可以，公司出，大家決定要吃什麼。' },
			{ speaker: 2, text: '這樣還可以接受啦…至少不是白做工。' },
			{ speaker: 3, text: '技術長，那補休有嗎？' },
			{ speaker: 0, text: '這次加班的時數，下個月一比一補休，我記在這了。' },
			{ speaker: 4, text: '有補休就好說，來吧，一起衝完它！' },
			{ speaker: 1, text: '好啦！為了補休和炸雞，我拼了！' },
		],
	},
	'food': {
		speakerCount: 5,
		roles: { 0: 'orchestrator' },
		lines: [
			{ speaker: 0, text: '大家下午茶要訂嗎？我來開單。' },
			{ speaker: 1, text: '要要要！我要大杯珍珠奶茶，微糖少冰！' },
			{ speaker: 2, text: '我要芋頭拿鐵，正常糖去冰！' },
			{ speaker: 3, text: '我要黑糖鮮奶，記得要加椰果！' },
			{ speaker: 4, text: '我要抹茶歐蕾！不甜不甜！' },
			{ speaker: 1, text: '等等，我想換！改成芒果冰沙！' },
			{ speaker: 2, text: '可以順便加餅乾嗎？我真的餓了' },
			{ speaker: 3, text: '對對！加薯條！那家有薯條！' },
			{ speaker: 0, text: '飲料是飲料，薯條要自己訂別的單喔…' },
			{ speaker: 4, text: '技術長，那換個地方一次訂飲料加點心？' },
			{ speaker: 0, text: '……好吧，那你們三分鐘內決定好，我來統一下單。' },
		],
	},
	'party': {
		speakerCount: 5,
		roles: { 0: 'orchestrator' },
		lines: [
			{ speaker: 0, text: '大家注意，下個月我們要辦尾牙團建活動！' },
			{ speaker: 1, text: '尾牙！！！有摸彩嗎！？有獎品嗎！？' },
			{ speaker: 2, text: '哇！！！是在外面辦嗎？要表演節目嗎！？' },
			{ speaker: 3, text: '我每年都在尾牙被抽到要上台唱歌，今年拜託繞過我' },
			{ speaker: 4, text: '我可以不去嗎？不太喜歡這種場合……' },
			{ speaker: 0, text: '要去，這是全員活動。不過沒有強制表演。' },
			{ speaker: 4, text: '那還好…那我去。' },
			{ speaker: 1, text: '技術長！獎品是什麼！給個提示！' },
			{ speaker: 0, text: '有個神秘大獎，到現場才知道。' },
			{ speaker: 2, text: '啊這樣我超期待的！是 iPhone 嗎！？Switch 嗎！？' },
			{ speaker: 3, text: '去年是掃地機器人，今年一定更好吧！' },
			{ speaker: 0, text: '到時候就知道了，先把工作做好比較重要。' },
		],
	},
};

// ── State ──────────────────────────────────────────────────────

let idleTimer: ReturnType<typeof setTimeout> | null = null;
let conversationTimer: ReturnType<typeof setTimeout> | null = null;
let isActive = false;
let currentParticipants: number[] | null = null; // agentIds in conversation
let recentConversations: number[] = []; // indices of recently used conversations
let conversationCount = 0; // total conversations played, used for group chat rotation

const IDLE_DELAY_MS = 10_000;     // Wait 10s after becoming idle before first chat
const LINE_INTERVAL_MS = 3_500;   // 3.5s between each line
const BETWEEN_CHAT_MS = 20_000;   // 20s between conversations
const BUBBLE_LINGER_MS = 6_000;   // How long the last line stays visible

// ── Public API ─────────────────────────────────────────────────

let cachedBroadcast: Broadcast | null = null;
let cachedGetIdleAgents: (() => IdleAgent[]) | null = null;

/**
 * Start the idle chat scheduler. Conversations will begin after a delay.
 */
export function startIdleChatScheduler(
	broadcast: Broadcast,
	getIdleAgents: () => IdleAgent[],
): void {
	cachedBroadcast = broadcast;
	cachedGetIdleAgents = getIdleAgents;

	// Don't start if already active
	if (isActive) return;
	isActive = true;

	console.log('[IdleChat] Scheduler started — first chat in ~10s');

	idleTimer = setTimeout(() => {
		startNextConversation();
	}, IDLE_DELAY_MS);
}

/**
 * Stop all idle chat immediately. Called when a task is dispatched.
 */
export function stopIdleChat(): void {
	if (!isActive) return;
	isActive = false;

	if (idleTimer) {
		clearTimeout(idleTimer);
		idleTimer = null;
	}
	if (conversationTimer) {
		clearTimeout(conversationTimer);
		conversationTimer = null;
	}

	// Clear any active chat bubbles
	if (currentParticipants && cachedBroadcast) {
		for (const agentId of currentParticipants) {
			cachedBroadcast({ type: 'idleChatEnd', agentId });
		}
	}

	currentParticipants = null;
	console.log('[IdleChat] Scheduler stopped');
}

/**
 * Trigger an easter egg conversation. Stops any current idle chat,
 * plays the specified easter egg script, then resumes normal idle chat.
 */
export function triggerEasterEgg(
	eggId: string,
	broadcast: Broadcast,
	getIdleAgents: () => IdleAgent[],
): boolean {
	const script = EASTER_EGG_SCRIPTS[eggId];
	if (!script) return false;

	const agents = getIdleAgents();
	if (agents.length < (script.speakerCount ?? 2)) return false;

	// Stop any in-progress conversation
	if (conversationTimer) {
		clearTimeout(conversationTimer);
		conversationTimer = null;
	}
	if (idleTimer) {
		clearTimeout(idleTimer);
		idleTimer = null;
	}
	// Clear current bubbles
	if (currentParticipants && cachedBroadcast) {
		for (const agentId of currentParticipants) {
			cachedBroadcast({ type: 'idleChatEnd', agentId });
		}
	}

	// Ensure cached refs are set
	cachedBroadcast = broadcast;
	cachedGetIdleAgents = getIdleAgents;

	const group = pickParticipants(agents, script);
	if (!group) return false;

	currentParticipants = group.map((a) => a.agentId);
	isActive = true; // ensure playConversation proceeds

	const names = group.map((a) => a.name).join(', ');
	console.log(`[IdleChat] Easter egg "${eggId}" triggered — ${names}`);

	playConversation(script.lines, group, 0);
	return true;
}

// ── Internal ───────────────────────────────────────────────────

/** Check if agents can fulfil the role requirements of a conversation */
function canFulfillRoles(agents: IdleAgent[], conv: ConversationScript): boolean {
	if (!conv.roles) return true;
	for (const role of Object.values(conv.roles)) {
		if (!agents.some((a) => a.role === role)) return false;
	}
	return true;
}

function pickConversation(agents: IdleAgent[]): number {
	// Filter conversations that fit available agent count & role requirements
	const eligible = CONVERSATIONS
		.map((c, i) => ({ idx: i, conv: c, needed: c.speakerCount ?? 2 }))
		.filter((c) => c.needed <= agents.length && canFulfillRoles(agents, c.conv));

	const fresh = eligible.filter((c) => !recentConversations.includes(c.idx));
	const base = fresh.length > 0 ? fresh : eligible;

	// Every 3rd conversation, prefer multi-person (3+) if available
	let pool = base;
	if (conversationCount % 3 === 0 && agents.length >= 3) {
		const groupChats = base.filter((c) => c.needed >= 3);
		if (groupChats.length > 0) pool = groupChats;
	}

	const pick = pool[Math.floor(Math.random() * pool.length)];
	const idx = pick.idx;

	recentConversations.push(idx);
	if (recentConversations.length > Math.floor(CONVERSATIONS.length / 2)) {
		recentConversations.shift();
	}

	return idx;
}

function pickParticipants(agents: IdleAgent[], conv: ConversationScript): IdleAgent[] | null {
	const count = conv.speakerCount ?? 2;
	if (agents.length < count) return null;

	const result: IdleAgent[] = new Array(count);
	const used = new Set<number>(); // indices into agents array

	// First, fill role-constrained slots
	if (conv.roles) {
		for (const [slotStr, role] of Object.entries(conv.roles)) {
			const slot = Number(slotStr);
			const candidate = agents.findIndex((a, i) => !used.has(i) && a.role === role);
			if (candidate < 0) return null; // shouldn't happen if canFulfillRoles passed
			result[slot] = agents[candidate];
			used.add(candidate);
		}
	}

	// Fill remaining slots randomly from unused agents
	const remaining = agents
		.map((a, i) => ({ agent: a, idx: i }))
		.filter((x) => !used.has(x.idx))
		.sort(() => Math.random() - 0.5);

	let ri = 0;
	for (let slot = 0; slot < count; slot++) {
		if (!result[slot]) {
			result[slot] = remaining[ri++].agent;
		}
	}

	return result;
}

function startNextConversation(): void {
	if (!isActive || !cachedBroadcast || !cachedGetIdleAgents) return;

	const agents = cachedGetIdleAgents();
	if (agents.length < 2) {
		// Not enough idle agents, try again later
		idleTimer = setTimeout(() => startNextConversation(), BETWEEN_CHAT_MS);
		return;
	}

	// Increment count here (before branching) so both AI and fixed paths are counted
	conversationCount++;

	// Every N conversations, try AI-generated conversation
	if (conversationCount % AI_CHAT_EVERY === 0 && getDeepseekApiKey()) {
		// Pick 2 random agents for AI conversation
		const shuffled = [...agents].sort(() => Math.random() - 0.5);
		const aiGroup = shuffled.slice(0, 2);

		console.log(`[IdleChat] Attempting AI conversation (count=${conversationCount})...`);
		generateAIConversation().then((aiLines) => {
			if (!isActive || !cachedBroadcast) return;

			if (aiLines) {
				currentParticipants = aiGroup.map((a) => a.agentId);
				const names = aiGroup.map((a) => a.name).join(', ');
				console.log(`[IdleChat] AI conversation between ${names}`);
				playConversation(aiLines, aiGroup, 0);
			} else {
				// AI failed — fall back to fixed conversation
				playFixedConversation(agents);
			}
		});
		return;
	}

	playFixedConversation(agents);
}

function playFixedConversation(agents: IdleAgent[]): void {
	if (!isActive || !cachedBroadcast) return;

	// Pick a conversation that fits available agent count & roles
	const convIdx = pickConversation(agents);
	const conv = CONVERSATIONS[convIdx];

	const group = pickParticipants(agents, conv)!;

	currentParticipants = group.map((a) => a.agentId);

	const names = group.map((a) => a.name).join(', ');
	console.log(`[IdleChat] Starting conversation between ${names}`);

	playConversation(conv.lines, group, 0);
}

function playConversation(
	lines: ConversationLine[],
	group: IdleAgent[],
	lineIdx: number,
): void {
	if (!isActive || !cachedBroadcast) return;

	if (lineIdx >= lines.length) {
		// Conversation ended — linger the last bubble, then clean up and schedule next
		conversationTimer = setTimeout(() => {
			if (!isActive || !cachedBroadcast) return;
			// Clear all participants' bubbles
			for (const agent of group) {
				cachedBroadcast({ type: 'idleChatEnd', agentId: agent.agentId });
			}
			currentParticipants = null;

			// Schedule next conversation
			if (isActive) {
				idleTimer = setTimeout(() => startNextConversation(), BETWEEN_CHAT_MS);
			}
		}, BUBBLE_LINGER_MS);
		return;
	}

	const line = lines[lineIdx];
	const speaker = group[line.speaker];

	cachedBroadcast({
		type: 'idleChatMessage',
		agentId: speaker.agentId,
		text: line.text,
	});

	// Clear other speakers' bubbles (only current speaker has bubble)
	if (lineIdx > 0) {
		const prevLine = lines[lineIdx - 1];
		if (prevLine.speaker !== line.speaker) {
			const prevSpeaker = group[prevLine.speaker];
			cachedBroadcast({
				type: 'idleChatEnd',
				agentId: prevSpeaker.agentId,
			});
		}
	}

	conversationTimer = setTimeout(() => {
		playConversation(lines, group, lineIdx + 1);
	}, LINE_INTERVAL_MS);
}
