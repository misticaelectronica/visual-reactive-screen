import { describe, expect, it } from 'vitest'
import {
  analyzeBauhausPixels,
  matchBauhausPlanes,
} from './brainBauhausAnalysis'

function splitImage(width: number, height: number, reverse = false): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4
      const left = x < width / 2
      const bright = reverse ? !left : left
      pixels[offset] = bright ? 224 : 28
      pixels[offset + 1] = bright ? 188 : 42
      pixels[offset + 2] = bright ? 72 : 116
      pixels[offset + 3] = 255
    }
  }
  return pixels
}

function irregularImage(width: number, height: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4
      const foreground = (x >= 3 && x <= 8 && y >= 3 && y <= 16) ||
        (x >= 8 && x <= 22 && y >= 12 && y <= 17)
      pixels[offset] = foreground ? 210 : 18
      pixels[offset + 1] = foreground ? 48 : 22
      pixels[offset + 2] = foreground ? 36 : 28
      pixels[offset + 3] = 255
    }
  }
  return pixels
}

describe('Bauhaus analysis', () => {
  it('deriva piani, assi e palette dalle regioni reali', () => {
    const composition = analyzeBauhausPixels(
      splitImage(32, 20),
      32,
      20,
      ['#e12229', '#174ea6'],
      8,
    )

    expect(composition.planes.length).toBeGreaterThanOrEqual(2)
    expect(composition.planes.length).toBeLessThanOrEqual(8)
    expect(composition.planes.every((plane) =>
      composition.field.regions.some((region) => region.id === plane.sourceRegionId),
    )).toBe(true)
    expect(composition.palette).toContain('#e12229')
    expect(composition.lines.length).toBeGreaterThan(0)
    expect(composition.dominantAxis).not.toBe('neutral')
  })

  it('protegge il piano focale ritardandone la semplificazione', () => {
    const composition = analyzeBauhausPixels(splitImage(32, 20), 32, 20)
    const focal = composition.planes.find((plane) => plane.focal)
    const ordinary = composition.planes.find((plane) => !plane.focal)

    expect(focal).toBeDefined()
    expect(ordinary).toBeDefined()
    expect(focal?.abstractionStart).toBeGreaterThan(ordinary?.abstractionStart ?? 1)
  })

  it('costruisce sagome e colori dai pixel effettivi della regione', () => {
    const width = 28
    const height = 22
    const composition = analyzeBauhausPixels(
      irregularImage(width, height),
      width,
      height,
      ['#174ea6'],
      8,
    )
    const redPlane = composition.planes.find((plane) => plane.color === '#d23024')
    expect(redPlane).toBeDefined()
    expect(redPlane?.outline.length).toBeGreaterThanOrEqual(3)
    expect(redPlane?.outline.every((point) => {
      const x = Math.min(width - 1, Math.floor(point.x * width))
      const y = Math.min(height - 1, Math.floor(point.y * height))
      return composition.field.regionLabels[y * width + x] ===
        (redPlane?.sourceRegionId ?? -1) + 1
    })).toBe(true)
    expect(redPlane?.color).not.toBe('#174ea6')
  })

  it('costruisce corrispondenze continue fra due composizioni', () => {
    const from = analyzeBauhausPixels(splitImage(32, 20), 32, 20)
    const to = analyzeBauhausPixels(splitImage(32, 20, true), 32, 20)
    const matches = matchBauhausPlanes(from, to)

    expect(matches.length).toBeGreaterThan(0)
    expect(matches.some((match) => match.from && match.to)).toBe(true)
  })

  it('resta entro i limiti anche con input non valido', () => {
    const composition = analyzeBauhausPixels(new Uint8ClampedArray(), 0, 0)
    expect(composition.planes).toEqual([])
    expect(composition.palette.length).toBeGreaterThanOrEqual(2)
  })
})
