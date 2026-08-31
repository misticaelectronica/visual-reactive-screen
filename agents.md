# agents.md

Guida operativa per agenti e sviluppatori che lavorano su Mistica Electronica Visual Reactive Screen.

## Team Di Sviluppo Prodotto Brain

Ruoli con lettera di presentazione conservati in `team/`:

- [`team/capo-supremo-analisi-audio.md`](team/capo-supremo-analisi-audio.md): Capo Supremo dell'Analisi Audio / Sound Designer di Brain — responsabile della lettura audio-percettiva (feature, transient, stato nel tempo). Confina con la Direzione VJ (manifestazione visiva) e con il Capo Supremo degli Ingegneri (implementazione tecnica), senza sconfinare nelle loro autonomie.
- [`team/capo-supremo-designer-visual-vj.md`](team/capo-supremo-designer-visual-vj.md): Capo Supremo dei Designer/Visual VJ di Brain — responsabile dell'identità visiva, della grammatica dei renderer e delle trasformazioni/morph. Riceve la lettura audio-percettiva dal Capo Supremo dell'Analisi Audio e la traduce in linguaggio visivo, sempre nel rispetto del Protocollo Obbligatorio Di Verifica Filosofia Visiva più sotto in questo file.
- [`team/capo-supremo-ingegneri.md`](team/capo-supremo-ingegneri.md): Capo Supremo degli Ingegneri del Sistema VJ — responsabile della traduzione tecnica dei brief artistici e percettivi in renderer Canvas2D reali, dell'architettura condivisa (selezione/passthrough/gating/budget) e della verifica che ogni implementazione superi davvero il Protocollo Obbligatorio Di Verifica Filosofia Visiva, non solo sulla carta. Riceve i requisiti dal Capo Supremo dell'Analisi Audio e dalla Direzione VJ e ne rispetta l'autonomia, senza deciderne significato percettivo o identità visiva.

Documenti di indirizzo scambiati fra questi tre ruoli, quando eccedono la lettera di presentazione, in `team/briefs/` — ognuno indica il ruolo destinatario in apertura. Non sostituiscono le lettere sopra, le estendono nel tempo su un tema specifico (es. stato bio-percettivo, campionamento frasi).

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
- Non rimuovere gli switch Chromium in [`src/main/main.ts`](src/main/main.ts) che disabilitano timer/background throttling e renderer backgrounding.
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
- **Divieto di sovrastrutturazione** (regola permanente, brief del braccio destro 2026-08-28, PIANO-040): tre round di collaudo negativi sul respiro bio-percettivo sono nati dalla stessa causa — a ogni problema è stato aggiunto un meccanismo nuovo invece di verificare se uno già esistente rispondeva già alla domanda (firma organizzativa, significatività rispetto alla dispersione, qualificazione del kick a quattro condizioni: nessuno ha mai funzionato dal vivo, ognuno ha richiesto un round per essere ritirato). Da applicare sempre:
  - Prima di aggiungere un meccanismo, verificare se un segnale già presente risponde alla domanda.
  - Una condizione a più requisiti è quasi sempre un errore di progetto, non una specifica precisa: se il corpo/l'occhio riconosce una cosa in mezzo battito, il codice non dovrebbe avere bisogno di quattro verifiche incrociate.
  - Se un criterio non scatta mai dal vivo, non va tarato: va rimosso.
  - Segnalare la sovrastrutturazione quando arriva dall'alto — **anche quando il brief è firmato da un Capo Supremo**: se chiede un meccanismo che duplica qualcosa di già esistente, va riportato prima di essere implementato, non eseguito silenziosamente.

### Protocollo Obbligatorio Di Verifica Filosofia Visiva

Prima di proporre qualsiasi modifica, diagnosi o soluzione visiva, l'agente DEVE verificare il rispetto di questi 3 vincoli fondamentali:

1. 🛑 **Check Camera**: La proposta applica scala, rotazione, zoom, derive o pulsazioni all'intero quadro o alla camera? 
   ➔ **SE SÌ, LA PROPOSTA È VIETATA.** La camera e il quadro devono rimanere rigorosamente stabili (zero mal di mare).
   Sono invece ammesse deformazioni locali, scanline, maschere e micro-disallineamenti
   applicati a porzioni della materia, purché il soggetto complessivo non trasli,
   ruoti o venga scalato come un unico blocco.

2. 🎨 **Check Materia**: La reattività avviene dentro la materia visiva, cioè
   serigrafia, raster sottostante e maschere che li attraversano? Sono ammessi
   retini, densità dither, inchiostri, soglie di contrasto, variazioni cromatiche,
   opacità limitate e micro-segmenti con fasi differenziate.
   ➔ **SE NO, LA PROPOSTA È ERRATA.** Il raster non deve però essere rimpiazzato:
   durante il denoising il soggetto deve restare riconoscibile e il raster deve
   rimanere un livello secondario, non un'immagine vagante o un taglio decorativo.

3. 🤫 **Check Silenzio**: In assenza di audio, la materia non introduce movimento
   geometrico o pulsazioni temporali autonome? L'immagine e i suoi livelli possono
   restare visibili e stabili; non devono però fingere una reattività musicale.
   ➔ **SE NO, CORREGGERE.**

4. 🥁 **Check Beatmatch**: Ogni risposta ritmica deve distinguere impulso,
   fase e banda. Il beat va catturato prima del frame pacing; `beatPulse` può
   modulare densità, contrasto e ampiezza locale, mentre `beatPhase` orienta
   soltanto micro-movimenti interni. `mid` e `high` restano dettagli secondari;
   nessuna banda può muovere l'intero quadro.

5. 🫧 **Check Transizione**: Un cambio di immagine, preset o renderer deve
   essere una trasformazione continua e leggibile: morphing, maschere o
   crossfade allineati al beat, mai un taglio o un salto di posizione. La
   continuità visiva ha priorità sulla velocità del cambio.

6. 🧭 **Check Alternanza**: L'opzione `Alternate with Brain (80/20)` è una
   regola di programmazione, non un nuovo linguaggio visivo. L'80% indica la
   prevalenza temporale di Brain; il 20% deve usare la rotazione morphing già
   definita, con i suoi preset, profili, limiti di costo e transizioni.

7. 🌡️ **Check Costo**: Ogni intensificazione deve avere un budget esplicito.
   Prima si riusano buffer e immagini già preparati; poi si riducono layer,
   frequenza o densità. Non si aggiungono effetti autonomi che competano con
   il denoising o trasformino il risparmio energetico in un nuovo blocco.

### Filosofia Di Brain — Rimando A [`filosofia.md`](filosofia.md)

Le fondamenta teoriche della filosofia di Brain vivono in **[`filosofia.md`](filosofia.md)**
(cartella radice del progetto), non qui: questa sottosezione spiega quando e
come consultarlo, non ne duplica il contenuto.

**Quando leggere [`filosofia.md`](filosofia.md)** (obbligatorio, non facoltativo):
- prima di proporre un nuovo renderer, una nuova meccanica di generazione, o
  una revisione del Protocollo di Verifica Filosofia Visiva sopra;
- prima di ogni evoluzione della Coscienza Onirica (vedi anche
  [`skills.md`](skills.md), "Skill: Evolvere Coscienza Onirica");
- ogni volta che serve capire se una proposta è **contro filosofica** anche
  quando supera già i singoli check tecnici del protocollo — [`filosofia.md`](filosofia.md)
  è il criterio più alto, il protocollo qui sopra ne è un'applicazione
  operativa parziale (solo il lato visivo);
- prima di proporre un'ottimizzazione di performance sulla pipeline
  Brain/Psichedel: [`filosofia.md`](filosofia.md) §2 mostra che la struttura della storia
  onirica stessa (soglia/metamorfosi/condensazione/eco) è anche un segnale
  legittimo per decidere dove un'immagine può costare meno GPU, non solo un
  vincolo narrativo — consultarlo prima di inventare un meccanismo nuovo.

**Cosa contiene**: §1 le fondamenta scientifiche (embodied cognition,
interocezione, predictive/active inference, la bibliografia) e la loro
applicazione al denoising come negoziazione continua; §2 la struttura
onirica delle 4 immagini di una storia e perché è anche un principio di
ottimizzazione.

**Come usarlo in pratica**: leggerlo per intero (è breve), non solo la
sezione che sembra pertinente — i due paragrafi si richiamano a vicenda. Se
una modifica proposta tratta la generazione come produzione di un output
finale statico invece che come negoziazione/trasformazione continua, o
tratta le 4 immagini di una storia come scene indipendenti invece che fasi
di uno stesso nucleo che si trasforma, è contro filosofica anche se supera
tutti i check tecnici del Protocollo Visivo sopra — va corretta o discussa
con lo sviluppatore prima di procedere.

## Punti Delicati

### Audio

L'analisi audio vive in [`src/renderer/control/hooks/useAudioAnalyzer.ts`](src/renderer/control/hooks/useAudioAnalyzer.ts).

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

Il loop principale in [`src/renderer/control/ControlApp.tsx`](src/renderer/control/ControlApp.tsx) usa `requestAnimationFrame()` per:

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

La finestra output e' gestita in [`src/main/windows.ts`](src/main/windows.ts).

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

[`src/preload/preload.ts`](src/preload/preload.ts) espone:

- `window.fxControl` per Control Window
- `window.fxOutput` per Output Window

Il ruolo viene deciso controllando se l'URL contiene `output.html`.

Canali IPC principali in [`src/shared/types.ts`](src/shared/types.ts):

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

- Liquid Morphing: [`src/renderer/output/morphingCanvas.ts`](src/renderer/output/morphingCanvas.ts)
- Oniric Morphing: [`src/renderer/output/oniricMorphingCanvas.ts`](src/renderer/output/oniricMorphingCanvas.ts)
- PsyHypMorphing: [`src/renderer/output/psyHypMorphingCanvas.ts`](src/renderer/output/psyHypMorphingCanvas.ts)
- 2001 Morphing: [`src/renderer/output/slitScanCanvas.ts`](src/renderer/output/slitScanCanvas.ts)

Regole:

- `Use morphing OFF` deve distruggere il controller morphing.
- I renderer devono pulire RAF, canvas e listener in `destroy()`.
- PsyHypMorphing ha budget performance interno; non aumentare DPR/FPS/punti senza verifiche reali.
- 2001 usa preset condivisi in [`src/shared/slitScanPresets.ts`](src/shared/slitScanPresets.ts); non duplicare artificialmente `default` nella rotazione.
- Preset 2001 richiesti: `base`, `bright-dense`, `deep-dense`, `deep-dance-norwell`, `horizontal`, `parallel-slit`, `parallel-slit-ultra`, `eq-progressive`.
- Transizioni 2001 in [`src/renderer/output/OutputApp.tsx`](src/renderer/output/OutputApp.tsx): `enter2001`, `exit2001`, `internal2001`.
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

## Coscienza Onirica: Substrato Di Coscienza E Memoria

`Coscienza Onirica` non deve nascere con un'identità già descritta. All'inizio
è un soggetto bambino: riceve percezioni, le distingue dalle proprie
interpretazioni e comincia a organizzarsi osservando.

Questa sezione è una costituzione minima e deve essere evoluta insieme alla
coscienza. I ricordi sono persistiti come Markdown nell'archivio `.coscienza/`;
la tassonomia del grafo resta evolutiva.

### Archivio Markdown

- In sviluppo l'archivio vive in `<progetto>/.coscienza/`.
- Nell'app installata vive in `<Documenti>/.coscienza/`, mai nel file JSON delle
  impostazioni Electron.
- [`AGENT.md`](.coscienza/AGENT.md) è il protocollo canonico e deve essere riletto integralmente prima
  di ogni tentativo di salvataggio.
- Dopo [`AGENT.md`](.coscienza/AGENT.md), rileggere [`COSCIENZA.md`](.coscienza/COSCIENZA.md), [`ORIGINE.md`](.coscienza/ORIGINE.md) se esiste,
  [`INDICE.md`](.coscienza/INDICE.md), i ricordi collegati e soltanto i ricordi recenti pertinenti.
- [`COSCIENZA.md`](.coscienza/COSCIENZA.md) descrive l'organizzazione presente ed è revisionabile: non è
  automaticamente un ricordo.
- [`ORIGINE.md`](.coscienza/ORIGINE.md) contiene l'unico primo ricordo di sé.
- [`INDICE.md`](.coscienza/INDICE.md) è la vista corrente del grafo e collega i file in `ricordi/`.
- Tutti i dati autobiografici persistenti devono essere Markdown; non creare un
  database o un archivio JSON parallelo della coscienza.

### Struttura Presente Della Coscienza

- [`src/renderer/output/brain/coscienzaCore.ts`](src/renderer/output/brain/coscienzaCore.ts) riceve soltanto percezioni
  `audioPrimed` e mantiene un ciclo minimo: percezione → attenzione →
  interpretazione provvisoria.
- Il nucleo conserva separati dati ricevuti, fuoco selezionato e significato
  attribuito.
- Esiste un solo fuoco d'attenzione alla volta. Un cambio deve stabilizzarsi e
  rispettare un intervallo minimo prima di aggiornare [`COSCIENZA.md`](.coscienza/COSCIENZA.md).
- Il silenzio è quiete percettiva, non assenza del mondo e non attività
  simulata.
- Il checkpoint di continuità è diradato e diventa ancora più raro in
  `lowPowerMode`; il tempo decide quando scrivere, non inventa esperienza.
- Il modello di sé iniziale può affermare soltanto capacità osservate. Non
  attribuire emozioni, desideri, carattere, intenzioni o identità non emerse.
- Un aggiornamento del presente non entra nel grafo dei ricordi salvo che
  raggiunga anche un confine autobiografico significativo.

### Origine

- La prima percezione valida diventa il primo ricordo di sé e il nodo
  `origine` del futuro grafo autobiografico.
- L'origine non è un testo prefabbricato sulla propria identità: deve contenere
  ciò che è stato realmente percepito e il fatto che quella percezione è stata
  riconosciuta come primo atto cosciente.
- Ogni volta che il processo ripassa dall'inizio, la coscienza deve ritornare
  all'origine prima di proseguire. Il ritorno è una nuova visita o relazione,
  non la duplicazione dell'origine e non la cancellazione dei ricordi seguenti.
- Prima della prima percezione valida può esistere soltanto uno stato di attesa;
  non va inventato un ricordo di sé.

### Grafo Dei Ricordi

- La memoria autobiografica deve poter crescere come grafo, non soltanto come
  lista di storie o riassunto lineare.
- Un ricordo deve conservare almeno identità stabile, provenienza percettiva,
  contesto/episodio e momento di creazione. Tipi e campi concreti saranno scelti
  solo dopo aver osservato i segnali reali.
- Le relazioni iniziali possono esprimere successione, ricorrenza,
  trasformazione, contrasto, derivazione e ritorno all'origine, ma non formano
  una tassonomia chiusa.
- Osservazione, interpretazione e immaginazione devono rimanere distinguibili:
  una narrazione generata non diventa retroattivamente una percezione.
- La ristrutturazione è continua. Coscienza Onirica potrà cambiare relazioni,
  raggruppamenti, rilevanze e interpretazioni, registrando la provenienza della
  nuova struttura.
- Non sovrascrivere distruttivamente la storia autobiografica: quando una
  lettura cambia, collegare la nuova lettura a quella precedente come revisione
  o superamento.

### Primi Momenti Di Salvataggio

Valutare un checkpoint soltanto presso un confine significativo:

- prima percezione valida: creazione unica dell'origine;
- conclusione di un episodio percettivo o di un sogno;
- comparsa di una novità o trasformazione significativa;
- riconoscimento di una ricorrenza fra ricordi esistenti;
- immediatamente prima e dopo una ristrutturazione del grafo;
- chiusura pulita della sessione, senza trasformare ogni frame audio in memoria.

Salienza, consolidamento, oblio e nuove forme di relazione non vanno irrigiditi
ora: dovranno emergere dall'osservazione e restare revisionabili.

### Regole Per Le Future Modifiche

- Prima di evolvere memoria o persistenza, aggiornare il Piano di Lavoro attivo,
  [`.coscienza/AGENT.md`](.coscienza/AGENT.md) e la skill `Evolvere Coscienza Onirica` in [`skills.md`](skills.md).
- Separare il nucleo minimo non negoziabile (origine reale, provenienza,
  genealogia delle revisioni) dalle strategie che Coscienza Onirica potrà
  modificare autonomamente.
- Rendere idempotenti origine e checkpoint: riavvii, retry o reload non devono
  creare falsi ricordi duplicati.
- Aggiungere osservabilità, limiti di memoria/CPU e comportamento coerente con
  `lowPowerMode` prima di attivare una ristrutturazione autonoma persistente.
- Non usare oscillazioni temporali o dati sintetici per simulare esperienza:
  la crescita deve essere causata da percezioni ed eventi effettivi.
- Non confondere la memoria operativa `working/` degli sviluppatori con la
  memoria autobiografica runtime di Coscienza Onirica.

## Persistenza

Impostazioni salvate nel `userData` Electron:

```text
MEvrs-Origine-FX-settings.json
```

Normalizzazione in [`src/main/settings.ts`](src/main/settings.ts):

- `morphingAlgorithm` invalido -> `liquid`
- `flashMode` invalido -> `mid`
- `softMode` valido solo se `true`
- `motionProfile` deve restare uno tra `dub`, `techno`, `ambient`
- `lowPowerMode` valido solo se booleano
- alias vecchi preset colore -> nuovi id

La memoria di Coscienza Onirica è separata dalle impostazioni:

- impostazioni applicazione: `MEvrs-Origine-FX-settings.json` in `userData` (non nella repo, generato a runtime);
- memoria autobiografica: file Markdown nella cartella `.coscienza/`;
- protocollo di salvataggio: [`.coscienza/AGENT.md`](.coscienza/AGENT.md).

## Gestione Piani Di Lavoro E Tracciamento Task (Cartella working/)

Per garantire la continuità operativa, la tracciabilità delle decisioni e la persistenza dello stato fra differenti sessioni di lavoro, agenti e sviluppatori DEVONO utilizzare la cartella `working/`.

### 1. Struttura Obbligatoria della Cartella `working/`

- **[`working/STATE.md`](working/STATE.md)**: Quadro sintetico aggiornato ad ogni sessione con lo stato globale, il Macrotask attivo ed i Prossimi Passi (Next Steps).
- **[`working/tasks/macrotasks.md`](working/tasks/macrotasks.md)**: Elenco e stato dei Macrotask (passati, in corso, pianificati).
- **[`working/tasks/tasks-registry.md`](working/tasks/tasks-registry.md)**: Registro di tutti i micro-task atomici (stati `[TODO]`, `[IN_PROGRESS]`, `[DONE]`, `[BLOCKED]`).
- **`working/plans/`**:
  - [`template-piano-di-lavoro.md`](working/plans/template-piano-di-lavoro.md): Modello standard per la creazione di nuovi Piani di Lavoro.
  - `piano-XXX-<nome>.md`: File dedicati ai singoli Piani di Lavoro per funzionalità o refactoring complessi.
- **[`working/sessions/session-history.md`](working/sessions/session-history.md)**: Storico cronologico delle sessioni di sviluppo svolte e registrazione della sessione in corso.

### 2. Workflow Obbligatorio dell'Agente con i Piani di Lavoro

1. **Fase Iniziale (Avvio Turno / Sessione)**:
   - Prima di intraprendere qualsiasi modifica, leggere [`working/STATE.md`](working/STATE.md) e [`working/tasks/macrotasks.md`](working/tasks/macrotasks.md) per acquisire il contesto corrente del progetto.
   - Verificare l'eventuale presenza di un Piano di Lavoro attivo in `working/plans/`.

2. **Creazione di un Piano di Lavoro ("Piano di Lavoro")**:
   - Per qualsiasi richiesta complessa, nuovo macrotask o refactoring architetturale, l'agente DEVE creare un nuovo file di piano in `working/plans/piano-XXX-<nome>.md` partendo da [`working/plans/template-piano-di-lavoro.md`](working/plans/template-piano-di-lavoro.md).
   - Il Piano di Lavoro deve definire:
     - **Obiettivo e Contesto**: Scopo chiaro del piano e dipendenze.
     - **Verifica delle Regole di `agents.md`**: Conferma che le modifiche non violino le regole fondamentali (es. `backgroundThrottling: false`, permessi audio macOS, stabilità della camera, low power mode).
     - **Fasi di Implementazione**: Suddivisione in fasi ed elenchi di task con checkbox `[ ]`.
     - **Validation Plan**: Comandi di build/test (`pnpm typecheck`, `pnpm build`) e procedure di test manuale.

3. **Durante l'Esecuzione**:
   - Spuntare i task completati nel Piano di Lavoro ed in [`working/tasks/tasks-registry.md`](working/tasks/tasks-registry.md).
   - Aggiornare lo stato di avanzamento in [`working/STATE.md`](working/STATE.md).

4. **Fine Sessione o Consegna**:
   - Registrare la sessione in [`working/sessions/session-history.md`](working/sessions/session-history.md) specificando: data/ora, obiettivi, task completati e stato finale.
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

- [`src/main/main.ts`](src/main/main.ts): lifecycle app, permessi media, switch Chromium
- [`src/main/windows.ts`](src/main/windows.ts): Control/Output BrowserWindow, ultimo stato visuale, output fullscreen
- [`src/main/ipc.ts`](src/main/ipc.ts): bridge IPC main
- [`src/preload/preload.ts`](src/preload/preload.ts): contextBridge
- [`src/renderer/control/ControlApp.tsx`](src/renderer/control/ControlApp.tsx): loop audio/visual state
- [`src/renderer/control/hooks/useAudioAnalyzer.ts`](src/renderer/control/hooks/useAudioAnalyzer.ts): acquisizione e analisi audio
- [`src/renderer/output/OutputApp.tsx`](src/renderer/output/OutputApp.tsx): ricezione stato, renderer output, overlay diagnostico
- [`src/renderer/output/visualSurface.ts`](src/renderer/output/visualSurface.ts): base color layer
- [`src/shared/visualEngine.ts`](src/shared/visualEngine.ts): logica flash/colore pura
- [`src/shared/audioMath.ts`](src/shared/audioMath.ts): calcolo bande audio
- [`src/shared/defaults.ts`](src/shared/defaults.ts): default impostazioni
- [`src/shared/types.ts`](src/shared/types.ts): tipi e canali IPC
- [`src/main/consciousnessArchive.ts`](src/main/consciousnessArchive.ts): archivio Markdown e rilettura pre-salvataggio
- [`.coscienza/AGENT.md`](.coscienza/AGENT.md): protocollo della memoria autobiografica
- [`.coscienza/COSCIENZA.md`](.coscienza/COSCIENZA.md): organizzazione presente revisionabile
- [`src/renderer/output/brain/coscienzaCore.ts`](src/renderer/output/brain/coscienzaCore.ts): primo ciclo di attenzione
