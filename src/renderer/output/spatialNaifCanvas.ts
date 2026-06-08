import type { SpatialNaifFrame, SpatialNaifLine, SpatialNaifPath, SpatialNaifPoint, VisualStatePayload } from '@shared/types'

type RGBColor = {
  r: number
  g: number
  b: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function hexToRgb(hex: string): RGBColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return { r: 255, g: 255, b: 255 }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  }
}

function rgba(color: RGBColor, alpha: number): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${clamp(alpha, 0, 1)})`
}

function mixLine(a: SpatialNaifLine, b: SpatialNaifLine, t: number): SpatialNaifLine {
  return {
    x1: a.x1 + (b.x1 - a.x1) * t,
    y1: a.y1 + (b.y1 - a.y1) * t,
    x2: a.x2 + (b.x2 - a.x2) * t,
    y2: a.y2 + (b.y2 - a.y2) * t,
    weight: a.weight + (b.weight - a.weight) * t,
  }
}

function emptyLine(): SpatialNaifLine {
  return { x1: 0.5, y1: 0.5, x2: 0.5, y2: 0.5, weight: 0 }
}

function mixPoint(a: SpatialNaifPoint, b: SpatialNaifPoint, t: number): SpatialNaifPoint {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  }
}

function emptyPath(): SpatialNaifPath {
  return {
    points: [
      { x: 0.5, y: 0.5 },
      { x: 0.5, y: 0.5 },
      { x: 0.5, y: 0.5 },
    ],
    weight: 0,
    closed: true,
  }
}

function resamplePath(path: SpatialNaifPath, count: number): SpatialNaifPath {
  if (path.points.length === count) return path
  if (path.points.length === 0) return emptyPath()
  const source = path.closed ? [...path.points, path.points[0]] : path.points
  const distances = [0]
  for (let i = 1; i < source.length; i++) {
    const prev = source[i - 1]
    const current = source[i]
    distances.push(distances[i - 1] + Math.hypot(current.x - prev.x, current.y - prev.y))
  }
  const total = distances[distances.length - 1] || 1
  const points: SpatialNaifPoint[] = []
  for (let i = 0; i < count; i++) {
    const target = (i / Math.max(1, count)) * total
    let segment = 1
    while (segment < distances.length - 1 && distances[segment] < target) segment += 1
    const a = source[segment - 1]
    const b = source[segment]
    const local = (target - distances[segment - 1]) / Math.max(0.0001, distances[segment] - distances[segment - 1])
    points.push(mixPoint(a, b, local))
  }
  return { ...path, points }
}

function mixPath(a: SpatialNaifPath, b: SpatialNaifPath, t: number): SpatialNaifPath {
  const count = Math.max(3, a.points.length, b.points.length)
  const from = resamplePath(a, count)
  const to = resamplePath(b, count)
  return {
    points: from.points.map((point, index) => mixPoint(point, to.points[index] ?? to.points[to.points.length - 1], t)),
    weight: from.weight + (to.weight - from.weight) * t,
    closed: to.closed,
  }
}

function smootherstep(value: number): number {
  const x = clamp(value, 0, 1)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

export function createSpatialNaifCanvas(container: HTMLElement) {
  const canvas = document.createElement('canvas')
  canvas.className = 'spatial-naif-layer'
  canvas.style.position = 'absolute'
  canvas.style.inset = '0'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.pointerEvents = 'none'
  canvas.style.background = 'transparent'
  canvas.style.mixBlendMode = 'screen'
  canvas.style.zIndex = '3'
  container.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  let rafId = 0
  let active = false
  let currentFrame: SpatialNaifFrame | null = null
  let previousLines: SpatialNaifLine[] = []
  let targetLines: SpatialNaifLine[] = []
  let previousPaths: SpatialNaifPath[] = []
  let targetPaths: SpatialNaifPath[] = []
  let transitionStart = performance.now()
  let lastFrameId = 0
  let settings: VisualStatePayload['settings'] | null = null
  let bands = { low: 0, lowMid: 0, mid: 0, high: 0 }
  let lastRenderAt = 0

  const resize = () => {
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight
  }

  const render = (now: number) => {
    if (!ctx) {
      rafId = requestAnimationFrame(render)
      return
    }

    const targetFrameMs = settings?.lowPowerMode === true ? 1000 / 24 : 1000 / 45
    if (now - lastRenderAt < targetFrameMs) {
      rafId = requestAnimationFrame(render)
      return
    }
    lastRenderAt = now

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!active || !currentFrame || targetLines.length === 0 || !settings) {
      rafId = requestAnimationFrame(render)
      return
    }

    const progress = smootherstep((now - transitionStart) / 4200)
    const lineCount = Math.max(previousLines.length, targetLines.length)
    const pathCount = Math.max(previousPaths.length, targetPaths.length)
    const base = hexToRgb(settings.basePinkColor)
    const hot = hexToRgb(settings.hotPinkColor)
    const pulse = 0.5 + Math.sin(now * 0.0012 + bands.low * 2) * 0.5
    const scale = 1 + bands.low * 0.06 + bands.lowMid * 0.04

    ctx.save()
    ctx.translate(canvas.width * 0.5, canvas.height * 0.5)
    ctx.scale(scale, scale)
    ctx.translate(-canvas.width * 0.5, -canvas.height * 0.5)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.shadowBlur = 12 + pulse * 12
    ctx.shadowColor = rgba(hot, 0.35)
    ctx.globalCompositeOperation = 'screen'

    for (let i = 0; i < pathCount; i++) {
      const from = previousPaths[i] ?? previousPaths[previousPaths.length - 1] ?? emptyPath()
      const to = targetPaths[i] ?? targetPaths[targetPaths.length - 1] ?? emptyPath()
      const item = mixPath(from, to, progress)
      const alpha = clamp(0.18 + item.weight * 0.42 + bands.mid * 0.10, 0.12, 0.68)
      ctx.strokeStyle = rgba(i % 2 === 0 ? hot : base, alpha)
      ctx.fillStyle = rgba(base, alpha * 0.08)
      ctx.lineWidth = clamp(2 + item.weight * 6 + bands.low * 2, 1.5, 8.5)
      ctx.beginPath()
      item.points.forEach((point, index) => {
        const x = point.x * canvas.width
        const y = point.y * canvas.height
        if (index === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      if (item.closed) ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }

    if (pathCount === 0) for (let i = 0; i < lineCount; i++) {
      const from = previousLines[i] ?? previousLines[previousLines.length - 1] ?? emptyLine()
      const to = targetLines[i] ?? targetLines[targetLines.length - 1] ?? emptyLine()
      const item = mixLine(from, to, progress)
      const x1 = item.x1 * canvas.width
      const y1 = item.y1 * canvas.height
      const x2 = item.x2 * canvas.width
      const y2 = item.y2 * canvas.height
      const alpha = clamp(0.16 + item.weight * 0.46 + bands.mid * 0.10, 0.12, 0.72)
      ctx.strokeStyle = rgba(i % 3 === 0 ? base : hot, alpha)
      ctx.lineWidth = clamp(1.8 + item.weight * 5 + bands.low * 2, 1.5, 8)
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }

    ctx.restore()
    rafId = requestAnimationFrame(render)
  }

  window.addEventListener('resize', resize)
  resize()
  rafId = requestAnimationFrame(render)

  return {
    updateState(payload: VisualStatePayload) {
      settings = payload.settings ?? settings
      if (payload.bandEnergies) bands = payload.bandEnergies
      active = payload.spatialNaifActive === true
      const frame = payload.spatialNaifFrame ?? null
      if (frame && frame.capturedAt !== lastFrameId && frame.lines.length > 0) {
        previousLines = targetLines.length > 0 ? targetLines : frame.lines.map(emptyLine)
        targetLines = frame.lines
        previousPaths = targetPaths.length > 0 ? targetPaths : (frame.paths ?? []).map(emptyPath)
        targetPaths = frame.paths ?? []
        currentFrame = frame
        lastFrameId = frame.capturedAt
        transitionStart = performance.now()
      }
    },
    destroy() {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      canvas.remove()
    },
  }
}
