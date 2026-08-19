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
  type MaterialRegion,
  type MaterialRegionMatch,
} from './brainMaterialAnalysis'
import { getBrainRenderingConfig } from './brainRenderingConfig'
import { brainLog, brainWarn } from './brainLog'
import { brainPerformanceMetrics } from './brainPerformanceMetrics'
import { BrainCanvasMotionSmoother } from './brainCanvasMotionSmoother'

// Dream Segmentation rappresenta visivamente come Brain costruisce,
// mantiene e trasforma uno stato immaginativo durante l'ascolto (vedi
// working/plans/piano-032-dream-segmentation-renderer.md per la filosofia
// completa fornita dallo sviluppatore). Un "segmento" (regione) è una
// configurazione temporaneamente stabile; la sequenza deve produrre
// persistenza → destabilizzazione → trasformazione → nuova
// stabilizzazione, mai un taglio secco fra due immagini indipendenti.

const NORMAL_WIDTH = 240
const NORMAL_HEIGHT = 135
const LOW_POWER_WIDTH = 180
const LOW_POWER_HEIGHT = 101
const NORMAL_FRAME_INTERVAL_MS = 1_000 / 20
const LOW_POWER_FRAME_INTERVAL_MS = 1_000 / 12
const PRESSURE_FRAME_INTERVAL_MS = 1_000 / 10
const SILENT_BANDS: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }

const MAX_REGIONS = 16
const NORMAL_REGION_BUDGET = 14
const LOW_POWER_REGION_BUDGET = 10
const PRESSURE_REGION_BUDGET = 7
const MAX_FILAMENTS = 18
const PRESSURE_MAX_FILAMENTS = 8

// Un evento (predictive processing) è uno scarto di CARATTERE tonale
// sostenuto, non un semplice aumento di volume: si accumula sulla distanza
// fra il profilo di banda a breve termine e la sua media lenta, non
// sull'energia grezza — così un crescendo "più forte ma uguale" non
// scatta un evento quanto un cambio di bilanciamento fra bande.
const BASELINE_TAU_MS = 9_000
const SURPRISE_THRESHOLD = 1
const SURPRISE_GAIN_PER_MS = 0.0013
const SURPRISE_DECAY_PER_MS = 0.00006
// Un evento non può riarmarsi subito dopo essersi stabilizzato: altrimenti
// un passaggio denso produce trasformazioni quasi continue, il contrario
// della "persistenza" richiesta dalla filosofia.
const MINIMUM_DWELL_MS = 8_000
// Una trasformazione, una volta innescata, richiede questo tempo minimo:
// è l'inerzia/viscosità del "corpo" del renderer, non un parametro di
// convenienza — anche se l'host è già oltre, l'effetto continua a
// svilupparsi (filosofia.md, sezione Tempo).
const MINIMUM_TRANSFORMATION_MS = 3_200
const GHOST_HISTORY_LIMIT = 2
const GHOST_LIFESPAN_MS = 32_000

type CachedDreamField = {
  source: BrainRendererImageSource
  field: MaterialField
  base: HTMLCanvasElement
}

type DreamGhost = {
  regions: MaterialRegion[]
  width: number
  height: number
  startedAt: number
}

type DreamTransformState = {
  transforming: boolean
  localProgress: number
  fromField: CachedDreamField | null
  toField: CachedDreamField | null
  matches: MaterialRegionMatch[]
  condensationPairs: CondensationPair[]
}

export type DreamBandProfile = {
  low: number
  lowMid: number
  mid: number
  high: number
}

export type DreamSurpriseState = {
  accumulator: number
  lastEventAt: number
}

export type DreamMotion = {
  activity: number
  beat: number
  tension: number
  flash: number
}

export type CondensationPair = {
  fromRegionId: number
  intoToRegionId: number
}

export type DreamCondensationBlend = {
  centroidX: number
  centroidY: number
  color: readonly [number, number, number]
  areaRatio: number
}

export type DreamSpostamentoTrail = {
  x0: number
  y0: number
  x1: number
  y1: number
  opacity: number
}

const dreamFieldCache = new WeakMap<
  Blob,
  Map<string, Promise<CachedDreamField>>
>()

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value))
}

function smootherstep(value: number): number {
  const x = clamp(value)
  return x * x * x * (x * (x * 6 - 15) + 10)
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

// --- Livello 1: profilo di banda e "sorpresa" percettiva (evento vs reattività) ---

export function computeBandProfile(bands: BandEnergies): DreamBandProfile {
  const total = bands.low + bands.lowMid + bands.mid + bands.high
  if (total <= 1e-6) return { low: 0.25, lowMid: 0.25, mid: 0.25, high: 0.25 }
  return {
    low: bands.low / total,
    lowMid: bands.lowMid / total,
    mid: bands.mid / total,
    high: bands.high / total,
  }
}

export function updateBaselineProfile(
  baseline: DreamBandProfile,
  profile: DreamBandProfile,
  elapsedMs: number,
  tauMs: number = BASELINE_TAU_MS,
): DreamBandProfile {
  const blend = 1 - Math.exp(-Math.max(0, elapsedMs) / tauMs)
  return {
    low: baseline.low + (profile.low - baseline.low) * blend,
    lowMid: baseline.lowMid + (profile.lowMid - baseline.lowMid) * blend,
    mid: baseline.mid + (profile.mid - baseline.mid) * blend,
    high: baseline.high + (profile.high - baseline.high) * blend,
  }
}

export function computeProfileDistance(
  profile: DreamBandProfile,
  baseline: DreamBandProfile,
): number {
  return (
    Math.abs(profile.low - baseline.low) +
    Math.abs(profile.lowMid - baseline.lowMid) +
    Math.abs(profile.mid - baseline.mid) +
    Math.abs(profile.high - baseline.high)
  ) / 2
}

export function updateDreamSurpriseAccumulator(
  state: DreamSurpriseState,
  distance: number,
  elapsedMs: number,
  now: number,
  active: boolean,
): { state: DreamSurpriseState; triggered: boolean } {
  // Check Silenzio: senza audio attivo nessun evento può scattare, punto.
  if (!active) {
    return { state: { accumulator: 0, lastEventAt: state.lastEventAt }, triggered: false }
  }
  const elapsed = Math.max(0, elapsedMs)
  const decayed = Math.max(0, state.accumulator - SURPRISE_DECAY_PER_MS * elapsed)
  const nextAccumulator = decayed + distance * SURPRISE_GAIN_PER_MS * elapsed
  const dwellElapsed = now - state.lastEventAt >= MINIMUM_DWELL_MS
  if (dwellElapsed && nextAccumulator >= SURPRISE_THRESHOLD) {
    return { state: { accumulator: 0, lastEventAt: now }, triggered: true }
  }
  return {
    state: { accumulator: nextAccumulator, lastEventAt: state.lastEventAt },
    triggered: false,
  }
}

// --- Livello 2: avanzamento della trasformazione (inerzia, non taglio secco) ---

export function computeLocalMorphProgress(
  currentProgress: number,
  hostProgress: number,
  elapsedMs: number,
  transforming: boolean,
): number {
  if (!transforming) return currentProgress
  const maxDelta = Math.max(0, elapsedMs) / MINIMUM_TRANSFORMATION_MS
  const target = clamp(hostProgress)
  const delta = target - currentProgress
  const step = Math.sign(delta) * Math.min(Math.abs(delta), maxDelta)
  return clamp(currentProgress + step)
}

// --- Livello 3: condensazione ("terza forma") e spostamento ---

export function findCondensationPairs(
  matches: readonly MaterialRegionMatch[],
  fromRegions: readonly MaterialRegion[],
  toRegions: readonly MaterialRegion[],
): CondensationPair[] {
  const fromById = new Map(fromRegions.map((region) => [region.id, region]))
  const toById = new Map(toRegions.map((region) => [region.id, region]))
  const survivors = matches.filter(
    (match): match is { fromRegionId: number; toRegionId: number; cost: number } =>
      match.fromRegionId !== null && match.toRegionId !== null,
  )
  const vanished = matches.filter(
    (match) => match.fromRegionId !== null && match.toRegionId === null,
  )
  const pairs: CondensationPair[] = []
  for (const gone of vanished) {
    const goneRegion = fromById.get(gone.fromRegionId as number)
    if (!goneRegion) continue
    let bestToId: number | null = null
    let bestDistance = Number.POSITIVE_INFINITY
    for (const survivor of survivors) {
      const toRegion = toById.get(survivor.toRegionId)
      if (!toRegion) continue
      const distance = Math.hypot(
        goneRegion.centroidX - toRegion.centroidX,
        goneRegion.centroidY - toRegion.centroidY,
      )
      if (distance < bestDistance) {
        bestDistance = distance
        bestToId = survivor.toRegionId
      }
    }
    if (bestToId !== null) {
      pairs.push({ fromRegionId: gone.fromRegionId as number, intoToRegionId: bestToId })
    }
  }
  return pairs
}

function screenBlendChannel(a: number, b: number): number {
  return 255 - ((255 - a) * (255 - b)) / 255
}

export function computeCondensationBlend(
  from: MaterialRegion,
  to: MaterialRegion,
  progress: number,
): DreamCondensationBlend {
  const clamped = clamp(progress)
  const eased = smootherstep(clamped)
  // La "terza forma" è più presente a metà trasformazione (bulge), non un
  // punto medio fisso: nasce dalla precedente, non la sostituisce di colpo.
  const bulge = Math.sin(Math.PI * clamped)
  const quadratureArea = Math.sqrt(from.areaRatio ** 2 + to.areaRatio ** 2)
  return {
    centroidX: from.centroidX + (to.centroidX - from.centroidX) * eased,
    centroidY: from.centroidY + (to.centroidY - from.centroidY) * eased,
    color: [
      screenBlendChannel(from.averageColor[0], to.averageColor[0]),
      screenBlendChannel(from.averageColor[1], to.averageColor[1]),
      screenBlendChannel(from.averageColor[2], to.averageColor[2]),
    ],
    areaRatio: to.areaRatio + (quadratureArea - to.areaRatio) * bulge,
  }
}

export function computeSpostamentoTrail(
  oldFocal: { centroidX: number; centroidY: number } | null,
  newFocal: { centroidX: number; centroidY: number } | null,
  progress: number,
): DreamSpostamentoTrail | null {
  if (!oldFocal || !newFocal) return null
  const clamped = clamp(progress)
  return {
    x0: oldFocal.centroidX,
    y0: oldFocal.centroidY,
    x1: newFocal.centroidX,
    y1: newFocal.centroidY,
    opacity: Math.sin(Math.PI * clamped),
  }
}

// --- Livello 4: corpo/respiro (solo moltiplicativo — Check Silenzio) ---

export function computeRegionBreathing(
  region: Pick<MaterialRegion, 'salience'>,
  motion: Pick<DreamMotion, 'activity' | 'beat'>,
  pressureBias: number,
): number {
  // `pressureBias` moltiplica soltanto un termine già derivato dall'audio:
  // in silenzio (activity=beat=0) resta 1 qualunque sia la pressione, non
  // introduce mai movimento autonomo.
  const breathing = (
    motion.activity * 0.14 +
    motion.beat * (0.06 + region.salience * 0.09)
  ) * clamp(pressureBias, 0, 1)
  return 1 + breathing
}

function bandDrive(value: number, average: number | undefined, transient: number): number {
  const baseline = Math.max(0.018, average ?? value * 0.82)
  const sustained = clamp((value - 0.006) / 0.44)
  const lift = clamp((value - baseline) / (baseline * 0.82 + 0.025))
  return clamp(sustained * 0.6 + lift * 0.24 + transient * 0.4)
}

export function calculateDreamMotion(
  bands: BandEnergies,
  settings: AppSettings,
  rhythm?: BrainRhythmState,
  movingAverages?: BandEnergies,
  flash?: BrainFlashState,
): DreamMotion {
  const transients = rhythm?.bandTransients ?? SILENT_BANDS
  const low = bandDrive(bands.low, movingAverages?.low, transients.low)
  const lowMid = bandDrive(bands.lowMid, movingAverages?.lowMid, transients.lowMid)
  const mid = bandDrive(bands.mid, movingAverages?.mid, transients.mid)
  const high = bandDrive(bands.high, movingAverages?.high, transients.high)
  const profile = settings.motionProfile === 'ambient'
    ? 0.56
    : settings.motionProfile === 'techno'
      ? 0.94
      : 0.76
  const softness = settings.softMode ? 0.72 : 1
  const sensitivity = 0.72 + clamp(settings.sensitivity) * 0.38
  const scale = profile * softness * sensitivity
  const flashDrive = flash?.active ? clamp(flash.intensity) : 0
  const activity = clamp(
    (low * 0.3 + lowMid * 0.28 + mid * 0.24 + high * 0.18) * scale + flashDrive * 0.15,
  )
  const beat = calculateRhythmicAccent(rhythm) * clamp(0.28 + activity * 0.85 + low * 0.26)
  // La tensione è un segnale lento (sostenuto), non un transiente: guida la
  // respirazione "corporea", non gli scatti.
  const tension = clamp((low * 0.5 + lowMid * 0.5) * scale)
  return { activity, beat, tension, flash: flashDrive }
}

export function shouldRenderDreamFrame(
  motion: DreamMotion,
  transforming: boolean,
  transitionChanged: boolean,
  signatureChanged: boolean,
): boolean {
  return motion.activity > 0.004 || motion.beat > 0.004 || motion.flash > 0.004 ||
    transforming || transitionChanged || signatureChanged
}

async function prepareDreamSource(
  source: BrainRendererImageSource,
  width: number,
  height: number,
): Promise<CachedDreamField> {
  const resolutionKey = `${width}x${height}:${source.id}`
  const cachedByResolution = dreamFieldCache.get(source.raster) ?? new Map()
  dreamFieldCache.set(source.raster, cachedByResolution)
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
      const field = analyzeMaterialPixels(rgba, width, height, MAX_REGIONS)
      const prepared: CachedDreamField = { source, field, base }
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

function focalRegionOf(field: CachedDreamField | null): MaterialRegion | null {
  if (!field) return null
  return field.field.regions.find((region) => region.id === field.field.focalRegionId) ?? null
}

// Un velo scuro sotto la membrana (in 'multiply', prima del 'lighter')
// affossa localmente il raster: senza, il colore additivo della membrana
// si perde contro le zone chiare dell'immagine e resta poco leggibile
// (segnalato dallo sviluppatore) — con il velo il contrasto regge anche
// su fondali chiari, senza sostituire il raster (Check Materia: resta
// sempre visibile sotto, solo scurito localmente).
function drawDarkeningVeil(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  opacity: number,
): void {
  if (radius <= 0.5 || opacity <= 0.002) return
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
  gradient.addColorStop(0, `rgba(0,0,0,${opacity})`)
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  context.fillStyle = gradient
  context.beginPath()
  context.arc(x, y, radius, 0, Math.PI * 2)
  context.fill()
}

function drawMembrane(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: readonly [number, number, number],
  opacity: number,
): void {
  if (radius <= 0.5 || opacity <= 0.002) return
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
  const [r, g, b] = color
  gradient.addColorStop(0, `rgba(${r},${g},${b},${opacity})`)
  gradient.addColorStop(1, `rgba(${r},${g},${b},0)`)
  context.fillStyle = gradient
  context.beginPath()
  context.arc(x, y, radius, 0, Math.PI * 2)
  context.fill()
}

type FilamentNode = {
  x: number
  y: number
  color: readonly [number, number, number]
  salience: number
}

function drawFilamentNetwork(
  context: CanvasRenderingContext2D,
  nodes: FilamentNode[],
  budget: number,
  baseOpacity: number,
  patternOffset: number,
): void {
  if (nodes.length < 2 || budget <= 0) return
  const candidates: { a: FilamentNode; b: FilamentNode; weight: number }[] = []
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i]
      const b = nodes[j]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      const colorSimilarity = 1 - clamp(
        Math.hypot(a.color[0] - b.color[0], a.color[1] - b.color[1], a.color[2] - b.color[2]) / 441.7,
      )
      const weight = colorSimilarity / Math.max(1, distance)
      candidates.push({ a, b, weight })
    }
  }
  candidates.sort((left, right) => right.weight - left.weight)
  const selected = candidates.slice(0, budget)
  // La curvatura dei filamenti risponde al pattern di morphing narrativo
  // già scelto per la storia (stesso `patternOffset` di
  // `drawTransitionBase` in Materia Morph): la "rete" non ha una forma
  // fissa, segue lo stesso respiro narrativo degli altri renderer.
  const bend = 0.04 + (patternOffset % 4) * 0.02
  for (const { a, b, weight } of selected) {
    const midX = (a.x + b.x) / 2 + (b.y - a.y) * bend
    const midY = (a.y + b.y) / 2 - (b.x - a.x) * bend
    context.strokeStyle = `rgba(${Math.round((a.color[0] + b.color[0]) / 2)},${Math.round((a.color[1] + b.color[1]) / 2)},${Math.round((a.color[2] + b.color[2]) / 2)},${clamp(baseOpacity * (0.3 + weight * 0.5))})`
    context.lineWidth = Math.max(0.6, (a.salience + b.salience) * 1.1)
    context.beginPath()
    context.moveTo(a.x, a.y)
    context.quadraticCurveTo(midX, midY, b.x, b.y)
    context.stroke()
  }
}

function drawGhostResidue(
  context: CanvasRenderingContext2D,
  ghost: DreamGhost,
  width: number,
  height: number,
  now: number,
  budget: number,
): void {
  const age = now - ghost.startedAt
  if (age >= GHOST_LIFESPAN_MS) return
  const opacity = clamp(1 - age / GHOST_LIFESPAN_MS) * 0.16
  if (opacity <= 0.002) return
  const regions = ghost.regions.slice(0, budget)
  for (const region of regions) {
    drawMembrane(
      context,
      region.centroidX * width,
      region.centroidY * height,
      Math.sqrt(region.areaRatio) * width * 0.5,
      region.averageColor,
      opacity,
    )
  }
}

export function createBrainDreamSegmentationScene(
  pluginContext: BrainRendererPluginContext,
): BrainSceneRendererController {
  const outputCanvas = document.createElement('canvas')
  const configured = getBrainRenderingConfig().image
  outputCanvas.width = Math.min(configured.width, NORMAL_WIDTH)
  outputCanvas.height = Math.min(configured.height, NORMAL_HEIGHT)
  outputCanvas.dataset.brainDreamSegmentation = 'preparing'
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
  let preparationStarted = false
  let transitionProgress = 1
  let previousTransitionProgress = Number.NaN
  let transitionRole: 'enter' | 'exit' = 'enter'
  let morphPattern: BrainFrameMorphPattern = 'marea'
  let lastRenderedAt = Number.NEGATIVE_INFINITY
  let lastSignature = ''
  let lastMotionAt = Number.NaN
  const motionSmoother = new BrainCanvasMotionSmoother()
  const prepared = new Map<string, CachedDreamField>()
  let currentSource: BrainRendererImageSource | null = null
  let previousSource: BrainRendererImageSource | null = null
  let nextSource: BrainRendererImageSource | null = null

  let stableField: CachedDreamField | null = null
  let baselineProfile: DreamBandProfile = { low: 0.25, lowMid: 0.25, mid: 0.25, high: 0.25 }
  let surpriseState: DreamSurpriseState = { accumulator: 0, lastEventAt: Number.NEGATIVE_INFINITY }
  let transformState: DreamTransformState = {
    transforming: false,
    localProgress: 0,
    fromField: null,
    toField: null,
    matches: [],
    condensationPairs: [],
  }
  const ghosts: DreamGhost[] = []

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
    outputCanvas.width = width
    outputCanvas.height = height
    const sources = [currentSource, previousSource, nextSource].filter(
      (source): source is BrainRendererImageSource => source !== null,
    )
    void Promise.allSettled(
      sources.map(async (source) => {
        const field = await prepareDreamSource(source, width, height)
        if (!destroyed) prepared.set(source.id, field)
      }),
    ).then((results) => {
      if (destroyed) return
      const currentId = currentSource?.id
      const currentReady = currentId ? prepared.has(currentId) : false
      if (!currentReady) {
        failed = true
        outputCanvas.dataset.brainDreamSegmentation = 'failed'
        brainWarn('render', 'Dream Segmentation non preparato', {
          frameId: pluginContext.scene.frameId,
          failures: results.filter((result) => result.status === 'rejected').length,
        })
        return
      }
      outputCanvas.dataset.brainDreamSegmentation = 'ready'
      brainLog('render', 'Dream Segmentation preparato', {
        frameId: pluginContext.scene.frameId,
        regions: currentId ? prepared.get(currentId)?.field.regions.length ?? 0 : 0,
      })
    })
  }

  const preparedFor = (source: BrainRendererImageSource | null): CachedDreamField | null =>
    source ? prepared.get(source.id) ?? null : null

  const armTransformation = (toField: CachedDreamField, now: number): void => {
    if (!stableField || stableField.source.id === toField.source.id) return
    const matches = matchMaterialRegions(stableField.field.regions, toField.field.regions)
    transformState = {
      transforming: true,
      localProgress: 0,
      fromField: stableField,
      toField,
      matches,
      condensationPairs: findCondensationPairs(
        matches,
        stableField.field.regions,
        toField.field.regions,
      ),
    }
    surpriseState = { accumulator: 0, lastEventAt: now }
  }

  const settleTransformation = (now: number): void => {
    if (!transformState.fromField) return
    ghosts.unshift({
      regions: transformState.fromField.field.regions,
      width: transformState.fromField.field.width,
      height: transformState.fromField.field.height,
      startedAt: now,
    })
    while (ghosts.length > GHOST_HISTORY_LIMIT) ghosts.pop()
    stableField = transformState.toField
    transformState = {
      transforming: false,
      localProgress: 0,
      fromField: null,
      toField: null,
      matches: [],
      condensationPairs: [],
    }
  }

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
      const current = preparedFor(currentSource) ??
        preparedFor(previousSource) ??
        preparedFor(nextSource)
      if (!current) return
      if (!stableField) stableField = current

      const motionElapsed = Number.isFinite(lastMotionAt) ? Math.max(0, time - lastMotionAt) : 16
      lastMotionAt = time
      const rawMotion = calculateDreamMotion(bands, settings, rhythm, movingAverages, flash)
      const smoothMotion = motionSmoother.update(
        {
          low: rawMotion.tension,
          lowMid: 0,
          mid: 0,
          high: 0,
          activity: rawMotion.activity,
          beat: rawMotion.beat,
        },
        motionElapsed,
        rhythm?.beatDurationMs ?? 500,
        rhythm?.active ?? (rawMotion.activity > 0),
        settings.motionProfile,
      )
      const motion: DreamMotion = {
        activity: smoothMotion.activity,
        beat: Math.max(rawMotion.beat, smoothMotion.beat),
        tension: smoothMotion.low,
        flash: rawMotion.flash,
      }

      // Livello superiore (significato): profilo di banda e sorpresa
      // accumulata, indipendenti dal transiente/beat locale.
      const audioActive = rhythm?.active ?? rawMotion.activity > 0
      const profile = computeBandProfile(bands)
      baselineProfile = updateBaselineProfile(baselineProfile, profile, motionElapsed)
      const distance = computeProfileDistance(profile, baselineProfile)
      const surpriseResult = updateDreamSurpriseAccumulator(
        surpriseState,
        distance,
        motionElapsed,
        time,
        audioActive,
      )
      surpriseState = surpriseResult.state

      // Un cambio di sorgente deciso dall'host (la storia è avanzata) è
      // anch'esso un innesco valido di trasformazione, anche in assenza di
      // una sorpresa audio propria: non possiamo restare ancorati a
      // un'immagine che l'host ha già superato.
      const hostAdvanced = stableField.source.id !== current.source.id
      if (!transformState.transforming) {
        if (surpriseResult.triggered) {
          const candidate = preparedFor(nextSource) ?? (hostAdvanced ? current : null) ??
            preparedFor(previousSource)
          if (candidate) armTransformation(candidate, time)
        } else if (hostAdvanced) {
          armTransformation(current, time)
        }
      }

      if (transformState.transforming) {
        transformState.localProgress = computeLocalMorphProgress(
          transformState.localProgress,
          transitionProgress,
          motionElapsed,
          true,
        )
        if (transformState.localProgress >= 1) settleTransformation(time)
      }

      const transitionChanged =
        !Number.isFinite(previousTransitionProgress) ||
        Math.abs(transitionProgress - previousTransitionProgress) >= 0.001
      const signature = [
        transitionRole,
        Math.round(transitionProgress * 120),
        Math.round(motion.activity * 40),
        Math.round(motion.tension * 40),
        Math.round(motion.beat * 30),
        Math.round(motion.flash * 30),
        transformState.transforming ? Math.round(transformState.localProgress * 60) : -1,
        rhythm?.beatIndex ?? 0,
        settings.lowPowerMode ? 1 : 0,
        resourcePressure ? 1 : 0,
      ].join(':')
      const signatureChanged = signature !== lastSignature
      if (!shouldRenderDreamFrame(
        motion,
        transformState.transforming,
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

      const regionBudget = resourcePressure
        ? PRESSURE_REGION_BUDGET
        : settings.lowPowerMode
          ? LOW_POWER_REGION_BUDGET
          : NORMAL_REGION_BUDGET
      const filamentBudget = resourcePressure ? PRESSURE_MAX_FILAMENTS : MAX_FILAMENTS
      const pressureBias = resourcePressure ? 0.55 : settings.lowPowerMode ? 0.75 : 1

      // Check Materia: il raster resta sempre il livello di base, mai
      // rimpiazzato dalle primitive geometriche sopra.
      if (transformState.transforming && transformState.fromField && transformState.toField) {
        const eased = smootherstep(transformState.localProgress)
        context.globalAlpha = 1
        context.globalCompositeOperation = 'source-over'
        context.drawImage(transformState.fromField.base, 0, 0, width, height)
        context.globalAlpha = eased
        context.drawImage(transformState.toField.base, 0, 0, width, height)
        context.globalAlpha = 1
      } else {
        context.drawImage(stableField.base, 0, 0, width, height)
      }

      // Memoria: residui della configurazione precedente, sotto il resto.
      for (const ghost of ghosts) {
        drawGhostResidue(context, ghost, width, height, time, Math.ceil(regionBudget / 2))
      }

      context.globalCompositeOperation = 'lighter'
      const filamentNodes: FilamentNode[] = []

      if (transformState.transforming && transformState.fromField && transformState.toField) {
        const { fromField, toField, matches, condensationPairs } = transformState
        const fromById = new Map(fromField.field.regions.map((region) => [region.id, region]))
        const toById = new Map(toField.field.regions.map((region) => [region.id, region]))
        const condensationTargets = new Set(condensationPairs.map((pair) => pair.intoToRegionId))
        const matched = matches.filter(
          (match): match is { fromRegionId: number; toRegionId: number; cost: number } =>
            match.fromRegionId !== null && match.toRegionId !== null,
        ).slice(0, regionBudget)
        for (const match of matched) {
          const from = fromById.get(match.fromRegionId)
          const to = toById.get(match.toRegionId)
          if (!from || !to) continue
          const blend = computeCondensationBlend(from, to, transformState.localProgress)
          const scale = computeRegionBreathing(to, motion, pressureBias)
          const radius = Math.sqrt(blend.areaRatio) * width * 0.62 * scale
          const x = blend.centroidX * width
          const y = blend.centroidY * height
          context.globalCompositeOperation = 'multiply'
          drawDarkeningVeil(context, x, y, radius * 1.1, 0.4 + motion.tension * 0.12)
          context.globalCompositeOperation = 'lighter'
          drawMembrane(context, x, y, radius, blend.color, 0.42 + motion.tension * 0.3)
          filamentNodes.push({ x, y, color: blend.color, salience: to.salience })
        }
        for (const pair of condensationPairs) {
          if (!condensationTargets.has(pair.intoToRegionId)) continue
          const from = fromById.get(pair.fromRegionId)
          const to = toById.get(pair.intoToRegionId)
          if (!from || !to) continue
          const blend = computeCondensationBlend(from, to, transformState.localProgress)
          const radius = Math.sqrt(blend.areaRatio) * width * 0.42
          drawMembrane(
            context,
            blend.centroidX * width,
            blend.centroidY * height,
            radius,
            blend.color,
            0.16 * Math.sin(Math.PI * clamp(transformState.localProgress)),
          )
        }
        const trail = computeSpostamentoTrail(
          focalRegionOf(fromField),
          focalRegionOf(toField),
          transformState.localProgress,
        )
        if (trail && trail.opacity > 0.01) {
          context.strokeStyle = `rgba(230,220,235,${trail.opacity * 0.4})`
          context.lineWidth = 1.4
          context.beginPath()
          context.moveTo(trail.x0 * width, trail.y0 * height)
          context.quadraticCurveTo(
            ((trail.x0 + trail.x1) / 2) * width,
            ((trail.y0 + trail.y1) / 2) * height - height * 0.08,
            trail.x1 * width,
            trail.y1 * height,
          )
          context.stroke()
        }
      } else {
        const regions = stableField.field.regions.slice(0, regionBudget)
        for (const region of regions) {
          const scale = computeRegionBreathing(region, motion, pressureBias)
          const x = region.centroidX * width
          const y = region.centroidY * height
          const radius = Math.sqrt(region.areaRatio) * width * 0.62 * scale
          context.globalCompositeOperation = 'multiply'
          drawDarkeningVeil(context, x, y, radius * 1.1, 0.4 + motion.tension * 0.12)
          context.globalCompositeOperation = 'lighter'
          drawMembrane(context, x, y, radius, region.averageColor, 0.42 + motion.tension * 0.3)
          filamentNodes.push({ x, y, color: region.averageColor, salience: region.salience })
        }
      }

      const patternOffset = ['marea', 'fioritura', 'corrente', 'spirale'].indexOf(morphPattern)
      drawFilamentNetwork(
        context,
        filamentNodes,
        filamentBudget,
        0.26 + motion.tension * 0.18,
        patternOffset,
      )

      context.globalCompositeOperation = 'source-over'
      context.globalAlpha = 1
      outputCanvas.dataset.brainDreamActivity = motion.activity.toFixed(3)
      outputCanvas.dataset.brainDreamTransforming = transformState.transforming ? 'true' : 'false'
      outputCanvas.dataset.brainDreamTransition =
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
      ghosts.length = 0
      motionSmoother.reset()
      outputCanvas.width = 1
      outputCanvas.height = 1
      outputCanvas.remove()
    },
  }
}
