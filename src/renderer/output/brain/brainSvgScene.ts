import type { AppSettings, BandEnergies } from '@shared/types'
import type { DreamStory, PsychedelScene } from '@shared/brain/brainTypes'
import { brainLog } from './brainLog'
import type { BrainRhythmState } from './brainRhythm'

const SVG_NS = 'http://www.w3.org/2000/svg'
const MORPH_POINT_COUNT = 36

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value))
}

type Point = { x: number; y: number }

export type BrainMorphShape = {
  points: Point[]
  anchor: Point
  fill: [number, number, number]
  morphable: boolean
}

function parseColor(value: string | null): [number, number, number] {
  const color = value?.trim() ?? ''
  const hex = color.match(/^#([0-9a-f]{6})$/i)?.[1]
  if (hex) {
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
    ]
  }
  return [230, 230, 230]
}

function mixedColor(
  from: [number, number, number],
  to: [number, number, number],
  progress: number,
): string {
  const channels = from.map((value, index) =>
    Math.round(value + (to[index] - value) * progress),
  )
  return `rgb(${channels[0]} ${channels[1]} ${channels[2]})`
}

function mixedColorChannels(
  from: [number, number, number],
  to: [number, number, number],
  progress: number,
): [number, number, number] {
  return from.map((value, channel) =>
    Math.round(value + (to[channel] - value) * progress),
  ) as [number, number, number]
}

function smoothColorProgress(value: number): number {
  const progress = clamp(value)
  return progress * progress * (3 - 2 * progress)
}

function colorLuminance(color: [number, number, number]): number {
  return color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722
}

function pointsPath(points: Point[]): string {
  if (points.length === 0) return ''
  const commands = [`M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`]
  for (let index = 0; index < points.length; index++) {
    const previous = points[(index - 1 + points.length) % points.length]
    const current = points[index]
    const next = points[(index + 1) % points.length]
    const after = points[(index + 2) % points.length]
    const control1 = {
      x: current.x + (next.x - previous.x) / 6,
      y: current.y + (next.y - previous.y) / 6,
    }
    const control2 = {
      x: next.x - (after.x - current.x) / 6,
      y: next.y - (after.y - current.y) / 6,
    }
    commands.push(
      `C${control1.x.toFixed(2)} ${control1.y.toFixed(2)} ${control2.x.toFixed(2)} ${control2.y.toFixed(2)} ${next.x.toFixed(2)} ${next.y.toFixed(2)}`,
    )
  }
  return `${commands.join(' ')} Z`
}

function sampleShape(element: SVGGraphicsElement, fallback: Point): BrainMorphShape {
  const path = element.localName === 'path' ? (element as SVGPathElement) : null
  const moveCount = path?.getAttribute('d')?.match(/[Mm](?=[\s,.\d+-])/g)?.length ?? 0
  const morphable = path !== null && moveCount <= 1
  const points: Point[] = []
  if (path) {
    try {
      const length = path.getTotalLength()
      if (Number.isFinite(length) && length > 0) {
        for (let index = 0; index < MORPH_POINT_COUNT; index++) {
          const point = path.getPointAtLength((length * index) / MORPH_POINT_COUNT)
          points.push({ x: point.x, y: point.y })
        }
      }
    } catch {
      // Il fallback rettangolare mantiene il renderer operativo anche con path anomali.
    }
  }
  if (points.length === 0) {
    try {
      const box = element.getBBox()
      const perimeter = [
        { x: box.x, y: box.y },
        { x: box.x + box.width, y: box.y },
        { x: box.x + box.width, y: box.y + box.height },
        { x: box.x, y: box.y + box.height },
      ]
      for (let index = 0; index < MORPH_POINT_COUNT; index++) {
        points.push(perimeter[Math.floor((index / MORPH_POINT_COUNT) * perimeter.length)])
      }
    } catch {
      points.push(...Array.from({ length: MORPH_POINT_COUNT }, () => ({ ...fallback })))
    }
  }
  const anchor = points.reduce(
    (sum, point) => ({ x: sum.x + point.x / points.length, y: sum.y + point.y / points.length }),
    { x: 0, y: 0 },
  )
  return {
    points,
    anchor,
    fill: parseColor(element.getAttribute('fill')),
    morphable,
  }
}

function alignSourcePoints(source: Point[], target: Point[]): Point[] {
  if (source.length !== target.length || source.length === 0) return source
  let best: Point[] = source
  let bestDistance = Number.POSITIVE_INFINITY
  for (const candidate of [source, [...source].reverse()]) {
    for (let shift = 0; shift < candidate.length; shift++) {
      let distance = 0
      for (let index = 0; index < candidate.length; index += 4) {
        const point = candidate[(index + shift) % candidate.length]
        const targetPoint = target[index]
        distance += (point.x - targetPoint.x) ** 2 + (point.y - targetPoint.y) ** 2
      }
      if (distance < bestDistance) {
        bestDistance = distance
        best = candidate.map((_, index) => candidate[(index + shift) % candidate.length])
      }
    }
  }
  return best
}

function svgElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, tag)
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value))
  return element
}

export type BrainSvgController = {
  element: SVGSVGElement
  setOpacity: (opacity: number) => void
  getMorphShapes: () => BrainMorphShape[]
  setTransition: (
    progress: number,
    role: 'enter' | 'exit',
    counterpartShapes?: BrainMorphShape[],
  ) => void
  update: (
    bands: BandEnergies,
    settings: AppSettings,
    time: number,
    rhythm?: BrainRhythmState,
  ) => void
  destroy: () => void
}

export type BrainColorContext = {
  frameEnergy: number
  frameIndex: number
  frameCount: number
}

export function createBrainSvgScene(
  container: HTMLElement,
  scene: PsychedelScene,
  storyPalette?: DreamStory['palette'],
  colorContext: BrainColorContext = {
    frameEnergy: 0.5,
    frameIndex: 0,
    frameCount: 4,
  },
): BrainSvgController {
  const parsed = new DOMParser().parseFromString(scene.svg, 'image/svg+xml')
  const sourceRoot = parsed.documentElement
  const svg = svgElement('svg', {
    viewBox: sourceRoot.getAttribute('viewBox') ?? '0 0 1000 1000',
    preserveAspectRatio: 'xMidYMid meet',
    'aria-hidden': 'true',
  })
  Object.assign(svg.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    display: 'block',
    zIndex: '2',
    overflow: 'visible',
    pointerEvents: 'none',
    willChange: 'contents',
  })

  const content = svgElement('g')
  const animatedElements: SVGGraphicsElement[] = []
  const drawableSelector = 'path,circle,ellipse,line,polyline,polygon'
  Array.from(sourceRoot.querySelectorAll<SVGGraphicsElement>(drawableSelector)).forEach((sourceChild, index) => {
    const layer = svgElement('g')
    const imported = document.importNode(sourceChild, true)
    layer.appendChild(imported)
    content.appendChild(layer)
    imported.setAttribute('data-brain-phase', String(index * 0.83))
    imported.setAttribute('data-brain-base-transform', imported.getAttribute('transform') ?? '')
    animatedElements.push(imported)
  })
  svg.appendChild(content)
  container.appendChild(svg)
  brainLog('render', 'livello SVG montato', {
    frameId: scene.frameId,
    drawableElements: animatedElements.length,
    connected: svg.isConnected,
    viewBox: svg.getAttribute('viewBox'),
    palette: storyPalette,
  })
  let transitionProgress = 1
  let lastMorphProgress = 0
  let transitionCounterparts: BrainMorphShape[] = []
  let lastCounterparts: BrainMorphShape[] | undefined
  let lastGeometryAt = 0
  let lastAudioAt = 0
  const smoothedBands: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }
  const viewBox = (svg.getAttribute('viewBox') ?? '0 0 1000 1000').split(/\s+/).map(Number)
  const fallback = {
    x: (viewBox[0] ?? 0) + (viewBox[2] ?? 1000) / 2,
    y: (viewBox[1] ?? 0) + (viewBox[3] ?? 1000) / 2,
  }
  const targetShapes = animatedElements.map((element) => sampleShape(element, fallback))
  const usesFill = animatedElements.map((element) => element.getAttribute('fill') !== 'none')
  const usesStroke = animatedElements.map(
    (element) =>
      element.hasAttribute('stroke') &&
      element.getAttribute('stroke') !== 'none',
  )
  const palette = (storyPalette ?? [
    '#111827',
    '#d08c60',
    '#f3ead7',
    '#3ddc97',
    '#7457d9',
  ])
    .map((color) => parseColor(color))
    .sort((left, right) => colorLuminance(left) - colorLuminance(right))
  const paletteIndices = targetShapes.map((shape) =>
    Math.round((colorLuminance(shape.fill) / 255) * (palette.length - 1)),
  )
  targetShapes.forEach((shape, index) => {
    shape.fill = palette[paletteIndices[index]]
    const element = animatedElements[index]
    if (usesFill[index]) {
      element.setAttribute('fill', mixedColor(shape.fill, shape.fill, 0))
    }
    if (usesStroke[index]) {
      element.setAttribute('stroke', mixedColor(shape.fill, shape.fill, 0))
    }
  })
  const sceneDiagonal = Math.hypot(viewBox[2] ?? 1000, viewBox[3] ?? 1000)
  const matchCounterparts = (counterparts: BrainMorphShape[]) => {
    const available = new Set(
      counterparts
        .map((shape, index) => ({ shape, index }))
        .filter(({ shape }) => shape.morphable)
        .map(({ index }) => index),
    )
    return targetShapes.map((target) => {
      let nearest: BrainMorphShape | undefined
      let nearestIndex = -1
      let nearestDistance = Number.POSITIVE_INFINITY
      for (const candidateIndex of available) {
        const candidate = counterparts[candidateIndex]
        const distance =
          (candidate.anchor.x - target.anchor.x) ** 2 +
          (candidate.anchor.y - target.anchor.y) ** 2
        if (distance < nearestDistance) {
          nearest = candidate
          nearestIndex = candidateIndex
          nearestDistance = distance
        }
      }
      if (
        !target.morphable ||
        !nearest ||
        Math.sqrt(nearestDistance) > sceneDiagonal * 0.32
      ) {
        return {
          ...target,
          points: target.points.map(() => ({ ...target.anchor })),
        }
      }
      available.delete(nearestIndex)
      return {
        ...nearest,
        points: alignSourcePoints(nearest.points, target.points),
      }
    })
  }

  return {
    element: svg,
    setOpacity(opacity) {
      svg.style.opacity = String(clamp(opacity))
    },
    getMorphShapes: () => targetShapes,
    setTransition(progress, role, counterpartShapes = []) {
      const value = clamp(progress)
      transitionProgress = value
      if (role !== 'enter' || counterpartShapes.length === 0) return
      if (lastCounterparts !== counterpartShapes) {
        lastCounterparts = counterpartShapes
        transitionCounterparts = matchCounterparts(counterpartShapes)
        lastMorphProgress = 0
      }
    },
    update(bands, settings, time, rhythm) {
      const frameInterval = settings.lowPowerMode ? 50 : 33
      if (time - lastGeometryAt < frameInterval) return
      lastGeometryAt = time
      const profileScale = settings.motionProfile === 'techno' ? 1.18 : settings.motionProfile === 'ambient' ? 0.58 : 0.88
      const elapsed = lastAudioAt > 0 ? Math.min(120, time - lastAudioAt) : frameInterval
      lastAudioAt = time
      const fluidityMs =
        settings.motionProfile === 'ambient'
          ? 900
          : settings.motionProfile === 'techno'
            ? 560
            : 720
      const audioBlend = 1 - Math.exp(-elapsed / fluidityMs)
      for (const band of ['low', 'lowMid', 'mid', 'high'] as const) {
        smoothedBands[band] += (bands[band] - smoothedBands[band]) * audioBlend
      }
      const subAmount = clamp(settings.subMovement / 0.5, 0, 2)
      const pressure = clamp(smoothedBands.low * subAmount + smoothedBands.lowMid * 0.28)
      const articulation = clamp(smoothedBands.mid * 0.54 + smoothedBands.high * 0.32)
      const musicalPosition = rhythm
        ? rhythm.beatIndex + rhythm.beatPhase
        : time / 500
      const musicalPhase = musicalPosition * Math.PI * 2
      const beatPulse = rhythm?.beatPulse ?? 0
      const frameEnergy = clamp(colorContext.frameEnergy, 0.05, 1)
      const storyPosition =
        colorContext.frameCount > 1
          ? colorContext.frameIndex / (colorContext.frameCount - 1)
          : 0
      const beatsPerColor = 8 - frameEnergy * 3
      const colorJourney =
        musicalPosition / beatsPerColor +
        storyPosition * 1.4 +
        pressure * 0.3 +
        articulation * 0.16
      const colorStep = Math.floor(colorJourney)
      const colorBlend = smoothColorProgress(colorJourney - colorStep)
      lastMorphProgress = Math.max(
        lastMorphProgress,
        clamp(transitionProgress + pressure * 0.025 + articulation * 0.012),
      )
      animatedElements.forEach((element, index) => {
        const phase = Number(element.getAttribute('data-brain-phase') ?? index)
        const target = targetShapes[index]
        const source = transitionCounterparts[index] ?? target
        const progress = transitionCounterparts.length > 0 ? lastMorphProgress : 1
        if (element.localName === 'path' && target.morphable) {
          const highRipple = clamp(smoothedBands.high * 0.62 + smoothedBands.mid * 0.18)
          const amplitude =
            (1.25 + pressure * 4.8 + articulation * 3.1 + highRipple * 1.6) *
            (1 + beatPulse * 0.22) *
            profileScale
          const pattern = index % 4
          const flowX =
            Math.sin(musicalPhase * (0.125 + pattern * 0.018) + phase) *
            (0.8 + pressure * 3.6) *
            profileScale
          const flowY =
            Math.cos(musicalPhase * (0.1 + pattern * 0.015) + phase * 1.17) *
            (0.7 + articulation * 3.0) *
            profileScale
          const points = target.points.map((targetPoint, pointIndex) => {
            const sourcePoint = source.points[pointIndex] ?? targetPoint
            const baseX = sourcePoint.x + (targetPoint.x - sourcePoint.x) * progress
            const baseY = sourcePoint.y + (targetPoint.y - sourcePoint.y) * progress
            const radialX = targetPoint.x - target.anchor.x
            const radialY = targetPoint.y - target.anchor.y
            const radialLength = Math.max(1, Math.hypot(radialX, radialY))
            const normalX = radialX / radialLength
            const normalY = radialY / radialLength
            const tangentX = -normalY
            const tangentY = normalX
            const wave =
              musicalPhase * (0.16 + pressure * 0.045) +
              phase +
              pointIndex * (0.24 + highRipple * 0.08)
            let liquidX = 0
            let liquidY = 0
            if (pattern === 0) {
              const displacement = Math.sin(wave) * amplitude
              liquidX = normalX * displacement
              liquidY = normalY * displacement
            } else if (pattern === 1) {
              const displacement = Math.cos(wave * 0.86) * amplitude
              liquidX = tangentX * displacement
              liquidY = tangentY * displacement
            } else if (pattern === 2) {
              liquidX = Math.sin(wave * 1.21) * amplitude
              liquidY = Math.sin(wave * 0.73 + 1.4) * amplitude * 0.72
            } else {
              const pulse = Math.sin(
                wave + Math.sin(musicalPhase * 0.22 + phase) * (0.8 + beatPulse * 0.5),
              )
              liquidX = (normalX * 0.65 + tangentX * 0.35) * pulse * amplitude
              liquidY = (normalY * 0.65 + tangentY * 0.35) * pulse * amplitude
            }
            return {
              x: baseX + liquidX + flowX,
              y: baseY + liquidY + flowY,
            }
          })
          element.setAttribute('d', pointsPath(points))
        }
        const paletteIndex =
          (paletteIndices[index] + colorStep + index % 2) % palette.length
        const nextPaletteIndex = (paletteIndex + 1) % palette.length
        const animatedColor = mixedColorChannels(
          palette[paletteIndex],
          palette[nextPaletteIndex],
          colorBlend,
        )
        const renderedColor = mixedColor(
          source.fill,
          animatedColor,
          Math.max(progress, 0.42),
        )
        if (usesFill[index]) element.setAttribute('fill', renderedColor)
        if (usesStroke[index]) {
          element.setAttribute('stroke', renderedColor)
        }
      })
    },
    destroy() {
      svg.remove()
    },
  }
}
