import { afterEach, describe, expect, it, vi } from 'vitest'
import { wrapGpuDeviceWithYield } from './sd15GpuYield'

describe('SD15 GPU cooperative yield', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('inoltra il submit senza attendere nulla, così non blocca chi la chiama', () => {
    const submit = vi.fn()
    const onSubmittedWorkDone = vi.fn(async () => undefined)
    const device = {
      queue: { submit, onSubmittedWorkDone },
    }
    const wrapped = wrapGpuDeviceWithYield(device, 4)
    const buffers = [{}]

    const result = wrapped.queue.submit(buffers)

    expect(submit).toHaveBeenCalledWith(buffers)
    expect(onSubmittedWorkDone).not.toHaveBeenCalled()
    expect(result).toBeUndefined()
  })

  it('aggiunge davvero il micro-yield a chi attende onSubmittedWorkDone', async () => {
    vi.useFakeTimers()
    const onSubmittedWorkDone = vi.fn(async () => undefined)
    const device = {
      queue: { submit: vi.fn(), onSubmittedWorkDone },
    }
    const wrapped = wrapGpuDeviceWithYield(device, 4)

    let resolved = false
    void wrapped.queue.onSubmittedWorkDone().then(() => {
      resolved = true
    })
    await Promise.resolve()
    await Promise.resolve()

    expect(onSubmittedWorkDone).toHaveBeenCalledOnce()
    expect(resolved).toBe(false)
    await vi.advanceTimersByTimeAsync(4)
    expect(resolved).toBe(true)
  })

  it('preserva proprietà e metodi del device originale', () => {
    const identify = vi.fn(function (this: { label: string }) {
      return this.label
    })
    const device = {
      label: 'sd15-device',
      queue: {
        submit() {},
        async onSubmittedWorkDone() {},
      },
      identify,
    }
    const wrapped = wrapGpuDeviceWithYield(device, 4)

    expect(wrapped.label).toBe('sd15-device')
    expect(wrapped.identify()).toBe('sd15-device')
  })
})
