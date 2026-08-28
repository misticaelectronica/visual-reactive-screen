import { describe, expect, it } from 'vitest'
import type { BandEnergies } from '@shared/types'
import {
  advanceBioEnvelopes,
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
} from './brainBioPerception'

const SILENT: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }

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
    for (let index = 0; index < 20; index += 1) {
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
      // All'inizio della rampa (primi secondi) la reference non si è ancora
      // mossa: la trasformazione è troppo lenta per aver già invalidato nulla.
      if (index === 10) {
        expect(reference.phase).toBe('stable')
        expect(reference.vector).toEqual(worldA)
      }
      reference = advanceBioReference(reference, envelopes.mid, persistence, 0.7, stepMs)
    }
    // Dopo un'evoluzione sufficientemente lunga e coerente, la reference si
    // è infine spostata verso il nuovo mondo — non è rimasta bloccata per
    // sempre né è saltata istantaneamente al primo scarto.
    expect(reference.vector).not.toEqual(worldA)
    expect(calculateChange(reference.vector, worldB)).toBeLessThan(calculateChange(worldA, worldB))
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

// NUOVO (2026-08-28): sostituisce il vecchio describe "pressureTrend —
// posizione immediata rispetto alla mediana". `pressureTrend` non legge più
// la mediana (brief Audio, §4/§6): confronta la pressione live con
// `reference.pressure`, la configurazione immediatamente precedente. La
// funzione è pura e si testa direttamente, senza passare per il clock.
describe('classifyPressureTrend — posizione rispetto al riferimento, non alla mediana (brief Audio 2026-08-28)', () => {
  it('sopra il riferimento oltre la zona neutra è "rising", sotto è "falling"', () => {
    expect(classifyPressureTrend(0.7, 0.5)).toBe('rising')
    expect(classifyPressureTrend(0.3, 0.5)).toBe('falling')
  })

  it('la zona neutra assorbe un pareggio numerico senza dichiarare una direzione', () => {
    expect(classifyPressureTrend(0.5, 0.5)).toBe('stable')
    expect(classifyPressureTrend(0.51, 0.5)).toBe('stable')
    expect(classifyPressureTrend(0.56, 0.5)).toBe('rising')
  })

  it('controesempio del brief §4: un set molto pressato con riduzione modesta non legge come apertura', () => {
    // Riferimento alto (set molto pressato) — una riduzione modesta che
    // avrebbe attraversato una mediana storica non deve leggere "falling"
    // se resta vicina al riferimento reale.
    expect(classifyPressureTrend(0.87, 0.88)).toBe('stable')
  })

  it('collaudo dal vivo 2026-08-28: una ricostruzione reale (0.77 su riferimento 0.7408) deve leggere "rising"', () => {
    // Caso reale osservato dal Capo Supremo: con la vecchia zona neutra
    // (0.05) 0.77 restava "stable" perché non superava 0.7408+0.05=0.79 —
    // il respiro non si chiudeva pur con la pressione tornata alta.
    expect(classifyPressureTrend(0.77, 0.7408363166560792)).toBe('rising')
  })
})

// RISCRITTE (2026-08-28) per il brief finale Audio/Visual "Respiro Alto,
// Respiro Profondo e stasi strutturale": due assi indipendenti — forma
// (`transforming`, da `reference.phase`) e livello (`level`, da mediana/
// dispersione con isteresi). `classifyRawBioRegime` non decide più *se*
// c'è una trasformazione (lo decide il chiamante passando `transforming`),
// solo *verso dove* (pressureTrend) o, in stasi, *quale livello*.
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

  it('il regime di passaggio segue immediatamente pressureTrend, senza una finestra propria', () => {
    let regime = createInitialBioRegimeState()
    regime = advanceBioRegime(regime, baseSignals({ pressureTrend: 'falling' }), 0.5, 100)
    expect(regime.current).toBe('decompression')
    regime = advanceBioRegime(regime, baseSignals({ pressureTrend: 'rising' }), 0.5, 100)
    expect(regime.current).toBe('pressurized')
  })

  it('in stasi, il livello sopra la mediana + banda è RESPIRO ALTO, sotto è RESPIRO PROFONDO', () => {
    let regime = createInitialBioRegimeState()
    regime = advanceBioRegime(regime, baseSignals({ perceptualPressure: 0.8 }), 0.5, 100)
    expect(regime.current).toBe('respiro-alto')
    regime = advanceBioRegime(regime, baseSignals({ perceptualPressure: 0.2 }), 0.5, 100)
    expect(regime.current).toBe('respiro-profondo')
  })

  it('nella zona centrale (né chiaramente sopra né sotto) il livello conserva il carattere precedente — nessuna oscillazione artificiale', () => {
    let regime = createInitialBioRegimeState()
    regime = advanceBioRegime(regime, baseSignals({ perceptualPressure: 0.8 }), 0.5, 100)
    expect(regime.current).toBe('respiro-alto')
    // Pressione tornata vicinissima alla mediana (zona centrale, entro la
    // banda): non deve "cadere" a profondo né a unresolved.
    regime = advanceBioRegime(regime, baseSignals({ perceptualPressure: 0.51 }), 0.5, 100)
    expect(regime.current).toBe('respiro-alto')
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
  it('parte da unresolved e raggiunge pressurized con un segnale sostenuto e denso', () => {
    const clock = new BrainBioPerceptionClock()
    const dense: BandEnergies = { low: 0.7, lowMid: 0.68, mid: 0.65, high: 0.6 }
    let state = clock.getState()
    expect(state.regime).toBe('unresolved')

    let now = 0
    for (let index = 0; index < 6; index += 1) {
      now += 2_600
      state = clock.ingestSample(dense, now, dense) // i transient coincidono con le bande: evento continuo
    }
    expect(state.regime).toBe('pressurized')
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

  it('misura end-to-end: una discesa udibile reagisce subito e si assesta in Respiro Profondo entro la finestra reference', () => {
    // Numeri verificati con una simulazione diretta del clock (non calcolati
    // a mano), coerente con la pratica già in uso in questo file: il brief
    // Audio 2026-08-28 chiede reazione in ordine di secondi, non la cifra
    // esatta — le soglie qui sotto verificano l'ordine di grandezza.
    const clock = new BrainBioPerceptionClock()
    const dense: BandEnergies = { low: 0.78, lowMid: 0.72, mid: 0.66, high: 0.58 }
    const sparse: BandEnergies = { low: 0.18, lowMid: 0.14, mid: 0.11, high: 0.08 }
    let now = 0
    for (let index = 0; index < 300; index += 1) {
      now += 100
      clock.ingestSample(dense, now, dense)
    }
    // Dopo 30s il materiale denso non è più un passaggio: è una stasi
    // strutturale alla quota alta, quindi RESPIRO ALTO.
    expect(clock.getState().regime).toBe('respiro-alto')

    let reachedDecompressionAtMs: number | null = null
    let reachedBreathAtMs: number | null = null
    for (let index = 1; index <= 300 && reachedBreathAtMs === null; index += 1) {
      now += 100
      const state = clock.ingestSample(sparse, now, SILENT)
      if (state.regime === 'decompression' && reachedDecompressionAtMs === null) {
        reachedDecompressionAtMs = index * 100
      }
      if (state.regime === 'respiro-profondo') reachedBreathAtMs = index * 100
    }
    // Reazione immediata (brief §6/§7/§9): decompressione entro il primo
    // secondo, non dopo una finestra di conferma — non c'è più alcun gate
    // sulla prima reazione, a differenza del vecchio modello a mediana.
    expect(reachedDecompressionAtMs).not.toBeNull()
    expect(reachedDecompressionAtMs as number).toBeLessThanOrEqual(1_000)
    expect(reachedBreathAtMs).not.toBeNull()
    // L'assestamento non aggiunge un proprio timer: arriva quando la macchina
    // `reference` esistente ha osservato il nuovo mondo attraverso il proprio
    // inviluppo `mid`, poi completa invalidazione e conferma.
    expect(reachedBreathAtMs as number).toBeLessThanOrEqual(30_000)
  })

  it('misura end-to-end: dopo il silenzio la stessa musica torna al Respiro Alto entro 5s', () => {
    const clock = new BrainBioPerceptionClock()
    const dense: BandEnergies = { low: 0.78, lowMid: 0.72, mid: 0.66, high: 0.58 }
    let now = 0
    for (let index = 0; index < 300; index += 1) {
      now += 100
      clock.ingestSample(dense, now, dense)
    }
    for (let index = 0; index < 20; index += 1) {
      now += 100
      clock.ingestSample(SILENT, now, SILENT)
    }
    expect(clock.getState().regime).toBe('respiro-profondo')

    let reachedHighBreathAtMs: number | null = null
    for (let index = 1; index <= 100 && reachedHighBreathAtMs === null; index += 1) {
      now += 100
      const state = clock.ingestSample(dense, now, dense)
      if (state.regime === 'respiro-alto') reachedHighBreathAtMs = index * 100
    }
    expect(reachedHighBreathAtMs).not.toBeNull()
    expect(reachedHighBreathAtMs as number).toBeLessThanOrEqual(5_000)
  })
})
