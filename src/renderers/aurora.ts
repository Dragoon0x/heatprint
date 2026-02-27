import type { InteractionData, RenderOptions } from '../types'
import {
  resolveOptions,
  samplePaletteRgba,
  applyGrain,
  lerp,
  clamp,
  seededRandom,
} from '../utils/render-helpers'

/**
 * Renders aurora/northern lights ribbons from cursor movement.
 *
 * Each continuous cursor path becomes a luminous ribbon that
 * shimmers with color from the palette. The most visually
 * dramatic mode.
 */
export function renderAurora(
  ctx: CanvasRenderingContext2D,
  data: InteractionData,
  opts: Partial<RenderOptions> = {}
): void {
  const o = resolveOptions({ ...opts, mode: 'aurora' })
  const w = ctx.canvas.width
  const h = ctx.canvas.height

  ctx.fillStyle = o.background
  ctx.fillRect(0, 0, w, h)

  if (data.moves.length < 5) return

  const rand = seededRandom(99)

  // Split movement into continuous segments
  const segments: Array<Array<{ x: number; y: number; t: number }>> = []
  let current: Array<{ x: number; y: number; t: number }> = []

  for (let i = 0; i < data.moves.length; i++) {
    const p = data.moves[i]
    if (current.length > 0) {
      const prev = data.moves[i - 1]
      if (p.t - prev.t > 200) {
        if (current.length > 4) segments.push(current)
        current = []
      }
    }
    current.push({ x: p.x * w, y: p.y * h, t: p.t })
  }
  if (current.length > 4) segments.push(current)

  // Smooth each segment with catmull-rom spline
  function catmullRomPoints(
    pts: Array<{ x: number; y: number; t: number }>,
    detail: number = 4
  ): Array<{ x: number; y: number; t: number }> {
    if (pts.length < 3) return pts
    const result: Array<{ x: number; y: number; t: number }> = []

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)]
      const p1 = pts[i]
      const p2 = pts[Math.min(i + 1, pts.length - 1)]
      const p3 = pts[Math.min(i + 2, pts.length - 1)]

      for (let j = 0; j < detail; j++) {
        const t = j / detail
        const t2 = t * t
        const t3 = t2 * t

        const x =
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3)

        const y =
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)

        result.push({ x, y, t: lerp(p1.t, p2.t, t) })
      }
    }

    return result
  }

  // Render each segment as a luminous ribbon
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'

  for (const seg of segments) {
    // Subsample long segments
    const maxPts = 200
    let sampled = seg
    if (seg.length > maxPts) {
      const step = Math.floor(seg.length / maxPts)
      sampled = seg.filter((_, i) => i % step === 0)
    }

    const smooth = catmullRomPoints(sampled, 3)
    if (smooth.length < 4) continue

    // Draw multiple ribbon layers with varying width and offset
    const layers = 5
    for (let layer = 0; layer < layers; layer++) {
      const ribbonWidth = (layers - layer) * 12 * o.intensity
      const alpha = (0.01 + layer * 0.02) * o.lineOpacity

      ctx.beginPath()

      // Upper edge
      for (let i = 0; i < smooth.length; i++) {
        const p = smooth[i]
        const next = smooth[Math.min(i + 1, smooth.length - 1)]
        const dx = next.x - p.x
        const dy = next.y - p.y
        const len = Math.sqrt(dx * dx + dy * dy)
        const nx = len > 0 ? -dy / len : 0
        const ny = len > 0 ? dx / len : 0

        // Wavy offset
        const wave = Math.sin(i * 0.08 + layer * 1.5) * ribbonWidth * 0.3
        const ux = p.x + nx * (ribbonWidth + wave) * 0.5
        const uy = p.y + ny * (ribbonWidth + wave) * 0.5

        if (i === 0) ctx.moveTo(ux, uy)
        else ctx.lineTo(ux, uy)
      }

      // Lower edge (reverse)
      for (let i = smooth.length - 1; i >= 0; i--) {
        const p = smooth[i]
        const next = smooth[Math.min(i + 1, smooth.length - 1)]
        const dx = next.x - p.x
        const dy = next.y - p.y
        const len = Math.sqrt(dx * dx + dy * dy)
        const nx = len > 0 ? -dy / len : 0
        const ny = len > 0 ? dx / len : 0

        const wave = Math.sin(i * 0.08 + layer * 1.5) * ribbonWidth * 0.3
        const lx = p.x - nx * (ribbonWidth + wave) * 0.5
        const ly = p.y - ny * (ribbonWidth + wave) * 0.5
        ctx.lineTo(lx, ly)
      }

      ctx.closePath()

      // Gradient fill along the ribbon
      const p0 = smooth[0]
      const pN = smooth[smooth.length - 1]
      const grad = ctx.createLinearGradient(p0.x, p0.y, pN.x, pN.y)
      const t0 = clamp(p0.t / (data.duration || 1), 0, 1)
      const tN = clamp(pN.t / (data.duration || 1), 0, 1)

      grad.addColorStop(0, samplePaletteRgba(o.palette, 0.2 + t0 * 0.4, alpha))
      grad.addColorStop(0.3, samplePaletteRgba(o.palette, 0.4 + t0 * 0.3, alpha * 1.5))
      grad.addColorStop(0.7, samplePaletteRgba(o.palette, 0.5 + tN * 0.3, alpha * 1.2))
      grad.addColorStop(1, samplePaletteRgba(o.palette, 0.3 + tN * 0.4, alpha * 0.5))

      ctx.fillStyle = grad
      ctx.fill()
    }

    // Core bright line through the center
    ctx.beginPath()
    ctx.moveTo(smooth[0].x, smooth[0].y)
    for (let i = 1; i < smooth.length; i++) {
      ctx.lineTo(smooth[i].x, smooth[i].y)
    }
    const t0 = clamp(smooth[0].t / (data.duration || 1), 0, 1)
    ctx.strokeStyle = samplePaletteRgba(o.palette, 0.6 + t0 * 0.3, 0.08 * o.lineOpacity)
    ctx.lineWidth = 1
    ctx.stroke()
  }

  ctx.restore()

  // Click: bright starburst
  if (o.showClicks) {
    for (const click of data.clicks) {
      const cx = click.x * w
      const cy = click.y * h
      const t = clamp(click.t / (data.duration || 1), 0, 1)

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30)
      gradient.addColorStop(0, samplePaletteRgba(o.palette, 0.7 + t * 0.3, 0.25))
      gradient.addColorStop(0.5, samplePaletteRgba(o.palette, 0.5 + t * 0.3, 0.05))
      gradient.addColorStop(1, 'transparent')

      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.beginPath()
      ctx.arc(cx, cy, 30, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
      ctx.restore()
    }
  }

  applyGrain(ctx, w, h, o.grain)
}
