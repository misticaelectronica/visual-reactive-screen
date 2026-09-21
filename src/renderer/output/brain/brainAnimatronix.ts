// ANIMATRONIX — fase post-storia di Brain. Modulo autonomo: analisi della
// struttura dei raster, grammatiche di movimento (TRAVERSAL, PARALLAX,
// PROXIMITY, DRIFT, RECESSION), frase di movimento con invariante cinetico,
// orologio consapevole del silenzio e posa di camera. Nessuna generazione
// di immagini; nessuna dipendenza da altri renderer. La deroga Camera vale
// solo qui dentro.

export type AnimatronixGrammar =
  | 'traversal'
  | 'parallax'
  | 'proximity'
  | 'drift'
  | 'recession'

export type AnimatronixRegime =
  | 'unresolved'
  | 'pressurized'
  | 'decompression'
  | 'respiro-alto'
  | 'respiro-profondo'

export type AnimatronixRasterStructure = {
  flatness: number
  depthConfidence: number
  traversalAxis: number
  dominance: number
  dominantX: number
  dominantY: number
}

export type AnimatronixPose = {
  scale: number
  panX: number
  panY: number
  focusX: number
  focusY: number
}

export type AnimatronixSegment = {
  rasterIndex: number
  grammar: AnimatronixGrammar
  from: AnimatronixPose
  to: AnimatronixPose
  parallaxDepth: number
  durationMs: number
  mutation: boolean
}

export type AnimatronixPlan = {
  invariant: { grammar: AnimatronixGrammar; dirX: number; dirY: number }
  segments: AnimatronixSegment[]
  totalMs: number
  exitPose: AnimatronixPose
}

export const ANIMATRONIX_MIN_TOTAL_MS = 18_000
export const ANIMATRONIX_MAX_TOTAL_MS = 28_000
const BASE_TOTAL_MS = 23_000
const MIN_SCALE = 1.06
const MAX_SCALE = 1.5
const VIABILITY: Record<AnimatronixGrammar, number> = {
  traversal: 0.3,
  parallax: 0.35,
  proximity: 0.3,
  drift: 0,
  recession: 0,
}
const GRAMMARS: AnimatronixGrammar[] = [
  'traversal',
  'parallax',
  'proximity',
  'drift',
  'recession',
]

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))
const clamp01 = (value: number) => clamp(value, 0, 1)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function hashSeed(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function lumaFromRgba(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
): Float32Array {
  const luma = new Float32Array(width * height)
  for (let i = 0; i < luma.length; i++) {
    const o = i * 4
    luma[i] =
      (0.2126 * rgba[o] + 0.7152 * rgba[o + 1] + 0.0722 * rgba[o + 2]) / 255
  }
  return luma
}

export const FLAT_RASTER_STRUCTURE: AnimatronixRasterStructure = {
  flatness: 1,
  depthConfidence: 0,
  traversalAxis: 0,
  dominance: 0,
  dominantX: 0.5,
  dominantY: 0.5,
}

// `luma`: griglia in scala di grigi 0..1 (il chiamante la riduce, ~48x48).
export function analyzeAnimatronixRaster(
  luma: ArrayLike<number>,
  width: number,
  height: number,
): AnimatronixRasterStructure {
  if (width < 6 || height < 6 || luma.length < width * height) {
    return FLAT_RASTER_STRUCTURE
  }
  const grad = new Float32Array(width * height)
  let total = 0
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const i = y * width + x
      const g =
        Math.abs(luma[i + 1] - luma[i]) + Math.abs(luma[i + width] - luma[i])
      grad[i] = g
      total += g
    }
  }
  const cells = (width - 1) * (height - 1)
  const meanGrad = total / cells
  const flatness = clamp01(1 - meanGrad / 0.12)
  if (total <= 1e-6) return FLAT_RASTER_STRUCTURE

  const region = (x0: number, x1: number, y0: number, y1: number) => {
    let e = 0
    let l = 0
    let n = 0
    for (let y = Math.floor(y0 * height); y < Math.floor(y1 * height); y++) {
      for (let x = Math.floor(x0 * width); x < Math.floor(x1 * width); x++) {
        e += grad[y * width + x]
        l += luma[y * width + x]
        n++
      }
    }
    return { energy: n ? e / n : 0, luma: n ? l / n : 0 }
  }

  const top = region(0, 1, 0, 1 / 3)
  const bottom = region(0, 1, 2 / 3, 1)
  const bandEnergy =
    Math.abs(bottom.energy - top.energy) / (bottom.energy + top.energy + 1e-6)
  const bandLuma = Math.abs(bottom.luma - top.luma)
  const depthConfidence = clamp01(
    (0.6 * bandEnergy * 2 + 0.4 * bandLuma * 2) * (1 - flatness),
  )

  const left = region(0, 1 / 3, 0, 1)
  const centre = region(1 / 3, 2 / 3, 0, 1)
  const right = region(2 / 3, 1, 0, 1)
  const sides = (left.energy + right.energy) / 2
  const sideShare = sides / (sides + centre.energy + 1e-6)
  const symmetry =
    1 - Math.abs(left.energy - right.energy) / (left.energy + right.energy + 1e-6)
  const traversalAxis = clamp01((sideShare - 0.5) * 3) * symmetry * (1 - flatness)

  let bestEnergy = 0
  let bestX = width / 2
  let bestY = height / 2
  for (let y = 1; y < height - 2; y++) {
    for (let x = 1; x < width - 2; x++) {
      let e = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) e += grad[(y + dy) * width + x + dx]
      }
      if (e > bestEnergy) {
        bestEnergy = e
        bestX = x
        bestY = y
      }
    }
  }
  const areaShare = 9 / cells
  const dominance = clamp01((bestEnergy / total - areaShare) * 2)

  return {
    flatness,
    depthConfidence,
    traversalAxis,
    dominance,
    dominantX: clamp01(bestX / (width - 1)),
    dominantY: clamp01(bestY / (height - 1)),
  }
}

export function scoreAnimatronixGrammars(
  s: AnimatronixRasterStructure,
): Record<AnimatronixGrammar, number> {
  return {
    traversal: s.traversalAxis,
    parallax: s.depthConfidence * 0.9,
    proximity: s.dominance * (1 - s.flatness * 0.3),
    drift: 0.3 + s.flatness * 0.5,
    recession: 0.15 + s.dominance * 0.1,
  }
}

const isViable = (grammar: AnimatronixGrammar, score: number) =>
  score >= VIABILITY[grammar]

export type AnimatronixRegimeProfile = {
  durationScale: number
  travel: number
  parallax: number
}

// Metabolismo Visual per stato: pressione e velocità non sono sinonimi.
export function animatronixRegimeProfile(
  regime: AnimatronixRegime,
): AnimatronixRegimeProfile {
  switch (regime) {
    case 'respiro-profondo':
      return { durationScale: 1.15, travel: 1, parallax: 1 }
    case 'respiro-alto':
      return { durationScale: 0.85, travel: 0.7, parallax: 1.1 }
    case 'decompression':
      return { durationScale: 1.05, travel: 0.9, parallax: 0.9 }
    case 'pressurized':
      return { durationScale: 1, travel: 0.55, parallax: 0.7 }
    default:
      return { durationScale: 1, travel: 0.8, parallax: 0.9 }
  }
}

export function clampPoseToCover(pose: AnimatronixPose): AnimatronixPose {
  const scale = clamp(pose.scale, MIN_SCALE, MAX_SCALE)
  const fx = clamp01(pose.focusX)
  const fy = clamp01(pose.focusY)
  const k = scale - 1
  return {
    scale,
    focusX: fx,
    focusY: fy,
    panX: clamp(pose.panX, -k * (1 - fx), k * fx),
    panY: clamp(pose.panY, -k * (1 - fy), k * fy),
  }
}

export function animatronixPoseToTransform(
  pose: AnimatronixPose,
  width: number,
  height: number,
): { scale: number; tx: number; ty: number } {
  const p = clampPoseToCover(pose)
  return {
    scale: p.scale,
    tx: width * (p.focusX * (1 - p.scale) + p.panX),
    ty: height * (p.focusY * (1 - p.scale) + p.panY),
  }
}

// Spostamento di un livello di profondità (0 sfondo … 1 primo piano).
export function animatronixParallaxShift(
  layerDepth: number,
  pose: AnimatronixPose,
  parallaxDepth: number,
): { x: number; y: number } {
  const factor = (clamp01(layerDepth) - 0.5) * 2 * clamp01(parallaxDepth)
  return { x: pose.panX * factor, y: pose.panY * factor }
}

function targetPose(
  grammar: AnimatronixGrammar,
  from: AnimatronixPose,
  s: AnimatronixRasterStructure,
  travel: number,
  dirX: number,
  dirY: number,
): AnimatronixPose {
  switch (grammar) {
    case 'traversal':
      return {
        scale: from.scale + 0.28 * travel,
        panX: from.panX,
        panY: from.panY,
        focusX: 0.5,
        focusY: 0.48,
      }
    case 'proximity':
      return {
        scale: from.scale + 0.32 * travel,
        panX: from.panX,
        panY: from.panY,
        focusX: s.dominantX,
        focusY: s.dominantY,
      }
    case 'parallax':
      return {
        scale: Math.max(from.scale, 1.12) + 0.04 * travel,
        panX: from.panX + dirX * 0.06 * travel,
        panY: from.panY + dirY * 0.06 * travel,
        focusX: from.focusX,
        focusY: from.focusY,
      }
    case 'drift':
      return {
        scale: Math.max(from.scale, 1.14),
        panX: from.panX + dirX * 0.1 * travel,
        panY: from.panY + dirY * 0.1 * travel,
        focusX: from.focusX,
        focusY: from.focusY,
      }
    case 'recession':
      return {
        scale: from.scale - 0.26 * travel,
        panX: from.panX,
        panY: from.panY,
        focusX: 0.5,
        focusY: 0.5,
      }
  }
}

export type PlanAnimatronixInput = {
  storyId: string
  structures: (AnimatronixRasterStructure | null | undefined)[]
  regime?: AnimatronixRegime
  entryPose?: AnimatronixPose
}

const DEFAULT_ENTRY: AnimatronixPose = {
  scale: 1.08,
  panX: 0,
  panY: 0,
  focusX: 0.5,
  focusY: 0.5,
}

// Una storia = una frase di movimento: un invariante cinetico presente in
// almeno due raster e almeno una mutazione (raster 3), mai quattro gesti
// indipendenti.
export function planAnimatronix(input: PlanAnimatronixInput): AnimatronixPlan {
  const rng = mulberry32(hashSeed(input.storyId))
  const profile = animatronixRegimeProfile(input.regime ?? 'unresolved')
  const structures = input.structures.map((s) => s ?? FLAT_RASTER_STRUCTURE)
  const count = structures.length
  const scores = structures.map(scoreAnimatronixGrammars)

  let invariantGrammar: AnimatronixGrammar = 'drift'
  let bestSum = -1
  for (const g of GRAMMARS) {
    const viable = scores.filter((sc) => isViable(g, sc[g])).length
    if (viable < 2 && count >= 2) continue
    const sum = scores.reduce((acc, sc) => acc + sc[g], 0)
    if (sum > bestSum) {
      bestSum = sum
      invariantGrammar = g
    }
  }

  const lateral = rng() < 0.5 ? 1 : -1
  const dirX = lateral
  const dirY = (rng() - 0.5) * 0.5
  const grammars: AnimatronixGrammar[] = []
  const mutations: boolean[] = []
  for (let i = 0; i < count; i++) {
    const sc = scores[i]
    const ownBest = GRAMMARS.filter((g) => isViable(g, sc[g])).sort(
      (a, b) => sc[b] - sc[a],
    )[0]
    let grammar: AnimatronixGrammar
    let mutation = false
    if (i === 0) {
      grammar = isViable(invariantGrammar, sc[invariantGrammar] + 0.15)
        ? invariantGrammar
        : ownBest
    } else if (i === 2) {
      const alternative = GRAMMARS.filter(
        (g) => g !== invariantGrammar && isViable(g, sc[g]),
      ).sort((a, b) => sc[b] - sc[a])[0]
      grammar = alternative ?? invariantGrammar
      mutation = true
    } else {
      grammar = isViable(invariantGrammar, sc[invariantGrammar])
        ? invariantGrammar
        : 'drift'
    }
    grammars.push(grammar)
    mutations.push(mutation)
  }

  const weights = structures.map((s) => 1 + 0.5 * Math.max(s.traversalAxis, s.depthConfidence))
  const weightSum = weights.reduce((a, b) => a + b, 0)
  const totalMs = clamp(
    BASE_TOTAL_MS * profile.durationScale,
    ANIMATRONIX_MIN_TOTAL_MS,
    ANIMATRONIX_MAX_TOTAL_MS,
  )

  let cursor = clampPoseToCover(input.entryPose ?? DEFAULT_ENTRY)
  const segments: AnimatronixSegment[] = []
  for (let i = 0; i < count; i++) {
    const grammar = grammars[i]
    const sameAsInvariantDir = !(mutations[i] && grammar === invariantGrammar)
    const sign = sameAsInvariantDir ? 1 : -1
    const to = clampPoseToCover(
      targetPose(grammar, cursor, structures[i], profile.travel, dirX * sign, dirY * sign),
    )
    segments.push({
      rasterIndex: i,
      grammar,
      from: cursor,
      to,
      parallaxDepth:
        grammar === 'parallax'
          ? clamp01(structures[i].depthConfidence * profile.parallax)
          : 0,
      durationMs: (totalMs * weights[i]) / weightSum,
      mutation: mutations[i],
    })
    cursor = to
  }

  return {
    invariant: { grammar: invariantGrammar, dirX, dirY },
    segments,
    totalMs,
    exitPose: cursor,
  }
}

// Inerzia: rampa d'ingresso e d'uscita della velocità, nessun easing
// avanti/indietro leggibile.
export function inertialProgress(t: number): number {
  const x = clamp01(t)
  const r = 0.18
  const v = 1 / (1 - r)
  if (x < r) return (v * x * x) / (2 * r)
  if (x > 1 - r) {
    const u = 1 - x
    return 1 - (v * u * u) / (2 * r)
  }
  return (v * r) / 2 + v * (x - r)
}

export function sampleAnimatronixPose(
  segment: AnimatronixSegment,
  progress: number,
): AnimatronixPose {
  const p = inertialProgress(progress)
  return clampPoseToCover({
    scale: lerp(segment.from.scale, segment.to.scale, p),
    panX: lerp(segment.from.panX, segment.to.panX, p),
    panY: lerp(segment.from.panY, segment.to.panY, p),
    focusX: lerp(segment.from.focusX, segment.to.focusX, p),
    focusY: lerp(segment.from.focusY, segment.to.focusY, p),
  })
}

export type AnimatronixClockState = {
  segmentIndex: number
  segmentProgress: number
  elapsedMs: number
  speed: number
  done: boolean
}

// In silenzio la velocità decade e lo stato raggiunto resta congelato; alla
// ripresa il movimento riparte da lì, senza reset.
export class AnimatronixClock {
  private elapsedMs = 0
  private speed = 0

  constructor(private readonly plan: AnimatronixPlan) {}

  advance(dtMs: number, active: boolean): AnimatronixClockState {
    const dt = Math.max(0, dtMs)
    const tau = active ? 900 : 1800
    this.speed += ((active ? 1 : 0) - this.speed) * (1 - Math.exp(-dt / tau))
    this.elapsedMs = Math.min(this.plan.totalMs, this.elapsedMs + dt * this.speed)
    return this.state()
  }

  state(): AnimatronixClockState {
    let remaining = this.elapsedMs
    const last = this.plan.segments.length - 1
    for (let i = 0; i <= last; i++) {
      const d = this.plan.segments[i].durationMs
      if (remaining < d || i === last) {
        return {
          segmentIndex: i,
          segmentProgress: clamp01(remaining / d),
          elapsedMs: this.elapsedMs,
          speed: this.speed,
          done: this.elapsedMs >= this.plan.totalMs,
        }
      }
      remaining -= d
    }
    return {
      segmentIndex: last,
      segmentProgress: 1,
      elapsedMs: this.elapsedMs,
      speed: this.speed,
      done: true,
    }
  }
}

// La camera non segue mai il beat: solo micro-variazioni locali di
// profondità e luce, derivate dal beat reale e nulle in silenzio.
export function calculateAnimatronixMicroModulation(
  active: boolean,
  beatPulse: number,
  highTransient: number,
): { parallaxGain: number; lightGain: number } {
  if (!active) return { parallaxGain: 1, lightGain: 1 }
  return {
    parallaxGain: 1 + 0.12 * clamp01(beatPulse),
    lightGain: 1 + 0.15 * clamp01(highTransient),
  }
}
