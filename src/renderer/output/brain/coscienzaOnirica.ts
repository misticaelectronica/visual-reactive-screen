import { BRAIN_CONFIG } from '@shared/brain/brainConfig'
import type { DreamFrame, DreamStory } from '@shared/brain/brainTypes'
import { BrainAiCancelledError, type BrainAiClient } from './brainAiClient'
import { brainLog, brainWarn } from './brainLog'
import { extractJsonObjects } from './extractJsonObjects'

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

function normalizedSentence(text: string): string {
  return words(text).join(' ')
}

function hasRepeatedNarrativeSentence(text: string): boolean {
  const sentences = splitSentences(text)
    .map(normalizedSentence)
    .filter((sentence) => words(sentence).length >= 8)
  return new Set(sentences).size !== sentences.length
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
      durationMs: BRAIN_CONFIG.frameDurationMs,
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

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .match(/[^.!?]+[.!?]?/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) ?? []
}

function splitIntoFourMoments(synopsis: string): string[] {
  const sentences = splitSentences(synopsis)
  if (sentences.length >= 4) {
    const groups = Array.from({ length: 4 }, (_, index) => {
      const start = Math.floor((index * sentences.length) / 4)
      const end = Math.floor(((index + 1) * sentences.length) / 4)
      return sentences.slice(start, Math.max(start + 1, end)).join(' ')
    })
    if (groups.every((group) => words(group).length >= 8)) return groups
  }

  const synopsisWords = synopsis.trim().split(/\s+/)
  return Array.from({ length: 4 }, (_, index) => {
    const start = Math.floor((index * synopsisWords.length) / 4)
    const end = Math.floor(((index + 1) * synopsisWords.length) / 4)
    return synopsisWords.slice(start, Math.max(start + 1, end)).join(' ')
  })
}

export function storyFromCore(core: StoryCore, phrases: string[]): DreamStory {
  const moments = splitIntoFourMoments(core.synopsis)
  const labels = ['Apertura', 'Sviluppo', 'Trasformazione', 'Esito']
  const energies = [0.32, 0.56, 0.86, 0.68]
  return {
    id: `story-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: core.title,
    synopsis: core.synopsis,
    bridge: core.bridge,
    continuityPhrase: null,
    palette: core.palette,
    sourcePhrases: phrases,
    frames: moments.map((description, index) => ({
      id: `frame-${index + 1}`,
      title: labels[index],
      description,
      visualIntent: `Rappresentazione fedele e concreta di questo momento narrativo: ${description}`,
      energy: energies[index],
      durationMs: BRAIN_CONFIG.frameDurationMs,
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
      durationMs: clamp(
        typeof frame.durationMs === 'number' ? frame.durationMs : BRAIN_CONFIG.frameDurationMs,
        6_000,
        30_000,
      ),
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
    frames,
  }
}

export class CoscienzaOnirica {
  constructor(private readonly ai: Pick<BrainAiClient, 'generate'>) {}

  async generate(
    phrases: string[],
    recentStories: readonly DreamStoryMemory[] = [],
  ): Promise<DreamStory> {
    brainLog('coscienza', 'generazione storia avviata', {
      phrases,
      recentStories: recentStories.map((story) => story.title),
    })
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
    const continuityConstraint = directPredecessor
      ? 'One Italian input prompt comes directly from the previous story. Reuse it naturally as a causal seed; an explicit link field is not required.'
      : 'This is the first story in the cycle.'
    const storyPrompt = [
      'Work internally in English, but output the final values only in Italian.',
      'Silently translate the Italian input prompts into English before planning.',
      'Plan a concrete original story of 70-100 words in English, then translate it into natural Italian.',
      'Invent a named protagonist and a place. Include an initiating event, conflict, transformation and conclusion.',
      'Connect the prompts causally without copying or commenting on them.',
      recentStoryConstraint,
      continuityConstraint,
      'Choose five hexadecimal colors matching the story tone.',
      `ITALIAN INPUT PROMPTS:\n${phrases.map((phrase) => `- ${phrase}`).join('\n')}`,
      'Output exactly these three Italian-labelled fields, without markdown or English notes:',
      'TITOLO: titolo finale in italiano',
      'STORIA: racconto finale continuo in italiano',
      'COLORI: #112233, #445566, #778899, #aabbcc, #ddeeff',
    ].join('\n')
    try {
      let coreText = await this.ai.generate('story', storyPrompt, {
        maxNewTokens: 360,
        minNewTokens: 90,
      })
      const legacyCompleteStory = storyFromResponse(coreText, phrases)
      const legacyDuplicate = legacyCompleteStory
        ? resemblesRecentStory(legacyCompleteStory, recentStories)
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
      if (!core) {
        brainWarn('coscienza', 'nucleo narrativo non valido; avvio autocorrezione', {
          response: coreText.slice(0, 3_000),
        })
        const coreRepairPrompt = [
          'Repair the draft by reasoning in English, then output only natural Italian values.',
          'Keep its protagonist, event and source prompts.',
          'STORIA must be a complete causal 70-100 word story with a conclusion.',
          'Return only TITOLO, STORIA and COLORI, without markdown.',
          directPredecessor
            ? 'One input phrase already comes from the previous story; incorporate it naturally.'
            : 'This is the first story.',
          'COLORI must contain five coherent hexadecimal colors.',
          `ITALIAN INPUT PROMPTS:\n${phrases.map((phrase) => `- ${phrase}`).join('\n')}`,
          `DRAFT TO REPAIR:\n${coreText.slice(0, 2_500)}`,
        ].join('\n')
        brainLog('coscienza', 'autocorrezione nucleo narrativo inviata')
        coreText = await this.ai.generate('story', coreRepairPrompt, {
          maxNewTokens: 380,
          minNewTokens: 90,
        })
        const repairedCompleteStory = storyFromResponse(coreText, phrases)
        const repairedDuplicate = repairedCompleteStory
          ? resemblesRecentStory(repairedCompleteStory, recentStories)
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
      const story = storyFromCore(core, phrases)
      const duplicate = resemblesRecentStory(story, recentStories)
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
}
