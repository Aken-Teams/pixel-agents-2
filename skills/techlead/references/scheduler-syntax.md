# 排程語法參考

## [SCHEDULE] 區塊格式

在回覆中使用 `[SCHEDULE]...[/SCHEDULE]` 區塊來建立排程任務。系統會自動解析並建立排程。

## 任務類型

### 1. 一次性提醒（once）
```
[SCHEDULE]
type: once
trigger: +5m
action: notify
message: 五分鐘到了！該休息一下
description: 休息提醒
[/SCHEDULE]
```

**trigger 支援的格式**：
- 相對時間：`+1m`（1 分鐘後）、`+5m`、`+30m`、`+1h`、`+2h`
- 時間：`15:00`（今天下午三點，若已過則明天）
- ISO 日期：`2026-03-07T15:00:00`

### 2. 定時任務（recurring）
```
[SCHEDULE]
type: recurring
pattern: daily
time: 09:00
action: orchestrator
message: 請檢查目前進行中的專案進度，整理一份簡短報告
description: 每日進度檢查
[/SCHEDULE]
```

**pattern 選項**：
- `daily`：每天執行
- `weekly`：每週執行（需指定 `dayOfWeek`，0=週日, 1=週一, ..., 6=週六）
- `monthly`：每月執行（需指定 `dayOfMonth`，1-31）

**weekly 範例**：
```
[SCHEDULE]
type: recurring
pattern: weekly
time: 10:00
dayOfWeek: 1
action: orchestrator
message: 請產出本週工作進度報告
description: 每週一進度報告
[/SCHEDULE]
```

### 3. 記憶備忘（memory）
不觸發任何動作，但會永久記在系統中，每次你收到新訊息時都能看到。
```
[SCHEDULE]
type: memory
message: 客戶希望在週五前完成登入功能的 UI 改版
description: 客戶需求備忘
[/SCHEDULE]
```

## 欄位說明

| 欄位 | 必填 | 說明 |
|------|------|------|
| type | ✅ | `once`、`recurring`、`memory` |
| message | ✅ | 觸發時發送的訊息內容 |
| description | ❌ | 人類可讀的簡短描述（預設取 message 前 50 字） |
| trigger | once 必填 | 相對時間（`+5m`、`+1h`）、時間（`15:00`）或 ISO 日期時間 |
| pattern | recurring 必填 | `daily`、`weekly`、`monthly` |
| time | recurring 必填 | 執行時間，`HH:mm` 格式（24 小時制） |
| dayOfWeek | weekly 必填 | 0-6（0=週日） |
| dayOfMonth | monthly 必填 | 1-31 |
| action | ❌ | `orchestrator`（預設，CTO 處理）或 `notify`（僅通知） |

## 最小時間間隔

| 類型 | 最小間隔 |
|------|----------|
| once（一次性） | 1 分鐘 |
| recurring（定時） | 30 分鐘（daily/weekly/monthly 皆適用） |

- 一次性提醒至少要在 1 分鐘後觸發
- 定時任務不可設定為每隔幾秒或幾分鐘執行，最小單位為每天一次
- 若用戶要求過於頻繁的定時任務，請建議改為合理的間隔

## 使用時機

- 用戶說「提醒我...」→ 建立 `once` 排程
- 用戶說「每天/每週/每月...」→ 建立 `recurring` 排程
- 用戶說「記住...」「不要忘記...」→ 建立 `memory` 備忘
- 一次可以建立多個 `[SCHEDULE]` 區塊
