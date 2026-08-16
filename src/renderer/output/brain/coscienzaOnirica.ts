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

const STRONG_EXPLICIT_ADULT_TERMS =
  /(?:\bsesso(?:\s+orale|\s+anale|\s+vaginale|\s+di\s+gruppo)?\b|\bsex(?:ual|\s+toy|\s+toys|\s+act|\s+acts|\s+scene|\s+scenes|\s+oral|\s+group)?\b|\bpenetrazion\w*\b|\bpenetrat\w*\b|\bmasturb\w*\b|\borgasm\w*\b|\bstimolazion\w*\b|\bstimulat\w*\b|\brapport[oi]\s+sessual\w*\b|\bintercourse\b|\boral\s+(?:pleasure|contact|activity|stimulation)\b|\b(?:anal|vaginal|genital)\s+(?:sex|contact|stimulation|play)\b|\bfellati\w*\b|\bcunniling\w*\b|\bblow\s*job\w*\b|\bhand\s*job\w*\b|\bfinger(?:ing|ed|s)?\b|\bsex\s*toy\w*\b|\bdildo\w*\b|\bvibrator\w*\b|\bclimax(?:es|ed|ing)?\b)/iu

const ADULT_CONTEXT_TERMS =
  /(?:\beccitazion\w*\b|\barousal\b|\bpiacere\b|\bpleasure\b|\bintimit\w*\b|\bintimacy\b)/iu

export function containsExplicitAdultContent(text: string): boolean {
  return (
    STRONG_EXPLICIT_ADULT_TERMS.test(text) ||
    ADULT_CONTEXT_TERMS.test(text)
  )
}

export function preservesExplicitAdultContent(
  source: string,
  generated: string,
): boolean {
  return STRONG_EXPLICIT_ADULT_TERMS.test(source)
    ? STRONG_EXPLICIT_ADULT_TERMS.test(generated)
    : !containsExplicitAdultContent(source) ||
        containsExplicitAdultContent(generated)
}

function explicitContentDiagnostics(text: string): {
  strong: boolean
  contextual: boolean
  matchedTerm: string | null
} {
  return {
    strong: STRONG_EXPLICIT_ADULT_TERMS.test(text),
    contextual: ADULT_CONTEXT_TERMS.test(text),
    matchedTerm: text.match(STRONG_EXPLICIT_ADULT_TERMS)?.[0] ?? null,
  }
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
    ['LEGAME', 'COLORI', 'F1-TITOLO', 'F1'],
  )
  const looseSynopsis =
    !labeledSynopsis && titleMatch?.index !== undefined
      ? cleaned
          .slice(titleMatch.index + titleMatch[0].length)
          .split(/^(?:LEGAME|COLORI):/im)[0]
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
    labeledBlock(cleaned, 'LEGAME', ['COLORI', 'F1-TITOLO', 'F1']),
    6,
  )
  return {
    title: title.slice(0, 100),
    synopsis: synopsis.slice(0, 1_200),
    bridge: bridge?.slice(0, 420) ?? null,
    palette: paletteFromUnknown(labeledBlock(cleaned, 'COLORI', ['F1-TITOLO', 'F1'])),
  }
}

function storyCoreFromEnglishEnvelope(text: string): StoryCore | null {
  const title = requiredText(
    labeledBlock(text, 'TITLE', ['STORY']),
    1,
  )
  const synopsis = requiredText(
    labeledBlock(text, 'STORY', ['BRIDGE']),
    20,
  )
  if (!title || !synopsis || !isRenderableNarrative(synopsis)) return null
  return {
    title: title.slice(0, 100),
    synopsis: synopsis.slice(0, 1_200),
    bridge:
      requiredText(
        labeledBlock(text, 'BRIDGE', ['COLORS']),
        5,
      )?.slice(0, 420) ?? null,
    palette: paletteFromUnknown(labeledBlock(text, 'COLORS', [])),
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

export function preserveExplicitSourceContent(
  generatedSynopsis: string,
  sourcePhrases: readonly string[],
): string {
  const generatedMoments = splitSentences(generatedSynopsis)
  const explicitMoments = sourcePhrases
    .filter((phrase) => containsExplicitAdultContent(phrase))
    .map(completeSentence)
  const ordered = [
    generatedMoments[0],
    ...explicitMoments,
    ...generatedMoments.slice(1),
  ].filter((moment): moment is string => Boolean(moment?.trim()))
  const unique: string[] = []
  for (const moment of ordered) {
    if (
      !unique.some(
        (candidate) =>
          normalizedSentence(candidate) === normalizedSentence(moment),
      )
    ) {
      unique.push(completeSentence(moment))
    }
  }
  return unique.slice(0, 6).join(' ')
}

function replaceEnglishSynopsis(envelope: string, synopsis: string): string {
  return envelope.replace(
    /^STORY:\s*[\s\S]*?(?=^BRIDGE:)/imu,
    `STORY: ${synopsis}\n`,
  )
}

function fallbackUiCore(phrases: readonly string[]): StoryCore {
  const synopsis = phrases.map(completeSentence).join(' ')
  const titleWords = words(phrases[0] ?? 'sogno in movimento')
    .filter((word) => word.length >= 4)
    .slice(0, 3)
  const title = titleWords.length >= 2
    ? titleWords
        .map((word) => `${word.charAt(0).toLocaleUpperCase()}${word.slice(1)}`)
        .join(' ')
    : 'Sogno in movimento'
  const lastPhrase = completeSentence(phrases.at(-1) ?? 'Un segnale resta in attesa')
  return {
    title,
    synopsis,
    bridge: `${lastPhrase.replace(/[.!?]$/u, '')} apre un dettaglio inatteso oltre la soglia successiva.`,
    palette: [...DEFAULT_DREAM_PALETTE],
  }
}

export function inferMainArgument(source: readonly string[], synopsis: string): string {
  const text = `${source.join(' ')} ${synopsis}`.toLocaleLowerCase()
  if (containsExplicitAdultContent(text)) {
    return 'consensual adult sexual interaction and physical intimacy'
  }
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
    frames,
  }
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
    const explicitSource = containsExplicitAdultContent(phrases.join(' '))
    let englishVisualMoments: string[] | null = null
    let englishDisplay: Pick<
      DreamStory,
      'englishTitle' | 'englishSynopsis' | 'englishBridge'
    > | null = null
    let englishCore: StoryCore | null = null
    let explicitContentVerifiedFromEnglish = false
    let uiExplicitLossLogged = false
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
      if (
        explicitSource &&
        !preservesExplicitAdultContent(
          phrases.join(' '),
          `${story.title} ${story.synopsis}`,
        )
      ) {
        const generatedSynopsis = story.synopsis
        story.synopsis = preserveExplicitSourceContent(
          story.synopsis,
          phrases,
        )
        const restoredMoments = splitIntoFourMoments(story.synopsis)
        story.frames.forEach((frame, index) => {
          frame.description = restoredMoments[index]
          frame.visualIntent =
            `Scena narrativa concreta con un soggetto riconoscibile e una sola azione visibile: ${restoredMoments[index]}`
        })
        if (!uiExplicitLossLogged) {
          uiExplicitLossLogged = true
          brainWarn(
            'coscienza',
            'contenuto esplicito ripristinato letteralmente dagli input originali',
            {
              sourcePhrases: phrases,
              generatedSynopsis,
              preservedSynopsis: story.synopsis,
              englishSourceVerified: explicitContentVerifiedFromEnglish,
            },
          )
        }
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
      explicitSource,
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
    const directPredecessor = recentStories.at(-1) ?? null
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
          'Let it change one concrete story element, one local visual form and the five-color palette.',
          'Keep it secondary and traceable. If provenance is imagination, never present it as an external fact.',
        ].join('\n')
      : 'No consciousness motion is active for this story.'
    const storyPrompt = [
      'WRITE ONE STORY NOW. Output only the four requested lines.',
      ...(this.translator
        ? ['Write the complete intermediate story in natural English.']
        : ['Think privately in English if useful. The visible answer must contain only natural Italian.']),
      'STORY must contain 55-80 words in exactly 4-6 complete chronological sentences.',
      'Use a named adult protagonist, one concrete place, an initiating event, conflict, transformation and conclusion.',
      'Connect the source prompts causally. Never discuss or copy the instructions.',
      ...(explicitSource
        ? [
            'All participants are consenting adults. Preserve the explicit physical actions literally, without euphemisms or symbolism.',
          ]
        : [
            'Do not introduce sexual content that is absent from the source prompts.',
          ]),
      recentStoryConstraint,
      continuityConstraint,
      synthesisConstraint,
      consciousnessConstraint,
      'BRIDGE must be one new concrete open-ended sentence of 8-16 words. COLORS must be exactly five hexadecimal colors.',
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
      `Return exactly four lines. Line 1 starts with ${this.translator ? 'TITLE' : 'TITOLO'}:.`,
      `Line 2 starts with ${this.translator ? 'STORY' : 'STORIA'}: and contains the complete story.`,
      `Line 3 starts with ${this.translator ? 'BRIDGE' : 'LEGAME'}: and contains the outgoing bridge only.`,
      `Line 4 starts with ${this.translator ? 'COLORS' : 'COLORI'}: and contains exactly five hexadecimal colors.`,
      'No markdown, headings, lists, notes, placeholders or extra fields.',
    ].join('\n')
    try {
      let coreText = await this.ai.generate('story', storyPrompt, {
        maxNewTokens: BRAIN_CONFIG.storyMaxNewTokens,
        minNewTokens: 48,
      })
      if (this.translator) {
        let normalizedEnglishStory = normalizeEnglishStoryEnvelope(coreText)
        let englishSynopsis = normalizedEnglishStory
          ? labeledBlock(normalizedEnglishStory, 'STORY', ['BRIDGE'])
          : null
        if (!englishSynopsis || !isRenderableNarrative(englishSynopsis)) {
          brainWarn(
            'coscienza',
            'risposta inglese priva di una trama; avvio autocorrezione sulla stessa associazione',
            {
              response: coreText.slice(0, 2_000),
              normalizedStory: englishSynopsis,
            },
          )
          const narrativeRepairPrompt = [
            'REWRITE THE FAILED ANSWER AS ONE STORY. Do not explain the mistake.',
            'Write 55-80 words in exactly 4-6 complete chronological sentences.',
            'Include a named adult protagonist, one concrete place, an initiating event, conflict, transformation and conclusion.',
            'Do not output numbered bridges, field descriptions, lists, notes or fragments.',
            ...(explicitSource
              ? [
                  'Preserve the consensual explicit physical actions from the source prompts literally. Do not replace them with euphemisms or symbolism.',
                ]
              : [
                  'Do not introduce sexual content absent from the source prompts.',
                ]),
            `ENGLISH INPUT PROMPTS:\n${narrativePhrases.map((phrase) => `- ${phrase}`).join('\n')}`,
            `Return exactly four lines: TITLE:, STORY:, BRIDGE:, COLORS:.`,
            'BRIDGE must be one short outgoing bridge only. COLORS must contain exactly five hexadecimal colors.',
          ].join('\n')
          brainLog(
            'coscienza',
            'autocorrezione narrativa inglese inviata',
            { reason: 'trama assente o sostituita da metadati' },
          )
          coreText = await this.ai.generate('story', narrativeRepairPrompt, {
            maxNewTokens: Math.min(160, BRAIN_CONFIG.storyMaxNewTokens + 20),
            minNewTokens: 48,
          })
          normalizedEnglishStory = normalizeEnglishStoryEnvelope(coreText)
          englishSynopsis = normalizedEnglishStory
            ? labeledBlock(normalizedEnglishStory, 'STORY', ['BRIDGE'])
            : null
        }
        if (!normalizedEnglishStory || !englishSynopsis) {
          brainWarn('coscienza', 'autocorrezione inglese incompleta', {
            response: coreText.slice(0, 2_000),
          })
          throw new Error(
            'CoscienzaOnirica non ha prodotto una storia inglese completa',
          )
        }
        if (
          explicitSource &&
          !preservesExplicitAdultContent(
              phrases.join(' '),
              englishSynopsis,
            )
        ) {
          const generatedSynopsis = englishSynopsis
          englishSynopsis = preserveExplicitSourceContent(
            englishSynopsis,
            // Psichedel riceve soltanto prompt inglesi: se il modello storia
            // attenua un’azione, il ripristino non deve reintrodurla in
            // italiano e renderla meno leggibile al CLIP di SD-Turbo.
            narrativePhrases,
          )
          normalizedEnglishStory = replaceEnglishSynopsis(
            normalizedEnglishStory,
            englishSynopsis,
          )
          brainWarn(
            'coscienza',
            'storia inglese neutralizzata dal modello; contenuto originale ripristinato senza scartare la generazione',
            {
              sourcePhrases: phrases,
              generatedStory: generatedSynopsis,
              preservedStory: englishSynopsis,
              sourceDetection: explicitContentDiagnostics(phrases.join(' ')),
              generatedDetection: explicitContentDiagnostics(
                generatedSynopsis,
              ),
            },
          )
        }
        if (explicitSource) explicitContentVerifiedFromEnglish = true
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
        englishVisualMoments = englishSynopsis
          ? splitIntoFourMoments(englishSynopsis)
          : null
        englishDisplay = {
          englishTitle:
            labeledBlock(normalizedEnglishStory, 'TITLE', ['STORY']) ?? undefined,
          englishSynopsis,
          englishBridge:
            labeledBlock(normalizedEnglishStory, 'BRIDGE', ['COLORS']) ?? null,
        }
        englishCore = storyCoreFromEnglishEnvelope(normalizedEnglishStory)
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
        brainWarn('coscienza', 'nucleo narrativo non valido; avvio autocorrezione', {
          response: coreText.slice(0, 3_000),
        })
        const coreRepairPrompt = [
          'START OVER. The previous answer copied instructions instead of writing a story.',
          'Write a new concrete causal story of 70-100 words with a named protagonist, conflict, transformation and conclusion.',
          'Inside STORY write exactly 4-6 complete chronological sentences and no labels, color lists, numbered fields or instructions.',
          ...(this.translator
            ? ['Write the complete intermediate story in natural English.']
            : ['Think privately in English if useful; visible content must be natural Italian.']),
          directPredecessor && translatedContinuitySeed
            ? `Use this previous bridge only as a secondary detail: ${translatedContinuitySeed}`
            : 'This is the first story.',
          synthesisConstraint,
          `${this.translator ? 'ENGLISH' : 'ITALIAN'} INPUT PROMPTS:\n${narrativePhrases.map((phrase) => `- ${phrase}`).join('\n')}`,
          'Invent a new short outgoing bridge that is not a repetition of the incoming seed.',
          `Return exactly four lines beginning ${this.translator ? 'TITLE:, STORY:, BRIDGE:, COLORS:' : 'TITOLO:, STORIA:, LEGAME:, COLORI:'}.`,
          `After ${this.translator ? 'COLORS' : 'COLORI'}: write exactly five coherent hexadecimal colors.`,
          'Do not explain the task and do not output placeholders, brackets, markdown, analysis or English notes.',
        ].join('\n')
        brainLog('coscienza', 'autocorrezione nucleo narrativo inviata')
        coreText = await this.ai.generate('story', coreRepairPrompt, {
          maxNewTokens: Math.min(160, BRAIN_CONFIG.storyMaxNewTokens + 20),
          minNewTokens: 48,
        })
        if (this.translator) {
          const normalizedRepair = normalizeEnglishStoryEnvelope(coreText)
          if (!normalizedRepair) {
            throw new Error(
              'CoscienzaOnirica non ha prodotto una storia inglese completa durante la correzione',
            )
          }
          const repairedEnglishSynopsis = labeledBlock(
            normalizedRepair,
            'STORY',
            ['BRIDGE'],
          )
          if (
            explicitSource &&
            (!repairedEnglishSynopsis ||
              !preservesExplicitAdultContent(
                phrases.join(' '),
                repairedEnglishSynopsis,
              ))
          ) {
            throw new Error(
              'CoscienzaOnirica ha eliminato il contenuto esplicito presente negli input',
            )
          }
          if (explicitSource) explicitContentVerifiedFromEnglish = true
          if (
            !repairedEnglishSynopsis ||
            !isRenderableNarrative(repairedEnglishSynopsis)
          ) {
            throw new Error(
              'CoscienzaOnirica ha prodotto metadati o momenti insufficienti al posto della storia',
            )
          }
          englishVisualMoments = repairedEnglishSynopsis
            ? splitIntoFourMoments(repairedEnglishSynopsis)
            : null
          coreText = await this.translator.storyForUi(normalizedRepair)
        }
        const repairedCompleteStory = storyFromResponse(coreText, phrases)
        if (repairedCompleteStory) prepareStory(repairedCompleteStory)
        const repairedDuplicate = repairedCompleteStory
          ? resemblesRecentStory(repairedCompleteStory, recentStoriesForValidation)
          : null
        if (repairedDuplicate) {
          throw new Error(
            `CoscienzaOnirica ha ripetuto la storia recente "${repairedDuplicate.title}"`,
          )
        }
        if (repairedCompleteStory) {
          brainLog('coscienza', 'storia completa ricevuta dalla riparazione', repairedCompleteStory)
          return repairedCompleteStory
        }
        core = storyCoreFromResponse(coreText, phrases)
        if (!core) {
          brainWarn('coscienza', 'autocorrezione nucleo narrativo rifiutata', {
            response: coreText.slice(0, 4_000),
          })
        }
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
      brainWarn('coscienza', 'generazione AI fallita; nessuna storia simulata', error)
      throw error
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

  async generateVisualPlan(story: DreamStory): Promise<VisualPlan> {
    const prompt = [
      'Convert the four Italian story moments into four concise English image prompts.',
      'Each prompt must describe a concrete visible scene with one identifiable subject, one physical action, a coherent place and a clear camera view.',
      'Use literal nouns and observable actions. Prefer people, creatures, animals, plants or distinctive objects when present.',
      'Do not discuss meaning, mood, artistic style, color, symbolism or the writing task.',
      'Use 18-30 English words per line.',
      'Return exactly four lines beginning VISUAL1:, VISUAL2:, VISUAL3:, VISUAL4:.',
      ...story.frames.map(
        (frame, index) =>
          `MOMENTO${index + 1}: ${frame.description}`,
      ),
    ].join('\n')
    brainLog('psichedel', 'interpretazione visiva inglese dei fotogrammi avviata', {
      storyId: story.id,
      frames: story.frames.map((frame) => frame.description),
    })
    const response = await this.ai.generate('scene', prompt, {
      maxNewTokens: 240,
      minNewTokens: 80,
    })
    const plan = parseVisualPlan(response)
    if (!plan) {
      brainWarn('psichedel', 'piano visivo inglese rifiutato', {
        storyId: story.id,
        response: response.slice(0, 3_000),
      })
      throw new Error('Psichedel non ha prodotto quattro descrizioni visive concrete')
    }
    brainLog('psichedel', 'piano visivo inglese verificato', {
      storyId: story.id,
      plan,
    })
    return plan
  }
}
