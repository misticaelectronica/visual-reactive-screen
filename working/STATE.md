# Stato Globale del Progetto (`STATE.md`)

## Nuovo: figure Bauhaus indipendenti dal raster (PIANO-037) — 2026-08-21

- Bauhaus Morph disegna ora, di tanto in tanto, una forma geometrica pura
  (rettangolo/ellisse/triangolo) non derivata dall'analisi del raster —
  un comportamento raro guadagnato da un accumulatore alimentato da
  `motion.activity`/`beat` (stesso principio dell'accumulatore di
  sorpresa in Dream Segmentation, riadattato senza costruire un secondo
  sistema di profilo di banda), mai un timer fisso (Check Silenzio).
- **Comportamento richiesto in un secondo momento dallo sviluppatore**:
  se la figura resta vicina a un piano raster-derivato già presente per
  1-2s, prova a "diventare" una sagoma riconoscibile — scelta da una
  libreria curata a mano (`brainBauhausSilhouettes.ts`, 6 sagome in
  stile Bauhaus/Schlemmer: luna, foglia, bottiglia, uccello, stella,
  freccia), selezionata in base alle proporzioni del piano vicino, MAI
  via ML (scelta esplicita dello sviluppatore dopo averla proposta come
  alternativa in fase di piano). Il morph verso la sagoma riusa
  `interpolatedPlane` — già esistente, invariato — rappresentando sia la
  forma astratta di partenza sia le sagome curate come contorni a 8
  punti, così l'interpolazione punto-per-punto scatta automaticamente.
- Vedi `working/plans/piano-037-bauhaus-figure-indipendenti.md` per il
  piano completo (agente Explore + agente Plan, poi due giri di
  AskUserQuestion per chiarire "comportamento non un momento fisso" e
  "niente ML, libreria curata").
- Validazione: 57 file / 429 test, typecheck, lint e build verdi.

## Trovato e corretto: rallentamento generale da filtro CSS blur ricalcolato ogni frame — 2026-08-21

- **Segnalato dallo sviluppatore**: dopo il round precedente (morphing
  additivo durante la Riattivazione) l'app "lagga da morire", tutto
  fuori tempo. **Causa trovata rileggendo le modifiche appena fatte**: il
  morphing aggiunto per la Riattivazione applicava, oltre al blend mode
  additivo (`mixBlendMode: 'lighter'`, quasi gratuito per la GPU), anche
  un `filter: blur()` con raggio ricalcolato ad OGNI frame su due strati
  a piena risoluzione (`brainRendererHost.ts` per il cambio renderer,
  `brainController.ts` per il cambio fotogramma) — un filtro CSS
  ricalcolato ogni frame è un'operazione pesante, non paragonabile a un
  cambio di blend mode.
- **Fix**: rimosso interamente il `blur()`. Resta solo il blend mode
  additivo per l'effetto di fusione — stesso principio ("più morphing di
  un fadein/fadeout"), costo quasi nullo. Il blend mode ora viene scritto
  solo quando lo stato boosted cambia effettivamente (non ad ogni frame),
  ulteriore riduzione di lavoro superfluo.
- Validazione: 57 file / 409 test, typecheck, lint e build verdi.

## Regressione Print2D fuori Riattivazione, rete di sicurezza Vector Morph, Glitch Morph beat-sync — 2026-08-21

- **Regressione corretta**: la rete di sicurezza aggiunta in sessione
  precedente per il fallimento del renderer attivo (`brainRendererHost.ts`)
  passava sempre a Print2D, violando la regola "Print2D gira solo durante
  la Riattivazione" (PIANO-034) già richiesta esplicitamente in
  precedenza — segnalato dallo sviluppatore come regressione. Fix: la
  rete di sicurezza ora usa `getBoostHint` per scegliere Print2D solo
  durante la Riattivazione, FilterPsiche (già affidabile e usato altrove
  nello stesso file) in ogni altro momento.
- **Vector Morph**: scarta la scena vettoriale con meno di
  `MIN_VECTOR_SHAPES = 5` forme rilevate (`hasFailed()` → true),
  riusando lo stesso meccanismo di fallback appena corretto — prima una
  vettorializzazione con 3/4 forme restava comunque a schermo come se
  fosse valida.
- **Glitch Morph**: rilievo ricalibrato — ampiezza base moderata (`0.09`
  dell'altezza) che sale marcatamente ad ogni battito (`+0.16 × beat`),
  raster più visibile (opacità 64%), rimossa la frequenza indipendente
  per riga (frammentava la superficie in rumore scollegato dal raster,
  segnalato dallo sviluppatore) sostituita da una velocità di
  increspatura condivisa fra tutte le righe, aggiunto un indizio di
  profondità economico (righe in basso più spesse/opache) per la
  sensazione di rilievo 3D — nessuna libreria esterna, Canvas2D puro.
- Riattivazione: sidebar laterali (testo/storia e galleria raster)
  nascoste per tutta la durata del ciclo e ripristinate alla fine;
  cambio renderer/fotogramma durante la Riattivazione ora fonde i due
  strati in additivo con una sfocatura a metà transizione invece del
  semplice dissolvenza lineare.
- Validazione: 57 file / 409 test, typecheck, lint e build verdi.

## Nuovo renderer: Glitch Morph — contorno di luminanza — 2026-08-20

- Ottavo renderer Brain (`glitch-morph`, PIANO-035): il raster resta il
  livello di base (attenuato al 40%, mai sostituito), sopra vengono
  ridisegnate linee di contorno seguendo il profilo di luminanza
  dell'immagine, con frangia cromatica iridescente e ondulazione
  audio-gated per riga.
- Nato da un'analisi solo-design su 3 giri di iterazione tramite
  Artifact interattivi: variante scelta ("pura scanline") sostituita a
  metà discussione da un riferimento più specifico (glitch art
  olografica), poi corretta due volte su feedback diretto — sfondo nero
  del riferimento rifiutato (il raster deve restare visibile fra le
  linee), poi anche il raster a piena opacità rifiutato (deve restare
  attenuato, non protagonista) — infine tinte primarie additive che
  convergevano al bianco e movimento sincronizzato fra le righe corretti
  con tonalità per-riga derivata dalla luminanza e semi hash per-riga
  (fase/frequenza proprie, niente onda unica).
- Vedi `working/plans/piano-035-glitch-morph-renderer.md` per la
  tecnica completa e i Check di filosofia visiva applicati.
- Validazione: 57 file / 406 test, typecheck, lint e build (incluso
  electron-builder) verdi. Non ancora verificato dal vivo con musica
  reale.

## Dream Segmentation: respiro più marcato, connessioni davvero neurali — 2026-08-20

- **Respiro poco visibile** (segnalato dopo il giro precedente):
  ampiezza di `computeRegionBreathing` più che raddoppiata
  (`activity*0.14→0.34`, `beat*(0.06+sal*0.09)→beat*(0.16+sal*0.22)`).
  Legata anche l'opacità della membrana alla stessa espansione (non solo
  il raggio): il respiro ora si vede in dimensione E luminosità insieme,
  altrimenti su regioni piccole la sola scala restava impercettibile.
- **Filamenti non assomigliavano a connessioni neurali**: aggiunte
  piccole diramazioni dendritiche ai due estremi di ogni filamento
  (`computeDendriteBranchPoint`, `drawDendrites`) — geometria
  deterministica (hash stabile sulla posizione del nodo, non casuale a
  ogni frame: una connessione nervosa non trema), costo trascurabile (due
  tratti corti per nodo).
- Nuovi test per `computeDendriteBranchPoint` (direzione, determinismo,
  varietà fra seed diversi).
- Validazione: 56 file / 393 test, typecheck, lint e build verdi.

## Trovato e corretto: congelamento fino a 2m14s (non un bug di Dream Segmentation) — 2026-08-19

- **Segnalato dallo sviluppatore**: Dream Segmentation "resta fissa per
  minuti". **Verificato dai log** (`session-2026-08-19-23-08-00.txt`) che
  NON è un bug specifico del renderer: alle 21:10:36 è partito un "moto
  di coscienza" (`brainConsciousnessMotion.ts`, il pannello che richiama
  un ricordo passato) — per design congela l'intera timeline della
  storia (nessun avanzamento fotogramma/renderer) finché il pannello non
  si conclude. L'unica condizione di uscita richiedeva 16 beat
  consecutivi rilevati dopo un minimo di 12s; con rilevamento del beat
  irregolare quella condizione non si è mai verificata, e la timeline è
  rimasta bloccata dalle 21:10:36 alle 21:12:50 — **2 minuti e 14
  secondi**. Qualunque renderer fosse attivo in quel momento (stavolta
  Dream Segmentation, selezionato pochi secondi prima) sarebbe apparso
  "fisso" allo stesso modo.
- **Fix**: aggiunto un tetto massimo di sicurezza
  (`MOTION_MAX_READ_MS = 45_000`) — l'uscita forzata scatta comunque
  dopo 45s anche se il conteggio beat non si completa mai, indipendente
  dalla condizione normale di uscita (che resta invariata per il caso
  normale).
- Nuovo test: uscita forzata con `beatIndex` che non avanza mai di 16.
- Validazione: 56 file / 390 test, typecheck, lint e build verdi.

## Dream Segmentation: contrasto più forte, scariche elettriche lungo la rete — 2026-08-19

- **Contrasto rafforzato ulteriormente** (richiesta esplicita dello
  sviluppatore, "fai quello che vuoi ma rendilo più visibile"): aggiunto
  un livello di scurimento uniforme (`multiply`, ~0.32-0.44 di opacità
  legata alla tensione) su tutto il raster prima delle primitive, oltre
  al velo scuro già esistente per singola membrana — il raster resta
  sempre riconoscibile sotto (Check Materia), solo con meno contrasto
  locale, non sostituito.
- **Scariche elettriche lungo i filamenti**: nuovo livello ispirato
  direttamente alla morfologia già prevista dal design brief
  (`piano-032-dream-segmentation-renderer.md`: "la struttura neuronale
  può essere un riferimento morfologico... senza diventare anatomia
  letterale") — un piccolo bagliore viaggia lungo un budget ridotto
  (`ELECTRIC_PULSE_BUDGET = 5`) di connessioni, sfumando dentro/fuori ai
  due estremi (`computeElectricPulsePoint`, curva quadratica identica a
  quella già disegnata). La fase avanza solo con musica realmente attiva
  (`advanceElectricPulsePhase`, stesso pattern di
  `advanceBauhausAbstraction`: zero in silenzio, mai un orologio libero
  — Check Silenzio) e a costo quasi nullo (nessuna nuova analisi, solo
  qualche gradiente radiale in più, disattivato del tutto in silenzio).
- Nuovi test per le funzioni pure aggiunte
  (`advanceElectricPulsePhase`/`quadraticPointAt`/`computeElectricPulsePoint`).
- Validazione: 56 file / 389 test, typecheck, lint e build verdi.

## Regressione trovata e corretta: mobilità/sensibilità musicale ridotta da resourcePressure troppo esteso — 2026-08-19

- **Segnalato dallo sviluppatore** ("ridotto mobilità e sensibilità
  musicale") dopo il lavoro di questa sessione sul passthrough
  FilterPsiche+Psycho2D/flash. **Causa reale trovata nei log**
  (`resourcePressureRatio` a 1.0 in più finestre consecutive,
  `session-2026-08-19-18-45-14.txt`/`18-16-01.txt`): il render loop
  collegava `currentSvg?.setResourcePressure()` (che spegne la ricchezza
  visiva/morph di QUALUNQUE renderer attivo e attiva il passthrough) alla
  stessa finestra `longFrameBlockedUntil` usata per il **pacing della
  prossima generazione** (9-20s di backoff per gap RAF). Con gap RAF
  frequenti (ogni 10-90s, a volte a raffica), quelle finestre si
  incatenavano tenendo la pressione "attiva" per tratti lunghi — i
  renderer restavano degradati per gran parte del tempo, non solo nei
  rari stalli reali.
- **Fix**: introdotto un impulso breve e dedicato
  (`visualPressurePulseUntil`, 2.5s), impostato solo quando
  `thermalScheduler` segnala davvero un evento `'long-frame'`
  (`reportThermalEvent`), usato ORA per `setResourcePressure`/passthrough/
  flash — abbastanza per coprire il momento dello stallo, non per
  degradare tutto per 9-20s. Le altre due chiamate legittime a
  `longFrameBlockedUntil` (evitare Bauhaus/Materia/Dream Segmentation
  nella selezione renderer, ridurre gli step di denoising) restano
  invariate — non avevano questo effetto collaterale.
- Validazione: 56 file / 384 test, typecheck, lint e build verdi.

## Riattivazione: giri multipli, copertura renderer completa; Bauhaus cerchi; Dream Segmentation velo scuro — 2026-08-19

- **Riattivazione — immagini 5-9, giri multipli decrescenti**: sostituito
  il numero fisso (10) con `pickRevisionImageCount()` (casuale 5-9). Le
  immagini scelte non passano più una volta sola: girano per
  `REVISION_CYCLE_LAPS = 3` giri, ciascuno rimescolato per varietà, con
  durata per fotogramma decrescente (`computeRevisionLapDurationMs`):
  primo giro -30%, dal secondo in poi -50% — un ricordo richiamato
  ripetutamente si consuma più in fretta, non si dilata. `buildRevisionProduction`
  ora costruisce i fotogrammi ripetendo il set scelto invece di usarlo una
  sola volta; `revisionCycleActiveUntil` somma le durate reali (non più
  frameCount × durata fissa).
- **Copertura completa dei renderer + Print2D esclusivo**: durante la
  Riattivazione (`getBoostHint` sul selettore) `storyCycleIds()` include
  ora anche Print2D, bypassando `STORY_CYCLE_EXCLUDED_RENDERERS` — Print2D
  compare *soltanto* durante la Riattivazione, mai nella rotazione
  normale. Il mazzo di storia (`advanceStoryRenderer`) si rifornisce da
  solo con una nuova mescolata quando si esaurisce, invece di fermarsi
  sull'ultimo renderer per il resto della storia sintetica (molto più
  lunga di una storia normale, fino a 27 fotogrammi) — garantisce per
  costruzione che tutti i renderer disponibili vengano visti almeno una
  volta.
- **Dream Segmentation ancora debole**: aggiunto un velo scuro
  (`drawDarkeningVeil`, `multiply`) sotto ogni membrana, prima del blend
  `lighter` — senza, il colore additivo si perdeva contro le zone chiare
  del raster. Il raster resta sempre visibile sotto (Check Materia), solo
  scurito localmente per dare contrasto alla membrana sopra.
- **Bauhaus Morph esteso**: nuovo motivo a cerchi concentrici attorno al
  piano focale, riferimento diretto a Kandinsky ("Several Circles") e
  alle forme annidate di Albers — locale (non tocca la camera, Check
  Camera), rivelato con l'astrazione, reattivo al beat non a un orologio
  autonomo (Check Silenzio/Beatmatch).
- Nuovi test: `pickRevisionImageCount`/`computeRevisionLapDurationMs`
  (`dreamRevisionCycle.test.ts`), copertura completa/rifornimento mazzo/
  esclusività Print2D (`brainRendererSelector.test.ts`).
- Validazione: 56 file / 384 test, typecheck, lint e build verdi.

## Riattivazione visibile, Bauhaus/Dream Segmentation più presenti — 2026-08-19

- **Verificato dai log** (`session-2026-08-19-17-50-43.txt`) che il fix del
  doppio innesco ha funzionato: un solo "riattivazione iniziata" (allora
  ancora chiamata "riconsolidamento"), 10 immagini, nessun doppione. La
  sessione è stata chiusa ~113s dopo (durata prevista 140s) prima della
  conclusione naturale — non un bug, solo l'app chiusa a metà ciclo.
  Spiega perché lo sviluppatore non l'aveva mai notato: gira correttamente
  ma non c'era alcun segnale visibile.
- **Rinominato "Ciclo di Revisione"/"Riconsolidamento" → "Riattivazione"**
  (titolo storia sintetica, log `pipeline`): "riconsolidamento" in
  italiano è un termine di uso corrente in ambito aziendale/finanziario
  (consolidamento debiti), fuorviante. "Riattivazione" è comunque preciso
  a livello neuroscientifico (riattivazione di un ricordo durante una
  fase offline) senza l'ambiguità lessicale.
- **Etichetta visibile implementata** (era rimasta solo pianificata nel
  turno precedente): `brainController.ts` imposta
  `root.dataset.revisionCycleActive` nei due punti dove il ciclo
  inizia/finisce; `OutputApp.tsx` lo legge nello stesso polling già
  usato per il nome del renderer e mostra una seconda riga arancione
  "Riattivazione attiva" nell'etichetta di debug in basso a destra,
  visibile solo quando il ciclo è davvero in corso.
- **Bauhaus Morph troppo debole** (segnalato dallo sviluppatore): la
  velocità di avanzamento dell'astrazione era troppo lenta rispetto alla
  durata tipica di visione — per la maggior parte del tempo lo sfondo
  restava al soffitto (0.35) e le forme non avevano ancora raggiunto la
  soglia di rivelazione. Aumentata la velocità di avanzamento (~2×),
  abbassato il soffitto dello sfondo (0.35→0.24) e anticipata la fase di
  dissolvenza (0.6→0.4 di progresso astrazione), alzata l'opacità di base
  delle forme (0.42→0.55).
- **Dream Segmentation troppo debole** (segnalato dallo sviluppatore):
  opacità di membrane/filamenti e ampiezza della respirazione erano
  tarate troppo basse fin dall'implementazione iniziale. Raddoppiata
  l'opacità delle membrane (~0.2→~0.42 base), aumentato il raggio
  (0.5→0.62), aumentata l'ampiezza di respirazione (fino a 3× sul termine
  di attività) e l'opacità dei filamenti.
- Validazione: 56 file / 378 test (2 test aggiornati per le nuove
  costanti Bauhaus), typecheck, lint e build verdi.

## Fix dal vivo: doppio innesco Riconsolidamento, Vector Morph bloccato, rinomina — 2026-08-19

- **Verificato dai log** (`log/session-2026-08-19-17-25-13.txt`) che
  `PIANO-034` entra davvero in azione: "ciclo di revisione iniziato" alle
  15:37:13 e "concluso; generazione ripresa" alle 15:38:23 (~70s, coerente
  con 5 immagini × 14s). Il meccanismo funziona.
- **Bug trovato**: il log mostrava l'innesco DUE VOLTE nello stesso
  istante (9ms di distanza). Causa: `beginRevisionCycle` è asincrona
  (attende `loadDreamImages` via IPC) e non chiude `nextProduction`/
  `recyclingStoryFrames` finché non risolve — `advanceTimeline` poteva
  rientrare nello stesso ramo su più fotogrammi RAF durante l'attesa e
  richiamare `beginRevisionCycle` una seconda volta in parallelo (doppio
  caricamento IPC, doppia `BrainProduction` sintetica, la seconda vince
  sostituendo la prima). **Fix**: guardia sincrona
  `revisionCycleStarting` in `advanceToNextProduction`, impostata prima
  dell'await e liberata in `finally`.
- **Bug separato trovato** (segnalato dallo sviluppatore, non legato al
  Riconsolidamento): Vector Morph "delle volte non parte, resta solo
  l'immagine di sfondo". Causa reale nei log: la vettorializzazione a
  volte viene respinta dal controllo qualità ("meno di cinque forme
  riconoscibili", `brainVectorSceneCache.ts`) — quando succede al
  renderer GIÀ ATTIVO (non a quello entrante), `hasFailed()` non veniva
  mai controllato in `brainRendererHost.ts`, quindi il fallimento restava
  a schermo (solo raster) per l'intera durata del fotogramma, anche
  30-40s. **Fix**: `update()` ora controlla anche
  `active.controller.hasFailed?.()` e passa immediatamente a Print2D come
  rete di sicurezza (crossfade normale, non un taglio secco), con lo
  stesso cooldown di retry già usato per i fallimenti del renderer
  entrante.
- **Rinomina**: "Ciclo di Revisione" → **"Riconsolidamento"** (titolo
  storia sintetica, log `pipeline`) — termine neuroscientifico preciso
  (Nader/Schafe/LeDoux 2000: un ricordo richiamato diventa labile e viene
  ri-registrato, spesso modificato) che corrisponde esattamente al
  meccanismo (le immagini ritornano deformate, non riprodotte identiche).
  Identificatori interni (`revisionCycle*`, `PIANO-034`,
  `dreamRevisionCycle.ts`) invariati — solo l'etichetta rivolta allo
  sviluppatore/ai log è cambiata.
- Nuovo test in `brainRendererHost.test.ts` per il fallback di sicurezza
  su fallimento del renderer attivo. Nessun test dedicato per la guardia
  anti-doppio-innesco (stessa convenzione già in uso: `brainController.ts`
  non ha file di test, troppo stateful/integrato per un mock leggero).
- Validazione: 56 file / 378 test, typecheck, lint e build verdi.

## Ciclo di Revisione: generazione sospesa ogni 2-4 storie, morphing intensificato — 2026-08-19

- Nuova funzionalità (`PIANO-034`,
  `working/plans/piano-034-ciclo-di-revisione.md`): ogni 2-4 storie
  (casuale, sempre a confine di storia) la generazione SD1.5 si sospende
  del tutto e fino a 10 immagini già generate ad alta qualità ritornano
  dall'archivio, con morphing e alternanza renderer intensificati — il
  budget GPU liberato dalla generazione va tutto al visivo. Fondato su
  `filosofia.md` §1 (Lowen: carica/scarica) e §2 (invarianti onirici, "un
  elemento ritorna deformato" applicato fra storie diverse).
- **Tag zero-costo**: fase onirica (`deriveOneiricPhase`, dalla posizione
  del fotogramma nella storia) + stato bioenergetico
  (`deriveBioenergeticState`, dalla direzione dell'energia rispetto al
  fotogramma precedente) — entrambi derivati da dati già esistenti su
  `DreamFrame`, nessun nuovo output richiesto a Qwen
  (`src/shared/brain/dreamRevisionCycle.ts`).
- **Archivio su disco** (`dream-images/`, gitignored, separato da
  `.coscienza/` — asset tecnico non memoria autobiografica): classe
  `DreamImageArchive` (`src/main/dreamImageArchive.ts`, testabile con
  directory iniettabile) + singleton `dreamImageArchiveStorage.ts`, 3
  nuovi canali IPC (`saveDreamImage`/`queryDreamImageEntries`/
  `loadDreamImages`) sullo stesso pattern già usato per
  `saveConsciousnessMemory`. Solo immagini a qualità piena
  (`mode !== 'interlude'`) vengono scritte — filtro alla sorgente, non
  solo al recupero. Cap 24 immagini per tag, eviction FIFO.
- **Nessuna nuova pipeline di rendering**: il ciclo costruisce una
  `BrainProduction` sintetica dalle immagini recuperate e la fa scorrere
  attraverso `startProduction`/`applyFrame` esistenti, esattamente come
  una storia vera — zero rischio di duplicare la macchina di
  rendering/transizione già collaudata.
- **Intensificazione** riusa leve già esistenti, non un sistema nuovo:
  `setBrainRevisionBoost()` amplifica temporaneamente (×1.35)
  `globalRhythmicMotion.intensity`/`transformation.intensity`
  (`brainRenderingConfig.ts`) con ripristino esatto; il 5° parametro
  `getBoostHint` di `BrainRendererSelector` (stesso pattern di
  `getPressureHint` della sessione precedente) restringe la permanenza
  renderer da [2,3] a [1,2] fotogrammi durante il ciclo.
- **Sospensione generazione**: `generateNext()` esce subito se
  `revisionCycleActive` — sospensione totale, non un allungamento del
  cooldown; riparte da sola alla fine del ciclo.
- Validazione: 56 file / 377 test (26 nuovi), typecheck, lint e build
  (output + main + preload) verdi. Verifica manuale dal vivo rimandata
  alla prossima sessione con audio.

## Nuovo renderer Brain: Dream Segmentation — 2026-08-19

- Aggiunto un settimo renderer Brain (`PIANO-032`,
  `working/plans/piano-032-dream-segmentation-renderer.md`), su
  specifica filosofica dettagliata dello sviluppatore: rende visibile la
  distinzione fra **reattività** (locale, beat/transiente) ed **evento**
  (scarto tonale sostenuto che aggiorna lo "stato immaginativo" interno),
  con segmentazione dell'immagine come configurazione temporaneamente
  stabile che si trasforma (persistenza → destabilizzazione →
  trasformazione → nuova stabilizzazione), mai un taglio secco.
- **Riuso**: segmentazione via `analyzeMaterialPixels`/
  `matchMaterialRegions` già esistenti (`brainMaterialAnalysis.ts`), non
  un nuovo algoritmo. `prepareDreamField()` più leggero di
  `prepareMaterialSource` (Materia Morph): niente canvas derivati
  per-pixel (pigment/edges/grain), solo segmentazione + raster di base —
  il linguaggio visivo qui è a primitive (membrane/filamenti), non
  ricolorazione raster.
- **Punto architetturale**: `transitionProgress`/`role` (pilotati
  dall'host in `brainController.ts`, cadenza legata a beat/storia)
  restano l'unica autorità su quali sorgenti sono disponibili per il
  blend; l'accumulatore di sorpresa audio-driven
  (`updateDreamSurpriseAccumulator`, distanza fra profilo di banda a
  breve termine e baseline EMA, non energia sommata — intercetta un
  cambio di *carattere* tonale, non un semplice swell di volume) decide
  solo *quando* iniziare a inseguirli, con una propria inerzia
  (`computeLocalMorphProgress`, durata minima ~3.2s, continua ad
  avanzare anche se l'host ha già raggiunto progress 1) — due orologi
  distinti, mai uno che sostituisce l'altro.
- **Condensazione** ("terza forma", non crossfade):
  `findCondensationPairs` individua regioni scomparse che confluiscono
  nella regione superstite più vicina; `computeCondensationBlend`
  combina i colori con blend non lineare (`screen`) e l'area in
  quadratura (`sqrt(a²+b²)`), verificato più grande di entrambe le
  regioni a metà trasformazione, non un punto medio.
- **Check Silenzio vs "corpo interno"**: la filosofia vuole che stato
  interno (pressione GPU, attività generativa) partecipi come "secondo
  corpo", ma `agents.md` Check Silenzio è una regola dura. Risolto
  rendendo la pressione un fattore **solo moltiplicativo** su un valore
  già derivato dall'audio (`computeRegionBreathing`): zero movimento
  autonomo in silenzio qualunque sia lo stato interno, testato
  esplicitamente.
- **Check Materia**: il raster sorgente resta sempre disegnato come
  livello di base; le primitive (membrane/filamenti/condensazioni) sono
  un livello secondario compositato sopra, mai l'unico contenuto.
- Registrato come 7° renderer (`brainRendererRegistry.ts`), incluso in
  `PERSISTENT_STORY_RENDERERS`; aggiunto **preventivamente** a
  `HEAVY_RENDERERS_UNDER_PRESSURE` (decisione esplicita dello
  sviluppatore) perché usa lo stesso pattern `createImageBitmap` +
  analisi pixel per sorgente che ha causato i freeze di cold-start di
  Bauhaus/Materia Morph risolti ieri — trattato allo stesso modo fin da
  subito, non dopo aver osservato un freeze in log.
- Nuovi test in `brainDreamSegmentationCanvas.test.ts` sulle funzioni
  pure (sorpresa/evento, avanzamento trasformazione, condensazione,
  respirazione) — nessun mock di canvas, stesso stile di
  `brainBauhausMorphCanvas.test.ts`.
- Validazione: 54 file / 348 test, typecheck, lint e build Vite verdi.
  Verifica manuale dal vivo rimandata alla prossima sessione con audio.

## Passthrough FilterPsiche+Psycho2D finalmente attivato con segnale reale — 2026-08-19

- **Analisi log** (`session-2026-08-19-00-25-08.txt`, sessione live subito dopo
  il fix precedente): individuato con precisione DOVE si concentra il freeze
  di Bauhaus/Materia Morph. Estraendo `rendered` (frame canvas disegnati) per
  ciascuna finestra `BrainMetrics` da 10s e incrociandolo con i log "X
  preparato", il pattern è chiaro: `rendered` resta a **0 per 2-3 finestre
  consecutive (~20-30s) esattamente a ridosso del cambio verso Bauhaus
  Morph** (es. 22:27:56→22:28:16, appena prima/durante l'ingresso di
  FilterPsiche dopo Bauhaus; 22:30:56→22:31:06, appena prima dell'ingresso
  di Bauhaus). Una volta che il renderer è stabilmente attivo, `rendered`
  torna a centinaia di frame/finestra (30-60fps) — nessun freeze in
  steady-state.
- **Conseguenza diagnostica**: il fallback a catena introdotto ieri
  (`artworkFor(currentSource) ?? artworkFor(previousSource) ?? ...`) non può
  aiutare in questo caso specifico, perché al **cold-start di un nuovo layer
  Bauhaus/Materia la cache è vuota** — non c'è ancora nessuna
  `previousSource` da cui recuperare. Il fallback protegge solo gli stalli
  a metà esecuzione, non l'avvio a freddo sotto contesa GPU. Questo conferma
  (non solo per ipotesi) che il fix giusto è a monte: evitare di *entrare*
  in Bauhaus/Materia mentre la pressione è reale — esattamente quello che
  il fix di ieri in `brainRendererSelector.ts` fa, ma che non era ancora
  live in quella sessione (processo Electron non riavviato dopo il commit).
- **Sulla domanda "la generazione si becca tutta la GPU?"**: confermato dai
  log — `generationActiveRatio` è 1 (generazione attiva compattamente,
  nessuna pausa) per 34 finestre su 45 dell'intera sessione di 7 minuti.
  Non c'è quasi mai un momento in cui la GPU sia "libera" per definizione,
  motivando ulteriormente la scelta di *rendering-first scheduling*
  (renderer come carico prioritario, generazione come opportunistico) invece
  di puntare a eliminare del tutto la contesa.
- **Fix**: attivato finalmente il segnale reale (`brainController.ts`, loop
  `render()`): `resourcePressureActive = now <
  thermalScheduler.getSnapshot().longFrameBlockedUntil`, propagato a
  `currentSvg`/`outgoingSvg` via `setResourcePressure()` — stesso segnale già
  validato per la riduzione step e per evitare Bauhaus/Materia nel
  selettore. Prima d'ora nessuno chiamava mai questo setter: il sistema di
  passthrough esisteva ma era completamente inerte.
- **Mix FilterPsiche+Psycho2D** (`brainRendererHost.ts`): il passthrough
  durante il denoising non mostra più solo FilterPsiche, ma aggiunge un
  secondo strato leggero Psycho2D sovrapposto in `mix-blend-mode: lighten`
  a opacità ridotta (`DENOISING_MIX_OPACITY_FACTOR = 0.6`, un accento, non
  una sostituzione) — richiesto esplicitamente per l'effetto di movimento
  che i due renderer danno insieme. Stesso costo quasi nullo del passthrough
  originale (320×180, fps ridotti); Psycho2D entra solo quando pronto
  (`isReady()`), senza bloccare FilterPsiche se il suo primo
  `createImageBitmap` è più lento.
- Nuovi/aggiornati test in `brainRendererHost.test.ts`: il test di pressione
  ora verifica anche la creazione del layer Psycho2D; nuovo test dedicato
  verifica `mixBlendMode: lighten` e opacità Psycho2D < opacità FilterPsiche.
- Validazione: 53 file / 326 test, typecheck, lint e build Vite verdi.

## Sotto pressione GPU reale, la storia evita Bauhaus/Materia Morph — 2026-08-19

- Il fallback a catena di ieri (Bauhaus/Materia Morph) non basta da solo: i
  log restano con freeze fino a 30s su questi due renderer durante il
  denoising attivo. Lo sviluppatore ha chiesto, non come mascheramento ma
  come scheduling, di far girare FilterPsiche/Psycho2D al posto loro quando
  il sistema è sotto carico reale.
- **Verifica preliminare**: Psycho2D ha `multipleImages: true` come
  Bauhaus/Materia (stessa dipendenza a 3 sorgenti in
  `brainRendererRegistry.ts`), ma non è mai stato segnalato come laggato nei
  log reali — l'ipotesi "multipleImages ⇒ fragile" da sola non basta a
  spiegare tutto; il costo reale sembra dominato dall'analisi pixel/maschera
  pesante che Bauhaus/Materia fanno in più (non dalla sola molteplicità delle
  sorgenti). Si è scelto di fidarsi dell'evidenza empirica (Psycho2D non
  laggato) più che dell'ipotesi strutturale.
- **Fix** (`brainRendererSelector.ts`): nuovo `HEAVY_RENDERERS_UNDER_PRESSURE
  = {bauhaus-morph, material-morph}` e parametro opzionale
  `getPressureHint?: () => boolean` nel costruttore. `storyCycleIds()` esclude
  questi due renderer dal mazzo quando il segnale di pressione è vero (con
  fallback al set completo se il filtro svuota il mazzo). Riusa lo stesso
  segnale reale già validato per la riduzione step (`thermalScheduler`,
  `longFrameBlockedUntil`), non un nuovo euristico — nessun sistema nuovo,
  solo un altro punto di lettura dello stesso segnale.
- **Nota sui limiti**: il filtro agisce solo quando il mazzo di storia viene
  costruito/ricostruito (inizio storia, mazzo d'attesa) — non rimappa un
  mazzo già in corso. Se la pressione inizia a metà storia con Bauhaus/Materia
  già nel mazzo attivo, restano fino alla storia successiva (max 3 fotogrammi
  di attesa, coerente con `filosofia.md` §2.1).
- Nuovi test in `brainRendererSelector.test.ts`: sotto pressione (`() =>
  true`) 50 storie simulate non selezionano mai Bauhaus/Materia; senza
  pressione (`() => false`) li includono ancora entrambi.
- Validazione: 53 file / 325 test, typecheck, lint e build Vite verdi.

## Trovato lo stallo di ~8s su Bauhaus/Materia Morph: bloccati in attesa dell'immagine — 2026-08-18

- Analizzati i log più recenti (`session-2026-08-18-23-26-28.txt`). Trovato
  un caso concreto: `canvasFrames.max: 7949.7ms` su Bauhaus Morph, subito
  dopo "Bauhaus Morph preparato" — un vero stallo di quasi 8 secondi
  nell'aggiornamento del renderer, non un draw lento (`renderMs` restava
  0.1-0.3ms).
- **Causa**: `update()` faceva `if (!current) return` quando
  `artworkFor(currentSource)` non era ancora pronto — nessun disegno, zero
  `recordCanvasFrame`, finché il `createImageBitmap` + analisi asincrona
  della nuova immagine non finiva. Bauhaus Morph e Materia Morph hanno
  `multipleImages: true` (gestiscono 3 sorgenti: previous/current/next) —
  più lavoro asincrono in coda rispetto a FilterPsiche/Print2D
  (`multipleImages: false`, una sola sorgente), quindi più esposti a uno
  stallo quando `createImageBitmap` rallenta per la GPU/decoder condivisi
  con l'inferenza UNet. Coerente con la segnalazione dello sviluppatore:
  proprio questi due renderer sono i più critici sotto carico.
- **Correzione** (`filosofia.md` §1 — "il sistema non cerca una
  rappresentazione definitiva... lascia emergere forme sufficientemente
  coerenti da esistere per un intervallo"): invece di bloccarsi in attesa
  dell'immagine corrente, ora si usa un fallback a catena
  (`artworkFor(currentSource) ?? artworkFor(previousSource) ?? artworkFor(nextSource)`)
  — quasi sempre `previousSource` è già in cache (era il `current` del
  fotogramma precedente), quindi il fallback è pressoché istantaneo: il
  renderer continua a disegnare l'ultima immagine buona invece di restare
  fermo, mentre la nuova finisce di decodere in background.
- **Sulla qualità persa in 1-2 immagini su 4**: verificato nei log che è
  comportamento intenzionale già esistente (non introdotto ora): 2 dei 4
  fotogrammi per storia usano un profilo più leggero (`standard`/`interlude`),
  ora sempre includendo l'eco (fix di ieri). Non è un effetto collaterale
  del lag. Segnalato allo sviluppatore per decidere se questo compromesso
  va rivisto, dato che ora lo percepisce come una perdita, non solo come
  un risparmio accettabile.
- Nessun nuovo test automatico per questo fix (cambia solo il fallback
  dentro `update()`, non estraibile in una funzione pura testabile senza
  mockare pesantemente canvas/ImageBitmap — coerente con la copertura test
  già esistente su questi file, che testa solo le funzioni pure estratte).
- Validazione: 53 file / 323 test, typecheck, lint e build Vite verdi.

## Il renderer come invariante onirico: minimo/massimo di permanenza + passthrough pigro — 2026-08-18

- Richiesta: un "sistema di morphing transizionale" per ogni transizione
  (renderer↔renderer, renderer↔immagini), con i render che si alternano a
  caso ma non meno di 2 morph dello stesso renderer, e un massimo da
  stabilire — con richiesta esplicita che la soluzione migliori anche le
  prestazioni.
- **Filosofia** (`filosofia.md` §2.1, nuovo): il renderer persistente è esso
  stesso un invariante onirico (la materia resta la stessa mentre l'immagine
  si trasforma). Minimo 2 fotogrammi (già presente) per essere riconoscibile
  come invariante; massimo derivato lasciando sempre almeno un fotogramma
  libero per un cambio su 4 (`BRAIN_CONFIG.renderFrameCount`) — quindi
  massimo 3, non più 4. `selectBrainRendererHoldFrames` aggiornato di
  conseguenza (`brainRendererSelector.ts`); nuovo test che verifica su 100
  storie simulate che ci sia sempre almeno un cambio di renderer dentro la
  storia, non solo fra storie diverse.
- **Prestazioni**: il layer di passthrough FilterPsiche
  (`denoisingFilterPsiche` in `brainRendererHost.ts`) veniva creato da zero
  a ogni singolo cambio di fotogramma (dato che `applyFrame` ricrea l'intero
  host per ogni immagine), **anche se non serve quasi mai** (si attiva solo
  sotto vera pressione risorse, oggi rara). Reso pigro: creato solo alla
  prima vera pressione, non più un costo fisso a ogni transizione.
- Test aggiornati in `brainRendererSelector.test.ts` (nuovo massimo 3) e
  `brainRendererHost.test.ts` (verificano che il passthrough non esista
  finché non serve davvero).
- Validazione: 53 file / 323 test, typecheck, lint e build Vite verdi.

## Filosofia estratta in `filosofia.md`; principio onirico come leva di performance — 2026-08-18

- **Documentazione**: creato `filosofia.md` (radice del progetto). Contiene
  §1 le fondamenta scientifiche già in `agents.md` (embodied cognition,
  interocezione, predictive/active inference, bibliografia) spostate lì
  integralmente, e §2 nuovo — la struttura onirica delle 4 immagini di Brain
  (soglia/metamorfosi/condensazione/eco, invarianti onirici) presa dalle
  neuroscienze cognitive del sonno. `agents.md` ora contiene solo un rimando
  dettagliato (quando leggerlo, cosa contiene, come applicarlo) invece del
  contenuto integrale. Aggiornato anche il rimando in `skills.md`
  ("Skill: Evolvere Coscienza Onirica").
- **Ottimizzazione**: lo sviluppatore ha chiesto di usare il principio
  onirico stesso come leva di performance contro i lag residui, evitando
  overengineering. `filosofia.md` §2 nota che l'ultima immagine di una
  storia ("eco/ritorno deformato") è per natura meno risolta della soglia
  che richiama — non solo per necessità tecnica. `selectLowQualityFrameIndices`
  (`psichedel.ts`) sceglieva 2 fotogrammi rapidi a caso fra gli indici 1-3;
  ora l'ultimo fotogramma (l'eco) è **sempre** incluso nel budget leggero,
  l'altro slot resta casuale fra i rimanenti — zero nuova architettura,
  riusa `ImageRenderMode`/`scheduledMode` già esistenti, riduce gli step
  UNet medi per storia in modo deterministico invece che a caso.
- Test aggiunto in `brainPipeline.test.ts` che verifica l'inclusione sempre
  garantita dell'ultimo fotogramma, con vari semi random.
- Validazione: 53 file / 322 test, typecheck e lint verdi.

## Vector Morph più morbido/ricco, Bauhaus con forme dominanti — 2026-08-18

- **Vector Morph**: lo smoothing curve esisteva già (`PIANO-014`) ma la
  verifica live non era mai stata completata; rinforzato — `MAXIMUM_POINT_DEVIATION`
  1.4→2.2, `MAXIMUM_CONTROL_REACH` 1.6→2.2, e ora due passate di smoothing
  (`smoothClosedRepeated`) invece di una sola, in `brainVectorGeometry.ts`.
  Ricchezza aree: rimosso il target fisso di 24 path in `candidatePenalty`
  (`brainVectorizer.ts`) — ora nessuna penalità fra 30 e 90 path, penalità
  solo fuori da quella fascia; `snicMaximumRegions` 72→100,
  `snicMinimumRegionAreaRatio` 0.0006→0.0004; `filterSpeckle` VTracer
  abbassato su tutti i profili (12→8, 6→4, 24→16) per scartare meno regioni
  piccole.
- **Bauhaus Morph**: nuova funzione pura `computeBauhausUnderlayOpacity`
  sostituisce la formula lineare precedente. Prima: sfondo raster fino a
  0.88 di opacità, e le forme iniziavano a comparire già ad
  `abstractionProgress` 0.06 — sfondo e forme si sovrapponevano quasi
  sempre. Ora: soffitto/pavimento abbassati a 0.35/0.08 (le forme dominano
  la scena), e il fondo resta fermo al soffitto durante tutta la fase di
  reveal delle forme (`abstractionProgress` 0→0.6), scendendo verso il
  pavimento solo dopo — prima il morph degli oggetti, poi il fade
  dell'immagine. Aggiunto un respiro leggero a beat (±0.04, nullo in
  silenzio) per non lasciare il fondo perfettamente statico.
- Nessuna nuova libreria; nessun cambio di camera/ordine dei layer canvas.
- Test aggiunti/aggiornati: `brainVectorGeometry.test.ts` (nuovo limite
  2.2), 4 nuovi test per `computeBauhausUnderlayOpacity` in
  `brainBauhausMorphCanvas.test.ts`.
- **Verifica live ancora richiesta** per entrambe (non posso vedere lo
  schermo) — PIANO-014 aveva lo stesso punto debole la volta scorsa.
- Validazione: 53 file / 321 test, typecheck, lint e build Vite verdi.

## Piano archiviato per riferimento: delega P2P generazione immagini — 2026-08-18

- Salvato `working/plans/piano-031-delega-p2p-generazione-immagini.md`:
  disegno completo (server HTTP nel main, ponte IPC verso il renderer per la
  generazione WebGPU, wrapper `PsychedelImageGenerator` peer-aware, fallback
  locale sempre garantito, provenienza "collettiva" nella memoria di
  Coscienza Onirica) per delegare la generazione SD1.5 a macchine pari sulla
  LAN quando la macchina locale è sotto pressione reale.
- **Non in corso**: lo sviluppatore ha scelto di provare prima
  l'ottimizzazione locale più piccola descritta subito sotto. Il piano resta
  pronto per quando/se serve una soluzione più incisiva.

## Riduzione adattiva step UNet sotto pressione reale — 2026-08-18

- Valutata e scartata (per ora) l'idea di delega P2P della generazione a
  macchine pari sulla LAN: troppo grande/rischiosa, richiede hardware extra.
  Pianificato invece un miglioramento locale più piccolo, riusando lo stesso
  principio (reagire a pressione GPU *reale e misurata*, non a una stima).
- **Implementato**: `Psichedel.generate()` accetta ora un
  `getPressureHint?: () => boolean` opzionale; se vero, declassa il modo di
  generazione pianificato di un livello (`high-quality`/`enhanced` →
  `standard`, `standard` → `interlude`, il più leggero già esistente a 4
  step invece di 8). Nuova funzione pura esportata
  `downgradeModeUnderPressure`. `brainController.ts` passa
  `() => performance.now() < thermalScheduler.getSnapshot().longFrameBlockedUntil`
  — lo stesso segnale di gap RAF reale già usato e già validato altrove, non
  un nuovo rilevatore.
- Si applica sia al tentativo iniziale che al retry per singolo fotogramma;
  log esplicito quando scatta ("step ridotti per pressione reale rilevata").
  Nessuna modifica al motore di inferenza (`sd15OnnxWebGpu.ts`): il cambio è
  tutto a monte, in quanti step vengono richiesti.
- Creato `psichedel.test.ts` (prima assente): copre `downgradeModeUnderPressure`
  e il comportamento end-to-end di `generate()` con/senza segnale di
  pressione tramite un generatore e uno scheduler finti.
- Validazione: 53 file / 317 test, typecheck, lint e build Vite verdi.

## Bauhaus incluso in "Tutti per storia"; riverificata l'assenza di bias — 2026-08-18

- Segnalato che Bauhaus Morph non compare quasi mai (era ancora escluso da
  "Tutti per storia", unica esclusione residua insieme a Print2D) e che
  FilterPsiche continua a sembrare più presente di tutti.
- **Bauhaus**: rimosso da `STORY_CYCLE_EXCLUDED_RENDERERS` (resta escluso
  solo Print2D, per scelta esplicita precedente dello sviluppatore); aggiunto
  a `PERSISTENT_STORY_RENDERERS` (2-4 fotogrammi come gli altri, coerente con
  la richiesta "permanere e morphare"). Verificato che il suo rendering non
  viola la filosofia visiva (nessun movimento globale di camera, solo forme
  geometriche locali sopra il raster).
- **FilterPsiche**: riverificato con simulazione fresca (300 storie, storia +
  attesa) sui 5 renderer ora attivi — 19,4–20,7% a testa, FilterPsiche è
  addirittura il più basso. Nessun bias residuo nel selector. La sensazione
  di dominanza riportata è quasi certamente dal prima del riavvio con il fix
  del passthrough (sessione precedente) — da confermare dal vivo con
  l'etichetta.
- **Non reintrodotta** una sospensione per "sovraccarico" legata a
  `resourcePressure`/basso consumo (suggerita come idea dallo sviluppatore):
  quel meccanismo è stato già rimosso deliberatamente dopo una prova live
  negativa (`SESSION-2026-08-16-22`); va reintrodotto solo su richiesta
  esplicita e con validazione live, non come effetto collaterale di un fix
  di bilanciamento.
- Test aggiornati in `brainRendererSelector.test.ts` per il nuovo
  comportamento di Bauhaus (incluso, persistente 2-4 immagini).
- Validazione: 52 file / 314 test, typecheck e lint verdi.

## Trovata la causa reale: FilterPsiche copriva tutto, renderer reale congelato — 2026-08-18

- Lo sviluppatore ha usato l'etichetta appena aggiunta per confermare dal
  vivo: l'etichetta mostrava Psycho2D/Materia Morph/Vector Morph a rotazione,
  ma visivamente si vedeva sempre FilterPsiche, e Materia Morph risultava
  fermo/statico. Individuata la causa esatta in `brainRendererHost.ts`.
- **Causa 1 (sempre FilterPsiche)**: il passthrough leggero di FilterPsiche
  (zIndex sopra al renderer attivo) veniva attivato da
  `resourcePressure || offlineHold`. `resourcePressure` è morto da tempo
  (nessuno lo imposta più da `brainController.ts` dopo il rollback
  `SESSION-2026-08-16-22`, confermato in `STATE.md`: "la protezione adattiva
  basata sui gap RAF è stata rimossa dopo la prova live negativa"). Restava
  solo `offlineHold`, agganciato a `offlineWindow.isActive` — vero per
  l'intera durata della generazione di una storia (spesso 40-100+ secondi,
  quasi quanto o più della permanenza a schermo). Il passthrough restava
  quindi opaco (zIndex sopra) per la maggior parte del tempo reale.
- **Causa 2 (Materia Morph fermo)**: durante lo stato "active" del
  passthrough (dopo la dissolvenza d'ingresso), `active.controller.update()`
  veniva chiamato solo nello stato `'entering'`, mai in `'active'` — il
  renderer reale sotto il passthrough smetteva letteralmente di aggiornare
  finché il passthrough non usciva.
- **Correzione**: `shouldSuspendPlugin` ora dipende solo da `resourcePressure`
  (mai vero oggi, quindi il passthrough non si attiva più per la sola
  generazione in corso); il renderer reale continua ad aggiornare (al ritmo
  ridotto) anche in stato `'active'`, per robustezza se `resourcePressure`
  tornasse in uso. `offlineHold` resta per il proprio dataset attribute e la
  durata ridotta del crossfade, ma non copre più il quadro.
- Test aggiornati in `brainRendererHost.test.ts` per riflettere che
  `setOfflineHold(true)` da solo non attiva più il passthrough.
- Validazione: 52 file / 314 test, typecheck, lint e build Vite verdi.

## Etichetta renderer attivo in basso a destra — 2026-08-18

- Aggiunta un'etichetta debug in basso a destra sull'Output che mostra il
  nome del renderer/algoritmo attualmente attivo (Brain: Print2D, Psycho2D,
  Vector Morph, Materia Morph, FilterPsiche, Bauhaus Morph; Morphing:
  Liquid/Oniric/PsyHyp/2001), aggiornata ogni 250ms leggendo
  `data-active-renderer` scritto da `brainRendererHost.ts` sul proprio root.
- Utile anche per verificare dal vivo se il crossfade fra fotogrammi (6-9s,
  già presente in `brainController.ts`) è effettivamente percepibile, dato
  che lo sviluppatore continua a segnalare assenza di morphing sia fra
  renderer diversi sia fra immagini dello stesso renderer.
- Validazione: 52 file / 314 test, typecheck, lint e build Vite verdi.

## Analisi lag analisi audio + yield GPU cooperativo davvero inerte — 2026-08-18

- **Analisi**: l'analisi audio in sé (FFT via `AnalyserNode`, `computeBandEnergies`)
  è economica e non è il collo di bottiglia; il ciclo RAF del Control gira a
  piena velocità (throttling di background già disattivato su entrambe le
  finestre e via switch Chromium). Il problema reale è che l'Output perde
  pacchetti di stato audio (`missed` fino a 67 per finestra da 10s nei log)
  quasi sempre in coincidenza con `generationActiveRatio:1` — la GPU è
  occupata dall'inferenza UNet e il compositor dell'Output non riesce a
  smaltire in tempo gli aggiornamenti audio-reattivi in arrivo dal Control.
- **Bug trovato**: `wrapGpuDeviceWithYield` (`sd15GpuYield.ts`) avvolgeva
  `submit()` per innescare una catena di promise dopo `onSubmittedWorkDone()`
  con un `setTimeout`, ma **nessuno attendeva quella catena** — `submit()` è
  sincrono per spec WebGPU, quindi il micro-yield non ha mai bloccato/
  rallentato nulla. Il test esistente verificava solo che la catena venisse
  creata, non che qualcuno la aspettasse.
- **Verificato inoltre**: `onnxruntime-web@1.24.1` (versione installata) non
  chiama mai `queue.onSubmittedWorkDone()` internamente (zero occorrenze nei
  bundle dist) — quindi anche avvolgendo correttamente quel metodo, lo yield
  non avrebbe comunque effetto pratico con questa versione.
- **Correzione**: `wrapGpuDeviceWithYield` ora avvolge `onSubmittedWorkDone`
  (il punto di sincronizzazione CPU-GPU standard) così che chi la attende
  ottenga davvero il ritardo — corretto per compatibilità futura/altri
  runtime. In aggiunta, inserito uno yield esplicito e verificabile
  (`macrotaskYield(BRAIN_CONFIG.gpuYieldMs)`) direttamente nel loop di
  denoising in `sd15OnnxWebGpu.ts`, dopo ogni step UNet — codice nostro,
  eseguito per certo, indipendente dal comportamento interno del runtime.
- Resta la leva già applicata in precedenza (`imageInferenceCooldownMs`
  6s→9s) come mitigazione principale per la contesa hardware GPU, che uno
  yield lato JS non può risolvere da solo.
- Test aggiornati/aggiunti in `sd15GpuYield.test.ts` per riflettere il
  comportamento corretto.
- Validazione: 52 file / 314 test, typecheck e lint verdi.

## Psycho2D reso persistente + trovata causa architetturale del "cambio con le immagini" — 2026-08-17

- **Fix immediato applicato**: Psycho2D era l'unico renderer ammesso in
  "Tutti per storia" a comparsa singola (1 fotogramma); ora è persistente
  (2-4 fotogrammi) come FilterPsiche, Materia Morph e Vector Morph.
  Nessun renderer in "Tutti per storia" cambia più a ogni singola immagine.
- **Causa più profonda individuata, non ancora corretta**: `applyFrame` in
  `brainController.ts` **distrugge e ricrea l'intero `brainRendererHost` a
  ogni singolo fotogramma/immagine**, anche quando il renderer logicamente
  "persiste" per più fotogrammi secondo `brainRendererSelector`. Di
  conseguenza:
  - lo stato interno di ogni renderer (motion smoother, avanzamento morph,
    ecc.) riparte da zero a ogni immagine, anche quando il tipo di renderer
    resta lo stesso — nessuna vera continuità del morph fra immagini
    consecutive dello stesso renderer;
  - il crossfade interno "active/incoming" di `brainRendererHost.ts`
    (`SWITCH_DURATION_MS`) non scatta mai nella pratica: confermato nei log,
    zero occorrenze di `cambio renderer Brain completato` o `cambio renderer
    Brain preparato` in tutte le sessioni recenti, pur con cambi di
    `rendererId` osservati;
  - la transizione visibile fra immagini avviene solo al livello esterno
    (`outgoingSvg`/`currentSvg` in `brainController.ts`, crossfade di
    6-9 secondi), identica sia che il tipo di renderer cambi sia che resti
    lo stesso — quindi anche una permanenza "logica" di più immagini non si
    percepisce come continuità, perché l'istanza viene comunque ricreata e
    ri-dissolta ogni volta.
- **Fix proposto (non ancora implementato)**: quando il renderer risolto per
  il nuovo fotogramma è identico a quello già attivo, evitare la
  distruzione/ricreazione del host ed alimentare il renderer esistente con
  le nuove immagini (richiede un metodo di aggiornamento contenuto sui
  controller, non presente oggi nell'interfaccia `BrainSceneRendererController`).
  Cambio strutturale su più file (host, controller, 6 plugin canvas);
  richiede conferma prima di procedere data l'ampiezza.
- Non ancora verificata la mancata reattività al ritmo (nessun log
  strumenta `beatPulse`/`kickEnvelope`); ipotesi collegata alla stessa causa
  (il renderer potrebbe passare la maggior parte della sua vita a "scaldare"
  lo smoother del movimento dopo ogni ricreazione).
- Validazione fix immediato: 52 file / 312 test, typecheck e lint verdi.
- **Correzione di rotta**: verificato che "distruggi/ricrea + crossfade" è il
  meccanismo di morphing usato in tutto il progetto (anche Liquid, Oniric,
  PsyHyp, 2001 in `OutputApp.tsx` lo fanno), non un'anomalia di Brain; il
  crossfade di Brain (`brainController.ts`) è un vero `smootherstep` da 6-9s
  con forme di controparte, non un taglio secco. Il refactor sui 6 plugin
  NON è stato eseguito: sarebbe stato basato su una diagnosi sbagliata.
- **Richiesta finale dello sviluppatore**: concentrarsi solo su "Tutti per
  storia" e far girare tutti i renderer attivi in modo omogeneo, senza
  priorità a nessuno. Simulazione su 300 storie (con storia + attesa
  intrecciate): 24,6% / 25,9% / 24,8% / 24,8% fra Psycho2D, Vector Morph,
  Materia Morph e FilterPsiche — già omogeneo con i fix applicati oggi.
  Bloccato con un test dedicato (tolleranza 15-35% a testa).
- Validazione finale: 52 file / 313 test, typecheck e lint verdi.

## Bilanciamento esteso al mazzo d'attesa — 2026-08-17

- Trovata una seconda causa della dominanza di FilterPsiche in "Tutti per
  storia": il mazzo usato durante l'**attesa** (quando la storia è finita e
  il sistema ricicla i fotogrammi mentre la generazione successiva è ancora
  in corso — spesso il periodo più lungo di visione reale, dato che generare
  quattro immagini richiede più tempo della storia stessa) usava uno shuffle
  puramente casuale, senza alcun bilanciamento per peso. Un renderer poteva
  quindi dominare per puro caso proprio nei tratti più lunghi della sessione,
  senza che il conteggio delle comparse per storia se ne accorgesse mai (il
  peso di attesa non veniva nemmeno registrato).
- **Correzione**: estratta `weightedDeck` (ordinamento per peso, riusata sia
  dal mazzo storia sia dal mazzo attesa); il peso ora combina le comparse
  chiuse (`storyAppearances`) con quelle in corso nella sessione attuale
  (`currentStoryVisited`), così più pescate consecutive nella stessa attesa
  si bilanciano a vicenda invece di ignorarsi. Le comparse in attesa vengono
  registrate con lo stesso peso in fotogrammi delle comparse in storia.
- Simulazione su una sessione di attesa lunga (2000 avanzamenti): 28–29% a
  testa fra FilterPsiche, Materia Morph e Vector Morph, 14% Psycho2D (equo,
  proporzionale alla sua permanenza più breve) — nessuna dominanza.
- Test aggiunto: verifica che nessun renderer persistente superi il 35% di
  quota durante un'attesa prolungata.
- Validazione: 52 file / 312 test, typecheck e lint verdi.

## Rimosso il forzamento FilterPsiche in testa al mazzo — 2026-08-17

- Simulazione su 200 storie ha misurato FilterPsiche presente nel **62,9%**
  di tutti i fotogrammi "Tutti per storia": la regola che lo forzava sempre in
  prima (o seconda) posizione, combinata con la sua permanenza fino a 4
  fotogrammi, gli permetteva di occupare da sola l'intera storia.
- Rimossa la regola di forzamento in `balancedStoryDeck`
  (`brainRendererSelector.ts`); resta solo l'ordinamento per peso già
  corretto in precedenza (fotogrammi mostrati, non comparse). Nuova
  simulazione sugli stessi parametri: 23–27% a testa fra FilterPsiche,
  Materia Morph, Vector Morph e Psycho2D — nessuna dominanza, nessuna
  esclusione strutturale.
- Test aggiornato: sostituito il test che pretendeva FilterPsiche "garantita
  entro la seconda immagine" con uno che verifica che nessun renderer superi
  il 40% di quota su 200 storie e che tutti compaiano almeno una volta.
- Verificato che Bauhaus Morph resta strutturalmente escluso da "Tutti per
  storia" (`STORY_CYCLE_EXCLUDED_RENDERERS`, invariato) e che il suo file
  (`brainBauhausMorphCanvas.ts`) non condivide codice con FilterPsiche
  (`brainFilterPsicheCanvas.ts`) — nessuna traccia nei log recenti di Bauhaus
  Morph selezionato.
- Validazione: 52 file / 311 test, typecheck e lint verdi.

## Cooldown inferenza in modalità normale — 2026-08-17

- Diagnosticato via log perché la modalità normale sembra più "laggy" del
  basso consumo: `imageInferenceCooldownMs` (pausa fra un'inferenza UNet e la
  successiva) era 6 s in modalità normale contro 12 s in basso consumo —
  il doppio degli intervalli di respiro GPU, quindi il doppio della frequenza
  con cui la GPU viene colpita da un nuovo carico di denoising, coerente con
  gli spike RAF (233–400 ms) osservati nei log anche fuori pressione severa.
- **Nessuna causa nei renderer visivi**: FPS, layer, risoluzione e mazzo
  "Tutti per storia" non sono coinvolti; il gap era solo nel passo con cui il
  Worker immagini viene autorizzato a ripartire. Cambio compatibile con la
  filosofia visiva (nessun effetto su camera, materia, silenzio, beatmatch,
  transizione).
- **Correzione**: `imageInferenceCooldownMs` portato da 6 000 a 9 000 ms in
  `brainConfig.ts` — via di mezzo verso il valore già usato per
  `imageInferenceLongFrameBackoffMs`. La cadenza di generazione delle immagini
  rallenta leggermente ma la GPU ha più respiro fra un'inferenza e l'altra.
  Reversibile con una sola costante; nessun'altra modifica.
- **Verifica live pendente**: da confermare con una sessione prolungata se lo
  scarto percepito fra normale e basso consumo si riduce a sufficienza, o se
  serve un valore intermedio diverso.
- Validazione: 52 file / 311 test, typecheck e lint verdi.

## Bilanciamento mazzo "Tutti per storia" — 2026-08-17

- Liquid Morphing e 2001 Slit-Scan sono esclusi dall'interludio morphing di
  "Tutti per storia" (`buildMorphingInterludeDeck`); l'interludio ora sceglie
  solo fra Oniric e PsyHyp.
- Diagnosticato un renderer dominante nel ciclo "Tutti per storia" leggendo i
  log live: il conteggio delle presenze fra storie era per-storia (+1) invece
  che per fotogrammi realmente occupati, e lo scambio che garantisce
  FilterPsiche in prima posizione spediva il renderer meno mostrato in fondo
  al mazzo (swap a due elementi) invece di scorrerlo di una posizione.
  Corretti entrambi: il peso ora conta i fotogrammi mostrati e FilterPsiche
  viene inserito in testa senza alterare l'ordine relativo degli altri.
- Individuate anche due istanze Electron `pnpm dev` in esecuzione
  contemporaneamente (una da stanotte, una nuova) come possibile causa
  ulteriore di contesa GPU; segnalato allo sviluppatore, nessuna azione presa
  senza conferma.
- Validazione: 52 file / 311 test, typecheck e lint verdi.

## Correzione rotazione Print2D/Psycho2D — 2026-08-17

- Print2D torna nella rotazione temporale generale e nel ciclo d'attesa; resta
  escluso soltanto dalla modalità "Tutti per storia" (insieme a Bauhaus Morph).
- Psycho2D era già stato interamente ripristinato (registry, UI, rotazione,
  ciclo per storia e attesa) dalla correzione `SESSION-2026-08-16-27`; nessuna
  ulteriore modifica necessaria.
- Validazione: 52 file / 310 test, typecheck e lint verdi.

## Soluzioni denoising stall — 2026-08-16

- Il riquadro del moto di coscienza non contiene più sfere sintetiche: riusa
  un'altra delle quattro immagini attive, sempre diversa da quella corrente.
  Bauhaus Morph è escluso dalla sola modalità “Tutti per storia”, ma resta
  disponibile manualmente e nella rotazione temporale generale.

- FilterPsiche ha nuovamente una dinamica cromatica leggibile: kick/beat
  accentuano luminosità e inversione breve, `lowMid` orienta la palette, `mid`
  modula il contrasto e `high` la separazione cromatica. La fase decide solo la
  direzione del colore; camera e geometria restano ferme e il silenzio è
  neutro. Nessuna riga orizzontale è stata reintrodotta.

- Correzione dinamica: la generazione non interrompe più il RAF Brain. Timeline,
  beat e transizioni continuano; il coordinatore usa FilterPsiche a 320×180 e
  12 FPS sotto pressione, limitando il renderer pieno a 5 FPS durante il breve
  crossfade per poi sospenderlo fino all'uscita.
- Implementato il piano Antigravity approvato: durante Psichedel il loop Brain
  coordina ora una modalità visuale leggera durante l'inferenza, senza fermare
  il quadro o simulare movimento autonomo.
- La finestra è single-flight, annullabile e limitata a 120 secondi.
- ONNX Runtime WebGPU riceve un device avvolto che attende la fence
  `onSubmittedWorkDone()` e programma un micro-yield da 4 ms dopo ogni submit.
- Entrambe le soluzioni sono controllate da configurazione; step, seed, forma,
  qualità e risoluzione della pipeline restano invariati.
- Validazione corrente: 52 file / 310 test, typecheck, lint, diff-check e bundle
  Vite/Electron verdi. Il log live conferma `denoising-filter-psiche: active`.

## Ripristino comportamenti non performance — 2026-08-16

- Correzione percettiva: FilterPsiche è ora collocato nella prima osservazione,
  oppure nella seconda se aveva chiuso il gruppo precedente; le permanenze
  2–4 non possono più impedirne del tutto la comparsa nelle quattro immagini.
- FilterPsiche non disegna più alcuna slice orizzontale; la risposta alle alte
  agisce su saturazione e fusione cromatica, senza movimento di camera.
- Ogni prompt immagine concatena osservazione corrente, stimolo distinto e
  residuo visuale precedente.
- Coscienza Onirica usa una sola chiamata Qwen per la storia; errore o risposta
  invalida producono quattro osservazioni locali senza una chiamata di repair.
- Il refill del gruppo successivo non è più bloccato dal primo attraversamento;
  le immagini correnti vengono riciclate soltanto finché il nuovo gruppo arriva.
- FilterPsiche, Materia Morph e Vector Morph persistono casualmente 2–4 immagini.
  Print2D è escluso da rotazione, ciclo per storia e attesa; resta registrato
  soltanto per compatibilità/manuale. Psycho2D è nuovamente disponibile nel
  registry, nella UI e nei cicli automatici.
- Nessuna modifica a backend, denoising, qualità, risoluzione, cooldown,
  frame pacing o low power.
- Validazione: 50 file / 299 test, typecheck, lint e diff-check verdi.

## Rollback MACRO-026 — Ritiro esperimento flusso infinito Qwen+SD live — 2026-08-16

- Esperimento ritirato dopo analisi dei log live: incompatibilità strutturale
  tra generazione continua e rendering live sulla stessa GPU.
- **Cause confermate**: Qwen monopolizza WebGPU per 9,6–17 s per step (non
  interrompibile dentro `session.run()`); il yield da 48 ms agisce solo *tra*
  gli step. Picco RAF 868 ms, buco IPC 22,6 s, 5.211 pacchetti persi, due
  finestre da 10 s senza alcun pacchetto.
- **Degenerazione semantica**: quattro osservazioni identiche amplificate da
  Brain per loop autoreferenziale; il modello reinseriva le proprie frasi come
  memoria recente.
- **Conclusione**: nessuna taratura credibile è possibile dentro questa
  architettura. Generazione locale infinita e output live sincronizzato non
  possono condividere continuamente lo stesso processo GPU Electron.
- **Azioni eseguite**:
  1. Commit di archivio `8a88979` del lavoro sperimentale MACRO-026/028 sul
     branch `feature/brain-dream-causality-experiment` (recuperabile).
  2. Rollback a `e21fddb` (baseline sicura pre-esperimento) con commit `e21a355`.
  3. Typecheck pulito sulla baseline ripristinata.
- **Direzione futura**: demandare la generazione a un processo/macchina esterna;
  durante la performance usare soltanto buffer già pronti.
- **Branch**: `feature/brain-dream-causality-experiment`; `main` non è stato
  toccato.



## Rollback prestazioni renderer — 2026-08-16

- Ritirata integralmente l'opzione `reducedFpsMode`; i valori salvati da build
  precedenti vengono ignorati e rimossi al caricamento.
- Liquid e Oniric tornano a 60 FPS normali; Liquid torna a 60 punti e non ha
  più il tetto aggiuntivo di otto veli in modalità normale.
- FilterPsiche torna a 480×270, 30 FPS e 7 slice; Materia Morph torna a 24 FPS
  e 12 regioni. `lowPowerMode` resta invariato.
- Rimossa la pressione grafica adattiva che commutava ripetutamente fra plugin
  e passthrough dopo i gap UNet. Lo scheduler continua soltanto a rinviare la
  prossima inferenza dopo un long frame.
- Worker immagini e Worker Node di vettorializzazione sono mantenuti e presenti
  nella build.
- Validazione: 50 file / 295 test, typecheck, lint, diff-check e build Electron
  arm64 completi; prova fullscreen del rollback pendente.

## Correzione scatti globali da servizi pesanti — 2026-08-16

- I log live hanno separato due cause: passthrough forzato a 19,9 FPS per tutta
  l'inferenza e buco IPC di 1.557 ms durante la vettorializzazione nel main.
- Dopo l'isolamento UNet, `imageInferenceActive` resta una metrica ma non forza
  più `resourcePressure`. Anche la successiva protezione adattiva basata sui
  gap RAF è stata rimossa dopo la prova live negativa.
- SNIC/VTracer gira ora in `brainVectorizerWorker.js`, separato dal main che
  inoltra audio e ACK. Il buffer raster viene trasferito al worker.
- Smoke test 320×180: 217 ms nel worker mentre il loop chiamante ha continuato
  a eseguire 42 tick; risultato vettoriale valido.
- Validazione: 51 file / 298 test, typecheck, lint mirato, diff-check e build
  Electron completa verdi; prova fullscreen pendente.

## Modalità FPS ridotti con stessi layer — ritirata 2026-08-16

- L'opzione sperimentale `Modalità FPS ridotti` è stata rimossa dopo il test
  live; non è più presente in UI, tipi, default o runtime.
- Liquid, Oniric, PsyHyp e 2001 vengono limitati a 30 FPS; Print2D, Psycho2D,
  Vector, Materia, FilterPsiche e Bauhaus usano la propria cadenza ridotta già
  collaudata, senza ridurre layer, regioni, slice, ribbon, risoluzione o DPR.
- Il clock Output e l'acquisizione audio non vengono rallentati: impulso, fase,
  kick e transienti continuano a essere catturati prima del frame pacing.
- Se FPS ridotti e basso consumo sono entrambi attivi, il basso consumo mantiene
  anche le proprie semplificazioni visive; la nuova opzione da sola no.
- Validazione: 50 file / 295 test, typecheck, lint mirato, diff-check e build
  completa verdi; prova fullscreen pendente.

## Isolamento inferenza immagini — 2026-08-16

- Psichedel usa ora un Dedicated Worker: tokenizer, sessioni ONNX, UNet, VAE e
  codifica PNG non vengono più eseguiti nel thread JavaScript del RAF Output.
- L'Output risolve configurazione, geometria, step, timeout e URL WASM, invia
  una richiesta tipizzata e riceve soltanto progressi e raster pronto.
- Il worker mantiene una sola inferenza alla volta, riusa le sessioni e supporta
  abort/rilascio; il bundle Vite lo emette come chunk separato.
- Non sono cambiati camera, materia, clock, silenzio, low power o protezione
  passthrough durante il denoising.
- Validazione automatica: 50 file / 295 test, typecheck, lint mirato e build
  completa verdi. Resta il confronto live dei gap RAF e della temperatura:
  il worker non elimina da solo la possibile contesa nel processo GPU Chromium.

## Riallineamento beat renderer — 2026-08-16

- Correzione hat: soglia high meno permissiva, release 75 ms e smoothing locale
  di 0,16 beat impediscono la sovrapposizione continua sui sedicesimi.
- Liquid/Oniric non usano più gli high per cambiare velocità o traiettoria; gli
  hat restano brevi variazioni di opacità, contrasto e texture locale.
- FilterPsiche e Materia non sommano più due volte lo stesso transiente high:
  slice e grana tornano a chiudersi fra gli attacchi.
- Il listener IPC non consuma più `beat=true`: soltanto il RAF Output pubblica
  il fronte condiviso a Brain e ai Canvas indipendenti.
- Ogni kick reale riallinea `musicalPosition` a un intero senza arretrare; il
  frame successivo riparte vicino a fase zero.
- FilterPsiche, Materia, Liquid e Oniric usano un accento immediato indipendente
  dall'energia sostenuta, con release smussato e zero impulso nel silenzio.
- I budget normali ridotti sono stati respinti dal test live e ripristinati:
  Liquid/Oniric 60 FPS, FilterPsiche 30 FPS a 480×270 e Materia 24 FPS. Low
  power resta invariato.
- Validazione: 49 file / 293 test, typecheck, lint mirato e build Vite/Electron
  verdi. Resta la conferma percettiva fullscreen.

## Documentazione architettura corrente — 2026-08-16

- Creata una fotografia tecnica verificata di processi, IPC, flusso runtime,
  Brain, preset, rendering, audio reactive, dipendenze e performance.
- Documentati esplicitamente i confini reali: plugin Brain legati a DOM/Canvas,
  morphing esterni separati, preset non unificati e assenza di render graph.
- Separate le metriche osservate dai target nel codice e dai dati non
  determinabili, senza introdurre componenti teorici.
- Documento: `docs/architettura-brain-visual-reactive-screen.md`.
- Validazione: typecheck e diff-check verdi.

## Psycho2D — texture musicali alternate 2026-08-16

- Quattro trame one-bit derivate dallo stesso raster sostituiscono la singola
  matrice Bayer: impulso, tessitura `lowMid`, diagonale `mid` e grana `high`.
- La sequenza sul clock globale è `beat → lowMid → beat → mid → beat → high`;
  beat/kick resta quindi l'ancora fra ogni risposta delle altre bande.
- Il cambio usa una dissolvenza smoothstep nella prima parte del beat e inviluppi
  smussati per banda. Nel silenzio famiglia, densità e dissolvenza si congelano.
- Camera e raster restano stabili; le dodici varianti sono preparate una volta e
  riusate. Validazione: 49 file / 287 test, typecheck, lint mirato, Vite,
  Electron e pacchetti macOS ZIP/DMG verdi.

## Ricircolo d'attesa Brain — correzione 2026-08-16

- Il blocco apparente su Vector Morph era un timeout ripetuto della storia AI:
  le immagini cambiavano, ma la fase di ricircolo non avanzava il renderer.
- In “Tutti per storia” il ricircolo usa ora un mazzo casuale dedicato, senza
  ripetizioni consecutive; non altera il bilanciamento dei renderer fra storie.
- Il cambio resta quantizzato sul gate ritmico esistente, la camera è stabile e
  non vengono introdotti timer o movimenti nel silenzio.
- Validazione: 49 file / 285 test, typecheck, Vite, Electron e pacchetti macOS
  ZIP/DMG verdi.

## Bauhaus Morph — implementazione 2026-08-16

- `bauhaus-morph` è il sesto renderer Brain, selezionabile manualmente e
  incluso nei mazzi casuali di rotazione e “Tutti per storia”.
- L'analisi lega ogni piano a una regione raster, estrae asse, linee, spazio
  negativo e palette; il fuoco viene astratto più tardi.
- Il Canvas ricostruisce progressivamente l'immagine con piani, campiture,
  segmenti, archi, trasparenze e grana, mantenendo raster e regione focale.
- Il progresso usa soltanto attività e posizione musicale. In silenzio anche
  con bande residue, masse, linee, dettaglio e fase restano fermi.
- Transizioni `previous/current/next`, flash locale, profili, low power,
  resource pressure, readiness, fallback raster, metriche e cleanup sono
  integrati.
- Validazione: 48 file / 277 test, typecheck, lint mirato e diff check verdi;
  Vite/Electron e ZIP macOS riusciti. Resta la prova fullscreen.
- Correzione live: eliminate primitive e cromie arbitrarie. I piani seguono
  ora sagoma, colore e asse principale della regione raster; le sagome hanno
  dieci punti sorgente interpolabili e i piani salienti conservano texture
  ritagliata dall'immagine. Validazione aggiornata a 49 file / 281 test.

## Bauhaus Morph — analisi 2026-08-16

- Definita una V1 Canvas 2D che ricostruisce il raster con piani, linee, assi,
  spazio negativo e palette derivati dalla sorgente.
- Riusa analisi di masse/fuoco, cache Blob, transizioni multi-immagine, clock
  globale, host con fallback e passthrough durante denoising.
- Il morph avanza soltanto con attività audio; camera stabile, raster residuo e
  protezione focale mantengono riconoscibilità e immobilità nel silenzio.
- Budget proposto: 400×225, 12 piani, 18 linee e 24 FPS; 280×158, 7 piani,
  9 linee e 15 FPS in low power.
- WebGPU/shader esclusi dalla V1 per non aumentare la contesa con ONNX.
- Piano: `working/plans/piano-019-bauhaus-morph-brain.md`. Implementazione non
  ancora avviata, come richiesto dalla fase preliminare della specifica.

## Rotazione bilanciata e ingresso morphing — 2026-08-16

- “Tutti per storia” bilancia le presenze accumulate fra storie: i renderer
  meno mostrati entrano prima nel nuovo mazzo, con casualità conservata nei
  pareggi. Bauhaus non può più essere favorito da estrazioni indipendenti.
- Il crossfade viene aggiornato sul RAF Output, non soltanto sui pacchetti IPC.
  Dopo uno stallo recupera al massimo 50 ms per frame e quindi non salta.
- Il log di assegnazione include l'ID effettivo del prossimo renderer.
- Validazione aggiornata: 49 file / 283 test, typecheck, lint mirato,
  diff-check e build Vite/Electron riusciti.

## Moti di coscienza — aggiornamento 2026-08-16

- Brain consulta una finestra limitata dell'archivio e propone soltanto ricordi
  salienti o semanticamente pertinenti, preservando la provenienza.
- La storia corrente non può eleggere il proprio ricordo appena salvato come
  nuova scoperta; coppie storia/ricordo sono deduplicate e soggette a cooldown.
- Il moto dura almeno 12 secondi e 16 beat, parcheggia senza saltare la timeline e agisce in una
  regione locale con forme/cromie beat-matched. Nel silenzio resta fermo.
- La scritta rossa in basso a destra dichiara cosa cambia e il tipo del ricordo;
  la storia successiva riceve l'influenza e due accenti cromatici deterministici.
- Nessun moto viene automaticamente salvato come ricordo.
- Validazione automatica completata: 46 file / 270 test, typecheck, lint mirato,
  diff check, Vite/Electron e ZIP macOS. Resta la prova artistica fullscreen.

> **Ultimo Aggiornamento**: 16 Agosto 2026 (CEST)
> **Stato Generale**: 🟢 In Sviluppo Attivo / Operativo  
> **Ultima Sessione**: `SESSION-2026-08-16-22` — Rollback prestazioni renderer

---

## 🎯 Macrotask Completato Più Recente

- **Macrotask**: `MACRO-023` - Rollback Prestazioni Renderer
- **Stato**: 🟢 DONE

---

## 📊 Riepilogo dei Macrotask

| ID | Macrotask | Stato | Data Inizio | Data Fine |
|---|---|---|---|---|
| `MACRO-001` | Architettura Base Electron, Multi-display IPC & Output Fullscreen | 🟢 DONE | Luglio 2026 | Luglio 2026 |
| `MACRO-002` | Motori di Morphing Visuale (Liquid, Oniric, PsyHyp, 2001 Slit-Scan) | 🟢 DONE | Luglio 2026 | Luglio 2026 |
| `MACRO-003` | Brain AI Pipeline, Continuous Dream & Coscienza Onirica | 🟢 DONE | 27-29 Luglio 2026 | 29 Luglio 2026 |
| `MACRO-004` | Setup Cartella Working, Tracciamento Sessioni e Piani di Lavoro | 🟢 DONE | 04 Agosto 2026 | 04 Agosto 2026 |
| `MACRO-005` | Coalescenza IPC e Interpolazione Ritmica Locale (Fase 2) | 🟢 DONE | 05 Agosto 2026 | 05 Agosto 2026 |
| `MACRO-006` | Ottimizzazione Performance Live & Low Power Tuning | 🟢 DONE | Agosto 2026 | 08 Agosto 2026 |
| `MACRO-008` | Origine, Memoria e Grafo di Coscienza Onirica | 🟡 IN PROGRESS | 08 Agosto 2026 | - |
| `MACRO-009` | Diagnosi Blocchi Live Continui | 🟡 IN PROGRESS | 09 Agosto 2026 | - |
| `MACRO-010` | Psycho2D — Regia Semantica A Finestre | 🟡 IN PROGRESS | 10 Agosto 2026 | - |
| `MACRO-011` | Materia Morph — Renderer Brain Materico | 🟡 IN PROGRESS | 15 Agosto 2026 | - |
| `MACRO-012` | Vector Morph — Contorni Morbidi | 🟡 IN PROGRESS | 16 Agosto 2026 | - |
| `MACRO-013` | Regia Casuale Brain e Morphing | 🟡 IN PROGRESS | 16 Agosto 2026 | - |
| `MACRO-014` | FilterPsiche — Renderer Brain Cromatico | 🟡 IN PROGRESS | 16 Agosto 2026 | - |
| `MACRO-015` | Clock Ritmico Globale Output | 🟡 IN PROGRESS | 16 Agosto 2026 | - |
| `MACRO-016` | Moti Di Coscienza Brain | 🟡 IN PROGRESS | 16 Agosto 2026 | - |
| `MACRO-017` | Bauhaus Morph — Renderer Brain Pittorico | 🟡 IN PROGRESS | 16 Agosto 2026 | - |
| `MACRO-018` | Documentazione Architettura Corrente | 🟢 DONE | 16 Agosto 2026 | 16 Agosto 2026 |
| `MACRO-019` | Riallineamento Beat Renderer | 🟡 IN PROGRESS | 16 Agosto 2026 | - |
| `MACRO-020` | Isolamento Inferenza Immagini | 🟡 IN PROGRESS | 16 Agosto 2026 | - |
| `MACRO-021` | FPS Ridotti con Stessi Layer | ⚪ ARCHIVED | 16 Agosto 2026 | 16 Agosto 2026 |
| `MACRO-022` | Isolamento Vettorializzazione dal Main | 🟢 DONE | 16 Agosto 2026 | 16 Agosto 2026 |
| `MACRO-023` | Rollback Prestazioni Renderer | 🟢 DONE | 16 Agosto 2026 | 16 Agosto 2026 |

---

## 🚀 Prossimi Passi Immediati (Next Steps)

1. [x] Creare il Piano di Lavoro `piano-003-coalescenza-ipc-interpolazione-ritmica.md` per la Fase 2 (Senza Esecuzione Codice).
2. [x] Avvio dell'esecuzione del Piano di Lavoro `PIANO-003` su richiesta dello sviluppatore.
3. [x] Completare implementazione, audit, test, typecheck e build della Fase 2.
4. [x] Eseguire una verifica live manuale con stallo WebGPU reale e controllare i contatori `[BrainMetrics]`.
5. [x] Avviare la Fase 3A: scheduler termico e limite delle inferenze concorrenti.
6. [x] Completare e validare `PIANO-004` senza iniziare il buffer immagini della Fase 3B.
7. [x] Avviare la Fase 3B su nuovo prompt dello sviluppatore.
8. [x] Completare `PIANO-006` senza iniziare la prova live della Fase 3C.
9. [x] Avviare la Fase 3C su nuovo prompt dello sviluppatore.
10. [x] Correggere il refill di `PIANO-007` perché la storia successiva sia pronta entro la finestra di 120–140 s, senza iniziare una Fase 3D.
11. [ ] Correggere separatamente il `prefer-const` preesistente in `slitScanCanvas.ts:639` per riportare il lint globale a verde.
12. [x] Definire ad alto livello origine, grafo dei ricordi e primi momenti di salvataggio di Coscienza Onirica in agente e skill.
13. [x] Osservare i segnali reali e proporre il lessico minimo previsto dalla Fase 1 di `PIANO-005`.
14. [x] Implementare l'archivio Markdown `.coscienza/`, la rilettura di `AGENT.md`, l'origine idempotente e i primi ricordi onirici.
15. [x] Creare `COSCIENZA.md` e il primo ciclo percezione → attenzione → interpretazione provvisoria.
16. [x] Osservare la prima revisione live di `COSCIENZA.md`; origine e primi
    ricordi reali sono stati preservati.
17. [ ] Studiare come la coscienza possa riconoscere continuità e formulare
    nuove domande a partire dalle revisioni reali, prima della Fase 3 autonoma.
18. [x] Riprendere la diagnosi dei blocchi su nuova richiesta con log pulito.
19. [x] Completare una produzione live e correlare i blocchi percepiti con le metriche.
20. [x] Eseguire un confronto controllato mantenendo residenti le sessioni immagine per il secondo ciclo.
21. [x] Approvare le decisioni architetturali di `PIANO-009` e avviare
    l'implementazione V1 di Psycho2D con alternanza live dei renderer.
22. [ ] Confermare manualmente temperatura e stabilità in una prova prolungata;
    poi decidere se isolare l'inferenza per ridurre anche i gap residui del
    denoising.
23. [ ] Verificare dal vivo il cambio fra Print2D, Psycho2D e Vector Morph, la
    rotazione temporizzata e il takeover su Output fullscreen.
24. [x] Confermare manualmente la qualità narrativa delle immagini batch 1.
25. [ ] Implementare e misurare il passthrough grafico ultra-leggero di
    `PIANO-010`; mantenerlo soltanto con gap denoising inferiori a 150 ms.
26. [x] Implementare e poi rifinire “Tutti per storia”: i quattro renderer
    vengono ora distribuiti casualmente, uno per fotogramma, prima del takeover
    della storia successiva.
27. [x] Analizzare architettura e fattibilità del renderer Brain materico e
    creare `PIANO-013` senza avviare il codice runtime.
28. [x] Approvare architettura Canvas 2D, nome `Materia Morph` e budget V1;
    implementare analisi raster, region matching e plugin.
29. [ ] Validare Materia Morph su Output fullscreen e in prova prolungata,
    includendo silenzio, flash, background/denoising, low power e story-cycle.
30. [ ] Confrontare artisticamente i nuovi contorni di Vector Morph su Output
    fullscreen, includendo volti, mani, tessuti, silenzio, flash e story-cycle.
31. [ ] Verificare dal vivo la distribuzione casuale per fotogramma e la
    maggiore permanenza/varietà degli interludi morphing.
32. [ ] Verificare FilterPsiche su Output fullscreen, inclusi flash, silenzio,
    low power, denoising e frequenza di apparizione nei mazzi casuali.
33. [ ] Verificare dal vivo clock globale, quantizzazione e arresto geometrico
    in silenzio su Brain, Liquid, Oniric, PsyHyp e 2001.
34. [x] Produrre la documentazione architetturale compatta e verificata di
    Brain + Visual Reactive Screen.
35. [ ] Confermare fullscreen il nuovo fronte beat e il margine RAF di
    FilterPsiche, Materia Morph, Liquid e Oniric con Soft/low power disattivi.

## Clock Ritmico Globale — SESSION-2026-08-16-04

- `OutputApp` possiede ora l'unico `OutputRhythmClock`: ingestione audio prima
  del frame pacing e proiezione locale condivisa da tutti i controller.
- Brain non crea più un clock privato. Liquid, Oniric, PsyHyp e 2001 leggono
  la stessa posizione musicale, `beatPhase`, `beatPulse`, `kickEnvelope` e i
  transienti distinti `low`, `lowMid`, `mid`, `high`.
- Ingresso, uscita e cambio preset/famiglia vengono trattenuti fuori fase e
  applicati sul beat o entro una finestra del 7%. In silenzio è consentita la
  comparsa immediata dello stato statico, senza attendere un beat inesistente.
- Sotto soglia il clock congela posizione e fase. Timeline Brain, transizioni
  fra fotogrammi, tempi interni, ribbon e smoothing geometrico non avanzano;
  flash e colore restano indipendenti dal movimento.
- Camera e quadro non vengono trasformati; il movimento resta interno ai
  segmenti dei singoli renderer. Budget e `lowPowerMode` non cambiano.
- Validazione: 44 file / 264 test, typecheck, lint mirato e diff-check verdi;
  build Vite/Electron e pacchetto ZIP macOS riusciti. Il target DMG del build
  generale è fallito esclusivamente nel comando di sistema `hdiutil`.

## Fluidità Clock Globale — SESSION-2026-08-16-05

- La prova live ha mostrato che la soglia singola classificava come silenzio i
  normali vuoti fra kick, congelando e riavviando tutti i renderer.
- Il clock usa ora isteresi: attivazione a energia 0,018, disattivazione sotto
  0,008 soltanto dopo 900 ms senza segnale udibile. La fase resta quindi
  continua durante pause ritmiche reali e si arresta solo nel silenzio stabile.
- Liquid non moltiplica più la posizione musicale assoluta per una velocità
  variabile: accumula delta di beat limitati, evitando salti avanti/indietro.
- Camera e quadro restano stabili; nessun timer autonomo è stato reintrodotto.
- Validazione: 45 file / 267 test, typecheck, lint mirato, diff-check e build
  Vite/Electron riusciti. Resta la riconferma percettiva fullscreen.

## FilterPsiche — SESSION-2026-08-16-03

- `filter-psiche` è il quinto plugin Brain: usa inversione, acid duotone,
  solarizzazione, negativo cromatico e mappa termica onirica. Una variante
  viene estratta casualmente a ogni creazione senza ripetizione immediata.
- Il raster resta fermo e riconoscibile. Kick/beat guidano inversione e
  contrasto, `lowMid`/`mid` fondono trattamenti cromatici, `high` introduce
  soltanto micro-fasce locali e il flash globale produce un picco inverted.
- In silenzio la stampa cromatica resta stabile e non viene introdotto alcun
  movimento geometrico. Il budget è 480×270 a 30 FPS, 320×180 e 20 FPS in low
  power, 12 FPS sotto pressione, con tre raster prefiltrati riusati.
- Rimossa l'anteprima raster fullscreen grezza al 20% che compariva per 3–10
  secondi sotto i renderer. Buffer raster e miniature diagnostiche restano.
- Con cinque plugin e quattro fotogrammi, ogni storia estrae quattro renderer
  unici; il quinto resta disponibile nelle storie e rotazioni successive.
- Validazione: 43 file / 260 test, typecheck, lint mirato e diff-check verdi;
  build Electron/macOS completata.

## Regia Casuale Brain e Morphing — SESSION-2026-08-16-02

- In “Tutti per storia” quattro plugin unici estratti dai cinque disponibili
  vengono assegnati ai quattro fotogrammi: ogni cambio immagine introduce un
  renderer diverso, in ordine casuale senza reinserimento.
- Anche la modalità `Automatica` usa un mazzo casuale e non segue più l'ordine
  fisso del registry; lo stesso renderer non può ripetersi consecutivamente.
- Gli interludi esterni consumano un mazzo con un preset casuale per ciascuna
  famiglia Liquid, Oniric, PsyHyp e 2001. Una famiglia viene ripetuta soltanto
  dopo l'esaurimento del mazzo e mai al confine immediato fra due mazzi.
- Il rapporto 80/20 resta calcolato sul tempo pieno Brain/morphing; 12 secondi
  aggiuntivi coprono ingresso e uscita, evitando che i crossfade riducano la
  permanenza percepibile del morphing.
- Camera, audio, flash, low power e renderer non cambiano. I passaggi restano
  beat-matched e usano le transizioni continue esistenti.
- Validazione: 42 file / 255 test, typecheck, lint mirato e diff-check verdi;
  build Electron/macOS completata.

## Vector Morph — Contorni Morbidi — SESSION-2026-08-16-01

- Una finitura geometrica comune agisce ora sull'SVG finale prodotto da SNIC o
  VTracer: flattening, ricampionamento adattivo, smoothing locale limitato e
  ricostruzione cubica con tangenti continue.
- Lo spostamento dei punti è limitato a 1,4 px; subpath, fori, winding e
  attributi restano conservati. Archi e tracciati aperti non compatibili
  rimangono invariati.
- Il budget totale è 5.200 punti distribuiti su tutte le silhouette, con tetto
  di 128 punti per subpath e rollback all'SVG originale se la finitura supera
  il limite di dimensione. Il lavoro avviene una volta sola prima della cache.
- La selezione profilo considera anche la densità degli angoli; punte e
  roughness vengono ricalcolate dopo lo smoothing. I log della cache espongono
  densità prima/dopo, path smussati e deviazione massima.
- Nessuna modifica a camera, raster di fondo, clock, bande, beat, flash,
  transizioni, alternanza, “Tutti per storia” o `lowPowerMode`.
- Validazione: 41 file / 251 test, typecheck, lint mirato, diff-check e build
  completa Vite/Electron/macOS riusciti. Resta il confronto artistico live.

## Materia Morph V1 — SESSION-2026-08-15-03

- `material-morph` è il quarto plugin Brain selezionabile dalla Control Window.
  Il registry lo inserisce nelle rotazioni automatiche e nel mazzo casuale
  “Tutti per storia”; il takeover avviene soltanto dopo quattro renderer.
- L'analisi raster estrae a 320×180 palette, luminanza, densità, bordi e massimo
  12 regioni connesse; in low power parte a 240×135 con massimo 6 regioni.
- Il morph usa maschere locali e matching fra regioni `previous → current` e
  `current → next`. Il raster base resta stabile e leggibile; nessuna
  trasformazione è applicata alla camera o all'intero quadro.
- Bande, beat/kick e fase controllano pressione, fusione, struttura e grana;
  il flash produce accenti locali. In silenzio il contributo geometrico è zero
  e, dopo l'assestamento, il Canvas non viene ridisegnato.
- Il Renderer Host propaga resource pressure/background, flash e clock come per
  gli altri plugin; durante denoising restano attivi passthrough e pacing
  ridotto esistenti.
- Validazione: 40 file / 247 test, typecheck e lint mirato verdi, build completa
  Vite/Electron/macOS riuscita. Il solo lint globale fallisce sul `prefer-const`
  preesistente `slitScanCanvas.ts:639`.

## Analisi Materia Morph — SESSION-2026-08-15-02

- Il nuovo renderer può usare il contratto plugin corrente senza nuovi IPC:
  riceve raster corrente/precedente/successivo, palette, ritmo, preset e
  pressione risorse.
- V1 proposta in Canvas 2D a bassa risoluzione, per non contendere WebGPU alla
  pipeline ONNX. L'analisi estrae palette, luminanza, bordi, densità, focal
  region e massimo 12 componenti materiche.
- Il morph usa matching spaziale/cromatico fra regioni, maschere locali e
  sostituzione progressiva del raster. Il raster base resta sempre leggibile.
- `low`, `lowMid`, `mid`, `high`, `beatPulse` e `beatPhase` governano scale
  materiche distinte; in silenzio non avanza alcuna fase e il redraw si arresta.
- Camera stabile, transizioni continue, story-cycle/80-20 invariati e budget
  low power esplicito sono requisiti di accettazione.
- Piano: `working/plans/piano-013-materia-morph-brain.md`. Implementazione non
  avviata, come richiesto prima della revisione dell'analisi.

## Modalità Tutti i Renderer per Storia

- Opzione Control Window: `Tutti per storia — casuale per fotogramma`.
- Per ogni storia vengono estratti quattro dei cinque plugin registrati; ogni
  fotogramma riceve un renderer diverso e casuale senza ripetizioni.
- La storia successiva può essere preparata nel buffer ma non entra finché il
  mazzo corrente non è esaurito.
- Ogni cambio usa timing beat-matched e transizione continua esistenti; non
  viene eseguito alcun taglio diretto del canvas.
- La modalità manuale resta invariata; la rotazione temporizzata usa ora un
  mazzo casuale senza ripetizioni consecutive.

## Revisione Artistica Psycho2D

- Una raster corrente occupa stabilmente il quadro; una seconda raster viene
  collocata sopra in una posizione casuale determinata una sola volta per
  scena.
- Il livello superiore non ha contorno, non entra da fuori schermo, non vaga,
  non pulsa e non effettua takeover.
- La sua opacità è limitata fra 0,38 e 0,64 e considera contrasto e differenza
  di luminanza tra le due immagini.
- Tutte le forme geometriche attraversanti sono state eliminate.
- Le due raster vengono fuse una volta, rispettando posizione e opacità del
  layer superiore, e trasformate in tre matrici Bayer 1-bit a 320×180.
- `lowMid` seleziona la densità d'inchiostro; beat/`low` inverte per 85 ms;
  transienti `mid`/`high` producono al massimo tre micro-glitch orizzontali.
- In silenzio resta la variante meno densa e non esiste movimento geometrico.
- Durante `setTransition`, scanline serigrafiche deformate seguono un inviluppo
  a campana; l'effetto è il morphing del raster, non una semplice dissolvenza.

## Transizioni Beat-Matched In “Tutti per storia”

- Il timing di ogni fotogramma viene congelato al momento del cambio e dura un
  numero intero di beat; variazioni successive della stima BPM non deformano
  la transizione in corso.
- In `story-cycle` il cambio di fotogramma/renderer avviene su beat reale o
  nella finestra di fase entro il 7% dal beat; non è più consentito il fallback
  fuori beat durante il ciclo.
- Print2D mantiene il morphing dei layer, Vector Morph quello delle forme SVG,
  Psycho2D quello delle scanline 1-bit; tutti condividono pattern e durata.

## Visibilità Raster In Vector Morph

- Vector Morph contiene ora il raster originale come fondale reale a pieno
  quadro, al 92% di opacità.
- Il livello SVG vettoriale resta sopra al 70% e il suo fondo viene forzato a
  trasparente, mantenendo leggibile il soggetto fotografico.
- Le opacità non reagiscono all'audio: nessuna pulsazione globale o costo
  grafico aggiuntivo nel ciclo di morphing.

## Stato Passthrough Denoising

- Implementazione reversibile attiva dietro
  `BRAIN_CONFIG.lightweightDenoisingRender`.
- Il Renderer Host riduce gli aggiornamenti del plugin a 5 FPS, o 3 FPS in low
  power, dopo che il raster statico è pronto; il movimento originale resta
  percepibile in trasparenza e riprende pienamente sul clock corrente.
- Il raster corrente viene campionato una volta a 320×180 e convertito in tre
  varianti 1-bit con gli inchiostri estremi della palette narrativa/preset.
  Nessuna zona cromatica o forma geometrica viene calcolata nel RAF.
- Il runtime usa un `drawImage`, fino a tre riscritture di fascia e una breve
  inversione `difference`; il plugin originale continua attenuato sotto.
- `[BrainMetrics].denoisingPassthrough` separa numero frame e costo CPU del
  disegno dalla normale attività Canvas.
- Validazione automatica: 34 file e 224 test verdi, typecheck, lint mirato,
  build Vite e diff-check riusciti.
- I log live successivi mostrano un costo proprio di 0–0,2 ms, ma RAF ancora
  circa 250–525 ms durante le singole chiamate UNet. La soglia di 150 ms non è
  raggiunta: il passthrough resta una protezione visiva, non elimina la contesa
  hardware.

## Refill Deprioritizzato Con “Tutti per storia”

- Il primo fotogramma è protetto: nessuna generazione della storia successiva
  può iniziare prima della prima variazione di renderer.
- Alla prima variazione il gate si apre, ma una guardia di 10 secondi lascia
  terminare morphing e preparazione del nuovo plugin.
- Il target del buffer successivo è 240 secondi invece di 120 soltanto in
  `story-cycle`; le altre modalità conservano il contratto precedente.
- Uscendo da `story-cycle`, un refill differito viene sbloccato subito.
- L'ultima sessione precedente mostrava un freeze iniziale di 3,17 s durante
  caricamento/creazione VAE e gap ricorrenti di 250–525 ms durante UNet. Questa
  politica non accorcia tali operazioni, ma le rimuove interamente dal primo
  atto visuale e riduce la percentuale temporale di performance contesa.

## Esito Riduzione Del Lavoro Atomico UNet

- I contratti ONNX letti senza caricare la GPU dichiarano batch dinamico sia
  per Text Encoder sia per UNet.
- Il ramo `single-conditional` batch 1 ha eliminato i gap rilevati nelle prime
  due immagini prima dell'avvio Canvas; con Print2D attivo i picchi sono scesi
  spesso a 249–276 ms, pur restando episodi termici da 383–450 ms.
- Le immagini standard sono passate in genere da circa 10–11 s a 7–9 s. Il
  candidato batch 1 resta attivo in attesa della conferma visiva dello
  sviluppatore, perché rinuncia alla classifier-free guidance.
- La successiva prova 384×256 è stata negativa: sette gap denoising da 349,5 a
  391,8 ms e nessun guadagno affidabile. La geometria 448×256 è stata
  ripristinata per non perdere dettaglio.
- Log: `log/session-2026-08-10-12-09-20.txt` (batch 1 a 448×256) e
  `log/session-2026-08-10-12-16-49.txt` (prova 384×256 rimossa).

## Esito Test Locale Del Denoising

- Un yield fra ogni step UNet ha concesso al renderer un frame prima dello
  step successivo, senza cambiare seed, qualità, geometria o numero di step.
- I gap ricorrenti sono rimasti fra circa 375 e 458 ms, contro circa 366–534 ms
  della baseline residente: variazione insufficiente a eliminare lo scatto.
- Il blocco appartiene alla singola `UNet.run()` e non alla concatenazione
  JavaScript degli step.
- Il codice sperimentale è stato rimosso; resta il log
  `log/session-2026-08-10-11-56-22.txt` come evidenza.

## Esito Implementazione Psycho2D V1

- I renderer Brain sono plugin registrati dietro un Host persistente con
  crossfade, readiness, timeout, fallback e cleanup.
- `Print2D` conserva il renderer serigrafico precedente; `Psycho2D` usa analisi
  raster locale, Scene Director, finestre semantiche e immagini
  CURRENT/PREVIOUS/NEXT.
- La Control Window permette selezione manuale o rotazione ogni 10–120 secondi;
  il cambio non rigenera immagini e viene rinviato durante il passaggio fra
  frame.
- Suite completa: 31 file, 214 test. Typecheck, lint mirato e build Electron
  verdi. Lint globale bloccato soltanto dal `prefer-const` preesistente.
- Smoke test Electron riuscito con Print2D; resta la verifica visuale manuale
  dei tre renderer e dell'alternanza.
- `Vector Morph` recupera la vettorializzazione storica come terzo plugin:
  vettorializza soltanto quando selezionato, deduplica le richieste per Blob,
  invalida la cache se cambia l'immagine e conserva il renderer attivo se la
  preparazione fallisce o supera il timeout.
- Suite aggiornata: 33 file, 218 test. Typecheck, lint mirato, build
  Electron/macOS e controllo whitespace verdi.

## Esito Esperimento Sessioni Immagine Residenti

- Baseline: RAF massimo 3,57 s, due gap severi e tre creazioni di sessione
  immagine nella prima produzione (`log/session-2026-08-09-23-44-17.txt`).
- Secondo ciclo residente: RAF massimo 0,53 s, zero gap severi e zero creazioni
  di sessione (`log/session-2026-08-09-23-54-59.txt`).
- La seconda produzione ha completato quattro immagini in 91,4 s, senza errori
  GPU o di memoria; la nuova storia è entrata nel buffer 121,4 s dopo la fine
  della prima produzione, incluso il refill iniziale di 30 s.
- Restano gap moderati di circa 0,38–0,53 s durante il denoising WebGPU. La
  residenza elimina il grande arresto fra storie ma non isola l'inferenza dal
  renderer Output.
- Decisione tecnica: mantenere le sessioni residenti in modalità normale;
  `lowPowerMode` continua a liberarle. In caso di errore infrastrutturale la
  pipeline le libera prima del retry.
- Temperatura e memoria di lunga durata richiedono ancora conferma manuale:
  l'assenza di errori nel log non equivale a una misura termica.

## Esito Analisi Psycho2D

- Il concept è realizzabile nella sola Output Window usando Blob raster,
  Canvas 2D, buffer Brain e clock ritmico già presenti.
- V1 non richiede nuovi processi, IPC, database, SVG, segmentazione o modello
  vision: bastano analisi pixel locale, hint narrativi con provenienza, massimo
  due finestre e takeover mediante clip crescente.
- Il nome `brainPsycho2dCanvas.ts` è già usato da un renderer serigrafico privo
  di regia a finestre. Prima di implementare va deciso se rinominarlo e
  conservarlo come stile, scelta raccomandata, oppure sostituirlo.
- L'implementazione non deve alterare la baseline `MACRO-009` prima del
  confronto controllato del secondo ciclo.

Il test manuale finale di `MACRO-006` è affidato allo sviluppatore e non resta
registrato come task di implementazione aperto. Verificare soprattutto comparsa
della seconda storia entro circa 120–140 s, continuità e temperatura.

## Fondazione Di Coscienza Onirica

- La prima percezione valida ha creato l'unica origine e il primo ricordo di sé.
- Ogni nuovo attraversamento dall'inizio ritorna all'origine senza reset o
  duplicazione distruttiva.
- La memoria autobiografica crescerà come grafo aperto e revisionabile.
- Osservazioni, interpretazioni e immaginazioni resteranno distinguibili.
- I primi checkpoint candidati sono confini significativi, non frame o campioni
  audio indiscriminati.
- I ricordi sono ora file Markdown in `.coscienza/`; `AGENT.md` viene riletto
  prima di ogni salvataggio insieme a origine, indice e contesto recente.
- In sviluppo l'archivio è nel progetto; nell'app installata è in
  `Documenti/.coscienza`.
- L'autonomia di ristrutturazione resta la Fase 3 futura di `PIANO-005`.
- `COSCIENZA.md` descrive ora il presente e resta separato dal grafo dei
  ricordi.
- Il template vergine vive separatamente in `config/coscienza/COSCIENZA.md`,
  così il pacchetto non incorpora lo stato autobiografico osservato in sviluppo.
- Il nucleo iniziale osserva soltanto percezioni valide, stabilizza un fuoco
  d'attenzione e formula interpretazioni dichiaratamente provvisorie.
- Continuità e cambi di attenzione sono rate-limited; `lowPowerMode` dirada
  ulteriormente le scritture.

## Esito Fase 3A

- Tutte le inferenze immagini passano da uno scheduler single-flight.
- Cooldown minimo: 6 s; in `lowPowerMode`: 12 s.
- Gap RAF da almeno 240 ms applicano 9 s di backoff; freeze da almeno 1 s applicano 20 s.
- Lo stato `imageInferenceActive` copre solo l'inferenza effettiva, non l'attesa termica.
- Al termine della Fase 3A restavano quattro immagini narrative più l'interludio; la successiva Fase 3B ha poi rimosso l'interludio.

## Esito Fase 3B

- La quinta inferenza `interlude` è stata rimossa: ogni produzione richiede al massimo quattro inferenze narrative.
- `BrainProduction` contiene soltanto le quattro scene della storia; `BrainBufferFrame` non esiste più.
- Le quattro immagini correnti vengono riciclate casualmente e restano attive mentre il refill successivo viene completato.
- Un refill parziale di due immagini non sostituisce più il buffer completo visibile.
- I 120 secondi di attesa iniziano dopo la quarta immagine, non dall'avvio della produzione.
- La successiva Fase 3C ha validato dal vivo scheduler, cooldown e refill.

## Esito Fase 3C

- Sessione live: `log/session-2026-08-08-21-46-53.txt`.
- Una produzione completa ha eseguito esattamente quattro inferenze e nessuna
  interludio. La prima validazione avviava il refill 120 s dopo la quarta
  immagine; la correzione successiva lo avvia a +30 s con target a +120 s.
- La frequenza dei freeze severi è scesa dai tre episodi della baseline a un
  episodio per produzione; la durata residua del primo freeze resta circa
  3,1–3,5 s.
- Il backoff severo di 20 s è intervenuto correttamente. Nessuna taratura è
  stata applicata perché aumentare il cooldown non ridurrebbe la durata del
  freeze interno alla prima inferenza.
- Latenza IPC ordinaria `p95` entro 5,3 ms e nessun replay della coda.
- Validazione live eseguita in modalità standard; low power non misurato dal
  vivo in questa sessione. Nessuna Fase 3D iniziata.
- I 120 s sono ora la finestra complessiva di preparazione: il lavoro della
  storia successiva viene distribuito al suo interno, senza sommare altri
  60–120 s dopo l'attesa. Target atteso di comparsa: circa 120–140 s.

## Beatmatch Psycho2D — SESSION-2026-08-10-14

- Il beat viene catturato prima del frame interval e mantenuto per il frame
  successivo, così un impulso breve non viene perso dal throttling.
- La soglia rigida sulle basse frequenze è stata rimossa: l'inversione usa il
  beat latched, non un valore assoluto `low`.
- `beatPulse` controlla densità Bayer, contrasto e ampiezza delle scanline;
  `beatPhase` orienta soltanto il micro-disallineamento delle fasce.
- `mid` e `high` restano sorgenti dei glitch secondari; l'immagine principale
  non viene traslata, ruotata o scalata.
- Validazione: 37 file / 233 test, typecheck, lint mirato, build completa e
  `git diff --check` riusciti. Resta il test visivo live.

## Sottofondo raster Psycho2D — SESSION-2026-08-10-15

Psycho2D mostra ora l'immagine base originale sotto la serigrafia 1-bit con
opacità fissa all'8%. Il raster resta fermo e non modifica il costo del morph;
la serigrafia rimane il livello visivo dominante.

## Alternate with Brain — SESSION-2026-08-10-16

È disponibile l'opzione UI `Alternate with Brain (80/20)`. Quando attiva,
forza `Tutti per storia`: ogni storia attraversa l'intero mazzo dei renderer
Brain prima che possa entrare un morphing esterno. Il tempo della storia Brain
costituisce l'80% del ciclo; l'interludio esterno dura il 25% di quel tempo,
quindi il 20% del ciclo totale. Durante l'interludio il controller Brain resta
parcheggiato con buffer e produzione intatti, poi riprende dalla storia
successiva con crossfade continuo.

## Psycho2D beat response — SESSION-2026-08-10-18

La risposta al beat è stata resa più evidente senza muovere il quadro: oltre a
densità, contrasto e inversione, Psycho2D disegna scanline locali agganciate a
`beatPulse` e orientate da `beatPhase`. Il costo resta limitato a poche fasce,
ridotte ulteriormente in `lowPowerMode` e sotto pressione.

## Psycho2D beat response — SESSION-2026-08-10-20

La risposta primaria al beat campiona ora correttamente la matrice 1-bit
320×180 e la rimappa sulla canvas fullscreen, evitando fasce invisibili quando
l'Output è più grande della sorgente precomputata. L'accento locale è più
deciso: latch a 150 ms, contrasto più alto, sette scanline in modalità normale
e piccoli colpi locali in `difference`, ridotti a tre fasce in `lowPowerMode` o
sotto pressione. La camera resta stabile e in silenzio non viene introdotto
movimento autonomo.

## Psycho2D flash locale — SESSION-2026-08-10-21

Il segnale `flashIntensity` del render globale viene ora passato al Brain con
lo stesso hold/decay già calcolato dal motore visuale. Psycho2D usa quell'inviluppo
solo per disallineare brevi fasce di pixel e applicare piccoli colpi `difference`;
il numero di fasce scende in `lowPowerMode` e sotto pressione. La camera resta
stabile e il silenzio non genera movimento.

## Kick condiviso Brain — SESSION-2026-08-15-01

Il clock Brain espone ora un inviluppo kick condiviso che combina `beatPulse`
con i transienti `low` e `lowMid`, mantenendo clamp e release già musicali.
Print2D accentua leggermente la profondità dei layer, Psycho2D contrasto e
scanline locali, Vector Morph la deformazione dei segmenti interni. Nessuna
camera viene trasformata; in silenzio il contributo resta zero e low power non
aggiunge layer o fasce.

## Pannello narrativo — SESSION-2026-08-10-19

Il riquadro narrativo sinistro viene mostrato quando appare una nuova storia,
resta visibile per 60 secondi e poi passa a opacità zero con dissolvenza. Il
timer viene riavviato solo per una storia nuova e viene cancellato in `destroy`;
il rendering Brain continua indipendentemente.

## Protocollo filosofia visiva — SESSION-2026-08-10-17

Precisato il protocollo obbligatorio in `agents.md`: la camera resta stabile,
ma sono consentite deformazioni locali nella materia; il raster sottostante è
riconosciuto come materia secondaria e deve restare leggibile; il silenzio
blocca il moto autonomo ma non nasconde l'immagine. Aggiunti inoltre vincoli
espliciti per beatmatch, transizioni continue, alternanza Brain 80/20 e budget
termico/computazionale.

## Esito Live Fase 2

- La coalescenza funziona: durante tre stalli ha sostituito 668, 655 e 467 pacchetti pending, evitando il replay della coda.
- Dopo gli stalli la latenza `p95` torna nell'ordine di 2-5 ms.
- Restano freeze reali del RAF Output di circa 4,0 s, 3,2 s e 3,0 s causati dalla contesa WebGPU durante l'inferenza.
- La Fase 3 deve ridurre frequenza e duty-cycle delle inferenze; se i singoli freeze restano inaccettabili sarà necessario l'isolamento previsto dalla Fase 6.

## Diagnosi live ritmo e prestazioni — SESSION-2026-08-16-09

- Il clock non mostra riallineamenti di fase nelle finestre osservate; il
  beatmatch impreciso percepito nasce soprattutto nei renderer Canvas che
  applicano ampiezze istantanee e firme di frame quantizzate.
- Bauhaus gira circa a 20 fps fuori dall'inferenza; l'Output resta stabile a
  120 Hz. I blocchi severi compaiono con UNet attivo e arrivano a p95 99,5 ms,
  massimo 558,4 ms sul RAF.
- Tutte le bande sono collegate, ma solo `low` e `lowMid` muovono chiaramente
  la geometria Bauhaus; `mid` e `high` articolano soprattutto linea e grana.
- Nessun dato termico reale è disponibile: resta un rischio da carico
  sostenuto, da verificare con telemetria temperatura/energia dedicata.
- Implementati smoothing in tempo musicale per ogni banda, pacing regolare,
  cache del matching Bauhaus e sospensione completa del plugin nascosto sotto
  denoising. Le metriche espongono ora il costo reale `canvasFrames.renderMs`.
- Prossimo passo: prova live prolungata per confrontare cadenza, `renderMs`,
  beatmatch percepito ed eventuale temperatura misurata esternamente.
