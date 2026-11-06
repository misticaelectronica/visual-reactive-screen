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

function loopPath(points: Point[]): string {
  if (points.length < 3) return ''
  return `M${number(points[0].x)} ${number(points[0].y)}` +
    points.slice(1).map((point) => `L${number(point.x)} ${number(point.y)}`).join('') +
    'Z'
}

function color(region: BrainSnicRegion): string {
  const channel = (value: number) => Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, '0')
  return `#${channel(region.red)}${channel(region.green)}${channel(region.blue)}`
}

type RegionLoops = { region: BrainSnicRegion; loops: Point[][] }

/**
 * Punti di giunzione della griglia dei vertici di pixel: dove si incontrano
 * tre o più etichette (il bordo dell'immagine conta come etichetta), dove due
 * etichette si toccano solo in diagonale e i quattro angoli del quadro. Fra
 * due giunzioni il confine è
 * condiviso esattamente da due regioni (PIANO-060).
 */
function junctionGrid(
  segmentation: BrainSnicSegmentation,
  width: number,
  height: number,
): Uint8Array {
  const labels = segmentation.labels
  const stride = width + 1
  const grid = new Uint8Array(stride * (height + 1))
  const label = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= width || y >= height ? -1 : labels[y * width + x]
  for (let y = 0; y <= height; y++) {
    for (let x = 0; x <= width; x++) {
      const topLeft = label(x - 1, y - 1)
      const topRight = label(x, y - 1)
      const bottomLeft = label(x - 1, y)
      const bottomRight = label(x, y)
      const distinct = new Set([topLeft, topRight, bottomLeft, bottomRight]).size
      const diagonal =
        distinct === 2 &&
        topLeft === bottomRight &&
        topRight === bottomLeft &&
        topLeft !== topRight
      if (distinct >= 3 || diagonal) grid[y * stride + x] = 1
    }
  }
  // Gli angoli del quadro restano spigoli: non vanno arrotondati.
  grid[0] = 1
  grid[width] = 1
  grid[height * stride] = 1
  grid[height * stride + width] = 1
  return grid
}

function comparePoints(left: Point, right: Point): number {
  return left.y - right.y || left.x - right.x
}

function chaikinOpen(points: Point[], iterations: number): Point[] {
  let current = points
  for (let iteration = 0; iteration < iterations && current.length > 2; iteration++) {
    const next: Point[] = [current[0]]
    for (let index = 0; index < current.length - 1; index++) {
      const start = current[index]
      const end = current[index + 1]
      if (index > 0) next.push(lerp(start, end, 0.25))
      if (index < current.length - 2) next.push(lerp(start, end, 0.75))
    }
    next.push(current[current.length - 1])
    current = next
  }
  return current
}

function chaikinClosed(points: Point[], iterations: number): Point[] {
  let current = points
  for (let iteration = 0; iteration < iterations && current.length > 2; iteration++) {
    const next: Point[] = []
    for (let index = 0; index < current.length; index++) {
      const start = current[index]
      const end = current[(index + 1) % current.length]
      next.push(lerp(start, end, 0.25), lerp(start, end, 0.75))
    }
    current = next
  }
  return current
}

/**
 * Un tratto fra due giunzioni compare in due regioni, percorso in versi
 * opposti. Lo si elabora sempre nello stesso verso canonico, così le due
 * regioni ottengono lo stesso confine e non nascono fessure né sovrapposizioni.
 */
function processChain(
  chain: Point[],
  tolerance: number,
  smoothingIterations: number,
): Point[] {
  const first = comparePoints(chain[0], chain[chain.length - 1])
  const reverse =
    first > 0 ||
    (first === 0 && chain.length > 2 && comparePoints(chain[1], chain[chain.length - 2]) > 0)
  const canonical = reverse ? [...chain].reverse() : chain
  const processed = chaikinOpen(simplifyOpen(canonical, tolerance), smoothingIterations)
  return reverse ? processed.reverse() : processed
}

function processRing(
  ring: Point[],
  tolerance: number,
  smoothingIterations: number,
): Point[] {
  let start = 0
  for (let index = 1; index < ring.length; index++) {
    if (comparePoints(ring[index], ring[start]) < 0) start = index
  }
  const rotated = [...ring.slice(start), ...ring.slice(0, start)]
  const reverse = comparePoints(rotated[1], rotated[rotated.length - 1]) > 0
  const canonical = reverse ? [rotated[0], ...rotated.slice(1).reverse()] : rotated
  const processed = chaikinClosed(simplifyClosed(canonical, tolerance), smoothingIterations)
  return reverse ? processed.reverse() : processed
}

function processLoop(
  loop: Point[],
  junctions: Uint8Array,
  width: number,
  tolerance: number,
  smoothingIterations: number,
): Point[] {
  const stride = width + 1
  const anchors: number[] = []
  loop.forEach((point, index) => {
    if (junctions[point.y * stride + point.x]) anchors.push(index)
  })
  if (anchors.length === 0) return processRing(loop, tolerance, smoothingIterations)
  const result: Point[] = []
  for (let index = 0; index < anchors.length; index++) {
    const from = anchors[index]
    const to = anchors[(index + 1) % anchors.length]
    const chain = to > from
      ? loop.slice(from, to + 1)
      : [...loop.slice(from), ...loop.slice(0, to + 1)]
    const processed = processChain(chain, tolerance, smoothingIterations)
    result.push(...processed.slice(0, -1))
  }
  return result.length >= 3 ? result : loop
}

function simplifyToBudget(
  regions: RegionLoops[],
  junctions: Uint8Array,
  width: number,
  options: BrainContourSvgOptions,
): { regions: RegionLoops[]; pointCount: number } {
  let tolerance = options.simplificationTolerance
  let simplified: RegionLoops[] = []
  let pointCount = 0
  for (let attempt = 0; attempt < 6; attempt++) {
    simplified = regions.map(({ region, loops }) => ({
      region,
      loops: loops.map((loop) => processLoop(loop, junctions, width, tolerance, 0)),
    }))
    pointCount = simplified.reduce(
      (sum, item) => sum + item.loops.reduce((subtotal, loop) => subtotal + loop.length, 0),
      0,
    )
    if (pointCount <= options.maximumPoints) break
    tolerance *= 1.45
  }
  // Chaikin si applica una sola volta, alla tolleranza scelta dal budget.
  const smoothingIterations = Math.max(0, Math.min(4, Math.round(options.curveSmoothing * 6)))
  if (smoothingIterations > 0) {
    simplified = regions.map(({ region, loops }) => ({
      region,
      loops: loops.map((loop) =>
        processLoop(loop, junctions, width, tolerance, smoothingIterations),
      ),
    }))
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
  const junctions = junctionGrid(segmentation, width, height)
  const budgeted = simplifyToBudget(regions, junctions, width, options)
  const paths = budgeted.regions.map(({ region, loops }) => {
    // La curvatura è già data da Chaikin sui tratti condivisi: qui solo linee.
    const data = loops.map((loop) => loopPath(loop)).join('')
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
