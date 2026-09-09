/** Local raster transport, used only in preparation, after the matcher has ranked the
 * candidate. Row spans drive deformation, never recognition or candidate choice.
 */
export function preparePsicoFantasmaDeformation(
  rgba: Uint8ClampedArray, source: Uint8Array, target: Uint8Array,
  width: number, height: number, steps: number,
): Uint8ClampedArray[] {
  if (rgba.length !== width * height * 4 || source.length !== width * height
    || target.length !== source.length || steps < 2) throw new Error('Invalid deformation raster')
  const spans = (mask: Uint8Array) => Array.from({ length: height }, (_, y) => {
    let left = width, right = -1
    for (let x = 0; x < width; x++) if (mask[y * width + x] > 127) {
      left = Math.min(left, x); right = x
    }
    return right < left ? null : { left, right }
  })
  const smoothSpans = (rows: ReturnType<typeof spans>) => rows.map((row, y) => {
    if (!row) return null
    const nearby = rows.slice(Math.max(0, y - 3), y + 4).filter(value => value !== null)
    return { left: nearby.reduce((sum, value) => sum + value.left, 0) / nearby.length,
      right: nearby.reduce((sum, value) => sum + value.right, 0) / nearby.length }
  })
  const from = smoothSpans(spans(source)), to = smoothSpans(spans(target))
  const extent = (rows: typeof from) => {
    const top = rows.findIndex(row => row !== null)
    let bottom = rows.length - 1
    while (bottom > top && !rows[bottom]) bottom--
    return top < 0 ? { top: 0, bottom: height - 1 } : { top, bottom }
  }
  const aExtent = extent(from), bExtent = extent(to)
  const rowAt = (rows: typeof from, y: number) => {
    const bounded = Math.max(0, Math.min(height - 1, y))
    const top = Math.floor(bounded), fraction = bounded - top
    const a = rows[top], b = rows[Math.min(height - 1, top + 1)]
    return a && b ? { left: a.left * (1 - fraction) + b.left * fraction,
      right: a.right * (1 - fraction) + b.right * fraction } : a ?? b
  }
  const sample = (x: number, y: number, channel: number) => {
    if (channel === 4 && (x < 0 || x > width - 1 || y < 0 || y > height - 1)) return 0
    const bx = Math.max(0, Math.min(width - 1, x)), by = Math.max(0, Math.min(height - 1, y))
    const left = Math.floor(bx), top = Math.floor(by), fx = bx - left, fy = by - top
    const at = (px: number, py: number) => channel === 4 ? source[py * width + px] : rgba[(py * width + px) * 4 + channel]
    const right = Math.min(width - 1, left + 1), bottom = Math.min(height - 1, top + 1)
    return (at(left, top) * (1 - fx) + at(right, top) * fx) * (1 - fy)
      + (at(left, bottom) * (1 - fx) + at(right, bottom) * fx) * fy
  }
  return Array.from({ length: steps }, (_, step) => {
    const output = new Uint8ClampedArray(rgba.length)
    const progress = step / (steps - 1)
    for (let y = 0; y < height; y++) {
      // Spatial delay, fixed for the image: no autonomous temporal oscillation.
      const delay = 0.16 * (0.5 + 0.5 * Math.cos(y / height * Math.PI * 4))
      const local = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)))
      const top = aExtent.top + (bExtent.top - aExtent.top) * local
      const bottom = aExtent.bottom + (bExtent.bottom - aExtent.bottom) * local
      const v = (y - top) / Math.max(1, bottom - top)
      const sy = aExtent.top + v * (aExtent.bottom - aExtent.top)
      const ty = bExtent.top + v * (bExtent.bottom - bExtent.top)
      const a = rowAt(from, sy), b = rowAt(to, ty)
      const left = a && b ? a.left + (b.left - a.left) * local : 0
      const right = a && b ? a.right + (b.right - a.right) * local : width - 1
      for (let x = 0; x < width; x++) {
        const index = y * width + x
        const sx = a && b ? a.left + (x - left) / Math.max(1, right - left) * (a.right - a.left) : x
        const originalAlpha = sample(sx, sy, 4)
        for (let c = 0; c < 3; c++) output[index * 4 + c] = sample(sx, sy, c)
        output[index * 4 + 3] = (originalAlpha * (1 - local) + target[index] * local)
          * sample(sx, sy, 3) / 255
      }
    }
    return output
  })
}
