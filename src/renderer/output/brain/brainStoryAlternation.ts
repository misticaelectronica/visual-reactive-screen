import type { AppSettings, MorphingAlgorithm } from '@shared/types'

const BRAIN_SHARE = 0.8
const MORPHING_SHARE = 0.2
export const MORPHING_INTERLUDE_TRANSITION_ALLOWANCE_MS = 12_000

export function calculateStoryMorphingInterludeMs(brainStoryDurationMs: number): number {
  const safeDuration = Math.max(0, brainStoryDurationMs)
  if (safeDuration === 0) return 0
  return Math.round(safeDuration * MORPHING_SHARE / BRAIN_SHARE) +
    MORPHING_INTERLUDE_TRANSITION_ALLOWANCE_MS
}

export function createAlternateBrainStorySettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    useBrain: true,
    useMorphing: false,
    brainRendererMode: 'story-cycle',
  }
}

export function createAlternateMorphingSettings(
  settings: AppSettings,
  algorithm: MorphingAlgorithm,
  presetId: string,
): AppSettings {
  return {
    ...settings,
    useBrain: false,
    useMorphing: true,
    morphingAlgorithm: algorithm,
    morphingPresetId: presetId,
  }
}
