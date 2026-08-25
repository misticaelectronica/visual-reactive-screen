import { describe, expect, it } from 'vitest'
import { BrainCanvasMotionSmoother } from './brainCanvasMotionSmoother'

const targets = {
  low: 1,
  lowMid: 1,
  mid: 1,
  high: 1,
  activity: 1,
  beat: 1,
}

describe('BrainCanvasMotionSmoother', () => {
  it('attacca in modo continuo e più rapido sulle frequenze alte', () => {
    const smoother = new BrainCanvasMotionSmoother()
    const first = smoother.update(targets, 16, 500, true, 'dub')
    expect(first.low).toBeGreaterThan(0)
    expect(first.low).toBeLessThan(first.lowMid)
    expect(first.lowMid).toBeLessThan(first.mid)
    expect(first.mid).toBeLessThan(first.high)
    expect(first.high).toBeLessThan(1)
    expect(first.beat).toBeGreaterThan(first.high)
  })

  it('usa il profilo ambient per una risposta più morbida', () => {
    const ambient = new BrainCanvasMotionSmoother().update(
      targets, 16, 500, true, 'ambient',
    )
    const techno = new BrainCanvasMotionSmoother().update(
      targets, 16, 500, true, 'techno',
    )
    expect(ambient.lowMid).toBeLessThan(techno.lowMid)
  })

  it('azzera subito ogni coda geometrica in silenzio', () => {
    const smoother = new BrainCanvasMotionSmoother()
    smoother.update(targets, 80, 500, true, 'dub')
    expect(smoother.update(targets, 16, 500, false, 'dub')).toEqual({
      low: 0,
      lowMid: 0,
      mid: 0,
      high: 0,
      activity: 0,
      beat: 0,
    })
  })

  it('non trasforma gli hat ravvicinati in un dettaglio sostenuto', () => {
    const smoother = new BrainCanvasMotionSmoother()
    const attack = smoother.update(targets, 80, 500, true, 'dub')
    const release = smoother.update(
      { ...targets, high: 0 },
      80,
      500,
      true,
      'dub',
    )

    expect(release.high).toBeLessThan(attack.high * 0.4)
  })
})
