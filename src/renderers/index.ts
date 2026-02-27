import type { InteractionData, RenderMode, RenderOptions } from '../types'
import { renderHeat } from './heat'
import { renderTrails } from './trails'
import { renderConstellation } from './constellation'
import { renderFlow } from './flow'
import { renderTopography } from './topography'
import { renderAurora } from './aurora'

const RENDERERS: Record<RenderMode, (
  ctx: CanvasRenderingContext2D,
  data: InteractionData,
  opts: Partial<RenderOptions>
) => void> = {
  heat: renderHeat,
  trails: renderTrails,
  constellation: renderConstellation,
  flow: renderFlow,
  topography: renderTopography,
  aurora: renderAurora,
}

/**
 * Render interaction data to a canvas context.
 */
export function render(
  ctx: CanvasRenderingContext2D,
  data: InteractionData,
  opts: Partial<RenderOptions> = {}
): void {
  const mode = opts.mode ?? 'heat'
  const renderer = RENDERERS[mode]
  if (!renderer) {
    throw new Error(`[heatprint] Unknown render mode: ${mode}`)
  }
  renderer(ctx, data, opts)
}

/**
 * Render to a new canvas and return it.
 */
export function renderToCanvas(
  data: InteractionData,
  opts: Partial<RenderOptions> = {}
): HTMLCanvasElement {
  const dpr = opts.dpr ?? (typeof window !== 'undefined' ? window.devicePixelRatio : 1)
  const width = opts.width ?? data.viewport.width
  const height = opts.height ?? data.viewport.height

  const canvas = document.createElement('canvas')
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)

  render(ctx, data, { ...opts, width, height })

  return canvas
}

/**
 * Export the heatprint as a PNG data URL.
 */
export function exportPNG(
  data: InteractionData,
  opts: Partial<RenderOptions> = {}
): string {
  const canvas = renderToCanvas(data, opts)
  return canvas.toDataURL('image/png')
}

/**
 * Export as a downloadable PNG file.
 */
export function downloadPNG(
  data: InteractionData,
  filename: string = 'heatprint.png',
  opts: Partial<RenderOptions> = {}
): void {
  const dataUrl = exportPNG(data, opts)
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export interaction data as JSON for later replay.
 */
export function exportJSON(data: InteractionData): string {
  return JSON.stringify(data)
}

/**
 * Import interaction data from JSON.
 */
export function importJSON(json: string): InteractionData {
  return JSON.parse(json)
}

// Re-export individual renderers for direct use
export { renderHeat } from './heat'
export { renderTrails } from './trails'
export { renderConstellation } from './constellation'
export { renderFlow } from './flow'
export { renderTopography } from './topography'
export { renderAurora } from './aurora'
