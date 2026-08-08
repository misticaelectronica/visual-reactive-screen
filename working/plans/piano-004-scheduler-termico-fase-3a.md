# Piano di Lavoro: Scheduler Termico delle Inferenze (Fase 3A)

> **ID Piano**: `PIANO-004`  
> **Macrotask di Riferimento**: `MACRO-006`  
> **Data Creazione**: 2026-08-08  
> **Stato**: `COMPLETATO` (verifica live demandata alla Fase 3C)  
> **Autore/Agente**: Codex

---

## 1. Obiettivo del Piano

Ridurre frequenza, duty-cycle e accumulo termico delle inferenze immagine WebGPU senza intervenire sul buffer delle quattro immagini. La pipeline deve consentire una sola inferenza alla volta, imporre una pausa minima fra inferenze e aumentarla quando il RAF dell'Output registra frame lunghi.

---

## 2. Prerequisiti e Contesto

- La Fase 2 ha eliminato il replay IPC ma ha misurato freeze WebGPU di circa 3-4 secondi.
- `brainController.ts` possiede già un cooldown fra produzioni, ma `Psichedel.generate()` esegue le immagini della stessa produzione in sequenza senza una pausa termica esplicita.
- File coinvolti:
  - `src/renderer/output/brain/brainThermalScheduler.ts`
  - `src/renderer/output/brain/brainThermalScheduler.test.ts`
  - `src/renderer/output/brain/brainController.ts`
  - `src/renderer/output/brain/psichedel.ts`
  - `src/shared/brain/brainConfig.ts`

---

## 3. Regole e Vincoli

- [x] Non modificare `backgroundThrottling`, permessi microfono o lifecycle Electron.
- [x] Preservare `lowPowerMode` e applicargli pause più conservative.
- [x] Non aumentare FPS, DPR, step o layer.
- [x] Non modificare palette, morphing, raster fade, forme o movimento musicale.
- [x] Non cambiare il numero o il riuso delle immagini: è responsabilità della Fase 3B.
- [x] Non avviare la Fase 3B.

---

## 4. Implementazione

### Fase 3A.1 — Scheduler puro
- [x] Implementare una coda single-flight testabile.
- [x] Applicare cooldown minimo dopo ogni inferenza.
- [x] Rilevare gap RAF moderati e gravi e applicare backoff adattivo.
- [x] Supportare una politica più conservativa in `lowPowerMode`.
- [x] Rendere `destroy()` sicuro per richieste in attesa.

### Fase 3A.2 — Integrazione
- [x] Inserire il gate immediatamente attorno alle chiamate reali al generatore immagini.
- [x] Registrare i gap RAF nel controller.
- [x] Esporre log sintetici di attesa, avvio e fine inferenza.
- [x] Lasciare invariata la produzione delle quattro immagini e dell'interludio.

### Fase 3A.3 — Validazione
- [x] Test dello scheduler e regressioni Brain verdi.
- [x] `pnpm typecheck` verde.
- [x] Lint mirato verde.
- [x] Build renderer verde.

---

## 5. Validation Plan

- `pnpm test`
- `pnpm typecheck`
- lint mirato sui file della Fase 3A
- build Vite/Electron renderer
- successiva prova live: verificare distanza fra inferenze e riduzione dei blocchi per minuto

---

## 6. Registro Avanzamento

- **2026-08-08**: piano creato; Fase 3A avviata senza includere la Fase 3B.
- **2026-08-08**: scheduler completato con cooldown 6 s, cooldown low-power 12 s, backoff 9 s dopo frame moderatamente lunghi e 20 s dopo freeze gravi.
- **2026-08-08**: 23 file di test e 189 test superati; typecheck, lint mirato, `git diff --check` e build Vite/Electron superati.
- **2026-08-08**: Fase 3B non iniziata; numero e buffer delle immagini restano invariati.
