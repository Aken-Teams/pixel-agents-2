# 技術決策表

## 狀態管理選擇

| 情境 | 推薦方案 | 理由 |
|------|----------|------|
| 單一元件內的 UI 狀態 | `useState` | 最簡單，不需要額外依賴 |
| 父子元件間共享（2-3 層） | props 傳遞 + `useState` | 層級少時不需要 context |
| 跨多層元件共享 | `React.createContext` + `useContext` | 避免 prop drilling |
| 複雜表單狀態 | `useReducer` 或 React Hook Form | 多欄位、多驗證規則 |
| 全域應用狀態（Auth / Theme） | Context + useReducer | 不需要外部套件 |
| 需要跨頁面持久化 | Zustand 或 Jotai | 輕量，API 簡潔 |
| 伺服器狀態（API 資料） | TanStack Query (React Query) | 自動快取、重新取得、樂觀更新 |

## 樣式方案選擇

| 情境 | 推薦方案 | 理由 |
|------|----------|------|
| 專案已用 Tailwind | Tailwind CSS | 保持一致性 |
| 需要動態樣式（依 props 變化） | Tailwind + `clsx` / `cn()` | 條件式 class 組合 |
| 元件庫開發 | CSS Modules | 確保樣式隔離 |
| 複雜動畫 | CSS transition / animation | 優先用 CSS，避免 JS 驅動 |
| 極少量樣式覆蓋 | inline style（僅限動態計算值） | 如 `style={{ width: \`${percent}%\` }}` |

## 效能優化策略

| 問題 | 解法 | 使用前提 |
|------|------|----------|
| 子元件不必要的重新渲染 | `React.memo` | 經過 profiler 確認是瓶頸 |
| 昂貴的計算結果 | `useMemo` | 計算成本高且 deps 不常變 |
| 事件處理函式造成子元件重渲染 | `useCallback` | 子元件已用 `React.memo` |
| 大型列表 | 虛擬捲動（react-window / tanstack-virtual） | 項目數超過 100 |
| 首屏載入慢 | `React.lazy` + `Suspense` | 非首屏必要的路由或模組 |
| 圖片載入慢 | `<Image>` (Next.js) 或 lazy loading | 所有非 above-the-fold 圖片 |
| Bundle 過大 | 動態 import + tree shaking 確認 | 分析 bundle 後再行動 |
