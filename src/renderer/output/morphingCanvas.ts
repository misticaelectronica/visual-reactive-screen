import { MORPHING_PRESETS } from '@shared/morphingPresets'
import type { BandEnergies, AppSettings, VisualStatePayload } from '@shared/types'

export function createMorphingCanvas(container: HTMLElement) {
  const canvas = document.createElement('canvas')
  canvas.style.position = 'absolute'
  canvas.style.inset = '0'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  // The canvas should not block pointer events, though output is mostly display-only
  canvas.style.pointerEvents = 'none'
  container.appendChild(canvas)

  const ctx = canvas.getContext('2d')

  let rafId = 0
  let currentSettings: AppSettings | null = null
  let currentBands: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }
  let smoothedBands: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }
  let isFlashing = false
  let time = 0

  const resize = () => {
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight
  }

  window.addEventListener('resize', resize)
  resize()

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '255, 255, 255'
  }

  const render = () => {
    if (!ctx || !currentSettings) {
      rafId = requestAnimationFrame(render)
      return
    }

    const presetId = currentSettings.morphingPresetId
    const preset = MORPHING_PRESETS.find((p) => p.id === presetId) || MORPHING_PRESETS[0]

    // Smoothing band energies for fluid motion
    smoothedBands.low += (currentBands.low - smoothedBands.low) * 0.05
    smoothedBands.lowMid += (currentBands.lowMid - smoothedBands.lowMid) * 0.05
    smoothedBands.mid += (currentBands.mid - smoothedBands.mid) * 0.05
    smoothedBands.high += (currentBands.high - smoothedBands.high) * 0.05

    // Advance time
    time += preset.speed * 0.05 * (1 + smoothedBands.high * preset.highNoiseAmount)

    const w = canvas.width
    const h = canvas.height
    const cx = w / 2
    const cy = h / 2

    ctx.clearRect(0, 0, w, h)

    ctx.globalCompositeOperation = preset.blendMode

    const baseRadius = Math.min(w, h) * 0.3 * preset.scale * (1 + smoothedBands.low * preset.lowScaleAmount)
    
    // Convert colors for opacity usage
    const baseRgb = hexToRgb(currentSettings.basePinkColor)
    const hotRgb = hexToRgb(currentSettings.hotPinkColor)
    const flashRgb = hexToRgb(currentSettings.whiteFlashColor)

    const op = Math.min(1, preset.opacity + (smoothedBands.mid * preset.midOpacityAmount))

    for (let i = 0; i < preset.shapeCount; i++) {
      const shapeOffset = (i * Math.PI * 2) / preset.shapeCount
      
      ctx.beginPath()
      
      const points = 60
      for (let j = 0; j <= points; j++) {
        const angle = (j / points) * Math.PI * 2
        
        const def = preset.deformation + (smoothedBands.lowMid * preset.lowMidDeformationAmount)
        
        // Multi-layered sine waves for organic irregular blob
        const noise = 
          Math.sin(angle * 2 + time + shapeOffset) * 0.5 + 
          Math.cos(angle * 3 - time * 0.8 + shapeOffset) * 0.3 +
          Math.sin(angle * 5 + time * 1.5) * 0.2
          
        const radiusOffset = baseRadius * def * noise
        const r = baseRadius + radiusOffset
        
        // Add subtle movement to center per shape
        const localCx = cx + Math.cos(time * 0.5 + i) * (w * 0.1)
        const localCy = cy + Math.sin(time * 0.4 - i) * (h * 0.1)

        const x = localCx + Math.cos(angle) * r
        const y = localCy + Math.sin(angle) * r
        
        if (j === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.closePath()
      
      // Determine color
      let fillColor = `rgba(${baseRgb}, ${op})`
      if (i === 1) {
        fillColor = `rgba(${hotRgb}, ${op * 0.8})`
      } else if (i === 2) {
        // Flash edge effect mixed into the inner shape
        if (isFlashing) {
          fillColor = `rgba(${flashRgb}, ${op * preset.flashEdgeAmount})`
        } else {
          fillColor = `rgba(${baseRgb}, ${op * 0.6})`
        }
      }

      ctx.fillStyle = fillColor
      // Use shadow blur for soft edges
      ctx.shadowBlur = preset.blur
      ctx.shadowColor = fillColor
      ctx.fill()
      
      // Reset shadow for next shapes to not stack unpredictably
      ctx.shadowBlur = 0
    }

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
