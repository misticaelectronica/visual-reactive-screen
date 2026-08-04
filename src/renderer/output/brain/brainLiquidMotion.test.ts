import { describe, expect, it } from 'vitest'
import type { BandEnergies } from '@shared/types'
import type { BrainRhythmState } from './brainRhythm'
import { BrainLiquidMotionClock } from './brainLiquidMotion'

const silence: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }
const music: BandEnergies = { low: 0.72, lowMid: 0.48, mid: 0.36, high: 0.24 }

function rhythm(
  musicalPosition: number,
  beat = false,
): BrainRhythmState {
  return {
    beat,
    beatIndex: Math.floor(musicalPosition),
    beatPhase: musicalPosition % 1,
    musicalPosition,
    beatPulse: beat ? 1 : 0,
    beatDurationMs: 500,
    bandTransients: beat
      ? { low: 1, lowMid: 0.25, mid: 0.1, high: 0.05 }
      : silence,
  }
}

describe('BrainLiquidMotionClock', () => {
  it('mantiene il tempo per molte battute e continua a evolvere', () => {
    const clock = new BrainLiquidMotionClock()
    let state = clock.update(music, rhythm(0, true), 16)

    for (let beat = 1; beat <= 64; beat++) {
      for (let subdivision = 1; subdivision <= 10; subdivision++) {
        const position = beat - 1 + subdivision / 10
        state = clock.update(
          music,
          rhythm(position, subdivision === 10),
          50,
        )
      }
    }

    expect(state.beatPhase / (Math.PI * 2)).toBeCloseTo(64, 1)
    expect(state.evolutionPhase).toBeGreaterThan(4)
  })

  it('prosegue sul tempo stimato durante un beat perso e poi si riallinea', () => {
    const clock = new BrainLiquidMotionClock()
    clock.update(music, rhythm(0, true), 16)

    let beforeMissedBeat = clock.update(music, rhythm(0.1), 50)
    for (let step = 2; step <= 9; step++) {
      beforeMissedBeat = clock.update(music, rhythm(step / 10), 50)
    }
    let afterMissedBeat = beforeMissedBeat
    for (let step = 10; step <= 19; step++) {
      afterMissedBeat = clock.update(music, rhythm(step / 10), 50)
    }
    const recovered = clock.update(music, rhythm(2, true), 50)

    expect(afterMissedBeat.beatPhase).toBeGreaterThan(
      beforeMissedBeat.beatPhase,
    )
    expect(recovered.beatPhase / (Math.PI * 2)).toBeCloseTo(2, 1)
  })

  it('ferma l evoluzione autonoma in assenza di segnale', () => {
    const clock = new BrainLiquidMotionClock()
    const first = clock.update(silence, rhythm(0), 16)
    const second = clock.update(silence, rhythm(1), 500)

    expect(second.evolutionPhase).toBe(first.evolutionPhase)
    expect(second.activity).toBe(0)
    expect(second.kickEnvelope).toBe(0)
  })
})
