# Piano di Lavoro: Buffer e Riuso delle Quattro Immagini (Fase 3B)

> **ID Piano**: `PIANO-006`  
> **Macrotask di Riferimento**: `MACRO-006`  
> **Data Creazione**: 2026-08-08  
> **Stato**: `COMPLETATO` (Fase 3C non iniziata)  
> **Autore/Agente**: Codex

---

## 1. Obiettivo

Mantenere un buffer visuale rigoroso di quattro immagini narrative e ricombinarle durante la pausa termica, senza avviare la quinta inferenza “interludio”. I 120 secondi di cooldown fra produzioni devono iniziare soltanto dopo il completamento della quarta immagine.

---

## 2. Contesto

- La Fase 3A serializza e distanzia le inferenze.
- La pipeline corrente genera quattro scene e subito dopo una quinta immagine `bufferFrame`.
- `nextStoryTargetMs` è oggi calcolato dall'inizio della produzione e può risultare già esaurito alla fine delle quattro inferenze.
- File coinvolti:
  - `src/shared/brain/brainTypes.ts`
  - `src/renderer/output/brain/psichedel.ts`
  - `src/renderer/output/brain/brainController.ts`
  - test Brain pipeline e frame motion

---

## 3. Vincoli

- [x] Non modificare scheduler termico, FPS, DPR o qualità delle quattro inferenze.
- [x] Non modificare estetica, raster fade, palette o movimento musicale.
- [x] Conservare esattamente quattro posizioni narrative.
- [x] Continuare a riciclare immagini diverse da quella visibile.
- [x] Non eseguire prova live o tuning: appartengono alla Fase 3C.
- [x] Non iniziare la Fase 3C.

---

## 4. Implementazione

### 3B.1 — Buffer rigoroso
- [x] Rimuovere `BrainBufferFrame` e la generazione dell'interludio inferito.
- [x] Eliminare tutti i rami runtime dedicati alla quinta posizione.
- [x] Mantenere le quattro scene della storia come unico buffer visuale.

### 3B.2 — Riuso e cooldown
- [x] Far partire `nextStoryTargetMs` dalla fine della produzione.
- [x] Riciclare casualmente le quattro immagini durante il cooldown.
- [x] Evitare nuove inferenze finché il cooldown non termina.

### 3B.3 — Validazione automatica
- [x] Aggiornare i test: quattro chiamate al generatore, mai cinque.
- [x] Verificare il riciclo fra quattro indici.
- [x] Eseguire test, typecheck, lint mirato e build renderer.

---

## 5. Validation Plan

- `pnpm test`
- `pnpm typecheck`
- lint mirato
- `pnpm exec vite build`
- Nessuna verifica live in questa fase.

---

## 6. Registro

- **2026-08-08**: Fase 3B avviata; Fase 3C esplicitamente esclusa.
- **2026-08-08**: rimossa la quinta inferenza `interlude` e tutti i rami `bufferFrame`.
- **2026-08-08**: il gruppo corrente di quattro immagini resta visibile finché il nuovo refill non è completo; nessuno switch progressivo dopo sole due immagini.
- **2026-08-08**: cooldown di 120 secondi calcolato dal completamento della quarta immagine.
- **2026-08-08**: 26 file di test e 199 test superati; typecheck, lint mirato, `git diff --check` e build Vite/Electron superati.
