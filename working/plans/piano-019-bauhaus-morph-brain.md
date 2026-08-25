# Piano di Lavoro: Bauhaus Morph — Traduzione Pittorica Brain

> **ID Piano**: `PIANO-019`  
> **Macrotask di Riferimento**: `MACRO-017`  
> **Data Creazione**: 2026-08-16  
> **Stato**: `V1 IMPLEMENTATA — VALIDAZIONE LIVE PENDENTE`  
> **Autore/Agente**: Codex

---

## 1. Obiettivo

Progettare `Bauhaus Morph`, un nuovo renderer Brain che parte dal raster reale
di Coscienza Onirica e lo ricostruisce progressivamente come pittura moderna:
masse, piani, campiture, linee, geometrie e spazio negativo derivano dalla
struttura sorgente. Il soggetto resta riconoscibile per posizione, proporzioni,
silhouette, fuoco e gerarchia tonale. Non è un filtro, un posterize o una
sovrapposizione di forme casuali.

La V1 deve entrare come sesto plugin nelle modalità manuale, automatica e
“Tutti per storia”, mantenere camera e quadro stabili, arrestarsi in silenzio e
degradare con budget esplicito in `lowPowerMode` e durante il denoising.

## 2. Architettura esistente riutilizzabile

### Contratto e regia

- `brainRendererPlugin.ts` fornisce raster, palette, energia/indice del frame,
  sorgenti `previous/current/next`, suggerimenti narrativi e accesso vettoriale.
- `brainRendererHost.ts` gestisce readiness, fallback, timeout, crossfade fra
  plugin, `resourcePressure`, flash e passthrough durante inferenza.
- `brainRendererRegistry.ts` è il solo punto di registrazione. L'ID proposto è
  `bauhaus-morph`, etichetta “Bauhaus Morph — pittorico”.
- `brainRendererSelector.ts` usa mazzi casuali. Aggiungendo il plugin al
  registry, esso entra automaticamente in manuale, rotazione e story-cycle;
  con sei renderer e quattro frame, ogni storia ne estrae quattro unici.
- `brainController.ts` offre la continuità fra immagini e `setTransition()` già
  quantizzato dal clock globale.

### Analisi e primitive

- `brainMaterialAnalysis.ts` è la base principale: luminanza, densità, Sobel,
  componenti connesse, palette, regioni, bounding box, centroidi, salienza,
  regione focale e matching fra immagini.
- `brainPsycho2dAnalysis.ts` aggiunge fuoco, regioni protette, contrasto e asse
  dominante. La sua griglia 4×3 è utile per la composizione, non sufficiente da
  sola per i piani pittorici.
- `brainMaterialMorphCanvas.ts` mostra il percorso corretto per cache debole
  per Blob/risoluzione, sorgenti multiple, maschere, pacing e cleanup.
- `brainPrint2dCanvas.ts` offre quantizzazione cromatica, grana e gate del
  redraw; `brainFilterPsicheCanvas.ts` offre palette derivate e buffer colore.
- `brainVectorMorphScene.ts` e la pipeline SNIC possono essere fallback o
  riferimento per contorni, ma la V1 non deve richiedere una seconda
  vettorializzazione IPC: sarebbe più lenta e duplicata rispetto alle masse
  già estraibili localmente.
- Le primitive Canvas 2D disponibili (`Path2D`, clip, compositing, alpha,
  `drawImage`) bastano per piani, ellissi, diagonali, triangoli, archi, linee e
  texture. Nessuna nuova dipendenza è necessaria.

### Audio e preset

Il metodo `update()` riceve già `low`, `lowMid`, `mid`, `high`, medie mobili,
transienti di banda, `beatPulse`, `beatPhase`, `kickEnvelope`, flash,
`motionProfile`, `sensitivity`, `softMode` e `lowPowerMode`. Il renderer userà
solo il clock globale e non introdurrà oscillatori temporali autonomi.

## 3. Estrazione dalla sorgente

Nuovo modulo puro proposto: `brainBauhausAnalysis.ts`.

Da un raster ridotto produce `BauhausField`:

- `MaterialField` riusato per masse e regioni connesse;
- regione focale e regione protetta;
- istogramma degli orientamenti Sobel per assi orizzontali, verticali e
  diagonali;
- 4–8 linee dominanti ottenute raggruppando campioni di bordo per orientamento
  e distanza, senza Hough completo;
- piani candidati ricavati da bounding box, silhouette e distribuzione interna
  delle regioni;
- spazio negativo ottenuto dalle celle a bassa densità e basso bordo che non
  intersecano il fuoco;
- palette ridotta di 5–7 colori: sorgente dominante, palette narrativa e
  neutri strutturali; primari Bauhaus solo se compatibili con la sorgente;
- contrasto, luminanza e asse compositivo;
- seed deterministico dall'identità del frame.

La V1 non tenta riconoscimento semantico di volto/edificio/paesaggio. La
riconoscibilità è preservata geometricamente: silhouette, centroide, area,
proporzioni, asse, fuoco, rapporti chiaro/scuro e colori dominanti.

## 4. Rappresentazione interna

`BauhausComposition` contiene:

- `sourceUnderlay`: raster stabile della sorgente;
- `planes`: massimo 12 `BauhausPlane`, ciascuno collegato a una regione reale;
- `lines`: massimo 18 segmenti/archi derivati dai bordi dominanti;
- `negativeSpaces`: massimo 4 campiture di respiro;
- `palette`: colori strutturali con ruolo `ground`, `mass`, `accent`, `line`;
- `focalPlaneId`: piano che conserva più a lungo il soggetto;
- `abstractionOrder`: ordine deterministico basato su salienza, dettaglio e
  distanza dal fuoco;
- `from/to` e matching delle regioni per il cambio immagine.

Ogni piano conserva due stati:

1. forma sorgente: maschera raster della regione;
2. forma costruita: rettangolo, ellisse, triangolo, poligono irregolare o
   fascia, scelti dalla geometria della regione e dall'asse dominante.

La scelta non è casuale: rapporto d'aspetto, compattezza, orientamento del
bordo, densità e posizione determinano la primitiva. Le irregolarità
pittoriche sono texture/micro-variazioni precomputate, non jitter nel RAF.

## 5. Morph progressivo V1

Il morph usa un accumulatore `abstractionProgress` 0–1 che avanza soltanto con
attività audio e delta della posizione musicale. Non è legato al tempo di
parete.

1. Il raster parte dominante; il piano geometrico è quasi trasparente.
2. Le regioni meno focali si semplificano per prime, con stagger deterministico.
3. Ogni maschera raster perde dettaglio mentre la propria primitiva geometrica
   acquista opacità e colore strutturale.
4. I bordi principali diventano segmenti o archi; `mid` ne articola la quantità.
5. Lo spazio negativo si chiarisce senza coprire la regione focale.
6. La componente pittorica aggiunge grana, bordo imperfetto e trasparenza
   precomputati.
7. Alla massima astrazione il raster resta al 16–24% e la regione focale al
   30–38%, così la memoria della sorgente non scompare.

Il progresso non è lineare: i piani hanno curve e soglie diverse. Il renderer
non trasforma mai il canvas intero; applica variazioni soltanto ai singoli
piani nel loro sistema locale.

## 6. Transizione fra immagini

Le sorgenti `previous/current/next` vengono analizzate con cache condivisa.
`matchMaterialRegions()` è riusato come base, esteso con compatibilità di asse
e tipo geometrico.

- In `enter`, la composizione precedente si riconfigura verso quella corrente:
  piani compatibili interpolano centro, dimensioni, colore e primitive; piani
  senza partner perdono densità; nuovi piani emergono dalle regioni reali.
- In `exit`, la composizione corrente prepara la destinazione `next` con la
  stessa grammatica.
- Il fuoco sorgente resta leggibile fino al 60% del passaggio; quello nuovo
  emerge prima che il vecchio scompaia.
- Linee e assi si sostituiscono per gruppi, non con tagli.
- Se la controparte non è pronta, il plugin mantiene il proprio stato e lascia
  al crossfade del Renderer Host la continuità, evitando nero o salto.

## 7. Mapping audio-visivo

| Segnale | Ruolo V1 |
|---|---|
| `low` | peso e intensità delle masse maggiori; espansione locale massima 1,8% |
| `lowMid` | avanzamento della semplificazione, relazione e deformazione locale dei piani |
| `mid` | comparsa di linee, suddivisioni e ritmo geometrico |
| `high` | grana, piccoli accenti e dettagli di bordo, mai masse principali |
| `beatPulse` / `kickEnvelope` | breve contrasto locale, evidenza di 1–3 piani e piccolo incremento di astrazione |
| `beatPhase` | continuità delle micro-trasformazioni interne, attiva solo con energia |
| flash | accento locale su piani/linee, con decay curvo e senza pieno quadro |

Profili:

- `dub`: piani pesanti, evoluzione lenta, trasparenze e release lunga;
- `techno`: griglia/segmenti più leggibili, beat deciso ma clampato;
- `ambient`: forme morbide, palette lirica, alta continuità e pochi dettagli.

`softMode` riduce contrasto e rigidità dei bordi; `sensitivity` scala i drive
prima dei clamp.

## 8. Silenzio

Quando il clock globale è inattivo:

- `abstractionProgress` non avanza;
- fase, geometrie, linee e texture mantengono l'ultimo stato;
- nessun jitter o rumore viene rigenerato;
- dopo l'ultimo assestamento la firma resta invariata e non si ridisegna;
- immagine e composizione restano visibili.

Una transizione di immagine già richiesta resta governata dalla progressione
esterna quantizzata; non viene simulata da un timer interno.

## 9. Motore grafico e budget

### Scelta V1

Canvas 2D con buffer precomputati. WebGL/WebGPU e shader vengono esclusi dalla
V1 perché l'inferenza ONNX occupa già WebGPU e i freeze residui nascono dalla
contesa. Il costo dominante deve restare preparazione una tantum, non lavoro
per-pixel nel RAF.

| Budget | Normale | `lowPowerMode` | Pressione UNet |
|---|---:|---:|---:|
| Buffer | 400×225 | 280×158 | passthrough host |
| Piani | 12 | 7 | plugin a 3–5 FPS |
| Linee/archi | 18 | 9 | massimo 6 |
| Spazi negativi | 4 | 2 | 1 |
| Texture | 2 precompute | 1 | nessun aggiornamento |
| Target | 24 FPS | 15 FPS | 3–5 FPS / sospeso |

Cache `WeakMap<Blob, Map<resolution, Promise<BauhausArtwork>>>`, massimo cinque
canvas per artwork e resize a 1×1 in `destroy()`. Nessun filtro Canvas costoso
nel frame loop.

## 10. Colli di bottiglia

| Rischio | Mitigazione |
|---|---|
| `getImageData` e analisi iniziale | una volta a bassa risoluzione, readiness e metriche |
| doppia preparazione enter/exit | cache debole per Blob e risoluzione |
| maschere per regione | precompute; massimo 12/7 regioni |
| geometria decorativa scollegata | ogni primitiva conserva `sourceRegionId` e test di derivazione |
| perdita del soggetto | raster minimo, focal protection e limite di astrazione |
| palette stereotipata | sorgente prima, palette narrativa seconda, primari solo compatibili |
| pressione WebGPU | nessuno shader V1, passthrough e pacing host esistenti |
| scatti sul beat | latch del beat prima del frame gate; niente salti di progresso |
| memoria crescente | bitmap chiuse, buffer ridimensionati e cache debole |

## 11. V1, V2 e V3

### V1 implementabile

- analisi pura di masse, assi, linee, spazio negativo e palette;
- 6–12 piani legati alle regioni reali;
- morph raster → piani con focal protection;
- Canvas 2D, texture pittoriche precompute;
- mapping completo audio/profili/flash;
- matching `previous/current/next`;
- low power, pressure, readiness, failure e cleanup;
- integrazione `bauhaus-morph` in tipi, settings, UI, registry e test.

### V2, solo dopo profiling live

- curve/archi più ricchi tramite contour tracing locale;
- classificazione adattiva della direzione estetica geometrica/pittorica/
  lirica/grafica dai dati dell'immagine;
- matching bipartito migliore fra piani e continuità cromatica più sofisticata;
- worker CPU per analisi se la preparazione supera il budget misurato.

### V3 sperimentale

- shader WebGL/WebGPU per texture e morph di maschere soltanto se isolabile
  dalla sessione ONNX;
- semantica vision esplicita per volti/architetture, senza sostituire l'analisi
  visuale locale;
- persistenza di una grammatica pittorica fra più storie.

V2 e V3 non devono entrare nella V1 senza dati live che ne giustifichino costo
e complessità.

## 12. Verifica filosofia visiva

- [x] **Camera**: nessuna trasformazione globale.
- [x] **Materia**: raster, regioni, bordi, palette e maschere restano la fonte.
- [x] **Silenzio**: progressione e geometria ferme.
- [x] **Beatmatch**: impulso, fase e bande hanno funzioni distinte.
- [x] **Transizione**: matching e morph continui, fallback host.
- [x] **Alternanza**: nuovo plugin nel mazzo esistente, nessun nuovo linguaggio
  per l'opzione 80/20.
- [x] **Costo**: buffer riusati, budget e degradazione espliciti.

## 13. Checklist di implementazione

### Fase 1 — Analisi

- [x] Analizzare architettura, primitive, segnali, transizioni e budget.
- [x] Definire rappresentazione, morph, riconoscibilità e V1/V2/V3.

### Fase 2 — Nucleo puro

- [x] Implementare `brainBauhausAnalysis.ts` e test.
- [x] Implementare costruzione deterministica di piani, linee e palette.
- [x] Testare limiti, derivazione dalla sorgente e focal protection.

### Fase 3 — Renderer

- [x] Implementare `brainBauhausMorphCanvas.ts`.
- [x] Collegare ritmo, profili, flash, silenzio e transizione multi-immagine.
- [x] Collegare low power, pressure, readiness, fallback, metriche e cleanup.

### Fase 4 — Integrazione e verifica

- [x] Aggiungere ID, settings, UI, registry e rotazioni.
- [x] Eseguire test, typecheck, lint mirato, build e diff check.
- [ ] Verificare artisticamente fullscreen e in prova prolungata.

## 15. Esito implementazione V1

- Analisi e morph implementati nei moduli `brainBauhausAnalysis.ts` e
  `brainBauhausMorphCanvas.ts`.
- Aggiunto fallback raster visibile durante la preparazione asincrona.
- Registrato come sesto renderer Brain con ID `bauhaus-morph`.
- Suite completa: 48 file / 277 test verdi; typecheck, lint mirato e
  `git diff --check` riusciti.
- Build Vite/Electron e ZIP macOS riusciti; il target DMG incontra il noto
  errore esterno `hdiutil` dopo il packaging.
- Resta la verifica artistica e prestazionale fullscreen.

## 16. Esito diagnosi live prestazioni e ritmo

- Preparazione una tantum: p50 75,9 ms, massimo 100,4 ms.
- Senza inferenza l'Output resta stabile a 120 Hz, ma Bauhaus aggiorna la
  canvas a circa 20 fps con p95 variabile fra 57 e 117 ms, sotto il target di
  24 fps.
- Durante denoising il passthrough costa solo 0,1–0,2 ms; i gap fino a circa
  0,56 s coincidono invece con la contesa UNet e coinvolgono l'intero Output.
- Il mapping distingue tutte le bande, ma `low` e `lowMid` cambiano ampiezza
  geometrica senza smoothing locale; `mid` e `high` agiscono soprattutto su
  tratto e grana. La firma quantizzata del frame rende visibili gli scalini.
- La temperatura reale non è presente nei log e il sensore di sistema non è
  accessibile dalla sessione: è confermato un rischio di carico sostenuto, non
  un valore termico misurato.

## 17. Correzione fluidità e costo

- Aggiunto smoothing musicale distinto: massa lenta, superficie intermedia,
  linee più pronte, dettaglio rapido e kick con attacco breve/release curvo.
- Rimossa la quantizzazione delle ampiezze dalla decisione di frame Bauhaus;
  durante audio attivo il moto evolve sul pacing stabile del canvas.
- `mid` curva localmente le linee in fase; `high` muove soltanto tre fasce
  della grana con micro-disallineamenti, senza muovere quadro o soggetto.
- Matching dei piani memorizzato per coppia di immagini e draw dell'underlay
  saltato quando la sua opacità è nulla.
- Durante passthrough pienamente attivo il plugin invisibile è completamente
  sospeso anziché continuare a 5 fps.
- Le metriche distinguono ora intervallo dei frame e costo reale `renderMs`.
- Validazione: 49 file / 280 test, typecheck, lint mirato e build Vite/Electron
  riusciti.

## 18. Correzione aderenza all'immagine

- Rimossa la scelta decorativa di primitive, colori ciclici e rotazioni
  alternate che produceva piani scollegati dal raster.
- Ogni piano usa ora una sagoma convessa semplificata di dieci punti, tutti
  campionati dai pixel realmente appartenenti alla regione sorgente.
- Colore del piano ricavato dalla media cromatica della regione; palette
  narrativa mantenuta soltanto per accenti secondari.
- Rotazione e linea strutturale seguono l'asse principale misurato mediante i
  momenti della regione, non l'asse globale assegnato arbitrariamente.
- I quattro piani più salienti conservano una traccia raster ritagliata dentro
  la propria sagoma; in low power il limite scende a due.
- Il morph interpola sagome con cardinalità costante vertice per vertice.
- Test aggiunto: colore reale e ogni vertice della sagoma devono risalire alla
  stessa etichetta regionale. Suite: 49 file / 281 test; typecheck, lint,
  diff-check e build Vite/Electron riusciti.

## 14. Validation Plan

- Test puri: piani legati a regioni, assi/linee, palette, matching e silenzio.
- Test renderer: readiness, frame gate, low power, pressure, transizione e
  cleanup.
- Suite completa, `pnpm typecheck`, lint mirato, `pnpm build`,
  `git diff --check`.
- Live: volti, figure, architetture e paesaggi; dub/techno/ambient; silenzio,
  flash, denoising, story-cycle e alternanza 80/20.
