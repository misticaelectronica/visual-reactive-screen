import { afterEach, describe, expect, it, vi } from 'vitest'
import { wrapGpuDeviceWithYield } from './sd15GpuYield'

describe('SD15 GPU cooperative yield', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('inoltra il submit e attende la fence GPU prima del micro-yield', async () => {
    vi.useFakeTimers()
    const submit = vi.fn()
    const onSubmittedWorkDone = vi.fn(async () => undefined)
    const device = {
      queue: { submit, onSubmittedWorkDone },
    }
    const wrapped = wrapGpuDeviceWithYield(device, 4)
    const buffers = [{}]

    wrapped.queue.submit(buffers)
    await Promise.resolve()

    expect(submit).toHaveBeenCalledWith(buffers)
    expect(onSubmittedWorkDone).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(1)
    await vi.advanceTimersByTimeAsync(4)
    expect(vi.getTimerCount()).toBe(0)
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
