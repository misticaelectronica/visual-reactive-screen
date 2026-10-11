import { describe, expect, it } from 'vitest'
import { buildUniverse, chainFixtures, createEngine, currentColors, setColors, stageColor } from './dmxEngine'

describe('dmxEngine', () => {
  it('porta quattro luci a quattro colori in 8 secondi, linearmente', () => {
    const engine = createEngine(chainFixtures(['7ch', '7ch', '7ch', '7ch']))
    setColors(engine, ['#A82431', '#D78A45', '#273C72', '#72517E'], 8000, 0)
    expect(currentColors(engine, 4000)[0]).toEqual([0xa8 / 2, 0x24 / 2, 0x31 / 2])
    expect(currentColors(engine, 8000)[3]).toEqual([0x72, 0x51, 0x7e])
  })

  it('un comando a metà dissolvenza riparte dal colore raggiunto', () => {
    const engine = createEngine(chainFixtures(['3ch']))
    setColors(engine, ['#FF0000'], 1000, 0)
    const reached = currentColors(engine, 500)[0]
    setColors(engine, ['#0000FF'], 1000, 500)
    expect(currentColors(engine, 500)[0]).toEqual(reached)
  })

  it('mappa il profilo 7ch con master separato e canali funzione a zero', () => {
    const engine = createEngine(chainFixtures(['7ch', '7ch']))
    engine.master = 0.5
    setColors(engine, ['#FF3200'], 0, 0)
    const u = buildUniverse(engine, 0, false)
    // Il verde 50 sRGB diventa 7 lineare (gamma 2,2).
    expect(Array.from(u.slice(0, 14))).toEqual([128, 255, 7, 0, 0, 0, 0, 128, 255, 7, 0, 0, 0, 0])
  })

  it('il blackout azzera l’emissione senza perdere il colore', () => {
    const engine = createEngine(chainFixtures(['7ch', '3ch']))
    setColors(engine, ['#FFFFFF'], 0, 0)
    const u = buildUniverse(engine, 0, true)
    expect(u[0]).toBe(0)
    expect(Array.from(u.slice(7, 10))).toEqual([0, 0, 0])
    expect(currentColors(engine, 0)[1]).toEqual([255, 255, 255])
  })

  it('saturazione da palco regolabile: 0 colore vero, 1 tinta pura, luminosità invariata', () => {
    expect(stageColor('#b0a0c0', 0)).toBe('#b0a0c0')
    expect(stageColor('#b0a0c0', 1)).toBe('#6000c0')
    expect(stageColor('#808080', 1)).toBe('#808080')
    expect(stageColor('#10203a', 0.8)).toBe('#0c1d3a')
  })

  it('gamma: un quasi nero a schermo resta quasi spento sul PAR', () => {
    const engine = createEngine(chainFixtures(['3ch']))
    setColors(engine, ['#110311'], 0, 0)
    expect(Array.from(buildUniverse(engine, 0, false).slice(0, 3))).toEqual([1, 0, 1])
  })
})
