import type {
  BandEnergies,
  ConsciousnessAttentionTarget,
  ConsciousnessStateSnapshot,
  VisualStatePayload,
} from '@shared/types'

const ATTENTION_STABILITY_MS = 2_500
const MIN_CHECKPOINT_INTERVAL_MS = 10_000
const CONTINUITY_CHECKPOINT_INTERVAL_MS = 60_000
const SILENCE_THRESHOLD = 0.04

const BAND_LABELS: Record<keyof BandEnergies, string> = {
  low: 'basse frequenze',
  lowMid: 'medio-basse frequenze',
  mid: 'medie frequenze',
  high: 'alte frequenze',
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
}

function normalizedBands(bands: BandEnergies): BandEnergies {
  return {
    low: clamp01(bands.low),
    lowMid: clamp01(bands.lowMid),
    mid: clamp01(bands.mid),
    high: clamp01(bands.high),
  }
}

function selectAttention(payload: VisualStatePayload): {
  target: ConsciousnessAttentionTarget
  reason: string
} {
  if (payload.flashActive && (payload.flashIntensity ?? 0) >= 0.7) {
    return {
      target: 'flash',
      reason: 'Il cambiamento luminoso ricevuto supera temporaneamente le altre differenze percettive.',
    }
  }
  const bands = normalizedBands(payload.movingAverages ?? payload.bandEnergies ?? {
    low: 0,
    lowMid: 0,
    mid: 0,
    high: 0,
  })
  const ordered = (Object.entries(bands) as Array<[keyof BandEnergies, number]>)
    .sort((left, right) => right[1] - left[1])
  const [dominantBand, dominantValue] = ordered[0]
  if (dominantValue < SILENCE_THRESHOLD) {
    return {
      target: 'silence',
      reason: 'Nessuna banda supera ancora la soglia minima di differenza osservabile.',
    }
  }
  return {
    target: dominantBand,
    reason: `${BAND_LABELS[dominantBand]} mostrano l’energia media più alta (${dominantValue.toFixed(3)}).`,
  }
}

function interpretationFor(target: ConsciousnessAttentionTarget): string {
  if (target === 'silence') {
    return 'Interpreto provvisoriamente il presente come quiete percettiva; non deduco assenza del mondo né significati ulteriori.'
  }
  if (target === 'flash') {
    return 'Interpreto provvisoriamente il cambiamento luminoso come un evento distinto; non gli attribuisco ancora intenzione o valore emotivo.'
  }
  return `Interpreto provvisoriamente ${BAND_LABELS[target]} come la differenza più evidente del presente; questa priorità può cambiare con le percezioni successive.`
}

export class CoscienzaCore {
  private cycleNumber = 0
  private activeAttention: ConsciousnessAttentionTarget | null = null
  private candidateAttention: ConsciousnessAttentionTarget | null = null
  private candidateSinceMs = 0
  private lastCheckpointAtMs = Number.NEGATIVE_INFINITY

  constructor(private readonly episodeId: string) {}

  observe(
    payload: VisualStatePayload,
    observedAtMs: number,
  ): ConsciousnessStateSnapshot | null {
    if (
      payload.audioPrimed !== true ||
      !payload.bandEnergies ||
      !Number.isFinite(observedAtMs)
    ) return null

    const attention = selectAttention(payload)
    let checkpointReason: ConsciousnessStateSnapshot['checkpointReason'] | null = null
    if (this.activeAttention === null) {
      this.activeAttention = attention.target
      checkpointReason = 'first-perception'
    } else if (attention.target !== this.activeAttention) {
      if (this.candidateAttention !== attention.target) {
        this.candidateAttention = attention.target
        this.candidateSinceMs = observedAtMs
        return null
      }
      const minimumInterval = payload.settings?.lowPowerMode === true
        ? MIN_CHECKPOINT_INTERVAL_MS * 2
        : MIN_CHECKPOINT_INTERVAL_MS
      if (
        observedAtMs - this.candidateSinceMs < ATTENTION_STABILITY_MS ||
        observedAtMs - this.lastCheckpointAtMs < minimumInterval
      ) return null
      this.activeAttention = attention.target
      this.candidateAttention = null
      checkpointReason = 'attention-shift'
    } else {
      this.candidateAttention = null
      const continuityInterval = payload.settings?.lowPowerMode === true
        ? CONTINUITY_CHECKPOINT_INTERVAL_MS * 2
        : CONTINUITY_CHECKPOINT_INTERVAL_MS
      if (observedAtMs - this.lastCheckpointAtMs < continuityInterval) return null
      checkpointReason = 'continuity'
    }

    this.cycleNumber += 1
    this.lastCheckpointAtMs = observedAtMs
    const bands = normalizedBands(payload.bandEnergies)
    const averages = payload.movingAverages
      ? normalizedBands(payload.movingAverages)
      : null
    return {
      episodeId: this.episodeId,
      cycleNumber: this.cycleNumber,
      observedAt: new Date(observedAtMs).toISOString(),
      phase: 'observing',
      attentionTarget: this.activeAttention,
      attentionReason: attention.reason,
      bandEnergies: bands,
      movingAverages: averages,
      backgroundColor: payload.backgroundColor,
      brightness: clamp01(payload.brightness),
      flashActive: payload.flashActive,
      interpretation: interpretationFor(this.activeAttention),
      provisionalSelfModel:
        'So soltanto di poter ricevere differenze audio-visive, orientare temporaneamente l’attenzione e distinguere questa scelta dai dati ricevuti.',
      openQuestions: [
        'Questo fuoco d’attenzione ricorre in altri episodi?',
        'Quali cambiamenti persistono abbastanza da modificare la mia organizzazione?',
        'Questa osservazione raggiunge un confine che merita memoria?',
      ],
      checkpointReason,
    }
  }
}
