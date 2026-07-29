import { useEffect, useRef, useState } from 'react'
import {
  isMorphingAlgorithm,
  type MorphingAlgorithm,
  type MorphingTransitionState,
  type VisualStatePayload,
} from '@shared/types'
import { createVisualSurface } from './visualSurface'
import { createMorphingCanvas } from './morphingCanvas'
import { createOniricMorphingCanvas } from './oniricMorphingCanvas'
import { createPsyHypMorphingCanvas } from './psyHypMorphingCanvas'
import { create2001MorphingCanvas } from './slitScanCanvas'
import { createBrainController } from './brain/brainController'

type VisualFamily = MorphingAlgorithm | 'brain'

type MorphingController = {
  updateState: (state: VisualStatePayload) => void
  setOpacity?: (opacity: number) => void
  setTransitionState?: (transition: MorphingTransitionState | null) => void
  destroy: () => void
  __algo?: VisualFamily
  __key?: string
  __settings?: VisualStatePayload['settings']
}

type MorphingTransition = {
  from: MorphingController | null
  to: MorphingController | null
  startedAt: number
  durationMs: number
  active: boolean
  kind: MorphingTransitionState['kind']
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

function transitionKind(fromKey: string, toKey: string): MorphingTransitionState['kind'] {
  const from = morphingFamilyFromKey(fromKey)
  const to = morphingFamilyFromKey(toKey)
  if (from === '2001' && to === '2001') return 'internal2001'
  if (from !== '2001' && to === '2001') return 'enter2001'
  if (from === '2001' && to !== '2001') return 'exit2001'
  return 'standard'
}

function createMorphingController(container: HTMLElement, state: VisualStatePayload): MorphingController | null {
  if (!visualModeActive(state) || !state.settings) return null
  if (state.settings.useBrain) {
    const controller: MorphingController = createBrainController(container)
    controller.__algo = 'brain'
    controller.__key = morphingKey(state)
    controller.__settings = state.settings
    return controller
  }
  const algo = isMorphingAlgorithm(state.settings.morphingAlgorithm) ? state.settings.morphingAlgorithm : 'liquid'
  const controller: MorphingController =
    algo === 'oniric'
      ? createOniricMorphingCanvas(container)
      : algo === 'psy-hyp'
        ? createPsyHypMorphingCanvas(container)
        : algo === '2001'
          ? create2001MorphingCanvas(container)
          : createMorphingCanvas(container)
  controller.__algo = algo
  controller.__key = morphingKey(state)
  controller.__settings = state.settings
  return controller
}

function beginMorphingTransition(
  container: HTMLElement,
  state: VisualStatePayload,
  from: MorphingController | null,
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
    to: createMorphingController(container, state),
    startedAt: performance.now(),
    durationMs,
    active: true,
    kind,
  }
}

function updateMorphingTransition(transition: MorphingTransition, state: VisualStatePayload): MorphingController | null {
  const progress = smootherstep((performance.now() - transition.startedAt) / transition.durationMs)
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
    transition.from?.destroy()
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

  useEffect(() => {
    const api = window.fxOutput
    if (!api || !rootRef.current) return

    surfaceRef.current = createVisualSurface(rootRef.current)

    const off = api.onVisualState((state: VisualStatePayload) => {
      // Base flat color
      surfaceRef.current?.setColor(state.backgroundColor)
      
      const targetKey = morphingKey(state)
      const currentKey = morphingRef.current?.__key ?? 'none'
      const currentFamily = morphingFamilyFromKey(currentKey)
      const targetFamily = morphingFamilyFromKey(targetKey)
      const targetTransitionKind = transitionKind(currentKey, targetKey)
      const dynamicCrossfade =
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
            morphingTransitionRef.current = beginMorphingTransition(rootRef.current!, state, morphingRef.current)
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
            morphingRef.current = createMorphingController(rootRef.current!, state)
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
          morphingTransitionRef.current?.from?.destroy()
          morphingTransitionRef.current = beginMorphingTransition(rootRef.current!, state, morphingRef.current)
          morphingRef.current = morphingTransitionRef.current.to
          morphingRef.current?.setOpacity?.(0)
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

    return () => {
      off()
      surfaceRef.current?.destroy()
      surfaceRef.current = null
      morphingRef.current?.destroy()
      morphingRef.current = null
      morphingTransitionRef.current?.from?.destroy()
      morphingTransitionRef.current?.to?.destroy()
      morphingTransitionRef.current = null
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
    </div>
  )
}
