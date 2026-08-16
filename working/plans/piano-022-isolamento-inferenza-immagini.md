# Piano di Lavoro: Isolamento Inferenza Immagini

> **ID Piano**: `PIANO-022`
> **Macrotask di Riferimento**: `MACRO-020`
> **Data Creazione**: 2026-08-16
> **Stato**: `IN_PROGRESS`
> **Autore/Agente**: Agente AI

## 1. Obiettivo

Spostare caricamento e inferenza ONNX/WebGPU di Psichedel fuori dal thread
JavaScript dell'Output. L'Output continua a disegnare mentre un Worker dedicato
produce il raster e riceve soltanto progressi e immagine pronta.

## 2. Contesto

- Runtime: `src/renderer/output/brain/sd15OnnxWebGpu.ts`.
- Generatore: `src/renderer/output/brain/psychedelImageGenerator.ts`.
- Integrazione: `src/renderer/output/brain/psichedel.ts`.
- Il Worker separa il carico JavaScript/ONNX dal RAF Output; WebGPU continua a
  condividere il processo GPU Chromium e richiede una prova live reale.

## 3. Vincoli

- [x] Camera e quadro restano stabili; nessuna trasformazione globale.
- [x] Materia, beatmatch e comportamento nel silenzio non cambiano.
- [x] `lowPowerMode` e protezioni durante inferenza restano attivi.
- [x] Nessuna modifica a throttling, permessi, DevTools o coscienza.
- [x] Un solo Worker e una sola inferenza alla volta.

## 4. Fasi

- [x] Verificare dipendenze browser del runtime ONNX.
- [x] Definire protocollo tipizzato e parametri risolti nell'Output.
- [x] Rendere il runtime compatibile con Window e Dedicated Worker.
- [x] Implementare Worker seriale con timeout, progressi e rilascio.
- [x] Usare il client Worker come generatore predefinito di Psichedel.
- [x] Aggiungere test e completare typecheck, lint e build.
- [ ] Confrontare live continuità RAF, gap massimi e temperatura.

## 5. Validation Plan

- `pnpm test -- --run`
- `pnpm typecheck`
- lint mirato sui file modificati
- `pnpm build`
- Prova fullscreen standard/enhanced confrontando `frameGapMs` e `renderMs`
  prima e durante UNet, anche in soft/low power.

## 6. Registro

- **2026-08-16**: confermato che UNet gira nel thread Output; scelto un
  Dedicated Worker come primo confine incrementale, senza migrare a Stride.
- **2026-08-16**: implementazione e validazione automatica completate; resta la
  prova live comparativa, quindi il piano rimane `IN_PROGRESS`.
