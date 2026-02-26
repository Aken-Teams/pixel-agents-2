import { useState, useEffect, useRef, useCallback } from 'react'
import type { OfficeState } from '../office/engine/officeState.js'
import { TILE_SIZE, CharacterState } from '../office/types.js'
import { CHARACTER_RENDER_SCALE, CHARACTER_SITTING_OFFSET_PX } from '../constants.js'

/** Per-agent thought bubble data */
export interface ThoughtData {
  /** The latest text snippet to display */
  text: string
  /** Timestamp when text was last updated */
  updatedAt: number
  /** Whether the agent is actively working (streaming or tool use) */
  isWorking: boolean
  /** Whether the agent just completed a task */
  justCompleted: boolean
}

const IDLE_MESSAGES = [
  '讓我想想這要怎麼做...',
  '嗯...我正在思考中',
  '稍等一下，我看看...',
  '我正在處理中，等等我喔',
  '這個有點複雜，我想想',
  '我正在撰寫中...',
  '快好了，再等我一下',
  '讓我研究一下...',
  '我正在分析程式碼...',
  '我來看看怎麼做最好',
]

const TYPEWRITER_SPEED_MS = 40
const MAX_DISPLAY_CHARS = 60
const IDLE_MESSAGE_ROTATE_MS = 5000

interface ThoughtBubblesProps {
  officeState: OfficeState
  containerRef: React.RefObject<HTMLDivElement | null>
  zoom: number
  panRef: React.RefObject<{ x: number; y: number }>
  thoughtData: Record<number, ThoughtData>
}

/** Truncate text to a readable snippet, breaking at word boundaries */
function truncateText(text: string, maxLen: number): string {
  // Take last portion of text (most recent thinking)
  const trimmed = text.trim()
  if (trimmed.length <= maxLen) return trimmed
  // Take from the end for most recent content
  const tail = trimmed.slice(-maxLen)
  // Try to break at a word boundary
  const spaceIdx = tail.indexOf(' ')
  if (spaceIdx > 0 && spaceIdx < 15) {
    return '...' + tail.slice(spaceIdx + 1)
  }
  return '...' + tail
}

function ThoughtBubbleItem({
  text,
  isIdle,
  isCompleted,
}: {
  text: string
  isIdle: boolean
  isCompleted: boolean
}) {
  const [displayLen, setDisplayLen] = useState(0)
  const prevTextRef = useRef(text)

  // Reset typewriter when text changes
  useEffect(() => {
    if (text !== prevTextRef.current) {
      setDisplayLen(0)
      prevTextRef.current = text
    }
  }, [text])

  // Typewriter tick
  useEffect(() => {
    if (displayLen >= text.length) return
    const timer = setTimeout(() => {
      setDisplayLen((n) => Math.min(n + 1, text.length))
    }, TYPEWRITER_SPEED_MS)
    return () => clearTimeout(timer)
  }, [displayLen, text])

  const displayText = text.slice(0, displayLen)
  const showCursor = displayLen < text.length

  return (
    <div className="thought-bubble-container">
      {/* Tail triangle */}
      <div className="thought-bubble-tail" />
      <div
        className="thought-bubble-content"
        style={{
          color: isCompleted
            ? 'var(--pixel-green)'
            : isIdle
              ? 'rgba(255,255,255,0.5)'
              : 'rgba(255,255,255,0.85)',
        }}
      >
        {displayText}
        {showCursor && <span className="thought-cursor">|</span>}
      </div>
    </div>
  )
}

export function ThoughtBubbles({
  officeState,
  containerRef,
  zoom,
  panRef,
  thoughtData,
}: ThoughtBubblesProps) {
  const [, setTick] = useState(0)
  // RAF loop for position tracking
  useEffect(() => {
    let rafId = 0
    const tick = () => {
      setTick((n) => n + 1)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  // Idle message rotation per agent
  const idleIndexRef = useRef<Record<number, number>>({})
  const idleTimerRef = useRef<Record<number, number>>({})
  const [idleMessages, setIdleMessages] = useState<Record<number, string>>({})

  const rotateIdleMessage = useCallback((agentId: number) => {
    const idx = (idleIndexRef.current[agentId] ?? Math.floor(Math.random() * IDLE_MESSAGES.length))
    const nextIdx = (idx + 1) % IDLE_MESSAGES.length
    idleIndexRef.current[agentId] = nextIdx
    return IDLE_MESSAGES[nextIdx]
  }, [])

  // Manage idle message rotation timers
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const updates: Record<number, string> = {}
      for (const [idStr, data] of Object.entries(thoughtData)) {
        const agentId = Number(idStr)
        if (data.isWorking && !data.text && !data.justCompleted) {
          const lastRotate = idleTimerRef.current[agentId] ?? 0
          if (now - lastRotate > IDLE_MESSAGE_ROTATE_MS) {
            idleTimerRef.current[agentId] = now
            updates[agentId] = rotateIdleMessage(agentId)
          }
        }
      }
      if (Object.keys(updates).length > 0) {
        setIdleMessages((prev) => ({ ...prev, ...updates }))
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [thoughtData, rotateIdleMessage])

  // Initialize idle message for newly working agents
  useEffect(() => {
    for (const [idStr, data] of Object.entries(thoughtData)) {
      const agentId = Number(idStr)
      if (data.isWorking && !data.text && !data.justCompleted && !idleMessages[agentId]) {
        const idx = Math.floor(Math.random() * IDLE_MESSAGES.length)
        idleIndexRef.current[agentId] = idx
        idleTimerRef.current[agentId] = Date.now()
        setIdleMessages((prev) => ({ ...prev, [agentId]: IDLE_MESSAGES[idx] }))
      }
    }
  }, [thoughtData]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const entries = Object.entries(thoughtData)
  if (entries.length === 0) return null

  return (
    <>
      {entries.map(([idStr, data]) => {
        const agentId = Number(idStr)
        const ch = officeState.characters.get(agentId)
        if (!ch) return null
        // Don't show bubble for despawning characters
        if (ch.matrixEffect === 'despawn') return null
        // Must be working or just completed
        if (!data.isWorking && !data.justCompleted) return null

        // Determine what text to show
        let displayText: string
        let isIdle = false
        let isCompleted = false

        if (data.justCompleted) {
          displayText = '已完成任務 ✓'
          isCompleted = true
        } else if (data.text) {
          displayText = truncateText(data.text, MAX_DISPLAY_CHARS)
        } else {
          // Working but no text yet — show idle message
          displayText = idleMessages[agentId] || IDLE_MESSAGES[0]
          isIdle = true
        }

        // Position: above the character, higher than the existing bubble sprites
        const sittingOffset = ch.state === CharacterState.TYPE
          ? Math.round(CHARACTER_SITTING_OFFSET_PX * CHARACTER_RENDER_SCALE) : 0
        const screenX = (deviceOffsetX + ch.x * zoom) / dpr
        const screenY = (deviceOffsetY + (ch.y + sittingOffset) * zoom) / dpr
        // Place above the character head (character is ~36px tall at 1.5x scale)
        const charHeight = 24 * CHARACTER_RENDER_SCALE * zoom / dpr
        const bubbleOffset = charHeight + 20

        return (
          <div
            key={agentId}
            style={{
              position: 'absolute',
              left: screenX,
              top: screenY - bubbleOffset,
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
              zIndex: 45,
            }}
          >
            <ThoughtBubbleItem
              text={displayText}
              isIdle={isIdle}
              isCompleted={isCompleted}
            />
          </div>
        )
      })}
    </>
  )
}
