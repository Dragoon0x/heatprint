import type { InteractionData, RenderOptions } from '../types'
import { DEFAULT_PALETTE, DEFAULTS } from '../types'

/** Linear interpolation */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Clamp value */
export function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

/** Distance between two points */
export function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

/** Map value from one range to another */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin)
}

/** Get color from palette at position t (0-1) */
export function samplePalette(palette: string[], t: number): string {
  const clamped = clamp(t, 0, 1)
  const idx = clamped * (palette.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.min(lo + 1, palette.length - 1)
  const frac = idx - lo

  const cLo = hexToRgb(palette[lo])
  const cHi = hexToRgb(palette[hi])

  const r = Math.round(lerp(cLo.r, cHi.r, frac))
  const g = Math.round(lerp(cLo.g, cHi.g, frac))
  const b = Math.round(lerp(cLo.b, cHi.b, frac))

  return `rgb(${r},${g},${b})`
}

/** Get rgba color from palette */
export function samplePaletteRgba(palette: string[], t: number, alpha: number): string {
  const clamped = clamp(t, 0, 1)
  const idx = clamped * (palette.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.min(lo + 1, palette.length - 1)
  const frac = idx - lo

  const cLo = hexToRgb(palette[lo])
  const cHi = hexToRgb(palette[hi])

  const r = Math.round(lerp(cLo.r, cHi.r, frac))
  const g = Math.round(lerp(cLo.g, cHi.g, frac))
  const b = Math.round(lerp(cLo.b, cHi.b, frac))

  return `rgba(${r},${g},${b},${alpha})`
}

/** Hex to RGB */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

/** Build a density grid from move data */
export function buildDensityGrid(
  data: InteractionData,
  gridW: number,
  gridH: number,
  canvasW: number,
  canvasH: number
): Float32Array {
  const grid = new Float32Array(gridW * gridH)
  let maxVal = 0

  for (const p of data.moves) {
    const gx = Math.floor(p.x * gridW)
    const gy = Math.floor(p.y * gridH)
    if (gx >= 0 && gx < gridW && gy >= 0 && gy < gridH) {
      grid[gy * gridW + gx] += 1
      if (grid[gy * gridW + gx] > maxVal) maxVal = grid[gy * gridW + gx]
    }
  }

  // Normalize
  if (maxVal > 0) {
    for (let i = 0; i < grid.length; i++) {
      grid[i] /= maxVal
    }
  }

  return grid
}

/** Apply gaussian blur to a density grid */
export function blurGrid(
  grid: Float32Array,
  w: number,
  h: number,
  radius: number
): Float32Array {
  const out = new Float32Array(w * h)
  const kernel: number[] = []
  let kernelSum = 0

  // Build 1D gaussian kernel
  for (let i = -radius; i <= radius; i++) {
    const val = Math.exp(-(i * i) / (2 * (radius / 3) * (radius / 3)))
    kernel.push(val)
    kernelSum += val
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= kernelSum

  // Horizontal pass
  const temp = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0
      for (let k = 0; k < kernel.length; k++) {
        const sx = clamp(x + k - radius, 0, w - 1)
        sum += grid[y * w + sx] * kernel[k]
      }
      temp[y * w + x] = sum
    }
  }

  // Vertical pass
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let sum = 0
      for (let k = 0; k < kernel.length; k++) {
        const sy = clamp(y + k - radius, 0, h - 1)
        sum += temp[sy * w + x] * kernel[k]
      }
      out[y * w + x] = sum
    }
  }

  return out
}

/** Apply film grain noise to a canvas */
export function applyGrain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number
): void {
  if (intensity <= 0) return
  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data
  const amount = intensity * 30

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * amount
    data[i] = clamp(data[i] + noise, 0, 255)
    data[i + 1] = clamp(data[i + 1] + noise, 0, 255)
    data[i + 2] = clamp(data[i + 2] + noise, 0, 255)
  }

  ctx.putImageData(imageData, 0, 0)
}

/** Resolve render options with defaults */
export function resolveOptions(opts: Partial<RenderOptions>): Required<RenderOptions> {
  return {
    mode: opts.mode ?? 'heat',
    width: opts.width ?? 0,
    height: opts.height ?? 0,
    background: opts.background ?? '#000000',
    palette: opts.palette ?? DEFAULT_PALETTE,
    intensity: opts.intensity ?? DEFAULTS.intensity,
    blur: opts.blur ?? DEFAULTS.blur,
    particles: opts.particles ?? DEFAULTS.particles,
    lineOpacity: opts.lineOpacity ?? DEFAULTS.lineOpacity,
    showClicks: opts.showClicks ?? true,
    clickStyle: opts.clickStyle ?? DEFAULTS.clickStyle,
    showScrollDepth: opts.showScrollDepth ?? false,
    speed: opts.speed ?? DEFAULTS.speed,
    grain: opts.grain ?? DEFAULTS.grain,
    dpr: opts.dpr ?? (typeof window !== 'undefined' ? window.devicePixelRatio : 1),
  }
}

/** Pseudorandom seeded number generator */
export function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}
