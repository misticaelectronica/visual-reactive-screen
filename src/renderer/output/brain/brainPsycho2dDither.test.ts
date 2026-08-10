import { describe, expect, it } from 'vitest'
import {
  choosePsycho2dInkPalette,
  ditherPsycho2dPixels,
  selectPsycho2dDensityVariant,
} from './brainPsycho2dDither'

describe('Psycho2D one-bit dither', () => {
  it('produce soltanto i due inchiostri scelti', () => {
    const pixels = new Uint8ClampedArray([
      0, 0, 0, 255,
      255, 255, 255, 255,
      120, 120, 120, 255,
      180, 180, 180, 255,
    ])
    const dark = [5, 6, 7] as const
    const light = [240, 241, 242] as const
    const output = ditherPsycho2dPixels(pixels, 2, 2, dark, light)
    const colors = new Set<string>()
    for (let offset = 0; offset < output.length; offset += 4) {
      colors.add(`${output[offset]},${output[offset + 1]},${output[offset + 2]}`)
      expect(output[offset + 3]).toBe(255)
    }
    expect(colors).toEqual(new Set(['5,6,7', '240,241,242']))
  })

  it('seleziona la densità soltanto dall’energia lowMid e dal suo transiente', () => {
    expect(selectPsycho2dDensityVariant(0, 0)).toBe(0)
    expect(selectPsycho2dDensityVariant(0.4, 0)).toBe(1)
    expect(selectPsycho2dDensityVariant(0.9, 0.2)).toBe(2)
    expect(selectPsycho2dDensityVariant(0, 0, 0.8)).toBe(2)
  })

  it('sceglie l’inchiostro più scuro e quello più chiaro della palette', () => {
    expect(choosePsycho2dInkPalette(['#808080', '#050505', '#f0eedd'])).toEqual({
      dark: [5, 5, 5],
      light: [240, 238, 221],
    })
  })
})
