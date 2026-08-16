import { describe, expect, it } from 'vitest'
import {
  measureSvgCornerDensity,
  smoothBrainVectorGeometry,
} from './brainVectorGeometry'

describe('Brain vector geometry finish', () => {
  it('riduce la densità degli angoli trasformando la silhouette in curve continue', () => {
    const svg =
      '<svg width="120" height="80"><path fill="#112233" d="M0 20L8 16L16 22L24 15L32 23L40 14L48 22L56 15L64 23L72 14L80 22L88 16L96 21L112 20L112 70L0 70Z"/></svg>'
    const result = smoothBrainVectorGeometry(svg)

    expect(result.smoothedPathCount).toBe(1)
    expect(result.svg).toContain('C')
    expect(result.cornerDensityBefore).toBeGreaterThan(0)
    expect(result.cornerDensityAfter).toBeLessThan(result.cornerDensityBefore)
    expect(measureSvgCornerDensity(result.svg)).toBe(result.cornerDensityAfter)
  })

  it('limita lo spostamento locale e conserva i subpath che formano i fori', () => {
    const svg =
      '<svg width="100" height="100"><path fill="#000000" fill-rule="evenodd" d="M0 0L100 0L100 100L0 100ZM30 30L30 70L70 70L70 30Z"/></svg>'
    const result = smoothBrainVectorGeometry(svg)

    expect(result.maximumDeviation).toBeLessThanOrEqual(1.4)
    expect(result.smoothedPathCount).toBe(1)
    expect(result.svg.match(/Z/gu)).toHaveLength(2)
    expect(result.svg).toContain('fill-rule="evenodd"')
  })

  it('lascia intatti archi e tracciati aperti non destinati alle silhouette', () => {
    const arc =
      '<svg width="100" height="100"><path fill="#000" d="M10 50A40 40 0 1 0 90 50Z"/></svg>'
    const open =
      '<svg width="100" height="100"><path fill="none" stroke="#000" d="M0 0L100 100"/></svg>'

    expect(smoothBrainVectorGeometry(arc).svg).toBe(arc)
    expect(smoothBrainVectorGeometry(arc).smoothedPathCount).toBe(0)
    expect(smoothBrainVectorGeometry(open).svg).toBe(open)
  })
})
