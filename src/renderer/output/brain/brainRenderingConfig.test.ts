import { describe, expect, it } from 'vitest'
import {
  DEFAULT_BRAIN_RENDERING_CONFIG,
  normalizeBrainRenderingConfig,
} from './brainRenderingConfig'

describe('configurazione rendering Brain', () => {
  it('usa per default una scena 16:9', () => {
    expect(
      DEFAULT_BRAIN_RENDERING_CONFIG.image.width /
      DEFAULT_BRAIN_RENDERING_CONFIG.image.height,
    ).toBeCloseTo(16 / 9)
  })

  it('normalizza dimensioni ONNX a multipli di otto e ordina i tempi', () => {
    const config = normalizeBrainRenderingConfig({
      image: { width: 641, height: 359, interludeSteps: 1 },
      timing: {
        transitionMinMs: 2_000,
        transitionMaxMs: 900,
        holdMinMs: 5_000,
        holdMaxMs: 2_000,
      },
    })
    expect(config.image).toMatchObject({
      width: 640,
      height: 360,
      interludeSteps: 4,
    })
    expect(config.timing.transitionMaxMs).toBe(2_000)
    expect(config.timing.holdMaxMs).toBe(5_000)
  })

  it('rimuove pattern sconosciuti conservando quelli validi', () => {
    const config = normalizeBrainRenderingConfig({
      motion: {
        patterns: ['spirale', 'inesistente', 'marea'],
        microMovement: 9,
        maximumAnimatedAreaRatio: 2,
        backgroundMotionScale: -1,
      },
    })
    expect(config.motion.patterns).toEqual(['spirale', 'marea'])
    expect(config.motion.microMovement).toBe(1.5)
    expect(config.motion.maximumAnimatedAreaRatio).toBe(0.9)
    expect(config.motion.backgroundMotionScale).toBe(0)
  })

  it('normalizza memoria percettiva e numero di copie persistenti', () => {
    const config = normalizeBrainRenderingConfig({
      transformation: {
        responseMs: 20,
        memoryMs: 99_000,
        maxEchoLayers: 12,
        duplication: -4,
      },
    })

    expect(config.transformation.responseMs).toBe(120)
    expect(config.transformation.memoryMs).toBe(20_000)
    expect(config.transformation.maxEchoLayers).toBe(3)
    expect(config.transformation.duplication).toBe(0)
  })

  it('normalizza i parametri dell’Impulso Scenico Globale', () => {
    const config = normalizeBrainRenderingConfig({
      globalRhythmicMotion: {
        enabled: true,
        intensity: 9,
        deformationBoost: -2,
        flowBoost: 7,
        kickDeformationPercent: 9,
        responseMs: 12_000,
        resourcePressureBoost: 8,
      },
    })

    expect(config.globalRhythmicMotion).toEqual({
      enabled: true,
      intensity: 3,
      deformationBoost: 0,
      flowBoost: 3,
      kickDeformationPercent: 2,
      responseMs: 4_000,
      resourcePressureBoost: 2.5,
    })
  })

  it('normalizza rilevamento punte e finitura arrotondata', () => {
    const config = normalizeBrainRenderingConfig({
      vectorization: {
        engine: 'not-valid' as 'snic',
        fallbackToVTracer: false,
        preprocessEnabled: true,
        denoiseRadius: 9,
        denoiseStrength: 5,
        localContrast: 3,
        colorSeparation: 2,
        minimumEdgeRetention: 0,
        paletteColors: 99,
        spatialCleanupPasses: 9,
        maximumContourRoughness: -1,
        contourRoughnessPenalty: 99_000,
        spikeDetectionEnabled: true,
        minimumCornerAngleDegrees: 90,
        minimumSpikeLengthRatio: -1,
        maximumAcceptedSpikes: 999,
        spikePenalty: 9_000,
        roundedFinishEnabled: true,
        roundedStrokeWidth: 12,
        roundedStrokeOpacity: 4,
        snicSuperpixelSize: 999,
        snicCompactness: 999,
        snicMergeColorThreshold: 999,
        snicStrongEdgeThreshold: 999,
        snicEdgeWeight: 999,
        snicMinimumRegionAreaRatio: 1,
        snicMaximumRegions: 999,
        contourSimplificationTolerance: 999,
        contourCurveSmoothing: 999,
        contourMaximumPoints: 99_999,
        minimumContourAreaRatio: 1,
        minimumStrongEdgeRecall: 9,
      },
    })

    expect(config.vectorization).toEqual({
      engine: 'snic',
      fallbackToVTracer: false,
      preprocessEnabled: true,
      denoiseRadius: 3,
      denoiseStrength: 1,
      localContrast: 0.6,
      colorSeparation: 0.5,
      minimumEdgeRetention: 0.7,
      paletteColors: 16,
      spatialCleanupPasses: 2,
      maximumContourRoughness: 0.02,
      contourRoughnessPenalty: 10_000,
      spikeDetectionEnabled: true,
      minimumCornerAngleDegrees: 60,
      minimumSpikeLengthRatio: 0.002,
      maximumAcceptedSpikes: 100,
      spikePenalty: 2_000,
      roundedFinishEnabled: true,
      roundedStrokeWidth: 4,
      roundedStrokeOpacity: 1,
      snicSuperpixelSize: 64,
      snicCompactness: 40,
      snicMergeColorThreshold: 40,
      snicStrongEdgeThreshold: 40,
      snicEdgeWeight: 3,
      snicMinimumRegionAreaRatio: 0.02,
      snicMaximumRegions: 180,
      contourSimplificationTolerance: 12,
      contourCurveSmoothing: 1,
      contourMaximumPoints: 12_000,
      minimumContourAreaRatio: 0.02,
      minimumStrongEdgeRecall: 1,
    })
  })
})
