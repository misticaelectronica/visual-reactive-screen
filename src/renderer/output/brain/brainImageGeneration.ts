import { DEFAULT_BRAIN_NEGATIVE_PROMPT, DEFAULT_SETTINGS } from '@shared/defaults'
import type { ImageRenderMode } from '@shared/brain/brainTypes'
import type { AppSettings, BrainImageQuality } from '@shared/types'
import type { BrainRenderingConfig } from './brainRenderingConfig'
import type { Sd15GuidanceMode } from './sd15OnnxWebGpu'

/**
 * Impostazioni di generazione scelte dal pannello (PIANO-050). Store fuori
 * istanza: il controller lo aggiorna a ogni payload, i generatori lo leggono
 * al momento della richiesta.
 */
export type BrainImageGenerationSettings = {
  quality: BrainImageQuality
  negativePrompt: string
}

let activeSettings: BrainImageGenerationSettings = {
  quality: DEFAULT_SETTINGS.brainImageQuality,
  negativePrompt: DEFAULT_BRAIN_NEGATIVE_PROMPT,
}

export function setBrainImageGenerationSettings(
  settings: Pick<AppSettings, 'brainImageQuality' | 'brainNegativePrompt'> | undefined,
): void {
  if (!settings) return
  activeSettings = {
    quality: settings.brainImageQuality ?? DEFAULT_SETTINGS.brainImageQuality,
    negativePrompt: settings.brainNegativePrompt ?? DEFAULT_BRAIN_NEGATIVE_PROMPT,
  }
}

export function getBrainImageGenerationSettings(): BrainImageGenerationSettings {
  return activeSettings
}

type QualitySteps = Pick<
  BrainRenderingConfig['image'],
  'standardSteps' | 'enhancedSteps' | 'qualitySteps'
>

/**
 * Con la classifier-free guidance ogni step costa circa il doppio: `low`
 * (default, disp. Capo Supremo 2026-10-11) resta vicino ai tempi del ramo
 * singolo; `high` usa gli step di `config/brainRendering.json`.
 */
export const BRAIN_IMAGE_QUALITY_STEPS: Record<
  Exclude<BrainImageQuality, 'high'>,
  QualitySteps
> = {
  low: { standardSteps: 8, enhancedSteps: 10, qualitySteps: 14 },
  mid: { standardSteps: 10, enhancedSteps: 13, qualitySteps: 19 },
}

export function resolveBrainImageSteps(
  mode: ImageRenderMode,
  quality: BrainImageQuality,
  image: BrainRenderingConfig['image'],
): number {
  // L'interludio resta il livello "usa e getta" dei fotogrammi eco/transizione.
  if (mode === 'interlude') return image.interludeSteps
  const steps = quality === 'high' ? image : BRAIN_IMAGE_QUALITY_STEPS[quality]
  return mode === 'high-quality'
    ? steps.qualitySteps
    : mode === 'enhanced'
      ? steps.enhancedSteps
      : steps.standardSteps
}

/**
 * La guidance tiene la coerenza anatomica dei corpi e porta il negative
 * prompt; l'interludio, a bassa risoluzione e mai pensato per la leggibilità
 * delle figure, resta a ramo singolo per non raddoppiarne il costo.
 */
export function resolveBrainImageGuidanceMode(mode: ImageRenderMode): Sd15GuidanceMode {
  return mode === 'interlude' ? 'single-conditional' : 'cfg-batch'
}
