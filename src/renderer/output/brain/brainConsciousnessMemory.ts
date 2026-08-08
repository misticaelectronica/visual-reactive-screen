import type { DreamStory } from '@shared/brain/brainTypes'
import type {
  ConsciousnessMemoryDraft,
  VisualStatePayload,
} from '@shared/types'

function compactEnergy(value: number | undefined): string {
  return Number.isFinite(value) ? (value ?? 0).toFixed(3) : 'non disponibile'
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
      `Bande: low ${compactEnergy(bands.low)}, lowMid ${compactEnergy(bands.lowMid)}, mid ${compactEnergy(bands.mid)}, high ${compactEnergy(bands.high)}.`,
      `Colore di fondo ${payload.backgroundColor}; luminosità ${compactEnergy(payload.brightness)}; flash ${payload.flashActive ? 'attivo' : 'inattivo'}.`,
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
