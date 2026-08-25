# Piano di Lavoro: Rollback Prestazioni Renderer

> **ID Piano**: `PIANO-025`
> **Macrotask di Riferimento**: `MACRO-023`
> **Data Creazione**: 2026-08-16
> **Stato**: `COMPLETATO — VALIDAZIONE LIVE PENDENTE`

## Obiettivo

Rimuovere le regressioni confermate dal test live senza annullare l'isolamento
dei lavori pesanti: ripristinare qualità e cadenza normali dei renderer,
ritirare l'opzione FPS ridotti e impedire l'alternanza continua fra plugin e
passthrough dopo ogni gap UNet.

## Verifica delle regole di progetto

- [x] Camera e quadro restano stabili; il rollback non aggiunge trasformazioni.
- [x] Materia, raster, maschere e mapping musicali non vengono sostituiti.
- [x] Il silenzio continua a congelare il movimento geometrico.
- [x] Clock globale, beat, transienti per banda e correzione hat restano intatti.
- [x] `lowPowerMode` resta disponibile e separato.
- [x] Worker immagini e Worker Node di vettorializzazione restano attivi.

## Fasi di implementazione

- [x] Rimuovere `reducedFpsMode` da tipi, default, persistenza, UI e renderer.
- [x] Ripristinare Liquid e Oniric a 60 FPS normali.
- [x] Ripristinare Liquid a 60 punti e rimuovere i tetti di layer normali.
- [x] Ripristinare i budget normali di FilterPsiche e Materia Morph.
- [x] Rimuovere la pressione renderer adattiva e i relativi test.
- [x] Verificare che entrambi i Worker e i loro entry point restino invariati.
- [x] Aggiornare tracciamento e registrare l'esito del rollback.

## Validation Plan

- `pnpm test -- --run`
- `pnpm typecheck`
- lint dei file TypeScript/TSX modificati
- `git diff --check`
- `pnpm build`
- prova fullscreen successiva con Soft e low power disattivi

## Registro

- **2026-08-16**: rollback autorizzato dopo il test live. Diagnosi: modalità
  normale ridotta insieme a quella sperimentale, Liquid semplificato a 42
  punti e pressione grafica oscillante 17 volte nella sessione.
- **2026-08-16**: rollback completato. 50 file / 295 test, typecheck, lint,
  diff-check e build Electron arm64 completi. La build contiene ancora
  `brainImageWorker` e `brainVectorizerWorker.js`.
