# Piano di Lavoro: Soluzioni Denoising Stall

> **ID Piano**: `PIANO-030`
> **Macrotask di Riferimento**: `MACRO-030`
> **Data Creazione**: 2026-08-16
> **Stato**: `COMPLETATO — VALIDAZIONE LIVE PENDENTE`
> **Origine**: piano Antigravity approvato `6ac15e63-3070-419e-9507-6a1e0325298d`

## 1. Obiettivo

Ridurre la contesa GPU prodotta dagli step UNet WebGPU seguendo senza
estensioni le due soluzioni approvate: finestra di generazione offline e yield
cooperativo tra submit GPU.

## 2. Vincoli

- Camera e quadro stabili; nessun movimento autonomo nel silenzio.
- Nessuna modifica a step, seed, qualità o forma della pipeline immagini.
- Conservare `lowPowerMode`, IPC, permessi e throttling esistenti.
- Entrambe le soluzioni devono essere reversibili tramite configurazione.

## 3. Task approvati

### Soluzione B — Finestra Offline

- [x] Leggere `brainRendererHost.ts` e l'API pubblica corrente.
- [x] Creare `brainOfflineWindow.ts`.
- [x] Aggiungere `offlineGenerationEnabled` e `offlineWindowMaxMs`.
- [x] Aggiungere `setOfflineHold()` al renderer host.
- [x] Integrare la finestra in `brainController.ts` attorno a Psichedel.
- [x] Scrivere i test della finestra e dell'hold.

### Soluzione A — GPU Yield Cooperativo

- [x] Verificare ONNX Runtime Web: versione installata `1.24.1`.
- [x] Creare `sd15GpuYield.ts`.
- [x] Aggiungere `gpuYieldBetweenSubmits` e `gpuYieldMs`.
- [x] Iniettare il device avvolto durante `loadInternal()`.
- [x] Scrivere i test del wrapper.

### Validazione e consegna

- [x] `pnpm typecheck`
- [x] `pnpm test`
- [x] `pnpm lint`
- [x] `pnpm build`
- [x] `git diff --check`
- [x] Aggiornare working system e creare il commit.

## 4. Verifica live successiva

- Misurare gap RAF durante la generazione.
- Verificare ripresa della reattività dopo la finestra offline.
- Confermare buffer 4/4 e avvio della storia successiva.

## 5. Esito automatico

- 52 file di test e 305 test superati.
- Typecheck e lint superati.
- Build Vite, Electron, ZIP e DMG arm64 completata.
- Primo tentativo DMG fallito nel sandbox; stessa build riuscita fuori sandbox.

## 6. Correzione dinamica 2026-08-16

- [x] Eliminare l'arresto globale del RAF durante la generazione.
- [x] Conservare timeline, transizioni e risposta audio attive.
- [x] Usare la finestra come coordinatore del passthrough dinamico leggero.
- [x] Applicare la modalità leggera anche ai renderer creati durante la generazione.
- [x] Validare suite, typecheck, lint e bundle: 52 file / 306 test verdi.
- [ ] Confermare percettivamente il comportamento live durante un ciclo completo.

## 7. Correzione Print2D 2026-08-16

- [x] Sostituire il passthrough one-bit con il renderer reale `Print2D — serigrafico`.
- [x] Mantenerlo reattivo all'audio e sotto pressione risorse durante il denoising.
- [x] Conservare il crossfade continuo di ingresso e ritorno al renderer pieno.
- [x] Aggiungere test mirati e completare la validazione automatica.

Esito: Print2D resta a 480×270, acquisisce beat e bande prima del proprio
frame pacing a 18 FPS sotto pressione, riceve flash e transizioni e sostituisce
il renderer pieno con crossfade da 220 ms. Suite completa: 52 file / 306 test;
typecheck, lint, bundle Vite/Electron e diff-check verdi. Verifica live pendente.
