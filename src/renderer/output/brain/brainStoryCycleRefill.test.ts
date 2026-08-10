import { describe, expect, it } from 'vitest'
import { BRAIN_CONFIG } from '@shared/brain/brainConfig'
import {
  calculateNextStoryRefillWindowForMode,
  shouldDeferNextStoryGeneration,
} from './brainStoryCycleRefill'

describe('Brain story-cycle refill', () => {
  it('protegge interamente il primo attraversamento', () => {
    expect(shouldDeferNextStoryGeneration('story-cycle', 0)).toBe(true)
    expect(shouldDeferNextStoryGeneration('story-cycle', 1)).toBe(false)
    expect(shouldDeferNextStoryGeneration('manual', 0)).toBe(false)
    expect(shouldDeferNextStoryGeneration('rotation', 0)).toBe(false)
  })

  it('estende solo il target della modalità tutti per storia', () => {
    const completedAt = 10_000
    const standard = calculateNextStoryRefillWindowForMode(completedAt, 'manual')
    const storyCycle = calculateNextStoryRefillWindowForMode(
      completedAt,
      'story-cycle',
    )

    expect(standard.targetAt - completedAt).toBe(BRAIN_CONFIG.nextStoryTargetMs)
    expect(storyCycle.targetAt - completedAt).toBe(
      BRAIN_CONFIG.storyCycleNextStoryTargetMs,
    )
    expect(storyCycle.startsAt).toBe(standard.startsAt)
  })
})
