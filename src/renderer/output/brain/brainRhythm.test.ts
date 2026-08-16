import { describe, expect, it, vi } from 'vitest'
import { BrainRhythmClock, calculateBrainKickEnvelope } from './brainRhythm'

describe('BrainRhythmClock', () => {
  it('rinforza leggermente il beat con i transienti bassi senza superare il clamp', () => {
    expect(calculateBrainKickEnvelope(0.5, 0.5, 0)).toBeCloseTo(0.54, 2)
    expect(calculateBrainKickEnvelope(1, 1, 1)).toBe(1)
    expect(calculateBrainKickEnvelope(0, 0, 0)).toBe(0)
  })

  it('rileva transienti bassi e stima il tempo senza duplicare lo stesso picco', () => {
    const clock = new BrainRhythmClock()
    const quiet = { low: 0.05, lowMid: 0.04, mid: 0.03, high: 0.02 }
    const kick = { ...quiet, low: 0.8 }

    expect(clock.update(quiet, 100).beat).toBe(false)
    expect(clock.update(kick, 500).beat).toBe(true)
    expect(clock.update(kick, 540).beat).toBe(false)
    clock.update(quiet, 760)
    const secondBeat = clock.update(kick, 1_000)

    expect(secondBeat.beat).toBe(true)
    expect(secondBeat.beatIndex).toBe(2)
    expect(secondBeat.beatDurationMs).toBeCloseTo(500, 0)
    expect(secondBeat.beatPhase).toBe(0)
    expect(secondBeat.musicalPosition % 1).toBe(0)
    expect(secondBeat.kickEnvelope).toBeGreaterThan(0)
  })

  it('mantiene una fase musicale continua anche senza transienti', () => {
    const clock = new BrainRhythmClock()
    const quiet = { low: 0.04, lowMid: 0.03, mid: 0.02, high: 0.01 }

    const first = clock.update(quiet, 250)
    const second = clock.update(quiet, 375)

    expect(second.beat).toBe(false)
    expect(second.beatPhase).toBeGreaterThan(first.beatPhase)
    expect(second.musicalPosition).toBeGreaterThan(first.musicalPosition)
  })

  it('non riporta indietro il movimento quando la fase attraversa una battuta virtuale', () => {
    const clock = new BrainRhythmClock()
    const quiet = { low: 0.04, lowMid: 0.03, mid: 0.02, high: 0.01 }
    const positions: number[] = []

    for (let now = 100; now <= 1_600; now += 100) {
      positions.push(clock.update(quiet, now).musicalPosition)
    }

    expect(
      positions.every(
        (position, index) => index === 0 || position > positions[index - 1],
      ),
    ).toBe(true)
    expect(positions.at(-1)).toBeGreaterThan(2)
  })

  it('congela fase e posizione musicale nel silenzio reale', () => {
    const clock = new BrainRhythmClock()
    const silence = { low: 0, lowMid: 0, mid: 0, high: 0 }

    const first = clock.update(silence, 100)
    const second = clock.update(silence, 1_100)

    expect(first.active).toBe(false)
    expect(second.active).toBe(false)
    expect(second.beatPhase).toBe(first.beatPhase)
    expect(second.musicalPosition).toBe(first.musicalPosition)
  })

  it('non scambia la pausa fra due kick per silenzio', () => {
    const clock = new BrainRhythmClock()
    const signal = { low: 0.12, lowMid: 0.04, mid: 0.02, high: 0.01 }
    const silence = { low: 0, lowMid: 0, mid: 0, high: 0 }

    const audible = clock.update(signal, 100)
    const betweenKicks = clock.update(silence, 650)
    const confirmedSilence = clock.update(silence, 1_050)

    expect(audible.active).toBe(true)
    expect(betweenKicks.active).toBe(true)
    expect(betweenKicks.musicalPosition).toBeGreaterThan(audible.musicalPosition)
    expect(confirmedSilence.active).toBe(false)
  })

  it('riallinea la fase quando rileva un nuovo transiente', () => {
    const clock = new BrainRhythmClock()
    const quiet = { low: 0.04, lowMid: 0.03, mid: 0.02, high: 0.01 }
    const kick = { ...quiet, low: 0.85 }

    clock.update(quiet, 100)
    const before = clock.update(quiet, 450)
    const onBeat = clock.update(kick, 500)

    expect(onBeat.beat).toBe(true)
    expect(onBeat.musicalPosition).toBeGreaterThan(before.musicalPosition)
    expect(onBeat.beatPhase).toBe(0)
    expect(onBeat.musicalPosition % 1).toBe(0)
  })

  it('rileva attacco e rilascio separati sulle quattro bande', () => {
    const clock = new BrainRhythmClock()
    const silence = { low: 0, lowMid: 0, mid: 0, high: 0 }
    let now = 100
    clock.update(silence, now)

    for (const band of ['low', 'lowMid', 'mid', 'high'] as const) {
      now += 100
      const attack = clock.update({ ...silence, [band]: 0.8 }, now)
      expect(attack.bandTransients[band]).toBeGreaterThan(0)
      now += 60
      const release = clock.update(silence, now)
      expect(release.bandTransients[band]).toBeLessThan(
        attack.bandTransients[band],
      )
    }
  })

  it('mantiene il tempo quando manca un singolo beat rilevato', () => {
    const clock = new BrainRhythmClock()
    const quiet = { low: 0.04, lowMid: 0.03, mid: 0.02, high: 0.01 }
    const kick = { ...quiet, low: 0.82 }

    clock.update(quiet, 100)
    clock.update(kick, 500)
    clock.update(quiet, 760)
    clock.update(kick, 1_000)
    clock.update(quiet, 1_260)
    const afterMissingBeat = clock.update(kick, 2_000)

    expect(afterMissingBeat.beat).toBe(true)
    expect(afterMissingBeat.beatDurationMs).toBeCloseTo(500, 0)
    expect(afterMissingBeat.beatIndex).toBe(4)
  })

  it('emette il beat previsto quando il clock è stabile e il segnale continua', () => {
    const clock = new BrainRhythmClock()
    const quiet = { low: 0.04, lowMid: 0.03, mid: 0.02, high: 0.01 }
    const kick = { ...quiet, low: 0.82 }
    const sustained = { ...quiet, low: 0.12, lowMid: 0.04 }
    const averages = { ...quiet, low: 0.08, lowMid: 0.035 }

    clock.update(quiet, 100)
    clock.update(kick, 500)
    clock.update(quiet, 760)
    clock.update(kick, 1_000)
    clock.update(quiet, 1_260)
    clock.update(kick, 1_500)
    clock.update(sustained, 1_760, averages)
    const predicted = clock.update(sustained, 2_010, averages)
    const duplicate = clock.update(sustained, 2_040, averages)

    expect(predicted.beat).toBe(true)
    expect(predicted.beatIndex).toBe(4)
    expect(predicted.beatPhase).toBe(0)
    expect(duplicate.beat).toBe(false)
  })

  it('scarta pacchetti con numero di sequenza obsoleto o duplicato', () => {
    const clock = new BrainRhythmClock()
    const quiet = { low: 0.05, lowMid: 0.04, mid: 0.03, high: 0.02 }

    expect(clock.ingestSample(quiet, 100, undefined, 1)).toBe(true)
    expect(clock.ingestSample(quiet, 110, undefined, 1)).toBe(false)
    expect(clock.ingestSample(quiet, 120, undefined, 0)).toBe(false)
    expect(clock.ingestSample(quiet, 130, undefined, 2)).toBe(true)
  })

  it('proietta la fase in modo continuo tra più RAF senza reinserire campioni', () => {
    const clock = new BrainRhythmClock()
    const quiet = { low: 0.04, lowMid: 0.03, mid: 0.02, high: 0.01 }

    clock.ingestSample(quiet, 100, undefined, 1)
    const state1 = clock.projectState(120)
    const state2 = clock.projectState(140)

    expect(state2.musicalPosition).toBeGreaterThan(state1.musicalPosition)
    expect(state2.beatPhase).toBeGreaterThan(state1.beatPhase)
  })

  it('non perde un beat se arriva un secondo campione prima del RAF', () => {
    const clock = new BrainRhythmClock()
    const quiet = { low: 0.04, lowMid: 0.03, mid: 0.02, high: 0.01 }
    const kick = { ...quiet, low: 0.85 }

    clock.ingestSample(quiet, 100, undefined, 1)
    clock.ingestSample(kick, 500, undefined, 2)
    clock.ingestSample(quiet, 508, undefined, 3)

    const projected = clock.projectState(516)
    const consumed = clock.projectState(532)

    expect(projected.beat).toBe(true)
    expect(projected.beatPhase).toBe(0)
    expect(consumed.beat).toBe(false)
  })

  it('gestisce un gap lungo post-stallo senza scatti o rincorse innaturali', () => {
    const clock = new BrainRhythmClock()
    const quiet = { low: 0.04, lowMid: 0.03, mid: 0.02, high: 0.01 }
    const kick = { ...quiet, low: 0.85 }

    clock.ingestSample(quiet, 100, undefined, 1)
    clock.ingestSample(kick, 500, undefined, 2)
    const beforeStall = clock.projectState(520)

    // Stallo di 3 secondi (es. inferenza WebGPU)
    clock.ingestSample(kick, 3_500, undefined, 3)
    const afterStall = clock.projectState(3_516)

    expect(afterStall.musicalPosition).toBeGreaterThanOrEqual(beforeStall.musicalPosition)
    expect(afterStall.beatPhase).toBeLessThanOrEqual(1)
    expect(afterStall.musicalPosition - beforeStall.musicalPosition).toBeLessThan(1)
  })

  it('ignora campioni troppo vecchi rispetto alla ricezione', () => {
    const onStalePacketIgnored = vi.fn()
    const clock = new BrainRhythmClock({ onStalePacketIgnored })
    const quiet = { low: 0.04, lowMid: 0.03, mid: 0.02, high: 0.01 }

    expect(clock.ingestSample(quiet, 10_000, undefined, 1, 10_050)).toBe(true)
    expect(clock.ingestSample(quiet, 10_100, undefined, 2, 12_000)).toBe(false)
    expect(onStalePacketIgnored).toHaveBeenCalledTimes(1)
  })

  it('riallinea una sola volta dopo un gap senza generare transienti duplicati', () => {
    const onPhaseRealignment = vi.fn()
    const clock = new BrainRhythmClock({ onPhaseRealignment })
    const quiet = { low: 0.04, lowMid: 0.03, mid: 0.02, high: 0.01 }
    const loud = { low: 0.8, lowMid: 0.7, mid: 0.6, high: 0.5 }

    clock.ingestSample(quiet, 1_000, undefined, 1, 1_000)
    clock.projectState(1_016)
    clock.ingestSample(loud, 4_000, undefined, 2, 4_000)
    const realigned = clock.projectState(4_016)

    expect(onPhaseRealignment).toHaveBeenCalledTimes(1)
    expect(realigned.beat).toBe(false)
    expect(realigned.bandTransients).toEqual({ low: 0, lowMid: 0, mid: 0, high: 0 })
  })
})
