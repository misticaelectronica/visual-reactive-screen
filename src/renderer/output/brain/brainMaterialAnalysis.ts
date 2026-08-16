export type MaterialRegion = {
  id: number
  pixelCount: number
  areaRatio: number
  centroidX: number
  centroidY: number
  minX: number
  minY: number
  maxX: number
  maxY: number
  averageColor: readonly [number, number, number]
  luminance: number
  density: number
  edgeStrength: number
  salience: number
}

export type MaterialField = {
  width: number
  height: number
  rgba: Uint8ClampedArray
  luminance: Float32Array
  density: Float32Array
  edges: Float32Array
  regionLabels: Uint8Array
  regions: MaterialRegion[]
  palette: string[]
  focalRegionId: number | null
}

export type MaterialRegionMatch = {
  fromRegionId: number | null
  toRegionId: number | null
  cost: number
}

type MutableComponent = {
  pixels: number[]
  red: number
  green: number
  blue: number
  luminance: number
  density: number
  edge: number
  x: number
  y: number
  minX: number
  minY: number
  maxX: number
  maxY: number
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value))
}

function byteHex(value: number): string {
  return Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0')
}

function colorDistance(
  left: readonly [number, number, number],
  right: readonly [number, number, number],
): number {
  return Math.hypot(
    left[0] - right[0],
    left[1] - right[1],
    left[2] - right[2],
  ) / 441.7
}

function materialClass(
  red: number,
  green: number,
  blue: number,
  luminance: number,
): number {
  const maximum = Math.max(red, green, blue)
  const minimum = Math.min(red, green, blue)
  const saturation = maximum <= 0 ? 0 : (maximum - minimum) / maximum
  const luminanceBand = Math.min(3, Math.floor(luminance * 4))
  if (saturation < 0.12) return luminanceBand
  const hueBand = maximum === red
    ? 0
    : maximum === green
      ? 1
      : 2
  return 4 + hueBand * 2 + (luminance >= 0.5 ? 1 : 0)
}

function fallbackField(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): MaterialField {
  return {
    width: Math.max(1, width),
    height: Math.max(1, height),
    rgba: new Uint8ClampedArray(rgba),
    luminance: new Float32Array(Math.max(1, width * height)),
    density: new Float32Array(Math.max(1, width * height)),
    edges: new Float32Array(Math.max(1, width * height)),
    regionLabels: new Uint8Array(Math.max(1, width * height)),
    regions: [],
    palette: ['#181018', '#e0d8df'],
    focalRegionId: null,
  }
}

export function analyzeMaterialPixels(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  maximumRegions = 12,
): MaterialField {
  const pixelCount = width * height
  if (width <= 1 || height <= 1 || rgba.length !== pixelCount * 4) {
    return fallbackField(rgba, width, height)
  }

  const luminance = new Float32Array(pixelCount)
  const density = new Float32Array(pixelCount)
  const edges = new Float32Array(pixelCount)
  const classes = new Uint8Array(pixelCount)
  const paletteBuckets = new Map<
    number,
    { red: number; green: number; blue: number; count: number }
  >()

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4
    const red = rgba[offset]
    const green = rgba[offset + 1]
    const blue = rgba[offset + 2]
    const light = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255
    const maximum = Math.max(red, green, blue)
    const minimum = Math.min(red, green, blue)
    const saturation = maximum <= 0 ? 0 : (maximum - minimum) / maximum
    luminance[pixel] = light
    density[pixel] = clamp((1 - light) * 0.68 + saturation * 0.32)
    classes[pixel] = materialClass(red, green, blue, light)
    const bucket =
      (Math.round(red / 51) << 8) |
      (Math.round(green / 51) << 4) |
      Math.round(blue / 51)
    const entry = paletteBuckets.get(bucket) ?? {
      red: 0,
      green: 0,
      blue: 0,
      count: 0,
    }
    entry.red += red
    entry.green += green
    entry.blue += blue
    entry.count += 1
    paletteBuckets.set(bucket, entry)
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x
      const gx =
        -luminance[index - width - 1] + luminance[index - width + 1] -
        luminance[index - 1] * 2 + luminance[index + 1] * 2 -
        luminance[index + width - 1] + luminance[index + width + 1]
      const gy =
        -luminance[index - width - 1] - luminance[index - width] * 2 -
        luminance[index - width + 1] + luminance[index + width - 1] +
        luminance[index + width] * 2 + luminance[index + width + 1]
      edges[index] = clamp(Math.hypot(gx, gy) / 4)
    }
  }

  const visited = new Uint8Array(pixelCount)
  const components: MutableComponent[] = []
  const minimumPixels = Math.max(8, Math.floor(pixelCount * 0.0015))
  const queue = new Int32Array(pixelCount)

  for (let start = 0; start < pixelCount; start += 1) {
    if (visited[start]) continue
    const targetClass = classes[start]
    let read = 0
    let write = 0
    queue[write++] = start
    visited[start] = 1
    const component: MutableComponent = {
      pixels: [],
      red: 0,
      green: 0,
      blue: 0,
      luminance: 0,
      density: 0,
      edge: 0,
      x: 0,
      y: 0,
      minX: width,
      minY: height,
      maxX: 0,
      maxY: 0,
    }
    while (read < write) {
      const index = queue[read++]
      const x = index % width
      const y = Math.floor(index / width)
      const offset = index * 4
      component.pixels.push(index)
      component.red += rgba[offset]
      component.green += rgba[offset + 1]
      component.blue += rgba[offset + 2]
      component.luminance += luminance[index]
      component.density += density[index]
      component.edge += edges[index]
      component.x += x
      component.y += y
      component.minX = Math.min(component.minX, x)
      component.minY = Math.min(component.minY, y)
      component.maxX = Math.max(component.maxX, x)
      component.maxY = Math.max(component.maxY, y)

      const neighbours = [
        x > 0 ? index - 1 : -1,
        x + 1 < width ? index + 1 : -1,
        y > 0 ? index - width : -1,
        y + 1 < height ? index + width : -1,
      ]
      for (const neighbour of neighbours) {
        if (
          neighbour >= 0 &&
          !visited[neighbour] &&
          classes[neighbour] === targetClass
        ) {
          visited[neighbour] = 1
          queue[write++] = neighbour
        }
      }
    }
    if (component.pixels.length >= minimumPixels) components.push(component)
  }

  const selected = components
    .sort((left, right) => {
      const leftScore = left.pixels.length * (1 + left.edge / left.pixels.length)
      const rightScore = right.pixels.length * (1 + right.edge / right.pixels.length)
      return rightScore - leftScore
    })
    .slice(0, Math.max(1, maximumRegions))

  const regionLabels = new Uint8Array(pixelCount)
  const regions = selected.map((component, index): MaterialRegion => {
    const count = component.pixels.length
    const centroidX = component.x / count / Math.max(1, width - 1)
    const centroidY = component.y / count / Math.max(1, height - 1)
    const edgeStrength = clamp(component.edge / count)
    const centerDistance = Math.hypot(centroidX - 0.5, centroidY - 0.5)
    const centerBias = clamp(1 - centerDistance * 0.7, 0.45, 1)
    const areaRatio = count / pixelCount
    const salience = clamp(
      Math.sqrt(areaRatio) * 1.8 * centerBias + edgeStrength * 0.65,
    )
    for (const pixel of component.pixels) regionLabels[pixel] = index + 1
    return {
      id: index,
      pixelCount: count,
      areaRatio,
      centroidX,
      centroidY,
      minX: component.minX,
      minY: component.minY,
      maxX: component.maxX,
      maxY: component.maxY,
      averageColor: [
        Math.round(component.red / count),
        Math.round(component.green / count),
        Math.round(component.blue / count),
      ],
      luminance: clamp(component.luminance / count),
      density: clamp(component.density / count),
      edgeStrength,
      salience,
    }
  })

  const focalRegion = [...regions].sort(
    (left, right) => right.salience - left.salience,
  )[0]
  const palette = [...paletteBuckets.values()]
    .sort((left, right) => right.count - left.count)
    .slice(0, 6)
    .map((entry) => {
      const red = entry.red / entry.count
      const green = entry.green / entry.count
      const blue = entry.blue / entry.count
      return `#${byteHex(red)}${byteHex(green)}${byteHex(blue)}`
    })

  return {
    width,
    height,
    rgba: new Uint8ClampedArray(rgba),
    luminance,
    density,
    edges,
    regionLabels,
    regions,
    palette: palette.length >= 2 ? palette : ['#181018', '#e0d8df'],
    focalRegionId: focalRegion?.id ?? null,
  }
}

function regionMatchCost(from: MaterialRegion, to: MaterialRegion): number {
  const position = Math.hypot(
    from.centroidX - to.centroidX,
    from.centroidY - to.centroidY,
  ) / Math.SQRT2
  const area = Math.abs(Math.sqrt(from.areaRatio) - Math.sqrt(to.areaRatio))
  const color = colorDistance(from.averageColor, to.averageColor)
  const luminance = Math.abs(from.luminance - to.luminance)
  const edge = Math.abs(from.edgeStrength - to.edgeStrength)
  return position * 0.38 + area * 0.2 + color * 0.2 + luminance * 0.14 + edge * 0.08
}

export function matchMaterialRegions(
  fromRegions: readonly MaterialRegion[],
  toRegions: readonly MaterialRegion[],
): MaterialRegionMatch[] {
  const remaining = new Set(toRegions.map((region) => region.id))
  const matches: MaterialRegionMatch[] = []
  const orderedFrom = [...fromRegions].sort(
    (left, right) => right.salience - left.salience,
  )
  for (const from of orderedFrom) {
    let best: MaterialRegion | null = null
    let bestCost = Number.POSITIVE_INFINITY
    for (const to of toRegions) {
      if (!remaining.has(to.id)) continue
      const cost = regionMatchCost(from, to)
      if (cost < bestCost) {
        best = to
        bestCost = cost
      }
    }
    if (best) {
      remaining.delete(best.id)
      matches.push({
        fromRegionId: from.id,
        toRegionId: best.id,
        cost: bestCost,
      })
    } else {
      matches.push({ fromRegionId: from.id, toRegionId: null, cost: 1 })
    }
  }
  for (const to of toRegions) {
    if (remaining.has(to.id)) {
      matches.push({ fromRegionId: null, toRegionId: to.id, cost: 1 })
    }
  }
  return matches
}
