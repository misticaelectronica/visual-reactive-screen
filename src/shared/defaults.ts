import type { AppSettings } from './types'

export const DEFAULT_SETTINGS: AppSettings = {
  fftSize: 1024,
  smoothingTimeConstant: 0.75,
  lowThresholdMultiplier: 1.45,
  lowMidThresholdMultiplier: 1.6,
  midThresholdMultiplier: 1.7,
  highThresholdMultiplier: 1.8,
  flashDurationMs: 80,
  decayMs: 220,
  cooldownMs: 130,
  sensitivity: 1,
  maxFlashesPerSecond: 5,
  idleColor: '#050005',
  basePinkColor: '#ff4fd8',
  hotPinkColor: '#ff8bea',
  whiteFlashColor: '#ffffff',
  softMode: false,
  selectedDisplayId: null,
  selectedAudioInputId: null,
}
