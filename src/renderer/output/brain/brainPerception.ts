import type { BandEnergies } from '@shared/types'
import type { BrainRhythmState } from './brainRhythm'
import type { BrainRenderingConfig } from './brainRenderingConfig'

export type BrainPerceptualState = {
  energy: number
  density: number
  texture: number
  transient: number
  continuity: number
  spectralBalance: number
  complexity: number
  depth: number
  disorder: number
  metamorphosis: number
  persistence: number
  symmetry: number
  propagation: number
  chromaticShift: number
}

const EMPTY_STATE: BrainPerceptualState = {
  energy: 0,
  density: 0,
  texture: 0,
  transient: 0,
  continuity: 1,
  spectralBalance: 0.5,
  complexity: 0,
  depth: 0,
  disorder: 0,
  metamorphosis: 0,
  persistence: 0,
  symmetry: 0,
  propagation: 0,
  chromaticShift: 0,
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value))
}

function blend(current: number, target: number, elapsedMs: number, timeMs: number): number {
  const factor = 1 - Math.exp(-Math.max(1, elapsedMs) / Math.max(1, timeMs))
  return current + (target - current) * factor
}

export class BrainPerceptionEngine {
  private previous: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }
  private state: BrainPerceptualState = { ...EMPTY_STATE }
  private initialized = false

  update(
    bands: BandEnergies,
    rhythm: BrainRhythmState | undefined,
    elapsedMs: number,
    config: BrainRenderingConfig['transformation'],
    movingAverages?: BandEnergies,
  ): BrainPerceptualState {
    if (!config.enabled) {
      this.previous = { ...bands }
      this.state = { ...EMPTY_STATE }
      return this.state
    }

    const values = [bands.low, bands.lowMid, bands.mid, bands.high].map(
      (value) => clamp(value),
    )
    const previous = [
      this.previous.low,
      this.previous.lowMid,
      this.previous.mid,
      this.previous.high,
    ]
    const baseline = movingAverages
      ? [
          movingAverages.low,
          movingAverages.lowMid,
          movingAverages.mid,
          movingAverages.high,
        ]
      : previous
    const baselineRise =
      values.reduce(
        (sum, value, index) => sum + Math.max(0, value - baseline[index]),
        0,
      ) / values.length
    const baselineDistance =
      values.reduce(
        (sum, value, index) => sum + Math.abs(value - baseline[index]),
        0,
      ) / values.length
    const positiveFlux = this.initialized || movingAverages
      ? values.reduce(
          (sum, value, index) => sum + Math.max(0, value - previous[index]),
          0,
        ) /
          values.length +
        baselineRise * 0.48
      : 0
    const spectralChange = this.initialized || movingAverages
      ? values.reduce(
          (sum, value, index) => sum + Math.abs(value - previous[index]),
          0,
        ) /
          values.length +
        baselineDistance * 0.32
      : 0
    const energy = clamp(
      bands.low * 0.34 +
        bands.lowMid * 0.28 +
        bands.mid * 0.23 +
        bands.high * 0.15,
    )
    const activeBands =
      values.filter((value) => value >= Math.max(0.08, energy * 0.58)).length /
      values.length
    const weightedFrequency =
      values.reduce((sum, value, index) => sum + value * index, 0) /
      Math.max(0.001, values.reduce((sum, value) => sum + value, 0)) /
      3
    const spectralSpread = Math.sqrt(
      values.reduce(
        (sum, value, index) =>
          sum + value * (index / 3 - weightedFrequency) ** 2,
        0,
      ) / Math.max(0.001, values.reduce((sum, value) => sum + value, 0)),
    )
    const beatPulse = clamp(rhythm?.beatPulse ?? 0)
    const transient = clamp(positiveFlux * 3.6 + beatPulse * 0.34)
    const texture = clamp(
      bands.high * 0.44 +
        bands.mid * 0.2 +
        spectralSpread * 0.62 +
        spectralChange * 1.2,
    )
    const density = clamp(activeBands * 0.52 + energy * 0.48)
    const continuity = clamp(
      1 - spectralChange * 2.8 - transient * 0.34 + energy * 0.12,
    )
    const depth = clamp(
      bands.low * 0.58 +
        bands.lowMid * 0.26 +
        (1 - weightedFrequency) * energy * 0.24,
    )
    const complexity = clamp(
      density * 0.34 +
        texture * 0.34 +
        spectralChange * 1.4 +
        activeBands * 0.18,
    )
    const disorder = clamp(
      texture * 0.32 +
        spectralChange * 1.7 +
        transient * 0.26 +
        spectralSpread * 0.28,
    )
    const intensity = config.intensity
    const targets: BrainPerceptualState = {
      energy,
      density,
      texture,
      transient,
      continuity,
      spectralBalance: weightedFrequency,
      complexity: clamp(complexity * intensity),
      depth: clamp(depth * intensity),
      disorder: clamp(disorder * intensity),
      metamorphosis: clamp(
        (complexity * 0.46 + continuity * energy * 0.3 + spectralChange * 0.72) *
          intensity,
      ),
      persistence: clamp(
        (energy * 0.46 + continuity * 0.4 + density * 0.22) * intensity,
      ),
      symmetry: clamp(
        (continuity * 0.46 +
          (1 - Math.abs(weightedFrequency - 0.5) * 2) * 0.3 +
          energy * 0.18) *
          intensity,
      ),
      propagation: clamp(
        (transient * 0.52 + bands.lowMid * 0.3 + complexity * 0.28) *
          intensity,
      ),
      chromaticShift: clamp(
        (weightedFrequency * 0.42 + texture * 0.34 + energy * 0.24) *
          intensity,
      ),
    }

    const responseMs = this.initialized ? config.responseMs : 1
    const memoryMs = config.memoryMs
    const next = { ...this.state }
    for (const key of Object.keys(targets) as (keyof BrainPerceptualState)[]) {
      const target = targets[key]
      const release =
        key === 'persistence' || key === 'metamorphosis'
          ? memoryMs
          : key === 'transient' || key === 'propagation'
            ? responseMs * 0.48
            : memoryMs * 0.56
      next[key] = blend(
        this.state[key],
        target,
        elapsedMs,
        target > this.state[key] ? responseMs : release,
      )
    }

    this.previous = { ...bands }
    this.state = next
    this.initialized = true
    return { ...next }
  }
}
