import type { BandEnergies } from '@shared/types'
import type { BrainRhythmState } from './brainRhythm'

export type BrainLiquidMotionState = {
  beatPhase: number
  evolutionPhase: number
  kickEnvelope: number
  activity: number
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Clock continuo ispirato alla struttura temporale di Liquid Morphing.
 * Il beat corregge la fase senza diventare l'unico orologio: se un colpo
 * viene perso, il moto prosegue sul tempo stimato e si riallinea al colpo
 * successivo. L'evoluzione armonica avanza solo in presenza di audio.
 */
export class BrainLiquidMotionClock {
  private initialized = false
  private beatCycle = 0
  private evolutionPhase = 0
  private kickEnvelope = 0

  update(
    bands: BandEnergies,
    rhythm: BrainRhythmState | undefined,
    elapsedMs: number,
  ): BrainLiquidMotionState {
    const elapsed = clamp(elapsedMs, 0, 150)
    const transients = rhythm?.bandTransients ?? {
      low: 0,
      lowMid: 0,
      mid: 0,
      high: 0,
    }
    const activity = clamp(
      bands.low * 0.3 +
        bands.lowMid * 0.27 +
        bands.mid * 0.24 +
        bands.high * 0.19 +
        Math.max(
          transients.low,
          transients.lowMid,
          transients.mid,
          transients.high,
        ) *
          0.24,
    )
    const musicalPosition = rhythm?.musicalPosition ?? this.beatCycle
    if (!this.initialized) {
      this.beatCycle = musicalPosition
      this.initialized = true
    } else {
      const beatDurationMs = clamp(rhythm?.beatDurationMs ?? 500, 260, 1_200)
      this.beatCycle += elapsed / beatDurationMs
      if (rhythm?.beat) {
        // Correzione rapida ma non istantanea: evita il salto duro del path.
        const phaseError = rhythm.beatIndex - this.beatCycle
        this.beatCycle += clamp(phaseError, -0.5, 0.5) * 0.78
      } else if (rhythm) {
        // Un richiamo molto debole impedisce deriva prolungata senza inseguire
        // il rumore del rilevatore a ogni frame.
        const trackingError = rhythm.musicalPosition - this.beatCycle
        this.beatCycle += clamp(trackingError, -0.25, 0.25) * 0.025
      }
    }

    const kickTarget = rhythm?.beat
      ? 1
      : clamp(transients.low * 0.86 + transients.lowMid * 0.22)
    const kickResponseMs = kickTarget > this.kickEnvelope ? 30 : 245
    const kickBlend = 1 - Math.exp(-elapsed / kickResponseMs)
    this.kickEnvelope += (kickTarget - this.kickEnvelope) * kickBlend

    // Come in Liquid, una fase lenta e persistente cambia gradualmente la
    // combinazione delle armoniche. Sotto la soglia audio resta ferma.
    const activityGate = clamp((activity - 0.012) / 0.42)
    const evolutionSpeed = 0.24 + activity * 0.72
    this.evolutionPhase +=
      (elapsed / 1_000) * evolutionSpeed * activityGate

    return {
      beatPhase: this.beatCycle * Math.PI * 2,
      evolutionPhase: this.evolutionPhase,
      kickEnvelope: this.kickEnvelope,
      activity,
    }
  }
}
