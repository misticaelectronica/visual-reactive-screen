import { describe, expect, it } from 'vitest'
import { composeBrainContourSvg } from './brainContourSvg'
import type { BrainSnicSegmentation } from './brainSnicSegmentation'

function segmentation(
  width: number,
  height: number,
  labelAt: (x: number, y: number) => number,
  regionCount: number,
): BrainSnicSegmentation {
  const labels = new Int32Array(width * height)
  const areas = new Array<number>(regionCount).fill(0)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const label = labelAt(x, y)
      labels[y * width + x] = label
      areas[label] += 1
    }
  }
  return {
    labels,
    regions: areas.map((area, id) => ({ id, area, red: id * 80, green: 40, blue: 200 - id * 60 })),
    initialRegionCount: regionCount,
    boundaryContrast: 0,
    strongEdgeRecall: 1,
  }
}

function pathPoints(svg: string): Set<string>[] {
  return [...svg.matchAll(/\bd="([^"]+)"/gu)].map((match) => new Set(
    [...match[1].matchAll(/[ML]([-\d.]+) ([-\d.]+)/gu)].map((point) => `${point[1]}:${point[2]}`),
  ))
}

const OPTIONS = {
  simplificationTolerance: 1.7,
  curveSmoothing: 0.34,
  maximumPoints: 2_400,
  minimumContourArea: 0,
}

describe('contorni SNIC a confini condivisi', () => {
  it('due regioni vicine ricevono lo stesso confine, senza fessure', () => {
    const width = 80
    const height = 60
    // Confine ondulato fra due regioni e un disco interno: tre etichette.
    const result = composeBrainContourSvg(segmentation(width, height, (x, y) => {
      if (Math.hypot(x - 58, y - 30) < 10) return 2
      return x < 34 + Math.round(6 * Math.sin(y / 5)) ? 0 : 1
    }, 3), width, height, OPTIONS)

    const [left, right, disc] = pathPoints(result.svg)
    const sharedLeftRight = [...left].filter((point) => right.has(point))
    const sharedRightDisc = [...disc].filter((point) => right.has(point))
    // Tutti i punti interni del confine ondulato, giunzioni comprese,
    // coincidono nelle due forme.
    const interiorLeft = [...left].filter((point) => {
      const [x] = point.split(':').map(Number)
      return x > 0.5 && x < width - 0.5
    })
    expect(sharedLeftRight.length).toBeGreaterThan(10)
    expect(interiorLeft.filter((point) => !right.has(point))).toEqual([])
    // Il disco senza giunzioni coincide con il foro della regione che lo contiene.
    expect(sharedRightDisc.length).toBe(disc.size)
  })

  it('conserva gli angoli del quadro', () => {
    const width = 40
    const height = 30
    const result = composeBrainContourSvg(
      segmentation(width, height, (x) => (x < 20 ? 0 : 1), 2),
      width,
      height,
      OPTIONS,
    )
    const points = pathPoints(result.svg).flatMap((set) => [...set])
    for (const corner of ['0:0', `${width}:0`, `0:${height}`, `${width}:${height}`]) {
      expect(points).toContain(corner)
    }
  })
})
