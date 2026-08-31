import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import type { MaterialRegion, MaterialRegionMatch } from './brainMaterialAnalysis'
import {
  advanceElectricPulsePhase,
  calculateDreamMotion,
  calculateDreamRegimeMultiplier,
  calculateDreamRegimeProfile,
  computeBandProfile,
  computeCondensationBlend,
  computeDendriteBranchPoint,
  computeElectricPulsePoint,
  computeDreamRegimeColor,
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

describe('Dream Segmentation — regime bio-percettivo (PIANO-040, invariante §6)', () => {
  it('calculateDreamRegimeMultiplier: 1.0 per pressurized/unresolved/nessuno stato — comportamento di default invariato', () => {
    expect(calculateDreamRegimeMultiplier(null)).toBe(1)
    expect(calculateDreamRegimeMultiplier('pressurized')).toBe(1)
    expect(calculateDreamRegimeMultiplier('unresolved')).toBe(1)
  })

  it('riduce i vecchi moltiplicatori congelanti: 1.1 in decompressione, 1.25 nel respiro', () => {
    const decompression = calculateDreamRegimeMultiplier('decompression')
    const stableBreath = calculateDreamRegimeMultiplier('respiro-profondo')
    expect(decompression).toBe(1.1)
    expect(stableBreath).toBe(1.25)
  })

  it('brief Audio 2026-08-28 (punto 1): `residual` modula continuamente quanto del profilo del regime è in vigore', () => {
    const full = calculateDreamRegimeProfile('respiro-profondo', 1)
    const half = calculateDreamRegimeProfile('respiro-profondo', 0.5)
    const none = calculateDreamRegimeProfile('respiro-profondo', 0)
    // A residual 0 materia, colore e movimento coincidono col default;
    // l'unica eccezione è il gate semantico assoluto dei neuroni.
    expect(none).toEqual({
      ...calculateDreamRegimeProfile(null),
      neuronalMultiplier: 0,
    })
    expect(half.densityMultiplier).toBeGreaterThan(full.densityMultiplier)
    expect(half.densityMultiplier).toBeLessThan(none.densityMultiplier)
    expect(half.darkeningAdd).toBeGreaterThan(0)
    expect(half.darkeningAdd).toBeLessThan(full.darkeningAdd)
  })

  it('senza passare `residual`, il comportamento resta quello pieno di sempre (retrocompatibile)', () => {
    expect(calculateDreamRegimeProfile('decompression')).toEqual(calculateDreamRegimeProfile('decompression', 1))
    expect(calculateDreamRegimeMultiplier('respiro-profondo')).toBe(calculateDreamRegimeMultiplier('respiro-profondo', 1))
  })

  it('il respiro apre e scurisce la materia riducendo anche densità e moto locale', () => {
    const profile = calculateDreamRegimeProfile('respiro-profondo')
    expect(profile.densityMultiplier).toBeLessThan(1)
    expect(profile.darkeningAdd).toBeGreaterThan(0)
    expect(profile.colorBrightness).toBeLessThan(1)
    expect(profile.motionMultiplier).toBeGreaterThan(0)
    expect(profile.motionMultiplier).toBeLessThan(1)
  })

  it('brief definitivo §8: il vocabolario neuronale è sospeso (non solo diradato) in decompression/respiro-profondo', () => {
    expect(calculateDreamRegimeProfile('pressurized').neuronalMultiplier).toBe(1)
    expect(calculateDreamRegimeProfile('unresolved').neuronalMultiplier).toBe(1)
    // Sospeso a piena intensità (residual=1): zero, non "un po' meno" come
    // densityMultiplier — è una condizione di regime, non una taratura.
    expect(calculateDreamRegimeProfile('decompression', 1).neuronalMultiplier).toBe(0)
    expect(calculateDreamRegimeProfile('respiro-profondo', 1).neuronalMultiplier).toBe(0)
  })

  it('non fa riapparire neuroni o elettricità attraverso il residuo nei regimi bassi', () => {
    expect(calculateDreamRegimeProfile('respiro-profondo', 0).neuronalMultiplier).toBe(0)
    expect(calculateDreamRegimeProfile('respiro-profondo', 0.5).neuronalMultiplier).toBe(0)
    expect(calculateDreamRegimeProfile('decompression', 0.5).neuronalMultiplier).toBe(0)
  })

  it('i colori nel respiro restano audio-driven: scuri in quiete e cambiano con gli inviluppi, senza clock autonomo', () => {
    const source = [180, 120, 220] as const
    const quiet = computeDreamRegimeColor(source, 'respiro-profondo', { activity: 0, tension: 0 })
    const sounding = computeDreamRegimeColor(source, 'respiro-profondo', { activity: 0.6, tension: 0.4 })
    expect(quiet[0]).toBeLessThan(source[0])
    expect(quiet[1]).toBeLessThan(source[1])
    expect(quiet[2]).toBeLessThan(source[2])
    expect(sounding).not.toEqual(quiet)
    expect(computeDreamRegimeColor(source, 'respiro-profondo', { activity: 0, tension: 0 })).toEqual(quiet)
  })

  it('al moltiplicatore di default (1.0) updateDreamSurpriseAccumulator è identico alla chiamata senza il parametro', () => {
    const state: DreamSurpriseState = { accumulator: 0, lastEventAt: 1_000 }
    const withoutParam = updateDreamSurpriseAccumulator(state, 0.4, 5_000, 10_000, true)
    const withDefaultMultiplier = updateDreamSurpriseAccumulator(
      state, 0.4, 5_000, 10_000, true, 8_000 * calculateDreamRegimeMultiplier('pressurized'),
    )
    expect(withDefaultMultiplier).toEqual(withoutParam)
  })

  it('dwell appena più lungo nel respiro: rallenta senza congelare per 16 secondi', () => {
    const justFired: DreamSurpriseState = { accumulator: 0, lastEventAt: 0 }
    const elapsedSinceEvent = 9_000 // oltre 8s, sotto 10s (8 * 1.25)
    const pressurizedMultiplier = calculateDreamRegimeMultiplier('pressurized')
    const stableBreathMultiplier = calculateDreamRegimeMultiplier('respiro-profondo')
    const inPressure = updateDreamSurpriseAccumulator(
      justFired, 1, elapsedSinceEvent, elapsedSinceEvent, true, 8_000 * pressurizedMultiplier,
    )
    const inStableBreath = updateDreamSurpriseAccumulator(
      justFired, 1, elapsedSinceEvent, elapsedSinceEvent, true, 8_000 * stableBreathMultiplier,
    )
    expect(inPressure.triggered).toBe(true)
    expect(inStableBreath.triggered).toBe(false)
    const breathAfterTenSeconds = updateDreamSurpriseAccumulator(
      justFired, 1, 10_100, 10_100, true, 8_000 * stableBreathMultiplier,
    )
    expect(breathAfterTenSeconds.triggered).toBe(true)
  })

  it('transizione più lenta (più "viscosa") in respiro-profondo rispetto a pressurized, a parità di tempo trascorso', () => {
    const pressurizedMultiplier = calculateDreamRegimeMultiplier('pressurized')
    const stableBreathMultiplier = calculateDreamRegimeMultiplier('respiro-profondo')
    const progressInPressure = computeLocalMorphProgress(
      0, 1, 1_000, true, 3_200 * pressurizedMultiplier,
    )
    const progressInStableBreath = computeLocalMorphProgress(
      0, 1, 1_000, true, 3_200 * stableBreathMultiplier,
    )
    expect(progressInStableBreath).toBeLessThan(progressInPressure)
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

describe('Dream Segmentation — diramazioni dendritiche', () => {
  it('la diramazione punta lontano dal nodo verso cui va la connessione principale', () => {
    // Nodo in (10,0), connesso verso (0,0): la diramazione con seed 0.5
    // (nessun jitter) deve puntare nella direzione opposta, verso x
    // crescenti.
    const branch = computeDendriteBranchPoint(10, 0, 0, 0, 0.5, 5)
    expect(branch.x).toBeGreaterThan(10)
    expect(branch.y).toBeCloseTo(0, 5)
  })

  it('è deterministica: stesso seed, stesso punto', () => {
    const first = computeDendriteBranchPoint(3, 4, 8, 1, 0.27, 6)
    const second = computeDendriteBranchPoint(3, 4, 8, 1, 0.27, 6)
    expect(first).toEqual(second)
  })

  it('seed diversi producono diramazioni diverse', () => {
    const a = computeDendriteBranchPoint(3, 4, 8, 1, 0.1, 6)
    const b = computeDendriteBranchPoint(3, 4, 8, 1, 0.9, 6)
    expect(a).not.toEqual(b)
  })
})
