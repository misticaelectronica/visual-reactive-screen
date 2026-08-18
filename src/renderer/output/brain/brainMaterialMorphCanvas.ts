import type { AppSettings, BandEnergies } from '@shared/types'
import type { BrainFrameMorphPattern } from './brainFrameMotion'
import {
  calculateRhythmicAccent,
  type BrainRhythmState,
} from './brainRhythm'
import type { BrainFlashState, BrainSceneRendererController } from './brainSvgScene'
import type {
  BrainRendererImageSource,
  BrainRendererPluginContext,
} from './brainRendererPlugin'
import {
  analyzeMaterialPixels,
  matchMaterialRegions,
  type MaterialField,
} from './brainMaterialAnalysis'
import { getBrainRenderingConfig } from './brainRenderingConfig'
import { brainLog, brainWarn } from './brainLog'
import { brainPerformanceMetrics } from './brainPerformanceMetrics'
import { BrainCanvasMotionSmoother } from './brainCanvasMotionSmoother'

const NORMAL_WIDTH = 320
const NORMAL_HEIGHT = 180
const LOW_POWER_WIDTH = 240
const LOW_POWER_HEIGHT = 135
const NORMAL_FRAME_INTERVAL_MS = 1_000 / 24
const LOW_POWER_FRAME_INTERVAL_MS = 1_000 / 15
const PRESSURE_FRAME_INTERVAL_MS = 1_000 / 12
const SILENT_BANDS: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }

type CachedMaterial = {
  source: BrainRendererImageSource
  field: MaterialField
  base: HTMLCanvasElement
  pigment: HTMLCanvasElement
  edges: HTMLCanvasElement
  grain: HTMLCanvasElement
  regionLayers: HTMLCanvasElement[]
}

export type BrainMaterialMotion = {
  activity: number
  pressure: number
  fusion: number
  structure: number
  grain: number
  beat: number
  flash: number
  phaseX: number
  phaseY: number
}

const materialCache = new WeakMap<
  Blob,
  Map<string, Promise<CachedMaterial>>
>()

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value))
}

function smoothstep(value: number): number {
  const x = clamp(value)
  return x * x * (3 - 2 * x)
}

function hashText(value: string): number {
  let hash = 2_166_136_261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }
  return hash >>> 0
}

function xorshift(seed: number): number {
  let value = seed | 0
  value ^= value << 13
  value ^= value >>> 17
  value ^= value << 5
  return value >>> 0
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function drawBitmapCover(
  context: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  width: number,
  height: number,
): void {
  const scale = Math.max(width / bitmap.width, height / bitmap.height)
  const sourceWidth = width / scale
  const sourceHeight = height / scale
  context.drawImage(
    bitmap,
    (bitmap.width - sourceWidth) / 2,
    (bitmap.height - sourceHeight) / 2,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height,
  )
}

function canvasFromPixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  const image = context?.createImageData(width, height)
  if (context && image) {
    image.data.set(pixels)
    context.putImageData(image, 0, 0)
  }
  return canvas
}

function parseHexColor(value: string | undefined): readonly [number, number, number] {
  const hex = value?.match(/^#([\da-f]{6})$/i)?.[1]
  if (!hex) return [236, 226, 232]
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ]
}

function nearestPaletteColor(
  red: number,
  green: number,
  blue: number,
  palette: readonly string[],
): readonly [number, number, number] {
  let best = parseHexColor(palette[0])
  let bestDistance = Number.POSITIVE_INFINITY
  for (const value of palette) {
    const candidate = parseHexColor(value)
    const distance =
      (red - candidate[0]) ** 2 +
      (green - candidate[1]) ** 2 +
      (blue - candidate[2]) ** 2
    if (distance < bestDistance) {
      best = candidate
      bestDistance = distance
    }
  }
  return best
}

async function prepareMaterialSource(
  source: BrainRendererImageSource,
  width: number,
  height: number,
): Promise<CachedMaterial> {
  const resolutionKey = `${width}x${height}:${source.id}`
  const cachedByResolution = materialCache.get(source.raster) ?? new Map()
  materialCache.set(source.raster, cachedByResolution)
  const cached = cachedByResolution.get(resolutionKey)
  if (cached) return cached

  const preparation = (async () => {
    const startedAt = performance.now()
    const bitmap = await createImageBitmap(source.raster)
    try {
      const base = createCanvas(width, height)
      const context = base.getContext('2d', { willReadFrequently: true })
      if (!context) throw new Error('Canvas 2D non disponibile')
      drawBitmapCover(context, bitmap, width, height)
      const rgba = context.getImageData(0, 0, width, height).data
      const field = analyzeMaterialPixels(rgba, width, height, 12)
      const pigmentPixels = new Uint8ClampedArray(rgba.length)
      const edgePixels = new Uint8ClampedArray(rgba.length)
      const grainPixels = new Uint8ClampedArray(rgba.length)
      const regionPixels = field.regions.map(() => new Uint8ClampedArray(rgba.length))
      const seed = hashText(source.id)

      for (let pixel = 0; pixel < width * height; pixel += 1) {
        const offset = pixel * 4
        const color = nearestPaletteColor(
          rgba[offset],
          rgba[offset + 1],
          rgba[offset + 2],
          field.palette,
        )
        pigmentPixels[offset] = color[0]
        pigmentPixels[offset + 1] = color[1]
        pigmentPixels[offset + 2] = color[2]
        pigmentPixels[offset + 3] = Math.round(112 + field.density[pixel] * 108)

        const edgeAlpha = Math.round(clamp(field.edges[pixel] * 3.2) * 235)
        edgePixels[offset] = Math.min(255, rgba[offset] + 28)
        edgePixels[offset + 1] = Math.min(255, rgba[offset + 1] + 28)
        edgePixels[offset + 2] = Math.min(255, rgba[offset + 2] + 28)
        edgePixels[offset + 3] = edgeAlpha

        const noise = (xorshift(seed + pixel * 2_653_443_761) & 255) / 255
        const grainAlpha = noise > 0.58
          ? Math.round((noise - 0.58) * 105 * (0.45 + field.density[pixel]))
          : 0
        grainPixels[offset] = color[0]
        grainPixels[offset + 1] = color[1]
        grainPixels[offset + 2] = color[2]
        grainPixels[offset + 3] = grainAlpha

        const label = field.regionLabels[pixel]
        if (label > 0 && regionPixels[label - 1]) {
          const target = regionPixels[label - 1]
          target[offset] = rgba[offset]
          target[offset + 1] = rgba[offset + 1]
          target[offset + 2] = rgba[offset + 2]
          target[offset + 3] = Math.round(180 + field.density[pixel] * 70)
        }
      }

      const prepared = {
        source,
        field,
        base,
        pigment: canvasFromPixels(pigmentPixels, width, height),
        edges: canvasFromPixels(edgePixels, width, height),
        grain: canvasFromPixels(grainPixels, width, height),
        regionLayers: regionPixels.map((pixels) => canvasFromPixels(pixels, width, height)),
      }
      brainPerformanceMetrics.recordArtworkPreparation(performance.now() - startedAt)
      return prepared
    } finally {
      bitmap.close()
    }
  })()
  cachedByResolution.set(resolutionKey, preparation)
  preparation.catch(() => cachedByResolution.delete(resolutionKey))
  return preparation
}

function bandDrive(
  value: number,
  average: number | undefined,
  transient: number,
): number {
  const baseline = Math.max(0.018, average ?? value * 0.82)
  const sustained = clamp((value - 0.006) / 0.44)
  const lift = clamp((value - baseline) / (baseline * 0.82 + 0.025))
  return clamp(sustained * 0.62 + lift * 0.25 + transient * 0.38)
}

export function calculateBrainMaterialMotion(
  bands: BandEnergies,
  settings: AppSettings,
  rhythm?: BrainRhythmState,
  movingAverages?: BandEnergies,
  flash?: BrainFlashState,
): BrainMaterialMotion {
  const transients = rhythm?.bandTransients ?? SILENT_BANDS
  const low = bandDrive(bands.low, movingAverages?.low, transients.low)
  const lowMid = bandDrive(bands.lowMid, movingAverages?.lowMid, transients.lowMid)
  const mid = bandDrive(bands.mid, movingAverages?.mid, transients.mid)
  const high = bandDrive(bands.high, movingAverages?.high, transients.high)
  const profile = settings.motionProfile === 'ambient'
    ? 0.58
    : settings.motionProfile === 'techno'
      ? 1
      : 0.8
  const softness = settings.softMode ? 0.72 : 1
  const sensitivity = 0.72 + clamp(settings.sensitivity) * 0.38
  const scale = profile * softness * sensitivity
  const flashDrive = flash?.active ? clamp(flash.intensity) : 0
  const activity = clamp(
    (low * 0.3 + lowMid * 0.28 + mid * 0.23 + high * 0.19) * scale +
    flashDrive * 0.18,
  )
  const beat = calculateRhythmicAccent(rhythm) *
    clamp(0.3 + activity * 0.9 + low * 0.28)
  const phase = rhythm?.beatPhase ?? 0
  const phaseRadians = phase * Math.PI * 2
  const directionalActivity = clamp(activity + beat + flashDrive * 0.3)
  return {
    activity,
    pressure: clamp((low * 0.86 + beat * 0.32) * scale),
    fusion: clamp((lowMid * 0.88 + transients.lowMid * 0.24) * scale),
    structure: clamp((mid * 0.82 + transients.mid * 0.32) * scale),
    // `bandDrive` contiene già il transiente high: evita il doppio conteggio
    // che trasformava i sedicesimi di hat in grana sostenuta.
    grain: clamp(high * 0.58 * scale),
    beat,
    flash: flashDrive,
    phaseX: directionalActivity > 0.001
      ? Math.cos(phaseRadians) * directionalActivity
      : 0,
    phaseY: directionalActivity > 0.001
      ? Math.sin(phaseRadians) * directionalActivity
      : 0,
  }
}

export function shouldRenderBrainMaterialFrame(
  motion: BrainMaterialMotion,
  transitionChanged: boolean,
  signatureChanged: boolean,
): boolean {
  return motion.activity > 0.004 || motion.beat > 0.004 || motion.flash > 0.004 ||
    transitionChanged || signatureChanged
}

function drawTransitionBase(
  context: CanvasRenderingContext2D,
  scratchContext: CanvasRenderingContext2D,
  maskContext: CanvasRenderingContext2D,
  maskImage: ImageData,
  from: CachedMaterial,
  to: CachedMaterial,
  progress: number,
  pattern: BrainFrameMorphPattern,
): void {
  const width = from.field.width
  const height = from.field.height
  context.globalCompositeOperation = 'source-over'
  context.globalAlpha = 1
  context.drawImage(from.base, 0, 0, width, height)
  if (progress <= 0) return
  if (progress >= 1 || from.source.id === to.source.id) {
    context.drawImage(to.base, 0, 0, width, height)
    return
  }

  const patternOffset = ['marea', 'fioritura', 'corrente', 'spirale'].indexOf(pattern)
  const focalId = from.field.focalRegionId
  const regionMatches = matchMaterialRegions(from.field.regions, to.field.regions)
  const fromByTarget = new Map(
    regionMatches
      .filter((match) => match.toRegionId !== null)
      .map((match) => [match.toRegionId, match.fromRegionId]),
  )
  for (let pixel = 0; pixel < to.field.width * to.field.height; pixel += 1) {
    const label = to.field.regionLabels[pixel]
    const toRegionId = label > 0 ? label - 1 : null
    const fromRegionId = toRegionId === null
      ? null
      : fromByTarget.get(toRegionId) ?? null
    const preserveFocal = fromRegionId === focalId ? 0.24 : 0
    const regionStagger = toRegionId === null
      ? 0.08
      : ((toRegionId * 0.117 + patternOffset * 0.071) % 0.34)
    const materialThreshold =
      regionStagger + preserveFocal + to.field.density[pixel] * 0.14 +
      to.field.edges[pixel] * 0.06
    const alpha = smoothstep((progress - materialThreshold) / 0.28)
    const offset = pixel * 4
    maskImage.data[offset] = 255
    maskImage.data[offset + 1] = 255
    maskImage.data[offset + 2] = 255
    maskImage.data[offset + 3] = Math.round(alpha * 255)
  }
  maskContext.putImageData(maskImage, 0, 0)
  scratchContext.clearRect(0, 0, width, height)
  scratchContext.globalCompositeOperation = 'source-over'
  scratchContext.globalAlpha = 1
  scratchContext.drawImage(to.base, 0, 0, width, height)
  scratchContext.globalCompositeOperation = 'destination-in'
  scratchContext.drawImage(maskContext.canvas, 0, 0)
  scratchContext.globalCompositeOperation = 'source-over'
  context.drawImage(scratchContext.canvas, 0, 0)
}

export function createBrainMaterialMorphScene(
  pluginContext: BrainRendererPluginContext,
): BrainSceneRendererController {
  const outputCanvas = document.createElement('canvas')
  const configured = getBrainRenderingConfig().image
  outputCanvas.width = Math.min(configured.width, NORMAL_WIDTH)
  outputCanvas.height = Math.min(configured.height, NORMAL_HEIGHT)
  outputCanvas.dataset.brainMaterialMorph = 'preparing'
  outputCanvas.setAttribute('aria-hidden', 'true')
  Object.assign(outputCanvas.style, {
    position: 'absolute',
    inset: '0',
    display: 'block',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    transform: 'translateZ(0)',
  })
  pluginContext.container.appendChild(outputCanvas)
  const context = outputCanvas.getContext('2d', { alpha: false })

  let destroyed = false
  let failed = false
  let resourcePressure = false
  let preparedResolution = ''
  let preparationStarted = false
  let transitionProgress = 1
  let previousTransitionProgress = Number.NaN
  let transitionRole: 'enter' | 'exit' = 'enter'
  let morphPattern: BrainFrameMorphPattern = 'marea'
  let lastRenderedAt = Number.NEGATIVE_INFINITY
  let lastSignature = ''
  let lastMotionAt = Number.NaN
  const motionSmoother = new BrainCanvasMotionSmoother()
  const prepared = new Map<string, CachedMaterial>()
  let currentSource: BrainRendererImageSource | null = null
  let previousSource: BrainRendererImageSource | null = null
  let nextSource: BrainRendererImageSource | null = null
  let scratch = createCanvas(outputCanvas.width, outputCanvas.height)
  let mask = createCanvas(outputCanvas.width, outputCanvas.height)
  let scratchContext = scratch.getContext('2d')
  let maskContext = mask.getContext('2d')
  let maskImage = maskContext?.createImageData(outputCanvas.width, outputCanvas.height) ?? null

  const resolveSources = (): void => {
    const sources = pluginContext.getImageSources()
    currentSource = sources.find((source) => source.role === 'current') ?? {
      id: pluginContext.scene.frameId,
      role: 'current',
      scene: pluginContext.scene,
      raster: pluginContext.raster,
      narrativeHints: [pluginContext.scene.description],
    }
    previousSource = sources.find((source) => source.role === 'previous') ?? null
    nextSource = sources.find((source) => source.role === 'next') ?? null
  }

  const prepare = (lowPowerMode: boolean): void => {
    if (preparationStarted || destroyed) return
    preparationStarted = true
    resolveSources()
    const width = lowPowerMode ? LOW_POWER_WIDTH : NORMAL_WIDTH
    const height = lowPowerMode ? LOW_POWER_HEIGHT : NORMAL_HEIGHT
    preparedResolution = `${width}x${height}`
    outputCanvas.width = width
    outputCanvas.height = height
    scratch = createCanvas(width, height)
    mask = createCanvas(width, height)
    scratchContext = scratch.getContext('2d')
    maskContext = mask.getContext('2d')
    maskImage = maskContext?.createImageData(width, height) ?? null
    const sources = [currentSource, previousSource, nextSource].filter(
      (source): source is BrainRendererImageSource => source !== null,
    )
    void Promise.allSettled(
      sources.map(async (source) => {
        const material = await prepareMaterialSource(source, width, height)
        if (!destroyed) prepared.set(source.id, material)
      }),
    ).then((results) => {
      if (destroyed) return
      const currentId = currentSource?.id
      const currentReady = currentId ? prepared.has(currentId) : false
      if (!currentReady) {
        failed = true
        outputCanvas.dataset.brainMaterialMorph = 'failed'
        brainWarn('render', 'Materia Morph non preparata', {
          frameId: pluginContext.scene.frameId,
          failures: results.filter((result) => result.status === 'rejected').length,
        })
        return
      }
      outputCanvas.dataset.brainMaterialMorph = 'ready'
      brainLog('render', 'Materia Morph preparata', {
        frameId: pluginContext.scene.frameId,
        resolution: preparedResolution,
        regions: currentId ? prepared.get(currentId)?.field.regions.length ?? 0 : 0,
        counterparts: prepared.size - 1,
      })
    })
  }

  const preparedFor = (source: BrainRendererImageSource | null): CachedMaterial | null =>
    source ? prepared.get(source.id) ?? null : null

  return {
    element: outputCanvas,
    isReady: () => currentSource !== null && prepared.has(currentSource.id),
    hasFailed: () => failed,
    setOpacity(opacity) {
      outputCanvas.style.opacity = String(clamp(opacity))
    },
    getMorphShapes: () => [],
    setMorphPattern(pattern) {
      morphPattern = pattern
      outputCanvas.dataset.brainMorphPattern = pattern
    },
    setResourcePressure(active) {
      resourcePressure = active
      outputCanvas.dataset.brainResourcePressure = active ? 'true' : 'false'
    },
    setTransition(progress, role) {
      transitionProgress = clamp(progress)
      transitionRole = role
    },
    update(bands, settings, time, rhythm, movingAverages, flash) {
      if (destroyed || failed || !context) return
      prepare(settings.lowPowerMode)
      // Stesso principio di Bauhaus Morph: in attesa che l'immagine corrente
      // finisca di decodere, mostrare l'ultima disponibile (di norma già in
      // cache) invece di restare fermi (filosofia.md §1).
      const current = preparedFor(currentSource) ??
        preparedFor(previousSource) ??
        preparedFor(nextSource)
      if (!current || !scratchContext || !maskContext || !maskImage) return

      const rawMotion = calculateBrainMaterialMotion(
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
          low: rawMotion.pressure,
          lowMid: rawMotion.fusion,
          mid: rawMotion.structure,
          high: rawMotion.grain,
          activity: rawMotion.activity,
          beat: rawMotion.beat,
        },
        motionElapsed,
        rhythm?.beatDurationMs ?? 500,
        rhythm?.active ?? (rawMotion.activity > 0),
        settings.motionProfile,
      )
      const phase = (rhythm?.beatPhase ?? 0) * Math.PI * 2
      const directionalActivity = clamp(
        smoothMotion.activity + smoothMotion.beat + rawMotion.flash * 0.3,
      )
      const motion: BrainMaterialMotion = {
        ...rawMotion,
        activity: smoothMotion.activity,
        pressure: Math.max(
          smoothMotion.low,
          rawMotion.pressure * 0.76,
          rawMotion.beat * 0.34,
        ),
        fusion: smoothMotion.lowMid,
        structure: smoothMotion.mid,
        grain: smoothMotion.high,
        beat: Math.max(rawMotion.beat, smoothMotion.beat),
        phaseX: directionalActivity > 0.001 ? Math.cos(phase) * directionalActivity : 0,
        phaseY: directionalActivity > 0.001 ? Math.sin(phase) * directionalActivity : 0,
      }
      const from = transitionRole === 'enter'
        ? preparedFor(previousSource) ?? current
        : current
      const to = transitionRole === 'enter'
        ? current
        : preparedFor(nextSource) ?? current
      const transitionChanged =
        !Number.isFinite(previousTransitionProgress) ||
        Math.abs(transitionProgress - previousTransitionProgress) >= 0.001
      const signature = [
        transitionRole,
        Math.round(transitionProgress * 120),
        Math.round(motion.pressure * 40),
        Math.round(motion.fusion * 40),
        Math.round(motion.structure * 40),
        Math.round(motion.grain * 40),
        Math.round(motion.beat * 30),
        Math.round(motion.flash * 30),
        rhythm?.beatIndex ?? 0,
        settings.lowPowerMode ? 1 : 0,
        resourcePressure ? 1 : 0,
      ].join(':')
      const signatureChanged = signature !== lastSignature
      if (!shouldRenderBrainMaterialFrame(
        motion,
        transitionChanged,
        signatureChanged,
      )) return

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

      const width = outputCanvas.width
      const height = outputCanvas.height
      context.clearRect(0, 0, width, height)
      drawTransitionBase(
        context,
        scratchContext,
        maskContext,
        maskImage,
        from,
        to,
        transitionProgress,
        morphPattern,
      )

      const material = transitionProgress >= 0.5 ? to : from
      context.globalCompositeOperation = 'multiply'
      context.globalAlpha = 0.16 + motion.pressure * 0.18
      context.drawImage(material.pigment, 0, 0, width, height)

      const regionBudget = resourcePressure || settings.lowPowerMode ? 6 : 12
      const regions = material.field.regions.slice(0, regionBudget)
      regions.forEach((region, index) => {
        const layer = material.regionLayers[region.id]
        if (!layer) return
        const phase = index * 1.618 + (rhythm?.beatPhase ?? 0) * Math.PI * 2
        const localScale = 1 +
          motion.pressure * (0.006 + region.areaRatio * 0.032) +
          motion.beat * (0.012 + region.salience * 0.018)
        const offsetX =
          Math.cos(phase) * motion.fusion * 2.4 + motion.phaseX * (index % 2 ? -1 : 1)
        const offsetY =
          Math.sin(phase * 0.83) * motion.structure * 1.6 +
          motion.phaseY * (index % 3 === 0 ? -0.7 : 0.7)
        const centerX = region.centroidX * width
        const centerY = region.centroidY * height
        context.save()
        context.globalCompositeOperation = index % 3 === 0 ? 'screen' : 'source-over'
        context.globalAlpha = clamp(
          0.12 + motion.pressure * 0.28 + motion.fusion * 0.18 +
          motion.beat * 0.22 + motion.flash * 0.25,
          0,
          0.72,
        )
        context.translate(centerX + offsetX, centerY + offsetY)
        context.scale(localScale, localScale)
        context.translate(-centerX, -centerY)
        context.drawImage(layer, 0, 0, width, height)
        context.restore()
      })

      context.globalCompositeOperation = 'screen'
      context.globalAlpha = clamp(
        0.08 + motion.structure * 0.3 + motion.grain * 0.16 +
        motion.beat * 0.12 + motion.flash * 0.2,
        0,
        0.58,
      )
      context.drawImage(material.edges, 0, 0, width, height)
      if (!resourcePressure || motion.grain > 0.08) {
        context.globalCompositeOperation = 'overlay'
        context.globalAlpha = clamp(0.055 + motion.grain * 0.34, 0, 0.34)
        context.drawImage(material.grain, 0, 0, width, height)
      }
      context.globalCompositeOperation = 'source-over'
      context.globalAlpha = 1
      outputCanvas.dataset.brainMaterialActivity = motion.activity.toFixed(3)
      outputCanvas.dataset.brainMaterialFlash = motion.flash.toFixed(3)
      outputCanvas.dataset.brainMaterialTransition =
        `${transitionRole}-${transitionProgress.toFixed(3)}`
      brainPerformanceMetrics.recordCanvasFrame(
        time,
        resourcePressure,
        performance.now() - renderStartedAt,
      )
    },
    destroy() {
      destroyed = true
      prepared.clear()
      motionSmoother.reset()
      scratch.width = 1
      scratch.height = 1
      mask.width = 1
      mask.height = 1
      outputCanvas.width = 1
      outputCanvas.height = 1
      outputCanvas.remove()
    },
  }
}
