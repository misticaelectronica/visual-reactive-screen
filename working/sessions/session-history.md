# Storico delle Sessioni di Lavoro (`session-history.md`)

Registro cronologico delle sessioni di sviluppo e manutenzione per **Mistica Electronica Visual Reactive Screen**.

---

## 📜 Sessioni Passate

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
