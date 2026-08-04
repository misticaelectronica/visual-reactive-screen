# Configurazione esterna

Questa cartella contiene i file modificabili senza ricompilare l'applicazione.

## `brainPhrases.txt`

È il file attivo letto da Brain prima di generare ogni nuova storia.

- una frase per riga;
- righe vuote ignorate;
- righe che iniziano con `#` considerate commenti;
- almeno una frase valida obbligatoria.

Le modifiche vengono applicate alla generazione successiva. Non serve riavviare
Brain né ricompilare.

## `brainPhrases.example.txt`

Raccolta di esempio non caricata dall'applicazione.

## `brainRendering.json`

Controlla formato delle immagini, durata del morphing, permanenza dei
fotogrammi, copertura dello schermo e intensità del movimento. Brain rilegge
questo file prima di ogni nuova storia: le modifiche non richiedono una
ricompilazione.

### Immagine

- `image.width` e `image.height`: dimensioni finali richieste al generatore
  ONNX. Devono essere multipli di 8 e almeno 256. Il valore predefinito
  `640 × 360` produce una scena 16:9. Internamente Brain adatta, quando
  necessario, la superficie di inferenza ai multipli di 64 richiesti
  dall'UNet SD 1.5 e applica un ritaglio centrale al formato configurato.
  L'uscita resta sempre `640 × 360`. Il profilo rapido usa internamente
  `448 × 256` per i profili rapido e migliorato, mentre l'alta qualità usa
  `576 × 320`: questo evita disallineamenti ONNX e riduce la competizione con
  il rendering live. Il profilo migliorato conserva più dettaglio usando più
  passaggi di denoising, senza aumentare la memoria della geometria.
- `standardSteps`, `enhancedSteps`, `qualitySteps`: numero di passaggi per i
  tre livelli dei fotogrammi narrativi. Più passaggi richiedono più tempo.
- `interludeSteps`: passaggi riservati al Collegamento Associativo; il valore
  predefinito è `4` per contenere carico e temperatura.
- Ogni storia usa quattro fotogrammi. Due fotogrammi rapidi (`standard`) sono
  scelti casualmente fra il secondo, il terzo e il quarto; il primo non è mai
  rapido. Gli altri due usano `enhanced` durante il rendering live. Il log
  `[Brain][psichedel] profili qualità selezionati per la storia` mostra gli
  indici scelti (numerati da 1).
- Dopo il quarto fotogramma Psichedel genera un quinto raster `interlude` a
  quattro passaggi,
  chiamato `Collegamento Associativo` e classificato come `EMOTIVO` oppure
  `IMPLICITO`. Viene vettorializzato come gli altri ma non entra nella
  struttura narrativa: si aggiunge al ricircolo casuale mentre Brain prepara
  la storia successiva. Se fallisce, i quattro fotogrammi già validi
  continuano senza rigenerare l’intera storia.

### Tempi

- `frameDurationMs`: durata complessiva indicativa di ogni fotogramma.
- `transitionMinMs` e `transitionMaxMs`: durata casuale minima e massima della
  trasformazione verso l'immagine successiva.
- `holdMinMs` e `holdMaxMs`: tempo durante il quale l'immagine vive e reagisce
  alla musica prima di trasformarsi.
- `firstFrameTransitionMs`: ingresso del primo fotogramma della storia.

Per accorciare la rotazione senza rendere nervoso il sogno, ridurre
`transitionMaxMs` e mantenere almeno 3–4 secondi di `holdMinMs`.

### Composizione

- `preserveAspectRatio`: `xMidYMid slice` riempie tutto lo schermo con un
  ritaglio controllato; `xMidYMid meet` mostra l'intero fotogramma e può
  lasciare spazio ai lati.
- `horizontalStretch` e `verticalStretch`: stiramento morbido oltre i bordi.
  `1` significa nessuno stiramento.
- `blurPx`: leggera fusione dei bordi vettoriali. Valori alti fanno perdere
  dettaglio.
- `edgeFeatherPx`: ampiezza della zona perimetrale smorzata.
- `edgeDarkness`: intensità dello smorzamento, da `0` a `0.9`.

### Movimento

- `movementMultiplier`: intensità generale.
- `cameraMultiplier`: spostamento del punto di osservazione e parallasse.
- `liquidMultiplier`: deformazione fluida delle forme.
- `microMovement`: dettaglio organico applicato ai contorni mentre è presente
  attività musicale. In silenzio viene ridotto al `2.5%`; non esistono più
  animazioni SMIL autonome fuori dal budget RAF.
- `colorSpeedMultiplier`: velocità delle variazioni cromatiche.
- `maximumAnimatedAreaRatio`: quota massima della scena che una forma può
  coprire prima di essere trattata come fondale. Il default `0.34` impedisce
  alle grandi campiture di sottrarre priorità a figure e oggetti.
- `backgroundMotionScale`: frazione di profondità, deformazione, kick e
  micro-movimento conservata sui fondali; default `0.06`. Non nasconde la
  forma, ne limita soltanto il movimento.
- `patterns`: rotazione dei pattern ammessi. Valori disponibili:
  `marea`, `fioritura`, `corrente`, `spirale`. Si possono rimuovere quelli
  indesiderati o lasciarne uno solo.

### Impulso Scenico Globale

La sezione `globalRhythmicMotion` amplifica la deformazione fluida già
calcolata sui contorni. Non aggiunge trasformazioni DOM ai segmenti e non
introduce un secondo ciclo di movimento. La superficie e la camera non
vengono mai traslate, ruotate o oscillate come un blocco.

- `enabled`: abilita o disabilita l’Impulso Scenico Globale.
- `intensity`: moltiplicatore generale dell’effetto, da `0` a `3`.
- `deformationBoost`: quantità con cui l’inviluppo musicale amplifica la
  deformazione organica dei contorni.
- `flowBoost`: quantità con cui l’inviluppo musicale amplifica la corrente
  interna alle forme.
- `kickDeformationPercent`: escursione radiale del colpo, in percentuale della
  diagonale SVG. Il valore predefinito `0.72` produce circa 10 unità su una
  scena da 1400 unità; viene calcolato una volta per frame e distribuito sulle
  singole forme, senza zoomare la composizione.
- `responseMs`: base del rilascio delle bande. L’attacco usa un percorso
  rapido da `36 ms`, senza un secondo smoothing dell’impulso.
- `resourcePressureBoost`: riduzione dell’impulso applicata mentre WebGPU
  genera immagini; il valore predefinito `0.82` protegge le prestazioni.

Il movimento dei punti usa ora la struttura temporale di Liquid Morphing: un
clock continuo conserva il tempo stimato anche quando il rilevatore perde un
colpo, mentre il beat successivo corregge la fase senza azzerare bruscamente i
tracciati. Una seconda fase lenta modifica nel tempo la combinazione di tre
armoniche spaziali, così il disegno evolve invece di ripetere sempre lo stesso
rimbalzo. Questa evoluzione si ferma sotto la soglia audio e non aggiunge nuovi
segmenti, livelli o trasformazioni dell'intera scena.

Ogni banda ha un transiente indipendente con attacco da `28 ms` e rilascio
progressivamente più rapido dalle basse alle alte. La mappatura delle curve è
esplicita:

- `low`: pressione radiale e colpo;
- `lowMid`: corrente laterale interna alle forme;
- `mid`: propagazione lungo i punti del tracciato;
- `high`: densità delle increspature.

In silenzio l’attività geometrica scende quasi a zero. L’effetto resta dentro
il calcolo dei punti già previsto dal renderer, evitando trasformazioni DOM o
nuovi segmenti.

Il renderer misura inoltre il costo di ogni aggiornamento. Oltre `12 ms`
(`20 ms` in `lowPowerMode`) attiva per due secondi il budget protetto: `24 FPS`,
massimo 8 livelli di profondità, 6 deformazioni e nessun echo. La stessa
protezione è attiva durante generazione immagini e vettorializzazione.

Tra due storie il modello immagini resta residente durante visualizzazione e
pausa termica, ma viene rilasciato prima di caricare traduttore e modello
narrativo. Dopo `500 ms` di assestamento GPU, l’AI testuale prepara la nuova
storia; il modello immagini viene poi ricreato dalla cache locale una sola
volta per l’intero gruppo di fotogrammi. Questo evita la compresenza dei modelli
più pesanti, causa di saturazione e blocco al secondo ciclo.

Anche la fase testuale usa finestre di residenza separate:

1. il traduttore italiano→inglese traduce soltanto le frasi non già presenti
   nella cache locale di sessione;
2. il traduttore viene rilasciato prima di creare Qwen;
3. Qwen viene riusato per storia ed eventuali correzioni, senza ricaricarlo;
4. tutti i modelli testuali vengono rilasciati una sola volta prima di
   Psichedel;
5. un rilascio testuale che non risponde entro `12 s` fa ricreare il worker,
   evitando un’attesa infinita.

Non vengono effettuati precaricamenti paralleli: ridurrebbero la latenza ma
aumenterebbero picchi di memoria, temperatura e rischio di blocco.

### Qualità della vettorializzazione

Il motore principale è `SNIC edge-guided`. Il raster viene decodificato una sola
volta e sottoposto a un
pretrattamento lineare alla sua risoluzione di inferenza:

1. filtro locale che riduce rumore e gradienti senza attraversare i bordi ad
   alto contrasto;
2. contrasto locale e separazione cromatica disponibili ma disattivati per
   default: non devono inventare confini assenti nella fotografia;
3. misura della quantità di bordi conservati; se scende sotto l'`86%`, il
   pretrattamento viene scartato e il motore riceve il raster originale;
4. SNIC costruisce superpixel connessi nello spazio percettivo OKLab;
5. le regioni vengono fuse solo se colore e bordo sono compatibili. Dopo ogni
   passaggio i confini vengono ricalcolati sulle regioni correnti;
6. i contorni chiusi vengono semplificati entro un budget globale e convertiti
   in curve quadratiche arrotondate;
7. il candidato viene accettato solo se conserva una quota sufficiente dei
   bordi forti e supera il controllo strutturale. In caso contrario parte il
   fallback VTracer `balanced → simplified → detailed`.

Il budget SNIC non attraversa bordi eccezionalmente forti per raggiungere a ogni
costo il numero desiderato di regioni: in quel caso è preferibile il fallback a
una silhouette deliberatamente cancellata.

- `engine`: `snic` usa il nuovo motore; `vtracer` forza il percorso storico.
- `fallbackToVTracer`: abilita il fallback automatico quando SNIC non supera i
  controlli; predefinito `true`.

- `preprocessEnabled`: abilita il pretrattamento spaziale; predefinito `true`.
- `denoiseRadius`: raggio del filtro fotografico bilaterale, da `1` a `3`;
  default `1`.
- `denoiseStrength`: fusione fra raster originale e superficie ripulita, da
  `0` a `1`; default `0.28`.
- `localContrast`: contrasto locale della sola copia di tracing, da `0` a
  `0.6`; default `0`.
- `colorSeparation`: separazione moderata delle componenti cromatiche, da `0`
  a `0.5`; default `0`.
- `minimumEdgeRetention`: quota minima di bordo che il filtro deve conservare;
  default `0.86`. Sotto la soglia viene usato automaticamente l'originale.
- `paletteColors`: numero di colori richiesto direttamente a VTracer,
  predefinito `16`. Non esiste più una tavolozza intermedia: questo evita la
  doppia quantizzazione che fondeva soggetto e sfondo.
- `spatialCleanupPasses`: passaggi del filtro locale `3×3`, predefinito `1` e
  massimo `2`. Il filtro pesa insieme vicinanza e distanza cromatica e viene
  annullato automaticamente quando riduce troppo i bordi.
- `maximumContourRoughness`: massima quota normalizzata di cambi di direzione
  brevi e alternati; predefinito `0.16`.
- `contourRoughnessPenalty`: peso della rugosità nella scelta del candidato.

- `spikeDetectionEnabled`: abilita il rilevamento delle punte.
- `minimumCornerAngleDegrees`: un vertice sotto questa apertura viene
  considerato sospetto se entrambi i lati sono abbastanza lunghi.
- `minimumSpikeLengthRatio`: lunghezza minima dei lati, espressa rispetto
  alla diagonale dell’immagine, per evitare falsi positivi sui dettagli
  piccoli.
- `maximumAcceptedSpikes`: numero massimo di punte con cui un profilo può
  essere accettato subito. Il valore predefinito è `1`.
- `spikePenalty`: peso di ogni punta nella selezione del candidato. Valori
  maggiori privilegiano profili più morbidi anche se hanno più tracciati.
- `roundedFinishEnabled`: abilita il bordo di finitura.
- `roundedStrokeWidth`: spessore del bordo, nello spazio SVG, applicato con lo
  stesso colore del riempimento.
- `roundedStrokeOpacity`: opacità del bordo.
- `snicSuperpixelSize`: passo medio dei semi SNIC; default `24` pixel.
- `snicCompactness`: peso della compattezza spaziale rispetto al colore;
  default `9`.
- `snicMergeColorThreshold`: distanza percettiva massima per la fusione.
- `snicStrongEdgeThreshold`: intensità oltre cui un bordo protegge le regioni.
- `snicEdgeWeight`: peso del bordo nel costo di fusione.
- `snicMinimumRegionAreaRatio`: area relativa sotto cui un'isola può essere
  assorbita dal vicino compatibile.
- `snicMaximumRegions`: obiettivo di budget, predefinito `72`.
- `contourSimplificationTolerance`: errore geometrico ammesso nella riduzione
  dei punti; default `1.7` pixel.
- `contourCurveSmoothing`: arrotondamento locale degli angoli, senza blur.
- `contourMaximumPoints`: budget globale dei punti SVG; default `2400`.
- `minimumContourAreaRatio`: elimina esclusivamente anelli molto piccoli.
- `minimumStrongEdgeRecall`: copertura minima dei bordi forti per accettare
  SNIC; default `0.70`.

Il controllo estetico è integrato nella selezione di SNIC/VTracer per evitare
una seconda vettorializzazione. Dopo l’IPC resta intenzionalmente un controllo indipendente
e leggero: convalida XML, limiti di peso e numero di forme, `viewBox` e
sanitizzazione. Non assegna più qualità in base a un elevato numero di comandi,
perché questo favorirebbe la frammentazione.

La finitura usa
`stroke-linejoin="round"` e `stroke-linecap="round"`; non
introduce blur, filtri raster o texture fullscreen. Una punta lunga resta
penalizzata in fase di selezione: il bordo serve soltanto ad addolcire denti e
giunzioni residue.

Nel renderer SVG il numero di punti non è più fisso per ogni forma. Il budget
totale resta equivalente a `24` punti medi per tracciato, ma viene distribuito
fra `16` e `48`: le sagome più complesse ricevono più campioni, quelle semplici
meno. Questo aumenta la fedeltà senza incrementare il carico complessivo del
ciclo RAF. Quando due fotogrammi hanno conteggi differenti, i punti vengono
ricampionati prima del morph per evitare salti o corrispondenze errate.

### Trasformazione percettiva

La sezione `transformation` governa la psichedelia prodotta dalle forme. Non
aggiunge un effetto sopra l'immagine: modifica direttamente geometrie, livelli,
copie persistenti, profondità e colore.

- `enabled`: abilita o disabilita l'intero sistema percettivo.
- `intensity`: quantità complessiva di trasformazione.
- `responseMs`: velocità con cui Brain assimila un cambiamento sonoro.
- `memoryMs`: durata della memoria visiva dopo il cambiamento.
- `organicDeformation`: deformazione fluida dei contorni.
- `duplication`: presenza degli sdoppiamenti.
- `persistence`: permanenza delle copie visive.
- `stratification`: quantità di livelli che partecipano alla profondità.
- `unstableSymmetry`: comparsa di riflessioni non perfettamente simmetriche.
- `perspective`: differenza prospettica fra i livelli; non applica uno zoom
  globale alla scena.
- `propagation`: ritardo con cui una trasformazione attraversa le forme.
- `dissolution`: attenuazione selettiva delle parti durante la disgregazione.
- `metamorphosis`: distanza dalla geometria originaria.
- `chromaticAlteration`: migrazione dei colori nella palette della storia.
- `disintegration`: passaggio progressivo da ordine a frammentazione.
- `maxEchoLayers`: numero massimo di copie persistenti, da `0` a `3`.

Lo strato percettivo deriva uno stato continuo da energia, distribuzione fra
bande, variazione spettrale, texture e memoria. L’impulso delle curve resta
invece phase-lock sul beat e sui transienti delle singole bande. Scene SVG
molto pesanti usano automaticamente un solo livello persistente;
`lowPowerMode` mantiene lo stesso limite.

### Didascalia del fotogramma attivo

Al centro del margine inferiore, separata dallo stato Brain sulla destra,
compare una riga trasparente con titolo e descrizione dell’immagine
effettivamente montata. Solo durante il quinto fotogramma la didascalia
esplicita `COLLEGAMENTO ASSOCIATIVO` e il tipo preciso (`EMOTIVO` oppure
`IMPLICITO`). Nei quattro fotogrammi narrativi normali mostra soltanto titolo
e descrizione. Usa dimensioni ridotte, non riceve input e non aggiunge un
pannello diagnostico invasivo.

Il file viene normalizzato per evitare valori che possano bloccare il
renderer. In caso di JSON non valido Brain usa i valori predefiniti e scrive
la causa nei log.

Nelle build pacchettizzate, `config/` viene copiato come risorsa esterna al codice
compilato. Non inserire password, token o altre credenziali in questa cartella.
