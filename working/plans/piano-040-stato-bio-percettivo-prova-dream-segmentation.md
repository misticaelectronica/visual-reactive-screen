# Piano di Lavoro: Stato Bio-Percettivo — Prova su Dream Segmentation

> **ID Piano**: `PIANO-040`
> **Macrotask di Riferimento**: nessuno (nuova funzionalità, brief a tre firme)
> **Data Creazione**: 2026-08-27
> **Stato**: `IN_PROGRESS`
> **Autore/Agente**: Agente AI / Capo Supremo

---

## 1. 🎯 Obiettivo del Piano

Verificare se Brain trae beneficio percepibile da una lettura lenta e multi-secondo
della musica (persistence/change/residual/perceptualPressure/pressureTrend) e da un
regime derivato a partire da essa, **prima** di estendere il meccanismo a più renderer.

Riferimento normativo unico: [`team/briefs/brief-stato-bio-percettivo-definitivo.md`](../../team/briefs/brief-stato-bio-percettivo-definitivo.md)
(§1–§17.3). Questo piano **non ridiscute** le decisioni già prese — le traduce in file,
moduli e sequenza di lavoro. Ogni riferimento a "§N" qui sotto è a quel documento.

**Scope volutamente ridotto** (§17.2): tre regimi implementati — PRESSURIZZATO,
DECOMPRESSIONE, RESPIRO STABILE — più lo stato di avvio `UNRESOLVED` che riusa il pool
conservativo. RESIDUALE/SOSPENSIONE e INTERMEDIO/NON RISOLTO restano definiti nel
brief ma non costruiti in questo giro.

**Un solo renderer consumer**: Dream-Segmentation (modulazione di soglie/tempi
esistenti, accumulatore invariato — §9, §11).

**Criterio di successo** (§17, §19 della nota Visual): durante il collaudo dal vivo, si
deve poter distinguere **senza overlay diagnostico** "sta entrando nel respiro" da "sta
respirando" da — se compare — "modalità lenta indistinta" (esito negativo dichiarato).

---

## 2. 📋 Prerequisiti e Contesto

- **File / moduli coinvolti**:
  - `src/renderer/output/brain/brainBioPerception.ts` (nuovo)
  - `src/renderer/output/brain/brainBioPerception.test.ts` (nuovo)
  - `src/renderer/output/brain/brainController.ts` (owner del clock, wiring)
  - `src/renderer/output/brain/brainSvgScene.ts` (interfaccia `BrainSceneRendererController`)
  - `src/renderer/output/brain/brainRendererSelector.ts` (esclusione/hold per regime)
  - `src/renderer/output/brain/brainRendererHost.ts` (rete di sicurezza per regime)
  - `src/renderer/output/brain/brainDreamSegmentationCanvas.ts` (consumer)
  - `src/renderer/output/brain/brainLog.ts` (canale di osservabilità, esistente — non
    va creato un meccanismo nuovo, §10/§12)
- **Dipendenze operative**: nessuna — tutti gli input (`BandEnergies` correnti,
  `movingAverages`, `BrainRhythmState`) sono già disponibili lato Output oggi
  (verificato in §16.2 del brief).
- **Non tocca**: acquisizione audio, bande, smoothing, beat detection, `active`, flash
  engine, trasporto IPC (§13 del brief), la grammatica di Dream-Segmentation o il suo
  accumulatore di sorpresa (§9).

---

## 3. ⚠️ Regole e Vincoli di Sviluppo (da `agents.md`)

- [ ] Ogni cambiamento passa il gate a 5 punti Camera/Materia/Silenzio/Beatmatch/
      Transizione prima di essere considerato chiuso (memoria di squadra).
- [ ] Nessun renderer viene modificato nella propria grammatica (§9 del brief): solo
      parametrizzazione, invariata al valore di default.
- [ ] `AppSettings` resta escluso da ogni nuovo stato derivato (§10 del brief).
- [ ] L'eventuale overlay diagnostico è strumento di collaudo, non deve restare attivo
      in produzione live (§10/§12 del brief, regola `agents.md`).
- [ ] Mantenere il supporto a `lowPowerMode`.

---

## 4. 🛠️ Architettura da Implementare

### 4.1 `brainBioPerception.ts` — segnali e regime (nuovo modulo puro + classe con stato)

Stesso ruolo/collocazione di `brainRhythm.ts` (§10 del brief: "accanto a `rhythm`, non
dentro `BrainRhythmState`").

**Tipi:**
```ts
export type BrainBioPressureTrend = 'rising' | 'stable' | 'falling'
export type BrainBioRegime = 'unresolved' | 'pressurized' | 'decompression' | 'stable-breath'
// residuale/intermedio: aggiunti in un giro successivo (§17.2) — l'union type resta
// estendibile senza rompere i consumer, che devono trattare valori ignoti come
// 'unresolved' via `default` di uno switch, mai con un cast.

export type BrainBioPerceptionSignals = {
  persistence: number        // 0..1
  change: number              // 0..1
  residual: number            // 0..1
  perceptualPressure: number  // 0..1
  pressureTrend: BrainBioPressureTrend
}

export type BrainBioPerceptionState = {
  signals: BrainBioPerceptionSignals
  regime: BrainBioRegime
}
```
(Nomi effettivamente prefissati `BrainBio*` nell'implementazione — vedi nota su
`brainBioPerception.ts` sopra §4.1 nella Fase 1.)

**Architettura del calcolo (soddisfa gli invarianti §3, verificati per fattibilità in
§16.2, e recepisce integralmente le quattro decisioni del Capo Supremo dell'Analisi
Audio — vedi nota "Correzioni Audio" del 2026-08-27 nel registro §7):**

- tre inviluppi a costante di tempo crescente sullo stesso vettore di bande (stesso
  pattern di `bandDrive`/`movingAverages`, non una nuova pipeline). **Valori di
  collaudo, non costanti filosofiche** (decisione Audio):
  - **fast** (**2–3s**) — "ciò che sta accadendo adesso": abbastanza largo da non
    essere in balìa dell'orchestrazione di una singola battuta/fill a 120–140 BPM;
  - **mid** (**8–12s**) — "ciò che Brain considera il proprio stato recente": largo
    abbastanza da corrispondere a una persistenza realmente percepita (non 6–8s,
    giudicati troppo corti dall'Audio per il significato di "stato corrente" che Brain
    gli attribuisce);
  - **reference** — "l'ultimo mondo sufficientemente stabilizzato rispetto al quale una
    trasformazione ha significato". **Non** un quarto inviluppo a costante di tempo
    fissa: è uno **stato con propria isteresi a due fasi** (correzione più importante
    dell'Audio, confermata come cambio di macchina e non di parametro dal braccio
    destro):
    1. *rilevamento invalidità* — `change` (distanza `mid`↔`reference` corrente)
       supera una soglia sostenuta: il vecchio mondo non descrive più adeguatamente il
       presente. `reference` **resta congelata** — non insegue la transizione;
    2. *accettazione del nuovo* — una nuova configurazione candidata (il `mid`
       corrente) deve mostrare **persistence sufficiente e sostenuta rispetto a sé
       stessa** (cioè `fast` coerente con `mid` per una finestra minima, non solo
       istantaneamente) prima di essere promossa a `reference`. Solo allora
       `reference ← mid` e `change` verso il vecchio riferimento si riassorbe.

    Una trasformazione lenta e coerente (`fast ≈ mid` per tutta la transizione, quindi
    `persistence` alta) può quindi lasciare `change` crescere senza mai forzare un
    aggiornamento prematuro — esattamente il caso che l'Audio ha segnalato come
    rischio della formulazione precedente ("persistence bassa sostenuta → aggiorna
    reference").
- `persistence` = similarità (distanza normalizzata, non sottrazione lineare) fra
  **fast** e **mid** — alta se il momento è coerente con lo stato recente, indipendente
  da quanto `mid` si discosti da `reference`;
- `change` = distanza fra **mid** e **reference**, filtrata su finestra multi-secondo —
  misura quanto lo stato di riferimento sta invecchiando, non il transient del
  fotogramma corrente. **Non è `1 - persistence`**: sono due confronti fra coppie
  diverse di inviluppi;
- `perceptualPressure` = **energia sostenuta** (media pesata delle bande, come
  `activity` altrove) **+ occupazione/densità temporale + occupazione/pienezza
  spettrale**. **Sostituita la varianza fra bande** (misurava la cosa sbagliata:
  `.8/.1/.1/.1` ha varianza enorme ma è materiale vuoto; `.55/.52/.50/.48` ha varianza
  bassa ma occupa tutto lo spettro — l'Audio l'ha respinta con questo controesempio) con
  **occupazione spettrale**: quanto le quattro bande sono *contemporaneamente e
  sostenutamente* presenti (es. frazione di bande sopra un pavimento relativo alla
  propria escursione recente — non un conteggio nuovo, deriva dagli stessi `bands`/
  `movingAverages` già disponibili). **Occupazione/densità temporale**: quanto spazio
  reale resta fra gli eventi — derivabile da `bandTransients` già esistente (intervallo
  fra transient sostenuti), **nessuna feature nuova**, coerente col vincolo esplicito
  dell'Audio di non introdurre roughness/entropy/spectral-flux in questo giro (quello
  sarebbe il Punto 2, deliberatamente rinviato — §16.2/§17.2 del brief);
- `pressureTrend` = direzione della EMA di `perceptualPressure` su finestra lenta,
  con **isteresi a soglia** (non il segno della derivata istantanea) — tre bande
  (rising/stable/falling) con margine morto fra loro per evitare oscillazione;
- `residual` = accumulatore con memoria esplicita, **ordine di gate corretto secondo
  la decisione Audio**: si carica quando **`persistence` è stata sostenuta sopra
  soglia per un tempo minimo** (esistenza di uno stato stabilizzato — non
  `perceptualPressure` sostenuta, gate respinto esplicitamente: un mondo rarefatto ma
  coerente per 30s deve poter lasciare memoria, un'esplosione pressurizzata di un
  secondo estranea al contesto no). `perceptualPressure` **modula l'ampiezza** della
  carica (quanto forte è l'impronta), non ne decide l'esistenza. Decade con costante di
  tempo propria dopo che lo stato che lo ha generato cessa — **mai un decadimento del
  volume corrente** (invariante §3). Stesso pattern concettuale dell'accumulatore di
  sorpresa già esistente in Dream-Segmentation (`brainDreamSegmentationCanvas.ts`,
  `BASELINE_TAU_MS`/gain/decay per ms), non una tecnica nuova per il codebase.

**Derivazione del regime — macchina a stati con isteresi (§17, §17 "Isteresi"):**

- tabella di classificazione secondo §17 (`PRESSURIZZATO`/`DECOMPRESSIONE`/
  `RESPIRO STABILE` da questo giro; `UNRESOLVED` come stato iniziale e come esito di
  "storia insufficiente" o letture contraddittorie, riusando il ruolo che
  INTERMEDIO avrebbe — §17.2);
- **due valutazioni lente consecutive coerenti** richieste per ogni transizione;
  una lettura isolata contraddittoria non cambia `regime` — il valore corrente resta;
- `PRESSURIZZATO → RESPIRO STABILE` diretto **vietato**: deve passare per
  `DECOMPRESSIONE` (o restare in `UNRESOLVED` se le letture non sono coerenti);
  implementato come vincolo esplicito nella tabella di transizione, non come
  conseguenza implicita delle soglie;
- `RESPIRO STABILE → PRESSURIZZATO` **immediato** una volta confermato (due letture),
  senza dover attraversare `DECOMPRESSIONE` a ritroso (§17 "Uscita rapida dal
  respiro");
- il "tick" di valutazione lenta è **temporale**, non per-frame — le variazioni RAF non
  devono poter contare come "due valutazioni consecutive". **Correzione del braccio
  destro, recepita**: con `mid` portato a 8–12s, un tick ogni 2–3s renderebbe due
  letture "consecutive" quasi la stessa lettura campionata due volte (entrambe dentro
  la stessa finestra di `mid`), svuotando l'isteresi. La conferma **richiede quindi che
  le due valutazioni siano separate da un intervallo minimo pari alla costante di tempo
  di `mid` corrente (8–12s)**, non semplicemente "il prossimo tick" — il tick di
  campionamento può restare più fitto (es. ogni 2–3s) per reattività del log/
  osservabilità, ma solo le coppie di letture effettivamente distanziate contano ai
  fini della conferma di regime.

`BrainPerceptionClock` (classe, stesso stile di `OutputRhythmClock`): `ingestSample
(bands, now, movingAverages)` chiamato dallo stesso punto in cui `brainController.ts`
alimenta oggi `OutputRhythmClock`; espone `getState(): BrainPerceptionState`.

### 4.2 Wiring in `brainController.ts`

- istanzia `BrainPerceptionClock` accanto a `thermalScheduler`/`OutputRhythmClock`;
- la alimenta nello stesso punto di ingest delle bande (nessun nuovo dato da Control,
  §16.2);
- tiene l'ultimo `BrainPerceptionState` e lo passa:
  - al renderer attivo via `setPerception()` (solo se il controller la espone — vedi
    §4.3), **solo quando il valore cambia**, non ad ogni RAF (§17.3 — setter a bassa
    frequenza, non argomento di `update()`);
  - a `BrainRendererSelector` e a `brainRendererHost` come **callback**
    (`getRegime: () => BrainRegime`), stesso pattern già in uso per
    `getPressureHint`/`getBoostHint` — non un nuovo meccanismo di trasporto;
- osservabilità (§10/§12): log periodico via `brainLog('perception', ...)` (canale
  esistente, già raccolto dal monitor — nessuna UI nuova da costruire) con i 5 segnali,
  il regime derivato, il renderer attivo, l'eventuale esclusione applicata col motivo,
  e — quando in scena — la parametrizzazione di Filter-Psiche/lo stato della componente
  neuronale di Dream-Segmentation (questi ultimi due si attivano quando quei consumer
  esistono; in questo giro solo Dream-Segmentation, quindi solo il suo stato interno).

### 4.3 `BrainSceneRendererController` — nuovo metodo opzionale

In `brainSvgScene.ts`: `setPerception?(state: BrainPerceptionState): void`, opzionale
come `capabilities` — i controller che non lo implementano lo ignorano semplicemente
(nessun cambio agli altri 8 renderer, §9.1: le uniche due eccezioni autorizzate restano
Filter-Psiche e Dream-Segmentation, e in questo giro solo il secondo viene toccato).

### 4.4 `brainRendererSelector.ts` — esclusione ed hold per regime

- l'esclusione statica vuota (`AUTOMATICALLY_EXCLUDED_RENDERERS`) resta per
  l'esclusione automatica pre-esistente; **in aggiunta**, una funzione
  `excludedForRegime(regime: BrainRegime): ReadonlySet<BrainRendererId>` — vuota per
  `pressurized`/`unresolved`, `{ psycho2d, fractal-spiral-degeneration, print2d }` per
  `decompression`/`stable-breath` (tabella §17.1) — applicata in `storyCycleIds()` e
  `automaticIds()` accanto ai filtri già esistenti (pressione GPU, story-cycle);
- `selectBrainRendererHoldFrames` guadagna un parametro regime-aware: mantiene la firma
  booleana `boosted` per compatibilità, ma quando `boosted` è vero il range hold
  dipende dal regime — `[1,2]` per `pressurized` (invariato), `2` fisso per
  `decompression`, `[2,3]` (il range ordinario) per `stable-breath` (tabella §17.1).
  **`[2,3]` in `stable-breath` è scelta voluta, non una svista di tabella** (chiarito
  su richiesta del braccio destro): in respiro stabile la Riattivazione deve
  mimetizzarsi (§17), quindi la sua velocità rallenta fino al range ordinario invece di
  mantenere l'accelerazione `boosted`; un `regime` sconosciuto o `unresolved` usa il
  comportamento oggi esistente (`[1,2]`) finché il primo consumer non richiede
  diversamente — nessuna regressione per chi non passa il nuovo parametro.

### 4.5 `brainRendererHost.ts` — rete di sicurezza per regime

`safetyNetId` (riga 476) diventa: `print2d` solo se `boosted && regime === 'pressurized'`
(o `regime` non disponibile — retrocompatibilità); altrimenti `filter-psiche` — che è
**già** il valore di default oggi fuori dal ramo `boosted` (§16.4 punto 3: "è la stessa
riga"). Nessuna nuova rete di sicurezza da scrivere, un solo confronto aggiuntivo.

### 4.6 `brainDreamSegmentationCanvas.ts` — consumer

- implementa `setPerception(state)`, memorizza l'ultimo stato ricevuto;
- tre costanti (`MINIMUM_DWELL_MS`, `MINIMUM_TRANSFORMATION_MS`, `GHOST_LIFESPAN_MS`)
  diventano `baseValue * regimeMultiplier(regime)`;
- `regimeMultiplier`: **`1.0` per `pressurized`/`unresolved`/nessuno stato ricevuto**
  (invariante del §6 — comportamento identico a oggi finché `setPerception` non è mai
  stato chiamato, requisito per non rompere i test esistenti che non lo chiamano);
  `> 1.0` per `stable-breath` (maggiore permanenza — brief Visual §5: "maggiore
  permanenza dell'immagine", "morph più lunghi", "riduzione di frammentazione");
  intermedio per `decompression`;
- **l'accumulatore di sorpresa (`BASELINE_TAU_MS`, gain/decay, `SURPRISE_THRESHOLD`)
  non viene toccato** — unico punto di contatto sono le tre soglie/durate già
  esistenti, come richiesto dal §9/§11 del brief.

---

## 5. 🛠️ Fasi di Implementazione e Checklist Task

### Fase 1: `brainBioPerception.ts`

> **Nota sul nome del file** (non prevista dal piano originale): il piano indicava
> `brainPerception.ts`, che **esiste già** nel codebase — `BrainPerceptionEngine`,
> analisi materica frame-a-frame, wired in `brainSvgScene.ts`, senza relazione con
> questo lavoro. Il modulo è stato quasi sovrascritto per l'omonimia (errore
> individuato e corretto immediatamente via `git checkout` prima di qualunque commit);
> il nuovo modulo vive in **`brainBioPerception.ts`**, con tutti i simboli prefissati
> `BrainBio*` per restare inconfondibile. Ogni riferimento successivo in questo piano a
> "`brainPerception.ts`" va letto come `brainBioPerception.ts`.

- [x] Task 1.1: tipi (`BrainBioPerceptionSignals`, `BrainBioRegime`,
      `BrainBioPerceptionState`) — fatto.
- [x] Task 1.2: funzioni pure per gli inviluppi `fast`/`mid` e per `persistence`/
      `change`/`perceptualPressure`/`pressureTrend`, con test unitari **per ciascun
      invariante del §3** (persistence≠1-change, pressure≠energia — incluso il
      controesempio dell'Audio `.8/.1/.1/.1` vs `.55/.52/.50/.48` sull'occupazione
      spettrale —, trend non è la derivata istantanea, change non scatta sul singolo
      transient) — fatto, 9/9 test verdi. **Bug trovato e corretto durante
      l'implementazione stessa** (non alla verifica finale): la prima formula di
      `calculateSpectralOccupancy` usava come pavimento la media mobile di ciascuna
      banda presa singolarmente — passava il test dello sviluppatore ma falliva
      esattamente sul controesempio dell'Audio (`.8/.1/.1/.1` risultava "occupato" al
      100% perché ogni banda era stabile rispetto a sé stessa). Corretta usando un
      pavimento relativo all'energia sostenuta complessiva, sullo stesso principio già
      in uso in `activeBands` del modulo `BrainPerceptionEngine` esistente. Vedi il
      commento "DECISIONE" nel file per il dettaglio.
- [x] Task 1.3: **macchina a stati di `reference`** (correzione Audio più importante,
      trattata dal braccio destro come cambio di macchina, non di parametro) — fatto.
      `BrainBioReferenceState`/`advanceBioReference`, due fasi (`stable`/
      `awaiting-confirmation`), 5 test dedicati incluso il caso discriminante
      dell'Audio (trasformazione lenta, `persistence` alta per tutta la durata: la
      reference non si muove finché `change` non supera la soglia in modo sostenuto,
      poi si aggiorna — mai istantaneamente, mai bloccata per sempre).
- [x] Task 1.4: `residual` — fatto. `BrainBioResidualState`/`advanceBioResidual`, gate
      su `persistence` sostenuta (non su `perceptualPressure`), la pressione modula
      solo l'ampiezza (pavimento 0.35, mai zero). 3 test: stato rarefatto ma
      persistente carica residual anche a pressione bassa; picco isolato a persistence
      bassa non carica nulla; decadimento esponenziale dopo la cessazione dello stato.
- [x] Task 1.5: macchina a stati del regime con isteresi — fatto, 12 test verdi
      (classificazione grezza a tabella + isteresi). `classifyRawBioRegime` (tabella
      §17, catch-all `'unresolved'` che fa anche da INTERMEDIO in questo scope) +
      `BrainBioRegimeState`/`advanceBioRegime` (tick ogni 2.5s, conferma richiede due
      proposte coerenti separate da almeno `mid`, divieto esplicito del salto diretto
      `pressurized → stable-breath` — forzato a `decompression` —, uscita rapida
      `* → pressurized` immediata). **Include** il test per il caso segnalato dal
      braccio destro: due tick a 2.5s l'uno dall'altro non bastano a confermare, serve
      superare l'intera finestra di `mid` (10s) dalla prima proposta.
- [x] Task 1.6: `BrainBioPerceptionClock` (classe con stato, `ingestSample`/`getState`) —
      fatto, 32/32 test del modulo verdi, `pnpm typecheck` e suite completa del
      repo (62 file / 538 test) verdi. **Bug trovato e corretto in due tentativi**
      (non alla verifica finale, durante lo sviluppo stesso della classe): la
      `reference` catturata al primo campione o inizializzata a zero restava
      permanentemente sotto la soglia di invalidità per segnali poco energici,
      bloccando per sempre `stable-breath` — corretto facendo partire la macchina a
      stati già in `awaiting-confirmation` al costruttore (nessun mondo precedente da
      invalidare: si va dritti alla conferma del primo stato coerente, qualunque sia
      la sua energia assoluta). Dettaglio completo nel commento del costruttore in
      `brainBioPerception.ts`. **Fase 1 completa.**

> **Incidente e ripristino, 2026-08-27**: dopo il completamento del Task 1.6, un reset
> esterno alla sessione (non un comando eseguito da questo agente) ha riportato
> l'intero albero di lavoro allo stato pulito del branch, cancellando tutti i file non
> committati di questa Fase 1 (`brainBioPerception.ts`/`.test.ts`, questo piano,
> `STATE.md`, `session-history.md`, entrambi i brief). Il Capo Supremo ha confermato il
> ripristino e richiesto di procedere. Verificato dopo il ripristino: contenuto
> identico (incluse le due correzioni di bug sopra), più una correzione aggiuntiva
> minore trovata alla riverifica (`movingAverages` era un parametro morto nella firma
> di `ingestSample`, mai letto da nessuna formula — rimosso). Suite completa rieseguita
> da zero: 62 file / 538 test verdi, `pnpm typecheck` pulito.

### Fase 2: Wiring — **COMPLETA**

> **Correzione rispetto al piano originale**: il clock ritmico (`OutputRhythmClock`)
> non vive in `brainController.ts` come assunto in fase di progettazione, ma in
> `OutputApp.tsx` (istanziato e alimentato nel punto di ingest IPC,
> `api.onVisualState`). `BrainBioPerceptionClock` è stato collocato nello stesso punto,
> non in `brainController.ts` — coerente col principio "accanto a `rhythm`" del brief
> §10, semplicemente `rhythm` stesso non era dove il piano lo dava per scontato.
> `brainController.ts` riceve entrambi via lo stesso pattern di callback
> (`rhythmSource`/`bioPerceptionSource` in `BrainControllerOptions`).

- [x] Task 2.1: `BrainBioPerceptionClock` istanziato e alimentato in `OutputApp.tsx`
      (non `brainController.ts`, vedi nota sopra), stesso punto di ingest di
      `rhythmClock.ingestSample`. `bioPerceptionSource` filtrato fino a
      `createBrainController` attraverso `createMorphingController`/
      `beginMorphingTransition` (stesso threading di `rhythmSource`, sono funzioni a
      livello di modulo, non possono chiudere sullo stato del componente).
- [x] Task 2.2: `setPerception?` aggiunto a `BrainSceneRendererController`
      (`brainSvgScene.ts`), chiamato in `brainController.ts` solo quando l'oggetto
      cambia identità (che accade solo all'ingest di un nuovo campione audio, non a
      ogni RAF) — **e** forzato al primo frame di ogni nuovo renderer creato (altrimenti
      un renderer appena istanziato non riceverebbe mai lo stato fino al prossimo
      cambio di segnale — bug potenziale intercettato e corretto durante
      l'implementazione, non a verifica).
- [x] Task 2.3: `getRegime` (rinominato `getBioRegime` in fase di implementazione, per
      coerenza con `BrainBioRegime`) iniettato in `BrainRendererSelector` (6° parametro
      del costruttore) e `createBrainRendererHost` (7° parametro) — stesso pattern di
      `getPressureHint`/`getBoostHint`, aggiunto in coda per non rompere nessuna firma
      posizionale esistente (test compresi).
- [x] Task 2.4: `excludedForRegime` applicata sia in `storyCycleIds()` sia in
      `automaticIds()`, **mai bypassata da `boosted`** (a differenza del filtro
      pressione GPU) — esplicitamente richiesto dal brief §13/§14 della nota Visual,
      "il regime vince sempre sull'evento tecnico". Hold regime-aware in
      `selectBrainRendererHoldFrames` (tabella §17.1 completa: pressurized [1,2]
      invariato, decompression 2 fisso, stable-breath [2,3] ordinario). 7 nuovi test in
      `brainRendererSelector.test.ts`, tutti verdi al primo tentativo.
- [x] Task 2.5: `safetyNetId` regime-aware in `brainRendererHost.ts` — Print2D resta
      scelto solo se `boosted && regime consente Print2D` (`pressurized`/`unresolved`/
      non disponibile); `decompression`/`stable-breath` forzano FilterPsiche anche con
      boost attivo. 1 nuovo test dedicato, verde al primo tentativo.
- [x] Task 2.6: log su cambio di regime (non periodico a intervalli fissi: un cambio di
      regime è già raro per costruzione, isteresi a due letture separate da almeno
      `mid`) via `brainLog('perception', ...)`, con i 5 segnali grezzi e il renderer
      attivo al momento della transizione — stesso stile event-driven degli altri
      `brainLog` del file, nessun meccanismo di osservabilità nuovo introdotto.

**Validazione Fase 2**: `pnpm typecheck` pulito, suite completa **62 file / 546 test
verdi** (8 nuovi test rispetto a fine Fase 1, tutti passati senza correzioni).

### Fase 3: Consumer — Dream-Segmentation — **COMPLETA**

- [x] Task 3.1: `setPerception()` + `calculateDreamRegimeMultiplier(regime)` sulle tre
      costanti (`MINIMUM_DWELL_MS`, `MINIMUM_TRANSFORMATION_MS`, `GHOST_LIFESPAN_MS`,
      tutte moltiplicate, mai sostituite). Valori di primo collaudo (dichiarati "da
      tarare all'ascolto" nel codice, coerente con `BRAIN_CONFIG`): `pressurized`/
      `unresolved` = 1.0, `decompression` = 1.4, `stable-breath` = 2.0.
      **L'accumulatore di sorpresa non è stato toccato** — unico punto di contatto le
      tre soglie, come richiesto dal §9/§11 del brief.
- [x] Task 3.2: **verificato per costruzione, non solo per test**: i 30 test esistenti
      del renderer (nessuno chiama `setPerception`) restano **verdi senza alcuna
      modifica** — `latestPerception` resta `null`, `calculateDreamRegimeMultiplier(null)
      === 1`, quindi ogni chiamata alle tre funzioni modulate riceve esattamente
      l'argomento di default di prima. Nessuna regressione possibile per costruzione,
      non solo per assenza di fallimenti osservati.
- [x] Task 3.3: 5 nuovi test dedicati — tabella del moltiplicatore
      (pressurized/unresolved=1, decompression\<stable-breath), equivalenza esplicita
      "chiamata senza il parametro" ≡ "chiamata con moltiplicatore di default", dwell
      minimo che blocca un evento in stable-breath ma non in pressurized a parità di
      tempo trascorso, transizione più lenta in stable-breath a parità di tempo. Tutti
      verdi al primo tentativo.

**Validazione Fase 3**: `pnpm typecheck` pulito, `pnpm lint` pulito sui file toccati,
suite completa **62 file / 551 test verdi** (35/35 su
`brainDreamSegmentationCanvas.test.ts`, +5 rispetto a prima).

### Fase 4: Verifica, Test e Build
- [x] Task 4.1: `pnpm typecheck` — pulito (rieseguito a ogni task delle Fasi 1-3, non
      solo qui).
- [x] Task 4.2: `pnpm test` — suite completa **62 file / 551 test verdi**. `pnpm lint`
      eseguito in aggiunta (non richiesto esplicitamente dal piano, ma convenzione del
      resto del repo) sui file toccati: pulito.
- [x] Task 4.3: `pnpm build` — **verificato, non necessario**: tutti i file coinvolti
      sono sotto `src/renderer/output/` (incluso `OutputApp.tsx`, dove il wiring è
      finito davvero — non `brainController.ts` come assunto in origine), nessun tipo
      nuovo attraversa `preload`/`main` o il trasporto IPC.
- [ ] **Task 4.4 — non eseguibile da questo agente**: collaudo dal vivo con GPU
      realmente sotto pressione in almeno un passaggio di respiro (criterio del brief
      §15/§17/§19 — **nessun test verde chiude questo piano**). Richiede una sessione
      reale con ascolto: i tre regimi (pressurized/decompression/stable-breath) vanno
      verificati che si susseguano coerentemente con la musica, che Dream-Segmentation
      cambi percepibilmente metabolismo senza perdere identità (§11.1), e che i cinque
      segnali corrispondano a quanto si sente (§11.2). **Ora c'è anche l'overlay
      diagnostico** (Task 4.4b sotto) come riferimento a schermo, oltre al log.

### Task 4.4b — Overlay diagnostico a schermo (richiesta esplicita del Capo Supremo,
      non prevista dal piano originale, aggiunta dopo la Fase 3)

- [x] **Fatto, con una correzione dopo il primo collaudo.** Nessuna correzione al
      comportamento del Brain: solo visibilità. Requisito esplicito: "non soluzioni,
      etichette a schermo" — niente nuovi moltiplicatori, niente nuovi regimi, niente
      color-coding per regime (rispettato: pannello monocromo, l'unico scarto dal nero
      è un'inversione bianco/nero al momento del cambio regime, non una palette per
      stato).
- **Cosa mostra**: regime corrente (grande), i cinque segnali con valore numerico,
  `pressureTrend` con freccia (↑/→/↓), renderer attivo, moltiplicatore applicato da
  Dream-Segmentation in quel momento, **istante dell'ultimo cambio di regime** (orario
  assoluto) e **contatore dei cambi** — così se il regime non cambia mai per l'intero
  set, quello si vede subito dal contatore fermo a 0, non va dedotto.
- **Aggiornamento in tempo reale**: lo stato si aggiorna a ogni campione audio
  (`onVisualState`, stesso ingest del clock), il renderer/moltiplicatore ogni 250ms
  (stesso poll DOM già in uso per `activeRendererLabel` — nessun meccanismo nuovo,
  riusato quello esistente).
- **Segnala il momento del cambio**: per 2.5s dopo un cambio di regime il pannello si
  inverte (sfondo bianco, testo nero, bordo marcato) — un'unica inversione monocroma,
  non un colore per stato.
- **Leggibilità a distanza**: font monospace 20-26px (contro gli 11-12px degli overlay
  di debug preesistenti in questo file, pensati per essere letti da vicino).
  **Posizione corretta dopo segnalazione del Capo Supremo**: non più in alto a
  destra (angolo giudicato scomodo/sovrapponibile), ora **in alto al centro** —
  cartellino orizzontalmente centrato, senza toccare gli altri tre overlay esistenti
  (debug in alto a sinistra, nome renderer in basso a destra, QR sessione pubblica in
  basso a sinistra).
- **Bug corretto dopo la prima segnalazione ("non vedo nulla a video")**: il toggle
  era un `keydown` sul solo renderer Output. Nella configurazione reale a due
  finestre l'Output è fullscreen sul proiettore e **quasi mai ha il fuoco della
  tastiera** — chi opera il set preme Maiusc+B guardando Control, non Output, quindi
  l'evento non arrivava mai. Corretto registrando la combinazione a **livello OS**
  (`globalShortcut` in `src/main/windows.ts`, attivo solo mentre la finestra Output
  esiste, deregistrato alla sua chiusura), che invia un IPC a Output
  (`fx:toggle-bio-overlay`, nuovo canale minimo aggiunto a `IPC_CHANNELS`/`OutputApi`).
  Il `keydown` locale resta come fallback innocuo per quando l'Output ha davvero il
  fuoco (es. sviluppo con una sola finestra).
- **Disattivabile, mai attivo di default**: `useState(false)` all'avvio. Non richiede
  una build separata o un flag d'ambiente — è un runtime toggle, quindi **prima di un
  set live va verificato che nessuno l'abbia lasciato acceso dal collaudo
  precedente** (non c'è un blocco automatico che lo spenga da solo).
- **Dati letti, nessun canale nuovo per i segnali**: il moltiplicatore di
  Dream-Segmentation è esposto come attributo diagnostico sul canvas
  (`outputCanvas.dataset.brainRegimeMultiplier`), letto dallo stesso poll DOM che già
  legge `data-active-renderer` — stesso pattern esistente in questo file. L'unico
  canale davvero nuovo è quello del toggle stesso (necessario per la correzione sopra,
  non evitabile restando nel solo renderer).
- **File toccati**: `src/renderer/output/OutputApp.tsx` (stato React, pannello,
  sottoscrizione IPC + keydown di fallback), `src/renderer/output/brain/brainDreamSegmentationCanvas.ts`
  (una riga: attributo diagnostico del moltiplicatore), `src/main/windows.ts`
  (`globalShortcut`, registrato/deregistrato col ciclo di vita della finestra Output),
  `src/preload/preload.ts` e `src/shared/types.ts` (canale IPC + metodo `OutputApi`
  minimi, stesso schema di `onPublicOnlinePhrase`).
- **Validazione**: `pnpm typecheck` e `pnpm lint` puliti, suite completa **62 file /
  551 test verdi** (nessun nuovo test: l'overlay è wiring/JSX, non logica pura — stessa
  convenzione già in uso in `OutputApp.test.ts`). **`vite build` rieseguito e
  verificato pulito** (main, preload, renderer) — a differenza del resto di questo
  piano, qui il codice attraversa davvero `main`/`preload`, quindi il build non è più
  solo "verificato non necessario" come per il resto di PIANO-040. Verifica visiva dal
  vivo non ancora fatta (fa parte del collaudo del Task 4.4).
### Task 4.4c — Ritaratura pressureTrend/residual/soglie (richiesta esplicita
      dell'Analisi Audio dopo il primo collaudo dal vivo, non prevista dal piano)

- [x] **Fatto.** Il collaudo ha mostrato le due velocità troppo distanti: regime
      correttamente lento, ma il livello intermedio (`pressureTrend`) quasi assente —
      leggibile solo dopo ~10s, che sommato all'isteresi del regime portava il cambio
      di regime a ~20s totali. Struttura a due velocità **confermata**, non riaperta:
      solo taratura più una correzione semantica su `residual`.
- **`pressureTrend` — bug di modello trovato, non solo di taratura.** Il primo
  tentativo di correzione (due EMA a costanti proprie invece di `fast`/`mid`) restava
  comunque insufficiente: verificato analiticamente che uno scalino di 0.07 (il centro
  esatto del range "falling" indicato dall'Audio) produceva uno scarto fra le due EMA
  che non superava mai 0.031 — sotto qualunque zona morta ragionevole. Le EMA
  attenuano strutturalmente il confronto "adesso vs N secondi fa": non è un problema
  di costanti, è il meccanismo sbagliato. Sostituito con una vera **linea di ritardo**
  (`history` di campioni con timestamp, riferimento = il più vecchio ancora entro
  ~3.5s) — confronto raw, non attenuato. Zona morta ±0.035 (prima ±0.06). Filtro
  anti-transient spostato dal tau di smoothing (che avrebbe rallentato anche la
  risposta a un movimento vero) alla **durata di conferma** (3s, non cumulativa):
  verificato empiricamente un calo di 0.07 sostenuto conferma "falling" a ~3.4s
  (dentro "3-5s: direzione percepibile"), un blip di 1.5s che rientra non conferma
  mai.
- **Isteresi del regime**: `REGIME_CONFIRMATION_SPACING_MS` scorporato da
  `BIO_PERCEPTION_MID_TAU_MS` (10s) a costante propria (4s) — con la tendenza ora
  leggibile in ~3.4s, il totale per un cambio di regime confermato è ~10-11s (era
  ~20s). Verificato empiricamente con un nuovo test: una decompressione di 5.2s che
  rientra **non** cambia mai il regime; una sequenza sostenuta lo cambia in tempi
  coerenti con "8-12s: abbastanza persistenza per autorizzare un cambio di regime".
- **Soglie di `perceptualPressure`**: `REGIME_PRESSURE_HIGH` 0.65 → **0.60** — il caso
  segnalato dall'Audio (`persistence 0.95, change 0.17, pressure 0.64, trend stable`)
  ora classifica correttamente come area alta invece di `UNRESOLVED`.
- **`residual` — correzione semantica, non solo taratura**: prima si caricava sulla
  sola persistence sostenuta e restava fisso a 1.00 finché il materiale restava
  coerente, anche a musica chiaramente in apertura — `persistence 0.95` e `residual`
  non potevano mai coesistere con un rilascio in corso. Aggiunto un innesco di
  **rilascio**, indipendente dal gate di persistence e prevalente su di esso: parte
  quando `pressureTrend === 'falling'` (riusa direttamente la sostenutezza già
  accertata dalla tendenza, nessun secondo contatore) oppure quando la pressione è
  scesa di almeno 0.10 rispetto a un **plateau recente** (nuovo tracciamento: sale
  subito con la pressione, cede lentamente quando scende — una media inseguirebbe il
  calo e la distanza "dal plateau" non significherebbe più nulla). Decadimento durante
  il rilascio con la stessa costante lenta del decadimento per assenza di stato (22s).
  **Carica resa molto più lenta** (bug, non solo taratura): la formula lineare
  precedente raggiungeva 1.00 in pochi secondi anche a pressione moderata —
  sostituita con un avvicinamento esponenziale a 1 con costante di tempo 150s: la
  saturazione resta raggiungibile ma richiede pressione sostenuta a lungo, non è più
  la norma.
- **Overlay — riga richiesta dal braccio destro**: aggiunta "in attesa → \<regime\>
  (Xs / Ys)" — quale transizione è in coda per la conferma e quanto manca, non solo il
  regime corrente. Nuovo `BrainBioPerceptionClock.getRegimeDiagnostics()` (sola
  lettura, nessun effetto sulla macchina a stati) e tipo esportato
  `BrainBioRegimeDiagnostics`.
- **Segnalato ma non affrontato in questo giro, per esplicita indicazione del braccio
  destro** ("da valutare dopo il prossimo collaudo, non adesso"): i segnali continui
  hanno ora dinamica reale, ma nessun renderer li consuma direttamente — Dream-
  Segmentation legge solo il `regime` tramite il moltiplicatore (Fase 3). Una
  decompressione breve, il caso che l'Audio giudica interessante, resta quindi
  **invisibile a schermo** anche dopo questa ritaratura, salvo che tramite l'overlay
  diagnostico. Non è un difetto di questa correzione, è il limite della prova come
  disegnata al punto 4.4c del piano.
- **File toccato**: solo `src/renderer/output/brain/brainBioPerception.ts` per la
  logica, `.test.ts` per i test (nessun altro consumer toccato — `brainController.ts`,
  `brainRendererSelector.ts`, `brainRendererHost.ts`, `brainDreamSegmentationCanvas.ts`
  restano invariati, consumano solo `regime`/`signals` come prima), più
  `OutputApp.tsx` per la riga diagnostica in più sull'overlay.
- **Validazione**: `pnpm typecheck` e `pnpm lint` puliti, suite completa **62 file /
  559 test verdi** (`brainBioPerception.test.ts` passato da 32 a 40 test — nuovi test
  per ciascuna correzione, inclusi due controesempi analitici verificati con
  simulazioni dirette prima di scrivere il codice, non solo dopo). `vite build`
  pulito. Verifica dal vivo non ancora fatta — resta l'unico criterio che chiude
  davvero questo piano.

### Task 4.4d — Addendum filosofico Audio: relatività percettiva rispetto alla
      mediana dinamica del set (richiesta esplicita, non prevista dal piano,
      **sostituisce il modello di `pressureTrend` del Task 4.4c**)

- [x] **Fatto.** Non è una taratura: è una revisione semantica. `pressureTrend` non è
      più una derivata temporale (linea di ritardo "adesso vs 3.5s fa", Task 4.4c) —
      diventa la posizione di `perceptualPressure` rispetto a `setPressureMedian`, la
      mediana dinamica dell'intera `perceptualPressure` del set, mai congelata.
      Documento integrale salvato come richiesto esplicitamente dal brief (§12):
      [`filosofia.md` §3](../../filosofia.md) punta a
      [`team/briefs/brief-relativita-percettiva-mediana-set.md`](../../team/briefs/brief-relativita-percettiva-mediana-set.md).
- **Mediana per aggiornamento a passo costante, non EMA**: ad ogni campione valido il
      riferimento si sposta di un passo fisso (`sign(pressure-median) × MEDIAN_STEP_PER_MS
      × deltaMs`) — mai proporzionale alla distanza, così un outlier enorme sposta la
      mediana della stessa quantità di un piccolo scarto nella stessa direzione, non di
      più (brief §2, "un picco... non deve poter ridefinire il centro"). Verificato con
      test dedicato: un kick isolato a 1.0 sposta la mediana di <0.001. Passo tarato
      (`1/240_000`) perché un bias sostenuto attraversi l'intera scala 0-1 in ~4 minuti.
- **Banda adattiva** (non soglia assoluta): `BAND_MULTIPLIER × mad` (scarto medio
      assoluto dalla mediana, EMA lenta 90s), clampata fra `BAND_MIN`/`BAND_MAX`.
- **Bootstrap progressivo, non tre interruttori**: `confidence` è una rampa
      smootherstep continua 0→1 su 180s; riferimento e banda effettivi sono
      un'interpolazione fra un fallback assoluto (0.5, banda 0.08) e i valori relativi,
      pesata da `confidence` — nessuno scalino a 60s/180s.
- **Regime**: `classifyRawBioRegime` riscritta — legge solo `pressureTrend` come
      criterio primario (`rising`→pressurized, `falling`→respiro), le vecchie soglie
      assolute (`REGIME_PRESSURE_HIGH/NOT_LOW/LOW`) **rimosse** (decadute come criterio
      primario, brief §10). `persistence`/`change` non escludono più il candidato
      respiro quando `falling` (brief §9) — qualificano invece **quale** dei due
      regimi di respiro (coerente/poco trasformante → `stable-breath`, ancora in
      trasformazione → `decompression`). **`stable` (regione centrale) non produce più
      `UNRESOLVED` come esito normale** (brief §8, dal caso di collaudo reale
      `persistence 0.95, change 0.17, pressure 0.64` — ora correttamente
      `stable-breath`, mai `UNRESOLVED`): se coerente/poco trasformante è comunque
      `stable-breath`, solo se davvero incoerente resta `UNRESOLVED`.
- **Bug d'interazione trovato e corretto durante l'implementazione** (non a verifica
      finale): `residual` si scaricava innescato anche da `pressureTrend === 'falling'`
      (decisione del Task 4.4c). Ma sotto il nuovo modello "falling" è una **posizione**
      che può restare vera per l'intero set (es. un lungo passaggio ambient sotto la
      mediana), non più una transizione — lasciando quel trigger, `residual` sarebbe
      rimasto perennemente in rilascio per tutta la durata di un simile passaggio,
      **mai caricandosi**: l'esatto contrario dell'invariante originario dell'Audio.
      Rimosso dal trigger di rilascio; resta solo il calo dal plateau locale
      (genuinamente transizionale). Verificato con lo stesso scenario end-to-end del
      Task 4.4c (mondo rarefatto, 78s): `residual` ora carica a 0.24 invece di restare
      a 0.
- **Validità del campione — decisione esplicita richiesta dal braccio destro** ("va
      deciso cosa rende un campione valido, e la scelta va scritta nel piano"): un
      campione con `perceptualPressure < SAMPLE_VALIDITY_FLOOR` (0.02, silenzio reale,
      pausa fra tracce, buco tecnico) non entra nella storia della mediana né sposta la
      classificazione corrente. Il tempo del set (`elapsedMs`, quindi `confidence`)
      **continua comunque a scorrere** — decisione deliberata: il bootstrap misura da
      quanto la mediana ha una storia costruita, non da quanto tempo di musica reale è
      passato, i due non vanno confusi riavviando il conteggio ad ogni pausa tecnica.
- **Segnalato dal braccio destro, non risolto qui di proposito** ("va misurato... e
      riportato dopo il primo collaudo, non risolto in silenzio con un fattore di
      dimenticanza"): la mediana insegue — un passaggio sotto mediana sufficientemente
      lungo (l'ordine di grandezza è ~4 minuti per un bias che attraversi l'intera
      scala) sposta la mediana stessa, e a un certo punto quel passaggio smetterebbe di
      leggersi come "falling". È intrinseco al modello ("la serata riscrive il proprio
      centro", brief §11), non un bug — ma se un respiro di 5 minuti si autoannulla nel
      prossimo collaudo, va discusso con l'Audio, non corretto in silenzio.
- **Ancora vero, per l'ennesima volta segnalato**: nessun renderer consuma i segnali
      continui — Dream-Segmentation legge solo il regime. Una decompressione breve, che
      con questo modello è finalmente leggibile come `falling`, resta comunque
      invisibile a schermo salvo l'overlay diagnostico. Da affrontare dopo il prossimo
      collaudo.
- **File toccato**: solo `brainBioPerception.ts`/`.test.ts` per la logica (nessun altro
      consumer toccato — stesso contratto a 5 segnali + regime), più `filosofia.md` e
      il nuovo `team/briefs/brief-relativita-percettiva-mediana-set.md` per la
      documentazione richiesta esplicitamente dal brief.
- **Validazione**: `pnpm typecheck`/`pnpm lint` puliti, suite completa **62 file / 562
      test verdi** (`brainBioPerception.test.ts` 40→43: 3 nuovi test sulla resistenza
      della mediana agli outlier, lo spostamento su bias sostenuto, il bootstrap
      progressivo e la validità del campione; classificazione del regime riscritta con
      fixture aggiornate). Verifica dal vivo non ancora fatta.

### Task 4.4e — Autorizzazione adattiva del respiro: firma organizzativa invece del
      timer (secondo addendum Audio, non prevista dal piano, sostituisce l'isteresi
      del regime del Task 4.4c/4.4d)

- [x] **Fatto.** La conferma del respiro non è più una durata fissa (le finestre
      "3-5s"/"8-12s" restano solo ordini di grandezza diagnostici). Il regime diventa
      eleggibile quando la permanenza sotto la mediana **si organizza
      percettivamente**: `persistence` in salita e `change` in discesa, misurati come
      **movimento rispetto a com'era la configurazione all'ingresso in `falling`**, non
      come livelli assoluti. Testo integrale in
      [`team/briefs/brief-relativita-percettiva-mediana-set.md` §13](../../team/briefs/brief-relativita-percettiva-mediana-set.md).
- **Correzione decisiva del braccio destro, recepita per prima**: la firma letta sui
      livelli avrebbe autorizzato il respiro all'istante per qualunque drone ambient
      (persistence alta/change basso già permanenti prima della discesa). Nuovo
      `advanceBioBreath`: EMA breve (2s) di persistence/change confrontata con uno
      **snapshot preso al momento dell'ingresso** in `pressureTrend === 'falling'`.
      Verificato con test dedicato: un "drone" identico prima e dopo l'ingresso in
      falling non organizza, resta `decompression`.
- **Regola di uscita (punto 2 del braccio destro, non nel brief)**: nessuna condizione
      simmetrica separata — `organized` è ricalcolato ad ogni campione rispetto allo
      stesso snapshot d'ingresso, con isteresi ON/OFF (0.08/0.04) invece di un timer;
      se la configurazione torna verso com'era, `organized` ridiventa falso da solo e
      il regime torna a `decompression`. Verificato con test dedicato.
- **Comportamento quando la firma non arriva mai (punto 4 del braccio destro)**:
      deciso esplicitamente. `pressureTrend === 'falling'` senza `organized` produce
      sempre `decompression` — mai un blocco nel regime precedente. Verificato con un
      test che simula 2 minuti di configurazione statica sotto mediana.
- **Vincolo "pressurized → stable-breath diretto vietato" (rimosso, non più
      necessario)**: con la firma basata su uno snapshot preso all'ingresso in
      `falling`, `stable-breath` non è raggiungibile senza essere prima passati per
      `decompression` (`organized` parte sempre falso) — il vincolo è ora
      strutturalmente garantito, non imposto con un clamp esplicito.
- **Riscritta l'architettura di `BrainBioRegimeState`**: niente più tick/pending/
      spacing (rimosso `REGIME_TICK_INTERVAL_MS`/`REGIME_CONFIRMATION_SPACING_MS`) —
      sostituiti da `BrainBioBreathState` (EMA + snapshot d'ingresso + `organized`).
      `classifyRawBioRegime` ora richiede `organized: boolean` come secondo parametro
      esplicito.
- **Test end-to-end riscritto**: lo scenario "mondo rarefatto costante fin dal
      silenzio" non è un banco di prova valido per la firma organizzativa — in
      quello scenario `change` cresce in modo puramente asintotico e non scende mai
      (non c'è nulla da cui "scendere organizzandosi"), quindi la firma non può mai
      emergere per costruzione. Sostituito con una vera transizione (denso → rarefatto,
      stabilendo prima mediana e reference), che produce una `change` che sale e poi
      ridiscende — lo scenario che il brief descrive davvero.
- **Overlay (punto 5 del braccio destro)**: la riga diagnostica mostra ora mediana,
      dispersione, e — quando la posizione è significativa ma non ancora organizzata —
      la percentuale di progresso verso la firma su persistence e change
      separatamente, non più un timer "quanto manca". Richiesta esplicita aggiuntiva
      dell'utente ("voglio vedere la mediana") già coperta dalla stessa riga.
- **Segnalato, non risolto apposta (punto 3 del braccio destro)**: la dispersione
      insegue come la mediana — un tratto lungo e compatto la restringe, rendendo
      significativo uno scarto sempre più piccolo. Documentato nel codice, va misurato
      al prossimo collaudo.
- **File toccati**: `brainBioPerception.ts`/`.test.ts` (logica e test),
      `OutputApp.tsx` (riga diagnostica riscritta — stesso canale già esistente,
      nessun nuovo IPC), `filosofia.md`/brief già esistente (documentazione, nessun
      nuovo file).
- **Validazione**: `pnpm typecheck`/`pnpm lint` puliti, suite completa **62 file / 559
      test verdi** (`brainBioPerception.test.ts` 43→40: rimossi 7 test obsoleti del
      vecchio meccanismo a tick/pending, aggiunti 6 test nuovi sulla firma
      organizzativa — copertura mantenuta, meccanismo diverso). Verifica dal vivo non
      ancora fatta.

### Task 4.4f — Secondo collaudo negativo: regime invalicabile, silenzio diretto,
      latenza reale e osservabilità decisionale

- [x] **Fatto.** Il secondo collaudo ha prodotto quattro evidenze distinte; non è
      una richiesta di estendere i segnali continui ad altri renderer (scelta ancora
      rinviata), ma una correzione del contratto già implementato.
- **Psycho2D — causa verificata prima della correzione**: esclusione e rete di
      sicurezza sono corrette quando interrogano il regime corrente; il boost non
      bypassa direttamente il filtro. La via reale è un **mazzo story/waiting già
      costruito nel regime precedente** e consumato dopo il cambio di regime senza
      rifiltrare gli ID nel punto d'uso. Il boost accelera l'attraversamento del mazzo
      obsoleto ma non è l'autorizzazione semantica. Correzione prevista: il regime
      viene verificato anche al momento della consegna e i mazzi obsoleti vengono
      epurati/ricostruiti; test obbligatorio su cambio regime a metà storia.
- **Silenzio — decisione ingegneristica**: il silenzio reale non chiede la firma.
      Bande raw quasi nulle sostenute per **2 s** autorizzano direttamente
      `stable-breath`, senza inserire il vuoto nella storia di mediana/dispersione.
      L'uscita richiede audio nuovamente presente e sostenuto per **6 s** (tre volte
      l'ingresso): durante questo rientro protetto il respiro resta autorizzato, così
      una pausa fra tracce non genera un ritorno altrettanto immediato.
- **Latenza — causa verificata prima della correzione**: non è la finestra `mid`
      8–12 s del modello precedente. `advanceBioTrend` considera intenzionalmente
      invalido `perceptualPressure < 0.02` e conserva l'ultima posizione confermata;
      quindi un `rising` può restare tale per l'intero silenzio. La via diretta sopra
      aggira il congelamento senza trasformare il nulla in un campione della serata.
- **Overlay**: mostrare affiancati pressione corrente e mediana, distanza firmata,
      dispersione, rapporto firmato distanza/banda effettiva (il numero realmente
      usato per decidere la significatività), posizione dichiarata, progressi
      persistence/change e blocco nominato (`posizione non significativa`,
      `permanenza non organizzata`, `silenzio non ancora confermato`; più lo stato di
      rientro protetto quando attivo).
- **Protocollo filosofia visiva**: camera/quadro invariati; nessun nuovo moto o
      effetto; il silenzio modifica solo la regia e non simula reattività; beat e
      transizioni esistenti restano invariati; nessun nuovo costo per-frame oltre a
      contatori scalari e lettura diagnostica.
- **Validazione**: mirati 3 file / 95 test; suite completa **62 file / 564 test**;
      typecheck e lint puliti; Vite renderer, main e preload compilati. Il packaging
      ha prodotto app/ZIP e blockmap ma il target DMG ha chiuso `pnpm build` con errore
      esterno di `hdiutil create` dopo i retry automatici. Non è un errore TypeScript
      o Vite. Resta necessario il nuovo collaudo live del Task 4.4: nessun test
      automatico dichiara chiuso il piano.

### Task 4.4g — Brief collettivo pragmatico: firma ritirata, mediana temporizzata,
      respiro visibile

- [x] **Implementato; resta il nuovo collaudo live.** Il brief collettivo sostituisce integralmente Task 4.4e e le
      parti di 4.4f che mantenevano la firma o un rientro fisso a 6 s.
- **Regime**: silenzio raw quasi nullo per 2 s → `stable-breath`, prioritario; fuori
      dal silenzio, 3 s continui sotto la mediana → `stable-breath`; durante la
      conferma inferiore → `decompression`; 3 s continui sopra la mediana per uscire
      dal respiro → `pressurized`. Toccare/attraversare la mediana senza permanenza
      azzera il candidato. Dispersione e firma non autorizzano più nulla.
- **Latenza**: misurare dal primo campione della discesa al regime, includendo il
      rilascio di `perceptualPressure`; test fallito se supera 5 s. Misura finale a
      campioni di 100 ms: discesa 3,2 s dal cambio audio, con esattamente 3,0 s sotto
      mediana; ritorno dal silenzio 5,0 s complessivi. `fast` e smussatura del gap
      temporale sono 0,5 s; `mid` resta 10 s ma non decide il regime.
- **Correzione del bersaglio mobile**: durante la conferma la mediana resta ferma.
      Senza questo hold, al rientro attraversava la pressione dopo circa 1,8 s di
      candidatura e azzerava il timer pur su un plateau stabile. Un attraversamento
      reale del centro congelato annulla comunque subito il candidato.
- **Dream-Segmentation — leve esistenti**: dwell, durata trasformazione, vita ghost,
      budget regioni/filamenti, velo `multiply`, colori delle membrane derivati dalle
      regioni e respirazione locale già audio-driven. **Comportamento nuovo minimo**:
      un profilo di regime riusa queste leve per aprire/ridurre densità e scurire la
      materia; i colori delle membrane restano derivati dal raster ma variano
      lentamente con gli inviluppi audio locali. Nessuna fase temporale autonoma.
- **Protocollo filosofia visiva**: camera stabile; raster sempre riconoscibile;
      movimento solo locale e causato dall'audio; transizioni continue; budget
      ridotto, non aumentato, nel respiro.
- **Audit test**: rimosso lo scenario della vecchia firma che partiva da un mondo
      rarefatto costante e pretendeva `change ↓`: quello scenario non poteva generare
      l'esito atteso per costruzione. I nuovi test verificano eventi e precondizioni
      reali, oltre al tempo trascorso sotto/sopra mediana.
- **Dream-Segmentation finale**: moltiplicatori tempo 1,10/1,25 anziché 1,40/2,00;
      densità 0,90/0,78; scurimento e variazione cromatica audio-driven; moto locale
      ancora positivo 0,84/0,68 e quindi mai congelato. In silenzio nessuna fase
      autonoma produce movimento o colore finto.
- **Pool Psycho2D**: causa confermata nel mazzo obsoleto non riconciliato al punto
      d'uso. La safety era già Filter-Psiche; il boost accelerava il mazzo senza
      bypass semantico. Chiuso anche il passthrough tecnico Psycho2D nel regime basso.
- **Validazione automatica finale**: typecheck e lint puliti; suite completa 62 file /
      557 test verdi; build completa riuscita inclusi app, DMG, ZIP e blockmap. Il
      Task 4.4 resta aperto esclusivamente per il collaudo percettivo dal vivo.

### Task 4.4h — Terzo collaudo: Glitch nel pool basso e regime nervoso

- [x] **Implementato; richiede nuovo riscontro live.** Screenshot reale: `STABLE-BREATH`, pressione 0,34 / mediana
      0,45, renderer `Glitch Morph`, 80 cambi di regime.
- **Causa pool**: l'implementazione usava una blacklist di Psycho2D, Fractal e
      Print2D. Il brief definiva invece una whitelist: Vector-Morph, Material-Morph,
      Bauhaus-Morph, Dream-Segmentation e Filter-Psiche. Glitch passava quindi dalla
      selezione ordinaria, non da safety o boost.
- **Causa nervosismo**: la mediana veniva congelata all'inizio di una candidatura
      anche per scarti numerici infinitesimi; il congelamento trasformava quel rumore
      in tre secondi continui e in un cambio completo. Introdurre una zona neutra
      assoluta minima attorno al centro; dispersione, persistence e change restano
      esclusi dalla decisione.
- **Protocollo visivo**: nessuna modifica a camera/quadro; nessun moto autonomo;
      cambiano soltanto regia del pool e stabilità del segnale decisionale. Materia,
      beat, transizioni e budget restano invariati.
- **Test**: whitelist completa in entrambi i regimi bassi, espulsione immediata di
      Glitch già attivo/accodato, scarti microscopici stabili e nessuna regressione
      sui 2 s di silenzio e 3 s di attraversamento reale.
- **Esito implementazione**: whitelist derivata positivamente dai cinque ID ammessi;
      zona neutra ±0,01; rientro dal silenzio autorizzato a iniziare la conferma anche
      nel centro, ma non mentre resta realmente sotto. Regressione di 60 s attorno al
      centro: zero cambi di regime.
- **Validazione**: 62 file / 559 test verdi, typecheck e lint puliti, build completa
      riuscita inclusi app, DMG, ZIP e blockmap.

### Task 4.4i — Sessione bio-percettiva registrata

- [x] **Fatto.** Logger a 1 Hz implementato (`OutputApp.tsx`, evento
      `perception-session`): timestamp audio, bande, cinque segnali, diagnostica
      completa, regime, renderer DOM attivo; marcatori espliciti apertura/chiusura
      overlay. Attivo solo con Maiusc+B, nessun effetto su camera/materia/ritmo.
      (Checkbox corretta ora: il codice risultava già presente sul disco ma non
      ancora segnato qui — verificato per costruzione prima di segnarlo.)

### Task 4.4j — Brief del braccio destro: latenza, respiro visibile, Varco parametrico
      (2026-08-28)

- **Punto 1 — latenza, misurata non presunta.** Simulazione diretta di
  `BrainBioPerceptionClock` (30s a piena energia con beat, poi calo secco a
  silenzio, campionato a ~60Hz come il loop RAF reale): `perceptualPressure`
  scende sotto 0,1 in 1677ms e sotto 0,05 in 2058ms, regime a `stable-breath`
  nello stesso istante. Lo smoothing nativo Web Audio a monte
  (`smoothingTimeConstant: 0.75`, Control window) si assesta al 95% in ~170ms a
  60Hz. **Il modulo, isolato, rispetta già il vincolo dei "due secondi"** — in
  contraddizione con il collaudo dal vivo negativo del Capo Supremo. Non è stata
  trovata né corretta alcuna causa nel modulo perché non ce n'è una dimostrabile
  qui: la discrepanza resta aperta e richiede la cattura reale del logger 1Hz
  (Task 4.4i, ora completo) durante un vero calo — non un'ulteriore ipotesi.
- **Punto 2 — respiro visibile.**
  - Whitelist dei cinque renderer nel pool basso: **già coincidente** col brief
    (`brainRendererSelector.ts`, invariata).
  - Dream-Segmentation: **già collegato** a colore/densità/oscuramento/moto per
    regime (`REGIME_PROFILE`) — la premessa del brief su questo renderer era
    superata dai fatti, verificato e segnalato prima di agire.
  - **Filter-Psiche — fatto**: `calculateFilterPsicheColorDynamics` accetta ora
    `regime` opzionale; nel respiro riduce `alternateAlpha`/`inverseAlpha` (le
    due sovrapposizioni color-dodge/screen/difference) e l'oscillazione di
    tonalità, **senza toccare `brightness`/`contrast`/`saturation`** — applica
    alla lettera il criterio firmato dal Visual ("dark = meno competizione
    visiva, non meno luce"), non un'interpretazione nuova. `setPerception`
    aggiunto al controller sullo stesso pattern di Dream-Segmentation.
  - **Etichetta "respiro"** aggiunta accanto al renderer attivo (label
    permanente in basso a destra, non solo nell'overlay di collaudo) per
    `decompression`/`stable-breath` — non solo `stable-breath`: interpretazione
    dichiarata, coerente con come la whitelist tratta già insieme i due regimi.
  - **Ancora da fare**: Vector-Morph, Material-Morph, Bauhaus-Morph non hanno
    alcuna leva collegata al regime (verificato, zero occorrenze di
    `setPerception`/regime nei tre file) — comportamento nuovo da costruire per
    ciascuno, non ancora iniziato in questa sessione.
  - **Glitch-Morph "condizionale"**: nessuna condizione specificata dal brief;
    il Capo Supremo ha scelto di lasciarlo escluso come oggi finché non arriva
    una condizione esplicita dal Visual (decisione registrata, non posticipata
    silenziosamente).
- **Punto 3 — Varco Percettivo parametrico — fatto.** `setResourcePressure`
  resta booleano (throttling costo per renderer, invariato); il flash/glitch
  di mascheramento in `brainRendererHost.ts` ora applica un moltiplicatore per
  regime: pieno ovunque, **flash a zero e glitch a intensità minima (25%) nel
  solo `stable-breath`** — "resta il solo glitch minimo" come richiesto. La
  posizione precedente ("quasi assente ma non nullo", sempre) non è
  contraddetta: resta vera fuori dal respiro stabile, dove nulla è cambiato.
- **Validazione**: typecheck e lint puliti, suite completa **62 file / 562 test
  verdi** (3 nuovi test: ramo scuro Filter-Psiche, invarianza senza regime,
  flash a zero nel respiro).

### Task 4.4k — Brief Audio "Respiro, memoria corporea e ascolto continuo":
      revisione semantica del respiro (2026-08-28)

- [x] **Implementato.** Revisione semantica, non taratura — supera la mediana
  come decisore (§4/§6 del brief).
- **`pressureTrend`**: da confronto con la mediana a confronto con
  `reference.pressure` (nuovo campo di `BrainBioReferenceState`, snapshot
  della pressione live al momento della promozione del riferimento).
  `classifyPressureTrend(perceptualPressure, referencePressure)`, zona
  neutra propria (`REFERENCE_PRESSURE_DEADBAND = 0.05`). Nessuna finestra
  di conferma: reazione immediata per costruzione, come richiesto da §6/§7/§9.
  Verificato via simulazione diretta: `decompression` raggiunta entro 200ms
  da una discesa udibile (era gated dalla mediana prima).
- **`advanceBioRegime` invariata**: la sua isteresi (3s promozione a
  `stable-breath`, 3s uscita) resta legittima come rappresentazione lenta
  derivata (§9), non come autorizzazione alla prima reazione — già
  compatibile, nessuna modifica necessaria.
- **`residual` riscritto integralmente**: da carica gated da persistence
  sostenuta (con plateau e soglia di rilascio) a inviluppo a due costanti
  di tempo — salita 1.5s, discesa 25s. Non dipende più da `persistence`.
  Misurato via simulazione: 5s di salita raggiunge 0.77 da un target 0.8;
  dopo un crollo a 0.1, resta sopra 0.5 per altri 5s, converge sotto 0.2
  solo dopo ~55s totali.
- **Mediana/dispersione**: restano calcolate (`advanceBioTrend`), ma solo
  come contesto per l'overlay — mai più lette da `classifyRawBioRegime` o
  da chi decide `pressureTrend`. Nuovi campi diagnostici
  `referencePressure`/`medianDistance` in `BrainBioRegimeDiagnostics`.
- **Dream-Segmentation**: `calculateDreamRegimeProfile(regime, residual)` —
  `residual` (default 1, retrocompatibile) interpola fra il profilo di
  default e quello del regime target. Risposta al punto 1 della nota di
  trasmissione ("via più breve per un segnale continuo oltre al regime").
- **Documentazione**: nuovo `team/briefs/brief-respiro-memoria-corporea-ascolto-continuo.md`;
  `filosofia.md` §4 (supera la §3 sulla mediana, con nota di supersessione).
- **Validazione**: typecheck e lint puliti, suite completa **62 file / 563
  test verdi** (rewrite completo di `brainBioPerception.test.ts` per le
  nuove firme/semantiche, 2 nuovi test su Dream-Segmentation).

### Task 4.4l — Brief correttivo del braccio destro: §18.2 ritirato, regola
      permanente anti-sovrastrutturazione (2026-08-28)

- [x] **§18.2 ritirato, non deferito.** Non implementare la chiusura del
  respiro per ripartenza ritmica pompante: con `pressureTrend` ora relativo
  a `reference.pressure`, un rientro secco del kick produce già il salto
  più grande della traccia e la via §18.1 (risalita consistente) lo
  intercetta in fretta; un rientro filtrato/graduale su 8-16 battute non
  deve invece chiudere il respiro prima del tempo del corpo — nessuna
  nuova capacità di correlazione ritmica necessaria. Rimosso dal piano e
  dal brief (`brief-respiro-memoria-corporea-ascolto-continuo.md`).
- [x] **Regola permanente anti-sovrastrutturazione** scritta in
  `agents.md` (§"Regole Da Non Rompere"), non solo qui: prima di aggiungere
  un meccanismo, verificare se un segnale già esistente risponde già alla
  domanda; una condizione a più requisiti è un errore di progetto; un
  criterio che non scatta mai dal vivo va rimosso, non tarato; segnalare la
  sovrastrutturazione anche quando il brief arriva firmato da un Capo
  Supremo, invece di implementarla in silenzio.
- **Resta aperta**: misura di latenza end-to-end dal vivo (invariata da tre
  giri, in attesa del logger 1Hz durante un vero calo).

### Task 4.4m — Collaudo dal vivo: analisi log, respiro che non chiude,
      vocabolario neuronale/saturazione mai gated (2026-08-28)

- [x] **Dream-Segmentation**: brief definitivo §8 (già firmato, mai
  implementato) — aggiunto `neuronalMultiplier` (0 in decompression/
  stable-breath, non solo diradato come `densityMultiplier`), applicato al
  budget filamenti/dendriti. Corretta anche un'inconsistenza:
  `computeDreamRegimeColor` non riceveva `residual`, quindi il colore usava
  sempre il blend pieno mentre densità/oscuramento lo seguivano — allineato.
- [x] **Filter-Psiche**: aggiunto `saturationMultiplier` (riduce solo
  l'eccesso di saturazione sopra 1, mai sotto) dopo segnalazione dal vivo
  che la sola riduzione di alternate/inverse alpha lasciava i colori
  "superpsichedelici aggressivi".
- [x] **Respiro che non si chiude — causa trovata**: `reference.pressure`
  è catturata in un istante di persistence alta, spesso vicino a un picco
  locale del passaggio (log reale: 0.7408). Con
  `REFERENCE_PRESSURE_DEADBAND = 0.05`, una risalita reale a 0.77 restava
  "stable" perché non superava 0.7408+0.05=0.79 — la ricostruzione c'era e
  non veniva riconosciuta. **Ridotta a 0.02**, verificato che 0.77 ora
  legge "rising" senza perdere margine reale contro un pareggio numerico.
- [x] **Material-Morph — verificato e riportato, non inventato**: zero
  occorrenze di `BrainBioRegime` nel file. Il "sovrascrive i preset"
  segnalato dal Capo Supremo non può avere quella causa con lo stato
  attuale del codice — riportato invece di produrre una correzione su
  codice che non esiste.
- [x] **`reference` — aggiornamento per permanenza: verificato, non esiste.**
  Oggi si aggiorna solo per rottura (`change` sopra soglia sostenuto).
  Confermato nel log reale: `change` è rimasto sotto 0.35 per oltre 6
  minuti dopo la prima promozione. Aggiungerne uno sarebbe un meccanismo
  nuovo (regola anti-sovrastrutturazione, Task 4.4l) — riportato, non
  implementato senza conferma.
- **Validazione**: typecheck e lint puliti, suite completa **62 file / 565
  test verdi**.

### Task 4.4n — "Si blocca in stable-breath sempre": causa vera del blocco
      trovata al secondo giro (2026-08-28)

- [x] **La ritaratura del deadband (Task 4.4m) non bastava.** Secondo log
  reale: `reference.pressure=0.6862`, il picco del ritorno arrivava solo a
  0.6999 (+0.0137) — sotto qualunque deadband ragionevole, e comunque il
  rumore del campione impediva di sostenere "rising" per 3s continui.
- [x] **Causa vera**: `reference.pressure` era uno snapshot di un singolo
  campione istantaneo al momento della promozione — cade quasi sempre in un
  istante di persistence alta, cioè vicino a un picco locale del passaggio,
  non al suo livello tipico. Un'ancora quasi irraggiungibile per una
  normale risalita.
- [x] **Corretto**: `pressure` è ora una media mobile sull'intera finestra
  di conferma (`pendingPressure`, tau = `REFERENCE_CONFIRM_MS` = 4s), non
  lo snapshot dell'ultimo istante — nessuna struttura nuova, la finestra
  era già osservata dalla macchina per `confirmSustainedMs`.
- [x] **Verificato con simulazione end-to-end** (jitter audio realistico
  ±0.15, 3 run indipendenti): uscita dal respiro entro ~2.9s dal ritorno
  della musica in ogni run — con lo stesso scenario, prima del fix, sarebbe
  rimasto bloccato.
- **Validazione**: typecheck e lint puliti, suite completa **62 file / 566
  test verdi** (nuovo test di regressione che riproduce esattamente la
  dinamica picco-non-tipico osservata dal vivo).

### Task 4.4o — Due assi: RESPIRO ALTO / RESPIRO PROFONDO (2026-08-28)

- [x] **Migrazione strutturale completata.** `stable-breath` è ritirato dal
  tipo runtime e sostituito da due stati abitati: `respiro-alto` e
  `respiro-profondo`. `pressurized` e `decompression` restano passaggi.
- [x] **Regola anti-sovrastrutturazione applicata due volte durante l'audit.**
  La migrazione interrotta aveva aggiunto `reference.phase` come secondo gate
  sull'asse passaggio/assestamento, benché `pressureTrend` rispondesse già alla
  domanda: rimosso. Aveva inoltre riammesso `mad` nella decisione alto/profondo,
  nonostante fosse dichiarata solo contesto: rimossa dal decisore. Il livello
  usa la mediana con `REFERENCE_PRESSURE_DEADBAND`, già esistente.
- [x] **Selettore e host**: whitelist bassa su `decompression`/
  `respiro-profondo`; nessuna esclusione su `pressurized`/`respiro-alto`;
  `respiro-alto` usa hold 1–2 anche fuori boost, `respiro-profondo` 2–3.
  Safety net, passthrough Psycho2D e Varco seguono il nuovo stato profondo.
- [x] **Consumer nel perimetro già disponibile**: Dream-Segmentation riusa
  il profilo profondo e aggiunge il profilo alto tramite leve locali esistenti;
  Filter-Psiche nel Respiro Alto riusa il comportamento pieno preesistente.
  `neuronalMultiplier=1` nell'alto: vocabolario pieno, nessun nuovo rinforzo.
- [ ] **Decisione Visual ancora aperta, non implementata**: Vector-Morph,
  Material-Morph e Bauhaus-Morph non hanno una formula colore da parametrizzare;
  scegliere fra remap palette e filtro post-process prima di aggiungere codice.
  Resta aperta anche l'interpretazione forte di "sovrascrive, non modula" per
  il ramo profondo di Filter-Psiche.
- **Protocollo visivo verificato**: camera/quadro stabili; variazioni locali
  dentro raster/materia; silenzio senza moto autonomo; beat e transizioni non
  modificati; budget subordinato a `lowPowerMode`/pressione risorse.
- **Validazione automatica**: `pnpm typecheck`, suite completa **62 file / 567
  test**, `pnpm lint` puliti; `pnpm build` completato con app, DMG, ZIP e
  blockmap. Resta obbligatorio il collaudo fullscreen live.

### Task 4.4p — FilterPsiche aggressivo anche in DECOMPRESSIONE (2026-08-28)

- [x] **Riscontro live recepito**: dominante verde/ciano, quadro luminoso e
  lattiginoso; l'attenuazione precedente non costituiva una vera apertura.
- [x] **Causa verificata nel renderer**: `artwork.base` è già una variante
  psichedelica; il profilo basso riduceva hue/overlay ma lasciava contrasto e
  brightness invariati e imponeva `saturation >= 1`.
- [x] **Correzione**: esteso il profilo esistente con base e drive per
  contrasto/saturazione/luminosità. DECOMPRESSIONE ora produce
  `saturation < 1` e `brightness < 1`, con contrasto >1; RESPIRO PROFONDO
  scende ulteriormente. Ridotti anche alternate/inverse alpha a livelli
  realmente secondari. Il fallback di preparazione applica immediatamente lo
  stesso profilo basso invece del vecchio `saturate(2.5)`.
- [x] **Nessuna sovrastrutturazione**: stesso `context.filter`, stessi tre
  canvas preparati, nessun nuovo filtro, layer, buffer o ramo temporale.
- **Protocollo**: Camera OK; Materia OK (raster sempre base); Silenzio OK
  (profilo statico, niente tempo autonomo); Beatmatch/Transizione invariati;
  costo invariato.
- **Validazione**: typecheck/lint puliti, suite completa **62 file / 568 test**,
  build completa riuscita con app, DMG, ZIP e blockmap. Resta riscontro live.

### Task 4.4q — Bauhaus/Materia troppo nervosi nei regimi bassi (2026-08-28)

- [x] **Causa verificata**: entrambi smussavano già le bande ma ignoravano il
  regime; l'ampiezza delle trasformazioni locali restava piena anche in
  DECOMPRESSIONE e RESPIRO PROFONDO.
- [x] **Correzione senza nuovo meccanismo**: unica leva di ampiezza applicata
  ai movimenti locali già esistenti — 0,38 in decompressione e 0,16 nel respiro
  profondo. Bauhaus: offset/scala dei piani, cerchi, curve e grana. Materia:
  offset e scala delle regioni. Transizioni, flash e progressione narrativa
  restano invariati.
- **Protocollo**: Camera OK (solo segmenti locali); Materia OK; Silenzio OK;
  Beatmatch preservato; Transizione invariata; costo nullo e low power intatto.
- **Validazione**: typecheck/lint puliti, suite completa **62 file / 570 test**;
  bundle applicativo e ZIP riusciti. Il solo DMG non è stato prodotto per
  errore esterno `hdiutil create` (exit 1). Resta il collaudo fullscreen live.

### Task 4.4r — GPU soltanto DENTRO il Varco Percettivo (2026-08-28)

- [x] **Causa verificata**: il semaforo prima dell'inferenza attendeva 260ms
  fissi; la preparazione reale del passthrough può durare 1–2s più il crossfade.
  La GPU partiva quindi prima della comparsa completa del Varco.
- [x] **Correzione sul meccanismo esistente**: `brainRendererHost` espone
  `isResourcePressureReady()` solo quando il passthrough è `active`;
  `brainController` mantiene vivo `visualPressurePulseUntil` e attende quel
  segnale prima di lasciare entrare `imageGenerator.generate`. Nessun timeout
  che possa autorizzare prematuramente la GPU.
- [x] **Continuità**: durante un cambio fotogramma il gate rilegge gli host
  correnti, evitando di attendere un controller distrutto. Senza Renderer Host
  visibile (avvio senza raster) non esiste un renderer pesante da proteggere.
- **Protocollo/costo**: Camera, Materia, Silenzio, Beatmatch e Transizione
  invariati; stessi layer del Varco, nessun costo nuovo fuori dalla pressione.
- **Validazione**: 16 test mirati, typecheck/lint e suite completa **62 file /
  570 test** verdi; bundle app e ZIP riusciti. DMG fermo sul noto errore esterno
  `hdiutil create` (exit 1). Resta collaudo live.

### Task 4.4s — Regime non inoltrato dal Renderer Host (2026-08-28)

- [x] **Evidenza live**: DECOMPRESSIONE mostrata dall'overlay ma Dream
  Segmentation ancora pieno, additivo e bruciato; Varco/moto di coscienza
  contemporaneamente visibili.
- [x] **Causa verificata**: `brainController` inviava correttamente
  `setPerception` a `currentSvg`, ma `currentSvg` è il Renderer Host, che non
  implementava il metodo. Nessun renderer plugin interno riceveva lo stato.
  Il FilterPsiche del Varco, creato dopo l'invio, nasceva anch'esso senza regime.
- [x] **Correzione strutturale minima**: il Renderer Host conserva l'ultimo
  `BrainBioPerceptionState`, lo propaga ai quattro layer possibili e lo applica
  dentro `createLayer` a ogni nuovo controller. Nessun profilo o soglia ritoccati.
- **Protocollo/costo**: puro inoltro di dati già calcolati; nessun nuovo effetto,
  gate, layer, buffer, moto o costo per frame.
- **Validazione**: 64 test mirati, typecheck/lint e suite completa **62 file /
  571 test** verdi; app e ZIP prodotti. DMG fermo sul noto `hdiutil create`
  exit 1. Resta collaudo live.

### Task 4.4t — Riattivazione deve entrare a prescindere (2026-08-28)

- [x] **Causa verificata**: il trigger del contatore viveva soltanto in
  `advanceToNextProduction`; senza storia successiva pronta, la timeline
  riciclava il sogno corrente e non interrogava mai la Riattivazione.
- [x] **Correzione**: estratto l'invariante puro
  `shouldStartRevisionCycleAtBoundary` e interrogato sia al primo confine sia
  durante il ricircolo. `beginRevisionCycle` accetta ora una prossima produzione
  opzionale: l'archivio può entrare mentre WebGPU/generazione restano in attesa.
- [x] **Archivio non stantio**: al confine viene interrogato direttamente
  `queryDreamImageEntries`; l'ingresso non dipende più dalla gara fra il trigger
  e l'ultimo refresh asincrono del cache.
- [x] **Indipendenza**: nessun riferimento al regime bio nel trigger; Varco,
  pressione GPU e disponibilità di `nextProduction` non autorizzano né negano
  più la Riattivazione.
- **Protocollo/costo**: riuso esclusivo dell'archivio e del ciclo esistenti;
  nessun nuovo effetto, layer, buffer o generazione.
- **Validazione**: typecheck/lint puliti, suite completa **62 file / 572 test**;
  app e ZIP prodotti. DMG fermo sul noto `hdiutil create` exit 1. Resta live.

### Task 4.4u — Tutti i renderer sottostanno sempre al regime (2026-08-28)

- [x] **Separazione selezione/comportamento**: inclusione ed esclusione dai pool
  decidono soltanto quale renderer può entrare. Una volta in scena, ogni
  renderer riceve sempre `pressurized`, `decompression`, `respiro-alto` e
  `respiro-profondo` tramite `setPerception`.
- [x] **Contratto completo**: aggiunto il consumer mancante a Print2D,
  Psycho2D, Vector Morph/SVG, Glitch Morph e Fractal Spiral; Bauhaus e Materia
  riusano la stessa scala comune, mentre FilterPsiche e Dream mantengono i loro
  profili materico-cromatici specifici.
- [x] **Nessun nuovo linguaggio**: la scala comune non genera effetti, ma
  attenua soltanto offset, deformazioni, densità e impulsi locali già derivati
  da bande/beat. `respiro-alto=1,08`, `pressurized=1`, `decompression=0,38`,
  `respiro-profondo=0,16`.
- [x] **Dream senza neuroni**: nei due regimi bassi il moltiplicatore neuronale
  è zero assoluto anche con `residual=0` o intermedio; il residuo non può più
  riattivare filamenti o scariche.
- **Protocollo/costo**: Camera OK; Materia OK; Silenzio OK; Beatmatch e
  Transizione preservati; flash di sicurezza invariati; nessun costo o buffer
  aggiunto e `lowPowerMode` intatto.
- **Validazione**: typecheck/lint puliti, suite completa **63 file / 574 test**;
  build completa riuscita con app, DMG, ZIP e blockmap. Resta collaudo live.

- [x] Task 4.5: `working/STATE.md` e `working/sessions/session-history.md` aggiornati
      dopo ogni fase (non solo a fine sessione) per tutta la Fase 1, 2 e 3 — vedi le
      sessioni `SESSION-2026-08-27-01/02/03` e questo stesso registro §7.

---

## 6. 🧪 Strategia di Verifica e Validation Plan

- **Comandi**: `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Verifica manuale/dal vivo** (unica verifica che conta per il criterio §17/§19):
  - con il log `perception` attivo (temporaneo, va disattivato prima di produzione
    live), ascoltare un set reale e verificare che i 5 segnali e il regime derivato
    corrispondano a quello che si sente accadere nella musica (validazione 11.2/16.2);
  - **senza** overlay diagnostico, verificare che si distinguano a occhio i due
    passaggi (`pressurized`/`decompression`) dai due stati abitati (RESPIRO
    ALTO/PROFONDO), senza ridurli a una "modalità lenta" indistinta;
  - verificare che una Riattivazione che cade in `decompression`/`respiro-profondo` non
    riabilita mai Psycho2D/Fractal Spiral/Print2D (§13/§17.1);
  - verificare dal vivo un passaggio alto→basso e il ritorno, osservando
    RESPIRO ALTO → DECOMPRESSIONE → RESPIRO PROFONDO e la traiettoria inversa.
- **Esito negativo esplicito e accettabile**: se la prova non produce nulla di
  percepibile, o produce solo "modalità lenta" indistinta, il piano si chiude con esito
  negativo dichiarato (§9 del brief, §17 criterio di prova) — non si forza
  un'estensione.

---

## 7. 📝 Note e Registro Avanzamento

- **2026-08-27**: Creazione del piano. Precede l'implementazione — nessun codice
  scritto ancora. Riferimento normativo:
  [`brief-stato-bio-percettivo-definitivo.md`](../../team/briefs/brief-stato-bio-percettivo-definitivo.md)
  §1–§17.3 (tutte le decisioni di Audio, Visual, Ingegneria già consolidate lì; questo
  piano non le ridiscute).
- **2026-08-27 — Correzioni Audio recepite in §4.1**: il Capo Supremo dell'Analisi
  Audio ha corretto quattro punti del progetto originale di `brainBioPerception.ts` prima
  di autorizzare l'implementazione dal proprio dominio: (1) `fast` 2–3s / `mid` 8–12s
  invece di 1.5s/6-8s — valori di collaudo, non costanti filosofiche; (2)
  `perceptualPressure` sostituisce la varianza fra bande con occupazione/pienezza
  spettrale + occupazione/densità temporale, esplicitamente senza introdurre feature
  nuove (roughness/entropy/spectral-flux restano fuori scope, rinviate al Punto 2);
  (3) **`reference` cambia semantica**, e con essa architettura: non si aggiorna più
  quando `persistence` è bassa (rischiava di inseguire la transizione, e di non
  aggiornarsi mai durante una trasformazione lenta e coerente), ma solo dopo che una
  nuova configurazione ha mostrato persistence sufficiente e sostenuta — una macchina a
  stati propria, non un parametro; (4) `residual` si carica per `persistence` sostenuta
  (esistenza di uno stato), non per `perceptualPressure` sostenuta — la pressione
  modula l'ampiezza dell'impronta, non ne decide l'esistenza. Il braccio destro ha
  aggiunto un'osservazione tecnica propria, anch'essa recepita: con `mid` a 8–12s, le
  due letture di conferma dell'isteresi del regime devono essere separate da un
  intervallo minimo pari a `mid`, non dal solo tick di campionamento — altrimenti
  l'isteresi diventa nominale (vedi §4.1, nota sull'isteresi del regime). Tre voci
  minori chiuse: hold `[2,3]` in `stable-breath` dichiarato esplicitamente scelta
  voluta (§4.4); `pnpm build` verificato non necessario ma mantenuto come controllo a
  basso costo (Task 4.3); aggiunto l'aggiornamento di `STATE.md`/`session-history.md` a
  fine sessione (Task 4.5). Nessuna decisione precedente del brief o del piano è stata
  ridiscussa — solo l'architettura interna di `brainBioPerception.ts`, non ancora
  implementata.
