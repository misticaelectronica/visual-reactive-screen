import { describe, expect, it } from 'vitest'
import { BrainAiRequestQueue } from './brainAiRequestQueue'

describe('coda inferenze Brain', () => {
  it('non esegue due inferenze contemporaneamente sulla stessa sessione', async () => {
    const queue = new BrainAiRequestQueue()
    const events: string[] = []
    let active = 0
    let maximumActive = 0
    let releaseFirst: (() => void) | undefined
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })

    const first = queue.run(async () => {
      active += 1
      maximumActive = Math.max(maximumActive, active)
      events.push('prima:inizio')
      await firstGate
      events.push('prima:fine')
      active -= 1
      return 'prima'
    })
    const second = queue.run(async () => {
      active += 1
      maximumActive = Math.max(maximumActive, active)
      events.push('seconda:inizio')
      active -= 1
      return 'seconda'
    })

    await Promise.resolve()
    expect(events).toEqual(['prima:inizio'])
    expect(queue.size()).toBe(2)
    releaseFirst?.()

    await expect(Promise.all([first, second])).resolves.toEqual([
      'prima',
      'seconda',
    ])
    expect(maximumActive).toBe(1)
    expect(events).toEqual([
      'prima:inizio',
      'prima:fine',
      'seconda:inizio',
    ])
    expect(queue.size()).toBe(0)
  })

  it('prosegue con la richiesta successiva dopo un errore', async () => {
    const queue = new BrainAiRequestQueue()
    const failed = queue.run(async () => {
      throw new Error('inferenza fallita')
    })
    const recovered = queue.run(async () => 'storia valida')

    await expect(failed).rejects.toThrow('inferenza fallita')
    await expect(recovered).resolves.toBe('storia valida')
  })
})
