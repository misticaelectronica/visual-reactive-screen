import { describe, expect, it } from 'vitest'
import {
  DEFAULT_BRAIN_RENDERING_CONFIG,
  normalizeBrainRenderingConfig,
} from './brainRenderingConfig'

describe('configurazione rendering Brain', () => {
  it('usa per default una scena 16:9', () => {
    expect(
      DEFAULT_BRAIN_RENDERING_CONFIG.image.width /
      DEFAULT_BRAIN_RENDERING_CONFIG.image.height,
    ).toBeCloseTo(16 / 9)
  })

  it('normalizza dimensioni ONNX a multipli di otto e ordina i tempi', () => {
    const config = normalizeBrainRenderingConfig({
      image: { width: 641, height: 359 },
      timing: {
        transitionMinMs: 2_000,
        transitionMaxMs: 900,
        holdMinMs: 5_000,
        holdMaxMs: 2_000,
      },
    })
    expect(config.image).toMatchObject({ width: 640, height: 360 })
    expect(config.timing.transitionMaxMs).toBe(2_000)
    expect(config.timing.holdMaxMs).toBe(5_000)
  })

  it('rimuove pattern sconosciuti conservando quelli validi', () => {
    const config = normalizeBrainRenderingConfig({
      motion: {
        patterns: ['spirale', 'inesistente', 'marea'],
        microMovement: 9,
      },
    })
    expect(config.motion.patterns).toEqual(['spirale', 'marea'])
    expect(config.motion.microMovement).toBe(1.5)
  })

  it('normalizza memoria percettiva e numero di copie persistenti', () => {
    const config = normalizeBrainRenderingConfig({
      transformation: {
        responseMs: 20,
        memoryMs: 99_000,
        maxEchoLayers: 12,
        duplication: -4,
      },
    })

    expect(config.transformation.responseMs).toBe(120)
    expect(config.transformation.memoryMs).toBe(20_000)
    expect(config.transformation.maxEchoLayers).toBe(3)
    expect(config.transformation.duplication).toBe(0)
  })
})
