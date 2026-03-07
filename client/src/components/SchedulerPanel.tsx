import { useState } from 'react'
import { wsClient } from '../wsClient.js'

export interface ScheduledTask {
  id: string
  type: 'once' | 'recurring' | 'memory'
  description: string
  createdBy: string
  createdAt: string
  triggerAt?: string
  recurring?: {
    pattern: 'daily' | 'weekly' | 'monthly'
    time: string
    dayOfWeek?: number
    dayOfMonth?: number
  }
  action: 'orchestrator' | 'notify'
  message: string
  enabled: boolean
  lastRun?: string
  nextRun?: string
}

interface SchedulerPanelProps {
  isOpen: boolean
  onClose: () => void
  tasks: ScheduledTask[]
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const SYS_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans TC', 'Microsoft JhengHei', sans-serif"

function formatNextRun(task: ScheduledTask): string {
  if (task.type === 'memory') return '記憶備忘'
  if (!task.nextRun) return task.enabled ? '已過期' : '已停用'
  const d = new Date(task.nextRun)
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()

  if (diffMs < 0) return '即將觸發'
  if (diffMs < 60_000) return `${Math.ceil(diffMs / 1000)} 秒後`
  if (diffMs < 3600_000) return `${Math.ceil(diffMs / 60_000)} 分鐘後`
  if (diffMs < 86400_000) return `${Math.ceil(diffMs / 3600_000)} 小時後`

  return d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatRecurring(task: ScheduledTask): string {
  if (!task.recurring) return ''
  const { pattern, time, dayOfWeek, dayOfMonth } = task.recurring
  if (pattern === 'daily') return `每天 ${time}`
  if (pattern === 'weekly' && dayOfWeek !== undefined) return `每週${WEEKDAYS[dayOfWeek]} ${time}`
  if (pattern === 'monthly' && dayOfMonth !== undefined) return `每月 ${dayOfMonth} 日 ${time}`
  return time
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('zh-TW', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function getTypeLabel(type: ScheduledTask['type']): string {
  if (type === 'once') return '一次性'
  if (type === 'recurring') return '定時'
  return '備忘'
}

function getTypeColor(type: ScheduledTask['type']): string {
  if (type === 'once') return '#4fc3f7'
  if (type === 'recurring') return '#81c784'
  return '#ffb74d'
}

export function SchedulerPanel({ isOpen, onClose, tasks }: SchedulerPanelProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  if (!isOpen) return null

  const handleToggle = (task: ScheduledTask) => {
    wsClient.postMessage({
      type: 'updateScheduledTask',
      taskId: task.id,
      updates: { enabled: !task.enabled },
    })
  }

  const handleDelete = (taskId: string) => {
    if (confirmDelete === taskId) {
      wsClient.postMessage({ type: 'deleteScheduledTask', taskId })
      setConfirmDelete(null)
    } else {
      setConfirmDelete(taskId)
      setTimeout(() => setConfirmDelete(null), 3000)
    }
  }

  const sorted = [...tasks].sort((a, b) => {
    // Memory first, then by nextRun
    if (a.type === 'memory' && b.type !== 'memory') return -1
    if (a.type !== 'memory' && b.type === 'memory') return 1
    if (!a.nextRun && !b.nextRun) return 0
    if (!a.nextRun) return 1
    if (!b.nextRun) return -1
    return new Date(a.nextRun).getTime() - new Date(b.nextRun).getTime()
  })

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 49,
        }}
      />
      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 50,
        background: '#1a1a2e',
        border: '3px solid rgba(255,255,255,0.15)',
        borderRadius: 0,
        width: 560,
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        fontFamily: SYS_FONT,
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '2px solid rgba(255,255,255,0.1)',
        }}>
          <span style={{ fontSize: 18, color: '#fff', fontFamily: SYS_FONT }}>
            排程管理
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
              fontSize: 22, cursor: 'pointer', padding: '0 4px', fontFamily: SYS_FONT,
            }}
          >
            ✕
          </button>
        </div>

        {/* Task List */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '8px 0',
        }}>
          {sorted.length === 0 && (
            <div style={{
              padding: '24px 16px',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 15,
              textAlign: 'center',
            }}>
              目前沒有排程任務
              <br />
              對 CTO 說「提醒我...」或「每天...」即可建立
            </div>
          )}

          {sorted.map(task => {
            const isExpanded = expanded === task.id
            return (
              <div
                key={task.id}
                onMouseEnter={() => setHovered(task.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  padding: '10px 16px',
                  background: hovered === task.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  opacity: task.enabled ? 1 : 0.45,
                  cursor: 'pointer',
                }}
                onClick={() => setExpanded(isExpanded ? null : task.id)}
              >
                {/* Row 1: Type badge + description + controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 12, padding: '2px 6px',
                    background: getTypeColor(task.type),
                    color: '#000', borderRadius: 0, fontWeight: 600,
                  }}>
                    {getTypeLabel(task.type)}
                  </span>
                  <span style={{
                    flex: 1, fontSize: 15, color: '#fff',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: isExpanded ? 'normal' : 'nowrap',
                  }}>
                    {task.description}
                  </span>
                  {/* Toggle */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggle(task) }}
                    title={task.enabled ? '停用' : '啟用'}
                    style={{
                      background: 'none', border: 'none',
                      color: task.enabled ? '#81c784' : 'rgba(255,255,255,0.3)',
                      fontSize: 13, cursor: 'pointer', padding: '2px 6px',
                      fontFamily: SYS_FONT,
                    }}
                  >
                    {task.enabled ? 'ON' : 'OFF'}
                  </button>
                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(task.id) }}
                    title="刪除"
                    style={{
                      background: confirmDelete === task.id ? '#e57373' : 'none',
                      border: 'none',
                      color: confirmDelete === task.id ? '#fff' : 'rgba(255,255,255,0.3)',
                      fontSize: 13, cursor: 'pointer', padding: '2px 6px',
                      fontFamily: SYS_FONT,
                    }}
                  >
                    {confirmDelete === task.id ? '確定？' : '刪除'}
                  </button>
                </div>

                {/* Row 2: Quick info */}
                <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                  {task.type === 'recurring' && (
                    <span>{formatRecurring(task)}</span>
                  )}
                  {task.type !== 'memory' && (
                    <span style={{ color: task.nextRun ? 'rgba(255,255,255,0.5)' : '#e57373' }}>
                      {formatNextRun(task)}
                    </span>
                  )}
                  {task.type === 'memory' && !isExpanded && (
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {task.message.slice(0, 60)}{task.message.length > 60 ? '...' : ''}
                    </span>
                  )}
                  {task.action === 'orchestrator' && task.type !== 'memory' && (
                    <span style={{ color: '#daa520' }}>CTO 處理</span>
                  )}
                  {task.action === 'notify' && task.type !== 'memory' && (
                    <span style={{ color: '#4fc3f7' }}>僅通知</span>
                  )}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{
                    marginTop: 8,
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.7)',
                    lineHeight: 1.7,
                  }}>
                    {/* Full message */}
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>訊息內容：</span>
                      <div style={{
                        marginTop: 4, padding: '6px 8px',
                        background: 'rgba(0,0,0,0.2)',
                        color: 'rgba(255,255,255,0.85)',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}>
                        {task.message}
                      </div>
                    </div>

                    {/* Meta info */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
                      <span>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>建立者：</span>
                        {task.createdBy}
                      </span>
                      <span>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>建立時間：</span>
                        {formatDateTime(task.createdAt)}
                      </span>
                      {task.type === 'once' && task.triggerAt && (
                        <span>
                          <span style={{ color: 'rgba(255,255,255,0.4)' }}>觸發時間：</span>
                          {formatDateTime(task.triggerAt)}
                        </span>
                      )}
                      {task.lastRun && (
                        <span>
                          <span style={{ color: 'rgba(255,255,255,0.4)' }}>上次執行：</span>
                          {formatDateTime(task.lastRun)}
                        </span>
                      )}
                      {task.nextRun && (
                        <span>
                          <span style={{ color: 'rgba(255,255,255,0.4)' }}>下次執行：</span>
                          {formatDateTime(task.nextRun)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 16px',
          borderTop: '2px solid rgba(255,255,255,0.1)',
          fontSize: 13,
          color: 'rgba(255,255,255,0.35)',
          textAlign: 'center',
        }}>
          共 {tasks.length} 個任務
        </div>
      </div>
    </>
  )
}
