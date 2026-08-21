import type { AppSettings, BandEnergies } from '@shared/types'
import type { BrainRendererPluginContext } from './brainRendererPlugin'
import {
  calculateRhythmicAccent,
  type BrainRhythmState,
} from './brainRhythm'
import type { BrainFlashState, BrainSceneRendererController } from './brainSvgScene'
import { getBrainRenderingConfig } from './brainRenderingConfig'
import { brainLog, brainWarn } from './brainLog'
import { brainPerformanceMetrics } from './brainPerformanceMetrics'
import { BrainCanvasMotionSmoother } from './brainCanvasMotionSmoother'

// Glitch Morph: contorni di luminanza che ridisegnano il raster con linee
// sottili, iridescenti, il cui spostamento verticale segue il profilo di
// luminanza dell'immagine (vedi working/plans/piano-035-glitch-morph-renderer.md
// per l'analisi e l'anteprima interattiva approvate dallo sviluppatore).
// Check Materia: il raster resta SEMPRE il livello di base, attenuato ma
// visibile fra una linea e l'altra — non sostituito da un fondo nero.

const NORMAL_WIDTH = 480
const NORMAL_HEIGHT = 270
const LOW_POWER_WIDTH = 320
const LOW_POWER_HEIGHT = 180
const NORMAL_FRAME_INTERVAL_MS = 1_000 / 30
const LOW_POWER_FRAME_INTERVAL_MS = 1_000 / 20
const PRESSURE_FRAME_INTERVAL_MS = 1_000 / 12
const SILENT_BANDS: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }

// Budget di geometria per frame allineato agli altri renderer Canvas2D
// (Dream Segmentation limita filamenti/regioni a 14-18, non centinaia): la
// prima versione usava 72 righe × 140 colonne, ~20.000 segmenti di
// tracciato per frame più altrettante allocazioni di oggetti {x,y} — un
// carico sul thread principale abbastanza pesante da far percepire
// rallentato/meno reattivo l'intero programma, non solo questo renderer
// (segnalato dallo sviluppatore). Check Costo.
const NORMAL_ROWS = 30
const LOW_POWER_ROWS = 20
const PRESSURE_ROWS = 14
const PROFILE_COLS = 64

const RASTER_OPACITY = 0.64
const DARKENING_VEIL_OPACITY = 0.08
const RIPPLE_MAX_PX = 2.2
const RIPPLE_SPEED = 1.1
const FRINGE_MAX_PX = 1.6
// Ampiezza del rilievo (frazione dell'altezza canvas): la linea traccia il
// profilo di luminanza dell'immagine, non un'onda indipendente — a riposo
// resta moderata per restare leggibile come contorno del raster; il
// termine `TERRAIN_BEAT_RATIO` la fa sollevare marcatamente ad ogni
// battito, così il rilievo è visibilmente sincronizzato con la musica
// (segnalato dallo sviluppatore: "non ha sync con il beat").
const TERRAIN_BASE_RATIO = 0.09
const TERRAIN_BEAT_RATIO = 0.16
// Indizio di profondità economico (nessuna libreria 3D, solo Canvas2D
// coerente col resto dei renderer Brain): le righe più vicine al bordo
// inferiore sono leggermente più spesse e più opache, quelle in alto più
// sottili e tenui — basta a leggersi come un rilievo, non come righe
// scollegate fra loro.
const DEPTH_WIDTH_RANGE = [0.7, 1.5] as const
const DEPTH_ALPHA_RANGE = [0.82, 1.08] as const

type GlitchRowSeed = {
  phase: number
  fringeDir: -1 | 1
}

type GlitchProfile = {
  rows: number
  cols: number
  luminance: Float32Array
  rowAverage: Float32Array
  seeds: GlitchRowSeed[]
}

type PreparedGlitchSource = {
  base: HTMLCanvasElement
  profile: GlitchProfile
}

export type GlitchMotion = {
  activity: number
  beat: number
  high: number
  tension: number
  flash: number
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value))
}

// Hash deterministico: stessa riga, stesso seme, finché non cambia la
// sorgente — la trama non deve tremare da un frame all'altro (coerente con
// il pattern già usato in Dream Segmentation per le diramazioni).
function hashUnit(index: number, salt: number): number {
  let h = (Math.round(index * 131) ^ Math.imul(salt, 2654435761)) | 0
  h = Math.imul(h ^ (h >>> 15), 2246822519)
  h ^= h >>> 13
  return ((h >>> 0) % 1000) / 1000
}

export function computeRowSeed(rowIndex: number): GlitchRowSeed {
  return {
    phase: hashUnit(rowIndex, 7) * Math.PI * 2,
    fringeDir: hashUnit(rowIndex, 17) < 0.5 ? -1 : 1,
  }
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

export function buildGlitchProfile(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  rows: number,
  cols: number,
): GlitchProfile {
  const luminance = new Float32Array(rows * cols)
  const rowAverage = new Float32Array(rows)
  for (let r = 0; r < rows; r += 1) {
    const y = Math.min(height - 1, Math.floor(((r + 0.5) * height) / rows))
    let sum = 0
    for (let c = 0; c < cols; c += 1) {
      const x = Math.min(width - 1, Math.floor(((c + 0.5) * width) / cols))
      const idx = (y * width + x) * 4
      const lum = (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255
      luminance[r * cols + c] = lum
      sum += lum
    }
    rowAverage[r] = sum / cols
  }
  const seeds: GlitchRowSeed[] = []
  for (let r = 0; r < rows; r += 1) seeds.push(computeRowSeed(r))
  return { rows, cols, luminance, rowAverage, seeds }
}

const glitchSourceCache = new WeakMap<Blob, Map<string, Promise<PreparedGlitchSource>>>()

async function prepareGlitchSource(
  raster: Blob,
  width: number,
  height: number,
  rows: number,
): Promise<PreparedGlitchSource> {
  const resolutionKey = `${width}x${height}:${rows}`
  const cachedByResolution = glitchSourceCache.get(raster) ?? new Map()
  glitchSourceCache.set(raster, cachedByResolution)
  const cached = cachedByResolution.get(resolutionKey)
  if (cached) return cached

  const preparation = (async () => {
    const startedAt = performance.now()
    const bitmap = await createImageBitmap(raster)
    try {
      const base = createCanvas(width, height)
      const context = base.getContext('2d', { willReadFrequently: true })
      if (!context) throw new Error('Canvas 2D non disponibile')
      drawBitmapCover(context, bitmap, width, height)
      const rgba = context.getImageData(0, 0, width, height).data
      const profile = buildGlitchProfile(rgba, width, height, rows, PROFILE_COLS)
      const prepared: PreparedGlitchSource = { base, profile }
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

// Soglie unificate fra tutti i renderer Brain (in precedenza ogni file
// aveva la propria versione con drift casuale — segnalato dallo
// sviluppatore come "soglie a cazzo"): stessa formula, stessi numeri
// ovunque, leggermente più reattiva della media osservata prima.
function bandDrive(value: number, average: number | undefined, transient: number): number {
  const baseline = Math.max(0.018, average ?? value * 0.82)
  const sustained = clamp((value - 0.006) / 0.4)
  const lift = clamp((value - baseline) / (baseline * 0.8 + 0.024))
  return clamp(sustained * 0.6 + lift * 0.3 + transient * 0.44)
}

export function calculateGlitchMotion(
  bands: BandEnergies,
  settings: AppSettings,
  rhythm?: BrainRhythmState,
  movingAverages?: BandEnergies,
  flash?: BrainFlashState,
): GlitchMotion {
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
  const sensitivity = 0.76 + clamp(settings.sensitivity) * 0.44
  const scale = profile * sensitivity * (settings.softMode ? 0.72 : 1)
  const flashDrive = flash?.active ? clamp(flash.intensity) : 0
  const activity = clamp((low * 0.26 + lowMid * 0.26 + mid * 0.24 + high * 0.24) * scale)
  const beat = calculateRhythmicAccent(rhythm) * clamp(0.3 + activity * 0.82 + high * 0.3)
  const tension = clamp((low * 0.5 + lowMid * 0.5) * scale)
  return { activity, beat, high, tension, flash: flashDrive }
}

export function shouldRenderGlitchFrame(
  motion: GlitchMotion,
  transitionChanged: boolean,
  signatureChanged: boolean,
): boolean {
  return motion.activity > 0.004 || motion.beat > 0.004 || motion.flash > 0.004 ||
    transitionChanged || signatureChanged
}

/**
 * Increspatura sottile SOPRA il contorno di luminanza (mai la sua base):
 * stessa velocità condivisa fra tutte le righe, solo la fase varia per
 * riga — abbastanza per non sembrare un'unica onda rigida, non abbastanza
 * da rompere la coerenza della superficie (una frequenza indipendente per
 * riga faceva leggere il rilievo come rumore scollegato dal raster,
 * segnalato dallo sviluppatore). Check Silenzio: senza audio attivo la
 * linea resta ferma sul contorno di luminanza puro.
 */
export function computeLineWobble(
  t: number,
  seed: GlitchRowSeed,
  x: number,
  amplitudePx: number,
  beatBoost: number,
  audioActive: boolean,
): number {
  if (!audioActive || amplitudePx <= 0) return 0
  return Math.sin(t * RIPPLE_SPEED + seed.phase + x * 0.012) * amplitudePx * (1 + beatBoost * 0.6)
}

/**
 * Tonalità iridescente della riga: dipende solo da luminanza e seme della
 * riga (stabile), mai dal tempo — un colore che deriva da solo, senza
 * musica, violerebbe il Check Silenzio.
 */
export function computeRowHue(rowAverageLuminance: number, seed: GlitchRowSeed): number {
  return 172 + rowAverageLuminance * 46 + (seed.phase / (Math.PI * 2)) * 18
}

export function createBrainGlitchMorphScene(
  pluginContext: BrainRendererPluginContext,
): BrainSceneRendererController {
  const outputCanvas = document.createElement('canvas')
  const configured = getBrainRenderingConfig().image
  outputCanvas.width = Math.min(configured.width, NORMAL_WIDTH)
  outputCanvas.height = Math.min(configured.height, NORMAL_HEIGHT)
  outputCanvas.dataset.brainRenderer = 'glitch-morph'
  outputCanvas.dataset.glitchMorph = 'preparing'
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
  let clockMs = 0
  const motionSmoother = new BrainCanvasMotionSmoother()
  let prepared: PreparedGlitchSource | null = null
  // Buffer riusato per i punti di ogni riga: evita di allocare ~(righe ×
  // colonne) oggetti {x,y} ad ogni frame (pressione sul garbage collector
  // trascurabile per un singolo renderer, ma non gratuita su un ciclo a
  // 30fps condiviso con tutto il resto del programma).
  const pointsX = new Float32Array(PROFILE_COLS + 1)
  const pointsY = new Float32Array(PROFILE_COLS + 1)

  const prepare = (lowPowerMode: boolean): void => {
    if (preparationStarted || destroyed) return
    preparationStarted = true
    const lightweight = lowPowerMode || resourcePressure
    const width = lightweight ? LOW_POWER_WIDTH : NORMAL_WIDTH
    const height = lightweight ? LOW_POWER_HEIGHT : NORMAL_HEIGHT
    const rows = resourcePressure ? PRESSURE_ROWS : lowPowerMode ? LOW_POWER_ROWS : NORMAL_ROWS
    outputCanvas.width = width
    outputCanvas.height = height
    context = outputCanvas.getContext('2d', { alpha: false })
    void prepareGlitchSource(pluginContext.raster, width, height, rows)
      .then((result) => {
        if (destroyed) return
        prepared = result
        outputCanvas.dataset.glitchMorph = 'ready'
        brainLog('render', 'Glitch Morph preparato', {
          frameId: pluginContext.scene.frameId,
          righe: result.profile.rows,
          risoluzione: `${width}x${height}`,
        })
      })
      .catch((error) => {
        if (destroyed) return
        failed = true
        outputCanvas.dataset.glitchMorph = 'failed'
        brainWarn('render', 'Glitch Morph non preparato', {
          frameId: pluginContext.scene.frameId,
          error,
        })
      })
  }

  return {
    element: outputCanvas,
    isReady: () => prepared !== null,
    hasFailed: () => failed,
    setOpacity(opacity) {
      outputCanvas.style.opacity = String(clamp(opacity))
    },
    getMorphShapes: () => [],
    setMorphPattern(pattern) {
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
      if (!prepared) return

      const motionElapsed = Number.isFinite(lastMotionAt) ? Math.max(0, time - lastMotionAt) : 16
      lastMotionAt = time
      clockMs += motionElapsed
      const rawMotion = calculateGlitchMotion(bands, settings, rhythm, movingAverages, flash)
      const smoothMotion = motionSmoother.update(
        {
          low: rawMotion.tension,
          lowMid: 0,
          mid: 0,
          high: rawMotion.high,
          activity: rawMotion.activity,
          beat: rawMotion.beat,
        },
        motionElapsed,
        rhythm?.beatDurationMs ?? 500,
        rhythm?.active ?? (rawMotion.activity > 0),
        settings.motionProfile,
      )
      const motion: GlitchMotion = {
        activity: smoothMotion.activity,
        beat: Math.max(rawMotion.beat, smoothMotion.beat),
        high: smoothMotion.high,
        tension: smoothMotion.low,
        flash: rawMotion.flash,
      }
      const audioActive = rhythm?.active ?? rawMotion.activity > 0

      const transitionChanged =
        !Number.isFinite(previousTransitionProgress) ||
        Math.abs(transitionProgress - previousTransitionProgress) >= 0.001
      const signature = [
        transitionRole,
        Math.round(transitionProgress * 120),
        Math.round(motion.activity * 40),
        Math.round(motion.beat * 30),
        Math.round(motion.high * 30),
        rhythm?.beatIndex ?? 0,
        settings.lowPowerMode ? 1 : 0,
        resourcePressure ? 1 : 0,
      ].join(':')
      const signatureChanged = signature !== lastSignature
      if (!shouldRenderGlitchFrame(motion, transitionChanged, signatureChanged)) return

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
      const { profile } = prepared
      context.clearRect(0, 0, width, height)

      // Check Materia: il raster è il livello di base, attenuato per far
      // risaltare le linee ma sempre visibile fra l'una e l'altra.
      context.globalCompositeOperation = 'source-over'
      context.globalAlpha = RASTER_OPACITY
      context.drawImage(prepared.base, 0, 0, width, height)
      context.globalAlpha = 1
      context.globalCompositeOperation = 'multiply'
      context.globalAlpha = DARKENING_VEIL_OPACITY
      context.fillStyle = '#05050a'
      context.fillRect(0, 0, width, height)
      context.globalAlpha = 1

      const rowH = height / profile.rows
      // Il rilievo sale marcatamente ad ogni battito (`motion.beat` è già un
      // accento ritmico con attacco/decadimento, non un valore piatto) —
      // questo è ciò che rende il rilievo percepibile come sincronizzato
      // alla musica, non solo un'onda a sé stante.
      const terrainAmplitude = height * (TERRAIN_BASE_RATIO + TERRAIN_BEAT_RATIO * motion.beat)
      const rippleAmplitude = RIPPLE_MAX_PX * (0.3 + motion.high * 0.5 + motion.beat * 0.3)
      const fringeIntensity = clamp(motion.beat * 0.8 + motion.high * 0.3)
      const t = clockMs / 1000

      context.globalCompositeOperation = 'lighter'

      for (let r = 0; r < profile.rows; r += 1) {
        const seed = profile.seeds[r]
        const y0 = (r + 0.5) * rowH
        const rowOffset = r * profile.cols
        // Profondità economica: righe verso il basso più spesse/opache
        // (più vicine), verso l'alto più sottili/tenui (più lontane) — il
        // rilievo si legge come una superficie, non come righe scollegate.
        const depthT = profile.rows > 1 ? r / (profile.rows - 1) : 0
        context.lineWidth = DEPTH_WIDTH_RANGE[0] +
          (DEPTH_WIDTH_RANGE[1] - DEPTH_WIDTH_RANGE[0]) * depthT
        const depthAlpha = DEPTH_ALPHA_RANGE[0] +
          (DEPTH_ALPHA_RANGE[1] - DEPTH_ALPHA_RANGE[0]) * depthT

        for (let c = 0; c <= profile.cols; c += 1) {
          const cc = Math.min(profile.cols - 1, c)
          const lum = profile.luminance[rowOffset + cc]
          const x = (c / profile.cols) * width
          const wobble = computeLineWobble(t, seed, x, rippleAmplitude, motion.beat, audioActive)
          // Il rilievo (`terrainAmplitude`) è sempre presente, derivato solo
          // dalla luminanza dell'immagine: è la mappa che ricalca il
          // raster, statica senza musica (Check Silenzio). Il wobble è
          // solo un'increspatura sottile sopra, mai la base della forma.
          pointsX[c] = x
          pointsY[c] = y0 + (lum - 0.5) * terrainAmplitude + wobble
        }

        const hue = computeRowHue(profile.rowAverage[r], seed)
        const baseAlpha = clamp(0.48 * (0.7 + profile.rowAverage[r] * 0.3) * depthAlpha)
        context.strokeStyle = `hsla(${hue},72%,54%,${baseAlpha})`
        context.beginPath()
        for (let c = 0; c <= profile.cols; c += 1) {
          if (c === 0) context.moveTo(pointsX[c], pointsY[c])
          else context.lineTo(pointsX[c], pointsY[c])
        }
        context.stroke()

        if (fringeIntensity > 0.02) {
          const dx = seed.fringeDir * FRINGE_MAX_PX * fringeIntensity
          const fringeHue = hue + 130 * seed.fringeDir
          context.strokeStyle = `hsla(${fringeHue},80%,60%,${baseAlpha * 0.4 * fringeIntensity})`
          context.beginPath()
          for (let c = 0; c <= profile.cols; c += 1) {
            if (c === 0) context.moveTo(pointsX[c] + dx, pointsY[c])
            else context.lineTo(pointsX[c] + dx, pointsY[c])
          }
          context.stroke()
        }
      }

      context.globalCompositeOperation = 'source-over'
      context.globalAlpha = 1
      outputCanvas.dataset.glitchMorphActivity = motion.activity.toFixed(3)
      outputCanvas.dataset.glitchMorphTransition =
        `${transitionRole}-${transitionProgress.toFixed(3)}`
      brainPerformanceMetrics.recordCanvasFrame(
        time,
        resourcePressure,
        performance.now() - renderStartedAt,
      )
    },
    destroy() {
      destroyed = true
      prepared = null
      motionSmoother.reset()
      outputCanvas.width = 1
      outputCanvas.height = 1
      outputCanvas.remove()
    },
  }
}
