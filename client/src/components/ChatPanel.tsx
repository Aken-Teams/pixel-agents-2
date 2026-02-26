import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import type { ChatState, ChatMessage, TeamMemberInfo, DispatchedTask } from '../hooks/useServerMessages.js'

interface ChatPanelProps {
  chatList: string[]
  chats: Record<string, ChatState>
  onCreateChat: () => void
  onSendMessage: (chatId: string, message: string) => void
  onCloseChat: (chatId: string) => void
  atCharacterLimit?: boolean
  mode: 'chat' | 'team'
  onModeChange: (mode: 'chat' | 'team') => void
  teamMembers: TeamMemberInfo[]
  teamChats: Record<string, ChatState>
  onSendTeamMessage: (skillId: string, message: string) => void
  orchestratorSkillId: string | null
  orchestratorBusy: boolean
  dispatchedTasks: DispatchedTask[]
  onSendOrchestratorMessage: (message: string) => void
}

export function ChatPanel({
  chatList, chats, onCreateChat, onSendMessage, onCloseChat, atCharacterLimit,
  mode, onModeChange, teamMembers, teamChats, onSendTeamMessage,
  orchestratorSkillId, orchestratorBusy, dispatchedTasks, onSendOrchestratorMessage,
}: ChatPanelProps) {
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const hasOrchestrator = !!orchestratorSkillId
  const orchestratorMember = teamMembers.find((m) => m.skillId === orchestratorSkillId)
  const workerMembers = hasOrchestrator
    ? teamMembers.filter((m) => m.skillId !== orchestratorSkillId)
    : teamMembers

  // Auto-select first chat if active one was closed
  useEffect(() => {
    if (activeChatId && !chatList.includes(activeChatId)) {
      setActiveChatId(chatList.length > 0 ? chatList[0] : null)
    }
  }, [chatList, activeChatId])

  // Auto-select newly created chat
  useEffect(() => {
    if (chatList.length > 0 && !activeChatId) {
      setActiveChatId(chatList[chatList.length - 1])
    }
  }, [chatList, activeChatId])

  // Auto-select orchestrator or first team member
  useEffect(() => {
    if (teamMembers.length > 0 && !activeSkillId) {
      setActiveSkillId(orchestratorSkillId || teamMembers[0].skillId)
    }
  }, [teamMembers, activeSkillId, orchestratorSkillId])

  // Determine active chat state based on mode
  const activeChat = mode === 'chat'
    ? (activeChatId ? chats[activeChatId] : null)
    : (activeSkillId ? teamChats[activeSkillId] : null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeChat?.messages.length, activeChat?.streamBuffer])

  // Clear input when switching modes or active conversations
  useEffect(() => {
    setInputValue('')
  }, [mode, activeChatId, activeSkillId])

  const isActiveOrchestrator = activeSkillId === orchestratorSkillId
  const isInputDisabled = mode === 'team' && hasOrchestrator && !isActiveOrchestrator

  const handleSend = useCallback(() => {
    const text = inputValue.trim()
    if (!text) return

    if (mode === 'chat') {
      if (!activeChatId) return
      const chat = chats[activeChatId]
      if (chat?.isStreaming) return
      onSendMessage(activeChatId, text)
    } else if (hasOrchestrator && isActiveOrchestrator) {
      if (orchestratorBusy) return
      onSendOrchestratorMessage(text)
    } else {
      if (!activeSkillId) return
      const chat = teamChats[activeSkillId]
      if (chat?.isStreaming) return
      onSendTeamMessage(activeSkillId, text)
    }

    setInputValue('')
    inputRef.current?.focus()
  }, [mode, activeChatId, activeSkillId, inputValue, chats, teamChats,
    onSendMessage, onSendTeamMessage, onSendOrchestratorMessage,
    hasOrchestrator, isActiveOrchestrator, orchestratorBusy])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handleCreateChat = useCallback(() => {
    onCreateChat()
  }, [onCreateChat])

  // Get the active team member name for the message area header
  const activeTeamMember = teamMembers.find((m) => m.skillId === activeSkillId)

  // Get placeholder text
  const getPlaceholder = () => {
    if (mode === 'chat') return 'Type a message...'
    if (isInputDisabled) return `${activeTeamMember?.name || ''} (read-only)`
    if (isActiveOrchestrator) return 'Describe your task...'
    return activeTeamMember ? `Message ${activeTeamMember.name}...` : 'Type a message...'
  }

  // Check if send is blocked
  const isSendBlocked = () => {
    if (!activeChat) return true
    if (isInputDisabled) return true
    if (mode === 'team' && hasOrchestrator && isActiveOrchestrator) return orchestratorBusy || !inputValue.trim()
    return activeChat.isStreaming || !inputValue.trim()
  }

  return (
    <div style={{
      width: 340,
      minWidth: 340,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--pixel-bg)',
      borderRight: '2px solid var(--pixel-border)',
      fontFamily: "'FS Pixel Sans', monospace",
    }}>
      {/* Header with mode toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 10px',
        borderBottom: '2px solid var(--pixel-border)',
        background: 'var(--pixel-btn-bg)',
      }}>
        <div style={{ display: 'flex', gap: 0 }}>
          <button
            onClick={() => onModeChange('chat')}
            style={{
              padding: '2px 12px',
              fontSize: '22px',
              background: mode === 'chat' ? 'var(--pixel-accent)' : 'transparent',
              color: mode === 'chat' ? '#fff' : 'var(--pixel-text-dim)',
              border: '2px solid',
              borderColor: mode === 'chat' ? 'rgba(255,255,255,0.2)' : 'var(--pixel-border)',
              borderRadius: 0,
              cursor: 'pointer',
            }}
          >
            Chat
          </button>
          <button
            onClick={() => onModeChange('team')}
            style={{
              padding: '2px 12px',
              fontSize: '22px',
              background: mode === 'team' ? 'var(--pixel-accent)' : 'transparent',
              color: mode === 'team' ? '#fff' : 'var(--pixel-text-dim)',
              border: '2px solid',
              borderColor: mode === 'team' ? 'rgba(255,255,255,0.2)' : 'var(--pixel-border)',
              borderLeft: 'none',
              borderRadius: 0,
              cursor: 'pointer',
            }}
          >
            Team
          </button>
        </div>
        {mode === 'chat' && (
          <button
            onClick={atCharacterLimit ? undefined : handleCreateChat}
            disabled={atCharacterLimit}
            style={{
              padding: '2px 10px',
              fontSize: '22px',
              background: atCharacterLimit ? 'var(--pixel-btn-bg)' : 'var(--pixel-accent)',
              color: atCharacterLimit ? 'var(--pixel-text-dim)' : '#fff',
              border: '2px solid rgba(255,255,255,0.2)',
              borderRadius: 0,
              cursor: atCharacterLimit ? 'default' : 'pointer',
              opacity: atCharacterLimit ? 0.5 : 1,
            }}
            title={atCharacterLimit ? 'Character limit reached (max 21)' : 'New Chat'}
          >
            +
          </button>
        )}
      </div>

      {/* Chat mode: tab bar */}
      {mode === 'chat' && chatList.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0,
          borderBottom: '2px solid var(--pixel-border)',
          background: 'var(--pixel-btn-bg)',
        }}>
          {chatList.map((chatId, idx) => (
            <div
              key={chatId}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '4px 8px',
                fontSize: '18px',
                cursor: 'pointer',
                background: chatId === activeChatId ? 'var(--pixel-bg)' : 'transparent',
                color: chatId === activeChatId ? 'var(--pixel-text)' : 'var(--pixel-text-dim)',
                borderRight: '1px solid var(--pixel-border)',
                borderBottom: chatId === activeChatId ? '2px solid var(--pixel-bg)' : '2px solid transparent',
                marginBottom: -2,
              }}
              onClick={() => setActiveChatId(chatId)}
            >
              <span>Chat {idx + 1}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onCloseChat(chatId)
                }}
                style={{
                  marginLeft: 6,
                  padding: '0 4px',
                  fontSize: '16px',
                  background: 'transparent',
                  color: 'var(--pixel-text-dim)',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: 0.6,
                }}
                title="Close chat"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Team mode: orchestrator + member tabs */}
      {mode === 'team' && teamMembers.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0,
          borderBottom: '2px solid var(--pixel-border)',
          background: 'var(--pixel-btn-bg)',
        }}>
          {/* Orchestrator tab (if exists) — distinct gold accent */}
          {orchestratorMember && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                fontSize: '18px',
                cursor: 'pointer',
                background: orchestratorSkillId === activeSkillId
                  ? 'rgba(218, 165, 32, 0.25)'
                  : 'rgba(218, 165, 32, 0.08)',
                color: orchestratorSkillId === activeSkillId ? '#ffd666' : '#c8a840',
                borderRight: '2px solid var(--pixel-border)',
                borderBottom: orchestratorSkillId === activeSkillId ? '2px solid rgba(218, 165, 32, 0.25)' : '2px solid transparent',
                marginBottom: -2,
                fontWeight: 600,
              }}
              onClick={() => setActiveSkillId(orchestratorSkillId)}
            >
              {orchestratorBusy && (
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#f0a030',
                  flexShrink: 0,
                  animation: 'pixel-agents-pulse 1.5s ease-in-out infinite',
                }} />
              )}
              <span>{orchestratorMember.name}</span>
            </div>
          )}
          {/* Worker tabs */}
          {workerMembers.map((member) => {
            const memberChat = teamChats[member.skillId]
            const isStreaming = memberChat?.isStreaming
            const task = dispatchedTasks.find((t) => t.targetSkillId === member.skillId && !t.completed)
            const hasCompleted = dispatchedTasks.some((t) => t.targetSkillId === member.skillId && t.completed)
            return (
              <div
                key={member.skillId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  fontSize: '18px',
                  cursor: 'pointer',
                  background: member.skillId === activeSkillId ? 'var(--pixel-bg)' : 'transparent',
                  color: member.skillId === activeSkillId ? 'var(--pixel-text)' : 'var(--pixel-text-dim)',
                  borderRight: '1px solid var(--pixel-border)',
                  borderBottom: member.skillId === activeSkillId ? '2px solid var(--pixel-bg)' : '2px solid transparent',
                  marginBottom: -2,
                }}
                onClick={() => setActiveSkillId(member.skillId)}
              >
                {(isStreaming || task) && (
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--pixel-status-active)',
                    flexShrink: 0,
                  }} />
                )}
                {!isStreaming && !task && hasCompleted && (
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--pixel-green)',
                    flexShrink: 0,
                  }} />
                )}
                <span>{member.name}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Messages area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {!activeChat ? (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--pixel-text-dim)',
            fontSize: '14px',
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans TC', sans-serif",
            textAlign: 'center',
            padding: 20,
          }}>
            {mode === 'chat'
              ? (chatList.length === 0
                ? 'Click + to start a new Claude chat'
                : 'Select a chat tab')
              : (teamMembers.length === 0
                ? 'No team skills found.\nAdd .md files to skills/ directory.'
                : hasOrchestrator
                  ? 'Describe your task to the orchestrator'
                  : 'Select a team member')}
          </div>
        ) : (
          <>
            {activeChat.messages.map((msg, idx) => (
              <MessageBubble
                key={idx}
                message={msg}
                assistantName={mode === 'team' ? activeTeamMember?.name : undefined}
                teamMembers={teamMembers}
              />
            ))}
            {activeChat.isStreaming && activeChat.streamBuffer && (
              <MessageBubble
                message={{ role: 'assistant', content: activeChat.streamBuffer }}
                assistantName={mode === 'team' ? activeTeamMember?.name : undefined}
                teamMembers={teamMembers}
                isStreaming
              />
            )}
            {activeChat.isStreaming && !activeChat.streamBuffer && (
              <div style={{
                padding: '6px 10px',
                fontSize: '14px',
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                color: 'var(--pixel-text-dim)',
              }}>
                Thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      {activeChat && !isInputDisabled && (
        <div style={{
          borderTop: '2px solid var(--pixel-border)',
          padding: '8px',
          display: 'flex',
          gap: 6,
        }}>
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            disabled={isSendBlocked() && !inputValue.trim()}
            style={{
              flex: 1,
              resize: 'none',
              height: 60,
              padding: '6px 8px',
              fontSize: '14.5px',
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans TC', 'Microsoft JhengHei', sans-serif",
              background: 'var(--pixel-bg)',
              color: 'var(--pixel-text)',
              border: '2px solid var(--pixel-border)',
              borderRadius: 0,
              outline: 'none',
            }}
          />
          <button
            onClick={handleSend}
            disabled={isSendBlocked()}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontWeight: 600,
              background: isSendBlocked()
                ? 'var(--pixel-btn-bg)'
                : 'var(--pixel-accent)',
              color: isSendBlocked()
                ? 'var(--pixel-text-dim)'
                : '#fff',
              border: '2px solid var(--pixel-border)',
              borderRadius: 0,
              cursor: isSendBlocked() ? 'default' : 'pointer',
              alignSelf: 'flex-end',
            }}
          >
            Send
          </button>
        </div>
      )}

      {/* Read-only indicator for sub-agent tabs */}
      {activeChat && isInputDisabled && (
        <div style={{
          borderTop: '2px solid var(--pixel-border)',
          padding: '8px 12px',
          fontSize: '12px',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: 'var(--pixel-text-dim)',
          textAlign: 'center',
        }}>
          Tasks are dispatched by {orchestratorMember?.name || 'the orchestrator'}
        </div>
      )}
    </div>
  )
}

// System font stack for readable mixed CJK/Latin content
const MESSAGE_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans TC', 'Microsoft JhengHei', sans-serif"
const CODE_FONT = "'Cascadia Code', 'Fira Code', 'Source Code Pro', Consolas, monospace"

/**
 * Strip [TASK:xxx]...[/TASK] blocks from text and replace with dispatch cards.
 */
function stripTaskBlocks(text: string): { cleanText: string; tasks: { skillId: string; description: string }[] } {
  const tasks: { skillId: string; description: string }[] = []
  const cleanText = text.replace(
    /\[TASK:(\w[\w-]*)\]\s*([\s\S]*?)\s*\[\/TASK\]/g,
    (_match, skillId: string, description: string) => {
      tasks.push({ skillId, description })
      return ''
    },
  ).trim()
  return { cleanText, tasks }
}

function MessageBubble({ message, assistantName, isStreaming, teamMembers }: {
  message: ChatMessage
  assistantName?: string
  isStreaming?: boolean
  teamMembers?: TeamMemberInfo[]
}) {
  const isUser = message.role === 'user'

  // Parse TASK blocks in assistant messages
  const { cleanText, tasks } = !isUser
    ? stripTaskBlocks(message.content)
    : { cleanText: message.content, tasks: [] }

  // Check if this is a RESULT message (auto-generated by orchestrator)
  const isResultFeedback = !isUser && message.content.startsWith('[RESULT:')

  // Skip rendering pure result feedback messages (they're internal)
  if (isResultFeedback && isUser) return null

  const getMemberName = (skillId: string) =>
    teamMembers?.find((m) => m.skillId === skillId)?.name || skillId

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
    }}>
      <div style={{
        fontSize: '12px',
        fontFamily: MESSAGE_FONT,
        fontWeight: 600,
        color: 'var(--pixel-text-dim)',
        marginBottom: 2,
        paddingLeft: isUser ? 0 : 4,
        paddingRight: isUser ? 4 : 0,
        letterSpacing: '0.02em',
      }}>
        {isUser ? 'You' : (assistantName || 'Claude')}
      </div>

      {/* Main text content (with TASK blocks stripped) */}
      {cleanText && (
        <div
          className="chat-message-bubble"
          style={{
            maxWidth: '90%',
            padding: '8px 10px',
            fontSize: '14.5px',
            lineHeight: 1.6,
            fontFamily: MESSAGE_FONT,
            background: isUser ? 'var(--pixel-accent)' : 'var(--pixel-btn-bg)',
            color: isUser ? '#fff' : 'var(--pixel-text)',
            border: `2px solid ${isUser ? 'rgba(255,255,255,0.2)' : 'var(--pixel-border)'}`,
            borderRadius: 0,
            wordBreak: 'break-word',
            opacity: isStreaming ? 0.9 : 1,
          }}
        >
          {isUser ? (
            <span style={{ whiteSpace: 'pre-wrap' }}>{cleanText.trim()}</span>
          ) : (
            <ReactMarkdown
              components={{
                p: ({ children }) => <p style={{ margin: '0.3em 0' }}>{children}</p>,
                strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
                em: ({ children }) => <em>{children}</em>,
                code: ({ children, className }) => {
                  const isBlock = className?.includes('language-')
                  if (isBlock) {
                    return (
                      <code style={{
                        display: 'block',
                        background: 'rgba(0,0,0,0.3)',
                        padding: '6px 8px',
                        margin: '4px 0',
                        fontSize: '13px',
                        fontFamily: CODE_FONT,
                        overflowX: 'auto',
                        whiteSpace: 'pre',
                      }}>
                        {children}
                      </code>
                    )
                  }
                  return (
                    <code style={{
                      background: 'rgba(0,0,0,0.25)',
                      padding: '1px 4px',
                      fontSize: '13px',
                      fontFamily: CODE_FONT,
                    }}>
                      {children}
                    </code>
                  )
                },
                pre: ({ children }) => <pre style={{ margin: '4px 0', overflow: 'auto' }}>{children}</pre>,
                ul: ({ children }) => <ul style={{ margin: '0.3em 0', paddingLeft: '1.2em' }}>{children}</ul>,
                ol: ({ children }) => <ol style={{ margin: '0.3em 0', paddingLeft: '1.2em' }}>{children}</ol>,
                li: ({ children }) => <li style={{ margin: '0.15em 0' }}>{children}</li>,
                h1: ({ children }) => <div style={{ fontSize: '17px', fontWeight: 700, margin: '0.5em 0 0.3em' }}>{children}</div>,
                h2: ({ children }) => <div style={{ fontSize: '16px', fontWeight: 700, margin: '0.4em 0 0.2em' }}>{children}</div>,
                h3: ({ children }) => <div style={{ fontSize: '15px', fontWeight: 600, margin: '0.3em 0 0.2em' }}>{children}</div>,
                a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#7ecfff' }}>{children}</a>,
                blockquote: ({ children }) => (
                  <blockquote style={{
                    borderLeft: '3px solid var(--pixel-text-dim)',
                    margin: '0.3em 0',
                    paddingLeft: '8px',
                    opacity: 0.85,
                  }}>
                    {children}
                  </blockquote>
                ),
              }}
            >
              {cleanText.trim()}
            </ReactMarkdown>
          )}
          {isStreaming && <span className="pixel-agents-pulse">|</span>}
        </div>
      )}

      {/* Task dispatch cards */}
      {tasks.map((task, i) => (
        <div key={i} style={{
          maxWidth: '90%',
          marginTop: 4,
          padding: '6px 10px',
          fontSize: '13px',
          fontFamily: MESSAGE_FONT,
          background: 'rgba(90, 140, 255, 0.12)',
          border: '2px solid rgba(90, 140, 255, 0.3)',
          borderRadius: 0,
          color: 'var(--pixel-text)',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 2, color: 'var(--pixel-accent)' }}>
            Dispatched to {getMemberName(task.skillId)}
          </div>
          <div style={{
            fontSize: '12px',
            color: 'var(--pixel-text-dim)',
            whiteSpace: 'pre-wrap',
            maxHeight: 60,
            overflow: 'hidden',
          }}>
            {task.description.slice(0, 150)}{task.description.length > 150 ? '...' : ''}
          </div>
        </div>
      ))}
    </div>
  )
}
