import type { BandEnergies } from '@shared/types'

export type BrainCanvasMotionTargets = BandEnergies & {
  activity: number
  beat: number
}

const ZERO_TARGETS: BrainCanvasMotionTargets = {
  low: 0,
  lowMid: 0,
  mid: 0,
  high: 0,
  activity: 0,
  beat: 0,
}

const ATTACK_BEATS: BrainCanvasMotionTargets = {
  low: 0.22,
  lowMid: 0.17,
  mid: 0.12,
  high: 0.075,
  activity: 0.16,
  beat: 0.035,
}

const RELEASE_BEATS: BrainCanvasMotionTargets = {
  low: 0.7,
  lowMid: 0.56,
  mid: 0.42,
  high: 0.3,
  activity: 0.5,
  beat: 0.24,
}

const CHANNELS = [
  'low',
  'lowMid',
  'mid',
  'high',
  'activity',
  'beat',
] as const

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value))
}

/**
 * Inviluppi locali espressi in frazioni di beat. Non possiede un clock: usa
 * soltanto il delta consegnato dall'Output e si azzera immediatamente quando
 * il clock dichiara silenzio, evitando code geometriche autonome.
 */
export class BrainCanvasMotionSmoother {
  private values: BrainCanvasMotionTargets = { ...ZERO_TARGETS }

  update(
    targets: BrainCanvasMotionTargets,
    elapsedMs: number,
    beatDurationMs: number,
    active: boolean,
    profile: 'dub' | 'techno' | 'ambient',
  ): BrainCanvasMotionTargets {
    if (!active) {
      this.values = { ...ZERO_TARGETS }
      return { ...this.values }
    }
    const elapsed = Math.max(0, Math.min(100, elapsedMs))
    const beatMs = Math.max(240, Math.min(1_200, beatDurationMs))
    const profileScale = profile === 'ambient' ? 1.28 : profile === 'techno' ? 0.82 : 1
    for (const channel of CHANNELS) {
      const target = clamp(targets[channel])
      const rising = target > this.values[channel]
      const beats = rising ? ATTACK_BEATS[channel] : RELEASE_BEATS[channel]
      const responseMs = Math.max(18, beatMs * beats * profileScale)
      const blend = 1 - Math.exp(-elapsed / responseMs)
      this.values[channel] += (target - this.values[channel]) * blend
    }
    return { ...this.values }
  }

  reset(): void {
    this.values = { ...ZERO_TARGETS }
  }
}

