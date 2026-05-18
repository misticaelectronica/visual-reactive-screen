import { MORPHING_PRESETS } from '@shared/morphingPresets'
import { getThemeProfileForPreset, MorphingThemeProfile } from '@shared/morphingThemeProfiles'
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

interface Point {
  x: number
  y: number
}

interface MotionVector {
  driftX: number
  driftY: number
  rotation: number
}

interface VeilGeometry {
  ellipseX: number
  ellipseY: number
  radiusPulse: number
  alphaPulse: number
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

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function validBlendModeOrScreen(mode: any): GlobalCompositeOperation {
  const validModes: GlobalCompositeOperation[] = [
    'screen', 'lighten', 'source-over', 'multiply', 'color-dodge', 'overlay', 'color-burn', 'hard-light', 'difference', 'exclusion'
  ]
  if (validModes.includes(mode)) return mode
  return 'screen'
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

// 1. Procedural layout based on spatialBias
function computeBasePositions(
  profile: MorphingThemeProfile,
  count: number,
  width: number,
  height: number
): Point[] {
  const points: Point[] = []
  
  const baseGrid = [
    [-0.12, 0.22],
    [0.28, 0.12],
    [0.72, 0.18],
    [1.10, 0.38],
    [0.88, 0.78],
    [0.55, 1.08],
    [0.18, 0.84],
    [-0.08, 0.62],
    [0.44, 0.46],
    [0.68, 0.58],
    [0.30, -0.10],
    [1.05, 0.88],
    [0.08, 1.08],
    [0.92, -0.08]
  ]

  for (let i = 0; i < count; i++) {
    const gridVal = baseGrid[i % baseGrid.length]
    let px = gridVal[0]
    let py = gridVal[1]

    if (profile.spatialBias === 'upperSymmetric') {
      const spec = i % 2 === 0 ? -1 : 1
      px = 0.5 + spec * 0.22
      py = 0.28 + (i * 0.03)
    } else if (profile.spatialBias === 'peripheral') {
      const angle = (i / count) * Math.PI * 2
      px = 0.5 + Math.cos(angle) * 0.44
      py = 0.5 + Math.sin(angle) * 0.44
    } else if (profile.spatialBias === 'lateral') {
      px = 0.22 + (i * 0.04)
      py = 0.45 + (i % 2 === 0 ? -1 : 1) * 0.18
    } else if (profile.spatialBias === 'fragmented') {
      px = 0.15 + (i * 0.7) / count
      py = 0.15 + (i * 0.7) / count
    } else if (profile.spatialBias === 'fieldWide') {
      px = 0.10 + (i % 3) * 0.40
      py = 0.10 + Math.floor(i / 3) * 0.35
    }

    points.push({ x: px * width, y: py * height })
  }

  return points
}

// 2. Procedural movement based on motion
function computeMotionVector(
  profile: MorphingThemeProfile,
  t: number,
  speed: number,
  phase: number,
  width: number,
  height: number
): MotionVector {
  let speedMult = 1.0
  if (profile.motion === 'mechanical') {
    speedMult = 0.75
  } else if (profile.motion === 'biological') {
    speedMult = 1.25
  } else if (profile.motion === 'afterimage') {
    speedMult = 0.35
  } else if (profile.motion === 'signalPulse') {
    speedMult = 0.50
  }

  const s = speed * speedMult

  let driftX =
    Math.sin(t * s * 0.83 + phase) * width * 0.13 +
    Math.sin(t * s * 0.31 + phase * 1.7) * width * 0.07 +
    Math.cos(t * s * 0.17 + phase * 2.3) * width * 0.035

  let driftY =
    Math.cos(t * s * 0.71 + phase * 1.2) * height * 0.11 +
    Math.sin(t * s * 0.27 + phase * 0.8) * height * 0.06 +
    Math.cos(t * s * 0.13 + phase * 2.8) * height * 0.035

  let rotation =
    Math.sin(t * s * 0.19 + phase) * 0.65 +
    Math.cos(t * s * 0.07 + phase * 1.4) * 0.35

  if (profile.motion === 'mechanical') {
    const steps = 10
    const steppedT = Math.floor(t * steps) / steps
    driftX = Math.sin(steppedT * s * 0.83 + phase) * width * 0.12
    driftY = Math.cos(steppedT * s * 0.71 + phase * 1.2) * height * 0.10
    rotation = Math.sin(steppedT * s * 0.19 + phase) * 0.55
  } else if (profile.motion === 'biological') {
    const pulse = Math.sin(t * s * 1.45 + phase) * Math.cos(t * s * 0.55)
    driftX += pulse * width * 0.04
    driftY += pulse * height * 0.04
  } else if (profile.motion === 'signalPulse') {
    const pulse = Math.sin(t * s * 2.0 + phase)
    driftX += pulse * width * 0.02
    driftY += pulse * height * 0.02
    rotation *= 0.15
  }

  return { driftX, driftY, rotation }
}

// 3. Procedural geometries based on density
function computeVeilGeometry(
  profile: MorphingThemeProfile,
  t: number,
  speed: number,
  phase: number
): VeilGeometry {
  let ellipseX =
    0.75 +
    Math.sin(t * speed * 0.23 + phase) * 0.32 +
    Math.cos(t * speed * 0.11 + phase * 1.8) * 0.18

  let ellipseY =
    0.55 +
    Math.cos(t * speed * 0.29 + phase * 1.1) * 0.30 +
    Math.sin(t * speed * 0.09 + phase * 2.4) * 0.16

  if (profile.density === 'membrane') {
    ellipseX = 1.35 + Math.sin(t * speed * 0.4 + phase) * 0.45
    ellipseY = 0.38 + Math.cos(t * speed * 0.3 + phase) * 0.12
  } else if (profile.density === 'particulate') {
    ellipseX = 0.95 + Math.sin(t * speed * 0.2 + phase) * 0.1
    ellipseY = 0.95 + Math.cos(t * speed * 0.2 + phase) * 0.1
  }

  ellipseX = clamp(ellipseX, 0.35, 1.85)
  ellipseY = clamp(ellipseY, 0.25, 1.45)

  const radiusPulse =
    1 +
    Math.sin(t * speed * 0.37 + phase) * 0.14 +
    Math.cos(t * speed * 0.16 + phase * 1.6) * 0.08

  const alphaPulse =
    0.82 +
    Math.sin(t * speed * 0.41 + phase * 0.9) * 0.22 +
    Math.cos(t * speed * 0.18 + phase * 1.5) * 0.12

  return { ellipseX, ellipseY, radiusPulse, alphaPulse }
}

interface VeilOptions {
  x: number
  y: number
  radius: number
  ellipseX: number
  ellipseY: number
  rotation: number
  blur: number
  alpha: number
  baseColor: RGBColor
  intensityColor: RGBColor
  flashColor: RGBColor
  blendMode: GlobalCompositeOperation
  innerAlpha: number
  bodyAlpha: number
  midAlpha: number
  outerAlpha: number
  integratedFlashGlow: number
}

function drawOniricVeil(ctx: CanvasRenderingContext2D, options: VeilOptions) {
  const { x, y, radius, ellipseX, ellipseY, rotation, blur, alpha, baseColor, intensityColor, flashColor, blendMode, innerAlpha, bodyAlpha, midAlpha, outerAlpha, integratedFlashGlow } = options

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.scale(ellipseX, ellipseY)
  
  ctx.filter = `blur(${blur}px)`
  ctx.globalCompositeOperation = blendMode
  ctx.globalAlpha = alpha

  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
  const rgbaStr = (c: RGBColor, a: number) => `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`

  // Correzione 3: mix intensityColor + flashColor al centro del gradiente
  const stop0Color = mixColor(intensityColor, flashColor, integratedFlashGlow)

  // Correzione 2 & 3: 5 stop radial gradient
  gradient.addColorStop(0.00, rgbaStr(stop0Color, innerAlpha))
  gradient.addColorStop(0.18, rgbaStr(intensityColor, bodyAlpha))
  gradient.addColorStop(0.45, rgbaStr(baseColor, midAlpha))
  gradient.addColorStop(0.75, rgbaStr(baseColor, outerAlpha))
  gradient.addColorStop(1.00, 'rgba(0, 0, 0, 0)')

  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fill()

  // Leggero inner glow organico centrale (Correzione 2)
  const innerGlowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.28)
  innerGlowGrad.addColorStop(0, rgbaStr(intensityColor, innerAlpha * 0.45))
  innerGlowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = innerGlowGrad
  ctx.beginPath()
  ctx.arc(0, 0, radius * 0.28, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

interface StreakOptions {
  x: number
  y: number
  length: number
  thickness: number
  rotation: number
  blur: number
  alpha: number
  color: RGBColor
  blendMode: GlobalCompositeOperation
}

function drawSoftStreak(ctx: CanvasRenderingContext2D, options: StreakOptions) {
  const { x, y, length, thickness, rotation, blur, alpha, color, blendMode } = options

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  
  ctx.filter = `blur(${blur}px)`
  ctx.globalCompositeOperation = blendMode
  ctx.globalAlpha = alpha

  const rgbaStr = (c: RGBColor, a: number) => `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`
  const gradient = ctx.createLinearGradient(-length / 2, 0, length / 2, 0)
  
  gradient.addColorStop(0.00, rgbaStr(color, 0.00))
  gradient.addColorStop(0.35, rgbaStr(color, 0.80))
  gradient.addColorStop(0.50, rgbaStr(color, 1.00))
  gradient.addColorStop(0.65, rgbaStr(color, 0.80))
  gradient.addColorStop(1.00, rgbaStr(color, 0.00))

  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.rect(-length / 2, -thickness / 2, length, thickness)
  ctx.fill()
  ctx.restore()
}

export function createOniricMorphingCanvas(container: HTMLElement) {
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
  let isFlashing = false
  let currentWhiteMix = 0
  let currentBgColor = '#000000'
  let time = 0
  let lastTime = performance.now()

  let smoothedLow = 0
  let smoothedLowMid = 0
  let smoothedMid = 0
  let smoothedHigh = 0
  let smoothedFlash = 0
  let smoothedMorphingFlash = 0
  let smoothedKickPulse = 0

  let warnedCount = false
  let warnedOpacity = false

  const resize = () => {
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight
  }

  window.addEventListener('resize', resize)
  resize()

  const stableSeed = (index: number) => index * 12.9898 + 78.233

  const render = (now: number) => {
    if (!ctx || !currentSettings) {
      rafId = requestAnimationFrame(render)
      return
    }

    const dt = now - lastTime
    lastTime = now

    const presetId = currentSettings.morphingPresetId
    const preset = MORPHING_PRESETS.find((p) => p.id === presetId) || MORPHING_PRESETS[0]
    
    const profile = getThemeProfileForPreset(presetId)

    canvas.style.mixBlendMode = preset.blendMode || 'screen'

    smoothedLow += (currentBands.low - smoothedLow) * 0.055
    smoothedLowMid += (currentBands.lowMid - smoothedLowMid) * 0.060
    smoothedMid += (currentBands.mid - smoothedMid) * 0.070
    smoothedHigh += (currentBands.high - smoothedHigh) * 0.045

    const flashTarget = currentWhiteMix !== 0 ? currentWhiteMix : (isFlashing ? 1 : 0)
    if (flashTarget > smoothedFlash) {
      smoothedFlash += (flashTarget - smoothedFlash) * 0.16
    } else {
      smoothedFlash += (flashTarget - smoothedFlash) * 0.035
    }

    // Correzione 5: Smoothing del flash nel morphing
    if (flashTarget > smoothedMorphingFlash) {
      smoothedMorphingFlash += (flashTarget - smoothedMorphingFlash) * 0.22
    } else {
      smoothedMorphingFlash += (flashTarget - smoothedMorphingFlash) * 0.045
    }

    const rawKickPulse = Math.max(0, currentBands.low - smoothedLow)
    smoothedKickPulse += (rawKickPulse - smoothedKickPulse) * 0.12
    const kickPulse = smoothedKickPulse * (currentSettings.kickMovement ?? 0.08)
    const subPressure = smoothedLow * (currentSettings.subMovement ?? 0.26)

    const bodyDensity = smoothedLowMid * preset.lowMidDeformationAmount * 0.36 * (1 + subPressure * 0.5)
    const midGlow = smoothedMid * preset.midOpacityAmount * 0.58
    const flashGlow = smoothedFlash * preset.flashEdgeAmount * 0.16
    const highTension = smoothedHigh * preset.highNoiseAmount * 0.22

    // Correzione 3: Assorbimento del flash come energia interna
    let integratedFlashGlow = smoothedMorphingFlash * preset.flashEdgeAmount
    integratedFlashGlow = clamp(integratedFlashGlow, 0, 0.22)

    time += dt
    const t = time * 0.001

    const width = canvas.width
    const height = canvas.height

    if (profile.density === 'residual' || profile.motion === 'afterimage') {
      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = 'rgba(0, 0, 0, 0.09)'
      ctx.fillRect(0, 0, width, height)
      ctx.restore()
    } else {
      ctx.clearRect(0, 0, width, height)
    }

    // Correzione 1: limiti interni e clamps per visibilità organica aumentata
    let effectiveSpeed = clamp(preset.speed * 1.8, ONIRIC_MIN_SPEED, ONIRIC_MAX_SPEED)
    let effectiveVeilCount = clamp(Math.round(preset.shapeCount * 2.5 + subPressure * 2.0), ORGANIC_MIN_LAYER_COUNT, ORGANIC_MAX_LAYER_COUNT)
    let effectiveBlur = clamp(preset.blur * 0.72, ORGANIC_MIN_BLUR, ORGANIC_MAX_BLUR)
    let effectiveOpacity = clamp(preset.opacity * 1.15 + subPressure * 0.12 + kickPulse * 0.08, ORGANIC_MIN_ALPHA, ORGANIC_MAX_ALPHA)
    let effectiveScale = clamp(preset.scale * 1.05 + subPressure * 0.20 + kickPulse * 0.10, 0.85, 1.85)

    let midGlowBoost = midGlow
    let integratedFlashGlowBoost = integratedFlashGlow

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

    if (!warnedCount && effectiveVeilCount < 5) {
      console.warn(`[Oniric Morphing] Warning: effectiveVeilCount is low (${effectiveVeilCount})`)
      warnedCount = true
    }
    if (!warnedOpacity && effectiveOpacity < 0.10) {
      console.warn(`[Oniric Morphing] Warning: effectiveOpacity is low (${effectiveOpacity})`)
      warnedOpacity = true
    }

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

    const basePositions = computeBasePositions(profile, effectiveVeilCount, width, height)

    for (let index = 0; index < effectiveVeilCount; index++) {
      const seed = stableSeed(index)
      const phase = seed % (Math.PI * 2)

      const speed = effectiveSpeed * (0.65 + pseudoRandom(seed) * 0.85)

      const motion = computeMotionVector(profile, t, speed, phase, width, height)
      const geom = computeVeilGeometry(profile, t, speed, phase)

      let x = basePositions[index].x
      let y = basePositions[index].y
      let rotation = motion.rotation

      if (profile.symmetry === 'bilateralWeak' && index % 2 === 1) {
        const counterpart = basePositions[index - 1] || basePositions[0]
        x = width - counterpart.x + motion.driftX * 0.8
        y = counterpart.y + motion.driftY * 1.2
        rotation = -rotation + 0.1
      } else if (profile.symmetry === 'radialWeak') {
        const centerDist = Math.hypot(x - width / 2, y - height / 2)
        const angle = (index / effectiveVeilCount) * Math.PI * 2 + t * speed * 0.1
        x = width / 2 + Math.cos(angle) * centerDist + motion.driftX * 0.5
        y = height / 2 + Math.sin(angle) * centerDist + motion.driftY * 0.5
      } else {
        x += motion.driftX + bodyDensity * width * 0.10 * Math.sin(t * speed * 0.53 + phase) + Math.sin(t * speed * 0.15 + phase) * width * 0.04 * highTension
        y += motion.driftY + bodyDensity * height * 0.10 * Math.cos(t * speed * 0.49 + phase) + Math.cos(t * speed * 0.11 + phase) * height * 0.04 * highTension
      }

      let radius =
        Math.max(width, height) *
        effectiveScale *
        (0.28 + pseudoRandom(seed + 1) * 0.28) *
        geom.radiusPulse *
        (1 + subPressure * 1.5 + kickPulse * 0.8)

      if (profile.density === 'particulate') {
        radius *= 0.22
      } else if (profile.density === 'field') {
        radius *= 1.6
      }

      let alpha =
        effectiveOpacity *
        geom.alphaPulse *
        (0.55 + midGlowBoost + flashGlow) *
        contrastOpacityMult

      // Correzione 8: presenza minima del morphing
      const minPresence = isOrganicPreset(presetId) ? 0.12 : 0.08
      alpha = Math.max(alpha, minPresence)

      if (profile.density === 'field') {
        alpha *= 0.55
      } else if (profile.density === 'particulate') {
        alpha *= 0.80
      }

      if (profile.symmetry === 'bilateralWeak' && index % 2 === 1) {
        alpha *= 0.72
        radius *= 0.90
      }

      // Correzione 2: stop gradienti ed alpha proceduriali
      let innerAlpha = clamp(alpha * 0.42 + integratedFlashGlowBoost * 0.18, 0.06, 0.32) * contrastInnerAlphaMult
      let bodyAlpha = clamp(alpha * 0.30, 0.05, 0.24)
      let midAlpha = clamp(alpha * 0.18 + midGlowBoost * 0.10, 0.04, 0.18)
      let outerAlpha = clamp(alpha * 0.08, 0.02, 0.10)

      // Correzione 3: Flash integrated multipliers
      radius *= 1 + integratedFlashGlowBoost * 0.18
      alpha += integratedFlashGlowBoost * 0.16
      innerAlpha += integratedFlashGlowBoost * 0.20
      midAlpha += integratedFlashGlowBoost * 0.10

      alpha = clamp(alpha, ORGANIC_MIN_ALPHA, ORGANIC_MAX_ALPHA)

      let blur =
        effectiveBlur *
        (0.75 + pseudoRandom(seed + 2) * 0.50) *
        contrastBlurMult

      if (profile.edgeBehavior === 'noEdges') {
        blur *= 1.3
      } else if (profile.edgeBehavior === 'impliedEdges') {
        blur *= 0.65
      }

      blur = clamp(blur, ORGANIC_MIN_BLUR, ORGANIC_MAX_BLUR)

      drawOniricVeil(ctx, {
        x,
        y,
        radius,
        ellipseX: geom.ellipseX,
        ellipseY: geom.ellipseY,
        rotation,
        blur,
        alpha,
        baseColor,
        intensityColor: hotColor,
        flashColor,
        blendMode: validBlendModeOrScreen(preset.blendMode),
        innerAlpha,
        bodyAlpha,
        midAlpha,
        outerAlpha,
        integratedFlashGlow: integratedFlashGlowBoost
      })
    }

    if (profile.density === 'streaked' || profile.density === 'membrane' || profile.density === 'diffuse') {
      const effectiveStreakCount = 3
      for (let index = 0; index < effectiveStreakCount; index++) {
        const seed = stableSeed(index + 20)
        const phase = seed % (Math.PI * 2)

        const speed = effectiveSpeed * 0.35

        const x = (0.2 + pseudoRandom(seed) * 0.6) * width + Math.sin(t * speed + phase) * width * 0.15
        const y = (0.2 + pseudoRandom(seed + 1) * 0.6) * height + Math.cos(t * speed * 0.85 + phase * 1.3) * height * 0.15

        const rotation = t * speed * 0.25 + phase

        const alpha = clamp(0.05 + midGlow * 0.08 + flashGlow * 0.06, 0.03, 0.16)

        drawSoftStreak(ctx, {
          x,
          y,
          length: width * 0.9,
          thickness: height * 0.08,
          rotation,
          blur: 60,
          alpha,
          color: hotColor,
          blendMode: validBlendModeOrScreen(preset.blendMode)
        })
      }
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
