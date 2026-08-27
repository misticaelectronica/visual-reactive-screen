# Sistema a Plugin dei Renderer Brain

Documento tecnico per l'Analisi Audio e la Direzione Visual: il contratto completo (comprese le parti che [`architettura-brain-visual-reactive-screen.md`](architettura-brain-visual-reactive-screen.md) §4 omette per brevità — readiness, failure, morph shapes, resource pressure), il ciclo di vita gestito da `brainRendererHost.ts`, come `brainRendererSelector.ts` risolve le tre modalità, e cosa serve per aggiungere o estendere un plugin oggi.

Non esisteva un documento dedicato a questo prima di ora — le informazioni erano sparse fra `brainRendererPlugin.ts`, `brainSvgScene.ts`, `brainRendererHost.ts`, `brainRendererSelector.ts` e i commenti nei singoli renderer.

## 1. Il contratto: `BrainRendererPlugin` e `BrainSceneRendererController`

File: `src/renderer/output/brain/brainRendererPlugin.ts`, `brainSvgScene.ts:308-331`.

```ts
type BrainRendererPluginContext = {
  container: HTMLElement
  scene: PsychedelScene
  raster: Blob
  palette: DreamStory['palette']
  printMode: BrainPrint2dMode
  getImageSources: () => BrainRendererImageSource[]
  getVectorScene: () => Promise<PsychedelScene>
  frameEnergy: number
  frameIndex: number
  frameCount: number
}

type BrainRendererPlugin = {
  id: BrainRendererId
  label: string
  capabilities: {
    multipleImages: boolean
    semanticMetadata: boolean
    lowPowerMode: boolean
  }
  create: (context: BrainRendererPluginContext) => BrainSceneRendererController
}

type BrainSceneRendererController = {
  element: HTMLElement | SVGSVGElement
  isReady?: () => boolean
  hasFailed?: () => boolean
  setOpacity: (opacity: number) => void
  getMorphShapes: () => BrainMorphShape[]
  setMorphPattern: (pattern: BrainFrameMorphPattern) => void
  setResourcePressure: (active: boolean) => void
  setOfflineHold?: (active: boolean) => void
  setTransition: (
    progress: number,
    role: 'enter' | 'exit',
    counterpartShapes?: BrainMorphShape[],
  ) => void
  update: (
    bands: BandEnergies,
    settings: AppSettings,
    time: number,
    rhythm?: BrainRhythmState,
    movingAverages?: BandEnergies,
    flash?: BrainFlashState,
  ) => void
  destroy: () => void
}
```

Un plugin è quindi una fabbrica pura: riceve un `context` **una sola volta**, alla creazione, e restituisce un controller che l'host pilota per tutta la vita del layer. `capabilities` è dichiarativo e statico (usato dal registry/host per sapere se il renderer consuma più immagini, metadata semantici, low power), non cambia mai a runtime.

### `context` — cosa arriva una sola volta

- `container`: l'elemento DOM su cui il plugin monta il proprio `element` (canvas o SVG).
- `scene`/`raster`/`palette`: il materiale visivo del fotogramma narrativo corrente.
- `printMode`: unico campo di `context` specifico per un solo plugin (`print2d`) — precedente diretto per "un dato che serve solo a un renderer viaggia comunque nel context comune", non in un canale separato.
- `getImageSources()`/`getVectorScene()`: accessor pull-based per renderer con `capabilities.multipleImages`/vettoriali — il plugin li chiama quando serve, non li riceve push ad ogni frame.
- `frameEnergy`/`frameIndex`/`frameCount`: metadati statici del fotogramma nella storia, non aggiornati a ogni RAF.

### `update()` — cosa arriva a ogni frame, identico per tutti

Tutti i 9 plugin ricevono esattamente la stessa firma: `bands`, `settings` (l'intero `AppSettings`), `time`, `rhythm?` (`BrainRhythmState`, opzionale), `movingAverages?`, `flash?`. Non esiste oggi alcun canale che porti a un singolo plugin un dato che gli altri non vedono.

### Readiness e failure

- `isReady?()`: se assente o `false`, l'host tratta il layer come non ancora pronto (blocca il crossfade in entrata, vedi §3). Implementato tipicamente come "esiste già almeno una risorsa preparata" (`brainMaterialMorphCanvas.ts:485`: `currentSource !== null && prepared.has(currentSource.id)`; `brainPsycho2dWindowCanvas.ts:378`: almeno un asset con `role: 'current'`).
- `hasFailed?()`: flag booleano che il plugin alza internamente quando un proprio controllo qualità fallisce — esempio concreto in `brainVectorMorphScene.ts:89` (`shapeCount < MIN_VECTOR_SHAPES = 5` → `failed = true`). L'host lo controlla sia sul layer attivo sia su quello entrante (§3); non c'è un contratto su *come* un plugin decide di fallire, solo sul fatto che lo esponga.

### `getMorphShapes()` / `setMorphPattern()`

Il plugin espone le proprie forme correnti (per un eventuale layer di morph condiviso) e riceve un pattern di morph globale (`marea` è il default) da applicare — meccanismo trasversale a tutti i plugin, non specifico di uno.

### `setResourcePressure()` / `setOfflineHold()`

Booleani push dall'host: il plugin decide autonomamente cosa fare (tipicamente: ridurre budget interno — regioni, righe, oggetti — vedi la classificazione renderer in `docs/classificazione-renderer-brain.md`). Nessun plugin riceve un "livello" di pressione, solo un binario.

## 2. Cosa fa `brainRendererHost.ts` — il ciclo di vita

Il host non è un plugin: è l'orchestratore unico che possiede sempre **un layer attivo**, opzionalmente **un layer entrante**, e due layer speciali di passthrough (`filter-psiche`/`psycho2d` per il denoising).

### Creazione

`createLayer(id, now)` — risolve il plugin dal registry (fallback a `print2d` se l'id non esiste), crea un `<div>` layer, chiama `plugin.create({...pluginContext, container: layerRoot})`, e applica subito lo stato host corrente al nuovo controller (`morphPattern`, `resourcePressure`, `transitionProgress/Role`). L'host mantiene lo stato "di sistema" e lo re-impone a ogni nuovo layer creato, incluso quello entrante — un plugin non deve preoccuparsi di leggere lo stato pregresso da solo.

### Richiesta di cambio renderer

`requestRenderer(id, now)`: se `id` è già l'attivo, cancella un eventuale cambio in corso; altrimenti prova a creare il layer entrante (`incoming`), a opacità 0. Se la creazione lancia un'eccezione, l'host la logga e resta sul renderer attivo — un plugin che fallisce alla creazione non blocca l'host. C'è un cooldown per-id (`retryRendererAfter`) usato dopo un fallimento (§ sotto) per non ritentare subito lo stesso renderer.

### Crossfade

Il crossfade parte solo quando `incoming.isReady() !== false` **e** non prima che `transitionProgress` del layer attivo sia arrivato a 1 in modalità `enter` (`frameTransitionComplete`, riga 462) — cioè non si sovrappone mai un cambio di renderer a una transizione narrativa fra fotogrammi ancora in corso. Durata `SWITCH_DURATION_MS = 1800`ms, ridotta al 60% (`×0.6`) sotto `lowPowerMode`, `resourcePressure` o `offlineHold`. Easing `smootherstep`. Se il layer entrante non diventa pronto entro `SWITCH_TIMEOUT_MS = 15000`ms, l'host lo scarta e mette il suo id in cooldown 10s.

### Fallimento e rete di sicurezza

Due casi distinti:

- **Il layer attivo fallisce** (`active.controller.hasFailed?.() === true`): l'host passa immediatamente alla rete di sicurezza — `print2d` durante la Riattivazione (`getBoostHint?.() === true`), altrimenti `filter-psiche` (scelto perché già usato altrove come passthrough leggero e affidabile). Mette l'id fallito in cooldown 30s e chiama `onRendererFailed?.()` per far avanzare subito il mazzo del selettore (altrimenti la rete di sicurezza resterebbe in scena fino al prossimo cambio naturale, fino a ~20s).
- **Il layer entrante fallisce** durante il crossfade: l'host annulla il cambio, distrugge il layer entrante, mette il suo id in cooldown 30s, e riporta l'attivo a piena opacità.

### Pressione GPU e passthrough di denoising (`resourcePressure`)

Quando `resourcePressure` è vero **e** `BRAIN_CONFIG.lightweightDenoisingRender`, l'host crea (una sola volta, lazy) un layer `filter-psiche` dedicato come passthrough leggero, più un secondo layer `psycho2d` sovrapposto in `lighten` a opacità ridotta (`DENOISING_MIX_OPACITY_FACTOR = 0.6`) — questo è il "MIX Filter-Psiche + Psycho2D" di cui parla il brief Visual (`team/briefs/brief-stato-bio-percettivo-respiro-gpu.md` §22): non è una scelta artistica del momento, è una scelta tecnica già cablata nell'host per coprire lo stallo da denoising. Il renderer attivo continua a essere aggiornato (a fps ridotti, `denoisingPassthroughPluginFps`/`lowPowerDenoisingPassthroughPluginFps`) mentre il passthrough prende progressivamente opacità (crossfade `denoisingPassthroughCrossfadeMs`), finché non è pronto (`passthrough.controller.isReady?.()`). Il **Varco Percettivo** (flash + strisce glitch) è un overlay CSS separato, sempre presente, che copre il fronte di salita della pressione risorse indipendentemente dal renderer di passthrough scelto.

### Distruzione

`destroy()` distrugge tutti i layer esistenti (attivo, entrante, entrambi i passthrough), rimuove gli overlay di pressione e il root DOM. Ogni plugin deve garantire che il proprio `destroy()` interno liberi le proprie risorse (bitmap, listener, timer) — non c'è verifica automatica lato host.

## 3. Come `brainRendererSelector.ts` risolve le tre modalità

`BrainRendererSelector.resolve(settings, now)` restituisce l'id da mostrare, in base a `settings.brainRendererMode`:

- **`manual`**: restituisce sempre `settings.brainRendererId` (validato contro `availableIds`, fallback al primo disponibile).
- **`story-cycle`**: pesca da un mazzo (`storyDeck`) costruito per storia narrativa (`beginStory`/`advanceStoryRenderer`), con hold fra 2 e 3 fotogrammi (`MINIMUM_PERSISTENT_HOLD_FRAMES`/`MAXIMUM_PERSISTENT_HOLD_FRAMES`, ridotto a 1-2 durante la Riattivazione via `getBoostHint`), pesato per esposizione (`exposureWeight` — i renderer visti meno spesso hanno più probabilità di essere scelti) e filtrato da `storyCycleIds()`.
- **automatica/rotazione a tempo**: intervallo fisso (`brainRendererRotationMs`, clampato 10s-120s), con `filter-psiche` che dura 1.5× più a lungo (`FILTER_PSICHE_ROTATION_DURATION_MULTIPLIER`).

### I filtri che si innestano su `storyCycleIds()`

- `STORY_CYCLE_EXCLUDED_RENDERERS = {'print2d'}`: sempre escluso dalla rotazione normale, **tranne** durante la Riattivazione (`boosted === true`), dove invece è l'unico momento in cui compare — per costruzione, non per eccezione occasionale.
- `HEAVY_RENDERERS_UNDER_PRESSURE = {'bauhaus-morph', 'material-morph', 'dream-segmentation', 'fractal-spiral-degeneration'}`: esclusi solo quando `getPressureHint?.()` è vero (pressione GPU reale, non durante la Riattivazione — lì il filtro pressione è disattivato apposta, perché l'alternanza rapidissima della Riattivazione stessa genera gap RAF che il thermalScheduler potrebbe leggere come falsa pressione).
- `AUTOMATICALLY_EXCLUDED_RENDERERS`: oggi vuoto — meccanismo pronto ma non utilizzato, buon punto di innesto se in futuro serve un'esclusione permanente indipendente da story-cycle/pressione (es. eleggibilità per regime di respiro, brief Visual §8).

Il selettore ha anche `reportRendererFailure()`, chiamato dall'host (`onRendererFailed`) per far avanzare subito il mazzo oltre un'entrata fallita.

## 4. Cosa serve oggi per aggiungere o estendere un plugin

### Aggiungere un plugin nuovo

1. Implementare una funzione `create(context): BrainSceneRendererController` (o riusare `createBrainSvgScene` se il renderer è vettoriale/SVG).
2. Implementare almeno `element`, `setOpacity`, `getMorphShapes`, `setMorphPattern`, `setResourcePressure`, `setTransition`, `update`, `destroy`. `isReady`/`hasFailed`/`setOfflineHold` sono opzionali ma fortemente raccomandati se il renderer ha una fase di preparazione asincrona (bitmap, analisi pixel) o un controllo qualità che può fallire.
3. Registrare il plugin in `createDefaultBrainRendererRegistry()` (`brainRendererRegistry.ts`) con `id`, `label`, `capabilities`.
4. Aggiungere l'id al tipo `BrainRendererId` (`src/shared/types.ts`) e a `isBrainRendererId`.
5. Decidere se va incluso in `STORY_CYCLE_EXCLUDED_RENDERERS`, `HEAVY_RENDERERS_UNDER_PRESSURE`, `PERSISTENT_STORY_RENDERERS` (`brainRendererSelector.ts`) — nessuna di queste liste ha un default "sicuro", vanno popolate esplicitamente.
6. Esporre l'opzione nella UI Control (`VisualControls.tsx`) se deve essere selezionabile manualmente.

### Estendere un plugin esistente

Non serve toccare il contratto: un plugin legge da `bands`/`settings`/`rhythm`/`movingAverages`/`flash` tutto ciò che gli serve già oggi. I punti di attenzione sono quelli descritti al §5 (costante vs comportamento nuovo) e al §6 (non esiste un canale per dati percettivi propri di un solo plugin).

## 5. Le tre domande tecniche

### a) Dove passerebbe un nuovo segnale percettivo ai renderer?

Tre vie possibili, con un vincolo strutturale reale da cui partire: **`rhythm` (`BrainRhythmState`) è prodotto interamente lato Output**, da `OutputRhythmClock` a partire dalle bande ricevute via IPC (`docs/pipeline-audio.md` §5) — non viaggia mai da Control, è calcolato lì dov'è usato. **`AppSettings` invece viaggia per intero dentro `VisualStatePayload.settings`** ad ogni frame RAF di Control, attraverso IPC, fino a Output (`docs/pipeline-audio.md` §6) — è un blob di configurazione condiviso da *tutto* il resto dell'app (UI, flash engine, morphing, preset), non un canale pensato per stato derivato in evoluzione continua.

Ne segue che:

- Se il nuovo stato percettivo si calcola **da ciò che Output già riceve** (bande, medie mobili, rhythm) e ha una scala temporale multi-secondo come descritto nei brief Audio, il posto naturale è **accanto a `rhythm`**, o come sua estensione, perché è prodotto localmente in Output esattamente come `rhythm` oggi — nessun costo IPC aggiuntivo, nessuna crescita di un blob già condiviso da sottosistemi non correlati.
- Se invece il calcolo richiede dati che **solo Control possiede** (es. feature non ancora derivate lato Output), allora deve viaggiare come **campo nuovo di `VisualStatePayload`**, accanto a `bandEnergies`/`movingAverages` — non dentro `AppSettings`, che è impostazione utente, non stato derivato dal segnale.
- Infilare uno stato bio-percettivo dentro `AppSettings` sarebbe la scelta più invasiva delle tre: lo farebbe viaggiare per intero a ogni frame anche quando nessun renderer lo consuma, lo mescolerebbe concettualmente con le impostazioni utente (un campo che *l'utente non imposta mai* dentro l'oggetto che rappresenta esattamente ciò che l'utente ha impostato), e lo esporrebbe involontariamente a tutti i punti che oggi leggono `AppSettings` per altri motivi (UI, preset, flash engine).
- **Un argomento in più a `update()`** (quinto parametro accanto a `rhythm`/`movingAverages`/`flash`, es. `perception?: BrainPerceptionState`) è la via meno invasiva in assoluto per farlo *arrivare ai plugin*: stessa forma di `rhythm` oggi, opzionale, nessun impatto su `AppSettings` né su IPC se calcolato in Output.

Sintesi: **il canale meno invasivo è un nuovo argomento di `update()`, alimentato da uno stato calcolato in Output vicino a `rhythm`** (non dentro `rhythm` stesso, per non mescolare la responsabilità di ricostruzione ritmica frame-locale con una memoria multi-secondo che ha un ciclo di vita diverso — vedi criticità già discusse su gap RAF e reset). Se invece emergesse la necessità di feature calcolabili solo in Control, andrebbero prima aggiunte a `VisualStatePayload`, mai a `AppSettings`.

### b) Esiste già un modo perché un plugin dichiari parametri propri?

No. Oggi **tutti i 9 plugin ricevono esattamente la stessa firma di `update()`** e lo stesso `context` (a parte `printMode`, che è nel `context` comune anche se lo legge solo `print2d` — non è un canale per-plugin, è un campo comune quasi mai usato). Non esiste un meccanismo per cui un plugin dichiari "a me serve anche X" e lo riceva senza che X sia già nella firma condivisa. `capabilities` è l'unico segnale dichiarativo esistente, ma è statico e binario (booleano), non un parametro.

Se va inventato, andrebbe scelto fra:

- **Nel `context` di `create()`**: adatto per configurazione statica per-istanza (stesso ruolo di `printMode`/`frameEnergy` oggi) — non adatto per dati che cambiano ad ogni frame, perché `create()` è chiamato una sola volta per layer.
- **In `update()` a ogni frame**: necessario se il dato è dinamico (qualsiasi lettura dello stato bio-percettivo lo è, per definizione). Il modo meno invasivo, coerente con `capabilities`, sarebbe un oggetto opzionale unico e comune a tutti (come proposto sopra), non un parametro diverso per ogni plugin — altrimenti la firma di `BrainSceneRendererController.update()` smette di essere un contratto uguale per tutti e ogni plugin dovrebbe conoscere gli argomenti degli altri per restare tipizzato correttamente.
- **Altrove** (es. un metodo `setPerception()` separato, sul modello di `setMorphPattern`/`setResourcePressure`): valido se il dato cambia più raramente di ogni frame e ha semantica di "stato che persiste finché non richiamato" — coerente con la natura a bassa frequenza di variazione che i brief Audio attribuiscono a persistence/pressureTrend.

Non è quindi "già pronto": è un contratto da estendere consapevolmente, e le opzioni realistiche sono un parametro comune (via `update()` o via un setter dedicato), non una dichiarazione di parametri arbitrari per plugin.

### c) C'è una differenza pratica, visibile nel codice, fra rendere modulabile una costante e aggiungere un comportamento nuovo?

Non c'è un confine imposto dal linguaggio o dal contratto — nessun tipo, lint o struttura distingue le due cose. È visibile solo **nella forma del diff**, e in modo indicativo, non garantito:

- **Costante resa modulabile**: una costante di modulo (`const FIGURE_MAX_ALPHA = 0.5` dentro un file renderer, es. `brainBauhausMorphCanvas.ts`) diventa un campo letto da `settings`/`BRAIN_CONFIG` al posto del valore letterale, **senza cambiare la forma dell'espressione che la usa**. Il diff tipico è: stessa riga, stesso posto nella formula, cambia solo la sorgente del numero. Esempio concreto del pattern già in uso: `BRAIN_CONFIG` (`src/shared/brain/brainConfig.ts`) è pieno di costanti già "promosse" così, con commenti che spesso dicono esplicitamente "da tarare all'ascolto" — è già la via convenzionale per rendere modulabile senza toccare comportamento.
- **Parametro che introduce comportamento nuovo**: aggiunge una condizione, un nuovo stato, un nuovo ramo di calcolo, o cambia *quali* condizioni fanno scattare un effetto — non solo *quanto* forte è un effetto già esistente. Il diff tipico tocca più righe, aggiunge `if`/variabili di stato/nuove chiamate, non sostituisce solo un numero.

Questo è un criterio utile ma non infallibile: una singola riga di codice può nascondere un cambio di comportamento (es. cambiare l'operatore da `+` a `max` in una formula esistente è ancora "una riga", ma cambia cosa succede). Il confine quindi **non è strutturalmente visibile a chi legge solo la forma del diff** — richiede leggere anche cosa fa la riga, non solo quanto è grande il cambiamento. Se il Capo Supremo vuole che la distinzione regga come regola operativa (autorizzazione caso per caso solo per il secondo caso), il criterio pratico più affidabile è: *la costante resa modulabile deve lasciare invariati tutti gli output per ogni possibile valore attuale del parametro (il vecchio comportamento resta un caso particolare raggiungibile)* — se invece anche al valore di default il comportamento osservabile cambia, è un comportamento nuovo, indipendentemente da quante righe tocca il diff.
