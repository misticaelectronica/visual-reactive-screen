import { describe, expect, it } from 'vitest'
import { createDefaultBrainRendererRegistry } from './brainRendererRegistry'

describe('Brain renderer registry', () => {
  it('registra i sei renderer Brain, inclusi FilterPsiche e Bauhaus Morph', () => {
    const registry = createDefaultBrainRendererRegistry()
    expect(registry.ids()).toEqual([
      'print2d',
      'psycho2d',
      'vector-morph',
      'material-morph',
      'filter-psiche',
      'bauhaus-morph',
    ])
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
  })
})
