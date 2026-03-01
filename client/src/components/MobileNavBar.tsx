interface MobileNavBarProps {
  activeView: 'canvas' | 'chat'
  onViewChange: (view: 'canvas' | 'chat') => void
  agentCount: number
  hasUnread?: boolean
}

const tabStyle: React.CSSProperties = {
  flex: 1,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  border: 'none',
  cursor: 'pointer',
  fontFamily: "'FS Pixel Sans', sans-serif",
  fontSize: '14px',
  minHeight: 44,
}

export function MobileNavBar({
  activeView, onViewChange, agentCount, hasUnread,
}: MobileNavBarProps) {
  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 56,
      zIndex: 55,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--pixel-bg)',
      borderTop: '2px solid var(--pixel-border)',
      boxShadow: '0 -2px 8px rgba(0,0,0,0.3)',
    }}>
      {/* Office tab */}
      <button
        onClick={() => onViewChange('canvas')}
        style={{
          ...tabStyle,
          background: activeView === 'canvas' ? 'var(--pixel-active-bg)' : 'transparent',
          color: activeView === 'canvas' ? 'var(--pixel-accent)' : 'var(--pixel-text-dim)',
          borderRight: '1px solid var(--pixel-border)',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M3 21V9l9-6 9 6v12" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <rect x="9" y="13" width="6" height="8" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <span>Office</span>
      </button>

      {/* Chat tab */}
      <button
        onClick={() => onViewChange('chat')}
        style={{
          ...tabStyle,
          background: activeView === 'chat' ? 'var(--pixel-active-bg)' : 'transparent',
          color: activeView === 'chat' ? 'var(--pixel-accent)' : 'var(--pixel-text-dim)',
          position: 'relative',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M4 4h16a1 1 0 011 1v11a1 1 0 01-1 1H7l-3 3V5a1 1 0 011-1z"
            stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
        <span>Chat{agentCount > 0 ? ` (${agentCount})` : ''}</span>
        {hasUnread && (
          <div style={{
            position: 'absolute',
            top: 6,
            right: '28%',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--pixel-accent)',
            border: '2px solid var(--pixel-bg)',
          }} />
        )}
      </button>
    </div>
  )
}
