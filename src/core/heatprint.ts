// ═══════════════════════════════════════════
// HEATPRINT — Main Class
// ═══════════════════════════════════════════
// Track interactions → render as generative art → export.

import type { HeatprintConfig, RenderMode, Interaction, HeatprintStats } from '../types'
import { Tracker } from './tracker'
import { Renderer } from './renderer'

export class Heatprint {
  private tracker: Tracker
  private renderer: Renderer
  private config: HeatprintConfig

  constructor(config?: HeatprintConfig) {
    this.config = config || {}
    this.tracker = new Tracker(this.config)
    this.renderer = new Renderer(this.config)
  }

  /** Start tracking interactions */
  start(): void {
    this.tracker.start()
  }

  /** Stop tracking */
  stop(): void {
    this.tracker.stop()
  }

  /** Is tracking active */
  isActive(): boolean {
    return this.tracker.isActive()
  }

  /** Render the current interactions */
  render(mode?: RenderMode): HTMLCanvasElement {
    return this.renderer.render(this.tracker.getInteractions(), mode)
  }

  /** Render to an existing canvas */
  renderTo(canvas: HTMLCanvasElement, mode?: RenderMode): void {
    this.renderer.setCanvas(canvas)
    this.renderer.render(this.tracker.getInteractions(), mode)
  }

  /** Render all 8 modes and return them as an object */
  renderAll(): Record<RenderMode, HTMLCanvasElement> {
    const modes: RenderMode[] = ['heatmap', 'constellation', 'flowfield', 'topographic', 'trails', 'aurora', 'rings', 'mesh']
    const results = {} as Record<RenderMode, HTMLCanvasElement>

    for (const mode of modes) {
      const r = new Renderer(this.config)
      results[mode] = r.render(this.tracker.getInteractions(), mode)
    }

    return results
  }

  /** Export current render as PNG data URL */
  exportPNG(mode?: RenderMode): string {
    this.render(mode)
    return this.renderer.exportPNG()
  }

  /** Get interaction statistics */
  getStats(): HeatprintStats {
    return this.tracker.getStats()
  }

  /** Get raw interaction data */
  getInteractions(): Interaction[] {
    return this.tracker.getInteractions()
  }

  /** Clear all recorded interactions */
  clear(): void {
    this.tracker.clear()
  }

  /** Export interaction data as JSON string */
  exportData(): string {
    return this.tracker.exportData()
  }

  /** Import interaction data from JSON string */
  importData(json: string): void {
    const data = JSON.parse(json)
    this.tracker.importData(data)
  }

  /** Add a single interaction programmatically */
  addInteraction(interaction: Interaction): void {
    this.tracker.addInteraction(interaction)
  }

  /** Get the canvas element (after render) */
  getCanvas(): HTMLCanvasElement | null {
    return this.renderer.getCanvas()
  }

  /** Get the underlying tracker */
  getTracker(): Tracker { return this.tracker }

  /** Get the underlying renderer */
  getRenderer(): Renderer { return this.renderer }
}
