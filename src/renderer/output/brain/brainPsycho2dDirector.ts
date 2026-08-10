import type { Psycho2DImageAnalysis, Psycho2DRegion } from './brainPsycho2dAnalysis'

export type Psycho2DContentKind =
  | 'CURRENT_DETAIL'
  | 'PREVIOUS_IMAGE'
  | 'NEXT_IMAGE'
  | 'NEXT_IMAGE_DETAIL'

export type Psycho2DSourceRole = 'current' | 'previous' | 'next'

export type Psycho2DDirectorSource = {
  id: string
  role: Psycho2DSourceRole
  analysis: Psycho2DImageAnalysis
}

export type Psycho2DWindowPlan = {
  id: string
  content: Psycho2DContentKind
  sourceImageId: string
  crop: Psycho2DRegion
  from: Psycho2DRegion
  to: Psycho2DRegion
  shape: 'rect' | 'rounded-rect' | 'ellipse'
  takeover: boolean
  opacity: number
}

export type Psycho2DScenePlan = {
  id: string
  seed: number
  baseImageId: string
  durationMs: number
  windows: Psycho2DWindowPlan[]
  takeoverWindowId?: string
}

function unit(seed: number): number {
  let value = seed | 0
  value ^= value << 13
  value ^= value >>> 17
  value ^= value << 5
  return (value >>> 0) / 0xffffffff
}

function fixedOverlayRegion(seed: number): Psycho2DRegion {
  const width = 0.3 + unit(seed + 11) * 0.18
  const height = 0.3 + unit(seed + 23) * 0.18
  const marginX = 0.04
  const marginY = 0.06
  return {
    x: marginX + unit(seed + 37) * Math.max(0, 1 - width - marginX * 2),
    y: marginY + unit(seed + 53) * Math.max(0, 1 - height - marginY * 2),
    width,
    height,
    score: 1,
    source: 'fallback',
  }
}

export function createPsycho2dScenePlan(
  sources: readonly Psycho2DDirectorSource[],
  seed: number,
  lowPowerMode: boolean,
): Psycho2DScenePlan | null {
  void lowPowerMode
  const current = sources.find((source) => source.role === 'current') ?? sources[0]
  if (!current) return null
  const next = sources.find((source) => source.role === 'next')
  const previous = sources.find((source) => source.role === 'previous')
  const target = next ?? previous
  const overlay = fixedOverlayRegion(seed)
  const windows: Psycho2DWindowPlan[] = []

  if (target) {
    const luminanceDistance = Math.abs(
      current.analysis.luminance - target.analysis.luminance,
    )
    const opacity = Math.max(
      0.38,
      Math.min(0.64, 0.4 + target.analysis.contrast * 0.14 + luminanceDistance * 0.08),
    )
    windows.push({
      id: `overlay-${target.id}`,
      content: target.role === 'next' ? 'NEXT_IMAGE' : 'PREVIOUS_IMAGE',
      sourceImageId: target.id,
      crop: { x: 0, y: 0, width: 1, height: 1, score: 1, source: 'pixels' },
      from: overlay,
      to: overlay,
      shape: 'rect',
      takeover: false,
      opacity,
    })
  }
  return {
    id: `psycho2d-${current.id}-${seed >>> 0}`,
    seed: seed >>> 0,
    baseImageId: current.id,
    durationMs: 10_000 + Math.round(unit(seed + 83) * 6_000),
    windows: windows.slice(0, 1),
  }
}
