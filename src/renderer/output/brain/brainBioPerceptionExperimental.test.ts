import { describe, expect, it } from 'vitest'
import type { BandEnergies } from '@shared/types'
import { BrainBioPerceptionClock } from './brainBioPerception'
import {
  analyzeExperimentalTemporalWindow,
  BrainBioPerceptionExperimentalClock,
  classifyExperimentalRegime,
  type ExperimentalBin,
  type ExperimentalMotorDiagnostics,
} from './brainBioPerceptionExperimental'

describe('BrainBioPerceptionExperimentalClock — baseline isolata e memoria temporale', () => {
  const silence: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }
  const loud: BandEnergies = { low: 0.7, lowMid: 0.6, mid: 0.4, high: 0.3 }
  const rhythm = { active: true, kickEnvelope: 0.8, beatPulse: 0.6 }

  // Collegamento Visual (MVP, Vice Consigliere 2026-09-11): `signals` e
  // `getRegimeDiagnostics()` restano quelli della baseline (nessun nuovo
  // contratto pubblico); `regime` riflette invece la classificazione
  // sperimentale (`direction`/`constraint.value`, già calcolati) — diverge
  // dalla baseline appena la memoria di 8s è pronta, per costruzione.
  it('riusa i signals della baseline; il regime diverge solo dopo che la memoria sperimentale è pronta', () => {
    const baseline = new BrainBioPerceptionClock()
    const experimental = new BrainBioPerceptionExperimentalClock()
    let now = 0
    for (let i = 0; i < 200; i += 1) {
      now += 250
      const bands = i % 2 === 0 ? loud : silence
      const baselineState = baseline.ingestSample(bands, now, bands, rhythm)
      const experimentalState = experimental.ingestSample(bands, now, bands, rhythm)
      expect(experimentalState.signals).toEqual(baselineState.signals)
      if (!experimental.getExperimentalDiagnostics().ready) {
        expect(experimentalState.regime).toBe('unresolved')
      }
    }
    expect(experimental.getExperimentalDiagnostics().ready).toBe(true)
  })

  it('getRegimeDiagnostics() resta quello della baseline; getState().regime segue la classificazione sperimentale', () => {
    const baseline = new BrainBioPerceptionClock()
    const experimental = new BrainBioPerceptionExperimentalClock()
    let now = 0
    for (let i = 0; i < 40; i += 1) {
      now += 250
      baseline.ingestSample(loud, now, loud, rhythm)
      experimental.ingestSample(loud, now, loud, rhythm)
    }
    expect(experimental.getState().signals).toEqual(baseline.getState().signals)
    expect(experimental.getRegimeDiagnostics()).toEqual(baseline.getRegimeDiagnostics())
  })

  // Bug evidente segnalato dal Capo Supremo 2026-09-11 (confermato dal log
  // della sessione live: 42 cambi in 322s, 21 segmenti su 43 sotto i 2s):
  // il regime cambiava a ogni singola analisi (500ms) appena l'ancoraggio
  // attraversava il deadband per un solo campione — "troppo veloce, senza
  // dare tempo al corpo di capire". Un primo tentativo (permanenza minima:
  // accettare comunque il candidato dopo un'attesa fissa) è risultato
  // insufficiente in collaudo dal vivo — i cambi cadevano quasi tutti
  // esattamente sul bordo dell'attesa, perché il timer non verificava nulla
  // sul candidato stesso. `resolveRegime` ora richiede che lo stesso
  // candidato si ripeta stabilmente per REGIME_CONFIRM_MS prima di essere
  // accettato — una vera conferma per persistenza, non un timer cieco.
  it('non cambia regime finché lo stesso candidato non si ripete stabilmente, anche con materiale che oscilla di continuo', () => {
    const experimental = new BrainBioPerceptionExperimentalClock()
    let now = 0
    let lastRegime: string | null = null
    let lastChangeAt = 0
    const gaps: number[] = []
    for (let i = 0; i < 400; i += 1) {
      now += 250
      const bands = i % 2 === 0 ? loud : silence
      const state = experimental.ingestSample(bands, now, bands, rhythm)
      if (lastRegime !== null && state.regime !== lastRegime && lastRegime !== 'unresolved') {
        gaps.push(now - lastChangeAt)
      }
      if (state.regime !== lastRegime) {
        lastRegime = state.regime
        lastChangeAt = now
      }
    }
    for (const gap of gaps) {
      expect(gap).toBeGreaterThanOrEqual(1_750)
    }
  })

  it('espone la memoria sperimentale solo dopo una finestra realmente osservata', () => {
    const experimental = new BrainBioPerceptionExperimentalClock()
    let now = 0
    for (let index = 0; index < 319; index += 1) {
      now += 25
      const pulse = index % 20 === 0 ? 0.8 : 0.2
      experimental.ingestSample(
        { low: pulse, lowMid: pulse * 0.7, mid: 0.25, high: 0.18 },
        now,
      )
    }
    expect(experimental.getExperimentalDiagnostics().ready).toBe(false)
    experimental.ingestSample({ low: 0.8, lowMid: 0.56, mid: 0.25, high: 0.18 }, now + 25)
    expect(experimental.getExperimentalDiagnostics().ready).toBe(true)
  })
})

describe('classifyExperimentalRegime — collegamento Visual (MVP)', () => {
  const base = (overrides: Partial<ExperimentalMotorDiagnostics> = {}): ExperimentalMotorDiagnostics => ({
    ready: true,
    observedMs: 8_000,
    organization: { periodMs: 500, recurrence: 0.8, eventActivity: 0.5 },
    entrainment: { physicalConfirmation: 0.8, cyclePersistence: 0.9 },
    anchoring: { value: 0.5, gaining: false, losing: false, recovered: false, warmedUp: true },
    constraint: { value: 0.3, trajectory: 0.3, direction: 'stable' },
    settlement: { configurationPersistence: 0.8, evidence: 0.7, oscillatingTransformation: false },
    ...overrides,
  })

  it('non ancora pronta resta unresolved', () => {
    expect(classifyExperimentalRegime(base({ ready: false }))).toBe('unresolved')
  })

  it('ancoraggio in costruzione/erosione sono passaggi diretti, come pressureTrend nella baseline', () => {
    expect(classifyExperimentalRegime(base({ anchoring: { value: 0.4, gaining: true, losing: false, recovered: false, warmedUp: true } })))
      .toBe('pressurized')
    expect(classifyExperimentalRegime(base({ anchoring: { value: 0.4, gaining: false, losing: true, recovered: false, warmedUp: true } })))
      .toBe('decompression')
  })

  it('ancoraggio stabile con costrizione sopra soglia è respiro-alto, sotto è respiro-profondo', () => {
    expect(classifyExperimentalRegime(base({ constraint: { value: 0.35, trajectory: 0.35, direction: 'stable' } })))
      .toBe('respiro-alto')
    expect(classifyExperimentalRegime(base({ constraint: { value: 0.11, trajectory: 0.11, direction: 'stable' } })))
      .toBe('respiro-profondo')
  })

  it('prima che l\'ancoraggio abbia mai costruito una presa reale, la costrizione ancora vicina a zero non è letta come respiro-profondo', () => {
    expect(classifyExperimentalRegime(base({
      anchoring: { value: 0.1, gaining: false, losing: false, recovered: false, warmedUp: false },
      constraint: { value: 0.05, trajectory: 0.05, direction: 'stable' },
    }))).toBe('pressurized')
  })
})

describe('analyzeExperimentalTemporalWindow — relazione fra cicli', () => {
  const makeBins = (cycleLevels: number[]): ExperimentalBin[] => {
    const bins: ExperimentalBin[] = []
    const periodBins = 20
    for (const level of cycleLevels) {
      for (let phase = 0; phase < periodBins; phase += 1) {
        const onset = phase === 0 ? level : 0
        bins.push({
          bands: {
            low: 0.2 + level * 0.5,
            lowMid: 0.18 + level * 0.35,
            mid: 0.15 + level * 0.2,
            high: 0.12 + level * 0.1,
          },
          onsets: { low: onset, lowMid: onset * 0.7, mid: onset * 0.3, high: onset * 0.2 },
        })
      }
    }
    return bins
  }

  it('riconosce ricorrenza e persistenza quando la stessa relazione ritorna per più cicli', () => {
    const result = analyzeExperimentalTemporalWindow(makeBins(new Array(16).fill(0.8)))
    expect(result.periodMs).toBe(500)
    expect(result.recurrence).toBeGreaterThan(0.9)
    expect(result.physicalConfirmation).toBeGreaterThan(0.9)
    expect(result.cyclePersistence).toBeGreaterThan(0.95)
  })

  it('separa la periodicità dalla persistenza quando la materia migra fra cicli', () => {
    const settled = analyzeExperimentalTemporalWindow(makeBins(new Array(16).fill(0.8)))
    const transforming = analyzeExperimentalTemporalWindow(
      makeBins([0.1, 0.25, 0.45, 0.7, 1, 0.7, 0.45, 0.25, 0.1, 0.25, 0.45, 0.7, 1, 0.7, 0.45, 0.25]),
    )
    expect(transforming.recurrence).toBeGreaterThan(0.5)
    expect(transforming.cyclePersistence).toBeLessThan(settled.cyclePersistence)
  })

  it('un evento isolato non costruisce da solo entrainment o ancoraggio', () => {
    const bins = makeBins(new Array(16).fill(0))
    bins[160].onsets = { low: 1, lowMid: 0.8, mid: 0.5, high: 0.2 }
    const result = analyzeExperimentalTemporalWindow(bins)
    expect(result.recurrence).toBeLessThan(0.1)
    expect(result.cyclePersistence).toBeLessThan(0.1)
  })

  // Revisione d'impianto (2026-09-12, dopo ricerca bibliografica — Müller,
  // "Fundamentals of Music Processing", tempogram ad autocorrelazione):
  // scegliere il lag di correlazione massima assoluta a ogni finestra, senza
  // inerzia verso il periodo già riconosciuto, è instabile quando due
  // candidati (qui: il periodo vero e la sua ottava, un'ambiguità nota in
  // letteratura) hanno forza quasi identica — il periodo rilevato saltava
  // fra i due a ogni finestra pur non essendo cambiato nulla nel materiale.
  it('non cambia periodo riconosciuto se il vecchio resta comparabile al nuovo candidato (ambiguità di ottava)', () => {
    const bins = makeBins(new Array(16).fill(0.8))
    const withoutMemory = analyzeExperimentalTemporalWindow(bins)
    // Il raddoppio del periodo vero è un candidato quasi altrettanto forte
    // per un treno di impulsi perfettamente periodico (correla anche sui
    // multipli) — condizione tipica dell'ambiguità di ottava.
    const doublePeriodBins = Math.round(withoutMemory.periodMs / 25) * 2
    const withMemory = analyzeExperimentalTemporalWindow(bins, doublePeriodBins)
    expect(withMemory.periodMs).toBe(doublePeriodBins * 25)
  })
})
