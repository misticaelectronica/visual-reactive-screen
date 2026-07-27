import phrasesRaw from '@shared/brain/brainPhrases.txt?raw'
import { BRAIN_CONFIG } from '@shared/brain/brainConfig'
import { brainLog } from './brainLog'

export const BRAIN_PHRASES = phrasesRaw
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith('#'))

brainLog('phrases', `lette ${BRAIN_PHRASES.length} frasi dal file di configurazione`)

export function selectBrainPhraseCount(random: () => number = Math.random): number {
  return (
    BRAIN_CONFIG.phraseSampleMinCount +
    Math.floor(
      random() *
        (BRAIN_CONFIG.phraseSampleMaxCount - BRAIN_CONFIG.phraseSampleMinCount + 1),
    )
  )
}

export function sampleBrainPhrases(count: number, previous: readonly string[] = []): string[] {
  const requested = Math.max(1, Math.min(BRAIN_PHRASES.length, Math.round(count)))
  const fresh = BRAIN_PHRASES.filter((phrase) => !previous.includes(phrase))
  const pool = fresh.length >= requested ? fresh : [...BRAIN_PHRASES]
  const result: string[] = []
  while (result.length < requested && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length)
    result.push(pool.splice(index, 1)[0])
  }
  return result
}

export function sampleContinuityPhrase(
  synopsis: string,
  random: () => number = Math.random,
): string | null {
  const sentences =
    synopsis
      .replace(/\s+/g, ' ')
      .match(/[^.!?]+[.!?]+/g)
      ?.map((sentence) => sentence.trim())
      .filter((sentence) => sentence.split(/\s+/).length >= 6) ?? []
  if (sentences.length === 0) return null
  return sentences[Math.floor(random() * sentences.length) % sentences.length]
}
