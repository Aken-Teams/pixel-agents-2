import type { OfficeLayout, StaticSeat, WalkRoute } from './types.js'

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
  /** Walking routes for idle characters */
  routes?: WalkRoute[]
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
  { uid: 'seat-l1', seatCol: 19.5, seatRow: 6.8, facingDir: 0 }, 
  { uid: 'seat-l2', seatCol: 17, seatRow: 9, facingDir: 2 }, 
  { uid: 'seat-l3', seatCol: 17, seatRow: 11, facingDir: 2 }, 
  { uid: 'seat-r1', seatCol: 17, seatRow: 13, facingDir: 2 }, 
  { uid: 'seat-r2', seatCol: 22, seatRow: 9, facingDir: 1 }, 
  { uid: 'seat-r3', seatCol: 22, seatRow: 11, facingDir: 1 }, 
  { uid: 'seat-t1', seatCol: 18.5, seatRow: 27, facingDir: 3 }, 
  { uid: 'seat-d1', seatCol: 29, seatRow: 25, facingDir: 2, defaultAction: 'reading' }, 
  { uid: 'seat-d2', seatCol: 6.5, seatRow: 27, facingDir: 3 }, 
  { uid: 'seat-d3', seatCol: 12.5, seatRow: 27, facingDir: 3 }, 
  { uid: 'seat-d4', seatCol: 6.5, seatRow: 33, facingDir: 3 }, 
  { uid: 'seat-d5', seatCol: 12.5, seatRow: 33, facingDir: 3 }, 
  { uid: 'seat-d6', seatCol: 18.5, seatRow: 33, facingDir: 3 }, 
  { uid: 'seat-m1', seatCol: 22, seatRow: 13, facingDir: 1 }, 
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
  { uid: 'seat-l1', seatCol: 6.6, seatRow: 7.5, facingDir: 0, defaultAction: 'reading' },
  { uid: 'seat-l2', seatCol: 6.6, seatRow: 16.8, facingDir: 3 },
  { uid: 'seat-l3', seatCol: 12.8, seatRow: 16.8, facingDir: 3 },
  { uid: 'seat-r1', seatCol: 18.8, seatRow: 16.8, facingDir: 3 },
  { uid: 'seat-r2', seatCol: 6.6, seatRow: 24.8, facingDir: 3 },
  { uid: 'seat-r3', seatCol: 12.8, seatRow: 24.8, facingDir: 3 },
  { uid: 'seat-t1', seatCol: 42, seatRow: 7.8, facingDir: 0, defaultAction: 'reading' },
  { uid: 'seat-d1', seatCol: 74.7, seatRow: 33.8, facingDir: 0 },
  { uid: 'seat-d2', seatCol: 79, seatRow: 20, facingDir: 0, defaultAction: 'reading' },
  { uid: 'seat-d3', seatCol: 67, seatRow: 15, facingDir: 1, defaultAction: 'standing' },
  { uid: 'seat-d4', seatCol: 6.6, seatRow: 31, facingDir: 3 },
  { uid: 'seat-d5', seatCol: 12.8, seatRow: 31, facingDir: 3 },
  { uid: 'seat-d6', seatCol: 18.8, seatRow: 31, facingDir: 3 },
  { uid: 'seat-m1', seatCol: 18.8, seatRow: 24.8, facingDir: 3 },
  { uid: 'seat-m2', seatCol: 29.3, seatRow: 18.8, facingDir: 2 },
  { uid: 'seat-m3', seatCol: 35, seatRow: 18.8, facingDir: 1 },
  { uid: 'seat-m4', seatCol: 29.3, seatRow: 25, facingDir: 2 },
  { uid: 'seat-b1', seatCol: 47.5, seatRow: 35.5, facingDir: 0, defaultAction: 'reading'},  // CTO (技術長)
  { uid: 'seat-b2', seatCol: 35, seatRow: 25, facingDir: 1 },
  { uid: 'seat-b3', seatCol: 51, seatRow: 20, facingDir: 1 },
  { uid: 'seat-b4', seatCol: 31.2, seatRow: 43, facingDir: 3 },  // 小幫手
]

// ── Level 6: Cozy Office ─────────────────────────────────────
// 1280×712 px = 80 cols × 45 rows @ 16px/tile
// Positions are estimates — adjust as needed

const level6Seats: StaticSeat[] = [
  { uid: 'seat-l1', seatCol: 12, seatRow: 10, facingDir: 0,defaultAction: 'standing' },
  { uid: 'seat-l2', seatCol: 4.8, seatRow: 14.3, facingDir: 3 },
  { uid: 'seat-l3', seatCol: 8.5, seatRow: 14.3, facingDir: 3 },
  { uid: 'seat-r1', seatCol: 14.5, seatRow: 14.3, facingDir: 3 },
  { uid: 'seat-r2', seatCol: 17.5, seatRow: 14.3, facingDir: 3 },
  { uid: 'seat-r3', seatCol: 21, seatRow: 11.5, facingDir: 1 },
  { uid: 'seat-m1', seatCol: 21, seatRow: 8.8, facingDir: 1 },
  { uid: 'seat-d1', seatCol: 62, seatRow: 13, facingDir: 0, defaultAction: 'standing' },
  { uid: 'seat-d2', seatCol: 31.2, seatRow: 16, facingDir: 0 },
  { uid: 'seat-d3', seatCol: 33.2, seatRow: 17.8, facingDir: 1 },
  { uid: 'seat-d4', seatCol: 65.7, seatRow: 31, facingDir: 0 },
  { uid: 'seat-d5', seatCol: 69.5, seatRow: 31, facingDir: 0 },
  { uid: 'seat-d6', seatCol: 73, seatRow: 34, facingDir: 1 },
  { uid: 'seat-t1', seatCol: 27, seatRow: 40, facingDir: 2 },
  { uid: 'seat-m2', seatCol: 55, seatRow: 8, facingDir: 0, defaultAction: 'standing' },
  { uid: 'seat-m3', seatCol: 39, seatRow: 18, facingDir: 2 },
  { uid: 'seat-m4', seatCol: 47.3, seatRow: 18, facingDir: 1 },
  { uid: 'seat-b2', seatCol: 40, seatRow: 32, facingDir: 0, defaultAction: 'reading' },
  { uid: 'seat-b3', seatCol: 13, seatRow: 24, facingDir: 3 },
  { uid: 'seat-b4', seatCol: 10.5, seatRow: 35.5, facingDir: 0, defaultAction: 'reading' },  // 小幫手
  { uid: 'seat-b1', seatCol: 38, seatRow: 40, facingDir: 3 },  // CTO (技術長)
]

// ── Level 7: Nordic Home Office ─────────────────────────────
// 1280×706 px = 80 cols × 44 rows @ 16px/tile

const level7Seats: StaticSeat[] = [
  { uid: 'seat-l1', seatCol: 19.5, seatRow: 12, facingDir: 0, defaultAction: 'standing' },
  { uid: 'seat-l2', seatCol: 11, seatRow: 16, facingDir: 2 },
  { uid: 'seat-l3', seatCol: 11, seatRow: 19, facingDir: 2 },
  { uid: 'seat-r1', seatCol: 14.5, seatRow: 20.5, facingDir: 3},
  { uid: 'seat-r2', seatCol: 17, seatRow: 20.5, facingDir: 3 },
  { uid: 'seat-r3', seatCol: 20.5, seatRow: 17.5, facingDir: 1 },
  { uid: 'seat-m1', seatCol: 31.3, seatRow: 16, facingDir: 0, defaultAction: 'reading' },
  { uid: 'seat-t1', seatCol: 28.6, seatRow: 40.5, facingDir: 3 },
  { uid: 'seat-d1', seatCol: 51.2, seatRow: 13, facingDir: 0, defaultAction: 'standing'  },
  { uid: 'seat-d2', seatCol: 45.8, seatRow: 13, facingDir: 3 },
  { uid: 'seat-d3', seatCol: 33, seatRow: 25, facingDir: 1 },
  { uid: 'seat-d4', seatCol: 65.7, seatRow: 11.8, facingDir: 0, defaultAction: 'reading' },
  { uid: 'seat-d5', seatCol: 72.3, seatRow: 11.8, facingDir: 0, defaultAction: 'reading' },
  { uid: 'seat-d6', seatCol: 69, seatRow: 17.3, facingDir: 3 },
  { uid: 'seat-m2', seatCol: 6, seatRow: 38, facingDir: 1, defaultAction: 'standing' },
  { uid: 'seat-m3', seatCol: 39, seatRow: 35, facingDir: 3, defaultAction: 'standing' },
  { uid: 'seat-m4', seatCol: 5, seatRow: 18, facingDir: 1, defaultAction: 'standing' },
  { uid: 'seat-b2', seatCol: 43.2, seatRow: 21, facingDir: 3 },
  { uid: 'seat-b3', seatCol: 69, seatRow: 36, facingDir: 0, defaultAction: 'reading' },
  { uid: 'seat-b4', seatCol: 14.8, seatRow: 39.3, facingDir: 0, defaultAction: 'reading' },  // 小幫手
  { uid: 'seat-b1', seatCol: 62, seatRow: 34, facingDir: 0, defaultAction: 'standing' },  // CTO (技術長)
]

// ── Level 8: Japanese Collaborative Office ──────────────────
// 1280×706 px = 80 cols × 44 rows @ 16px/tile

const level8Seats: StaticSeat[] = [
  { uid: 'seat-l1', seatCol: 13, seatRow: 12, facingDir: 0, defaultAction: 'standing' },
  { uid: 'seat-l2', seatCol: 10, seatRow: 18, facingDir: 2 },
  { uid: 'seat-l3', seatCol: 14.8, seatRow: 21.5, facingDir: 3 },
  { uid: 'seat-r1', seatCol: 21, seatRow: 24.5, facingDir: 3 },
  { uid: 'seat-r2', seatCol: 26, seatRow: 21, facingDir: 1 },
  { uid: 'seat-r3', seatCol: 26, seatRow: 18, facingDir: 1 },
  { uid: 'seat-m1', seatCol: 21, seatRow: 15, facingDir: 0 },
  { uid: 'seat-t1', seatCol: 45.8, seatRow: 13.9, facingDir: 3 },
  { uid: 'seat-d1', seatCol: 33.5, seatRow: 18, facingDir: 1 },
  { uid: 'seat-d2', seatCol: 33.7, seatRow: 40.5, facingDir: 1},
  { uid: 'seat-d3', seatCol: 26, seatRow: 40.5, facingDir: 2 },
  { uid: 'seat-d4', seatCol: 66.5, seatRow: 18, facingDir: 3 },
  { uid: 'seat-d5', seatCol: 71, seatRow: 18, facingDir: 3 },
  { uid: 'seat-d6', seatCol: 74, seatRow: 15, facingDir: 1 },
  { uid: 'seat-m2', seatCol: 44, seatRow: 20, facingDir: 0, defaultAction: 'standing' },
  { uid: 'seat-m3', seatCol: 74, seatRow: 36, facingDir: 1 },
  { uid: 'seat-m4', seatCol: 38.5, seatRow: 35, facingDir: 3 },
  { uid: 'seat-b2', seatCol: 70, seatRow: 31, facingDir: 0, defaultAction: 'reading' },
  { uid: 'seat-b3', seatCol: 67, seatRow: 31, facingDir: 0, defaultAction: 'reading' },
  { uid: 'seat-b4', seatCol: 14.8, seatRow: 39.3, facingDir: 0, defaultAction: 'reading' },  // 小幫手
  { uid: 'seat-b1', seatCol: 63, seatRow: 12, facingDir: 0, defaultAction: 'standing' },  // CTO (技術長)
]

// ── Walking Routes ──────────────────────────────────────────
// Placeholder waypoints — adjust using the debug overlay

const level4Routes: WalkRoute[] = [
  { id: 'l4-main-hall', debugColor: '#00cccc', waypoints: [
    { col: 20, row: 18 }, { col: 20, row: 24 }, { col: 15, row: 24 },
  ]},
  { id: 'l4-meeting', debugColor: '#cc66cc', waypoints: [
    { col: 20, row: 18 }, { col: 28, row: 18 }, { col: 28, row: 25 },
  ]},
  { id: 'l4-lower', debugColor: '#cccc00', waypoints: [
    { col: 10, row: 30 }, { col: 10, row: 38 }, { col: 20, row: 38 },
  ]},
]

const level5Routes: WalkRoute[] = [
  { id: 'l5-central', debugColor: '#00cccc', waypoints: [
    { col: 25, row: 20 }, { col: 40, row: 20 }, { col: 40, row: 30 },
  ]},

  { id: 'l5-left-wing', debugColor: '#cc66cc', waypoints: [
    { col: 10, row: 20 }, { col: 10, row: 35 }, { col: 25, row: 35 },
  ]},

  { id: 'l5-right-top-1', debugColor: '#6679cc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 42, row: 10 }, { col: 46, row: 10 }, { col: 46, row: 9 },
  ]},
  { id: 'l5-right-top-2', debugColor: '#6679cc', waypoints: [
    { col: 42, row: 10 },  { col: 51.5, row: 10 }, { col: 51.5, row: 9 },
  ]},
  { id: 'l5-right-top-3', debugColor: '#6679cc',pauseAction: 'standing',  pauseDir: 2, waypoints: [
    { col: 42, row: 9 },  { col: 59, row: 9 },   { col: 59, row: 12 },
  ]},
  { id: 'l5-right-top-4', debugColor: '#6679cc',pauseAction: 'typing',  pauseDir: 2, waypoints: [
    { col: 42, row: 10 },  { col: 42, row: 20 },   { col: 41, row: 20 },
  ]},
  { id: 'l5-right-top-5', debugColor: '#6679cc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 42, row: 10 },  { col: 37, row: 10 },   { col: 37, row: 8 },
  ]},
  { id: 'l5-right-top-6', debugColor: '#6679cc',pauseAction: 'standing',  pauseDir: 0, waypoints: [
    { col: 42, row: 10 },  { col: 31, row: 10 },   { col: 31, row: 8 },
  ]},

  { id: 'l5-right-wing-1', debugColor: '#cccc00',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 73, row: 21 }, { col: 55, row: 21 }, { col: 55, row: 15 },
  ]},
  { id: 'l5-right-wing-2', debugColor: '#cccc00', waypoints: [
    { col: 79, row: 17 }, { col: 79, row: 9 },
  ]},
  { id: 'l5-right-wing-3', debugColor: '#cccc00', waypoints: [
    { col: 67, row: 12 }, { col: 67, row: 9 }, { col: 73, row: 9 }, { col: 73, row: 8 },
  ]},
  { id: 'l5-right-wing-4', debugColor: '#cccc00',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 67, row: 18 }, { col: 67, row: 21 }, { col: 55, row: 21 }, { col: 55, row: 15 }, { col: 51.5, row: 15 }, { col: 51.5, row: 9 }
  ]},
  { id: 'l5-right-wing-5', debugColor: '#cccc00',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 73, row: 21 }, { col: 55, row: 21 }, { col: 55, row: 15 }, { col: 52, row: 15 }, { col: 52, row: 9 }, { col: 59, row: 9 }
  ]},
  { id: 'l5-right-wing-6', debugColor: '#cccc00', waypoints: [
    { col: 67, row: 15 }, { col: 68, row: 15 }
  ]},

  { id: 'l5-bottom-1', debugColor: '#66cc66',pauseAction: 'standing',  pauseDir: 3,  waypoints: [
    { col: 35, row: 43 }, { col: 35, row: 39 }, { col: 52, row: 39 }, { col: 52, row: 36 }
  ]},
  { id: 'l5-bottom-2', debugColor: '#66cc66', waypoints: [
    { col: 35, row: 43 }, { col: 35, row: 39 }, { col: 48, row: 39 }, { col: 48, row: 38 }
  ]},
  { id: 'l5-bottom-3', debugColor: '#66cc66', waypoints: [
    { col: 35, row: 43 }, { col: 35, row: 39 }, { col: 37, row: 39 }, { col: 37, row: 37 }
  ]},

  { id: 'l5-bottom-4', debugColor: '#66cc66', waypoints: [
    { col: 48, row: 37 }, { col: 48, row: 39 }, { col: 43, row: 39 }, { col: 43, row: 38 }
  ]},
  { id: 'l5-bottom-5', debugColor: '#66cc66',pauseAction: 'typing',  pauseDir: 3, waypoints: [
    { col: 48, row: 37 }, { col: 48, row: 39 }, { col: 43, row: 39 }, { col: 43, row: 43.3 }
  ]},
  { id: 'l5-bottom-6', debugColor: '#66cc66',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 48, row: 37 }, { col: 48, row: 39 }, { col: 58, row: 39 }, { col: 58, row: 21 }, { col: 73, row: 21 }, { col: 73, row: 18 }
  ]},

  { id: 'l5-bottom-right-1', debugColor: '#e66d', waypoints: [
    { col: 77, row: 34 }, { col: 81, row: 34 }, { col: 81, row: 32 }
  ]},
  { id: 'l5-bottom-right-2', debugColor: '#e66d', waypoints: [
    { col: 77, row: 34 }, { col: 77, row: 31 }, { col: 73, row: 31 }, { col: 73, row: 30 }
  ]},

]

const level6Routes: WalkRoute[] = [
  { id: 'l6-main', debugColor: '#00cccc', waypoints: [
    { col: 25, row: 15 }, { col: 35, row: 15 }, { col: 35, row: 25 },
  ]},
  { id: 'l6-left', debugColor: '#cc66cc', waypoints: [
    { col: 10, row: 20 }, { col: 10, row: 30 }, { col: 20, row: 30 },
  ]},
  { id: 'l6-right', debugColor: '#cccc00', waypoints: [
    { col: 55, row: 15 }, { col: 55, row: 28 }, { col: 65, row: 28 },
  ]},
]

const level7Routes: WalkRoute[] = [
  { id: 'l7-center', debugColor: '#00cccc', waypoints: [
    { col: 25, row: 15 }, { col: 35, row: 15 }, { col: 35, row: 28 },
  ]},
  { id: 'l7-left', debugColor: '#cc66cc', waypoints: [
    { col: 10, row: 22 }, { col: 10, row: 32 }, { col: 20, row: 32 },
  ]},
  { id: 'l7-right', debugColor: '#cccc00', waypoints: [
    { col: 55, row: 20 }, { col: 55, row: 30 }, { col: 65, row: 30 },
  ]},
]

const level8Routes: WalkRoute[] = [
  { id: 'l8-center', debugColor: '#00cccc', waypoints: [
    { col: 30, row: 15 }, { col: 40, row: 15 }, { col: 40, row: 28 },
  ]},
  { id: 'l8-left', debugColor: '#cc66cc', waypoints: [
    { col: 15, row: 25 }, { col: 15, row: 35 }, { col: 25, row: 35 },
  ]},
  { id: 'l8-right', debugColor: '#cccc00', waypoints: [
    { col: 60, row: 20 }, { col: 60, row: 30 }, { col: 70, row: 30 },
  ]},
]

// ── Export all scenes ──────────────────────────────────────────

export const SCENE_DEFINITIONS: SceneDefinition[] = [
  {
    id: 'level4',
    name: '企業辦公室',
    backgroundImage: 'office-level-4.png',
    defaultZoom: 1,
    layout: makeStaticLayout(40, 50, 'office-level-4.png', level4Seats),
    routes: level4Routes,
  },
  {
    id: 'level5',
    name: '科技辦公室',
    backgroundImage: 'office-level5.jpg',
    defaultZoom: 1,
    layout: makeStaticLayout(86, 48, 'office-level5.jpg', level5Seats),
    routes: level5Routes,
  },
  {
    id: 'level6',
    name: '復古辦公室',
    backgroundImage: 'office-level6.png',
    defaultZoom: 1,
    layout: makeStaticLayout(80, 45, 'office-level6.png', level6Seats),
    routes: level6Routes,
  },
  {
    id: 'level7',
    name: '北歐居家辦公室',
    backgroundImage: 'office-level7.png',
    defaultZoom: 1,
    layout: makeStaticLayout(80, 44, 'office-level7.png', level7Seats),
    routes: level7Routes,
  },
  {
    id: 'level8',
    name: '日式協作辦公室',
    backgroundImage: 'office-level8.png',
    defaultZoom: 1,
    layout: makeStaticLayout(80, 44, 'office-level8.png', level8Seats),
    routes: level8Routes,
  },
]
