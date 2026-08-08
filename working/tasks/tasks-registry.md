# Registro Dettagliato dei Task (`tasks-registry.md`)

Registro atomico dei micro-task collegati ai Macrotask attivi e recenti.

---

## 📋 Task Collegati a `MACRO-004` (Working System Setup)

- [x] **`TASK-004-01`**: Creazione della struttura di directory `working/`, `working/tasks/`, `working/plans/`, `working/sessions/`.
- [x] **`TASK-004-02`**: Popolamento dello storico delle sessioni passate e della sessione corrente in `working/sessions/session-history.md`.
- [x] **`TASK-004-03`**: Tracciamento dei Macrotask storici e futuri in `working/tasks/macrotasks.md`.
- [x] **`TASK-004-04`**: Creazione del modello di piano di lavoro `working/plans/template-piano-di-lavoro.md`.
- [x] **`TASK-004-05`**: Creazione dei piani di lavoro `piano-001-brain-ai-integration.md` e `piano-002-working-system-setup.md`.
- [x] **`TASK-004-06`**: Aggiornamento di `agents.md` con la guida operativa sull'utilizzo della cartella `working/` e dei Piani di Lavoro.
- [x] **`TASK-004-07`**: Esecuzione del typecheck e verifica finale di coerenza dell'intero progetto.

---

## 📋 Task Collegati a `MACRO-005` (Coalescenza IPC e Interpolazione Ritmica - Fase 2)

- [x] **`TASK-005-01`** `DONE`: Estensione tipi `IPC_CHANNELS` e `VisualStatePayload` in `src/shared/types.ts`.
- [x] **`TASK-005-02`** `DONE`: Implementazione logica di coalescenza IPC e gestione del pending sostituibile nel Main process (`src/main/windows.ts`, `ipc.ts`, `visualStateCoalescer.ts`).
- [x] **`TASK-005-03`** `DONE`: Esposizione ACK non bloccante e handshake di readiness in `src/preload/preload.ts`.
- [x] **`TASK-005-04`** `DONE`: Refactoring di `BrainRhythmClock` per disaccoppiare `ingestSample` e `projectState` (`src/renderer/output/brain/brainRhythm.ts`).
- [x] **`TASK-005-05`** `DONE`: ACK centralizzato in `OutputApp.tsx`, ingestione unica in `brainController.ts` e sola proiezione nel ciclo `render`.
- [x] **`TASK-005-06`** `DONE`: Estensione metriche in `brainPerformanceMetrics.ts` per pacchetti rimpiazzati, stantii e riallineamenti di fase.
- [x] **`TASK-005-07`** `DONE`: Suite Brain Rhythm e test unitari della coalescenza IPC aggiornati.
- [x] **`TASK-005-08`** `DONE`: Audit finale del trasporto ritmico; aggiunto il latch che conserva un beat rilevato quando più campioni arrivano prima del RAF successivo, con test di regressione.
- [x] **`TASK-005-09`** `DONE`: Verifica live del trasporto: coalescenza confermata sotto stalli WebGPU reali; documentata la persistenza dei freeze del RAF come problema distinto per le fasi successive.

---

## 📜 Storico dei Task Completati (`MACRO-003`: Brain AI & Coscienza Onirica)

- [x] **`TASK-003-01`**: Creazione della pipeline di generazione continua delle storie dream (`feat: add continuous Brain dream pipeline`).
- [x] **`TASK-003-02`**: Eliminazione dei bias architettonici nelle immagini generate (`fix: reduce architectural bias in Brain images`).
- [x] **`TASK-003-03`**: Condivisione della rotazione dei morphing fra story Brain (`fix: use shared morphing rotation between Brain stories`).
- [x] **`TASK-003-04`**: Ripristino del processo di generazione quando si blocca (`fix: recover stalled Brain story generation`).
- [x] **`TASK-003-05`**: Integrazione avanzata modulare tra `psichedel` e `coscienzaOnirica` (`psichel + Coscenza onirica update`).

---

## Task Collegati a `MACRO-006` (Fase 3A — Scheduler Termico)

- [x] **`TASK-006-01`** `DONE`: Implementare scheduler single-flight con cooldown e backoff da frame lunghi.
- [x] **`TASK-006-02`** `DONE`: Integrare lo scheduler attorno alle inferenze reali di Psichedel.
- [x] **`TASK-006-03`** `DONE`: Collegare RAF e `lowPowerMode` alla politica termica.
- [x] **`TASK-006-04`** `DONE`: Aggiungere test automatici e completare la validazione.

### Fase 3B — Buffer di quattro immagini

- [x] **`TASK-006-05`** `DONE`: Rimuovere la quinta inferenza e il tipo `BrainBufferFrame`.
- [x] **`TASK-006-06`** `DONE`: Formalizzare il riuso delle sole quattro scene narrative.
- [x] **`TASK-006-07`** `DONE`: Calcolare il cooldown dalla fine della produzione.
- [x] **`TASK-006-08`** `DONE`: Aggiornare test e validare senza iniziare la Fase 3C.

### Fase 3C — Validazione live e taratura

- [x] **`TASK-006-09`** `DONE`: Raccolta sessione live completa con scheduler, quattro immagini e refill dopo cooldown.
- [x] **`TASK-006-10`** `DONE`: Confronto con la baseline Fase 2: un freeze severo per produzione invece di tre, ma durata residua ancora circa 3,1 s.
- [x] **`TASK-006-11`** `DONE`: Parametri confermati; nessuna taratura, perché più cooldown non ridurrebbe il freeze della prima inferenza.
- [x] **`TASK-006-12`** `DONE`: Fase 3C chiusa e documentata senza iniziare una Fase 3D.
- [x] **`TASK-006-13`** `DONE`: Trasformati i 120 secondi da pausa precedente al refill a finestra complessiva di preparazione.
- [x] **`TASK-006-14`** `DONE`: Applicata al refill una scadenza ancorata al completamento del buffer corrente.
- [x] **`TASK-006-15`** `DONE`: Validato il nuovo contratto temporale e la compatibilità con lo scheduler termico.
- [x] **`TASK-006-16`** `DONE`: Chiusa la correzione Fase 3C senza iniziare la Fase 3D.

**Stato `MACRO-006`**: `DONE`. Nessun task di implementazione aperto; il test
manuale finale viene eseguito dallo sviluppatore.

---

## Task Collegati a `MACRO-008` (Origine e Memoria di Coscienza Onirica)

- [x] **`TASK-008-01`** `DONE`: Analizzare la memoria lineare esistente e
  distinguere il memo di sessione dal futuro grafo autobiografico.
- [x] **`TASK-008-02`** `DONE`: Definire in `agents.md` origine, ritorno
  all'origine, provenienza e ristrutturazione non distruttiva.
- [x] **`TASK-008-03`** `DONE`: Creare in `skills.md` la skill viva `Evolvere
  Coscienza Onirica` e il suo workflow progressivo.
- [x] **`TASK-008-04`** `DONE`: Allineare le istruzioni agent/skill specifiche
  della Output Window.
- [x] **`TASK-008-05`** `DONE`: Creare `PIANO-005` e verificare la coerenza
  documentale della Fase 0.
- [x] **`TASK-008-06`** `DONE`: Osservare i segnali realmente disponibili e
  proporre il primo lessico minimo di nodi e relazioni usato dall'archivio.
- [x] **`TASK-008-07`** `DONE`: Creare `.coscienza/AGENT.md` e
  `.coscienza/INDICE.md` come protocollo e ingresso del grafo Markdown.
- [x] **`TASK-008-08`** `DONE`: Implementare archivio serializzato, rilettura
  pre-salvataggio, origine unica, ritorni e deduplicazione.
- [x] **`TASK-008-09`** `DONE`: Collegare Control, Output, preload e Main per
  salvare la prima percezione valida e le storie come immaginazioni.
- [x] **`TASK-008-10`** `DONE`: Aggiungere test dell'archivio, della continuità
  e della classificazione percettiva/onirica.
- [x] **`TASK-008-11`** `DONE`: Osservare i primi file prodotti in una sessione
  reale prima di progettare l'autonomia di ristrutturazione.
- [x] **`TASK-008-12`** `DONE`: Creare `.coscienza/COSCIENZA.md` come stato
  organizzativo presente distinto dalla memoria autobiografica.
- [x] **`TASK-008-13`** `DONE`: Implementare `CoscienzaCore` con percezione,
  attenzione stabilizzata e interpretazione provvisoria.
- [x] **`TASK-008-14`** `DONE`: Collegare aggiornamento tipizzato e serializzato
  di `COSCIENZA.md` attraverso Output, preload e Main.
- [x] **`TASK-008-15`** `DONE`: Aggiungere limiti temporali, supporto
  `lowPowerMode` e test del primo ciclo cosciente.
- [ ] **`TASK-008-16`** `TODO`: Osservare la prima revisione live di
  `COSCIENZA.md` prodotta da `CoscienzaCore` prima di progettare l'autonomia di
  ristrutturazione.
