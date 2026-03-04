# 常見調度模式（詳細版）

## 模式 A：完整功能開發（分階段）

**階段 1：需求分析 + 設計**
```
[PIPELINE]
[TASK:pm]        釐清需求 → 產出 user story 和驗收條件 [/TASK]
[TASK:architect]  設計系統架構 → 產出技術方案、API 規範和資料模型 [/TASK]
[TASK:designer]   設計 UI/UX → 產出 HTML 設計稿到 designs/（預設用 HTML/CSS） [/TASK]
[/PIPELINE]
```
收到結果後：審核所有產出（.html 用 Read 確認，.pen 用 Pencil MCP 截圖確認）
→ 暫停：回報設計稿和架構方案給用戶確認

**階段 2：前端實作 + 部署預覽**
```
[TASK:frontend]   實作前端（附上設計稿路徑和 API 規範，要求 100% 還原設計） [/TASK]
```
收到結果後審核，通過則進入品質閘門：
```
[PIPELINE parallel]
[TASK:reviewer]   程式碼審查前端（正確性、安全性、效能、可讀性、測試覆蓋）→ 有問題就列出 [/TASK]
[TASK:qa]         測試前端功能完整性、響應式（附上需求和驗收條件）→ 有問題就列出 [/TASK]
[TASK:security]   前端資安審查（XSS、CSRF、敏感資料處理、依賴安全）→ 有問題就列出 [/TASK]
[/PIPELINE]
```
收到審查結果後：統一審核，有問題退回前端修復（用 bare `[TASK:frontend]`），通過則：
```
[TASK:devops]    部署前端到 GitHub + Vercel（參考 skills2/deploy-preview 的流程） [/TASK]
```
→ 暫停：回報前端成果和預覽 URL 給用戶確認

**階段 3：後端實作 + DBA + 最終部署**
```
[PIPELINE]
[TASK:dba]       設計資料庫 schema、索引策略、migration 計畫（附上架構師的資料模型） [/TASK]
[TASK:backend]   實作後端（附上 API 規範，系統會自動附上 DBA 的 schema 設計） [/TASK]
[/PIPELINE]
```
收到結果後審核，通過則進入品質閘門：
```
[PIPELINE parallel]
[TASK:reviewer]  程式碼審查後端（正確性、安全性、效能、可讀性、SQL 參數化）→ 有問題就列出 [/TASK]
[TASK:qa]        測試後端 API 功能完整性（附上 API 規範和驗收條件）→ 有問題就列出 [/TASK]
[TASK:security]  後端資安審查（認證、授權、SQL injection、敏感資料）→ 有問題就列出 [/TASK]
[/PIPELINE]
```
收到審查結果後：統一審核，有問題退回後端修復，通過則：
```
[TASK:devops]    全端部署到 GitHub + Vercel（參考 skills2/deploy-preview 的流程） [/TASK]
```
總結回報（包含部署 URL）

> **連續模式**：若用戶說「一次做到底」，跳過中間暫停，各階段 pipeline 連續執行。

## 模式 B：快速 Bug 修復

```
1. 分析問題描述，判斷是前端還是後端問題
2. [TASK:frontend/backend] 修復 bug
3. [TASK:qa] 驗證修復（可選）
4. 總結回報
```

## 模式 C：技術諮詢

```
1. [TASK:architect] 分析問題並提出建議
2. 你審核後直接回覆用戶
```

## 模式 D：純前端網站/Landing Page（分階段）

**階段 1：需求 + 設計**
```
[PIPELINE]
[TASK:pm]        釐清需求 → 產出 user story 和驗收條件 [/TASK]
[TASK:designer]   設計完整頁面 → 產出 HTML 設計稿到 designs/（預設用 HTML/CSS） [/TASK]
[/PIPELINE]
```
收到結果後：審核所有產出（.html 用 Read 確認，.pen 用 Pencil MCP 截圖確認）
→ 暫停：回報設計稿給用戶確認

**階段 2：前端實作 + 部署**
```
[TASK:frontend]   根據設計稿實作（附上設計稿路徑，要求 100% 還原設計） [/TASK]
```
收到結果後審核，通過則進入品質閘門：
```
[PIPELINE parallel]
[TASK:reviewer]   程式碼審查前端（正確性、安全性、效能、可讀性）→ 有問題就列出 [/TASK]
[TASK:qa]         測試頁面功能完整性、響應式、跨瀏覽器（附上需求和驗收條件） [/TASK]
[TASK:security]   前端資安審查（XSS、依賴安全、敏感資料） [/TASK]
[/PIPELINE]
```
收到審查結果後：統一審核，有問題退回前端修復，通過則：
```
[TASK:devops]    部署到 GitHub + Vercel（參考 skills2/deploy-preview 的流程） [/TASK]
```
總結回報（包含部署 URL）

> **連續模式**：若用戶說「一次做到底」，跳過中間暫停，各階段 pipeline 連續執行。

## 模式 E：程式碼審查

```
1. [TASK:reviewer] 審查程式碼
2. [TASK:security] 安全審查（如果涉及認證/權限）
3. 彙整審查結果回覆
```
