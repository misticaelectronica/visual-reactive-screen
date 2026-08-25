export type YieldableGpuQueue = {
  submit: (commandBuffers: Iterable<unknown>) => void
  onSubmittedWorkDone: () => Promise<unknown>
}

export type YieldableGpuDevice = {
  readonly queue: YieldableGpuQueue
}

function boundProperty(target: object, property: PropertyKey): unknown {
  const value = Reflect.get(target, property, target)
  return typeof value === 'function' ? value.bind(target) : value
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)))
}

export function wrapGpuDeviceWithYield<T extends YieldableGpuDevice>(
  device: T,
  yieldMs: number,
): T {
  const originalQueue = device.queue
  const queue = new Proxy(originalQueue, {
    get(target, property) {
      if (property === 'onSubmittedWorkDone') {
        return () => target.onSubmittedWorkDone().then(() => delay(yieldMs))
      }
      if (property !== 'submit') return boundProperty(target, property)
      return (commandBuffers: Iterable<unknown>) => {
        target.submit(commandBuffers)
      }
    },
  })
  return new Proxy(device, {
    get(target, property) {
      if (property === 'queue') return queue
      return boundProperty(target, property)
    },
  })
}
