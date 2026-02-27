// ─── Components ──────────────────────────────────────────────
export { Heatprint } from './components/Heatprint'
export { useHeatprint } from './components/useHeatprint'

// ─── Core ────────────────────────────────────────────────────
export { InteractionTracker } from './core/tracker'

// ─── Renderers ───────────────────────────────────────────────
export {
  render,
  renderToCanvas,
  exportPNG,
  downloadPNG,
  exportJSON,
  importJSON,
  renderHeat,
  renderTrails,
  renderConstellation,
  renderFlow,
  renderTopography,
  renderAurora,
} from './renderers'

// ─── Types ───────────────────────────────────────────────────
export type {
  InteractionData,
  Point,
  ClickEvent,
  ScrollFrame,
  RenderMode,
  RenderOptions,
  TrackerOptions,
  HeatprintProps,
} from './types'

// ─── Constants ───────────────────────────────────────────────
export { PALETTES, DEFAULT_PALETTE, DEFAULTS } from './types'
