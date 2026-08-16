import { describe, expect, it } from 'vitest'
import { BRAIN_CONFIG } from '@shared/brain/brainConfig'
import {
  calculateNextStoryRefillWindowForMode,
} from './brainStoryCycleRefill'

describe('Brain story-cycle refill', () => {
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
