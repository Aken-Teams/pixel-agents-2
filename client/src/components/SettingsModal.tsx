import { useState, useRef, useEffect } from 'react'
import { wsClient } from '../wsClient.js'
import { isSoundEnabled, setSoundEnabled } from '../notificationSound.js'
import { ProjectListModal } from './ProjectListModal.js'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  isDebugMode: boolean
  onToggleDebugMode: () => void
  aiProvider: string
  deepseekModel: string
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 10px',
  fontSize: '24px',
  color: 'rgba(255, 255, 255, 0.8)',
  background: 'transparent',
  border: 'none',
  borderRadius: 0,
  cursor: 'pointer',
  textAlign: 'left',
  boxSizing: 'border-box',
}

/* ── Pixel-art custom dropdown ── */
interface PixelSelectProps {
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  maxWidth?: number
}

function PixelSelect({ value, options, onChange, maxWidth = 170 }: PixelSelectProps) {
  const [open, setOpen] = useState(false)
  const [hoveredIdx, setHoveredIdx] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selected = options.find(o => o.value === value)

  return (
    <div ref={ref} style={{ position: 'relative', maxWidth, flexShrink: 0 }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          width: '100%',
          background: open ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.3)',
          color: 'rgba(255, 255, 255, 0.9)',
          border: `1px solid ${open ? 'rgba(90, 140, 255, 0.6)' : 'rgba(255, 255, 255, 0.25)'}`,
          borderRadius: 0,
          padding: '3px 8px',
          fontSize: '20px',
          cursor: 'pointer',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label ?? value}
        </span>
        <span style={{ fontSize: '12px', opacity: 0.5, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>
      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            minWidth: '100%',
            width: 'max-content',
            zIndex: 999,
            background: 'var(--pixel-bg, #1a1a2e)',
            border: '1px solid rgba(90, 140, 255, 0.5)',
            borderTop: 'none',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          }}
        >
          {options.map((opt, i) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(-1)}
              style={{
                display: 'block',
                width: '100%',
                padding: '4px 8px',
                fontSize: '20px',
                color: opt.value === value ? '#fff' : 'rgba(255, 255, 255, 0.8)',
                background: hoveredIdx === i
                  ? 'rgba(90, 140, 255, 0.4)'
                  : opt.value === value
                    ? 'rgba(90, 140, 255, 0.2)'
                    : 'transparent',
                border: 'none',
                borderRadius: 0,
                cursor: 'pointer',
                textAlign: 'left',
                outline: 'none',
                boxSizing: 'border-box',
                whiteSpace: 'nowrap',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function SettingsModal({ isOpen, onClose, aiProvider, deepseekModel }: SettingsModalProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [soundLocal, setSoundLocal] = useState(isSoundEnabled)
  const [showProjects, setShowProjects] = useState(false)
  const [apiKeyLocal, setApiKeyLocal] = useState('')
  const [apiKeySaved, setApiKeySaved] = useState(false)

  if (!isOpen) return null

  const isDeepseek = aiProvider === 'deepseek'

  return (
    <>
      {/* Dark backdrop — click to close */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 49,
        }}
      />
      {/* Centered modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 50,
          background: 'var(--pixel-bg)',
          border: '2px solid var(--pixel-border)',
          borderRadius: 0,
          padding: '4px',
          boxShadow: 'var(--pixel-shadow)',
          width: 380,
          boxSizing: 'border-box',
          overflow: 'visible',
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
          <span style={{ fontSize: '24px', color: 'rgba(255, 255, 255, 0.9)' }}>Settings</span>
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

        {/* Load Project */}
        <button
          onClick={() => {
            setShowProjects(true)
            wsClient.postMessage({ type: 'listProjects' })
          }}
          onMouseEnter={() => setHovered('projects')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...rowStyle,
            background: hovered === 'projects' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          }}
        >
          Load Project
        </button>

        {/* Sound */}
        <button
          onClick={() => {
            const newVal = !isSoundEnabled()
            setSoundEnabled(newVal)
            setSoundLocal(newVal)
            wsClient.postMessage({ type: 'setSoundEnabled', enabled: newVal })
          }}
          onMouseEnter={() => setHovered('sound')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...rowStyle,
            background: hovered === 'sound' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          }}
        >
          <span>Sound Notifications</span>
          <span
            style={{
              marginLeft: 16,
              width: 14,
              height: 14,
              border: '2px solid rgba(255, 255, 255, 0.5)',
              borderRadius: 0,
              background: soundLocal ? 'rgba(90, 140, 255, 0.8)' : 'transparent',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              lineHeight: 1,
              color: '#fff',
            }}
          >
            {soundLocal ? 'X' : ''}
          </span>
        </button>

        {/* AI Provider */}
        <div style={{ borderTop: '1px solid var(--pixel-border)', marginTop: '4px', paddingTop: '4px' }}>
          <div style={{ ...rowStyle, cursor: 'default' }}>
            <span>AI Provider</span>
            <PixelSelect
              value={aiProvider}
              options={[
                { value: 'claude-cli', label: 'Claude CLI' },
                { value: 'deepseek', label: 'DeepSeek' },
              ]}
              onChange={(v) => {
                wsClient.postMessage({ type: 'setAIProvider', provider: v })
                setApiKeySaved(false)
              }}
            />
          </div>

          {isDeepseek && (
            <>
              {/* Model */}
              <div style={{ ...rowStyle, cursor: 'default' }}>
                <span>Model</span>
                <PixelSelect
                  value={deepseekModel}
                  options={[
                    { value: 'deepseek-chat', label: 'deepseek-chat' },
                    { value: 'deepseek-reasoner', label: 'deepseek-reasoner' },
                  ]}
                  onChange={(v) => {
                    wsClient.postMessage({ type: 'setAIProvider', provider: 'deepseek', model: v })
                  }}
                />
              </div>
              {/* API Key */}
              <div style={{ ...rowStyle, cursor: 'default' }}>
                <span>API Key</span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 1, minWidth: 0 }}>
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={apiKeyLocal}
                    onChange={(e) => { setApiKeyLocal(e.target.value); setApiKeySaved(false) }}
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      color: 'rgba(255, 255, 255, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: 0,
                      padding: '2px 6px',
                      fontSize: '18px',
                      width: 120,
                      flexShrink: 1,
                      minWidth: 0,
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => {
                      if (apiKeyLocal.trim()) {
                        wsClient.postMessage({ type: 'setAIProvider', provider: 'deepseek', apiKey: apiKeyLocal.trim() })
                        setApiKeySaved(true)
                      }
                    }}
                    onMouseEnter={() => setHovered('savekey')}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      background: apiKeySaved
                        ? 'rgba(60, 180, 80, 0.5)'
                        : hovered === 'savekey' ? 'rgba(90, 140, 255, 0.6)' : 'rgba(90, 140, 255, 0.4)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 0,
                      padding: '3px 8px',
                      fontSize: '18px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {apiKeySaved ? 'OK' : 'Save'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {showProjects && (
        <ProjectListModal
          onClose={() => setShowProjects(false)}
          onProjectClose={() => {
            setShowProjects(false)
            onClose()
          }}
        />
      )}
    </>
  )
}
