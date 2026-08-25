import { describe, expect, it } from 'vitest'
import {
  measureRasterEdgeRetention,
  preprocessBrainRaster,
} from './brainRasterPreprocess'

function pixel(
  rgba: Uint8Array,
  width: number,
  x: number,
  y: number,
): [number, number, number] {
  const offset = (y * width + x) * 4
  return [rgba[offset], rgba[offset + 1], rgba[offset + 2]]
}

const PROXY_OPTIONS = {
  spatialCleanupPasses: 1,
  denoiseRadius: 2,
  denoiseStrength: 0.68,
  localContrast: 0.14,
  colorSeparation: 0.1,
  minimumEdgeRetention: 0.86,
}

describe('pretrattamento raster Brain', () => {
  it('attenua il rumore lieve senza sfocare il confine principale', () => {
    const width = 9
    const height = 7
    const rgba = new Uint8Array(width * height * 4)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4
        const value = x < 5 ? 28 : 224
        rgba.set([value, value, value, 255], offset)
      }
    }
    rgba.set([42, 39, 41, 255], (3 * width + 2) * 4)

    const output = preprocessBrainRaster(rgba, width, height, {
      ...PROXY_OPTIONS,
      spatialCleanupPasses: 2,
      localContrast: 0,
      colorSeparation: 0,
    })

    expect(pixel(output, width, 2, 3)[0]).toBeLessThan(42)
    expect(pixel(output, width, 3, 3)).not.toEqual(pixel(output, width, 7, 3))
  })

  it('non applica una seconda quantizzazione cromatica', () => {
    const width = 8
    const height = 8
    const rgba = new Uint8Array(width * height * 4)
    for (let index = 0; index < width * height; index++) {
      const offset = index * 4
      rgba.set([
        (index * 37) % 256,
        (index * 73) % 256,
        (index * 109) % 256,
        255,
      ], offset)
    }
    const options = PROXY_OPTIONS
    const first = preprocessBrainRaster(rgba, width, height, options)
    const repeated = preprocessBrainRaster(rgba, width, height, options)
    const colors = new Set<string>()
    for (let offset = 0; offset < first.length; offset += 4) {
      colors.add(`${first[offset]},${first[offset + 1]},${first[offset + 2]}`)
    }
    expect(first).toEqual(repeated)
    expect(colors.size).toBeGreaterThan(6)
  })

  it('misura la perdita dei bordi prima di accettare la pulizia', () => {
    const width = 12
    const height = 8
    const source = new Uint8Array(width * height * 4)
    const flattened = new Uint8Array(width * height * 4)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4
        const value = x < width / 2 ? 20 : 230
        source.set([value, value, value, 255], offset)
        flattened.set([120, 120, 120, 255], offset)
      }
    }

    expect(measureRasterEdgeRetention(source, source, width, height)).toBe(1)
    expect(measureRasterEdgeRetention(source, flattened, width, height))
      .toBeLessThan(0.1)
  })

  it('conserva una struttura sottile collegata invece di assorbirla nello sfondo', () => {
    const width = 9
    const height = 9
    const rgba = new Uint8Array(width * height * 4)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4
        rgba.set(x === 4
          ? [210, 72, 62, 255]
          : [36, 42, 58, 255], offset)
      }
    }

    const output = preprocessBrainRaster(rgba, width, height, {
      ...PROXY_OPTIONS,
    })

    expect(pixel(output, width, 4, 4))
      .not.toEqual(pixel(output, width, 3, 4))
    expect(pixel(output, width, 4, 3))
      .toEqual(pixel(output, width, 4, 4))
  })
})
