import { describe, expect, it, vi } from 'vitest'
import { BrainThermalScheduler } from './brainThermalScheduler'

function createHarness() {
  let now = 0
  const events: string[] = []
  const scheduler = new BrainThermalScheduler({
    cooldownMs: 6_000,
    lowPowerCooldownMs: 12_000,
    longFrameThresholdMs: 240,
    severeLongFrameThresholdMs: 1_000,
    longFrameBackoffMs: 9_000,
    severeLongFrameBackoffMs: 20_000,
    now: () => now,
    sleep: async (delayMs) => {
      now += delayMs
    },
    onEvent: (event) => events.push(event.type),
  })
  return {
    scheduler,
    events,
    now: () => now,
    setNow: (value: number) => {
      now = value
    },
  }
}

describe('BrainThermalScheduler', () => {
  it('serializza le inferenze anche quando vengono richieste insieme', async () => {
    const harness = createHarness()
    const order: string[] = []
    let releaseFirst: () => void = () => void 0
    let notifyFirstStarted: () => void = () => void 0
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    const firstStarted = new Promise<void>((resolve) => {
      notifyFirstStarted = resolve
    })

    const first = harness.scheduler.run(async () => {
      order.push('first-start')
      notifyFirstStarted()
      await firstGate
      order.push('first-end')
      return 1
    })
    const second = harness.scheduler.run(async () => {
      order.push('second-start')
      return 2
    })

    await firstStarted
    expect(order).toEqual(['first-start'])
    releaseFirst()

    await expect(Promise.all([first, second])).resolves.toEqual([1, 2])
    expect(order).toEqual(['first-start', 'first-end', 'second-start'])
  })

  it('applica il cooldown normale fra due inferenze', async () => {
    const harness = createHarness()

    await harness.scheduler.run(async () => 'first')
    await harness.scheduler.run(async () => 'second')

    expect(harness.now()).toBe(6_000)
    expect(harness.events).toContain('waiting')
  })

  it('usa il cooldown più conservativo in low power mode', async () => {
    const harness = createHarness()
    harness.scheduler.setLowPowerMode(true)

    await harness.scheduler.run(async () => undefined)
    await harness.scheduler.run(async () => undefined)

    expect(harness.now()).toBe(12_000)
  })

  it('estende il blocco dopo un gap RAF grave', async () => {
    const harness = createHarness()
    harness.setNow(100)
    harness.scheduler.recordFrame(100)
    harness.setNow(3_200)
    harness.scheduler.recordFrame(3_200)

    const task = vi.fn(async () => undefined)
    await harness.scheduler.run(task)

    expect(task).toHaveBeenCalledOnce()
    expect(harness.now()).toBe(23_200)
    expect(harness.events).toContain('long-frame')
  })

  it('con inferenceHold attivo non avvia una nuova inferenza finché non viene disattivato', async () => {
    let now = 0
    const release: { current: (() => void) | null } = { current: null }
    const scheduler = new BrainThermalScheduler({
      cooldownMs: 6_000,
      lowPowerCooldownMs: 12_000,
      longFrameThresholdMs: 240,
      severeLongFrameThresholdMs: 1_000,
      longFrameBackoffMs: 9_000,
      severeLongFrameBackoffMs: 20_000,
      now: () => now,
      sleep: (delayMs) => new Promise<void>((resolve) => {
        release.current = () => {
          now += delayMs
          resolve()
        }
      }),
    })
    scheduler.setInferenceHold(true)
    const started = vi.fn()
    const promise = scheduler.run(async () => {
      started()
      return 'x'
    })
    await Promise.resolve()
    await Promise.resolve()
    expect(started).not.toHaveBeenCalled()
    expect(scheduler.getSnapshot().inferenceHold).toBe(true)

    scheduler.setInferenceHold(false)
    release.current?.()
    await expect(promise).resolves.toBe('x')
    expect(started).toHaveBeenCalledOnce()
  })

  it('rifiuta le richieste in attesa dopo destroy', async () => {
    const harness = createHarness()
    await harness.scheduler.run(async () => undefined)
    harness.scheduler.destroy()

    await expect(
      harness.scheduler.run(async () => undefined),
    ).rejects.toThrow('arrestato')
  })
})
