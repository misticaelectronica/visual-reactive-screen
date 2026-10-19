import type { BandEnergies } from '@shared/types'

const TAU = Math.PI * 2
const CHANNELS = ['low', 'lowMid', 'mid', 'high'] as const
// Pixel della canvas 480×270: limite permanente, indipendente da energia,
// impulso e low power. Ridurre l'energia non riporta il pigmento all'origine.
export const PRINT_REGION_LIMITS = [3, 4, 2, 1] as const
export type PrintRegionState = {
  phase: number[]
  velocity: number[]
  position: number[]
  response: number[]
  initialized: boolean
}

export function createPrintRegionState(seed: number): PrintRegionState {
  return {
    phase: [0, 0, 0, 0],
    velocity: [0, 0, 0, 0],
    position: [0, 0, 0, 0],
    response: CHANNELS.map((_, index) => {
      const hash = Math.imul(seed ^ ((index + 1) * 7919), 0x45d9f3b) >>> 0
      return 0.14 + (hash % 1000) / 1000 * 0.28
    }),
    initialized: false,
  }
}

/** Un integratore per regione: smorza la velocità, mai la posizione.
 * Fase circolare filtrata prima della trigonometria, senza armoniche veloci
 * e senza clock autonomo. Le costanti locali e la storia di ogni banda
 * producono risposte differenti, non copie moltiplicate di quattro offset.
 */
export function advancePrintRegionState(
  state: PrintRegionState,
  bands: BandEnergies,
  phase: number,
  elapsedMs: number,
  beatDurationMs: number,
  active: boolean,
  frozen: boolean,
  profile: 'dub' | 'techno' | 'ambient',
): void {
  if (frozen) return
  if (!active) {
    state.velocity.fill(0)
    return
  }
  const dt = Math.max(0, Math.min(100, elapsedMs)) / 1000
  const beatSeconds = Math.max(240, Math.min(1200, beatDurationMs)) / 1000
  const profileScale = profile === 'ambient' ? 1.28 : profile === 'techno' ? 0.82 : 1
  const targetPhase = ((phase % 1) + 1) % 1 * TAU
  for (let index = 0; index < CHANNELS.length; index += 1) {
    if (!state.initialized) state.phase[index] = targetPhase
    const drive = Math.max(0, Math.min(2.7, bands[CHANNELS[index]]))
    const response = beatSeconds * state.response[index] * profileScale
    const delta = Math.atan2(
      Math.sin(targetPhase - state.phase[index]),
      Math.cos(targetPhase - state.phase[index]),
    )
    state.phase[index] = (state.phase[index] + delta * (1 - Math.exp(-dt / response))) % TAU
    const limit = PRINT_REGION_LIMITS[index]
    const targetVelocity = drive * limit / beatSeconds *
      Math.cos(state.phase[index] + index * Math.PI / 2)
    const decay = Math.exp(-dt / response)
    // Integrazione analitica della velocità smorzata: pas de ressort vers 0.
    const travel = targetVelocity * dt +
      (state.velocity[index] - targetVelocity) * response * (1 - decay)
    const next = state.position[index] + travel
    state.position[index] = Math.max(-limit, Math.min(limit, next))
    state.velocity[index] = next !== state.position[index]
      ? 0
      : targetVelocity + (state.velocity[index] - targetVelocity) * decay
  }
  state.initialized = true
}

export function printRegionOffsets(state: PrintRegionState) {
  return {
    depthMotion: state.position[0],
    propagationMotion: state.position[1],
    dislocationMotion: state.position[2],
    chromaticMotion: state.position[3],
  }
}
