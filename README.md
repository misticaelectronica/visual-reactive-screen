# Mistica Electronica Visual Reactive Screen

Desktop app **Electron + TypeScript + React + Canvas 2D** per generare una uscita visiva fullscreen reattiva all'audio, pensata per performance live, proiezioni, schermi HDMI e contesti techno/ambient/rituali.

L'app ha due finestre:

- **Control Window**: pannello React per selezionare display, ingresso audio, preset, flash, colori e morphing.
- **Output Window**: finestra fullscreen senza UI, normalmente su secondo monitor/proiettore, che riceve lo stato visivo via IPC.

## Funzionalita principali

- Analisi audio via **Web Audio API** con bande `low`, `lowMid`, `mid`, `high`.
- Selezione ingresso audio da dispositivi `audioinput`, inclusi microfoni, schede audio e loopback.
- Gestione permessi media/microfono in Electron, con `NSMicrophoneUsageDescription` per build macOS.
- Fallback automatico all'ingresso audio predefinito se il device ID salvato non e' piu' valido.
- Output fullscreen su display selezionabile, pensato per HDMI, secondo monitor o proiettore.
- Base color layer reattivo a energia audio, brightness e flash.
- Flash controllato con modalita `High`, `Mid`, `Low`, `Off`.
- Controlli live per durata flash, decay, cooldown, sensibilita, rate limit, FFT size e smoothing analyser.
- Preset genere e preset colore, con opzione **Match Genere/Colore**.
- Rotazione dinamica opzionale di colori e morphing.
- Modalita **Brain**, alternativa al morphing standard: CoscienzaOnirica scrive una storia,
  Psichedel genera raster originali con PornMaster SD 1.5 Explicit ONNX, VTracer li converte in SVG a colori e
  un controllo qualita rifiuta composizioni povere o troppo pesanti prima del rendering.
  Introduzione al sottoprogetto, filosofia e riferimenti in
  [`introduzione-brain.md`](introduzione-brain.md). La configurazione dei modelli,
  i filtri Hugging Face e i parametri della pipeline sono
  descritti in [`docs/brain-ai-pipeline.md`](docs/brain-ai-pipeline.md). La migrazione
  browser verso il singolo modello Explicit, ora usato come generatore standard in
  sviluppo, è documentata in
  [`docs/psychedel-explicit-v1.md`](docs/psychedel-explicit-v1.md).
- **Sessione pubblica**: il pubblico scrive frasi da telefono via QR (Google Form);
  ogni frase genera una storia dedicata e, per la durata della sessione, alimenta
  anche `config/brainPhrases.txt` (che torna al set curato alla chiusura). Setup e
  uso in [`sessione-pubblica-brain.md`](sessione-pubblica-brain.md).
- Tre algoritmi morphing Canvas 2D:
  - **Liquid Morphing**
  - **Oniric Morphing**
  - **PsyHypMorphing**
- Controlli dedicati al morphing onirico: opacita, luminanza, glow, contrasto, scala, morbidezza bordo e oscuramento sfondo.
- Test Flash manuale indipendente da audio/soglie/cooldown.
- Panic / Off per mandare subito l'output in stato sicuro.
- Persistenza impostazioni su disco.
- Build desktop standard con `electron-builder`, piu' build opzionali per macOS Intel/x64 e Windows.

## Requisiti

- Node.js LTS consigliato
- pnpm
- macOS, Linux o Windows con supporto Electron
- Per uso audio: permessi microfono/cattura audio concessi al sistema
- Per Brain: GPU con supporto WebGPU. Il primo avvio carica il checkpoint Explicit
  ONNX (circa 2,02 GiB);
  gli avvii successivi riutilizzano la cache locale.

Il generatore Explicit richiede circa 2,02 GiB di artefatti ONNX e almeno
8 GB di memoria dichiarata dal browser. I requisiti definitivi verranno fissati
dopo il collaudo del repository remoto e la misura del picco GPU.

Installazione dipendenze:

```bash
pnpm install
```

## Script

| Script | Descrizione |
| --- | --- |
| `pnpm dev` | Avvia Vite/Electron in sviluppo |
| `pnpm typecheck` | Controllo TypeScript senza emit |
| `pnpm lint` | ESLint su `src/**/*.{ts,tsx}` |
| `pnpm build` | Typecheck, Vite build, Electron Builder |
| `pnpm start` | Avvia Electron dagli artefatti buildati |

## Avvio in sviluppo

```bash
pnpm dev
```

La finestra di controllo carica `control.html`. La finestra di uscita viene aperta dal pulsante **Apri uscita fullscreen** dopo aver scelto un display.

Non aprire manualmente la control UI nel browser: il bridge Electron `window.fxControl` e' disponibile solo nella finestra Electron.

## Configurazione esterna di Brain

I file dati modificabili sono nella cartella [`config/`](config/README.md), fuori
da `src/` e dai bundle Vite:

- `config/brainPhrases.txt`: elenco attivo, una frase per riga;
- `config/brainPhrases.example.txt`: raccolta di esempio non caricata.

Brain rilegge `brainPhrases.txt` dal filesystem prima di generare ogni nuova
storia. Le modifiche hanno quindi effetto dalla storia successiva senza
ricompilazione.

Nelle applicazioni pacchettizzate la cartella viene copiata in
`Contents/Resources/config` su macOS, esternamente al codice compilato.

## Build produzione locale

```bash
pnpm build
```

La build genera:

- `dist/`: renderer Vite
- `dist-electron/`: main/preload Electron buildati
- `release/`: pacchetti `electron-builder`

Per provare l'app dopo una build:

```bash
pnpm start
```

Su macOS il pacchetto non e' firmato di default (`identity: null`). Gatekeeper puo' richiedere conferme manuali.

### Build extra macOS Intel

Il build normale resta `pnpm build`. La build Mac Intel/x64 e' un passaggio extra da lanciare solo quando serve distribuire su Mac Intel:

```bash
pnpm exec electron-builder --mac --x64
```

Output tipici:

- `release/mac/`: app x64 non compressa
- `release/Mistica Electronica Visual Reactive Screen-0.1.0.dmg`: DMG x64
- `release/Mistica Electronica Visual Reactive Screen-0.1.0-mac.zip`: ZIP x64

La build macOS include `NSMicrophoneUsageDescription` nel plist, necessario per far comparire correttamente la richiesta di permesso microfono.

### Build extra Windows

Per generare un pacchetto Windows:

```bash
pnpm exec electron-builder --win
```

Per forzare una architettura specifica:

```bash
pnpm exec electron-builder --win --x64
pnpm exec electron-builder --win --ia32
pnpm exec electron-builder --win --arm64
```

Output tipici in `release/`:

- installer Windows, se il target di default lo prevede
- pacchetti compressi o directory unpacked, in base ai target scelti da `electron-builder`

Nota: il build Windows e' separato dal build macOS standard. Se lo esegui da macOS, `electron-builder` puo' richiedere dipendenze/target aggiuntivi in base al formato finale.

## Uso rapido live

1. Avvia l'app con `pnpm dev` o apri la build.
2. In **Display di uscita**, scegli monitor HDMI/proiettore.
3. Premi **Apri uscita fullscreen**.
4. In **Ingresso audio**, scegli scheda audio, loopback o microfono.
5. Premi **Avvia analisi audio**.
6. Controlla i meter `Low`, `Low-mid`, `Mid`, `High`.
7. Scegli un preset genere o colore.
8. Se vuoi morphing, abilita **Use morphing** e scegli algoritmo/preset.
9. Usa **Test flash** per verificare subito layering e visibilita.
10. Usa **Panic / Off** per spegnere immediatamente il movimento/flash.

## Controlli principali

### Display e audio

- **Display di uscita**: usa `screen.getAllDisplays()` dal processo main.
- **Aggiorna display**: rilegge la lista monitor.
- **Ingresso audio**: elenco dispositivi `audioinput` via `enumerateDevices()`.
- **Avvia/Ferma analisi audio**: apre/chiude `getUserMedia`, `AudioContext`, `AnalyserNode` e stream.
- Se il dispositivo selezionato non e' piu' disponibile, l'app prova l'ingresso predefinito invece di fermarsi subito.
- Su macOS il main process configura i permessi `media` e, se necessario, chiede accesso al microfono tramite Electron.

### Meter e soglie

Le bande principali sono:

| Banda | Range indicativo |
| --- | --- |
| `low` | 40-160 Hz |
| `lowMid` | 160-400 Hz |
| `mid` | 400-2000 Hz |
| `high` | 2000-8000 Hz |

Le soglie dinamiche sono basate su moving average, moltiplicatori per banda e sensibilita globale.

Controlli audio disponibili:

- moltiplicatori soglia `low`, `lowMid`, `mid`, `high`
- `fftSize`: 256, 512, 1024, 2048, 4096, 8192
- `smoothingTimeConstant`
- `sensitivity`
- anteprima soglie sui meter

### Flash

`Flash mode` puo' essere:

| Mode | Trigger principale |
| --- | --- |
| `High` | aperture, texture, hat, click, noise |
| `Mid` | corpo percussivo, stab, metallo, transienti medi |
| `Low` | punch/knock/body, non sub puro |
| `Off` | nessun flash audio |

Le bande flash interne sono:

| Mode | Main band | Secondary band |
| --- | --- | --- |
| `low` | 120-420 Hz | 600-1400 Hz |
| `mid` | 420-1800 Hz | 1800-3600 Hz |
| `high` | 1800-5200 Hz | 5200-8000 Hz |

La pipeline flash usa:

- energia banda calcolata dai bin FFT reali con `sampleRate` e `fftSize`
- media dinamica della banda flash
- `relativeEnergy`
- `deltaRelative`
- `flashThreshold`
- `transientDelta`
- `cooldownMs`
- `maxFlashesPerSecond` decimale
- penalita morbida `lowDominanceBlockRatio`

Il flash audio non viene generato direttamente dal kick regolare se la modalita e' `mid` o `high`; il low dominante aumenta solo temporaneamente la soglia, non blocca in modo assoluto.

Controlli flash/colori disponibili:

- `Flash mode`: `High`, `Mid`, `Low`, `Off`
- durata flash
- decay
- cooldown
- max flash/sec
- colori `idle`, `basePinkColor`, `hotPinkColor`, `whiteFlashColor`

Quando `Use morphing` e' attivo:

- base layer riceve `flashIntensity * 0.65`
- morphing renderer riceve `flashIntensity * 0.85`

### Test Flash

**Test flash** bypassa:

- audio
- soglie
- `flashMode`
- cooldown
- rate limit
- soft mode
- low dominance block

Serve per capire se un problema e' nella pipeline audio oppure nel rendering/layering.

### Soft Mode

Soft Mode resta una scelta manuale dell'utente.

- default: `false`
- preset genere/colore: forzano `softMode: false`
- cambio morphing algorithm/preset: forza `softMode: false`
- reset default: `softMode: false`
- toggle manuale nella UI: unico modo ordinario per portarlo a `true`

## Preset genere

I preset genere impostano soglie audio, flash, smoothing, sensibilita e movimento sub/kick.

| Preset | Flash mode | Uso |
| --- | --- | --- |
| Ambient Techno | `high` | texture, pad, rumore, percussione leggera |
| Techno Rituale / Tribale / Industriale | `mid` | percussioni, corpo medio, metallo |
| Minimal / Hypnotic Techno | `mid` | micro accenti e pattern ipnotici |
| Dub / Deep Hypnotic Techno | `high` | stab, delay, hat, aperture |
| Industrial Minimal / Machine Drift | `low` | punch/knock e accenti meccanici |

I preset colore disponibili sono:

- Ambient Techno
- Techno Rituale / Tribale / Industriale
- Minimal / Hypnotic Techno
- Dub / Deep Hypnotic Techno
- Industrial Minimal / Machine Drift
- MISTICA ELECTRONICA DEFAULT
- MISTICA ELECTRONICA FESTIVAL

Se **Match Genere/Colore** e' attivo, un preset genere applica anche il colore corrispondente.

## Dynamic Preset

La sezione **Dynamic Preset** puo' ruotare automaticamente:

- preset colore
- algoritmo/preset morphing

La rotazione colori sceglie un preset diverso dal corrente, con peso maggiore per i preset Mistica Electronica. La rotazione morphing alterna Liquid, Oniric, PsyHypMorphing e intervalli senza morphing.

Intervalli attuali:

- colore: 45-150 secondi
- morphing: 30-60 secondi
- pausa no-morphing: 180-420 secondi

## Morphing

Il layer morphing e' un canvas trasparente sopra il base color layer. Riceve:

- `bandEnergies`
- `settings`
- `flashActive`
- `flashIntensity`

Quando `Use morphing` e' OFF, il renderer morphing viene distrutto e resta solo il base color layer.

### 2001 Morphing

Renderer tunnel in prima persona in `src/renderer/output/slitScanCanvas.ts`, con preset condivisi in `src/shared/slitScanPresets.ts`.

Preset disponibili:

- `base` / 2001 Base: riferimento visivo attuale.
- `bright-dense` / 2001 Bright Dense: circa 30% linee in piu', alpha/glow controllati, piu luminoso.
- `deep-dense` / 2001 Deep Dense: circa 50% linee in piu', alpha piu basso, nero piu presente.
- `deep-dance-norwell` / 2001 Deep Dance Norwell: variante deep con fessura bianca circa 400% piu presente, glow laterale verso i fasci e ombra danzante sfumata/cromatica interna alla luce.
- `horizontal` / 2001 Horizontal: tagli orizzontali dalla sorgente verticale centrale.
- `parallel-slit` / 2001 Parallel Slit: slit centrale perfettamente verticale e fasci paralleli ordinati.
- `parallel-slit-ultra` / 2001 Parallel Slit Ultra: versione piu fisica con fasci circa 400% piu larghi, circa 100% piu lunghi, apertura laterale contenuta e slit bianca sottile molto evidente.
- `eq-progressive` / 2001 EQ Progressive: spessore, densita e separazione modulati con smoothing dai dati EQ.

La rotazione usa questi preset reali. Non duplicare artificialmente `2001:default`.

Transizioni dedicate:

- `enter2001`: durata 3600 ms; slit centrale prima del tunnel, ribbon e profondita entrano progressivamente.
- `exit2001`: durata 3800 ms; tunnel, profondita e slit si sciolgono prima che il morphing successivo domini.
- `internal2001`: durata 1600 ms; tra preset 2001 resta lo stesso tunnel, senza reset del controller.

### Liquid Morphing

Renderer Canvas 2D basato sui preset in `src/shared/morphingPresets.ts`.

Ogni preset definisce:

- numero forme
- blur
- opacity
- speed
- deformation
- scale
- blend mode
- reattivita per banda
- risposta flash sui bordi

Preset Liquid disponibili:

- Ritual Drift
- Dream Plasma
- Submerged Organism
- Industrial Ectoplasm
- Slow Lysergic Field
- Blacklight Pollen
- Molten Memory
- Ritual Afterimage
- Spectral Membrane
- Nocturnal Bloom
- Machine Hallucination
- Amico Immaginario
- Contatto Alieno

### Oniric Morphing

Renderer atmosferico e onirico, piu' morbido di PsyHypMorphing. Supporta preset `default` e i morphing preset condivisi. Include controlli debug specifici nella UI:

- Debug visibilita
- Opacita morphing
- Opacita minima
- Luminanza morphing
- Glow morphing
- Contrasto morphing
- Scala morphing
- Morbidezza bordo
- Buio sfondo

Questi controlli sono abilitati solo quando `Use morphing` e `Oniric Morphing` sono attivi.

### PsyHypMorphing

Algoritmo psichico, psichedelico e ipnotico. Usa un preset unico:

- `default`

Il preset contiene 24 forme:

- disco
- onda
- spirale
- portale
- ingranaggio
- torre
- griglia
- globo
- sole
- fiamma
- libro
- seme
- radice
- sentiero
- strumento
- mano
- occhio
- nebbia
- capsula
- condotto
- blocco
- triangolo
- frattura
- luna

PsyHypMorphing sceglie una forma corrente e una successiva in modo random pesato, evitando ripetizioni immediate. Le forme sono pre-processate in una cache di transizione: punti current/next, resampling e alignment vengono calcolati all'inizio del ciclo, non a ogni frame.

Budget performance PsyHypMorphing:

| Parametro | Valore |
| --- | --- |
| FPS target | 30 |
| DPR massimo | 1.5 |
| Point count | 96 |
| Structure point count | 48 |
| Layer massimi | 3 |
| Blur massimo | 28px |
| Trail retention max | 0.88 |

Layer PsyHyp:

1. aura
2. silhouette
3. structure

La structure non viene accumulata nel trail, per evitare scie costose e confusione visiva.

## Persistenza impostazioni

Le impostazioni vengono salvate automaticamente nel percorso `userData` di Electron, file:

```text
MEvrs-Origine-FX-settings.json
```

La normalizzazione delle impostazioni avviene nel main process:

- `morphingAlgorithm` invalido -> `liquid`
- `flashMode` invalido/mancante -> `mid`
- `softMode` mancante/invalido -> `false`, salvo stato globale salvato esplicitamente come `true`
- alias vecchi dei preset colore -> nuovi id Mistica Electronica
- `dynamicPresetEnabled` valido solo se esplicitamente `true`
- `dynamicColorRotationEnabled` e `dynamicMorphingRotationEnabled` attivi di default salvo `false` esplicito

## Architettura

```text
src/
  main/
    main.ts          processo Electron
    windows.ts       creazione Control/Output window
    ipc.ts           canali IPC
    displays.ts      lista monitor
    settings.ts      load/save settings
  preload/
    preload.ts       contextBridge fxControl/fxOutput
  renderer/
    control/         UI React di controllo
    output/          output fullscreen Canvas/DOM
  shared/
    types.ts
    defaults.ts
    visualEngine.ts
    audioMath.ts
    frequencyBands.ts
    morphingPresets.ts
    morphingThemeProfiles.ts
    psyHypMorphingShapes.ts
```

Nel main process vengono anche configurati:

- permessi Electron per `media`
- richiesta permesso microfono macOS quando lo stato e' `not-determined`
- lifecycle Control/Output window
- chiusura pulita della finestra output prima dell'uscita

## Flusso dati

```text
Audio input
  -> useAudioAnalyzer
  -> band energies + FFT data
  -> stepVisualEngine
  -> VisualStatePayload
  -> IPC main
  -> Output Window
  -> base color layer + morphing canvas
```

`stepVisualEngine` e' la parte pura TypeScript che calcola colore, brightness, flash state e intensita da inviare ai renderer.

## Sicurezza luci intermittenti

Questa app produce luce intensa e potenzialmente lampeggiante. Usare con cautela.

Misure integrate:

- cooldown flash
- rate limit flash decimale
- Flash mode `off`
- Soft Mode manuale
- Panic / Off
- Test Flash separato per verifica
- flash non generato direttamente da ogni kick in modalita `mid/high`

Queste misure non sostituiscono giudizio umano o valutazioni mediche. In ambienti pubblici usare livelli di luminosita e frequenza conservativi.

## Debug e flag interni

Flag rilevanti nel codice:

- `DEBUG_FLASH = false` in `src/shared/visualEngine.ts`
- `DEBUG_PSY_HYP = false` in `src/renderer/output/psyHypMorphingCanvas.ts`
- `DEBUG_PSY_PERF = false` in `src/renderer/output/psyHypMorphingCanvas.ts`

Non vanno lasciati attivi in produzione live.

## Troubleshooting

### L'output non si apre

- Verifica di aver selezionato un display.
- Premi **Aggiorna display**.
- Chiudi e riapri l'output fullscreen.

### Non vedo dispositivi audio leggibili

Alcuni sistemi non espongono etichette dispositivi fino al primo permesso `getUserMedia`. Avvia analisi audio e concedi il permesso.

Su macOS, in particolare su build Intel/x64:

1. Apri **Impostazioni di Sistema > Privacy e Sicurezza > Microfono**.
2. Verifica che l'app sia abilitata.
3. Se l'app era gia' stata aperta prima della correzione dei permessi, rimuovi/riabilita il consenso o riapri la nuova build.
4. Se l'ingresso salvato non esiste piu', seleziona di nuovo il device o lascia che l'app provi il default.

Errori possibili mostrati dalla UI:

- `Permesso microfono negato`: consenso macOS/Electron mancante.
- `Nessun ingresso audio disponibile`: nessun device esposto dal sistema.
- `Ingresso audio non piu disponibile`: device ID salvato non valido.

### Il flash non parte

1. Premi **Test flash**.
2. Se Test Flash funziona, il rendering e' ok: controlla `Flash mode`, soglie, input audio e meter.
3. Se Test Flash non funziona, il problema e' nel layer output/rendering.
4. Verifica che `Flash mode` non sia `Off`.
5. Verifica che `Panic / Off` non sia attivo.

### Il morphing e' troppo pesante

PsyHypMorphing ha budget interno a 30 FPS e DPR max 1.5. Se resta pesante:

- prova Liquid Morphing
- disattiva Dynamic Morphing Rotation
- usa `Use morphing` OFF
- riduci risoluzione dell'output/proiettore

### Messaggi innocui

- `Most NODE_OPTIONs are not supported in packaged apps`: gli script usano `env -u NODE_OPTIONS` per evitare eredita' problematiche.
- Warning code signing macOS: la build locale non e' firmata.
- Warning icona Electron: non e' configurata un'icona custom.
- Errori DevTools Chromium: spesso rumore se DevTools e' aperto.

## Note sviluppo

- Non usare Three.js o WebGL: il rendering e' Canvas 2D.
- Non modificare globalmente il motore audio per cambiare un renderer specifico.
- I renderer morphing devono gestire cleanup di RAF, canvas e listener.
- `Use morphing OFF` deve distruggere il controller morphing.
- `Test flash` deve ignorare soglie, cooldown, mode e soft mode.
- `Soft Mode` deve restare manuale.

## Licenza

Questo progetto e' distribuito con licenza **Apache License 2.0**.

Vedi [LICENSE](./LICENSE).
