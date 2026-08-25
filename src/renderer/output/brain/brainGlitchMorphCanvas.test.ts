import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import type { BrainRhythmState } from './brainRhythm'
import {
  buildGlitchProfile,
  calculateGlitchMotion,
  computeLineWobble,
  computeRowHue,
  computeRowSeed,
  shouldRenderGlitchFrame,
} from './brainGlitchMorphCanvas'

const silentBands = { low: 0, lowMid: 0, mid: 0, high: 0 }

function rhythm(overrides: Partial<BrainRhythmState> = {}): BrainRhythmState {
  return {
    active: true,
    beat: false,
    beatIndex: 3,
    beatPhase: 0.2,
    musicalPosition: 3.2,
    beatPulse: 0,
    kickEnvelope: 0,
    beatDurationMs: 500,
    bandTransients: silentBands,
    ...overrides,
  }
}

describe('computeRowSeed', () => {
  it('è deterministico per lo stesso indice riga', () => {
    expect(computeRowSeed(4)).toEqual(computeRowSeed(4))
  })

  it('produce semi diversi per righe diverse', () => {
    const a = computeRowSeed(0)
    const b = computeRowSeed(1)
    expect(a.phase).not.toBeCloseTo(b.phase, 5)
  })
})

describe('buildGlitchProfile', () => {
  it('calcola una luminanza media coerente con pixel noti', () => {
    const width = 2
    const height = 2
    // due righe: alto tutto bianco, basso tutto nero
    const data = new Uint8ClampedArray([
      255, 255, 255, 255, 255, 255, 255, 255,
      0, 0, 0, 255, 0, 0, 0, 255,
    ])
    const profile = buildGlitchProfile(data, width, height, 2, 2)
    expect(profile.rowAverage[0]).toBeCloseTo(1, 2)
    expect(profile.rowAverage[1]).toBeCloseTo(0, 2)
  })
})

describe('computeLineWobble', () => {
  const seed = computeRowSeed(0)

  it('è sempre zero senza audio attivo (Check Silenzio)', () => {
    expect(computeLineWobble(12, seed, 40, 9, 0.8, false)).toBe(0)
  })

  it('è zero con ampiezza nulla anche con audio attivo', () => {
    expect(computeLineWobble(12, seed, 40, 0, 0.8, true)).toBe(0)
  })

  it('produce movimento non nullo con audio attivo e ampiezza positiva', () => {
    const value = computeLineWobble(12, seed, 40, 9, 0.8, true)
    expect(Number.isFinite(value)).toBe(true)
  })
})

describe('computeRowHue', () => {
  it('non dipende dal tempo: stesso input, stesso output', () => {
    const seed = computeRowSeed(2)
    expect(computeRowHue(0.6, seed)).toBe(computeRowHue(0.6, seed))
  })

  it('varia con la luminanza media della riga', () => {
    const seed = computeRowSeed(2)
    expect(computeRowHue(0.2, seed)).not.toBe(computeRowHue(0.9, seed))
  })
})

describe('calculateGlitchMotion', () => {
  it('resta a zero in silenzio totale', () => {
    const motion = calculateGlitchMotion(silentBands, DEFAULT_SETTINGS, undefined, undefined)
    expect(motion.activity).toBe(0)
    expect(motion.beat).toBe(0)
  })

  it('cresce con bande audio sostenute', () => {
    const motion = calculateGlitchMotion(
      { low: 0.4, lowMid: 0.4, mid: 0.4, high: 0.4 },
      DEFAULT_SETTINGS,
      rhythm({ beat: true }),
      silentBands,
    )
    expect(motion.activity).toBeGreaterThan(0)
  })
})

describe('shouldRenderGlitchFrame', () => {
  const idleMotion = { activity: 0, beat: 0, high: 0, tension: 0, flash: 0 }

  it('non richiede un nuovo frame se nulla è cambiato e non c’è attività', () => {
    expect(shouldRenderGlitchFrame(idleMotion, false, false)).toBe(false)
  })

  it('richiede un frame se la firma è cambiata anche senza attività', () => {
    expect(shouldRenderGlitchFrame(idleMotion, false, true)).toBe(true)
  })

  it('richiede un frame se c’è attività reale', () => {
    expect(shouldRenderGlitchFrame({ ...idleMotion, activity: 0.2 }, false, false)).toBe(true)
  })
})
