import { describe, expect, it } from 'vitest'
import { DEFAULT_BRAIN_RENDERING_CONFIG } from './brainRenderingConfig'
import { BrainPerceptionEngine } from './brainPerception'

const config = DEFAULT_BRAIN_RENDERING_CONFIG.transformation

describe('memoria percettiva audiovisiva di Brain', () => {
  it('distingue profondità continua da texture e disgregazione', () => {
    const deep = new BrainPerceptionEngine().update(
      { low: 0.82, lowMid: 0.48, mid: 0.08, high: 0.03 },
      undefined,
      16,
      config,
    )
    const textured = new BrainPerceptionEngine().update(
      { low: 0.08, lowMid: 0.22, mid: 0.72, high: 0.9 },
      undefined,
      16,
      config,
    )

    expect(deep.depth).toBeGreaterThan(textured.depth)
    expect(textured.texture).toBeGreaterThan(deep.texture)
    expect(textured.disorder).toBeGreaterThan(deep.disorder)
  })

  it('interpreta un cambiamento come propagazione, non come semplice volume', () => {
    const engine = new BrainPerceptionEngine()
    engine.update(
      { low: 0.12, lowMid: 0.1, mid: 0.08, high: 0.05 },
      undefined,
      16,
      config,
    )
    const change = engine.update(
      { low: 0.75, lowMid: 0.64, mid: 0.44, high: 0.32 },
      {
        beat: true,
        beatIndex: 1,
        beatPhase: 0,
        musicalPosition: 1,
        beatPulse: 1,
        kickEnvelope: 1,
        beatDurationMs: 500,
        bandTransients: { low: 1, lowMid: 0, mid: 0, high: 0 },
      },
      600,
      config,
    )

    expect(change.transient).toBeGreaterThan(0.2)
    expect(change.propagation).toBeGreaterThan(0.2)
    expect(change.complexity).toBeGreaterThan(0.2)
  })

  it('mantiene una persistenza visiva durante una breve caduta sonora', () => {
    const engine = new BrainPerceptionEngine()
    const active = engine.update(
      { low: 0.75, lowMid: 0.58, mid: 0.44, high: 0.26 },
      undefined,
      16,
      config,
    )
    const afterDrop = engine.update(
      { low: 0, lowMid: 0, mid: 0, high: 0 },
      undefined,
      250,
      config,
    )

    expect(active.persistence).toBeGreaterThan(0.2)
    expect(afterDrop.persistence).toBeGreaterThan(active.persistence * 0.8)
  })

  it('può essere disattivata interamente dalla configurazione', () => {
    const state = new BrainPerceptionEngine().update(
      { low: 1, lowMid: 1, mid: 1, high: 1 },
      undefined,
      16,
      { ...config, enabled: false },
    )

    expect(state.energy).toBe(0)
    expect(state.metamorphosis).toBe(0)
    expect(state.persistence).toBe(0)
  })
})
