import {
  planAnimatronix, AnimatronixClock, withForcedGrammars,
} from '../../src/renderer/output/brain/brainAnimatronix'
import { AnimatronixGl } from '../../src/renderer/output/brain/brainAnimatronixGl'
import { prepareAnimatronixRaster, attachMorphFlows } from '../../src/renderer/output/brain/brainAnimatronixStage'

function makeBlob(kind: number): Promise<Blob> {
  const c = document.createElement('canvas'); c.width = 640; c.height = 360
  const g = c.getContext('2d')!
  const bg = ['#102040', '#402010', '#104020', '#301040'][kind]
  g.fillStyle = bg; g.fillRect(0, 0, 640, 360)
  const cols = ['#ffcc33', '#33ccff', '#ff3388', '#88ff33']
  for (let i = 0; i < 6; i++) {
    g.fillStyle = cols[(i + kind) % 4]
    const x = 100 + ((i * 97 + kind * 130) % 440), y = 60 + ((i * 53 + kind * 40) % 240)
    g.beginPath(); g.arc(x, y, 30 + (i % 3) * 18, 0, 7); g.fill()
    g.fillRect(x - 20, y + 30, 90, 14)
  }
  return new Promise((r) => c.toBlob((b) => r(b!), 'image/png'))
}


function grab(canvas: HTMLCanvasElement): Uint8ClampedArray {
  const c = document.createElement('canvas'); c.width = 240; c.height = 135
  const g = c.getContext('2d')!; g.drawImage(canvas, 0, 0, 240, 135)
  return g.getImageData(0, 0, 240, 135).data
}
const diff = (a: Uint8ClampedArray, b: Uint8ClampedArray) => { let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]); return s / (a.length / 4) / 3 }

;(window as any).run = async () => {
  const blobs = await Promise.all([0, 1, 2, 3].map(makeBlob))
  const preps = await Promise.all(blobs.map(prepareAnimatronixRaster))
  await attachMorphFlows(preps)
  const canvas = document.createElement('canvas'); document.body.appendChild(canvas)
  const gl = new AnimatronixGl(canvas, true)
  gl.resize(960, 540)
  gl.setRasters(preps.map((p) => p.bitmap!), preps.map((p) => p.structure), preps.map((p) => p.flowToNext ?? null))
  const base = planAnimatronix({ storyId: 'harness', structures: preps.map((p) => p.structure) })
  const grammars = (window as any).GR || ['traversal', 'hypnotic-zoom', 'perspective-melt', 'depth-fracture']
  const plan = withForcedGrammars(base, grammars)
  const clock = new AnimatronixClock(plan)
  let f = clock.frame()
  let prev: Uint8ClampedArray | null = null
  let prevSeg = 0
  const diffs: { seg: number; u: number; d: number; ms: number; st?: any }[] = []
  const boundary: number[] = []
  for (let i = 0; i < 4000 && !f.done; i++) {
    f = clock.advance(16, true, 0.6)
    const a = performance.now()
    gl.render(f, plan); gl.finish()
    const ms = performance.now() - a
    const px = grab(canvas)
    if (prev) {
      const d = diff(prev, px)
      diffs.push({ seg: f.segmentIndex, u: f.u, d, ms, st: { ...f.current, tr: f.transition ? +f.transition.progress.toFixed(3) : 0, prim: f.primary, h: plan.segments[f.segmentIndex].handoff, sec: plan.segments[f.segmentIndex].secondary } })
      if (f.segmentIndex !== prevSeg) boundary.push(d)
    }
    prev = px; prevSeg = f.segmentIndex
  }
  const ds = diffs.map((x) => x.d).sort((a, b) => a - b)
  const slow = diffs.filter((x) => x.ms > 8).map((x) => ({ seg: x.seg, u: +x.u.toFixed(3), ms: +x.ms.toFixed(1) }))
  const idx = diffs.map((x, i) => [x.d, i] as const).sort((a, b) => b[0] - a[0]).slice(0, 3).map((x) => x[1])
  const top = idx.map((i) => ({ i, cur: diffs[i], prev: diffs[i - 1], next: diffs[i + 1] }))
  return { first: diffs.slice(0, 4).map((x) => +x.ms.toFixed(1)), frames: diffs.length, medianDiff: ds[Math.floor(ds.length / 2)], p99Diff: ds[Math.floor(ds.length * 0.99)], boundary, top, slow: slow.slice(0, 10) }
}
