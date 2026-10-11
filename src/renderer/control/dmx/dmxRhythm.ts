// Ritmo delle luci (PIANO-049): la musica muove solo l'intensità, mai il
// colore. Riusa il clock ritmico condiviso (infrastruttura, non grammatica),
// alimentato con le stesse bande che la Control Window già calcola: il beat
// è catturato prima del frame pacing e senza IPC.
//
// intensità = pavimento + (1 − pavimento) × impulso. In silenzio l'impulso è
// 0 e le luci restano ferme al pavimento: nessuna pulsazione autonoma. Il
// pavimento evita il lampeggio (fotosensibilità); la salita è smussata.

import type { BandEnergies, MotionProfile } from '@shared/types'
import { OutputRhythmClock } from '../../output/brain/brainRhythm'

const FLOOR: Record<MotionProfile, number> = {
  techno: 0.6,
  dub: 0.75,
  ambient: 0.9,
}
const SMOOTHING_MS = 60

export interface DmxAudioFrame {
  bands: BandEnergies
  movingAverages: BandEnergies
  timestampMs: number
  sequence: number
}

export function rhythmLevel(pulse: number, profile: MotionProfile): number {
  const floor = FLOOR[profile] ?? FLOOR.dub
  return floor + (1 - floor) * Math.min(1, Math.max(0, pulse))
}

export function createDmxRhythm(
  readFrame: () => DmxAudioFrame | null,
  readProfile: () => MotionProfile,
  onBeat?: (beatDurationMs: number) => void,
) {
  const clock = new OutputRhythmClock()
  let lastSequence = -1
  let level = rhythmLevel(0, readProfile())
  let lastNow = 0

  return (now: number): number => {
    const frame = readFrame()
    if (frame && frame.sequence !== lastSequence) {
      lastSequence = frame.sequence
      clock.ingestSample(frame.bands, frame.timestampMs, frame.movingAverages)
    }
    const state = clock.projectState(performance.timeOrigin + now)
    if (state.beat && state.active !== false) onBeat?.(state.beatDurationMs)
    const target = rhythmLevel(state.active === false ? 0 : state.beatPulse, readProfile())
    const dt = lastNow > 0 ? Math.max(0, now - lastNow) : SMOOTHING_MS
    lastNow = now
    level += (target - level) * (1 - Math.exp(-dt / SMOOTHING_MS))
    return level
  }
}
