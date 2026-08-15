import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import {
  calculateStoryMorphingInterludeMs,
  createAlternateBrainStorySettings,
  createAlternateMorphingSettings,
} from './brainStoryAlternation'

describe('Brain story alternation', () => {
  it('calcola il 20% del ciclo totale dopo una storia Brain completa', () => {
    const brainDurationMs = 240_000
    const morphingDurationMs = calculateStoryMorphingInterludeMs(brainDurationMs)

    expect(morphingDurationMs).toBe(60_000)
    expect(brainDurationMs / (brainDurationMs + morphingDurationMs)).toBe(0.8)
  })

  it('non introduce una finestra autonoma senza durata Brain', () => {
    expect(calculateStoryMorphingInterludeMs(0)).toBe(0)
    expect(calculateStoryMorphingInterludeMs(-1_000)).toBe(0)
  })

  it('forza tutti i renderer Brain prima della finestra morphing', () => {
    const brainSettings = createAlternateBrainStorySettings({
      ...DEFAULT_SETTINGS,
      alternateBrainWithMorphing: true,
      brainRendererMode: 'manual',
    })

    expect(brainSettings.useBrain).toBe(true)
    expect(brainSettings.useMorphing).toBe(false)
    expect(brainSettings.brainRendererMode).toBe('story-cycle')
  })

  it('mantiene l’alternanza mentre apre il solo interludio esterno', () => {
    const morphingSettings = createAlternateMorphingSettings(
      { ...DEFAULT_SETTINGS, alternateBrainWithMorphing: true },
      'oniric',
      'default',
    )

    expect(morphingSettings.alternateBrainWithMorphing).toBe(true)
    expect(morphingSettings.useBrain).toBe(false)
    expect(morphingSettings.useMorphing).toBe(true)
    expect(morphingSettings.morphingAlgorithm).toBe('oniric')
  })
})
