import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { wsClient } from '../wsClient.js'

interface InterviewModalProps {
  questions: string
  onClose: () => void
}

export function InterviewModal({ questions, onClose }: InterviewModalProps) {
  const [response, setResponse] = useState('')
  const [hovered, setHovered] = useState<string | null>(null)

  const handleSubmit = () => {
    if (!response.trim()) return
    wsClient.postMessage({ type: 'submitInterviewResponse', response: response.trim() })
    onClose()
  }

  const handleSkip = () => {
    wsClient.postMessage({ type: 'submitInterviewResponse', response: '跳過，直接開始開發。' })
    onClose()
  }

  return (
    <>
      {/* Dark backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.6)',
          zIndex: 69,
        }}
      />
      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 70,
          background: 'var(--pixel-bg)',
          border: '2px solid var(--pixel-border)',
          borderRadius: 0,
          padding: '4px',
          boxShadow: 'var(--pixel-shadow)',
          width: 520,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 10px',
            borderBottom: '1px solid var(--pixel-border)',
            marginBottom: '4px',
          }}
        >
          <span style={{ fontSize: '22px', color: 'rgba(255, 255, 255, 0.9)' }}>
            Requirement Interview
          </span>
        </div>

        {/* Questions (markdown rendered) */}
        <div
          style={{
            padding: '8px 12px',
            overflowY: 'auto',
            flex: 1,
            fontSize: '18px',
            color: 'rgba(255, 255, 255, 0.85)',
            lineHeight: 1.5,
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{questions}</ReactMarkdown>
        </div>

        {/* Response textarea */}
        <div style={{ padding: '8px 12px' }}>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Please enter your answers..."
            style={{
              width: '100%',
              minHeight: 120,
              padding: '8px',
              fontSize: '18px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--pixel-border)',
              borderRadius: 0,
              color: 'rgba(255, 255, 255, 0.9)',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Action buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '6px 12px 8px',
            borderTop: '1px solid var(--pixel-border)',
          }}
        >
          <button
            onClick={handleSkip}
            onMouseEnter={() => setHovered('skip')}
            onMouseLeave={() => setHovered(null)}
            style={{
              padding: '6px 16px',
              fontSize: '20px',
              background: hovered === 'skip' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.06)',
              color: 'rgba(255, 255, 255, 0.6)',
              border: '1px solid var(--pixel-border)',
              borderRadius: 0,
              cursor: 'pointer',
            }}
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            onMouseEnter={() => setHovered('submit')}
            onMouseLeave={() => setHovered(null)}
            style={{
              padding: '6px 16px',
              fontSize: '20px',
              background: hovered === 'submit' ? 'rgba(90, 140, 255, 0.9)' : 'rgba(90, 140, 255, 0.7)',
              color: '#fff',
              border: '1px solid rgba(90, 140, 255, 0.5)',
              borderRadius: 0,
              cursor: response.trim() ? 'pointer' : 'default',
              opacity: response.trim() ? 1 : 0.5,
            }}
          >
            Submit
          </button>
        </div>
      </div>
    </>
  )
}
