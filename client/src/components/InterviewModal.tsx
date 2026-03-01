import { useState } from 'react'
import { wsClient } from '../wsClient.js'

export interface InterviewQuestion {
  id: string
  question: string
  options?: string[]
  multiSelect?: boolean
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

/** Multi-select separator used in answer strings */
const MULTI_SEP = '、'

type Phase = 'questions' | 'confirm'

export function InterviewModal({ questions, onClose }: InterviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentAnswer, setCurrentAnswer] = useState('')
  // For multi-select: set of selected option strings
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set())
  const [isOtherMode, setIsOtherMode] = useState(false)
  const [otherText, setOtherText] = useState('')
  const [hovered, setHovered] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('questions')

  const current = questions[currentIndex]
  const isFirst = currentIndex === 0
  const isLast = currentIndex === questions.length - 1
  const hasOptions = current?.options && current.options.length > 0
  const isMulti = current?.multiSelect === true

  /** Build the answer string for multi-select from current state */
  const buildMultiAnswer = (selected: Set<string>, other: string, otherActive: boolean): string => {
    const parts = [...selected]
    if (otherActive && other.trim()) {
      parts.push(other.trim())
    }
    return parts.join(MULTI_SEP)
  }

  /** Parse a saved multi-select answer back into a set + other text */
  const parseMultiAnswer = (answer: string, options: string[]): { selected: Set<string>; other: string; otherActive: boolean } => {
    if (!answer) return { selected: new Set(), other: '', otherActive: false }
    const parts = answer.split(MULTI_SEP).map(s => s.trim()).filter(Boolean)
    const selected = new Set<string>()
    const otherParts: string[] = []
    for (const p of parts) {
      if (options.includes(p)) {
        selected.add(p)
      } else {
        otherParts.push(p)
      }
    }
    return {
      selected,
      other: otherParts.join(MULTI_SEP),
      otherActive: otherParts.length > 0,
    }
  }

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

  /** Save current answer and return updated answers */
  const saveCurrent = () => {
    const newAnswers = { ...answers }
    if (isMulti && hasOptions) {
      const answer = buildMultiAnswer(multiSelected, otherText, isOtherMode)
      if (answer) {
        newAnswers[current.id] = answer
      } else {
        delete newAnswers[current.id]
      }
    } else {
      const trimmed = currentAnswer.trim()
      if (trimmed) {
        newAnswers[current.id] = trimmed
      } else {
        delete newAnswers[current.id]
      }
    }
    setAnswers(newAnswers)
    return newAnswers
  }

  const goToQuestion = (idx: number, savedAnswers: Record<string, string>) => {
    const nextQ = questions[idx]
    const nextAnswer = savedAnswers[nextQ?.id] || ''
    setCurrentIndex(idx)

    if (nextQ?.multiSelect && nextQ.options && nextQ.options.length > 0) {
      // Restore multi-select state
      const { selected, other, otherActive } = parseMultiAnswer(nextAnswer, nextQ.options)
      setMultiSelected(selected)
      setOtherText(other)
      setIsOtherMode(otherActive)
      setCurrentAnswer('')
    } else if (nextQ?.options && nextQ.options.length > 0) {
      // Single-select with options
      setCurrentAnswer(nextAnswer)
      setMultiSelected(new Set())
      setOtherText('')
      setIsOtherMode(nextAnswer !== '' && !nextQ.options.includes(nextAnswer))
    } else {
      // Free text
      setCurrentAnswer(nextAnswer)
      setMultiSelected(new Set())
      setOtherText('')
      setIsOtherMode(false)
    }
  }

  const handleNext = () => {
    const saved = saveCurrent()
    if (isLast) {
      setPhase('confirm')
    } else {
      goToQuestion(currentIndex + 1, saved)
    }
  }

  const handleSkip = () => {
    const newAnswers = { ...answers }
    delete newAnswers[current.id]
    setAnswers(newAnswers)

    if (isLast) {
      setPhase('confirm')
    } else {
      goToQuestion(currentIndex + 1, newAnswers)
    }
  }

  const handlePrev = () => {
    const saved = saveCurrent()
    goToQuestion(currentIndex - 1, saved)
  }

  const handleSkipAll = () => {
    submitAnswers(answers)
  }

  const handleEditQuestion = (idx: number) => {
    const q = questions[idx]
    const ans = answers[q?.id] || ''
    setCurrentIndex(idx)

    if (q?.multiSelect && q.options && q.options.length > 0) {
      const { selected, other, otherActive } = parseMultiAnswer(ans, q.options)
      setMultiSelected(selected)
      setOtherText(other)
      setIsOtherMode(otherActive)
      setCurrentAnswer('')
    } else if (q?.options && q.options.length > 0) {
      setCurrentAnswer(ans)
      setMultiSelected(new Set())
      setOtherText('')
      setIsOtherMode(ans !== '' && !q.options.includes(ans))
    } else {
      setCurrentAnswer(ans)
      setMultiSelected(new Set())
      setOtherText('')
      setIsOtherMode(false)
    }
    setPhase('questions')
  }

  // ── Single-select handlers ──

  const handleSelectOption = (option: string) => {
    setCurrentAnswer(option)
    setIsOtherMode(false)
  }

  const handleSelectOther = () => {
    setIsOtherMode(true)
    if (current.options?.includes(currentAnswer)) {
      setCurrentAnswer('')
    }
  }

  // ── Multi-select handlers ──

  const handleToggleMultiOption = (option: string) => {
    setMultiSelected(prev => {
      const next = new Set(prev)
      if (next.has(option)) {
        next.delete(option)
      } else {
        next.add(option)
      }
      return next
    })
  }

  const handleToggleMultiOther = () => {
    setIsOtherMode(prev => !prev)
    if (isOtherMode) {
      setOtherText('')
    }
  }

  const answeredCount = Object.keys(answers).filter((k) => answers[k]).length

  // Check if current question has an answer
  const hasCurrentAnswer = (() => {
    if (isMulti && hasOptions) {
      return multiSelected.size > 0 || (isOtherMode && otherText.trim() !== '')
    }
    return currentAnswer.trim() !== ''
  })()

  // ─── Confirmation Screen ───
  if (phase === 'confirm') {
    return (
      <>
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0, 0, 0, 0.6)', zIndex: 69,
        }} />
        <div
          className="interview-modal modal-responsive"
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

  /** Render option buttons — shared between single and multi select */
  const renderOptionButtons = () => {
    if (!hasOptions) return null

    if (isMulti) {
      // ── Multi-select: toggle each option independently ──
      return (
        <>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.35)', marginBottom: 8 }}>
            可多選
          </div>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 8,
            marginBottom: isOtherMode ? 10 : 0,
          }}>
            {current.options!.map((opt) => {
              const selected = multiSelected.has(opt)
              const isHovered = hovered === `opt-${opt}`
              return (
                <button
                  key={opt}
                  onClick={() => handleToggleMultiOption(opt)}
                  onMouseEnter={() => setHovered(`opt-${opt}`)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    lineHeight: 1.4,
                    background: selected
                      ? 'rgba(90, 140, 255, 0.25)'
                      : isHovered ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                    color: selected ? 'rgba(160, 190, 255, 1)' : 'rgba(255, 255, 255, 0.8)',
                    border: selected
                      ? '1.5px solid rgba(90, 140, 255, 0.7)'
                      : '1px solid var(--pixel-border)',
                    cursor: 'pointer',
                    transition: 'background 0.1s, border-color 0.1s',
                  }}
                >
                  {selected && (
                    <span style={{ marginRight: 6, fontSize: '12px' }}>&#10003;</span>
                  )}
                  {opt}
                </button>
              )
            })}
            {/* "其他" toggle */}
            <button
              onClick={handleToggleMultiOther}
              onMouseEnter={() => setHovered('opt-other')}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                lineHeight: 1.4,
                background: isOtherMode
                  ? 'rgba(90, 140, 255, 0.25)'
                  : hovered === 'opt-other' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                color: isOtherMode ? 'rgba(160, 190, 255, 1)' : 'rgba(255, 255, 255, 0.5)',
                border: isOtherMode
                  ? '1.5px solid rgba(90, 140, 255, 0.7)'
                  : '1px solid var(--pixel-border)',
                cursor: 'pointer',
                fontStyle: 'italic',
                transition: 'background 0.1s, border-color 0.1s',
              }}
            >
              {isOtherMode && (
                <span style={{ marginRight: 6, fontSize: '12px' }}>&#10003;</span>
              )}
              其他...
            </button>
          </div>
          {isOtherMode && (
            <textarea
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="請輸入其他選項..."
              autoFocus
              style={{
                width: '100%', minHeight: 60, padding: '8px 10px',
                fontSize: '14px', lineHeight: 1.5, background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--pixel-border)', color: 'rgba(255, 255, 255, 0.9)',
                resize: 'vertical', outline: 'none', boxSizing: 'border-box',
              }}
            />
          )}
        </>
      )
    }

    // ── Single-select ──
    return (
      <>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: isOtherMode ? 10 : 0,
        }}>
          {current.options!.map((opt) => {
            const selected = !isOtherMode && currentAnswer === opt
            const isHovered = hovered === `opt-${opt}`
            return (
              <button
                key={opt}
                onClick={() => handleSelectOption(opt)}
                onMouseEnter={() => setHovered(`opt-${opt}`)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  lineHeight: 1.4,
                  background: selected
                    ? 'rgba(90, 140, 255, 0.25)'
                    : isHovered ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                  color: selected ? 'rgba(160, 190, 255, 1)' : 'rgba(255, 255, 255, 0.8)',
                  border: selected
                    ? '1.5px solid rgba(90, 140, 255, 0.7)'
                    : '1px solid var(--pixel-border)',
                  cursor: 'pointer',
                  transition: 'background 0.1s, border-color 0.1s',
                }}
              >
                {selected && (
                  <span style={{ marginRight: 6, fontSize: '12px' }}>&#10003;</span>
                )}
                {opt}
              </button>
            )
          })}
          {/* "其他" button */}
          <button
            onClick={handleSelectOther}
            onMouseEnter={() => setHovered('opt-other')}
            onMouseLeave={() => setHovered(null)}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              lineHeight: 1.4,
              background: isOtherMode
                ? 'rgba(90, 140, 255, 0.25)'
                : hovered === 'opt-other' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.04)',
              color: isOtherMode ? 'rgba(160, 190, 255, 1)' : 'rgba(255, 255, 255, 0.5)',
              border: isOtherMode
                ? '1.5px solid rgba(90, 140, 255, 0.7)'
                : '1px solid var(--pixel-border)',
              cursor: 'pointer',
              fontStyle: 'italic',
              transition: 'background 0.1s, border-color 0.1s',
            }}
          >
            {isOtherMode && (
              <span style={{ marginRight: 6, fontSize: '12px' }}>&#10003;</span>
            )}
            其他...
          </button>
        </div>
        {isOtherMode && (
          <textarea
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder="請輸入您的選擇..."
            autoFocus
            style={{
              width: '100%', minHeight: 60, padding: '8px 10px',
              fontSize: '14px', lineHeight: 1.5, background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--pixel-border)', color: 'rgba(255, 255, 255, 0.9)',
              resize: 'vertical', outline: 'none', boxSizing: 'border-box',
            }}
          />
        )}
      </>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: 'rgba(0, 0, 0, 0.6)', zIndex: 69,
      }} />
      {/* Modal */}
      <div
        className="interview-modal modal-responsive"
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

        {/* Input area */}
        <div style={{ padding: '0 16px 14px' }}>
          {hasOptions ? renderOptionButtons() : (
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
          )}
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
                cursor: hasCurrentAnswer ? 'pointer' : 'default',
                opacity: hasCurrentAnswer ? 1 : 0.5,
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
