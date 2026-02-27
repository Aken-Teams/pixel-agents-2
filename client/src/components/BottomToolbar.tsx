import { useState } from 'react'
import { SettingsModal } from './SettingsModal.js'
import { ProjectPortfolioModal } from './ProjectPortfolioModal.js'

interface TeamMemberInfo {
  skillId: string
  name: string
  agentId: number
  palette?: number
  hueShift?: number
  role?: 'orchestrator' | 'worker'
}

interface BottomToolbarProps {
  isEditMode: boolean
  onToggleEditMode: () => void
  isStaticBackground?: boolean
  isDebugMode: boolean
  onToggleDebugMode: () => void
  teamMembers: TeamMemberInfo[]
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 10,
  left: 10,
  zIndex: 'var(--pixel-controls-z)',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  background: 'var(--pixel-bg)',
  border: '2px solid var(--pixel-border)',
  borderRadius: 0,
  padding: '4px 6px',
  boxShadow: 'var(--pixel-shadow)',
}

const btnBase: React.CSSProperties = {
  padding: '5px 10px',
  fontSize: '24px',
  color: 'var(--pixel-text)',
  background: 'var(--pixel-btn-bg)',
  border: '2px solid transparent',
  borderRadius: 0,
  cursor: 'pointer',
}

const btnActive: React.CSSProperties = {
  ...btnBase,
  background: 'var(--pixel-active-bg)',
  border: '2px solid var(--pixel-accent)',
}


export function BottomToolbar({
  isEditMode,
  onToggleEditMode,
  isStaticBackground,
  isDebugMode,
  onToggleDebugMode,
  teamMembers,
}: BottomToolbarProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isPortfolioOpen, setIsPortfolioOpen] = useState(false)

  return (
    <div style={panelStyle}>
      {!isStaticBackground && (
        <button
          onClick={onToggleEditMode}
          onMouseEnter={() => setHovered('edit')}
          onMouseLeave={() => setHovered(null)}
          style={
            isEditMode
              ? { ...btnActive }
              : {
                  ...btnBase,
                  background: hovered === 'edit' ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
                }
          }
          title="Edit office layout"
        >
          Layout
        </button>
      )}
      <button
        onClick={() => setIsPortfolioOpen(true)}
        onMouseEnter={() => setHovered('portfolio')}
        onMouseLeave={() => setHovered(null)}
        style={
          isPortfolioOpen
            ? { ...btnActive }
            : {
                ...btnBase,
                background: hovered === 'portfolio' ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
              }
        }
        title="View project portfolio"
      >
        Portfolio
      </button>
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setIsSettingsOpen((v) => !v)}
          onMouseEnter={() => setHovered('settings')}
          onMouseLeave={() => setHovered(null)}
          style={
            isSettingsOpen
              ? { ...btnActive }
              : {
                  ...btnBase,
                  background: hovered === 'settings' ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
                }
          }
          title="Settings"
        >
          Settings
        </button>
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          isDebugMode={isDebugMode}
          onToggleDebugMode={onToggleDebugMode}
        />
      </div>
      {isPortfolioOpen && (
        <ProjectPortfolioModal
          onClose={() => setIsPortfolioOpen(false)}
          teamMembers={teamMembers}
        />
      )}
    </div>
  )
}
