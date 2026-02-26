let backgroundImg: HTMLImageElement | null = null
let backgroundLoaded = false
let backgroundSrc = ''
const scaledCache = new Map<number, HTMLCanvasElement>()

export function loadBackgroundImage(src: string): void {
  if (src === backgroundSrc && backgroundImg) return
  backgroundSrc = src
  backgroundLoaded = false
  scaledCache.clear()
  const img = new Image()
  img.onload = () => {
    backgroundImg = img
    backgroundLoaded = true
    scaledCache.clear()
  }
  img.src = src
}

export function isBackgroundReady(): boolean {
  return backgroundLoaded
}

export function getScaledBackground(zoom: number): HTMLCanvasElement | null {
  if (!backgroundImg || !backgroundLoaded) return null

  const cached = scaledCache.get(zoom)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(backgroundImg.width * zoom)
  canvas.height = Math.round(backgroundImg.height * zoom)
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height)

  scaledCache.set(zoom, canvas)
  return canvas
}
