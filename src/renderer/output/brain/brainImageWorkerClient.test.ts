import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_BRAIN_RENDERING_CONFIG } from './brainRenderingConfig'
import { createBrainImageGenerateRequest } from './brainImageWorkerClient'

describe('protocollo worker immagini Brain', () => {
  beforeEach(() => {
    // La configurazione attiva nasce come clone dei default in ogni ambiente test.
    expect(DEFAULT_BRAIN_RENDERING_CONFIG.image.width).toBe(640)
  })

  it('risolve in Output il profilo standard prima di inviarlo al worker', () => {
    const request = createBrainImageGenerateRequest(
      'standard-1',
      'figura nel porto',
      42,
      'standard',
      90_000,
      'file:///Applications/Mistica/dist/output.html',
    )

    expect(request).toMatchObject({
      type: 'generate',
      prompt: 'figura nel porto',
      seed: 42,
      width: 640,
      height: 360,
      inferenceWidth: 448,
      inferenceHeight: 256,
      steps: 8,
    })
    expect(request.artifactBaseUrl).toMatch(/^brain-model:/)
    expect(request.wasmBaseUrl).toBe('file:///Applications/Mistica/dist/ort-wasm/')
  })

  it('mantiene distinti interludio, enhanced e alta qualità', () => {
    const modes = [
      ['interlude', 4, 448, 256],
      ['enhanced', 12, 512, 320],
      ['high-quality', 20, 640, 360],
    ] as const

    for (const [mode, steps, inferenceWidth, inferenceHeight] of modes) {
      expect(createBrainImageGenerateRequest(
        mode,
        'prompt',
        1,
        mode,
        90_000,
        'http://127.0.0.1:5173/output.html',
      )).toMatchObject({
        mode,
        steps,
        inferenceWidth,
        inferenceHeight,
      })
    }
  })
})
