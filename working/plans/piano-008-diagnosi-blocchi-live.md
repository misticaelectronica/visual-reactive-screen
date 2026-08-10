# Piano di Lavoro: Diagnosi Blocchi Live Continui

> **ID Piano**: `PIANO-008`  
> **Macrotask di Riferimento**: `MACRO-009`  
> **Data Creazione**: 2026-08-09  
> **Stato**: `IN_PROGRESS`  
> **Autore/Agente**: Codex / Sviluppatore

---

## 1. Obiettivo

Riprodurre i blocchi ancora percepiti durante una prova continua, misurarli in
un log pulito e distinguere almeno fra stallo RAF Output, preparazione Canvas,
trasporto IPC e inferenza WebGPU. Questa fase è diagnostica: nessuna correzione
viene applicata prima di avere una traccia temporale completa.

---

## 2. Contesto

- La Fase 3C ha ridotto la frequenza dei freeze severi, ma non la contesa
  interna alla singola inferenza WebGPU.
- L'ultima sessione osservata mostra gap RAF moderati di circa 383–392 ms
  durante il denoising.
- I log precedenti vengono rimossi su richiesta dello sviluppatore; la memoria
  `.coscienza/` e le impostazioni non fanno parte della pulizia.

---

## 3. Regole E Vincoli

- [x] Non modificare `backgroundThrottling`, permessi audio o switch Chromium.
- [x] Non introdurre DevTools automatici.
- [x] Conservare camera stabile, reattività musicale e `lowPowerMode`.
- [x] Non cambiare scheduler o pipeline durante la raccolta baseline.
- [x] Non cancellare dati di `.coscienza/` o configurazioni utente.

---

## 4. Procedura

### Fase 1: Preparazione

- [x] Eliminare esclusivamente `log/session-*.txt` e verificare la cartella.
- [x] Avviare la build corrente creando un unico log nuovo.

### Fase 2: Prova Continua

- [x] Lasciare attivi audio, Output e Brain per almeno una produzione completa.
- [x] Annotare il momento percepito di ogni blocco, se disponibile.
- [ ] Attendere refill e avvio della produzione successiva, se la prova resta
  attiva abbastanza a lungo.

### Fase 3: Analisi

- [x] Estrarre gap RAF, metriche IPC/Canvas, inferenze e tempi di denoising.
- [x] Correlare i blocchi percepiti con le fasi della pipeline.
- [x] Decidere il prossimo esperimento minimo senza applicare tarature cieche.

### Fase 4: Esperimento Controllato Successivo

- [x] Eseguire un confronto mantenendo residenti, in modalità normale, le sessioni del modello
  immagini fra prima e seconda storia.
- [x] Misurare separatamente i gap RAF del secondo ciclo e verificare errori
  GPU/memoria durante la compresenza dei modelli.
- [ ] Confermare temperatura e memoria in una prova manuale prolungata con
  strumenti di sistema; il log applicativo non è un sensore termico.
- [x] Decidere dai dati se mantenere la residenza, limitarla a una finestra o
  passare all'isolamento dell'inferenza.

Vincolo dell'esperimento: `lowPowerMode` conserva il rilascio fra storie; un
errore infrastrutturale durante la compresenza dei modelli deve liberare le
sessioni immagine prima del retry.

### Fase 5: Time-Slicing Locale Del Denoising

- [x] Individuare il confine fra due chiamate `UNet.run()` senza cambiare il
  contenuto della singola inferenza.
- [x] Introdurre un yield disattivabile dopo ogni step, escluso l'ultimo,
  lasciando invariati seed, geometria, qualità e numero di step.
- [x] Validare test, typecheck, lint mirato e build renderer.
- [x] Eseguire una produzione live e confrontare RAF/Canvas, durata immagini e
  percezione con il ciclo residente del 09 Agosto.

Il test può migliorare la continuità fra due step, ma non può interrompere una
singola `UNet.run()` già in esecuzione sulla GPU.

Esito: test negativo. Il massimo dei gap denoising è passato da 533,6 ms a
457,8 ms, ma la fascia ricorrente è rimasta sostanzialmente invariata
(375–450 ms). Il yield ha concesso frame fra gli step senza abbreviare il
blocco prodotto dal singolo `UNet.run()`. Il codice sperimentale è stato
rimosso dopo la prova.

### Fase 6: Riduzione Del Lavoro Atomico UNet

- [x] Leggere direttamente i contratti ONNX senza caricare il modello sulla
  GPU: Text Encoder e UNet dichiarano `batch_size` dinamico.
- [x] Introdurre una modalità reversibile `single-conditional` che usa batch 1
  senza cambiare seed, geometria, step, scheduler o plugin renderer.
- [x] Validare test, typecheck, lint mirato e build renderer.
- [x] Eseguire una produzione live e confrontare gap RAF, durata e qualità
  visiva con la baseline CFG batch 2.
- [ ] Confermare manualmente la qualità visiva prima di rendere definitivo il
  ramo singolo; se insufficiente, rimuoverlo prima di valutare CFG
  divisa in due chiamate batch 1.

Esito prestazionale provvisorio: senza Canvas già attivo il denoising batch 1
non ha prodotto gap RAF oltre soglia. Con Print2D attivo i picchi sono spesso
scesi a 249–276 ms, ma sotto pressione sono rimasti episodi da 383–450 ms.
Le immagini standard sono scese in genere da 10–11 s a 7–9 s. Il ramo riduce
il lavoro, ma la contesa con il renderer resta visibile.

### Fase 7: Geometria UNet Ridotta

- [x] Limitare in modo reversibile standard/enhanced a 384×256, mantenendo
  invariata l'uscita 640×360 e senza toccare step, scheduler o renderer.
- [x] Validare test, typecheck, lint mirato e build renderer.
- [x] Eseguire un confronto live con Canvas attivo e verificare se i picchi
  residui scendono sotto la fascia 249–450 ms del batch 1 a 448×256.

Esito: test negativo e modifica rimossa. Escludendo la preparazione iniziale,
sono rimasti sette gap denoising da 349,5 a 391,8 ms; le quattro immagini hanno
richiesto 17,0 s, 8,4 s, 12,2 s e 9,0 s. La minore geometria non ha separato
il carico dalla variabilità termica e avrebbe sacrificato dettaglio senza una
resa prestazionale affidabile.

---

## 5. Criteri Di Accettazione

- un solo log attribuibile senza ambiguità alla prova;
- almeno una sequenza completa storia + quattro immagini;
- conteggio e durata dei gap RAF superiori a 240 ms e 1 s;
- latenza IPC, pressione Canvas e attività inferenza nello stesso intervallo;
- conclusione diagnostica supportata da timestamp.

---

## 6. Registro

- **2026-08-09**: piano avviato dopo la segnalazione di blocchi persistenti nel
  primo test della nuova struttura di Coscienza Onirica.
- **2026-08-09**: rimossi 54 log di sessione precedenti, circa 26 MB; verificata
  la cartella `log/` vuota senza intervenire su `.coscienza/`.
- **2026-08-09**: avviata la baseline corrente; unico log
  `log/session-2026-08-09-23-39-06.txt`. In attesa dell'apertura dell'Output e
  dell'attivazione del Brain da parte dello sviluppatore.
- **2026-08-09**: sessione fermata su richiesta prima del completamento della
  produzione. Il piano viene archiviato senza conclusioni prestazionali; il
  lavoro torna a essere focalizzato su Coscienza Onirica.
- **2026-08-09**: piano riattivato su nuova richiesta dopo la conferma manuale
  che i blocchi sono ancora percepibili. Eliminato definitivamente il log della
  prova interrotta; nuova raccolta avviata da cartella `log/` vuota.
- **2026-08-09**: baseline completa nel log
  `log/session-2026-08-09-23-44-17.txt`: produzione di quattro immagini in
  104,3 s; due gap severi di 1,75 s e 3,57 s durante la creazione della sessione
  UNet, un gap di 0,58 s sul text encoder e nove gap di 0,37–0,47 s durante il
  denoising. RAF massimo 3,57 s, Canvas massimo 0,48 s, IPC `p95` massimo 5,3
  ms, 1.032 pending sostituiti e un riallineamento di fase.
- **2026-08-09**: causa primaria circoscritta alla preparazione/inferenza ONNX
  nello stesso renderer dell'Output. Poiché le sessioni immagine vengono
  rilasciate nel passaggio fra storie, il caricamento severo può ripetersi.
  Prossimo esperimento: mantenere il modello residente per un secondo ciclo e
  confrontare blocchi e pressione di memoria.
- **2026-08-09**: esperimento completato nel log
  `log/session-2026-08-09-23-54-59.txt`. La prima produzione ha riprodotto la
  baseline (RAF massimo 3,81 s, due gap severi e tre creazioni di sessione).
  Nel secondo ciclo residente: zero creazioni di sessione, zero gap severi,
  RAF massimo 0,53 s, latenza IPC massima 68,8 ms, nessun riallineamento e
  produzione completa in 91,4 s. Nessun errore GPU o di memoria osservato.
- **2026-08-09**: scelta mantenuta: sessioni residenti in modalità normale,
  rilascio in `lowPowerMode`, rilascio e retry su errore infrastrutturale. I gap
  moderati di 0,38–0,53 s restano attribuiti al denoising e richiederanno, se
  ancora inaccettabili, isolamento dell'inferenza anziché altro cooldown.
- **2026-08-10**: test locale time-slicing nel log
  `log/session-2026-08-10-11-56-22.txt`. Quattro immagini generate con yield
  fra ogni step UNet: zero gap severi durante il denoising, dieci gap moderati
  da 375 a 457,8 ms. La baseline residente mostrava una fascia tipica analoga,
  da circa 366 a 533,6 ms. Poiché il singolo `UNet.run()` resta indivisibile,
  il movimento continua a bloccarsi; esperimento rimosso dal codice.
