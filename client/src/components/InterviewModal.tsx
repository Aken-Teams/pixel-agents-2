import { useState } from 'react'
import { wsClient } from '../wsClient.js'

export interface InterviewQuestion {
  id: string
  question: string
}

interface InterviewModalProps {
  questions: InterviewQuestion[]
  onClose: () => void
}

/** Split "**title** hint" into { title, hint }. Falls back to whole text as title. */
function parseQuestionParts(q: string): { title: string; hint: string } {
  const match = q.match(/\*\*(.+?)\*\*\s*(.*)/)
  if (match) return { title: match[1], hint: match[2] }
  return { title: q, hint: '' }
}

export function InterviewModal({ questions, onClose }: InterviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [hovered, setHovered] = useState<string | null>(null)

  const current = questions[currentIndex]
  const isLast = currentIndex === questions.length - 1
  const { title, hint } = parseQuestionParts(current.question)

  const finishInterview = (allAnswers: Record<string, string>) => {
    const responseLines: string[] = []
    for (const q of questions) {
      if (allAnswers[q.id]) {
        const { title: qTitle } = parseQuestionParts(q.question)
        responseLines.push(`${qTitle}\n→ ${allAnswers[q.id]}`)
      }
    }
    if (responseLines.length === 0) {
      wsClient.postMessage({ type: 'submitInterviewResponse', response: '跳過，直接開始開發。' })
    } else {
      wsClient.postMessage({ type: 'submitInterviewResponse', response: responseLines.join('\n\n') })
    }
    onClose()
  }

  const handleNext = () => {
    const trimmed = currentAnswer.trim()
    const newAnswers = { ...answers }
    if (trimmed) {
      newAnswers[current.id] = trimmed
    }
    setAnswers(newAnswers)

    if (isLast) {
      finishInterview(newAnswers)
    } else {
      setCurrentAnswer('')
      setCurrentIndex((i) => i + 1)
    }
  }

  const handleSkip = () => {
    if (isLast) {
      finishInterview(answers)
    } else {
      setCurrentAnswer('')
      setCurrentIndex((i) => i + 1)
    }
  }

  const handleSkipAll = () => {
    finishInterview(answers)
  }

  return (
    <>
      {/* Backdrop */}
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
        className="interview-modal"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 70,
          background: 'var(--pixel-bg)',
          border: '2px solid var(--pixel-border)',
          padding: '4px',
          boxShadow: 'var(--pixel-shadow)',
          width: 520,
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
            padding: '8px 12px',
            borderBottom: '1px solid var(--pixel-border)',
            marginBottom: '4px',
          }}
        >
          <span style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
            需求訪談
          </span>
          <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.45)' }}>
            {currentIndex + 1} / {questions.length}
          </span>
        </div>

        {/* Question */}
        <div style={{ padding: '16px 16px 8px' }}>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.95)',
              lineHeight: 1.6,
              marginBottom: hint ? '6px' : '14px',
            }}
          >
            {title}
          </div>
          {hint && (
            <div
              style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.45)',
                lineHeight: 1.5,
                marginBottom: '14px',
              }}
            >
              {hint}
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: '0 16px 14px' }}>
          <textarea
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder="請輸入您的回答，或跳過此題..."
            autoFocus
            style={{
              width: '100%',
              minHeight: 80,
              padding: '8px 10px',
              fontSize: '14px',
              lineHeight: 1.5,
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--pixel-border)',
              color: 'rgba(255, 255, 255, 0.9)',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px 10px',
            borderTop: '1px solid var(--pixel-border)',
          }}
        >
          <button
            onClick={handleSkipAll}
            onMouseEnter={() => setHovered('skipAll')}
            onMouseLeave={() => setHovered(null)}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              background: 'transparent',
              color: hovered === 'skipAll' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.3)',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            全部跳過，直接開始
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSkip}
              onMouseEnter={() => setHovered('skip')}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding: '6px 16px',
                fontSize: '14px',
                background: hovered === 'skip' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.06)',
                color: 'rgba(255, 255, 255, 0.6)',
                border: '1px solid var(--pixel-border)',
                cursor: 'pointer',
              }}
            >
              跳過
            </button>
            <button
              onClick={handleNext}
              onMouseEnter={() => setHovered('next')}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding: '6px 16px',
                fontSize: '14px',
                background: hovered === 'next' ? 'rgba(90, 140, 255, 0.9)' : 'rgba(90, 140, 255, 0.7)',
                color: '#fff',
                border: '1px solid rgba(90, 140, 255, 0.5)',
                cursor: currentAnswer.trim() ? 'pointer' : 'default',
                opacity: currentAnswer.trim() ? 1 : 0.5,
              }}
            >
              {isLast ? '完成' : '下一題 →'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
