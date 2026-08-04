# agents.md

Guida operativa per agenti e sviluppatori che lavorano su Mistica Electronica Visual Reactive Screen.

## Missione Del Progetto

App desktop Electron + TypeScript + React + Canvas 2D per generare un output fullscreen reattivo all'audio, pensato per live performance, proiettori, HDMI e contesti techno/ambient/rituali.

Finestre:

- Control Window: pannello React per display, ingresso audio, preset, flash, colori, safety e morphing.
- Output Window: finestra fullscreen senza UI, di solito su secondo display/proiettore, aggiornata via IPC.

Stack:

- `src/main/`: processo Electron, finestre, IPC, settings, display.
- `src/preload/`: `contextBridge` per `window.fxControl` e `window.fxOutput`.
- `src/renderer/control/`: UI React e loop audio/visuale.
- `src/renderer/output/`: output fullscreen, base layer e renderer morphing Canvas 2D.
- `src/shared/`: tipi, default, motore visuale, audio math, preset.

## Comandi

```bash
pnpm dev
pnpm typecheck
pnpm lint
pnpm build
pnpm start
```

Regole sui comandi:

- `pnpm dev` avvia Vite/Electron in sviluppo.
- `pnpm start` usa artefatti gia' buildati: `dist/` e `dist-electron/` devono esistere.
- Dopo modifiche a `src/main`, `src/preload` o renderer buildati, eseguire `pnpm build` prima di provare `pnpm start`.
- `pnpm build` fa typecheck, Vite build e packaging Electron Builder.
- Se `pnpm start` mostra `ERR_FILE_NOT_FOUND` per `dist/control.html`, eseguire `pnpm build`.

Build extra:

```bash
pnpm exec electron-builder --mac --x64
pnpm exec electron-builder --win
pnpm exec electron-builder --win --x64
pnpm exec electron-builder --win --ia32
pnpm exec electron-builder --win --arm64
```

La build Mac Intel/x64 e le build Windows sono passaggi extra; non devono sostituire il build normale.

## Regole Da Non Rompere

- Non aprire DevTools automaticamente all'avvio in produzione o in `pnpm start`.
- Non rimuovere `backgroundThrottling: false` dalle `BrowserWindow`.
- Non rimuovere gli switch Chromium in `src/main/main.ts` che disabilitano timer/background throttling e renderer backgrounding.
- Non cancellare la gestione permessi media/microfono macOS.
- Non rimuovere `NSMicrophoneUsageDescription` dalla configurazione macOS.
- Non spostare l'analisi audio fuori dalla finestra Electron senza riprogettare preload/permessi.
- Non cambiare globalmente il motore audio per correggere un singolo renderer morphing.
- Non lasciare debug overlay o flag debug attivi in produzione live, salvo richiesta esplicita.
- Non rendere il build Mac Intel parte del build normale: e' un extra.
- Non rendere i renderer troppo nervosi inseguendo ogni transiente audio: dub, techno e ambient devono avere comportamenti diversi.
- Non applicare oscillazioni, derive laterali, rotazioni, zoom o pulsazioni ritmiche all’intero quadro: possono causare mal di mare. Distribuire sempre il movimento fra segmenti con fasi differenti e mantenere la camera stabile.
- Non simulare reattività musicale con oscillazioni temporali autonome: le curve devono usare fase riallineata al beat e transienti distinti per `low`, `lowMid`, `mid` e `high`. In silenzio il movimento geometrico deve essere quasi nullo.
- Non rimuovere `lowPowerMode`: serve per ridurre carico CPU/FPS/layer durante live lunghi o su macchine calde.

## Punti Delicati

### Audio

L'analisi audio vive in `src/renderer/control/hooks/useAudioAnalyzer.ts`.

Pipeline:

- `navigator.mediaDevices.enumerateDevices()`
- `getUserMedia()`
- `AudioContext`
- `AnalyserNode`
- FFT bins convertiti in bande `low`, `lowMid`, `mid`, `high`

Su macOS servono:

- permessi `media` configurati nel main process
- richiesta microfono via Electron quando lo stato e' `not-determined`
- `NSMicrophoneUsageDescription` nel plist di build

Il device ID salvato puo' diventare invalido. Il codice deve poter fare fallback all'ingresso audio predefinito.

### Background Control Window

Il loop principale in `src/renderer/control/ControlApp.tsx` usa `requestAnimationFrame()` per:

- leggere un frame audio
- aggiornare `stepVisualEngine`
- inviare `VisualStatePayload` via IPC

Quando la Control Window va in background, Chromium puo' rallentare timer/RAF. Per evitarlo:

- `backgroundThrottling: false` e' impostato su Control e Output Window
- `disable-background-timer-throttling`
- `disable-renderer-backgrounding`
- `disable-backgrounding-occluded-windows`

Gli switch vanno impostati prima di `app.whenReady()`.

### Output Fullscreen

La finestra output e' gestita in `src/main/windows.ts`.

L'apertura deve:

- creare la `BrowserWindow` sul display selezionato
- caricare `output.html`
- mostrare la finestra su `ready-to-show` o `did-finish-load`
- avere fallback temporizzato se gli eventi non arrivano
- impostare bounds e fullscreen/simpleFullscreen

Su macOS si usa `simpleFullscreen` per ridurre problemi con finestre frameless.

Il main process mantiene `latestVisualState` e lo reinvia quando l'output viene mostrato. Questo evita output nero se i primi messaggi IPC vengono persi durante il caricamento.

### Output Nero

Il default `idleColor` e' molto scuro. Senza audio, flash o morphing, un output funzionante puo' sembrare nero.

Diagnostica prevista:

- fondo iniziale visibile `#170204`
- messaggio `OUTPUT READY - waiting for visual state` finche' l'output non riceve il primo stato
- overlay debug con `fxOutput`, numero messaggi e ultimo colore

Interpretazione:

- Se si vede `OUTPUT READY - waiting for visual state`, React/output funzionano ma il Control non sta inviando stati IPC.
- Se il messaggio sparisce e resta quasi nero, l'IPC arriva ma lo stato visuale e' idle/scuro.
- `Test flash` deve sempre produrre un flash visibile anche senza audio.

### Preload E IPC

`src/preload/preload.ts` espone:

- `window.fxControl` per Control Window
- `window.fxOutput` per Output Window

Il ruolo viene deciso controllando se l'URL contiene `output.html`.

Canali IPC principali in `src/shared/types.ts`:

- `fx:get-displays`
- `fx:open-output`
- `fx:close-output`
- `fx:save-settings`
- `fx:load-settings`
- `fx:send-visual-state`
- `fx:visual-state-push`
- `fx:output-closed`

## Morphing

Algoritmi:

- Liquid Morphing: `src/renderer/output/morphingCanvas.ts`
- Oniric Morphing: `src/renderer/output/oniricMorphingCanvas.ts`
- PsyHypMorphing: `src/renderer/output/psyHypMorphingCanvas.ts`
- 2001 Morphing: `src/renderer/output/slitScanCanvas.ts`

Regole:

- `Use morphing OFF` deve distruggere il controller morphing.
- I renderer devono pulire RAF, canvas e listener in `destroy()`.
- PsyHypMorphing ha budget performance interno; non aumentare DPR/FPS/punti senza verifiche reali.
- 2001 usa preset condivisi in `src/shared/slitScanPresets.ts`; non duplicare artificialmente `default` nella rotazione.
- Preset 2001 richiesti: `base`, `bright-dense`, `deep-dense`, `deep-dance-norwell`, `horizontal`, `parallel-slit`, `parallel-slit-ultra`, `eq-progressive`.
- Transizioni 2001 in `src/renderer/output/OutputApp.tsx`: `enter2001`, `exit2001`, `internal2001`.
- Il renderer 2001 legge `setTransitionState()` e non deve resettare i ribbon tra preset 2001.
- Oniric ha controlli dedicati di debug/visibilita nella UI.
- `motionProfile` governa la risposta musicale:
  - `dub`: default elastico, sub morbido, release flessibile.
  - `techno`: pulse piu' marcato ma clampato, movimento rotondo.
  - `ambient`: smoothing alto, transienti ridotti, continuita' fluida.
- `lowPowerMode` riduce il costo render:
  - Liquid/Oniric limitano FPS e layer.
  - PsyHyp forza qualita' leggera, DPR ridotto e frame pacing piu' economico.
- I blink/flash devono restare presenti ma non scattosi: preferire picchi piu' bassi, decay curvo e cooldown/rate limit conservativi.

Preset recenti:

- `alien-contact` / Contatto Alieno: disponibile in Liquid, Oniric e PsyHyp; usa due poli/civilta' e un ponte di segnali, evitando icone sci-fi letterali.
- `solchi-abitudine`, `materia-malleabile`, `percorsi-laterali`, `impronte-lavate`: famiglie materiche astratte condivise da Liquid/Oniric e disponibili anche in PsyHyp.

## Persistenza

Impostazioni salvate nel `userData` Electron:

```text
MEvrs-Origine-FX-settings.json
```

Normalizzazione in `src/main/settings.ts`:

- `morphingAlgorithm` invalido -> `liquid`
- `flashMode` invalido -> `mid`
- `softMode` valido solo se `true`
- `motionProfile` deve restare uno tra `dub`, `techno`, `ambient`
- `lowPowerMode` valido solo se booleano
- alias vecchi preset colore -> nuovi id
## Gestione Piani Di Lavoro E Tracciamento Task (Cartella working/)

Per garantire la continuità operativa, la tracciabilità delle decisioni e la persistenza dello stato fra differenti sessioni di lavoro, agenti e sviluppatori DEVONO utilizzare la cartella `working/`.

### 1. Struttura Obbligatoria della Cartella `working/`

- **`working/STATE.md`**: Quadro sintetico aggiornato ad ogni sessione con lo stato globale, il Macrotask attivo ed i Prossimi Passi (Next Steps).
- **`working/tasks/macrotasks.md`**: Elenco e stato dei Macrotask (passati, in corso, pianificati).
- **`working/tasks/tasks-registry.md`**: Registro di tutti i micro-task atomici (stati `[TODO]`, `[IN_PROGRESS]`, `[DONE]`, `[BLOCKED]`).
- **`working/plans/`**:
  - `template-piano-di-lavoro.md`: Modello standard per la creazione di nuovi Piani di Lavoro.
  - `piano-XXX-<nome>.md`: File dedicati ai singoli Piani di Lavoro per funzionalità o refactoring complessi.
- **`working/sessions/session-history.md`**: Storico cronologico delle sessioni di sviluppo svolte e registrazione della sessione in corso.

### 2. Workflow Obbligatorio dell'Agente con i Piani di Lavoro

1. **Fase Iniziale (Avvio Turno / Sessione)**:
   - Prima di intraprendere qualsiasi modifica, leggere `working/STATE.md` e `working/tasks/macrotasks.md` per acquisire il contesto corrente del progetto.
   - Verificare l'eventuale presenza di un Piano di Lavoro attivo in `working/plans/`.

2. **Creazione di un Piano di Lavoro ("Piano di Lavoro")**:
   - Per qualsiasi richiesta complessa, nuovo macrotask o refactoring architetturale, l'agente DEVE creare un nuovo file di piano in `working/plans/piano-XXX-<nome>.md` partendo da `working/plans/template-piano-di-lavoro.md`.
   - Il Piano di Lavoro deve definire:
     - **Obiettivo e Contesto**: Scopo chiaro del piano e dipendenze.
     - **Verifica delle Regole di `agents.md`**: Conferma che le modifiche non violino le regole fondamentali (es. `backgroundThrottling: false`, permessi audio macOS, stabilità della camera, low power mode).
     - **Fasi di Implementazione**: Suddivisione in fasi ed elenchi di task con checkbox `[ ]`.
     - **Validation Plan**: Comandi di build/test (`pnpm typecheck`, `pnpm build`) e procedure di test manuale.

3. **Durante l'Esecuzione**:
   - Spuntare i task completati nel Piano di Lavoro ed in `working/tasks/tasks-registry.md`.
   - Aggiornare lo stato di avanzamento in `working/STATE.md`.

4. **Fine Sessione o Consegna**:
   - Registrare la sessione in `working/sessions/session-history.md` specificando: data/ora, obiettivi, task completati e stato finale.
   - Verificare che tutti i file in `working/` siano coerenti prima di completare il turno.

## Checklist Prima Di Consegnare

Per modifiche TypeScript/renderer:

```bash
pnpm typecheck
```

Per modifiche Electron main/preload/packaging:

```bash
pnpm build
```

Verifiche manuali consigliate:

- Control Window si apre senza DevTools automatici.
- `pnpm start` trova `dist/control.html`.
- Lista display disponibile.
- Output fullscreen si apre sul display selezionato.
- Output non resta invisibile: deve mostrare stato idle/standby o colore.
- Audio parte dopo selezione ingresso.
- Se la Control Window va in background, meter/output continuano ad aggiornarsi.
- `Test flash` funziona anche senza audio.
- `Panic / Off` spegne subito flash/movimento.

## Troubleshooting Rapido

Se DevTools si apre all'avvio:

- cercare `openDevTools` in `src/` e `dist-electron/`
- rimuoverlo dal sorgente
- rigenerare con `pnpm build`

Se l'output non appare:

- controllare display selezionato e display ID salvato
- controllare log `createOutputWindow`, `did-fail-load`, `render-process-gone`
- verificare `dist/output.html`
- verificare `window.fxOutput`
- controllare gli eventi `ready-to-show`, `did-finish-load` e fallback show

Se l'output appare ma e' nero:

- premere `Test flash`
- controllare overlay `msgs`
- controllare ultimo colore ricevuto
- verificare che il Control stia chiamando `sendVisualState`

Se l'audio non parte su macOS:

- controllare Privacy e Sicurezza > Microfono
- verificare `NSMicrophoneUsageDescription` nel plist
- riselezionare il device audio se l'ID salvato non e' piu' valido

## File Da Conoscere

- `src/main/main.ts`: lifecycle app, permessi media, switch Chromium
- `src/main/windows.ts`: Control/Output BrowserWindow, ultimo stato visuale, output fullscreen
- `src/main/ipc.ts`: bridge IPC main
- `src/preload/preload.ts`: contextBridge
- `src/renderer/control/ControlApp.tsx`: loop audio/visual state
- `src/renderer/control/hooks/useAudioAnalyzer.ts`: acquisizione e analisi audio
- `src/renderer/output/OutputApp.tsx`: ricezione stato, renderer output, overlay diagnostico
- `src/renderer/output/visualSurface.ts`: base color layer
- `src/shared/visualEngine.ts`: logica flash/colore pura
- `src/shared/audioMath.ts`: calcolo bande audio
- `src/shared/defaults.ts`: default impostazioni
- `src/shared/types.ts`: tipi e canali IPC
