import { BRAIN_CONFIG } from '@shared/brain/brainConfig'
import type { DreamFrame, DreamStory } from '@shared/brain/brainTypes'
import type { ConsciousnessMotionCandidate } from '@shared/types'
import { BrainAiCancelledError, type BrainAiClient } from './brainAiClient'
import { brainLog, brainWarn } from './brainLog'
import {
  normalizeEnglishStoryEnvelope,
  type BrainTranslator,
} from './brainTranslator'
import { extractJsonObjects } from './extractJsonObjects'
import { getBrainRenderingConfig } from './brainRenderingConfig'
import { deriveOneiricPhase, type OneiricPhase } from '@shared/brain/dreamRevisionCycle'

// Funzione di ciascuna fase onirica nel Visual Plan (lettera Vice
// Consigliere §2): non 4 atti narrativi equivalenti, ma 4 stati della
// stessa immagine mentale, ciascuno con un criterio qualitativo e un
// rapporto diverso con l'invariante della storia.
const ONEIRIC_PHASE_BRIEF: Record<OneiricPhase, string> = {
  soglia:
    'Found the imaginative field: introduce the invariant in a stable, legible configuration strong enough to be transformed later. It does not need to explain the whole story, only to establish it.',
  metamorfosi:
    'Transform the invariant introduced in the threshold moment: keep a recognizable relation to it, but change its form, relation, material, space or meaning, and make the transformation already visibly in progress.',
  condensazione:
    'Reach the point of maximum conceptual density of the story: the invariant and its transformation reach their most significant configuration. It can be visually simple; never confuse density with mere complexity, noise or spectacle.',
  eco:
    'Return something recognizable from the threshold moment, deformed by what has happened since: memory plus deformation, not a fresh independent fourth scene.',
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function requiredText(value: unknown, minimumWords: number): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text.split(/\s+/).length >= minimumWords ? text : null
}

function words(text: string): string[] {
  return text.toLocaleLowerCase().match(/\p{L}+/gu) ?? []
}

const ITALIAN_LANGUAGE_MARKERS = new Set([
  'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'del', 'della',
  'nel', 'nella', 'che', 'con', 'per', 'mentre', 'quando', 'allora', 'dopo',
  'prima', 'suo', 'sua', 'sono', 'viene', 'diventa',
])

const ENGLISH_LANGUAGE_MARKERS = new Set([
  'the', 'an', 'and', 'of', 'in', 'between', 'with', 'from', 'when', 'then',
  'after', 'before', 'she', 'he', 'her', 'his', 'they', 'their', 'through',
  'into', 'becomes', 'finds', 'discovers',
])

export function appearsItalian(text: string): boolean {
  const tokens = words(text)
  const italianScore = tokens.filter((word) => ITALIAN_LANGUAGE_MARKERS.has(word)).length
  const englishScore = tokens.filter((word) => ENGLISH_LANGUAGE_MARKERS.has(word)).length
  return englishScore < 5 || italianScore >= englishScore
}

function normalizedSentence(text: string): string {
  return words(text).join(' ')
}

function hasRepeatedNarrativeSentence(text: string): boolean {
  const sentences = splitSentences(text)
    .map(normalizedSentence)
    .filter((sentence) => words(sentence).length >= 8)
  return new Set(sentences).size !== sentences.length
}

const NARRATIVE_META_ARTIFACTS =
  /(?:\b(?:colore|colori)\s+del\s+sogno\b|\bdream\s+colou?rs?\b|\bcolou?rs?\s+of\s+(?:the\s+)?dream\b|\b(?:colore|color|colour)\s*(?:del\s+sogno\s*)?\d+\s*:|\b(?:fotogramma|frame|momento|visual)\s*[_-]?\d+\s*:|\b(?:titolo|title|storia|story|legame|bridge|colori|colors)\s*:)/iu

export function isRenderableNarrative(text: string): boolean {
  if (NARRATIVE_META_ARTIFACTS.test(text)) return false
  const moments = splitSentences(text).filter(
    (sentence) => words(sentence).length >= 6,
  )
  return (
    // Il modello piccolo riesce affidabilmente a produrre quattro passaggi
    // narrativi; il renderer li espande poi in sei fotogrammi senza perdere
    // una storia valida solo perché non ha scritto sei frasi.
    moments.length >= 4 &&
    new Set(moments.map(normalizedSentence)).size === moments.length
  )
}

function escapedPattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function labeledBlock(text: string, label: string, nextLabels: string[]): string | null {
  const nextPattern = nextLabels.map(escapedPattern).join('|')
  const boundary = nextPattern ? `^(?:${nextPattern}):|(?![\\s\\S])` : '(?![\\s\\S])'
  return text
    .match(new RegExp(`^${escapedPattern(label)}:\\s*([\\s\\S]*?)(?=${boundary})`, 'im'))?.[1]
    ?.trim() ?? null
}

type NarrativeParseResult = {
  value: unknown | null
  issues: string[]
}

export const DEFAULT_DREAM_PALETTE: DreamStory['palette'] = [
  '#111827',
  '#d08c60',
  '#f3ead7',
  '#3ddc97',
  '#7457d9',
]

function paletteFromUnknown(value: unknown): DreamStory['palette'] {
  const candidates =
    typeof value === 'string'
      ? value.match(/#[0-9a-f]{6}\b/gi) ?? []
      : Array.isArray(value)
        ? value.filter((color): color is string => typeof color === 'string')
        : []
  const colors = candidates
    .map((color) => color.trim().toLowerCase())
    .filter((color) => /^#[0-9a-f]{6}$/i.test(color))
  const uniqueColors = [...new Set(colors)]
  return uniqueColors.length === 5
    ? (uniqueColors as DreamStory['palette'])
    : [...DEFAULT_DREAM_PALETTE]
}

function consciousnessAccent(seedText: string, offset: number): string {
  let seed = 2166136261
  for (const character of seedText) {
    seed ^= character.charCodeAt(0)
    seed = Math.imul(seed, 16777619)
  }
  const value = (seed + offset * 0x45d9f3b) >>> 0
  const channel = (shift: number) => 48 + ((value >>> shift) % 176)
  return `#${channel(0).toString(16).padStart(2, '0')}${channel(8).toString(16).padStart(2, '0')}${channel(16).toString(16).padStart(2, '0')}`
}

function applyConsciousnessPalette(
  palette: DreamStory['palette'],
  influence: ConsciousnessMotionCandidate,
): DreamStory['palette'] {
  return [
    palette[0],
    palette[1],
    consciousnessAccent(influence.memoryId, 1),
    consciousnessAccent(influence.memoryId, 2),
    palette[4],
  ]
}

export function analyzeNarrativeFormat(text: string): NarrativeParseResult {
  const cleaned = text.replace(/[*`]/g, '')
  const issues: string[] = []
  const title = labeledBlock(cleaned, 'TITOLO', ['STORIA'])
  const expandedFormat = /^F1-TITOLO:/im.test(cleaned)
  const synopsis = expandedFormat
    ? labeledBlock(cleaned, 'STORIA', ['LEGAME', 'COLORI', 'F1-TITOLO'])
    : labeledBlock(cleaned, 'STORIA', ['LEGAME', 'COLORI', 'F1'])
  const bridge = labeledBlock(
    cleaned,
    'LEGAME',
    expandedFormat ? ['COLORI', 'F1-TITOLO'] : ['COLORI', 'F1'],
  )
  const palette = paletteFromUnknown(
    labeledBlock(cleaned, 'COLORI', expandedFormat ? ['F1-TITOLO'] : ['F1']),
  )
  if (!title) issues.push('TITOLO mancante')
  if (!synopsis) issues.push('STORIA mancante')
  if (issues.length > 0) return { value: null, issues }
  const frames: Array<Record<string, unknown>> = []
  for (let index = 1; index <= BRAIN_CONFIG.storyFrameMax; index++) {
    const expandedTitle = labeledBlock(cleaned, `F${index}-TITOLO`, [`F${index}-DESCRIZIONE`])
    const expandedDescription = labeledBlock(cleaned, `F${index}-DESCRIZIONE`, [`F${index}-VISIVO`])
    const expandedVisualIntent = labeledBlock(cleaned, `F${index}-VISIVO`, [`F${index}-ENERGIA`])
    const expandedEnergy = labeledBlock(
      cleaned,
      `F${index}-ENERGIA`,
      index < BRAIN_CONFIG.storyFrameMax ? [`F${index + 1}-TITOLO`] : [],
    )
    const compactLine = labeledBlock(
      cleaned,
      `F${index}`,
      index < BRAIN_CONFIG.storyFrameMax ? [`F${index + 1}`] : [],
    )
    const compactParts = compactLine?.split(/\s*::\s*/).map((part) => part.trim())
    const parts =
      expandedTitle && expandedDescription && expandedVisualIntent && expandedEnergy
        ? [expandedTitle, expandedDescription, expandedVisualIntent, expandedEnergy]
        : compactParts
    if (!parts || parts.length !== 4) {
      issues.push(`F${index} incompleto: attesi titolo, descrizione, visivo ed energia`)
      continue
    }
    if (/^(intenzione visiva|visual intent)$/i.test(parts[2])) {
      issues.push(`F${index}-VISIVO contiene un segnaposto`)
      continue
    }
    const energyMatch = parts[3].match(/(?:0(?:[.,]\d+)?|1(?:[.,]0+)?)/)?.[0]
    const energy = Number(energyMatch?.replace(',', '.'))
    if (!Number.isFinite(energy)) {
      issues.push(`F${index}-ENERGIA non contiene un numero fra 0.05 e 1`)
      continue
    }
    frames.push({
      title: parts[0],
      description: parts[1],
      visualIntent: parts[2],
      energy,
      durationMs: getBrainRenderingConfig().timing.frameDurationMs,
    })
  }
  return issues.length > 0
    ? { value: null, issues }
    : { value: { title, synopsis, bridge, palette, frames }, issues: [] }
}

export function parseNarrativeFormat(text: string): unknown | null {
  return analyzeNarrativeFormat(text).value
}

function storyFromResponse(text: string, phrases: string[]): DreamStory | null {
  const candidates = extractJsonObjects(text)
  return [parseNarrativeFormat(text), ...candidates]
    .map((candidate) => normalizeStory(candidate, phrases))
    .find((candidate): candidate is DreamStory => candidate !== null) ?? null
}

type StoryCore = {
  title: string
  synopsis: string
  bridge: string | null
  palette: DreamStory['palette']
  invariant: string
}

const INVARIANT_HINT_TERMS =
  /\b(?:corpo|volto|mani|occhi|specchio|porta|albero|radici|luce|ombra|segnale|voce|mappa|chiave|filo|acqua|pietra|maschera|body|face|hands|eyes|mirror|door|tree|roots|light|shadow|signal|voice|map|key|thread|water|stone|mask)\b/iu

/**
 * Rete di sicurezza quando il modello non produce la riga INVARIANT/E: un
 * sostantivo concreto ricorrente nella sinossi o nelle frasi sorgente, non
 * un tema astratto (quello resta compito di `inferMainArgument`).
 *
 * Restituisce stringa vuota quando non lo trova, e NON tira a indovinare
 * (correzione 2026-10-08). Le due vie precedenti producevano entrambe un
 * invariante falso, e l'invariante non è un campo di servizio: viene
 * riattaccato come `Invariant: ...` a tutti e quattro i prompt raster
 * (`buildPsychedelImagePrompt`) ed è dichiarato al Visual Plan come la cosa
 * che deve restare riconoscibile attraverso i quattro momenti.
 *   - la prima parola della sinossi lunga almeno 5 lettere non è un
 *     sostantivo: su una sinossi inglese reale del corpus di validazione
 *     restituiva `stands`, cioè un verbo, ripetuto quattro volte;
 *   - il ripiego finale era la stringa italiana `una presenza ricorrente`,
 *     che finiva in un prompt inglese dentro CLIP. Era però raggiungibile
 *     solo con una sinossi priva di parole di 5 lettere, quindi quasi mai:
 *     il difetto che si vedeva dal vivo era il primo, non questo.
 * A valle la stringa vuota è già gestita: `buildPsychedelImagePrompt`
 * aggiunge la riga solo se l'invariante non è vuoto, e `generateVisualPlan`
 * omette la propria riga. Meglio nessun invariante che uno inventato.
 */
export function inferInvariant(source: readonly string[], synopsis: string): string {
  const text = `${synopsis} ${source.join(' ')}`
  const hinted = text.match(INVARIANT_HINT_TERMS)?.[0]
  return hinted ? hinted.toLocaleLowerCase() : ''
}

const BRIDGE_STOP_WORDS = new Set([
  'della', 'delle', 'degli', 'dallo', 'nella', 'nelle', 'dopo', 'prima',
  'questo', 'questa', 'quello', 'quella', 'mentre', 'perché', 'anche',
  'come', 'sono', 'viene', 'diventa', 'storia', 'nuova', 'attraverso',
])

function significantWords(text: string): Set<string> {
  return new Set(
    words(text).filter((word) => word.length >= 4 && !BRIDGE_STOP_WORDS.has(word)),
  )
}

export function bridgeConnectsStories(
  bridge: string | null,
  previousStory: DreamStoryMemory | null,
  nextSynopsis: string,
): boolean {
  if (!previousStory) return true
  if (!bridge || words(bridge).length < 6) return false
  const bridgeWords = significantWords(bridge)
  const previousWords = significantWords(previousStory.synopsis)
  const nextWords = significantWords(nextSynopsis)
  return (
    [...bridgeWords].some((word) => previousWords.has(word)) &&
    [...bridgeWords].some((word) => nextWords.has(word))
  )
}

function storyCoreFromResponse(
  text: string,
  phrases: string[],
): StoryCore | null {
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/[*`]/g, '')
    .trim()
  const titleMatch = cleaned.match(/^TITOLO:\s*([^\n\r]+)/im)
  const title = requiredText(
    titleMatch?.[1].replace(/^["'“”]+|["'“”]+$/g, '').trim(),
    1,
  )
  const labeledSynopsis = labeledBlock(
    cleaned,
    'STORIA',
    ['LEGAME', 'COLORI', 'INVARIANTE', 'F1-TITOLO', 'F1'],
  )
  const looseSynopsis =
    !labeledSynopsis && titleMatch?.index !== undefined
      ? cleaned
          .slice(titleMatch.index + titleMatch[0].length)
          .split(/^(?:LEGAME|COLORI|INVARIANTE):/im)[0]
          .replace(/^STORIA:\s*/i, '')
          .trim()
      : null
  const synopsis = requiredText(labeledSynopsis ?? looseSynopsis, 35)
  if (!title || !synopsis) return null
  if (!appearsItalian(`${title} ${synopsis}`)) return null
  if (hasRepeatedNarrativeSentence(synopsis)) return null
  if (!isRenderableNarrative(synopsis)) return null
  const normalizedSynopsis = synopsis.toLocaleLowerCase()
  const copiedPhraseCount = phrases.filter((phrase) =>
    normalizedSynopsis.includes(phrase.toLocaleLowerCase()),
  ).length
  const sourceWords = new Set(phrases.flatMap(words))
  const synopsisWords = words(synopsis)
  const novelWordRatio =
    synopsisWords.filter((word) => !sourceWords.has(word)).length / Math.max(1, synopsisWords.length)
  if (copiedPhraseCount >= 2 && novelWordRatio < 0.18) return null
  const bridge = requiredText(
    labeledBlock(cleaned, 'LEGAME', ['COLORI', 'INVARIANTE', 'F1-TITOLO', 'F1']),
    6,
  )
  const invariant = requiredText(
    labeledBlock(cleaned, 'INVARIANTE', ['F1-TITOLO', 'F1']),
    1,
  )
  return {
    title: title.slice(0, 100),
    synopsis: synopsis.slice(0, 1_200),
    bridge: bridge?.slice(0, 420) ?? null,
    palette: paletteFromUnknown(labeledBlock(cleaned, 'COLORI', ['INVARIANTE', 'F1-TITOLO', 'F1'])),
    invariant: invariant?.slice(0, 120) ?? inferInvariant(phrases, synopsis),
  }
}

function storyCoreFromEnglishEnvelope(
  text: string,
  phrases: readonly string[] = [],
): StoryCore | null {
  const title = requiredText(
    labeledBlock(text, 'TITLE', ['STORY']),
    1,
  )
  const synopsis = requiredText(
    labeledBlock(text, 'STORY', ['BRIDGE']),
    20,
  )
  if (!title || !synopsis || !isRenderableNarrative(synopsis)) return null
  const invariant = requiredText(
    labeledBlock(text, 'INVARIANT', []),
    1,
  )
  return {
    title: title.slice(0, 100),
    synopsis: synopsis.slice(0, 1_200),
    bridge:
      requiredText(
        labeledBlock(text, 'BRIDGE', ['COLORS', 'INVARIANT']),
        5,
      )?.slice(0, 420) ?? null,
    palette: paletteFromUnknown(labeledBlock(text, 'COLORS', ['INVARIANT'])),
    invariant: invariant?.slice(0, 120) ?? inferInvariant(phrases, synopsis),
  }
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .match(/[^.!?]+[.!?]?/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) ?? []
}

export function splitIntoFourMoments(synopsis: string): string[] {
  const frameCount = BRAIN_CONFIG.renderFrameCount
  const sentences = splitSentences(synopsis)
  if (sentences.length >= frameCount) {
    const groups = Array.from({ length: frameCount }, (_, index) => {
      const start = Math.floor((index * sentences.length) / frameCount)
      const end = Math.floor(((index + 1) * sentences.length) / frameCount)
      return sentences.slice(start, Math.max(start + 1, end)).join(' ')
    })
    if (groups.every((group) => words(group).length >= 8)) return groups
  }

  const completeSentences = sentences.length > 0 ? sentences : [synopsis.trim()]
  const momentIndexes = Array.from(
    { length: frameCount },
    (_, index) => Math.min(
      completeSentences.length - 1,
      Math.floor((index * completeSentences.length) / frameCount),
    ),
  )
  const introductions = [
    'All’inizio',
    'Il richiamo cresce quando',
    'In seguito',
    'L’attrito appare quando',
    'La trasformazione avviene quando',
    'Alla fine',
  ]
  return momentIndexes.map(
    (sentenceIndex, index) =>
      `${introductions[index]}: ${completeSentences[sentenceIndex]}`,
  )
}

function completeSentence(text: string): string {
  const cleaned = text.trim()
  return /[.!?]$/u.test(cleaned) ? cleaned : `${cleaned}.`
}

export function compactOutgoingBridge(bridge: string | null): string | null {
  if (!bridge) return null
  const bridgeWords = bridge.trim().split(/\s+/u)
  if (bridgeWords.length <= 18) return bridge.trim()
  return completeSentence(bridgeWords.slice(0, 18).join(' '))
}

/** Titolo dalla prima riga: entra nel seed raster e nel pannello. */
function titleFromLine(line: string | undefined): string {
  const titleWords = words(line ?? 'sogno in movimento')
    .filter((word) => word.length >= 4)
    .slice(0, 3)
  return titleWords.length >= 2
    ? titleWords
        .map((word) => `${word.charAt(0).toLocaleUpperCase()}${word.slice(1)}`)
        .join(' ')
    : 'Sogno in movimento'
}

/** Storia minima quando la storia di Qwen fallisce: solo percorso storico
 * (DEP-002), mai negli episodi. */
function fallbackUiCore(phrases: readonly string[]): StoryCore {
  const synopsis = phrases.map(completeSentence).join(' ')
  const title = titleFromLine(phrases[0])
  const lastPhrase = completeSentence(phrases.at(-1) ?? 'Un segnale resta in attesa')
  return {
    title,
    synopsis,
    bridge: `${lastPhrase.replace(/[.!?]$/u, '')} apre un dettaglio inatteso oltre la soglia successiva.`,
    palette: [...DEFAULT_DREAM_PALETTE],
    invariant: inferInvariant(phrases, synopsis),
  }
}

export function inferMainArgument(source: readonly string[], synopsis: string): string {
  const text = `${source.join(' ')} ${synopsis}`.toLocaleLowerCase()
  if (/psicolog|psycholog|trauma|paura|fear|memoria|memory|identit|identity/iu.test(text)) {
    return 'psychological transformation and memory'
  }
  if (/educazion|education|impar|learn|insegn|teach/iu.test(text)) {
    return 'learning, education and discovery'
  }
  if (/incontro|relationship|relazione|dialog|conversation|coppia|couple|gruppo|group|umani|human/iu.test(text)) {
    return 'human relationships and social interaction'
  }
  return 'dream narrative and sensory transformation'
}

export function storyFromCore(core: StoryCore, phrases: string[]): DreamStory {
  const moments = splitIntoFourMoments(core.synopsis)
  const labels = ['Apertura', 'Richiamo', 'Sviluppo', 'Attrito', 'Trasformazione', 'Esito']
  const energies = [0.26, 0.42, 0.58, 0.78, 0.9, 0.66]
  return {
    id: `story-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: core.title,
    synopsis: core.synopsis,
    bridge: core.bridge,
    continuityPhrase: null,
    palette: core.palette,
    sourcePhrases: phrases,
    mainArgument: inferMainArgument(phrases, core.synopsis),
    invariant: core.invariant,
    frames: moments.map((description, index) => ({
      id: `frame-${index + 1}`,
      title: labels[index],
      description,
      visualIntent: `Scena narrativa concreta con un soggetto riconoscibile e una sola azione visibile: ${description}`,
      energy: energies[index],
      durationMs: getBrainRenderingConfig().timing.frameDurationMs,
    })),
  }
}

export function buildFallbackDreamStory(phrases: readonly string[]): DreamStory {
  const sourcePhrases = phrases.map((phrase) => phrase.trim()).filter(Boolean)
  return storyFromCore(fallbackUiCore(sourcePhrases), sourcePhrases)
}

function similarity(left: string, right: string): number {
  const leftWords = new Set(words(left).filter((word) => word.length > 2))
  const rightWords = new Set(words(right).filter((word) => word.length > 2))
  const intersection = [...leftWords].filter((word) => rightWords.has(word)).length
  const union = new Set([...leftWords, ...rightWords]).size
  return union === 0 ? 1 : intersection / union
}

export type DreamStoryMemory = Pick<DreamStory, 'title' | 'synopsis'>
export type SessionMemo = [string, string, string]
export type VisualPlan = [string, string, string, string]

export function selectSessionSynthesisInterval(
  random: () => number = Math.random,
): number {
  const span =
    BRAIN_CONFIG.sessionSynthesisMaxStories -
    BRAIN_CONFIG.sessionSynthesisMinStories +
    1
  return (
    BRAIN_CONFIG.sessionSynthesisMinStories +
    Math.floor(clamp(random(), 0, 0.999999) * span)
  )
}

export function parseSessionMemo(text: string): SessionMemo | null {
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/[*`]/g, '')
    .trim()
  const labeled = [1, 2, 3].map((index) =>
    labeledBlock(cleaned, `MEMO${index}`, index < 3 ? [`MEMO${index + 1}`] : []),
  )
  const candidates = labeled.every((sentence) => sentence !== null)
    ? labeled
    : splitSentences(cleaned)
  if (candidates.length !== 3) return null
  const sentences = candidates.map((sentence) => requiredText(sentence, 6))
  if (sentences.some((sentence) => sentence === null)) return null
  const memo = sentences as SessionMemo
  if (!appearsItalian(memo.join(' '))) return null
  if (new Set(memo.map(normalizedSentence)).size !== 3) return null
  return memo
}

export function parseVisualPlan(text: string): VisualPlan | null {
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/[*`]/g, '')
    .trim()
  const prompts = [1, 2, 3, 4].map((index) =>
    requiredText(
      labeledBlock(
        cleaned,
        `VISUAL${index}`,
        index < 4 ? [`VISUAL${index + 1}`] : [],
      ),
      8,
    ),
  )
  if (prompts.some((prompt) => prompt === null)) return null
  const plan = prompts as VisualPlan
  if (new Set(plan.map(normalizedSentence)).size !== 4) return null
  return plan
}

type StoryGenerationOptions = {
  sessionMemo?: readonly string[]
  sessionSynthesis?: boolean
  continuitySeed?: string | null
  recentBridges?: readonly string[]
  consciousnessInfluence?: ConsciousnessMotionCandidate | null
}

export function bridgeIsNew(
  bridge: string | null,
  continuitySeed: string | null,
  recentBridges: readonly string[],
): boolean {
  if (!bridge || words(bridge).length < 5) return false
  const candidates = [
    ...(continuitySeed ? [continuitySeed] : []),
    ...recentBridges,
  ]
  return candidates.every(
    (previous) =>
      normalizedSentence(bridge) !== normalizedSentence(previous) &&
      similarity(bridge, previous) < 0.58,
  )
}

export function resemblesRecentStory(
  story: DreamStoryMemory,
  recentStories: readonly DreamStoryMemory[],
): DreamStoryMemory | null {
  const normalizedTitle = normalizedSentence(story.title)
  return recentStories.find((recent) => {
    const sameTitle = normalizedTitle === normalizedSentence(recent.title)
    const synopsisSimilarity = similarity(story.synopsis, recent.synopsis)
    return sameTitle || synopsisSimilarity >= 0.5
  }) ?? null
}

export function normalizeStory(value: unknown, phrases: string[]): DreamStory | null {
  const data = asRecord(value)
  if (!data || !Array.isArray(data.frames)) return null
  const title = requiredText(data.title, 2)
  const synopsis = requiredText(data.synopsis, 35)
  if (!title || !synopsis) return null
  if (!isRenderableNarrative(synopsis)) return null
  if (!appearsItalian(`${title} ${synopsis}`)) return null
  if (hasRepeatedNarrativeSentence(synopsis)) return null
  const normalizedSynopsis = synopsis.toLocaleLowerCase()
  const copiedPhraseCount = phrases.filter((phrase) =>
    normalizedSynopsis.includes(phrase.toLocaleLowerCase()),
  ).length
  const sourceWords = new Set(phrases.flatMap(words))
  const synopsisWords = words(synopsis)
  const novelWordRatio =
    synopsisWords.filter((word) => !sourceWords.has(word)).length / Math.max(1, synopsisWords.length)
  if (copiedPhraseCount >= 2 && novelWordRatio < 0.18) return null
  const frameCount = clamp(data.frames.length, BRAIN_CONFIG.storyFrameMin, BRAIN_CONFIG.storyFrameMax)
  if (frameCount < BRAIN_CONFIG.storyFrameMin) return null
  const frames: DreamFrame[] = []
  for (let index = 0; index < frameCount; index++) {
    const frame = asRecord(data.frames[index])
    if (!frame) return null
    const frameTitle = requiredText(frame.title, 1)
    const description = requiredText(frame.description, 8)
    const visualIntent = requiredText(frame.visualIntent, 6)
    if (!frameTitle || !description || !visualIntent) return null
    frames.push({
      id: `frame-${index + 1}`,
      title: frameTitle.slice(0, 80),
      description: description.slice(0, 420),
      visualIntent: visualIntent.slice(0, 360),
      energy: clamp(typeof frame.energy === 'number' ? frame.energy : (index + 1) / frameCount, 0.05, 1),
      durationMs: getBrainRenderingConfig().timing.frameDurationMs,
    })
  }
  if (new Set(frames.map((frame) => normalizedSentence(frame.description))).size < frameCount) {
    return null
  }
  if (new Set(frames.map((frame) => normalizedSentence(frame.visualIntent))).size < 3) {
    return null
  }
  for (let left = 0; left < frames.length; left++) {
    for (let right = left + 1; right < frames.length; right++) {
      if (
        similarity(frames[left].description, frames[right].description) >= 0.78 ||
        similarity(frames[left].visualIntent, frames[right].visualIntent) >= 0.78
      ) {
        return null
      }
    }
  }
  return {
    id: `story-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: title.slice(0, 100),
    synopsis: synopsis.slice(0, 1_200),
    bridge: requiredText(data.bridge, 6)?.slice(0, 420) ?? null,
    continuityPhrase: requiredText(data.continuityPhrase, 6)?.slice(0, 420) ?? null,
    palette: paletteFromUnknown(data.palette),
    sourcePhrases: phrases,
    mainArgument:
      requiredText(data.mainArgument, 3)?.slice(0, 160) ??
      inferMainArgument(phrases, synopsis),
    invariant:
      requiredText(data.invariant, 1)?.slice(0, 120) ??
      inferInvariant(phrases, synopsis),
    frames,
  }
}

/**
 * WORKFLOW DELL'EPISODIO (PIANO-051; struttura canonica fissata dal Capo
 * Supremo, direttiva del Vicario 2026-11-06). Una riga degli scribacchini è un
 * episodio di quattro immagini:
 *
 *   SOGLIA        = riga di brainPhrasesBaseStory, alla lettera   → immagine 1
 *   METAMORFOSI   = Qwen(Soglia)                                 → immagine 2
 *   CONDENSAZIONE = Qwen(Soglia + Metamorfosi)                   → immagine 3
 *   ECO           = Qwen(Soglia + Metamorfosi + Condensazione)   → immagine 4
 *
 * Ogni richiesta a Qwen riceve soltanto l'episodio già manifestato, più le
 * regole degli scribacchini e la direttiva della propria fase: nessun
 * materiale esterno all'episodio. Il testo di ogni fase è il prompt di Stable
 * Diffusion della sua immagine (`buildPsychedelImagePrompt`).
 *
 * FALLBACK (disp. Capo Supremo 2026-10-19): una fase che Qwen non produce o
 * che `parseEpisodePhaseLine` rifiuta è sostituita dalla Soglia. Il testo
 * sostituito è ciò che arriva a Stable Diffusion, quindi è anche ciò che le
 * fasi successive ricevono come immagine già manifestata. Ogni sostituzione
 * è registrata nel log «fase dell'episodio».
 *
 * Questa tabella è l'unica definizione delle fasi dell'episodio: prompt,
 * etichette dei fotogrammi, log e test la leggono da qui.
 */
export const EPISODE_THRESHOLD = { title: 'Soglia', label: 'THRESHOLD' } as const

export const EPISODE_PHASES = [
  // Direttive: definizioni del Capo Supremo (PIANO-058 D1) e principi di
  // filosofia.md §2, in inglese; nessun numero d'immagine, che Qwen copiava
  // nella fase (log 19–31 ottobre).
  {
    title: 'Metamorfosi',
    label: 'METAMORPHOSIS',
    directive:
      'the material of the scene begins to transform and to lose stability. It is the first slip, not a new chapter: something moves or fuses, the recurring element stays but changes form or function.',
  },
  {
    title: 'Condensazione',
    label: 'CONDENSATION',
    directive:
      'the elements of the dream concentrate, overlap and gain greater density. Two things become one. The meaning does not become clearer, it becomes more intense.',
  },
  {
    title: 'Eco',
    label: 'ECHO',
    directive:
      'what remains of the dream: a return, a residue, a deformation or a memory of the first scene. Not a closed ending: it leaves a trace, with ambiguity, without explanation.',
  },
] as const

export type EpisodePhaseLines = [string | null, string | null, string | null]

/** Esito di una fase, così come va nel log: cosa ha visto Qwen, cosa ha
 * scritto, se è stato accettato e quale testo arriva a Stable Diffusion. */
export type EpisodePhaseOutcome = {
  phase: (typeof EPISODE_PHASES)[number]['label']
  prompt: string
  response: string | null
  accepted: boolean
  fallback: 'soglia' | null
  text: string
}

const EPISODE_LINE_MIN_WORDS = 10
// 45 → 50 (+10%, PIANO-058 D7, posizione del Vicario 2026-11-06).
const EPISODE_LINE_MAX_WORDS = 50
// Metalinguaggio che non deve arrivare a Stable Diffusion (PIANO-058 D8):
// termini elencati dal Vicario, `echo` escluso per decisione del Capo Supremo.
const EPISODE_METALANGUAGE =
  /\bimages?\s*\d|\bmetamorphosis\b|\bcondensation\b|\belements of (?:the )?images?\b|\bprevious image\b/iu
const EPISODE_FRAME_ENERGIES = [0.26, 0.42, 0.58, 0.78] as const

// Nessun filtro: il contenuto non si ammorbidisce (disposizione del Capo
// Supremo 2026-10-19). Vale per le fasi e per le frasi del pubblico.
const SCRIBE_NO_CENSORSHIP_RULE =
  'Do not censor, soften or euphemize anything. If sexual content appears, every person involved is an adult.'

// Corpo e inquadratura (linee guida degli scribacchini): valgono anche per
// le fasi.
const SCRIBE_BODY_RULE =
  'Show the body through posture and gesture, never through feelings. Wide framing: no close-ups of hands or fingers.'

// Regole degli scribacchini (docs/linee-guida-storie-brain.md) per la
// riscrittura delle frasi del pubblico. Le fasi dell'episodio hanno la
// propria richiesta (`buildEpisodePhasePrompt`).
function scribeRules(): string[] {
  return [
    'Rules for every line: 15-30 English words; one concrete visible scene; the same named person; one place; one gesture or action; light and materials.',
    SCRIBE_BODY_RULE,
    'Use only words that can be seen: no abstract concepts, quotations, negations, memories or time jumps.',
    SCRIBE_NO_CENSORSHIP_RULE,
  ]
}

function contextBlock(label: string, context: readonly string[]): string[] {
  const lines = context.map((line) => line.trim()).filter(Boolean)
  return lines.length > 0 ? [`${label}:\n${lines.map((line) => `- ${line}`).join('\n')}`] : []
}

/**
 * Richiesta a Qwen per la fase successiva all'episodio già manifestato.
 * `manifested` = [Soglia] per la Metamorfosi, [Soglia, Metamorfosi] per la
 * Condensazione, [Soglia, Metamorfosi, Condensazione] per l'Eco: la fase da
 * scrivere è sempre quella che segue l'ultima immagine ricevuta.
 */
export function buildEpisodePhasePrompt(manifested: readonly string[]): string {
  const phase = EPISODE_PHASES[manifested.length - 1]
  if (!phase) {
    throw new Error(`episodio: nessuna fase dopo ${manifested.length} immagini`)
  }
  // Richiesta fondata sui principi delle fasi (PIANO-058 §4.3, D9/D10): la
  // materia distintiva della Soglia si trasforma invece di essere sostituita.
  return [
    'A dream transforms the same scene step by step. Each step transforms the previous one; it does not only add content.',
    ...manifested.map((text, index) => `${index === 0 ? 'FIRST SCENE' : 'THEN'}: ${text}`),
    `Now the dream reaches ${phase.label}: ${phase.directive}`,
    'Keep the person with the complete physical description of the first scene, in the third person. Transform the distinctive things of the scene; do not replace them with other places, objects or actions.',
    // Il testo della fase è il prompt di Stable Diffusion, che non conosce i
    // nomi: la persona passa solo dalla descrizione (disp. Capo Supremo
    // 2026-11-06). `buildPsychedelImagePrompt` toglie comunque i nomi residui.
    'Never write names of people: the image generator does not know them. Write the physical description instead of the name.',
    'Describe only what is physically visible in the resulting scene. Never mention images, scenes, phases, prompts, dreams or instructions.',
    SCRIBE_BODY_RULE,
    SCRIBE_NO_CENSORSHIP_RULE,
    'Write one sentence, 20-50 English words, on one line.',
  ].join('\n')
}

export function buildPublicPhraseRewritePrompt(
  phrase: string,
  context: readonly string[] = [],
): string {
  return [
    'Rewrite an audience phrase as one line of the story in progress.',
    `AUDIENCE PHRASE: ${phrase}`,
    ...contextBlock('STORY IN PROGRESS', context),
    'Keep everything the phrase says and shows. Link it to the main elements of the story in progress: its protagonist, its recurring object or material, its place.',
    ...scribeRules(),
    'Return exactly one line beginning LINE:.',
  ].join('\n')
}

function cleanedModelText(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/[*`#]/g, '')
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .join('\n')
    .trim()
}

function firstLineOf(block: string | null): string | null {
  return block?.split(/\r?\n/u).map((line) => line.trim()).find(Boolean) ?? null
}

function acceptableEpisodeLine(line: string | null): string | null {
  if (!line) return null
  const count = line.split(/\s+/u).length
  return count >= EPISODE_LINE_MIN_WORDS && count <= EPISODE_LINE_MAX_WORDS ? line : null
}

/** Prime frasi della riga entro il massimo di parole: un modello che si
 * dilunga in un paragrafo resta utilizzabile per la sua prima scena. */
function leadingSentences(line: string): string {
  const sentences = line.match(/[^.!?]+[.!?]*/gu)?.map((sentence) => sentence.trim()) ?? [line]
  let kept = ''
  for (const sentence of sentences) {
    const next = kept ? `${kept} ${sentence}` : sentence
    if (next.split(/\s+/u).length > EPISODE_LINE_MAX_WORDS) break
    kept = next
    if (kept.split(/\s+/u).length >= EPISODE_LINE_MIN_WORDS) break
  }
  return kept || line
}

const EPISODE_LABEL_PREFIX = new RegExp(
  `^(?:IMAGE\\s*\\d+|FIRST SCENE|THEN|${[EPISODE_THRESHOLD, ...EPISODE_PHASES].map((phase) => phase.label).join('|')})\\s*(?:\\([^)]*\\))?\\s*:\\s*`,
  'iu',
)

export function parseEpisodePhaseLine(
  text: string,
  alreadyUsed: readonly string[],
): string | null {
  const first = firstLineOf(cleanedModelText(text))
    ?.replace(EPISODE_LABEL_PREFIX, '')
    .replace(/^["“']+|["”']+$/gu, '')
    .trim()
  const line = acceptableEpisodeLine(first ? leadingSentences(first) : null)
  if (!line || EPISODE_METALANGUAGE.test(line)) return null
  const used = new Set(alreadyUsed.map(normalizedSentence))
  return used.has(normalizedSentence(line)) ? null : line
}

export function parsePublicPhraseRewrite(text: string): string | null {
  const cleaned = cleanedModelText(text)
  return acceptableEpisodeLine(
    firstLineOf(labeledBlock(cleaned, 'LINE', [])) ?? firstLineOf(cleaned),
  )
}

/**
 * Le quattro immagini dell'episodio come `DreamStory`. `phases` sono le fasi
 * accettate (`null` = fase sostituita dalla Soglia); con `phases === null` la
 * Soglia vale per tutte e quattro le immagini (seed diversi): nessun episodio
 * perso. Nessun invariante nel prompt raster: ogni immagine riceve solo il
 * proprio testo («chi sogna non è Stable Diffusion»).
 */
export function storyFromLine(line: string, phases: EpisodePhaseLines | null): DreamStory {
  const source = line.trim()
  const texts = [source, ...(phases ?? [null, null, null]).map((phase) => phase ?? source)]
  const titles = [EPISODE_THRESHOLD.title, ...EPISODE_PHASES.map((phase) => phase.title)]
  // Testi uguali (Soglia ripetuta quando le fasi mancano) una sola volta.
  const synopsis = [...new Set(texts)].map(completeSentence).join(' ')
  return {
    id: `story-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: titleFromLine(source),
    synopsis,
    // Nessun legame in uscita: l'episodio non ne scrive (PIANO-058).
    bridge: null,
    continuityPhrase: null,
    palette: [...DEFAULT_DREAM_PALETTE],
    sourcePhrases: [source],
    mainArgument: inferMainArgument([source], synopsis),
    invariant: '',
    frames: texts.map((text, index) => ({
      id: `frame-${index + 1}`,
      title: titles[index],
      description: text,
      imagePrompt: text,
      visualIntent: text,
      energy: EPISODE_FRAME_ENERGIES[index],
      durationMs: getBrainRenderingConfig().timing.frameDurationMs,
    })),
  }
}

type EpisodeGenerationOptions = {
  consciousnessInfluence?: ConsciousnessMotionCandidate | null
}

export class CoscienzaOnirica {
  constructor(
    private readonly ai: Pick<BrainAiClient, 'generate'> &
      Partial<Pick<BrainAiClient, 'releaseTranslationModels'>>,
    private readonly translator?: Pick<
      BrainTranslator,
      'inputsToEnglish' | 'storyForUi'
    > & { inputTranslationEnabled?: () => boolean },
  ) {}

  async generate(
    phrases: string[],
    recentStories: readonly DreamStoryMemory[] = [],
    options: StoryGenerationOptions = {},
  ): Promise<DreamStory> {
    const sessionSynthesis = options.sessionSynthesis === true
    const continuitySeed = options.continuitySeed?.trim() || null
    const recentBridges = options.recentBridges ?? []
    const consciousnessInfluence = options.consciousnessInfluence ?? null
    let englishVisualMoments: string[] | null = null
    let englishInvariant: string | null = null
    let englishDisplay: Pick<
      DreamStory,
      'englishTitle' | 'englishSynopsis' | 'englishBridge'
    > | null = null
    let englishCore: StoryCore | null = null
    const recentStoriesForValidation = sessionSynthesis
      ? recentStories.filter(
          (story) => normalizedSentence(story.title) !== 'questo sogno',
        )
      : recentStories
    const prepareStory = (story: DreamStory): DreamStory => {
      if (!isRenderableNarrative(story.synopsis)) {
        throw new Error(
          'CoscienzaOnirica ha prodotto metadati o momenti insufficienti al posto della storia',
        )
      }
      const originalBridge = story.bridge
      story.bridge = compactOutgoingBridge(story.bridge)
      if (originalBridge !== story.bridge) {
        brainWarn('coscienza', 'anello di giunzione troppo lungo; compatto per la storia successiva', {
          originalWords: words(originalBridge ?? '').length,
          compactedWords: words(story.bridge ?? '').length,
        })
      }
      if (!bridgeIsNew(story.bridge, continuitySeed, recentBridges)) {
        throw new Error(
          'CoscienzaOnirica non ha prodotto un nuovo anello di giunzione',
        )
      }
      story.continuityPhrase = continuitySeed
      if (englishDisplay) Object.assign(story, englishDisplay)
      if (englishInvariant) story.invariant = englishInvariant
      if (englishVisualMoments?.length === story.frames.length) {
        story.frames.forEach((frame, index) => {
          frame.imagePrompt = englishVisualMoments?.[index]
        })
      }
      if (sessionSynthesis) {
        story.title = 'Questo sogno'
        story.sessionSynthesis = true
      }
      if (consciousnessInfluence) {
        story.palette = applyConsciousnessPalette(
          story.palette,
          consciousnessInfluence,
        )
        story.consciousnessInfluence = {
          memoryId: consciousnessInfluence.memoryId,
          kind: consciousnessInfluence.kind,
          title: consciousnessInfluence.title,
          relevanceReason: consciousnessInfluence.relevanceReason,
        }
      }
      return story
    }
    brainLog('coscienza', 'generazione storia avviata', {
      phrases,
      recentStories: recentStories.map((story) => story.title),
      sessionMemo: options.sessionMemo ?? [],
      sessionSynthesis,
      continuitySeed,
      recentBridges,
      consciousnessInfluence: consciousnessInfluence
        ? {
            memoryId: consciousnessInfluence.memoryId,
            kind: consciousnessInfluence.kind,
            relevance: consciousnessInfluence.relevanceReason,
          }
        : null,
    })
    const translatedInputs = this.translator
      ? await this.translator.inputsToEnglish(
          continuitySeed ? [...phrases, continuitySeed] : phrases,
        )
      : continuitySeed
        ? [...phrases, continuitySeed]
        : phrases
    if (this.translator && this.ai.releaseTranslationModels) {
      await this.ai.releaseTranslationModels()
      brainLog(
        'coscienza',
        'traduttore input rilasciato prima del caricamento narrativo',
        {
          translatedInputs: translatedInputs.length,
          nextModel: BRAIN_CONFIG.storyModelId,
        },
      )
    }
    const narrativePhrases = translatedInputs.slice(0, phrases.length)
    const dedicatedInputTranslation =
      this.translator?.inputTranslationEnabled?.() ?? false
    const translatedContinuitySeed = continuitySeed
      ? translatedInputs.at(-1) ?? continuitySeed
      : null
    const recentStoryConstraint =
      recentStories.length > 0
        ? [
            'Do not repeat the titles, protagonists or plots of these recent stories:',
            recentStories
              .slice(-BRAIN_CONFIG.storyMemoryCount)
              .map((story) => story.title)
              .join('; '),
          ].join('\n')
        : 'Avoid generic plots and familiar formulas. Invent one specific event.'
    const continuityConstraint = translatedContinuitySeed
      ? [
          'LIGHT CONTINUITY SEED FROM THE PREVIOUS STORY:',
          translatedContinuitySeed,
          'Let this seed influence only one secondary detail. Do not continue the previous plot or make it the main subject.',
        ].join('\n')
      : 'This is the first story in the cycle; invent its outgoing bridge freely.'
    const synthesisConstraint = sessionSynthesis
      ? [
          'This is the periodic synthesis of everything Brain has understood in this session.',
          'Transform the session memo into one new concrete story, not a summary or a list.',
          'The title must be exactly: Questo sogno',
          `SESSION MEMO:\n${(options.sessionMemo ?? []).map((sentence) => `- ${sentence}`).join('\n')}`,
        ].join('\n')
      : 'This is an ordinary new dream in the session.'
    const consciousnessConstraint = consciousnessInfluence
      ? [
          'LIMITED CONSCIOUSNESS MOTION:',
          `Provenance: ${consciousnessInfluence.kind}. Source memory: ${consciousnessInfluence.title}.`,
          `Influence: ${consciousnessInfluence.influenceText}`,
          `Reason: ${consciousnessInfluence.relevanceReason}.`,
          'Let it change one concrete story element and one local visual form.',
          'Keep it secondary and traceable. If provenance is imagination, never present it as an external fact.',
        ].join('\n')
      : 'No consciousness motion is active for this story.'
    const storyPrompt = [
      'WRITE ONE STORY NOW. Output only the five requested lines.',
      ...(this.translator
        ? ['Write the complete intermediate story in natural English.']
        : ['Think privately in English if useful. The visible answer must contain only natural Italian.']),
      // Brief del Vicario «Correzione della grammatica narrativa» (2026-10-11):
      // tolti l'ordine cronologico rigido e la causalità obbligatoria.
      'STORY must contain 55-80 words. Write 4-6 complete sentences as one continuous narrative. The sequence may use ellipsis and does not need to explain every connection.',
      // Manuale di sceneggiatura kubrickiano, nota del Vicario (2026-10-11,
      // team/briefs/manuale-sceneggiatura-kubrickiana-2026-10-11.md): la
      // vecchia riga «named adult protagonist … initiating event, conflict,
      // transformation and conclusion» diventava intestazioni nella storia.
      // «Inside STORY» (disp. Capo Supremo 2026-10-11): il divieto di
      // etichette vale dentro la storia, non per le righe del formato.
      `Inside ${this.translator ? 'STORY' : 'STORIA'}, write one continuous narrative with no headings or labels. Build the story around a person in a concrete place and use a few strong visual situations. Let the story freely generate its characters, names and relationships. Each situation should visibly change a relationship between a person, object, body or place. Let motives and causes remain partly inferable. Do not explain themes or name narrative functions. End with a concrete image or action that changes the meaning of something seen earlier.`,
      'Let connections between the source prompts emerge through events, association or partial causality. Some links may remain implicit. Never discuss or copy the instructions.',
      // Libertà del 2026-10-10 nella forma della nota del Vicario
      // (2026-10-11): l'adultità è un vincolo solo se compare materiale
      // sessuale, non per tutta la generazione. PIANO-053: nessun ramo
      // testuale dipende dal blocco immagini d'emergenza.
      'Associate freely. Sex, tenderness, violence, humor, absurdity or other material may appear if the story leads there. If sexual content appears, every person involved must be an adult.',
      recentStoryConstraint,
      continuityConstraint,
      synthesisConstraint,
      consciousnessConstraint,
      'BRIDGE must be one new concrete open-ended sentence of 8-16 words.',
      'INVARIANT must name one concrete recurring subject, body, shape or material from the story (2-6 words, a noun phrase, not a theme or emotion) that can persist and be transformed across the four visual moments.',
      ...(recentBridges.length > 0
        ? [
            `NEVER REPEAT THESE EARLIER BRIDGES:\n${recentBridges
              .slice(-BRAIN_CONFIG.storyMemoryCount)
              .map((bridge) => `- ${bridge}`)
              .join('\n')}`,
          ]
        : []),
      ...(dedicatedInputTranslation
        ? [
            `ENGLISH INPUT PROMPTS:\n${narrativePhrases.map((phrase) => `- ${phrase}`).join('\n')}`,
            `AUTHORITATIVE ORIGINAL ITALIAN PROMPTS:\n${phrases.map((phrase) => `- ${phrase}`).join('\n')}`,
          ]
        : [
            `SOURCE INPUT PROMPTS (Italian or English; understand them directly):\n${narrativePhrases.map((phrase) => `- ${phrase}`).join('\n')}`,
          ]),
      // COLORS non si chiede più (2026-10-11): la palette non entra nella
      // generazione (filosofia.md §2.2) e il modello la scriveva nell'11%
      // delle storie; i token liberati servono all'INVARIANT, l'ultima riga.
      // Se il modello la scrive comunque, il parser la accetta.
      `Return exactly four lines. Line 1 starts with ${this.translator ? 'TITLE' : 'TITOLO'}:.`,
      `Line 2 starts with ${this.translator ? 'STORY' : 'STORIA'}: and contains the complete story.`,
      `Line 3 starts with ${this.translator ? 'BRIDGE' : 'LEGAME'}: and contains the outgoing bridge only.`,
      `Line 4 starts with ${this.translator ? 'INVARIANT' : 'INVARIANTE'}: and contains only the recurring noun phrase.`,
      'No markdown, headings, lists, notes, placeholders or extra fields.',
    ].join('\n')
    try {
      let coreText = await this.ai.generate('story', storyPrompt, {
        maxNewTokens: BRAIN_CONFIG.storyMaxNewTokens,
        minNewTokens: 48,
      })
      if (this.translator) {
        const normalizedEnglishStory = normalizeEnglishStoryEnvelope(coreText)
        const englishSynopsis = normalizedEnglishStory
          ? labeledBlock(normalizedEnglishStory, 'STORY', ['BRIDGE'])
          : null
        if (!englishSynopsis || !isRenderableNarrative(englishSynopsis)) {
          brainWarn(
            'coscienza',
            'risposta inglese priva di una trama; uso il fallback locale senza richiamare Qwen',
            {
              response: coreText.slice(0, 2_000),
              normalizedStory: englishSynopsis,
            },
          )
          throw new Error('CoscienzaOnirica non ha prodotto una storia inglese completa')
        }
        if (!normalizedEnglishStory || !englishSynopsis) {
          brainWarn('coscienza', 'autocorrezione inglese incompleta', {
            response: coreText.slice(0, 2_000),
          })
          throw new Error(
            'CoscienzaOnirica non ha prodotto una storia inglese completa',
          )
        }
        if (!isRenderableNarrative(englishSynopsis)) {
          brainWarn(
            'coscienza',
            'storia rifiutata: contiene metadati o non offre quattro momenti visivi',
            {
              generatedStory: englishSynopsis ?? normalizedEnglishStory,
            },
          )
          throw new Error(
            'CoscienzaOnirica ha prodotto metadati o momenti insufficienti al posto della storia',
          )
        }
        englishDisplay = {
          englishTitle:
            labeledBlock(normalizedEnglishStory, 'TITLE', ['STORY']) ?? undefined,
          englishSynopsis,
          englishBridge:
            labeledBlock(normalizedEnglishStory, 'BRIDGE', ['COLORS', 'INVARIANT']) ?? null,
        }
        englishCore = storyCoreFromEnglishEnvelope(normalizedEnglishStory, narrativePhrases)
        if (englishSynopsis) {
          const invariant = englishCore?.invariant
            ?? inferInvariant(narrativePhrases, englishSynopsis)
          englishInvariant = invariant
          try {
            englishVisualMoments = await this.generateVisualPlan(englishSynopsis, invariant)
          } catch (visualPlanError) {
            brainWarn(
              'psichedel',
              'visual plan non disponibile; uso la segmentazione meccanica come rete di sicurezza',
              { error: visualPlanError },
            )
            englishVisualMoments = splitIntoFourMoments(englishSynopsis)
          }
        }
        if (normalizedEnglishStory !== coreText.replace(/[*`]/g, '').trim()) {
          brainLog(
            'coscienza',
            'storia inglese recuperata da un formato narrativo non conforme',
            {
              original: coreText.slice(0, 2_000),
              recovered: normalizedEnglishStory.slice(0, 2_000),
            },
          )
        }
        coreText = await this.translator.storyForUi(normalizedEnglishStory)
      }
      const legacyCompleteStory = storyFromResponse(coreText, phrases)
      if (legacyCompleteStory) prepareStory(legacyCompleteStory)
      const legacyDuplicate = legacyCompleteStory
        ? resemblesRecentStory(legacyCompleteStory, recentStoriesForValidation)
        : null
      if (legacyDuplicate) {
        throw new Error(
          `CoscienzaOnirica ha ripetuto la storia recente "${legacyDuplicate.title}"`,
        )
      }
      if (legacyCompleteStory) {
        brainLog('coscienza', 'storia completa ricevuta in un solo passaggio', legacyCompleteStory)
        return legacyCompleteStory
      }

      let core = storyCoreFromResponse(coreText, phrases)
      if (!core && this.translator) {
        // Quando la traduzione UI è disattivata, storyForUi mantiene
        // intenzionalmente titolo e trama in inglese. Il parser italiano li
        // rifiuta: usare qui le frasi sorgente perdeva la storia già valida e,
        // con input brevi, prepareStory la scartava innescando il loop.
        core = englishCore ?? fallbackUiCore(narrativePhrases)
        brainWarn(
          'coscienza',
          'traduzione UI assente; mantengo la storia inglese verificata senza scartarla',
          {
            translatedUi: coreText.slice(0, 2_000),
            fallbackTitle: core.title,
            fallbackBridge: core.bridge,
            imagePrompts: englishVisualMoments,
          },
        )
      }
      if (!core) {
        brainWarn('coscienza', 'nucleo narrativo non valido; uso il fallback locale senza richiamare Qwen', {
          response: coreText.slice(0, 3_000),
        })
      }
      if (!core) {
        throw new Error('CoscienzaOnirica non ha prodotto un nucleo narrativo valido')
      }
      brainLog('coscienza', 'nucleo narrativo verificato', core)
      const story = prepareStory(storyFromCore(core, phrases))
      const duplicate = resemblesRecentStory(story, recentStoriesForValidation)
      if (duplicate) {
        brainWarn('coscienza', 'storia rifiutata perché troppo simile a una storia recente', {
          generatedTitle: story.title,
          recentTitle: duplicate.title,
        })
        throw new Error(`CoscienzaOnirica ha ripetuto la storia recente "${duplicate.title}"`)
      }
      brainLog('coscienza', 'fotogrammi ricavati dalla storia AI verificata', {
        method: 'segmentazione cronologica deterministica',
        story,
      })
      return story
    } catch (error) {
      if (error instanceof BrainAiCancelledError) throw error
      const fallback = buildFallbackDreamStory(phrases)
      fallback.continuityPhrase = continuitySeed
      if (sessionSynthesis) {
        fallback.title = 'Questo sogno'
        fallback.sessionSynthesis = true
      }
      if (consciousnessInfluence) {
        fallback.palette = applyConsciousnessPalette(
          fallback.palette,
          consciousnessInfluence,
        )
        fallback.consciousnessInfluence = {
          memoryId: consciousnessInfluence.memoryId,
          kind: consciousnessInfluence.kind,
          title: consciousnessInfluence.title,
          relevanceReason: consciousnessInfluence.relevanceReason,
        }
      }
      brainWarn('coscienza', 'generazione Qwen fallita; fallback visuale locale senza seconda chiamata', {
        error,
        fallbackStoryId: fallback.id,
      })
      return fallback
    }
  }

  async generateSessionMemo(
    previousMemo: readonly string[],
    completedStory: DreamStoryMemory,
  ): Promise<SessionMemo> {
    const prompt = [
      'Update Brain session memory after the completed story.',
      'Understand the general meaning, recurring relationships and transformation across the whole session.',
      'Do not summarize only the latest plot. Merge it with the previous memory.',
      'Write exactly three distinct, self-contained sentences in natural Italian.',
      'Each sentence must express a general insight that can inspire future stories.',
      'Return exactly three lines beginning MEMO1:, MEMO2:, MEMO3:.',
      `MEMORIA PRECEDENTE:\n${
        previousMemo.length > 0
          ? previousMemo.map((sentence) => `- ${sentence}`).join('\n')
          : '- Nessuna memoria precedente: questa è la prima storia.'
      }`,
      `STORIA APPENA CONCLUSA:\nTitolo: ${completedStory.title}\n${completedStory.synopsis}`,
    ].join('\n')
    brainLog('memoria', 'scrittura del memo di sessione avviata', {
      previousMemo,
      completedStory,
    })
    const response = await this.ai.generate('memo', prompt, {
      maxNewTokens: 180,
      minNewTokens: 48,
    })
    const memo = parseSessionMemo(response)
    if (!memo) {
      brainWarn('memoria', 'memo AI rifiutato; la storia può continuare', {
        response: response.slice(0, 2_000),
      })
      throw new Error('Brain non ha prodotto tre frasi di memoria valide')
    }
    brainLog('memoria', 'memo di sessione aggiornato', { memo })
    return memo
  }

  /**
   * Episodio da una riga, secondo il workflow descritto sopra
   * `EPISODE_PHASES`: Soglia letterale, poi una richiesta a Qwen per fase,
   * ciascuna con l'episodio già manifestato.
   */
  async generateEpisode(
    line: string,
    options: EpisodeGenerationOptions = {},
  ): Promise<DreamStory> {
    const source = line.trim()
    // Una Soglia vuota darebbe quattro prompt vuoti a Stable Diffusion.
    if (!source) throw new Error('episodio rifiutato: riga vuota')
    const manifested: string[] = [source]
    const outcomes: EpisodePhaseOutcome[] = []
    for (const phase of EPISODE_PHASES) {
      const prompt = buildEpisodePhasePrompt(manifested)
      let response: string | null = null
      let accepted: string | null = null
      try {
        response = await this.ai.generate(
          'scene',
          prompt,
          { maxNewTokens: 80, minNewTokens: 15 },
        )
        accepted = parseEpisodePhaseLine(response, manifested)
      } catch (error) {
        if (error instanceof BrainAiCancelledError) throw error
        brainWarn('coscienza', 'fase dell’episodio: Qwen non disponibile', {
          phase: phase.label,
          error,
        })
      }
      const outcome: EpisodePhaseOutcome = {
        phase: phase.label,
        prompt,
        response: response?.slice(0, 2_000) ?? null,
        accepted: accepted !== null,
        fallback: accepted === null ? 'soglia' : null,
        text: accepted ?? source,
      }
      outcomes.push(outcome)
      manifested.push(outcome.text)
      ;(outcome.accepted ? brainLog : brainWarn)(
        'coscienza',
        outcome.accepted
          ? 'fase dell’episodio accettata'
          : 'fase dell’episodio rifiutata; al suo posto la soglia',
        outcome,
      )
    }
    const story = storyFromLine(
      source,
      outcomes.map((outcome) => (outcome.accepted ? outcome.text : null)) as EpisodePhaseLines,
    )
    const influence = options.consciousnessInfluence ?? null
    if (influence) {
      story.palette = applyConsciousnessPalette(story.palette, influence)
      story.consciousnessInfluence = {
        memoryId: influence.memoryId,
        kind: influence.kind,
        title: influence.title,
        relevanceReason: influence.relevanceReason,
      }
    }
    brainLog('coscienza', 'episodio da una riga', {
      line: source,
      phasesFromModel: outcomes.map((outcome) => outcome.accepted),
      fallbacks: outcomes.map((outcome) => outcome.fallback),
      imagePrompts: story.frames.map((frame) => frame.imagePrompt),
    })
    return story
  }

  /**
   * Frase del pubblico → una riga con le regole degli scribacchini, legata
   * alla storia in corso. Se la riscrittura fallisce entra la frase tradotta:
   * nessuna frase del pubblico va persa.
   */
  async rewritePublicPhrase(
    phrase: string,
    context: readonly string[] = [],
  ): Promise<string> {
    const original = phrase.trim()
    let english = original
    try {
      english = (await this.translator?.inputsToEnglish([original]))?.[0]?.trim() || original
      await this.ai.releaseTranslationModels?.()
    } catch (error) {
      if (error instanceof BrainAiCancelledError) throw error
      brainWarn('coscienza', 'traduzione della frase del pubblico non disponibile; uso il testo originale', {
        error,
      })
    }
    try {
      const response = await this.ai.generate(
        'scene',
        buildPublicPhraseRewritePrompt(english, context),
        { maxNewTokens: 90, minNewTokens: 15 },
      )
      const rewritten = parsePublicPhraseRewrite(response)
      if (rewritten) {
        brainLog('coscienza', 'frase del pubblico riscritta come riga della storia', {
          original,
          english,
          context,
          rewritten,
        })
        return rewritten
      }
      brainWarn('coscienza', 'riscrittura della frase del pubblico rifiutata; entra la frase tradotta', {
        original,
        english,
        response: response.slice(0, 2_000),
      })
    } catch (error) {
      if (error instanceof BrainAiCancelledError) throw error
      brainWarn('coscienza', 'riscrittura della frase del pubblico non disponibile; entra la frase tradotta', {
        original,
        english,
        error,
      })
    }
    return english
  }

  async generateVisualPlan(synopsis: string, invariant: string): Promise<VisualPlan> {
    const frameCount = BRAIN_CONFIG.renderFrameCount
    const phaseBriefs = Array.from({ length: frameCount }, (_value, index) => {
      const phase = deriveOneiricPhase(index, frameCount)
      return `VISUAL${index + 1} (${phase.toLocaleUpperCase()}): ${ONEIRIC_PHASE_BRIEF[phase]}`
    })
    // Invariante assente (`inferInvariant` non ha trovato un sostantivo
    // concreto e non ne inventa uno): la riga viene omessa invece di
    // dichiarare al modello un invariante vuoto o falso.
    const invariantLine = invariant.trim()
    const prompt = [
      'Design four English image prompts for the same imaginative story, one per visual moment.',
      ...(invariantLine
        ? [
          `The invariant of this story is: ${invariantLine}. It is the concrete subject, shape or material that must stay recognizable while it is transformed across the moments.`,
        ]
        : []),
      'Each prompt must describe a concrete visible scene with one identifiable subject, one physical action, a coherent place and a clear camera view.',
      'Use literal nouns and observable actions. Prefer people, creatures, animals, plants or distinctive objects when present.',
      // Il colore non è più vietato: nessuna ingerenza cromatica sulla
      // generazione (filosofia.md §2.2).
      'Do not discuss meaning, mood, artistic style, symbolism or the writing task.',
      'Use 18-30 English words per line.',
      'Return exactly four lines beginning VISUAL1:, VISUAL2:, VISUAL3:, VISUAL4:.',
      ...phaseBriefs,
      `STORY: ${synopsis}`,
    ].join('\n')
    brainLog('psichedel', 'visual plan avviato', {
      invariant,
      synopsis,
    })
    const response = await this.ai.generate('scene', prompt, {
      maxNewTokens: 240,
      minNewTokens: 80,
    })
    const plan = parseVisualPlan(response)
    if (!plan) {
      brainWarn('psichedel', 'visual plan rifiutato', {
        response: response.slice(0, 3_000),
      })
      throw new Error('Psichedel non ha prodotto quattro descrizioni visive concrete')
    }
    brainLog('psichedel', 'visual plan verificato', { plan })
    return plan
  }
}
