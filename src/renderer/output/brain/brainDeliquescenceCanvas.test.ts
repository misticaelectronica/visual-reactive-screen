import { describe, expect, it } from 'vitest'
import {
  advanceCollapseNodes,
  advanceDeliquescencePhase,
  advanceDeliquescenceTide,
  createCollapseNodeState,
  deliquescenceNoise,
  deliquescenceTonemap,
  estimateOccupationField,
  interiorDisplacement,
  pickCollapseMode,
  silhouetteDivergence,
  warpOccupation,
  type DeliquescenceCollapseMode,
} from './brainDeliquescenceCanvas'

const OCC_COLS = 96
const OCC_ROWS = 54

/** Campo di occupazione sintetico: un blob centrato (figura) su fondo. */
function centredBlob(): Float32Array {
  const field = new Float32Array(OCC_COLS * OCC_ROWS)
  for (let row = 0; row < OCC_ROWS; row += 1) {
    for (let col = 0; col < OCC_COLS; col += 1) {
      const dx = (col - OCC_COLS / 2) / (OCC_COLS * 0.32)
      const dy = (row - OCC_ROWS / 2) / (OCC_ROWS * 0.32)
      field[row * OCC_COLS + col] = Math.max(0, Math.min(1, 1.15 - Math.hypot(dx, dy)))
    }
  }
  return field
}

function simulateActive(
  mode: DeliquescenceCollapseMode,
  occ0: Float32Array,
  seconds: number,
): { warped: Float32Array; interior: number } {
  // random deterministico
  let seed = 987654321
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 0xffffffff
  }
  const nodes = createCollapseNodeState(occ0)
  const params = (
    // riuso della tabella interna via il modo
    {
      SAG: { centroidPull: 0.1, downBias: 0.9, erosionGain: 0.35, jitter: 0.35 },
      IMPLOSION: { centroidPull: 1, downBias: 0.1, erosionGain: 0.3, jitter: 0.25 },
      BLEED: { centroidPull: -0.85, downBias: 0.15, erosionGain: 0.15, jitter: 0.4 },
      FUSION: { centroidPull: 0.55, downBias: 0.1, erosionGain: 0.2, jitter: 0.6 },
      EROSION: { centroidPull: 0.15, downBias: 0.25, erosionGain: 0.75, jitter: 0.5 },
      COAGULATION: { centroidPull: 0.7, downBias: 0.1, erosionGain: -0.5, jitter: 0.3 },
      HOLLOW: { centroidPull: -0.4, downBias: 0.2, erosionGain: 0.55, jitter: 0.45 },
      SLUMP: { centroidPull: 0.05, downBias: 1, erosionGain: 0.3, jitter: 0.5 },
    } as const
  )[mode]
  const step = 1_000 / 24
  let phase = 0
  for (let t = 0; t < seconds * 1000; t += step) {
    phase = advanceDeliquescencePhase(phase, 0.4, step)
    advanceCollapseNodes(nodes, params, 0.4, 0.7, 0.1, 1.05, step, rnd, phase)
  }
  const out = new Float32Array(occ0.length)
  warpOccupation(occ0, OCC_COLS, OCC_ROWS, nodes, out)
  return { warped: out, interior: interiorDisplacement(nodes, occ0) }
}

describe('deliquescenceTonemap — riscrive scuro conservando la luminanza relativa', () => {
  it('chiaro resta più chiaro di scuro, ma entrambi cupi', () => {
    const dark = deliquescenceTonemap(10, 10, 10)
    const light = deliquescenceTonemap(240, 240, 240)
    const lum = (c: [number, number, number]) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
    expect(lum(light)).toBeGreaterThan(lum(dark))
    expect(Math.max(...light)).toBeLessThan(160)
  })
})

describe('deliquescenceNoise / tide / phase', () => {
  it('il rumore è continuo su piccoli passi di fase (niente jitter)', () => {
    let previous = deliquescenceNoise(3, 5, 0)
    for (let step = 1; step <= 50; step += 1) {
      const value = deliquescenceNoise(3, 5, step * 0.002)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
      expect(Math.abs(value - previous)).toBeLessThan(0.05)
      previous = value
    }
  })

  it('la marea insegue residual con costante di tempo lunga', () => {
    let tide = 0.1
    tide = advanceDeliquescenceTide(tide, 0.9, 100)
    expect(tide).toBeLessThan(0.2)
    for (let i = 0; i < 200; i += 1) tide = advanceDeliquescenceTide(tide, 0.9, 100)
    expect(tide).toBeGreaterThan(0.85)
  })

  it('Check Silenzio: la fase non avanza senza audio', () => {
    let phase = 0.4
    for (let i = 0; i < 100; i += 1) phase = advanceDeliquescencePhase(phase, 0, 100)
    expect(phase).toBeCloseTo(0.4, 6)
  })
})

describe('estimateOccupationField — la fascia intermedia È il bordo', () => {
  it('un riquadro chiaro su fondo scuro produce interno alto, bordo intermedio, fondo basso', () => {
    const width = 96
    const height = 54
    const rgba = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const inside = x >= 34 && x < 62 && y >= 18 && y < 36
        const v = inside ? 235 : 15
        const i = (y * width + x) * 4
        rgba[i] = rgba[i + 1] = rgba[i + 2] = v
        rgba[i + 3] = 255
      }
    }
    const occ = estimateOccupationField(rgba, width, height, OCC_COLS, OCC_ROWS)
    const centre = occ[Math.floor(OCC_ROWS / 2) * OCC_COLS + Math.floor(OCC_COLS / 2)]
    const corner = occ[0]
    expect(centre).toBeGreaterThan(corner)
    // esiste una fascia di valori intermedi (il bordo), non solo 0 e 1.
    const intermediate = [...occ].filter((v) => v > 0.3 && v < 0.7).length
    expect(intermediate).toBeGreaterThan(20)
  })
})

describe('pickCollapseMode — deterministico sul seme', () => {
  it('stesso seme → stesso modo; semi diversi coprono più modi', () => {
    expect(pickCollapseMode('frame-abc')).toBe(pickCollapseMode('frame-abc'))
    const modes = new Set(
      Array.from({ length: 40 }, (_, i) => pickCollapseMode(`frame-${i}`)),
    )
    expect(modes.size).toBeGreaterThan(3)
  })
})

describe('TEST 1 VISUAL — la silhouette collassa (non resta l’originale)', () => {
  it('dopo ~8s di audio attivo il profilo differisce materialmente dall’originale (ogni modo)', () => {
    const occ0 = centredBlob()
    for (const mode of ['SAG', 'IMPLOSION', 'BLEED', 'SLUMP', 'EROSION'] as const) {
      const { warped } = simulateActive(mode, occ0, 8)
      const divergence = silhouetteDivergence(occ0, warped)
      expect(divergence).toBeGreaterThan(0.12)
    }
  })

  it('TEST 1 "a schermo": non si muove solo il bordo del ritaglio — l’interno della figura si sposta (le zone di colore scivolano)', () => {
    // collaudo negativo 2026-08-31: divergenza 0.79 nei numeri e nulla di
    // visibile, perché si warpava solo la maschera. `interiorDisplacement`
    // misura lo spostamento dei nodi campionato DENTRO la figura, che è la
    // stessa griglia usata dal warp del raster.
    const occ0 = centredBlob()
    for (const mode of ['SAG', 'IMPLOSION', 'BLEED', 'SLUMP', 'EROSION'] as const) {
      const { interior } = simulateActive(mode, occ0, 8)
      expect(interior).toBeGreaterThan(0.8) // > ~0.8 celle-occ ≈ > ~2.7px a 320w
    }
  })
})

describe('TEST 2 VISUAL — conseguenze che si accumulano', () => {
  it('due stati a 30s di distanza: stesso soggetto, geometria diversa, non obliterato', () => {
    const occ0 = centredBlob()
    const at8 = simulateActive('SAG', occ0, 8).warped
    const at38 = simulateActive('SAG', occ0, 38).warped
    expect(silhouetteDivergence(occ0, at38)).toBeGreaterThan(silhouetteDivergence(occ0, at8))
    expect(silhouetteDivergence(occ0, at38)).toBeLessThan(0.85)
  })
})

describe('warpOccupation — Check Silenzio: in silenzio nulla si muove', () => {
  it('senza audio attivo il campo warpato coincide con l’originale', () => {
    const occ0 = centredBlob()
    const nodes = createCollapseNodeState(occ0)
    for (let i = 0; i < 200; i += 1) {
      advanceCollapseNodes(
        nodes,
        { centroidPull: 0.5, downBias: 0.5, erosionGain: 0.4, jitter: 0.3 },
        0, // activity = 0 → frozen
        0.8,
        0,
        1,
        100,
        Math.random,
        0,
      )
    }
    const out = new Float32Array(occ0.length)
    warpOccupation(occ0, OCC_COLS, OCC_ROWS, nodes, out)
    expect(silhouetteDivergence(occ0, out)).toBe(0)
  })
})
