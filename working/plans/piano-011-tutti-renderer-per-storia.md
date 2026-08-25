# Piano di Lavoro: Tutti i Renderer per Storia

> **ID Piano**: `PIANO-011`  
> **Macrotask di Riferimento**: `MACRO-010`  
> **Data Creazione**: 2026-08-10  
> **Stato**: `IN_PROGRESS`  
> **Autore/Agente**: Codex / Capo Supremo

---

## 1. 🎯 Obiettivo del Piano

Introdurre un'opzione Brain in cui la storia corrente viene attraversata per
intero da tutti i renderer registrati prima di consentire il passaggio alla
storia successiva. L'ordine deve essere casuale, senza ripetizioni nello stesso
ciclo, e ogni passaggio deve usare il morphing lungo fra fotogrammi già
esistente, senza tagli istantanei.

## 2. 📋 Prerequisiti e Contesto

- **Moduli coinvolti**:
  - `src/shared/types.ts`, `src/shared/defaults.ts`
  - `src/main/settings.ts`
  - `src/renderer/control/components/VisualControls.tsx`
  - `src/renderer/output/brain/brainRendererSelector.ts`
  - `src/renderer/output/brain/brainController.ts`
- Il Renderer Host e i tre plugin restano invariati nei rispettivi contratti.
- Il buffer della storia successiva può continuare a riempirsi, ma il takeover
  viene rinviato finché il mazzo renderer della storia corrente non è esaurito.

## 3. ⚠️ Regole e Vincoli di Sviluppo

- [x] Nessuna modifica a throttling, finestre, IPC audio o permessi macOS.
- [x] Camera globale stabile e movimento sempre distribuito nei renderer.
- [x] Conservare `lowPowerMode` e il denoising passthrough.
- [x] Nessun DevTools o overlay di debug in produzione.
- [x] Nessuna ricreazione o inferenza immagini causata dal cambio renderer.

## 4. 🛠️ Fasi di Implementazione e Checklist Task

### Fase 1: Contratto e selettore
- [x] Aggiungere la modalità persistita `story-cycle`.
- [x] Costruire un mazzo casuale senza ripetizioni per ogni nuova storia.
- [x] Esporre avanzamento e completamento del ciclo al controller.

### Fase 2: Regia della timeline e UI
- [x] Ripetere i quattro fotogrammi con il renderer successivo prima del takeover.
- [x] Usare il morphing tra ultimo fotogramma e nuovo primo fotogramma.
- [x] Aggiungere l'opzione non tecnica alla Control Window.

### Fase 3: Verifica
- [x] Testare ordine, assenza di ripetizioni e blocco della storia successiva.
- [x] Eseguire test mirati, suite completa, typecheck, lint e build applicativo.
- [ ] Affidare al Capo Supremo la verifica live di fluidità e temperatura.

## 5. 🧪 Validation Plan

- `pnpm test -- brainRendererSelector brainRendererHost`
- `pnpm typecheck`
- lint mirato dei file modificati
- `pnpm build`
- Test manuale: selezionare “Tutti per storia”, osservare tre attraversamenti
  completi con ordine casuale e verificare che la storia successiva entri solo
  dopo il terzo, sempre attraverso morphing.

## 6. 📝 Note e Registro Avanzamento

- **2026-08-10**: piano creato; scelta una rotazione per attraversamenti
  completi anziché una rotazione temporale indipendente dalla storia.
- **2026-08-10**: implementazione completata. Suite completa: 34 file e 226
  test; typecheck, lint mirato, build Vite/Main/Preload e diff-check verdi. Il
  packaging `.app` è riuscito; la sola immagine DMG non è stata prodotta per
  errore esterno di `hdiutil`. Resta il test live manuale.
