import { describe, expect, it } from 'vitest'
import { dominantColors, renderSurfaceColors, stageColor } from './brainDmxRasterColors'

const pixels = (colors: Array<[number, number, number, number]>) =>
  new Uint8ClampedArray(colors.flatMap(([r, g, b, n]) => Array.from({ length: n }, () => [r, g, b, 255]).flat()))

const channels = (hex: string) => [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16))

describe('stageColor', () => {
  it('porta un lilla pallido a viola saturo e pieno', () => {
    expect(stageColor(176, 160, 192)).toBe('#9933ff')
  })

  it('un grigio resta luce bianca, il nero resta nero', () => {
    expect(stageColor(128, 128, 128)).toBe('#ffffff')
    expect(stageColor(0, 0, 0)).toBe('#000000')
  })
})

describe('dominantColors', () => {
  it('domina il colore con una tinta, non il grigio di fondo più esteso', () => {
    const data = pixels([[120, 120, 125, 60], [200, 30, 40, 10]])
    const [first] = dominantColors(data, 4)
    const [r, g, b] = channels(first)
    expect(r).toBe(255)
    expect(r).toBeGreaterThan(g + 150)
    expect(r).toBeGreaterThan(b + 150)
  })

  it('il fondo quasi nero con una lieve dominante non vince', () => {
    const data = pixels([[12, 4, 8, 80], [40, 60, 200, 10]])
    const [first] = dominantColors(data, 4)
    const [r, , b] = channels(first)
    expect(b).toBe(255)
    expect(b).toBeGreaterThan(r)
  })

  it('immagine tutta grigia: vince l’estensione e la luce è bianca', () => {
    expect(dominantColors(pixels([[100, 100, 100, 5], [180, 180, 180, 20]]), 1)).toEqual(['#ffffff'])
  })

  it('ignora i pixel trasparenti', () => {
    const data = new Uint8ClampedArray([255, 0, 0, 0, 0, 255, 0, 255])
    expect(dominantColors(data, 4)).toEqual(['#00ff00'])
  })

  it('sceglie tinte diverse, non quattro sfumature della stessa', () => {
    const data = pixels([[40, 150, 230, 30], [45, 165, 235, 25], [50, 140, 225, 20], [230, 110, 40, 8], [200, 40, 160, 6]])
    const colors = dominantColors(data, 4)
    expect(colors).toHaveLength(3)
    const [blue, orange, magenta] = colors.map(channels)
    expect(blue[2]).toBe(255)
    expect(orange[0]).toBe(255)
    expect(magenta[0]).toBe(255)
    expect(magenta[2]).toBeGreaterThan(magenta[1])
  })
})

describe('renderSurfaceColors', () => {
  it('senza canvas nel renderer non inventa colori: le luci tengono i precedenti', () => {
    expect(renderSurfaceColors(document.createElement('div'), 4)).toEqual([])
  })
})
