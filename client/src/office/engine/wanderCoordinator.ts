import { CharacterState, TILE_SIZE } from '../types.js'
import type { Character, Seat, WalkRoute, TileType as TileTypeVal } from '../types.js'
import { findPath } from '../layout/tileMap.js'
import {
  MAX_ROUTE_WALKERS,
  ROUTE_STAGGER_MIN_SEC,
  ROUTE_STAGGER_MAX_SEC,
  ROUTE_REST_MIN_SEC,
  ROUTE_REST_MAX_SEC,
} from '../../constants.js'

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
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
    tileMap: TileTypeVal[][],
    blockedTiles: Set<string>,
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

    // Pick a route not currently in use by another walker (prefer unique routes)
    const usedRouteIds = new Set<string>()
    for (const id of this.activeWalkers) {
      const ch = characters.get(id)
      if (ch?.routeId) usedRouteIds.add(ch.routeId)
    }
    let route = this.routes.find(r => !usedRouteIds.has(r.id))
    if (!route) {
      // All routes in use — pick random
      route = this.routes[Math.floor(Math.random() * this.routes.length)]
    }

    // Assign route
    if (this.assignRoute(picked, route, tileMap, blockedTiles, seats)) {
      this.activeWalkers.add(picked.id)
      this.staggerTimer = randomRange(ROUTE_STAGGER_MIN_SEC, ROUTE_STAGGER_MAX_SEC)
    }
  }

  private assignRoute(
    ch: Character,
    route: WalkRoute,
    tileMap: TileTypeVal[][],
    blockedTiles: Set<string>,
    seats: Map<string, Seat>,
  ): boolean {
    if (route.waypoints.length === 0) return false

    const wp = route.waypoints[0]
    // BFS from character's current position (rounded for fractional seat coords) to first waypoint
    const startCol = Math.round(ch.tileCol)
    const startRow = Math.round(ch.tileRow)

    // Temporarily unblock own seat for pathfinding
    const seatKey = ch.seatId ? `${Math.round(seats.get(ch.seatId)!.seatCol)},${Math.round(seats.get(ch.seatId)!.seatRow)}` : null
    if (seatKey) blockedTiles.delete(seatKey)
    const path = findPath(startCol, startRow, Math.round(wp.col), Math.round(wp.row), tileMap, blockedTiles)
    if (seatKey) blockedTiles.add(seatKey)

    if (path.length === 0 && (startCol !== Math.round(wp.col) || startRow !== Math.round(wp.row))) {
      // Can't reach first waypoint — skip
      ch.seatTimer = randomRange(ROUTE_REST_MIN_SEC, ROUTE_REST_MAX_SEC)
      return false
    }

    ch.routeId = route.id
    ch.routePhase = 'toRoute'
    ch.routeWaypointIndex = 0
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
      // Already at first waypoint — advance to onRoute phase
      ch.routePhase = 'onRoute'
      ch.state = CharacterState.IDLE
    }

    return true
  }
}
