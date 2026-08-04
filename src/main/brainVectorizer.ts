import { performance } from 'node:perf_hooks'
import { convertBuffer, convertPixels } from '@visioncortex/vtracer'
import { BRAIN_CONFIG } from '@shared/brain/brainConfig'
import type {
  BrainRasterPixels,
  BrainVectorizationOptions,
  BrainVectorizationResult,
} from '@shared/types'
import { preprocessBrainRaster } from './brainRasterPreprocess'
import { vectorizeBrainRasterWithSnic } from './brainSnicVectorizer'

const DEFAULT_VECTORIZATION_OPTIONS: BrainVectorizationOptions = {
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
  roundedStrokeWidth: 1.15,
  roundedStrokeOpacity: 0.8,
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
}

const VECTOR_PROFILES = [
  {
    name: 'balanced',
    options: {
      preset: 'photo',
      colorMode: 'color',
      hierarchical: 'stacked',
      mode: 'spline',
      filterSpeckle: 12,
      colorPrecision: 7,
      layerDifference: 12,
      cornerThreshold: 60,
      lengthThreshold: 4,
      maxIterations: 10,
      spliceThreshold: 45,
      pathPrecision: 2,
      maxColors: 16,
      optimize: 1,
    },
  },
  {
    name: 'detailed',
    options: {
      preset: 'photo',
      colorMode: 'color',
      hierarchical: 'stacked',
      mode: 'spline',
      filterSpeckle: 6,
      colorPrecision: 8,
      layerDifference: 10,
      cornerThreshold: 52,
      lengthThreshold: 3,
      maxIterations: 10,
      spliceThreshold: 42,
      pathPrecision: 2,
      maxColors: 12,
      optimize: 1,
    },
  },
  {
    name: 'simplified',
    options: {
      preset: 'poster',
      colorMode: 'color',
      hierarchical: 'cutout',
      mode: 'spline',
      filterSpeckle: 24,
      colorPrecision: 5,
      layerDifference: 20,
      cornerThreshold: 72,
      lengthThreshold: 5,
      maxIterations: 10,
      spliceThreshold: 62,
      pathPrecision: 2,
      maxColors: 8,
      optimize: 1,
    },
  },
] as const

type VectorCandidate = {
  svg: string
  profile: string
  pathCount: number
  pathCommands: number
  colorCount: number
  detectedSpikes: number
  contourRoughness: number
}

type VectorPoint = { x: number; y: number }

function finiteOption(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(minimum, Math.min(maximum, value))
    : fallback
}

function normalizeVectorizationOptions(
  value: BrainVectorizationOptions | undefined,
): BrainVectorizationOptions {
  return {
    engine: value?.engine === 'vtracer' ? 'vtracer' : 'snic',
    fallbackToVTracer:
      value?.fallbackToVTracer === undefined
        ? DEFAULT_VECTORIZATION_OPTIONS.fallbackToVTracer
        : value.fallbackToVTracer === true,
    preprocessEnabled:
      value?.preprocessEnabled === undefined
        ? DEFAULT_VECTORIZATION_OPTIONS.preprocessEnabled
        : value.preprocessEnabled === true,
    denoiseRadius: Math.round(finiteOption(
      value?.denoiseRadius,
      DEFAULT_VECTORIZATION_OPTIONS.denoiseRadius,
      1,
      3,
    )),
    denoiseStrength: finiteOption(
      value?.denoiseStrength,
      DEFAULT_VECTORIZATION_OPTIONS.denoiseStrength,
      0,
      1,
    ),
    localContrast: finiteOption(
      value?.localContrast,
      DEFAULT_VECTORIZATION_OPTIONS.localContrast,
      0,
      0.6,
    ),
    colorSeparation: finiteOption(
      value?.colorSeparation,
      DEFAULT_VECTORIZATION_OPTIONS.colorSeparation,
      0,
      0.5,
    ),
    minimumEdgeRetention: finiteOption(
      value?.minimumEdgeRetention,
      DEFAULT_VECTORIZATION_OPTIONS.minimumEdgeRetention,
      0.7,
      1,
    ),
    paletteColors: Math.round(finiteOption(
      value?.paletteColors,
      DEFAULT_VECTORIZATION_OPTIONS.paletteColors,
      4,
      16,
    )),
    spatialCleanupPasses: Math.round(finiteOption(
      value?.spatialCleanupPasses,
      DEFAULT_VECTORIZATION_OPTIONS.spatialCleanupPasses,
      0,
      2,
    )),
    maximumContourRoughness: finiteOption(
      value?.maximumContourRoughness,
      DEFAULT_VECTORIZATION_OPTIONS.maximumContourRoughness,
      0.02,
      1,
    ),
    contourRoughnessPenalty: finiteOption(
      value?.contourRoughnessPenalty,
      DEFAULT_VECTORIZATION_OPTIONS.contourRoughnessPenalty,
      0,
      10_000,
    ),
    spikeDetectionEnabled:
      value?.spikeDetectionEnabled === undefined
        ? DEFAULT_VECTORIZATION_OPTIONS.spikeDetectionEnabled
        : value.spikeDetectionEnabled === true,
    minimumCornerAngleDegrees: finiteOption(
      value?.minimumCornerAngleDegrees,
      DEFAULT_VECTORIZATION_OPTIONS.minimumCornerAngleDegrees,
      3,
      60,
    ),
    minimumSpikeLengthRatio: finiteOption(
      value?.minimumSpikeLengthRatio,
      DEFAULT_VECTORIZATION_OPTIONS.minimumSpikeLengthRatio,
      0.002,
      0.2,
    ),
    maximumAcceptedSpikes: Math.round(finiteOption(
      value?.maximumAcceptedSpikes,
      DEFAULT_VECTORIZATION_OPTIONS.maximumAcceptedSpikes,
      0,
      100,
    )),
    spikePenalty: finiteOption(
      value?.spikePenalty,
      DEFAULT_VECTORIZATION_OPTIONS.spikePenalty,
      0,
      2_000,
    ),
    roundedFinishEnabled:
      value?.roundedFinishEnabled === undefined
        ? DEFAULT_VECTORIZATION_OPTIONS.roundedFinishEnabled
        : value.roundedFinishEnabled === true,
    roundedStrokeWidth: finiteOption(
      value?.roundedStrokeWidth,
      DEFAULT_VECTORIZATION_OPTIONS.roundedStrokeWidth,
      0,
      4,
    ),
    roundedStrokeOpacity: finiteOption(
      value?.roundedStrokeOpacity,
      DEFAULT_VECTORIZATION_OPTIONS.roundedStrokeOpacity,
      0,
      1,
    ),
    snicSuperpixelSize: Math.round(finiteOption(
      value?.snicSuperpixelSize,
      DEFAULT_VECTORIZATION_OPTIONS.snicSuperpixelSize,
      8,
      64,
    )),
    snicCompactness: finiteOption(
      value?.snicCompactness,
      DEFAULT_VECTORIZATION_OPTIONS.snicCompactness,
      1,
      40,
    ),
    snicMergeColorThreshold: finiteOption(
      value?.snicMergeColorThreshold,
      DEFAULT_VECTORIZATION_OPTIONS.snicMergeColorThreshold,
      1,
      40,
    ),
    snicStrongEdgeThreshold: finiteOption(
      value?.snicStrongEdgeThreshold,
      DEFAULT_VECTORIZATION_OPTIONS.snicStrongEdgeThreshold,
      1,
      40,
    ),
    snicEdgeWeight: finiteOption(
      value?.snicEdgeWeight,
      DEFAULT_VECTORIZATION_OPTIONS.snicEdgeWeight,
      0,
      3,
    ),
    snicMinimumRegionAreaRatio: finiteOption(
      value?.snicMinimumRegionAreaRatio,
      DEFAULT_VECTORIZATION_OPTIONS.snicMinimumRegionAreaRatio,
      0.00001,
      0.02,
    ),
    snicMaximumRegions: Math.round(finiteOption(
      value?.snicMaximumRegions,
      DEFAULT_VECTORIZATION_OPTIONS.snicMaximumRegions,
      8,
      180,
    )),
    contourSimplificationTolerance: finiteOption(
      value?.contourSimplificationTolerance,
      DEFAULT_VECTORIZATION_OPTIONS.contourSimplificationTolerance,
      0.1,
      12,
    ),
    contourCurveSmoothing: finiteOption(
      value?.contourCurveSmoothing,
      DEFAULT_VECTORIZATION_OPTIONS.contourCurveSmoothing,
      0,
      1,
    ),
    contourMaximumPoints: Math.round(finiteOption(
      value?.contourMaximumPoints,
      DEFAULT_VECTORIZATION_OPTIONS.contourMaximumPoints,
      200,
      12_000,
    )),
    minimumContourAreaRatio: finiteOption(
      value?.minimumContourAreaRatio,
      DEFAULT_VECTORIZATION_OPTIONS.minimumContourAreaRatio,
      0,
      0.02,
    ),
    minimumStrongEdgeRecall: finiteOption(
      value?.minimumStrongEdgeRecall,
      DEFAULT_VECTORIZATION_OPTIONS.minimumStrongEdgeRecall,
      0,
      1,
    ),
  }
}

function pathEndpoints(pathData: string): VectorPoint[] {
  const points: VectorPoint[] = []
  let x = 0
  let y = 0
  let startX = 0
  let startY = 0
  for (const chunk of pathData.match(/[a-z][^a-z]*/giu) ?? []) {
    const command = chunk[0]
    const upper = command.toUpperCase()
    const relative = command !== upper
    const values =
      chunk.slice(1).match(/-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?/giu)
        ?.map(Number) ?? []
    const stride =
      upper === 'C' ? 6
        : upper === 'S' || upper === 'Q' ? 4
          : upper === 'A' ? 7
            : upper === 'H' || upper === 'V' ? 1
              : 2
    if (upper === 'Z') {
      x = startX
      y = startY
      continue
    }
    for (let index = 0; index + stride - 1 < values.length; index += stride) {
      let nextX = x
      let nextY = y
      if (upper === 'H') {
        nextX = relative ? x + values[index] : values[index]
      } else if (upper === 'V') {
        nextY = relative ? y + values[index] : values[index]
      } else {
        const coordinateOffset = upper === 'A' ? 5 : stride - 2
        const rawX = values[index + coordinateOffset]
        const rawY = values[index + coordinateOffset + 1]
        nextX = relative ? x + rawX : rawX
        nextY = relative ? y + rawY : rawY
      }
      x = nextX
      y = nextY
      if (upper === 'M' && points.length === 0) {
        startX = x
        startY = y
      }
      points.push({ x, y })
    }
  }
  return points
}

export function detectSvgSpikeCount(
  svg: string,
  options: BrainVectorizationOptions,
): number {
  if (!options.spikeDetectionEnabled) return 0
  const root = svg.match(/<svg\b([^>]*)>/iu)?.[1] ?? ''
  const width = numericSvgDimension(root, 'width') ?? 1
  const height = numericSvgDimension(root, 'height') ?? 1
  const minimumSegmentLength =
    Math.hypot(width, height) * options.minimumSpikeLengthRatio
  let spikes = 0
  for (const match of svg.matchAll(/<path\b[^>]*\bd=["']([^"']+)["'][^>]*>/giu)) {
    const points = pathEndpoints(match[1])
    if (points.length < 3) continue
    for (let index = 0; index < points.length; index++) {
      const previous = points[(index - 1 + points.length) % points.length]
      const current = points[index]
      const next = points[(index + 1) % points.length]
      const incoming = {
        x: previous.x - current.x,
        y: previous.y - current.y,
      }
      const outgoing = {
        x: next.x - current.x,
        y: next.y - current.y,
      }
      const incomingLength = Math.hypot(incoming.x, incoming.y)
      const outgoingLength = Math.hypot(outgoing.x, outgoing.y)
      if (
        incomingLength < minimumSegmentLength ||
        outgoingLength < minimumSegmentLength
      ) {
        continue
      }
      const cosine = Math.max(
        -1,
        Math.min(
          1,
          (incoming.x * outgoing.x + incoming.y * outgoing.y) /
            (incomingLength * outgoingLength),
        ),
      )
      const angleDegrees = Math.acos(cosine) * 180 / Math.PI
      if (angleDegrees < options.minimumCornerAngleDegrees) spikes += 1
    }
  }
  return spikes
}

export function measureSvgContourRoughness(svg: string): number {
  const root = svg.match(/<svg\b([^>]*)>/iu)?.[1] ?? ''
  const width = numericSvgDimension(root, 'width') ?? 1
  const height = numericSvgDimension(root, 'height') ?? 1
  const shortEdge = Math.hypot(width, height) * 0.035
  let inspectedVertices = 0
  let roughTurns = 0
  let alternatingTurns = 0
  for (const match of svg.matchAll(/<path\b[^>]*\bd=["']([^"']+)["'][^>]*>/giu)) {
    const points = pathEndpoints(match[1])
    if (points.length < 4) continue
    let previousSign = 0
    let previousWasShortTurn = false
    for (let index = 0; index < points.length; index++) {
      const previous = points[(index - 1 + points.length) % points.length]
      const current = points[index]
      const next = points[(index + 1) % points.length]
      const incomingX = current.x - previous.x
      const incomingY = current.y - previous.y
      const outgoingX = next.x - current.x
      const outgoingY = next.y - current.y
      const incomingLength = Math.hypot(incomingX, incomingY)
      const outgoingLength = Math.hypot(outgoingX, outgoingY)
      if (incomingLength < 0.01 || outgoingLength < 0.01) continue
      inspectedVertices += 1
      const turn = Math.atan2(
        incomingX * outgoingY - incomingY * outgoingX,
        incomingX * outgoingX + incomingY * outgoingY,
      )
      const sign = Math.sign(turn)
      const shortTurn =
        Math.abs(turn) > Math.PI / 12 &&
        Math.min(incomingLength, outgoingLength) < shortEdge
      if (shortTurn) roughTurns += 1
      if (
        shortTurn &&
        previousWasShortTurn &&
        sign !== 0 &&
        previousSign !== 0 &&
        sign !== previousSign
      ) {
        alternatingTurns += 1
      }
      previousSign = sign
      previousWasShortTurn = shortTurn
    }
  }
  if (inspectedVertices === 0) return 0
  return Math.min(
    1,
    (roughTurns + alternatingTurns * 1.5) / inspectedVertices,
  )
}

function applyRoundedFinish(
  svg: string,
  options: BrainVectorizationOptions,
): string {
  if (
    !options.roundedFinishEnabled ||
    options.roundedStrokeWidth <= 0 ||
    options.roundedStrokeOpacity <= 0
  ) {
    return svg
  }
  return svg.replace(/<path\b([^>]*)\/?>/giu, (tag, attributes: string) => {
    const fill = attributes.match(/\bfill=["']([^"']+)["']/iu)?.[1]
    if (!fill || fill === 'none' || /\bstroke=/iu.test(attributes)) return tag
    const closing = tag.endsWith('/>') ? '/>' : '>'
    return tag.replace(
      /\/?>$/u,
      ` stroke="${fill}" stroke-width="${options.roundedStrokeWidth}" ` +
      `stroke-opacity="${options.roundedStrokeOpacity}" ` +
      `stroke-linejoin="round" stroke-linecap="round" ` +
      `paint-order="stroke fill"${closing}`,
    )
  })
}

function inspectCandidate(
  svg: string,
  profile: string,
  options: BrainVectorizationOptions,
): VectorCandidate {
  const paths = [...svg.matchAll(/<path\b[^>]*\bd=["']([^"']+)["'][^>]*>/gi)]
  const colors = new Set(
    [...svg.matchAll(/\bfill=["'](#[0-9a-f]{6})["']/gi)].map((match) =>
      match[1].toLowerCase(),
    ),
  )
  return {
    svg,
    profile,
    pathCount: paths.length,
    pathCommands: paths.reduce(
      (total, match) => total + (match[1].match(/[a-df-z]/gi)?.length ?? 0),
      0,
    ),
    colorCount: colors.size,
    detectedSpikes: detectSvgSpikeCount(svg, options),
    contourRoughness: measureSvgContourRoughness(svg),
  }
}

function structurallyUsable(candidate: VectorCandidate): boolean {
  return (
    candidate.svg.length >= 2_500 &&
    candidate.pathCount >= 5 &&
    candidate.pathCount <= 180 &&
    candidate.pathCommands >= 12 &&
    candidate.colorCount >= 3
  )
}

type VectorCandidateSummary = {
  svgLength: number
  pathCount: number
  pathCommands: number
  colorCount: number
  detectedSpikes: number
  contourRoughness: number
}

function structurallyUsableSummary(candidate: VectorCandidateSummary): boolean {
  return (
    candidate.svgLength >= 2_500 &&
    candidate.pathCount >= 5 &&
    candidate.pathCount <= 180 &&
    candidate.pathCommands >= 12 &&
    candidate.colorCount >= 3
  )
}

function candidateSummary(candidate: VectorCandidate): VectorCandidateSummary {
  return {
    svgLength: candidate.svg.length,
    pathCount: candidate.pathCount,
    pathCommands: candidate.pathCommands,
    colorCount: candidate.colorCount,
    detectedSpikes: candidate.detectedSpikes,
    contourRoughness: candidate.contourRoughness,
  }
}

export function shouldTryAlternativeVectorProfiles(
  candidate: VectorCandidateSummary,
  options: BrainVectorizationOptions,
): boolean {
  const hasTooManySpikes =
    options.spikeDetectionEnabled &&
    candidate.detectedSpikes > options.maximumAcceptedSpikes
  const contourIsTooRough =
    candidate.contourRoughness > options.maximumContourRoughness
  return !structurallyUsableSummary(candidate) || hasTooManySpikes || contourIsTooRough
}

export function shouldTryDetailedVectorProfile(
  balanced: VectorCandidateSummary,
  simplified: VectorCandidateSummary,
): boolean {
  return (
    !structurallyUsableSummary(balanced) &&
    !structurallyUsableSummary(simplified)
  )
}

function candidatePenalty(
  candidate: VectorCandidate,
  options: BrainVectorizationOptions,
): number {
  let penalty = Math.abs(candidate.pathCount - 24)
  if (candidate.svg.length < 2_500) penalty += 10_000
  if (candidate.pathCount < 5) penalty += (5 - candidate.pathCount) * 5_000
  if (candidate.pathCount > 180) penalty += (candidate.pathCount - 180) * 200
  if (candidate.pathCommands < 12) penalty += (12 - candidate.pathCommands) * 300
  if (candidate.colorCount < 3) penalty += (3 - candidate.colorCount) * 5_000
  penalty += candidate.detectedSpikes * options.spikePenalty
  penalty += candidate.contourRoughness * options.contourRoughnessPenalty
  return penalty
}

function rasterPixels(input: unknown): BrainRasterPixels | null {
  if (!input || typeof input !== 'object') return null
  const candidate = input as Partial<BrainRasterPixels>
  if (
    !(candidate.rgba instanceof Uint8Array) ||
    typeof candidate.width !== 'number' ||
    typeof candidate.height !== 'number' ||
    !Number.isInteger(candidate.width) ||
    !Number.isInteger(candidate.height) ||
    candidate.width <= 0 ||
    candidate.height <= 0 ||
    candidate.width > 4_096 ||
    candidate.height > 4_096 ||
    candidate.rgba.length !== candidate.width * candidate.height * 4
  ) {
    return null
  }
  return candidate as BrainRasterPixels
}

function encodedImage(bytes: Uint8Array): boolean {
  const png =
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  return png || jpeg
}

function numericSvgDimension(attributes: string, name: 'width' | 'height'): number | null {
  const match = attributes.match(
    new RegExp(`\\b${name}\\s*=\\s*["']\\s*([0-9]+(?:\\.[0-9]+)?)(?:px)?\\s*["']`, 'i'),
  )
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) && value > 0 ? value : null
}

export function normalizeVTracerSvg(svg: string): string {
  const rootMatch = svg.match(/<svg\b([^>]*)>/i)
  if (!rootMatch) return svg
  if (/\bviewBox\s*=\s*["'][^"']+["']/i.test(rootMatch[0])) return svg

  const width = numericSvgDimension(rootMatch[1], 'width')
  const height = numericSvgDimension(rootMatch[1], 'height')
  if (!width || !height) return svg

  const normalizedRoot = rootMatch[0].replace(
    />$/,
    ` viewBox="0 0 ${width} ${height}">`,
  )
  return svg.replace(rootMatch[0], normalizedRoot)
}

export function vectorizeBrainImage(
  input: unknown,
  requestedOptions?: BrainVectorizationOptions,
): BrainVectorizationResult {
  const options = normalizeVectorizationOptions(requestedOptions)
  const pixels = rasterPixels(input)
  const bytes =
    input instanceof Uint8Array
      ? input
      : input instanceof ArrayBuffer
        ? new Uint8Array(input)
        : null
  if (!pixels && (!bytes || bytes.byteLength === 0)) {
    return { ok: false, error: 'Immagine raster assente' }
  }
  const sourceBytes = pixels?.rgba.byteLength ?? bytes?.byteLength ?? 0
  if (sourceBytes > BRAIN_CONFIG.vectorMaxSourceBytes) {
    return { ok: false, error: 'Immagine raster oltre il limite di sicurezza' }
  }
  if (!pixels && bytes && !encodedImage(bytes)) {
    return { ok: false, error: 'Formato raster non supportato: attesi PNG o JPEG' }
  }

  const startedAt = performance.now()
  try {
    const preparedPixels = pixels
      ? options.preprocessEnabled
        ? preprocessBrainRaster(pixels.rgba, pixels.width, pixels.height, {
            spatialCleanupPasses: options.spatialCleanupPasses,
            denoiseRadius: options.denoiseRadius,
            denoiseStrength: options.denoiseStrength,
            localContrast: options.localContrast,
            colorSeparation: options.colorSeparation,
            minimumEdgeRetention: options.minimumEdgeRetention,
          })
        : pixels.rgba
      : null
    if (pixels && preparedPixels && options.engine === 'snic') {
      const snic = vectorizeBrainRasterWithSnic(
        preparedPixels,
        pixels.width,
        pixels.height,
        options,
      )
      const snicCandidate = inspectCandidate(snic.svg, snic.profile, options)
      const snicAccepted =
        !shouldTryAlternativeVectorProfiles(candidateSummary(snicCandidate), options) &&
        snic.strongEdgeRecall >= options.minimumStrongEdgeRecall
      if (snicAccepted || !options.fallbackToVTracer) {
        return {
          ok: true,
          svg: applyRoundedFinish(snicCandidate.svg, options),
          profile: snicCandidate.profile,
          durationMs: Math.round(performance.now() - startedAt),
          sourceBytes,
          detectedSpikes: snicCandidate.detectedSpikes,
          contourRoughness: snicCandidate.contourRoughness,
          strongEdgeRecall: snic.strongEdgeRecall,
          regionCount: snic.regionCount,
          pointCount: snic.pointCount,
        }
      }
    }
    const convert = (profile: (typeof VECTOR_PROFILES)[number]) => {
      const profileOptions = {
        ...profile.options,
        maxColors: options.paletteColors,
      }
      if (!pixels) return convertBuffer(bytes as Uint8Array, profileOptions)
      return convertPixels(
        preparedPixels as Uint8Array,
        pixels.width,
        pixels.height,
        profileOptions,
      )
    }
    const balancedProfile = VECTOR_PROFILES[0]
    const balancedCandidate = inspectCandidate(
      normalizeVTracerSvg(convert(balancedProfile)),
      balancedProfile.name,
      options,
    )
    const candidates: VectorCandidate[] = [balancedCandidate]
    if (!shouldTryAlternativeVectorProfiles(
      candidateSummary(balancedCandidate),
      options,
    )) {
      return {
        ok: true,
        svg: applyRoundedFinish(balancedCandidate.svg, options),
        profile: balancedCandidate.profile,
        durationMs: Math.round(performance.now() - startedAt),
        sourceBytes,
        detectedSpikes: balancedCandidate.detectedSpikes,
        contourRoughness: balancedCandidate.contourRoughness,
      }
    }
    const simplifiedProfile = VECTOR_PROFILES[2]
    const simplifiedCandidate = inspectCandidate(
      normalizeVTracerSvg(convert(simplifiedProfile)),
      simplifiedProfile.name,
      options,
    )
    candidates.push(simplifiedCandidate)
    if (!shouldTryAlternativeVectorProfiles(
      candidateSummary(simplifiedCandidate),
      options,
    )) {
      return {
        ok: true,
        svg: applyRoundedFinish(simplifiedCandidate.svg, options),
        profile: simplifiedCandidate.profile,
        durationMs: Math.round(performance.now() - startedAt),
        sourceBytes,
        detectedSpikes: simplifiedCandidate.detectedSpikes,
        contourRoughness: simplifiedCandidate.contourRoughness,
      }
    }
    if (shouldTryDetailedVectorProfile(
      candidateSummary(balancedCandidate),
      candidateSummary(simplifiedCandidate),
    )) {
      const detailedProfile = VECTOR_PROFILES[1]
      candidates.push(inspectCandidate(
        normalizeVTracerSvg(convert(detailedProfile)),
        detailedProfile.name,
        options,
      ))
    }
    const structurallyPreferred = candidates.filter(structurallyUsable)
    const candidate = (
      structurallyPreferred.length > 0 ? structurallyPreferred : candidates
    ).sort(
      (left, right) =>
        candidatePenalty(left, options) - candidatePenalty(right, options),
    )[0]
    return {
      ok: true,
      svg: applyRoundedFinish(candidate.svg, options),
      profile: candidate.profile,
      durationMs: Math.round(performance.now() - startedAt),
      sourceBytes,
      detectedSpikes: candidate.detectedSpikes,
      contourRoughness: candidate.contourRoughness,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
