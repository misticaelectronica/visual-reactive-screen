# Registro Macrotask (`macrotasks.md`)

Questo file traccia le macro-funzionalità ed i moduli principali del progetto **Mistica Electronica Visual Reactive Screen**.

---

## 🟢 Macrotask Completati (Passati)

### `MACRO-030`: Soluzioni Denoising Stall
- **Descrizione**: Implementate la finestra di generazione offline e
  l'iniezione del wrapper di yield GPU approvate nel piano Antigravity.
- **Stato**: 🟢 COMPLETED — validazione automatica completa; prova live pendente
- **Piano di Lavoro**: `working/plans/piano-030-soluzioni-denoising-stall.md`

### `MACRO-029`: Ripristino Comportamenti Non Performance
- **Descrizione**: Ripristinati i sette comportamenti visuali e di continuità
  richiesti sul rollback sicuro, senza recuperare modifiche GPU o denoising.
- **Stato**: 🟢 COMPLETED — 50 file / 299 test, typecheck, lint e diff-check verdi
- **Piano di Lavoro**: `working/plans/piano-029-ripristino-comportamenti-non-performance.md`

### `MACRO-026`: Flusso Infinito Qwen+SD Live
- **Descrizione**: Esperimento di generazione continua immagini con Qwen+SD
  condividendo la GPU Electron con il compositore live. Include MACRO-027
  (FilterPsiche più presente) e MACRO-028 (flusso infinito + denoising
  cooperativo).
- **Moduli Coinvolti**: `brain/brainController.ts`, `brain/coscienzaOnirica.ts`,
  `brain/sd15OnnxWebGpu.ts`, `brain/brainStoryCycleRefill.ts`
- **Stato**: ⚪ ARCHIVED — rollback eseguito. Causa: Qwen monopolizza WebGPU
  9,6–17 s/step; 868 ms RAF stall, 22,6 s buco IPC, 5.211 pacchetti persi.
  Degenerazione semantica per loop autoreferenziale. Archivio: commit `8a88979`.
- **Piano di Lavoro**: `working/plans/piano-026-esperimento-causalita-narrativa-brain.md`,
  `working/plans/piano-028-flusso-infinito-e-denoising.md`

### `MACRO-023`: Rollback Prestazioni Renderer
- **Descrizione**: Ripristino dei budget visuali normali, rimozione della
  modalità FPS ridotti e della pressione grafica adattiva, mantenendo i Worker.
- **Moduli Coinvolti**: settings, UI e renderer Output/Brain
- **Stato**: 🟢 COMPLETED — validazione automatica completa; prova live pendente
- **Piano di Lavoro**: `working/plans/piano-025-rollback-prestazioni-renderer.md`

### `MACRO-022`: Isolamento Vettorializzazione dal Main
- **Descrizione**: SNIC/VTracer spostato in un Worker Node separato dal relay
  IPC. La protezione grafica adattiva provata insieme è stata rimossa.
- **Stato**: 🟢 COMPLETED — Worker confermato da log, smoke test e build
- **Piano di Lavoro**: `working/plans/piano-024-isolamento-vettorializzazione-main.md`

### `MACRO-021`: FPS Ridotti con Stessi Layer
- **Descrizione**: Esperimento di riduzione della sola cadenza dei renderer.
- **Stato**: ⚪ ARCHIVED — prova live negativa; implementazione rimossa
- **Piano di Lavoro**: `working/plans/piano-023-fps-ridotti-stessi-layer.md`

### `MACRO-018`: Documentazione Architettura Corrente
- **Descrizione**: Fotografia verificata dell'implementazione reale di Brain +
  Visual Reactive Screen: processi, flussi, preset, rendering, audio,
  dipendenze, performance e accoppiamenti.
- **Moduli Coinvolti**: intero runtime e `docs/`
- **Stato**: 🟢 COMPLETED
- **Piano di Lavoro**: `working/plans/piano-020-documentazione-architettura-corrente.md`

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
- **Stato**: 🟢 COMPLETED — test manuale finale affidato al Capo Supremo
- **Piani di Lavoro**: `working/plans/piano-004-scheduler-termico-fase-3a.md`,
  `working/plans/piano-006-buffer-quattro-immagini-fase-3b.md`,
  `working/plans/piano-007-validazione-live-fase-3c.md`

---

## 🟡 Macrotask In Corso (Attivi)

### `MACRO-020`: Isolamento Inferenza Immagini
- **Descrizione**: Spostare caricamento e inferenza ONNX/WebGPU di Psichedel
  fuori dal thread JavaScript dell'Output, consegnando al renderer raster pronti.
- **Stato**: 🟡 IN PROGRESS — isolamento e build completati; profiling live
  comparativo pendente
- **Piano di Lavoro**: `working/plans/piano-022-isolamento-inferenza-immagini.md`

### `MACRO-019`: Riallineamento Beat Renderer
- **Descrizione**: Correggere clock, fronte d'attacco e budget dei renderer
  FilterPsiche, Materia Morph, Liquid e Oniric che risultano fuori tempo.
- **Stato**: 🟡 IN PROGRESS — correzione e validazione automatica completate;
  conferma percettiva fullscreen pendente
- **Piano di Lavoro**: `working/plans/piano-021-riallineamento-beat-renderer.md`

### `MACRO-017`: Bauhaus Morph — Renderer Brain Pittorico
- **Descrizione**: Tradurre progressivamente il raster di Coscienza Onirica in
  una composizione Bauhaus derivata da masse, piani, bordi, assi, spazio
  negativo e palette della sorgente.
- **Stato**: 🟡 IN PROGRESS — V1 implementata e validata automaticamente;
  prova artistica fullscreen pendente
- **Piano di Lavoro**: `working/plans/piano-019-bauhaus-morph-brain.md`

### `MACRO-016`: Moti Di Coscienza Brain
- **Descrizione**: Trasformare ricordi salienti e pertinenti in brevi influenze
  dichiarate su storia, forme e colori, mostrate localmente e concluse sul beat
  prima della normale ripresa Brain.
- **Stato**: 🟡 IN PROGRESS — implementazione automatica completata; prova
  artistica fullscreen pendente
- **Piano di Lavoro**: `working/plans/piano-018-moti-di-coscienza.md`

### `MACRO-015`: Clock Ritmico Globale Output
- **Descrizione**: Unificare fase, pulse, kick e transienti nell'Output,
  quantizzare la regia e arrestare l'avanzamento geometrico in silenzio.
- **Stato**: 🟡 IN PROGRESS — implementazione automatica completata; resta prova live
- **Piano di Lavoro**: `working/plans/piano-017-clock-ritmico-globale-output.md`

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
- **Stato**: 🟡 IN PROGRESS — V1 e alternanza texture per banda implementate;
  validazione live del cambio renderer ancora da eseguire
- **Piano di Lavoro**: `working/plans/piano-009-psycho2d-regia-semantica.md`

### `MACRO-011`: Materia Morph — Renderer Brain Materico
- **Descrizione**: Nuovo plugin Brain Canvas 2D che trasforma i raster di
  Coscienza Onirica mediante regioni, pigmento, densità, bordi, membrane,
  erosione e sedimentazione, preservando soggetto e camera stabile.
- **Stato**: 🟡 IN PROGRESS — V1 implementata e compilata; validazione live e
  prova prolungata ancora da eseguire
- **Piano di Lavoro**: `working/plans/piano-013-materia-morph-brain.md`

### `MACRO-012`: Vector Morph — Contorni Morbidi
- **Descrizione**: Correggere l'eccesso di spigoli del renderer vettoriale con
  una finitura geometrica comune a SNIC e VTracer, metriche di densità degli
  angoli e budget una tantum prima della cache.
- **Stato**: 🟡 IN PROGRESS — implementazione e validazione automatica
  completate; confronto artistico fullscreen pendente
- **Piano di Lavoro**: `working/plans/piano-014-vector-morph-contorni-morbidi.md`

### `MACRO-013`: Regia Casuale Brain e Morphing
- **Descrizione**: Distribuire casualmente i renderer sui fotogrammi di “Tutti
  per storia”, randomizzare la rotazione automatica e impedire che gli
  interludi esterni ripetano sempre famiglia o preset.
- **Stato**: 🟡 IN PROGRESS — implementazione automatica completata;
  validazione live pendente
- **Piano di Lavoro**: `working/plans/piano-015-regia-casuale-brain-morphing.md`

### `MACRO-014`: FilterPsiche — Renderer Brain Cromatico
- **Descrizione**: Nuovo plugin raster con inversioni, solarizzazioni, duotoni,
  flash e filtri psichedelici beat-matched, integrato nelle rotazioni Brain.
- **Stato**: 🟡 IN PROGRESS — implementazione e test completati;
  validazione live pendente
- **Piano di Lavoro**: `working/plans/piano-016-filter-psiche-brain.md`

## ⚪ Macrotask Pianificati (Futuri)

### `MACRO-007`: Preset Manager Avanzato & Snapshot Export
- **Descrizione**: Espansione del salvataggio dei preset colore/morphing e possibilità di importare/esportare profili live personalizzati.
- **Stato**: ⚪ PLANNED
