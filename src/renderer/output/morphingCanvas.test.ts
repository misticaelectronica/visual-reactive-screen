import { describe, expect, it } from 'vitest'
import { calculateMorphingTimeStep } from './morphingCanvas'

describe('Liquid rhythmic time', () => {
  it('accumula il delta musicale senza dipendere dalla posizione assoluta', () => {
    expect(calculateMorphingTimeStep(12.04, 12, 0.2, true)).toBeCloseTo(0.012)
    expect(calculateMorphingTimeStep(120.04, 120, 0.2, true)).toBeCloseTo(0.012)
  })

  it('limita i riallineamenti e si arresta nel silenzio', () => {
    expect(calculateMorphingTimeStep(5, 4, 0.2, true)).toBeCloseTo(0.048)
    expect(calculateMorphingTimeStep(5, 4, 0.2, false)).toBe(0)
  })
})
