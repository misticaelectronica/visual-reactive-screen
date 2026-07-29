import { describe, expect, it } from 'vitest'
import {
  classifierFreeGuidance,
  createSd15EulerSchedule,
  eulerStep,
} from './sd15Scheduler'

describe('scheduler SD 1.5 browser', () => {
  it('produce una sequenza di rumore decrescente che termina a zero', () => {
    const schedule = createSd15EulerSchedule(24)
    expect(schedule).toHaveLength(24)
    expect(schedule[0].sigma).toBeGreaterThan(schedule[1].sigma)
    expect(schedule.at(-1)?.nextSigma).toBe(0)
  })

  it('applica classifier-free guidance senza modificare i buffer sorgente', () => {
    const source = new Float32Array([1, 2, 3, 6])
    expect(Array.from(classifierFreeGuidance(source, 2))).toEqual([5, 10])
    expect(Array.from(source)).toEqual([1, 2, 3, 6])
  })

  it('esegue uno step Euler coerente', () => {
    const result = eulerStep(
      new Float32Array([4, 8]),
      new Float32Array([1, -2]),
      2,
      1,
    )
    expect(Array.from(result)).toEqual([3, 10])
  })
})
