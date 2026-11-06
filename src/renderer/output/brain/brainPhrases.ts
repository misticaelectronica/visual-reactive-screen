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
 * Nomi dei personaggi della storia caricata: parole maiuscole (non a inizio
 * frase) presenti in più di metà delle righe. Con le storie attuali: Sal,
 * Paradise; Jim, Ray; Bardamu; Teo — nessun luogo. Servono a togliere i nomi
 * dal prompt di Stable Diffusion, che non li conosce (disp. Capo Supremo
 * 2026-11-06); Qwen invece li riceve.
 */
export function storyCharacterNames(phrases: readonly string[]): string[] {
  const counts = new Map<string, number>()
  for (const phrase of phrases) {
    const words = new Set(
      [...phrase.matchAll(/(?<![.!?]\s|^)\b([A-Z][a-z]+)\b/gu)].map((match) => match[1]),
    )
    words.forEach((word) => counts.set(word, (counts.get(word) ?? 0) + 1))
  }
  return [...counts].filter(([, count]) => count > phrases.length / 2).map(([word]) => word)
}

/**
 * Toglie i nomi dei personaggi da un prompt raster. Una sequenza di nomi
 * («Sal Paradise», «Ferdinand Bardamu») diventa «a man» /
 * «a woman» secondo i pronomi del testo, altrimenti «a figure».
 */
export function withoutCharacterNames(text: string, names: readonly string[]): string {
  if (names.length === 0) return text
  const male = /\b(he|his|him|himself)\b/iu.test(text)
  const female = /\b(she|her|hers|herself)\b/iu.test(text)
  const noun = male && !female ? 'man' : female && !male ? 'woman' : 'figure'
  const name = `(?:${names.join('|')})`
  // Un nome proprio subito prima («Ferdinand» Bardamu) fa parte del nome,
  // purché non apra la frase («Beside Sal…» resta «Beside a man…»).
  const sequence = new RegExp(`\\b([A-Z][a-z]+\\s+)?${name}(?:\\s+${name})*\\b('s)?`, 'gu')
  const atSentenceStart = (offset: number) => /(^|[.!?]\s+)$/u.test(text.slice(0, offset))
  return text.replace(
    sequence,
    (_match, prefix: string | undefined, possessive: string | undefined, offset: number) => {
      const kept = prefix && atSentenceStart(offset) ? prefix : ''
      const start = offset + kept.length
      const replacement = possessive ? `the ${noun}'s` : `a ${noun}`
      return kept + (atSentenceStart(start)
        ? replacement[0].toUpperCase() + replacement.slice(1)
        : replacement)
    },
  )
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

/**
 * Righe già lette prima del cursore, dalla più vicina (PIANO-051): il legame
 * con la storia in corso. All'inizio della sequenza non ce ne sono e non se
 * ne inventano.
 */
export function brainPhrasesBeforeCursor(cursor: number, count: number): string[] {
  const length = BRAIN_PHRASES.length
  const lines: string[] = []
  for (let i = 1; i <= count && cursor - i >= 0 && length > 0; i += 1) {
    lines.push(BRAIN_PHRASES[(cursor - i) % length])
  }
  return lines.reverse()
}

export interface PhraseSequenceInsertion {
  lines: string[]
  nextCursor: number
}

/**
 * BrainPhrasesBaseStory di Sessione (disp. Capo Supremo 2026-09-18): un
 * input utente arrivato durante la Sessione pubblica non si accoda in
 * fondo al file — si inserisce esattamente nel punto della sequenza in cui
 * Brain si trova in quel momento (`cursor`, stesso valore che guida
 * `sampleBrainPhraseWindow`), così la storia base può riprendere dal
 * paragrafo successivo senza saltarlo né rileggerlo. Il cursore normalizza
 * come `sampleBrainPhraseWindow` (stesso avvolgimento a fine file); dopo
 * l'inserimento avanza di uno, oltre la riga appena inserita.
 */
export function insertPhraseAtCursor(
  lines: readonly string[],
  cursor: number,
  phrase: string,
): PhraseSequenceInsertion {
  const length = lines.length
  const insertAt = length === 0 ? 0 : ((cursor % length) + length) % length
  const nextLines = [...lines]
  nextLines.splice(insertAt, 0, phrase)
  return { lines: nextLines, nextCursor: insertAt + 1 }
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
