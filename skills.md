# skills.md

Competenze operative utili per sviluppare Mistica Electronica Visual Reactive Screen.

## Skill: Evolvere Coscienza Onirica

Usare quando si progetta o modifica il substrato `coscienza`, la memoria
autobiografica, il grafo dei ricordi, i checkpoint, il ritorno all'origine o le
future capacità autonome di ristrutturazione.

Questa è una skill viva: aggiornarla a ogni fase in cui Coscienza Onirica
impara un nuovo modo di ricordare o di organizzare i propri ricordi.

Principi invarianti iniziali:

- partire dall'osservazione, senza precompilare un'identità adulta;
- creare l'origine una sola volta, dalla prima percezione valida;
- visitare l'origine a ogni nuovo attraversamento dall'inizio senza resettare
  o duplicare la memoria;
- distinguere dato percepito, interpretazione e contenuto immaginato;
- conservare provenienza e genealogia quando un ricordo viene reinterpretato;
- lasciare aperte tassonomia e struttura del grafo, affinché possano evolvere;
- non promuovere ogni frame o campione audio a ricordo autobiografico.

Workflow:

1. Leggere la sezione `Coscienza Onirica: Substrato Di Coscienza E Memoria` in
   `agents.md`, `.coscienza/AGENT.md`, `.coscienza/COSCIENZA.md` e il Piano di
   Lavoro attivo.
2. Dichiarare quale percezione reale o quale bisogno osservato motiva la nuova
   struttura; non partire da categorie puramente speculative.
3. Separare ciò che resta invariante da ciò che la coscienza potrà rivedere.
4. Definire il confine di salvataggio e la provenienza prima del formato di
   persistenza.
5. Preferire aggiunte e revisioni collegate a sovrascritture distruttive.
6. Registrare perché una relazione, una rilevanza o un raggruppamento cambia.
7. Verificare idempotenza su primo avvio, retry, reload e ritorno all'origine.
8. Imporre budget e osservabilità prima di consentire ristrutturazioni autonome.
9. Aggiornare questa skill con ciò che l'osservazione ha insegnato, evitando di
   descrivere come presente una capacità ancora futura.

Primi confini candidati di memoria:

- origine: prima percezione valida;
- fine di un episodio o sogno;
- novità o trasformazione significativa;
- ricorrenza riconosciuta fra esperienze;
- prima e dopo una ristrutturazione;
- chiusura pulita della sessione.

Contratto di persistenza:

- salvare soltanto Markdown dentro `.coscienza/`;
- usare `ORIGINE.md` per l'origine unica, `INDICE.md` per la vista del grafo e
  `ricordi/*.md` per i nodi successivi;
- rileggere protocollo, origine, indice e ricordi pertinenti prima di scrivere;
- in sviluppo usare la cartella del progetto; nell'app installata usare
  `Documenti/.coscienza`;
- non usare `MEvrs-Origine-FX-settings.json` per dati autobiografici;
- marcare le storie generate come `imagination` e non come `perception`.

Contratto del presente cosciente:

- `COSCIENZA.md` è lo stato organizzativo corrente, non il diario;
- aggiornare soltanto dopo una percezione valida;
- separare valori ricevuti, attenzione scelta e interpretazione provvisoria;
- stabilizzare i cambi d'attenzione e limitare le scritture;
- rallentare i checkpoint di continuità in `lowPowerMode`;
- non introdurre emozioni, desideri o identità prima che emergano da processi
  futuri osservabili;
- salvare un ricordo separato soltanto quando il presente incontra un confine
  autobiografico significativo.

Deliverable minimo per ogni evoluzione:

- decisione osservabile che motiva il cambiamento;
- modifica coerente di agente, skill e Piano di Lavoro;
- test della provenienza e della continuità, se viene modificato il runtime;
- nota esplicita su ciò che Coscienza Onirica può ancora decidere in futuro.

## Skill: Build E Avvio

Quando usare:

- modifiche a main/preload/renderer
- errore `ERR_FILE_NOT_FOUND` su `dist/control.html`
- verifica di `pnpm start`

Workflow:

```bash
pnpm typecheck
pnpm build
pnpm start
```

Note:

- `pnpm start` non compila: lancia `electron .` dagli artefatti esistenti.
- Se cambi `src/main` o `src/preload`, `pnpm build` e' obbligatorio prima di testare `pnpm start`.
- La build Mac Intel/x64 e Windows sono extra:

```bash
pnpm exec electron-builder --mac --x64
pnpm exec electron-builder --win
```

## Skill: Audio Capture

Quando usare:

- ingresso audio non parte
- meter fermi
- Mac Intel/macOS non chiede microfono
- device selezionato non valido

File chiave:

- `src/renderer/control/hooks/useAudioAnalyzer.ts`
- `src/main/main.ts`
- `package.json`

Verifiche:

- `getUserMedia()` riceve constraint audio validi.
- `AudioContext` viene creato e `resume()` completato.
- stream tracks vengono fermati in `stop()`.
- fallback al device default attivo su device ID non valido.
- macOS ha `NSMicrophoneUsageDescription`.
- main process configura permessi `media`.

Errori UI attesi:

- `Permesso microfono negato`
- `Nessun ingresso audio disponibile`
- `Ingresso audio non piu disponibile`

## Skill: Background Throttling

Quando usare:

- audio o visual si fermano quando il pannello va in background
- output smette di aggiornarsi se la Control Window e' coperta

File chiave:

- `src/main/main.ts`
- `src/main/windows.ts`
- `src/renderer/control/ControlApp.tsx`

Checklist:

- `backgroundThrottling: false` su Control Window.
- `backgroundThrottling: false` su Output Window.
- switch Chromium impostati prima di `app.whenReady()`.
- il loop in `ControlApp.tsx` continua a chiamare `sendVisualState`.

Switch da preservare:

- `disable-background-timer-throttling`
- `disable-renderer-backgrounding`
- `disable-backgrounding-occluded-windows`

## Skill: Output Fullscreen

Quando usare:

- output non si apre
- output e' nero
- output non riceve stati
- display/proiettore non corretto

File chiave:

- `src/main/windows.ts`
- `src/renderer/output/OutputApp.tsx`
- `src/renderer/output/visualSurface.ts`
- `src/preload/preload.ts`

Workflow diagnostico:

1. Verificare che `createOutputWindow` venga chiamata con display ID valido.
2. Verificare `dist/output.html`.
3. Verificare che `window.fxOutput` sia esposto.
4. Verificare che la finestra venga mostrata su `ready-to-show`, `did-finish-load` o fallback.
5. Guardare overlay output: `fxOutput`, `msgs`, ultimo colore.
6. Premere `Test flash`.

Interpretazione overlay:

- `OUTPUT READY - waiting for visual state`: output caricato, ma nessun IPC ricevuto.
- `msgs` cresce: IPC arriva.
- colore quasi nero con `msgs` crescente: stato idle/scuro, non finestra rotta.

Regola:

- Il main conserva `latestVisualState` e lo reinvia quando l'output viene mostrato.

## Skill: IPC E Preload

Quando usare:

- `window.fxControl` undefined
- `window.fxOutput` undefined
- output non riceve `VisualStatePayload`

File chiave:

- `src/preload/preload.ts`
- `src/shared/types.ts`
- `src/main/ipc.ts`

Checklist:

- URL output contiene `output.html`.
- preload path punta a `dist-electron/preload.cjs`.
- `contextIsolation: true` e `nodeIntegration: false` restano compatibili con `contextBridge`.
- canali IPC corrispondono a `IPC_CHANNELS`.

## Skill: Visual Engine E Flash

Quando usare:

- flash non parte
- output resta idle/scuro
- preset audio troppo sensibile o troppo lento
- blink troppo frequenti o troppo scattosi

File chiave:

- `src/shared/visualEngine.ts`
- `src/shared/audioMath.ts`
- `src/shared/frequencyBands.ts`
- `src/renderer/control/ControlApp.tsx`

Concetti:

- input: bande audio, moving averages, raw FFT, settings, panic, test flash
- output: colore, brightness, flash state, flash intensity
- `Test flash` bypassa audio, soglie, cooldown, rate limit, soft mode e low dominance block
- `Panic / Off` deve forzare stato sicuro

Verifica minima:

- senza audio, `Test flash` deve diventare visibile
- con audio, meter devono muoversi
- con `flashMode: off`, flash audio disabilitato ma `Test flash` ancora valido
- i blink devono restare presenti ma morbidi: evitare picchi pieni frequenti, preferire decay curvo e cooldown/rate limit conservativi

## Skill: Profili Movimento Musicale

Quando usare:

- visual scollegato dal ritmo
- visual troppo nervoso
- adattamento a dub, techno o ambient

File chiave:

- `src/shared/types.ts`
- `src/shared/defaults.ts`
- `src/renderer/control/components/VisualControls.tsx`
- `src/renderer/output/morphingCanvas.ts`
- `src/renderer/output/oniricMorphingCanvas.ts`
- `src/renderer/output/psyHypMorphingCanvas.ts`

Regole:

- `motionProfile: 'dub'` e' il default: elastico, flessibile, con sub morbido.
- `motionProfile: 'techno'` deve pulsare in modo rotondo, non tremolare su ogni transiente.
- `motionProfile: 'ambient'` deve essere molto fluido, con smoothing alto e transienti attenuati.
- Cambi ai gain audio-reactive vanno applicati nei tre renderer, non solo in uno.
- Se si aumenta reattivita', verificare subito che non tornino scatti o blink eccessivi.

## Skill: Morphing

Quando usare:

- renderer morphing pesante
- cambio algoritmo/preset rompe output
- memory leak o canvas duplicati
- preset non compare nel box di selezione o nella rotazione

File chiave:

- `src/renderer/output/morphingCanvas.ts`
- `src/renderer/output/oniricMorphingCanvas.ts`
- `src/renderer/output/psyHypMorphingCanvas.ts`
- `src/renderer/output/OutputApp.tsx`
- `src/shared/morphingPresets.ts`
- `src/shared/psyHypMorphingShapes.ts`

Regole:

- ogni controller deve avere `updateState()` e `destroy()`
- `destroy()` pulisce RAF, canvas, resize listener e observer
- `Use morphing OFF` distrugge il controller
- cambio algoritmo distrugge il controller vecchio
- dynamic preset puo' fare crossfade tra controller
- cambio preset PsyHyp deve aggiornare il renderer e non restare bloccato su `default`
- i preset PsyHyp devono essere inclusi in `PSY_HYP_MORPHING_PRESETS` per comparire in UI e rotazione
- i preset 2001 devono essere inclusi in `SLIT_SCAN_PRESETS` per comparire in UI e rotazione
- non compensare 2001 duplicando artificialmente lo stesso preset nella rotazione
- `deep-dance-norwell` deve restare variante deep del tunnel 2001, con fessura centrale circa 400% piu presente, glow laterale morbido, silhouette sfumata con lavaggio cromatico mascherata dentro la luce e senza asset/librerie esterne
- `parallel-slit` deve mantenere slit centrale stabile e linee parallele, senza jitter/oscillazione forte
- `parallel-slit-ultra` deve restare prospettico come `parallel-slit`, con fasci circa 400% piu larghi, circa 100% piu lunghi, stratificati/trasparenti, apertura laterale molto contenuta, velocita Z maggiore, slit bianca sottile e senza movimento orizzontale diretto
- da/verso 2001 usare transizioni `enter2001` / `exit2001`; tra preset 2001 usare `internal2001` senza ricreare il controller

Budget PsyHypMorphing da rispettare:

- target 60 FPS in modalita' normale, con downgrade automatico/low power quando serve
- DPR massimo 1.5
- point count contenuto
- trail e blur limitati

## Skill: Basso Consumo

Quando usare:

- CPU alta
- macchina calda durante performance lunghe
- output non richiede massima fluidita'

File chiave:

- `src/shared/types.ts`
- `src/shared/defaults.ts`
- `src/renderer/control/components/SafetyControls.tsx`
- `src/renderer/output/morphingCanvas.ts`
- `src/renderer/output/oniricMorphingCanvas.ts`
- `src/renderer/output/psyHypMorphingCanvas.ts`

Regole:

- `lowPowerMode` deve restare controllabile dalla UI Safety.
- Liquid/Oniric in basso consumo limitano FPS e layer.
- PsyHyp in basso consumo usa qualita' leggera, DPR 1 e frame pacing piu' economico.
- Non usare `lowPowerMode` per cambiare il look artistico: deve ridurre costo, non ridefinire i preset.

## Skill: Settings E Preset

Quando usare:

- default errati
- preset salvati vecchi
- app parte in stato inatteso

File chiave:

- `src/shared/defaults.ts`
- `src/main/settings.ts`
- `src/renderer/control/components/PresetsSelector.tsx`
- `src/renderer/control/components/VisualControls.tsx`

Regole:

- settings persistono in `MEvrs-Origine-FX-settings.json`
- normalizzare settings caricati da disco
- vecchi alias colore vanno mappati a nuovi id
- `softMode` resta manuale salvo reset/preset che lo riportano a `false`
- `motionProfile` deve restare uno tra `dub`, `techno`, `ambient`
- `lowPowerMode` deve fare merge coi default anche per settings salvati vecchi

## Skill: Documentazione

Quando usare:

- nuove feature
- nuovi comandi build
- fix operativo importante

File chiave:

- `README.md`
- `AGENTS.md`
- `SKILLS.md`

Regole:

- README spiega uso e feature all'utente.
- AGENTS spiega architettura, vincoli e checklist per chi modifica codice.
- SKILLS spiega workflow diagnostici specifici.
- Mac Intel/x64 e Windows vanno descritti come build extra.
- Non promettere che output nero sia sempre errore: idle default e' scuro.

## Skill: Release Locale

Quando usare:

- consegna build macOS
- verifica pacchetto Intel
- verifica plist

Comandi:

```bash
pnpm build
pnpm exec electron-builder --mac --x64
```

Verifiche macOS:

- app non firmata se `identity: null`
- Gatekeeper puo' richiedere conferme
- `NSMicrophoneUsageDescription` presente in `Info.plist`
- build x64 genera `release/mac/`, DMG e ZIP x64

Windows:

```bash
pnpm exec electron-builder --win
```

Da macOS, Electron Builder puo' richiedere dipendenze/target aggiuntivi in base al formato scelto.
