import { describe, expect, it } from 'vitest'
import { dominantColors, renderSurfaceColors } from './brainDmxRasterColors'

const pixels = (colors: Array<[number, number, number, number]>) =>
  new Uint8ClampedArray(colors.flatMap(([r, g, b, n]) => Array.from({ length: n }, () => [r, g, b, 255]).flat()))

describe('dominantColors', () => {
  it('restituisce i colori veri dell’immagine, non saturati', () => {
    expect(dominantColors(pixels([[176, 160, 192, 10]]), 4)).toEqual(['#b0a0c0'])
  })

  it('domina il colore con una tinta, non il grigio di fondo più esteso', () => {
    const data = pixels([[120, 120, 125, 60], [200, 30, 40, 10]])
    expect(dominantColors(data, 4)[0]).toBe('#c81e28')
  })

  it('il fondo quasi nero con una lieve dominante non vince', () => {
    const data = pixels([[12, 4, 8, 80], [40, 60, 200, 10]])
    expect(dominantColors(data, 4)[0]).toBe('#283cc8')
  })

  it('immagine tutta grigia: vince l’estensione', () => {
    expect(dominantColors(pixels([[100, 100, 100, 5], [180, 180, 180, 20]]), 1)).toEqual(['#b4b4b4'])
  })

  it('sceglie tinte diverse, non quattro sfumature della stessa', () => {
    const data = pixels([[40, 150, 230, 30], [45, 165, 235, 25], [50, 140, 225, 20], [230, 110, 40, 8], [200, 40, 160, 6]])
    expect(dominantColors(data, 4)).toHaveLength(3)
  })

  it('ignora i pixel trasparenti', () => {
    const data = new Uint8ClampedArray([255, 0, 0, 0, 0, 255, 0, 255])
    expect(dominantColors(data, 4)).toEqual(['#00ff00'])
  })
})

describe('renderSurfaceColors', () => {
  it('senza canvas nel renderer non inventa colori: le luci tengono i precedenti', () => {
    expect(renderSurfaceColors(document.createElement('div'), 4)).toEqual([])
  })
})
