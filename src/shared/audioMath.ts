import type { BandKey, BandEnergies } from './types'
import type { BinRange } from './frequencyBands'
import { FREQUENCY_BANDS } from './frequencyBands'

function averageBinEnergy(data: ArrayLike<number>, range: BinRange): number {
  const { startBin, endBin } = range
  if (endBin < startBin) return 0
  let sum = 0
  const count = endBin - startBin + 1
  for (let i = startBin; i <= endBin; i++) {
    sum += data[i] ?? 0
  }
  return sum / count / 255
}

export function computeBandEnergies(
  frequencyData: ArrayLike<number>,
  binRanges: Record<BandKey, BinRange>,
): BandEnergies {
  const energies = {} as BandEnergies
  for (const band of FREQUENCY_BANDS) {
    energies[band.key] = averageBinEnergy(frequencyData, binRanges[band.key])
  }
  return energies
}

export function exponentialSmoothing(
  previous: number,
  value: number,
  alpha: number,
): number {
  return previous * alpha + value * (1 - alpha)
}

export function smoothBandEnergies(
  previous: BandEnergies,
  next: BandEnergies,
  alpha: number,
): BandEnergies {
  return {
    low: exponentialSmoothing(previous.low, next.low, alpha),
    lowMid: exponentialSmoothing(previous.lowMid, next.lowMid, alpha),
    mid: exponentialSmoothing(previous.mid, next.mid, alpha),
    high: exponentialSmoothing(previous.high, next.high, alpha),
  }
}

/** Media mobile più lenta per soglie dinamiche */
export function updateMovingAverage(
  previous: BandEnergies,
  sample: BandEnergies,
  alphaSlow: number,
): BandEnergies {
  return smoothBandEnergies(previous, sample, alphaSlow)
}
