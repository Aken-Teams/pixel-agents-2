import { useState } from 'react'
import { wsClient } from '../wsClient.js'
import { ProjectListModal } from './ProjectListModal.js'

interface ProjectStatusBarProps {
  currentProject: { name: string; status: string; dir: string } | null
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

export function ProjectStatusBar({ currentProject }: ProjectStatusBarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('projectStatusCollapsed') === 'true' } catch { return false }
  })
  const [hovered, setHovered] = useState<string | null>(null)
  const [showProjects, setShowProjects] = useState(false)

  const handleLoadProject = () => {
    setShowProjects(true)
    wsClient.postMessage({ type: 'listProjects' })
  }

  const toggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    try { localStorage.setItem('projectStatusCollapsed', String(next)) } catch { /* */ }
  }

  const handleUnload = () => {
    wsClient.postMessage({ type: 'resetProject' })
  }

  const statusColor = currentProject ? (STATUS_COLORS[currentProject.status] ?? '#94a3b8') : undefined

  // ── Collapsed: single square button (same size as ZoomControls) ──
  if (collapsed) {
    return (
      <button
        className="project-status-bar"
        onClick={toggleCollapse}
        title={currentProject ? `${currentProject.name}（${STATUS_LABELS[currentProject.status] ?? currentProject.status}）` : '目前無載入專案'}
        onMouseEnter={() => setHovered('collapsed')}
        onMouseLeave={() => setHovered(null)}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 45,
          width: 40,
          height: 40,
          padding: 0,
          background: hovered === 'collapsed' ? 'var(--pixel-btn-hover-bg)' : 'var(--pixel-bg)',
          border: '2px solid var(--pixel-border)',
          borderRadius: 0,
          cursor: 'pointer',
          boxShadow: 'var(--pixel-shadow)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: currentProject ? 'var(--pixel-text)' : 'var(--pixel-text-dim)',
        }}
      >
        {/* Lucide-style folder icon 20x20 */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M4 4h5l2 2h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          {currentProject && (
            <circle cx="20" cy="16" r="5.5" fill={statusColor} stroke="var(--pixel-bg)" strokeWidth="2" />
          )}
        </svg>
      </button>
    )
  }

  const statusLabel = currentProject ? (STATUS_LABELS[currentProject.status] ?? currentProject.status) : null

  // ── Expanded: status bar ──
  return (
    <div
      className="project-status-bar"
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 45,
        background: 'var(--pixel-bg)',
        border: '2px solid var(--pixel-border)',
        borderRadius: 0,
        padding: '5px 8px',
        boxShadow: 'var(--pixel-shadow)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        maxWidth: 340,
      }}
    >
      {/* Lucide-style folder icon */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: currentProject ? 'var(--pixel-text)' : 'var(--pixel-text-dim)' }}>
        <path d="M4 4h5l2 2h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* Status dot */}
      {statusColor && (
        <span style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: statusColor,
          flexShrink: 0,
        }} />
      )}

      {/* Project info */}
      <span style={{
        fontSize: '16px',
        color: currentProject ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        userSelect: 'none',
      }}>
        {currentProject
          ? (<>{currentProject.name} <span style={{ color: statusColor, fontSize: '14px' }}>({statusLabel})</span></>)
          : '目前無載入專案'
        }
      </span>

      {/* Unload button */}
      {currentProject && (
        <button
          onClick={handleUnload}
          onMouseEnter={() => setHovered('unload')}
          onMouseLeave={() => setHovered(null)}
          title="卸載專案"
          style={{
            background: hovered === 'unload' ? 'rgba(255,255,255,0.12)' : 'transparent',
            border: 'none',
            borderRadius: 0,
            color: hovered === 'unload' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)',
            cursor: 'pointer',
            padding: '2px',
            lineHeight: 1,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}

      {/* Load project button */}
      <button
        onClick={handleLoadProject}
        onMouseEnter={() => setHovered('load')}
        onMouseLeave={() => setHovered(null)}
        title="載入專案"
        style={{
          background: hovered === 'load' ? 'rgba(255,255,255,0.12)' : 'transparent',
          border: 'none',
          borderRadius: 0,
          color: hovered === 'load' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)',
          cursor: 'pointer',
          padding: '2px',
          lineHeight: 1,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Upload/load icon — box with upward arrow */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <polyline points="16,3 21,3 21,21 3,21 3,3 8,3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="12" y1="15" x2="12" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <polyline points="8,10 12,6 16,10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Collapse button */}
      <button
        onClick={toggleCollapse}
        onMouseEnter={() => setHovered('collapse')}
        onMouseLeave={() => setHovered(null)}
        title="收合"
        style={{
          background: hovered === 'collapse' ? 'rgba(255,255,255,0.12)' : 'transparent',
          border: 'none',
          borderRadius: 0,
          color: hovered === 'collapse' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)',
          cursor: 'pointer',
          padding: '2px',
          lineHeight: 1,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <polyline points="6,15 12,9 18,15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </button>

      {/* Project list modal */}
      {showProjects && (
        <ProjectListModal
          onClose={() => setShowProjects(false)}
          onProjectClose={() => setShowProjects(false)}
        />
      )}
    </div>
  )
}
