import { describe, expect, it } from 'vitest'
import { buildUniverse, chainFixtures, createEngine, setColors } from './dmxEngine'
import { createDmxRhythm, rhythmLevel } from './dmxRhythm'

describe('dmxRhythm', () => {
  it('in silenzio resta fermo al pavimento del profilo, mai a zero', () => {
    expect(rhythmLevel(0, 'techno')).toBeCloseTo(0.6)
    expect(rhythmLevel(0, 'dub')).toBeCloseTo(0.75)
    expect(rhythmLevel(0, 'ambient')).toBeCloseTo(0.9)
    expect(rhythmLevel(1, 'techno')).toBe(1)
  })

  it('senza audio non pulsa: livello costante nel tempo', () => {
    const level = createDmxRhythm(() => null, () => 'techno')
    const samples = [0, 25, 50, 75, 100, 500, 1000].map(t => level(1000 + t))
    for (const value of samples) expect(value).toBeCloseTo(0.6, 5)
  })

  it('il ritmo moltiplica il master senza toccare il colore', () => {
    const engine = createEngine(chainFixtures(['7ch']))
    setColors(engine, ['#FF3200'], 0, 0)
    engine.rhythm = 0.5
    expect(Array.from(buildUniverse(engine, 0, false).slice(0, 4))).toEqual([128, 255, 7, 0])
  })
})
