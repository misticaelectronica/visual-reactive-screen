import { describe, expect, it } from 'vitest'
import { analyzePsycho2dPixels } from './brainPsycho2dAnalysis'

describe('Psycho2D image analysis', () => {
  it('separa una regione focale contrastata dalle zone overlay', () => {
    const width = 40
    const height = 30
    const pixels = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4
        const focal = x >= 18 && x <= 25 && y >= 8 && y <= 21
        const value = focal && (x + y) % 2 === 0 ? 250 : focal ? 12 : 55
        pixels[offset] = value
        pixels[offset + 1] = focal ? 30 : 58
        pixels[offset + 2] = focal ? 210 : 61
        pixels[offset + 3] = 255
      }
    }

    const analysis = analyzePsycho2dPixels(
      'image-1',
      pixels,
      width,
      height,
      ['volto centrale'],
    )

    expect(analysis.focalRegion.x).toBeGreaterThan(0.25)
    expect(analysis.focalRegion.x).toBeLessThan(0.7)
    expect(analysis.overlayRegions.length).toBeGreaterThan(0)
    expect(analysis.palette.length).toBeGreaterThanOrEqual(2)
    expect(analysis.narrativeHints).toEqual(['volto centrale'])
  })

  it('fornisce metadati di fallback senza raster valido', () => {
    const analysis = analyzePsycho2dPixels(
      'fallback',
      new Uint8ClampedArray(),
      0,
      0,
    )
    expect(analysis.focalRegion.source).toBe('fallback')
    expect(analysis.overlayRegions[0].source).toBe('fallback')
  })
})
