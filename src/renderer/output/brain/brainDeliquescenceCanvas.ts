import type { AppSettings, BandEnergies } from '@shared/types'
import type { BrainRhythmState } from './brainRhythm'
import type {
  BrainRendererPluginContext,
  BrainRendererImageSource,
} from './brainRendererPlugin'
import type { BrainSceneRendererController, BrainFlashState } from './brainSvgScene'
import type { BrainFrameMorphPattern } from './brainFrameMotion'
import type { BrainBioPerceptionState } from './brainBioPerception'
import { brainBioLocalMotionScale } from './brainBioVisualResponse'
import { calculateRhythmicAccent } from './brainRhythm'
import { BrainCanvasMotionSmoother } from './brainCanvasMotionSmoother'
import { getBrainRenderingConfig } from './brainRenderingConfig'
import { brainLog, brainWarn } from './brainLog'
import { brainPerformanceMetrics } from './brainPerformanceMetrics'

// DELIQUESCENCE — riscrittura attorno al CAMPO DI OCCUPAZIONE (spec
// team/briefs/brief-deliquescence-specifica.md §3bis, §10 passo 3).
//
// CORREZIONE VISUAL VINCOLANTE (§1bis): il fenomeno dominante è **il bordo
// che perde la capacità di contenere la figura**, non la materia interna.
// Non un mesh-warp del raster (= "Material-Morph scuro"): il bordo è la
// soglia di un campo di occupazione a media risoluzione, deformato da una
// griglia di nodi con **offset persistente**. Strozzatura, perdita di
// segmenti, fusione emergono come topologia dalla soglia del campo, senza
// ri-triangolazione. Ogni cedimento lascia una conseguenza (accumulo nello
// store fuori istanza). Il colore accompagna e **cola verso il basso**
// (gravità reale, solo colore).

const NORMAL_WIDTH = 320
const NORMAL_HEIGHT = 180
const LOW_POWER_WIDTH = 240
const LOW_POWER_HEIGHT = 135
const NORMAL_FRAME_INTERVAL_MS = 1_000 / 24
const LOW_POWER_FRAME_INTERVAL_MS = 1_000 / 15
const PRESSURE_FRAME_INTERVAL_MS = 1_000 / 12

const OCC_COLS = 96
const OCC_ROWS = 54
// Griglia di warp del RASTER (non solo della maschera): le zone di colore
// devono scivolare visibilmente lungo il campo di nodi (collaudo negativo
// 2026-08-31 — il warp della sola maschera non si leggeva a schermo).
const WARP_COLS = 22
const WARP_ROWS = 13
const NODE_COLS = 24
const NODE_ROWS = 14

const TIDE_TAU_MS = 4_000
const PHASE_BASE_RATE = 1 / 90_000
const PHASE_ACTIVITY_GAIN = 1 / 26_000
const SILENCE_ACTIVITY_FLOOR = 0.004

// Collasso dei nodi: il sostegno si consuma, poi cede di scatto (cedimento).
// Tarato perché il Test 1 Visual passi entro pochi secondi per OGNI modo di
// collasso: il primo cedimento cade ~3s, poi si ripetono.
const SUPPORT_DECAY_PER_MS = 1 / 4_500
const GIVE_MAGNITUDE_CELLS = 1.35 // in celle-occ per cedimento pieno
const NODE_DRIFT_PER_MS = 1 / 15_000
const MAX_NODE_OFFSET_CELLS = 7
const ATTRACTOR_RECLAIM_PER_MS = 1 / 2_600
const EROSION_RATE_PER_MS = 1 / 5_000

const SILENT_BANDS: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }

// --- Modi di collasso (spec §9) — vettori di parametri, non 8 renderer ----
export type DeliquescenceCollapseMode =
  | 'SAG'
  | 'IMPLOSION'
  | 'BLEED'
  | 'FUSION'
  | 'EROSION'
  | 'COAGULATION'
  | 'HOLLOW'
  | 'SLUMP'

type CollapseParams = {
  /** peso della componente verso/da il centroide (positivo = implosione). */
  centroidPull: number
  /** peso della componente verticale (gravità psichica del cedimento). */
  downBias: number
  /** guadagno del campo di erosione (segmenti persi). Negativo = ricompone. */
  erosionGain: number
  /** dispersione casuale della direzione del cedimento. */
  jitter: number
}

const COLLAPSE_MODES: Record<DeliquescenceCollapseMode, CollapseParams> = {
  SAG: { centroidPull: 0.1, downBias: 0.9, erosionGain: 0.35, jitter: 0.35 },
  IMPLOSION: { centroidPull: 1, downBias: 0.1, erosionGain: 0.3, jitter: 0.25 },
  BLEED: { centroidPull: -0.85, downBias: 0.15, erosionGain: 0.15, jitter: 0.4 },
  FUSION: { centroidPull: 0.55, downBias: 0.1, erosionGain: 0.2, jitter: 0.6 },
  EROSION: { centroidPull: 0.15, downBias: 0.25, erosionGain: 0.75, jitter: 0.5 },
  COAGULATION: { centroidPull: 0.7, downBias: 0.1, erosionGain: -0.5, jitter: 0.3 },
  HOLLOW: { centroidPull: -0.4, downBias: 0.2, erosionGain: 0.55, jitter: 0.45 },
  SLUMP: { centroidPull: 0.05, downBias: 1, erosionGain: 0.3, jitter: 0.5 },
}
const COLLAPSE_MODE_LIST = Object.keys(COLLAPSE_MODES) as DeliquescenceCollapseMode[]

export function pickCollapseMode(seed: string): DeliquescenceCollapseMode {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return COLLAPSE_MODE_LIST[(hash >>> 0) % COLLAPSE_MODE_LIST.length]
}

// --- Helper puri (testabili) ---------------------------------------------

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value))
}

export function deliquescenceTonemap(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  const lum = clamp((0.299 * r + 0.587 * g + 0.114 * b) / 255)
  const shaped = Math.pow(lum, 1.35)
  // Disposizione del Capo Supremo (2026-09-07): difetto aperto — figura e
  // contorno quasi neri su nero, raster praticamente assente. Pavimenti neri
  // 10/12/18 → 26/24/34 e gate luminanza `0.7 + lum·0.3` → `0.8 + lum·0.2`:
  // si recupera leggibilità restando nella gamma bassa, il collasso della
  // forma non si attenua.
  const gate = 0.8 + lum * 0.2
  return [
    Math.round((26 + shaped * 120) * gate),
    Math.round((24 + shaped * 74) * gate),
    Math.round((34 + shaped * 96) * gate),
  ]
}

/** Campo di rumore lento e continuo su (x, y, phase). 0..1. */
export function deliquescenceNoise(x: number, y: number, phase: number): number {
  const p = phase * Math.PI * 2
  const n =
    Math.sin(x * 1.7 + p) * 0.5 +
    Math.sin(y * 2.3 - p * 0.66) * 0.3 +
    Math.sin((x + y) * 1.13 + p * 0.42) * 0.2
  return 0.5 + 0.5 * clamp(n, -1, 1)
}

export function advanceDeliquescenceTide(
  previous: number,
  target: number,
  elapsedMs: number,
): number {
  const alpha = 1 - Math.exp(-Math.max(0, elapsedMs) / TIDE_TAU_MS)
  return clamp(previous + (clamp(target) - previous) * alpha)
}

/** Fase metabolica: avanza SOLO con audio attivo (Check Silenzio). */
export function advanceDeliquescencePhase(
  phase: number,
  activity: number,
  elapsedMs: number,
): number {
  if (activity <= SILENCE_ACTIVITY_FLOOR) return ((phase % 1) + 1) % 1
  const delta = Math.max(0, elapsedMs) * (PHASE_BASE_RATE + activity * PHASE_ACTIVITY_GAIN)
  return ((phase + delta) % 1 + 1) % 1
}

/**
 * Campo di occupazione: `occ[i] ∈ [0,1]`, 1 = figura piena, 0 = fondo, la
 * fascia intermedia È il bordo. Scarto di luminanza dalla media globale,
 * normalizzato, poi due passate di box-blur perché la fascia di bordo sia
 * un gradiente reale e non un salto binario.
 */
export function estimateOccupationField(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  cols: number,
  rows: number,
): Float32Array {
  const field = new Float32Array(cols * rows)
  const cellW = width / cols
  const cellH = height / rows
  let globalSum = 0
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      let sum = 0
      let count = 0
      const x0 = Math.floor(col * cellW)
      const x1 = Math.max(x0 + 1, Math.floor((col + 1) * cellW))
      const y0 = Math.floor(row * cellH)
      const y1 = Math.max(y0 + 1, Math.floor((row + 1) * cellH))
      for (let y = y0; y < y1; y += 2) {
        for (let x = x0; x < x1; x += 2) {
          const i = (y * width + x) * 4
          sum += 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]
          count += 1
        }
      }
      const mean = count > 0 ? sum / count : 0
      field[row * cols + col] = mean
      globalSum += mean
    }
  }
  const globalMean = globalSum / (cols * rows)
  let maxDev = 1e-6
  for (let i = 0; i < field.length; i += 1) {
    field[i] = Math.abs(field[i] - globalMean)
    if (field[i] > maxDev) maxDev = field[i]
  }
  for (let i = 0; i < field.length; i += 1) field[i] = clamp(field[i] / maxDev)
  boxBlur(field, cols, rows)
  boxBlur(field, cols, rows)
  return field
}

function boxBlur(field: Float32Array, cols: number, rows: number): void {
  const source = field.slice()
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      let sum = 0
      let count = 0
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = col + dx
          const ny = row + dy
          if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue
          sum += source[ny * cols + nx]
          count += 1
        }
      }
      field[row * cols + col] = sum / count
    }
  }
}

function bilerp(
  field: Float32Array,
  cols: number,
  rows: number,
  x: number,
  y: number,
): number {
  const cx = Math.max(0, Math.min(cols - 1.001, x))
  const cy = Math.max(0, Math.min(rows - 1.001, y))
  const x0 = Math.floor(cx)
  const y0 = Math.floor(cy)
  const fx = cx - x0
  const fy = cy - y0
  const a = field[y0 * cols + x0]
  const b = field[y0 * cols + x0 + 1]
  const c = field[(y0 + 1) * cols + x0]
  const d = field[(y0 + 1) * cols + x0 + 1]
  return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy
}

export type CollapseNodeState = {
  offX: Float32Array
  offY: Float32Array
  support: Float32Array
  erosion: Float32Array
  /** celle-occ marcate come attrattore (occhio / ruota / profilo): resistono. */
  attractor: Uint8Array
  centroidX: number
  centroidY: number
}

export function createCollapseNodeState(occ: Float32Array): CollapseNodeState {
  const count = NODE_COLS * NODE_ROWS
  // centroide della figura (occ > 0.5).
  let sx = 0
  let sy = 0
  let sw = 0
  for (let row = 0; row < OCC_ROWS; row += 1) {
    for (let col = 0; col < OCC_COLS; col += 1) {
      const v = occ[row * OCC_COLS + col]
      if (v > 0.5) {
        sx += col
        sy += row
        sw += 1
      }
    }
  }
  const centroidX = sw > 0 ? sx / sw / OCC_COLS : 0.5
  const centroidY = sw > 0 ? sy / sw / OCC_ROWS : 0.5

  // Attrattori: fino a 3 celle interne ad alto contrasto locale.
  const attractor = new Uint8Array(OCC_COLS * OCC_ROWS)
  const scored: { i: number; s: number }[] = []
  for (let row = 2; row < OCC_ROWS - 2; row += 1) {
    for (let col = 2; col < OCC_COLS - 2; col += 1) {
      const i = row * OCC_COLS + col
      if (occ[i] < 0.55) continue
      const contrast =
        Math.abs(occ[i] - occ[i - 1]) +
        Math.abs(occ[i] - occ[i + 1]) +
        Math.abs(occ[i] - occ[i - OCC_COLS]) +
        Math.abs(occ[i] - occ[i + OCC_COLS])
      scored.push({ i, s: contrast })
    }
  }
  scored.sort((a, b) => b.s - a.s)
  for (const { i } of scored.slice(0, 3)) attractor[i] = 1

  return {
    offX: new Float32Array(count),
    offY: new Float32Array(count),
    support: new Float32Array(count).fill(1),
    erosion: new Float32Array(OCC_COLS * OCC_ROWS),
    attractor,
    centroidX,
    centroidY,
  }
}

/**
 * Cedimenti: il sostegno di ogni nodo si consuma (la marea accelera), poi
 * cede di scatto — l'offset SALTA e **resta** (conseguenza). Fra un
 * cedimento e l'altro una deriva lentissima. I nodi vicino a un attrattore
 * riportano lentamente l'offset a zero: l'attrattore resiste al collasso.
 * In silenzio: nulla si muove.
 */
export function advanceCollapseNodes(
  state: CollapseNodeState,
  params: CollapseParams,
  activity: number,
  tide: number,
  beat: number,
  amplitude: number,
  elapsedMs: number,
  random: () => number,
  phase: number,
): void {
  if (activity <= SILENCE_ACTIVITY_FLOOR) return
  const dt = Math.max(0, elapsedMs)
  for (let row = 0; row < NODE_ROWS; row += 1) {
    for (let col = 0; col < NODE_COLS; col += 1) {
      const n = row * NODE_COLS + col
      const nxUnit = col / (NODE_COLS - 1)
      const nyUnit = row / (NODE_ROWS - 1)

      // attrattore vicino? (mappa il nodo sulla griglia occ)
      const oc = Math.round(nxUnit * (OCC_COLS - 1))
      const orr = Math.round(nyUnit * (OCC_ROWS - 1))
      let nearAttractor = false
      for (let dy = -2; dy <= 2 && !nearAttractor; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          const ax = oc + dx
          const ay = orr + dy
          if (ax < 0 || ax >= OCC_COLS || ay < 0 || ay >= OCC_ROWS) continue
          if (state.attractor[ay * OCC_COLS + ax]) {
            nearAttractor = true
            break
          }
        }
      }
      if (nearAttractor) {
        const reclaim = Math.min(1, dt * ATTRACTOR_RECLAIM_PER_MS)
        state.offX[n] *= 1 - reclaim
        state.offY[n] *= 1 - reclaim
        state.support[n] = 1
        continue
      }

      // direzione del cedimento dal modo di collasso
      const toCx = state.centroidX - nxUnit
      const toCy = state.centroidY - nyUnit
      const toLen = Math.hypot(toCx, toCy) || 1
      let dirX = (toCx / toLen) * params.centroidPull
      let dirY = (toCy / toLen) * params.centroidPull + params.downBias
      dirX += (deliquescenceNoise(col * 1.7, row * 1.3, phase) - 0.5) * 2 * params.jitter
      dirY += (deliquescenceNoise(col * 1.1 + 7, row * 1.9 - 3, phase) - 0.5) * 2 * params.jitter
      const dirLen = Math.hypot(dirX, dirY) || 1
      dirX /= dirLen
      dirY /= dirLen

      state.support[n] = Math.max(0, state.support[n] - dt * SUPPORT_DECAY_PER_MS * (0.4 + tide))
      const threshold = 0.1 + 0.22 * deliquescenceNoise(col * 3.1, row * 2.7, 0)

      if (state.support[n] <= threshold) {
        const mag =
          GIVE_MAGNITUDE_CELLS * amplitude * (0.45 + tide) * (0.6 + random() * 0.8)
        state.offX[n] += dirX * mag
        state.offY[n] += dirY * mag
        state.support[n] = 0.18 + 0.32 * deliquescenceNoise(col * 5.3, row * 4.1, phase)
      } else {
        const drift = NODE_DRIFT_PER_MS * dt * tide * amplitude
        state.offX[n] += dirX * drift
        state.offY[n] += dirY * drift
      }

      // beat: micro-cedimento locale su pochi nodi
      if (beat > 0.2 && random() < beat * 0.04) {
        state.offX[n] += dirX * GIVE_MAGNITUDE_CELLS * 0.3 * beat * amplitude
        state.offY[n] += dirY * GIVE_MAGNITUDE_CELLS * 0.3 * beat * amplitude
      }

      const mag = Math.hypot(state.offX[n], state.offY[n])
      if (mag > MAX_NODE_OFFSET_CELLS) {
        state.offX[n] *= MAX_NODE_OFFSET_CELLS / mag
        state.offY[n] *= MAX_NODE_OFFSET_CELLS / mag
      }
    }
  }

  // campo di erosione (segmenti persi / ricomposizione), reversibile,
  // segue la fase lenta. Solo sulla fascia di bordo.
  const erRate = Math.min(1, dt * EROSION_RATE_PER_MS)
  for (let row = 0; row < OCC_ROWS; row += 1) {
    for (let col = 0; col < OCC_COLS; col += 1) {
      const i = row * OCC_COLS + col
      const border = 1 - Math.min(1, Math.abs(0.5 - clamp(baseOccSample(state, i))) / 0.28)
      const target =
        params.erosionGain *
        border *
        (deliquescenceNoise(col * 1.9, row * 1.7, phase * 3) - 0.15)
      state.erosion[i] += (target - state.erosion[i]) * erRate
    }
  }
}

// Il campo occ0 non è nello stato dei nodi; per il target di erosione basta
// una stima: la fascia di bordo si concentra dove l'offset dei nodi è
// moderato. Approssimazione economica, non serve il campo originale qui.
function baseOccSample(state: CollapseNodeState, occIndex: number): number {
  const col = occIndex % OCC_COLS
  const row = Math.floor(occIndex / OCC_COLS)
  const nx = (col / (OCC_COLS - 1)) * (NODE_COLS - 1)
  const ny = (row / (OCC_ROWS - 1)) * (NODE_ROWS - 1)
  const off = Math.hypot(
    bilerp(state.offX, NODE_COLS, NODE_ROWS, nx, ny),
    bilerp(state.offY, NODE_COLS, NODE_ROWS, nx, ny),
  )
  return clamp(0.5 + (0.5 - Math.min(0.5, off / 4)))
}

/**
 * Advezione del campo di occupazione lungo gli offset dei nodi (pull-back),
 * meno il campo di erosione. Le operazioni topologiche — strozzatura,
 * perdita di segmenti, fusione — emergono dalla soglia, senza codice
 * dedicato.
 */
export function warpOccupation(
  occ0: Float32Array,
  cols: number,
  rows: number,
  state: CollapseNodeState,
  out: Float32Array,
): Float32Array {
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const i = row * cols + col
      const nx = (col / (cols - 1)) * (NODE_COLS - 1)
      const ny = (row / (rows - 1)) * (NODE_ROWS - 1)
      const ox = bilerp(state.offX, NODE_COLS, NODE_ROWS, nx, ny)
      const oy = bilerp(state.offY, NODE_COLS, NODE_ROWS, nx, ny)
      const v = bilerp(occ0, cols, rows, col - ox, row - oy) - state.erosion[i]
      out[i] = clamp(v)
    }
  }
  return out
}

/**
 * Spostamento medio dei nodi campionato sull'INTERNO della figura
 * (`occ0 > 0.6`), in celle-occ. Proxy misurabile del Test 1 "a schermo": se
 * questo valore è alto, non si muove solo il bordo del ritaglio — le zone di
 * colore interne (warpate dalla stessa griglia) scivolano visibilmente
 * (collaudo negativo 2026-08-31).
 */
export function interiorDisplacement(state: CollapseNodeState, occ0: Float32Array): number {
  let sum = 0
  let count = 0
  for (let row = 0; row < OCC_ROWS; row += 1) {
    for (let col = 0; col < OCC_COLS; col += 1) {
      if (occ0[row * OCC_COLS + col] <= 0.6) continue
      const nx = (col / (OCC_COLS - 1)) * (NODE_COLS - 1)
      const ny = (row / (OCC_ROWS - 1)) * (NODE_ROWS - 1)
      sum += Math.hypot(
        bilerp(state.offX, NODE_COLS, NODE_ROWS, nx, ny),
        bilerp(state.offY, NODE_COLS, NODE_ROWS, nx, ny),
      )
      count += 1
    }
  }
  return count > 0 ? sum / count : 0
}

/**
 * Divergenza di silhouette fra due campi di occupazione: differenza
 * simmetrica sulla soglia 0.5, normalizzata sull'unione. 0 = identiche,
 * 1 = nessuna sovrapposizione. È il Test 1 Visual reso misurabile.
 */
export function silhouetteDivergence(a: Float32Array, b: Float32Array): number {
  let diff = 0
  let union = 0
  for (let i = 0; i < a.length; i += 1) {
    const fa = a[i] > 0.5
    const fb = b[i] > 0.5
    if (fa || fb) union += 1
    if (fa !== fb) diff += 1
  }
  return union > 0 ? diff / union : 0
}

// --- Zone di colore per la colata — ESTRAZIONE LOCALE (spec §3bis, brief
// disaccoppiamento 2026-09-07) --------------------------------------------
//
// DELIQUESCENCE è un plugin autonomo: la sua analisi vive dentro il suo
// modulo. In precedenza il gocciolamento chiamava `analyzeMaterialPixels`
// (modulo condiviso con Material-Morph, Dream-Segmentation, Fractal-Spiral):
// una taratura fatta per un altro renderer poteva spostare la colata qui.
// Ora l'estrazione è locale e mirata a ciò che serve alla colata soltanto —
// il bordo inferiore warpato e il colore medio di ogni zona. Niente campo
// edge, niente densità, niente salienza, niente palette, nessun `focal`:
// tutto ciò che `analyzeMaterialPixels` calcola per gli altri renderer e
// che qui non è mai stato usato. La duplicazione della classificazione
// cromatica con quel modulo è voluta, non un refactor mancato.

export type DeliquescenceColorZone = {
  id: number
  /** centroide orizzontale normalizzato 0..1 (origine della colata). */
  centroidX: number
  /** estensione orizzontale in pixel (larghezza della macchia che cola). */
  minX: number
  maxX: number
  /** bordo inferiore in pixel: da qui parte la colata verso il basso. */
  maxY: number
  averageColor: readonly [number, number, number]
}

/**
 * Classe cromatica grossolana di un pixel: banda di luminanza pura quando è
 * poco saturo, banda di tinta + chiaro/scuro quando è saturo. Stessa idea
 * di `materialClass` altrove, tenuta qui perché è la grammatica della
 * colata di DELIQUESCENCE e deve poter essere tarata senza toccare nessun
 * altro renderer.
 */
function deliquescenceColorClass(red: number, green: number, blue: number): number {
  const light = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255
  const maximum = Math.max(red, green, blue)
  const minimum = Math.min(red, green, blue)
  const saturation = maximum <= 0 ? 0 : (maximum - minimum) / maximum
  if (saturation < 0.12) return Math.min(3, Math.floor(light * 4))
  const hueBand = maximum === red ? 0 : maximum === green ? 1 : 2
  return 4 + hueBand * 2 + (light >= 0.5 ? 1 : 0)
}

/**
 * Zone di colore riconoscibili dal raster ORIGINALE (prima del tonemap):
 * componenti connesse 4-vicini di classe cromatica uguale, scartate quelle
 * troppo piccole, tenute le più estese fino a `maxZones`, ordinate per
 * area. Per ognuna: centroide orizzontale, bounding box orizzontale, bordo
 * inferiore, colore medio. Nessuna dipendenza esterna.
 */
export function extractDeliquescenceColorZones(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  maxZones = 8,
): DeliquescenceColorZone[] {
  const pixelCount = width * height
  if (width <= 1 || height <= 1 || rgba.length !== pixelCount * 4) return []

  const classes = new Uint8Array(pixelCount)
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4
    classes[pixel] = deliquescenceColorClass(
      rgba[offset],
      rgba[offset + 1],
      rgba[offset + 2],
    )
  }

  const visited = new Uint8Array(pixelCount)
  const queue = new Int32Array(pixelCount)
  const minimumPixels = Math.max(8, Math.floor(pixelCount * 0.0015))
  type MutableZone = {
    pixels: number
    sumRed: number
    sumGreen: number
    sumBlue: number
    sumX: number
    minX: number
    maxX: number
    maxY: number
  }
  const zones: MutableZone[] = []

  for (let start = 0; start < pixelCount; start += 1) {
    if (visited[start]) continue
    const targetClass = classes[start]
    let read = 0
    let write = 0
    queue[write++] = start
    visited[start] = 1
    const zone: MutableZone = {
      pixels: 0,
      sumRed: 0,
      sumGreen: 0,
      sumBlue: 0,
      sumX: 0,
      minX: width,
      maxX: 0,
      maxY: 0,
    }
    while (read < write) {
      const index = queue[read++]
      const x = index % width
      const y = Math.floor(index / width)
      const offset = index * 4
      zone.pixels += 1
      zone.sumRed += rgba[offset]
      zone.sumGreen += rgba[offset + 1]
      zone.sumBlue += rgba[offset + 2]
      zone.sumX += x
      if (x < zone.minX) zone.minX = x
      if (x > zone.maxX) zone.maxX = x
      if (y > zone.maxY) zone.maxY = y
      const neighbours = [
        x > 0 ? index - 1 : -1,
        x + 1 < width ? index + 1 : -1,
        y > 0 ? index - width : -1,
        y + 1 < height ? index + width : -1,
      ]
      for (const neighbour of neighbours) {
        if (
          neighbour >= 0 &&
          !visited[neighbour] &&
          classes[neighbour] === targetClass
        ) {
          visited[neighbour] = 1
          queue[write++] = neighbour
        }
      }
    }
    if (zone.pixels >= minimumPixels) zones.push(zone)
  }

  return zones
    .sort((left, right) => right.pixels - left.pixels)
    .slice(0, Math.max(1, maxZones))
    .map((zone, id): DeliquescenceColorZone => ({
      id,
      centroidX: zone.sumX / zone.pixels / Math.max(1, width - 1),
      minX: zone.minX,
      maxX: zone.maxX,
      maxY: zone.maxY,
      averageColor: [
        Math.round(zone.sumRed / zone.pixels),
        Math.round(zone.sumGreen / zone.pixels),
        Math.round(zone.sumBlue / zone.pixels),
      ],
    }))
}

function bandActivity(bands: BandEnergies, movingAverages?: BandEnergies): number {
  const drive = (value: number, avg: number | undefined) =>
    clamp((value - Math.max(0.02, avg ?? value * 0.8)) / 0.35 + value * 0.4)
  return clamp(
    drive(bands.low, movingAverages?.low) * 0.34 +
      drive(bands.lowMid, movingAverages?.lowMid) * 0.3 +
      drive(bands.mid, movingAverages?.mid) * 0.22 +
      drive(bands.high, movingAverages?.high) * 0.14,
  )
}

// --- Store fuori istanza (spec §3) -------------------------------------
// offset dei nodi, sostegno, erosione, marea, fase, colata: sopravvivono
// alla ricreazione dell'istanza ogni ~20-84s. La conseguenza di ogni
// cedimento resta.
type DeliquescenceMetabolism = {
  sourceId: string | null
  tide: number
  phase: number
  nodes: CollapseNodeState | null
  drip: HTMLCanvasElement | null
}
const metabolismStore = new Map<string, DeliquescenceMetabolism>()

function getMetabolism(key: string): DeliquescenceMetabolism {
  let state = metabolismStore.get(key)
  if (!state) {
    state = { sourceId: null, tide: 0.35, phase: 0, nodes: null, drip: null }
    metabolismStore.set(key, state)
  }
  return state
}

// --- Preparazione ------------------------------------------------------

type PreparedSource = {
  id: string
  palette: HTMLCanvasElement
  occ: Float32Array
  /** zone di colore riconoscibili (spec: il collasso agisce su queste). */
  regions: DeliquescenceColorZone[]
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

async function prepareSource(
  source: BrainRendererImageSource,
  width: number,
  height: number,
): Promise<PreparedSource> {
  const startedAt = performance.now()
  const bitmap = await createImageBitmap(source.raster)
  try {
    const base = createCanvas(width, height)
    const context = base.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Canvas 2D non disponibile')
    const scale = Math.max(width / bitmap.width, height / bitmap.height)
    const sw = width / scale
    const sh = height / scale
    context.drawImage(
      bitmap,
      (bitmap.width - sw) / 2,
      (bitmap.height - sh) / 2,
      sw,
      sh,
      0,
      0,
      width,
      height,
    )
    const image = context.getImageData(0, 0, width, height)
    const occ = estimateOccupationField(image.data, width, height, OCC_COLS, OCC_ROWS)
    // Zone di colore dai pixel ORIGINALI, prima del tonemap (spec: il
    // collasso agisce su regioni cromatiche riconoscibili). Estrazione
    // locale al modulo — nessuna chiamata a moduli di analisi condivisi.
    const regions = extractDeliquescenceColorZones(image.data, width, height, 8)
    const data = image.data
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = deliquescenceTonemap(data[i], data[i + 1], data[i + 2])
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
    }
    context.putImageData(image, 0, 0)
    brainPerformanceMetrics.recordArtworkPreparation(performance.now() - startedAt)
    return { id: source.id, palette: base, occ, regions }
  } finally {
    bitmap.close()
  }
}

// --- Controller -------------------------------------------------------

export function createBrainDeliquescenceScene(
  pluginContext: BrainRendererPluginContext,
): BrainSceneRendererController {
  const outputCanvas = document.createElement('canvas')
  const configured = getBrainRenderingConfig().image
  outputCanvas.width = Math.min(configured.width, NORMAL_WIDTH)
  outputCanvas.height = Math.min(configured.height, NORMAL_HEIGHT)
  outputCanvas.dataset.brainDeliquescence = 'preparing'
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

  const metabolism = getMetabolism('deliquescence')
  const mode = pickCollapseMode(pluginContext.scene.frameId)
  const params = COLLAPSE_MODES[mode]
  const motionSmoother = new BrainCanvasMotionSmoother()

  const occWarp = new Float32Array(OCC_COLS * OCC_ROWS)
  const maskCanvas = createCanvas(OCC_COLS, OCC_ROWS)
  const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true })
  const maskImage = maskCtx?.createImageData(OCC_COLS, OCC_ROWS) ?? null

  // Scratch persistenti — ricreati solo se cambia la dimensione (low power).
  // Prima erano tre `createCanvas` per frame (collaudo 2026-08-31).
  const scratch = {
    w: 0,
    h: 0,
    figure: createCanvas(1, 1),
    bleed: createCanvas(1, 1),
    contour: createCanvas(1, 1),
  }
  const ensureScratch = (width: number, height: number): void => {
    if (scratch.w === width && scratch.h === height) return
    scratch.w = width
    scratch.h = height
    for (const c of [scratch.figure, scratch.bleed, scratch.contour]) {
      c.width = width
      c.height = height
    }
  }

  let destroyed = false
  let failed = false
  let resourcePressure = false
  let preparationStarted = false
  let latestPerception: BrainBioPerceptionState | null = null
  let transitionProgress = 1
  let lastMotionAt = Number.NaN
  let lastRenderedAt = Number.NEGATIVE_INFINITY
  let prepared: PreparedSource | null = null

  const resolveCurrentSource = (): BrainRendererImageSource => {
    const sources = pluginContext.getImageSources()
    return (
      sources.find((source) => source.role === 'current') ?? {
        id: pluginContext.scene.frameId,
        role: 'current',
        scene: pluginContext.scene,
        raster: pluginContext.raster,
        narrativeHints: [pluginContext.scene.description],
      }
    )
  }

  const prepare = (lowPowerMode: boolean): void => {
    if (preparationStarted || destroyed) return
    preparationStarted = true
    const width = lowPowerMode ? LOW_POWER_WIDTH : NORMAL_WIDTH
    const height = lowPowerMode ? LOW_POWER_HEIGHT : NORMAL_HEIGHT
    outputCanvas.width = width
    outputCanvas.height = height
    prepareSource(resolveCurrentSource(), width, height)
      .then((result) => {
        if (destroyed) return
        prepared = result
        // Cambio immagine = scambio lento di substrato, NON reset dei nodi
        // (spec §3, "nessun ritorno allo stato iniziale"). Solo alla prima
        // istanza in assoluto si creano i nodi.
        if (!metabolism.nodes || metabolism.sourceId === null) {
          metabolism.nodes = createCollapseNodeState(result.occ)
        }
        metabolism.sourceId = result.id
        outputCanvas.dataset.brainDeliquescence = 'ready'
        outputCanvas.dataset.brainDeliquescenceMode = mode
        brainLog('render', 'DELIQUESCENCE preparato', {
          frameId: pluginContext.scene.frameId,
          mode,
        })
      })
      .catch((error) => {
        if (destroyed) return
        failed = true
        outputCanvas.dataset.brainDeliquescence = 'failed'
        brainWarn('render', 'DELIQUESCENCE non preparato', {
          frameId: pluginContext.scene.frameId,
          error,
        })
      })
  }

  const paintMask = (source: Float32Array, gamma: number): void => {
    if (!maskCtx || !maskImage) return
    const data = maskImage.data
    for (let i = 0; i < source.length; i += 1) {
      const a = Math.round(clamp(Math.pow(source[i], gamma)) * 255)
      data[i * 4] = 0
      data[i * 4 + 1] = 0
      data[i * 4 + 2] = 0
      data[i * 4 + 3] = a
    }
    maskCtx.putImageData(maskImage, 0, 0)
  }

  const draw = (
    prep: PreparedSource,
    nodes: CollapseNodeState,
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    tide: number,
    phase: number,
  ): void => {
    ensureScratch(width, height)
    warpOccupation(prep.occ, OCC_COLS, OCC_ROWS, nodes, occWarp)
    const pxPerCell = width / OCC_COLS
    const nodeOffPx = (fx: number, fy: number): [number, number] => [
      bilerp(nodes.offX, NODE_COLS, NODE_ROWS, fx, fy) * pxPerCell,
      bilerp(nodes.offY, NODE_COLS, NODE_ROWS, fx, fy) * pxPerCell,
    ]

    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.imageSmoothingEnabled = true

    // Fondo notturno — scuro ma non schiacciante (collaudo 2026-08-31: il
    // raster spariva).
    ctx.fillStyle = '#0a0812'
    ctx.fillRect(0, 0, width, height)

    // --- Figura: raster mappato-palette WARPATO per celle (le zone di colore
    // scivolano) e poi ritagliato dal campo di occupazione collassato. È il
    // layer DOMINANTE.
    const figCtx = scratch.figure.getContext('2d')
    if (figCtx) {
      figCtx.globalCompositeOperation = 'source-over'
      figCtx.globalAlpha = 1
      figCtx.imageSmoothingEnabled = true
      figCtx.clearRect(0, 0, width, height)
      const cw = width / WARP_COLS
      const ch = height / WARP_ROWS
      const ov = 2
      for (let row = 0; row < WARP_ROWS; row += 1) {
        for (let col = 0; col < WARP_COLS; col += 1) {
          const fx = (col + 0.5) / WARP_COLS * (NODE_COLS - 1)
          const fy = (row + 0.5) / WARP_ROWS * (NODE_ROWS - 1)
          const [ox, oy] = nodeOffPx(fx, fy)
          const dx = col * cw - ov
          const dy = row * ch - ov
          figCtx.drawImage(
            prep.palette,
            Math.max(0, dx - ox),
            Math.max(0, dy - oy),
            cw + ov * 2,
            ch + ov * 2,
            dx,
            dy,
            cw + ov * 2,
            ch + ov * 2,
          )
        }
      }
      figCtx.globalCompositeOperation = 'destination-in'
      paintMask(occWarp, 0.6)
      figCtx.drawImage(maskCanvas, 0, 0, width, height)
    }
    ctx.globalAlpha = 1
    ctx.drawImage(scratch.figure, 0, 0)

    // --- Fusione figura-sfondo: dove il campo si è esteso oltre la figura
    // originale, pigmento-figura sfumato entra nel fondo.
    const bleedCtx = scratch.bleed.getContext('2d')
    if (bleedCtx) {
      const bleed = occWarp.slice()
      for (let i = 0; i < bleed.length; i += 1) {
        bleed[i] = clamp((occWarp[i] - prep.occ[i]) * 1.7)
      }
      bleedCtx.globalCompositeOperation = 'source-over'
      bleedCtx.globalAlpha = 1
      bleedCtx.clearRect(0, 0, width, height)
      bleedCtx.filter = 'blur(5px)'
      bleedCtx.drawImage(prep.palette, 0, 0, width, height)
      bleedCtx.filter = 'none'
      bleedCtx.globalCompositeOperation = 'destination-in'
      paintMask(bleed, 1)
      bleedCtx.drawImage(maskCanvas, 0, 0, width, height)
      ctx.globalAlpha = 0.45
      ctx.drawImage(scratch.bleed, 0, 0)
      ctx.globalAlpha = 1
    }

    // --- Contorno: il PROTAGONISTA. Tratto CHIARO (cenere calda), più largo,
    // in schiarita — non nero su nero (collaudo 2026-08-31).
    const contourCtx = scratch.contour.getContext('2d')
    if (contourCtx) {
      const band = occWarp.slice()
      for (let i = 0; i < band.length; i += 1) {
        band[i] = clamp(1 - Math.abs(occWarp[i] - 0.42) / 0.24)
      }
      contourCtx.globalCompositeOperation = 'source-over'
      contourCtx.globalAlpha = 1
      contourCtx.clearRect(0, 0, width, height)
      contourCtx.fillStyle = 'rgb(214,196,205)'
      contourCtx.fillRect(0, 0, width, height)
      contourCtx.globalCompositeOperation = 'destination-in'
      paintMask(band, 1)
      contourCtx.drawImage(maskCanvas, 0, 0, width, height)
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = clamp(0.24 + tide * 0.36)
      ctx.drawImage(scratch.contour, 0, 0)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
    }

    // --- Colata del colore (gravità reale, SOLO colore): per ogni zona di
    // colore, una macchia che scende dal suo bordo inferiore warpato. Si
    // accumula lentamente nel buffer `drip`. Subordinata, mai dominante,
    // niente colonne fisse (collaudo 2026-08-31).
    if (!metabolism.drip || metabolism.drip.width !== width || metabolism.drip.height !== height) {
      metabolism.drip = createCanvas(width, height)
    }
    const dripCtx = metabolism.drip.getContext('2d')
    if (dripCtx) {
      dripCtx.globalCompositeOperation = 'source-over'
      dripCtx.globalAlpha = 0.02
      dripCtx.fillStyle = '#0a0812'
      dripCtx.fillRect(0, 0, width, height) // sbiadimento lento (macchia, non barra)
      dripCtx.globalAlpha = 1
      if (!resourcePressure) {
        for (const region of prep.regions) {
          const fx = region.centroidX * (NODE_COLS - 1)
          const fyUnit = clamp(region.maxY / Math.max(1, height))
          const fy = fyUnit * (NODE_ROWS - 1)
          const [ox, oy] = nodeOffPx(fx, fy)
          const ax = region.centroidX * width + ox
          const ay = clamp(region.maxY + oy, 0, height)
          const w = Math.max(3, (region.maxX - region.minX) * 0.34)
          const len = height * (0.05 + tide * 0.34)
          const [cr, cg, cb] = region.averageColor
          const wander = (deliquescenceNoise(region.id * 3.7, 0, phase) - 0.5) * w
          const gradient = dripCtx.createLinearGradient(0, ay, 0, ay + len)
          gradient.addColorStop(0, `rgba(${cr},${cg},${cb},0.09)`)
          gradient.addColorStop(1, `rgba(${cr},${cg},${cb},0)`)
          dripCtx.fillStyle = gradient
          dripCtx.fillRect(ax - w / 2 + wander, ay, w, len)
        }
      }
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = clamp(0.28 + tide * 0.16)
      ctx.drawImage(metabolism.drip, 0, 0, width, height)
      ctx.globalAlpha = 1
    }

    // --- Velo scuro d'insieme (`multiply`) — molto leggero: densità con la
    // marea, senza mai coprire il raster.
    ctx.globalCompositeOperation = 'multiply'
    ctx.globalAlpha = clamp(0.03 + tide * 0.1)
    ctx.fillStyle = '#06050a'
    ctx.fillRect(0, 0, width, height)

    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    void transitionProgress
  }

  return {
    element: outputCanvas,
    isReady: () => prepared !== null && metabolism.nodes !== null,
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
    setPerception(state) {
      latestPerception = state
      outputCanvas.dataset.brainBioRegime = state.regime
    },
    setTransition(progress) {
      transitionProgress = clamp(progress)
    },
    update(
      bands: BandEnergies,
      settings: AppSettings,
      time: number,
      rhythm?: BrainRhythmState,
      movingAverages?: BandEnergies,
      flash?: BrainFlashState,
    ) {
      if (destroyed || failed || !context) return
      prepare(settings.lowPowerMode)
      if (!prepared || !metabolism.nodes) return

      const elapsed = Number.isFinite(lastMotionAt) ? Math.max(0, time - lastMotionAt) : 16
      lastMotionAt = time

      const rawActivity = bandActivity(bands, movingAverages)
      const beatRaw = calculateRhythmicAccent(rhythm)
      const flashDrive = flash?.active ? clamp(flash.intensity) : 0
      const smooth = motionSmoother.update(
        { ...SILENT_BANDS, activity: rawActivity, beat: beatRaw },
        elapsed,
        rhythm?.beatDurationMs ?? 500,
        rhythm?.active ?? rawActivity > 0,
        settings.motionProfile,
      )
      const activity = clamp(smooth.activity + flashDrive * 0.2)

      const regime = latestPerception?.regime ?? null
      const residual = latestPerception?.signals.residual ?? 0.4
      metabolism.tide = advanceDeliquescenceTide(metabolism.tide, residual, elapsed)
      metabolism.phase = advanceDeliquescencePhase(metabolism.phase, activity, elapsed)
      const amplitude = 0.35 + brainBioLocalMotionScale(regime) * 0.9

      advanceCollapseNodes(
        metabolism.nodes,
        params,
        activity,
        metabolism.tide,
        clamp(smooth.beat),
        amplitude,
        elapsed,
        Math.random,
        metabolism.phase,
      )

      const frameInterval = resourcePressure
        ? PRESSURE_FRAME_INTERVAL_MS
        : settings.lowPowerMode
          ? LOW_POWER_FRAME_INTERVAL_MS
          : NORMAL_FRAME_INTERVAL_MS
      if (Number.isFinite(lastRenderedAt)) {
        if (time - lastRenderedAt < frameInterval) return
        lastRenderedAt += Math.floor((time - lastRenderedAt) / frameInterval) * frameInterval
      } else {
        lastRenderedAt = time
      }

      const renderStartedAt = performance.now()
      draw(
        prepared,
        metabolism.nodes,
        context,
        outputCanvas.width,
        outputCanvas.height,
        metabolism.tide,
        metabolism.phase,
      )
      outputCanvas.dataset.brainDeliquescenceTide = metabolism.tide.toFixed(3)
      brainPerformanceMetrics.recordCanvasFrame(
        time,
        resourcePressure,
        performance.now() - renderStartedAt,
      )
    },
    destroy() {
      destroyed = true
      motionSmoother.reset()
      prepared = null
      outputCanvas.width = 1
      outputCanvas.height = 1
      outputCanvas.remove()
    },
  }
}
