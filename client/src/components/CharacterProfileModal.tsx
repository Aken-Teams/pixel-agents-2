import { useEffect, useRef, useState, useCallback } from 'react'
import type { TeamMemberInfo } from '../hooks/useServerMessages.js'
import { getCharacterSprites } from '../office/sprites/spriteData.js'
import { Direction } from '../office/types.js'
import type { SpriteData } from '../office/types.js'

interface CharacterProfileModalProps {
  member: TeamMemberInfo
  onClose: () => void
}

// ── Description parsing ──────────────────────────────────────────

function parseDescription(description: string): { roleTitle: string; skills: string[] } {
  const commaIdx = description.indexOf('，')
  if (commaIdx === -1) return { roleTitle: description, skills: [] }
  const roleTitle = description.slice(0, commaIdx)
  const rest = description.slice(commaIdx + 1)
  const skillsText = rest.replace(/^(負責|管理|專責|協助)\s*/, '')
  const skills = skillsText
    .split(/[、]/)
    .flatMap((s) => s.split(/\s*和\s*/))
    .map((s) => s.trim())
    .filter(Boolean)
  return { roleTitle, skills }
}

// ── Role labels ──────────────────────────────────────────────────

function getRoleLabel(role?: 'orchestrator' | 'worker'): string {
  return role === 'orchestrator' ? '指揮官' : '團隊成員'
}

function getRoleBadgeStyle(role?: 'orchestrator' | 'worker'): React.CSSProperties {
  if (role === 'orchestrator') {
    return {
      background: 'rgba(255, 180, 50, 0.15)',
      border: '1px solid rgba(255, 180, 50, 0.5)',
      color: 'rgba(255, 200, 80, 0.95)',
    }
  }
  return {
    background: 'rgba(90, 180, 255, 0.12)',
    border: '1px solid rgba(90, 180, 255, 0.4)',
    color: 'rgba(120, 200, 255, 0.9)',
  }
}

// ── Accent color ──────────────────────────────────────────────────

function hueToAccent(hueShift?: number): string {
  return `hsl(${hueShift ?? 200}, 70%, 60%)`
}

// ── Animation config ──────────────────────────────────────────────

type Pose = 'typing' | 'walking' | 'reading'
const POSES: Pose[] = ['typing', 'walking', 'reading']
const POSE_LABELS: Record<Pose, string> = { typing: '打字中', walking: '走路', reading: '閱讀中' }
const FRAME_MS: Record<Pose, number> = { typing: 320, walking: 150, reading: 420 }

function getPoseFrames(sprites: ReturnType<typeof getCharacterSprites>, pose: Pose): SpriteData[] {
  const s = sprites
  switch (pose) {
    case 'typing':  return [s.typing[Direction.DOWN][0], s.typing[Direction.DOWN][1]]
    case 'walking': return [
      s.walk[Direction.DOWN][0], s.walk[Direction.DOWN][1],
      s.walk[Direction.DOWN][2], s.walk[Direction.DOWN][3],
    ]
    case 'reading': return [s.reading[Direction.DOWN][0], s.reading[Direction.DOWN][1]]
  }
}

// ── Animated pixel canvas ─────────────────────────────────────────

const SPRITE_SCALE = 3

function PixelCharacterCanvas({
  palette, hueShift, onPoseChange,
}: {
  palette?: number
  hueShift?: number
  onPoseChange?: (label: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [poseIdx, setPoseIdx] = useState(0)
  const [frame, setFrame] = useState(0)

  const pose = POSES[poseIdx]

  // Cycle pose on click
  const handleClick = useCallback(() => {
    setPoseIdx((i) => {
      const next = (i + 1) % POSES.length
      setFrame(0)
      onPoseChange?.(POSE_LABELS[POSES[next]])
      return next
    })
  }, [onPoseChange])

  // Animation ticker
  useEffect(() => {
    const id = setInterval(() => {
      setFrame((f) => f + 1)
    }, FRAME_MS[pose])
    return () => clearInterval(id)
  }, [pose])

  // Render to canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const sprites = getCharacterSprites(palette ?? 0, hueShift ?? 0)
    const frames = getPoseFrames(sprites, pose)
    const sprite = frames[frame % frames.length]
    const rows = sprite.length
    const cols = sprite[0]?.length ?? 0

    canvas.width = cols * SPRITE_SCALE
    canvas.height = rows * SPRITE_SCALE

    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const color = sprite[r][c]
        if (!color) continue
        ctx.fillStyle = color
        ctx.fillRect(c * SPRITE_SCALE, r * SPRITE_SCALE, SPRITE_SCALE, SPRITE_SCALE)
      }
    }
  }, [palette, hueShift, pose, frame])

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{ imageRendering: 'pixelated', display: 'block', cursor: 'pointer' }}
      title="點擊切換動作"
    />
  )
}

// ── Section label ─────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '10px', fontWeight: 600, letterSpacing: '1.2px',
      color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase',
    }}>
      {children}
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────

export function CharacterProfileModal({ member, onClose }: CharacterProfileModalProps) {
  const { roleTitle, skills } = parseDescription(member.description ?? '')
  const accent = hueToAccent(member.hueShift)
  const [poseLabel, setPoseLabel] = useState(POSE_LABELS['typing'])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 69 }} />

      {/* Card */}
      <div className="modal-responsive" style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)', zIndex: 70,
        background: 'var(--pixel-bg)',
        border: '2px solid var(--pixel-border)',
        boxShadow: 'var(--pixel-shadow)',
        width: 360,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Top accent bar */}
        <div style={{ height: 3, background: accent, flexShrink: 0 }} />

        {/* ── Header: avatar + identity ── */}
        <div style={{
          display: 'flex', alignItems: 'stretch',
          borderBottom: '1px solid var(--pixel-border)',
          position: 'relative',
        }}>
          {/* Avatar panel */}
          <div style={{
            padding: '20px 18px',
            background: `linear-gradient(160deg, ${accent}18 0%, transparent 100%)`,
            borderRight: `1px solid ${accent}30`,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 6, flexShrink: 0,
          }}>
            <div style={{
              padding: '8px 10px 6px',
              background: 'rgba(0,0,0,0.3)',
              border: `1px solid ${accent}40`,
            }}>
              <PixelCharacterCanvas
                palette={member.palette}
                hueShift={member.hueShift}
                onPoseChange={setPoseLabel}
              />
            </div>
            {/* Pose label */}
            <div style={{
              fontSize: '10px', color: 'rgba(255, 255, 255, 0.65)',
              letterSpacing: '0.5px', textAlign: 'center',
              userSelect: 'none',
            }}>
              {poseLabel} ↻
            </div>
          </div>

          {/* Identity */}
          <div style={{
            flex: 1, padding: '16px 40px 16px 16px',
            minWidth: 0, display: 'flex', flexDirection: 'column',
            justifyContent: 'center', gap: 7,
          }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              人物介紹
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: 'rgba(255,255,255,0.95)', lineHeight: 1.1 }}>
              {member.name}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              <span style={{ fontSize: '11px', padding: '2px 8px', fontWeight: 600, letterSpacing: '0.3px', ...getRoleBadgeStyle(member.role) }}>
                {getRoleLabel(member.role)}
              </span>
              <span style={{
                fontSize: '11px', padding: '2px 7px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.38)', fontFamily: 'monospace',
              }}>
                {member.skillId}
              </span>
            </div>
          </div>

          {/* Close */}
          <button onClick={onClose} style={{
            position: 'absolute', top: 8, right: 10,
            background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
            fontSize: '15px', padding: '2px 4px', lineHeight: 1,
          }}>
            ✕
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '14px 16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* 腳色 */}
          {roleTitle && (
            <div>
              <SectionLabel>腳色</SectionLabel>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(255,255,255,0.88)', marginTop: 4 }}>
                {roleTitle}
              </div>
            </div>
          )}

          {/* 定位 */}
          {member.bio && (
            <div>
              <SectionLabel>定位</SectionLabel>
              <div style={{
                fontSize: '13px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", "Microsoft JhengHei", sans-serif',
                color: 'rgba(255,255,255,0.62)', lineHeight: 1.7, marginTop: 4,
              }}>
                {member.bio}
              </div>
            </div>
          )}

          {/* 技能 */}
          {skills.length > 0 && (
            <div>
              <SectionLabel>技能</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
                {skills.map((skill) => (
                  <span key={skill} style={{
                    fontSize: '13px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", "Microsoft JhengHei", sans-serif',
                    padding: '3px 10px',
                    background: `${accent}18`,
                    border: `1px solid ${accent}45`,
                    color: 'rgba(255,255,255,0.82)',
                    lineHeight: 1.5,
                  }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Fallback */}
          {!roleTitle && !member.bio && member.description && (
            <div>
              <SectionLabel>介紹</SectionLabel>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.65, marginTop: 4 }}>
                {member.description}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
