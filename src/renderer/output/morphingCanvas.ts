import { MORPHING_PRESETS } from '@shared/morphingPresets'
import { getThemeProfileForPreset } from '@shared/morphingThemeProfiles'
import type { BandEnergies, AppSettings, VisualStatePayload } from '@shared/types'

// High-aesthetic Canvas 2D organic visibility boundaries
const ORGANIC_MIN_ALPHA = 0.16
const ORGANIC_MAX_ALPHA = 0.58
const ORGANIC_MIN_LAYER_COUNT = 5
const ORGANIC_MAX_LAYER_COUNT = 12
const ORGANIC_MIN_BLUR = 24
const ORGANIC_MAX_BLUR = 95

const ONIRIC_MIN_SPEED = 0.08
const ONIRIC_MAX_SPEED = 0.22

interface RGBColor {
  r: number
  g: number
  b: number
}

function hexToRgb(hex: string): RGBColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return { r: 255, g: 255, b: 255 }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  }
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function isOrganicPreset(presetId: string): boolean {
  const organicIds = [
    'submerged-organism',
    'spectral-membrane',
    'molten-memory',
    'nocturnal-bloom',
    'dream-plasma',
    'imaginary-friend'
  ]
  return organicIds.includes(presetId)
}

function getLuminance(c: RGBColor): number {
  return 0.2126 * (c.r / 255) + 0.7152 * (c.g / 255) + 0.0722 * (c.b / 255)
}

function computeContrastBoost(bg: RGBColor, fg: RGBColor): number {
  const bgL = getLuminance(bg)
  const fgL = getLuminance(fg)
  return Math.abs(bgL - fgL)
}

function mixColor(c1: RGBColor, c2: RGBColor, ratio: number): RGBColor {
  const k = clamp(ratio, 0, 1)
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * k),
    g: Math.round(c1.g + (c2.g - c1.g) * k),
    b: Math.round(c1.b + (c2.b - c1.b) * k)
  }
}

export function createMorphingCanvas(container: HTMLElement) {
  const canvas = document.createElement('canvas')
  canvas.className = 'morphing-layer'
  canvas.style.position = 'absolute'
  canvas.style.inset = '0'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.pointerEvents = 'none'
  canvas.style.background = 'transparent'
  container.appendChild(canvas)

  const ctx = canvas.getContext('2d')

  let rafId = 0
  let currentSettings: AppSettings | null = null
  let currentBands: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }
  const smoothedBands: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }
  let isFlashing = false
  let currentWhiteMix = 0
  let currentBgColor = '#000000'
  let time = 0
  
  let smoothedMorphingFlash = 0
  let smoothedKickPulse = 0

  const resize = () => {
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight
  }

  window.addEventListener('resize', resize)
  resize()

  const render = () => {
    if (!ctx || !currentSettings) {
      rafId = requestAnimationFrame(render)
      return
    }

    const presetId = currentSettings.morphingPresetId
    const preset = MORPHING_PRESETS.find((p) => p.id === presetId) || MORPHING_PRESETS[0]
    
    // Retrieve theme profile
    const profile = getThemeProfileForPreset(presetId)

    canvas.style.mixBlendMode = preset.blendMode || 'screen'

    // Smoothing band energies for fluid motion
    smoothedBands.low += (currentBands.low - smoothedBands.low) * 0.05
    smoothedBands.lowMid += (currentBands.lowMid - smoothedBands.lowMid) * 0.05
    smoothedBands.mid += (currentBands.mid - smoothedBands.mid) * 0.05
    smoothedBands.high += (currentBands.high - smoothedBands.high) * 0.05

    // Modulazione tramite subMovement e kickMovement del preset audio attivo
    const rawKickPulse = Math.max(0, currentBands.low - smoothedBands.low)
    smoothedKickPulse += (rawKickPulse - smoothedKickPulse) * 0.12
    const kickPulse = smoothedKickPulse * (currentSettings.kickMovement ?? 0.08)
    const subPressure = smoothedBands.low * (currentSettings.subMovement ?? 0.26)

    // Correzione 5: Smoothing del flash nel morphing
    const flashTarget = currentWhiteMix !== 0 ? currentWhiteMix : (isFlashing ? 1 : 0)
    if (flashTarget > smoothedMorphingFlash) {
      smoothedMorphingFlash += (flashTarget - smoothedMorphingFlash) * 0.22
    } else {
      smoothedMorphingFlash += (flashTarget - smoothedMorphingFlash) * 0.045
    }

    const effectiveSpeed = clamp(preset.speed * 1.8, ONIRIC_MIN_SPEED, ONIRIC_MAX_SPEED)

    // Advance time
    time += effectiveSpeed * 0.05 * (1 + smoothedBands.high * preset.highNoiseAmount) * (1 + subPressure * 0.5)

    const w = canvas.width
    const h = canvas.height
    
    // Default spatial center
    let cx = w / 2
    let cy = h / 2

    // Apply spatial bias to basic centers
    if (profile.spatialBias === 'upperSymmetric') {
      cy = h * 0.38
    } else if (profile.spatialBias === 'lateral') {
      cx = w * 0.30
    }

    ctx.clearRect(0, 0, w, h)

    ctx.globalCompositeOperation = preset.blendMode || 'screen'

    // Correzione 1: limiti interni e clamps per visibilità organica aumentata
    let effectiveVeilCount = clamp(Math.round(preset.shapeCount * 2.5 + subPressure * 2.0), ORGANIC_MIN_LAYER_COUNT, ORGANIC_MAX_LAYER_COUNT)
    let effectiveBlur = clamp(preset.blur * 0.72, ORGANIC_MIN_BLUR, ORGANIC_MAX_BLUR)
    let effectiveOpacity = clamp(preset.opacity * 1.15 + subPressure * 0.12 + kickPulse * 0.08, ORGANIC_MIN_ALPHA, ORGANIC_MAX_ALPHA)
    let effectiveScale = clamp(preset.scale * 1.05 + subPressure * 0.20 + kickPulse * 0.10, 0.85, 1.85)

    let midGlowBoost = smoothedBands.mid * preset.midOpacityAmount * 0.58
    let integratedFlashGlowBoost = smoothedMorphingFlash * preset.flashEdgeAmount

    // Correzione 6: Boost di presenza per i preset organici
    if (isOrganicPreset(presetId)) {
      effectiveOpacity *= 1.20
      effectiveBlur *= 0.85
      effectiveVeilCount += 2
      midGlowBoost *= 1.15
      integratedFlashGlowBoost *= 1.20
    }

    // Clamps finali
    effectiveVeilCount = clamp(effectiveVeilCount, ORGANIC_MIN_LAYER_COUNT, ORGANIC_MAX_LAYER_COUNT)
    effectiveOpacity = clamp(effectiveOpacity, ORGANIC_MIN_ALPHA, ORGANIC_MAX_ALPHA)
    effectiveBlur = clamp(effectiveBlur, ORGANIC_MIN_BLUR, ORGANIC_MAX_BLUR)
    effectiveScale = clamp(effectiveScale, 0.85, 1.85)

    const baseColor = hexToRgb(currentSettings.basePinkColor)
    const hotColor = hexToRgb(currentSettings.hotPinkColor)
    const flashColor = hexToRgb(currentSettings.whiteFlashColor)
    const bgColor = hexToRgb(currentBgColor)

    // Correzione 7: Evitare che lo sfondo scuro o simile mangi il morphing
    const luminanceDifference = computeContrastBoost(bgColor, hotColor)
    let contrastOpacityMult = 1.0
    let contrastInnerAlphaMult = 1.0
    let contrastBlurMult = 1.0

    if (luminanceDifference < 0.18) {
      contrastOpacityMult = 1.16
      contrastInnerAlphaMult = 1.18
      contrastBlurMult = 0.90
    }

    let scaleFactor = effectiveScale
    if (profile.spatialBias === 'fieldWide') {
      scaleFactor *= 1.35
    } else if (profile.spatialBias === 'peripheral') {
      scaleFactor *= 1.15
    }

    let baseRadius = Math.min(w, h) * 0.3 * scaleFactor * (1 + subPressure * 1.5 + kickPulse * 0.8)
    
    // Correzione 3: Flash integrated multiplier sul raggio
    baseRadius *= 1 + integratedFlashGlowBoost * 0.18

    let baseOp = effectiveOpacity + midGlowBoost
    if (profile.spatialBias === 'fieldWide') {
      baseOp *= 0.65
    }
    
    // Correzione 3: Flash integrated alpha addition
    let op = baseOp + integratedFlashGlowBoost * 0.16
    op = clamp(op * contrastOpacityMult * contrastInnerAlphaMult, ORGANIC_MIN_ALPHA, ORGANIC_MAX_ALPHA)

    // Correzione 8: Presenza minima del morphing
    const minPresence = isOrganicPreset(presetId) ? 0.12 : 0.08
    op = Math.max(op, minPresence)

    const shapesToDraw = effectiveVeilCount

    for (let i = 0; i < shapesToDraw; i++) {
      const shapeOffset = (i * Math.PI * 2) / shapesToDraw
      
      ctx.beginPath()
      
      const points = 60
      for (let j = 0; j <= points; j++) {
        const angle = (j / points) * Math.PI * 2
        
        let def = preset.deformation + (smoothedBands.lowMid * preset.lowMidDeformationAmount)
        if (profile.density === 'membrane') {
          def *= 1.25
        }
        
        // Multi-layered sine waves for organic irregular blob
        const noise = 
          Math.sin(angle * 2 + time + shapeOffset) * 0.5 + 
          Math.cos(angle * 3 - time * 0.8 + shapeOffset) * 0.3 +
          Math.sin(angle * 5 + time * 1.5) * 0.2
          
        const radiusOffset = baseRadius * def * noise
        const r = baseRadius + radiusOffset
        
        // Symmetrical center displacement formulas
        let localCx = cx
        let localCy = cy

        if (profile.spatialBias === 'fragmented') {
          localCx = cx + Math.cos(time * 0.4 + i * 2.5) * (w * 0.16)
          localCy = cy + Math.sin(time * 0.3 - i * 2.5) * (h * 0.16)
        } else if (profile.spatialBias === 'upperSymmetric' && profile.symmetry === 'bilateralWeak') {
          const spec = i % 2 === 0 ? -1 : 1
          localCx = cx + spec * (w * 0.15) + Math.cos(time * 0.5 + i) * (w * 0.04)
          localCy = cy + Math.sin(time * 0.4 - i) * (h * 0.04)
        } else {
          localCx = cx + Math.cos(time * 0.5 + i) * (w * 0.1)
          localCy = cy + Math.sin(time * 0.4 - i) * (h * 0.1)
        }

        const x = localCx + Math.cos(angle) * r
        const y = localCy + Math.sin(angle) * r
        
        if (j === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.closePath()
      
      const rgbStr = (c: RGBColor, a: number) => `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`

      // Determine main color
      let baseShapeColor = hotColor
      if (i % 2 === 0) {
        baseShapeColor = baseColor
      }

      // Correzione 3: mix intensityColor + flashColor
      const stopColor = mixColor(baseShapeColor, flashColor, integratedFlashGlowBoost)

      let alphaVal = op
      if (i === 1) alphaVal *= 0.8
      if (i === 2) alphaVal *= 0.6

      const fillColor = rgbStr(stopColor, alphaVal)

      ctx.fillStyle = fillColor
      ctx.shadowBlur = clamp(effectiveBlur * contrastBlurMult, ORGANIC_MIN_BLUR, ORGANIC_MAX_BLUR)
      ctx.shadowColor = fillColor
      ctx.fill()
      
      ctx.shadowBlur = 0
    }

    rafId = requestAnimationFrame(render)
  }

  rafId = requestAnimationFrame(render)

  return {
    updateState(payload: VisualStatePayload) {
      if (payload.settings) currentSettings = payload.settings
      if (payload.bandEnergies) currentBands = payload.bandEnergies
      isFlashing = !!payload.flashActive
      if (payload.backgroundColor) currentBgColor = payload.backgroundColor
      if (payload.whiteMix !== undefined) {
        currentWhiteMix = payload.whiteMix
      } else {
        currentWhiteMix = payload.flashActive ? 1 : 0
      }
    },
    destroy() {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      canvas.remove()
    }
  }
}
