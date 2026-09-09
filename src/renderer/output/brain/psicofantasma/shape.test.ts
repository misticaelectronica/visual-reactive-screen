import { describe, expect, it } from 'vitest'
import { describeRegionMask, describeSilhouette, shapeAffinity } from './shape'

type Ring = [number, number][]
const square: Ring = [[0.15, 0.15], [0.85, 0.15], [0.85, 0.85], [0.15, 0.85]]
const bar: Ring = [[0.05, 0.45], [0.95, 0.45], [0.95, 0.55], [0.05, 0.55]]
const triangle: Ring = [[0.5, 0.1], [0.9, 0.9], [0.1, 0.9]]

function maskRect(w: number, h: number, x0: number, y0: number, x1: number, y1: number): Uint8Array {
  const mask = new Uint8Array(w * h)
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) mask[y * w + x] = 255
  return mask
}

describe('PsicoFantasma geometric shape descriptors', () => {
  it('a shape is identical to itself', () => {
    expect(shapeAffinity(describeSilhouette([square]), describeSilhouette([square]))).toBeCloseTo(1, 5)
  })

  it('distinguishes a compact shape from a thin bar', () => {
    const self = shapeAffinity(describeSilhouette([square]), describeSilhouette([square]))
    const cross = shapeAffinity(describeSilhouette([square]), describeSilhouette([bar]))
    expect(cross).toBeLessThan(self)
    expect(cross).toBeLessThan(0.75)
  })

  it('is invariant to translation and scale of the same shape', () => {
    const small: Ring = square.map(([x, y]) => [0.3 + x * 0.3, 0.3 + y * 0.3])
    expect(shapeAffinity(describeSilhouette([square]), describeSilhouette([small]))).toBeGreaterThan(0.9)
  })

  it('is largely invariant to rotation of the same shape', () => {
    const rotated: Ring = triangle.map(([x, y]) => {
      const dx = x - 0.5, dy = y - 0.5
      return [0.5 + dy, 0.5 - dx]
    })
    expect(shapeAffinity(describeSilhouette([triangle]), describeSilhouette([rotated]))).toBeGreaterThan(0.8)
  })

  it('matches a region mask against the silhouette of the same shape, aspect preserved', () => {
    // Square figure inside a tall region box: letterbox must keep it square.
    const w = 40, h = 80
    const region = describeRegionMask(maskRect(w, h, 8, 28, 32, 52), w, h)
    expect(shapeAffinity(region, describeSilhouette([square]))).toBeGreaterThan(0.75)
    expect(shapeAffinity(region, describeSilhouette([bar]))).toBeLessThan(
      shapeAffinity(region, describeSilhouette([square])))
  })

  it('an empty mask yields a defined, non-throwing descriptor', () => {
    const descriptor = describeRegionMask(new Uint8Array(100), 10, 10)
    expect(descriptor.hu).toHaveLength(7)
    expect(Number.isFinite(shapeAffinity(descriptor, describeSilhouette([square])))).toBe(true)
  })
})
