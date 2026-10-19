import type { CuratedSilhouette } from './repertoire'

/** Rasterizes already approved contours, using even-odd fill for essential voids.
 * No production, tracing, semantic inference or geometric matching of new silhouettes.
 */
export function rasterizePsicoFantasmaSilhouette(silhouette: CuratedSilhouette): Uint8ClampedArray {
  const size = 224
  const rgba = new Uint8ClampedArray(size * size * 4).fill(255)
  for (let y = 0; y < size; y++) {
    const py = (y + 0.5) / size
    const crossings: number[] = []
    for (const ring of silhouette.rings) {
      ring.forEach((a, i) => {
        const b = ring[(i + 1) % ring.length]
        if ((a[1] > py) !== (b[1] > py)) crossings.push(a[0] + (py - a[1]) * (b[0] - a[0]) / (b[1] - a[1]))
      })
    }
    crossings.sort((a, b) => a - b)
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const left = Math.max(0, Math.ceil(crossings[i] * size - 0.5))
      const right = Math.min(size, Math.ceil(crossings[i + 1] * size - 0.5))
      for (let x = left; x < right; x++) {
        const offset = (y * size + x) * 4
        rgba[offset] = rgba[offset + 1] = rgba[offset + 2] = 0
      }
    }
  }
  return rgba
}
