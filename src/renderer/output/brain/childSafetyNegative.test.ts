import { describe, expect, it } from 'vitest'
import { storyFromLine } from './coscienzaOnirica'
import { CHILD_SAFETY_NEGATIVE_TERMS, childSafetyNegativePrompt } from './psichedel'
import { combinedNegativePrompt } from './brainImageGeneration'

// Disp. Capo Supremo 2026-10-19: negli episodi del pubblico, niente bambini
// quando la scena, la precedente o la successiva sono esplicite.
const QUIET = 'In a sunny market square, Marta carries a basket of bread past the fruit stalls and the old fountain.'
const EXPLICIT = 'On the narrow bed, Marta and her lover have sex beneath a yellow lamp, their bodies tangled in white sheets.'

function publicStory(lines: [string, string, string, string]) {
  const story = storyFromLine(lines[0], [lines[1], lines[2], lines[3]])
  story.onlineSourceText = 'frase del pubblico'
  return story
}

describe('bambini evitati vicino alle scene esplicite', () => {
  it('aggiunge i termini alla scena esplicita e alle due vicine, non alle altre', () => {
    const story = publicStory([QUIET, QUIET, EXPLICIT, QUIET])
    expect([0, 1, 2, 3].map((index) => childSafetyNegativePrompt(story, index)))
      .toEqual(['', CHILD_SAFETY_NEGATIVE_TERMS, CHILD_SAFETY_NEGATIVE_TERMS, CHILD_SAFETY_NEGATIVE_TERMS])
  })

  it('non tocca le righe curate né gli episodi senza scene esplicite', () => {
    const curated = storyFromLine(EXPLICIT, [EXPLICIT, EXPLICIT, EXPLICIT])
    expect(childSafetyNegativePrompt(curated, 0)).toBe('')
    const quiet = publicStory([QUIET, QUIET, QUIET, QUIET])
    expect(childSafetyNegativePrompt(quiet, 2)).toBe('')
  })

  it('non aggiunge termini quando il checkbox è disattivato', () => {
    const story = publicStory([QUIET, EXPLICIT, QUIET, QUIET])
    expect([0, 1, 2, 3].map((index) => childSafetyNegativePrompt(story, index, false)))
      .toEqual(['', '', '', ''])
  })

  it('mantiene i criteri larghi esistenti soltanto per questa protezione', () => {
    const fingers = publicStory([
      QUIET,
      'At the piano, Marta rests her fingers on the black keys beneath a white lamp.',
      QUIET,
      QUIET,
    ])
    expect(childSafetyNegativePrompt(fingers, 1)).toBe(CHILD_SAFETY_NEGATIVE_TERMS)
  })

  it('usa soltanto i termini mantenuti dalla disposizione aggiornata', () => {
    expect(CHILD_SAFETY_NEGATIVE_TERMS).toBe(
      'child, children, kid, young girl, young boy',
    )
    expect(CHILD_SAFETY_NEGATIVE_TERMS).not.toMatch(
      /\b(?:minor|teenager|schoolgirl|schoolboy|baby)\b/,
    )
  })

  it('mette i termini prima del negative prompt del pannello', () => {
    expect(combinedNegativePrompt(CHILD_SAFETY_NEGATIVE_TERMS, 'extra limbs'))
      .toBe(`${CHILD_SAFETY_NEGATIVE_TERMS}, extra limbs`)
    expect(combinedNegativePrompt(undefined, 'extra limbs')).toBe('extra limbs')
  })
})
