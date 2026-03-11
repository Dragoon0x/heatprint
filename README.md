# HEATPRINT

Turn user interactions into generative art.

Track clicks, movements, scrolls, and hovers. Render them as heatmaps, constellations, flow fields, topographic maps, particle trails, aurora, rings, or mesh. Export as PNG.

```
npm install heatprint
```

## Quick Start

```js
import { Heatprint } from 'heatprint'

const hp = new Heatprint({ mode: 'constellation', palette: 'neon' })
hp.start()

// Later: render to a canvas
const canvas = hp.render()
document.body.appendChild(canvas)

// Export as PNG
const png = hp.exportPNG()
```

## 8 Render Modes

| Mode | Description |
|------|------------|
| `heatmap` | Classic density heatmap with smooth gradients |
| `constellation` | Connected dots like star maps with glow |
| `flowfield` | Directional arrows from movement vectors |
| `topographic` | Contour lines like terrain elevation maps |
| `trails` | Fading particle trails following mouse paths |
| `aurora` | Flowing gradient bands from movement density |
| `rings` | Concentric rings at click points |
| `mesh` | Triangulated mesh connecting nearby points |

## 8 Color Palettes

| Palette | Description |
|---------|------------|
| `thermal` | Black → blue → cyan → green → yellow → red → white |
| `ocean` | Deep navy → teal → aqua → foam white |
| `neon` | Dark → magenta → cyan → electric blue |
| `sunset` | Dark purple → orange → gold → pale yellow |
| `monochrome` | Pure white on black, varying opacity |
| `mint` | Dark → emerald → mint → white |
| `lavender` | Dark → indigo → purple → lavender → white |
| `fire` | Black → dark red → orange → yellow → white |

## API

```js
const hp = new Heatprint({
  width: 1440,
  height: 900,
  mode: 'heatmap',
  palette: 'thermal',
  background: '#09090f',
  blur: 20,
  pointRadius: 3,
  connectionDistance: 120,
  sampleRate: 50,
  maxInteractions: 10000,
  hoverThreshold: 500,
})

hp.start()              // Start tracking
hp.stop()               // Stop tracking
hp.render()             // Render to canvas
hp.render('trails')     // Render specific mode
hp.exportPNG()          // Export as data URL
hp.getStats()           // Get interaction statistics
hp.getInteractions()    // Get raw data
hp.exportData()         // Export as JSON
hp.importData(json)     // Import from JSON
hp.clear()              // Clear all data
```

## Stats

```js
const stats = hp.getStats()
// {
//   totalInteractions: 1500,
//   clicks: 42,
//   moves: 1200,
//   scrolls: 180,
//   hovers: 78,
//   hotspots: [{ x: 500, y: 300, intensity: 0.95 }, ...],
//   averageVelocity: 0.34,
//   duration: 120000,
// }
```

## Disclaimer

Experimental, open-source software. Provided as-is with no warranties. DYOR. Use at your own risk.

## License

MIT. Built by 0xDragoon.
