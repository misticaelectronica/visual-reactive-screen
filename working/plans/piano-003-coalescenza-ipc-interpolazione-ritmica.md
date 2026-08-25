# Piano di Lavoro: Coalescenza IPC e Interpolazione Ritmica Locale (Fase 2)

> **ID Piano**: `PIANO-003`  
> **Macrotask di Riferimento**: `MACRO-005` (Coalescenza IPC & Interpolazione Ritmica Locale)  
> **Data Creazione**: 2026-08-05  
> **Stato**: `COMPLETED` (verifica live manuale raccomandata)
> **Branch Git**: `psychedel-canvas-strips`  
> **Autore**: Agente AI Antigravity  

---

## 1. 🎯 Obiettivo del Piano

Realizzare **esclusivamente la Fase 2** del sistema di reattività ritmica e trasporto IPC:
1. **Coalescenza IPC Main → Output**: impedire che durante gli stalli WebGPU (inferenza immagini 2–3s) Electron accumuli ed emetta una raffica di vecchi pacchetti audio all'Output. Garantire al massimo **un pacchetto in volo (unconfirmed)** ed **un solo pacchetto pending sostituibile** con l'ultimo stato audio acquisito.
2. **Disaccoppiamento Ingestione / Proiezione Ritmica in `BrainRhythmClock`**: separare l'acquisizione/ingestione dei campioni musicali (da eseguire 1 sola volta per pacchetto nuovo) dalla proiezione/interpolazione locale della fase nel loop RAF di rendering.
3. **Eliminazione di Replay e Catch-Up**: assicurare che dopo uno stallo la fase si riallinei istantaneamente al campione più recente, senza accelerazioni temporali artificiali, balzi all'indietro o transienti duplicati.

---

## 2. 📋 Prerequisiti e Diagnosi del Codice Corrente

- **Diagnosi dello Stato Attuale**:
  - `BrainRhythmClock.update()` esegue contemporaneamente l'analisi dei transienti e l'avanzamento temporale a ogni RAF dell'Output.
  - Durante l'inferenza WebGPU, l'Output può congelarsi per 2–3 secondi. Al termine dello stallo, Electron consegna tutti i messaggi accumulati, portando la latenza misurata fino a 3,5 secondi.
  - `broadcastVisualState()` in `src/main/windows.ts` invia cieco tramite `outputWindow.webContents.send(...)` senza backpressure né canale di conferma ACK.
- **File Oggetto del Piano**:
  - [src/shared/types.ts](file:///Users/andreadotta/workspace/origine-fx/visual-reactive-screen/git-0/visual-reactive-screen/src/shared/types.ts)
  - [src/main/ipc.ts](file:///Users/andreadotta/workspace/origine-fx/visual-reactive-screen/git-0/visual-reactive-screen/src/main/ipc.ts)
  - [src/main/windows.ts](file:///Users/andreadotta/workspace/origine-fx/visual-reactive-screen/git-0/visual-reactive-screen/src/main/windows.ts)
  - [src/preload/preload.ts](file:///Users/andreadotta/workspace/origine-fx/visual-reactive-screen/git-0/visual-reactive-screen/src/preload/preload.ts)
  - [src/renderer/control/ControlApp.tsx](file:///Users/andreadotta/workspace/origine-fx/visual-reactive-screen/git-0/visual-reactive-screen/src/renderer/control/ControlApp.tsx)
  - [src/renderer/output/OutputApp.tsx](file:///Users/andreadotta/workspace/origine-fx/visual-reactive-screen/git-0/visual-reactive-screen/src/renderer/output/OutputApp.tsx)
  - [src/renderer/output/brain/brainController.ts](file:///Users/andreadotta/workspace/origine-fx/visual-reactive-screen/git-0/visual-reactive-screen/src/renderer/output/brain/brainController.ts)
  - [src/renderer/output/brain/brainRhythm.ts](file:///Users/andreadotta/workspace/origine-fx/visual-reactive-screen/git-0/visual-reactive-screen/src/renderer/output/brain/brainRhythm.ts)
  - [src/renderer/output/brain/brainRhythm.test.ts](file:///Users/andreadotta/workspace/origine-fx/visual-reactive-screen/git-0/visual-reactive-screen/src/renderer/output/brain/brainRhythm.test.ts)
  - [src/renderer/output/brain/brainPerformanceMetrics.ts](file:///Users/andreadotta/workspace/origine-fx/visual-reactive-screen/git-0/visual-reactive-screen/src/renderer/output/brain/brainPerformanceMetrics.ts)

---

## 3. ⚠️ Regole Inviolabili e Vincoli di Sviluppo (da `agents.md`)

- [x] **Nessun reset git / checkout distruttivo**: lavorare direttamente sul working tree e branch corrente (`psychedel-canvas-strips`).
- [x] **Nessun cambiamento estetico**: non toccare palette, morphing, raster fade, punti, forme o preset.
- [x] **Nessun aumento di carico**: non aumentare FPS target, DPR o numero di layer.
- [x] **Preservare le flag di sistema**: non rimuovere `backgroundThrottling: false`, `lowPowerMode` o gli switch Chromium in `main.ts`.
- [x] **Camera e Movimento**: Camera stabile, nessun movimento temporale autonomo che simuli la musica in silenzio. In silenzio il movimento deve rimanere quasi nullo.
- [x] **Transienti distinti**: mantenere `low`, `lowMid`, `mid` e `high` separati.
- [x] **Limitazione dello scope**: Non avviare la Fase 3.

---

## 4. 🛠️ Fasi di Implementazione e Checklist Task

### Fase 2.1: Estensione Tipi IPC e Canale ACK
- [x] **Task 2.1.1**: Estendere `IPC_CHANNELS` in `src/shared/types.ts` aggiungendo il canale `visualStateAck: 'fx:visual-state-ack'`.
- [x] **Task 2.1.2**: Estendere `VisualStatePayload` in `src/shared/types.ts` con i campi timestamp/sequenza:
  ```ts
  audioTimestampMs?: number
  sequenceNumber?: number
  ```
  mantenendo retrocompatibilità totale con payload privi dei nuovi campi.
- [x] **Task 2.1.3**: Estendere le API IPC per supportare ACK non bloccante e handshake di readiness dell'Output.

### Fase 2.2: Protocollo di Coalescenza con Backpressure nel Main Process
- [x] **Task 2.2.1**: Modificare `src/main/windows.ts`:
  - Introdurre le variabili di stato:
    `let latestVisualState: VisualStatePayload | null = null`
    `let pendingVisualState: VisualStatePayload | null = null`
    `let isOutputAwaitingAck = false`
  - In `broadcastVisualState(payload)`:
    - Se `!isOutputAwaitingAck`: imposta `isOutputAwaitingAck = true`, invia il payload a `outputWindow` e svuota `pendingVisualState`.
    - Se `isOutputAwaitingAck`: sovrascrivi `pendingVisualState = payload` (senza inviare nuovo IPC).
  - Gestire il callback ACK dall'Output (`onVisualStateAck`):
    - Impostare `isOutputAwaitingAck = false`.
    - Se `pendingVisualState` è presente, prelevare l'ultimo pending, impostare `isOutputAwaitingAck = true`, inviarlo all'Output e azzerare `pendingVisualState`.
- [x] **Task 2.2.2**: Aggiornare `src/main/ipc.ts` registrando l'handler IPC `IPC_CHANNELS.visualStateAck`.
- [x] **Task 2.2.3**: In `src/preload/preload.ts`, esporre `sendVisualStateAck()` e `notifyVisualStateReady()` nell'interfaccia `window.fxOutput`.
- [x] **Task 2.2.4**: Garantire l'assenza di deadlock durante chiusura, apertura, reload o ricreazione dell'Output, con reset della macchina di stato e reinvio del solo stato più recente dopo handshake.

### Fase 2.3: Disaccoppiamento Ingestione e Proiezione Ritmica in `BrainRhythmClock`
- [x] **Task 2.3.1**: Refactoring di `BrainRhythmClock` in `src/renderer/output/brain/brainRhythm.ts`:
  - Separare l'ingestione dal rendering:
    - `ingestSample(bands: BandEnergies, timestampMs: number, movingAverages?: BandEnergies): void`
    - `projectState(nowMs: number): BrainRhythmState`
  - In `ingestSample`:
    - Processare i transienti e la baseline audio **esattamente 1 volta** per pacchetto.
    - Ignorare campioni con `sequenceNumber` <= ultimo processato o con timestamp stantio (es. > 1500ms più vecchio del tempo corrente).
    - In caso di gap prolungato (post-stallo), resettare la fase senza eseguire catch-up o replay.
  - In `projectState`:
    - Calcolare l'avanzamento continuo della posizione musicale ed il decay dei transienti in base al delta temporale `nowMs`.
    - Mantenere la monotonia della posizione musicale (`musicalPosition`) ed il comportamento quasi nullo in silenzio.
- [x] **Task 2.3.2**: Modificare `brainController.ts` e il punto unico di ricezione `OutputApp.tsx`:
  - In `updateState(payload)`:
    - Chiamare immediatamente `fxOutput.sendVisualStateAck()` nel listener Output comune, garantendo l'ACK per ogni algoritmo e non solo per Brain.
    - Invocare `rhythmClock.ingestSample(...)` soltanto se il pacchetto è una nuova sequenza valida.
  - Nel ciclo `render(now)`:
    - Chiamare unicamente `rhythmClock.projectState(now)` per aggiornare la visualizzazione.

### Fase 2.4: Estensione Telemetria Diagnostica (`brainPerformanceMetrics.ts`)
- [x] **Task 2.4.1**: In `brainPerformanceMetrics.ts`, estendere le metriche per tracciare:
  - Pacchetti sostituiti nel main (`replacedPendingCount`).
  - Pacchetti stantii ignorati (`stalePacketsIgnored`).
  - Riallineamenti diretti di fase senza catch-up (`phaseRealignmentCount`).
- [x] **Task 2.4.2**: Integrare le nuove metriche nel report di log periodico.

### Fase 2.5: Test Unitari e di Integrazione
- [x] **Task 2.5.1**: Aggiornare ed estendere `src/renderer/output/brain/brainRhythm.test.ts`:
  - Test per disaccoppiamento `ingestSample` e `projectState`.
  - Test per avanzamento monotono della fase tra due campioni.
  - Test per assenza di catch-up / accelerazioni dopo gap temporali lunghi.
  - Test per la conservazione dei transienti distinti delle 4 bande.
  - Test per compatibilità con payload storici privi di telemetria nuova.
- [x] **Task 2.5.2**: Creare unit test per la logica di coalescenza IPC nel main / handler ACK.

---

## 5. 🧪 Strategia di Verifica e Validation Plan

1. **Test Unitari**:
   ```bash
   pnpm test
   ```
   (Tutti i test in `brainRhythm.test.ts` e nei nuovi file di test devono essere verdi).

2. **Verifica Tipo & Lint**:
   ```bash
   pnpm typecheck
   pnpm lint
   ```

3. **Verifica Build Electron Completa**:
   Poiché vengono modificati `src/main/` e `src/preload/`, eseguire il build completo:
   ```bash
   pnpm build
   ```

4. **Verifica Manuale Funzionale**:
   - Avviare l'app e simulare uno stallo di rendering (o pausa prolungata dell'Output).
   - Verificare dai log delle metriche che:
     - Durante lo stallo i pacchetti in arrivo vengono sostituiti nel main (nessuna coda di 30-100 stati vecchi).
     - Alla ripresa dell'Output viene ricevuta ed elaborata direttamente la frame corrente.
     - Non si verificano scatti nervosi, sfarfallii o accelerazioni temporali innaturali.

### Esito validazione automatica — 05 Agosto 2026

- [x] `pnpm test`: 22 file, 182 test superati.
- [x] `pnpm typecheck`: superato.
- [x] Lint dei file modificati dalla Fase 2: superato.
- [x] `pnpm build`: superato; bundle renderer/Main/Preload e pacchetti macOS generati.
- [x] `git diff --check`: superato.
- [!] `pnpm lint`: la Fase 2 non introduce errori; resta un errore preesistente fuori scope in `src/renderer/output/slitScanCanvas.ts:639` (`prefer-const`).
- [ ] Verifica live manuale con stallo WebGPU reale: raccomandata nella prossima sessione su uscita fullscreen.

### Audit conclusivo — 07 Agosto 2026

- [x] Verificato il protocollo ACK, inclusi pending sostituibile, correlazione della sequenza, readiness, reload e chiusura Output.
- [x] Corretto il caso di più campioni ricevuti prima dello stesso RAF: un beat già rilevato resta latched fino alla successiva `projectState()`.
- [x] Aggiunto test di regressione dedicato.
- [x] `pnpm test`: 22 file, 183 test superati.
- [x] `pnpm typecheck`: superato.
- [x] Lint mirato di tutti i file della Fase 2: superato.
- [x] `pnpm build`: superato; bundle renderer/Main/Preload e pacchetti macOS generati.
- [x] `git diff --check`: superato.
- [x] Verifica live manuale con stallo WebGPU reale completata l'08 Agosto 2026.

### Esito verifica live — 08 Agosto 2026

- Stallo 1: RAF Output massimo circa 3975 ms; 668 pending sostituiti; 1 pacchetto stantio ignorato; 1 riallineamento.
- Stallo 2: RAF Output massimo circa 3192 ms; 655 pending sostituiti; 2 pacchetti stantii ignorati; 1 riallineamento.
- Stallo 3: RAF Output massimo circa 3008 ms; 467 pending sostituiti; 1 pacchetto stantio ignorato; 1 riallineamento.
- La latenza ordinaria `p95` resta circa 2-5 ms anche nelle finestre che includono gli stalli: la coda storica non viene riprodotta.
- Il freeze visivo coincide invece con il blocco del RAF causato dall'inferenza WebGPU e non può essere rimosso dalla coalescenza IPC.
- Esito Fase 2: obiettivo di trasporto raggiunto; la riduzione dei freeze passa alla Fase 3 e, se necessario, alla Fase 6.

---

## 6. 📋 Output e Misure per il Report Finale Post-Implementazione

A completamento dell'implementazione (quando verrà eseguita), il report finale dovrà includere:
1. **File modificati**: elenco preciso delle modifiche in `main/`, `preload/`, `shared/` e `output/`.
2. **Comportamento Precedente vs Nuovo**:
   - *Prima*: Coda accumulata durante stalli WebGPU, latenza fino a 3.5s, raffica di stati vecchi, ingestione a ogni RAF.
   - *Dopo*: Coalescenza con al più 1 pacchetto in volo + 1 pending sostituibile, ingestione unica per campione, proiezione locale fluida senza catch-up.
3. **Risultato dei Test Eseguiti**: esito di `pnpm test`, `pnpm typecheck`, `pnpm build`.
4. **Misure per Test Live**: contatori da verificare dai log (`BrainMetrics`) durante sessioni live prolungate.
