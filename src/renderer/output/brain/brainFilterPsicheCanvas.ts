import type { AppSettings, BandEnergies } from '@shared/types'
import type { DreamStory } from '@shared/brain/brainTypes'
import type { BrainRendererPluginContext } from './brainRendererPlugin'
import {
  calculateRhythmicAccent,
  type BrainRhythmState,
} from './brainRhythm'
import type {
  BrainFlashState,
  BrainSceneRendererController,
} from './brainSvgScene'
import { brainLog, brainWarn } from './brainLog'
import { brainPerformanceMetrics } from './brainPerformanceMetrics'
import { BrainCanvasMotionSmoother } from './brainCanvasMotionSmoother'

const NORMAL_WIDTH = 480
const NORMAL_HEIGHT = 270
const LOW_POWER_WIDTH = 320
const LOW_POWER_HEIGHT = 180
const NORMAL_FRAME_INTERVAL_MS = 1_000 / 30
const LOW_POWER_FRAME_INTERVAL_MS = 1_000 / 20
const PRESSURE_FRAME_INTERVAL_MS = 1_000 / 12
const SILENT_BANDS: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }

export const FILTER_PSICHE_VARIANTS = [
  'inverted-pulse',
  'acid-duotone',
  'solarized-echo',
  'chromatic-negative',
  'thermal-dream',
] as const

export type FilterPsicheVariant = (typeof FILTER_PSICHE_VARIANTS)[number]

let previousFilterPsicheVariant: FilterPsicheVariant | null = null

export type FilterPsicheMotion = {
  activity: number
  beat: number
  flash: number
  inverseMix: number
  alternateMix: number
  contrast: number
  highColorMix: number
  phaseDirection: number
}

export type FilterPsicheColorDynamics = {
  hueDegrees: number
  contrast: number
  saturation: number
  brightness: number
  alternateAlpha: number
  inverseAlpha: number
}

type RGB = { r: number; g: number; b: number }

type PreparedFilterArtwork = {
  base: HTMLCanvasElement
  inverse: HTMLCanvasElement
  alternate: HTMLCanvasElement
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value))
}

function hexToRgb(value: string): RGB {
  const normalized = value.replace('#', '').trim()
  const full = normalized.length === 3
    ? normalized.split('').map((part) => `${part}${part}`).join('')
    : normalized.padEnd(6, '0').slice(0, 6)
  return {
    r: Number.parseInt(full.slice(0, 2), 16) || 0,
    g: Number.parseInt(full.slice(2, 4), 16) || 0,
    b: Number.parseInt(full.slice(4, 6), 16) || 0,
  }
}

function mix(left: RGB, right: RGB, amount: number): RGB {
  const value = clamp(amount)
  return {
    r: Math.round(left.r + (right.r - left.r) * value),
    g: Math.round(left.g + (right.g - left.g) * value),
    b: Math.round(left.b + (right.b - left.b) * value),
  }
}

function luminance(red: number, green: number, blue: number): number {
  return (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255
}

function variantPixel(
  red: number,
  green: number,
  blue: number,
  variant: FilterPsicheVariant,
  palette: DreamStory['palette'],
): RGB {
  const light = luminance(red, green, blue)
  const colors = palette.map(hexToRgb)
  if (variant === 'inverted-pulse') {
    return {
      r: clamp(255 - red * 0.82 + colors[2].r * 0.22, 0, 255),
      g: clamp(255 - green * 0.82 + colors[3].g * 0.22, 0, 255),
      b: clamp(255 - blue * 0.82 + colors[4].b * 0.22, 0, 255),
    }
  }
  if (variant === 'acid-duotone') {
    const shadow = mix(colors[0], colors[2], clamp(light * 1.7))
    return mix(shadow, colors[4], clamp((light - 0.42) * 1.72))
  }
  if (variant === 'solarized-echo') {
    const solarize = (channel: number): number =>
      channel < 128 ? 255 - channel * 1.42 : (channel - 128) * 1.72
    const solar = {
      r: solarize(red),
      g: solarize(green),
      b: solarize(blue),
    }
    return mix(solar, light > 0.52 ? colors[3] : colors[1], 0.3)
  }
  if (variant === 'chromatic-negative') {
    return {
      r: clamp(255 - green * 0.84 + colors[4].r * 0.18, 0, 255),
      g: clamp(blue * 0.72 + colors[2].g * 0.42, 0, 255),
      b: clamp(255 - red * 0.78 + colors[3].b * 0.24, 0, 255),
    }
  }
  const ramp = light < 0.34
    ? mix(colors[0], colors[1], light / 0.34)
    : light < 0.68
      ? mix(colors[1], colors[3], (light - 0.34) / 0.34)
      : mix(colors[3], colors[4], (light - 0.68) / 0.32)
  return mix(ramp, { r: blue, g: red, b: green }, 0.18)
}

export function applyFilterPsichePixels(
  source: Uint8ClampedArray,
  variant: FilterPsicheVariant,
  palette: DreamStory['palette'],
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(source.length)
  for (let index = 0; index < source.length; index += 4) {
    const color = variantPixel(
      source[index],
      source[index + 1],
      source[index + 2],
      variant,
      palette,
    )
    output[index] = color.r
    output[index + 1] = color.g
    output[index + 2] = color.b
    output[index + 3] = source[index + 3]
  }
  return output
}

export function selectFilterPsicheVariant(
  random: () => number = Math.random,
  previous: FilterPsicheVariant | null = null,
): FilterPsicheVariant {
  const variants = previous
    ? FILTER_PSICHE_VARIANTS.filter((variant) => variant !== previous)
    : [...FILTER_PSICHE_VARIANTS]
  const index = Math.min(
    variants.length - 1,
    Math.max(0, Math.floor(random() * variants.length)),
  )
  return variants[index]
}

function bandDrive(value: number, average: number | undefined, transient: number): number {
  const baseline = Math.max(0.018, average ?? value * 0.82)
  const sustained = clamp((value - 0.008) / 0.42)
  const lift = clamp((value - baseline) / (baseline * 0.84 + 0.028))
  return clamp(sustained * 0.55 + lift * 0.28 + transient * 0.42)
}

export function calculateFilterPsicheMotion(
  bands: BandEnergies,
  settings: AppSettings,
  rhythm?: BrainRhythmState,
  movingAverages?: BandEnergies,
  flash?: BrainFlashState,
): FilterPsicheMotion {
  const transients = rhythm?.bandTransients ?? SILENT_BANDS
  const low = bandDrive(bands.low, movingAverages?.low, transients.low)
  const lowMid = bandDrive(bands.lowMid, movingAverages?.lowMid, transients.lowMid)
  const mid = bandDrive(bands.mid, movingAverages?.mid, transients.mid)
  const high = bandDrive(bands.high, movingAverages?.high, transients.high)
  const profile = settings.motionProfile === 'ambient'
    ? 0.66
    : settings.motionProfile === 'techno'
      ? 1.08
      : 0.88
  const sensitivity = 0.78 + clamp(settings.sensitivity) * 0.46
  const scale = profile * sensitivity * (settings.softMode ? 0.72 : 1)
  const flashDrive = flash?.active ? clamp(flash.intensity) : 0
  const activity = clamp(
    (low * 0.3 + lowMid * 0.28 + mid * 0.23 + high * 0.19) * scale,
  )
  const beat = calculateRhythmicAccent(rhythm) *
    clamp(0.3 + activity * 0.86 + low * 0.28)
  const phaseDirection = activity > 0.002
    ? Math.cos((rhythm?.beatPhase ?? 0) * Math.PI * 2)
    : 0
  return {
    activity,
    beat,
    flash: flashDrive,
    inverseMix: clamp(beat * 0.84 + flashDrive * 0.94 + low * 0.18),
    alternateMix: clamp(lowMid * 0.46 + mid * 0.36 + beat * 0.26),
    contrast: clamp(mid * 0.58 + beat * 0.32 + flashDrive * 0.4),
    highColorMix: clamp(high * 0.58 + flashDrive * 0.24),
    phaseDirection,
  }
}

export function calculateFilterPsicheColorDynamics(
  motion: FilterPsicheMotion,
): FilterPsicheColorDynamics {
  const phaseEnergy = clamp(motion.activity * 1.8 + motion.beat * 0.65)
  return {
    hueDegrees: motion.phaseDirection * phaseEnergy * (
      motion.alternateMix * 34 + motion.highColorMix * 42 + motion.beat * 20
    ),
    contrast: 1.06 + motion.contrast * 0.72 + motion.beat * 0.16,
    saturation: 1.15 + motion.alternateMix * 0.92 +
      motion.highColorMix * 0.88 + motion.beat * 0.24,
    brightness: 1 + motion.beat * 0.14 + motion.inverseMix * 0.035,
    alternateAlpha: clamp(
      motion.alternateMix * 0.5 + motion.highColorMix * 0.24,
      0,
      0.62,
    ),
    inverseAlpha: clamp(
      motion.inverseMix * 0.68 + motion.beat * 0.08,
      0,
      0.76,
    ),
  }
}

export function shouldRenderFilterPsicheFrame(
  motion: FilterPsicheMotion,
  transitionChanged: boolean,
  signatureChanged: boolean,
): boolean {
  return motion.activity > 0.003 || motion.beat > 0.003 || motion.flash > 0.003 ||
    transitionChanged || signatureChanged
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function canvasFromPixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  if (context) {
    const image = context.createImageData(width, height)
    image.data.set(pixels)
    context.putImageData(image, 0, 0)
  }
  return canvas
}

async function prepareArtwork(
  raster: Blob,
  width: number,
  height: number,
  variant: FilterPsicheVariant,
  palette: DreamStory['palette'],
): Promise<PreparedFilterArtwork> {
  const bitmap = await createImageBitmap(raster)
  try {
    const source = createCanvas(width, height)
    const sourceContext = source.getContext('2d', { willReadFrequently: true })
    if (!sourceContext) throw new Error('Canvas sorgente FilterPsiche non disponibile')
    sourceContext.drawImage(bitmap, 0, 0, width, height)
    const image = sourceContext.getImageData(0, 0, width, height)
    const variantIndex = FILTER_PSICHE_VARIANTS.indexOf(variant)
    const alternateVariant = FILTER_PSICHE_VARIANTS[
      (variantIndex + 1) % FILTER_PSICHE_VARIANTS.length
    ]
    return {
      base: canvasFromPixels(applyFilterPsichePixels(image.data, variant, palette), width, height),
      inverse: canvasFromPixels(
        applyFilterPsichePixels(image.data, 'inverted-pulse', palette),
        width,
        height,
      ),
      alternate: canvasFromPixels(
        applyFilterPsichePixels(image.data, alternateVariant, palette),
        width,
        height,
      ),
    }
  } finally {
    bitmap.close()
  }
}

export function createBrainFilterPsicheScene(
  pluginContext: BrainRendererPluginContext,
): BrainSceneRendererController {
  const root = document.createElement('div')
  Object.assign(root.style, {
    position: 'absolute',
    inset: '0',
    overflow: 'hidden',
    pointerEvents: 'none',
  })
  const fallbackUrl = URL.createObjectURL(pluginContext.raster)
  const fallback = document.createElement('img')
  fallback.alt = ''
  fallback.setAttribute('aria-hidden', 'true')
  fallback.src = fallbackUrl
  Object.assign(fallback.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    filter: 'invert(0.3) saturate(2.5) contrast(1.42) hue-rotate(38deg)',
  })
  const output = document.createElement('canvas')
  output.dataset.brainRenderer = 'filter-psiche'
  output.dataset.filterPsiche = 'preparing'
  output.setAttribute('aria-hidden', 'true')
  Object.assign(output.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    display: 'block',
    pointerEvents: 'none',
    transform: 'translateZ(0)',
  })
  root.append(fallback, output)
  pluginContext.container.appendChild(root)
  let context = output.getContext('2d', { alpha: false })
  const variant = selectFilterPsicheVariant(Math.random, previousFilterPsicheVariant)
  previousFilterPsicheVariant = variant
  let artwork: PreparedFilterArtwork | null = null
  let preparationStarted = false
  let destroyed = false
  let failed = false
  let resourcePressure = false
  let transitionProgress = 1
  let previousTransitionProgress = Number.NaN
  let transitionRole: 'enter' | 'exit' = 'enter'
  let lastRenderedAt = Number.NEGATIVE_INFINITY
  let lastSignature = ''
  let lastMotionAt = Number.NaN
  const motionSmoother = new BrainCanvasMotionSmoother()

  const prepare = (lowPowerMode: boolean): void => {
    if (preparationStarted || destroyed) return
    preparationStarted = true
    const lightweight = lowPowerMode || resourcePressure
    output.width = lightweight ? LOW_POWER_WIDTH : NORMAL_WIDTH
    output.height = lightweight ? LOW_POWER_HEIGHT : NORMAL_HEIGHT
    context = output.getContext('2d', { alpha: false })
    void prepareArtwork(
      pluginContext.raster,
      output.width,
      output.height,
      variant,
      pluginContext.palette,
    ).then((prepared) => {
      if (destroyed) {
        prepared.base.width = 1
        prepared.inverse.width = 1
        prepared.alternate.width = 1
        return
      }
      artwork = prepared
      fallback.style.opacity = '0'
      output.dataset.filterPsiche = 'ready'
      output.dataset.filterPsicheVariant = variant
      brainLog('render', 'FilterPsiche preparato', {
        frameId: pluginContext.scene.frameId,
        variant,
        resolution: `${output.width}x${output.height}`,
      })
    }).catch((error) => {
      if (destroyed) return
      failed = true
      output.dataset.filterPsiche = 'failed'
      brainWarn('render', 'FilterPsiche non preparato', {
        frameId: pluginContext.scene.frameId,
        error,
      })
    })
  }

  return {
    element: root,
    isReady: () => artwork !== null || (fallback.complete && fallback.naturalWidth > 0),
    hasFailed: () => failed,
    setOpacity(opacity) {
      root.style.opacity = String(clamp(opacity))
    },
    getMorphShapes: () => [],
    setMorphPattern(pattern) {
      output.dataset.brainMorphPattern = pattern
    },
    setResourcePressure(active) {
      resourcePressure = active
      output.dataset.brainResourcePressure = active ? 'true' : 'false'
    },
    setTransition(progress, role) {
      transitionProgress = clamp(progress)
      transitionRole = role
    },
    update(bands, settings, time, rhythm, movingAverages, flash) {
      if (destroyed || failed || !context) return
      prepare(settings.lowPowerMode)
      if (!artwork) return
      const rawMotion = calculateFilterPsicheMotion(
        bands,
        settings,
        rhythm,
        movingAverages,
        flash,
      )
      const motionElapsed = Number.isFinite(lastMotionAt)
        ? Math.max(0, time - lastMotionAt)
        : 16
      lastMotionAt = time
      const smoothMotion = motionSmoother.update(
        {
          low: rawMotion.inverseMix,
          lowMid: rawMotion.alternateMix,
          mid: rawMotion.contrast,
          high: rawMotion.highColorMix,
          activity: rawMotion.activity,
          beat: rawMotion.beat,
        },
        motionElapsed,
        rhythm?.beatDurationMs ?? 500,
        rhythm?.active ?? (rawMotion.activity > 0),
        settings.motionProfile,
      )
      const motion: FilterPsicheMotion = {
        ...rawMotion,
        activity: smoothMotion.activity,
        // Attacco diretto e release smussato: il fronte non viene ritardato
        // dall'inviluppo musicale e sopravvive a un eventuale frame saltato.
        beat: Math.max(rawMotion.beat, smoothMotion.beat),
        inverseMix: Math.max(smoothMotion.low, rawMotion.beat * 0.84),
        alternateMix: smoothMotion.lowMid,
        contrast: Math.max(smoothMotion.mid, rawMotion.beat * 0.36),
        highColorMix: smoothMotion.high,
      }
      const transitionChanged =
        !Number.isFinite(previousTransitionProgress) ||
        Math.abs(transitionProgress - previousTransitionProgress) >= 0.001
      const signature = [
        variant,
        transitionRole,
        Math.round(transitionProgress * 120),
        Math.round(motion.inverseMix * 32),
        Math.round(motion.alternateMix * 32),
        Math.round(motion.contrast * 32),
        Math.round(motion.highColorMix * 24),
        rhythm?.beatIndex ?? 0,
        settings.lowPowerMode ? 1 : 0,
        resourcePressure ? 1 : 0,
      ].join(':')
      const signatureChanged = signature !== lastSignature
      if (!shouldRenderFilterPsicheFrame(motion, transitionChanged, signatureChanged)) return
      const frameInterval = resourcePressure
        ? PRESSURE_FRAME_INTERVAL_MS
        : settings.lowPowerMode
          ? LOW_POWER_FRAME_INTERVAL_MS
          : NORMAL_FRAME_INTERVAL_MS
      if (Number.isFinite(lastRenderedAt)) {
        const elapsed = time - lastRenderedAt
        if (elapsed < frameInterval) return
        lastRenderedAt += Math.floor(elapsed / frameInterval) * frameInterval
      } else {
        lastRenderedAt = time
      }
      previousTransitionProgress = transitionProgress
      lastSignature = signature
      const renderStartedAt = performance.now()

      const width = output.width
      const height = output.height
      const colorDynamics = calculateFilterPsicheColorDynamics(motion)
      context.globalCompositeOperation = 'source-over'
      context.globalAlpha = 1
      context.filter = [
        `hue-rotate(${colorDynamics.hueDegrees.toFixed(2)}deg)`,
        `contrast(${colorDynamics.contrast.toFixed(3)})`,
        `saturate(${colorDynamics.saturation.toFixed(3)})`,
        `brightness(${colorDynamics.brightness.toFixed(3)})`,
      ].join(' ')
      context.drawImage(artwork.base, 0, 0, width, height)
      context.filter = 'none'

      if (colorDynamics.alternateAlpha > 0.002) {
        context.globalCompositeOperation = 'color-dodge'
        context.globalAlpha = colorDynamics.alternateAlpha
        context.filter = `hue-rotate(${(-colorDynamics.hueDegrees * 0.72).toFixed(2)}deg)`
        context.drawImage(artwork.alternate, 0, 0, width, height)
        context.filter = 'none'
      }
      if (colorDynamics.inverseAlpha > 0.002) {
        context.globalCompositeOperation =
          motion.flash > 0.18 || motion.beat > 0.52 ? 'difference' : 'screen'
        context.globalAlpha = colorDynamics.inverseAlpha
        context.filter = `hue-rotate(${(colorDynamics.hueDegrees * 0.38).toFixed(2)}deg)`
        context.drawImage(artwork.inverse, 0, 0, width, height)
        context.filter = 'none'
      }

      if (motion.flash > 0.002) {
        const flashColor = hexToRgb(pluginContext.palette[4])
        context.globalCompositeOperation = 'screen'
        context.globalAlpha = clamp(motion.flash * 0.32, 0, 0.34)
        context.fillStyle = `rgb(${flashColor.r} ${flashColor.g} ${flashColor.b})`
        context.fillRect(0, 0, width, height)
      }
      context.globalCompositeOperation = 'source-over'
      context.globalAlpha = 1
      context.filter = 'none'
      output.dataset.filterPsicheActivity = motion.activity.toFixed(3)
      output.dataset.filterPsicheBeat = motion.beat.toFixed(3)
      output.dataset.filterPsicheFlash = motion.flash.toFixed(3)
      output.dataset.filterPsicheHue = colorDynamics.hueDegrees.toFixed(2)
      output.dataset.filterPsicheSaturation = colorDynamics.saturation.toFixed(3)
      output.dataset.filterPsicheTransition =
        `${transitionRole}-${transitionProgress.toFixed(3)}`
      brainPerformanceMetrics.recordCanvasFrame(
        time,
        resourcePressure,
        performance.now() - renderStartedAt,
      )
    },
    destroy() {
      destroyed = true
      motionSmoother.reset()
      if (artwork) {
        artwork.base.width = 1
        artwork.inverse.width = 1
        artwork.alternate.width = 1
      }
      artwork = null
      output.width = 1
      output.height = 1
      fallback.src = ''
      URL.revokeObjectURL(fallbackUrl)
      root.remove()
    },
  }
}
