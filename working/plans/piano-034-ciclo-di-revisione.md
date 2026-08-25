# Piano di Lavoro: Ciclo Di Revisione

> **ID Piano**: `PIANO-034`
> **Macrotask di Riferimento**: nessuno (nuova funzionalità)
> **Data Creazione**: 2026-08-19
> **Stato**: `COMPLETATO`
> **Autore/Agente**: Agente AI / Capo Supremo

---

## 1. 🎯 Obiettivo del Piano

Ogni storia consuma budget GPU quasi esclusivamente per generare immagini
nuove (SD1.5/UNet); il morphing/i renderer Canvas2D lavorano sempre con
lo stesso budget residuo. Il Ciclo di Revisione, ogni 2-4 storie (numero
casuale, sempre deciso a confine di storia), sospende del tutto la
generazione e fa ritornare fino a 10 immagini **già generate ad alta
qualità**, recuperate da un archivio su disco per tag (fase onirica +
stato bioenergetico), con morphing e alternanza renderer intensificati —
il budget GPU liberato dalla generazione va tutto alla qualità visiva.

Fondato su `filosofia.md` §1 (Lowen/bioenergetica: il corpo alterna
carica/scarica, non cerca stimolazione nuova in modo continuo) e §2
(struttura onirica: "un elemento ritorna deformato" applicato fra storie
diverse, non solo dentro una storia a 4 immagini).

## 2. 📋 Decisioni Di Design

1. **Pool persistente su disco** (`dream-images/`, gitignored — asset
   tecnico, non memoria autobiografica di Coscienza Onirica).
2. **Tag = fase onirica + stato bioenergetico combinati** (es.
   `condensazione+tensione`), entrambi derivati a costo zero da dati già
   esistenti su `DreamFrame` (`frameIndex`/`energy`) — nessun nuovo
   output richiesto a Qwen.
3. **Trigger a numero di storie**, non a minuti: ogni 2-4 storie
   (`pickStoriesUntilNextRevisionCycle`), sempre e solo al confine di
   fine storia.
4. **Sospensione totale della generazione** durante il ciclo (non un
   allungamento del cooldown) — riprende da sola alla fine.
5. **Solo immagini a qualità piena** (`mode !== 'interlude'`) entrano
   nell'archivio — filtro alla scrittura, non solo al recupero.
6. **Skip silenzioso** se l'archivio è vuoto o il tag non ha immagini —
   nessun errore, la storia successiva parte normalmente.

## 3. 🛠️ Architettura Implementata

### Logica pura — `src/shared/brain/dreamRevisionCycle.ts`

- `deriveOneiricPhase(frameIndex, frameCount)` — soglia/metamorfosi/
  condensazione/eco dalla posizione nella storia.
- `deriveBioenergeticState(energy, previousEnergy)` — tensione/rilascio/
  quiete dalla direzione dell'energia rispetto al fotogramma precedente.
- `combineRevisionTag`, `pickStoriesUntilNextRevisionCycle`,
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

- Contatore `storiesUntilNextRevisionCycle`, decrementato in
  `advanceToNextProduction` (il punto in cui una storia pronta
  sostituirebbe normalmente quella corrente); a 0 chiama
  `beginRevisionCycle` invece di `startProduction` diretto.
- `beginRevisionCycle`: sceglie il tag dalla fase/stato del fotogramma
  corrente, interroga l'archivio (cache locale aggiornata ad ogni
  salvataggio e all'avvio), carica fino a 10 immagini, costruisce una
  `BrainProduction` sintetica (stessa forma di una storia vera —
  **nessuna nuova pipeline di rendering**, riusa `startProduction`/
  `applyFrame`/tutta la macchina esistente), attiva il boost, calcola
  `revisionCycleActiveUntil` (durata = fotogrammi × `frameDurationMs`).
- Uscita dal ciclo: controllata dentro `advanceTimeline`, al primo
  checkpoint utile — se il tempo è scaduto, disattiva il boost, ripristina
  il contatore casuale, e riprende la produzione reale che era già pronta
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

- `pnpm vitest run` — **56 file / 377 test verdi** (nuovi: 17 test in
  `dreamRevisionCycle.test.ts`, 6 in `dreamImageArchive.test.ts`, 3 in
  `brainRendererSelector.test.ts` per il boost).
- `pnpm typecheck`, `pnpm lint` — puliti.
- `env -u NODE_OPTIONS pnpm exec vite build` — output, control, main
  process e preload tutti costruiti senza errori.
- Verifica manuale dal vivo (lasciare l'app generare per più storie,
  osservare l'innesco del ciclo, la sospensione della generazione,
  l'intensificazione percepita, il ritorno pulito) — **da fare alla
  prossima sessione con hardware audio disponibile**, non bloccante per
  il commit.

## 6. 📝 Note

- **2026-08-19**: Piano progettato (con revisioni del Capo Supremo su
  trigger a storie casuali 2-4, tag combinato, sospensione totale,
  filtro qualità in scrittura) e implementato per intero nella stessa
  sessione. Collisione di nome evitata: `'revision'` resta un
  `ConsciousnessMemoryKind` distinto in `.coscienza/`, il Ciclo di
  Revisione vive in un archivio (`dream-images/`) e in identificatori di
  codice separati (`revisionCycle*`, `DreamImageArchive*`).
- La durata del ciclo è basata sul tempo (`revisionCycleActiveUntil`),
  non su un conteggio preciso di fotogrammi mostrati — stessa
  approssimazione già accettata da `alternateBrainWithMorphing`, scelta
  per evitare di dover intercettare con precisione il punto esatto di
  fine-storia sintetica dentro `advanceTimeline`.
