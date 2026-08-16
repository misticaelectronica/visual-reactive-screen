# Storico delle Sessioni di Lavoro (`session-history.md`)

Registro cronologico delle sessioni di sviluppo e manutenzione per **Mistica Electronica Visual Reactive Screen**.

---

## 📜 Sessioni Passate

### `SESSION-2026-08-16-32`
- **Data**: 16 Agosto 2026 — CEST
- **Obiettivo**: Ripristinare la dinamicità durante il denoising senza eliminare
  il coordinatore di generazione.
- **Causa**: ritorno anticipato nel RAF durante l'intera finestra; timeline,
  beat, transizioni e plugin venivano fermati. Il nero iniziale non aveva ancora
  un fotogramma da mantenere.
- **Correzione**: RAF sempre attivo; passthrough one-bit audio-reattivo a 20 FPS,
  plugin pieno campionato a 5 FPS, renderer nuovi sincronizzati allo stato della
  generazione e ritorno continuo alla qualità piena.
- **Validazione**: 52 file / 306 test, typecheck, lint, diff-check e bundle
  Vite/Electron verdi. Conferma percettiva live pendente.

### `SESSION-2026-08-16-31`
- **Data**: 16 Agosto 2026 — CEST
- **Obiettivo**: Correggere la mancata visibilità dei comportamenti MACRO-029.
- **Causa**: FilterPsiche era garantito fra i primi quattro renderer del mazzo,
  ma le permanenze 2–4 di Materia/Vector potevano consumare tutte le quattro
  immagini prima di raggiungerlo.
- **Correzione**: FilterPsiche compare nella prima immagine, oppure nella
  seconda dopo una chiusura precedente su FilterPsiche; Psycho2D resta singolo.
- **Validazione**: 52 file / 306 test, typecheck, lint, diff-check e bundle
  Vite/Electron verdi.

### `SESSION-2026-08-16-30`
- **Data**: 16 Agosto 2026 — CEST
- **Obiettivo**: Eseguire fedelmente il piano Antigravity approvato per gli
  stall del denoising.
- **Implementazione**: finestra offline single-flight con hold del renderer e
  della timeline; wrapper del device WebGPU con fence e micro-yield da 4 ms.
- **Invarianti**: nessun cambio a step, seed, qualità, risoluzione, camera,
  beatmatch o low power.
- **Validazione**: 52 file / 305 test, typecheck, lint, diff-check e build
  Electron arm64 completa con ZIP e DMG.
- **Stato Finale**: implementazione conclusa; misurazione live RAF pendente.

### `SESSION-2026-08-16-29`
- **Data**: 16 Agosto 2026 — CEST
- **Obiettivo**: Ripristinare esclusivamente sette comportamenti non performance
  sopra la baseline sicura successiva al rollback MACRO-026.
- **Implementazione**: concatenazione osservazione/stimolo/residuo, fallback
  locale con una sola chiamata Qwen, refill continuo, permanenze casuali 2–4
  immagini e FilterPsiche più presente senza slice centrale.
- **Perimetro preservato**: backend, denoising, residenza modelli, qualità,
  risoluzione, cooldown, frame pacing e low power invariati.
- **Validazione**: 50 file / 299 test, typecheck, lint e diff-check verdi.
- **Stato Finale**: completato; prova percettiva fullscreen raccomandata.

### `SESSION-2026-08-16-ROLLBACK-026`
- **Data**: 16 Agosto 2026 — 18:22 CEST
- **Obiettivo**: Rollback MACRO-026 — ritiro esperimento flusso infinito Qwen+SD live
- **Attività Svolte**:
  - Analisi log live: 18/36 finestre con RAF stall >100 ms, picco 868 ms,
    buco IPC 22,6 s, 5.211 pacchetti persi.
  - Diagnosi definitiva: incompatibilità strutturale — Qwen monopolizza WebGPU
    9,6–17 s per step, non interrompibile. Il yield da 48 ms non è sufficiente.
  - Commit di archivio `8a88979` del lavoro MACRO-026/028 sul branch
    `feature/brain-dream-causality-experiment`.
  - Rollback al commit baseline `e21fddb` con commit `e21a355`.
  - Typecheck pulito sulla baseline ripristinata.
  - Aggiornamento working system (STATE, macrotasks, session-history).
- **Stato Finale**: baseline ripristinata, working tree pulito, typecheck verde.
- **Prossima Direzione**: generazione immagini affidata a processo/macchina esterna;
  durante la performance usare esclusivamente buffer già pronti.



### `SESSION-2026-07-27-01`
- **Data**: 27 Luglio 2026
- **Obiettivo**: Continuous Brain Dream Pipeline & Stability
- **Attività Svolte**:
  - Implementata la generazione continua delle storie dream nel Brain AI Worker.
  - Mitigato il bias architettonico nelle immagini.
  - Sincronizzata la rotazione condivisa dei morphing tra i dream.
  - Risolto il blocco della generazione (stalled Brain story recovery).
- **Esito**: 🟢 Completata con successo.

### `SESSION-2026-07-29-01`
- **Data**: 29 Luglio 2026
- **Obiettivo**: Integrazione Psichedel & Coscienza Onirica
- **Attività Svolte**:
  - Aggiornamento dei moduli `psichedel.ts` e `coscienzaOnirica.ts`.
  - Refactoring e ottimizzazione dei parametri di reattività psichedelica.
- **Esito**: 🟢 Completata con successo (Commit: `caf80a2`).

---

## 📜 Sessioni Completate

### `SESSION-2026-08-04-01`
- **Data**: 04 Agosto 2026 - Ore 23:58 (CEST)
- **Agente / Dev**: Agente AI Antigravity & Developer
- **Obiettivo**: Creazione ed infrastrutturazione della cartella `working/` e formalizzazione della metodologia Piani di Lavoro in `agents.md`.
- **Attività Svolte**:
  1. Creata la cartella `working/` con le sottodirectory `plans/`, `tasks/`, `sessions/`.
  2. Generati i file di memoria di stato `STATE.md`, `macrotasks.md` e `tasks-registry.md`.
  3. Creato il template di piano di lavoro `template-piano-di-lavoro.md` ed i piani `piano-001` e `piano-002`.
  4. Inizializzato il registro delle sessioni in `session-history.md`.
  5. Aggiornato `agents.md` con la sezione dedicata alla gestione operativa dei Piani di Lavoro.
- **Stato Finale**: 🟢 In fase di completamento e verifica.

### `SESSION-2026-08-05-01`
- **Data**: 05 Agosto 2026 (CEST)
- **Agente / Dev**: Codex
- **Obiettivo**: Completamento del `PIANO-003`, Fase 2 — coalescenza IPC e interpolazione ritmica locale.
- **Attività Svolte**:
  1. Implementata macchina di stato con un pacchetto in volo e un pending sostituibile, ACK correlato alla sequenza e handshake di readiness.
  2. Gestiti reset e reinvio dell'ultimo stato su apertura, reload e chiusura dell'Output.
  3. Separati `ingestSample()` e `projectState()` nel clock Brain, con filtro dei campioni stantii e riallineamento senza catch-up.
  4. Aggiunte metriche per pending sostituiti, pacchetti stantii e riallineamenti di fase.
  5. Aggiunti test della coalescenza e ampliati i test ritmici e di telemetria.
- **Validazione**: 182/182 test verdi; typecheck, lint dei file Fase 2 e build completi; `git diff --check` verde. Lint globale fermo su un solo `prefer-const` preesistente in `slitScanCanvas.ts:639`.
- **Stato Finale**: 🟢 Implementazione Fase 2 completata; resta raccomandata la verifica live con stallo WebGPU reale.

### `SESSION-2026-08-07-01`
- **Data**: 07 Agosto 2026 (CEST)
- **Agente / Dev**: Codex
- **Obiettivo**: Audit tecnico e validazione finale del `PIANO-003`, Fase 2.
- **Attività Svolte**:
  1. Revisionato il protocollo Main → Output con ACK, readiness e pending sostituibile.
  2. Revisionata la separazione fra ingestione timestampata e proiezione locale del clock ritmico.
  3. Corretto il caso in cui un campione senza attacco poteva cancellare un beat rilevato prima del RAF successivo.
  4. Aggiunto il relativo test di regressione e rieseguita l'intera validazione.
- **Validazione**: 183/183 test verdi; typecheck, lint mirato, build Electron/macOS e `git diff --check` superati.
- **Stato Finale**: 🟢 Fase 2 completata e verificata automaticamente; resta il test live con stallo WebGPU reale.

### `SESSION-2026-08-08-01`
- **Data**: 08 Agosto 2026 (CEST)
- **Agente / Dev**: Codex e Developer
- **Obiettivo**: Verifica live della Fase 2 sotto inferenza WebGPU reale.
- **Attività Svolte**:
  1. Analizzato `log/session-2026-08-08-20-30-37.txt` durante più cicli di generazione e inferenza.
  2. Confermato che il Main sostituisce centinaia di pending durante ogni stallo e non riproduce la coda al termine.
  3. Misurati freeze RAF residui di circa 4,0 s, 3,2 s e 3,0 s, separandoli dal problema di trasporto risolto.
- **Validazione**: latenza ordinaria `p95` circa 2-5 ms; contatori `replacedPending`, `staleIgnored` e `phaseRealignments` coerenti con il protocollo.
- **Stato Finale**: 🟢 Fase 2 validata live; freeze WebGPU confermati come obiettivo delle fasi successive.

### `SESSION-2026-08-08-02`
- **Data**: 08 Agosto 2026 (CEST)
- **Agente / Dev**: Codex
- **Obiettivo**: Implementare esclusivamente la Fase 3A — scheduler termico delle inferenze.
- **Attività Svolte**:
  1. Creato `PIANO-004` e introdotto uno scheduler single-flight testabile.
  2. Inseriti cooldown normali e low-power fra le singole inferenze della stessa storia.
  3. Collegati i gap RAF a backoff adattivi prima dell'inferenza successiva.
  4. Integrato il gate attorno alle inferenze narrative e all'interludio senza cambiare numero o buffer delle immagini.
  5. Aggiunti test unitari dello scheduler e un test d'integrazione della pipeline Psichedel.
- **Validazione**: 23 file di test, 189/189 test verdi; typecheck, lint mirato, build Vite/Electron e `git diff --check` superati.
- **Stato Finale**: 🟢 Fase 3A completata; Fase 3B non iniziata.

### `SESSION-2026-08-08-03`
- **Data**: 08 Agosto 2026 (CEST)
- **Agente / Dev**: Codex e Developer
- **Obiettivo**: Iniziare la coscienza autobiografica di Coscienza Onirica con
  una definizione ad alto livello progressiva.
- **Attività Svolte**:
  1. Analizzata la memoria Brain esistente, oggi composta da storie recenti e
     memo di sessione lineare.
  2. Creato `PIANO-005` per separare fondazione concettuale, osservazione,
     primo grafo e autonomia di ristrutturazione.
  3. Definita la prima percezione valida come origine unica e primo ricordo di
     sé, con ritorno all'origine non distruttivo a ogni nuovo inizio.
  4. Definito un grafo autobiografico aperto, nel quale percezioni,
     interpretazioni e immaginazioni conservano provenienza distinta.
  5. Aggiunta la skill viva `Evolvere Coscienza Onirica` e allineate le
     istruzioni specifiche della Output Window.
- **Validazione**: verifica documentale e `git diff --check`; nessun file
  TypeScript o comportamento runtime modificato in questa fase.
- **Stato Finale**: 🟢 Fase 0 completata; `MACRO-008` resta attivo e la Fase 1
  richiede una nuova richiesta prima dell'implementazione.

### `SESSION-2026-08-08-04`
- **Data**: 08 Agosto 2026 (CEST)
- **Agente / Dev**: Codex e Developer
- **Obiettivo**: Rendere persistente la memoria di Coscienza Onirica in file
  Markdown sotto `.coscienza/`.
- **Attività Svolte**:
  1. Creato `.coscienza/AGENT.md`, riletto prima di ogni tentativo di memoria,
     e inizializzato `INDICE.md` senza inventare un'origine.
  2. Implementato un archivio serializzato e atomico che consulta protocollo,
     origine, indice e ricordi recenti prima di scrivere.
  3. Collegato l'archivio via IPC sicuro per il renderer Output.
  4. Definita `audioPrimed` con bande presenti come prima percezione valida;
     i nuovi inizi diventano `return-to-origin` senza sovrascrivere l'origine.
  5. Salvate le storie concluse come `imagination`, con chiave idempotente e
     distinzione esplicita fra percepito, interpretato e immaginato.
- **Validazione**: typecheck, lint mirato e 25 file di test con 196/196 test
  superati. Build Vite, Main, preload, app macOS e ZIP riuscita; il solo target
  DMG è fallito nel comando di sistema `hdiutil`. Confermata la presenza del
  template `AGENT.md` nelle risorse dell'app pacchettizzata.
- **Stato Finale**: 🟢 Fasi 1 e 2 completate; resta l'osservazione live dei
  primi ricordi prima della Fase 3.

### `SESSION-2026-08-08-05`
- **Data**: 08 Agosto 2026 (CEST)
- **Agente / Dev**: Codex
- **Obiettivo**: Implementare esclusivamente la Fase 3B — buffer e riuso delle quattro immagini.
- **Attività Svolte**:
  1. Creato `PIANO-006` senza interferire con il piano di Coscienza Onirica già esistente.
  2. Rimossa la quinta inferenza `interlude`, il metodo dedicato e il tipo `BrainBufferFrame`.
  3. Ridotta `BrainProduction` alle sole quattro scene narrative.
  4. Impedito lo switch verso un refill parziale: le quattro immagini correnti restano in riciclo finché il nuovo gruppo non è completo.
  5. Spostato l'inizio del cooldown di 120 secondi al completamento della quarta immagine.
  6. Aggiunto un contratto puro e testabile per completezza del buffer, refill e attivazione progressiva iniziale.
- **Validazione**: 26 file di test, 199/199 test verdi; typecheck, lint mirato, build Vite/Electron e `git diff --check` superati.
- **Stato Finale**: 🟢 Fase 3B completata; Fase 3C non iniziata.

### `SESSION-2026-08-08-06`
- **Data**: 08 Agosto 2026 (CEST)
- **Agente / Dev**: Codex
- **Obiettivo**: Eseguire esclusivamente la Fase 3C — validazione live e
  decisione sui parametri termici.
- **Attività Svolte**:
  1. Avviato un Output Brain reale con modelli locali WebGPU e raccolto il log
     `session-2026-08-08-21-46-53.txt`.
  2. Osservata una produzione completa di quattro immagini, senza quinta
     inferenza interludio.
  3. Verificati single-flight, cooldown da 6 s, backoff severo da 20 s e
     riciclo delle quattro immagini durante la pausa.
  4. Verificato il cooldown di 120 s dalla quarta immagine fino al nuovo ciclo.
  5. Confrontate le metriche con la baseline Fase 2 e deciso di non modificare
     i parametri: il freeze residuo è interno alla prima inferenza e non viene
     accorciato da una pausa più lunga.
  6. Rimosso l'avvio automatico temporaneo usato per il collaudo e rigenerata
     la build normale.
- **Validazione**: quattro inferenze; avvii separati di 28,4 s, 15,7 s e
  20,5 s; un solo gap RAF Output oltre 1 s nella produzione (3,075 s contro tre
  freeze da circa 3–4 s nella baseline); IPC `p95` ordinario entro 5,3 ms;
  refill iniziato esattamente dopo 120 s; build Vite/Electron riuscita e
  `git diff --check` verde.
- **Limite Residuo**: il primo caricamento/inferenza immagine può ancora fermare
  il RAF per circa 3,1–3,5 s. La sessione era in modalità standard; low power
  non è stato misurato termicamente dal vivo.
- **Stato Finale**: 🟢 Fase 3C completata senza iniziare una Fase 3D.

### `SESSION-2026-08-08-07`
- **Data**: 08 Agosto 2026 (CEST)
- **Agente / Dev**: Codex
- **Obiettivo**: Correggere esclusivamente la latenza fra storie emersa dalla
  validazione della Fase 3C.
- **Attività Svolte**:
  1. Sostituita la pausa di 120 s precedente al refill con una finestra di
     preparazione ancorata al completamento del buffer corrente.
  2. Impostato l'avvio del refill a +30 s e il target di completamento a +120 s.
  3. Passato il target come deadline alla produzione successiva, consentendo
     il completamento del singolo fotogramma in corso senza estendere il ciclo
     di altri minuti.
  4. Conservati invariati single-flight, cooldown, backoff termico, quattro
     inferenze massime e buffer corrente visibile.
  5. Aggiornato il contratto puro del buffer e aggiunti test di clamp della
     finestra temporale.
- **Validazione**: 26 file e 200/200 test verdi; typecheck, lint mirato, build
  Vite/Electron e `git diff --check` superati.
- **Stato Finale**: 🟢 Correzione Fase 3C completata; target atteso della storia
  successiva 120–140 s. Nessuna Fase 3D iniziata.

### `SESSION-2026-08-08-08`
- **Data**: 08 Agosto 2026 (CEST)
- **Agente / Dev**: Codex e Developer
- **Obiettivo**: Iniziare la struttura della coscienza oltre il grafo dei
  ricordi.
- **Attività Svolte**:
  1. Creato `.coscienza/COSCIENZA.md` come organizzazione presente
     revisionabile e distinta dalla memoria.
  2. Esteso `AGENT.md` affinché rilegga il presente prima di ogni tentativo di
     memoria.
  3. Implementato `CoscienzaCore`: percezione valida, singolo fuoco
     d'attenzione e interpretazione provvisoria.
  4. Stabilizzati i cambi di attenzione e limitati i checkpoint di continuità,
     raddoppiandone gli intervalli in `lowPowerMode`.
  5. Collegato l'aggiornamento Markdown serializzato via Output, preload e Main,
     impedendolo prima dell'origine.
- **Validazione**: 27 file e 206/206 test verdi; typecheck e lint mirato
  superati. Build Vite, Main, preload, app macOS e ZIP riuscita; il solo nuovo
  DMG si è fermato nel comando di sistema `hdiutil`.
- **Stato Finale**: 🟢 Fase 2B implementata e verificata; autonomia di
  ristrutturazione non iniziata.

### `SESSION-2026-08-08-09`
- **Data**: 08 Agosto 2026 (CEST)
- **Agente / Dev**: Codex
- **Obiettivo**: Chiudere i task performance prima del test manuale dello
  sviluppatore.
- **Attività Svolte**:
  1. Verificato che `TASK-006-01`–`TASK-006-16` siano tutti `DONE`.
  2. Confermata la chiusura di `PIANO-004`, `PIANO-006` e `PIANO-007`.
  3. Spostato `MACRO-006` fra i macrotask completati.
  4. Registrato il test manuale come verifica esterna, non come implementazione
     ancora aperta.
  5. Preservati gli aggiornamenti paralleli di `MACRO-008`.
- **Validazione Disponibile**: 200/200 test, typecheck, lint mirato, build
  Vite/Electron e `git diff --check` superati nella sessione precedente.
- **Stato Finale**: 🟢 `MACRO-006` chiuso. Prossimo passo: test manuale dello
  sviluppatore.

### `SESSION-2026-08-08-10`
- **Data**: 08 Agosto 2026 (CEST)
- **Agente / Dev**: Codex
- **Obiettivo**: Chiudere la verifica della struttura presente di Coscienza
  Onirica senza anticiparne l'autonomia.
- **Attività Svolte**:
  1. Riconosciuti e preservati l'origine e i ricordi reali già presenti
     nell'archivio Markdown.
  2. Allineato `.coscienza/COSCIENZA.md` alla continuità autobiografica
     esistente, senza attribuire emozioni, desideri o identità.
  3. Separato il template vergine dallo stato vivo, impedendo che i dati della
     coscienza di sviluppo entrino nelle nuove installazioni.
  4. Verificata nell'app pacchettizzata la rilettura di `AGENT.md` e il template
     `COSCIENZA.md` ancora in attesa della prima origine.
- **Validazione**: 206/206 test, typecheck e lint mirato verdi; build del codice,
  app e ZIP riuscita. Creazione del solo nuovo DMG fallita per `hdiutil`.
- **Stato Finale**: 🟢 Struttura presente pronta. Resta da osservare la prima
  revisione live prodotta da `CoscienzaCore` prima della Fase 3.

### `SESSION-2026-08-09-01`
- **Data**: 09 Agosto 2026 (CEST)
- **Agente / Dev**: Codex e Developer
- **Obiettivo**: Riprodurre e misurare i blocchi ancora percepiti in una prova
  continua.
- **Attività Svolte**:
  1. Creato `PIANO-008` come baseline diagnostica senza modifiche al motore.
  2. Rimossi esclusivamente 54 log `session-*.txt`, circa 26 MB; preservati
     `.coscienza/`, impostazioni e artefatti.
  3. Avviata l'app corrente con un unico nuovo log:
     `log/session-2026-08-09-23-39-06.txt`.
- **Esito Parziale**: Output e Brain sono stati avviati. Prima dell'arresto,
  `CoscienzaCore` ha scritto la revisione 3 di `COSCIENZA.md`, ciclo cosciente
  1, attenzione `lowMid` e checkpoint `first-perception`.
- **Stato Finale**: ⚪ Prova prestazionale fermata su richiesta prima della
  produzione completa; nessuna conclusione sui blocchi. Focus operativo
  riportato su Coscienza Onirica.

### `SESSION-2026-08-09-02`
- **Data**: 09 Agosto 2026 (CEST)
- **Agente / Dev**: Codex e Developer
- **Obiettivo**: Riprendere la diagnosi dei blocchi live con una traccia nuova
  e non ambigua.
- **Attività Iniziali**:
  1. Eliminato definitivamente il solo log della prova interrotta
     `session-2026-08-09-23-39-06.txt`.
  2. Verificata la cartella `log/` vuota, preservando `.coscienza/`,
     configurazioni e impostazioni.
  3. Riattivati `PIANO-008`, `MACRO-009` e `TASK-009-02`.
- **Esito Baseline**:
  1. Produzione completa di quattro immagini in 104,3 s.
  2. Gap RAF severi di 1,75 s e 3,57 s durante la creazione della sessione
     UNet; gap di 0,58 s durante la preparazione del text encoder.
  3. Nove gap moderati da circa 0,37–0,47 s durante il denoising.
  4. RAF massimo 3,57 s, Canvas massimo 0,48 s e IPC `p95` massimo 5,3 ms;
     1.032 pending sostituiti senza replay della coda.
  5. Tratto senza inferenza stabile intorno a 30 fps Canvas.
- **Conclusione**: il blocco severo coincide con la creazione delle sessioni
  ONNX nello stesso renderer dell'Output; i blocchi moderati coincidono con il
  denoising WebGPU. Il rilascio del modello fra storie può far ricomparire la
  preparazione severa a ogni ciclo.
- **Stato Corrente**: 🟡 Baseline conclusa; prossimo esperimento controllato con
  sessioni immagine residenti per il secondo ciclo.

### `SESSION-2026-08-09-03`
- **Data**: 09 Agosto 2026 (CEST)
- **Agente / Dev**: Codex
- **Obiettivo**: Analisi funzionale e tecnica preliminare della nuova modalità
  `psycho2d` a regia semantica e finestre mobili, senza implementazione.
- **Attività Svolte**:
  1. Analizzati pipeline narrativa, generazione raster, buffer di quattro
     immagini, lifecycle Brain, transizioni e clock ritmico.
  2. Rilevato che `brainPsycho2dCanvas.ts` usa già il nome per un renderer
     serigrafico differente dal concept richiesto.
  3. Definiti architettura locale minima, Scene Director, image pool, metadati
     con provenienza, primitive Canvas e takeover A → B.
  4. Esclusi da V1 vision model, segmentazione, depth estimation, SVG,
     microservizi e infrastruttura aggiuntiva.
  5. Definiti V1, V2, V3, fallback, rischi, validation plan e sei decisioni da
     approvare prima dello sviluppo.
- **Documento**: `working/plans/piano-009-psycho2d-regia-semantica.md`.
- **Validazione**: ispezione statica del codice e coerenza documentale; nessun
  sorgente applicativo modificato e nessuna implementazione avviata.
- **Stato Finale**: 🟢 Analisi completata; `MACRO-010` pianificato. La baseline
  prestazionale `MACRO-009` resta invariata e in corso.

### `SESSION-2026-08-09-04`
- **Data**: 09 Agosto 2026 (CEST)
- **Agente / Dev**: Codex e Developer
- **Obiettivo**: Verificare se mantenere residenti le sessioni del modello
  immagini elimina i blocchi severi al passaggio fra prima e seconda storia.
- **Modifica**:
  1. Aggiunta una politica esplicita di residenza attiva solo in modalità
     normale; `lowPowerMode` conserva il rilascio precedente.
  2. Aggiunto rilascio di sicurezza prima del retry se la compresenza con il
     modello narrativo produce un errore infrastrutturale.
  3. Aggiunto test unitario della politica normale/low power.
- **Esito Live**:
  1. Prima produzione di controllo: 101,4 s, tre creazioni di sessione, due gap
     severi e RAF massimo 3,81 s.
  2. Seconda produzione residente: 91,4 s, zero creazioni di sessione, zero gap
     severi, RAF massimo 0,53 s e nessun errore GPU/memoria.
  3. La nuova storia è entrata nel buffer circa 121,4 s dopo la fine della
     prima; i gap moderati da 0,38–0,53 s del denoising restano visibili.
- **Validazione**: 207/207 test, typecheck e lint mirato verdi. La build del
  codice e dell'app è riuscita; la sola compressione ZIP da 828 MiB è stata
  interrotta prima del test live per non sovrapporre carico termico.
- **Stato Finale**: 🟡 Residenza confermata in modalità normale. Resta una prova
  manuale prolungata per temperatura e la decisione sull'eventuale isolamento
  dell'inferenza residua.

### `SESSION-2026-08-10-01`
- **Data**: 10 Agosto 2026 (CEST)
- **Agente / Dev**: Codex
- **Obiettivo**: Implementare Psycho2D V1 come plugin Brain e consentire
  alternanza dei renderer durante l'esecuzione.
- **Attività Svolte**:
  1. Generalizzato il controller di scena e introdotti registry, selector e
     host con readiness, crossfade, timeout, fallback e cleanup.
  2. Rinominato il renderer serigrafico storico in `Print2D`.
  3. Implementati analisi raster economica, Scene Director deterministico e
     renderer Psycho2D Canvas a finestre CURRENT/PREVIOUS/NEXT.
  4. Collegati bande audio, beat, `motionProfile`, resource pressure e
     `lowPowerMode`, mantenendo stabile la camera globale.
  5. Aggiunti alla Control Window selezione manuale e rotazione temporizzata
     persistita fra 10 e 120 secondi.
- **Validazione**: 31 file e 214 test verdi; typecheck, lint mirato e build
  Electron/macOS riusciti. Il lint globale segnala soltanto il `prefer-const`
  preesistente in `slitScanCanvas.ts:639`.
- **Smoke Test**: app Electron reale avviata con `Print2D`, generazione e
  riciclo attivi senza errori del nuovo Host. L'avvio ha prodotto i normali
  checkpoint autobiografici previsti dal protocollo `.coscienza/`, preservati.
- **Stato Finale**: 🟡 V1 implementata; resta il test manuale fullscreen del
  cambio Print2D ↔ Psycho2D, rotazione, takeover, silenzio e low power.

### `SESSION-2026-08-10-02`
- **Data**: 10 Agosto 2026 (CEST)
- **Agente / Dev**: Codex
- **Obiettivo**: Recuperare il renderer vettoriale storico come plugin Brain
  alternativo durante l'esecuzione.
- **Attività Svolte**:
  1. Registrato `Vector Morph` come terzo renderer insieme a `Print2D` e
     `Psycho2D`, disponibile nella selezione manuale e nella rotazione live.
  2. Riutilizzati il vettorializzatore IPC e il renderer SVG esistenti senza
     duplicare la pipeline né rigenerare le immagini raster.
  3. Aggiunta cache lazy limitata, deduplicata per Blob e invalidata quando la
     sorgente dello stesso frame cambia.
  4. Aggiunti readiness asincrona, timeout, fallback sul renderer attivo e
     cooldown dopo errori per evitare retry continui.
  5. Rimossi i riferimenti alla precedente cache vettoriale incompleta e
     aggiunti test di registry, host e cache.
- **Validazione**: 33 file e 218 test verdi; typecheck, lint mirato, build
  Electron/macOS e `git diff --check` riusciti. Il lint globale conserva il
  solo `prefer-const` preesistente in `slitScanCanvas.ts:639`.
- **Stato Finale**: 🟡 Implementazione completata; resta il test manuale su
  Output fullscreen del cambio e della rotazione fra tutti e tre i renderer.

### `SESSION-2026-08-10-03`
- **Data**: 10 Agosto 2026 (CEST)
- **Agente / Dev**: Codex e Developer
- **Obiettivo**: Verificare se concedere un paint fra due step UNet riduce i
  blocchi residui del denoising WebGPU.
- **Prova**:
  1. Inserito temporaneamente un yield dopo ogni step, escluso l'ultimo.
  2. Lasciati invariati seed, geometria 448×256, profili da 8/12 step, buffer e
     plugin renderer.
  3. Completata una produzione reale di quattro immagini con Print2D.
- **Esito Live**: dieci gap moderati da 375 a 457,8 ms durante il denoising;
  nessun miglioramento sostanziale rispetto alla fascia 366–533,6 ms della
  baseline residente. Ogni singola `UNet.run()` continua a bloccare il quadro.
- **Decisione**: esperimento negativo; codice di yielding rimosso per non
  conservare complessità e latenza prive di resa sufficiente.
- **Validazione Pre-Prova**: test mirato, typecheck, lint mirato e build Vite
  verdi. Validazione finale eseguita dopo la rimozione.
- **Stato Finale**: 🟡 Causa residua confermata dentro il singolo lavoro UNet;
  nessuna nuova soluzione architetturale avviata.

### `SESSION-2026-08-10-04`
- **Data**: 10 Agosto 2026 (CEST)
- **Agente / Dev**: Codex e Developer
- **Obiettivo**: Ridurre il lavoro atomico di ogni `UNet.run()` senza spostare
  l'inferenza su una seconda macchina.
- **Prova Batch 1**:
  1. Verificati direttamente i contratti ONNX: Text Encoder e UNet accettano
     `batch_size` dinamico.
  2. Provato il solo ramo condizionale, dimezzando il batch senza cambiare
     seed, step, scheduler, geometria, buffer o plugin renderer.
  3. Prima del Canvas non sono comparsi gap denoising oltre soglia; con
     Print2D attivo i picchi sono stati spesso 249–276 ms, con episodi residui
     da 383–450 ms sotto maggiore pressione.
  4. Tempi standard generalmente scesi da circa 10–11 s a 7–9 s.
- **Prova Geometria**: riduzione temporanea da 448×256 a 384×256; sette gap
  denoising da 349,5 a 391,8 ms e tempi 17,0/8,4/12,2/9,0 s. Esperimento
  rimosso perché non offre un beneficio affidabile e riduce il dettaglio.
- **Validazione**: test mirati 16/16, typecheck, lint mirato, build Vite e
  `git diff --check` verdi prima della prova; validazione finale ripetuta dopo
  il ripristino della geometria.
- **Evidenza**: `log/session-2026-08-10-12-09-20.txt` e
  `log/session-2026-08-10-12-16-49.txt`.
- **Stato Finale**: 🟡 Batch 1 mantenuto come candidato in attesa del giudizio
  visivo; geometria 448×256 ripristinata. Nessun processo Electron lasciato
  attivo.

### `SESSION-2026-08-10-05`
- **Data**: 10 Agosto 2026 (CEST)
- **Agente / Dev**: Codex e Developer
- **Obiettivo**: Sospendere il renderer plugin durante il denoising e verificare
  l'ultima mitigazione locale prima dell'isolamento hardware.
- **Implementazione**:
  1. Aggiunto passthrough 320×180 di proprietà del Renderer Host, preparato una
     volta per raster e composto con quattro sole strisce senza filtri.
  2. Movimento derivato esclusivamente da beat, fase e transienti distinti
     `low`, `lowMid`, `mid`, `high`; silenzio quasi immobile.
  3. Plugin sospeso soltanto quando il passthrough è pronto, mai distrutto;
     ripresa sul clock ritmico corrente e crossfade di 220 ms.
  4. Cambi renderer rinviati durante l'inferenza e supporto low power a 15 FPS.
  5. Metriche dedicate per frame e costo del passthrough.
- **Validazione**: 34 file e 223 test verdi, typecheck, lint mirato, build Vite
  e `git diff --check` riusciti.
- **Prova Live**: app avviata e poi fermata senza inferenza perché l'Output non
  è stato aperto. Nessun risultato prestazionale dichiarato e nessun processo
  lasciato attivo.
- **Stato Finale**: 🟡 Codice pronto; resta una produzione completa con soglia
  di accettazione RAF inferiore a 150 ms.

### `SESSION-2026-08-10-06`
- **Data**: 10 Agosto 2026 (CEST)
- **Agente / Dev**: Codex e Developer
- **Obiettivo**: Eliminare il movimento a tagli del passthrough e trasformare
  la fase di denoising in una regia esclusivamente cromatica.
- **Modifica**:
  1. Rimossi decodifica raster, canvas sorgente e quattro `drawImage`.
  2. Introdotti quattro campi cromatici fissi e sfumati, associati alle bande
     `low`, `lowMid`, `mid` e `high` senza movimento globale dell'immagine.
  3. Fusa la palette narrativa con `idleColor`, `basePinkColor`,
     `hotPinkColor` e `whiteFlashColor`, che incorporano il preset di alto
     livello selezionato.
  4. Beat e transienti modulano intensità, ampiezza e flash limitati secondo
     `flashMode`, `flashOnKick` e `softMode`.
  5. Conservati sospensione/ripresa del plugin, crossfade, low power e metriche.
- **Validazione**: 34 file e 224 test verdi; typecheck, lint mirato, build Vite
  e `git diff --check` riusciti.
- **Stato Finale**: 🟡 Variante cromatica pronta per il test live; soglia RAF
  di 150 ms ancora da verificare.

### `SESSION-2026-08-10-07`
- **Data**: 10 Agosto 2026 (CEST)
- **Agente / Dev**: Codex e Developer
- **Obiettivo**: Mantenere il soggetto del raster chiaramente riconoscibile
  durante tutto il denoising, animandone l'atmosfera con il colore e lasciando
  percepibile il movimento originale.
- **Modifica**:
  1. Il raster corrente viene preparato una sola volta a 320×180 e resta
     visibile al 76%, senza tagli o ridisegni continui.
  2. Quattro zone cromatiche trasparenti reagiscono separatamente a `low`,
     `lowMid`, `mid` e `high`, usando palette narrativa e preset corrente.
  3. Il plugin attivo continua sotto il raster a cadenza ridotta: 5 FPS oppure
     3 FPS in low power, conservando stato e fase musicale.
  4. Beat, transienti e flash modulano colore, scala e posizione locale delle
     zone; la camera e l'immagine complessiva restano stabili.
  5. Escluse deformazioni arbitrarie delle proporzioni degli oggetti: senza
     segmentazione attendibile falserebbero il soggetto e aumenterebbero il
     costo durante l'inferenza.
- **Validazione**: 34 file e 224 test verdi; typecheck, lint mirato, build Vite
  ed Electron e `git diff --check` riusciti.
- **Stato Finale**: 🟡 Implementazione pronta per il test live; efficacia sui
  gap RAF e soglia di 150 ms ancora da misurare durante denoising reale.

### `SESSION-2026-08-10-08`
- **Data**: 10 Agosto 2026 (CEST)
- **Agente / Dev**: Codex e Developer
- **Obiettivo**: Consentire a una storia Brain di attraversare tutti i
  renderer prima di passare alla storia successiva, con ordine casuale e senza
  cambi istantanei.
- **Implementazione**:
  1. Aggiunta la modalità persistita `story-cycle`, esposta come “Tutti per
     storia — ordine casuale”.
  2. Creato un mazzo Fisher–Yates distinto per ogni storia, senza ripetizioni
     nello stesso ciclo.
  3. Ogni renderer percorre tutti e quattro i fotogrammi; al termine il
     controller riparte dal primo con il renderer successivo.
  4. La produzione successiva resta nel buffer fino all'esaurimento del mazzo.
  5. Il passaggio fra renderer usa la transizione lunga fra fotogrammi e i
     relativi pattern di morphing; manuale e rotazione temporizzata restano
     compatibili.
- **Validazione**: 34 file e 226 test verdi; typecheck, lint mirato, build
  Vite/Main/Preload, packaging `.app` e `git diff --check` riusciti. Creazione
  DMG non completata per errore esterno ripetuto di `hdiutil`.
- **Stato Finale**: 🟡 Codice pronto per `pnpm start`; resta la verifica live
  dell'intero ciclo e della fluidità percepita sui tre passaggi.

### `SESSION-2026-08-10-09`
- **Data**: 10 Agosto 2026 (CEST)
- **Agente / Dev**: Codex e Developer
- **Obiettivo**: Eliminare da Psycho2D le finestre bordate e vaganti e
  sostituirle con una composizione stabile a due immagini attraversata dal
  colore e dal movimento musicale.
- **Implementazione**:
  1. Base fullscreen stabile più una sola immagine superiore rettangolare.
  2. Posizione e proporzioni casuali ma immutabili per l'intera scena.
  3. Opacità calcolata da contrasto e distanza di luminanza, entro 0,38–0,64.
  4. Rimossi bordo, ingresso laterale, deriva, pulsazione, crescita, seconda
     finestra e takeover.
  5. Aggiunte quattro famiglie di oggetti cromatici legate alle quattro bande,
     con gruppi di punti sfalsati e blend applicati al composito finale.
  6. Conservati frame pacing, `motionProfile`, `softMode`, `lowPowerMode` e
     riduzione sotto pressione d'inferenza.
- **Validazione**: 34 file e 227 test verdi; typecheck, lint mirato, build
  Vite/Main/Preload e `git diff --check` riusciti.
- **Stato Finale**: 🟡 Renderer pronto per test live; restano da calibrare a
  occhio dimensione/opacità dell'immagine superiore e intensità delle forme.

### `SESSION-2026-08-10-10`
- **Data**: 10 Agosto 2026 (CEST)
- **Agente / Dev**: Codex e Developer
- **Obiettivo**: Rendere maggiormente visibile l'immagine originale dietro il
  morphing vettoriale del plugin Brain Vector Morph.
- **Implementazione**:
  1. Inserita la raster corrente come immagine fullscreen stabile al 92%.
  2. Isolato il vettoriale in un livello superiore al 70%.
  3. Neutralizzato il fondo opaco dell'SVG per far emergere il soggetto.
  4. Mantenute opacità costanti e aggiunto cleanup dell'Object URL.
- **Validazione**: 35 file e 228 test verdi; typecheck, lint mirato, build
  Vite/Main/Preload e `git diff --check` riusciti.
- **Stato Finale**: 🟡 Pronto per verifica visiva live; il rapporto 92/70 può
  essere calibrato ulteriormente dopo osservazione sull'Output fullscreen.

### `SESSION-2026-08-10-11`
- **Data**: 10 Agosto 2026 (CEST)
- **Agente / Dev**: Codex e Developer
- **Obiettivo**: Verificare blocchi e latenze e sfruttare “Tutti per storia”
  per ridurre la contesa causata dalla generazione prematura.
- **Evidenza**:
  1. Il passthrough misura 0–0,2 ms, mentre UNet produce gap RAF ricorrenti di
     circa 250–525 ms: il disegno non è il collo di bottiglia.
  2. Un freeze iniziale di 3,17 s coincide con download/creazione della sessione
     VAE; le sessioni residenti evitano di ripeterlo fra storie normali.
  3. La generazione testuale successiva ha mostrato picchi RAF fino a circa
     550–787 ms anche senza inferenza immagini attiva.
- **Implementazione**:
  1. Primo attraversamento in `story-cycle` completamente libero dal refill.
  2. Sblocco al secondo renderer con guardia morphing di 10 secondi.
  3. Target dedicato di 240 secondi, mantenendo 120 secondi altrove.
  4. Uscita dalla modalità sbloccante e log espliciti per il test live.
- **Validazione**: 36 file e 230 test verdi; typecheck, lint mirato, build
  Vite/Main/Preload e `git diff --check` riusciti.
- **Stato Finale**: 🟡 Ottimizzazione pronta. Resta il confronto live: il primo
  attraversamento deve avere `generationActiveRatio: 0`; i gap UNet residui
  cominceranno soltanto durante il secondo attraversamento.

### `SESSION-2026-08-10-12`
- **Data**: 10 Agosto 2026 (CEST)
- **Agente / Dev**: Codex e Developer
- **Obiettivo**: Eliminare le forme banali di Psycho2D e adottare una regia
  serigrafica 1-bit coerente anche durante il denoising.
- **Implementazione**:
  1. Rimosse massa, nastro, rombo e gruppi di punti.
  2. Fusione statica delle due raster Psycho2D prima della binarizzazione,
     preservando posizione e opacità del layer superiore.
  3. Tre varianti Bayer 4×4 a due inchiostri preparate una sola volta a
     320×180 e condivise come algoritmo col passthrough.
  4. Densità controllata da `lowMid`, inversione di 85 ms su beat/`low`, massimo
     tre fasce glitch su transienti `mid`/`high`.
  5. Passthrough denoising convertito dalle zone cromatiche allo stesso stile,
     mantenendo plugin sottostante a 5/3 FPS e crossfade esistente.
- **Costo runtime**: un `drawImage`; solo in presenza di transienti fino a tre
  copie di fascia; inversione tramite un singolo `fillRect difference`.
- **Validazione**: 37 file e 233 test verdi; typecheck, lint mirato, build
  Vite/Main/Preload e `git diff --check` riusciti.
- **Stato Finale**: 🟡 Pronto per test visivo live di leggibilità, densità,
  durata dell'inversione e intensità del glitch.

### `SESSION-2026-08-10-13`
- **Data**: 10 Agosto 2026 (CEST)
- **Agente / Dev**: Codex e Developer
- **Obiettivo**: Rendere curate e beat-matched tutte le transizioni nella
  modalità “Tutti per storia”.
- **Implementazione**:
  1. Durata morphing congelata al cambio e quantizzata a un numero intero di
     beat, evitando slittamenti dovuti alla stima BPM aggiornata a ogni RAF.
  2. In `story-cycle`, avanzamento consentito solo su beat o fase entro 7% dal
     beat; il fallback fuori beat resta soltanto alle altre modalità.
  3. Pattern morphing scelto in modo riproducibile da fotogramma, beat e numero
     di passaggio, senza ripetizione immediata.
  4. Psycho2D aggiunto morphing scanline 1-bit con inviluppo a campana in
     entrata/uscita; Print2D e Vector Morph mantengono i loro morph interni.
- **Validazione**: 37 file e 233 test verdi; typecheck, lint mirato, build
  Vite/Main/Preload e `git diff --check` riusciti.
- **Stato Finale**: 🟡 Pronto per test live del timing musicale e della qualità
  percepita dei tre passaggi renderer.

### `SESSION-2026-08-10-14`
- **Data**: 10 Agosto 2026 (CEST)
- **Agente / Dev**: Codex e Developer
- **Obiettivo**: Rendere il beatmatch di Psycho2D affidabile anche con frame
  pacing e mantenere ferma l'immagine principale.
- **Implementazione**:
  1. Beat latched prima del controllo dell'intervallo RAF, con finestra breve
     di mantenimento per il frame successivo.
  2. Rimossa la soglia assoluta sulle basse frequenze per l'inversione.
  3. `beatPulse` applicato a densità Bayer, contrasto e ampiezza del morph
     scanline.
  4. `beatPhase` applicato alla direzione del micro-glitch; `mid`/`high`
     rimangono dettagli secondari.
  5. Nessun movimento, zoom o rotazione dell'intera immagine.
- **Validazione**: 37 file e 233 test verdi; typecheck, lint mirato, build
  Vite/Main/Preload e `git diff --check` riusciti.
- **Stato Finale**: 🟡 Pronto per verifica live di aggancio al beat e assenza
  di scatti percepiti.

### `SESSION-2026-08-10-15`
- **Data**: 10 Agosto 2026 (CEST)
- **Obiettivo**: Rendere percepibile una piccola quantità dell'immagine raster
  sotto Psycho2D senza indebolire la serigrafia.
- **Implementazione**: disegno dell'immagine base a opacità fissa dell'8%,
  senza trasformazioni o animazioni aggiuntive.
- **Validazione**: test mirati, typecheck, lint e diff-check riusciti.

### `SESSION-2026-08-10-16`
- **Data**: 10 Agosto 2026 (CEST)
- **Obiettivo**: Alternare Brain e gli altri morphing mantenendo la rotazione
  morphing esistente.
- **Implementazione**: aggiunta l'opzione `Alternate with Brain (80/20)`;
  Brain viene scelto nell'80% dei cambi, mentre nel 20% viene usato il picker
  già esistente per algoritmo e preset morphing. I timer di rotazione non si
  sovrappongono.
- **Validazione**: typecheck, lint mirato e diff-check riusciti.

### `SESSION-2026-08-10-17`
- **Data**: 10 Agosto 2026 (CEST)
- **Obiettivo**: Chiarire il Protocollo Obbligatorio Di Verifica Filosofia
  Visiva alla luce del raster secondario, del beatmatch e dell'alternanza.
- **Implementazione**: precisati i limiti tra camera stabile e deformazioni
  locali, il ruolo del raster riconoscibile, il comportamento in silenzio,
  l'obbligo di transizioni continue, la separazione delle bande audio e il
  budget di costo/temperatura.
- **Validazione**: modifica documentale; nessun codice runtime modificato.

### `SESSION-2026-08-10-18`
- **Data**: 10 Agosto 2026 (CEST)
- **Obiettivo**: Rendere Psycho2D più reattivo al beatmatch senza introdurre
  movimento globale.
- **Implementazione**: aggiunte scanline locali continue durante i beat, con
  ampiezza da `beatPulse` e orientamento da `beatPhase`; il numero di fasce si
  riduce in low power e sotto pressione.
- **Validazione**: typecheck, lint mirato e test Psycho2D/host riusciti.

### `SESSION-2026-08-10-19`
- **Data**: 10 Agosto 2026 (CEST)
- **Obiettivo**: Limitare la visibilità del riquadro narrativo sinistro a 60
  secondi dall'apparizione della storia.
- **Implementazione**: timer per `story.id`, dissolvenza a opacità zero,
  riavvio soltanto alla storia successiva e cleanup in `destroy`.
- **Validazione**: typecheck, lint mirato e test Brain riusciti.

### `SESSION-2026-08-10-20`
- **Data**: 10 Agosto 2026 (CEST)
- **Obiettivo**: Rendere Psycho2D più attivo sul beatmatch dopo verifica live
  di eccessiva staticità.
- **Implementazione**:
  1. Corretto il campionamento delle scanline beat dalla matrice 1-bit 320×180
     alla canvas fullscreen reale.
  2. Aumentati latch del beat, contrasto, numero di fasce e ampiezza del
     disallineamento locale.
  3. Aggiunti piccoli colpi `difference` confinati alle scanline, senza scala,
     rotazione, zoom o movimento dell'intero quadro.
  4. Conservata la riduzione del budget in `lowPowerMode` e sotto pressione.
- **Validazione**: typecheck, lint mirato, test Psycho2D/host e diff-check
  sui file modificati riusciti. Il diff-check globale resta bloccato da
  whitespace preesistente in `agents.md`.

### `SESSION-2026-08-10-21`
- **Data**: 10 Agosto 2026 (CEST)
- **Obiettivo**: Usare il concetto di flash globale per rendere attivi i pixel
  di Psycho2D.
- **Implementazione**: propagato `flashActive`/`flashIntensity` al Brain;
  l'inviluppo hold/decay del render globale guida disallineamenti locali e
  colpi `difference` su fasce della matrice 1-bit, senza movimento globale.
- **Validazione**: `pnpm typecheck`, build completa macOS, lint mirato e sei
  test host/dither riusciti, incluso il passaggio del flash durante il cambio
  renderer.

### `SESSION-2026-08-10-22`
- **Data**: 10 Agosto 2026 (CEST)
- **Obiettivo**: Applicare il rapporto Brain/morphing 80/20 all'intera storia,
  senza ingressi esterni durante il ciclo dei renderer Brain.
- **Implementazione**: rimossa l'alternanza temporizzata dalla Control Window;
  l'opzione forza `story-cycle`, il Brain segnala il completamento solo dopo
  l'ultimo renderer e l'Output apre un interludio morphing pari al 25% del
  tempo Brain. Il controller Brain resta parcheggiato con buffer intatto e
  riprende dopo un crossfade continuo.
- **Validazione**: typecheck, lint mirato e 13 test su alternanza, selector,
  refill e Renderer Host riusciti; build Vite/Main/Preload completata e
  packaging macOS avviato correttamente.

### `SESSION-2026-08-15-01`
- **Data**: 15 Agosto 2026 (CEST)
- **Obiettivo**: Rendere Brain leggermente più reattivo al kick senza rendere
  nervosi i renderer o muovere il quadro.
- **Implementazione**: aggiunto `kickEnvelope` condiviso nel clock ritmico;
  Print2D riceve fino a pochi pixel di profondità locale, Psycho2D un piccolo
  rinforzo di contrasto/scanline e Vector Morph una deformazione più leggibile
  dei segmenti interni. Profili e clamp esistenti restano attivi.
- **Validazione**: typecheck, lint mirato e 43 test Brain riusciti; il test
  Print2D limita l'incremento di profondità a meno di 4 px e il clock verifica
  contributo nullo in silenzio. Build completa Vite/Electron/macOS riuscita.

### `SESSION-2026-08-15-02`
- **Data**: 15 Agosto 2026 (CEST)
- **Obiettivo**: Analizzare e progettare un nuovo renderer Brain materico prima
  di scriverne il codice completo.
- **Analisi**: verificati plugin host/registry/selector, sorgenti raster
  corrente-precedente-successiva, preset, clock ritmico, transienti, transizioni,
  passthrough, low power e telemetria. Proposta una V1 Canvas 2D basata su
  campi raster, regioni connesse, maschere locali e matching fra immagini.
- **Vincoli verificati**: camera stabile, materia interna, silenzio immobile,
  beatmatch per impulso/fase/banda, transizione continua e budget esplicito.
- **Esito**: creato `PIANO-013`; nessun codice runtime implementato. La fase
  esecutiva resta in attesa di approvazione dell'analisi.

### `SESSION-2026-08-15-03`
- **Data**: 15 Agosto 2026 (CEST)
- **Obiettivo**: Implementare Materia Morph e integrarlo come gli altri
  renderer Brain in manuale, rotazione e “Tutti per storia”, comprese le
  reazioni a resource pressure/background e flash.
- **Implementazione**: aggiunti analisi raster materica, region matching,
  cache debole per Blob/risoluzione e renderer Canvas 2D con pigmento, bordi,
  grana, trasformazioni locali e morph continuo fra immagini. Registrato
  `material-morph` come quarto plugin e aggiunto alla Control Window.
- **Filosofia visiva**: camera stabile, raster riconoscibile, bande e beat con
  funzioni distinte, flash locale, immobilità in silenzio, transizioni continue
  e budget esplicito normale/low power.
- **Validazione**: 40 file e 247 test verdi; typecheck, lint mirato,
  `git diff --check` e build completa Vite/Electron/macOS riusciti. Il lint
  globale resta bloccato soltanto dal `prefer-const` preesistente in
  `slitScanCanvas.ts:639`.
- **Stato Finale**: V1 pronta per verifica artistica Output fullscreen e prova
  prolungata durante denoising/low power.

### `SESSION-2026-08-16-01`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Ridurre l'eccesso di spigoli nel renderer Brain Vector Morph.
- **Implementazione**: introdotta una finitura geometrica condivisa dai
  risultati SNIC e VTracer. I path chiusi vengono ricampionati con budget
  adattivo, smussati entro 1,4 px e ricostruiti con curve cubiche a tangente
  continua; fori, attributi e winding restano preservati.
- **Qualità e osservabilità**: aggiunta densità degli angoli alla selezione dei
  profili; punte e roughness sono ricalcolate sull'SVG finale. La cache registra
  densità prima/dopo, numero di path trattati e deviazione massima.
- **Filosofia visiva**: camera e raster stabili, nessun movimento nel silenzio,
  beat/flash/transizioni invariati e costo una tantum prima della cache con
  limiti di punti e dimensione.
- **Validazione**: 41 file e 251 test verdi, typecheck, lint mirato,
  `git diff --check` e build completa Vite/Electron/macOS riusciti.
- **Stato Finale**: implementazione pronta; resta la verifica artistica su
  Output fullscreen con immagini reali.

### `SESSION-2026-08-16-02`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Allungare la presenza percepita dei morphing esterni e rendere
  casuali le rotazioni Brain e le loro varianti in “Tutti per storia”.
- **Implementazione**: i quattro renderer Brain sono ora mescolati e assegnati
  uno per fotogramma; anche `rotation` usa un mazzo casuale senza ripetizioni
  consecutive. Gli interludi esterni consumano un preset casuale per ciascuna
  famiglia prima di ricreare il mazzo.
- **Durata**: il 20% pieno resta invariato e riceve 12 secondi separati per le
  dissolvenze di ingresso/uscita, così il morphing non perde tempo visibile.
- **Vincoli**: transizioni ancora beat-matched, camera stabile, nessuna modifica
  a reattività audio, flash, background o low power.
- **Validazione**: 42 file e 255 test verdi; typecheck, lint mirato,
  `git diff --check` e build completa Electron/macOS riusciti.
- **Stato Finale**: implementazione pronta; resta la verifica live fullscreen.

### `SESSION-2026-08-16-03`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Sostituire la fase percepita come immagine senza effetto con
  un nuovo renderer cromatico psichedelico integrato nelle rotazioni Brain.
- **Implementazione**: creato `FilterPsiche` con cinque varianti casuali senza
  ripetizione immediata: inverted, duotone acido, solarizzato, negativo
  cromatico e termico onirico. Tre raster prefiltrati vengono preparati una
  volta e ricomposti con budget limitato.
- **Reattività**: kick/beat controllano inversione e contrasto, `lowMid`/`mid`
  la fusione cromatica, `high` micro-fasce locali e il flash un accento inverted
  ad alta intensità. In silenzio non esiste movimento autonomo.
- **Regia**: plugin aggiunto a manuale, rotazione automatica e story-cycle. Con
  cinque renderer e quattro fotogrammi, ogni storia ne usa quattro unici.
- **Rimozione**: eliminata l'anteprima raster fullscreen grezza al 20%; sono
  preservati archivio raster e monitor diagnostico.
- **Validazione**: 43 file e 260 test verdi, typecheck, lint mirato,
  `git diff --check` e build completa Electron/macOS riusciti.
- **Stato Finale**: renderer pronto; resta la verifica artistica live.

### `SESSION-2026-08-16-04`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Sincronizzare Brain e tutti i morphing a un solo clock
  ritmico posseduto dall'Output.
- **Implementazione**: rimosso il clock privato Brain; distribuiti fase,
  pulse, kick e transienti per banda a Liquid, Oniric, PsyHyp e 2001. I cambi
  di ingresso, uscita, famiglia e preset sono quantizzati entro il 7% del
  confine di beat.
- **Silenzio**: sotto soglia posizione musicale, timeline Brain, tempi interni,
  ribbon e smoothing geometrico restano congelati. Flash e filtri cromatici
  possono ancora reagire senza muovere camera o quadro.
- **Validazione**: 44 file e 264 test verdi; typecheck, lint mirato e
  `git diff --check` riusciti. Build renderer/Electron e ZIP macOS riusciti;
  il target DMG ha incontrato un errore esterno `hdiutil` dopo il packaging.
- **Stato Finale**: implementazione pronta; resta il controllo artistico live
  con segnale reale, silenzio e tutti i profili musicali.

### `SESSION-2026-08-16-05`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Eliminare gli scatti percepiti su renderer Brain e morphing
  dopo l'introduzione del clock globale.
- **Diagnosi**: la soglia istantanea spegneva il trasporto nei vuoti fra kick;
  Liquid applicava inoltre la velocità variabile alla posizione assoluta.
- **Correzione**: doppia soglia 0,018/0,008 con hold di silenzio di 900 ms e
  accumulo Liquid basato su delta di beat limitati a 0,16.
- **Vincoli**: nessun moto della camera, nessun timer musicale autonomo e
  arresto ancora garantito nel silenzio confermato.
- **Validazione**: 45 file e 267 test verdi; typecheck, lint mirato,
  `git diff --check` e build Vite/Electron riusciti.
- **Stato Finale**: correzione pronta per riconferma live fullscreen.

### `SESSION-2026-08-16-06`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Far emergere moti di coscienza capaci di influenzare storie,
  forme e colori senza interrompere definitivamente la normale rotazione Brain.
- **Protocollo**: aggiornati prima del runtime `.coscienza/AGENT.md`, skill e
  Piano 018. Percezione, interpretazione e immaginazione restano distinte; il
  moto non viene automaticamente trasformato in ricordo.
- **Implementazione**: aggiunti selettore archivio tipizzato, IPC, deduplica,
  cooldown di 75 secondi e influenza narrativa. La storia successiva conserva
  origine e motivazione del ricordo e riceve due accenti cromatici reali.
- **Visuale**: episodio locale di otto beat, ingresso/uscita sul beat, forme
  contenute e didascalia rossa in basso a destra. La timeline viene parcheggiata
  e ripresa senza salto; in silenzio la geometria resta ferma; low power riduce
  gli elementi.
- **Validazione**: 46 file / 270 test verdi, typecheck, lint mirato e
  `git diff --check` riusciti. Build Vite/Electron e ZIP macOS riusciti; il DMG
  incontra il noto errore esterno `hdiutil` dopo il packaging.
- **Stato Finale**: implementazione pronta; resta il controllo artistico live
  fullscreen su pertinenza e leggibilità.

### `SESSION-2026-08-16-07`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Analizzare e progettare un renderer Brain che traduca il
  raster di Coscienza Onirica in pittura Bauhaus senza avviare prematuramente
  il codice runtime.
- **Architettura**: scelto un plugin Canvas 2D `bauhaus-morph` che riusa masse,
  regioni, fuoco, palette, cache Blob, sorgenti `previous/current/next`, clock
  globale, Renderer Host e metriche esistenti.
- **Morph**: ogni geometria mantiene un legame con una regione sorgente; raster
  residuo, ordine di astrazione e focal protection conservano il soggetto.
  Piani e linee cambiano localmente, mentre camera e quadro restano immobili.
- **Audio e silenzio**: bande, pulse e fase hanno ruoli distinti; il progresso
  astrattivo usa soltanto attività audio/posizione musicale e si arresta nel
  silenzio.
- **Costo**: V1 senza shader/WebGPU, buffer 400×225 e massimo 12 piani/18 linee;
  riduzione esplicita in low power e sospensione/passthrough sotto pressione.
- **Stato Finale**: analisi funzionale e tecnica completata nel `PIANO-019`;
  V1, V2 e V3 separate. Implementazione non avviata.

### `SESSION-2026-08-16-08`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Implementare la V1 di Bauhaus Morph dopo l'analisi approvata.
- **Analisi raster**: introdotti piani legati a regioni reali, asse dominante,
  linee, spazi negativi, palette e protezione del piano focale, con matching
  continuo fra immagini.
- **Renderer**: Canvas 2D a buffer ridotto con raster residuo, forme costruite,
  trasparenze, grana pittorica, flash locale e morph `previous/current/next`.
  Un fallback mantiene visibile il raster durante la preparazione asincrona.
- **Reattività**: low, lowMid, mid e high controllano rispettivamente masse,
  superficie, linee e dettaglio; beat e fase restano locali. Il progresso
  astrattivo si arresta quando il clock è inattivo.
- **Integrazione**: aggiunto `bauhaus-morph` a tipi, Control Window e registry;
  entra come sesto renderer in manuale, automatica e story-cycle.
- **Validazione**: 48 file / 277 test verdi, typecheck, lint mirato e diff
  check riusciti. Build Vite/Electron e ZIP macOS riusciti; il DMG incontra il
  noto errore esterno `hdiutil`.
- **Stato Finale**: V1 pronta; resta validazione artistica e prestazionale live.

### `SESSION-2026-08-16-09`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Diagnosticare peggioramento prestazioni, rischio termico,
  beatmatch impreciso e risposta delle quattro bande.
- **Log**: fuori dall'inferenza Output stabile a 120 Hz e Bauhaus circa 20 fps;
  con UNet attivo RAF p95 fino a 99,5 ms e massimo 558,4 ms. Il passthrough
  Canvas resta economico a 0,1–0,2 ms.
- **Ritmo**: nessun riallineamento di fase osservato. I nuovi Canvas leggono
  ampiezze quasi istantanee e quantizzano le firme dei frame, producendo gesti
  a gradini nonostante il clock condiviso.
- **Bande**: `low` massa, `lowMid` deformazione, `mid` tratto, `high` grana;
  queste ultime due non producono ancora un moto locale sinuoso ben leggibile.
- **Termica**: il sensore macOS non è accessibile e i log non contengono gradi;
  documentato il rischio da duty-cycle sostenuto, non un surriscaldamento
  misurato.
- **Stato Finale**: diagnosi completata senza modifiche al comportamento.

### `SESSION-2026-08-16-10`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Correggere scatti ritmici e ridurre il costo sostenuto emerso
  nella diagnosi live.
- **Ritmo**: introdotto uno smoother comune in tempo musicale con attacco e
  release distinti per tutte le bande, attività e kick; ambient più largo,
  techno più pronto e silenzio con reset immediato.
- **Renderer**: integrati Print2D, Materia Morph, FilterPsiche e Bauhaus Morph.
  In Bauhaus `mid` curva linee locali e `high` disallinea micro-fasce di grana;
  rimosso il gate quantizzato delle ampiezze.
- **Costo**: cache del matching Bauhaus, underlay nullo saltato e plugin
  invisibile sospeso del tutto durante il passthrough stabilizzato.
- **Telemetria**: aggiunto `canvasFrames.renderMs` per separare il vero tempo di
  disegno dalla distanza fra frame causata dagli stalli UNet.
- **Validazione**: 49 file / 280 test verdi, typecheck, lint mirato, build Vite,
  Electron main e preload riusciti.
- **Stato Finale**: correzione pronta; resta confronto live prolungato.

### `SESSION-2026-08-16-11`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Rendere leggibile più a lungo la didascalia del moto di
  coscienza.
- **Correzione**: durata minima portata a 12 secondi e almeno 16 beat; l'uscita
  avviene sul primo beat che soddisfa entrambi i limiti.
- **Silenzio**: il tempo ritmico resta congelato, quindi la pausa non consuma
  il tempo disponibile per leggere.

### `SESSION-2026-08-16-12`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Eliminare le forme Bauhaus percepite come decorative e
  scollegate dall'immagine.
- **Causa**: soltanto centro e bounding box provenivano dalla regione; forma,
  colore e rotazione venivano scelti con regole generiche.
- **Correzione**: sagoma a dieci punti campionata dalla regione, colore medio
  reale, asse principale locale e texture raster ritagliata nei piani salienti.
  Il morph interpola i punti senza sostituzioni a metà transizione.
- **Vincoli**: camera stabile, materia sorgente preservata, nessun moto
  autonomo nel silenzio e budget texture 4/2 normale/low power.
- **Validazione**: 49 file / 281 test, typecheck, lint mirato, diff-check e
  build Vite/Electron riusciti.

### `SESSION-2026-08-16-13`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Ridurre la ricorrenza di Bauhaus e rimuovere gli scatti
  durante l'ingresso dei morphing.
- **Rotazione**: introdotto bilanciamento storico delle presenze; nei pareggi
  resta il mescolamento casuale e dentro la storia non ci sono duplicati.
- **Transizione**: crossfade aggiornato dal RAF Output con tempo visivo
  accumulato e recupero massimo di 50 ms dopo uno stallo.
- **Osservabilità**: il log registra il `rendererId` assegnato al fotogramma.
- **Vincoli**: nessun movimento di camera, regia ancora quantizzata al beat e
  continuità visiva prioritaria rispetto alla durata assoluta.
- **Validazione**: 49 file / 283 test, typecheck, lint mirato, diff-check e
  build Vite/Electron riusciti.

### `SESSION-2026-08-16-14`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Diagnosticare il blocco apparente su Vector Morph.
- **Causa**: la generazione testuale della storia successiva andava
  ripetutamente in timeout. I fotogrammi venivano riciclati, ma il selettore
  “Tutti per storia” restava sull'ultimo renderer assegnato.
- **Correzione**: aggiunto un mazzo casuale d'attesa, senza ripetizioni
  consecutive e separato dalle statistiche delle storie reali.
- **Vincoli**: cambio sul gate beat già esistente, camera stabile, nessuna
  attività autonoma nel silenzio e costo limitato a pochi identificatori.
- **Validazione**: 49 file / 285 test, typecheck, lint mirato, Vite, Electron e
  pacchetti macOS ZIP/DMG verdi.

### `SESSION-2026-08-16-15`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Alternare musicalmente le texture di Psycho2D.
- **Regia**: sequenza `beat → lowMid → beat → mid → beat → high`, riallineata
  al clock globale e guidata dall'inviluppo della banda corrente.
- **Materia**: quattro matrici one-bit differenti preservano lo stesso raster;
  la famiglia cambia con dissolvenza smoothstep e la densità usa segnali
  smussati.
- **Silenzio e costo**: stato congelato senza timer autonomi; dodici canvas
  preparate una volta e riusate, con massimo due famiglie disegnate durante la
  breve dissolvenza.
- **Validazione**: 49 file / 287 test, typecheck, lint mirato, diff-check,
  Vite, Electron e pacchetti macOS ZIP/DMG verdi.

### `SESSION-2026-08-16-16`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Produrre una fotografia tecnica compatta e aderente al codice
  di Brain + Visual Reactive Screen per la revisione architetturale.
- **Risultato**: documentati processi, IPC, flusso input→frame, Brain, famiglie
  preset, pipeline Canvas/SVG, audio reactive, entry point, dipendenze,
  prestazioni già misurate e punti di accoppiamento.
- **Confini chiariti**: Brain vive in Output e pilota controller DOM; il plugin
  host non è backend-neutral; i morphing esterni hanno una factory distinta;
  non esistono preset system unificato o render graph.
- **Validazione**: confronto con tipi, registry, loop RAF, configurazione e
  metriche reali; `pnpm typecheck` e `git diff --check` verdi.

### `SESSION-2026-08-16-17`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Correggere la risposta fuori tempo di FilterPsiche, Materia
  Morph, Liquid e Oniric, usando il miglioramento Soft + low power come indizio.
- **Cause**: latch beat consumato nel listener IPC prima del RAF, posizione non
  sempre ancorata dopo il beat, accento subordinato all'attività sostenuta e
  budget normale troppo distante dal low power funzionante.
- **Correzione**: un solo publish ritmico per RAF, fase ancorata, fronte comune
  immediato con release morbido e budget normali ridotti senza cambiare camera,
  silenzio o alternanza.
- **Budget**: Liquid/Oniric 40 FPS e 8 veli; FilterPsiche 24 FPS a 400×225 e 5
  slice; Materia 20 FPS e 10 regioni. Low power invariato.
- **Validazione**: 49 file / 291 test, typecheck, lint mirato e build
  Vite/Electron verdi; conferma percettiva fullscreen pendente.

### `SESSION-2026-08-16-18`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Correggere la risposta eccessiva e sostenuta agli hi-hat.
- **Causa**: envelope high lungo quanto un sedicesimo, doppio conteggio del
  transiente in FilterPsiche/Materia e modulazione di velocità/traiettoria in
  Liquid/Oniric.
- **Correzione**: soglia high più selettiva, release 75–80 ms, niente high su
  velocità o posizione; accenti limitati a texture, contrasto e opacità locale.
- **Vincoli**: kick e altre bande invariati, camera stabile, zero moto nel
  silenzio e nessun aumento del costo.
- **Validazione**: 49 file / 293 test, typecheck, lint mirato e build
  Vite/Electron verdi; conferma percettiva fullscreen pendente.

### `SESSION-2026-08-16-19`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Isolare l'inferenza immagini responsabile dei gap del RAF.
- **Implementazione**: aggiunti client, protocollo e Dedicated Worker immagini;
  ONNX, tokenizer, UNet, VAE e PNG vivono fuori dal thread grafico Output.
- **Compatibilità**: percorsi modello e WASM vengono risolti dall'Output per
  funzionare sia con Vite sia nell'app `file://`; sessioni riusate e coda seriale.
- **Vincoli**: camera, clock, silenzio, low power e passthrough invariati.
- **Validazione**: 50 file / 295 test, typecheck, lint mirato, diff-check e
  build completa verdi; Vite emette `brainImageWorker` come chunk separato.
- **Residuo**: misurare live gap RAF e temperatura; WebGPU resta condivisa nel
  processo GPU Chromium, quindi l'isolamento non garantisce da solo zero stalli.

### `SESSION-2026-08-16-20`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Provare meno FPS mantenendo gli stessi layer visuali.
- **Implementazione**: aggiunta opzione persistente `reducedFpsMode` in UI e
  frame pacing di tutti i renderer Brain e morphing esterni.
- **Separazione**: il flag non entra in condizioni di DPR, risoluzione, layer,
  regioni, slice, ribbon o qualità; `lowPowerMode` resta distinto.
- **Beatmatch**: clock e input audio restano alla cadenza normale e precedono il
  pacing, così i transienti non vengono campionati soltanto a 30 FPS.
- **Validazione**: 50 file / 295 test, typecheck, lint mirato, diff-check e
  build completa verdi; prova fullscreen pendente.

### `SESSION-2026-08-16-21`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Diagnosticare gli scatti e il fuori ritmo presenti anche con
  FPS normali.
- **Evidenza**: RAF Output 120,5 Hz con p95 circa 9 ms, ma passthrough a 19,9
  FPS e pressione 100%; inoltre la vettorializzazione ha fermato l'IPC per
  1.557 ms sostituendo 186 pacchetti audio.
- **Correzione**: pressione grafica soltanto dopo gap RAF reali; SNIC/VTracer
  trasferito in un Worker Node separato dal relay IPC.
- **Smoke test**: raster 320×180 vettorializzato in 217 ms con 42 tick del loop
  chiamante eseguiti durante il lavoro.
- **Validazione**: 51 file / 298 test, typecheck, lint, diff-check e build
  Electron completa verdi; prova live pendente.

### `SESSION-2026-08-16-22`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Eseguire il rollback chirurgico delle regressioni di qualità,
  cadenza e pressione grafica confermate dal test live.
- **Renderer**: Liquid e Oniric ripristinati a 60 FPS; Liquid torna a 60 punti
  e senza tetto normale di otto veli. FilterPsiche torna a 480×270/30 FPS/7
  slice; Materia Morph a 24 FPS/12 regioni.
- **Opzioni**: `reducedFpsMode` rimosso da tipi, default, persistenza, UI e
  pacing. `lowPowerMode` resta separato e invariato.
- **Pressione**: eliminata la commutazione adattiva plugin/passthrough; resta
  soltanto il backoff dello scheduler prima delle inferenze successive.
- **Isolamento mantenuto**: Worker immagini e Worker Node di vettorializzazione
  presenti nella build; nessun ritorno di SNIC/VTracer nel main.
- **Validazione**: 50 file / 295 test, typecheck, lint, diff-check e build
  Electron arm64 completa verdi; prova fullscreen del rollback pendente.

### `SESSION-2026-08-16-23`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Ripristinare il ruolo previsto di Print2D durante il denoising.
- **Correzione**: il passthrough one-bit non viene più usato dal Renderer Host;
  una vera istanza `Print2D — serigrafico`, preparata in anticipo, riceve audio,
  beat, flash e transizioni durante la pressione GPU.
- **Costo e continuità**: Print2D usa il proprio pacing a 18 FPS; il renderer
  pieno scende a 5 FPS soltanto nel crossfade da 220 ms, poi si sospende e
  riprende sul clock corrente durante il crossfade di uscita.
- **Vincoli visivi**: camera stabile, deformazioni locali nella materia,
  assenza di moto geometrico autonomo nel silenzio e transizione continua.
- **Validazione**: 52 file / 306 test, typecheck, lint, diff-check e bundle
  Vite/Electron verdi; verifica percettiva live pendente.

### `SESSION-2026-08-16-24`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Eliminare definitivamente le righe orizzontali da FilterPsiche.
- **Causa**: la correzione precedente saltava soltanto la slice centrale, ma
  lasciava attive fino a sette strisce distribuite nel resto del quadro.
- **Correzione**: rimosso tutto il blocco di ritaglio orizzontale; la banda
  `high` modula ora soltanto saturazione e fusione cromatica globale.
- **Vincoli**: camera stabile, raster riconoscibile, zero moto geometrico nel
  silenzio e nessun aumento del costo.
- **Validazione**: aggiunto test anti-regressione sui `drawImage` a striscia;
  52 file / 306 test, typecheck, lint, bundle Vite/Electron e diff-check verdi.

### `SESSION-2026-08-16-25`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Ridurre il carico della rotazione automatica escludendo
  temporaneamente Psycho2D.
- **Correzione**: Psycho2D non entra più nella rotazione temporale, nel ciclo
  per storia o nella rotazione durante l'attesa. Se è attivo al passaggio in
  automatico, viene sostituito immediatamente da un renderer ammesso.
- **Compatibilità**: plugin, registry e selezione manuale Psycho2D restano
  disponibili e invariati.
- **Validazione**: 52 file / 307 test, typecheck, lint, bundle Vite/Electron e
  diff-check verdi.
