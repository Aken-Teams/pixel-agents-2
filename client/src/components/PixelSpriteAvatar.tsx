import { useRef, useEffect } from 'react'
import { getCharacterSprites, getCachedSprite } from '../office/sprites/index.js'
import { Direction } from '../office/types.js'

interface PixelSpriteAvatarProps {
  palette: number
  hueShift?: number
  zoom?: number
  style?: React.CSSProperties
}

export function PixelSpriteAvatar({ palette, hueShift = 0, zoom = 2, style }: PixelSpriteAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const sprites = getCharacterSprites(palette, hueShift)
    const spriteData = sprites.walk[Direction.DOWN][0]
    const cached = getCachedSprite(spriteData, zoom)

    canvas.width = cached.width
    canvas.height = cached.height
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(cached, 0, 0)
  }, [palette, hueShift, zoom])

  return (
    <canvas
      ref={canvasRef}
      style={{
        imageRendering: 'pixelated',
        ...style,
      }}
    />
  )
}
