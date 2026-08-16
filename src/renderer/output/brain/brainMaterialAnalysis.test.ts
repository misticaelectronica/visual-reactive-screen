import { describe, expect, it } from 'vitest'
import {
  analyzeMaterialPixels,
  matchMaterialRegions,
  type MaterialRegion,
} from './brainMaterialAnalysis'

function twoMasses(width: number, height: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4
      const light = x < width / 2
      pixels[offset] = light ? 230 : 24
      pixels[offset + 1] = light ? 180 : 36
      pixels[offset + 2] = light ? 120 : 62
      pixels[offset + 3] = 255
    }
  }
  return pixels
}

describe('Materia Morph raster analysis', () => {
  it('estrae masse, bordi, densità e palette entro il budget', () => {
    const field = analyzeMaterialPixels(twoMasses(32, 18), 32, 18, 6)
    expect(field.regions.length).toBeGreaterThanOrEqual(2)
    expect(field.regions.length).toBeLessThanOrEqual(6)
    expect(field.palette.length).toBeGreaterThanOrEqual(2)
    expect(Math.max(...field.edges)).toBeGreaterThan(0)
    expect(field.regionLabels.some((label) => label > 0)).toBe(true)
    expect(field.focalRegionId).not.toBeNull()
  })

  it('usa un fallback stabile per dati invalidi', () => {
    const field = analyzeMaterialPixels(new Uint8ClampedArray(3), 10, 10)
    expect(field.regions).toEqual([])
    expect(field.focalRegionId).toBeNull()
    expect(field.palette).toEqual(['#181018', '#e0d8df'])
  })

  it('abbina prima le regioni spazialmente e cromaticamente affini', () => {
    const region = (
      id: number,
      centroidX: number,
      color: readonly [number, number, number],
    ): MaterialRegion => ({
      id,
      pixelCount: 100,
      areaRatio: 0.2,
      centroidX,
      centroidY: 0.5,
      minX: 0,
      minY: 0,
      maxX: 10,
      maxY: 10,
      averageColor: color,
      luminance: 0.5,
      density: 0.5,
      edgeStrength: 0.4,
      salience: 0.8,
    })
    const matches = matchMaterialRegions(
      [region(0, 0.2, [220, 40, 40]), region(1, 0.8, [30, 40, 210])],
      [region(10, 0.82, [28, 42, 215]), region(11, 0.18, [225, 38, 35])],
    )
    expect(matches.find((match) => match.fromRegionId === 0)?.toRegionId).toBe(11)
    expect(matches.find((match) => match.fromRegionId === 1)?.toRegionId).toBe(10)
  })
})
