import { describe, expect, it, vi } from 'vitest'
import {
  buildEpisodePhasePrompt,
  buildPublicPhraseRewritePrompt,
  CoscienzaOnirica,
  EPISODE_PHASES,
  parseEpisodePhaseLine,
  parsePublicPhraseRewrite,
  storyFromLine,
} from './coscienzaOnirica'

// PIANO-051: ogni riga degli scribacchini è un episodio di quattro immagini.
const THRESHOLD =
  'In a cramped Prague apartment under pale afternoon light, Marta presses a white letter against her chest beside a black typewriter.'
const PHASE_LINES = [
  'In the same apartment the white letter unfolds into a long white sheet that Marta drags across the floor toward the window.',
  'Marta stands wrapped in white pages and tangled sheets, the black typewriter and the window light pressed into one crowded room.',
  'Beside the black typewriter Marta presses a torn white letter against her chest, the room now bare under cold evening light.',
]

describe('episodio da una riga', () => {
  it('legge una fase per risposta, togliendo etichette e virgolette', () => {
    expect(parseEpisodePhaseLine(`**IMAGE 2 (METAMORPHOSIS):** "${PHASE_LINES[0]}"`, [THRESHOLD]))
      .toBe(PHASE_LINES[0])
    expect(parseEpisodePhaseLine(`ECHO: ${PHASE_LINES[2]}`, [THRESHOLD])).toBe(PHASE_LINES[2])
  })

  it('da un paragrafo che si dilunga tiene le prime frasi entro il limite', () => {
    const rambling = `${PHASE_LINES[0]} ${PHASE_LINES[1]} ${PHASE_LINES[2]} ${PHASE_LINES[0]}`
    expect(parseEpisodePhaseLine(rambling, [THRESHOLD])).toBe(PHASE_LINES[0])
  })

  it('rifiuta fasi troppo brevi o già usate', () => {
    expect(parseEpisodePhaseLine('too short.', [THRESHOLD])).toBeNull()
    expect(parseEpisodePhaseLine(THRESHOLD, [THRESHOLD])).toBeNull()
  })

  it('rifiuta il metalinguaggio delle fasi, non la parola echo (PIANO-058 D8)', () => {
    for (const copied of [
      'The densest moment: the elements of images 1 and 2 intersect in this single image.',
      'In the same room image 4 returns, deformed by what happened in image 1 beside the window.',
      'Marta stands in the metamorphosis of the white letter beside the black typewriter and the window.',
      'Marta drags the white sheet toward the window as in the previous image of the cramped room.',
    ]) {
      expect(parseEpisodePhaseLine(copied, [THRESHOLD])).toBeNull()
    }
    const echoing = 'Marta presses the torn white letter against her chest while the typewriter keys echo through the bare room.'
    expect(parseEpisodePhaseLine(echoing, [THRESHOLD])).toBe(echoing)
  })

  it('accetta fino a 50 parole (PIANO-058 D7)', () => {
    const words = (count: number) => Array.from({ length: count }, (_, index) => `word${index}`).join(' ')
    expect(parseEpisodePhaseLine(words(50), [THRESHOLD])).toBe(words(50))
    expect(parseEpisodePhaseLine(words(51), [THRESHOLD])).toBeNull()
  })

  it('la soglia è la riga letterale; una fase mancante è sostituita dalla soglia', () => {
    const story = storyFromLine(THRESHOLD, [PHASE_LINES[0], null, PHASE_LINES[2]])
    expect(story.frames.map((frame) => frame.imagePrompt))
      .toEqual([THRESHOLD, PHASE_LINES[0], THRESHOLD, PHASE_LINES[2]])
    expect(story.invariant).toBe('')

    const fallback = storyFromLine(THRESHOLD, null)
    expect(fallback.frames.map((frame) => frame.imagePrompt)).toEqual(Array(4).fill(THRESHOLD))
    expect(fallback.synopsis.split(THRESHOLD.slice(0, 40)).length - 1).toBe(1)
  })

  it('ogni richiesta porta il principio della fase e trasforma la materia, senza filtro', () => {
    const prompt = buildEpisodePhasePrompt([THRESHOLD, PHASE_LINES[0]])
    expect(prompt).toContain(`FIRST SCENE: ${THRESHOLD}`)
    expect(prompt).toContain(`THEN: ${PHASE_LINES[0]}`)
    expect(prompt).toContain(`Now the dream reaches CONDENSATION: ${EPISODE_PHASES[1].directive}`)
    expect(prompt).toContain('do not replace them with other places, objects or actions')
    expect(prompt).toContain('complete physical description of the first scene')
    expect(prompt).not.toMatch(/\bimage\s*\d/iu)
    EPISODE_PHASES.forEach((phase) => expect(phase.directive).not.toMatch(/\bimages?\s*\d/iu))
    expect(prompt).toContain('no close-ups of hands or fingers')
    expect(prompt).toContain('Do not censor, soften or euphemize anything')
    expect(prompt).not.toContain('Preserve the explicit physical actions literally')
  })

  it('i fotogrammi portano il nome della propria fase', () => {
    expect(storyFromLine(THRESHOLD, null).frames.map((frame) => frame.title))
      .toEqual(['Soglia', 'Metamorfosi', 'Condensazione', 'Eco'])
  })

  it('chiede le tre fasi una alla volta e ricade sulla soglia fase per fase', async () => {
    const generate = vi.fn()
      .mockResolvedValueOnce(PHASE_LINES[0])
      .mockResolvedValueOnce('?')
      .mockResolvedValueOnce(PHASE_LINES[2])
    const story = await new CoscienzaOnirica({ generate }).generateEpisode(THRESHOLD)
    expect(generate).toHaveBeenCalledTimes(3)
    expect(story.frames.map((frame) => frame.imagePrompt))
      .toEqual([THRESHOLD, PHASE_LINES[0], THRESHOLD, PHASE_LINES[2]])

    const broken = new CoscienzaOnirica({ generate: vi.fn().mockRejectedValue(new Error('gpu')) })
    expect((await broken.generateEpisode(THRESHOLD)).frames.every(
      (frame) => frame.imagePrompt === THRESHOLD,
    )).toBe(true)
  })
})

// Struttura canonica dell'episodio (direttiva del Vicario 2026-11-06):
// METAMORFOSI = Qwen(Soglia), CONDENSAZIONE = Qwen(Soglia + Metamorfosi),
// ECO = Qwen(Soglia + Metamorfosi + Condensazione).
describe('workflow dell’episodio', () => {
  const imagesIn = (prompt: string) =>
    [...prompt.matchAll(/^(FIRST SCENE|THEN): (.*)$/gmu)].map((match) => match[2])

  async function promptsFor(responses: string[]) {
    const generate = vi.fn()
    responses.forEach((response) => generate.mockResolvedValueOnce(response))
    const story = await new CoscienzaOnirica({ generate }).generateEpisode(THRESHOLD)
    return { story, prompts: generate.mock.calls.map((call) => call[1] as string) }
  }

  it('ogni fase vede tutto e soltanto l’episodio già manifestato', async () => {
    const { prompts } = await promptsFor([...PHASE_LINES])
    expect(prompts.map(imagesIn)).toEqual([
      [THRESHOLD],
      [THRESHOLD, PHASE_LINES[0]],
      [THRESHOLD, PHASE_LINES[0], PHASE_LINES[1]],
    ])
    expect(prompts.map((prompt) => prompt.match(/^Now the dream reaches ([A-Z]+):/mu)?.[1]))
      .toEqual(['METAMORPHOSIS', 'CONDENSATION', 'ECHO'])
    prompts.forEach((prompt) => expect(prompt).not.toContain('STORY SO FAR'))
  })

  it('una fase sostituita entra nel contesto con il testo che va a Stable Diffusion', async () => {
    const { story, prompts } = await promptsFor(['?', PHASE_LINES[1], PHASE_LINES[2]])
    expect(imagesIn(prompts[1])[1]).toBe(THRESHOLD)
    expect(story.frames[1].imagePrompt).toBe(THRESHOLD)
  })

  it('una riga vuota non diventa un episodio', async () => {
    const generate = vi.fn()
    await expect(new CoscienzaOnirica({ generate }).generateEpisode('   ')).rejects.toThrow('riga vuota')
    expect(generate).not.toHaveBeenCalled()
  })

  it('il prompt di ogni immagine è il testo della sua fase', async () => {
    const { story } = await promptsFor([...PHASE_LINES])
    expect(story.frames.map((frame) => frame.imagePrompt)).toEqual([THRESHOLD, ...PHASE_LINES])
    expect(story.invariant).toBe('')
    expect(story.continuityPhrase).toBeNull()
    expect(story.bridge).toBeNull()
  })
})

describe('frase del pubblico riscritta come riga della storia', () => {
  const REWRITTEN =
    'LINE: At the beer hall table, Marta reads a stranger\'s note scrawled across her white letter, amber lamps glowing over wet glasses.'

  it('legge la riga riscritta e porta storia in corso e regole nel prompt', () => {
    expect(parsePublicPhraseRewrite(REWRITTEN)).toMatch(/^At the beer hall table/)
    const prompt = buildPublicPhraseRewritePrompt('a note from a stranger', [THRESHOLD])
    expect(prompt).toContain('AUDIENCE PHRASE: a note from a stranger')
    expect(prompt).toContain(`STORY IN PROGRESS:\n- ${THRESHOLD}`)
    expect(prompt).toContain('Keep everything the phrase says and shows')
  })

  it('traduce, riscrive e, se la riscrittura fallisce, non perde la frase', async () => {
    const translator = { inputsToEnglish: vi.fn().mockResolvedValue(['a note from a stranger']), storyForUi: vi.fn() }
    const ok = new CoscienzaOnirica({ generate: vi.fn().mockResolvedValue(REWRITTEN) }, translator)
    expect(await ok.rewritePublicPhrase('un biglietto da uno sconosciuto', [THRESHOLD]))
      .toMatch(/^At the beer hall table/)

    const failing = new CoscienzaOnirica({ generate: vi.fn().mockResolvedValue('?') }, translator)
    expect(await failing.rewritePublicPhrase('un biglietto da uno sconosciuto')).toBe('a note from a stranger')
  })
})
