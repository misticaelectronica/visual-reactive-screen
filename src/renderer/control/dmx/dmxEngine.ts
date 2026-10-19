// Motore cromatico DMX puro: stato corrente/target, dissolvenza lineare,
// traduzione fixture logica → canali. Nessun accesso all'hardware.

import type { DmxProfile } from '@shared/types'

export type Rgb = [number, number, number]

export const PROFILE_CHANNELS: Record<DmxProfile, number> = { '7ch': 7, '3ch': 3 }

export interface DmxFixture {
  address: number // 1..512
  profile: DmxProfile
}

export interface DmxColorEngine {
  fixtures: DmxFixture[]
  from: Rgb[]
  to: Rgb[]
  start: number
  duration: number
  master: number
  /** Intensità dal ritmo, 0..1: moltiplica il master, non tocca il colore. */
  rhythm: number
}

const BLACK: Rgb = [0, 0, 0]

export function parseHex(hex: string): Rgb {
  const value = Number.parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16)
  return Number.isFinite(value) ? [(value >> 16) & 255, (value >> 8) & 255, value & 255] : BLACK
}

// Saturazione da palco (disp. Capo Supremo 2026-10-11): su un PAR RGB un
// colore pallido diventa bianco. `amount` 0 = colore com'è; 1 = tinta pura.
// Cambia solo la saturazione: la luminosità resta quella del colore, così gli
// scuri restano scuri. Sotto 0,1 di saturazione la tinta non è affidabile e
// il colore resta com'è.
export function stageColor(color: string, amount: number): string {
  const [r, g, b] = parseHex(color)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (amount <= 0 || max === 0) return color
  const s = (max - min) / max
  if (s < 0.1) return color
  const target = Math.max(s, amount)
  const toHex = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')
  const channel = (c: number) => max * (1 - target * (max - c) / (max - min))
  return `#${toHex(channel(r))}${toHex(channel(g))}${toHex(channel(b))}`
}

export function createEngine(fixtures: DmxFixture[]): DmxColorEngine {
  return {
    fixtures,
    from: fixtures.map(() => BLACK),
    to: fixtures.map(() => BLACK),
    start: 0,
    duration: 0,
    master: 1,
    rhythm: 1,
  }
}

export function currentColors(engine: DmxColorEngine, now: number): Rgb[] {
  const t = engine.duration <= 0 ? 1 : Math.min(1, Math.max(0, (now - engine.start) / engine.duration))
  return engine.to.map((to, i) => {
    const from = engine.from[i] ?? BLACK
    return [0, 1, 2].map(c => from[c] + (to[c] - from[c]) * t) as Rgb
  })
}

export function isFading(engine: DmxColorEngine, now: number): boolean {
  return engine.duration > 0 && now - engine.start < engine.duration
}

// Un nuovo comando riparte dal colore effettivamente raggiunto: nessun salto.
// Se arrivano meno colori delle fixture, la lista viene ripetuta.
export function setColors(engine: DmxColorEngine, colors: string[], durationMs: number, now: number): void {
  if (colors.length === 0) return
  engine.from = currentColors(engine, now)
  engine.to = engine.fixtures.map((_, i) => parseHex(colors[i % colors.length]))
  engine.start = now
  engine.duration = Math.max(0, durationMs)
}

export function setFixtures(engine: DmxColorEngine, fixtures: DmxFixture[], now: number): void {
  const reached = currentColors(engine, now)
  engine.fixtures = fixtures
  engine.from = fixtures.map((_, i) => reached[i] ?? BLACK)
  engine.to = engine.from
  engine.duration = 0
}

// Gamma (disp. Capo Supremo 2026-10-11, «a schermo nero si vede il
// fucsia»): i colori sono sRGB, il LED emette in lineare. Senza correzione
// un 17/255 quasi nero a schermo (~0,6% di luce) diventa il 6,7% sul PAR.
const toLinear = (value: number) => 255 * Math.pow(Math.max(0, value) / 255, 2.2)

export function buildUniverse(engine: DmxColorEngine, now: number, blackout: boolean): Uint8Array {
  const universe = new Uint8Array(512)
  const colors = currentColors(engine, now).map(color => color.map(toLinear) as Rgb)
  const master = blackout ? 0 : Math.min(1, Math.max(0, engine.master * engine.rhythm))
  engine.fixtures.forEach((fixture, i) => {
    const base = fixture.address - 1
    const [r, g, b] = colors[i]
    const put = (offset: number, value: number) => {
      if (base + offset >= 0 && base + offset < 512) universe[base + offset] = Math.round(value)
    }
    if (fixture.profile === '7ch') {
      // Canali 5-7 restano a 0: nessuno strobo, nessun programma automatico.
      put(0, master * 255)
      put(1, r)
      put(2, g)
      put(3, b)
    } else {
      put(0, r * master)
      put(1, g * master)
      put(2, b * master)
    }
  })
  return universe
}

// Fixture in cascata: indirizzi consecutivi a partire da 1.
export function chainFixtures(profiles: DmxProfile[]): DmxFixture[] {
  let address = 1
  return profiles.map(profile => {
    const fixture = { address, profile }
    address += PROFILE_CHANNELS[profile]
    return fixture
  })
}
