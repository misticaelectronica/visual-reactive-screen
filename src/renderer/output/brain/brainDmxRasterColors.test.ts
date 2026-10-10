import { describe, expect, it } from 'vitest'
import { dominantColors } from './brainDmxRasterColors'

const pixels = (colors: Array<[number, number, number, number]>) =>
  new Uint8ClampedArray(colors.flatMap(([r, g, b, n]) => Array.from({ length: n }, () => [r, g, b, 255]).flat()))

describe('dominantColors', () => {
  it('ordina per presenza: il colore più esteso è il primo', () => {
    const data = pixels([[200, 20, 30, 10], [10, 40, 200, 30], [240, 200, 20, 5]])
    expect(dominantColors(data, 4)).toEqual(['#0a28c8', '#c8141e', '#f0c814'])
  })

  it('riunisce le sfumature vicine e restituisce la loro media', () => {
    const data = pixels([[100, 20, 30, 1], [110, 24, 26, 1]])
    expect(dominantColors(data, 4)).toEqual(['#69161c'])
  })

  it('ignora i pixel trasparenti', () => {
    const data = new Uint8ClampedArray([255, 0, 0, 0, 0, 255, 0, 255])
    expect(dominantColors(data, 4)).toEqual(['#00ff00'])
  })
})
