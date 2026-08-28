import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import {
  isMorphingAlgorithm,
  type AppSettings,
  type MorphingAlgorithm,
  type MorphingTransitionState,
  type PublicSessionStatus,
  type VisualStatePayload,
} from '@shared/types'
import {
  buildMorphingInterludeDeck,
  morphingRotationCandidateFromSettings,
  type MorphingRotationCandidate,
} from '@shared/morphingRotation'
import { createVisualSurface } from './visualSurface'
import { createMorphingCanvas } from './morphingCanvas'
import { createOniricMorphingCanvas } from './oniricMorphingCanvas'
import { createPsyHypMorphingCanvas } from './psyHypMorphingCanvas'
import { create2001MorphingCanvas } from './slitScanCanvas'
import {
  createBrainController,
  type BrainStoryCycleCompletion,
} from './brain/brainController'
import { OutputRhythmClock, type BrainRhythmState } from './brain/brainRhythm'
import {
  BrainBioPerceptionClock,
  type BrainBioPerceptionState,
  type BrainBioPressureTrend,
  type BrainBioRegime,
  type BrainBioRegimeDiagnostics,
} from './brain/brainBioPerception'
import {
  calculateStoryMorphingInterludeMs,
  createAlternateBrainStorySettings,
  createAlternateMorphingSettings,
} from './brain/brainStoryAlternation'
import { brainLog } from './brain/brainLog'

/** Lato più piccolo ancora leggibile da un telefono a distanza ravvicinata. */
const PUBLIC_SESSION_QR_SIZE_PX = 84

const BRAIN_RENDERER_LABELS: Record<string, string> = {
  print2d: 'Print2D',
  psycho2d: 'Psycho2D',
  'vector-morph': 'Vector Morph',
  'material-morph': 'Materia Morph',
  'filter-psiche': 'FilterPsiche',
  'bauhaus-morph': 'Bauhaus Morph',
  'dream-segmentation': 'Dream Segmentation',
  'glitch-morph': 'Glitch Morph',
  'fractal-spiral-degeneration': 'Fractal Spiral Degeneration',
}

// PIANO-040: overlay diagnostico del livello bio-percettivo — solo
// formattazione per la lettura a schermo, nessuna logica.
const BIO_TREND_ARROWS: Record<BrainBioPressureTrend, string> = {
  rising: '↑',
  stable: '→',
  falling: '↓',
}

function formatBioSignal(value: number | undefined): string {
  return typeof value === 'number' ? value.toFixed(2) : '—'
}

// PIANO-040, brief finale Audio/Visual "due assi" (2026-08-28): la forma
// (stasi/trasformazione) è `reference.phase`, non più una conferma a
// tempo sul regime — `diagnostics.transforming` la espone direttamente.
// Il livello (alto/profondo) usa mediana/dispersione come puro contesto
// (§6 del brief), con isteresi già applicata in `diagnostics.level`.
function formatBioRegimeDiagnostics(diagnostics: BrainBioRegimeDiagnostics | null): string {
  if (!diagnostics) return 'pressione: — | rif.: —\nblocco: dati non ancora disponibili'
  const referenceLabel = diagnostics.referencePressure.toFixed(2)
  const medianLabel = Number.isNaN(diagnostics.pressureMedian)
    ? '—'
    : diagnostics.pressureMedian.toFixed(2)
  const dispersionLabel = diagnostics.pressureDispersion.toFixed(2)
  const distanceLabel = `${diagnostics.pressureDistance >= 0 ? '+' : ''}${diagnostics.pressureDistance.toFixed(2)}`
  const position = [
    `pressione ${diagnostics.currentPressure.toFixed(2)} | rif. ${referenceLabel}`,
    `Δrif ${distanceLabel}`,
    `mediana ${medianLabel} (disp ${dispersionLabel}, contesto)`,
  ].join(' | ')
  if (diagnostics.silenceNearZero && !diagnostics.silenceAuthorized) {
    return `${position}\nblocco: silenzio non ancora confermato (${Math.round(diagnostics.silenceConfirmationProgress * 100)}%)`
  }
  if (diagnostics.silenceAuthorized) {
    return `${position}\nautorizzato: silenzio confermato`
  }
  if (diagnostics.transforming) {
    return `${position}\nin trasformazione — ${diagnostics.pressureTrend === 'falling' ? 'DECOMPRESSIONE' : 'PRESSURIZZAZIONE'}`
  }
  return `${position}\nstasi strutturale — livello ${diagnostics.level ?? 'non ancora determinato'}`
}

// Nomi visibili (brief Visual "due assi", 2026-08-28, §2/§23): `PRESSURIZED`
// resta l'id tecnico interno, ma overlay/documentazione/comunicazione
// artistica devono mostrare "PRESSURIZZAZIONE" — descrive un processo, non
// uno stato già stabilizzato.
const BIO_REGIME_DISPLAY_NAMES: Record<BrainBioRegime, string> = {
  unresolved: 'NON RISOLTO',
  pressurized: 'PRESSURIZZAZIONE',
  decompression: 'DECOMPRESSIONE',
  'respiro-alto': 'RESPIRO ALTO',
  'respiro-profondo': 'RESPIRO PROFONDO',
}

const MORPHING_ALGO_LABELS: Record<string, string> = {
  liquid: 'Liquid Morphing',
  oniric: 'Oniric Morphing',
  'psy-hyp': 'PsyHyp Morphing',
  '2001': '2001 Slit-Scan',
}

type VisualFamily = MorphingAlgorithm | 'brain'

type MorphingController = {
  updateState: (state: VisualStatePayload) => void
  setOpacity?: (opacity: number) => void
  setTransitionState?: (transition: MorphingTransitionState | null) => void
  resumeStoryCycleAfterInterlude?: () => void
  destroy: () => void
  __algo?: VisualFamily
  __key?: string
  __settings?: VisualStatePayload['settings']
}

type MorphingTransition = {
  from: MorphingController | null
  to: MorphingController | null
  durationMs: number
  active: boolean
  kind: MorphingTransitionState['kind']
  preserveFrom?: boolean
  visualElapsedMs: number
  lastVisualUpdateAt: number
}

export function shouldApplyVisualChangeOnRhythm(
  currentKey: string,
  targetKey: string,
  rhythm: BrainRhythmState,
): boolean {
  if (currentKey === targetKey) return true
  if (rhythm.active !== true) return true
  return rhythm.beat || rhythm.beatPhase <= 0.07 || rhythm.beatPhase >= 0.93
}

const MORPHING_TRANSITION_MIN_MS = 4_500
const MORPHING_TRANSITION_MAX_MS = 7_500
const ENTER_2001_TRANSITION_MS = 3_600
const EXIT_2001_TRANSITION_MS = 3_800
const INTERNAL_2001_PRESET_TRANSITION_MS = 1_600

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function smootherstep(x: number): number {
  const k = clamp01(x)
  return k * k * k * (k * (k * 6 - 15) + 10)
}

export function advanceVisualTransitionClock(
  elapsedMs: number,
  lastUpdateAt: number,
  now: number,
  durationMs: number,
): { elapsedMs: number; lastUpdateAt: number; progress: number } {
  const delta = Math.max(0, Math.min(50, now - lastUpdateAt))
  const nextElapsed = elapsedMs + delta
  return {
    elapsedMs: nextElapsed,
    lastUpdateAt: now,
    progress: smootherstep(nextElapsed / Math.max(1, durationMs)),
  }
}

function randomTransitionDuration(): number {
  return MORPHING_TRANSITION_MIN_MS + Math.random() * (MORPHING_TRANSITION_MAX_MS - MORPHING_TRANSITION_MIN_MS)
}

function morphingKey(state: VisualStatePayload): string {
  if (!state.settings) return 'none'
  if (state.settings.useBrain) return 'brain:brain-default'
  if (!state.useMorphing) return 'none'
  const algo = isMorphingAlgorithm(state.settings.morphingAlgorithm) ? state.settings.morphingAlgorithm : 'liquid'
  return `${algo}:${state.settings.morphingPresetId}`
}

function morphingFamilyFromKey(key: string): VisualFamily | 'none' {
  if (key === 'none') return 'none'
  const family = key.split(':')[0]
  if (family === 'brain') return 'brain'
  return isMorphingAlgorithm(family) ? family : 'liquid'
}

function visualModeActive(state: VisualStatePayload): boolean {
  return !!state.settings && (state.settings.useBrain === true || state.useMorphing === true)
}

function withVisualSettings(
  state: VisualStatePayload,
  settings: AppSettings,
): VisualStatePayload {
  return {
    ...state,
    useMorphing: settings.useMorphing,
    settings,
  }
}

function brainStoryState(state: VisualStatePayload): VisualStatePayload {
  if (!state.settings) return state
  return withVisualSettings(state, createAlternateBrainStorySettings(state.settings))
}

function transitionKind(fromKey: string, toKey: string): MorphingTransitionState['kind'] {
  const from = morphingFamilyFromKey(fromKey)
  const to = morphingFamilyFromKey(toKey)
  if (from === '2001' && to === '2001') return 'internal2001'
  if (from !== '2001' && to === '2001') return 'enter2001'
  if (from === '2001' && to !== '2001') return 'exit2001'
  return 'standard'
}

function createMorphingController(
  container: HTMLElement,
  state: VisualStatePayload,
  onBrainStoryCycleComplete?: (completion: BrainStoryCycleCompletion) => void,
  rhythmSource?: () => BrainRhythmState,
  bioPerceptionSource?: () => BrainBioPerceptionState,
): MorphingController | null {
  if (!visualModeActive(state) || !state.settings) return null
  if (state.settings.useBrain) {
    const controller: MorphingController = createBrainController(container, {
      onStoryCycleComplete: onBrainStoryCycleComplete,
      rhythmSource,
      bioPerceptionSource,
    })
    controller.__algo = 'brain'
    controller.__key = morphingKey(state)
    controller.__settings = state.settings
    return controller
  }
  const algo = isMorphingAlgorithm(state.settings.morphingAlgorithm) ? state.settings.morphingAlgorithm : 'liquid'
  const controller: MorphingController =
    algo === 'oniric'
      ? createOniricMorphingCanvas(container, rhythmSource)
      : algo === 'psy-hyp'
        ? createPsyHypMorphingCanvas(container, rhythmSource)
        : algo === '2001'
          ? create2001MorphingCanvas(container, rhythmSource)
          : createMorphingCanvas(container, rhythmSource)
  controller.__algo = algo
  controller.__key = morphingKey(state)
  controller.__settings = state.settings
  return controller
}

function beginMorphingTransition(
  container: HTMLElement,
  state: VisualStatePayload,
  from: MorphingController | null,
  onBrainStoryCycleComplete?: (completion: BrainStoryCycleCompletion) => void,
  preserveFrom = false,
  rhythmSource?: () => BrainRhythmState,
  bioPerceptionSource?: () => BrainBioPerceptionState,
): MorphingTransition {
  const fromKey = from?.__key ?? 'none'
  const toKey = morphingKey(state)
  const kind = transitionKind(fromKey, toKey)
  const durationMs =
    kind === 'enter2001'
      ? ENTER_2001_TRANSITION_MS
      : kind === 'exit2001'
        ? EXIT_2001_TRANSITION_MS
        : kind === 'internal2001'
          ? INTERNAL_2001_PRESET_TRANSITION_MS
          : randomTransitionDuration()
  return {
    from,
    to: createMorphingController(
      container,
      state,
      onBrainStoryCycleComplete,
      rhythmSource,
      bioPerceptionSource,
    ),
    durationMs,
    active: true,
    kind,
    preserveFrom,
    visualElapsedMs: 0,
    lastVisualUpdateAt: performance.now(),
  }
}

function beginMorphingTransitionTo(
  state: VisualStatePayload,
  from: MorphingController,
  to: MorphingController,
): MorphingTransition {
  const kind = transitionKind(from.__key ?? 'none', to.__key ?? morphingKey(state))
  const durationMs =
    kind === 'enter2001'
      ? ENTER_2001_TRANSITION_MS
      : kind === 'exit2001'
        ? EXIT_2001_TRANSITION_MS
        : kind === 'internal2001'
          ? INTERNAL_2001_PRESET_TRANSITION_MS
          : randomTransitionDuration()
  return {
    from,
    to,
    durationMs,
    active: true,
    kind,
    visualElapsedMs: 0,
    lastVisualUpdateAt: performance.now(),
  }
}

function updateMorphingTransition(
  transition: MorphingTransition,
  state: VisualStatePayload,
  now = performance.now(),
): MorphingController | null {
  const clock = advanceVisualTransitionClock(
    transition.visualElapsedMs,
    transition.lastVisualUpdateAt,
    now,
    transition.durationMs,
  )
  transition.visualElapsedMs = clock.elapsedMs
  transition.lastVisualUpdateAt = clock.lastUpdateAt
  const progress = clock.progress
  if (transition.kind === 'enter2001') {
    transition.from?.setOpacity?.(1 - progress * 0.85)
    transition.to?.setOpacity?.(1)
    transition.to?.setTransitionState?.({ kind: 'enter2001', progress })
  } else if (transition.kind === 'exit2001') {
    transition.from?.setOpacity?.(1)
    transition.from?.setTransitionState?.({ kind: 'exit2001', progress })
    transition.to?.setOpacity?.(smootherstep(Math.max(0, (progress - 0.18) / 0.82)))
  } else {
    transition.from?.setOpacity?.(1 - progress)
    transition.to?.setOpacity?.(progress)
  }
  if (transition.from?.__settings) {
    transition.from.updateState({ ...state, useMorphing: true, settings: transition.from.__settings })
  }
  transition.to?.updateState(state)

  if (progress >= 1) {
    transition.from?.setTransitionState?.(null)
    transition.to?.setTransitionState?.(null)
    if (!transition.preserveFrom) transition.from?.destroy()
    transition.to?.setOpacity?.(1)
    return transition.to
  }

  return null
}

export function OutputApp() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const surfaceRef = useRef<ReturnType<typeof createVisualSurface> | null>(null)
  const morphingRef = useRef<MorphingController | null>(null)
  const morphingTransitionRef = useRef<MorphingTransition | null>(null)
  const previousBioRegimeRef = useRef<BrainBioRegime | null>(null)
  const bioRegimeFlashTimeoutRef = useRef<number | null>(null)
  const bioOverlayVisibleRef = useRef(false)
  const lastBioSessionSampleAtRef = useRef(Number.NEGATIVE_INFINITY)
  const [msgCount, setMsgCount] = useState(0)
  const [lastColor, setLastColor] = useState<string>('—')
  const [activeRendererLabel, setActiveRendererLabel] = useState<string>('—')
  const [revisionCycleActive, setRevisionCycleActive] = useState(false)
  const [publicSessionActive, setPublicSessionActive] = useState(false)
  const [publicSessionQrDataUrl, setPublicSessionQrDataUrl] = useState<string | null>(null)
  // PIANO-040: overlay diagnostico del livello bio-percettivo — richiesto dal
  // Capo Supremo per l'ascolto dal vivo (Task 4.4), non un dato per la
  // performance. Disattivato di default (mai attivo in produzione live senza
  // azione esplicita), si accende/spegne con Maiusc+B.
  const [bioOverlayVisible, setBioOverlayVisible] = useState(false)
  const [bioOverlayState, setBioOverlayState] = useState<BrainBioPerceptionState | null>(null)
  const [bioRegimeChangedAtLabel, setBioRegimeChangedAtLabel] = useState<string>('—')
  const [bioRegimeChangeCount, setBioRegimeChangeCount] = useState(0)
  const [bioRegimeJustChanged, setBioRegimeJustChanged] = useState(false)
  const [bioDreamMultiplier, setBioDreamMultiplier] = useState<string>('—')
  // Richiesto dal braccio destro (2026-08-27): non solo il regime attuale,
  // anche cosa lo blocca — quale transizione è in attesa e quanto manca
  // alla conferma.
  const [bioRegimePending, setBioRegimePending] = useState<BrainBioRegimeDiagnostics | null>(null)

  // La scorciatoia diagnostica delimita anche la registrazione dettagliata.
  // Il session logger del Main cattura questi eventi dal renderer nel file
  // `log/session-*.txt`; fuori dal collaudo non aggiungiamo traffico a 1 Hz.
  useEffect(() => {
    const wasVisible = bioOverlayVisibleRef.current
    bioOverlayVisibleRef.current = bioOverlayVisible
    if (bioOverlayVisible && !wasVisible) {
      lastBioSessionSampleAtRef.current = Number.NEGATIVE_INFINITY
      brainLog('perception-session', 'registrazione bio-percettiva avviata', {
        sampleIntervalMs: 1_000,
      })
    } else if (!bioOverlayVisible && wasVisible) {
      brainLog('perception-session', 'registrazione bio-percettiva conclusa')
    }
  }, [bioOverlayVisible])

  useEffect(() => {
    const id = window.setInterval(() => {
      const algo = morphingRef.current?.__algo
      if (algo === 'brain') {
        const brainRendererId = rootRef.current
          ?.querySelector<HTMLElement>('[data-active-renderer]')
          ?.dataset.activeRenderer
        setActiveRendererLabel(
          brainRendererId
            ? BRAIN_RENDERER_LABELS[brainRendererId] ?? brainRendererId
            : 'Brain',
        )
        setRevisionCycleActive(
          rootRef.current
            ?.querySelector<HTMLElement>('[data-revision-cycle-active]')
            ?.dataset.revisionCycleActive === 'true',
        )
      } else if (algo) {
        setActiveRendererLabel(MORPHING_ALGO_LABELS[algo] ?? algo)
        setRevisionCycleActive(false)
      } else {
        setActiveRendererLabel('—')
        setRevisionCycleActive(false)
      }
      // PIANO-040: moltiplicatore di regime letto dal DOM, stesso pattern di
      // `data-active-renderer` sopra — sola lettura diagnostica, nessun canale
      // di trasporto nuovo. Presente solo quando Dream-Segmentation ha
      // effettivamente disegnato almeno un fotogramma.
      const dreamMultiplier = rootRef.current
        ?.querySelector<HTMLElement>('[data-brain-dream-segmentation]')
        ?.dataset.brainRegimeMultiplier
      setBioDreamMultiplier(dreamMultiplier ?? '—')
    }, 250)
    return () => window.clearInterval(id)
  }, [])

  // PIANO-040: overlay diagnostico, disattivato di default — Maiusc+B lo
  // accende/spegne. Strumento di collaudo (brief §10/§12), mai attivo in
  // produzione live senza che qualcuno lo accenda esplicitamente.
  //
  // BUG segnalato dal Capo Supremo ("non vedo nulla a video") e corretto:
  // un `keydown` sul solo renderer Output non basta — nella configurazione
  // reale a due finestre l'Output è fullscreen sul proiettore e quasi mai
  // ha il fuoco della tastiera, chi opera il set preme il tasto guardando
  // Control. La scorciatoia vera è registrata a livello OS in
  // `src/main/windows.ts` (`globalShortcut`) e arriva qui via IPC — il
  // listener locale resta solo come fallback innocuo per quando l'Output
  // ha davvero il fuoco (es. sviluppo con una sola finestra).
  useEffect(() => {
    const api = window.fxOutput
    if (!api) return
    const off = api.onToggleBioOverlay(() => {
      setBioOverlayVisible((visible) => !visible)
    })
    return off
  }, [])
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.shiftKey && event.key.toLowerCase() === 'b') {
        setBioOverlayVisible((visible) => !visible)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const api = window.fxOutput
    if (!api) return

    const offStatus = api.onPublicSessionStatus((status: PublicSessionStatus) => {
      setPublicSessionActive(status.active)
      if (!status.active || !status.formUrl) {
        setPublicSessionQrDataUrl(null)
        return
      }
      QRCode.toDataURL(status.formUrl, { width: PUBLIC_SESSION_QR_SIZE_PX, margin: 1 })
        .then(setPublicSessionQrDataUrl)
        .catch(() => setPublicSessionQrDataUrl(null))
    })

    return offStatus
  }, [])

  useEffect(() => {
    const api = window.fxOutput
    if (!api || !rootRef.current) return

    surfaceRef.current = createVisualSurface(rootRef.current)

    let latestInputState: VisualStatePayload | null = null
    let latestRenderedState: VisualStatePayload | null = null
    let alternationWasEnabled = false
    let alternationPhase: 'brain' | 'morphing' = 'brain'
    let morphingInterludeUntil = Number.NEGATIVE_INFINITY
    let alternateMorphingSettings: AppSettings | null = null
    let alternateMorphingDeck: MorphingRotationCandidate[] = []
    let previousAlternateMorphing: MorphingRotationCandidate | null = null
    let parkedBrainController: MorphingController | null = null
    const rhythmClock = new OutputRhythmClock()
    let rhythmState = rhythmClock.projectState(
      performance.timeOrigin + performance.now(),
    )
    const rhythmSource = () => rhythmState
    // Stato bio-percettivo (PIANO-040, brief team/briefs/brief-stato-bio-percettivo-
    // definitivo.md §10/§17.3): calcolato lato Output accanto al clock ritmico, non
    // dentro. Alimentato allo stesso ingest delle bande (sotto), letto da
    // `createBrainController` via `bioPerceptionSource` — stesso pattern di
    // `rhythmSource`, aggiornato a bassa frequenza (il clock stesso decide quando il
    // valore cambia davvero, non ad ogni frame RAF).
    const bioPerceptionClock = new BrainBioPerceptionClock()
    let bioPerceptionState = bioPerceptionClock.getState()
    const bioPerceptionSource = () => bioPerceptionState
    let rhythmRafId = 0
    const projectRhythm = (now: number) => {
      rhythmState = rhythmClock.projectState(performance.timeOrigin + now)
      const transition = morphingTransitionRef.current
      if (transition?.active && latestRenderedState) {
        const completed = updateMorphingTransition(
          transition,
          latestRenderedState,
          now,
        )
        if (completed) {
          morphingTransitionRef.current = null
          morphingRef.current = completed
          completed.__settings = latestRenderedState.settings
          completed.__key = morphingKey(latestRenderedState)
          completed.setOpacity?.(1)
        }
      }
      rhythmRafId = requestAnimationFrame(projectRhythm)
    }
    rhythmRafId = requestAnimationFrame(projectRhythm)

    const onBrainStoryCycleComplete = (completion: BrainStoryCycleCompletion): void => {
      const settings = latestInputState?.settings
      if (!settings?.alternateBrainWithMorphing) return
      const previous = previousAlternateMorphing ??
        morphingRotationCandidateFromSettings(settings)
      if (alternateMorphingDeck.length === 0) {
        alternateMorphingDeck = buildMorphingInterludeDeck(previous)
      }
      const candidate = alternateMorphingDeck.shift()
      if (!candidate) return
      if (candidate.algorithm === 'none') return
      previousAlternateMorphing = candidate
      alternateMorphingSettings = createAlternateMorphingSettings(
        settings,
        candidate.algorithm,
        candidate.presetId ?? 'default',
      )
      alternationPhase = 'morphing'
      morphingInterludeUntil = performance.now() +
        calculateStoryMorphingInterludeMs(completion.brainDurationMs)
    }

    const off = api.onVisualState((inputState: VisualStatePayload) => {
      // Libera subito il canale: il Main può conservare un solo pending recente.
      api.sendVisualStateAck(inputState.sequenceNumber)
      if (inputState.bandEnergies) {
        const receivedAt = performance.timeOrigin + performance.now()
        rhythmClock.ingestSample(
          inputState.bandEnergies,
          inputState.audioTimestampMs,
          inputState.movingAverages,
          inputState.sequenceNumber,
          receivedAt,
        )
        // Non proiettare qui: projectState consuma il latch `beat`. Il solo RAF
        // Output pubblica il fronte, così tutti i renderer osservano lo stesso
        // stato per l'intero frame visuale.
        //
        // Stato bio-percettivo: alimentato allo stesso ingest, non nel RAF di
        // proiezione — è una memoria multi-secondo, non ha bisogno di essere
        // ricalcolata a ogni frame (§10/§17.3 del brief). `rhythmState.bandTransients`
        // è l'ultima proiezione disponibile (leggermente in ritardo rispetto a questo
        // campione): tollerabile; il regime applica comunque 3 s di conferma.
        bioPerceptionState = bioPerceptionClock.ingestSample(
          inputState.bandEnergies,
          inputState.audioTimestampMs ?? receivedAt,
          rhythmState.bandTransients,
        )
        // PIANO-040: overlay diagnostico — solo lettura, nessun effetto sul
        // comportamento. `previousBioRegimeRef` distingue "primo valore mai
        // visto" (non è un cambio, è l'arrivo del primo dato) da un cambio
        // di regime vero, che è invece l'evento che il Capo Supremo ha
        // chiesto di rendere visibile ("se resta bloccato sullo stesso
        // valore per tutto il set, quello è il dato che serve").
        const bioDiagnostics = bioPerceptionClock.getRegimeDiagnostics()
        setBioOverlayState(bioPerceptionState)
        setBioRegimePending(bioDiagnostics)
        const bioSampleAt = inputState.audioTimestampMs ?? receivedAt
        if (
          bioOverlayVisibleRef.current &&
          bioSampleAt - lastBioSessionSampleAtRef.current >= 1_000
        ) {
          lastBioSessionSampleAtRef.current = bioSampleAt
          const activeRenderer = rootRef.current
            ?.querySelector<HTMLElement>('[data-active-renderer]')
            ?.dataset.activeRenderer ?? null
          brainLog('perception-session', 'campione bio-percettivo 1 Hz', {
            audioTimestampMs: bioSampleAt,
            sequenceNumber: inputState.sequenceNumber,
            bands: inputState.bandEnergies,
            transients: rhythmState.bandTransients,
            signals: bioPerceptionState.signals,
            diagnostics: bioDiagnostics,
            regime: bioPerceptionState.regime,
            activeRenderer,
          })
        }
        if (
          previousBioRegimeRef.current !== null &&
          previousBioRegimeRef.current !== bioPerceptionState.regime
        ) {
          setBioRegimeChangedAtLabel(new Date().toLocaleTimeString())
          setBioRegimeChangeCount((count) => count + 1)
          setBioRegimeJustChanged(true)
          if (bioRegimeFlashTimeoutRef.current !== null) {
            window.clearTimeout(bioRegimeFlashTimeoutRef.current)
          }
          bioRegimeFlashTimeoutRef.current = window.setTimeout(() => {
            setBioRegimeJustChanged(false)
            bioRegimeFlashTimeoutRef.current = null
          }, 2_500)
        }
        previousBioRegimeRef.current = bioPerceptionState.regime
      }
      latestInputState = inputState
      const alternationEnabled = inputState.settings?.alternateBrainWithMorphing === true
      if (alternationEnabled && !alternationWasEnabled) {
        alternationPhase = 'brain'
        alternateMorphingSettings = null
        alternateMorphingDeck = []
        previousAlternateMorphing = morphingRotationCandidateFromSettings(
          inputState.settings!,
        )
        morphingInterludeUntil = Number.NEGATIVE_INFINITY
      } else if (!alternationEnabled && alternationWasEnabled) {
        alternationPhase = 'brain'
        alternateMorphingSettings = null
        alternateMorphingDeck = []
        previousAlternateMorphing = null
      }
      alternationWasEnabled = alternationEnabled
      if (
        alternationEnabled &&
        alternationPhase === 'morphing' &&
        performance.now() >= morphingInterludeUntil
      ) {
        alternationPhase = 'brain'
        alternateMorphingSettings = null
      }
      const state = alternationEnabled
        ? alternationPhase === 'morphing' && alternateMorphingSettings
          ? withVisualSettings(inputState, alternateMorphingSettings)
          : brainStoryState(inputState)
        : inputState
      // Base flat color
      surfaceRef.current?.setColor(state.backgroundColor)
      
      const targetKey = morphingKey(state)
      const currentKey = morphingRef.current?.__key ?? 'none'
      const currentFamily = morphingFamilyFromKey(currentKey)
      const targetFamily = morphingFamilyFromKey(targetKey)
      const targetTransitionKind = transitionKind(currentKey, targetKey)
      if (!shouldApplyVisualChangeOnRhythm(currentKey, targetKey, rhythmState)) {
        if (morphingRef.current?.__settings) {
          morphingRef.current.updateState({
            ...state,
            useMorphing: true,
            settings: morphingRef.current.__settings,
          })
        }
        setMsgCount((n) => n + 1)
        setLastColor(state.backgroundColor)
        return
      }
      latestRenderedState = state
      const dynamicCrossfade =
        alternationEnabled ||
        parkedBrainController !== null ||
        state.settings?.dynamicPresetEnabled === true ||
        morphingTransitionRef.current?.active === true ||
        targetTransitionKind === 'enter2001' ||
        targetTransitionKind === 'exit2001'

      if (
        visualModeActive(state) &&
        state.settings &&
        currentFamily === '2001' &&
        targetFamily === '2001' &&
        morphingRef.current &&
        currentKey !== targetKey
      ) {
        morphingTransitionRef.current?.from?.destroy()
        morphingTransitionRef.current?.to?.destroy()
        morphingTransitionRef.current = null
        morphingRef.current.setOpacity?.(1)
        morphingRef.current.setTransitionState?.({ kind: 'internal2001', progress: 0 })
        morphingRef.current.updateState(state)
        morphingRef.current.__settings = state.settings
        morphingRef.current.__key = targetKey
        window.setTimeout(() => {
          morphingRef.current?.setTransitionState?.(null)
        }, INTERNAL_2001_PRESET_TRANSITION_MS)
        setMsgCount((n) => n + 1)
        setLastColor(state.backgroundColor)
        return
      }

      if (!dynamicCrossfade) {
        if (visualModeActive(state) && state.settings) {
          const algo: VisualFamily = state.settings.useBrain
            ? 'brain'
            : isMorphingAlgorithm(state.settings.morphingAlgorithm)
              ? state.settings.morphingAlgorithm
              : 'liquid'

          if (algo !== 'psy-hyp' && morphingTransitionRef.current) {
            morphingTransitionRef.current.from?.destroy()
            morphingTransitionRef.current.to?.destroy()
            morphingTransitionRef.current = null
          }

          if (morphingRef.current && morphingRef.current.__algo !== algo) {
            morphingTransitionRef.current?.from?.destroy()
            morphingTransitionRef.current?.to?.destroy()
            morphingTransitionRef.current = null
            morphingRef.current.destroy()
            morphingRef.current = null
          }

          const shouldSoftSwitchPsyHyp =
            algo === 'psy-hyp' &&
            morphingRef.current &&
            (morphingRef.current.__key ?? 'none') !== targetKey

          if (shouldSoftSwitchPsyHyp) {
            morphingTransitionRef.current?.from?.destroy()
            morphingTransitionRef.current = beginMorphingTransition(
              rootRef.current!,
              state,
              morphingRef.current,
              onBrainStoryCycleComplete,
              false,
              rhythmSource,
              bioPerceptionSource,
            )
            morphingRef.current = morphingTransitionRef.current.to
            morphingRef.current?.setOpacity?.(0)
          }

          const transition = morphingTransitionRef.current
          if (transition?.active) {
            const completed = updateMorphingTransition(transition, state)
            if (completed) {
              morphingTransitionRef.current = null
              morphingRef.current = completed
              morphingRef.current.__settings = state.settings
              morphingRef.current.__key = targetKey
            }
          }

          if (!morphingRef.current) {
            morphingRef.current = createMorphingController(
              rootRef.current!,
              state,
              onBrainStoryCycleComplete,
              rhythmSource,
              bioPerceptionSource,
            )
            morphingRef.current?.setOpacity?.(1)
          }
          morphingRef.current?.updateState(state)
          if (morphingRef.current) {
            morphingRef.current.__settings = state.settings
            morphingRef.current.__key = targetKey
          }
        } else if (morphingRef.current) {
          morphingRef.current.destroy()
          morphingRef.current = null
        }
      } else {
        if ((morphingRef.current?.__key ?? 'none') !== targetKey) {
          const returningToParkedBrain =
            targetFamily === 'brain' && parkedBrainController !== null
          const currentController = morphingRef.current
          const previousTransition = morphingTransitionRef.current
          const retainedControllers = new Set<MorphingController | null>([
            currentController,
            parkedBrainController,
          ])
          for (const controller of [previousTransition?.from, previousTransition?.to]) {
            if (controller && !retainedControllers.has(controller)) controller.destroy()
          }
          morphingTransitionRef.current = null

          if (returningToParkedBrain && parkedBrainController) {
            const brainController = parkedBrainController
            brainController.resumeStoryCycleAfterInterlude?.()
            if (currentController && currentController !== brainController) {
              morphingTransitionRef.current = beginMorphingTransitionTo(
                state,
                currentController,
                brainController,
              )
              morphingRef.current = brainController
              brainController.setOpacity?.(0)
            } else {
              morphingRef.current = brainController
              brainController.setOpacity?.(1)
            }
            parkedBrainController = null
          } else {
            const preserveBrain =
              alternationEnabled &&
              alternationPhase === 'morphing' &&
              currentFamily === 'brain' &&
              currentController !== null
            if (preserveBrain) parkedBrainController = currentController
            morphingTransitionRef.current = beginMorphingTransition(
              rootRef.current!,
              state,
              currentController,
              onBrainStoryCycleComplete,
              preserveBrain,
              rhythmSource,
              bioPerceptionSource,
            )
            morphingRef.current = morphingTransitionRef.current.to
            morphingRef.current?.setOpacity?.(0)
          }
        }

        const transition = morphingTransitionRef.current
        if (transition?.active) {
          const completed = updateMorphingTransition(transition, state)
          if (completed) {
            morphingTransitionRef.current = null
            morphingRef.current = completed
            morphingRef.current?.setOpacity?.(1)
          }
        } else if (morphingRef.current) {
          morphingRef.current.setOpacity?.(1)
          morphingRef.current.updateState(state)
          morphingRef.current.__settings = state.settings
          morphingRef.current.__key = targetKey
        }
      }

      setMsgCount((n) => n + 1)
      setLastColor(state.backgroundColor)
    })
    // Handshake: il Main invia il primo stato solo dopo la registrazione del listener.
    api.notifyVisualStateReady()

    return () => {
      off()
      cancelAnimationFrame(rhythmRafId)
      surfaceRef.current?.destroy()
      surfaceRef.current = null
      const controllers = new Set([
        morphingRef.current,
        morphingTransitionRef.current?.from,
        morphingTransitionRef.current?.to,
        parkedBrainController,
      ])
      for (const controller of controllers) controller?.destroy()
      morphingRef.current = null
      morphingTransitionRef.current = null
      parkedBrainController = null
    }
  }, [])

  if (!window.fxOutput) {
    return (
      <div style={{ color: 'red', padding: 20, fontFamily: 'monospace' }}>
        <h1>Errore IPC</h1>
        <p>window.fxOutput non è definito nel preload script.</p>
        <p>URL: {window.location.href}</p>
      </div>
    )
  }

  return (
    <div className="output-root" style={{ position: 'fixed', inset: 0, overflow: 'hidden', backgroundColor: 'black' }}>
      <div ref={rootRef} style={{ position: 'absolute', inset: 0 }} />
      {msgCount === 0 ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            display: 'grid',
            placeItems: 'center',
            background: '#170204',
            color: '#ffb3a6',
            fontFamily: 'monospace',
            fontSize: 18,
            letterSpacing: 0,
            pointerEvents: 'none',
          }}
        >
          USCITA PRONTA — in attesa dello stato visuale
        </div>
      ) : null}
      {/* Debug overlay — rimuovere dopo verifica */}
      <div
        style={{
          position: 'fixed',
          top: 8,
          left: 8,
          zIndex: 9999,
          background: 'rgba(0,0,0,0.65)',
          color: '#0f0',
          fontFamily: 'monospace',
          fontSize: 11,
          padding: '4px 8px',
          borderRadius: 4,
          pointerEvents: 'none',
          lineHeight: 1.6,
        }}
      >
        uscita: ✓<br />
        messaggi: {msgCount}<br />
        colore: {lastColor}
      </div>
      <div
        style={{
          position: 'fixed',
          bottom: 8,
          right: 8,
          zIndex: 9999,
          background: 'rgba(0,0,0,0.65)',
          color: '#0f0',
          fontFamily: 'monospace',
          fontSize: 12,
          padding: '4px 8px',
          borderRadius: 4,
          pointerEvents: 'none',
          lineHeight: 1.5,
        }}
      >
        {activeRendererLabel}
        {bioOverlayState && bioOverlayState.regime !== 'unresolved' && (
          // Brief del braccio destro (punto 2) + brief Visual "due assi"
          // §23: etichetta di stato accanto al tipo di morphing, sempre
          // visibile senza dover aprire l'overlay di collaudo Maiusc+B —
          // ora mostra lo stato reale (i quattro nomi visibili), non più
          // solo un flag binario "respiro sì/no".
          <>
            <br />
            <span style={{ color: '#7fd1ff' }}>{BIO_REGIME_DISPLAY_NAMES[bioOverlayState.regime]}</span>
          </>
        )}
        {revisionCycleActive && (
          <>
            <br />
            <span style={{ color: '#ffa53d' }}>Riattivazione attiva</span>
          </>
        )}
      </div>
      {bioOverlayVisible ? (
        <div
          style={{
            position: 'fixed',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: bioRegimeJustChanged ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.78)',
            color: bioRegimeJustChanged ? '#000' : '#fff',
            fontFamily: 'monospace',
            fontSize: 20,
            lineHeight: 1.5,
            padding: '10px 16px',
            borderRadius: 6,
            border: bioRegimeJustChanged ? '3px solid #fff' : '1px solid rgba(255,255,255,0.35)',
            pointerEvents: 'none',
            minWidth: 720,
          }}
        >
          <div style={{ fontSize: 14, opacity: 0.75, letterSpacing: 1 }}>
            BIO-PERCETTIVO — strumento di collaudo (Maiusc+B per nascondere)
          </div>
          <div style={{ fontSize: 26, fontWeight: 'bold', margin: '4px 0' }}>
            {bioOverlayState ? BIO_REGIME_DISPLAY_NAMES[bioOverlayState.regime] : '—'}
          </div>
          <div>persistence&nbsp;&nbsp;{formatBioSignal(bioOverlayState?.signals.persistence)}</div>
          <div>change&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{formatBioSignal(bioOverlayState?.signals.change)}</div>
          <div>residual&nbsp;&nbsp;&nbsp;&nbsp;{formatBioSignal(bioOverlayState?.signals.residual)}</div>
          <div>pressure&nbsp;&nbsp;&nbsp;&nbsp;{formatBioSignal(bioOverlayState?.signals.perceptualPressure)}</div>
          <div>
            trend&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            {bioOverlayState
              ? `${BIO_TREND_ARROWS[bioOverlayState.signals.pressureTrend]} ${bioOverlayState.signals.pressureTrend}`
              : '—'}
          </div>
          <div style={{ marginTop: 8, opacity: 0.85 }}>
            renderer: {activeRendererLabel}
            {bioDreamMultiplier !== '—' ? ` (×${bioDreamMultiplier})` : ''}
          </div>
          <div style={{ marginTop: 4, fontSize: 14, opacity: 0.75 }}>
            ultimo cambio regime: {bioRegimeChangedAtLabel} — cambi finora: {bioRegimeChangeCount}
          </div>
          <div style={{ marginTop: 4, fontSize: 16, opacity: 0.9, whiteSpace: 'pre-line' }}>
            {formatBioRegimeDiagnostics(bioRegimePending)}
          </div>
        </div>
      ) : null}
      {publicSessionActive && publicSessionQrDataUrl ? (
        <img
          src={publicSessionQrDataUrl}
          alt="QR sessione pubblica"
          style={{
            position: 'fixed',
            bottom: 8,
            left: 8,
            zIndex: 9999,
            width: PUBLIC_SESSION_QR_SIZE_PX,
            height: PUBLIC_SESSION_QR_SIZE_PX,
            borderRadius: 4,
            pointerEvents: 'none',
          }}
        />
      ) : null}
    </div>
  )
}
