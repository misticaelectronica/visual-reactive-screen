export type BrainSnicOptions = {
  superpixelSize: number
  compactness: number
  mergeColorThreshold: number
  strongEdgeThreshold: number
  edgeWeight: number
  minimumRegionAreaRatio: number
  maximumRegions: number
}

export type BrainSnicRegion = {
  id: number
  area: number
  red: number
  green: number
  blue: number
}

export type BrainSnicSegmentation = {
  labels: Int32Array
  regions: BrainSnicRegion[]
  initialRegionCount: number
  boundaryContrast: number
  strongEdgeRecall: number
}

type PerceptualPixel = {
  lightness: Float32Array
  axisA: Float32Array
  axisB: Float32Array
}

type Cluster = {
  count: number
  sumL: number
  sumA: number
  sumB: number
  sumX: number
  sumY: number
}

type QueueEntry = {
  distance: number
  pixel: number
  cluster: number
}

type RegionAccumulator = {
  area: number
  sumRed: number
  sumGreen: number
  sumBlue: number
  sumL: number
  sumA: number
  sumB: number
}

type Boundary = {
  left: number
  right: number
  samples: number
  contrastSum: number
}

class MinimumHeap {
  private readonly entries: QueueEntry[] = []

  get length(): number {
    return this.entries.length
  }

  push(entry: QueueEntry): void {
    const entries = this.entries
    let index = entries.length
    entries.push(entry)
    while (index > 0) {
      const parent = (index - 1) >> 1
      if (entries[parent].distance <= entry.distance) break
      entries[index] = entries[parent]
      index = parent
    }
    entries[index] = entry
  }

  pop(): QueueEntry | undefined {
    const entries = this.entries
    if (entries.length === 0) return undefined
    const first = entries[0]
    const tail = entries.pop()
    if (entries.length === 0 || !tail) return first
    let index = 0
    while (true) {
      const left = index * 2 + 1
      if (left >= entries.length) break
      const right = left + 1
      const child =
        right < entries.length && entries[right].distance < entries[left].distance
          ? right
          : left
      if (entries[child].distance >= tail.distance) break
      entries[index] = entries[child]
      index = child
    }
    entries[index] = tail
    return first
  }
}

class DisjointRegions {
  readonly parent: Int32Array
  readonly area: Float64Array
  readonly sumL: Float64Array
  readonly sumA: Float64Array
  readonly sumB: Float64Array
  count: number

  constructor(regions: RegionAccumulator[]) {
    this.parent = new Int32Array(regions.length)
    this.area = new Float64Array(regions.length)
    this.sumL = new Float64Array(regions.length)
    this.sumA = new Float64Array(regions.length)
    this.sumB = new Float64Array(regions.length)
    this.count = regions.length
    for (let index = 0; index < regions.length; index++) {
      this.parent[index] = index
      this.area[index] = regions[index].area
      this.sumL[index] = regions[index].sumL
      this.sumA[index] = regions[index].sumA
      this.sumB[index] = regions[index].sumB
    }
  }

  find(value: number): number {
    let root = value
    while (this.parent[root] !== root) root = this.parent[root]
    let cursor = value
    while (this.parent[cursor] !== cursor) {
      const next = this.parent[cursor]
      this.parent[cursor] = root
      cursor = next
    }
    return root
  }

  merge(left: number, right: number): number {
    let rootLeft = this.find(left)
    let rootRight = this.find(right)
    if (rootLeft === rootRight) return rootLeft
    if (this.area[rootLeft] < this.area[rootRight]) {
      const swap = rootLeft
      rootLeft = rootRight
      rootRight = swap
    }
    this.parent[rootRight] = rootLeft
    this.area[rootLeft] += this.area[rootRight]
    this.sumL[rootLeft] += this.sumL[rootRight]
    this.sumA[rootLeft] += this.sumA[rootRight]
    this.sumB[rootLeft] += this.sumB[rootRight]
    this.count -= 1
    return rootLeft
  }

  colorDistance(left: number, right: number): number {
    const rootLeft = this.find(left)
    const rootRight = this.find(right)
    const leftArea = Math.max(1, this.area[rootLeft])
    const rightArea = Math.max(1, this.area[rootRight])
    return Math.hypot(
      (this.sumL[rootLeft] / leftArea - this.sumL[rootRight] / rightArea) * 100,
      (this.sumA[rootLeft] / leftArea - this.sumA[rootRight] / rightArea) * 100,
      (this.sumB[rootLeft] / leftArea - this.sumB[rootRight] / rightArea) * 100,
    )
  }
}

function linearChannel(value: number): number {
  const normalized = value / 255
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4
}

function perceptualPixels(rgba: Uint8Array): PerceptualPixel {
  const pixels = rgba.length / 4
  const lightness = new Float32Array(pixels)
  const axisA = new Float32Array(pixels)
  const axisB = new Float32Array(pixels)
  for (let pixel = 0; pixel < pixels; pixel++) {
    const offset = pixel * 4
    const red = linearChannel(rgba[offset])
    const green = linearChannel(rgba[offset + 1])
    const blue = linearChannel(rgba[offset + 2])
    const l = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue)
    const m = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue)
    const s = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue)
    lightness[pixel] = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
    axisA[pixel] = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
    axisB[pixel] = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  }
  return { lightness, axisA, axisB }
}

function clusterDistance(
  pixel: number,
  x: number,
  y: number,
  cluster: Cluster,
  colors: PerceptualPixel,
  step: number,
  compactness: number,
): number {
  const count = Math.max(1, cluster.count)
  const colorDistance = Math.hypot(
    (colors.lightness[pixel] - cluster.sumL / count) * 100,
    (colors.axisA[pixel] - cluster.sumA / count) * 100,
    (colors.axisB[pixel] - cluster.sumB / count) * 100,
  )
  const spatialDistance =
    Math.hypot(x - cluster.sumX / count, y - cluster.sumY / count) *
    compactness / step
  return Math.hypot(colorDistance, spatialDistance)
}

function seedPixels(width: number, height: number, step: number): number[] {
  const seeds: number[] = []
  const half = Math.floor(step / 2)
  for (let y = half; y < height; y += step) {
    for (let x = half; x < width; x += step) seeds.push(y * width + x)
  }
  if (seeds.length === 0) seeds.push(Math.floor(height / 2) * width + Math.floor(width / 2))
  return seeds
}

function initialSnic(
  width: number,
  height: number,
  colors: PerceptualPixel,
  options: BrainSnicOptions,
): Int32Array {
  const pixelCount = width * height
  const labels = new Int32Array(pixelCount).fill(-1)
  // Float64 evita che l'arrotondamento del costo faccia sembrare obsoleta la
  // stessa voce appena inserita nella coda di priorità.
  const bestDistance = new Float64Array(pixelCount).fill(Number.POSITIVE_INFINITY)
  const seeds = seedPixels(width, height, options.superpixelSize)
  const clusters: Cluster[] = seeds.map(() => ({
    count: 0,
    sumL: 0,
    sumA: 0,
    sumB: 0,
    sumX: 0,
    sumY: 0,
  }))
  const queue = new MinimumHeap()
  for (let cluster = 0; cluster < seeds.length; cluster++) {
    const pixel = seeds[cluster]
    bestDistance[pixel] = 0
    queue.push({ distance: 0, pixel, cluster })
  }

  const visit = (pixel: number, clusterId: number): void => {
    if (pixel < 0 || pixel >= pixelCount || labels[pixel] >= 0) return
    const x = pixel % width
    const y = Math.floor(pixel / width)
    const distance = clusterDistance(
      pixel,
      x,
      y,
      clusters[clusterId],
      colors,
      options.superpixelSize,
      options.compactness,
    )
    if (distance >= bestDistance[pixel]) return
    bestDistance[pixel] = distance
    queue.push({ distance, pixel, cluster: clusterId })
  }

  while (queue.length > 0) {
    const entry = queue.pop()
    if (!entry || labels[entry.pixel] >= 0 || entry.distance > bestDistance[entry.pixel]) continue
    const x = entry.pixel % width
    const y = Math.floor(entry.pixel / width)
    labels[entry.pixel] = entry.cluster
    const cluster = clusters[entry.cluster]
    cluster.count += 1
    cluster.sumL += colors.lightness[entry.pixel]
    cluster.sumA += colors.axisA[entry.pixel]
    cluster.sumB += colors.axisB[entry.pixel]
    cluster.sumX += x
    cluster.sumY += y
    if (x > 0) visit(entry.pixel - 1, entry.cluster)
    if (x + 1 < width) visit(entry.pixel + 1, entry.cluster)
    if (y > 0) visit(entry.pixel - width, entry.cluster)
    if (y + 1 < height) visit(entry.pixel + width, entry.cluster)
  }
  return labels
}

function accumulateRegions(
  rgba: Uint8Array,
  labels: Int32Array,
  colors: PerceptualPixel,
): RegionAccumulator[] {
  let maximumLabel = -1
  for (const label of labels) maximumLabel = Math.max(maximumLabel, label)
  const regions: RegionAccumulator[] = Array.from({ length: maximumLabel + 1 }, () => ({
    area: 0,
    sumRed: 0,
    sumGreen: 0,
    sumBlue: 0,
    sumL: 0,
    sumA: 0,
    sumB: 0,
  }))
  for (let pixel = 0; pixel < labels.length; pixel++) {
    const region = regions[labels[pixel]]
    const offset = pixel * 4
    region.area += 1
    region.sumRed += rgba[offset]
    region.sumGreen += rgba[offset + 1]
    region.sumBlue += rgba[offset + 2]
    region.sumL += colors.lightness[pixel]
    region.sumA += colors.axisA[pixel]
    region.sumB += colors.axisB[pixel]
  }
  return regions
}

function pixelContrast(colors: PerceptualPixel, left: number, right: number): number {
  return Math.hypot(
    (colors.lightness[left] - colors.lightness[right]) * 100,
    (colors.axisA[left] - colors.axisA[right]) * 100,
    (colors.axisB[left] - colors.axisB[right]) * 100,
  )
}

function collectBoundaries(
  labels: Int32Array,
  width: number,
  height: number,
  colors: PerceptualPixel,
): Boundary[] {
  const boundaries = new Map<string, Boundary>()
  const add = (pixel: number, neighbor: number): void => {
    const first = labels[pixel]
    const second = labels[neighbor]
    if (first === second) return
    const left = Math.min(first, second)
    const right = Math.max(first, second)
    const key = `${left}:${right}`
    const boundary = boundaries.get(key) ?? {
      left,
      right,
      samples: 0,
      contrastSum: 0,
    }
    boundary.samples += 1
    boundary.contrastSum += pixelContrast(colors, pixel, neighbor)
    boundaries.set(key, boundary)
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x
      if (x + 1 < width) add(pixel, pixel + 1)
      if (y + 1 < height) add(pixel, pixel + width)
    }
  }
  return [...boundaries.values()]
}

function boundaryScore(
  boundary: Boundary,
  regions: DisjointRegions,
  edgeWeight: number,
): number {
  return regions.colorDistance(boundary.left, boundary.right) +
    boundary.contrastSum / boundary.samples * edgeWeight
}

function aggregateCurrentBoundaries(
  boundaries: Boundary[],
  regions: DisjointRegions,
): Boundary[] {
  const aggregated = new Map<string, Boundary>()
  for (const boundary of boundaries) {
    const first = regions.find(boundary.left)
    const second = regions.find(boundary.right)
    if (first === second) continue
    const left = Math.min(first, second)
    const right = Math.max(first, second)
    const key = `${left}:${right}`
    const current = aggregated.get(key) ?? {
      left,
      right,
      samples: 0,
      contrastSum: 0,
    }
    current.samples += boundary.samples
    current.contrastSum += boundary.contrastSum
    aggregated.set(key, current)
  }
  return [...aggregated.values()]
}

function mergeRegions(
  regions: RegionAccumulator[],
  boundaries: Boundary[],
  pixelCount: number,
  options: BrainSnicOptions,
): DisjointRegions {
  const joined = new DisjointRegions(regions)
  const ordered = [...boundaries].sort(
    (left, right) => boundaryScore(left, joined, options.edgeWeight) -
      boundaryScore(right, joined, options.edgeWeight),
  )

  // Passaggio percettivo: unisce soltanto regioni cromaticamente affini il cui
  // confine non contiene un bordo forte. Le medie vengono aggiornate dopo ogni
  // unione, quindi la decisione resta legata alla regione corrente.
  for (const boundary of ordered) {
    const left = joined.find(boundary.left)
    const right = joined.find(boundary.right)
    if (left === right) continue
    const meanBoundaryContrast = boundary.contrastSum / boundary.samples
    const colorDistance = joined.colorDistance(left, right)
    if (
      colorDistance <= options.mergeColorThreshold &&
      meanBoundaryContrast <= options.strongEdgeThreshold
    ) {
      joined.merge(left, right)
    }
  }

  const minimumArea = Math.max(4, pixelCount * options.minimumRegionAreaRatio)
  // Passaggio di pulizia: le isole piccole vengono assorbite dal vicino meno
  // distante, ma non attraversano un bordo eccezionalmente forte.
  for (let pass = 0; pass < 2; pass++) {
    const currentBoundaries = aggregateCurrentBoundaries(boundaries, joined).sort(
      (left, right) => boundaryScore(left, joined, options.edgeWeight) -
        boundaryScore(right, joined, options.edgeWeight),
    )
    for (const boundary of currentBoundaries) {
      const left = joined.find(boundary.left)
      const right = joined.find(boundary.right)
      if (left === right) continue
      const smaller = Math.min(joined.area[left], joined.area[right])
      const contrast = boundary.contrastSum / boundary.samples
      if (
        smaller < minimumArea &&
        contrast <= options.strongEdgeThreshold * 1.6 &&
        joined.colorDistance(left, right) <= options.mergeColorThreshold * 1.8
      ) {
        joined.merge(left, right)
      }
    }
  }

  // Budget deterministico: riduce le regioni meno importanti scegliendo sempre
  // il confine percettivamente più economico. Non aumenta mai segmenti o punti.
  for (let pass = 0; pass < 4 && joined.count > options.maximumRegions; pass++) {
    let changed = false
    const dynamic = aggregateCurrentBoundaries(boundaries, joined).sort(
      (left, right) => boundaryScore(left, joined, options.edgeWeight) -
        boundaryScore(right, joined, options.edgeWeight),
    )
    for (const boundary of dynamic) {
      if (joined.count <= options.maximumRegions) break
      const left = joined.find(boundary.left)
      const right = joined.find(boundary.right)
      if (left === right) continue
      const contrast = boundary.contrastSum / boundary.samples
      // Il budget non ha il diritto di cancellare una silhouette nettissima.
      // Se restano troppe regioni oltre questo limite, il controllo qualità può
      // usare il fallback senza degradare deliberatamente il contorno.
      if (contrast > options.strongEdgeThreshold * (1.2 + pass * 0.55)) continue
      joined.merge(left, right)
      changed = true
    }
    if (!changed) continue
  }
  return joined
}

function flattenRegions(
  rgba: Uint8Array,
  originalLabels: Int32Array,
  joined: DisjointRegions,
): { labels: Int32Array; regions: BrainSnicRegion[] } {
  const rootToLabel = new Map<number, number>()
  const labels = new Int32Array(originalLabels.length)
  const accumulators: RegionAccumulator[] = []
  for (let pixel = 0; pixel < originalLabels.length; pixel++) {
    const root = joined.find(originalLabels[pixel])
    let label = rootToLabel.get(root)
    if (label === undefined) {
      label = rootToLabel.size
      rootToLabel.set(root, label)
      accumulators.push({
        area: 0,
        sumRed: 0,
        sumGreen: 0,
        sumBlue: 0,
        sumL: 0,
        sumA: 0,
        sumB: 0,
      })
    }
    labels[pixel] = label
    const offset = pixel * 4
    const accumulator = accumulators[label]
    accumulator.area += 1
    accumulator.sumRed += rgba[offset]
    accumulator.sumGreen += rgba[offset + 1]
    accumulator.sumBlue += rgba[offset + 2]
  }
  const regions = accumulators.map((region, id) => ({
    id,
    area: region.area,
    red: region.sumRed / region.area,
    green: region.sumGreen / region.area,
    blue: region.sumBlue / region.area,
  }))
  return { labels, regions }
}

export function segmentBrainRasterWithSnic(
  rgba: Uint8Array,
  width: number,
  height: number,
  options: BrainSnicOptions,
): BrainSnicSegmentation {
  if (width <= 0 || height <= 0 || rgba.length !== width * height * 4) {
    throw new Error('Raster RGBA non valido per SNIC')
  }
  const colors = perceptualPixels(rgba)
  const initialLabels = initialSnic(width, height, colors, options)
  const initialRegions = accumulateRegions(rgba, initialLabels, colors)
  const boundaries = collectBoundaries(initialLabels, width, height, colors)
  const joined = mergeRegions(initialRegions, boundaries, width * height, options)
  const flattened = flattenRegions(rgba, initialLabels, joined)
  const boundarySamples = boundaries.reduce((sum, boundary) => sum + boundary.samples, 0)
  const boundaryContrast = boundarySamples > 0
    ? boundaries.reduce((sum, boundary) => sum + boundary.contrastSum, 0) / boundarySamples
    : 0
  let strongEdges = 0
  let retainedStrongEdges = 0
  const inspectEdge = (pixel: number, neighbor: number): void => {
    if (pixelContrast(colors, pixel, neighbor) < options.strongEdgeThreshold * 1.5) return
    strongEdges += 1
    if (flattened.labels[pixel] !== flattened.labels[neighbor]) {
      retainedStrongEdges += 1
      return
    }
    const nearby = [
      pixel - 1,
      pixel + 1,
      pixel - width,
      pixel + width,
      neighbor - 1,
      neighbor + 1,
      neighbor - width,
      neighbor + width,
    ]
    if (nearby.some((sample) =>
      sample >= 0 &&
      sample < flattened.labels.length &&
      flattened.labels[sample] !== flattened.labels[pixel]
    )) {
      retainedStrongEdges += 1
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x
      if (x + 1 < width) inspectEdge(pixel, pixel + 1)
      if (y + 1 < height) inspectEdge(pixel, pixel + width)
    }
  }
  return {
    ...flattened,
    initialRegionCount: initialRegions.length,
    boundaryContrast,
    strongEdgeRecall: strongEdges > 0 ? retainedStrongEdges / strongEdges : 1,
  }
}
