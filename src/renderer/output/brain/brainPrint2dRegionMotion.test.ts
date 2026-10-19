import { describe, expect, it } from 'vitest'
import {
  advancePrintRegionState as advance,
  createPrintRegionState as create,
  PRINT_REGION_LIMITS,
} from './brainPrint2dRegionMotion'

const pulse = { low: 1, lowMid: 0.7, mid: 0.4, high: 0.2 }
const quiet = { low: 0, lowMid: 0, mid: 0, high: 0 }

describe('Print2D region memory', () => {
  it('retains the last position exactly in silence, including phase wrap', () => {
    const state = create(47)
    for (let i = 0; i < 10; i++) advance(state, pulse, i / 50, 10, 500, true, false, 'dub')
    const position = [...state.position]
    const phase = [...state.phase]
    expect(Math.abs(position[0])).toBeGreaterThan(0.01)
    for (let i = 0; i < 1000; i++) advance(state, quiet, (i % 50) / 50, 10, 500, false, false, 'dub')
    expect(state.position).toEqual(position)
    expect(state.phase).toEqual(phase)
    expect(state.velocity).toEqual([0, 0, 0, 0])
  })

  it('damps velocity onto a nonzero rest position without an origin spring', () => {
    const state = create(47)
    for (let i = 0; i < 10; i++) advance(state, pulse, 0, 10, 500, true, false, 'dub')
    const hit = state.position[0]
    for (let i = 0; i < 1000; i++) advance(state, quiet, 0.25, 10, 500, true, false, 'dub')
    expect(state.position[0]).toBeGreaterThan(hit)
    expect(state.velocity[0]).toBeCloseTo(0, 8)
    const settled = state.position[0]
    advance(state, quiet, 0.75, 100, 500, true, false, 'dub')
    expect(state.position[0]).toBeCloseTo(settled, 8)
  })

  it('filters circular phase across 1→0 and suppresses raw jumps', () => {
    const state = create(10)
    advance(state, pulse, 0.99, 10, 500, true, false, 'dub')
    const before = state.phase[0]
    advance(state, pulse, 0.01, 10, 500, true, false, 'dub')
    expect(state.phase[0]).toBeGreaterThan(before)
    expect(state.phase[0] - before).toBeLessThan(0.02 * Math.PI * 2)
    const filtered = state.phase[0]
    advance(state, pulse, 0.45, 10, 500, true, false, 'dub')
    const jump = state.phase[0] - filtered
    expect(Math.abs(Math.atan2(Math.sin(jump), Math.cos(jump)))).toBeLessThan(0.5)
  })

  it('gives each region independent trajectories and history', () => {
    const regions = Array.from({ length: 12 }, (_, i) => create(47 + i * 3571))
    for (let i = 0; i < 80; i++) {
      regions.forEach(state => advance(state, pulse, (i % 50) / 50, 10, 500, true, false, 'dub'))
    }
    expect(new Set(regions.map(s => s.phase[0].toFixed(5))).size).toBe(12)
    expect(new Set(regions.map(s => s.position[0].toFixed(5))).size).toBe(12)
    const other = structuredClone(regions[1])
    advance(regions[0], pulse, 0.2, 100, 500, true, false, 'dub')
    expect(regions[1]).toEqual(other)
  })

  it('freezes all state and resumes without elapsed time catch-up', () => {
    const state = create(42)
    advance(state, pulse, 0.1, 16, 500, true, false, 'dub')
    const frozen = structuredClone(state)
    advance(state, pulse, 0.9, 5000, 500, true, true, 'dub')
    expect(state).toEqual(frozen)
    advance(state, pulse, 0.1, 16, 500, true, false, 'dub')
    expect(Math.abs(state.position[0] - frozen.position[0])).toBeLessThan(0.2)
  })

  it.each(['dub', 'techno', 'ambient'] as const)('bounds long drift and allows inward travel in %s', profile => {
    const state = create(21)
    for (let i = 0; i < 20000; i++) {
      advance(state, pulse, i < 10000 ? 0 : (i % 50) / 50, 20, 500, true, false, profile)
      state.position.forEach((value, index) => expect(Math.abs(value)).toBeLessThanOrEqual(PRINT_REGION_LIMITS[index]))
    }
    for (let i = 0; i < 500; i++) advance(state, pulse, 0.5, 20, 500, true, false, profile)
    expect(state.position[0]).toBe(-PRINT_REGION_LIMITS[0])
    for (let i = 0; i < 100; i++) advance(state, pulse, 0, 20, 500, true, false, profile)
    expect(state.position[0]).toBeGreaterThan(-PRINT_REGION_LIMITS[0])
  })

  it('does not return to zero at the driving phase zero crossing', () => {
    const state = create(47)
    for (let i = 0; i < 15; i++) advance(state, pulse, 0, 10, 500, true, false, 'dub')
    advance(state, pulse, 0.25, 10, 500, true, false, 'dub')
    expect(state.position[0]).toBeGreaterThan(0.1)
  })

  it('keeps band responses separate', () => {
    const state = create(47)
    advance(state, { ...quiet, high: 1 }, 0.1, 50, 500, true, false, 'dub')
    expect(state.position.slice(0, 3)).toEqual([0, 0, 0])
    expect(state.position[3]).not.toBe(0)
  })
})
