// Trasporto DMX su seriale USB (main process). Il controller cromatico vive
// nella Control Window e manda qui solo l'universo da 512 byte.
//
// Open DMX (FTDI FT232R, es. DSD TECH SH-RS09B): il break NON si genera con
// il comando di break (TIOCSBRK): con il driver FTDI di macOS la linea resta
// in break, il buffer non si svuota e il driver si blocca. Il break si
// emula con un byte 0 a 57600 baud (~156 µs basso), poi i dati a 250000.

import { SerialPort } from 'serialport'
import type { DmxInterface } from '@shared/types'

type Result = { ok: boolean; error?: string }

let port: SerialPort | null = null
let kind: DmxInterface = 'open-dmx'
let busy = false

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

const call = (fn: (cb: (error: Error | null | undefined) => void) => void) =>
  new Promise<void>((resolve, reject) => fn(error => (error ? reject(error) : resolve())))

async function write(data: Uint8Array) {
  const target = port
  if (!target) throw new Error('porta chiusa')
  await call(cb => target.write(Buffer.from(data), cb))
  await call(cb => target.drain(cb))
}

export async function dmxOpen(nextKind: DmxInterface): Promise<Result> {
  await dmxClose()
  kind = nextKind
  try {
    const ports = await SerialPort.list()
    const usb = ports.filter(p => p.vendorId)
    const found = usb.find(p => p.vendorId?.toLowerCase() === '0403') ?? usb[0]
    if (!found) return { ok: false, error: 'Nessun dongle USB-DMX trovato: collegalo e premi Connetti' }
    // macOS: /dev/tty.* può attendere la portante, /dev/cu.* no.
    const next = new SerialPort({
      path: found.path.replace('/dev/tty.', '/dev/cu.'),
      baudRate: kind === 'open-dmx' ? 250000 : 57600,
      dataBits: 8,
      stopBits: kind === 'open-dmx' ? 2 : 1,
      parity: 'none',
      autoOpen: false,
    })
    await call(cb => next.open(cb))
    port = next
    console.info(`[dmx] serial open ${found.path} (${kind})`)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: message(error) }
  }
}

export async function dmxSend(universe: Uint8Array): Promise<Result> {
  if (!port) return { ok: false, error: 'porta chiusa' }
  if (busy) return { ok: true } // frame precedente ancora in uscita: si salta
  busy = true
  try {
    if (kind === 'open-dmx') {
      const target = port
      await call(cb => target.update({ baudRate: 57600 }, cb))
      await write(Uint8Array.of(0))
      await call(cb => target.update({ baudRate: 250000 }, cb))
      const frame = new Uint8Array(513)
      frame.set(universe.subarray(0, 512), 1)
      await write(frame)
    } else {
      const length = 513
      const packet = new Uint8Array(length + 5)
      packet.set([0x7e, 6, length & 255, length >> 8, 0])
      packet.set(universe.subarray(0, 512), 5)
      packet[packet.length - 1] = 0xe7
      await write(packet)
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: message(error) }
  } finally {
    busy = false
  }
}

export async function dmxClose(): Promise<void> {
  const closing = port
  port = null
  if (!closing?.isOpen) return
  await call(cb => closing.close(cb)).catch(() => undefined)
}
