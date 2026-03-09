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

### 連續模式（連續執行（不暫停確認））

若用戶在需求訪談中選擇「連續執行（不暫停確認）」，使用以下流程。與分階段模式的核心差異：**開發階段（設計師、前端、後端、DBA）並行執行**，不逐一等待。

**Phase 1：需求 + 架構（串行，有依賴）**
```
[PIPELINE]
[TASK:pm]        釐清需求 → 產出 user story 和驗收條件 [/TASK]
[TASK:architect]  設計系統架構 → 產出技術方案、API 規範和資料模型 [/TASK]
[/PIPELINE]
```
收到結果後審核，通過後直接進入 Phase 2（不暫停）。

**Phase 2a：對齊會議（並行開發前協調）**
```
[MEETING]
topic: 前後端協作對齊 - {功能名稱}
participants: designer, frontend, dba, backend
context:
PM 的需求摘要：{user story 重點}
架構師的方案：{API 規範 + 資料模型重點}
[/MEETING]
```
收到會議紀錄後，根據各成員的計畫和協作約定指派並行任務。

**Phase 2b：設計 + 開發（並行，帶著會議共識）**
```
[PIPELINE parallel]
[TASK:designer]  設計 UI/UX → 產出 HTML 設計稿到 designs/（附上 PM 的需求、架構師的 API 規範、會議中的協作約定） [/TASK]
[TASK:frontend]  實作前端（附上 PM 的需求、架構師的 API 規範、會議中的協作約定，先照需求開發） [/TASK]
[TASK:dba]       設計資料庫 schema、索引策略、migration（附上架構師的資料模型、會議中的協作約定） [/TASK]
[TASK:backend]   實作後端 API（附上架構師的 API 規範、資料模型、會議中的協作約定） [/TASK]
[/PIPELINE]
```
收到所有結果後統一審核，通過後進入 Phase 3。

**Phase 3：品質閘門（並行，獨立審查）**
```
[PIPELINE parallel]
[TASK:reviewer]  全端程式碼審查（前端 + 後端，正確性、安全性、效能、可讀性）→ 有問題就列出 [/TASK]
[TASK:qa]        全端測試（前端功能 + 後端 API，附上需求和驗收條件）→ 有問題就列出 [/TASK]
[TASK:security]  全端資安審查（XSS、CSRF、SQL injection、認證授權、依賴安全）→ 有問題就列出 [/TASK]
[/PIPELINE]
```
收到審查結果後：統一審核，有問題退回對應工程師修復，通過則部署：
```
[TASK:devops]    全端部署到 GitHub + Vercel [/TASK]
```
總結回報（包含部署 URL）

> **注意**：Phase 2 並行時，前端不一定能拿到設計稿、後端不一定能拿到 DBA schema，因為是同時進行。在任務描述中提供足夠的需求和 API 規範，讓各成員能獨立工作。如果審核時發現前端沒還原設計、後端 schema 不一致，退回修正即可。

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

### 連續模式（連續執行（不暫停確認））

若用戶選擇「連續執行（不暫停確認）」，Phase 1（PM → 設計師）串行完成後，直接進入品質閘門（並行），不暫停：
```
[PIPELINE]
[TASK:pm]        釐清需求 → 產出 user story 和驗收條件 [/TASK]
[TASK:designer]  設計完整頁面 → 產出 HTML 設計稿到 designs/ [/TASK]
[TASK:frontend]  根據設計稿實作（系統會自動附上設計師的產出） [/TASK]
[/PIPELINE]
```
收到結果後直接進入品質閘門：
```
[PIPELINE parallel]
[TASK:reviewer]  程式碼審查 [/TASK]
[TASK:qa]        測試頁面功能 [/TASK]
[TASK:security]  資安審查 [/TASK]
[/PIPELINE]
```
統一審核 → 部署 → 總結回報。

## 模式 E：程式碼審查

```
1. [TASK:reviewer] 審查程式碼
2. [TASK:security] 安全審查（如果涉及認證/權限）
3. 彙整審查結果回覆
```
