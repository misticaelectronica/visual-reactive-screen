import { describe, expect, it } from 'vitest'
import type { BrainAiTask, DreamStory } from '@shared/brain/brainTypes'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import {
  analyzeNarrativeFormat,
  bridgeConnectsStories,
  CoscienzaOnirica,
  normalizeStory,
  parseNarrativeFormat,
  resemblesRecentStory,
} from './coscienzaOnirica'
import {
  buildPsychedelImagePrompt,
  HighQualityRenderScheduler,
  Psichedel,
} from './psichedel'
import { createBrainSvgScene } from './brainSvgScene'
import { inspectBrainVector, type PsychedelVectorizer } from './brainVectorQuality'
import type { PsychedelImageGenerator } from './psychedelImageGenerator'
import { interludePayload, selectBrainInterlude } from './brainInterlude'
import { sampleContinuityPhrase } from './brainPhrases'

const PHRASES = [
  'Una memoria terrestre viene interpretata da una mente non terrestre.',
  'La materia registra ogni tentativo fallito di comunicazione.',
  'Il contatto crea una terza entità che appartiene a entrambe.',
]

const DEFAULT_NARRATIVE = [
  'TITOLO: Il giardino di Elisa',
  'STORIA: Elisa custodisce una serra abbandonata ai margini della fabbrica, dove ogni foglia conserva una voce operaia. Una notte intercetta un segnale che fa germogliare metallo e radici insieme. Seguendolo incontra una creatura ferita, nascosta sotto le ciminiere. La paura le impedisce di avvicinarsi, finché la serra ripete un ricordo della creatura. Elisa risponde piantando un seme nella macchina spenta. All’alba, la fabbrica respira come un bosco e consegna a entrambe una memoria nuova.',
  'F1: La serra ascolta :: Elisa scopre foglie luminose nella serra industriale mentre le ciminiere spente riflettono segnali lontani :: Figura umana piccola, vegetazione dominante e fabbrica scura sullo sfondo :: 0.35',
  'F2: La creatura ferita :: Elisa trova una creatura aliena rannicchiata fra radici metalliche sotto una macchina arrugginita :: Due figure separate, macchina centrale e tensione fredda nello spazio vuoto :: 0.58',
  'F3: Il seme nella macchina :: Elisa supera la paura e inserisce un seme vivo nel cuore aperto della macchina :: Mani e seme al centro, umano e alieno collegati da un ponte luminoso :: 0.86',
  'F4: La fabbrica respira :: Alberi e ingranaggi crescono insieme mentre Elisa e la creatura osservano la nuova memoria condivisa :: Figure affiancate, bosco industriale espanso e atmosfera luminosa di rinascita :: 0.72',
].join('\n')

function defaultStory(): DreamStory {
  const parsed = parseNarrativeFormat(DEFAULT_NARRATIVE)
  const story = normalizeStory(parsed, PHRASES)
  if (!story) throw new Error('Fixture narrativa non valida')
  return story
}

describe('CoscienzaOnirica', () => {
  it('converte una storia narrativa completa in quattro fotogrammi', () => {
    const story = defaultStory()
    expect(story.title).toBe('Il giardino di Elisa')
    expect(story.synopsis).toContain('Elisa custodisce una serra')
    expect(story.frames).toHaveLength(4)
    expect(story.frames[2].energy).toBe(0.86)
  })

  it('legge anche i valori su righe successive come nelle risposte reali del modello', () => {
    const multiline = DEFAULT_NARRATIVE.split('\n')
      .flatMap((line) => {
        if (line.startsWith('STORIA: ')) return ['STORIA:', line.slice('STORIA: '.length)]
        const compactFrame = line.match(/^F(\d):\s*(.+)$/)
        if (!compactFrame) return [line]
        const frame = compactFrame[1]
        const parts = compactFrame[2].split(/\s+::\s+/)
        return [
          `F${frame}-TITOLO:`,
          parts[0],
          `F${frame}-DESCRIZIONE:`,
          parts[1],
          `F${frame}-VISIVO:`,
          parts[2],
          `F${frame}-ENERGIA:`,
          parts[3],
        ]
      })
      .join('\n')

    const story = normalizeStory(parseNarrativeFormat(multiline), PHRASES)
    expect(story?.title).toBe('Il giardino di Elisa')
    expect(story?.frames).toHaveLength(4)
    expect(story?.frames[3].energy).toBe(0.72)
  })

  it('accetta separatori senza spazi, titoli brevi ed energia con virgola decimale', () => {
    const compact = [
      ...DEFAULT_NARRATIVE.split('\n').slice(0, 2),
      'F1: Scoperta::Elisa scopre foglie luminose nella serra industriale mentre le ciminiere riflettono segnali::Figura umana piccola a sinistra, vegetazione grande al centro, fabbrica scura immobile a destra::0,35',
      'F2: Incontro::Elisa trova la creatura aliena ferita fra radici metalliche sotto una macchina arrugginita::Due figure lontane convergono, macchina centrale cresce, colori freddi attraversano lo spazio vuoto::0,58',
      'F3: Seme::Elisa inserisce un seme vivo nel cuore aperto della macchina mentre la creatura osserva::Mani e seme salgono al centro, umano e alieno si avvicinano, luce verde aumenta::0,86',
      'F4: Rinascita::Alberi e ingranaggi crescono insieme mentre Elisa e la creatura attraversano la memoria condivisa::Figure affiancate avanzano in basso, bosco industriale si espande, colori dorati illuminano lo sfondo::0,72',
    ].join('\n')

    const story = normalizeStory(parseNarrativeFormat(compact), PHRASES)
    expect(story?.frames.map((frame) => frame.title)).toEqual([
      'Scoperta',
      'Incontro',
      'Seme',
      'Rinascita',
    ])
    expect(story?.frames[0].energy).toBe(0.35)
  })

  it('accetta una riga compatta spezzata su più righe', () => {
    const wrappedFrames = DEFAULT_NARRATIVE.split('\n')
      .slice(2)
      .flatMap((line) => {
        const separator = line.indexOf(':')
        const label = line.slice(0, separator + 1)
        const parts = line.slice(separator + 1).trim().split(/\s+::\s+/)
        return [label, parts.join('\n::\n')]
      })
      .join('\n')
    const response = `${DEFAULT_NARRATIVE.split('\n').slice(0, 2).join('\n')}\n${wrappedFrames}`

    const story = normalizeStory(parseNarrativeFormat(response), PHRASES)
    expect(story?.frames).toHaveLength(4)
  })

  it('diagnostica esplicitamente un quarto fotogramma troncato', () => {
    const truncated = DEFAULT_NARRATIVE.split('\n').slice(0, -1).join('\n')
    const analysis = analyzeNarrativeFormat(truncated)

    expect(analysis.value).toBeNull()
    expect(analysis.issues).toContain(
      'F4 incompleto: attesi titolo, descrizione, visivo ed energia',
    )
  })

  it('rifiuta un formato narrativo senza tutti i fotogrammi', () => {
    const incomplete = DEFAULT_NARRATIVE.split('\n').slice(0, -1).join('\n')
    expect(parseNarrativeFormat(incomplete)).toBeNull()
  })

  it('rifiuta la semplice concatenazione delle frasi sorgente', () => {
    const valid = defaultStory()
    const concatenation = {
      title: 'Frasi concatenate',
      synopsis: `${PHRASES.join(' ')} ${PHRASES.join(' ')}`,
      frames: valid.frames,
    }
    expect(normalizeStory(concatenation, PHRASES)).toBeNull()
  })

  it('rifiuta quattro fotogrammi narrativi duplicati', () => {
    const valid = defaultStory()
    const duplicatedFrames = valid.frames.map((frame) => ({
      ...frame,
      description: valid.frames[0].description,
      visualIntent: valid.frames[0].visualIntent,
    }))
    expect(normalizeStory({ ...valid, frames: duplicatedFrames }, PHRASES)).toBeNull()
  })

  it('rifiuta fotogrammi quasi duplicati con variazioni cosmetiche', () => {
    const valid = defaultStory()
    const repeated = valid.frames.map((frame, index) => ({
      ...frame,
      description: `Elisa osserva il segnale nella serra mentre la macchina cambia lentamente forma numero ${index}`,
      visualIntent: `Figura umana al centro e segnale a destra mentre la luce viola cresce lentamente fase ${index}`,
    }))
    expect(normalizeStory({ ...valid, frames: repeated }, PHRASES)).toBeNull()
  })

  it('autocorregge una prima risposta con campi mancanti mantenendo le stesse frasi', async () => {
    const malformed = [
      'TITOLO: Bozza incompleta',
      'STORIA: Una bozza troppo corta che non sviluppa ancora una storia completa.',
      'F1: titolo :: descrizione insufficiente :: intenzione visiva :: energia 0.2',
    ].join('\n')
    const responses = [malformed, DEFAULT_NARRATIVE]
    const prompts: string[] = []
    const ai = {
      async generate(_task: BrainAiTask, prompt: string): Promise<string> {
        prompts.push(prompt)
        return responses.shift() ?? ''
      },
    }

    const story = await new CoscienzaOnirica(ai).generate(PHRASES)
    expect(story.title).toBe('Il giardino di Elisa')
    expect(prompts).toHaveLength(2)
    expect(prompts[0]).not.toContain('Il custode del segnale')
    expect(prompts[1]).toContain('Bozza incompleta')
    expect(prompts[1]).toContain('Keep its protagonist')
  })

  it('rifiuta e corregge un racconto che ripete la stessa frase narrativa', async () => {
    const repeated = [
      'TITOLO: La luce del sognatore',
      "STORIA: Un gruppo attraversa il bosco per cercare una presenza non umana e scopre un segnale sotto le radici. Il segnale si divide in frammenti che costruiscono un nuovo alfabeto. Il segnale si divide in frammenti che costruiscono un nuovo alfabeto. Il segnale si divide in frammenti che costruiscono un nuovo alfabeto.",
    ].join('\n')
    const validCore = DEFAULT_NARRATIVE.split('\n').slice(0, 2).join('\n')
    const responses = [repeated, validCore]
    let calls = 0
    const ai = {
      async generate(): Promise<string> {
        calls += 1
        return responses.shift() ?? ''
      },
    }

    const story = await new CoscienzaOnirica(ai).generate(PHRASES)

    expect(calls).toBe(2)
    expect(story.title).toBe('Il giardino di Elisa')
    expect(new Set(story.frames.map((frame) => frame.description)).size).toBe(4)
  })

  it('genera il racconto una sola volta e lo divide in quattro momenti cronologici', async () => {
    const storyCore = DEFAULT_NARRATIVE.split('\n').slice(0, 2).join('\n')
    const prompts: string[] = []
    const ai = {
      async generate(_task: BrainAiTask, prompt: string): Promise<string> {
        prompts.push(prompt)
        return storyCore
      },
    }

    const story = await new CoscienzaOnirica(ai).generate(PHRASES)

    expect(story.title).toBe('Il giardino di Elisa')
    expect(story.frames).toHaveLength(4)
    expect(new Set(story.frames.map((frame) => frame.description)).size).toBe(4)
    expect(story.palette).toHaveLength(5)
    expect(story.frames.map((frame) => frame.title)).toEqual([
      'Apertura',
      'Sviluppo',
      'Trasformazione',
      'Esito',
    ])
    expect(prompts).toHaveLength(1)
    expect(prompts[0]).toContain('exactly these three Italian-labelled fields')
    expect(prompts[0]).toContain('Work internally in English')
    expect(prompts[0]).toContain('COLORI:')
  })

  it('conserva i cinque colori narrativi proposti dalla AI', async () => {
    const storyCore = [
      ...DEFAULT_NARRATIVE.split('\n').slice(0, 2),
      'COLORI: #102030, #8a4f32, #e7d7ba, #39c58a, #7048cc',
    ].join('\n')
    const ai = {
      async generate(): Promise<string> {
        return storyCore
      },
    }

    const story = await new CoscienzaOnirica(ai).generate(PHRASES)

    expect(story.palette).toEqual([
      '#102030',
      '#8a4f32',
      '#e7d7ba',
      '#39c58a',
      '#7048cc',
    ])
  })

  it('accetta il racconto quando il modello omette soltanto l’etichetta STORIA', async () => {
    const unlabeled = [
      '<think></think>',
      '**TITOLO: "La luce del bosco"**',
      'Mara raggiunge una serra sepolta sotto la fabbrica e scopre una creatura che conserva il ricordo di un bosco scomparso. Il segnale della creatura risveglia le radici metalliche, ma Mara teme di perdere la propria memoria. Quando le macchine chiudono ogni uscita, lei affida alla creatura il ricordo della madre. La serra allora spezza il metallo, restituisce il bosco alla luce e unisce le loro memorie senza cancellarne l’identità.',
      'COLORI: #102030, #8a4f32, #e7d7ba, #39c58a, #7048cc',
    ].join('\n')
    const ai = {
      async generate(): Promise<string> {
        return unlabeled
      },
    }

    const story = await new CoscienzaOnirica(ai).generate(PHRASES)

    expect(story.title).toBe('La luce del bosco')
    expect(story.synopsis).toContain('Mara raggiunge una serra')
    expect(story.palette[0]).toBe('#102030')
  })

  it('non perde una storia valida se una vecchia risposta fotogrammi sarebbe duplicata', async () => {
    const validCore = [
      'TITOLO: Il segnale e il bosco',
      "STORIA: Nel bosco una custode raccoglie un segnale diviso in frammenti e scopre che ciascuno contiene una lettera sconosciuta. Seguendo il ritmo incontra una creatura ferita vicino alla fabbrica. La paura interrompe il contatto, ma il movimento dei due corpi costruisce lentamente un alfabeto comune. Quando le macchine invadono la radura, le due specie uniscono radici e metallo per proteggerla. All'alba il conflitto è terminato e il segnale sopravvive come un legame.",
    ].join('\n')
    const duplicatedFrames = [
      'F1: Il segnale e il bosco. Il segnale diventa un legame.',
      'F2: Il segnale e il bosco. Il segnale diventa un legame.',
      'F3: Il segnale e il bosco. Il segnale diventa un legame.',
      'F4: Il segnale e il bosco. Il segnale diventa un legame.',
    ].join('\n')
    const responses = [validCore, duplicatedFrames]
    const ai = {
      async generate(): Promise<string> {
        return responses.shift() ?? ''
      },
    }

    const story = await new CoscienzaOnirica(ai).generate(PHRASES)

    expect(story.title).toBe('Il segnale e il bosco')
    expect(story.frames).toHaveLength(4)
    expect(new Set(story.frames.map((frame) => frame.description)).size).toBe(4)
    expect(responses).toEqual([duplicatedFrames])
  })

  it('continua a rifiutare un racconto realmente incompleto dopo la correzione', async () => {
    const incompleteCore = 'TITOLO: Bozza\nSTORIA: Un racconto troppo corto.'
    const ai = {
      async generate(): Promise<string> {
        return incompleteCore
      },
    }

    await expect(new CoscienzaOnirica(ai).generate(PHRASES)).rejects.toThrow(
      'nucleo narrativo valido',
    )
  })

  it('riconosce una storia recente ripetuta anche quando cambia qualche parola', () => {
    const story = defaultStory()
    const repeated = {
      title: 'Un titolo differente',
      synopsis: story.synopsis.replace('serra abbandonata', 'vecchia serra'),
    }

    expect(resemblesRecentStory(repeated, [story])?.title).toBe(story.title)
  })

  it('passa al modello la memoria narrativa e rifiuta una storia già generata', async () => {
    const prompts: string[] = []
    const ai = {
      async generate(_task: BrainAiTask, prompt: string): Promise<string> {
        prompts.push(prompt)
        return DEFAULT_NARRATIVE
      },
    }
    const recent = defaultStory()

    await expect(new CoscienzaOnirica(ai).generate(PHRASES, [recent])).rejects.toThrow(
      'ha ripetuto la storia recente',
    )
    expect(prompts[0]).toContain(recent.title)
    expect(prompts[0]).not.toContain(recent.synopsis.slice(0, 100))
    expect(prompts[0]).toContain('One Italian input prompt comes directly')
  })

  it('accetta soltanto un legame che unisce concretamente le due storie', () => {
    const previous = defaultStory()
    const nextSynopsis =
      'Nora trova il seme espulso dalla fabbrica sulla riva di una laguna salata. Quando lo apre, il seme libera una voce che altera le maree e costringe il villaggio a lasciare le case. Nora comprende che la voce contiene una memoria incompleta. Affida allora il seme alla corrente, che trasforma il ricordo industriale in una nuova mappa per guidare gli abitanti verso una valle fertile.'

    expect(
      bridgeConnectsStories(
        'Il seme piantato nella fabbrica raggiunge Nora e diventa una mappa vivente.',
        previous,
        nextSynopsis,
      ),
    ).toBe(true)
    expect(
      bridgeConnectsStories(
        'Una coincidenza astratta avvia semplicemente un racconto completamente differente.',
        previous,
        nextSynopsis,
      ),
    ).toBe(false)
  })

  it('genera e conserva il collegamento causale con la storia precedente', async () => {
    const previous = defaultStory()
    const response = [
      'TITOLO: La mappa delle maree',
      'STORIA: Nora trova un frammento della fabbrica sulla riva di una laguna salata. Quando lo apre, il metallo libera una voce che altera le maree e costringe il villaggio a lasciare le case. Nora comprende che la voce custodisce una memoria incompleta. Affida allora il frammento alla corrente, che trasforma il ricordo della fabbrica in una mappa luminosa e guida gli abitanti verso una valle fertile dove le macchine possono finalmente riposare.',
      'LEGAME: La memoria della fabbrica di Elisa raggiunge Nora nel frammento e diventa una mappa.',
      'COLORI: #071820, #28536b, #d59b55, #79c7b7, #f1e7d0',
    ].join('\n')
    const ai = {
      async generate(): Promise<string> {
        return response
      },
    }

    const story = await new CoscienzaOnirica(ai).generate(PHRASES, [previous])

    expect(story.title).toBe('La mappa delle maree')
    expect(story.bridge).toContain('memoria della fabbrica')
    expect(story.frames).toHaveLength(4)
  })
})

describe('Psichedel', () => {
  function tracedSvg(): string {
    const colors = ['#14213d', '#fca311', '#e5e5e5', '#37ff8b', '#702963']
    const curves = Array.from({ length: 30 }, (_, index) => {
      const x = 30 + index * 14
      return `C${x} ${100 + index * 7} ${x + 18} ${350 - index * 5} ${x + 35} ${220 + index * 4}`
    }).join(' ')
    const paths = colors
      .map(
        (color, index) =>
          `<path fill="${color}" d="M${20 + index * 35} ${40 + index * 28} ${curves} L${700 - index * 20} ${650 - index * 18} Z"/>`,
      )
      .join('')
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">${paths}</svg>`
  }

  function imageGenerator(
    failCalls = new Set<number>(),
  ): PsychedelImageGenerator & { calls: string[]; releases: number } {
    const calls: string[] = []
    const generator = {
      calls,
      releases: 0,
      async generate(prompt: string) {
        calls.push(prompt)
        if (failCalls.has(calls.length)) throw new Error('inferenza raster fallita')
        return { blob: new Blob(['raster-ai'], { type: 'image/png' }), durationMs: 12 }
      },
      async release() {
        generator.releases += 1
      },
      destroy() {},
    }
    return generator
  }

  function vectorizer(): PsychedelVectorizer {
    const svg = tracedSvg()
    const quality = inspectBrainVector(svg)
    if (!quality.accepted) throw new Error(quality.issues.join(', '))
    return {
      async vectorize() {
        return { svg, quality, durationMs: 8 }
      },
    }
  }

  it('programma un render high-quality ogni intervallo casuale fra due e cinque immagini', () => {
    const everyTwo = new HighQualityRenderScheduler(() => 0)
    expect([
      everyTwo.next(),
      everyTwo.next(),
      everyTwo.next(),
      everyTwo.next(),
    ]).toEqual(['standard', 'high-quality', 'standard', 'high-quality'])

    const everyFive = new HighQualityRenderScheduler(() => 0.999)
    expect(Array.from({ length: 5 }, () => everyFive.next())).toEqual([
      'standard',
      'standard',
      'standard',
      'standard',
      'high-quality',
    ])
  })

  it('costruisce un prompt artistico dal racconto, non un vocabolario di sagome', () => {
    const story = defaultStory()
    const prompt = buildPsychedelImagePrompt(story, story.frames[1])
    expect(prompt).toContain(story.frames[1].description)
    expect(prompt).not.toContain(story.synopsis)
    expect(prompt.indexOf('ARCHITECTURE ABSENT')).toBeLessThan(prompt.indexOf('Scene:'))
    expect(prompt.length).toBeLessThan(700)
    expect(prompt).toContain('Psychedelic cinematic realism')
    expect(prompt).toContain(story.palette.join(', '))
    expect(prompt).toContain(story.frames[1].visualIntent)
    expect(prompt).toContain('Avoid clip-art')
    expect(prompt).toContain('No houses, buildings, city, village')
    expect(prompt).not.toContain('kind: human')
  })

  it('ammette architettura soltanto quando è esplicitamente il soggetto del fotogramma', () => {
    const story = defaultStory()
    const architecturalFrame = {
      ...story.frames[0],
      description: 'Elisa osserva una facciata vivente che reagisce al segnale.',
      visualIntent: 'La facciata è il soggetto centrale, isolata nel vuoto.',
    }
    const prompt = buildPsychedelImagePrompt(story, architecturalFrame)

    expect(prompt).toContain('Architecture is explicitly central')
    expect(prompt).not.toContain('ARCHITECTURE ABSENT')
    expect(prompt).toContain('never generic housing')
  })

  it('accetta una vettorializzazione ricca e rifiuta una figura naïf', () => {
    const rich = inspectBrainVector(tracedSvg())
    const naive = inspectBrainVector(
      '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="30" fill="#00ff00"/></svg>',
    )
    expect(rich.accepted).toBe(true)
    expect(rich.pathCount).toBe(5)
    expect(rich.colorCount).toBe(5)
    expect(naive.accepted).toBe(false)
    expect(naive.issues).toContain('meno di cinque forme riconoscibili')
  })

  it('genera quattro raster AI e li converte in quattro SVG verificati', async () => {
    const story = defaultStory()
    const generator = imageGenerator()
    const captions: string[] = []
    const scenes = await new Psichedel(
      generator,
      vectorizer(),
      (preview) => captions.push(preview.dreamMeaning),
    ).generate(story)
    expect(generator.calls).toHaveLength(4)
    expect(scenes.map((scene) => scene.frameId)).toEqual(story.frames.map((frame) => frame.id))
    expect(scenes.every((scene) => scene.svg.includes('<svg'))).toBe(true)
    expect(new Set(generator.calls).size).toBe(4)
    expect(generator.releases).toBe(1)
    expect(captions).toEqual(story.frames.map((frame) => frame.description))
  })

  it('usa un seed diverso per ogni fotogramma della stessa storia', async () => {
    const story = defaultStory()
    const seeds: number[] = []
    const generator: PsychedelImageGenerator = {
      async generate(_prompt, seed) {
        seeds.push(seed)
        return { blob: new Blob(['raster-ai'], { type: 'image/png' }), durationMs: 2 }
      },
      async release() {},
      destroy() {},
    }

    await new Psichedel(
      generator,
      vectorizer(),
      undefined,
      new HighQualityRenderScheduler(() => 0.999),
    ).generate(story)

    expect(seeds).toHaveLength(4)
    expect(new Set(seeds).size).toBe(4)
  })

  it('dopo un errore di memoria HQ non ritenta Janus nelle immagini successive', async () => {
    const story = defaultStory()
    const modes: Array<string | undefined> = []
    const generator: PsychedelImageGenerator = {
      async generate(_prompt, _seed, mode) {
        modes.push(mode)
        if (mode === 'high-quality') throw new Error('std::bad_alloc')
        return { blob: new Blob(['raster-ai'], { type: 'image/png' }), durationMs: 12 }
      },
      async release() {},
      destroy() {},
    }
    const scheduler = new HighQualityRenderScheduler(() => 0)
    const scenes = await new Psichedel(
      generator,
      vectorizer(),
      undefined,
      scheduler,
    ).generate(story)

    expect(scenes).toHaveLength(4)
    expect(modes.filter((mode) => mode === 'high-quality')).toHaveLength(1)
    expect(modes).toEqual([
      'standard',
      'high-quality',
      'enhanced',
      'standard',
      'enhanced',
    ])
  })

  it('non ripete l’inferenza quando fallisce il backend WebGPU', async () => {
    const story = defaultStory()
    let calls = 0
    let releases = 0
    const generator: PsychedelImageGenerator = {
      async generate() {
        calls += 1
        throw new Error('no available backend found: WebAssembly wasm asset missing')
      },
      async release() {
        releases += 1
      },
      destroy() {},
    }

    await expect(new Psichedel(generator, vectorizer()).generate(story)).rejects.toThrow(
      'backend',
    )
    expect(calls).toBe(1)
    expect(releases).toBe(1)
  })

  it('monta le forme SVG direttamente nel livello visibile senza filtro vettoriale', () => {
    const story = defaultStory()
    const scenes = [{ frameId: story.frames[0].id, description: 'test', svg: tracedSvg() }]
    const host = document.createElement('div')
    document.body.appendChild(host)

    const controller = createBrainSvgScene(host, scenes[0])
    controller.setOpacity(1)
    controller.update(
      { low: 0.8, lowMid: 0.5, mid: 0.6, high: 0.4 },
      DEFAULT_SETTINGS,
      1_000,
    )
    const firstAnimatedFill = controller.element.querySelector('path')?.getAttribute('fill')
    controller.update(
      { low: 0.8, lowMid: 0.5, mid: 0.6, high: 0.4 },
      DEFAULT_SETTINGS,
      2_000,
    )
    const secondAnimatedFill = controller.element.querySelector('path')?.getAttribute('fill')

    expect(controller.element.isConnected).toBe(true)
    expect(controller.element.style.opacity).toBe('1')
    expect(controller.element.style.transform).toBe('')
    expect(controller.element.style.filter).toBe('')
    expect(firstAnimatedFill).not.toBe(secondAnimatedFill)
    expect(controller.element.querySelectorAll('path').length).toBe(5)
    expect(controller.element.querySelector('filter')).toBeNull()

    controller.destroy()
    host.remove()
  })

  it('anima con la palette narrativa anche le forme SVG che non sono path', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const palette: DreamStory['palette'] = [
      '#081426',
      '#245c42',
      '#b45b36',
      '#e7bd52',
      '#f4ead2',
    ]
    const controller = createBrainSvgScene(
      host,
      {
        frameId: 'frame-color',
        description: 'colore contestuale',
        svg: '<svg viewBox="0 0 512 512"><circle cx="256" cy="256" r="180" fill="#808080"/><ellipse cx="180" cy="200" rx="80" ry="120" fill="#303030"/></svg>',
      },
      palette,
      { frameEnergy: 0.9, frameIndex: 2, frameCount: 4 },
    )
    controller.update(
      { low: 0.7, lowMid: 0.5, mid: 0.4, high: 0.2 },
      DEFAULT_SETTINGS,
      1_000,
    )
    const first = controller.element.querySelector('circle')?.getAttribute('fill')
    controller.update(
      { low: 0.7, lowMid: 0.5, mid: 0.4, high: 0.2 },
      DEFAULT_SETTINGS,
      3_000,
    )
    const second = controller.element.querySelector('circle')?.getAttribute('fill')

    expect(first).toMatch(/^rgb\(/)
    expect(second).toMatch(/^rgb\(/)
    expect(second).not.toBe(first)

    controller.destroy()
    host.remove()
  })

  it('non ricuce i sottotracciati separati creando grandi poligoni durante il morphing', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const compoundPath =
      'M20 20 C30 10 60 10 70 20 C60 40 30 40 20 20 Z M400 400 C420 380 470 390 480 420 C450 450 410 440 400 400 Z'
    const controller = createBrainSvgScene(host, {
      frameId: 'compound',
      description: 'due forme separate',
      svg: `<svg viewBox="0 0 512 512"><path fill="#778899" d="${compoundPath}"/></svg>`,
    })
    const path = controller.element.querySelector('path')

    controller.update(
      { low: 1, lowMid: 0.8, mid: 0.6, high: 0.4 },
      DEFAULT_SETTINGS,
      2_000,
    )

    expect(path?.getAttribute('d')).toBe(compoundPath)
    controller.destroy()
    host.remove()
  })

  it('mantiene vuoto il centro degli anelli mentre anima il colore del bordo', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const controller = createBrainSvgScene(
      host,
      {
        frameId: 'ring',
        description: 'anello di giunzione',
        svg: '<svg viewBox="0 0 512 512"><path d="M256 60 C365 60 452 147 452 256 C452 365 365 452 256 452 C147 452 60 365 60 256 C60 147 147 60 256 60 Z" fill="none" stroke="#39c58a" stroke-width="18"/></svg>',
      },
      ['#071810', '#174d34', '#39c58a', '#d39b42', '#f1e6c8'],
    )
    const ring = controller.element.querySelector('path')

    controller.update(
      { low: 0.8, lowMid: 0.6, mid: 0.4, high: 0.2 },
      DEFAULT_SETTINGS,
      2_000,
    )

    expect(ring?.getAttribute('fill')).toBe('none')
    expect(ring?.getAttribute('stroke')).toMatch(/^rgb\(/)
    controller.destroy()
    host.remove()
  })
})

describe('Brain pipeline end-to-end', () => {
  it('trasforma una storia di default in quattro immagini vettoriali', async () => {
    const calls: BrainAiTask[] = []
    const ai = {
      async generate(task: BrainAiTask): Promise<string> {
        calls.push(task)
        return DEFAULT_NARRATIVE
      },
    }
    const story = await new CoscienzaOnirica(ai).generate(PHRASES)
    const rasterCalls: string[] = []
    const generator: PsychedelImageGenerator = {
      async generate(prompt) {
        rasterCalls.push(prompt)
        return { blob: new Blob(['real-raster']), durationMs: 20 }
      },
      async release() {},
      destroy() {},
    }
    const svg = Array.from({ length: 5 }, (_, index) => {
      const color = ['#112233', '#445566', '#778899', '#aabbcc', '#ddeeff'][index]
      const segments = Array.from(
        { length: 18 },
        (_, segment) => `C${segment * 9} 10 ${segment * 9 + 3} 70 ${segment * 9 + 8} 30`,
      ).join(' ')
      return `<path fill="${color}" d="M0 ${index * 10} ${segments} Z"/>`
    }).join('')
    const markup = `<svg viewBox="0 0 512 512">${svg}</svg>`
    const quality = inspectBrainVector(markup)
    const vectors: PsychedelVectorizer = {
      async vectorize() {
        return { svg: markup, quality, durationMs: 10 }
      },
    }
    const scenes = await new Psichedel(generator, vectors).generate(story)

    expect(calls.every((task) => task === 'story')).toBe(true)
    expect(story.title).toBe('Il giardino di Elisa')
    expect(rasterCalls).toHaveLength(4)
    expect(scenes.map((scene) => scene.frameId)).toEqual(story.frames.map((frame) => frame.id))
    expect(scenes.every((scene) => scene.svg.includes('<svg'))).toBe(true)
  })

  it('conserva i fotogrammi validi quando un fotogramma successivo fallisce', async () => {
    const story = defaultStory()
    let calls = 0
    let failureEnabled = true
    const seeds: number[] = []
    const generator: PsychedelImageGenerator = {
      async generate(_prompt, seed) {
        calls += 1
        seeds.push(seed)
        if (failureEnabled && (calls === 2 || calls === 3)) throw new Error('raster non valido')
        return { blob: new Blob(['raster']), durationMs: 1 }
      },
      async release() {},
      destroy() {},
    }
    const svg = Array.from({ length: 5 }, (_, index) => {
      const commands = Array.from({ length: 20 }, (_, x) => `L${x * 8} ${x * 5}`).join(' ')
      return `<path fill="${['#123456', '#abcdef', '#fedcba'][index % 3]}" d="M0 0 ${commands} Z"/>`
    }).join('')
    const markup = `<svg viewBox="0 0 500 500">${svg}</svg>`
    const quality = inspectBrainVector(markup)
    const vectorizer: PsychedelVectorizer = {
      async vectorize() {
        return { svg: markup, quality, durationMs: 1 }
      },
    }
    const psychedel = new Psichedel(generator, vectorizer)

    await expect(psychedel.generate(story)).rejects.toThrow('fotogramma 2')
    failureEnabled = false
    const scenes = await psychedel.generate(story)

    expect(calls).toBe(6)
    expect(seeds[3]).not.toBe(seeds[1])
    expect(scenes).toHaveLength(4)
  })
})

describe('Brain interstory morphing', () => {
  it('riusa la rotazione morphing del programma senza ripetere lo stesso preset', () => {
    const first = selectBrainInterlude(null, () => 0)
    const second = selectBrainInterlude(first, () => 0)

    expect(first.algorithm).toBe('liquid')
    expect(first.presetId.length).toBeGreaterThan(0)
    expect(second.presetId.length).toBeGreaterThan(0)
    expect(`${second.algorithm}:${second.presetId}`).not.toBe(
      `${first.algorithm}:${first.presetId}`,
    )
  })

  it('attiva il renderer scelto senza modificare permanentemente le impostazioni Brain', () => {
    const payload = {
      backgroundColor: '#000000',
      brightness: 0,
      flashActive: false,
      flashIntensity: 0,
      flashMode: 'off' as const,
      whiteMix: 0,
      useMorphing: false,
      bandEnergies: { low: 0, lowMid: 0, mid: 0, high: 0 },
      settings: DEFAULT_SETTINGS,
    }
    const transformed = interludePayload(payload, {
      algorithm: '2001',
      presetId: 'parallel-slit',
    })

    expect(transformed.settings?.useBrain).toBe(false)
    expect(transformed.settings?.morphingAlgorithm).toBe('2001')
    expect(transformed.settings?.morphingPresetId).toBe('parallel-slit')
    expect(payload.settings.useBrain).toBe(DEFAULT_SETTINGS.useBrain)
  })
})

describe('Brain narrative continuity', () => {
  it('estrae una frase reale della storia precedente come terzo spunto', () => {
    const previous =
      'La custode apre il portale sotto la fabbrica. Il seme registra il rumore delle macchine. All’alba il bosco restituisce il segnale.'

    expect(sampleContinuityPhrase(previous, () => 0)).toBe(
      'La custode apre il portale sotto la fabbrica.',
    )
    expect(sampleContinuityPhrase(previous, () => 0.999)).toBe(
      'All’alba il bosco restituisce il segnale.',
    )
  })
})
