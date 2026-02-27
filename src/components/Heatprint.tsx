import React, { useRef, useEffect, useCallback } from 'react'
import type { HeatprintProps, InteractionData, RenderOptions } from '../types'
import { InteractionTracker } from '../core/tracker'
import { render as renderHeatprint } from '../renderers'
import { DEFAULTS } from '../types'

/**
 * <Heatprint />
 *
 * Drop this on any page to record interactions and render
 * them as generative art on a canvas overlay.
 *
 * ```jsx
 * <Heatprint mode="aurora" opacity={0.6}>
 *   <YourApp />
 * </Heatprint>
 * ```
 */
export function Heatprint({
  mode = 'heat',
  recording = true,
  live = true,
  position = 'fixed',
  zIndex = -1,
  opacity = 0.8,
  blendMode = 'normal',
  background = '#000000',
  palette,
  intensity = DEFAULTS.intensity,
  blur = DEFAULTS.blur,
  particles = DEFAULTS.particles,
  lineOpacity = DEFAULTS.lineOpacity,
  showClicks = true,
  clickStyle = DEFAULTS.clickStyle,
  showScrollDepth = false,
  speed = DEFAULTS.speed,
  grain = DEFAULTS.grain,
  tracker: trackerOpts = {},
  onData,
  className,
  style,
  children,
}: HeatprintProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trackerRef = useRef<InteractionTracker | null>(null)
  const rafRef = useRef<number>(0)
  const lastCount = useRef(0)
  const renderEvery = 80 // Re-render every N new points

  // Initialize tracker
  useEffect(() => {
    const tracker = new InteractionTracker(trackerOpts)
    trackerRef.current = tracker
    if (recording) tracker.start()

    return () => { tracker.destroy() }
  }, [])

  // Toggle recording
  useEffect(() => {
    const tracker = trackerRef.current
    if (!tracker) return
    if (recording) tracker.start()
    else tracker.stop()
  }, [recording])

  // Build render options
  const getRenderOpts = useCallback((): Partial<RenderOptions> => ({
    mode,
    background,
    palette,
    intensity,
    blur,
    particles,
    lineOpacity,
    showClicks,
    clickStyle,
    showScrollDepth,
    speed,
    grain,
  }), [mode, background, palette, intensity, blur, particles, lineOpacity, showClicks, clickStyle, showScrollDepth, speed, grain])

  // Render to canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const tracker = trackerRef.current
    if (!canvas || !tracker) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = window.innerWidth
    const h = position === 'fixed'
      ? window.innerHeight
      : document.documentElement.scrollHeight

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.scale(dpr, dpr)
    }

    const data = tracker.getData()
    renderHeatprint(ctx, data, { ...getRenderOpts(), width: w, height: h })

    if (onData) onData(data)
  }, [position, getRenderOpts, onData])

  // Animation/update loop
  useEffect(() => {
    if (!live) return

    function tick() {
      const tracker = trackerRef.current
      if (tracker && tracker.moveCount - lastCount.current >= renderEvery) {
        lastCount.current = tracker.moveCount
        draw()
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [live, draw])

  // Resize handler
  useEffect(() => {
    const handleResize = () => { draw() }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [draw])

  return (
    <>
      <canvas
        ref={canvasRef}
        className={className}
        style={{
          position,
          top: 0,
          left: 0,
          width: '100%',
          height: position === 'fixed' ? '100vh' : '100%',
          zIndex,
          opacity,
          mixBlendMode: blendMode as React.CSSProperties['mixBlendMode'],
          pointerEvents: 'none',
          ...style,
        }}
      />
      {children}
    </>
  )
}
