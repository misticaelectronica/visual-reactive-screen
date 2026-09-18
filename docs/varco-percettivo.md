# Varco Percettivo

Nome condiviso con la Direzione VJ (Capo Supremo del Visual, su sua
richiesta esplicita) per il mix di render usato quando la visuale reale
sta per interrompersi da sovraccarico. Non è un effetto diverso per ogni
occasione: è un unico linguaggio visivo, riusato ovunque la continuità
visiva stia per rompersi.

## Di cosa è fatto

Tre elementi sovrapposti, gestiti in
[`brainRendererHost.ts`](../src/renderer/output/brain/brainRendererHost.ts):

1. **Flash** — overlay bianco con attacco/decadimento (`PRESSURE_FLASH_ATTACK_MS`
   32ms, `PRESSURE_FLASH_DECAY_MS` 220ms, opacità di picco 0.85). Resta al
   picco finché il passthrough non è davvero pronto, non per un tempo
   fisso — la preparazione del passthrough (`createImageBitmap` +
   trasformazione pixel per pixel, tre varianti) può richiedere 1-2s, più
   del breve flash pensato per un cambio istantaneo.
2. **Strisce glitch** — 7 strisce tagliate/sfalsate (`PRESSURE_GLITCH_SLICE_COUNT`),
   offset massimo 26px, tre tinte cromatiche, opacità di picco 0.7. Tecnica
   VJ comune per far leggere un taglio tecnico come un accento voluto
   invece che come un difetto.
3. **Mix passthrough FilterPsiche/Psycho2D** — FilterPsiche come strato
   principale (`denoisingFilterPsiche`), Psycho2D sovrapposto in
   `mix-blend-mode: lighten` come secondo strato più leggero
   (`denoisingPsycho2d`, `DENOISING_MIX_OPACITY_FACTOR` 0.6) — un accento
   di movimento in più durante il denoising, non un secondo renderer a
   pieno carico.

## Quando scatta

Un solo segnale booleano (`resourcePressure`/`setResourcePressure`,
guidato da `visualPressurePulseUntil` in
[`brainController.ts`](../src/renderer/output/brain/brainController.ts)),
tre trigger distinti che lo armano:

1. **Reattivo** — il `thermalScheduler` rileva un gap RAF reale già
   avvenuto (`reportThermalEvent`, evento `long-frame`). Il salto visivo
   fra l'ultimo fotogramma fermo e il passthrough arriva quindi sempre a
   stallo già in corso: non eliminabile con uno scheduling più furbo, va
   mascherato.
2. **Proattivo** — prima di ogni chiamata GPU di `Psichedel.generate()`
   (`armVisualPressureBeforeGpuLoad`, *awaited* prima di iniziare
   l'inferenza, non dopo lo stallo): rosso (flash/glitch/mix armati) →
   breve attesa di `PROACTIVE_PRESSURE_LEAD_MS` (260ms) perché il
   crossfade sia già in scena → verde (si procede con l'inferenza). Se il
   passthrough è già attivo (fotogrammi ravvicinati della stessa storia)
   non si attende di nuovo. **Il Varco poi resta acceso per tutta la
   durata dell'inferenza di quel fotogramma** (latch `imageInferenceActive`
   in `brainController.ts`, alzato dopo l'arm e abbassato al `finally` di
   `onImageGenerationState(false)` in `psichedel.ts`), non per un tempo
   fisso: la finestra a impulso `VISUAL_PRESSURE_PULSE_MS` (2,5s) era più
   corta del fotogramma da coprire (4,6–11,7s nei log) e lasciava scoperto
   il centro del fotogramma, dove i gap RAF venivano mascherati solo a
   posteriori dall'evento reattivo `long-frame`.
3. **Moto di coscienza** — armato già quando il candidato viene messo "in
   coda" (`consciousnessMotionLayer.offer()` accettato, dentro
   `requestConsciousnessInfluence`), non quando diventa attivo: da lì
   all'attivazione vera passa fino a un'intera durata di beat (il layer
   aspetta `rhythm.beat`, non un timer fisso). Costante dedicata
   `CONSCIOUSNESS_MOTION_PULSE_LEAD_MS` (4000ms), più generosa del breve
   impulso GPU per sopravvivere a un beat irregolare; il fronte di salita
   dell'attivazione resta comunque armato come rete di sicurezza finale.
   La timeline della storia si congela all'inizio del moto di coscienza
   esattamente come durante uno stallo GPU — stesso segnale, stesso
   trattamento, non uno nuovo.

## Regola generale: armare in coda, non al fronte di salita

Quando un segnale deve mascherare una preparazione a valle che richiede tempo
(crossfade, caricamento, qualunque cosa non sia istantanea), **armarlo sul
fronte di salita dell'evento che la preparazione sta mascherando non basta**:
il segnale parte nello stesso istante in cui il candidato diventa attivo, ma
la preparazione a valle (qui: il crossfade che deve entrare in scena) ha
bisogno di un margine che il fronte di salita, per definizione, non lascia.
Risultato: il blocco resta visibile perché il segnale parte troppo tardi,
anche se il segnale stesso è corretto.

La correzione non è allungare la costante di durata — è **spostare il punto
di innesco a monte**: armare il segnale quando il candidato *entra in coda*
(diventa un candidato plausibile), non quando *diventa attivo* (viene
selezionato). Il trigger 3 sotto (moto di coscienza) è il caso in cui questo
errore si è manifestato ed è stato corretto; vale come regola per qualunque
nuovo segnale di mascheramento in Brain, non solo per quel trigger — in
particolare per il livello bio-percettivo, che introduce la stessa forma di
problema (un segnale rapido che deve coprire una preparazione lenta a valle).

## Perché non è vietato dal Check Silenzio

Non è reattività musicale: scatta solo sul fronte di salita di una
pressione GPU reale rilevata (o del moto di coscienza), mai su base
audio. L'inviluppo resta quello già in uso — tenuto al picco finché il
passthrough non è davvero pronto, non un tempo fisso legato al ritmo.

## Storia

- Nato per mascherare il carico GPU da denoising: il salto fra l'ultimo
  fotogramma fermo di renderer come Bauhaus/Materia Morph e il
  passthrough leggero è strutturale (il segnale reattivo arriva sempre a
  stallo già avvenuto).
- **Rinforzato** su richiesta esplicita del Capo Supremo ("Glitch+Flash
  più evidenti", 2026-08-25): il mascheramento precedente restava troppo
  discreto per coprire davvero il momento del carico, anche con il
  semaforo proattivo che lo arma in anticipo.
- **Nome condiviso e battezzato** in questa stessa sessione (2026-08-25):
  prima era "il mix FilterPsiche/Psycho2D" senza un nome unico condiviso
  fra Direzione VJ e Ingegneria.
- **Copertura estesa all'intera inferenza immagine** (2026-09-07, direttiva
  del Consigliere del Capo Supremo): il Capo Supremo vedeva uno scatto
  durante la generazione. Analisi dei log: la finestra a impulso da 2,5s,
  armata una volta per fotogramma, era più corta del fotogramma da coprire
  (4,6–11,7s); l'unico meccanismo che la estendeva nel corpo era l'evento
  reattivo `long-frame`, in ritardo per costruzione. Correzione: latch che
  tiene il Varco acceso per tutta la durata del carico GPU reale (arm
  invariato a monte, spegnimento all'`onImageGenerationState(false)`).
  Interventi "alza soglia rilevatore long-frame" e "cooldown adattivo"
  (analisi lag) sospesi: la soglia più alta esporrebbe di più il centro
  del fotogramma, si rivedono a copertura sistemata.
- **Esteso al moto di coscienza** (PIANO-039bis, 2026-08-25): la timeline
  che si congela a inizio moto di coscienza usa lo stesso segnale, non un
  effetto dedicato nuovo. Prima correzione insufficiente (segnalato dal
  Capo Supremo dopo verifica dal vivo) — caso d'origine della regola
  generale "armare in coda, non al fronte di salita" sopra.
- **Escluso dalla Riattivazione** (2026-09-17, segnalato dal Capo Supremo):
  `imageInferenceActive` resta vero durante la Riattivazione quando la
  generazione della storia successiva vera continua in sottofondo
  (`requestRevisionCycleAtBoundary` può entrare "anche mentre la storia
  successiva non è ancora pronta"), ma quel carico GPU riguarda un
  fotogramma diverso da quello in scena — il replay a memoria della
  Riattivazione non ha alcuno stallo proprio da mascherare. `render()` in
  `brainController.ts` ora azzera `resourcePressureActive` quando
  `revisionCycleActive` è vero, indipendentemente dal latch
  `imageInferenceActive`/`visualPressurePulseUntil`.

## Meccanismo adiacente ma distinto: passthrough per fallimento qualità

Un renderer che fallisce il proprio controllo qualità interno
(`hasFailed()`, es. Vector Morph "meno di cinque forme riconoscibili") non
recupera da solo: la rete di sicurezza dell'host mostra un passthrough
(Print2D durante la Riattivazione, FilterPsiche altrimenti) tramite
`onRendererFailed` → `BrainRendererSelector.reportRendererFailure()`. È un
passthrough di renderer, non il Varco Percettivo — non usa
flash/glitch/`resourcePressure`, non va confuso con questo meccanismo.

## File coinvolti

- [`brainRendererHost.ts`](../src/renderer/output/brain/brainRendererHost.ts) — implementazione (flash, glitch, i due layer di mix, `setResourcePressure`).
- [`brainController.ts`](../src/renderer/output/brain/brainController.ts) — i tre trigger (`reportThermalEvent`, `armVisualPressureBeforeGpuLoad`, il blocco moto di coscienza) e `visualPressurePulseUntil`.
- [`working/STATE.md`](../working/STATE.md) — cronologia delle sessioni in cui è stato introdotto, rinforzato e battezzato.
- [`skills.md`](../skills.md) — nota tecnica su `resourcePressure` come unica fonte di verità per `shouldSuspendPlugin` (non `offlineHold`).
