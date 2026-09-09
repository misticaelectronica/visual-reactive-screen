import { describe, expect, it } from 'vitest'
import { preparePsicoFantasmaDeformation } from './deformation'

describe('PsicoFantasma cached matter transport', () => {
  it('starts with the exact masked raster and transports its texture locally', () => {
    const width = 16, height = 8
    const source = new Uint8Array(width * height), target = source.slice()
    const rgba = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = y * width + x
      source[i] = x >= 2 && x <= 8 ? 255 : 0
      target[i] = x >= 4 && x <= 12 ? 255 : 0
      rgba[i * 4] = x * 10; rgba[i * 4 + 3] = 255
    }
    const frames = preparePsicoFantasmaDeformation(rgba, source, target, width, height, 18)
    expect(frames[0].filter((_, i) => i % 4 === 3)).toEqual(new Uint8ClampedArray(source))
    expect(frames[17].filter((_, i) => i % 4 === 3)).toEqual(new Uint8ClampedArray(target))
    // At the target's right edge, the transported texel is source x=8, not destination x=12.
    expect(frames[17][12 * 4]).toBe(80)
    expect(rgba[12 * 4]).toBe(120)
    expect(frames[8]).not.toEqual(frames[0])
  })
  it('transports vertically as well as horizontally without moving the surrounding canvas', () => {
    const width = 8, height = 8
    const source = new Uint8Array(64), target = source.slice(), rgba = new Uint8ClampedArray(256)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = y * width + x
      source[i] = y >= 3 && y <= 5 && x >= 2 && x <= 5 ? 255 : 0
      target[i] = y >= 1 && y <= 6 && x >= 2 && x <= 5 ? 255 : 0
      rgba[i * 4] = y * 20; rgba[i * 4 + 3] = 255
    }
    const frames = preparePsicoFantasmaDeformation(rgba, source, target, width, height, 18)
    expect(frames[0].filter((_, i) => i % 4 === 3)).toEqual(new Uint8ClampedArray(source))
    expect(frames[17][(6 * width + 4) * 4]).toBe(100)
    expect(frames[17].filter((_, i) => i % 4 === 3)).toEqual(new Uint8ClampedArray(target))
  })
})
