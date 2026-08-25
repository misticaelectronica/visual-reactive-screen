# Piano di Lavoro: Documentazione Architettura Corrente

> **ID Piano**: `PIANO-020`
> **Macrotask di Riferimento**: `MACRO-018`
> **Data Creazione**: 2026-08-16
> **Stato**: `COMPLETED`
> **Autore/Agente**: Codex

## 1. Obiettivo

Produrre una fotografia tecnica essenziale e verificabile di Brain + Visual
Reactive Screen, aderente all'implementazione corrente e orientata alla
revisione di separazione, sostituibilità dei renderer e futuro dei preset.

## 2. Moduli coinvolti

- `src/main/`, `src/preload/`, `src/renderer/control/`
- `src/renderer/output/`, `src/renderer/output/brain/`
- `src/shared/`, configurazione e dipendenze di build
- `docs/architettura-brain-visual-reactive-screen.md`

## 3. Verifica delle regole di progetto

- [x] La richiesta è documentale: nessuna modifica a camera, materia o runtime.
- [x] Nessuna modifica a clock, silenzio, beatmatch, transizioni o alternanza.
- [x] Nessuna modifica a `lowPowerMode`, IPC, permessi, finestre o packaging.
- [x] La documentazione non descriverà componenti o astrazioni inesistenti.

## 4. Fasi

- [x] Verificare processi, entry point, IPC e persistenza.
- [x] Verificare audio, stato condiviso e loop per-frame.
- [x] Verificare pipeline Brain, AI, scheduler, memoria e renderer plugin.
- [x] Verificare preset, rendering, compositing e dipendenze tecniche.
- [x] Estrarre target e metriche prestazionali già presenti.
- [x] Scrivere il documento compatto e controllarne i riferimenti.
- [x] Eseguire diff-check e aggiornare il tracciamento `working/`.

## 5. Validation Plan

- Confronto puntuale con tipi, default, entry point e registry reali.
- Ricerca di ogni nome di renderer/preset citato nel codice.
- Verifica versioni da `package.json` e backend dalle implementazioni importate.
- `git diff --check`; nessun build richiesto per una modifica solo Markdown.

## 6. Registro

- **2026-08-16**: piano creato; analisi del codice avviata.
- **2026-08-16**: documento completato in
  `docs/architettura-brain-visual-reactive-screen.md`; typecheck e diff-check
  superati.
