import type { InteractionData, RenderOptions } from '../types'
import {
  resolveOptions,
  buildDensityGrid,
  blurGrid,
  samplePaletteRgba,
  samplePalette,
  applyGrain,
  clamp,
} from '../utils/render-helpers'

/**
 * Renders a topographic contour map from interaction density.
 *
 * High-density areas become "peaks" with concentric contour lines.
 * Looks like a terrain map drawn from attention data.
 */
export function renderTopography(
  ctx: CanvasRenderingContext2D,
  data: InteractionData,
  opts: Partial<RenderOptions> = {}
): void {
  const o = resolveOptions({ ...opts, mode: 'topography' })
  const w = ctx.canvas.width
  const h = ctx.canvas.height

  ctx.fillStyle = o.background
  ctx.fillRect(0, 0, w, h)

  if (data.moves.length < 5) return

  // Build density at higher resolution for smoother contours
  const scale = 2
  const gridW = Math.ceil(w / scale)
  const gridH = Math.ceil(h / scale)

  let grid = buildDensityGrid(data, gridW, gridH, w, h)

  // Heavy blur for smooth contours
  grid = blurGrid(grid, gridW, gridH, 8)
  grid = blurGrid(grid, gridW, gridH, 6)

  // Draw contour lines using marching squares (simplified)
  const contourLevels = 12
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (let level = 1; level <= contourLevels; level++) {
    const threshold = (level / contourLevels) * o.intensity * 0.8
    const paletteT = level / contourLevels
    const alpha = 0.15 + paletteT * 0.35

    ctx.strokeStyle = samplePaletteRgba(o.palette, 0.2 + paletteT * 0.7, alpha * o.lineOpacity)
    ctx.lineWidth = level === contourLevels ? 1.5 : 0.8

    // Simple contour: scan each row for threshold crossings
    for (let y = 0; y < gridH - 1; y++) {
      let inContour = false
      let segStart = 0

      for (let x = 0; x < gridW - 1; x++) {
        const val = grid[y * gridW + x]
        const crossing = val >= threshold

        if (crossing && !inContour) {
          inContour = true
          segStart = x
        } else if (!crossing && inContour) {
          inContour = false
          // Draw horizontal contour segment
          const sx = segStart * scale
          const ex = x * scale
          const sy = y * scale

          ctx.beginPath()
          ctx.moveTo(sx, sy)
          ctx.lineTo(ex, sy)
          ctx.stroke()
        }
      }
    }

    // Vertical scan too for closed contours
    for (let x = 0; x < gridW - 1; x++) {
      let inContour = false
      let segStart = 0

      for (let y = 0; y < gridH - 1; y++) {
        const val = grid[y * gridW + x]
        const crossing = val >= threshold

        if (crossing && !inContour) {
          inContour = true
          segStart = y
        } else if (!crossing && inContour) {
          inContour = false
          const sx = x * scale
          const sy = segStart * scale
          const ey = y * scale

          ctx.beginPath()
          ctx.moveTo(sx, sy)
          ctx.lineTo(sx, ey)
          ctx.stroke()
        }
      }
    }
  }

  // Fill high-density peaks with subtle gradient
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const val = grid[y * gridW + x]
      if (val > 0.5 * o.intensity) {
        const px = x * scale
        const py = y * scale
        const alpha = (val - 0.5) * 0.15
        ctx.fillStyle = samplePaletteRgba(o.palette, 0.6 + val * 0.3, alpha)
        ctx.fillRect(px, py, scale, scale)
      }
    }
  }
  ctx.restore()

  // Click markers as elevation peaks
  if (o.showClicks) {
    for (const click of data.clicks) {
      const cx = click.x * w
      const cy = click.y * h

      // Crosshair marker
      const size = 6
      ctx.strokeStyle = samplePaletteRgba(o.palette, 0.9, 0.6)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(cx - size, cy)
      ctx.lineTo(cx + size, cy)
      ctx.moveTo(cx, cy - size)
      ctx.lineTo(cx, cy + size)
      ctx.stroke()

      // Small circle
      ctx.beginPath()
      ctx.arc(cx, cy, 3, 0, Math.PI * 2)
      ctx.fillStyle = samplePalette(o.palette, 0.9)
      ctx.fill()
    }
  }

  applyGrain(ctx, w, h, o.grain)
}
