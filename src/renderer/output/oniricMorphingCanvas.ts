import { MORPHING_PRESETS } from '@shared/morphingPresets'
import type { BandEnergies, AppSettings, VisualStatePayload } from '@shared/types'

export function createOniricMorphingCanvas(container: HTMLElement) {
  const canvas = document.createElement('canvas')
  canvas.style.position = 'absolute'
  canvas.style.inset = '0'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.pointerEvents = 'none'
  container.appendChild(canvas)

  const ctx = canvas.getContext('2d')

  let rafId = 0
  let currentSettings: AppSettings | null = null
  let currentBands: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }
  let isFlashing = false
  let time = 0
  let lastTime = performance.now()

  // Internal smoothed state
  let smoothedLow = 0
  let smoothedLowMid = 0
  let smoothedMid = 0
  let smoothedHigh = 0
  let smoothedFlash = 0

  const resize = () => {
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight
  }

  window.addEventListener('resize', resize)
  resize()

  const hexToRgba = (hex: string, alpha: number) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return `rgba(255, 255, 255, ${alpha})`
    return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`
  }

  // Stable seed
  const stableSeed = (index: number) => index * 12.9898 + 78.233

  // Distributed positions
  function getBasePosition(index: number, seed: number, width: number, height: number) {
    const positions = [
      { x: -0.10, y: 0.35 },
      { x: 0.75, y: 0.15 },
      { x: 0.35, y: 0.85 },
      { x: 1.10, y: 0.65 },
      { x: 0.20, y: -0.10 },
      { x: 0.55, y: 0.45 }
    ]
    const p = positions[index % positions.length]
    return {
      x: p.x * width + Math.sin(seed) * width * 0.08,
      y: p.y * height + Math.cos(seed) * height * 0.08
    }
  }

  function clamp(val: number, min: number, max: number) {
    return Math.max(min, Math.min(max, val))
  }

  const render = (now: number) => {
    if (!ctx || !currentSettings) {
      rafId = requestAnimationFrame(render)
      return
    }

    const dt = now - lastTime
    lastTime = now

    const presetId = currentSettings.morphingPresetId
    const preset = MORPHING_PRESETS.find((p) => p.id === presetId) || MORPHING_PRESETS[0]

    // Smoothing internally with specific factors
    smoothedLow += (currentBands.low - smoothedLow) * 0.015
    smoothedLowMid += (currentBands.lowMid - smoothedLowMid) * 0.020
    smoothedMid += (currentBands.mid - smoothedMid) * 0.025
    smoothedHigh += (currentBands.high - smoothedHigh) * 0.010
    
    const targetFlash = isFlashing ? 1 : 0
    const flashSmoothingFactor = targetFlash > smoothedFlash ? 0.040 : 0.010
    smoothedFlash += (targetFlash - smoothedFlash) * flashSmoothingFactor

    // Advance time
    time += dt

    const width = canvas.width
    const height = canvas.height
    const t = time * 0.001

    // Background persistence
    ctx.globalCompositeOperation = 'source-over'
    ctx.filter = 'none'
    ctx.globalAlpha = 1
    ctx.fillStyle = hexToRgba(currentSettings.idleColor, 0.14)
    ctx.fillRect(0, 0, width, height)

    // Preset base calculation
    const effectiveBlur = Math.max(80, preset.blur * 1.6)
    const effectiveSpeed = preset.speed * 0.35
    const effectiveScale = preset.scale * 1.55
    const effectiveOpacity = preset.opacity * 0.50

    // Audio calculation
    const pressure = smoothedLow * preset.lowScaleAmount * 0.20
    const density = smoothedLowMid * preset.lowMidDeformationAmount * 0.35
    const presence = smoothedMid * preset.midOpacityAmount * 0.60
    const microInstability = smoothedHigh * preset.highNoiseAmount * 0.20
    const atmosphericGlow = smoothedFlash * preset.flashEdgeAmount * 0.15

    for (let index = 0; index < preset.shapeCount; index++) {
      const seed = stableSeed(index)

      const basePos = getBasePosition(index, seed, width, height)
      
      const driftX = Math.sin(t * effectiveSpeed * 0.37 + seed) * width * 0.08
      const driftY = Math.cos(t * effectiveSpeed * 0.29 + seed) * height * 0.08

      const densityX = Math.sin(t * 0.017 + seed) * density * width * 0.08
      const densityY = Math.cos(t * 0.019 + seed) * density * height * 0.08

      const x = basePos.x + driftX + densityX
      const y = basePos.y + driftY + densityY

      const radiusBase = Math.max(width, height) * effectiveScale * (0.35 + (Math.sin(seed) * 0.1))
      const radius = radiusBase * (1 + pressure)

      let ellipseX = 1.0 + Math.sin(t * effectiveSpeed * 0.23 + seed) * 0.25
      let ellipseY = 0.65 + Math.cos(t * effectiveSpeed * 0.19 + seed) * 0.25

      ellipseX += density * 0.12
      ellipseY -= density * 0.08

      const alphaDrift = Math.cos(t * effectiveSpeed * 0.17 + seed) * 0.12
      let alpha = effectiveOpacity + presence + atmosphericGlow
      alpha *= 0.75 + alphaDrift
      alpha = clamp(alpha, 0.02, 0.38)

      // Draw large blurred gradient ellipse
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(ellipseX, ellipseY)
      // Apply micro instability
      ctx.rotate(Math.sin(t * 2 + seed) * microInstability)

      ctx.filter = `blur(${effectiveBlur}px)`
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = preset.blendMode as GlobalCompositeOperation || 'screen'

      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
      
      const innerAlpha = alpha * 0.22
      const midAlpha = alpha * 0.16 + presence * 0.10
      const outerAlpha = alpha * 0.06
      const flashAlpha = atmosphericGlow * 0.10

      gradient.addColorStop(0.00, hexToRgba(currentSettings.basePinkColor, innerAlpha))
      gradient.addColorStop(0.35, hexToRgba(currentSettings.hotPinkColor, midAlpha))
      gradient.addColorStop(0.68, hexToRgba(currentSettings.basePinkColor, outerAlpha + flashAlpha))
      gradient.addColorStop(1.00, 'rgba(0,0,0,0)')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(0, 0, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    ctx.globalAlpha = 1
    ctx.filter = 'none'
    ctx.globalCompositeOperation = 'source-over'

    rafId = requestAnimationFrame(render)
  }

  rafId = requestAnimationFrame(render)

  return {
    updateState(payload: VisualStatePayload) {
      if (payload.settings) currentSettings = payload.settings
      if (payload.bandEnergies) currentBands = payload.bandEnergies
      isFlashing = payload.flashActive
    },
    destroy() {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      canvas.remove()
    }
  }
}
