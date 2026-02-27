# heatprint

> Experimental software. DYOR. Use at your own risk. No data leaves the browser.

Turn user interactions into generative art. Drop it on any page.

```
npm install heatprint
```

Heatprint silently records cursor movement, clicks, and scroll depth. Then renders it all as a beautiful visualization. Heat gradients, flowing trails, constellation maps, flow fields, topographic contours, or aurora ribbons. Same data, six visual styles.

Every person's interaction portrait is different.

## Quick start

```jsx
import { Heatprint } from 'heatprint'

function App() {
  return (
    <Heatprint mode="aurora" opacity={0.6}>
      <YourApp />
    </Heatprint>
  )
}
```

One component. It wraps your app, records everything, and renders the visualization as a canvas overlay. No backend, no analytics service, no API keys. Everything stays in the browser.

## Modes

Six visualization styles from the same interaction data.

```jsx
<Heatprint mode="heat" />          // Classic density gradient
<Heatprint mode="trails" />        // Flowing particle trails
<Heatprint mode="constellation" /> // Connected star map
<Heatprint mode="flow" />          // Wind-like flow field
<Heatprint mode="topography" />    // Contour elevation map
<Heatprint mode="aurora" />        // Northern lights ribbons
```

## Color palettes

Eight built-in palettes. Pass your own array of hex colors for custom ones.

```jsx
import { PALETTES } from 'heatprint'

<Heatprint mode="heat" palette={PALETTES.ember} />
<Heatprint mode="trails" palette={PALETTES.ocean} />
<Heatprint mode="constellation" palette={PALETTES.glacier} />

// Custom palette
<Heatprint palette={['#000', '#1a0a2e', '#4a0e8f', '#7b2ff7', '#c084fc']} />
```

Built-in palettes: `ember`, `ocean`, `aurora`, `forest`, `infrared`, `plasma`, `glacier`, `thermal`.

## The useHeatprint hook

For full control over when to record, render, and export.

```jsx
import { useHeatprint } from 'heatprint'

function CustomViz() {
  const {
    canvasRef,
    recording,
    start,
    stop,
    reset,
    redraw,
    download,
    moveCount,
    clickCount,
  } = useHeatprint({
    mode: 'constellation',
    autoStart: true,
    renderEvery: 50,
    render: {
      palette: ['#000', '#003566', '#0077B6', '#48CAE4'],
      intensity: 1.5,
    },
  })

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <canvas ref={canvasRef} />
      <button onClick={() => download('my-heatprint.png')}>
        Save ({moveCount} points)
      </button>
    </div>
  )
}
```

## Vanilla JS (no React)

Heatprint works without React. Use the tracker and renderers directly.

```js
import { InteractionTracker, render, exportPNG } from 'heatprint'

const tracker = new InteractionTracker()
tracker.start()

// Later: render to any canvas
const canvas = document.querySelector('canvas')
const ctx = canvas.getContext('2d')
const data = tracker.getData()

render(ctx, data, {
  mode: 'flow',
  width: canvas.width,
  height: canvas.height,
  palette: ['#000', '#4A1A8A', '#8B5CF6', '#C4B5FD'],
})

// Export as PNG
const dataUrl = exportPNG(data, { mode: 'aurora' })
```

## Export and share

Every heatprint is unique. Export as PNG to share.

```jsx
import { downloadPNG, exportJSON, importJSON } from 'heatprint'

// Save the image
downloadPNG(data, 'heatprint.png', { mode: 'aurora' })

// Save raw data for later replay
const json = exportJSON(data)
localStorage.setItem('heatprint-data', json)

// Load saved data
const saved = importJSON(localStorage.getItem('heatprint-data'))
render(ctx, saved, { mode: 'constellation' })
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `mode` | `RenderMode` | `'heat'` | Visualization style |
| `recording` | `boolean` | `true` | Whether to record interactions |
| `live` | `boolean` | `true` | Re-render as data comes in |
| `position` | `'fixed' \| 'absolute' \| 'relative'` | `'fixed'` | Canvas positioning |
| `zIndex` | `number` | `-1` | Canvas z-index |
| `opacity` | `number` | `0.8` | Canvas opacity |
| `blendMode` | `string` | `'normal'` | CSS mix-blend-mode |
| `background` | `string` | `'#000000'` | Background color |
| `palette` | `string[]` | plasma | Color palette (array of hex) |
| `intensity` | `number` | `1` | Visualization intensity (0.1-5) |
| `blur` | `number` | `40` | Heat mode blur radius |
| `particles` | `number` | `2000` | Particle count for trails/flow |
| `lineOpacity` | `number` | `0.6` | Line opacity (0-1) |
| `showClicks` | `boolean` | `true` | Render click markers |
| `clickStyle` | `'ring' \| 'burst' \| 'dot' \| 'ripple'` | `'ring'` | Click marker style |
| `speed` | `number` | `0.5` | Animation speed (0-1) |
| `grain` | `number` | `0.03` | Film grain overlay |
| `onData` | `(data) => void` | | Data update callback |

## How it works

The tracker records `mousemove`, `click`, and `scroll` events. Coordinates are normalized to 0-1 (viewport-relative for moves, document-relative for scroll). Data stays in a flat array with timestamps for temporal rendering.

Each renderer takes the same interaction data and interprets it differently. The heat renderer builds a density grid and blurs it. The constellation renderer samples points and connects nearby ones. The aurora renderer builds spline ribbons from continuous cursor paths. All rendering happens on a single canvas with `requestAnimationFrame`.

Total bundle size is under 8KB gzipped. No runtime dependencies beyond React (optional).

## Disclaimer

This is experimental, open-source software provided as-is. No warranties, no guarantees. Use at your own risk. Do your own research before using in production. The author assumes no liability for any issues arising from the use of this software.

All interaction data stays client-side. Heatprint does not transmit, store, or collect any user data. No analytics, no tracking servers, no third-party calls. Everything lives and dies in the browser.

## License

MIT. Built by 0xDragoon.
