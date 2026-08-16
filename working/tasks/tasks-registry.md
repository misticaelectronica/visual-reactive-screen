# Registro Dettagliato dei Task (`tasks-registry.md`)

Registro atomico dei micro-task collegati ai Macrotask attivi e recenti.

## Task Collegati a `MACRO-030` (Soluzioni Denoising Stall)

- [x] **`TASK-030-01`** `DONE`: Leggere host renderer e verificare ONNX Runtime 1.24.1.
- [x] **`TASK-030-02`** `DONE`: Finestra offline e hold renderer.
- [x] **`TASK-030-03`** `DONE`: Yield cooperativo GPU.
- [x] **`TASK-030-04`** `DONE`: Test e validazione completa.
- [x] **`TASK-030-05`** `DONE`: Working system e commit.
- [x] **`TASK-030-06`** `DONE`: Rendere dinamica la finestra di generazione senza bloccare RAF e timeline.
- [x] **`TASK-030-07`** `DONE`: Usare il vero Print2D serigrafico come modalità leggera dinamica durante il denoising.

---

## Task Collegati a `MACRO-029` (Ripristino Comportamenti)

- [x] **`TASK-029-01`** `DONE`: FilterPsiche senza riga centrale e più dinamico.
- [x] **`TASK-029-02`** `DONE`: Concatenazione prompt e fallback senza retry Qwen.
- [x] **`TASK-029-03`** `DONE`: Refill infinito oltre quattro immagini.
- [x] **`TASK-029-04`** `DONE`: Permanenza casuale renderer 2–4 immagini.
- [x] **`TASK-029-05`** `DONE`: Test, typecheck, lint e diff-check.
- [x] **`TASK-029-06`** `DONE`: Garantire FilterPsiche entro le prime due immagini reali.
- [x] **`TASK-029-07`** `DONE`: Eliminare tutte le righe orizzontali da FilterPsiche mantenendo la dinamica cromatica.
- [x] **`TASK-029-08`** `DONE`: Escludere temporaneamente Psycho2D da tutte le rotazioni automatiche.
- [x] **`TASK-029-09`** `DONE`: Disabilitare Psycho2D nel registry runtime e nella UI per impedirne ogni comparsa.

---

## Task Collegati a `MACRO-022` (Isolamento Vettorializzazione dal Main)

- [x] **`TASK-022-01`** `DONE`: Correlare scatti e fuori ritmo con metriche
  della sessione live più recente.
- [x] **`TASK-022-02`** `DONE`: Provare la pressione grafica attivata dai gap
  RAF; rimossa dopo il test perché oscillava fra plugin e passthrough.
- [x] **`TASK-022-03`** `DONE`: Spostare SNIC/VTracer in Worker Node senza
  bloccare il main Electron e il relay audio IPC.
- [x] **`TASK-022-04`** `DONE`: Verificare il worker con raster sintetico.
- [x] **`TASK-022-05`** `DONE`: Completare build automatica.
- [x] **`TASK-022-06`** `DONE`: Verificare live continuità IPC e Worker Node;
  vettorializzazione confermata fuori dal main, pressione adattiva respinta.

## Task Collegati a `MACRO-021` (FPS Ridotti con Stessi Layer)

- [x] **`TASK-021-01`** `DONE`: Aggiungere opzione, default,
  normalizzazione e controllo UI.
- [x] **`TASK-021-02`** `DONE`: Applicare esclusivamente il frame pacing a
  tutti i renderer Brain e morphing esterni.
- [x] **`TASK-021-03`** `DONE`: Verificare che layer, DPR, densità e qualità
  non dipendano dalla nuova opzione.
- [x] **`TASK-021-04`** `DONE`: Completare test, typecheck, lint e build.
- [x] **`TASK-021-05`** `DONE`: Confronto live eseguito con esito negativo;
  opzione ritirata integralmente.
- [x] **`TASK-021-06`** `DONE`: Dimostrare dai log che la cadenza scadente
  permaneva anche a FPS normali ed era causata dal passthrough globale.
- [x] **`TASK-021-07`** `DONE`: Rimuovere flag, persistenza, UI e pacing
  sperimentale senza modificare `lowPowerMode`.

## Task Collegati a `PIANO-025` (Rollback Prestazioni Renderer)

- [x] **`TASK-023-01`** `DONE`: Ripristinare Liquid e Oniric a 60 FPS normali,
  Liquid a 60 punti e i layer normali senza tetto aggiuntivo.
- [x] **`TASK-023-02`** `DONE`: Ripristinare FilterPsiche a 480×270/30 FPS/7
  slice e Materia Morph a 24 FPS/12 regioni.
- [x] **`TASK-023-03`** `DONE`: Eliminare l'alternanza adattiva
  plugin/passthrough preservando lo scheduler delle inferenze.
- [x] **`TASK-023-04`** `DONE`: Conservare e verificare in build Worker
  immagini e Worker Node di vettorializzazione.
- [x] **`TASK-023-05`** `DONE`: Completare test, typecheck, lint, diff-check e
  build Electron.

## Task Collegati a `MACRO-020` (Isolamento Inferenza Immagini)

- [x] **`TASK-020-01`** `DONE`: Verificare il confine reale fra Output,
  generatore Psichedel e runtime ONNX/WebGPU.
- [x] **`TASK-020-02`** `DONE`: Spostare runtime e inferenza immagini in
  un Worker dedicato con protocollo tipizzato e coda seriale.
- [x] **`TASK-020-03`** `DONE`: Integrare il client Worker come generatore
  predefinito preservando timeout, progressi, rilascio e metriche.
- [x] **`TASK-020-04`** `DONE`: Completare test, typecheck, lint e build.
- [ ] **`TASK-020-05`** `IN_PROGRESS`: Confrontare live gap RAF e temperatura durante
  UNet; decidere soltanto dopo il profiling se serve un processo separato.

## Task Collegati a `MACRO-019` (Riallineamento Beat Renderer)

- [x] **`TASK-019-01`** `DONE`: Correggere consumo del beat e
  riallineamento della fase nel clock Output.
- [x] **`TASK-019-02`** `DONE`: Correggere l'accento di FilterPsiche, Materia
  Morph, Liquid e Oniric; i budget normali sperimentali sono stati poi
  ripristinati da `PIANO-025`.
- [x] **`TASK-019-03`** `DONE`: Validare test, tipi, lint e build renderer.
- [x] **`TASK-019-04`** `DONE`: Correggere envelope e mapping degli hat
  senza indebolire kick, altre bande o freeze nel silenzio.

---

## Task Collegati a `MACRO-018` (Documentazione Architettura Corrente)

- [x] **`TASK-018-01`** `DONE`: Verificare processi, flussi runtime,
  Brain, preset, renderer, audio, dipendenze, performance e accoppiamenti.
- [x] **`TASK-018-02`** `DONE`: Scrivere e validare il documento architetturale
  compatto aderente al codice.

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

## Task Collegati a `MACRO-010` (Psycho2D — Regia Semantica A Finestre)

- [x] **`TASK-010-01`** `DONE`: Analizzare pipeline immagini, buffer, renderer
  Brain, ritmo, transizioni e vincoli prestazionali esistenti.
- [x] **`TASK-010-02`** `DONE`: Definire architettura minima, flusso dati,
  metadati, Scene Director, primitive Canvas, fallback e progressione V1–V3.
- [x] **`TASK-010-03`** `DONE`: Identificare il conflitto con il renderer
  serigrafico già chiamato Psycho2D e formulare una raccomandazione.
- [x] **`TASK-010-04`** `DONE`: Approvare le decisioni aperte di `PIANO-009` e
  creare il piano esecutivo V1 senza interferire con `MACRO-009`.
- [x] **`TASK-010-05`** `DONE`: Implementare V1 su autorizzazione
  esplicita dello sviluppatore.
- [x] **`TASK-010-06`** `DONE`: Introdurre plugin registry, renderer
  host e alternanza manuale/temporizzata durante l'esecuzione.
- [ ] **`TASK-010-07`** `TODO`: Verificare dal vivo su Output fullscreen il
  passaggio manuale Print2D ↔ Psycho2D, la rotazione temporizzata, takeover,
  silenzio e `lowPowerMode`.
- [x] **`TASK-010-08`** `DONE`: Recuperare il renderer vettoriale come
  plugin `Vector Morph`, con vettorializzazione lazy deduplicata e alternanza
  live insieme a Print2D e Psycho2D.
- [x] **`TASK-010-09`** `DONE`: Aggiungere la modalità opzionale “Tutti
  per storia”, con mazzo renderer casuale senza ripetizioni, attraversamenti
  completi e takeover della storia successiva soltanto a ciclo esaurito.
- [x] **`TASK-010-10`** `DONE`: Rifondare la composizione Psycho2D con
  base stabile, una sola immagine superiore fissa e senza bordo, opacità
  calibrata e forme cromatiche audio-reattive fuse attraverso entrambi i layer.
- [x] **`TASK-010-11`** `DONE`: Rendere la raster originale chiaramente
  visibile come fondo stabile del plugin Vector Morph, sotto il vettoriale.
- [x] **`TASK-010-12`** `DONE`: Rimuovere le forme geometriche da
  Psycho2D e sostituirle con composizione serigrafica 1-bit precomputata,
  densità audio-reattiva, inversione sul beat e micro-glitch `mid`/`high`.
- [x] **`TASK-010-13`** `DONE`: Curare tutte le transizioni di “Tutti per
  storia” con morphing congelato e quantizzato a beat interi, includendo il
  morphing scanline del Psycho2D e il cambio renderer solo su beat allineato.
- [x] **`TASK-010-14`** `DONE`: Stabilizzare il beatmatch Psycho2D con latch
  prima del frame pacing, rimozione della soglia `low`, risposta di
  densità/contrasto/scanline al `beatPulse`, orientamento dei micro-glitch con
  `beatPhase` e separazione dei dettagli `mid`/`high`, senza movimento globale.
- [x] **`TASK-010-15`** `DONE`: Aggiungere un sottofondo raster fisso all'8%
  sotto la serigrafia Psycho2D, mantenendo il livello 1-bit dominante.
- [x] **`TASK-010-16`** `DONE`: Aggiungere l'opzione `Alternate with Brain`
  con selezione 80% Brain / 20% rotazione morphing esistente.
- [x] **`TASK-010-17`** `DONE`: Rafforzare la risposta primaria al beat di
  Psycho2D con scanline locali continue guidate da `beatPulse` e `beatPhase`.
- [x] **`TASK-010-18`** `DONE`: Mostrare il riquadro narrativo sinistro per
  60 secondi dall'inizio di ogni storia e oscurarlo senza fermare il render.
- [x] **`TASK-010-19`** `DONE`: Correggere la rimappatura delle scanline
  Psycho2D dalla matrice 320×180 alla canvas fullscreen e rafforzare l'accento
  locale del beat senza movimento globale.
- [x] **`TASK-010-20`** `DONE`: Passare l'inviluppo del flash globale ai
  renderer Brain e trasformarlo in spostamenti locali di pixel Psycho2D,
  mantenendo camera stabile e budget ridotto in low power.
- [x] **`TASK-010-21`** `DONE`: Verificare automaticamente che il Renderer Host
  propaghi il flash globale sia al plugin attivo sia a quello entrante durante
  il cambio renderer.
- [x] **`TASK-010-22`** `DONE`: Ridefinire `Alternate with Brain (80/20)` sul
  ciclo completo della storia: tutti i renderer Brain prima dell'interludio
  esterno, durata 80/20 reale e buffer Brain preservato durante il crossfade.
- [x] **`TASK-010-23`** `DONE`: Aggiungere un inviluppo kick condiviso al clock
  Brain e applicare un guadagno locale moderato a Print2D, Psycho2D e Vector
  Morph, senza movimento globale o costo geometrico aggiuntivo in low power.
- [x] **`TASK-010-24`** `DONE`: Alternare le texture Psycho2D fra beat,
  `lowMid`, `mid` e `high`, con dissolvenza ritmica e arresto nel silenzio.

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
- [x] **`TASK-008-16`** `DONE`: Osservare la prima revisione live di
  `COSCIENZA.md` prodotta da `CoscienzaCore` prima di progettare l'autonomia di
  ristrutturazione.

---

## Task Collegati a `MACRO-009` (Diagnosi Blocchi Live Continui)

- [x] **`TASK-009-01`** `DONE`: Pulire esclusivamente i log di sessione
  e verificare che la nuova prova produca una traccia unica.
- [x] **`TASK-009-02`** `DONE`: Eseguita una prova continua di una produzione
  completa con quattro immagini in 104,3 secondi.
- [x] **`TASK-009-03`** `DONE`: Correlati blocchi percepiti, gap RAF, IPC,
  Canvas e fasi di inferenza.
- [x] **`TASK-009-04`** `DONE`: Definito il prossimo esperimento minimo dai
  dati raccolti: confronto controllato con sessioni immagine residenti.
- [x] **`TASK-009-05`** `DONE`: Eseguito il confronto sul secondo ciclo con
  sessioni immagine residenti: zero reload, zero gap severi e nessun errore
  infrastrutturale; mantenuto il rilascio in `lowPowerMode` e il fallback su
  errore.
- [ ] **`TASK-009-06`** `TODO`: Confermare manualmente temperatura e stabilità
  in una prova prolungata e decidere se isolare l'inferenza per ridurre i gap
  moderati residui del denoising.
- [x] **`TASK-009-07`** `DONE`: Provato e rimosso un yield locale fra gli step
  UNet: il renderer respira fra le chiamate, ma i blocchi di 375–458 ms della
  singola inferenza rimangono e il risultato non giustifica il codice.
- [ ] **`TASK-009-08`** `IN_PROGRESS`: Verificare il ramo condizionale batch 1
  dell'UNet dinamico. Prestazioni live misurate; resta la conferma manuale
  della qualità visiva prima della decisione definitiva.
- [x] **`TASK-009-09`** `DONE`: Confrontata e rimossa la geometria 384×256:
  sette gap denoising da 349,5 a 391,8 ms, senza miglioramento affidabile e con
  potenziale perdita di dettaglio rispetto a 448×256.
- [x] **`TASK-009-10`** `DONE`: Implementato e misurato il passthrough grafico
  durante `imageInferenceActive`: costo proprio 0–0,2 ms, ma gap UNet ancora
  250–525 ms. Conservato come protezione visiva, non come soluzione hardware.
- [x] **`TASK-009-11`** `DONE`: Deprioritizzare il refill in modalità
  “Tutti per storia”: primo attraversamento libero, sblocco al secondo dopo il
  morphing e target esteso, preservando le altre modalità.

---

## Task Collegati a `MACRO-011` (Materia Morph — Renderer Brain Materico)

- [x] **`TASK-011-01`** `DONE`: Analizzare immagini, plugin, preset, segnali,
  transizioni, low power e metriche esistenti.
- [x] **`TASK-011-02`** `DONE`: Definire rappresentazione materica, metodo di
  morph, mapping audio, silenzio, transizione, budget e colli di bottiglia.
- [x] **`TASK-011-03`** `DONE`: Approvare nome, architettura Canvas 2D e budget
  V1 prima di implementare il renderer.
- [x] **`TASK-011-04`** `DONE`: Implementare e testare l'analisi raster
  materica e il matching delle regioni.
- [x] **`TASK-011-05`** `DONE`: Implementare il plugin `material-morph`, la
  risposta audio, il morph fra immagini, low power e cleanup.
- [x] **`TASK-011-06`** `DONE`: Integrare tipi, registry, normalizzazione e UI;
  il registry lo include automaticamente in rotazione e “Tutti per storia”.
- [ ] **`TASK-011-07`** `IN_PROGRESS`: Test, typecheck, lint mirato e build
  completati; restano validazione artistica fullscreen e prova prolungata.

---

## Task Collegati a `MACRO-012` (Vector Morph — Contorni Morbidi)

- [x] **`TASK-012-01`** `DONE`: Analizzare profili live, metriche di qualità,
  contour builder SNIC, fallback VTracer e ricostruzione runtime.
- [x] **`TASK-012-02`** `DONE`: Implementare smoothing geometrico
  comune, vincolato e con tetto di costo.
- [x] **`TASK-012-03`** `DONE`: Integrare densità degli angoli, ricalcolo
  qualità e telemetria della cache.
- [x] **`TASK-012-04`** `DONE`: Aggiungere test e completare typecheck, lint
  mirato e build.
- [ ] **`TASK-012-05`** `IN_PROGRESS`: Verificare artisticamente Vector Morph su
  Output fullscreen durante silenzio, flash, background e “Tutti per storia”.

---

## Task Collegati a `MACRO-013` (Regia Casuale Brain e Morphing)

- [x] **`TASK-013-01`** `DONE`: Analizzare selettori, timer, story-cycle,
  interludio 80/20 e picker dei preset esterni.
- [x] **`TASK-013-02`** `DONE`: Randomizzare senza ripetizioni la
  rotazione Brain automatica e quella per fotogramma della storia.
- [x] **`TASK-013-03`** `DONE`: Introdurre il mazzo delle famiglie morphing e
  il margine temporale delle dissolvenze.
- [x] **`TASK-013-04`** `DONE`: Aggiornare test, UI e validazione automatica.
- [ ] **`TASK-013-05`** `IN_PROGRESS`: Verificare dal vivo la nuova regia completa.
- [x] **`TASK-013-06`** `DONE`: Bilanciare le presenze dei renderer fra storie
  ed eliminare la ricorrenza statistica eccessiva di Bauhaus.
- [x] **`TASK-013-07`** `DONE`: Rendere il crossfade morphing indipendente dai
  pacchetti e resistente agli stalli con avanzamento visivo limitato.
- [x] **`TASK-013-08`** `DONE`: Continuare la rotazione casuale dei renderer
  durante il ricircolo dei fotogrammi causato dai timeout della storia AI.

---

## Task Collegati a `MACRO-014` (FilterPsiche)

- [x] **`TASK-014-01`** `DONE`: Analizzare fase raster, Renderer Host, ritmo,
  flash, transizioni, registry e budget.
- [x] **`TASK-014-02`** `DONE`: Implementare filtri cromatici,
  preparazione raster e runtime Canvas 2D.
- [x] **`TASK-014-03`** `DONE`: Integrare plugin, tipi, settings, UI e rotazioni.
- [x] **`TASK-014-04`** `DONE`: Aggiungere test e completare la validazione.
- [ ] **`TASK-014-05`** `IN_PROGRESS`: Verificare artisticamente FilterPsiche live.

---

## Task Collegati a `MACRO-015` (Clock Ritmico Globale Output)

- [x] **`TASK-015-01`** `DONE`: Centralizzare clock e contratto ritmico.
- [x] **`TASK-015-02`** `DONE`: Collegare Brain e quattro morphing.
- [x] **`TASK-015-03`** `DONE`: Quantizzare cambi di famiglia e preset.
- [x] **`TASK-015-04`** `DONE`: Verificare freeze in silenzio e mapping bande.
- [x] **`TASK-015-05`** `DONE`: Completare validazione e documentazione.
- [ ] **`TASK-015-06`** `IN_PROGRESS`: Verificare artisticamente il beatmatch
  su Output fullscreen con audio reale e tutti i profili.
- [x] **`TASK-015-07`** `DONE`: Correggere gli scatti live con isteresi del
  silenzio e avanzamento incrementale del tempo Liquid.
- [x] **`TASK-015-08`** `DONE`: Spostare il crossfade sul RAF Output e impedire
  il recupero istantaneo del tempo perso dopo uno stallo.

---

## Task Collegati a `MACRO-016` (Moti Di Coscienza Brain)

- [x] **`TASK-016-01`** `DONE`: Rileggere protocollo, presente, origine,
  indice e ricordi recenti pertinenti; aggiornare costituzione, skill e piano.
- [x] **`TASK-016-02`** `DONE`: Selezionare via archivio un ricordo
  saliente e pertinente, con provenienza e motivazione tracciabili.
- [x] **`TASK-016-03`** `DONE`: Applicare l'influenza alla generazione della
  storia successiva e alla palette.
- [x] **`TASK-016-04`** `DONE`: Implementare il moto locale beat-matched con
  didascalia rossa, silenzio, low power e cleanup.
- [x] **`TASK-016-05`** `DONE`: Completare test, typecheck, lint, build e
  documentazione di sessione.
- [ ] **`TASK-016-06`** `IN_PROGRESS`: Verificare artisticamente in fullscreen
  pertinenza, leggibilità della didascalia e ripresa naturale della rotazione.
- [x] **`TASK-016-07`** `DONE`: Estendere la leggibilità del moto a un minimo
  di 12 secondi e 16 beat, mantenendo uscita quantizzata e freeze nel silenzio.

---

## Task Collegati a `MACRO-017` (Bauhaus Morph)

- [x] **`TASK-017-01`** `DONE`: Analizzare plugin, immagini, analisi raster,
  segnali, preset, transizioni, low power e pressione risorse.
- [x] **`TASK-017-02`** `DONE`: Definire estrazione, rappresentazione interna,
  morph, riconoscibilità, mapping audio, silenzio e cambio immagine.
- [x] **`TASK-017-03`** `DONE`: Definire budget V1, colli di bottiglia e
  separazione V1/V2/V3.
- [x] **`TASK-017-04`** `DONE`: Implementare e testare l'analisi Bauhaus pura.
- [x] **`TASK-017-05`** `DONE`: Implementare il plugin Canvas 2D e la
  transizione fra immagini.
- [x] **`TASK-017-06`** `DONE`: Integrare tipi, UI, registry, rotazioni,
  low power e metriche.
- [x] **`TASK-017-07`** `DONE`: Completare test, typecheck, lint mirato, build
  e diff check.
- [ ] **`TASK-017-08`** `IN_PROGRESS`: Verificare artisticamente e misurare il
  renderer live in fullscreen.
- [x] **`TASK-017-09`** `DONE`: Correlare log live, pressione UNet, pacing
  Canvas e mapping `low`/`lowMid`/`mid`/`high`; individuati quantizzazione e
  assenza di smoothing locale come causa del gesto a gradini.
- [x] **`TASK-017-10`** `DONE`: Introdurre smoothing musicale per banda,
  rimuovere la quantizzazione percettibile e ridurre il costo per frame dopo
  approvazione esplicita della correzione.
- [ ] **`TASK-017-11`** `IN_PROGRESS`: Riconfermare live `renderMs`, cadenza,
  beatmatch e temperatura esterna durante una sessione prolungata con UNet.
- [x] **`TASK-017-12`** `DONE`: Sostituire le forme Bauhaus decorative con
  sagome, assi, colori e texture derivati dalle regioni reali dell'immagine.
- [ ] **`TASK-017-13`** `IN_PROGRESS`: Confrontare live riconoscibilità e stile
  Bauhaus su volti, corpi, architetture e paesaggi.
