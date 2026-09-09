import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDefaultBrainRendererRegistry } from './brainRendererRegistry'

describe('Brain renderer registry', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('keeps PsicoFantasma available for manual preview when its bundle is absent', () => {
    vi.stubGlobal('__PSICOFANTASMA_AVAILABLE__', false)
    expect(createDefaultBrainRendererRegistry().ids()).toContain('psicofantasma')
  })
  it('registra gli undici renderer Brain, incluso PsicoFantasma', () => {
    vi.stubGlobal('__PSICOFANTASMA_AVAILABLE__', true)
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
      'psicofantasma',
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
