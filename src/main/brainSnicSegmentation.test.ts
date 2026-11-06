import { describe, expect, it } from 'vitest'
import type { BrainVectorizationOptions } from '@shared/types'
import { detectSvgSpikeCount, vectorizeBrainImage } from './brainVectorizer'
import { segmentBrainRasterWithSnic } from './brainSnicSegmentation'

function raster(
  width: number,
  height: number,
  colorAt: (x: number, y: number) => [number, number, number],
): Uint8Array {
  const rgba = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4
      const color = colorAt(x, y)
      rgba[offset] = color[0]
      rgba[offset + 1] = color[1]
      rgba[offset + 2] = color[2]
      rgba[offset + 3] = 255
    }
  }
  return rgba
}

const OPTIONS: BrainVectorizationOptions = {
  engine: 'snic',
  fallbackToVTracer: false,
  preprocessEnabled: false,
  denoiseRadius: 1,
  denoiseStrength: 0,
  localContrast: 0,
  colorSeparation: 0,
  minimumEdgeRetention: 0.86,
  paletteColors: 16,
  spatialCleanupPasses: 0,
  maximumContourRoughness: 0.2,
  contourRoughnessPenalty: 1_200,
  spikeDetectionEnabled: true,
  minimumCornerAngleDegrees: 20,
  minimumSpikeLengthRatio: 0.012,
  maximumAcceptedSpikes: 2,
  spikePenalty: 420,
  roundedFinishEnabled: true,
  roundedStrokeWidth: 0.6,
  roundedStrokeOpacity: 0.55,
  snicSuperpixelSize: 10,
  snicCompactness: 8,
  snicMergeColorThreshold: 11,
  snicStrongEdgeThreshold: 8,
  snicEdgeWeight: 0.7,
  snicMinimumRegionAreaRatio: 0.0006,
  snicMaximumRegions: 24,
  contourSimplificationTolerance: 1.2,
  contourCurveSmoothing: 0.34,
  contourMaximumPoints: 800,
  minimumContourAreaRatio: 0.00008,
}

describe('segmentazione SNIC di Brain', () => {
  it('mantiene i bordi forti e rispetta il budget delle regioni', () => {
    const width = 96
    const height = 64
    const rgba = raster(width, height, (x, y) => {
      if (x > 27 && x < 67 && y > 10 && y < 55) return [222, 180, 122]
      if (x > 39 && x < 55 && y > 20 && y < 40) return [42, 52, 78]
      return [25 + Math.floor(x / 16), 31, 39]
    })
    const result = segmentBrainRasterWithSnic(rgba, width, height, {
      superpixelSize: OPTIONS.snicSuperpixelSize,
      compactness: OPTIONS.snicCompactness,
      mergeColorThreshold: OPTIONS.snicMergeColorThreshold,
      strongEdgeThreshold: OPTIONS.snicStrongEdgeThreshold,
      edgeWeight: OPTIONS.snicEdgeWeight,
      minimumRegionAreaRatio: OPTIONS.snicMinimumRegionAreaRatio,
      maximumRegions: OPTIONS.snicMaximumRegions,
    })

    expect(result.initialRegionCount).toBeGreaterThan(result.regions.length)
    expect(result.regions.length).toBeLessThanOrEqual(OPTIONS.snicMaximumRegions)
    expect(result.strongEdgeRecall).toBeGreaterThan(0.75)
    expect(new Set(result.labels).size).toBe(result.regions.length)
  })

  it('produce curve chiuse senza denti acuti su una silhouette netta', () => {
    const width = 96
    const height = 64
    const rgba = raster(width, height, (x, y) => {
      const head = Math.hypot(x - 48, y - 17) < 8
      const body = x > 36 && x < 60 && y >= 23 && y < 52
      const leftArm = x > 27 && x <= 36 && y > 27 && y < 43
      const rightArm = x >= 60 && x < 69 && y > 27 && y < 43
      if (head || body || leftArm || rightArm) return [218, 172, 118]
      if (y > 52) return [45, 58, 68]
      return [20, 25, 34]
    })
    const result = vectorizeBrainImage({ rgba, width, height }, OPTIONS)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.profile).toBe('snic-edge')
    expect(result.svg).toContain('<path')
    expect(result.svg).toContain('C')
    expect(result.smoothedPathCount).toBeGreaterThan(0)
    expect(result.cornerDensity).toBeLessThanOrEqual(result.cornerDensityBefore)
    expect(result.strongEdgeRecall).toBeGreaterThan(0.75)
    expect(result.regionCount).toBeLessThanOrEqual(OPTIONS.snicMaximumRegions)
    expect(detectSvgSpikeCount(result.svg, OPTIONS)).toBeLessThanOrEqual(2)
  })

  it('rimane entro un budget prudente sul formato Psychedel 640×360', () => {
    const width = 640
    const height = 360
    const rgba = raster(width, height, (x, y) => {
      const figure = Math.hypot((x - 320) / 105, (y - 195) / 145) < 1
      const light = Math.round(20 * x / width + 12 * y / height)
      if (figure && y < 105) return [190 + light, 148 + light, 112 + light]
      if (figure) return [62 + light, 72 + light, 94 + light]
      if (y > 270) return [44 + light, 58 + light, 68 + light]
      return [22 + light, 28 + light, 38 + light]
    })
    const startedAt = performance.now()
    const result = vectorizeBrainImage({ rgba, width, height }, {
      ...OPTIONS,
      snicSuperpixelSize: 24,
      snicMaximumRegions: 72,
      contourMaximumPoints: 2_400,
    })
    const duration = performance.now() - startedAt

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.profile).toBe('snic-edge')
    expect(result.regionCount).toBeLessThanOrEqual(72)
    expect(result.pointCount).toBeLessThanOrEqual(2_400)
    expect(result.svg.length).toBeLessThan(600_000)
    expect(duration).toBeLessThan(3_000)
  })

  it('usa VTracer solo quando il candidato SNIC non è strutturalmente usabile', () => {
    const width = 80
    const height = 64
    const rgba = raster(width, height, (x) => (x < 40 ? [230, 226, 205] : [18, 27, 39]))
    const result = vectorizeBrainImage({ rgba, width, height }, {
      ...OPTIONS,
      fallbackToVTracer: true,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.profile).not.toBe('snic-edge')
  })

  it('accetta SNIC anche quando rugosità e schegge superano le soglie di VTracer', () => {
    const width = 192
    const height = 128
    const rgba = raster(width, height, (x, y) => {
      if (Math.hypot(x - 44, y - 48) < 24) return [220, 170, 120]
      if (x > 112 && x < 168 && y > 24 && y < 80) return [60, 120, 200]
      if (Math.hypot(x - 88, y - 88) < 14) return [200, 60, 80]
      if (x > 12 && x < 60 && y > 84 && y < 116) return [90, 190, 110]
      if (y > 100) return [45, 58, 68]
      return [20, 25, 34]
    })
    const result = vectorizeBrainImage({ rgba, width, height }, {
      ...OPTIONS,
      fallbackToVTracer: true,
      maximumAcceptedSpikes: 0,
      maximumContourRoughness: 0.02,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.profile).toBe('snic-edge')
  })

  it('la fusione gerarchica assorbe i frammenti prima dei contorni degli oggetti', () => {
    const width = 120
    const height = 80
    const rgba = raster(width, height, (x, y) => {
      // Granelli piccoli e contrastati sullo sfondo: dettaglio, non oggetti.
      if (x % 17 === 3 && y % 13 === 5) return [235, 235, 235]
      if (x > 40 && x < 80 && y > 15 && y < 65) return [210, 90, 60]
      return [24 + Math.floor(x / 20), 30, 40]
    })
    const result = segmentBrainRasterWithSnic(rgba, width, height, {
      superpixelSize: 8,
      compactness: OPTIONS.snicCompactness,
      mergeColorThreshold: OPTIONS.snicMergeColorThreshold,
      strongEdgeThreshold: OPTIONS.snicStrongEdgeThreshold,
      edgeWeight: OPTIONS.snicEdgeWeight,
      minimumRegionAreaRatio: 0,
      maximumRegions: 2,
    })

    expect(result.regions.length).toBe(2)
    const objectLabel = result.labels[40 * width + 60]
    const backgroundLabel = result.labels[5 * width + 5]
    expect(objectLabel).not.toBe(backgroundLabel)
    // Il granello in (3, 5) è stato assorbito dallo sfondo.
    expect(result.labels[5 * width + 3]).toBe(backgroundLabel)
  })
})
