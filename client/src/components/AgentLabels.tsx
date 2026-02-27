import { useState, useEffect } from 'react'
import type { OfficeState } from '../office/engine/officeState.js'
import { TILE_SIZE, CharacterState } from '../office/types.js'
import { CHARACTER_RENDER_SCALE, CHARACTER_SITTING_OFFSET_PX } from '../constants.js'

interface AgentLabelsProps {
  officeState: OfficeState
  containerRef: React.RefObject<HTMLDivElement | null>
  zoom: number
  panRef: React.RefObject<{ x: number; y: number }>
  agentNames: Record<number, string>
}

export function AgentLabels({
  officeState,
  containerRef,
  zoom,
  panRef,
  agentNames,
}: AgentLabelsProps) {
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

  const hoveredId = officeState.hoveredAgentId
  if (hoveredId === null) return null

  const name = agentNames[hoveredId]
  if (!name) return null

  const ch = officeState.characters.get(hoveredId)
  if (!ch) return null

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

  // Use same positioning formula as ThoughtBubbles / renderer
  const sittingOffset = ch.state === CharacterState.TYPE
    ? Math.round(CHARACTER_SITTING_OFFSET_PX * CHARACTER_RENDER_SCALE) : 0
  const screenX = (deviceOffsetX + ch.x * zoom) / dpr
  const screenY = (deviceOffsetY + (ch.y + sittingOffset) * zoom) / dpr
  const charZoom = Math.round(zoom * CHARACTER_RENDER_SCALE)
  const charHeight = 24 * charZoom / dpr

  // Status dot color
  let dotColor: string | null = null
  if (ch.bubbleType === 'permission') {
    dotColor = 'var(--pixel-status-permission)'
  } else if (ch.isActive) {
    dotColor = 'var(--pixel-status-active)'
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: screenX,
        top: screenY - charHeight - 4,
        transform: 'translate(-50%, -100%)',
        pointerEvents: 'none',
        zIndex: 40,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          fontSize: '11px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", "Microsoft JhengHei", sans-serif',
          fontWeight: 500,
          letterSpacing: '0.3px',
          color: 'rgba(255,255,255,0.9)',
          background: 'rgba(15, 15, 25, 0.85)',
          border: '1px solid rgba(255,255,255,0.12)',
          padding: '2px 7px',
          borderRadius: 3,
          whiteSpace: 'nowrap',
          backdropFilter: 'blur(4px)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        }}
      >
        {dotColor && (
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: dotColor,
              flexShrink: 0,
              boxShadow: `0 0 4px ${dotColor === 'var(--pixel-status-permission)' ? 'rgba(255,180,50,0.5)' : 'rgba(50,220,100,0.5)'}`,
            }}
          />
        )}
        {name}
      </span>
    </div>
  )
}
