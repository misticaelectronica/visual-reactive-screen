# Registro Macrotask (`macrotasks.md`)

Questo file traccia le macro-funzionalità ed i moduli principali del progetto **Mistica Electronica Visual Reactive Screen**.

---

## 🟢 Macrotask Completati (Passati)

### `MACRO-001`: Architettura Base Electron & IPC Engine
- **Descrizione**: Realizzazione del processo Main Electron, della Control Window React, dell'Output Window fullscreen senza bordi, e dell'IPC bidirezionale con `backgroundThrottling: false`.
- **Moduli Coinvolti**: `src/main/`, `src/preload/`, `src/renderer/control/`, `src/renderer/output/`
- **Stato**: 🟢 COMPLETED

### `MACRO-002`: Motori di Morphing Visuale Canvas 2D
- **Descrizione**: Sviluppo degli algoritmi di rendering morphing reattivi all'audio:
  - Liquid Morphing (`morphingCanvas.ts`)
  - Oniric Morphing (`oniricMorphingCanvas.ts`)
  - PsyHyp Morphing (`psyHypMorphingCanvas.ts`)
  - 2001 Slit-Scan Morphing (`slitScanCanvas.ts`)
- **Moduli Coinvolti**: `src/renderer/output/`
- **Stato**: 🟢 COMPLETED

### `MACRO-003`: Brain AI Pipeline & Coscienza Onirica Integration
- **Descrizione**: Creazione del sistema di continuos dream via Worker AI, integrazione di `coscienzaOnirica.ts` e `psichedel.ts`, condivisione della rotazione dei morphing fra story Brain e riduzione del bias architettonico nelle immagini.
- **Moduli Coinvolti**: `src/renderer/output/brain/`, `src/shared/brain/`
- **Stato**: 🟢 COMPLETED (Commit: `caf80a2`, `6664868`, `af6e3b0`, `b47757b6`, `2e8aed2`)

---

## 🟡 Macrotask In Corso (Attivi)

### `MACRO-004`: Sistema di Memoria Operativa e Piani di Lavoro (`working/`)
- **Descrizione**: Creazione ed organizzazione della cartella `working/` per persistere lo stato di task, macrotask e sessioni di lavoro, definire la metodologia dei Piani di Lavoro ed aggiornare le linee guida ufficiali in `agents.md`.
- **Moduli Coinvolti**: `working/`, `agents.md`
- **Stato**: 🟡 IN PROGRESS
- **Piano di Lavoro Riferimento**: `working/plans/piano-002-working-system-setup.md`

---

## ⚪ Macrotask Pianificati (Futuri)

### `MACRO-005`: Coalescenza IPC e Interpolazione Ritmica Locale (Fase 2)
- **Descrizione**: Eliminazione dell'accumulo di pacchetti arretrati in Output durante stalli WebGPU, implementazione coalescenza IPC con al più 1 messaggio unconfirmed e 1 pending sostituibile, protocollo ACK non bloccante e disaccoppiamento ingestione/proiezione in `BrainRhythmClock`.
- **Stato**: ⚪ PLANNED (Piano di Lavoro PRONTO in `working/plans/piano-003-coalescenza-ipc-interpolazione-ritmica.md`)

### `MACRO-006`: Profilazione Performance Live & Tuning Low Power Mode
- **Descrizione**: Test di stress prolungati per live set techno/ambient, ottimizzazione del rendering PsyHyp/Oniric sotto `lowPowerMode` e prevenzione memory-leak su Canvas 2D.
- **Stato**: ⚪ PLANNED

### `MACRO-006`: Preset Manager Avanzato & Snapshot Export
- **Descrizione**: Espansione del salvataggio dei preset colore/morphing e possibilità di importare/esportare profili live personalizzati.
- **Stato**: ⚪ PLANNED
