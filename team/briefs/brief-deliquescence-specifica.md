# DELIQUESCENCE — Specifica unica (Item 5)

Consolidamento di: direzione artistica Visual, vincoli Audio, analisi di
fattibilità Ingegneria, e le decisioni prese nella revisione Item 1–4 +
misura di latenza. È il documento normativo da cui parte l'implementazione
dell'Item 5. Non introduce nulla di nuovo rispetto ai brief firmati: li
unifica e li aggancia allo stato attuale del modello.

---

## 0. Contesto — cosa è cambiato prima di arrivare qui

La premessa di DELIQUESCENCE (uno stato `respiro-profondo` che viene
riconosciuto in fretta e **si sostiene a lungo**) non esisteva quando la
direzione artistica fu scritta. Ora sì:

- **`reference` corretto (Item 1)**: prima non rappresentava mai il presente
  — nasceva corto verso il mondo vecchio e non convergeva più (10 min su un
  mondo immobile → 0.168 di distanza). Corretto con un gate di convergenza
  di `mid` alla promozione. `change` ora misura davvero la distanza dal
  presente.
- **Livello ancorato alla configurazione (Item 2)**: `alto`/`profondo` si
  valuta solo alla promozione di una stasi, contro la mediana; la deriva
  della mediana **non può più, da sola, causare un cambio di stato** — per
  costruzione non esiste un `reason` `median-drift`. Una stasi lunga non si
  autoannulla.
- **Bootstrap gate (Item 2)**: nei primi ~37–45 s (`reference` non ancora
  affidabile) i due respiri non sono dichiarabili — solo passaggi o
  `unresolved` (`BOOTSTRAP`). Distinto da `LIVELLO INDETERMINATO` (assestato
  ma senza contrasto).
- **Livello ereditato dopo una transizione atterrata (gate latenza §2)**:
  `respiro-profondo` non attende più i ~40 s di ri-promozione di `reference`
  dopo una decompressione. Numeri: `decompression` immediato (0.1–0.7 s);
  `respiro-profondo` in **2 s** (silenzio vero) / **5–11 s** (letto residuo
  o dissolvenza lunga). Era 38–43 s.
- **Latenza `perceptualPressure`**: non è mai stata il collo di bottiglia —
  su un calo netto è a terra in ~1.5–2.7 s. L'inviluppo aggiunge < 1 s.

**Conseguenza per DELIQUESCENCE**: lo stato per cui è costruito viene
raggiunto in secondi e regge nel tempo. La durata lunga (§ sotto) è ora un
requisito realizzabile, non un'ipotesi.

**Dipendenza esplicita**: DELIQUESCENCE entra in scena **dopo** il collaudo
dal vivo dei quattro stati + bootstrap con log a 1 Hz. Prima di quel
collaudo si costruisce, non si attiva nel pool.

---

## 1. Principio artistico (Direzione Visual — invariato)

> DELIQUESCENCE mantiene il corpo visibile mentre ne dissolve
> progressivamente l'integrità. La musica ne modifica bordi, consistenza,
> anatomia e materia. Il soggetto arriva fino al limite dell'informe senza
> oltrepassare il punto in cui smetterebbe di essere riconoscibile. Quando
> il suono cessa, anche la metamorfosi si sospende.

Matrice: Surrealismo oscuro — metamorfosi corporea lenta verso l'informe.
Non deformazione di un corpo: un corpo che smette di poter mantenere il
proprio bordo. Non deriva la propria identità da geometria, frammentazione,
glitch, spirali o compositing.

### 1bis. Gerarchia del bordo — CORREZIONE VISUAL VINCOLANTE (2026-08-31)

> Il primo giro d'implementazione ha prodotto **"Material-Morph scuro"**: il
> renderer partiva dalla materia interna e la silhouette restava intatta. È
> l'errore da non ripetere. Il fenomeno dominante NON è la materia: è **il
> contorno che perde la capacità di contenere la figura.**

**Gerarchia normativa dei fenomeni** (prima era di fatto invertita):

1. **Collasso del bordo** — il contorno cede, si incurva, cola, collassa
   verso l'interno, si espande verso l'esterno, si fonde con bordi vicini,
   crea strozzature, perde segmenti, ricompare deformato, **trascina con sé
   la figura**.
2. **Deformazione globale della figura** — il volume si deforma *seguendo*
   il collasso del bordo.
3. **Perdita anatomica/geometrica** — un volto perde la mascella, una
   guancia scivola nel collo; un corpo: la spalla si liquefa nel torso, il
   fianco collassa; un oggetto perde **geometria** (una sedia smette di
   avere gambe nette, un edificio perde gli spigoli, un'auto diventa massa
   scura con pochi elementi riconoscibili). Non solo colore/superficie.
4. **Fusione figura-sfondo** — il confine **cede fisicamente**, non sfuma:
   zone dello sfondo entrano nella figura, zone della figura invadono lo
   sfondo; i bordi cessano progressivamente di coincidere con quelli
   originali. Deve diventare difficile dire "questo è ancora corpo o è già
   ambiente?".
5. **Colore e materia** — accompagnano il collasso, non lo sostituiscono.
   Il colore ottenuto (rampa nero organico) va bene.

**Traiettoria**: `oggetto riconoscibile → silhouette instabile → bordo che
collassa → volume che si deforma → oggetto che perde anatomia → massa ancora
riconducibile all'originale`. Mai `oggetto riconoscibile + texture organica
sopra`.

**Attrattori di riconoscimento** (il §1.1 non impone silhouette intatta):
il riconoscimento sopravvive attraverso pochi attrattori — un occhio, una
bocca, una mano, un profilo, una finestra, una ruota, un frammento della
forma originaria — mentre il resto **collassa pesantemente**.

**Colore che cola (disposizione del Capo Supremo, 2026-08-31)**: i colori
degli strati più esterni **colano verso il basso**, come sciogliendosi.
Riguarda **solo il colore, non la geometria**: la forma continua a cedere
senza direzione privilegiata (gravità psichica); il pigmento degli strati
esterni obbedisce alla **gravità reale**. Il colare non deve diventare
accasciamento verticale della figura (che resta escluso). Distinzione da
tenere: geometria in gravità psichica, colore in gravità reale.

**Non è Material-Morph.** Material-Morph: la figura resta strutturalmente
leggibile mentre cambia la sua materia. DELIQUESCENCE: è la struttura stessa
che non riesce più a restare integra. *Material-Morph trasforma ciò di cui
sembra fatta la figura; DELIQUESCENCE trasforma la possibilità stessa della
figura di mantenere una forma.*

### Movimento — cedimenti, non "liquify che ondeggia"

Lunghi periodi in cui il bordo sembra resistere, poi una zona **perde
sostegno**: una guancia cade, un angolo rientra, un profilo si apre, due
forme si fondono, un bordo viene risucchiato. Poi la forma continua a vivere
nella **nuova** configurazione — **non torna elasticamente a posto. Ogni
collasso lascia una conseguenza** (accumulo nello store fuori istanza).

Il beat produce **micro-cedimenti locali**, non pulsazione globale. La
musica profonda lavora sulla deformazione lunga: compressione, scivolamento,
collasso, fusione, lenta ricomposizione. La figura deve sembrare sottoposta
a una **pressione invisibile**.

### I due limiti invalicabili

1. **Mai cancellazione completa del raster.** Il raster resta sempre come
   substrato. La perdita di forma avviene sopra — erosione della maschera,
   scurimento palette, displacement — mai per sostituzione. Floor:
   raster riconoscibile, bordo che cede, anatomia che collassa, massa che
   respira, colore oscuro vivo. **Coincide col Check Materia** di
   `agents.md`, ed è anche il nucleo minimo scalabile (§4).
2. **Mai evoluzione autonoma in assenza di audio.** Nel silenzio la marea si
   ferma e la materia **conserva lo stato raggiunto** — nessun ritorno allo
   stato iniziale: il silenzio lascia a schermo un corpo già parzialmente
   dissolto, fermo. Riusa il floor di validità di `perceptualPressure`
   (`SILENCE_RAW_PRESSURE_MAX` / la via silenzio già esistente), non un
   rilevatore nuovo.

### Grammatica del movimento

Dissoluzione **senza destinazione**: `forma → perdita del bordo →
dissoluzione → massa → coagulazione → pseudo-forma → nuova dissoluzione`.
Ciclica ma non periodica, mai un reset, mai uno stato terminale.
Dissoluzione e coagulazione **coesistono** in regioni diverse dello stesso
fotogramma (reversibilità locale).

### Cosa NON deve diventare

liquify filter, body horror esplicito, gore, tentacoli, Giger clone, nebbia
generica, lava lamp, blob audio-reactive, morph facciale, glitch,
kaleidoscope, fractal, particellare, slideshow dark. E soprattutto: non deve
sembrare che si applichino effetti all'immagine — l'immagine ha **cambiato
stato ontologico**.

---

## 2. Vincoli Audio (integrazione — invariati)

1. La dissoluzione non possiede uno stato finale.
2. Dissoluzione e ricomposizione sono reversibili e possono convivere.
3. Il beat produce **micro-perturbazioni locali somatiche**
   (ispessimento, micro-collasso, viscosità, movimento interno), non
   determina lo stato del renderer. Il renderer non deduce dal kick un
   cambio di stato Audio.
4. La **marea organica** è una temporalità, non un oscillatore: non ha un
   proprio metronomo, è la forma lenta assunta dalla materia mentre segue
   lo stato continuo di Brain. Il beat può perturbarla, non sincronizzarla.
5. Le permanenze lunghe si sostengono con **variazione interna**
   (distribuzione materia, grado di riconoscibilità, rapporto figura/sfondo,
   densità, coagulazione/dissoluzione, luce interna, micro-perturbazioni),
   non forzando transizioni né inventando eventi Audio.

`RESPIRO PROFONDO` = stato percettivo Audio. `DELIQUESCENCE` = uno dei modi
in cui quello stato si manifesta visivamente. Non sinonimi.

---

## 3. Fattibilità (analisi Ingegneria)

Pool Brain interamente **Canvas2D** (nessun WebGL; la GPU è di SD).

> **RIDIMENSIONAMENTO 2026-08-31 (richiesto dal braccio destro §3).** La
> gerarchia rovesciata (§1bis) sposta il bordo da comprimario a
> protagonista. L'analisi approvata dimensionava il bordo come "contorno a
> bassa risoluzione con vertici spostati da rumore lento" — adeguato a un
> **bordo che deriva**. NON basta per un bordo che deve **strozzarsi,
> perdere segmenti, ricomparire deformato, fondersi con bordi vicini e
> trascinare la figura**: quello è un contorno che **cambia topologia**, non
> solo posizione. Verifica sotto.

### 3bis. Il bordo come contorno a topologia variabile — verifica

Un contorno-polilinea con soli offset ai vertici **non** può: perdere un
segmento e riformarlo, fondere due anelli in uno, aprire un buco. Servono
operazioni topologiche che su una polilinea sono fragili e costose.

**Soluzione sostenibile: il bordo NON è una polilinea, è il gradiente di un
campo di occupazione a media risoluzione.**

- **Campo di occupazione** `occ(x,y) ∈ [0,1]` su griglia ~96×54 (≈5.2k
  celle), derivato al prepare dalla maschera figura (luminanza/salienza,
  §"Sorgente"). 1 = figura piena, 0 = fondo, la fascia intermedia È il
  bordo.
- Il **collasso del bordo** è deformazione + soglia del campo, non delle
  polilinee:
  - *cedere / colare / rientrare / espandersi*: advezione del campo lungo un
    campo di spostamento lento (grid ~24×14 di nodi con offset **che
    persiste**, §5-conseguenze) → warp del campo di occupazione.
  - *strozzatura*: due creste del campo che si avvicinano finché la fascia
    di bordo fra loro scende sotto soglia → il collo si chiude da sé
    (topologia emergente, gratis).
  - *perdere segmenti*: sottrazione locale al campo (macchie di erosione che
    seguono il rumore lento) → il bordo lì scompare; quando la macchia
    recede, riappare **deformato** perché intanto il warp è avanzato.
  - *fondersi con bordi vicini*: due regioni del campo che si toccano →
    l'iso-contorno diventa uno solo, senza codice di merge.
  - *trascinare la figura*: il raster è campionato **attraverso** il campo
    di occupazione warpato (`raster * occ_warp`), quindi dove il bordo si
    muove, la figura lo segue per costruzione.
- **Contorno esplicito** (lo stroke che si assottiglia/spezza/cola) = banda
  `occ_warp ∈ [0.35, 0.55]` resa con `source-over` scuro + un passo di
  `destination-out` puntinato per la perdita di segmenti. Nessuna
  ri-triangolazione.
- **Costo per frame**: warp del campo 96×54 via bilerp dai ~336 nodi
  (~5k lookup) + una resa del raster mascherato dal campo (un `drawImage` +
  un `putImageData` del campo come alpha, o 96×54 `fillRect` — trascurabile)
  + banda di contorno. Nessuna estrazione di contorno a runtime, nessun
  marching-squares per frame. **Regge a 24 fps** come Materia/Bauhaus;
  nessuna analisi pixel nel loop (§"Sorgente").
- **Ri-triangolazione**: eliminata dal disegno. Marching-squares serve solo
  se si vuole uno stroke vettoriale nitido; per un bordo che **cola** la
  banda-soglia del campo è più adatta e più economica.

**Verdetto**: il fenomeno-protagonista è sostenibile in Canvas2D **cambiando
rappresentazione** — campo di occupazione a media risoluzione invece di
polilinea. Il costo è nell'ordine di Materia Morph, quindi
`deliquescence` resta fuori da `HEAVY_RENDERERS_UNDER_PRESSURE`. Il nodo
vero non è il costo: è che va scritto attorno al campo, non attorno al
mesh-warp del raster (che È l'errore "Material-Morph scuro").

### 3ter. Altri fenomeni (accompagnamento)

| Fenomeno | Realizzazione |
|---|---|
| Deformazione globale figura | conseguenza del warp del campo di occupazione — non un mesh-warp indipendente del raster. |
| Fusione figura-sfondo | dove `occ_warp` si estende oltre la figura originale, si dipinge pigmento-figura nel fondo; dove recede, velo/vuoto. Il confine cessa di coincidere con l'originale. |
| Colore | palette-LUT al prepare (rampa nero organico); a runtime solo compositing. **+ colata**: sotto. |
| Colore che cola | passo separato, **gravità reale**: si campionano colori lungo la fascia alta del contorno e si spalmano verso il basso in striature verticali a bassa alpha, che si **accumulano** lentamente. Solo colore, non sposta il campo. |
| Attrattori | 1–3 celle ad alto contrasto del campo figura, **protette** dal collasso (offset dei nodi vicini smorzato) → un occhio / una ruota / un profilo persiste. |
| Luce interna / vuoti / grana | LOD, si spengono sotto pressione. |

Set sostenibile: 1 maschera figura + 1 campo di occupazione (~96×54) + 1
raster mappato-palette + 1 griglia di nodi di spostamento (~24×14, offset
persistente) + buffer della colata. **Nessun particellare, nessuna
polilinea, nessuna ri-triangolazione a runtime.**

### Nucleo minimo scalabile (LOD lineare, un solo percorso di codice)

- **Sempre attivo**: campo di occupazione warpato dai nodi di spostamento
  (bordo che collassa — il protagonista) · raster mappato-palette campionato
  attraverso il campo (corpo riconoscibile + colore) · banda di contorno.
  = il floor del §1.1 = Check Materia.
- **Si spengono sotto pressione**: colata del colore, attrattori multipli,
  luci interne, cavità (HOLLOW), grana. Sotto pressione resta il collasso
  del bordo su griglia di nodi più rada.

### Sorgente

`BrainRendererPluginContext` dà `raster: Blob` + `scene` + `palette` +
`getImageSources()`. **Nessuna segmentazione corpo/sfondo nel pool.**
DELIQUESCENCE stima la figura da sé — **singola sorgente, bassa
risoluzione, al prepare**, riusando l'approccio di `brainMaterialAnalysis`
(luminanza/salienza/soglia). Nessun modello di segmentazione nuovo.
**Nessuna analisi pixel nel loop `update`** — solo al prepare,
eventualmente su `brainImageWorker`, per restare fuori da
`HEAVY_RENDERERS_UNDER_PRESSURE`.

### Store fuori istanza (vincolo dal primo commit)

Le istanze renderer vivono ~20–84 s e si ricreano ad ogni cambio immagine
(`applyFrame` in `brainController.ts`). Lo **stato metabolico** (fase di
marea, livelli forma/dissoluzione per-regione, posizione centri-luce,
storia della maschera) vive a livello di **modulo**, indicizzato per
renderer id, seminato deterministicamente — pattern `brainVectorSceneCache`.
Su cambio immagine il nuovo raster è **scambio lento di substrato sotto la
maschera in corso**, non un reset. Questo sostiene anche il "nessun ritorno
allo stato iniziale" del §1.2.

---

## 4. Marea e segnali continui

- **Driver primario della marea: `residual`** — inviluppo "memoria lenta
  della pressione" (salita 1.5 s, discesa 25 s), già consumato come blend
  continuo da Dream-Segmentation. Per costruzione senza metronomo.
- `change` → quanto il mondo di riferimento sta invecchiando → bias verso
  dissoluzione vs coagulazione.
- `persistence` alto → bias verso ricomposizione/riconoscibilità.
- `pressureTrend` → **solo direzione**, mai ampiezza.
- beat/transienti → micro-perturbazione locale, **già smorzata** da
  `brainBioLocalMotionScale('respiro-profondo') = 0.16`. Non reinventare.
- **Cadenza**: `setPerception` arriva a frequenza di ingest audio, **non**
  RAF. Il renderer **interpola internamente** fra un update e il successivo
  — non legge `residual` come un gradino.

Un oscillatore sinusoidale lento è la soluzione ovvia e **vietata**
(vincolo Audio §4).

---

## 5. Wiring di regime e pool

> **Stato 2026-09-01**: §5.1, §5.2 (alzato al 95%), §5.4 **fatti**. §5.3
> (`decompression` protratta) **da fare**. `brainDeliquescenceCanvas.ts`
> **riscritto attorno al campo di occupazione** (§3bis, §10 passo 3):
> `estimateOccupationField` + `advanceCollapseNodes` (cedimenti + attrattori
> + silenzio) + `warpOccupation` + 8 modi di collasso + store fuori istanza +
> colata del colore + fusione figura-sfondo. **Test 1 e Test 2 Visual resi
> programmatici e verdi** (`silhouetteDivergence`). Restano: marea sui
> segnali continui oltre `residual` (§4), LOD sotto pressione, Test 3
> operativo affiancato (per ora path manuale), collaudo dal vivo.

### 5.1 Registrazione dell'id

`deliquescence` va aggiunto a: `BrainRendererId`, `BRAIN_RENDERER_IDS`
(`src/shared/types.ts`), `createDefaultBrainRendererRegistry`
(`brainRendererRegistry.ts`), `LOW_REGIME_RENDERERS`
(`brainRendererSelector.ts`).

### 5.2 Dominante al 95% in `respiro-profondo`

Decisione del Capo Supremo (2026-08-31, aggiornata il 2026-09-01): quando il regime entra
in `respiro-profondo`, DELIQUESCENCE è **il 95% della rotazione** — non uno
dei cinque a pari peso, ma nemmeno esclusivo.

- **Meccanismo: quota probabilistica sul pick**, non un rango stretto (un
  rango primario darebbe ~100% in ciclo per storia, non 95%).
  `applyLowRegimeDominance(deckPick)`: se `regime === 'respiro-profondo'` e
  `deliquescence` è eleggibile, con probabilità `LOW_REGIME_DOMINANT_SHARE`
  (0.95) il pick è `deliquescence`; nel 5% restante, se il mazzo aveva già
  scelto `deliquescence` si forza un altro renderer del pool basso (così la
  quota resta ~95/5, non ~99/1). Applicato ai quattro punti in cui
  `activeId` è assegnato in `story-cycle` (`beginStory`,
  `advanceStoryRenderer`, `advanceWaitingRenderer`, `reconcileCurrentRegime`).
- `deliquescence` è in `PERSISTENT_STORY_RENDERERS` → hold `[2,3]` in
  respiro-profondo (stasi lunga), non swap a singolo fotogramma.
- Effetto: DELIQUESCENCE è il ~95% dei fotogrammi mostrati; gli altri renderer
  sono il ~5%, texture/variazione.
- **Non esclusivo**: la rete di sicurezza dell'host (`hasFailed()` →
  passthrough FilterPsiche dark / Print2D) resta invariata. È il backstop.
- **Selezione manuale** da tendina (`VisualControls.tsx`): forza
  `deliquescence` sempre, ignora le esclusioni di regime — come gli altri.

### 5.3 Dominante in `decompression` protratta

Decisione del Capo Supremo (2026-08-31): la dominanza vale anche in
`decompression`, ma **condizionata alla durata** (un passaggio breve resta
a pari peso; una decompressione protratta anticipa il respiro profondo verso
cui si scende).

- **Meccanismo nuovo**: contatore di durata del regime nel selettore.
  `resolve`/`advanceStoryRenderer` hanno già `now`. Tracciare `regimeSince`,
  aggiornato quando `getRegime()` cambia rispetto all'ultimo visto.
  `decompressionProtracted = regime === 'decompression' && now - regimeSince
  >= DECOMPRESSION_PROTRACTED_MS`.
- Quando protratta → `deliquescence` rango 0 anche in `decompression`.
- `DECOMPRESSION_PROTRACTED_MS`: **valore di collaudo**, punto di partenza
  **~8–10 s** — sopra il transito ordinario (pochi secondi), sotto/attorno
  al momento in cui l'ereditarietà fa comunque scattare `respiro-profondo`
  (5–11 s). Da tarare all'ascolto.
- `decompression` **non** protratta: pool basso a pari peso fra i cinque,
  DELIQUESCENCE incluso ma non dominante.

### 5.4 Esclusioni dichiarate

- `HIGH_REGIME_EXCLUDED_RENDERERS` **contiene `deliquescence`** — escluso dal
  Respiro Alto, dichiarato, non emergente. **Fatto.**
- `BOOTSTRAP_EXCLUDED_RENDERERS = {deliquescence}` — `excludedForRegime`
  restituisce questo insieme per `unresolved`: DELIQUESCENCE non è
  dichiarabile in bootstrap, la sua sola presenza affermerebbe una
  grammatica di Respiro Profondo prima del riconoscimento. **Fatto** come
  esclusione minima; la restrizione completa del pool conservativo di
  bootstrap resta voce di collaudo.

### 5.5 Hold

`respiro-profondo` usa già il range persistente ordinario **[2,3]** (Item
3/4). DELIQUESCENCE persiste — coerente con la stasi lunga (§6). Nessuna
modifica a `selectBrainRendererHoldFrames`.

---

## 6. Durata lunga

Requisito di **resistenza percettiva del renderer**, non una richiesta al
modello Audio: se il sistema tiene DELIQUESCENCE in scena venti minuti, non
deve rivelare un ciclo, una sequenza o una ripetizione. La durata reale
appartiene alla musica; la capacità di sostenerla appartiene al renderer.

Dopo venti minuti deve essere riconoscibile lo **stesso organismo**, non la
stessa animazione. La varietà emerge da movimento interno, colore, densità,
materia, micro-variazione, memoria (§4) — senza inventare un nuovo stato.

Il "sempre qualche regione che si trasforma" del §1 va consegnato come
**risposta accumulata a minuti di audio reale** (store fuori istanza, §3),
non come clock libero. In silenzio vero, con `brainBioLocalMotionScale` a
0.16 e il Check Silenzio, DELIQUESCENCE è quasi immobile — per regola.

---

## 7. Gate di filosofia visiva (`agents.md`, 5 punti)

| Check | Esito | Condizione |
|---|---|---|
| 🛑 Camera | PASS per costruzione | il warp del campo di occupazione è locale (offset dei nodi a media ~nulla); il soggetto non trasla/ruota/scala come blocco. Il colare del colore è verticale ma è **colore**, non geometria — non è camera. |
| 🎨 Materia | TENSIONE | riconciliata dal §1.1: il raster resta sempre substrato; la perdita di forma è erosione/scurimento/displacement sopra, mai per scarto. Il floor §1.1 = Check Materia, non negoziabile. |
| 🤫 Silenzio | TENSIONE | riconciliata dal §1.2 + §6: la marea si ferma quando `perceptualPressure` è vicino al floor di validità; la varietà a 20 min viene da audio reale accumulato, non da un clock. |
| 🥁 Beatmatch | PASS | beat = micro-perturbazione locale; `beatPhase` orienta micro-movimenti; nessuna banda muove il quadro. Riusa `calculateRhythmicAccent`. |
| 🫧 Transizione | PASS | cambi immagine/renderer via crossfade esterno + `setTransition`; se DELIQUESCENCE persiste attraverso un cambio immagine, la maschera morpha sul nuovo substrato, mai un taglio. |

---

## 8. Riuso obbligatorio

- **Crossfade immagine→immagine**: già esterno in `brainController`
  (smootherstep 6–9 s). DELIQUESCENCE implementa `setTransition(progress,
  role)` come gli altri; **non** costruisce un morph proprio.
- `brainBioLocalMotionScale` per lo smorzamento in respiro profondo.
- `brainCanvasMotionSmoother` per lo smoothing del moto.
- `calculateRhythmicAccent` per l'accento ritmico.
- Camera stabile: è il **Check Camera**, regola di casa — non un vincolo
  originale di DELIQUESCENCE.

---

## 9. 8 varianti = un renderer — MODI DI COLLASSO (corretto)

Un solo id, un solo percorso di codice, un solo modello di stato, una sola
pipeline di disegno. Una variante = un **vettore di parametri** selezionato
deterministicamente sul seme della storia (`scene.frameId` hash) — pattern
`PSY_HYP_MORPHING_PRESETS`. **Non** otto `create()`.

Le varianti riguardano soprattutto **come collassa la forma**:

| Variante | Comportamento del bordo/forma |
|---|---|
| **SAG** | il bordo cede e affonda. |
| **IMPLOSION** | parti della figura vengono risucchiate verso l'interno. |
| **BLEED** | la figura invade progressivamente lo sfondo. |
| **FUSION** | oggetti/regioni vicine perdono il confine che li separa. |
| **EROSION** | porzioni del contorno vengono lentamente consumate. |
| **COAGULATION** | massa informe ricostruisce parzialmente una figura. |
| **HOLLOW** | alcune regioni collassano lasciando cavità organiche. |
| **SLUMP** | l'intero soggetto perde sostegno e si accascia, senza seguire necessariamente la gravità reale. |

Condividono movimento (cedimenti), materia, oscurità, rapporto
figura/sfondo, temporalità — e il colare del colore (gravità reale, §1bis).

---

## 9bis. Test Visual obbligatori (criteri di accettazione)

> **Aggiunto dopo il collaudo negativo 2026-08-31**: il Test 1 deve passare
> **a schermo**, non solo nei numeri. Nel primo rework la divergenza di
> campo era 0.79 e a schermo non si vedeva nulla, perché si warpava solo la
> maschera e il contorno era nero su nero. Da allora: il raster viene
> warpato per celle (le zone di colore scivolano) e `interiorDisplacement`
> misura lo spostamento dei nodi *dentro* la figura come proxy del "si vede
> davvero". Il criterio è: verifica visiva a schermo **prima** di procedere
> a marea, varianti e LOD.

**Test 1 — silhouette.** Oscurare mentalmente texture e colori. Se dopo
alcuni secondi il profilo del soggetto è praticamente quello originale,
**DELIQUESCENCE ha fallito**. (Nota: il colare del colore vive nel colore,
quindi questo test **non lo rileva**, per costruzione. La silhouette è il
criterio del bordo; il colare si giudica separatamente.)

**Test 2 — fermo immagine.** Due frame distanti trenta secondi: stesso
soggetto, ma **geometria materialmente diversa** (le conseguenze si
accumulano, niente ritorno elastico).

**Test 3 — confronto Material-Morph.** DELIQUESCENCE accanto a
Material-Morph. Se la differenza principale è solo palette/texture, **il
renderer è sbagliato**. La differenza deve essere strutturale.

---

## 10. Piano di lavoro Item 5

Ogni passo è un'unità verificabile a sé.

1. ~~**Id + wiring** (§5)~~ **FATTO** (2026-08-31): `deliquescence` in
   tipi/registry/tendina/pool; dominanza 95% in respiro-profondo
   (`applyLowRegimeDominance`); esclusioni §5.4. Renderer minimo
   `brainDeliquescenceCanvas.ts` = **PLACEHOLDER "Material-Morph scuro"** da
   sostituire (mesh-warp del raster, silhouette intatta → fallisce il Test
   1). Non è il renderer definitivo.
2. ~~**Verifica di fattibilità del bordo a topologia variabile**~~ **FATTO**
   (§3bis): il bordo va scritto attorno a un **campo di occupazione a media
   risoluzione**, non a una polilinea. Costo nell'ordine di Materia Morph.
3. ~~**Riscrittura del renderer attorno al campo di occupazione**~~ **FATTO**
   (§3bis/3ter): `estimateOccupationField` (con box-blur); nodi di
   spostamento con **offset persistente**; `advanceCollapseNodes` (cedimenti
   + attrattori + silenzio); `warpOccupation`. **Gate Test 1 PASSA**:
   `silhouetteDivergence > 0.12` dopo ~8 s per ogni modo.
3bis. ~~**Rework della resa** (collaudo negativo 2026-08-31)~~ **FATTO**:
   il warp della sola maschera non si leggeva a schermo (contorno nero su
   nero, raster sepolto, colata in colonne fisse dominante). Ora:
   `analyzeMaterialPixels` → **zone di colore**; raster **warpato per celle**
   (griglia 22×13) → le regioni cromatiche scivolano; contorno **chiaro**
   (`rgb(214,196,205)`), più largo, in `lighter`; fondo `#0a0812` + velo
   `multiply` 3-13% → raster dominante; colata per-regione dal bordo
   inferiore warpato (non colonne fisse), subordinata; scratch persistenti.
   `interiorDisplacement` come proxy del "Test 1 a schermo" (4.6-6.2
   celle-occ a 8 s per ogni modo).
4. ~~**Colata / fusione / attrattori**~~ **FATTO** con i passi 3 / 3bis.
5. **Marea sui segnali continui oltre `residual`** (§4): `change` /
   `persistence` bias, `pressureTrend` direzione. Oggi solo `residual` →
   `tide`; il resto è da collegare.
6. ~~**8 modi di collasso come preset**~~ **FATTO** (`COLLAPSE_MODES`,
   `pickCollapseMode`).
7. **LOD** (§3 nucleo minimo): colata, attrattori multipli, cavità, grana
   come strati che si spengono sotto pressione. Oggi solo la colata è
   gated su `resourcePressure`.
8. **Test 3 operativo affiancato** (§9bis/§11): oggi solo il path manuale.
9. **Gate filosofia** (§7) + i tre Test Visual (§9bis) + collaudo dal vivo.

**Vincolo di sequenza**: il renderer entra nel pool attivo solo **dopo** che
il collaudo dal vivo dei quattro stati + bootstrap è passato.

---

## 11. Dipendenze aperte

- **Riscrittura del renderer** (§10 passo 3): il file attuale è un
  placeholder che fallisce il Test 1. È il prossimo lavoro di codice.
- **Test 3 operativo** — serve poter mettere DELIQUESCENCE e Material-Morph
  sulla stessa immagine. Opzioni:
  1. *Path già disponibile*: in modalità **manuale**, la tendina cambia
     renderer **senza rigenerare l'immagine** (l'host si ricrea sullo stesso
     `scene`/`raster` del fotogramma corrente). Basta tenere fermo il
     fotogramma (pausa/hold lungo) e alternare `deliquescence` ↔
     `material-morph`. Verifica sequenziale, non affiancata.
  2. *Affiancata (da implementare se la 1 non basta)*: flag di sviluppo
     `brainRendererCompare` che divide la superficie Output in due e istanzia
     i due renderer sullo stesso `BrainRendererPluginContext`. Costo: un
     secondo host + layout. Solo dev, mai in produzione.
  Riportare quale delle due si adotta prima di scrivere codice di confronto.
- **`decompression` protratta** (§5.3): contatore `regimeSince` +
  `DECOMPRESSION_PROTRACTED_MS` (~8–10 s). Da fare.
- **Collaudo dal vivo dei quattro stati + bootstrap** (log 1 Hz): prerequisito
  all'attivazione di DELIQUESCENCE nel pool. Piano a cura del braccio destro.
- **Restrizione pool di bootstrap** al pool conservativo (oggi voce di
  collaudo): la restrizione completa; oggi c'è solo `BOOTSTRAP_EXCLUDED_
  RENDERERS = {deliquescence}` (§5.4).
