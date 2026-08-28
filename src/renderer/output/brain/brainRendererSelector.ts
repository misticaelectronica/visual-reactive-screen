import {
  BRAIN_RENDERER_IDS,
  isBrainRendererId,
  type AppSettings,
  type BrainRendererId,
} from '@shared/types'
import type { BrainBioRegime } from './brainBioPerception'

const FILTER_PSICHE_ID: BrainRendererId = 'filter-psiche'
const AUTOMATICALLY_EXCLUDED_RENDERERS = new Set<BrainRendererId>([])
const STORY_CYCLE_EXCLUDED_RENDERERS = new Set<BrainRendererId>([
  'print2d',
])
// PIANO-040 (brief collettivo, terzo collaudo; rinominato per il brief
// "due assi" del 2026-08-28): il regime basso (`decompression`/
// `respiro-profondo`) è una whitelist, non una blacklist. Solo questi
// cinque renderer sono eleggibili. A differenza del filtro pressione GPU
// (`getPressureHint`), **non viene mai bypassata da `boosted`**: il regime
// vince sempre sull'evento tecnico (brief §13/§14 della nota Visual —
// "l'esclusione per regime deve rimanere attiva durante la Riattivazione").
const LOW_REGIME_RENDERERS = new Set<BrainRendererId>([
  'vector-morph',
  'material-morph',
  'bauhaus-morph',
  'dream-segmentation',
  'filter-psiche',
])
const REGIME_EXCLUDED_RENDERERS = new Set<BrainRendererId>(
  BRAIN_RENDERER_IDS.filter((id) => !LOW_REGIME_RENDERERS.has(id)),
)

// `respiro-alto`/`pressurized`: nessuna esclusione, come già `pressurized`
// prima di questo brief. Il brief Visual §5 elenca una preferenza
// "prioritari/compatibili" per Respiro Alto, non un'esclusione — non
// implementata come peso di selezione in questo giro (nessun meccanismo
// di priorità esiste oggi nel selettore; aggiungerne uno per una
// preferenza qualitativa non vincolante sarebbe la sovrastrutturazione
// che la regola vieta finché non richiesto in modo stringente).
function excludedForRegime(regime: BrainBioRegime): ReadonlySet<BrainRendererId> {
  return regime === 'decompression' || regime === 'respiro-profondo'
    ? REGIME_EXCLUDED_RENDERERS
    : AUTOMATICALLY_EXCLUDED_RENDERERS
}
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
// Fractal Spiral Degeneration usa lo stesso pattern (createImageBitmap +
// analisi pixel per sorgente, ritagli per regione), stesso trattamento
// preventivo degli altri renderer ad analisi multi-sorgente.
const HEAVY_RENDERERS_UNDER_PRESSURE = new Set<BrainRendererId>([
  'bauhaus-morph',
  'material-morph',
  'dream-segmentation',
  'fractal-spiral-degeneration',
])
const FILTER_PSICHE_ROTATION_DURATION_MULTIPLIER = 1.5
const PERSISTENT_STORY_RENDERERS = new Set<BrainRendererId>([
  'filter-psiche',
  'material-morph',
  'vector-morph',
  'psycho2d',
  'bauhaus-morph',
  'dream-segmentation',
  'glitch-morph',
  'fractal-spiral-degeneration',
])
// Un renderer persistente è un invariante onirico (filosofia.md §2): deve
// durare abbastanza da farsi riconoscere come "ciò che ritorna" (minimo 2
// fotogrammi), ma non può occupare l'intera storia — altrimenti dentro una
// singola storia non c'è alcuna alternanza visibile, solo fra storie
// diverse. Il massimo è quindi vincolato a lasciare sempre almeno un
// fotogramma per un cambio, su `BRAIN_CONFIG.renderFrameCount` fotogrammi.
const MINIMUM_PERSISTENT_HOLD_FRAMES = 2
const MAXIMUM_PERSISTENT_HOLD_FRAMES = 3
// Ciclo di Revisione (PIANO-034): durante la rielaborazione l'alternanza
// renderer deve essere più rapida ("morphing elevato tra renderer"), non
// un sistema a parte — lo stesso invariante onirico (min 2/max 3) si
// stringe a min 1/max 2.
const MINIMUM_BOOSTED_HOLD_FRAMES = 1
const MAXIMUM_BOOSTED_HOLD_FRAMES = 2
// PIANO-040 (brief §17.1, tabella): durante la Riattivazione (`boosted`) la
// velocità dell'alternanza dipende dal regime, non solo dal flag tecnico —
// PRESSURIZZATO resta 1-2 (invariato, "può dichiararsi pienamente");
// DECOMPRESSIONE rallenta a 2 fisso ("leggibile ma contenuta"); RESPIRO
// PROFONDO torna al range ordinario 2-3 ("deve mimetizzarsi"). Un regime
// sconosciuto o `unresolved` usa il comportamento oggi esistente (1-2),
// nessuna regressione per chi non passa il nuovo parametro.
const DECOMPRESSION_BOOSTED_HOLD_FRAMES = 2

export function selectBrainRendererHoldFrames(
  rendererId: BrainRendererId,
  random: () => number = Math.random,
  boosted = false,
  regime?: BrainBioRegime,
): number {
  if (!PERSISTENT_STORY_RENDERERS.has(rendererId)) return 1
  if (boosted && regime === 'decompression') {
    return DECOMPRESSION_BOOSTED_HOLD_FRAMES
  }
  // Brief Visual "due assi" (2026-08-28), §4/§5: Respiro Alto vuole "tempi
  // corti" — la stessa stretta 1-2 già usata dalla Riattivazione, ma qui
  // attiva anche fuori boost, perché è la stasi stessa a chiederlo, non
  // un evento tecnico. Respiro Profondo resta l'unico caso che torna al
  // range ordinario anche sotto boost ("deve mimetizzarsi").
  const useShortRange = regime === 'respiro-alto' || (boosted && regime !== 'respiro-profondo')
  const minimum = useShortRange ? MINIMUM_BOOSTED_HOLD_FRAMES : MINIMUM_PERSISTENT_HOLD_FRAMES
  const maximum = useShortRange ? MAXIMUM_BOOSTED_HOLD_FRAMES : MAXIMUM_PERSISTENT_HOLD_FRAMES
  const span = maximum - minimum + 1
  return minimum + Math.floor(Math.min(0.999_999, Math.max(0, random())) * span)
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
    private readonly getBoostHint?: () => boolean,
    private readonly getRegime?: () => BrainBioRegime,
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
    const regimeExcluded = excludedForRegime(this.getRegime?.() ?? 'unresolved')
    const enabled = this.availableIds.filter(
      (id) => !AUTOMATICALLY_EXCLUDED_RENDERERS.has(id) && !regimeExcluded.has(id),
    )
    return enabled.length > 0 ? enabled : [...this.availableIds]
  }

  private regimeAllows(id: BrainRendererId): boolean {
    return !excludedForRegime(this.getRegime?.() ?? 'unresolved').has(id)
  }

  /**
   * Un mazzo può essere stato costruito nel regime precedente. Perciò il
   * filtro non vive soltanto in `storyCycleIds()`: viene riapplicato al
   * punto d'uso e sostituisce subito anche l'attivo diventato ineleggibile.
   * Il boost non partecipa alla decisione: il regime resta l'autorità finale.
   */
  private reconcileCurrentRegime(now: number): boolean {
    const regimeExcluded = excludedForRegime(this.getRegime?.() ?? 'unresolved')
    if (regimeExcluded.size === 0) return false

    this.waitingDeck = this.waitingDeck.filter((id) => !regimeExcluded.has(id))
    this.rotationDeck = this.rotationDeck.filter((id) => !regimeExcluded.has(id))
    if (this.storyDeck.length > 0) {
      const consumed = this.storyDeck.slice(0, this.storyDeckIndex + 1)
      const remaining = this.storyDeck
        .slice(this.storyDeckIndex + 1)
        .filter((id) => !regimeExcluded.has(id))
      this.storyDeck = [...consumed, ...remaining]
    }
    if (this.regimeAllows(this.activeId)) return false

    if (this.mode === 'story-cycle') {
      this.storyDeck = this.balancedStoryDeck(this.activeId)
      this.storyDeckIndex = 0
      this.activeId = this.storyDeck[0] ?? FILTER_PSICHE_ID
      this.storyHoldRemaining = this.storyHoldForActive()
    } else {
      this.activeId = this.automaticIds()[0] ?? FILTER_PSICHE_ID
      this.rotationDeck = []
    }
    this.switchedAt = now
    return true
  }

  private storyCycleIds(): BrainRendererId[] {
    // Print2D è escluso dalla rotazione story-cycle normale, ma durante
    // la Riattivazione (PIANO-034) deve girare — è l'unico momento in cui
    // compare, per costruzione, non per eccezione occasionale.
    const boosted = this.getBoostHint?.() ?? false
    const storyCycleExcluded = boosted ? AUTOMATICALLY_EXCLUDED_RENDERERS : STORY_CYCLE_EXCLUDED_RENDERERS
    // L'esclusione per regime NON dipende da `boosted`: il regime vince
    // sempre sull'evento tecnico (brief §13/§14 della nota Visual), a
    // differenza del filtro pressione GPU qui sotto.
    const regimeExcluded = excludedForRegime(this.getRegime?.() ?? 'unresolved')
    const excluded = new Set<BrainRendererId>([...storyCycleExcluded, ...regimeExcluded])
    const enabled = this.availableIds.filter((id) => !excluded.has(id))
    const base = enabled.length > 0 ? enabled : this.automaticIds()
    // Segnalato dal Capo Supremo (log reali): durante la Riattivazione il
    // filtro pressione escludeva sistematicamente i renderer pesanti
    // (incluso Fractal Spiral Degeneration), perché l'alternanza rapidissima
    // della Riattivazione stessa (min/max hold 1-2 fotogrammi) genera gap RAF
    // che il thermalScheduler legge come pressione reale — la generazione è
    // comunque sospesa durante la Riattivazione (PIANO-034), quindi non c'è
    // vera contesa GPU da denoising da proteggere qui. La garanzia di
    // copertura completa (tutti i renderer visti almeno una volta) vale più
    // del filtro pressione in questa fase.
    if (boosted) return base
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
    return selectBrainRendererHoldFrames(
      this.activeId,
      this.random,
      this.getBoostHint?.() ?? false,
      this.getRegime?.(),
    ) - 1
  }

  private nextRotationId(): BrainRendererId {
    this.rotationDeck = this.rotationDeck.filter((id) => this.regimeAllows(id))
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
    if (this.reconcileCurrentRegime(now)) return true
    if (this.storyDeck.length === 0) this.beginDeckWith(this.activeId)
    if (this.storyHoldRemaining > 0) {
      this.storyHoldRemaining -= 1
      return false
    }
    if (this.storyDeckIndex >= this.storyDeck.length - 1) {
      if (!this.getBoostHint?.()) return false
      // Riattivazione: la storia sintetica dura molto più a lungo di una
      // storia normale (fino a 3 giri delle immagini scelte) — il mazzo
      // si rifornisce da solo invece di fermarsi sull'ultimo renderer,
      // così l'alternanza continua per l'intera durata.
      this.storyDeck = [...this.storyDeck, ...this.shuffled(this.storyCycleIds())]
    }
    this.storyDeckIndex += 1
    this.activeId = this.storyDeck[this.storyDeckIndex]
    this.storyHoldRemaining = this.storyHoldForActive()
    this.recordExposure(this.activeId, this.storyHoldRemaining + 1)
    this.switchedAt = now
    return true
  }

  advanceWaitingRenderer(settings: AppSettings, now: number): boolean {
    if (settings.brainRendererMode !== 'story-cycle') return false
    if (this.reconcileCurrentRegime(now)) return true
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

  // Segnalato dal Capo Supremo (log reali, Riattivazione 2026-08-25): un
  // renderer che fallisce il proprio controllo qualità (es. Vector Morph,
  // "meno di cinque forme riconoscibili") non recupera da solo — la rete di
  // sicurezza di `brainRendererHost.ts` copre lo schermo, ma senza questo
  // metodo il mazzo restava fermo sull'entrata fallita per l'intera durata
  // residua del fotogramma (fino a ~20s), lasciando la rete di sicurezza
  // (Print2D durante la Riattivazione) esposta molto più a lungo del
  // previsto. Fa avanzare subito il mazzo, azzerando l'hold residuo, così
  // la prossima `getRendererId` restituisce un nuovo renderer nel giro di
  // pochi fotogrammi invece che al prossimo cambio immagine.
  reportRendererFailure(
    failedId: BrainRendererId,
    settings: AppSettings,
    now: number,
  ): void {
    if (settings.brainRendererMode !== 'story-cycle') return
    if (this.activeId !== failedId) return
    if (this.storyId === null) return
    this.storyHoldRemaining = 0
    this.advanceStoryRenderer(this.storyId, settings, now)
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

    this.reconcileCurrentRegime(now)

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
