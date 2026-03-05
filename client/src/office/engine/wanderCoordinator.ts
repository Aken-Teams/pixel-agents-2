import { CharacterState, TILE_SIZE } from '../types.js'
import type { Character, Seat, WalkRoute, TileType as TileTypeVal } from '../types.js'
import {
  MAX_ROUTE_WALKERS,
  ROUTE_STAGGER_MIN_SEC,
  ROUTE_STAGGER_MAX_SEC,
  ROUTE_REST_MIN_SEC,
  ROUTE_REST_MAX_SEC,
  ROUTE_MAX_PICKUP_DIST,
} from '../../constants.js'

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/** Manhattan distance from a point to the nearest waypoint on a route */
function minWaypointDist(route: WalkRoute, col: number, row: number): number {
  let best = Infinity
  for (const wp of route.waypoints) {
    const d = Math.abs(wp.col - col) + Math.abs(wp.row - row)
    if (d < best) best = d
  }
  return best
}

/** Generate a straight-line tile path between two points (Bresenham-style).
 *  Used instead of BFS for static backgrounds where tileMap has no wall data. */
export function directPath(
  fromCol: number, fromRow: number,
  toCol: number, toRow: number,
): Array<{ col: number; row: number }> {
  const dx = toCol - fromCol
  const dy = toRow - fromRow
  const steps = Math.max(Math.abs(dx), Math.abs(dy))
  if (steps === 0) return []
  const path: Array<{ col: number; row: number }> = []
  for (let i = 1; i <= steps; i++) {
    path.push({
      col: Math.round(fromCol + (dx * i) / steps),
      row: Math.round(fromRow + (dy * i) / steps),
    })
  }
  return path
}

export class WanderCoordinator {
  private activeWalkers = new Set<number>()
  private staggerTimer = 0
  private routes: WalkRoute[] = []
  private pickIndex = 0

  setRoutes(routes: WalkRoute[]): void {
    this.routes = routes
  }

  reset(): void {
    this.activeWalkers.clear()
    this.staggerTimer = 0
    this.pickIndex = 0
  }

  removeWalker(id: number): void {
    this.activeWalkers.delete(id)
  }

  getActiveWalkerIds(): Set<number> {
    return this.activeWalkers
  }

  update(
    dt: number,
    characters: Map<number, Character>,
    seats: Map<string, Seat>,
    _tileMap: TileTypeVal[][],
    _blockedTiles: Set<string>,
  ): void {
    if (this.routes.length === 0) return

    // 1. Cleanup: remove walkers that are gone, active, or finished their route
    for (const id of [...this.activeWalkers]) {
      const ch = characters.get(id)
      if (!ch || ch.isActive || ch.routePhase === null) {
        this.activeWalkers.delete(id)
      }
    }

    // 2. Tick stagger timer
    if (this.staggerTimer > 0) {
      this.staggerTimer -= dt
      return
    }

    // 3. Dispatch new walker if under limit
    if (this.activeWalkers.size >= MAX_ROUTE_WALKERS) return

    // Find eligible candidates
    const candidates: Character[] = []
    for (const ch of characters.values()) {
      if (
        !ch.isActive &&
        !ch.isSubagent &&
        ch.seatId &&
        ch.routePhase === null &&
        ch.state === CharacterState.TYPE &&
        ch.seatTimer <= 0
      ) {
        candidates.push(ch)
      }
    }
    if (candidates.length === 0) return

    // Round-robin pick
    this.pickIndex = this.pickIndex % candidates.length
    const picked = candidates[this.pickIndex]
    this.pickIndex = (this.pickIndex + 1) % candidates.length

    // Pick a route: prefer unused, closest to the character's seat
    const usedRouteIds = new Set<string>()
    for (const id of this.activeWalkers) {
      const ch = characters.get(id)
      if (ch?.routeId) usedRouteIds.add(ch.routeId)
    }

    const seatCol = Math.round(picked.tileCol)
    const seatRow = Math.round(picked.tileRow)
    // Only consider routes within pickup distance
    const nearbyRoutes = this.routes
      .filter(r => !usedRouteIds.has(r.id) && minWaypointDist(r, seatCol, seatRow) <= ROUTE_MAX_PICKUP_DIST)
    let route: WalkRoute | undefined
    if (nearbyRoutes.length > 0) {
      // Randomly pick from all nearby unused routes
      route = nearbyRoutes[Math.floor(Math.random() * nearbyRoutes.length)]
    } else {
      // All nearby routes in use — pick randomly from nearby (including in-use)
      const nearbyAll = this.routes
        .filter(r => minWaypointDist(r, seatCol, seatRow) <= ROUTE_MAX_PICKUP_DIST)
      if (nearbyAll.length > 0) {
        route = nearbyAll[Math.floor(Math.random() * nearbyAll.length)]
      }
    }

    // Assign route (skip if nothing nearby)
    if (route && this.assignRoute(picked, route, seats)) {
      this.activeWalkers.add(picked.id)
      this.staggerTimer = randomRange(ROUTE_STAGGER_MIN_SEC, ROUTE_STAGGER_MAX_SEC)
    }
  }

  private assignRoute(
    ch: Character,
    route: WalkRoute,
    seats: Map<string, Seat>,
  ): boolean {
    if (route.waypoints.length === 0) return false

    const startCol = Math.round(ch.tileCol)
    const startRow = Math.round(ch.tileRow)

    // Find nearest waypoint on this route (allows mid-route entry)
    let nearestIdx = 0
    let nearestDist = Infinity
    for (let i = 0; i < route.waypoints.length; i++) {
      const d = Math.abs(route.waypoints[i].col - startCol) + Math.abs(route.waypoints[i].row - startRow)
      if (d < nearestDist) {
        nearestDist = d
        nearestIdx = i
      }
    }

    const wp = route.waypoints[nearestIdx]
    const path = directPath(startCol, startRow, Math.round(wp.col), Math.round(wp.row))

    ch.routeId = route.id
    ch.routePhase = 'toRoute'
    ch.routeWaypointIndex = nearestIdx
    ch.routeEntryIndex = nearestIdx
    ch.routeReturning = false
    ch.routePauseTimer = 0

    if (path.length > 0) {
      ch.path = path
      ch.moveProgress = 0
      ch.state = CharacterState.WALK
      ch.frame = 0
      ch.frameTimer = 0
      // Snap to integer tile center before walking (from fractional seat position)
      ch.tileCol = startCol
      ch.tileRow = startRow
      ch.x = startCol * TILE_SIZE + TILE_SIZE / 2
      ch.y = startRow * TILE_SIZE + TILE_SIZE / 2
    } else {
      // Already at entry waypoint — advance to onRoute phase
      ch.routePhase = 'onRoute'
      ch.state = CharacterState.IDLE
    }

    return true
  }
}
