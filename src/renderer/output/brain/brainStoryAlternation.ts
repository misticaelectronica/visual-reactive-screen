import type { AppSettings, MorphingAlgorithm } from '@shared/types'

const BRAIN_SHARE = 0.8
const MORPHING_SHARE = 0.2

export function calculateStoryMorphingInterludeMs(brainStoryDurationMs: number): number {
  const safeDuration = Math.max(0, brainStoryDurationMs)
  return Math.round(safeDuration * MORPHING_SHARE / BRAIN_SHARE)
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
