import type { BandEnergies } from '@shared/types'

export type BrainRhythmState = {
  /** False quando non esiste energia sufficiente per avanzare la geometria. */
  active?: boolean
  beat: boolean
  beatIndex: number
  beatPhase: number
  musicalPosition: number
  beatPulse: number
  kickEnvelope: number
  beatDurationMs: number
  bandTransients: BandEnergies
}

const BANDS = ['low', 'lowMid', 'mid', 'high'] as const
const TRANSIENT_THRESHOLDS: BandEnergies = {
  low: 0.02,
  lowMid: 0.018,
  mid: 0.015,
  high: 0.022,
}
const TRANSIENT_RELEASE_MS: BandEnergies = {
  low: 260,
  lowMid: 220,
  mid: 180,
  high: 75,
}

const STALE_PACKET_AGE_MS = 1_500
const LONG_SAMPLE_GAP_MS = 1_500
const MAX_PROJECTION_STEP_MS = 300
const SIGNAL_ENTER_ENERGY = 0.018
const SIGNAL_EXIT_ENERGY = 0.008
const SILENCE_HOLD_MS = 900

type BrainRhythmClockHooks = {
  onStalePacketIgnored?: () => void
  onPhaseRealignment?: () => void
}

export function calculateBrainKickEnvelope(
  beatPulse: number,
  lowTransient: number,
  lowMidTransient: number,
): number {
  return Math.max(
    0,
    Math.min(
      1,
      Math.max(
        beatPulse,
        beatPulse * 0.82 + lowTransient * 0.26 + lowMidTransient * 0.08,
      ),
    ),
  )
}

/**
 * Fronte ritmico comune ai renderer. Non dipende dall'energia sostenuta: un
 * kick valido resta leggibile nei passaggi scarni e il silenzio dichiarato dal
 * clock non può produrre un impulso artificiale.
 */
export function calculateRhythmicAccent(
  rhythm?: BrainRhythmState,
): number {
  if (!rhythm || rhythm.active === false) return 0
  return Math.max(
    0,
    Math.min(
      1,
      Math.max(
        rhythm.kickEnvelope,
        rhythm.beatPulse,
        rhythm.bandTransients.low * 0.86 + rhythm.bandTransients.lowMid * 0.24,
      ),
    ),
  )
}

export class OutputRhythmClock {
  private baseline = 0.08
  private previousBands: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }
  private currentBands: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }
  private movingAverages: BandEnergies = { low: 0.05, lowMid: 0.05, mid: 0.05, high: 0.05 }
  private bandTransients: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }
  private lastIngestAt = 0
  private lastProjectAt = 0
  private lastBeatAt = 0
  private beatDurationMs = 500
  private beatIndex = 0
  private beatPulse = 0
  private musicalPosition = 0
  private readonly beatIntervals: number[] = []
  private lastEmittedBeatIndex = 0
  private lastSequenceNumber = -1
  private lastBeatDetectedInIngest = false
  private skipNextProjectionAdvance = false
  private signalActive = false
  private lastAudibleAt = 0

  constructor(private readonly hooks: BrainRhythmClockHooks = {}) {}

  private updateSignalActivity(bands: BandEnergies, now: number): void {
    const energy = bands.low + bands.lowMid + bands.mid + bands.high
    if (energy >= SIGNAL_ENTER_ENERGY) {
      this.signalActive = true
      this.lastAudibleAt = now
      return
    }
    if (
      this.signalActive &&
      energy < SIGNAL_EXIT_ENERGY &&
      now - this.lastAudibleAt >= SILENCE_HOLD_MS
    ) {
      this.signalActive = false
    }
  }

  ingestSample(
    bands: BandEnergies,
    timestampMs?: number,
    movingAverages?: BandEnergies,
    sequenceNumber?: number,
    receivedAtMs?: number,
  ): boolean {
    const now = timestampMs ?? receivedAtMs ?? performance.now()
    const staleBySequence =
      sequenceNumber !== undefined &&
      this.lastSequenceNumber >= 0 &&
      sequenceNumber <= this.lastSequenceNumber
    const staleByAge =
      timestampMs !== undefined &&
      receivedAtMs !== undefined &&
      receivedAtMs - timestampMs > STALE_PACKET_AGE_MS
    const staleByTimestamp = this.lastIngestAt > 0 && now <= this.lastIngestAt
    if (staleBySequence || staleByAge || staleByTimestamp) {
      this.hooks.onStalePacketIgnored?.()
      return false
    }
    if (sequenceNumber !== undefined) {
      this.lastSequenceNumber = sequenceNumber
    }

    const sampleGap = this.lastIngestAt > 0 ? now - this.lastIngestAt : 0
    const elapsed = sampleGap > 0 ? Math.min(150, sampleGap) : 16
    this.updateSignalActivity(bands, now)

    // Gap lungo / post-stallo: riallinea senza trasformare il livello corrente
    // in un nuovo transiente e senza ripercorrere beat intermedi.
    if (sampleGap > LONG_SAMPLE_GAP_MS) {
      this.lastBeatAt = now
      this.musicalPosition = Math.max(
        this.musicalPosition,
        Math.ceil(this.musicalPosition),
      )
      this.beatIndex = Math.max(this.beatIndex, Math.floor(this.musicalPosition))
      this.lastEmittedBeatIndex = Math.max(
        this.lastEmittedBeatIndex,
        this.beatIndex,
      )
      this.previousBands = { ...bands }
      this.currentBands = { ...bands }
      this.bandTransients = { low: 0, lowMid: 0, mid: 0, high: 0 }
      this.beatPulse = 0
      if (movingAverages) this.movingAverages = { ...movingAverages }
      this.lastIngestAt = now
      this.lastBeatDetectedInIngest = false
      this.skipNextProjectionAdvance = true
      this.hooks.onPhaseRealignment?.()
      return true
    }

    this.lastIngestAt = now
    this.currentBands = { ...bands }
    if (movingAverages) this.movingAverages = { ...movingAverages }

    const transientTargets: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }
    for (const band of BANDS) {
      const delta = bands[band] - this.previousBands[band]
      transientTargets[band] = Math.max(
        0,
        Math.min(1, (delta - TRANSIENT_THRESHOLDS[band]) * 5.5),
      )
      const current = this.bandTransients[band]
      if (transientTargets[band] > current) {
        const attackBlend = 1 - Math.exp(-elapsed / 28)
        this.bandTransients[band] += (transientTargets[band] - current) * attackBlend
      }
      this.previousBands[band] = bands[band]
    }

    const baselineBlend = 1 - Math.exp(-elapsed / 2_200)
    this.baseline += (bands.low - this.baseline) * baselineBlend
    const sinceBeat = now - this.lastBeatAt
    const lowBaseline = Math.max(0.025, movingAverages?.low ?? this.baseline)
    const lowMidBaseline = Math.max(0.02, movingAverages?.lowMid ?? this.previousBands.lowMid)
    const lowLift = (bands.low - lowBaseline) / (lowBaseline + 0.035)
    const lowMidLift = (bands.lowMid - lowMidBaseline) / (lowMidBaseline + 0.03)

    const detectedBeat =
      sinceBeat >= 240 &&
      bands.low >= Math.max(0.075, lowBaseline * 1.08) &&
      (
        (transientTargets.low >= 0.012 && lowLift >= 0.08) ||
        (transientTargets.lowMid >= 0.035 && lowMidLift >= 0.12)
      )

    // Il trasporto può consegnare più campioni prima del RAF successivo.
    // Mantieni il beat rilevato finché projectState() non lo consuma, altrimenti
    // un campione immediatamente successivo senza attacco lo cancellerebbe.
    this.lastBeatDetectedInIngest =
      this.lastBeatDetectedInIngest || detectedBeat

    if (detectedBeat) {
      if (this.lastBeatAt > 0 && sinceBeat >= 260 && sinceBeat <= 1_200) {
        let normalizedInterval = sinceBeat
        if (sinceBeat > this.beatDurationMs * 1.55 && sinceBeat / 2 >= 260) {
          normalizedInterval = sinceBeat / 2
        } else if (sinceBeat < this.beatDurationMs * 0.68 && sinceBeat * 2 <= 1_200) {
          normalizedInterval = sinceBeat * 2
        }
        this.beatIntervals.push(normalizedInterval)
        if (this.beatIntervals.length > 7) this.beatIntervals.shift()
        const sortedIntervals = [...this.beatIntervals].sort((left, right) => left - right)
        const median = sortedIntervals[Math.floor(sortedIntervals.length / 2)]
        this.beatDurationMs = this.beatDurationMs * 0.68 + median * 0.32
      }
      const elapsedBeats = this.lastBeatAt > 0
        ? Math.max(1, Math.round(sinceBeat / this.beatDurationMs))
        : 1
      this.lastBeatAt = now
      // Il fronte reale diventa il nuovo riferimento. Se la proiezione era già
      // oltre l'indice rilevato, avanza al prossimo intero senza tornare
      // indietro: il frame seguente riparte realmente vicino a fase zero.
      const phaseAlignedBeatIndex = Math.max(
        this.beatIndex + elapsedBeats,
        this.lastEmittedBeatIndex,
        Math.ceil(this.musicalPosition),
        1,
      )
      this.beatIndex = phaseAlignedBeatIndex
      this.lastEmittedBeatIndex = phaseAlignedBeatIndex
      this.musicalPosition = phaseAlignedBeatIndex
      this.beatPulse = 1
    }

    return true
  }

  projectState(nowMs: number): BrainRhythmState {
    const elapsed = this.lastProjectAt > 0
      ? Math.min(MAX_PROJECTION_STEP_MS, Math.max(0, nowMs - this.lastProjectAt))
      : 16
    this.lastProjectAt = nowMs

    // Decay continuo dei transienti e del pulse fra campioni
    for (const band of BANDS) {
      this.bandTransients[band] *= Math.exp(-elapsed / TRANSIENT_RELEASE_MS[band])
    }
    this.beatPulse *= Math.exp(-elapsed / 180)

    let beat = this.lastBeatDetectedInIngest
    this.lastBeatDetectedInIngest = false

    this.updateSignalActivity(this.currentBands, nowMs)
    const active = this.signalActive

    if (!beat && !this.skipNextProjectionAdvance && active) {
      // Avanzamento solo del delta locale clampato: nessun catch-up dopo RAF sospesi.
      this.musicalPosition += elapsed / this.beatDurationMs
      const predictedBeatIndex = Math.floor(this.musicalPosition)
      const lowBaseline = Math.max(0.025, this.movingAverages.low ?? this.baseline)
      const predictionHasEnergy =
        this.currentBands.low + this.currentBands.lowMid >= 0.1 &&
        this.currentBands.low >= lowBaseline * 0.88
      if (
        this.beatIntervals.length >= 2 &&
        predictionHasEnergy &&
        predictedBeatIndex > this.lastEmittedBeatIndex
      ) {
        beat = true
        this.lastEmittedBeatIndex = predictedBeatIndex
        this.beatPulse = 1
      }
    }
    this.skipNextProjectionAdvance = false

    const phase = beat ? 0 : this.musicalPosition % 1
    const kickEnvelope = calculateBrainKickEnvelope(
      this.beatPulse,
      this.bandTransients.low,
      this.bandTransients.lowMid,
    )
    return {
      active,
      beat,
      beatIndex: Math.max(this.beatIndex, this.lastEmittedBeatIndex),
      beatPhase: phase,
      musicalPosition: this.musicalPosition,
      beatPulse: this.beatPulse,
      kickEnvelope,
      beatDurationMs: this.beatDurationMs,
      bandTransients: { ...this.bandTransients },
    }
  }

  update(
    bands: BandEnergies,
    now: number,
    movingAverages?: BandEnergies,
  ): BrainRhythmState {
    this.ingestSample(bands, now, movingAverages)
    return this.projectState(now)
  }
}

/** Alias mantenuto per compatibilità dei test e dei moduli Brain esistenti. */
export { OutputRhythmClock as BrainRhythmClock }
