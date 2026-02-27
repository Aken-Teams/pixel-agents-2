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
  /** Whether this is idle office chat (not work-related) */
  isIdleChat?: boolean
  /** Timestamp when the agent started working on current task */
  workStartedAt?: number
  /** Current tool/activity status string (e.g. "Read 檔案", "Bash 執行中") */
  toolStatus?: string
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

const TYPEWRITER_SPEED_MS = 35
const MAX_DISPLAY_CHARS = 50
const IDLE_MESSAGE_ROTATE_MS = 5000

interface ThoughtBubblesProps {
  officeState: OfficeState
  containerRef: React.RefObject<HTMLDivElement | null>
  zoom: number
  panRef: React.RefObject<{ x: number; y: number }>
  thoughtData: Record<number, ThoughtData>
}

/** Strip markdown syntax markers so thought bubble text reads cleanly */
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s/g, '')           // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')    // bold **
    .replace(/__(.+?)__/g, '$1')         // bold __
    .replace(/\*(.+?)\*/g, '$1')         // italic *
    .replace(/_(.+?)_/g, '$1')           // italic _
    .replace(/~~(.+?)~~/g, '$1')         // strikethrough
    .replace(/`{1,3}(.+?)`{1,3}/g, '$1') // inline code
    .replace(/^\s*[-*+]\s/gm, '')        // list markers
    .replace(/^\s*>\s?/gm, '')           // blockquotes
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')  // links [text](url)
    .replace(/!\[.*?\]\(.+?\)/g, '')     // images
    .replace(/\|/g, ' ')                 // table pipes
    .replace(/---+/g, '')                // horizontal rules
    .replace(/\s+/g, ' ')               // collapse whitespace
    .trim()
}

/** Extract the last meaningful sentence/fragment from streaming text */
function extractLatestSnippet(text: string, maxLen: number): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  if (trimmed.length <= maxLen) return trimmed

  // Take from the end for most recent content
  const tail = trimmed.slice(-maxLen)
  // Try to break at sentence boundary (Chinese period, newline, etc.)
  const breakChars = ['。', '！', '？', '\n', '；', '. ', '! ', '? ']
  let bestBreak = -1
  for (const ch of breakChars) {
    const idx = tail.indexOf(ch)
    if (idx >= 0 && idx < maxLen * 0.4) {
      bestBreak = Math.max(bestBreak, idx + ch.length)
    }
  }
  if (bestBreak > 0) {
    return tail.slice(bestBreak)
  }
  // Fall back to space break
  const spaceIdx = tail.indexOf(' ')
  if (spaceIdx > 0 && spaceIdx < 15) {
    return tail.slice(spaceIdx + 1)
  }
  return tail
}

/** Format elapsed seconds into mm:ss */
function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function ThoughtBubbleItem({
  text,
  useTypewriter,
  isIdle,
  isCompleted,
  isIdleChat,
  workStartedAt,
  toolStatus,
}: {
  text: string
  useTypewriter: boolean
  isIdle: boolean
  isCompleted: boolean
  isIdleChat: boolean
  workStartedAt?: number
  toolStatus?: string
}) {
  const [displayLen, setDisplayLen] = useState(0)
  const prevTextRef = useRef('')
  const [elapsed, setElapsed] = useState(0)

  // Reset typewriter when text changes (only for typewriter mode)
  useEffect(() => {
    if (useTypewriter && text !== prevTextRef.current) {
      setDisplayLen(0)
      prevTextRef.current = text
    }
  }, [text, useTypewriter])

  // Typewriter tick
  useEffect(() => {
    if (!useTypewriter || displayLen >= text.length) return
    const timer = setTimeout(() => {
      // Advance by 1-2 chars to keep up pace
      setDisplayLen((n) => Math.min(n + 1, text.length))
    }, TYPEWRITER_SPEED_MS)
    return () => clearTimeout(timer)
  }, [displayLen, text, useTypewriter])

  // Elapsed timer — only tick when working (not idle chat / completed)
  useEffect(() => {
    if (!workStartedAt || isIdleChat || isCompleted) {
      setElapsed(0)
      return
    }
    setElapsed(Date.now() - workStartedAt)
    const timer = setInterval(() => {
      setElapsed(Date.now() - workStartedAt)
    }, 1000)
    return () => clearInterval(timer)
  }, [workStartedAt, isIdleChat, isCompleted])

  const displayText = useTypewriter ? text.slice(0, displayLen) : text
  const showCursor = useTypewriter && displayLen < text.length
  // Show elapsed + tool status when working for over 5 seconds
  const showMeta = !isIdleChat && !isCompleted && workStartedAt && elapsed > 5000

  return (
    <div className={isIdleChat ? 'thought-bubble-container idle-chat' : 'thought-bubble-container'}>
      <div className={isIdleChat ? 'thought-bubble-tail idle-chat' : 'thought-bubble-tail'} />
      <div
        className={isIdleChat ? 'thought-bubble-content idle-chat' : 'thought-bubble-content'}
        style={{
          color: isCompleted
            ? 'var(--pixel-green)'
            : isIdleChat
              ? 'rgba(255, 240, 200, 0.9)'
              : isIdle
                ? 'rgba(255,255,255,0.5)'
                : 'rgba(255,255,255,0.85)',
        }}
      >
        {displayText}
        {showCursor && <span className="thought-cursor">|</span>}
        {showMeta && (
          <div className="thought-bubble-meta">
            <span className="thought-elapsed">{formatElapsed(elapsed)}</span>
            {toolStatus && <span className="thought-tool-status">{toolStatus}</span>}
          </div>
        )}
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
        // Must be working, just completed, or idle chatting
        if (!data.isWorking && !data.justCompleted && !data.isIdleChat) return null

        // Determine what text to show
        let displayText: string
        let isIdle = false
        let isCompleted = false
        let useTypewriter = false
        const isIdleChatBubble = !!data.isIdleChat

        if (isIdleChatBubble) {
          // Idle office chat — show text with typewriter
          displayText = data.text
          useTypewriter = true
        } else if (data.justCompleted) {
          displayText = '已完成任務 ✓'
          isCompleted = true
          useTypewriter = true
        } else if (data.text) {
          // Live streaming text — show latest snippet without typewriter
          displayText = extractLatestSnippet(stripMarkdown(data.text), MAX_DISPLAY_CHARS)
        } else {
          // Working but no text yet — show idle message with typewriter
          displayText = idleMessages[agentId] || IDLE_MESSAGES[0]
          isIdle = true
          useTypewriter = true
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
              useTypewriter={useTypewriter}
              isIdle={isIdle}
              isCompleted={isCompleted}
              isIdleChat={isIdleChatBubble}
              workStartedAt={data.workStartedAt}
              toolStatus={data.toolStatus}
            />
          </div>
        )
      })}
    </>
  )
}
