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
}

const BLACK: Rgb = [0, 0, 0]

export function parseHex(hex: string): Rgb {
  const value = Number.parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16)
  return Number.isFinite(value) ? [(value >> 16) & 255, (value >> 8) & 255, value & 255] : BLACK
}

export function createEngine(fixtures: DmxFixture[]): DmxColorEngine {
  return {
    fixtures,
    from: fixtures.map(() => BLACK),
    to: fixtures.map(() => BLACK),
    start: 0,
    duration: 0,
    master: 1,
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

export function buildUniverse(engine: DmxColorEngine, now: number, blackout: boolean): Uint8Array {
  const universe = new Uint8Array(512)
  const colors = currentColors(engine, now)
  const master = blackout ? 0 : Math.min(1, Math.max(0, engine.master))
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
