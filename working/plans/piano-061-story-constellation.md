# Piano di Lavoro: STORY CONSTELLATION

> **ID Piano**: `PIANO-061`  
> **Macrotask di Riferimento**: `MACRO-046`  
> **Data Creazione**: 2026-11-06  
> **Stato**: `IN_PROGRESS` — fasi 1–4 implementate, collaudo a schermo da eseguire  
> **Branch**: `feature/story-constellation`  
> **Autore/Agente**: Agente AI / Capo Supremo  

---

## 1. 🎯 Obiettivo del Piano

Realizzare lo spazio tridimensionale di nodi-storia attraverso cui Brain
naviga fra una storia e l'altra, secondo il brief
[`brief-story-constellation-2026-11-06.md`](../../team/briefs/brief-story-constellation-2026-11-06.md).
Baseline tecnica obbligatoria: esempio ufficiale Three.js
`webgl_buffergeometry_drawrange` (brief §0).

Disposizioni del Capo Supremo del 2026-11-06:

- Three.js accettato («da oggi si parte con il 3d»);
- deroga Camera per STORY CONSTELLATION accettata (scritta in `agents.md`);
- prima richiesta: colori e pulsazioni della costellazione a ritmo;
- la costellazione deve esserci anche all'avvio, quando non ci sono raster;
- i giri durano in modo variabile 5, 15 o 25 secondi, scelti a caso.

---

## 2. 📋 Prerequisiti e Contesto

- **File / Moduli Coinvolti**:
  - `src/renderer/output/brain/brainStoryConstellation.ts` (logica pura)
  - `src/renderer/output/brain/brainStoryConstellationStage.ts` (Three.js)
  - `src/renderer/output/brain/brainController.ts` (confine di storia, avvio)
  - `src/shared/types.ts`, `src/shared/defaults.ts`, `src/main/settings.ts`,
    `src/renderer/control/components/VisualControls.tsx`
    (`storyConstellationEnabled`, default spento)
  - `package.json` (`three`, `@types/three`)
- **Audit preventivo `working/DEPRECATED.md`**:
  - `DEP-001 — NON COINVOLTO`: l'interludio 80/20 resta un ramo a parte del
    confine di storia; la costellazione si inserisce dopo ANIMATRONIX e
    prima di `completeStoryBoundary`, non tocca l'alternanza.
  - `DEP-002 — NON COINVOLTO`: nessuna modifica alla generazione delle
    storie.

---

## 3. ⚠️ Regole e Vincoli di Sviluppo (da `agents.md`)

- [x] Camera: deroga STORY CONSTELLATION registrata in `agents.md`. In
  fase 1 la camera resta comunque ferma; il gruppo non ruota (brief §16).
- [x] Silenzio: nessun impulso, la coda di impulsi si svuota, la deriva si
  quieta in ~3 s, il metabolismo cromatico raggiunto si conserva.
- [x] Beatmatch: il beat è un evento (`beat` + nuovo `beatIndex`, ampiezza
  da `beatPulse`/`kickEnvelope`), ATTACK → DECAY → STATO, nessuna
  sinusoide. `high` è una scintilla su un solo nodo, senza propagazione.
- [x] Transizione: in fase 1 entrata/uscita con dissolvenza dell'overlay
  (come ANIMATRONIX). **Provvisorio**: la grammatica nodo → storia (E3) e
  storia → nodo sono fasi 3–4.
- [x] Costo: 48 nodi, confronti di distanza diretti come la demo,
  `setDrawRange` sulle linee. `lowPowerMode`: DPR 1, niente antialias,
  niente alone, massimo 2 connessioni per nodo.
- [x] Autonomia renderer: nessuna analisi importata da altri renderer.
- [x] Nessun HUD, testo o etichetta.

---

## 4. 🛠️ Fasi di Implementazione e Checklist Task

### Fase 1: Costellazione, colori e pulse a ritmo — FATTA

- [x] 1.1 Three.js e tipi installati.
- [x] 1.2 Logica pura: 48 nodi con identità percettiva (tinta, saturazione,
  luminosità), deriva individuale con richiamo morbido (nessuna scatola),
  connessioni per prossimità `1 - d/minDistance` con `maxConnections`.
- [x] 1.3 Pulse gerarchico: il beat entra nel nodo fuoco e attraversa gli
  archi (fuoco 1, primo salto 0,5, secondo 0,24, terzo 0,11, periferia
  0,06), 85 ms per salto. Decadimento per `motionProfile` (techno 320 ms,
  dub 520 ms, ambient 820 ms).
- [x] 1.4 Colore come metabolismo (brief §22): il regime bio-percettivo
  muove coesione cromatica verso il fuoco, pressione cromatica, contrazione
  o dispersione, portata e leggibilità dei legami, sensibilità al beat;
  costante di tempo 4 s. Il pulse schiarisce, satura e sposta brevemente la
  tinta del nodo e accende i suoi legami. Nessuna banda ha un colore.
  `brainColorState.ts` è stato dismesso il 2026-10-11: la «grammatica
  Color State» citata dal brief è applicata qui come vocabolario
  (pressione cromatica, contrasto, continuità, accento), non come modulo.
- [x] 1.5 Memoria fuori istanza: la rete non si resetta; il nodo della
  storia conclusa riceve un residuo (luminosità, saturazione, alone).
- [x] 1.6 Stage Three.js: `Points` + `LineSegments` su `BufferGeometry`
  dinamiche, `AdditiveBlending`, `setDrawRange`. Dimensione per nodo con
  attributo `nodeScale` iniettato nel `PointsMaterial` standard (brief §34:
  il materiale nativo non ha dimensione per vertice).
- [x] 1.7 Ciclo: STORIA → ANIMATRONIX (se attivo) → STORY CONSTELLATION →
  confine di storia. All'avvio, senza storie, giri continui; la prima
  storia pronta parte alla fine del giro in corso.
- [x] 1.8 Durata di un giro scelta a caso fra 5, 15 e 25 s (tempo reale).
- [x] 1.9 Interruttore `storyConstellationEnabled` nel pannello, default
  spento.
- [x] 1.10 Test: `brainStoryConstellation.test.ts` (14).

### Fase 2–4: navigazione, ingresso e uscita — FATTE (2026-11-06)

Disposizioni del Capo Supremo: «deve navigare dentro la struttura,
avvicinarsi tanto ad un nodo fino ad entrare in una storia e scorrerla
tutta»; «come ci è entrato ci esce e va a cercare altre storie in altri
nodi».

- [x] Camera autonoma su `CatmullRomCurve3` di Three.js: ogni giro (5/15/25 s)
  sfiora 1, 2 o 3 nodi, con inseguimento morbido della posizione e dello
  sguardo. In silenzio perde impulso (30% della velocità), non si ferma.
  Nessun `OrbitControls`.
- [x] Target: la storia pronta (prima storia all'avvio, `nextProduction` fra
  le storie) diventa il nodo target; se arriva a metà giro la camera devia
  nel tempo che resta (minimo 4 s). Lo sguardo converge sul target, che
  smette di derivare (brief §36). Senza storia pronta la camera continua a
  cercare in altri nodi.
- [x] Ingresso (Test E3, brief §11–12): NODO → MASSA (il nodo prende il
  colore medio della prima immagine e il suo alone si espande) → CAMPO (il
  fondo prende quel colore, la rete si ritira) → RASTER (la prima immagine
  emerge per soglia di luminanza, dalle luci alle ombre, su tutto il
  quadro). Nessun foro, nessun cerchio. Poi la storia scorre tutta.
- [x] Uscita: la stessa soglia percorsa all'indietro a partire dall'ultima
  immagine della storia conclusa (le ombre si sciolgono per prime, il campo
  torna rete, la camera arretra dal nodo, che conserva il residuo di
  memoria). Poi nuovi giri.
- [x] I nodi sfiorati dalla camera si sciolgono invece di accecare; nebbia
  Three.js per la profondità.
- [x] Con la costellazione attiva, se la storia successiva non è pronta al
  confine, si resta nella costellazione invece di passare alla
  Riattivazione: si entra soltanto in una storia che esiste.
- [x] Mappatura storia ↔ nodo ancora per hash dell'id; mai rientrare nel
  nodo da cui si è appena usciti.
- [x] Test: 19 in `brainStoryConstellation.test.ts`.

### Revisione navigazione e colore — FATTA (2026-11-06)

Disposizione del Capo Supremo: navigazione veloce, fluida, senza scatti, a
velocità costante e leggermente più veloce; partenza da dentro la
costellazione; colore di nodi e linee che cambia al beat; qualità di
rendering ridotta.

- [x] Niente più curve ricalcolate a ogni giro (causa degli scatti: cambio
  di tangente al confine del giro, deviazione a metà giro, ritardo di
  inseguimento, velocità legata all'attività). La camera avanza a
  `CRUISE_SPEED` = 150 unità/s costanti (prima ~80–120 e variabile) e
  sterza al massimo di `CRUISE_TURN_RATE` = 0,75 rad/s verso il prossimo
  nodo da sfiorare, scelto davanti a sé. Verso il target 2,2 rad/s.
- [x] La velocità non dipende più dall'audio né dal silenzio (decisione
  esplicita del Capo Supremo: velocità costante).
- [x] Soglia d'ingresso e d'uscita legata alla distanza dal nodo (520
  unità ≈ 3,5 s): si entra attraversando il nodo, si esce allo stesso modo
  proseguendo verso l'interno della rete.
- [x] Avvio dal centro della costellazione, già in movimento.
- [x] Colore al beat: ogni impulso ruota la tinta del nodo raggiunto
  (`BEAT_HUE_STEP` = 0,05 sul fuoco, meno sui vicini, verso fisso per nodo);
  le linee prendono il colore dei nodi che congiungono. Nessun cambio in
  silenzio.
- [x] Qualità: pixel ratio 0,75 (0,5 in `lowPowerMode`), niente antialias,
  alone più piccolo; nessuna allocazione per frame nel disegno delle linee,
  adiacenza calcolata solo al beat.
- [x] Simulazione numerica 3 min a 60 fps: velocità costante, virata
  massima 0,72°/frame, un nodo sfiorato ogni ~2,4 s, raggio massimo 787
  (volume 560: nelle virate la camera esce poco dal bordo), target
  raggiunto in 5,1 s.

### Scatti dal vivo — diagnosi e correzione (2026-11-06)

- Fatto verificato (log `session-2026-11-06-17-06-07.txt`, 16:06–16:07,
  avvio): schermo a 120 Hz; durante Qwen e il denoising SD l'output ha
  855–911 fotogrammi su 1200 attesi in 10 s, fermi massimi di 100–391 ms.
  Gli scatti sono la GPU occupata dalla generazione, non il moto.
- [x] Passo massimo per frame 34 ms: dopo un fermo il moto riprende senza
  balzo in avanti.
- [x] Con una storia già pronta (prima storia all'avvio, `nextProduction`
  fra le storie) la costellazione tiene la GPU: `setInferenceHold` e
  `generateNext` sospeso finché non si entra nel nodo (stesso meccanismo di
  ANIMATRONIX).
- Secondo log (16:09, avvio): stessi fermi durante Qwen e SD (800–1000
  fotogrammi su 1200, max 216 ms); senza generazione 1200/1200, max 9 ms.
- [x] Mentre la GPU genera (SD, scheduler termico, Qwen via
  `BrainAiClient.isBusy()`) la camera frena fino a fermarsi (τ 450 ms) e
  riparte alla velocità costante quando la GPU è libera (τ 900 ms); anche
  deriva dei nodi, soglia e timer del giro si fermano. Il beat continua a
  colorare e pulsare i nodi.
- [x] Scatti nella scena Three.js stessa (indipendenti dalla GPU), tolti:
  linee che comparivano/sparivano per il tetto di connessioni per nodo
  (ora tutti i legami sotto `minDistance`, che nascono e muoiono a
  intensità zero; in `lowPowerMode` `minDistance` × 0,8); nodi vicini alla
  camera che esplodevano di dimensione (dissolvenza anticipata: punto
  70–300, alone 160–520 unità); ribaltamento di `lookAt` vicino alla
  verticale (inclinazione limitata a |y| ≤ 0,42); rete che cambiava
  direzione di colpo a ogni cambio di fuoco (contrazione ora verso il
  centro); stop-and-go del freno GPU (isteresi 1,5 s). Simulazione 3 min a
  120 Hz: rotazione visuale ≤ 0,36°/frame, variazione ≤ 0,011°/frame, zero
  legami comparsi o spariti di colpo.

### Scatti: misura sullo stage vero (2026-11-06)

- Stage Three.js da solo in una finestra Electron di prova (scratchpad, non
  nel progetto), 20 s: 2401 frame a 120 Hz, nessun frame lungo, 0,4–0,7 ms
  di calcolo per frame. Il ritmo era perfetto.
- Le istantanee mostravano la causa: la camera guardava il vuoto (0–2 nodi
  inquadrati) e usciva dalla rete fino a 2,3 volte il raggio. I pochi nodi
  comparivano e sfrecciavano via: letto come scatto.
- [x] 192 nodi nello stesso volume, `minDistance` 170; contenimento dal 25%
  del raggio con virata più decisa verso il bordo (`cruiseTurnRate`);
  sguardo = direzione di marcia smorzata (provato e scartato: sguardo verso
  il centro, ruotava di colpo passando vicino al centro); visuale 70°;
  risoluzione piena e antialias (a 0,75 senza antialias linee e punti
  avanzavano a gradini); dissolvenza vicino alla camera 30–160 / 80–320.
- [x] Simulazione 5 min a 120 Hz: mediana 19 nodi inquadrati (prima 1),
  < 3 nodi nel 2,6% dei frame (prima 70%), raggio massimo 0,65,
  variazione della rotazione ≤ 0,044°/frame. Stage vero: 120 Hz senza frame
  lunghi, istantanee piene di nodi.

### Camera ferma e glitch sui blocchi (2026-11-06)

- Fatto verificato (log `session-2026-11-06-18-12-49.txt`, 17:15:55 →):
  dopo l'uscita da una storia tre richieste Qwen ravvicinate e poi il
  denoising tenevano acceso il freno GPU per tutto il tempo: camera ferma e
  soglia d'uscita bloccata a metà. Freno rimosso del tutto (anche
  `BrainAiClient.isBusy`): la camera si muove sempre a velocità costante.
- [x] Glitch sui blocchi (disp. Capo Supremo: «se nella navigazione vedi
  che blocchi, gliccia»): se fra due frame passano più di 45 ms la scena
  viene ridisegnata per un attimo a 7 fasce orizzontali spostate (scissor +
  viewport di Three.js, nessuno shader), poi si ricompone (τ 220 ms). Mai
  senza un blocco reale. Verificato nella finestra di prova con un blocco
  forzato di 200 ms: fotogramma catturato con le fasce spostate.

### Ingresso enfatizzato, vecchia TV, flusso dei neuroni (2026-11-06)

Disposizioni del Capo Supremo: glitch con effetto vecchia TV e interferenza
sui neuroni, mai forzato; ingresso nel neurone «di brutto», zoom al
massimo, ingresso enfatizzato; ingresso in un vecchio neurone per la
Riattivazione quando non ci sono storie pronte; appena una storia nuova ha
due immagini pronte si esce, si entra nel suo nodo e si resta fino a storia
completa, poi ANIMATRONIX.

- [x] Vecchia TV sui blocchi reali (stesso innesco del glitch a fasce):
  righe di scansione, neve, banda che scorre, strappi (`ShaderMaterial` su
  un quad agganciato alla camera); i neuroni sfarfallano e sobbalzano, i
  legami tremolano.
- [x] Ingresso: velocità fino a 4×, visuale 70° → 6°, sguardo dritto sul
  nodo; il nodo d'arrivo pulsa al massimo, i suoi legami convergono e si
  accendono, lampo nel colore della storia all'attraversamento (t ≈ 0,72).
  Uscita sulla stessa curva al contrario.
- [x] Corretti due difetti trovati nella finestra di prova: a 4× la camera
  girava attorno al nodo (virata ora proporzionale alla velocità e più
  stretta vicino al nodo); tolleranza d'arrivo diversa fra moto e soglia
  (la storia non partiva mai). Ingresso verificato.
- [x] Flusso: giro finito senza storia pronta → ingresso nel vecchio
  neurone (nodo della storia appena vissuta) → Riattivazione o ricircolo;
  la generazione continua dentro il vecchio neurone (prima la Riattivazione
  la sospendeva). Storia nuova completa o con ≥ 2 immagini pronte
  (`progressiveCandidate`) → uscita dal vecchio neurone dall'immagine a
  schermo → nodo nuovo → la storia parte. Se la storia è ancora in
  generazione a fine timeline si ricomincia dal suo primo fotogramma fino a
  completamento; poi ANIMATRONIX (se attivo) e uscita nella costellazione.
- [ ] ANIMATRONIX più animato con 3 nuovi morphing psichedelici: da fare.

### Verifica

- [x] `pnpm typecheck`, `pnpm lint`, `pnpm exec vitest run` (855 verdi),
  `vite build`.
- [ ] Collaudo a schermo: Test A (baseline), Test B (B1/B2/B3 — B2 è
  controllo negativo, non implementato come modalità: da decidere se
  serve), Test C (colore senza effetto visualizer RGB).

---

## 5. Note aperte

- Durata: interpretata come scelta casuale fra i tre valori 5/15/25 s. Se
  il Capo Supremo intendeva un valore qualsiasi nell'intervallo 5–25 s, è
  una riga in `pickConstellationDurationMs`.
- Il raster della soglia usa un piccolo `ShaderMaterial` (soglia di
  luminanza con bordo morbido): `alphaTest` del materiale standard dà solo
  un taglio netto e lascia trasparenti le ombre a fine soglia.
- Il passaggio allo stile del renderer dopo l'ingresso è ancora una
  dissolvenza di 1,2 s dal raster puro al renderer.
- La generazione delle storie continua durante la costellazione (a
  differenza di ANIMATRONIX, che la sospende): con 48 nodi il costo GPU è
  trascurabile e la rete copre l'attesa.
