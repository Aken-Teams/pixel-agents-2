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
  { id: 'l4-main-hall-1', debugColor: '#00cccc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 9, row: 27 }, { col: 9, row: 28 }, { col: 23, row: 28 }, { col: 23, row: 22 }, { col: 25, row: 22 }, { col: 25, row: 21 }
  ]},
  { id: 'l4-main-hall-2', debugColor: '#00cccc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 9, row: 27 }, { col: 9, row: 28 }, { col: 23, row: 28 }, { col: 23, row: 22 }, { col: 15, row: 22 }, { col: 15, row: 21 }
  ]},
  { id: 'l4-main-hall-3', debugColor: '#00cccc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 9, row: 27 }, { col: 9, row: 28 }, { col: 23, row: 28 }, { col: 23, row: 22 }, { col: 11, row: 22 }, { col: 11, row: 21 }
  ]},
  { id: 'l4-main-hall-4', debugColor: '#00cccc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 9, row: 27 }, { col: 9, row: 28 }, { col: 23, row: 28 }, { col: 23, row: 22 }, { col: 31, row: 22 }, { col: 31, row: 21 }
  ]},
  { id: 'l4-main-hall-5', debugColor: '#00cccc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 9, row: 27 }, { col: 9, row: 28 }, { col: 23, row: 28 }, { col: 23, row: 22 }, { col: 36, row: 22 }, { col: 36, row: 21 }
  ]},

  { id: 'l4-main-hall-6', debugColor: '#00cccc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 16, row: 27 }, { col: 16, row: 28 }, { col: 23, row: 28 }, { col: 23, row: 22 }, { col: 25, row: 22 }, { col: 25, row: 21 }
  ]},
  { id: 'l4-main-hall-7', debugColor: '#00cccc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 16, row: 27 }, { col: 16, row: 28 }, { col: 23, row: 28 }, { col: 23, row: 22 }, { col: 15, row: 22 }, { col: 15, row: 21 }
  ]},
  { id: 'l4-main-hall-8', debugColor: '#00cccc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 16, row: 27 }, { col: 16, row: 28 }, { col: 23, row: 28 }, { col: 23, row: 22 }, { col: 11, row: 22 }, { col: 11, row: 21 }
  ]},
  { id: 'l4-main-hall-9', debugColor: '#00cccc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 16, row: 27 }, { col: 16, row: 28 }, { col: 23, row: 28 }, { col: 23, row: 22 }, { col: 31, row: 22 }, { col: 31, row: 21 }
  ]},
  { id: 'l4-main-hall-10', debugColor: '#00cccc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 16, row: 27 }, { col: 16, row: 28 }, { col: 23, row: 28 }, { col: 23, row: 22 }, { col: 36, row: 22 }, { col: 36, row: 21 }
  ]},

  { id: 'l4-main-hall2-1', debugColor: '#cc2900',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 9, row: 33 }, { col: 9, row: 34 }, { col: 23, row: 34 }, { col: 23, row: 22 }, { col: 25, row: 22 }, { col: 25, row: 21 }
  ]},
  { id: 'l4-main-hall2-2', debugColor: '#cc2900',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 9, row: 33 }, { col: 9, row: 34 }, { col: 23, row: 34 }, { col: 23, row: 22 }, { col: 15, row: 22 }, { col: 15, row: 21 }
  ]},
  { id: 'l4-main-hall2-3', debugColor: '#cc2900',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 9, row: 33 }, { col: 9, row: 34 }, { col: 23, row: 34 }, { col: 23, row: 22 }, { col: 11, row: 22 }, { col: 11, row: 21 }
  ]},
  { id: 'l4-main-hall2-4', debugColor: '#cc2900',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 9, row: 33 }, { col: 9, row: 34 }, { col: 23, row: 34 }, { col: 23, row: 22 }, { col: 31, row: 22 }, { col: 31, row: 21 }
  ]},
  { id: 'l4-main-hall2-5', debugColor: '#cc2900',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 9, row: 33 }, { col: 9, row: 34 }, { col: 23, row: 34 }, { col: 23, row: 22 }, { col: 36, row: 22 }, { col: 36, row: 21 }
  ]},

  { id: 'l4-main-hall2-6', debugColor: '#cc2900',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 16, row: 33 }, { col: 16, row: 34 }, { col: 23, row: 34 }, { col: 23, row: 22 }, { col: 25, row: 22 }, { col: 25, row: 21 }
  ]},
  { id: 'l4-main-hall2-7', debugColor: '#cc2900',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 16, row: 33 }, { col: 16, row: 34 }, { col: 23, row: 34 }, { col: 23, row: 22 }, { col: 15, row: 22 }, { col: 15, row: 21 }
  ]},
  { id: 'l4-main-hall2-8', debugColor: '#cc2900',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 16, row: 33 }, { col: 16, row: 34 }, { col: 23, row: 34 }, { col: 23, row: 22 }, { col: 11, row: 22 }, { col: 11, row: 21 }
  ]},
  { id: 'l4-main-hall2-9', debugColor: '#cc2900',pauseAction: 'standing',  pauseDir: 3, waypoints: [
   { col: 16, row: 33 }, { col: 16, row: 34 }, { col: 23, row: 34 }, { col: 23, row: 22 }, { col: 31, row: 22 }, { col: 31, row: 21 }
  ]},
  { id: 'l4-main-hall2-10', debugColor: '#cc2900',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 16, row: 33 }, { col: 16, row: 34 }, { col: 23, row: 34 }, { col: 23, row: 22 }, { col: 36, row: 22 }, { col: 36, row: 21 }
  ]},

  { id: 'l4-meeting-1', debugColor: '#cc66cc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 20, row: 6 }, { col: 24, row: 6 },
  ]},
  { id: 'l4-meeting-2', debugColor: '#cc66cc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 20, row: 6 }
  ]},
  { id: 'l4-meeting-3', debugColor: '#cc66cc',pauseAction: 'standing',  pauseDir: 1, waypoints: [
    { col: 20, row: 6 }, { col: 16, row: 6 },
  ]},

  { id: 'l4-lower-1', debugColor: '#cccc00',pauseAction: 'reading',  pauseDir: 0, waypoints: [
    { col: 12, row: 40 }, { col: 17, row: 40 }, { col: 17, row: 45 },
  ]},
  { id: 'l4-lower-2', debugColor: '#cccc00',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 12, row: 40 }, { col: 17, row: 40 }, { col: 17, row: 42 }, { col: 23, row: 42 }, { col: 23, row: 22 }, { col: 25, row: 22 }, { col: 25, row: 21 }
  ]},

  { id: 'l4-bottom-1', debugColor: '#008bcc',pauseAction: 'reading',  pauseDir: 0, waypoints: [
    { col: 33, row: 45 }, { col: 36, row: 45 },
  ]},
  { id: 'l4-bottom-2', debugColor: '#008bcc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 33, row: 45 }, { col: 36, row: 45 }, { col: 36, row: 39 }, 
  ]},
  { id: 'l4-bottom-3', debugColor: '#008bcc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 33, row: 45 }, { col: 36, row: 45 }, { col: 36, row: 39 }, { col: 31, row: 39 }, { col: 31, row: 38 } 
  ]},
]

const level5Routes: WalkRoute[] = [
  { id: 'l5-left-central-1', debugColor: '#00cccc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 10, row: 17 }, { col: 10, row: 18 }, { col: 24, row: 18 },{ col: 24, row: 12 },
  ]},
  { id: 'l5-left-central-2', debugColor: '#00cccc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 10, row: 17 }, { col: 10, row: 18 }, { col: 24, row: 18 },{ col: 24, row: 11 },{ col: 7, row: 11 },{ col: 7, row: 10 },
  ]},
  { id: 'l5-left-central-3', debugColor: '#00cccc',pauseAction: 'standing',  pauseDir: 1, waypoints: [
    { col: 10, row: 17 }, { col: 10, row: 18 }, { col: 24, row: 18 },{ col: 24, row: 40 },{ col: 19, row: 40 }
  ]},
  { id: 'l5-left-central-4', debugColor: '#00cccc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 10, row: 17 }, { col: 10, row: 18 }, { col: 24, row: 18 },{ col: 24, row: 40 },{ col: 19, row: 40 },{ col: 19, row: 42 },{ col: 12, row: 42 }
  ]},
  { id: 'l5-left-central-5', debugColor: '#00cccc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 10, row: 17 }, { col: 10, row: 18 }, { col: 24, row: 18 },{ col: 24, row: 40 },{ col: 19, row: 40 },{ col: 19, row: 43 },{ col: 5, row: 43 },{ col: 5, row: 40 }
  ]},

  { id: 'l5-left-central-6', debugColor: '#00cccc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 16, row: 17 }, { col: 16, row: 18 }, { col: 24, row: 18 },{ col: 24, row: 12 },
  ]},
  { id: 'l5-left-central-7', debugColor: '#00cccc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 16, row: 17 }, { col: 16, row: 18 }, { col: 24, row: 18 },{ col: 24, row: 11 },{ col: 7, row: 11 },{ col: 7, row: 10 },
  ]},
  { id: 'l5-left-central-8', debugColor: '#00cccc',pauseAction: 'standing',  pauseDir: 1, waypoints: [
    { col: 16, row: 17 }, { col: 16, row: 18 }, { col: 24, row: 18 },{ col: 24, row: 40 },{ col: 19, row: 40 }
  ]},
  { id: 'l5-left-central-9', debugColor: '#00cccc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 16, row: 17 }, { col: 16, row: 18 }, { col: 24, row: 18 },{ col: 24, row: 40 },{ col: 19, row: 40 },{ col: 19, row: 42 },{ col: 12, row: 42 }
  ]},
  { id: 'l5-left-central-10', debugColor: '#00cccc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 16, row: 17 }, { col: 16, row: 18 }, { col: 24, row: 18 },{ col: 24, row: 40 },{ col: 19, row: 40 },{ col: 19, row: 43 },{ col: 5, row: 43 },{ col: 5, row: 40 }
  ]},

  { id: 'l5-middle-central-1', debugColor: '#cc4b00',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 10, row: 25 }, { col: 10, row: 26 }, { col: 24, row: 26 },{ col: 24, row: 11 },{ col: 7, row: 11 },{ col: 7, row: 10 },
  ]},
  { id: 'l5-middle-central-2', debugColor: '#cc4b00',pauseAction: 'standing',  pauseDir: 0, waypoints: [
    { col: 10, row: 25 }, { col: 10, row: 26 }, { col: 24, row: 26 },{ col: 24, row: 39 },{ col: 27, row: 39 },{ col: 27, row: 36 }
  ]},
  { id: 'l5-middle-central-3', debugColor: '#cc4b00',pauseAction: 'reading',  pauseDir: 0, waypoints: [
    { col: 10, row: 25 }, { col: 10, row: 26 }, { col: 16, row: 26 },{ col: 16, row: 24 },
  ]},

  { id: 'l5-middle-central-4', debugColor: '#cc4b00',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 16, row: 25 }, { col: 16, row: 26 }, { col: 24, row: 26 },{ col: 24, row: 11 },{ col: 7, row: 11 },{ col: 7, row: 10 },
  ]},
  { id: 'l5-middle-central-5', debugColor: '#cc4b00',pauseAction: 'standing',  pauseDir: 0, waypoints: [
    { col: 16, row: 25 }, { col: 16, row: 26 }, { col: 24, row: 26 },{ col: 24, row: 39 },{ col: 27, row: 39 },{ col: 27, row: 36 },
  ]},
  { id: 'l5-middle-central-6', debugColor: '#cc4b00',pauseAction: 'reading',  pauseDir: 0, waypoints: [
    { col: 16, row: 25 }, { col: 16, row: 26 }, { col: 10, row: 26 },{ col: 10, row: 24 },
  ]},

  { id: 'l5-bottom-central-1', debugColor: '#7000cc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 10, row: 31 }, { col: 10, row: 32 }, { col: 24, row: 32 },{ col: 24, row: 11 },{ col: 7, row: 11 },{ col: 7, row: 10 },
  ]},
  { id: 'l5-bottom-central-2', debugColor: '#7000cc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 10, row: 31 }, { col: 10, row: 32 }, { col: 24, row: 32 },{ col: 24, row: 40 },{ col: 19, row: 40 },{ col: 19, row: 42 },{ col: 12, row: 42 }
  ]},
  { id: 'l5-bottom-central-3', debugColor: '#7000cc',pauseAction: 'reading',  pauseDir: 0, waypoints: [
    { col: 10, row: 31 }, { col: 10, row: 32 }, { col: 24, row: 32 },{ col: 24, row: 40 },{ col: 19, row: 40 },{ col: 19, row: 43 }
  ]},

  { id: 'l5-bottom-central-4', debugColor: '#7000cc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 16, row: 31 }, { col: 16, row: 32 }, { col: 24, row: 32 },{ col: 24, row: 11 },{ col: 7, row: 11 },{ col: 7, row: 10 },
  ]},
  { id: 'l5-bottom-central-5', debugColor: '#7000cc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 16, row: 31 }, { col: 16, row: 32 }, { col: 24, row: 32 },{ col: 24, row: 40 },{ col: 19, row: 40 },{ col: 19, row: 42 },{ col: 12, row: 42 }
  ]},
  { id: 'l5-bottom-central-6', debugColor: '#7000cc',pauseAction: 'reading',  pauseDir: 0, waypoints: [
    { col: 16, row: 31 }, { col: 16, row: 32 }, { col: 24, row: 32 },{ col: 24, row: 40 },{ col: 19, row: 40 },{ col: 19, row: 43 }
  ]},

  { id: 'l5-left-top-1', debugColor: '#cc66cc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 7, row: 9 }, { col: 12, row: 9 }, { col: 12, row: 8 },
  ]},
  { id: 'l5-left-top-2', debugColor: '#cc66cc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 7, row: 9 }, { col: 15, row: 9 }
  ]},
  { id: 'l5-left-top-3', debugColor: '#cc66cc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 7, row: 9 }, { col: 15, row: 9 }, { col: 15, row: 11 },{ col: 26, row: 11 },{ col: 26, row: 8 },
  ]},
  { id: 'l5-left-top-4', debugColor: '#cc66cc',pauseAction: 'typing',  pauseDir: 2, waypoints: [
    { col: 7, row: 9 }, { col: 15, row: 9 }, { col: 15, row: 11 },{ col: 29, row: 11 },{ col: 29, row: 14 }
  ]},
  { id: 'l5-left-top-5', debugColor: '#cc66cc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 7, row: 9 }, { col: 15, row: 9 }, { col: 15, row: 11 },{ col: 37, row: 11 },{ col: 37, row: 8 }
  ]},

  { id: 'l5-right-top-1', debugColor: '#6679cc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 42, row: 10 }, { col: 46, row: 10 }, { col: 46, row: 9 },
  ]},
  { id: 'l5-right-top-2', debugColor: '#6679cc', waypoints: [
    { col: 42, row: 10 },  { col: 52, row: 10 }, { col: 52, row: 9 },
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
    { col: 76, row: 20 },{ col: 73, row: 20 },{ col: 73, row: 21 }, { col: 55, row: 21 }, { col: 55, row: 15 },
  ]},
  { id: 'l5-right-wing-2', debugColor: '#cccc00', waypoints: [
    { col: 79, row: 17 }, { col: 79, row: 9 },
  ]},
  { id: 'l5-right-wing-3', debugColor: '#cccc00', waypoints: [
    { col: 67, row: 12 }, { col: 67, row: 9 }, { col: 73, row: 9 }, { col: 73, row: 8 },
  ]},
  { id: 'l5-right-wing-4', debugColor: '#cccc00',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 67, row: 18 }, { col: 67, row: 21 }, { col: 55, row: 21 }, { col: 55, row: 15 }, { col: 52, row: 15 }, { col: 52, row: 9 }
  ]},
  { id: 'l5-right-wing-5', debugColor: '#cccc00',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 76, row: 20 },{ col: 73, row: 20 },{ col: 73, row: 21 }, { col: 55, row: 21 }, { col: 55, row: 15 }, { col: 52, row: 15 }, { col: 52, row: 9 }, { col: 59, row: 9 }
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
  { id: 'l5-bottom-4', debugColor: '#66cc66',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 35, row: 43 }, { col: 35, row: 38 }, { col: 33, row: 38 }, { col: 33, row: 28 }
  ]},

  { id: 'l5-bottom-5', debugColor: '#66cc66', waypoints: [
    { col: 48, row: 37 }, { col: 48, row: 39 }, { col: 43, row: 39 }, { col: 43, row: 38 }
  ]},
  { id: 'l5-bottom-6', debugColor: '#66cc66',pauseAction: 'typing',  pauseDir: 3, waypoints: [
    { col: 48, row: 37 }, { col: 48, row: 39 }, { col: 43, row: 39 }, { col: 43, row: 43 }
  ]},
  { id: 'l5-bottom-7', debugColor: '#66cc66',pauseAction: 'standing',  pauseDir: 3, waypoints: [
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
  { id: 'l6-right-top-1', debugColor: '#c900cc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 64, row: 13 },{ col: 64, row: 9 }
  ]},
  { id: 'l6-right-top-2', debugColor: '#c900cc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 64, row: 13 },{ col: 72, row: 13 },{ col: 72, row: 12 }
  ]},

  { id: 'l6-left-top-1', debugColor: '#00cccc',pauseAction: 'typing',  pauseDir: 3, waypoints: [
    { col: 5, row: 17 },{ col: 8, row: 17 },{ col: 14, row: 17 },{ col: 18, row: 17 },{ col: 24, row: 17 }, { col: 24, row: 13 },{ col: 24, row: 7 }
  ]},
  { id: 'l6-left-top-2', debugColor: '#00cccc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 5, row: 17 },{ col: 8, row: 17 },{ col: 14, row: 17 },{ col: 18, row: 17 },{ col: 24, row: 17 }, { col: 24, row: 13 },{ col: 24, row: 9 },  { col: 32, row: 9 },  { col: 32, row: 8 }
  ]},
  { id: 'l6-left-top-3', debugColor: '#00cccc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 5, row: 17 },{ col: 8, row: 17 },{ col: 14, row: 17 },{ col: 18, row: 17 },{ col: 24, row: 17 }, { col: 24, row: 13 },  { col: 24, row: 9 },  { col: 34, row: 9 },  { col: 34, row: 8 }
  ]},
  { id: 'l6-left-top-4', debugColor: '#00cccc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 5, row: 17 },{ col: 8, row: 17 },{ col: 14, row: 17 },{ col: 18, row: 17 },{ col: 24, row: 17 }, { col: 24, row: 13 }, { col: 24, row: 9 },  { col: 43, row: 9 },  
  ]},
  { id: 'l6-left-top-5', debugColor: '#00cccc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 5, row: 17 },{ col: 8, row: 17 },{ col: 14, row: 17 },{ col: 18, row: 17 },{ col: 24, row: 17 }, { col: 24, row: 13 }, { col: 24, row: 9 },  { col: 48, row: 9 },  { col: 48, row: 8 },  
  ]},

  { id: 'l6-left-top-6', debugColor: '#00cccc',pauseAction: 'standing',  pauseDir: 2, waypoints: [
    { col: 55, row: 9 },{ col: 55, row: 11 },
  ]},
  { id: 'l6-left-top-7', debugColor: '#00cccc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 55, row: 9 },{ col: 55, row: 12 },{ col: 51, row: 12 },{ col: 51, row: 18 },{ col: 64, row: 18 },
  ]},


  { id: 'l6-left-middle-1', debugColor: '#6675cc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 31, row: 18 }, { col: 28, row: 18 },   { col: 28, row: 9 },  { col: 34, row: 9 },  { col: 34, row: 8 }
  ]},
  { id: 'l6-left-middle-2', debugColor: '#6675cc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 31, row: 18 }, { col: 28, row: 18 },  { col: 28, row: 9 },  { col: 32, row: 9 },  { col: 32, row: 8 }
  ]},
  { id: 'l6-left-middle-3', debugColor: '#6675cc',pauseAction: 'typing',  pauseDir: 3, waypoints: [
    { col: 31, row: 18 }, { col: 28, row: 18 },  { col: 28, row: 9 },  { col: 24, row: 9 },  { col: 24, row: 7 }
  ]},


  { id: 'l6-left-1', debugColor: '#cc66cc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 11, row: 25 }, { col: 11, row: 27 }, { col: 9, row: 27 },
  ]},
  { id: 'l6-left-2', debugColor: '#cc66cc',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 11, row: 25 }, { col: 7, row: 25 }, 
  ]},
  { id: 'l6-left-3', debugColor: '#cc66cc',pauseAction: 'standing',  pauseDir: 0, waypoints: [
    { col: 11, row: 25 }, { col: 11, row: 27 }, { col: 9, row: 27 },{ col: 9, row: 28 },
  ]},
  { id: 'l6-left-4', debugColor: '#cc66cc',pauseAction: 'reading',  pauseDir: 0, waypoints: [
    { col: 13, row: 26 }, { col: 28, row: 26 }, { col: 28, row: 24 },{ col: 31, row: 24 },
  ]},

  { id: 'l6-bottom-left-1', debugColor: '#66cc70', waypoints: [
    { col: 12, row: 35 },{ col: 15, row: 35 }, { col: 15, row: 37 },  { col: 21, row: 37 },{ col: 21, row: 25 }, 
  ]},
  { id: 'l6-bottom-left-2', debugColor: '#66cc70', waypoints: [
    { col: 12, row: 35 },{ col: 15, row: 35 },{ col: 15, row: 37 },  { col: 34, row: 37 },  { col: 34, row: 35 },
  ]},
  { id: 'l6-bottom-left-3', debugColor: '#66cc70',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 9, row: 35 },{ col: 8, row: 35 },{ col: 8, row: 36 },{ col: 7, row: 36 },{ col: 7, row: 37 },{ col: 5, row: 37 },
  ]},
  { id: 'l6-bottom-left-4', debugColor: '#66cc70', waypoints: [
    { col: 12, row: 35 },{ col: 15, row: 35 }, { col: 15, row: 37 },  { col: 21, row: 37 },{ col: 21, row: 26 },{ col: 28, row: 26 }, 
  ]},

  { id: 'l6-bottom-left2-1', debugColor: '#ccaa66', waypoints: [
    { col: 27, row: 37 },{ col: 27, row: 36 }, { col: 34, row: 36 },  { col: 34, row: 35 }
  ]},
  { id: 'l6-bottom-left2-2', debugColor: '#ccaa66',pauseAction: 'standing',  pauseDir: 2, waypoints: [
    { col: 27, row: 37 },{ col: 27, row: 36 }, { col: 31, row: 36 },  { col: 31, row: 27 },  { col: 28, row: 27 },  { col: 28, row: 18 },  { col: 29, row: 18 }
  ]},
  { id: 'l6-bottom-left2-3', debugColor: '#ccaa66',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 27, row: 37 },{ col: 27, row: 36 }, { col: 31, row: 36 },  { col: 31, row: 27 },  { col: 28, row: 27 },  { col: 28, row: 9 },  { col: 34, row: 9 },  { col: 34, row: 8 }
  ]},

  { id: 'l6-bottom-1', debugColor: '#cc6666', waypoints: [
    { col: 38, row: 38 }, { col: 38, row: 32 }, 
  ]},
  { id: 'l6-bottom-2', debugColor: '#cc6666', waypoints: [
    { col: 38, row: 38 }, { col: 38, row: 35 }, { col: 39, row: 35 }, 
  ]},
  { id: 'l6-bottom-3', debugColor: '#cc6666', waypoints: [
    { col: 38, row: 38 }, { col: 38, row: 36 }, { col: 34, row: 36 }, { col: 34, row: 35 }, 
  ]},
  { id: 'l6-bottom-4', debugColor: '#cc6666',pauseAction: 'typing',  pauseDir: 1, waypoints: [
    { col: 38, row: 38 }, { col: 38, row: 36 }, { col: 33, row: 36 }, { col: 33, row: 40 }, 
  ]},
  { id: 'l6-bottom-5', debugColor: '#cc6666',pauseAction: 'standing',  pauseDir: 0, waypoints: [
    { col: 38, row: 38 }, { col: 38, row: 36 }, { col: 20, row: 36 }, { col: 20, row: 39 },
  ]},

  { id: 'l6-bottom-6', debugColor: '#cc6666',pauseAction: 'reading',  pauseDir: 0, waypoints: [
    { col: 42, row: 32 }, { col: 49, row: 32 }, 
  ]},

  { id: 'l6-bottom-right-1', debugColor: '#cccc00', waypoints: [
    { col: 64, row: 31 }, { col: 62, row: 31 }, { col: 62, row: 30 },
  ]},
  { id: 'l6-bottom-right-2', debugColor: '#cccc00', waypoints: [
    { col: 71, row: 31 }, { col: 73, row: 31 }, { col: 73, row: 30 },
  ]},
  { id: 'l6-bottom-right-3', debugColor: '#cccc00', waypoints: [
    { col: 64, row: 31 }, { col: 60, row: 31 }, { col: 60, row: 35 }, { col: 50, row: 35 },
  ]},
  { id: 'l6-bottom-right-4', debugColor: '#cccc00',pauseAction: 'typing',  pauseDir: 1, waypoints: [
    { col: 75, row: 34 }, { col: 77, row: 34 }, 
  ]},
  { id: 'l6-bottom-right-5', debugColor: '#cccc00',pauseAction: 'standing',  pauseDir: 3, waypoints: [
    { col: 64, row: 31 }, { col: 60, row: 31 }, { col: 60, row: 35 }, { col: 54, row: 35 },{ col: 54, row: 18 },{ col: 74, row: 18 },
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
