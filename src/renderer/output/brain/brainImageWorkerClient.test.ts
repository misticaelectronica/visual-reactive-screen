import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_BRAIN_RENDERING_CONFIG } from './brainRenderingConfig'
import { createBrainImageGenerateRequest } from './brainImageWorkerClient'
import { setBrainImageGenerationSettings } from './brainImageGeneration'
import { DEFAULT_BRAIN_NEGATIVE_PROMPT } from '@shared/defaults'

describe('protocollo worker immagini Brain', () => {
  beforeEach(() => {
    // La configurazione attiva nasce come clone dei default in ogni ambiente test.
    expect(DEFAULT_BRAIN_RENDERING_CONFIG.image.width).toBe(640)
    setBrainImageGenerationSettings({
      brainImageQuality: 'low',
      brainNegativePrompt: DEFAULT_BRAIN_NEGATIVE_PROMPT,
    })
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
      guidanceMode: 'cfg-batch',
      negativePrompt: DEFAULT_BRAIN_NEGATIVE_PROMPT,
    })
    expect(request.artifactBaseUrl).toMatch(/^brain-model:/)
    expect(request.wasmBaseUrl).toBe('file:///Applications/Mistica/dist/ort-wasm/')
  })

  it('mantiene distinti interludio, enhanced e alta qualità', () => {
    const modes = [
      ['interlude', 4, 448, 256],
      ['enhanced', 10, 512, 320],
      ['high-quality', 14, 640, 360],
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

  it('applica il livello di qualità scelto dal pannello', () => {
    const levels = [
      ['low', 8, 10, 14],
      ['mid', 10, 13, 19],
      // `high` = step di config/brainRendering.json (qui i default).
      ['high', 12, 16, 24],
    ] as const
    for (const [quality, standard, enhanced, highQuality] of levels) {
      setBrainImageGenerationSettings({
        brainImageQuality: quality,
        brainNegativePrompt: '',
      })
      const steps = (['standard', 'enhanced', 'high-quality'] as const).map((mode) =>
        createBrainImageGenerateRequest(
          mode, 'prompt', 1, mode, 90_000, 'http://127.0.0.1:5173/output.html',
        ).steps)
      expect(steps).toEqual([standard, enhanced, highQuality])
    }
  })

  it('guida con negative prompt tranne l’interludio; lo zoom annidato resta sovrano', () => {
    setBrainImageGenerationSettings({
      brainImageQuality: 'low',
      brainNegativePrompt: 'extra limbs',
    })
    const url = 'http://127.0.0.1:5173/output.html'
    expect(createBrainImageGenerateRequest('a', 'p', 1, 'enhanced', 90_000, url))
      .toMatchObject({ guidanceMode: 'cfg-batch', negativePrompt: 'extra limbs' })
    expect(createBrainImageGenerateRequest('b', 'p', 1, 'interlude', 90_000, url))
      .toMatchObject({ guidanceMode: 'single-conditional', steps: 4 })
    expect(createBrainImageGenerateRequest('c', 'p', 1, 'high-quality', 90_000, url, 22).steps)
      .toBe(22)
  })
})
