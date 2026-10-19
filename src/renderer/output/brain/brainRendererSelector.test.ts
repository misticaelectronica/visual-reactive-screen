import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import { BRAIN_RENDERER_IDS, type BrainRendererId } from '@shared/types'
import {
  BrainRendererSelector,
  selectBrainRendererHoldFrames,
} from './brainRendererSelector'

beforeEach(() => vi.stubGlobal('__PSICOFANTASMA_AVAILABLE__', true))
afterEach(() => vi.unstubAllGlobals())

it('allows manual PsicoFantasma preview without introducing it into either automatic mode', () => {
  vi.stubGlobal('__PSICOFANTASMA_AVAILABLE__', false)
  const selector = new BrainRendererSelector(BRAIN_RENDERER_IDS, 'psicofantasma')
  const settings = { ...DEFAULT_SETTINGS, brainRendererId: 'psicofantasma' as const,
    brainRendererMode: 'manual' as const }
  expect(selector.resolve(settings, 0)).toBe('psicofantasma')
  expect(selector.resolve({ ...settings, brainRendererMode: 'rotation' }, 1)).not.toBe('psicofantasma')
  expect(selector.resolve(settings, 2)).toBe('psicofantasma')
  const automatic = { ...settings, brainRendererMode: 'story-cycle' as const }
  selector.beginStory('preview-exclusion', automatic)
  for (let frame = 0; frame < 30; frame++) {
    expect(selector.resolve(automatic, frame + 3)).not.toBe('psicofantasma')
    selector.advanceStoryRenderer('preview-exclusion', automatic, frame + 3)
  }
})

describe('BrainRendererSelector.eligibleRenderers — base per la rete di sicurezza al failure', () => {
  it('mantiene PsicoFantasma eleggibile in tutti e quattro i regimi', () => {
    for (const regime of [
      'respiro-alto',
      'pressurized',
      'decompression',
      'respiro-profondo',
    ] as const) {
      const selector = new BrainRendererSelector(
        BRAIN_RENDERER_IDS, 'filter-psiche', Math.random, () => false, () => false,
        () => regime, () => 'standard',
      )
      expect(selector.eligibleRenderers(), regime).toContain('psicofantasma')
    }
  })

  it('rispetta whitelist di regime, esclusione story-cycle di Print2D e filtro pressione', () => {
    const low = new BrainRendererSelector(
      BRAIN_RENDERER_IDS, 'filter-psiche', Math.random, () => false, () => false,
      () => 'decompression',
    )
    const eligibleLow = low.eligibleRenderers()
    expect(eligibleLow).not.toContain('print2d')
    expect(eligibleLow).not.toContain('psycho2d') // fuori dalla whitelist del regime basso
    expect(eligibleLow).toContain('filter-psiche')
    expect(eligibleLow).toContain('deliquescence')

    const underPressure = new BrainRendererSelector(
      BRAIN_RENDERER_IDS, 'filter-psiche', Math.random, () => true, () => false,
      () => 'decompression',
    )
    const eligiblePressure = underPressure.eligibleRenderers()
    // I renderer ad analisi multi-sorgente vengono tolti sotto pressione GPU.
    expect(eligiblePressure).not.toContain('bauhaus-morph')
    expect(eligiblePressure).not.toContain('material-morph')
    expect(eligiblePressure).toContain('filter-psiche')
  })
})

describe('BrainRendererSelector — gate qualità immagine PsicoFantasma (PIANO-043 034-20)', () => {
  const storyCycle = { ...DEFAULT_SETTINGS, brainRendererMode: 'story-cycle' as const }
  const pair = ['filter-psiche', 'psicofantasma'] as BrainRendererId[]

  it('esclude PsicoFantasma sui fotogrammi interlude e lo ammette su standard', () => {
    const onInterlude = new BrainRendererSelector(
      pair, 'filter-psiche', () => 0.99, () => false, () => false,
      () => 'respiro-alto', () => 'interlude',
    )
    onInterlude.beginStory('s-interlude', storyCycle)
    const seenInterlude = new Set<BrainRendererId>()
    for (let frame = 0; frame < 40; frame++) {
      seenInterlude.add(onInterlude.resolve(storyCycle, frame))
      onInterlude.advanceStoryRenderer('s-interlude', storyCycle, frame)
    }
    expect(seenInterlude).toEqual(new Set(['filter-psiche']))

    const onStandard = new BrainRendererSelector(
      pair, 'filter-psiche', Math.random, () => false, () => false,
      () => 'respiro-alto', () => 'standard',
    )
    onStandard.beginStory('s-standard', storyCycle)
    const seenStandard = new Set<BrainRendererId>()
    for (let frame = 0; frame < 40; frame++) {
      seenStandard.add(onStandard.resolve(storyCycle, frame))
      onStandard.advanceStoryRenderer('s-standard', storyCycle, frame)
    }
    expect(seenStandard.has('psicofantasma')).toBe(true)
  })

  it('un fotogramma senza modalità (archiviato) non esclude PsicoFantasma', () => {
    const selector = new BrainRendererSelector(
      pair, 'filter-psiche', Math.random, () => false, () => false,
      () => 'respiro-alto', () => undefined,
    )
    selector.beginStory('s-archived', storyCycle)
    const seen = new Set<BrainRendererId>()
    for (let frame = 0; frame < 40; frame++) {
      seen.add(selector.resolve(storyCycle, frame))
      selector.advanceStoryRenderer('s-archived', storyCycle, frame)
    }
    expect(seen.has('psicofantasma')).toBe(true)
  })

  it('sostituisce PsicoFantasma quando il fotogramma passa a interlude a metà hold', () => {
    let mode: 'standard' | 'interlude' = 'standard'
    const selector = new BrainRendererSelector(
      pair, 'psicofantasma', () => 0.99, () => false, () => false,
      () => 'respiro-alto', () => mode,
    )
    const manual = { ...DEFAULT_SETTINGS, brainRendererId: 'psicofantasma' as const,
      brainRendererMode: 'manual' as const }
    // parte manuale su PsicoFantasma, poi passa ad automatico story-cycle
    expect(selector.resolve(manual, 0)).toBe('psicofantasma')
    expect(selector.resolve(storyCycle, 1)).toBe('psicofantasma')
    mode = 'interlude'
    expect(selector.resolve(storyCycle, 2)).toBe('filter-psiche')
  })

  it('la selezione manuale ignora il gate (strumento di sviluppo)', () => {
    const selector = new BrainRendererSelector(
      BRAIN_RENDERER_IDS, 'psicofantasma', Math.random, () => false, () => false,
      () => 'respiro-alto', () => 'interlude',
    )
    const manual = { ...DEFAULT_SETTINGS, brainRendererId: 'psicofantasma' as const,
      brainRendererMode: 'manual' as const }
    expect(selector.resolve(manual, 0)).toBe('psicofantasma')
    expect(selector.resolve(manual, 1)).toBe('psicofantasma')
  })
})

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

  it('con boost il filtro pressione non esclude i renderer pesanti (copertura completa garantita)', () => {
    // Segnalato dal Capo Supremo con log reali: durante la Riattivazione
    // l'alternanza rapidissima genera gap RAF che il thermalScheduler legge
    // come pressione reale, escludendo sistematicamente bauhaus-morph
    // (pesante) dal mazzo — proprio nella fase che deve garantire che tutti
    // i renderer compaiano almeno una volta.
    const selector = new BrainRendererSelector(
      ids, 'filter-psiche', Math.random, () => true, () => true,
    )
    const settings = { ...DEFAULT_SETTINGS, brainRendererMode: 'story-cycle' as const }
    selector.beginStory('story-1', settings)
    const visited = new Set([selector.resolve(settings, 0)])
    for (let frame = 1; frame < 25; frame += 1) {
      selector.advanceStoryRenderer('story-1', settings, frame)
      visited.add(selector.resolve(settings, frame))
    }
    expect(visited.has('bauhaus-morph')).toBe(true)
  })

  it('senza boost il filtro pressione esclude ancora i renderer pesanti', () => {
    const selector = new BrainRendererSelector(
      ids, 'filter-psiche', Math.random, () => true, () => false,
    )
    const settings = { ...DEFAULT_SETTINGS, brainRendererMode: 'story-cycle' as const }
    selector.beginStory('story-1', settings)
    const visited = new Set([selector.resolve(settings, 0)])
    for (let frame = 1; frame < 10; frame += 1) {
      selector.advanceStoryRenderer('story-1', settings, frame)
      visited.add(selector.resolve(settings, frame))
    }
    expect(visited.has('bauhaus-morph')).toBe(false)
  })
})

describe('BrainRendererSelector — reportRendererFailure', () => {
  const ids = ['print2d', 'filter-psiche', 'vector-morph', 'psycho2d', 'bauhaus-morph'] as const

  it('fa avanzare subito il mazzo oltre il renderer attivo fallito', () => {
    const selector = new BrainRendererSelector(ids, 'filter-psiche', Math.random, () => false, () => true)
    const settings = { ...DEFAULT_SETTINGS, brainRendererMode: 'story-cycle' as const }
    selector.beginStory('story-1', settings)
    const active = selector.resolve(settings, 0)
    selector.reportRendererFailure(active, settings, 1)
    expect(selector.resolve(settings, 1)).not.toBe(active)
  })

  it('non fa nulla se il renderer fallito non è più quello attivo', () => {
    const selector = new BrainRendererSelector(ids, 'filter-psiche', Math.random, () => false, () => true)
    const settings = { ...DEFAULT_SETTINGS, brainRendererMode: 'story-cycle' as const }
    selector.beginStory('story-1', settings)
    const active = selector.resolve(settings, 0)
    const stale = ids.find((id) => id !== active) ?? active
    selector.reportRendererFailure(stale, settings, 1)
    expect(selector.resolve(settings, 1)).toBe(active)
  })

  it('non fa nulla fuori dalla modalità story-cycle', () => {
    const selector = new BrainRendererSelector(ids, 'filter-psiche', Math.random)
    const settings = {
      ...DEFAULT_SETTINGS,
      brainRendererMode: 'rotation' as const,
      brainRendererId: 'filter-psiche' as const,
    }
    const active = selector.resolve(settings, 0)
    selector.reportRendererFailure(active, settings, 1)
    expect(selector.resolve(settings, 1)).toBe(active)
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

describe('selectBrainRendererHoldFrames — hold per regime durante Riattivazione (PIANO-040 §17.1)', () => {
  it('pressurized in boost resta nel range [1,2] (invariato)', () => {
    for (let index = 0; index < 20; index += 1) {
      const value = selectBrainRendererHoldFrames('vector-morph', () => index / 20, true, 'pressurized')
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(2)
    }
  })

  it('decompression in boost è sempre 2 fisso', () => {
    for (let index = 0; index < 20; index += 1) {
      const value = selectBrainRendererHoldFrames('vector-morph', () => index / 20, true, 'decompression')
      expect(value).toBe(2)
    }
  })

  it('respiro-profondo in boost torna al range ordinario [2,3] (la Riattivazione rallenta fino a mimetizzarsi)', () => {
    for (let index = 0; index < 20; index += 1) {
      const value = selectBrainRendererHoldFrames('vector-morph', () => index / 20, true, 'respiro-profondo')
      expect(value).toBeGreaterThanOrEqual(2)
      expect(value).toBeLessThanOrEqual(3)
    }
  })

  it('regime non passato o unresolved: nessuna regressione, comportamento di oggi [1,2]', () => {
    for (let index = 0; index < 20; index += 1) {
      expect(selectBrainRendererHoldFrames('vector-morph', () => index / 20, true)).toBeLessThanOrEqual(2)
      const value = selectBrainRendererHoldFrames('vector-morph', () => index / 20, true, 'unresolved')
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(2)
    }
  })
})

describe('BrainRendererSelector — esclusione per regime (PIANO-040 §4/§17.1)', () => {
  const ids = BRAIN_RENDERER_IDS
  const lowPool = new Set([
    'deliquescence',
    'filter-psiche',
    'vector-morph',
    'material-morph',
    'bauhaus-morph',
    'dream-segmentation',
    'psicofantasma',
  ])

  it('in decompression/respiro-profondo compare soltanto la whitelist normativa con PsicoFantasma', () => {
    for (const regime of ['decompression', 'respiro-profondo'] as const) {
      for (const boosted of [false, true]) {
        const selector = new BrainRendererSelector(
          ids, 'filter-psiche', Math.random, () => false, () => boosted, () => regime,
        )
        const settings = { ...DEFAULT_SETTINGS, brainRendererMode: 'story-cycle' as const }
        selector.beginStory(`story-${regime}-${boosted}`, settings)
        const visited = new Set([selector.resolve(settings, 0)])
        for (let frame = 1; frame < 20; frame += 1) {
          selector.advanceStoryRenderer(`story-${regime}-${boosted}`, settings, frame)
          visited.add(selector.resolve(settings, frame))
        }
        for (const id of visited) expect(lowPool.has(id)).toBe(true)
        expect(visited.has('glitch-morph')).toBe(false)
      }
    }
  })

  it('il regime vince sempre sull\'evento tecnico: la Riattivazione (boost) NON riabilita Print2D in regime basso', () => {
    // Stesso scenario del test "con boost tutti i renderer compaiono, incluso
    // Print2D" sopra, ma con un regime basso: qui Print2D deve restare fuori
    // nonostante il boost, a differenza del filtro pressione GPU.
    const selector = new BrainRendererSelector(
      ids, 'filter-psiche', Math.random, () => false, () => true, () => 'respiro-profondo',
    )
    const settings = { ...DEFAULT_SETTINGS, brainRendererMode: 'story-cycle' as const }
    selector.beginStory('story-1', settings)
    const visited = new Set([selector.resolve(settings, 0)])
    for (let frame = 1; frame < 25; frame += 1) {
      selector.advanceStoryRenderer('story-1', settings, frame)
      visited.add(selector.resolve(settings, frame))
    }
    expect(visited.has('print2d')).toBe(false)
  })

  it('in pressurized/unresolved il pool resta ampio come oggi', () => {
    for (const regime of ['pressurized', 'unresolved', undefined] as const) {
      const selector = new BrainRendererSelector(
        ids, 'filter-psiche', Math.random, () => false, () => true, regime ? () => regime : undefined,
      )
      const settings = { ...DEFAULT_SETTINGS, brainRendererMode: 'story-cycle' as const }
      selector.beginStory(`story-${regime}`, settings)
      const visited = new Set([selector.resolve(settings, 0)])
      for (let frame = 1; frame < 25; frame += 1) {
        selector.advanceStoryRenderer(`story-${regime}`, settings, frame)
        visited.add(selector.resolve(settings, frame))
      }
      expect(visited.has('print2d')).toBe(true)
    }
  })

  it('un cambio a respiro-profondo invalida subito Psycho2D attivo e gli ID già accodati nel vecchio mazzo', () => {
    let regime: 'pressurized' | 'respiro-profondo' = 'pressurized'
    const selector = new BrainRendererSelector(
      ids,
      'psycho2d',
      () => 0.99,
      () => false,
      () => true,
      () => regime,
    )
    const settings = { ...DEFAULT_SETTINGS, brainRendererMode: 'story-cycle' as const }
    selector.beginStory('story-regime-change', settings)
    let active = selector.resolve(settings, 0)
    for (let frame = 1; frame < 30 && active !== 'psycho2d'; frame += 1) {
      selector.advanceStoryRenderer('story-regime-change', settings, frame)
      active = selector.resolve(settings, frame)
    }
    expect(active).toBe('psycho2d')

    regime = 'respiro-profondo'
    const visited = new Set([selector.resolve(settings, 100)])
    for (let frame = 101; frame < 130; frame += 1) {
      selector.advanceStoryRenderer('story-regime-change', settings, frame)
      visited.add(selector.resolve(settings, frame))
    }
    expect(visited.has('psycho2d')).toBe(false)
    expect(visited.has('fractal-spiral-degeneration')).toBe(false)
    expect(visited.has('print2d')).toBe(false)
  })

  it('un cambio a respiro-profondo espelle subito Glitch Morph attivo e accodato', () => {
    let regime: 'pressurized' | 'respiro-profondo' = 'pressurized'
    const selector = new BrainRendererSelector(
      ids,
      'glitch-morph',
      () => 0.99,
      () => false,
      () => false,
      () => regime,
    )
    const settings = { ...DEFAULT_SETTINGS, brainRendererMode: 'story-cycle' as const }
    selector.beginStory('story-glitch-regime-change', settings)
    let active = selector.resolve(settings, 0)
    for (let frame = 1; frame < 40 && active !== 'glitch-morph'; frame += 1) {
      selector.advanceStoryRenderer('story-glitch-regime-change', settings, frame)
      active = selector.resolve(settings, frame)
    }
    expect(active).toBe('glitch-morph')

    regime = 'respiro-profondo'
    const visited = new Set([selector.resolve(settings, 100)])
    for (let frame = 101; frame < 130; frame += 1) {
      selector.advanceStoryRenderer('story-glitch-regime-change', settings, frame)
      visited.add(selector.resolve(settings, frame))
    }
    expect(visited.has('glitch-morph')).toBe(false)
    for (const id of visited) expect(lowPool.has(id)).toBe(true)
  })
})

describe('RESPIRO ALTO — hold e pool proprio (Item 4)', () => {
  const ids = BRAIN_RENDERER_IDS
  const highPriority = new Set([
    'psycho2d',
    'fractal-spiral-degeneration',
    'glitch-morph',
    'vector-morph',
    'filter-psiche',
  ])
  const highSecondary = new Set(['material-morph', 'bauhaus-morph', 'dream-segmentation'])

  it('fuori Riattivazione, respiro-alto usa il range persistente ordinario [2,3] — non la stretta [1,2]', () => {
    for (let index = 0; index < 20; index += 1) {
      const value = selectBrainRendererHoldFrames('vector-morph', () => index / 20, false, 'respiro-alto')
      expect(value).toBeGreaterThanOrEqual(2)
      expect(value).toBeLessThanOrEqual(3)
    }
    // Estremi espliciti: mai 1, mai 4.
    expect(selectBrainRendererHoldFrames('vector-morph', () => 0, false, 'respiro-alto')).toBe(2)
    expect(selectBrainRendererHoldFrames('vector-morph', () => 0.999, false, 'respiro-alto')).toBe(3)
  })

  it('durante la Riattivazione (boost) respiro-alto resta nella stretta [1,2], come pressurized', () => {
    for (let index = 0; index < 20; index += 1) {
      const value = selectBrainRendererHoldFrames('vector-morph', () => index / 20, true, 'respiro-alto')
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(2)
    }
  })

  it('nel ciclo per storia i prioritari coprono la rotazione; i compatibili non prioritari non vi compaiono (restano per i ricicli lunghi)', () => {
    const selector = new BrainRendererSelector(
      ids, 'psycho2d', () => 0.5, () => false, () => false, () => 'respiro-alto',
    )
    const settings = { ...DEFAULT_SETTINGS, brainRendererMode: 'story-cycle' as const }
    const visited = new Set<string>()
    for (let story = 0; story < 12; story += 1) {
      selector.beginStory(`alto-story-${story}`, settings)
      visited.add(selector.resolve(settings, story * 1_000))
      for (let frame = 1; frame < 8; frame += 1) {
        selector.advanceStoryRenderer(`alto-story-${story}`, settings, story * 1_000 + frame)
        visited.add(selector.resolve(settings, story * 1_000 + frame))
      }
    }
    for (const id of visited) expect(highPriority.has(id)).toBe(true)
    for (const id of highSecondary) expect(visited.has(id)).toBe(false)
    // Nessuna esclusione dura: i compatibili restano nel mazzo, solo in coda.
    expect(highSecondary.size).toBe(3)
  })

  it('durante i ricicli d\'attesa lunghi i compatibili non prioritari compaiono, ma i prioritari restano prevalenti', () => {
    const selector = new BrainRendererSelector(
      ids, 'psycho2d', () => 0.5, () => false, () => false, () => 'respiro-alto',
    )
    const settings = { ...DEFAULT_SETTINGS, brainRendererMode: 'story-cycle' as const }
    selector.beginStory('alto-wait', settings)
    const counts = new Map<string, number>()
    for (let frame = 1; frame < 400; frame += 1) {
      selector.advanceWaitingRenderer(settings, frame * 100)
      const id = selector.resolve(settings, frame * 100)
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    const priorityTotal = [...highPriority].reduce((sum, id) => sum + (counts.get(id) ?? 0), 0)
    const secondaryTotal = [...highSecondary].reduce((sum, id) => sum + (counts.get(id) ?? 0), 0)
    expect(secondaryTotal).toBeGreaterThan(0) // compaiono
    expect(priorityTotal).toBeGreaterThan(secondaryTotal) // ma restano prevalenti
    expect(counts.has('print2d')).toBe(false) // Print2D non entra nel ciclo, invariato
  })
})

describe('RESPIRO PROFONDO — dominanza DELIQUESCENCE (Item 5)', () => {
  const ids = BRAIN_RENDERER_IDS

  function share(regime: 'respiro-profondo' | 'decompression'): Map<string, number> {
    // random() ~ uniforme: `advanceStoryRenderer` lo usa per shuffle/hold e
    // `applyLowRegimeDominance` per il dado di dominanza. Una sequenza pseudo
    // casuale deterministica basta a misurare la quota.
    let seed = 12345
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 0xffffffff
    }
    const selector = new BrainRendererSelector(
      ids, 'deliquescence', rnd, () => false, () => false, () => regime,
    )
    const settings = { ...DEFAULT_SETTINGS, brainRendererMode: 'story-cycle' as const }
    const counts = new Map<string, number>()
    for (let story = 0; story < 40; story += 1) {
      selector.beginStory(`dp-${regime}-${story}`, settings)
      counts.set(selector.resolve(settings, story * 1_000), (counts.get(selector.resolve(settings, story * 1_000)) ?? 0) + 1)
      for (let frame = 1; frame < 8; frame += 1) {
        selector.advanceStoryRenderer(`dp-${regime}-${story}`, settings, story * 1_000 + frame)
        const id = selector.resolve(settings, story * 1_000 + frame)
        counts.set(id, (counts.get(id) ?? 0) + 1)
      }
    }
    return counts
  }

  it('in respiro-profondo DELIQUESCENCE è circa il 95% della rotazione, gli altri restano visibili', () => {
    const counts = share('respiro-profondo')
    const total = [...counts.values()].reduce((a, b) => a + b, 0)
    const deliq = counts.get('deliquescence') ?? 0
    expect(deliq / total).toBeGreaterThan(0.92)
    expect(deliq / total).toBeLessThan(0.98)
    // gli altri non sono esclusi: almeno uno del pool basso compare.
    const others = ['vector-morph', 'material-morph', 'bauhaus-morph', 'dream-segmentation', 'filter-psiche', 'psicofantasma']
    expect(others.some((id) => (counts.get(id) ?? 0) > 0)).toBe(true)
    // nessun renderer fuori dal pool basso.
    for (const id of counts.keys()) {
      expect(['deliquescence', ...others]).toContain(id)
    }
  })

  it('in decompression (non protratta) DELIQUESCENCE non domina: quota vicina al pari peso del pool basso', () => {
    const counts = share('decompression')
    const total = [...counts.values()].reduce((a, b) => a + b, 0)
    const deliq = counts.get('deliquescence') ?? 0
    // eleggibile ma non dominante: ben sotto il 95%.
    expect(deliq / total).toBeLessThan(0.5)
  })

  it('DELIQUESCENCE è escluso dal Respiro Alto (dichiarato)', () => {
    const selector = new BrainRendererSelector(
      ids, 'filter-psiche', Math.random, () => false, () => false, () => 'respiro-alto',
    )
    const settings = { ...DEFAULT_SETTINGS, brainRendererMode: 'story-cycle' as const }
    const visited = new Set<string>()
    for (let story = 0; story < 15; story += 1) {
      selector.beginStory(`ra-${story}`, settings)
      visited.add(selector.resolve(settings, story * 1_000))
      for (let frame = 1; frame < 8; frame += 1) {
        selector.advanceStoryRenderer(`ra-${story}`, settings, story * 1_000 + frame)
        visited.add(selector.resolve(settings, story * 1_000 + frame))
      }
    }
    expect(visited.has('deliquescence')).toBe(false)
  })
})
