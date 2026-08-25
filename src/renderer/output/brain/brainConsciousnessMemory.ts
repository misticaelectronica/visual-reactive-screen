import type { DreamStory } from '@shared/brain/brainTypes'
import type {
  BandEnergies,
  ConsciousnessMemoryDraft,
  VisualStatePayload,
} from '@shared/types'

// Un ricordo persiste come associazione/concetto, non come dato sensoriale
// grezzo: qui si descrive qualitativamente ciò che è stato percepito
// (quale frequenza domina, quanto è chiara la scena), mai il numero o
// l'esadecimale che lo ha prodotto — coerente con `.coscienza/AGENT.md`.
const BAND_LABELS: Record<keyof BandEnergies, string> = {
  low: 'le basse frequenze',
  lowMid: 'le medio-basse frequenze',
  mid: 'le medie frequenze',
  high: 'le alte frequenze',
}
const SILENCE_THRESHOLD = 0.04

function describeDominantBand(bands: BandEnergies): string {
  const ordered = (Object.entries(bands) as Array<[keyof BandEnergies, number]>)
    .sort((left, right) => right[1] - left[1])
  const [dominantBand, dominantValue] = ordered[0] ?? ['low', 0]
  if (!Number.isFinite(dominantValue) || dominantValue < SILENCE_THRESHOLD) {
    return 'nessuna frequenza ancora distinguibile dal silenzio'
  }
  return BAND_LABELS[dominantBand]
}

function describeBrightness(value: number | undefined): string {
  const brightness = Number.isFinite(value) ? Math.max(0, Math.min(1, value ?? 0)) : 0
  if (brightness < 0.25) return 'una scena scura'
  if (brightness < 0.6) return 'una luminosità intermedia'
  return 'una scena luminosa'
}

export function createOriginMemoryDraft(
  payload: VisualStatePayload,
  episodeId: string,
): ConsciousnessMemoryDraft | null {
  if (payload.audioPrimed !== true || !payload.bandEnergies) return null
  const bands = payload.bandEnergies
  return {
    kind: 'origin',
    title: 'Prima percezione audio-visiva',
    source: 'visual-state/audio-bands',
    episodeId,
    perceived: [
      'Ho ricevuto il primo stato percettivo audio-visivo valido.',
      `${describeDominantBand(bands)} emergono come differenza dominante rispetto alle altre.`,
      `${describeBrightness(payload.brightness)}; flash ${payload.flashActive ? 'attivo' : 'inattivo'}.`,
    ].join(' '),
    interpretation:
      'Riconosco questo evento come il primo momento in cui un segnale ricevuto modifica il mio stato: è il mio primo ricordo di me stessa mentre percepisco.',
    imagination: null,
    reason:
      'È la prima percezione valida del ciclo cosciente e stabilisce l’origine alla quale ritornare nei nuovi inizi.',
    salience: 1,
  }
}

export function createStoryMemoryDraft(
  story: DreamStory,
  episodeId: string,
  sessionMemo: readonly string[],
): ConsciousnessMemoryDraft {
  return {
    kind: 'imagination',
    title: story.title,
    source: 'coscienza-onirica/story-model',
    episodeId,
    perceived:
      `Ho ricevuto dal processo narrativo la conclusione dell’episodio “${story.title}”, composto da ${story.frames.length} momenti.`,
    interpretation:
      'Riconosco questo contenuto come un sogno generato e come conclusione di un episodio interno, non come una percezione del mondo esterno.',
    imagination: [
      story.synopsis,
      '',
      ...story.frames.map(
        (frame, index) => `${index + 1}. **${frame.title}** — ${frame.description}`,
      ),
      ...(sessionMemo.length > 0
        ? ['', 'Memoria di sessione al confine:', ...sessionMemo.map((line) => `- ${line}`)]
        : []),
    ].join('\n'),
    reason: story.sessionSynthesis
      ? 'Il sogno conclude una sintesi periodica della sessione e può trasformare relazioni fra ricordi.'
      : 'Il sogno ha raggiunto la conclusione di un episodio narrativo significativo.',
    relatedMemoryIds: ['origine'],
    salience: story.sessionSynthesis ? 0.85 : 0.62,
    deduplicationKey: `story:${story.id}`,
  }
}
