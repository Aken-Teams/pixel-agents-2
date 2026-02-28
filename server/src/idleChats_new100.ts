// 100 new idle chat conversations — 繁體中文, casual Taiwanese tech office tone
// 70 two-person (speakerCount omitted = 2), 30 three-person (speakerCount: 3)
// Categories covered evenly across the 20 specified topics

export const NEW_CONVERSATIONS = [

	// ─── 1. 美食探店 ───────────────────────────────────────────────

	// #1 (2-person)
	{ lines: [
		{ speaker: 0, text: '上禮拜新開那家義大利麵有去試嗎？' },
		{ speaker: 1, text: '去了！肉醬麵份量超大，一個人吃不完' },
		{ speaker: 0, text: '是嗎，我看評論說偏鹹' },
		{ speaker: 1, text: '我覺得剛好，可能看個人口味' },
		{ speaker: 0, text: '那我下週約你一起去好了，有伴比較敢點多一點' },
	] },

	// #2 (2-person)
	{ lines: [
		{ speaker: 1, text: '那家涮涮鍋最近出了新菜單你知道嗎？' },
		{ speaker: 0, text: '真的？上次去點的鍋底就已經很讚了' },
		{ speaker: 1, text: '說是多了松露口味的高湯，好奇死我了' },
		{ speaker: 0, text: '松露耶，感覺很貴...' },
		{ speaker: 1, text: '才多一百塊，我覺得值得試試' },
		{ speaker: 0, text: '好，週五下班去，當週末到來的慶祝' },
	] },

	// #3 (2-person)
	{ lines: [
		{ speaker: 0, text: '你有沒有去過東區那家爆米花冰淇淋？' },
		{ speaker: 1, text: '沒有欸，什麼概念？' },
		{ speaker: 0, text: '就是爆米花鋪在冰淇淋上，超好吃又有嚼感' },
		{ speaker: 1, text: '聽起來口感很衝突但又想試' },
		{ speaker: 0, text: '改天帶你去，我已經去了三次了' },
	] },

	// #4 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '我昨天去了那家網紅牛排館' },
		{ speaker: 1, text: '排很久嗎？聽說要等一小時以上' },
		{ speaker: 0, text: '我平日去的，等了四十分鐘，值得' },
		{ speaker: 2, text: '肉質怎樣？還是炒話題而已？' },
		{ speaker: 0, text: '真的不錯，一套餐大概八百，哪天揪一起去' },
		{ speaker: 1, text: '好啊，我就怕人太多要等太久' },
	] },

	// #5 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 1, text: '公司附近有家新開的手工漢堡要不要去？' },
		{ speaker: 0, text: '手工漢堡？是那種鑄鐵鍋煎的肉排嗎？' },
		{ speaker: 2, text: '我上次吃過那間！薯條也很讚' },
		{ speaker: 1, text: '那今天中午就這個了，可以嗎？' },
		{ speaker: 0, text: '好啊，我去訂位' },
		{ speaker: 2, text: '記得問他們有沒有辣醬選項，我需要辣' },
	] },

	// ─── 2. 追劇/電影/動漫 ────────────────────────────────────────

	// #6 (2-person)
	{ lines: [
		{ speaker: 0, text: '鬼滅之刃新一季昨天看了嗎？' },
		{ speaker: 1, text: '看了！那個戰鬥畫面也太炸了吧' },
		{ speaker: 0, text: 'ufotable 的作畫每次都讓我跌破眼鏡' },
		{ speaker: 1, text: '對！那個火焰效果我回放了五次' },
		{ speaker: 0, text: '看完以後覺得自己也想學劍術了' },
	] },

	// #7 (2-person)
	{ lines: [
		{ speaker: 1, text: '你有看完《地球末日》嗎？感覺劇情有點拖' },
		{ speaker: 0, text: '撐到第八集就很好看了，我保證' },
		{ speaker: 1, text: '真的假的？那我繼續看好了' },
		{ speaker: 0, text: '結局超出乎意料，不要爆雷給你' },
		{ speaker: 1, text: '好好好，那今晚衝' },
	] },

	// #8 (2-person)
	{ lines: [
		{ speaker: 0, text: '最近有沒有推薦的短片動漫？' },
		{ speaker: 1, text: '你看過《孤獨搖滾》嗎？' },
		{ speaker: 0, text: '還沒，是什麼類型的？' },
		{ speaker: 1, text: '樂團題材，女主角超內向但彈吉他超強' },
		{ speaker: 0, text: '聽起來很有反差感，今晚就來看' },
		{ speaker: 1, text: '看完你會愛上裡面的音樂，超好聽' },
	] },

	// #9 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 1, text: '《魷魚遊戲》第二季你們都看完了嗎？' },
		{ speaker: 0, text: '看了一半，感覺和第一季風格不太一樣' },
		{ speaker: 2, text: '我還沒開始，有沒有第一季好看？' },
		{ speaker: 1, text: '我覺得差一點點，但還是很燒腦' },
		{ speaker: 0, text: '反正第三季我肯定繼續追' },
		{ speaker: 2, text: '好好，我先把第一二季補完' },
	] },

	// #10 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '你們有沒有在看《The Bear》？廚師那個' },
		{ speaker: 2, text: '有！那個廚房氛圍壓力感好重，我邊看邊緊張' },
		{ speaker: 1, text: '我看完以後不敢進廚房了' },
		{ speaker: 0, text: '但料理的鏡頭真的很美' },
		{ speaker: 2, text: '第二季的那集一鏡到底太猛了' },
		{ speaker: 1, text: '看完直接呆了五分鐘' },
	] },

	// ─── 3. 3C 開箱/新手機 ────────────────────────────────────────

	// #11 (2-person)
	{ lines: [
		{ speaker: 1, text: '你看到新出的 MacBook 了嗎？' },
		{ speaker: 0, text: 'M4 Pro 那台嗎？規格看起來很猛' },
		{ speaker: 1, text: '續航力說可以到 22 小時耶' },
		{ speaker: 0, text: '我現在的 M2 才買一年多，不敢換' },
		{ speaker: 1, text: '我也只是看看啦，錢不是長在樹上的' },
	] },

	// #12 (2-person)
	{ lines: [
		{ speaker: 0, text: '我昨天買了那個磁吸行動電源，好用到不行' },
		{ speaker: 1, text: '多少毫安的？' },
		{ speaker: 0, text: '一萬毫安，充一次可以讓手機滿電兩次' },
		{ speaker: 1, text: '重嗎？我一直怕行動電源太重' },
		{ speaker: 0, text: '輕得出乎意料，跟手機差不多重而已' },
	] },

	// #13 (2-person)
	{ lines: [
		{ speaker: 1, text: '平板和筆電你比較推哪個？' },
		{ speaker: 0, text: '看用途，只看影片用平板就夠' },
		{ speaker: 1, text: '我是有時候想在外面改文件' },
		{ speaker: 0, text: '那就筆電，配上 iPad 當副螢幕超讚' },
		{ speaker: 1, text: '雙設備太貴了吧...' },
		{ speaker: 0, text: '節省的方法是只買一個，看你更需要哪個' },
	] },

	// #14 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '有人用過那個智慧型戒指嗎？量心率那種' },
		{ speaker: 1, text: '有！我朋友買了 Oura Ring，說很準' },
		{ speaker: 2, text: '它可以偵測睡眠品質喔，評測說很厲害' },
		{ speaker: 0, text: '比手錶好用嗎？感覺戒指比較不礙事' },
		{ speaker: 1, text: '就是沒有螢幕，要搭配手機看資料' },
		{ speaker: 2, text: '說不定我需要一個，最近失眠嚴重' },
	] },

	// #15 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 1, text: '剛剛在逛網站，那台新顯示器 4K 才五千多塊' },
		{ speaker: 0, text: '多少吋？' },
		{ speaker: 2, text: '是不是那台 27 吋 IPS 面板的？我也在看' },
		{ speaker: 1, text: '對！HDR 400，顏色很準' },
		{ speaker: 0, text: 'HDR 400 差強人意，要 600 以上才有感' },
		{ speaker: 2, text: '但五千塊這個價位的 4K IPS 已經很划算了' },
	] },

	// ─── 4. 投資理財/股票 ──────────────────────────────────────────

	// #16 (2-person)
	{ lines: [
		{ speaker: 0, text: '你有在存 ETF 嗎？' },
		{ speaker: 1, text: '有，0050 每個月固定買一點' },
		{ speaker: 0, text: '定期定額那種？' },
		{ speaker: 1, text: '對，不用一直盯盤，適合工程師' },
		{ speaker: 0, text: '我之前買個股，光是看盤就沒時間工作了' },
	] },

	// #17 (2-person)
	{ lines: [
		{ speaker: 1, text: '最近美股你有在看嗎？' },
		{ speaker: 0, text: '有，漲得很嚇人，感覺隨時要回調' },
		{ speaker: 1, text: 'AI 相關的股票一直被炒' },
		{ speaker: 0, text: '我也想進場但又怕追高' },
		{ speaker: 1, text: '分批買比較安全，不要孤注一擲' },
		{ speaker: 0, text: '有道理，我再研究一下' },
	] },

	// #18 (2-person)
	{ lines: [
		{ speaker: 0, text: '你有在用什麼記帳 app 嗎？' },
		{ speaker: 1, text: '用 Moneybook，記了三個月才有感覺' },
		{ speaker: 0, text: '你有發現錢都花在哪裡嗎？' },
		{ speaker: 1, text: '食物佔一半，另一半是各種訂閱服務' },
		{ speaker: 0, text: '訂閱制真的會在不知不覺中燒錢' },
	] },

	// #19 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 1, text: '你們有買房計畫嗎？' },
		{ speaker: 0, text: '有啊，但看台北的房價就很絕望' },
		{ speaker: 2, text: '我在考慮先存頭期款，至少要個五百萬' },
		{ speaker: 1, text: '光是存到那個數字就要很多年了' },
		{ speaker: 0, text: '所以我現在把薪水的三分之一存起來' },
		{ speaker: 2, text: '三分之一很猛欸，我頂多五分之一' },
	] },

	// #20 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '有人用過機器人理財嗎？' },
		{ speaker: 2, text: '我用過，一年報酬率大概 7%，中等風險' },
		{ speaker: 1, text: '7% 不錯啊，跟自己選股比怎樣？' },
		{ speaker: 2, text: '省心很多，我就是懶得研究才用' },
		{ speaker: 0, text: '這個懶人策略我很喜歡，推薦哪家？' },
		{ speaker: 2, text: '我用 Warran，介面很好用' },
	] },

	// ─── 5. 健身運動 ───────────────────────────────────────────────

	// #21 (2-person)
	{ lines: [
		{ speaker: 1, text: '你有在做重訓嗎？我最近想開始' },
		{ speaker: 0, text: '有，做了大概半年，差滿多的' },
		{ speaker: 1, text: '要自己練還是找教練？' },
		{ speaker: 0, text: '一開始建議找教練，動作不對很容易受傷' },
		{ speaker: 1, text: '好，那我找個月課先試試看' },
	] },

	// #22 (2-person)
	{ lines: [
		{ speaker: 0, text: '你在練什麼有氧？' },
		{ speaker: 1, text: '最近在跳 Zumba，超好玩' },
		{ speaker: 0, text: 'Zumba？那個很消耗體力吧' },
		{ speaker: 1, text: '一堂課下來衣服都濕透了但超爽' },
		{ speaker: 0, text: '感覺比跑步有趣多了，YouTube 上有免費的嗎？' },
		{ speaker: 1, text: '很多，先試試再說' },
	] },

	// #23 (2-person)
	{ lines: [
		{ speaker: 1, text: '我報名了鐵人三項，有點後悔' },
		{ speaker: 0, text: '哇！很猛欸，什麼距離的？' },
		{ speaker: 1, text: '半程的，游 750m 騎 20km 跑 5km' },
		{ speaker: 0, text: '聽起來很累，你平常都在練嗎？' },
		{ speaker: 1, text: '對，這就是我為什麼每天累成狗的原因' },
	] },

	// #24 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '我最近開始打羽球，超級好玩，要不要一起？' },
		{ speaker: 1, text: '你在哪裡打？有固定場館嗎？' },
		{ speaker: 0, text: '附近的運動中心，一個小時才 100 塊' },
		{ speaker: 2, text: '我也想去！你們固定哪天？' },
		{ speaker: 0, text: '週三晚上八點，現在四個人，再加一個更好' },
		{ speaker: 1, text: '我也去！好久沒運動了' },
	] },

	// #25 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '你們有吃蛋白粉嗎？重訓後喝那種' },
		{ speaker: 2, text: '吃，但我買的那個很難入口' },
		{ speaker: 0, text: '我用 ON 的巧克力口味，還滿好喝的' },
		{ speaker: 2, text: '你混牛奶還是水？' },
		{ speaker: 0, text: '混無糖豆漿，比混水好喝很多' },
		{ speaker: 1, text: '難怪我都喝不下去，我一直混水' },
	] },

	// ─── 6. 旅遊規劃 ───────────────────────────────────────────────

	// #26 (2-person)
	{ lines: [
		{ speaker: 0, text: '清明連假你有計畫嗎？' },
		{ speaker: 1, text: '想去台東，去看看伯朗大道' },
		{ speaker: 0, text: '要開車嗎？火車訂得到嗎？' },
		{ speaker: 1, text: '早就訂好了，三週前就買了' },
		{ speaker: 0, text: '三週前！你也太有計畫了' },
	] },

	// #27 (2-person)
	{ lines: [
		{ speaker: 1, text: '你有去過沖繩嗎？' },
		{ speaker: 0, text: '去過兩次，很喜歡那邊的海' },
		{ speaker: 1, text: '有推薦的景點嗎？我想帶家人去' },
		{ speaker: 0, text: '萬座毛的夕陽必看，還有美麗海水族館' },
		{ speaker: 1, text: '夏天去的話有什麼要注意？' },
		{ speaker: 0, text: '超熱，記得防曬跟補水，中暑很容易' },
	] },

	// #28 (2-person)
	{ lines: [
		{ speaker: 0, text: '歐洲旅遊你覺得可以用幾週時間？' },
		{ speaker: 1, text: '我那次用兩週跑了五個國家，很趕' },
		{ speaker: 0, text: '哪些國家？' },
		{ speaker: 1, text: '法國、義大利、西班牙、奧地利、捷克' },
		{ speaker: 0, text: '天哪，你每個地方平均只待三天？' },
		{ speaker: 1, text: '下次要慢遊，一個國家待一週' },
	] },

	// #29 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 1, text: '有沒有人要一起去北海道？我在規劃冬天行程' },
		{ speaker: 0, text: '北海道冬天！可以滑雪還是泡溫泉吃螃蟹？' },
		{ speaker: 2, text: '我對螃蟹更有興趣哈哈，幾月出發？' },
		{ speaker: 1, text: '大概一月或二月，雪最多的時候' },
		{ speaker: 0, text: '我也要去！機票要早買' },
		{ speaker: 2, text: '趕快揪人，旅館也要提早訂' },
	] },

	// #30 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '你們有沒有用什麼旅遊規劃 app 推薦的？' },
		{ speaker: 2, text: '我用 TripIt，把所有訂位丟進去自動整理' },
		{ speaker: 1, text: '我在用 Notion，做一個旅遊模板超好用' },
		{ speaker: 2, text: 'Notion 也可以用來規劃旅遊啊？' },
		{ speaker: 1, text: '交通住宿景點全部整合在一個頁面，超推' },
		{ speaker: 0, text: '下次出遊之前幫我也做一個版本，謝了' },
	] },

	// ─── 7. 寵物日常 ───────────────────────────────────────────────

	// #31 (2-person)
	{ lines: [
		{ speaker: 1, text: '我家狗最近一直撿路邊的東西吃' },
		{ speaker: 0, text: '那很危險欸，要帶去看醫生嗎？' },
		{ speaker: 1, text: '還好，就是垃圾桶旁邊的餅乾屑' },
		{ speaker: 0, text: '你家狗是什麼品種？' },
		{ speaker: 1, text: '米克斯，撿來養的，超黏人' },
	] },

	// #32 (2-person)
	{ lines: [
		{ speaker: 0, text: '你有養貓嗎？你之前說在考慮領養' },
		{ speaker: 1, text: '已經領養了！兩個月前的事，你都不知道' },
		{ speaker: 0, text: '為什麼沒有告訴我！叫什麼名字？' },
		{ speaker: 1, text: '叫 Syntax，因為牠一叫就讓我出錯' },
		{ speaker: 0, text: '哈哈，工程師取名就是這樣' },
	] },

	// #33 (2-person)
	{ lines: [
		{ speaker: 1, text: '我家貓打疫苗要花多少錢你知道嗎？' },
		{ speaker: 0, text: '我家貓是一劑大概一千多，再加診察費' },
		{ speaker: 1, text: '養寵物真的沒有省到什麼' },
		{ speaker: 0, text: '對，但看到牠睡覺的樣子就覺得一切值了' },
		{ speaker: 1, text: '哈哈，這就是牠們的魔法' },
	] },

	// #34 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 2, text: '我家倉鼠昨天跑輪跑了一整晚，把我吵醒' },
		{ speaker: 0, text: '你床離籠子多近啊？' },
		{ speaker: 2, text: '兩公尺...已經移過一次了還是聽到' },
		{ speaker: 1, text: '哈哈，養夜行性動物就是這個風險' },
		{ speaker: 0, text: '移到另一個房間去吧，否則你要失眠一輩子' },
		{ speaker: 2, text: '問題是家裡沒有多餘的房間...' },
	] },

	// #35 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '你們有帶寵物出門的習慣嗎？' },
		{ speaker: 1, text: '我每週末帶我家柴犬去河濱散步' },
		{ speaker: 2, text: '牠坐捷運沒問題嗎？' },
		{ speaker: 1, text: '放進寵物袋裡可以，牠就當在移動版的窩' },
		{ speaker: 0, text: '我家貓不行，一搭交通工具就叫個不停' },
		{ speaker: 2, text: '貓和狗在這方面真的個性差很多' },
	] },

	// ─── 8. 天氣抱怨 ───────────────────────────────────────────────

	// #36 (2-person)
	{ lines: [
		{ speaker: 0, text: '今天濕度也太高了，衣服洗完都晾不乾' },
		{ speaker: 1, text: '梅雨季就這樣，每年都受不了' },
		{ speaker: 0, text: '我家沒有烘乾機，完全靠天吃飯' },
		{ speaker: 1, text: '投資一台吧，台灣的濕季真的需要' },
	] },

	// #37 (2-person)
	{ lines: [
		{ speaker: 1, text: '颱風要來了，你有沒有備糧食？' },
		{ speaker: 0, text: '沒有欸，住台北感覺不太用擔心' },
		{ speaker: 1, text: '至少備個幾瓶水和泡麵吧，超市很快就掃空' },
		{ speaker: 0, text: '對喔，上次颱風前超市真的空了' },
		{ speaker: 1, text: '今晚下班順便買一下，以防萬一' },
	] },

	// #38 (2-person)
	{ lines: [
		{ speaker: 0, text: '外面下雨，我傘忘在公司了...' },
		{ speaker: 1, text: '今天又不是說好要下雨的' },
		{ speaker: 0, text: '氣象預報說陰天就出門，結果...' },
		{ speaker: 1, text: '我這裡有一把備用傘，先借你' },
		{ speaker: 0, text: '謝謝！我明天一定帶來還你' },
	] },

	// #39 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 1, text: '今天熱到電腦風扇一直轉，辦公室冷氣壞了嗎？' },
		{ speaker: 0, text: '好像壓縮機有點怪，制冷效果變差了' },
		{ speaker: 2, text: '我這邊有感覺，比昨天熱很多' },
		{ speaker: 1, text: '要不要通報總務去看一下？' },
		{ speaker: 2, text: '我來填維修單，這個不能拖' },
		{ speaker: 0, text: '謝謝！我快中暑了' },
	] },

	// #40 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '每年三四月就開始飄沙塵暴，眼睛超不舒服' },
		{ speaker: 2, text: '今天空氣品質 PM2.5 紫爆，你們有戴口罩嗎？' },
		{ speaker: 1, text: '戴了，但還是覺得喉嚨乾乾的' },
		{ speaker: 0, text: '我回家都要洗臉好幾次才覺得乾淨' },
		{ speaker: 2, text: '這種天氣真的讓人好想宅在家' },
		{ speaker: 1, text: '同意，然後打開空氣清淨機全速運轉' },
	] },

	// ─── 9. 節日話題 ───────────────────────────────────────────────

	// #41 (2-person)
	{ lines: [
		{ speaker: 0, text: '中秋節你們家要烤肉嗎？' },
		{ speaker: 1, text: '當然！這是台灣傳統，一定要烤' },
		{ speaker: 0, text: '我每年都在吃烤肉，但說真的跟月亮有什麼關係' },
		{ speaker: 1, text: '哈哈，不重要啦，重點是好吃' },
		{ speaker: 0, text: '說的也是，幾點開始你家的？' },
	] },

	// #42 (2-person)
	{ lines: [
		{ speaker: 1, text: '情人節要怎麼過？你有安排嗎？' },
		{ speaker: 0, text: '有，但餐廳訂位超難訂，都滿了' },
		{ speaker: 1, text: '情人節去餐廳很划不來，到處都漲價' },
		{ speaker: 0, text: '所以我改買食材自己煮，更有誠意' },
		{ speaker: 1, text: '這個很加分，對方會很感動的' },
	] },

	// #43 (2-person)
	{ lines: [
		{ speaker: 0, text: '過年紅包你有沒有壓力？' },
		{ speaker: 1, text: '超有！我表弟妹一堆，紅包費用加起來不少' },
		{ speaker: 0, text: '你都包多少？' },
		{ speaker: 1, text: '小的 200，大一點的 500，差不多這樣' },
		{ speaker: 0, text: '還好，我包的更多，因為很多長輩在等' },
	] },

	// #44 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 2, text: '萬聖節公司有要辦什麼活動嗎？' },
		{ speaker: 0, text: '不知道，可能頂多出幾個糖果放茶水間' },
		{ speaker: 1, text: '我去年扮裝來上班，結果只有我一個' },
		{ speaker: 2, text: '你扮什麼？主管沒說什麼嗎？' },
		{ speaker: 1, text: '扮無頭騎士，主管說我很有創意，結果加分了' },
		{ speaker: 0, text: '今年我們一起扮吧，人多比較不尷尬' },
	] },

	// #45 (2-person)
	{ lines: [
		{ speaker: 0, text: '聖誕節交換禮物你要參加嗎？' },
		{ speaker: 1, text: '要！我去年抽到一個超好用的按摩球' },
		{ speaker: 0, text: '我上次抽到一包泡麵...' },
		{ speaker: 1, text: '至少泡麵實用哈哈' },
		{ speaker: 0, text: '今年我一定要放高品質的，雪恥' },
	] },

	// ─── 10. 程式笑話/工程師梗 ────────────────────────────────────

	// #46 (2-person)
	{ lines: [
		{ speaker: 0, text: '有沒有聽過：工程師最怕哪三個字？' },
		{ speaker: 1, text: '哪三個？' },
		{ speaker: 0, text: '「改一下」' },
		{ speaker: 1, text: '哈哈哈！尤其是「只是改一下」那種更恐怖' },
		{ speaker: 0, text: '「不難吧？」也是...' },
	] },

	// #47 (2-person)
	{ lines: [
		{ speaker: 1, text: '有沒有人說過你的 code 是義大利麵？' },
		{ speaker: 0, text: '我自己說過自己的...' },
		{ speaker: 1, text: '那其實算是自我認知很強啦' },
		{ speaker: 0, text: '重點是那義大利麵還沒加醬，又乾又難整理' },
		{ speaker: 1, text: '加油，我們一起重構吧' },
	] },

	// #48 (2-person)
	{ lines: [
		{ speaker: 0, text: '你知道 NaN === NaN 是什麼嗎？' },
		{ speaker: 1, text: 'false，因為 NaN 不等於任何東西' },
		{ speaker: 0, text: '對，連自己都不等於自己' },
		{ speaker: 1, text: '這和某些人很像欸' },
		{ speaker: 0, text: '哈哈，你在說誰我不說' },
	] },

	// #49 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 1, text: '你知道程式設計師的悲歌是什麼嗎？' },
		{ speaker: 0, text: '說來聽聽' },
		{ speaker: 1, text: '「在我電腦上可以跑啊」' },
		{ speaker: 2, text: '我昨天才剛說了這句話，查了兩小時' },
		{ speaker: 0, text: '哈哈！環境問題的受害者又一名，查到什麼？' },
		{ speaker: 2, text: 'node 版本差一號，永恆的經典' },
	] },

	// #50 (2-person)
	{ lines: [
		{ speaker: 0, text: '你有沒有見過上班第一天就推壞 production 的人？' },
		{ speaker: 1, text: '你說的是不是我？' },
		{ speaker: 0, text: '你有嗎！說來聽聽' },
		{ speaker: 1, text: '我第一週不小心刪掉環境變數，服務掛了十分鐘' },
		{ speaker: 0, text: '那時候怎麼辦？' },
		{ speaker: 1, text: '我嚇到手抖，還好 senior 冷靜帶我 rollback' },
	] },

	// ─── 11. 咖啡/茶 ───────────────────────────────────────────────

	// #51 (2-person)
	{ lines: [
		{ speaker: 0, text: '你喝咖啡會失眠嗎？' },
		{ speaker: 1, text: '以前不會，最近越來越有感' },
		{ speaker: 0, text: '下午三點後就不喝了，保護睡眠' },
		{ speaker: 1, text: '我學你，最近睡眠品質好差' },
		{ speaker: 0, text: '改喝麥茶或洛神花茶，好睡很多' },
	] },

	// #52 (2-person)
	{ lines: [
		{ speaker: 1, text: '你有在喝冷泡茶嗎？' },
		{ speaker: 0, text: '有！前陣子迷上了，自己泡成本超低' },
		{ speaker: 1, text: '用哪種茶葉？' },
		{ speaker: 0, text: '白毫烏龍泡起來很香，也不澀' },
		{ speaker: 1, text: '這個我沒試過，要去買來玩玩' },
	] },

	// #53 (2-person)
	{ lines: [
		{ speaker: 0, text: '你有辦公室咖啡機的偏好嗎？' },
		{ speaker: 1, text: '我只要有熱水加即溶包就滿足了' },
		{ speaker: 0, text: '我被膠囊機養刁了，喝即溶的覺得太苦' },
		{ speaker: 1, text: '那你的口味標準已經很高了' },
		{ speaker: 0, text: '每次喝咖啡都要付出代價嘛...' },
	] },

	// #54 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 2, text: '有沒有人等等要去樓下買咖啡？幫我帶一杯' },
		{ speaker: 0, text: '我等等要下去！你要什麼？' },
		{ speaker: 2, text: '美式加一點牛奶，謝謝' },
		{ speaker: 1, text: '我要拿鐵！中杯就好' },
		{ speaker: 0, text: '好，三杯了，我去排隊，回來再轉帳' },
		{ speaker: 2, text: '辛苦了！今天換我下去買下次' },
	] },

	// #55 (2-person)
	{ lines: [
		{ speaker: 1, text: '辦公室的咖啡機昨天是不是補了新豆子？' },
		{ speaker: 0, text: '對！好像是衣索比亞的，香氣很不一樣' },
		{ speaker: 1, text: '我也喝到了！有點果香，比平常好喝很多' },
		{ speaker: 0, text: '是誰採購的？要跟他說謝謝' },
		{ speaker: 1, text: '好像是 Eva 訂的，她很懂咖啡' },
	] },

	// ─── 12. 租屋/買房 ─────────────────────────────────────────────

	// #56 (2-person)
	{ lines: [
		{ speaker: 0, text: '你現在租的房間大概多少錢？' },
		{ speaker: 1, text: '捷運站附近，套房一萬五左右' },
		{ speaker: 0, text: '有沒有含水電？' },
		{ speaker: 1, text: '不含，每個月水電大概一千多' },
		{ speaker: 0, text: '台北的租金真的讓人很無力' },
	] },

	// #57 (2-person)
	{ lines: [
		{ speaker: 1, text: '你有用 591 找過房子嗎？很難用' },
		{ speaker: 0, text: '對，搜尋條件一直跑版，很難篩' },
		{ speaker: 1, text: '我後來改用 LINE 社群問認識的人' },
		{ speaker: 0, text: '熟人介紹的比較靠譜，房東比較有保障' },
		{ speaker: 1, text: '對，陌生房東的合約裡常常有奇怪條款' },
	] },

	// #58 (2-person)
	{ lines: [
		{ speaker: 0, text: '你有考慮在新北買房嗎？比台北便宜很多' },
		{ speaker: 1, text: '有想過，但通勤時間就拉長了' },
		{ speaker: 0, text: '我算過，買三重然後騎車，其實還好' },
		{ speaker: 1, text: '但早高峰橋上很塞，心臟要強一點' },
		{ speaker: 0, text: '可以選通勤聽 podcast，當作學習時間' },
	] },

	// #59 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '你們覺得台北還有可能回到合理房價嗎？' },
		{ speaker: 2, text: '我覺得不太可能，資金太多了' },
		{ speaker: 1, text: '政府政策有機會，但執行力是另一回事' },
		{ speaker: 0, text: '我有點悲觀，覺得只能往蛋白區買' },
		{ speaker: 2, text: '蛋白區也漲了一輪了...' },
		{ speaker: 1, text: '那就繼續租，把資金拿去投資報酬率更高' },
	] },

	// #60 (2-person)
	{ lines: [
		{ speaker: 1, text: '我最近在看老公寓改裝的物件，便宜很多' },
		{ speaker: 0, text: '幾年的大樓？要小心壁癌或管線問題' },
		{ speaker: 1, text: '四十年，但裝修過，內部很新' },
		{ speaker: 0, text: '要請驗屋師去看，幾千塊的費用省不得' },
		{ speaker: 1, text: '對，找一個有口碑的，不要貪便宜' },
	] },

	// ─── 13. 通勤日常 ───────────────────────────────────────────────

	// #61 (2-person)
	{ lines: [
		{ speaker: 0, text: '今天公車延誤了二十分鐘，差點遲到' },
		{ speaker: 1, text: '最近常常這樣，路上有施工嗎？' },
		{ speaker: 0, text: '不知道，司機說前面有事故' },
		{ speaker: 1, text: '要不要試看看騎 YouBike 加捷運？' },
		{ speaker: 0, text: '我想過，但風吹日曬有點不想' },
	] },

	// #62 (2-person)
	{ lines: [
		{ speaker: 1, text: '你通勤時都在做什麼？' },
		{ speaker: 0, text: '戴耳機聽 podcast，有時候看書' },
		{ speaker: 1, text: '哪種 podcast？' },
		{ speaker: 0, text: '工具性的，像是 Lex Fridman 或技術討論類的' },
		{ speaker: 1, text: '通勤變成進修時間，很厲害' },
		{ speaker: 0, text: '不然就是在浪費時間，要讓它有點意義' },
	] },

	// #63 (2-person)
	{ lines: [
		{ speaker: 0, text: '你有沒有試過提早半小時出門？差很多嗎？' },
		{ speaker: 1, text: '試過，車上有位子坐，整個人比較輕鬆到公司' },
		{ speaker: 0, text: '我每次都擠死人的那班' },
		{ speaker: 1, text: '而且早到還可以在公司喝杯咖啡再開始工作' },
		{ speaker: 0, text: '聽起來很美好，但要早半小時起床很痛苦' },
	] },

	// #64 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 2, text: '你們搭捷運碰過最奇怪的事情是什麼？' },
		{ speaker: 0, text: '有次旁邊的人一路站著睡覺，頭一直點' },
		{ speaker: 1, text: '那很常見啦，我自己也這樣過' },
		{ speaker: 2, text: '我遇過有人在車上剪指甲！' },
		{ speaker: 0, text: '天哪，那個太誇張了' },
		{ speaker: 1, text: '我碰過有人帶滷味上車，整節車廂都是味道' },
	] },

	// #65 (2-person)
	{ lines: [
		{ speaker: 0, text: '高鐵出差你喜歡坐哪個位置？' },
		{ speaker: 1, text: '靠窗！可以看風景又可以靠著睡覺' },
		{ speaker: 0, text: '我都靠走道，進出比較方便' },
		{ speaker: 1, text: '中間那個最慘，兩邊都不是' },
		{ speaker: 0, text: '訂票要快，週五下班那班尤其難訂' },
	] },

	// ─── 14. 遊戲 ──────────────────────────────────────────────────

	// #66 (2-person)
	{ lines: [
		{ speaker: 0, text: '你有在玩 Palworld 嗎？' },
		{ speaker: 1, text: '玩了一陣子，但後來被新遊戲搶走了' },
		{ speaker: 0, text: '什麼新遊戲？' },
		{ speaker: 1, text: '《神諭之劍》，劇情超長，我還在中期' },
		{ speaker: 0, text: '聽起來可以撐很多小時，我很需要' },
	] },

	// #67 (2-person)
	{ lines: [
		{ speaker: 1, text: '你手機現在在玩什麼遊戲？' },
		{ speaker: 0, text: '在玩一個解謎的，叫 Monument Valley 3' },
		{ speaker: 1, text: '視覺效果很漂亮對嗎？' },
		{ speaker: 0, text: '超美，但謎題越來越難，我卡了兩天' },
		{ speaker: 1, text: '這種不靠充錢的遊戲真的良心' },
	] },

	// #68 (2-person)
	{ lines: [
		{ speaker: 0, text: '你有加入什麼遊戲公會嗎？' },
		{ speaker: 1, text: '有，我在一個台灣玩家的小公會，很友善' },
		{ speaker: 0, text: '有沒有常常一起打副本？' },
		{ speaker: 1, text: '週末有排時間，但平日大家都忙' },
		{ speaker: 0, text: '台灣的打工族玩遊戲都是靠週末撐的' },
	] },

	// #69 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 1, text: 'Switch 你們有哪些遊戲沒打完的？' },
		{ speaker: 0, text: '我還有三個還沒開封的...' },
		{ speaker: 2, text: '哈哈，我也是，動森買了但玩了三天就放著' },
		{ speaker: 1, text: '動森要慢慢玩才有感，不能衝' },
		{ speaker: 0, text: '問題是我習慣衝就玩不下去' },
		{ speaker: 2, text: '那你比較適合動作類的，不要選慢節奏的' },
	] },

	// #70 (2-person)
	{ lines: [
		{ speaker: 0, text: '你有沒有在看電競比賽？' },
		{ speaker: 1, text: '有！昨天 League 決賽我看到半夜' },
		{ speaker: 0, text: '打得怎樣？' },
		{ speaker: 1, text: '台灣隊差一點，五局打到最後一局才輸' },
		{ speaker: 0, text: '好可惜，電競那個壓力真的不輸實體運動' },
	] },

	// ─── 15. 辦公室八卦 ────────────────────────────────────────────

	// #71 (2-person)
	{ lines: [
		{ speaker: 1, text: '你有沒有注意到 A 和 B 最近走很近？' },
		{ speaker: 0, text: '對啊，每次吃飯都一起，出去也常一起' },
		{ speaker: 1, text: '不知道是普通朋友還是有發展' },
		{ speaker: 0, text: '說不定他們本來就認識，別想太多' },
		{ speaker: 1, text: '也是，總之不關我們的事' },
	] },

	// #72 (2-person)
	{ lines: [
		{ speaker: 0, text: '聽說業務部最近換人了？' },
		{ speaker: 1, text: '有，那個老員工好像去新創公司了' },
		{ speaker: 0, text: '他在這邊很久了吧？' },
		{ speaker: 1, text: '七年，不知道是不是薪資問題' },
		{ speaker: 0, text: '七年不跳槽的人，一次跳一定跳很多' },
	] },

	// #73 (2-person)
	{ lines: [
		{ speaker: 1, text: '你知道茶水間的瑜珈課是誰在辦的嗎？' },
		{ speaker: 0, text: '是 HR 的新企劃，每週三中午辦一堂' },
		{ speaker: 1, text: '真的假的？免費嗎？' },
		{ speaker: 0, text: '好像是，我看通知說員工福利' },
		{ speaker: 1, text: '那我要去，好久沒做瑜珈了' },
	] },

	// #74 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '你們知道隔壁部門下個月要搬過來嗎？' },
		{ speaker: 1, text: '什麼？那我們這邊會更擠，要重新排座位？' },
		{ speaker: 2, text: '聽說是，我昨天看到總務在量空間' },
		{ speaker: 0, text: '拜託不要把我塞到角落去' },
		{ speaker: 1, text: '我想坐靠窗的，看外面比較放鬆' },
		{ speaker: 2, text: '靠窗夏天超熱，要帶電風扇' },
	] },

	// #75 (2-person)
	{ lines: [
		{ speaker: 1, text: '你有去參加昨天的桌遊之夜嗎？' },
		{ speaker: 0, text: '沒有，工作趕著搞定，走不開' },
		{ speaker: 1, text: '我去了！超好玩，玩了狼人殺' },
		{ speaker: 0, text: '你是好人陣營還是狼人？' },
		{ speaker: 1, text: '狼人！但第二輪就被投死了，撲克臉不夠' },
	] },

	// ─── 16. 音樂/演唱會 ───────────────────────────────────────────

	// #76 (2-person)
	{ lines: [
		{ speaker: 0, text: '五月天要在台灣開演唱會了，你搶到票嗎？' },
		{ speaker: 1, text: '沒有，那個搶票系統讓我崩潰' },
		{ speaker: 0, text: '我也沒有，秒殺真的太誇張' },
		{ speaker: 1, text: '只好等看看有沒有人轉讓，但又怕被詐騙' },
		{ speaker: 0, text: '轉讓的話一定要面交，千萬不要轉帳' },
	] },

	// #77 (2-person)
	{ lines: [
		{ speaker: 1, text: '你有在聽 Indie 音樂嗎？' },
		{ speaker: 0, text: '最近在聽落日飛車，很喜歡' },
		{ speaker: 1, text: '他們的風格很特別，有點夢幻又有搖滾感' },
		{ speaker: 0, text: '對！《Jinji Kikko》那張專輯我循環了一週' },
		{ speaker: 1, text: '台灣樂團的驕傲' },
	] },

	// #78 (2-person)
	{ lines: [
		{ speaker: 0, text: '你工作的時候聽古典樂嗎？' },
		{ speaker: 1, text: '有時候，寫需要專注的東西的時候' },
		{ speaker: 0, text: '有沒有推薦的曲子？' },
		{ speaker: 1, text: '巴哈的《哥德堡變奏曲》，很適合寫 code' },
		{ speaker: 0, text: '聽起來很學術，但我來試試看' },
	] },

	// #79 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 1, text: '有沒有人要一起去大港開唱音樂祭？' },
		{ speaker: 0, text: '我去過一次，很熱但超嗨！' },
		{ speaker: 2, text: '幾月的？要先排好假' },
		{ speaker: 1, text: '通常四月，要三月初就申請請假' },
		{ speaker: 0, text: '好，我也要去！揪一起訂旅館' },
		{ speaker: 2, text: '早點訂比較便宜，高雄那邊假日旅館超搶手' },
	] },

	// #80 (2-person)
	{ lines: [
		{ speaker: 0, text: '你有在練什麼樂器嗎？' },
		{ speaker: 1, text: '在學尤克里里，超好入門' },
		{ speaker: 0, text: '哇，可以彈給我們聽嗎？' },
		{ speaker: 1, text: '還只會《小星星》，等我練好再說' },
		{ speaker: 0, text: '加油！我在學鋼琴，主要是解壓用的' },
	] },

	// ─── 17. 學習新技術 ─────────────────────────────────────────────

	// #81 (2-person)
	{ lines: [
		{ speaker: 0, text: '你最近有在學 Kubernetes 嗎？' },
		{ speaker: 1, text: '看了幾個教學，但覺得概念還是很混亂' },
		{ speaker: 0, text: '我也是，最難的是搞清楚 Pod、Service 的關係' },
		{ speaker: 1, text: '我找到一個用圖解的教學，清楚很多，傳你' },
		{ speaker: 0, text: '謝謝！我也要看！' },
	] },

	// #82 (2-person)
	{ lines: [
		{ speaker: 1, text: '你有用過 LangChain 嗎？最近很多人在聊' },
		{ speaker: 0, text: '稍微玩過，主要是串 LLM 的 workflow 用的' },
		{ speaker: 1, text: '感覺學習曲線還好嗎？' },
		{ speaker: 0, text: 'Python 版比較好入門，JavaScript 版文件稍差' },
		{ speaker: 1, text: '好，那我先從 Python 版開始研究' },
	] },

	// #83 (2-person)
	{ lines: [
		{ speaker: 0, text: '你有買過什麼線上課程嗎？' },
		{ speaker: 1, text: 'Udemy 買了超多，但真正看完的只有兩三個' },
		{ speaker: 0, text: '哈哈，我也一樣，特價就買，買了就放著' },
		{ speaker: 1, text: '現在我改成把課程加到行事曆，強迫自己看' },
		{ speaker: 0, text: '這個方法好，我也要試試看' },
	] },

	// #84 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 2, text: 'GraphQL 和 REST API 你們比較喜歡用哪個？' },
		{ speaker: 0, text: '看情況，小專案還是 REST 省事' },
		{ speaker: 1, text: '前端需求複雜的話 GraphQL 彈性大很多' },
		{ speaker: 2, text: '我最近在學，schema 定義一開始有點麻煩' },
		{ speaker: 0, text: '設計好了之後維護容易很多，值得花時間' },
		{ speaker: 1, text: '用 TypeGraphQL 可以讓 TypeScript 整合更順' },
	] },

	// #85 (2-person)
	{ lines: [
		{ speaker: 0, text: 'AI 程式工具你在用什麼？' },
		{ speaker: 1, text: '我主要用 Cursor，感覺比 Copilot 更懂 context' },
		{ speaker: 0, text: 'Cursor 可以對話解釋整個 codebase 嗎？' },
		{ speaker: 1, text: '對，很強，試一下就知道了' },
		{ speaker: 0, text: '那公司機密要注意不要貼進去' },
		{ speaker: 1, text: '一般邏輯問題是沒差，機密的確要小心' },
	] },

	// ─── 18. 網購/特價 ─────────────────────────────────────────────

	// #86 (2-person)
	{ lines: [
		{ speaker: 0, text: '蝦皮超級購物節你有列清單了嗎？' },
		{ speaker: 1, text: '列了，但我說好自己只能買三樣' },
		{ speaker: 0, text: '說好跟最後買的絕對是兩碼事' },
		{ speaker: 1, text: '說的對，上次我說五樣結果買了十二個' },
		{ speaker: 0, text: '哈哈，這就是購物節的魔法' },
	] },

	// #87 (2-person)
	{ lines: [
		{ speaker: 1, text: '你有用什麼省錢的方式買東西嗎？' },
		{ speaker: 0, text: '我都先加入購物車等降價通知' },
		{ speaker: 1, text: '有推薦的比價工具嗎？' },
		{ speaker: 0, text: '用 Keepa 可以看 Amazon 的歷史價格趨勢' },
		{ speaker: 1, text: '原來有這個，感覺很實用！' },
	] },

	// #88 (2-person)
	{ lines: [
		{ speaker: 0, text: '我上次在 PChome 等包裹等了一週才到' },
		{ speaker: 1, text: '現在改用蝦皮比較快，大概兩天' },
		{ speaker: 0, text: '問題是蝦皮有些物品沒有' },
		{ speaker: 1, text: '多平台比較啦，哪個便宜買哪個' },
		{ speaker: 0, text: '太麻煩了，我懶...' },
		{ speaker: 1, text: '懶是最貴的' },
	] },

	// #89 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 1, text: '有人知道哪裡可以買平價桌面周邊嗎？' },
		{ speaker: 0, text: '我都在 Taobao 找，但要等比較久' },
		{ speaker: 2, text: 'Aliexpress 有台灣倉庫可以快速到，品質要看賣家評價' },
		{ speaker: 1, text: '有沒有推薦的商品？' },
		{ speaker: 2, text: '我買過一個鍵盤腕托很不錯，五百塊以下' },
		{ speaker: 1, text: '傳連結給我！我最近也需要' },
	] },

	// #90 (2-person)
	{ lines: [
		{ speaker: 0, text: '你有在用信用卡回饋嗎？' },
		{ speaker: 1, text: '有！我辦了一張網購回饋 5% 的，很好用' },
		{ speaker: 0, text: '哪張？聽起來很猛' },
		{ speaker: 1, text: '玉山 Ubear，網購和超商都有回饋' },
		{ speaker: 0, text: '我都忘記要換卡，一直用同一張，太懶了' },
	] },

	// ─── 19. 減肥/健康飲食 ────────────────────────────────────────

	// #91 (2-person)
	{ lines: [
		{ speaker: 0, text: '你有在試什麼飲食方法嗎？' },
		{ speaker: 1, text: '最近在試間歇性斷食，16:8 那種' },
		{ speaker: 0, text: '效果如何？肚子會餓嗎？' },
		{ speaker: 1, text: '前兩週很難熬，習慣了之後還好' },
		{ speaker: 0, text: '有沒有掉幾公斤？' },
		{ speaker: 1, text: '一個月掉了三公斤，不算快但很穩' },
	] },

	// #92 (2-person)
	{ lines: [
		{ speaker: 1, text: '你覺得吃低碳水飲食怎麼樣？' },
		{ speaker: 0, text: '試過，前期確實瘦得快，但很想吃飯' },
		{ speaker: 1, text: '我在考慮，主要是工程師生活太靜態了' },
		{ speaker: 0, text: '其實搭配運動效果更好，不用那麼極端' },
		{ speaker: 1, text: '說得對，先把運動習慣養起來再說' },
	] },

	// #93 (2-person)
	{ lines: [
		{ speaker: 0, text: '你午餐都吃什麼來維持體重？' },
		{ speaker: 1, text: '便當裡的白飯我只吃一半，菜吃完' },
		{ speaker: 0, text: '這樣不會撐不住嗎？' },
		{ speaker: 1, text: '下午三點會餓，所以我備著堅果當點心' },
		{ speaker: 0, text: '聰明，熱量也不高' },
	] },

	// #94 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 2, text: '我最近開始記錄每天的蛋白質攝取量' },
		{ speaker: 0, text: '用什麼 app 記？' },
		{ speaker: 2, text: 'MyFitnessPal，掃描條碼很方便，目標是體重乘以 1.5' },
		{ speaker: 1, text: '一百克？我光靠正餐根本吃不到' },
		{ speaker: 2, text: '所以才要喝蛋白粉補充啊' },
		{ speaker: 0, text: '這樣算下來每個月蛋白粉的花費也不少' },
	] },

	// #95 (2-person)
	{ lines: [
		{ speaker: 0, text: '公司附近哪裡有健康餐？' },
		{ speaker: 1, text: '對面那家便當有低卡選項，我上個月常訂' },
		{ speaker: 0, text: '是不是有雞胸肉糙米版那種？' },
		{ speaker: 1, text: '對！很有飽足感，一個才 130，很划算' },
		{ speaker: 0, text: '那等等幫我訂一個，我也想試試看' },
	] },

	// ─── 20. 週末計劃 ───────────────────────────────────────────────

	// #96 (2-person)
	{ lines: [
		{ speaker: 0, text: '這週末你有什麼打算？' },
		{ speaker: 1, text: '想去北投泡溫泉，最近有點累了' },
		{ speaker: 0, text: '北投的溫泉品質很好，酸性的對皮膚好' },
		{ speaker: 1, text: '有沒有推薦的地方？平價就好' },
		{ speaker: 0, text: '地熱谷旁邊有幾間公共浴場，很便宜' },
	] },

	// #97 (2-person)
	{ lines: [
		{ speaker: 1, text: '週末有沒有想看什麼展覽？' },
		{ speaker: 0, text: '台北當代藝術館有個攝影展，評價很好' },
		{ speaker: 1, text: '聽說是日本攝影師的回顧展' },
		{ speaker: 0, text: '那我可以考慮，你要一起去嗎？' },
		{ speaker: 1, text: '好啊，週六下午去，看完再找地方吃晚餐' },
	] },

	// #98 (2-person)
	{ lines: [
		{ speaker: 0, text: '下週末是長週末，你要去哪裡充電？' },
		{ speaker: 1, text: '說真的就想耍廢，不想出門' },
		{ speaker: 0, text: '我懂，有時候最好的假日就是不做任何事' },
		{ speaker: 1, text: '對，囤一堆劇，買一堆零食，躺著不動' },
		{ speaker: 0, text: '這種假聽起來也很需要' },
	] },

	// #99 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 1, text: '你們週末要不要一起去爬山？' },
		{ speaker: 0, text: '最近一直宅著，好啊！去哪？' },
		{ speaker: 2, text: '難度怎樣？我有點怕太難的' },
		{ speaker: 1, text: '輕鬆路線，去大屯山，兩小時來回' },
		{ speaker: 0, text: '這個我可以接受，不算太硬' },
		{ speaker: 2, text: '那好，幾點出發？早點去人少又涼快' },
	] },

	// #100 (3-person)
	{ speakerCount: 3, lines: [
		{ speaker: 0, text: '週末誰要去逛夜市？' },
		{ speaker: 2, text: '我要！好久沒去寧夏夜市了' },
		{ speaker: 1, text: '那邊的蚵仔煎和紅豆餅是我的最愛' },
		{ speaker: 0, text: '我主要為了那個芋頭牛奶去的' },
		{ speaker: 2, text: '全部都要吃！邊走邊吃那種' },
		{ speaker: 1, text: '好，六點出發？剛吃完晚飯空腹去，戰力最強' },
	] },
];
