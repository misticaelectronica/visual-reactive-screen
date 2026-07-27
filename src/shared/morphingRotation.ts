import { MORPHING_PRESETS } from './morphingPresets'
import { PSY_HYP_MORPHING_PRESETS } from './psyHypMorphingShapes'
import { SLIT_SCAN_PRESETS } from './slitScanPresets'
import type { AppSettings, MorphingAlgorithm } from './types'

export type MorphingRotationCandidate = {
  id: string
  label: string
  algorithm: 'none' | MorphingAlgorithm
  presetId?: string
}

export function buildMorphingRotationCandidates(): MorphingRotationCandidate[] {
  return [
    { id: 'no-morphing', label: 'No Morphing', algorithm: 'none' },
    ...MORPHING_PRESETS.map((preset) => ({
      id: `liquid:${preset.id}`,
      label: `Liquid Morphing - ${preset.name}`,
      algorithm: 'liquid' as const,
      presetId: preset.id,
    })),
    {
      id: 'oniric:default',
      label: 'Oniric Morphing - default',
      algorithm: 'oniric',
      presetId: 'default',
    } as const,
    ...MORPHING_PRESETS.map((preset) => ({
      id: `oniric:${preset.id}`,
      label: `Oniric Morphing - ${preset.name}`,
      algorithm: 'oniric' as const,
      presetId: preset.id,
    })),
    ...PSY_HYP_MORPHING_PRESETS.map((preset) => ({
      id: `psy-hyp:${preset.id}`,
      label: `PsyHypMorphing - ${preset.name}`,
      algorithm: 'psy-hyp' as const,
      presetId: preset.id,
    })),
    ...SLIT_SCAN_PRESETS.map((preset) => ({
      id: `2001:${preset.id}`,
      label: preset.name,
      algorithm: '2001' as const,
      presetId: preset.id,
    })),
  ]
}

export function morphingRotationCandidateFromSettings(
  settings: AppSettings,
): MorphingRotationCandidate {
  if (!settings.useMorphing) {
    return { id: 'no-morphing', label: 'No Morphing', algorithm: 'none' }
  }
  return {
    id: `${settings.morphingAlgorithm}:${settings.morphingPresetId}`,
    label: `${settings.morphingAlgorithm} - ${settings.morphingPresetId}`,
    algorithm: settings.morphingAlgorithm,
    presetId: settings.morphingPresetId,
  }
}

export function pickMorphingRotationCandidate(
  current: MorphingRotationCandidate,
  forceNoMorphing: boolean,
  random: () => number = Math.random,
): MorphingRotationCandidate {
  const candidates = buildMorphingRotationCandidates()
  if (forceNoMorphing) return candidates[0]

  const pools = {
    liquid: candidates.filter(
      (candidate) => candidate.algorithm === 'liquid' && candidate.id !== current.id,
    ),
    oniric: candidates.filter(
      (candidate) => candidate.algorithm === 'oniric' && candidate.id !== current.id,
    ),
    psyHyp: candidates.filter(
      (candidate) => candidate.algorithm === 'psy-hyp' && candidate.id !== current.id,
    ),
    slitScan: candidates.filter(
      (candidate) => candidate.algorithm === '2001' && candidate.id !== current.id,
    ),
  }
  const weightedFamilies = [
    { family: 'liquid' as const, weight: pools.liquid.length > 0 ? 0.23 : 0 },
    { family: 'oniric' as const, weight: pools.oniric.length > 0 ? 0.23 : 0 },
    { family: 'psyHyp' as const, weight: pools.psyHyp.length > 0 ? 0.24 : 0 },
    { family: 'slitScan' as const, weight: pools.slitScan.length > 0 ? 0.20 : 0 },
  ]
  const total = weightedFamilies.reduce((sum, item) => sum + item.weight, 0)
  if (total <= 0) {
    const fallback = candidates.filter(
      (candidate) => candidate.id !== current.id && candidate.algorithm !== 'none',
    )
    return fallback[Math.floor(random() * fallback.length) % fallback.length] ?? candidates[0]
  }

  let roll = random() * total
  for (const item of weightedFamilies) {
    roll -= item.weight
    if (roll <= 0) {
      const pool =
        item.family === 'slitScan'
          ? pools.slitScan
          : item.family === 'liquid'
            ? pools.liquid
            : item.family === 'oniric'
              ? pools.oniric
              : pools.psyHyp
      return pool[Math.floor(random() * pool.length) % pool.length]
    }
  }
  const pool =
    pools.psyHyp.length > 0
      ? pools.psyHyp
      : pools.liquid.length > 0
        ? pools.liquid
        : pools.oniric
  return pool[Math.floor(random() * pool.length) % pool.length]
}
