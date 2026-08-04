import { describe, expect, it } from 'vitest'
import {
  detectSvgSpikeCount,
  measureSvgContourRoughness,
  normalizeVTracerSvg,
  shouldTryAlternativeVectorProfiles,
  shouldTryDetailedVectorProfile,
  vectorizeBrainImage,
} from './brainVectorizer'

const VECTOR_OPTIONS = {
  engine: 'snic' as const,
  fallbackToVTracer: true,
  preprocessEnabled: true,
  denoiseRadius: 2,
  denoiseStrength: 0.68,
  localContrast: 0.14,
  colorSeparation: 0.1,
  minimumEdgeRetention: 0.86,
  paletteColors: 10,
  spatialCleanupPasses: 1,
  maximumContourRoughness: 0.16,
  contourRoughnessPenalty: 1_200,
  spikeDetectionEnabled: true,
  minimumCornerAngleDegrees: 24,
  minimumSpikeLengthRatio: 0.012,
  maximumAcceptedSpikes: 1,
  spikePenalty: 420,
  roundedFinishEnabled: true,
  roundedStrokeWidth: 1.15,
  roundedStrokeOpacity: 0.8,
  snicSuperpixelSize: 12,
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
}

const ONE_PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

describe('Brain vectorizer IPC core', () => {
  it('converte realmente un PNG codificato in SVG', () => {
    const result = vectorizeBrainImage(Uint8Array.from(Buffer.from(ONE_PIXEL_PNG, 'base64')))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.svg).toContain('<svg')
      expect(result.svg).toContain('viewBox="0 0 1 1"')
      expect(result.profile).toBeTruthy()
      expect(result.sourceBytes).toBeGreaterThan(0)
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
      expect(result.svg).toContain('stroke-linejoin="round"')
      expect(result.detectedSpikes).toBeGreaterThanOrEqual(0)
      expect(result.contourRoughness).toBeGreaterThanOrEqual(0)
    }
  })

  it('riconosce un cuneo lungo con un angolo molto acuto', () => {
    const svg =
      '<svg width="100" height="100"><path d="M49 100L50 0L51 100Z" fill="#000000"/></svg>'
    expect(detectSvgSpikeCount(svg, VECTOR_OPTIONS)).toBe(1)
  })

  it('misura le catene di denti corti che il controllo delle punte non vede', () => {
    const smooth =
      '<svg width="100" height="100"><path d="M0 0L100 0L100 100L0 100Z" fill="#000000"/></svg>'
    const jagged =
      '<svg width="100" height="100"><path d="M0 0L10 0L12 2L14 0L16 2L18 0L20 2L22 0L24 2L26 0L100 0L100 100L0 100Z" fill="#000000"/></svg>'
    expect(measureSvgContourRoughness(jagged))
      .toBeGreaterThan(measureSvgContourRoughness(smooth))
  })

  it('accetta subito balanced quando struttura e punte sono nei limiti', () => {
    expect(shouldTryAlternativeVectorProfiles({
      svgLength: 12_000,
      pathCount: 42,
      pathCommands: 180,
      colorCount: 7,
      detectedSpikes: 1,
      contourRoughness: 0.08,
    }, VECTOR_OPTIONS)).toBe(false)
  })

  it('richiede profili alternativi quando balanced ha troppe punte', () => {
    expect(shouldTryAlternativeVectorProfiles({
      svgLength: 12_000,
      pathCount: 42,
      pathCommands: 180,
      colorCount: 7,
      detectedSpikes: 2,
      contourRoughness: 0.08,
    }, VECTOR_OPTIONS)).toBe(true)
  })

  it('riserva detailed al solo recupero strutturale dopo simplified', () => {
    const usable = {
      svgLength: 12_000,
      pathCount: 42,
      pathCommands: 180,
      colorCount: 7,
      detectedSpikes: 5,
      contourRoughness: 0.3,
    }
    const unusable = {
      svgLength: 900,
      pathCount: 2,
      pathCommands: 8,
      colorCount: 1,
      detectedSpikes: 0,
      contourRoughness: 0,
    }

    expect(shouldTryDetailedVectorProfile(usable, unusable)).toBe(false)
    expect(shouldTryDetailedVectorProfile(unusable, usable)).toBe(false)
    expect(shouldTryDetailedVectorProfile(unusable, unusable)).toBe(true)
  })

  it('deriva il viewBox dalle dimensioni prodotte da VTracer', () => {
    const svg =
      '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="512" height="384"><path d="M0 0"/></svg>'
    expect(normalizeVTracerSvg(svg)).toContain('viewBox="0 0 512 384"')
  })

  it('conserva un viewBox già presente', () => {
    const svg = '<svg width="512" height="512" viewBox="10 20 300 400"></svg>'
    expect(normalizeVTracerSvg(svg)).toBe(svg)
  })

  it('rifiuta byte che non rappresentano PNG o JPEG', () => {
    expect(vectorizeBrainImage(new Uint8Array([1, 2, 3, 4]))).toEqual({
      ok: false,
      error: 'Formato raster non supportato: attesi PNG o JPEG',
    })
  })
})
