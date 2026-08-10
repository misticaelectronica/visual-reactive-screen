import {
  isBrainRendererId,
  type AppSettings,
  type BrainRendererId,
} from '@shared/types'

export class BrainRendererSelector {
  private activeId: BrainRendererId
  private mode: AppSettings['brainRendererMode'] = 'manual'
  private switchedAt = Number.NEGATIVE_INFINITY
  private storyId: string | null = null
  private storyDeck: BrainRendererId[] = []
  private storyDeckIndex = 0

  constructor(
    private readonly availableIds: readonly BrainRendererId[],
    initialId: BrainRendererId = 'print2d',
    private readonly random: () => number = Math.random,
  ) {
    this.activeId = availableIds.includes(initialId)
      ? initialId
      : availableIds[0] ?? 'print2d'
  }

  private shuffled(ids: readonly BrainRendererId[]): BrainRendererId[] {
    const result = [...ids]
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(this.random() * (index + 1))
      ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
    }
    return result
  }

  private beginDeckWith(activeId: BrainRendererId): void {
    const remaining = this.availableIds.filter((id) => id !== activeId)
    this.storyDeck = [activeId, ...this.shuffled(remaining)]
    this.storyDeckIndex = 0
  }

  beginStory(storyId: string, settings?: AppSettings): void {
    if (this.storyId === storyId) return
    this.storyId = storyId
    this.storyDeckIndex = 0
    this.storyDeck = this.shuffled(this.availableIds)
    if (settings?.brainRendererMode === 'story-cycle') {
      this.activeId = this.storyDeck[0] ?? this.activeId
      this.mode = 'story-cycle'
      this.switchedAt = Number.NEGATIVE_INFINITY
    }
  }

  advanceStoryRenderer(
    storyId: string,
    settings: AppSettings,
    now: number,
  ): boolean {
    if (settings.brainRendererMode !== 'story-cycle') return false
    if (this.storyId !== storyId) this.beginStory(storyId, settings)
    if (this.storyDeck.length === 0) this.beginDeckWith(this.activeId)
    if (this.storyDeckIndex >= this.storyDeck.length - 1) return false
    this.storyDeckIndex += 1
    this.activeId = this.storyDeck[this.storyDeckIndex]
    this.switchedAt = now
    return true
  }

  resolve(settings: AppSettings, now: number): BrainRendererId {
    const requested = isBrainRendererId(settings.brainRendererId) &&
      this.availableIds.includes(settings.brainRendererId)
      ? settings.brainRendererId
      : this.availableIds[0] ?? 'print2d'
    const modeChanged = this.mode !== settings.brainRendererMode
    this.mode = settings.brainRendererMode

    if (this.mode === 'manual') {
      if (this.activeId !== requested || modeChanged) {
        this.activeId = requested
        this.switchedAt = now
      }
      return this.activeId
    }

    if (this.mode === 'story-cycle') {
      if (this.storyDeck.length === 0) {
        this.beginDeckWith(this.activeId)
      } else if (modeChanged) {
        this.activeId = this.storyDeck[this.storyDeckIndex] ?? this.activeId
      }
      this.switchedAt = now
      return this.activeId
    }

    if (modeChanged || !Number.isFinite(this.switchedAt)) {
      this.activeId = requested
      this.switchedAt = now
      return this.activeId
    }
    const interval = Math.max(10_000, Math.min(120_000, settings.brainRendererRotationMs))
    if (this.availableIds.length > 1 && now - this.switchedAt >= interval) {
      const steps = Math.max(1, Math.floor((now - this.switchedAt) / interval))
      const index = this.availableIds.indexOf(this.activeId)
      this.activeId = this.availableIds[(index + steps) % this.availableIds.length]
      this.switchedAt += steps * interval
    }
    return this.activeId
  }
}
