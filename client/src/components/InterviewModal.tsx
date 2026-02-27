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

type Phase = 'questions' | 'confirm'

export function InterviewModal({ questions, onClose }: InterviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [hovered, setHovered] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('questions')

  const current = questions[currentIndex]
  const isFirst = currentIndex === 0
  const isLast = currentIndex === questions.length - 1

  const submitAnswers = (allAnswers: Record<string, string>) => {
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

  /** Save current answer and move to next question or confirmation screen */
  const handleNext = () => {
    const trimmed = currentAnswer.trim()
    const newAnswers = { ...answers }
    if (trimmed) {
      newAnswers[current.id] = trimmed
    } else {
      delete newAnswers[current.id]
    }
    setAnswers(newAnswers)

    if (isLast) {
      setPhase('confirm')
    } else {
      setCurrentAnswer(newAnswers[questions[currentIndex + 1]?.id] || '')
      setCurrentIndex((i) => i + 1)
    }
  }

  /** Skip current question (don't save) and move forward */
  const handleSkip = () => {
    const newAnswers = { ...answers }
    delete newAnswers[current.id]
    setAnswers(newAnswers)

    if (isLast) {
      setPhase('confirm')
    } else {
      setCurrentAnswer(newAnswers[questions[currentIndex + 1]?.id] || '')
      setCurrentIndex((i) => i + 1)
    }
  }

  /** Go back to previous question */
  const handlePrev = () => {
    // Save current answer before going back
    const trimmed = currentAnswer.trim()
    const newAnswers = { ...answers }
    if (trimmed) {
      newAnswers[current.id] = trimmed
    } else {
      delete newAnswers[current.id]
    }
    setAnswers(newAnswers)

    const prevIdx = currentIndex - 1
    setCurrentAnswer(newAnswers[questions[prevIdx]?.id] || '')
    setCurrentIndex(prevIdx)
  }

  /** Skip all and submit immediately */
  const handleSkipAll = () => {
    submitAnswers(answers)
  }

  /** From confirm screen: go back to edit a specific question */
  const handleEditQuestion = (idx: number) => {
    setCurrentAnswer(answers[questions[idx]?.id] || '')
    setCurrentIndex(idx)
    setPhase('questions')
  }

  const answeredCount = Object.keys(answers).filter((k) => answers[k]).length

  // ─── Confirmation Screen ───
  if (phase === 'confirm') {
    return (
      <>
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0, 0, 0, 0.6)', zIndex: 69,
        }} />
        <div
          className="interview-modal"
          style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)', zIndex: 70,
            background: 'var(--pixel-bg)', border: '2px solid var(--pixel-border)',
            padding: '4px', boxShadow: 'var(--pixel-shadow)',
            width: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px', borderBottom: '1px solid var(--pixel-border)', marginBottom: '4px',
          }}>
            <span style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
              確認您的回答
            </span>
            <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.45)' }}>
              {answeredCount} / {questions.length} 題已回答
            </span>
          </div>

          {/* Answer summary */}
          <div style={{
            padding: '8px 16px', overflowY: 'auto', flex: 1,
          }}>
            {questions.map((q, idx) => {
              const { title } = parseQuestionParts(q.question)
              const answer = answers[q.id]
              return (
                <div
                  key={q.id}
                  onClick={() => handleEditQuestion(idx)}
                  onMouseEnter={() => setHovered(`edit-${idx}`)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    padding: '8px 10px',
                    marginBottom: '6px',
                    background: hovered === `edit-${idx}` ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.15)',
                    border: '1px solid var(--pixel-border)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    fontSize: '13px', fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.7)', marginBottom: answer ? '4px' : 0,
                  }}>
                    {idx + 1}. {title}
                  </div>
                  {answer ? (
                    <div style={{
                      fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)',
                      lineHeight: 1.4, whiteSpace: 'pre-wrap',
                    }}>
                      {answer}
                    </div>
                  ) : (
                    <div style={{
                      fontSize: '12px', color: 'rgba(255, 255, 255, 0.3)', fontStyle: 'italic',
                    }}>
                      （已跳過）
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 16px 10px', borderTop: '1px solid var(--pixel-border)',
          }}>
            <button
              onClick={handleSkipAll}
              onMouseEnter={() => setHovered('skipAll')}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding: '4px 8px', fontSize: '12px', background: 'transparent',
                color: hovered === 'skipAll' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.3)',
                border: 'none', cursor: 'pointer', textDecoration: 'underline',
              }}
            >
              全部跳過，直接開始
            </button>
            <button
              onClick={() => submitAnswers(answers)}
              onMouseEnter={() => setHovered('confirm')}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding: '6px 20px', fontSize: '14px',
                background: hovered === 'confirm' ? 'rgba(90, 200, 140, 0.9)' : 'rgba(90, 200, 140, 0.7)',
                color: '#fff', border: '1px solid rgba(90, 200, 140, 0.5)', cursor: 'pointer',
              }}
            >
              確認送出
            </button>
          </div>
        </div>
      </>
    )
  }

  // ─── Question Screen ───
  const { title, hint } = parseQuestionParts(current.question)

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: 'rgba(0, 0, 0, 0.6)', zIndex: 69,
      }} />
      {/* Modal */}
      <div
        className="interview-modal"
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)', zIndex: 70,
          background: 'var(--pixel-bg)', border: '2px solid var(--pixel-border)',
          padding: '4px', boxShadow: 'var(--pixel-shadow)',
          width: 520, display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', borderBottom: '1px solid var(--pixel-border)', marginBottom: '4px',
        }}>
          <span style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
            需求訪談
          </span>
          <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.45)' }}>
            {currentIndex + 1} / {questions.length}
          </span>
        </div>

        {/* Question */}
        <div style={{ padding: '16px 16px 8px' }}>
          <div style={{
            fontSize: '16px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.95)',
            lineHeight: 1.6, marginBottom: hint ? '6px' : '14px',
          }}>
            {title}
          </div>
          {hint && (
            <div style={{
              fontSize: '13px', color: 'rgba(255, 255, 255, 0.45)',
              lineHeight: 1.5, marginBottom: '14px',
            }}>
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
              width: '100%', minHeight: 80, padding: '8px 10px',
              fontSize: '14px', lineHeight: 1.5, background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--pixel-border)', color: 'rgba(255, 255, 255, 0.9)',
              resize: 'vertical', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 16px 10px', borderTop: '1px solid var(--pixel-border)',
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={handleSkipAll}
              onMouseEnter={() => setHovered('skipAll')}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding: '4px 8px', fontSize: '12px', background: 'transparent',
                color: hovered === 'skipAll' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.3)',
                border: 'none', cursor: 'pointer', textDecoration: 'underline',
              }}
            >
              全部跳過，直接開始
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {!isFirst && (
              <button
                onClick={handlePrev}
                onMouseEnter={() => setHovered('prev')}
                onMouseLeave={() => setHovered(null)}
                style={{
                  padding: '6px 12px', fontSize: '14px',
                  background: hovered === 'prev' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.06)',
                  color: 'rgba(255, 255, 255, 0.6)', border: '1px solid var(--pixel-border)',
                  cursor: 'pointer',
                }}
              >
                ← 上一題
              </button>
            )}
            <button
              onClick={handleSkip}
              onMouseEnter={() => setHovered('skip')}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding: '6px 16px', fontSize: '14px',
                background: hovered === 'skip' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.06)',
                color: 'rgba(255, 255, 255, 0.6)', border: '1px solid var(--pixel-border)',
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
                padding: '6px 16px', fontSize: '14px',
                background: hovered === 'next' ? 'rgba(90, 140, 255, 0.9)' : 'rgba(90, 140, 255, 0.7)',
                color: '#fff', border: '1px solid rgba(90, 140, 255, 0.5)',
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
