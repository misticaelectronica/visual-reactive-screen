import { describe, expect, it } from 'vitest'
import {
  choosePsycho2dInkPalette,
  selectPsycho2dDensityVariant,
} from './brainPsycho2dDither'

describe('denoising passthrough serigrafico', () => {
  it('usa la palette narrativa e del preset per scegliere due soli inchiostri', () => {
    const ink = choosePsycho2dInkPalette([
      '#102030',
      '#405060',
      '#020616',
      '#c9d3e6',
    ])
    expect(ink.dark).toEqual([2, 6, 22])
    expect(ink.light).toEqual([201, 211, 230])
  })

  it('resta sulla matrice meno densa in silenzio', () => {
    expect(selectPsycho2dDensityVariant(0, 0)).toBe(0)
  })

  it('passa alla matrice più densa con lowMid e transiente', () => {
    expect(selectPsycho2dDensityVariant(0.75, 0.35)).toBe(2)
  })
})
