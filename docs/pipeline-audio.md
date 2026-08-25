# Pipeline Audio — Documentazione Tecnica

Documento consegnato al [Capo Supremo dell'Analisi Audio / Sound Designer di Brain](../team/capo-supremo-analisi-audio.md): descrive come il segnale audio viene catturato, ridotto a feature, trasmesso via IPC e infine interpretato ritmicamente dal lato Output/Brain. Non tratta la manifestazione visiva in sé (competenza della Direzione VJ), solo la catena che porta dal microfono allo stato percettivo utilizzabile dai renderer.

## 1. Vista D'Insieme

```
Control Window                                    Output Window
─────────────────                                  ─────────────
getUserMedia → AudioContext → AnalyserNode
        │
        ▼
useAudioAnalyzer.pullFrame()
  bande FFT → energie → smoothing
        │
        ▼
stepVisualEngine()  (flash/colore, non ritmo)
        │
        ▼
ControlApp RAF loop, ~60fps
        │  IPC fx:send-visual-state
        ▼                                          onVisualState()
                                             ──────────────────▶  OutputRhythmClock.ingestSample()
                                                                        │
                                                                        ▼
                                                                  projectState() ogni RAF Output
                                                                        │
                                                                        ▼
                                                          BrainRhythmState (beat, beatPhase, beatPulse,
                                                          kickEnvelope, bandTransients) → renderer Brain
```

Due processi Electron separati (Control e Output), collegati da IPC via `src/preload/preload.ts`. L'estrazione delle feature (FFT → bande → smoothing) avviene **solo** in Control; l'Output riceve bande già calcolate e ricostruisce da queste il ritmo (beat/fase/transient) in modo indipendente, perché il clock ritmico deve girare sul proprio `requestAnimationFrame` per restare sincrono con il rendering.

## 2. Acquisizione Del Segnale

File: `src/renderer/control/hooks/useAudioAnalyzer.ts`.

- `navigator.mediaDevices.getUserMedia()` con vincoli espliciti: `echoCancellation: false`, `noiseSuppression: false`, `autoGainControl: false` — il segnale non deve passare per l'elaborazione vocale di Chromium, che comprimerebbe i transient.
- Se il device salvato non è più valido (`OverconstrainedError`, `NotFoundError`, `DevicesNotFoundError`), fallback automatico al device audio di default.
- `AudioContext` + `AnalyserNode`:
  - `fftSize`: impostabile (`256 | 512 | 1024 | 2048 | 4096 | 8192`), default `1024` (`src/shared/defaults.ts`).
  - `smoothingTimeConstant`: default `0.75` — è lo smoothing **nativo** della Web Audio API applicato dentro `getByteFrequencyData`, indipendente dallo smoothing applicato manualmente più sotto nella pipeline (vedi §3).
  - `minDecibels: -90`, `maxDecibels: -10` — range fisso di quantizzazione per la conversione a byte (0–255).
- Ricreazione dell'`AnalyserNode` a ogni cambio di `fftSize`/`smoothingTimeConstant` runtime (effetto React dedicato).

## 3. Estrazione Delle Bande

File: `src/shared/frequencyBands.ts`, `src/shared/audioMath.ts`.

### 3.1 Bande Definite

```ts
{ key: 'low',    minHz: 40,   maxHz: 160  }
{ key: 'lowMid', minHz: 160,  maxHz: 400  }
{ key: 'mid',    minHz: 400,  maxHz: 2000 }
{ key: 'high',   minHz: 2000, maxHz: 8000 }
```

Conversione Hz → indice bin FFT: `bin(k) ≈ k · sampleRate / fftSize`. `bandToBinRange()` clampa contro il Nyquist (`sampleRate / 2`) e satura entro `[0, binCount-1]`.

### 3.2 Energia Di Banda

`computeBandEnergies()` fa una **media aritmetica semplice** (non RMS) dei valori byte (0–255) nel range di bin, normalizzata a 0–1 dividendo per 255. Questo è distinto dal calcolo usato nel motore flash (§4), che invece pesa RMS e media.

### 3.3 Due Livelli Di Smoothing Distinti

Calcolati ogni frame in `pullFrame()` con costanti di tempo diverse, tramite `alphaFromTau(deltaMs, tauMs) = exp(-deltaMs / tauMs)`:

| Livello | Variabile | τ (tau) | Uso |
|---|---|---|---|
| **meters** | `metersRef` | 55 ms | Risposta rapida — VU meter UI, feed diretto per il flash |
| **movingAverages** | `movingRef` | 280 ms | Media lenta — baseline dinamica per soglie adattive (flash e beat) |

`smoothBandEnergies()` applica exponential smoothing per-banda: `previous·α + value·(1-α)`.

### 3.4 Audio Primed

`audioPrimed = framesRef.current > 20` — le prime ~20 letture dopo l'avvio dell'analyser vengono scartate come non affidabili (buffer non ancora stabilizzato). Finché `audioPrimed` è `false`, flash e beat detection restano disattivati a valle (vedi §4 e §5).

## 4. Motore Flash (Non Ritmico)

File: `src/shared/visualEngine.ts`, funzione `stepVisualEngine()`.

Importante: questo motore governa **flash/colore**, non il beat usato dai renderer Brain (quello è `brainRhythm.ts`, §5). Sono due sistemi di rilevazione transient indipendenti, con logiche diverse, perché rispondono a esigenze diverse (un flash visivo vistoso vs. un fronte ritmico continuo per animare geometria).

### 4.1 Calcolo Energia Di Banda Per Il Flash

`getBandEnergy()` (interna a `visualEngine.ts`, diversa da `computeBandEnergies()`) usa `rawFrequencyData` + `sampleRate` grezzi (non le bande pre-calcolate) per ricavare bande *ad hoc* legate al `flashMode` selezionato (`low`/`mid`/`high`), con range Hz specifici per modalità (es. `mid`: banda principale 420–1800 Hz + secondaria 1800–3600 Hz). Formula: `rms · 0.82 + mean · 0.18` (pesa più la RMS della media semplice, a differenza di §3.2).

Se `rawFrequencyData`/`sampleRate` non sono disponibili, fallback su combinazioni delle bande standard (`fallbackFlashEnergyForMode`).

### 4.2 Decisione Di Trigger

1. **Media dinamica della banda-flash**: EMA con `α = 0.035` (τ implicito lungo, adattamento lento) — soglia mobile di riferimento (floor `0.025`).
2. **Transiente relativo**: `deltaRelative = max(0, energia_corrente - energia_precedente) / media_dinamica`.
3. **Energia relativa**: `relativeEnergy = energia_corrente / media_dinamica`, con boost `+0.10` se la banda secondaria supera `1.35×` la propria media.
4. **Doppia soglia obbligatoria**: serve sia `energyThresholdMet` (`boostedRelativeEnergy >= effectiveFlashThreshold`, default soglia `1.62`, moltiplicata ×1.12 non-soft / ×1.08 soft) **sia** `transientThresholdMet` (`deltaRelative >= transientDelta`, default `0.18`, ×1.12/×1.05). Un livello alto sostenuto senza transiente non innesca il flash, e viceversa.
5. **Blocco dominanza basse**: se `flashMode !== 'low'` e `flashOnKick === false`, un'energia `low` che supera `currentFlashBandEnergy × lowDominanceBlockRatio` (default `1.35`) alza la soglia richiesta del 15% — evita che ogni kick faccia scattare flash pensati per mid/high.
6. **Rate limiting**: `requiredIntervalMs = max(cooldownMs × (lowPower ? 1.08 : 1), (1000/maxFlashesPerSecond) × 1.18)`. Default `cooldownMs = 2800`, `maxFlashesPerSecond = 0.32` → flash deliberatamente rari.
7. **Gate `audioPrimed`**: nessun trigger prima che l'analyser sia stabilizzato (§3.4), né durante `panic` o `testFlashUntilMs` attivo (quest'ultimo bypassa la detection per il pulsante "Test flash").

### 4.3 Drive E Hot (Continui, Non A Soglia)

Oltre al trigger a soglia, due segnali continui alimentano colore/luminosità di base (non il beat):

- `rawDrive`: combinazione pesata di tutte le bande (`low·0.35 + lowMid·0.22 + mid·0.23 + high·0.2`) più bonus `low` per `subMovement`/`kickMovement`, smussata con τ 55–90 ms (`soft` allunga il tau).
- `rawHot`: `mid·0.55 + high·0.45`, smussata con τ 70–110 ms.

## 5. Clock Ritmico Brain (Beat/Fase/Transient)

File: `src/renderer/output/brain/brainRhythm.ts`, classe `OutputRhythmClock`. È il sistema che il Capo Supremo dei Designer/Visual VJ consuma per animare i renderer Brain (`beatPulse`, `beatPhase`, `kickEnvelope`, `bandTransients`) — vedi [`capo-supremo-designer-visual-vj.md`](../team/capo-supremo-designer-visual-vj.md).

Gira **lato Output**, non lato Control: riceve le bande già calcolate via IPC e ricostruisce il proprio stato con un ciclo separato in due fasi.

### 5.1 `ingestSample()` — Consumo Di Un Pacchetto Audio

Chiamato ogni volta che arriva un `VisualStatePayload` con `bandEnergies`.

- **Scarto pacchetti stantii**: per `sequenceNumber` non crescente, per età (`receivedAt - timestamp > 1500ms`), o per timestamp non progressivo.
- **Gap lungo (>1500ms)**: probabile sospensione del transporto (finestra in background, drop RAF). Il clock si riallinea senza inventare un beat né un transiente fittizio dal salto di livello — resetta i transient a 0 e il `beatPulse` a 0, poi marca `skipNextProjectionAdvance`.
- **Transienti per banda**: per ciascuna delle 4 bande, `delta = banda_corrente - banda_precedente`; il target è `clamp01((delta - soglia_banda) × 5.5)`. Soglie per banda (`TRANSIENT_THRESHOLDS`): low 0.02, lowMid 0.018, mid 0.015, high 0.022. L'attacco verso il target usa `1 - exp(-elapsed/28)` (attacco molto rapido, ~28 ms).
- **Rilevazione beat**: condizioni combinate — `sinceBeat >= 240ms` (rifiuta beat troppo ravvicinati), `low >= max(0.075, baseline_low × 1.08)`, e (`transient_low >= 0.012` E `lowLift >= 0.08`) OPPURE (`transient_lowMid >= 0.035` E `lowMidLift >= 0.12`) — dove `lowLift`/`lowMidLift` sono scostamenti relativi dalla baseline mobile. Doppia via di rilevazione (low o lowMid) per non perdere kick con timbro diverso.
- **Stima tempo (BPM implicito)**: alla rilevazione di un beat, se l'intervallo dall'ultimo beat è in `[260, 1200]` ms, viene normalizzato (raddoppiato o dimezzato se troppo lontano dal `beatDurationMs` corrente, per gestire ottava ritmica ambigua), accumulato in una finestra di 7 intervalli, e il `beatDurationMs` viene aggiornato con la mediana: `beatDurationMs = beatDurationMs × 0.68 + mediana × 0.32` (adattamento smussato, non istantaneo).
- **Fase allineata al fronte reale**: l'indice di beat rilevato (`phaseAlignedBeatIndex`) non torna mai indietro rispetto a quanto già emesso — se la proiezione (§5.2) era già avanti, il fronte reale avanza all'intero successivo, garantendo che il frame seguente riparta vicino a fase zero senza salti percepibili.

### 5.2 `projectState()` — Interpolazione Fra Campioni

Chiamato a ogni RAF dell'Output (non solo all'arrivo di un pacchetto), per fornire fase continua ai renderer anche fra due sample audio.

- **Decay esponenziale** di `bandTransients` (τ per banda: low 260ms, lowMid 220ms, mid 180ms, high 75ms — l'high si spegne molto più in fretta, coerente con la natura percussiva/breve dei transienti in alta frequenza) e di `beatPulse` (τ 180ms).
- **Proiezione della fase** (`musicalPosition`) solo se: nessun beat appena rilevato, nessun riallineamento in corso, e `active` (segnale sopra soglia, vedi §5.3). Avanza di `elapsed / beatDurationMs` — mai un "recupero" a scatti dopo un RAF sospeso, il movimento resta sempre proporzionale al tempo reale trascorso.
- **Beat predetto** (dead reckoning): se sono già stati osservati almeno 2 intervalli e c'è energia sufficiente (`low+lowMid >= 0.1` e `low >= baseline×0.88`), un beat viene proiettato quando `musicalPosition` supera il prossimo intero — utile nei passaggi in cui il segnale è presente ma sotto la soglia di rilevazione diretta di un nuovo attacco.
- **`kickEnvelope`**: `max(beatPulse, beatPulse×0.82 + transient_low×0.26 + transient_lowMid×0.08)` — un inviluppo più "morbido" del beat puro, utile ai renderer che vogliono seguire l'energia del colpo oltre il semplice impulso istantaneo.

### 5.3 Stato Di Attività (`active`) — Silenzio Come Informazione

`updateSignalActivity()`: energia totale (`low+lowMid+mid+high`) sopra `0.018` → `signalActive = true`; sotto `0.008` per almeno `900ms` continui → torna `false`. Isteresi intenzionale (soglie di ingresso/uscita diverse + hold temporale) per evitare flicker fra attivo/silenzioso su fluttuazioni minime. Quando `active` è `false`, la fase smette di avanzare e nessun beat predetto viene generato: il silenzio è trattato come stato percettivo valido, non come mancanza di segnale da "riempire" artificialmente — coerente con il [Check Silenzio](../agents.md) del Protocollo Visivo.

### 5.4 API Derivate

- `calculateRhythmicAccent(rhythm)`: fronte ritmico unico condiviso dai renderer — `max(kickEnvelope, beatPulse, transient_low×0.86 + transient_lowMid×0.24)`, azzerato se `rhythm.active === false`. Non dipende da energia sostenuta: resta leggibile anche in passaggi scarni.
- `OutputApp.tsx` (riga ~80) definisce `beatAligned = rhythm.beat || beatPhase <= 0.07 || beatPhase >= 0.93` — usato per allineare cambi di stato/preset al battito più vicino (vedi Check Beatmatch/Transizione in `agents.md`).

## 6. Trasporto IPC Control → Output

File: `src/shared/types.ts` (interfaccia `VisualStatePayload`), `src/main/ipc.ts`, `src/preload/preload.ts`.

Ogni frame RAF di Control invia via `fx:send-visual-state`:

- `bandEnergies`, `movingAverages` (§3)
- `audioPrimed` (§3.4)
- `rawFrequencyData` — solo usato lato Control per il motore flash (§4), non ritrasmesso all'analisi ritmica lato Output
- `audioTimestampMs = performance.timeOrigin + t` — timestamp assoluto, base per il calcolo di staleness in `ingestSample()`
- `sequenceNumber` — contatore monotono incrementale, usato per scartare pacchetti fuori ordine
- `settings` — include `fftSize`, `smoothingTimeConstant`, `motionProfile`, tutte le soglie del motore flash

Il main process mantiene `latestVisualState` e lo re-invia quando l'Output si apre/ricarica, per evitare che il primo stato ritmico parta da zero assoluto se il Control era già attivo.

## 7. `motionProfile` — Non È Analisi Audio

`dub` / `techno` / `ambient` (`src/shared/types.ts`, default `dub`) è un parametro consumato **dai renderer** (`morphingCanvas.ts`, `brainFrameMotion.ts`, ecc.) per modulare smoothing/elasticità del *movimento risultante*, non un parametro del clock ritmico o dell'estrazione delle bande. Il beat detection e le bande sono identiche a monte per tutti e tre i profili; cambia solo come i renderer traducono `beatPulse`/`kickEnvelope` in movimento (release più morbido in `dub`, più marcato/clampato in `techno`, transienti ridotti in `ambient`). Rilevante da conoscere per non confondere una richiesta di "cambiare la sensibilità per genere" con un intervento sul motore audio: è quasi sempre un intervento sul renderer.

## 8. Consumo Da Parte Di Coscienza Onirica

File: `src/renderer/output/brain/coscienzaCore.ts`.

Riceve `VisualStatePayload` (non `BrainRhythmState`) e osserva `bandEnergies`/`movingAverages` per selezionare un "fuoco d'attenzione": banda dominante se supera `SILENCE_THRESHOLD = 0.04`, altrimenti `silence`, oppure `flash` se `flashActive && flashIntensity >= 0.7`. Percezione qualitativa e a bassa frequenza di aggiornamento (stabilità minima 2.5s prima di cambiare fuoco) — non consuma il clock ritmico frame-per-frame, coerentemente col fatto che la coscienza osserva pattern persistenti, non ogni transiente.

## 9. Punti Di Attenzione Per L'Analisi Audio

- **Due pipeline di banda distinte e non condivise**: `computeBandEnergies()` (§3.2, media semplice, per meters/movingAverages/beat detection) vs. `getBandEnergy()` in `visualEngine.ts` (§4.1, RMS-pesata, solo per il flash). Una modifica alla formula di una non si propaga automaticamente all'altra — verificare sempre quale funzione si sta effettivamente modificando.
- **Due sistemi di transient detection indipendenti**: quello del motore flash (§4.2, EMA α=0.035 + doppia soglia) e quello del clock ritmico Brain (§5.1, soglie per banda + isteresi `active`). Non condividono stato né costanti; un tuning pensato per l'uno non si applica all'altro.
- **`smoothingTimeConstant` nativo Web Audio (§2) è un terzo livello di smoothing**, a monte di meters/movingAverages (§3.3) — tre smoothing in cascata con costanti di tempo diverse e non coordinate esplicitamente; utile saperlo se si osserva un ritardo complessivo maggiore della somma "attesa" di un solo stadio.
- **Il clock ritmico gira lato Output, non lato Control**: qualunque intervento sulla logica di beat detection va fatto in `brainRhythm.ts`, non in `useAudioAnalyzer.ts` o `visualEngine.ts` — questi ultimi due non hanno alcuna nozione di beat/fase.
- **Non spostare l'analisi audio fuori dalla finestra Electron** senza riprogettare permessi/preload (regola in `agents.md`).
