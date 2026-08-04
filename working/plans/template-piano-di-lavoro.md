# Piano di Lavoro: [NOME_PIANO]

> **ID Piano**: `PIANO-XXX`  
> **Macrotask di Riferimento**: `MACRO-XXX`  
> **Data Creazione**: YYYY-MM-DD  
> **Stato**: `[ BOZZA | APPROVATO | IN_PROGRESS | COMPLETATO | ARCHIVIATO ]`  
> **Autore/Agente**: Agente AI / Sviluppatore  

---

## 1. 🎯 Obiettivo del Piano

[Descrizione chiara ed esaustiva di cosa questo piano deve realizzare, dei problemi da risolvere o delle funzionalità da aggiungere.]

---

## 2. 📋 Prerequisiti e Contesto

- **File / Moduli Coinvolti**:
  - `src/...`
  - `working/...`
- **Dipendenze Operative**: [Eventuali prerequisiti tecnici o decisioni architetturali]

---

## 3. ⚠️ Regole e Vincoli di Sviluppo (da `agents.md`)

- [ ] Verificare che le modifiche non violino le regole fondamentali di `agents.md` (es. `backgroundThrottling: false`, gestione microfono macOS, camera stabile, ecc.).
- [ ] Mantenere il supporto a `lowPowerMode`.
- [ ] Non introdurre DevTools automatici.

---

## 4. 🛠️ Fasi di Implementazione e Checklist Task

### Fase 1: Analisi e Preparazione
- [ ] Task 1.1: [Dettaglio task]
- [ ] Task 1.2: [Dettaglio task]

### Fase 2: Sviluppo e Modifiche Codice
- [ ] Task 2.1: [Dettaglio task]
- [ ] Task 2.2: [Dettaglio task]

### Fase 3: Verifica, Test e Build
- [ ] Task 3.1: Eseguire `pnpm typecheck`.
- [ ] Task 3.2: Eseguire `pnpm build` (se coinvolge main/preload/packaging).
- [ ] Task 3.3: Eseguire test di funzionamento live.

---

## 5. 🧪 Strategia di Verifica e Validation Plan

- **Comandi di Test**:
  - `pnpm typecheck`
  - `pnpm build`
- **Verifica Manuale**:
  - [Descrizione del test UI/IPC/Audio]

---

## 6. 📝 Note e Registro Avanzamento

- **[YYYY-MM-DD]**: Creazione iniziale del piano.
