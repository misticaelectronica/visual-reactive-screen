import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import type { MaterialRegion, MaterialRegionMatch } from './brainMaterialAnalysis'
import {
  advanceElectricPulsePhase,
  calculateDreamMotion,
  computeBandProfile,
  computeCondensationBlend,
  computeElectricPulsePoint,
  computeLocalMorphProgress,
  computeProfileDistance,
  computeRegionBreathing,
  computeSpostamentoTrail,
  findCondensationPairs,
  quadraticPointAt,
  shouldRenderDreamFrame,
  updateBaselineProfile,
  updateDreamSurpriseAccumulator,
  type DreamBandProfile,
  type DreamSurpriseState,
} from './brainDreamSegmentationCanvas'
import type { BrainRhythmState } from './brainRhythm'

const silentBands = { low: 0, lowMid: 0, mid: 0, high: 0 }

function rhythm(overrides: Partial<BrainRhythmState> = {}): BrainRhythmState {
  return {
    active: true,
    beat: false,
    beatIndex: 3,
    beatPhase: 0.2,
    musicalPosition: 3.2,
    beatPulse: 0,
    kickEnvelope: 0,
    beatDurationMs: 500,
    bandTransients: silentBands,
    ...overrides,
  }
}

function region(overrides: Partial<MaterialRegion> = {}): MaterialRegion {
  return {
    id: 0,
    pixelCount: 100,
    areaRatio: 0.05,
    centroidX: 0.5,
    centroidY: 0.5,
    minX: 0,
    minY: 0,
    maxX: 10,
    maxY: 10,
    averageColor: [120, 90, 140],
    luminance: 0.4,
    density: 0.3,
    edgeStrength: 0.2,
    salience: 0.5,
    ...overrides,
  }
}

describe('Dream Segmentation — profilo di banda e sorpresa', () => {
  it('un profilo silenzioso resta neutro (nessuna banda dominante)', () => {
    const profile = computeBandProfile(silentBands)
    expect(profile).toEqual({ low: 0.25, lowMid: 0.25, mid: 0.25, high: 0.25 })
  })

  it('il profilo somma sempre a 1 quando c\'è energia', () => {
    const profile = computeBandProfile({ low: 0.6, lowMid: 0.2, mid: 0.1, high: 0.1 })
    const total = profile.low + profile.lowMid + profile.mid + profile.high
    expect(total).toBeCloseTo(1, 5)
    expect(profile.low).toBeCloseTo(0.6, 5)
  })

  it('la baseline insegue lentamente il profilo corrente', () => {
    const baseline: DreamBandProfile = { low: 0.25, lowMid: 0.25, mid: 0.25, high: 0.25 }
    const profile: DreamBandProfile = { low: 0.7, lowMid: 0.1, mid: 0.1, high: 0.1 }
    const afterShort = updateBaselineProfile(baseline, profile, 50)
    const afterLong = updateBaselineProfile(baseline, profile, 20_000)
    expect(afterShort.low).toBeLessThan(afterLong.low)
    expect(afterLong.low).toBeCloseTo(0.7, 1)
  })

  it('la distanza è zero quando profilo e baseline coincidono', () => {
    const profile: DreamBandProfile = { low: 0.4, lowMid: 0.3, mid: 0.2, high: 0.1 }
    expect(computeProfileDistance(profile, profile)).toBe(0)
  })

  it('non scatta un evento su un singolo picco isolato', () => {
    let state: DreamSurpriseState = { accumulator: 0, lastEventAt: -1_000_000 }
    // Un solo frame con scarto massimo (distanza ~1) e un elapsed realistico
    // da RAF (~16ms) non deve bastare da solo a superare la soglia.
    const result = updateDreamSurpriseAccumulator(state, 1, 16, 0, true)
    expect(result.triggered).toBe(false)
    state = result.state
    expect(state.accumulator).toBeGreaterThan(0)
    expect(state.accumulator).toBeLessThan(1)
  })

  it('scatta un evento dopo uno scarto tonale sostenuto', () => {
    let state: DreamSurpriseState = { accumulator: 0, lastEventAt: -1_000_000 }
    let now = 0
    let triggered = false
    for (let step = 0; step < 400 && !triggered; step += 1) {
      const result = updateDreamSurpriseAccumulator(state, 0.4, 16, now, true)
      state = result.state
      triggered = result.triggered
      now += 16
    }
    expect(triggered).toBe(true)
  })

  it('rispetta il dwell minimo: non riarma subito dopo un evento', () => {
    const justFired: DreamSurpriseState = { accumulator: 0, lastEventAt: 1_000 }
    const result = updateDreamSurpriseAccumulator(justFired, 1, 5_000, 2_000, true)
    expect(result.triggered).toBe(false)
  })

  it('in silenzio nessun evento può scattare, anche con scarto alto', () => {
    const state: DreamSurpriseState = { accumulator: 5, lastEventAt: -1_000_000 }
    const result = updateDreamSurpriseAccumulator(state, 1, 5_000, 10_000, false)
    expect(result.triggered).toBe(false)
    expect(result.state.accumulator).toBe(0)
  })
})

describe('Dream Segmentation — avanzamento della trasformazione', () => {
  it('resta fermo quando non è in corso una trasformazione', () => {
    expect(computeLocalMorphProgress(0.3, 1, 5_000, false)).toBe(0.3)
  })

  it('avanza a ritmo limitato, non istantaneo, verso il progress host', () => {
    const afterOneFrame = computeLocalMorphProgress(0, 1, 16, true)
    expect(afterOneFrame).toBeGreaterThan(0)
    expect(afterOneFrame).toBeLessThan(0.02)
  })

  it('continua ad avanzare anche se l\'host ha già raggiunto 1', () => {
    let progress = 0
    for (let step = 0; step < 50; step += 1) {
      progress = computeLocalMorphProgress(progress, 1, 100, true)
    }
    expect(progress).toBeGreaterThan(0.5)
    expect(progress).toBeLessThanOrEqual(1)
  })

  it('richiede almeno la durata minima per completarsi', () => {
    const progress = computeLocalMorphProgress(0, 1, 3_199, true)
    expect(progress).toBeLessThan(1)
  })
})

describe('Dream Segmentation — condensazione e spostamento', () => {
  it('individua una coppia di condensazione per una regione scomparsa', () => {
    const fromRegions = [region({ id: 0, centroidX: 0.2 }), region({ id: 1, centroidX: 0.8 })]
    const toRegions = [region({ id: 0, centroidX: 0.25 })]
    const matches: MaterialRegionMatch[] = [
      { fromRegionId: 0, toRegionId: 0, cost: 0.1 },
      { fromRegionId: 1, toRegionId: null, cost: 1 },
    ]
    const pairs = findCondensationPairs(matches, fromRegions, toRegions)
    expect(pairs).toEqual([{ fromRegionId: 1, intoToRegionId: 0 }])
  })

  it('la terza forma è più grande di entrambe le regioni a metà trasformazione', () => {
    const from = region({ areaRatio: 0.04 })
    const to = region({ areaRatio: 0.03 })
    const blend = computeCondensationBlend(from, to, 0.5)
    expect(blend.areaRatio).toBeGreaterThan(from.areaRatio)
    expect(blend.areaRatio).toBeGreaterThan(to.areaRatio)
  })

  it('la terza forma converge alla regione di arrivo a trasformazione completa', () => {
    const from = region({ areaRatio: 0.04, centroidX: 0.1 })
    const to = region({ areaRatio: 0.03, centroidX: 0.9 })
    const blend = computeCondensationBlend(from, to, 1)
    expect(blend.centroidX).toBeCloseTo(to.centroidX, 5)
    expect(blend.areaRatio).toBeCloseTo(to.areaRatio, 5)
  })

  it('il trail di spostamento è assente senza un fuoco vecchio o nuovo', () => {
    expect(computeSpostamentoTrail(null, { centroidX: 0.5, centroidY: 0.5 }, 0.5)).toBeNull()
  })

  it('il trail di spostamento sfuma dentro e fuori nel corso della trasformazione', () => {
    const oldFocal = { centroidX: 0.2, centroidY: 0.2 }
    const newFocal = { centroidX: 0.8, centroidY: 0.8 }
    const start = computeSpostamentoTrail(oldFocal, newFocal, 0)
    const middle = computeSpostamentoTrail(oldFocal, newFocal, 0.5)
    const end = computeSpostamentoTrail(oldFocal, newFocal, 1)
    expect(start?.opacity).toBeCloseTo(0, 5)
    expect(end?.opacity).toBeCloseTo(0, 5)
    expect(middle?.opacity ?? 0).toBeGreaterThan(start?.opacity ?? 0)
  })
})

describe('Dream Segmentation — corpo e reattività', () => {
  it('la respirazione resta neutra (nessun moto) in assenza di attività/beat', () => {
    const scale = computeRegionBreathing(region(), { activity: 0, beat: 0 }, 1)
    expect(scale).toBe(1)
  })

  it('la pressione riduce soltanto un termine già derivato dall\'audio, mai lo crea', () => {
    const withoutAudio = computeRegionBreathing(region(), { activity: 0, beat: 0 }, 0.2)
    const withAudioFullPressure = computeRegionBreathing(region(), { activity: 0.5, beat: 0.5 }, 1)
    const withAudioReducedPressure = computeRegionBreathing(region(), { activity: 0.5, beat: 0.5 }, 0.2)
    expect(withoutAudio).toBe(1)
    expect(withAudioReducedPressure).toBeLessThan(withAudioFullPressure)
    expect(withAudioReducedPressure).toBeGreaterThan(1)
  })

  it('mantiene il moto fermo nel silenzio dichiarato dal clock ritmico', () => {
    const stoppedRhythm = rhythm({ active: false })
    const motion = calculateDreamMotion(
      { low: 0.8, lowMid: 0.6, mid: 0.5, high: 0.4 },
      DEFAULT_SETTINGS,
      stoppedRhythm,
    )
    expect(motion.beat).toBe(0)
  })

  it('non richiede il render quando tutto è fermo e nulla è cambiato', () => {
    const motion = { activity: 0, beat: 0, tension: 0, flash: 0 }
    expect(shouldRenderDreamFrame(motion, false, false, false)).toBe(false)
  })

  it('richiede il render mentre una trasformazione è in corso, anche a moto fermo', () => {
    const motion = { activity: 0, beat: 0, tension: 0, flash: 0 }
    expect(shouldRenderDreamFrame(motion, true, false, false)).toBe(true)
  })
})

describe('Dream Segmentation — scariche elettriche lungo la rete', () => {
  it('la fase resta ferma in silenzio (Check Silenzio: zero orologio libero)', () => {
    const stoppedRhythm = rhythm({ active: false })
    expect(advanceElectricPulsePhase(0.3, 2, stoppedRhythm, 0.8)).toBeCloseTo(0.3, 5)
  })

  it('la fase resta ferma senza attività, anche con ritmo attivo', () => {
    expect(advanceElectricPulsePhase(0.3, 2, rhythm(), 0)).toBeCloseTo(0.3, 5)
  })

  it('la fase avanza con musica attiva e si avvolge in [0,1)', () => {
    const active = rhythm({ musicalPosition: 2.9 })
    const next = advanceElectricPulsePhase(0.3, 2.5, active, 0.6)
    expect(next).toBeGreaterThan(0.3)
    expect(next).toBeLessThan(1)
    const wrapped = advanceElectricPulsePhase(0.95, 2.9, active, 1)
    expect(wrapped).toBeGreaterThanOrEqual(0)
    expect(wrapped).toBeLessThan(1)
  })

  it('quadraticPointAt agli estremi coincide con i punti di partenza/arrivo', () => {
    const start = quadraticPointAt(0, 0, 5, 10, 10, 0, 0)
    const end = quadraticPointAt(0, 0, 5, 10, 10, 0, 1)
    expect(start).toEqual({ x: 0, y: 0 })
    expect(end).toEqual({ x: 10, y: 0 })
  })

  it('computeElectricPulsePoint sfuma a zero agli estremi e cresce verso il centro', () => {
    const startGlow = computeElectricPulsePoint(0, 0, 10, 0, 5, 5, 0)
    const midGlow = computeElectricPulsePoint(0, 0, 10, 0, 5, 5, 0.5)
    const endGlow = computeElectricPulsePoint(0, 0, 10, 0, 5, 5, 1)
    expect(startGlow.glow).toBeCloseTo(0, 5)
    expect(endGlow.glow).toBeCloseTo(0, 5)
    expect(midGlow.glow).toBeGreaterThan(startGlow.glow)
    expect(midGlow.glow).toBeCloseTo(1, 5)
  })
})
