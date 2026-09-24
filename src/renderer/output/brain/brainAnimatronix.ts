// ANIMATRONIX V1 — fase post-storia di Brain. Modulo autonomo e puro:
// analisi spaziale dei raster (punto di fuga, piani di profondità, massa
// occludente), undici grammatiche cinetiche, piano di storia, orologio con
// stato irreversibile. Il disegno vive in brainAnimatronixGl.ts. Nessuna
// generazione di immagini. La deroga Camera vale solo dentro ANIMATRONIX.
//
// RECURSIVE PORTAL rimossa (disp. Capo Supremo, 2026-09-22): entrava in un
// "varco" interno del raster per rivelare il successivo — un effetto letto
// come "buco della serratura", giudicato indesiderabile insieme a ogni altra
// rivelazione a iride/foro. TRAVERSAL e PERSPECTIVE MELT, che aprivano la
// stessa iride sul punto di fuga come propria transizione, ora usano un
// morph invece di aprire un varco (transizione `morph`, vedi sotto — A e B
// convergono ciascuno verso il proprio punto di fuga durante la
// dissolvenza, disp. Capo Supremo 2026-09-24: "le immagini devono
// morphare", non un crossfade piatto). Al suo posto: HYPNOTIC ZOOM, uno
// zoom continuo e ininterrotto verso il punto di fuga con lo stesso morph
// verso il raster successivo — motion graphics ipnotico, non un varco
// (brief `team/briefs/brief-animatronix-hypnotic-zoom-2026-09-22.md`).

export type AnimatronixGrammar =
  | 'traversal'
  | 'depth-fracture'
  | 'perspective-melt'
  | 'parallax-collapse'
  | 'occlusion-passage'
  | 'residual-space'
  | 'kinetic-match'
  | 'vertigo-lock'
  | 'hypnotic-zoom'
  | 'time-crush'
  | 'focus-inversion'

export type AnimatronixTransition =
  | 'morph'
  | 'fracture'
  | 'occlusion'
  | 'residual'
  | 'kinetic'
  | 'focus'

// Wave 2 (brief Ingegneria 22 settembre 2026): grammatiche ad alta salienza
// percettiva — violazione breve della previsione, poi nuova configurazione
// leggibile. Uso raro: al più due per storia, mai la stessa due storie di
// fila.
export const ANIMATRONIX_HIGH_SALIENCE: ReadonlySet<AnimatronixGrammar> = new Set([
  'kinetic-match',
  'vertigo-lock',
  'time-crush',
  'focus-inversion',
])
export const ANIMATRONIX_MAX_HIGH_SALIENCE_PER_STORY = 2

export type AnimatronixRegime =
  | 'unresolved'
  | 'pressurized'
  | 'decompression'
  | 'respiro-alto'
  | 'respiro-profondo'

export type AnimatronixStructure = {
  width: number
  height: number
  flatness: number
  depthConfidence: number
  traversalAxis: number
  lineCoherence: number
  massScore: number
  vanishing: { x: number; y: number }
  planeThresholds: [number, number]
  massCentroid: { x: number; y: number }
  massDir: 1 | -1
  massBounds: { x0: number; x1: number; y0: number; y1: number }
  depthGrid: Uint8Array
  massGrid: Uint8Array
  // Struttura locale saliente e compatta (volto, ruota, apertura, forma
  // geometrica isolata): usata da KINETIC MATCH come punto che "resta
  // corretto" e da VERTIGO LOCK come soggetto stabile.
  anchor: { x: number; y: number; score: number }
}

export const ANIMATRONIX_GRAMMARS: AnimatronixGrammar[] = [
  'traversal',
  'depth-fracture',
  'perspective-melt',
  'parallax-collapse',
  'occlusion-passage',
  'residual-space',
  'kinetic-match',
  'vertigo-lock',
  'hypnotic-zoom',
  'time-crush',
  'focus-inversion',
]

// Fase più lunga (disp. Capo Supremo, 2026-09-22/24): 32–48 s (era 26–40, prima 18–28)
// — più spazio per uno zoom ipnotico da percepire, non solo attraversarlo.
export const ANIMATRONIX_MIN_TOTAL_MS = 32_000
export const ANIMATRONIX_MAX_TOTAL_MS = 48_000
export const ANIMATRONIX_MAX_PRINCIPAL_GRAMMARS = 4
const BASE_TOTAL_MS = 38_000

const VIABILITY: Record<AnimatronixGrammar, number> = {
  traversal: 0.12,
  'depth-fracture': 0.1,
  'perspective-melt': 0.12,
  'parallax-collapse': 0.1,
  'occlusion-passage': 0.14,
  'residual-space': 0,
  'kinetic-match': 0.15,
  'vertigo-lock': 0.14,
  // HYPNOTIC ZOOM non ha bisogno di una struttura particolare (nessun varco,
  // nessuna massa): funziona su qualunque raster, fotografico o vettoriale.
  'hypnotic-zoom': 0,
  'time-crush': 0.1,
  'focus-inversion': 0.12,
}

const TRANSITION_OF: Record<AnimatronixGrammar, AnimatronixTransition> = {
  traversal: 'morph',
  'depth-fracture': 'fracture',
  'occlusion-passage': 'occlusion',
  'residual-space': 'residual',
  'perspective-melt': 'morph',
  'parallax-collapse': 'residual',
  'kinetic-match': 'kinetic',
  'vertigo-lock': 'residual',
  'hypnotic-zoom': 'morph',
  'time-crush': 'residual',
  'focus-inversion': 'focus',
}

const TRANSITION_START: Record<AnimatronixTransition, number> = {
  morph: 0.68,
  fracture: 0.62,
  occlusion: 0.5,
  residual: 0.76,
  kinetic: 0.58,
  focus: 0.55,
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const clamp01 = (v: number) => clamp(v, 0, 1)
const smoothstep01 = (v: number) => {
  const x = clamp01(v)
  return x * x * (3 - 2 * x)
}

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
    luma[i] = (0.2126 * rgba[o] + 0.7152 * rgba[o + 1] + 0.0722 * rgba[o + 2]) / 255
  }
  return luma
}

function boxBlur(src: Float32Array, w: number, h: number, radius: number): Float32Array {
  if (radius <= 0) return src.slice()
  const tmp = new Float32Array(w * h)
  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0
      let n = 0
      for (let k = -radius; k <= radius; k++) {
        const xx = x + k
        if (xx < 0 || xx >= w) continue
        sum += src[y * w + xx]
        n++
      }
      tmp[y * w + x] = sum / n
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0
      let n = 0
      for (let k = -radius; k <= radius; k++) {
        const yy = y + k
        if (yy < 0 || yy >= h) continue
        sum += tmp[yy * w + x]
        n++
      }
      out[y * w + x] = sum / n
    }
  }
  return out
}

function percentile(values: ArrayLike<number>, p: number): number {
  const sorted = Array.from(values).sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)))] ?? 0
}

function integralImage(src: Float32Array, w: number, h: number): Float64Array {
  const stride = w + 1
  const integral = new Float64Array(stride * (h + 1))
  for (let y = 0; y < h; y++) {
    let row = 0
    for (let x = 0; x < w; x++) {
      row += src[y * w + x]
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + row
    }
  }
  return integral
}

function boxMean(
  integral: Float64Array,
  w: number,
  h: number,
  cx: number,
  cy: number,
  r: number,
): { sum: number; area: number } {
  const stride = w + 1
  const x0 = Math.max(0, cx - r)
  const x1 = Math.min(w, cx + r + 1)
  const y0 = Math.max(0, cy - r)
  const y1 = Math.min(h, cy + r + 1)
  const sum =
    integral[y1 * stride + x1] -
    integral[y0 * stride + x1] -
    integral[y1 * stride + x0] +
    integral[y0 * stride + x0]
  return { sum, area: (x1 - x0) * (y1 - y0) }
}

export function neutralAnimatronixStructure(width = 8, height = 8): AnimatronixStructure {
  return {
    width,
    height,
    flatness: 1,
    depthConfidence: 0,
    traversalAxis: 0,
    lineCoherence: 0,
    massScore: 0,
    vanishing: { x: 0.5, y: 0.5 },
    planeThresholds: [0.34, 0.68],
    massCentroid: { x: 0.5, y: 0.5 },
    massDir: 1,
    massBounds: { x0: 0.4, x1: 0.6, y0: 0.4, y1: 0.6 },
    depthGrid: new Uint8Array(width * height).fill(128),
    massGrid: new Uint8Array(width * height),
    anchor: { x: 0.5, y: 0.5, score: 0 },
  }
}

export const FLAT_RASTER_STRUCTURE = neutralAnimatronixStructure()

type Blob = { cells: number[]; touchesBorder: boolean }

function findComponents(binary: Uint8Array, w: number, h: number): Blob[] {
  const visited = new Uint8Array(w * h)
  const found: Blob[] = []
  for (let start = 0; start < w * h; start++) {
    if (!binary[start] || visited[start]) continue
    const cells: number[] = []
    const stack = [start]
    visited[start] = 1
    let touches = false
    while (stack.length) {
      const i = stack.pop() as number
      cells.push(i)
      const x = i % w
      const y = (i / w) | 0
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touches = true
      const neighbours = [
        x > 0 ? i - 1 : -1,
        x < w - 1 ? i + 1 : -1,
        y > 0 ? i - w : -1,
        y < h - 1 ? i + w : -1,
      ]
      for (const n of neighbours) {
        if (n >= 0 && binary[n] && !visited[n]) {
          visited[n] = 1
          stack.push(n)
        }
      }
    }
    found.push({ cells, touchesBorder: touches })
  }
  return found
}

function findMass(binary: Uint8Array, w: number, h: number): Blob | null {
  let best: Blob | null = null
  for (const blob of findComponents(binary, w, h)) {
    const areaFrac = blob.cells.length / (w * h)
    if (areaFrac < 0.05 || areaFrac > 0.5) continue
    const value = blob.cells.length * (blob.touchesBorder ? 1 : 0.5)
    const bestValue = best ? best.cells.length * (best.touchesBorder ? 1 : 0.5) : -1
    if (value > bestValue) best = blob
  }
  return best
}

// `luma`: griglia in scala di grigi 0..1 (il chiamante la riduce, ~64x64).
export function analyzeAnimatronixRaster(
  luma: ArrayLike<number>,
  width: number,
  height: number,
): AnimatronixStructure {
  if (width < 12 || height < 12 || luma.length < width * height) {
    return neutralAnimatronixStructure()
  }
  const lum = Float32Array.from(luma as ArrayLike<number>).slice(0, width * height)
  const grad = new Float32Array(width * height)
  let total = 0
  let jxx = 0
  let jyy = 0
  let jxy = 0
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const i = y * width + x
      const gx = lum[i + 1] - lum[i]
      const gy = lum[i + width] - lum[i]
      grad[i] = Math.abs(gx) + Math.abs(gy)
      total += grad[i]
      jxx += gx * gx
      jyy += gy * gy
      jxy += gx * gy
    }
  }
  const cells = (width - 1) * (height - 1)
  const flatness = clamp01(1 - total / cells / 0.12)
  if (total <= 1e-6) return neutralAnimatronixStructure(width, height)

  const lineCoherence =
    jxx + jyy > 1e-9
      ? clamp01(Math.sqrt((jxx - jyy) ** 2 + 4 * jxy * jxy) / (jxx + jyy))
      : 0

  // Punto di fuga: cella centrale povera di struttura, incorniciata da
  // struttura densa (imbocco di corridoio, strada, tunnel, varco).
  const gradIntegral = integralImage(grad, width, height)
  let bestOpen = 0
  let vx = 0.5
  let vy = 0.5
  const innerR = Math.max(2, Math.round(width * 0.06))
  const outerR = Math.max(innerR + 3, Math.round(width * 0.22))
  for (let y = Math.round(height * 0.25); y < Math.round(height * 0.72); y++) {
    for (let x = Math.round(width * 0.2); x < Math.round(width * 0.8); x++) {
      const inner = boxMean(gradIntegral, width, height, x, y, innerR)
      const outer = boxMean(gradIntegral, width, height, x, y, outerR)
      const ringArea = outer.area - inner.area
      if (ringArea <= 0) continue
      const ring = (outer.sum - inner.sum) / ringArea
      const centre = inner.sum / inner.area
      const open = (ring - centre) / (ring + centre + 1e-6)
      if (open > bestOpen) {
        bestOpen = open
        vx = x / (width - 1)
        vy = y / (height - 1)
      }
    }
  }
  if (bestOpen < 0.15) {
    vx = 0.5
    vy = 0.5
  }

  const region = (x0: number, x1: number, y0: number, y1: number) => {
    let e = 0
    let l = 0
    let n = 0
    for (let y = Math.floor(y0 * height); y < Math.floor(y1 * height); y++) {
      for (let x = Math.floor(x0 * width); x < Math.floor(x1 * width); x++) {
        e += grad[y * width + x]
        l += lum[y * width + x]
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

  const left = region(0, 1 / 3, 0, 1)
  const centre = region(1 / 3, 2 / 3, 0, 1)
  const right = region(2 / 3, 1, 0, 1)
  const sides = (left.energy + right.energy) / 2
  const sideShare = sides / (sides + centre.energy + 1e-6)
  const symmetry =
    1 - Math.abs(left.energy - right.energy) / (left.energy + right.energy + 1e-6)
  const thirds = clamp01((sideShare - 0.5) * 3) * symmetry
  const traversalAxis = clamp01(0.5 * thirds + 0.5 * clamp01(bestOpen * 1.6)) * (1 - flatness)

  // Struttura locale saliente: picco di energia di bordo concentrata su una
  // piccola finestra, lontano dai margini (volto, ruota, apertura, forma
  // isolata) — proxy per un punto che KINETIC MATCH e VERTIGO LOCK possono
  // trattare come "identità" che attraversa il taglio.
  const anchorR = Math.max(2, Math.round(Math.min(width, height) * 0.09))
  let anchorBest = 0
  let ax = 0.5
  let ay = 0.5
  for (let y = Math.round(height * 0.12); y < Math.round(height * 0.88); y++) {
    for (let x = Math.round(width * 0.12); x < Math.round(width * 0.88); x++) {
      const win = boxMean(gradIntegral, width, height, x, y, anchorR)
      const density = win.sum / win.area
      if (density > anchorBest) {
        anchorBest = density
        ax = x / (width - 1)
        ay = y / (height - 1)
      }
    }
  }
  const gradP90 = Math.max(1e-6, percentile(grad, 0.9))
  const anchorScore = clamp01((anchorBest / gradP90 - 0.35) * 1.1)

  // Proxy di profondità: posizione verticale, densità di dettaglio e massa
  // scura. Non è una depth map reale; serve a separare grandi piani.
  const g95 = Math.max(1e-6, percentile(grad, 0.95))
  const detail = boxBlur(
    grad.map((v) => clamp01(v / g95)),
    width,
    height,
    3,
  )
  const darkness = boxBlur(lum.map((v) => 1 - v), width, height, 2)
  const rawDepth = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      rawDepth[i] = 0.4 * (y / (height - 1)) + 0.35 * detail[i] + 0.25 * darkness[i]
    }
  }
  const smooth = boxBlur(rawDepth, width, height, 2)
  let lo = Infinity
  let hi = -Infinity
  for (const v of smooth) {
    lo = Math.min(lo, v)
    hi = Math.max(hi, v)
  }
  const span = Math.max(1e-6, hi - lo)
  const depth = smooth.map((v) => (v - lo) / span)
  const depthGrid = new Uint8Array(width * height)
  for (let i = 0; i < depth.length; i++) depthGrid[i] = Math.round(clamp01(depth[i]) * 255)
  const planeThresholds: [number, number] = [
    percentile(depth, 0.34),
    percentile(depth, 0.68),
  ]
  const spread = percentile(depth, 0.9) - percentile(depth, 0.1)
  const depthConfidence = clamp01(
    (0.6 * bandEnergy * 2 + 0.4 * bandLuma * 2) * (1 - flatness) * clamp01(spread * 2),
  )

  // Massa occludente: componente scura o chiara, grande, che tocca il bordo.
  const blurred = boxBlur(lum, width, height, 1)
  const candidates: { cells: number[]; touchesBorder: boolean }[] = []
  for (const polarity of ['dark', 'light'] as const) {
    const cut = percentile(blurred, polarity === 'dark' ? 0.25 : 0.75)
    const binary = new Uint8Array(width * height)
    for (let i = 0; i < binary.length; i++) {
      binary[i] = polarity === 'dark' ? (blurred[i] <= cut ? 1 : 0) : (blurred[i] >= cut ? 1 : 0)
    }
    const found = findMass(binary, width, height)
    if (found) candidates.push(found)
  }
  const separationOf = (cells: number[]) => {
    const inside = new Uint8Array(width * height)
    let lumIn = 0
    for (const i of cells) {
      inside[i] = 1
      lumIn += lum[i]
    }
    let lumOut = 0
    for (let i = 0; i < lum.length; i++) if (!inside[i]) lumOut += lum[i]
    const outCount = Math.max(1, lum.length - cells.length)
    return Math.abs(lumIn / Math.max(1, cells.length) - lumOut / outCount)
  }
  const candidateValue = (c: { cells: number[]; touchesBorder: boolean }) =>
    c.cells.length * (c.touchesBorder ? 1 : 0.5) * clamp01(separationOf(c.cells) / 0.25)
  candidates.sort((a, b) => candidateValue(b) - candidateValue(a))
  const mass = candidates[0]
  const massGridFloat = new Float32Array(width * height)
  let massScore = 0
  let cx = 0.5
  let cy = 0.5
  const bounds = { x0: 1, x1: 0, y0: 1, y1: 0 }
  if (mass) {
    const inMass = new Uint8Array(width * height)
    for (const i of mass.cells) inMass[i] = 1
    // Riempie i buchi interni: la massa occlude, non è un retino.
    const outside = new Uint8Array(width * height)
    const stack: number[] = []
    const push = (i: number) => {
      if (!inMass[i] && !outside[i]) {
        outside[i] = 1
        stack.push(i)
      }
    }
    for (let x = 0; x < width; x++) {
      push(x)
      push((height - 1) * width + x)
    }
    for (let y = 0; y < height; y++) {
      push(y * width)
      push(y * width + width - 1)
    }
    while (stack.length) {
      const i = stack.pop() as number
      const x = i % width
      const y = (i / width) | 0
      if (x > 0) push(i - 1)
      if (x < width - 1) push(i + 1)
      if (y > 0) push(i - width)
      if (y < height - 1) push(i + width)
    }
    let filled = 0
    for (let i = 0; i < inMass.length; i++) if (inMass[i] || !outside[i]) filled++
    // Un anello che racchiude mezza scena non è una massa: niente riempimento.
    const useFill = filled <= 0.5 * inMass.length
    let sx = 0
    let sy = 0
    let n = 0
    for (let i = 0; i < inMass.length; i++) {
      if (inMass[i] || (useFill && !outside[i])) {
        massGridFloat[i] = 1
        const gx = (i % width) / (width - 1)
        const gy = ((i / width) | 0) / (height - 1)
        sx += gx
        sy += gy
        bounds.x0 = Math.min(bounds.x0, gx)
        bounds.x1 = Math.max(bounds.x1, gx)
        bounds.y0 = Math.min(bounds.y0, gy)
        bounds.y1 = Math.max(bounds.y1, gy)
        n++
      }
    }
    cx = n ? sx / n : 0.5
    cy = n ? sy / n : 0.5
    let lumIn = 0
    let lumOut = 0
    let nOut = 0
    for (let i = 0; i < lum.length; i++) {
      if (massGridFloat[i] > 0.5) lumIn += lum[i]
      else {
        lumOut += lum[i]
        nOut++
      }
    }
    const separation = Math.abs(lumIn / Math.max(1, n) - lumOut / Math.max(1, nOut))
    massScore =
      clamp01(n / (width * height) / 0.2) *
      (mass.touchesBorder ? 1 : 0.5) *
      clamp01(separation / 0.25)
  }

  const massBlur = boxBlur(massGridFloat, width, height, 1)
  const massGrid = new Uint8Array(width * height)
  for (let i = 0; i < massGrid.length; i++) massGrid[i] = Math.round(clamp01(massBlur[i]) * 255)

  return {
    width,
    height,
    flatness,
    depthConfidence,
    traversalAxis,
    lineCoherence,
    massScore,
    vanishing: { x: vx, y: vy },
    planeThresholds,
    massCentroid: { x: cx, y: cy },
    massDir: cx < 0.5 ? 1 : -1,
    massBounds: mass ? bounds : { x0: 0.4, x1: 0.6, y0: 0.4, y1: 0.6 },
    depthGrid,
    massGrid,
    anchor: { x: ax, y: ay, score: anchorScore },
  }
}

export function scoreAnimatronixGrammars(
  s: AnimatronixStructure,
): Record<AnimatronixGrammar, number> {
  return {
    traversal: s.traversalAxis,
    'depth-fracture': s.depthConfidence * 0.95,
    'perspective-melt': (s.lineCoherence * 0.6 + s.traversalAxis * 0.4) * (1 - s.flatness),
    'parallax-collapse': s.depthConfidence * 0.85,
    'occlusion-passage': s.massScore,
    'residual-space': 0.1 + 0.05 * (1 - s.flatness),
    // KINETIC MATCH: serve un'identità locale forte, che possa "restare
    // corretta" mentre il resto cambia.
    'kinetic-match': s.anchor.score,
    // VERTIGO LOCK: un soggetto (anchor o massa) da bloccare, più profondità
    // reale da deformare dietro di lui.
    'vertigo-lock': Math.max(s.anchor.score, s.massScore * 0.8) * 0.6 + s.depthConfidence * 0.4,
    // HYPNOTIC ZOOM: nessun requisito strutturale, funziona ovunque; legge
    // leggermente meglio con un punto di fuga o un asse percorribile (più
    // avvincente da attraversare con lo zoom) ma non li richiede.
    'hypnotic-zoom': 0.4 + 0.25 * s.traversalAxis,
    // TIME CRUSH modula un moto già in corso: serve un vettore forte da
    // desincronizzare fra primo piano e sfondo.
    'time-crush': Math.max(s.traversalAxis, s.depthConfidence, s.massScore * 0.7) * 0.85,
    // FOCUS INVERSION: serve una separazione di piani credibile.
    'focus-inversion': s.depthConfidence * 0.9 + (1 - s.flatness) * 0.08,
  }
}

export const isAnimatronixViable = (grammar: AnimatronixGrammar, score: number) =>
  score >= VIABILITY[grammar]

export type AnimatronixRegimeProfile = {
  durationScale: number
  travel: number
  metabolism: number
}

// Metabolismo Visual per stato: pressione e velocità non sono sinonimi.
export function animatronixRegimeProfile(
  regime: AnimatronixRegime,
): AnimatronixRegimeProfile {
  switch (regime) {
    case 'respiro-profondo':
      return { durationScale: 1.15, travel: 1, metabolism: 0.9 }
    case 'respiro-alto':
      return { durationScale: 0.85, travel: 0.75, metabolism: 1.15 }
    case 'decompression':
      return { durationScale: 1.05, travel: 0.95, metabolism: 0.95 }
    case 'pressurized':
      return { durationScale: 1, travel: 0.6, metabolism: 1.05 }
    default:
      return { durationScale: 1, travel: 0.85, metabolism: 1 }
  }
}

export type AnimatronixSegment = {
  rasterIndex: number
  primary: AnimatronixGrammar
  secondary: AnimatronixGrammar | null
  durationMs: number
  transition: AnimatronixTransition | null
  transitionStart: number
  // HYPNOTIC ZOOM ANNIDATO: punto verso cui converge lo zoom di questo
  // segmento. Assente (o 'vp') per l'uso ordinario di HYPNOTIC ZOOM — zoom
  // verso il punto di fuga. 'anchor' per lo zoom annidato — zoom verso il
  // dettaglio significativo rilevato sul raster sorgente del segmento
  // (disp. Capo Supremo, 2026-09-22).
  zoomTarget?: 'vp' | 'anchor'
  // Seconda animazione a metà tratto (disp. Capo Supremo 2026-09-24: "fai
  // ruotare qualche animazione in più"): entra in dissolvenza di stato oltre
  // il 40% del segmento mentre la principale cala, così ogni raster mostra
  // due animazioni invece di una. Assente nelle storie annidate.
  handoff?: AnimatronixGrammar | null
}

export type AnimatronixPlan = {
  storyId: string
  seed: number
  segments: AnimatronixSegment[]
  totalMs: number
  principals: AnimatronixGrammar[]
  nextCursor: number
  // Grammatiche ad alta salienza usate in questa storia: da passare come
  // `avoidHighSalience` al piano della storia successiva.
  usedHighSalience: AnimatronixGrammar[]
  travel: number
  metabolism: number
  collapseMode: 1 | -1
  slipAngle: number
  bendSign: 1 | -1
}

export type PlanAnimatronixInput = {
  storyId: string
  structures: (AnimatronixStructure | null | undefined)[]
  regime?: AnimatronixRegime
  // Cursore di rotazione sul ciclo delle undici grammatiche: avanza a ogni
  // storia (vedi `nextCursor` del piano). Senza cursore parte da un punto
  // derivato dalla storia.
  cursor?: number
  // Grammatiche ad alta salienza usate nella storia precedente: nessuna di
  // queste può ripresentarsi come evento di questa storia (vedi
  // `usedHighSalience` del piano).
  avoidHighSalience?: AnimatronixGrammar[]
}

// Ordine di rotazione (priorità del brief): gli effetti si alternano in
// questo ciclo, storia dopo storia; la struttura del raster decide solo dove
// ciascun effetto cade e quali non sono praticabili. Le cinque grammatiche
// Wave 2 (alta salienza) sono interfogliate con le sei continue, cosicché
// una passeggiata di quattro-cinque passi sul ciclo ne raccolga
// naturalmente sia di continue sia (al più due) di alta salienza.
export const ANIMATRONIX_CYCLE: AnimatronixGrammar[] = [
  'traversal',
  'kinetic-match',
  'occlusion-passage',
  'hypnotic-zoom',
  'residual-space',
  'vertigo-lock',
  'depth-fracture',
  'time-crush',
  'parallax-collapse',
  'focus-inversion',
  'perspective-melt',
]

function enumerateSequences(
  principals: AnimatronixGrammar[],
  count: number,
): AnimatronixGrammar[][] {
  const results: AnimatronixGrammar[][] = []
  const walk = (seq: AnimatronixGrammar[]) => {
    if (seq.length === count) {
      if (principals.every((g) => seq.includes(g))) results.push(seq.slice())
      return
    }
    for (const g of principals) {
      const last = seq[seq.length - 1]
      if (last && last !== g && seq.slice(0, -1).includes(g)) continue
      if (seq.length >= 2 && seq[seq.length - 1] === g && seq[seq.length - 2] === g) continue
      seq.push(g)
      walk(seq)
      seq.pop()
    }
  }
  walk([])
  return results
}

// Una storia = una frase di quattro eventi, uno per raster: quattro grammatiche
// distinte quando la struttura le consente, nessun ritorno
// A → B → A, contaminazione fra raster vicini, rotazione fra storie.
export function planAnimatronix(input: PlanAnimatronixInput): AnimatronixPlan {
  const seed = hashSeed(input.storyId)
  const rng = mulberry32(seed)
  const profile = animatronixRegimeProfile(input.regime ?? 'unresolved')
  const structures = input.structures.map((s) => s ?? FLAT_RASTER_STRUCTURE)
  const count = structures.length
  const scores = structures.map(scoreAnimatronixGrammars)

  const fit = (i: number, g: AnimatronixGrammar) =>
    isAnimatronixViable(g, scores[i][g]) ? scores[i][g] + 0.01 : 0
  const usableAnywhere = (grammar: AnimatronixGrammar) =>
    scores.some((_sc, i) => fit(i, grammar) > 0)

  // Rotazione: cammino sul ciclo delle undici grammatiche. Al più due
  // effetti ad alta salienza per storia; nessuno di quelli usati nella
  // storia precedente può ripresentarsi in questa. Una grammatica non
  // praticabile sulla struttura di questa storia viene saltata a favore
  // della successiva del ciclo.
  const cycleLen = ANIMATRONIX_CYCLE.length
  const startCursor = Math.max(0, Math.floor(input.cursor ?? seed % cycleLen)) % cycleLen
  const avoid = new Set(input.avoidHighSalience ?? [])
  const buildPrincipals = (respectAvoid: boolean): AnimatronixGrammar[] => {
    const picked: AnimatronixGrammar[] = []
    let highCount = 0
    for (let step = 0; step < cycleLen * 2 && picked.length < ANIMATRONIX_MAX_PRINCIPAL_GRAMMARS; step++) {
      const candidate = ANIMATRONIX_CYCLE[(startCursor + step) % cycleLen]
      if (picked.includes(candidate)) continue
      const isHigh = ANIMATRONIX_HIGH_SALIENCE.has(candidate)
      if (isHigh && highCount >= ANIMATRONIX_MAX_HIGH_SALIENCE_PER_STORY) continue
      if (isHigh && respectAvoid && avoid.has(candidate)) continue
      if (!usableAnywhere(candidate)) continue
      picked.push(candidate)
      if (isHigh) highCount++
    }
    return picked
  }
  let principals = buildPrincipals(true)
  if (principals.length < Math.min(ANIMATRONIX_MAX_PRINCIPAL_GRAMMARS, count)) {
    // Il divieto di ripetizione immediata non deve mai lasciare la storia
    // senza eventi sufficienti: se non basta, si ripiega ammettendolo.
    principals = buildPrincipals(false)
  }
  if (principals.length === 0) principals.push('residual-space')
  if (principals.length === 1 && count > 1) {
    const other = ANIMATRONIX_CYCLE.find((g) => !principals.includes(g))
    if (other) principals.push(other)
  }
  const usedHighSalience = principals.filter((g) => ANIMATRONIX_HIGH_SALIENCE.has(g))

  const candidates = enumerateSequences(principals, count)
  let sequence: AnimatronixGrammar[] = candidates[0] ?? Array(count).fill(principals[0])
  let bestValue = -Infinity
  for (const candidate of candidates) {
    const value =
      candidate.reduce((acc, g, i) => acc + fit(i, g), 0) + rng() * 0.02
    if (value > bestValue) {
      bestValue = value
      sequence = candidate
    }
  }

  const secondaryFor = (i: number): AnimatronixGrammar | null => {
    const primary = sequence[i]
    const previous = sequence[i - 1]
    if (!previous) {
      // Primo raster: nessuna grammatica precedente da cui contaminarsi —
      // ne prende in prestito una seconda praticabile, così anche il primo
      // tratto ruota più di un'animazione (disp. Capo Supremo 2026-09-24).
      const first = ANIMATRONIX_GRAMMARS.filter(
        (g) => g !== primary && g !== 'occlusion-passage' && g !== 'residual-space',
      )
        .map((g) => ({ g, value: fit(i, g) }))
        .filter((entry) => entry.value > 0)
        .sort((a, b) => b.value - a.value)[0]
      return first?.g ?? null
    }
    if (previous && previous !== primary) return previous
    if (previous === primary) {
      // L'occlusione è una transizione, non uno stato che si accumula: come
      // contaminazione non avrebbe alcun effetto.
      const alternative = ANIMATRONIX_GRAMMARS.filter(
        (g) => g !== primary && g !== 'occlusion-passage',
      )
        .map((g) => ({ g, value: fit(i, g) }))
        .filter((entry) => entry.value > 0)
        .sort((a, b) => b.value - a.value)[0]
      return alternative?.g ?? null
    }
    return null
  }

  const HANDOFF_POOL: AnimatronixGrammar[] = [
    'traversal',
    'depth-fracture',
    'perspective-melt',
    'parallax-collapse',
    'hypnotic-zoom',
  ]
  const handoffFor = (i: number): AnimatronixGrammar | null => {
    const primary = sequence[i]
    const next = sequence[i + 1]
    const avoid = new Set<AnimatronixGrammar>([primary])
    const secondary = secondaryFor(i)
    if (secondary) avoid.add(secondary)
    if (next) avoid.add(next)
    const options = HANDOFF_POOL.filter((g) => !avoid.has(g) && fit(i, g) > 0)
    if (options.length === 0) return null
    return options[Math.floor(rng() * options.length)]
  }

  const weights = structures.map(
    (s) => 1 + 0.5 * Math.max(s.traversalAxis, s.depthConfidence, s.massScore),
  )
  const weightSum = weights.reduce((a, b) => a + b, 0)
  const totalMs = clamp(
    BASE_TOTAL_MS * profile.durationScale,
    ANIMATRONIX_MIN_TOTAL_MS,
    ANIMATRONIX_MAX_TOTAL_MS,
  )

  const segments: AnimatronixSegment[] = sequence.map((primary, i) => {
    const transition = TRANSITION_OF[primary]
    return {
      rasterIndex: i,
      primary,
      secondary: secondaryFor(i),
      durationMs: (totalMs * weights[i]) / weightSum,
      transition,
      transitionStart: TRANSITION_START[transition],
      handoff: handoffFor(i),
    }
  })

  return {
    storyId: input.storyId,
    seed,
    segments,
    totalMs,
    principals,
    nextCursor: (startCursor + 3) % cycleLen,
    usedHighSalience,
    travel: profile.travel,
    metabolism: profile.metabolism,
    collapseMode: rng() < 0.5 ? 1 : -1,
    slipAngle: rng() * Math.PI * 2,
    bendSign: rng() < 0.5 ? 1 : -1,
  }
}

export type AnimatronixWorldState = {
  flight: number
  bend: number
  melt: number
  fracture: number
  collapse: number
  camera: number
  // Wave 2. `kinetic` cresce solo per costruire l'"impossibilità" attorno
  // all'ancora prima del taglio; `vertigo` deforma la profondità attorno al
  // soggetto bloccato; `focus` sposta il piano di attenzione fra primo
  // piano e sfondo. `crush` non accumula: è un impulso breve calcolato
  // direttamente dalla posizione nel segmento (vedi `crushPulse`).
  kinetic: number
  vertigo: number
  focus: number
  // HYPNOTIC ZOOM: fattore di zoom continuo verso il punto di fuga, mai
  // azzerato dentro la storia (irreversibile come gli altri canali) — lo
  // zoom ipnotico non torna mai indietro, solo rallenta in silenzio.
  zoom: number
}

export const ZERO_WORLD_STATE: AnimatronixWorldState = {
  flight: 0,
  bend: 0,
  melt: 0,
  fracture: 0,
  collapse: 0,
  camera: 0,
  kinetic: 0,
  vertigo: 0,
  focus: 0,
  zoom: 0,
}

// Quanto dello stato raggiunto il raster successivo eredita.
const CARRY: AnimatronixWorldState = {
  flight: 0.25,
  bend: 0.6,
  melt: 0.45,
  fracture: 0.35,
  collapse: 0.5,
  camera: 0.6,
  kinetic: 0.1,
  vertigo: 0.4,
  focus: 0.15,
  zoom: 0.55,
}

export function carryWorldState(state: AnimatronixWorldState): AnimatronixWorldState {
  return {
    flight: state.flight * CARRY.flight,
    bend: state.bend * CARRY.bend,
    melt: state.melt * CARRY.melt,
    fracture: state.fracture * CARRY.fracture,
    collapse: state.collapse * CARRY.collapse,
    camera: state.camera * CARRY.camera,
    kinetic: state.kinetic * CARRY.kinetic,
    vertigo: state.vertigo * CARRY.vertigo,
    focus: state.focus * CARRY.focus,
    zoom: state.zoom * CARRY.zoom,
  }
}

// Velocità di accumulo per secondo alla piena intensità della grammatica.
const RATE = {
  flight: 0.2,
  bend: 0.05,
  melt: 0.17,
  fracture: 0.09,
  collapse: 0.08,
  camera: 0.06,
  kinetic: 0.55,
  vertigo: 0.11,
  focus: 0.14,
  // Lento e continuo: uno zoom ipnotico si vede sul lungo periodo, non deve
  // saturare a metà dei ~26–40s della fase.
  zoom: 0.045,
}
const SECONDARY_WEIGHT = 0.35
const SILENT_SPEED_FLOOR = 0.3

// TIME CRUSH: non è un accumulo ma un impulso breve — "per alcuni istanti",
// non una deriva permanente. Un rigonfiamento triangolare centrato a metà
// del tratto ad alta salienza, con rampe morbide.
function crushPulse(u: number): number {
  const centre = 0.5
  const half = 0.24
  const d = Math.abs(u - centre)
  if (d > half) return 0
  return smoothstep01(1 - d / half)
}

export type AnimatronixFrame = {
  segmentIndex: number
  u: number
  speed: number
  done: boolean
  elapsedMs: number
  current: AnimatronixWorldState
  incoming: AnimatronixWorldState | null
  transition: { kind: AnimatronixTransition; progress: number } | null
  residual: number
  primary: AnimatronixGrammar
  // Impulso TIME CRUSH nel punto corrente del segmento (0 fuori dalla
  // finestra, 1 al centro): letto direttamente, non accumulato.
  crush: number
  // Lato del congelamento nel TIME CRUSH: true = primo piano fermo e sfondo
  // che continua, false = il contrario. Deciso una volta per segmento.
  crushForeground: boolean
}

// Inerzia: velocità con rampe d'ingresso e d'uscita, nessun easing
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

function grammarWeight(
  segment: AnimatronixSegment,
  grammar: AnimatronixGrammar,
  u: number,
): number {
  const handoffIn = segment.handoff ? smoothstep01((u - 0.4) / 0.2) : 0
  if (segment.primary === grammar) return smoothstep01(u / 0.2) * (1 - 0.6 * handoffIn)
  if (segment.handoff === grammar) return handoffIn
  if (segment.secondary === grammar) return SECONDARY_WEIGHT * (1 - smoothstep01(u / 0.6))
  return 0
}

// Stato irreversibile: ciò che accade modifica lo stato raggiunto. In
// silenzio la velocità decade e tutto resta congelato; alla ripresa si
// riparte da lì, senza reset.
export class AnimatronixClock {
  private elapsedMs = 0
  private speed = 0
  private state: AnimatronixWorldState = { ...ZERO_WORLD_STATE }
  private residual = 0
  private lastSegment = 0

  constructor(private readonly plan: AnimatronixPlan) {}

  advance(dtMs: number, active: boolean, energy = 0.5): AnimatronixFrame {
    const dt = Math.max(0, dtMs)
    // Mai un blocco secco (disp. Capo Supremo 2026-09-24: "deve essere
    // fluido"): senza beat rilevato la velocità scende a un piano minimo di
    // scorrimento lento invece di fermarsi del tutto.
    const tau = active ? 900 : 1800
    const target = active ? 1 : SILENT_SPEED_FLOOR
    this.speed += (target - this.speed) * (1 - Math.exp(-dt / tau))
    const stepMs = dt * this.speed
    this.elapsedMs = Math.min(this.plan.totalMs, this.elapsedMs + stepMs)
    const at = this.locate()
    if (at.index !== this.lastSegment) {
      this.state = carryWorldState(this.state)
      this.lastSegment = at.index
    }
    const seg = this.plan.segments[at.index]
    const seconds = stepMs / 1000
    const metabolism = this.plan.metabolism * (0.85 + 0.3 * clamp01(energy))
    const w = (g: AnimatronixGrammar) => grammarWeight(seg, g, at.u)
    const travel = this.plan.travel
    // TIME CRUSH modula un moto in corso: senza un vettore proprio da
        // deformare temporalmente non ci sarebbe nulla da "schiacciare" — gli
    // presta quindi un flusso simile al TRAVERSAL, un po' più lento.
    this.state.flight +=
      RATE.flight * travel * metabolism * (w('traversal') + w('time-crush') * 0.8) * seconds
    this.state.bend += RATE.bend * metabolism * (w('traversal') + w('perspective-melt')) * seconds
    this.state.melt += RATE.melt * metabolism * w('perspective-melt') * seconds
    this.state.fracture += RATE.fracture * metabolism * w('depth-fracture') * seconds
    this.state.collapse +=
      RATE.collapse * metabolism * w('parallax-collapse') *
      smoothstep01((at.u - 0.3) / 0.5) * seconds
    this.state.camera += RATE.camera * metabolism * (w('parallax-collapse') + 0.4 * w('depth-fracture')) * seconds
    this.state.kinetic += RATE.kinetic * metabolism * w('kinetic-match') * seconds
    this.state.vertigo += RATE.vertigo * metabolism * w('vertigo-lock') * seconds
    this.state.focus += RATE.focus * metabolism * w('focus-inversion') * seconds
    this.state.zoom += RATE.zoom * travel * metabolism * w('hypnotic-zoom') * seconds
    const residualTarget = w('residual-space') > 0 ? Math.max(0.55, w('residual-space')) : 0
    const residualRate = residualTarget > this.residual ? 0.6 : 0.25
    this.residual += (residualTarget - this.residual) * (1 - Math.exp(-seconds * residualRate))
    return this.frame()
  }

  private locate(): { index: number; u: number } {
    let remaining = this.elapsedMs
    const last = this.plan.segments.length - 1
    for (let i = 0; i <= last; i++) {
      const d = this.plan.segments[i].durationMs
      if (remaining < d || i === last) return { index: i, u: clamp01(remaining / d) }
      remaining -= d
    }
    return { index: last, u: 1 }
  }

  frame(): AnimatronixFrame {
    const at = this.locate()
    const seg = this.plan.segments[at.index]
    let transition: AnimatronixFrame['transition'] = null
    if (seg.transition && at.u > seg.transitionStart) {
      transition = {
        kind: seg.transition,
        progress: inertialProgress((at.u - seg.transitionStart) / (1 - seg.transitionStart)),
      }
    }
    return {
      segmentIndex: at.index,
      u: at.u,
      speed: this.speed,
      done: this.elapsedMs >= this.plan.totalMs,
      elapsedMs: this.elapsedMs,
      current: { ...this.state },
      incoming: transition ? carryWorldState(this.state) : null,
      transition,
      residual: this.residual,
      primary: seg.primary,
      crush: seg.primary === 'time-crush' ? crushPulse(at.u) : 0,
      crushForeground: (this.plan.seed + at.index) % 2 === 0,
    }
  }
}

// Utilità di collaudo: forza le grammatiche principali di un piano già
// costruito (stesse regole di contaminazione e transizione del planner).
export function withForcedGrammars(
  plan: AnimatronixPlan,
  grammars: AnimatronixGrammar[],
): AnimatronixPlan {
  const segments = plan.segments.map((segment, i) => {
    const primary = grammars[i] ?? segment.primary
    const previous = grammars[i - 1]
    const transition = TRANSITION_OF[primary]
    return {
      ...segment,
      primary,
      secondary: previous && previous !== primary ? previous : null,
      handoff: segment.handoff === primary ? null : segment.handoff,
      transition,
      transitionStart: TRANSITION_START[transition],
    }
  })
  return { ...plan, segments }
}

// Soglia minima di leggibilità del dettaglio. Partita da 0.15 (stessa scala
// di VIABILITY 'kinetic-match'), abbassata (Capo Supremo, 2026-09-23: "non
// viene mai generato") — a differenza di KINETIC MATCH, che ha quattro
// occasioni per storia (una qualunque delle quattro immagini può ospitarlo),
// qui SERVONO ENTRAMBI i punteggi di A e B contemporaneamente: con la
// probabilità di superare la soglia elevata al quadrato, 0.15 rendeva la
// modalità annidata di fatto irraggiungibile sui raster reali (morbidi,
// pittorici) anche quando KINETIC MATCH la superava regolarmente altrove
// nella stessa storia.
const NESTED_ZOOM_MIN_ANCHOR_SCORE = 0.05

export type NestedZoomResult = {
  plan: AnimatronixPlan
  // Presente solo quando applicato: coordinate del dettaglio target per i
  // due attraversamenti (A1 su A, B1 su B), per il log.
  targetA: { x: number; y: number } | null
  targetB: { x: number; y: number } | null
  // Non-null quando i requisiti non erano soddisfatti e si è rimasti sul
  // piano ordinario (brief FAILURE: mai una sequenza annidata incompleta).
  fallbackReason: string | null
}

// HYPNOTIC ZOOM ANNIDATO (disp. Capo Supremo, 2026-09-22): forza i primi due
// segmenti del piano a HYPNOTIC ZOOM con bersaglio il dettaglio (`anchor`)
// rilevato sul rispettivo raster sorgente, invece del punto di fuga — A →
// zoom in A1 → B → zoom in B1 → C. Il quarto segmento (C → ECO/uscita)
// resta quello scelto dal planner ordinario, non forzato (brief: "raccordata
// alla grammatica già esistente della storia"). Riusa `withForcedGrammars`:
// stesse regole di contaminazione/transizione del planner, nessuna logica
// di piano duplicata.
export function applyNestedZoomTargets(
  plan: AnimatronixPlan,
  structures: readonly AnimatronixStructure[],
): NestedZoomResult {
  if (structures.length < 3) {
    return { plan, targetA: null, targetB: null, fallbackReason: 'meno di tre raster disponibili' }
  }
  const anchorA = structures[0].anchor
  const anchorB = structures[1].anchor
  if (
    anchorA.score < NESTED_ZOOM_MIN_ANCHOR_SCORE ||
    anchorB.score < NESTED_ZOOM_MIN_ANCHOR_SCORE
  ) {
    return {
      plan,
      targetA: null,
      targetB: null,
      fallbackReason: 'nessun dettaglio abbastanza leggibile su A o su B',
    }
  }
  const forced = withForcedGrammars(plan, ['hypnotic-zoom', 'hypnotic-zoom'])
  const segments = forced.segments.map((segment, i) =>
    i < 2 ? { ...segment, zoomTarget: 'anchor' as const, handoff: null } : segment,
  )
  return {
    plan: { ...forced, segments },
    targetA: { x: anchorA.x, y: anchorA.y },
    targetB: { x: anchorB.x, y: anchorB.y },
    fallbackReason: null,
  }
}

export const MORPH_FLOW_SIZE = 32
const MORPH_FLOW_PATCH = 2
const MORPH_FLOW_SEARCH = 8
const MORPH_FLOW_PENALTY = 0.006
const MORPH_FLOW_MAX = 0.22

// Riduce una griglia luma quadrata `srcSize`² a MORPH_FLOW_SIZE² (media a
// blocchi): l'unica rappresentazione che il morph guarda.
export function downsampleLuma(
  src: ArrayLike<number>,
  srcSize: number,
): Float32Array {
  const n = MORPH_FLOW_SIZE
  const out = new Float32Array(n * n)
  const step = srcSize / n
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const x0 = Math.floor(x * step)
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * step))
      const y0 = Math.floor(y * step)
      const y1 = Math.max(y0 + 1, Math.floor((y + 1) * step))
      let sum = 0
      let count = 0
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          sum += src[yy * srcSize + xx] ?? 0
          count++
        }
      }
      out[y * n + x] = count ? sum / count : 0
    }
  }
  return out
}

// MORPH: flusso di corrispondenza A→B a block matching su griglia 32×32
// (patch 5×5, ricerca ±8 celle, penalità di spostamento così le zone senza
// struttura restano ferme), poi levigato. Restituisce [dx, dy] per cella in
// unità di UV dell'immagine A. Serve a far scorrere le forme di A verso le
// forme di B durante la transizione invece di sovrapporre due immagini.
export function computeMorphFlow(
  lumaA: ArrayLike<number>,
  lumaB: ArrayLike<number>,
): Float32Array {
  const n = MORPH_FLOW_SIZE
  const r = MORPH_FLOW_PATCH
  const s = MORPH_FLOW_SEARCH
  const at = (img: ArrayLike<number>, x: number, y: number) =>
    img[Math.min(n - 1, Math.max(0, y)) * n + Math.min(n - 1, Math.max(0, x))] ?? 0
  let fx: Float32Array = new Float32Array(n * n)
  let fy: Float32Array = new Float32Array(n * n)
  const area = (2 * r + 1) * (2 * r + 1)
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let best = Infinity
      let bx = 0
      let by = 0
      for (let dy = -s; dy <= s; dy++) {
        for (let dx = -s; dx <= s; dx++) {
          let sad = 0
          for (let py = -r; py <= r; py++) {
            for (let px = -r; px <= r; px++) {
              sad += Math.abs(at(lumaA, x + px, y + py) - at(lumaB, x + dx + px, y + dy + py))
            }
          }
          const cost = sad / area + MORPH_FLOW_PENALTY * Math.hypot(dx, dy)
          if (cost < best) {
            best = cost
            bx = dx
            by = dy
          }
        }
      }
      fx[y * n + x] = bx / n
      fy[y * n + x] = by / n
    }
  }
  for (let pass = 0; pass < 2; pass++) {
    fx = boxBlur(fx, n, n, 2)
    fy = boxBlur(fy, n, n, 2)
  }
  const out = new Float32Array(n * n * 2)
  for (let i = 0; i < n * n; i++) {
    const mag = Math.hypot(fx[i], fy[i])
    const k = mag > MORPH_FLOW_MAX ? MORPH_FLOW_MAX / mag : 1
    out[i * 2] = fx[i] * k
    out[i * 2 + 1] = fy[i] * k
  }
  return out
}
