import { describe, expect, it } from 'vitest'
import {
  calculateNextImageBufferRefillWindow,
  isCompleteBrainImageBuffer,
  shouldActivateProgressiveImageBuffer,
  shouldRetainImageModelBetweenStories,
} from './brainImageBuffer'

describe('Brain image buffer', () => {
  it('considera completo soltanto il buffer con quattro immagini', () => {
    expect(isCompleteBrainImageBuffer(4, 4)).toBe(true)
    expect(isCompleteBrainImageBuffer(3, 4)).toBe(false)
    expect(isCompleteBrainImageBuffer(5, 4)).toBe(false)
  })

  it('usa i 120 secondi come finestra di refill e non come pausa precedente', () => {
    expect(calculateNextImageBufferRefillWindow(
      180_000,
      120_000,
      90_000,
    )).toEqual({
      startsAt: 210_000,
      targetAt: 300_000,
    })
  })

  it('non anticipa il refill prima del completamento corrente', () => {
    expect(calculateNextImageBufferRefillWindow(
      180_000,
      120_000,
      180_000,
    )).toEqual({
      startsAt: 180_000,
      targetAt: 300_000,
    })
  })

  it('mantiene il buffer corrente finché il refill non ha quattro immagini', () => {
    expect(shouldActivateProgressiveImageBuffer(false)).toBe(true)
    expect(shouldActivateProgressiveImageBuffer(true)).toBe(false)
  })

  it('mantiene il modello fra storie anche in low power per evitare reload e frammentazione', () => {
    expect(shouldRetainImageModelBetweenStories(true, false)).toBe(true)
    expect(shouldRetainImageModelBetweenStories(true, true)).toBe(true)
    expect(shouldRetainImageModelBetweenStories(false, false)).toBe(false)
    expect(shouldRetainImageModelBetweenStories(false, true)).toBe(false)
  })
})
