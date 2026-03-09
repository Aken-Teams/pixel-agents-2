import { useState } from 'react'
import { SCENE_DEFINITIONS } from '../office/sceneDefinitions.js'
import type { OfficeLayout } from '../office/types.js'

interface ScenePickerModalProps {
  isOpen: boolean
  onClose: () => void
  currentBackgroundImage?: string
  onSelectScene: (layout: OfficeLayout, defaultZoom: number) => void
}

export function ScenePickerModal({ isOpen, onClose, currentBackgroundImage, onSelectScene }: ScenePickerModalProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  if (!isOpen) return null

  return (
    <>
      {/* Dark backdrop */}
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
      {/* Modal */}
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
          minWidth: 360,
          maxWidth: 560,
          overflow: 'hidden',
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
            {/* Map/scene icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--pixel-accent)', flexShrink: 0 }}>
              <rect x="3" y="3" width="18" height="18" rx="1" stroke="currentColor" strokeWidth="2" />
              <path d="M3 9h18M9 3v18" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <span style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>場景選擇</span>
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

        {/* Scene grid */}
        <div
          className="scene-grid"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 8,
            padding: '10px 8px',
          }}
        >
          {SCENE_DEFINITIONS.map((scene) => {
            const isActive = currentBackgroundImage === scene.backgroundImage
            const isHovered = hovered === scene.id

            return (
              <div
                key={scene.id}
                onClick={() => {
                  if (!isActive) {
                    onSelectScene(scene.layout, scene.defaultZoom)
                  }
                  onClose()
                }}
                onMouseEnter={() => setHovered(scene.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  cursor: isActive ? 'default' : 'pointer',
                  border: isActive
                    ? '2px solid var(--pixel-accent)'
                    : `2px solid ${isHovered ? 'rgba(255, 255, 255, 0.3)' : 'transparent'}`,
                  borderRadius: 0,
                  background: isHovered && !isActive ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                  padding: 4,
                  transition: 'border-color 0.15s, background 0.15s',
                  width: 160,
                  flexShrink: 0,
                }}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    width: '100%',
                    height: 100,
                    overflow: 'hidden',
                    marginBottom: 4,
                  }}
                >
                  <img
                    src={`/assets/${scene.backgroundImage}`}
                    alt={scene.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      imageRendering: 'pixelated',
                      display: 'block',
                    }}
                  />
                </div>
                {/* Label */}
                <div
                  style={{
                    fontSize: '14px',
                    color: isActive ? 'var(--pixel-accent)' : 'rgba(255, 255, 255, 0.8)',
                    textAlign: 'center',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {scene.name}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
