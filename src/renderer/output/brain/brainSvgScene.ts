import type { AppSettings, BandEnergies } from '@shared/types'
import type { DreamStory, PsychedelScene } from '@shared/brain/brainTypes'
import { brainLog } from './brainLog'
import type { BrainRhythmState } from './brainRhythm'
import {
  BRAIN_FRAME_MORPH_PATTERNS,
  brainPresetMotionTuning,
  calculateBrainCameraMotion,
  calculateBrainDepthMotion,
  calculateBrainMicroMotion,
  calculateBrainMotionFrameInterval,
  createBrainDepthProfile,
  type BrainFrameMorphPattern,
} from './brainFrameMotion'
import { getBrainRenderingConfig } from './brainRenderingConfig'
import { BrainPerceptionEngine } from './brainPerception'

const SVG_NS = 'http://www.w3.org/2000/svg'
const MORPH_POINT_COUNT = 24
export const BRAIN_MAX_MORPH_GEOMETRIES = 32
export const BRAIN_MAX_DEPTH_LAYERS = 48

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value))
}

type Point = { x: number; y: number }

export function selectBrainGeometryCandidateIndices(
  pathComplexities: readonly number[],
  maximum = BRAIN_MAX_MORPH_GEOMETRIES,
): number[] {
  return pathComplexities
    .map((complexity, index) => ({ complexity, index }))
    .filter(({ complexity }) => complexity > 0)
    .sort((left, right) => right.complexity - left.complexity)
    .slice(0, Math.max(0, maximum))
    .map(({ index }) => index)
}

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

function hashString(value: string): number {
  let hash = 2_166_136_261
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }
  return hash >>> 0
}

function pointsPath(points: Point[]): string {
  if (points.length === 0) return ''
  const commands = [`M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`]
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
      `C${control1.x.toFixed(1)} ${control1.y.toFixed(1)} ${control2.x.toFixed(1)} ${control2.y.toFixed(1)} ${next.x.toFixed(1)} ${next.y.toFixed(1)}`,
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

function staticShape(
  element: SVGGraphicsElement,
  fallback: Point,
): BrainMorphShape {
  const firstPoint = element
    .getAttribute('d')
    ?.match(/[Mm]\s*(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)/)
  const anchor = firstPoint
    ? { x: Number(firstPoint[1]), y: Number(firstPoint[2]) }
    : fallback
  return {
    points: Array.from({ length: MORPH_POINT_COUNT }, () => ({ ...anchor })),
    anchor,
    fill: parseColor(element.getAttribute('fill')),
    morphable: false,
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
  setMorphPattern: (pattern: BrainFrameMorphPattern) => void
  setResourcePressure: (active: boolean) => void
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
    movingAverages?: BandEnergies,
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
  const renderingConfig = getBrainRenderingConfig()
  const parsed = new DOMParser().parseFromString(scene.svg, 'image/svg+xml')
  const sourceRoot = parsed.documentElement
  const svg = svgElement('svg', {
    viewBox: sourceRoot.getAttribute('viewBox') ?? '0 0 1000 1000',
    preserveAspectRatio: renderingConfig.composition.preserveAspectRatio,
    'aria-hidden': 'true',
  })
  Object.assign(svg.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    display: 'block',
    zIndex: '2',
    overflow: 'hidden',
    pointerEvents: 'none',
    transformOrigin: 'center',
    willChange: 'transform',
    contain: 'layout style paint',
    transform: `scaleX(${renderingConfig.composition.horizontalStretch}) scaleY(${renderingConfig.composition.verticalStretch})`,
    // Anche un blur minimo crea una texture fullscreen aggiuntiva e compete
    // con l'UNet WebGPU per la memoria delle tile.
    filter: 'none',
  })

  const content = svgElement('g')
  const contentId = `brain-scene-${hashString(`${scene.frameId}:${scene.svg.length}`)}`
  content.setAttribute('id', contentId)
  const animatedElements: SVGGraphicsElement[] = []
  const animatedLayers: SVGGElement[] = []
  const drawableSelector = 'path,circle,ellipse,line,polyline,polygon'
  Array.from(sourceRoot.querySelectorAll<SVGGraphicsElement>(drawableSelector)).forEach((sourceChild, index) => {
    const layer = svgElement('g')
    const imported = document.importNode(sourceChild, true)
    layer.appendChild(imported)
    content.appendChild(layer)
    imported.setAttribute('data-brain-phase', String(index * 0.83))
    imported.setAttribute('data-brain-base-transform', imported.getAttribute('transform') ?? '')
    animatedElements.push(imported)
    animatedLayers.push(layer)
  })
  const echoLayers = Array.from(
    { length: renderingConfig.transformation.maxEchoLayers },
    (_, index) => {
      const echo = svgElement('use', {
        href: `#${contentId}`,
        'data-brain-echo': index + 1,
      })
      Object.assign(echo.style, {
        opacity: '0',
        pointerEvents: 'none',
        mixBlendMode: index === 1 ? 'screen' : 'soft-light',
        transformOrigin: 'center',
      })
      return echo
    },
  )
  svg.append(...echoLayers, content)
  container.appendChild(svg)
  brainLog('render', 'livello SVG montato', {
    frameId: scene.frameId,
    drawableElements: animatedElements.length,
    connected: svg.isConnected,
    viewBox: svg.getAttribute('viewBox'),
    palette: storyPalette,
  })
  let transitionProgress = 1
  let morphPattern: BrainFrameMorphPattern = 'marea'
  let lastMorphProgress = 0
  let transitionCounterparts: BrainMorphShape[] = []
  let lastCounterparts: BrainMorphShape[] | undefined
  let lastGeometryAt = 0
  let lastColorAt = 0
  let lastAudioAt = 0
  let lastMusicalPosition = 0
  let colorJourneyState =
    colorContext.frameCount > 1
      ? (colorContext.frameIndex / (colorContext.frameCount - 1)) * 1.4
      : 0
  let smoothedBeatPulse = 0
  const smoothedEchoOpacities = echoLayers.map(() => 0)
  let resourcePressure = false
  const perception = new BrainPerceptionEngine()
  const smoothedBands: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }
  const viewBox = (svg.getAttribute('viewBox') ?? '0 0 1000 1000').split(/\s+/).map(Number)
  const fallback = {
    x: (viewBox[0] ?? 0) + (viewBox[2] ?? 1000) / 2,
    y: (viewBox[1] ?? 0) + (viewBox[3] ?? 1000) / 2,
  }
  const geometryCandidateIndices = selectBrainGeometryCandidateIndices(
    animatedElements.map((element) => {
      if (element.localName !== 'path') return -1
      const pathData = element.getAttribute('d') ?? ''
      const moveCount = pathData.match(/[Mm](?=[\s,.\d+-])/g)?.length ?? 0
      return moveCount <= 1 ? pathData.length : -1
    }),
  )
  const geometryCandidateSet = new Set(geometryCandidateIndices)
  const geometryCandidateRank = new Map(
    geometryCandidateIndices.map((elementIndex, rank) => [elementIndex, rank]),
  )
  const ultraHeavyScene = scene.svg.length >= 130_000 || animatedElements.length >= 30
  const heavyScene = ultraHeavyScene || scene.svg.length >= 65_000 || animatedElements.length >= 18
  const mediumScene = heavyScene || scene.svg.length >= 35_000 || animatedElements.length >= 10
  const normalDepthLayerCount = Math.min(
    heavyScene ? 16 : mediumScene ? 28 : BRAIN_MAX_DEPTH_LAYERS,
    animatedLayers.length,
  )
  const lowPowerDepthLayerCount = Math.min(12, animatedLayers.length)
  const normalGeometryLayerCount = Math.min(
    heavyScene ? 10 : mediumScene ? 18 : BRAIN_MAX_MORPH_GEOMETRIES,
    geometryCandidateIndices.length,
  )
  const lowPowerGeometryLayerCount = Math.min(
    8,
    geometryCandidateIndices.length,
  )
  const buildActiveIndices = (
    depthLayerCount: number,
    geometryLayerCount: number,
  ): number[] => {
    const indices = new Set<number>()
    for (let index = 0; index < depthLayerCount; index++) indices.add(index)
    for (let rank = 0; rank < geometryLayerCount; rank++) {
      const index = geometryCandidateIndices[rank]
      if (index !== undefined) indices.add(index)
    }
    return [...indices]
  }
  const normalActiveIndices = buildActiveIndices(
    normalDepthLayerCount,
    normalGeometryLayerCount,
  )
  const normalActiveIndexSet = new Set(normalActiveIndices)
  const lowPowerActiveIndices = buildActiveIndices(
    lowPowerDepthLayerCount,
    lowPowerGeometryLayerCount,
  )
  const pressureDepthLayerCount = Math.min(8, normalDepthLayerCount)
  const pressureGeometryLayerCount = Math.min(6, normalGeometryLayerCount)
  const pressureActiveIndices = buildActiveIndices(
    pressureDepthLayerCount,
    pressureGeometryLayerCount,
  )
  const targetShapes = animatedElements.map((element, index) =>
    geometryCandidateSet.has(index)
      ? sampleShape(element, fallback)
      : staticShape(element, fallback),
  )
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
  const smoothedActivePalette = palette.map(
    (color) => [...color] as [number, number, number],
  )
  const paletteIndices = targetShapes.map((shape) =>
    Math.round((colorLuminance(shape.fill) / 255) * (palette.length - 1)),
  )
  const sceneSeed = hashString(
    `${scene.frameId}:${sourceRoot.getAttribute('viewBox') ?? ''}:${animatedElements.length}`,
  )
  const depthProfiles = animatedElements.map((_, index) =>
    createBrainDepthProfile(index, animatedElements.length, sceneSeed),
  )
  const elementPhases = animatedElements.map((element, index) =>
    Number(element.getAttribute('data-brain-phase') ?? index),
  )
  // I tracciati che restano fuori dal budget di trasformazione non devono
  // sembrare congelati. Affidiamo loro una deriva SMIL lentissima: è nativa
  // nel compositing SVG, quindi non aggiunge calcoli per punto nel RAF.
  // Gli elementi inclusi nel budget normale restano invece controllati dal
  // renderer, senza due trasformazioni sovrapposte.
  animatedLayers.forEach((layer, index) => {
    if (normalActiveIndexSet.has(index)) return
    const phase = (elementPhases[index] ?? index) * 0.73
    const strength = Math.max(0.08, renderingConfig.motion.microMovement) *
      (0.34 + ((hashString(`${sceneSeed}:${index}`) % 100) / 100) * 0.38)
    const driftX = Math.cos(phase) * strength
    const driftY = Math.sin(phase * 1.17) * strength * 0.78
    const drift = svgElement('animateTransform', {
      attributeName: 'transform',
      type: 'translate',
      values: `0 0; ${driftX.toFixed(2)} ${driftY.toFixed(2)}; 0 0`,
      keyTimes: '0;0.5;1',
      keySplines: '0.42 0 0.58 1;0.42 0 0.58 1',
      calcMode: 'spline',
      dur: `${(7.5 + (hashString(`${scene.frameId}:${index}`) % 45) / 10).toFixed(1)}s`,
      begin: `${(-((hashString(`${scene.frameId}:offset:${index}`) % 70) / 10)).toFixed(1)}s`,
      repeatCount: 'indefinite',
      additive: 'sum',
      'data-brain-dormant-micro-motion': 'true',
    })
    layer.appendChild(drift)
  })
  let staticMicroMotionCount = 0
  targetShapes.forEach((target, index) => {
    // I path composti non vengono ricampionati perché unire sottotracciati
    // distinti produrrebbe i grandi poligoni già osservati. Ricevono però
    // una deriva locale indipendente dal movimento di profondità del layer:
    // così le zone interne della figura non restano otticamente incollate.
    if (!normalActiveIndexSet.has(index) || target.morphable) return
    const element = animatedElements[index]
    const phase = (elementPhases[index] ?? index) * 0.61
    const strength =
      Math.max(0.08, renderingConfig.motion.microMovement) *
      (0.3 + ((hashString(`${sceneSeed}:static:${index}`) % 100) / 100) * 0.34)
    const driftX = Math.cos(phase) * strength
    const driftY = Math.sin(phase * 1.23) * strength * 0.72
    const drift = svgElement('animateTransform', {
      attributeName: 'transform',
      type: 'translate',
      values: [
        '0 0',
        `${driftX.toFixed(2)} ${driftY.toFixed(2)}`,
        `${(-driftX * 0.38).toFixed(2)} ${(-driftY * 0.52).toFixed(2)}`,
        '0 0',
      ].join('; '),
      keyTimes: '0;0.38;0.76;1',
      keySplines:
        '0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1',
      calcMode: 'spline',
      dur: `${(8.4 + (hashString(`${scene.frameId}:static:${index}`) % 48) / 10).toFixed(1)}s`,
      begin: `${(-((hashString(`${scene.frameId}:static-offset:${index}`) % 80) / 10)).toFixed(1)}s`,
      repeatCount: 'indefinite',
      additive: 'sum',
      'data-brain-static-micro-motion': 'true',
    })
    element.appendChild(drift)
    staticMicroMotionCount += 1
  })
  svg.setAttribute(
    'data-brain-static-micro-motion-count',
    String(staticMicroMotionCount),
  )
  depthProfiles.forEach((profile, index) => {
    animatedLayers[index].setAttribute(
      'data-brain-depth',
      profile.depth.toFixed(3),
    )
  })
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
  svg.style.backgroundColor = mixedColor(
    palette[0],
    palette[Math.min(1, palette.length - 1)],
    0.18,
  )
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
    setMorphPattern(pattern) {
      morphPattern = pattern
    },
    setResourcePressure(active) {
      if (resourcePressure === active) return
      resourcePressure = active
      svg.setAttribute('data-brain-resource-pressure', active ? 'true' : 'false')
      const animationSurface = svg as SVGSVGElement & {
        pauseAnimations?: () => void
        unpauseAnimations?: () => void
      }
      if (active) animationSurface.pauseAnimations?.()
      else animationSurface.unpauseAnimations?.()
      echoLayers.forEach((echo, index) => {
        echo.style.display = active ? 'none' : 'block'
        echo.style.opacity = active ? '0' : echo.style.opacity
        echo.style.mixBlendMode =
          index === 1 ? 'screen' : 'soft-light'
      })
    },
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
    update(bands, settings, time, rhythm, movingAverages) {
      const frameInterval = resourcePressure
        ? 1_000 / 24
        : calculateBrainMotionFrameInterval(
            settings.lowPowerMode,
            scene.svg.length,
          )
      if (time - lastGeometryAt < frameInterval) return
      lastGeometryAt = time
      const colorInterval = settings.lowPowerMode ? 66 : 33
      const colorDue = time - lastColorAt >= colorInterval
      const colorElapsed =
        lastColorAt > 0 ? Math.min(240, time - lastColorAt) : colorInterval
      if (colorDue) lastColorAt = time
      const presetTuning = brainPresetMotionTuning(settings)
      const elapsed = lastAudioAt > 0 ? Math.min(120, time - lastAudioAt) : frameInterval
      lastAudioAt = time
      const fluidityMs = presetTuning.fluidityMs
      const audioBlend = 1 - Math.exp(-elapsed / fluidityMs)
      for (const band of ['low', 'lowMid', 'mid', 'high'] as const) {
        smoothedBands[band] += (bands[band] - smoothedBands[band]) * audioBlend
      }
      const transformationConfig = renderingConfig.transformation
      const perceptual = perception.update(
        bands,
        rhythm,
        elapsed,
        transformationConfig,
        movingAverages,
      )
      svg.setAttribute('data-brain-complexity', perceptual.complexity.toFixed(3))
      svg.setAttribute('data-brain-disorder', perceptual.disorder.toFixed(3))
      svg.setAttribute(
        'data-brain-metamorphosis',
        perceptual.metamorphosis.toFixed(3),
      )
      const pulseBlend = 1 - Math.exp(-elapsed / 420)
      smoothedBeatPulse +=
        ((rhythm?.beatPulse ?? 0) - smoothedBeatPulse) * pulseBlend
      const subAmount = clamp(settings.subMovement / 0.5, 0, 2)
      const pressure = clamp(
        smoothedBands.low * subAmount +
          smoothedBands.lowMid * 0.28 +
          smoothedBeatPulse * presetTuning.kickScale * 0.14,
      )
      const articulation = clamp(
        (smoothedBands.mid * 0.54 + smoothedBands.high * 0.32) *
          presetTuning.movementScale,
      )
      const musicalPosition = rhythm
        ? rhythm.musicalPosition
        : time / 500
      const musicalPhase = musicalPosition * Math.PI * 2
      const beatPulse = smoothedBeatPulse
      const frameEnergy = clamp(colorContext.frameEnergy, 0.05, 1)
      const beatsPerColor = 8 - frameEnergy * 3
      const musicalDelta =
        lastMusicalPosition > 0
          ? Math.max(0, Math.min(0.5, musicalPosition - lastMusicalPosition))
          : 0
      lastMusicalPosition = musicalPosition
      colorJourneyState +=
        (musicalDelta / beatsPerColor) *
        (0.78 +
          pressure * 0.22 +
          articulation * 0.16 +
          perceptual.chromaticShift *
            renderingConfig.transformation.chromaticAlteration *
            0.52) *
        presetTuning.colorSpeed
      const colorJourney = colorJourneyState
      const colorStep = Math.floor(colorJourney)
      const colorBlend = smoothColorProgress(colorJourney - colorStep)
      const easedTransition =
        morphPattern === 'fioritura'
          ? 1 - (1 - transitionProgress) ** 3
          : morphPattern === 'corrente'
            ? transitionProgress * transitionProgress * (3 - 2 * transitionProgress)
            : morphPattern === 'spirale'
              ? (1 - Math.cos(Math.PI * transitionProgress)) / 2
              : transitionProgress * transitionProgress * (2 - transitionProgress)
      lastMorphProgress = Math.max(
        lastMorphProgress,
        clamp(easedTransition + pressure * 0.018 + articulation * 0.009),
      )
      const morphPatternIndex = BRAIN_FRAME_MORPH_PATTERNS.indexOf(morphPattern)
      const camera = calculateBrainCameraMotion(
        sceneSeed,
        time / 1_000,
        musicalPosition,
        pressure,
        morphPattern,
      )
      svg.setAttribute('data-brain-pov', camera.mode)
      const sceneWidth = Math.max(1, viewBox[2] ?? 1000)
      const sceneHeight = Math.max(1, viewBox[3] ?? 1000)
      const sceneCenterX = (viewBox[0] ?? 0) + sceneWidth / 2
      const sceneCenterY = (viewBox[1] ?? 0) + sceneHeight / 2
      const cameraMultiplier = renderingConfig.motion.cameraMultiplier
      const cameraTravelX =
        camera.x * sceneWidth * 0.024 * cameraMultiplier
      const cameraTravelY =
        camera.y * sceneHeight * 0.018 * cameraMultiplier
      if (resourcePressure) {
        // Un solo movimento globale conserva una scena viva mentre l'UNet
        // occupa la GPU, senza rasterizzare decine di layer indipendenti.
        content.setAttribute(
          'transform',
          `translate(${(cameraTravelX * 0.16).toFixed(2)} ${(cameraTravelY * 0.16).toFixed(2)})`,
        )
      } else {
        content.removeAttribute('transform')
      }
      const maximumDepthLayers = resourcePressure
        ? pressureDepthLayerCount
        : settings.lowPowerMode
        ? lowPowerDepthLayerCount
        : normalDepthLayerCount
      const echoBudget = resourcePressure || ultraHeavyScene
        ? 0
        : settings.lowPowerMode || heavyScene
        ? Math.min(1, echoLayers.length)
        : mediumScene
          ? Math.min(2, echoLayers.length)
          : echoLayers.length
      const echoPresence = clamp(
        perceptual.persistence * transformationConfig.persistence * 0.68 +
          perceptual.complexity * transformationConfig.duplication * 0.52,
      )
      echoLayers.forEach((echo, index) => {
        const echoNumber = index + 1
        const layerPresence =
          index < echoBudget
            ? smoothColorProgress(
                clamp(echoPresence * echoBudget - index * 0.54),
              )
            : 0
        const phase =
          time / (2_900 + index * 1_350) +
          sceneSeed * 0.00013 +
          index * 1.71
        const persistence =
          perceptual.persistence * transformationConfig.persistence
        const duplication =
          perceptual.complexity * transformationConfig.duplication
        const symmetry =
          perceptual.symmetry * transformationConfig.unstableSymmetry
        const driftX =
          Math.sin(phase * 0.83) *
          sceneWidth *
          0.012 *
          echoNumber *
          (0.3 + duplication)
        const driftY =
          Math.cos(phase * 0.67) *
          sceneHeight *
          0.009 *
          echoNumber *
          (0.3 + persistence)
        const echoScaleX =
          1 +
          Math.sin(phase * 0.49) *
            0.018 *
            transformationConfig.perspective *
            (0.4 + perceptual.depth)
        const echoScaleY =
          1 -
          Math.cos(phase * 0.57) *
            0.014 *
            transformationConfig.perspective *
            (0.4 + perceptual.texture)
        const mirror =
          index === echoLayers.length - 1 && symmetry > 0.18
            ? `translate(${(sceneCenterX * 2).toFixed(2)} 0) scale(-1 1) `
            : ''
        echo.setAttribute(
          'transform',
          `${mirror}translate(${driftX.toFixed(2)} ${driftY.toFixed(2)}) translate(${sceneCenterX.toFixed(2)} ${sceneCenterY.toFixed(2)}) rotate(${(Math.sin(phase) * (0.35 + perceptual.disorder * 1.8)).toFixed(2)}) scale(${echoScaleX.toFixed(4)} ${echoScaleY.toFixed(4)}) translate(${(-sceneCenterX).toFixed(2)} ${(-sceneCenterY).toFixed(2)})`,
        )
        const targetEchoOpacity =
          resourcePressure || index >= echoBudget
            ? 0
            : clamp(
                (0.025 +
                  persistence * 0.095 +
                  duplication * 0.055 +
                  (index === echoLayers.length - 1 ? symmetry * 0.04 : 0)) /
                  echoNumber,
                0,
                0.18,
              ) * layerPresence
        const echoBlend = 1 - Math.exp(-elapsed / 760)
        smoothedEchoOpacities[index] +=
          (targetEchoOpacity - smoothedEchoOpacities[index]) * echoBlend
        if (resourcePressure || index >= echoBudget || smoothedEchoOpacities[index] < 0.0005) {
          smoothedEchoOpacities[index] = 0
          echo.style.opacity = '0'
          echo.style.display = 'none'
        } else {
          echo.style.opacity = String(smoothedEchoOpacities[index])
          echo.style.display = 'block'
        }
      })
      if (colorDue) {
        const controlPalette = [
          settings.idleColor,
          settings.basePinkColor,
          settings.hotPinkColor,
          settings.whiteFlashColor,
        ]
          .map((color) => parseColor(color))
          .sort((left, right) => colorLuminance(left) - colorLuminance(right))
        const paletteBlend = 1 - Math.exp(-colorElapsed / 2_400)
        smoothedActivePalette.forEach((color, index) => {
          const target = mixedColorChannels(
            palette[index],
            controlPalette[
              Math.round(
                (index / Math.max(1, palette.length - 1)) *
                  (controlPalette.length - 1),
              )
            ],
            presetTuning.colorInfluence,
          )
          for (let channel = 0; channel < 3; channel++) {
            color[channel] +=
              (target[channel] - color[channel]) * paletteBlend
          }
        })
      }
      const maximumGeometryLayers = resourcePressure
        ? pressureGeometryLayerCount
        : settings.lowPowerMode
        ? lowPowerGeometryLayerCount
        : normalGeometryLayerCount
      // Le soglie variabili facevano entrare e uscire interi livelli a scatto.
      // Il budget resta fisso e l'intensità continua è affidata allo stato
      // percettivo. Iteriamo solo gli elementi effettivamente animati, non
      // l'intero SVG vettorializzato.
      const activeIndices = resourcePressure
        ? pressureActiveIndices
        : settings.lowPowerMode
        ? lowPowerActiveIndices
        : normalActiveIndices
      activeIndices.forEach((index) => {
        const element = animatedElements[index]
        if (!element) return
        const phase = elementPhases[index]
        const target = targetShapes[index]
        const source = transitionCounterparts[index] ?? target
        const progress = transitionCounterparts.length > 0 ? lastMorphProgress : 1
        const depthMotion = calculateBrainDepthMotion(
          depthProfiles[index],
          time / 1_000,
          musicalPosition,
          pressure,
          articulation,
          morphPattern,
        )
        if (index < maximumDepthLayers) {
          const profile = depthProfiles[index]
          const normalizedDepth = (profile.depth + 1) / 2
          const parallaxWeight = 0.22 + normalizedDepth * 0.78
          const anchorX = (target.anchor.x - sceneCenterX) / sceneWidth
          const anchorY = (target.anchor.y - sceneCenterY) / sceneHeight
          const cameraParallaxX =
            -cameraTravelX * parallaxWeight +
            anchorY *
              camera.yaw *
              profile.depth *
              sceneWidth *
              0.032 *
              cameraMultiplier
          const cameraParallaxY =
            -cameraTravelY * parallaxWeight +
            anchorX *
              camera.pitch *
              profile.depth *
              sceneHeight *
              0.024 *
              cameraMultiplier
          const perspectiveX =
            depthMotion.x +
            profile.directionX * depthMotion.z * 0.12 +
            cameraParallaxX
          const perspectiveY =
            depthMotion.y +
            profile.directionY * depthMotion.z * 0.09 +
            cameraParallaxY
          const planarTilt =
            depthMotion.rotateZ +
            depthMotion.rotateX * 0.16 -
            depthMotion.rotateY * 0.12 +
            camera.yaw * profile.depth * 0.22 * cameraMultiplier
          const propagationWave = Math.sin(
            time * 0.0011 -
              normalizedDepth *
                Math.PI *
                (2.4 + transformationConfig.propagation * 2.8) +
              phase,
          )
          const localPerspective =
            transformationConfig.perspective *
            (0.35 + perceptual.depth * 0.65)
          const scaleX =
            1 +
            (profile.depth * 0.012 +
              propagationWave * perceptual.propagation * 0.018) *
              localPerspective
          const scaleY =
            1 -
            (profile.depth * 0.009 +
              propagationWave * perceptual.metamorphosis * 0.013) *
              localPerspective
          animatedLayers[index].setAttribute(
            'transform',
            `translate(${perspectiveX.toFixed(2)} ${perspectiveY.toFixed(2)}) rotate(${planarTilt.toFixed(2)} ${target.anchor.x.toFixed(2)} ${target.anchor.y.toFixed(2)}) translate(${target.anchor.x.toFixed(2)} ${target.anchor.y.toFixed(2)}) scale(${scaleX.toFixed(4)} ${scaleY.toFixed(4)}) translate(${(-target.anchor.x).toFixed(2)} ${(-target.anchor.y).toFixed(2)})`,
          )
        }
        const dissolutionWave = Math.max(
          0,
          Math.sin(
            time * (0.00031 + perceptual.texture * 0.00024) +
              phase * 1.71 +
              index * 0.19,
          ),
        )
        const dissolution =
          perceptual.disorder *
          transformationConfig.dissolution *
          transformationConfig.disintegration
        animatedLayers[index].style.opacity = String(
          clamp(1 - dissolution * dissolutionWave * 0.38, 0.56, 1),
        )
        const geometryRank = geometryCandidateRank.get(index)
        if (
          element.localName === 'path' &&
          target.morphable &&
          geometryRank !== undefined &&
          geometryRank < maximumGeometryLayers
        ) {
          const highRipple = clamp(smoothedBands.high * 0.62 + smoothedBands.mid * 0.18)
          const amplitude =
            (1.25 + pressure * 4.8 + articulation * 3.1 + highRipple * 1.6) *
            (1 + beatPulse * 0.22) *
            presetTuning.movementScale *
            renderingConfig.motion.liquidMultiplier *
            (1 +
              perceptual.metamorphosis *
                transformationConfig.organicDeformation *
                1.15 +
              perceptual.disorder *
                transformationConfig.disintegration *
                0.48)
          const pattern = (index + morphPatternIndex) % 4
          const flowX =
            Math.sin(musicalPhase * (0.125 + pattern * 0.018) + phase) *
            (0.8 + pressure * 3.6) *
            presetTuning.movementScale
          const flowY =
            Math.cos(musicalPhase * (0.1 + pattern * 0.015) + phase * 1.17) *
            (0.7 + articulation * 3.0) *
            presetTuning.movementScale
          const points = target.points.map((targetPoint, pointIndex) => {
            const sourcePoint = source.points[pointIndex] ?? targetPoint
            const radialX = targetPoint.x - target.anchor.x
            const radialY = targetPoint.y - target.anchor.y
            const radialLength = Math.max(1, Math.hypot(radialX, radialY))
            const normalX = radialX / radialLength
            const normalY = radialY / radialLength
            const tangentX = -normalY
            const tangentY = normalX
            const transitionEnvelope = Math.sin(Math.PI * progress)
            const pointPhase = pointIndex / Math.max(1, target.points.length)
            const spatialDelay =
              morphPattern === 'marea'
                ? Math.sin(pointPhase * Math.PI * 2 + phase) * 0.055
                : morphPattern === 'fioritura'
                  ? (radialLength / Math.max(1, sceneDiagonal) - 0.18) * 0.16
                  : morphPattern === 'corrente'
                    ? (
                        (targetPoint.x - (viewBox[0] ?? 0)) /
                          Math.max(1, viewBox[2] ?? 1000) -
                        0.5
                      ) * 0.12
                    : Math.sin(
                        pointPhase * Math.PI * 2 -
                          progress * Math.PI * 1.5,
                      ) * 0.07
            const localProgress = clamp(
              progress + spatialDelay * transitionEnvelope,
            )
            const baseX =
              sourcePoint.x + (targetPoint.x - sourcePoint.x) * localProgress
            const baseY =
              sourcePoint.y + (targetPoint.y - sourcePoint.y) * localProgress
            const microMotion = calculateBrainMicroMotion(
              sceneSeed,
              index,
              pointPhase,
              time / 1_000,
              depthProfiles[index].depth,
              renderingConfig.motion.microMovement,
            )
            const wave =
              musicalPhase * (0.16 + pressure * 0.045) +
              phase +
              pointIndex * (0.24 + highRipple * 0.08) +
              Math.sin(
                time * 0.00043 -
                  pointPhase *
                    Math.PI *
                    2 *
                    transformationConfig.propagation,
              ) *
                perceptual.propagation *
                1.4
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
              x:
                baseX +
                liquidX +
                flowX +
                normalX * microMotion.normal +
                tangentX * microMotion.tangent,
              y:
                baseY +
                liquidY +
                flowY +
                normalY * microMotion.normal +
                tangentY * microMotion.tangent,
            }
          })
          element.setAttribute('d', pointsPath(points))
        }
        if (colorDue) {
          const paletteIndex =
            (
              paletteIndices[index] +
              colorStep +
              index % 2 +
              Math.floor(
                perceptual.chromaticShift *
                  transformationConfig.chromaticAlteration *
                  smoothedActivePalette.length,
              )
            ) %
            smoothedActivePalette.length
          const nextPaletteIndex =
            (paletteIndex + 1) % smoothedActivePalette.length
          const animatedColor = mixedColorChannels(
            smoothedActivePalette[paletteIndex],
            smoothedActivePalette[nextPaletteIndex],
            colorBlend,
          )
          const depthColor =
            depthMotion.light >= 0
              ? smoothedActivePalette[smoothedActivePalette.length - 1]
              : smoothedActivePalette[0]
          const illuminatedColor = mixedColorChannels(
            animatedColor,
            depthColor,
            Math.abs(depthMotion.light) *
              (0.14 +
                perceptual.depth *
                  transformationConfig.chromaticAlteration *
                  0.12),
          )
          const renderedColor = mixedColor(
            source.fill,
            illuminatedColor,
            Math.max(progress, 0.42),
          )
          if (usesFill[index]) element.setAttribute('fill', renderedColor)
          if (usesStroke[index]) {
            element.setAttribute('stroke', renderedColor)
          }
        }
      })
    },
    destroy() {
      svg.remove()
    },
  }
}
