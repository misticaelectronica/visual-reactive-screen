import type { Silhouette } from './repertoire'

export const PSICOFANTASMA_TRACE_MS = 12_000
export type PsicoFantasmaFormTrace = {
  frameId: string
  silhouette: Silhouette
  completion: number
  /** Normalized, fixed position of the actually reached raster. */
  bbox: { x: number; y: number; width: number; height: number }
  lower: HTMLCanvasElement
  upper: HTMLCanvasElement
  mix: number
  opacity: number
  remainingMs: number
}

// One rotating slot; references two already prepared layers, never an ONNX
// model, an image history or autobiographical memory. Outgoing controllers
// cannot overwrite a newer image during host crossfades.
let generation = 0
let trace: PsicoFantasmaFormTrace | null = null
const copy = (value: PsicoFantasmaFormTrace): PsicoFantasmaFormTrace => ({ ...value, bbox: { ...value.bbox } })

export function beginPsicoFantasmaFormFrame(frameId: string): {
  generation: number; inherited: PsicoFantasmaFormTrace | null
} {
  return { generation: ++generation,
    inherited: trace && trace.frameId !== frameId && trace.remainingMs > 0 ? copy(trace) : null }
}

export function retainPsicoFantasmaForm(owner: number, value: PsicoFantasmaFormTrace): void {
  if (owner !== generation) return
  trace = copy(value)
}

export function decayPsicoFantasmaForm(owner: number, elapsedMs: number): void {
  if (owner !== generation || !trace) return
  trace = { ...trace, remainingMs: Math.max(0, trace.remainingMs - Math.max(0, elapsedMs)) }
  if (!trace.remainingMs) trace = null
}
