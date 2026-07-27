import { MORPHING_PRESETS } from '@shared/morphingPresets'
import { PSY_HYP_MORPHING_PRESETS } from '@shared/psyHypMorphingShapes'
import { SLIT_SCAN_PRESETS } from '@shared/slitScanPresets'
import {
  MORPHING_ALGORITHMS,
  type MorphingAlgorithm,
  type VisualStatePayload,
} from '@shared/types'
import { createMorphingCanvas } from '../morphingCanvas'
import { createOniricMorphingCanvas } from '../oniricMorphingCanvas'
import { createPsyHypMorphingCanvas } from '../psyHypMorphingCanvas'
import { create2001MorphingCanvas } from '../slitScanCanvas'

export type BrainInterludeSpec = {
  algorithm: MorphingAlgorithm
  presetId: string
}

export type BrainInterludeController = {
  updateState: (payload: VisualStatePayload) => void
  setOpacity?: (opacity: number) => void
  destroy: () => void
}

const PRESETS_BY_ALGORITHM: Record<MorphingAlgorithm, readonly string[]> = {
  liquid: MORPHING_PRESETS.map((preset) => preset.id),
  oniric: MORPHING_PRESETS.map((preset) => preset.id),
  'psy-hyp': PSY_HYP_MORPHING_PRESETS.map((preset) => preset.id),
  '2001': SLIT_SCAN_PRESETS.map((preset) => preset.id),
}

export function selectBrainInterlude(
  previousAlgorithm: MorphingAlgorithm | null,
  random: () => number = Math.random,
): BrainInterludeSpec {
  const algorithms = MORPHING_ALGORITHMS.filter(
    (algorithm) => algorithm !== previousAlgorithm,
  )
  const algorithm =
    algorithms[Math.floor(random() * algorithms.length) % algorithms.length]
  const presets = PRESETS_BY_ALGORITHM[algorithm]
  const presetId = presets[Math.floor(random() * presets.length) % presets.length]
  return { algorithm, presetId }
}

export function createBrainInterlude(
  container: HTMLElement,
  spec: BrainInterludeSpec,
): BrainInterludeController {
  if (spec.algorithm === 'oniric') return createOniricMorphingCanvas(container)
  if (spec.algorithm === 'psy-hyp') return createPsyHypMorphingCanvas(container)
  if (spec.algorithm === '2001') return create2001MorphingCanvas(container)
  return createMorphingCanvas(container)
}

export function interludePayload(
  payload: VisualStatePayload,
  spec: BrainInterludeSpec,
): VisualStatePayload {
  if (!payload.settings) return payload
  return {
    ...payload,
    useMorphing: true,
    settings: {
      ...payload.settings,
      useBrain: false,
      useMorphing: true,
      morphingAlgorithm: spec.algorithm,
      morphingPresetId: spec.presetId,
    },
  }
}
