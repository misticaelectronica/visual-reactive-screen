import { describe, expect, it, vi } from 'vitest'
import {
  buildEpisodePhasePrompt,
  buildPublicPhraseRewritePrompt,
  CoscienzaOnirica,
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

  it('la soglia è la riga letterale; una fase mancante è sostituita dalla soglia', () => {
    const story = storyFromLine(THRESHOLD, [PHASE_LINES[0], null, PHASE_LINES[2]])
    expect(story.frames.map((frame) => frame.imagePrompt))
      .toEqual([THRESHOLD, PHASE_LINES[0], THRESHOLD, PHASE_LINES[2]])
    expect(story.invariant).toBe('')

    const fallback = storyFromLine(THRESHOLD, null)
    expect(fallback.frames.map((frame) => frame.imagePrompt)).toEqual(Array(4).fill(THRESHOLD))
    expect(fallback.synopsis.split(THRESHOLD.slice(0, 40)).length - 1).toBe(1)
  })

  it('ogni richiesta chiede una fase che completi la frase iniziale, senza filtro', () => {
    const prompt = buildEpisodePhasePrompt(THRESHOLD, 1, [PHASE_LINES[0]], ['Earlier line.'])
    expect(prompt).toContain(`IMAGE 1 (THRESHOLD): ${THRESHOLD}`)
    expect(prompt).toContain(`IMAGE 2 (METAMORPHOSIS): ${PHASE_LINES[0]}`)
    expect(prompt).toContain('Write IMAGE 3 (CONDENSATION)')
    expect(prompt).toContain('It must also complete the sentence of image 1')
    expect(prompt).toContain('STORY SO FAR:\n- Earlier line.')
    expect(prompt).toContain('no close-ups of hands or fingers')
    expect(prompt).toContain('Do not censor, soften or euphemize anything')
    expect(prompt).not.toContain('Preserve the explicit physical actions literally')
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
