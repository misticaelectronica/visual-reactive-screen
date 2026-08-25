import { describe, expect, it } from 'vitest'
import type { VisualStatePayload } from '@shared/types'
import { CoscienzaCore } from './coscienzaCore'

function payload(
  low: number,
  lowMid: number,
  mid: number,
  high: number,
  audioPrimed = true,
): VisualStatePayload {
  return {
    backgroundColor: '#170204',
    brightness: 0.4,
    flashActive: false,
    audioPrimed,
    bandEnergies: { low, lowMid, mid, high },
    movingAverages: { low, lowMid, mid, high },
  }
}

describe('CoscienzaCore', () => {
  it('non struttura un presente prima di una percezione valida', () => {
    const core = new CoscienzaCore('episode-1')

    expect(core.observe(payload(0.4, 0.2, 0.1, 0.1, false), 1_000)).toBeNull()
  })

  it('crea il primo ciclo distinguendo percezione, attenzione e interpretazione', () => {
    const core = new CoscienzaCore('episode-1')
    const state = core.observe(payload(0.7, 0.3, 0.2, 0.1), 1_000)

    expect(state?.checkpointReason).toBe('first-perception')
    expect(state?.attentionTarget).toBe('low')
    expect(state?.bandEnergies.low).toBe(0.7)
    expect(state?.interpretation).toContain('provvisoriamente')
    expect(state?.provisionalSelfModel).not.toMatch(/desider|emozion/iu)
  })

  it('cambia attenzione soltanto dopo stabilità e intervallo minimo', () => {
    const core = new CoscienzaCore('episode-1')
    core.observe(payload(0.7, 0.3, 0.2, 0.1), 1_000)

    expect(core.observe(payload(0.1, 0.2, 0.3, 0.8), 5_000)).toBeNull()
    expect(core.observe(payload(0.1, 0.2, 0.3, 0.8), 8_000)).toBeNull()
    const shifted = core.observe(payload(0.1, 0.2, 0.3, 0.8), 11_500)

    expect(shifted?.checkpointReason).toBe('attention-shift')
    expect(shifted?.attentionTarget).toBe('high')
  })

  it('non simula attività nel silenzio', () => {
    const core = new CoscienzaCore('episode-1')
    const state = core.observe(payload(0.01, 0.01, 0.01, 0.01), 1_000)

    expect(state?.attentionTarget).toBe('silence')
    expect(state?.interpretation).toContain('quiete percettiva')
  })

  it('in low power dirada il checkpoint di continuità', () => {
    const core = new CoscienzaCore('episode-1')
    const lowPowerPayload = {
      ...payload(0.7, 0.3, 0.2, 0.1),
      settings: { lowPowerMode: true } as VisualStatePayload['settings'],
    }
    core.observe(lowPowerPayload, 1_000)

    expect(core.observe(lowPowerPayload, 62_000)).toBeNull()
    expect(core.observe(lowPowerPayload, 121_000)?.checkpointReason).toBe(
      'continuity',
    )
  })
})
