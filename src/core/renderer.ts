// ═══════════════════════════════════════════
// HEATPRINT — Renderer
// ═══════════════════════════════════════════
// 8 visualization modes. All render to a canvas.

import type { Interaction, RenderMode, HeatprintConfig } from '../types'
import { getPalette, interpolateColor } from '../utils/palettes'

export class Renderer {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private width: number
  private height: number
  private config: HeatprintConfig

  constructor(config: HeatprintConfig) {
    this.config = config
    this.width = config.width || (typeof window !== 'undefined' ? window.innerWidth : 1440)
    this.height = config.height || (typeof window !== 'undefined' ? window.innerHeight : 900)
  }

  createCanvas(): HTMLCanvasElement {
    if (typeof document === 'undefined') throw new Error('No DOM available')
    this.canvas = document.createElement('canvas')
    this.canvas.width = this.width
    this.canvas.height = this.height
    this.ctx = this.canvas.getContext('2d')
    return this.canvas
  }

  setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas
    this.width = canvas.width
    this.height = canvas.height
    this.ctx = canvas.getContext('2d')
  }

  render(interactions: Interaction[], mode?: RenderMode): HTMLCanvasElement {
    if (!this.canvas) this.createCanvas()
    const ctx = this.ctx!
    const m = mode || this.config.mode || 'heatmap'

    // Clear with background
    ctx.fillStyle = this.config.background || '#09090f'
    ctx.fillRect(0, 0, this.width, this.height)

    if (interactions.length === 0) return this.canvas!

    switch (m) {
      case 'heatmap': this.renderHeatmap(ctx, interactions); break
      case 'constellation': this.renderConstellation(ctx, interactions); break
      case 'flowfield': this.renderFlowfield(ctx, interactions); break
      case 'topographic': this.renderTopographic(ctx, interactions); break
      case 'trails': this.renderTrails(ctx, interactions); break
      case 'aurora': this.renderAurora(ctx, interactions); break
      case 'rings': this.renderRings(ctx, interactions); break
      case 'mesh': this.renderMesh(ctx, interactions); break
    }

    return this.canvas!
  }

  exportPNG(): string {
    if (!this.canvas) return ''
    return this.canvas.toDataURL('image/png')
  }

  getCanvas(): HTMLCanvasElement | null { return this.canvas }

  // ─── Heatmap ────────────────────────────

  private renderHeatmap(ctx: CanvasRenderingContext2D, interactions: Interaction[]): void {
    const colors = getPalette(this.config.palette, this.config.colors)
    const blur = this.config.blur || 20

    // Build density grid
    const cellSize = 4
    const cols = Math.ceil(this.width / cellSize)
    const rows = Math.ceil(this.height / cellSize)
    const density = new Float32Array(cols * rows)

    for (const i of interactions) {
      const cx = Math.floor(i.x / cellSize)
      const cy = Math.floor(i.y / cellSize)
      const weight = i.type === 'click' ? 3 : i.type === 'hover' ? 2 : 1
      const radius = Math.ceil(blur / cellSize)

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const gx = cx + dx, gy = cy + dy
          if (gx < 0 || gx >= cols || gy < 0 || gy >= rows) continue
          const dist = Math.sqrt(dx * dx + dy * dy) / radius
          if (dist > 1) continue
          const falloff = 1 - dist * dist
          density[gy * cols + gx] += falloff * weight * i.intensity
        }
      }
    }

    // Find max
    let maxDensity = 0
    for (let i = 0; i < density.length; i++) {
      if (density[i] > maxDensity) maxDensity = density[i]
    }
    if (maxDensity === 0) return

    // Render pixels
    const imageData = ctx.createImageData(this.width, this.height)
    const bg = { r: 9, g: 9, b: 15 }

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const gx = Math.floor(x / cellSize)
        const gy = Math.floor(y / cellSize)
        const d = density[gy * cols + gx] / maxDensity
        const idx = (y * this.width + x) * 4

        if (d > 0.01) {
          const c = interpolateColor(colors, d)
          const alpha = Math.min(1, d * 2)
          imageData.data[idx]     = Math.round(bg.r * (1 - alpha) + c.r * alpha)
          imageData.data[idx + 1] = Math.round(bg.g * (1 - alpha) + c.g * alpha)
          imageData.data[idx + 2] = Math.round(bg.b * (1 - alpha) + c.b * alpha)
          imageData.data[idx + 3] = 255
        } else {
          imageData.data[idx] = bg.r
          imageData.data[idx + 1] = bg.g
          imageData.data[idx + 2] = bg.b
          imageData.data[idx + 3] = 255
        }
      }
    }
    ctx.putImageData(imageData, 0, 0)
  }

  // ─── Constellation ──────────────────────

  private renderConstellation(ctx: CanvasRenderingContext2D, interactions: Interaction[]): void {
    const colors = getPalette(this.config.palette, this.config.colors)
    const maxDist = this.config.connectionDistance || 120
    const r = this.config.pointRadius || 3
    const opacity = this.config.opacity || 0.8

    // Draw connections first
    ctx.lineWidth = this.config.lineWidth || 0.5
    for (let i = 0; i < interactions.length; i++) {
      for (let j = i + 1; j < Math.min(i + 20, interactions.length); j++) {
        const a = interactions[i], b = interactions[j]
        const dx = a.x - b.x, dy = a.y - b.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < maxDist) {
          const t = 1 - dist / maxDist
          const c = interpolateColor(colors, (a.intensity + b.intensity) / 2)
          ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${t * 0.3})`
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }
    }

    // Draw points
    for (const i of interactions) {
      const c = interpolateColor(colors, i.intensity)
      const size = i.type === 'click' ? r * 2.5 : i.type === 'hover' ? r * 1.5 : r

      // Glow
      ctx.beginPath()
      ctx.arc(i.x, i.y, size * 3, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${0.08 * opacity})`
      ctx.fill()

      // Point
      ctx.beginPath()
      ctx.arc(i.x, i.y, size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${opacity})`
      ctx.fill()
    }
  }

  // ─── Flow Field ─────────────────────────

  private renderFlowfield(ctx: CanvasRenderingContext2D, interactions: Interaction[]): void {
    const colors = getPalette(this.config.palette, this.config.colors)
    const moves = interactions.filter(i => i.type === 'move')
    if (moves.length < 2) { this.renderConstellation(ctx, interactions); return }

    ctx.lineWidth = 1.5
    ctx.lineCap = 'round'

    for (let i = 1; i < moves.length; i++) {
      const prev = moves[i - 1], curr = moves[i]
      const dx = curr.x - prev.x, dy = curr.y - prev.y
      const len = Math.sqrt(dx * dx + dy * dy)
      if (len < 2 || len > 200) continue

      const t = Math.min(1, curr.velocity * 3)
      const c = interpolateColor(colors, t)

      ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},0.6)`
      ctx.beginPath()
      ctx.moveTo(prev.x, prev.y)

      // Smooth curve using mid-control points
      const mx = (prev.x + curr.x) / 2
      const my = (prev.y + curr.y) / 2
      ctx.quadraticCurveTo(prev.x, prev.y, mx, my)
      ctx.stroke()

      // Arrow tips for fast movements
      if (curr.velocity > 0.5 && len > 10) {
        const angle = Math.atan2(dy, dx)
        const arrowLen = Math.min(8, len * 0.3)
        ctx.beginPath()
        ctx.moveTo(curr.x, curr.y)
        ctx.lineTo(curr.x - arrowLen * Math.cos(angle - 0.4), curr.y - arrowLen * Math.sin(angle - 0.4))
        ctx.stroke()
      }
    }
  }

  // ─── Topographic ────────────────────────

  private renderTopographic(ctx: CanvasRenderingContext2D, interactions: Interaction[]): void {
    const colors = getPalette(this.config.palette, this.config.colors)
    const cellSize = 8
    const cols = Math.ceil(this.width / cellSize)
    const rows = Math.ceil(this.height / cellSize)
    const field = new Float32Array(cols * rows)

    // Build elevation field
    for (const i of interactions) {
      const cx = Math.floor(i.x / cellSize)
      const cy = Math.floor(i.y / cellSize)
      const weight = i.type === 'click' ? 5 : i.type === 'hover' ? 3 : 1
      const radius = 12

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const gx = cx + dx, gy = cy + dy
          if (gx < 0 || gx >= cols || gy < 0 || gy >= rows) continue
          const dist = Math.sqrt(dx * dx + dy * dy) / radius
          if (dist > 1) continue
          field[gy * cols + gx] += (1 - dist) * weight * i.intensity
        }
      }
    }

    let maxVal = 0
    for (let i = 0; i < field.length; i++) if (field[i] > maxVal) maxVal = field[i]
    if (maxVal === 0) return

    // Draw contour lines
    const levels = 12
    ctx.lineWidth = 1
    for (let level = 1; level <= levels; level++) {
      const threshold = (level / levels) * maxVal
      const t = level / levels
      const c = interpolateColor(colors, t)
      ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${0.4 + t * 0.4})`

      for (let y = 0; y < rows - 1; y++) {
        for (let x = 0; x < cols - 1; x++) {
          const v = field[y * cols + x]
          const vr = field[y * cols + x + 1]
          const vb = field[(y + 1) * cols + x]

          // Horizontal edge
          if ((v >= threshold) !== (vr >= threshold)) {
            const frac = (threshold - v) / (vr - v)
            const px = (x + frac) * cellSize
            const py = y * cellSize
            ctx.beginPath()
            ctx.arc(px, py, 0.5, 0, Math.PI * 2)
            ctx.stroke()
          }
          // Vertical edge
          if ((v >= threshold) !== (vb >= threshold)) {
            const frac = (threshold - v) / (vb - v)
            const px = x * cellSize
            const py = (y + frac) * cellSize
            ctx.beginPath()
            ctx.arc(px, py, 0.5, 0, Math.PI * 2)
            ctx.stroke()
          }
        }
      }
    }
  }

  // ─── Trails ─────────────────────────────

  private renderTrails(ctx: CanvasRenderingContext2D, interactions: Interaction[]): void {
    const colors = getPalette(this.config.palette, this.config.colors)
    const moves = interactions.filter(i => i.type === 'move' || i.type === 'click')
    if (moves.length < 2) return

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Draw fading trail
    for (let i = 1; i < moves.length; i++) {
      const prev = moves[i - 1], curr = moves[i]
      const dx = curr.x - prev.x, dy = curr.y - prev.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 300) continue // Skip teleports

      const progress = i / moves.length
      const c = interpolateColor(colors, progress)
      const alpha = 0.2 + progress * 0.6
      const width = 1 + curr.intensity * 3

      ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${alpha})`
      ctx.lineWidth = width
      ctx.beginPath()
      ctx.moveTo(prev.x, prev.y)
      ctx.lineTo(curr.x, curr.y)
      ctx.stroke()
    }

    // Click bursts
    const clicks = interactions.filter(i => i.type === 'click')
    for (const click of clicks) {
      const c = interpolateColor(colors, 0.9)
      for (let r = 3; r < 20; r += 4) {
        ctx.beginPath()
        ctx.arc(click.x, click.y, r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${0.4 * (1 - r / 20)})`
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }
  }

  // ─── Aurora ─────────────────────────────

  private renderAurora(ctx: CanvasRenderingContext2D, interactions: Interaction[]): void {
    const colors = getPalette(this.config.palette, this.config.colors)

    // Create flowing bands based on interaction density at different heights
    const bands = 6
    const bandHeight = this.height / bands

    for (let b = 0; b < bands; b++) {
      const yMin = b * bandHeight, yMax = (b + 1) * bandHeight
      const bandInteractions = interactions.filter(i => i.y >= yMin && i.y < yMax)
      const density = bandInteractions.length / Math.max(1, interactions.length)

      if (density < 0.02) continue

      const c = interpolateColor(colors, b / bands)
      const gradient = ctx.createLinearGradient(0, yMin, 0, yMax)
      gradient.addColorStop(0, `rgba(${c.r},${c.g},${c.b},0)`)
      gradient.addColorStop(0.3, `rgba(${c.r},${c.g},${c.b},${density * 2})`)
      gradient.addColorStop(0.7, `rgba(${c.r},${c.g},${c.b},${density * 2})`)
      gradient.addColorStop(1, `rgba(${c.r},${c.g},${c.b},0)`)

      ctx.fillStyle = gradient

      // Wavy shape using interaction x-positions as control points
      ctx.beginPath()
      ctx.moveTo(0, yMin)

      const points = bandInteractions.slice(0, 20).sort((a, b) => a.x - b.x)
      if (points.length > 2) {
        for (let p = 0; p < points.length; p++) {
          const wave = Math.sin(points[p].x * 0.01) * bandHeight * 0.3 * points[p].intensity
          ctx.lineTo(points[p].x, yMin + bandHeight * 0.3 + wave)
        }
      }

      ctx.lineTo(this.width, yMin)
      ctx.lineTo(this.width, yMax)

      if (points.length > 2) {
        for (let p = points.length - 1; p >= 0; p--) {
          const wave = Math.sin(points[p].x * 0.01 + 2) * bandHeight * 0.3 * points[p].intensity
          ctx.lineTo(points[p].x, yMax - bandHeight * 0.3 + wave)
        }
      }

      ctx.lineTo(0, yMax)
      ctx.closePath()
      ctx.fill()
    }
  }

  // ─── Rings ──────────────────────────────

  private renderRings(ctx: CanvasRenderingContext2D, interactions: Interaction[]): void {
    const colors = getPalette(this.config.palette, this.config.colors)
    const clicks = interactions.filter(i => i.type === 'click' || i.type === 'touch')
    const hovers = interactions.filter(i => i.type === 'hover')

    // Concentric rings at click points
    for (let ci = 0; ci < clicks.length; ci++) {
      const click = clicks[ci]
      const c = interpolateColor(colors, ci / Math.max(1, clicks.length - 1))
      const ringCount = 4 + Math.floor(click.intensity * 6)

      for (let r = 1; r <= ringCount; r++) {
        const radius = r * 12
        const alpha = (1 - r / ringCount) * 0.5
        ctx.beginPath()
        ctx.arc(click.x, click.y, radius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${alpha})`
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      // Center dot
      ctx.beginPath()
      ctx.arc(click.x, click.y, 3, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},0.9)`
      ctx.fill()
    }

    // Softer rings for hovers
    for (const hover of hovers) {
      const c = interpolateColor(colors, 0.3)
      ctx.beginPath()
      ctx.arc(hover.x, hover.y, 20, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},0.05)`
      ctx.fill()
    }
  }

  // ─── Mesh ───────────────────────────────

  private renderMesh(ctx: CanvasRenderingContext2D, interactions: Interaction[]): void {
    const colors = getPalette(this.config.palette, this.config.colors)
    const points = interactions.slice(-200) // Limit for performance
    if (points.length < 3) { this.renderConstellation(ctx, interactions); return }

    // Simple triangulation: connect each point to its 3 nearest neighbors
    ctx.lineWidth = 0.5

    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      const distances: { idx: number; dist: number }[] = []

      for (let j = 0; j < points.length; j++) {
        if (i === j) continue
        const dx = p.x - points[j].x, dy = p.y - points[j].y
        distances.push({ idx: j, dist: Math.sqrt(dx * dx + dy * dy) })
      }

      distances.sort((a, b) => a.dist - b.dist)
      const nearest = distances.slice(0, 3)

      for (const n of nearest) {
        if (n.dist > 200) continue
        const q = points[n.idx]
        const t = 1 - n.dist / 200
        const midIntensity = (p.intensity + q.intensity) / 2
        const c = interpolateColor(colors, midIntensity)

        ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${t * 0.3})`
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(q.x, q.y)
        ctx.stroke()
      }

      // Fill triangles with very low opacity
      if (nearest.length >= 2 && nearest[0].dist < 150 && nearest[1].dist < 150) {
        const a = points[nearest[0].idx], b = points[nearest[1].idx]
        const c = interpolateColor(colors, p.intensity)
        ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},0.03)`
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.closePath()
        ctx.fill()
      }
    }

    // Draw points on top
    for (const p of points) {
      const c = interpolateColor(colors, p.intensity)
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.type === 'click' ? 3 : 1.5, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},0.7)`
      ctx.fill()
    }
  }
}
