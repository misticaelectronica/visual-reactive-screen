export type BrainPerformanceTelemetry = {
  sequence: number
  sentAtEpochMs: number
}

export type BrainPerformanceSummary = {
  windowMs: number
  outputRaf: MetricSeriesSummary
  visualPackets: MetricSeriesSummary & {
    received: number
    missed: number
    latencyMs: MetricSeriesSummary
  }
  canvasFrames: MetricSeriesSummary & {
    rendered: number
    resourcePressureRatio: number
  }
  generationActiveRatio: number
  inferenceActiveRatio: number
  artworkPreparationMs: MetricSeriesSummary
}

type MetricSeriesSummary = {
  samples: number
  p50: number
  p95: number
  max: number
  estimatedFps?: number
}

const REPORT_INTERVAL_MS = 10_000
const MAX_SAMPLES = 1_200

function rounded(value: number): number {
  return Math.round(value * 10) / 10
}

export function summarizeMetricSeries(
  samples: readonly number[],
  includeFps = false,
): MetricSeriesSummary {
  if (samples.length === 0) {
    return { samples: 0, p50: 0, p95: 0, max: 0 }
  }
  const sorted = [...samples].sort((left, right) => left - right)
  const at = (ratio: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio))]
  const p50 = at(0.5)
  return {
    samples: sorted.length,
    p50: rounded(p50),
    p95: rounded(at(0.95)),
    max: rounded(sorted[sorted.length - 1]),
    ...(includeFps && p50 > 0 ? { estimatedFps: rounded(1_000 / p50) } : {}),
  }
}

function appendSample(target: number[], value: number): void {
  if (!Number.isFinite(value) || value < 0) return
  target.push(value)
  if (target.length > MAX_SAMPLES) target.shift()
}

class BrainPerformanceMetrics {
  private enabled = true
  private windowStartedAt = performance.now()
  private lastReportAt = this.windowStartedAt
  private lastRafAt = 0
  private lastPacketAt = 0
  private lastCanvasFrameAt = 0
  private lastPacketSequence = -1
  private packetCount = 0
  private missedPacketCount = 0
  private canvasFrameCount = 0
  private resourcePressureFrames = 0
  private generationActive = false
  private inferenceActive = false
  private generationActiveSince = 0
  private inferenceActiveSince = 0
  private generationActiveMs = 0
  private inferenceActiveMs = 0
  private readonly rafGaps: number[] = []
  private readonly packetGaps: number[] = []
  private readonly packetLatencies: number[] = []
  private readonly canvasFrameGaps: number[] = []
  private readonly artworkPreparationTimes: number[] = []

  constructor() {
    try {
      this.enabled = window.localStorage.getItem('brain.metrics') !== 'off'
    } catch {
      this.enabled = true
    }
  }

  recordOutputRaf(now: number): void {
    if (!this.enabled) return
    if (this.lastRafAt > 0) appendSample(this.rafGaps, now - this.lastRafAt)
    this.lastRafAt = now
    if (now - this.lastReportAt >= REPORT_INTERVAL_MS) this.report(now)
  }

  recordVisualPacket(
    telemetry: BrainPerformanceTelemetry | undefined,
    receivedAtEpochMs: number,
    receivedAt: number,
  ): void {
    if (!this.enabled) return
    if (this.lastPacketAt > 0) {
      appendSample(this.packetGaps, receivedAt - this.lastPacketAt)
    }
    this.lastPacketAt = receivedAt
    this.packetCount += 1
    if (!telemetry) return
    if (this.lastPacketSequence >= 0 && telemetry.sequence > this.lastPacketSequence + 1) {
      this.missedPacketCount += telemetry.sequence - this.lastPacketSequence - 1
    }
    this.lastPacketSequence = telemetry.sequence
    appendSample(
      this.packetLatencies,
      Math.max(0, receivedAtEpochMs - telemetry.sentAtEpochMs),
    )
  }

  recordCanvasFrame(now: number, resourcePressure: boolean): void {
    if (!this.enabled) return
    if (this.lastCanvasFrameAt > 0) {
      appendSample(this.canvasFrameGaps, now - this.lastCanvasFrameAt)
    }
    this.lastCanvasFrameAt = now
    this.canvasFrameCount += 1
    if (resourcePressure) this.resourcePressureFrames += 1
  }

  recordArtworkPreparation(durationMs: number): void {
    if (!this.enabled) return
    appendSample(this.artworkPreparationTimes, durationMs)
  }

  recordStalePacketIgnored(): void {
    if (!this.enabled) return
    this.missedPacketCount += 1
  }

  recordPhaseRealignment(): void {
    if (!this.enabled) return
  }

  setGeneration(active: boolean, now = performance.now()): void {
    if (!this.enabled || active === this.generationActive) return
    if (active) this.generationActiveSince = now
    else this.generationActiveMs += now - this.generationActiveSince
    this.generationActive = active
  }

  setInference(active: boolean, now = performance.now()): void {
    if (!this.enabled || active === this.inferenceActive) return
    if (active) this.inferenceActiveSince = now
    else this.inferenceActiveMs += now - this.inferenceActiveSince
    this.inferenceActive = active
  }

  report(now = performance.now()): BrainPerformanceSummary | null {
    if (!this.enabled) return null
    const windowMs = Math.max(1, now - this.windowStartedAt)
    const generationActiveMs = this.generationActiveMs +
      (this.generationActive ? now - this.generationActiveSince : 0)
    const inferenceActiveMs = this.inferenceActiveMs +
      (this.inferenceActive ? now - this.inferenceActiveSince : 0)
    const summary: BrainPerformanceSummary = {
      windowMs: rounded(windowMs),
      outputRaf: summarizeMetricSeries(this.rafGaps, true),
      visualPackets: {
        ...summarizeMetricSeries(this.packetGaps, true),
        received: this.packetCount,
        missed: this.missedPacketCount,
        latencyMs: summarizeMetricSeries(this.packetLatencies),
      },
      canvasFrames: {
        ...summarizeMetricSeries(this.canvasFrameGaps, true),
        rendered: this.canvasFrameCount,
        resourcePressureRatio: rounded(
          this.canvasFrameCount > 0
            ? this.resourcePressureFrames / this.canvasFrameCount
            : 0,
        ),
      },
      generationActiveRatio: rounded(generationActiveMs / windowMs),
      inferenceActiveRatio: rounded(inferenceActiveMs / windowMs),
      artworkPreparationMs: summarizeMetricSeries(this.artworkPreparationTimes),
    }
    console.info(`[BrainMetrics] ${JSON.stringify(summary)}`)
    this.resetWindow(now)
    return summary
  }

  private resetWindow(now: number): void {
    this.windowStartedAt = now
    this.lastReportAt = now
    this.packetCount = 0
    this.missedPacketCount = 0
    this.canvasFrameCount = 0
    this.resourcePressureFrames = 0
    this.generationActiveMs = 0
    this.inferenceActiveMs = 0
    if (this.generationActive) this.generationActiveSince = now
    if (this.inferenceActive) this.inferenceActiveSince = now
    this.rafGaps.length = 0
    this.packetGaps.length = 0
    this.packetLatencies.length = 0
    this.canvasFrameGaps.length = 0
    this.artworkPreparationTimes.length = 0
  }
}

export const brainPerformanceMetrics = new BrainPerformanceMetrics()
