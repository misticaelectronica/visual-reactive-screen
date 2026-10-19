# Piano di Lavoro: protezione bambini configurabile

- **ID**: PIANO-052 (estensione circoscritta di MACRO-039)
- **Data**: 2026-10-19
- **Stato**: IMPLEMENTATO (2026-10-19)

## 1. Obiettivo e contesto

Rendere attivabile e disattivabile dalla Control Window la protezione che
aggiunge termini relativi ai bambini al negative prompt delle immagini di un
episodio pubblico vicino a scene esplicite. La protezione resta attiva di
default, anche caricando impostazioni precedenti. Rimuovere dai termini
aggiunti `minor`, `teenager`, `schoolgirl`, `schoolboy` e `baby`.

## 2. Verifica delle regole di progetto

- **Audit deprecati**: DEP-001 `NON COINVOLTO`; DEP-002 `NON COINVOLTO`.
- **Camera / Materia / Silenzio / Beatmatch / Transizione**: invariati; cambia
  soltanto il negative prompt usato per creare alcuni raster.
- **Costo**: nessun nuovo lavoro per frame o inferenza; un booleano persistito.
- **Autonomia renderer**: la regola resta nel modulo Psichedel e non viene
  promossa a infrastruttura condivisa.
- **Sovrastrutturazione**: si governa il meccanismo esistente, senza
  introdurne uno parallelo.

## 3. Implementazione

- [x] TASK-052-01: aggiungere l'impostazione booleana, default attivo e
  normalizzazione compatibile con impostazioni salvate precedenti.
- [x] TASK-052-02: sostituire la riga di stato della Sessione pubblica con un
  checkbox e inoltrare la scelta alla generazione dell'episodio.
- [x] TASK-052-03: restringere `CHILD_SAFETY_NEGATIVE_TERMS` e coprire stato
  attivo, stato disattivo e lista termini con test.
- [x] TASK-052-04: aggiornare stato, registri e storico della sessione.

## 4. Validation plan

- `pnpm typecheck`
- test mirati della protezione e delle impostazioni immagini
- `pnpm lint`
- `pnpm exec vitest run`
- `pnpm build` (coinvolge `src/main/settings.ts` e i renderer)

Esito: typecheck, lint e build completa app/ZIP/DMG verdi; 86 file / 810 test
verdi.

