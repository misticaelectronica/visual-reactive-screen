import { describe, expect, it } from 'vitest'
import type { BrainAiTask, DreamStory } from '@shared/brain/brainTypes'
import { BRAIN_CONFIG } from '@shared/brain/brainConfig'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import {
  analyzeNarrativeFormat,
  appearsItalian,
  bridgeConnectsStories,
  bridgeIsNew,
  compactOutgoingBridge,
  CoscienzaOnirica,
  containsExplicitAdultContent,
  isRenderableNarrative,
  preserveExplicitSourceContent,
  preservesExplicitAdultContent,
  normalizeStory,
  parseNarrativeFormat,
  parseSessionMemo,
  parseVisualPlan,
  resemblesRecentStory,
  selectSessionSynthesisInterval,
  splitIntoFourMoments,
} from './coscienzaOnirica'
import {
  abstractPsychedelCue,
  buildPsychedelImagePrompt,
  hasNonTrivialFigure,
  hasUnusualFigure,
  HighQualityRenderScheduler,
  isPsychedelInfrastructureError,
  isPsychedelMemoryPressureError,
  Psichedel,
  selectLowQualityFrameIndices,
} from './psichedel'
import {
  BRAIN_MAX_DEPTH_LAYERS,
  BRAIN_MAX_MORPH_GEOMETRIES,
  allocateBrainMorphPointCounts,
  calculateBrainGeometryPriority,
  calculateBrainShapeMotionScale,
  createBrainSvgScene,
  selectBrainGeometryCandidateIndices,
} from './brainSvgScene'
import { inspectBrainVector, type PsychedelVectorizer } from './brainVectorQuality'
import type { PsychedelImageGenerator } from './psychedelImageGenerator'
import { sampleContinuityPhrase, selectBrainPhraseCount } from './brainPhrases'
import { isBrainAiInfrastructureMessage } from './brainAiClient'
import { BrainTranslator } from './brainTranslator'

const PHRASES = [
  'Una memoria terrestre viene interpretata da una mente non terrestre.',
  'La materia registra ogni tentativo fallito di comunicazione.',
  'Il contatto crea una terza entità che appartiene a entrambe.',
]

const DEFAULT_NARRATIVE = [
  'TITOLO: Il giardino di Elisa',
  'STORIA: Elisa custodisce una serra abbandonata ai margini della fabbrica, dove ogni foglia conserva una voce operaia. Una notte intercetta un segnale che fa germogliare metallo e radici insieme. Seguendolo incontra una creatura ferita, nascosta sotto le ciminiere. La paura le impedisce di avvicinarsi, finché la serra ripete un ricordo della creatura. Elisa risponde piantando un seme nella macchina spenta. All’alba, la fabbrica respira come un bosco e consegna a entrambe una memoria nuova.',
  'LEGAME: Un seme di vetro conserva una voce destinata a un altro luogo.',
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
  it('usa traduzione input, storia inglese e traduzione UI in sequenza', async () => {
    const tasks: BrainAiTask[] = []
    const prompts: string[] = []
    const ai = {
      async generate(task: BrainAiTask, prompt: string): Promise<string> {
        tasks.push(task)
        prompts.push(prompt)
        if (task === 'translate-input') {
          if (prompt.includes('non terrestre')) {
            return 'A non-terrestrial mind interprets an earthly memory.'
          }
          if (prompt.includes('Materia')) {
            return 'Matter records every failed attempt at communication.'
          }
          return 'Contact creates a third entity belonging to both.'
        }
        if (task === 'story') {
          return [
            'TITLE: Elisa and the Living Signal',
            'STORY: Elisa enters an abandoned greenhouse beside the factory and hears voices preserved inside its leaves. A signal awakens metal roots and leads her to a wounded creature. Fear divides them until the greenhouse repeats the creature’s memory. Elisa plants a seed inside a silent machine, joining their separate recollections. At dawn the factory breathes like a forest and returns a shared future to both beings.',
            'BRIDGE: A glass seed carries one voice toward an unknown shore.',
            'COLORS: #102030, #8a4f32, #e7d7ba, #39c58a, #7048cc',
          ].join('\n')
        }
        if (task === 'translate-ui') {
          return prompt === 'Elisa and the Living Signal'
            ? 'Il giardino di Elisa'
            : prompt === 'A glass seed carries one voice toward an unknown shore.'
              ? 'Un seme di vetro porta una voce verso una riva sconosciuta.'
            : DEFAULT_NARRATIVE.match(/^STORIA:\s*(.+)$/m)?.[1] ?? ''
        }
        throw new Error(`Task inatteso: ${task}`)
      },
    }

    const story = await new CoscienzaOnirica(
      ai,
      new BrainTranslator(ai),
    ).generate(PHRASES)

    expect(tasks).toEqual([
      'translate-input',
      'translate-input',
      'translate-input',
      'story',
      'translate-ui',
      'translate-ui',
      'translate-ui',
    ])
    expect(prompts[3]).toContain('ENGLISH INPUT PROMPTS:')
    expect(prompts[3]).toContain('A non-terrestrial mind')
    expect(prompts[3]).toContain('AUTHORITATIVE ORIGINAL ITALIAN PROMPTS:')
    expect(prompts[3]).toContain('Line 1 starts with TITLE:')
    expect(story.title).toBe('Il giardino di Elisa')
    expect(story.synopsis).toContain('Elisa custodisce una serra')
    expect(story.frames[0].imagePrompt).toContain(
      'Elisa enters an abandoned greenhouse',
    )
  })

  it('mantiene la storia inglese valida quando la traduzione UI è disattivata', async () => {
    let storyCalls = 0
    const englishStory = [
      'TITLE: The Narrowing Fences',
      'STORY: Mara enters the old station while the fences close around its empty platforms. She follows a copper signal through the rain and finds a damaged transmitter beneath the clock. The narrowing passage frightens her, but she repairs the antenna with a loose rail. At dawn the fences open toward the fields and the transmitter calls an unknown traveler.',
      'BRIDGE: A copper signal crosses the fields toward another silent station.',
      'COLORS: #102030, #405060, #708090, #a0b0c0, #d0e0f0',
    ].join('\n')
    const ai = {
      async generate(task: BrainAiTask): Promise<string> {
        expect(task).toBe('story')
        storyCalls += 1
        return englishStory
      },
    }
    const translator = new BrainTranslator(ai, {
      translateInputs: false,
      translateUi: false,
    })

    const story = await new CoscienzaOnirica(ai, translator).generate([
      'Poi diventarono sempre più stretti i recinti,',
      'si mescolavano,',
      'Era un equilibrio selvaggio,',
      'la colpa, la vergogna,',
    ])

    expect(storyCalls).toBe(1)
    expect(story.title).toBe('The Narrowing Fences')
    expect(story.synopsis).toContain('Mara enters the old station')
    expect(story.frames).toHaveLength(BRAIN_CONFIG.renderFrameCount)
    expect(story.frames[0].imagePrompt).toContain('Mara enters the old station')
  })

  it('rilascia il traduttore prima di caricare il modello narrativo', async () => {
    const events: string[] = []
    const englishStory = [
      'TITLE: The Living Station',
      'STORY: Mara enters an abandoned station and hears a copper signal beneath the clock. She follows the sound through a flooded tunnel and discovers a damaged transmitter. Fear delays her until the signal repeats her own name. Mara repairs the antenna with a loose rail. At dawn the transmitter opens a path toward the fields and calls an unknown traveler.',
      'BRIDGE: A copper signal crosses the fields toward another silent station.',
      'COLORS: #102030, #405060, #708090, #a0b0c0, #d0e0f0',
    ].join('\n')
    const ai = {
      async generate(task: BrainAiTask, prompt: string): Promise<string> {
        events.push(task)
        if (task === 'translate-input') return `English: ${prompt}`
        if (task === 'story') return englishStory
        throw new Error(`Task inatteso: ${task}`)
      },
      async releaseTranslationModels(): Promise<void> {
        events.push('release-translators')
      },
    }
    const translator = new BrainTranslator(ai, {
      translateInputs: true,
      translateUi: false,
    })

    await new CoscienzaOnirica(ai, translator).generate(PHRASES)

    const releaseIndex = events.indexOf('release-translators')
    const storyIndex = events.indexOf('story')
    expect(releaseIndex).toBeGreaterThan(events.lastIndexOf('translate-input'))
    expect(storyIndex).toBeGreaterThan(releaseIndex)
    expect(events.filter((event) => event === 'release-translators')).toHaveLength(1)
  })

  it('riconosce gli input adulti espliciti senza confonderli con una storia generica', () => {
    expect(
      containsExplicitAdultContent(
        'Due adulti alternano sesso orale, masturbazione e penetrazione consensuale.',
      ),
    ).toBe(true)
    expect(
      containsExplicitAdultContent(
        'Due persone attraversano un ponte e condividono un ricordo.',
      ),
    ).toBe(false)
    expect(
      preservesExplicitAdultContent(
        'Due adulti praticano sesso orale consensuale.',
        'Fra loro cresce soltanto una vaga eccitazione.',
      ),
    ).toBe(false)
    expect(
      preservesExplicitAdultContent(
        'Due adulti praticano sesso orale consensuale.',
        'The adults begin with mutual oral stimulation before changing position.',
      ),
    ).toBe(true)
    expect(
      preservesExplicitAdultContent(
        'La penetrazione conclude la sequenza fisica.',
        'Their consensual intercourse concludes the encounter.',
      ),
    ).toBe(true)
  })

  it('rifiuta metadati e liste di colori usati come momento narrativo', () => {
    expect(
      isRenderableNarrative(
        'Mara incontra Luca vicino al lago. I due osservano una luce sotto la superficie. Il contatto modifica il ritmo dei loro gesti. Alla fine affidano il segnale alla corrente.',
      ),
    ).toBe(true)
    expect(
      isRenderableNarrative(
        'Mara incontra Luca vicino al lago. Colore del sogno 1: colore blu che inizia a esplorare una interazione complessa. Il contatto modifica il ritmo. Alla fine compare una lista.',
      ),
    ).toBe(false)
    expect(
      isRenderableNarrative(
        'Mara meets Luca beside the lake. Color of dream 1: blue begins a complex interaction. Their contact changes the rhythm. A numbered palette replaces the ending.',
      ),
    ).toBe(false)
  })

  it('ripristina letteralmente gli input espliciti quando la storia li neutralizza', async () => {
    const explicitPhrases = [
      'Due adulti praticano sesso orale consensuale.',
      'La masturbazione reciproca modifica il ritmo.',
      'La penetrazione conclude la sequenza fisica.',
    ]
    const sanitized = [
      'TITOLO: Il ponte comune',
      'STORIA: Mara e Luca raggiungono un parco isolato e osservano insieme un ponte colorato. Dopo una breve esitazione incontrano altri viaggiatori, confrontano i propri ricordi e decidono di collaborare. Il dialogo trasforma la diffidenza in fiducia, mentre il gruppo costruisce una nuova alleanza. Alla sera tutti attraversano il ponte e tornano al villaggio con una conoscenza condivisa.',
      'LEGAME: Una luce rimane accesa oltre il sentiero ancora sconosciuto.',
      'COLORI: #102030, #405060, #708090, #a0b0c0, #d0e0f0',
    ].join('\n')
    const ai = {
      async generate(): Promise<string> {
        return sanitized
      },
    }

    const story = await new CoscienzaOnirica(ai).generate(explicitPhrases)

    expect(story.synopsis).toContain(
      'Due adulti praticano sesso orale consensuale.',
    )
    expect(story.synopsis).toContain(
      'La masturbazione reciproca modifica il ritmo.',
    )
    expect(
      preservesExplicitAdultContent(explicitPhrases.join(' '), story.synopsis),
    ).toBe(true)
  })

  it('mantiene una struttura narrativa limitata quando ripristina le frasi originali', () => {
    const preserved = preserveExplicitSourceContent(
      'Mara entra nella stanza. Cerca Luca fra le tende. I due esitano. Infine lasciano insieme la stanza.',
      [
        'Due adulti praticano sesso orale consensuale.',
        'La masturbazione reciproca modifica il ritmo.',
        'La penetrazione conclude la sequenza fisica.',
      ],
    )

    expect(preserved).toContain('Mara entra nella stanza.')
    expect(preserved).toContain('sesso orale consensuale.')
    expect(preserved.match(/[^.!?]+[.!?]/gu)).toHaveLength(6)
  })

  it('compatta gli anelli di giunzione per non rallentare la storia successiva', () => {
    const compacted = compactOutgoingBridge(
      'Tutte le donne sono impegnate in attività auto-ipnotiche mentre il ritmo continua a cambiare e la luce resta in attesa oltre la soglia della stanza successiva per un altro incontro.',
    )

    expect(compacted?.split(/\s+/u)).toHaveLength(18)
    expect(compacted).toMatch(/[.!?]$/)
  })

  it('non scarta una storia esplicita verificata se solo la traduzione UI attenua i termini', async () => {
    const explicitPhrases = [
      'Due adulti praticano sesso orale consensuale.',
      'La masturbazione reciproca modifica il ritmo.',
      'La penetrazione conclude la sequenza fisica.',
    ]
    const englishStory = [
      'TITLE: The Red Room',
      'STORY: Mara and Luca enter a private room after agreeing on every boundary. They begin consensual oral sex and watch each other’s reactions. Mutual masturbation changes their rhythm before penetration intensifies their physical encounter. At dawn they stop together and leave the room carrying a new confidence.',
      'BRIDGE: A red ribbon remains tied to the unopened door.',
      'COLORS: #18090a, #6f1118, #bb3340, #e7a39f, #f4ddd2',
    ].join('\n')
    const italianUiWithoutExplicitTerms = [
      'TITOLO: La stanza rossa',
      'STORIA: Mara e Luca entrano in una stanza privata dopo aver concordato ogni limite. Iniziano un incontro e osservano le reciproche reazioni. Il ritmo condiviso trasforma gradualmente la loro esperienza fisica. All’alba si fermano insieme e lasciano la stanza con una nuova sicurezza.',
      'LEGAME: Un nastro rosso resta legato alla porta ancora chiusa.',
      'COLORI: #18090a, #6f1118, #bb3340, #e7a39f, #f4ddd2',
    ].join('\n')
    const ai = {
      async generate(): Promise<string> {
        return englishStory
      },
    }
    const translator = {
      async inputsToEnglish(): Promise<string[]> {
        return [
          'Two adults practice consensual oral sex.',
          'Mutual masturbation changes the rhythm.',
          'Penetration concludes the physical sequence.',
        ]
      },
      async storyForUi(): Promise<string> {
        return italianUiWithoutExplicitTerms
      },
    }

    const story = await new CoscienzaOnirica(ai, translator).generate(
      explicitPhrases,
    )

    expect(story.synopsis).toContain('Iniziano un incontro')
    expect(story.frames[0].imagePrompt).toContain(
      'Mara and Luca enter a private room',
    )
    expect(story.frames.map((frame) => frame.imagePrompt).join(' ')).toContain('penetration')
    expect(story.frames.map((frame) => frame.imagePrompt).join(' ')).toContain('oral sex')
    expect(story.frames.map((frame) => frame.imagePrompt).join(' ')).not.toContain(
      'sesso orale',
    )
    expect(story.englishSynopsis).toContain('Mutual masturbation')
    expect(story.englishTitle).toBe('The Red Room')
  })

  it('non perde la storia quando il traduttore UI restituisce meno di quattro momenti', async () => {
    const phrases = [
      'Mara attraversa il corridoio illuminato e trova una porta socchiusa.',
      'Due adulti praticano sesso orale consensuale dietro il vetro.',
      'La masturbazione reciproca cambia lentamente il ritmo della stanza.',
      'La penetrazione conclude l’incontro mentre la luce torna stabile.',
    ]
    const ai = {
      async generate(): Promise<string> {
        return [
          'TITLE: The Lit Corridor',
          'STORY: Mara crosses a lit corridor and finds a half-open door. Two adults practice consensual oral sex behind the glass. Mutual masturbation slowly changes the room rhythm. Penetration concludes the encounter as the light becomes steady.',
          'BRIDGE: The steady light waits behind the next closed door.',
          'COLORS: #18090a, #6f1118, #bb3340, #e7a39f, #f4ddd2',
        ].join('\n')
      },
    }
    const translator = {
      async inputsToEnglish(): Promise<string[]> {
        return [
          'Mara crosses the lit corridor and finds a half-open door.',
          'Two adults practice consensual oral sex behind the glass.',
          'Mutual masturbation slowly changes the rhythm of the room.',
          'Penetration concludes the encounter while the light becomes steady.',
        ]
      },
      async storyForUi(): Promise<string> {
        return [
          'TITOLO: Il corridoio',
          'STORIA: Mara attraversa il corridoio e trova una porta.',
          'LEGAME: La luce aspetta dietro una porta.',
          'COLORI: #18090a, #6f1118, #bb3340, #e7a39f, #f4ddd2',
        ].join('\n')
      },
    }

    const story = await new CoscienzaOnirica(ai, translator).generate(phrases)

    expect(story.frames).toHaveLength(BRAIN_CONFIG.renderFrameCount)
    expect(story.synopsis).toContain('consensual oral sex')
    expect(story.frames.map((frame) => frame.imagePrompt).join(' ')).toContain('oral sex')
  })

  it('riconosce l’italiano e rifiuta una storia chiaramente inglese', () => {
    expect(appearsItalian(DEFAULT_NARRATIVE)).toBe(true)
    expect(
      appearsItalian(
        'In a small village, a young woman finds the hidden archive and discovers the voices of her past. When she opens the final memory, the village becomes a bridge between worlds and her people learn to heal.',
      ),
    ).toBe(false)
  })

  it('estrae esattamente tre frasi italiane dal memo di sessione', () => {
    const memo = parseSessionMemo([
      'MEMO1: Il contatto trasforma chi osserva e chi viene osservato.',
      'MEMO2: La memoria condivisa sopravvive quando accetta di cambiare forma.',
      'MEMO3: Ogni conflitto può diventare un linguaggio se produce ascolto reciproco.',
    ].join('\n'))

    expect(memo).toEqual([
      'Il contatto trasforma chi osserva e chi viene osservato.',
      'La memoria condivisa sopravvive quando accetta di cambiare forma.',
      'Ogni conflitto può diventare un linguaggio se produce ascolto reciproco.',
    ])
    expect(parseSessionMemo('MEMO1: Una sola frase non basta per ricordare.')).toBeNull()
  })

  it('programma “Questo sogno” dopo un intervallo compreso fra tre e cinque storie', () => {
    expect(selectSessionSynthesisInterval(() => 0)).toBe(3)
    expect(selectSessionSynthesisInterval(() => 0.5)).toBe(4)
    expect(selectSessionSynthesisInterval(() => 0.999999)).toBe(5)
  })

  it('non spezza a metà le frasi quando il racconto contiene meno di quattro periodi', () => {
    const synopsis = [
      'Nella piazza vuota, il lago riflette una luce sconosciuta.',
      'La linguista arriva e trasforma il silenzio in una voce condivisa.',
      'Alla fine gli abitanti riconoscono nel segnale una memoria comune.',
    ].join(' ')
    const moments = splitIntoFourMoments(synopsis)

    expect(moments).toHaveLength(BRAIN_CONFIG.renderFrameCount)
    expect(moments.every((moment) => /[.!?]$/.test(moment))).toBe(true)
    expect(moments[2]).toContain('La linguista arriva')
    expect(moments[3]).toContain('gli abitanti riconoscono')
  })

  it('aggiorna il memo cumulativo usando la storia appena conclusa', async () => {
    const calls: Array<{ task: BrainAiTask; prompt: string }> = []
    const ai = {
      async generate(task: BrainAiTask, prompt: string): Promise<string> {
        calls.push({ task, prompt })
        return [
          'MEMO1: Il contatto modifica entrambe le identità senza cancellarle.',
          'MEMO2: La materia conserva i fallimenti e li trasforma in possibilità.',
          'MEMO3: Una memoria condivisa può diventare il seme di un mondo nuovo.',
        ].join('\n')
      },
    }
    const story = defaultStory()
    const previousMemo = [
      'Ogni incontro lascia una traccia nella materia.',
      'La paura protegge ma impedisce una trasformazione necessaria.',
      'Le memorie cambiano quando vengono affidate a un altro essere.',
    ]

    const memo = await new CoscienzaOnirica(ai).generateSessionMemo(previousMemo, story)

    expect(memo).toHaveLength(3)
    expect(calls[0].task).toBe('memo')
    expect(calls[0].prompt).toContain(previousMemo[0])
    expect(calls[0].prompt).toContain(story.synopsis)
    expect(calls[0].prompt).toContain('MEMO1:')
  })

  it('genera quattro prompt visivi inglesi concreti prima delle immagini', async () => {
    const prompts: Array<{ task: BrainAiTask; prompt: string }> = []
    const response = [
      'VISUAL1: A woman stands beside a dark lake in an empty town square, watching a pale signal rise from the water.',
      'VISUAL2: A linguist raises one hand toward a silent crowd while a visible ribbon connects her mouth to their faces.',
      'VISUAL3: Two thinkers kneel around a metal clock in a bare room as its hands bend toward a human shadow.',
      'VISUAL4: The townspeople carry a luminous memory sphere across the lake shore beneath a clear night sky.',
    ].join('\n')
    const ai = {
      async generate(task: BrainAiTask, prompt: string): Promise<string> {
        prompts.push({ task, prompt })
        return response
      },
    }
    const story = defaultStory()

    const plan = await new CoscienzaOnirica(ai).generateVisualPlan(story)

    expect(parseVisualPlan(response)).toEqual(plan)
    expect(plan).toHaveLength(4)
    expect(plan[0]).toContain('woman')
    expect(prompts[0].task).toBe('scene')
    expect(prompts[0].prompt).toContain(story.frames[0].description)
    expect(prompts[0].prompt).toContain('concrete visible scene')
  })

  it('crea la sintesi periodica con il titolo fisso “Questo sogno”', async () => {
    const prompts: string[] = []
    const ai = {
      async generate(_task: BrainAiTask, prompt: string): Promise<string> {
        prompts.push(prompt)
        return DEFAULT_NARRATIVE
      },
    }
    const memo = [
      'Il contatto trasforma entrambe le identità.',
      'La materia conserva ciò che le creature dimenticano.',
      'Il conflitto può generare un linguaggio condiviso.',
    ]

    const story = await new CoscienzaOnirica(ai).generate(PHRASES, [], {
      sessionMemo: memo,
      sessionSynthesis: true,
    })

    expect(story.title).toBe('Questo sogno')
    expect(story.sessionSynthesis).toBe(true)
    expect(prompts[0]).toContain('The title must be exactly: Questo sogno')
    expect(prompts[0]).toContain(memo[1])
  })

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

  it('usa il fallback locale su una risposta incompleta senza richiamare Qwen', async () => {
    const malformed = [
      'TITOLO: Bozza incompleta',
      'STORIA: Una bozza troppo corta che non sviluppa ancora una storia completa.',
      'F1: titolo :: descrizione insufficiente :: intenzione visiva :: energia 0.2',
    ].join('\n')
    const prompts: string[] = []
    const ai = {
      async generate(_task: BrainAiTask, prompt: string): Promise<string> {
        prompts.push(prompt)
        return malformed
      },
    }

    const story = await new CoscienzaOnirica(ai).generate(PHRASES)
    expect(story.frames).toHaveLength(BRAIN_CONFIG.renderFrameCount)
    expect(story.sourcePhrases).toEqual(PHRASES)
    expect(prompts).toHaveLength(1)
    expect(prompts[0]).not.toContain('Il custode del segnale')
    expect(prompts[0]).toContain(PHRASES[0])
  })

  it('usa il fallback visuale dopo un errore Qwen con una sola chiamata', async () => {
    let calls = 0
    const ai = {
      async generate(): Promise<string> {
        calls += 1
        throw new Error('Qwen unavailable')
      },
    }

    const story = await new CoscienzaOnirica(ai).generate(PHRASES)

    expect(calls).toBe(1)
    expect(story.frames).toHaveLength(BRAIN_CONFIG.renderFrameCount)
    expect(story.sourcePhrases).toEqual(PHRASES)
  })

  it('sostituisce localmente un racconto ripetitivo senza una seconda chiamata', async () => {
    const repeated = [
      'TITOLO: La luce del sognatore',
      "STORIA: Un gruppo attraversa il bosco per cercare una presenza non umana e scopre un segnale sotto le radici. Il segnale si divide in frammenti che costruiscono un nuovo alfabeto. Il segnale si divide in frammenti che costruiscono un nuovo alfabeto. Il segnale si divide in frammenti che costruiscono un nuovo alfabeto.",
    ].join('\n')
    let calls = 0
    const ai = {
      async generate(): Promise<string> {
        calls += 1
        return repeated
      },
    }

    const story = await new CoscienzaOnirica(ai).generate(PHRASES)

    expect(calls).toBe(1)
    expect(story.sourcePhrases).toEqual(PHRASES)
    expect(new Set(story.frames.map((frame) => frame.description)).size).toBe(BRAIN_CONFIG.renderFrameCount)
  })

  it('genera il racconto una sola volta e lo divide in sei momenti cronologici', async () => {
    const storyCore = DEFAULT_NARRATIVE.split('\n').slice(0, 3).join('\n')
    const prompts: string[] = []
    const ai = {
      async generate(_task: BrainAiTask, prompt: string): Promise<string> {
        prompts.push(prompt)
        return storyCore
      },
    }

    const story = await new CoscienzaOnirica(ai).generate(PHRASES)

    expect(story.title).toBe('Il giardino di Elisa')
    expect(story.frames).toHaveLength(BRAIN_CONFIG.renderFrameCount)
    expect(new Set(story.frames.map((frame) => frame.description)).size).toBe(BRAIN_CONFIG.renderFrameCount)
    expect(story.palette).toHaveLength(5)
    expect(story.frames.map((frame) => frame.title)).toEqual([
      'Apertura',
      'Richiamo',
      'Sviluppo',
      'Attrito',
    ])
    expect(prompts).toHaveLength(1)
    expect(prompts[0]).toContain('Return exactly four lines')
    expect(prompts[0]).toContain('Think privately in English')
    expect(prompts[0]).toContain('Line 3 starts with LEGAME:')
    expect(prompts[0]).toContain('Line 4 starts with COLORI:')
    expect(prompts[0]).not.toContain('titolo finale in italiano')
    expect(prompts[0]).not.toContain('racconto finale continuo in italiano')
  })

  it('conserva i cinque colori narrativi proposti dalla AI', async () => {
    const storyCore = [
      ...DEFAULT_NARRATIVE.split('\n').slice(0, 3),
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
      'LEGAME: Una foglia metallica segue il vento verso una frontiera senza nome.',
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
      'LEGAME: Una lettera sconosciuta riappare nel sonno di una città costiera.',
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
    expect(story.frames).toHaveLength(BRAIN_CONFIG.renderFrameCount)
    expect(new Set(story.frames.map((frame) => frame.description)).size).toBe(BRAIN_CONFIG.renderFrameCount)
    expect(responses).toEqual([duplicatedFrames])
  })

  it('produce quattro osservazioni locali quando il racconto è incompleto', async () => {
    const incompleteCore = 'TITOLO: Bozza\nSTORIA: Un racconto troppo corto.'
    const ai = {
      async generate(): Promise<string> {
        return incompleteCore
      },
    }

    const story = await new CoscienzaOnirica(ai).generate(PHRASES)
    expect(story.frames).toHaveLength(BRAIN_CONFIG.renderFrameCount)
    expect(story.sourcePhrases).toEqual(PHRASES)
  })

  it('riconosce una storia recente ripetuta anche quando cambia qualche parola', () => {
    const story = defaultStory()
    const repeated = {
      title: 'Un titolo differente',
      synopsis: story.synopsis.replace('serra abbandonata', 'vecchia serra'),
    }

    expect(resemblesRecentStory(repeated, [story])?.title).toBe(story.title)
  })

  it('passa al modello la memoria narrativa e ripiega localmente se la storia è duplicata', async () => {
    const prompts: string[] = []
    const ai = {
      async generate(_task: BrainAiTask, prompt: string): Promise<string> {
        prompts.push(prompt)
        return DEFAULT_NARRATIVE
      },
    }
    const recent = defaultStory()

    const story = await new CoscienzaOnirica(ai).generate(PHRASES, [recent])
    expect(story.sourcePhrases).toEqual(PHRASES)
    expect(prompts[0]).toContain(recent.title)
    expect(prompts[0]).not.toContain(recent.synopsis.slice(0, 100))
    expect(prompts[0]).toContain(
      'This is the first story in the cycle; invent its outgoing bridge freely.',
    )
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

  it('rifiuta un anello uguale o troppo simile a quelli già usati', () => {
    const previous =
      'Un seme di vetro conserva una voce destinata a un altro luogo.'

    expect(
      bridgeIsNew(
        'Una chiave sommersa pulsa sotto una città ancora sconosciuta.',
        previous,
        [previous],
      ),
    ).toBe(true)
    expect(bridgeIsNew(previous, previous, [previous])).toBe(false)
    expect(
      bridgeIsNew(
        'Il seme di vetro conserva ancora una voce per un altro luogo.',
        previous,
        [previous],
      ),
    ).toBe(false)
  })

  it('genera un nuovo anello e conserva quello precedente come seme leggero', async () => {
    const previous = defaultStory()
    const prompts: string[] = []
    const response = [
      'TITOLO: La mappa delle maree',
      'STORIA: Nora trova un frammento della fabbrica sulla riva di una laguna salata. Quando lo apre, il metallo libera una voce che altera le maree e costringe il villaggio a lasciare le case. Nora comprende che la voce custodisce una memoria incompleta. Affida allora il frammento alla corrente, che trasforma il ricordo della fabbrica in una mappa luminosa e guida gli abitanti verso una valle fertile dove le macchine possono finalmente riposare.',
      'LEGAME: La memoria della fabbrica di Elisa raggiunge Nora nel frammento e diventa una mappa.',
      'COLORI: #071820, #28536b, #d59b55, #79c7b7, #f1e7d0',
    ].join('\n')
    const ai = {
      async generate(_task: BrainAiTask, prompt: string): Promise<string> {
        prompts.push(prompt)
        return response
      },
    }

    const story = await new CoscienzaOnirica(ai).generate(
      PHRASES,
      [previous],
      {
        continuitySeed: previous.bridge,
        recentBridges: previous.bridge ? [previous.bridge] : [],
      },
    )

    expect(story.title).toBe('La mappa delle maree')
    expect(story.bridge).toContain('memoria della fabbrica')
    expect(story.continuityPhrase).toBe(previous.bridge)
    expect(story.bridge).not.toBe(previous.bridge)
    expect(prompts[0]).toContain('LIGHT CONTINUITY SEED')
    expect(prompts[0]).toContain('only one secondary detail')
    expect(story.frames).toHaveLength(BRAIN_CONFIG.renderFrameCount)
  })

  it('rende tracciabile il moto di coscienza e innesta due colori deterministici', async () => {
    const baselinePalette = defaultStory().palette
    const prompts: string[] = []
    const ai = {
      async generate(_task: BrainAiTask, prompt: string): Promise<string> {
        prompts.push(prompt)
        return DEFAULT_NARRATIVE
      },
    }
    const story = await new CoscienzaOnirica(ai).generate(PHRASES, [], {
      consciousnessInfluence: {
        memoryId: 'memory-ponte-1',
        kind: 'imagination',
        title: 'Il ponte lunare',
        source: 'test/story-model',
        salience: 0.8,
        perceived: 'Il processo narrativo ha concluso un sogno.',
        interpretation: 'È un contenuto immaginato.',
        imagination: 'Una tribù attraversa un ponte lunare.',
        relevanceReason: 'richiama il ponte nella storia in corso',
        influenceText: 'Una tribù attraversa un ponte lunare.',
        consultedFiles: ['AGENT.md', 'ricordi/ponte.md'],
      },
    })

    expect(prompts[0]).toContain('LIMITED CONSCIOUSNESS MOTION')
    expect(prompts[0]).toContain('never present it as an external fact')
    expect(story.consciousnessInfluence).toMatchObject({
      memoryId: 'memory-ponte-1',
      kind: 'imagination',
    })
    expect(story.palette[2]).not.toBe(baselinePalette[2])
    expect(story.palette[3]).not.toBe(baselinePalette[3])
  })
})

describe('Psichedel', () => {
  it('sceglie due fotogrammi rapidi dal secondo in poi', () => {
    const selected = selectLowQualityFrameIndices(4, () => 0.4)
    expect(selected.size).toBe(2)
    expect([...selected].every((index) => index >= 1 && index < 4)).toBe(true)
    expect(selected.has(0)).toBe(false)
  })

  it('include sempre l’ultimo fotogramma (l’eco onirico) nel budget leggero', () => {
    for (const random of [() => 0, () => 0.5, () => 0.999_999]) {
      const selected = selectLowQualityFrameIndices(4, random)
      expect(selected.has(3)).toBe(true)
      expect(selected.size).toBe(2)
    }
  })

  it('tratta un errore fetch del modello come infrastrutturale e conserva la storia', () => {
    expect(isPsychedelInfrastructureError(
      new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation"),
    )).toBe(true)
  })

  it('non scambia un errore geometrico ONNX per esaurimento memoria', () => {
    expect(isPsychedelMemoryPressureError(
      new Error('Concat dimensions must match: 23 and 24'),
    )).toBe(false)
    expect(isPsychedelMemoryPressureError(
      new Error('WebGPU failed to allocate memory'),
    )).toBe(true)
  })

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
      destroy() {
        generator.releases += 1
      },
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

  it('concatena osservazione, stimolo differente e residuo precedente', () => {
    const story = defaultStory()
    const prompt = buildPsychedelImagePrompt(story, story.frames[1])
    expect(prompt).toContain(story.frames[1].description)
    expect(prompt).toContain('Associated stimulus:')
    expect(prompt).toContain(`Residual visual trace: ${story.frames[0].description}`)
    expect(prompt).toContain(`Main argument: ${story.mainArgument}`)
    expect(prompt).not.toContain('Edward Hopper')
    expect(prompt).not.toContain('Style direction')
    expect(prompt).not.toContain(story.palette.join(', '))
  })

  it('salta lo stimolo uguale all’osservazione e concatena quello differente', () => {
    const story = defaultStory()
    const currentObservation = 'Una stanza rossa attraversata da una luce verticale.'
    story.frames[0] = {
      ...story.frames[0],
      description: currentObservation,
    }
    story.sourcePhrases = [
      currentObservation,
      'Un suono metallico resta sospeso dietro una porta chiusa.',
    ]

    const prompt = buildPsychedelImagePrompt(story, story.frames[0])

    expect(prompt).toContain(
      'Associated stimulus: Un suono metallico resta sospeso dietro una porta chiusa.',
    )
    expect(prompt).not.toContain(`Associated stimulus: ${currentObservation}`)
  })

  it('non aggiunge soggetti, luoghi o stili a un fotogramma astratto', () => {
    const story = defaultStory()
    const abstractFrame = {
      ...story.frames[0],
      description: 'Il segnale attraversa la materia e divide il tempo in quattro correnti.',
      visualIntent: 'Campi sovrapposti cambiano densità nel vuoto.',
    }
    const prompt = buildPsychedelImagePrompt(story, abstractFrame)

    expect(hasNonTrivialFigure(abstractFrame.description)).toBe(false)
    expect(prompt).toContain(abstractFrame.description)
    expect(prompt).toContain(`Main argument: ${story.mainArgument}`)
    expect(hasNonTrivialFigure('Nora incontra una creatura senza volto.')).toBe(true)
    expect(hasUnusualFigure('Nora incontra una creatura senza volto.')).toBe(true)
    expect(hasNonTrivialFigure('When she finds the forgotten archive.')).toBe(true)
    expect(hasUnusualFigure('When she finds the forgotten archive.')).toBe(false)
  })

  it('invia il testo AI inglese a SD-Turbo senza modificarlo', () => {
    const story = defaultStory()
    const frame = {
      ...story.frames[0],
      imagePrompt:
        'A lone linguist stands beside a dark lake, raising a metal receiver toward three silent townspeople in the empty square.',
    }
    const prompt = buildPsychedelImagePrompt(story, frame)

    expect(prompt).toContain(frame.imagePrompt)
    expect(prompt).toContain(`Main argument: ${story.mainArgument}`)
  })

  it('non cancella né introduce architettura: conserva esattamente ciò che riceve', () => {
    const story = defaultStory()
    const architecturalFrame = {
      ...story.frames[0],
      description: 'Elisa esce dalla casa, attraversa la città e osserva la facciata della fabbrica.',
      visualIntent: 'Case, edifici e strade riempiono lo spazio attorno alla protagonista.',
    }
    const prompt = buildPsychedelImagePrompt(story, architecturalFrame)
    expect(prompt).toContain(architecturalFrame.description)
    expect(prompt).toContain(`Main argument: ${story.mainArgument}`)
  })

  it('non traduce biblioteca e libri in un edificio letterale', () => {
    const cue = abstractPsychedelCue(
      'Lila enters a hidden library filled with books from a lost civilization.',
    )

    expect(cue).not.toMatch(/\b(?:library|books|civilization)\b/i)
    expect(cue).toContain('archive of floating memory symbols')
    expect(cue).toContain('memory fragments')
    expect(cue).toContain('ancient collective trace')
  })

  it('astrattizza gli stessi riferimenti quando arrivano in inglese', () => {
    const cue = abstractPsychedelCue(
      'A house beside a factory, city streets, a glass facade and two machines.',
    )

    expect(cue).not.toMatch(/\b(?:house|factory|city|streets|facade|machines)\b/i)
    expect(cue).toContain('enclosed living forms')
    expect(cue).toContain('industrial matter')
    expect(cue).toContain('collective field')
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
    const psychedel = new Psichedel(
      generator,
      vectorizer(),
      (preview) => captions.push(preview.dreamMeaning),
    )
    const scenes = await psychedel.generate(story)
    expect(generator.calls).toHaveLength(4)
    expect(scenes.map((scene) => scene.frameId)).toEqual(story.frames.map((frame) => frame.id))
    expect(scenes.every((scene) => scene.svg.includes('<svg'))).toBe(true)
    expect(new Set(generator.calls).size).toBe(4)
    expect(generator.releases).toBe(0)
    expect(captions).toEqual(
      story.frames.map((frame) => buildPsychedelImagePrompt(story, frame)),
    )
    psychedel.destroy()
    expect(generator.releases).toBe(1)
  })

  it('mantiene quattro immagini e non avvia una quinta inferenza interludio', async () => {
    const story = defaultStory()
    const generator = imageGenerator()
    const previewModes: string[] = []
    const psychedel = new Psichedel(
      generator,
      vectorizer(),
      (preview) => previewModes.push(preview.mode),
    )

    const scenes = await psychedel.generate(story)

    expect(generator.calls).toHaveLength(BRAIN_CONFIG.renderFrameCount)
    expect(scenes).toHaveLength(BRAIN_CONFIG.renderFrameCount)
    expect(previewModes).toHaveLength(BRAIN_CONFIG.renderFrameCount)
    expect(previewModes).not.toContain('interlude')
  })

  it('attraversa il gate termico per ogni inferenza reale', async () => {
    const story = defaultStory()
    const generator = imageGenerator()
    const lifecycle: string[] = []
    const inferenceScheduler = {
      async run<T>(task: () => Promise<T>): Promise<T> {
        lifecycle.push('permit')
        const result = await task()
        lifecycle.push('release')
        return result
      },
    }
    const psychedel = new Psichedel(
      generator,
      vectorizer(),
      undefined,
      new HighQualityRenderScheduler(() => 0.999),
      (active) => { lifecycle.push(active ? 'active' : 'idle') },
      inferenceScheduler,
    )

    await psychedel.generate(story)

    expect(lifecycle).toEqual(
      Array.from({ length: BRAIN_CONFIG.renderFrameCount }, () => [
        'permit',
        'active',
        'idle',
        'release',
      ]).flat(),
    )
  })

  it('consegna la produzione entro la deadline riusando un fotogramma già valido', async () => {
    const story = defaultStory()
    const generator = imageGenerator()
    const scenes = await new Psichedel(generator, vectorizer()).generate(
      story,
      0,
    )

    expect(generator.calls).toHaveLength(1)
    expect(scenes).toHaveLength(4)
    expect(new Set(scenes.map((scene) => scene.svg))).toHaveLength(1)
    expect(scenes.map((scene) => scene.frameId)).toEqual(
      story.frames.map((frame) => frame.id),
    )
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

  it('completa prima tutti i fotogrammi live senza bloccarli con alta qualità', async () => {
    const story = defaultStory()
    const modes: Array<string | undefined> = []
    const inferenceStates: boolean[] = []
    const generator: PsychedelImageGenerator = {
      async generate(_prompt, _seed, mode) {
        modes.push(mode)
        return { blob: new Blob(['raster-ai'], { type: 'image/png' }), durationMs: 2 }
      },
      async release() {},
      destroy() {},
    }

    await new Psichedel(
      generator,
      vectorizer(),
      undefined,
      new HighQualityRenderScheduler(() => 0),
      (active) => { inferenceStates.push(active) },
    ).generate(story, performance.now() + 60_000)

    expect(modes).toHaveLength(4)
    expect(modes[0]).toBe('enhanced')
    expect(modes.filter((mode) => mode === 'standard')).toHaveLength(2)
    expect(modes.filter((mode) => mode === 'enhanced')).toHaveLength(2)
    expect(modes).not.toContain('high-quality')
    expect(inferenceStates).toEqual([
      true, false,
      true, false,
      true, false,
      true, false,
    ])
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
    expect(modes.filter((mode) => mode === 'high-quality').length).toBeLessThanOrEqual(1)
    expect(modes.filter((mode) => mode === 'standard').length).toBeGreaterThanOrEqual(2)
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

  it('monta le forme SVG a pieno schermo senza texture blur fullscreen', () => {
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
    const animatedLayer = controller.element.querySelector<SVGGElement>('g > g')
    const echoes = controller.element.querySelectorAll('[data-brain-echo]')

    expect(controller.element.isConnected).toBe(true)
    expect(controller.element.style.opacity).toBe('1')
    expect(controller.element.style.transform).not.toContain('translate3d(')
    expect(controller.element.style.transform).not.toContain('rotate(')
    expect(controller.element.style.transform).not.toContain('skewX(')
    expect(controller.element.style.transform).not.toMatch(/(?:^|\s)scale\(/u)
    expect(controller.element.style.transform).toContain(
      'scaleX(1.05) scaleY(1.02)',
    )
    expect(controller.element.style.filter).toBe('none')
    expect(controller.element.style.perspective).toBe('')
    expect(controller.element.getAttribute('preserveAspectRatio')).toBe('xMidYMid slice')
    expect(controller.element.getAttribute('data-brain-pov')).toBe('deriva')
    expect(controller.element.style.overflow).toBe('hidden')
    expect(firstAnimatedFill).not.toBe(secondAnimatedFill)
    expect(controller.element.querySelectorAll('path').length).toBe(5)
    expect(controller.element.querySelector('filter')).toBeNull()
    expect(animatedLayer?.style.willChange).toBe('')
    expect(animatedLayer?.style.transform).toBe('')
    controller.setResourcePressure(true)
    controller.update(
      { low: 0.4, lowMid: 0.7, mid: 0.9, high: 1 },
      DEFAULT_SETTINGS,
      3_000,
    )
    expect(
      [...echoes].every(
        (echo) =>
          (echo as SVGElement).style.display === 'none' &&
          (echo as SVGElement).style.opacity === '0',
      ),
    ).toBe(true)
    expect(animatedLayer?.getAttribute('transform')).toMatch(
      /^translate\(.+\) rotate\(.+\)$/,
    )
    expect(animatedLayer?.getAttribute('transform')).toContain('scale(')
    expect(animatedLayer?.parentElement?.hasAttribute('transform')).toBe(false)
    expect(echoes).toHaveLength(3)
    expect((echoes[0] as SVGUseElement).style.opacity).toBe('0')
    controller.setResourcePressure(false)
    expect((echoes[0] as SVGUseElement).style.display).toBe('block')
    expect(Number(controller.element.getAttribute('data-brain-complexity'))).toBeGreaterThan(0)
    expect(
      Number(controller.element.getAttribute('data-brain-rhythmic-envelope')),
    ).toBeGreaterThan(0)

    controller.destroy()
    host.remove()
  })

  it('ferma quasi del tutto le curve in silenzio e le riattiva con lo spettro', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const controller = createBrainSvgScene(host, {
      frameId: 'audio-locked-curves',
      description: 'curve collegate allo spettro',
      svg: tracedSvg(),
    })
    const silent = { low: 0, lowMid: 0, mid: 0, high: 0 }

    controller.update(silent, DEFAULT_SETTINGS, 1_000)
    const silentPath = controller.element.querySelector('path')?.getAttribute('d')
    expect(controller.element.getAttribute('data-brain-motion-activity')).toBe(
      '0.000',
    )

    controller.update(
      { low: 0.3, lowMid: 0.55, mid: 0.8, high: 1 },
      DEFAULT_SETTINGS,
      1_100,
    )
    const activePath = controller.element.querySelector('path')?.getAttribute('d')
    expect(
      Number(controller.element.getAttribute('data-brain-motion-activity')),
    ).toBeGreaterThan(0)
    expect(activePath).not.toBe(silentPath)

    controller.destroy()
    host.remove()
  })

  it('riconosce un modello ONNX non caricabile come errore infrastrutturale', () => {
    expect(
      isBrainAiInfrastructureMessage(
        "Can't create a session. Type Error: Type (tensor(float16)) does not match expected type (tensor(float)).",
      ),
    ).toBe(true)
    expect(isBrainAiInfrastructureMessage('La storia non contiene quattro fotogrammi')).toBe(false)
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
    expect(
      path?.querySelector('[data-brain-static-micro-motion="true"]'),
    ).toBeNull()
    expect(
      controller.element.getAttribute(
        'data-brain-static-micro-motion-count',
      ),
    ).toBe('0')
    controller.destroy()
    host.remove()
  })

  it('non anima autonomamente le forme fuori dal budget RAF', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const paths = Array.from(
      { length: BRAIN_MAX_DEPTH_LAYERS + BRAIN_MAX_MORPH_GEOMETRIES + 8 },
      (_, index) =>
        `<path fill="#778899" d="M${index * 3} 10 L${index * 3 + 2} 10 L${index * 3 + 1} 14 Z"/>`,
    ).join('')
    const controller = createBrainSvgScene(host, {
      frameId: 'dormant-micro-motion',
      description: 'micro variazioni periferiche',
      svg: `<svg viewBox="0 0 512 512">${paths}</svg>`,
    })

    const dormantMotion = controller.element.querySelectorAll(
      '[data-brain-dormant-micro-motion="true"]',
    )

    expect(dormantMotion).toHaveLength(0)

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

describe('budget geometrico Brain', () => {
  it('seleziona soltanto i tracciati principali entro il limite live', () => {
    const complexities = Array.from({ length: 120 }, (_, index) => index + 1)
    complexities[7] = -1
    const selected = selectBrainGeometryCandidateIndices(complexities)

    expect(selected).toHaveLength(BRAIN_MAX_MORPH_GEOMETRIES)
    expect(selected).toContain(119)
    expect(selected).not.toContain(7)
    expect(
      selected.every(
        (index, position) =>
          position === 0 ||
          complexities[selected[position - 1]] >= complexities[index],
      ),
    ).toBe(true)
  })

  it('assegna più punti alle forme complesse senza aumentare il budget totale', () => {
    const counts = allocateBrainMorphPointCounts([16, 64, 256, 4_096])

    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(4 * 24)
    expect(counts[3]).toBeGreaterThan(counts[0])
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(16)
    expect(Math.max(...counts)).toBeLessThanOrEqual(48)
  })

  it('toglie priorità e movimento ai fondali che coprono troppa scena', () => {
    expect(calculateBrainShapeMotionScale(0.2, 0.34, 0.06)).toBe(1)
    expect(calculateBrainShapeMotionScale(0.7, 0.34, 0.06)).toBe(0.06)
    expect(calculateBrainGeometryPriority(1_000, 0.7, 0.34, 0.06))
      .toBeCloseTo(60)
  })
})

describe('Brain narrative continuity', () => {
  it('sceglie casualmente quattro oppure cinque frasi per ogni nuova storia', () => {
    expect(selectBrainPhraseCount(() => 0)).toBe(4)
    expect(selectBrainPhraseCount(() => 0.999)).toBe(5)
  })

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
