import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import { BrainRendererSelector } from './brainRendererSelector'

describe('Brain renderer selector', () => {
  it('applica immediatamente la selezione manuale', () => {
    const selector = new BrainRendererSelector(['print2d', 'psycho2d'])
    expect(selector.resolve({
      ...DEFAULT_SETTINGS,
      brainRendererId: 'psycho2d',
    }, 1_000)).toBe('psycho2d')
  })

  it('alterna i renderer senza ricreare la storia', () => {
    const selector = new BrainRendererSelector(['print2d', 'psycho2d'])
    const settings = {
      ...DEFAULT_SETTINGS,
      brainRendererMode: 'rotation' as const,
      brainRendererId: 'print2d' as const,
      brainRendererRotationMs: 10_000,
    }
    expect(selector.resolve(settings, 1_000)).toBe('print2d')
    expect(selector.resolve(settings, 10_999)).toBe('print2d')
    expect(selector.resolve(settings, 11_000)).toBe('psycho2d')
    expect(selector.resolve(settings, 21_000)).toBe('print2d')
  })

  it('usa tutti i renderer una volta prima di completare la storia', () => {
    const selector = new BrainRendererSelector(
      ['print2d', 'psycho2d', 'vector-morph'],
      'print2d',
      () => 0,
    )
    const settings = {
      ...DEFAULT_SETTINGS,
      brainRendererMode: 'story-cycle' as const,
    }

    selector.beginStory('story-1', settings)
    const visited = [selector.resolve(settings, 1_000)]
    expect(selector.advanceStoryRenderer('story-1', settings, 2_000)).toBe(true)
    visited.push(selector.resolve(settings, 2_000))
    expect(selector.advanceStoryRenderer('story-1', settings, 3_000)).toBe(true)
    visited.push(selector.resolve(settings, 3_000))
    expect(selector.advanceStoryRenderer('story-1', settings, 4_000)).toBe(false)

    expect(new Set(visited)).toEqual(
      new Set(['print2d', 'psycho2d', 'vector-morph']),
    )
    expect(visited).toHaveLength(3)
  })

  it('crea un nuovo ordine quando inizia la storia successiva', () => {
    const randomValues = [0, 0, 0.99, 0.99]
    const selector = new BrainRendererSelector(
      ['print2d', 'psycho2d', 'vector-morph'],
      'print2d',
      () => randomValues.shift() ?? 0,
    )
    const settings = {
      ...DEFAULT_SETTINGS,
      brainRendererMode: 'story-cycle' as const,
    }

    selector.beginStory('story-1', settings)
    const firstStart = selector.resolve(settings, 1_000)
    selector.beginStory('story-2', settings)
    const secondStart = selector.resolve(settings, 2_000)

    expect(firstStart).not.toBe(secondStart)
  })
})
