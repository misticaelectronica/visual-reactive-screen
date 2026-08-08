export type BrainThermalSchedulerEvent =
  | {
      type: 'long-frame'
      gapMs: number
      severity: 'moderate' | 'severe'
      blockedForMs: number
    }
  | { type: 'waiting'; delayMs: number }
  | { type: 'started' }
  | { type: 'finished'; durationMs: number; cooldownMs: number }

export type BrainThermalSchedulerOptions = {
  cooldownMs: number
  lowPowerCooldownMs: number
  longFrameThresholdMs: number
  severeLongFrameThresholdMs: number
  longFrameBackoffMs: number
  severeLongFrameBackoffMs: number
  now?: () => number
  sleep?: (delayMs: number) => Promise<void>
  onEvent?: (event: BrainThermalSchedulerEvent) => void
}

export type BrainInferenceScheduler = {
  run<T>(task: () => Promise<T>): Promise<T>
}

const WAIT_SLICE_MS = 500
const LONG_FRAME_LOG_INTERVAL_MS = 2_000

/**
 * Serializza le inferenze e lascia respirare GPU/renderer fra due lavori.
 * I gap RAF osservati estendono il blocco prima della prossima inferenza.
 */
export class BrainThermalScheduler implements BrainInferenceScheduler {
  private readonly now: () => number
  private readonly sleep: (delayMs: number) => Promise<void>
  private queue: Promise<void> = Promise.resolve()
  private lastFrameAt = 0
  private nextInferenceAllowedAt = 0
  private longFrameBlockedUntil = 0
  private lastLongFrameEventAt = Number.NEGATIVE_INFINITY
  private lowPowerMode = false
  private destroyed = false
  private inferenceActive = false

  constructor(private readonly options: BrainThermalSchedulerOptions) {
    this.now = options.now ?? (() => performance.now())
    this.sleep = options.sleep ?? ((delayMs) => new Promise<void>((resolve) => {
      window.setTimeout(resolve, delayMs)
    }))
  }

  setLowPowerMode(active: boolean): void {
    this.lowPowerMode = active
  }

  recordFrame(now: number): void {
    if (this.destroyed) return
    const gapMs = this.lastFrameAt > 0 ? now - this.lastFrameAt : 0
    this.lastFrameAt = now
    if (gapMs < this.options.longFrameThresholdMs) return

    const severe = gapMs >= this.options.severeLongFrameThresholdMs
    const blockedForMs = severe
      ? this.options.severeLongFrameBackoffMs
      : this.options.longFrameBackoffMs
    this.longFrameBlockedUntil = Math.max(
      this.longFrameBlockedUntil,
      now + blockedForMs,
    )
    if (
      severe ||
      now - this.lastLongFrameEventAt >= LONG_FRAME_LOG_INTERVAL_MS
    ) {
      this.lastLongFrameEventAt = now
      this.options.onEvent?.({
        type: 'long-frame',
        gapMs,
        severity: severe ? 'severe' : 'moderate',
        blockedForMs,
      })
    }
  }

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(() => this.execute(task))
    this.queue = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }

  destroy(): void {
    this.destroyed = true
  }

  getSnapshot(): {
    inferenceActive: boolean
    lowPowerMode: boolean
    nextInferenceAllowedAt: number
    longFrameBlockedUntil: number
  } {
    return {
      inferenceActive: this.inferenceActive,
      lowPowerMode: this.lowPowerMode,
      nextInferenceAllowedAt: this.nextInferenceAllowedAt,
      longFrameBlockedUntil: this.longFrameBlockedUntil,
    }
  }

  private async execute<T>(task: () => Promise<T>): Promise<T> {
    await this.waitForPermit()
    if (this.destroyed) throw new Error('Scheduler termico Brain arrestato')

    const startedAt = this.now()
    this.inferenceActive = true
    this.options.onEvent?.({ type: 'started' })
    try {
      return await task()
    } finally {
      const finishedAt = this.now()
      const cooldownMs = this.lowPowerMode
        ? this.options.lowPowerCooldownMs
        : this.options.cooldownMs
      this.inferenceActive = false
      this.nextInferenceAllowedAt = Math.max(
        this.nextInferenceAllowedAt,
        finishedAt + cooldownMs,
      )
      this.options.onEvent?.({
        type: 'finished',
        durationMs: Math.max(0, finishedAt - startedAt),
        cooldownMs,
      })
    }
  }

  private async waitForPermit(): Promise<void> {
    let waitingReported = false
    while (!this.destroyed) {
      const now = this.now()
      const allowedAt = Math.max(
        this.nextInferenceAllowedAt,
        this.longFrameBlockedUntil,
      )
      const delayMs = Math.max(0, allowedAt - now)
      if (delayMs <= 0) return
      if (!waitingReported) {
        waitingReported = true
        this.options.onEvent?.({ type: 'waiting', delayMs })
      }
      await this.sleep(Math.min(WAIT_SLICE_MS, delayMs))
    }
    throw new Error('Scheduler termico Brain arrestato')
  }
}
