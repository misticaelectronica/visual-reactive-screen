import type { AppSettings, BandEnergies } from '@shared/types'
import type { DreamStory } from '@shared/brain/brainTypes'
import type { BrainRhythmState } from './brainRhythm'
import type {
  BrainRendererImageSource,
  BrainRendererPluginContext,
} from './brainRendererPlugin'
import type { BrainFlashState, BrainSceneRendererController } from './brainSvgScene'
import {
  analyzeBauhausPixels,
  matchBauhausPlanes,
  type BauhausComposition,
  type BauhausPlane,
  type BauhausPlaneShape,
  type BauhausPoint,
} from './brainBauhausAnalysis'
import {
  BAUHAUS_SILHOUETTES,
  BAUHAUS_SILHOUETTE_POINT_COUNT,
  type BauhausSilhouette,
  type BauhausSilhouettePoint,
} from './brainBauhausSilhouettes'
import { brainLog, brainWarn } from './brainLog'
import { brainPerformanceMetrics } from './brainPerformanceMetrics'
import { BrainCanvasMotionSmoother } from './brainCanvasMotionSmoother'

const NORMAL_WIDTH = 400
const NORMAL_HEIGHT = 225
const LOW_POWER_WIDTH = 280
const LOW_POWER_HEIGHT = 158
const NORMAL_FRAME_INTERVAL_MS = 1_000 / 24
const LOW_POWER_FRAME_INTERVAL_MS = 1_000 / 15
const PRESSURE_FRAME_INTERVAL_MS = 1_000 / 5
const SILENT_BANDS: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }

type RGB = readonly [number, number, number]

type PreparedBauhausArtwork = {
  source: BrainRendererImageSource
  base: HTMLCanvasElement
  grain: HTMLCanvasElement
  regionLayers: Map<number, HTMLCanvasElement>
  composition: BauhausComposition
}

export type BauhausMotion = {
  activity: number
  mass: number
  surface: number
  lines: number
  detail: number
  beat: number
  flash: number
  phase: number
}

const artworkCache = new WeakMap<
  Blob,
  Map<string, Promise<PreparedBauhausArtwork>>
>()

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value))
}

function smoothstep(value: number): number {
  const x = clamp(value)
  return x * x * (3 - 2 * x)
}

// Le forme devono comparire e stabilizzarsi prima che l'immagine di sfondo
// inizi a ritirarsi: il fondo resta fermo al soffitto durante la fase di
// reveal (0 → UNDERLAY_REVEAL_PHASE_END) e scende verso il pavimento solo
// dopo. Il soffitto stesso è basso: le forme devono dominare la scena, non
// l'immagine sottostante.
const UNDERLAY_CEILING = 0.24
const UNDERLAY_FLOOR = 0.08
const UNDERLAY_REVEAL_PHASE_END = 0.4
const UNDERLAY_BEAT_MODULATION = 0.04

export function computeBauhausUnderlayOpacity(
  abstractionProgress: number,
  motion: Pick<BauhausMotion, 'activity' | 'beat'>,
): number {
  const fadeProgress = smoothstep(
    (abstractionProgress - UNDERLAY_REVEAL_PHASE_END) /
      (1 - UNDERLAY_REVEAL_PHASE_END),
  )
  const base = UNDERLAY_CEILING - fadeProgress * (UNDERLAY_CEILING - UNDERLAY_FLOOR)
  // Respiro leggero legato al beat: nullo in silenzio (Check Silenzio).
  const beatBreath = motion.activity > 0 ? motion.beat * UNDERLAY_BEAT_MODULATION : 0
  return clamp(
    base + beatBreath,
    UNDERLAY_FLOOR - UNDERLAY_BEAT_MODULATION,
    UNDERLAY_CEILING + UNDERLAY_BEAT_MODULATION,
  )
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

function hashText(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function noise(seed: number): number {
  let value = seed | 0
  value ^= value << 13
  value ^= value >>> 17
  value ^= value << 5
  return (value >>> 0) / 0xffffffff
}

async function prepareArtwork(
  source: BrainRendererImageSource,
  palette: DreamStory['palette'],
  width: number,
  height: number,
  maximumPlanes: number,
): Promise<PreparedBauhausArtwork> {
  const key = `${width}x${height}:${maximumPlanes}:${palette.join(',')}:${source.id}`
  const cached = artworkCache.get(source.raster) ?? new Map()
  artworkCache.set(source.raster, cached)
  const existing = cached.get(key)
  if (existing) return existing
  const promise = (async () => {
    const startedAt = performance.now()
    const bitmap = await createImageBitmap(source.raster)
    try {
      const base = createCanvas(width, height)
      const baseContext = base.getContext('2d', { willReadFrequently: true })
      if (!baseContext) throw new Error('Canvas Bauhaus non disponibile')
      drawBitmapCover(baseContext, bitmap, width, height)
      const rgba = baseContext.getImageData(0, 0, width, height).data
      const composition = analyzeBauhausPixels(
        rgba,
        width,
        height,
        palette,
        maximumPlanes,
      )
      const regionPixels = new Map<number, Uint8ClampedArray>()
      for (const plane of composition.planes) {
        regionPixels.set(plane.sourceRegionId, new Uint8ClampedArray(rgba.length))
      }
      const grainPixels = new Uint8ClampedArray(rgba.length)
      const seed = hashText(source.id)
      for (let pixel = 0; pixel < width * height; pixel += 1) {
        const offset = pixel * 4
        const label = composition.field.regionLabels[pixel]
        const target = label > 0 ? regionPixels.get(label - 1) : undefined
        if (target) {
          target[offset] = rgba[offset]
          target[offset + 1] = rgba[offset + 1]
          target[offset + 2] = rgba[offset + 2]
          target[offset + 3] = 255
        }
        const value = noise(seed + pixel * 2_654_435_761)
        grainPixels[offset] = value > 0.5 ? 240 : 24
        grainPixels[offset + 1] = value > 0.5 ? 232 : 20
        grainPixels[offset + 2] = value > 0.5 ? 214 : 18
        grainPixels[offset + 3] = value > 0.72
          ? Math.round((value - 0.72) * 150)
          : 0
      }
      const artwork = {
        source,
        base,
        grain: canvasFromPixels(grainPixels, width, height),
        regionLayers: new Map(
          [...regionPixels].map(([id, pixels]) => [
            id,
            canvasFromPixels(pixels, width, height),
          ]),
        ),
        composition,
      }
      brainPerformanceMetrics.recordArtworkPreparation(performance.now() - startedAt)
      return artwork
    } finally {
      bitmap.close()
    }
  })()
  cached.set(key, promise)
  promise.catch(() => cached.delete(key))
  return promise
}

// Soglie unificate fra tutti i renderer Brain (in precedenza ogni file
// aveva la propria versione con drift casuale — 0.006/0.007/0.008,
// 0.42/0.44 — segnalato dallo sviluppatore come "soglie a cazzo"): stessa
// formula, stessi numeri ovunque, leggermente più reattiva della media
// osservata prima di questa unificazione.
function bandDrive(value: number, average: number | undefined, transient: number): number {
  const baseline = Math.max(0.018, average ?? value * 0.82)
  const sustained = clamp((value - 0.006) / 0.4)
  const lift = clamp((value - baseline) / (baseline * 0.8 + 0.024))
  return clamp(sustained * 0.6 + lift * 0.3 + transient * 0.44)
}

export function calculateBauhausMotion(
  bands: BandEnergies,
  settings: AppSettings,
  rhythm?: BrainRhythmState,
  movingAverages?: BandEnergies,
  flash?: BrainFlashState,
): BauhausMotion {
  const transients = rhythm?.bandTransients ?? SILENT_BANDS
  const low = bandDrive(bands.low, movingAverages?.low, transients.low)
  const lowMid = bandDrive(bands.lowMid, movingAverages?.lowMid, transients.lowMid)
  const mid = bandDrive(bands.mid, movingAverages?.mid, transients.mid)
  const high = bandDrive(bands.high, movingAverages?.high, transients.high)
  const profile = settings.motionProfile === 'ambient'
    ? 0.66
    : settings.motionProfile === 'techno'
      ? 1.12
      : 0.9
  const scale = profile * (0.76 + clamp(settings.sensitivity) * 0.44) *
    (settings.softMode ? 0.72 : 1)
  const signalScale = rhythm?.active === false ? 0 : scale
  const activity = rhythm?.active === false
    ? 0
    : clamp((low * 0.3 + lowMid * 0.3 + mid * 0.24 + high * 0.16) * signalScale)
  const beat = activity > 0
    ? clamp(rhythm?.kickEnvelope ?? rhythm?.beatPulse ?? 0) *
      clamp(activity * 1.35 + low * 0.36)
    : 0
  return {
    activity,
    mass: clamp((low * 0.88 + beat * 0.26) * signalScale),
    surface: clamp((lowMid * 0.9 + transients.lowMid * 0.22) * signalScale),
    lines: clamp((mid * 0.88 + transients.mid * 0.3 + beat * 0.14) * signalScale),
    detail: clamp((high * 0.76 + transients.high * 0.38) * signalScale),
    beat,
    flash: flash?.active ? clamp(flash.intensity) : 0,
    phase: activity > 0 ? rhythm?.beatPhase ?? 0 : 0,
  }
}

export function advanceBauhausAbstraction(
  progress: number,
  previousMusicalPosition: number | null,
  rhythm: BrainRhythmState | undefined,
  motion: BauhausMotion,
): number {
  if (!rhythm?.active || previousMusicalPosition === null || motion.activity <= 0) {
    return clamp(progress)
  }
  const delta = clamp(rhythm.musicalPosition - previousMusicalPosition, 0, 0.16)
  return clamp(
    progress + delta * (0.05 + motion.surface * 0.035 + motion.beat * 0.02),
  )
}

// Le figure Bauhaus sono un accento guadagnato dall'attività e dal beat
// reali già calcolati da `calculateBauhausMotion` (non un secondo
// profilo di banda separato: qui non serve rilevare un CAMBIO di
// carattere come in Dream Segmentation, basta l'energia sostenuta).
// Zero audio → l'accumulatore resta a 0 e nessuna figura può comparire
// (Check Silenzio). Colore preso dalla palette dell'immagine corrente,
// posizione su ancore non casuali; se una figura resta vicina a un piano
// esistente abbastanza a lungo può provare a diventare una sagoma
// riconoscibile, scelta da una libreria curata a mano (non casuale, non
// ML) in base alle proporzioni del piano vicino — risponde al vincolo
// del brief originale piano-019 ("non una sovrapposizione di forme
// casuali") sia nella genesi sia nell'esito. Ingresso/uscita e il
// "diventare oggetto" sono sempre un morph continuo (Check Transizione,
// riusa `interpolatedPlane`), mai la camera intera (Check Camera),
// disabilitate sotto `resourcePressure` (Check Costo).
const FIGURE_OUTLINE_POINTS = BAUHAUS_SILHOUETTE_POINT_COUNT
// Frequenza: lo sviluppatore ha chiesto esplicitamente il cambio di
// figura molto spesso (non più "raro, ogni tanto") — soglie di guadagno
// alte e tempo minimo fra un innesco e l'altro breve, così una nuova
// figura può comparire quasi subito dopo che la precedente si è spenta
// (vita di una figura ~5.5s, vedi `FIGURE_FADE_IN_MS`/`FIGURE_HOLD_MS`/
// `FIGURE_FADE_OUT_MS` sotto), restando comunque guadagnata dall'ascolto
// reale, non un timer piatto (Check Silenzio).
const FIGURE_ACTIVITY_GAIN_PER_MS = 0.00045
const FIGURE_BEAT_GAIN_PER_MS = 0.0009
const FIGURE_DECAY_PER_MS = 0.00002
const FIGURE_THRESHOLD = 1
const MINIMUM_FIGURE_DWELL_MS = 2_500
const FIGURE_MIN_SIZE_RATIO = 0.14
const FIGURE_MAX_SIZE_RATIO = 0.24
const FIGURE_FADE_IN_MS = 900
const FIGURE_HOLD_MS = 3_200
const FIGURE_FADE_OUT_MS = 1_400
const FIGURE_MAX_ALPHA = 0.5
const FIGURE_PROXIMITY_THRESHOLD = 0.22
const FIGURE_PROXIMITY_DWELL_MS = 1_500
const FIGURE_BECOME_MS = 1_200
const FIGURE_ANCHORS: readonly BauhausSilhouettePoint[] = [
  { x: 1 / 3, y: 1 / 3 },
  { x: 2 / 3, y: 1 / 3 },
  { x: 1 / 3, y: 2 / 3 },
  { x: 2 / 3, y: 2 / 3 },
]

export type BauhausFigureAccumulatorState = {
  accumulator: number
  lastEventAt: number
}

export type BauhausFigureBecomeState = 'abstract' | 'becoming' | 'object'

export type BauhausFigureInstance = {
  plane: BauhausPlane
  spawnedAt: number
  becomeState: BauhausFigureBecomeState
  nearMs: number
  becomeStartedAt: number | null
  targetSilhouetteId: string | null
  targetPlane: BauhausPlane | null
}

// Hash deterministico (non casuale ad ogni frame): stesso trigger, stessa
// geometria, finché la figura non ne genera una nuova — stesso pattern già
// usato in `brainDreamSegmentationCanvas.ts`/`brainGlitchMorphCanvas.ts`,
// copia privata locale come in quei file (nessuna condivisa nel repo).
function hashUnit(x: number, y: number, salt: number): number {
  let h = (Math.round(x * 131) ^ Math.round(y * 977) ^ Math.imul(salt, 2654435761)) | 0
  h = Math.imul(h ^ (h >>> 15), 2246822519)
  h ^= h >>> 13
  return ((h >>> 0) % 1000) / 1000
}

function sampleAbstractOutline(
  shape: BauhausPlaneShape,
  pointCount: number,
): BauhausSilhouettePoint[] {
  if (shape === 'ellipse') {
    return Array.from({ length: pointCount }, (_, index) => {
      const angle = -Math.PI / 2 + (index / pointCount) * Math.PI * 2
      return { x: Math.cos(angle) * 0.5, y: Math.sin(angle) * 0.5 }
    })
  }
  const corners = shape === 'triangle'
    ? [{ x: 0, y: -0.5 }, { x: 0.5, y: 0.5 }, { x: -0.5, y: 0.5 }]
    : [{ x: -0.5, y: -0.5 }, { x: 0.5, y: -0.5 }, { x: 0.5, y: 0.5 }, { x: -0.5, y: 0.5 }]
  const points: BauhausSilhouettePoint[] = []
  const sideCount = corners.length
  const stepsPerSide = pointCount / sideCount
  for (let side = 0; side < sideCount; side += 1) {
    const a = corners[side]
    const b = corners[(side + 1) % sideCount]
    for (let step = 0; step < stepsPerSide && points.length < pointCount; step += 1) {
      const t = step / stepsPerSide
      points.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
    }
  }
  while (points.length < pointCount) points.push(points[points.length - 1])
  return points
}

function bakeOutline(
  points: readonly BauhausSilhouettePoint[],
  centerX: number,
  centerY: number,
  size: number,
): BauhausPoint[] {
  return points.map((point) => ({
    x: centerX + point.x * size,
    y: centerY + point.y * size,
  }))
}

export function updateBauhausFigureAccumulator(
  state: BauhausFigureAccumulatorState,
  motion: Pick<BauhausMotion, 'activity' | 'beat'>,
  elapsedMs: number,
  now: number,
  active: boolean,
): { state: BauhausFigureAccumulatorState; triggered: boolean } {
  // Check Silenzio: senza audio attivo l'accumulatore non cresce mai.
  if (!active) {
    return { state: { accumulator: 0, lastEventAt: state.lastEventAt }, triggered: false }
  }
  const elapsed = Math.max(0, elapsedMs)
  const growth = (
    motion.activity * FIGURE_ACTIVITY_GAIN_PER_MS + motion.beat * FIGURE_BEAT_GAIN_PER_MS
  ) * elapsed
  const decayed = Math.max(0, state.accumulator - FIGURE_DECAY_PER_MS * elapsed)
  const nextAccumulator = decayed + growth
  const dwellElapsed = now - state.lastEventAt >= MINIMUM_FIGURE_DWELL_MS
  if (dwellElapsed && nextAccumulator >= FIGURE_THRESHOLD) {
    return { state: { accumulator: 0, lastEventAt: now }, triggered: true }
  }
  return { state: { accumulator: nextAccumulator, lastEventAt: state.lastEventAt }, triggered: false }
}

export function createBauhausFigure(
  triggerAt: number,
  musicalPosition: number,
  composition: Pick<BauhausComposition, 'palette'>,
): BauhausFigureInstance {
  const shapeSeed = hashUnit(triggerAt, musicalPosition, 1)
  const shape: BauhausPlaneShape = shapeSeed < 0.34
    ? 'rect'
    : shapeSeed < 0.67
      ? 'ellipse'
      : 'triangle'
  const anchorIndex = Math.min(
    FIGURE_ANCHORS.length - 1,
    Math.floor(hashUnit(triggerAt, musicalPosition, 2) * FIGURE_ANCHORS.length),
  )
  const anchor = FIGURE_ANCHORS[anchorIndex]
  const jitterX = (hashUnit(triggerAt, musicalPosition, 3) - 0.5) * 0.12
  const jitterY = (hashUnit(triggerAt, musicalPosition, 4) - 0.5) * 0.12
  const centerX = clamp(anchor.x + jitterX, 0.12, 0.88)
  const centerY = clamp(anchor.y + jitterY, 0.12, 0.88)
  const size = FIGURE_MIN_SIZE_RATIO +
    hashUnit(triggerAt, musicalPosition, 5) * (FIGURE_MAX_SIZE_RATIO - FIGURE_MIN_SIZE_RATIO)
  const rotation = shape === 'triangle'
    ? (hashUnit(triggerAt, musicalPosition, 6) - 0.5) * 0.6
    : 0
  const paletteIndex = Math.min(
    composition.palette.length - 1,
    Math.floor(hashUnit(triggerAt, musicalPosition, 7) * composition.palette.length),
  )
  const color = composition.palette[paletteIndex] ?? '#eee7d8'
  const outline = bakeOutline(
    sampleAbstractOutline(shape, FIGURE_OUTLINE_POINTS),
    centerX,
    centerY,
    size,
  )
  const plane: BauhausPlane = {
    id: `figure-${triggerAt.toFixed(0)}`,
    sourceRegionId: -1,
    shape,
    centerX,
    centerY,
    width: size,
    height: size,
    rotation,
    color,
    salience: 0.6,
    focal: false,
    abstractionStart: 0,
    abstractionEnd: 1,
    outline,
  }
  return {
    plane,
    spawnedAt: triggerAt,
    becomeState: 'abstract',
    nearMs: 0,
    becomeStartedAt: null,
    targetSilhouetteId: null,
    targetPlane: null,
  }
}

export function computeBauhausFigureEnvelope(
  elapsedMs: number,
): { opacity: number; scale: number; alive: boolean } {
  const elapsed = Math.max(0, elapsedMs)
  const holdStart = FIGURE_FADE_IN_MS
  const fadeOutStart = FIGURE_FADE_IN_MS + FIGURE_HOLD_MS
  const totalLife = fadeOutStart + FIGURE_FADE_OUT_MS
  if (elapsed >= totalLife) return { opacity: 0, scale: 1, alive: false }
  if (elapsed < holdStart) {
    const t = smoothstep(elapsed / FIGURE_FADE_IN_MS)
    return { opacity: t, scale: 0.85 + t * 0.15, alive: true }
  }
  if (elapsed < fadeOutStart) {
    return { opacity: 1, scale: 1, alive: true }
  }
  const t = smoothstep((elapsed - fadeOutStart) / FIGURE_FADE_OUT_MS)
  return { opacity: 1 - t, scale: 1 + t * 0.04, alive: true }
}

export function updateBauhausFigureProximity(
  figureCenterX: number,
  figureCenterY: number,
  nearbyPlanes: readonly Pick<BauhausPlane, 'centerX' | 'centerY' | 'width' | 'height' | 'shape'>[],
  nearMs: number,
  elapsedMs: number,
): {
  nearMs: number
  nearestPlane: Pick<BauhausPlane, 'width' | 'height' | 'shape'> | null
} {
  let nearestDistance = Number.POSITIVE_INFINITY
  let nearestPlane: Pick<BauhausPlane, 'centerX' | 'centerY' | 'width' | 'height' | 'shape'> | null = null
  for (const plane of nearbyPlanes) {
    const distance = Math.hypot(plane.centerX - figureCenterX, plane.centerY - figureCenterY)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestPlane = plane
    }
  }
  const within = nearestPlane !== null && nearestDistance <= FIGURE_PROXIMITY_THRESHOLD
  const nextNearMs = within ? nearMs + Math.max(0, elapsedMs) : 0
  return { nearMs: nextNearMs, nearestPlane: within ? nearestPlane : null }
}

export function selectBauhausSilhouette(
  nearbyPlane: Pick<BauhausPlane, 'width' | 'height'>,
  seed: number,
): BauhausSilhouette {
  const aspectRatio = nearbyPlane.height > 0.0001 ? nearbyPlane.width / nearbyPlane.height : 1
  const ranked = [...BAUHAUS_SILHOUETTES].sort(
    (a, b) => Math.abs(a.aspectRatio - aspectRatio) - Math.abs(b.aspectRatio - aspectRatio),
  )
  const candidates = ranked.slice(0, 3)
  const index = Math.min(
    candidates.length - 1,
    Math.floor(hashUnit(seed, aspectRatio * 1_000, 11) * candidates.length),
  )
  return candidates[index]
}

function parseColor(value: string): RGB {
  const hex = value.match(/^#([0-9a-f]{6})$/iu)?.[1]
  return hex
    ? [
        Number.parseInt(hex.slice(0, 2), 16),
        Number.parseInt(hex.slice(2, 4), 16),
        Number.parseInt(hex.slice(4, 6), 16),
      ]
    : [220, 214, 198]
}

function mixedColor(from: string, to: string, amount: number): string {
  const left = parseColor(from)
  const right = parseColor(to)
  const channels = left.map((channel, index) =>
    Math.round(channel + (right[index] - channel) * clamp(amount)),
  )
  return `rgb(${channels[0]} ${channels[1]} ${channels[2]})`
}

function interpolatedPlane(
  from: BauhausPlane | null,
  to: BauhausPlane | null,
  progress: number,
): BauhausPlane | null {
  const source = from ?? to
  const target = to ?? from
  if (!source || !target) return null
  const appearing = from === null ? progress : to === null ? 1 - progress : 1
  const outline = source.outline.length === target.outline.length
    ? source.outline.map((point, index) => ({
        x: point.x + (target.outline[index].x - point.x) * progress,
        y: point.y + (target.outline[index].y - point.y) * progress,
      }))
    : progress < 0.5 ? source.outline : target.outline
  return {
    ...target,
    centerX: source.centerX + (target.centerX - source.centerX) * progress,
    centerY: source.centerY + (target.centerY - source.centerY) * progress,
    width: source.width + (target.width - source.width) * progress * appearing,
    height: source.height + (target.height - source.height) * progress * appearing,
    rotation: source.rotation + (target.rotation - source.rotation) * progress,
    color: mixedColor(source.color, target.color, progress),
    salience: target.salience * appearing,
    outline,
  }
}

function planePath(
  context: CanvasRenderingContext2D,
  plane: BauhausPlane,
  width: number,
  height: number,
  scale: number,
  offsetX: number,
  offsetY: number,
): void {
  if (plane.outline.length >= 3) {
    context.translate(offsetX, offsetY)
    context.beginPath()
    plane.outline.forEach((point, index) => {
      const x = plane.centerX * width +
        (point.x - plane.centerX) * width * scale
      const y = plane.centerY * height +
        (point.y - plane.centerY) * height * scale
      if (index === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    })
    context.closePath()
    return
  }
  const planeWidth = plane.width * width * scale
  const planeHeight = plane.height * height * scale
  context.translate(plane.centerX * width + offsetX, plane.centerY * height + offsetY)
  context.rotate(plane.rotation)
  context.beginPath()
  if (plane.shape === 'ellipse') {
    context.ellipse(0, 0, planeWidth / 2, planeHeight / 2, 0, 0, Math.PI * 2)
  } else if (plane.shape === 'triangle') {
    context.moveTo(0, -planeHeight / 2)
    context.lineTo(planeWidth / 2, planeHeight / 2)
    context.lineTo(-planeWidth / 2, planeHeight / 2)
    context.closePath()
  } else {
    const skew = plane.shape === 'slab' ? Math.min(planeWidth, planeHeight) * 0.12 : 0
    context.moveTo(-planeWidth / 2 + skew, -planeHeight / 2)
    context.lineTo(planeWidth / 2, -planeHeight / 2)
    context.lineTo(planeWidth / 2 - skew, planeHeight / 2)
    context.lineTo(-planeWidth / 2, planeHeight / 2)
    context.closePath()
  }
}

export function createBrainBauhausMorphScene(
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
  fallback.src = fallbackUrl
  fallback.alt = ''
  fallback.setAttribute('aria-hidden', 'true')
  Object.assign(fallback.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: '0.82',
    filter: 'saturate(0.86) contrast(1.04)',
  })
  const output = createCanvas(NORMAL_WIDTH, NORMAL_HEIGHT)
  output.dataset.brainRenderer = 'bauhaus-morph'
  output.dataset.brainBauhaus = 'preparing'
  output.setAttribute('aria-hidden', 'true')
  Object.assign(output.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    display: 'block',
    pointerEvents: 'none',
    transform: 'translateZ(0)',
    opacity: '0',
  })
  root.append(fallback, output)
  pluginContext.container.appendChild(root)
  let context = output.getContext('2d', { alpha: false })
  let destroyed = false
  let failed = false
  let preparationStarted = false
  let resourcePressure = false
  let transitionProgress = 1
  let previousTransitionProgress = Number.NaN
  let transitionRole: 'enter' | 'exit' = 'enter'
  let lastRenderedAt = Number.NEGATIVE_INFINITY
  let lastSignature = ''
  let abstractionProgress = 0
  let previousMusicalPosition: number | null = null
  let lastMotionAt = Number.NaN
  let figureAccumulator: BauhausFigureAccumulatorState = {
    accumulator: 0,
    lastEventAt: Number.NEGATIVE_INFINITY,
  }
  let activeFigure: BauhausFigureInstance | null = null
  const motionSmoother = new BrainCanvasMotionSmoother()
  const prepared = new Map<string, PreparedBauhausArtwork>()
  const matchCache = new Map<string, ReturnType<typeof matchBauhausPlanes>>()
  let currentSource: BrainRendererImageSource | null = null
  let previousSource: BrainRendererImageSource | null = null
  let nextSource: BrainRendererImageSource | null = null

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
    const planeBudget = lowPowerMode ? 7 : 12
    output.width = width
    output.height = height
    context = output.getContext('2d', { alpha: false })
    const sources = [previousSource, currentSource, nextSource].filter(
      (source): source is BrainRendererImageSource => source !== null,
    )
    void Promise.allSettled(sources.map(async (source) => {
      const artwork = await prepareArtwork(
        source,
        pluginContext.palette,
        width,
        height,
        planeBudget,
      )
      if (!destroyed) prepared.set(source.id, artwork)
    })).then((results) => {
      if (destroyed) return
      if (!currentSource || !prepared.has(currentSource.id)) {
        failed = true
        output.dataset.brainBauhaus = 'failed'
        brainWarn('render', 'Bauhaus Morph non preparato', {
          frameId: pluginContext.scene.frameId,
          failures: results.filter((result) => result.status === 'rejected').length,
        })
        return
      }
      output.dataset.brainBauhaus = 'ready'
      output.style.opacity = '1'
      const composition = prepared.get(currentSource.id)?.composition
      brainLog('render', 'Bauhaus Morph preparato', {
        frameId: pluginContext.scene.frameId,
        resolution: `${width}x${height}`,
        planes: composition?.planes.length ?? 0,
        lines: composition?.lines.length ?? 0,
        axis: composition?.dominantAxis ?? 'neutral',
      })
    })
  }

  const artworkFor = (source: BrainRendererImageSource | null) =>
    source ? prepared.get(source.id) ?? null : null

  return {
    element: root,
    isReady: () => currentSource !== null && prepared.has(currentSource.id),
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
      const drawingContext = context
      prepare(settings.lowPowerMode)
      // In attesa che l'immagine corrente finisca di decodere, mostrare
      // l'ultima disponibile (di norma già in cache, quasi istantanea)
      // invece di restare fermi: una forma sufficientemente coerente che
      // esiste per un intervallo è preferibile a un fotogramma vuoto
      // (filosofia.md §1 — il denoising non cerca una rappresentazione
      // definitiva, negozia con ciò che è già disponibile).
      const current = artworkFor(currentSource) ??
        artworkFor(previousSource) ??
        artworkFor(nextSource)
      if (!current) return
      const rawMotion = calculateBauhausMotion(
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
          low: rawMotion.mass,
          lowMid: rawMotion.surface,
          mid: rawMotion.lines,
          high: rawMotion.detail,
          activity: rawMotion.activity,
          beat: rawMotion.beat,
        },
        motionElapsed,
        rhythm?.beatDurationMs ?? 500,
        rhythm?.active ?? (rawMotion.activity > 0),
        settings.motionProfile,
      )
      const motion: BauhausMotion = {
        ...rawMotion,
        activity: smoothMotion.activity,
        mass: smoothMotion.low,
        surface: smoothMotion.lowMid,
        lines: smoothMotion.mid,
        detail: smoothMotion.high,
        beat: smoothMotion.beat,
      }
      abstractionProgress = advanceBauhausAbstraction(
        abstractionProgress,
        previousMusicalPosition,
        rhythm,
        motion,
      )
      previousMusicalPosition = rhythm?.musicalPosition ?? previousMusicalPosition

      // Figure Bauhaus (PIANO-037): l'accumulatore avanza ad ogni update(),
      // non solo sui fotogrammi che superano il gating sotto — un
      // comportamento raro guadagnato dall'ascolto reale, non un momento
      // fisso legato al ritmo di disegno.
      const audioActive = rhythm?.active ?? motion.activity > 0
      const figureAccumulatorResult = updateBauhausFigureAccumulator(
        figureAccumulator,
        motion,
        motionElapsed,
        time,
        audioActive,
      )
      figureAccumulator = figureAccumulatorResult.state
      if (!resourcePressure && !activeFigure && figureAccumulatorResult.triggered) {
        activeFigure = createBauhausFigure(
          time,
          rhythm?.musicalPosition ?? 0,
          current.composition,
        )
      }
      if (activeFigure && !computeBauhausFigureEnvelope(time - activeFigure.spawnedAt).alive) {
        activeFigure = null
      }

      const from = transitionRole === 'enter'
        ? artworkFor(previousSource) ?? current
        : current
      const to = transitionRole === 'enter'
        ? current
        : artworkFor(nextSource) ?? current
      const signature = [
        transitionRole,
        Math.round(transitionProgress * 120),
        Math.round(abstractionProgress * 180),
        Math.round(motion.flash * 30),
        rhythm?.beatIndex ?? 0,
        settings.lowPowerMode ? 1 : 0,
        resourcePressure ? 1 : 0,
        activeFigure ? 1 : 0,
        activeFigure
          ? Math.round(computeBauhausFigureEnvelope(time - activeFigure.spawnedAt).opacity * 100)
          : 0,
        activeFigure?.becomeState ?? '',
        activeFigure?.becomeState === 'becoming'
          ? Math.round(
              ((time - (activeFigure.becomeStartedAt ?? time)) / FIGURE_BECOME_MS) * 100,
            )
          : 0,
      ].join(':')
      const transitionChanged = !Number.isFinite(previousTransitionProgress) ||
        Math.abs(transitionProgress - previousTransitionProgress) >= 0.001
      const signatureChanged = signature !== lastSignature
      const continuousMotion = motion.activity > 0.002 || motion.beat > 0.002
      if (!continuousMotion && !signatureChanged && !transitionChanged) return
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
      lastSignature = signature
      previousTransitionProgress = transitionProgress
      const renderStartedAt = performance.now()

      const width = output.width
      const height = output.height
      const transition = smoothstep(transitionProgress)
      drawingContext.globalCompositeOperation = 'source-over'
      drawingContext.globalAlpha = 1
      drawingContext.fillStyle = to.composition.palette[0] ?? '#171514'
      drawingContext.fillRect(0, 0, width, height)
      const underlayOpacity = computeBauhausUnderlayOpacity(abstractionProgress, motion)
      if (transition < 0.999) {
        drawingContext.globalAlpha = underlayOpacity * (1 - transition)
        drawingContext.drawImage(from.base, 0, 0, width, height)
      }
      if (transition > 0.001) {
        drawingContext.globalAlpha = underlayOpacity * transition
        drawingContext.drawImage(to.base, 0, 0, width, height)
      }

      const activeArtwork = transition >= 0.5 ? to : from
      const activeComposition = activeArtwork.composition
      const negativeBudget = settings.lowPowerMode ? 2 : 4
      drawingContext.globalCompositeOperation = 'source-over'
      activeComposition.negativeSpaces.slice(0, negativeBudget).forEach((space, index) => {
        const reveal = smoothstep((abstractionProgress - 0.18 - index * 0.08) / 0.36)
        if (reveal <= 0) return
        drawingContext.globalAlpha = reveal * (0.12 + space.score * 0.12)
        drawingContext.fillStyle = activeComposition.palette.at(-2) ?? '#eee7d8'
        drawingContext.fillRect(
          space.x * width,
          space.y * height,
          space.width * width,
          space.height * height,
        )
      })

      // Cerchi concentrici attorno al piano focale — riferimento diretto a
      // Kandinsky ("Several Circles") e alle forme annidate di Albers:
      // estende il vocabolario di Bauhaus Morph oltre piani/linee/spazi
      // negativi già esistenti, restando un motivo locale (Check Camera:
      // non tocca la camera, solo l'area del piano focale) e reattivo al
      // beat, non a un orologio autonomo (Check Silenzio/Beatmatch).
      const focalPlane = activeComposition.planes.find((plane) => plane.focal)
      if (focalPlane && !resourcePressure) {
        const ringReveal = smoothstep((abstractionProgress - 0.3) / 0.5)
        if (ringReveal > 0.001) {
          const centerX = focalPlane.centerX * width
          const centerY = focalPlane.centerY * height
          const baseRadius = Math.max(focalPlane.width * width, focalPlane.height * height) * 0.5
          const ringCount = settings.lowPowerMode ? 2 : 4
          drawingContext.globalCompositeOperation = 'screen'
          for (let ring = 0; ring < ringCount; ring += 1) {
            const spread = 1 + ring * (0.55 + motion.surface * 0.12)
            const radius = baseRadius * spread * (1 + motion.beat * 0.03)
            if (radius <= 1) continue
            drawingContext.beginPath()
            drawingContext.arc(centerX, centerY, radius, 0, Math.PI * 2)
            drawingContext.strokeStyle =
              activeComposition.palette[(ring + 1) % activeComposition.palette.length] ?? '#eee7d8'
            drawingContext.lineWidth = (1.1 + motion.beat * 1.4) * (1 - ring * 0.12)
            drawingContext.globalAlpha = clamp(
              ringReveal * (0.32 - ring * 0.05) + motion.beat * 0.08,
            )
            drawingContext.stroke()
          }
          drawingContext.globalCompositeOperation = 'source-over'
        }
      }

      // Figura Bauhaus: disegnata SOPRA il materiale raster-derivato
      // (sfondo/underlay/spazi negativi/cerchi) così si legge come un
      // accento, ma SOTTO le piane abbinate/l'overlay raster focale che
      // seguono, così quel materiale resta l'ancora compositiva dominante
      // (Check Materia). `source-over` (non `screen`, per non duplicare il
      // linguaggio dei cerchi), opacità limitata da `FIGURE_MAX_ALPHA`: non
      // può mai occludere del tutto la composizione sotto.
      if (!resourcePressure && activeFigure) {
        const envelope = computeBauhausFigureEnvelope(time - activeFigure.spawnedAt)
        const becomeProgress = activeFigure.becomeState === 'object'
          ? 1
          : activeFigure.becomeState === 'becoming' && activeFigure.becomeStartedAt !== null
            ? smoothstep((time - activeFigure.becomeStartedAt) / FIGURE_BECOME_MS)
            : 0
        const drawnPlane = activeFigure.targetPlane
          ? interpolatedPlane(activeFigure.plane, activeFigure.targetPlane, becomeProgress) ?? activeFigure.plane
          : activeFigure.plane
        drawingContext.save()
        planePath(drawingContext, drawnPlane, width, height, envelope.scale, 0, 0)
        drawingContext.globalCompositeOperation = 'source-over'
        drawingContext.globalAlpha = clamp(envelope.opacity * FIGURE_MAX_ALPHA)
        drawingContext.fillStyle = drawnPlane.color
        drawingContext.fill()
        drawingContext.restore()
      }

      const matchKey = `${from.source.id}->${to.source.id}`
      let matches = matchCache.get(matchKey)
      if (!matches) {
        matches = matchBauhausPlanes(from.composition, to.composition)
        matchCache.set(matchKey, matches)
      }
      const planeBudget = resourcePressure ? 6 : settings.lowPowerMode ? 7 : 12
      const texturedPlaneBudget = settings.lowPowerMode ? 2 : 4
      const visiblePlanesForFigure: BauhausPlane[] = []
      matches.slice(0, planeBudget).forEach((match, index) => {
        const plane = interpolatedPlane(match.from, match.to, transition)
        if (!plane) return
        const local = smoothstep(
          (abstractionProgress - plane.abstractionStart) /
          Math.max(0.08, plane.abstractionEnd - plane.abstractionStart),
        )
        if (local <= 0) return
        visiblePlanesForFigure.push(plane)
        const phase = motion.phase * Math.PI * 2 + index * 1.37
        const offsetScale = motion.activity > 0 ? motion.surface * 1.8 : 0
        const offsetX = Math.cos(phase) * offsetScale * (index % 2 ? -1 : 1)
        const offsetY = Math.sin(phase) * offsetScale * 0.64
        const scale = 1 + motion.mass * 0.018 + motion.beat * plane.salience * 0.012
        drawingContext.save()
        planePath(drawingContext, plane, width, height, scale, offsetX, offsetY)
        drawingContext.globalCompositeOperation = index % 4 === 0 ? 'multiply' : 'source-over'
        drawingContext.globalAlpha = clamp(local * (0.55 + plane.salience * 0.35 + motion.beat * 0.12))
        drawingContext.fillStyle = plane.color
        drawingContext.fill()
        const sourceRegionId = transition >= 0.5
          ? match.to?.sourceRegionId
          : match.from?.sourceRegionId
        const sourceLayer = sourceRegionId === undefined
          ? null
          : activeArtwork.regionLayers.get(sourceRegionId)
        if (sourceLayer && index < texturedPlaneBudget) {
          drawingContext.save()
          drawingContext.clip()
          drawingContext.globalCompositeOperation = 'soft-light'
          drawingContext.globalAlpha = clamp(
            local * (0.13 + plane.salience * 0.12) * (1 - abstractionProgress * 0.35),
          )
          drawingContext.drawImage(sourceLayer, 0, 0, width, height)
          drawingContext.restore()
        }
        drawingContext.globalCompositeOperation = 'source-over'
        drawingContext.globalAlpha = clamp(local * (0.18 + motion.lines * 0.25))
        drawingContext.strokeStyle = activeComposition.palette.at(-1) ?? '#171514'
        drawingContext.lineWidth = 0.7 + motion.lines * 1.5
        drawingContext.stroke()
        drawingContext.restore()
      })

      // Prossimità della figura ai piani appena disegnati: aggiornata QUI
      // (dopo averli calcolati) e usata al disegno del PROSSIMO fotogramma
      // — un ritardo di un frame, impercettibile, più semplice che
      // ricalcolare i piani abbinati due volte nello stesso giro. Se la
      // figura si allontana, `nearMs` si azzera: "diventare un oggetto"
      // resta condizionato, non garantito (non deve essere "ad ogni
      // occasione", segnalato dallo sviluppatore).
      if (!resourcePressure && activeFigure?.becomeState === 'abstract') {
        const proximity = updateBauhausFigureProximity(
          activeFigure.plane.centerX,
          activeFigure.plane.centerY,
          visiblePlanesForFigure,
          activeFigure.nearMs,
          motionElapsed,
        )
        activeFigure.nearMs = proximity.nearMs
        if (proximity.nearestPlane && activeFigure.nearMs >= FIGURE_PROXIMITY_DWELL_MS) {
          const silhouette = selectBauhausSilhouette(proximity.nearestPlane, activeFigure.spawnedAt)
          activeFigure.targetSilhouetteId = silhouette.id
          activeFigure.targetPlane = {
            ...activeFigure.plane,
            outline: bakeOutline(
              silhouette.points,
              activeFigure.plane.centerX,
              activeFigure.plane.centerY,
              activeFigure.plane.width,
            ),
          }
          activeFigure.becomeState = 'becoming'
          activeFigure.becomeStartedAt = time
        }
      } else if (activeFigure?.becomeState === 'becoming' && activeFigure.becomeStartedAt !== null) {
        if (time - activeFigure.becomeStartedAt >= FIGURE_BECOME_MS) {
          activeFigure.becomeState = 'object'
        }
      }

      const focal = activeComposition.planes.find((plane) => plane.focal)
      const focalLayer = focal
        ? activeArtwork.regionLayers.get(focal.sourceRegionId)
        : null
      if (focalLayer) {
        drawingContext.globalCompositeOperation = 'source-over'
        drawingContext.globalAlpha = clamp(0.1 + (1 - abstractionProgress) * 0.2, 0.1, 0.3)
        drawingContext.drawImage(focalLayer, 0, 0, width, height)
      }

      const lineBudget = resourcePressure ? 6 : settings.lowPowerMode ? 9 : 18
      const lineReveal = smoothstep((abstractionProgress - 0.24) / 0.52)
      drawingContext.globalCompositeOperation = 'source-over'
      drawingContext.strokeStyle = activeComposition.palette.at(-1) ?? '#171514'
      activeComposition.lines.slice(0, lineBudget).forEach((line, index) => {
        const reveal = lineReveal * clamp(0.28 + motion.lines * 0.62 + motion.beat * 0.15)
        if (reveal <= 0) return
        drawingContext.globalAlpha = reveal * (0.44 + line.weight * 0.5)
        drawingContext.lineWidth = 0.7 + line.weight * 2.2 + motion.beat * 0.8
        drawingContext.beginPath()
        drawingContext.moveTo(line.x1 * width, line.y1 * height)
        if (index % 4 === 3 || motion.lines > 0.012) {
          const linePhase = motion.phase * Math.PI * 2 + index * 1.17
          const middleX = (line.x1 + line.x2) * 0.5 * width
          const middleY = (line.y1 + line.y2) * 0.5 * height
          drawingContext.quadraticCurveTo(
            middleX + Math.sin(linePhase) * (2 + motion.lines * 7),
            middleY + Math.cos(linePhase) * (2 + motion.lines * 6),
            line.x2 * width,
            line.y2 * height,
          )
        } else {
          drawingContext.lineTo(line.x2 * width, line.y2 * height)
        }
        drawingContext.stroke()
      })

      if (!resourcePressure && (abstractionProgress > 0.08 || motion.detail > 0.02)) {
        drawingContext.globalCompositeOperation = 'overlay'
        drawingContext.globalAlpha = clamp(0.035 + abstractionProgress * 0.055 + motion.detail * 0.16)
        const grainBands = 3
        for (let index = 0; index < grainBands; index += 1) {
          const y = Math.floor(index * height / grainBands)
          const nextY = Math.ceil((index + 1) * height / grainBands)
          const offset = Math.sin(motion.phase * Math.PI * 2 + index * 2.1) *
            motion.detail * 1.25
          drawingContext.drawImage(
            activeArtwork.grain,
            0,
            y,
            width,
            nextY - y,
            offset,
            y,
            width,
            nextY - y,
          )
        }
      }
      if (motion.flash > 0.01 && activeComposition.planes.length > 0) {
        const accent = activeComposition.planes[
          (rhythm?.beatIndex ?? 0) % activeComposition.planes.length
        ]
        drawingContext.save()
        planePath(drawingContext, accent, width, height, 1.01, 0, 0)
        drawingContext.globalCompositeOperation = 'screen'
        drawingContext.globalAlpha = motion.flash * 0.42
        drawingContext.fillStyle = activeComposition.palette[2] ?? '#e7d33f'
        drawingContext.fill()
        drawingContext.restore()
      }
      drawingContext.globalCompositeOperation = 'source-over'
      drawingContext.globalAlpha = 1
      output.dataset.brainBauhausAbstraction = abstractionProgress.toFixed(3)
      output.dataset.brainBauhausTransition =
        `${transitionRole}-${transitionProgress.toFixed(3)}`
      output.dataset.brainBauhausFigure = activeFigure?.becomeState ?? 'none'
      brainPerformanceMetrics.recordCanvasFrame(
        time,
        resourcePressure,
        performance.now() - renderStartedAt,
      )
    },
    destroy() {
      destroyed = true
      prepared.clear()
      matchCache.clear()
      motionSmoother.reset()
      figureAccumulator = { accumulator: 0, lastEventAt: Number.NEGATIVE_INFINITY }
      activeFigure = null
      fallback.src = ''
      URL.revokeObjectURL(fallbackUrl)
      output.width = 1
      output.height = 1
      root.remove()
    },
  }
}
