# Piano di Lavoro: Ripristino Comportamenti Non Performance

> **ID Piano**: `PIANO-029`
> **Macrotask di Riferimento**: `MACRO-029`
> **Data Creazione**: 2026-08-16
> **Stato**: `COMPLETED`
> **Autore/Agente**: Codex

## 1. Obiettivo

Reintrodurre sul rollback approvato esclusivamente sette comportamenti:
FilterPsiche senza riga centrale e più dinamico, concatenazione/fallback dei
prompt, refill infinito e permanenza casuale dei renderer materici.

## 2. Confini

- Nessuna modifica a backend Qwen/SD, WebGPU/WASM o residenza dei modelli.
- Nessuna modifica a step, risoluzione, qualità, cooldown o frame pacing.
- Nessun ripristino della separazione causale sperimentale o delle osservazioni
  visuali dirette.
- Camera stabile; dinamica interna alla materia; silenzio e beatmatch invariati.

## 3. Implementazione

- [x] Rimuovere la slice centrale e intensificare FilterPsiche.
- [x] Concatenare prompt corrente, stimolo distinto e residuo precedente.
- [x] Usare un fallback locale dopo un solo tentativo Qwen.
- [x] Avviare sempre il refill dopo il buffer di quattro immagini.
- [x] Mantenere FilterPsiche, Materia Morph e Vector Morph per 2–4 immagini;
  Psycho2D resta casuale singolo.
- [x] Aggiungere test mirati e completare la validazione.

## 4. Validation Plan

- `pnpm typecheck`
- `pnpm test`
- `pnpm lint`
- `git diff --check`

Esito: 50 file / 299 test, typecheck, lint e diff-check verdi.

## Correzione percettiva 2026-08-16

- [x] Corretto il mazzo: FilterPsiche è ora visibile nella prima immagine del
  gruppo, oppure nella seconda quando aveva chiuso il gruppo precedente.
- [x] Validazione automatica aggiornata: 52 file / 306 test, typecheck, lint,
  diff-check e bundle Vite/Electron verdi.

## Rimozione completa righe FilterPsiche 2026-08-16

- [x] Eliminare tutte le slice orizzontali, non soltanto quella centrale.
- [x] Conservare la risposta alle alte come modulazione cromatica senza tagli.
- [x] Aggiornare test e validazione automatica.

Esito: rimosso integralmente il ritaglio orizzontale `drawImage`; le alte
modulano saturazione e fusione cromatica. Un test impedisce la reintroduzione
di disegni canvas a striscia. Suite: 52 file / 306 test; typecheck, lint,
bundle Vite/Electron e diff-check verdi.

## Esclusione temporanea Psycho2D 2026-08-16

- [x] Escludere Psycho2D dalla rotazione temporale automatica.
- [x] Escluderlo dal ciclo per storia e dalla rotazione durante l'attesa.
- [x] Mantenerlo disponibile in selezione manuale.
- [x] Aggiornare test e validazione automatica.

Esito: Psycho2D resta registrato e selezionabile manualmente, ma non entra in
alcun mazzo automatico. Il passaggio da Psycho2D a una modalità automatica
seleziona immediatamente il primo renderer ammesso. Suite: 52 file / 307 test;
typecheck, lint, bundle Vite/Electron e diff-check verdi.

## Disabilitazione runtime Psycho2D 2026-08-16

- [x] Rimuovere Psycho2D dal registry runtime dei renderer Brain.
- [x] Rimuoverlo dalla selezione UI per impedire richieste residue.
- [x] Conservare sorgenti e tipo persistito per un eventuale ripristino futuro.
- [x] Aggiornare test e validazione automatica.

Esito: il bundle Output non include più il plugin Psycho2D e passa da circa
288,55 kB a 274,72 kB. Una vecchia preferenza `psycho2d` ricade sul primo
renderer registrato. Suite: 52 file / 307 test; typecheck, lint, bundle
Vite/Electron e diff-check verdi.
