import { useRef, useEffect, useCallback, useState } from 'react'
import { InteractionTracker } from '../core/tracker'
import { render } from '../renderers'
import type { InteractionData, RenderOptions, TrackerOptions } from '../types'

interface UseHeatprintOptions {
  /** Render mode */
  mode?: RenderOptions['mode']
  /** Auto-start recording on mount. Default: true */
  autoStart?: boolean
  /** Re-render on every N new points. Default: 100 */
  renderEvery?: number
  /** Tracker configuration */
  tracker?: Partial<TrackerOptions>
  /** Render configuration */
  render?: Partial<RenderOptions>
}

interface UseHeatprintReturn {
  /** Ref to attach to a canvas element */
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  /** Current interaction data snapshot */
  data: InteractionData | null
  /** Whether the tracker is recording */
  recording: boolean
  /** Start recording */
  start: () => void
  /** Stop recording */
  stop: () => void
  /** Clear all data */
  reset: () => void
  /** Force a re-render */
  redraw: (opts?: Partial<RenderOptions>) => void
  /** Export as PNG data URL */
  toPNG: (opts?: Partial<RenderOptions>) => string | null
  /** Download as PNG */
  download: (filename?: string, opts?: Partial<RenderOptions>) => void
  /** Get JSON export */
  toJSON: () => string | null
  /** Number of recorded move points */
  moveCount: number
  /** Number of recorded clicks */
  clickCount: number
}

export function useHeatprint(options: UseHeatprintOptions = {}): UseHeatprintReturn {
  const {
    mode = 'heat',
    autoStart = true,
    renderEvery = 100,
    tracker: trackerOpts = {},
    render: renderOpts = {},
  } = options

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trackerRef = useRef<InteractionTracker | null>(null)
  const [recording, setRecording] = useState(false)
  const [moveCount, setMoveCount] = useState(0)
  const [clickCount, setClickCount] = useState(0)
  const lastRenderCount = useRef(0)
  const rafRef = useRef<number>(0)

  // Initialize tracker
  useEffect(() => {
    const tracker = new InteractionTracker(trackerOpts)
    trackerRef.current = tracker

    if (autoStart) {
      tracker.start()
      setRecording(true)
    }

    return () => {
      tracker.destroy()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // Periodic render loop
  useEffect(() => {
    function tick() {
      const tracker = trackerRef.current
      if (tracker && tracker.moveCount > 0) {
        setMoveCount(tracker.moveCount)
        setClickCount(tracker.clickCount)

        // Re-render when enough new data has arrived
        if (tracker.moveCount - lastRenderCount.current >= renderEvery) {
          lastRenderCount.current = tracker.moveCount
          redraw()
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [renderEvery])

  const getData = useCallback((): InteractionData | null => {
    return trackerRef.current?.getData() ?? null
  }, [])

  const redraw = useCallback((opts?: Partial<RenderOptions>) => {
    const canvas = canvasRef.current
    const tracker = trackerRef.current
    if (!canvas || !tracker) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const data = tracker.getData()
    const dpr = window.devicePixelRatio || 1

    // Size canvas to parent
    const rect = canvas.parentElement?.getBoundingClientRect() ?? canvas.getBoundingClientRect()
    const w = rect.width
    const h = rect.height

    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    ctx.scale(dpr, dpr)

    render(ctx, data, {
      mode,
      width: w,
      height: h,
      ...renderOpts,
      ...opts,
    })
  }, [mode, renderOpts])

  const start = useCallback(() => {
    trackerRef.current?.start()
    setRecording(true)
  }, [])

  const stop = useCallback(() => {
    trackerRef.current?.stop()
    setRecording(false)
  }, [])

  const reset = useCallback(() => {
    trackerRef.current?.reset()
    setMoveCount(0)
    setClickCount(0)
    lastRenderCount.current = 0
  }, [])

  const toPNG = useCallback((opts?: Partial<RenderOptions>): string | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    redraw(opts)
    return canvas.toDataURL('image/png')
  }, [redraw])

  const download = useCallback((filename = 'heatprint.png', opts?: Partial<RenderOptions>) => {
    const url = toPNG(opts)
    if (!url) return
    const link = document.createElement('a')
    link.download = filename
    link.href = url
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [toPNG])

  const toJSON = useCallback((): string | null => {
    const data = getData()
    return data ? JSON.stringify(data) : null
  }, [getData])

  return {
    canvasRef,
    data: getData(),
    recording,
    start,
    stop,
    reset,
    redraw,
    toPNG,
    download,
    toJSON,
    moveCount,
    clickCount,
  }
}
