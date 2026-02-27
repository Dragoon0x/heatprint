import type { InteractionData, RenderOptions } from '../types'
import {
  resolveOptions,
  samplePaletteRgba,
  applyGrain,
  lerp,
  dist,
  clamp,
  seededRandom,
} from '../utils/render-helpers'

/**
 * Renders flowing particle trails from interaction data.
 *
 * Particles are seeded along the cursor path and flow
 * outward with slight noise, creating organic ribbon-like trails.
 */
export function renderTrails(
  ctx: CanvasRenderingContext2D,
  data: InteractionData,
  opts: Partial<RenderOptions> = {}
): void {
  const o = resolveOptions({ ...opts, mode: 'trails' })
  const w = ctx.canvas.width
  const h = ctx.canvas.height

  // Background
  ctx.fillStyle = o.background
  ctx.fillRect(0, 0, w, h)

  if (data.moves.length < 3) return

  const rand = seededRandom(42)

  // Draw the main cursor trail with varying thickness
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Split into segments based on time gaps
  const segments: Array<Array<{ x: number; y: number; t: number }>> = []
  let currentSeg: Array<{ x: number; y: number; t: number }> = []

  for (let i = 0; i < data.moves.length; i++) {
    const p = data.moves[i]
    const px = p.x * w
    const py = p.y * h

    if (currentSeg.length > 0) {
      const last = data.moves[i - 1]
      const timeDiff = p.t - last.t
      if (timeDiff > 300) {
        // Time gap: start new segment
        if (currentSeg.length > 2) segments.push(currentSeg)
        currentSeg = []
      }
    }
    currentSeg.push({ x: px, y: py, t: p.t })
  }
  if (currentSeg.length > 2) segments.push(currentSeg)

  // Render each segment as a flowing trail
  for (const seg of segments) {
    // Main trail line
    for (let pass = 0; pass < 3; pass++) {
      const width = pass === 0 ? 3 : pass === 1 ? 1.5 : 0.5
      const alpha = pass === 0 ? 0.1 : pass === 1 ? 0.2 : 0.4

      ctx.beginPath()
      ctx.moveTo(seg[0].x, seg[0].y)

      for (let i = 1; i < seg.length - 1; i++) {
        const xc = (seg[i].x + seg[i + 1].x) / 2
        const yc = (seg[i].y + seg[i + 1].y) / 2
        ctx.quadraticCurveTo(seg[i].x, seg[i].y, xc, yc)
      }

      const t = clamp(seg[seg.length - 1].t / (data.duration || 1), 0, 1)
      ctx.strokeStyle = samplePaletteRgba(o.palette, 0.4 + t * 0.5, alpha * o.lineOpacity)
      ctx.lineWidth = width
      ctx.stroke()
    }

    // Spawn particles along the trail
    const particleCount = Math.min(
      Math.floor(o.particles * (seg.length / data.moves.length)),
      o.particles
    )

    for (let p = 0; p < particleCount; p++) {
      const idx = Math.floor(rand() * (seg.length - 1))
      const pt = seg[idx]
      const next = seg[Math.min(idx + 1, seg.length - 1)]

      // Direction of movement
      const dx = next.x - pt.x
      const dy = next.y - pt.y
      const len = Math.sqrt(dx * dx + dy * dy)
      if (len < 0.5) continue

      // Perpendicular offset with noise
      const nx = -dy / len
      const ny = dx / len
      const offset = (rand() - 0.5) * 30
      const drift = rand() * 20

      const px = pt.x + nx * offset + dx * drift * 0.01
      const py = pt.y + ny * offset + dy * drift * 0.01

      const size = 0.5 + rand() * 2
      const t = clamp(pt.t / (data.duration || 1), 0, 1)
      const alpha = 0.1 + rand() * 0.4

      ctx.beginPath()
      ctx.arc(px, py, size, 0, Math.PI * 2)
      ctx.fillStyle = samplePaletteRgba(o.palette, 0.3 + t * 0.6, alpha)
      ctx.fill()
    }
  }

  // Glow effect at high-velocity points
  for (let i = 1; i < data.moves.length; i++) {
    const prev = data.moves[i - 1]
    const curr = data.moves[i]
    const d = dist(prev.x * w, prev.y * h, curr.x * w, curr.y * h)
    const dt = curr.t - prev.t
    const velocity = dt > 0 ? d / dt : 0

    if (velocity > 0.5) {
      const glow = Math.min(velocity * 2, 20)
      const t = clamp(curr.t / (data.duration || 1), 0, 1)

      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.beginPath()
      ctx.arc(curr.x * w, curr.y * h, glow, 0, Math.PI * 2)
      ctx.fillStyle = samplePaletteRgba(o.palette, 0.6 + t * 0.3, 0.05)
      ctx.fill()
      ctx.restore()
    }
  }

  // Click impacts
  if (o.showClicks) {
    for (const click of data.clicks) {
      const cx = click.x * w
      const cy = click.y * h
      const rings = 3 + Math.floor(click.duration / 100)

      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (let r = 0; r < rings; r++) {
        const radius = 4 + r * 6
        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.strokeStyle = samplePaletteRgba(o.palette, 0.8, 0.2 - r * 0.04)
        ctx.lineWidth = 0.8
        ctx.stroke()
      }
      ctx.restore()
    }
  }

  applyGrain(ctx, w, h, o.grain)
}
