import { describe, expect, it } from 'vitest'
import type { BandEnergies } from '@shared/types'
import { BrainBioPerceptionClock } from './brainBioPerception'
import { BrainBioPerceptionExperimentalClock } from './brainBioPerceptionExperimental'

// PIANO-044, checkpoint 1: il regime sperimentale è ancora uno scaffold che
// delega alla baseline. Questi test fissano il contratto (stesso output a
// parità di ingresso) — non testano ancora nessuna semantica di ballabilità,
// che non esiste finché la Fase 2 del piano non la costruisce.
describe('BrainBioPerceptionExperimentalClock — parità di scaffold con la baseline', () => {
  const silence: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }
  const loud: BandEnergies = { low: 0.7, lowMid: 0.6, mid: 0.4, high: 0.3 }
  const rhythm = { active: true, kickEnvelope: 0.8, beatPulse: 0.6 }

  it('produce lo stesso stato della baseline sulla stessa sequenza di campioni', () => {
    const baseline = new BrainBioPerceptionClock()
    const experimental = new BrainBioPerceptionExperimentalClock()
    let now = 0
    for (let i = 0; i < 200; i += 1) {
      now += 250
      const bands = i % 2 === 0 ? loud : silence
      const baselineState = baseline.ingestSample(bands, now, bands, rhythm)
      const experimentalState = experimental.ingestSample(bands, now, bands, rhythm)
      expect(experimentalState).toEqual(baselineState)
    }
  })

  it('espone getState() e getRegimeDiagnostics() identici alla baseline', () => {
    const baseline = new BrainBioPerceptionClock()
    const experimental = new BrainBioPerceptionExperimentalClock()
    let now = 0
    for (let i = 0; i < 40; i += 1) {
      now += 250
      baseline.ingestSample(loud, now, loud, rhythm)
      experimental.ingestSample(loud, now, loud, rhythm)
    }
    expect(experimental.getState()).toEqual(baseline.getState())
    expect(experimental.getRegimeDiagnostics()).toEqual(baseline.getRegimeDiagnostics())
  })
})
