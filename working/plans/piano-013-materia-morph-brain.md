# Piano di Lavoro: Materia Morph — Renderer Brain Materico

> **ID Piano**: `PIANO-013`  
> **Macrotask di Riferimento**: `MACRO-011`  
> **Data Creazione**: 2026-08-15  
> **Stato**: `IN_PROGRESS — V1 IMPLEMENTATA, VALIDAZIONE LIVE PENDING`  
> **Autore/Agente**: Codex

---

## 1. Obiettivo del Piano

Progettare e, soltanto dopo approvazione, implementare `Materia Morph`, un
quarto renderer plugin di Brain che trasforma progressivamente le immagini
raster di Coscienza Onirica attraverso pigmento, erosione, membrane,
sedimentazione e fusione locale. Il soggetto, le masse, il punto focale, la
palette e il rapporto chiaro/scuro devono restare leggibili. La camera e il
quadro rimangono stabili; in silenzio il renderer è completamente fermo.

La V1 deve essere significativa ma compatibile con l'uso live prolungato e con
la contesa WebGPU della pipeline di generazione immagini.

---

## 2. Analisi dell'architettura esistente

### 2.1 Componenti riutilizzabili

- `brainRendererPlugin.ts`: contratto plugin già sufficiente per ricevere
  raster, palette, metadati di frame e sorgenti `current/previous/next`.
- `brainRendererRegistry.ts`: punto unico di registrazione del nuovo plugin.
- `brainRendererHost.ts`: readiness, timeout, fallback, crossfade fra plugin,
  cleanup, propagazione di ritmo/flash/pressione risorse e passthrough durante
  il denoising.
- `brainRendererSelector.ts`: manuale, rotazione e mazzo “Tutti per storia”.
  L'aggiunta al registry include automaticamente il plugin nelle rotazioni.
- `brainController.ts`: fornisce il Blob raster sincronizzato e costruisce le
  sorgenti corrente, precedente e successiva. Orchestra transizioni di frame
  quantizzate al beat attraverso `setTransition()`.
- `brainRhythm.ts`: fornisce `beatPulse`, `beatPhase`, transienti distinti e
  `kickEnvelope`; il beat viene catturato prima del frame pacing.
- `brainPerformanceMetrics.ts`: misura preparazione artwork, frame Canvas e
  pressione durante inferenza.
- `brainPsycho2dAnalysis.ts`: riutilizzabili le primitive di luminanza,
  gradiente, palette e focal region; la griglia 4×3 non è però sufficiente per
  rappresentare masse e membrane.
- `brainPrint2dCanvas.ts` e `brainPsycho2dWindowCanvas.ts`: esempi validi per
  decoding asincrono del Blob, buffer precomputati, pacing, immobilità in
  silenzio, rilascio delle bitmap e riduzione low power.

### 2.2 Flusso immagini

Ogni frame della storia possiede una `PsychedelScene`; quando il raster è
disponibile, `applyFrame()` crea un Renderer Host. Il contesto del plugin
contiene:

- immagine e scena correnti;
- palette narrativa;
- indice/numero/energia del frame;
- accesso lazy a `current`, `previous` e `next`, ciascuna con Blob, scena e
  suggerimenti narrativi.

Il renderer può quindi preparare la materia corrente e, senza nuovi IPC o
nuove inferenze, preparare anche la destinazione. I Blob restano la fonte
canonica; non serve un database o un modello vision.

### 2.3 Preset e segnali audio

`update()` riceve `BandEnergies`, `AppSettings`, tempo, `BrainRhythmState`,
medie mobili e flash. I preset `dub`, `techno`, `ambient` arrivano tramite
`settings.motionProfile`; `lowPowerMode` e `sensitivity` sono già disponibili.

La V1 deve consumare i segnali proiettati dal clock Brain, senza modificare
l'analizzatore globale e senza inventare oscillatori autonomi.

### 2.4 Transizioni esistenti

Il controller applica in parallelo `enter` al frame nuovo ed `exit` al vecchio,
passando una progressione 0–1 congelata e quantizzata a beat. Il Renderer Host
gestisce inoltre il cambio di plugin con readiness, timeout e crossfade.

Per `Materia Morph`, `setTransition()` non sarà una semplice opacità: guiderà
la sostituzione locale tramite maschere e campi di corrispondenza. L'opacità
esterna esistente rimane una rete di sicurezza e garantisce continuità anche se
la preparazione della destinazione fallisce.

### 2.5 Low power e pressione risorse

Il Renderer Host dirada già gli update del plugin durante il denoising e può
mostrare il passthrough ultra-leggero. Il nuovo renderer deve aggiungere un
budget interno indipendente:

| Budget | Normale | `lowPowerMode` / pressione |
|---|---:|---:|
| Buffer analisi | 320×180 | 240×135 |
| Strati materici | 4 | 2 |
| Regioni attive simultanee | max 12 | max 6 |
| Grana procedurale | 2 mappe | 1 mappa |
| Frame target | 24 FPS | 15–18 FPS |
| Passi maschera per frame | max 3 | max 1 |

I numeri sono limiti V1 da confermare con metriche, non obiettivi da superare.

---

## 3. Soluzione tecnica proposta

### 3.1 Scelta del motore

Usare **Canvas 2D con buffer raster precomputati**, non WebGL/WebGPU nella V1.

Motivazioni:

- l'inferenza ONNX usa già WebGPU ed è il principale collo di bottiglia live;
- Canvas 2D è il percorso già misurato e degradabile dell'Output Window;
- `drawImage`, compositing e maschere a bassa risoluzione bastano per un morph
  materico leggibile;
- nessun nuovo processo, IPC, dipendenza o permesso;
- cleanup e fallback restano conformi agli altri plugin.

La GPU shader resta un'estensione successiva solo dopo profiling separato e
senza concorrenza con il denoising.

### 3.2 Rappresentazione dell'immagine

Nuovo modulo proposto `brainMaterialAnalysis.ts`, puro e testabile. Da ogni
raster produce `MaterialField`:

- luminanza e crominanza a bassa risoluzione;
- gradiente Sobel e orientamento dei bordi;
- palette dominante derivata dai pixel, con palette narrativa come prior/fallback;
- mappa di densità costruita da contrasto locale, saturazione e massa scura;
- segmentazione quantizzata in 6–10 classi cromatico-luminose;
- componenti connesse filtrate per area, fino a 12 `MaterialRegion`;
- bounding box, centroide, area, colore medio, luminanza, densità, edge strength;
- maschera sfumata della silhouette e mappa della distanza dal bordo;
- focal region protetta, ricavata da salienza dei bordi e bias centrale leggero;
- seed deterministico dall'identità del frame.

Non serve segmentazione semantica: il soggetto resta leggibile preservando
silhouette, masse dominanti, focal region e distribuzione tonale.

### 3.3 Stato materico

Nuovo tipo `MaterialState`, persistente per la vita del controller:

- riferimenti ai campi `from` e `to`;
- progressi locali per regione, non un unico offset globale;
- quantità accumulate di pressione, fusione, erosione, dettaglio e grana;
- latch del beat e inviluppi con attacco/decadimento;
- mappe statiche di rumore/grana generate una sola volta dal seed;
- ultimo frame disegnato e firma visuale per evitare redraw in silenzio.

Una cache `WeakMap` separata per risoluzione, indicizzata dal Blob, conserva la
Promise del `MaterialField`: controller entrante e uscente possono così
condividere l'analisi dello stesso raster senza introdurre ownership globale o
impedire il garbage collection. La preparazione parte al primo `update()`,
quando `lowPowerMode` è noto, e `isReady()` resta falso fino al completamento.

Ogni stato deriva dal precedente tramite integrazione clampata dei segnali
audio. Nessuna funzione dipende dal solo tempo: `beatPhase` orienta una
deformazione soltanto quando esiste energia o un inviluppo ancora attivo.

### 3.4 Pipeline di disegno V1

1. Disegnare il raster corrente stabile come memoria percettiva, con opacità
   non inferiore al 35–45% durante il morph.
2. Costruire 2–4 strati precomputati dalla stessa immagine: pigmento dominante,
   densità/ombra, bordi e grana.
3. Per ogni regione selezionata, applicare una maschera locale espansa o erosa
   tramite copie sfalsate della maschera e compositing `destination-in/out`.
4. Comporre gli strati con `source-over`, `multiply`, `screen` e `overlay`
   limitati; nessun filtro costoso nel RAF.
5. Durante una transizione, far emergere lo strato di destinazione con una
   soglia locale derivata da densità, bordo e progresso. Il raster nuovo
   sostituisce quello vecchio regione per regione.
6. Applicare grana e micro-bordi solo nelle zone già attive; la camera e il
   canvas non ricevono transform globali.

Il risultato è una stessa composizione che cambia stato materiale, non un
pattern sovrapposto.

### 3.5 Corrispondenza tra due immagini

La V1 usa un matching economico fra regioni `from` e `to`. Il costo combina:

- distanza normalizzata dei centroidi;
- differenza di area;
- distanza cromatica;
- differenza di luminanza;
- compatibilità dell'orientamento del bordo;
- bonus per la focal region.

Un matching greedy stabile, ordinato per area/salienza, è sufficiente con
massimo 12 regioni. Regioni senza partner si dissolvono o sedimentano; regioni
nuove emergono dalla massa o dal bordo compatibile più vicino. Le coordinate
restano nel medesimo quadro normalizzato: nessun salto di posizione e nessun
movimento di camera.

### 3.6 Mapping audio-visivo

| Segnale | Stato interno | Effetto locale V1 |
|---|---|---|
| `low` | pressione con attack/release lento | ispessimento maschere, compressione/espansione interna, profondità cromatica delle masse grandi |
| `lowMid` | flusso intermedio | fusione fra regioni adiacenti, bordo membrana, migrazione pigmento |
| `mid` | complessità | segmentazione locale, densità, articolazione dei bordi |
| `high` | superficie | grana fine, porosità, micro-accenti limitati ai bordi |
| `beatPulse` / `kickEnvelope` | impulso latched | breve aumento locale di contrasto, spessore e apertura; decadimento morbido |
| `beatPhase` | direzione normalizzata | orientamento di micro-disallineamenti interni, solo finché un inviluppo audio è attivo |

Profili:

- `dub`: inerzia alta, pressione morbida, fusione e release lunga;
- `techno`: attacco beat più leggibile, contrasto e segmentazione maggiori ma
  clampati;
- `ambient`: smoothing massimo, erosion/fusion lente, high attenuato.

`sensitivity` scala gli inviluppi prima dei clamp; `softMode` attenua contrasto
e bordi ma non cambia l'identità del renderer.

### 3.7 Silenzio

Con bande, transienti, `beatPulse`, `kickEnvelope` e flash a zero:

- gli accumulatori decadono fino a zero;
- nessuna fase viene avanzata autonomamente;
- il renderer disegna al massimo un ultimo frame di assestamento;
- poi la firma resta invariata e il Canvas non viene ridisegnato;
- immagine, palette e strati rimangono visibili e perfettamente stabili.

La progressione di una transizione esplicitamente richiesta dal controller può
continuare, perché rappresenta un cambio reale di immagine e non finta
reattività musicale.

### 3.8 Transizione fra immagini

Ogni controller può ottenere `previous`, `current` e `next`. La coppia precisa
dipende dal ruolo assegnato dall'orchestratore:

- `enter`: il controller nuovo trasforma `previous → current`, facendo emergere
  la propria immagine secondo soglie di densità e region matching;
- `exit`: il controller uscente trasforma `current → next`, assottigliando la
  materia corrente verso la stessa destinazione;
- il punto focale resta protetto fino al 55–65% della transizione;
- palette e luminanza interpolano per regione, non con un cambio globale;
- al termine il raster nuovo è pienamente leggibile.

I due controller ricevono la medesima progressione beat-matched e la cache per
Blob evita analisi duplicate. Se una sorgente di controparte non è pronta, il
plugin usa la propria immagine corrente e lascia al crossfade del controller la
continuità. Nessun frame resta nero.

---

## 4. Verifica obbligatoria della filosofia visiva

- [x] **Check Camera**: nessuna scala, rotazione, zoom, drift o pulsazione del
  quadro/camera; solo maschere e disallineamenti interni a regioni limitate.
- [x] **Check Materia**: la reattività attraversa raster, pigmento, densità,
  bordi, membrane e grana; il raster resta riconoscibile e non vaga.
- [x] **Check Silenzio**: nessun movimento autonomo; redraw sospeso a stato
  stabile.
- [x] **Check Beatmatch**: beat catturato dal clock esistente; impulso, fase e
  bande hanno ruoli distinti.
- [x] **Check Transizione**: sostituzione locale continua, con fallback al
  crossfade esistente; nessun taglio.
- [x] **Check Alternanza**: il plugin entra nel registry e usa la regia già
  esistente, senza cambiare il contratto 80/20.
- [x] **Check Costo**: buffer riusati, limiti espliciti, frame pacing e
  degradazione low power; nessun effetto autonomo durante il denoising.
- [x] `backgroundThrottling`, permessi audio, preload, Main ed Electron
  packaging non vengono modificati dalla V1.

---

## 5. Colli di bottiglia e mitigazioni

| Rischio | Mitigazione V1 |
|---|---|
| `getImageData` e segmentazione bloccano il primo frame | esecuzione una sola volta a 320×180, readiness falsa fino al completamento, metriche di preparation |
| Troppe canvas intermedie / memoria | pool massimo di 6 buffer, resize a 1×1 in `destroy()` |
| Compositing per regione troppo costoso | massimo 12 regioni e 3 passi maschera; 6/1 in low power |
| Analisi duplicate nei controller enter/exit | cache debole per Blob e risoluzione; nessuna nuova analisi finché il Blob è riusabile |
| Preparazione di una controparte durante UNet | preparazione solo da Blob già disponibile; sospensione/diradamento sotto resource pressure |
| Filtri Canvas variabili tra GPU | niente blur/filter nel RAF; maschere precomputate |
| Beat perso dal frame pacing | latch `beatIndex`/`beatPulse` prima del gate FPS |
| Soggetto troppo astratto | raster base sempre presente, focal protection, limite di copertura trasformata |
| Transizione incompleta o asset fallito | `isReady`/`hasFailed`, timeout host e fallback Print2D/crossfade |

---

## 6. Fasi di implementazione e checklist

### Fase 1 — Analisi e contratto

- [x] `TASK-011-01`: analizzare immagini, plugin, preset, segnali, transizioni,
  low power e metriche esistenti.
- [x] `TASK-011-02`: definire rappresentazione, morph, mapping audio, silenzio,
  costi e separazione V1/estensioni.
- [x] `TASK-011-03`: approvare nome, architettura Canvas 2D e budget V1.

### Fase 2 — Analisi raster pura

- [x] `TASK-011-04`: implementare `brainMaterialAnalysis.ts` con campi,
  palette, bordi, regioni, focal protection e matching.
- [x] `TASK-011-05`: aggiungere test deterministici per segmentazione, matching,
  fallback e limiti di regione.

### Fase 3 — Renderer V1

- [x] `TASK-011-06`: implementare `brainMaterialMorphCanvas.ts` con buffer
  riusabili, readiness, pacing, firme statiche e cleanup.
- [x] `TASK-011-07`: implementare mapping audio/profili e verificare contributo
  nullo in silenzio.
- [x] `TASK-011-08`: implementare morph locale `previous → current` / `current
  → next` tramite region matching, maschere e sostituzione materica.
- [x] `TASK-011-09`: integrare plugin, tipi, normalizzazione settings e UI come
  `material-morph` / “Materia Morph — sedimentale”.
- [x] `TASK-011-10`: integrare low power, resource pressure e telemetria.

### Fase 4 — Verifica

- [x] `TASK-011-11`: eseguire test mirati e suite completa.
- [x] `TASK-011-12`: eseguire `pnpm typecheck` e lint mirato; verificare il
  noto `prefer-const` globale separatamente.
- [x] `TASK-011-13`: eseguire `pnpm build`, perché il renderer entra negli
  artefatti Electron distribuiti.
- [ ] `TASK-011-14`: prova manuale Output fullscreen: riconoscibilità, silenzio,
  mapping delle sei sorgenti ritmiche, transizione, rotazione, story-cycle,
  80/20 e `Panic / Off`.
- [ ] `TASK-011-15`: prova prolungata normale/low power durante denoising;
  confrontare preparation time, Canvas p95/max, RAF gap, memoria e temperatura.

---

## 7. Validation Plan

### Automatico

```bash
pnpm test
pnpm typecheck
pnpm exec eslint src/renderer/output/brain/brainMaterialAnalysis.ts src/renderer/output/brain/brainMaterialMorphCanvas.ts src/renderer/output/brain/brainRendererRegistry.ts src/shared/types.ts src/renderer/control/components/VisualControls.tsx
pnpm build
git diff --check
```

### Criteri di accettazione live V1

- immagine sorgente riconoscibile in ogni punto della trasformazione;
- nessuna trasformazione globale del quadro;
- immobilità completa dopo l'assestamento in silenzio;
- ruoli distinguibili per `low`, `lowMid`, `mid`, `high`, `beatPulse` e
  `beatPhase`;
- cambio immagine continuo e senza nero/salto;
- fallback operativo se analisi o decoding falliscono;
- in normal mode Canvas p95 entro il budget di un frame a 24 FPS; in low power
  entro il budget di un frame a 15 FPS;
- nessuna crescita continua di bitmap/canvas dopo almeno due storie complete.

---

## 8. Estensioni successive, escluse dalla V1

- optical flow o distance-field più sofisticati fra immagini;
- segmentazione semantica/vision model;
- shader WebGL/WebGPU o compute textures;
- cache condivisa dell'analisi fra plugin;
- tassonomia automatica dei materiali (minerale, membrana, tessuto, liquido);
- editor di parametri dedicato oltre ai preset Brain esistenti;
- feedback visivo dalla memoria autobiografica di Coscienza Onirica.

Queste estensioni richiedono profiling o nuovi contratti e non devono entrare
nel primo renderer.

---

## 9. Registro avanzamento

- **2026-08-15**: audit architetturale completato; scelta Canvas 2D proposta;
  definiti dati, morph, mapping audio, silenzio, transizione, budget e rischi.
  Nessun codice runtime implementato, in osservanza della richiesta di
  produrre prima l'analisi funzionale e tecnica.
- **2026-08-15**: architettura approvata dallo sviluppatore; avviata la V1 con
  integrazione obbligatoria in manuale, rotazione e “Tutti per storia”, più
  propagazione di resource pressure/background, low power e flash.
- **2026-08-15**: V1 implementata come quarto plugin `material-morph`.
  Validazione automatica: 40 file / 247 test, typecheck e lint mirato verdi,
  build Vite/Electron/macOS riuscita. Lint globale bloccato esclusivamente dal
  `prefer-const` preesistente in `slitScanCanvas.ts:639`. Restano prova
  artistica fullscreen e test prolungato normale/low power.
