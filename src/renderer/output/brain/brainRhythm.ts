import type { BandEnergies } from '@shared/types'

export type BrainRhythmState = {
  beat: boolean
  beatIndex: number
  beatPhase: number
  musicalPosition: number
  beatPulse: number
  beatDurationMs: number
  bandTransients: BandEnergies
}

const BANDS = ['low', 'lowMid', 'mid', 'high'] as const
const TRANSIENT_THRESHOLDS: BandEnergies = {
  low: 0.02,
  lowMid: 0.018,
  mid: 0.015,
  high: 0.012,
}
const TRANSIENT_RELEASE_MS: BandEnergies = {
  low: 260,
  lowMid: 220,
  mid: 180,
  high: 140,
}

export class BrainRhythmClock {
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

  ingestSample(
    bands: BandEnergies,
    timestampMs?: number,
    movingAverages?: BandEnergies,
    sequenceNumber?: number,
  ): boolean {
    if (sequenceNumber !== undefined && sequenceNumber <= this.lastSequenceNumber && this.lastSequenceNumber >= 0) {
      return false
    }
    if (sequenceNumber !== undefined) {
      this.lastSequenceNumber = sequenceNumber
    }

    const now = timestampMs ?? performance.now()
    const elapsed = this.lastIngestAt > 0 ? Math.min(150, Math.max(1, now - this.lastIngestAt)) : 16

    // Gap lungo / post-stallo: riallinea il tempo senza fare catch-up o replay di vecchi beat
    if (this.lastIngestAt > 0 && now - this.lastIngestAt > 1_500) {
      this.lastBeatAt = now
      this.musicalPosition = Math.ceil(this.musicalPosition)
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

    this.lastBeatDetectedInIngest = detectedBeat

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
      this.beatIndex = Math.max(this.beatIndex + elapsedBeats, 1)
      this.lastEmittedBeatIndex = this.beatIndex
      this.musicalPosition = this.beatIndex
      this.beatPulse = 1
    }

    return true
  }

  projectState(nowMs: number): BrainRhythmState {
    const elapsed = this.lastProjectAt > 0 ? Math.min(150, Math.max(1, nowMs - this.lastProjectAt)) : 16
    this.lastProjectAt = nowMs

    // Decay continuo dei transienti e del pulse fra campioni
    for (const band of BANDS) {
      this.bandTransients[band] *= Math.exp(-elapsed / TRANSIENT_RELEASE_MS[band])
    }
    this.beatPulse *= Math.exp(-elapsed / 180)

    let beat = this.lastBeatDetectedInIngest
    this.lastBeatDetectedInIngest = false

    const sinceBeat = nowMs - (this.lastBeatAt > 0 ? this.lastBeatAt : nowMs)
    if (!beat) {
      this.musicalPosition = this.lastBeatAt > 0
        ? this.beatIndex + sinceBeat / this.beatDurationMs
        : this.musicalPosition + elapsed / this.beatDurationMs
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

    const phase = beat ? 0 : this.musicalPosition % 1
    return {
      beat,
      beatIndex: Math.max(this.beatIndex, this.lastEmittedBeatIndex),
      beatPhase: phase,
      musicalPosition: this.musicalPosition,
      beatPulse: this.beatPulse,
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
