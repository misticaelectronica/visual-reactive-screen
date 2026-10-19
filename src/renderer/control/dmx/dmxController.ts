// Controller DMX: trasmette l'universo in continuo e accetta comandi
// cromatici da un producer alla volta. La porta seriale vive nel main
// (`src/main/dmxSerial.ts`). Gli errori restano qui: aggiornano lo stato e
// non vengono mai rilanciati al producer.

import type { DmxInterface } from '@shared/types'
import { buildUniverse, createEngine, isFading, setColors, setFixtures, type DmxFixture } from './dmxEngine'

export interface DmxStatus {
  connected: boolean
  owner: string | null
  blackout: boolean
  error: string | null
}

const FRAME_MS = 25
const RECONNECT_MS = 2000
const log = (message: string) => console.info(`[dmx] ${message}`)

export function createDmxController(fixtures: DmxFixture[], onStatus: (status: DmxStatus) => void) {
  const api = window.fxControl
  const engine = createEngine(fixtures)
  const status: DmxStatus = { connected: false, owner: null, blackout: false, error: null }
  let kind: DmxInterface = 'open-dmx'
  let wanted = false
  let sending = false
  let opening = false
  let wasFading = false
  let lastAttempt = 0
  let rhythmSource: ((now: number) => number) | null = null
  // Producer già avvisati di essere ignorati: un solo log per cambio di owner.
  const ignoredSince = new Set<string>()

  const emit = () => onStatus({ ...status })

  const fail = (reason: string) => {
    if (status.connected || status.error !== reason) log(`failure: ${reason}`)
    status.connected = false
    status.error = reason
    emit()
  }

  async function open() {
    if (!api || opening) return
    opening = true
    lastAttempt = performance.now()
    try {
      const result = await api.dmxOpen(kind)
      if (!result.ok) { fail(result.error ?? 'apertura fallita'); return }
      status.connected = true
      status.error = null
      log(`connected (${kind})`)
      emit()
    } finally {
      opening = false
    }
  }

  async function sendFrame() {
    if (!api || sending) return
    const now = performance.now()
    if (!status.connected) {
      // Dongle scollegato o porta caduta: ritenta finché l'utente è connesso.
      if (wanted && now - lastAttempt > RECONNECT_MS) void open()
      return
    }
    sending = true
    try {
      engine.rhythm = rhythmSource ? rhythmSource(now) : 1
      const result = await api.dmxSend(buildUniverse(engine, now, status.blackout))
      if (!result.ok) { fail(result.error ?? 'scrittura fallita'); return }
      const fading = isFading(engine, now)
      if (wasFading && !fading) log('transition completed')
      wasFading = fading
    } finally {
      sending = false
    }
  }

  const timer = setInterval(() => void sendFrame(), FRAME_MS)
  log('controller started')

  return {
    async connect(nextKind: DmxInterface) {
      if (!api) { fail('IPC DMX non disponibile'); return }
      kind = nextKind
      wanted = true
      status.connected = false
      await open()
    },
    async disconnect() {
      wanted = false
      status.connected = false
      await api?.dmxClose()
      log('disconnected')
      emit()
    },
    acquire(producer: string): boolean {
      if (status.owner && status.owner !== producer) return false
      if (status.owner !== producer) log(`producer acquired: ${producer}`)
      status.owner = producer
      ignoredSince.clear()
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
      if (status.owner !== producer) {
        if (!ignoredSince.has(producer)) {
          ignoredSince.add(producer)
          log(`ignorato ${producer}: comanda ${status.owner ?? 'nessuno'}`)
        }
        return false
      }
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
    // Il ritmo modula l'intensità di chiunque possieda il controller.
    setRhythmSource(source: ((now: number) => number) | null) {
      rhythmSource = source
    },
    getStatus: (): DmxStatus => ({ ...status }),
    async destroy() {
      clearInterval(timer)
      wanted = false
      status.connected = false
      await api?.dmxClose()
    },
  }
}

export type DmxController = ReturnType<typeof createDmxController>
