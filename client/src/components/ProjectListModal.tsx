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
  running: 'Running',
  paused: 'Paused',
  completed: 'Completed',
}

const STATUS_COLORS: Record<string, string> = {
  running: '#4ade80',
  paused: '#facc15',
  completed: '#94a3b8',
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${mm}/${dd} ${hh}:${min}`
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
      {/* Higher z-index backdrop on top of settings */}
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
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 61,
          background: 'var(--pixel-bg)',
          border: '2px solid var(--pixel-border)',
          borderRadius: 0,
          padding: '4px',
          boxShadow: 'var(--pixel-shadow)',
          minWidth: 340,
          maxWidth: 500,
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 10px',
            borderBottom: '1px solid var(--pixel-border)',
            marginBottom: '4px',
          }}
        >
          <span style={{ fontSize: '24px', color: 'rgba(255, 255, 255, 0.9)' }}>Projects</span>
          <button
            onClick={onClose}
            onMouseEnter={() => setHovered('close')}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: hovered === 'close' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              border: 'none',
              borderRadius: 0,
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            X
          </button>
        </div>

        {/* Project list */}
        <div style={{ overflowY: 'auto', padding: '4px 0' }}>
          {loading && (
            <div style={{ padding: '16px 10px', fontSize: '20px', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
              Loading...
            </div>
          )}
          {!loading && projects.length === 0 && (
            <div style={{ padding: '16px 10px', fontSize: '20px', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
              No projects yet
            </div>
          )}
          {projects.map((p) => (
            <button
              key={p.dir}
              onClick={() => handleResume(p.dir)}
              onMouseEnter={() => setHovered(p.dir)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                width: '100%',
                padding: '8px 10px',
                fontSize: '20px',
                color: 'rgba(255, 255, 255, 0.85)',
                background: hovered === p.dir ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                border: 'none',
                borderRadius: 0,
                cursor: 'pointer',
                textAlign: 'left',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '22px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                  {p.name}
                </span>
                <span
                  style={{
                    fontSize: '16px',
                    color: STATUS_COLORS[p.status] ?? '#94a3b8',
                    flexShrink: 0,
                    marginLeft: 8,
                  }}
                >
                  {STATUS_LABELS[p.status] ?? p.status}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: '16px', color: 'rgba(255,255,255,0.45)' }}>
                <span>Phase {p.currentPhase}</span>
                <span>{formatTime(p.updatedAt)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
