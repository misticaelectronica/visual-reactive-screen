import type { BandEnergies } from '@shared/types'

export type BrainRhythmState = {
  beat: boolean
  beatIndex: number
  beatPhase: number
  beatPulse: number
  beatDurationMs: number
}

export class BrainRhythmClock {
  private baseline = 0.08
  private previousLow = 0
  private lastUpdateAt = 0
  private lastBeatAt = 0
  private beatDurationMs = 500
  private beatIndex = 0
  private beatPulse = 0

  update(bands: BandEnergies, now: number): BrainRhythmState {
    const elapsed = this.lastUpdateAt > 0 ? Math.min(150, now - this.lastUpdateAt) : 16
    this.lastUpdateAt = now
    const baselineBlend = 1 - Math.exp(-elapsed / 2_200)
    this.baseline += (bands.low - this.baseline) * baselineBlend
    const transient = bands.low - this.previousLow
    this.previousLow = bands.low
    const sinceBeat = now - this.lastBeatAt
    const beat =
      sinceBeat >= 240 &&
      bands.low >= Math.max(0.12, this.baseline * 1.16) &&
      transient >= 0.025

    if (beat) {
      if (this.lastBeatAt > 0 && sinceBeat >= 260 && sinceBeat <= 1_200) {
        this.beatDurationMs = this.beatDurationMs * 0.72 + sinceBeat * 0.28
      }
      this.lastBeatAt = now
      this.beatIndex += 1
      this.beatPulse = 1
    } else {
      this.beatPulse *= Math.exp(-elapsed / 210)
    }

    const phase =
      this.lastBeatAt > 0
        ? ((now - this.lastBeatAt) / this.beatDurationMs) % 1
        : (now / this.beatDurationMs) % 1
    return {
      beat,
      beatIndex: this.beatIndex,
      beatPhase: phase,
      beatPulse: this.beatPulse,
      beatDurationMs: this.beatDurationMs,
    }
  }
}
