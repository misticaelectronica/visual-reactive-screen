/** Descrittori geometrici di forma per il matcher open-set di PsicoFantasma
 * (PIANO-043 034-17, Opzione B autorizzata dal Consigliere 2026-09-08).
 *
 * Niente CLIP, niente embedding: il contorno della figura emersa dal raster e
 * le silhouette del repertorio vivono nello stesso dominio (la sagoma). Il
 * confronto è invariante per traslazione, scala e — per quanto possibile —
 * rotazione e punto di partenza. Nessun veto semantico: che una foglia e una
 * mano aperta condividano la Gestalt è il risultato voluto, non un errore
 * (brief Visual §12/§52). Modulo autonomo di PsicoFantasma.
 */

export type ShapeDescriptor = {
  /** 7 momenti di Hu, log-compressi con segno conservato. */
  hu: readonly number[]
  /** Armoniche di contorno a bassa frequenza, prima armonica normalizzata a 1
   *  (invarianza di scala); la magnitudine DFT dà invarianza al punto di start. */
  harmonics: readonly number[]
  /** sqrt(asse minore / asse maggiore) dell'ellisse d'inerzia: (0,1], 1 = tondo,
   *  ~0.1 = barra sottile. Invariante per rotazione/scala/traslazione. */
  elongation: number
  /** perimetro² / (4π·area): ≥1, →1 per un disco, grande per forme filiformi o
   *  molto frastagliate. Invariante per rotazione/scala/traslazione. */
  compactness: number
}

type Ring = ReadonlyArray<readonly [number, number]>

const RASTER = 96
const MARGIN = 2
const HARMONICS = 8
const CONTOUR_SAMPLES = 128

function rasterizeRingsSquare(rings: readonly Ring[]): Uint8Array {
  const grid = new Uint8Array(RASTER * RASTER)
  const span = RASTER - 2 * MARGIN
  for (let y = 0; y < RASTER; y++) {
    const py = (y + 0.5 - MARGIN) / span
    if (py < 0 || py > 1) continue
    const crossings: number[] = []
    for (const ring of rings) {
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i], b = ring[(i + 1) % ring.length]
        if ((a[1] > py) !== (b[1] > py)) {
          crossings.push(a[0] + (py - a[1]) * (b[0] - a[0]) / (b[1] - a[1]))
        }
      }
    }
    crossings.sort((m, n) => m - n)
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const left = Math.max(0, Math.ceil(MARGIN + crossings[i] * span - 0.5))
      const right = Math.min(RASTER, Math.ceil(MARGIN + crossings[i + 1] * span - 0.5))
      for (let x = left; x < right; x++) grid[y * RASTER + x] = 1
    }
  }
  return grid
}

/** La maschera pixel-accurata w×h della regione, letterbox-ata in RASTER² così
 * la figura conserva le proprie proporzioni prima del confronto. */
function letterboxMask(mask: Uint8Array, width: number, height: number): Uint8Array {
  const grid = new Uint8Array(RASTER * RASTER)
  const span = RASTER - 2 * MARGIN
  const scale = span / Math.max(width, height)
  const offX = (RASTER - width * scale) / 2
  const offY = (RASTER - height * scale) / 2
  for (let y = 0; y < RASTER; y++) {
    for (let x = 0; x < RASTER; x++) {
      const sx = Math.floor((x + 0.5 - offX) / scale)
      const sy = Math.floor((y + 0.5 - offY) / scale)
      if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue
      if (mask[sy * width + sx] > 127) grid[y * RASTER + x] = 1
    }
  }
  return grid
}

type Moments = {
  m00: number
  mu20: number; mu02: number; mu11: number
  mu30: number; mu03: number; mu21: number; mu12: number
}

function centralMoments(grid: Uint8Array): Moments {
  let m00 = 0, m10 = 0, m01 = 0
  for (let y = 0; y < RASTER; y++) for (let x = 0; x < RASTER; x++) {
    if (!grid[y * RASTER + x]) continue
    m00++; m10 += x; m01 += y
  }
  if (m00 === 0) return { m00: 0, mu20: 0, mu02: 0, mu11: 0, mu30: 0, mu03: 0, mu21: 0, mu12: 0 }
  const cx = m10 / m00, cy = m01 / m00
  let mu20 = 0, mu02 = 0, mu11 = 0, mu30 = 0, mu03 = 0, mu21 = 0, mu12 = 0
  for (let y = 0; y < RASTER; y++) for (let x = 0; x < RASTER; x++) {
    if (!grid[y * RASTER + x]) continue
    const dx = x - cx, dy = y - cy
    mu20 += dx * dx; mu02 += dy * dy; mu11 += dx * dy
    mu30 += dx * dx * dx; mu03 += dy * dy * dy
    mu21 += dx * dx * dy; mu12 += dx * dy * dy
  }
  return { m00, mu20, mu02, mu11, mu30, mu03, mu21, mu12 }
}

/** sqrt(minor/major axis) of the inertia ellipse from central 2nd moments. */
function elongationOf(m: Moments): number {
  if (m.m00 === 0) return 1
  const a = m.mu20 / m.m00, b = m.mu02 / m.m00, c = m.mu11 / m.m00
  const common = Math.sqrt(Math.max(0, (a - b) ** 2 + 4 * c * c))
  const major = (a + b + common) / 2
  const minor = (a + b - common) / 2
  if (major <= 1e-9) return 1
  return Math.sqrt(Math.max(0, minor) / major)
}

function huMoments(m: Moments): number[] {
  if (m.m00 === 0) return new Array<number>(7).fill(0)
  const { m00, mu20, mu02, mu11, mu30, mu03, mu21, mu12 } = m
  const eta = (mu: number, order: number) => mu / Math.pow(m00, 1 + order / 2)
  const n20 = eta(mu20, 2), n02 = eta(mu02, 2), n11 = eta(mu11, 2)
  const n30 = eta(mu30, 3), n03 = eta(mu03, 3), n21 = eta(mu21, 3), n12 = eta(mu12, 3)
  const s = n30 + n12, d = n21 + n03
  const h1 = n20 + n02
  const h2 = (n20 - n02) ** 2 + 4 * n11 ** 2
  const h3 = (n30 - 3 * n12) ** 2 + (3 * n21 - n03) ** 2
  const h4 = s ** 2 + d ** 2
  const h5 = (n30 - 3 * n12) * s * (s ** 2 - 3 * d ** 2)
    + (3 * n21 - n03) * d * (3 * s ** 2 - d ** 2)
  const h6 = (n20 - n02) * (s ** 2 - d ** 2) + 4 * n11 * s * d
  const h7 = (3 * n21 - n03) * s * (s ** 2 - 3 * d ** 2)
    - (n30 - 3 * n12) * d * (3 * s ** 2 - d ** 2)
  return [h1, h2, h3, h4, h5, h6, h7].map(value =>
    !Number.isFinite(value) || value === 0 ? 0 : Math.sign(value) * Math.log10(Math.abs(value)))
}

const NEIGHBOURS = [
  [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1],
] as const

function traceBoundary(grid: Uint8Array): Array<[number, number]> {
  let start = -1
  for (let i = 0; i < grid.length; i++) if (grid[i]) { start = i; break }
  if (start < 0) return []
  const inside = (x: number, y: number) =>
    x >= 0 && x < RASTER && y >= 0 && y < RASTER && grid[y * RASTER + x] === 1
  const startX = start % RASTER, startY = Math.floor(start / RASTER)
  let cx = startX, cy = startY, backtrack = 0
  const points: Array<[number, number]> = [[cx, cy]]
  for (let guard = 0; guard < grid.length * 4; guard++) {
    let advanced = false
    for (let step = 0; step < 8; step++) {
      const direction = (backtrack + 1 + step) % 8
      const nx = cx + NEIGHBOURS[direction][0]
      const ny = cy + NEIGHBOURS[direction][1]
      if (!inside(nx, ny)) continue
      backtrack = (direction + 4) % 8
      cx = nx; cy = ny
      points.push([cx, cy])
      advanced = true
      break
    }
    if (!advanced) break
    if (cx === startX && cy === startY) break
  }
  return points
}

function contourHarmonics(points: Array<[number, number]>): number[] {
  const empty = new Array<number>(HARMONICS - 1).fill(0)
  if (points.length < 8) return empty
  const cumulative = [0]
  for (let i = 1; i < points.length; i++) {
    cumulative.push(cumulative[i - 1]
      + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]))
  }
  const total = cumulative[cumulative.length - 1]
  if (total < 1e-6) return empty
  const samples: Array<[number, number]> = []
  let segment = 0
  for (let k = 0; k < CONTOUR_SAMPLES; k++) {
    const target = total * k / CONTOUR_SAMPLES
    while (segment < cumulative.length - 2 && cumulative[segment + 1] < target) segment++
    const length = cumulative[segment + 1] - cumulative[segment] || 1
    const t = (target - cumulative[segment]) / length
    const a = points[segment], b = points[segment + 1] ?? points[0]
    samples.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])])
  }
  let mx = 0, my = 0
  for (const [x, y] of samples) { mx += x; my += y }
  mx /= CONTOUR_SAMPLES; my /= CONTOUR_SAMPLES
  const magnitudes: number[] = []
  for (let harmonic = 1; harmonic <= HARMONICS; harmonic++) {
    let ar = 0, ai = 0, br = 0, bi = 0
    for (let k = 0; k < CONTOUR_SAMPLES; k++) {
      const angle = 2 * Math.PI * harmonic * k / CONTOUR_SAMPLES
      const cos = Math.cos(angle), sin = Math.sin(angle)
      const dx = samples[k][0] - mx, dy = samples[k][1] - my
      ar += dx * cos; ai += dx * sin; br += dy * cos; bi += dy * sin
    }
    magnitudes.push(Math.sqrt(ar * ar + ai * ai + br * br + bi * bi) / CONTOUR_SAMPLES)
  }
  const norm = magnitudes[0] || 1
  return magnitudes.slice(1).map(value => value / norm)
}

function polylineLength(points: Array<[number, number]>): number {
  let length = 0
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
  }
  return length
}

function describeGrid(grid: Uint8Array): ShapeDescriptor {
  const moments = centralMoments(grid)
  const boundary = traceBoundary(grid)
  const perimeter = polylineLength(boundary)
  const area = moments.m00
  const compactness = area > 0 && perimeter > 0
    ? Math.max(1, perimeter * perimeter / (4 * Math.PI * area))
    : 1
  return {
    hu: huMoments(moments),
    harmonics: contourHarmonics(boundary),
    elongation: elongationOf(moments),
    compactness,
  }
}

export function describeSilhouette(rings: readonly Ring[]): ShapeDescriptor {
  return describeGrid(rasterizeRingsSquare(rings))
}

export function describeRegionMask(mask: Uint8Array, width: number, height: number): ShapeDescriptor {
  return describeGrid(letterboxMask(mask, width, height))
}

/** Affinità di forma in [0,1]: 1 = stessa Gestalt, ~0.2 = forme estranee.
 * Combina distanza dei momenti di Hu e delle armoniche di contorno. Le costanti
 * di scala sono di taratura, non derivate da una quota di successo. */
export function shapeAffinity(a: ShapeDescriptor, b: ShapeDescriptor): number {
  let huDistance = 0
  for (let i = 0; i < 7; i++) huDistance += Math.abs((a.hu[i] ?? 0) - (b.hu[i] ?? 0))
  let harmonicDistance = 0
  const length = Math.min(a.harmonics.length, b.harmonics.length)
  for (let i = 0; i < length; i++) harmonicDistance += Math.abs(a.harmonics[i] - b.harmonics[i])
  const elongationSimilarity = Math.exp(-Math.abs(a.elongation - b.elongation) / 0.22)
  const compactnessSimilarity = Math.exp(-Math.abs(Math.log(a.compactness) - Math.log(b.compactness)) / 0.55)
  const huSimilarity = Math.exp(-huDistance / 6.5)
  const harmonicSimilarity = Math.exp(-harmonicDistance / 0.85)
  return Math.max(0, Math.min(1,
    0.30 * elongationSimilarity + 0.24 * compactnessSimilarity
    + 0.18 * huSimilarity + 0.28 * harmonicSimilarity))
}
