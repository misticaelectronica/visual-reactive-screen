import { pickMorphingRotationCandidate } from '@shared/morphingRotation'
import type { MorphingAlgorithm, VisualStatePayload } from '@shared/types'
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

export function selectBrainInterlude(
  previous: BrainInterludeSpec | null,
  random: () => number = Math.random,
): BrainInterludeSpec {
  const candidate = pickMorphingRotationCandidate(
    previous
      ? {
          id: `${previous.algorithm}:${previous.presetId}`,
          label: `${previous.algorithm} - ${previous.presetId}`,
          algorithm: previous.algorithm,
          presetId: previous.presetId,
        }
      : { id: 'no-morphing', label: 'No Morphing', algorithm: 'none' },
    false,
    random,
  )
  if (candidate.algorithm === 'none' || !candidate.presetId) {
    throw new Error('Rotazione morphing non ha restituito un renderer valido per Brain')
  }
  return { algorithm: candidate.algorithm, presetId: candidate.presetId }
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
