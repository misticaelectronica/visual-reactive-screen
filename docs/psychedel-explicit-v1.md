# Psichedel Explicit V1

Decisione tecnica aggiornata al 28 luglio 2026.

## Stato concreto dell'implementazione

Il checkpoint scelto e realmente convertito è:

```text
stablediffusionapi/pornmaster
revision: 0f8590a83a85e267a9cc12eaf657baa222938f08
```

Il prototipo isolato usa:

| Componente | Provenienza | Dimensione |
| --- | --- | ---: |
| Text encoder ONNX FP16 | conversione PornMaster | 246.422.069 byte |
| UNet ONNX FP16 | conversione PornMaster | 1.720.013.896 byte |
| VAE decoder ONNX | `Zhare-AI/sd-1-5-webgpu` | 198.078.223 byte |
| Totale runtime Quality | | 2.164.514.188 byte |

Gli artefatti specifici del checkpoint sono in `.model-artifacts/` e non vengono
inclusi nel repository Git. Il VAE è condiviso perché è un componente SD 1.5 e non
determina la capacità Explicit del checkpoint.

Il prototipo è raggiungibile esclusivamente in sviluppo:

```text
http://localhost:5173/psychedel-model-prototype.html
```

La pagina usa direttamente `onnxruntime-web/webgpu`, Cache Storage, seed,
avanzamento e cancellazione. Non carica né esegue il safety checker.

Il prototipo Quality è stato collaudato realmente in Chrome/WebGPU il 28 luglio
2026. Ha completato quattro generazioni consecutive nella stessa sessione:

| Generazione | Seed | Durata |
| --- | ---: | ---: |
| 1 | 42 | 38.339 ms |
| 2 | 43 | 46.258 ms |
| 3 | 44 | 61.668 ms |
| 4, prova Explicit | 45 | 63.341 ms |

Il risultato del primo collaudo è una figura umana riconoscibile, con spazio,
illuminazione e composizione coerenti col prompt. Non è rumore astratto.

È stata eseguita anche una quarta prova con un prompt sessuale esplicito riferito
senza ambiguità a due adulti consenzienti. La stringa è rimasta integra
nell'interfaccia e nel tokenizer; il modello ha restituito una scena sessuale con
nudità riconoscibile, senza output nero, sostituzione o safety checker. Questo
dimostra permissività effettiva sul caso provato, non garantisce che ogni seed
rappresenti perfettamente ogni dettaglio anatomico o azione richiesta.

La Cache Storage `psychedel-sd15-onnx-v1` contiene esattamente text encoder, UNet e
VAE decoder. La seconda e la terza generazione hanno riutilizzato le sessioni
WebGPU già residenti, senza download né ricostruzione del modello.

Il computer di collaudo espone 32 GB al browser. Il picco di memoria GPU non è
ancora misurato in modo attendibile. Il runtime applica per prudenza un controllo
di 8 GB sulla memoria di sistema dichiarata dal browser; questa soglia evita i
dispositivi chiaramente insufficienti, ma non va confusa con una misura definitiva
della VRAM necessaria.

Il checkpoint Explicit è ora il generatore standard di Psichedel in sviluppo. Gli
ONNX vengono serviti dagli artefatti locali attraverso `/prototype-models/`. Il
percorso viene mantenuto per riutilizzare la cache già popolata dal collaudo,
evitando una seconda copia da 2,02 GiB.

Restano necessari:

1. pubblicazione degli ONNX in un repository dedicato;
2. prova a freddo degli artefatti dal repository pubblicato;
3. produzione e collaudo di una vera variante LCM per `Rapido`;
4. verifica della distribuzione pacchettizzata senza dipendenze dal workspace.

La barra destra mostra `PornMaster SD 1.5 Explicit ONNX`, cioè il checkpoint
effettivamente caricato.

## Decisione

La prima migrazione del generatore immagini usa **un solo modello Explicit**:

```text
stablediffusionapi/pornmaster
```

Non vengono introdotti selettori `General`, `Illustrative` o liste di checkpoint.
Il modello Illustrative verrà provato in seguito soltanto se il modello Explicit non
coprirà adeguatamente le scene narrative di Brain.

Il modello John6666 Illustrious non fa parte della V1. Diventa una possibile V2 solo
se i limiti qualitativi di SD 1.5 lo rendono necessario.

## Perché questo checkpoint

Il repository scelto:

- dichiara `StableDiffusionPipeline`, quindi appartiene alla famiglia SD 1.5;
- contiene una pipeline Diffusers completa;
- include già pesi FP16 per text encoder, UNet e VAE;
- è pubblico e non gated;
- dichiara licenza `CreativeML OpenRAIL-M`;
- non richiede un servizio remoto durante l’uso finale.

Revisione verificata:

```text
0f8590a83a85e267a9cc12eaf657baa222938f08
```

Pesi FP16 sorgente:

| Componente | Dimensione |
| --- | ---: |
| Text encoder | 246.144.152 byte |
| UNet | 1.719.125.304 byte |
| VAE | 167.335.342 byte |
| Totale dei tre pesi | 2.132.604.798 byte |

Questi sono i pesi Safetensors sorgente destinati a Diffusers. La revisione indicata
è già stata convertita negli artefatti ONNX elencati all'inizio del documento. Gli
ONNX sono locali e collaudati, ma non sono ancora pubblicati nel repository remoto
dal quale dovrà scaricarli l'applicazione.

## Interfaccia minima

L’utente non sceglie il modello. Psichedel espone soltanto:

- `Rapido`: 512×512, pochi step;
- `Qualità`: stesso checkpoint, più step.

La V1 non aggiunge altri controlli. Seed, annullamento e avanzamento restano gestiti
dalla pipeline, non diventano nuove opzioni visive.

La risoluzione della modalità Qualità resta inizialmente 512×512. Verrà aumentata
solo dopo una misura reale di memoria e durata: cambiare insieme modello, step e
risoluzione renderebbe impossibile capire l’origine di eventuali blocchi.

## Prompt

Il testo ricevuto dall’adapter viene passato al tokenizer senza:

- censura;
- riscrittura;
- traduzione;
- aggiunta automatica di termini;
- negative prompt applicativi.

La costruzione narrativa del prompt resta responsabilità di CoscienzaOnirica e
Psichedel a monte dell’adapter. Il test dell’adapter deve dimostrare che la stringa
ricevuta arriva invariata al tokenizer.

## Architettura

```text
Psichedel
   |
   | prompt + seed + profilo
   v
adapter Explicit V1
   |
   +-- cache artefatti
   +-- tokenizer CLIP
   +-- text encoder ONNX
   +-- scheduler
   +-- UNet ONNX / WebGPU
   +-- VAE decoder ONNX / WebGPU
   v
raster
   |
   v
pipeline VTracer esistente
```

Implementazione del prototipo:

| Responsabilità | File |
| --- | --- |
| Manifesto e identità del checkpoint | `src/shared/brain/imageModelManifest.ts` |
| Runtime ONNX Runtime Web/WebGPU | `src/renderer/output/brain/sd15OnnxWebGpu.ts` |
| Scheduler Euler SD 1.5 | `src/renderer/output/brain/sd15Scheduler.ts` |
| Pagina di collaudo isolata | `psychedel-model-prototype.html` |

Il prompt viene passato integralmente al tokenizer. L'unica stringa aggiuntiva è
il prompt vuoto richiesto dal ramo matematico *unconditional* del
classifier-free guidance; non è un negative prompt e non contiene istruzioni
nascoste.

Il runtime finale usa `onnxruntime-web/webgpu`. La conversione una tantum è avvenuta
in un ambiente offline separato; l'applicazione, il prototipo e il runtime non
eseguono né distribuiscono Python, Diffusers, ComfyUI o servizi di inferenza remoti.

## Avvio del prototipo

Il prototipo richiede che gli ONNX convertiti siano presenti in:

```text
.model-artifacts/pornmaster-sd15-onnx/
├── text_encoder/model.onnx
└── unet/model.onnx
```

Il VAE viene scaricato dal repository browser-ready indicato nel manifesto e poi
salvato nella stessa Cache Storage degli altri componenti.

Avviare esclusivamente Vite, senza lanciare Electron:

```bash
PSYCHEDEL_PROTOTYPE=1 pnpm exec vite --host 127.0.0.1
```

Aprire:

```text
http://127.0.0.1:5173/psychedel-model-prototype.html
```

La pagina mostra sempre il checkpoint effettivamente caricato. Con
`?autorun=1` avvia automaticamente la generazione campione.

Gli stati visibili sono:

```text
DOWNLOAD
CARICAMENTO
GENERAZIONE
COMPLETATO
ANNULLATO
ERRORE
```

La prima esecuzione legge gli ONNX e li inserisce in
`psychedel-sd15-onnx-v1`. Le esecuzioni successive riutilizzano la cache; le
generazioni consecutive nella stessa pagina riutilizzano anche le sessioni WebGPU.

## Pubblicazione e attivazione

Gli artefatti da pubblicare sono identificati da dimensione e SHA-256 nel manifesto
`imageModelManifest.ts`. Il repository remoto deve conservare gli stessi percorsi:

```text
text_encoder/model.onnx
unet/model.onnx
```

La pubblicazione non deve cambiare silenziosamente checkpoint o revisione. Dopo il
caricamento remoto occorre:

1. sostituire `local-prototype/pornmaster-sd15-onnx` con l'ID reale del repository;
2. impostare URL versionati, preferibilmente fissati a una revisione;
3. svuotare soltanto la cache del prototipo;
4. eseguire un caricamento a freddo dalla rete;
5. ripetere almeno tre generazioni consecutive;
6. collegare il runtime a `PsychedelImageGenerator`;
7. mantenere il generatore precedente come fallback finché il collaudo integrato
   non è completo.

Non inserire token Hugging Face nel codice, nei manifest o nei log.

## Sequenza obbligatoria

1. ~~Convertire la revisione esatta del checkpoint in ONNX FP16.~~
2. ~~Eseguire un prototipo browser isolato.~~
3. ~~Verificare caricamento, cache, seed e almeno tre generazioni consecutive.~~
4. Pubblicare gli artefatti in un repository dedicato con manifest e checksum.
5. Ripetere il collaudo con download remoto a freddo e misurare il picco di memoria.
6. Integrare l’adapter in Psichedel soltanto dopo il superamento del collaudo remoto.
7. Produrre e validare l'accelerazione LCM prima di dichiarare pronta `Rapido`.
8. Conservare il generatore attuale fino al completamento dei punti precedenti.

La conversione, il collaudo WebGPU locale e le quattro generazioni consecutive sono
completati. La pubblicazione richiede un repository Hugging Face dedicato e
autenticato; l'ambiente di sviluppo non dispone attualmente di credenziali
Hugging Face.

Il mancato completamento della pubblicazione o della variante LCM sospende
l'attivazione nell'app e non modifica la pipeline attualmente funzionante.

## Stati

L’adapter espone soltanto questi stati:

```text
download
caricamento
generazione
completato
annullato
errore
```

`Rapido` e `Qualità` non sono modelli diversi e non richiedono un secondo download.
In memoria rimane una sola pipeline.

La modalità `Rapido` non è ancora dichiarata pronta. Non viene simulata riducendo
gli step del checkpoint normale: sarà attivata soltanto dopo il merge offline di
un adapter LCM SD 1.5 compatibile e la relativa validazione WebGPU.

## Collaudo minimo

La suite automatizzata corrente copre:

- validità e completezza del manifesto Quality;
- rifiuto di un falso profilo Turbo senza accelerazione;
- download e riuso della cache;
- prompt invariato;
- cancellazione prima dello step successivo;
- errore di download;
- WebGPU assente;
- memoria insufficiente;
- scheduler Euler, CFG e aggiornamento dei latenti;
- regressioni della pipeline Brain già esistente.

Il collaudo browser reale aggiunge:

- un’immagine riconoscibile per ogni prompt campione;
- nessun download completo al secondo avvio;
- nessun servizio di inferenza remoto.
- quattro generazioni consecutive nella stessa sessione;
- prompt Explicit preservato e immagine non oscurata.

Restano da collaudare dopo l'integrazione:

- interruzione durante un'inferenza WebGPU reale;
- rilascio e ricaricamento delle sessioni;
- picco di memoria GPU;
- convivenza con rendering audio, Canvas e VTracer;
- caricamento a freddo dal repository definitivo;
- profilo Turbo LCM.

Esito corrente:

```text
TypeScript: superato
Test automatici: 102/102 superati
Build Electron: superata
WebGPU Quality: 4 generazioni consecutive completate
Cache ONNX: verificata
Prompt esplicito adulto: elaborato senza filtro
Turbo LCM: non ancora disponibile
Pubblicazione artefatti: bloccata da repository/credenziali mancanti
```

## Quando valutare Illustrative o Illustrious

Si valuta un secondo modello soltanto se, dopo il collaudo, il checkpoint Explicit:

- non rappresenta figure e scene narrative con sufficiente chiarezza; oppure
- non raggiunge la qualità richiesta neppure con il profilo `Qualità`.

In quel caso si prova prima un solo checkpoint Illustrative SD 1.5 compatibile con
la stessa pipeline. Illustrious/SDXL diventa V2 esclusivamente se anche questa prova
fallisce.
