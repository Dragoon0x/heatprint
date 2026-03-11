// ═══════════════════════════════════════════
// HEATPRINT — Color Palettes
// ═══════════════════════════════════════════

import type { ColorPalette } from '../types'

export const PALETTES: Record<ColorPalette, string[]> = {
  thermal:    ['#000020', '#0000a0', '#0060c0', '#00c0a0', '#60e040', '#e0e000', '#ff4000', '#ffffff'],
  ocean:      ['#0a1628', '#0d2847', '#0f4c6e', '#129490', '#38c9a8', '#7de8c9', '#b8f5e0', '#e8fdf6'],
  neon:       ['#0a0018', '#2a0050', '#6b0090', '#c020d0', '#e040ff', '#40c0ff', '#00ffcc', '#f0fff0'],
  sunset:     ['#1a0030', '#3d0060', '#800040', '#c03020', '#e07010', '#f0a030', '#ffd060', '#fff4d0'],
  monochrome: ['#000000', '#1a1a1a', '#333333', '#555555', '#888888', '#aaaaaa', '#cccccc', '#ffffff'],
  mint:       ['#0a1a10', '#0d3020', '#106838', '#18a050', '#30d070', '#60e890', '#a0f4c0', '#e0fce8'],
  lavender:   ['#100820', '#201050', '#382080', '#5030b0', '#7848e0', '#a070f0', '#c8a0f8', '#f0e8ff'],
  fire:       ['#000000', '#200000', '#600000', '#a01000', '#d04000', '#f08000', '#ffc020', '#fffff0'],
}

export function getPalette(palette: ColorPalette | undefined, custom: string[] | undefined): string[] {
  if (custom && custom.length >= 2) return custom
  return PALETTES[palette || 'thermal']
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  hex = hex.replace('#', '')
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2]
  return {
    r: parseInt(hex.substr(0, 2), 16),
    g: parseInt(hex.substr(2, 2), 16),
    b: parseInt(hex.substr(4, 2), 16),
  }
}

export function interpolateColor(colors: string[], t: number): { r: number; g: number; b: number } {
  t = Math.max(0, Math.min(1, t))
  const idx = t * (colors.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.min(lo + 1, colors.length - 1)
  const frac = idx - lo

  const c1 = hexToRgb(colors[lo])
  const c2 = hexToRgb(colors[hi])

  return {
    r: Math.round(c1.r + (c2.r - c1.r) * frac),
    g: Math.round(c1.g + (c2.g - c1.g) * frac),
    b: Math.round(c1.b + (c2.b - c1.b) * frac),
  }
}
