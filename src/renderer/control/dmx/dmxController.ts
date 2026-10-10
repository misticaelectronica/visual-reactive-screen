// Controller DMX: possiede il dongle (Web Serial), trasmette l'universo in
// continuo e accetta comandi cromatici da un producer alla volta. Gli errori
// restano qui: aggiornano lo stato e non vengono mai rilanciati al producer.

import type { DmxInterface } from '@shared/types'
import { buildUniverse, createEngine, isFading, setColors, setFixtures, type DmxFixture } from './dmxEngine'

interface SerialPortLike {
  open(options: { baudRate: number; stopBits?: number; dataBits?: number; parity?: string }): Promise<void>
  close(): Promise<void>
  setSignals(signals: { break?: boolean }): Promise<void>
  writable: WritableStream<Uint8Array> | null
  getInfo(): { usbVendorId?: number }
}

interface SerialLike extends EventTarget {
  requestPort(): Promise<SerialPortLike>
  getPorts(): Promise<SerialPortLike[]>
}

export interface DmxStatus {
  connected: boolean
  owner: string | null
  blackout: boolean
  error: string | null
}

const FRAME_MS = 25
const log = (message: string) => console.info(`[dmx] ${message}`)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function usbProPacket(universe: Uint8Array): Uint8Array {
  const length = universe.length + 1
  const packet = new Uint8Array(length + 5)
  packet.set([0x7e, 6, length & 255, length >> 8, 0])
  packet.set(universe, 5)
  packet[packet.length - 1] = 0xe7
  return packet
}

export function createDmxController(fixtures: DmxFixture[], onStatus: (status: DmxStatus) => void) {
  const serial = (navigator as Navigator & { serial?: SerialLike }).serial
  const engine = createEngine(fixtures)
  const status: DmxStatus = { connected: false, owner: null, blackout: false, error: null }
  let port: SerialPortLike | null = null
  let writer: WritableStreamDefaultWriter<Uint8Array> | null = null
  let kind: DmxInterface = 'usb-pro'
  let wanted = false
  let sending = false
  let wasFading = false
  let opening = false

  // Le porte Bluetooth non hanno usbVendorId: non sono mai un dongle DMX.
  const grantedUsbPort = async () => (await serial?.getPorts() ?? []).find(p => p.getInfo().usbVendorId !== undefined)

  const emit = () => onStatus({ ...status })

  const fail = (reason: unknown) => {
    status.error = reason instanceof Error && reason.name === 'NotFoundError'
      ? 'Nessun dongle USB-DMX trovato: collegalo e premi Connetti'
      : reason instanceof Error ? reason.message : String(reason)
    log(`failure: ${status.error}`)
    void close()
  }

  async function close() {
    const closing = port
    port = null
    status.connected = false
    try { writer?.releaseLock() } catch { /* già rilasciato */ }
    writer = null
    try { await closing?.close() } catch { /* porta già sparita */ }
    emit()
  }

  async function open(next: SerialPortLike) {
    if (opening) return
    opening = true
    try {
      await next.open(kind === 'open-dmx'
        ? { baudRate: 250000, dataBits: 8, stopBits: 2, parity: 'none' }
        : { baudRate: 57600 })
    } finally {
      opening = false
    }
    port = next
    writer = next.writable?.getWriter() ?? null
    status.connected = true
    status.error = null
    log(`connected (${kind})`)
    emit()
  }

  async function sendFrame() {
    if (!port || !writer || sending) return
    sending = true
    try {
      const now = performance.now()
      const universe = buildUniverse(engine, now, status.blackout)
      if (kind === 'open-dmx') {
        await port.setSignals({ break: true })
        await sleep(1)
        await port.setSignals({ break: false })
        const frame = new Uint8Array(513)
        frame.set(universe, 1)
        await writer.write(frame)
      } else {
        await writer.write(usbProPacket(universe))
      }
      const fading = isFading(engine, now)
      if (wasFading && !fading) log('transition completed')
      wasFading = fading
    } catch (error) {
      fail(error)
    } finally {
      sending = false
    }
  }

  const timer = setInterval(() => void sendFrame(), FRAME_MS)

  // Dongle reinserito: riapre da solo se l'utente era connesso.
  const onReconnect = async () => {
    if (!wanted || port || !serial) return
    const granted = await grantedUsbPort()
    if (granted) await open(granted).catch(fail)
  }
  serial?.addEventListener('connect', onReconnect)
  log('controller started')

  return {
    // Va chiamato da un gesto dell'utente (requisito Web Serial).
    async connect(nextKind: DmxInterface) {
      if (!serial) { fail('Web Serial non disponibile'); return }
      kind = nextKind
      wanted = true
      await close()
      try {
        await open(await grantedUsbPort() ?? await serial.requestPort())
      } catch (error) {
        fail(error)
      }
    },
    async disconnect() {
      wanted = false
      await close()
      log('disconnected')
    },
    acquire(producer: string): boolean {
      if (status.owner && status.owner !== producer) return false
      if (status.owner !== producer) log(`producer acquired: ${producer}`)
      status.owner = producer
      emit()
      return true
    },
    release(producer: string) {
      if (status.owner !== producer) return
      status.owner = null
      log(`producer released: ${producer}`)
      emit()
    },
    setColors(producer: string, colors: string[], transitionMs: number): boolean {
      if (status.owner !== producer) return false
      setColors(engine, colors, transitionMs, performance.now())
      log(`target colors received: ${colors.join(' ')} in ${Math.round(transitionMs)} ms`)
      return true
    },
    setMasterIntensity(producer: string, value: number): boolean {
      if (status.owner !== producer) return false
      engine.master = Math.min(1, Math.max(0, value))
      return true
    },
    setFixtures(next: DmxFixture[]) {
      setFixtures(engine, next, performance.now())
      log(`configuration loaded: ${next.length} fixture`)
    },
    // Il blackout non richiede l'ownership.
    blackout(on: boolean) {
      status.blackout = on
      log(on ? 'blackout' : 'blackout released')
      emit()
    },
    getStatus: (): DmxStatus => ({ ...status }),
    async destroy() {
      clearInterval(timer)
      serial?.removeEventListener('connect', onReconnect)
      wanted = false
      await close()
    },
  }
}

export type DmxController = ReturnType<typeof createDmxController>
