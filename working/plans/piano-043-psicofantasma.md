# Piano di Lavoro: PsicoFantasma

> **ID Piano**: `PIANO-043`  
> **Macrotask di Riferimento**: `MACRO-034`  
> **Data Creazione**: 2026-09-07  
> **Stato**: IN_PROGRESS  
> **Autore**: Ingegneria

## 1. Obiettivo

Implementare la fetta verticale PsicoFantasma (`psicofantasma`): sfocamento,
emersione, osservazione, eventuale riconoscimento open-set, attrazione
incompleta e memoria della deformazione. Rotazione normale; gli item
DELIQUESCENCE mantengono precedenza e stato. Non alterare il loro codice.

## 2. Prerequisiti e contesto

Specifica normativa: `team/briefs/brief-psicofantasma-visual-definitivo.md`,
con le deroghe del Consigliere riportate in apertura. Repertorio V1:
**120 silhouette approvate**, 24 per famiglia e 40/40 archetipi guida,
consegnate dal Vice Consigliere il 2026-09-08. Il pacchetto sorgente resta
immutato; la normalizzazione runtime deriva dalle impronte morfologiche già
consegnate.

Il matcher geometrico autorizzato in 034-17 non carica modelli o sessioni
ONNX. Psichedel continua a usare WebGPU in `sd15OnnxWebGpu.ts` senza
mutazioni del proprio runtime.

## 3. Regole e verifica filosofia

- [x] Letti filosofia.md integralmente, mandato Ingegneria e protocollo.
- [x] Camera: inquadratura fissa; deformazioni soltanto nella regione.
- [x] Materia: raster originale nella figura; vietati sticker e outline.
- [x] Silenzio: tempo percettivo, fuoco, riconoscimento e morph sospesi.
- [x] Beatmatch: impulso prima del pacing; fase solo interna; bande distinte.
- [x] Transizione: riuso crossfade host, readiness prima dell'ingresso.
- [x] Alternanza: nessuna modifica alla programmazione 80/20.
- [x] Costo: analisi/blur/morph preparati al cambio immagine; runtime crossfade.
- [x] Autonomia: nessuna analisi importata da altri renderer; vietato
  BAUHAUS_SILHOUETTES e analyzeMaterialPixels.
- [x] Gate a quattro condizioni autorizzato esplicitamente dal Consigliere:
  non aggiungere altri requisiti o nuovi segnali audio; persistenza del
  riconoscimento non va confusa con persistence del regime musicale.
- [ ] Verificare questi vincoli sul renderer reale e in lowPowerMode.
- [x] Background throttling, microfono, DevTools e Panic invariati.

## 4. Fasi e task

### Stato corrente dopo prosecuzione 034-18 — 2026-09-08

Il riferimento implementativo è ora 034-17 (matcher geometrico già
autorizzato) + 034-18 (continuità fra immagini). Le descrizioni CLIP nelle
sezioni di preparazione e nello storico sono superate, non task da riaprire.
034-02b è ritirato per rimozione dell'encoder. Il repertorio 034-04 e il
profiling simultaneo di 034-11 sono completati; resta il collaudo percettivo
Visual 1–12 a schermo.

### Revisione dal vivo del Capo Supremo — 2026-09-08 («procedi»)

Tre difetti segnalati a schermo. Sequenza: zona di riconoscimento pulita →
matcher → persistenza fra immagini.

- [x] 034-19: **presenza residente della regione, legata all'audio.**
  Disposizione dal vivo: «psicofantasma deve sempre evidenziare regioni, di
  continuo finché permane e deve farlo legato all'analisi audio». `retreat` e
  `settled` non decadono più a zero ma verso `RESIDENT_PRESENCE` (0.5; +0.12
  per un riconoscimento riuscito, come memoria della deformazione): almeno una
  regione resta estratta dal fondo sfocato per tutta la vita dell'istanza.
  Nuovo inviluppo continuo `presencePulse` sull'opacità della regione e sul
  mix del fondo sfocato, guidato dallo stesso mix di bande distinte già usato
  per il tempo percettivo (`bandDrive`); il beat resta un micro-accento
  locale. Il silenzio congela ancora tutto (return anticipato invariato).
  Nessuna nuova grammatica, segnale o timer. `figureProgress` e
  `RESIDENT_PRESENCE` esportati per il test. Suite mirata verde, typecheck e
  lint puliti. Da collaudare a schermo.
- [x] 034-20: **gate di qualità immagine** (brief
  `team/briefs/brief-psicofantasma-gate-qualita-immagine.md`, autorizzato dal
  Consigliere 2026-09-08: soglia = solo `interlude`; Opzione A gate puro;
  selezione manuale esente). Implementato:
  - `ImageRenderMode` e `PsychedelScene.renderMode` in `brainTypes.ts`
    (`psychedelImageGenerator.ts` ri-esporta il tipo); `psichedel.ts` scrive
    `renderMode: mode` sulla scena (fotogrammi riusati/deadline ereditano).
  - `BrainRendererPluginContext.frameRenderMode` propagato da
    `brainController.applyFrame`; `currentFrameRenderMode` aggiornato prima di
    ogni `resolve`, iniettato nel selettore come 7° callback
    `getFrameRenderMode`.
  - `excludedForRegime(regime, frameRenderMode?)`: unione con `psicofantasma`
    quando `frameRenderMode === 'interlude'` (oltre alla condizione
    `!isPsicoFantasmaBundled()` già presente). Helper `currentlyExcluded()`;
    `regimeAllows`/`reconcileCurrentRegime`/`automaticIds`/`storyCycleIds`
    lo usano — R2 (cessione a metà hold) via `reconcileCurrentRegime`.
  - Manuale esente: `resolve` corto-circuita prima del filtro. `undefined`
    (archiviato) = ammesso.
  - 4 test nuovi in `brainRendererSelector.test.ts`. 668 test, typecheck,
    lint e build finale (app + ZIP + DMG) puliti. Collaudo a schermo da fare.
- [x] 034-24: **verifica eleggibilità nei quattro regimi e osservabilità
  esatta.** Il §36 è già rispettato dai pool: nessuna correzione applicata.
  Documentati i filtri trasversali che possono azzerare la presenza
  (`interlude`, `HEAVY_RENDERERS_UNDER_PRESSURE`) e la collocazione secondaria
  nel Respiro Alto. `brainController.applyFrame` emette ora un marker
  `brainRendererSelector.resolve per fotogramma` con l'esito effettivo e il
  contesto necessario a calcolare la permanenza. Regressione diretta sui
  quattro regimi; suite 72/681, typecheck, lint e build verdi.
- [x] 034-21: **reattività musicale.** «Non è reattivo alla musica».
  `brainPsicoFantasmaCanvas.ts` `update()`: la separazione ottica ora oscilla
  con ampiezza percepibile — fondo `worldDefocus = focusRamp·(0.5 + bandDrive·0.4
  + accent·0.32)` (scatto marcato su ogni battito via `calculateRhythmicAccent`),
  figura `beatPresence = 0.52 + 0.42·accent + 0.14·bandDrive` (respiro ~2×,
  mai sotto il minimo `034-19`), seconda passata `source-over` sul colpo forte
  (`accent > 0.3`) per il pieno contatto ottico, `perceptualElapsed` con
  spinta `beatKick·26` così il morph procede a scatti. Nessun colore, nessun
  halo/glow — solo separazione ottica (gate Beatmatch). Silenzio congela.
- [x] 034-22: **sfumatura dei bordi della selezione.** «Deve sfumare i bordi».
  Nuovo `featherMask()` in `brainPsicoFantasmaCanvas.ts`: la maschera netta
  0/255 diventa alpha graduata su ~`FEATHER_PX` (3 passate box-blur senza
  ri-soglia) e alimenta `preparePsicoFantasmaDeformation` come source e target;
  cuore pieno, fascia di bordo che degrada nel fondo sfocato (brief §53 «no
  sticker nitidi»). `region.mask`/`contour`/`psicoFantasmaStructuralCoherence`
  restano netti (matcher intatto). Esportata per il test.
- [x] 034-23: **poche regioni estratte.** `analysis.ts`: tetto occupazione
  `0.68 → 0.94`, minimo celle `18 → 12`, e fallback garantito (se nessun
  componente qualifica ma ne esiste uno ≥ minimo, si prende il più forte) —
  un primo piano dominante o una figura piccola non lasciano più il quadro
  senza regione. Flat raster → ancora `[]`. 2 test nuovi.

- [x] 034-16: **de-squadratura + contorno.** `extractPsicoFantasmaRegions`
  non deriva più `region.mask` dall'appartenenza di cella sulla griglia
  64×36. La griglia trova la massa; la maschera è a livello di pixel con
  split figura/fondo al punto medio fra la luminanza media della componente
  grezza e quella dell'intorno, gate «vicino alla massa» dilatato di una
  cella, due passate box-blur+soglia, componente connessa più grande, buchi
  interni riempiti. Nuovo `PsicoFantasmaRegion.contour` (Moore-neighbor +
  Douglas–Peucker) per il matcher geometrico. `clipCrop`,
  `buildMorphLayers` e `psicoFantasmaStructuralCoherence` invariati nella
  firma. Preprocessing CLIP `-v1` intatto. 663 test, typecheck, lint.
- [x] 034-17: **matcher — Opzione B, senza CLIP.** Decisione del Consigliere
  2026-09-08: matcher geometrico, nessun veto semantico (in psichedelia la
  foglia che diventa mano è il risultato, non l'errore; il veto misurerebbe
  una correttezza nominale fuori scopo — brief Visual §12/§52), via libera
  alla rimozione di CLIP; 20–40% confermato come criterio di collaudo.
  Implementato:
  - **Nuovo `psicofantasma/shape.ts`**: `ShapeDescriptor` = 7 momenti di Hu
    (log-compressi), armoniche di contorno DFT (invarianti a start-point e
    scala), `elongation` (sqrt asse minore/maggiore dell'ellisse d'inerzia,
    invariante a rotazione) e `compactness` (perimetro²/4π·area). Raster 96²
    condiviso (silhouette da `rings`, regione da `mask` letterbox-ata a
    proporzioni). `shapeAffinity` combina le quattro distanze in `[0,1]`.
  - `recognition.ts`: `rankPsicoFantasma(ShapeDescriptor, repertoire)` —
    dedup per archetipo, margine sul secondo concetto distinto. `WeakMap`
    per i descrittori delle silhouette. `decidePsicoFantasma` invariato.
  - `brainPsicoFantasmaCanvas.ts`: `describeRegionMask(region.mask, …)` →
    `rankPsicoFantasma`; rimossi `embedPsicoFantasmaImage` e le url modello.
    `PSICOFANTASMA_THRESHOLDS` ritarato per la scala geometrica (`affinity`
    0.7, `margin` 0.05, `structure` 0.34) — da rifinire a schermo.
  - `repertoire.ts`: `Silhouette` senza `embedding`; rimossi `CLIP_IMAGE_SPEC`,
    `normalizeEmbedding`, `clipPixels`, `encoderSha256`/`preprocessing`.
    `analysis.ts`: rimosso `PsicoFantasmaRegion.clipCrop`. `preparation.ts`:
    rimosso `letterboxPsicoFantasmaCrop`.
  - **Eliminati**: `psicofantasma/clipClient.ts`, `clipWorker.ts`,
    `clipClient.test.ts`, `scripts/prepare-psicofantasma-repertoire.mjs`,
    `scripts/verify-psicofantasma-clip.mjs`. `vite.config.ts`: rimossi
    controllo hash encoder ed emit del `.onnx` (resta solo `repertoire.json`).
    `psicoFantasmaAvailability`: commento aggiornato.
  - Nuovo `shape.test.ts` (6), `repertoire.test.ts` riscritto per il matcher
    geometrico, integrazione canvas senza Worker/embedding. 668 test,
    typecheck e lint puliti.
- [x] 034-18: **persistenza fra immagini, implementata e verificata tecnicamente.**
  `psicofantasma/formMemory.ts`: un solo slot rotante con silhouette risolta,
  completamento raggiunto, bbox normalizzata, due stadi raster già preparati
  e loro interpolazione, opacità e durata residua. Una generazione impedisce
  alle istanze uscenti di sovrascrivere la nuova. Il prep ricompone la forma
  effettivamente raggiunta e prepara il trasporto verso il nuovo candidato;
  il gate resta indipendente e precede l'uso del passaggio. La figura corrente
  cede gradualmente al morph, senza un taglio al riconoscimento. Senza match
  la vecchia forma decade in 12 s percettivi, senza ringiovanire ad ogni immagine
  e senza tornare alla foto. Silenzio/hold congelano. Checkpoint per ricreazione
  della stessa immagine conservato. Budget: 18 stadi 480×270 massimo, 9 low power;
  circa 9.4 MiB di raster aggiuntivo residente per passaggio normale, prima
  degli overhead Canvas e dei temporanei di preparazione. Nessun nuovo modello.
  Verifiche: 671 test, typecheck/lint; Canvas reale A riconosciuta → B riconosciuta
  → C senza regione, decadimento completo e silenzio; B/C in lowPowerMode.
  Fixture tecniche, non collaudo artistico. Repertorio e taratura restano aperti.
  Build finale completa (app/ZIP/DMG). Diagnostica della prova reale:
  A `fixture-0:0.811`, B `fixture-1:0.998` con traccia `fixture-0:morph`,
  C `none:no-region` con traccia `fixture-1:expired`; silenzio a pixel identici.
  File tecnici temporanei `/tmp/psico-continuity-*`, esclusi dal bundle.

### Selezione manuale richiesta dall'utente — 2026-09-08
- [x] 034-15: voce sempre selezionabile, passaggio diretto a Manuale;
  senza repertorio eseguire emersione/osservazione senza matching, con
  indicazione nel pannello. Esclusione automatica finché gli asset mancano.

Il plugin è ora sempre registrato per consentire la selezione manuale.
Il filtro degli asset vive nell'eleggibilità automatica. Senza repertorio
la prova usa il percorso senza candidato: nessuna inferenza e nessun falso
riconoscimento. Questa disposizione supera la precedente disabilitazione UI.

### Revisione implementativa — 2026-09-08
- [x] 034-12: correggere ripartenza periodica, memoria interrotta, accento
  globale, compositing per frame e congelamento effettivo del Canvas.
- [x] 034-13: disponibilità prima della rotazione, bundle completo e crescita
  del repertorio senza limite V1 nel loader runtime.
- [x] 034-14: verificare identità delle cache e cancellazione concorrente.

La precedente dicitura «completo» descriveva l'integrazione compilabile,
non la conformità Visual. I punti sopra riaprono la verifica tecnica;
034-07/08/09 riconvalidati tecnicamente nelle prove riportate in fondo.
Nessuna sagoma curata è presente; conformità percettiva ancora da collaudare.

### Preparazione
- [x] 034-01: acquisire brief, nome definitivo, aprire piano e registri.
- [x] 034-02a: verificare dimensioni pubblicate FP32/INT8 e backend CPU.
- [x] 034-02b: **SUPERATO da 034-17**, encoder rimosso. Smoke storico conservato;
  confronto CLIP/SD non eseguito e non più applicabile. Profiling renderer/SD in 034-11.
- [x] 034-03: schema normalizzato e loader rigoroso; preparazione embedding
  offline con stesso encoder/preprocessing del crop runtime.
- [x] 034-04: importare le 120 silhouette approvate, licenze, validazione,
  24 elementi per famiglia e 40/40 archetipi guida.

### Implementazione
- [x] 034-05: preparazione geometrica CPU e cache al cambio immagine; nessun
  modello, Worker o carico VRAM.
- [x] 034-06: ranking geometrico per concetto (varianti non rivali), gate quattro
  condizioni e diagnostica candidato/affinità/margine/motivo del rifiuto.
- [x] 034-07: analisi raster locale, cache blur, emersione prima del morph,
  forma liminale, memoria fuori istanza e quattro varianti.
- [x] 034-08: registry, UI e pool dei quattro regimi; rotazione normale,
  dominanza DELIQUESCENCE invariata; disponibilità condizionata ad asset validi.

### Verifica
- [x] 034-09: test negativi gate/loader, repertorio reale, silenzio e
  ricreazione istanza; test update reale e risultati obsoleti.
- [x] 034-10: typecheck, lint, suite pertinente, build e verifica bundle con repertorio.
- [ ] 034-11: profiling reale simultaneo a Psichedel completato; restano i
  Test Visual 1–12 a schermo.
  Target 20–40% solo al collaudo, mai quota runtime.

## 5. Validation Plan

`pnpm typecheck`, `pnpm lint`, test Vitest mirati e `pnpm build`.
Misurare caricamento, descrittori, ranking, heap e durata Psichedel nello
stesso processo durante il denoising WebGPU.
Corpus Visual: riuscite, incompatibili e ambigue; annotare ogni decisione.
Silenzio in ogni fase; distruzione/ricreazione; cambio immagine durante
inferenza; low power; freeze/Panic; transizioni e memoria Test 9.

### Repertorio V2 approvato — 2026-09-08

Importati 120 SVG, 24 per famiglia, 40/40 archetipi. Tutti gli hash sorgente
corrispondono al manifest e tutti i contorni riproducono esattamente
l'impronta 32×32 consegnata. 120/120 descrittori finiti e compatibili con
`psicoFantasmaStructuralCoherence`. Sul repertorio stesso 115 sagome esatte
passano il gate e 5 vengono rifiutate per margine zero; non è una misura del
target Visual 20–40%.

Profiling simultaneo reale: Psichedel WebGPU 34,301 s contro riferimento
caldo 34,840 s; carico completo PsicoFantasma 44,6 ms e circa 1,7 MB heap,
senza modello o VRAM. Dettagli e cinque collisioni per asset in
`docs/psicofantasma-repertorio-collaudo.md`.

Validazione finale: 72 file / 674 test, typecheck, lint e build completa
app/ZIP/DMG. Il repertorio estratto da `app.asar` contiene 120 sagome, 40
archetipi e coincide per hash con `config/psicofantasma/repertoire.json`.

### Diagnosi log live — 2026-09-09

Il matcher è entrato realmente in funzione dopo la consegna del repertorio:
49 decisioni riportano un `candidateId`, affinità, margine e coerenza, quindi
non sono semplici attivazioni del renderer. Finestre osservate: 8 settembre
23:00:58–23:06:00 CEST (22 decisioni) e 9 settembre 14:34:54–14:40:13 CEST
(27 decisioni).

Nessuna delle 49 decisioni ha superato il gate: 24 rifiuti per affinità, 17
per margine e 8 per coerenza strutturale. La persistenza era già maturata
(circa 1,37–1,73 s). Nei log disponibili non compare alcun
`recognized: true`: il riconoscimento viene eseguito, ma finora non autorizza
mai l'attrazione verso l'archetipo. Il risultato live osservato è 0%, sotto
il criterio Visual 20–40%; nessuna soglia viene modificata in questa diagnosi.

## 6. Avanzamento e numeri verificati

2026-09-07: API Hugging Face per Xenova/clip-vit-base-patch32:
- vision_model.onnx: **351685709 byte** (335.393 MiB).
- vision_model_int8.onnx: **88648877 byte** (84.542 MiB), SHA256
  `0ab0c1b3ace708e539633af1744d5a95247fe4e14d3e08ff197ef82a6cb9bd93`.
- vision_model_quantized.onnx: **89117001 byte** (84.989 MiB).
INT8 è il candidato tecnico iniziale (~74.8% meno byte di FP32), non una
qualità di riconoscimento già certificata. Non è emersa evidenza comparativa
che giustifichi sostituire CLIP con altro modello. Se emerge, fermarsi e riferire.

Fonti verificate il 2026-09-07:
- https://huggingface.co/api/models/Xenova/clip-vit-base-patch32/tree/main/onnx
- https://huggingface.co/Xenova/clip-vit-base-patch32/tree/main/onnx
- https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html

### Consegna della base tecnica — 2026-09-07 15:57 CEST

Implementati in `src/renderer/output/brain/psicofantasma/`:
- schema e loader (validazione geometria, provenienza, encoder e preprocessing),
  cinque famiglie e controllo separato della fetta V1;
- conversione RGBA/tensor e rasterizzazione delle sagome già curate;
- client/Worker ONNX solo WASM, singolo thread, preparazioni serializzate,
  cache per immagine e terminazione del Worker;
- ranking coseno fra concetti distinti, gate puro con tutti i motivi di
  rifiuto e memoria operativa limitata fuori istanza.

`docs/psicofantasma-repertorio.md` è la consegna del formato alla Direzione
Visual. Script offline `prepare-psicofantasma-repertoire.mjs` e verifica
reale `verify-psicofantasma-clip.mjs` eseguiti con successo. Due sagome
artificiali sono state usate soltanto in /tmp per verificare lo script;
non sono curatela, corpus di collaudo o asset del bundle.

Smoke test reale CPU: caricamento 224 ms, inferenze 296/240/239 ms;
RSS campionata 49.2 → 460.7 MiB, 461.6 MiB dopo release+GC. Da qui
terminazione Worker, non sola release. Non misurati picco o simultaneità SD.

Questa prima consegna storica della base aveva **12 test passati**, typecheck
e lint puliti. Il blocco 034-04 descritto allora è stato superato dalla
consegna V2 del 2026-09-08; resta come cronologia della scelta ritirata.

### Implementazione Canvas e integrazione — 2026-09-07

Completati 034-05/06/07/08/09/10: estrazione locale di masse dal raster,
crop mascherati e letterbox, inferenza CLIP CPU per figura, sostegno globale
del candidato come terzo gate, osservazione audio come quarto gate, cache di
blur e 18 stadi di maschera, progressione locale non uniforme e memoria
operativa fuori istanza. Varianti APPARITION, DOUBLE, HESITATION e AFTERIMAGE.

Camera e quadro restano fermi. Il tempo avanza con contributi distinti di
low/lowMid/mid/high e si congela nel silenzio. Il beat modifica soltanto la
separazione ottica locale. Low power limita la preparazione e il disegno a
una figura; la pressione risorse rinvia la preparazione e PsicoFantasma è
nel gruppo pesante escluso dai nuovi pick durante il denoising.

UI, registry, tipi, protocollo modello e pool dei quattro regimi aggiornati.
DELIQUESCENCE resta dominante al 95% nel Respiro Profondo. A quella data il
bundler era predisposto a includere `config/psicofantasma/repertoire.json`;
il file è ora presente e verificato nel bundle finale.

Validazione storica: 69 file / 654 test, incluso ciclo `update()` reale con
Canvas simulato, typecheck e lint puliti, build completa riuscita. I blocchi
034-02b/034-04 descritti allora sono ora superati; il gate resta non tarato
percettivamente finché manca il Test Visual 1–12.

### Revisione tecnica conclusa — 2026-09-08 01:11 CEST

La descrizione del 7 settembre è superata nei seguenti punti:
- fase finale senza riavvio periodico; snapshot scalari fuori istanza per
  24 immagini, compresa un'attrazione interrotta; un solo store operativo;
- blur senza ingrandimento, trasporto della texture locale sui due assi,
  18 stadi precomputati con crossfade continuo, buffer riutilizzato;
- niente accento globale; silenzio/hold mantengono i pixel raggiunti;
- nessuna regione è un esito valido senza inferenza, non un errore tecnico;
- cache dei crop per contenuto e sottoscrizioni indipendenti: distruggere
  un'istanza non annulla il lavoro necessario all'altra;
- import esclusivamente `onnxruntime-web/wasm`; nessun backend GPU CLIP;
- senza repertorio nessuna registrazione in rotazione, voce UI disabilitata;
  con dati presenti il build valida schema, copertura famiglie, minimo 40,
  hash e byte encoder, poi include entrambi in `dist/brain-models/psicofantasma`;
  oltre 60 sagome nessuna modifica al codice.

Prove: **70 file / 661 test**, typecheck e lint puliti. Build finale completa
app/ZIP/DMG; il tentativo sandbox precedente aveva fallito in `hdiutil`,
risolto ripetendo il build con i permessi di esecuzione necessari.
Canvas reale Electron con fixture tecnica separata dalla curatela: confronto
pixel identico nel silenzio e dopo ricreazione, una richiesta di embedding,
fase finale stabile. Questo test usa embedding simulati e non misura CLIP.
Prova distinta del Worker finale con encoder effettivo via protocollo
`brain-model`: **512 componenti, 311.8 ms inferenza, 1116.5 ms totali**.
Script e PNG della prova tecnica in `/tmp/psico-*` e `/tmp/psicofantasma-*`;
non sono asset del repertorio o immagini di collaudo Visual.

Stato storico di quella revisione: erano aperti 034-04, 034-11 e la
simultaneità SD. La consegna V2, il bundle e il profiling sono ora completati;
rimane soltanto il segmento percettivo di 034-11.
