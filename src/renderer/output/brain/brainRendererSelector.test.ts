import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import {
  BrainRendererSelector,
  selectBrainRendererHoldFrames,
} from './brainRendererSelector'

describe('selectBrainRendererHoldFrames — boost del Ciclo di Revisione', () => {
  it('senza boost resta nel range invariante onirico standard [2,3]', () => {
    for (let index = 0; index < 20; index += 1) {
      const value = selectBrainRendererHoldFrames('vector-morph', () => index / 20, false)
      expect(value).toBeGreaterThanOrEqual(2)
      expect(value).toBeLessThanOrEqual(3)
    }
  })

  it('con boost attivo l\'alternanza è più rapida, range [1,2]', () => {
    for (let index = 0; index < 20; index += 1) {
      const value = selectBrainRendererHoldFrames('vector-morph', () => index / 20, true)
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(2)
    }
  })

  it('un renderer non persistente resta sempre a 1, boost o no', () => {
    expect(selectBrainRendererHoldFrames('print2d', () => 0.5, false)).toBe(1)
    expect(selectBrainRendererHoldFrames('print2d', () => 0.5, true)).toBe(1)
  })
})

describe('BrainRendererSelector — Riattivazione (boost)', () => {
  const ids = ['print2d', 'filter-psiche', 'vector-morph', 'psycho2d', 'bauhaus-morph'] as const

  it('senza boost Print2D non compare mai nella storia', () => {
    const selector = new BrainRendererSelector(ids, 'filter-psiche', Math.random, () => false, () => false)
    const settings = { ...DEFAULT_SETTINGS, brainRendererMode: 'story-cycle' as const }
    selector.beginStory('story-1', settings)
    const visited = new Set([selector.resolve(settings, 0)])
    for (let frame = 1; frame < 4; frame += 1) {
      selector.advanceStoryRenderer('story-1', settings, frame)
      visited.add(selector.resolve(settings, frame))
    }
    expect(visited.has('print2d')).toBe(false)
  })

  it('con boost (Riattivazione) tutti i renderer compaiono, incluso Print2D, anche su una storia lunga', () => {
    const selector = new BrainRendererSelector(ids, 'filter-psiche', Math.random, () => false, () => true)
    const settings = { ...DEFAULT_SETTINGS, brainRendererMode: 'story-cycle' as const }
    selector.beginStory('story-1', settings)
    const visited = new Set([selector.resolve(settings, 0)])
    // Storia lunga come una Riattivazione reale (fino a 9 immagini × 3 giri).
    for (let frame = 1; frame < 25; frame += 1) {
      selector.advanceStoryRenderer('story-1', settings, frame)
      visited.add(selector.resolve(settings, frame))
    }
    for (const id of ids) expect(visited.has(id)).toBe(true)
  })

  it('con boost il mazzo si rifornisce da solo invece di fermarsi sull\'ultimo renderer', () => {
    const selector = new BrainRendererSelector(ids, 'filter-psiche', Math.random, () => false, () => true)
    const settings = { ...DEFAULT_SETTINGS, brainRendererMode: 'story-cycle' as const }
    selector.beginStory('story-1', settings)
    let changes = 0
    let previous = selector.resolve(settings, 0)
    for (let frame = 1; frame < 25; frame += 1) {
      selector.advanceStoryRenderer('story-1', settings, frame)
      const current = selector.resolve(settings, frame)
      if (current !== previous) changes += 1
      previous = current
    }
    // Con hold [1,2] su 24 avanzamenti ci si aspettano molti cambi, non
    // un mazzo che si esaurisce dopo i primi ~5 renderer.
    expect(changes).toBeGreaterThan(ids.length)
  })
})

describe('Brain renderer selector', () => {
  it('applica immediatamente la selezione manuale', () => {
    const selector = new BrainRendererSelector(['print2d', 'psycho2d'])
    expect(selector.resolve({
      ...DEFAULT_SETTINGS,
      brainRendererId: 'psycho2d',
    }, 1_000)).toBe('psycho2d')
  })

  it('alterna i renderer ammessi senza ricreare la storia', () => {
    const selector = new BrainRendererSelector(['print2d', 'vector-morph'])
    const settings = {
      ...DEFAULT_SETTINGS,
      brainRendererMode: 'rotation' as const,
      brainRendererId: 'print2d' as const,
      brainRendererRotationMs: 10_000,
    }
    expect(selector.resolve(settings, 1_000)).toBe('print2d')
    expect(selector.resolve(settings, 10_999)).toBe('print2d')
    expect(selector.resolve(settings, 11_000)).toBe('vector-morph')
    expect(selector.resolve(settings, 21_000)).toBe('print2d')
  })

  it('include Print2D e Psycho2D nella rotazione automatica', () => {
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
    expect(visited).toContain('print2d')
    expect(visited).toContain('psycho2d')
    expect(new Set(visited).size).toBeGreaterThan(1)
  })

  it('mantiene FilterPsiche, Materia Morph e Vector Morph per 2-3 immagini, mai l’intera storia', () => {
    for (const id of ['filter-psiche', 'material-morph', 'vector-morph'] as const) {
      expect(selectBrainRendererHoldFrames(id, () => 0)).toBe(2)
      expect(selectBrainRendererHoldFrames(id, () => 0.5)).toBe(3)
      expect(selectBrainRendererHoldFrames(id, () => 0.999)).toBe(3)
    }
  })

  it('mantiene anche Psycho2D e Bauhaus per 2-3 immagini, invariato Print2D a comparsa singola', () => {
    expect(selectBrainRendererHoldFrames('psycho2d', () => 0)).toBe(2)
    expect(selectBrainRendererHoldFrames('psycho2d', () => 0.5)).toBe(3)
    expect(selectBrainRendererHoldFrames('psycho2d', () => 0.999)).toBe(3)
    expect(selectBrainRendererHoldFrames('bauhaus-morph', () => 0)).toBe(2)
    expect(selectBrainRendererHoldFrames('bauhaus-morph', () => 0.999)).toBe(3)
    expect(selectBrainRendererHoldFrames('print2d', () => 0.999)).toBe(1)
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

  it('include Bauhaus nel ciclo per storia, oltre che nella selezione manuale', () => {
    const ids = ['filter-psiche', 'material-morph', 'bauhaus-morph'] as const
    const storySelector = new BrainRendererSelector(ids, 'filter-psiche', Math.random)
    const storySettings = {
      ...DEFAULT_SETTINGS,
      brainRendererMode: 'story-cycle' as const,
    }

    const seenAcrossStories = new Set<string>()
    for (let story = 1; story <= 5; story += 1) {
      const storyId = `story-${story}`
      storySelector.beginStory(storyId, storySettings)
      const base = story * 10_000
      seenAcrossStories.add(storySelector.resolve(storySettings, base))
      for (let frame = 1; frame < 4; frame += 1) {
        storySelector.advanceStoryRenderer(storyId, storySettings, base + frame)
        seenAcrossStories.add(storySelector.resolve(storySettings, base + frame))
      }
    }
    expect(seenAcrossStories.has('bauhaus-morph')).toBe(true)

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

  it('non lascia dominare FilterPsiche nonostante permanenza lunga e priorità iniziale', () => {
    const ids = ['psycho2d', 'vector-morph', 'material-morph', 'filter-psiche'] as const
    const selector = new BrainRendererSelector(ids, 'psycho2d', Math.random)
    const settings = {
      ...DEFAULT_SETTINGS,
      brainRendererMode: 'story-cycle' as const,
    }
    const frameCounts = new Map<string, number>()
    let totalFrames = 0
    for (let story = 0; story < 200; story += 1) {
      const storyId = `story-${story}`
      selector.beginStory(storyId, settings)
      const base = story * 100_000
      let id = selector.resolve(settings, base)
      frameCounts.set(id, (frameCounts.get(id) ?? 0) + 1)
      totalFrames += 1
      for (let frame = 1; frame < 4; frame += 1) {
        selector.advanceStoryRenderer(storyId, settings, base + frame)
        id = selector.resolve(settings, base + frame)
        frameCounts.set(id, (frameCounts.get(id) ?? 0) + 1)
        totalFrames += 1
      }
    }
    const filterShare = (frameCounts.get('filter-psiche') ?? 0) / totalFrames
    expect(filterShare).toBeLessThan(0.4)
    for (const id of ids) {
      expect(frameCounts.get(id) ?? 0).toBeGreaterThan(0)
    }
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

  it('non relega in fondo al mazzo il renderer meno mostrato quando FilterPsiche va in prima posizione', () => {
    const ids = ['filter-psiche', 'psycho2d', 'vector-morph'] as const
    const selector = new BrainRendererSelector(ids, 'psycho2d', Math.random)
    const settings = {
      ...DEFAULT_SETTINGS,
      brainRendererMode: 'story-cycle' as const,
    }

    const seenWithinFiveStories = new Set<string>()
    for (let story = 1; story <= 5; story += 1) {
      const storyId = `story-${story}`
      selector.beginStory(storyId, settings)
      const base = story * 10_000
      seenWithinFiveStories.add(selector.resolve(settings, base))
      for (let frame = 1; frame < 4; frame += 1) {
        selector.advanceStoryRenderer(storyId, settings, base + frame)
        seenWithinFiveStories.add(selector.resolve(settings, base + frame))
      }
    }
    expect(seenWithinFiveStories.has('psycho2d')).toBe(true)
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

  it('bilancia per peso anche il mazzo di attesa durante una generazione lunga', () => {
    const ids = ['psycho2d', 'vector-morph', 'material-morph', 'filter-psiche'] as const
    const selector = new BrainRendererSelector(ids, 'psycho2d', Math.random)
    const settings = {
      ...DEFAULT_SETTINGS,
      brainRendererMode: 'story-cycle' as const,
    }
    selector.beginStory('story-long-wait', settings)
    selector.resolve(settings, 0)
    const frameCounts = new Map<string, number>()
    let totalFrames = 0
    for (let step = 1; step <= 2_000; step += 1) {
      selector.advanceWaitingRenderer(settings, step * 1_000)
      const id = selector.resolve(settings, step * 1_000)
      frameCounts.set(id, (frameCounts.get(id) ?? 0) + 1)
      totalFrames += 1
    }
    const persistentShare = ['vector-morph', 'material-morph', 'filter-psiche'].map(
      (id) => (frameCounts.get(id) ?? 0) / totalFrames,
    )
    for (const share of persistentShare) {
      expect(share).toBeGreaterThan(0.2)
      expect(share).toBeLessThan(0.35)
    }
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

  it('gira tutti i renderer di "Tutti per storia" in modo omogeneo, senza priorità', () => {
    const ids = [
      'print2d',
      'psycho2d',
      'vector-morph',
      'material-morph',
      'filter-psiche',
      'bauhaus-morph',
    ] as const
    const selector = new BrainRendererSelector(ids, 'print2d', Math.random)
    const settings = {
      ...DEFAULT_SETTINGS,
      brainRendererMode: 'story-cycle' as const,
    }
    const frameCounts = new Map<string, number>()
    let totalFrames = 0
    for (let story = 0; story < 300; story += 1) {
      const storyId = `story-${story}`
      selector.beginStory(storyId, settings)
      const base = story * 100_000
      let id = selector.resolve(settings, base)
      frameCounts.set(id, (frameCounts.get(id) ?? 0) + 1)
      totalFrames += 1
      for (let frame = 1; frame < 4; frame += 1) {
        selector.advanceStoryRenderer(storyId, settings, base + frame)
        id = selector.resolve(settings, base + frame)
        frameCounts.set(id, (frameCounts.get(id) ?? 0) + 1)
        totalFrames += 1
      }
      for (let wait = 0; wait < 3; wait += 1) {
        selector.advanceWaitingRenderer(settings, base + 5 + wait)
        id = selector.resolve(settings, base + 5 + wait)
        frameCounts.set(id, (frameCounts.get(id) ?? 0) + 1)
        totalFrames += 1
      }
    }
    const activeRenderers = [
      'psycho2d',
      'vector-morph',
      'material-morph',
      'filter-psiche',
      'bauhaus-morph',
    ]
    for (const id of activeRenderers) {
      const share = (frameCounts.get(id) ?? 0) / totalFrames
      expect(share).toBeGreaterThan(0.1)
      expect(share).toBeLessThan(0.3)
    }
    expect(frameCounts.get('print2d') ?? 0).toBe(0)
  })

  it('garantisce almeno un cambio di renderer dentro ogni storia da 4 fotogrammi', () => {
    const ids = ['filter-psiche', 'material-morph', 'vector-morph', 'psycho2d'] as const
    const selector = new BrainRendererSelector(ids, 'filter-psiche', Math.random)
    const settings = {
      ...DEFAULT_SETTINGS,
      brainRendererMode: 'story-cycle' as const,
    }
    for (let story = 0; story < 100; story += 1) {
      const storyId = `story-${story}`
      selector.beginStory(storyId, settings)
      const base = story * 10_000
      const visited = new Set([selector.resolve(settings, base)])
      for (let frame = 1; frame < 4; frame += 1) {
        selector.advanceStoryRenderer(storyId, settings, base + frame)
        visited.add(selector.resolve(settings, base + frame))
      }
      expect(visited.size).toBeGreaterThan(1)
    }
  })

  it('sotto pressione GPU reale evita Bauhaus Morph e Materia Morph nella storia', () => {
    const ids = [
      'filter-psiche',
      'material-morph',
      'vector-morph',
      'psycho2d',
      'bauhaus-morph',
    ] as const
    const selector = new BrainRendererSelector(
      ids,
      'filter-psiche',
      Math.random,
      () => true,
    )
    const settings = {
      ...DEFAULT_SETTINGS,
      brainRendererMode: 'story-cycle' as const,
    }
    for (let story = 0; story < 50; story += 1) {
      const storyId = `story-${story}`
      selector.beginStory(storyId, settings)
      const base = story * 10_000
      const visited = new Set([selector.resolve(settings, base)])
      for (let frame = 1; frame < 4; frame += 1) {
        selector.advanceStoryRenderer(storyId, settings, base + frame)
        visited.add(selector.resolve(settings, base + frame))
      }
      expect(visited.has('bauhaus-morph')).toBe(false)
      expect(visited.has('material-morph')).toBe(false)
    }
  })

  it('senza pressione reale continua a includere tutti i renderer nella storia', () => {
    const ids = [
      'filter-psiche',
      'material-morph',
      'vector-morph',
      'psycho2d',
      'bauhaus-morph',
    ] as const
    const selector = new BrainRendererSelector(
      ids,
      'filter-psiche',
      Math.random,
      () => false,
    )
    const settings = {
      ...DEFAULT_SETTINGS,
      brainRendererMode: 'story-cycle' as const,
    }
    const everVisited = new Set<string>()
    for (let story = 0; story < 50; story += 1) {
      const storyId = `story-${story}`
      selector.beginStory(storyId, settings)
      const base = story * 10_000
      everVisited.add(selector.resolve(settings, base))
      for (let frame = 1; frame < 4; frame += 1) {
        selector.advanceStoryRenderer(storyId, settings, base + frame)
        everVisited.add(selector.resolve(settings, base + frame))
      }
    }
    expect(everVisited.has('bauhaus-morph')).toBe(true)
    expect(everVisited.has('material-morph')).toBe(true)
  })
})
