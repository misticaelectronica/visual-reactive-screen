import { describe, expect, it, vi } from 'vitest'
import {
  brainLog,
  brainWarn,
  subscribeBrainLog,
} from './brainLog'

describe('flusso eventi del monitor Brain', () => {
  it('pubblica dati reali di processo e permette la disiscrizione', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeBrainLog(listener)

    brainLog('traduzione', 'traduzione verificata', {
      italian: ['Una frase'],
      english: ['A sentence'],
    })
    brainWarn('psichedel', 'fotogramma rifiutato', {
      prompt: 'a visible prompt',
    })

    expect(listener).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        level: 'info',
        stage: 'traduzione',
        message: 'traduzione verificata',
        data: {
          italian: ['Una frase'],
          english: ['A sentence'],
        },
      }),
    )
    expect(listener).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        level: 'warn',
        stage: 'psichedel',
      }),
    )

    unsubscribe()
    brainLog('pipeline', 'evento successivo')
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
