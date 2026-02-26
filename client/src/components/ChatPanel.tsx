import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import type { ChatState, ChatMessage, TeamMemberInfo } from '../hooks/useServerMessages.js'

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
}

export function ChatPanel({
  chatList, chats, onCreateChat, onSendMessage, onCloseChat, atCharacterLimit,
  mode, onModeChange, teamMembers, teamChats, onSendTeamMessage,
}: ChatPanelProps) {
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

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

  // Auto-select first team member
  useEffect(() => {
    if (teamMembers.length > 0 && !activeSkillId) {
      setActiveSkillId(teamMembers[0].skillId)
    }
  }, [teamMembers, activeSkillId])

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

  const handleSend = useCallback(() => {
    const text = inputValue.trim()
    if (!text) return

    if (mode === 'chat') {
      if (!activeChatId) return
      const chat = chats[activeChatId]
      if (chat?.isStreaming) return
      onSendMessage(activeChatId, text)
    } else {
      if (!activeSkillId) return
      const chat = teamChats[activeSkillId]
      if (chat?.isStreaming) return
      onSendTeamMessage(activeSkillId, text)
    }

    setInputValue('')
    inputRef.current?.focus()
  }, [mode, activeChatId, activeSkillId, inputValue, chats, teamChats, onSendMessage, onSendTeamMessage])

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

      {/* Team mode: member list */}
      {mode === 'team' && teamMembers.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0,
          borderBottom: '2px solid var(--pixel-border)',
          background: 'var(--pixel-btn-bg)',
        }}>
          {teamMembers.map((member) => {
            const memberChat = teamChats[member.skillId]
            const isStreaming = memberChat?.isStreaming
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
                {isStreaming && (
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--pixel-status-active)',
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
            fontSize: '20px',
            textAlign: 'center',
            padding: 20,
          }}>
            {mode === 'chat'
              ? (chatList.length === 0
                ? 'Click + to start a new Claude chat'
                : 'Select a chat tab')
              : (teamMembers.length === 0
                ? 'No team skills found.\nAdd .md files to skills/ directory.'
                : 'Select a team member')}
          </div>
        ) : (
          <>
            {activeChat.messages.map((msg, idx) => (
              <MessageBubble
                key={idx}
                message={msg}
                assistantName={mode === 'team' ? activeTeamMember?.name : undefined}
              />
            ))}
            {activeChat.isStreaming && activeChat.streamBuffer && (
              <MessageBubble
                message={{ role: 'assistant', content: activeChat.streamBuffer }}
                assistantName={mode === 'team' ? activeTeamMember?.name : undefined}
                isStreaming
              />
            )}
            {activeChat.isStreaming && !activeChat.streamBuffer && (
              <div style={{
                padding: '6px 10px',
                fontSize: '20px',
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
      {activeChat && (
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
            placeholder={mode === 'team' && activeTeamMember
              ? `Message ${activeTeamMember.name}...`
              : 'Type a message...'}
            disabled={activeChat.isStreaming}
            style={{
              flex: 1,
              resize: 'none',
              height: 60,
              padding: '6px 8px',
              fontSize: '20px',
              fontFamily: "'FS Pixel Sans', monospace",
              background: 'var(--pixel-bg)',
              color: 'var(--pixel-text)',
              border: '2px solid var(--pixel-border)',
              borderRadius: 0,
              outline: 'none',
            }}
          />
          <button
            onClick={handleSend}
            disabled={activeChat.isStreaming || !inputValue.trim()}
            style={{
              padding: '6px 12px',
              fontSize: '20px',
              fontFamily: "'FS Pixel Sans', monospace",
              background: activeChat.isStreaming || !inputValue.trim()
                ? 'var(--pixel-btn-bg)'
                : 'var(--pixel-accent)',
              color: activeChat.isStreaming || !inputValue.trim()
                ? 'var(--pixel-text-dim)'
                : '#fff',
              border: '2px solid var(--pixel-border)',
              borderRadius: 0,
              cursor: activeChat.isStreaming || !inputValue.trim() ? 'default' : 'pointer',
              alignSelf: 'flex-end',
            }}
          >
            Send
          </button>
        </div>
      )}
    </div>
  )
}

function MessageBubble({ message, assistantName, isStreaming }: {
  message: ChatMessage
  assistantName?: string
  isStreaming?: boolean
}) {
  const isUser = message.role === 'user'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
    }}>
      <div style={{
        fontSize: '20px',
        color: 'var(--pixel-text-dim)',
        marginBottom: 2,
        paddingLeft: isUser ? 0 : 4,
        paddingRight: isUser ? 4 : 0,
      }}>
        {isUser ? 'You' : (assistantName || 'Claude')}
      </div>
      <div
        className="chat-message-bubble"
        style={{
          maxWidth: '90%',
          padding: '6px 10px',
          fontSize: '20px',
          lineHeight: 1.5,
          background: isUser ? 'var(--pixel-accent)' : 'var(--pixel-btn-bg)',
          color: isUser ? '#fff' : 'var(--pixel-text)',
          border: `2px solid ${isUser ? 'rgba(255,255,255,0.2)' : 'var(--pixel-border)'}`,
          borderRadius: 0,
          wordBreak: 'break-word',
          opacity: isStreaming ? 0.9 : 1,
        }}
      >
        {isUser ? (
          <span style={{ whiteSpace: 'pre-wrap' }}>{message.content.trim()}</span>
        ) : (
          <ReactMarkdown
            components={{
              p: ({ children }) => <p style={{ margin: '0.3em 0' }}>{children}</p>,
              strong: ({ children }) => <strong style={{ fontWeight: 'bold' }}>{children}</strong>,
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
                      fontSize: '18px',
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
                    fontSize: '18px',
                  }}>
                    {children}
                  </code>
                )
              },
              pre: ({ children }) => <pre style={{ margin: '4px 0', overflow: 'auto' }}>{children}</pre>,
              ul: ({ children }) => <ul style={{ margin: '0.3em 0', paddingLeft: '1.2em' }}>{children}</ul>,
              ol: ({ children }) => <ol style={{ margin: '0.3em 0', paddingLeft: '1.2em' }}>{children}</ol>,
              li: ({ children }) => <li style={{ margin: '0.1em 0' }}>{children}</li>,
              h1: ({ children }) => <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '0.4em 0' }}>{children}</div>,
              h2: ({ children }) => <div style={{ fontSize: '22px', fontWeight: 'bold', margin: '0.3em 0' }}>{children}</div>,
              h3: ({ children }) => <div style={{ fontSize: '20px', fontWeight: 'bold', margin: '0.3em 0' }}>{children}</div>,
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
            {message.content.trim()}
          </ReactMarkdown>
        )}
        {isStreaming && <span className="pixel-agents-pulse">|</span>}
      </div>
    </div>
  )
}
