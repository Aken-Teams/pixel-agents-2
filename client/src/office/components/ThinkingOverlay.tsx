import { useState, useEffect } from 'react'
import type { OfficeState } from '../engine/officeState.js'
import { TILE_SIZE, CharacterState } from '../types.js'
import { CHARACTER_RENDER_SCALE, CHARACTER_SITTING_OFFSET_PX, BUBBLE_VERTICAL_OFFSET_PX } from '../../constants.js'

interface ThinkingOverlayProps {
  officeState: OfficeState
  containerRef: React.RefObject<HTMLDivElement | null>
  zoom: number
  panRef: React.RefObject<{ x: number; y: number }>
}

export function ThinkingOverlay({
  officeState,
  containerRef,
  zoom,
  panRef,
}: ThinkingOverlayProps) {
  const [, setTick] = useState(0)
  useEffect(() => {
    let rafId = 0
    const tick = () => {
      setTick((n) => n + 1)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  const el = containerRef.current
  if (!el) return null
  const rect = el.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const canvasW = Math.round(rect.width * dpr)
  const canvasH = Math.round(rect.height * dpr)
  const layout = officeState.getLayout()
  const mapW = layout.cols * TILE_SIZE * zoom
  const mapH = layout.rows * TILE_SIZE * zoom
  const deviceOffsetX = Math.floor((canvasW - mapW) / 2) + Math.round(panRef.current.x)
  const deviceOffsetY = Math.floor((canvasH - mapH) / 2) + Math.round(panRef.current.y)

  const items: JSX.Element[] = []
  for (const ch of officeState.characters.values()) {
    if (!ch.thinkingText) continue

    const cZoom = Math.round(zoom * CHARACTER_RENDER_SCALE)
    const sittingOff = ch.state === CharacterState.TYPE
      ? Math.round(CHARACTER_SITTING_OFFSET_PX * CHARACTER_RENDER_SCALE) : 0
    // Position above the bubble sprite area (bubble is ~13px at cZoom scale)
    const bubbleHeight = 13 * cZoom
    const screenX = (deviceOffsetX + ch.x * zoom) / dpr
    const screenY = (deviceOffsetY + (ch.y + sittingOff) * zoom - BUBBLE_VERTICAL_OFFSET_PX * cZoom - bubbleHeight) / dpr

    // Fade based on timer (fade out in last 1 second)
    const opacity = ch.thinkingTimer < 1 ? ch.thinkingTimer : 1

    items.push(
      <div
        key={ch.id}
        style={{
          position: 'absolute',
          left: screenX,
          top: screenY - 4,
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          zIndex: 50,
          opacity,
        }}
      >
        <span
          style={{
            fontSize: '16px',
            fontFamily: "'FS Pixel Sans', monospace",
            color: '#ddd',
            background: 'rgba(30,30,46,0.85)',
            padding: '1px 6px',
            border: '1px solid rgba(255,255,255,0.15)',
            whiteSpace: 'nowrap',
            fontStyle: 'italic',
          }}
        >
          {ch.thinkingText}...
        </span>
      </div>,
    )
  }

  if (items.length === 0) return null
  return <>{items}</>
}
