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
- **Obiettivo**: Chiudere i task performance prima del test manuale del
  Capo Supremo.
- **Attività Svolte**:
  1. Verificato che `TASK-006-01`–`TASK-006-16` siano tutti `DONE`.
  2. Confermata la chiusura di `PIANO-004`, `PIANO-006` e `PIANO-007`.
  3. Spostato `MACRO-006` fra i macrotask completati.
  4. Registrato il test manuale come verifica esterna, non come implementazione
     ancora aperta.
  5. Preservati gli aggiornamenti paralleli di `MACRO-008`.
- **Validazione Disponibile**: 200/200 test, typecheck, lint mirato, build
  Vite/Electron e `git diff --check` superati nella sessione precedente.
- **Stato Finale**: 🟢 `MACRO-006` chiuso. Prossimo passo: test manuale del
  Capo Supremo.

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

### `SESSION-2026-08-16-26`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Impedire definitivamente la presenza runtime di Psycho2D.
- **Causa residua**: l'esclusione dal mazzo automatico lasciava il plugin nel
  registry e nella selezione UI, permettendo richieste e istanze già attive.
- **Correzione**: rimossa la registrazione runtime e l'opzione UI; una vecchia
  preferenza persistita ricade su Print2D. Sorgenti e tipo restano conservati.
- **Impatto**: bundle Output ridotto da circa 288,55 kB a 274,72 kB.
- **Validazione**: 52 file / 307 test, typecheck, lint, bundle Vite/Electron e
  diff-check verdi.

### `SESSION-2026-08-16-27`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Correggere il renderer rimosso dopo identificazione visiva.
- **Evidenza**: la schermata retinata era Print2D `chromatic-cutout`; il log
  precedente confermava `rendererId: print2d` e `denoising-print2d: active`.
- **Correzione**: Print2D escluso da tutti i cicli automatici; Psycho2D
  ripristinato nel registry e nella UI. FilterPsiche sostituisce Print2D nella
  visuale leggera del denoising a 320×180/12 FPS sotto pressione.
- **Verifica live**: nuovo log con `rendererId: material-morph` e
  `denoising-filter-psiche: active`; nessuna nuova assegnazione Print2D.
- **Validazione**: 52 file / 307 test, typecheck, lint, bundle Vite/Electron e
  diff-check verdi.

### `SESSION-2026-08-16-28`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Ripristinare la dinamica musicale visibile di FilterPsiche
  dopo la rimozione completa delle slice orizzontali.
- **Causa**: il canvas continuava a renderizzare, ma i blend a pieno quadro,
  molto saturi e quasi invarianti, rendevano la risposta percettivamente
  statica.
- **Correzione**: beat/kick modulano luminosità e inversione breve, `lowMid`
  orienta la palette, `mid` il contrasto e `high` saturazione/separazione. La
  fase ritmica cambia soltanto la direzione cromatica.
- **Vincoli**: nessuna traslazione, scala o rotazione; nessuna riga; nel
  silenzio i valori tornano neutri; invariati FPS, risoluzione e buffer.
- **Validazione**: 52 file / 309 test, typecheck, lint, bundle Vite/Electron e
  diff-check verdi; conferma percettiva fullscreen ancora richiesta.

### `SESSION-2026-08-16-29`
- **Data**: 16 Agosto 2026 (CEST)
- **Obiettivo**: Correggere il contenuto del riquadro del moto di coscienza e
  ridurre i renderer geometrici nella modalità “Tutti per storia”.
- **Riquadro**: rimossi i tre nuclei radiali sintetici; viene scelto un raster
  diverso da quello corrente fra le quattro immagini del gruppo attivo.
- **Dinamica**: il raster incastonato resta fermo e riceve soltanto variazioni
  locali di contrasto, saturazione e opacità sul beat; nel silenzio non avanza.
- **Regia**: Bauhaus Morph è escluso dal mazzo “Tutti per storia”, senza essere
  rimosso dalla selezione manuale o dalla rotazione temporale generale.
- **Costo**: nessuna generazione o copia raster aggiuntiva; usato un object URL
  del Blob già presente nel buffer e revocato al cleanup.
- **Validazione**: 52 file / 310 test, typecheck, lint, bundle Vite/Electron e
  diff-check verdi; prova percettiva fullscreen pendente.

### `SESSION-2026-08-17-01`
- **Data**: 17 Agosto 2026 (CEST)
- **Obiettivo**: Correggere l'esclusione di Print2D e verificare lo stato di
  Psycho2D dopo richiesta esplicita del Capo Supremo.
- **Correzione**: `AUTOMATICALLY_EXCLUDED_RENDERERS` svuotato in
  `brainRendererSelector.ts`; Print2D torna nella rotazione temporale generale
  e nel ciclo d'attesa, restando escluso soltanto da `STORY_CYCLE_EXCLUDED_RENDERERS`
  ("Tutti per storia", insieme a Bauhaus Morph).
- **Verifica Psycho2D**: registry, UI, rotazione, ciclo per storia e attesa
  risultavano già interamente ripristinati dalla correzione precedente
  (`SESSION-2026-08-16-27`); nessuna modifica necessaria.
- **Test aggiornati**: riscritti i due test di `brainRendererSelector.test.ts`
  che presupponevano l'esclusione automatica di Print2D.
- **Validazione**: 52 file / 310 test, typecheck e lint verdi (build non
  rieseguita in questa sessione).

### `SESSION-2026-08-17-02`
- **Data**: 17 Agosto 2026 (CEST)
- **Obiettivo**: Escludere Liquid Morphing e 2001 Slit-Scan dall'interludio
  "Tutti per storia" e diagnosticare un renderer percepito come dominante.
- **Morphing**: rimossi `'liquid'` e `'2001'` da `MORPHING_FAMILIES` in
  `morphingRotation.ts`; `buildMorphingInterludeDeck` ora sceglie solo fra
  Oniric e PsyHyp durante l'alternanza Brain+Morphing.
- **Diagnosi log**: analizzati `log/session-2026-08-17-21-38-39.txt` e
  `log/session-2026-08-17-00-19-11.txt`. Trovate due cause strutturali nel
  bilanciamento del mazzo "Tutti per storia" in `brainRendererSelector.ts`:
  1. `closeStoryUsage` contava le presenze per storia (+1 flat) invece dei
     fotogrammi realmente occupati, così i renderer persistenti (FilterPsiche,
     Materia Morph, Vector Morph, 2–4 fotogrammi) risultavano sotto-penalizzati
     rispetto a quelli a fotogramma singolo (Print2D, Psycho2D) pur occupando
     più tempo reale a schermo.
  2. Il riposizionamento che garantisce FilterPsiche in prima posizione
     scambiava (swap) due elementi del mazzo: quando il renderer meno mostrato
     finiva in prima posizione dopo l'ordinamento per peso, lo scambio lo
     spediva in fondo al mazzo (nella vecchia posizione di FilterPsiche)
     invece di scorrerlo semplicemente di una posizione, penalizzandolo
     ulteriormente nelle storie successive.
- **Correzione**: `currentStoryVisited` ora traccia i fotogrammi mostrati per
  renderer (non un flag booleano) e `closeStoryUsage` somma quel peso;
  aggiunta `moveDeckEntry` che sposta FilterPsiche (e l'eventuale renderer a
  fotogramma singolo) senza alterare l'ordine relativo degli altri elementi
  del mazzo.
- **Nota collaterale**: individuate due istanze Electron `pnpm dev` attive
  contemporaneamente (una aperta questa notte all'1:19, una nuova) come
  possibile ulteriore causa di contesa GPU/thermal; segnalato al
  Capo Supremo senza intervenire.
- **Test aggiunti**: nuovo test di regressione in
  `brainRendererSelector.test.ts` che riproduce lo scenario diagnosticato e
  verifica che il renderer meno mostrato riceva il suo turno in ogni storia.
- **Validazione**: 52 file / 311 test, typecheck e lint verdi (build non
  rieseguita in questa sessione).

### `SESSION-2026-08-17-03`
- **Data**: 17 Agosto 2026 (CEST)
- **Obiettivo**: Ridurre il lag percepito in modalità normale rispetto al
  basso consumo, rispettando il protocollo di verifica filosofia visiva.
- **Verifica preliminare**: le due istanze Electron `pnpm dev` concorrenti
  segnalate nella sessione precedente non erano più attive (una sola istanza,
  avviata alle 22:01); esclusa come causa attuale.
- **Diagnosi log**: analizzato `log/session-2026-08-17-22-01-28.txt`.
  `outputRaf` mostra spike ricorrenti (233–400 ms) coincidenti con le fasi di
  denoising anche fuori pressione severa. Causa individuata:
  `imageInferenceCooldownMs` (pausa fra inferenze UNet successive) era 6 s in
  modalità normale contro i 12 s della modalità a basso consumo, cioè la GPU
  riceve un nuovo carico di denoising il doppio delle volte.
- **Correzione**: `imageInferenceCooldownMs` portato da 6 000 a 9 000 ms in
  `brainConfig.ts`. Nessun renderer visivo toccato: FPS, layer, risoluzione,
  mazzo "Tutti per storia" invariati. Verificato che il cambio non tocca
  camera, materia, silenzio, beatmatch o transizione.
- **Verifica live pendente**: confermare se lo scarto normale/basso-consumo
  si riduce a sufficienza in una sessione prolungata.
- **Validazione**: 52 file / 311 test, typecheck e lint verdi (build non
  rieseguita in questa sessione).

### `SESSION-2026-08-27-01`
- **Data**: 27 Agosto 2026 (CEST)
- **Obiettivo**: PIANO-040 (Stato bio-percettivo), Fase 1 — modulo puro
  `brainBioPerception.ts`: tipi, inviluppi fast/mid, persistence/change/
  perceptualPressure/pressureTrend, con le quattro correzioni del Capo Supremo
  dell'Analisi Audio già recepite nel piano prima di iniziare.
- **Incidente evitato**: il piano indicava `brainPerception.ts` come nome del nuovo
  modulo — nome già occupato da `BrainPerceptionEngine` (analisi materica
  frame-a-frame, wired in `brainSvgScene.ts`), estraneo a questo lavoro. Sovrascritto
  per errore, individuato subito e ripristinato via `git checkout` prima di qualunque
  commit. Il nuovo modulo è stato rinominato `brainBioPerception.ts`, simboli
  prefissati `BrainBio*`; il piano è stato corretto per riflettere il nome reale.
- **Bug trovato e corretto in corso d'opera**: la prima formula di
  `calculateSpectralOccupancy` (pavimento relativo alla media mobile di ciascuna banda
  presa singolarmente) falliva sul controesempio esplicito dell'Audio — un segnale
  concentrato su una sola banda (`.8/.1/.1/.1`) risultava "occupato al 100%" perché
  ogni banda era stabile rispetto a sé stessa, non perché portasse energia reale.
  Corretto usando un pavimento relativo all'energia sostenuta complessiva, stesso
  principio già in uso in `activeBands` del modulo `BrainPerceptionEngine` esistente.
- **Decisioni non previste dal piano, registrate con motivazione** (nel codice e nel
  registro di PIANO-040 §7): distanza L1 pesata per banda per persistence/change (non
  coseno — il coseno ignorerebbe il livello assoluto); occupazione temporale dal gap
  fra transient (`bandTransients` esistente, nessuna feature audio nuova); pesi
  0.4/0.35/0.25 per `perceptualPressure`; zona morta ±0.06 e conferma 1.5s per
  `pressureTrend` — tutte dichiarate "da tarare all'ascolto".
- **Stato**: Task 1.1/1.2 completati e verdi (9/9 test), `residual` e la macchina a
  stati di `reference` non ancora implementati (Task 1.3/1.4, prossimi). Vedi
  `working/STATE.md` per il punto di ripresa esatto.
- **Validazione**: `pnpm typecheck` pulito, `brainBioPerception.test.ts` 9/9 verdi.
  Suite completa e build non ancora rieseguite in questa sessione (fine Fase 1).

### `SESSION-2026-08-27-02`
- **Data**: 27 Agosto 2026 (CEST)
- **Obiettivo**: PIANO-040, completamento Fase 1 — Task 1.3 (macchina a stati di
  `reference`), 1.4 (`residual`), 1.5 (macchina a stati del regime a 5 valori), 1.6
  (classe `BrainBioPerceptionClock`).
- **Bug trovato e corretto in due tentativi durante lo sviluppo di Task 1.6** (non a
  verifica finale): con `reference` catturata al primo campione (1° correzione:
  inizializzata al vettore silenzioso invece), un segnale reale ma poco energico
  produceva un `change` che convergeva asintoticamente sotto la soglia di invalidità
  (0.35) — la macchina a stati restava bloccata per sempre con `reference` ancora a
  zero, impedendo di raggiungere `stable-breath` per qualunque materiale rarefatto.
  Causa vera: usare "silenzio" come mondo di riferimento valido, misurato con una
  soglia assoluta di invalidità che un segnale a bassa energia non può mai superare per
  costruzione. Corretto facendo partire la macchina già in `awaiting-confirmation` al
  costruttore: nessun mondo precedente da invalidare, si va dritti alla conferma del
  primo stato coerente qualunque sia la sua energia assoluta.
- **Incidente serio, non causato da questa sessione**: dopo il completamento della
  Fase 1 (32/32 test verdi), un reset esterno ha riportato l'intero albero di lavoro
  al commit pulito del branch, cancellando tutti i file non committati — modulo,
  test, questo piano, `STATE.md`, `session-history.md`, entrambi i brief. Segnalato
  immediatamente al Capo Supremo invece di essere aggirato o ricostruito in silenzio;
  il Capo Supremo ha confermato il ripristino e richiesto di procedere.
- **Verifica post-ripristino**: contenuto identico al pre-incidente, più una
  correzione minore trovata alla riverifica (`movingAverages`, parametro morto in
  `ingestSample`, mai letto da nessuna formula — rimosso).
- **Stato**: Fase 1 di PIANO-040 completa. Prossimo: Fase 2 (wiring in
  `brainController.ts` e consumer). Vedi `working/STATE.md`.
- **Validazione**: `brainBioPerception.test.ts` 32/32 verdi, `pnpm typecheck` pulito,
  suite completa del repo **62 file / 538 test verdi**. Build non rieseguita in
  questa sessione (non necessaria per questo piano — nessun tipo attraversa
  IPC/main/preload, verificato in PIANO-040 §14 Task 4.3).

### `SESSION-2026-08-27-03`
- **Data**: 27 Agosto 2026 (CEST)
- **Obiettivo**: PIANO-040, Fase 2 (wiring) — collegare `BrainBioPerceptionClock` al
  resto di Brain.
- **Correzione di architettura scoperta durante l'implementazione**: il piano
  assumeva che il clock ritmico vivesse in `brainController.ts`; in realtà vive in
  `OutputApp.tsx` (istanziato e alimentato nel punto di ingest IPC). Il clock
  bio-percettivo è stato collocato di conseguenza nello stesso file, non dove il piano
  indicava — coerente con l'intento del brief ("accanto a rhythm"), diverso solo nel
  file fisico.
- **Wiring completato**: `bioPerceptionSource` filtrato da `OutputApp.tsx` a
  `createBrainController` (stesso pattern di `rhythmSource`); `setPerception?`
  opzionale su `BrainSceneRendererController`, propagato solo quando lo stato cambia
  identità e forzato al primo frame di ogni renderer nuovo; `getBioRegime` iniettato
  in `BrainRendererSelector` e `createBrainRendererHost` (nuovo parametro in coda,
  nessuna firma esistente rotta); esclusione Psycho2D/Fractal Spiral/Print2D per
  regime **mai bypassata dal boost della Riattivazione** (brief §13/§14 — il regime
  vince sempre sull'evento tecnico); hold Riattivazione differenziato per regime
  (tabella §17.1); rete di sicurezza regime-aware; log di osservabilità su cambio
  regime.
- **8 nuovi test, tutti verdi al primo tentativo** — nessun bug trovato in questa
  fase (diversamente dalla Fase 1, dove ne erano emersi due reali).
- **Stato**: Fase 2 di PIANO-040 completa. Prossimo: Fase 3, consumer
  Dream-Segmentation (`setPerception()` + `regimeMultiplier` sulle tre soglie
  esistenti, accumulatore intoccato). Vedi `working/STATE.md`.
- **Validazione**: `pnpm typecheck` pulito, suite completa **62 file / 546 test
  verdi**. Build non rieseguita (non necessaria, verificato in PIANO-040 §14 Task 4.3).

### `SESSION-2026-08-27-04`
- **Data**: 27 Agosto 2026 (CEST)
- **Obiettivo**: PIANO-040, Fase 3 — Dream-Segmentation come primo consumer reale
  del livello bio-percettivo.
- **Implementazione**: `setPerception()` e `calculateDreamRegimeMultiplier(regime)`
  applicato a `MINIMUM_DWELL_MS`/`MINIMUM_TRANSFORMATION_MS`/`GHOST_LIFESPAN_MS` — le
  tre soglie già esistenti indicate dal brief §11, mai l'accumulatore di sorpresa.
  Moltiplicatori di primo collaudo: 1.0 (pressurized/unresolved/nessuno stato,
  invariante §6), 1.4 (decompression), 2.0 (stable-breath).
- **Invariante verificato per costruzione, non solo con i test**: i 30 test esistenti
  del renderer, nessuno dei quali chiama `setPerception`, restano verdi senza alcuna
  modifica — a moltiplicatore 1.0 le tre funzioni pure ricevono esattamente
  l'argomento di default di prima.
- **5 nuovi test**, tutti verdi al primo tentativo — nessun bug trovato in questa
  fase (a differenza della Fase 1).
- **PIANO-040: codice completo (Fasi 1, 2, 3).** Resta solo il Task 4.4 — collaudo
  dal vivo, non eseguibile da un agente. Nessun test verde chiude questo piano
  (criterio esplicito del brief §19); un esito negativo (solo "modalità lenta"
  indistinta) è dichiarato accettabile.
- **Validazione**: `pnpm typecheck` pulito, `pnpm lint` pulito sui file toccati, suite
  completa **62 file / 551 test verdi**. Build non necessaria (verificato, nessun tipo
  attraversa IPC/main/preload).

### `SESSION-2026-08-27-05`
- **Data**: 27 Agosto 2026 (CEST)
- **Obiettivo**: PIANO-040, richiesta esplicita del Capo Supremo dopo la Fase 3 —
  "non soluzioni, etichette a schermo": overlay diagnostico per vedere in tempo reale,
  durante l'ascolto, cosa sta facendo il livello bio-percettivo.
- **Implementazione**: pannello in alto a destra in `OutputApp.tsx`, disattivato di
  default, Maiusc+B per accendere/spegnere. Mostra regime, i cinque segnali con
  valore, `pressureTrend` con freccia, renderer attivo, moltiplicatore
  Dream-Segmentation applicato in quel momento, istante dell'ultimo cambio di regime
  (orario assoluto) e contatore dei cambi. Aggiornamento in tempo reale allo stesso
  ingest audio del clock bio-percettivo; renderer/moltiplicatore letti ogni 250ms
  dallo stesso poll DOM già in uso per `activeRendererLabel` — nessun meccanismo
  nuovo. Font grande (20-26px) per leggibilità a distanza su proiettore. Un'unica
  inversione monocroma (bianco/nero) per 2.5s al cambio regime, nessun color-coding
  per stato — rispettato il vincolo esplicito "niente colore".
- **Un solo file di produzione toccato oltre a `OutputApp.tsx`**:
  `brainDreamSegmentationCanvas.ts`, una riga — il moltiplicatore già calcolato viene
  scritto come attributo diagnostico sul canvas, nessuna modifica di comportamento.
- **Nessuna correzione al comportamento**, come richiesto esplicitamente: nessun
  nuovo moltiplicatore, nessun nuovo regime, nessuna nuova logica.
- **Stato**: PIANO-040 — codice e overlay diagnostico completi. Resta solo il Task
  4.4 (collaudo dal vivo), ora con uno strumento a schermo oltre al log. **Attenzione
  per chi gestisce il prossimo set live**: l'overlay è un toggle a runtime (Maiusc+B),
  non un flag di build — va verificato che sia spento prima di andare in scena.
- **Validazione**: `pnpm typecheck` pulito, `pnpm lint` pulito sui file toccati, suite
  completa **62 file / 551 test verdi** (nessun nuovo test: overlay è wiring/JSX, non
  logica pura, stessa convenzione di `OutputApp.test.ts`).

### `SESSION-2026-08-27-06`
- **Data**: 27 Agosto 2026 (CEST)
- **Obiettivo**: PIANO-040, due correzioni all'overlay diagnostico segnalate subito
  dopo il primo utilizzo — "non vedo nulla a video" e poi "un tag a sinistra o centro
  che non si sovrapponga agli altri".
- **Bug 1 — il toggle non arrivava mai a destinazione**: Maiusc+B era un `keydown`
  sul solo renderer Output. Nella configurazione reale a due finestre l'Output è
  fullscreen sul proiettore e quasi mai ha il fuoco della tastiera — chi opera il set
  preme il tasto guardando Control, non Output. Corretto registrando la combinazione
  a **livello OS** (`globalShortcut` in `src/main/windows.ts`, attivo solo mentre la
  finestra Output esiste, deregistrato alla sua chiusura), che invia un IPC dedicato
  a Output. Nuovo canale minimo `fx:toggle-bio-overlay` in `IPC_CHANNELS`/`OutputApi`
  (shared/preload), stesso schema di `onPublicOnlinePhrase` già esistente. Il
  `keydown` locale resta come fallback innocuo.
- **Correzione 2 — posizione**: spostato da "in alto a destra" a **in alto al
  centro**, per non rischiare sovrapposizioni e per una lettura più naturale.
- **Prima volta in questo piano che il codice attraversa `main`/`preload`**: rieseguito
  `vite build` (non solo typecheck/test) e verificato pulito su tutti e tre i bundle
  (renderer, main, preload).
- **Stato**: overlay diagnostico corretto e verificato. PIANO-040 resta in attesa del
  solo Task 4.4 (collaudo dal vivo).
- **Validazione**: `pnpm typecheck` pulito, `pnpm lint` pulito sui file toccati, suite
  completa **62 file / 551 test verdi**, `vite build` pulito (renderer + main +
  preload).

### `SESSION-2026-08-27-07`
- **Data**: 27 Agosto 2026 (CEST)
- **Obiettivo**: PIANO-040, ritaratura di `pressureTrend`/`residual`/soglie richiesta
  dal Capo Supremo dell'Analisi Audio dopo il primo collaudo dal vivo — le due
  velocità (regime lento, livello intermedio) erano troppo distanti.
- **Bug di modello trovato in `pressureTrend`, non solo taratura**: verificato
  analiticamente prima di scrivere codice che il confronto a due EMA (anche con
  costanti proprie, non più legate a `mid`) attenua strutturalmente il confronto
  "adesso vs 3-4s fa" richiesto dall'Audio — uno scalino di 0.07 (il centro esatto
  del range "falling" indicato) produceva al massimo 0.031 di scarto fra le due EMA,
  sotto qualunque zona morta ragionevole: non classificabile mai come "falling",
  qualunque fosse la soglia. Sostituito con una vera linea di ritardo (coda di
  campioni con timestamp, riferimento = il più vecchio ancora entro ~3.5s) — un
  confronto raw, non attenuato. Filtro anti-transient spostato dal tau di smoothing
  (che avrebbe rallentato anche la risposta a un movimento vero) al tempo di conferma
  (3s, non cumulativo): verificato empiricamente che un calo di 0.07 sostenuto
  conferma "falling" a ~3.4s, un blip di 1.5s che rientra non conferma mai.
- **Isteresi del regime**: scorporata da `BIO_PERCEPTION_MID_TAU_MS` (10s) a costante
  propria (4s) — cambio regime confermato ora in ~10-11s (era ~20s), verificato che
  una decompressione di 5.2s non lo cambi mai (struttura a due velocità confermata).
- **Soglia `perceptualPressure` alta**: 0.65→0.60 — il caso segnalato dall'Audio
  (`pressure 0.64`) ora classifica correttamente come area alta.
- **`residual` — correzione semantica, non solo taratura**: aggiunto un innesco di
  rilascio indipendente dal gate di persistence (su `pressureTrend=falling` o calo
  ≥0.10 da un plateau recente tracciato ad hoc), che prevale su di esso — prima
  restava fisso a 1.00 con persistence alta anche durante un'apertura evidente.
  Carica resa esponenziale con tau 150s (prima lineare, saturava in pochi secondi):
  la saturazione a 1.00 ora è davvero rara.
- **Overlay**: aggiunta la riga "in attesa → regime (Xs/Ys)" richiesta dal braccio
  destro — nuovo `getRegimeDiagnostics()` sul clock, sola lettura.
- **Segnalato ma non affrontato**, per indicazione esplicita del braccio destro ("da
  valutare dopo il prossimo collaudo, non adesso"): nessun renderer consuma i
  segnali continui direttamente — solo Dream-Segmentation, e solo tramite il
  `regime`. Una decompressione breve resta invisibile a schermo salvo l'overlay.
- **Stato**: PIANO-040 ritarato, in attesa del prossimo collaudo dal vivo. Nessun
  altro consumer toccato: `brainController.ts`, `brainRendererSelector.ts`,
  `brainRendererHost.ts`, `brainDreamSegmentationCanvas.ts` consumano `regime`/
  `signals` esattamente come prima.
- **Validazione**: `pnpm typecheck` pulito, `pnpm lint` pulito, suite completa **62
  file / 559 test verdi** (`brainBioPerception.test.ts` 32→40 test), `vite build`
  pulito.

### `SESSION-2026-08-27-08`
- **Data**: 27 Agosto 2026 (CEST)
- **Obiettivo**: PIANO-040, addendum filosofico del Capo Supremo dell'Analisi Audio —
  relatività percettiva della pressione rispetto alla mediana dinamica del set.
  Revisione semantica, non taratura: `pressureTrend` sostituisce completamente il
  modello a derivata temporale (linea di ritardo) della sessione precedente.
- **Implementazione**: mediana del set aggiornata a passo costante (non EMA — resiste
  agli outlier per costruzione, verificato con test dedicato: un kick isolato a 1.0
  sposta la mediana di <0.001, un bias sostenuto per 5 minuti la sposta invece in modo
  sostanziale). Banda adattiva derivata dalla variabilità osservata (scarto medio
  assoluto dalla mediana). Bootstrap come rampa continua (smootherstep, 180s), non tre
  interruttori. `classifyRawBioRegime` riscritta: legge solo `pressureTrend` come
  criterio primario, le vecchie soglie assolute di pressione rimosse dalla
  classificazione, la regione centrale (`stable`) non produce più `UNRESOLVED` come
  esito normale (bug segnalato dal collaudo precedente, ora risolto).
- **Bug d'interazione trovato e corretto durante l'implementazione stessa**: il
  trigger di rilascio di `residual` su `pressureTrend='falling'` (aggiunto nella
  sessione precedente) sarebbe rimasto perennemente attivo per l'intera durata di un
  lungo passaggio sotto la mediana del set, impedendo per sempre la carica —
  esattamente l'opposto dell'invariante originario dell'Audio. Rimosso; resta solo il
  calo dal plateau locale, genuinamente transizionale.
- **Decisione esplicitamente richiesta e scritta** (non deducibile dal codice): un
  campione con `perceptualPressure < 0.02` (silenzio, pausa, cambio traccia) non entra
  nella storia della mediana; il tempo del set continua comunque a scorrere per il
  bootstrap (decisione deliberata, non effetto collaterale).
- **Documentazione richiesta esplicitamente dal brief**: testo integrale salvato in
  `team/briefs/brief-relativita-percettiva-mediana-set.md`, con puntatore da
  `filosofia.md` (nuova §3).
- **Segnalato, non risolto per esplicita indicazione**: la mediana insegue (ordine di
  grandezza ~4 minuti per attraversare l'intera scala con bias sostenuto) — un respiro
  molto lungo potrebbe finire per autoannullarsi. Va misurato al prossimo collaudo dal
  vivo e discusso con l'Audio se il tempo è troppo corto, non corretto in silenzio.
- **Stato**: PIANO-040 rimane in attesa del prossimo collaudo dal vivo. Nessun altro
  consumer toccato.
- **Validazione**: `pnpm typecheck` pulito, `pnpm lint` pulito, suite completa **62
  file / 562 test verdi** (`brainBioPerception.test.ts` 40→43).

### `SESSION-2026-08-27-09`
- **Data**: 27 Agosto 2026 (CEST)
- **Obiettivo**: PIANO-040, secondo addendum filosofico dell'Analisi Audio —
  "Autorizzazione adattiva del respiro": la conferma del regime di respiro smette di
  essere un timer, diventa un riconoscimento di firma organizzativa.
- **Implementazione**: `advanceBioBreath` (nuovo) confronta `persistence`/`change`
  (via EMA breve, 2s) con uno snapshot preso al momento dell'ingresso in
  `pressureTrend === 'falling'`, non con livelli assoluti — correzione decisiva del
  braccio destro: un drone ambient con persistence alta/change basso già permanenti
  non deve autorizzare il respiro all'istante solo perché attraversa la regione
  inferiore. Isteresi ON/OFF (0.08/0.04) sostituisce il vecchio timer di conferma;
  nessuna regola di uscita separata (la firma, ricalcolata di continuo, si
  disorganizza da sola quando la configurazione torna verso l'ingresso). Rimossa
  l'intera architettura a tick/pending/spacing del regime (Task 4.4c/4.4d), sostituita
  da questo stato più semplice.
- **Decisione esplicita presa e documentata** (punto 4 del braccio destro): quando la
  firma non arriva mai, il regime resta `decompression` — uno stato definito, non un
  blocco nel regime precedente.
- **Vincolo "pressurized → stable-breath diretto vietato" rimosso**: non più
  necessario, ora strutturalmente garantito dal fatto che `organized` parte sempre
  falso all'ingresso in `falling`.
- **Bug di test trovato e corretto durante la riscrittura, non a verifica finale**: il
  vecchio scenario end-to-end "mondo rarefatto costante dal silenzio" non può mai
  produrre la firma organizzativa per costruzione — `change` in quello scenario cresce
  solo in modo asintotico verso un plateau, mai in discesa, quindi "persistence ↑,
  change ↓" non emerge mai. Sostituito con una vera transizione (denso poi rarefatto),
  verificata via simulazione diretta prima di scrivere l'asserzione.
- **Overlay**: aggiunta mediana e dispersione a schermo (richiesta esplicita
  dell'utente durante l'implementazione), più il progresso percentuale verso la firma
  quando non ancora organizzato — sostituisce il vecchio "quanto manca al timer".
- **Documentazione**: addendum "§13 Autorizzazione adattiva del respiro" accodato al
  brief esistente `team/briefs/brief-relativita-percettiva-mediana-set.md`, incluse le
  sei osservazioni del braccio destro e le relative risposte dell'Ingegneria.
- **Segnalato, non risolto per esplicita indicazione**: anche `setPressureDispersion`
  insegue come la mediana (un tratto compatto la restringe, rendendo "significativo"
  uno scarto sempre più piccolo) — da misurare al prossimo collaudo, non da correggere
  in silenzio.
- **Stato**: PIANO-040 rimane in attesa del prossimo collaudo dal vivo. Nessun altro
  consumer toccato.
- **Validazione**: `pnpm typecheck` pulito, `pnpm lint` pulito, suite completa **62
  file / 559 test verdi** (`brainBioPerception.test.ts`: 7 test obsoleti del vecchio
  meccanismo a tick rimossi, 6 nuovi sulla firma organizzativa aggiunti).

### `SESSION-2026-08-27-10`
- **Data**: 27 Agosto 2026 (CEST)
- **Obiettivo**: PIANO-040, secondo collaudo dal vivo negativo — Psycho2D comparso
  nel respiro, silenzio privo di via diretta, posizione congelata su `rising` e
  overlay non ancora sufficiente a spiegare l'autorizzazione in due secondi.
- **Diagnosi Psycho2D**: causa primaria verificata nel selettore: i pool nuovi erano
  filtrati correttamente e il boost non bypassava il regime, ma un mazzo costruito
  prima del cambio restava consumabile dopo l'ingresso nel regime basso. La rete di
  sicurezza era già FilterPsiche. Aggiunta riconciliazione nel punto d'uso, inclusa
  sostituzione immediata dell'attivo ineleggibile. Chiusa inoltre una quarta via
  tecnica: il mix Psycho2D del passthrough di denoising ora è spento nel regime basso.
- **Diagnosi latenza**: non è la vecchia finestra `mid`; sotto la soglia di validità
  `advanceBioTrend` conserva intenzionalmente l'ultima posizione, quindi il silenzio
  poteva lasciare `rising` indefinitamente. Aggiunta via raw separata: 2 s quasi nulli
  autorizzano `stable-breath`, 6 s di audio sostenuto chiudono il rientro protetto.
  Il decadimento filtrato dopo il fader non aggiorna mediana/dispersione.
- **Overlay**: pressione/mediana affiancate, distanza firmata, dispersione,
  significatività rispetto alla banda decisionale, posizione, progressi separati e
  condizione bloccante nominata; stati silenzio in conferma/rientro espliciti.
- **Protocollo visivo**: nessun moto o effetto nuovo, camera stabile, silenzio senza
  reattività simulata, transizioni/beat invariati, solo contatori scalari.
- **Validazione**: test mirati 3 file / 95; suite completa **62 file / 564 test**;
  typecheck e lint puliti; renderer/main/preload Vite compilati. Il packaging app/ZIP
  è arrivato fino al blockmap, mentre il solo DMG ha fatto fallire `pnpm build` per
  `hdiutil create` dopo i retry automatici. Stato finale: codice correttivo completo,
  PIANO-040 ancora aperto esclusivamente per il nuovo collaudo live Task 4.4.

### `SESSION-2026-08-28-11`
- **Data**: 28 Agosto 2026 (CEST)
- **Obiettivo**: recepire il brief collettivo pragmatico dopo il collaudo negativo:
  ritirare la firma organizzativa, rendere il respiro raggiungibile e visibile e
  misurare davvero il vincolo end-to-end di cinque secondi.
- **Regime**: silenzio raw quasi nullo per 2 s prioritario; fuori dal silenzio 3 s
  continui sotto mediana per entrare e 3 s sopra per uscire. Persistence, change,
  residual e dispersione restano osservabili ma non decisionali. Rimosso il rientro
  speciale a 6 s.
- **Diagnosi latenza**: la mediana iniziale veniva catturata durante la salita degli
  inviluppi e poi recuperava con passo da quattro minuti; aggiunto bootstrap valido
  di 15 s. Dopo aver portato `fast` e smussatura temporale a tau 0,5 s, la pressione
  attraversava il centro rapidamente ma la mediana la inseguiva durante la conferma,
  azzerandola. Il centro resta ora fermo soltanto mentre un candidato è attivo.
- **Misure**: discesa udibile 3,2 s complessivi, con esattamente 3,0 s sotto mediana;
  ritorno dal silenzio 5,0 s complessivi. Entrambi rispettano il limite normativo.
- **Dream-Segmentation**: tempi ridotti da 1,40/2,00 a 1,10/1,25; densità 0,90/0,78;
  materia più scura e variazione cromatica guidata dagli inviluppi; moto locale
  ancora positivo 0,84/0,68. Camera stabile e nessuna attività autonoma nel silenzio.
- **Psycho2D**: confermata la causa già isolata — mazzo obsoleto non rifiltrato al
  punto d'uso. Safety corretta; boost solo acceleratore. Resta chiusa anche la via
  tecnica del passthrough nel regime basso.
- **Audit test**: eliminata la famiglia della firma ritirata e lo scenario end-to-end
  che pretendeva un esito che i propri ingressi non potevano generare. I nuovi casi
  verificano precondizioni, attraversamento, durata continua, silenzio e oscillazione.
- **Protocollo visivo**: camera/quadro stabili, materia e raster preservati, movimento
  locale solo audio-driven, transizioni/beat invariati, budget ridotto nel respiro.
- **Validazione**: test mirati 4 file / 123; suite completa **62 file / 557 test**;
  typecheck e lint puliti; build completa riuscita inclusi app, DMG, ZIP e blockmap.
  Stato finale: nessun altro lavoro di codice preventivo; resta il collaudo live con
  overlay Maiusc+B.

### `SESSION-2026-08-28-12`
- **Data**: 28 Agosto 2026 (CEST)
- **Obiettivo**: terzo collaudo PIANO-040 — correggere `Glitch Morph` visibile in
  `STABLE-BREATH`, quadro quasi fermo/nervoso e 80 cambi di regime osservati.
- **Evidenza live**: screenshot con pressione 0,34, mediana 0,45, distanza −0,11,
  dispersione 0,06 e Glitch Morph attivo.
- **Causa renderer**: il regime basso era una blacklist di Psycho2D, Fractal e
  Print2D, mentre il brief prescriveva una whitelist di cinque. Glitch passava dalla
  selezione ordinaria, non da safety, boost o passthrough. Implementata whitelist
  Vector/Material/Bauhaus/Dream/Filter, riconciliata anche su attivo e mazzi esistenti.
- **Causa nervosismo**: qualunque scarto infinitesimo congelava la mediana all'avvio
  della candidatura e diventava artificialmente tre secondi continui. Aggiunta zona
  neutra assoluta ±0,01, indipendente dalla dispersione e senza firma organizzativa.
- **Rientro dal silenzio**: la stessa materia può tornare nella zona centrale senza
  superarla; quel percorso avvia lì la conferma ordinaria di tre secondi, ma non passa
  finché la pressione resta davvero sotto la zona.
- **Regressioni**: Glitch attivo e accodato viene espulso subito; entrambi i regimi
  bassi visitano solo i cinque ID ammessi; 60 s di oscillazione 0,495/0,505 attorno a
  mediana 0,5 producono zero cambi; silenzio 2 s e attraversamenti reali restano verdi.
- **Protocollo visivo**: camera/quadro invariati, nessun moto autonomo, materia/beat/
  transizioni/budget non modificati; la correzione agisce su regia e segnale.
- **Validazione**: suite completa **62 file / 559 test**, typecheck e lint puliti;
  build completa riuscita inclusi app, DMG, ZIP e blockmap. Resta il riscontro live.

### `SESSION-2026-08-28-13`
- **Data**: 28 Agosto 2026 (CEST)
- **Obiettivo**: brief del braccio destro — latenza da misurare, respiro visibile,
  Varco Percettivo parametrico.
- **Punto 1 (latenza)**: simulazione diretta di `BrainBioPerceptionClock` da un
  calo secco a silenzio (60Hz, come il loop RAF reale) mostra `perceptualPressure`
  sotto 0,05 in ~2,06s — il modulo isolato rispetta già il vincolo dei "due secondi",
  in contraddizione col collaudo dal vivo negativo. Nessuna causa trovata da
  correggere nel modulo; resta aperto in attesa della cattura reale col logger 1Hz.
- **Punto 2 (respiro visibile)**: verificato che Dream-Segmentation era già
  collegato a colore/densità/regime (premessa del brief superata dai fatti).
  Aggiunto ramo scuro a Filter-Psiche (`calculateFilterPsicheColorDynamics`
  riceve `regime`, riduce le due sovrapposizioni color-dodge/screen senza toccare
  brightness/contrast/saturation — criterio Visual "meno competizione, non meno
  luce" applicato alla lettera) ed etichetta "respiro" accanto al renderer attivo.
  Vector-Morph/Material-Morph/Bauhaus-Morph restano senza leve di regime, non
  ancora affrontati. Glitch-Morph resta escluso dal pool basso su decisione
  esplicita del Capo Supremo (nessuna condizione specificata dal brief).
- **Punto 3 (Varco parametrico)**: flash/glitch di mascheramento in
  `brainRendererHost.ts` ora azzerato (flash) / ridotto al 25% (glitch minimo)
  nel solo `stable-breath`, invariato altrove — "resta il solo glitch minimo".
- **Validazione**: typecheck e lint puliti, suite completa **62 file / 562 test
  verdi**. Dettaglio in `working/plans/piano-040-...md`, Task 4.4j.

### `SESSION-2026-08-28-14`
- **Data**: 28 Agosto 2026 (CEST)
- **Obiettivo**: brief Audio "Respiro, memoria corporea e ascolto continuo" —
  revisione semantica del respiro, supera la mediana come decisore.
- **`pressureTrend`**: confronta ora la pressione live con `reference.pressure`
  (snapshot al momento della promozione del riferimento — "la configurazione
  immediatamente precedente"), non più con la mediana del set. Nuova funzione
  pura `classifyPressureTrend`. Verificato via simulazione: `decompression`
  raggiunta entro 200ms da una discesa udibile, reazione immediata senza gate.
- **`residual`**: riscritto da carica gated su persistence sostenuta a
  inviluppo a due costanti di tempo (salita 1.5s, discesa 25s) — memoria
  diretta della pressione precedente, non più giudizio sulla coerenza dello
  stato presente.
- **Dream-Segmentation**: `calculateDreamRegimeProfile(regime, residual)` —
  primo consumo di un segnale continuo oltre al regime discreto.
- **`advanceBioRegime` invariata**: già compatibile col brief, nessuna
  modifica necessaria (la sua isteresi è rappresentazione derivata, non gate).
- **Deferiti**: §18.2 (uscita per ripartenza ritmica pompante, capacità
  nuova) e la misura di latenza end-to-end dal vivo.
- **Documentazione**: nuovo `team/briefs/brief-respiro-memoria-corporea-ascolto-continuo.md`,
  `filosofia.md` §4 (supera la §3 sulla mediana).
- **Validazione**: typecheck e lint puliti, suite completa **62 file / 563
  test verdi** (rewrite di `brainBioPerception.test.ts`).

### `SESSION-2026-08-28-15`
- **Data**: 28 Agosto 2026 (CEST)
- **Obiettivo**: brief correttivo del braccio destro — ritiro del §18.2,
  regola permanente anti-sovrastrutturazione.
- **§18.2 ritirato, non deferito**: nessun codice da scrivere. Con
  `pressureTrend` relativo a `reference.pressure`, un rientro secco del kick
  produce già il salto più grande della traccia — la via §18.1 (risalita
  consistente) lo prende in fretta; un rientro graduale (8-16 battute) non
  deve chiudere il respiro prima del corpo. Aggiornati piano, brief e
  `filosofia.md` per rimuovere ogni riferimento a "deferito" e sostituirlo
  con "ritirato".
- **Regola permanente anti-sovrastrutturazione** scritta in `agents.md`
  (§"Regole Da Non Rompere"): tre round di collaudo negativi (firma
  organizzativa, significatività su dispersione, kick a quattro condizioni)
  nati dallo stesso errore — aggiungere un meccanismo invece di verificare
  se un segnale esistente rispondeva già. Vale anche sui brief firmati da
  un Capo Supremo: segnalare la sovrastrutturazione, non implementarla.
- **Resta aperta**: misura di latenza dal vivo, invariata da tre giri.
- Nessuna modifica a codice/test in questa sessione — solo documentazione.

### `SESSION-2026-08-28-16`
- **Data**: 28 Agosto 2026 (CEST)
- **Obiettivo**: analisi log sessione live — comportamenti renderer non tornavano;
  poi brief del Capo Supremo su respiro che non si chiude e preset colore
  "sovrascritti".
- **Trovato e corretto (Dream-Segmentation)**: brief definitivo §8 (già firmato,
  mai implementato) — vocabolario neuronale sospeso nel regime basso, non solo
  diradato. Aggiunto `neuronalMultiplier` (0 in decompression/stable-breath),
  applicato al budget filamenti.
- **Trovato e corretto (Filter-Psiche)**: la sola riduzione di alternate/inverse
  alpha lasciava la saturazione di base piena. Aggiunto `saturationMultiplier`
  (riduce solo l'eccesso sopra 1, mai sotto).
- **Trovata causa e corretta (respiro che non si chiude)**: `reference.pressure`
  catturata vicino a un picco locale (log reale: 0.7408); con deadband 0.05 una
  risalita a 0.77 restava "stable" (non superava 0.79). Deadband ridotta a 0.02,
  verificato che 0.77 ora legge "rising".
- **Verificato e riportato, non inventato**: Material-Morph non ha alcun codice
  legato al regime — il "sovrascrive i preset" segnalato non può venire da lì con
  lo stato attuale del codice. `reference` oggi si aggiorna solo per rottura, non
  esiste una via per permanenza — confermato nel log reale (`change` sotto 0.35
  per 6+ minuti). Entrambi riportati, non implementati senza conferma.
- **Validazione**: typecheck e lint puliti, 62 file / 565 test verdi.

### `SESSION-2026-08-28-17`
- **Data**: 28 Agosto 2026 (CEST)
- **Obiettivo**: "si blocca in stable-breath sempre, dopo un po' di minuti" —
  la ritaratura del deadband del giro precedente non bastava, secondo log reale
  alla mano.
- **Causa vera trovata**: `reference.pressure` era uno snapshot di un singolo
  campione istantaneo preso al momento della promozione — quasi sempre vicino a
  un picco locale (persistence alta), non al livello tipico del passaggio. Log
  reale: reference 0.6862, il ritorno della musica arrivava solo a 0.6999
  (+0.0137), sotto qualunque deadband ragionevole.
- **Corretto**: `pressure` è ora la media mobile (`pendingPressure`, tau 4s)
  sull'intera finestra di conferma, non l'ultimo campione — nessuna struttura
  nuova, la finestra era già osservata dalla macchina.
- **Verificato con simulazione end-to-end** (jitter audio realistico, 3 run):
  uscita dal respiro entro ~2.9s dal ritorno della musica in ogni run.
- **Validazione**: typecheck e lint puliti, 62 file / 566 test verdi.

### `SESSION-2026-08-28-18`
- **Data**: 28 Agosto 2026 (CEST)
- **Obiettivo**: analisi (nessun codice) — `stable-breath` ritirato, due assi
  RESPIRO ALTO/RESPIRO PROFONDO. Documento completo:
  `team/briefs/analisi-respiro-due-assi.md`.
- **Modello percettivo**: `pressureTrend === 'stable'` è già "assestato"
  (oggi scartato in `unresolved`); `pressureMedian` resta legittimo per "che
  livello", domanda diversa da quella per cui era stato demosso. Nessun
  meccanismo nuovo.
- **Selettore**: non servono due pool — whitelist esistente sui due bassi,
  nessuna restrizione sui due alti (come già `pressurized`). Nuova solo la
  voce hold-frame per RESPIRO ALTO.
- **Renderer**: Dream-Segmentation riusabile quasi al 100% per RESPIRO
  PROFONDO. Filter-Psiche in tensione modula/sovrascrive, segnalata non
  risolta. Vector/Material/Bauhaus-Morph: zero leve E zero formula colore da
  parametrizzare in entrambi gli stati (palette fissa o pixel analizzati).
- **3 decisioni segnalate al braccio destro, non prese**: significato di
  "sovrascrive"; meccanismo colore per i tre renderer senza formula;
  `neuronalMultiplier` in RESPIRO ALTO.
- Nessuna modifica a codice/test in questa sessione — solo analisi e
  documentazione, come richiesto esplicitamente dal brief.

### `SESSION-2026-08-28-19`
- **Data**: 28 Agosto 2026 (CEST)
- **Obiettivo**: riprendere il lavoro complesso interrotto e completare il
  passaggio da `stable-breath` ai due assi RESPIRO ALTO/PROFONDO.
- **Stato trovato**: migrazione parziale non registrata; typecheck bloccato da
  un'aspettativa legacy, nuovi ID già cablati in parte di modello, selettore,
  overlay e consumer.
- **Correzione modello 1**: rimosso `reference.phase` dal regime. Era un secondo
  gate sulla stessa domanda già risolta da `pressureTrend` e portava la prima
  decompressione a ~5,5s. Ora rising/falling producono subito pressurizzazione/
  decompressione; stable apre la classificazione dello stato abitato.
- **Correzione modello 2**: rimossa `mad` dal livello alto/profondo. Era
  dichiarata solo contesto ma veniva usata come banda decisionale; nella
  regressione denso→rarefatto arrivava a ~0,11 e manteneva erroneamente
  "alto". La mediana usa ora il deadband di pressione già esistente.
- **Regia/consumer**: whitelist sui due stati bassi, pool ampio sui due alti,
  hold corto per Respiro Alto; Dream-Segmentation usa leve locali e
  Filter-Psiche riusa il profilo pieno nell'alto. Nessun nuovo filtro per
  Vector/Material/Bauhaus; decisione Visual ancora aperta.
- **Protocollo visivo**: nessun moto di camera/quadro, materia e raster
  preservati, silenzio senza attività autonoma, beat/transizioni invariati,
  budget ancora governato da low power/pressione risorse.
- **Validazione**: typecheck e lint puliti; suite completa **62 file / 567 test
  verdi**; build completa riuscita (app, DMG, ZIP e blockmap). Resta il
  collaudo live con overlay Maiusc+B.
- **Registro riallineato**: `TASK-040-56` marcato `DONE`; logger 1 Hz e
  marcatori apertura/chiusura erano già presenti in `OutputApp.tsx` e già
  chiusi nel piano (Task 4.4i), era rimasto stantio soltanto il registry.

### `SESSION-2026-08-28-20`
- **Data**: 28 Agosto 2026 (CEST)
- **Obiettivo**: correggere FilterPsiche troppo verde/ciano, luminoso e
  dilavato anche nel regime DECOMPRESSIONE, riscontro da screenshot live.
- **Diagnosi**: la base raster era già trasformata dalla variante psichedelica;
  il profilo di decompressione attenuava solo hue e overlay, con saturazione e
  luminosità vincolate a non scendere mai sotto 1. Il ramo era quindi una
  FilterPsiche piena attenuata, non una vera apertura.
- **Correzione**: lo stesso profilo Canvas controlla ora anche base/drive di
  contrasto, saturazione e brightness. Decompressione desatura e abbassa
  realmente la luce mantenendo contrasto; Respiro Profondo è più quieto.
  Color-dodge/screen/difference restano presenti ma fortemente secondari. Il
  fallback di preparazione segue subito il regime e non mostra più per alcuni
  frame il vecchio `saturate(2.5)` nei regimi bassi.
- **Protocollo visivo**: camera/quadro invariati; raster riconoscibile; nessun
  movimento autonomo; beat/transizioni invariati; nessun nuovo costo.
- **Validazione**: typecheck/lint puliti, **62 file / 568 test verdi**, build
  completa riuscita con app, DMG, ZIP e blockmap. Resta il collaudo live.

### `SESSION-2026-08-28-21`
- **Data**: 28 Agosto 2026 (CEST)
- **Obiettivo**: calmare Bauhaus Morph e Materia Morph, giudicati troppo nervosi
  dal vivo durante DECOMPRESSIONE e RESPIRO PROFONDO.
- **Causa**: lo smoothing era già presente e corretto, ma i renderer non
  ricevevano il regime bio-percettivo; l'ampiezza geometrica locale restava
  identica ai regimi alti.
- **Correzione**: aggiunto `setPerception` ai due controller e riusata una sola
  leva di ampiezza sui movimenti locali esistenti: 38% in decompressione, 16%
  nel respiro profondo. Nessun cambiamento a camera, transizioni, flash,
  generazione delle immagini o motore audio.
- **Protocollo visivo**: camera stabile, reattività dentro piani/regioni raster,
  zero moto inventato nel silenzio, fase/bande preservate, costo invariato.
- **Validazione**: 35 test mirati verdi; typecheck/lint puliti; suite completa
  **62 file / 570 test verdi**; bundle applicativo e ZIP riusciti. Packaging DMG
  bloccato solo da `hdiutil create` (exit 1) dopo la compilazione. Resta prova live.

### `SESSION-2026-08-28-22`
- **Data**: 28 Agosto 2026 (CEST)
- **Obiettivo**: impedire che i renderer inizino a laggare prima della comparsa
  del Varco Percettivo; nessuna GPU finché non siamo già dentro il Varco.
- **Causa**: il vecchio anticipo fisso di 260ms non copriva la preparazione
  FilterPsiche (anche 1–2s) e il crossfade; l'inferenza partiva durante
  `preparing/entering`.
- **Correzione**: il Renderer Host espone la prontezza reale del passthrough
  `active`; il controller mantiene armato lo stesso Varco e attende quel segnale
  prima di avviare WebGPU. Il gate segue gli host correnti se cambia fotogramma.
- **Nessuna sovrastrutturazione**: riusati `resourcePressure`, stato del
  passthrough e Promise già attesa da Psichedel; rimosso il timer predittivo.
- **Validazione**: 16 test mirati, typecheck/lint puliti, **62 file / 570 test
  verdi**; app e ZIP prodotti. DMG fermo sul noto `hdiutil create` exit 1.
  Resta il collaudo live.

### `SESSION-2026-08-28-23`
- **Data**: 28 Agosto 2026 (CEST)
- **Obiettivo**: spiegare e correggere lo screenshot di Dream Segmentation
  giallo/magenta e bruciato nonostante l'etichetta DECOMPRESSIONE.
- **Causa**: disallineamento fra UI e renderer reale. Il controller inviava il
  regime al Renderer Host, ma l'host non implementava `setPerception`; Dream,
  FilterPsiche del Varco, Bauhaus e Materia non lo ricevevano.
- **Correzione**: inoltro e memoria dell'ultimo stato nel Renderer Host, anche
  per controller entranti o layer del Varco creati successivamente.
- **Nessuna falsa taratura**: non sono stati cambiati colori o moltiplicatori;
  prima si rende operativo il profilo già progettato e poi si valuta dal vivo.
- **Validazione**: 64 test mirati, typecheck/lint puliti, **62 file / 571 test
  verdi**; app e ZIP prodotti. DMG fermo sul noto `hdiutil create` exit 1.
  Resta il nuovo riscontro live in DECOMPRESSIONE.

### `SESSION-2026-08-28-24`
- **Data**: 28 Agosto 2026 (CEST)
- **Obiettivo**: ripristinare l'ingresso periodico della Riattivazione, che deve
  funzionare a prescindere da regime, Varco e generazione.
- **Causa**: il contatore era controllato solo quando `nextProduction` era già
  pronta. Una generazione ritardata faceva riciclare indefinitamente la storia
  corrente senza offrire il confine alla Riattivazione.
- **Correzione**: il trigger viene ora valutato direttamente ai confini della
  storia e durante il ricircolo; la Riattivazione può partire dall'archivio con
  prossima produzione nulla e lasciare la generazione ordinaria in attesa. Il
  confine rilegge anche l'archivio reale, evitando un cache asincrono stantio.
- **Separazione**: il regime resta una grammatica visiva interna, non un veto
  sul ciclo. Nessuna modifica ai renderer o alla selezione in questa sessione.
- **Validazione**: typecheck/lint puliti, **62 file / 572 test verdi**, app e ZIP
  prodotti. DMG fermo sul noto `hdiutil create` exit 1. Resta collaudo live.

### `SESSION-2026-08-28-25`
- **Data**: 28 Agosto 2026 (CEST)
- **Obiettivo**: rendere obbligatoria sul comportamento reale di tutti i
  renderer la risposta ai quattro regimi, indipendentemente dai pool, ed
  eliminare i neuroni di Dream Segmentation nel respiro profondo.
- **Causa**: cinque renderer registrati non implementavano `setPerception`.
  Inoltre Dream interpolava lo zero neuronale col residuo, facendo riapparire
  filamenti e scariche quando il residuo non era pieno.
- **Correzione**: completato il ricevitore su Print2D, Psycho2D, Vector Morph,
  Glitch Morph e Fractal Spiral; centralizzata la sola scala del moto locale e
  riusata anche da Bauhaus/Materia. Il gate neuronale di Dream è ora zero
  assoluto in decompressione e respiro profondo.
- **Protocollo visivo**: nessun movimento di camera o quadro; soltanto materia
  locale già audio-driven; silenzio, transizioni, flash e low power preservati;
  nessun nuovo effetto o costo GPU.
- **Validazione**: typecheck e lint puliti, **63 file / 574 test verdi**, build
  completa riuscita con app, DMG, ZIP e blockmap. Resta prova live fullscreen.

### `SESSION-2026-08-28-26`
- **Data**: 28 Agosto 2026 (CEST)
- **Obiettivo**: preparare tutta la documentazione di Release Candidate e
  integrare il lavoro completo su `develop`.
- **Release**: versione portata da `1.0.0-beta.3` a `1.0.0-rc.1`; creati
  `CHANGELOG.md`, note RC, checklist installazione/smoke/live, matrice
  piattaforme, problemi noti, criteri Go/No-Go e procedura verso `1.0.0`.
- **Git**: consolidamento feature nel commit `04a0e36`; merge locale `--no-ff`
  su `develop` nel commit `eb244d8`, senza conflitti. Nessun push o tag remoto.
- **Validazione post-merge**: typecheck e lint puliti, suite completa **63 file /
  574 test verdi**, build Electron riuscita. Generati DMG arm64 247 MB, ZIP
  arm64 238 MB e relative blockmap con nome `1.0.0-rc.1`.
- **Stato finale**: RC tecnicamente pronta; rimane il collaudo manuale
  fullscreen/microfono/Varco/regimi/Riattivazione/sessione pubblica prima della
  promozione alla versione stabile.

### `SESSION-2026-08-28-27`
- **Data**: 28 Agosto 2026 (CEST)
- **Obiettivo**: pubblicare la pagina autonoma “Sogni Elettronici” su GitHub
  Pages con il video demo e il riferimento contatti richiesto.
- **Implementazione**: creato il branch orfano `gh-pages` con `index.html`,
  `demo-1.mp4` e `.nojekyll`; aggiunto nel footer il link cliccabile
  `mailto:misticaelectronica@libero.it`.
- **Separazione**: nessun file dell'app Electron è stato incluso nel branch del
  sito e nessun commit applicativo è stato pubblicato.
- **Validazione**: controllo locale desktop/mobile, assenza di errori browser,
  Pages `built`, HTTPS attivo, pagina e MP4 verificati sugli URL pubblici.

### `SESSION-2026-08-28-28`
- **Data**: 28 Agosto 2026 (CEST)
- **Obiettivo**: sostituire la pagina pubblica con il nuovo file
  `sogni-elettronici (1).html` caricato dall'utente, conservandolo integralmente.
- **Pubblicazione**: il file è stato copiato senza modifiche come `index.html`
  sul branch `gh-pages`; `demo-1.mp4` e `.nojekyll` sono rimasti invariati.
- **Git**: commit pubblico `36d4504` (`site: aggiorna integralmente Sogni
  Elettronici`). Nessun push su `develop`.
- **Validazione**: HTTP 200 e HTTPS attivo; hash SHA-256 della risposta Pages
  identico all'allegato (`369e0e86fcdf63a60e968eab9d5893ca44eed558f4b2364d4177ad00a1d4ec53`).

### `SESSION-2026-08-28-29`
- **Data**: 28 Agosto 2026 (CEST)
- **Obiettivo**: fare scorrere con la pagina il blocco “03 / processo
  condiviso”, segnalato come apparentemente fisso.
- **Causa**: CSS `position: sticky; top: 38px`; nessun errore JavaScript.
- **Correzione**: rimossi soltanto `position: sticky` e `top`, mantenendo
  layout, contenuti, animazioni e comportamento mobile invariati.
- **Validazione**: posizione calcolata `static`; a uno scroll di 480,5 px il
  blocco si sposta di −480,5 px; nessun warning/errore browser. Build pubblica
  verificata senza più alcuna regola sticky.
- **Git**: commit pubblico `310cca5` sul branch `gh-pages`; nessun push su
  `develop`.
