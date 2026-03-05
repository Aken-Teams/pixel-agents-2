import { CharacterState, Direction, TILE_SIZE } from '../types.js'
import type { Character, Seat, SpriteData, TileType as TileTypeVal, WalkRoute } from '../types.js'
import type { CharacterSprites } from '../sprites/spriteData.js'
import { findPath } from '../layout/tileMap.js'
import { directPath } from './wanderCoordinator.js'
import {
  WALK_SPEED_PX_PER_SEC,
  WALK_FRAME_DURATION_SEC,
  TYPE_FRAME_DURATION_SEC,
  WANDER_PAUSE_MIN_SEC,
  WANDER_PAUSE_MAX_SEC,
  WANDER_MOVES_BEFORE_REST_MIN,
  WANDER_MOVES_BEFORE_REST_MAX,
  SEAT_REST_MIN_SEC,
  SEAT_REST_MAX_SEC,
  ROUTE_PAUSE_MIN_SEC,
  ROUTE_PAUSE_MAX_SEC,
  ROUTE_REST_MIN_SEC,
  ROUTE_REST_MAX_SEC,
} from '../../constants.js'

/** Tools that show reading animation instead of typing */
const READING_TOOLS = new Set(['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch'])

export function isReadingTool(tool: string | null): boolean {
  if (!tool) return false
  return READING_TOOLS.has(tool)
}

/** Pixel center of a tile */
function tileCenter(col: number, row: number): { x: number; y: number } {
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE / 2,
  }
}

/** Direction from one tile to another (picks dominant axis for diagonals) */
function directionBetween(fromCol: number, fromRow: number, toCol: number, toRow: number): Direction {
  const dc = toCol - fromCol
  const dr = toRow - fromRow
  // For diagonal movement, pick the dominant axis
  if (Math.abs(dc) >= Math.abs(dr)) {
    return dc >= 0 ? Direction.RIGHT : Direction.LEFT
  }
  return dr >= 0 ? Direction.DOWN : Direction.UP
}

export function createCharacter(
  id: number,
  palette: number,
  seatId: string | null,
  seat: Seat | null,
  hueShift = 0,
  name?: string,
): Character {
  const col = seat ? seat.seatCol : 1
  const row = seat ? seat.seatRow : 1
  const center = tileCenter(col, row)
  return {
    id,
    state: CharacterState.TYPE,
    dir: seat ? seat.facingDir : Direction.DOWN,
    x: center.x,
    y: center.y,
    tileCol: col,
    tileRow: row,
    path: [],
    moveProgress: 0,
    currentTool: null,
    palette,
    hueShift,
    frame: 0,
    frameTimer: 0,
    wanderTimer: 0,
    wanderCount: 0,
    wanderLimit: randomInt(WANDER_MOVES_BEFORE_REST_MIN, WANDER_MOVES_BEFORE_REST_MAX),
    isActive: true,
    seatId,
    bubbleType: null,
    bubbleTimer: 0,
    seatTimer: 0,
    name,
    isSubagent: false,
    parentAgentId: null,
    matrixEffect: null,
    matrixEffectTimer: 0,
    matrixEffectSeeds: [],
    routeId: null,
    routeWaypointIndex: 0,
    routeReturning: false,
    routePauseTimer: 0,
    routePhase: null,
    routeEntryIndex: 0,
  }
}

export function updateCharacter(
  ch: Character,
  dt: number,
  walkableTiles: Array<{ col: number; row: number }>,
  seats: Map<string, Seat>,
  tileMap: TileTypeVal[][],
  blockedTiles: Set<string>,
  routes?: WalkRoute[],
): void {
  ch.frameTimer += dt

  switch (ch.state) {
    case CharacterState.TYPE: {
      if (ch.frameTimer >= TYPE_FRAME_DURATION_SEC) {
        ch.frameTimer -= TYPE_FRAME_DURATION_SEC
        ch.frame = (ch.frame + 1) % 2
      }
      // Route pause at destination with typing/reading animation
      if (ch.routePhase === 'pausing') {
        if (ch.isActive) {
          // Activated during pause — clear route and let normal TYPE logic handle it
          ch.routePhase = null
          ch.routeId = null
          ch.currentTool = null
        } else {
          ch.routePauseTimer -= dt
          if (ch.routePauseTimer <= 0) {
            startRouteReturn(ch, routes ?? [])
          }
          break
        }
      }
      // If no longer active, stand up and start wandering (after seatTimer expires)
      if (!ch.isActive) {
        if (ch.seatTimer > 0) {
          ch.seatTimer -= dt
          break
        }
        // When routes exist (static layout), stay in TYPE and let the coordinator
        // assign route walking. Only transition to IDLE for dynamic layout wandering.
        if (routes && routes.length > 0) {
          // Stay in TYPE — coordinator will pick us up
          break
        }
        ch.seatTimer = 0 // clear sentinel
        ch.state = CharacterState.IDLE
        ch.frame = 0
        ch.frameTimer = 0
        ch.wanderTimer = randomRange(WANDER_PAUSE_MIN_SEC, WANDER_PAUSE_MAX_SEC)
        ch.wanderCount = 0
        ch.wanderLimit = randomInt(WANDER_MOVES_BEFORE_REST_MIN, WANDER_MOVES_BEFORE_REST_MAX)
      }
      break
    }

    case CharacterState.IDLE: {
      // No idle animation — static pose
      ch.frame = 0
      if (ch.seatTimer < 0) ch.seatTimer = 0 // clear turn-end sentinel
      // If became active, pathfind to seat
      if (ch.isActive) {
        if (!ch.seatId) {
          // No seat assigned — type in place
          ch.state = CharacterState.TYPE
          ch.frame = 0
          ch.frameTimer = 0
          break
        }
        const seat = seats.get(ch.seatId)
        if (seat) {
          const path = findPath(ch.tileCol, ch.tileRow, seat.seatCol, seat.seatRow, tileMap, blockedTiles)
          if (path.length > 0) {
            ch.path = path
            ch.moveProgress = 0
            ch.state = CharacterState.WALK
            ch.frame = 0
            ch.frameTimer = 0
          } else {
            // Already at seat or no path — sit down
            ch.state = CharacterState.TYPE
            ch.dir = seat.facingDir
            ch.frame = 0
            ch.frameTimer = 0
          }
        }
        break
      }
      // Route pause phase: standing at destination, counting down
      if (ch.routePhase === 'pausing') {
        ch.routePauseTimer -= dt
        if (ch.routePauseTimer <= 0) {
          startRouteReturn(ch, routes ?? [])
        }
        break
      }

      // Route toSeat phase: need to walk back to seat
      if (ch.routePhase === 'toSeat') {
        const seat = ch.seatId ? seats.get(ch.seatId) : null
        if (seat) {
          const path = directPath(
            Math.round(ch.tileCol), Math.round(ch.tileRow),
            Math.round(seat.seatCol), Math.round(seat.seatRow),
          )
          if (path.length > 0) {
            ch.path = path
            ch.moveProgress = 0
            ch.state = CharacterState.WALK
            ch.frame = 0
            ch.frameTimer = 0
          } else {
            // Teleport to seat
            ch.tileCol = seat.seatCol
            ch.tileRow = seat.seatRow
            ch.x = seat.seatCol * TILE_SIZE + TILE_SIZE / 2
            ch.y = seat.seatRow * TILE_SIZE + TILE_SIZE / 2
            ch.state = CharacterState.TYPE
            ch.dir = seat.facingDir
            ch.routePhase = null
            ch.routeId = null
            ch.seatTimer = randomRange(ROUTE_REST_MIN_SEC, ROUTE_REST_MAX_SEC)
          }
        } else {
          ch.routePhase = null
          ch.routeId = null
        }
        break
      }

      // Countdown wander timer
      ch.wanderTimer -= dt
      if (ch.wanderTimer <= 0) {
        // Check if we've wandered enough — return to seat for a rest
        if (ch.wanderCount >= ch.wanderLimit && ch.seatId) {
          const seat = seats.get(ch.seatId)
          if (seat) {
            const path = findPath(ch.tileCol, ch.tileRow, seat.seatCol, seat.seatRow, tileMap, blockedTiles)
            if (path.length > 0) {
              ch.path = path
              ch.moveProgress = 0
              ch.state = CharacterState.WALK
              ch.frame = 0
              ch.frameTimer = 0
              break
            }
          }
        }
        if (walkableTiles.length > 0) {
          const target = walkableTiles[Math.floor(Math.random() * walkableTiles.length)]
          const path = findPath(ch.tileCol, ch.tileRow, target.col, target.row, tileMap, blockedTiles)
          if (path.length > 0) {
            ch.path = path
            ch.moveProgress = 0
            ch.state = CharacterState.WALK
            ch.frame = 0
            ch.frameTimer = 0
            ch.wanderCount++
          }
        }
        ch.wanderTimer = randomRange(WANDER_PAUSE_MIN_SEC, WANDER_PAUSE_MAX_SEC)
      }
      break
    }

    case CharacterState.WALK: {
      // Walk animation
      if (ch.frameTimer >= WALK_FRAME_DURATION_SEC) {
        ch.frameTimer -= WALK_FRAME_DURATION_SEC
        ch.frame = (ch.frame + 1) % 4
      }

      if (ch.path.length === 0) {
        // Path complete — snap to tile center and transition
        const center = tileCenter(ch.tileCol, ch.tileRow)
        ch.x = center.x
        ch.y = center.y

        if (ch.isActive) {
          if (!ch.seatId) {
            // No seat — type in place
            ch.state = CharacterState.TYPE
          } else {
            const seat = seats.get(ch.seatId)
            if (seat && ch.tileCol === seat.seatCol && ch.tileRow === seat.seatRow) {
              ch.state = CharacterState.TYPE
              ch.dir = seat.facingDir
            } else {
              ch.state = CharacterState.IDLE
            }
          }
        } else if (ch.routePhase && ch.routePhase !== 'pausing') {
          // Route waypoint arrival
          handleRouteArrival(ch, seats, routes ?? [])
        } else {
          // Check if arrived at assigned seat — sit down for a rest before wandering again
          if (ch.seatId) {
            const seat = seats.get(ch.seatId)
            if (seat && ch.tileCol === seat.seatCol && ch.tileRow === seat.seatRow) {
              ch.state = CharacterState.TYPE
              ch.dir = seat.facingDir
              // seatTimer < 0 is a sentinel from setAgentActive(false) meaning
              // "turn just ended" — skip the long rest so idle transition is immediate
              if (ch.seatTimer < 0) {
                ch.seatTimer = 0
              } else {
                ch.seatTimer = randomRange(SEAT_REST_MIN_SEC, SEAT_REST_MAX_SEC)
              }
              ch.wanderCount = 0
              ch.wanderLimit = randomInt(WANDER_MOVES_BEFORE_REST_MIN, WANDER_MOVES_BEFORE_REST_MAX)
              ch.frame = 0
              ch.frameTimer = 0
              break
            }
          }
          ch.state = CharacterState.IDLE
          ch.wanderTimer = randomRange(WANDER_PAUSE_MIN_SEC, WANDER_PAUSE_MAX_SEC)
        }
        ch.frame = 0
        ch.frameTimer = 0
        break
      }

      // Move toward next tile in path
      const nextTile = ch.path[0]
      ch.dir = directionBetween(ch.tileCol, ch.tileRow, nextTile.col, nextTile.row)

      ch.moveProgress += (WALK_SPEED_PX_PER_SEC / TILE_SIZE) * dt

      const fromCenter = tileCenter(ch.tileCol, ch.tileRow)
      const toCenter = tileCenter(nextTile.col, nextTile.row)
      const t = Math.min(ch.moveProgress, 1)
      ch.x = fromCenter.x + (toCenter.x - fromCenter.x) * t
      ch.y = fromCenter.y + (toCenter.y - fromCenter.y) * t

      if (ch.moveProgress >= 1) {
        // Arrived at next tile
        ch.tileCol = nextTile.col
        ch.tileRow = nextTile.row
        ch.x = toCenter.x
        ch.y = toCenter.y
        ch.path.shift()
        ch.moveProgress = 0
      }

      // If became active while wandering/walking route, repath to seat
      if (ch.isActive && ch.seatId) {
        if (ch.routePhase) {
          ch.routePhase = null
          ch.routeId = null
        }
        const seat = seats.get(ch.seatId)
        if (seat) {
          const lastStep = ch.path[ch.path.length - 1]
          if (!lastStep || lastStep.col !== seat.seatCol || lastStep.row !== seat.seatRow) {
            const newPath = findPath(ch.tileCol, ch.tileRow, seat.seatCol, seat.seatRow, tileMap, blockedTiles)
            if (newPath.length > 0) {
              ch.path = newPath
              ch.moveProgress = 0
            }
          }
        }
      }
      break
    }
  }
}

/** Start the returning phase — walk back from final waypoint toward entry point */
function startRouteReturn(ch: Character, routes: WalkRoute[]): void {
  ch.routePhase = 'returning'
  ch.currentTool = null // clear any reading tool from pause
  const route = routes.find(r => r.id === ch.routeId)
  // Walk back toward entry waypoint; if entry is at/near last wp, go straight to seat
  const returnTarget = route ? route.waypoints.length - 2 : -1
  if (route && returnTarget >= ch.routeEntryIndex) {
    ch.routeWaypointIndex = returnTarget
    const wp = route.waypoints[ch.routeWaypointIndex]
    const path = directPath(
      Math.round(ch.tileCol), Math.round(ch.tileRow),
      Math.round(wp.col), Math.round(wp.row),
    )
    if (path.length > 0) {
      ch.path = path
      ch.moveProgress = 0
      ch.state = CharacterState.WALK
      ch.frame = 0
      ch.frameTimer = 0
    } else {
      ch.routePhase = 'toSeat'
      ch.state = CharacterState.IDLE
    }
  } else {
    ch.routePhase = 'toSeat'
    ch.state = CharacterState.IDLE
  }
}

/** Handle arrival at a route waypoint — advance, pause, or return */
function handleRouteArrival(
  ch: Character,
  seats: Map<string, Seat>,
  routes: WalkRoute[],
): void {
  const route = routes.find(r => r.id === ch.routeId)
  if (!route) {
    ch.routePhase = 'toSeat'
    ch.state = CharacterState.IDLE
    return
  }

  switch (ch.routePhase) {
    case 'toRoute':
    case 'onRoute': {
      const nextIdx = ch.routeWaypointIndex + 1
      if (nextIdx >= route.waypoints.length) {
        // Reached final waypoint — pause with configured action
        ch.routePhase = 'pausing'
        ch.routePauseTimer = randomRange(ROUTE_PAUSE_MIN_SEC, ROUTE_PAUSE_MAX_SEC)
        ch.frame = 0
        ch.frameTimer = 0
        if (route.pauseDir !== undefined) ch.dir = route.pauseDir
        if (route.pauseAction === 'typing') {
          ch.state = CharacterState.TYPE
          ch.currentTool = null
        } else if (route.pauseAction === 'reading') {
          ch.state = CharacterState.TYPE
          ch.currentTool = 'Read' // triggers reading animation
        } else {
          ch.state = CharacterState.IDLE // standing (default)
        }
      } else {
        ch.routePhase = 'onRoute'
        ch.routeWaypointIndex = nextIdx
        const wp = route.waypoints[nextIdx]
        const path = directPath(
          Math.round(ch.tileCol), Math.round(ch.tileRow),
          Math.round(wp.col), Math.round(wp.row),
        )
        if (path.length > 0) {
          ch.path = path
          ch.moveProgress = 0
        } else {
          // Skip unreachable waypoint — try next
          handleRouteArrival(ch, seats, routes)
        }
      }
      break
    }
    case 'returning': {
      const prevIdx = ch.routeWaypointIndex - 1
      if (prevIdx < ch.routeEntryIndex) {
        // Back at entry point — go to seat
        ch.routePhase = 'toSeat'
        ch.state = CharacterState.IDLE
      } else {
        ch.routeWaypointIndex = prevIdx
        const wp = route.waypoints[prevIdx]
        const path = directPath(
          Math.round(ch.tileCol), Math.round(ch.tileRow),
          Math.round(wp.col), Math.round(wp.row),
        )
        if (path.length > 0) {
          ch.path = path
          ch.moveProgress = 0
        } else {
          handleRouteArrival(ch, seats, routes)
        }
      }
      break
    }
    case 'toSeat': {
      const seat = ch.seatId ? seats.get(ch.seatId) : null
      if (seat) {
        ch.tileCol = seat.seatCol
        ch.tileRow = seat.seatRow
        ch.x = seat.seatCol * TILE_SIZE + TILE_SIZE / 2
        ch.y = seat.seatRow * TILE_SIZE + TILE_SIZE / 2
        ch.state = CharacterState.TYPE
        ch.dir = seat.facingDir
      } else {
        ch.state = CharacterState.IDLE
      }
      ch.routePhase = null
      ch.routeId = null
      ch.seatTimer = randomRange(ROUTE_REST_MIN_SEC, ROUTE_REST_MAX_SEC)
      break
    }
  }
}

/** Get the correct sprite frame for a character's current state and direction */
export function getCharacterSprite(ch: Character, sprites: CharacterSprites): SpriteData {
  switch (ch.state) {
    case CharacterState.TYPE:
      if (!ch.currentTool && ch.defaultAction === 'standing') {
        return sprites.walk[ch.dir][1]
      }
      if (isReadingTool(ch.currentTool) || (!ch.currentTool && ch.defaultAction === 'reading')) {
        return sprites.reading[ch.dir][ch.frame % 2]
      }
      return sprites.typing[ch.dir][ch.frame % 2]
    case CharacterState.WALK:
      return sprites.walk[ch.dir][ch.frame % 4]
    case CharacterState.IDLE:
      return sprites.walk[ch.dir][1]
    default:
      return sprites.walk[ch.dir][1]
  }
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}
