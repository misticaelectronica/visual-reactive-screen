# PIANO-038: Fractal Spiral Degeneration

## Origine

Brief di direzione artistica fornito dal Capo Supremo ("Capo Supremo
dei DJ", la regia visiva di Brain) per un nono renderer: il raster entra
in una degenerazione strutturale progressiva e rivela una struttura
frattale auto-simile, organizzata da un avvitamento a spirale interno
alla FORMA, mai al quadro/camera. Documento deliberatamente privo di
prescrizioni tecniche — questo piano ne è la traduzione Canvas2D.

Pianificato in Plan Mode: un agente Explore ha verificato le primitive
riusabili (nessun helper di crop per-regione già pronto, ma il pattern
`regionLabels`+pixel loop di Bauhaus/Materia Morph è il precedente
diretto; `planePath()` di Bauhaus è il precedente di rotazione
locale-alla-forma richiesto dal brief §5).

## Due correzioni di direzione artistica (2026-08-24)

**Prima correzione**: la versione iniziale ritagliava un rettangolo alla
bounding box di ogni regione e ne disponeva copie decrescenti orbitanti
attorno a un centro — leggibile come tasselli rettangolari rotanti
(linguaggio da collage/Psycho2D), non come una spirale che vive dentro
la materia dell'oggetto. Corretto con sagome vere mascherate + spirale
confinata via `source-atop`.

**Seconda correzione**: la versione successiva faceva ruotare il
CONTENITORE (in contro-rotazione rispetto alla spirale interna) — anche
questo respinto: "gli oggetti del raster devono restare fermi nella
loro posizione e nella loro forma generale... la trasformazione non
deve avvenire facendo girare l'oggetto, deve avvenire DENTRO l'oggetto."
Inoltre la spirale non doveva ridursi a una linea sottile ma essere
"densa, corposa, cromatica, volumetrica... piena di colore". Corretto:
il contenitore non ruota mai più; dentro la sagoma (sempre ferma) si
disegna una massa colorata (gradiente radiale dal colore della regione)
più bracci di spirale spessi e cromatici (`computeSpiralArmPoints`,
`computeSpiralFillPhase`) che riempiono la superficie interna — è la
materia interna ad animarsi, mai il contenitore.

Vedi §Tecnica sotto per la traduzione tecnica aggiornata (versione
corrente, dopo entrambe le correzioni).

## Tecnica (versione corrente)

- **Oggetti a sagoma vera, SEMPRE fermi**: `analyzeMaterialPixels`
  individua le regioni più salienti; per ciascuna si costruisce un
  layer a piena cornice mascherato pixel-per-pixel (stesso pattern di
  `regionLayers` in Bauhaus/Materia Morph — `regionLabels[pixel] ===
  region.id+1`), non un ritaglio rettangolare. Il layer viene disegnato
  SEMPRE a identità (nessuna `translate`/`rotate` sul contenitore) — è
  la sagoma reale dell'oggetto, ferma nella sua posizione e forma.
- **Riempimento interno confinato**: un unico buffer offscreen riusato
  (`maskBuffer`, Check Costo) riceve il layer mascherato (stabilisce la
  sagoma), poi con `globalCompositeOperation = 'source-atop'`: (1) un
  gradiente radiale dal colore medio della regione (massa colorata che
  "abita" il volume, non un contorno), (2) N bracci di spirale SPESSI
  (`computeSpiralArmPoints`, `lineWidth` proporzionale al raggio
  dell'oggetto, non una linea sottile) in colori diversi della palette.
  `source-atop` fa sì che tutto questo possa comparire SOLO dove il
  buffer è già opaco — strutturalmente impossibile che esca dalla
  sagoma. Il buffer completo viene poi composito una volta sola sul
  canvas principale.
- **Ciò che si muove è la materia, mai il contenitore**:
  `computeSpiralFillPhase(objectIndex, ...)` guida solo l'angolo di
  partenza dei bracci interni (fase propria per oggetto, hash
  sull'indice, così più oggetti non pulsano mai in sincrono) — non
  esiste più nessuna rotazione applicata all'oggetto stesso.
- **Sfondo spiraliforme continuo e presente**: `computeBackgroundSpiralPoints`
  genera posizioni deterministiche per un campo di bracci a spirale
  spessi (`computeSpiralArmPoints` riusata, raggio e `lineWidth`
  generosi così i campi dei punti vicini si sovrappongono) disegnati
  PRIMA di tutto il resto — mai assenti, meno dominanti degli oggetti
  ma abbastanza presenti da saturare percettivamente lo spazio.
- **Gerarchia di disegno**: sfondo spirali → raster di contesto
  attenuato (`computeUnderlayOpacity`, soffitto basso, subordinato agli
  oggetti) → oggetti fermi riempiti dalla loro materia spiraliforme.
- **Degenerazione progressiva**: `advanceDegenerationProgress` — stessa
  identica logica di `advanceBauhausAbstraction` (avanza solo con
  `rhythm.active && musicalPosition` reale, mai `performance.now()` da
  solo).
- **Reveal per braccio**: `computeLevelReveal` — i bracci di spirale
  compaiono in sequenza con l'aumentare della degenerazione, con un
  nudge temporaneo sul beat (`beatPulse`, mai uno scatto del quadro).
- **Mappa bande**: `low`→peso macro-strutture, `lowMid`/`mid`→numero di
  giri e densità dei bracci, `high`→spessore/dettaglio dei bracci,
  `beatPulse`→evento strutturale (reveal anticipato), `beatPhase`→
  continuità angolare del riempimento.
- **Transizione fra immagini** (brief §18, "cambia memoria"): gli
  oggetti di `from`/`to` vengono disegnati entrambi durante la
  transizione, a opacità complementare — mai un taglio secco.
- **Silenzio**: `degenerationProgress` e l'offset angolare da
  `beatPhase` sono entrambi silenzio-gated — il contenitore è comunque
  sempre fermo, quindi il silenzio ferma solo l'animazione della
  materia interna/di sfondo.
- **Niente linguaggio Psycho2D/collage**: nessun rettangolo isolato
  disegnato fuori da una sagoma mascherata — evitato per costruzione
  dalla tecnica `source-atop`, non solo per convenzione.

## File toccati

- `src/renderer/output/brain/brainFractalSpiralCanvas.ts` (nuovo) — 7
  funzioni pure esportate (`calculateFractalSpiralMotion`,
  `advanceDegenerationProgress`, `computeUnderlayOpacity`,
  `computeLevelReveal`, `computeSpiralFillPhase`,
  `computeSpiralArmPoints`, `computeBackgroundSpiralPoints`) +
  controller `createBrainFractalSpiralScene`.
- `src/renderer/output/brain/brainFractalSpiralCanvas.test.ts` (nuovo)
  — 23 test, incluso un test di integrazione con Canvas2D mockato
  (600 fotogrammi simulati) — ha trovato un vero bug prima della build
  (deadlock fra `update()` e `prepare()` sul buffer di masking creato
  troppo tardi), non solo confermato che i test unitari passassero.
- Registrazione meccanica in `brainRendererRegistry.ts` (nona voce),
  `brainRendererSelector.ts` (`PERSISTENT_STORY_RENDERERS` +
  `HEAVY_RENDERERS_UNDER_PRESSURE`, stesso trattamento di Bauhaus/
  Materia Morph/Dream Segmentation per l'analisi multi-sorgente),
  `shared/types.ts`, `VisualControls.tsx`, `OutputApp.tsx`.

## Verifica

- `pnpm vitest run` — 454/454 verdi (58 file).
- `pnpm typecheck`, `pnpm lint` sui file toccati — puliti.
- `pnpm build` — build di produzione completa.
- Non ancora verificato dal vivo (osservazione diretta con audio reale
  — in particolare: oggetti riconoscibili per sagoma, spirale leggibile
  DENTRO ogni oggetto, contro-rotazione percepibile, sfondo spiraliforme
  sempre presente ma non protagonista, quadro mai in rotazione, silenzio
  = immobilità totale
  anche a metà degenerazione).
