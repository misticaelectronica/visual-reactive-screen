# Brain: modelli AI, text-to-image e vettorializzazione

Aggiornato al 28 luglio 2026.

Questa guida descrive la pipeline AI realmente usata da Brain, come scegliere modelli
compatibili e quali parametri modificare. Non descrive integrazioni simulate o modelli
che richiedono servizi esterni non presenti nel progetto.

## Migrazione immagini Explicit: stato attuale

La V1 usa un solo checkpoint Explicit SD 1.5:
`stablediffusionapi/pornmaster`, revisione
`0f8590a83a85e267a9cc12eaf657baa222938f08`.

Il checkpoint è stato convertito in ONNX FP16 e il profilo Quality è stato validato
in un prototipo browser isolato con quattro generazioni WebGPU consecutive, cache
locale e una prova Explicit. Il runtime usa direttamente
`onnxruntime-web/webgpu`; non usa `web-txt2img`.

Il generatore Explicit è ora il percorso standard di Psichedel in sviluppo.
`ExplicitPsychedelImageGenerator` carica gli ONNX locali da `/prototype-models/`,
mostra il nome reale nella barra destra e riusa la sessione WebGPU. SD-Turbo e
Janus restano soltanto nel vecchio adapter non istanziato.

La pubblicazione degli ONNX è ancora necessaria per una distribuzione che non
dipenda dagli artefatti locali. La vera modalità Turbo LCM non viene simulata
riducendo arbitrariamente gli step.

Decisione, vincoli e criteri di collaudo:
[`psychedel-explicit-v1.md`](psychedel-explicit-v1.md).

## Architettura attuale

Il ciclo completo è:

```text
frasi casuali e memoria
        ↓
CoscienzaOnirica: storia + palette
        ↓
modello leggero: quattro descrizioni visive
        ↓
Psichedel: prompt text-to-image
        ↓
PornMaster SD 1.5 Explicit ONNX: raster PNG
        ↓
VTracer: SVG a colori
        ↓
controllo qualità e sanitizzazione
        ↓
Brain: movimento, morphing, ritmo e variazione cromatica
```

File principali:

| Responsabilità | File |
| --- | --- |
| Configurazione condivisa | `src/shared/brain/brainConfig.ts` |
| Client e Worker dei modelli testuali | `src/renderer/output/brain/brainAiClient.ts`, `brainAiWorker.ts` |
| Storie, memo e piano visivo | `src/renderer/output/brain/coscienzaOnirica.ts` |
| Prompt, tentativi e orchestrazione immagini | `src/renderer/output/brain/psichedel.ts` |
| Caricamento dei modelli text-to-image | `src/renderer/output/brain/psychedelImageGenerator.ts` |
| Vettorializzazione VTracer | `src/main/brainVectorizer.ts` |
| Controllo qualità SVG | `src/renderer/output/brain/brainVectorQuality.ts` |
| Rendering e movimento SVG | `src/renderer/output/brain/brainSvgScene.ts` |

## Modelli attivi

### Testo

| Compito | Modello |
| --- | --- |
| Storia | `onnx-community/Qwen2.5-0.5B-Instruct-abliterated-v3-ONNX` (`q4`) |
| Memo di sessione | `onnx-community/Qwen2.5-0.5B-Instruct-abliterated-v3-ONNX` |
| Piano visivo in inglese | `onnx-community/Qwen2.5-0.5B-Instruct-abliterated-v3-ONNX` |

Tutti i compiti testuali condividono una sola sessione locale `q4`. La pipeline
linguistica usa tre passaggi AI distinti: traduzione degli input dall’italiano
all’inglese, creazione interna della storia in inglese e traduzione editoriale
dell’output in italiano per l’interfaccia. I traduttori non devono modificare,
censurare, riassumere o aggiungere contenuti.

La quantizzazione `q4f16` non viene usata perché sul runtime WebGPU corrente ha
prodotto output numericamente corrotti con più checkpoint Qwen. Il primo download
non deve essere confuso con la velocità d’inferenza: i log distinguono
esplicitamente cache, rete, creazione sessione e inferenza.

## Download, cache e durata delle sessioni

I modelli non vengono scaricati a ogni storia:

- Transformers.js conserva i modelli testuali in `transformers-cache`;
- `web-txt2img` conserva i modelli immagine in `web-txt2img-v1`;
- entrambe sono cache persistenti su disco nel profilo locale dell’app;
- Worker testuale e sessione immagine restano residenti finché Brain rimane attivo;
- le sessioni vengono rilasciate quando Brain viene disattivato o distrutto.

All’avvio di Brain, `brainModelCache.ts` confronta i repository presenti nella cache
con gli ID di `brainConfig.ts`. Conserva gli artefatti ancora configurati e cancella
soltanto le risorse Hugging Face dei modelli rimossi dalla configurazione. I file
runtime locali e WASM non vengono coinvolti.

Cambiare un ID in `brainConfig.ts` produce quindi questo comportamento:

1. il vecchio modello viene eliminato dalla cache persistente;
2. il nuovo modello viene scaricato al primo utilizzo;
3. gli utilizzi successivi leggono la copia locale;
4. durante la stessa esecuzione viene riusata la sessione già in memoria.

## Frasi esterne

Le frasi narrative non vengono più importate nel bundle. Il file attivo è:

```text
config/brainPhrases.txt
```

Prima di ogni nuova storia, `brainController` chiama `loadBrainPhrases()`, che
richiede il file al processo principale attraverso il preload. Il processo
principale accetta esclusivamente nomi di configurazione autorizzati e legge:

- `<root progetto>/config` durante lo sviluppo;
- `<resources applicazione>/config` nella build pacchettizzata.

Righe vuote e commenti che iniziano con `#` vengono ignorati. Un file mancante o
senza frasi valide produce un errore esplicito e impedisce la generazione con dati
vecchi incorporati nel compilato.

### Come leggere i log delle prestazioni

I log del Worker distinguono esplicitamente:

| Etichetta | Significato |
| --- | --- |
| `DOWNLOAD RETE` | Uno o più file richiesti non sono nella cache e vengono scaricati. |
| `CACHE LOCALE` | I byte vengono letti dalla copia persistente salvata sul computer. |
| `CREAZIONE SESSIONE` | ONNX Runtime sta preparando la sessione WebGPU o WASM. |
| `INFERENZA` | Il modello sta elaborando il prompt e generando token. |
| `SESSIONE RIUSATA` | La sessione è già pronta: nessun download e nessuna nuova inizializzazione. |

I log includono byte trasferiti, durata di preparazione, durata della sessione e
durata dell’inferenza. Transformers.js chiama internamente `download` anche la lettura
dalla Cache API; Brain controlla prima le chiavi realmente presenti e mostra quindi
l’origine effettiva con una delle etichette precedenti.

### Immagini

Il generatore attivo è `pornmaster-sd15-explicit-onnx-fp16`, eseguito direttamente
da `onnxruntime-web/webgpu`, senza safety checker.

| Profilo UI | Checkpoint | Step |
| --- | --- | ---: |
| `standard` | PornMaster SD 1.5 Explicit ONNX | 16 |
| `enhanced` | PornMaster SD 1.5 Explicit ONNX | 20 |
| `high-quality` | PornMaster SD 1.5 Explicit ONNX | 24 |

I profili cambiano il numero di step, non l'identità del checkpoint. Il render ad
alta qualità resta richiesto casualmente una volta ogni 2–5 immagini; se il profilo
24 step esaurisce la memoria, la sessione prosegue con il profilo standard dello
stesso checkpoint.

`web-txt2img@0.3.1`, SD-Turbo e Janus sono conservati temporaneamente nel codice
come adapter legacy, ma il costruttore predefinito di Psichedel non li usa.

## Come filtrare Hugging Face per il text-to-image

### Risposta breve

Nella schermata mostrata:

1. Selezionare `Text-to-Image`.
2. Selezionare `Transformers.js`.
3. Non usare `Diffusers`, `Safetensors`, `GGUF` o `MLX` come prova di compatibilità
   con Brain.
4. Non considerare sufficiente il filtro dei parametri `<1B`.

Link di partenza:

<https://huggingface.co/models?pipeline_tag=text-to-image&library=transformers.js>

Per cercare pesi dichiarati senza restrizioni aggiungere `uncensored` o `nsfw` nella
barra di ricerca, ma applicare comunque tutta la verifica tecnica seguente. Brain
non espone un interruttore generico `safetyChecker: false`: l’eventuale comportamento
restrittivo dipende dai pesi e dall’adapter del singolo modello.

Questi filtri servono soltanto a trovare candidati. **Non rendono automaticamente un
modello compatibile con Psichedel.** L’applicazione non passa un ID Hugging Face
arbitrario a una pipeline generica: chiama il registro chiuso di `web-txt2img`.

### Verifica manuale di un candidato

Un modello nuovo deve soddisfare tutti i punti applicabili:

- È un repository di modello, non uno Space Gradio.
- È pubblico e non richiede accettazione manuale o token.
- La licenza consente l’uso previsto.
- Dichiara esplicitamente compatibilità con Transformers.js oppure fornisce ONNX
  eseguibili nel browser.
- Contiene tokenizer, processor, configurazione e chat/image template richiesti.
- Contiene tutte le parti della pipeline, non soltanto un singolo `model.onnx`.
- Funziona con WebGPU e con la versione di `@huggingface/transformers` del progetto.
- La memoria necessaria lascia spazio a Electron, Canvas, modelli testuali e
  vettorializzazione.
- Produce PNG o JPEG decodificabili.
- Tempi di generazione e caricamento sono compatibili con una performance live.

Un tag `uncensored` descrive il comportamento desiderato, non il formato tecnico.
Non sostituisce ONNX, Transformers.js, WebGPU o un adapter.

### Filtri che non bastano

| Filtro/tag | Perché non basta |
| --- | --- |
| `Diffusers` | Normalmente descrive una pipeline Python/PyTorch. |
| `Safetensors` | È un formato di pesi, non una pipeline browser. |
| `GGUF` | Richiede normalmente `llama.cpp`; è soprattutto usato per modelli testuali. |
| `MLX` | È destinato al runtime MLX, non a ONNX Runtime Web. |
| `Inference Provider` | Indica un servizio remoto; Brain attualmente genera localmente. |
| `<1B` | Il numero di parametri non descrive VAE, UNet, text encoder, memoria né velocità reale. |
| `uncensored` | Non garantisce né compatibilità né qualità narrativa/visiva. |

## Adapter legacy `web-txt2img`

Il vecchio adapter rimane limitato dal tipo esportato da `web-txt2img@0.3.1`:

```ts
type ModelId = 'sd-turbo' | 'janus-pro-1b'
```

La libreria associa ciascun ID a un adapter specifico. L’adapter stabilisce:

- quali file scaricare;
- come creare le sessioni WebGPU;
- nomi, tipi e dimensioni degli input ONNX;
- tokenizer o processor;
- algoritmo di inferenza;
- conversione dell’output in `Blob`;
- caricamento, cache, annullamento e rilascio memoria.

Scrivere, per esempio:

```ts
imageModelId: 'un-autore/un-modello'
```

non aggiunge il modello: produce un errore TypeScript oppure `Unknown model id`.

## Come aggiungere un altro modello text-to-image

Non modificare `node_modules`: ogni `pnpm install` cancellerebbe il lavoro.

Le due strategie corrette sono:

### Strategia A: aggiornare o creare un fork di `web-txt2img`

1. Aggiungere il nuovo ID a `ModelId`.
2. Implementare un nuovo `Adapter`.
3. Registrarlo in `registry.ts`.
4. Implementare almeno:
   - `checkSupport`;
   - `load`;
   - `isLoaded`;
   - `generate`;
   - `unload`;
   - `purgeCache`.
5. Pubblicare o collegare il fork nel `package.json`.
6. Aggiornare `BRAIN_CONFIG`.
7. Verificare build e pacchetti Electron su tutte le piattaforme richieste.

### Strategia B: creare un adapter locale del progetto

1. Creare un generatore che implementi `PsychedelImageGenerator`.
2. Gestire download/cache, WebGPU, timeout, progress e abort.
3. Restituire `{ blob, durationMs, model }`.
4. Selezionarlo in `Psichedel` senza dipendere dal tipo chiuso `ModelId`.
5. Conservare il fallback reale e visibile nei log.

Questa strategia evita di mantenere un fork, ma richiede tutta la pipeline di
inferenza del modello.

### Caso speciale: variante compatibile di SD-Turbo

L’adapter SD-Turbo corrente si aspetta esattamente:

```text
unet/model.onnx
text_encoder/model.onnx
vae_decoder/model.onnx
```

e queste firme principali:

```text
text_encoder: input_ids → last_hidden_state
unet: sample + timestep + encoder_hidden_states → out_sample
vae_decoder: latent_sample → sample
```

Usa inoltre:

- sequenza CLIP di 77 token;
- latente `1×4×64×64`;
- timestep singolo `999`;
- output fisso 512×512.

`modelBaseUrl` può puntare a un repository alternativo soltanto se layout, tensori,
forme e scheduler sono realmente identici. Non è un meccanismo generico per caricare
Stable Diffusion, SDXL, FLUX o altri modelli.

## Parametri text-to-image

I parametri centralizzati sono in `src/shared/brain/brainConfig.ts`.

| Parametro | Valore attuale | Effetto |
| --- | ---: | --- |
| `imageModelId` | `pornmaster-sd15-explicit-onnx-fp16` | Checkpoint standard reale |
| `highQualityImageModelId` | `pornmaster-sd15-explicit-onnx-fp16` | Stesso checkpoint, profilo 24 step |
| `imageModelBaseUrl` | `/prototype-models/pornmaster-sd15-onnx` | Base URL stabile degli ONNX; conserva la cache del collaudo |
| `imageStandardSteps` | `16` | Step standard |
| `imageEnhancedSteps` | `20` | Step migliorato |
| `imageQualitySteps` | `24` | Step alta qualità |
| `imageWidth` | `512` | Larghezza raster |
| `imageHeight` | `512` | Altezza raster |
| `imageGenerationTimeoutMs` | `120000` | Timeout di una generazione Explicit |
| `imageCapabilityTimeoutMs` | `12000` | Timeout della verifica WebGPU |
| `imageModelLoadTimeoutMs` | `1200000` | Timeout download/caricamento modello |
| `vectorMaxSourceBytes` | `12 MiB` | Limite PNG/JPEG passato a VTracer |

Attenzione:

- Il checkpoint Explicit resta a 512×512.
- Il seed è supportato.
- Gli step sono selezionati dai tre parametri del profilo.
- Guidance scale e scheduler provengono dal manifesto del checkpoint.
- Non viene aggiunto alcun negative prompt.

## Come modificare i prompt immagine

Il prompt finale è costruito da `buildPsychedelImagePrompt()` in
`src/renderer/output/brain/psichedel.ts`.

Il comportamento corrente è volutamente letterale:

1. usa `frame.imagePrompt` quando presente;
2. altrimenti usa `frame.description`;
3. aggiunge soltanto `Main argument: ...` quando la storia lo contiene.

Il generatore immagini non aggiunge stili, composizioni, palette, negative prompt,
traduzioni o parole “psichedeliche”. La descrizione visiva e il `mainArgument`
devono essere prodotti correttamente a monte da CoscienzaOnirica.

Per evitare risultati puramente astratti:

- usare un soggetto identificabile;
- descrivere una sola azione fisica;
- indicare luogo, profondità e inquadratura;
- evitare sequenze di soli aggettivi;
- evitare simboli vaghi senza oggetti o figure;
- non sovraccaricare il prompt con stili incompatibili.

Il piano visivo generato dal modello leggero viene salvato in `frame.imagePrompt` e
ha precedenza sulla descrizione narrativa grezza. Nei log il campo `prompt` deve
quindi coincidere con il testo passato al tokenizer, salvo la riga separata del
`Main argument`.

## Tentativi e qualità

In `Psichedel.generate()`:

- ogni fotogramma ha al massimo due tentativi;
- il seed cambia fra fotogrammi, storie, round e tentativi;
- un fotogramma già valido viene conservato durante un retry;
- gli errori infrastrutturali fermano il retry automatico aggressivo;
- il modello viene rilasciato dopo il completamento della storia.

`HighQualityRenderScheduler` usa attualmente:

```ts
2 + Math.floor(Math.random() * 4)
```

quindi seleziona un render HQ ogni 2–5 immagini. Per cambiare la frequenza bisogna
modificare `nextInterval()` e i relativi test in `brainPipeline.test.ts`.

## Vettorializzazione

Il raster RGBA viene inviato via IPC al processo main. Il motore predefinito è
`SNIC edge-guided`, interamente CPU e senza modelli aggiuntivi:

1. i pixel vengono trasformati in OKLab;
2. SNIC genera superpixel connessi usando colore e distanza spaziale;
3. le regioni adiacenti vengono aggregate quando colore e contrasto del bordo
   sono compatibili;
4. i confini vengono ricalcolati dopo le fusioni, così la decisione riguarda la
   forma corrente e non i superpixel iniziali;
5. le isole piccole vengono assorbite senza attraversare bordi molto forti;
6. i perimetri vengono estratti con gerarchia dei vuoti, semplificati entro un
   budget globale e convertiti in curve SVG arrotondate.

Le metriche `strongEdgeRecall`, rugosità, punte, forme, colori e comandi decidono
se il candidato è utilizzabile. Se fallisce e `fallbackToVTracer` è attivo, la
pipeline usa `@visioncortex/vtracer` senza ripetere il pretrattamento raster.

Profili di fallback:

| Profilo | Obiettivo |
| --- | --- |
| `balanced` | Primo tentativo generale |
| `detailed` | Più dettagli e colori |
| `simplified` | Riduzione della complessità |

VTracer parte da `balanced`, calcola `simplified` solo quando necessario e
riserva `detailed` al recupero strutturale.

I parametri principali sono in `VECTOR_PROFILES`:

- `filterSpeckle`: rimuove dettagli piccoli; più alto significa meno rumore.
- `colorPrecision`: precisione nella separazione cromatica.
- `layerDifference`: differenza necessaria fra livelli di colore.
- `cornerThreshold`: sensibilità agli angoli.
- `lengthThreshold`: semplificazione dei segmenti corti.
- `spliceThreshold`: fusione dei segmenti.
- `pathPrecision`: precisione numerica dei tracciati.
- `maxColors`: numero massimo di colori.
- `optimize`: livello di ottimizzazione.

Cambiare questi valori può aumentare pesantemente il costo del morphing.

Parametri SNIC principali:

| Parametro | Uso |
| --- | --- |
| `snicSuperpixelSize` | Dimensione media delle regioni iniziali |
| `snicCompactness` | Equilibrio fra vicinanza spaziale e colore |
| `snicMergeColorThreshold` | Compatibilità cromatica per la fusione |
| `snicStrongEdgeThreshold` | Protezione dei confini forti |
| `snicMaximumRegions` | Obiettivo massimo di forme finali |
| `contourSimplificationTolerance` | Riduzione dei punti con errore limitato |
| `contourMaximumPoints` | Budget globale della geometria animabile |
| `minimumStrongEdgeRecall` | Copertura minima richiesta dei bordi forti |

Con i default, un fotogramma 640×360 ha un obiettivo di 72 regioni e 2400 punti.
Il test prestazionale dedicato verifica inoltre che il percorso resti sotto tre
secondi su una macchina di sviluppo; normalmente il costo osservato è molto più
basso e non usa GPU.

## Controllo qualità SVG

`inspectBrainVector()` rifiuta attualmente:

- SVG sotto 2.500 caratteri;
- SVG sopra 600.000 caratteri;
- `viewBox` assente o invalido;
- meno di 5 forme;
- più di 180 forme;
- meno di 4 path;
- meno di 24 comandi di tracciato;
- meno di 3 colori;
- elementi `image`, `foreignObject`, `script` o `text`.

Queste soglie misurano robustezza e costo, non il significato estetico
dell’immagine. La riconoscibilità deve essere ottenuta prima, attraverso storia,
piano visivo, prompt e modello raster.

## Inquadratura, POV e profondità

Il renderer Brain non ingrandisce più globalmente lo SVG per riempire lo schermo.
Usa:

```text
preserveAspectRatio="xMidYMid meet"
```

Il fotogramma conserva quindi le proprie proporzioni e non viene sottoposto a zoom
o ritaglio automatico. Lo spazio esterno usa il colore profondo della palette della
scena.

L'effetto cinematografico è prodotto internamente dai livelli vettoriali:

- ogni forma riceve una profondità deterministica;
- i livelli vicini e lontani rispondono diversamente allo spostamento della camera;
- yaw e pitch modificano la parallasse rispetto al centro della scena;
- luce e colore variano con la profondità;
- nessun movimento di camera contiene `scale()`, fade o zoom.

Il POV dipende dal pattern di morphing:

| Pattern | POV |
| --- | --- |
| `marea` | deriva lenta |
| `corrente` | carrello laterale |
| `spirale` | orbita |
| `fioritura` | angolo basso |

Le traiettorie sono continue e ricevono dall'audio soltanto una modulazione
smussata. Il calcolo della camera avviene una volta per aggiornamento; vengono poi
trasformati soltanto i livelli compresi nel budget prestazionale corrente. Le scene
pesanti e `lowPowerMode` mantengono limiti più bassi.

## Parametri dei modelli testuali

In `brainConfig.ts`:

| Parametro | Uso |
| --- | --- |
| `storyModelId` | CoscienzaOnirica |
| `memoModelId` | Memoria di sessione |
| `visualModelId` | Quattro prompt visivi |
| `storyMaxNewTokens` / `storyMinNewTokens` | Default Worker per la storia |
| `sceneMaxNewTokens` / `sceneMinNewTokens` | Default Worker per memo e piano visivo |
| `modelDtype` | Quantizzazione del fallback WASM |
| `webGpuModelDtype` | Quantizzazione WebGPU |
| `generationTimeoutMs` | Timeout richieste testuali |

Limiti specifici passati da CoscienzaOnirica:

- storia normale: 90–360 nuovi token;
- riparazione storia: 90–380;
- memo: 48–180;
- piano visivo: 80–240.

Per sostituire un modello testuale, verificare:

- task `Text Generation`;
- libreria `Transformers.js`;
- cartella `onnx/`;
- `model_q4.onnx` e preferibilmente `model_q4f16.onnx`;
- tokenizer completo;
- chat template compatibile con `system`, `user`, `assistant`;
- italiano o multilingua;
- modello Instruct/Chat;
- assenza di gating;
- dimensione adatta alla GPU.

## Procedura di collaudo dopo una modifica

Eseguire:

```bash
pnpm typecheck
pnpm test
```

Per modifiche al main process, preload o packaging:

```bash
pnpm build
```

Verifica manuale minima:

1. Il log mostra gli ID dei modelli attesi.
2. WebGPU viene rilevato.
3. La prima storia è completa e in italiano.
4. Il piano visivo contiene quattro scene concrete.
5. Il raster è realmente generato e appare nel monitor destro.
6. VTracer produce un SVG accettato.
7. Le forme si muovono senza bloccare il rendering.
8. La storia successiva viene preparata mentre la corrente è visualizzata.
9. Un fallimento del profilo 24 step continua con lo stesso checkpoint in modalità standard.

## Errori frequenti

### `Unknown model id`

L’ID non è registrato in `web-txt2img`.

### `Only 512x512 is supported`

Ripristinare `imageWidth` e `imageHeight` a 512 oppure implementare un adapter con
forme dinamiche.

### `no available backend found`

WebGPU non è disponibile oppure ONNX Runtime non trova i propri file WASM di
supporto. Controllare il log `runtime ONNX configurato`.

### Download fermo o modello che non parte

Controllare rete, cache, memoria GPU e timeout di caricamento. Il primo download è
di diversi gigabyte.

### Immagini astratte o prive di soggetto

Controllare prima `frame.imagePrompt` nei log. Il vettorializzatore non può
ricostruire un soggetto assente dal raster.

### SVG enorme o morphing lento

Ridurre colori e dettagli nei profili VTracer; non aumentare il limite di 180 forme
senza una prova prestazionale reale.

## Fonti tecniche

- `web-txt2img`: <https://github.com/lacerbi/web-txt2img>
- Transformers.js: <https://huggingface.co/docs/transformers.js>
- Modelli Transformers.js: <https://huggingface.co/models?library=transformers.js>
- ONNX Runtime Web/WebGPU:
  <https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html>
- VTracer: <https://github.com/visioncortex/vtracer>
