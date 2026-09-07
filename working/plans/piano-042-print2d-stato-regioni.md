# Piano di Lavoro: PRINT2D — stato e memoria per regione

> **ID Piano**: `PIANO-042`  
> **Macrotask**: `MACRO-033`  
> **Data**: 2026-09-07  
> **Stato**: IN_PROGRESS

## 1. Obiettivo e contesto
Correzione strutturale ordinata dal Consigliere: sostituire gli offset elastici
con stato locale, fase filtrata e deriva limitata senza attrazione all'origine.
Estende PIANO-039. Wash-out, impulso locale e lock leggibile sono subordinati.
File: brainPrint2dCanvas.ts e modulo locale di dinamica con test dedicati.
Il lavoro parallelo su brainController.ts e docs/varco-percettivo.md è escluso.

## 2. Regole e vincoli
- [x] Camera stabile, materia e raster esistenti; identità/palette/retino invariati.
- [x] Silenzio arresta la geometria conservando la posizione raggiunta.
- [x] Fase musicale e bande esistenti; nessun clock o detector nuovo.
- [x] Transizioni e alternanza conservate; nessuna modifica main/preload/audio.
- [x] Budget: 12 stati piccoli, nessun buffer/layer/draw aggiuntivo; pacing low power invariato.

## 3. Fasi
- [x] Analisi codice, filosofia e protocollo.
- [x] Stato locale e integrazione nei sette preset, contorni ed echi.
- [x] Test di memoria, wrap di fase, asincronia, silenzio, freeze e deriva prolungata.
- [x] Typecheck e lint.
- [ ] Collaudo percettivo fullscreen con audio reale.

## 4. Validation Plan
`pnpm test -- src/renderer/output/brain/brainPrint2d*.test.ts`,
`pnpm typecheck`, `pnpm lint`. Build non richiesta (solo renderer sorgente).
Live: confrontare regioni dopo colpi, silenzio e ripresa; verificare memoria
leggera senza degrado, sette preset e transizioni, low power e freeze.

## 5. Registro
2026-09-07: avvio intervento mirato, senza interventi sul lavoro parallelo.

2026-09-07: implementazione e verifiche automatiche completate (33 test mirati,
typecheck e lint). Il collaudo percettivo resta pendente. La velocità decade a
zero, la posizione si conserva; limiti per canale 3/4/2/1 px sulla canvas di
lavoro, applicati prima dei coefficienti compositivi già esistenti. Fase
circolare filtrata per regione prima della trigonometria, rimosse armoniche
×2/×4 e inversioni di corsia/direzione al beat. Stato aggiornato prima del
pacing e congelato durante freeze; il delta non accumula il tempo di freeze.
Le prove Canvas usano un contesto simulato: verificano collegamento ai sette
preset e cleanup, non certificano l'esito artistico. Palette, preparazione del
retino, numero di passate e transizioni non modificati. Memoria solo runtime
per la durata della scena, non autobiografica e non persistita su disco.
