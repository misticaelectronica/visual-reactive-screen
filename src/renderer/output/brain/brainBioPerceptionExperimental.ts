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
// Disallineamento concettuale segnalato dall'Analisi Audio (brief
// 2026-09-13, "risposta sulla sessione experimental dell'11/9"): la
// direzione (pressurized/decompression) descrive la direzione della
// COSTRIZIONE, non una variazione locale dell'ancoraggio. Una variazione
// dell'anchoring è "evidenza possibile", non significato del regime. Il
// codice usava finora `anchoring.gaining/losing` (delta dell'ancoraggio)
// per decidere la direzione — sostituito con `constraint.direction`,
// calcolato sulla costrizione stessa, con lo stesso confronto a lungo
// raggio già validato per l'ancoraggio (compare col proprio valore di
// qualche secondo fa, non col campione immediatamente precedente: un
// passaggio reale ma graduale ha un delta per singolo passo troppo
// piccolo per qualunque soglia sensata).
const CONSTRAINT_TREND_LAG_MS = 6_000
const CONSTRAINT_TREND_DEADBAND = 0.09
// Seconda parte dello stesso disallineamento: un valore di `constraint`,
// da solo, non autorizza respiro-alto/profondo — serve un vero
// assestamento (§10/§11 del brief: "persistenza della configurazione →
// assestamento", non "assenza di direzione dominante"). Soglia permissiva
// (non discrimina bene: `evidence` misurato 0,62-0,84 su tutto il corpus,
// compresi i file transitivi) — serve solo da pavimento contro un'evidenza
// davvero insufficiente, non da criterio fine. La disposizione percettiva
// esplicitamente non prescrive una lista tecnica di requisiti (§8).
const SETTLEMENT_EVIDENCE_THRESHOLD = 0.5
// Transitorio d'avvio della memoria (bug evidente, MVP 2026-09-11): appena
// `ready` diventa vero, `anchor`/`constraint` sono ancora vicini a zero per
// costruzione (nessun ciclo ancora confermato) — non è un vero
// respiro-profondo (stasi assestata), è l'istante prima che l'ancoraggio
// abbia potuto formarsi. Grace temporale breve, non legata al VALORE
// raggiunto da `anchor` (i file realmente a bassa costrizione non lo
// superano mai per tutta la durata: legarla al valore sopprimerebbe
// respiro-profondo ovunque su quei file, non solo all'avvio).
const ANCHOR_WARMUP_GRACE_MS = 1_500
// Conferma per persistenza: vedi commento su `resolveRegime` nella classe.
const REGIME_CONFIRM_MS = 2_000

export type ExperimentalBin = {
  bands: BandEnergies
  onsets: BandEnergies
}

export type ExperimentalMotorDiagnostics = {
  ready: boolean
  observedMs: number
  organization: { periodMs: number; recurrence: number; eventActivity: number }
  entrainment: { physicalConfirmation: number; cyclePersistence: number }
  anchoring: { value: number; warmedUp: boolean }
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

// Tracciamento del picco (revisione d'impianto, 2026-09-12, dopo ricerca
// bibliografica — Müller, "Fundamentals of Music Processing", tempogram ad
// autocorrelazione, audiolabs-erlangen.de/resources/MIR/FMP/C6/
// C6S2_TempogramAutocorrelation.html): scegliere a ogni finestra il lag di
// correlazione massima assoluta, senza inerzia verso il periodo già
// riconosciuto, è instabile quando più candidati hanno forza simile — il
// periodo rilevato salta fra valori vicini in ampiezza (osservato: 1075,
// 750, 1025, 375, 275ms sullo stesso brano in pochi secondi) anche quando
// il materiale non è cambiato. La tecnica documentata è dare inerzia al
// periodo precedente: cambiarlo solo se un nuovo candidato è chiaramente
// più forte, non ad ogni finestra.
const PERIOD_SWITCH_MARGIN = 0.08

export function analyzeExperimentalTemporalWindow(
  bins: ExperimentalBin[],
  previousPeriodBins = 0,
): {
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
  if (
    previousPeriodBins >= minLag &&
    previousPeriodBins <= maxLag &&
    periodBins !== previousPeriodBins
  ) {
    const previousCorrelation = pearsonAtLag(bins, previousPeriodBins)
    if (previousCorrelation >= recurrence - PERIOD_SWITCH_MARGIN) {
      periodBins = previousPeriodBins
      recurrence = previousCorrelation
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

// Collegamento Visual, riscritto secondo la semantica stabilita
// dall'Analisi Audio (brief 2026-09-13): direzione della costrizione →
// trasformazione, persistenza della configurazione → assestamento.
// `constraint.direction` (rising/falling, confronto a lungo raggio — vedi
// `CONSTRAINT_TREND_LAG_MS`) decide passaggio/stasi; `settlement` (già
// calcolato) autorizza l'ingresso in alto/profondo solo se la
// configurazione è davvero assestata, non semplicemente perché la
// direzione è "stable" — un'oscillazione a media nulla (falsa stasi,
// caso di riferimento test-1.mp3) non è assestamento.
export function classifyExperimentalRegime(diagnostics: ExperimentalMotorDiagnostics): BrainBioRegime {
  if (!diagnostics.ready) return 'unresolved'
  // `warmedUp`: appena la memoria diventa `ready`, la costrizione è ancora
  // vicina a zero per costruzione (nessun ciclo ancora confermato) — non è
  // un'evidenza sufficiente per nessuno stato, `unresolved` è la lettura
  // onesta finché l'ancoraggio non ha potuto formarsi.
  if (!diagnostics.anchoring.warmedUp) return 'unresolved'
  if (diagnostics.constraint.direction === 'rising') return 'pressurized'
  if (diagnostics.constraint.direction === 'falling') return 'decompression'
  const settled = diagnostics.settlement.evidence >= SETTLEMENT_EVIDENCE_THRESHOLD &&
    !diagnostics.settlement.oscillatingTransformation
  if (!settled) return 'unresolved'
  return diagnostics.constraint.value >= ALTO_CONSTRAINT_THRESHOLD ? 'respiro-alto' : 'respiro-profondo'
}

function initialDiagnostics(): ExperimentalMotorDiagnostics {
  return {
    ready: false,
    observedMs: 0,
    organization: { periodMs: 0, recurrence: 0, eventActivity: 0 },
    entrainment: { physicalConfirmation: 0, cyclePersistence: 0 },
    anchoring: { value: 0, warmedUp: false },
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
  private previousPeriodBins = 0
  private readyAt = Number.NaN
  private constraintTrajectory = 0
  // Storia di `constraint` per il confronto a lungo raggio
  // (`CONSTRAINT_TREND_LAG_MS`): coppie [timestamp, valore] in ordine
  // crescente di tempo, potatura di quelle più vecchie del raggio a ogni
  // analisi.
  private constraintHistory: Array<[number, number]> = []
  private diagnostics = initialDiagnostics()
  private emittedRegime: BrainBioRegime = 'unresolved'
  private candidateRegime: BrainBioRegime = 'unresolved'
  private candidateSince = Number.NEGATIVE_INFINITY

  // Conferma per persistenza (bug evidente, segnalato dal Capo Supremo
  // 2026-09-11: cambi troppo rapidi fra pressurized/decompression "senza
  // dare tempo al corpo di capire" — confermato dal log della sessione live
  // dell'11/9: 42 cambi in 322s, 21 segmenti su 43 sotto i 2s, 12 sotto 1s).
  // Un primo tentativo (permanenza minima: accettare comunque il candidato
  // corrente dopo un'attesa fissa) è stato insufficiente in collaudo dal
  // vivo: i cambi cadevano quasi tutti esattamente sul bordo dell'attesa
  // (2.0s, 2.166s, 2.0s, 2.5s...) — il timer non verificava NULLA sul
  // candidato stesso, si limitava a lasciar passare quello che c'era in
  // quell'istante. Sostituito con una vera conferma per persistenza, stesso
  // principio già in uso nella baseline per `reference`
  // (`REFERENCE_CONFIRM_MS`: la nuova lettura deve restare la stessa per
  // tutta la finestra, non solo comparire una volta al suo scadere): il
  // regime cambia solo quando lo stesso candidato si ripete stabilmente per
  // REGIME_CONFIRM_MS, non quando scade un timer indipendente da cosa sta
  // succedendo davvero.
  private resolveRegime(now: number): BrainBioRegime {
    const candidate = classifyExperimentalRegime(this.diagnostics)
    if (candidate !== this.candidateRegime) {
      this.candidateRegime = candidate
      this.candidateSince = now
    }
    if (candidate === this.emittedRegime) return this.emittedRegime
    const confirmExempt = this.emittedRegime === 'unresolved'
    if (confirmExempt || now - this.candidateSince >= REGIME_CONFIRM_MS) {
      this.emittedRegime = this.candidateRegime
    }
    return this.emittedRegime
  }

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
    const observation = analyzeExperimentalTemporalWindow(this.bins, this.previousPeriodBins)
    this.previousPeriodBins = Math.round(observation.periodMs / BIN_MS)
    // Ricorrenza e persistenza devono essere entrambe presenti: nessuna delle
    // due autorizza l'ancoraggio da sola.
    const anchorTarget = observation.recurrence * observation.cyclePersistence
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
    const previousConstraint = this.constraintTrajectory
    this.constraintTrajectory = ema(
      this.constraintTrajectory,
      constraint,
      Math.max(ANALYSIS_INTERVAL_MS, deltaMs),
      CONSTRAINT_TRAJECTORY_MS,
    )
    // Direzione della costrizione (§4/§6 del brief Analisi Audio
    // 2026-09-13): confronto con il proprio valore di
    // `CONSTRAINT_TREND_LAG_MS` fa, non col campione immediatamente
    // precedente — un passaggio reale ma graduale ha un delta per singolo
    // passo troppo piccolo per qualunque soglia sensata; letto su una
    // finestra più lunga i piccoli passi si sommano in un segnale chiaro,
    // mentre il rumore campione-a-campione (non direzionale) non si
    // accumula. Ricade sul campione precedente se la memoria è troppo
    // giovane per il confronto a lungo raggio.
    const laggedTarget = now - CONSTRAINT_TREND_LAG_MS
    let laggedConstraint = previousConstraint
    for (const [t, value] of this.constraintHistory) {
      if (t <= laggedTarget) laggedConstraint = value
      else break
    }
    this.constraintHistory.push([now, constraint])
    const pruneBefore = now - CONSTRAINT_TREND_LAG_MS * 2
    while (this.constraintHistory.length > 0 && this.constraintHistory[0][0] < pruneBefore) {
      this.constraintHistory.shift()
    }
    const direction = constraint > laggedConstraint + CONSTRAINT_TREND_DEADBAND
      ? 'rising'
      : constraint < laggedConstraint - CONSTRAINT_TREND_DEADBAND
        ? 'falling'
        : 'stable'
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
      anchoring: { value: this.anchor, warmedUp: now - this.readyAt >= ANCHOR_WARMUP_GRACE_MS },
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
      return { ...baselineState, regime: this.resolveRegime(now) }
    }
    const deltaMs = Number.isFinite(this.lastSampleAt) ? Math.max(0, now - this.lastSampleAt) : 16
    this.lastSampleAt = now
    this.appendMaterial(bands, now)
    this.analyze(now, deltaMs)
    // Collegamento Visual (MVP): stesso `signals` della baseline (nessun
    // nuovo contratto pubblico), `regime` dalla classificazione sperimentale
    // con permanenza minima di stato (`resolveRegime`).
    return { ...baselineState, regime: this.resolveRegime(now) }
  }

  getState(): BrainBioPerceptionState {
    return { ...this.baseline.getState(), regime: this.resolveRegime(this.lastSampleAt) }
  }

  getRegimeDiagnostics(): BrainBioRegimeDiagnostics {
    return this.baseline.getRegimeDiagnostics()
  }

  getExperimentalDiagnostics(): ExperimentalMotorDiagnostics {
    return structuredClone(this.diagnostics)
  }
}
