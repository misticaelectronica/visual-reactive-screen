export type CoalescerStats = {
  replacedPendingCount: number
}

type SequenceOf<T> = (payload: T) => number | undefined
type SendPayload<T> = (payload: T, stats: CoalescerStats) => void

/**
 * Mantiene al massimo uno stato in volo e un pending sostituibile.
 * La classe non dipende da Electron, così il protocollo ACK è testabile in isolamento.
 */
export class VisualStateCoalescer<T> {
  private inFlightSequence: number | undefined
  private awaitingAck = false
  private pending: T | null = null
  private replacedPendingCount = 0

  constructor(
    private readonly sendPayload: SendPayload<T>,
    private readonly sequenceOf: SequenceOf<T>,
  ) {}

  enqueue(payload: T): void {
    if (!this.awaitingAck) {
      this.dispatch(payload)
      return
    }
    if (this.pending !== null) this.replacedPendingCount += 1
    this.pending = payload
  }

  acknowledge(sequenceNumber?: number): boolean {
    if (!this.awaitingAck) return false
    if (
      sequenceNumber !== undefined &&
      this.inFlightSequence !== undefined &&
      sequenceNumber !== this.inFlightSequence
    ) {
      return false
    }

    this.awaitingAck = false
    this.inFlightSequence = undefined
    const next = this.pending
    this.pending = null
    if (next !== null) this.dispatch(next)
    return true
  }

  reset(): void {
    this.awaitingAck = false
    this.inFlightSequence = undefined
    this.pending = null
  }

  getStats(): CoalescerStats {
    return { replacedPendingCount: this.replacedPendingCount }
  }

  private dispatch(payload: T): void {
    this.awaitingAck = true
    this.inFlightSequence = this.sequenceOf(payload)
    this.sendPayload(payload, this.getStats())
  }
}
