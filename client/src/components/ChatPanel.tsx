import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import type { ChatState, ChatMessage } from '../hooks/useServerMessages.js'

interface ChatPanelProps {
  chatList: string[]
  chats: Record<string, ChatState>
  onCreateChat: () => void
  onSendMessage: (chatId: string, message: string) => void
  onCloseChat: (chatId: string) => void
}

export function ChatPanel({ chatList, chats, onCreateChat, onSendMessage, onCloseChat }: ChatPanelProps) {
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
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

  // Scroll to bottom when messages change
  const activeChat = activeChatId ? chats[activeChatId] : null
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeChat?.messages.length, activeChat?.streamBuffer])

  const handleSend = useCallback(() => {
    if (!activeChatId || !inputValue.trim()) return
    const chat = chats[activeChatId]
    if (chat?.isStreaming) return

    // Add user message to local state immediately (optimistic)
    // The server doesn't echo back user messages
    onSendMessage(activeChatId, inputValue.trim())

    // We need to add the user message to the chat state ourselves
    // This is handled by storing it in a local queue
    setInputValue('')
    inputRef.current?.focus()
  }, [activeChatId, inputValue, chats, onSendMessage])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handleCreateChat = useCallback(() => {
    onCreateChat()
  }, [onCreateChat])

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
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 10px',
        borderBottom: '2px solid var(--pixel-border)',
        background: 'var(--pixel-btn-bg)',
      }}>
        <span style={{ fontSize: '22px', color: 'var(--pixel-text)' }}>Claude Chat</span>
        <button
          onClick={handleCreateChat}
          style={{
            padding: '2px 10px',
            fontSize: '22px',
            background: 'var(--pixel-accent)',
            color: '#fff',
            border: '2px solid rgba(255,255,255,0.2)',
            borderRadius: 0,
            cursor: 'pointer',
          }}
          title="New Chat"
        >
          +
        </button>
      </div>

      {/* Tab bar */}
      {chatList.length > 0 && (
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
            {chatList.length === 0
              ? 'Click + to start a new Claude chat'
              : 'Select a chat tab'}
          </div>
        ) : (
          <>
            {activeChat.messages.map((msg, idx) => (
              <MessageBubble key={idx} message={msg} />
            ))}
            {activeChat.isStreaming && activeChat.streamBuffer && (
              <MessageBubble
                message={{ role: 'assistant', content: activeChat.streamBuffer }}
                isStreaming
              />
            )}
            {activeChat.isStreaming && !activeChat.streamBuffer && (
              <div style={{
                padding: '6px 10px',
                fontSize: '18px',
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
            placeholder="Type a message..."
            disabled={activeChat.isStreaming}
            style={{
              flex: 1,
              resize: 'none',
              height: 60,
              padding: '6px 8px',
              fontSize: '18px',
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
              fontSize: '18px',
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

function MessageBubble({ message, isStreaming }: { message: ChatMessage; isStreaming?: boolean }) {
  const isUser = message.role === 'user'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
    }}>
      <div style={{
        fontSize: '18px',
        color: 'var(--pixel-text-dim)',
        marginBottom: 2,
        paddingLeft: isUser ? 0 : 4,
        paddingRight: isUser ? 4 : 0,
      }}>
        {isUser ? 'You' : 'Claude'}
      </div>
      <div style={{
        maxWidth: '90%',
        padding: '6px 10px',
        fontSize: '18px',
        lineHeight: 1.4,
        background: isUser ? 'var(--pixel-accent)' : 'var(--pixel-btn-bg)',
        color: isUser ? '#fff' : 'var(--pixel-text)',
        border: `2px solid ${isUser ? 'rgba(255,255,255,0.2)' : 'var(--pixel-border)'}`,
        borderRadius: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        opacity: isStreaming ? 0.9 : 1,
      }}>
        {message.content.trim()}
        {isStreaming && <span className="pixel-agents-pulse">|</span>}
      </div>
    </div>
  )
}
