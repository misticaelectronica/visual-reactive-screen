# Piano di Lavoro: Setup Cartella Working e Metodologia Piani di Lavoro

> **ID Piano**: `PIANO-002`  
> **Macrotask di Riferimento**: `MACRO-004`  
> **Data Creazione**: 2026-08-04  
> **Stato**: `COMPLETATO`  
> **Autore**: Agente AI Antigravity  

---

## 1. 🎯 Obiettivo del Piano

Creare l'infrastruttura di memoria operativa `working/` nel progetto, comprensiva di tracciamento macrotask, registro microtask, storico sessioni di lavoro, e integrare in `agents.md` la guida obbligatoria su come lavorare con i Piani di Lavoro.

---

## 2. 📋 Prerequisiti e Contesto

- **File / Moduli Coinvolti**:
  - `working/README.md`
  - `working/STATE.md`
  - `working/tasks/macrotasks.md`
  - `working/tasks/tasks-registry.md`
  - `working/plans/template-piano-di-lavoro.md`
  - `working/plans/piano-001-brain-ai-integration.md`
  - `working/plans/piano-002-working-system-setup.md`
  - `working/sessions/session-history.md`
  - `agents.md`

---

## 3. ⚠️ Regole e Vincoli di Sviluppo (da `agents.md`)

- Non alterare le regole di build, i permessi audio macOS ed i parametri di background throttling.
- Garantire che la documentazione in `agents.md` sia chiara, prescrittiva ed integrata organicamente senza rimuovere le linee guida esistenti.

---

## 4. 🛠️ Fasi di Implementazione e Checklist Task

### Fase 1: Creazione Struttura Directory e Memory Files
- [x] Creare `working/README.md` e `working/STATE.md`.
- [x] Creare `working/tasks/macrotasks.md` e `working/tasks/tasks-registry.md`.
- [x] Creare `working/sessions/session-history.md`.

### Fase 2: Definizione Piani di Lavoro
- [x] Creare `working/plans/template-piano-di-lavoro.md`.
- [x] Registrare `piano-001-brain-ai-integration.md`.
- [x] Registrare `piano-002-working-system-setup.md`.

### Fase 3: Aggiornamento `agents.md`
- [x] Integrazione delle regole e workflow dei Piani di Lavoro in `agents.md`.

### Fase 4: Verification & Final Check
- [x] Verificare la correttezza tramite `pnpm typecheck`.
- [x] Aggiornare lo stato finale in `STATE.md` e `session-history.md`.

---

## 5. 🧪 Strategia di Verifica

- `pnpm typecheck` per verificare che non ci siano errori TypeScript nel progetto.
- Ispezione visiva dei file generati per confermarne la formattazione e completezza.
