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
  calculateStoryMorphingInterludeMs,
  createAlternateBrainStorySettings,
  createAlternateMorphingSettings,
} from './brain/brainStoryAlternation'

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
): MorphingController | null {
  if (!visualModeActive(state) || !state.settings) return null
  if (state.settings.useBrain) {
    const controller: MorphingController = createBrainController(container, {
      onStoryCycleComplete: onBrainStoryCycleComplete,
      rhythmSource,
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
  const [msgCount, setMsgCount] = useState(0)
  const [lastColor, setLastColor] = useState<string>('—')
  const [activeRendererLabel, setActiveRendererLabel] = useState<string>('—')
  const [revisionCycleActive, setRevisionCycleActive] = useState(false)
  const [publicSessionActive, setPublicSessionActive] = useState(false)
  const [publicSessionQrDataUrl, setPublicSessionQrDataUrl] = useState<string | null>(null)

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
    }, 250)
    return () => window.clearInterval(id)
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
        {revisionCycleActive && (
          <>
            <br />
            <span style={{ color: '#ffa53d' }}>Riattivazione attiva</span>
          </>
        )}
      </div>
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
