import type { Broadcast } from './timerManager.js';

/**
 * Idle Chat Manager — makes team members chat casually when not working.
 * Conversations stop immediately when a task is dispatched.
 */

interface ConversationLine {
	speaker: number; // index into participant array (0, 1, 2, ...)
	text: string;
}

interface IdleAgent {
	agentId: number;
	skillId: string;
	name: string;
}

// ── Conversation Pool ──────────────────────────────────────────

const CONVERSATIONS: Array<{ speakerCount?: number; lines: ConversationLine[] }> = [
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
];

// ── State ──────────────────────────────────────────────────────

let idleTimer: ReturnType<typeof setTimeout> | null = null;
let conversationTimer: ReturnType<typeof setTimeout> | null = null;
let isActive = false;
let currentParticipants: [number, number] | null = null; // agentId pair
let recentConversations: number[] = []; // indices of recently used conversations

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
		cachedBroadcast({ type: 'idleChatEnd', agentId: currentParticipants[0] });
		cachedBroadcast({ type: 'idleChatEnd', agentId: currentParticipants[1] });
	}

	currentParticipants = null;
	console.log('[IdleChat] Scheduler stopped');
}

// ── Internal ───────────────────────────────────────────────────

function pickConversation(): number {
	// Avoid repeating recent conversations
	const available = CONVERSATIONS
		.map((_, i) => i)
		.filter((i) => !recentConversations.includes(i));

	const pool = available.length > 0 ? available : CONVERSATIONS.map((_, i) => i);
	const idx = pool[Math.floor(Math.random() * pool.length)];

	recentConversations.push(idx);
	if (recentConversations.length > Math.floor(CONVERSATIONS.length / 2)) {
		recentConversations.shift();
	}

	return idx;
}

function pickParticipants(agents: IdleAgent[]): [IdleAgent, IdleAgent] | null {
	if (agents.length < 2) return null;

	// Shuffle and pick 2
	const shuffled = [...agents].sort(() => Math.random() - 0.5);
	return [shuffled[0], shuffled[1]];
}

function startNextConversation(): void {
	if (!isActive || !cachedBroadcast || !cachedGetIdleAgents) return;

	const agents = cachedGetIdleAgents();
	const pair = pickParticipants(agents);

	if (!pair) {
		// Not enough idle agents, try again later
		idleTimer = setTimeout(() => startNextConversation(), BETWEEN_CHAT_MS);
		return;
	}

	const convIdx = pickConversation();
	const conv = CONVERSATIONS[convIdx];
	currentParticipants = [pair[0].agentId, pair[1].agentId];

	console.log(`[IdleChat] Starting conversation between ${pair[0].name} and ${pair[1].name}`);

	playConversation(conv.lines, pair, 0);
}

function playConversation(
	lines: ConversationLine[],
	pair: [IdleAgent, IdleAgent],
	lineIdx: number,
): void {
	if (!isActive || !cachedBroadcast) return;

	if (lineIdx >= lines.length) {
		// Conversation ended — linger the last bubble, then clean up and schedule next
		conversationTimer = setTimeout(() => {
			if (!isActive || !cachedBroadcast) return;
			// Clear both participants' bubbles
			cachedBroadcast({ type: 'idleChatEnd', agentId: pair[0].agentId });
			cachedBroadcast({ type: 'idleChatEnd', agentId: pair[1].agentId });
			currentParticipants = null;

			// Schedule next conversation
			if (isActive) {
				idleTimer = setTimeout(() => startNextConversation(), BETWEEN_CHAT_MS);
			}
		}, BUBBLE_LINGER_MS);
		return;
	}

	const line = lines[lineIdx];
	const speaker = pair[line.speaker];

	cachedBroadcast({
		type: 'idleChatMessage',
		agentId: speaker.agentId,
		text: line.text,
	});

	// Clear the other speaker's bubble (only current speaker has bubble)
	const otherSpeaker = pair[line.speaker === 0 ? 1 : 0];
	if (lineIdx > 0) {
		// Only clear if the previous line was from the other speaker
		const prevLine = lines[lineIdx - 1];
		if (prevLine.speaker !== line.speaker) {
			cachedBroadcast({
				type: 'idleChatEnd',
				agentId: otherSpeaker.agentId,
			});
		}
	}

	conversationTimer = setTimeout(() => {
		playConversation(lines, pair, lineIdx + 1);
	}, LINE_INTERVAL_MS);
}
