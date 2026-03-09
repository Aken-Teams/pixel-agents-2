import { useState, useRef, useEffect } from 'react'
import { wsClient } from '../wsClient.js'
import { isSoundEnabled, setSoundEnabled } from '../notificationSound.js'

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
  padding: '10px 14px',
  fontSize: '15px',
  color: 'rgba(255, 255, 255, 0.8)',
  background: 'transparent',
  border: 'none',
  borderRadius: 0,
  cursor: 'pointer',
  textAlign: 'left',
  boxSizing: 'border-box',
  width: '100%',
}

/* ── Custom dropdown ── */
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
          border: `1px solid ${open ? 'rgba(90, 140, 255, 0.6)' : 'rgba(255, 255, 255, 0.2)'}`,
          borderRadius: 0,
          padding: '4px 10px',
          fontSize: '14px',
          cursor: 'pointer',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label ?? value}
        </span>
        <span style={{ fontSize: '10px', opacity: 0.5, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
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
                padding: '5px 10px',
                fontSize: '14px',
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

export function SettingsModal({ isOpen, onClose, isDebugMode, onToggleDebugMode, aiProvider, deepseekModel }: SettingsModalProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [soundLocal, setSoundLocal] = useState(isSoundEnabled)

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
        className="modal-responsive"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 50,
          background: 'var(--pixel-bg)',
          border: '2px solid var(--pixel-border)',
          borderRadius: 0,
          boxShadow: 'var(--pixel-shadow)',
          width: 340,
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
            padding: '8px 14px',
            borderBottom: '2px solid var(--pixel-border)',
            background: 'rgba(90, 140, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Gear icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--pixel-accent)', flexShrink: 0 }}>
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
              <path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>設定</span>
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
              fontSize: '16px',
              cursor: 'pointer',
              padding: '2px 6px',
              lineHeight: 1,
            }}
          >
            X
          </button>
        </div>

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
            background: hovered === 'sound' ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
          }}
        >
          <span>音效通知</span>
          <span
            style={{
              marginLeft: 16,
              width: 16,
              height: 16,
              border: '2px solid rgba(255, 255, 255, 0.4)',
              borderRadius: 0,
              background: soundLocal ? 'rgba(90, 140, 255, 0.8)' : 'transparent',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              lineHeight: 1,
              color: '#fff',
            }}
          >
            {soundLocal ? '✓' : ''}
          </span>
        </button>

        {/* Route Debug Overlay */}
        <button
          onClick={onToggleDebugMode}
          onMouseEnter={() => setHovered('debug')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...rowStyle,
            background: hovered === 'debug' ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
          }}
        >
          <span>路徑顯示</span>
          <span
            style={{
              marginLeft: 16,
              width: 16,
              height: 16,
              border: '2px solid rgba(255, 255, 255, 0.4)',
              borderRadius: 0,
              background: isDebugMode ? 'rgba(90, 140, 255, 0.8)' : 'transparent',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              lineHeight: 1,
              color: '#fff',
            }}
          >
            {isDebugMode ? '✓' : ''}
          </span>
        </button>

        {/* AI Provider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '2px', paddingTop: '2px' }}>
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
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: 0,
                      padding: '4px 8px',
                      fontSize: '13px',
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
                      padding: '4px 10px',
                      fontSize: '13px',
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
    </>
  )
}
