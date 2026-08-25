# PIANO-037: Figure Bauhaus indipendenti dal raster

## Origine

Richiesta del Capo Supremo: "in bauhaus morph andrei a cercare di
disegnare delle figure ogni tanto, a prescindere dal raster, dammi una
soluzione". Pianificato in Plan Mode con un agente Explore (lettura
completa di `brainBauhausMorphCanvas.ts`) e un agente Plan (design della
soluzione), poi due giri di `AskUserQuestion` per chiarire due punti che
il primo piano non coglieva:

1. "non deve esserci sempre e non si deve fare ad ogni occasione, cioè
   non deve essere un momento fisso ma un comportamento" — la comparsa
   non è un evento programmato in un punto fisso della timeline, ma
   condizionata continuamente dall'ascolto reale.
2. "quando una figura si avvicina ad una presente, dopo 1/2 secondi che
   ha aspetto e posizione, deve provare ad assumere una forma che possa
   ricordare un oggetto. il tema è ma come faccio a capire quale
   oggetto?" — il Capo Supremo ha ipotizzato il machine learning; alla
   domanda diretta ha scelto esplicitamente una libreria curata a mano,
   NON il ML (troppo lontano dall'architettura Canvas2D-only di questo
   renderer, nessun precedente nel codebase per riconoscimento/sintesi
   di sagome).

## Tecnica

- **Trigger** (`updateBauhausFigureAccumulator`): accumulatore
  alimentato da `motion.activity`/`motion.beat` (già calcolati da
  `calculateBauhausMotion`, nessun secondo profilo di banda separato —
  qui non serve rilevare un CAMBIO di carattere tonale come in Dream
  Segmentation, basta l'energia sostenuta). Azzerato SEMPRE senza audio
  attivo (Check Silenzio). Soglia + tempo minimo fra due trigger
  (`MINIMUM_FIGURE_DWELL_MS = 30_000`) tengono l'evento raro per
  costruzione, non per un tetto arbitrario sulla probabilità.
- **Geometria** (`createBauhausFigure`): un `BauhausPlane` sintetico
  (`sourceRegionId: -1`, mai risolve a un layer raster reale), posizione
  scelta fra ancore non centrali (regola dei terzi) con jitter, colore
  dalla palette dell'immagine corrente (Check Materia: mai un colore
  estraneo), forma iniziale (rect/ellipse/triangle) rappresentata come
  contorno a `FIGURE_OUTLINE_POINTS = 8` punti — non `outline: []` —
  perché è il prerequisito per il morph continuo del punto successivo.
- **"Diventare un oggetto"** (`updateBauhausFigureProximity` +
  `selectBauhausSilhouette`): se la figura resta entro
  `FIGURE_PROXIMITY_THRESHOLD` da un piano raster-derivato attualmente
  disegnato per `FIGURE_PROXIMITY_DWELL_MS` (1.5s) continui, seleziona
  una sagoma dalla libreria curata (`brainBauhausSilhouettes.ts`: luna,
  foglia, bottiglia, uccello, stella, freccia — 8 punti ciascuna, stesso
  ordine orario della forma astratta) in base alle proporzioni del piano
  vicino, poi **riusa `interpolatedPlane` senza modificarlo** per
  morphare punto-per-punto dalla forma astratta alla sagoma scelta
  (`FIGURE_BECOME_MS = 1_200`, Check Transizione). Se la figura si
  allontana prima della soglia di tempo, `nearMs` si azzera e resta
  astratta per tutta la vita — esito normale, non un errore: è
  esattamente il "non sempre, non ogni occasione" richiesto.
- **Ciclo di vita** (`computeBauhausFigureEnvelope`): fade-in 900ms,
  tenuta 3.2s, fade-out 1.4s — mai un pop, sempre un morph continuo
  (Check Transizione). Uno slot singolo (`activeFigure`), non una lista:
  la finestra di attesa fra due trigger è ~6× più lunga della vita
  totale, non serve altro.
- **Posizione nel disegno**: fra i cerchi concentrici e i piani
  abbinati — sopra il materiale raster-derivato (si legge come accento),
  sotto i piani abbinati e l'overlay raster focale successivo (quel
  materiale resta l'ancora compositiva dominante, Check Materia).
  `globalAlpha` limitato da `FIGURE_MAX_ALPHA = 0.5`: non può mai
  occludere del tutto la composizione sotto.
- **Costo**: O(1) per frame, stesso gate binario dei cerchi
  (`!resourcePressure`), nessun budget a più livelli necessario. La
  prossimità viene aggiornata con un ritardo di un fotogramma rispetto
  al disegno (i piani abbinati vengono calcolati subito dopo il punto di
  disegno della figura) — impercettibile, evita di calcolare i piani
  abbinati due volte nello stesso giro.

## File toccati

- `src/renderer/output/brain/brainBauhausSilhouettes.ts` (nuovo, dati
  puri) — libreria curata di 6 sagome.
- `src/renderer/output/brain/brainBauhausMorphCanvas.ts` — 5 nuove
  funzioni pure esportate (`updateBauhausFigureAccumulator`,
  `createBauhausFigure`, `computeBauhausFigureEnvelope`,
  `updateBauhausFigureProximity`, `selectBauhausSilhouette`), 3 nuovi
  tipi, `hashUnit` privato locale, 2 nuove variabili di stato in
  chiusura, inserimento nel loop di disegno, estensione di `signature`,
  reset in `destroy()`.
- `src/renderer/output/brain/brainBauhausMorphCanvas.test.ts` — 26 nuovi
  test per le 5 funzioni pure + la libreria dati.

## Verifica

- `pnpm vitest run` — 429/429 verdi (57 file).
- `pnpm typecheck` — pulito.
- `pnpm lint` sui file toccati — pulito.
- `pnpm build` — build di produzione completa.
- Non ancora verificato dal vivo (osservazione diretta con audio reale —
  in particolare: la figura compare raramente non ad ogni storia, il
  morph verso una sagoma è continuo e non uno scatto, la sagoma scelta
  ha senso rispetto al piano vicino).
