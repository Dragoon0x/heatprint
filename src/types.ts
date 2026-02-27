// ─── Interaction Data ────────────────────────────────────────

export interface Point {
  x: number
  y: number
  t: number
}

export interface ClickEvent {
  x: number
  y: number
  t: number
  /** Duration of press in ms (0 for instant clicks) */
  duration: number
}

export interface ScrollFrame {
  /** Scroll position as 0-1 of total document height */
  depth: number
  t: number
  /** Viewport-relative Y scroll delta */
  velocity: number
}

export interface InteractionData {
  /** All cursor movement points */
  moves: Point[]
  /** Click/tap events */
  clicks: ClickEvent[]
  /** Scroll depth frames */
  scrolls: ScrollFrame[]
  /** Page dimensions at time of capture */
  viewport: { width: number; height: number }
  /** Total document height */
  docHeight: number
  /** Duration of capture in ms */
  duration: number
  /** Timestamp of capture start */
  startedAt: number
}

// ─── Renderer Types ──────────────────────────────────────────

export type RenderMode =
  | 'heat'          // Classic heat gradient
  | 'trails'        // Flowing particle trails
  | 'constellation' // Connected node graph
  | 'flow'          // Wind/flow field
  | 'topography'    // Contour map
  | 'aurora'        // Northern lights ribbons

export interface RenderOptions {
  /** Visualization mode */
  mode: RenderMode
  /** Canvas width (auto if not set) */
  width?: number
  /** Canvas height (auto if not set) */
  height?: number
  /** Background color */
  background?: string
  /** Primary color palette override */
  palette?: string[]
  /** Intensity multiplier (0.1 - 5). Default: 1 */
  intensity?: number
  /** Blur radius for heat mode. Default: 40 */
  blur?: number
  /** Particle count for trails/flow mode. Default: 2000 */
  particles?: number
  /** Line opacity (0-1). Default: 0.6 */
  lineOpacity?: number
  /** Whether to render click markers. Default: true */
  showClicks?: boolean
  /** Click marker style */
  clickStyle?: 'ring' | 'burst' | 'dot' | 'ripple'
  /** Whether to show scroll depth gradient. Default: false */
  showScrollDepth?: boolean
  /** Animation speed (0-1). Default: 0.5 */
  speed?: number
  /** Grain/noise overlay intensity (0-1). Default: 0.03 */
  grain?: number
  /** Device pixel ratio. Default: window.devicePixelRatio */
  dpr?: number
}

// ─── Tracker Options ─────────────────────────────────────────

export interface TrackerOptions {
  /** Throttle mouse move recording to N ms. Default: 16 (~60fps) */
  throttle?: number
  /** Maximum points to store before pruning oldest. Default: 50000 */
  maxPoints?: number
  /** Capture scroll data. Default: true */
  trackScroll?: boolean
  /** Capture click data. Default: true */
  trackClicks?: boolean
  /** Capture move data. Default: true */
  trackMoves?: boolean
  /** Target element (defaults to document) */
  target?: HTMLElement | null
  /** Whether positions are normalized (0-1) or pixel. Default: true (normalized) */
  normalize?: boolean
}

// ─── React Component Props ───────────────────────────────────

export interface HeatprintProps extends Partial<RenderOptions> {
  /** Whether actively recording. Default: true */
  recording?: boolean
  /** Whether to render live. Default: true */
  live?: boolean
  /** Canvas position */
  position?: 'fixed' | 'absolute' | 'relative'
  /** Z-index of the canvas. Default: -1 */
  zIndex?: number
  /** Canvas opacity. Default: 0.8 */
  opacity?: number
  /** Blend mode with page content */
  blendMode?: string
  /** Tracker options override */
  tracker?: Partial<TrackerOptions>
  /** Called when interaction data updates */
  onData?: (data: InteractionData) => void
  /** Additional class name */
  className?: string
  /** Additional styles */
  style?: React.CSSProperties
  /** React children rendered on top */
  children?: React.ReactNode
}

// ─── Color Palettes ──────────────────────────────────────────

export const PALETTES: Record<string, string[]> = {
  ember:    ['#1a0a00', '#4a1500', '#8B2500', '#CD3700', '#FF4500', '#FF6B3D', '#FFAB76', '#FFD4B8'],
  ocean:    ['#000814', '#001D3D', '#003566', '#005B96', '#0077B6', '#00B4D8', '#48CAE4', '#90E0EF'],
  aurora:   ['#0B0C10', '#1A1B2E', '#2C1654', '#4A1A8A', '#6B2FA0', '#8B5CF6', '#A78BFA', '#C4B5FD'],
  forest:   ['#0A1F0A', '#132A13', '#1A4D2E', '#27704B', '#31A060', '#3DDC84', '#6EE7A0', '#A7F3D0'],
  infrared: ['#000000', '#1A0000', '#3D0000', '#6B0000', '#9B0000', '#CC0000', '#FF0000', '#FF4444'],
  plasma:   ['#0D0887', '#3B049A', '#7201A8', '#A62098', '#CC4778', '#E96B5D', '#F89441', '#FDC328'],
  glacier:  ['#0A0A1A', '#0F1B3D', '#142E5E', '#1B4482', '#2563EB', '#60A5FA', '#93C5FD', '#DBEAFE'],
  thermal:  ['#000004', '#1B0C42', '#4A0C6B', '#781C81', '#A52C7A', '#CF4446', '#ED721C', '#FCFFA4'],
}

export const DEFAULT_PALETTE = PALETTES.plasma

// ─── Defaults ────────────────────────────────────────────────

export const DEFAULTS = {
  throttle: 16,
  maxPoints: 50000,
  intensity: 1,
  blur: 40,
  particles: 2000,
  lineOpacity: 0.6,
  speed: 0.5,
  grain: 0.03,
  clickStyle: 'ring' as const,
} as const
