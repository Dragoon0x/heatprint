// ═══════════════════════════════════════════
// HEATPRINT — Interaction Tracker
// ═══════════════════════════════════════════

import type { Interaction, InteractionType, HeatprintConfig } from '../types'

export class Tracker {
  private interactions: Interaction[] = []
  private config: HeatprintConfig
  private active = false
  private lastMoveTime = 0
  private lastMoveX = 0
  private lastMoveY = 0
  private hoverTimer: ReturnType<typeof setTimeout> | null = null
  private startTime = 0

  private boundClick: ((e: MouseEvent) => void) | null = null
  private boundMove: ((e: MouseEvent) => void) | null = null
  private boundScroll: (() => void) | null = null
  private boundTouch: ((e: TouchEvent) => void) | null = null

  constructor(config: HeatprintConfig) {
    this.config = config
  }

  start(): void {
    if (this.active || typeof window === 'undefined') return
    this.active = true
    this.startTime = Date.now()

    if (this.config.trackClicks !== false) {
      this.boundClick = (e: MouseEvent) => this.onClick(e)
      window.addEventListener('click', this.boundClick, { passive: true })
    }

    if (this.config.trackMoves !== false) {
      this.boundMove = (e: MouseEvent) => this.onMove(e)
      window.addEventListener('mousemove', this.boundMove, { passive: true })
    }

    if (this.config.trackScrolls !== false) {
      this.boundScroll = () => this.onScroll()
      window.addEventListener('scroll', this.boundScroll, { passive: true })
    }

    this.boundTouch = (e: TouchEvent) => this.onTouch(e)
    window.addEventListener('touchstart', this.boundTouch, { passive: true })
  }

  stop(): void {
    this.active = false
    if (this.boundClick) window.removeEventListener('click', this.boundClick)
    if (this.boundMove) window.removeEventListener('mousemove', this.boundMove)
    if (this.boundScroll) window.removeEventListener('scroll', this.boundScroll)
    if (this.boundTouch) window.removeEventListener('touchstart', this.boundTouch)
    if (this.hoverTimer) clearTimeout(this.hoverTimer)
  }

  isActive(): boolean { return this.active }

  getInteractions(): Interaction[] { return this.interactions }

  getInteractionsByType(type: InteractionType): Interaction[] {
    return this.interactions.filter(i => i.type === type)
  }

  clear(): void { this.interactions = [] }

  getStats() {
    const clicks = this.interactions.filter(i => i.type === 'click').length
    const moves = this.interactions.filter(i => i.type === 'move').length
    const scrolls = this.interactions.filter(i => i.type === 'scroll').length
    const hovers = this.interactions.filter(i => i.type === 'hover').length

    // Find hotspots (cluster centers)
    const hotspots = this.findHotspots()

    // Average velocity
    const velocities = this.interactions.filter(i => i.velocity > 0).map(i => i.velocity)
    const avgVelocity = velocities.length > 0
      ? velocities.reduce((s, v) => s + v, 0) / velocities.length : 0

    return {
      totalInteractions: this.interactions.length,
      clicks, moves, scrolls, hovers,
      hotspots,
      averageVelocity: Math.round(avgVelocity * 100) / 100,
      duration: Date.now() - this.startTime,
    }
  }

  // Add interaction programmatically (for replays, imports)
  addInteraction(interaction: Interaction): void {
    this.interactions.push(interaction)
    this.trimIfNeeded()
  }

  importData(data: Interaction[]): void {
    for (const item of data) {
      this.interactions.push(item)
    }
    this.trimIfNeeded()
  }

  exportData(): string {
    return JSON.stringify(this.interactions)
  }

  // ─── Internal Handlers ──────────────────

  private onClick(e: MouseEvent): void {
    this.push({
      x: e.clientX, y: e.clientY,
      type: 'click', timestamp: Date.now(),
      duration: 0, intensity: 1, velocity: 0,
    })
  }

  private onMove(e: MouseEvent): void {
    const now = Date.now()
    const rate = this.config.sampleRate || 50
    if (now - this.lastMoveTime < rate) return

    const dx = e.clientX - this.lastMoveX
    const dy = e.clientY - this.lastMoveY
    const dt = now - this.lastMoveTime
    const velocity = dt > 0 ? Math.sqrt(dx * dx + dy * dy) / dt : 0

    this.push({
      x: e.clientX, y: e.clientY,
      type: 'move', timestamp: now,
      duration: 0,
      intensity: Math.min(1, velocity * 2),
      velocity,
    })

    this.lastMoveX = e.clientX
    this.lastMoveY = e.clientY
    this.lastMoveTime = now

    // Hover detection
    if (this.config.trackHovers !== false) {
      if (this.hoverTimer) clearTimeout(this.hoverTimer)
      const hx = e.clientX, hy = e.clientY
      this.hoverTimer = setTimeout(() => {
        this.push({
          x: hx, y: hy,
          type: 'hover', timestamp: Date.now(),
          duration: this.config.hoverThreshold || 500,
          intensity: 0.6, velocity: 0,
        })
      }, this.config.hoverThreshold || 500)
    }
  }

  private onScroll(): void {
    const now = Date.now()
    if (now - this.lastMoveTime < 100) return

    this.push({
      x: window.innerWidth / 2,
      y: window.scrollY + window.innerHeight / 2,
      type: 'scroll', timestamp: now,
      duration: 0, intensity: 0.3, velocity: 0,
    })
  }

  private onTouch(e: TouchEvent): void {
    const touch = e.touches[0]
    if (!touch) return
    this.push({
      x: touch.clientX, y: touch.clientY,
      type: 'touch', timestamp: Date.now(),
      duration: 0, intensity: 1, velocity: 0,
    })
  }

  private push(interaction: Interaction): void {
    this.interactions.push(interaction)
    this.trimIfNeeded()
  }

  private trimIfNeeded(): void {
    const max = this.config.maxInteractions || 10000
    if (this.interactions.length > max) {
      this.interactions = this.interactions.slice(-max)
    }
  }

  private findHotspots(): { x: number; y: number; intensity: number }[] {
    if (this.interactions.length < 5) return []

    // Simple grid-based density clustering
    const cellSize = 50
    const grid = new Map<string, { x: number; y: number; count: number; totalIntensity: number }>()

    for (const i of this.interactions) {
      const gx = Math.floor(i.x / cellSize)
      const gy = Math.floor(i.y / cellSize)
      const key = `${gx},${gy}`
      const cell = grid.get(key)
      if (cell) {
        cell.count++
        cell.totalIntensity += i.intensity
        cell.x = (cell.x * (cell.count - 1) + i.x) / cell.count
        cell.y = (cell.y * (cell.count - 1) + i.y) / cell.count
      } else {
        grid.set(key, { x: i.x, y: i.y, count: 1, totalIntensity: i.intensity })
      }
    }

    // Top 5 cells by density
    const cells = Array.from(grid.values()).sort((a, b) => b.count - a.count).slice(0, 5)
    const maxCount = cells[0]?.count || 1

    return cells.map(c => ({
      x: Math.round(c.x),
      y: Math.round(c.y),
      intensity: Math.round((c.count / maxCount) * 100) / 100,
    }))
  }
}
