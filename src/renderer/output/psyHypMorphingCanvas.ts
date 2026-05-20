import {
  PSY_HYP_DEFAULT_PRESET,
  type PsyHypDrawProfile,
  type PsyHypPreset,
  type PsyHypShapeId,
} from '@shared/psyHypMorphingShapes'
import type { AppSettings, BandEnergies, VisualStatePayload } from '@shared/types'

const DEBUG_PSY_HYP = false
const DEBUG_PSY_PERF = false
const PSY_TARGET_FPS = 30
const PSY_MAX_DPR = 1.5
const PSY_POINT_COUNT = 96
const PSY_STRUCTURE_POINT_COUNT = 48
const PSY_MAX_LAYERS = 3
const PSY_MAX_BLUR = 28
const PSY_MAX_TRAIL_RETENTION = 0.88
const PSY_MIN_FRAME_INTERVAL_MS = 1000 / PSY_TARGET_FPS
const PSY_AURA_BLUR = 24
const PSY_SILHOUETTE_BLUR = 8
const PSY_STRUCTURE_BLUR = 2
const PSY_FLASH_GLOW_BLUR = 16
const MIN_TRANSITION_MS = 6000
const MAX_TRANSITION_MS = 12000
const PSY_MAIN_ALPHA_MIN = 0.26
const PSY_MAIN_ALPHA_MAX = 0.68
const PSY_DEFAULT_SCALE = 1.42
const PSY_SCREEN_COVERAGE = 1.35
const PSY_AUDIO_GAIN = 1.45
const PSY_SUB_BOUNCE_GAIN = 1.65
const PSY_KICK_BOUNCE_GAIN = 1.55
const PSY_TWIST_GAIN = 1.35
const PSY_MID_GLOW_GAIN = 1.45
const PSY_HIGH_DETAIL_GAIN = 1.25
const PSY_TRAIL_AUDIO_GAIN = 1.30
const PSY_SUB_MOVEMENT_FALLBACK = 0.42
const PSY_KICK_MOVEMENT_FALLBACK = 0.22

type PsyTransitionPhase = 'depart' | 'fusion' | 'arrive'
type PsyHypQuality = 'balanced' | 'low'
type ShapeFamily = 'radial' | 'linear' | 'organic' | 'architectural' | 'field' | 'fracture'

type RGBColor = {
  r: number
  g: number
  b: number
}

type Point = {
  x: number
  y: number
  radius?: number
  alpha?: number
  weight?: number
}

type PsyHypAudioEnvelope = {
  low: number
  lowMid: number
  mid: number
  high: number
  flash: number
  lowTransient: number
  lowMidTransient: number
  midTransient: number
  highTransient: number
  energy: number
  previousLow: number
  previousLowMid: number
  previousMid: number
  previousHigh: number
  reactiveLow: number
  reactiveLowMid: number
  reactiveMid: number
  reactiveHigh: number
  subBounce: number
  kickBounce: number
  bodyTwist: number
  midGlow: number
  highDetail: number
}

type PsyHypTransitionCache = {
  currentShapeId: PsyHypShapeId
  nextShapeId: PsyHypShapeId
  currentPoints: Point[]
  nextPoints: Point[]
  currentStructure?: Point[][]
  nextStructure?: Point[][]
  generatedAt: number
  seed: number
}

export type PsyHypMorphingState = {
  currentShapeId: PsyHypShapeId
  nextShapeId: PsyHypShapeId
  previousShapeId?: PsyHypShapeId
  transitionStartTime: number
  transitionDurationMs: number
  cycleSeed: number
  direction: 1 | -1
  lfoPhaseA: number
  lfoPhaseB: number
  lfoPhaseC: number
  transitionCache: PsyHypTransitionCache
  trails?: {
    canvas: HTMLCanvasElement
    ctx: CanvasRenderingContext2D | null
  }
}

type LayerSpec = {
  name: 'aura' | 'silhouette' | 'structure'
  scale: number
  blur: number
  alpha: number
  lineWidth: number
  speed: number
}

let lastPsyHypDebugLogMs = -1e12

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function smootherstep(x: number): number {
  const k = clamp(x, 0, 1)
  return k * k * k * (k * (k * 6 - 15) + 10)
}

function easeInOutSine(x: number): number {
  const k = clamp(x, 0, 1)
  return -(Math.cos(Math.PI * k) - 1) / 2
}

function psyEase(x: number, _t: number, seed: number): number {
  const k = clamp(x, 0, 1)
  const s = smootherstep(k)
  const wobble =
    Math.sin(k * Math.PI * 2 + seed) * 0.025 +
    Math.sin(k * Math.PI * 6 + seed * 1.7) * 0.012
  return clamp(s + wobble, 0, 1)
}

function transitionPhase(progress: number): PsyTransitionPhase {
  if (progress < 0.35) return 'depart'
  if (progress > 0.65) return 'arrive'
  return 'fusion'
}

function phaseSettings(phase: PsyTransitionPhase): {
  recognitionBoost: number
  deformationMultiplier: number
  structureAlphaMultiplier: number
  trailMultiplier: number
  twistMultiplier: number
  noiseMultiplier: number
  blurMultiplier: number
  auraMultiplier: number
} {
  if (phase === 'fusion') {
    return {
      recognitionBoost: 0.85,
      deformationMultiplier: 1.05,
      structureAlphaMultiplier: 0.85,
      trailMultiplier: 1.05,
      twistMultiplier: 1.10,
      noiseMultiplier: 1.0,
      blurMultiplier: 1.0,
      auraMultiplier: 1.05,
    }
  }

  return {
    recognitionBoost: 1.35,
    deformationMultiplier: 0.45,
    structureAlphaMultiplier: 1.50,
    trailMultiplier: 0.70,
    twistMultiplier: 0.50,
    noiseMultiplier: 0.45,
    blurMultiplier: 0.65,
    auraMultiplier: 0.65,
  }
}

function updateEnvelope(current: number, target: number, attack: number, release: number): number {
  const coefficient = target > current ? attack : release
  return current + (target - current) * coefficient
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

function rgba(c: RGBColor, a: number): string {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${clamp(a, 0, 1)})`
}

function mixColors(a: RGBColor, b: RGBColor, t: number): RGBColor {
  const k = clamp(t, 0, 1)
  return {
    r: Math.round(lerp(a.r, b.r, k)),
    g: Math.round(lerp(a.g, b.g, k)),
    b: Math.round(lerp(a.b, b.b, k)),
  }
}

function rgbToHsl(c: RGBColor): { h: number; s: number; l: number } {
  const r = c.r / 255
  const g = c.g / 255
  const b = c.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      default:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return { h, s, l }
}

function hslToRgb(h: number, s: number, l: number): RGBColor {
  if (s === 0) {
    const v = Math.round(l * 255)
    return { r: v, g: v, b: v }
  }

  const hueToRgb = (p: number, q: number, tIn: number) => {
    let t = tIn
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return {
    r: Math.round(hueToRgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, h) * 255),
    b: Math.round(hueToRgb(p, q, h - 1 / 3) * 255),
  }
}

function rotateHue(color: RGBColor, degrees: number): RGBColor {
  const hsl = rgbToHsl(color)
  const h = (hsl.h + degrees / 360 + 1) % 1
  return hslToRgb(h, clamp(hsl.s * 1.08, 0, 1), hsl.l)
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededUnit(seed: number, index: number): number {
  const x = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453
  return x - Math.floor(x)
}

function softNoise(seed: number, index: number, t: number, amount = 1): number {
  return (
    Math.sin(index * 1.71 + seed * 0.013 + t * 0.17) * 0.55 +
    Math.cos(index * 0.63 + seed * 0.021 + t * 0.11) * 0.45
  ) * amount
}

function edgeNoiseAmount(profile: PsyHypDrawProfile): number {
  if (profile.edgeNoise === 'high') return 0.055
  if (profile.edgeNoise === 'medium') return 0.032
  return 0.014
}

function randomTransitionDuration(rng: () => number): number {
  return MIN_TRANSITION_MS + rng() * (MAX_TRANSITION_MS - MIN_TRANSITION_MS)
}

function randomSeed(rng: () => number): number {
  return Math.floor(rng() * 1_000_000) + 1
}

export function pickNextRandomShape(
  shapes: PsyHypPreset['shapes'],
  current: PsyHypShapeId,
  previous: PsyHypShapeId | undefined,
  rng: () => number,
): PsyHypShapeId {
  const currentFamily = shapeFamily(current)
  const compatible = shapes.filter((shape) => {
    if (shape.id === current || shape.id === previous) return false
    const family = shapeFamily(shape.id)
    return family !== currentFamily && areFamiliesCompatible(currentFamily, family)
  })
  const varied = shapes.filter((shape) => shape.id !== current && shape.id !== previous)
  const open = shapes.filter((shape) => shape.id !== current)
  const preferred = compatible.length > 0 && rng() < 0.65 ? compatible : varied
  const candidates = preferred.length > 0 ? preferred : open
  const index = Math.floor(rng() * candidates.length) % candidates.length
  return candidates[index].id
}

function shapeFamily(shapeId: PsyHypShapeId): ShapeFamily {
  switch (shapeId) {
    case 'disco':
    case 'spirale':
    case 'portale':
    case 'globo':
    case 'occhio':
    case 'luna':
      return 'radial'
    case 'onda':
    case 'radice':
    case 'sentiero':
      return 'linear'
    case 'seme':
    case 'capsula':
    case 'mano':
    case 'fiamma':
      return 'organic'
    case 'griglia':
    case 'torre':
    case 'blocco':
    case 'condotto':
    case 'strumento':
    case 'ingranaggio':
    case 'libro':
      return 'architectural'
    case 'nebbia':
    case 'sole':
      return 'field'
    case 'frattura':
    case 'triangolo':
      return 'fracture'
    default:
      return 'organic'
  }
}

function areFamiliesCompatible(a: ShapeFamily, b: ShapeFamily): boolean {
  const map: Record<ShapeFamily, ShapeFamily[]> = {
    radial: ['radial', 'field', 'organic'],
    linear: ['linear', 'fracture', 'architectural', 'organic'],
    organic: ['organic', 'radial', 'field', 'linear'],
    architectural: ['architectural', 'linear', 'fracture'],
    field: ['field', 'radial', 'organic'],
    fracture: ['fracture', 'linear', 'architectural'],
  }
  return map[a].includes(b) || map[b].includes(a)
}

function initPsyHypMorphingState(now: number, preset: PsyHypPreset, rng: () => number): PsyHypMorphingState {
  const current = preset.shapes[Math.floor(rng() * preset.shapes.length) % preset.shapes.length].id
  const next = pickNextRandomShape(preset.shapes, current, undefined, rng)
  const seed = randomSeed(rng)
  return {
    currentShapeId: current,
    nextShapeId: next,
    transitionStartTime: now,
    transitionDurationMs: randomTransitionDuration(rng),
    cycleSeed: seed,
    direction: rng() > 0.5 ? 1 : -1,
    lfoPhaseA: rng() * Math.PI * 2,
    lfoPhaseB: rng() * Math.PI * 2,
    lfoPhaseC: rng() * Math.PI * 2,
    transitionCache: createTransitionCache(current, next, now, seed, preset),
  }
}

function updatePsyHypMorphingState(
  state: PsyHypMorphingState,
  now: number,
  preset: PsyHypPreset,
  rng: () => number,
  quality: PsyHypQuality = 'balanced',
): PsyHypMorphingState {
  if (now - state.transitionStartTime < state.transitionDurationMs) return state

  const previous = state.currentShapeId
  const current = state.nextShapeId
  const next = pickNextRandomShape(preset.shapes, current, previous, rng)
  const seed = randomSeed(rng)

  return {
    ...state,
    previousShapeId: previous,
    currentShapeId: current,
    nextShapeId: next,
    transitionStartTime: now,
    transitionDurationMs: randomTransitionDuration(rng),
    cycleSeed: seed,
    direction: rng() > 0.5 ? 1 : -1,
    lfoPhaseA: rng() * Math.PI * 2,
    lfoPhaseB: rng() * Math.PI * 2,
    lfoPhaseC: rng() * Math.PI * 2,
    transitionCache: createTransitionCache(current, next, now, seed, preset, quality),
  }
}

function findProfile(preset: PsyHypPreset, id: PsyHypShapeId): PsyHypDrawProfile {
  return preset.shapes.find((shape) => shape.id === id)?.drawProfile ?? preset.shapes[0].drawProfile
}

function polar(angle: number, radius: number, scaleY = 1): Point {
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * scaleY }
}

function rotatePoint(point: Point, angle: number): Point {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return {
    ...point,
    x: point.x * c - point.y * s,
    y: point.x * s + point.y * c,
  }
}

function generateShapePoints(
  shapeId: PsyHypShapeId,
  count: number,
  t: number,
  seed: number,
  profile: PsyHypDrawProfile,
): Point[] {
  const points: Point[] = []
  const edge = edgeNoiseAmount(profile)

  for (let i = 0; i < count; i++) {
    const u = count <= 1 ? 0 : i / (count - 1)
    const angle = u * Math.PI * 2
    const noise = softNoise(seed, i, t, edge)
    let point: Point

    switch (shapeId) {
      case 'disco': {
        const arc = Math.PI * 2 * profile.closure
        const a = -arc * 0.5 + u * arc + Math.sin(t * 0.09 + seed) * 0.18
        const r = 0.57 + noise
        point = { x: Math.cos(a) * r + 0.06 * Math.sin(seed), y: Math.sin(a) * r * 0.92, alpha: 0.78 }
        break
      }
      case 'onda': {
        const lane = Math.floor(u * 3)
        const local = (u * 3) % 1
        const x = -0.94 + local * 1.88
        const y =
          (lane - 1) * 0.22 +
          Math.sin(local * Math.PI * 5.2 + t * 0.24 + seed * 0.01 + lane) * 0.13 +
          Math.sin(local * Math.PI * 11 + seed) * 0.035
        point = { x, y, alpha: seededUnit(seed, i) > 0.18 ? 0.82 : 0.18, weight: 0.7 }
        break
      }
      case 'spirale': {
        const a = u * Math.PI * 5.6 * profile.closure + t * 0.06 + seed * 0.001
        const r = 0.07 + u * 0.82
        point = { x: Math.cos(a) * r * 0.90, y: Math.sin(a) * r * 0.62, alpha: Math.sin(u * Math.PI) }
        break
      }
      case 'portale': {
        const a = angle * 0.92 + Math.sin(t * 0.08 + seed) * 0.08
        const wobble = 1 + Math.sin(a * 3 + seed) * 0.045 + noise
        point = { x: Math.cos(a) * 0.48 * wobble, y: Math.sin(a) * 0.75 * wobble, alpha: 0.76 }
        break
      }
      case 'ingranaggio': {
        const tooth = Math.floor(u * 22) % 2
        const missing = seededUnit(seed, Math.floor(u * 22)) < 0.18
        const r = 0.47 + tooth * 0.10 + noise * 0.75
        point = { ...polar(angle + t * 0.04, r, 0.94), alpha: missing ? 0.16 : 0.74 }
        break
      }
      case 'torre': {
        const side = u < 0.5 ? -1 : 1
        const v = u < 0.5 ? u * 2 : (1 - u) * 2
        const width = 0.09 + Math.pow(1 - v, 1.7) * 0.20
        const plume = v > 0.82 ? Math.sin((v - 0.82) * Math.PI * 8 + seed) * 0.09 : 0
        point = { x: side * width + plume + noise, y: 0.78 - v * 1.56, alpha: 0.76 }
        break
      }
      case 'griglia': {
        const cols = 12
        const rows = 8
        const cell = i % (cols * rows)
        const row = Math.floor(cell / cols)
        const col = cell % cols
        const missing = seededUnit(seed, cell) < 0.22
        point = {
          x: (col / (cols - 1) - 0.5) * 1.45 + noise,
          y: (row / (rows - 1) - 0.5) * 1.15 + softNoise(seed + 13, i, t, edge * 0.5),
          alpha: missing ? 0.08 : 0.68,
          weight: 0.55,
        }
        break
      }
      case 'globo': {
        const r = 0.54 + noise * 0.5
        point = { ...polar(angle + t * 0.025, r, 0.88), alpha: 0.70 }
        break
      }
      case 'sole': {
        const ray = Math.floor(u * 19)
        const isRay = ray % 2 === 0 && seededUnit(seed, ray) > 0.30
        const r = 0.39 + (isRay ? 0.17 + seededUnit(seed, ray + 99) * 0.12 : 0.05) + noise
        point = { ...polar(angle, r, 0.94), alpha: isRay ? 0.62 : 0.78 }
        break
      }
      case 'fiamma': {
        const yNorm = Math.sin(angle)
        const width = 0.16 + (1 - (yNorm + 1) * 0.5) * 0.23
        point = {
          x: Math.cos(angle) * width * (1 + softNoise(seed, i, t, 1.1)),
          y: yNorm * 0.66 - 0.05 + Math.sin(angle * 2 + seed) * 0.045,
          alpha: 0.74,
        }
        break
      }
      case 'libro': {
        const left = u < 0.5
        const local = left ? u * 2 : (u - 0.5) * 2
        const side = left ? -1 : 1
        point = {
          x: side * (0.08 + local * 0.68),
          y: 0.16 + Math.sin(local * Math.PI) * 0.16 + (local - 0.5) * 0.10,
          alpha: 0.68,
        }
        break
      }
      case 'seme': {
        const r = 0.44 + Math.sin(angle - 0.8) * 0.06 + noise
        point = { x: Math.cos(angle) * r * 0.78, y: Math.sin(angle) * r * 1.16 - Math.cos(angle) * 0.05, alpha: 0.78 }
        break
      }
      case 'radice': {
        const branch = Math.floor(u * 7)
        const local = (u * 7) % 1
        const spread = (branch - 3) * 0.10 * (0.25 + local)
        point = {
          x: spread + Math.sin(local * Math.PI * 3.5 + branch + seed) * 0.09,
          y: 0.82 - local * 1.55 + branch * 0.015,
          alpha: 0.60 + local * 0.25,
          weight: 0.5,
        }
        break
      }
      case 'sentiero': {
        point = {
          x: -0.46 + u * 0.94 + Math.sin(u * Math.PI * 2.4 + seed) * 0.13,
          y: 0.78 - u * 1.42,
          alpha: 1 - u * 0.55,
          weight: 0.55,
        }
        break
      }
      case 'strumento': {
        const side = u < 0.5 ? -1 : 1
        const local = u < 0.5 ? u * 2 : (1 - u) * 2
        const base = { x: -0.56 + local * 1.12, y: side * (0.08 + (1 - local) * 0.10) + noise }
        point = { ...rotatePoint(base, -0.62), alpha: 0.72 }
        break
      }
      case 'mano': {
        const lobes = Math.sin(angle * 5 + seed * 0.01) * 0.10 + Math.sin(angle * 9) * 0.035
        const r = 0.38 + lobes + noise
        point = { x: Math.cos(angle) * r * 0.88, y: Math.sin(angle) * r * 1.10 + 0.05, alpha: 0.62 }
        break
      }
      case 'occhio': {
        point = { x: Math.cos(angle) * 0.66, y: Math.sin(angle) * 0.27 + noise * 0.3, alpha: 0.78 }
        break
      }
      case 'nebbia': {
        const ring = Math.floor(u * 4)
        const local = (u * 4) % 1
        const a = local * Math.PI * 2 + ring * 1.3 + t * 0.035
        const r = 0.20 + ring * 0.15 + seededUnit(seed, i) * 0.13
        point = { x: Math.cos(a) * r + softNoise(seed, i, t, 0.08), y: Math.sin(a) * r * 0.70, alpha: 0.28 }
        break
      }
      case 'capsula': {
        const taper = 1 - Math.max(0, -Math.sin(angle)) * 0.18
        point = { x: Math.cos(angle) * 0.34 * taper + noise, y: Math.sin(angle) * 0.72, alpha: 0.76 }
        break
      }
      case 'condotto': {
        const a = angle * 0.92
        point = { x: Math.cos(a) * 0.78, y: Math.sin(a) * 0.24 + Math.sin(Math.cos(a) * 4 + seed) * 0.045, alpha: 0.68 }
        break
      }
      case 'blocco': {
        const local = u * 4
        const side = Math.floor(local)
        const v = local - side
        const corners = [
          { x: -0.54, y: -0.48 },
          { x: 0.48, y: -0.40 },
          { x: 0.56, y: 0.42 },
          { x: -0.48, y: 0.50 },
        ]
        const a = corners[side % 4]
        const b = corners[(side + 1) % 4]
        point = { x: lerp(a.x, b.x, v) + noise, y: lerp(a.y, b.y, v) + softNoise(seed + 7, i, t, edge), alpha: 0.74 }
        break
      }
      case 'triangolo': {
        const local = u * 3
        const side = Math.floor(local)
        const v = local - side
        const vertices = [
          { x: -0.08, y: -0.66 },
          { x: 0.62, y: 0.50 },
          { x: -0.58, y: 0.44 },
        ]
        const a = vertices[side % 3]
        const b = vertices[(side + 1) % 3]
        const broken = seededUnit(seed, side * 11 + Math.floor(v * 5)) < 0.18
        point = { x: lerp(a.x, b.x, v) + noise, y: lerp(a.y, b.y, v) + softNoise(seed + 3, i, t, edge), alpha: broken ? 0.14 : 0.70 }
        break
      }
      case 'frattura': {
        point = {
          x: Math.sin(u * Math.PI * 8 + seed) * 0.12 + Math.sin(u * Math.PI * 2) * 0.08,
          y: 0.78 - u * 1.56,
          alpha: 0.75,
          weight: 0.45,
        }
        break
      }
      case 'luna': {
        const r = 0.48 + noise * 0.4
        point = { x: Math.cos(angle) * r * 0.88 + 0.08, y: Math.sin(angle) * r * 1.08, alpha: 0.66 }
        break
      }
      default:
        point = { ...polar(angle, 0.5), alpha: 0.6 }
        break
    }

    points.push(point)
  }

  return points
}

function isClosedProfile(profile: PsyHypDrawProfile): boolean {
  return profile.closure >= 0.52
}

function pointDistance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function interpolatePoint(a: Point, b: Point, t: number): Point {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    radius: lerp(a.radius ?? 1, b.radius ?? 1, t),
    alpha: lerp(a.alpha ?? 1, b.alpha ?? 1, t),
    weight: lerp(a.weight ?? 1, b.weight ?? 1, t),
  }
}

function resamplePoints(points: Point[], targetCount: number, closed: boolean): Point[] {
  if (points.length === 0) return []
  if (points.length === 1) return Array.from({ length: targetCount }, () => ({ ...points[0] }))

  const path = closed ? [...points, points[0]] : points
  const lengths: number[] = [0]
  for (let i = 1; i < path.length; i++) {
    lengths.push(lengths[i - 1] + pointDistance(path[i - 1], path[i]))
  }

  const total = lengths[lengths.length - 1]
  if (total <= 0.000001) return Array.from({ length: targetCount }, (_, i) => ({ ...points[i % points.length] }))

  const result: Point[] = []
  let segment = 1
  for (let i = 0; i < targetCount; i++) {
    const u = closed ? i / targetCount : i / Math.max(1, targetCount - 1)
    const target = total * u
    while (segment < lengths.length - 1 && lengths[segment] < target) segment += 1
    const previousLength = lengths[segment - 1]
    const nextLength = lengths[segment]
    const local = nextLength === previousLength ? 0 : (target - previousLength) / (nextLength - previousLength)
    result.push(interpolatePoint(path[segment - 1], path[segment], local))
  }

  return result
}

function rotateArray<T>(items: T[], offset: number): T[] {
  if (items.length === 0) return items
  const k = ((offset % items.length) + items.length) % items.length
  return [...items.slice(k), ...items.slice(0, k)]
}

function computeDistanceScore(pointsA: Point[], pointsB: Point[]): number {
  const count = Math.min(pointsA.length, pointsB.length)
  let score = 0
  for (let i = 0; i < count; i++) {
    const dx = pointsA[i].x - pointsB[i].x
    const dy = pointsA[i].y - pointsB[i].y
    score += dx * dx + dy * dy
  }
  return score / Math.max(1, count)
}

function alignPointSequence(pointsA: Point[], pointsB: Point[], closed: boolean): Point[] {
  if (pointsA.length !== pointsB.length || pointsA.length < 3) return pointsB

  if (!closed) {
    const reversed = [...pointsB].reverse()
    return computeDistanceScore(pointsA, reversed) < computeDistanceScore(pointsA, pointsB) ? reversed : pointsB
  }

  let bestOffset = 0
  let bestScore = Number.POSITIVE_INFINITY
  for (let offset = 0; offset < pointsB.length; offset += 4) {
    const score = computeDistanceScore(pointsA, rotateArray(pointsB, offset))
    if (score < bestScore) {
      bestScore = score
      bestOffset = offset
    }
  }

  for (let offset = Math.max(0, bestOffset - 4); offset <= Math.min(pointsB.length - 1, bestOffset + 4); offset++) {
    const score = computeDistanceScore(pointsA, rotateArray(pointsB, offset))
    if (score < bestScore) {
      bestScore = score
      bestOffset = offset
    }
  }

  return rotateArray(pointsB, bestOffset)
}

function buildStableShapePoints(
  shapeId: PsyHypShapeId,
  t: number,
  seed: number,
  profile: PsyHypDrawProfile,
  targetCount = PSY_POINT_COUNT,
): Point[] {
  const raw = generateShapePoints(shapeId, targetCount * 2, t, seed, profile)
  return resamplePoints(raw, targetCount, isClosedProfile(profile))
}

function pointCountForShape(shapeId: PsyHypShapeId, quality: PsyHypQuality = 'balanced'): number {
  if (quality === 'low') return 64
  if (shapeId === 'nebbia') return 48
  if (shapeId === 'griglia' || shapeId === 'frattura') return 64
  if (shapeId === 'onda' || shapeId === 'radice') return 72
  return PSY_POINT_COUNT
}

function createTransitionCache(
  currentShapeId: PsyHypShapeId,
  nextShapeId: PsyHypShapeId,
  now: number,
  seed: number,
  preset: PsyHypPreset,
  quality: PsyHypQuality = 'balanced',
): PsyHypTransitionCache {
  const profileA = findProfile(preset, currentShapeId)
  const profileB = findProfile(preset, nextShapeId)
  const pointCount = Math.max(pointCountForShape(currentShapeId, quality), pointCountForShape(nextShapeId, quality))
  const t = now * 0.001
  const currentPoints = buildStableShapePoints(currentShapeId, t, seed, profileA, pointCount)
  const nextPointsRaw = buildStableShapePoints(nextShapeId, t, seed + 1013, profileB, pointCount)
  const nextPoints = alignPointSequence(currentPoints, nextPointsRaw, isClosedProfile(profileA) && isClosedProfile(profileB))

  return {
    currentShapeId,
    nextShapeId,
    currentPoints,
    nextPoints,
    currentStructure: [resamplePoints(currentPoints, PSY_STRUCTURE_POINT_COUNT, isClosedProfile(profileA))],
    nextStructure: [resamplePoints(nextPoints, PSY_STRUCTURE_POINT_COUNT, isClosedProfile(profileB))],
    generatedAt: now,
    seed,
  }
}

function morphPoints(pointsA: Point[], pointsB: Point[], progress: number, bodyTwist: number): Point[] {
  const count = Math.min(pointsA.length, pointsB.length)
  const points: Point[] = []
  for (let i = 0; i < count; i++) {
    const a = pointsA[i]
    const b = pointsB[i]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const length = Math.hypot(dx, dy) || 1
    const localWeight = lerp(a.weight ?? 1, b.weight ?? 1, progress)
    const curveAmount = Math.sin(progress * Math.PI) * clamp((0.035 + bodyTwist * 0.035) * localWeight, 0, 0.075)
    points.push({
      x: lerp(a.x, b.x, progress) + (-dy / length) * curveAmount,
      y: lerp(a.y, b.y, progress) + (dx / length) * curveAmount,
      radius: lerp(a.radius ?? 1, b.radius ?? 1, progress),
      alpha: lerp(a.alpha ?? 1, b.alpha ?? 1, progress),
      weight: localWeight,
    })
  }
  return points
}

function applyPsyDeformation(
  points: Point[],
  t: number,
  seed: number,
  audio: PsyHypAudioEnvelope,
  phase: PsyTransitionPhase,
): Point[] {
  const phaseConfig = phaseSettings(phase)
  const highDetail = clamp(audio.highDetail, 0, 0.18)
  const twistAmount =
    (0.18 + audio.bodyTwist * 0.20 + Math.sin(t * 0.09 + seed) * 0.08) *
    (1 + audio.bodyTwist * 0.35) *
    phaseConfig.twistMultiplier *
    phaseConfig.deformationMultiplier
  const deformation =
    (0.10 + audio.bodyTwist * 0.18 + highDetail * 0.07) *
    (1 + audio.bodyTwist * 0.30 + highDetail * 0.18) *
    phaseConfig.noiseMultiplier *
    phaseConfig.deformationMultiplier
  const asymmetry = Math.sin(seed * 0.0009) * 0.035

  return points.map((point, index) => {
    const r = Math.hypot(point.x, point.y)
    let angle = Math.atan2(point.y, point.x)
    angle += twistAmount * r * Math.sin(t * 0.17 + seed)
    let x = Math.cos(angle) * r
    let y = Math.sin(angle) * r
    x += Math.sin(t * 0.23 + y * 2.7 + seed + index * 0.013) * deformation * 0.04
    y += Math.cos(t * 0.19 + x * 2.1 + seed + index * 0.017) * deformation * 0.04
    x += y * y * asymmetry
    return { ...point, x, y }
  })
}

function buildPath(ctx: CanvasRenderingContext2D, points: Point[], scale: number, closedness: number, seed: number) {
  if (points.length === 0) return
  ctx.beginPath()
  ctx.moveTo(points[0].x * scale, points[0].y * scale)

  for (let i = 1; i < points.length; i++) {
    const point = points[i]
    const previous = points[i - 1]
    const broken = closedness < 0.35 && i % 11 === 0
    const granularBreak = seededUnit(seed, i) < 0.035
    if (broken || granularBreak || (point.alpha ?? 1) < 0.12 || (previous.alpha ?? 1) < 0.12) {
      ctx.moveTo(point.x * scale, point.y * scale)
    } else {
      const cx = (previous.x + point.x) * 0.5 * scale
      const cy = (previous.y + point.y) * 0.5 * scale
      ctx.quadraticCurveTo(previous.x * scale, previous.y * scale, cx, cy)
    }
  }

  if (closedness > 0.72) ctx.closePath()
}

function drawCoreDetails(
  ctx: CanvasRenderingContext2D,
  kind: PsyHypDrawProfile['kind'],
  scale: number,
  colors: { base: RGBColor; intensity: RGBColor; flash: RGBColor; complementary: RGBColor },
  alpha: number,
  structureAlpha: number,
  t: number,
  seed: number,
  eventGlow: number,
) {
  const guideAlpha = clamp(alpha * structureAlpha + eventGlow * 0.08, 0.035, 0.34)

  if (kind === 'waveField') {
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.strokeStyle = rgba(colors.intensity, guideAlpha)
    ctx.lineWidth = Math.max(1.2, scale * 0.008)
    ctx.lineCap = 'round'
    for (let row = 0; row < 3; row++) {
      ctx.beginPath()
      for (let i = 0; i <= 36; i++) {
        const u = i / 36
        const x = -scale * 0.72 + u * scale * 1.44
        const y =
          (row - 1) * scale * 0.135 +
          Math.sin(u * Math.PI * (4.4 + row * 0.22) + t * 0.22 + seed + row) * scale * 0.055
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  if (kind === 'spiral') {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = rgba(colors.intensity, guideAlpha * 1.2)
    ctx.lineWidth = Math.max(1.4, scale * 0.010)
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (let i = 0; i <= 64; i++) {
      const u = i / 64
      const a = u * Math.PI * 4.4 + t * 0.04 + seed * 0.001
      const r = scale * (0.04 + u * 0.48)
      const x = Math.cos(a) * r * 0.92
      const y = Math.sin(a) * r * 0.68
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.restore()
  }

  if (kind === 'grid') {
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.strokeStyle = rgba(colors.intensity, guideAlpha * 0.85)
    ctx.lineWidth = Math.max(1, scale * 0.006)
    for (let i = -2; i <= 2; i++) {
      if (seededUnit(seed, i + 30) > 0.78) continue
      ctx.beginPath()
      ctx.moveTo(-scale * 0.58, i * scale * 0.12 + Math.sin(t * 0.08 + i) * scale * 0.015)
      ctx.lineTo(scale * 0.58, i * scale * 0.12 + Math.cos(t * 0.07 + i) * scale * 0.015)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(i * scale * 0.14, -scale * 0.43)
      ctx.lineTo(i * scale * 0.14 + Math.sin(t * 0.06 + i) * scale * 0.02, scale * 0.43)
      ctx.stroke()
    }
    ctx.restore()
  }

  if (kind === 'aperture' || kind === 'eyeLike' || kind === 'lunar') {
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = 'rgba(0, 0, 0, 0.24)'
    ctx.beginPath()
    ctx.ellipse(0, 0, scale * 0.22, scale * (kind === 'eyeLike' ? 0.11 : 0.28), Math.sin(t * 0.08 + seed) * 0.18, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  if (kind === 'orbitalBody' || kind === 'lunar') {
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.strokeStyle = rgba(colors.complementary, alpha * 0.18)
    ctx.lineWidth = Math.max(1, scale * 0.008)
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.ellipse(0, 0, scale * (0.48 + i * 0.08), scale * (0.12 + i * 0.045), t * 0.05 + seed * 0.001 + i * 0.7, 0, Math.PI * 1.65)
      ctx.stroke()
    }
    ctx.restore()
  }

  if (kind === 'radiant') {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = rgba(colors.intensity, alpha * 0.16 + eventGlow * 0.08)
    ctx.lineWidth = Math.max(1, scale * 0.012)
    for (let i = 0; i < 8; i++) {
      if (seededUnit(seed, i) < 0.18) continue
      const a = (i / 8) * Math.PI * 2 + Math.sin(t * 0.04 + seed) * 0.2
      const inner = scale * (0.22 + seededUnit(seed, i + 77) * 0.10)
      const outer = scale * (0.44 + seededUnit(seed, i + 91) * 0.22)
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner)
      ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer)
      ctx.stroke()
    }
    ctx.restore()
  }

  if (kind === 'verticalMass' || kind === 'flame') {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const grad = ctx.createLinearGradient(0, scale * 0.48, 0, -scale * 0.62)
    grad.addColorStop(0, rgba(colors.base, guideAlpha * 0.18))
    grad.addColorStop(0.45, rgba(colors.intensity, guideAlpha))
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.ellipse(0, -scale * 0.05, scale * 0.13, scale * 0.58, Math.sin(t * 0.05 + seed) * 0.08, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  if (kind === 'openSurface') {
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.strokeStyle = rgba(colors.intensity, guideAlpha)
    ctx.lineWidth = Math.max(1, scale * 0.007)
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(0, scale * 0.14)
      ctx.quadraticCurveTo(side * scale * 0.28, scale * 0.05, side * scale * 0.58, scale * 0.18)
      ctx.stroke()
    }
    ctx.restore()
  }

  if (kind === 'branching' || kind === 'path' || kind === 'fracture') {
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.strokeStyle = rgba(kind === 'fracture' ? colors.flash : colors.intensity, guideAlpha)
    ctx.lineWidth = Math.max(1.2, scale * (kind === 'fracture' ? 0.012 : 0.007))
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, scale * 0.58)
    for (let i = 1; i <= 8; i++) {
      const u = i / 8
      ctx.lineTo(
        Math.sin(u * Math.PI * 4 + seed) * scale * (kind === 'path' ? 0.16 : 0.08),
        scale * (0.58 - u * 1.12),
      )
    }
    ctx.stroke()
    if (kind === 'branching') {
      for (let i = 0; i < 5; i++) {
        const y = scale * (0.32 - i * 0.17)
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo((i % 2 === 0 ? -1 : 1) * scale * (0.18 + i * 0.03), y - scale * 0.12)
        ctx.stroke()
      }
    }
    ctx.restore()
  }

  if (kind === 'angular' || kind === 'conduit') {
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.strokeStyle = rgba(colors.intensity, guideAlpha)
    ctx.lineWidth = Math.max(1.3, scale * 0.009)
    ctx.lineCap = 'round'
    if (kind === 'angular') {
      ctx.beginPath()
      ctx.moveTo(-scale * 0.42, scale * 0.32)
      ctx.lineTo(-scale * 0.02, -scale * 0.50)
      ctx.lineTo(scale * 0.46, scale * 0.30)
      ctx.stroke()
    } else {
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath()
        ctx.ellipse(0, i * scale * 0.04, scale * 0.62, scale * 0.16, Math.sin(t * 0.05 + seed) * 0.08, 0, Math.PI * 1.72)
        ctx.stroke()
      }
    }
    ctx.restore()
  }
}

function drawPsyShapeLayer(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  profileA: PsyHypDrawProfile,
  profileB: PsyHypDrawProfile,
  progress: number,
  width: number,
  height: number,
  t: number,
  seed: number,
  audio: PsyHypAudioEnvelope,
  colors: { base: RGBColor; intensity: RGBColor; flash: RGBColor; complementary: RGBColor },
  layer: LayerSpec,
  recognitionBias: number,
  phase: PsyTransitionPhase,
) {
  const screenMin = Math.min(width, height)
  const screenMax = Math.max(width, height)
  const kind = progress < 0.5 ? profileA.kind : profileB.kind
  const fieldLike = kind === 'fogField' || kind === 'waveField' || kind === 'radiant'
  const largeMass = kind === 'orbitalBody' || kind === 'lunar' || kind === 'aperture' || kind === 'grid'
  const baseSize = fieldLike ? screenMax * 0.50 : screenMin * (largeMass ? 0.62 : 0.52)
  const size = baseSize * PSY_DEFAULT_SCALE * PSY_SCREEN_COVERAGE
  const lfoSlow = Math.sin(t * 0.11 + seed)
  const lfoMedium = Math.sin(t * 0.31 + seed * 1.7)
  const phaseConfig = phaseSettings(phase)
  const breath = audio.reactiveLow * 0.10 + audio.subBounce * 0.18
  const presence = audio.midGlow * 0.35
  const microDetail = audio.highDetail * 0.14
  const eventGlow = audio.flash * 0.20
  const globalScale = 1 + audio.subBounce * 0.18 + audio.kickBounce * 0.10
  const zoom = globalScale * (1 + breath + Math.sin(t * 0.07 + seed) * 0.035)
  const rotation =
    Math.sin(t * 0.05 * layer.speed * (1 + audio.reactiveLowMid * 0.18) + seed) * 0.25 +
    Math.sin(t * 0.13 * layer.speed * (1 + audio.reactiveLowMid * 0.18) + seed * 2.0) * 0.08

  const closedness = lerp(profileA.closure, profileB.closure, progress)
  const drawFill = layer.name !== 'structure' && (profileA.fillAllowed || profileB.fillAllowed || closedness > 0.52)
  const drawStroke = profileA.strokeAllowed || profileB.strokeAllowed || closedness < 0.38
  const layerScale = size * layer.scale * zoom * (1 + lfoSlow * 0.018)
  const structureAlpha = clamp(
    (0.22 + recognitionBias * 0.18 + (layer.name === 'structure' ? 0.08 : 0)) *
      phaseConfig.structureAlphaMultiplier,
    0.12,
    0.42,
  )
  const edgeGlow = clamp(0.18 + recognitionBias * 0.12 + eventGlow * 0.18, 0.10, 0.34)
  const layerAlpha =
    layer.name === 'aura'
      ? clamp((0.12 + audio.energy * 0.10 + eventGlow * 0.10) * phaseConfig.auraMultiplier, 0.08, 0.26)
      : layer.name === 'structure'
        ? structureAlpha
        : clamp(0.34 + audio.midGlow * 0.18 + audio.kickBounce * 0.08 + eventGlow * 0.16, 0.28, 0.64)
  const alpha = clamp(
    layerAlpha +
      presence * 0.25 +
      audio.kickBounce * 0.10 +
      eventGlow * 0.22 +
      recognitionBias * 0.08 * phaseConfig.recognitionBoost +
      lfoMedium * 0.025,
    layer.name === 'aura' ? 0.08 : PSY_MAIN_ALPHA_MIN * layer.alpha,
    PSY_MAIN_ALPHA_MAX,
  )
  const centerX = width * 0.5 + Math.sin(t * 0.09 + seed) * width * 0.018
  const centerY = height * 0.5 + Math.cos(t * 0.07 + seed * 0.7) * height * 0.018
  const flashMix = clamp(eventGlow * 0.7, 0, 0.18)
  const hotColor = mixColors(colors.intensity, colors.flash, flashMix)

  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate(rotation)
  const flashBlurBoost = eventGlow > 0.05 && layer.name !== 'structure' ? PSY_FLASH_GLOW_BLUR * eventGlow * 0.18 : 0
  ctx.filter = `blur(${Math.min(PSY_MAX_BLUR, layer.blur * phaseConfig.blurMultiplier + flashBlurBoost)}px)`
  ctx.globalCompositeOperation = layer.name === 'structure' ? 'lighter' : 'screen'

  if (drawFill) {
    buildPath(ctx, points, layerScale, closedness, seed)
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, layerScale * 0.92)
    gradient.addColorStop(0, rgba(hotColor, alpha * 0.62 + eventGlow * 0.18))
    gradient.addColorStop(0.42, rgba(colors.base, alpha * 0.36))
    gradient.addColorStop(0.78, rgba(colors.complementary, alpha * 0.055))
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = gradient
    ctx.fill()
  }

  if (drawStroke) {
    buildPath(ctx, points, layerScale, closedness, seed + 71)
    ctx.strokeStyle = rgba(hotColor, alpha * edgeGlow + eventGlow * 0.14)
    ctx.lineWidth = layer.lineWidth * (1 + audio.bodyTwist * 0.8 + recognitionBias * 0.28)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  if (layer.name === 'structure') {
    ctx.filter = `blur(${Math.min(PSY_STRUCTURE_BLUR, layer.blur)}px)`
    drawCoreDetails(ctx, kind, layerScale, colors, alpha, structureAlpha, t, seed, eventGlow + microDetail * 0.15)
  }
  ctx.restore()
}

function renderPsyHypMorphing(args: {
  ctx: CanvasRenderingContext2D
  canvas: HTMLCanvasElement
  trailCtx: CanvasRenderingContext2D
  trailCanvas: HTMLCanvasElement
  width: number
  height: number
  timestamp: number
  deltaMs: number
  preset: PsyHypPreset
  colors: {
    baseColor: string
    intensityColor: string
    flashColor: string
  }
  bands: BandEnergies
  visualState: {
    flashActive?: boolean
    flashIntensity?: number
  }
  state: PsyHypMorphingState
  audio: PsyHypAudioEnvelope
}) {
  const { ctx, trailCtx, trailCanvas, width, height, timestamp, deltaMs, preset, colors, visualState, state, audio } = args
  const t = timestamp * 0.001
  const rawProgress = (timestamp - state.transitionStartTime) / state.transitionDurationMs
  const progress = clamp(rawProgress, 0, 1)
  const phase = transitionPhase(progress)
  const phaseConfig = phaseSettings(phase)
  const localReverse = Math.sin(t * 0.17 + state.cycleSeed) * 0.012
  const finalMorphProgress = clamp(psyEase(progress, t, state.cycleSeed) + localReverse, 0, 1)
  const currentRecognition = progress < 0.35 ? 1 - progress / 0.35 : 0
  const nextRecognition = progress > 0.65 ? (progress - 0.65) / 0.35 : 0
  const recognition = Math.max(currentRecognition, nextRecognition)
  const recognitionBias =
    progress < 0.35
      ? (1 - easeInOutSine(progress / 0.35)) * phaseConfig.recognitionBoost
      : progress > 0.65
        ? easeInOutSine((progress - 0.65) / 0.35) * phaseConfig.recognitionBoost
        : 0
  const profileA = findProfile(preset, state.currentShapeId)
  const profileB = findProfile(preset, state.nextShapeId)
  const cache = state.transitionCache
  const morphed = applyPsyDeformation(
    morphPoints(cache.currentPoints, cache.nextPoints, finalMorphProgress, audio.bodyTwist),
    t,
    state.cycleSeed,
    audio,
    phase,
  )

  const base = hexToRgb(colors.baseColor)
  const intensity = hexToRgb(colors.intensityColor)
  const flash = hexToRgb(colors.flashColor)
  const complementary = rotateHue(mixColors(base, intensity, 0.45), Math.sin(t * 0.07 + state.lfoPhaseC) * 18)
  const audioTrailBoost = audio.energy * 0.05 * PSY_TRAIL_AUDIO_GAIN
  const phaseTrailOffset = phase === 'fusion' ? 0.015 : -0.025 * (1 + recognition * 0.5)
  const trailRetention = clamp(0.80 + audioTrailBoost + phaseTrailOffset, 0.80, PSY_MAX_TRAIL_RETENTION)
  const trailAlpha = Math.pow(trailRetention, Math.max(1, deltaMs) / 16.67)
  const flashTarget = visualState.flashIntensity ?? (visualState.flashActive ? 1 : 0)
  const eventGlow = clamp(Math.max(flashTarget, audio.flash), 0, 1) * 0.16

  trailCtx.save()
  trailCtx.globalCompositeOperation = 'destination-in'
  trailCtx.fillStyle = `rgba(0, 0, 0, ${trailAlpha})`
  trailCtx.fillRect(0, 0, width, height)
  trailCtx.restore()

  const baseLayers: LayerSpec[] = [
    { name: 'aura', scale: 1.30, blur: PSY_AURA_BLUR, alpha: 0.14 + eventGlow * 0.10, lineWidth: 8, speed: 0.54 },
    { name: 'silhouette', scale: 1.08, blur: PSY_SILHOUETTE_BLUR, alpha: 0.44 + eventGlow * 0.16, lineWidth: 5.8, speed: 0.82 },
    { name: 'structure', scale: 0.98, blur: PSY_STRUCTURE_BLUR, alpha: 0.26 + eventGlow * 0.10, lineWidth: 2.5, speed: 1.0 },
  ]
  const layers = baseLayers.slice(0, PSY_MAX_LAYERS)

  for (const layer of layers.filter((item) => item.name !== 'structure')) {
    drawPsyShapeLayer(
      trailCtx,
      morphed,
      profileA,
      profileB,
      finalMorphProgress,
      width,
      height,
      t,
      state.cycleSeed + (layer.name === 'aura' ? 17 : 31),
      audio,
      { base, intensity, flash, complementary },
      layer,
      recognitionBias,
      phase,
    )
  }

  if (DEBUG_PSY_HYP && timestamp - lastPsyHypDebugLogMs >= 1000) {
    lastPsyHypDebugLogMs = timestamp
    const screenMin = Math.min(width, height)
    const shapeScale = screenMin * 0.52 * PSY_SCREEN_COVERAGE * PSY_DEFAULT_SCALE
    console.info('[psy-hyp-debug]', {
      currentShapeId: state.currentShapeId,
      nextShapeId: state.nextShapeId,
      progress,
      morphProgress: finalMorphProgress,
      phase,
      low: audio.low,
      lowMid: audio.lowMid,
      mid: audio.mid,
      high: audio.high,
      subBounce: audio.subBounce,
      kickBounce: audio.kickBounce,
      bodyTwist: audio.bodyTwist,
      midGlow: audio.midGlow,
      pointCount: morphed.length,
      width,
      height,
      dpr: window.devicePixelRatio || 1,
      shapeScale,
    })
  }

  ctx.clearRect(0, 0, width, height)
  ctx.save()
  ctx.globalCompositeOperation = 'source-over'
  ctx.drawImage(trailCanvas, 0, 0, width, height)
  ctx.restore()

  const structureLayer = layers.find((layer) => layer.name === 'structure')
  if (structureLayer) {
    drawPsyShapeLayer(
      ctx,
      morphed,
      profileA,
      profileB,
      finalMorphProgress,
      width,
      height,
      t,
      state.cycleSeed + 47,
      audio,
      { base, intensity, flash, complementary },
      structureLayer,
      recognitionBias,
      phase,
    )
  }
}

function createInitialPsyHypAudioEnvelope(): PsyHypAudioEnvelope {
  return {
    low: 0,
    lowMid: 0,
    mid: 0,
    high: 0,
    flash: 0,
    lowTransient: 0,
    lowMidTransient: 0,
    midTransient: 0,
    highTransient: 0,
    energy: 0,
    previousLow: 0,
    previousLowMid: 0,
    previousMid: 0,
    previousHigh: 0,
    reactiveLow: 0,
    reactiveLowMid: 0,
    reactiveMid: 0,
    reactiveHigh: 0,
    subBounce: 0,
    kickBounce: 0,
    bodyTwist: 0,
    midGlow: 0,
    highDetail: 0,
  }
}

function updatePsyHypAudioEnvelope(audio: PsyHypAudioEnvelope, bands: BandEnergies, settings: AppSettings, flashTarget: number) {
  const previousLow = audio.low
  const previousLowMid = audio.lowMid
  const previousMid = audio.mid
  const previousHigh = audio.high

  audio.previousLow = previousLow
  audio.previousLowMid = previousLowMid
  audio.previousMid = previousMid
  audio.previousHigh = previousHigh

  audio.low = updateEnvelope(audio.low, bands.low, 0.22, 0.055)
  audio.lowMid = updateEnvelope(audio.lowMid, bands.lowMid, 0.20, 0.060)
  audio.mid = updateEnvelope(audio.mid, bands.mid, 0.18, 0.070)
  audio.high = updateEnvelope(audio.high, bands.high, 0.14, 0.050)

  audio.lowTransient = Math.max(0, audio.low - previousLow)
  audio.lowMidTransient = Math.max(0, audio.lowMid - previousLowMid)
  audio.midTransient = Math.max(0, audio.mid - previousMid)
  audio.highTransient = Math.max(0, audio.high - previousHigh)
  audio.energy = clamp(
    audio.low * 0.35 +
      audio.lowMid * 0.25 +
      audio.mid * 0.25 +
      audio.high * 0.15,
    0,
    1,
  )

  audio.reactiveLow = clamp(audio.low * PSY_AUDIO_GAIN, 0, 1)
  audio.reactiveLowMid = clamp(audio.lowMid * PSY_AUDIO_GAIN, 0, 1)
  audio.reactiveMid = clamp(audio.mid * PSY_AUDIO_GAIN, 0, 1)
  audio.reactiveHigh = clamp(audio.high * PSY_AUDIO_GAIN, 0, 1)

  const subMovement = settings.subMovement ?? PSY_SUB_MOVEMENT_FALLBACK
  const kickMovement = settings.kickMovement ?? PSY_KICK_MOVEMENT_FALLBACK
  audio.subBounce = clamp(audio.reactiveLow * subMovement * PSY_SUB_BOUNCE_GAIN, 0, 1.35)
  audio.kickBounce = clamp(audio.lowTransient * kickMovement * PSY_KICK_BOUNCE_GAIN, 0, 0.75)
  audio.bodyTwist = clamp(audio.reactiveLowMid * PSY_TWIST_GAIN + audio.lowMidTransient * 0.45, 0, 1.5)
  audio.midGlow = clamp(audio.reactiveMid * PSY_MID_GLOW_GAIN + audio.midTransient * 0.35, 0, 1.45)
  audio.highDetail = clamp(audio.reactiveHigh * PSY_HIGH_DETAIL_GAIN + audio.highTransient * 0.24, 0, 0.18)

  audio.flash = updateEnvelope(audio.flash, flashTarget, 0.22, 0.045)
}

export function createPsyHypMorphingCanvas(container: HTMLElement) {
  const canvas = document.createElement('canvas')
  canvas.className = 'morphing-layer psy-hyp-morphing-layer'
  canvas.style.position = 'absolute'
  canvas.style.inset = '0'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.pointerEvents = 'none'
  canvas.style.background = 'transparent'
  canvas.style.mixBlendMode = 'screen'
  canvas.style.zIndex = '2'
  container.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  const trailCanvas = document.createElement('canvas')
  const trailCtx = trailCanvas.getContext('2d')
  const rng = mulberry32((Date.now() ^ Math.floor(performance.now() * 1000)) >>> 0)

  let rafId = 0
  let currentSettings: AppSettings | null = null
  let currentBands: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }
  let currentWhiteMix = 0
  let isFlashing = false
  let state = initPsyHypMorphingState(performance.now(), PSY_HYP_DEFAULT_PRESET, rng)
  let lastTime = performance.now()
  let lastRenderAt = 0
  let quality: PsyHypQuality = 'balanced'
  let averageRenderMs = 0
  let slowFrameCount = 0
  let lastPerfLogAt = 0
  let cssWidth = 0
  let cssHeight = 0
  let currentDpr = 1
  const audio = createInitialPsyHypAudioEnvelope()

  const resize = () => {
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    currentDpr = Math.min(dpr, quality === 'low' ? 1 : PSY_MAX_DPR)
    const rect = canvas.getBoundingClientRect()
    cssWidth = rect.width || container.clientWidth
    cssHeight = rect.height || container.clientHeight
    canvas.width = Math.max(1, Math.floor(cssWidth * currentDpr))
    canvas.height = Math.max(1, Math.floor(cssHeight * currentDpr))
    trailCanvas.width = canvas.width
    trailCanvas.height = canvas.height
    ctx?.setTransform(currentDpr, 0, 0, currentDpr, 0, 0)
    ctx?.clearRect(0, 0, cssWidth, cssHeight)
    trailCtx?.setTransform(currentDpr, 0, 0, currentDpr, 0, 0)
    trailCtx?.clearRect(0, 0, cssWidth, cssHeight)
  }

  window.addEventListener('resize', resize)
  const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
  resizeObserver?.observe(container)
  resize()

  const render = (now: number) => {
    if (!ctx || !trailCtx || !currentSettings) {
      rafId = requestAnimationFrame(render)
      return
    }

    const targetInterval = quality === 'low' ? 1000 / 24 : PSY_MIN_FRAME_INTERVAL_MS
    const elapsedSinceRender = now - lastRenderAt
    if (elapsedSinceRender < targetInterval) {
      rafId = requestAnimationFrame(render)
      return
    }
    lastRenderAt = now

    const deltaMs = Math.min(80, Math.max(1, now - lastTime))
    lastTime = now
    state = updatePsyHypMorphingState(state, now, PSY_HYP_DEFAULT_PRESET, rng, quality)

    const flashTarget = currentWhiteMix !== 0 ? currentWhiteMix : isFlashing ? 1 : 0
    updatePsyHypAudioEnvelope(audio, currentBands, currentSettings, flashTarget)

    const renderStart = performance.now()
    renderPsyHypMorphing({
      ctx,
      canvas,
      trailCtx,
      trailCanvas,
      width: cssWidth,
      height: cssHeight,
      timestamp: now,
      deltaMs,
      preset: PSY_HYP_DEFAULT_PRESET,
      colors: {
        baseColor: currentSettings.basePinkColor,
        intensityColor: currentSettings.hotPinkColor,
        flashColor: currentSettings.whiteFlashColor,
      },
      bands: currentBands,
      visualState: {
        flashActive: isFlashing,
        flashIntensity: currentWhiteMix,
      },
      state,
      audio,
    })
    const renderMs = performance.now() - renderStart
    averageRenderMs = averageRenderMs === 0 ? renderMs : averageRenderMs * 0.94 + renderMs * 0.06
    slowFrameCount = averageRenderMs > 28 ? slowFrameCount + 1 : 0
    if (quality === 'balanced' && slowFrameCount > 120) {
      quality = 'low'
      slowFrameCount = 0
      state = {
        ...state,
        transitionCache: createTransitionCache(
          state.currentShapeId,
          state.nextShapeId,
          now,
          state.cycleSeed,
          PSY_HYP_DEFAULT_PRESET,
          quality,
        ),
      }
      resize()
      if (DEBUG_PSY_PERF) console.info('[psy-hyp-perf] switching to low quality')
    }
    if (DEBUG_PSY_PERF && now - lastPerfLogAt >= 2000) {
      lastPerfLogAt = now
      console.info('[psy-hyp-perf]', {
        fps: Math.round(1000 / Math.max(1, deltaMs)),
        averageRenderMs,
        pointCount: state.transitionCache.currentPoints.length,
        layerCount: PSY_MAX_LAYERS,
        dpr: currentDpr,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        currentShape: state.currentShapeId,
        nextShape: state.nextShapeId,
        quality,
      })
    }

    rafId = requestAnimationFrame(render)
  }

  rafId = requestAnimationFrame(render)

  return {
    setOpacity(opacity: number) {
      canvas.style.opacity = String(clamp(opacity, 0, 1))
    },
    updateState(payload: VisualStatePayload) {
      if (payload.settings) currentSettings = payload.settings
      if (payload.bandEnergies) currentBands = payload.bandEnergies
      isFlashing = !!payload.flashActive
      if (payload.flashIntensity !== undefined) {
        currentWhiteMix = payload.flashIntensity
      } else if (payload.whiteMix !== undefined) {
        currentWhiteMix = payload.whiteMix
      } else {
        currentWhiteMix = payload.flashActive ? 1 : 0
      }
    },
    destroy() {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      resizeObserver?.disconnect()
      canvas.remove()
    },
  }
}
