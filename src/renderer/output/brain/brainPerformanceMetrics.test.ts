import { describe, expect, it } from 'vitest'
import { summarizeMetricSeries } from './brainPerformanceMetrics'

describe('Brain performance metrics', () => {
  it('riassume gap e FPS senza alterare i campioni', () => {
    const samples = [16, 18, 17, 40, 120]
    const summary = summarizeMetricSeries(samples, true)

    expect(summary.samples).toBe(5)
    expect(summary.p50).toBe(18)
    expect(summary.p95).toBe(40)
    expect(summary.max).toBe(120)
    expect(summary.estimatedFps).toBeCloseTo(55.6, 1)
    expect(samples).toEqual([16, 18, 17, 40, 120])
  })

  it('gestisce una finestra priva di eventi', () => {
    expect(summarizeMetricSeries([])).toEqual({
      samples: 0,
      p50: 0,
      p95: 0,
      max: 0,
    })
  })
})
