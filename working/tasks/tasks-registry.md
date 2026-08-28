# Registro Dettagliato dei Task (`tasks-registry.md`)

Registro atomico dei micro-task collegati ai Macrotask attivi e recenti.

## Task Collegati a `PIANO-041` — Release Candidate 1

- [x] **`TASK-041-01`** `DONE`: congelare il perimetro funzionale e portare la
  versione a `1.0.0-rc.1`.
- [x] **`TASK-041-02`** `DONE`: creare changelog, note RC, checklist di
  collaudo, matrice piattaforme, problemi noti e criteri Go/No-Go.
- [x] **`TASK-041-03`** `DONE`: committare la feature e integrarla
  localmente in `develop` con merge esplicito.
- [x] **`TASK-041-04`** `DONE`: validare typecheck, lint, suite, build e
  artefatti RC sul commit risultante in `develop`.

## Task Collegati a `PIANO-040` — brief collettivo pragmatico

- [x] **`TASK-040-65`** `DONE`: rendere universale il contratto bio-visivo:
  tutti i nove renderer registrati ricevono e rispettano pressurizzazione,
  decompressione, respiro alto e respiro profondo indipendentemente dai pool di
  selezione. Dream Segmentation mantiene neuroni/filamenti/scariche a zero
  assoluto nei regimi bassi, senza interpolazione attraverso `residual`.

- [x] **`TASK-040-64`** `DONE`: rendere la Riattivazione autonoma dalla
  disponibilità di `nextProduction`; il contatore deve scattare al confine di
  storia anche mentre generazione, Varco o GPU sono ancora in attesa.

- [x] **`TASK-040-63`** `DONE`: riparare il ponte `setPerception` mancante nel
  Renderer Host, inoltrando DECOMPRESSIONE a renderer attivo/entrante e ai
  layer FilterPsiche/Psycho2D del Varco, inclusi quelli creati dopo il cambio.

- [x] **`TASK-040-62`** `DONE`: eliminare l'anticipo fisso di 260ms e non
  concedere l'inferenza GPU finché il passthrough FilterPsiche non è realmente
  `active`, cioè finché non siamo già dentro il Varco Percettivo.

- [x] **`TASK-040-61`** `DONE`: ridurre il movimento locale troppo nervoso di
  Bauhaus Morph e Materia Morph nei regimi bassi riusando l'ampiezza geometrica
  esistente (38% in decompressione, 16% in respiro profondo), senza alterare
  camera, transizioni, flash, silenzio o budget.

- [x] **`TASK-040-60`** `DONE`: correggere FilterPsiche troppo verde/ciano,
  luminoso e dilavato anche in DECOMPRESSIONE; permettere ai profili bassi di
  desaturare e ridurre realmente la luminosità, mantenendo contrasto e raster,
  senza aggiungere layer o nuovi effetti; allineare anche il fallback di
  preparazione per evitare un flash iniziale aggressivo.

- [x] **`TASK-040-58`** `DONE`: completare la migrazione dal regime
  `stable-breath` ai due stati abitati `respiro-alto`/`respiro-profondo`,
  usando `pressureTrend` come unico asse passaggio/assestamento e la mediana
  come livello, senza riattivare dispersione o `reference.phase` come gate.
- [x] **`TASK-040-59`** `DONE`: riallineare selettore, hold, host, overlay,
  Dream-Segmentation, Filter-Psiche e test; validare typecheck, suite completa
  e lint. Nuovi filtri colore per Vector/Material/Bauhaus restano fuori scope
  finché la Direzione Visual non sceglie il meccanismo.

- [x] **`TASK-040-56`** `DONE`: registrare durante l'overlay un campione
  bio-percettivo completo al secondo (bande, segnali, mediana, distanza, candidato,
  regime e renderer) nel session log automatico, con marcatori inizio/fine.
  Verificato nuovamente in `OutputApp.tsx`: era già implementato e il piano lo
  segnava completo (Task 4.4i); il registro era rimasto stantio.

- [x] **`TASK-040-54`** `DONE`: sostituire la blacklist incompleta del
  regime basso con la whitelist normativa esatta; Glitch Morph deve essere espulso
  immediatamente come Psycho2D quando entra decompressione/respiro.
- [x] **`TASK-040-55`** `DONE`: eliminare il nervosismo attorno alla mediana
  con una piccola zona neutra tecnica, senza reintrodurre firma o significatività
  rispetto alla dispersione; aggiungere regressioni sul collaudo reale.

- [x] **`TASK-040-50`** `DONE`: ritirare integralmente la firma
  organizzativa dal regime; ingresso 3 s sotto mediana, uscita 3 s sopra, silenzio
  prioritario a 2 s e rientro affidato alla conferma ordinaria.
- [x] **`TASK-040-51`** `DONE`: misurare end-to-end la latenza della
  `perceptualPressure` e rifiutare scenari oltre 5 s; audit dei test che non potevano
  produrre l'esito atteso.
- [x] **`TASK-040-52`** `DONE`: rendere Dream-Segmentation più lento, aperto
  e scuro senza congelarlo; ridurre i moltiplicatori e mantenere variazione cromatica
  audio-driven nella materia.
- [x] **`TASK-040-53`** `DONE`: adeguare overlay, brief, piano, STATE e
  storico; validazione completa.

## Task Collegati a `PIANO-040` — secondo collaudo dal vivo

- [x] **`TASK-040-46`** `DONE`: impedire che un mazzo renderer costruito nel
  regime precedente possa consegnare Psycho2D/Fractal Spiral/Print2D dopo l'ingresso
  in decompressione o respiro stabile; regressione sul cambio regime a metà storia.
- [x] **`TASK-040-47`** `DONE`: aggiungere la via diretta di silenzio reale
  (circa 2 s) con rientro isteretico più lento, senza contaminare mediana e
  dispersione e senza attendere la firma organizzativa.
- [x] **`TASK-040-48`** `DONE`: rendere l'overlay autosufficiente in due
  secondi: pressione/mediana, distanza firmata, dispersione, significatività
  normalizzata, posizione e condizione bloccante nominata.
- [x] **`TASK-040-49`** `DONE`: validazione mirata, suite completa, typecheck, lint,
  build e aggiornamento coerente di piano/STATE/storico sessione.

## Task Collegati alla Sessione 2026-08-27 (Campionamento frasi, sessione pubblica, v1.0.0-beta.3)

- [x] **`DONE`**: Brief filosofico del Capo Supremo recepito — finestra
  scorrevole con sovrapposizione al posto del campionamento casuale
  uniforme (`sampleBrainPhraseWindow` sostituisce `sampleBrainPhrases`).
- [x] **`DONE`**: Due correttivi del Capo Supremo recepiti — nessun tetto
  al residuo online in nessuna direzione, unico presidio la distribuzione
  temporale del campionamento del memo.
- [x] **`DONE`**: Bug trovato al primo ascolto dal vivo — finestra che
  poteva coincidere con l'intero pool su un pool piccolo (sessione
  pubblica appena aperta), stessa storia due volte con i ponti invertiti.
  Fix strutturale in `sampleBrainPhraseWindow`, non un parametro.
- [x] **`DONE`**: Osservabilità del residuo online nel log di generazione
  (dichiara per ogni seme se e perché il residuo non è scattato, o con
  quale criterio è rientrato).
- [ ] **`TODO`**: Fallback narrativo al 100% osservato nell'unica sessione
  disponibile (contaminata dal bug del passo nullo) — analisi consegnata
  (cancelletti markdown non gestiti dallo stripping, log del catch esterno
  che attribuisce sempre la causa a Qwen anche quando è la validazione a
  scartare, un caso di contenuto troppo corto non risolvibile con
  normalizzazione), nessun intervento di codice ancora pianificato.
- [ ] **`TODO`**: Ripetere il collaudo del criterio di chiusura del brief
  campionamento (ascolto di un giro completo di cursore, sessione chiusa e
  sessione pubblica) con seed non degenerati, dopo il fix del punto sopra.
- [x] **`DONE`**: Consolidata in commit la sessione pubblica (Google
  Form/Sheet → storie dedicate), già implementata ma mai committata.
- [x] **`DONE`**: Consolidata in commit la documentazione di squadra in
  sospeso (architettura plugin renderer, livello bio-percettivo,
  introduzione a Brain, lettera del Capo Supremo degli Ingegneri, regola
  generale del Varco Percettivo).
- [x] **`DONE`**: Release **v1.0.0-beta.3** — commit organizzati per
  argomento su `feature/fractal-spiral-degeneration`, push su origin.

## Task Collegati alla Sessione 2026-08-25 (Varco Percettivo, hotfix spirali, release Beta)

- [x] **`TASK-039-15`** `DONE`: Nome condiviso con la Direzione VJ per il
  mix flash+glitch+passthrough — **Varco Percettivo** — registrato nel
  commento di testa a `brainRendererHost.ts`.
- [x] **`TASK-039-16`** `DONE`: Varco Percettivo armato anche prima del
  moto di coscienza, in coda (`consciousnessMotionLayer.offer()`
  accettato) non al fronte di salita dell'attivazione — margine reale
  fino a un'intera durata di beat dopo che il primo tentativo si è
  rivelato insufficiente dal vivo.
- [x] **`TASK-039-17`** `DONE`: Hotfix — verso di avvolgimento delle
  spirali di Fractal Spiral Degeneration ancora uniforme dopo la prima
  correzione; causa reale (bassa diffusione di `hashUnit` su indici
  piccoli) trovata numericamente, non per ipotesi. Nuova
  `computeSpiralDirection` (avalanche intero).
- [x] **`TASK-039-18`** `DONE`: Release **v1.0.0-beta.1** e hotfix
  **v1.0.0-beta.2** — merge `feature/fractal-spiral-degeneration` →
  `develop` → `main`, tag, push su origin (worktree separato per non
  toccare sessioni parallele in corso sulla stessa directory di lavoro).
- [x] **`TASK-039-19`** `DONE`: Documentazione aggiornata —
  `skills.md` (sezione Renderer Brain corretta: `resourcePressure` è ora
  impostato attivamente, non più inerte; nuova lezione sulla bassa
  diffusione hash su indici piccoli), `working/STATE.md`,
  `working/tasks/tasks-registry.md`.
- [ ] **`TASK-039-20`** `TODO`: Verifica manuale dal vivo di Varco
  Percettivo prima del moto di coscienza e del verso variabile delle
  spirali.

## Task Collegati a `PIANO-039` (Print2D — Vita Interna)

- [x] **`TASK-039-08`** `DONE`: Traduzione tecnica sezione-per-sezione del
  brief VJ del Capo Supremo (`working/plans/piano-039-print2d-vita-interna.md`).
- [x] **`TASK-039-09`** `DONE`: Layer contorno (`contourCore`/`contourFaint`)
  baked a preparazione riusando il gradiente Sobel già calcolato per i
  frammenti d'inchiostro.
- [x] **`TASK-039-10`** `DONE`: Macchina a stati pura
  vivo/freeze/impulso/decadimento (`advancePrintLifeState`/
  `computePrintLifeEnvelope`), innescata dal flash globale esistente.
- [x] **`TASK-039-11`** `DONE`: Respirazione del contorno silenzio-gated
  (`advanceContourBreathingPhase`) + spessore/sdoppiamento
  (`computeContourThickness`/`computeContourDoubling`).
- [x] **`TASK-039-12`** `DONE`: Ampiezze macro delle lastre dimezzate
  (`PLATE_MOTION_SCALE`), moiré e scia dei frammenti d'inchiostro,
  passata condivisa sopra tutti e 7 i preset.
- [x] **`TASK-039-13`** `DONE`: Test, typecheck, lint, build Vite — 467
  test verdi.
- [ ] **`TASK-039-14`** `TODO`: Verifica manuale dal vivo con audio reale
  (contorno vivo, freeze percepibile, impulso, ritorno morbido).

## Task Collegati alla Sessione 2026-08-25 (Riattivazione, semaforo GPU, raster Fractal Spiral)

- [x] **`TASK-039-01`** `DONE`: Diagnosi da log reali (non ipotesi) delle
  segnalazioni "Print2D troppo presente" / "Fractal Spiral assente" durante
  la Riattivazione — trovate due cause distinte e verificabili nel log.
- [x] **`TASK-039-02`** `DONE`: `storyCycleIds()` salta il filtro pressione
  quando boosted (Riattivazione) — copertura completa renderer garantita.
- [x] **`TASK-039-03`** `DONE`: `BrainRendererSelector.reportRendererFailure()`
  + parametro `onRendererFailed` in `brainRendererHost.ts` — il mazzo
  avanza subito oltre un renderer fallito invece di restare fermo per
  l'intero fotogramma sulla rete di sicurezza.
- [x] **`TASK-039-04`** `DONE`: Semaforo proattivo prima del carico GPU
  (`Psichedel.generate` → `onImageGenerationState` awaitable) + flash/glitch
  della rete di sicurezza rinforzati su richiesta esplicita.
- [x] **`TASK-039-05`** `DONE`: Fractal Spiral Degeneration — raster più
  visibile (seconda correzione sullo stesso punto): underlay e tetti di
  opacità del riempimento interno ricalibrati.
- [x] **`TASK-039-06`** `DONE`: Test, typecheck, lint — 461 test verdi.
- [ ] **`TASK-039-07`** `TODO`: Verifica manuale dal vivo di tutti e tre i
  punti durante una Riattivazione reale.

## Task Collegati a `PIANO-038` (Nuovo Renderer Fractal Spiral Degeneration)

- [x] **`TASK-038-01`** `DONE`: Ricerca (agente Explore) su primitive riusabili (crop per-regione, rotazione locale-alla-forma, motivo a raggio crescente) prima di scrivere codice.
- [x] **`TASK-038-02`** `DONE`: Traduzione tecnica del brief artistico (nodo a spirale, degenerazione/reveal per livello, mappa bande, ricorsione economica con satelliti).
- [x] **`TASK-038-03`** `DONE`: Implementazione renderer + 5 funzioni pure + registrazione (registry/selector/types/UI).
- [x] **`TASK-038-04`** `DONE`: 17 test incluso un test di integrazione Canvas2D mockato (600 fotogrammi) — verificato PRIMA della build che la degenerazione avanzi davvero.
- [x] **`TASK-038-05`** `DONE`: typecheck/lint/build verdi (448 test totali).
- [ ] **`TASK-038-06`** `TODO`: Verifica manuale dal vivo con audio reale.

---

## Task Collegati a `PIANO-037` (Figure Bauhaus indipendenti dal raster)

- [x] **`TASK-037-01`** `DONE`: Ricerca (agente Explore) + design (agente Plan) + due giri di chiarimento (comportamento non momento fisso; libreria curata non ML).
- [x] **`TASK-037-02`** `DONE`: Libreria curata di sagome (`brainBauhausSilhouettes.ts`, 6 forme a 8 punti).
- [x] **`TASK-037-03`** `DONE`: Trigger raro via accumulatore alimentato da `motion` (Check Silenzio), geometria sintetica via `BauhausPlane` (Check Materia).
- [x] **`TASK-037-04`** `DONE`: "Diventare un oggetto" — prossimità + selezione libreria + morph via `interpolatedPlane` riusato (Check Transizione).
- [x] **`TASK-037-05`** `DONE`: Integrazione disegno/signature/budget, 26 nuovi test, typecheck/lint/build verdi.
- [ ] **`TASK-037-06`** `TODO`: Verifica manuale dal vivo con audio reale.

---

## Task Collegati alla Sessione 2026-08-21 (Regressione Print2D, Vector Morph, Glitch Morph, Riattivazione)

- [x] **`TASK-036-01`** `DONE`: Fix regressione — rete di sicurezza del renderer attivo fallito usa Print2D solo se boosted (Riattivazione), FilterPsiche altrimenti (`brainRendererHost.ts`).
- [x] **`TASK-036-02`** `DONE`: Vector Morph scarta scene con meno di `MIN_VECTOR_SHAPES` forme rilevate, riusando lo stesso meccanismo `hasFailed`.
- [x] **`TASK-036-03`** `DONE`: Glitch Morph — rilievo beat-sync (`TERRAIN_BASE_RATIO`/`TERRAIN_BEAT_RATIO`), increspatura a velocità condivisa fra righe, indizio di profondità economico.
- [x] **`TASK-036-04`** `DONE`: Riattivazione — sidebar laterali nascoste/ripristinate; morphing additivo+blur fra renderer e fotogrammi durante il ciclo, non solo dissolvenza.
- [x] **`TASK-036-05`** `DONE`: Test, typecheck, lint, build — tutti verdi (409 test).
- [ ] **`TASK-036-06`** `TODO`: Verifica manuale dal vivo con audio reale.

---

## Task Collegati a `PIANO-035` (Nuovo Renderer Glitch Morph)

- [x] **`TASK-035-01`** `DONE`: Analisi solo-design con anteprime Artifact iterative (raster attenuato, tinte per-riga, moto non uniforme) approvate dal Capo Supremo.
- [x] **`TASK-035-02`** `DONE`: Profilo di luminanza per riga cacheato una volta alla preparazione (`buildGlitchProfile`) + seme deterministico per riga (`computeRowSeed`).
- [x] **`TASK-035-03`** `DONE`: Ondulazione audio-gated (`computeLineWobble`, Check Silenzio) e tonalità per-riga indipendente dal tempo (`computeRowHue`).
- [x] **`TASK-035-04`** `DONE`: Collegamento renderer id in tutti i punti (types, registry, selector — `PERSISTENT_STORY_RENDERERS`, label debug, select Control).
- [x] **`TASK-035-05`** `DONE`: Test, typecheck, lint, build (incluso electron-builder) — tutti verdi.
- [ ] **`TASK-035-06`** `TODO`: Verifica manuale dal vivo con audio reale.

---

## Task Collegati a `PIANO-034` (Ciclo Di Revisione)

- [x] **`TASK-034-01`** `DONE`: Logica pura tag/trigger/eviction (`dreamRevisionCycle.ts` + test).
- [x] **`TASK-034-02`** `DONE`: Archivio su disco `DreamImageArchive` + storage singleton + test.
- [x] **`TASK-034-03`** `DONE`: IPC (canali, `OutputApi`, handler main, bridge preload).
- [x] **`TASK-034-04`** `DONE`: Boost intensità morphing (`setBrainRevisionBoost`) e alternanza renderer (`getBoostHint`) + test.
- [x] **`TASK-034-05`** `DONE`: Integrazione `brainController.ts` (contatore storie, archiviazione qualità piena, produzione sintetica, sospensione generazione, uscita pulita).
- [x] **`TASK-034-06`** `DONE`: Test, typecheck, lint, build — tutti verdi.
- [ ] **`TASK-034-07`** `TODO`: Verifica manuale dal vivo con audio reale.

---

## Task Collegati a `PIANO-032` (Nuovo Renderer Dream Segmentation)

- [x] **`TASK-032-01`** `DONE`: Segmentazione riusata (`analyzeMaterialPixels`/`matchMaterialRegions`) + `prepareDreamField` leggero.
- [x] **`TASK-032-02`** `DONE`: Funzioni pure evento vs reattività (profilo di banda, baseline, accumulatore sorpresa con dwell).
- [x] **`TASK-032-03`** `DONE`: Avanzamento trasformazione con inerzia (`computeLocalMorphProgress`) disaccoppiato dall'host ma vincolato ad esso.
- [x] **`TASK-032-04`** `DONE`: Condensazione ("terza forma") e spostamento (trail del fuoco visivo).
- [x] **`TASK-032-05`** `DONE`: Respirazione corporea solo moltiplicativa (Check Silenzio) e disegno (membrane/filamenti/fantasmi).
- [x] **`TASK-032-06`** `DONE`: Collegamento renderer id in tutti i punti (types, registry, selector, label debug, select Control).
- [x] **`TASK-032-07`** `DONE`: Test, typecheck, lint, build — tutti verdi.
- [ ] **`TASK-032-08`** `TODO`: Verifica manuale dal vivo con audio reale.

---

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
- [x] **`TASK-029-10`** `DONE`: Correggere il renderer identificato dalla schermata: escludere Print2D e ripristinare Psycho2D.
- [x] **`TASK-029-11`** `DONE`: Ripristinare Print2D nella rotazione temporale
  generale e nell'attesa, mantenendolo escluso soltanto dalla modalità
  "Tutti per storia"; confermato che Psycho2D era già interamente ripristinato
  da `TASK-029-10`.
- [x] **`TASK-029-12`** `DONE`: Escludere Liquid Morphing e 2001 Slit-Scan
  dall'interludio morphing di "Tutti per storia" (`buildMorphingInterludeDeck`);
  restano Oniric e PsyHyp.
- [x] **`TASK-029-13`** `DONE`: Diagnosticare il renderer dominante nel mazzo
  "Tutti per storia" analizzando i log live. Trovate due cause: (1) il
  bilanciamento fra storie contava le comparse per storia (+1 flat) invece dei
  fotogrammi realmente occupati, penalizzando poco i renderer persistenti
  (2–4 fotogrammi) rispetto a quelli a fotogramma singolo; (2) lo scambio che
  garantisce FilterPsiche in prima posizione usava uno swap a due elementi che
  spediva il renderer meno mostrato (spesso il più penalizzato) in fondo al
  mazzo invece di scorrerlo di una sola posizione. Corrette entrambe: il peso
  ora riflette i fotogrammi effettivamente mostrati e FilterPsiche viene
  spostato in testa senza alterare l'ordine relativo degli altri.
- [x] **`TASK-029-14`** `DONE`: Rimuovere del tutto il forzamento di
  FilterPsiche in prima posizione in `balancedStoryDeck`: la simulazione su
  200 storie mostrava il 62,9% dei fotogrammi occupati da FilterPsiche da
  sola. Con il solo ordinamento per peso (fotogrammi mostrati) la
  distribuzione scende a 23–27% a testa fra i quattro renderer attivi in
  "Tutti per storia", senza esclusioni strutturali.
- [x] **`TASK-029-15`** `DONE`: Estendere il bilanciamento per peso anche al
  mazzo usato durante l'attesa (rigenerazione in corso), che prima usava
  shuffle puro senza registrare né consultare le comparse. Aggiunta
  `weightedDeck` condivisa e peso combinato comparse chiuse + in corso.
  Simulazione su attesa lunga: 28–29% a testa fra i tre renderer persistenti,
  nessuna dominanza.

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
manuale finale viene eseguito dal Capo Supremo.

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
  esplicita del Capo Supremo.
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
- [x] **`TASK-014-06`** `DONE`: Ripristinate variazioni cromatiche visibili e
  beatmatched senza righe o moto di camera; verifica percettiva inclusa nel
  task artistico `TASK-014-05` ancora aperto.

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
- [x] **`TASK-016-08`** `DONE`: Usare nel riquadro del moto un'altra
  immagine delle quattro attive, eliminando i nuclei sintetici.
- [x] **`TASK-016-09`** `DONE`: Escludere Bauhaus Morph, il renderer
  prevalentemente geometrico, dalla sola modalità “Tutti per storia”.

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

---

## Task Collegati a `MACRO-032` (Sogni Elettronici su GitHub Pages)

- [x] **`TASK-032-01`** `DONE`: Preparare `index.html`, aggiungere il contatto
  `misticaelectronica@libero.it`, includere `demo-1.mp4`, verificare desktop e
  mobile, pubblicare il branch `gh-pages` e controllare sito e video pubblici.
- [x] **`TASK-PAGES-02`** `DONE`: Sostituire integralmente `index.html` con il
  nuovo file ricevuto, senza modificarlo, pubblicare `gh-pages` e verificare
  l'identità byte-per-byte fra allegato e risposta HTTPS pubblica.
