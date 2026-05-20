import { useEffect, useRef, useState } from 'react'
import { isMorphingAlgorithm, type MorphingAlgorithm, type VisualStatePayload } from '@shared/types'
import { createVisualSurface } from './visualSurface'
import { createMorphingCanvas } from './morphingCanvas'
import { createOniricMorphingCanvas } from './oniricMorphingCanvas'
import { createPsyHypMorphingCanvas } from './psyHypMorphingCanvas'

type MorphingController = {
  updateState: (state: VisualStatePayload) => void
  setOpacity?: (opacity: number) => void
  destroy: () => void
  __algo?: MorphingAlgorithm
  __key?: string
  __settings?: VisualStatePayload['settings']
}

type MorphingTransition = {
  from: MorphingController | null
  to: MorphingController | null
  startedAt: number
  durationMs: number
  active: boolean
}

const MORPHING_TRANSITION_MIN_MS = 4_000
const MORPHING_TRANSITION_MAX_MS = 8_000

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
  if (!state.useMorphing || !state.settings) return 'none'
  const algo = isMorphingAlgorithm(state.settings.morphingAlgorithm) ? state.settings.morphingAlgorithm : 'liquid'
  return `${algo}:${state.settings.morphingPresetId}`
}

function createMorphingController(container: HTMLElement, state: VisualStatePayload): MorphingController | null {
  if (!state.useMorphing || !state.settings) return null
  const algo = isMorphingAlgorithm(state.settings.morphingAlgorithm) ? state.settings.morphingAlgorithm : 'liquid'
  const controller: MorphingController =
    algo === 'oniric'
      ? createOniricMorphingCanvas(container)
      : algo === 'psy-hyp'
        ? createPsyHypMorphingCanvas(container)
        : createMorphingCanvas(container)
  controller.__algo = algo
  controller.__key = morphingKey(state)
  controller.__settings = state.settings
  return controller
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
      const dynamicCrossfade = state.settings?.dynamicPresetEnabled === true

      if (!dynamicCrossfade) {
        morphingTransitionRef.current?.from?.destroy()
        morphingTransitionRef.current?.to?.destroy()
        morphingTransitionRef.current = null

        if (state.useMorphing && state.settings) {
          const algo = isMorphingAlgorithm(state.settings.morphingAlgorithm)
            ? state.settings.morphingAlgorithm
            : 'liquid'

          if (morphingRef.current && morphingRef.current.__algo !== algo) {
            morphingRef.current.destroy()
            morphingRef.current = null
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
          morphingTransitionRef.current = {
            from: morphingRef.current,
            to: createMorphingController(rootRef.current!, state),
            startedAt: performance.now(),
            durationMs: randomTransitionDuration(),
            active: true,
          }
          morphingRef.current = morphingTransitionRef.current.to
          morphingRef.current?.setOpacity?.(0)
        }

        const transition = morphingTransitionRef.current
        if (transition?.active) {
          const progress = smootherstep((performance.now() - transition.startedAt) / transition.durationMs)
          transition.from?.setOpacity?.(1 - progress)
          transition.to?.setOpacity?.(progress)
          if (transition.from?.__settings) {
            transition.from.updateState({ ...state, useMorphing: true, settings: transition.from.__settings })
          }
          transition.to?.updateState(state)

          if (progress >= 1) {
            transition.from?.destroy()
            morphingTransitionRef.current = null
            morphingRef.current = transition.to
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
        fxOutput: ✓<br />
        msgs: {msgCount}<br />
        color: {lastColor}
      </div>
    </div>
  )
}
