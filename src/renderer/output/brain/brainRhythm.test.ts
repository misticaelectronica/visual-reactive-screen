import { describe, expect, it } from 'vitest'
import { BrainRhythmClock } from './brainRhythm'

describe('BrainRhythmClock', () => {
  it('rileva transienti bassi e stima il tempo senza duplicare lo stesso picco', () => {
    const clock = new BrainRhythmClock()
    const quiet = { low: 0.05, lowMid: 0.04, mid: 0.03, high: 0.02 }
    const kick = { ...quiet, low: 0.8 }

    expect(clock.update(quiet, 100).beat).toBe(false)
    expect(clock.update(kick, 500).beat).toBe(true)
    expect(clock.update(kick, 540).beat).toBe(false)
    clock.update(quiet, 760)
    const secondBeat = clock.update(kick, 1_000)

    expect(secondBeat.beat).toBe(true)
    expect(secondBeat.beatIndex).toBe(2)
    expect(secondBeat.beatDurationMs).toBeCloseTo(500, 0)
  })

  it('mantiene una fase musicale continua anche senza transienti', () => {
    const clock = new BrainRhythmClock()
    const quiet = { low: 0, lowMid: 0, mid: 0, high: 0 }

    const first = clock.update(quiet, 250)
    const second = clock.update(quiet, 375)

    expect(second.beat).toBe(false)
    expect(second.beatPhase).toBeGreaterThan(first.beatPhase)
  })
})
