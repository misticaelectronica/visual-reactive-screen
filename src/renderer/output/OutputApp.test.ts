import { describe, expect, it } from 'vitest'
import {
  advanceVisualTransitionClock,
  shouldApplyVisualChangeOnRhythm,
} from './OutputApp'
import type { BrainRhythmState } from './brain/brainRhythm'

const RHYTHM: BrainRhythmState = {
  active: true,
  beat: false,
  beatIndex: 4,
  beatPhase: 0.5,
  musicalPosition: 4.5,
  beatPulse: 0,
  kickEnvelope: 0,
  beatDurationMs: 500,
  bandTransients: { low: 0, lowMid: 0, mid: 0, high: 0 },
}

describe('Output rhythm quantization', () => {
  it('trattiene ingresso, uscita e cambio preset lontano dal beat', () => {
    expect(shouldApplyVisualChangeOnRhythm('none', 'liquid:base', RHYTHM)).toBe(false)
    expect(shouldApplyVisualChangeOnRhythm('liquid:base', 'none', RHYTHM)).toBe(false)
    expect(
      shouldApplyVisualChangeOnRhythm('liquid:base', 'liquid:alien-contact', RHYTHM),
    ).toBe(false)
  })

  it('rilascia il cambio sul beat o nella finestra stretta di fase', () => {
    expect(
      shouldApplyVisualChangeOnRhythm('liquid:base', 'oniric:base', {
        ...RHYTHM,
        beat: true,
      }),
    ).toBe(true)
    expect(
      shouldApplyVisualChangeOnRhythm('liquid:base', 'oniric:base', {
        ...RHYTHM,
        beatPhase: 0.04,
      }),
    ).toBe(true)
  })

  it('consente uno stato statico immediato in silenzio', () => {
    expect(
      shouldApplyVisualChangeOnRhythm('none', 'brain:brain-default', {
        ...RHYTHM,
        active: false,
      }),
    ).toBe(true)
  })

  it('non recupera uno stallo del crossfade con un salto', () => {
    const afterStall = advanceVisualTransitionClock(1_000, 1_000, 2_000, 5_000)
    expect(afterStall.elapsedMs).toBe(1_050)
    expect(afterStall.progress).toBeGreaterThan(0)
    expect(afterStall.progress).toBeLessThan(0.1)
  })
})
