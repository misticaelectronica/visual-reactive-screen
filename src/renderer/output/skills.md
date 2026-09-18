# src/renderer/output/skills.md

Skill operative per `src/renderer/output`.

## Skill: Osservare E Far Crescere Coscienza Onirica

Usare per modifiche a `brain/coscienzaCore.ts`, `brain/coscienzaOnirica.ts`, al
controller Brain o alla memoria autobiografica.

Prima di scrivere codice:

1. Leggere la skill root `Evolvere Coscienza Onirica` e il Piano di Lavoro
   attivo; il salvataggio rileggerà poi `.coscienza/AGENT.md`.
2. Identificare l'evento percettivo reale e il confine dell'episodio.
3. Stabilire se il contenuto è osservato, interpretato o immaginato.
4. Verificare se si sta creando un ricordo, una relazione o una revisione.
5. Conservare origine, provenienza e versione precedente.

Verifiche minime:

- una sola origine anche dopo retry/reload;
- ritorno all'origine tracciato senza reset del grafo;
- checkpoint soltanto su confini significativi;
- ristrutturazione non distruttiva e motivata;
- limiti di costo coerenti con `lowPowerMode`;
- nessuna regressione al ciclo narrativo e visuale esistente.
- ogni storia usa una chiave idempotente e resta classificata come
  `imagination`.
- ogni storia ha un `invariant` non vuoto e i 4 fotogrammi restano
  associati a Soglia/Metamorfosi/Condensazione/Eco via
  `deriveOneiricPhase` (`dreamRevisionCycle.ts`) — non un enum nuovo, non
  una posizione dedotta a occhio (PIANO-046).
- il prompt raster (`buildPsychedelImagePrompt`) resta momento corrente +
  invariante + Color Direction; non reintrodurre stimolo associato, residuo
  del fotogramma precedente o argomento generale come blocchi concorrenti.
- il presente separa percezione, attenzione e interpretazione;
- nessun checkpoint nasce prima di `audioPrimed`;
- attenzione stabile e continuità non producono scritture nervose;
- `lowPowerMode` dirada i checkpoint di continuità.

## Skill: Debug Output Nero

Passi:

1. Verificare overlay `fxOutput`.
2. Verificare `msgs`.
3. Verificare ultimo colore.
4. Premere `Test flash`.
5. Se `msgs` resta 0, controllare preload/IPC.
6. Se `msgs` cresce ma colore e' scuro, controllare visual engine/settings.

## Skill: Gestione Morphing Controller

Passi:

1. Calcolare chiave algoritmo/preset.
2. Se algoritmo cambia, distruggere controller vecchio.
3. Se `useMorphing` false, distruggere tutto.
4. Se dynamic preset attivo, crossfade tra controller.
5. Aggiornare sempre `__settings` e `__key`.

## Skill: Performance Canvas

Controlli:

- RAF cancellato in `destroy()`
- resize listener rimosso
- canvas rimosso dal DOM
- DPR limitato
- blur e trail sotto controllo
- PsyHypMorphing non supera budget senza test reale
- `lowPowerMode` riduce FPS/layer o qualita' senza cambiare preset

## Skill: Accordare Movimento Musicale

Usare quando il visual e' troppo nervoso, troppo lento o poco musicale.

Controlli:

- `settings.motionProfile` arriva a Liquid, Oniric e PsyHyp.
- `dub` usa envelope elastici e sub morbido.
- `techno` usa pulse clampato e non deve inseguire ogni micro-transiente.
- `ambient` usa smoothing alto e movimenti continui.
- evitare gain diretti troppo alti su `kickPulse`, `beatDrive`, `highTension`, `bodyTwist`.
- preferire envelope/release e limiti sul raggio/opacita' rispetto a scatti frame-by-frame.

## Skill: Preset Morphing

Regole:

- Liquid/Oniric leggono `MORPHING_PRESETS` e `MORPHING_THEME_PROFILES`.
- PsyHyp legge `PSY_HYP_MORPHING_PRESETS`.
- `alien-contact` deve restare disponibile in tutti e tre gli algoritmi.
- I preset materici `solchi-abitudine`, `materia-malleabile`, `percorsi-laterali`, `impronte-lavate` devono restare in UI e rotazione.
- Il cambio preset PsyHyp deve fare transizione morbida e non reset visivo secco.

## Skill: Cambiare Checkpoint Immagini Brain

Usare quando si sostituisce il modello SD 1.5 usato da Psichedel per generare
immagini (es. passaggio a Realistic Vision V6.0 B1). Procedura completa in
`docs/psychedel-explicit-v1.md` § "Sostituzione del checkpoint (procedura
manuale)".

Passi in breve:

1. Convertire il checkpoint sorgente in ONNX FP16 offline (fuori repo);
   riusare il VAE SD 1.5 condiviso già nel manifesto, non duplicarlo.
2. Depositare i due file (`text_encoder/model.onnx`, `unet/model.onnx`) in una
   cartella nuova sotto `.model-artifacts/` (dev) o `brain-models/` (prod).
3. Aggiornare in ordine: `imageModelManifest.ts`, `brainConfig.ts`,
   `brainModelProtocol.ts` (`ALLOWED_MODEL_FILES`),
   `psychedelModelPrototype.ts`, `brainModelCache.ts`, i test collegati.
4. Far girare `src/shared/brain/imageModelArtifacts.test.ts` (carica i pesi
   locali con `onnxruntime-node`, CPU, niente browser): intercetta un grafo
   con tipi incoerenti prima ancora del collaudo WebGPU.
5. Collaudare almeno tre generazioni reali via WebGPU col vecchio modello
   ancora presente sul disco.
6. Solo dopo il collaudo riuscito, cancellare a mano la cartella del vecchio
   modello.

Regole:

- un solo modello attivo per volta su disco: mai lasciare più checkpoint
  residenti dopo una sostituzione riuscita;
- se il collaudo del punto 5 fallisce, non cancellare il vecchio modello: resta
  quello attivo;
- non introdurre un downloader/switch automatico: il cambio è manuale, per
  scelta esplicita del Capo Supremo;
- per convertire un checkpoint sorgente in FP16, usare l'export diretto
  `optimum-cli --dtype fp16` e MAI la conversione post-hoc con
  `onnxconverter_common.float16` su architetture CLIP+UNet: lascia nodi `Cast`
  con tipo dichiarato incoerente e il modello viene rifiutato in silenzio da
  `onnxruntime` (la generazione "non parte" senza errore visibile). Successo
  reale il 2026-09-17 con Realistic Vision V6.0 B1.

**Qualità volti/figure ("facce sfatte", collaudo 2026-09-17)**: la causa più
probabile non è il checkpoint ma pochi step di denoising —
`DEFAULT_BRAIN_RENDERING_CONFIG.image` in `brainRenderingConfig.ts` aveva
`standardSteps: 8` (troppo pochi perché SD 1.5 converga su un volto
leggibile). Alzati a `standardSteps: 12`, `enhancedSteps: 16`,
`qualitySteps: 24`; `interludeSteps` lasciato a 4 di proposito (fotogrammi
eco/transizione a bassa risoluzione, mai pensati per la leggibilità del
volto — vedi anche il gate `interlude` per PsicoFantasma nella skill
"Renderer Brain"). Scartata l'alternativa "negative prompt" (termine tipo
"deformed face, bad anatomy"): questo adapter è "Explicit V1" — un
negative-prompt generico rischia di contenere termini (es. "nsfw") che
andrebbero contro lo scopo dichiarato del prodotto ("prompt Explicit
preservato e immagine non oscurata", `docs/psychedel-explicit-v1.md`) — non
introdurlo senza una revisione esplicita dei termini col Capo Supremo.
Se il collaudo mostra che più step non bastano, la prossima leva è la
risoluzione (oggi 640×360 anche in high-quality, un aspect ratio insolito
per un checkpoint SD 1.5 può favorire volti duplicati/deformati), non
ancora esplorata perché più costosa (GPU/thermal, e cambia assunzioni di
layout a valle).

## Skill: Color Direction (prompt immagine Psichedel)

Usare quando si modifica l'identità cromatica ORIGINALE con cui Stable
Diffusion genera l'immagine, o quando un collaudo mostra che le immagini
generate risultano troppo brillanti/desaturate/sottoesposte.

File chiave:

- `src/renderer/output/brain/brainColorState.ts` —
  `buildColorDirectionBlock(seedKey)`: un blocco testuale inglese
  `COLOR DIRECTION:` sempre uguale nella grammatica percettiva (competizione
  cromatica, contrasto, continuità, saturazione relativa, accenti, densità/
  leggibilità delle ombre), variabile solo nella famiglia di palette scelta.
- `src/renderer/output/brain/psichedel.ts` —
  `buildPsychedelImagePrompt(story, frame, attempt, mode)` appende il
  blocco dopo `Main argument`, incondizionatamente, per ogni fotogramma.

Fondamento del contenuto (teoria del colore / psicologia del colore /
bioenergetica come riferimento fenomenologico, non biologico): **niente
mapping colore→emozione** (mai "rosso = tensione"). Il testo descrive solo
relazioni percettive (competizione, contrasto, continuità, densità,
saturazione relativa, accenti); le famiglie di palette (graphite, petroleum,
rust, dark burgundy, blackened green, deep violet, burnt earth, dark amber,
blue-grey, dirty mauve) sono una scelta Visual compatibile con quella
direzione, non una conseguenza scientifica dei tre riferimenti citati.

**Contesto CLIP — correzione PIANO-045 (2026-09-17)**:
il text encoder conserva finestre di 77 posizioni (75 token di contenuto +
BOS/EOS), ma l'UNet locale accetta una sequenza dinamica. Il runtime SD1.5
ora tokenizza senza troncamento, codifica tutti i blocchi separatamente e
concatena gli embeddings lungo l'asse della sequenza, mantenendo distinti
condizionato e non condizionato. Budget massimo: 6 blocchi / 450 token di
contenuto; oltre il budget errore esplicito, mai perdita silenziosa della
coda. Il log riporta token, blocchi e millisecondi di codifica. Il backend
legacy non supporta tale estensione e rifiuta l'overflow invece di troncarlo.

Il prompt conserva momento corrente, stimolo associato, residuo precedente,
argomento e COLOR DIRECTION, senza riscrivere il testo. La prova di aggiungere
l'intera sinossi a ogni prompt è stata ritirata: sul caso controllato il
medesimo oggetto prevaleva sulle azioni dei momenti. Non confondere consegna
dei token al modello con obbedienza visiva: la seconda richiede ispezione
dei raster. Il costo di cross-attention cresce con i blocchi; confrontare
tempi a caldo alla stessa geometria e stesso numero di step. Non alzare le
posizioni CLIP a 462: concatenare gli embeddings di sei finestre da 77 non
equivale a un encoder con 462 posizioni.

Principio non negoziabile (correzione Vice Consigliere, 2026-09-17, dopo un
primo tentativo scartato): **la direzione cromatica NON deve dipendere da
nessuno stato**. Niente `BrainBioRegime`, niente pressione/decompressione/
respiro, niente Audio. È lo stesso identico meccanismo indipendentemente da
cosa sta suonando o da come si sta comportando l'ascoltatore — l'unica
variabilità ammessa è fra famiglie di palette dentro la stessa direzione
cromatica, per evitare un recoloring ripetitivo identico a ogni immagine.
Se in futuro qualcuno propone di far dipendere `buildColorDirectionBlock` da
un regime/stato, è un errore già commesso una volta: verificare col Capo
Supremo prima di reintrodurlo.

Dettagli tecnici:

- la variante di palette è scelta con un hash deterministico su
  `storyId:frameId` (FNV-1a + avalanche splitmix32 — un hash a bassa
  diffusione su chiavi quasi identiche sceglierebbe sempre la stessa
  variante, stesso limite già visto per `hashUnit` su indici piccoli, vedi
  skill "Renderer Brain").
- il testo narrativo (`framePrompt`/`Associated stimulus`/`Residual visual
  trace`/`Main argument`) resta intatto: `COLOR DIRECTION` è un blocco
  separato e identificabile, mai una riscrittura.
- `paletteMemory` dedicata NON implementata: la continuità cromatica fra
  fotogrammi si affida al `Residual visual trace` già esistente, che non ha
  responsabilità specifiche sul colore.
- collaudo: confrontare generazioni con/senza `COLOR DIRECTION` e verificare
  a schermo che i colori brillanti calino, la palette risulti più cupa, le
  ombre mantengano dettaglio e l'immagine non diventi semplicemente
  sottoesposta — non automatizzabile in unit test (richiede un raster
  reale), coperto solo per struttura/variabilità/testo da
  `brainColorState.test.ts`.

## Skill: Varco Percettivo (scurimento pre-flash)

Usare quando si tocca il mascheramento visivo dello stallo GPU
(`setResourcePressure`/flash/glitch/passthrough) in
`src/renderer/output/brain/brainRendererHost.ts`, o quando in collaudo dal
vivo si vede "prima lag, poi entra il Varco" invece di un mascheramento
fluido.

File chiave: `src/renderer/output/brain/brainRendererHost.ts`, funzione
`update()` intorno a `pressureFlashStartedAt`.

Cosa fa (aggiunto 2026-09-17, Capo Supremo in collaudo): dal 2026-09-17 il
Varco ha una fase in più PRIMA di flash+glitch, non al loro posto —
`PRESSURE_DARKEN_MS = 140` (triangolare: sale e ridiscende dentro la
propria finestra), armata dallo stesso segnale (`setResourcePressure`,
overlay separato `[data-brain-pressure-darken="true"]`, nero,
`mixBlendMode: multiply`). Il timeline di `pressureFlashStartedAt` ora
copre darken+flash+glitch insieme: `elapsed < PRESSURE_DARKEN_MS` → solo
scurimento, flash/glitch restano a zero; oltre, il flash usa
`elapsed - PRESSURE_DARKEN_MS` come proprio orologio (stessa logica di
`holding` per il passthrough non pronto, invariata). Rispetta il
moltiplicatore di regime (`pressureFlashRegimeMultipliers`, zero in
respiro-profondo) come il flash.

**Non ancora dimostrato che risolva la causa reale**: l'indagine sul "lag
prima del Varco" segnalato dal Capo Supremo ha escluso l'ipotesi più ovvia
(il calcolo pixel-per-pixel di FilterPsiche non è il colpevole: sotto
pressione usa già `LOW_POWER_WIDTH/HEIGHT` = 320×180, troppo leggero per
spiegare un freeze percepibile). Il sospetto più solido è **contesa GPU
reale fra l'inferenza WebGPU e il compositor** che deve disegnare
flash/glitch — non risolvibile lato JS, e semmai aggravata dall'aumento
degli step di denoising (`brainRenderingConfig.ts`, voce sopra). Lo
scurimento anticipato è stato costruito perché è comunque un miglioramento
concreto (la prima cosa a schermo quando lo stallo comincia è un'intenzione
visiva, non il fotogramma congelato a nudo), non perché elimini la causa.
Se il collaudo dal vivo mostra ancora un salto secco, correlare col log
`'gap RAF: estendo la pausa prima della prossima inferenza'` di
`brainThermalScheduler.ts` per confermare se è un vero gap RAF/GPU prima di
cercare altrove.

## Skill: Ciclo Di Revisione / Riattivazione (memoria immagini)

Usare quando si tocca quali immagini rientrano nella Riattivazione (PIANO-034:
generazione sospesa, ritorno di immagini già generate con morphing
intensificato) o la loro selezione per qualità.

File chiave:

- `src/shared/brain/dreamRevisionCycle.ts` — funzioni pure:
  `selectRevisionStoryImages` (top-N per qualità di generazione, poi
  riordinate per `frameIndex`), `RevisionSessionMemory` (memoria stabile
  della sola sessione corrente: `remember`/`selectionFor`/`imagesBefore`/
  `selectionsBefore`).
- `src/renderer/output/brain/brainController.ts` — `rememberCompletedStory`
  (fissa la terna per una storia appena chiusa) e
  `requestRevisionCycleAtBoundary` (assembla le immagini delle storie
  precedenti per la Riattivazione).

Regole (disposizione Capo Supremo, 2026-09-17):

- una storia nata da un'influenza di Coscienza Onirica
  (`story.consciousnessInfluence`, il "moto di coscienza" — pausa
  percettiva su un ricordo richiamato) **non entra mai** nella memoria di
  Riattivazione: `rememberCompletedStory` la scarta esplicitamente, prima
  ancora di calcolare la terna. Quelle immagini hanno già avuto la propria
  rievocazione dedicata, non devono tornare una seconda volta come eco
  generica.
- solo le `REVISION_CYCLE_RECENT_FULL_STORIES` (2) storie più recenti
  contribuiscono con la terna intera; le storie più vecchie si riducono a
  `REVISION_CYCLE_OLDER_STORY_IMAGE_COUNT` (2) immagini, le migliori per
  qualità di generazione (`RevisionImageRenderMode`, stessa scala di
  `selectRevisionStoryImages`) — non le 2 più vicine nel fotogramma, le 2
  con la resa migliore. Implementato in
  `requestRevisionCycleAtBoundary` riapplicando `selectRevisionStoryImages`
  alle sole storie oltre le 2 più recenti, usando `selectionsBefore` (non
  `imagesBefore`, che appiattisce e perde il confine fra storie).
- per rendere possibile il ranking a posteriori, `RevisionSessionImage`
  porta ora anche `renderMode` (non solo `storyId`/`frameId`/`title`/
  `energy`/`raster`): senza, dopo `selectRevisionStoryImages` la qualità
  originale è persa (l'array torna riordinato per `frameIndex`, non per
  qualità) e non si potrebbe più scegliere "le migliori 2 delle 3" a
  distanza di più storie.
- `imagesBefore` resta invariato (usato altrove, ha test propri): è ora
  implementato sopra `selectionsBefore`, stesso comportamento, non
  duplicazione.

## Skill: Fallback Visivo

Usare quando debugging output/proiezione.

Regole:

- fallback deve essere visibile ma non confondersi con visual live
- rimuovere o nascondere overlay se non richiesto in build finale
- base surface iniziale non deve essere nero assoluto durante diagnostica
