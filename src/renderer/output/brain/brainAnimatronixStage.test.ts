import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { neutralAnimatronixStructure, planAnimatronix } from './brainAnimatronix'
import { createAnimatronixStage } from './brainAnimatronixStage'

const structures = Array.from({ length: 4 }, () => neutralAnimatronixStructure())
const plan = planAnimatronix({ storyId: 'stage', structures })
const preps = (withBitmap: boolean) =>
  structures.map((structure) => ({
    structure,
    bitmap: withBitmap ? ({ width: 8, height: 8, close: () => undefined } as ImageBitmap) : null,
  }))

describe('ANIMATRONIX stage', () => {
  let parent: HTMLElement
  beforeEach(() => {
    parent = document.createElement('div')
    document.body.appendChild(parent)
  })
  afterEach(() => parent.remove())

  it('salta la fase se un raster non è decodificato', () => {
    const stage = createAnimatronixStage(parent)
    expect(stage.start(plan, preps(false))).toBe(false)
    expect(stage.isBusy()).toBe(false)
    stage.destroy()
  })

  it('salta la fase senza WebGL2 e non lascia canvas orfani', () => {
    const stage = createAnimatronixStage(parent)
    expect(stage.start(plan, preps(true))).toBe(false)
    expect(stage.isBusy()).toBe(false)
    expect(parent.querySelectorAll('canvas')).toHaveLength(0)
    stage.destroy()
  })

  it('update su stage inattivo non fa nulla', () => {
    const stage = createAnimatronixStage(parent)
    expect(stage.update(50, { active: true, energy: 0.5 })).toBe(false)
    stage.destroy()
  })
})
