import { useState, useEffect } from 'react'
import { wsClient } from '../wsClient.js'

interface ProjectSummary {
  name: string
  dir: string
  status: 'running' | 'paused' | 'completed'
  updatedAt: string
  currentPhase: number
}

interface ProjectListModalProps {
  onClose: () => void
  onProjectClose: () => void
}

const STATUS_LABELS: Record<string, string> = {
  running: '進行中',
  paused: '已暫停',
  completed: '已完成',
}

const STATUS_COLORS: Record<string, string> = {
  running: '#4ade80',
  paused: '#facc15',
  completed: '#94a3b8',
}

const STATUS_BG: Record<string, string> = {
  running: 'rgba(74, 222, 128, 0.12)',
  paused: 'rgba(250, 204, 21, 0.12)',
  completed: 'rgba(148, 163, 184, 0.10)',
}

function formatRelativeTime(iso: string): string {
  try {
    const now = Date.now()
    const then = new Date(iso).getTime()
    const diff = now - then
    const mins = Math.floor(diff / 60_000)
    if (mins < 1) return '剛剛'
    if (mins < 60) return `${mins} 分鐘前`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} 小時前`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days} 天前`
    // Fallback to date
    const d = new Date(iso)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${mm}/${dd}`
  } catch {
    return iso
  }
}

export function ProjectListModal({ onClose, onProjectClose }: ProjectListModalProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [hovered, setHovered] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handler = (msg: unknown) => {
      const data = msg as { type: string; projects?: ProjectSummary[] }
      if (data.type === 'projectList') {
        setProjects(data.projects ?? [])
        setLoading(false)
      } else if (data.type === 'projectLoaded') {
        onProjectClose()
      }
    }
    wsClient.addMessageListener(handler)
    return () => wsClient.removeMessageListener(handler)
  }, [onProjectClose])

  const handleResume = (dir: string) => {
    wsClient.postMessage({ type: 'resumeProject', projectDir: dir })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.6)',
          zIndex: 60,
        }}
      />
      <div
        className="modal-responsive project-status-bar"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 61,
          background: 'var(--pixel-bg)',
          border: '2px solid var(--pixel-border)',
          borderRadius: 0,
          boxShadow: 'var(--pixel-shadow)',
          minWidth: 380,
          maxWidth: 520,
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderBottom: '2px solid var(--pixel-border)',
            background: 'rgba(90, 140, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Folder icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--pixel-accent)', flexShrink: 0 }}>
              <path d="M4 4h5l2 2h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>
              專案紀錄
            </span>
            {!loading && (
              <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.35)' }}>
                ({projects.length})
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            onMouseEnter={() => setHovered('close')}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: hovered === 'close' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              border: 'none',
              borderRadius: 0,
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '2px 6px',
              lineHeight: 1,
            }}
          >
            X
          </button>
        </div>

        {/* Project list */}
        <div style={{ overflowY: 'auto', padding: '4px' }}>
          {loading && (
            <div style={{ padding: '24px 10px', fontSize: '16px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
              載入中...
            </div>
          )}
          {!loading && projects.length === 0 && (
            <div style={{ padding: '24px 10px', fontSize: '16px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
              尚無專案紀錄
            </div>
          )}
          {projects.map((p) => {
            const isHovered = hovered === p.dir
            const statusColor = STATUS_COLORS[p.status] ?? '#94a3b8'
            return (
              <button
                key={p.dir}
                onClick={() => handleResume(p.dir)}
                onMouseEnter={() => setHovered(p.dir)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 10px',
                  color: 'rgba(255, 255, 255, 0.85)',
                  background: isHovered ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                  border: 'none',
                  borderRadius: 0,
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
              >
                {/* Status dot */}
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: statusColor,
                  flexShrink: 0,
                }} />

                {/* Project info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Name */}
                  <div style={{
                    fontSize: '16px',
                    color: isHovered ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.8)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.3,
                  }}>
                    {p.name}
                  </div>
                  {/* Meta row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 3,
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.35)',
                  }}>
                    <span>Phase {p.currentPhase}</span>
                    <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
                    <span>{formatRelativeTime(p.updatedAt)}</span>
                  </div>
                </div>

                {/* Status badge */}
                <span style={{
                  fontSize: '11px',
                  color: statusColor,
                  background: STATUS_BG[p.status] ?? 'transparent',
                  padding: '2px 8px',
                  border: `1px solid ${statusColor}33`,
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}>
                  {STATUS_LABELS[p.status] ?? p.status}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
