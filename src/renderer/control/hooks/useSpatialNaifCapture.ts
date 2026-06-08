import { useCallback, useEffect, useRef, useState } from 'react'
import type { ImageSegmenter } from '@mediapipe/tasks-vision'
import type { SpatialNaifFrame, SpatialNaifLine, SpatialNaifPath, SpatialNaifPoint } from '@shared/types'

const ANALYSIS_WIDTH = 144
const ANALYSIS_HEIGHT = 108
const MIN_POINTS_FOR_FRAME = 14
const MAX_LINES = 96
const MAX_PATHS = 3
const MEDIAPIPE_WASM_BASE = './mediapipe/wasm'
const MEDIAPIPE_SEGMENTER_MODEL = './mediapipe/models/deeplabv3.tflite'

let mediaPipeSegmenterPromise: Promise<ImageSegmenter | null> | null = null

type SpatialComponent = {
  minX: number
  minY: number
  maxX: number
  maxY: number
  area: number
  sumX: number
  sumY: number
  pixels: number[]
}

type PixelSample = {
  r: number
  g: number
  b: number
  luma: number
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function line(x1: number, y1: number, x2: number, y2: number, weight = 0.55): SpatialNaifLine {
  return {
    x1: clamp01(x1),
    y1: clamp01(y1),
    x2: clamp01(x2),
    y2: clamp01(y2),
    weight: clamp01(weight),
  }
}

function pixelDistance(a: PixelSample, b: PixelSample): number {
  const colorDistance = Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b)
  return colorDistance * 0.78 + Math.abs(a.luma - b.luma) * 0.52
}

function sampleAt(samples: PixelSample[], x: number, y: number): PixelSample {
  return samples[y * ANALYSIS_WIDTH + x]
}

function simplifyPath(points: SpatialNaifPoint[], tolerance: number): SpatialNaifPoint[] {
  if (points.length <= 3) return points
  const first = points[0]
  const last = points[points.length - 1]
  const dx = last.x - first.x
  const dy = last.y - first.y
  const denom = Math.max(0.0001, Math.hypot(dx, dy))
  let maxDistance = 0
  let index = 0

  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i]
    const distance = Math.abs(dy * p.x - dx * p.y + last.x * first.y - last.y * first.x) / denom
    if (distance > maxDistance) {
      maxDistance = distance
      index = i
    }
  }

  if (maxDistance <= tolerance) return [first, last]
  return [
    ...simplifyPath(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplifyPath(points.slice(index), tolerance),
  ]
}

function smoothMask(mask: Uint8Array): Uint8Array {
  let current = mask
  for (let pass = 0; pass < 2; pass++) {
    const dilated = new Uint8Array(mask.length)
    const smoothed = new Uint8Array(mask.length)

    for (let y = 1; y < ANALYSIS_HEIGHT - 1; y++) {
      for (let x = 1; x < ANALYSIS_WIDTH - 1; x++) {
        const idx = y * ANALYSIS_WIDTH + x
        let count = 0
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            count += current[idx + oy * ANALYSIS_WIDTH + ox]
          }
        }
        dilated[idx] = count >= 2 ? 1 : 0
      }
    }

    for (let y = 1; y < ANALYSIS_HEIGHT - 1; y++) {
      for (let x = 1; x < ANALYSIS_WIDTH - 1; x++) {
        const idx = y * ANALYSIS_WIDTH + x
        let count = 0
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            count += dilated[idx + oy * ANALYSIS_WIDTH + ox]
          }
        }
        smoothed[idx] = count >= 5 ? 1 : 0
      }
    }
    current = smoothed
  }

  return current
}

function extractBoundary(mask: Uint8Array, component: SpatialComponent): SpatialNaifPoint[] {
  const points: SpatialNaifPoint[] = []
  const seen = new Uint8Array(mask.length)
  for (const idx of component.pixels) {
    const x = idx % ANALYSIS_WIDTH
    const y = Math.floor(idx / ANALYSIS_WIDTH)
    if (x <= 0 || y <= 0 || x >= ANALYSIS_WIDTH - 1 || y >= ANALYSIS_HEIGHT - 1) continue
    const boundary =
      !mask[idx - 1] ||
      !mask[idx + 1] ||
      !mask[idx - ANALYSIS_WIDTH] ||
      !mask[idx + ANALYSIS_WIDTH] ||
      !mask[idx - ANALYSIS_WIDTH - 1] ||
      !mask[idx - ANALYSIS_WIDTH + 1] ||
      !mask[idx + ANALYSIS_WIDTH - 1] ||
      !mask[idx + ANALYSIS_WIDTH + 1]
    if (!boundary || seen[idx]) continue
    seen[idx] = 1
    points.push({ x, y })
  }

  const cx = component.sumX / component.area
  const cy = component.sumY / component.area
  const remaining = new Set(points.map((p) => `${p.x},${p.y}`))
  const byKey = new Map(points.map((p) => [`${p.x},${p.y}`, p]))
  const start = points.reduce((best, p) => (p.y < best.y || (p.y === best.y && p.x < best.x) ? p : best), points[0])
  if (!start) return []

  const ordered: SpatialNaifPoint[] = []
  let current = start
  while (current && remaining.size > 0 && ordered.length < 340) {
    ordered.push(current)
    remaining.delete(`${current.x},${current.y}`)
    let next: SpatialNaifPoint | null = null
    let bestScore = Number.POSITIVE_INFINITY
    for (let oy = -2; oy <= 2; oy++) {
      for (let ox = -2; ox <= 2; ox++) {
        if (ox === 0 && oy === 0) continue
        const candidate = byKey.get(`${current.x + ox},${current.y + oy}`)
        if (!candidate || !remaining.has(`${candidate.x},${candidate.y}`)) continue
        const anglePenalty = Math.abs(Math.atan2(candidate.y - cy, candidate.x - cx) - Math.atan2(current.y - cy, current.x - cx)) * 0.12
        const score = Math.hypot(ox, oy) + anglePenalty
        if (score < bestScore) {
          bestScore = score
          next = candidate
        }
      }
    }
    if (!next) {
      let nearestDistance = Number.POSITIVE_INFINITY
      for (const key of remaining) {
        const candidate = byKey.get(key)
        if (!candidate) continue
        const distance = Math.hypot(candidate.x - current.x, candidate.y - current.y)
        if (distance < nearestDistance) {
          nearestDistance = distance
          next = candidate
        }
      }
      if (!next || nearestDistance > 8) break
    }
    current = next
  }

  if (ordered.length < 10) {
    return points.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx))
  }
  return ordered
}

function componentQuality(component: SpatialComponent, boundary: SpatialNaifPoint[], simplified: SpatialNaifPoint[]): number {
  const width = component.maxX - component.minX + 1
  const height = component.maxY - component.minY + 1
  const bboxArea = width * height
  const fillRatio = component.area / Math.max(1, bboxArea)
  const frameRatio = bboxArea / (ANALYSIS_WIDTH * ANALYSIS_HEIGHT)
  const boundaryRatio = boundary.length / Math.max(1, component.area)
  const aspect = Math.max(width, height) / Math.max(1, Math.min(width, height))
  const sizeScore = clamp01((component.area - 90) / 850)
  const fillScore = fillRatio > 0.10 && fillRatio < 0.90 ? 1 : 0.25
  const contourScore = boundary.length >= 24 && simplified.length >= 7 ? 1 : 0
  const complexityScore = simplified.length <= 34 ? 1 : clamp01(1 - (simplified.length - 34) / 28)
  const frameScore = frameRatio > 0.006 && frameRatio < 0.62 ? 1 : 0.18
  const boundaryScore = boundaryRatio > 0.035 && boundaryRatio < 0.75 ? 1 : 0.35
  const aspectScore = aspect < 9 ? 1 : 0.35
  return sizeScore * 0.22 + fillScore * 0.16 + contourScore * 0.22 + complexityScore * 0.14 + frameScore * 0.10 + boundaryScore * 0.10 + aspectScore * 0.06
}

function contourToLines(points: SpatialNaifPoint[], weight: number): SpatialNaifLine[] {
  const lines: SpatialNaifLine[] = []
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    lines.push(line(a.x / ANALYSIS_WIDTH, a.y / ANALYSIS_HEIGHT, b.x / ANALYSIS_WIDTH, b.y / ANALYSIS_HEIGHT, weight))
  }
  return lines
}

function buildBorderModel(samples: PixelSample[]): PixelSample {
  const border: PixelSample[] = []
  for (let x = 0; x < ANALYSIS_WIDTH; x++) {
    border.push(sampleAt(samples, x, 0), sampleAt(samples, x, ANALYSIS_HEIGHT - 1))
  }
  for (let y = 1; y < ANALYSIS_HEIGHT - 1; y++) {
    border.push(sampleAt(samples, 0, y), sampleAt(samples, ANALYSIS_WIDTH - 1, y))
  }
  const sorted = border.slice().sort((a, b) => a.luma - b.luma)
  const useful = sorted.slice(Math.floor(sorted.length * 0.12), Math.ceil(sorted.length * 0.88))
  const total = useful.reduce(
    (acc, item) => {
      acc.r += item.r
      acc.g += item.g
      acc.b += item.b
      acc.luma += item.luma
      return acc
    },
    { r: 0, g: 0, b: 0, luma: 0 },
  )
  const count = Math.max(1, useful.length)
  return { r: total.r / count, g: total.g / count, b: total.b / count, luma: total.luma / count }
}

async function getMediaPipeSegmenter(): Promise<ImageSegmenter | null> {
  if (!mediaPipeSegmenterPromise) {
    mediaPipeSegmenterPromise = import('@mediapipe/tasks-vision')
      .then(async ({ FilesetResolver, ImageSegmenter }) => {
        const wasmBase = new URL(MEDIAPIPE_WASM_BASE, window.location.href).toString()
        const modelPath = new URL(MEDIAPIPE_SEGMENTER_MODEL, window.location.href).toString()
        const vision = await FilesetResolver.forVisionTasks(wasmBase)
        return ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'GPU',
          },
          runningMode: 'IMAGE',
          outputCategoryMask: true,
          outputConfidenceMasks: false,
        })
      })
      .catch(() => null)
  }
  return mediaPipeSegmenterPromise
}

function resizeMaskToAnalysis(source: Uint8Array, width: number, height: number): Uint8Array {
  if (width === ANALYSIS_WIDTH && height === ANALYSIS_HEIGHT) return source
  const target = new Uint8Array(ANALYSIS_WIDTH * ANALYSIS_HEIGHT)
  for (let y = 0; y < ANALYSIS_HEIGHT; y++) {
    const sy = Math.min(height - 1, Math.floor((y / ANALYSIS_HEIGHT) * height))
    for (let x = 0; x < ANALYSIS_WIDTH; x++) {
      const sx = Math.min(width - 1, Math.floor((x / ANALYSIS_WIDTH) * width))
      target[y * ANALYSIS_WIDTH + x] = source[sy * width + sx]
    }
  }
  return target
}

function buildFrameFromBinaryMask(binary: Uint8Array, confidenceScale = 1): SpatialNaifFrame | null {
  const visited = new Uint8Array(binary.length)
  const queue: number[] = []
  const components: SpatialComponent[] = []

  for (let y = 1; y < ANALYSIS_HEIGHT - 1; y++) {
    for (let x = 1; x < ANALYSIS_WIDTH - 1; x++) {
      const start = y * ANALYSIS_WIDTH + x
      if (!binary[start] || visited[start]) continue
      visited[start] = 1
      queue.length = 0
      queue.push(start)
      let minX = x
      let maxX = x
      let minY = y
      let maxY = y
      let area = 0
      let sumX = 0
      let sumY = 0
      const pixels: number[] = []

      for (let qi = 0; qi < queue.length; qi++) {
        const idx = queue[qi]
        const px = idx % ANALYSIS_WIDTH
        const py = Math.floor(idx / ANALYSIS_WIDTH)
        area += 1
        sumX += px
        sumY += py
        pixels.push(idx)
        minX = Math.min(minX, px)
        maxX = Math.max(maxX, px)
        minY = Math.min(minY, py)
        maxY = Math.max(maxY, py)

        const neighbours = [idx - 1, idx + 1, idx - ANALYSIS_WIDTH, idx + ANALYSIS_WIDTH]
        for (const next of neighbours) {
          if (next < 0 || next >= binary.length || visited[next] || !binary[next]) continue
          visited[next] = 1
          queue.push(next)
        }
      }

      const width = maxX - minX + 1
      const height = maxY - minY + 1
      if (area >= 74 && width >= 8 && height >= 8) {
        components.push({ minX, minY, maxX, maxY, area, sumX, sumY, pixels })
      }
    }
  }

  const accepted = components
    .sort((a, b) => b.area - a.area)
    .slice(0, 8)
    .map((component) => {
      const boundary = extractBoundary(binary, component)
      const simplified = simplifyPath(boundary, 1.75).slice(0, 42)
      const quality = componentQuality(component, boundary, simplified)
      return { component, simplified, quality }
    })
    .filter(({ simplified, quality }) => quality >= 0.52 && simplified.length >= 7)
    .sort((a, b) => b.quality - a.quality)
    .slice(0, MAX_PATHS)

  const lines: SpatialNaifLine[] = []
  const paths: SpatialNaifPath[] = []
  for (const item of accepted) {
    const weight = clamp01(0.38 + item.quality * 0.62)
    paths.push({
      points: item.simplified.map((point) => ({ x: point.x / ANALYSIS_WIDTH, y: point.y / ANALYSIS_HEIGHT })),
      weight,
      closed: true,
    })
    const pathLines = contourToLines(item.simplified, weight)
    for (const pathLine of pathLines) {
      if (lines.length >= MAX_LINES) break
      lines.push(pathLine)
    }
  }

  const unique = lines
    .filter((item) => Math.hypot(item.x2 - item.x1, item.y2 - item.y1) > 0.045)
    .slice(0, MAX_LINES)
  const pointCount = paths.reduce((sum, path) => sum + path.points.length, 0)
  if (pointCount < MIN_POINTS_FOR_FRAME || unique.length < 4) return null

  return {
    capturedAt: Date.now(),
    width: ANALYSIS_WIDTH,
    height: ANALYSIS_HEIGHT,
    confidence: clamp01((pointCount / 42) * confidenceScale),
    lines: unique,
    paths,
  }
}

async function analyseSpatialNaifWithMediaPipe(canvas: HTMLCanvasElement): Promise<SpatialNaifFrame | null> {
  const segmenter = await getMediaPipeSegmenter()
  if (!segmenter) return null
  const result = segmenter.segment(canvas)
  const mask = result.categoryMask
  if (!mask) return null
  const categoryMask = mask.getAsUint8Array()
  const resized = resizeMaskToAnalysis(categoryMask, mask.width, mask.height)
  const binary = new Uint8Array(ANALYSIS_WIDTH * ANALYSIS_HEIGHT)
  let foregroundPixels = 0
  for (let i = 0; i < resized.length; i++) {
    if (resized[i] > 0) {
      binary[i] = 1
      foregroundPixels += 1
    }
  }
  const foregroundRatio = foregroundPixels / binary.length
  if (foregroundRatio < 0.006 || foregroundRatio > 0.78) return null
  return buildFrameFromBinaryMask(smoothMask(binary), 1.18)
}

function analyseSpatialNaifFrame(imageData: ImageData): SpatialNaifFrame | null {
  const { data } = imageData
  const samples: PixelSample[] = new Array(ANALYSIS_WIDTH * ANALYSIS_HEIGHT)
  const blurred = new Float32Array(ANALYSIS_WIDTH * ANALYSIS_HEIGHT)
  for (let y = 0; y < ANALYSIS_HEIGHT; y++) {
    for (let x = 0; x < ANALYSIS_WIDTH; x++) {
      const i = (y * ANALYSIS_WIDTH + x) * 4
      samples[y * ANALYSIS_WIDTH + x] = {
        r: data[i],
        g: data[i + 1],
        b: data[i + 2],
        luma: data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114,
      }
    }
  }
  const borderModel = buildBorderModel(samples)

  let luminanceSum = 0
  let luminanceSq = 0
  for (let y = 1; y < ANALYSIS_HEIGHT - 1; y++) {
    for (let x = 1; x < ANALYSIS_WIDTH - 1; x++) {
      const idx = y * ANALYSIS_WIDTH + x
      let acc = 0
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          acc += samples[idx + oy * ANALYSIS_WIDTH + ox].luma
        }
      }
      const value = acc / 9
      blurred[idx] = value
      luminanceSum += value
      luminanceSq += value * value
    }
  }
  const luminanceSamples = Math.max(1, (ANALYSIS_WIDTH - 2) * (ANALYSIS_HEIGHT - 2))
  const luminanceMean = luminanceSum / luminanceSamples
  const luminanceVariance = luminanceSq / luminanceSamples - luminanceMean * luminanceMean
  const luminanceDeviation = Math.sqrt(Math.max(0, luminanceVariance))
  if (luminanceDeviation < 6) return null

  const gradients = new Float32Array(ANALYSIS_WIDTH * ANALYSIS_HEIGHT)
  let sum = 0
  let sumSq = 0
  let gradientSamples = 0
  for (let y = 1; y < ANALYSIS_HEIGHT - 1; y++) {
    for (let x = 1; x < ANALYSIS_WIDTH - 1; x++) {
      const idx = y * ANALYSIS_WIDTH + x
      const gx =
        -blurred[idx - ANALYSIS_WIDTH - 1] -
        blurred[idx - 1] * 2 -
        blurred[idx + ANALYSIS_WIDTH - 1] +
        blurred[idx - ANALYSIS_WIDTH + 1] +
        blurred[idx + 1] * 2 +
        blurred[idx + ANALYSIS_WIDTH + 1]
      const gy =
        -blurred[idx - ANALYSIS_WIDTH - 1] -
        blurred[idx - ANALYSIS_WIDTH] * 2 -
        blurred[idx - ANALYSIS_WIDTH + 1] +
        blurred[idx + ANALYSIS_WIDTH - 1] +
        blurred[idx + ANALYSIS_WIDTH] * 2 +
        blurred[idx + ANALYSIS_WIDTH + 1]
      const mag = Math.hypot(gx, gy)
      gradients[idx] = mag
      sum += mag
      sumSq += mag * mag
      gradientSamples += 1
    }
  }

  const mean = sum / Math.max(1, gradientSamples)
  const variance = sumSq / Math.max(1, gradientSamples) - mean * mean
  const threshold = Math.max(24, mean + Math.sqrt(Math.max(0, variance)) * 0.88)
  const rawMask = new Uint8Array(ANALYSIS_WIDTH * ANALYSIS_HEIGHT)
  for (let y = 1; y < ANALYSIS_HEIGHT - 1; y++) {
    for (let x = 1; x < ANALYSIS_WIDTH - 1; x++) {
      const idx = y * ANALYSIS_WIDTH + x
      const contrast = Math.abs(blurred[idx] - luminanceMean)
      const backgroundDistance = pixelDistance(sampleAt(samples, x, y), borderModel)
      const usable = blurred[idx] > 10 && blurred[idx] < 248
      const foreground = backgroundDistance > Math.max(22, luminanceDeviation * 1.38)
      const structural = gradients[idx] > threshold && contrast > luminanceDeviation * 0.34
      rawMask[idx] = usable && (foreground || structural) ? 1 : 0
    }
  }
  const binary = smoothMask(rawMask)
  return buildFrameFromBinaryMask(binary, 0.82)
}

export function useSpatialNaifCapture(enabled: boolean, intervalMs: number) {
  const [frame, setFrame] = useState<SpatialNaifFrame | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const captureRef = useRef<(() => Promise<boolean>) | null>(null)

  useEffect(() => {
    if (!enabled) {
      setFrame(null)
      setError(null)
      setReady(false)
      captureRef.current = null
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      return
    }

    let cancelled = false
    let captureBusy = false
    let timer = 0
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    canvas.width = ANALYSIS_WIDTH
    canvas.height = ANALYSIS_HEIGHT
    const ctx = canvas.getContext('2d')

    const capture = async () => {
      if (captureBusy) return false
      if (cancelled || !ctx || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return false
      captureBusy = true
      try {
        ctx.drawImage(video, 0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT)
        const next =
          (await analyseSpatialNaifWithMediaPipe(canvas)) ??
          analyseSpatialNaifFrame(ctx.getImageData(0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT))
        if (!cancelled) setFrame(next)
        return true
      } finally {
        captureBusy = false
      }
    }
    captureRef.current = capture

    void navigator.mediaDevices
      .getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 360 },
          frameRate: { ideal: 5, max: 10 },
        },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        video.srcObject = stream
        video.muted = true
        video.playsInline = true
        return video.play()
      })
      .then(() => {
        if (cancelled) return
        setError(null)
        setReady(true)
        window.setTimeout(() => void capture(), 600)
        const normalizedInterval = intervalMs === 90_000 ? 90_000 : intervalMs === 30_000 ? 30_000 : 10_000
        timer = window.setInterval(() => void capture(), normalizedInterval)
      })
      .catch(() => {
        if (!cancelled) {
          setReady(false)
          captureRef.current = null
          setError('Permesso fotocamera negato o fotocamera non disponibile')
        }
      })

    return () => {
      cancelled = true
      if (timer) window.clearInterval(timer)
      setReady(false)
      captureRef.current = null
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      video.srcObject = null
    }
  }, [enabled, intervalMs])

  const captureNow = useCallback(async () => (await captureRef.current?.()) === true, [])

  return { frame, error, ready, captureNow }
}
