import {
  analyzeMaterialPixels,
  matchMaterialRegions,
  type MaterialField,
  type MaterialRegion,
} from './brainMaterialAnalysis'

export type BauhausPlaneShape = 'rect' | 'ellipse' | 'triangle' | 'slab'

export type BauhausPoint = {
  x: number
  y: number
}

export type BauhausPlane = {
  id: string
  sourceRegionId: number
  shape: BauhausPlaneShape
  centerX: number
  centerY: number
  width: number
  height: number
  rotation: number
  color: string
  salience: number
  focal: boolean
  abstractionStart: number
  abstractionEnd: number
  /** Sagoma semplificata composta da punti appartenenti alla regione sorgente. */
  outline: BauhausPoint[]
}

export type BauhausLine = {
  x1: number
  y1: number
  x2: number
  y2: number
  weight: number
  sourceRegionId: number
}

export type BauhausNegativeSpace = {
  x: number
  y: number
  width: number
  height: number
  score: number
}

export type BauhausComposition = {
  width: number
  height: number
  field: MaterialField
  planes: BauhausPlane[]
  lines: BauhausLine[]
  negativeSpaces: BauhausNegativeSpace[]
  palette: string[]
  dominantAxis: 'horizontal' | 'vertical' | 'diagonal' | 'neutral'
}

export type BauhausPlaneMatch = {
  from: BauhausPlane | null
  to: BauhausPlane | null
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value))
}

function rgbHex(color: readonly [number, number, number]): string {
  return `#${color.map((channel) =>
    Math.round(clamp(channel, 0, 255)).toString(16).padStart(2, '0'),
  ).join('')}`
}

function uniquePalette(
  source: readonly string[],
  narrative: readonly string[],
): string[] {
  const colors = [...source, ...narrative, '#171514', '#eee7d8', '#b6ad98']
    .map((color) => color.toLocaleLowerCase())
    .filter((color) => /^#[0-9a-f]{6}$/u.test(color))
  return [...new Set(colors)].slice(0, 7)
}

type RegionGeometry = {
  angle: number
  outline: BauhausPoint[]
  line: BauhausLine
  fillRatio: number
}

function regionShape(
  region: MaterialRegion,
  geometry: RegionGeometry,
): BauhausPlaneShape {
  const width = region.maxX - region.minX + 1
  const height = region.maxY - region.minY + 1
  const ratio = width / Math.max(1, height)
  if (ratio >= 2.1 || ratio <= 0.48) return 'slab'
  if (geometry.fillRatio >= 0.7 && region.edgeStrength < 0.12) return 'ellipse'
  if (geometry.outline.length <= 5 && region.areaRatio < 0.08) return 'triangle'
  return 'rect'
}

function dominantAxis(field: MaterialField): BauhausComposition['dominantAxis'] {
  let horizontal = 0
  let vertical = 0
  let diagonal = 0
  for (let y = 1; y < field.height - 1; y += 2) {
    for (let x = 1; x < field.width - 1; x += 2) {
      const index = y * field.width + x
      if (field.edges[index] < 0.045) continue
      const gx = field.luminance[index + 1] - field.luminance[index - 1]
      const gy = field.luminance[index + field.width] -
        field.luminance[index - field.width]
      const magnitude = Math.hypot(gx, gy)
      const balance = Math.abs(Math.abs(gx) - Math.abs(gy))
      if (balance < magnitude * 0.28) diagonal += magnitude
      else if (Math.abs(gx) > Math.abs(gy)) vertical += magnitude
      else horizontal += magnitude
    }
  }
  const strongest = Math.max(horizontal, vertical, diagonal)
  if (strongest <= 0.001) return 'neutral'
  if (strongest === diagonal) return 'diagonal'
  return strongest === horizontal ? 'horizontal' : 'vertical'
}

function lineForRegion(
  region: MaterialRegion,
  field: MaterialField,
  axis: BauhausComposition['dominantAxis'],
): BauhausLine {
  const x1 = region.minX / field.width
  const y1 = region.minY / field.height
  const x2 = (region.maxX + 1) / field.width
  const y2 = (region.maxY + 1) / field.height
  if (axis === 'vertical') {
    return {
      x1: region.centroidX,
      y1,
      x2: region.centroidX,
      y2,
      weight: Math.max(0.035, region.edgeStrength),
      sourceRegionId: region.id,
    }
  }
  if (axis === 'diagonal') {
    return {
      x1,
      y1: y2,
      x2,
      y2: y1,
      weight: Math.max(0.035, region.edgeStrength),
      sourceRegionId: region.id,
    }
  }
  return {
    x1,
    y1: region.centroidY,
    x2,
    y2: region.centroidY,
    weight: Math.max(0.035, region.edgeStrength),
    sourceRegionId: region.id,
  }
}

function geometryForRegion(
  region: MaterialRegion,
  field: MaterialField,
): RegionGeometry {
  const points: Array<{ x: number; y: number }> = []
  const targetLabel = region.id + 1
  for (let y = region.minY; y <= region.maxY; y += 1) {
    for (let x = region.minX; x <= region.maxX; x += 1) {
      if (field.regionLabels[y * field.width + x] === targetLabel) {
        points.push({ x, y })
      }
    }
  }
  if (points.length === 0) {
    return {
      angle: 0,
      fillRatio: 0,
      line: lineForRegion(region, field, 'neutral'),
      outline: [
        { x: region.minX / field.width, y: region.minY / field.height },
        { x: (region.maxX + 1) / field.width, y: region.minY / field.height },
        { x: (region.maxX + 1) / field.width, y: (region.maxY + 1) / field.height },
        { x: region.minX / field.width, y: (region.maxY + 1) / field.height },
      ],
    }
  }

  const centerX = region.centroidX * Math.max(1, field.width - 1)
  const centerY = region.centroidY * Math.max(1, field.height - 1)
  let xx = 0
  let xy = 0
  let yy = 0
  for (const point of points) {
    const dx = point.x - centerX
    const dy = point.y - centerY
    xx += dx * dx
    xy += dx * dy
    yy += dy * dy
  }
  let angle = 0.5 * Math.atan2(2 * xy, xx - yy)
  if (!Number.isFinite(angle)) angle = 0
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  const bins = 10
  const support = Array.from({ length: bins }, () => ({
    point: points[0],
    score: Number.NEGATIVE_INFINITY,
  }))
  let minU = Number.POSITIVE_INFINITY
  let maxU = Number.NEGATIVE_INFINITY
  for (const point of points) {
    const dx = point.x - centerX
    const dy = point.y - centerY
    const u = dx * cosine + dy * sine
    minU = Math.min(minU, u)
    maxU = Math.max(maxU, u)
    for (let index = 0; index < bins; index += 1) {
      const direction = index / bins * Math.PI * 2
      const score = dx * Math.cos(direction) + dy * Math.sin(direction)
      if (score > support[index].score) support[index] = { point, score }
    }
  }
  const outline: BauhausPoint[] = support.map((entry) => ({
    x: (entry.point.x + 0.5) / field.width,
    y: (entry.point.y + 0.5) / field.height,
  }))

  const lineStartX = centerX + minU * cosine
  const lineStartY = centerY + minU * sine
  const lineEndX = centerX + maxU * cosine
  const lineEndY = centerY + maxU * sine
  const boundingPixels =
    (region.maxX - region.minX + 1) * (region.maxY - region.minY + 1)
  return {
    angle,
    fillRatio: region.pixelCount / Math.max(1, boundingPixels),
    outline: outline.length >= 3 ? outline : [
      { x: region.minX / field.width, y: region.minY / field.height },
      { x: (region.maxX + 1) / field.width, y: region.minY / field.height },
      { x: (region.maxX + 1) / field.width, y: (region.maxY + 1) / field.height },
      { x: region.minX / field.width, y: (region.maxY + 1) / field.height },
    ],
    line: {
      x1: clamp((lineStartX + 0.5) / field.width),
      y1: clamp((lineStartY + 0.5) / field.height),
      x2: clamp((lineEndX + 0.5) / field.width),
      y2: clamp((lineEndY + 0.5) / field.height),
      weight: Math.max(0.035, region.edgeStrength),
      sourceRegionId: region.id,
    },
  }
}

function intersectsRegion(
  cell: BauhausNegativeSpace,
  region: MaterialRegion,
  field: MaterialField,
): boolean {
  const left = region.minX / field.width
  const top = region.minY / field.height
  const right = (region.maxX + 1) / field.width
  const bottom = (region.maxY + 1) / field.height
  return !(
    cell.x + cell.width <= left || right <= cell.x ||
    cell.y + cell.height <= top || bottom <= cell.y
  )
}

function findNegativeSpaces(field: MaterialField): BauhausNegativeSpace[] {
  const focal = field.regions.find((region) => region.id === field.focalRegionId)
  const columns = 4
  const rows = 3
  const candidates: BauhausNegativeSpace[] = []
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      let density = 0
      let edge = 0
      let samples = 0
      const startX = Math.floor(column * field.width / columns)
      const endX = Math.floor((column + 1) * field.width / columns)
      const startY = Math.floor(row * field.height / rows)
      const endY = Math.floor((row + 1) * field.height / rows)
      for (let y = startY; y < endY; y += 2) {
        for (let x = startX; x < endX; x += 2) {
          const index = y * field.width + x
          density += field.density[index]
          edge += field.edges[index]
          samples += 1
        }
      }
      const cell = {
        x: column / columns,
        y: row / rows,
        width: 1 / columns,
        height: 1 / rows,
        score: 1 - clamp(
          density / Math.max(1, samples) * 0.7 +
          edge / Math.max(1, samples) * 1.8,
        ),
      }
      if (!focal || !intersectsRegion(cell, focal, field)) candidates.push(cell)
    }
  }
  return candidates.sort((left, right) => right.score - left.score).slice(0, 4)
}

export function analyzeBauhausPixels(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  narrativePalette: readonly string[] = [],
  maximumPlanes = 12,
): BauhausComposition {
  const field = analyzeMaterialPixels(rgba, width, height, maximumPlanes)
  const axis = dominantAxis(field)
  const palette = uniquePalette(field.palette, narrativePalette)
  const ordered = [...field.regions]
    .sort((left, right) => right.salience - left.salience)
    .slice(0, maximumPlanes)
  const geometries = new Map(
    ordered.map((region) => [region.id, geometryForRegion(region, field)]),
  )
  const planes = ordered.map((region, index): BauhausPlane => {
    const geometry = geometries.get(region.id) as RegionGeometry
    const normalizedWidth = (region.maxX - region.minX + 1) / field.width
    const normalizedHeight = (region.maxY - region.minY + 1) / field.height
    const focal = region.id === field.focalRegionId
    const start = focal
      ? 0.46
      : clamp(0.06 + index / Math.max(1, ordered.length) * 0.42)
    return {
      id: `plane-${region.id}`,
      sourceRegionId: region.id,
      shape: regionShape(region, geometry),
      centerX: region.centroidX,
      centerY: region.centroidY,
      width: clamp(normalizedWidth, 0.035, 0.72),
      height: clamp(normalizedHeight, 0.035, 0.72),
      rotation: geometry.angle,
      color: rgbHex(region.averageColor),
      salience: region.salience,
      focal,
      abstractionStart: start,
      abstractionEnd: clamp(start + (focal ? 0.48 : 0.34), start + 0.1, 1),
      outline: geometry.outline,
    }
  })
  const lines = ordered.slice(0, 9).map(
    (region) => (geometries.get(region.id) as RegionGeometry).line,
  )
  return {
    width: field.width,
    height: field.height,
    field,
    planes,
    lines,
    negativeSpaces: findNegativeSpaces(field),
    palette,
    dominantAxis: axis,
  }
}

export function matchBauhausPlanes(
  from: BauhausComposition,
  to: BauhausComposition,
): BauhausPlaneMatch[] {
  const fromById = new Map(from.planes.map((plane) => [plane.sourceRegionId, plane]))
  const toById = new Map(to.planes.map((plane) => [plane.sourceRegionId, plane]))
  return matchMaterialRegions(from.field.regions, to.field.regions).map((match) => ({
    from: match.fromRegionId === null ? null : fromById.get(match.fromRegionId) ?? null,
    to: match.toRegionId === null ? null : toById.get(match.toRegionId) ?? null,
  }))
}
