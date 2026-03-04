# UI/UX Pro Max 偵測與模式切換

## Step 0：偵測設計智慧工具

在開始設計之前，先檢查環境是否有 UI/UX Pro Max 設計知識庫：

```bash
for p in "$HOME/.claude" "/d/.claude" "/c/.claude" "D:/.claude" "C:/.claude"; do
  [ -d "$p/skills/ui-ux-pro-max/scripts" ] && UIUX_DIR="$p/skills/ui-ux-pro-max/scripts" && echo "UIUX_AVAILABLE: $UIUX_DIR" && break
done
[ -z "$UIUX_DIR" ] && echo "UIUX_NOT_AVAILABLE"
```

- **如果 `UIUX_AVAILABLE`**：記住 `$UIUX_DIR` 路徑，使用模式 A+（HTML/CSS + UI/UX Pro Max 輔助）
- **如果 `UIUX_NOT_AVAILABLE`**：使用模式 A（HTML/CSS，依自身設計經驗）
- **如果技術長指定使用 Pencil MCP**：使用模式 B，不使用 UI/UX Pro Max

## 設計模式（依優先順序）

### 模式 A+（首選）：HTML/CSS + UI/UX Pro Max

> 僅在 Step 0 偵測到 `UIUX_AVAILABLE` 時使用此模式。

在建立 HTML/CSS 設計稿之前，先用 UI/UX Pro Max 搜尋設計知識庫，取得專業的設計方向：

**搜尋流程（依序執行，根據需求選擇）：**

Step 0 偵測到的目錄存入 `$UIUX_DIR`，搜尋時必須先 `cd` 到該目錄（因為腳本需要相對引用 core 模組）：

```bash
# 1. 搜尋產品類型 → 取得風格推薦
cd "$UIUX_DIR" && python search.py "SaaS dashboard" --domain product

# 2. 搜尋設計風格 → 取得色彩、特效、框架建議
cd "$UIUX_DIR" && python search.py "glassmorphism minimal" --domain style

# 3. 搜尋字型搭配 → 取得 Google Fonts import 和 CSS
cd "$UIUX_DIR" && python search.py "elegant professional" --domain typography

# 4. 搜尋配色方案 → 取得完整色票（Primary/Secondary/CTA/Background/Text/Border）
cd "$UIUX_DIR" && python search.py "saas fintech" --domain color

# 5. 搜尋頁面結構（Landing Page 時使用）
cd "$UIUX_DIR" && python search.py "hero-centric social-proof" --domain landing

# 6. 搜尋 UX 指引 → 取得最佳實踐和反模式
cd "$UIUX_DIR" && python search.py "animation accessibility" --domain ux

# 7. 搜尋技術棧指引（根據前端使用的框架）
cd "$UIUX_DIR" && python search.py "layout responsive" --stack html-tailwind
```

**可用的 domain：** `product`、`style`、`typography`、`color`、`landing`、`chart`、`ux`、`prompt`
**可用的 stack：** `html-tailwind`、`react`、`nextjs`、`vue`、`svelte`、`swiftui`、`react-native`、`flutter`

將搜尋結果作為設計依據，然後按照以下要求產出 HTML/CSS 設計稿。

**HTML 設計稿要求（與模式 A 相同）：**

1. 在 `designs/` 目錄下建立 HTML 檔案（如 `designs/homepage.html`）
2. 使用 `<style>` 標籤內嵌所有 CSS，不需要建置工具
3. 確保設計稿可以直接用瀏覽器打開檢視
4. 包含所有頁面狀態（正常、hover、載入中、錯誤、空狀態）
5. 單一 HTML 檔案，所有 CSS 內嵌
6. 使用真實的文字內容，不用 Lorem ipsum
7. 響應式設計（至少覆蓋 375px 手機和 1440px 桌面）
8. 色彩、字型、間距都用 CSS 變數定義，方便前端工程師提取
9. 設計要精緻、有質感，要達到可以直接上線的視覺水準
10. 使用搜尋結果建議的 Google Fonts 字型搭配
11. 加入適當的陰影、圓角、漸層等細節

**產出：** HTML 檔案路徑（如 `designs/homepage.html`）

### 模式 A（預設）：HTML/CSS 靜態設計稿

> 當環境沒有 UI/UX Pro Max 時使用此模式。

使用 HTML + CSS 建立高保真靜態設計稿，讓任何人都能直接用瀏覽器打開檢視：

1. 在 `designs/` 目錄下建立 HTML 檔案（如 `designs/homepage.html`）
2. 使用 `<style>` 標籤內嵌所有 CSS，不需要建置工具
3. 確保設計稿可以直接用瀏覽器打開檢視
4. 包含所有頁面狀態（正常、hover、載入中、錯誤、空狀態）

**HTML 設計稿要求：**

- 單一 HTML 檔案，所有 CSS 內嵌
- 使用真實的文字內容，不用 Lorem ipsum
- 響應式設計（至少覆蓋 375px 手機和 1440px 桌面）
- 色彩、字型、間距都用 CSS 變數定義，方便前端工程師提取
- 設計要精緻、有質感，不是簡陋的原型。要達到可以直接上線的視覺水準
- 使用 Google Fonts 或系統字型，排版要有層次感
- 加入適當的陰影、圓角、漸層等細節

**產出：** HTML 檔案路徑（如 `designs/homepage.html`）

### 模式 B（備選）：Pencil MCP 設計稿

> 只有當技術長明確要求使用 Pencil MCP 時才使用此模式。預設請用模式 A。

如果技術長指定使用 Pencil，使用 `mcp__pencil` 系列工具建立 `.pen` 設計檔：

1. 呼叫 `mcp__pencil__get_editor_state` 確認目前編輯器狀態
2. 呼叫 `mcp__pencil__open_document` 時**必須傳入完整檔案路徑**（如 `designs/homepage.pen`），**絕對不要傳 "new"**，否則檔案不會存到專案目錄
3. 呼叫 `mcp__pencil__get_guidelines` 取得設計指引（根據任務類型選擇 topic：`landing-page`、`design-system`、`web-app`）
4. 呼叫 `mcp__pencil__get_style_guide_tags` 和 `mcp__pencil__get_style_guide` 取得風格靈感
5. 使用 `mcp__pencil__batch_design` 建立設計稿
6. 使用 `mcp__pencil__get_screenshot` 驗證設計結果
7. 將 .pen 檔存放在專案的 `designs/` 目錄下

**Pencil 設計流程：**

```
1. 取得指引和風格 → get_guidelines + get_style_guide
2. 建立頁面結構 → batch_design（建立 frame、layout）
3. 設計元件 → batch_design（按鈕、表單、卡片等）
4. 填入內容 → batch_design（文字、圖片）
5. 截圖驗證 → get_screenshot
6. 修正調整 → batch_design（微調間距、色彩）
7. 最終截圖 → get_screenshot 確認
```

**產出：** `.pen` 設計檔路徑（如 `designs/homepage.pen`）
