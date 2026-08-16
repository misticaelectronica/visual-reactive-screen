import {
  isBrainRendererId,
  type AppSettings,
  type BrainRendererId,
} from '@shared/types'

const FILTER_PSICHE_ID: BrainRendererId = 'filter-psiche'
const AUTOMATICALLY_EXCLUDED_RENDERERS = new Set<BrainRendererId>(['psycho2d'])
const FILTER_PSICHE_ROTATION_DURATION_MULTIPLIER = 1.5
const PERSISTENT_STORY_RENDERERS = new Set<BrainRendererId>([
  'filter-psiche',
  'material-morph',
  'vector-morph',
])
const SINGLE_FRAME_STORY_RENDERERS = new Set<BrainRendererId>([
  'print2d',
  'psycho2d',
  'bauhaus-morph',
])

export function selectBrainRendererHoldFrames(
  rendererId: BrainRendererId,
  random: () => number = Math.random,
): number {
  if (!PERSISTENT_STORY_RENDERERS.has(rendererId)) return 1
  return 2 + Math.floor(Math.min(0.999_999, Math.max(0, random())) * 3)
}

export class BrainRendererSelector {
  private activeId: BrainRendererId
  private mode: AppSettings['brainRendererMode'] = 'manual'
  private switchedAt = Number.NEGATIVE_INFINITY
  private storyId: string | null = null
  private storyDeck: BrainRendererId[] = []
  private storyDeckIndex = 0
  private rotationDeck: BrainRendererId[] = []
  private waitingDeck: BrainRendererId[] = []
  private storyHoldRemaining = 0
  private waitingHoldRemaining = 0
  private currentStoryVisited = new Set<BrainRendererId>()
  private readonly storyAppearances = new Map<BrainRendererId, number>()

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

  private automaticIds(): BrainRendererId[] {
    const enabled = this.availableIds.filter(
      (id) => !AUTOMATICALLY_EXCLUDED_RENDERERS.has(id),
    )
    return enabled.length > 0 ? enabled : [...this.availableIds]
  }

  private beginDeckWith(activeId: BrainRendererId): void {
    const automaticIds = this.automaticIds()
    const first = automaticIds.includes(activeId)
      ? activeId
      : automaticIds[0] ?? activeId
    const remaining = automaticIds.filter((id) => id !== first)
    this.storyDeck = [first, ...this.shuffled(remaining)]
    this.storyDeckIndex = 0
  }

  private balancedStoryDeck(avoidedId: BrainRendererId): BrainRendererId[] {
    const randomized = this.shuffled(this.automaticIds())
    const deck = randomized.sort((left, right) =>
      (this.storyAppearances.get(left) ?? 0) -
      (this.storyAppearances.get(right) ?? 0),
    )
    if (deck.length > 1 && deck[0] === avoidedId) {
      const firstCount = this.storyAppearances.get(deck[0]) ?? 0
      const replacementIndex = deck.findIndex(
        (id) => id !== avoidedId && (this.storyAppearances.get(id) ?? 0) === firstCount,
      )
      if (replacementIndex > 0) {
        ;[deck[0], deck[replacementIndex]] = [deck[replacementIndex], deck[0]]
      }
    }
    const filterIndex = deck.indexOf(FILTER_PSICHE_ID)
    if (filterIndex >= 0) {
      const filterTarget = avoidedId === FILTER_PSICHE_ID && deck.length > 1
        ? 1
        : 0
      ;[deck[filterTarget], deck[filterIndex]] = [deck[filterIndex], deck[filterTarget]]
      if (filterTarget === 1 && !SINGLE_FRAME_STORY_RENDERERS.has(deck[0])) {
        const singleFrameIndex = deck.findIndex(
          (id, index) => index > 1 && SINGLE_FRAME_STORY_RENDERERS.has(id),
        )
        if (singleFrameIndex > 1) {
          ;[deck[0], deck[singleFrameIndex]] = [deck[singleFrameIndex], deck[0]]
        }
      }
    }
    return deck
  }

  private rotationDuration(baseInterval: number): number {
    return this.activeId === FILTER_PSICHE_ID
      ? baseInterval * FILTER_PSICHE_ROTATION_DURATION_MULTIPLIER
      : baseInterval
  }

  private closeStoryUsage(): void {
    for (const id of this.currentStoryVisited) {
      this.storyAppearances.set(id, (this.storyAppearances.get(id) ?? 0) + 1)
    }
    this.currentStoryVisited.clear()
  }

  private storyHoldForActive(): number {
    return selectBrainRendererHoldFrames(this.activeId, this.random) - 1
  }

  private nextRotationId(): BrainRendererId {
    if (this.rotationDeck.length === 0) {
      const candidates = this.automaticIds().filter((id) => id !== this.activeId)
      this.rotationDeck = this.shuffled(candidates)
    }
    return this.rotationDeck.shift() ?? this.activeId
  }

  beginStory(storyId: string, settings?: AppSettings): void {
    if (this.storyId === storyId) return
    this.closeStoryUsage()
    this.storyId = storyId
    this.waitingDeck = []
    this.waitingHoldRemaining = 0
    this.storyDeckIndex = 0
    this.storyDeck = this.balancedStoryDeck(this.activeId)
    if (settings?.brainRendererMode === 'story-cycle') {
      this.activeId = this.storyDeck[0] ?? this.activeId
      this.currentStoryVisited.add(this.activeId)
      this.storyHoldRemaining = this.storyHoldForActive()
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
    if (this.storyHoldRemaining > 0) {
      this.storyHoldRemaining -= 1
      return false
    }
    if (this.storyDeckIndex >= this.storyDeck.length - 1) return false
    this.storyDeckIndex += 1
    this.activeId = this.storyDeck[this.storyDeckIndex]
    this.currentStoryVisited.add(this.activeId)
    this.storyHoldRemaining = this.storyHoldForActive()
    this.switchedAt = now
    return true
  }

  advanceWaitingRenderer(settings: AppSettings, now: number): boolean {
    if (settings.brainRendererMode !== 'story-cycle') return false
    const automaticIds = this.automaticIds()
    if (automaticIds.length <= 1) return false
    if (this.waitingHoldRemaining > 0) {
      this.waitingHoldRemaining -= 1
      return false
    }
    if (this.waitingDeck.length === 0) {
      this.waitingDeck = this.shuffled(
        automaticIds.filter((id) => id !== this.activeId),
      )
    }
    const nextId = this.waitingDeck.shift()
    if (!nextId || nextId === this.activeId) return false
    this.activeId = nextId
    this.waitingHoldRemaining = this.storyHoldForActive()
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
        if (AUTOMATICALLY_EXCLUDED_RENDERERS.has(this.activeId)) {
          this.activeId = this.storyDeck[0] ?? this.activeId
        }
      } else if (modeChanged) {
        this.activeId = this.storyDeck[this.storyDeckIndex] ?? this.activeId
      }
      this.switchedAt = now
      return this.activeId
    }

    if (modeChanged || !Number.isFinite(this.switchedAt)) {
      const automaticIds = this.automaticIds()
      this.activeId = automaticIds.includes(requested)
        ? requested
        : automaticIds[0] ?? requested
      this.switchedAt = now
      this.rotationDeck = []
      return this.activeId
    }
    const interval = Math.max(10_000, Math.min(120_000, settings.brainRendererRotationMs))
    if (this.automaticIds().length > 1) {
      let elapsed = now - this.switchedAt
      while (elapsed >= this.rotationDuration(interval)) {
        const duration = this.rotationDuration(interval)
        this.activeId = this.nextRotationId()
        this.switchedAt += duration
        elapsed -= duration
      }
    }
    return this.activeId
  }
}
