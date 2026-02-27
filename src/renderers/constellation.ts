import type { InteractionData, RenderOptions } from '../types'
import {
  resolveOptions,
  samplePaletteRgba,
  samplePalette,
  applyGrain,
  dist,
  clamp,
  seededRandom,
} from '../utils/render-helpers'

/**
 * Renders a constellation/star map from interaction data.
 *
 * Sampled points become "stars" connected by lines when close enough.
 * Click positions become bright nodes. The result looks like a
 * celestial map of where attention went.
 */
export function renderConstellation(
  ctx: CanvasRenderingContext2D,
  data: InteractionData,
  opts: Partial<RenderOptions> = {}
): void {
  const o = resolveOptions({ ...opts, mode: 'constellation' })
  const w = ctx.canvas.width
  const h = ctx.canvas.height

  // Background
  ctx.fillStyle = o.background
  ctx.fillRect(0, 0, w, h)

  if (data.moves.length < 3) return

  const rand = seededRandom(77)

  // Sample points from the movement data (subsample for performance)
  const sampleRate = Math.max(1, Math.floor(data.moves.length / Math.min(o.particles, 800)))
  const stars: Array<{ x: number; y: number; t: number; size: number; brightness: number }> = []

  for (let i = 0; i < data.moves.length; i += sampleRate) {
    const p = data.moves[i]
    stars.push({
      x: p.x * w,
      y: p.y * h,
      t: p.t,
      size: 0.5 + rand() * 2,
      brightness: 0.3 + rand() * 0.7,
    })
  }

  // Add click positions as bright stars
  for (const click of data.clicks) {
    stars.push({
      x: click.x * w,
      y: click.y * h,
      t: click.t,
      size: 3 + (click.duration / 200) * 3,
      brightness: 1,
    })
  }

  // Background star dust (decorative scattered points)
  ctx.save()
  for (let i = 0; i < 200; i++) {
    const x = rand() * w
    const y = rand() * h
    const s = 0.3 + rand() * 0.8
    ctx.beginPath()
    ctx.arc(x, y, s, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,${0.02 + rand() * 0.06})`
    ctx.fill()
  }
  ctx.restore()

  // Draw connections between nearby stars
  const connectionDist = Math.min(w, h) * 0.08 * o.intensity

  ctx.save()
  ctx.lineCap = 'round'

  for (let i = 0; i < stars.length; i++) {
    const a = stars[i]
    // Only check forward to avoid duplicate lines
    for (let j = i + 1; j < stars.length; j++) {
      const b = stars[j]
      const d = dist(a.x, a.y, b.x, b.y)

      if (d < connectionDist && d > 2) {
        const alpha = (1 - d / connectionDist) * 0.25 * o.lineOpacity
        const tAvg = clamp(((a.t + b.t) / 2) / (data.duration || 1), 0, 1)

        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = samplePaletteRgba(o.palette, 0.3 + tAvg * 0.5, alpha)
        ctx.lineWidth = 0.5
        ctx.stroke()
      }
    }
  }
  ctx.restore()

  // Draw stars
  for (const star of stars) {
    const t = clamp(star.t / (data.duration || 1), 0, 1)

    // Glow
    if (star.brightness > 0.6) {
      const gradient = ctx.createRadialGradient(
        star.x, star.y, 0,
        star.x, star.y, star.size * 6
      )
      gradient.addColorStop(0, samplePaletteRgba(o.palette, 0.5 + t * 0.4, 0.15 * star.brightness))
      gradient.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(star.x, star.y, star.size * 6, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
    }

    // Core
    ctx.beginPath()
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
    ctx.fillStyle = samplePaletteRgba(
      o.palette,
      0.5 + t * 0.5,
      0.5 + star.brightness * 0.5
    )
    ctx.fill()

    // Bright center for large stars
    if (star.size > 2) {
      ctx.beginPath()
      ctx.arc(star.x, star.y, star.size * 0.4, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${star.brightness * 0.6})`
      ctx.fill()
    }
  }

  // Draw constellation paths between consecutive movement points (ghostly trail)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.beginPath()

  const step = Math.max(1, Math.floor(data.moves.length / 300))
  for (let i = 0; i < data.moves.length - step; i += step) {
    const a = data.moves[i]
    const b = data.moves[Math.min(i + step, data.moves.length - 1)]
    const ax = a.x * w
    const ay = a.y * h
    const bx = b.x * w
    const by = b.y * h

    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
  }

  ctx.strokeStyle = samplePaletteRgba(o.palette, 0.6, 0.03)
  ctx.lineWidth = 0.5
  ctx.stroke()
  ctx.restore()

  applyGrain(ctx, w, h, o.grain)
}
