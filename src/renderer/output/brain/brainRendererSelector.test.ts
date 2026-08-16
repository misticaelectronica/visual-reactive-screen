import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import {
  BrainRendererSelector,
  selectBrainRendererHoldFrames,
} from './brainRendererSelector'

describe('Brain renderer selector', () => {
  it('applica immediatamente la selezione manuale', () => {
    const selector = new BrainRendererSelector(['print2d', 'psycho2d'])
    expect(selector.resolve({
      ...DEFAULT_SETTINGS,
      brainRendererId: 'psycho2d',
    }, 1_000)).toBe('psycho2d')
  })

  it('alterna i renderer ammessi senza ricreare la storia', () => {
    const selector = new BrainRendererSelector(['print2d', 'psycho2d', 'vector-morph'])
    const settings = {
      ...DEFAULT_SETTINGS,
      brainRendererMode: 'rotation' as const,
      brainRendererId: 'print2d' as const,
      brainRendererRotationMs: 10_000,
    }
    expect(selector.resolve(settings, 1_000)).toBe('psycho2d')
    expect(selector.resolve(settings, 10_999)).toBe('psycho2d')
    expect(selector.resolve(settings, 11_000)).toBe('vector-morph')
    expect(selector.resolve(settings, 21_000)).toBe('psycho2d')
  })

  it('esclude Print2D dalla rotazione automatica', () => {
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

    const visited = [selector.resolve(settings, 0)]
    for (let step = 1; step <= 8; step += 1) {
      visited.push(selector.resolve(settings, step * 10_000))
    }
    expect(visited).not.toContain('print2d')
    expect(visited).toContain('psycho2d')
    expect(new Set(visited).size).toBeGreaterThan(1)
  })

  it('mantiene FilterPsiche, Materia Morph e Vector Morph per 2-4 immagini', () => {
    for (const id of ['filter-psiche', 'material-morph', 'vector-morph'] as const) {
      expect(selectBrainRendererHoldFrames(id, () => 0)).toBe(2)
      expect(selectBrainRendererHoldFrames(id, () => 0.5)).toBe(3)
      expect(selectBrainRendererHoldFrames(id, () => 0.999)).toBe(4)
    }
  })

  it('lascia Psycho2D come comparsa casuale di una sola immagine', () => {
    expect(selectBrainRendererHoldFrames('psycho2d', () => 0.999)).toBe(1)
    expect(selectBrainRendererHoldFrames('print2d', () => 0.999)).toBe(1)
    expect(selectBrainRendererHoldFrames('bauhaus-morph', () => 0.999)).toBe(1)
  })

  it('mantiene Psycho2D nel ciclo per storia', () => {
    const selector = new BrainRendererSelector(
      ['filter-psiche', 'psycho2d'],
      'psycho2d',
      () => 0,
    )
    const settings = {
      ...DEFAULT_SETTINGS,
      brainRendererMode: 'story-cycle' as const,
    }

    selector.beginStory('story-1', settings)
    expect(selector.resolve(settings, 1_000)).toBe('filter-psiche')
    expect(selector.advanceStoryRenderer('story-1', settings, 2_000)).toBe(false)
    expect(selector.resolve(settings, 2_000)).toBe('filter-psiche')
    expect(selector.advanceStoryRenderer('story-1', settings, 3_000)).toBe(true)
    expect(selector.resolve(settings, 3_000)).toBe('psycho2d')
  })

  it('esclude Bauhaus geometrico solo dal ciclo per storia', () => {
    const ids = ['filter-psiche', 'material-morph', 'bauhaus-morph'] as const
    const storySelector = new BrainRendererSelector(ids, 'bauhaus-morph', () => 0)
    const storySettings = {
      ...DEFAULT_SETTINGS,
      brainRendererMode: 'story-cycle' as const,
      brainRendererId: 'bauhaus-morph' as const,
    }

    storySelector.beginStory('story-without-geometry', storySettings)
    const visited = [storySelector.resolve(storySettings, 0)]
    for (let frame = 1; frame < 8; frame += 1) {
      storySelector.advanceStoryRenderer(
        'story-without-geometry',
        storySettings,
        frame * 1_000,
      )
      visited.push(storySelector.resolve(storySettings, frame * 1_000))
    }
    expect(visited).not.toContain('bauhaus-morph')

    const manualSelector = new BrainRendererSelector(ids, 'bauhaus-morph', () => 0)
    expect(manualSelector.resolve({
      ...DEFAULT_SETTINGS,
      brainRendererMode: 'manual',
      brainRendererId: 'bauhaus-morph',
    }, 1_000)).toBe('bauhaus-morph')
  })

  it('con cinque renderer mantiene FilterPsiche nel ciclo visibile', () => {
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
    for (let frame = 1; frame < 12; frame += 1) {
      selector.advanceStoryRenderer(
        'story-five-renderers',
        settings,
        frame * 1_000,
      )
      visited.push(selector.resolve(settings, frame * 1_000))
    }

    expect(visited).toHaveLength(12)
    expect(visited.some((id) => id === 'filter-psiche')).toBe(true)
  })

  it('rende FilterPsiche visibile entro la seconda immagine anche se chiudeva la storia precedente', () => {
    const selector = new BrainRendererSelector(
      ['print2d', 'psycho2d', 'vector-morph', 'material-morph', 'filter-psiche'],
      'filter-psiche',
      () => 0.99,
    )
    const settings = {
      ...DEFAULT_SETTINGS,
      brainRendererMode: 'story-cycle' as const,
    }

    selector.beginStory('story-after-filter', settings)
    const first = selector.resolve(settings, 0)
    selector.advanceStoryRenderer('story-after-filter', settings, 1_000)
    const second = selector.resolve(settings, 1_000)

    expect(first).not.toBe('filter-psiche')
    expect(second).toBe('filter-psiche')
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
    for (let step = 0; step < 12; step += 1) {
      selector.advanceStoryRenderer('story-1', settings, 1_000 + step)
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
      for (const id of visited) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    const appearances = ids.map((id) => counts.get(id) ?? 0)
    expect(appearances.filter((count) => count > 0).length).toBeGreaterThan(1)
    expect(counts.get('filter-psiche') ?? 0).toBeGreaterThan(0)
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
    for (let step = 1; step < 12; step += 1) {
      selector.advanceWaitingRenderer(settings, step * 1_000)
      visited.push(selector.resolve(settings, step * 1_000))
    }

    expect(new Set(visited).size).toBeGreaterThan(1)
    expect(visited).not.toContain('print2d')
    expect(visited).toContain('psycho2d')
  })

  it('esce subito da Print2D quando passa alla rotazione automatica', () => {
    const selector = new BrainRendererSelector(
      ['print2d', 'psycho2d', 'vector-morph'],
      'print2d',
      () => 0,
    )
    const settings = {
      ...DEFAULT_SETTINGS,
      brainRendererMode: 'rotation' as const,
      brainRendererId: 'psycho2d' as const,
    }

    expect(selector.resolve(settings, 1_000)).toBe('psycho2d')
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
