import { useState, useEffect, useRef } from 'react'
import {
  ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_LEVEL_FADE_DELAY_MS,
  ZOOM_LEVEL_HIDE_DELAY_MS,
  ZOOM_LEVEL_FADE_DURATION_SEC,
} from '../constants.js'

interface ZoomControlsProps {
  zoom: number
  onZoomChange: (zoom: number) => void
  isPanMode: boolean
  onTogglePanMode: () => void
  onResetView: () => void
}

const btnBase: React.CSSProperties = {
  width: 40,
  height: 40,
  padding: 0,
  background: 'var(--pixel-bg)',
  color: 'var(--pixel-text)',
  border: '2px solid var(--pixel-border)',
  borderRadius: 0,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: 'var(--pixel-shadow)',
}

export function ZoomControls({ zoom, onZoomChange, isPanMode, onTogglePanMode, onResetView }: ZoomControlsProps) {
  const [hovered, setHovered] = useState<'minus' | 'plus' | 'pan' | 'reset' | null>(null)
  const [showLevel, setShowLevel] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevZoomRef = useRef(zoom)

  const minDisabled = zoom <= ZOOM_MIN
  const maxDisabled = zoom >= ZOOM_MAX

  // Show zoom level briefly when zoom changes
  useEffect(() => {
    if (zoom === prevZoomRef.current) return
    prevZoomRef.current = zoom

    if (timerRef.current) clearTimeout(timerRef.current)
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)

    setShowLevel(true)
    setFadeOut(false)

    fadeTimerRef.current = setTimeout(() => {
      setFadeOut(true)
    }, ZOOM_LEVEL_FADE_DELAY_MS)

    timerRef.current = setTimeout(() => {
      setShowLevel(false)
      setFadeOut(false)
    }, ZOOM_LEVEL_HIDE_DELAY_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    }
  }, [zoom])

  return (
    <>
      {/* Zoom level indicator at top-center */}
      {showLevel && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 'var(--pixel-controls-z)',
            background: 'var(--pixel-bg)',
            border: '2px solid var(--pixel-border)',
            borderRadius: 0,
            padding: '4px 12px',
            boxShadow: 'var(--pixel-shadow)',
            fontSize: '26px',
            color: 'var(--pixel-text)',
            userSelect: 'none',
            opacity: fadeOut ? 0 : 1,
            transition: `opacity ${ZOOM_LEVEL_FADE_DURATION_SEC}s ease-out`,
            pointerEvents: 'none',
          }}
        >
          {zoom}x
        </div>
      )}

      {/* Vertically stacked buttons — top-left */}
      <div
        className="zoom-controls"
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 'var(--pixel-controls-z)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {/* Zoom in */}
        <button
          onClick={() => onZoomChange(zoom + 0.5)}
          disabled={maxDisabled}
          onMouseEnter={() => setHovered('plus')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...btnBase,
            background: hovered === 'plus' && !maxDisabled ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
            cursor: maxDisabled ? 'default' : 'pointer',
            opacity: maxDisabled ? 'var(--pixel-btn-disabled-opacity)' : 1,
          }}
          title="放大 (Ctrl+滾輪)"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="9" y1="3" x2="9" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="3" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* Zoom out */}
        <button
          onClick={() => onZoomChange(zoom - 0.5)}
          disabled={minDisabled}
          onMouseEnter={() => setHovered('minus')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...btnBase,
            background: hovered === 'minus' && !minDisabled ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
            cursor: minDisabled ? 'default' : 'pointer',
            opacity: minDisabled ? 'var(--pixel-btn-disabled-opacity)' : 1,
          }}
          title="縮小 (Ctrl+滾輪)"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="3" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--pixel-border)', margin: '2px 4px' }} />

        {/* Pan / hand tool */}
        <button
          onClick={onTogglePanMode}
          onMouseEnter={() => setHovered('pan')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...btnBase,
            background: isPanMode
              ? 'var(--pixel-accent-dim, rgba(0,180,255,0.18))'
              : hovered === 'pan' ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
            color: isPanMode ? 'var(--pixel-accent, #00c8ff)' : 'var(--pixel-text)',
            borderColor: isPanMode ? 'var(--pixel-accent, #00c8ff)' : 'var(--pixel-border)',
          }}
          title={isPanMode ? '退出平移模式（點擊停用）' : '平移視圖 — 拖曳移動'}
        >
          {/* Four-directional move icon */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="9" y1="2" x2="9" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="2" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M7 4 L9 2 L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" fill="none" />
            <path d="M7 14 L9 16 L11 14" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" fill="none" />
            <path d="M4 7 L2 9 L4 11" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" fill="none" />
            <path d="M14 7 L16 9 L14 11" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" fill="none" />
          </svg>
        </button>

        {/* Reset view — home */}
        <button
          onClick={onResetView}
          onMouseEnter={() => setHovered('reset')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...btnBase,
            background: hovered === 'reset' ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
          }}
          title="重設視圖至預設位置"
        >
          {/* House icon */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 10 L9 3 L16 10" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
            <path d="M4 8.5 L4 15 L14 15 L14 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
            <rect x="6.5" y="11" width="5" height="4" rx="0" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>
    </>
  )
}
