import { describe, expect, it } from 'vitest'
import { buildUniverse, chainFixtures, createEngine, currentColors, setColors, stageColor, usableLightColors } from './dmxEngine'

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
    expect(Array.from(u.slice(0, 14))).toEqual([128, 255, 50, 0, 0, 0, 0, 128, 255, 50, 0, 0, 0, 0])
  })

  it('il blackout azzera l’emissione senza perdere il colore', () => {
    const engine = createEngine(chainFixtures(['7ch', '3ch']))
    setColors(engine, ['#FFFFFF'], 0, 0)
    const u = buildUniverse(engine, 0, true)
    expect(u[0]).toBe(0)
    expect(Array.from(u.slice(7, 10))).toEqual([0, 0, 0])
    expect(currentColors(engine, 0)[1]).toEqual([255, 255, 255])
  })

  it('scarta i colori troppo scuri per una luce, ma non li svuota tutti', () => {
    expect(usableLightColors(['#111827', '#0f5f2a', '#010403', '#39ff6a'])).toEqual(['#0f5f2a', '#39ff6a'])
    expect(usableLightColors(['#111827', '#010403'])).toEqual(['#111827', '#010403'])
  })

  it('saturazione da palco regolabile: 0 lascia il colore vero, 1 tinta pura', () => {
    expect(stageColor('#b0a0c0', 0)).toBe('#b0a0c0')
    expect(stageColor('#b0a0c0', 1)).toBe('#8000ff')
    expect(stageColor('#808080', 1)).toBe('#ffffff')
    expect(stageColor('#000000', 1)).toBe('#000000')
  })
})
