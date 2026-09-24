import {
  AnimatronixClock,
  analyzeAnimatronixRaster,
  lumaFromRgba,
  neutralAnimatronixStructure,
  type AnimatronixFrame,
  type AnimatronixPlan,
  type AnimatronixStructure,
} from './brainAnimatronix'
import { AnimatronixGl } from './brainAnimatronixGl'

const ENTRY_MS = 1_400
const EXIT_MS = 1_800
const ANALYSIS_SIZE = 96
const MAX_RENDER_WIDTH = 1280

const smoothstep = (t: number) => {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

export type AnimatronixRhythm = {
  active: boolean
  energy: number
}

export type AnimatronixRasterPrep = {
  structure: AnimatronixStructure
  bitmap: ImageBitmap | null
}

export type AnimatronixStage = {
  // false se il contesto WebGL2 non è disponibile: la fase viene saltata.
  start(plan: AnimatronixPlan, rasters: AnimatronixRasterPrep[]): boolean
  // Ritorna true una sola volta, quando il movimento è concluso: da quel
  // momento lo stage sfuma e il chiamante può avviare ciò che segue.
  update(dtMs: number, rhythm: AnimatronixRhythm): boolean
  isBusy(): boolean
  destroy(): void
}

export async function prepareAnimatronixRaster(blob: Blob): Promise<AnimatronixRasterPrep> {
  try {
    const bitmap = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = ANALYSIS_SIZE
    canvas.height = ANALYSIS_SIZE
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return { structure: neutralAnimatronixStructure(), bitmap }
    ctx.drawImage(bitmap, 0, 0, ANALYSIS_SIZE, ANALYSIS_SIZE)
    const data = ctx.getImageData(0, 0, ANALYSIS_SIZE, ANALYSIS_SIZE).data
    return {
      structure: analyzeAnimatronixRaster(
        lumaFromRgba(data, ANALYSIS_SIZE, ANALYSIS_SIZE),
        ANALYSIS_SIZE,
        ANALYSIS_SIZE,
      ),
      bitmap,
    }
  } catch {
    return { structure: neutralAnimatronixStructure(), bitmap: null }
  }
}

export function createAnimatronixStage(parent: HTMLElement): AnimatronixStage {
  const overlay = document.createElement('div')
  Object.assign(overlay.style, {
    position: 'absolute',
    inset: '0',
    zIndex: '2',
    overflow: 'hidden',
    opacity: '0',
    pointerEvents: 'none',
    background: '#000',
    display: 'none',
  })
  parent.appendChild(overlay)
  let canvas: HTMLCanvasElement | null = null

  let gl: AnimatronixGl | null = null
  let plan: AnimatronixPlan | null = null
  let clock: AnimatronixClock | null = null
  let bitmaps: ImageBitmap[] = []
  let phase: 'idle' | 'run' | 'out' = 'idle'
  let overlayOpacity = 0
  let lastFrame: AnimatronixFrame | null = null

  const cleanup = () => {
    gl?.dispose()
    gl = null
    // Il contesto perso non è riutilizzabile: ogni fase usa un canvas nuovo.
    canvas?.remove()
    canvas = null
    for (const bitmap of bitmaps) bitmap.close?.()
    bitmaps = []
    plan = null
    clock = null
    lastFrame = null
    overlay.style.display = 'none'
    overlay.style.opacity = '0'
    overlayOpacity = 0
    phase = 'idle'
  }

  return {
    start(nextPlan, rasters) {
      cleanup()
      const usable = rasters.filter((r) => r.bitmap)
      if (usable.length !== rasters.length || rasters.length < 2) return false
      try {
        const width = Math.min(MAX_RENDER_WIDTH, parent.clientWidth || window.innerWidth)
        const aspect =
          (parent.clientHeight || window.innerHeight) / (parent.clientWidth || window.innerWidth)
        canvas = document.createElement('canvas')
        Object.assign(canvas.style, {
          position: 'absolute',
          inset: '0',
          width: '100%',
          height: '100%',
        })
        overlay.appendChild(canvas)
        const nextGl = new AnimatronixGl(canvas)
        nextGl.resize(width, Math.round(width * aspect))
        bitmaps = rasters.map((r) => r.bitmap as ImageBitmap)
        nextGl.setRasters(bitmaps, rasters.map((r) => r.structure))
        gl = nextGl
      } catch {
        cleanup()
        return false
      }
      plan = nextPlan
      clock = new AnimatronixClock(nextPlan)
      lastFrame = clock.frame()
      overlay.style.display = 'block'
      phase = 'run'
      overlayOpacity = 0
      return true
    },

    update(dtMs, rhythm) {
      if (phase === 'idle' || !plan || !clock || !gl) return false
      const dt = Math.max(0, dtMs)
      let finished = false
      if (phase === 'run') {
        overlayOpacity = Math.min(1, overlayOpacity + dt / ENTRY_MS)
        lastFrame = clock.advance(dt, rhythm.active, rhythm.energy)
        gl.render(lastFrame, plan)
        if (lastFrame.done) {
          phase = 'out'
          finished = true
        }
      } else if (phase === 'out') {
        overlayOpacity = Math.max(0, overlayOpacity - dt / EXIT_MS)
        if (overlayOpacity <= 0) {
          cleanup()
          return false
        }
        if (lastFrame) gl.render(lastFrame, plan)
      }
      overlay.style.opacity = String(smoothstep(overlayOpacity))
      return finished
    },

    isBusy() {
      return phase !== 'idle'
    },

    destroy() {
      cleanup()
      overlay.remove()
    },
  }
}
