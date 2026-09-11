# Piano di Lavoro: Regime Audio Sperimentale (Ballabilità/Entrainment/Costrizione Motoria)

> **ID Piano**: `PIANO-044`
> **Macrotask di Riferimento**: `MACRO-035`
> **Data Creazione**: 2026-09-11
> **Stato**: `IN_PROGRESS`
> **Autore/Agente**: Agente AI / Capo Supremo

---

## 1. 🎯 Obiettivo del Piano

Sviluppare un secondo regime Audio, selezionabile esplicitamente e confrontabile
A/B con quello attuale, che interpreti il segnale a partire da ballabilità,
entrainment e costrizione motoria invece che da una misura aggregata di
pressione derivata direttamente dalle proprietà acustiche. Riferimento
normativo: comunicazione del Capo Supremo Jr dell'Analisi Audio (2026-09-11) e
disposizione del Vice Consigliere allegata. Il regime attuale (`rhythmConstraint`
+ `perceptualPressure`) resta la baseline, congelata e disponibile per tutta
la sperimentazione.

## 2. 📋 Prerequisiti e Contesto

- **File / Moduli Coinvolti**:
  - `src/shared/types.ts`, `src/shared/defaults.ts`, `src/main/settings.ts`
  - `src/renderer/output/brain/brainBioPerception.ts` (baseline, NON modificato)
  - `src/renderer/output/brain/brainBioPerceptionExperimental.ts` (nuovo)
  - `src/renderer/output/OutputApp.tsx`
  - `src/renderer/control/components/VisualControls.tsx`
  - `scripts/calibration/compare-audio-regimes.mjs` (nuovo)
  - `docs/campioni/*.mp3` (corpus esistente, riusato così com'è — vedi §6)
- **Dipendenze Operative**: nessuna integrazione Visual in questa fase
  (renderer selection, colori, morphing, Riattivazione, Coscienza Onirica
  restano fuori, per disposizione esplicita del Vice Consigliere §14).
- **Audit preventivo `working/DEPRECATED.md`**: `DEP-001` (Alternate with
  Brain 80/20) — `NON COINVOLTO`. Non tocca pressione, trend, atterraggio o
  livello, né la selezione del regime Audio.

## 3. ⚠️ Regole e Vincoli di Sviluppo

- [x] Baseline (`brainBioPerception.ts`) non modificata: il nuovo regime vive
  in un modulo separato.
- [x] Nessuna nuova entità software prematura (`organizationScore`,
  `entrainmentScore`, ecc.) prima di una necessità dimostrata.
- [x] Stesso vocabolario di stati (`pressurized`/`decompression`/
  `respiro-alto`/`respiro-profondo`/`unresolved`), nessun nuovo stato.
- [x] Nessuna modifica a renderer, colori, morphing, Riattivazione, Coscienza
  Onirica in questa fase.

## 4. 🛠️ Fasi di Implementazione e Checklist Task

### Fase 1 — Impianto a due percorsi (CHECKPOINT 1, questa consegna)
- [x] Task 1.1: `AppSettings.audioMode: 'baseline' | 'experimental'`,
  default `'baseline'`, normalizzazione in `src/main/settings.ts`.
- [x] Task 1.2: `BrainBioPerceptionExperimentalClock` — stesso contratto di
  `BrainBioPerceptionClock` (`ingestSample`/`getState`/`getRegimeDiagnostics`),
  per ora delega integralmente alla baseline (scaffold, nessuna nuova
  semantica): `audioMode=experimental` produce oggi lo stesso output di
  `audioMode=baseline`. Prova che l'impianto a due percorsi non altera nulla
  prima di introdurre la nuova semantica.
- [x] Task 1.3: `OutputApp.tsx` istanzia i due clock in parallelo sullo
  stesso ingest (`rhythmClock`/`bandEnergies` condivisi), sceglie quale stato
  esporre a `bioPerceptionSource`/`bioRegimeReasonSource` in base a
  `settings.audioMode`, logga il cambio modalità.
- [x] Task 1.4: selettore `audioMode` in `VisualControls.tsx` (sezione
  debug/collaudo Brain).
- [x] Task 1.5: harness offline `scripts/calibration/compare-audio-regimes.mjs`
  — esegue baseline ed experimental sullo stesso decode per ogni file di
  `docs/campioni/`, stampa districanza raggruppata per nome file (nessuna
  mappa C01–C09: non serve, il nome file è già l'etichetta percettiva).
- [x] Task 1.6: test di parità del contratto per il clock sperimentale.

### Fase 2 — Osservabilità del fenomeno (prossimo checkpoint, non in questa consegna)
- [ ] Task 2.1: conferma metrica fisica (allineamento beat previsto ↔
  transiente reale).
- [ ] Task 2.2: persistenza inter-ciclo dell'ancoraggio motorio.
- [ ] Task 2.3: perdita/recupero dell'ancoraggio.
- [ ] Task 2.4: assestamento reale (varianza sostenuta, non media a zero) —
  criterio discriminante su `test-1.mp3`.

### Fase 3 — Costrizione motoria, direzione, classificazione (dopo Fase 2)
- [ ] Task 3.1: costrizione motoria come grandezza percettiva.
- [ ] Task 3.2: direzione (crescita/cessione della presa).
- [ ] Task 3.3: classificazione degli stati nel vocabolario esistente.
- [ ] Task 3.4: confronto completo con la baseline sul corpus.

## 5. 🧪 Strategia di Verifica e Validation Plan

- **Comandi di Test**: `pnpm typecheck`, `pnpm lint`, `pnpm test`.
- **Verifica offline**: `node scripts/calibration/compare-audio-regimes.mjs`
  su tutto `docs/campioni/`; in Fase 1 baseline ed experimental devono
  risultare identici (stesso `durationSeconds`/`transitions`) — è la prova
  che l'impianto non introduce derive prima che la nuova semantica esista.
- **Verifica manuale**: cambio `audioMode` da Control mentre gira l'Output,
  verificare il log `[Brain][perception] audioMode = ...` e che l'etichetta
  di regime non cambi (Fase 1: i due regimi coincidono).

## 6. 📝 Note e Registro Avanzamento

- **2026-09-11**: Creazione del piano. Corpus: nessuna mappa C01–C09 mai
  conservata (confermato in `piano-040` e nei brief Audio del 2026-09-04);
  non serve — il corpus reale è `docs/campioni/*.mp3`, già nominato per
  etichetta percettiva (`respiro-alto-0/1`, `respiro-profondo`/`-1`/
  `respirto-profondo-3`, `decompresisone`/`-1`, `pressurizzazione`/`1`/`-2`,
  `test-1`), e le discriminazioni richieste dalla direttiva sono di
  categoria, non di singolo file numerato.
- **2026-09-11**: Checkpoint 1 completato: impianto a due percorsi, nessuna
  nuova semantica. `audioMode=experimental` delega alla baseline finché la
  Fase 2 non introduce l'osservabilità del fenomeno.
