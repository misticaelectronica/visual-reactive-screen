import {
  AnimatronixClock,
  analyzeAnimatronixRaster,
  animatronixPoseToTransform,
  calculateAnimatronixMicroModulation,
  clampPoseToCover,
  FLAT_RASTER_STRUCTURE,
  lumaFromRgba,
  sampleAnimatronixPose,
  type AnimatronixPlan,
  type AnimatronixPose,
  type AnimatronixRasterStructure,
} from './brainAnimatronix'

const ENTRY_MS = 1_400
const EXIT_MS = 1_800
const CROSSFADE_MS = 1_200
const ANALYSIS_SIZE = 48

const smoothstep = (t: number) => {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

export type AnimatronixRhythm = {
  active: boolean
  beatPulse: number
  highTransient: number
}

export type AnimatronixStage = {
  start(plan: AnimatronixPlan, rasters: Blob[]): void
  // Ritorna true una sola volta, quando il movimento è concluso: da quel
  // momento lo stage sfuma e il chiamante può avviare ciò che segue.
  update(dtMs: number, rhythm: AnimatronixRhythm): boolean
  isBusy(): boolean
  destroy(): void
}

export async function analyzeAnimatronixBlob(
  blob: Blob,
): Promise<AnimatronixRasterStructure> {
  try {
    const bitmap = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = ANALYSIS_SIZE
    canvas.height = ANALYSIS_SIZE
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return FLAT_RASTER_STRUCTURE
    ctx.drawImage(bitmap, 0, 0, ANALYSIS_SIZE, ANALYSIS_SIZE)
    bitmap.close?.()
    const data = ctx.getImageData(0, 0, ANALYSIS_SIZE, ANALYSIS_SIZE).data
    return analyzeAnimatronixRaster(
      lumaFromRgba(data, ANALYSIS_SIZE, ANALYSIS_SIZE),
      ANALYSIS_SIZE,
      ANALYSIS_SIZE,
    )
  } catch {
    return FLAT_RASTER_STRUCTURE
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

  let plan: AnimatronixPlan | null = null
  let clock: AnimatronixClock | null = null
  let images: HTMLImageElement[] = []
  let urls: string[] = []
  let phase: 'idle' | 'run' | 'out' = 'idle'
  let overlayOpacity = 0
  let lastPose: AnimatronixPose | null = null

  const cleanup = () => {
    for (const url of urls) URL.revokeObjectURL(url)
    urls = []
    for (const img of images) img.remove()
    images = []
    plan = null
    clock = null
    lastPose = null
    overlay.style.display = 'none'
    overlay.style.opacity = '0'
    overlayOpacity = 0
    phase = 'idle'
  }

  const place = (
    img: HTMLImageElement,
    pose: AnimatronixPose,
    alpha: number,
    parallaxGain: number,
    lightGain: number,
  ) => {
    const width = parent.clientWidth || window.innerWidth
    const height = parent.clientHeight || window.innerHeight
    const t = animatronixPoseToTransform(
      clampPoseToCover({
        ...pose,
        panX: pose.panX * parallaxGain,
        panY: pose.panY * parallaxGain,
      }),
      width,
      height,
    )
    img.style.opacity = String(alpha)
    img.style.transform = `translate3d(${t.tx}px, ${t.ty}px, 0) scale(${t.scale})`
    img.style.filter = lightGain > 1.001 ? `brightness(${lightGain})` : ''
  }

  return {
    start(nextPlan, rasters) {
      cleanup()
      plan = nextPlan
      clock = new AnimatronixClock(nextPlan)
      images = rasters.map((blob) => {
        const url = URL.createObjectURL(blob)
        urls.push(url)
        const img = document.createElement('img')
        img.src = url
        img.alt = ''
        img.draggable = false
        Object.assign(img.style, {
          position: 'absolute',
          left: '0',
          top: '0',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transformOrigin: '0 0',
          opacity: '0',
          willChange: 'transform, opacity',
        })
        overlay.appendChild(img)
        return img
      })
      overlay.style.display = 'block'
      phase = 'run'
      overlayOpacity = 0
    },

    update(dtMs, rhythm) {
      if (phase === 'idle' || !plan || !clock) return false
      const dt = Math.max(0, dtMs)
      let finished = false

      if (phase === 'run') {
        overlayOpacity = Math.min(1, overlayOpacity + dt / ENTRY_MS)
        const state = clock.advance(dt, rhythm.active)
        const segment = plan.segments[state.segmentIndex]
        const pose = sampleAnimatronixPose(segment, state.segmentProgress)
        lastPose = pose
        const micro = calculateAnimatronixMicroModulation(
          rhythm.active,
          rhythm.beatPulse,
          rhythm.highTransient,
        )
        const fadeWindow = Math.min(CROSSFADE_MS, segment.durationMs * 0.3) /
          segment.durationMs
        const next = plan.segments[state.segmentIndex + 1]
        const xfade = next && state.segmentProgress > 1 - fadeWindow
          ? smoothstep((state.segmentProgress - (1 - fadeWindow)) / fadeWindow)
          : 0
        images.forEach((img, i) => {
          if (i === segment.rasterIndex) {
            place(img, pose, 1, micro.parallaxGain, micro.lightGain)
          } else if (next && i === next.rasterIndex && xfade > 0) {
            place(img, next.from, xfade, micro.parallaxGain, micro.lightGain)
          } else {
            img.style.opacity = '0'
          }
        })
        if (state.done) {
          phase = 'out'
          finished = true
        }
      } else if (phase === 'out') {
        overlayOpacity = Math.max(0, overlayOpacity - dt / EXIT_MS)
        if (overlayOpacity <= 0) {
          cleanup()
          return false
        }
        if (lastPose) {
          const last = plan.segments[plan.segments.length - 1]
          images.forEach((img, i) => {
            if (i === last.rasterIndex) place(img, lastPose as AnimatronixPose, 1, 1, 1)
          })
        }
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
