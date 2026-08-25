# PIANO-039 — Print2D: Vita Interna (Contorno Vivo + Freeze/Impulso)

> **Data Creazione**: 2026-08-25
> **Stato**: `IN_PROGRESS`
> **Autore/Agente**: Capo Supremo / Agente AI

---

## 1. Origine

Brief VJ del Capo Supremo indirizzato al "Capo degli Ingegneri di Brain":
spostare l'identità di Print2D da "lastre che si muovono" a "stampa che
prende vita internamente". Grammatica richiesta: **contorno vivo** (stato
ordinario) alternato a **freeze + impulso** (evento), mai due preset
separati — un'unica catena `vivo → freeze → impulso → decadimento → vivo`.

Brief solo di direzione artistica/percettiva, nessuna prescrizione tecnica
— traduzione tecnica interamente a cura dell'Ingegneria di Brain.

## 2. Traduzione Tecnica Sezione Per Sezione

- **§1 Contorno vivo / §2 Respirazione** → nuovo layer "contorno" baked a
  preparazione (`contourCore`/`contourFaint`, due soglie sullo stesso
  gradiente Sobel già calcolato per i frammenti d'inchiostro — zero costo
  aggiuntivo di analisi). A runtime, spessore/sdoppiamento/densità del
  contorno modulati da un inviluppo di respirazione lento e
  silenzio-gated (`advanceContourBreathingPhase`, stesso pattern di
  `advanceBauhausAbstraction`: avanza solo con `activity > 0`, mai un
  orologio libero — Check Silenzio).
- **§3 Freeze / §4 Impulso / §5 Alternanza** → macchina a stati pura
  `PrintLifePhase = 'vivo' | 'freeze' | 'impulso' | 'decadimento'`
  (`advancePrintLifeState`), innescata dal fronte di salita di
  `flash.active` — lo stesso "evento significativo" già previsto
  dall'architettura di Brain (§10 del brief: "non ridefinisce il
  significato... di tali informazioni"), motore flash Control
  (`docs/pipeline-audio.md` §4: deliberatamente raro, soglia doppia
  energia+transiente, non il beat). Durante `freeze` il motion smoother
  non avanza (le lastre "si bloccano" davvero, non solo visivamente:
  `motionSmoother.update()` non viene chiamato) e la respirazione del
  contorno si azzera. `impulso` spinge un `impulseDrive` (scala su
  `flash.intensity`) che alza temporaneamente registro/bloom
  d'inchiostro/contrasto del retino; `decadimento` lo riporta a zero con
  smootherstep su ~620ms.
- **§6 Psichedelia** → esplicitamente niente rotazioni/oscillazioni
  ampie/scale pulsanti aggiuntive: gli effetti nuovi sono tutti
  disallineamento di contorno, sdoppiamento, moiré, mai trasformazioni
  globali.
- **§7 Retino/moiré** → durante `impulso`/attività alta, un secondo
  disegno "eco" della lastra attiva a scala/rotazione leggermente diverse
  produce interferenza moiré reale (due retini periodici quasi
  sovrapposti), non un filtro posticcio.
- **§8 Frammenti d'inchiostro** → i frammenti guadagnano un'eco
  sfumata/traslata (1-2 tratti addizionali a opacità decrescente) invece
  di un solo disegno secco — "sbavatura" più che oggetto indipendente.
- **§9 Movimento delle lastre** → ampiezze di
  `depth/propagation/dislocation/chromaticPx` e `layerScale/layerSkew`
  in `calculateBrainPrint2dMotion` ridotte (nuovo `PLATE_MOTION_SCALE`)
  per lo stato "vivo" ordinario; il disallineamento resta (richiesto
  esplicitamente al §12) ma non domina più la lettura. Durante `impulso`
  lo stesso disallineamento riceve uno scarto temporaneo più marcato
  (colpo, non danza continua).
- **§11 Quiete** → conseguenza diretta del Check Silenzio già applicato
  ovunque nel renderer: tutti gli inviluppi nuovi derivano da
  `activity`/`beatEnvelope`, quindi si azzerano da soli in silenzio senza
  bisogno di un ramo dedicato.
- **§12 Cosa preservare** → i 7 preset (`BRAIN_PRINT2D_MODES`) restano
  distinti nella loro composizione di lastre/frammenti; il layer contorno
  e la macchina vivo/freeze/impulso sono un'unica passata condivisa
  applicata sopra a tutti, non un ottavo renderer.

## 3. Validazione

Funzioni pure nuove testate senza mock di canvas (`advancePrintLifeState`,
`computePrintLifeEnvelope`, `advanceContourBreathingPhase`), stesso stile
già in uso nel file per `calculateBrainPrint2dMotion`/
`calculateBrainPrint2dLayerMorph`.

## 4. Protocollo Obbligatorio Di Verifica Filosofia Visiva (`agents.md`)

Verifica esplicita, non sulla carta — fatta a codice scritto, rileggendo
ogni punto sull'implementazione reale:

1. **Check Camera** — PASS. Nessuna trasformazione dell'intera
   composizione/camera. L'unico punto vicino al limite è l'eco moiré
   (§7): `translate/rotate/scale` applicati a UNA singola lastra colore
   già composita (`screen[activeScreen]`), in `difference` a bassa
   opacità, con rotazione max ~2.2° e scala max ~2.6% al picco
   dell'impulso — un micro-disallineamento di una porzione di materia
   sopra al quadro già disegnato, non il quadro stesso che ruota/scala.
   Rientra esplicitamente nell'eccezione ammessa dal Check ("deformazioni
   locali... micro-disallineamenti applicati a porzioni della materia").
2. **Check Materia** — PASS. Contorno, respirazione, moiré e scia
   d'inchiostro sono tutti trasformazioni di retino/soglia/opacità/
   registro dentro la materia serigrafica esistente; il raster resta la
   fonte diretta di ogni layer (screenprint/ink/contour derivano tutti
   dallo stesso bitmap sorgente), mai rimpiazzato.
3. **Check Silenzio** — PASS, verificato esplicitamente: in silenzio
   totale `motion.activity = 0` e il motion smoother resetta tutti i
   canali a zero; `breathingPhase` non avanza (gated su `activity > 0` in
   `advanceContourBreathingPhase`) quindi il contorno resta STATICO (non
   pulsa da solo), la doppiatura (`computeContourDoubling`) si azzera
   (dipende da `activity`/`midDrive`/`impulseDrive`, tutti a zero). Resta
   visibile ma immobile — esattamente quanto il Check permette
   ("l'immagine e i suoi livelli possono restare visibili e stabili").
   Il freeze/impulso stesso non può scattare in vero silenzio: il motore
   flash Control richiede soglie energia+transiente reali per attivarsi.
4. **Check Beatmatch** — PASS. `beatEnvelope`/`beatPulse` modulano
   spessore/contrasto locali (ampiezza), `mid` guida solo la doppiatura
   del contorno (dettaglio secondario) — nessuna banda muove il quadro.
5. **Check Transizione** — PASS, invariato. La logica di transizione fra
   immagini (`calculateBrainPrint2dLayerMorph`, stagger per lastra) non è
   stata toccata da questo piano.
6. **Check Alternanza** — N/A, non pertinente a questa modifica.
7. **Check Costo** — PASS. `contourCore`/`contourFaint` riusano il
   gradiente Sobel già calcolato per i frammenti d'inchiostro (zero
   passate di analisi aggiuntive), baked una sola volta a preparazione
   (non per frame). Il costo per fotogramma aggiunto è un numero fisso e
   piccolo di `drawImage` extra (contorno core/faint, eco moiré, scia
   d'inchiostro) alla stessa risoluzione già in uso — nessun nuovo
   `getImageData`/loop per-pixel nel ciclo di rendering.
