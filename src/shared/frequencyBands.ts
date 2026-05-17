import type { BandKey } from './types'

export interface FrequencyBandRange {
  key: BandKey
  minHz: number
  maxHz: number
}

export const FREQUENCY_BANDS: FrequencyBandRange[] = [
  { key: 'low', minHz: 40, maxHz: 160 },
  { key: 'lowMid', minHz: 160, maxHz: 400 },
  { key: 'mid', minHz: 400, maxHz: 2000 },
  { key: 'high', minHz: 2000, maxHz: 8000 },
]

export interface BinRange {
  startBin: number
  endBin: number
}

/**
 * Mappa un intervallo di frequenze agli indici FFT (getByteFrequencyData).
 * freq(k) ≈ k * sampleRate / fftSize, k ∈ [0, frequencyBinCount).
 */
export function bandToBinRange(
  minHz: number,
  maxHz: number,
  sampleRate: number,
  fftSize: number,
): BinRange {
  const binCount = Math.floor(fftSize / 2)
  const nyquist = sampleRate / 2
  const maxHzClamped = Math.min(maxHz, nyquist - 1e-6)
  const minHzClamped = Math.max(minHz, 0)

  let start = Math.floor((minHzClamped * fftSize) / sampleRate)
  let end = Math.ceil((maxHzClamped * fftSize) / sampleRate) - 1

  start = Math.max(0, Math.min(binCount - 1, start))
  end = Math.max(start, Math.min(binCount - 1, end))
  return { startBin: start, endBin: end }
}

export function allBandBinRanges(
  sampleRate: number,
  fftSize: number,
): Record<BandKey, BinRange> {
  const out = {} as Record<BandKey, BinRange>
  for (const band of FREQUENCY_BANDS) {
    out[band.key] = bandToBinRange(band.minHz, band.maxHz, sampleRate, fftSize)
  }
  return out
}
