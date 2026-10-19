# Piano di Lavoro: Ciclo Di Revisione

> **ID Piano**: `PIANO-034`
> **Macrotask di Riferimento**: nessuno (nuova funzionalità)
> **Data Creazione**: 2026-08-19
> **Stato**: `COMPLETATO — REVISIONE CADENZA E MEMORIA DI SESSIONE`
> **Autore/Agente**: Agente AI / Capo Supremo

---

## 1. 🎯 Obiettivo del Piano

Ogni storia consuma budget GPU quasi esclusivamente per generare immagini
nuove (SD1.5/UNet); il morphing/i renderer Canvas2D lavorano sempre con
lo stesso budget residuo. Alla chiusura di ogni storia il Ciclo di Revisione
fissa tre immagini della storia appena conclusa. Dalla seconda chiusura
sospende del tutto la generazione e fa ritornare le terne già fissate per
tutte le storie precedenti, nel loro ordine cronologico originale. Morphing e
alternanza renderer restano intensificati; il budget GPU liberato dalla
generazione va tutto alla qualità visiva.

Fondato su `filosofia.md` §1 (Lowen/bioenergetica: il corpo alterna
carica/scarica, non cerca stimolazione nuova in modo continuo) e §2
(struttura onirica: "un elemento ritorna deformato" applicato fra storie
diverse, non solo dentro una storia a 4 immagini).

## 2. 📋 Decisioni Di Design

1. **Memoria stabile della sessione**: una terna per `storyId`, fissata una
   sola volta e mantenuta fino alla distruzione del controller Brain.
2. **Selezione con un segnale già presente**: qualità di generazione effettiva
   (`renderMode`), senza tag I/O, metadati semantici o nuovi classificatori.
3. **Trigger diretto**: la chiusura di una storia ordinaria è la sola autorità;
   non esistono più contatori o range di storie.
4. **Sospensione totale della generazione** durante il ciclo (non un
   allungamento del cooldown) — riprende da sola alla fine.
5. **Tre immagini esatte** per ogni storia; la qualità sceglie la terna, poi
   l'ordine dei fotogrammi ripristina la cronologia originale.
6. **Accumulo progressivo**: il ciclo della storia corrente usa soltanto le
   storie precedenti. L'archivio su disco rimane compatibile e continua a
   ricevere immagini, ma non governa più il ciclo della sessione.

## 3. 🛠️ Architettura Implementata

### Logica pura — `src/shared/brain/dreamRevisionCycle.ts`

- `deriveOneiricPhase(frameIndex, frameCount)` — soglia/metamorfosi/
  condensazione/eco dalla posizione nella storia.
- `deriveBioenergeticState(energy, previousEnergy)` — tensione/rilascio/
  quiete dalla direzione dell'energia rispetto al fotogramma precedente.
- `RevisionSessionMemory` conserva ordine e terne senza consentire una seconda
  associazione allo stesso `storyId`.
- `selectRevisionStoryImages` ordina per `renderMode`, prende tre candidati e
  restituisce la selezione nell'ordine dei frame.
- Restano disponibili per l'archivio storico `combineRevisionTag` e
  `pruneArchiveEntriesForTag` (eviction FIFO per tag, cap
  `REVISION_CYCLE_ARCHIVE_CAP_PER_TAG = 24`), `selectRevisionPool`
  (fallback tag esatto → sola fase → qualunque immagine → null),
  `pickRevisionEntries` (Fisher-Yates, varietà nella sequenza).

### Persistenza — `src/main/dreamImageArchive.ts` + `dreamImageArchiveStorage.ts`

- Classe `DreamImageArchive` (testabile con directory iniettabile, stesso
  pattern di `ConsciousnessArchive`): `save`, `queryEntries`,
  `loadImages`. Indice `index.json` + file `.webp` per immagine.
- `dreamImageArchiveStorage.ts` risolve la directory reale
  (`app.getPath('documents')/dream-images` in produzione,
  `app.getAppPath()/dream-images` in sviluppo) ed espone un singleton,
  stesso schema di `consciousnessStorage.ts`.

### IPC — `shared/types.ts`, `main/ipc.ts`, `preload/preload.ts`

Tre nuovi canali (`saveDreamImage`, `queryDreamImageEntries`,
`loadDreamImages`) sull'`OutputApi`, seguendo esattamente il pattern
già usato per `saveConsciousnessMemory`/`updateConsciousnessState`.

### Leve di intensità — `brainRenderingConfig.ts`, `brainRendererSelector.ts`

- `setBrainRevisionBoost(active)`: amplifica temporaneamente (×1.35)
  `globalRhythmicMotion.intensity`/`transformation.intensity` già
  esistenti, ripristino esatto al termine — nessun nuovo sistema di
  morph amount.
- `selectBrainRendererHoldFrames(id, random, boosted)`: con `boosted`
  restringe l'invariante di permanenza renderer da [2,3] a [1,2]
  fotogrammi — alternanza più rapida. `BrainRendererSelector` accetta un
  5° parametro opzionale `getBoostHint` (stesso pattern di
  `getPressureHint`, aggiunto la sessione scorsa).

### Integrazione — `brainController.ts`

- `requestRevisionCycleAtBoundary` fissa la terna della storia corrente e
  legge dalla memoria soltanto le terne inserite prima di quel `storyId`.
- `beginRevisionCycle` costruisce dalla sequenza cronologica una
  `BrainProduction` sintetica (stessa forma di una storia vera —
  **nessuna nuova pipeline di rendering**, riusa `startProduction`/
  `applyFrame`/tutta la macchina esistente), attiva il boost, calcola
  `revisionCycleActiveUntil` (durata = fotogrammi × `frameDurationMs`).
- Uscita dal ciclo: controllata dentro `advanceTimeline`, al primo
  checkpoint utile — se il tempo è scaduto, disattiva il boost e riprende la
  produzione reale che era già pronta
  e accantonata (`pendingProductionAfterRevisionCycle`) — transizione
  pulita, mai un taglio secco.
- `generateNext()` esce subito se `revisionCycleActive` — sospensione
  totale, riparte da sola quando il ciclo finisce.
- `showRawRaster` archivia ogni fotogramma a qualità piena
  (`mode !== 'interlude'`) in modo asincrono e non bloccante.

## 4. ✅ Verifica Delle Regole `agents.md`

- [x] Nessuna trasformazione di camera/quadro intero — il boost agisce
  solo su leve di morphing già esistenti e sull'alternanza renderer.
- [x] Nessun nuovo "linguaggio visivo" — riusa gli stessi renderer e lo
  stesso motore di transizione di una storia normale.
- [x] `lowPowerMode` non toccato/non bypassato.
- [x] Nessun DevTools automatico, nessuna modifica a permessi media.

## 5. 🧪 Validazione Eseguita

- `pnpm test -- --run` — **72 file / 680 test verdi**. Le regressioni della
  revisione verificano selezione esatta, associazione unica per `storyId`,
  accumulo delle sole storie precedenti e ordine cronologico.
- `pnpm typecheck`, `pnpm lint` — puliti.
- `pnpm build` — typecheck, renderer, main, preload, app macOS arm64, ZIP e
  DMG costruiti senza errori.
- Ricerca statica: nessun riferimento ai vecchi simboli di cadenza in `src/`.
- Verifica manuale dal vivo (lasciare l'app generare per più storie,
  osservare l'innesco del ciclo, la sospensione della generazione,
  l'intensificazione percepita, il ritorno pulito) — **da fare alla
  prossima sessione con hardware audio disponibile**, non bloccante per
  il commit.

## 6. 📝 Note

### Revisione approvata — 2026-09-10

- [x] Alla chiusura di ogni storia ordinaria selezionare una sola volta le tre
  immagini migliori usando la qualità effettiva già disponibile; a parità,
  conservare l'ordine del fotogramma.
- [x] Conservare per tutta la sessione l'associazione stabile
  `storyId → 3 immagini`, senza rivalutare storie già concluse.
- [x] Dalla seconda storia, costruire ogni Riattivazione con le terne di tutte
  le storie precedenti, nell'ordine cronologico originale.
- [x] Rimuovere il contatore e ogni attivazione dopo N storie.
- [x] Mantenere invariati renderer, durata, intensità, numero di giri e parti
  esplicitamente fuori perimetro.
- [x] Validare selezione unica, persistenza, accumulo, ordine, suite completa,
  typecheck, lint e build.

- **2026-08-19**: Piano progettato (con revisioni del Capo Supremo su
  trigger a storie casuali 2-4, tag combinato, sospensione totale,
  filtro qualità in scrittura) e implementato per intero nella stessa
  sessione. Collisione di nome evitata: `'revision'` resta un
  `ConsciousnessMemoryKind` distinto in `.coscienza/`, il Ciclo di
  Revisione vive in un archivio (`dream-images/`) e in identificatori di
  codice separati (`revisionCycle*`, `DreamImageArchive*`).
- **2026-09-10**: cadenza portata per disposizione da 2–4 a 1–2 storie;
  approvati fallback dai raster in memoria e log+riarmo del contatore quando
  nessun materiale è disponibile. Nessun altro comportamento del ciclo cambia.
- **2026-09-10, correzione successiva**: eliminata anche la variabilità 1–2.
  La Riattivazione viene programmata dopo ogni singola storia (1–1), massima
  frequenza compatibile con il confine di storia esistente.
- **2026-09-10, disposizione finale**: rimosso anche il contatore 1–1. La
  chiusura di storia fissa la terna e attiva direttamente la memoria delle
  storie precedenti; selezione e cronologia restano stabili per la sessione.
- La durata del ciclo è basata sul tempo (`revisionCycleActiveUntil`),
  non su un conteggio preciso di fotogrammi mostrati — stessa
  approssimazione già accettata da `alternateBrainWithMorphing`, scelta
  per evitare di dover intercettare con precisione il punto esatto di
  fine-storia sintetica dentro `advanceTimeline`.
