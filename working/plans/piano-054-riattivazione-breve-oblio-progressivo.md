# Piano di Lavoro: Riattivazione semplice e oblio progressivo

> **ID Piano**: `PIANO-054`  
> **Macrotask di Riferimento**: `MACRO-040`  
> **Data Creazione**: 2026-10-31  
> **Stato**: `BOZZA`  
> **Autore/Agente**: Agente AI / Capo Supremo  

---

## 1. 🎯 Obiettivo del Piano

Disposizione del Capo Supremo, 2026-10-31 (testo originale):

> dobiamo accorciare le riattivaizoni

> i raster più vecchi DEVONO essere dimenticati progressivamente.

> dei vecchi RASTER devono rimanere i più significativi del sogno

Revisione dello stesso giorno, che ritira il divieto di ripetizione chiesto
all'inizio:

> niente allora obiettivo è solo semplificare le riattivaizni e ridurre le robe
> più vecchie progressivamente, lascia perdere il ripetere due volta MAI non è
> pù un requisito

Seconda revisione dello stesso giorno:

> 1 raster per storia lo terrei sempre anche per le più vecchie

Il piano semplifica la Riattivazione e ne contiene la durata. Più una storia è
lontana, meno raster porta, conservando i più significativi, fino a un solo
raster che **resta sempre**: nessuna storia sparisce del tutto. **Un raster può
tornare in più Riattivazioni: non è un difetto da correggere.**

---

## 2. 📋 Prerequisiti e Contesto

### Fatti verificati nel codice

- La memoria (`RevisionSessionMemory`) conserva le terne di **tutte** le storie
  per l'intera sessione: né immagini né Blob in RAM escono mai.
- Ogni Riattivazione ripropone tutto il passato: 3 immagini per le 2 storie
  più recenti, 2 per le più vecchie, scelte per qualità di generazione
  (`requestRevisionCycleAtBoundary`, `brainController.ts:1773-1786`).
- Le immagini girano per `REVISION_CYCLE_LAPS = 3` giri
  (`buildRevisionProduction`, `brainController.ts:1638`).
- La fine è **a tempo**, non a fotogrammi: `revisionCycleActiveUntil` somma le
  durate richieste, cioè 9,8 + 7 + 7 = 23,8 s per immagine. La durata reale di
  un fotogramma è però `max(richiesta, transizione + tenuta)`; a 120 bpm,
  calcolata da `calculateBrainFrameTiming`, vale 10,5–11,5 s. Il terzo giro
  viene quindi troncato: passano circa 2,2 giri (stima da calcolo, non da log).
- Tenendo la fine a tempo con un solo passaggio, la finestra varrebbe 9,8 s per
  immagine contro 10,5–11,5 s reali: l'ultima immagine verrebbe tagliata.
- La generazione è sospesa durante tutta la Riattivazione
  (`brainController.ts:2103`), quindi accorciarla riduce anche l'attesa della
  storia successiva.
- `imagesBefore` è usato solo dai test, non dal runtime.
- L'archivio su disco (`dreamImageArchive`) non alimenta la Riattivazione e
  resta fuori da questo piano.
- `filosofia.md` §2 definisce la Condensazione come «il punto di massima
  tensione simbolica o emotiva».

### Durata della Riattivazione (calcolo a 120 bpm)

| Storie già concluse | Oggi: immagini per giro | Oggi: durata | Con questo piano |
|---|---:|---:|---:|
| 1 | 3 | 71 s | 3 immagini, ~34 s |
| 2 | 6 | 143 s | 5 immagini, ~56 s |
| 3 | 8 | 190 s | 6 immagini, ~67 s |
| 5 | 12 | 286 s | 8 immagini, ~90 s |
| 10 | 22 | 524 s | 13 immagini, ~146 s |
| 20 | 42 | 1000 s | 23 immagini, ~258 s |

La durata continua a crescere con la sessione, come disposto: un'immagine in più
per ogni storia conclusa, contro le due per giro di oggi.

### File / Moduli Coinvolti

- `src/shared/brain/dreamRevisionCycle.ts` e `dreamRevisionCycle.test.ts`
- `src/renderer/output/brain/brainController.ts`
- `src/renderer/output/brain/brainRendererSelector.ts` (solo commento)
- `src/renderer/output/skills.md`, `working/`

### Audit preventivo `working/DEPRECATED.md`

- `DEP-001 — NON COINVOLTO`: l'interludio 80/20 fissa la terna al confine come
  oggi e non cambia.
- `DEP-002 — NON COINVOLTO`: testo e storie non vengono toccati.

### Decisioni

- **D1 — Cosa è «significativo» (decisa dal Capo Supremo, 2026-10-31).** Si
  riusa la fase onirica già derivabile (`deriveOneiricPhase`), senza nuove
  analisi. Ordine crescente: `eco` → `metamorfosi` → `soglia` →
  `condensazione`.
- **D2 — Oblio per distanza.** Numero di raster per distanza dalla storia
  appena chiusa: la precedente 3, quella prima 2, tutte le altre 1. Il raster
  unico resta sempre (decisione del Capo Supremo, 2026-10-31); i valori 3 e 2
  sono una proposta da approvare. I raster che escono vengono rilasciati.
- **D3 — Un solo passaggio (proposta, da approvare).** La revisione non chiede
  di togliere i giri. Si propone comunque di toglierli, perché è la
  semplificazione più forte, dimezza la durata e `accorciare` resta
  l'obiettivo. Conseguenza: serve la fine a fotogrammi (TASK-054-05).

La scelta della terna per qualità di generazione resta invariata: la fase
decide soltanto quali raster della terna restano quando la storia si allontana.

Esempio con storie A, B, C, D:

| Fine storia | Riattivazione | Totale |
|---|---|---:|
| B | A×3 | 3 |
| C | A×2, B×3 | 5 |
| D | A×1, B×2, C×3 | 6 |
| E | A×1, B×1, C×2, D×3 | 7 |
| F | A×1, B×1, C×1, D×2, E×3 | 8 |

Dentro la Riattivazione storie e immagini restano in ordine cronologico, come
oggi.

### Disposizioni precedenti modificate

- 2026-09-17: «2 storie intere, le più vecchie ridotte a 2» viene sostituita da
  3 → 2 → 1 → 1… Il principio resta: un ricordo lontano si sfoltisce.
  Cambia il criterio di scelta: fase onirica invece della qualità.
- 2026-09-10: «tutte le terne delle storie precedenti» decade.

### Fuori dal piano

- Il ricircolo durante l'attesa della storia successiva resta com'è, anche
  quando ripresenta raster della Riattivazione.
- Morphing, boost, renderer e `REVISION_CYCLE_FRAME_SPEED_FACTOR` non cambiano.

---

## 3. ⚠️ Regole e Vincoli di Sviluppo (da `agents.md`)

- [x] Audit dei deprecati completato prima di definire le modifiche.
- [ ] Nessun cambiamento a `backgroundThrottling`, permessi media, DevTools o
      `lowPowerMode`; nessuna nuova impostazione o controllo UI.
- [x] **Divieto di sovrastrutturazione**: nessun nuovo segnale. Si riusano
      terna, fase onirica e `RevisionSessionMemory`, e si rimuove più codice di
      quanto se ne aggiunge.
- [x] **Autonomia dei renderer**: nessun renderer viene modificato.
- [x] **Camera**: nessuna trasformazione del quadro.
- [x] **Materia**: morphing e boost della Riattivazione non cambiano.
- [x] **Silenzio**: con ritmo assente la timeline resta ferma, come oggi.
- [ ] **Beatmatch**: l'uscita dal ciclo va spostata dopo il controllo
      `beatAligned`, oggi è prima (TASK-054-05).
- [ ] **Transizione**: l'ultimo raster deve completare transizione e tenuta
      prima dell'uscita (TASK-054-05).
- [x] **Costo**: meno fotogrammi; in RAM un raster per ogni storia vecchia,
      quindi una crescita lineare più lenta di oggi.

---

## 4. 🛠️ Fasi di Implementazione e Checklist Task

### Fase 1: Regola dell'oblio (`dreamRevisionCycle.ts`)

- [ ] **TASK-054-01**: aggiungere `selectMostSignificantRevisionImages`, funzione
      pura che tiene gli N raster più significativi per fase (D1) e li
      restituisce in ordine di fotogramma.
- [ ] **TASK-054-02**: sostituire `REVISION_CYCLE_RECENT_FULL_STORIES` e
      `REVISION_CYCLE_OLDER_STORY_IMAGE_COUNT` con la funzione pura
      `revisionImageCountForStoryDistance`, che vale 3, 2, poi sempre 1. Dare a
      `RevisionSessionMemory` il modo di ridurre una storia ai raster
      selezionati, così gli altri vengono rilasciati.
- [ ] **TASK-054-03**: rimuovere `REVISION_CYCLE_LAPS`, il fattore dei giri
      successivi e `imagesBefore`. `computeRevisionLapDurationMs` diventa una
      durata unica per fotogramma, da 0,7 volte la durata base. Aggiornare
      commenti e test.

### Fase 2: Cablaggio (`brainController.ts`)

- [ ] **TASK-054-04**: in `requestRevisionCycleAtBoundary` sostituire il calcolo
      recenti/vecchie con il conteggio per distanza e la selezione per fase,
      riducendo la memoria di conseguenza; in `buildRevisionProduction`
      eliminare il ciclo dei giri.
- [ ] **TASK-054-05**: sostituire la fine a tempo con la fine a fotogrammi:
      ultimo fotogramma trascorso e `beatAligned`. Rimuovere
      `revisionCycleActiveUntil`.
- [ ] **TASK-054-06**: aggiungere al log `riattivazione iniziata` il numero di
      raster per storia, così il collaudo si verifica dai log.

### Fase 3: Documentazione

- [ ] **TASK-054-07**: aggiornare la skill «Ciclo Di Revisione / Riattivazione»
      in `src/renderer/output/skills.md`, correggendo anche la regola superata
      sulle storie con `consciousnessInfluence` e l'affermazione che
      `imagesBefore` sia usato altrove; aggiornare il commento in
      `brainRendererSelector.ts:522`.

### Fase 4: Verifica, Test e Build

- [ ] **TASK-054-08**: test su `dreamRevisionCycle`: ordine di significatività,
      sequenza 3 → 5 → 6 → 7 → 8 dell'esempio, ogni storia conserva sempre
      un raster, i raster usciti lasciano la memoria, ordine cronologico
      conservato.
- [ ] **TASK-054-09**: `pnpm typecheck`, `pnpm lint`, suite completa e
      `pnpm build`.
- [ ] **TASK-054-10**: collaudo a schermo del Capo Supremo.

---

## 5. 🧪 Strategia di Verifica e Validation Plan

- **Comandi di Test**:
  - `pnpm exec vitest run src/shared/brain/dreamRevisionCycle.test.ts`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm build`
- **Verifica Manuale**, con almeno 6 storie consecutive e audio attivo:
  - dai log `riattivazione iniziata`, immagini 3 → 5 → 6 → 7 → 8;
  - ogni storia vecchia porta sempre un solo raster, di fase `condensazione`
    quando la terna la contiene, e nessuna storia sparisce;
  - ogni Riattivazione mostra tutti i suoi raster e termina sul beat, senza
    tagli;
  - la partenza della storia successiva resta regolare;
  - con 80/20 attivo su una configurazione salvata, il ciclo parte come oggi
    dopo l'interludio;
  - in `lowPowerMode` il comportamento è lo stesso.

---

## 6. 📝 Note e Registro Avanzamento

- **2026-10-31**: creazione del piano. Audit deprecati: DEP-001 e DEP-002
  `NON COINVOLTO`.
- **2026-10-31**: revisione su disposizione del Capo Supremo: ritirato il
  divieto di ripetere un raster, e con esso consumo dei raster e modifica del
  ricircolo. D1 decisa; D2 e D3 attendono approvazione.
- **2026-10-31**: seconda revisione su disposizione del Capo Supremo: ogni
  storia conserva sempre un raster, nessuna viene dimenticata del tutto. La
  durata non ha più un tetto. Restano da approvare i valori 3 e 2 di D2 e D3.
