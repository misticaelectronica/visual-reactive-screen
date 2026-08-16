import { afterEach, describe, expect, it, vi } from 'vitest'
import { BrainOfflineGenerationWindow } from './brainOfflineWindow'

describe('Brain offline generation window', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('entra in hold, esegue un solo task e riprende alla conclusione', async () => {
    const events: string[] = []
    const windowController = new BrainOfflineGenerationWindow({
      maxDurationMs: 1_000,
      onBeginOffline: () => events.push('begin'),
      onEndOffline: () => events.push('end'),
    })

    const result = await windowController.run(async (signal) => {
      expect(signal.aborted).toBe(false)
      expect(windowController.isActive).toBe(true)
      events.push('task')
      return 'ready'
    })

    expect(result).toBe('ready')
    expect(events).toEqual(['begin', 'task', 'end'])
    expect(windowController.isActive).toBe(false)
  })

  it('rifiuta un secondo task mentre la finestra è attiva', async () => {
    let release!: () => void
    const windowController = new BrainOfflineGenerationWindow({
      maxDurationMs: 1_000,
      onBeginOffline() {},
      onEndOffline() {},
    })
    const first = windowController.run(() => new Promise<void>((resolve) => {
      release = resolve
    }))

    await expect(windowController.run(async () => 'second')).resolves.toBeNull()
    release()
    await first
  })

  it('annulla il segnale al timeout e chiude comunque la finestra', async () => {
    vi.useFakeTimers()
    const onEnd = vi.fn()
    const windowController = new BrainOfflineGenerationWindow({
      maxDurationMs: 100,
      onBeginOffline() {},
      onEndOffline: onEnd,
    })
    const running = windowController.run(async (signal) => {
      await new Promise<void>((resolve) => {
        signal.addEventListener('abort', () => resolve(), { once: true })
      })
      throw new DOMException('aborted', 'AbortError')
    })

    await vi.advanceTimersByTimeAsync(100)

    await expect(running).resolves.toBeNull()
    expect(onEnd).toHaveBeenCalledOnce()
    expect(windowController.isActive).toBe(false)
  })
})
