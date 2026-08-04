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

- [ ] **`TASK-005-01`**: Estensione tipi `IPC_CHANNELS` e `VisualStatePayload` in `src/shared/types.ts`.
- [ ] **`TASK-005-02`**: Implementazione logica di coalescenza IPC e gestione `pendingVisualState` nel Main process (`src/main/windows.ts`, `ipc.ts`).
- [ ] **`TASK-005-03`**: Esposizione canale ACK non bloccante in `src/preload/preload.ts`.
- [ ] **`TASK-005-04`**: Refactoring di `BrainRhythmClock` per disaccoppiare `ingestSample` e `projectState` (`src/renderer/output/brain/brainRhythm.ts`).
- [ ] **`TASK-005-05`**: Aggiornamento di `brainController.ts` per chiamare ACK e `ingestSample` su pacchetti unici, e solo `projectState` nel ciclo `render`.
- [ ] **`TASK-005-06`**: Estensione metriche in `brainPerformanceMetrics.ts` per tracciare pacchetti rimpiazzati, stantii ed allineamenti di fase.
- [ ] **`TASK-005-07`**: Aggiornamento suite di test unitari `brainRhythm.test.ts` e test IPC.

---

## 📜 Storico dei Task Completati (`MACRO-003`: Brain AI & Coscienza Onirica)

- [x] **`TASK-003-01`**: Creazione della pipeline di generazione continua delle storie dream (`feat: add continuous Brain dream pipeline`).
- [x] **`TASK-003-02`**: Eliminazione dei bias architettonici nelle immagini generate (`fix: reduce architectural bias in Brain images`).
- [x] **`TASK-003-03`**: Condivisione della rotazione dei morphing fra story Brain (`fix: use shared morphing rotation between Brain stories`).
- [x] **`TASK-003-04`**: Ripristino del processo di generazione quando si blocca (`fix: recover stalled Brain story generation`).
- [x] **`TASK-003-05`**: Integrazione avanzata modulare tra `psichedel` e `coscienzaOnirica` (`psichel + Coscenza onirica update`).
