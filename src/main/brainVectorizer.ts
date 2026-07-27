import { performance } from 'node:perf_hooks'
import { convertBuffer } from '@visioncortex/vtracer'
import { BRAIN_CONFIG } from '@shared/brain/brainConfig'
import type { BrainVectorizationResult } from '@shared/types'

const VECTOR_PROFILES = [
  {
    name: 'balanced',
    options: {
      preset: 'poster',
      colorMode: 'color',
      hierarchical: 'cutout',
      mode: 'spline',
      filterSpeckle: 48,
      colorPrecision: 6,
      layerDifference: 18,
      cornerThreshold: 60,
      lengthThreshold: 6,
      maxIterations: 10,
      spliceThreshold: 48,
      pathPrecision: 2,
      maxColors: 8,
      optimize: 2,
    },
  },
  {
    name: 'detailed',
    options: {
      preset: 'poster',
      colorMode: 'color',
      hierarchical: 'cutout',
      mode: 'spline',
      filterSpeckle: 16,
      colorPrecision: 7,
      layerDifference: 12,
      cornerThreshold: 58,
      lengthThreshold: 4,
      maxIterations: 10,
      spliceThreshold: 42,
      pathPrecision: 2,
      maxColors: 10,
      optimize: 2,
    },
  },
  {
    name: 'simplified',
    options: {
      preset: 'poster',
      colorMode: 'color',
      hierarchical: 'cutout',
      mode: 'spline',
      filterSpeckle: 80,
      colorPrecision: 5,
      layerDifference: 22,
      cornerThreshold: 62,
      lengthThreshold: 8,
      maxIterations: 10,
      spliceThreshold: 56,
      pathPrecision: 2,
      maxColors: 7,
      optimize: 2,
    },
  },
] as const

type VectorCandidate = {
  svg: string
  profile: string
  pathCount: number
  pathCommands: number
  colorCount: number
}

function inspectCandidate(svg: string, profile: string): VectorCandidate {
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
  }
}

function structurallyUsable(candidate: VectorCandidate): boolean {
  return (
    candidate.svg.length >= 2_500 &&
    candidate.pathCount >= 5 &&
    candidate.pathCount <= 180 &&
    candidate.pathCommands >= 24 &&
    candidate.colorCount >= 3
  )
}

function preferredCandidate(candidate: VectorCandidate): boolean {
  return (
    structurallyUsable(candidate) &&
    candidate.pathCount >= 8 &&
    candidate.pathCount <= 120 &&
    candidate.pathCommands >= 40 &&
    candidate.colorCount >= 4
  )
}

function candidatePenalty(candidate: VectorCandidate): number {
  let penalty = Math.abs(candidate.pathCount - 42) * 2
  if (candidate.svg.length < 2_500) penalty += 10_000
  if (candidate.pathCount < 5) penalty += (5 - candidate.pathCount) * 5_000
  if (candidate.pathCount > 180) penalty += (candidate.pathCount - 180) * 200
  if (candidate.pathCommands < 24) penalty += (24 - candidate.pathCommands) * 300
  if (candidate.colorCount < 3) penalty += (3 - candidate.colorCount) * 5_000
  return penalty
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

export function vectorizeBrainImage(input: unknown): BrainVectorizationResult {
  const bytes =
    input instanceof Uint8Array
      ? input
      : input instanceof ArrayBuffer
        ? new Uint8Array(input)
        : null
  if (!bytes || bytes.byteLength === 0) {
    return { ok: false, error: 'Immagine raster assente' }
  }
  if (bytes.byteLength > BRAIN_CONFIG.vectorMaxSourceBytes) {
    return { ok: false, error: 'Immagine raster oltre il limite di sicurezza' }
  }
  if (!encodedImage(bytes)) {
    return { ok: false, error: 'Formato raster non supportato: attesi PNG o JPEG' }
  }

  const startedAt = performance.now()
  try {
    const candidates: VectorCandidate[] = []
    for (const profile of VECTOR_PROFILES) {
      const candidate = inspectCandidate(
        normalizeVTracerSvg(convertBuffer(bytes, profile.options)),
        profile.name,
      )
      candidates.push(candidate)
      if (preferredCandidate(candidate)) {
        return {
          ok: true,
          svg: candidate.svg,
          profile: candidate.profile,
          durationMs: Math.round(performance.now() - startedAt),
          sourceBytes: bytes.byteLength,
        }
      }
    }
    const candidate = candidates.sort(
      (left, right) => candidatePenalty(left) - candidatePenalty(right),
    )[0]
    return {
      ok: true,
      svg: candidate.svg,
      profile: candidate.profile,
      durationMs: Math.round(performance.now() - startedAt),
      sourceBytes: bytes.byteLength,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
