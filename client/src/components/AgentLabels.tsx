import { useState, useEffect } from 'react'
import type { OfficeState } from '../office/engine/officeState.js'
import { TILE_SIZE, CharacterState } from '../office/types.js'

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

  const sittingOffset = ch.state === CharacterState.TYPE ? 6 : 0
  const screenX = (deviceOffsetX + ch.x * zoom) / dpr
  const screenY = (deviceOffsetY + (ch.y + sittingOffset - 24) * zoom) / dpr

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
        top: screenY - 20,
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        zIndex: 40,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: '18px',
          color: 'var(--pixel-text)',
          background: 'rgba(30,30,46,0.8)',
          padding: '1px 6px',
          borderRadius: 2,
          whiteSpace: 'nowrap',
        }}
      >
        {dotColor && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: dotColor,
              flexShrink: 0,
            }}
          />
        )}
        {name}
      </span>
    </div>
  )
}
