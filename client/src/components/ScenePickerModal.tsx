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
          minWidth: 360,
          maxWidth: 600,
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
            marginBottom: '8px',
          }}
        >
          <span style={{ fontSize: '24px', color: 'rgba(255, 255, 255, 0.9)' }}>Scene</span>
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

        {/* Scene grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${SCENE_DEFINITIONS.length}, 1fr)`,
            gap: 8,
            padding: '4px 8px 8px',
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
                    fontSize: '20px',
                    color: isActive ? 'var(--pixel-accent)' : 'rgba(255, 255, 255, 0.8)',
                    textAlign: 'center',
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans TC', 'Microsoft JhengHei', sans-serif",
                    userSelect: 'none',
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
