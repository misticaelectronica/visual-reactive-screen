# Piano di Lavoro: Release Candidate 1 e merge su develop

> **ID Piano**: `PIANO-041`  
> **Macrotask di Riferimento**: `MACRO-031`  
> **Data Creazione**: 2026-08-28  
> **Stato**: `IN_PROGRESS`  
> **Autore/Agente**: Agente AI / Capo Supremo  

---

## 1. 🎯 Obiettivo del Piano

Consolidare il lavoro successivo a `v1.0.0-beta.3` come
`v1.0.0-rc.1`, produrre la documentazione completa per collaudo e rilascio,
committare lo stato verificato della feature e integrarlo localmente in
`develop` con merge esplicito e nuova validazione post-merge.

---

## 2. 📋 Prerequisiti e Contesto

- **Sorgente**: `feature/fractal-spiral-degeneration`, con PIANO-040 completo
  ma non ancora committato.
- **Destinazione**: `develop`, avanti di sette commit e già contenente il merge
  della precedente versione della feature.
- **Documenti**: `CHANGELOG.md`, `README.md`, `docs/release-candidate.md`,
  `working/release-notes/v1.0.0-rc.1.md` e registri `working/`.
- **Versione**: bump da `1.0.0-beta.3` a `1.0.0-rc.1`; nessun tag o push
  remoto senza richiesta esplicita.

---

## 3. ⚠️ Regole e Vincoli di Sviluppo (da `agents.md`)

- [x] Nessuna modifica a throttling, permessi microfono o switch Chromium.
- [x] Camera e quadro stabili; le risposte di regime restano locali alla materia.
- [x] `lowPowerMode`, flash di sicurezza e transizioni preservati.
- [x] Nessun nuovo gate percettivo: riuso dei segnali e delle leve esistenti.
- [x] Il merge preserva la storia di `develop`; vietati reset o checkout distruttivi.

---

## 4. 🛠️ Fasi di Implementazione e Checklist Task

### Fase 1: Documentazione RC

- [x] Task 1.1: definire versione, perimetro, novità e incompatibilità.
- [x] Task 1.2: produrre changelog pubblico e note di rilascio complete.
- [x] Task 1.3: produrre checklist di installazione, smoke test, collaudo live,
  criteri go/no-go e problemi noti.
- [x] Task 1.4: aggiornare README, package version e registri di lavoro.

### Fase 2: Commit e merge

- [ ] Task 2.1: validare e committare lo stato completo sulla feature.
- [ ] Task 2.2: passare a `develop` e integrare con merge `--no-ff`.
- [ ] Task 2.3: risolvere eventuali conflitti senza perdere modifiche di develop.

### Fase 3: Verifica post-merge

- [ ] Task 3.1: eseguire `pnpm typecheck`, `pnpm lint`, `pnpm test`.
- [ ] Task 3.2: eseguire `pnpm build` e verificare DMG/ZIP/blockmap.
- [ ] Task 3.3: verificare branch, working tree, log e diff check.
- [ ] Task 3.4: registrare esito finale in STATE, registry e session history.

---

## 5. 🧪 Strategia di Verifica e Validation Plan

- **Automatica**: typecheck, lint, suite Vitest completa, build Electron arm64,
  `git diff --check` e working tree pulito.
- **Pacchetti**: presenza di app, DMG, ZIP e rispettive blockmap con versione RC.
- **Manuale prima del tag stabile**: avvio senza DevTools, selezione display e
  audio, output fullscreen, Test Flash/Panic, quattro regimi bio-percettivi,
  Varco prima della GPU, Riattivazione periodica e sessione pubblica.
- **Go/No-Go**: nessun crash o output nero; nessun renderer cieco al regime;
  nessun neurone Dream nei regimi bassi; nessun lag prima del Varco.

---

## 6. 📝 Note e Registro Avanzamento

- **2026-08-28**: piano creato; documentazione RC avviata dopo build completa
  e suite 63 file / 574 test verdi sulla feature.
