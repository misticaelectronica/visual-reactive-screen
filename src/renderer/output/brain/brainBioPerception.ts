import type { BandEnergies } from '@shared/types'

// Stato bio-percettivo — PIANO-040, brief
// team/briefs/brief-stato-bio-percettivo-definitivo.md (§1-§17.3). Calcolato
// lato Output, accanto a `rhythm` (brainRhythm.ts) e non dentro
// `BrainRhythmState`: la ricostruzione ritmica è frame-locale e si azzera sui
// gap RAF, la memoria percettiva qui è multi-secondo e non deve ereditare
// quel reset (§10 del brief).
//
// Nome del file/dei tipi deliberatamente distinto da `brainPerception.ts`
// (`BrainPerceptionEngine`/`BrainPerceptualState`, già esistente e wired in
// `brainSvgScene.ts`): quel modulo è un'analisi materica frame-a-frame senza
// relazione con questo — la vicinanza dei nomi ha già causato un
// sovrascrittura accidentale del file esistente durante lo sviluppo di
// questo piano, ripristinata da git prima di procedere. Ogni simbolo qui è
// prefissato `BrainBio*` per restare inconfondibile a colpo d'occhio.

export type BrainBioPressureTrend = 'rising' | 'stable' | 'falling'

// RISCRITTO (2026-08-28) per il brief finale Audio/Visual "Respiro Alto,
// Respiro Profondo e stasi strutturale": `stable-breath` è ritirato,
// faceva due lavori incompatibili (bassa pressione + assestamento). Due
// assi indipendenti, non una scala:
//   FORMA:   stasi strutturale (si abita)  ↔  trasformazione (si attraversa)
//   LIVELLO: pressione alta                ↔  pressione bassa
// `pressurized`/`decompression` sono **passaggi** (trasformazione, in una
// direzione). `respiro-alto`/`respiro-profondo` sono **stati abitati**
// (stasi strutturale, alla rispettiva quota). `unresolved` resta il
// fallback per un consumer che riceve un valore che non riconosce, mai un
// cast diretto — e per l'avvio, prima che `reference` esista davvero.
export type BrainBioRegime =
  | 'unresolved'
  | 'pressurized'
  | 'decompression'
  | 'respiro-alto'
  | 'respiro-profondo'

export type BrainBioPerceptionSignals = {
  persistence: number
  change: number
  residual: number
  perceptualPressure: number
  pressureTrend: BrainBioPressureTrend
}

export type BrainBioPerceptionState = {
  signals: BrainBioPerceptionSignals
  regime: BrainBioRegime
}

export function createInitialBioPerceptionState(): BrainBioPerceptionState {
  return {
    signals: {
      persistence: 0,
      change: 0,
      residual: 0,
      perceptualPressure: 0,
      pressureTrend: 'stable',
    },
    regime: 'unresolved',
  }
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value))
}

// --- Task 1.2: inviluppi fast/mid e i quattro segnali che ne derivano -----

// Costanti di collaudo (decisione del Capo Supremo dell'Analisi Audio,
// 2026-08-27 — vedi PIANO-040 §4.1/§7): non costanti filosofiche, punto di
// partenza per l'ascolto dal vivo.
//
// Brief collettivo pragmatico: il precedente `fast=2.5s` impediva alla
// pressione di attraversare la mediana entro il budget di 5s, soprattutto
// nel rientro dal silenzio. Il presente percettivo usa ora 0.5s; la protezione
// dai transienti vive nella conferma continua di 3s del regime, non in un
// inviluppo che ritarda anche i cambi reali.
export const BIO_PERCEPTION_FAST_TAU_MS = 500
// `mid` ~8-12s: il "modo di essere" recente della musica, non il singolo
// comportamento locale — l'Audio ha respinto 6-8s come troppo corti per
// questo significato.
export const BIO_PERCEPTION_MID_TAU_MS = 10_000

// Le quattro bande non sono equivalenti per la percezione di "presenza
// sostenuta": stesso schema di pesi già in uso altrove nel renderer per
// `activity`/`bandDrive` (es. brainFilterPsicheCanvas.ts,
// brainPrint2dCanvas.ts) — riusato qui per coerenza, non reinventato.
const BAND_WEIGHTS: BandEnergies = { low: 0.3, lowMid: 0.28, mid: 0.23, high: 0.19 }
const BAND_KEYS = ['low', 'lowMid', 'mid', 'high'] as const

function emaStep(previous: number, target: number, deltaMs: number, tauMs: number): number {
  if (tauMs <= 0) return target
  const alpha = 1 - Math.exp(-deltaMs / tauMs)
  return previous + (target - previous) * alpha
}

function emaBands(previous: BandEnergies, target: BandEnergies, deltaMs: number, tauMs: number): BandEnergies {
  return {
    low: emaStep(previous.low, target.low, deltaMs, tauMs),
    lowMid: emaStep(previous.lowMid, target.lowMid, deltaMs, tauMs),
    mid: emaStep(previous.mid, target.mid, deltaMs, tauMs),
    high: emaStep(previous.high, target.high, deltaMs, tauMs),
  }
}

// DECISIONE (non prevista dal piano, va registrata): distanza tesa a
// somiglianza — L1 pesata per banda, normalizzata su una scala fissa, non
// coseno. Il coseno confronterebbe solo la *forma* relativa fra bande e
// dichiarerebbe identici `.1/.1/.1/.1` e `.8/.8/.8/.8`: per `persistence` e
// `change` conta invece il livello assoluto, non solo il bilanciamento
// spettrale — la stessa ragione per cui l'Audio ha respinto la varianza fra
// bande in `perceptualPressure` (§4.1 del piano). La scala di normalizzazione
// (0.4) riusa lo stesso divisore già impiegato da `bandDrive`/`activity` nel
// resto del codebase (es. `brainFilterPsicheCanvas.ts`), non un nuovo numero
// da giustificare da zero.
const DISTANCE_NORMALIZATION_SCALE = 0.4

function weightedBandDistance(left: BandEnergies, right: BandEnergies): number {
  let total = 0
  for (const key of BAND_KEYS) {
    total += BAND_WEIGHTS[key] * Math.abs(left[key] - right[key])
  }
  return clamp(total / DISTANCE_NORMALIZATION_SCALE)
}

function similarity(left: BandEnergies, right: BandEnergies): number {
  return 1 - weightedBandDistance(left, right)
}

export type BrainBioEnvelopes = {
  fast: BandEnergies
  mid: BandEnergies
}

export function createInitialBioEnvelopes(): BrainBioEnvelopes {
  const silent: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }
  return { fast: { ...silent }, mid: { ...silent } }
}

export function advanceBioEnvelopes(
  previous: BrainBioEnvelopes,
  bands: BandEnergies,
  deltaMs: number,
): BrainBioEnvelopes {
  return {
    fast: emaBands(previous.fast, bands, deltaMs, BIO_PERCEPTION_FAST_TAU_MS),
    mid: emaBands(previous.mid, bands, deltaMs, BIO_PERCEPTION_MID_TAU_MS),
  }
}

/**
 * `persistence`: quanto il momento (`fast`) è coerente con lo stato recente
 * (`mid`). NON è definito come `1 - change`: `change` confronta `mid` con
 * `reference`, una coppia di inviluppi diversa — un transient forte può
 * alzare la distanza fast/mid lasciando `mid` sostanzialmente allineato a
 * `reference` (invariante §3 del brief).
 */
export function calculatePersistence(envelopes: BrainBioEnvelopes): number {
  return similarity(envelopes.fast, envelopes.mid)
}

/**
 * `change`: quanto lo stato di riferimento sta invecchiando — distanza fra
 * `mid` (il presente esteso) e `reference` (l'ultimo mondo stabilizzato,
 * §4.1/§17.3 del piano). Non reagisce al singolo fotogramma: `mid` è già un
 * inviluppo a 8-12s, e `reference` si muove solo tramite la propria macchina
 * a stati (vedi `advanceBioReference`), mai istantaneamente.
 */
export function calculateChange(mid: BandEnergies, reference: BandEnergies): number {
  return weightedBandDistance(mid, reference)
}

// --- Task 1.3: macchina a stati di `reference` -----------------------------
//
// Correzione più importante del Capo Supremo dell'Analisi Audio (2026-08-27,
// PIANO-040 §4.1/§7), confermata dal braccio destro come cambio di macchina
// e non di parametro. Due fasi distinte, non un `if` in più:
//
//  'stable'                — `reference` descrive ancora adeguatamente il
//                             presente. Si osserva `change` (mid vs
//                             reference): se resta sopra soglia per un tempo
//                             sostenuto, il vecchio mondo è dichiarato
//                             invalido → si passa a 'awaiting-confirmation'.
//                             `reference` NON si muove qui.
//  'awaiting-confirmation' — `reference` resta congelata (non insegue la
//                             transizione). Si osserva `persistence` (fast vs
//                             mid, calcolata dal chiamante): solo quando resta
//                             sopra soglia per un tempo sostenuto, il `mid`
//                             corrente è abbastanza coerente con sé stesso da
//                             essere promosso a nuova `reference` → si torna a
//                             'stable' con `reference = mid`.
//
// Una trasformazione lenta con `persistence` sempre alta può quindi non far
// mai crescere `change` abbastanza da uscire da 'stable' (nessun bisogno di
// aggiornare: nulla si sta davvero invalidando); se invece `change` cresce e
// oltrepassa la soglia, l'ingresso in 'awaiting-confirmation' e la successiva
// promozione possono essere quasi immediati proprio perché la persistence non
// è mai scesa — non è una circolarità, è la sequenza che l'Audio ha
// descritto esplicitamente (§4.1 del piano, punto Tre).
//
// DECISIONE (non prevista dal piano, valori di collaudo "da tarare
// all'ascolto" come `fast`/`mid`): soglia di invalidità 0.35 (oltre metà
// della scala 0-1 di `change`, per non scattare su una deriva minore),
// sostenuta 3s prima di essere presa sul serio; soglia di conferma 0.75 di
// persistence (più severa della soglia neutra 0.5, perché qui decide una
// promozione permanente, non solo un segnale continuo), sostenuta 4s — più
// breve di `mid` (10s) perché a questo punto la nuova configurazione è già
// il `mid` corrente: non deve ri-accumulare da zero, deve solo dimostrarsi
// stabile abbastanza a lungo da non essere un rimbalzo.
//
// VERIFICATO SUL LOG DI UN COLLAUDO REALE (2026-08-28, brief del braccio
// destro punto 3): questa è OGGI L'UNICA via di aggiornamento di
// `reference` — un aggiornamento per **rottura** (`change` supera questa
// soglia in modo sostenuto). Non esiste una via per **permanenza**.
//
// GATE DEL BRIEF AUDIO "RESPIRO ALTO/PROFONDO" (2026-08-28) — VERIFICATO
// CON REPLAY, NON SUPERATO A 0.35: simulazione diretta del clock,
// configurazione A (assestata) → transizione reale e udibile (livello di
// banda 0.60→0.40, circa -33%, non un'estremo) → configurazione B
// (assestata). Con soglia 0.35, `change` non ha mai superato ~0.30-0.32
// in **8 run indipendenti**, anche con 3 minuti di tempo per assestarsi
// (non un problema di tempo insufficiente o di cold-start): la soglia era
// semplicemente troppo alta per una transizione reale di questa
// grandezza, non solo per un'estrema. Abbassata a 0.22 — verificato che
// (a) la stessa transizione ora invalida in modo sostenuto e il
// riferimento si sposta verso B; (b) puro rumore/jitter senza alcun
// cambiamento reale resta sotto 0.03, con ampio margine, quindi
// l'abbassamento non introduce falsi positivi.
const REFERENCE_INVALID_THRESHOLD = 0.22
const REFERENCE_INVALID_CONFIRM_MS = 3_000
const REFERENCE_CONFIRM_THRESHOLD = 0.75
const REFERENCE_CONFIRM_MS = 4_000

export type BrainBioReferencePhase = 'stable' | 'awaiting-confirmation'

export type BrainBioReferenceState = {
  phase: BrainBioReferencePhase
  vector: BandEnergies
  // Aggiunto per il brief Audio "Respiro, memoria corporea e ascolto
  // continuo" (2026-08-28, §2/§4): "la configurazione che il corpo stava
  // vivendo immediatamente prima", in termini di pressione.
  //
  // CORREZIONE (2026-08-28, secondo collaudo dal vivo dopo la ritaratura
  // della zona neutra): la sola riduzione del deadband non bastava — un
  // secondo log reale mostrava il respiro bloccato con `reference` a
  // 0.6862 e il picco della musica al ritorno che arrivava a 0.6999, appena
  // +0.0137 sopra: un margine così piccolo, sommato al rumore naturale del
  // campione, impedisce quasi sempre di sostenere "rising" per i 3s
  // richiesti — non è più un problema di soglia, è un problema del dato
  // stesso. La causa: `pressure` veniva letta come **singolo campione
  // istantaneo** nell'esatto instante della promozione, che cade quasi
  // sempre in un momento di persistence alta — cioè vicino a un picco
  // locale del passaggio, non al suo livello tipico. Corretto: `pressure`
  // è ora una **media mobile sull'intera finestra di conferma**
  // (`pendingPressure`, stesso principio già in uso per `confirmSustainedMs`
  // — nessuna struttura nuova, solo un accumulo sulla finestra che la
  // macchina osservava già), non il valore dell'ultimo istante. Una media
  // su ~4s rappresenta il "come stava andando" quel mondo, non il suo
  // picco casuale.
  pressure: number
  pendingPressure: number
  invalidSustainedMs: number
  confirmSustainedMs: number
}

export function createInitialBioReferenceState(
  initial: BandEnergies,
  initialPressure = 0,
): BrainBioReferenceState {
  return {
    phase: 'stable',
    vector: { ...initial },
    pressure: initialPressure,
    pendingPressure: initialPressure,
    invalidSustainedMs: 0,
    confirmSustainedMs: 0,
  }
}

// Tau della media mobile di `pendingPressure`: uguale alla finestra di
// conferma stessa, così la media rappresenta l'intera finestra osservata,
// non solo il suo tratto finale.
const REFERENCE_PRESSURE_AVERAGE_TAU_MS = REFERENCE_CONFIRM_MS

/**
 * Avanza la macchina a stati di `reference`. `persistence` va calcolato dal
 * chiamante (`calculatePersistence`) sugli stessi inviluppi correnti — questa
 * funzione non ricalcola `fast`, riceve solo ciò che le serve per decidere.
 * `perceptualPressure` (anch'essa calcolata dal chiamante) alimenta la media
 * mobile durante l'attesa; solo il valore mediato viene promosso, mai usato
 * per decidere la transizione.
 */
export function advanceBioReference(
  previous: BrainBioReferenceState,
  mid: BandEnergies,
  persistence: number,
  perceptualPressure: number,
  deltaMs: number,
): BrainBioReferenceState {
  if (previous.phase === 'stable') {
    const change = calculateChange(mid, previous.vector)
    const invalidSustainedMs = change >= REFERENCE_INVALID_THRESHOLD
      ? previous.invalidSustainedMs + deltaMs
      : 0
    if (invalidSustainedMs >= REFERENCE_INVALID_CONFIRM_MS) {
      return {
        phase: 'awaiting-confirmation',
        vector: previous.vector,
        pressure: previous.pressure,
        // Media che riparte dal campione corrente, non dalla vecchia media:
        // la finestra osservata è quella nuova, non un residuo della
        // precedente.
        pendingPressure: perceptualPressure,
        invalidSustainedMs: 0,
        confirmSustainedMs: 0,
      }
    }
    return { ...previous, invalidSustainedMs }
  }
  const pendingPressure = emaStep(
    previous.pendingPressure,
    perceptualPressure,
    deltaMs,
    REFERENCE_PRESSURE_AVERAGE_TAU_MS,
  )
  const confirmSustainedMs = persistence >= REFERENCE_CONFIRM_THRESHOLD
    ? previous.confirmSustainedMs + deltaMs
    : 0
  if (confirmSustainedMs >= REFERENCE_CONFIRM_MS) {
    return {
      phase: 'stable',
      vector: { ...mid },
      pressure: pendingPressure,
      pendingPressure,
      invalidSustainedMs: 0,
      confirmSustainedMs: 0,
    }
  }
  return { ...previous, pendingPressure, confirmSustainedMs }
}

// --- Occupazione spettrale/temporale e perceptualPressure -----------------

// DECISIONE (non prevista dal piano) — **corretta durante l'implementazione,
// il primo tentativo era sbagliato e il test l'ha trovato**: la prima
// versione usava come pavimento la media mobile di ciascuna banda presa
// singolarmente (`movingAverages[key]`), pensando di non svantaggiare una
// banda costituzionalmente debole (es. `high` in un brano cupo). Ma un
// pavimento auto-relativo misura solo "questa banda è stabile rispetto a sé
// stessa", non "questa banda porta energia reale": un segnale `.8/.1/.1/.1`
// mantenuto a lungo converge con `mid` su ogni banda, e ogni banda —
// comprese quelle a 0.1 — risultava "occupata" solo perché coerente con la
// propria storia. Esattamente il controesempio che l'Audio aveva posto
// contro la varianza (§4.1 del piano) sarebbe passato inosservato.
//
// Corretto: il pavimento è relativo all'**energia sostenuta complessiva del
// momento** (stesso valore di `calculateSustainedEnergy`, non la storia
// della singola banda) — stesso principio già in uso nel modulo
// `BrainPerceptionEngine` esistente (`brainPerception.ts`, `activeBands`:
// soglia `Math.max(0.08, energy * 0.58)`), non reinventato ma preso a
// riferimento dopo aver trovato il proprio errore.
const OCCUPANCY_RELATIVE_FLOOR = 0.58
const OCCUPANCY_ABSOLUTE_FLOOR = 0.08

export function calculateSpectralOccupancy(fast: BandEnergies): number {
  const overallEnergy = calculateSustainedEnergy(fast)
  const floor = Math.max(OCCUPANCY_ABSOLUTE_FLOOR, overallEnergy * OCCUPANCY_RELATIVE_FLOOR)
  let occupiedWeight = 0
  for (const key of BAND_KEYS) {
    if (fast[key] >= floor) occupiedWeight += BAND_WEIGHTS[key]
  }
  return clamp(occupiedWeight)
}

// DECISIONE (non prevista dal piano): "occupazione temporale" derivata dal
// tempo trascorso dall'ultimo transient significativo su una qualunque
// banda (`bandTransients`, già calcolato da `BrainRhythmState` — nessun dato
// nuovo, coerente col vincolo dell'Audio di non introdurre feature audio
// nuove in questo giro). Un gap crescente = più spazio fra gli eventi = meno
// occupazione temporale, indipendentemente da quanto piena sia in quel
// momento l'occupazione spettrale (un pad continuo ha pochi transient ma
// bande piene: le due occupazioni sono per costruzione indipendenti, come
// richiesto dall'Audio). La soglia di "transient significativo" (0.05) è
// nello stesso ordine di grandezza delle soglie di rilevazione transient già
// in uso in `brainRhythm.ts` (`TRANSIENT_THRESHOLDS`, 0.015-0.022), alzata
// perché qui `bandTransients` è già un inviluppo post-soglia e post-decadimento,
// non il segnale grezzo. La saturazione del gap (2000ms → occupazione 0,
// gap nullo → 1) è un valore di collaudo, non filosofico, come `fast`/`mid`.
const TEMPORAL_EVENT_THRESHOLD = 0.05
const TEMPORAL_GAP_SATURATION_MS = 2_000
const TEMPORAL_GAP_SMOOTHING_TAU_MS = 500

export type BrainBioTemporalOccupancyState = {
  gapSinceEventMs: number
  smoothedGapMs: number
}

export function createInitialBioTemporalOccupancyState(): BrainBioTemporalOccupancyState {
  return { gapSinceEventMs: TEMPORAL_GAP_SATURATION_MS, smoothedGapMs: TEMPORAL_GAP_SATURATION_MS }
}

export function advanceBioTemporalOccupancy(
  previous: BrainBioTemporalOccupancyState,
  transients: BandEnergies | undefined,
  deltaMs: number,
): BrainBioTemporalOccupancyState {
  const maxTransient = transients
    ? Math.max(transients.low, transients.lowMid, transients.mid, transients.high)
    : 0
  const gapSinceEventMs = maxTransient >= TEMPORAL_EVENT_THRESHOLD
    ? 0
    : Math.min(TEMPORAL_GAP_SATURATION_MS, previous.gapSinceEventMs + deltaMs)
  const smoothedGapMs = emaStep(
    previous.smoothedGapMs,
    gapSinceEventMs,
    deltaMs,
    TEMPORAL_GAP_SMOOTHING_TAU_MS,
  )
  return { gapSinceEventMs, smoothedGapMs }
}

export function calculateTemporalOccupancy(state: BrainBioTemporalOccupancyState): number {
  return 1 - clamp(state.smoothedGapMs / TEMPORAL_GAP_SATURATION_MS)
}

// DECISIONE (non prevista dal piano): pesi di combinazione per
// `perceptualPressure` — energia sostenuta pesa leggermente di più (0.4)
// perché è l'unico dei tre termini già validato altrove nel codebase
// (`activity`); occupazione spettrale (0.35) e temporale (0.25) hanno peso
// reale ma minore, "da tarare all'ascolto" come da convenzione già in uso in
// `BRAIN_CONFIG` (brainConfig.ts) per costanti di questo tipo — non sono
// state derivate da una misura, sono un punto di partenza dichiarato.
const PRESSURE_ENERGY_WEIGHT = 0.4
const PRESSURE_SPECTRAL_WEIGHT = 0.35
const PRESSURE_TEMPORAL_WEIGHT = 0.25

export function calculateSustainedEnergy(fast: BandEnergies): number {
  return clamp(
    fast.low * BAND_WEIGHTS.low +
      fast.lowMid * BAND_WEIGHTS.lowMid +
      fast.mid * BAND_WEIGHTS.mid +
      fast.high * BAND_WEIGHTS.high,
  )
}

/**
 * `perceptualPressure` = energia sostenuta + occupazione spettrale +
 * occupazione temporale (NON energia + transient + varianza fra bande: la
 * varianza è stata respinta dall'Audio con un controesempio esplicito —
 * `.8/.1/.1/.1` varianza alta ma materiale vuoto, `.55/.52/.50/.48` varianza
 * bassa ma spettro pieno, PIANO-040 §4.1). Non coincide con l'energia
 * (invariante §3): a parità di energia, poca occupazione spettrale/temporale
 * abbassa la pressione; a energia moderata, piena occupazione di entrambe la
 * alza.
 */
export function calculatePerceptualPressure(
  sustainedEnergy: number,
  spectralOccupancy: number,
  temporalOccupancy: number,
): number {
  return clamp(
    sustainedEnergy * PRESSURE_ENERGY_WEIGHT +
      spectralOccupancy * PRESSURE_SPECTRAL_WEIGHT +
      temporalOccupancy * PRESSURE_TEMPORAL_WEIGHT,
  )
}

// --- Task 1.4: residual — riscritto per il brief "Respiro, memoria corporea
// e ascolto continuo" (2026-08-28, §11) ---------------------------------
//
// SOSTITUITO IL MECCANISMO PRECEDENTE (charge/plateau/gate su persistence
// sostenuta): la nota di trasmissione del braccio destro chiede
// esplicitamente di rivedere `residual` come **memoria della configurazione
// PRECEDENTE**, non più come "impronta di quanto lo stato attuale sia
// rimasto coerente" — due concetti diversi che il vecchio meccanismo
// confondeva.
//
// §11 lo dice in una frase sola: "Brain deve adattarsi rapidamente al
// cambiamento senza dimenticare altrettanto rapidamente da dove proviene."
// Reazione rapida, memoria lenta — un'asimmetria, non un gate. La
// traduzione più diretta e fedele è un inviluppo a **due costanti di
// tempo**, non una macchina a stati con soglie:
//
//  - quando `perceptualPressure` risale (il mondo torna a intensificarsi,
//    o semplicemente non è mai sceso), `residual` la insegue in fretta:
//    non ha senso continuare a "ricordare" una pressione più bassa quando
//    quella più alta è già di nuovo il presente;
//  - quando `perceptualPressure` scende, `residual` la insegue lentamente:
//    è esattamente questa lentezza a permettere alla nuova configurazione,
//    più aperta, di essere ancora percepita come apertura *rispetto al
//    prima* per diversi secondi — il caso che rompeva il modello a soglia
//    di mediana (brief Audio 2026-08-28, §4/§12).
//
// Non dipende più da `persistence`: quel gate rispondeva alla domanda
// sbagliata ("lo stato attuale è abbastanza stabile da meritare memoria?"),
// mentre qui la memoria è del passato, non un giudizio sul presente.
const RESIDUAL_RISE_TAU_MS = 1_500
// Ordine di grandezza già validato dal collaudo precedente per "un vuoto
// breve non deve scaricarlo": 15-30s.
const RESIDUAL_DECAY_TAU_MS = 25_000

export type BrainBioResidualState = {
  value: number
}

export function createInitialBioResidualState(): BrainBioResidualState {
  return { value: 0 }
}

export function advanceBioResidual(
  previous: BrainBioResidualState,
  perceptualPressure: number,
  deltaMs: number,
): BrainBioResidualState {
  const tauMs = perceptualPressure >= previous.value ? RESIDUAL_RISE_TAU_MS : RESIDUAL_DECAY_TAU_MS
  return { value: clamp(emaStep(previous.value, perceptualPressure, deltaMs, tauMs)) }
}

// --- mediana/dispersione del set — SOLO CONTESTO, dal brief Audio "Respiro,
// memoria corporea e ascolto continuo" (2026-08-28, §4) ---------------------
//
// CORREZIONE STRUTTURALE: fino a qui `pressureTrend` era il segno di
// `perceptualPressure - median` — "dove sto rispetto alla storia energetica
// di stasera". Il brief lo dichiara esplicitamente insufficiente, con un
// controesempio diretto (§4): un set molto pressato ha una mediana alta; una
// riduzione modesta può scendere sotto quella mediana pur lasciando intatta
// la sensazione di pressione — Brain non deve dichiarare respiro in quel
// caso, ma il vecchio modello lo avrebbe fatto. La mediana risponde alla
// domanda sbagliata: non "che cosa è cambiato rispetto al momento
// immediatamente precedente" (§2, il riferimento fondamentale richiesto),
// ma "dove sono nella storia complessiva".
//
// `median`/`mad` restano calcolati qui **esclusivamente come contesto**
// (§4: "continua a essere aggiornata e conserva valore informativo";
// §21.7: "mediana e dispersione rimangono informazioni contestuali, non
// decisori") — esposti in `BrainBioRegimeDiagnostics` per l'overlay, mai più
// letti da `classifyRawBioRegime` o da chi decide `pressureTrend` (vedi
// `classifyPressureTrend` più sotto, che usa `reference.pressure` — la
// configurazione immediatamente precedente, non la storia della serata).
const MEDIAN_STEP_PER_MS = 1 / 240_000
const MAD_TAU_MS = 90_000
const MEDIAN_BOOTSTRAP_MS = 15_000
const MEDIAN_BOOTSTRAP_TAU_MS = 2_500
// DECISIONE non deducibile dal codice, richiesta esplicitamente dal
// braccio destro ("va deciso cosa rende un campione valido, e la scelta va
// scritta nel piano"): **la mediana del set si calcola su ciò che Brain
// sente, non sui vuoti.** Un campione con `perceptualPressure` sotto
// `SAMPLE_VALIDITY_FLOOR` (silenzio reale, pausa fra due tracce, buco
// tecnico) non entra nella storia — non sposta `median` né `mad`, e non
// aggiorna nemmeno la classificazione corrente (`candidate`/`confirmed`
// restano quelli dell'ultimo campione valido: "nessun dato" non è
// evidenza di "sotto la mediana", è assenza di lettura). Il tempo del set
// (`elapsedMs`) **continua comunque a scorrere**, mentre il bootstrap usa
// soltanto `validElapsedMs`: una pausa non finge storia musicale. Soglia riusata dallo
// stesso ordine di grandezza già in uso nel file per "presenza minima"
// (`OCCUPANCY_ABSOLUTE_FLOOR`), non un nuovo numero da giustificare da
// zero.
const SAMPLE_VALIDITY_FLOOR = 0.02

export type BrainBioTrendState = {
  elapsedMs: number
  validElapsedMs: number
  median: number
  mad: number
}

export function createInitialBioTrendState(): BrainBioTrendState {
  return {
    elapsedMs: 0,
    validElapsedMs: 0,
    median: Number.NaN, // sentinella: il primo campione la fissa direttamente (§ sotto)
    mad: 0,
  }
}

/**
 * Aggiorna solo mediana/dispersione del set — puro contesto, vedi il
 * commento sopra. Non produce più `pressureTrend`: `holdCenter` resta come
 * parametro perché il congelamento della mediana durante una candidatura
 * di regime (terzo collaudo, evita che la mediana insegua e vanifichi la
 * propria stessa evidenza) resta valido per la qualità del dato
 * diagnostico, anche se ora nessuna decisione dipende più da questo valore.
 */
export function advanceBioTrend(
  previous: BrainBioTrendState,
  perceptualPressure: number,
  deltaMs: number,
  holdCenter = false,
): BrainBioTrendState {
  const elapsedMs = previous.elapsedMs + deltaMs
  // Campione non valido (silenzio reale, pausa, buco tecnico): il tempo del
  // set passa comunque (`elapsedMs`), ma non entra nella storia della
  // mediana — vedi `SAMPLE_VALIDITY_FLOOR` sopra.
  if (perceptualPressure < SAMPLE_VALIDITY_FLOOR) {
    return { ...previous, elapsedMs }
  }
  // Il primissimo campione fissa la mediana direttamente: farla partire da
  // 0 costringerebbe un passo costante a "recuperare" un tratto arbitrario
  // solo per l'accidente di essere il valore iniziale, un ritardo di
  // bootstrap non voluto.
  const validElapsedMs = previous.validElapsedMs + deltaMs
  // Il primo centro non può essere il primo campione degli inviluppi
  // ancora in salita: col solo passo robusto impiegherebbe minuti a
  // raggiungere il livello reale del set. Bootstrap rapido sui primi 15s
  // validi, poi mediana incrementale resistente agli outlier come prima.
  const median = Number.isNaN(previous.median)
    ? perceptualPressure
    : holdCenter
      ? previous.median
      : previous.validElapsedMs < MEDIAN_BOOTSTRAP_MS
        ? emaStep(previous.median, perceptualPressure, deltaMs, MEDIAN_BOOTSTRAP_TAU_MS)
        : previous.median + Math.sign(perceptualPressure - previous.median) * MEDIAN_STEP_PER_MS * deltaMs
  const deviation = Math.abs(perceptualPressure - median)
  const mad = emaStep(previous.mad, deviation, deltaMs, MAD_TAU_MS)
  return { elapsedMs, validElapsedMs, median, mad }
}

// --- pressureTrend: posizione relativa alla configurazione immediatamente
// precedente (`reference.pressure`), non più alla mediana del set ----------
//
// Traduzione diretta di §2/§4/§16 del brief Audio "Respiro, memoria corporea
// e ascolto continuo": il riferimento è "che cosa è cambiato rispetto a
// come si stava un momento fa", e quel "momento fa" è già rappresentato nel
// modulo da `reference` — l'ultima configurazione che ha dimostrato
// persistence sostenuta (§1.3 sopra), aggiornata con la propria isteresi
// causale-corta, indipendente dalla storia dell'intera serata. Non serve
// una struttura nuova: serve solo confrontare la pressione di adesso con la
// pressione catturata quando quel riferimento è stato promosso.
// Reazione immediata per costruzione (§6/§7/§9): questo confronto non ha
// alcuna finestra di conferma — è ricalcolato a ogni campione, esattamente
// come prima con la mediana, solo con un termine di paragone diverso e
// causalmente corretto. La sola isteresi che sopravvive è quella già
// intrinseca a `reference` stessa (si aggiorna lentamente, di proposito) e
// quella del regime discreto a valle (§9: "rappresentazione derivata", non
// autorizzazione alla prima reazione — la macchina di `advanceBioRegime`
// sotto non cambia forma).
//
// Zona neutra piccola per non classificare come direzione un pareggio
// numerico — stessa lezione del terzo collaudo dal vivo (uno scarto
// infinitesimo sulla mediana produceva 80 cambi di regime in un set):
// stavolta il confronto è con una pressione istantanea (tau 0.5s), più
// mobile della vecchia mediana, quindi un valore proprio, non riusato —
// "da tarare all'ascolto" come le altre costanti di questo modulo.
//
// RIDOTTA da 0.05 a 0.02 dopo il collaudo dal vivo del 2026-08-28 (Capo
// Supremo: "la pressione sale da 0.50 a 0.77 e il regime resta
// stable-breath"). Causa trovata nel log reale: `reference.pressure` era
// 0.7408 (catturato, come sempre, in un istante di persistence alta —
// spesso vicino a un picco locale del passaggio); 0.77 superava già quel
// riferimento, ma non di 0.05 (0.77-0.7408=0.029), quindi restava
// classificato "stable", non "rising" — la ricostruzione c'era e non
// veniva riconosciuta. 0.02 lascia comunque margine reale contro un
// pareggio numerico (l'obiettivo originale di questa costante), senza
// alzare artificialmente la soglia di uscita oltre quanto la musica
// raggiunge davvero.
export const REFERENCE_PRESSURE_DEADBAND = 0.02

export function classifyPressureTrend(
  perceptualPressure: number,
  referencePressure: number,
): BrainBioPressureTrend {
  const diff = perceptualPressure - referencePressure
  if (diff > REFERENCE_PRESSURE_DEADBAND) return 'rising'
  if (diff < -REFERENCE_PRESSURE_DEADBAND) return 'falling'
  return 'stable'
}

// --- Derivazione del regime — riscritta per il brief finale Audio/Visual
// "Respiro Alto, Respiro Profondo e stasi strutturale" (2026-08-28) --------
//
// FORMA (stasi strutturale ↔ trasformazione): `pressureTrend` risponde già
// alla domanda. rising/falling sono passaggi; stable è assestamento. La fase
// della macchina `reference` resta osservabilità e genealogia del riferimento,
// non una seconda autorizzazione del regime.
//
// LIVELLO (alto ↔ profondo): deciso soltanto nell'assestamento rispetto alla
// mediana del set. La dispersione resta contesto diagnostico, come stabilito
// dal brief Audio; non torna a essere un decisore. Per evitare oscillazioni su
// un pareggio numerico si riusa la stessa zona neutra della pressione relativa.

export type BrainBioLevel = 'alto' | 'profondo' | null

function classifyLevel(
  perceptualPressure: number,
  median: number,
  previous: BrainBioLevel,
): BrainBioLevel {
  // Mediana non ancora bootstrap (avvio o set silenzioso): nessuna base
  // per giudicare "alto o basso per stasera" — mantiene il precedente.
  if (Number.isNaN(median)) return previous
  if (perceptualPressure > median + REFERENCE_PRESSURE_DEADBAND) return 'alto'
  if (perceptualPressure < median - REFERENCE_PRESSURE_DEADBAND) return 'profondo'
  return previous
}

/**
 * Classifica il regime per i due assi già disponibili: `pressureTrend`
 * distingue il passaggio dall'assestamento; `level` distingue alto/profondo
 * soltanto quando la pressione è stabile. Non consulta `reference.phase`:
 * sarebbe una seconda autorizzazione dello stesso fenomeno e ritarderebbe la
 * reazione che `pressureTrend` rende già immediata.
 */
export function classifyRawBioRegime(
  signals: BrainBioPerceptionSignals,
  level: BrainBioLevel,
): BrainBioRegime {
  if (signals.pressureTrend === 'rising') return 'pressurized'
  if (signals.pressureTrend === 'falling') return 'decompression'
  if (level === 'alto') return 'respiro-alto'
  if (level === 'profondo') return 'respiro-profondo'
  return 'unresolved'
}

export type BrainBioRegimeState = {
  current: BrainBioRegime
  silence: BrainBioSilenceState
  level: BrainBioLevel
}

export function createInitialBioRegimeState(): BrainBioRegimeState {
  return {
    current: 'unresolved',
    silence: createInitialBioSilenceState(),
    level: null,
  }
}

// --- Via diretta del silenzio reale (secondo collaudo dal vivo) -----------
//
// Il silenzio non è una configurazione che debba organizzarsi: è assenza
// della materia da organizzare. Per questo usa le bande raw, prima degli
// inviluppi multi-secondo, e non entra né nella mediana né nella firma.
// Due secondi quasi nulli autorizzano direttamente il Respiro Profondo —
// pressione bassa per definizione, e non c'è nulla da "trasformare".
// `deltaMs` è clampato perché un singolo pacchetto dopo un gap tecnico non
// possa fingere due secondi di silenzio osservato.
const SILENCE_RAW_PRESSURE_MAX = 0.015
const SILENCE_ENTER_MS = 2_000
const SILENCE_MAX_SAMPLE_DELTA_MS = 250

export type BrainBioSilenceState = {
  nearSilent: boolean
  silentSustainedMs: number
  authorized: boolean
}

export function createInitialBioSilenceState(): BrainBioSilenceState {
  return { nearSilent: false, silentSustainedMs: 0, authorized: false }
}

export function advanceBioSilence(
  previous: BrainBioSilenceState,
  nearSilent: boolean,
  deltaMs: number,
): BrainBioSilenceState {
  const observedMs = Math.min(SILENCE_MAX_SAMPLE_DELTA_MS, Math.max(0, deltaMs))
  if (nearSilent) {
    const silentSustainedMs = previous.silentSustainedMs + observedMs
    return {
      nearSilent: true,
      silentSustainedMs,
      authorized: previous.authorized || silentSustainedMs >= SILENCE_ENTER_MS,
    }
  }
  return createInitialBioSilenceState()
}

export function advanceBioRegime(
  previous: BrainBioRegimeState,
  signals: BrainBioPerceptionSignals,
  median: number,
  deltaMs: number,
  nearSilent = false,
): BrainBioRegimeState {
  const silence = advanceBioSilence(previous.silence, nearSilent, deltaMs)
  if (silence.authorized) {
    return { current: 'respiro-profondo', silence, level: 'profondo' }
  }
  const level = classifyLevel(signals.perceptualPressure, median, previous.level)
  const current = classifyRawBioRegime(signals, level)
  return { current, silence, level }
}

// --- Task 1.6: BrainBioPerceptionClock — compone le funzioni pure ----------
//
// Stesso ruolo/collocazione di `OutputRhythmClock` (brainRhythm.ts): istanza
// con stato, alimentata a ogni campione lato Output (§10 del brief). A
// differenza di `OutputRhythmClock`, questa classe non ha bisogno di gestire
// gap RAF/pacchetti stantii: la memoria percettiva è multi-secondo per
// costruzione (la scala più corta, `fast`, è già 0.5s) — un singolo gap di
// qualche centinaio di millisecondi che sposterebbe visibilmente il clock
// ritmico qui è trascurabile rumore, coerente con la ragione per cui questo
// stato vive fuori da `BrainRhythmState` (§10 del brief).
//
// DECISIONE (non prevista dal piano): firma di `ingestSample` — `bands`,
// `now` (timestamp assoluto, stesso stile di `time` in `update()` sui
// renderer esistenti, es. `brainFilterPsicheCanvas.ts`), `transients`
// opzionale. Non replica la firma più complessa di
// `OutputRhythmClock.ingestSample` (sequence number, staleness, hook di
// riallineamento fase): quei problemi sono specifici alla ricostruzione
// ritmica frame-locale, non a una memoria multi-secondo che tollera già per
// natura piccole imprecisioni sui singoli campioni. **Non riceve
// `movingAverages`**: nessuna formula di questo modulo lo usa più (la prima
// versione di `calculateSpectralOccupancy` lo usava come pavimento
// per-banda, corretta — vedi il suo commento "DECISIONE" — a favore di un
// pavimento relativo all'energia sostenuta complessiva); accettarlo comunque
// avrebbe lasciato un parametro morto nella firma pubblica.
export class BrainBioPerceptionClock {
  private envelopes: BrainBioEnvelopes = createInitialBioEnvelopes()
  // BUG TROVATO E CORRETTO IN DUE TENTATIVI durante l'implementazione (non a
  // verifica finale) — il secondo tentativo ha rivelato un problema più
  // profondo del primo:
  //
  // 1° tentativo (insufficiente): la prima versione creava `reference` al
  //    primo `ingestSample`, catturando `envelopes.mid` prima ancora che
  //    avesse convergito dal silenzio — un "mondo" fantasma. Corretto
  //    inizializzando `reference` al vettore silenzioso fin dal costruttore,
  //    aspettandosi che la transizione silenzio→segnale passasse per la
  //    normale macchina a stati (fase 'stable' → invalidità rilevata).
  //
  // 2° tentativo (la causa vera): con `reference` fermo a zero e un segnale
  //    reale ma **poco energico** (es. `.15/.13/.1/.08`), `change` misurato
  //    da zero converge asintoticamente a un valore proporzionale
  //    all'energia del segnale stesso (~0.30 in quel caso) — **che non
  //    supera mai** la soglia di invalidità (0.35, tarata per transizioni
  //    energiche). La macchina a stati restava quindi bloccata in 'stable'
  //    per sempre con `reference` ancora a zero: non un bug della macchina a
  //    stati, ma del presupposto che "silenzio" sia un mondo valido da cui
  //    misurare un'invalidità con soglia assoluta — un segnale rarefatto non
  //    ha energia sufficiente per invalidare mai lo zero secondo quella
  //    soglia, per costruzione.
  //
  // Corretto trattando l'assenza di un mondo precedente come caso limite
  // esplicito, non come "reference = silenzio": al costruttore la macchina
  // parte già in `awaiting-confirmation` (non `stable`), saltando la fase 1
  // (non c'è nulla da invalidare, non è mai esistito un mondo) e andando
  // dritta alla fase 2 — il primo stato realmente coerente (persistence
  // sostenuta) viene promosso a `reference` non appena si stabilizza,
  // qualunque sia la sua energia assoluta.
  private reference: BrainBioReferenceState = {
    phase: 'awaiting-confirmation',
    vector: createInitialBioEnvelopes().mid,
    pressure: 0,
    pendingPressure: 0,
    invalidSustainedMs: 0,
    confirmSustainedMs: 0,
  }
  private residual: BrainBioResidualState = createInitialBioResidualState()
  private trend: BrainBioTrendState = createInitialBioTrendState()
  private temporal: BrainBioTemporalOccupancyState = createInitialBioTemporalOccupancyState()
  private regime: BrainBioRegimeState = createInitialBioRegimeState()
  private lastSampleAt = Number.NaN

  ingestSample(
    bands: BandEnergies,
    now: number,
    transients?: BandEnergies,
  ): BrainBioPerceptionState {
    const deltaMs = Number.isFinite(this.lastSampleAt)
      ? Math.max(0, now - this.lastSampleAt)
      : 16
    this.lastSampleAt = now

    this.envelopes = advanceBioEnvelopes(this.envelopes, bands, deltaMs)
    const persistence = calculatePersistence(this.envelopes)

    // `perceptualPressure` va calcolata prima di `advanceBioReference`
    // (brief Audio 2026-08-28, §2/§11): la promozione di un nuovo
    // riferimento deve poter catturare la pressione live dello stesso
    // istante, non quella del campione precedente.
    const sustainedEnergy = calculateSustainedEnergy(this.envelopes.fast)
    const spectralOccupancy = calculateSpectralOccupancy(this.envelopes.fast)
    this.temporal = advanceBioTemporalOccupancy(this.temporal, transients, deltaMs)
    const temporalOccupancy = calculateTemporalOccupancy(this.temporal)
    const perceptualPressure = calculatePerceptualPressure(sustainedEnergy, spectralOccupancy, temporalOccupancy)
    const rawPressure = calculateSustainedEnergy(bands)
    const nearSilent = rawPressure <= SILENCE_RAW_PRESSURE_MAX

    this.reference = advanceBioReference(
      this.reference,
      this.envelopes.mid,
      persistence,
      perceptualPressure,
      deltaMs,
    )
    const change = calculateChange(this.envelopes.mid, this.reference.vector)

    // Mediana/dispersione restano aggiornate come puro contesto per
    // l'overlay (§4 del brief) — non decidono più nulla, vedi il commento
    // sopra `classifyPressureTrend`. Il congelamento durante una
    // trasformazione confermata resta per la qualità del dato diagnostico
    // (stesso principio di prima, ora agganciato a `reference.phase`
    // invece che alla candidatura di regime rimossa).
    this.trend = advanceBioTrend(
      this.trend,
      nearSilent ? 0 : perceptualPressure,
      deltaMs,
      this.reference.phase === 'awaiting-confirmation',
    )
    // `pressureTrend` ora confronta la pressione live con quella del
    // riferimento — la configurazione immediatamente precedente (§2/§4 del
    // brief), non la mediana della serata. Reazione immediata per
    // costruzione: nessuna finestra di conferma qui.
    const pressureTrend = classifyPressureTrend(perceptualPressure, this.reference.pressure)
    // `residual` non dipende più da `persistence` (vedi il commento sopra
    // `advanceBioResidual`): è memoria diretta della pressione, non più
    // un'impronta gated dalla coerenza dello stato corrente.
    this.residual = advanceBioResidual(this.residual, perceptualPressure, deltaMs)

    const signals: BrainBioPerceptionSignals = {
      persistence,
      change,
      residual: this.residual.value,
      perceptualPressure,
      pressureTrend,
    }
    this.regime = advanceBioRegime(
      this.regime,
      signals,
      this.trend.median,
      deltaMs,
      nearSilent,
    )

    return { signals, regime: this.regime.current }
  }

  getState(): BrainBioPerceptionState {
    const perceptualPressure = calculatePerceptualPressure(
      calculateSustainedEnergy(this.envelopes.fast),
      calculateSpectralOccupancy(this.envelopes.fast),
      calculateTemporalOccupancy(this.temporal),
    )
    return {
      signals: {
        persistence: calculatePersistence(this.envelopes),
        change: calculateChange(this.envelopes.mid, this.reference.vector),
        residual: this.residual.value,
        perceptualPressure,
        pressureTrend: classifyPressureTrend(perceptualPressure, this.reference.pressure),
      },
      regime: this.regime.current,
    }
  }

  // Sola lettura per l'overlay: espone i numeri che la macchina usa davvero
  // e il progresso dell'unica conferma temporale rimasta.
  getRegimeDiagnostics(): BrainBioRegimeDiagnostics {
    const silence = this.regime.silence
    const currentPressure = this.getState().signals.perceptualPressure
    return {
      currentRegime: this.regime.current,
      pressureTrend: classifyPressureTrend(currentPressure, this.reference.pressure),
      currentPressure,
      referencePressure: this.reference.pressure,
      pressureMedian: this.trend.median,
      pressureDispersion: this.trend.mad,
      // Distanza dal riferimento: è quella che decide `pressureTrend` (brief
      // Audio 2026-08-28). La distanza dalla mediana resta esposta a parte,
      // sotto, come puro contesto — non decide più nulla.
      pressureDistance: currentPressure - this.reference.pressure,
      medianDistance: Number.isNaN(this.trend.median)
        ? Number.NaN
        : currentPressure - this.trend.median,
      transforming: this.reference.phase === 'awaiting-confirmation',
      level: this.regime.level,
      silenceNearZero: silence.nearSilent,
      silenceAuthorized: silence.authorized,
      silenceConfirmationProgress: clamp(silence.silentSustainedMs / SILENCE_ENTER_MS),
    }
  }
}

export type BrainBioRegimeDiagnostics = {
  currentRegime: BrainBioRegime
  pressureTrend: BrainBioPressureTrend
  currentPressure: number
  /** Pressione catturata nell'istante in cui il riferimento corrente fu promosso — la "configurazione immediatamente precedente" del brief Audio. */
  referencePressure: number
  /** Puro contesto (brief Audio 2026-08-28, §4/§6): non decide più nulla del passaggio, solo del livello dentro la stasi. */
  pressureMedian: number
  pressureDispersion: number
  /** Distanza firmata dal riferimento — quella che decide `pressureTrend`. */
  pressureDistance: number
  /** Distanza firmata dalla mediana dinamica del set — puro contesto. */
  medianDistance: number
  /** Forma: `reference.phase === 'awaiting-confirmation'` — trasformazione in corso. */
  transforming: boolean
  /** Livello riconosciuto nell'ultima stasi (con isteresi) — `null` prima del primo assestamento. */
  level: BrainBioLevel
  silenceNearZero: boolean
  silenceAuthorized: boolean
  silenceConfirmationProgress: number
}
