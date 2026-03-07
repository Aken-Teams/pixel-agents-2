# 瀏覽器工具參考

## 概述

瀏覽器工具基於 Puppeteer + Stealth Plugin，可以像真人一樣操作瀏覽器。
所有搜尋請使用 DuckDuckGo，避免 Google 反爬蟲封鎖。

## 工具列表

### 1. `mcp__browser__browser_search` — 搜尋
用 DuckDuckGo 搜尋，回傳前 8 筆結果（標題 + URL + 摘要）。

```
query: "TypeScript 5.0 new features"
```

### 2. `mcp__browser__browser_navigate` — 開啟網頁
導航到指定 URL，回傳頁面標題和文字內容（前 8000 字）。

```
url: "https://docs.example.com/api"
```

### 3. `mcp__browser__browser_click` — 點擊元素
用 CSS selector 點擊頁面上的元素。

```
selector: "button.submit"
selector: "#login-btn"
selector: "a[href='/about']"
```

### 4. `mcp__browser__browser_type` — 打字
在輸入框中打字，可選擇是否按 Enter。

```
selector: "input[name='search']"
text: "pixel agents"
pressEnter: true
```

### 5. `mcp__browser__browser_screenshot` — 截圖
截取當前頁面畫面，回傳 PNG 圖片。

```
fullPage: false   # 只截視窗範圍（預設）
fullPage: true    # 截整個頁面（包含捲動區域）
```

### 6. `mcp__browser__browser_get_text` — 取得文字
取得頁面或特定元素的文字內容。

```
selector: ".article-content"   # 特定元素
# 不傳 selector = 整個頁面
```

### 7. `mcp__browser__browser_back` — 返回上一頁
無參數。

### 8. `mcp__browser__browser_evaluate` — 執行 JavaScript
在頁面中執行 JavaScript，回傳結果。

```
script: "document.querySelectorAll('a').length"
script: "window.location.href"
```

## 使用場景範例

### 搜尋技術文件
1. `browser_search` → 搜尋關鍵字
2. `browser_navigate` → 打開最相關的結果
3. `browser_get_text` → 取得需要的內容

### 測試前端頁面
1. `browser_navigate` → 開啟 dev server URL
2. `browser_screenshot` → 截圖確認畫面
3. `browser_click` + `browser_type` → 操作表單
4. `browser_screenshot` → 截圖驗證結果

### 幫用戶操作瀏覽器
1. `browser_navigate` → 開啟目標網站
2. `browser_type` → 填寫表單
3. `browser_click` → 提交
4. `browser_get_text` → 讀取結果

## 注意事項

- **搜尋引擎**：一律使用 `browser_search`（DuckDuckGo），不要手動 navigate 到 Google
- **等待時間**：工具內建等待機制，不需要手動 sleep
- **Selector**：使用標準 CSS selector 語法
- **瀏覽器生命週期**：閒置 5 分鐘自動關閉，下次使用時自動重啟
- **隱私**：Stealth Plugin 會隱藏無頭瀏覽器特徵，減少被封鎖的風險
- **內容長度**：`browser_navigate` 和 `browser_get_text` 會截斷過長的內容
