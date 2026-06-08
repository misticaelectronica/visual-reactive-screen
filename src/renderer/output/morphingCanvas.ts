import { MORPHING_PRESETS } from '@shared/morphingPresets'
import { getThemeProfileForPreset } from '@shared/morphingThemeProfiles'
import type { BandEnergies, AppSettings, VisualStatePayload } from '@shared/types'

// High-aesthetic Canvas 2D organic visibility boundaries
const ORGANIC_MIN_ALPHA = 0.22
const ORGANIC_MAX_ALPHA = 0.72
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

function seededUnit(seed: number, index: number): number {
  const x = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453
  return x - Math.floor(x)
}

function isOrganicPreset(presetId: string): boolean {
  const organicIds = [
    'submerged-organism',
    'spectral-membrane',
    'molten-memory',
    'nocturnal-bloom',
    'dream-plasma',
    'imaginary-friend',
    'alien-contact'
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
  let smoothedRadius = 0
  let smoothedOpacity = 0
  let smoothedScale = 1
  let smoothedCx = 0
  let smoothedCy = 0
  let lastRenderAt = 0

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

    const targetFrameMs = currentSettings.lowPowerMode === true ? 1000 / 30 : 1000 / 60
    const now = performance.now()
    if (now - lastRenderAt < targetFrameMs) {
      rafId = requestAnimationFrame(render)
      return
    }
    lastRenderAt = now

    const presetId = currentSettings.morphingPresetId
    const preset = MORPHING_PRESETS.find((p) => p.id === presetId) || MORPHING_PRESETS[0]
    
    // Retrieve theme profile
    const profile = getThemeProfileForPreset(presetId)

    canvas.style.mixBlendMode = preset.blendMode || 'screen'

    // Smoothing band energies for fluid motion
    smoothedBands.low += (currentBands.low - smoothedBands.low) * 0.12
    smoothedBands.lowMid += (currentBands.lowMid - smoothedBands.lowMid) * 0.13
    smoothedBands.mid += (currentBands.mid - smoothedBands.mid) * 0.14
    smoothedBands.high += (currentBands.high - smoothedBands.high) * 0.10

    // Modulazione tramite subMovement e kickMovement del preset audio attivo
    const rawKickPulse = Math.max(0, currentBands.low - smoothedBands.low)
    smoothedKickPulse += (rawKickPulse - smoothedKickPulse) * 0.24
    const kickPulse = clamp(smoothedKickPulse * (currentSettings.kickMovement ?? 0.08) * 2.8, 0, 0.55)
    const subPressure = clamp(smoothedBands.low * (currentSettings.subMovement ?? 0.26) * 1.55, 0, 0.85)
    const beatDrive = clamp(kickPulse * 1.45 + Math.max(0, currentBands.lowMid - smoothedBands.lowMid) * 0.85, 0, 0.95)
    const rhythmicDetail = clamp(currentBands.high * preset.highNoiseAmount * 1.8, 0, 0.55)

    // Correzione 5: Smoothing del flash nel morphing
    const flashTarget = currentWhiteMix !== 0 ? currentWhiteMix : (isFlashing ? 1 : 0)
    if (flashTarget > smoothedMorphingFlash) {
      smoothedMorphingFlash += (flashTarget - smoothedMorphingFlash) * 0.22
    } else {
      smoothedMorphingFlash += (flashTarget - smoothedMorphingFlash) * 0.045
    }

    const effectiveSpeed = clamp(preset.speed * (2.15 + beatDrive * 1.20 + rhythmicDetail * 0.55), ONIRIC_MIN_SPEED, ONIRIC_MAX_SPEED * 1.22)

    // Advance time
    time += effectiveSpeed * 0.05 * (1 + rhythmicDetail * 1.45) * (1 + subPressure * 0.65 + beatDrive * 0.95)

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
    } else if (profile.spatialBias === 'contactBridge') {
      cx = w * 0.50
      cy = h * 0.48
    }

    ctx.clearRect(0, 0, w, h)

    ctx.globalCompositeOperation = preset.blendMode || 'screen'

    // Correzione 1: limiti interni e clamps per visibilità organica aumentata
    let effectiveVeilCount = clamp(Math.round(preset.shapeCount * 2.5 + subPressure * 2.6 + beatDrive * 2.0), ORGANIC_MIN_LAYER_COUNT, ORGANIC_MAX_LAYER_COUNT)
    let effectiveBlur = clamp(preset.blur * 0.58, ORGANIC_MIN_BLUR, ORGANIC_MAX_BLUR)
    let effectiveOpacity = clamp(preset.opacity * 1.42 + subPressure * 0.26 + beatDrive * 0.32, ORGANIC_MIN_ALPHA, ORGANIC_MAX_ALPHA)
    let effectiveScale = clamp(preset.scale * 1.10 + subPressure * 0.44 + beatDrive * 0.38, 0.85, 2.08)

    let midGlowBoost = (smoothedBands.mid * 0.55 + currentBands.mid * 0.45) * preset.midOpacityAmount * 0.78
    let integratedFlashGlowBoost = smoothedMorphingFlash

    // Correzione 6: Boost di presenza per i preset organici
    if (isOrganicPreset(presetId)) {
      effectiveOpacity *= 1.28
      effectiveBlur *= 0.80
      effectiveVeilCount += 2
      midGlowBoost *= 1.15
      integratedFlashGlowBoost *= 1.20
    }

    // Clamps finali
    effectiveVeilCount = clamp(effectiveVeilCount, ORGANIC_MIN_LAYER_COUNT, ORGANIC_MAX_LAYER_COUNT)
    if (currentSettings.lowPowerMode === true) {
      effectiveVeilCount = Math.min(effectiveVeilCount, 7)
    }
    effectiveOpacity = clamp(effectiveOpacity, ORGANIC_MIN_ALPHA, ORGANIC_MAX_ALPHA)
    effectiveBlur = clamp(effectiveBlur, ORGANIC_MIN_BLUR, ORGANIC_MAX_BLUR)
    effectiveScale = clamp(effectiveScale, 0.85, 1.95)

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
    } else if (profile.spatialBias === 'contactBridge') {
      scaleFactor *= 0.92
    }

    let baseRadius = Math.min(w, h) * 0.3 * scaleFactor * (1 + subPressure * 1.5 + beatDrive * 1.15)
    
    // Correzione 3: Flash integrated multiplier sul raggio
    baseRadius *= 1 + integratedFlashGlowBoost * 0.08
    smoothedRadius += (baseRadius - smoothedRadius) * (smoothedRadius === 0 ? 1 : 0.18)

    let baseOp = effectiveOpacity + midGlowBoost
    if (profile.spatialBias === 'fieldWide') {
      baseOp *= 0.65
    }
    
    // Correzione 3: Flash integrated alpha addition
    let op = baseOp + integratedFlashGlowBoost * 0.16
    op = clamp(op * contrastOpacityMult * contrastInnerAlphaMult, ORGANIC_MIN_ALPHA, ORGANIC_MAX_ALPHA)
    smoothedOpacity += (op - smoothedOpacity) * (smoothedOpacity === 0 ? 1 : 0.20)
    smoothedScale += (effectiveScale - smoothedScale) * 0.15

    // Correzione 8: Presenza minima del morphing
    const minPresence = isOrganicPreset(presetId) ? 0.12 : 0.08
    op = Math.max(smoothedOpacity, minPresence)
    baseRadius = smoothedRadius * (1 + (smoothedScale - effectiveScale) * 0.08 + beatDrive * 0.10)
    smoothedCx += (cx - smoothedCx) * (smoothedCx === 0 ? 1 : 0.12)
    smoothedCy += (cy - smoothedCy) * (smoothedCy === 0 ? 1 : 0.12)

    const shapesToDraw = effectiveVeilCount

    for (let i = 0; i < shapesToDraw; i++) {
      const shapeOffset = (i * Math.PI * 2) / shapesToDraw
      
      ctx.beginPath()
      
      const points = 60
      for (let j = 0; j <= points; j++) {
        const angle = (j / points) * Math.PI * 2
        
        let def = preset.deformation + (smoothedBands.lowMid * preset.lowMidDeformationAmount * 0.72) + beatDrive * 0.18
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
        let localCx = smoothedCx
        let localCy = smoothedCy

        if (profile.spatialBias === 'fragmented') {
          localCx = smoothedCx + Math.cos(time * 0.32 + i * 2.5) * (w * 0.14)
          localCy = smoothedCy + Math.sin(time * 0.25 - i * 2.5) * (h * 0.14)
        } else if (profile.spatialBias === 'upperSymmetric' && profile.symmetry === 'bilateralWeak') {
          const spec = i % 2 === 0 ? -1 : 1
          localCx = smoothedCx + spec * (w * 0.15) + Math.cos(time * 0.36 + i) * (w * 0.035)
          localCy = smoothedCy + Math.sin(time * 0.30 - i) * (h * 0.035)
        } else if (profile.spatialBias === 'contactBridge') {
          const lane = i % 3
          const pulse = Math.sin(time * 1.6 + i * 0.8)
          if (lane === 0) {
            localCx = w * 0.24 + Math.cos(time * 0.22 + i) * w * 0.035
            localCy = h * 0.50 + Math.sin(time * 0.28 + i) * h * 0.16
          } else if (lane === 1) {
            localCx = w * 0.76 + Math.cos(time * 0.18 + i) * w * 0.045
            localCy = h * 0.44 + Math.sin(time * 0.24 + i) * h * 0.20
          } else {
            localCx = w * (0.40 + seededUnit(i + 17, 2) * 0.20) + pulse * w * 0.055
            localCy = h * (0.40 + seededUnit(i + 23, 3) * 0.20) + Math.cos(time * 1.2 + i) * h * 0.045
          }
        } else {
          localCx = smoothedCx + Math.cos(time * 0.34 + i) * (w * 0.085)
          localCy = smoothedCy + Math.sin(time * 0.28 - i) * (h * 0.085)
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
      const stopColor = mixColor(baseShapeColor, flashColor, integratedFlashGlowBoost * 0.28)

      let alphaVal = op
      if (i === 1) alphaVal *= 0.8
      if (i === 2) alphaVal *= 0.6

      const fillColor = rgbStr(stopColor, alphaVal)

      ctx.fillStyle = fillColor
      ctx.shadowBlur = clamp(effectiveBlur * contrastBlurMult + integratedFlashGlowBoost * 26, ORGANIC_MIN_BLUR, ORGANIC_MAX_BLUR + 28)
      ctx.shadowColor = fillColor
      ctx.fill()
      
      ctx.shadowBlur = 0
    }

    if (profile.spatialBias === 'contactBridge') {
      const signalPulse = 0.5 + Math.sin(time * (2.8 + beatDrive * 2.4) + currentBands.high * 10) * 0.5
      const bridgeAlpha = clamp(op * (0.38 + signalPulse * 0.30) + currentBands.mid * 0.14 + beatDrive * 0.18, 0.12, 0.58)
      const bridgeColor = mixColor(hotColor, flashColor, clamp(0.14 + smoothedMorphingFlash * 0.35, 0, 0.55))
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.shadowBlur = clamp(effectiveBlur * 0.42 + signalPulse * 18, 12, 42)
      ctx.shadowColor = `rgba(${bridgeColor.r}, ${bridgeColor.g}, ${bridgeColor.b}, ${bridgeAlpha})`
      for (let lane = 0; lane < 5; lane++) {
        const u = lane / 4
        const y = h * (0.28 + u * 0.42) + Math.sin(time * 1.1 + lane) * h * 0.025
        const kink = Math.sin(time * 1.7 + lane * 1.9) * h * 0.055
        ctx.beginPath()
        ctx.strokeStyle = `rgba(${bridgeColor.r}, ${bridgeColor.g}, ${bridgeColor.b}, ${bridgeAlpha * (0.58 + u * 0.24)})`
        ctx.lineWidth = clamp(w * (0.0045 + signalPulse * 0.002 + beatDrive * 0.0025), 2, 10)
        ctx.moveTo(w * 0.29, y)
        ctx.bezierCurveTo(w * 0.40, y - kink, w * 0.58, y + kink, w * 0.71, y + Math.sin(time + lane) * h * 0.018)
        ctx.stroke()
      }
      ctx.restore()
    }

    rafId = requestAnimationFrame(render)
  }

  rafId = requestAnimationFrame(render)

  return {
    setOpacity(opacity: number) {
      canvas.style.opacity = String(clamp(opacity, 0, 1))
    },
    updateState(payload: VisualStatePayload) {
      if (payload.settings) currentSettings = payload.settings
      if (payload.bandEnergies) currentBands = payload.bandEnergies
      isFlashing = !!payload.flashActive
      if (payload.backgroundColor) currentBgColor = payload.backgroundColor
      if (payload.flashIntensity !== undefined) {
        currentWhiteMix = payload.flashIntensity
      } else if (payload.whiteMix !== undefined) {
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
