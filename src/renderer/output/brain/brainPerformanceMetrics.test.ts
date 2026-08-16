import { describe, expect, it } from 'vitest'
import {
  BrainPerformanceMetrics,
  summarizeMetricSeries,
} from './brainPerformanceMetrics'

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

  it('riporta coalescenza, pacchetti stantii e riallineamenti di fase', () => {
    const metrics = new BrainPerformanceMetrics()
    metrics.recordVisualPacket(
      { sequence: 10, sentAtEpochMs: 9_990, replacedPendingCount: 2 },
      10_000,
      100,
    )
    metrics.recordVisualPacket(
      { sequence: 13, sentAtEpochMs: 10_010, replacedPendingCount: 5 },
      10_020,
      120,
    )
    metrics.recordStalePacketIgnored()
    metrics.recordPhaseRealignment()

    const summary = metrics.report(1_000)

    expect(summary?.visualPackets.received).toBe(2)
    expect(summary?.visualPackets.missed).toBe(2)
    expect(summary?.visualPackets.replacedPending).toBe(5)
    expect(summary?.visualPackets.staleIgnored).toBe(1)
    expect(summary?.visualPackets.phaseRealignments).toBe(1)
  })

  it('separa i frame del passthrough dal renderer plugin', () => {
    const metrics = new BrainPerformanceMetrics()
    metrics.recordCanvasFrame(100, false, 1.24)
    metrics.recordDenoisingPassthroughFrame(150, 0.42)
    const summary = metrics.report(1_000)

    expect(summary?.canvasFrames.rendered).toBe(2)
    expect(summary?.canvasFrames.renderMs.max).toBe(1.2)
    expect(summary?.denoisingPassthrough.frames).toBe(1)
    expect(summary?.denoisingPassthrough.renderMs.max).toBe(0.4)
  })
})
