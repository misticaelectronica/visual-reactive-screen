export type BrainOfflineWindowConfig = {
  maxDurationMs: number
  onBeginOffline: () => void
  onEndOffline: () => void
}

export type BrainOfflineWindowState = 'idle' | 'active' | 'aborted'

export class BrainOfflineGenerationWindow {
  private state: BrainOfflineWindowState = 'idle'
  private abortController: AbortController | null = null

  constructor(private readonly config: BrainOfflineWindowConfig) {}

  get isActive(): boolean {
    return this.state === 'active'
  }

  async run<T>(task: (signal: AbortSignal) => Promise<T>): Promise<T | null> {
    if (this.state === 'active') return null
    this.state = 'active'
    this.abortController = new AbortController()
    this.config.onBeginOffline()
    const timeoutId = window.setTimeout(() => {
      this.state = 'aborted'
      this.abortController?.abort()
    }, this.config.maxDurationMs)
    try {
      return await task(this.abortController.signal)
    } catch (error) {
      if (this.abortController.signal.aborted) return null
      throw error
    } finally {
      window.clearTimeout(timeoutId)
      this.state = 'idle'
      this.abortController = null
      this.config.onEndOffline()
    }
  }

  abort(): void {
    if (!this.abortController) return
    this.state = 'aborted'
    this.abortController.abort()
  }
}
