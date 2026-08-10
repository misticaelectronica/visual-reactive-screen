import { describe, expect, it } from 'vitest'
import { createDefaultBrainRendererRegistry } from './brainRendererRegistry'

describe('Brain renderer registry', () => {
  it('registra Print2D, Psycho2D e Vector Morph', () => {
    const registry = createDefaultBrainRendererRegistry()
    expect(registry.ids()).toEqual([
      'print2d',
      'psycho2d',
      'vector-morph',
    ])
    expect(registry.get('vector-morph')?.capabilities.lowPowerMode).toBe(true)
  })
})
