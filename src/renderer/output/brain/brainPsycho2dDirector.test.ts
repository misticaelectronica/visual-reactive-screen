import { describe, expect, it } from 'vitest'
import { createPsycho2dScenePlan } from './brainPsycho2dDirector'
import type { Psycho2DImageAnalysis } from './brainPsycho2dAnalysis'

function analysis(imageId: string): Psycho2DImageAnalysis {
  return {
    version: 1,
    imageId,
    aspectRatio: 16 / 9,
    focalRegion: { x: 0.38, y: 0.28, width: 0.24, height: 0.4, score: 0.9, source: 'pixels' },
    protectedRegions: [],
    overlayRegions: [
      { x: 0.04, y: 0.2, width: 0.27, height: 0.4, score: 0.8, source: 'pixels' },
      { x: 0.7, y: 0.45, width: 0.25, height: 0.36, score: 0.7, source: 'pixels' },
    ],
    detailCrops: [
      { x: 0.32, y: 0.22, width: 0.36, height: 0.5, score: 0.9, source: 'pixels' },
    ],
    dominantAxis: 'horizontal',
    palette: ['#111111', '#eeeeee'],
    luminance: 0.5,
    contrast: 0.7,
    narrativeHints: [],
  }
}

describe('Psycho2D Scene Director', () => {
  it('compone NEXT come unica immagine fissa senza takeover', () => {
    const plan = createPsycho2dScenePlan([
      { id: 'a', role: 'current', analysis: analysis('a') },
      { id: 'b', role: 'next', analysis: analysis('b') },
    ], 42, false)

    expect(plan?.windows).toHaveLength(1)
    expect(plan?.windows[0].sourceImageId).toBe('b')
    expect(plan?.windows[0].takeover).toBe(false)
    expect(plan?.windows[0].shape).toBe('rect')
    expect(plan?.windows[0].from).toEqual(plan?.windows[0].to)
    expect(plan?.windows[0].opacity).toBeGreaterThanOrEqual(0.38)
    expect(plan?.windows[0].opacity).toBeLessThanOrEqual(0.64)
    expect(plan?.takeoverWindowId).toBeUndefined()
  })

  it('mantiene una sola sovrapposizione anche fuori dal low power', () => {
    const plan = createPsycho2dScenePlan([
      { id: 'a', role: 'current', analysis: analysis('a') },
      { id: 'b', role: 'previous', analysis: analysis('b') },
    ], 9, true)
    expect(plan?.windows).toHaveLength(1)
    expect(plan?.takeoverWindowId).toBeUndefined()
  })

  it('mantiene posizione e dimensione deterministiche per tutta la scena', () => {
    const sources = [
      { id: 'a', role: 'current' as const, analysis: analysis('a') },
      { id: 'b', role: 'next' as const, analysis: analysis('b') },
    ]
    const first = createPsycho2dScenePlan(sources, 77, false)
    const repeated = createPsycho2dScenePlan(sources, 77, false)
    const anotherScene = createPsycho2dScenePlan(sources, 78, false)

    expect(first?.windows[0].to).toEqual(repeated?.windows[0].to)
    expect(first?.windows[0].to).not.toEqual(anotherScene?.windows[0].to)
  })
})
