import type { AppSettings, BandEnergies } from '@shared/types'
import type { PsychedelScene } from '@shared/brain/brainTypes'
import type { BrainFrameMorphPattern } from './brainFrameMotion'
import type { BrainRhythmState } from './brainRhythm'
import type { BrainSvgController } from './brainSvgScene'
import { brainLog, brainWarn } from './brainLog'
import { getBrainRenderingConfig } from './brainRenderingConfig'
import { brainPerformanceMetrics } from './brainPerformanceMetrics'
import { BrainCanvasMotionSmoother, type BrainCanvasMotionTargets } from './brainCanvasMotionSmoother'

/** Renderer serigrafico storico, distinto dalla regia a finestre Psycho2D. */
const ANALYSIS_WIDTH = 240
const ANALYSIS_HEIGHT = 135
const RENDER_WIDTH = 480
const RENDER_HEIGHT = 270
const LAYER_COUNT = 6
const INK_FRAGMENT_COUNT = 4
const SILENT_BANDS: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }

export const BRAIN_PRINT2D_MODES = [
  'living-ink',
  'layered-screenprint',
  'riso-echo',
  'acid-glass',
  'topographic-ghost',
  'chromatic-cutout',
  'negative-bloom',
] as const

export type BrainPrint2dMode = (typeof BRAIN_PRINT2D_MODES)[number]

export type BrainPrint2dMotion = {
  activity: number
  activeLayer: number
  depthPx: number
  propagationPx: number
  dislocationPx: number
  chromaticPx: number
  edgeAlpha: number
  beatEnvelope: number
  layerScale: number
  layerSkew: number
  depthOffsetPx: number
  propagationOffsetPx: number
  dislocationOffsetPx: number
  chromaticOffsetPx: number
}

export type BrainPrint2dBandDrives = BandEnergies

const NORMAL_FRAME_INTERVAL_MS = 1_000 / 24
const LOW_POWER_FRAME_INTERVAL_MS = 1_000 / 20
const INFERENCE_FRAME_INTERVAL_MS = 1_000 / 18

export function calculateBrainPrint2dFrameInterval(
  resourcePressure: boolean,
  lowPowerMode: boolean,
): number {
  if (resourcePressure) return INFERENCE_FRAME_INTERVAL_MS
  if (lowPowerMode) return LOW_POWER_FRAME_INTERVAL_MS
  return NORMAL_FRAME_INTERVAL_MS
}

export function shouldRenderBrainPrint2dFrame(
  audioActive: boolean,
  signature: string,
  previousSignature: string,
): boolean {
  return audioActive || signature !== previousSignature
}

type PreparedArtwork = {
  screenprintLayers: HTMLCanvasElement[]
  inkFragments: HTMLCanvasElement[]
  palette: string[]
  contourCore: HTMLCanvasElement
  contourFaint: HTMLCanvasElement
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value))
}

function hashText(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** Estrae linguaggi differenti prima di ripetere il mazzo dei sette renderer. */
export function buildPrint2dModeSequence(
  count: number,
  random: () => number = Math.random,
): BrainPrint2dMode[] {
  const safeCount = Math.max(0, Math.round(count))
  const result: BrainPrint2dMode[] = []
  while (result.length < safeCount) {
    const deck = [...BRAIN_PRINT2D_MODES]
    for (let index = deck.length - 1; index > 0; index -= 1) {
      const target = Math.min(index, Math.floor(clamp(random()) * (index + 1)))
      ;[deck[index], deck[target]] = [deck[target], deck[index]]
    }
    if (result.length > 0 && deck[0] === result[result.length - 1]) {
      ;[deck[0], deck[1]] = [deck[1], deck[0]]
    }
    result.push(...deck)
  }
  return result.slice(0, safeCount)
}

/**
 * Mantiene una risposta continua al livello della banda e aggiunge la sua
 * crescita rispetto alla media recente. Non modifica l'analizzatore globale.
 */
export function calculateBrainPrint2dBandDrives(
  bands: BandEnergies,
  movingAverages?: BandEnergies,
): BrainPrint2dBandDrives {
  // Soglie unificate fra tutti i renderer Brain (in precedenza ogni file
  // aveva la propria versione con drift casuale — segnalato dal
  // Capo Supremo come "soglie a cazzo"): stessi numeri di baseline/soglia
  // di `bandDrive` usato altrove, leggermente più reattiva di prima.
  const drive = (band: keyof BandEnergies): number => {
    const value = clamp(bands[band])
    const baseline = Math.max(0.018, movingAverages?.[band] ?? value * 0.82)
    const sustained = clamp((value - 0.006) / 0.4)
    const lift = clamp((value - baseline) / (baseline * 0.8 + 0.024))
    return clamp(sustained * 0.68 + lift * 0.32)
  }
  return {
    low: drive('low'),
    lowMid: drive('lowMid'),
    mid: drive('mid'),
    high: drive('high'),
  }
}

// Brief VJ del Capo Supremo (PIANO-039, "vita interna"): l'identità di
// Print2D non deve più essere dominata da lastre che si spostano/ruotano/
// scalano in modo vistoso — il disallineamento di registro resta (§12,
// esplicitamente richiesto), ma come tensione di sottofondo, non come
// coreografia. Le ampiezze di spostamento/scala/skew delle lastre sono
// scalate di questo fattore rispetto ai valori originali; la vivacità si
// sposta sul layer contorno (vedi `computeContourThickness`/
// `computeContourDoubling` più sotto) e sul colpo di `impulso`.
const PLATE_MOTION_SCALE = 0.5

/** Mappa drive, transienti e fase musicale su quattro gesti indipendenti. */
export function calculateBrainPrint2dMotion(
  bands: BandEnergies,
  settings: AppSettings,
  rhythm: BrainRhythmState | undefined,
  marchStep: number,
  layerCount = LAYER_COUNT,
  movingAverages?: BandEnergies,
): BrainPrint2dMotion {
  const transients = rhythm?.bandTransients ?? SILENT_BANDS
  const drives = calculateBrainPrint2dBandDrives(bands, movingAverages)
  const energy =
    drives.low * 0.3 +
    drives.lowMid * 0.27 +
    drives.mid * 0.24 +
    drives.high * 0.19
  const transient = Math.max(
    transients.low,
    transients.lowMid,
    transients.mid,
    transients.high,
  )
  const activity = clamp((energy + transient * 0.24 - 0.008) / 0.62)
  const profile = settings.motionProfile === 'ambient'
    ? 0.66
    : settings.motionProfile === 'techno'
      ? 1.12
      : 0.9
  const softness = settings.softMode ? 0.72 : 1
  const sensitivity = 0.76 + clamp(settings.sensitivity) * 0.44
  const scale = profile * softness * sensitivity * PLATE_MOTION_SCALE
  const beatEnvelope = clamp(
    rhythm?.kickEnvelope ?? rhythm?.beatPulse ?? 0,
  ) * activity * (profile * softness * sensitivity)
  const depthPx = clamp(
    (drives.low * 16 + transients.low * 6) * scale + beatEnvelope * 3.2 * PLATE_MOTION_SCALE,
    0,
    19 * PLATE_MOTION_SCALE,
  )
  const propagationPx = clamp(
    (drives.lowMid * 21 + transients.lowMid * 7) * scale,
    0,
    23 * PLATE_MOTION_SCALE,
  )
  const dislocationPx = clamp(
    (drives.mid * 16 + transients.mid * 8) * scale,
    0,
    18 * PLATE_MOTION_SCALE,
  )
  const chromaticPx = clamp(
    (drives.high * 11 + transients.high * 7) * scale,
    0,
    13 * PLATE_MOTION_SCALE,
  )
  const phase = rhythm?.beatPhase ?? 0
  const phaseRadians = phase * Math.PI * 2
  return {
    activity,
    activeLayer: ((marchStep % layerCount) + layerCount) % layerCount,
    // low: pressione, profondita e corpo dell'inchiostro
    depthPx,
    // low-mid: propagazione laterale fra masse vicine
    propagationPx,
    // mid: dislocazione locale dei frammenti, mai della camera
    dislocationPx,
    // high: sdoppiamento cromatico dei soli bordi
    chromaticPx,
    edgeAlpha: clamp(0.28 + (drives.high * 0.52 + transients.high * 0.36) * scale),
    beatEnvelope,
    layerScale: 1 + clamp(
      (drives.low * 0.055 + drives.mid * 0.03 + beatEnvelope * 0.055) * scale,
      0,
      0.09,
    ),
    layerSkew: clamp(
      (drives.lowMid * 0.045 + transients.mid * 0.025) * scale,
      0,
      0.05,
    ),
    depthOffsetPx: depthPx * Math.cos(phaseRadians),
    propagationOffsetPx: propagationPx * Math.sin(phaseRadians),
    dislocationOffsetPx:
      dislocationPx * Math.cos(phaseRadians * 2 + Math.PI / 3),
    chromaticOffsetPx:
      chromaticPx * Math.sin(phaseRadians * 4 + Math.PI / 4),
  }
}

// --- PIANO-039: vita interna (contorno vivo + freeze/impulso) ---------

/**
 * Alternanza unica richiesta dal brief VJ del Capo Supremo — mai due
 * preset separati, un'unica catena `vivo → freeze → impulso →
 * decadimento → vivo`. Innescata dal fronte di salita del flash globale
 * (già architettura esistente di Brain, §10 del brief: motore flash
 * Control deliberatamente raro, non il beat — vedi `docs/pipeline-audio.md`
 * §4), non da un evento nuovo.
 */
export type PrintLifePhase = 'vivo' | 'freeze' | 'impulso' | 'decadimento'

export type PrintLifeState = {
  phase: PrintLifePhase
  phaseStartedAt: number
  impulseIntensity: number
}

export function createInitialPrintLifeState(time = 0): PrintLifeState {
  return { phase: 'vivo', phaseStartedAt: time, impulseIntensity: 0 }
}

const PRINT_FREEZE_HOLD_MS = 130
const PRINT_IMPULSE_HOLD_MS = 170
const PRINT_DECAY_MS = 620

export function advancePrintLifeState(
  state: PrintLifeState,
  flashActive: boolean,
  flashIntensity: number,
  time: number,
): PrintLifeState {
  if (flashActive && state.phase !== 'freeze' && state.phase !== 'impulso') {
    return { phase: 'freeze', phaseStartedAt: time, impulseIntensity: clamp(flashIntensity) }
  }
  const elapsed = time - state.phaseStartedAt
  switch (state.phase) {
    case 'freeze':
      return elapsed >= PRINT_FREEZE_HOLD_MS
        ? { ...state, phase: 'impulso', phaseStartedAt: time }
        : state
    case 'impulso':
      return elapsed >= PRINT_IMPULSE_HOLD_MS
        ? { ...state, phase: 'decadimento', phaseStartedAt: time }
        : state
    case 'decadimento':
      return elapsed >= PRINT_DECAY_MS
        ? { phase: 'vivo', phaseStartedAt: time, impulseIntensity: 0 }
        : state
    default:
      return state
  }
}

export type PrintLifeEnvelope = {
  /** 0 durante il freeze (il contorno smette di respirare, le lastre si
   * bloccano), risale gradualmente in decadimento, 1 a riposo. */
  breathingGate: number
  /** 0 a riposo, spinge al picco durante l'impulso, si smorza in
   * decadimento — il "colpo interno alla stampa" del §4. */
  impulseDrive: number
}

export function computePrintLifeEnvelope(
  state: PrintLifeState,
  time: number,
): PrintLifeEnvelope {
  const elapsed = time - state.phaseStartedAt
  switch (state.phase) {
    case 'freeze':
      return { breathingGate: 0, impulseDrive: 0 }
    case 'impulso':
      return { breathingGate: 0, impulseDrive: state.impulseIntensity }
    case 'decadimento': {
      const progress = clamp(elapsed / PRINT_DECAY_MS)
      const eased = progress * progress * (3 - 2 * progress)
      return {
        breathingGate: eased,
        impulseDrive: state.impulseIntensity * (1 - eased),
      }
    }
    default:
      return { breathingGate: 1, impulseDrive: 0 }
  }
}

/**
 * Fase lenta di respirazione del contorno (spessore/sdoppiamento/densità,
 * §2 del brief) — avanza SOLO con attività audio reale, mai un orologio
 * libero (Check Silenzio), stesso pattern di `advanceBauhausAbstraction`.
 */
export function advanceContourBreathingPhase(
  phase: number,
  deltaMs: number,
  activity: number,
): number {
  if (activity <= 0) return phase
  const next = phase + (deltaMs / 1_000) * (0.12 + activity * 0.22)
  return next % 1
}

/** Spessore del contorno: soffitto/pavimento fra `contourFaint` e
 * `contourCore` — ispessisce con l'attività e il battito, mai fisso. */
export function computeContourThickness(
  breathingPhase: number,
  activity: number,
  beatEnvelope: number,
  impulseDrive: number,
): number {
  const breathe = Math.sin(breathingPhase * Math.PI * 2) * 0.5 + 0.5
  return clamp(
    0.35 + activity * 0.28 + breathe * 0.16 * activity +
    beatEnvelope * 0.14 + impulseDrive * 0.32,
  )
}

/** Quanto il contorno si sdoppia (seconda copia leggermente spostata) —
 * quasi assente a riposo, marcato durante l'impulso. */
export function computeContourDoubling(
  breathingPhase: number,
  activity: number,
  midDrive: number,
  impulseDrive: number,
): number {
  const breathe = Math.cos(breathingPhase * Math.PI * 2 * 1.3) * 0.5 + 0.5
  return clamp(
    activity * 0.1 + breathe * midDrive * 0.3 + impulseDrive * 0.55,
  )
}

function createLayerCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = ANALYSIS_WIDTH
  canvas.height = ANALYSIS_HEIGHT
  return canvas
}

function drawBitmapCover(
  context: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
): void {
  const scale = Math.max(
    ANALYSIS_WIDTH / bitmap.width,
    ANALYSIS_HEIGHT / bitmap.height,
  )
  const sourceWidth = ANALYSIS_WIDTH / scale
  const sourceHeight = ANALYSIS_HEIGHT / scale
  context.drawImage(
    bitmap,
    (bitmap.width - sourceWidth) / 2,
    (bitmap.height - sourceHeight) / 2,
    sourceWidth,
    sourceHeight,
    0,
    0,
    ANALYSIS_WIDTH,
    ANALYSIS_HEIGHT,
  )
}

function parseColor(color: string): [number, number, number] {
  const match = color.trim().match(/^#([\da-f]{6})$/i)
  if (!match) return [255, 255, 255]
  return [
    Number.parseInt(match[1].slice(0, 2), 16),
    Number.parseInt(match[1].slice(2, 4), 16),
    Number.parseInt(match[1].slice(4, 6), 16),
  ]
}

function prepareArtwork(
  bitmap: ImageBitmap,
  sourcePalette: readonly string[],
  sceneSeed: number,
): PreparedArtwork {
  const source = createLayerCanvas()
  const sourceContext = source.getContext('2d', { willReadFrequently: true })
  if (!sourceContext) throw new Error('Canvas 2D non disponibile')
  drawBitmapCover(sourceContext, bitmap)
  const sourceData = sourceContext.getImageData(
    0,
    0,
    ANALYSIS_WIDTH,
    ANALYSIS_HEIGHT,
  ).data
  const palette = Array.from({ length: LAYER_COUNT }, (_, index) =>
    sourcePalette[index % Math.max(1, sourcePalette.length)] ?? '#ffffff',
  )
  const layerData = palette.map(() =>
    new Uint8ClampedArray(ANALYSIS_WIDTH * ANALYSIS_HEIGHT * 4),
  )
  const luminance = new Float32Array(ANALYSIS_WIDTH * ANALYSIS_HEIGHT)

  for (let pixel = 0; pixel < luminance.length; pixel += 1) {
    const offset = pixel * 4
    const value =
      sourceData[offset] * 0.2126 +
      sourceData[offset + 1] * 0.7152 +
      sourceData[offset + 2] * 0.0722
    luminance[pixel] = value
    const layerIndex = Math.min(LAYER_COUNT - 1, Math.floor(value / 256 * LAYER_COUNT))
    const [red, green, blue] = parseColor(palette[layerIndex])
    const target = layerData[layerIndex]
    target[offset] = red
    target[offset + 1] = green
    target[offset + 2] = blue
    // Retino realmente traforato: il raster al 20% resta percepibile sotto,
    // mentre le masse non tornano a sembrare una fotografia AI colorata.
    const halftone = (xorshift(pixel + sceneSeed) % 8) < 3
    target[offset + 3] = halftone ? 0 : 232
  }

  const screenprintLayers = layerData.map((data) => {
    const canvas = createLayerCanvas()
    canvas.getContext('2d')?.putImageData(
      new ImageData(data, ANALYSIS_WIDTH, ANALYSIS_HEIGHT),
      0,
      0,
    )
    return canvas
  })

  const gradients = new Float32Array(luminance.length)
  let gradientTotal = 0
  let gradientSamples = 0
  for (let y = 1; y < ANALYSIS_HEIGHT - 1; y += 1) {
    for (let x = 1; x < ANALYSIS_WIDTH - 1; x += 1) {
      const index = y * ANALYSIS_WIDTH + x
      const gx =
        -luminance[index - ANALYSIS_WIDTH - 1] +
        luminance[index - ANALYSIS_WIDTH + 1] -
        luminance[index - 1] * 2 +
        luminance[index + 1] * 2 -
        luminance[index + ANALYSIS_WIDTH - 1] +
        luminance[index + ANALYSIS_WIDTH + 1]
      const gy =
        -luminance[index - ANALYSIS_WIDTH - 1] -
        luminance[index - ANALYSIS_WIDTH] * 2 -
        luminance[index - ANALYSIS_WIDTH + 1] +
        luminance[index + ANALYSIS_WIDTH - 1] +
        luminance[index + ANALYSIS_WIDTH] * 2 +
        luminance[index + ANALYSIS_WIDTH + 1]
      const magnitude = Math.hypot(gx, gy)
      gradients[index] = magnitude
      gradientTotal += magnitude
      gradientSamples += 1
    }
  }
  const threshold = Math.max(76, gradientTotal / Math.max(1, gradientSamples) * 1.42)
  const inkData = Array.from({ length: INK_FRAGMENT_COUNT }, () =>
    new Uint8ClampedArray(ANALYSIS_WIDTH * ANALYSIS_HEIGHT * 4),
  )
  for (let y = 1; y < ANALYSIS_HEIGHT - 1; y += 1) {
    for (let x = 1; x < ANALYSIS_WIDTH - 1; x += 1) {
      const pixel = y * ANALYSIS_WIDTH + x
      if (gradients[pixel] < threshold) continue
      const fragment = Math.abs(
        Math.floor(x / 40) + Math.floor(y / 30) * 3 + sceneSeed,
      ) % INK_FRAGMENT_COUNT
      const offset = pixel * 4
      const [red, green, blue] = parseColor(
        palette[(fragment + 1) % palette.length],
      )
      inkData[fragment][offset] = red
      inkData[fragment][offset + 1] = green
      inkData[fragment][offset + 2] = blue
      inkData[fragment][offset + 3] = 238
    }
  }
  const inkFragments = inkData.map((data) => {
    const canvas = createLayerCanvas()
    canvas.getContext('2d')?.putImageData(
      new ImageData(data, ANALYSIS_WIDTH, ANALYSIS_HEIGHT),
      0,
      0,
    )
    return canvas
  })

  // Contorno vivo (PIANO-039): due soglie sullo STESSO gradiente Sobel già
  // calcolato sopra per i frammenti — nessuna analisi aggiuntiva. `core`
  // (soglia alta, solo i bordi più marcati, inchiostro scuro) e `faint`
  // (soglia bassa, più bordi inclusi, tinta d'accento) si sovrappongono a
  // runtime con opacità/scarto variabili per dare l'illusione di uno
  // spessore che respira e si sdoppia, senza rianalizzare nulla per frame.
  const contourCoreThreshold = threshold * 1.55
  const contourFaintThreshold = threshold * 0.7
  const [inkRed, inkGreen, inkBlue] = parseColor(palette[0])
  const [accentRed, accentGreen, accentBlue] = parseColor(
    palette[Math.floor(palette.length / 2) % palette.length],
  )
  const contourCoreData = new Uint8ClampedArray(ANALYSIS_WIDTH * ANALYSIS_HEIGHT * 4)
  const contourFaintData = new Uint8ClampedArray(ANALYSIS_WIDTH * ANALYSIS_HEIGHT * 4)
  for (let y = 1; y < ANALYSIS_HEIGHT - 1; y += 1) {
    for (let x = 1; x < ANALYSIS_WIDTH - 1; x += 1) {
      const pixel = y * ANALYSIS_WIDTH + x
      const offset = pixel * 4
      const magnitude = gradients[pixel]
      if (magnitude >= contourCoreThreshold) {
        contourCoreData[offset] = 20
        contourCoreData[offset + 1] = 18
        contourCoreData[offset + 2] = 24
        contourCoreData[offset + 3] = 235
      } else if (magnitude >= contourFaintThreshold) {
        // Fascia intermedia: inchiostro leggero, non ancora la tinta
        // d'accento del `faint` — evita un bordo doppio "a scalino".
        contourCoreData[offset] = inkRed
        contourCoreData[offset + 1] = inkGreen
        contourCoreData[offset + 2] = inkBlue
        contourCoreData[offset + 3] = 96
      }
      if (magnitude >= contourFaintThreshold) {
        contourFaintData[offset] = accentRed
        contourFaintData[offset + 1] = accentGreen
        contourFaintData[offset + 2] = accentBlue
        contourFaintData[offset + 3] = magnitude >= contourCoreThreshold ? 150 : 90
      }
    }
  }
  const contourCore = createLayerCanvas()
  contourCore.getContext('2d')?.putImageData(
    new ImageData(contourCoreData, ANALYSIS_WIDTH, ANALYSIS_HEIGHT), 0, 0,
  )
  const contourFaint = createLayerCanvas()
  contourFaint.getContext('2d')?.putImageData(
    new ImageData(contourFaintData, ANALYSIS_WIDTH, ANALYSIS_HEIGHT), 0, 0,
  )

  source.width = 1
  source.height = 1
  return { screenprintLayers, inkFragments, palette, contourCore, contourFaint }
}

function drawLayer(
  context: CanvasRenderingContext2D,
  layer: CanvasImageSource,
  width: number,
  height: number,
  x: number,
  y: number,
  scale: number,
  rotation: number,
  alpha: number,
  scaleY = scale,
  skew = 0,
): void {
  context.save()
  context.globalAlpha = clamp(alpha)
  context.translate(width / 2 + x, height / 2 + y)
  context.rotate(rotation)
  context.transform(scale, 0, skew, scaleY, 0, 0)
  context.drawImage(layer, -width / 2, -height / 2, width, height)
  context.restore()
}

function xorshift(seed: number): number {
  let value = seed | 0
  value ^= value << 13
  value ^= value >>> 17
  value ^= value << 5
  return value >>> 0
}

type LayerMorph = {
  x: number
  y: number
  scaleX: number
  scaleY: number
  rotation: number
  skew: number
  alpha: number
}

export function calculateBrainPrint2dLayerMorph(
  progress: number,
  role: 'enter' | 'exit',
  index: number,
  count: number,
  seed: number,
  pattern: BrainFrameMorphPattern,
): LayerMorph {
  const stagger = index / Math.max(1, count) * 0.34
  const localProgress = role === 'enter'
    ? clamp((progress - stagger) / 0.66)
    : clamp(progress * 1.12 - stagger * 0.35)
  const eased = localProgress * localProgress * (3 - 2 * localProgress)
  const deformation = role === 'enter' ? 1 - eased : eased
  const direction = xorshift(seed + index * 7919) % 2 === 0 ? 1 : -1
  const vertical = xorshift(seed + index * 3571) % 2 === 0 ? 1 : -1
  const axisSwap = pattern === 'fioritura' || pattern === 'spirale'
  const spread = 34 + (xorshift(seed + index * 1013) % 34)
  const squeeze = 0.48 + (index % 3) * 0.12
  return {
    x: direction * deformation * spread * (axisSwap ? 0.45 : 1),
    y: vertical * deformation * spread * (axisSwap ? 0.72 : 0.3),
    scaleX: axisSwap ? 1 + deformation * 0.24 : 1 - deformation * squeeze,
    scaleY: axisSwap ? 1 - deformation * squeeze : 1 + deformation * 0.2,
    rotation: direction * deformation * (0.055 + index * 0.006),
    skew: direction * deformation * (pattern === 'corrente' ? 0.22 : 0.11),
    alpha: role === 'enter' ? eased : 1,
  }
}

export function createBrainPrint2dScene(
  container: HTMLElement,
  scene: PsychedelScene,
  raster: Blob,
  palette: readonly string[],
  mode: BrainPrint2dMode,
): BrainSvgController {
  const imageConfig = getBrainRenderingConfig().image
  const canvas = document.createElement('canvas')
  canvas.width = Math.min(imageConfig.width, RENDER_WIDTH)
  canvas.height = Math.min(imageConfig.height, RENDER_HEIGHT)
  canvas.dataset.brainPrint2d = mode
  canvas.setAttribute('aria-hidden', 'true')
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    display: 'block',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    transform: 'translateZ(0)',
  })
  const context = canvas.getContext('2d', { alpha: true })
  container.appendChild(canvas)

  const sceneSeed = hashText(`${scene.frameId}:${scene.description}`)
  let bitmap: ImageBitmap | null = null
  let artwork: PreparedArtwork | null = null
  let destroyed = false
  let resourcePressure = false
  let lastRenderedAt = Number.NEGATIVE_INFINITY
  let lastRenderSignature = ''
  let lastMotionAt = Number.NaN
  const motionSmoother = new BrainCanvasMotionSmoother()
  let previousBeatIndex = -1
  let marchStep = sceneSeed % LAYER_COUNT
  let transitionProgress = 1
  let transitionRole: 'enter' | 'exit' = 'enter'
  let morphPattern: BrainFrameMorphPattern = 'marea'
  // PIANO-039 (vita interna): alternanza vivo/freeze/impulso/decadimento
  // e la respirazione lenta del contorno che la accompagna.
  let lifeState: PrintLifeState = createInitialPrintLifeState()
  let breathingPhase = 0
  let flashWasActive = false
  // Durante il freeze il motion smoother non avanza affatto (le lastre si
  // bloccano davvero): l'ultimo snapshot va conservato per continuare a
  // disegnare qualcosa mentre il tempo è sospeso.
  let lastSmoothMotion: BrainCanvasMotionTargets | null = null

  void createImageBitmap(raster)
    .then((decoded) => {
      if (destroyed) {
        decoded.close()
        return
      }
      bitmap = decoded
      const preparationStartedAt = performance.now()
      artwork = prepareArtwork(decoded, palette, sceneSeed)
      brainPerformanceMetrics.recordArtworkPreparation(
        performance.now() - preparationStartedAt,
      )
      decoded.close()
      bitmap = null
      brainLog('render', 'Print2D preparata', {
        frameId: scene.frameId,
        mode,
        screenprintLayers: artwork.screenprintLayers.length,
        inkFragments: artwork.inkFragments.length,
        analysis: `${ANALYSIS_WIDTH}x${ANALYSIS_HEIGHT}`,
      })
    })
    .catch((error) => {
      if (!destroyed) {
        brainWarn('render', 'preparazione Print2D fallita', {
          frameId: scene.frameId,
          error,
        })
      }
    })

  return {
    element: canvas,
    isReady: () => artwork !== null,
    setOpacity(opacity) {
      canvas.style.opacity = String(clamp(opacity))
    },
    getMorphShapes: () => [],
    setMorphPattern(pattern) {
      morphPattern = pattern
      canvas.dataset.brainMorphPattern = pattern
    },
    setResourcePressure(active) {
      resourcePressure = active
      canvas.dataset.brainResourcePressure = active ? 'true' : 'false'
    },
    setTransition(progress, role) {
      transitionProgress = clamp(progress)
      transitionRole = role
    },
    update(bands, settings, time, rhythm, movingAverages, flash) {
      if (!artwork || !context || destroyed) return
      // Il beat va acquisito al ritmo del clock, non soltanto quando il canvas
      // ottiene il permesso di disegnare: altrimenti un impulso breve si perde.
      if (rhythm?.beat && rhythm.beatIndex !== previousBeatIndex) {
        previousBeatIndex = rhythm.beatIndex
        marchStep = (marchStep + 1) % LAYER_COUNT
      }
      // PIANO-039: il fronte di salita del flash globale (già l'evento
      // significativo previsto dall'architettura di Brain, §10 del brief
      // — motore flash Control, deliberatamente raro) innesca la sequenza
      // vivo → freeze → impulso → decadimento → vivo. Riusa lo stesso
      // pattern `flashWasActive`/fronte di salita già in uso in
      // Psycho2D, non una nuova detection.
      const flashActive = flash?.active === true && (flash?.intensity ?? 0) > 0.04
      const flashRisingEdge = flashActive && !flashWasActive
      flashWasActive = flashActive
      lifeState = advancePrintLifeState(
        lifeState,
        flashRisingEdge,
        flash?.intensity ?? 0,
        time,
      )
      const { breathingGate, impulseDrive } = computePrintLifeEnvelope(lifeState, time)
      const frozen = lifeState.phase === 'freeze'

      const rawMotion = calculateBrainPrint2dMotion(
        bands,
        settings,
        rhythm,
        marchStep,
        LAYER_COUNT,
        movingAverages,
      )
      const motionElapsed = Number.isFinite(lastMotionAt)
        ? Math.max(0, time - lastMotionAt)
        : 16
      // Durante il freeze il tempo del motion smoother resta sospeso: non
      // avanza affatto, non solo "non cambia visivamente" — così quando il
      // freeze finisce l'inerzia riparte da dove si era fermata, non da un
      // salto temporale accumulato.
      if (!frozen) {
        lastMotionAt = time
        breathingPhase = advanceContourBreathingPhase(
          breathingPhase,
          motionElapsed,
          rawMotion.activity,
        )
      }
      const smoothMotion = frozen && lastSmoothMotion
        ? lastSmoothMotion
        : motionSmoother.update(
          {
            low: clamp(rawMotion.depthPx / (19 * PLATE_MOTION_SCALE)),
            lowMid: clamp(rawMotion.propagationPx / (23 * PLATE_MOTION_SCALE)),
            mid: clamp(rawMotion.dislocationPx / (18 * PLATE_MOTION_SCALE)),
            high: clamp(rawMotion.chromaticPx / (13 * PLATE_MOTION_SCALE)),
            activity: rawMotion.activity,
            beat: rawMotion.beatEnvelope,
          },
          motionElapsed,
          rhythm?.beatDurationMs ?? 500,
          rhythm?.active ?? (rawMotion.activity > 0),
          settings.motionProfile,
        )
      if (!frozen) lastSmoothMotion = smoothMotion
      // L'impulso spinge temporaneamente il registro oltre il tetto
      // ordinario — il "colpo interno alla stampa" del §4, non una nuova
      // danza continua: torna a scemare in decadimento.
      const impulseBoost = 1 + impulseDrive * 1.7
      const phaseRadians = (rhythm?.beatPhase ?? 0) * Math.PI * 2
      const depthPx = smoothMotion.low * 19 * PLATE_MOTION_SCALE * impulseBoost
      const propagationPx = smoothMotion.lowMid * 23 * PLATE_MOTION_SCALE * impulseBoost
      const dislocationPx = smoothMotion.mid * 18 * PLATE_MOTION_SCALE * impulseBoost
      const chromaticPx = smoothMotion.high * 13 * PLATE_MOTION_SCALE * impulseBoost
      const motion: BrainPrint2dMotion = {
        ...rawMotion,
        activity: smoothMotion.activity,
        depthPx,
        propagationPx,
        dislocationPx,
        chromaticPx,
        beatEnvelope: smoothMotion.beat,
        depthOffsetPx: depthPx * Math.cos(phaseRadians),
        propagationOffsetPx: propagationPx * Math.sin(phaseRadians),
        dislocationOffsetPx:
          dislocationPx * Math.cos(phaseRadians * 2 + Math.PI / 3),
        chromaticOffsetPx:
          chromaticPx * Math.sin(phaseRadians * 4 + Math.PI / 4),
      }
      const audioActive = motion.activity >= 0.015 || motion.beatEnvelope >= 0.01
      const frameInterval = calculateBrainPrint2dFrameInterval(
        resourcePressure,
        settings.lowPowerMode,
      )
      if (Number.isFinite(lastRenderedAt)) {
        const elapsed = time - lastRenderedAt
        if (elapsed < frameInterval) return
        // Conserva la griglia temporale dopo un frame in ritardo senza
        // tentare recuperi multipli che produrrebbero raffiche.
        lastRenderedAt += Math.floor(elapsed / frameInterval) * frameInterval
      } else {
        lastRenderedAt = time
      }
      const renderSignature = [
        marchStep,
        transitionRole,
        Math.round(transitionProgress * 60),
        Math.round(motion.depthOffsetPx * 2),
        Math.round(motion.propagationOffsetPx * 2),
        Math.round(motion.dislocationOffsetPx * 2),
        Math.round(motion.chromaticOffsetPx * 2),
        Math.round(motion.beatEnvelope * 12),
        lifeState.phase,
        Math.round(breathingGate * 20),
        Math.round(impulseDrive * 20),
        Math.round(breathingPhase * 20),
      ].join(':')
      if (!shouldRenderBrainPrint2dFrame(
        audioActive,
        renderSignature,
        lastRenderSignature,
      )) return
      lastRenderSignature = renderSignature
      const renderStartedAt = performance.now()
      canvas.dataset.brainMarchStep = String(marchStep)
      canvas.dataset.brainActivity = motion.activity.toFixed(3)
      canvas.dataset.brainAudioActive = audioActive ? 'true' : 'false'
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.globalCompositeOperation = 'source-over'
      context.globalAlpha = 1
      const direction = marchStep % 2 === 0 ? 1 : -1
      const paint = (
        layer: CanvasImageSource,
        index: number,
        count: number,
        alpha: number,
        x = 0,
        y = 0,
        scale = 1,
        rotation = 0,
        skew = 0,
      ) => {
        const morph = calculateBrainPrint2dLayerMorph(
          transitionProgress,
          transitionRole,
          index,
          count,
          sceneSeed,
          morphPattern,
        )
        drawLayer(
          context,
          layer,
          canvas.width,
          canvas.height,
          x + morph.x,
          y + morph.y,
          scale * morph.scaleX,
          rotation + morph.rotation,
          alpha * morph.alpha,
          scale * morph.scaleY,
          skew + morph.skew,
        )
      }
      const screen = artwork.screenprintLayers
      const ink = artwork.inkFragments
      const activeScreen = motion.activeLayer
      const activeInk = activeScreen % INK_FRAGMENT_COUNT
      const beatScale = 1 + motion.beatEnvelope * 0.075
      const depthMotion = motion.depthOffsetPx
      const propagationMotion = motion.propagationOffsetPx
      const dislocationMotion = motion.dislocationOffsetPx
      const chromaticMotion = motion.chromaticOffsetPx

      switch (mode) {
        case 'layered-screenprint':
          screen.forEach((layer, index) => {
            const lane = (index % 3) - 1
            paint(
              layer,
              index,
              LAYER_COUNT,
              index === activeScreen ? 1 : 0.78,
              lane * propagationMotion * direction,
              index < 2 ? depthMotion * (index === 0 ? 1 : -0.55) : 0,
              index === activeScreen ? beatScale : 1,
              lane * dislocationMotion * 0.0026,
              lane * motion.layerSkew,
            )
          })
          break

        case 'living-ink':
          paint(screen[1], 0, 2, 0.2, propagationMotion * 0.3)
          paint(screen[4], 1, 2, 0.17, -propagationMotion * 0.24)
          context.globalCompositeOperation = 'screen'
          ink.forEach((fragment, index) => {
            const lane = ((index + marchStep) % 3) - 1
            paint(
              fragment,
              index,
              INK_FRAGMENT_COUNT,
              index === activeInk ? 1 : motion.edgeAlpha,
              lane * dislocationMotion +
                (index % 2 === 0 ? chromaticMotion : -chromaticMotion),
              index < 2 ? direction * depthMotion * 0.5 : 0,
              index === activeInk ? beatScale : motion.layerScale,
              lane * dislocationMotion * 0.003,
            )
          })
          break

        case 'riso-echo':
          context.globalCompositeOperation = 'screen'
          ;[1, 3, 5].forEach((layerIndex, index) => {
            const lane = index - 1
            paint(
              screen[layerIndex],
              index,
              3,
              0.88,
              lane * (propagationMotion + chromaticMotion) * direction,
              lane * depthMotion * 0.35,
              layerIndex === activeScreen ? beatScale : motion.layerScale,
              lane * 0.012 * motion.activity,
              -lane * motion.layerSkew,
            )
          })
          paint(ink[activeInk], 3, 4, 0.72, direction * chromaticMotion)
          break

        case 'acid-glass':
          context.globalCompositeOperation = 'lighter'
          ;[0, 2, 3, 5].forEach((layerIndex, index) => {
            const quadrant = index % 2 === 0 ? -1 : 1
            paint(
              screen[layerIndex],
              index,
              4,
              0.64,
              quadrant * dislocationMotion,
              (index < 2 ? -1 : 1) * depthMotion * 0.38,
              layerIndex === activeScreen ? beatScale : 1,
              quadrant * dislocationMotion * 0.004,
              quadrant * motion.layerSkew * 1.4,
            )
          })
          break

        case 'topographic-ghost':
          paint(screen[2], 0, 1, 0.14, 0, direction * depthMotion * 0.3)
          context.globalCompositeOperation = 'screen'
          ink.forEach((fragment, index) => {
            const ring = index - 1.5
            paint(
              fragment,
              index,
              INK_FRAGMENT_COUNT,
              0.58 + (index === activeInk ? 0.38 : 0),
              ring * propagationMotion * 0.52,
              -ring * depthMotion * 0.28,
              motion.layerScale + Math.abs(ring) * 0.012,
              ring * 0.009 * motion.activity,
            )
          })
          break

        case 'chromatic-cutout':
          context.globalCompositeOperation = 'screen'
          ;[0, 2, 5].forEach((layerIndex, index) => {
            const lane = index - 1
            paint(
              screen[layerIndex],
              index,
              3,
              0.92,
              lane * chromaticMotion * 1.35,
              lane * dislocationMotion * 0.4,
              layerIndex === activeScreen ? beatScale : 1,
              lane * dislocationMotion * 0.0035,
            )
          })
          paint(ink[activeInk], 3, 4, motion.edgeAlpha, direction * propagationMotion)
          break

        case 'negative-bloom':
          context.globalCompositeOperation = 'difference'
          paint(screen[0], 0, 2, 0.86, -propagationMotion, 0, motion.layerScale)
          paint(screen[5], 1, 2, 0.86, propagationMotion, 0, beatScale)
          context.globalCompositeOperation = 'screen'
          ink.forEach((fragment, index) => {
            const petal = index % 2 === 0 ? 1 : -1
            paint(
              fragment,
              index,
              INK_FRAGMENT_COUNT,
              index === activeInk ? 0.92 : 0.46,
              petal * chromaticMotion,
              (index < 2 ? -1 : 1) * depthMotion * 0.42,
              index === activeInk ? beatScale : motion.layerScale,
              petal * dislocationMotion * 0.003,
            )
          })
          break
      }
      context.globalCompositeOperation = 'source-over'
      context.globalAlpha = 1

      // --- PIANO-039: "vita interna", passata condivisa sopra a qualunque
      // preset — mai un ottavo renderer, un unico strato di contorno vivo/
      // freeze/impulso applicato identicamente a tutti e sette (§12: le
      // differenze estetiche fra i preset restano nella composizione delle
      // lastre sopra, non qui).

      // §1/§2 Contorno vivo/respirazione: due soglie dello stesso gradiente
      // Sobel (baked a preparazione) che ispessiscono/assottigliano e si
      // sdoppiano — mai l'intera lastra, solo la soglia fra le masse.
      // `breathingGate` è 0 durante il freeze: il contorno smette di
      // respirare esattamente quando le lastre si bloccano.
      if (breathingGate > 0.01) {
        const thickness = computeContourThickness(
          breathingPhase, motion.activity, motion.beatEnvelope, impulseDrive,
        ) * breathingGate
        const doubling = computeContourDoubling(
          breathingPhase, motion.activity, smoothMotion.mid, impulseDrive,
        ) * breathingGate
        context.save()
        context.globalCompositeOperation = 'multiply'
        context.globalAlpha = clamp(0.3 + thickness * 0.5)
        context.drawImage(artwork.contourCore, 0, 0, canvas.width, canvas.height)
        if (doubling > 0.02) {
          context.globalCompositeOperation = 'screen'
          context.globalAlpha = clamp(doubling * 0.7)
          context.drawImage(
            artwork.contourFaint,
            chromaticMotion * 0.6 * (1 + impulseDrive),
            depthMotion * 0.4 * (1 + impulseDrive),
            canvas.width,
            canvas.height,
          )
        }
        context.restore()
      }

      // §7 Retino/moiré: eco della lastra attiva a scala/rotazione
      // lievemente diverse — interferenza reale fra due retini periodici
      // quasi sovrapposti, non un filtro posticcio. Quasi invisibile a
      // riposo, marcata durante l'impulso.
      if (breathingGate > 0.05) {
        const moireDrive = clamp(motion.activity * 0.22 + impulseDrive * 0.85)
        if (moireDrive > 0.04) {
          context.save()
          context.globalCompositeOperation = 'difference'
          context.globalAlpha = clamp(moireDrive * 0.2) * breathingGate
          context.translate(canvas.width / 2, canvas.height / 2)
          context.rotate((0.006 + impulseDrive * 0.032) * direction)
          const moireScale = 1 + 0.004 + impulseDrive * 0.022
          context.scale(moireScale, moireScale)
          context.drawImage(
            screen[activeScreen],
            -canvas.width / 2,
            -canvas.height / 2,
            canvas.width,
            canvas.height,
          )
          context.restore()
        }
      }

      // §8 Frammenti d'inchiostro: eco/scia del frammento attivo — una
      // sbavatura che si stacca e viene riassorbita, non un secondo
      // oggetto indipendente. Cresce marcatamente durante l'impulso
      // ("piccolo bloom di pigmento").
      if (breathingGate > 0.05) {
        const bleed = clamp(motion.activity * 0.3 + impulseDrive * 0.9) * breathingGate
        if (bleed > 0.03) {
          context.save()
          context.globalCompositeOperation = 'screen'
          paint(
            ink[activeInk],
            activeInk,
            INK_FRAGMENT_COUNT,
            clamp(bleed * 0.55),
            -chromaticMotion * 0.55,
            dislocationMotion * 0.4,
            1 + impulseDrive * 0.12,
          )
          context.restore()
        }
      }

      context.globalCompositeOperation = 'source-over'
      context.globalAlpha = 1
      canvas.dataset.brainPrintLife = lifeState.phase
      canvas.dataset.brainPrintBreathing = breathingGate.toFixed(3)
      canvas.dataset.brainPrintImpulse = impulseDrive.toFixed(3)
      // Il pattern cambia solo l'ordine spaziale; non aggiunge moti temporali.
      canvas.dataset.brainPatternFamily = morphPattern
      brainPerformanceMetrics.recordCanvasFrame(
        time,
        resourcePressure,
        performance.now() - renderStartedAt,
      )
    },
    destroy() {
      destroyed = true
      motionSmoother.reset()
      bitmap?.close()
      bitmap = null
      artwork?.screenprintLayers.forEach((layer) => {
        layer.width = 1
        layer.height = 1
      })
      artwork?.inkFragments.forEach((layer) => {
        layer.width = 1
        layer.height = 1
      })
      if (artwork) {
        artwork.contourCore.width = 1
        artwork.contourCore.height = 1
        artwork.contourFaint.width = 1
        artwork.contourFaint.height = 1
      }
      artwork = null
      canvas.remove()
    },
  }
}
