import { describe, expect, it } from 'vitest'
import { buildMorphingInterludeDeck } from './morphingRotation'

describe('morphing interlude deck', () => {
  it('estrae una variante casuale per famiglia prima di ricominciare', () => {
    const deck = buildMorphingInterludeDeck({
      id: 'liquid:ritual-drift',
      label: 'Liquid',
      algorithm: 'liquid',
      presetId: 'ritual-drift',
    }, () => 0)

    expect(deck).toHaveLength(4)
    expect(new Set(deck.map((candidate) => candidate.algorithm))).toEqual(
      new Set(['liquid', 'oniric', 'psy-hyp', '2001']),
    )
    expect(deck[0].algorithm).not.toBe('liquid')
    expect(deck.map((candidate) => candidate.id)).not.toContain('liquid:ritual-drift')
  })

  it('produce una scelta ripetibile con una sorgente random controllata', () => {
    const previous = {
      id: '2001:base',
      label: '2001 Base',
      algorithm: '2001' as const,
      presetId: 'base',
    }
    expect(buildMorphingInterludeDeck(previous, () => 0.5)).toEqual(
      buildMorphingInterludeDeck(previous, () => 0.5),
    )
  })
})
