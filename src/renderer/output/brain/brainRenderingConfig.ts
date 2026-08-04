import { brainLog, brainWarn } from './brainLog'
import type { BrainFrameMorphPattern } from './brainFrameMotion'
import type { BrainVectorizationOptions } from '@shared/types'

const ALLOWED_MORPH_PATTERNS = [
  'marea',
  'fioritura',
  'corrente',
  'spirale',
] as const satisfies readonly BrainFrameMorphPattern[]

export type BrainRenderingConfig = {
  image: {
    width: number
    height: number
    standardSteps: number
    interludeSteps: number
    enhancedSteps: number
    qualitySteps: number
  }
  timing: {
    frameDurationMs: number
    transitionMinMs: number
    transitionMaxMs: number
    holdMinMs: number
    holdMaxMs: number
    firstFrameTransitionMs: number
  }
  composition: {
    preserveAspectRatio: 'xMidYMid meet' | 'xMidYMid slice'
    horizontalStretch: number
    verticalStretch: number
    blurPx: number
    edgeFeatherPx: number
    edgeDarkness: number
  }
  motion: {
    movementMultiplier: number
    cameraMultiplier: number
    liquidMultiplier: number
    microMovement: number
    colorSpeedMultiplier: number
    maximumAnimatedAreaRatio: number
    backgroundMotionScale: number
    patterns: BrainFrameMorphPattern[]
  }
  globalRhythmicMotion: {
    enabled: boolean
    intensity: number
    deformationBoost: number
    flowBoost: number
    kickDeformationPercent: number
    responseMs: number
    resourcePressureBoost: number
  }
  vectorization: BrainVectorizationOptions
  transformation: {
    enabled: boolean
    intensity: number
    responseMs: number
    memoryMs: number
    organicDeformation: number
    duplication: number
    persistence: number
    stratification: number
    unstableSymmetry: number
    perspective: number
    propagation: number
    dissolution: number
    metamorphosis: number
    chromaticAlteration: number
    disintegration: number
    maxEchoLayers: number
  }
}

type BrainRenderingConfigInput = {
  [Section in keyof BrainRenderingConfig]?: Partial<BrainRenderingConfig[Section]>
}

export const DEFAULT_BRAIN_RENDERING_CONFIG: BrainRenderingConfig = {
  image: {
    width: 640,
    height: 360,
    standardSteps: 8,
    interludeSteps: 4,
    enhancedSteps: 12,
    qualitySteps: 20,
  },
  timing: {
    frameDurationMs: 14_000,
    transitionMinMs: 6_000,
    transitionMaxMs: 9_000,
    holdMinMs: 3_500,
    holdMaxMs: 5_500,
    firstFrameTransitionMs: 2_500,
  },
  composition: {
    preserveAspectRatio: 'xMidYMid slice',
    horizontalStretch: 1.05,
    verticalStretch: 1.02,
    blurPx: 0.35,
    edgeFeatherPx: 52,
    edgeDarkness: 0.18,
  },
  motion: {
    movementMultiplier: 1.08,
    cameraMultiplier: 0.25,
    liquidMultiplier: 1.12,
    microMovement: 0.68,
    colorSpeedMultiplier: 1,
    maximumAnimatedAreaRatio: 0.34,
    backgroundMotionScale: 0.06,
    patterns: [...ALLOWED_MORPH_PATTERNS],
  },
  globalRhythmicMotion: {
    enabled: true,
    intensity: 1.1,
    deformationBoost: 0.62,
    flowBoost: 0.78,
    kickDeformationPercent: 0.72,
    responseMs: 220,
    resourcePressureBoost: 0.82,
  },
  vectorization: {
    engine: 'snic',
    fallbackToVTracer: true,
    preprocessEnabled: true,
    denoiseRadius: 1,
    denoiseStrength: 0.28,
    localContrast: 0,
    colorSeparation: 0,
    minimumEdgeRetention: 0.86,
    paletteColors: 16,
    spatialCleanupPasses: 1,
    maximumContourRoughness: 0.16,
    contourRoughnessPenalty: 1_200,
    spikeDetectionEnabled: true,
    minimumCornerAngleDegrees: 24,
    minimumSpikeLengthRatio: 0.012,
    maximumAcceptedSpikes: 1,
    spikePenalty: 420,
    roundedFinishEnabled: true,
    roundedStrokeWidth: 0.6,
    roundedStrokeOpacity: 0.55,
    snicSuperpixelSize: 24,
    snicCompactness: 9,
    snicMergeColorThreshold: 10,
    snicStrongEdgeThreshold: 8,
    snicEdgeWeight: 0.7,
    snicMinimumRegionAreaRatio: 0.0006,
    snicMaximumRegions: 72,
    contourSimplificationTolerance: 1.7,
    contourCurveSmoothing: 0.34,
    contourMaximumPoints: 2_400,
    minimumContourAreaRatio: 0.00008,
    minimumStrongEdgeRecall: 0.7,
  },
  transformation: {
    enabled: true,
    intensity: 0.82,
    responseMs: 920,
    memoryMs: 4_200,
    organicDeformation: 0.82,
    duplication: 0.52,
    persistence: 0.58,
    stratification: 0.68,
    unstableSymmetry: 0.42,
    perspective: 0.72,
    propagation: 0.76,
    dissolution: 0.46,
    metamorphosis: 0.72,
    chromaticAlteration: 0.68,
    disintegration: 0.54,
    maxEchoLayers: 3,
  },
}

let activeConfig: BrainRenderingConfig = structuredClone(DEFAULT_BRAIN_RENDERING_CONFIG)

function finiteNumber(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(minimum, Math.min(maximum, value))
    : fallback
}

function imageDimension(value: unknown, fallback: number): number {
  const clamped = finiteNumber(value, fallback, 256, 1_024)
  return Math.round(clamped / 8) * 8
}

export function normalizeBrainRenderingConfig(
  value: unknown,
): BrainRenderingConfig {
  const input =
    typeof value === 'object' && value !== null
      ? value as BrainRenderingConfigInput
      : {}
  const image: Partial<BrainRenderingConfig['image']> = input.image ?? {}
  const timing: Partial<BrainRenderingConfig['timing']> = input.timing ?? {}
  const composition: Partial<BrainRenderingConfig['composition']> =
    input.composition ?? {}
  const motion: Partial<BrainRenderingConfig['motion']> = input.motion ?? {}
  const globalRhythmicMotion:
    Partial<BrainRenderingConfig['globalRhythmicMotion']> =
      input.globalRhythmicMotion ?? {}
  const vectorization: Partial<BrainRenderingConfig['vectorization']> =
    input.vectorization ?? {}
  const transformation: Partial<BrainRenderingConfig['transformation']> =
    input.transformation ?? {}
  const transitionMinMs = finiteNumber(
    timing.transitionMinMs,
    DEFAULT_BRAIN_RENDERING_CONFIG.timing.transitionMinMs,
    250,
    15_000,
  )
  const transitionMaxMs = Math.max(
    transitionMinMs,
    finiteNumber(
      timing.transitionMaxMs,
      DEFAULT_BRAIN_RENDERING_CONFIG.timing.transitionMaxMs,
      250,
      20_000,
    ),
  )
  const holdMinMs = finiteNumber(
    timing.holdMinMs,
    DEFAULT_BRAIN_RENDERING_CONFIG.timing.holdMinMs,
    500,
    60_000,
  )
  const holdMaxMs = Math.max(
    holdMinMs,
    finiteNumber(
      timing.holdMaxMs,
      DEFAULT_BRAIN_RENDERING_CONFIG.timing.holdMaxMs,
      500,
      120_000,
    ),
  )
  const requestedPatterns = Array.isArray(motion.patterns)
    ? motion.patterns.filter(
        (pattern): pattern is BrainFrameMorphPattern =>
          typeof pattern === 'string' &&
          ALLOWED_MORPH_PATTERNS.includes(pattern as BrainFrameMorphPattern),
      )
    : []
  return {
    image: {
      width: imageDimension(
        image.width,
        DEFAULT_BRAIN_RENDERING_CONFIG.image.width,
      ),
      height: imageDimension(
        image.height,
        DEFAULT_BRAIN_RENDERING_CONFIG.image.height,
      ),
      standardSteps: Math.round(finiteNumber(
        image.standardSteps,
        DEFAULT_BRAIN_RENDERING_CONFIG.image.standardSteps,
        4,
        40,
      )),
      interludeSteps: Math.round(finiteNumber(
        image.interludeSteps,
        DEFAULT_BRAIN_RENDERING_CONFIG.image.interludeSteps,
        4,
        16,
      )),
      enhancedSteps: Math.round(finiteNumber(
        image.enhancedSteps,
        DEFAULT_BRAIN_RENDERING_CONFIG.image.enhancedSteps,
        8,
        50,
      )),
      qualitySteps: Math.round(finiteNumber(
        image.qualitySteps,
        DEFAULT_BRAIN_RENDERING_CONFIG.image.qualitySteps,
        12,
        60,
      )),
    },
    timing: {
      frameDurationMs: finiteNumber(
        timing.frameDurationMs,
        DEFAULT_BRAIN_RENDERING_CONFIG.timing.frameDurationMs,
        1_000,
        120_000,
      ),
      transitionMinMs,
      transitionMaxMs,
      holdMinMs,
      holdMaxMs,
      firstFrameTransitionMs: finiteNumber(
        timing.firstFrameTransitionMs,
        DEFAULT_BRAIN_RENDERING_CONFIG.timing.firstFrameTransitionMs,
        0,
        20_000,
      ),
    },
    composition: {
      preserveAspectRatio:
        composition.preserveAspectRatio === 'xMidYMid meet'
          ? 'xMidYMid meet'
          : 'xMidYMid slice',
      horizontalStretch: finiteNumber(
        composition.horizontalStretch,
        DEFAULT_BRAIN_RENDERING_CONFIG.composition.horizontalStretch,
        0.8,
        1.4,
      ),
      verticalStretch: finiteNumber(
        composition.verticalStretch,
        DEFAULT_BRAIN_RENDERING_CONFIG.composition.verticalStretch,
        0.8,
        1.4,
      ),
      blurPx: finiteNumber(
        composition.blurPx,
        DEFAULT_BRAIN_RENDERING_CONFIG.composition.blurPx,
        0,
        8,
      ),
      edgeFeatherPx: finiteNumber(
        composition.edgeFeatherPx,
        DEFAULT_BRAIN_RENDERING_CONFIG.composition.edgeFeatherPx,
        0,
        300,
      ),
      edgeDarkness: finiteNumber(
        composition.edgeDarkness,
        DEFAULT_BRAIN_RENDERING_CONFIG.composition.edgeDarkness,
        0,
        0.9,
      ),
    },
    motion: {
      movementMultiplier: finiteNumber(
        motion.movementMultiplier,
        DEFAULT_BRAIN_RENDERING_CONFIG.motion.movementMultiplier,
        0,
        2,
      ),
      cameraMultiplier: finiteNumber(
        motion.cameraMultiplier,
        DEFAULT_BRAIN_RENDERING_CONFIG.motion.cameraMultiplier,
        0,
        3,
      ),
      liquidMultiplier: finiteNumber(
        motion.liquidMultiplier,
        DEFAULT_BRAIN_RENDERING_CONFIG.motion.liquidMultiplier,
        0,
        3,
      ),
      microMovement: finiteNumber(
        motion.microMovement,
        DEFAULT_BRAIN_RENDERING_CONFIG.motion.microMovement,
        0,
        1.5,
      ),
      colorSpeedMultiplier: finiteNumber(
        motion.colorSpeedMultiplier,
        DEFAULT_BRAIN_RENDERING_CONFIG.motion.colorSpeedMultiplier,
        0,
        3,
      ),
      maximumAnimatedAreaRatio: finiteNumber(
        motion.maximumAnimatedAreaRatio,
        DEFAULT_BRAIN_RENDERING_CONFIG.motion.maximumAnimatedAreaRatio,
        0.08,
        0.9,
      ),
      backgroundMotionScale: finiteNumber(
        motion.backgroundMotionScale,
        DEFAULT_BRAIN_RENDERING_CONFIG.motion.backgroundMotionScale,
        0,
        0.35,
      ),
      patterns:
        requestedPatterns.length > 0
          ? [...new Set(requestedPatterns)]
          : [...DEFAULT_BRAIN_RENDERING_CONFIG.motion.patterns],
    },
    globalRhythmicMotion: {
      enabled:
        globalRhythmicMotion.enabled === undefined
          ? DEFAULT_BRAIN_RENDERING_CONFIG.globalRhythmicMotion.enabled
          : globalRhythmicMotion.enabled === true,
      intensity: finiteNumber(
        globalRhythmicMotion.intensity,
        DEFAULT_BRAIN_RENDERING_CONFIG.globalRhythmicMotion.intensity,
        0,
        3,
      ),
      deformationBoost: finiteNumber(
        globalRhythmicMotion.deformationBoost,
        DEFAULT_BRAIN_RENDERING_CONFIG.globalRhythmicMotion.deformationBoost,
        0,
        3,
      ),
      flowBoost: finiteNumber(
        globalRhythmicMotion.flowBoost,
        DEFAULT_BRAIN_RENDERING_CONFIG.globalRhythmicMotion.flowBoost,
        0,
        3,
      ),
      kickDeformationPercent: finiteNumber(
        globalRhythmicMotion.kickDeformationPercent,
        DEFAULT_BRAIN_RENDERING_CONFIG.globalRhythmicMotion.kickDeformationPercent,
        0,
        2,
      ),
      responseMs: finiteNumber(
        globalRhythmicMotion.responseMs,
        DEFAULT_BRAIN_RENDERING_CONFIG.globalRhythmicMotion.responseMs,
        80,
        4_000,
      ),
      resourcePressureBoost: finiteNumber(
        globalRhythmicMotion.resourcePressureBoost,
        DEFAULT_BRAIN_RENDERING_CONFIG.globalRhythmicMotion.resourcePressureBoost,
        0.5,
        2.5,
      ),
    },
    vectorization: {
      engine: vectorization.engine === 'vtracer' ? 'vtracer' : 'snic',
      fallbackToVTracer:
        vectorization.fallbackToVTracer === undefined
          ? DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.fallbackToVTracer
          : vectorization.fallbackToVTracer === true,
      preprocessEnabled:
        vectorization.preprocessEnabled === undefined
          ? DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.preprocessEnabled
          : vectorization.preprocessEnabled === true,
      denoiseRadius: Math.round(finiteNumber(
        vectorization.denoiseRadius,
        DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.denoiseRadius,
        1,
        3,
      )),
      denoiseStrength: finiteNumber(
        vectorization.denoiseStrength,
        DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.denoiseStrength,
        0,
        1,
      ),
      localContrast: finiteNumber(
        vectorization.localContrast,
        DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.localContrast,
        0,
        0.6,
      ),
      colorSeparation: finiteNumber(
        vectorization.colorSeparation,
        DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.colorSeparation,
        0,
        0.5,
      ),
      minimumEdgeRetention: finiteNumber(
        vectorization.minimumEdgeRetention,
        DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.minimumEdgeRetention,
        0.7,
        1,
      ),
      paletteColors: Math.round(finiteNumber(
        vectorization.paletteColors,
        DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.paletteColors,
        4,
        16,
      )),
      spatialCleanupPasses: Math.round(finiteNumber(
        vectorization.spatialCleanupPasses,
        DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.spatialCleanupPasses,
        0,
        2,
      )),
      maximumContourRoughness: finiteNumber(
        vectorization.maximumContourRoughness,
        DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.maximumContourRoughness,
        0.02,
        1,
      ),
      contourRoughnessPenalty: finiteNumber(
        vectorization.contourRoughnessPenalty,
        DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.contourRoughnessPenalty,
        0,
        10_000,
      ),
      spikeDetectionEnabled:
        vectorization.spikeDetectionEnabled === undefined
          ? DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.spikeDetectionEnabled
          : vectorization.spikeDetectionEnabled === true,
      minimumCornerAngleDegrees: finiteNumber(
        vectorization.minimumCornerAngleDegrees,
        DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.minimumCornerAngleDegrees,
        3,
        60,
      ),
      minimumSpikeLengthRatio: finiteNumber(
        vectorization.minimumSpikeLengthRatio,
        DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.minimumSpikeLengthRatio,
        0.002,
        0.2,
      ),
      maximumAcceptedSpikes: Math.round(finiteNumber(
        vectorization.maximumAcceptedSpikes,
        DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.maximumAcceptedSpikes,
        0,
        100,
      )),
      spikePenalty: finiteNumber(
        vectorization.spikePenalty,
        DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.spikePenalty,
        0,
        2_000,
      ),
      roundedFinishEnabled:
        vectorization.roundedFinishEnabled === undefined
          ? DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.roundedFinishEnabled
          : vectorization.roundedFinishEnabled === true,
      roundedStrokeWidth: finiteNumber(
        vectorization.roundedStrokeWidth,
        DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.roundedStrokeWidth,
        0,
        4,
      ),
      roundedStrokeOpacity: finiteNumber(
        vectorization.roundedStrokeOpacity,
        DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.roundedStrokeOpacity,
        0,
        1,
      ),
      snicSuperpixelSize: Math.round(finiteNumber(
        vectorization.snicSuperpixelSize,
        DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.snicSuperpixelSize,
        8,
        64,
      )),
      snicCompactness: finiteNumber(
        vectorization.snicCompactness,
        DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.snicCompactness,
        1,
        40,
      ),
      snicMergeColorThreshold: finiteNumber(
        vectorization.snicMergeColorThreshold,
        DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.snicMergeColorThreshold,
        1,
        40,
      ),
      snicStrongEdgeThreshold: finiteNumber(
        vectorization.snicStrongEdgeThreshold,
        DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.snicStrongEdgeThreshold,
        1,
        40,
      ),
      snicEdgeWeight: finiteNumber(
        vectorization.snicEdgeWeight,
        DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.snicEdgeWeight,
        0,
        3,
      ),
      snicMinimumRegionAreaRatio: finiteNumber(
        vectorization.snicMinimumRegionAreaRatio,
        DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.snicMinimumRegionAreaRatio,
        0.00001,
        0.02,
      ),
      snicMaximumRegions: Math.round(finiteNumber(
        vectorization.snicMaximumRegions,
        DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.snicMaximumRegions,
        8,
        180,
      )),
      contourSimplificationTolerance: finiteNumber(
        vectorization.contourSimplificationTolerance,
        DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.contourSimplificationTolerance,
        0.1,
        12,
      ),
      contourCurveSmoothing: finiteNumber(
        vectorization.contourCurveSmoothing,
        DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.contourCurveSmoothing,
        0,
        1,
      ),
      contourMaximumPoints: Math.round(finiteNumber(
        vectorization.contourMaximumPoints,
        DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.contourMaximumPoints,
        200,
        12_000,
      )),
      minimumContourAreaRatio: finiteNumber(
        vectorization.minimumContourAreaRatio,
        DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.minimumContourAreaRatio,
        0,
        0.02,
      ),
      minimumStrongEdgeRecall: finiteNumber(
        vectorization.minimumStrongEdgeRecall,
        DEFAULT_BRAIN_RENDERING_CONFIG.vectorization.minimumStrongEdgeRecall,
        0,
        1,
      ),
    },
    transformation: {
      enabled:
        transformation.enabled === undefined
          ? DEFAULT_BRAIN_RENDERING_CONFIG.transformation.enabled
          : transformation.enabled === true,
      intensity: finiteNumber(
        transformation.intensity,
        DEFAULT_BRAIN_RENDERING_CONFIG.transformation.intensity,
        0,
        2,
      ),
      responseMs: finiteNumber(
        transformation.responseMs,
        DEFAULT_BRAIN_RENDERING_CONFIG.transformation.responseMs,
        120,
        8_000,
      ),
      memoryMs: finiteNumber(
        transformation.memoryMs,
        DEFAULT_BRAIN_RENDERING_CONFIG.transformation.memoryMs,
        250,
        20_000,
      ),
      organicDeformation: finiteNumber(
        transformation.organicDeformation,
        DEFAULT_BRAIN_RENDERING_CONFIG.transformation.organicDeformation,
        0,
        2,
      ),
      duplication: finiteNumber(
        transformation.duplication,
        DEFAULT_BRAIN_RENDERING_CONFIG.transformation.duplication,
        0,
        2,
      ),
      persistence: finiteNumber(
        transformation.persistence,
        DEFAULT_BRAIN_RENDERING_CONFIG.transformation.persistence,
        0,
        2,
      ),
      stratification: finiteNumber(
        transformation.stratification,
        DEFAULT_BRAIN_RENDERING_CONFIG.transformation.stratification,
        0,
        2,
      ),
      unstableSymmetry: finiteNumber(
        transformation.unstableSymmetry,
        DEFAULT_BRAIN_RENDERING_CONFIG.transformation.unstableSymmetry,
        0,
        2,
      ),
      perspective: finiteNumber(
        transformation.perspective,
        DEFAULT_BRAIN_RENDERING_CONFIG.transformation.perspective,
        0,
        2,
      ),
      propagation: finiteNumber(
        transformation.propagation,
        DEFAULT_BRAIN_RENDERING_CONFIG.transformation.propagation,
        0,
        2,
      ),
      dissolution: finiteNumber(
        transformation.dissolution,
        DEFAULT_BRAIN_RENDERING_CONFIG.transformation.dissolution,
        0,
        2,
      ),
      metamorphosis: finiteNumber(
        transformation.metamorphosis,
        DEFAULT_BRAIN_RENDERING_CONFIG.transformation.metamorphosis,
        0,
        2,
      ),
      chromaticAlteration: finiteNumber(
        transformation.chromaticAlteration,
        DEFAULT_BRAIN_RENDERING_CONFIG.transformation.chromaticAlteration,
        0,
        2,
      ),
      disintegration: finiteNumber(
        transformation.disintegration,
        DEFAULT_BRAIN_RENDERING_CONFIG.transformation.disintegration,
        0,
        2,
      ),
      maxEchoLayers: Math.round(finiteNumber(
        transformation.maxEchoLayers,
        DEFAULT_BRAIN_RENDERING_CONFIG.transformation.maxEchoLayers,
        0,
        3,
      )),
    },
  }
}

export function getBrainRenderingConfig(): BrainRenderingConfig {
  return activeConfig
}

export async function loadBrainRenderingConfig(): Promise<BrainRenderingConfig> {
  try {
    if (!window.fxOutput) {
      throw new Error('Bridge fxOutput non disponibile')
    }
    const text = await window.fxOutput.readBrainConfigFile('brainRendering.json')
    activeConfig = normalizeBrainRenderingConfig(JSON.parse(text))
    brainLog('config', 'config/brainRendering.json caricato', activeConfig)
  } catch (error) {
    activeConfig = structuredClone(DEFAULT_BRAIN_RENDERING_CONFIG)
    brainWarn(
      'config',
      'brainRendering.json non valido o assente; uso configurazione predefinita',
      error,
    )
  }
  return activeConfig
}
