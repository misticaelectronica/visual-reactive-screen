import { describe, expect, it, vi } from 'vitest'
import { VisualStateCoalescer } from './visualStateCoalescer'

type Packet = { sequenceNumber: number }

describe('VisualStateCoalescer', () => {
  it('mantiene un solo pacchetto in volo e sostituisce il pending', () => {
    const sent: Packet[] = []
    const coalescer = new VisualStateCoalescer<Packet>(
      (packet) => sent.push(packet),
      (packet) => packet.sequenceNumber,
    )

    coalescer.enqueue({ sequenceNumber: 1 })
    coalescer.enqueue({ sequenceNumber: 2 })
    coalescer.enqueue({ sequenceNumber: 3 })

    expect(sent.map((packet) => packet.sequenceNumber)).toEqual([1])
    expect(coalescer.getStats().replacedPendingCount).toBe(1)

    expect(coalescer.acknowledge(1)).toBe(true)
    expect(sent.map((packet) => packet.sequenceNumber)).toEqual([1, 3])
  })

  it('ignora ACK duplicati o appartenenti a una sequenza diversa', () => {
    const send = vi.fn()
    const coalescer = new VisualStateCoalescer<Packet>(
      send,
      (packet) => packet.sequenceNumber,
    )

    coalescer.enqueue({ sequenceNumber: 10 })
    coalescer.enqueue({ sequenceNumber: 11 })

    expect(coalescer.acknowledge(9)).toBe(false)
    expect(send).toHaveBeenCalledTimes(1)
    expect(coalescer.acknowledge(10)).toBe(true)
    expect(send).toHaveBeenCalledTimes(2)
    expect(coalescer.acknowledge(10)).toBe(false)
  })

  it('reset elimina in-flight e pending senza azzerare la telemetria', () => {
    const sent: Packet[] = []
    const coalescer = new VisualStateCoalescer<Packet>(
      (packet) => sent.push(packet),
      (packet) => packet.sequenceNumber,
    )

    coalescer.enqueue({ sequenceNumber: 1 })
    coalescer.enqueue({ sequenceNumber: 2 })
    coalescer.enqueue({ sequenceNumber: 3 })
    coalescer.reset()
    coalescer.enqueue({ sequenceNumber: 4 })

    expect(sent.map((packet) => packet.sequenceNumber)).toEqual([1, 4])
    expect(coalescer.getStats().replacedPendingCount).toBe(1)
  })
})
