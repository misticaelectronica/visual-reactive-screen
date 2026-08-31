import { describe, expect, it } from 'vitest'
import { brainBioLocalMotionScale } from './brainBioVisualResponse'

describe('contratto bio-visivo comune dei renderer Brain', () => {
  it('distingue i quattro stati senza inventare moto nel fallback', () => {
    expect(brainBioLocalMotionScale('pressurized')).toBe(1)
    expect(brainBioLocalMotionScale('respiro-alto')).toBeGreaterThan(1)
    expect(brainBioLocalMotionScale('decompression')).toBeLessThan(0.5)
    expect(brainBioLocalMotionScale('respiro-profondo')).toBeLessThan(0.2)
    expect(brainBioLocalMotionScale('unresolved')).toBe(1)
    expect(brainBioLocalMotionScale(null)).toBe(1)
  })
})
