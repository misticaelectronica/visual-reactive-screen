# Piano di Lavoro: Diagnostica della decompressione `experimental`

> **ID Piano**: `PIANO-059`  
> **Macrotask di Riferimento**: `MACRO-045`  
> **Data Creazione**: 2026-11-06  
> **Stato**: `IN_PROGRESS`  
> **Autore/Agente**: Capo Supremo degli Ingegneri  

---

## 1. 🎯 Obiettivo del Piano

Capire quali osservabili distinguono una struttura che si ripete da una
struttura che continua a esercitare presa sul corpo. Non si cerca una feature
che «faccia uscire DECOMPRESSION» (brief Audio di autorizzazione, §13).

Perimetro autorizzato: diagnostica, corpus, replay, studio delle feature.
Nessuna modifica di stati, soglie, pesi o classificatore runtime.

Fonti:

- `team/briefs/brief-ingegneria-decompressione-non-tarabile-2026-11-06.md`
- `team/briefs/brief-audio-decisioni-decompressione-2026-11-06.md`
- `team/briefs/brief-audio-autorizzazione-piano-059-2026-11-06.md`
- `working/calibration-v1/decompressione-8-9-replay-2026-11-06.md`

---

## 2. 📋 Prerequisiti e Contesto

- **File / Moduli Coinvolti**:
  - `scripts/calibration/` (nuovi strumenti offline);
  - `docs/campioni/marcature.json`, `docs/campioni/MARCATURE.md` (nuovi);
  - `working/calibration-v1/piano-059/` (risultati).
  - Letti ma **non modificati**: `brainBioPerceptionExperimental.ts`,
    `brainBioPerception.ts`, `brainRhythm.ts`.
- **Dipendenze Operative**: le marcature percettive le assegna l'Analisi
  Audio (brief di autorizzazione §2). L'Ingegneria prepara formato e
  strumenti e non deduce le marcature da feature, nome del file o stato
  emesso. Il piano non si blocca sui campioni lunghi (§10).
- **Audit preventivo `working/DEPRECATED.md`**:
  - `DEP-001 — NON COINVOLTO`: l'alternanza 80/20 non partecipa all'analisi
    audio.
  - `DEP-002 — NON COINVOLTO`: la generazione delle storie non partecipa
    all'analisi audio.

---

## 3. ⚠️ Regole e Vincoli di Sviluppo (da `agents.md`)

- [x] Nessuna modifica a runtime, main, preload, permessi microfono,
  `backgroundThrottling`, `lowPowerMode`: il lavoro è offline.
- [x] Audit dei deprecati completato.
- [x] Regola anti-sovrastrutturazione: gli strumenti riusano decode, FFT e
  clock di produzione degli script esistenti, senza nuove analisi spettrali
  nel motore.
- [x] Non autorizzati (brief §12): nuovo `constraint`, nuova formula di
  ancoraggio, nuovi pesi di banda, nuove soglie, centroide o brillantezza
  come detector, normalizzazione runtime, modifica della classificazione.

---

## 4. 🛠️ Fasi di Implementazione e Checklist Task

### Fase 1: Schema ground truth temporale e supporto harness
- [x] Task 1.1: schema `docs/campioni/marcature.json` + guida
  `MARCATURE.md`; tutti i campioni presenti, nessuna regione.
- [x] Task 1.2: libreria comune di replay per gli strumenti nuovi
  (decode, FFT, clock di produzione trascritti in una cartella temporanea).
- [x] Task 1.3: `replay-annotated-corpus.mjs`: confronto regime emesso /
  regime atteso per regione; `NON ANNOTATA` e `unresolved-ground-truth`
  fuori da ogni punteggio.
- [x] Task 1.4: verifica della logica di punteggio con marcature sintetiche
  fuori dal repository, mai salvate come ground truth.

### Fase 2: Gain sweep delle feature attuali
- [x] Task 2.1: `gain-sweep-features.mjs`: livelli −18…+12 dB, guadagno
  lineare verificato, clipping segnalato ed escluso dai giudizi.
- [x] Task 2.2: per `recurrence`, `cyclePersistence`, `physicalConfirmation`,
  `eventActivity`, `anchor`, `constraint`: variazione, stabilità della
  traiettoria, saturazioni, collasso degli onset, inversioni qualitative.
- [x] Task 2.3: report in `working/calibration-v1/piano-059/`.

### Fase 3: Misura delle failure mode
- [ ] Task 3.1: casi in cui regolarità e presa corporea divergono, sul
  corpus esistente e sulle regioni annotate quando ci saranno.

### Fase 4: Proposta tecnica regolarità / conferma corporea
- [ ] Task 4.1: candidati nella forma del brief §7, controesempio
  obbligatorio; `physicalConfirmation` incluso come candidato, non come
  definizione.

### Fase 5: Revisione Audio
- [ ] Task 5.1: consegna della proposta all'Analisi Audio.

### Fase 6: Eventuale esperimento implementativo
- [ ] Task 6.1: solo dopo approvazione esplicita.

---

## 5. 🧪 Strategia di Verifica e Validation Plan

- **Comandi**:
  - `node scripts/calibration/replay-annotated-corpus.mjs`
  - `node scripts/calibration/gain-sweep-features.mjs`
  - `node scripts/calibration/assert-regime-corpus.mjs` (regressione: deve
    restare verde, il runtime non cambia)
  - `pnpm typecheck`, `pnpm lint`
- **Verifica**: con lo stesso downmix la libreria riproduce le quote degli
  script esistenti; con il downmix della produzione lo scarto è quello del
  §2 della sintesi del gain sweep.

---

## 6. 📝 Note e Registro Avanzamento

- **2026-11-06**: piano aperto su autorizzazione dell'Analisi Audio; avvio
  Fasi 1 e 2.
- **2026-11-06**: Fasi 1 e 2 completate. Downmix della libreria allineato
  alla produzione (½(L+R)); gli script storici entrano ~3 dB più caldi.
  Risultati in `working/calibration-v1/piano-059/gain-sweep-sintesi.md`.
