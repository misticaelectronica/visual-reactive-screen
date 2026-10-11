import { describe, expect, it } from 'vitest'
import { screenDominantColors } from './dmxScreenColors'

const pixels = (colors: Array<[number, number, number, number]>) =>
  new Uint8Array(colors.flatMap(([r, g, b, n]) => Array.from({ length: n }, () => [r, g, b, 255]).flat()))

describe('screenDominantColors', () => {
  it('schermo nero: il colore dominante è il nero, non il fucsia di un dettaglio', () => {
    const colors = screenDominantColors(pixels([[2, 2, 3, 500], [200, 30, 180, 20]]), 4)
    expect(colors[0]).toBe('#020203')
    expect(colors).toContain('#c81eb4')
  })

  it('tinte distinte, ordinate per area', () => {
    const colors = screenDominantColors(pixels([[30, 60, 200, 300], [35, 70, 210, 200], [240, 180, 40, 100]]), 4)
    expect(colors).toEqual(['#1e3cc8', '#f0b428'])
  })
})
