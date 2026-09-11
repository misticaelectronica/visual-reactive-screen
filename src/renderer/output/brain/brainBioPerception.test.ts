import { describe, expect, it } from 'vitest'
import type { BandEnergies } from '@shared/types'
import {
  advanceBioEnvelopes,
  advanceBioRhythmConstraint,
  calculateRhythmConstraint,
  createInitialBioRhythmConstraintState,
  advanceBioReference,
  advanceBioRegime,
  advanceBioResidual,
  advanceBioTemporalOccupancy,
  advanceBioTrend,
  BrainBioPerceptionClock,
  calculateChange,
  calculatePersistence,
  calculatePerceptualPressure,
  calculateSpectralOccupancy,
  calculateSustainedEnergy,
  calculateTemporalOccupancy,
  classifyPressureTrend,
  classifyRawBioRegime,
  createInitialBioEnvelopes,
  createInitialBioPerceptionState,
  createInitialBioReferenceState,
  createInitialBioRegimeState,
  createInitialBioResidualState,
  createInitialBioTemporalOccupancyState,
  createInitialBioTrendState,
  type BrainBioPerceptionSignals,
  type BrainBioRegimeState,
} from './brainBioPerception'

const SILENT: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }

describe('rhythmConstraint — confirmed attacks versus clock prediction', () => {
  const bass: BandEnergies = { low: 0.9, lowMid: 0.8, mid: 0.1, high: 0.1 }
  const predicted = { active: true, kickEnvelope: 1, beatPulse: 1 }

  it('does not turn a sustained bass bed and projected beats into constraint', () => {
    let state = createInitialBioRhythmConstraintState()
    for (let i = 0; i < 600; i += 1) {
      state = advanceBioRhythmConstraint(state, bass, SILENT, predicted, 50)
    }
    expect(state.lowEnd).toBeGreaterThan(0.8)
    expect(state.pulse).toBe(0)
    expect(calculateRhythmConstraint(state)).toBe(0)
  })

  it('responds to real articulation at identical band energy and releases in silence', () => {
    let state = createInitialBioRhythmConstraintState()
    for (let i = 0; i < 600; i += 1) {
      state = advanceBioRhythmConstraint(state, bass,
        i % 10 === 0 ? { low: 1, lowMid: 0.7, mid: 0.5, high: 0.5 } : SILENT,
        predicted, 50)
    }
    const activeConstraint = calculateRhythmConstraint(state)
    expect(activeConstraint).toBeGreaterThan(0)
    const oneMissingBeat = advanceBioRhythmConstraint(state, bass, SILENT, predicted, 500)
    expect(calculateRhythmConstraint(oneMissingBeat)).toBeGreaterThan(activeConstraint * 0.5)
    for (let i = 0; i < 600; i += 1) {
      state = advanceBioRhythmConstraint(state, SILENT, SILENT,
        { active: false, kickEnvelope: 0, beatPulse: 0 }, 50)
    }
    expect(calculateRhythmConstraint(state)).toBeLessThan(0.000001)
  })

  it('does not depend on projected pulse amplitude when confirmed attacks are identical', () => {
    const initial = createInitialBioRhythmConstraintState()
    const a = advanceBioRhythmConstraint(initial, bass, bass, predicted, 50)
    const b = advanceBioRhythmConstraint(initial, bass, bass,
      { active: true, kickEnvelope: 0, beatPulse: 0 }, 50)
    expect(a).toEqual(b)
  })
})

function feed(bands: BandEnergies, steps: number, stepMs: number) {
  let envelopes = createInitialBioEnvelopes()
  for (let index = 0; index < steps; index += 1) {
    envelopes = advanceBioEnvelopes(envelopes, bands, stepMs)
  }
  return envelopes
}

describe('createInitialBioPerceptionState', () => {
  it('parte da unresolved e segnali a zero, mai un cast da un valore ignoto', () => {
    const state = createInitialBioPerceptionState()
    expect(state.regime).toBe('unresolved')
    expect(state.signals.persistence).toBe(0)
    expect(state.signals.pressureTrend).toBe('stable')
  })
})

describe('persistence e change — invariante §3: non complementari', () => {
  it('un transient forte alza la distanza fast/mid lasciando mid vicino a reference', () => {
    // Stato stabile a lungo: fast e mid convergono, mid vicino a reference.
    const steady: BandEnergies = { low: 0.4, lowMid: 0.35, mid: 0.3, high: 0.2 }
    const settled = feed(steady, 400, 100) // ~40s, ben oltre mid (10s)
    const reference = settled.mid

    // Un singolo transient forte sposta fast senza aver ancora spostato mid
    // in modo significativo (un solo passo, deltaMs piccolo).
    const spike: BandEnergies = { low: 0.95, lowMid: 0.9, mid: 0.85, high: 0.8 }
    const afterSpike = advanceBioEnvelopes(settled, spike, 50)

    const persistence = calculatePersistence(afterSpike)
    const change = calculateChange(afterSpike.mid, reference)

    // Il transient abbassa la persistence (fast si è mosso, mid no ancora)...
    expect(persistence).toBeLessThan(1)
    // ...ma NON attraverso `change = 1 - persistence`: change resta molto più
    // basso di quanto "1 - persistence" implicherebbe, perché mid non si è
    // ancora spostato rispetto a reference — sono due confronti fra coppie
    // diverse di inviluppi, non complementari.
    expect(change).toBeLessThan(0.05)
    expect(change).toBeLessThan((1 - persistence) / 2)
  })
})

describe('perceptualPressure — invariante §3: non coincide con l\'energia', () => {
  it('controesempio dell\'Audio: varianza alta ma poca occupazione ≠ pressione alta', () => {
    // .8/.1/.1/.1: molta energia in una sola banda, poca occupazione spettrale.
    const sparse: BandEnergies = { low: 0.8, lowMid: 0.1, mid: 0.1, high: 0.1 }
    const sparseEnvelopes = feed(sparse, 200, 50)
    const sparseSustained = calculateSustainedEnergy(sparseEnvelopes.fast)
    const sparseOccupancy = calculateSpectralOccupancy(sparseEnvelopes.fast)
    const sparsePressure = calculatePerceptualPressure(sparseSustained, sparseOccupancy, 0)

    // .55/.52/.50/.48: energia comparabile ma spettro pieno e occupato.
    const full: BandEnergies = { low: 0.55, lowMid: 0.52, mid: 0.5, high: 0.48 }
    const fullEnvelopes = feed(full, 200, 50)
    const fullSustained = calculateSustainedEnergy(fullEnvelopes.fast)
    const fullOccupancy = calculateSpectralOccupancy(fullEnvelopes.fast)
    const fullPressure = calculatePerceptualPressure(fullSustained, fullOccupancy, 0)

    expect(sparseOccupancy).toBeLessThan(fullOccupancy)
    expect(fullPressure).toBeGreaterThan(sparsePressure)
  })

  it('energia moderata + piena occupazione spettrale e temporale può superare energia alta isolata', () => {
    const isolatedSpike: BandEnergies = { low: 1, lowMid: 0, mid: 0, high: 0 }
    const spikeEnvelopes = feed(isolatedSpike, 100, 50)
    const spikeSustained = calculateSustainedEnergy(spikeEnvelopes.fast)
    const spikeOccupancy = calculateSpectralOccupancy(spikeEnvelopes.fast)
    const spikePressure = calculatePerceptualPressure(spikeSustained, spikeOccupancy, 0)

    const moderateFull: BandEnergies = { low: 0.5, lowMid: 0.5, mid: 0.5, high: 0.5 }
    const moderateEnvelopes = feed(moderateFull, 100, 50)
    const moderateSustained = calculateSustainedEnergy(moderateEnvelopes.fast)
    const moderateOccupancy = calculateSpectralOccupancy(moderateEnvelopes.fast)
    const moderatePressure = calculatePerceptualPressure(moderateSustained, moderateOccupancy, 1)

    expect(moderatePressure).toBeGreaterThan(spikePressure)
  })
})

describe('occupazione temporale — indipendente dall\'occupazione spettrale', () => {
  it('un pad continuo (bande piene, pochi transient) ha bassa occupazione temporale', () => {
    let temporal = createInitialBioTemporalOccupancyState()
    // Nessun transient per 3 secondi: il gap satura.
    for (let index = 0; index < 30; index += 1) {
      temporal = advanceBioTemporalOccupancy(temporal, SILENT, 100)
    }
    expect(calculateTemporalOccupancy(temporal)).toBeLessThan(0.05)
  })

  it('transient ravvicinati mantengono alta l\'occupazione temporale', () => {
    let temporal = createInitialBioTemporalOccupancyState()
    const event: BandEnergies = { low: 0.2, lowMid: 0, mid: 0, high: 0 }
    // Oltre 4 volte la costante di smoothing (1.5s): la stima deve aver
    // convertito la sequenza continua di eventi in un gap vicino a zero.
    for (let index = 0; index < 80; index += 1) {
      temporal = advanceBioTemporalOccupancy(temporal, event, 80)
    }
    expect(calculateTemporalOccupancy(temporal)).toBeGreaterThan(0.9)
  })
})

describe('reference — macchina a stati a due fasi (correzione Audio, PIANO-040 §4.1)', () => {
  const worldA: BandEnergies = { low: 0.3, lowMid: 0.3, mid: 0.3, high: 0.3 }
  const worldB: BandEnergies = { low: 0.8, lowMid: 0.75, mid: 0.7, high: 0.65 } // molto distante da A

  it('resta "stable" e congelata se change non supera la soglia', () => {
    let reference = createInitialBioReferenceState(worldA, 0.5)
    const nearbyMid: BandEnergies = { low: 0.32, lowMid: 0.31, mid: 0.29, high: 0.3 }
    reference = advanceBioReference(reference, nearbyMid, 0.95, 0.52, 20_000)
    expect(reference.phase).toBe('stable')
    expect(reference.vector).toEqual(worldA)
    // Congelata: non cattura la pressione live mentre resta 'stable'.
    expect(reference.pressure).toBe(0.5)
  })

  it('non entra in "awaiting-confirmation" su un singolo campione oltre soglia, solo se sostenuto', () => {
    let reference = createInitialBioReferenceState(worldA, 0.5)
    // Un solo passo breve oltre soglia: non basta.
    reference = advanceBioReference(reference, worldB, 0.5, 0.9, 200)
    expect(reference.phase).toBe('stable')
    // Sommati fino a superare la finestra di conferma (3s): ora sì.
    reference = advanceBioReference(reference, worldB, 0.5, 0.9, 3_000)
    expect(reference.phase).toBe('awaiting-confirmation')
    // La reference resta congelata al vecchio valore, non salta a worldB.
    expect(reference.vector).toEqual(worldA)
  })

  it('in attesa, promuove il candidato solo dopo persistence sostenuta, non a un singolo campione alto', () => {
    let reference = createInitialBioReferenceState(worldA, 0.5)
    reference = advanceBioReference(reference, worldB, 0.5, 0.9, 3_200) // entra in awaiting-confirmation
    expect(reference.phase).toBe('awaiting-confirmation')

    reference = advanceBioReference(reference, worldB, 0.9, 0.9, 500) // persistence alta ma breve
    expect(reference.phase).toBe('awaiting-confirmation')
    expect(reference.vector).toEqual(worldA)

    reference = advanceBioReference(reference, worldB, 0.9, 0.85, 4_000) // ora sostenuta abbastanza
    expect(reference.phase).toBe('stable')
    expect(reference.vector).toEqual(worldB)
    // La pressione promossa è la MEDIA sull'intera finestra di attesa
    // (0.9 → 0.85), non l'ultimo campione isolato — corretto dopo un
    // secondo collaudo dal vivo: uno snapshot singolo cadeva quasi sempre
    // vicino a un picco locale, rendendo l'uscita dal respiro quasi
    // irraggiungibile (vedi il commento su `pendingPressure` nel sorgente).
    expect(reference.pressure).toBeGreaterThan(0.85)
    expect(reference.pressure).toBeLessThan(0.9)
  })

  it('un calo di persistence durante l\'attesa azzera il conteggio, non forza mai una promozione prematura', () => {
    let reference = createInitialBioReferenceState(worldA, 0.5)
    reference = advanceBioReference(reference, worldB, 0.5, 0.9, 3_200)
    expect(reference.phase).toBe('awaiting-confirmation')

    // Alterna persistence alta/bassa: il totale cumulato di tempo "alto"
    // supera abbondantemente 4s, ma mai in un tratto continuo — non deve
    // mai promuovere.
    for (let index = 0; index < 30; index += 1) {
      reference = advanceBioReference(reference, worldB, index % 2 === 0 ? 0.9 : 0.2, 0.9, 3_000)
    }
    expect(reference.phase).toBe('awaiting-confirmation')
    expect(reference.vector).toEqual(worldA)
  })

  it('caso discriminante dell\'Audio: trasformazione lenta con persistence sempre alta non forza un aggiornamento prematuro', () => {
    // fast e mid avanzano insieme, in piccoli passi, verso worldB: la
    // persistence (similarità fast/mid) resta alta per tutta la durata.
    let envelopes = createInitialBioEnvelopes()
    let reference = createInitialBioReferenceState(worldA, 0.5)
    const steps = 400
    const stepMs = 200 // 80s totali
    for (let index = 0; index < steps; index += 1) {
      const t = index / steps
      const target: BandEnergies = {
        low: worldA.low + (worldB.low - worldA.low) * t,
        lowMid: worldA.lowMid + (worldB.lowMid - worldA.lowMid) * t,
        mid: worldA.mid + (worldB.mid - worldA.mid) * t,
        high: worldA.high + (worldB.high - worldA.high) * t,
      }
      envelopes = advanceBioEnvelopes(envelopes, target, stepMs)
      const persistence = calculatePersistence(envelopes)
      reference = advanceBioReference(reference, envelopes.mid, persistence, 0.7, stepMs)
      // Finché il mondo si sta ancora muovendo (rampa in corso) il gate di
      // convergenza di `mid` impedisce OGNI promozione: né prematura né
      // parziale. `reference` resta esattamente su worldA — nessun undershoot
      // verso un punto intermedio fra i due mondi (bug 2026-08-31).
      expect(reference.vector).toEqual(worldA)
    }
    // Rampa finita: worldB viene ora tenuto fermo. Solo adesso `mid` converge e
    // la promozione può completarsi.
    for (let index = 0; index < 300; index += 1) {
      envelopes = advanceBioEnvelopes(envelopes, worldB, stepMs)
      const persistence = calculatePersistence(envelopes)
      reference = advanceBioReference(reference, envelopes.mid, persistence, 0.7, stepMs)
    }
    // Non è rimasta bloccata su A né si è fermata a metà strada: ha raggiunto
    // il nuovo mondo per intero.
    expect(reference.phase).toBe('stable')
    expect(calculateChange(reference.vector, worldB)).toBeLessThan(0.05)
  })

  it('collaudo dal vivo 2026-08-28 (secondo giro): un picco isolato all\'ingresso non ancora la reference al suo valore, la media della finestra sì', () => {
    // Riproduce esattamente la dinamica che bloccava il respiro: la
    // promozione cade su un istante di persistence alta che è anche,
    // per coincidenza, un picco locale (0.95) — non il livello tipico
    // del passaggio (0.75) che lo precede e lo segue per il resto della
    // finestra di conferma.
    let reference = createInitialBioReferenceState(worldA, 0.5)
    reference = advanceBioReference(reference, worldB, 0.5, 0.95, 3_200) // invalida, picco iniziale
    expect(reference.phase).toBe('awaiting-confirmation')
    for (let index = 0; index < 39; index += 1) {
      reference = advanceBioReference(reference, worldB, 0.9, 0.75, 100) // 3.9s al livello tipico
    }
    reference = advanceBioReference(reference, worldB, 0.9, 0.75, 100) // completa i 4s
    expect(reference.phase).toBe('stable')
    // Se fosse rimasto uno snapshot singolo al picco d'ingresso, sarebbe
    // 0.95 — un'ancora quasi irraggiungibile per una normale risalita. Con
    // la media (tau = finestra di conferma) il picco iniziale pesa una
    // sola costante di tempo, poi il livello tipico prende il sopravvento:
    // il risultato si allontana chiaramente dal picco, verso il tipico.
    expect(reference.pressure).toBeLessThan(0.9)
    expect(reference.pressure).toBeGreaterThan(0.75)
  })
})

// RISCRITTO INTEGRALMENTE (2026-08-28) per il brief Audio "Respiro, memoria
// corporea e ascolto continuo", §11: il vecchio meccanismo (carica gated da
// persistence sostenuta, plateau, rilascio a soglia) rispondeva alla
// domanda sbagliata — "lo stato attuale è coerente abbastanza da meritare
// memoria?" — mentre `residual` deve essere memoria del PRIMA, non un
// giudizio sul presente. Sostituito con un inviluppo a due costanti di
// tempo: reazione rapida in salita, memoria lenta in discesa. Vedi il
// commento sopra `advanceBioResidual` nel sorgente per la derivazione
// completa; i valori numerici qui sotto sono stati misurati con una
// simulazione diretta della funzione, non calcolati a mano.
describe('residual — memoria della pressione precedente, decadimento asimmetrico (brief Audio 2026-08-28, §11)', () => {
  it('insegue in fretta una pressione che sale (non ha senso ricordare un passato più basso del presente)', () => {
    let residual = createInitialBioResidualState()
    for (let index = 0; index < 50; index += 1) {
      residual = advanceBioResidual(residual, 0.8, 100) // 5s
    }
    expect(residual.value).toBeGreaterThan(0.7) // tau di salita 1.5s: quasi assestato in 5s
  })

  it('dopo una pressione che crolla, resta elevato per diversi secondi — la memoria del "prima"', () => {
    let residual = createInitialBioResidualState()
    for (let index = 0; index < 50; index += 1) {
      residual = advanceBioResidual(residual, 0.8, 100) // sale a ~0.8
    }
    const chargedValue = residual.value

    for (let index = 0; index < 50; index += 1) {
      residual = advanceBioResidual(residual, 0.1, 100) // crollo a 0.1, 5s dopo
    }
    // Ben oltre 0.1: la memoria del prima è ancora chiaramente presente,
    // non è scomparsa nello stesso tempo in cui era salita.
    expect(residual.value).toBeGreaterThan(0.5)
    expect(residual.value).toBeLessThan(chargedValue)
  })

  it('la memoria decade ma resta lenta anche oltre i 20s, poi converge davvero al nuovo presente', () => {
    let residual = createInitialBioResidualState()
    for (let index = 0; index < 50; index += 1) residual = advanceBioResidual(residual, 0.8, 100)
    for (let index = 0; index < 200; index += 1) residual = advanceBioResidual(residual, 0.1, 100) // 20s dal crollo
    expect(residual.value).toBeGreaterThan(0.3) // ancora ben sopra il presente (0.1)
    for (let index = 0; index < 300; index += 1) residual = advanceBioResidual(residual, 0.1, 100) // altri 30s
    expect(residual.value).toBeLessThan(0.2) // ora sì, si è assestato vicino al presente
  })

  it('non dipende da persistence: un\'impronta forte non richiede più uno stato "coerente" per esistere', () => {
    // Nessun parametro persistence nella firma: la sola pressione decide,
    // esattamente ciò che il brief chiede (§11, "memoria della
    // configurazione precedente", non giudizio sulla coerenza presente).
    let residual = createInitialBioResidualState()
    for (let index = 0; index < 50; index += 1) {
      residual = advanceBioResidual(residual, 0.9, 100)
    }
    expect(residual.value).toBeGreaterThan(0.8)
  })

  it('un silenzio totale decade lentamente, non si azzera in un istante', () => {
    let residual = createInitialBioResidualState()
    for (let index = 0; index < 50; index += 1) residual = advanceBioResidual(residual, 0.9, 100)
    const chargedValue = residual.value
    residual = advanceBioResidual(residual, 0, 1_000) // 1s di silenzio
    expect(residual.value).toBeGreaterThan(chargedValue * 0.9) // un secondo di vuoto non lo scarica
  })
})

describe('mediana/dispersione del set — SOLO CONTESTO (brief Audio 2026-08-28, §4/§21.7)', () => {
  it('un singolo evento estremo non ridefinisce il centro percettivo (resistenza agli outlier)', () => {
    let trend = createInitialBioTrendState()
    for (let index = 0; index < 600; index += 1) {
      trend = advanceBioTrend(trend, 0.4, 100) // 60s
    }
    const medianBefore = trend.median

    // Un kick fortissimo isolato (un solo campione a 1.0).
    trend = advanceBioTrend(trend, 1, 100)

    // La mediana si sposta di un passo minimo, non in proporzione
    // all'ampiezza dell'outlier.
    expect(trend.median).toBeGreaterThan(medianBefore)
    expect(trend.median - medianBefore).toBeLessThan(0.001)
  })

  it('un bias sostenuto per minuti sposta davvero la mediana (la serata riscrive il proprio centro)', () => {
    let trend = createInitialBioTrendState()
    for (let index = 0; index < 600; index += 1) {
      trend = advanceBioTrend(trend, 0.4, 100) // 60s a 0.4
    }
    const medianBefore = trend.median // ~0.4

    for (let index = 0; index < 3_000; index += 1) {
      trend = advanceBioTrend(trend, 0.8, 100) // 300s (5 minuti) a 0.8
    }
    expect(trend.median).toBeGreaterThan(medianBefore + 0.3) // si è spostata in modo sostanziale
  })

  it('decisione del braccio destro: un silenzio (pausa/cambio traccia) non entra nella storia della mediana', () => {
    let trend = createInitialBioTrendState()
    for (let index = 0; index < 600; index += 1) {
      trend = advanceBioTrend(trend, 0.4, 100) // 60s, mediana assestata su 0.4
    }
    const medianBefore = trend.median

    // 5s di vero silenzio (sotto SAMPLE_VALIDITY_FLOOR) — es. cambio traccia.
    for (let index = 0; index < 50; index += 1) {
      trend = advanceBioTrend(trend, 0.005, 100)
    }
    expect(trend.median).toBe(medianBefore) // il silenzio non ha spostato la mediana

    // Il tempo del set continua comunque a scorrere (elapsedMs non si
    // azzera ad ogni pausa tecnica — decisione deliberata).
    expect(trend.elapsedMs).toBeGreaterThan(64_000)
  })
})

// AUDIO-REGIMI-POSTCOLLAUDO-01: `pressureTrend` non descrive più la posizione
// rispetto al reference ma il verso corrente, confrontando la pressione live
// con la propria linea ritardata già esistente.
describe('classifyPressureTrend — verso corrente della traiettoria di pressione', () => {
  it('sopra la linea ritardata oltre la zona neutra è "rising", sotto è "falling"', () => {
    expect(classifyPressureTrend(0.7, 0.5)).toBe('rising')
    expect(classifyPressureTrend(0.3, 0.5)).toBe('falling')
  })

  it('la zona neutra assorbe un pareggio numerico senza dichiarare una direzione', () => {
    expect(classifyPressureTrend(0.5, 0.5)).toBe('stable')
    expect(classifyPressureTrend(0.51, 0.5)).toBe('stable')
    expect(classifyPressureTrend(0.57, 0.5)).toBe('rising')
  })

  it('legge DECOMPRESSION anche quando il presente resta sopra il vecchio reference', () => {
    // pp=0.70 è ancora sopra un ipotetico reference=0.40, ma è sotto la linea
    // ritardata 0.78: la costrizione sta cedendo e deve leggere falling.
    expect(classifyPressureTrend(0.7, 0.78)).toBe('falling')
  })

  it('legge PRESSURIZED anche quando il presente resta sotto il vecchio reference', () => {
    // pp=0.45 è ancora sotto un ipotetico reference=0.80, ma è sopra la linea
    // ritardata 0.40: la costrizione sta crescendo e deve leggere rising.
    expect(classifyPressureTrend(0.47, 0.4)).toBe('rising')
  })

  it('isteresi: mantiene reattive le oscillazioni reali', () => {
    expect(classifyPressureTrend(0.525, 0.5)).toBe('rising')
    expect(classifyPressureTrend(0.475, 0.5)).toBe('falling')
    expect(classifyPressureTrend(0.515, 0.5)).toBe('stable')
    // Già in 'rising': si esce solo quando `diff` rientra a +0.004 (0.02 −
    // 0.016). A +0.014 — la quantizzazione osservata — NON si esce.
    expect(classifyPressureTrend(0.514, 0.5, 'rising')).toBe('rising')
    expect(classifyPressureTrend(0.506, 0.5, 'rising')).toBe('rising')
    expect(classifyPressureTrend(0.503, 0.5, 'rising')).toBe('stable') // < +0.004
    // Simmetrico in 'falling'.
    expect(classifyPressureTrend(0.486, 0.5, 'falling')).toBe('falling')
    expect(classifyPressureTrend(0.497, 0.5, 'falling')).toBe('stable')
  })

  it('isteresi: tre binari a 0.014 di distanza attorno alla transizione non producono tre stati diversi', () => {
    // Il difetto dimostrato sul campo: pp che oscilla su rotaie quantizzate
    // a ~0.014 vicino alla soglia. Con isteresi, restando in 'rising', i tre
    // livelli 0.512 / 0.526 / 0.540 danno tutti 'rising' — non
    // stable/rising/rising né peggio.
    const lagged = 0.5
    const rails = [0.512, 0.526, 0.54]
    let trend: ReturnType<typeof classifyPressureTrend> = 'rising'
    const seen = new Set<string>()
    for (let cycle = 0; cycle < 6; cycle += 1) {
      for (const pp of rails) {
        trend = classifyPressureTrend(pp, lagged, trend)
        seen.add(trend)
      }
    }
    expect([...seen]).toEqual(['rising'])
  })
})

// RISCRITTE (2026-08-28) per il brief finale Audio/Visual "Respiro Alto,
// Respiro Profondo e stasi strutturale": due assi indipendenti — forma
// (`pressureTrend`, dalla traiettoria della pressione) e livello (`level`).
// `classifyRawBioRegime` traduce il verso in passaggio oppure, quando il verso
// è stabile, il livello in una stasi abitata.
const PRESSURIZED_SIGNALS: BrainBioPerceptionSignals = {
  persistence: 0.8,
  change: 0.1,
  residual: 0,
  perceptualPressure: 0.9,
  pressureTrend: 'rising',
}
const DECOMPRESSION_SIGNALS: BrainBioPerceptionSignals = {
  persistence: 0.5,
  change: 0.35,
  residual: 0,
  perceptualPressure: 0.5,
  pressureTrend: 'falling',
}
const STASIS_SIGNALS: BrainBioPerceptionSignals = {
  persistence: 0.9,
  change: 0.15,
  residual: 0.3,
  perceptualPressure: 0.4,
  pressureTrend: 'stable',
}
const ACUTE_DISRUPTION_SIGNALS: BrainBioPerceptionSignals = {
  persistence: 0.2,
  change: 0.15,
  residual: 0,
  perceptualPressure: 0.4,
  pressureTrend: 'stable',
}

describe('classifyRawBioRegime — pressureTrend e livello, senza un secondo gate', () => {
  it('rising/falling sono direttamente passaggi pressurized/decompression', () => {
    expect(classifyRawBioRegime(PRESSURIZED_SIGNALS, null)).toBe('pressurized')
    expect(classifyRawBioRegime(DECOMPRESSION_SIGNALS, null)).toBe('decompression')
  })

  it('con pressureTrend stabile, il livello decide fra RESPIRO ALTO e RESPIRO PROFONDO', () => {
    expect(classifyRawBioRegime(STASIS_SIGNALS, 'alto')).toBe('respiro-alto')
    expect(classifyRawBioRegime(STASIS_SIGNALS, 'profondo')).toBe('respiro-profondo')
    expect(classifyRawBioRegime(STASIS_SIGNALS, null)).toBe('unresolved')
  })

  it('non aggiunge un gate di persistence quando pressureTrend ha già riconosciuto la stasi', () => {
    expect(classifyRawBioRegime(ACUTE_DISRUPTION_SIGNALS, 'alto')).toBe('respiro-alto')
  })

  it('cambiare change/residual non cambia il risultato quando forma e livello sono già decisi altrove', () => {
    expect(classifyRawBioRegime({ ...STASIS_SIGNALS, change: 0.99, residual: 1 }, 'profondo'))
      .toBe('respiro-profondo')
  })
})

describe('advanceBioRegime — silenzio diretto, livello con isteresi, nessuna conferma duplicata', () => {
  const baseSignals = (overrides: Partial<BrainBioPerceptionSignals>): BrainBioPerceptionSignals => ({
    persistence: 0.9,
    change: 0.15,
    residual: 0,
    perceptualPressure: 0.4,
    pressureTrend: 'stable',
    ...overrides,
  })
  const landedRegime = (): BrainBioRegimeState => ({
    ...createInitialBioRegimeState(),
    pressureLagged: 0.4,
    pressureFlatMs: 9_000,
  })

  it('il regime di passaggio segue immediatamente pressureTrend, senza una finestra propria', () => {
    let regime = createInitialBioRegimeState()
    regime = advanceBioRegime(regime, baseSignals({ pressureTrend: 'falling' }), 0.5, 100)
    expect(regime.current).toBe('decompression')
    regime = advanceBioRegime(regime, baseSignals({ pressureTrend: 'rising' }), 0.5, 100)
    expect(regime.current).toBe('pressurized')
  })

  it('alla promozione di una stasi, la reference sopra la mediana + banda è RESPIRO ALTO, sotto è RESPIRO PROFONDO', () => {
    let regime = landedRegime()
    // Alla promozione di una stasi (`justSettled`) il livello usa la
    // `reference.pressure` contro la mediana.
    regime = advanceBioRegime(regime, baseSignals({}), 0.5, 100, false, {
      pressure: 0.8, everPromoted: true, justSettled: true,
    })
    expect(regime.current).toBe('respiro-alto')
    expect(regime.reason).toBe('stasis-settled-alto')
    regime = advanceBioRegime(regime, baseSignals({}), 0.5, 100, false, {
      pressure: 0.2, everPromoted: true, justSettled: true,
    })
    expect(regime.current).toBe('respiro-profondo')
    expect(regime.reason).toBe('stasis-settled-profondo')
  })

  it('fra due promozioni il livello resta congelato alla configurazione (reason stasis-held)', () => {
    let regime = landedRegime()
    regime = advanceBioRegime(regime, baseSignals({}), 0.5, 100, false, {
      pressure: 0.8, everPromoted: true, justSettled: true,
    })
    expect(regime.current).toBe('respiro-alto')
    // Nessuna nuova stasi (`justSettled: false`): il livello NON viene
    // ricalcolato, nemmeno passando una mediana che si è mossa e una pressione
    // di riferimento ora più bassa. La deriva non cambia lo stato.
    regime = advanceBioRegime(regime, baseSignals({}), 0.9, 100, false, {
      pressure: 0.2, everPromoted: true, justSettled: false,
    })
    expect(regime.current).toBe('respiro-alto')
    expect(regime.reason).toBe('stasis-held')
  })

  it('alla promozione, una reference entro la banda neutra attorno alla mediana conserva il livello precedente', () => {
    let regime = landedRegime()
    regime = advanceBioRegime(regime, baseSignals({}), 0.5, 100, false, {
      pressure: 0.8, everPromoted: true, justSettled: true,
    })
    expect(regime.current).toBe('respiro-alto')
    // Nuova stasi ma `reference.pressure` dentro la banda neutra: il livello
    // resta 'alto', non oscilla a profondo né a unresolved.
    regime = advanceBioRegime(regime, baseSignals({}), 0.5, 100, false, {
      pressure: 0.51, everPromoted: true, justSettled: true,
    })
    expect(regime.current).toBe('respiro-alto')
  })

  it('un’oscillazione bidirezionale non viene promossa a Respiro Alto nei punti a trend stable', () => {
    const ref = { pressure: 0.8, everPromoted: true, justSettled: false }
    let regime: BrainBioRegimeState = {
      ...landedRegime(),
      current: 'respiro-alto',
      level: 'alto',
      reason: 'stasis-held',
    }
    const seen = new Set<string>()
    for (const [pressureTrend, perceptualPressure] of [
      ['falling', 0.25], ['stable', 0.3],
      ['rising', 0.7], ['stable', 0.65],
      ['falling', 0.28], ['stable', 0.32],
      ['rising', 0.72], ['stable', 0.68],
    ] as const) {
      regime = advanceBioRegime(
        regime,
        baseSignals({ pressureTrend, perceptualPressure }),
        0.5,
        250,
        false,
        ref,
      )
      seen.add(regime.current)
      expect(regime.current).not.toBe('respiro-alto')
    }
    expect(seen).toContain('decompression')
    expect(seen).toContain('pressurized')
  })

  it('bootstrap: finché reference non è mai stato affidabile, i due respiri non sono dichiarabili', () => {
    let regime = createInitialBioRegimeState()
    // Pressione alta e stabile, ma `everPromoted: false`: resta unresolved.
    regime = advanceBioRegime(regime, baseSignals({}), 0.5, 100, false, {
      pressure: 0.8, everPromoted: false, justSettled: true,
    })
    expect(regime.current).toBe('unresolved')
    expect(regime.reason).toBe('bootstrap')
    // I passaggi restano disponibili anche in bootstrap.
    regime = advanceBioRegime(regime, baseSignals({ pressureTrend: 'rising' }), 0.5, 100, false, {
      pressure: 0.8, everPromoted: false, justSettled: false,
    })
    expect(regime.current).toBe('pressurized')
    expect(regime.reason).toBe('pressure-rising')
  })

  it('prima stasi senza contrasto: reference affidabile ma livello indeterminato (reason stasis-level-indeterminate)', () => {
    let regime = createInitialBioRegimeState()
    // `everPromoted: true`, `justSettled: true`, ma `reference.pressure` ≈ mediana:
    // nessun contrasto per dedurre alto/profondo. Non si inventa.
    regime = advanceBioRegime(regime, baseSignals({}), 0.5, 100, false, {
      pressure: 0.5, everPromoted: true, justSettled: true,
    })
    expect(regime.current).toBe('unresolved')
    expect(regime.level).toBeNull()
    expect(regime.reason).toBe('stasis-level-indeterminate')
  })

  it('una decompressione atterrata diventa Respiro Profondo per livello ereditato, senza attendere reference', () => {
    // `reference.pressure` è ancora quella del vecchio mondo alto (0.8): la
    // via ordinaria resterebbe `decompression` per ~40s finché `reference`
    // non si ri-promuove. L'ereditarietà non aspetta.
    const ref = { pressure: 0.8, everPromoted: true, justSettled: false }
    let regime = createInitialBioRegimeState()
    // discesa REALE: `pp` cala da 0.75 a 0.2 (serve per il latch di direzione
    // — una `pp` costante da zero leggerebbe come "risalita").
    for (const pp of [0.75, 0.6, 0.45, 0.3, 0.2]) {
      regime = advanceBioRegime(
        regime, baseSignals({ pressureTrend: 'falling', perceptualPressure: pp }), 0.5, 500, false, ref,
      )
      expect(regime.current).toBe('decompression')
    }
    // poi `pp` piatta a 0.2: atterra → eredita Respiro Profondo.
    for (let index = 0; index < 60; index += 1) {
      regime = advanceBioRegime(
        regime, baseSignals({ pressureTrend: 'falling', perceptualPressure: 0.2 }), 0.5, 500, false, ref,
      )
    }
    expect(regime.current).toBe('respiro-profondo')
    expect(regime.level).toBe('profondo')
    expect(regime.reason).toBe('stasis-inherited-profondo')
  })

  it('un input falling stantio mentre la pressione risale NON eredita Respiro Profondo', () => {
    // Difesa interna di `advanceBioRegime`: anche se un chiamante consegnasse
    // ancora `falling`, la traiettoria locale 0.1 → 0.72 mostra una risalita.
    // Il latch non deve trasformarla in una discesa atterrata.
    const ref = { pressure: 0.78, everPromoted: true, justSettled: false }
    let regime: BrainBioRegimeState = {
      ...createInitialBioRegimeState(),
      reason: 'silence-authorized',
    }
    const seen = new Set<string>()
    for (const pp of [0.1, 0.25, 0.4, 0.55, 0.66, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72]) {
      regime = advanceBioRegime(
        regime, baseSignals({ pressureTrend: 'falling', perceptualPressure: pp }), 0.5, 500, false, ref,
      )
      seen.add(regime.current)
    }
    expect(seen.has('respiro-profondo')).toBe(false)
  })

  it('una pressurizzazione atterrata diventa Respiro Alto per livello ereditato (simmetrico)', () => {
    const ref = { pressure: 0.3, everPromoted: true, justSettled: false }
    const rising = baseSignals({ pressureTrend: 'rising', perceptualPressure: 0.9 })
    let regime = advanceBioRegime(createInitialBioRegimeState(), rising, 0.5, 500, false, ref)
    expect(regime.current).toBe('pressurized')
    for (let index = 0; index < 30; index += 1) {
      regime = advanceBioRegime(regime, rising, 0.5, 500, false, ref)
    }
    expect(regime.current).toBe('respiro-alto')
    expect(regime.level).toBe('alto')
    expect(regime.reason).toBe('stasis-inherited-alto')
  })

  // Diagnosi Vice Consigliere 2026-09-11: sul corpus reale (respiro-profondo.mp3
  // e varianti) `pressureTrend` raggiungeva 'stable' per il 27-43% del tempo
  // ma `regimeReason` restava sempre `pressure-rising`/`pressure-falling` —
  // mai uno stato `stasis-*`, nemmeno `stasis-level-indeterminate`. Causa:
  // `pressureFlatMs` si azzerava a ogni cambio dell'ETICHETTA `pressureTrend`,
  // anche quando `pp` restava continuamente entro `PRESSURE_SETTLE_EPSILON`
  // dalla propria linea ritardata (`landingNow` vero) — l'isteresi in uscita
  // da rising/falling lascia che l'etichetta cambi molto dopo che `pp` ha
  // già smesso di muoversi. Sul segnale reale l'etichetta cambia con cadenza
  // mediana ~1.7s, sempre sotto ai 9s richiesti: il gate non scattava mai.
  it('un cambio di sola etichetta pressureTrend non azzera pressureFlatMs se pp resta atterrata', () => {
    const almostLanded: BrainBioRegimeState = {
      ...createInitialBioRegimeState(),
      pressureTrend: 'rising',
      pressureLagged: 0.399,
      pressureFlatMs: 8_500,
    }
    // pp=0.4, pressureLagged=0.399 → |diff|=0.001, ben dentro PRESSURE_SETTLE_EPSILON
    // (0.02): `landingNow` è vero. L'etichetta passa da 'rising' a 'stable'
    // nello stesso campione (esattamente lo scenario osservato dal vivo).
    const regime = advanceBioRegime(
      almostLanded,
      baseSignals({ pressureTrend: 'stable', perceptualPressure: 0.4 }),
      0.4,
      100,
    )
    expect(regime.pressureFlatMs).toBeGreaterThan(8_500)
  })

  it('un vero nuovo passaggio (pp esce dalla banda di atterraggio) azzera comunque pressureFlatMs', () => {
    const almostLanded: BrainBioRegimeState = {
      ...createInitialBioRegimeState(),
      pressureTrend: 'stable',
      pressureLagged: 0.4,
      pressureFlatMs: 8_500,
    }
    // pp salta a 0.1: |diff|=0.3, ben oltre PRESSURE_SETTLE_EPSILON —
    // `landingNow` è falso, la protezione contro l'eredità di secondi
    // piatti da un passaggio appena iniziato resta intatta.
    const regime = advanceBioRegime(
      almostLanded,
      baseSignals({ pressureTrend: 'falling', perceptualPressure: 0.1 }),
      0.4,
      100,
    )
    expect(regime.pressureFlatMs).toBe(0)
  })

  it('un livello ereditato senza contrasto con la mediana non viene revocato (ordine Capo Supremo 2026-09-05)', () => {
    const ref = { pressure: 0.04, everPromoted: true, justSettled: false }
    let regime: BrainBioRegimeState = {
      ...createInitialBioRegimeState(),
      current: 'respiro-alto',
      level: 'alto',
      reason: 'stasis-inherited-alto',
      pressureLagged: 0.04,
      pressureTrend: 'rising',
    }

    // Un livello alto ereditato durante il build dal silenzio, poi pressione
    // che sale e si ferma esattamente sulla mediana (nessun contrasto).
    // `reference.justSettled` non arriva mai: solo `pressureLanded` decide.
    for (const pp of [0.08, 0.14, 0.2, 0.26]) {
      regime = advanceBioRegime(
        regime,
        baseSignals({ pressureTrend: 'rising', perceptualPressure: pp }),
        0.26,
        250,
        false,
        ref,
      )
    }
    for (let index = 0; index < 60; index += 1) {
      regime = advanceBioRegime(
        regime,
        baseSignals({ pressureTrend: 'rising', perceptualPressure: 0.26 }),
        0.26,
        250,
        false,
        ref,
      )
    }

    // Mancanza di contrasto (pp esattamente sulla mediana): il livello
    // ereditato 'alto' resta, non viene azzerato. Atterrata durante la
    // salita, la pressione eredita subito Respiro Alto (lo stesso gate di
    // "una pressurizzazione atterrata diventa Respiro Alto per livello
    // ereditato" qui sopra) invece di restare 'pressurized' con livello
    // nullo come prima della correzione.
    expect(regime.level).toBe('alto')
    expect(regime.current).toBe('respiro-alto')
    expect(regime.reason).toBe('stasis-inherited-alto')

    for (let index = 0; index < 40; index += 1) {
      regime = advanceBioRegime(
        regime,
        baseSignals({ pressureTrend: 'stable', perceptualPressure: 0.26 }),
        0.26,
        250,
        false,
        ref,
      )
    }
    // Resta Respiro Alto: mai revocato a `unresolved`/`stasis-level-indeterminate`.
    expect(regime.level).toBe('alto')
    expect(regime.current).toBe('respiro-alto')
  })

  it('senza alcun livello precedente, la mancanza di contrasto resta indeterminata', () => {
    const ref = { pressure: 0.04, everPromoted: true, justSettled: false }
    let regime: BrainBioRegimeState = {
      ...createInitialBioRegimeState(),
      current: 'unresolved',
      level: null,
      reason: 'stasis-level-indeterminate',
      pressureLagged: 0.26,
      pressureTrend: 'stable',
    }
    // Nessun `previous.level` da ereditare: la zona neutra resta indeterminata,
    // come prima — `unresolved` non è diventato irraggiungibile, solo non più
    // l'esito di default quando esiste memoria valida.
    for (let index = 0; index < 40; index += 1) {
      regime = advanceBioRegime(
        regime,
        baseSignals({ pressureTrend: 'stable', perceptualPressure: 0.26 }),
        0.26,
        250,
        false,
        ref,
      )
    }
    expect(regime.level).toBeNull()
    expect(regime.current).toBe('unresolved')
    expect(regime.reason).toBe('stasis-level-indeterminate')
  })

  it('in bootstrap l\'ereditarietà non si applica: una pressurizzazione atterrata resta pressurized', () => {
    const ref = { pressure: 0, everPromoted: false, justSettled: false }
    const rising = baseSignals({ pressureTrend: 'rising', perceptualPressure: 0.7 })
    let regime = createInitialBioRegimeState()
    for (let index = 0; index < 20; index += 1) {
      regime = advanceBioRegime(regime, rising, 0.5, 500, false, ref)
    }
    expect(regime.current).toBe('pressurized')
  })

  it('una volta ereditato il Respiro Profondo non fa flicker su una discesa che continua; un\'inversione a rising lo rilascia', () => {
    const ref = { pressure: 0.8, everPromoted: true, justSettled: false }
    let regime = createInitialBioRegimeState()
    // discesa reale, poi piatta a 0.2 → eredita Respiro Profondo.
    for (const pp of [0.7, 0.5, 0.3, 0.2]) {
      regime = advanceBioRegime(
        regime, baseSignals({ pressureTrend: 'falling', perceptualPressure: pp }), 0.5, 500, false, ref,
      )
    }
    for (let index = 0; index < 20; index += 1) {
      regime = advanceBioRegime(
        regime, baseSignals({ pressureTrend: 'falling', perceptualPressure: 0.2 }), 0.5, 500, false, ref,
      )
    }
    expect(regime.current).toBe('respiro-profondo')
    // pp scende ancora un po' (non atterrata): NON torna a decompression.
    regime = advanceBioRegime(
      regime, baseSignals({ pressureTrend: 'falling', perceptualPressure: 0.12 }), 0.5, 500, false, ref,
    )
    expect(regime.current).toBe('respiro-profondo')
    // Inversione reale: pressione di nuovo in salita → rilascia verso il passaggio.
    regime = advanceBioRegime(
      regime, baseSignals({ pressureTrend: 'rising', perceptualPressure: 0.85 }), 0.5, 500, false, ref,
    )
    expect(regime.current).not.toBe('respiro-profondo')
  })

  it('silenzio quasi nullo autorizza direttamente il Respiro Profondo in due secondi', () => {
    let regime = createInitialBioRegimeState()
    for (let index = 0; index < 19; index += 1) {
      regime = advanceBioRegime(regime, baseSignals({}), 0.5, 100, true)
    }
    expect(regime.silence.authorized).toBe(false)
    regime = advanceBioRegime(regime, baseSignals({}), 0.5, 100, true)
    expect(regime.current).toBe('respiro-profondo')
    expect(regime.silence.authorized).toBe(true)
  })

  it('un singolo campione dopo un gap lungo non finge due secondi di silenzio osservato', () => {
    const regime = advanceBioRegime(
      createInitialBioRegimeState(),
      baseSignals({}),
      0.5,
      10_000,
      true,
    )
    expect(regime.silence.silentSustainedMs).toBe(250)
    expect(regime.silence.authorized).toBe(false)
  })
})

describe('BrainBioPerceptionClock — composizione end-to-end', () => {
  it('parte da unresolved e attraversa pressurized mentre la pressione sostenuta cresce', () => {
    const clock = new BrainBioPerceptionClock()
    const dense: BandEnergies = { low: 0.7, lowMid: 0.68, mid: 0.65, high: 0.6 }
    let state = clock.getState()
    expect(state.regime).toBe('unresolved')

    let now = 0
    let reachedPressurized = false
    for (let index = 0; index < 60; index += 1) {
      now += 100
      state = clock.ingestSample(dense, now, dense) // i transient coincidono con le bande: evento continuo
      if (state.regime === 'pressurized') reachedPressurized = true
    }
    expect(reachedPressurized).toBe(true)
    expect(state.signals.perceptualPressure).toBeGreaterThan(0.5)
  })

  it('getState() rispecchia l\'ultimo ingestSample senza far avanzare l\'orologio interno', () => {
    const clock = new BrainBioPerceptionClock()
    const dense: BandEnergies = { low: 0.7, lowMid: 0.68, mid: 0.65, high: 0.6 }
    const afterIngest = clock.ingestSample(dense, 1_000, dense)
    const readAgain = clock.getState()
    expect(readAgain).toEqual(afterIngest)
  })

  it('il fader a zero autorizza in 2s e non sposta mediana/dispersione durante il rilascio filtrato', () => {
    const clock = new BrainBioPerceptionClock()
    const dense: BandEnergies = { low: 0.8, lowMid: 0.75, mid: 0.7, high: 0.65 }
    let now = 0
    for (let index = 0; index < 60; index += 1) {
      now += 100
      clock.ingestSample(dense, now, dense)
    }
    const beforeSilence = clock.getRegimeDiagnostics()

    for (let index = 0; index < 19; index += 1) {
      now += 100
      clock.ingestSample(SILENT, now, SILENT)
    }
    let diagnostics = clock.getRegimeDiagnostics()
    expect(diagnostics.silenceAuthorized).toBe(false)
    expect(diagnostics.silenceConfirmationProgress).toBeCloseTo(0.95, 5)
    expect(diagnostics.pressureMedian).toBe(beforeSilence.pressureMedian)
    expect(diagnostics.pressureDispersion).toBe(beforeSilence.pressureDispersion)

    now += 100
    const silentState = clock.ingestSample(SILENT, now, SILENT)
    diagnostics = clock.getRegimeDiagnostics()
    expect(silentState.regime).toBe('respiro-profondo')
    expect(diagnostics.silenceAuthorized).toBe(true)
  })

  it('misura end-to-end: una discesa udibile reagisce subito e, una volta atterrata, entra in Respiro Profondo in secondi (livello ereditato, non attende reference)', () => {
    // Numeri verificati con una simulazione diretta del clock (non calcolati
    // a mano), coerente con la pratica già in uso in questo file: il brief
    // Audio 2026-08-28 chiede reazione in ordine di secondi, non la cifra
    // esatta — le soglie qui sotto verificano l'ordine di grandezza.
    const clock = new BrainBioPerceptionClock()
    const moderate: BandEnergies = { low: 0.34, lowMid: 0.3, mid: 0.26, high: 0.22 }
    const dense: BandEnergies = { low: 0.78, lowMid: 0.72, mid: 0.66, high: 0.58 }
    const sparse: BandEnergies = { low: 0.18, lowMid: 0.14, mid: 0.11, high: 0.08 }
    let now = 0
    // Il LIVELLO alto/profondo si risolve solo per contrasto fra una stasi e
    // la mediana che porta ancora la storia della stasi precedente. Serve
    // quindi una prima stasi (moderate) e poi una trasformazione verso dense:
    // partire direttamente da dense darebbe "prima stasi senza contrasto" →
    // livello indeterminato (comportamento corretto, ma non ciò che questo
    // test misura). Fase 1: 60s moderate → `reference` affidabile.
    for (let index = 0; index < 600; index += 1) {
      now += 100
      clock.ingestSample(moderate, now, moderate)
    }
    // Fase 2: 60s dense → trasformazione, la mediana si congela sul livello di
    // moderate, `reference` si ri-promuove su dense → RESPIRO ALTO per
    // contrasto.
    for (let index = 0; index < 600; index += 1) {
      now += 100
      clock.ingestSample(dense, now, dense)
    }
    expect(clock.getState().regime).toBe('respiro-alto')
    expect(clock.getRegimeDiagnostics().transforming).toBe(false)

    let reachedDecompressionAtMs: number | null = null
    let reachedBreathAtMs: number | null = null
    let breathReason: string | null = null
    for (let index = 1; index <= 300 && reachedBreathAtMs === null; index += 1) {
      now += 100
      const state = clock.ingestSample(sparse, now, SILENT)
      if (state.regime === 'decompression' && reachedDecompressionAtMs === null) {
        reachedDecompressionAtMs = index * 100
      }
      if (state.regime === 'respiro-profondo') {
        reachedBreathAtMs = index * 100
        breathReason = clock.getRegimeDiagnostics().regimeReason
      }
    }
    // Reazione immediata (brief §6/§7/§9): decompressione entro il primo
    // secondo — nessun gate sulla prima reazione.
    expect(reachedDecompressionAtMs).not.toBeNull()
    expect(reachedDecompressionAtMs as number).toBeLessThanOrEqual(1_000)
    // Respiro Profondo NON istantaneo: prima la discesa deve atterrare
    // (`perceptualPressure` piatta per almeno 9s). Ma NEMMENO ~40s: il livello è
    // ereditato dalla direzione della decompressione, senza attendere la
    // ri-promozione di `reference` (gate del brief latenza §2). "Secondi".
    expect(reachedBreathAtMs).not.toBeNull()
    expect(reachedBreathAtMs as number).toBeGreaterThanOrEqual(2_000)
    expect(reachedBreathAtMs as number).toBeLessThanOrEqual(20_000)
    expect(['stasis-inherited-profondo', 'stasis-held']).toContain(breathReason)
  })

  it('misura end-to-end: dopo il silenzio la stessa musica torna al Respiro Alto in pochi secondi', () => {
    const clock = new BrainBioPerceptionClock()
    const moderate: BandEnergies = { low: 0.34, lowMid: 0.3, mid: 0.26, high: 0.22 }
    const dense: BandEnergies = { low: 0.78, lowMid: 0.72, mid: 0.66, high: 0.58 }
    // Come in produzione (`OutputApp.tsx`), il clock ritmico è sempre passato
    // insieme ai transient: dopo l'Intervento 1 (brief Audio 2026-09-04),
    // `pulse` — e quindi `rhythmConstraint` — resta a 0 senza un gate
    // `active`, anche a transient pieni (l'aspettativa del clock da sola non
    // basta più, serve la conferma d'attacco). I valori di kickEnvelope/
    // beatPulse sono irrilevanti qui: solo `bandTransients` e `active` pesano.
    const activeRhythm = { kickEnvelope: 0, beatPulse: 0, active: true }
    let now = 0
    // Come il test precedente: due stasi per far risolvere il livello a 'alto'
    // (moderate → dense). Il silenzio poi lo mette a Respiro Profondo per via
    // diretta; al ritorno di dense il livello congelato 'alto' torna a valere.
    for (let index = 0; index < 600; index += 1) {
      now += 100
      clock.ingestSample(moderate, now, moderate, activeRhythm)
    }
    for (let index = 0; index < 600; index += 1) {
      now += 100
      clock.ingestSample(dense, now, dense, activeRhythm)
    }
    expect(clock.getState().regime).toBe('respiro-alto')

    for (let index = 0; index < 20; index += 1) {
      now += 100
      clock.ingestSample(SILENT, now, SILENT)
    }
    expect(clock.getState().regime).toBe('respiro-profondo')

    let reachedHighBreathAtMs: number | null = null
    for (let index = 1; index <= 220 && reachedHighBreathAtMs === null; index += 1) {
      now += 100
      const state = clock.ingestSample(dense, now, dense, activeRhythm)
      if (state.regime === 'respiro-alto') reachedHighBreathAtMs = index * 100
    }
    expect(reachedHighBreathAtMs).not.toBeNull()
    // Nuova baseline (brief Audio 2026-08-31, §14): la componente ritmica di
    // `perceptualPressure` è SOSTENUTA (tau 1.2-1.8s, così un fill non la
    // muove — §4). Dopo un silenzio quella memoria si ricostruisce: la
    // pressione torna a coincidere con il riferimento e deve poi restare
    // assestata oltre un intero ciclo oscillatorio.
    // come quando pesava solo l'inviluppo `fast`. La reazione (decompression /
    // silence→respiro-profondo) resta immediata; è la RI-dichiarazione della
    // stasi alta che ora rispecchia il tempo di ricostruzione della griglia.
    expect(reachedHighBreathAtMs as number).toBeLessThanOrEqual(20_000)
  })
})
