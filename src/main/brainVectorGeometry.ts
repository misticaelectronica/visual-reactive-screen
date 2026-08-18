type Point = { x: number; y: number }

type Subpath = {
  points: Point[]
  closed: boolean
}

export type BrainVectorGeometryResult = {
  svg: string
  cornerDensityBefore: number
  cornerDensityAfter: number
  smoothedPathCount: number
  maximumDeviation: number
}

const FLATTEN_SPACING = 4
const OUTPUT_SPACING = 6
const MAXIMUM_POINTS_PER_SUBPATH = 128
const MAXIMUM_TOTAL_POINTS = 5_200
const MAXIMUM_POINT_DEVIATION = 2.2
const MAXIMUM_CONTROL_REACH = 2.2
const SMOOTHING_PASSES = 2
const MINIMUM_CORNER_TURN = Math.PI / 10

function distance(left: Point, right: Point): number {
  return Math.hypot(right.x - left.x, right.y - left.y)
}

function samePoint(left: Point, right: Point): boolean {
  return distance(left, right) < 0.001
}

function pointOnCubic(
  start: Point,
  control1: Point,
  control2: Point,
  end: Point,
  amount: number,
): Point {
  const inverse = 1 - amount
  return {
    x:
      inverse ** 3 * start.x +
      3 * inverse ** 2 * amount * control1.x +
      3 * inverse * amount ** 2 * control2.x +
      amount ** 3 * end.x,
    y:
      inverse ** 3 * start.y +
      3 * inverse ** 2 * amount * control1.y +
      3 * inverse * amount ** 2 * control2.y +
      amount ** 3 * end.y,
  }
}

function pointOnQuadratic(
  start: Point,
  control: Point,
  end: Point,
  amount: number,
): Point {
  const inverse = 1 - amount
  return {
    x: inverse ** 2 * start.x + 2 * inverse * amount * control.x + amount ** 2 * end.x,
    y: inverse ** 2 * start.y + 2 * inverse * amount * control.y + amount ** 2 * end.y,
  }
}

function curveSteps(length: number): number {
  return Math.max(2, Math.min(32, Math.ceil(length / FLATTEN_SPACING)))
}

function pathTokens(pathData: string): string[] {
  return pathData.match(
    /[AaCcHhLlMmQqSsTtVvZz]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/giu,
  ) ?? []
}

function flattenPath(pathData: string): Subpath[] | null {
  const tokens = pathTokens(pathData)
  const subpaths: Subpath[] = []
  let active: Subpath | null = null
  let command = ''
  let index = 0
  let current: Point = { x: 0, y: 0 }
  let start: Point = { x: 0, y: 0 }
  let previousCubicControl: Point | null = null
  let previousQuadraticControl: Point | null = null

  const number = (): number | null => {
    const token = tokens[index]
    if (token === undefined || /^[a-z]$/iu.test(token)) return null
    index += 1
    const value = Number(token)
    return Number.isFinite(value) ? value : null
  }
  const ensureActive = (): Subpath => {
    if (!active) {
      active = { points: [{ ...current }], closed: false }
      subpaths.push(active)
      start = { ...current }
    }
    return active
  }
  const push = (point: Point): void => {
    const path = ensureActive()
    if (!samePoint(path.points[path.points.length - 1], point)) path.points.push(point)
    current = point
  }
  const coordinate = (value: number, axis: 'x' | 'y', relative: boolean): number =>
    relative ? current[axis] + value : value

  while (index < tokens.length) {
    if (/^[a-z]$/iu.test(tokens[index])) command = tokens[index++]
    if (!command) return null
    const upper = command.toUpperCase()
    const relative = command !== upper
    if (upper === 'A') return null
    if (upper === 'Z') {
      if (active) {
        active.closed = true
        if (active.points.length > 1 && samePoint(active.points[0], active.points.at(-1)!)) {
          active.points.pop()
        }
      }
      current = { ...start }
      previousCubicControl = null
      previousQuadraticControl = null
      command = ''
      continue
    }

    if (upper === 'M') {
      const rawX = number()
      const rawY = number()
      if (rawX === null || rawY === null) return null
      current = {
        x: coordinate(rawX, 'x', relative),
        y: coordinate(rawY, 'y', relative),
      }
      active = { points: [{ ...current }], closed: false }
      subpaths.push(active)
      start = { ...current }
      command = relative ? 'l' : 'L'
      previousCubicControl = null
      previousQuadraticControl = null
      continue
    }

    if (upper === 'L') {
      const rawX = number()
      const rawY = number()
      if (rawX === null || rawY === null) return null
      push({
        x: coordinate(rawX, 'x', relative),
        y: coordinate(rawY, 'y', relative),
      })
    } else if (upper === 'H') {
      const rawX = number()
      if (rawX === null) return null
      push({ x: coordinate(rawX, 'x', relative), y: current.y })
    } else if (upper === 'V') {
      const rawY = number()
      if (rawY === null) return null
      push({ x: current.x, y: coordinate(rawY, 'y', relative) })
    } else if (upper === 'C') {
      const values = Array.from({ length: 6 }, number)
      if (values.some((value) => value === null)) return null
      const origin = { ...current }
      const control1 = {
        x: coordinate(values[0] as number, 'x', relative),
        y: coordinate(values[1] as number, 'y', relative),
      }
      const control2 = {
        x: coordinate(values[2] as number, 'x', relative),
        y: coordinate(values[3] as number, 'y', relative),
      }
      const end = {
        x: coordinate(values[4] as number, 'x', relative),
        y: coordinate(values[5] as number, 'y', relative),
      }
      const steps = curveSteps(
        distance(origin, control1) + distance(control1, control2) + distance(control2, end),
      )
      for (let step = 1; step <= steps; step++) {
        push(pointOnCubic(origin, control1, control2, end, step / steps))
      }
      previousCubicControl = control2
      previousQuadraticControl = null
      continue
    } else if (upper === 'S') {
      const values = Array.from({ length: 4 }, number)
      if (values.some((value) => value === null)) return null
      const origin = { ...current }
      const control1 = previousCubicControl
        ? { x: current.x * 2 - previousCubicControl.x, y: current.y * 2 - previousCubicControl.y }
        : { ...current }
      const control2 = {
        x: coordinate(values[0] as number, 'x', relative),
        y: coordinate(values[1] as number, 'y', relative),
      }
      const end = {
        x: coordinate(values[2] as number, 'x', relative),
        y: coordinate(values[3] as number, 'y', relative),
      }
      const steps = curveSteps(
        distance(origin, control1) + distance(control1, control2) + distance(control2, end),
      )
      for (let step = 1; step <= steps; step++) {
        push(pointOnCubic(origin, control1, control2, end, step / steps))
      }
      previousCubicControl = control2
      previousQuadraticControl = null
      continue
    } else if (upper === 'Q' || upper === 'T') {
      const smooth = upper === 'T'
      const values = Array.from({ length: smooth ? 2 : 4 }, number)
      if (values.some((value) => value === null)) return null
      const origin = { ...current }
      const control: Point = smooth
        ? previousQuadraticControl
          ? {
              x: current.x * 2 - previousQuadraticControl.x,
              y: current.y * 2 - previousQuadraticControl.y,
            }
          : { ...current }
        : {
            x: coordinate(values[0] as number, 'x', relative),
            y: coordinate(values[1] as number, 'y', relative),
          }
      const endOffset = smooth ? 0 : 2
      const end = {
        x: coordinate(values[endOffset] as number, 'x', relative),
        y: coordinate(values[endOffset + 1] as number, 'y', relative),
      }
      const steps = curveSteps(distance(origin, control) + distance(control, end))
      for (let step = 1; step <= steps; step++) {
        push(pointOnQuadratic(origin, control, end, step / steps))
      }
      previousQuadraticControl = control
      previousCubicControl = null
      continue
    } else {
      return null
    }
    previousCubicControl = null
    previousQuadraticControl = null
  }
  return subpaths
}

function closedPerimeter(points: Point[]): number {
  return points.reduce(
    (total, point, index) => total + distance(point, points[(index + 1) % points.length]),
    0,
  )
}

function resampleClosed(points: Point[], count: number): Point[] {
  const lengths = points.map((point, index) => distance(point, points[(index + 1) % points.length]))
  const perimeter = lengths.reduce((total, value) => total + value, 0)
  if (perimeter <= 0) return points
  const result: Point[] = []
  let segment = 0
  let segmentStart = 0
  for (let sample = 0; sample < count; sample++) {
    const target = perimeter * sample / count
    while (segment < lengths.length - 1 && segmentStart + lengths[segment] < target) {
      segmentStart += lengths[segment]
      segment += 1
    }
    const start = points[segment]
    const end = points[(segment + 1) % points.length]
    const amount = lengths[segment] > 0 ? (target - segmentStart) / lengths[segment] : 0
    result.push({
      x: start.x + (end.x - start.x) * amount,
      y: start.y + (end.y - start.y) * amount,
    })
  }
  return result
}

function smoothClosed(points: Point[]): { points: Point[]; maximumDeviation: number } {
  let maximumDeviation = 0
  const smoothed = points.map((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length]
    const next = points[(index + 1) % points.length]
    let dx = ((previous.x + next.x) * 0.5 - point.x) * 0.34
    let dy = ((previous.y + next.y) * 0.5 - point.y) * 0.34
    const rawDistance = Math.hypot(dx, dy)
    if (rawDistance > MAXIMUM_POINT_DEVIATION) {
      const scale = MAXIMUM_POINT_DEVIATION / rawDistance
      dx *= scale
      dy *= scale
    }
    const displacement = Math.hypot(dx, dy)
    maximumDeviation = Math.max(maximumDeviation, displacement)
    return { x: point.x + dx, y: point.y + dy }
  })
  return { points: smoothed, maximumDeviation }
}

function smoothClosedRepeated(
  points: Point[],
  passes: number,
): { points: Point[]; maximumDeviation: number } {
  let current = points
  let maximumDeviation = 0
  for (let pass = 0; pass < passes; pass += 1) {
    const result = smoothClosed(current)
    current = result.points
    maximumDeviation = Math.max(maximumDeviation, result.maximumDeviation)
  }
  return { points: current, maximumDeviation }
}

function format(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return Object.is(rounded, -0) ? '0' : String(rounded)
}

function unit(from: Point, to: Point): Point {
  const length = distance(from, to)
  return length > 0 ? { x: (to.x - from.x) / length, y: (to.y - from.y) / length } : { x: 0, y: 0 }
}

function cubicClosedPath(points: Point[]): string {
  let path = `M${format(points[0].x)} ${format(points[0].y)}`
  for (let index = 0; index < points.length; index++) {
    const before = points[(index - 1 + points.length) % points.length]
    const start = points[index]
    const end = points[(index + 1) % points.length]
    const after = points[(index + 2) % points.length]
    const reach = Math.min(distance(start, end) / 3, MAXIMUM_CONTROL_REACH)
    const startTangent = unit(before, end)
    const endTangent = unit(start, after)
    const control1 = {
      x: start.x + startTangent.x * reach,
      y: start.y + startTangent.y * reach,
    }
    const control2 = {
      x: end.x - endTangent.x * reach,
      y: end.y - endTangent.y * reach,
    }
    path += `C${format(control1.x)} ${format(control1.y)} ${format(control2.x)} ${format(control2.y)} ${format(end.x)} ${format(end.y)}`
  }
  return `${path}Z`
}

function pathDataFromTag(tag: string): { data: string; quote: string } | null {
  const match = tag.match(/\bd\s*=\s*(["'])(.*?)\1/isu)
  return match ? { data: match[2], quote: match[1] } : null
}

function replacePathData(tag: string, data: string, quote: string): string {
  return tag.replace(/\bd\s*=\s*(["'])(.*?)\1/isu, `d=${quote}${data}${quote}`)
}

function cornerDensityFromSubpaths(subpaths: Subpath[]): number {
  let inspected = 0
  let corners = 0
  for (const subpath of subpaths) {
    if (!subpath.closed || subpath.points.length < 4) continue
    const perimeter = closedPerimeter(subpath.points)
    const count = Math.max(4, Math.min(256, Math.ceil(perimeter / OUTPUT_SPACING)))
    const points = resampleClosed(subpath.points, count)
    for (let index = 0; index < points.length; index++) {
      const previous = points[(index - 1 + points.length) % points.length]
      const current = points[index]
      const next = points[(index + 1) % points.length]
      const incoming = { x: current.x - previous.x, y: current.y - previous.y }
      const outgoing = { x: next.x - current.x, y: next.y - current.y }
      const incomingLength = Math.hypot(incoming.x, incoming.y)
      const outgoingLength = Math.hypot(outgoing.x, outgoing.y)
      if (incomingLength < 0.01 || outgoingLength < 0.01) continue
      inspected += 1
      const turn = Math.abs(Math.atan2(
        incoming.x * outgoing.y - incoming.y * outgoing.x,
        incoming.x * outgoing.x + incoming.y * outgoing.y,
      ))
      if (turn > MINIMUM_CORNER_TURN) corners += 1
    }
  }
  return inspected > 0 ? corners / inspected : 0
}

export function measureSvgCornerDensity(svg: string): number {
  let inspected = 0
  let weightedDensity = 0
  for (const match of svg.matchAll(/<path\b[^>]*>/giu)) {
    const path = pathDataFromTag(match[0])
    if (!path) continue
    const subpaths = flattenPath(path.data)
    if (!subpaths) continue
    const vertices = subpaths.reduce(
      (total, subpath) => total + (subpath.closed ? subpath.points.length : 0),
      0,
    )
    if (vertices === 0) continue
    weightedDensity += cornerDensityFromSubpaths(subpaths) * vertices
    inspected += vertices
  }
  return inspected > 0 ? weightedDensity / inspected : 0
}

export function smoothBrainVectorGeometry(svg: string): BrainVectorGeometryResult {
  const cornerDensityBefore = measureSvgCornerDensity(svg)
  let totalPerimeter = 0
  let closedSubpathCount = 0
  for (const match of svg.matchAll(/<path\b[^>]*>/giu)) {
    const tag = match[0]
    if (/\bfill\s*=\s*["']none["']/iu.test(tag)) continue
    const path = pathDataFromTag(tag)
    if (!path) continue
    const subpaths = flattenPath(path.data)
    if (
      !subpaths ||
      subpaths.length === 0 ||
      subpaths.some((item) => !item.closed || item.points.length < 3)
    ) {
      continue
    }
    for (const subpath of subpaths) {
      const perimeter = closedPerimeter(subpath.points)
      if (perimeter < 8) continue
      totalPerimeter += perimeter
      closedSubpathCount += 1
    }
  }
  const adaptiveSpacing = Math.max(
    OUTPUT_SPACING,
    totalPerimeter /
      Math.max(1, MAXIMUM_TOTAL_POINTS - closedSubpathCount * 4),
  )
  let smoothedPathCount = 0
  let maximumDeviation = 0
  const smoothedSvg = svg.replace(/<path\b[^>]*>/giu, (tag) => {
    if (/\bfill\s*=\s*["']none["']/iu.test(tag)) return tag
    const path = pathDataFromTag(tag)
    if (!path) return tag
    const subpaths = flattenPath(path.data)
    if (!subpaths || subpaths.length === 0 || subpaths.some((item) => !item.closed)) return tag
    const rebuilt: string[] = []
    let pathMaximumDeviation = 0
    for (const subpath of subpaths) {
      if (subpath.points.length < 3) return tag
      const perimeter = closedPerimeter(subpath.points)
      if (perimeter < 8) return tag
      const count = Math.max(
        4,
        Math.min(MAXIMUM_POINTS_PER_SUBPATH, Math.ceil(perimeter / adaptiveSpacing)),
      )
      const resampled = resampleClosed(subpath.points, count)
      const smoothed = smoothClosedRepeated(resampled, SMOOTHING_PASSES)
      rebuilt.push(cubicClosedPath(smoothed.points))
      pathMaximumDeviation = Math.max(pathMaximumDeviation, smoothed.maximumDeviation)
    }
    smoothedPathCount += 1
    maximumDeviation = Math.max(maximumDeviation, pathMaximumDeviation)
    return replacePathData(tag, rebuilt.join(''), path.quote)
  })
  const sizeLimit = Math.max(svg.length * 3, 80_000)
  if (smoothedSvg.length > Math.min(600_000, sizeLimit)) {
    return {
      svg,
      cornerDensityBefore,
      cornerDensityAfter: cornerDensityBefore,
      smoothedPathCount: 0,
      maximumDeviation: 0,
    }
  }
  return {
    svg: smoothedSvg,
    cornerDensityBefore,
    cornerDensityAfter: measureSvgCornerDensity(smoothedSvg),
    smoothedPathCount,
    maximumDeviation,
  }
}
