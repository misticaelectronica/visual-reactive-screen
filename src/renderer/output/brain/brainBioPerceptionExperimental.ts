import type {
  BrainBioPerceptionState,
  BrainBioRegime,
  BrainBioRegimeDiagnostics,
  BrainBioRhythmInput,
} from './brainBioPerception'
import { BrainBioPerceptionClock } from './brainBioPerception'
import type { BandEnergies } from '@shared/types'

const BANDS = ['low', 'lowMid', 'mid', 'high'] as const
const BIN_MS = 25
const WINDOW_MS = 8_000
const ANALYSIS_INTERVAL_MS = 500
const MIN_PERIOD_MS = 240
const MAX_PERIOD_MS = 1_200
const CYCLE_PHASE_SLOTS = 8
const CYCLES_FOR_PERSISTENCE = 6
const ANCHOR_ATTACK_MS = 2_000
const ANCHOR_RELEASE_MS = 4_500
const CONSTRAINT_TRAJECTORY_MS = 2_500
// Collegamento Visual (MVP, Vice Consigliere 2026-09-11): soglia unica per
// separare respiro-alto da respiro-profondo su `constraint.value`, già
// calcolato, nessuna nuova estrazione. Punto scelto direttamente
// dall'evidenza già misurata sul corpus (non un numero a caso): C04
// (respiro-profondo) = 0,109; C06 (respiro-alto-1) = 0,252 — a metà.
const ALTO_CONSTRAINT_THRESHOLD = 0.18
// anchoring.gaining/losing (bug evidente, MVP 2026-09-11): deadband sul
// delta campione-a-campione di `anchor`, retarato sui 4 campioni
// respiro-alto-*.mp3 del corpus (0.012 bastava sui primi 3, non sul 4°:
// vedi scripts/calibration/assert-regime-corpus.mjs).
const ANCHOR_TREND_DEADBAND = 0.02
// Transitorio d'avvio della memoria (bug evidente, MVP 2026-09-11): appena
// `ready` diventa vero, `anchor`/`constraint` sono ancora vicini a zero per
// costruzione (nessun ciclo ancora confermato) — non è un vero
// respiro-profondo (stasi assestata), è l'istante prima che l'ancoraggio
// abbia potuto formarsi. Grace temporale breve, non legata al VALORE
// raggiunto da `anchor` (i file realmente a bassa costrizione non lo
// superano mai per tutta la durata: legarla al valore sopprimerebbe
// respiro-profondo ovunque su quei file, non solo all'avvio).
const ANCHOR_WARMUP_GRACE_MS = 1_500

export type ExperimentalBin = {
  bands: BandEnergies
  onsets: BandEnergies
}

export type ExperimentalMotorDiagnostics = {
  ready: boolean
  observedMs: number
  organization: { periodMs: number; recurrence: number; eventActivity: number }
  entrainment: { physicalConfirmation: number; cyclePersistence: number }
  anchoring: { value: number; gaining: boolean; losing: boolean; recovered: boolean; warmedUp: boolean }
  constraint: {
    value: number
    trajectory: number
    direction: 'rising' | 'stable' | 'falling'
  }
  settlement: {
    configurationPersistence: number
    evidence: number
    oscillatingTransformation: boolean
  }
}

const ZERO_BANDS: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function ema(previous: number, target: number, deltaMs: number, tauMs: number): number {
  const alpha = 1 - Math.exp(-Math.max(0, deltaMs) / tauMs)
  return previous + (target - previous) * alpha
}

function pearsonAtLag(
  bins: ExperimentalBin[],
  lag: number,
  bands: readonly (typeof BANDS)[number][] = BANDS,
): number {
  const count = bins.length - lag
  if (count < 2) return 0
  let covariance = 0
  let varianceA = 0
  let varianceB = 0
  for (const band of bands) {
    let meanA = 0
    let meanB = 0
    for (let index = lag; index < bins.length; index += 1) {
      meanA += bins[index].onsets[band]
      meanB += bins[index - lag].onsets[band]
    }
    meanA /= count
    meanB /= count
    for (let index = lag; index < bins.length; index += 1) {
      const a = bins[index].onsets[band] - meanA
      const b = bins[index - lag].onsets[band] - meanB
      covariance += a * b
      varianceA += a * a
      varianceB += b * b
    }
  }
  const denominator = Math.sqrt(varianceA * varianceB)
  return denominator > 1e-9 ? clamp(covariance / denominator) : 0
}

function cycleDescriptor(cycle: ExperimentalBin[]): number[] {
  const descriptor = new Array<number>(BANDS.length + BANDS.length * CYCLE_PHASE_SLOTS).fill(0)
  if (cycle.length === 0) return descriptor
  for (let index = 0; index < cycle.length; index += 1) {
    const phaseSlot = Math.min(
      CYCLE_PHASE_SLOTS - 1,
      Math.floor(index / cycle.length * CYCLE_PHASE_SLOTS),
    )
    for (let bandIndex = 0; bandIndex < BANDS.length; bandIndex += 1) {
      const band = BANDS[bandIndex]
      descriptor[bandIndex] += cycle[index].bands[band] / cycle.length
      descriptor[BANDS.length + phaseSlot * BANDS.length + bandIndex] +=
        cycle[index].onsets[band]
    }
  }
  return descriptor
}

function descriptorSimilarity(left: number[], right: number[]): number {
  let difference = 0
  let magnitude = 0
  for (let index = 0; index < left.length; index += 1) {
    difference += Math.abs(left[index] - right[index])
    magnitude += Math.abs(left[index]) + Math.abs(right[index])
  }
  return magnitude > 1e-9 ? clamp(1 - difference / magnitude) : 0
}

function configurationPersistence(bins: ExperimentalBin[]): number {
  const half = Math.floor(bins.length / 2)
  if (half < 1) return 0
  return descriptorSimilarity(
    cycleDescriptor(bins.slice(0, half)),
    cycleDescriptor(bins.slice(half)),
  )
}

function cyclePersistence(bins: ExperimentalBin[], periodBins: number): number {
  if (periodBins < 1) return 0
  const descriptors: number[][] = []
  for (
    let end = bins.length;
    end - periodBins >= 0 && descriptors.length < CYCLES_FOR_PERSISTENCE;
    end -= periodBins
  ) {
    descriptors.unshift(cycleDescriptor(bins.slice(end - periodBins, end)))
  }
  if (descriptors.length < 3) return 0
  let sum = 0
  for (let index = 1; index < descriptors.length; index += 1) {
    sum += descriptorSimilarity(descriptors[index - 1], descriptors[index])
  }
  return sum / (descriptors.length - 1)
}

export function analyzeExperimentalTemporalWindow(bins: ExperimentalBin[]): {
  periodMs: number
  recurrence: number
  physicalConfirmation: number
  cyclePersistence: number
  configurationPersistence: number
  eventActivity: number
} {
  const minLag = Math.ceil(MIN_PERIOD_MS / BIN_MS)
  const maxLag = Math.min(Math.floor(MAX_PERIOD_MS / BIN_MS), bins.length - 2)
  let periodBins = 0
  let recurrence = 0
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    const candidate = pearsonAtLag(bins, lag)
    if (candidate > recurrence) {
      recurrence = candidate
      periodBins = lag
    }
  }
  const physicalConfirmation = periodBins > 0
    ? pearsonAtLag(bins, periodBins, ['low', 'lowMid'])
    : 0
  let eventActivity = 0
  for (const bin of bins) {
    for (const band of BANDS) eventActivity += bin.onsets[band]
  }
  eventActivity = clamp(eventActivity / Math.max(1, bins.length) * 24)
  return {
    periodMs: periodBins * BIN_MS,
    recurrence,
    physicalConfirmation,
    cyclePersistence: cyclePersistence(bins, periodBins),
    configurationPersistence: configurationPersistence(bins),
    eventActivity,
  }
}

// Collegamento Visual (MVP): stesso vocabolario della baseline, nessuno
// stato nuovo. `anchoring.gaining`/`losing` (già calcolati, frame a frame
// sull'ancoraggio stesso) fanno da passaggio/stasi, esattamente come
// `pressureTrend` nella baseline; `constraint.value` (già calcolato) decide
// alto/profondo dentro la stasi, esattamente come `level` nella baseline.
// Non `constraint.direction`: quella traiettoria è doppiamente smussata
// (EMA sull'ancoraggio, poi EMA da 2,5s sulla costrizione) e di fatto non
// rientra mai in `falling` dopo l'assestamento iniziale — bug evidente
// individuato in collaudo (decompresisone.mp3 restava respiro-alto per
// 40 dei 49s). `anchoring.gaining`/`losing` reagiscono sample a sample e
// producono passaggi anche a metà file.
export function classifyExperimentalRegime(diagnostics: ExperimentalMotorDiagnostics): BrainBioRegime {
  if (!diagnostics.ready) return 'unresolved'
  if (diagnostics.anchoring.gaining) return 'pressurized'
  if (diagnostics.anchoring.losing) return 'decompression'
  // `warmedUp` (bug evidente, MVP 2026-09-11): appena la memoria diventa
  // `ready`, `anchor`/`constraint` sono ancora vicini a zero per
  // costruzione (nessun ciclo ancora confermato) — non è un vero
  // respiro-profondo (stasi assestata su bassa costrizione), è il
  // transitorio d'avvio della memoria stessa. Osservato su
  // respiro-alto-3.mp3: primo secondo dopo `ready` letto come
  // respiro-profondo prima che l'ancoraggio avesse potuto formarsi.
  if (!diagnostics.anchoring.warmedUp) return 'pressurized'
  return diagnostics.constraint.value >= ALTO_CONSTRAINT_THRESHOLD ? 'respiro-alto' : 'respiro-profondo'
}

function initialDiagnostics(): ExperimentalMotorDiagnostics {
  return {
    ready: false,
    observedMs: 0,
    organization: { periodMs: 0, recurrence: 0, eventActivity: 0 },
    entrainment: { physicalConfirmation: 0, cyclePersistence: 0 },
    anchoring: { value: 0, gaining: false, losing: false, recovered: false, warmedUp: false },
    constraint: { value: 0, trajectory: 0, direction: 'stable' },
    settlement: {
      configurationPersistence: 0,
      evidence: 0,
      oscillatingTransformation: false,
    },
  }
}

/**
 * PIANO-044, prima consegna sostanziale. La baseline continua a produrre il
 * contratto pubblico finché la classificazione sperimentale non supera il
 * corpus; questa classe costruisce in parallelo una memoria temporale propria.
 * Conserva materia per banda e confronta cicli interi: non è una nuova somma
 * istantanea di pulse/low-end/gridDensity.
 */
export class BrainBioPerceptionExperimentalClock {
  private readonly baseline = new BrainBioPerceptionClock()
  private readonly bins: ExperimentalBin[] = []
  private previousBands: BandEnergies = { ...ZERO_BANDS }
  private currentBinIndex: number | null = null
  private lastSampleAt = Number.NaN
  private lastAnalysisAt = Number.NEGATIVE_INFINITY
  private anchor = 0
  private readyAt = Number.NaN
  private constraintTrajectory = 0
  private hadAnchor = false
  private awaitingRecovery = false
  private diagnostics = initialDiagnostics()

  private appendMaterial(bands: BandEnergies, now: number): void {
    const binIndex = Math.floor(now / BIN_MS)
    const onsets: BandEnergies = {
      low: Math.max(0, bands.low - this.previousBands.low),
      lowMid: Math.max(0, bands.lowMid - this.previousBands.lowMid),
      mid: Math.max(0, bands.mid - this.previousBands.mid),
      high: Math.max(0, bands.high - this.previousBands.high),
    }
    const heldBands = { ...this.previousBands }
    this.previousBands = { ...bands }
    if (this.currentBinIndex === binIndex && this.bins.length > 0) {
      const current = this.bins[this.bins.length - 1]
      current.bands = { ...bands }
      for (const band of BANDS) current.onsets[band] = Math.max(current.onsets[band], onsets[band])
      return
    }
    if (this.currentBinIndex !== null) {
      const missing = Math.min(
        Math.floor(WINDOW_MS / BIN_MS),
        Math.max(0, binIndex - this.currentBinIndex - 1),
      )
      for (let index = 0; index < missing; index += 1) {
        this.bins.push({ bands: { ...heldBands }, onsets: { ...ZERO_BANDS } })
      }
    }
    this.bins.push({ bands: { ...bands }, onsets })
    this.currentBinIndex = binIndex
    const capacity = Math.floor(WINDOW_MS / BIN_MS)
    if (this.bins.length > capacity) this.bins.splice(0, this.bins.length - capacity)
  }

  private analyze(now: number, deltaMs: number): void {
    const observedMs = this.bins.length * BIN_MS
    if (now - this.lastAnalysisAt < ANALYSIS_INTERVAL_MS || observedMs < WINDOW_MS) {
      this.diagnostics = { ...this.diagnostics, observedMs }
      return
    }
    this.lastAnalysisAt = now
    if (Number.isNaN(this.readyAt)) this.readyAt = now
    const observation = analyzeExperimentalTemporalWindow(this.bins)
    // Ricorrenza e persistenza devono essere entrambe presenti: nessuna delle
    // due autorizza l'ancoraggio da sola.
    const anchorTarget = observation.recurrence * observation.cyclePersistence
    const previousAnchor = this.anchor
    this.anchor = ema(
      this.anchor,
      anchorTarget,
      Math.max(ANALYSIS_INTERVAL_MS, deltaMs),
      anchorTarget >= this.anchor ? ANCHOR_ATTACK_MS : ANCHOR_RELEASE_MS,
    )
    // Prima rappresentazione della costrizione: quanto la presa temporale
    // persistente domina davvero l'attività osservata. Non usa i pesi della
    // baseline e non incorpora energia/spettro in un totale acustico.
    const constraint = this.anchor * Math.sqrt(observation.eventActivity)
    this.constraintTrajectory = ema(
      this.constraintTrajectory,
      constraint,
      Math.max(ANALYSIS_INTERVAL_MS, deltaMs),
      CONSTRAINT_TRAJECTORY_MS,
    )
    const trajectoryDelta = constraint - this.constraintTrajectory
    const direction = trajectoryDelta > 0.035
      ? 'rising'
      : trajectoryDelta < -0.035
        ? 'falling'
        : 'stable'
    const gaining = this.anchor > previousAnchor + ANCHOR_TREND_DEADBAND
    const losing = this.anchor < previousAnchor - ANCHOR_TREND_DEADBAND
    if (this.hadAnchor && losing && this.anchor < 0.2) this.awaitingRecovery = true
    const recovered = this.awaitingRecovery && gaining && this.anchor >= 0.2
    if (recovered) this.awaitingRecovery = false
    if (this.anchor >= 0.2) this.hadAnchor = true
    const settlementEvidence = observation.cyclePersistence *
      observation.configurationPersistence
    this.diagnostics = {
      ready: true,
      observedMs,
      organization: {
        periodMs: observation.periodMs,
        recurrence: observation.recurrence,
        eventActivity: observation.eventActivity,
      },
      entrainment: {
        physicalConfirmation: observation.physicalConfirmation,
        cyclePersistence: observation.cyclePersistence,
      },
      anchoring: { value: this.anchor, gaining, losing, recovered, warmedUp: now - this.readyAt >= ANCHOR_WARMUP_GRACE_MS },
      constraint: {
        value: constraint,
        trajectory: this.constraintTrajectory,
        direction,
      },
      settlement: {
        configurationPersistence: observation.configurationPersistence,
        evidence: settlementEvidence,
        // Periodicità con cicli materialmente incoerenti resta trasformazione.
        oscillatingTransformation:
          observation.recurrence >= 0.35 && observation.cyclePersistence < 0.55,
      },
    }
  }

  ingestSample(
    bands: BandEnergies,
    now: number,
    transients?: BandEnergies,
    rhythm?: BrainBioRhythmInput,
  ): BrainBioPerceptionState {
    const baselineState = this.baseline.ingestSample(bands, now, transients, rhythm)
    if (Number.isFinite(this.lastSampleAt) && now <= this.lastSampleAt) {
      return { ...baselineState, regime: classifyExperimentalRegime(this.diagnostics) }
    }
    const deltaMs = Number.isFinite(this.lastSampleAt) ? Math.max(0, now - this.lastSampleAt) : 16
    this.lastSampleAt = now
    this.appendMaterial(bands, now)
    this.analyze(now, deltaMs)
    // Collegamento Visual (MVP): stesso `signals` della baseline (nessun
    // nuovo contratto pubblico), `regime` dalla classificazione sperimentale.
    return { ...baselineState, regime: classifyExperimentalRegime(this.diagnostics) }
  }

  getState(): BrainBioPerceptionState {
    return { ...this.baseline.getState(), regime: classifyExperimentalRegime(this.diagnostics) }
  }

  getRegimeDiagnostics(): BrainBioRegimeDiagnostics {
    return this.baseline.getRegimeDiagnostics()
  }

  getExperimentalDiagnostics(): ExperimentalMotorDiagnostics {
    return structuredClone(this.diagnostics)
  }
}
