import type { Silhouette } from './repertoire'
import { rasterizePsicoFantasmaSilhouette } from './preparation'

export type PsicoFantasmaRegion = {
  id: string
  x: number
  y: number
  width: number
  height: number
  mask: Uint8Array
  /** Outer boundary of `mask`, ordered, closed implicitly, coordinates in [0,1]
   * relative to the region box. Smooth: it never traces the coarse detection
   * grid. Used by the geometric matcher (`shape.ts`). */
  contour: ReadonlyArray<readonly [number, number]>
}

const GRID_COLS = 64
const GRID_ROWS = 36
// The mass is found on the coarse grid (cheap) but the mask is resolved and
// smoothed at pixel resolution: the recognition zones must not look squared.
const MASK_SMOOTH_PASSES = 2
const CONTOUR_SIMPLIFY_PX = 1.2
const CONTOUR_MAX_POINTS = 256

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value))
}

/** Local raster analysis owned by PsicoFantasma. It finds coherent masses;
 * it does not classify or compare them with the repertoire.
 */
export function extractPsicoFantasmaRegions(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  limit: number,
): PsicoFantasmaRegion[] {
  if (rgba.length !== width * height * 4 || width < 8 || height < 8) {
    throw new Error('Invalid PsicoFantasma raster')
  }
  const luminance = new Float32Array(GRID_COLS * GRID_ROWS)
  let mean = 0
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const x = Math.min(width - 1, Math.floor((col + 0.5) * width / GRID_COLS))
      const y = Math.min(height - 1, Math.floor((row + 0.5) * height / GRID_ROWS))
      const offset = (y * width + x) * 4
      const value = (rgba[offset] * 0.299 + rgba[offset + 1] * 0.587 + rgba[offset + 2] * 0.114) / 255
      luminance[row * GRID_COLS + col] = value
      mean += value
    }
  }
  mean /= luminance.length
  let variance = 0
  luminance.forEach(value => { variance += (value - mean) ** 2 })
  const deviation = Math.sqrt(variance / luminance.length)
  const active = new Uint8Array(luminance.length)
  for (let row = 1; row < GRID_ROWS - 1; row++) {
    for (let col = 1; col < GRID_COLS - 1; col++) {
      const index = row * GRID_COLS + col
      const local = (
        luminance[index - 1] + luminance[index + 1]
        + luminance[index - GRID_COLS] + luminance[index + GRID_COLS]
      ) / 4
      const contrast = Math.abs(luminance[index] - local)
      const distance = Math.abs(luminance[index] - mean)
      if (contrast > Math.max(0.035, deviation * 0.32) || distance > Math.max(0.12, deviation * 0.85)) {
        active[index] = 1
      }
    }
  }
  // Close one-cell gaps so a figure remains a mass rather than edge fragments.
  const closed = active.slice()
  for (let row = 1; row < GRID_ROWS - 1; row++) for (let col = 1; col < GRID_COLS - 1; col++) {
    const index = row * GRID_COLS + col
    if (active[index]) continue
    let neighbours = 0
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      neighbours += active[index + dy * GRID_COLS + dx]
    }
    if (neighbours >= 5) closed[index] = 1
  }

  const visited = new Uint8Array(closed.length)
  const components: Array<{ cells: number[]; score: number }> = []
  for (let start = 0; start < closed.length; start++) {
    if (!closed[start] || visited[start]) continue
    const queue = [start]
    const cells: number[] = []
    visited[start] = 1
    while (queue.length) {
      const current = queue.pop()!
      cells.push(current)
      const col = current % GRID_COLS
      const row = Math.floor(current / GRID_COLS)
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        const x = col + dx
        const y = row + dy
        if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) continue
        const next = y * GRID_COLS + x
        if (closed[next] && !visited[next]) { visited[next] = 1; queue.push(next) }
      }
    }
    const score = cells.reduce((sum, index) => sum + Math.abs(luminance[index] - mean), 0)
    components.push({ cells, score })
  }
  components.sort((a, b) => b.score - a.score)
  // Bounds allentati + fallback garantito: un primo piano dominante (massa che
  // riempie quasi tutto il frame) o una figura piccola ma distinta devono
  // comunque produrre una regione — PsicoFantasma che emerge sul nulla è il
  // difetto «rileva poche forme». Si rifiuta solo una massa che è di fatto
  // l'intero frame (nessuna separazione figura/fondo) o puro rumore.
  const minCells = 12
  const maxCells = closed.length * 0.94
  const qualified = components.filter(
    component => component.cells.length >= minCells && component.cells.length <= maxCells,
  )
  const chosen = qualified.length > 0
    ? qualified
    : components.length > 0 && components[0].cells.length >= minCells
      ? [components[0]]
      : []
  return chosen.slice(0, Math.max(1, Math.min(3, limit))).map((component, regionIndex) => {
    let minCol = GRID_COLS, maxCol = 0, minRow = GRID_ROWS, maxRow = 0
    component.cells.forEach(index => {
      const col = index % GRID_COLS
      const row = Math.floor(index / GRID_COLS)
      minCol = Math.min(minCol, col); maxCol = Math.max(maxCol, col)
      minRow = Math.min(minRow, row); maxRow = Math.max(maxRow, row)
    })
    const pad = 2
    minCol = Math.max(0, minCol - pad); maxCol = Math.min(GRID_COLS - 1, maxCol + pad)
    minRow = Math.max(0, minRow - pad); maxRow = Math.min(GRID_ROWS - 1, maxRow + pad)
    const x = Math.floor(minCol * width / GRID_COLS)
    const y = Math.floor(minRow * height / GRID_ROWS)
    const right = Math.ceil((maxCol + 1) * width / GRID_COLS)
    const bottom = Math.ceil((maxRow + 1) * height / GRID_ROWS)
    const regionWidth = right - x
    const regionHeight = bottom - y

    const cellSet = new Set(component.cells)
    let foregroundLuminance = 0
    for (const cell of component.cells) foregroundLuminance += luminance[cell]
    foregroundLuminance /= component.cells.length
    let backgroundSum = 0
    let backgroundCount = 0
    for (let gridRow = minRow; gridRow <= maxRow; gridRow++) {
      for (let gridCol = minCol; gridCol <= maxCol; gridCol++) {
        const cell = gridRow * GRID_COLS + gridCol
        if (cellSet.has(cell)) continue
        backgroundSum += luminance[cell]
        backgroundCount++
      }
    }
    const backgroundLuminance = backgroundCount > 0 ? backgroundSum / backgroundCount : mean
    const mask = smoothRegionMask(
      rgba, width, height, x, y, regionWidth, regionHeight, cellSet,
      foregroundLuminance, backgroundLuminance,
    )
    return {
      id: `region-${regionIndex}-${minCol}-${minRow}-${maxCol}-${maxRow}`,
      x, y, width: regionWidth, height: regionHeight, mask,
      contour: traceRegionContour(mask, regionWidth, regionHeight),
    }
  })
}

/** Pixel-resolution figure/ground mask for one region. Coarse grid occupancy
 * gives the shape; per-pixel luminance deviation sharpens it; box-blur passes
 * round the boundary; the largest component is kept and its holes filled. The
 * result never carries the 7–8 px staircase of the detection grid.
 */
function smoothRegionMask(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  originX: number,
  originY: number,
  regionWidth: number,
  regionHeight: number,
  cellSet: Set<number>,
  foregroundLuminance: number,
  backgroundLuminance: number,
): Uint8Array {
  const size = regionWidth * regionHeight
  // Figure/ground split at the midpoint between the coarse component's mean
  // luminance and its surroundings — robust whether the figure is lighter or
  // darker than the background.
  const threshold = (foregroundLuminance + backgroundLuminance) / 2
  const foregroundSide = Math.sign(foregroundLuminance - threshold) || 1
  // Coarse component dilated by one cell: only a "near the mass" gate, wide
  // enough to let the true edge fall outside the cells whose centres were
  // sampled. The boundary itself is decided per pixel by the figure/ground
  // split, never by the grid — that is what removes the squared look.
  const nearMass = (gridCol: number, gridRow: number): boolean => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const gc = gridCol + dx
      const gr = gridRow + dy
      if (gc < 0 || gc >= GRID_COLS || gr < 0 || gr >= GRID_ROWS) continue
      if (cellSet.has(gr * GRID_COLS + gc)) return true
    }
    return false
  }
  let binary: Uint8Array = new Uint8Array(size)
  for (let py = 0; py < regionHeight; py++) {
    for (let px = 0; px < regionWidth; px++) {
      const imageX = originX + px
      const imageY = originY + py
      const gridCol = Math.min(GRID_COLS - 1, Math.floor(imageX * GRID_COLS / width))
      const gridRow = Math.min(GRID_ROWS - 1, Math.floor(imageY * GRID_ROWS / height))
      if (!nearMass(gridCol, gridRow)) continue
      const offset = (imageY * width + imageX) * 4
      const lum = (rgba[offset] * 0.299 + rgba[offset + 1] * 0.587 + rgba[offset + 2] * 0.114) / 255
      if ((Math.sign(lum - threshold) || 1) === foregroundSide) binary[py * regionWidth + px] = 1
    }
  }
  for (let pass = 0; pass < MASK_SMOOTH_PASSES; pass++) {
    binary = boxBlurThreshold(binary, regionWidth, regionHeight)
  }

  const largest = largestComponent(binary, regionWidth, regionHeight)
  const filled = fillEnclosedHoles(largest, regionWidth, regionHeight)
  const mask = new Uint8Array(size)
  let painted = 0
  for (let i = 0; i < size; i++) {
    if (filled[i]) { mask[i] = 255; painted++ }
  }
  if (painted > 0) return mask
  // Defensive fallback: never hand back an empty mask. Use raw coarse cells.
  for (let py = 0; py < regionHeight; py++) for (let px = 0; px < regionWidth; px++) {
    const gridCol = Math.min(GRID_COLS - 1, Math.floor((originX + px) * GRID_COLS / width))
    const gridRow = Math.min(GRID_ROWS - 1, Math.floor((originY + py) * GRID_ROWS / height))
    mask[py * regionWidth + px] = cellSet.has(gridRow * GRID_COLS + gridCol) ? 255 : 0
  }
  return mask
}

/** One box-blur pass on a 0/1 field, re-thresholded at the midpoint. Rounds
 * corners and drops single-pixel noise without moving the mass. */
function boxBlurThreshold(binary: Uint8Array, width: number, height: number): Uint8Array {
  const output = new Uint8Array(binary.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0
      let count = 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
        sum += binary[ny * width + nx]
        count++
      }
      output[y * width + x] = sum * 2 >= count ? 1 : 0
    }
  }
  return output
}

/** Largest 4-connected foreground component. Refinement must not fragment the
 * figure into detached specks. */
function largestComponent(binary: Uint8Array, width: number, height: number): Uint8Array {
  const label = new Int32Array(binary.length).fill(-1)
  const queue = new Int32Array(binary.length)
  let best: number[] = []
  for (let start = 0; start < binary.length; start++) {
    if (!binary[start] || label[start] >= 0) continue
    let head = 0
    let tail = 0
    queue[tail++] = start
    label[start] = start
    const cells: number[] = []
    while (head < tail) {
      const current = queue[head++]
      cells.push(current)
      const x = current % width
      const y = Math.floor(current / width)
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
        const next = ny * width + nx
        if (binary[next] && label[next] < 0) { label[next] = start; queue[tail++] = next }
      }
    }
    if (cells.length > best.length) best = cells
  }
  const output = new Uint8Array(binary.length)
  for (const index of best) output[index] = 1
  return output
}

/** Fill holes fully enclosed by the mask: flood the background inward from the
 * border, anything unreached is interior. */
function fillEnclosedHoles(mask: Uint8Array, width: number, height: number): Uint8Array {
  const outside = new Uint8Array(mask.length)
  const queue: number[] = []
  for (let x = 0; x < width; x++) {
    for (const y of [0, height - 1]) {
      const index = y * width + x
      if (!mask[index] && !outside[index]) { outside[index] = 1; queue.push(index) }
    }
  }
  for (let y = 0; y < height; y++) {
    for (const x of [0, width - 1]) {
      const index = y * width + x
      if (!mask[index] && !outside[index]) { outside[index] = 1; queue.push(index) }
    }
  }
  while (queue.length) {
    const current = queue.pop()!
    const x = current % width
    const y = Math.floor(current / width)
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
      const next = ny * width + nx
      if (!mask[next] && !outside[next]) { outside[next] = 1; queue.push(next) }
    }
  }
  const output = new Uint8Array(mask.length)
  for (let i = 0; i < mask.length; i++) output[i] = mask[i] || !outside[i] ? 1 : 0
  return output
}

/** Moore-neighbor trace of the outer boundary, then Douglas–Peucker. Returns
 * normalized [0,1] coordinates relative to the region box. */
function traceRegionContour(
  mask: Uint8Array,
  width: number,
  height: number,
): ReadonlyArray<readonly [number, number]> {
  let start = -1
  for (let i = 0; i < mask.length; i++) if (mask[i] > 127) { start = i; break }
  if (start < 0) return []
  const inside = (x: number, y: number): boolean =>
    x >= 0 && x < width && y >= 0 && y < height && mask[y * width + x] > 127
  const neighbour = [
    [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1],
  ] as const
  const startX = start % width
  const startY = Math.floor(start / width)
  const points: Array<[number, number]> = [[startX, startY]]
  let currentX = startX
  let currentY = startY
  let backtrack = 0
  const guardLimit = mask.length * 4
  for (let guard = 0; guard < guardLimit; guard++) {
    let advanced = false
    for (let step = 0; step < 8; step++) {
      const direction = (backtrack + 1 + step) % 8
      const nextX = currentX + neighbour[direction][0]
      const nextY = currentY + neighbour[direction][1]
      if (!inside(nextX, nextY)) continue
      backtrack = (direction + 4) % 8
      currentX = nextX
      currentY = nextY
      points.push([currentX, currentY])
      advanced = true
      break
    }
    if (!advanced) break
    if (currentX === startX && currentY === startY) break
  }
  const simplified = simplifyPolyline(points, CONTOUR_SIMPLIFY_PX)
  const budgeted = simplified.length > CONTOUR_MAX_POINTS
    ? simplified.filter((_, index) => index % Math.ceil(simplified.length / CONTOUR_MAX_POINTS) === 0)
    : simplified
  return budgeted.map(([x, y]) => [
    clamp((x + 0.5) / width), clamp((y + 0.5) / height),
  ] as const)
}

function simplifyPolyline(points: Array<[number, number]>, tolerance: number): Array<[number, number]> {
  if (points.length <= 2) return points
  let maxDistance = 0
  let split = 0
  const [ax, ay] = points[0]
  const [bx, by] = points[points.length - 1]
  const dx = bx - ax
  const dy = by - ay
  const lengthSquared = dx * dx + dy * dy
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i]
    const t = lengthSquared === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lengthSquared
    const clampedT = Math.max(0, Math.min(1, t))
    const distance = Math.hypot(px - (ax + clampedT * dx), py - (ay + clampedT * dy))
    if (distance > maxDistance) { maxDistance = distance; split = i }
  }
  if (maxDistance <= tolerance) return [points[0], points[points.length - 1]]
  const left = simplifyPolyline(points.slice(0, split + 1), tolerance)
  const right = simplifyPolyline(points.slice(split), tolerance)
  return [...left.slice(0, -1), ...right]
}

/** Direct global mask support for the geometric winner. This is a gate check,
 * not a second candidate matcher or a reusable shape descriptor.
 */
export function psicoFantasmaStructuralCoherence(
  region: PsicoFantasmaRegion,
  silhouette: Silhouette,
): number {
  const canonical = rasterizePsicoFantasmaSilhouette(silhouette)
  let intersection = 0
  let union = 0
  for (let y = 0; y < region.height; y++) for (let x = 0; x < region.width; x++) {
    const source = region.mask[y * region.width + x] > 127
    const side = Math.min(region.width, region.height)
    const left = (region.width - side) / 2
    const top = (region.height - side) / 2
    const cx = Math.floor((x + 0.5 - left) * 224 / side)
    const cy = Math.floor((y + 0.5 - top) * 224 / side)
    const target = cx >= 0 && cx < 224 && cy >= 0 && cy < 224
      && canonical[(cy * 224 + cx) * 4] < 128
    if (source && target) intersection++
    if (source || target) union++
  }
  return union ? clamp(intersection / union) : 0
}
