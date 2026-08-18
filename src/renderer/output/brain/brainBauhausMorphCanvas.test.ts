import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import {
  advanceBauhausAbstraction,
  calculateBauhausMotion,
  computeBauhausUnderlayOpacity,
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

describe('computeBauhausUnderlayOpacity', () => {
  it('resta al soffitto durante la fase di reveal delle forme', () => {
    const silentMotion = { activity: 0, beat: 0 }
    expect(computeBauhausUnderlayOpacity(0, silentMotion)).toBeCloseTo(0.35, 5)
    expect(computeBauhausUnderlayOpacity(0.3, silentMotion)).toBeCloseTo(0.35, 5)
    expect(computeBauhausUnderlayOpacity(0.6, silentMotion)).toBeCloseTo(0.35, 5)
  })

  it('scende dal soffitto al pavimento soltanto nella fase di fade successiva', () => {
    const silentMotion = { activity: 0, beat: 0 }
    const midFade = computeBauhausUnderlayOpacity(0.8, silentMotion)
    const fullFade = computeBauhausUnderlayOpacity(1, silentMotion)
    expect(midFade).toBeLessThan(0.35)
    expect(midFade).toBeGreaterThan(0.08)
    expect(fullFade).toBeCloseTo(0.08, 5)
  })

  it('non modula col beat in silenzio', () => {
    const value = computeBauhausUnderlayOpacity(0.2, { activity: 0, beat: 1 })
    expect(value).toBeCloseTo(0.35, 5)
  })

  it('respira leggermente col beat quando c’è attività, senza sfondare il range', () => {
    const withBeat = computeBauhausUnderlayOpacity(0.2, { activity: 1, beat: 1 })
    const withoutBeat = computeBauhausUnderlayOpacity(0.2, { activity: 1, beat: 0 })
    expect(withBeat).toBeGreaterThan(withoutBeat)
    // Il respiro ha un margine dedicato oltre soffitto/pavimento, ma resta piccolo.
    expect(withBeat - withoutBeat).toBeCloseTo(0.04, 5)
    expect(withBeat).toBeLessThan(0.4)
    expect(withBeat).toBeGreaterThan(0.34)
  })
})
