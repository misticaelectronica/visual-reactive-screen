import {
  isBrainRendererId,
  type AppSettings,
  type BrainRendererId,
} from '@shared/types'

const FILTER_PSICHE_ID: BrainRendererId = 'filter-psiche'
const AUTOMATICALLY_EXCLUDED_RENDERERS = new Set<BrainRendererId>([])
const STORY_CYCLE_EXCLUDED_RENDERERS = new Set<BrainRendererId>([
  'print2d',
])
// Bauhaus Morph e Materia Morph preparano il materiale visivo analizzando
// pixel/maschere di più sorgenti immagine per fotogramma (capabilities
// multipleImages, brainRendererRegistry.ts): sotto pressione GPU reale
// (denoising in corso, thermalScheduler) questa preparazione può accodarsi
// dietro l'inferenza e restare visibilmente ferma per secondi. FilterPsiche
// e Psycho2D non hanno mostrato lo stesso stallo nei log; finché non scelti
// per una nuova storia si preferiscono a loro sotto pressione reale.
// Dream Segmentation usa lo stesso pattern (createImageBitmap + analisi
// pixel per sorgente, capabilities.multipleImages) e va trattato allo
// stesso modo in via preventiva, non dopo aver osservato un freeze in log.
const HEAVY_RENDERERS_UNDER_PRESSURE = new Set<BrainRendererId>([
  'bauhaus-morph',
  'material-morph',
  'dream-segmentation',
])
const FILTER_PSICHE_ROTATION_DURATION_MULTIPLIER = 1.5
const PERSISTENT_STORY_RENDERERS = new Set<BrainRendererId>([
  'filter-psiche',
  'material-morph',
  'vector-morph',
  'psycho2d',
  'bauhaus-morph',
  'dream-segmentation',
])
// Un renderer persistente è un invariante onirico (filosofia.md §2): deve
// durare abbastanza da farsi riconoscere come "ciò che ritorna" (minimo 2
// fotogrammi), ma non può occupare l'intera storia — altrimenti dentro una
// singola storia non c'è alcuna alternanza visibile, solo fra storie
// diverse. Il massimo è quindi vincolato a lasciare sempre almeno un
// fotogramma per un cambio, su `BRAIN_CONFIG.renderFrameCount` fotogrammi.
const MINIMUM_PERSISTENT_HOLD_FRAMES = 2
const MAXIMUM_PERSISTENT_HOLD_FRAMES = 3

export function selectBrainRendererHoldFrames(
  rendererId: BrainRendererId,
  random: () => number = Math.random,
): number {
  if (!PERSISTENT_STORY_RENDERERS.has(rendererId)) return 1
  const span = MAXIMUM_PERSISTENT_HOLD_FRAMES - MINIMUM_PERSISTENT_HOLD_FRAMES + 1
  return MINIMUM_PERSISTENT_HOLD_FRAMES +
    Math.floor(Math.min(0.999_999, Math.max(0, random())) * span)
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
  private currentStoryVisited = new Map<BrainRendererId, number>()
  private readonly storyAppearances = new Map<BrainRendererId, number>()

  constructor(
    private readonly availableIds: readonly BrainRendererId[],
    initialId: BrainRendererId = 'print2d',
    private readonly random: () => number = Math.random,
    private readonly getPressureHint?: () => boolean,
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

  private storyCycleIds(): BrainRendererId[] {
    const enabled = this.availableIds.filter(
      (id) => !STORY_CYCLE_EXCLUDED_RENDERERS.has(id),
    )
    const base = enabled.length > 0 ? enabled : this.automaticIds()
    if (!this.getPressureHint?.()) return base
    const light = base.filter((id) => !HEAVY_RENDERERS_UNDER_PRESSURE.has(id))
    return light.length > 0 ? light : base
  }

  private beginDeckWith(activeId: BrainRendererId): void {
    const automaticIds = this.storyCycleIds()
    const first = automaticIds.includes(activeId)
      ? activeId
      : automaticIds[0] ?? activeId
    const remaining = automaticIds.filter((id) => id !== first)
    this.storyDeck = [first, ...this.shuffled(remaining)]
    this.storyDeckIndex = 0
  }

  private exposureWeight(id: BrainRendererId): number {
    return (this.storyAppearances.get(id) ?? 0) +
      (this.currentStoryVisited.get(id) ?? 0)
  }

  private weightedDeck(
    ids: readonly BrainRendererId[],
    avoidedId: BrainRendererId,
  ): BrainRendererId[] {
    const randomized = this.shuffled(ids)
    const deck = randomized.sort((left, right) =>
      this.exposureWeight(left) - this.exposureWeight(right),
    )
    if (deck.length > 1 && deck[0] === avoidedId) {
      const firstCount = this.exposureWeight(deck[0])
      const replacementIndex = deck.findIndex(
        (id) => id !== avoidedId && this.exposureWeight(id) === firstCount,
      )
      if (replacementIndex > 0) {
        ;[deck[0], deck[replacementIndex]] = [deck[replacementIndex], deck[0]]
      }
    }
    return deck
  }

  private balancedStoryDeck(avoidedId: BrainRendererId): BrainRendererId[] {
    return this.weightedDeck(this.storyCycleIds(), avoidedId)
  }

  private recordExposure(id: BrainRendererId, frames: number): void {
    this.currentStoryVisited.set(
      id,
      (this.currentStoryVisited.get(id) ?? 0) + frames,
    )
  }

  private rotationDuration(baseInterval: number): number {
    return this.activeId === FILTER_PSICHE_ID
      ? baseInterval * FILTER_PSICHE_ROTATION_DURATION_MULTIPLIER
      : baseInterval
  }

  private closeStoryUsage(): void {
    for (const [id, framesShown] of this.currentStoryVisited) {
      this.storyAppearances.set(id, (this.storyAppearances.get(id) ?? 0) + framesShown)
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
      this.storyHoldRemaining = this.storyHoldForActive()
      this.recordExposure(this.activeId, this.storyHoldRemaining + 1)
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
    this.storyHoldRemaining = this.storyHoldForActive()
    this.recordExposure(this.activeId, this.storyHoldRemaining + 1)
    this.switchedAt = now
    return true
  }

  advanceWaitingRenderer(settings: AppSettings, now: number): boolean {
    if (settings.brainRendererMode !== 'story-cycle') return false
    const automaticIds = this.storyCycleIds()
    if (automaticIds.length <= 1) return false
    if (this.waitingHoldRemaining > 0) {
      this.waitingHoldRemaining -= 1
      return false
    }
    if (this.waitingDeck.length === 0) {
      this.waitingDeck = this.weightedDeck(
        automaticIds.filter((id) => id !== this.activeId),
        this.activeId,
      )
    }
    const nextId = this.waitingDeck.shift()
    if (!nextId || nextId === this.activeId) return false
    this.activeId = nextId
    this.waitingHoldRemaining = this.storyHoldForActive()
    this.recordExposure(this.activeId, this.waitingHoldRemaining + 1)
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
