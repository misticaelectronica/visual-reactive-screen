import { describe, expect, it } from 'vitest'
import { createDefaultBrainRendererRegistry } from './brainRendererRegistry'

describe('Brain renderer registry', () => {
  it('registra i sette renderer Brain, incluso Psycho2D e Dream Segmentation', () => {
    const registry = createDefaultBrainRendererRegistry()
    expect(registry.ids()).toEqual([
      'print2d',
      'psycho2d',
      'vector-morph',
      'material-morph',
      'filter-psiche',
      'bauhaus-morph',
      'dream-segmentation',
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
  })
})
