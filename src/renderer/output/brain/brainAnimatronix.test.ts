import { describe, expect, it } from 'vitest'
import {
  ANIMATRONIX_MAX_TOTAL_MS,
  ANIMATRONIX_MIN_TOTAL_MS,
  AnimatronixClock,
  analyzeAnimatronixRaster,
  animatronixPoseToTransform,
  calculateAnimatronixMicroModulation,
  clampPoseToCover,
  FLAT_RASTER_STRUCTURE,
  inertialProgress,
  planAnimatronix,
  sampleAnimatronixPose,
  scoreAnimatronixGrammars,
  type AnimatronixRasterStructure,
} from './brainAnimatronix'

const W = 32
const H = 32

function grid(fn: (x: number, y: number) => number): Float32Array {
  const g = new Float32Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g[y * W + x] = fn(x, y)
  return g
}

const corridor = grid((x, y) => (Math.abs(x - 16) > 8 ? ((x + y) % 2) * 0.8 : 0.4))
const layered = grid((_x, y) => (y < 10 ? 0.9 : y > 21 ? ((y * 7) % 3) * 0.3 : 0.5))
const flat = grid(() => 0.5)
const subject = grid((x, y) => (x > 20 && x < 26 && y > 6 && y < 12 ? ((x + y) % 2) : 0.5))

describe('ANIMATRONIX analisi raster', () => {
  it('riconosce un raster piatto', () => {
    const s = analyzeAnimatronixRaster(flat, W, H)
    expect(s.flatness).toBeGreaterThan(0.9)
    expect(s.depthConfidence).toBe(0)
  })

  it('vede un asse percorribile nel corridoio simmetrico', () => {
    expect(analyzeAnimatronixRaster(corridor, W, H).traversalAxis).toBeGreaterThan(
      analyzeAnimatronixRaster(flat, W, H).traversalAxis,
    )
  })

  it('vede piani separabili nell’immagine a bande', () => {
    expect(analyzeAnimatronixRaster(layered, W, H).depthConfidence).toBeGreaterThan(0.3)
  })

  it('trova un soggetto dominante e la sua posizione', () => {
    const s = analyzeAnimatronixRaster(subject, W, H)
    expect(s.dominance).toBeGreaterThan(0.3)
    expect(s.dominantX).toBeGreaterThan(0.6)
    expect(s.dominantY).toBeLessThan(0.4)
  })

  it('degrada a piatto con ingresso non valido', () => {
    expect(analyzeAnimatronixRaster(new Float32Array(0), 0, 0)).toEqual(FLAT_RASTER_STRUCTURE)
  })
})

describe('ANIMATRONIX piano di movimento', () => {
  const structures = [corridor, layered, subject, flat].map((g) =>
    analyzeAnimatronixRaster(g, W, H),
  )

  it('costruisce una frase: invariante in almeno due raster e una mutazione', () => {
    const plan = planAnimatronix({ storyId: 'storia-a', structures })
    const withInvariant = plan.segments.filter(
      (s) => s.grammar === plan.invariant.grammar,
    )
    expect(plan.segments).toHaveLength(4)
    expect(withInvariant.length).toBeGreaterThanOrEqual(2)
    expect(plan.segments.some((s) => s.mutation)).toBe(true)
  })

  it('è deterministica per la stessa storia', () => {
    expect(planAnimatronix({ storyId: 'x', structures })).toEqual(
      planAnimatronix({ storyId: 'x', structures }),
    )
  })

  it('tiene la durata totale fra 18 e 28 secondi per ogni stato', () => {
    for (const regime of [
      'unresolved',
      'pressurized',
      'decompression',
      'respiro-alto',
      'respiro-profondo',
    ] as const) {
      const plan = planAnimatronix({ storyId: 's', structures, regime })
      expect(plan.totalMs).toBeGreaterThanOrEqual(ANIMATRONIX_MIN_TOTAL_MS)
      expect(plan.totalMs).toBeLessThanOrEqual(ANIMATRONIX_MAX_TOTAL_MS)
      const sum = plan.segments.reduce((a, s) => a + s.durationMs, 0)
      expect(sum).toBeCloseTo(plan.totalMs, 3)
    }
  })

  it('senza profondità credibile non usa il parallasse', () => {
    const flats: AnimatronixRasterStructure[] = Array(4).fill(FLAT_RASTER_STRUCTURE)
    const plan = planAnimatronix({ storyId: 'piatta', structures: flats })
    expect(plan.segments.every((s) => s.grammar !== 'parallax')).toBe(true)
    expect(scoreAnimatronixGrammars(FLAT_RASTER_STRUCTURE).drift).toBeGreaterThan(0.6)
  })

  it('le pose sono continue fra segmenti e mai oltre i bordi', () => {
    const plan = planAnimatronix({ storyId: 'continua', structures })
    for (let i = 1; i < plan.segments.length; i++) {
      expect(plan.segments[i].from).toEqual(plan.segments[i - 1].to)
    }
    for (const seg of plan.segments) {
      for (const p of [0, 0.3, 0.7, 1]) {
        const pose = sampleAnimatronixPose(seg, p)
        expect(clampPoseToCover(pose)).toEqual(pose)
      }
    }
  })

  it('il trasformato copre sempre il quadro', () => {
    const pose = clampPoseToCover({ scale: 1.3, panX: 5, panY: -5, focusX: 0.2, focusY: 0.9 })
    const t = animatronixPoseToTransform(pose, 100, 100)
    expect(t.tx).toBeLessThanOrEqual(0.0001)
    expect(t.tx + 100 * t.scale).toBeGreaterThanOrEqual(100 - 0.0001)
    expect(t.ty).toBeLessThanOrEqual(0.0001)
    expect(t.ty + 100 * t.scale).toBeGreaterThanOrEqual(100 - 0.0001)
  })
})

describe('ANIMATRONIX inerzia', () => {
  it('parte e arriva da fermo, monotona', () => {
    expect(inertialProgress(0)).toBe(0)
    expect(inertialProgress(1)).toBeCloseTo(1, 6)
    let prev = 0
    for (let i = 1; i <= 50; i++) {
      const v = inertialProgress(i / 50)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
  })
})

describe('ANIMATRONIX orologio e silenzio', () => {
  const plan = planAnimatronix({
    storyId: 'clock',
    structures: [FLAT_RASTER_STRUCTURE, FLAT_RASTER_STRUCTURE, FLAT_RASTER_STRUCTURE, FLAT_RASTER_STRUCTURE],
  })

  it('in silenzio decelera e congela lo stato, alla ripresa riparte da lì', () => {
    const clock = new AnimatronixClock(plan)
    for (let i = 0; i < 100; i++) clock.advance(50, true)
    const before = clock.state().elapsedMs
    for (let i = 0; i < 400; i++) clock.advance(50, false)
    const frozen = clock.state()
    expect(frozen.speed).toBeLessThan(0.01)
    expect(frozen.elapsedMs - before).toBeLessThan(2_500)
    const resumed = clock.advance(50, true)
    expect(resumed.elapsedMs).toBeGreaterThanOrEqual(frozen.elapsedMs)
    expect(resumed.done).toBe(false)
  })

  it('completa la fase a segnale attivo', () => {
    const clock = new AnimatronixClock(plan)
    let state = clock.state()
    for (let i = 0; i < 2_000 && !state.done; i++) state = clock.advance(50, true)
    expect(state.done).toBe(true)
    expect(state.segmentIndex).toBe(3)
  })

  it('la modulazione beat è nulla in silenzio', () => {
    expect(calculateAnimatronixMicroModulation(false, 1, 1)).toEqual({
      parallaxGain: 1,
      lightGain: 1,
    })
    expect(calculateAnimatronixMicroModulation(true, 1, 0).parallaxGain).toBeGreaterThan(1)
  })
})
