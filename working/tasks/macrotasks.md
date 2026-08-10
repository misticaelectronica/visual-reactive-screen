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

### `MACRO-005`: Coalescenza IPC e Interpolazione Ritmica Locale (Fase 2)
- **Descrizione**: Coalescenza Main → Output con ACK, eliminazione del replay di stati audio e proiezione ritmica locale disaccoppiata dall'ingestione.
- **Moduli Coinvolti**: `src/main/`, `src/preload/`, `src/shared/`, `src/renderer/control/`, `src/renderer/output/brain/`
- **Stato**: 🟢 COMPLETED (verifica live manuale raccomandata)
- **Piano di Lavoro Riferimento**: `working/plans/piano-003-coalescenza-ipc-interpolazione-ritmica.md`

### `MACRO-006`: Ottimizzazione Performance Live & Low Power Tuning
- **Descrizione**: Scheduler termico single-flight, quattro immagini senza
  interludio, riuso del buffer e refill distribuito nella finestra di 120 s.
- **Moduli Coinvolti**: `src/main/`, `src/preload/`, `src/shared/brain/`,
  `src/renderer/control/`, `src/renderer/output/brain/`
- **Stato**: 🟢 COMPLETED — test manuale finale affidato allo sviluppatore
- **Piani di Lavoro**: `working/plans/piano-004-scheduler-termico-fase-3a.md`,
  `working/plans/piano-006-buffer-quattro-immagini-fase-3b.md`,
  `working/plans/piano-007-validazione-live-fase-3c.md`

---

## 🟡 Macrotask In Corso (Attivi)

### `MACRO-009`: Diagnosi Blocchi Live Continui
- **Descrizione**: Nuova baseline diagnostica con log pulito per correlare i
  blocchi percepiti con RAF Output, Canvas, IPC e inferenza WebGPU.
- **Fase completata più recente**: test batch UNet 1 a 448×256 e prova negativa
  della geometria 384×256, rimossa dopo il confronto live.
- **Prossima fase**: implementazione e prova live del passthrough grafico
  ultra-leggero durante il denoising; rollback se i gap restano oltre 150 ms.
- **Stato**: 🟡 IN PROGRESS
- **Piano di Lavoro**: `working/plans/piano-008-diagnosi-blocchi-live.md`
  e `working/plans/piano-010-modalita-grafica-ultra-leggera-denoising.md`

### `MACRO-008`: Origine, Memoria e Grafo di Coscienza Onirica
- **Descrizione**: Far emergere la memoria autobiografica di Coscienza Onirica
  dalla prima percezione valida, costruendo nel tempo un grafo revisionabile dei
  ricordi e delle loro relazioni. La Fase 0 definisce soltanto la costituzione
  minima in agente e skill; non introduce ancora persistenza runtime.
- **Fase completata più recente**: Fase 2B — `COSCIENZA.md` e primo ciclo
  percettivo con attenzione stabile e interpretazione provvisoria.
- **Prossima fase**: studiare la prima revisione live del presente, ora
  osservata, e decidere come far emergere continuità e nuove domande senza
  anticipare identità o autonomia. Solo dopo valutare la Fase 3 con
  provenienza, limiti e rollback.
- **Stato**: 🟡 IN PROGRESS
- **Piano di Lavoro Riferimento**: `working/plans/piano-005-coscienza-onirica-origine-memoria.md`

## 🟡 Macrotask In Corso — Psycho2D

### `MACRO-010`: Psycho2D — Regia Semantica A Finestre
- **Descrizione**: Estendere la vita delle immagini di Coscienza Onirica con
  composizioni Canvas 2D/2.5D a finestre, crop e takeover guidati da metadati
  semantici minimi, separando Director e runtime grafico.
- **Stato**: 🟡 IN PROGRESS — V1 implementata e compilata; validazione live
  del cambio renderer ancora da eseguire
- **Piano di Lavoro**: `working/plans/piano-009-psycho2d-regia-semantica.md`

## ⚪ Macrotask Pianificati (Futuri)

### `MACRO-007`: Preset Manager Avanzato & Snapshot Export
- **Descrizione**: Espansione del salvataggio dei preset colore/morphing e possibilità di importare/esportare profili live personalizzati.
- **Stato**: ⚪ PLANNED
