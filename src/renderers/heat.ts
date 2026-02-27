import type { InteractionData, RenderOptions } from '../types'
import {
  resolveOptions,
  buildDensityGrid,
  blurGrid,
  samplePalette,
  applyGrain,
  clamp,
} from '../utils/render-helpers'

/**
 * Renders a heat map from interaction data.
 *
 * How it works:
 * 1. Build a density grid from cursor positions
 * 2. Apply gaussian blur for smooth falloff
 * 3. Map density values to the color palette
 * 4. Overlay click markers
 */
export function renderHeat(
  ctx: CanvasRenderingContext2D,
  data: InteractionData,
  opts: Partial<RenderOptions> = {}
): void {
  const o = resolveOptions({ ...opts, mode: 'heat' })
  const w = ctx.canvas.width
  const h = ctx.canvas.height

  // Background
  ctx.fillStyle = o.background
  ctx.fillRect(0, 0, w, h)

  if (data.moves.length < 2) return

  // Build and blur density grid
  const gridScale = 4 // Each grid cell = 4px
  const gridW = Math.ceil(w / gridScale)
  const gridH = Math.ceil(h / gridScale)

  let grid = buildDensityGrid(data, gridW, gridH, w, h)

  // Apply blur (multiple passes for large blur)
  const blurPasses = Math.ceil(o.blur / 10)
  const blurPerPass = Math.ceil(o.blur / blurPasses / gridScale)
  for (let i = 0; i < blurPasses; i++) {
    grid = blurGrid(grid, gridW, gridH, blurPerPass)
  }

  // Render grid to canvas
  const imageData = ctx.createImageData(gridW, gridH)
  for (let i = 0; i < grid.length; i++) {
    const val = clamp(grid[i] * o.intensity, 0, 1)
    if (val < 0.01) continue

    const color = samplePalette(o.palette, val)
    const match = color.match(/rgb\((\d+),(\d+),(\d+)\)/)
    if (match) {
      const idx = i * 4
      imageData.data[idx] = parseInt(match[1])
      imageData.data[idx + 1] = parseInt(match[2])
      imageData.data[idx + 2] = parseInt(match[3])
      imageData.data[idx + 3] = Math.floor(val * 255)
    }
  }

  // Scale up the small grid to full canvas via a temp canvas
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = gridW
  tempCanvas.height = gridH
  const tempCtx = tempCanvas.getContext('2d')!
  tempCtx.putImageData(imageData, 0, 0)

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.globalCompositeOperation = 'lighter'
  ctx.drawImage(tempCanvas, 0, 0, w, h)
  ctx.globalCompositeOperation = 'source-over'

  // Click markers
  if (o.showClicks && data.clicks.length > 0) {
    renderClicks(ctx, data, o, w, h)
  }

  // Grain
  applyGrain(ctx, w, h, o.grain)
}

function renderClicks(
  ctx: CanvasRenderingContext2D,
  data: InteractionData,
  o: Required<RenderOptions>,
  w: number,
  h: number
): void {
  for (const click of data.clicks) {
    const cx = click.x * w
    const cy = click.y * h
    const size = 4 + (click.duration / 200) * 8

    ctx.save()
    switch (o.clickStyle) {
      case 'ring': {
        ctx.strokeStyle = samplePalette(o.palette, 0.8)
        ctx.lineWidth = 1.5
        ctx.globalAlpha = 0.7
        ctx.beginPath()
        ctx.arc(cx, cy, size, 0, Math.PI * 2)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(cx, cy, size * 1.8, 0, Math.PI * 2)
        ctx.globalAlpha = 0.3
        ctx.stroke()
        break
      }
      case 'burst': {
        const rays = 6
        ctx.strokeStyle = samplePalette(o.palette, 0.9)
        ctx.lineWidth = 1
        ctx.globalAlpha = 0.6
        for (let r = 0; r < rays; r++) {
          const angle = (r / rays) * Math.PI * 2
          ctx.beginPath()
          ctx.moveTo(cx + Math.cos(angle) * 3, cy + Math.sin(angle) * 3)
          ctx.lineTo(cx + Math.cos(angle) * size * 2, cy + Math.sin(angle) * size * 2)
          ctx.stroke()
        }
        break
      }
      case 'dot': {
        ctx.fillStyle = samplePalette(o.palette, 0.9)
        ctx.globalAlpha = 0.8
        ctx.beginPath()
        ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2)
        ctx.fill()
        break
      }
      case 'ripple': {
        for (let ring = 0; ring < 3; ring++) {
          ctx.strokeStyle = samplePalette(o.palette, 0.7 + ring * 0.1)
          ctx.lineWidth = 1
          ctx.globalAlpha = 0.5 - ring * 0.15
          ctx.beginPath()
          ctx.arc(cx, cy, size * (1 + ring * 0.8), 0, Math.PI * 2)
          ctx.stroke()
        }
        break
      }
    }
    ctx.restore()
  }
}
