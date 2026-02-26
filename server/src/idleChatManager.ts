import type { Broadcast } from './timerManager.js';

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
];

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
	conversationCount++;
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
