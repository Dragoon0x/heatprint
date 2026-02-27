import type { InteractionData, Point, ClickEvent, ScrollFrame, TrackerOptions } from '../types'
import { DEFAULTS } from '../types'

/**
 * InteractionTracker
 *
 * Silently records cursor movement, clicks, and scroll depth.
 * All coordinates are normalized to 0-1 by default.
 * Lightweight. No DOM injection. No visual output.
 */
export class InteractionTracker {
  private moves: Point[] = []
  private clicks: ClickEvent[] = []
  private scrolls: ScrollFrame[] = []
  private startedAt = 0
  private isRecording = false

  private options: Required<TrackerOptions>
  private target: HTMLElement | Document

  // Throttle state
  private lastMoveTime = 0

  // Click duration tracking
  private mouseDownTime = 0
  private mouseDownPos = { x: 0, y: 0 }

  // Scroll state
  private lastScrollY = 0
  private lastScrollTime = 0

  // Bound handlers (for cleanup)
  private boundMove: (e: MouseEvent | TouchEvent) => void
  private boundDown: (e: MouseEvent | TouchEvent) => void
  private boundUp: (e: MouseEvent | TouchEvent) => void
  private boundScroll: () => void

  constructor(opts: Partial<TrackerOptions> = {}) {
    this.options = {
      throttle: opts.throttle ?? DEFAULTS.throttle,
      maxPoints: opts.maxPoints ?? DEFAULTS.maxPoints,
      trackScroll: opts.trackScroll ?? true,
      trackClicks: opts.trackClicks ?? true,
      trackMoves: opts.trackMoves ?? true,
      target: opts.target ?? null,
      normalize: opts.normalize ?? true,
    }

    this.target = this.options.target || document

    this.boundMove = this.handleMove.bind(this)
    this.boundDown = this.handleDown.bind(this)
    this.boundUp = this.handleUp.bind(this)
    this.boundScroll = this.handleScroll.bind(this)
  }

  /** Start recording interactions */
  start(): void {
    if (this.isRecording) return
    this.isRecording = true
    this.startedAt = Date.now()
    this.lastScrollY = window.scrollY

    const t = this.target
    if (this.options.trackMoves) {
      t.addEventListener('mousemove', this.boundMove as EventListener, { passive: true })
      t.addEventListener('touchmove', this.boundMove as EventListener, { passive: true })
    }
    if (this.options.trackClicks) {
      t.addEventListener('mousedown', this.boundDown as EventListener, { passive: true })
      t.addEventListener('mouseup', this.boundUp as EventListener, { passive: true })
      t.addEventListener('touchstart', this.boundDown as EventListener, { passive: true })
      t.addEventListener('touchend', this.boundUp as EventListener, { passive: true })
    }
    if (this.options.trackScroll) {
      window.addEventListener('scroll', this.boundScroll, { passive: true })
    }
  }

  /** Stop recording */
  stop(): void {
    if (!this.isRecording) return
    this.isRecording = false

    const t = this.target
    t.removeEventListener('mousemove', this.boundMove as EventListener)
    t.removeEventListener('touchmove', this.boundMove as EventListener)
    t.removeEventListener('mousedown', this.boundDown as EventListener)
    t.removeEventListener('mouseup', this.boundUp as EventListener)
    t.removeEventListener('touchstart', this.boundDown as EventListener)
    t.removeEventListener('touchend', this.boundUp as EventListener)
    window.removeEventListener('scroll', this.boundScroll)
  }

  /** Clear all recorded data */
  reset(): void {
    this.moves = []
    this.clicks = []
    this.scrolls = []
    this.startedAt = Date.now()
  }

  /** Get a snapshot of all recorded data */
  getData(): InteractionData {
    return {
      moves: [...this.moves],
      clicks: [...this.clicks],
      scrolls: [...this.scrolls],
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      docHeight: document.documentElement.scrollHeight,
      duration: Date.now() - this.startedAt,
      startedAt: this.startedAt,
    }
  }

  /** Get raw move count */
  get moveCount(): number {
    return this.moves.length
  }

  /** Get raw click count */
  get clickCount(): number {
    return this.clicks.length
  }

  // ─── Private Handlers ────────────────────────────────

  private getCoords(e: MouseEvent | TouchEvent): { x: number; y: number } {
    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX
    const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY

    if (this.options.normalize) {
      return {
        x: clientX / window.innerWidth,
        y: (clientY + window.scrollY) / document.documentElement.scrollHeight,
      }
    }
    return { x: clientX, y: clientY + window.scrollY }
  }

  private handleMove(e: MouseEvent | TouchEvent): void {
    const now = Date.now()
    if (now - this.lastMoveTime < this.options.throttle) return
    this.lastMoveTime = now

    const { x, y } = this.getCoords(e)
    this.moves.push({ x, y, t: now - this.startedAt })

    // Prune if over limit
    if (this.moves.length > this.options.maxPoints) {
      // Keep every other point in the oldest half
      const half = Math.floor(this.moves.length / 2)
      const pruned = []
      for (let i = 0; i < half; i += 2) {
        pruned.push(this.moves[i])
      }
      this.moves = pruned.concat(this.moves.slice(half))
    }
  }

  private handleDown(e: MouseEvent | TouchEvent): void {
    const { x, y } = this.getCoords(e)
    this.mouseDownTime = Date.now()
    this.mouseDownPos = { x, y }
  }

  private handleUp(e: MouseEvent | TouchEvent): void {
    if (this.mouseDownTime === 0) return
    const duration = Date.now() - this.mouseDownTime
    this.clicks.push({
      ...this.mouseDownPos,
      t: this.mouseDownTime - this.startedAt,
      duration,
    })
    this.mouseDownTime = 0
  }

  private handleScroll(): void {
    const now = Date.now()
    const scrollY = window.scrollY
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight
    const depth = maxScroll > 0 ? scrollY / maxScroll : 0
    const dt = now - this.lastScrollTime
    const velocity = dt > 0 ? (scrollY - this.lastScrollY) / dt : 0

    this.scrolls.push({
      depth,
      t: now - this.startedAt,
      velocity,
    })

    this.lastScrollY = scrollY
    this.lastScrollTime = now

    // Keep scrolls trimmed
    if (this.scrolls.length > 5000) {
      this.scrolls = this.scrolls.slice(-3000)
    }
  }

  /** Destroy the tracker and free resources */
  destroy(): void {
    this.stop()
    this.reset()
  }
}
