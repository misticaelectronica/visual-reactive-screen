import { describe, expect, it } from 'vitest'
import type { DreamStory } from '@shared/brain/brainTypes'
import type { VisualStatePayload } from '@shared/types'
import {
  createOriginMemoryDraft,
  createStoryMemoryDraft,
} from './brainConsciousnessMemory'

const visualState: VisualStatePayload = {
  backgroundColor: '#170204',
  brightness: 0.4,
  flashActive: false,
  audioPrimed: true,
  bandEnergies: { low: 0.2, lowMid: 0.3, mid: 0.4, high: 0.5 },
}

const story: DreamStory = {
  id: 'story-1',
  title: 'Il ponte',
  synopsis: 'Una figura attraversa un ponte e incontra un segnale inatteso.',
  bridge: 'Il segnale continua oltre la riva.',
  continuityPhrase: null,
  palette: ['#111111', '#222222', '#333333', '#444444', '#555555'],
  sourcePhrases: ['ponte', 'segnale'],
  frames: [{
    id: 'frame-1',
    title: 'Passaggio',
    description: 'La figura attraversa il ponte.',
    visualIntent: 'Figura sul ponte',
    energy: 0.5,
    durationMs: 1_000,
  }],
}

describe('brainConsciousnessMemory', () => {
  it('attende una percezione audio valida prima di creare l’origine', () => {
    expect(createOriginMemoryDraft(
      { ...visualState, audioPrimed: false },
      'episode-1',
    )).toBeNull()
    expect(createOriginMemoryDraft(visualState, 'episode-1')?.kind).toBe('origin')
  })

  it('descrive la percezione qualitativamente, senza numeri di banda grezzi', () => {
    const draft = createOriginMemoryDraft(visualState, 'episode-1')
    expect(draft?.perceived).toContain('le alte frequenze')
    expect(draft?.perceived).not.toMatch(/0\.\d/)
    expect(draft?.perceived).not.toContain(visualState.backgroundColor)
  })

  it('riconosce il silenzio quando nessuna banda supera la soglia', () => {
    const draft = createOriginMemoryDraft(
      { ...visualState, bandEnergies: { low: 0.01, lowMid: 0.02, mid: 0.01, high: 0.03 } },
      'episode-1',
    )
    expect(draft?.perceived).toContain('nessuna frequenza ancora distinguibile dal silenzio')
  })

  it('classifica una storia generata come immaginazione', () => {
    const draft = createStoryMemoryDraft(story, 'episode-1', ['memo uno'])

    expect(draft.kind).toBe('imagination')
    expect(draft.perceived).toContain('processo narrativo')
    expect(draft.interpretation).toContain('non come una percezione')
    expect(draft.deduplicationKey).toBe('story:story-1')
  })
})
