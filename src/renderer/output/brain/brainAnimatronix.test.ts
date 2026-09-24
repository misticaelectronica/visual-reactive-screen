import { describe, expect, it } from 'vitest'
import {
  ANIMATRONIX_GRAMMARS,
  ANIMATRONIX_HIGH_SALIENCE,
  ANIMATRONIX_MAX_HIGH_SALIENCE_PER_STORY,
  ANIMATRONIX_MAX_PRINCIPAL_GRAMMARS,
  ANIMATRONIX_MAX_TOTAL_MS,
  ANIMATRONIX_MIN_TOTAL_MS,
  AnimatronixClock,
  analyzeAnimatronixRaster,
  applyNestedZoomTargets,
  carryWorldState,
  FLAT_RASTER_STRUCTURE,
  inertialProgress,
  neutralAnimatronixStructure,
  planAnimatronix,
  scoreAnimatronixGrammars,
  withForcedGrammars,
  ZERO_WORLD_STATE,
  type AnimatronixGrammar,
  type AnimatronixStructure,
} from './brainAnimatronix'

const W = 48
const H = 48

function grid(fn: (x: number, y: number) => number): Float32Array {
  const g = new Float32Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g[y * W + x] = fn(x, y)
  return g
}

const corridor = grid((x, y) => (Math.abs(x - 24) > 12 ? ((x + y) % 2) * 0.8 : 0.4))
const layered = grid((_x, y) => (y < 14 ? 0.9 : y > 32 ? ((y * 7) % 3) * 0.3 : 0.5))
const flat = grid(() => 0.5)
const withMass = grid((x, y) => (x > 30 && y > 14 ? 0.06 : 0.7))
const withAnchor = grid((x, y) => {
  const d = Math.hypot(x - 16, y - 16)
  return d < 5 ? ((x + y) % 2) * 0.9 : 0.5
})

describe('ANIMATRONIX analisi spaziale', () => {
  it('riconosce un raster piatto e degrada con ingresso non valido', () => {
    expect(analyzeAnimatronixRaster(flat, W, H).flatness).toBeGreaterThan(0.9)
    expect(analyzeAnimatronixRaster(new Float32Array(0), 0, 0)).toEqual(FLAT_RASTER_STRUCTURE)
  })

  it('vede più asse percorribile nel corridoio che nel piatto', () => {
    expect(analyzeAnimatronixRaster(corridor, W, H).traversalAxis).toBeGreaterThan(
      analyzeAnimatronixRaster(flat, W, H).traversalAxis,
    )
  })

  it('produce piani di profondità e soglie ordinate', () => {
    const s = analyzeAnimatronixRaster(layered, W, H)
    expect(s.depthGrid).toHaveLength(W * H)
    expect(s.planeThresholds[0]).toBeLessThanOrEqual(s.planeThresholds[1])
    expect(s.depthConfidence).toBeGreaterThan(0.2)
  })

  it('isola una massa occludente che tocca il bordo e ne dà direzione e limiti', () => {
    const s = analyzeAnimatronixRaster(withMass, W, H)
    expect(s.massScore).toBeGreaterThan(0.3)
    expect(s.massDir).toBe(-1)
    expect(s.massBounds.x1).toBeGreaterThan(s.massBounds.x0)
    expect(s.massGrid.some((v) => v > 200)).toBe(true)
  })

  it('una scena piatta non ha massa né profondità credibili', () => {
    const s = analyzeAnimatronixRaster(flat, W, H)
    expect(s.massScore).toBe(0)
    expect(scoreAnimatronixGrammars(s)['depth-fracture']).toBe(0)
  })

  it('trova un’ancora locale dove c’è concentrazione di bordo', () => {
    const s = analyzeAnimatronixRaster(withAnchor, W, H)
    expect(s.anchor.score).toBeGreaterThan(0)
  })
})

const allViableOne: AnimatronixStructure = {
  ...neutralAnimatronixStructure(),
  flatness: 0.1,
  depthConfidence: 0.8,
  traversalAxis: 0.8,
  lineCoherence: 0.8,
  massScore: 0.8,
  anchor: { x: 0.4, y: 0.4, score: 0.8 },
}
const allViable: AnimatronixStructure[] = Array.from({ length: 4 }, () => allViableOne)

describe('ANIMATRONIX piano di storia', () => {
  const rich = [corridor, layered, withMass, corridor].map((g) =>
    analyzeAnimatronixRaster(g, W, H),
  )

  it('usa al massimo quattro grammatiche principali e nessun ritorno A → B → A', () => {
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const plan = planAnimatronix({ storyId: id, structures: rich })
      const used = plan.segments.map((s) => s.primary)
      expect(new Set(used).size).toBeLessThanOrEqual(ANIMATRONIX_MAX_PRINCIPAL_GRAMMARS)
      for (let i = 2; i < used.length; i++) {
        const seen = used.slice(0, i - 1)
        if (used[i] !== used[i - 1]) expect(seen).not.toContain(used[i])
      }
    }
  })

  it('dà un evento a ciascuno dei quattro raster, mai la stessa grammatica per tutti', () => {
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      const plan = planAnimatronix({ storyId: id, structures: rich })
      expect(plan.segments).toHaveLength(4)
      plan.segments.forEach((s, i) => {
        expect(s.rasterIndex).toBe(i)
        expect(s.transition).not.toBeNull()
      })
      expect(new Set(plan.segments.map((s) => s.primary)).size).toBeGreaterThanOrEqual(2)
    }
  })

  it('una ripetizione porta sempre una seconda grammatica in contaminazione', () => {
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const plan = planAnimatronix({ storyId: id, structures: rich })
      plan.segments.forEach((s, i) => {
        if (i > 0 && plan.segments[i - 1].primary === s.primary) {
          expect(s.secondary).not.toBeNull()
          expect(s.secondary).not.toBe(s.primary)
        }
      })
    }
  })

  it('mai più di due grammatiche ad alta salienza nella stessa storia', () => {
    let cursor = 0
    for (let n = 0; n < 30; n++) {
      const plan = planAnimatronix({ storyId: `hs-${n}`, structures: allViable, cursor })
      const highCount = new Set(
        plan.segments.map((s) => s.primary).filter((g) => ANIMATRONIX_HIGH_SALIENCE.has(g)),
      ).size
      expect(highCount).toBeLessThanOrEqual(ANIMATRONIX_MAX_HIGH_SALIENCE_PER_STORY)
      cursor = plan.nextCursor
    }
  })

  it('un effetto ad alta salienza non si ripete nella storia immediatamente successiva', () => {
    let cursor = 0
    let avoidHighSalience: AnimatronixGrammar[] = []
    for (let n = 0; n < 20; n++) {
      const plan = planAnimatronix({
        storyId: `avoid-${n}`,
        structures: allViable,
        cursor,
        avoidHighSalience,
      })
      const used = new Set(plan.segments.map((s) => s.primary))
      for (const g of avoidHighSalience) expect(used.has(g)).toBe(false)
      cursor = plan.nextCursor
      avoidHighSalience = plan.usedHighSalience
    }
  })

  it('su molte storie usa anche le grammatiche Wave 2', () => {
    let cursor = 0
    let avoidHighSalience: AnimatronixGrammar[] = []
    const seen = new Set<AnimatronixGrammar>()
    for (let n = 0; n < 20; n++) {
      const plan = planAnimatronix({ storyId: `w2-${n}`, structures: allViable, cursor, avoidHighSalience })
      plan.segments.forEach((s) => seen.add(s.primary))
      cursor = plan.nextCursor
      avoidHighSalience = plan.usedHighSalience
    }
    for (const g of ANIMATRONIX_HIGH_SALIENCE) expect(seen.has(g)).toBe(true)
  })

  it('salta una grammatica non praticabile senza fermare la rotazione', () => {
    const noMass = allViable.map((s) => ({ ...s, massScore: 0 }))
    const plan = planAnimatronix({ storyId: 'nm', structures: noMass, cursor: 1 })
    expect(plan.segments.every((s) => s.primary !== 'occlusion-passage')).toBe(true)
    expect(plan.segments).toHaveLength(4)
  })

  it('con struttura ricca dà quattro effetti tutti diversi, uno per immagine', () => {
    let cursor = 0
    for (let n = 0; n < 6; n++) {
      const plan = planAnimatronix({ storyId: `q${n}`, structures: allViable, cursor })
      expect(new Set(plan.segments.map((s) => s.primary)).size).toBe(4)
      cursor = plan.nextCursor
    }
  })

  it('mantiene l’ordine originale dei raster', () => {
    const plan = planAnimatronix({ storyId: 'ord', structures: allViable })
    expect(plan.segments.map((s) => s.rasterIndex)).toEqual([0, 1, 2, 3])
  })

  it('è deterministico e rispetta durata 32–48 s in ogni stato', () => {
    expect(planAnimatronix({ storyId: 'x', structures: rich })).toEqual(
      planAnimatronix({ storyId: 'x', structures: rich }),
    )
    for (const regime of ['unresolved', 'pressurized', 'decompression', 'respiro-alto', 'respiro-profondo'] as const) {
      const plan = planAnimatronix({ storyId: 's', structures: rich, regime })
      expect(plan.totalMs).toBeGreaterThanOrEqual(ANIMATRONIX_MIN_TOTAL_MS)
      expect(plan.totalMs).toBeLessThanOrEqual(ANIMATRONIX_MAX_TOTAL_MS)
      expect(plan.segments.reduce((a, s) => a + s.durationMs, 0)).toBeCloseTo(plan.totalMs, 3)
    }
  })

  it('anche l’ultimo raster ha un evento di uscita, non solo i confini interni', () => {
    const plan = planAnimatronix({ storyId: 'confini', structures: rich })
    expect(plan.segments.every((s) => s.transition !== null)).toBe(true)
  })

  it('senza struttura credibile resta un evento per raster', () => {
    const flats: AnimatronixStructure[] = Array(4).fill(neutralAnimatronixStructure())
    const plan = planAnimatronix({ storyId: 'piatta', structures: flats })
    expect(plan.segments).toHaveLength(4)
    expect(plan.segments.every((s) => s.transition !== null)).toBe(true)
  })

  it('la contaminazione è la grammatica precedente quando cambia', () => {
    const plan = withForcedGrammars(
      planAnimatronix({ storyId: 'c', structures: rich }),
      ['traversal', 'traversal', 'occlusion-passage', 'residual-space'],
    )
    expect(plan.segments[0].secondary).toBeNull()
    expect(plan.segments[1].secondary).toBeNull()
    expect(plan.segments[2].secondary).toBe('traversal')
    expect(plan.segments[3].secondary).toBe('occlusion-passage')
  })

  it('elenca esattamente le undici grammatiche (sei V1 più quattro Wave 2 più hypnotic-zoom)', () => {
    expect([...ANIMATRONIX_GRAMMARS].sort()).toEqual(
      [
        'depth-fracture',
        'focus-inversion',
        'hypnotic-zoom',
        'kinetic-match',
        'occlusion-passage',
        'parallax-collapse',
        'perspective-melt',
        'residual-space',
        'time-crush',
        'traversal',
        'vertigo-lock',
      ],
    )
  })
})

describe('ANIMATRONIX inerzia e orologio', () => {
  const grammars: AnimatronixGrammar[] = ['traversal', 'perspective-melt', 'depth-fracture', 'parallax-collapse']
  const plan = withForcedGrammars(
    planAnimatronix({ storyId: 'clock', structures: Array(4).fill(neutralAnimatronixStructure()) }),
    grammars,
  )

  it('l’inerzia parte e arriva da fermo ed è monotona', () => {
    expect(inertialProgress(0)).toBe(0)
    expect(inertialProgress(1)).toBeCloseTo(1, 6)
    let prev = 0
    for (let i = 1; i <= 50; i++) {
      const v = inertialProgress(i / 50)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
  })

  it('lo stato accumulato non torna mai indietro dentro un raster (irreversibilità)', () => {
    const clock = new AnimatronixClock(plan)
    let prev = ZERO_WORLD_STATE.flight
    let segment = 0
    for (let i = 0; i < 2_000; i++) {
      const f = clock.advance(50, true)
      if (f.segmentIndex !== segment) {
        segment = f.segmentIndex
        prev = f.current.flight
        continue
      }
      expect(f.current.flight).toBeGreaterThanOrEqual(prev - 1e-9)
      prev = f.current.flight
      if (f.done) break
    }
  })

  it('al cambio di raster lo stato è ereditato in parte, non azzerato né identico', () => {
    const carried = carryWorldState({
      flight: 1,
      bend: 1,
      melt: 1,
      fracture: 1,
      collapse: 1,
      camera: 1,
      kinetic: 1,
      vertigo: 1,
      focus: 1,
      zoom: 1,
    })
    for (const value of Object.values(carried)) {
      expect(value).toBeGreaterThan(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('in silenzio decelera a un piano minimo di scorrimento (mai un blocco), alla ripresa riparte da lì', () => {
    const clock = new AnimatronixClock(plan)
    for (let i = 0; i < 100; i++) clock.advance(50, true)
    const before = clock.frame()
    for (let i = 0; i < 400; i++) clock.advance(50, false)
    const frozen = clock.frame()
    expect(frozen.speed).toBeLessThan(0.35)
    expect(frozen.speed).toBeGreaterThan(0.25)
    expect(frozen.elapsedMs - before.elapsedMs).toBeLessThan(8_000)
    const frozenAgain = clock.advance(50, false)
    expect(frozenAgain.current.flight).toBeGreaterThanOrEqual(frozen.current.flight)
    expect(frozenAgain.current.flight - frozen.current.flight).toBeLessThan(0.01)
    const resumed = clock.advance(50, true)
    expect(resumed.elapsedMs).toBeGreaterThanOrEqual(frozen.elapsedMs)
    expect(resumed.done).toBe(false)
  })

  it('completa la fase a segnale attivo e passa per una transizione al confine', () => {
    const clock = new AnimatronixClock(plan)
    let f = clock.frame()
    let sawTransition = false
    for (let i = 0; i < 3_000 && !f.done; i++) {
      f = clock.advance(50, true)
      if (f.transition && f.incoming) sawTransition = true
    }
    expect(f.done).toBe(true)
    expect(f.segmentIndex).toBe(3)
    expect(sawTransition).toBe(true)
  })

  it('l’energia audio modula il metabolismo ma non sceglie la grammatica', () => {
    const quiet = new AnimatronixClock(plan)
    const loud = new AnimatronixClock(plan)
    let a = quiet.frame()
    let b = loud.frame()
    for (let i = 0; i < 150; i++) {
      a = quiet.advance(50, true, 0)
      b = loud.advance(50, true, 1)
    }
    expect(b.current.flight).toBeGreaterThan(a.current.flight)
    expect(b.primary).toBe(a.primary)
  })

  it('TIME CRUSH è un impulso breve al centro del tratto, non un accumulo', () => {
    const crushPlan = withForcedGrammars(
      planAnimatronix({ storyId: 'crush', structures: allViable }),
      ['time-crush', 'traversal', 'traversal', 'traversal'],
    )
    const clock = new AnimatronixClock(crushPlan)
    let f = clock.frame()
    let sawZero = false
    let sawPeak = false
    let sawFallback = false
    for (let i = 0; i < 400 && f.segmentIndex === 0; i++) {
      f = clock.advance(50, true)
      if (f.crush < 0.05) sawZero = true
      if (f.crush > 0.9) sawPeak = true
      if (sawPeak && f.crush < 0.05) sawFallback = true
    }
    expect(sawZero).toBe(true)
    expect(sawPeak).toBe(true)
    expect(sawFallback).toBe(true)
  })
})

describe('HYPNOTIC ZOOM ANNIDATO', () => {
  const richStructures: AnimatronixStructure[] = [corridor, layered, withMass, corridor].map(
    (g) => analyzeAnimatronixRaster(g, W, H),
  )

  it('forza i primi due segmenti a hypnotic-zoom con bersaglio anchor, lascia il quarto invariato', () => {
    const plan = planAnimatronix({ storyId: 'nested-ok', structures: allViable })
    const result = applyNestedZoomTargets(plan, allViable)
    expect(result.fallbackReason).toBeNull()
    expect(result.targetA).toEqual({ x: allViableOne.anchor.x, y: allViableOne.anchor.y })
    expect(result.targetB).toEqual({ x: allViableOne.anchor.x, y: allViableOne.anchor.y })
    expect(result.plan.segments[0].primary).toBe('hypnotic-zoom')
    expect(result.plan.segments[0].zoomTarget).toBe('anchor')
    expect(result.plan.segments[1].primary).toBe('hypnotic-zoom')
    expect(result.plan.segments[1].zoomTarget).toBe('anchor')
    expect(result.plan.segments[3].zoomTarget).toBeUndefined()
  })

  it('con meno di tre raster non forza nulla e riporta il motivo', () => {
    const plan = planAnimatronix({ storyId: 'nested-short', structures: richStructures.slice(0, 2) })
    const result = applyNestedZoomTargets(plan, richStructures.slice(0, 2))
    expect(result.fallbackReason).not.toBeNull()
    expect(result.targetA).toBeNull()
    expect(result.targetB).toBeNull()
    expect(result.plan).toBe(plan)
  })

  it('senza un dettaglio leggibile su A o B non forza nulla e riporta il motivo', () => {
    const flats = Array(4).fill(neutralAnimatronixStructure()) as AnimatronixStructure[]
    const plan = planAnimatronix({ storyId: 'nested-flat', structures: flats })
    const result = applyNestedZoomTargets(plan, flats)
    expect(result.fallbackReason).not.toBeNull()
    expect(result.plan).toBe(plan)
  })
})
