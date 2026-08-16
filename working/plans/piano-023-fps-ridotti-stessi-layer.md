# Piano di Lavoro: FPS Ridotti con Stessi Layer

> **ID Piano**: `PIANO-023`
> **Macrotask di Riferimento**: `MACRO-021`
> **Data Creazione**: 2026-08-16
> **Stato**: `ARCHIVIATO — RIMOSSO DOPO VALIDAZIONE LIVE`

## Obiettivo

Aggiungere un'opzione globale che riduca soltanto la frequenza di disegno,
senza attivare le riduzioni di layer, risoluzione, DPR o qualità proprie di
`lowPowerMode`.

## Vincoli

- [x] Camera stabile e nessun moto autonomo nel silenzio.
- [x] Clock audio/beat non rallentato: viene ridotto soltanto il rendering.
- [x] Layer, densità, geometria, raster e qualità restano quelli normali.
- [x] `lowPowerMode` resta disponibile e invariato.
- [x] Nessun nuovo buffer o effetto.

## Implementazione

- [x] Aggiungere `reducedFpsMode` a tipi, default, persistenza e UI.
- [x] Applicare il solo frame pacing a Brain e morphing esterni.
- [x] Aggiungere test del budget FPS e verificare la normalizzazione via tipi.
- [x] Eseguire test, typecheck, lint e build.
- [ ] Verificare live fluidità, beat e temperatura.

## Validation Plan

- `pnpm test -- --run`
- `pnpm typecheck`
- lint mirato e `git diff --check`
- `pnpm build`
- confronto fullscreen OFF / FPS ridotti / basso consumo.

## Registro

- **2026-08-16**: opzione e pacing implementati; audit conferma che il nuovo
  flag compare soltanto nelle decisioni di cadenza, non nei budget visuali.
- **2026-08-16**: test, typecheck, lint, diff-check e build completa verdi;
  resta il confronto percettivo fullscreen.
- **2026-08-16**: prova live negativa: pacing e integrazione musicale non sono
  abbastanza separati per garantire la stessa fluidità a 30 FPS. Opzione
  ritirata integralmente tramite `PIANO-025`.
