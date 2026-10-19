import { describe, expect, it, vi } from 'vitest'
import type { DreamStory } from '@shared/brain/brainTypes'
import type { ImageRenderMode, PsychedelImageGenerator } from './psychedelImageGenerator'
import {
  containsExplicitImageContent,
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
    invariant: 'una radice d’argento',
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

describe('Psichedel — semaforo prima del carico GPU', () => {
  it('attende la Promise di onImageGenerationState(true) prima di chiamare il generatore', async () => {
    const order: string[] = []
    const generator: PsychedelImageGenerator = {
      async generate() {
        order.push('generate')
        return { blob: new Blob(['raster']), durationMs: 5, model: 'fake-model' }
      },
      async release() {},
      destroy() {},
    }
    const psichedel = new Psichedel(
      generator,
      undefined,
      undefined,
      async (active) => {
        if (!active) return
        order.push('arm-start')
        await new Promise<void>((resolve) => setTimeout(resolve, 0))
        order.push('arm-end')
      },
    )

    await psichedel.generate(buildStory())

    expect(order).toEqual(['arm-start', 'arm-end', 'generate'])
  })
})

describe('Psichedel — riduzione sotto pressione reale', () => {
  it('usa il modo pianificato quando non c’è pressione', async () => {
    const generator = createRecordingGenerator()
    const psichedel = new Psichedel(generator)

    await psichedel.generate(buildStory(), Number.POSITIVE_INFINITY, undefined, () => false)

    // Storia di un solo fotogramma: `deriveOneiricPhase` lo tratta come eco
    // (fase finale), profilo 'enhanced'.
    expect(generator.modes).toEqual(['enhanced'])
  })

  it('declassa il modo quando il segnale di pressione reale è attivo', async () => {
    const generator = createRecordingGenerator()
    const psichedel = new Psichedel(generator)

    await psichedel.generate(buildStory(), Number.POSITIVE_INFINITY, undefined, () => true)

    expect(generator.modes).toEqual(['standard'])
  })
})

describe('Psichedel — blocco immagini esplicite d’emergenza', () => {
  it('blocca azioni esplicite senza ereditare i falsi positivi della protezione bambini', () => {
    expect(containsExplicitImageContent('Two consenting adults have sex on a bed.')).toBe(true)
    expect(containsExplicitImageContent('Her fingers rest on the piano keys.')).toBe(false)
    expect(containsExplicitImageContent('They share intimacy and pleasure.')).toBe(false)
    expect(containsExplicitImageContent('Two people cross a bridge at sunrise.')).toBe(false)
  })

  it('con il blocco acceso non chiama il generatore e consegna il fallback neutro', async () => {
    const story = buildStory()
    story.frames[0].imagePrompt = 'Two consenting adults have sex on a bed.'
    const generator = createRecordingGenerator()
    const generationState = vi.fn()

    const scenes = await new Psichedel(
      generator,
      undefined,
      undefined,
      generationState,
    ).generate(
      story,
      Number.POSITIVE_INFINITY,
      undefined,
      undefined,
      true,
      true,
    )

    expect(generator.modes).toEqual([])
    expect(generationState).not.toHaveBeenCalled()
    expect(scenes).toHaveLength(1)
    expect(scenes[0].raster).toBeUndefined()
    expect(scenes[0].svg).toContain('#050005')
  })

  it('con il blocco spento genera anche i prompt espliciti', async () => {
    const story = buildStory()
    story.frames[0].imagePrompt = 'Two consenting adults have sex on a bed.'
    const generator = createRecordingGenerator()

    await new Psichedel(generator).generate(story)

    expect(generator.modes).toEqual(['enhanced'])
  })

  it('con il blocco acceso continua a generare i prompt non espliciti', async () => {
    const generator = createRecordingGenerator()

    await new Psichedel(generator).generate(
      buildStory(),
      Number.POSITIVE_INFINITY,
      undefined,
      undefined,
      true,
      true,
    )

    expect(generator.modes).toEqual(['enhanced'])
  })
})
