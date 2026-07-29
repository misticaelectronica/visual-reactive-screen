export class BrainAiRequestQueue {
  private tail: Promise<void> = Promise.resolve()
  private waiting = 0

  size(): number {
    return this.waiting
  }

  run<T>(operation: () => Promise<T>): Promise<T> {
    this.waiting += 1
    const result = this.tail.then(operation, operation)
    this.tail = result.then(
      () => {
        this.waiting -= 1
      },
      () => {
        this.waiting -= 1
      },
    )
    return result
  }
}
