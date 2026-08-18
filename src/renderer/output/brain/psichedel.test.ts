import { describe, expect, it } from 'vitest'
import type { DreamStory } from '@shared/brain/brainTypes'
import type { ImageRenderMode, PsychedelImageGenerator } from './psychedelImageGenerator'
import {
  HighQualityRenderScheduler,
  Psichedel,
  downgradeModeUnderPressure,
} from './psichedel'

function buildStory(): DreamStory {
  return {
    id: 'story-1',
    title: 'Storia di prova',
    synopsis: 'Sinossi di prova',
    bridge: null,
    continuityPhrase: null,
    palette: ['#000000', '#111111', '#222222', '#333333', '#444444'],
    sourcePhrases: ['una frase di prova'],
    frames: [
      {
        id: 'frame-1',
        title: 'Apertura',
        description: 'Descrizione di prova',
        visualIntent: 'intento di prova',
        energy: 0.5,
        durationMs: 14_000,
      },
    ],
  }
}

function createRecordingGenerator(): PsychedelImageGenerator & { modes: ImageRenderMode[] } {
  const modes: ImageRenderMode[] = []
  return {
    modes,
    async generate(_prompt, _seed, mode = 'standard') {
      modes.push(mode)
      return { blob: new Blob(['raster']), durationMs: 5, model: 'fake-model' }
    },
    async release() {},
    destroy() {},
  }
}

describe('downgradeModeUnderPressure', () => {
  it('scala di un livello verso il modo più leggero disponibile', () => {
    expect(downgradeModeUnderPressure('high-quality')).toBe('standard')
    expect(downgradeModeUnderPressure('enhanced')).toBe('standard')
    expect(downgradeModeUnderPressure('standard')).toBe('interlude')
    expect(downgradeModeUnderPressure('interlude')).toBe('interlude')
  })
})

describe('Psichedel — riduzione sotto pressione reale', () => {
  it('usa il modo pianificato quando non c’è pressione', async () => {
    const generator = createRecordingGenerator()
    const psichedel = new Psichedel(
      generator,
      undefined,
      undefined,
      new HighQualityRenderScheduler(() => 0.99),
    )

    await psichedel.generate(buildStory(), Number.POSITIVE_INFINITY, undefined, () => false)

    expect(generator.modes).toEqual(['standard'])
  })

  it('declassa il modo quando il segnale di pressione reale è attivo', async () => {
    const generator = createRecordingGenerator()
    const psichedel = new Psichedel(
      generator,
      undefined,
      undefined,
      new HighQualityRenderScheduler(() => 0.99),
    )

    await psichedel.generate(buildStory(), Number.POSITIVE_INFINITY, undefined, () => true)

    expect(generator.modes).toEqual(['interlude'])
  })
})
