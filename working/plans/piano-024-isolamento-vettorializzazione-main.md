# Piano di Lavoro: Isolamento Vettorializzazione dal Main

> **ID Piano**: `PIANO-024`
> **Macrotask di Riferimento**: `MACRO-022`
> **Data Creazione**: 2026-08-16
> **Stato**: `IN_PROGRESS`

## Obiettivo

Eliminare gli arresti del trasporto audio IPC causati da SNIC/VTracer sincrono
nel main Electron e impedire che l'inferenza immagini nel worker attivi per
intero la vecchia modalità grafica degradata.

## Evidenza iniziale

- RAF Output: 120,5 Hz, p95 9,1–9,2 ms durante gran parte di UNet.
- Canvas visibile durante inferenza: 19,9 FPS, `resourcePressureRatio: 1`.
- Vettorializzazione: buco IPC di 1.557 ms, 186 pacchetti sostituiti.

## Vincoli

- [x] Nessun cambiamento a camera, materia, beat o silenzio.
- [x] Inferenza e vettorializzazione restano seriali e limitate.
- [x] Protezione grafica attivata da gap misurati, non da timer autonomi.

## Implementazione

- [ ] Pressione renderer adattiva rimossa dopo la prova live: l'alternanza
  plugin/passthrough reagiva dopo lo stall e produceva ulteriori discontinuità.
- [x] Spostare SNIC/VTracer in un Worker Node separato dal main IPC.
- [x] Trasferire il buffer raster senza copia quando possibile.
- [x] Aggiungere timeout, gestione errori e riavvio del worker.
- [x] Verificare bundle e worker con raster sintetico.
- [x] Completare build automatica.
- [ ] Eseguire prova live comparativa.

## Correzione dopo prova live

- **2026-08-16**: il Worker Node di vettorializzazione viene mantenuto perché
  ha eliminato il lavoro sincrono dal main. La protezione grafica adattiva
  viene invece ritirata con `PIANO-025`; non era una proprietà necessaria del
  Worker e oscillava a ogni gruppo di gap UNet.

## Validation Plan

- test, typecheck, lint e build completa;
- smoke test del worker su raster 320×180;
- sessione live verificando `visualPackets.max`, `replacedPending`,
  `resourcePressureRatio`, Canvas FPS e RAF Output.
