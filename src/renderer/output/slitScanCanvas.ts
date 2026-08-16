/**
 * 2001 Morphing - Perspective Tunnel
 *
 * First-person traversal through a tunnel of luminous filaments.
 * Filaments are born from the central vertical slit and radiate
 * outward toward the screen edges as they approach the camera.
 */

import type { AppSettings, BandEnergies, MorphingTransitionState, VisualStatePayload } from '@shared/types'
import { getSlitScanPreset, type SlitScanPreset } from '@shared/slitScanPresets'
import type { BrainRhythmState } from './brain/brainRhythm'

interface TunnelRibbon {
  side: 'left' | 'right'
  zStart: number       // Near end of ribbon
  zEnd: number         // Far end of ribbon (zEnd > zStart always)
  sourceOffsetX: number // X offset near the central slit source
  targetOffsetX: number // X offset of the near end in tunnel space
  sourceOffsetY: number // Y offset at the slit origin
  targetOffsetY: number // Y drift at the far end
  thicknessStart: number // Thickness at near end (clamped, very thin)
  thicknessEnd: number   // Thickness at far end (almost zero)
  baseColorIndex: number
  alpha: number
  speed: number
  phase: number
}

interface TunnelState {
  ribbons: TunnelRibbon[]
  time: number
  smoothedSpeed: number
  smoothedEqThickness: number
  smoothedEqDensity: number
  smoothedEqSpread: number
  presetId: string
}

let currentSettings: AppSettings | null = null
let currentBands: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }
let opacity = 1
let transitionState: MorphingTransitionState | null = null

const NEAR_Z = 0.18
const FAR_Z = 14
const BASE_RIBBON_COUNT_PER_SIDE = 36
const BASE_SPEED = 5.5
const SIDE_SPREAD = 1.4 // How far out from center the elements spread

const PALETTE = [
  '#ff00ff', // magenta
  '#c800ff', // violet
  '#ff0096', // pink
  '#ffff00', // yellow
  '#00ffff', // cyan
  '#ff9600', // orange
  '#96ff00', // acid green
  '#ffffff', // white
]

function getColorFromPalette(index: number): string {
  return PALETTE[Math.abs(index) % PALETTE.length]
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function smootherstep(value: number): number {
  const x = clamp(value, 0, 1)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

function weightedParallelLength(preset: SlitScanPreset): number {
  const roll = Math.random()
  const baseLength =
    roll < 0.25
      ? 0.9 + Math.random() * 0.75
      : roll < 0.80
        ? 1.65 + Math.random() * 1.25
        : 2.9 + Math.random() * 1.35
  return baseLength * (preset.parallelLengthMultiplier ?? 1)
}

function assignParallelGeometry(ribbon: TunnelRibbon, preset: SlitScanPreset): void {
  const sign = ribbon.side === 'left' ? -1 : 1
  const lane = Math.round((Math.random() - 0.5) * 18) / 18
  const sourceY = lane * 3.7 + (Math.random() - 0.5) * 0.018
  const corridor = preset.id === 'parallel-slit-ultra'
    ? 0.10 + Math.random() * 0.16
    : 0.42 + Math.random() * 0.72

  ribbon.sourceOffsetX = sign * (0.006 + Math.random() * 0.018)
  ribbon.targetOffsetX = sign * corridor
  ribbon.sourceOffsetY = sourceY
  ribbon.targetOffsetY = sourceY + (Math.random() - 0.5) * (preset.id === 'parallel-slit-ultra' ? 0.035 : 0.08)
}

function transitionFactors(): {
  background: number
  ribbons: number
  depth: number
  speed: number
  side: number
  slit: number
} {
  if (!transitionState) {
    return { background: 1, ribbons: 1, depth: 1, speed: 1, side: 1, slit: 1 }
  }
  const p = smootherstep(transitionState.progress)
  if (transitionState.kind === 'enter2001') {
    return {
      background: smootherstep((p - 0.62) / 0.38),
      ribbons: smootherstep((p - 0.22) / 0.78),
      depth: smootherstep((p - 0.28) / 0.72),
      speed: 0.16 + p * 0.84,
      side: smootherstep((p - 0.18) / 0.82),
      slit: smootherstep((p - 0.08) / 0.52),
    }
  }
  if (transitionState.kind === 'exit2001') {
    const keep = 1 - p
    return {
      background: keep * 0.72,
      ribbons: smootherstep(keep),
      depth: smootherstep(keep),
      speed: 0.20 + keep * 0.80,
      side: 0.18 + keep * 0.82,
      slit: smootherstep(keep),
    }
  }
  return { background: 1, ribbons: 1, depth: 1, speed: 1, side: 1, slit: 1 }
}

function makeRibbon(side: 'left' | 'right', zStart: number, preset: SlitScanPreset): TunnelRibbon {
  const length = preset.lineMode === 'parallel'
    ? weightedParallelLength(preset)
    : 1.4 + Math.random() * 2.5
  const lane = Math.round((Math.random() - 0.5) * 18) / 18
  const sourceOffsetY = preset.lineMode === 'parallel'
    ? lane * 3.8 + (Math.random() - 0.5) * 0.025
    : (Math.random() - 0.5) * 3.5
  const parallelYOffset = preset.lineMode === 'parallel'
    ? sourceOffsetY + (side === 'left' ? -0.12 : 0.12) + (Math.random() - 0.5) * 0.035
    : 0
  const ribbon: TunnelRibbon = {
    side,
    zStart,
    zEnd: zStart + length,
    sourceOffsetX: 0,
    targetOffsetX: 0,
    sourceOffsetY,
    targetOffsetY: preset.lineMode === 'parallel'
      ? parallelYOffset
      : preset.lineMode === 'horizontal'
      ? 0
      : (Math.random() - 0.5) * 4.5,
    thicknessStart: (0.5 + Math.random() * 0.8) * preset.thicknessMultiplier, // in pixels at near, very thin
    thicknessEnd: 0.0,
    baseColorIndex: Math.floor(Math.random() * PALETTE.length) + preset.colorShift,
    alpha: clamp((0.4 + Math.random() * 0.6) * preset.alphaMultiplier, 0.22, 0.90),
    speed: BASE_SPEED * (0.9 + Math.random() * 0.25), // slight per-ribbon speed variation
    phase: Math.random() * Math.PI * 2,
  }
  if (preset.lineMode === 'parallel') {
    assignParallelGeometry(ribbon, preset)
  }
  return ribbon
}

function recycleRibbon(ribbon: TunnelRibbon, preset: SlitScanPreset): void {
  const length = preset.lineMode === 'parallel'
    ? weightedParallelLength(preset)
    : 1.4 + Math.random() * 2.5
  const lane = Math.round((Math.random() - 0.5) * 18) / 18
  ribbon.zStart = FAR_Z + Math.random() * 2 // spread spawns slightly beyond FAR_Z
  ribbon.zEnd = ribbon.zStart + length
  ribbon.sourceOffsetY = preset.lineMode === 'parallel'
    ? lane * 3.8 + (Math.random() - 0.5) * 0.025
    : (Math.random() - 0.5) * 3.5
  ribbon.targetOffsetY = preset.lineMode === 'parallel'
    ? ribbon.sourceOffsetY + (ribbon.side === 'left' ? -0.12 : 0.12) + (Math.random() - 0.5) * 0.035
    : preset.lineMode === 'horizontal'
    ? 0
    : (Math.random() - 0.5) * 4.5
  ribbon.thicknessStart = (0.5 + Math.random() * 0.8) * preset.thicknessMultiplier
  ribbon.thicknessEnd = 0.0
  ribbon.baseColorIndex = Math.floor(Math.random() * PALETTE.length) + preset.colorShift
  ribbon.alpha = clamp((0.4 + Math.random() * 0.6) * preset.alphaMultiplier, 0.22, 0.90)
  ribbon.speed = BASE_SPEED * (0.9 + Math.random() * 0.25)
  ribbon.phase = Math.random() * Math.PI * 2
  ribbon.sourceOffsetX = 0
  ribbon.targetOffsetX = 0
  if (preset.lineMode === 'parallel') {
    assignParallelGeometry(ribbon, preset)
  }
}

function ribbonCountForPreset(preset: SlitScanPreset, densityMultiplier = 1): number {
  return Math.round(BASE_RIBBON_COUNT_PER_SIDE * preset.lineMultiplier * densityMultiplier)
}

function initTunnelState(preset: SlitScanPreset = getSlitScanPreset('base')): TunnelState {
  const ribbons: TunnelRibbon[] = []
  const countPerSide = ribbonCountForPreset(preset)

  for (let i = 0; i < countPerSide; i++) {
    const zStart = NEAR_Z + (FAR_Z - NEAR_Z) * (i / countPerSide)
    ribbons.push(makeRibbon('left', zStart, preset))
    ribbons.push(makeRibbon('right', zStart, preset))
  }

  return {
    ribbons,
    time: 0,
    smoothedSpeed: 1.0,
    smoothedEqThickness: 1.0,
    smoothedEqDensity: 1.0,
    smoothedEqSpread: 1.0,
    presetId: preset.id,
  }
}

function ensureRibbonCount(state: TunnelState, preset: SlitScanPreset): void {
  if (state.presetId !== preset.id) {
    state.presetId = preset.id
  }
  const targetTotal = ribbonCountForPreset(preset, state.smoothedEqDensity) * 2
  while (state.ribbons.length < targetTotal) {
    const side = state.ribbons.length % 2 === 0 ? 'left' : 'right'
    state.ribbons.push(makeRibbon(side, FAR_Z + Math.random() * 2, preset))
  }
  if (state.ribbons.length > targetTotal) {
    state.ribbons.length = targetTotal
  }
}

function updateRibbon(ribbon: TunnelRibbon, deltaMs: number, smoothedSpeed: number): void {
  const deltaSeconds = deltaMs / 1000
  const step = ribbon.speed * smoothedSpeed * deltaSeconds
  ribbon.zStart -= step
  ribbon.zEnd -= step
  ribbon.phase += deltaSeconds * 0.5
}

/** Project a z-depth into a screen X coordinate on the given side */
function projectX(centerX: number, z: number, perspective: number, side: 'left' | 'right', spreadMultiplier = 1): number {
  const safeZ = Math.max(0.01, z)
  const scale = perspective / safeZ
  const spread = SIDE_SPREAD * spreadMultiplier * scale
  return centerX + (side === 'left' ? -spread : spread)
}

/** Project y offset at given z-depth */
function projectY(centerY: number, z: number, perspective: number, yOffset: number): number {
  const safeZ = Math.max(0.01, z)
  const scale = perspective / safeZ
  return centerY + yOffset * scale
}

function projectWorldPoint(
  centerX: number,
  centerY: number,
  z: number,
  perspective: number,
  xOffset: number,
  yOffset: number,
): { x: number; y: number } {
  const safeZ = Math.max(0.01, z)
  const scale = perspective / safeZ
  return {
    x: centerX + xOffset * scale,
    y: centerY + yOffset * scale,
  }
}

function drawRibbon(
  ctx: CanvasRenderingContext2D,
  ribbon: TunnelRibbon,
  w: number,
  h: number,
  perspective: number,
  bands: BandEnergies,
  preset: SlitScanPreset,
  eqThickness: number,
  eqSpread: number,
  factors: ReturnType<typeof transitionFactors>,
): void {
  // Clamp z values to avoid projecting behind the camera
  const zNear = Math.max(NEAR_Z, ribbon.zStart)
  const zFar = Math.max(NEAR_Z + 0.01, ribbon.zEnd)

  // Both ends behind camera → don't draw
  if (zNear <= NEAR_Z && zFar <= NEAR_Z) return

  const centerX = w * 0.5
  const centerY = h * 0.5
  const isParallelUltra = preset.id === 'parallel-slit-ultra'
  const parallelFar =
    preset.lineMode === 'parallel'
      ? projectWorldPoint(centerX, centerY, zFar, perspective, ribbon.sourceOffsetX, ribbon.sourceOffsetY)
      : null
  const parallelNear =
    preset.lineMode === 'parallel'
      ? projectWorldPoint(
          centerX,
          centerY,
          zNear,
          perspective,
          ribbon.targetOffsetX * (isParallelUltra ? 0.20 + factors.side * 0.20 : 0.34 + factors.side * 0.66) * preset.depthSpreadMultiplier,
          ribbon.targetOffsetY,
        )
      : null

  // Project near end (closer to camera, more expanded)
  const xNear = projectX(centerX, zNear, perspective, ribbon.side, preset.depthSpreadMultiplier * eqSpread * factors.side)
  const yNear = preset.lineMode === 'parallel'
    ? parallelNear?.y ?? centerY
    : preset.lineMode === 'horizontal'
      ? projectY(centerY, zFar, perspective, ribbon.sourceOffsetY) + Math.sin(ribbon.phase) * 2.5
      : projectY(centerY, zNear, perspective, ribbon.sourceOffsetY)

  // Project far end (closer to vanishing point)
  const xFar = projectX(
    centerX,
    zFar,
    perspective,
    ribbon.side,
    preset.lineMode === 'parallel'
      ? 0.010 + factors.side * 0.012
      : preset.lineMode === 'horizontal'
      ? 0.045 + factors.side * 0.035
      : preset.depthSpreadMultiplier * eqSpread * factors.side,
  )
  const yFar = preset.lineMode === 'parallel'
    ? parallelFar?.y ?? centerY
    : preset.lineMode === 'horizontal'
      ? projectY(centerY, zFar, perspective, ribbon.sourceOffsetY)
      : projectY(centerY, zFar, perspective, ribbon.targetOffsetY)
  const drawXNear = preset.lineMode === 'parallel' ? parallelNear?.x ?? xNear : xNear
  const drawXFar = preset.lineMode === 'parallel' ? parallelFar?.x ?? xFar : xFar

  // Depth-based alpha falloff — invisible near FAR_Z, bright near camera
  const depthAlpha = Math.max(0, Math.min(1, 1.0 - (zNear - NEAR_Z) / (FAR_Z - NEAR_Z)))
  const audioAlpha = 0.55 + bands.mid * 0.45
  const pulseAlpha = 0.7 + Math.sin(ribbon.phase * 1.8) * 0.3
  const alphaCap = isParallelUltra ? 0.66 : 0.82
  const finalAlpha = Math.min(alphaCap, depthAlpha * ribbon.alpha * audioAlpha * pulseAlpha * opacity * preset.brightnessMultiplier * factors.ribbons)

  if (finalAlpha < 0.01) return

  // Perspective-correct ribbon thickness (thin at far, brighter/thicker near camera)
  const scaleNear = perspective / Math.max(0.01, zNear)
  const audioThick = preset.eqReactive ? eqThickness : 1 + bands.lowMid * 0.45
  const maxThickness = isParallelUltra ? 20 : preset.eqReactive ? 4.2 : 4.8
  const thicknessNear = clamp(ribbon.thicknessStart * audioThick * scaleNear * 0.055 * (0.72 + factors.depth * 0.28), isParallelUltra ? 1.8 : 0.45, maxThickness)

  // Color with audio shift
  const audioShift = Math.floor(bands.high * 4)
  const color = getColorFromPalette(ribbon.baseColorIndex + audioShift)

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = finalAlpha

  // Draw as a thin stroked line — gradient from transparent (far) to bright (near)
  const gradient = ctx.createLinearGradient(drawXFar, yFar, drawXNear, yNear)
  gradient.addColorStop(0, color + '00')     // invisible at slit origin
  gradient.addColorStop(0.12, color + (isParallelUltra ? '22' : '18'))  // barely visible as it emerges
  gradient.addColorStop(0.58, color + (isParallelUltra ? '8a' : '77'))   // clearly visible mid-range
  gradient.addColorStop(1.0, color + (isParallelUltra ? 'f2' : 'dd'))   // bright near camera

  ctx.strokeStyle = gradient
  ctx.lineCap = 'butt' // flat ends, no rounded caps or blobs

  if (isParallelUltra) {
    const layers = [
      { width: thicknessNear * 2.15, alpha: finalAlpha * 0.18, blur: 16 + bands.high * 10 },
      { width: thicknessNear * 1.25, alpha: finalAlpha * 0.34, blur: 8 + bands.high * 7 },
      { width: thicknessNear * 0.42, alpha: finalAlpha * 0.92, blur: 2 + bands.high * 3 },
    ]
    for (const layer of layers) {
      ctx.globalAlpha = layer.alpha
      ctx.shadowColor = color
      ctx.shadowBlur = layer.blur * preset.glowMultiplier
      ctx.lineWidth = Math.max(0.8, layer.width)
      ctx.beginPath()
      ctx.moveTo(drawXFar, yFar)
      ctx.lineTo(drawXNear, yNear)
      ctx.stroke()
    }
  } else {
    // Glow on near and mid-range segments
    if (zNear < 5.0) {
      ctx.shadowColor = color
      ctx.shadowBlur = (5 + bands.high * 10) * preset.glowMultiplier
    } else {
      ctx.shadowBlur = 0
    }
    ctx.lineWidth = Math.max(0.6, thicknessNear)
    ctx.beginPath()
    ctx.moveTo(drawXFar, yFar)
    ctx.lineTo(drawXNear, yNear)
    ctx.stroke()
  }

  ctx.restore()
}

/**
 * Draw the vertical slit at the center — the source of all filaments.
 */
function drawNorwellShadow(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  slitHeight: number,
  timeMs: number,
  alpha: number,
): void {
  const t = timeMs * 0.001
  const sway = Math.sin(t * 0.72)
  const slow = Math.sin(t * 0.43 + 1.2)
  const bodyW = Math.max(10, slitHeight * 0.038)
  const bodyH = slitHeight * 0.24
  const hipY = centerY + slitHeight * 0.09 + slow * slitHeight * 0.012
  const shoulderY = hipY - bodyH * 0.64
  const headY = shoulderY - bodyH * 0.22
  const x = centerX + sway * bodyW * 0.36

  ctx.save()
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = alpha
  ctx.fillStyle = 'rgba(0, 0, 0, 0.58)'
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.48)'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.38)'
  ctx.shadowBlur = 9

  ctx.beginPath()
  ctx.ellipse(x + sway * bodyW * 0.18, headY, bodyW * 0.36, bodyH * 0.10, sway * 0.12, 0, Math.PI * 2)
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(x - bodyW * 0.46, shoulderY)
  ctx.bezierCurveTo(x - bodyW * 0.22, shoulderY + bodyH * 0.25, x - bodyW * 0.35, hipY - bodyH * 0.06, x - bodyW * 0.18, hipY)
  ctx.bezierCurveTo(x, hipY + bodyH * 0.10, x + bodyW * 0.42, hipY, x + bodyW * 0.35, shoulderY + bodyH * 0.08)
  ctx.bezierCurveTo(x + bodyW * 0.18, shoulderY - bodyH * 0.04, x - bodyW * 0.18, shoulderY - bodyH * 0.07, x - bodyW * 0.46, shoulderY)
  ctx.fill()

  ctx.lineWidth = Math.max(3, bodyW * 0.32)
  ctx.beginPath()
  ctx.moveTo(x - bodyW * 0.24, shoulderY + bodyH * 0.07)
  ctx.bezierCurveTo(
    x - bodyW * (0.9 + slow * 0.16),
    shoulderY + bodyH * 0.22,
    x - bodyW * 0.82,
    hipY - bodyH * 0.12,
    x - bodyW * 0.42,
    hipY + bodyH * 0.03,
  )
  ctx.moveTo(x + bodyW * 0.22, shoulderY + bodyH * 0.08)
  ctx.bezierCurveTo(
    x + bodyW * (0.78 - slow * 0.14),
    shoulderY - bodyH * 0.04,
    x + bodyW * 0.86,
    hipY - bodyH * 0.02,
    x + bodyW * 0.42,
    hipY + bodyH * 0.06,
  )
  ctx.stroke()

  ctx.lineWidth = Math.max(4, bodyW * 0.38)
  ctx.beginPath()
  ctx.moveTo(x - bodyW * 0.10, hipY)
  ctx.bezierCurveTo(x - bodyW * 0.44, hipY + bodyH * 0.34, x - bodyW * 0.54, hipY + bodyH * 0.62, x - bodyW * 0.18, hipY + bodyH * 0.84)
  ctx.moveTo(x + bodyW * 0.14, hipY)
  ctx.bezierCurveTo(x + bodyW * (0.52 + sway * 0.12), hipY + bodyH * 0.28, x + bodyW * 0.48, hipY + bodyH * 0.62, x + bodyW * 0.08, hipY + bodyH * 0.88)
  ctx.stroke()

  ctx.restore()
}

function drawVerticalSlit(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bands: BandEnergies,
  timeMs: number,
  slitFactor: number,
  stable = false,
  ultra = false,
  norwell = false,
): void {
  ctx.save()

  const centerX = w * 0.5
  const oscX = stable ? centerX : centerX + Math.sin(timeMs * 0.002) * (3 + bands.low * 6)

  const baseHeight = h * (norwell ? 0.96 : 0.84)
  const slitHeight = stable || norwell ? baseHeight : baseHeight + Math.sin(timeMs * 0.004) * 35 * (1 + bands.mid)
  const yStart = (h - slitHeight) * 0.5
  const yEnd = yStart + slitHeight
  const norwellSpread = norwell ? Math.max(72, Math.min(w * 0.24, 240)) : 0
  const norwellCoreWidth = norwell ? Math.max(7.5, Math.min(w * 0.018, 18)) : 0

  const slitOpacity = (
    norwell
      ? 0.62 + bands.high * 0.25 + bands.lowMid * 0.18
      : ultra
      ? 0.36 + bands.high * 0.26 + bands.lowMid * 0.12
      : 0.12 + Math.sin(timeMs * 0.009) * 0.06 + bands.high * 0.3
  ) * opacity * slitFactor

  if (norwell) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const lateralGlow = ctx.createLinearGradient(centerX - norwellSpread, 0, centerX + norwellSpread, 0)
    lateralGlow.addColorStop(0, 'rgba(255,255,255,0)')
    lateralGlow.addColorStop(0.26, `rgba(255,255,255,${(slitOpacity * 0.055).toFixed(3)})`)
    lateralGlow.addColorStop(0.44, `rgba(255,255,255,${(slitOpacity * 0.18).toFixed(3)})`)
    lateralGlow.addColorStop(0.5, `rgba(255,255,255,${(slitOpacity * 0.34).toFixed(3)})`)
    lateralGlow.addColorStop(0.56, `rgba(255,255,255,${(slitOpacity * 0.18).toFixed(3)})`)
    lateralGlow.addColorStop(0.74, `rgba(255,255,255,${(slitOpacity * 0.055).toFixed(3)})`)
    lateralGlow.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = lateralGlow
    ctx.fillRect(centerX - norwellSpread, yStart, norwellSpread * 2, slitHeight)
    ctx.restore()
  }

  const grad = ctx.createLinearGradient(oscX, yStart, oscX, yEnd)
  grad.addColorStop(0, ultra || norwell ? 'rgba(255, 255, 255, 0)' : 'rgba(0, 255, 255, 0)')
  grad.addColorStop(0.2, ultra || norwell ? `rgba(255, 255, 255, ${(slitOpacity * 0.58).toFixed(3)})` : `rgba(255, 0, 255, ${(slitOpacity * 0.55).toFixed(3)})`)
  grad.addColorStop(0.5, `rgba(255, 255, 255, ${(slitOpacity * 0.9).toFixed(3)})`)
  grad.addColorStop(0.8, ultra || norwell ? `rgba(255, 255, 255, ${(slitOpacity * 0.58).toFixed(3)})` : `rgba(0, 255, 255, ${(slitOpacity * 0.55).toFixed(3)})`)
  grad.addColorStop(1, ultra || norwell ? 'rgba(255, 255, 255, 0)' : 'rgba(255, 0, 255, 0)')

  ctx.strokeStyle = grad
  ctx.lineWidth = norwell
    ? norwellCoreWidth * (0.92 + slitFactor * 0.22 + bands.lowMid * 0.08)
    : ultra
    ? (1.05 + bands.lowMid * 0.5) * (0.8 + slitFactor * 0.2)
    : (0.65 + bands.lowMid * 1.2) * (0.65 + slitFactor * 0.35)
  ctx.lineCap = 'butt'
  ctx.shadowColor = ultra || norwell ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)'
  ctx.shadowBlur = norwell ? 22 + bands.high * 14 : ultra ? 10 + bands.high * 8 : 5 + bands.high * 9
  ctx.globalCompositeOperation = 'lighter'

  if (norwell) {
    const glowPasses = [
      { width: norwellCoreWidth * 7.2, alpha: slitOpacity * 0.10, blur: 28 + bands.high * 12 },
      { width: norwellCoreWidth * 4.1, alpha: slitOpacity * 0.17, blur: 18 + bands.high * 10 },
      { width: norwellCoreWidth * 1.75, alpha: slitOpacity * 0.42, blur: 9 + bands.high * 7 },
    ]
    for (const pass of glowPasses) {
      ctx.globalAlpha = pass.alpha
      ctx.shadowColor = 'rgba(255,255,255,0.92)'
      ctx.shadowBlur = pass.blur
      ctx.lineWidth = pass.width
      ctx.beginPath()
      ctx.moveTo(centerX, yStart + 3)
      ctx.lineTo(centerX, yEnd - 3)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.lineWidth = norwellCoreWidth
    ctx.shadowBlur = 18 + bands.high * 12
  }

  // 4-6 fragmented slit segments with phase jitter
  const segCount = 5
  const segLen = slitHeight / segCount

  for (let i = 0; i < segCount; i++) {
    const noise = stable ? 0 : Math.sin(timeMs * 0.012 + i * 1.4) * 7
    const sy = yStart + i * segLen + 3 + noise
    const ey = yStart + (i + 1) * segLen - 3 + noise
    const sx = stable ? centerX : oscX + (bands.high > 0.55 ? (Math.random() - 0.5) * 2 : 0)

    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(sx, ey)
    ctx.stroke()
  }

  if (norwell) {
    ctx.save()
    ctx.beginPath()
    const maskWidth = Math.max(54, Math.min(w * 0.09, 110))
    ctx.rect(centerX - maskWidth * 0.5, yStart, maskWidth, slitHeight)
    ctx.clip()
    const shadowAlpha = clamp((0.24 + Math.sin(timeMs * 0.0011) * 0.055 + bands.mid * 0.08 - bands.high * 0.04) * opacity * slitFactor, 0, 0.34)
    drawNorwellShadow(ctx, centerX, h * 0.5, slitHeight, timeMs, shadowAlpha)

    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = clamp((0.10 + bands.high * 0.08 + bands.mid * 0.04) * opacity * slitFactor, 0, 0.22)
    ctx.shadowBlur = 14 + bands.high * 8
    const colorPhase = timeMs * 0.001
    const colorWash = ctx.createLinearGradient(centerX - maskWidth * 0.5, yStart, centerX + maskWidth * 0.5, yEnd)
    colorWash.addColorStop(0, `hsla(${(285 + Math.sin(colorPhase) * 25).toFixed(1)}, 100%, 55%, 0)`)
    colorWash.addColorStop(0.28, `hsla(${(305 + Math.sin(colorPhase * 0.8) * 35).toFixed(1)}, 100%, 58%, 0.55)`)
    colorWash.addColorStop(0.55, `hsla(${(185 + Math.sin(colorPhase * 0.6) * 45).toFixed(1)}, 100%, 62%, 0.45)`)
    colorWash.addColorStop(0.82, `hsla(${(48 + Math.sin(colorPhase * 0.7) * 24).toFixed(1)}, 100%, 62%, 0.35)`)
    colorWash.addColorStop(1, `hsla(${(315 + Math.sin(colorPhase) * 30).toFixed(1)}, 100%, 55%, 0)`)
    ctx.fillStyle = colorWash
    ctx.fillRect(centerX - maskWidth * 0.5, yStart, maskWidth, slitHeight)
    ctx.restore()

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.86, slitOpacity * 0.92).toFixed(3)})`
    ctx.lineWidth = Math.max(1.2, norwellCoreWidth * 0.32)
    ctx.shadowColor = 'rgba(255,255,255,0.85)'
    ctx.shadowBlur = 10 + bands.high * 7
    ctx.beginPath()
    ctx.moveTo(centerX, yStart + 4)
    ctx.lineTo(centerX, yEnd - 4)
    ctx.stroke()
    ctx.restore()
  }

  ctx.restore()
}

export function create2001MorphingCanvas(
  container: HTMLElement,
  rhythmSource?: () => BrainRhythmState,
) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Cannot create 2D context')

  canvas.style.position = 'absolute'
  canvas.style.top = '0'
  canvas.style.left = '0'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.display = 'block'
  container.appendChild(canvas)

  let animationId = 0
  const state = initTunnelState()
  let lastMusicalPosition = rhythmSource?.().musicalPosition ?? 0
  let motionTime = 0

  const animate = () => {
    if (!ctx || !currentSettings) {
      animationId = requestAnimationFrame(animate)
      return
    }

    const rhythm = rhythmSource?.()
    const musicalPosition = rhythm?.musicalPosition ?? lastMusicalPosition
    const deltaBeats = rhythm?.active === true
      ? Math.max(0, musicalPosition - lastMusicalPosition)
      : 0
    lastMusicalPosition = musicalPosition
    const deltaMs = Math.min(
      80,
      deltaBeats * (rhythm?.beatDurationMs ?? 500),
    )
    motionTime += deltaMs
    state.time = motionTime
    const preset = getSlitScanPreset(currentSettings.morphingPresetId)
    const factors = transitionFactors()
    const bands: BandEnergies = {
      low: Math.max(currentBands.low, rhythm?.kickEnvelope ?? 0),
      lowMid: Math.max(
        currentBands.lowMid,
        rhythm?.beatPulse ?? 0,
        rhythm?.bandTransients.lowMid ?? 0,
      ),
      mid: Math.max(currentBands.mid, rhythm?.bandTransients.mid ?? 0),
      high: Math.max(currentBands.high, rhythm?.bandTransients.high ?? 0),
    }

    const rect = container.getBoundingClientRect()
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width
      canvas.height = rect.height
    }

    // Smooth speed modifier from audio bass — lazy interpolation avoids jumpy launches
    const targetSpeed = (1.0 + bands.low * 0.9) * factors.speed
    if (rhythm?.active === true) {
      state.smoothedSpeed += (targetSpeed - state.smoothedSpeed) * 0.06
    }
    const eqEnergy = clamp(bands.low * 0.34 + bands.lowMid * 0.18 + bands.mid * 0.26 + bands.high * 0.22, 0, 1)
    const targetEqThickness = preset.eqReactive
      ? clamp(0.72 + bands.low * 0.76 + bands.lowMid * 0.30 + bands.mid * 0.22 - bands.high * 0.28 + eqEnergy * 0.18, 0.62, 1.78)
      : 1.0
    if (rhythm?.active === true) {
      state.smoothedEqThickness += (clamp(targetEqThickness, 0.62, 1.78) - state.smoothedEqThickness) * 0.08
    }
    const targetEqDensity = preset.eqReactive ? clamp(0.92 + bands.mid * 0.22 + bands.lowMid * 0.08 - bands.high * 0.05, 0.88, 1.20) : 1.0
    const targetEqSpread = preset.eqReactive ? clamp(0.94 + bands.mid * 0.18 + bands.low * 0.06, 0.90, 1.18) : 1.0
    if (rhythm?.active === true) {
      state.smoothedEqDensity += (targetEqDensity - state.smoothedEqDensity) * 0.06
      state.smoothedEqSpread += (targetEqSpread - state.smoothedEqSpread) * 0.06
    }
    ensureRibbonCount(state, preset)

    const perspective = canvas.width * (0.16 + 0.08 * factors.depth)

    // Move all ribbons and recycle those that have fully passed the camera
    const zSpeedMultiplier = preset.id === 'parallel-slit-ultra' ? 1.85 : 1
    for (const ribbon of state.ribbons) {
      if (deltaMs > 0) {
        updateRibbon(ribbon, deltaMs, state.smoothedSpeed * zSpeedMultiplier)
      }

      if (ribbon.zStart < NEAR_Z - ribbon.thicknessStart * 0.2) {
        recycleRibbon(ribbon, preset)
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (factors.background > 0.01) {
      ctx.save()
      ctx.globalAlpha = factors.background
      ctx.fillStyle = currentSettings.idleColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.restore()
    }

    // Draw ribbons far-to-near for proper additive layering
    const sorted = [...state.ribbons].sort((a, b) => b.zStart - a.zStart)
    const visibleRibbonCount = Math.max(0, Math.floor(sorted.length * factors.ribbons))
    for (let i = 0; i < visibleRibbonCount; i++) {
      const ribbon = sorted[i]
      drawRibbon(ctx, ribbon, canvas.width, canvas.height, perspective, bands, preset, state.smoothedEqThickness, state.smoothedEqSpread, factors)
    }

    // Draw the vertical source slit on top
    drawVerticalSlit(
      ctx,
      canvas.width,
      canvas.height,
      bands,
      motionTime,
      factors.slit,
      preset.lineMode === 'parallel' || preset.id === 'deep-dance-norwell',
      preset.id === 'parallel-slit-ultra',
      preset.id === 'deep-dance-norwell',
    )

    animationId = requestAnimationFrame(animate)
  }

  animationId = requestAnimationFrame(animate)

  return {
    updateState(payload: VisualStatePayload) {
      if (payload.settings) currentSettings = payload.settings
      if (payload.bandEnergies) currentBands = payload.bandEnergies
    },

    setOpacity(value: number) {
      opacity = Math.max(0, Math.min(1, value))
    },

    setTransitionState(value: MorphingTransitionState | null) {
      transitionState = value
    },

    destroy() {
      cancelAnimationFrame(animationId)
      if (canvas.parentElement) canvas.parentElement.removeChild(canvas)
      state.ribbons = []
      transitionState = null
    },

    __algo: '2001' as const,
    __key: `2001:${performance.now()}`,
    __settings: currentSettings,
  }
}
