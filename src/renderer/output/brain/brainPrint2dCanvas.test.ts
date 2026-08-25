import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import type { BrainRhythmState } from './brainRhythm'
import {
  BRAIN_PRINT2D_MODES,
  advanceContourBreathingPhase,
  advancePrintLifeState,
  buildPrint2dModeSequence,
  calculateBrainPrint2dBandDrives,
  calculateBrainPrint2dFrameInterval,
  calculateBrainPrint2dLayerMorph,
  calculateBrainPrint2dMotion,
  computeContourDoubling,
  computeContourThickness,
  computePrintLifeEnvelope,
  createInitialPrintLifeState,
  shouldRenderBrainPrint2dFrame,
} from './brainPrint2dCanvas'

const RHYTHM: BrainRhythmState = {
  beat: true,
  beatIndex: 4,
  beatPhase: 0,
  musicalPosition: 4,
  beatPulse: 1,
  kickEnvelope: 1,
  beatDurationMs: 500,
  bandTransients: { low: 0, lowMid: 0, mid: 0, high: 0 },
}

describe('Brain Print2D', () => {
  it('estrae quattro linguaggi differenti dai sette disponibili', () => {
    const modes = buildPrint2dModeSequence(4, () => 0.73)
    expect(BRAIN_PRINT2D_MODES).toHaveLength(7)
    expect(new Set(modes).size).toBe(4)
    expect(modes.every((mode) => BRAIN_PRINT2D_MODES.includes(mode))).toBe(true)
  })

  it('resta quasi immobile in silenzio', () => {
    const motion = calculateBrainPrint2dMotion(
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
    expect(calculateBrainPrint2dFrameInterval(false, false)).toBeCloseTo(
      1_000 / 24,
    )
    expect(calculateBrainPrint2dFrameInterval(false, true)).toBeCloseTo(
      1_000 / 20,
    )
    expect(calculateBrainPrint2dFrameInterval(true, false)).toBeCloseTo(
      1_000 / 18,
    )
  })

  it('non congela firme uguali durante la musica ma le salta in silenzio', () => {
    expect(shouldRenderBrainPrint2dFrame(true, 'same', 'same')).toBe(true)
    expect(shouldRenderBrainPrint2dFrame(false, 'same', 'same')).toBe(false)
    expect(shouldRenderBrainPrint2dFrame(false, 'next', 'same')).toBe(true)
  })

  it('assegna un gesto distinto a ciascuna banda', () => {
    const low = calculateBrainPrint2dMotion(
      { low: 0.8, lowMid: 0, mid: 0, high: 0 },
      DEFAULT_SETTINGS,
      RHYTHM,
      2,
    )
    const lowMid = calculateBrainPrint2dMotion(
      { low: 0, lowMid: 0.8, mid: 0, high: 0 },
      DEFAULT_SETTINGS,
      RHYTHM,
      2,
    )
    const mid = calculateBrainPrint2dMotion(
      { low: 0, lowMid: 0, mid: 0.8, high: 0 },
      DEFAULT_SETTINGS,
      RHYTHM,
      2,
    )
    const high = calculateBrainPrint2dMotion(
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
    const first = calculateBrainPrint2dMotion(
      { low: 0.5, lowMid: 0.4, mid: 0.3, high: 0.2 },
      DEFAULT_SETTINGS,
      RHYTHM,
      1,
    )
    const next = calculateBrainPrint2dMotion(
      { low: 0.5, lowMid: 0.4, mid: 0.3, high: 0.2 },
      DEFAULT_SETTINGS,
      RHYTHM,
      2,
    )
    expect(first.activeLayer).toBe(1)
    expect(next.activeLayer).toBe(2)
  })

  it('aggiunge un accento moderato di profondità quando arriva il kick condiviso', () => {
    const bands = { low: 0.42, lowMid: 0, mid: 0, high: 0 }
    const averages = { low: 0.3, lowMid: 0, mid: 0, high: 0 }
    const withoutKick = calculateBrainPrint2dMotion(
      bands,
      DEFAULT_SETTINGS,
      { ...RHYTHM, beat: false, beatPulse: 0, kickEnvelope: 0 },
      1,
      6,
      averages,
    )
    const withKick = calculateBrainPrint2dMotion(
      bands,
      DEFAULT_SETTINGS,
      { ...RHYTHM, beat: true, beatPulse: 0.72, kickEnvelope: 0.86 },
      1,
      6,
      averages,
    )

    expect(withKick.depthPx).toBeGreaterThan(withoutKick.depthPx)
    expect(withKick.depthPx - withoutKick.depthPx).toBeLessThan(4)
  })

  it('mantiene un drive continuo anche quando la banda coincide con la media', () => {
    const bands = { low: 0.2, lowMid: 0.16, mid: 0.12, high: 0.08 }
    const drives = calculateBrainPrint2dBandDrives(bands, bands)

    expect(drives.low).toBeGreaterThan(0)
    expect(drives.lowMid).toBeGreaterThan(0)
    expect(drives.mid).toBeGreaterThan(0)
    expect(drives.high).toBeGreaterThan(0)
  })

  it('muove una banda lungo la fase del beat senza cambiare la sua energia', () => {
    const bands = { low: 0.5, lowMid: 0, mid: 0, high: 0 }
    const averages = { low: 0.35, lowMid: 0, mid: 0, high: 0 }
    const first = calculateBrainPrint2dMotion(
      bands,
      DEFAULT_SETTINGS,
      { ...RHYTHM, beat: false, beatPulse: 0, beatPhase: 0 },
      1,
      6,
      averages,
    )
    const opposite = calculateBrainPrint2dMotion(
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
    const start = calculateBrainPrint2dLayerMorph(
      0,
      'enter',
      0,
      6,
      42,
      'corrente',
    )
    const end = calculateBrainPrint2dLayerMorph(
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

describe('Print2D — vita interna (PIANO-039)', () => {
  it('resta vivo finché non arriva un fronte di salita del flash', () => {
    let state = createInitialPrintLifeState(0)
    state = advancePrintLifeState(state, false, 0, 100)
    expect(state.phase).toBe('vivo')
  })

  it('attraversa la catena vivo → freeze → impulso → decadimento → vivo', () => {
    let state = createInitialPrintLifeState(0)
    state = advancePrintLifeState(state, true, 0.8, 0)
    expect(state.phase).toBe('freeze')

    // Durante il freeze un nuovo fronte di salita non riarma la sequenza.
    state = advancePrintLifeState(state, true, 0.9, 50)
    expect(state.phase).toBe('freeze')

    state = advancePrintLifeState(state, false, 0, 131)
    expect(state.phase).toBe('impulso')

    state = advancePrintLifeState(state, false, 0, 302)
    expect(state.phase).toBe('decadimento')

    state = advancePrintLifeState(state, false, 0, 1_000)
    expect(state.phase).toBe('vivo')
  })

  it('un fronte di salita durante il decadimento riarma subito il freeze', () => {
    let state = createInitialPrintLifeState(0)
    state = advancePrintLifeState(state, true, 0.5, 0)
    state = advancePrintLifeState(state, false, 0, 131)
    state = advancePrintLifeState(state, false, 0, 302)
    expect(state.phase).toBe('decadimento')
    state = advancePrintLifeState(state, true, 1, 400)
    expect(state.phase).toBe('freeze')
    expect(state.impulseIntensity).toBe(1)
  })

  it('il freeze azzera la respirazione, il decadimento la ripristina gradualmente', () => {
    const freeze = computePrintLifeEnvelope({ phase: 'freeze', phaseStartedAt: 0, impulseIntensity: 0.7 }, 50)
    expect(freeze.breathingGate).toBe(0)
    expect(freeze.impulseDrive).toBe(0)

    const impulse = computePrintLifeEnvelope({ phase: 'impulso', phaseStartedAt: 0, impulseIntensity: 0.7 }, 50)
    expect(impulse.breathingGate).toBe(0)
    expect(impulse.impulseDrive).toBe(0.7)

    const decayStart = computePrintLifeEnvelope({ phase: 'decadimento', phaseStartedAt: 0, impulseIntensity: 0.7 }, 1)
    const decayEnd = computePrintLifeEnvelope({ phase: 'decadimento', phaseStartedAt: 0, impulseIntensity: 0.7 }, 619)
    expect(decayEnd.breathingGate).toBeGreaterThan(decayStart.breathingGate)
    expect(decayEnd.impulseDrive).toBeLessThan(decayStart.impulseDrive)

    const vivo = computePrintLifeEnvelope({ phase: 'vivo', phaseStartedAt: 0, impulseIntensity: 0 }, 999)
    expect(vivo).toEqual({ breathingGate: 1, impulseDrive: 0 })
  })

  it('la respirazione del contorno avanza solo con attività reale (Check Silenzio)', () => {
    expect(advanceContourBreathingPhase(0.4, 500, 0)).toBe(0.4)
    expect(advanceContourBreathingPhase(0.4, 500, 0.6)).toBeGreaterThan(0.4)
  })

  it('spessore e sdoppiamento del contorno crescono con attività/beat/impulso', () => {
    const quiet = computeContourThickness(0, 0, 0, 0)
    const active = computeContourThickness(0.25, 0.8, 0.6, 0)
    const impulse = computeContourThickness(0.25, 0.8, 0.6, 1)
    expect(active).toBeGreaterThan(quiet)
    expect(impulse).toBeGreaterThan(active)

    const doublingQuiet = computeContourDoubling(0, 0, 0, 0)
    const doublingImpulse = computeContourDoubling(0, 0.5, 0.5, 1)
    expect(doublingImpulse).toBeGreaterThan(doublingQuiet)
  })
})
