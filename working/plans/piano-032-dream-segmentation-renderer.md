# Piano di Lavoro: Nuovo Renderer Brain "Dream Segmentation"

> **ID Piano**: `PIANO-032`
> **Macrotask di Riferimento**: Rotazione/varietà renderer Brain
> **Data Creazione**: 2026-08-19
> **Stato**: `COMPLETATO`
> **Autore/Agente**: Agente AI / Sviluppatore

---

## 1. 🎯 Obiettivo del Piano

Aggiungere un settimo renderer Brain, "Dream Segmentation", che rende
visibile come Brain costruisce, mantiene e trasforma uno stato
immaginativo interno durante l'ascolto musicale — distinguendo
esplicitamente **reattività** (locale, beat/transiente) da **evento**
(scarto percettivo sostenuto che aggiorna lo stato interno), con
segmentazione dell'immagine come rappresentazione di configurazioni
temporaneamente stabili.

## 2. 📋 Filosofia Fornita Dallo Sviluppatore (Design Brief, Verbatim)

Questa è la specifica completa fornita per il renderer — vive qui, non in
`filosofia.md` (che resta la filosofia generale di Brain) né in
`agents.md`.

### Scopo

Dream Segmentation è un renderer che rappresenta visivamente il modo in
cui Brain costruisce, mantiene e trasforma uno stato immaginativo durante
l'ascolto musicale. Il principio centrale è che Brain non traduce
direttamente il suono in effetti visivi. La musica modifica
progressivamente ciò che Brain sta immaginando. Il renderer rende visibile
questa attività interna.

### Fondamento scientifico

Dream Segmentation assume come riferimenti principali: embodied cognition
(esperienza, percezione ed emozione emergono dall'interazione continua tra
cervello, corpo e ambiente); interocezione (lo stato interno
dell'organismo contribuisce alla costruzione dell'esperienza percettiva ed
emotiva); predictive processing / active inference (il cervello costruisce
continuamente ipotesi sul proprio stato e sul mondo, confrontandole con i
segnali disponibili e aggiornandole quando diventano insufficienti);
neuroscienze cognitive del sogno (durante il sogno il cervello costruisce
mondi percettivamente coerenti pur lavorando con un rapporto fortemente
ridotto con gli stimoli esterni; continuità, identità, spazio e causalità
possono quindi rimanere temporanei e trasformabili); neuroscienze
cognitive della musica (la musica può attivare processi di immaginazione e
costruzione del significato che superano la semplice elaborazione
acustica, facendo emergere rappresentazioni semantiche, affettive e
narrative di livello superiore).

La Bioenergetica di Alexander Lowen rimane un riferimento filosofico per
il ruolo attribuito a corpo, respirazione, tensione e stato affettivo, ma
Brain traduce questi concetti attraverso costrutti contemporanei come
interocezione, propriocezione, arousal e regolazione autonomica, senza
assumere l'"energia" bioenergetica come entità fisica dimostrata.

### Modello mentale di Brain

La relazione fondamentale diventa: **musica → percezione → stato
corporeo/affettivo → associazione → modello immaginativo → immagine**. Tra
audio e immagine esiste quindi uno stato interno persistente. Questo stato
contiene ciò che Brain sta temporaneamente immaginando: relazioni, forme,
tensioni, luoghi, presenze, materiali, memorie e possibilità ancora non
completamente determinate. Le immagini generate sono manifestazioni
successive dello stesso stato immaginativo.

### Il sogno come modello

Dream Segmentation non deve costruire una narrazione cinematografica
lineare. La continuità del sogno è soprattutto associativa, affettiva e
percettiva. Una forma può diventare un'altra mantenendo qualcosa della
propria identità precedente. Un luogo può diventare organismo. Un
organismo può diventare paesaggio. Una soglia può diventare membrana. Una
rete può diventare architettura. L'identità può quindi sopravvivere alla
trasformazione della forma.

### Segmentazione

Un segmento rappresenta una configurazione temporaneamente stabile
dell'immaginazione di Brain. Durante una fase musicalmente stabile Brain
approfondisce quella configurazione. Quando avviene un cambiamento
percettivamente significativo, Brain aggiorna il proprio modello interno.
Il nuovo segmento nasce dal precedente invece di sostituirlo
completamente. La segmentazione deve quindi produrre: **persistenza →
destabilizzazione → trasformazione → nuova stabilizzazione**. Non deve
produrre: **immagine A → cambio → immagine B**.

### Denoising

Il denoising assume anche un significato concettuale. Non rappresenta
semplicemente la rimozione del rumore. Rappresenta la progressiva
riduzione dell'indeterminazione attraverso cui una configurazione diventa
temporaneamente percepibile. Il rumore contiene possibilità. Durante il
denoising alcune possibilità vengono rafforzate, altre scompaiono, altre
rimangono ambigue. L'immagine finale non deve necessariamente apparire
completamente risolta. Una quota di indeterminazione deve rimanere
disponibile per la trasformazione successiva.

### Predictive processing

Brain deve comportarsi come un sistema che mantiene continuamente una
propria ipotesi percettiva. Una configurazione rimane stabile finché ciò
che Brain riceve dalla musica è compatibile con essa. Quando la musica
produce uno scarto significativo, il modello viene rinegoziato. Il
cambiamento visivo rappresenta quindi un aggiornamento dell'ipotesi
interna. L'evento importante non è necessariamente il beat. È il momento
in cui ciò che Brain stava immaginando diventa insufficiente e deve
trasformarsi.

### Dimensione corporea

Il comportamento del renderer deve possedere una temporalità corporea.
Respirazione, espansione, contrazione, densità, tensione, rilascio,
inerzia e persistenza sono modelli più appropriati rispetto a flash,
scaling immediato o sincronizzazione meccanica al beat. L'audio può
influenzare questo corpo attraverso energia sostenuta, variazioni di
tensione, densità e altri segnali lenti. Lo stato interno di Brain può
costituire un secondo livello corporeo: attività generativa, pressione
computazionale, memoria recente o altri stati persistenti possono
partecipare alla dinamica del renderer. Il sistema possiede quindi un
**ambiente esterno**, rappresentato dalla musica, e un **corpo interno**,
rappresentato dal proprio stato.

### Continuità semantica

Ogni sequenza deve possedere uno o pochi invarianti. L'invariante può
essere: una relazione spaziale; una forma; un materiale; una presenza; una
soglia; una direzione; una tensione affettiva; una struttura di
connessione. L'invariante può cambiare completamente aspetto mantenendo la
propria funzione semantica. Il filo conduttore deve essere percepibile
senza essere necessariamente identificabile verbalmente.

### Memoria

Dream Segmentation deve avere memoria. La scena precedente non scompare
completamente. Può sopravvivere attraverso: residui; forme fantasma;
strutture parziali; deformazioni; texture; relazioni spaziali; elementi
ricombinati; ritorni successivi. La memoria rende possibile percepire che
Brain continua a immaginare la stessa cosa mentre quella cosa cambia.

### Condensazione onirica

Due o più elementi possono fondersi in una nuova entità. La condensazione
non deve essere rappresentata come semplice sovrapposizione o crossfade.
La nuova forma deve possedere proprietà provenienti da entrambe le forme
precedenti senza essere completamente riducibile a nessuna delle due. La
condensazione rappresenta quindi la produzione di una **terza forma**.

### Spostamento

Un significato può migrare da un elemento a un altro. Una qualità
appartenente inizialmente a un oggetto può comparire successivamente in un
luogo, in una struttura o nella luce. Questo permette di mantenere
continuità senza conservare necessariamente lo stesso soggetto.

### Morfologia visiva

Il linguaggio visivo deve favorire forme capaci di restare semanticamente
ambigue: reti, filamenti, membrane, nodi, tessuti, ramificazioni,
paesaggi ambigui, strutture organiche, architetture incomplete, cavità,
soglie, aggregati, materia in trasformazione. La struttura neuronale può
essere utilizzata come riferimento morfologico, soprattutto nella
relazione tra nodi e connessioni, senza trasformare il renderer in una
rappresentazione anatomica del cervello.

### Spazio

Lo spazio deve poter oscillare tra scale differenti. Microscopico e
paesaggistico possono coincidere. Una membrana cellulare può essere
percepita come parete. Un filamento può diventare strada. Una rete
neurale può diventare territorio. Un corpo può diventare ambiente. Questa
instabilità della scala rafforza la logica onirica.

### Tempo

Il tempo del renderer deve essere continuo, viscoso e dotato di memoria.
Le trasformazioni devono possedere inerzia. Una variazione non deve
necessariamente produrre immediatamente il proprio risultato. L'effetto
di un evento può continuare a svilupparsi mentre la musica è già entrata
nella fase successiva. Questo evita una corrispondenza meccanica tra
causa sonora ed effetto visivo.

### Relazione con la musica

La musica opera su due livelli distinti. A livello locale può modificare
intensità, movimento, densità o comportamento della materia. A livello
superiore può modificare lo stato immaginativo. Il primo livello produce
reattività. Il secondo produce significato. Dream Segmentation privilegia
il secondo.

### Ambiguità

Brain deve orientare l'immaginazione senza determinarla completamente. Lo
spettatore deve poter riconoscere relazioni e ritorni senza ricevere una
spiegazione univoca. L'immagine deve essere abbastanza coerente da
produrre una percezione di continuità e abbastanza ambigua da permettere
interpretazioni personali. Il significato funziona come attrattore, non
come messaggio chiuso.

### Esperienza dello spettatore

Lo spettatore dovrebbe percepire progressivamente che: qualcosa sta
emergendo; qualcosa persiste; qualcosa cambia identità; qualcosa ritorna;
le trasformazioni sembrano appartenere allo stesso processo mentale. Il
risultato deve evocare la sensazione di assistere a un'immaginazione
mentre si forma, più che alla visualizzazione di un brano musicale.

### Identità visiva generale

Dream Segmentation deve restare sospeso tra: microscopico e
paesaggistico; organico e architettonico; riconoscibile e indeterminato;
memoria e trasformazione; corpo e ambiente; stabilità e metamorfosi.
Nessuno dei due poli deve prevalere definitivamente.

### Principio conclusivo

Dream Segmentation non visualizza ciò che la musica sta facendo.
Visualizza come la musica modifica progressivamente ciò che Brain sta
immaginando. Ogni immagine rappresenta una soluzione temporanea. Ogni
trasformazione mette quella soluzione nuovamente in discussione. Ogni
residuo mantiene la memoria di ciò che Brain aveva immaginato prima. Il
renderer deve quindi apparire come un sistema percettivo che ascolta,
forma ipotesi, sogna, ricorda e riorganizza continuamente il proprio mondo
interno.

---

## 3. ⚠️ Regole e Vincoli di Sviluppo (da `agents.md`)

- [x] **Check Camera**: nessuna trasformazione applicata al canvas/camera
  intero — solo scala locale per-regione (`computeRegionBreathing`).
- [x] **Check Materia**: il raster sorgente (`CachedDreamField.base`) è
  sempre disegnato come livello di base; le primitive (membrane,
  filamenti, condensazioni) restano un livello secondario compositato
  sopra (`lighter`, opacità limitata).
- [x] **Check Silenzio**: nessun evento può scattare senza audio attivo
  (`updateDreamSurpriseAccumulator` ritorna `triggered: false` e azzera
  l'accumulatore se `active` è falso); `computeRegionBreathing` applica la
  pressione/lowPowerMode solo come fattore moltiplicativo su un termine
  già derivato dall'audio, mai additivo o guidato direttamente dal tempo.
- [x] **Check Beatmatch**: reattività locale (respirazione per-regione)
  separata dall'evento (trasformazione), nessuna banda muove l'intero
  quadro.
- [x] **Check Transizione**: la trasformazione non è mai un taglio secco —
  `computeLocalMorphProgress` avanza con inerzia (durata minima
  `MINIMUM_TRANSFORMATION_MS`), la condensazione è un blend non lineare,
  non un crossfade.
- [x] `lowPowerMode` supportato (risoluzione/budget ridotti).
- [x] Nessun DevTools automatico introdotto (file isolato, nessun tocco a
  `main.ts`).

---

## 4. 🛠️ Fasi di Implementazione e Checklist Task

### Fase 1: Segmentazione e stato persistente
- [x] Riuso di `analyzeMaterialPixels`/`matchMaterialRegions`
  (`brainMaterialAnalysis.ts`) invece di un nuovo algoritmo.
- [x] `prepareDreamField()` più leggero di `prepareMaterialSource`
  (solo `{ field, base }`, niente canvas pigment/edges/grain per-pixel).

### Fase 2: Evento vs reattività
- [x] `computeBandProfile`/`updateBaselineProfile`/`computeProfileDistance`
  — distanza di bilanciamento tonale, non energia sommata.
- [x] `updateDreamSurpriseAccumulator` — accumulo con decadimento, soglia,
  dwell minimo (`MINIMUM_DWELL_MS`), gating silenzio.

### Fase 3: Trasformazione, condensazione, spostamento
- [x] `computeLocalMorphProgress` — avanzamento con inerzia disaccoppiato
  dal `transitionProgress` host ma vincolato ad esso come tetto.
- [x] `findCondensationPairs`/`computeCondensationBlend` — "terza forma"
  non lineare (blend `screen`, area in quadratura).
- [x] `computeSpostamentoTrail` — migrazione della qualità del fuoco
  visivo fra vecchia e nuova configurazione.

### Fase 4: Corpo, disegno, memoria
- [x] `computeRegionBreathing` — respirazione locale, solo moltiplicativa.
- [x] `drawMembrane`/`drawFilamentNetwork`/`drawGhostResidue` — linguaggio
  visivo a rete/membrane/filamenti, storico fantasma con decadimento
  indipendente (`GHOST_HISTORY_LIMIT`, `GHOST_LIFESPAN_MS`).

### Fase 5: Collegamento al resto del sistema
- [x] `src/shared/types.ts` — nuovo id `dream-segmentation`.
- [x] `brainRendererRegistry.ts` (+ test) — settimo renderer registrato.
- [x] `brainRendererSelector.ts` — incluso in `PERSISTENT_STORY_RENDERERS`
  e (decisione dello sviluppatore) in `HEAVY_RENDERERS_UNDER_PRESSURE`
  fin da subito, stesso trattamento preventivo di Bauhaus/Materia Morph.
- [x] `OutputApp.tsx` (etichetta debug) e `VisualControls.tsx` (select
  Control window).

### Fase 6: Verifica, Test e Build
- [x] `pnpm vitest run` — 54 file / 348 test verdi (incl. nuovo file di
  test sulle funzioni pure).
- [x] `pnpm typecheck`.
- [x] `pnpm lint`.
- [x] `env -u NODE_OPTIONS pnpm exec vite build`.
- [ ] Verifica manuale dal vivo (Control → selezione manuale "Dream
  Segmentation"): da fare alla prossima sessione live, non bloccante per
  il commit.

---

## 5. 🧪 Strategia di Verifica e Validation Plan

- **Comandi**: `pnpm vitest run`, `pnpm typecheck`, `pnpm lint`,
  `env -u NODE_OPTIONS pnpm exec vite build`.
- **Verifica manuale consigliata**: selezionare "Dream Segmentation" in
  modalità manuale; controllare che il raster resti visibile sotto le
  primitive (Check Materia); in silenzio verificare che resti stabile
  (Check Silenzio); con audio sostenuto verificare che una trasformazione
  scatti dopo qualche secondo di scarto tonale, non ad ogni beat; sotto
  pressione GPU reale (denoising attivo) verificare che il selettore lo
  eviti nella story-cycle, come già verificato per Bauhaus/Materia Morph.

---

## 6. 📝 Note e Registro Avanzamento

- **2026-08-19**: Creazione del piano e implementazione completa in
  un'unica sessione. Punto architetturale chiave risolto durante la
  progettazione: `transitionProgress`/`role` (pilotati dall'host,
  `brainController.ts`) restano l'unica autorità su quali sorgenti sono
  disponibili per il blend; l'accumulatore di sorpresa audio-driven
  decide solo *quando* iniziare ad inseguirli, con inerzia propria
  (`computeLocalMorphProgress`) — due orologi distinti, non uno che
  sostituisce l'altro. Verifica manuale dal vivo rimandata alla prossima
  sessione con hardware audio disponibile.
