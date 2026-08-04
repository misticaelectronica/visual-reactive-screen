import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import type { BrainRhythmState } from './brainRhythm'
import {
  BRAIN_PSYCHO2D_MODES,
  buildPsycho2dModeSequence,
  calculateBrainPsycho2dBandDrives,
  calculateBrainPsycho2dFrameInterval,
  calculateBrainPsycho2dLayerMorph,
  calculateBrainPsycho2dMotion,
  shouldRenderBrainPsycho2dFrame,
} from './brainPsycho2dCanvas'

const RHYTHM: BrainRhythmState = {
  beat: true,
  beatIndex: 4,
  beatPhase: 0,
  musicalPosition: 4,
  beatPulse: 1,
  beatDurationMs: 500,
  bandTransients: { low: 0, lowMid: 0, mid: 0, high: 0 },
}

describe('Brain Psycho2D', () => {
  it('estrae quattro linguaggi differenti dai sette disponibili', () => {
    const modes = buildPsycho2dModeSequence(4, () => 0.73)
    expect(BRAIN_PSYCHO2D_MODES).toHaveLength(7)
    expect(new Set(modes).size).toBe(4)
    expect(modes.every((mode) => BRAIN_PSYCHO2D_MODES.includes(mode))).toBe(true)
  })

  it('resta quasi immobile in silenzio', () => {
    const motion = calculateBrainPsycho2dMotion(
      { low: 0, lowMid: 0, mid: 0, high: 0 },
      DEFAULT_SETTINGS,
      undefined,
      0,
    )
    expect(motion.activity).toBe(0)
    expect(motion.depthPx).toBe(0)
    expect(motion.propagationPx).toBe(0)
    expect(motion.dislocationPx).toBe(0)
    expect(motion.chromaticPx).toBe(0)
  })

  it('usa una cadenza stabile senza degradare la sola generazione testuale', () => {
    expect(calculateBrainPsycho2dFrameInterval(false, false)).toBeCloseTo(
      1_000 / 24,
    )
    expect(calculateBrainPsycho2dFrameInterval(false, true)).toBeCloseTo(
      1_000 / 20,
    )
    expect(calculateBrainPsycho2dFrameInterval(true, false)).toBeCloseTo(
      1_000 / 18,
    )
  })

  it('non congela firme uguali durante la musica ma le salta in silenzio', () => {
    expect(shouldRenderBrainPsycho2dFrame(true, 'same', 'same')).toBe(true)
    expect(shouldRenderBrainPsycho2dFrame(false, 'same', 'same')).toBe(false)
    expect(shouldRenderBrainPsycho2dFrame(false, 'next', 'same')).toBe(true)
  })

  it('assegna un gesto distinto a ciascuna banda', () => {
    const low = calculateBrainPsycho2dMotion(
      { low: 0.8, lowMid: 0, mid: 0, high: 0 },
      DEFAULT_SETTINGS,
      RHYTHM,
      2,
    )
    const lowMid = calculateBrainPsycho2dMotion(
      { low: 0, lowMid: 0.8, mid: 0, high: 0 },
      DEFAULT_SETTINGS,
      RHYTHM,
      2,
    )
    const mid = calculateBrainPsycho2dMotion(
      { low: 0, lowMid: 0, mid: 0.8, high: 0 },
      DEFAULT_SETTINGS,
      RHYTHM,
      2,
    )
    const high = calculateBrainPsycho2dMotion(
      { low: 0, lowMid: 0, mid: 0, high: 0.8 },
      DEFAULT_SETTINGS,
      RHYTHM,
      2,
    )
    expect(low.depthPx).toBeGreaterThan(0)
    expect(low.propagationPx).toBe(0)
    expect(lowMid.propagationPx).toBeGreaterThan(0)
    expect(lowMid.dislocationPx).toBe(0)
    expect(mid.dislocationPx).toBeGreaterThan(0)
    expect(mid.chromaticPx).toBe(0)
    expect(high.chromaticPx).toBeGreaterThan(0)
  })

  it('fa avanzare il livello attivo con il beat marching', () => {
    const first = calculateBrainPsycho2dMotion(
      { low: 0.5, lowMid: 0.4, mid: 0.3, high: 0.2 },
      DEFAULT_SETTINGS,
      RHYTHM,
      1,
    )
    const next = calculateBrainPsycho2dMotion(
      { low: 0.5, lowMid: 0.4, mid: 0.3, high: 0.2 },
      DEFAULT_SETTINGS,
      RHYTHM,
      2,
    )
    expect(first.activeLayer).toBe(1)
    expect(next.activeLayer).toBe(2)
  })

  it('mantiene un drive continuo anche quando la banda coincide con la media', () => {
    const bands = { low: 0.2, lowMid: 0.16, mid: 0.12, high: 0.08 }
    const drives = calculateBrainPsycho2dBandDrives(bands, bands)

    expect(drives.low).toBeGreaterThan(0)
    expect(drives.lowMid).toBeGreaterThan(0)
    expect(drives.mid).toBeGreaterThan(0)
    expect(drives.high).toBeGreaterThan(0)
  })

  it('muove una banda lungo la fase del beat senza cambiare la sua energia', () => {
    const bands = { low: 0.5, lowMid: 0, mid: 0, high: 0 }
    const averages = { low: 0.35, lowMid: 0, mid: 0, high: 0 }
    const first = calculateBrainPsycho2dMotion(
      bands,
      DEFAULT_SETTINGS,
      { ...RHYTHM, beat: false, beatPulse: 0, beatPhase: 0 },
      1,
      6,
      averages,
    )
    const opposite = calculateBrainPsycho2dMotion(
      bands,
      DEFAULT_SETTINGS,
      { ...RHYTHM, beat: false, beatPulse: 0, beatPhase: 0.5 },
      1,
      6,
      averages,
    )

    expect(first.depthPx).toBeCloseTo(opposite.depthPx)
    expect(first.depthOffsetPx).toBeGreaterThan(0)
    expect(opposite.depthOffsetPx).toBeLessThan(0)
  })

  it('deforma le masse in entrata e le ricompone a fine morph', () => {
    const start = calculateBrainPsycho2dLayerMorph(
      0,
      'enter',
      0,
      6,
      42,
      'corrente',
    )
    const end = calculateBrainPsycho2dLayerMorph(
      1,
      'enter',
      0,
      6,
      42,
      'corrente',
    )
    expect(Math.abs(start.x) + Math.abs(start.y)).toBeGreaterThan(0)
    expect(start.scaleX).not.toBe(1)
    expect(end.x).toBe(0)
    expect(end.y).toBe(0)
    expect(end.scaleX).toBe(1)
    expect(end.scaleY).toBe(1)
    expect(end.alpha).toBe(1)
  })
})
