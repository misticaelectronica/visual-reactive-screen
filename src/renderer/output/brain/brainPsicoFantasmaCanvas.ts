import type { AppSettings, BandEnergies } from '@shared/types'
import { isPsicoFantasmaBundled } from '@shared/psicoFantasmaAvailability'
import type { BrainRendererPluginContext } from './brainRendererPlugin'
import type { BrainFrameMorphPattern } from './brainFrameMotion'
import type { BrainBioPerceptionState, BrainBioRegime } from './brainBioPerception'
import type { BrainSceneRendererController } from './brainSvgScene'
import type { BrainRhythmState } from './brainRhythm'
import { calculateRhythmicAccent } from './brainRhythm'
import { getBrainRenderingConfig } from './brainRenderingConfig'
import { brainLog, brainWarn } from './brainLog'
import { brainPerformanceMetrics } from './brainPerformanceMetrics'
import { extractPsicoFantasmaRegions, psicoFantasmaStructuralCoherence, type PsicoFantasmaRegion } from './psicofantasma/analysis'
import { loadBundledPsicoFantasmaRepertoire } from './psicofantasma/assets'
import { decidePsicoFantasma, rankPsicoFantasma,
  type RecognitionDecision, type RecognitionEvidence, type RecognitionThresholds } from './psicofantasma/recognition'
import { describeRegionMask } from './psicofantasma/shape'
import { rasterizePsicoFantasmaSilhouette } from './psicofantasma/preparation'
import { preparePsicoFantasmaDeformation } from './psicofantasma/deformation'
import { beginPsicoFantasmaFormFrame, retainPsicoFantasmaForm, decayPsicoFantasmaForm,
  PSICOFANTASMA_TRACE_MS, type PsicoFantasmaFormTrace } from './psicofantasma/formMemory'

const NORMAL_WIDTH = 480
const NORMAL_HEIGHT = 270
const NORMAL_FRAME_MS = 1_000 / 30
const LOW_POWER_FRAME_MS = 1_000 / 18
const PRESSURE_FRAME_MS = 1_000 / 12
const MORPH_STEPS = 18

export type PsicoFantasmaStage = 'emergence' | 'observation' | 'attraction' | 'memory' | 'retreat' | 'settled'
export type PsicoFantasmaVariant = 'apparition' | 'double' | 'hesitation' | 'afterimage'
export type PsicoFantasmaTiming = {
  emergenceMs: number
  observationMs: number
  attractionMs: number
  memoryMs: number
  maxFigures: number
}

// Taratura per l'affinità geometrica di `shape.ts` (034-17, Opzione B): 1 =
// stessa Gestalt, ~0.3 = forme estranee. Il bar tiene il riconoscimento una
// minoranza (target di collaudo 20–40%, non quota runtime). Da ritarare a schermo.
export const PSICOFANTASMA_THRESHOLDS: RecognitionThresholds = {
  affinity: 0.7,
  margin: 0.05,
  structure: 0.34,
  persistenceMs: 1_250,
}

export function psicoFantasmaTiming(regime: BrainBioRegime | null): PsicoFantasmaTiming {
  if (regime === 'respiro-alto') return { emergenceMs: 650, observationMs: 900, attractionMs: 1_250, memoryMs: 1_700, maxFigures: 3 }
  if (regime === 'pressurized') return { emergenceMs: 750, observationMs: 1_000, attractionMs: 1_450, memoryMs: 1_900, maxFigures: 2 }
  if (regime === 'decompression') return { emergenceMs: 1_500, observationMs: 1_700, attractionMs: 3_100, memoryMs: 3_900, maxFigures: 2 }
  if (regime === 'respiro-profondo') return { emergenceMs: 2_200, observationMs: 2_500, attractionMs: 5_400, memoryMs: 6_500, maxFigures: 1 }
  return { emergenceMs: 1_500, observationMs: 1_700, attractionMs: 3_000, memoryMs: 3_600, maxFigures: 1 }
}

export function psicoFantasmaCompletion(affinity: number): number {
  if (affinity >= 0.9) return 0.92
  return Math.min(0.72, 0.46 + Math.max(0, affinity - PSICOFANTASMA_THRESHOLDS.affinity) * 0.9)
}

export function pickPsicoFantasmaVariant(seed: string): PsicoFantasmaVariant {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  const value = (hash >>> 0) % 100
  if (value < 58) return 'apparition'
  if (value < 78) return 'double'
  if (value < 88) return 'hesitation'
  return 'afterimage'
}

export function isPsicoFantasmaHesitation(decision: RecognitionDecision): boolean {
  return !decision.recognized
    && (decision.reason === 'affinity' || decision.reason === 'margin')
    && (decision.affinity ?? -1) >= PSICOFANTASMA_THRESHOLDS.affinity - 0.06
    && decision.structuralCoherence >= PSICOFANTASMA_THRESHOLDS.structure
    && decision.observedMs >= PSICOFANTASMA_THRESHOLDS.persistenceMs
    && (decision.margin ?? 0) > 0
}

export function advancePsicoFantasmaStage(
  stage: PsicoFantasmaStage,
  elapsedInStage: number,
  elapsedMs: number,
  audible: boolean,
  timing: PsicoFantasmaTiming,
  decision: RecognitionDecision | null,
  hesitation = false,
): { stage: PsicoFantasmaStage; elapsed: number } {
  if (!audible || stage === 'settled') return { stage, elapsed: elapsedInStage }
  const elapsed = elapsedInStage + Math.max(0, elapsedMs)
  const limit = stage === 'emergence' ? timing.emergenceMs
    : stage === 'observation' ? Math.max(timing.observationMs, PSICOFANTASMA_THRESHOLDS.persistenceMs)
      : stage === 'attraction' ? timing.attractionMs
        : stage === 'memory' ? timing.memoryMs : timing.emergenceMs
  if (elapsed < limit) return { stage, elapsed }
  if (stage === 'emergence') return { stage: 'observation', elapsed: 0 }
  if (stage === 'observation') return { stage: decision?.recognized || hesitation ? 'attraction' : 'retreat', elapsed: 0 }
  if (stage === 'attraction') return { stage: 'memory', elapsed: 0 }
  if (stage === 'memory') return { stage: 'retreat', elapsed: 0 }
  return { stage: 'settled', elapsed: 0 }
}

type PreparedFigure = {
  region: PsicoFantasmaRegion
  evidence: RecognitionEvidence
  coherence: number
  layers: HTMLCanvasElement[]
  completion: number
  stage: PsicoFantasmaStage
  elapsed: number
  decision: RecognitionDecision | null
  decisionLogged: boolean
}

type PreparedScene = {
  base: HTMLCanvasElement
  blurred: HTMLCanvasElement
  figures: PreparedFigure[]
  variant: PsicoFantasmaVariant
  continuity: { inherited: PsicoFantasmaFormTrace; past: HTMLCanvasElement; layers: HTMLCanvasElement[] } | null
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value))
}

function ease(value: number): number {
  const x = clamp(value)
  return x * x * (3 - 2 * x)
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function drawBitmapCover(context: CanvasRenderingContext2D, bitmap: ImageBitmap, width: number, height: number): void {
  const scale = Math.max(width / bitmap.width, height / bitmap.height)
  const sw = width / scale
  const sh = height / scale
  context.drawImage(bitmap, (bitmap.width - sw) / 2, (bitmap.height - sh) / 2, sw, sh, 0, 0, width, height)
}

function rasterCanvas(rgba: Uint8ClampedArray, width: number, height: number): HTMLCanvasElement {
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D non disponibile')
  const image = context.createImageData(width, height)
  image.data.set(rgba)
  context.putImageData(image, 0, 0)
  return canvas
}

const FEATHER_PX = 3

/** Sfuma i bordi della selezione: la maschera netta 0/255 diventa un'alpha
 * graduata su ~FEATHER_PX px così la figura si dissolve nel mondo sfocato
 * invece di leggersi come sticker ritagliato (brief §53). Il cuore resta
 * pieno; solo la fascia di bordo degrada. Usata solo per il compositing —
 * `region.mask`, `contour` e la coerenza strutturale restano netti. */
export function featherMask(mask: Uint8Array, width: number, height: number): Uint8Array {
  let field = Float32Array.from(mask, value => (value > 127 ? 255 : 0))
  for (let pass = 0; pass < FEATHER_PX; pass++) {
    const next = new Float32Array(field.length)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      let sum = 0, count = 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
        sum += field[ny * width + nx]; count++
      }
      next[y * width + x] = sum / count
    }
    field = next
  }
  const out = new Uint8Array(field.length)
  for (let i = 0; i < field.length; i++) out[i] = Math.round(field[i])
  return out
}

function buildMorphLayers(region: PsicoFantasmaRegion, canonical: Uint8ClampedArray | null,
  rgba: Uint8ClampedArray, width: number): HTMLCanvasElement[] {
    const targetMask = new Uint8Array(region.mask.length)
    const texture = new Uint8ClampedArray(region.mask.length * 4)
    for (let y = 0; y < region.height; y++) for (let x = 0; x < region.width; x++) {
      const index = y * region.width + x
      const side = Math.min(region.width, region.height)
      const left = (region.width - side) / 2
      const top = (region.height - side) / 2
      const cx = Math.floor((x + 0.5 - left) * 224 / side)
      const cy = Math.floor((y + 0.5 - top) * 224 / side)
      const target = cx >= 0 && cx < 224 && cy >= 0 && cy < 224
        && canonical && canonical[(cy * 224 + cx) * 4] < 128 ? 255 : 0
      targetMask[index] = canonical ? target : region.mask[index]
      const sourceIndex = ((region.y + y) * width + region.x + x) * 4
      texture.set(rgba.subarray(sourceIndex, sourceIndex + 4), index * 4)
    }
  return preparePsicoFantasmaDeformation(texture,
    featherMask(region.mask, region.width, region.height),
    featherMask(targetMask, region.width, region.height),
    region.width, region.height, canonical ? MORPH_STEPS : 2)
    .map(pixels => rasterCanvas(pixels, region.width, region.height))
}

const sceneCache = new WeakMap<Blob, Map<string, PreparedScene>>()
type SceneMemory = { figures: Pick<PreparedFigure, 'stage' | 'elapsed' | 'completion' | 'decision'>[];
  timing: PsicoFantasmaTiming; figureLimit: number; focusMs: number;
  carryElapsedMs: number; continuityOpacity: number | null }
// Small scalar snapshots survive destroyed instances; cached canvases remain weakly held.
const sceneMemory = new Map<string, SceneMemory>()

/** Prepared once for an image. The inherited shape is the reached deformation,
 * not the original photograph or a newly stamped canonical icon. */
function prepareContinuity(inherited: PsicoFantasmaFormTrace | null,
  figure: PreparedFigure | undefined, width: number, height: number, steps: number): PreparedScene['continuity'] {
  if (!inherited) return null
  const past = createCanvas(width, height), context = past.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas 2D non disponibile')
  const box = inherited.bbox
  context.globalAlpha = 1 - inherited.mix
  context.drawImage(inherited.lower, box.x * width, box.y * height, box.width * width, box.height * height)
  context.globalCompositeOperation = 'lighter'
  context.globalAlpha = inherited.mix
  context.drawImage(inherited.upper, box.x * width, box.y * height, box.width * width, box.height * height)
  context.globalAlpha = 1
  context.globalCompositeOperation = 'source-over'
  if (!figure?.evidence.candidate) return { inherited, past, layers: [] }
  const pixels = context.getImageData(0, 0, width, height).data
  context.clearRect(0, 0, width, height)
  context.drawImage(figure.layers[figure.layers.length - 1], figure.region.x, figure.region.y)
  const target = context.getImageData(0, 0, width, height).data
  context.clearRect(0, 0, width, height)
  const restored = context.createImageData(width, height)
  restored.data.set(pixels)
  context.putImageData(restored, 0, 0)
  const sourceMask = new Uint8Array(width * height), targetMask = sourceMask.slice()
  const texture = new Uint8ClampedArray(pixels)
  for (let i = 0; i < sourceMask.length; i++) {
    sourceMask[i] = pixels[i * 4 + 3]; targetMask[i] = target[i * 4 + 3]
    // Alpha is transported in the mask, not multiplied into itself twice.
    texture[i * 4 + 3] = 255
  }
  const frames = preparePsicoFantasmaDeformation(texture, sourceMask, targetMask, width, height, steps)
  frames.forEach((frame, step) => {
    const amount = step / (frames.length - 1)
    for (let i = 0; i < sourceMask.length; i++) if (target[i * 4 + 3]) {
      for (let c = 0; c < 3; c++) frame[i * 4 + c] = frame[i * 4 + c] * (1 - amount) + target[i * 4 + c] * amount
    }
  })
  return { inherited, past, layers: frames.map(frame => rasterCanvas(frame, width, height)) }
}

async function preparePsicoFantasmaScene(
  raster: Blob,
  width: number,
  height: number,
  frameId: string,
  figureBudget: number,
  signal: AbortSignal,
  inherited: PsicoFantasmaFormTrace | null,
): Promise<PreparedScene> {
  const key = `${width}x${height}:${frameId}:${figureBudget}`
  const bySize = sceneCache.get(raster) ?? new Map<string, PreparedScene>()
  sceneCache.set(raster, bySize)
  const cached = bySize.get(key)
  if (cached) return cached
  const preparation = (async () => {
    const started = performance.now()
    const repertoire = isPsicoFantasmaBundled() ? await loadBundledPsicoFantasmaRepertoire() : null
    const bitmap = await createImageBitmap(raster)
    try {
      const base = createCanvas(width, height)
      const baseContext = base.getContext('2d', { willReadFrequently: true })
      if (!baseContext) throw new Error('Canvas 2D non disponibile')
      drawBitmapCover(baseContext, bitmap, width, height)
      const rgba = baseContext.getImageData(0, 0, width, height).data
      const regions = extractPsicoFantasmaRegions(rgba, width, height, figureBudget)
      if (signal.aborted) throw new DOMException('Preparation interrupted', 'AbortError')
      const blurred = createCanvas(width, height)
      const blurredContext = blurred.getContext('2d')
      if (!blurredContext) throw new Error('Canvas 2D non disponibile')
      blurredContext.filter = `blur(${Math.max(5, Math.round(width / 80))}px)`
      blurredContext.drawImage(base, 0, 0)
      blurredContext.filter = 'none'
      const figures = regions.map((region, index): PreparedFigure => {
        const evidence: RecognitionEvidence = repertoire
          ? rankPsicoFantasma(describeRegionMask(region.mask, region.width, region.height), repertoire)
          : { candidate: null, secondAffinity: null, margin: null }
        const candidate = evidence.candidate
        const coherence = candidate ? psicoFantasmaStructuralCoherence(region, candidate.silhouette) : 0
        const layers = buildMorphLayers(region, candidate
          ? rasterizePsicoFantasmaSilhouette(candidate.silhouette) : null, rgba, width)
        return {
          region, evidence, coherence, layers,
          completion: candidate ? psicoFantasmaCompletion(candidate.affinity) : 0,
          stage: 'emergence', elapsed: -index * 700,
          decision: null, decisionLogged: false,
        }
      })
      brainPerformanceMetrics.recordArtworkPreparation(performance.now() - started)
      return { base, blurred, figures, variant: pickPsicoFantasmaVariant(frameId),
        continuity: prepareContinuity(inherited, figures[0], width, height, figureBudget === 1 ? 9 : MORPH_STEPS) }
    } finally {
      bitmap.close()
    }
  })()
  const result = await preparation
  bySize.set(key, result)
  return result
}

// PsicoFantasma non lascia mai il quadro senza una regione estratta dal mondo
// sfocato: retreat e settled decadono verso una presenza residente, mai a zero,
// per tutta la vita del renderer. Un riconoscimento riuscito conserva una
// traccia un poco più forte (memoria della deformazione).
export const RESIDENT_PRESENCE = 0.5

export function figureProgress(figure: PreparedFigure, timing: PsicoFantasmaTiming): { opacity: number; morph: number } {
  if (figure.stage === 'emergence') return { opacity: ease(figure.elapsed / timing.emergenceMs), morph: 0 }
  if (figure.stage === 'observation') return { opacity: 1, morph: 0 }
  if (figure.stage === 'attraction') return { opacity: 1, morph: ease(figure.elapsed / timing.attractionMs) * figure.completion }
  if (figure.stage === 'memory') return { opacity: 1, morph: figure.completion }
  const resident = figure.decision?.recognized ? RESIDENT_PRESENCE + 0.12 : RESIDENT_PRESENCE
  if (figure.stage === 'settled') return { opacity: resident, morph: figure.completion }
  return { opacity: 1 - (1 - resident) * ease(figure.elapsed / timing.emergenceMs), morph: figure.completion }
}

export function createBrainPsicoFantasmaScene(pluginContext: BrainRendererPluginContext): BrainSceneRendererController {
  const output = document.createElement('canvas')
  const configured = getBrainRenderingConfig().image
  output.width = Math.min(configured.width, NORMAL_WIDTH)
  output.height = Math.min(configured.height, NORMAL_HEIGHT)
  output.dataset.brainPsicoFantasma = 'preparing'
  output.setAttribute('aria-hidden', 'true')
  Object.assign(output.style, { position: 'absolute', inset: '0', width: '100%', height: '100%',
    display: 'block', pointerEvents: 'none', transform: 'translateZ(0)' })
  pluginContext.container.appendChild(output)
  const context = output.getContext('2d', { alpha: false })
  const scratch = createCanvas(output.width, output.height)
  const scratchContext = scratch.getContext('2d')
  let prepared: PreparedScene | null = null
  let failed = !context || !scratchContext
  let destroyed = false
  let resourcePressure = false
  let latestPerception: BrainBioPerceptionState | null = null
  let lastUpdateAt = Number.NaN
  let lastRenderAt = Number.NEGATIVE_INFINITY
  let restoredMemory = false
  let preparationStarted = false
  let preparationAbort: AbortController | null = null
  let offlineHold = false
  let focusMs = 0
  let activeTiming: PsicoFantasmaTiming | null = null
  let figureLimit = 1
  const memoryKey = `${pluginContext.scene.frameId}:${output.width}x${output.height}`
  const formFrame = beginPsicoFantasmaFormFrame(pluginContext.scene.frameId)
  let carryElapsedMs = 0
  let continuityOpacity: number | null = null

  const startPreparation = (lowPowerMode: boolean): void => {
    if (preparationStarted || resourcePressure || destroyed) return
    preparationStarted = true
    preparationAbort = new AbortController()
    void preparePsicoFantasmaScene(
      pluginContext.raster, output.width, output.height, pluginContext.scene.frameId,
      lowPowerMode ? 1 : 3, preparationAbort.signal, formFrame.inherited,
    ).then(result => {
      if (destroyed) return
      // Cached canvases/analysis are immutable; perceptual time is per controller.
      // Two crossfading instances must never advance the same closure state twice.
      const instance = {
        ...result,
        figures: result.figures.map(figure => ({
          ...figure,
          stage: figure.stage,
          elapsed: figure.elapsed,
          decision: figure.decision ? { ...figure.decision } : null,
          decisionLogged: false,
        })),
      }
      prepared = instance
      const remembered = sceneMemory.get(memoryKey)
      if (remembered) {
        instance.figures.forEach((figure, index) => {
          const saved = remembered.figures[index]
          if (saved) Object.assign(figure, saved, { decision: saved.decision ? { ...saved.decision } : null })
        })
        activeTiming = remembered.timing
        figureLimit = remembered.figureLimit
        focusMs = remembered.focusMs
        carryElapsedMs = remembered.carryElapsedMs
        continuityOpacity = remembered.continuityOpacity
      }
      restoredMemory = !!remembered
      output.dataset.brainPsicoFantasma = 'ready'
      output.dataset.brainPsicoFantasmaVariant = instance.variant
      output.dataset.brainPsicoFantasmaRepertoire = isPsicoFantasmaBundled() ? 'available' : 'absent-preview'
      if (!instance.figures.length) {
        output.dataset.brainPsicoFantasmaMatch0 = 'none:no-region'
        brainLog('render', 'PsicoFantasma: nessuna regione coerente; nessuna inferenza')
      }
    }).catch(error => {
      if (destroyed) return
      if (error instanceof DOMException && error.name === 'AbortError') {
        preparationStarted = false
        preparationAbort = null
        output.dataset.brainPsicoFantasma = 'paused-for-resource-pressure'
        return
      }
      failed = true
      output.dataset.brainPsicoFantasma = 'failed'
      brainWarn('render', 'PsicoFantasma non disponibile', { error })
    })
  }

  return {
    element: output,
    isReady: () => prepared !== null,
    hasFailed: () => failed,
    setOpacity(opacity) { output.style.opacity = String(clamp(opacity)) },
    getMorphShapes: () => [],
    setMorphPattern(pattern: BrainFrameMorphPattern) { output.dataset.brainMorphPattern = pattern },
    setResourcePressure(active) {
      resourcePressure = active
      output.dataset.brainResourcePressure = active ? 'true' : 'false'
      if (active && !prepared) preparationAbort?.abort()
    },
    setPerception(state) {
      latestPerception = state
      output.dataset.brainBioRegime = state.regime
    },
    setTransition() {},
    setOfflineHold(active) { offlineHold = active },
    update(
      bands: BandEnergies,
      settings: AppSettings,
      time: number,
      rhythm?: BrainRhythmState,
    ) {
      if (destroyed || failed || !context || !scratchContext) return
      startPreparation(settings.lowPowerMode)
      if (!prepared) return
      const elapsed = Number.isFinite(lastUpdateAt) ? Math.max(0, Math.min(250, time - lastUpdateAt)) : 0
      lastUpdateAt = time
      const audible = rhythm?.active !== false && (bands.low + bands.lowMid + bands.mid + bands.high > 0.008)
      // Keep the actual last pixels, including their optical accent, during silence/hold.
      if ((!audible || offlineHold) && Number.isFinite(lastRenderAt)) return
      const bandDrive = clamp(
        bands.low * 0.35 + bands.lowMid * 0.3 + bands.mid * 0.22 + bands.high * 0.13,
      )
      const accent = audible ? calculateRhythmicAccent(rhythm) : 0
      const beatKick = audible ? Math.min(1, (rhythm?.beatPulse ?? 0)) : 0
      // Il tempo percettivo avanza con l'energia continua e riceve una spinta
      // netta a ogni battito: il morph procede a scatti sulla musica, non a scorrimento.
      const perceptualElapsed = audible && !offlineHold
        ? elapsed * (0.85 + bandDrive * 1.3) + beatKick * 30
        : 0
      const regime = latestPerception?.regime ?? null
      const baseTiming = psicoFantasmaTiming(regime)
      const scene = prepared
      carryElapsedMs += perceptualElapsed
      decayPsicoFantasmaForm(formFrame.generation, perceptualElapsed)
      const inheritedOpacity = scene.continuity ? scene.continuity.inherited.opacity
        * Math.max(0, scene.continuity.inherited.remainingMs - carryElapsedMs) / PSICOFANTASMA_TRACE_MS : 0
      if (!activeTiming && audible && !offlineHold) {
        activeTiming = scene.variant === 'afterimage'
          ? { ...baseTiming, memoryMs: baseTiming.memoryMs * 1.8 } : baseTiming
        figureLimit = settings.lowPowerMode ? 1 : scene.variant === 'double' ? 2 : 1
      }
      const timing = activeTiming ?? baseTiming
      // Freeze the current episode's timing/count: regime switches cannot jump its geometry.
      focusMs = Math.min(1_000, focusMs + perceptualElapsed)
      const figures = scene.figures.slice(0, Math.min(timing.maxFigures, figureLimit))
      figures.forEach((figure, index) => {
        if (!audible || offlineHold || focusMs < 480) return
        const prospectiveObserved = figure.elapsed + perceptualElapsed
        if (figure.stage === 'observation') {
          figure.decision = decidePsicoFantasma(
            figure.evidence, figure.coherence, prospectiveObserved, PSICOFANTASMA_THRESHOLDS,
          )
        }
        const advanced = advancePsicoFantasmaStage(
          figure.stage, figure.elapsed, perceptualElapsed, audible, timing, figure.decision,
          scene.variant === 'hesitation' && figure.decision !== null
            && isPsicoFantasmaHesitation(figure.decision),
        )
        if (index === 0 && figure.stage === 'observation' && advanced.stage === 'attraction'
          && figure.decision?.recognized && scene.continuity?.layers.length && inheritedOpacity > 0) {
          continuityOpacity = inheritedOpacity
        }
        if (figure.stage === 'observation' && advanced.stage === 'retreat') figure.completion = 0
        figure.stage = advanced.stage
        figure.elapsed = advanced.elapsed
        if (scene.variant === 'hesitation' && figure.decision
          && isPsicoFantasmaHesitation(figure.decision)) {
          figure.completion = 0.12
        }
        if (figure.decision && figure.stage !== 'observation' && !figure.decisionLogged) {
          figure.decisionLogged = true
          output.dataset[`brainPsicoFantasmaMatch${index}`] = figure.decision.recognized
            ? `${figure.decision.archetype}:${figure.decision.affinity?.toFixed(3)}`
            : `none:${figure.decision.reason}:${figure.decision.affinity?.toFixed(3) ?? 'n/a'}`
          brainLog('render', 'PsicoFantasma: decisione riconoscimento', figure.decision)
        }
      })
      if (activeTiming) {
        sceneMemory.delete(memoryKey)
        sceneMemory.set(memoryKey, { timing: activeTiming, figureLimit, focusMs, carryElapsedMs, continuityOpacity,
          figures: scene.figures.map(({ stage, elapsed, completion, decision }) =>
            ({ stage, elapsed, completion, decision: decision ? { ...decision } : null })) })
        if (sceneMemory.size > 24) sceneMemory.delete(sceneMemory.keys().next().value!)
      }
      const interval = resourcePressure ? PRESSURE_FRAME_MS : settings.lowPowerMode ? LOW_POWER_FRAME_MS : NORMAL_FRAME_MS
      if (time - lastRenderAt < interval) return
      lastRenderAt = time
      context.globalAlpha = 1
      output.dataset.brainPsicoFantasmaMemory = restoredMemory ? 'restored' : 'new'
      output.dataset.brainPsicoFantasmaStages = figures.map(figure => figure.stage).join(',')
      context.drawImage(scene.base, 0, 0)
      // Il mondo perde fuoco al ritmo della musica: minimo legato all'energia
      // continua, scatto marcato su ogni battito. Ampiezza percepibile, non un
      // ritocco — la separazione resta ottica (nessun colore, nessun halo).
      const focusRamp = ease(focusMs / 1_000)
      // Respiro continuo del tempo percettivo: niente resta immobile fra un
      // battito e l'altro. Si ferma nel silenzio insieme a `carryElapsedMs`.
      const breath = 0.5 + 0.5 * Math.sin(carryElapsedMs / 620)
      // Floor percettivo: appena la scena è pronta il fondo perde già fuoco,
      // non si aspetta la rampa completa (brief §22/§54). Poi sale con l'audio.
      const worldDefocus = clamp((0.2 + 0.8 * focusRamp)
        * (0.42 + bandDrive * 0.4 + accent * 0.34 + breath * 0.13))
      context.globalAlpha = worldDefocus
      context.drawImage(scene.blurred, 0, 0)
      if (scene.continuity && continuityOpacity === null && inheritedOpacity > 0) {
        context.globalAlpha = inheritedOpacity
        context.drawImage(scene.continuity.past, 0, 0)
      }
      output.dataset.brainPsicoFantasmaTrace = scene.continuity
        ? `${scene.continuity.inherited.silhouette.archetype}:${continuityOpacity !== null ? 'morph' : inheritedOpacity > 0 ? 'decay' : 'expired'}`
        : 'none'
      // Separazione ottica locale della figura: si "assesta avanti" a ogni
      // battito e ridecade nel fondo sfocato fra un colpo e l'altro — mai sotto
      // una presenza minima (034-19).
      // La figura non resta ferma: respira in controfase col fondo (quando il
      // mondo va in blur lei si assesta indietro di poco) e riceve una
      // scossa breve sul battito — leggera, visibile, mai violenta.
      const beatPresence = clamp(0.5 + 0.4 * Math.min(1, accent) + 0.13 * bandDrive + (1 - breath) * 0.09)
      const settle = 1 - (Math.min(1, accent) * 0.045 + breath * 0.02)
      const shakeAmplitude = Math.min(1, accent) * 2.4
      const shakeX = Math.sin(carryElapsedMs / 24) * shakeAmplitude
      const shakeY = Math.cos(carryElapsedMs / 29) * shakeAmplitude * 0.7
      let retainedThisFrame = false
      figures.forEach((figure, index) => {
        const visual = figureProgress(figure, timing)
        if (visual.opacity <= 0) return
        const bridge = index === 0 && continuityOpacity !== null && scene.continuity
        if (bridge && visual.morph < figure.completion) {
          // Continue the already visible current figure while the inherited
          // deformation takes over; recognizing must not cut away its raster.
          context.globalAlpha = clamp(visual.opacity * beatPresence
            * (1 - visual.morph / Math.max(0.001, figure.completion)))
          context.drawImage(figure.layers[0], figure.region.x, figure.region.y)
        }
        const layers = bridge ? bridge.layers : figure.layers
        const box = bridge ? { x: 0, y: 0, width: output.width, height: output.height } : figure.region
        const shakeGain = bridge ? 0.4 : 1
        const drawWidth = box.width * settle
        const drawHeight = box.height * settle
        const drawX = box.x + (box.width - drawWidth) / 2 + shakeX * shakeGain
        const drawY = box.y + (box.height - drawHeight) / 2 + shakeY * shakeGain
        const position = visual.morph * (layers.length - 1)
        const lower = Math.floor(position), fraction = position - lower
        const local = scratchContext
        local.clearRect(0, 0, scratch.width, scratch.height)
        local.globalCompositeOperation = 'source-over'
        local.globalAlpha = 1 - fraction
        local.drawImage(layers[lower], 0, 0)
        local.globalCompositeOperation = 'lighter'
        local.globalAlpha = fraction
        local.drawImage(layers[Math.min(lower + 1, layers.length - 1)], 0, 0)
        local.globalCompositeOperation = 'source-over'
        local.globalAlpha = 1
        const opacity = bridge ? continuityOpacity! * (1 - visual.morph) + clamp(visual.opacity * beatPresence) * visual.morph
          : clamp(visual.opacity * beatPresence)
        context.globalAlpha = opacity
        context.drawImage(scratch, 0, 0, box.width, box.height, drawX, drawY, drawWidth, drawHeight)
        // Sul colpo forte una seconda passata (stesso source-over, nessun
        // colore) porta la figura al pieno contatto ottico col fondo.
        const secondOpacity = accent > 0.3 ? clamp(visual.opacity * (accent - 0.3) * 0.7) * (bridge ? visual.morph : 1) : 0
        if (secondOpacity > 0) {
          context.globalAlpha = secondOpacity
          context.drawImage(scratch, 0, 0, box.width, box.height, drawX, drawY, drawWidth, drawHeight)
        }
        if (!retainedThisFrame && figure.decision?.recognized && figure.evidence.candidate && visual.morph > 0) {
          retainedThisFrame = true
          retainPsicoFantasmaForm(formFrame.generation, {
            frameId: pluginContext.scene.frameId, silhouette: figure.evidence.candidate.silhouette,
            completion: visual.morph, bbox: { x: box.x / output.width, y: box.y / output.height,
              width: box.width / output.width, height: box.height / output.height },
            lower: layers[lower], upper: layers[Math.min(lower + 1, layers.length - 1)], mix: fraction,
            opacity: opacity + secondOpacity * (1 - opacity), remainingMs: PSICOFANTASMA_TRACE_MS,
          })
        }
      })
      context.globalAlpha = 1
    },
    destroy() {
      destroyed = true
      preparationAbort?.abort()
      output.remove()
      prepared = null
    },
  }
}
