#!/usr/bin/env node
/**
 * Generate the walkable grid + seats JSON for Office Level 4 static background.
 * Image: 640×800 px = 40 cols × 50 rows at 16px/tile.
 *
 * Direction enum: DOWN=0, LEFT=1, RIGHT=2, UP=3
 *
 * Building layout (from pixel analysis of office-level-4.png):
 * - Conference room: cols 11-28, rows 1-14 (centered at top)
 * - Main building:   cols 1-38,  rows 15-49 (full width below conference)
 * - Right divider:   col 27 (rows 17-34, separating desks from meeting area)
 * - Bottom divider:  row 35 (horizontal), col 25 (vertical, rows 36-48)
 */

const COLS = 40, ROWS = 50
const V = 8  // VOID (outside building)
const W = 0  // WALL (blocked)
const F = 1  // FLOOR (walkable)

// Initialise grid to VOID
const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(V))

function fill(c1, r1, c2, r2, val) {
  for (let r = r1; r <= r2; r++)
    for (let c = c1; c <= c2; c++)
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS)
        grid[r][c] = val
}

function set(c, r, val) {
  if (r >= 0 && r < ROWS && c >= 0 && c < COLS)
    grid[r][c] = val
}

// ═══════════════════════════════════════════════════════════
// CONFERENCE ROOM  (top center, cols 11–28, rows 1–14)
// Narrowed from original cols 9-30 to match actual PNG
// ═══════════════════════════════════════════════════════════
fill(11, 1, 28, 14, W)      // outer walls
fill(12, 2, 27, 13, F)      // interior floor

// Conference table (blocked) — centered in room
fill(16, 5, 23, 10, W)

// Door → main floor (2 tiles wide, bottom wall of conference room)
set(19, 14, F)
set(20, 14, F)

// ═══════════════════════════════════════════════════════════
// MAIN FLOOR  (cols 1–38, rows 15–49)
// Interior floor starts at col 2 (col 1 = building wall in image)
// ═══════════════════════════════════════════════════════════
fill(1, 15, 38, 49, W)      // outer walls
fill(2, 17, 37, 48, F)      // interior floor (narrowed: cols 2-37)

// Door connection from conference room (through the top wall)
set(19, 15, F)
set(20, 15, F)
set(19, 16, F)
set(20, 16, F)

// ── Top-wall furniture (shelves, printer, cabinets) ───────
// These block walkable tiles along row 17-18
fill(2, 17, 7, 18, W)       // left bookshelves
fill(10, 17, 11, 17, W)     // small cabinet near door
fill(22, 17, 28, 18, W)     // printer / copier area
fill(35, 17, 37, 18, W)     // cabinets / fridge far right

// ── Right-side room divider (vertical wall at col 27) ─────
fill(27, 17, 27, 34, W)
// Door in divider
set(27, 21, F)
set(27, 22, F)

// ── Left desk area – top row (3 workstations) ────────────
fill(3, 20, 6, 22, W)       // desk 1
fill(8, 20, 11, 22, W)      // desk 2
fill(14, 20, 17, 22, W)     // desk 3

// ── Left desk area – bottom row (3 workstations) ─────────
fill(3, 26, 6, 28, W)       // desk 4
fill(8, 26, 11, 28, W)      // desk 5
fill(14, 26, 17, 28, W)     // desk 6

// ── Right meeting room – table ────────────────────────────
fill(29, 21, 34, 24, W)

// ═══════════════════════════════════════════════════════════
// BOTTOM SECTION  (horizontal divider at row 35)
// ═══════════════════════════════════════════════════════════
fill(1, 35, 38, 35, W)      // horizontal wall
// Doors in horizontal wall
set(9, 35, F)
set(10, 35, F)
set(27, 35, F)
set(28, 35, F)

// Vertical divider (bottom section, col 25)
fill(25, 36, 25, 48, W)
// Door in vertical divider
set(25, 41, F)
set(25, 42, F)

// ── Bottom-left room – reception counter ──────────────────
fill(8, 44, 16, 45, W)

// ── Bottom-right room – desk ──────────────────────────────
fill(31, 43, 36, 44, W)

// ═══════════════════════════════════════════════════════════
// Flatten to 1-D array (row-major)
// ═══════════════════════════════════════════════════════════
const tiles = []
for (let r = 0; r < ROWS; r++)
  for (let c = 0; c < COLS; c++)
    tiles.push(grid[r][c])

// ═══════════════════════════════════════════════════════════
// STATIC SEATS
// Direction: DOWN=0, LEFT=1, RIGHT=2, UP=3
// ═══════════════════════════════════════════════════════════
const staticSeats = [
  // Conference room – left side of table
  { uid: 'conf-l1', seatCol: 14, seatRow: 6,  facingDir: 2 },
  { uid: 'conf-l2', seatCol: 14, seatRow: 9,  facingDir: 2 },
  // Conference room – right side of table
  { uid: 'conf-r1', seatCol: 25, seatRow: 6,  facingDir: 1 },
  { uid: 'conf-r2', seatCol: 25, seatRow: 9,  facingDir: 1 },
  // Conference room – top of table
  { uid: 'conf-t1', seatCol: 18, seatRow: 4,  facingDir: 0 },
  { uid: 'conf-t2', seatCol: 21, seatRow: 4,  facingDir: 0 },
  // Conference room – bottom of table
  { uid: 'conf-b1', seatCol: 18, seatRow: 11, facingDir: 3 },
  { uid: 'conf-b2', seatCol: 21, seatRow: 11, facingDir: 3 },

  // Main desks – top row (chairs below desks)
  { uid: 'desk-1',  seatCol: 4,  seatRow: 23, facingDir: 3 },
  { uid: 'desk-2',  seatCol: 9,  seatRow: 23, facingDir: 3 },
  { uid: 'desk-3',  seatCol: 15, seatRow: 23, facingDir: 3 },
  // Main desks – bottom row (chairs below desks)
  { uid: 'desk-4',  seatCol: 4,  seatRow: 29, facingDir: 3 },
  { uid: 'desk-5',  seatCol: 9,  seatRow: 29, facingDir: 3 },
  { uid: 'desk-6',  seatCol: 15, seatRow: 29, facingDir: 3 },

  // Meeting room chairs (right section)
  { uid: 'meet-l',  seatCol: 28, seatRow: 22, facingDir: 2 },
  { uid: 'meet-r',  seatCol: 35, seatRow: 22, facingDir: 1 },
  { uid: 'meet-t',  seatCol: 31, seatRow: 20, facingDir: 0 },
  { uid: 'meet-b',  seatCol: 31, seatRow: 25, facingDir: 3 },

  // Private office (bottom right)
  { uid: 'office-1', seatCol: 33, seatRow: 45, facingDir: 3 },
]

// Verify all seats land on walkable tiles
for (const s of staticSeats) {
  const idx = s.seatRow * COLS + s.seatCol
  if (tiles[idx] !== F) {
    console.error(`ERROR: seat ${s.uid} at (${s.seatCol},${s.seatRow}) is on tile type ${tiles[idx]}, expected FLOOR (${F})`)
    process.exit(1)
  }
}

// Print walkable tile count
const walkable = tiles.filter(t => t === F).length
const walls = tiles.filter(t => t === W).length
const voids = tiles.filter(t => t === V).length
console.error(`Grid: ${COLS}×${ROWS} = ${COLS * ROWS} tiles`)
console.error(`  FLOOR: ${walkable}  WALL: ${walls}  VOID: ${voids}`)
console.error(`  Seats: ${staticSeats.length}`)

// ═══════════════════════════════════════════════════════════
// Build layout JSON
// ═══════════════════════════════════════════════════════════
const layout = {
  version: 1,
  cols: COLS,
  rows: ROWS,
  backgroundImage: 'office-level-4.png',
  tiles,
  furniture: [],
  staticSeats,
}

// Print a visual map to stderr for debugging
console.error('\nVisual grid:')
const symbols = { [V]: '·', [W]: '█', [F]: ' ' }
for (let r = 0; r < ROWS; r++) {
  let row = ''
  for (let c = 0; c < COLS; c++) {
    const idx = r * COLS + c
    // Mark seats with 'S'
    const isSeat = staticSeats.some(s => s.seatCol === c && s.seatRow === r)
    row += isSeat ? 'S' : (symbols[tiles[idx]] || '?')
  }
  console.error(`${String(r).padStart(2)} |${row}|`)
}

// Output JSON to stdout
console.log(JSON.stringify(layout, null, 2))
