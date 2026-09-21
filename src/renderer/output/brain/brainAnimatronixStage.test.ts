import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FLAT_RASTER_STRUCTURE, planAnimatronix } from './brainAnimatronix'
import { createAnimatronixStage } from './brainAnimatronixStage'

const plan = planAnimatronix({
  storyId: 'stage',
  structures: Array(4).fill(FLAT_RASTER_STRUCTURE),
})
const blobs = () => Array.from({ length: 4 }, () => new Blob(['x']))

describe('ANIMATRONIX stage', () => {
  let parent: HTMLElement
  beforeEach(() => {
    parent = document.createElement('div')
    document.body.appendChild(parent)
    URL.createObjectURL = vi.fn(() => 'blob:test')
    URL.revokeObjectURL = vi.fn()
  })
  afterEach(() => parent.remove())

  it('segnala la fine una sola volta e poi si ripulisce sfumando', () => {
    const stage = createAnimatronixStage(parent)
    stage.start(plan, blobs())
    expect(stage.isBusy()).toBe(true)
    let finishedCount = 0
    for (let i = 0; i < 3_000 && finishedCount === 0; i++) {
      if (stage.update(50, { active: true, beatPulse: 0, highTransient: 0 })) finishedCount++
    }
    expect(finishedCount).toBe(1)
    expect(stage.isBusy()).toBe(true)
    for (let i = 0; i < 100; i++) {
      expect(stage.update(50, { active: true, beatPulse: 0, highTransient: 0 })).toBe(false)
    }
    expect(stage.isBusy()).toBe(false)
    expect(URL.revokeObjectURL).toHaveBeenCalled()
    stage.destroy()
  })

  it('in silenzio non completa la fase', () => {
    const stage = createAnimatronixStage(parent)
    stage.start(plan, blobs())
    for (let i = 0; i < 2_000; i++) {
      expect(stage.update(50, { active: false, beatPulse: 0, highTransient: 0 })).toBe(false)
    }
    stage.destroy()
  })
})
