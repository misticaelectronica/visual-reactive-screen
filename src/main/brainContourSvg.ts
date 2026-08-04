import type { BrainSnicRegion, BrainSnicSegmentation } from './brainSnicSegmentation'

export type BrainContourSvgOptions = {
  simplificationTolerance: number
  curveSmoothing: number
  maximumPoints: number
  minimumContourArea: number
}

export type BrainContourSvgResult = {
  svg: string
  pathCount: number
  pointCount: number
  discardedContours: number
}

type Point = { x: number; y: number }
type Edge = { start: Point; end: Point; direction: number; used: boolean }

function pointKey(point: Point): string {
  return `${point.x}:${point.y}`
}

function edgeDirection(start: Point, end: Point): number {
  if (end.x > start.x) return 0
  if (end.y > start.y) return 1
  if (end.x < start.x) return 2
  return 3
}

function addEdge(edges: Edge[][], region: number, start: Point, end: Point): void {
  edges[region].push({
    start,
    end,
    direction: edgeDirection(start, end),
    used: false,
  })
}

function boundaryEdges(
  segmentation: BrainSnicSegmentation,
  width: number,
  height: number,
): Edge[][] {
  const edges: Edge[][] = Array.from(
    { length: segmentation.regions.length },
    () => [],
  )
  const labels = segmentation.labels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const region = labels[y * width + x]
      if (y === 0 || labels[(y - 1) * width + x] !== region) {
        addEdge(edges, region, { x, y }, { x: x + 1, y })
      }
      if (x + 1 === width || labels[y * width + x + 1] !== region) {
        addEdge(edges, region, { x: x + 1, y }, { x: x + 1, y: y + 1 })
      }
      if (y + 1 === height || labels[(y + 1) * width + x] !== region) {
        addEdge(edges, region, { x: x + 1, y: y + 1 }, { x, y: y + 1 })
      }
      if (x === 0 || labels[y * width + x - 1] !== region) {
        addEdge(edges, region, { x, y: y + 1 }, { x, y })
      }
    }
  }
  return edges
}

function preferredTurn(incoming: number, outgoing: number): number {
  const turn = (outgoing - incoming + 4) % 4
  // I bordi sono orientati in senso orario: a un incrocio diagonale scegliamo
  // prima la curva a destra, poi la prosecuzione diritta.
  return turn === 1 ? 0 : turn === 0 ? 1 : turn === 3 ? 2 : 3
}

function traceLoops(edges: Edge[]): Point[][] {
  const byStart = new Map<string, number[]>()
  edges.forEach((edge, index) => {
    const key = pointKey(edge.start)
    const indices = byStart.get(key) ?? []
    indices.push(index)
    byStart.set(key, indices)
  })
  const loops: Point[][] = []
  for (let seedIndex = 0; seedIndex < edges.length; seedIndex++) {
    const seed = edges[seedIndex]
    if (seed.used) continue
    const points: Point[] = [seed.start]
    let edge = seed
    edge.used = true
    let guard = 0
    while (guard++ <= edges.length) {
      points.push(edge.end)
      if (edge.end.x === seed.start.x && edge.end.y === seed.start.y) break
      const candidates = (byStart.get(pointKey(edge.end)) ?? [])
        .map((index) => edges[index])
        .filter((candidate) => !candidate.used)
        .sort(
          (left, right) =>
            preferredTurn(edge.direction, left.direction) -
            preferredTurn(edge.direction, right.direction),
        )
      const next = candidates[0]
      if (!next) break
      next.used = true
      edge = next
    }
    if (
      points.length >= 4 &&
      points[0].x === points[points.length - 1].x &&
      points[0].y === points[points.length - 1].y
    ) {
      points.pop()
      loops.push(points)
    }
  }
  return loops
}

function polygonArea(points: Point[]): number {
  let area = 0
  for (let index = 0; index < points.length; index++) {
    const current = points[index]
    const next = points[(index + 1) % points.length]
    area += current.x * next.y - next.x * current.y
  }
  return area / 2
}

function pointLineDistance(point: Point, start: Point, end: Point): number {
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y
  const lengthSquared = deltaX * deltaX + deltaY * deltaY
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y)
  const amount = Math.max(0, Math.min(
    1,
    ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) / lengthSquared,
  ))
  return Math.hypot(
    point.x - (start.x + amount * deltaX),
    point.y - (start.y + amount * deltaY),
  )
}

function simplifyOpen(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points
  let maximumDistance = 0
  let splitIndex = 0
  for (let index = 1; index < points.length - 1; index++) {
    const distance = pointLineDistance(points[index], points[0], points[points.length - 1])
    if (distance > maximumDistance) {
      maximumDistance = distance
      splitIndex = index
    }
  }
  if (maximumDistance <= tolerance) return [points[0], points[points.length - 1]]
  const left = simplifyOpen(points.slice(0, splitIndex + 1), tolerance)
  const right = simplifyOpen(points.slice(splitIndex), tolerance)
  return [...left.slice(0, -1), ...right]
}

function simplifyClosed(points: Point[], tolerance: number): Point[] {
  if (points.length <= 6 || tolerance <= 0) return points
  let second = 1
  let maximumDistance = 0
  for (let index = 1; index < points.length; index++) {
    const distance = Math.hypot(
      points[index].x - points[0].x,
      points[index].y - points[0].y,
    )
    if (distance > maximumDistance) {
      maximumDistance = distance
      second = index
    }
  }
  const firstArc = simplifyOpen(points.slice(0, second + 1), tolerance)
  const secondArc = simplifyOpen(
    [...points.slice(second), points[0]],
    tolerance,
  )
  const combined = [...firstArc.slice(0, -1), ...secondArc.slice(0, -1)]
  return combined.length >= 3 ? combined : points
}

function number(value: number): string {
  return Number(value.toFixed(2)).toString()
}

function lerp(left: Point, right: Point, amount: number): Point {
  return {
    x: left.x + (right.x - left.x) * amount,
    y: left.y + (right.y - left.y) * amount,
  }
}

function loopPath(points: Point[], smoothing: number): string {
  if (points.length < 3) return ''
  if (smoothing <= 0) {
    return `M${number(points[0].x)} ${number(points[0].y)}` +
      points.slice(1).map((point) => `L${number(point.x)} ${number(point.y)}`).join('') +
      'Z'
  }
  const cornerAmount = Math.max(0, Math.min(0.48, smoothing * 0.48))
  const outgoing = (index: number) => lerp(
    points[index],
    points[(index + 1) % points.length],
    cornerAmount,
  )
  const incoming = (index: number) => lerp(
    points[index],
    points[(index - 1 + points.length) % points.length],
    cornerAmount,
  )
  let path = `M${number(outgoing(0).x)} ${number(outgoing(0).y)}`
  for (let index = 1; index < points.length; index++) {
    const entry = incoming(index)
    const exit = outgoing(index)
    path += `L${number(entry.x)} ${number(entry.y)}`
    path += `Q${number(points[index].x)} ${number(points[index].y)} ` +
      `${number(exit.x)} ${number(exit.y)}`
  }
  const entry = incoming(0)
  path += `L${number(entry.x)} ${number(entry.y)}`
  path += `Q${number(points[0].x)} ${number(points[0].y)} ` +
    `${number(outgoing(0).x)} ${number(outgoing(0).y)}Z`
  return path
}

function color(region: BrainSnicRegion): string {
  const channel = (value: number) => Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, '0')
  return `#${channel(region.red)}${channel(region.green)}${channel(region.blue)}`
}

type RegionLoops = { region: BrainSnicRegion; loops: Point[][] }

function simplifyToBudget(
  regions: RegionLoops[],
  options: BrainContourSvgOptions,
): { regions: RegionLoops[]; pointCount: number } {
  let tolerance = options.simplificationTolerance
  let simplified: RegionLoops[] = []
  let pointCount = 0
  for (let attempt = 0; attempt < 6; attempt++) {
    simplified = regions.map(({ region, loops }) => ({
      region,
      loops: loops.map((loop) => simplifyClosed(loop, tolerance)),
    }))
    pointCount = simplified.reduce(
      (sum, item) => sum + item.loops.reduce((subtotal, loop) => subtotal + loop.length, 0),
      0,
    )
    if (pointCount <= options.maximumPoints) break
    tolerance *= 1.45
  }
  return { regions: simplified, pointCount }
}

export function composeBrainContourSvg(
  segmentation: BrainSnicSegmentation,
  width: number,
  height: number,
  options: BrainContourSvgOptions,
): BrainContourSvgResult {
  const allEdges = boundaryEdges(segmentation, width, height)
  let discardedContours = 0
  const regions: RegionLoops[] = segmentation.regions.map((region) => {
    const loops = traceLoops(allEdges[region.id]).filter((loop) => {
      const keep = Math.abs(polygonArea(loop)) >= options.minimumContourArea
      if (!keep) discardedContours += 1
      return keep
    })
    return { region, loops }
  }).filter((item) => item.loops.length > 0)
  const budgeted = simplifyToBudget(regions, options)
  const paths = budgeted.regions.map(({ region, loops }) => {
    const data = loops.map((loop) => loopPath(loop, options.curveSmoothing)).join('')
    const fill = color(region)
    return `<path d="${data}" fill="${fill}" fill-rule="evenodd"/>`
  })
  return {
    svg:
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
      `viewBox="0 0 ${width} ${height}">${paths.join('')}</svg>`,
    pathCount: paths.length,
    pointCount: budgeted.pointCount,
    discardedContours,
  }
}
