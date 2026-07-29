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
  tre livelli di generazione. Più passaggi richiedono più tempo.
- Ogni storia usa quattro fotogrammi. Due fotogrammi rapidi (`standard`) sono
  scelti casualmente fra il secondo, il terzo e il quarto; il primo non è mai
  rapido. Gli altri due usano `enhanced` durante il rendering live. Il log
  `[Brain][psichedel] profili qualità selezionati per la storia` mostra gli
  indici scelti (numerati da 1).

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
- `microMovement`: lenta evoluzione continua dei contorni anche senza
  transienti o battiti. `0.58` mantiene il movimento visibile ma discreto.
- `colorSpeedMultiplier`: velocità delle variazioni cromatiche.
- `patterns`: rotazione dei pattern ammessi. Valori disponibili:
  `marea`, `fioritura`, `corrente`, `spirale`. Si possono rimuovere quelli
  indesiderati o lasciarne uno solo.

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

Brain non collega direttamente un effetto a ogni colpo. Deriva uno stato
continuo da energia, distribuzione fra bande, variazione spettrale, texture,
transienti e continuità. Scene SVG molto pesanti usano automaticamente un solo
livello persistente; `lowPowerMode` mantiene lo stesso limite.

Il file viene normalizzato per evitare valori che possano bloccare il
renderer. In caso di JSON non valido Brain usa i valori predefiniti e scrive
la causa nei log.

Nelle build pacchettizzate, `config/` viene copiato come risorsa esterna al codice
compilato. Non inserire password, token o altre credenziali in questa cartella.
