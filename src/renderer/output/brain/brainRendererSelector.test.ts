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

  it('usa un mazzo casuale nella rotazione automatica e non l’ordine del registry', () => {
    const randomValues = [0, 0.99, 0]
    const selector = new BrainRendererSelector(
      ['print2d', 'psycho2d', 'vector-morph', 'material-morph'],
      'print2d',
      () => randomValues.shift() ?? 0,
    )
    const settings = {
      ...DEFAULT_SETTINGS,
      brainRendererMode: 'rotation' as const,
      brainRendererId: 'print2d' as const,
      brainRendererRotationMs: 10_000,
    }

    expect(selector.resolve(settings, 0)).toBe('print2d')
    expect(selector.resolve(settings, 10_000)).toBe('material-morph')
    expect(selector.resolve(settings, 20_000)).toBe('vector-morph')
    expect(selector.resolve(settings, 30_000)).toBe('psycho2d')
  })

  it('usa tutti i renderer una volta prima di completare la storia', () => {
    const selector = new BrainRendererSelector(
      ['print2d', 'psycho2d', 'vector-morph', 'material-morph'],
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
    expect(selector.advanceStoryRenderer('story-1', settings, 4_000)).toBe(true)
    visited.push(selector.resolve(settings, 4_000))
    expect(selector.advanceStoryRenderer('story-1', settings, 5_000)).toBe(false)

    expect(new Set(visited)).toEqual(
      new Set(['print2d', 'psycho2d', 'vector-morph', 'material-morph']),
    )
    expect(visited).toHaveLength(4)
  })

  it('con cinque renderer assegna quattro varianti uniche ai quattro fotogrammi', () => {
    const selector = new BrainRendererSelector(
      ['print2d', 'psycho2d', 'vector-morph', 'material-morph', 'filter-psiche'],
      'print2d',
      () => 0,
    )
    const settings = {
      ...DEFAULT_SETTINGS,
      brainRendererMode: 'story-cycle' as const,
    }

    selector.beginStory('story-five-renderers', settings)
    const visited = [selector.resolve(settings, 0)]
    for (let frame = 1; frame < 4; frame += 1) {
      expect(selector.advanceStoryRenderer(
        'story-five-renderers',
        settings,
        frame * 1_000,
      )).toBe(true)
      visited.push(selector.resolve(settings, frame * 1_000))
    }

    expect(visited).toHaveLength(4)
    expect(new Set(visited).size).toBe(4)
    expect(visited.some((id) => id === 'filter-psiche')).toBe(true)
  })

  it('crea un nuovo ordine quando inizia la storia successiva', () => {
    const randomValues = [0, 0, 0.99, 0.99]
    const selector = new BrainRendererSelector(
      ['print2d', 'psycho2d', 'vector-morph', 'material-morph'],
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

  it('non apre una nuova storia con lo stesso renderer che ha chiuso la precedente', () => {
    const selector = new BrainRendererSelector(
      ['print2d', 'psycho2d', 'vector-morph', 'material-morph'],
      'print2d',
      () => 0.99,
    )
    const settings = {
      ...DEFAULT_SETTINGS,
      brainRendererMode: 'story-cycle' as const,
    }

    selector.beginStory('story-1', settings)
    while (selector.advanceStoryRenderer('story-1', settings, 1_000)) {
      selector.resolve(settings, 1_000)
    }
    const closing = selector.resolve(settings, 2_000)
    selector.beginStory('story-2', settings)

    expect(selector.resolve(settings, 3_000)).not.toBe(closing)
  })

  it('bilancia le presenze fra storie invece di ripescare sempre lo stesso renderer', () => {
    const ids = [
      'print2d',
      'psycho2d',
      'vector-morph',
      'material-morph',
      'filter-psiche',
      'bauhaus-morph',
    ] as const
    const selector = new BrainRendererSelector(ids, 'print2d', () => 0)
    const settings = {
      ...DEFAULT_SETTINGS,
      brainRendererMode: 'story-cycle' as const,
    }
    const counts = new Map<string, number>()
    for (let story = 0; story < 6; story += 1) {
      const storyId = `story-${story}`
      selector.beginStory(storyId, settings)
      const visited = [selector.resolve(settings, story * 10_000)]
      for (let frame = 1; frame < 4; frame += 1) {
        selector.advanceStoryRenderer(storyId, settings, story * 10_000 + frame)
        visited.push(selector.resolve(settings, story * 10_000 + frame))
      }
      expect(new Set(visited).size).toBe(4)
      for (const id of visited) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    const appearances = ids.map((id) => counts.get(id) ?? 0)
    expect(Math.max(...appearances) - Math.min(...appearances)).toBeLessThanOrEqual(1)
  })

  it('continua a ruotare casualmente mentre ricicla i fotogrammi in attesa', () => {
    const ids = [
      'print2d',
      'psycho2d',
      'vector-morph',
      'material-morph',
    ] as const
    const selector = new BrainRendererSelector(ids, 'vector-morph', () => 0)
    const settings = {
      ...DEFAULT_SETTINGS,
      brainRendererMode: 'story-cycle' as const,
    }

    selector.beginStory('story-in-wait', settings)
    const visited = [selector.resolve(settings, 0)]
    for (let step = 1; step < ids.length; step += 1) {
      expect(selector.advanceWaitingRenderer(settings, step * 1_000)).toBe(true)
      visited.push(selector.resolve(settings, step * 1_000))
    }

    expect(new Set(visited).size).toBe(ids.length)
    expect(selector.advanceWaitingRenderer(settings, 5_000)).toBe(true)
    expect(selector.resolve(settings, 5_000)).not.toBe(visited.at(-1))
  })

  it('non altera la selezione manuale durante l’attesa', () => {
    const selector = new BrainRendererSelector(
      ['print2d', 'vector-morph'],
      'vector-morph',
      () => 0,
    )
    const settings = {
      ...DEFAULT_SETTINGS,
      brainRendererMode: 'manual' as const,
      brainRendererId: 'vector-morph' as const,
    }

    expect(selector.advanceWaitingRenderer(settings, 1_000)).toBe(false)
    expect(selector.resolve(settings, 1_000)).toBe('vector-morph')
  })
})
