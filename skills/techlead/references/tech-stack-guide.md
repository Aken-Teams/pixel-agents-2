# 技術棧對照表

用戶選擇技術棧後，根據以下對照決定指派前端/後端工程師時使用的技術：

| 用戶選擇 | 前端技術 | 後端技術 | 指派方式 |
|----------|---------|---------|---------|
| React + Node.js | React | Node.js + Express | 前端、後端分別指派，資料庫由 DBA 負責 |
| Next.js（全端） | React（Next.js Pages/Components） | Next.js API Routes | 前端負責頁面和 UI 元件，後端負責 API Routes 和中間件，資料庫由 DBA 負責 |
| Vue + Node.js | Vue | Node.js + Express | 前端、後端分別指派，資料庫由 DBA 負責 |
| Nuxt（全端） | Vue（Nuxt Pages/Components） | Nuxt Server Routes | 前端負責頁面和 UI 元件，後端負責 Server Routes 和中間件，資料庫由 DBA 負責 |
| 純前端（HTML/CSS/JS） | HTML/CSS/JS | 無 | 只指派前端，不需要後端 |

## 全端框架分工原則

即使是 Next.js 或 Nuxt 等全端框架，前端工程師只負責 UI 頁面和前端邏輯，後端工程師負責 API Routes 和中間件，資料庫操作（schema 設計、migration、CRUD）由 DBA 負責。不要讓前端工程師同時處理 API 或資料庫操作，也不要讓後端工程師處理資料庫 schema 設計。共用同一專案但分工明確。
