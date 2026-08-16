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
