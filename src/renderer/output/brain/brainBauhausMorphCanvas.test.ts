import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import {
  advanceBauhausAbstraction,
  calculateBauhausMotion,
} from './brainBauhausMorphCanvas'
import type { BrainRhythmState } from './brainRhythm'

const silent = { low: 0, lowMid: 0, mid: 0, high: 0 }

function rhythm(overrides: Partial<BrainRhythmState> = {}): BrainRhythmState {
  return {
    active: true,
    beat: false,
    beatIndex: 2,
    beatPhase: 0.35,
    musicalPosition: 2.35,
    beatPulse: 0,
    kickEnvelope: 0,
    beatDurationMs: 500,
    bandTransients: silent,
    ...overrides,
  }
}

describe('Bauhaus Morph motion', () => {
  it('mantiene progresso e moto fermi nel silenzio', () => {
    const stoppedRhythm = rhythm({ active: false, musicalPosition: 12 })
    const motion = calculateBauhausMotion(
      { low: 0.7, lowMid: 0.6, mid: 0.5, high: 0.4 },
      DEFAULT_SETTINGS,
      stoppedRhythm,
    )
    expect(motion.activity).toBe(0)
    expect(motion.phase).toBe(0)
    expect(motion.mass + motion.surface + motion.lines + motion.detail).toBe(0)
    expect(advanceBauhausAbstraction(0.42, 2, stoppedRhythm, motion)).toBe(0.42)
  })

  it('fa avanzare il morph soltanto con posizione musicale e attività', () => {
    const activeRhythm = rhythm({
      musicalPosition: 2.5,
      beat: true,
      beatPulse: 0.8,
      kickEnvelope: 0.9,
      bandTransients: { low: 0.4, lowMid: 0.5, mid: 0.2, high: 0.1 },
    })
    const motion = calculateBauhausMotion(
      { low: 0.72, lowMid: 0.66, mid: 0.38, high: 0.2 },
      DEFAULT_SETTINGS,
      activeRhythm,
    )
    expect(motion.mass).toBeGreaterThan(0)
    expect(motion.surface).toBeGreaterThan(0)
    expect(motion.lines).toBeGreaterThan(0)
    expect(advanceBauhausAbstraction(0.2, 2.35, activeRhythm, motion)).toBeGreaterThan(0.2)
  })

  it('mantiene le alte sui dettagli senza aumentare il peso delle masse', () => {
    const highOnly = calculateBauhausMotion(
      { low: 0, lowMid: 0, mid: 0, high: 0.8 },
      DEFAULT_SETTINGS,
      rhythm({ bandTransients: { ...silent, high: 0.7 } }),
    )
    expect(highOnly.detail).toBeGreaterThan(0.5)
    expect(highOnly.mass).toBe(0)
  })
})
