import type { BrainAiClient } from './brainAiClient'
import { brainLog, brainWarn } from './brainLog'

type EnglishStoryEnvelope = {
  title: string
  story: string
  bridge: string
  colors: [string, string, string, string, string]
}

const NAMED_COLORS: Readonly<Record<string, string>> = {
  black: '#111827',
  white: '#f8fafc',
  red: '#c2413b',
  orange: '#dd7b32',
  yellow: '#e3c94f',
  green: '#3e8f68',
  blue: '#315b9d',
  purple: '#7650a8',
  violet: '#7650a8',
  pink: '#d47b9b',
  brown: '#795548',
  gray: '#64748b',
  grey: '#64748b',
}

const FALLBACK_COLORS = [
  '#111827',
  '#d08c60',
  '#f3ead7',
  '#3ddc97',
  '#7457d9',
] as const

function colorsFromEnglishText(text: string): string[] {
  const hexadecimal = text.match(/#[0-9a-f]{6}\b/giu) ?? []
  const named = (text.toLocaleLowerCase().match(/\p{L}+/gu) ?? [])
    .map((word) => NAMED_COLORS[word])
    .filter((color): color is string => typeof color === 'string')
  return [...new Set([...hexadecimal, ...named].map((color) => color.toLowerCase()))]
}

function recoveredNarrative(cleaned: string): string | null {
  const narrative = cleaned
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        !/^(?:INTRODUCTION|PLOT\s+DEVELOPMENT|DEVELOPMENT|CONCLUSION|SETTING|CHARACTERS?|SCENE|SUMMARY)$/iu.test(
          line.replace(/:$/u, '').trim(),
        ),
    )
    .filter(
      (line) =>
        !/^(?:TITLE|BRIDGE(?:\s*[_-]?\s*\d+)?|COLORS)\s*:/iu.test(line),
    )
    .map((line) =>
      line.replace(
        /^[A-Z][A-Z\s,'’-]{2,}:\s*/u,
        '',
      ),
    )
    .map((line) =>
      line
        .replace(
          /\s*(?:COLORS?|COLOURS?)\s*:\s*[\s\S]*$/iu,
          '',
        )
        .trim(),
    )
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/gu, ' ')
    .trim()
  return narrative.split(/\s+/u).length >= 30 ? narrative : null
}

function fallbackTitleFromStory(story: string): string {
  const stopWords = new Set([
    'the', 'this', 'that', 'with', 'from', 'into', 'when', 'then', 'their',
    'there', 'each', 'world', 'story', 'begins', 'began',
  ])
  const candidates = (
    story.match(/[^.!?]+/u)?.[0]?.match(/\p{L}+/gu) ?? []
  ).filter(
    (word) => word.length >= 4 && !stopWords.has(word.toLocaleLowerCase()),
  )
  const selected = candidates.slice(0, 4)
  return selected.length > 0
    ? selected
        .map(
          (word) =>
            `${word.charAt(0).toLocaleUpperCase()}${word.slice(1).toLocaleLowerCase()}`,
        )
        .join(' ')
    : 'Unnamed Dream'
}

function outgoingBridgeFromStory(story: string): string | null {
  const sentences =
    story
      .match(/[^.!?]+[.!?]?/gu)
      ?.map((sentence) => sentence.trim())
      .filter((sentence) => sentence.split(/\s+/u).length >= 5) ?? []
  return sentences.at(-1) ?? null
}

export function normalizeEnglishStoryEnvelope(text: string): string | null {
  const cleaned = text.replace(/[*`]/g, '').trim()
  const labeledTitle = cleaned.match(/^TITLE:\s*([^\n\r]+)/imu)?.[1]?.trim()
  const labeledStory = cleaned
    .match(/^STORY:\s*([\s\S]*?)(?=^BRIDGE:|$(?![\s\S]))/imu)?.[1]
    ?.trim()
  const story =
    labeledStory && labeledStory.split(/\s+/u).length >= 20
      ? labeledStory
      : recoveredNarrative(cleaned)
  const title = labeledTitle ?? (story ? fallbackTitleFromStory(story) : null)
  const labeledBridge = cleaned.match(/^BRIDGE:\s*([^\n\r]+)/imu)?.[1]?.trim()
  const bridge =
    labeledBridge &&
    !/^COLORS\s*:/iu.test(labeledBridge) &&
    labeledBridge.split(/\s+/u).length >= 5
      ? labeledBridge
      : story
        ? outgoingBridgeFromStory(story)
        : null
  const detectedColors = colorsFromEnglishText(
    cleaned.match(/^COLORS:\s*(.+)$/imu)?.[1] ??
      cleaned.match(/^BRIDGE:\s*COLORS:\s*(.+)$/imu)?.[1] ??
      '',
  )
  const colors = [...detectedColors]
  for (const fallback of FALLBACK_COLORS) {
    if (colors.length >= 5) break
    if (!colors.includes(fallback)) colors.push(fallback)
  }
  if (
    !title ||
    !story ||
    story.split(/\s+/u).length < 20 ||
    !bridge ||
    bridge.split(/\s+/u).length < 5 ||
    colors.length < 5
  ) {
    return null
  }
  return [
    `TITLE: ${title}`,
    `STORY: ${story}`,
    `BRIDGE: ${bridge}`,
    `COLORS: ${colors.slice(0, 5).join(', ')}`,
  ].join('\n')
}

function parseEnglishStoryEnvelope(text: string): EnglishStoryEnvelope | null {
  const normalized = normalizeEnglishStoryEnvelope(text)
  if (!normalized) return null
  const title = normalized.match(/^TITLE:\s*([^\n\r]+)/imu)?.[1]?.trim()
  const story = normalized.match(/^STORY:\s*([^\n\r]+)/imu)?.[1]?.trim()
  const bridge = normalized.match(/^BRIDGE:\s*([^\n\r]+)/imu)?.[1]?.trim()
  const colors = normalized.match(/^COLORS:\s*(.+)$/imu)?.[1]
    ?.match(/#[0-9a-f]{6}\b/giu)
    ?.map((color) => color.toLowerCase())
  if (!title || !story || !bridge || colors?.length !== 5) return null
  return {
    title,
    story,
    bridge,
    colors: colors as EnglishStoryEnvelope['colors'],
  }
}

function validTranslation(text: string): string | null {
  const cleaned = text.replace(/<pad>|<\/s>/giu, '').trim()
  return cleaned.length >= 2 ? cleaned : null
}

const ENGLISH_INPUT_MARKERS = new Set([
  'the', 'and', 'of', 'with', 'from', 'when', 'then', 'after', 'before',
  'she', 'he', 'her', 'his', 'they', 'their', 'them', 'through', 'into',
  'between', 'becomes', 'finds', 'discovers', 'is', 'are', 'was', 'were',
  'has', 'have', 'does', 'do', 'as', 'toward', 'towards', 'inside',
  'outside', 'together', 'each', 'while', 'where', 'who', 'whose',
])

const ITALIAN_INPUT_MARKERS = new Set([
  'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'del',
  'dello', 'della', 'dei', 'degli', 'delle', 'nel', 'nello', 'nella',
  'nei', 'negli', 'nelle', 'che', 'con', 'per', 'mentre', 'quando',
  'allora', 'dopo', 'prima', 'suo', 'sua', 'suoi', 'sue', 'sono', 'viene',
  'diventa', 'tra', 'fra', 'verso', 'dentro', 'fuori', 'insieme',
])

function languageTokens(text: string): string[] {
  return text.toLocaleLowerCase().match(/\p{L}+(?:['’]\p{L}+)?/gu) ?? []
}

/**
 * Riconosce soltanto l'inglese con evidenza sufficiente. Nei casi ambigui
 * restituisce false, così una frase italiana breve continua a essere tradotta.
 */
export function isLikelyEnglishInput(text: string): boolean {
  const tokens = languageTokens(text)
  if (tokens.length === 0) return false
  const englishScore = tokens.filter((token) =>
    ENGLISH_INPUT_MARKERS.has(token)
  ).length
  const italianScore = tokens.filter((token) =>
    ITALIAN_INPUT_MARKERS.has(token)
  ).length
  const englishMorphology = tokens.filter(
    (token) =>
      token.length >= 5 &&
      /(?:ing|ness|lessly|fully|tion|tions|ment|ments)$/u.test(token),
  ).length
  const italianMorphology = tokens.filter(
    (token) =>
      token.length >= 5 &&
      /(?:zione|zioni|mente|ità|ando|endo)$/u.test(token),
  ).length
  const hasItalianOrthography =
    /[àèéìòù]/iu.test(text) ||
    /\b(?:l|dell|all|nell|sull)['’]/iu.test(text)
  if (hasItalianOrthography && englishScore <= italianScore) return false
  const englishEvidence = englishScore + englishMorphology
  const italianEvidence = italianScore + italianMorphology
  return englishEvidence >= 2 && englishEvidence > italianEvidence
}

export class BrainTranslator {
  private readonly englishInputCache = new Map<string, string>()

  constructor(
    private readonly ai: Pick<BrainAiClient, 'generate'>,
    private readonly options: {
      translateInputs?: boolean
      translateUi?: boolean
    } = {},
  ) {}

  inputTranslationEnabled(): boolean {
    return this.options.translateInputs !== false
  }

  async inputsToEnglish(phrases: readonly string[]): Promise<string[]> {
    if (this.options.translateInputs === false) {
      brainLog(
        'traduzione',
        'traduzione input saltata; il modello narrativo usa direttamente le frasi italiane',
        { phrases },
      )
      return [...phrases]
    }
    const alreadyEnglish = phrases.filter(
      (phrase, index) =>
        !this.englishInputCache.has(phrase) &&
        phrases.indexOf(phrase) === index &&
        isLikelyEnglishInput(phrase),
    )
    for (const phrase of alreadyEnglish) {
      this.englishInputCache.set(phrase, phrase)
    }
    if (alreadyEnglish.length > 0) {
      brainLog('traduzione', 'input già inglesi; traduzione saltata', {
        phrases: alreadyEnglish,
      })
    }
    const missing = phrases.filter(
      (phrase, index) =>
        !this.englishInputCache.has(phrase) &&
        phrases.indexOf(phrase) === index,
    )
    if (missing.length === 0) {
      brainLog('traduzione', 'input inglesi riusati dalla memoria locale', {
        phrases,
      })
      return phrases.map(
        (phrase) => this.englishInputCache.get(phrase) as string,
      )
    }
    brainLog('traduzione', 'traduzione dei soli input italiani → inglese avviata', {
      phrases: missing,
      model: 'Marian italiano → inglese',
    })
    const translated = await Promise.all(
      missing.map(async (phrase) =>
        validTranslation(
          await this.ai.generate('translate-input', phrase, {
            maxNewTokens: 96,
          }),
        ),
      ),
    )
    if (translated.some((value) => value === null)) {
      brainWarn('traduzione', 'traduzione input rifiutata', {
        italian: missing,
        english: translated,
      })
      throw new Error('Il traduttore input non ha restituito tutte le frasi inglesi')
    }
    missing.forEach((phrase, index) => {
      this.englishInputCache.set(phrase, translated[index] as string)
    })
    const complete = phrases.map(
      (phrase) => this.englishInputCache.get(phrase) as string,
    )
    brainLog('traduzione', 'traduzione input verificata', {
      italian: missing,
      english: translated as string[],
      cacheSize: this.englishInputCache.size,
    })
    return complete
  }

  async storyForUi(englishStory: string): Promise<string> {
    const source = parseEnglishStoryEnvelope(englishStory)
    if (!source) {
      throw new Error('La storia inglese non è completa e non può essere tradotta')
    }
    if (this.options.translateUi === false) {
      brainLog(
        'traduzione',
        'traduzione UI saltata per non occupare la sessione di inferenza',
        {
          sourceWords: source.story.split(/\s+/u).length,
        },
      )
      return [
        `TITOLO: ${source.title}`,
        `STORIA: ${source.story}`,
        `LEGAME: ${source.bridge}`,
        `COLORI: ${source.colors.join(', ')}`,
      ].join('\n')
    }
    brainLog('traduzione', 'traduzione storia inglese → UI italiana avviata', {
      model: 'Marian inglese → italiano',
      sourceWords: source.story.split(/\s+/u).length,
    })
    const translations = await Promise.allSettled([
      this.ai.generate('translate-ui', source.title, { maxNewTokens: 48 }),
      this.ai.generate('translate-ui', source.story, { maxNewTokens: 220 }),
      this.ai.generate('translate-ui', source.bridge, { maxNewTokens: 64 }),
    ])
    const translated = translations.map((result) =>
      result.status === 'fulfilled' ? validTranslation(result.value) : null,
    )
    const [translatedTitle, translatedStory, translatedBridge] = translated
    // La traduzione è solo una presentazione. Un timeout non deve mai
    // scartare una storia inglese già pronta né fermare Psichedel.
    const title = translatedTitle ?? source.title
    const story =
      translatedStory && translatedStory.split(/\s+/u).length >= 18
        ? translatedStory
        : source.story
    const bridge =
      translatedBridge && translatedBridge.split(/\s+/u).length >= 4
        ? translatedBridge
        : source.bridge
    if (translations.some((result) => result.status === 'rejected') || !translatedTitle || !translatedStory || !translatedBridge) {
      brainWarn('traduzione', 'traduzione UI parziale; mantengo l’inglese originale nei campi non tradotti', {
        titleTranslated: Boolean(translatedTitle),
        storyTranslated: Boolean(translatedStory),
        bridgeTranslated: Boolean(translatedBridge),
        failures: translations
          .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
          .map((result) => result.reason instanceof Error ? result.reason.message : String(result.reason)),
      })
    }
    const response = [
      `TITOLO: ${title}`,
      `STORIA: ${story}`,
      `LEGAME: ${bridge}`,
      `COLORI: ${source.colors.join(', ')}`,
    ].join('\n')
    brainLog('traduzione', 'traduzione UI italiana verificata', {
      response: response.slice(0, 3_000),
    })
    return response
  }
}
