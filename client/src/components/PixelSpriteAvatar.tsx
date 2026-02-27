import { useRef, useEffect, useState, useCallback } from 'react'
import { getCharacterSprites, getCachedSprite } from '../office/sprites/index.js'
import { Direction } from '../office/types.js'
import type { SpriteData } from '../office/types.js'

type Action = 'walk' | 'type' | 'read'
const ACTIONS: Action[] = ['walk', 'type', 'read']
const DIRECTIONS = [Direction.DOWN, Direction.RIGHT, Direction.UP, Direction.LEFT]

// Walk frame order: 0→1→2→1 (swing pattern)
const WALK_FRAME_SEQ = [0, 1, 2, 1]

interface PixelSpriteAvatarProps {
  palette: number
  hueShift?: number
  zoom?: number
  animated?: boolean
  interactive?: boolean
  style?: React.CSSProperties
}

export function PixelSpriteAvatar({
  palette, hueShift = 0, zoom = 2, animated = false, interactive = false, style,
}: PixelSpriteAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [action, setAction] = useState<Action>('walk')
  const [dirIndex, setDirIndex] = useState(0)

  const handleClick = useCallback(() => {
    if (!interactive) return
    // Cycle: walk-down → walk-right → walk-up → walk-left → type-down → read-down → walk-down
    if (action === 'walk') {
      const nextDir = (dirIndex + 1) % DIRECTIONS.length
      if (nextDir === 0) {
        // Finished all walk directions → go to type
        setAction('type')
        setDirIndex(0)
      } else {
        setDirIndex(nextDir)
      }
    } else {
      const nextAction = ACTIONS[(ACTIONS.indexOf(action) + 1) % ACTIONS.length]
      setAction(nextAction)
      setDirIndex(0)
    }
  }, [interactive, action, dirIndex])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const sprites = getCharacterSprites(palette, hueShift)
    const dir = DIRECTIONS[dirIndex]

    function getFrame(frameIdx: number): SpriteData {
      if (action === 'walk') {
        const seq = WALK_FRAME_SEQ[frameIdx % WALK_FRAME_SEQ.length]
        return sprites.walk[dir][seq]
      } else if (action === 'type') {
        return sprites.typing[dir][frameIdx % 2]
      } else {
        return sprites.reading[dir][frameIdx % 2]
      }
    }

    // Draw first frame to set canvas size
    const first = getCachedSprite(getFrame(0), zoom)
    canvas.width = first.width
    canvas.height = first.height

    if (!animated) {
      // Static: draw single frame
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(first, 0, 0)
      return
    }

    // Animated: cycle frames
    const intervalMs = action === 'walk' ? 150 : 300
    let frame = 0
    let lastTime = 0
    let rafId: number

    function tick(time: number) {
      if (!lastTime) lastTime = time
      if (time - lastTime >= intervalMs) {
        const totalFrames = action === 'walk' ? WALK_FRAME_SEQ.length : 2
        frame = (frame + 1) % totalFrames
        lastTime = time

        const spriteData = getFrame(frame)
        const cached = getCachedSprite(spriteData, zoom)
        ctx!.clearRect(0, 0, canvas.width, canvas.height)
        ctx!.imageSmoothingEnabled = false
        ctx!.drawImage(cached, 0, 0)
      }
      rafId = requestAnimationFrame(tick)
    }

    // Draw initial frame
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(first, 0, 0)

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [palette, hueShift, zoom, animated, action, dirIndex])

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{
        imageRendering: 'pixelated',
        cursor: interactive ? 'pointer' : undefined,
        ...style,
      }}
    />
  )
}
