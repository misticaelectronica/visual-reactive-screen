import { describe, expect, it } from 'vitest'
import type { ConsciousnessMotionCandidate } from '@shared/types'
import { createBrainConsciousnessMotionLayer } from './brainConsciousnessMotion'
import type { BrainRhythmState } from './brainRhythm'

const candidate: ConsciousnessMotionCandidate = {
  memoryId: 'memory-1',
  kind: 'imagination',
  title: 'Il ponte lunare',
  source: 'test/story-model',
  salience: 0.8,
  perceived: 'È terminato un sogno.',
  interpretation: 'È un contenuto immaginato.',
  imagination: 'Una tribù attraversa un ponte.',
  relevanceReason: 'richiama il ponte nella storia in corso',
  influenceText: 'Una tribù attraversa un ponte.',
  consultedFiles: ['AGENT.md', 'INDICE.md', 'ricordi/ponte.md'],
}

function rhythm(overrides: Partial<BrainRhythmState> = {}): BrainRhythmState {
  return {
    active: true,
    beat: false,
    beatIndex: 10,
    beatPhase: 0.4,
    musicalPosition: 10.4,
    beatPulse: 0.5,
    kickEnvelope: 0.6,
    beatDurationMs: 500,
    bandTransients: { low: 0, lowMid: 0, mid: 0, high: 0 },
    ...overrides,
  }
}

describe('Brain consciousness motion', () => {
  it('entra ed esce sul beat, resta locale e conserva il testo rosso', () => {
    const host = document.createElement('div')
    const controller = createBrainConsciousnessMotionLayer(host)
    expect(controller.offer(candidate, 'story-1', 0)).toBe(true)

    expect(controller.update(rhythm({ beat: false }), 100, false).active).toBe(false)
    expect(controller.update(rhythm({ beat: true }), 200, false).active).toBe(true)
    const layer = host.querySelector<HTMLElement>('[data-brain-consciousness-motion]')
    expect(layer?.style.inset).toBe('0')
    expect(layer?.textContent).toContain('moto di coscienza: cosa ha cambiato Brain')
    expect(layer?.textContent).toContain('(imagination)')

    const silent = controller.update(rhythm({ active: false, beat: false, beatIndex: 30 }), 200, false)
    expect(silent.active).toBe(true)
    const tooEarly = controller.update(
      rhythm({ beat: true, beatIndex: 30 }),
      8_200,
      false,
    )
    expect(tooEarly.active).toBe(true)
    const completed = controller.update(
      rhythm({ beat: true, beatIndex: 34 }),
      12_200,
      false,
    )
    expect(completed.active).toBe(false)
    expect(completed.completedPauseMs).toBe(12_000)
    controller.destroy()
    expect(host.childElementCount).toBe(0)
  })
})
