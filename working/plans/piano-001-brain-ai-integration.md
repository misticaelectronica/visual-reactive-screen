# Piano di Lavoro: Brain AI & Coscienza Onirica Integration

> **ID Piano**: `PIANO-001`  
> **Macrotask di Riferimento**: `MACRO-003`  
> **Data Creazione**: 2026-07-27  
> **Stato**: `COMPLETATO`  
> **Autore**: Capo Supremo / Agente AI  

---

## 1. 🎯 Obiettivo del Piano

Implementare la pipeline continua di generazione narrativa e visuale AI ("Brain continuous dream pipeline"), integrando la Coscienza Onirica ed il modulo Psichedel, garantendo una rotazione armoniosa dei morphing ed evitando blocchi nell'elaborazione del Worker AI.

---

## 2. 📋 Prerequisiti e Contesto

- **File / Moduli Coinvolti**:
  - `src/renderer/output/brain/brainAiWorker.ts`
  - `src/renderer/output/brain/coscienzaOnirica.ts`
  - `src/renderer/output/brain/psichedel.ts`
  - `src/shared/brain/brainConfig.ts`

---

## 3. 🛠️ Fasi di Implementazione e Checklist Task

### Fase 1: Pipeline di Generazione Storie Dream
- [x] Implementare il ciclo continuo di generazione dream in `brainAiWorker.ts`.
- [x] Integrare le configurazioni condivise in `brainConfig.ts`.

### Fase 2: Tuning Visuale e Anti-Bias
- [x] Ridurre il bias verso strutture architettoniche rigide nei prompt e nei morphing.
- [x] Condividere lo stato di rotazione morphing fra differenti storie Brain per evitare transizioni scattose.

### Fase 3: Resilienza e Recovery
- [x] Aggiungere meccanismi di timeout e autoricovero per sbloccare la generazione se il Worker si arresta.
- [x] Integrare `psichedel` con `coscienzaOnirica`.

---

## 4. 🧪 Strategia di Verifica

- `pnpm typecheck`: superato.
- Verification live della generazione continua dei dream sullo schermo output.
