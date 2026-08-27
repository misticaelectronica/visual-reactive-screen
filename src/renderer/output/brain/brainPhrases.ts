import { BRAIN_CONFIG } from '@shared/brain/brainConfig'
import { brainLog } from './brainLog'

export let BRAIN_PHRASES: string[] = []

export function parseBrainPhrases(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
}

/**
 * Rilegge `config/brainPhrases.txt`, sempre e solo quello: il campionamento
 * casuale di Brain non è mai alimentato dalla sessione pubblica online — le
 * frasi raccolte lì generano solo la loro storia dedicata una tantum (vedi
 * brainController.ts, publicOnlinePhrase) e poi vengono scartate, il file
 * di sessione (publicPhraseSession.ts) resta solo un registro su disco.
 */
export async function loadBrainPhrases(): Promise<readonly string[]> {
  const api = window.fxOutput
  if (!api) {
    throw new Error('Bridge Electron non disponibile per leggere config/brainPhrases.txt')
  }
  const raw = await api.readBrainConfigFile('brainPhrases.txt')
  const phrases = parseBrainPhrases(raw)
  if (phrases.length === 0) {
    throw new Error('config/brainPhrases.txt non contiene frasi valide')
  }
  BRAIN_PHRASES = phrases
  brainLog('phrases', `lette ${phrases.length} frasi da config/brainPhrases.txt`, {
    reload: true,
  })
  return phrases
}

export function selectBrainPhraseCount(random: () => number = Math.random): number {
  return (
    BRAIN_CONFIG.phraseSampleMinCount +
    Math.floor(
      random() *
        (BRAIN_CONFIG.phraseSampleMaxCount - BRAIN_CONFIG.phraseSampleMinCount + 1),
    )
  )
}

export interface BrainPhraseWindow {
  phrases: string[]
  nextCursor: number
}

/**
 * Traversata sequenziale di BRAIN_PHRASES, non campionamento casuale: legge
 * `count` righe contigue a partire da `cursor` (con avvolgimento a fine
 * file) e restituisce il cursore per la finestra successiva, avanzato di un
 * passo inferiore a `count` così che due finestre consecutive condividano
 * `BRAIN_CONFIG.phraseWindowOverlapCount` righe — è quella sovrapposizione a
 * dare continuità fra una storia e la successiva.
 *
 * Due vincoli strutturali, non parametri da tarare:
 * 1. la finestra non può mai coincidere con l'intero pool disponibile — se
 *    lo facesse, qualunque punto di partenza conterrebbe le stesse identiche
 *    righe (solo riordinate), azzerando di fatto la sovrapposizione parziale
 *    e restituendo la stessa storia due volte. Si presenta da solo su pool
 *    piccoli (es. sessione pubblica appena aperta, poche righe raccolte).
 * 2. l'overlap non può mai eguagliare o superare il conteggio effettivo: il
 *    passo (`count - overlap`) resta sempre almeno 1.
 */
export function sampleBrainPhraseWindow(cursor: number, count: number): BrainPhraseWindow {
  if (BRAIN_PHRASES.length === 0) {
    throw new Error('Le frasi Brain non sono state ancora caricate')
  }
  const length = BRAIN_PHRASES.length
  const maxWindowSize = length > 1 ? length - 1 : length
  const requested = Math.max(1, Math.min(maxWindowSize, Math.round(count)))
  const start = ((cursor % length) + length) % length
  const phrases: string[] = []
  for (let i = 0; i < requested; i += 1) {
    phrases.push(BRAIN_PHRASES[(start + i) % length])
  }
  const overlap = Math.min(BRAIN_CONFIG.phraseWindowOverlapCount, requested - 1)
  const step = Math.max(1, requested - overlap)
  return { phrases, nextCursor: start + step }
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
