import type { AppSettings, BandEnergies } from '@shared/types'
import { getBrainRenderingConfig } from './brainRenderingConfig'

export const BRAIN_FRAME_MORPH_PATTERNS = [
  'marea',
  'fioritura',
  'corrente',
  'spirale',
] as const

export type BrainFrameMorphPattern =
  (typeof BRAIN_FRAME_MORPH_PATTERNS)[number]

export type BrainDepthProfile = {
  depth: number
  phaseX: number
  phaseY: number
  phaseZ: number
  speedX: number
  speedY: number
  speedZ: number
  directionX: number
  directionY: number
}

export type BrainDepthMotion = {
  x: number
  y: number
  z: number
  rotateX: number
  rotateY: number
  rotateZ: number
  light: number
}

export type BrainPovMode =
  | 'deriva'
  | 'carrello-laterale'
  | 'orbita'
  | 'angolo-basso'

export type BrainCameraMotion = {
  mode: BrainPovMode
  x: number
  y: number
  yaw: number
  pitch: number
}

export type BrainMicroMotion = {
  normal: number
  tangent: number
}

export function calculateBrainSpectrumEnvelope(
  bands: BandEnergies,
  beatPulse: number,
): number {
  const broadbandEnergy =
    (bands.low + bands.lowMid + bands.mid + bands.high) / 4
  const spectralPeak = Math.max(
    bands.low,
    bands.lowMid,
    bands.mid,
    bands.high,
  )
  return Math.max(
    0,
    Math.min(
      1,
      broadbandEnergy * 0.55 +
        spectralPeak * 0.25 +
        Math.max(0, Math.min(1, beatPulse)) * 0.2,
    ),
  )
}

export function calculateBrainKickDisplacement(
  sceneDiagonal: number,
  deformationPercent: number,
  beatPulse: number,
  lowDrive: number,
  kickScale: number,
  resourceFactor = 1,
): number {
  const safeDiagonal = Math.max(0, sceneDiagonal)
  const safePercent = Math.max(0, Math.min(2, deformationPercent)) / 100
  const pulse = Math.max(0, Math.min(1, beatPulse))
  const lowWeight = 0.72 + Math.max(0, Math.min(1, lowDrive)) * 0.28
  return (
    safeDiagonal *
    safePercent *
    pulse *
    lowWeight *
    Math.max(0, kickScale) *
    Math.max(0, Math.min(1, resourceFactor))
  )
}

export function calculateBrainMicroMotion(
  sceneSeed: number,
  elementIndex: number,
  pointPhase: number,
  timeSeconds: number,
  depth: number,
  intensity: number,
): BrainMicroMotion {
  const phase =
    deterministicUnit(sceneSeed + elementIndex * 7_919 + 31_337) *
    Math.PI *
    2
  const safeIntensity = Math.max(0, Math.min(1.5, intensity))
  const slowTime =
    timeSeconds * (0.13 + deterministicUnit(elementIndex + 97) * 0.05)
  const spatialPhase = pointPhase * Math.PI * 2
  const organicDrift = Math.sin(
    slowTime +
      phase +
      spatialPhase * 1.07 +
      Math.sin(timeSeconds * 0.047 + phase * 0.63) * 0.58,
  )
  const lateralDrift = Math.cos(
    timeSeconds * 0.091 +
      phase * 1.31 -
      spatialPhase * 0.74 +
      organicDrift * 0.24,
  )
  const depthWeight = 0.72 + ((depth + 1) / 2) * 0.38
  return {
    normal: organicDrift * 1.15 * safeIntensity * depthWeight,
    tangent: lateralDrift * 0.46 * safeIntensity * depthWeight,
  }
}

export function calculateBrainMotionFrameInterval(
  lowPowerMode: boolean,
  svgLength: number,
): number {
  if (lowPowerMode) return 1_000 / 30
  if (svgLength >= 180_000) return 1_000 / 50
  return 1_000 / 60
}

function deterministicUnit(seed: number): number {
  let value = seed | 0
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b)
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b)
  value ^= value >>> 16
  return (value >>> 0) / 0xffffffff
}

export function calculateBrainCameraMotion(
  sceneSeed: number,
  timeSeconds: number,
  musicalPosition: number,
  pressure: number,
  pattern: BrainFrameMorphPattern,
): BrainCameraMotion {
  const scenePhase = deterministicUnit(sceneSeed + 5_003) * Math.PI * 2
  const secondaryPhase = deterministicUnit(sceneSeed + 11_117) * Math.PI * 2
  const slowTime = timeSeconds * 0.055 + musicalPosition * 0.012
  const breathing = 0.82 + Math.max(0, Math.min(1, pressure)) * 0.18

  if (pattern === 'corrente') {
    return {
      mode: 'carrello-laterale',
      x: Math.sin(slowTime * 0.74 + scenePhase) * breathing,
      y: Math.sin(slowTime * 0.31 + secondaryPhase) * 0.24,
      yaw: Math.cos(slowTime * 0.47 + scenePhase) * 0.58,
      pitch: Math.sin(slowTime * 0.23 + secondaryPhase) * 0.16,
    }
  }
  if (pattern === 'spirale') {
    return {
      mode: 'orbita',
      x: Math.sin(slowTime * 0.53 + scenePhase) * 0.72 * breathing,
      y: Math.cos(slowTime * 0.41 + scenePhase) * 0.48,
      yaw: Math.cos(slowTime * 0.53 + scenePhase) * 0.72,
      pitch: Math.sin(slowTime * 0.41 + secondaryPhase) * 0.34,
    }
  }
  if (pattern === 'fioritura') {
    return {
      mode: 'angolo-basso',
      x: Math.sin(slowTime * 0.29 + scenePhase) * 0.34,
      y: 0.28 + Math.sin(slowTime * 0.37 + secondaryPhase) * 0.18,
      yaw: Math.sin(slowTime * 0.21 + secondaryPhase) * 0.26,
      pitch: -0.42 + Math.cos(slowTime * 0.27 + scenePhase) * 0.16,
    }
  }
  return {
    mode: 'deriva',
    x:
      (Math.sin(slowTime * 0.43 + scenePhase) * 0.62 +
        Math.sin(slowTime * 0.17 + secondaryPhase) * 0.24) *
      breathing,
    y:
      Math.cos(slowTime * 0.32 + secondaryPhase) * 0.42 +
      Math.sin(slowTime * 0.13 + scenePhase) * 0.16,
    yaw: Math.sin(slowTime * 0.26 + scenePhase) * 0.36,
    pitch: Math.cos(slowTime * 0.19 + secondaryPhase) * 0.24,
  }
}

export function createBrainDepthProfile(
  index: number,
  total: number,
  sceneSeed: number,
): BrainDepthProfile {
  const seed = sceneSeed + index * 7_919 + total * 104_729
  const unit = (offset: number) => deterministicUnit(seed + offset * 15_431)
  const angle = unit(8) * Math.PI * 2
  return {
    depth: unit(1) * 2 - 1,
    phaseX: unit(2) * Math.PI * 2,
    phaseY: unit(3) * Math.PI * 2,
    phaseZ: unit(4) * Math.PI * 2,
    speedX: 0.12 + unit(5) * 0.11,
    speedY: 0.09 + unit(6) * 0.13,
    speedZ: 0.07 + unit(7) * 0.09,
    directionX: Math.cos(angle),
    directionY: Math.sin(angle),
  }
}

export function calculateBrainDepthMotion(
  profile: BrainDepthProfile,
  timeSeconds: number,
  musicalPosition: number,
  pressure: number,
  articulation: number,
  pattern: BrainFrameMorphPattern,
): BrainDepthMotion {
  const patternIndex = BRAIN_FRAME_MORPH_PATTERNS.indexOf(pattern)
  const slowTime = timeSeconds * (0.86 + patternIndex * 0.07)
  const musicalTime = musicalPosition * (0.075 + patternIndex * 0.006)
  const phaseModulation =
    Math.sin(slowTime * 0.071 + profile.phaseZ) * 0.82 +
    Math.sin(slowTime * 0.037 + profile.phaseY) * 0.46
  const waveX = Math.sin(
    slowTime * profile.speedX +
      musicalTime +
      profile.phaseX +
      phaseModulation,
  )
  const waveY = Math.sin(
    slowTime * profile.speedY * 1.173 +
      musicalTime * 0.73 +
      profile.phaseY +
      Math.sin(slowTime * 0.053 + profile.phaseX) * 0.71,
  )
  const waveZ = Math.cos(
    slowTime * profile.speedZ * 0.917 +
      musicalTime * 0.41 +
      profile.phaseZ +
      waveX * 0.34,
  )
  const crossWave = Math.sin(
    slowTime * (profile.speedX + profile.speedY) * 0.419 +
      profile.phaseX -
      profile.phaseY,
  )
  const depthWeight = 0.46 + ((profile.depth + 1) / 2) * 0.86
  const amplitude =
    (3.6 + pressure * 7.2 + articulation * 4.4) * depthWeight

  return {
    x:
      (waveX * 0.72 + crossWave * profile.directionX * 0.28) *
      amplitude,
    y:
      (waveY * 0.72 + crossWave * profile.directionY * 0.28) *
      amplitude,
    z: profile.depth * 34 + waveZ * (7 + pressure * 10),
    rotateX: (waveY + waveZ * 0.32) * (0.55 + depthWeight * 0.72),
    rotateY: (waveX - waveZ * 0.28) * (0.62 + depthWeight * 0.78),
    rotateZ: crossWave * (0.18 + articulation * 0.38),
    light: Math.max(
      -1,
      Math.min(
        1,
        profile.depth * 0.42 +
          waveZ * 0.46 +
          waveX * 0.12 +
          articulation * 0.16,
      ),
    ),
  }
}

export function brainPresetMotionTuning(settings: AppSettings): {
  movementScale: number
  kickScale: number
  fluidityMs: number
  colorInfluence: number
  colorSpeed: number
} {
  const profileScale =
    settings.motionProfile === 'techno'
      ? 1.12
      : settings.motionProfile === 'ambient'
        ? 0.72
        : 0.92
  const dynamicScale = settings.dynamicPresetEnabled ? 1.08 : 1
  const sensitivityScale = Math.max(
    0.55,
    Math.min(1.45, settings.sensitivity / 0.82),
  )
  const smoothingScale = 0.72 + settings.smoothingTimeConstant * 0.52
  const runtimeMotion = getBrainRenderingConfig().motion
  return {
    movementScale:
      profileScale *
      dynamicScale *
      sensitivityScale *
      runtimeMotion.movementMultiplier,
    kickScale: Math.max(0, Math.min(2, settings.kickMovement / 0.26)),
    fluidityMs:
      (settings.motionProfile === 'ambient'
        ? 980
        : settings.motionProfile === 'techno'
          ? 680
          : 820) * smoothingScale,
    colorInfluence: settings.dynamicPresetEnabled
      ? settings.dynamicColorRotationEnabled
        ? 0.68
        : 0.52
      : settings.selectedColorPresetId
        ? 0.4
        : 0.2,
    colorSpeed:
      settings.dynamicPresetEnabled && settings.dynamicColorRotationEnabled
        ? 1.18 * runtimeMotion.colorSpeedMultiplier
        : runtimeMotion.colorSpeedMultiplier,
  }
}

export function selectBrainFrameMorphPattern(
  previous: BrainFrameMorphPattern | null,
  random: () => number = Math.random,
): BrainFrameMorphPattern {
  const configuredPatterns = getBrainRenderingConfig().motion.patterns
  const candidates = configuredPatterns.filter(
    (pattern) => pattern !== previous,
  )
  if (candidates.length === 0) {
    return configuredPatterns[0] ?? 'marea'
  }
  const index = Math.min(
    candidates.length - 1,
    Math.floor(Math.max(0, random()) * candidates.length),
  )
  return candidates[index]
}

export function selectBrainRecycledFrameIndex(
  frameCount: number,
  currentIndex: number,
  random: () => number = Math.random,
): number {
  if (frameCount <= 1) return 0
  const candidates = Array.from(
    { length: frameCount },
    (_, index) => index,
  ).filter((index) => index !== currentIndex)
  const index = Math.min(
    candidates.length - 1,
    Math.floor(Math.max(0, random()) * candidates.length),
  )
  return candidates[index]
}

export function calculateBrainFrameTiming(
  beatDurationMs: number,
  requestedFrameDurationMs: number,
  pattern: BrainFrameMorphPattern,
): {
  transitionMs: number
  holdMs: number
  totalMs: number
} {
  const timing = getBrainRenderingConfig().timing
  const patternIndex = BRAIN_FRAME_MORPH_PATTERNS.indexOf(pattern)
  const safeBeatDuration = Math.max(260, Math.min(1_200, beatDurationMs))
  // Il morph attraversa una frase musicale lunga, ma i livelli interni
  // avanzano sul singolo beat. Così la transizione è lenta senza diventare
  // una dissolvenza inerte o un'oscillazione autonoma.
  const transitionBeats = 12 + (patternIndex % 3) * 2
  const holdBeats = 8 + ((patternIndex + 1) % 3) * 2
  const transitionMs = Math.max(
    timing.transitionMinMs,
    Math.min(
      timing.transitionMaxMs,
      safeBeatDuration * transitionBeats,
    ),
  )
  const holdMs = Math.max(
    timing.holdMinMs,
    Math.min(timing.holdMaxMs, safeBeatDuration * holdBeats),
  )
  return {
    transitionMs,
    holdMs,
    totalMs: Math.max(
      requestedFrameDurationMs,
      transitionMs + holdMs,
    ),
  }
}
