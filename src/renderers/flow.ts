import type { InteractionData, RenderOptions } from '../types'
import {
  resolveOptions,
  samplePaletteRgba,
  applyGrain,
  clamp,
  seededRandom,
  buildDensityGrid,
  blurGrid,
} from '../utils/render-helpers'

/**
 * Renders a flow field from interaction data.
 *
 * Builds a vector field from cursor movement directions,
 * then runs particles through it. Areas with more movement
 * create stronger, more coherent flow patterns.
 */
export function renderFlow(
  ctx: CanvasRenderingContext2D,
  data: InteractionData,
  opts: Partial<RenderOptions> = {}
): void {
  const o = resolveOptions({ ...opts, mode: 'flow' })
  const w = ctx.canvas.width
  const h = ctx.canvas.height

  // Background
  ctx.fillStyle = o.background
  ctx.fillRect(0, 0, w, h)

  if (data.moves.length < 5) return

  const rand = seededRandom(123)

  // Build angle and magnitude grids from movement vectors
  const gridSize = 20 // Each cell is 20px
  const cols = Math.ceil(w / gridSize)
  const rows = Math.ceil(h / gridSize)

  const angleGrid = new Float32Array(cols * rows)
  const magGrid = new Float32Array(cols * rows)
  const countGrid = new Float32Array(cols * rows)

  for (let i = 1; i < data.moves.length; i++) {
    const prev = data.moves[i - 1]
    const curr = data.moves[i]
    const dx = (curr.x - prev.x) * w
    const dy = (curr.y - prev.y) * h

    const col = Math.floor(curr.x * w / gridSize)
    const row = Math.floor(curr.y * h / gridSize)

    if (col >= 0 && col < cols && row >= 0 && row < rows) {
      const idx = row * cols + col
      const angle = Math.atan2(dy, dx)
      const mag = Math.sqrt(dx * dx + dy * dy)

      // Accumulate (circular mean would be better, this is approximate)
      angleGrid[idx] += angle
      magGrid[idx] += mag
      countGrid[idx] += 1
    }
  }

  // Average the angles
  for (let i = 0; i < angleGrid.length; i++) {
    if (countGrid[i] > 0) {
      angleGrid[i] /= countGrid[i]
      magGrid[i] /= countGrid[i]
    } else {
      // Default: subtle noise for empty areas
      angleGrid[i] = rand() * Math.PI * 2
      magGrid[i] = 0.1
    }
  }

  // Get density for color intensity
  const density = buildDensityGrid(data, cols, rows, w, h)
  const blurred = blurGrid(density, cols, rows, 3)

  // Run particles through the field
  const numParticles = o.particles
  const stepLength = 2
  const maxSteps = 60

  ctx.lineCap = 'round'

  for (let p = 0; p < numParticles; p++) {
    // Seed particles biased toward areas with data
    let px: number, py: number
    if (rand() < 0.7 && data.moves.length > 0) {
      // Start near a recorded point
      const pt = data.moves[Math.floor(rand() * data.moves.length)]
      px = pt.x * w + (rand() - 0.5) * 40
      py = pt.y * h + (rand() - 0.5) * 40
    } else {
      px = rand() * w
      py = rand() * h
    }

    ctx.beginPath()
    ctx.moveTo(px, py)

    let prevAngle = 0
    const steps = Math.floor(maxSteps * (0.3 + rand() * 0.7))

    for (let s = 0; s < steps; s++) {
      const col = Math.floor(px / gridSize)
      const row = Math.floor(py / gridSize)

      if (col < 0 || col >= cols || row < 0 || row >= rows) break

      const idx = row * cols + col
      let angle = angleGrid[idx]
      const mag = magGrid[idx]

      // Add slight noise to prevent rigid patterns
      angle += (rand() - 0.5) * 0.6

      // Smooth angle transitions
      const diff = angle - prevAngle
      const smoothAngle = prevAngle + diff * 0.4
      prevAngle = smoothAngle

      const step = stepLength * (0.5 + mag * 0.5) * o.speed
      px += Math.cos(smoothAngle) * step
      py += Math.sin(smoothAngle) * step

      ctx.lineTo(px, py)
    }

    // Color based on density at start position
    const startCol = Math.floor((data.moves.length > 0 ? data.moves[0].x : rand()) * cols)
    const startRow = Math.floor((data.moves.length > 0 ? data.moves[0].y : rand()) * rows)
    const dIdx = clamp(startRow, 0, rows - 1) * cols + clamp(startCol, 0, cols - 1)
    const dVal = clamp(blurred[dIdx] * o.intensity, 0, 1)
    const alpha = 0.02 + dVal * 0.15

    ctx.strokeStyle = samplePaletteRgba(o.palette, 0.2 + dVal * 0.7, alpha * o.lineOpacity)
    ctx.lineWidth = 0.5 + rand() * 1
    ctx.stroke()
  }

  // Overlay bright dots at click positions
  if (o.showClicks) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const click of data.clicks) {
      const cx = click.x * w
      const cy = click.y * h

      // Radial burst from click
      const burstLines = 12
      for (let i = 0; i < burstLines; i++) {
        const angle = (i / burstLines) * Math.PI * 2 + rand() * 0.3
        const len = 10 + rand() * 30
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len)
        ctx.strokeStyle = samplePaletteRgba(o.palette, 0.8, 0.15)
        ctx.lineWidth = 0.5
        ctx.stroke()
      }
    }
    ctx.restore()
  }

  applyGrain(ctx, w, h, o.grain)
}
