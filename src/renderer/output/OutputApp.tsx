import { useEffect, useRef, useState } from 'react'
import type { VisualStatePayload } from '@shared/types'
import { createVisualSurface } from './visualSurface'
import { createMorphingCanvas } from './morphingCanvas'
import { createOniricMorphingCanvas } from './oniricMorphingCanvas'

type MorphingController = {
  updateState: (state: VisualStatePayload) => void
  destroy: () => void
  __algo?: 'liquid' | 'oniric'
}

export function OutputApp() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const surfaceRef = useRef<ReturnType<typeof createVisualSurface> | null>(null)
  const morphingRef = useRef<MorphingController | null>(null)
  const [msgCount, setMsgCount] = useState(0)
  const [lastColor, setLastColor] = useState<string>('—')

  useEffect(() => {
    const api = window.fxOutput
    if (!api || !rootRef.current) return

    surfaceRef.current = createVisualSurface(rootRef.current)

    const off = api.onVisualState((state: VisualStatePayload) => {
      // Base flat color
      surfaceRef.current?.setColor(state.backgroundColor)
      
      // Manage morphing layer lifecycle
      if (state.useMorphing && state.settings) {
        const algo = state.settings.morphingAlgorithm || 'liquid'
        
        // If we have an instance but the algorithm changed, destroy it
        if (morphingRef.current && morphingRef.current.__algo !== algo) {
          morphingRef.current.destroy()
          morphingRef.current = null
        }

        if (!morphingRef.current) {
          if (algo === 'oniric') {
            morphingRef.current = createOniricMorphingCanvas(rootRef.current!);
            morphingRef.current.__algo = 'oniric'
          } else {
            morphingRef.current = createMorphingCanvas(rootRef.current!);
            morphingRef.current.__algo = 'liquid'
          }
        }
        morphingRef.current.updateState(state)
      } else {
        if (morphingRef.current) {
          morphingRef.current.destroy()
          morphingRef.current = null
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
