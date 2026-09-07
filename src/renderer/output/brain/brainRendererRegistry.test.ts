import { describe, expect, it } from 'vitest'
import { createDefaultBrainRendererRegistry } from './brainRendererRegistry'

describe('Brain renderer registry', () => {
  it('registra i dieci renderer Brain, incluso Dream Segmentation, Fractal Spiral Degeneration e Deliquescence', () => {
    const registry = createDefaultBrainRendererRegistry()
    expect(registry.ids()).toEqual([
      'print2d',
      'psycho2d',
      'vector-morph',
      'material-morph',
      'filter-psiche',
      'bauhaus-morph',
      'dream-segmentation',
      'glitch-morph',
      'fractal-spiral-degeneration',
      'deliquescence',
    ])
    expect(registry.get('psycho2d')?.capabilities).toEqual({
      multipleImages: true,
      semanticMetadata: true,
      lowPowerMode: true,
    })
    expect(registry.get('vector-morph')?.capabilities.lowPowerMode).toBe(true)
    expect(registry.get('material-morph')?.capabilities).toEqual({
      multipleImages: true,
      semanticMetadata: false,
      lowPowerMode: true,
    })
    expect(registry.get('filter-psiche')?.capabilities).toEqual({
      multipleImages: false,
      semanticMetadata: false,
      lowPowerMode: true,
    })
    expect(registry.get('bauhaus-morph')?.capabilities).toEqual({
      multipleImages: true,
      semanticMetadata: false,
      lowPowerMode: true,
    })
    expect(registry.get('dream-segmentation')?.capabilities).toEqual({
      multipleImages: true,
      semanticMetadata: true,
      lowPowerMode: true,
    })
    expect(registry.get('glitch-morph')?.capabilities).toEqual({
      multipleImages: false,
      semanticMetadata: false,
      lowPowerMode: true,
    })
    expect(registry.get('fractal-spiral-degeneration')?.capabilities).toEqual({
      multipleImages: true,
      semanticMetadata: false,
      lowPowerMode: true,
    })
    expect(registry.get('deliquescence')?.capabilities).toEqual({
      multipleImages: false,
      semanticMetadata: false,
      lowPowerMode: true,
    })
  })
})
