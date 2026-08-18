import { describe, expect, it } from 'vitest'
import { buildMorphingInterludeDeck } from './morphingRotation'

describe('morphing interlude deck', () => {
  it('estrae una variante casuale per famiglia prima di ricominciare, escludendo Liquid e 2001', () => {
    const deck = buildMorphingInterludeDeck({
      id: 'psy-hyp:default',
      label: 'PsyHyp',
      algorithm: 'psy-hyp',
      presetId: 'default',
    }, () => 0)

    expect(deck).toHaveLength(2)
    expect(new Set(deck.map((candidate) => candidate.algorithm))).toEqual(
      new Set(['oniric', 'psy-hyp']),
    )
    expect(deck.map((candidate) => candidate.algorithm)).not.toContain('liquid')
    expect(deck.map((candidate) => candidate.algorithm)).not.toContain('2001')
  })

  it('produce una scelta ripetibile con una sorgente random controllata', () => {
    const previous = {
      id: 'oniric:base',
      label: 'Oniric Base',
      algorithm: 'oniric' as const,
      presetId: 'base',
    }
    expect(buildMorphingInterludeDeck(previous, () => 0.5)).toEqual(
      buildMorphingInterludeDeck(previous, () => 0.5),
    )
  })
})
