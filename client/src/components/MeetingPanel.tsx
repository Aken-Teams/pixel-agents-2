import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { MeetingState, TeamMemberInfo } from '../hooks/useServerMessages.js'
import { PixelSpriteAvatar } from './PixelSpriteAvatar.js'

interface MeetingPanelProps {
  meeting: MeetingState | null
  teamMembers: TeamMemberInfo[]
}

/** Strip protocol markers and internal labels from meeting message text */
function cleanMeetingText(text: string): string {
  return text
    .replace(/\[MEETING\]/gi, '')
    .replace(/\[\/MEETING\]/gi, '')
    .replace(/\[SUMMARY\][\s\S]*?\[\/SUMMARY\]/gi, '')
    .replace(/\[SUMMARY\]/gi, '')
    .replace(/\[\/SUMMARY\]/gi, '')
    .replace(/\[RESULT[:\w-]*\]/gi, '')
    .replace(/\[\/RESULT\]/gi, '')
    .trim()
}

export function MeetingPanel({ meeting, teamMembers }: MeetingPanelProps) {
  const [collapsed, setCollapsed] = useState(true)
  const [hasBeenOpened, setHasBeenOpened] = useState(false)
  const [hovered, setHovered] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-open when meeting starts
  useEffect(() => {
    if (meeting?.isActive) {
      setCollapsed(false)
      setHasBeenOpened(true)
    }
  }, [meeting?.isActive])

  // Auto-collapse when meeting ends (after short delay)
  useEffect(() => {
    if (meeting && !meeting.isActive && hasBeenOpened) {
      const timer = setTimeout(() => setCollapsed(true), 5000)
      return () => clearTimeout(timer)
    }
  }, [meeting?.isActive, hasBeenOpened])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [meeting?.messages])

  // Don't render if no meeting ever occurred
  if (!meeting) return null

  // ── Collapsed: small icon button ──
  if (collapsed) {
    return (
      <button
        className="meeting-panel"
        onClick={() => setCollapsed(false)}
        title={`會議：${meeting.topic}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'absolute',
          top: 56,
          right: 8,
          zIndex: 45,
          width: 40,
          height: 40,
          padding: 0,
          background: hovered ? 'var(--pixel-btn-hover-bg)' : 'var(--pixel-bg)',
          border: '2px solid var(--pixel-border)',
          borderRadius: 0,
          cursor: 'pointer',
          boxShadow: 'var(--pixel-shadow)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--pixel-text)',
        }}
      >
        {/* People/meeting icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="17" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M15 14c2.2 0 4 1.8 4 4v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        {meeting.isActive && (
          <span style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#4ade80',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
        )}
      </button>
    )
  }

  // ── Expanded: floating panel ──
  return (
    <div
      className="meeting-panel"
      style={{
        position: 'absolute',
        top: 56,
        right: 8,
        zIndex: 45,
        width: 380,
        maxHeight: '60vh',
        background: 'var(--pixel-bg)',
        border: '2px solid var(--pixel-border)',
        borderRadius: 0,
        boxShadow: 'var(--pixel-shadow)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 10px',
        borderBottom: '1px solid var(--pixel-border)',
        background: 'rgba(90, 140, 255, 0.1)',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, color: 'var(--pixel-text)' }}>
          {/* Meeting icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="17" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M15 14c2.2 0 4 1.8 4 4v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span style={{
            fontSize: 13,
            color: 'var(--pixel-text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {meeting.topic}
          </span>
          {meeting.isActive && (
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#4ade80',
              flexShrink: 0,
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          )}
        </div>
        <button
          onClick={() => setCollapsed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--pixel-text-dim)',
            cursor: 'pointer',
            fontSize: 14,
            padding: '0 4px',
            flexShrink: 0,
          }}
        >
          ▲
        </button>
      </div>

      {/* Participant avatars row */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '6px 10px',
        borderBottom: '1px solid var(--pixel-border)',
        flexWrap: 'wrap',
      }}>
        {meeting.participants.map(p => {
          const member = teamMembers.find(m => m.skillId === p.skillId)
          const isSpeaking = meeting.messages.find(m => m.skillId === p.skillId && m.isStreaming)
          return (
            <div key={p.skillId} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              opacity: isSpeaking ? 1 : 0.7,
            }}>
              <PixelSpriteAvatar
                palette={member?.palette ?? 0}
                hueShift={member?.hueShift ?? 0}
                zoom={1.5}
              />
              <span style={{ fontSize: 11, color: 'var(--pixel-text-dim)' }}>
                {p.name}
              </span>
            </div>
          )
        })}
      </div>

      {/* Messages area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        {meeting.messages.length === 0 && meeting.isActive && (
          <div style={{ color: 'var(--pixel-text-dim)', fontSize: 12, textAlign: 'center', padding: 16 }}>
            等待成員發言...
          </div>
        )}

        {meeting.messages.map((msg, idx) => {
          const member = teamMembers.find(m => m.skillId === msg.skillId)
          const rawText = msg.content || msg.streamBuffer || ''
          const displayText = cleanMeetingText(rawText)
          return (
            <div key={idx}>
              {/* Participant name label */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginBottom: 4,
              }}>
                <PixelSpriteAvatar
                  palette={member?.palette ?? 0}
                  hueShift={member?.hueShift ?? 0}
                  zoom={1}
                />
                <span style={{
                  fontSize: 12,
                  color: 'var(--pixel-accent)',
                  fontWeight: 600,
                }}>
                  {msg.name}
                </span>
                {msg.isStreaming && (
                  <span style={{ fontSize: 10, color: 'var(--pixel-text-dim)' }}>
                    發言中...
                  </span>
                )}
              </div>
              {/* Message content */}
              <div className="chat-message-bubble" style={{
                background: 'var(--pixel-btn-bg)',
                padding: '6px 10px',
                border: '1px solid var(--pixel-border)',
                fontSize: 13,
                lineHeight: 1.5,
                color: 'var(--pixel-text)',
              }}>
                {displayText ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayText}</ReactMarkdown>
                ) : (
                  <span style={{ color: 'var(--pixel-text-dim)', fontStyle: 'italic' }}>思考中...</span>
                )}
              </div>
            </div>
          )
        })}

        {/* Meeting notes summary (shown after meeting ends) */}
        {!meeting.isActive && meeting.notes && (
          <div style={{
            marginTop: 8,
            padding: '8px 10px',
            background: 'rgba(90, 140, 255, 0.08)',
            border: '1px solid var(--pixel-accent)',
            fontSize: 12,
            color: 'var(--pixel-text-dim)',
          }}>
            會議已結束
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
