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
  type MaterialField,
  type MaterialRegion,
} from './brainMaterialAnalysis'
import { getBrainRenderingConfig } from './brainRenderingConfig'
import { brainLog, brainWarn } from './brainLog'
import { brainPerformanceMetrics } from './brainPerformanceMetrics'
import { BrainCanvasMotionSmoother } from './brainCanvasMotionSmoother'

// Fractal Spiral Degeneration (PIANO-038): il raster perde progressivamente
// la propria organizzazione e rivela una struttura auto-simile organizzata
// da un avvitamento interno alla FORMA — mai al quadro (Check Camera).
//
// Due correzioni di direzione artistica (2026-08-24):
// 1. la prima versione ritagliava un rettangolo per regione e ne
//    disponeva copie orbitanti attorno a un centro — leggibile come
//    tasselli rotanti, non come una spirale che vive dentro la materia;
// 2. una seconda versione faceva ruotare il CONTENITORE (contro-rotato
//    rispetto alla spirale interna) — anche questo scartato: gli
//    oggetti del raster devono restare SEMPRE fermi, la trasformazione
//    è tutta interna.
// Gerarchia corretta:
//   1. sfondo spiraliforme continuo (sempre presente, mai protagonista);
//   2. oggetti del raster ricalcati per SAGOMA vera (non bounding box),
//      MAI in movimento/rotazione;
//   3. dentro ciascuna sagoma (masking via 'source-atop', mai fuori dal
//      contorno): una massa colorata (gradiente radiale) più bracci di
//      spirale SPESSI e cromatici che riempiono la superficie interna —
//      è la materia a muoversi/animarsi, mai il contenitore.
// Vedi working/plans/piano-038-fractal-spiral-degeneration.md.

const NORMAL_WIDTH = 360
const NORMAL_HEIGHT = 202
const LOW_POWER_WIDTH = 260
const LOW_POWER_HEIGHT = 146
const NORMAL_FRAME_INTERVAL_MS = 1_000 / 24
const LOW_POWER_FRAME_INTERVAL_MS = 1_000 / 15
const PRESSURE_FRAME_INTERVAL_MS = 1_000 / 8
const SILENT_BANDS: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }
const TAU = Math.PI * 2

// Budget a tre livelli (Check Costo): meno oggetti, meno livelli interni,
// meno punti di sfondo sotto pressione o in low-power.
const OBJECT_BUDGET_NORMAL = 4
const OBJECT_BUDGET_LOW_POWER = 3
const OBJECT_BUDGET_PRESSURE = 2
const INNER_LEVEL_BUDGET_NORMAL = 3
const INNER_LEVEL_BUDGET_LOW_POWER = 2
const INNER_LEVEL_BUDGET_PRESSURE = 1
const BACKGROUND_POINT_BUDGET_NORMAL = 10
const BACKGROUND_POINT_BUDGET_LOW_POWER = 6
const BACKGROUND_POINT_BUDGET_PRESSURE = 4
const MAX_REGIONS_FOR_ANALYSIS = 12

// Alzato su richiesta dello sviluppatore ("rendi più visibile il
// raster"): il contesto fotografico deve restare ben leggibile sotto
// gli oggetti e la spirale, non solo intuibile.
const UNDERLAY_CEILING = 0.72
const UNDERLAY_FLOOR = 0.3

type RGB = readonly [number, number, number]

type FractalObject = {
  region: MaterialRegion
  // Layer a piena cornice, mascherato pixel-per-pixel alla sola regione
  // (stesso pattern di `regionLayers` in Bauhaus/Materia Morph): la
  // sagoma vera, non un rettangolo — è questo che rende l'oggetto
  // "ricalcato e riconoscibile" invece di un tassello.
  layer: HTMLCanvasElement
}

type CachedFractalField = {
  source: BrainRendererImageSource
  base: HTMLCanvasElement
  objects: FractalObject[]
}

export type FractalSpiralMotion = {
  activity: number
  macro: number
  torsion: number
  density: number
  detail: number
  beat: number
  flash: number
  phase: number
}

export type SpiralNode = {
  x: number
  y: number
  scale: number
  rotation: number
}

export type BackgroundSpiralPoint = {
  x: number
  y: number
  phase: number
}

const fractalFieldCache = new WeakMap<
  Blob,
  Map<string, Promise<CachedFractalField>>
>()

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value))
}

function smoothstep(value: number): number {
  const x = clamp(value)
  return x * x * (3 - 2 * x)
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, width)
  canvas.height = Math.max(1, height)
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

function rgbToCss(color: RGB, alpha = 1): string {
  return `rgba(${color[0]},${color[1]},${color[2]},${alpha})`
}

function canvasFromPixels(pixels: Uint8ClampedArray, width: number, height: number): HTMLCanvasElement {
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  const image = context?.createImageData(width, height)
  if (context && image) {
    image.data.set(pixels)
    context.putImageData(image, 0, 0)
  }
  return canvas
}

// Hash deterministico locale (stesso pattern di
// brainDreamSegmentationCanvas.ts/brainGlitchMorphCanvas.ts, copia
// privata come in quei file): usato solo per il campo di sfondo, mai per
// decidere SE qualcosa reagisce all'audio (quello resta sempre guidato
// da bande/beat reali, Check Silenzio).
function hashUnit(x: number, y: number, salt: number): number {
  let h = (Math.round(x * 131) ^ Math.round(y * 977) ^ Math.imul(salt, 2654435761)) | 0
  h = Math.imul(h ^ (h >>> 15), 2246822519)
  h ^= h >>> 13
  return ((h >>> 0) % 1000) / 1000
}

/**
 * Posizioni deterministiche (stesso conteggio → stesso risultato) per i
 * generatori del campo di sfondo — una griglia leggermente irregolare,
 * non un pattern a scacchiera troppo meccanico.
 */
export function computeBackgroundSpiralPoints(count: number): BackgroundSpiralPoint[] {
  if (count <= 0) return []
  const columns = Math.max(1, Math.round(Math.sqrt(count * 1.6)))
  const rows = Math.max(1, Math.ceil(count / columns))
  const points: BackgroundSpiralPoint[] = []
  for (let index = 0; index < count; index += 1) {
    const column = index % columns
    const row = Math.floor(index / columns)
    const jitterX = (hashUnit(index, 1, 11) - 0.5) * 0.5
    const jitterY = (hashUnit(index, 2, 17) - 0.5) * 0.5
    points.push({
      x: clamp((column + 0.5 + jitterX) / columns),
      y: clamp((row + 0.5 + jitterY) / rows),
      phase: hashUnit(index, 3, 23) * TAU,
    })
  }
  return points
}

async function prepareFractalField(
  source: BrainRendererImageSource,
  width: number,
  height: number,
  objectBudget: number,
): Promise<CachedFractalField> {
  const resolutionKey = `${width}x${height}:${objectBudget}:${source.id}`
  const cachedByResolution = fractalFieldCache.get(source.raster) ?? new Map()
  fractalFieldCache.set(source.raster, cachedByResolution)
  const cached = cachedByResolution.get(resolutionKey)
  if (cached) return cached

  const preparation = (async () => {
    const startedAt = performance.now()
    const bitmap = await createImageBitmap(source.raster)
    try {
      const base = createCanvas(width, height)
      const context = base.getContext('2d', { willReadFrequently: true })
      if (!context) throw new Error('Canvas Fractal Spiral non disponibile')
      drawBitmapCover(context, bitmap, width, height)
      const rgba = context.getImageData(0, 0, width, height).data
      const field: MaterialField = analyzeMaterialPixels(rgba, width, height, MAX_REGIONS_FOR_ANALYSIS)
      const topRegions = [...field.regions]
        .sort((left, right) => right.salience - left.salience)
        .slice(0, objectBudget)
      // Layer a piena cornice mascherato per SAGOMA vera (non bounding
      // box): stesso pattern di `regionLayers` in Bauhaus/Materia Morph.
      const objects: FractalObject[] = topRegions.map((region) => {
        const pixels = new Uint8ClampedArray(rgba.length)
        for (let pixel = 0; pixel < width * height; pixel += 1) {
          if (field.regionLabels[pixel] !== region.id + 1) continue
          const offset = pixel * 4
          pixels[offset] = rgba[offset]
          pixels[offset + 1] = rgba[offset + 1]
          pixels[offset + 2] = rgba[offset + 2]
          pixels[offset + 3] = 255
        }
        return { region, layer: canvasFromPixels(pixels, width, height) }
      })
      const prepared: CachedFractalField = { source, base, objects }
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

// Soglie unificate con tutti gli altri renderer Brain (vedi
// brainBauhausMorphCanvas.ts e simili per la stessa formula).
function bandDrive(value: number, average: number | undefined, transient: number): number {
  const baseline = Math.max(0.018, average ?? value * 0.82)
  const sustained = clamp((value - 0.006) / 0.4)
  const lift = clamp((value - baseline) / (baseline * 0.8 + 0.024))
  return clamp(sustained * 0.6 + lift * 0.3 + transient * 0.44)
}

export function calculateFractalSpiralMotion(
  bands: BandEnergies,
  settings: AppSettings,
  rhythm?: BrainRhythmState,
  movingAverages?: BandEnergies,
  flash?: BrainFlashState,
): FractalSpiralMotion {
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
  const signalScale = rhythm?.active === false
    ? 0
    : profile * (0.76 + clamp(settings.sensitivity) * 0.44) * (settings.softMode ? 0.72 : 1)
  const activity = rhythm?.active === false
    ? 0
    : clamp((low * 0.3 + lowMid * 0.28 + mid * 0.24 + high * 0.18) * signalScale)
  const beat = activity > 0
    ? calculateRhythmicAccent(rhythm) * clamp(0.3 + activity * 0.82 + low * 0.28)
    : 0
  return {
    activity,
    macro: clamp(low * signalScale),
    torsion: clamp(lowMid * signalScale),
    density: clamp(mid * signalScale),
    detail: clamp(high * signalScale),
    beat,
    flash: flash?.active ? clamp(flash.intensity) : 0,
    phase: activity > 0 ? rhythm?.beatPhase ?? 0 : 0,
  }
}

// Stesso schema di `advanceBauhausAbstraction`: avanza SOLO con musica
// attiva e posizione musicale reale — mai `performance.now()` da solo
// (Check Silenzio: "la spirale non gira da sola").
export function advanceDegenerationProgress(
  progress: number,
  previousMusicalPosition: number | null,
  rhythm: BrainRhythmState | undefined,
  motion: FractalSpiralMotion,
): number {
  if (!rhythm?.active || previousMusicalPosition === null || motion.activity <= 0) {
    return clamp(progress)
  }
  const delta = clamp(rhythm.musicalPosition - previousMusicalPosition, 0, 0.16)
  return clamp(progress + delta * (0.045 + motion.density * 0.035 + motion.beat * 0.02))
}

export function computeUnderlayOpacity(degenerationProgress: number): number {
  return UNDERLAY_CEILING - clamp(degenerationProgress) * (UNDERLAY_CEILING - UNDERLAY_FLOOR)
}

/**
 * Fase interna del riempimento a spirale di un oggetto — MAI applicata al
 * contenitore (correzione di direzione artistica, 2026-08-24: "gli
 * oggetti del raster restano fermi... la trasformazione avviene DENTRO
 * l'oggetto"). Guida solo l'angolo di partenza dei bracci a spirale che
 * riempiono l'oggetto, così la materia interna si anima e respira col
 * beat mentre la sagoma resta immobile. Ogni oggetto ha una fase propria
 * (da `objectIndex`) così più oggetti non pulsano mai in sincrono.
 */
export function computeSpiralFillPhase(
  objectIndex: number,
  degenerationProgress: number,
  motion: Pick<FractalSpiralMotion, 'torsion' | 'beat'>,
): number {
  const phase = hashUnit(objectIndex, 0, 41) * TAU
  return phase +
    clamp(degenerationProgress) * (0.5 + motion.torsion * 0.7) +
    motion.beat * 0.06
}

/**
 * Punti campionati lungo un braccio di spirale piena (non un contorno
 * sottile): `turns` giri completi dal centro fino a `maxRadius`. Usati
 * per tracciare un tratto SPESSO (Check "corpose, volumetriche") che
 * riempie la superficie interna dell'oggetto, non una linea a vortice.
 */
export function computeSpiralArmPoints(
  centerX: number,
  centerY: number,
  maxRadius: number,
  turns: number,
  angleOffset: number,
  pointCount: number,
): SpiralNode[] {
  if (pointCount <= 1) return []
  const points: SpiralNode[] = []
  for (let index = 0; index <= pointCount; index += 1) {
    const t = index / pointCount
    const angle = t * turns * TAU + angleOffset
    const radius = maxRadius * t
    points.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      scale: 1,
      rotation: angle,
    })
  }
  return points
}

/**
 * Rivelazione progressiva per indice (oggetto o livello interno): a
 * bassa `degenerationProgress` prevale il raster/il contenitore intatto,
 * gli indici più alti si rivelano solo con energia sostenuta.
 * `beatBump` è un nudge temporaneo (non uno scatto) che lascia
 * intravedere un livello un po' in anticipo sul beat.
 */
export function computeLevelReveal(
  level: number,
  degenerationProgress: number,
  levelCount: number,
  beatBump: number,
): number {
  if (levelCount <= 0) return 0
  const windowStart = level / levelCount
  const windowEnd = (level + 1) / levelCount
  const effective = clamp(degenerationProgress) + beatBump
  return smoothstep((effective - windowStart) / Math.max(0.05, windowEnd - windowStart))
}

export function createBrainFractalSpiralScene(
  pluginContext: BrainRendererPluginContext,
): BrainSceneRendererController {
  const outputCanvas = document.createElement('canvas')
  const configured = getBrainRenderingConfig().image
  outputCanvas.width = Math.min(configured.width, NORMAL_WIDTH)
  outputCanvas.height = Math.min(configured.height, NORMAL_HEIGHT)
  outputCanvas.dataset.brainRenderer = 'fractal-spiral-degeneration'
  outputCanvas.dataset.brainFractalSpiral = 'preparing'
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
  let context = outputCanvas.getContext('2d', { alpha: false })
  // Buffer riusato per il masking 'source-atop' della spirale interna: un
  // solo canvas, ripulito e riscritto per ogni oggetto in sequenza (mai
  // uno per oggetto) — Check Costo. Creato subito (ridimensionato in
  // `prepare()`), non dentro `prepare()` stesso: altrimenti `update()`
  // lo richiederebbe prima ancora di aver potuto chiamare `prepare()`.
  let maskBuffer: HTMLCanvasElement = createCanvas(outputCanvas.width, outputCanvas.height)

  let destroyed = false
  let failed = false
  let resourcePressure = false
  let preparationStarted = false
  let transitionProgress = 1
  let previousTransitionProgress = Number.NaN
  let transitionRole: 'enter' | 'exit' = 'enter'
  let lastRenderedAt = Number.NEGATIVE_INFINITY
  let lastSignature = ''
  let lastMotionAt = Number.NaN
  let degenerationProgress = 0
  let previousMusicalPosition: number | null = null
  const motionSmoother = new BrainCanvasMotionSmoother()
  const prepared = new Map<string, CachedFractalField>()
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

  const objectBudgetFor = (lowPowerMode: boolean): number =>
    resourcePressure
      ? OBJECT_BUDGET_PRESSURE
      : lowPowerMode
        ? OBJECT_BUDGET_LOW_POWER
        : OBJECT_BUDGET_NORMAL

  const prepare = (lowPowerMode: boolean): void => {
    if (preparationStarted || destroyed) return
    preparationStarted = true
    resolveSources()
    const width = lowPowerMode ? LOW_POWER_WIDTH : NORMAL_WIDTH
    const height = lowPowerMode ? LOW_POWER_HEIGHT : NORMAL_HEIGHT
    outputCanvas.width = width
    outputCanvas.height = height
    context = outputCanvas.getContext('2d', { alpha: false })
    maskBuffer = createCanvas(width, height)
    const objectBudget = objectBudgetFor(lowPowerMode)
    const sources = [previousSource, currentSource, nextSource].filter(
      (source): source is BrainRendererImageSource => source !== null,
    )
    void Promise.allSettled(
      sources.map(async (source) => {
        const field = await prepareFractalField(source, width, height, objectBudget)
        if (!destroyed) prepared.set(source.id, field)
      }),
    ).then((results) => {
      if (destroyed) return
      if (!currentSource || !prepared.has(currentSource.id)) {
        failed = true
        outputCanvas.dataset.brainFractalSpiral = 'failed'
        brainWarn('render', 'Fractal Spiral Degeneration non preparato', {
          frameId: pluginContext.scene.frameId,
          failures: results.filter((result) => result.status === 'rejected').length,
        })
        return
      }
      outputCanvas.dataset.brainFractalSpiral = 'ready'
      brainLog('render', 'Fractal Spiral Degeneration preparato', {
        frameId: pluginContext.scene.frameId,
        objects: prepared.get(currentSource.id)?.objects.length ?? 0,
      })
    })
  }

  const fieldFor = (source: BrainRendererImageSource | null): CachedFractalField | null =>
    source ? prepared.get(source.id) ?? null : null

  // Sfondo continuo: mai assente del tutto (§6 del brief di direzione
  // artistica — "un fondo attivo che mantenga un campo continuo"),
  // modulato dall'audio ma con un pavimento minimo sempre presente.
  const drawBackgroundField = (
    drawingContext: CanvasRenderingContext2D,
    width: number,
    height: number,
    points: BackgroundSpiralPoint[],
    palette: readonly string[],
    motion: FractalSpiralMotion,
    beatPhaseOffset: number,
  ): void => {
    if (points.length === 0) return
    drawingContext.save()
    drawingContext.globalCompositeOperation = 'lighter'
    drawingContext.lineCap = 'round'
    // Raggio generoso e tratto spesso: i campi dei punti vicini si
    // sovrappongono, saturando percettivamente lo spazio (§6 del brief)
    // pur restando meno opachi/dominanti degli oggetti in primo piano.
    const armRadius = Math.min(width, height) * 0.16
    points.forEach((point, index) => {
      const centerX = point.x * width
      const centerY = point.y * height
      const color = palette[index % palette.length] ?? '#8899ee'
      drawingContext.strokeStyle = color
      drawingContext.lineWidth = armRadius * 0.14
      drawingContext.globalAlpha = clamp(0.08 + motion.torsion * 0.14 + motion.beat * 0.05)
      const angleOffset = point.phase + beatPhaseOffset
      const armPoints = computeSpiralArmPoints(centerX, centerY, armRadius, 1.5, angleOffset, 24)
      drawingContext.beginPath()
      armPoints.forEach((armPoint, step) => {
        if (step === 0) drawingContext.moveTo(armPoint.x, armPoint.y)
        else drawingContext.lineTo(armPoint.x, armPoint.y)
      })
      drawingContext.stroke()
    })
    drawingContext.restore()
  }

  // Un oggetto = la sua sagoma vera (masking pixel-accurate, mai un
  // rettangolo) più, confinata DENTRO quella sagoma, una spirale interna
  // di copie del materiale dell'oggetto stesso che gira in senso opposto
  // al contenitore. Il masking usa 'source-atop' su un buffer riusato:
  // ogni tratto successivo può disegnare solo dove il buffer è già
  // opaco, quindi la spirale non può mai "uscire" dalla sagoma —
  // struttralmente impossibile che diventi un tassello fuori contorno.
  // L'oggetto resta SEMPRE fermo (correzione di direzione artistica,
  // 2026-08-24): nessuna rotazione né traslazione del contenitore, mai.
  // La trasformazione avviene tutta DENTRO la sua sagoma: una massa
  // colorata (gradiente radiale dal colore medio della regione) più
  // bracci di spirale SPESSI (non linee sottili) che riempiono la
  // superficie interna, confinati dalla stessa sagoma via
  // `source-atop` — non possono mai uscirne.
  const drawObject = (
    mainContext: CanvasRenderingContext2D,
    buffer: HTMLCanvasElement,
    object: FractalObject,
    width: number,
    height: number,
    objectIndex: number,
    motion: FractalSpiralMotion,
    armBudget: number,
    beatBump: number,
    beatPhaseOffset: number,
    globalAlpha: number,
    palette: readonly string[],
  ): void => {
    if (globalAlpha <= 0.002) return
    const bufferContext = buffer.getContext('2d')
    if (!bufferContext) return
    const centerX = object.region.centroidX * width
    const centerY = object.region.centroidY * height
    const objectWidth = object.region.maxX - object.region.minX
    const objectHeight = object.region.maxY - object.region.minY
    const objectRadius = Math.max(1, Math.max(objectWidth, objectHeight) * 0.55)

    bufferContext.clearRect(0, 0, width, height)
    bufferContext.globalCompositeOperation = 'source-over'
    bufferContext.globalAlpha = 1
    bufferContext.drawImage(object.layer, 0, 0, width, height)

    bufferContext.globalCompositeOperation = 'source-atop'

    // Massa colorata di base: la materia "abita" il volume dell'oggetto
    // come campo, non come contorno.
    const fillReveal = clamp(degenerationProgress * 1.6)
    if (fillReveal > 0.01) {
      const [red, green, blue] = object.region.averageColor
      const gradient = bufferContext.createRadialGradient(
        centerX, centerY, 0, centerX, centerY, objectRadius,
      )
      gradient.addColorStop(0, `rgba(${red},${green},${blue},${clamp(fillReveal * 0.55)})`)
      gradient.addColorStop(1, `rgba(${red},${green},${blue},0)`)
      bufferContext.fillStyle = gradient
      bufferContext.globalAlpha = 1
      bufferContext.beginPath()
      bufferContext.arc(centerX, centerY, objectRadius, 0, TAU)
      bufferContext.fill()
    }

    // Bracci di spirale spessi e cromatici: la vera materia spiraliforme
    // che riempie l'oggetto, mai un tracciato lineare sottile. La fase
    // (`computeSpiralFillPhase`) e l'offset del beat animano il
    // riempimento — è QUESTO che si muove, non la sagoma.
    const phase = computeSpiralFillPhase(objectIndex, degenerationProgress, motion)
    const turns = 1.3 + motion.torsion * 1.5 + motion.density * 0.7
    const armWidth = objectRadius * (0.22 + motion.detail * 0.1)
    bufferContext.lineCap = 'round'
    for (let arm = 0; arm < armBudget; arm += 1) {
      const reveal = computeLevelReveal(arm, degenerationProgress, armBudget, beatBump)
      if (reveal <= 0.01) continue
      const angleOffset = phase + beatPhaseOffset + (arm / armBudget) * TAU
      const points = computeSpiralArmPoints(centerX, centerY, objectRadius, turns, angleOffset, 48)
      if (points.length < 2) continue
      const color = palette[(objectIndex + arm) % palette.length] ??
        rgbToCss(object.region.averageColor as RGB)
      bufferContext.strokeStyle = color
      bufferContext.lineWidth = armWidth
      bufferContext.globalAlpha = clamp(reveal * (0.6 + motion.detail * 0.35))
      bufferContext.beginPath()
      points.forEach((point, index) => {
        if (index === 0) bufferContext.moveTo(point.x, point.y)
        else bufferContext.lineTo(point.x, point.y)
      })
      bufferContext.stroke()
    }
    bufferContext.globalCompositeOperation = 'source-over'
    bufferContext.globalAlpha = 1

    mainContext.save()
    mainContext.globalCompositeOperation = 'source-over'
    mainContext.globalAlpha = clamp(globalAlpha * (0.85 + object.region.salience * 0.15))
    mainContext.drawImage(buffer, 0, 0)
    mainContext.restore()
  }

  return {
    element: outputCanvas,
    isReady: () => currentSource !== null && prepared.has(currentSource.id),
    hasFailed: () => failed,
    setOpacity(opacity) {
      outputCanvas.style.opacity = String(clamp(opacity))
    },
    getMorphShapes: () => [],
    setMorphPattern(pattern: BrainFrameMorphPattern) {
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
      const drawingContext = context
      prepare(settings.lowPowerMode)
      const current = fieldFor(currentSource) ?? fieldFor(previousSource) ?? fieldFor(nextSource)
      if (!current) return

      const motionElapsed = Number.isFinite(lastMotionAt) ? Math.max(0, time - lastMotionAt) : 16
      lastMotionAt = time
      const rawMotion = calculateFractalSpiralMotion(bands, settings, rhythm, movingAverages, flash)
      const smoothMotion = motionSmoother.update(
        {
          low: rawMotion.macro,
          lowMid: rawMotion.torsion,
          mid: rawMotion.density,
          high: rawMotion.detail,
          activity: rawMotion.activity,
          beat: rawMotion.beat,
        },
        motionElapsed,
        rhythm?.beatDurationMs ?? 500,
        rhythm?.active ?? (rawMotion.activity > 0),
        settings.motionProfile,
      )
      const motion: FractalSpiralMotion = {
        ...rawMotion,
        activity: smoothMotion.activity,
        macro: smoothMotion.low,
        torsion: smoothMotion.lowMid,
        density: smoothMotion.mid,
        detail: smoothMotion.high,
        beat: Math.max(rawMotion.beat, smoothMotion.beat),
      }
      degenerationProgress = advanceDegenerationProgress(
        degenerationProgress, previousMusicalPosition, rhythm, motion,
      )
      previousMusicalPosition = rhythm?.musicalPosition ?? previousMusicalPosition

      const from = transitionRole === 'enter'
        ? fieldFor(previousSource) ?? current
        : current
      const to = transitionRole === 'enter'
        ? current
        : fieldFor(nextSource) ?? current

      const signature = [
        transitionRole,
        Math.round(transitionProgress * 120),
        Math.round(degenerationProgress * 180),
        Math.round(motion.flash * 30),
        rhythm?.beatIndex ?? 0,
        settings.lowPowerMode ? 1 : 0,
        resourcePressure ? 1 : 0,
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

      const width = outputCanvas.width
      const height = outputCanvas.height
      const transition = smoothstep(transitionProgress)

      const backdropColor = to.objects[0]?.region.averageColor ?? [10, 9, 13]
      drawingContext.globalCompositeOperation = 'source-over'
      drawingContext.globalAlpha = 1
      drawingContext.fillStyle = rgbToCss(backdropColor as RGB)
      drawingContext.fillRect(0, 0, width, height)

      const beatPhaseOffset = motion.phase * TAU
      const backgroundBudget = resourcePressure
        ? BACKGROUND_POINT_BUDGET_PRESSURE
        : settings.lowPowerMode
          ? BACKGROUND_POINT_BUDGET_LOW_POWER
          : BACKGROUND_POINT_BUDGET_NORMAL
      // Livello 1: sfondo spiraliforme continuo, sotto tutto il resto.
      drawBackgroundField(
        drawingContext, width, height,
        computeBackgroundSpiralPoints(backgroundBudget),
        pluginContext.palette, motion, beatPhaseOffset,
      )

      // Raster di base: contesto leggero per orientare l'occhio, sempre
      // subordinato agli oggetti ricalcati (Check Materia, ma la
      // gerarchia corretta ora vede gli OGGETTI come rappresentazione
      // primaria del raster, non questo strato piatto).
      const underlayOpacity = computeUnderlayOpacity(degenerationProgress)
      if (transition < 0.999) {
        drawingContext.globalAlpha = underlayOpacity * (1 - transition)
        drawingContext.drawImage(from.base, 0, 0, width, height)
      }
      if (transition > 0.001) {
        drawingContext.globalAlpha = underlayOpacity * transition
        drawingContext.drawImage(to.base, 0, 0, width, height)
      }
      drawingContext.globalAlpha = 1

      const armBudget = resourcePressure
        ? INNER_LEVEL_BUDGET_PRESSURE
        : settings.lowPowerMode
          ? INNER_LEVEL_BUDGET_LOW_POWER
          : INNER_LEVEL_BUDGET_NORMAL
      // `beatPulse` come evento strutturale: rivela temporaneamente un
      // braccio di spirale un po' in anticipo, mai una pulsazione del
      // quadro.
      const beatBump = (rhythm?.beatPulse ?? 0) * 0.12

      // Oggetti ricalcati (sagoma vera, sempre ferma) riempiti dalla
      // loro materia spiraliforme interna. §18: durante la transizione
      // alcuni oggetti mostrano ancora l'immagine precedente mentre
      // altri già la nuova — mai un taglio secco.
      if (transition < 0.999) {
        from.objects.forEach((object, index) => {
          drawObject(
            drawingContext, maskBuffer, object, width, height,
            index, motion, armBudget, beatBump, beatPhaseOffset, 1 - transition,
            pluginContext.palette,
          )
        })
      }
      if (transition > 0.001) {
        to.objects.forEach((object, index) => {
          drawObject(
            drawingContext, maskBuffer, object, width, height,
            index, motion, armBudget, beatBump, beatPhaseOffset, transition,
            pluginContext.palette,
          )
        })
      }

      drawingContext.globalCompositeOperation = 'source-over'
      drawingContext.globalAlpha = 1
      outputCanvas.dataset.brainFractalDegeneration = degenerationProgress.toFixed(3)
      outputCanvas.dataset.brainFractalTransition =
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
      maskBuffer.width = 1
      maskBuffer.height = 1
      outputCanvas.width = 1
      outputCanvas.height = 1
      outputCanvas.remove()
    },
  }
}
