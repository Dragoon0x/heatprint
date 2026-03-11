// ═══════════════════════════════════════════
// HEATPRINT — Types
// ═══════════════════════════════════════════

export type InteractionType = 'click' | 'move' | 'scroll' | 'hover' | 'touch'

export interface Interaction {
  x: number
  y: number
  type: InteractionType
  timestamp: number
  /** Duration in ms (for hovers) */
  duration: number
  /** Intensity 0-1 (computed from velocity, duration, etc.) */
  intensity: number
  /** Velocity for moves (px/ms) */
  velocity: number
}

export type RenderMode =
  | 'heatmap'          // Classic density heatmap
  | 'constellation'    // Connected dots like star maps
  | 'flowfield'        // Directional flow field from movement vectors
  | 'topographic'      // Contour lines like terrain maps
  | 'trails'           // Particle trails following mouse paths
  | 'aurora'           // Flowing gradient aurora from scroll + move data
  | 'rings'            // Concentric rings at click points
  | 'mesh'             // Delaunay-style triangulated mesh

export type ColorPalette =
  | 'thermal'          // Black → blue → cyan → green → yellow → red → white
  | 'ocean'            // Deep navy → teal → aqua → foam white
  | 'neon'             // Dark → magenta → cyan → electric blue
  | 'sunset'           // Dark purple → orange → gold → pale yellow
  | 'monochrome'       // Pure white on black, varying opacity
  | 'mint'             // Dark → emerald → mint → white
  | 'lavender'         // Dark → indigo → purple → lavender → white
  | 'fire'             // Black → dark red → orange → yellow → white

export interface HeatprintConfig {
  /** Canvas width. Default: window.innerWidth */
  width?: number
  /** Canvas height. Default: window.innerHeight */
  height?: number
  /** Render mode. Default: 'heatmap' */
  mode?: RenderMode
  /** Color palette. Default: 'thermal' */
  palette?: ColorPalette
  /** Custom colors: array of hex strings from cold to hot */
  colors?: string[]
  /** Blur radius for heatmap mode. Default: 20 */
  blur?: number
  /** Point radius. Default: 3 */
  pointRadius?: number
  /** Line width for connections. Default: 1 */
  lineWidth?: number
  /** Max connection distance for constellation. Default: 120 */
  connectionDistance?: number
  /** Background color. Default: '#09090f' */
  background?: string
  /** Opacity of rendered points. Default: 0.8 */
  opacity?: number
  /** Whether to track mouse moves. Default: true */
  trackMoves?: boolean
  /** Whether to track clicks. Default: true */
  trackClicks?: boolean
  /** Whether to track scrolls. Default: true */
  trackScrolls?: boolean
  /** Whether to track hovers (pause detection). Default: true */
  trackHovers?: boolean
  /** Move sampling rate in ms. Default: 50 */
  sampleRate?: number
  /** Max interactions to store. Default: 10000 */
  maxInteractions?: number
  /** Hover detection threshold in ms. Default: 500 */
  hoverThreshold?: number
}

export interface HeatprintStats {
  totalInteractions: number
  clicks: number
  moves: number
  scrolls: number
  hovers: number
  hotspots: { x: number; y: number; intensity: number }[]
  averageVelocity: number
  duration: number
}
