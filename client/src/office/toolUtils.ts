/** Map status prefixes back to tool names for animation selection */
export const STATUS_TO_TOOL: Record<string, string> = {
  'Reading': 'Read',
  'Searching': 'Grep',
  'Globbing': 'Glob',
  'Fetching': 'WebFetch',
  'Searching web': 'WebSearch',
  'Writing': 'Write',
  'Editing': 'Edit',
  'Running': 'Bash',
  'Task': 'Task',
}

export function extractToolName(status: string): string | null {
  for (const [prefix, tool] of Object.entries(STATUS_TO_TOOL)) {
    if (status.startsWith(prefix)) return tool
  }
  const first = status.split(/[\s:]/)[0]
  return first || null
}

import { ZOOM_DEFAULT_DPR_FACTOR, ZOOM_MIN, TILE_SIZE } from '../constants.js'

/** Compute a default integer zoom level (device pixels per sprite pixel) */
export function defaultZoom(): number {
  const dpr = window.devicePixelRatio || 1
  return Math.max(ZOOM_MIN, Math.round(ZOOM_DEFAULT_DPR_FACTOR * dpr))
}

/** Compute a zoom level that fits the map width, minimum zoom 2 */
export function computeFitZoom(cols: number, rows: number): number {
  const dpr = window.devicePixelRatio || 1
  const viewportW = window.innerWidth * dpr
  const mapW = cols * TILE_SIZE
  // Fit the map width (allow vertical panning for tall maps)
  const fitZoom = Math.floor(viewportW * 0.85 / mapW)
  // Minimum zoom 2 so characters are visible
  return Math.max(2, Math.min(fitZoom, Math.round(ZOOM_DEFAULT_DPR_FACTOR * dpr)))
}
