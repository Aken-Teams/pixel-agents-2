import type { OfficeLayout, StaticSeat } from './types.js'

export interface SceneDefinition {
  id: string
  /** Display name */
  name: string
  /** Background image filename (served from /assets/) */
  backgroundImage: string
  /** Default zoom level when switching to this scene */
  defaultZoom: number
  /** The complete OfficeLayout to apply when this scene is selected */
  layout: OfficeLayout
}

/** Generate a static-background OfficeLayout with an all-FLOOR tile grid.
 *  Characters in static mode stay seated (no pathfinding), so a simple
 *  walkable grid is sufficient. */
function makeStaticLayout(
  cols: number,
  rows: number,
  backgroundImage: string,
  staticSeats: StaticSeat[],
): OfficeLayout {
  const tiles = new Array(cols * rows).fill(1) // FLOOR_1 everywhere
  return {
    version: 1,
    cols,
    rows,
    tiles,
    furniture: [],
    backgroundImage,
    staticSeats,
  }
}

// ── Level 4: Corporate Office ────────────────────────────────
// 640×800 px = 40 cols × 50 rows @ 16px/tile
// Seat positions from scripts/generate-layout.mjs

const level4Seats: StaticSeat[] = [
  { uid: 'seat-l1', seatCol: 17, seatRow: 9, facingDir: 2 },
  { uid: 'seat-l2', seatCol: 17, seatRow: 11, facingDir: 2 },
  { uid: 'seat-l3', seatCol: 17, seatRow: 13, facingDir: 2 },
  { uid: 'seat-r1', seatCol: 22, seatRow: 9, facingDir: 1 },
  { uid: 'seat-r2', seatCol: 22, seatRow: 11, facingDir: 1 },
  { uid: 'seat-r3', seatCol: 22, seatRow: 13, facingDir: 1 },
  { uid: 'seat-t1', seatCol: 19.5, seatRow: 6.8, facingDir: 0 },
  { uid: 'seat-d1', seatCol: 18.5, seatRow: 27, facingDir: 3 },
  { uid: 'seat-d2', seatCol: 6.5, seatRow: 27, facingDir: 3 },
  { uid: 'seat-d3', seatCol: 12.5, seatRow: 27, facingDir: 3 },
  { uid: 'seat-d4', seatCol: 6.5, seatRow: 33, facingDir: 3 },
  { uid: 'seat-d5', seatCol: 12.5, seatRow: 33, facingDir: 3 },
  { uid: 'seat-d6', seatCol: 18.5, seatRow: 33, facingDir: 3 },
  { uid: 'seat-m1', seatCol: 29, seatRow: 25, facingDir: 2 },
  { uid: 'seat-m2', seatCol: 29, seatRow: 29, facingDir: 2 },
  { uid: 'seat-m3', seatCol: 34, seatRow: 25, facingDir: 1 },
  { uid: 'seat-m4', seatCol: 34, seatRow: 29, facingDir: 1 },
  { uid: 'seat-b1', seatCol: 30.5, seatRow: 45, facingDir: 3 }, // 技術長
  { uid: 'seat-b2', seatCol: 4.5, seatRow: 41, facingDir: 3 },
  { uid: 'seat-b3', seatCol: 6.5, seatRow: 41, facingDir: 3 },
  { uid: 'seat-b4', seatCol: 10.5, seatRow: 40.5, facingDir: 0, defaultAction: 'reading' },  // 小幫手
]

// ── Level 5: Cyberpunk Office ────────────────────────────────
// 1376×768 px = 86 cols × 48 rows @ 16px/tile
// Positions are estimates — adjust as needed

const level5Seats: StaticSeat[] = [
  { uid: 'seat-l1', seatCol: 6.6, seatRow: 16.8, facingDir: 3 },
  { uid: 'seat-l2', seatCol: 12.8, seatRow: 16.8, facingDir: 3 },
  { uid: 'seat-l3', seatCol: 18.8, seatRow: 16.8, facingDir: 3 },
  { uid: 'seat-r1', seatCol: 6.6, seatRow: 24.8, facingDir: 3 },
  { uid: 'seat-r2', seatCol: 12.8, seatRow: 24.8, facingDir: 3 },
  { uid: 'seat-r3', seatCol: 18.8, seatRow: 24.8, facingDir: 3 },
  { uid: 'seat-t1', seatCol: 6.6, seatRow: 31, facingDir: 3 },
  { uid: 'seat-d1', seatCol: 12.8, seatRow: 31, facingDir: 3 },
  { uid: 'seat-d2', seatCol: 18.8, seatRow: 31, facingDir: 3 },
  { uid: 'seat-d3', seatCol: 15, seatRow: 10, facingDir: 3 },
  { uid: 'seat-d4', seatCol: 25, seatRow: 10, facingDir: 3 },
  { uid: 'seat-d5', seatCol: 29, seatRow: 10, facingDir: 3 },
  { uid: 'seat-d6', seatCol: 33, seatRow: 10, facingDir: 3 },
  { uid: 'seat-m1', seatCol: 11, seatRow: 26, facingDir: 3 },
  { uid: 'seat-m2', seatCol: 15, seatRow: 26, facingDir: 3 },
  { uid: 'seat-m3', seatCol: 60, seatRow: 14, facingDir: 1 },
  { uid: 'seat-m4', seatCol: 60, seatRow: 18, facingDir: 1 },
  { uid: 'seat-b1', seatCol: 47.5, seatRow: 35.5, facingDir: 0, defaultAction: 'reading'},  // CTO (技術長)
  { uid: 'seat-b2', seatCol: 63, seatRow: 36, facingDir: 2 },
  { uid: 'seat-b3', seatCol: 74, seatRow: 36, facingDir: 1 },
  { uid: 'seat-b4', seatCol: 31.2, seatRow: 43, facingDir: 3 },  // 小幫手
]

// ── Level 6: Cozy Office ─────────────────────────────────────
// 1280×712 px = 80 cols × 45 rows @ 16px/tile
// Positions are estimates — adjust as needed

const level6Seats: StaticSeat[] = [
  { uid: 'seat-d1', seatCol: 8, seatRow: 14, facingDir: 3 },
  { uid: 'seat-d2', seatCol: 16, seatRow: 14, facingDir: 3 },
  { uid: 'seat-d3', seatCol: 24, seatRow: 14, facingDir: 3 },
  { uid: 'seat-d4', seatCol: 8, seatRow: 24, facingDir: 3 },
  { uid: 'seat-d5', seatCol: 16, seatRow: 24, facingDir: 3 },
  { uid: 'seat-d6', seatCol: 24, seatRow: 24, facingDir: 3 },
  { uid: 'seat-l1', seatCol: 8, seatRow: 34, facingDir: 3 },
  { uid: 'seat-l2', seatCol: 16, seatRow: 34, facingDir: 3 },
  { uid: 'seat-l3', seatCol: 24, seatRow: 34, facingDir: 3 },
  { uid: 'seat-r1', seatCol: 50, seatRow: 10, facingDir: 2 },
  { uid: 'seat-r2', seatCol: 50, seatRow: 14, facingDir: 2 },
  { uid: 'seat-r3', seatCol: 66, seatRow: 10, facingDir: 1 },
  { uid: 'seat-m1', seatCol: 66, seatRow: 14, facingDir: 1 },
  { uid: 'seat-t1', seatCol: 56, seatRow: 6, facingDir: 0 },
  { uid: 'seat-m2', seatCol: 60, seatRow: 6, facingDir: 0 },
  { uid: 'seat-m3', seatCol: 56, seatRow: 18, facingDir: 3 },
  { uid: 'seat-m4', seatCol: 60, seatRow: 18, facingDir: 3 },
  { uid: 'seat-b2', seatCol: 38, seatRow: 34, facingDir: 0 },
  { uid: 'seat-b4', seatCol: 42, seatRow: 34, facingDir: 0 },  // 小幫手
  { uid: 'seat-b1', seatCol: 68, seatRow: 36, facingDir: 3 },  // CTO (技術長)
]

// ── Export all scenes ────────────────────────────────────────

export const SCENE_DEFINITIONS: SceneDefinition[] = [
  {
    id: 'level4',
    name: '企業辦公室',
    backgroundImage: 'office-level-4.png',
    defaultZoom: 1,
    layout: makeStaticLayout(40, 50, 'office-level-4.png', level4Seats),
  },
  {
    id: 'level5',
    name: '科技辦公室',
    backgroundImage: 'office-level5.jpg',
    defaultZoom: 1,
    layout: makeStaticLayout(86, 48, 'office-level5.jpg', level5Seats),
  },
  {
    id: 'level6',
    name: '復古辦公室',
    backgroundImage: 'office-level6.png',
    defaultZoom: 1,
    layout: makeStaticLayout(80, 45, 'office-level6.png', level6Seats),
  },
]
