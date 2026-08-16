# Piano di Lavoro: Regia Casuale Brain e Morphing

> **ID Piano**: `PIANO-015`  
> **Macrotask di Riferimento**: `MACRO-013`  
> **Data Creazione**: 2026-08-16  
> **Stato**: `IN_PROGRESS — IMPLEMENTAZIONE COMPLETA, VALIDAZIONE LIVE PENDENTE`  
> **Autore/Agente**: Codex

## 1. Obiettivo

Rendere realmente casuali, ma senza ripetizioni immediate, le rotazioni dei
renderer Brain e dei morphing esterni. In “Tutti per storia” i quattro
renderer devono essere distribuiti casualmente sui quattro fotogrammi, invece
di far attraversare tutti i fotogrammi a un renderer prima del successivo.
L'interludio morphing deve conservare il tempo 80/20 pieno, senza farselo
consumare dalle dissolvenze di ingresso e uscita.

## 2. Moduli coinvolti

- `src/renderer/output/brain/brainRendererSelector.ts`
- `src/renderer/output/brain/brainController.ts`
- `src/shared/morphingRotation.ts`
- `src/renderer/output/OutputApp.tsx`
- UI, test e documentazione `working/`

## 3. Verifica della filosofia visiva

- [x] **Camera**: nessun movimento globale aggiunto.
- [x] **Materia**: nessuna modifica ai renderer o al raster.
- [x] **Silenzio**: nessuna animazione temporale nuova.
- [x] **Beatmatch**: i cambi fotogramma/renderer restano sul gate beat esistente.
- [x] **Transizione**: restano crossfade e morphing continui; nessun taglio.
- [x] **Alternanza**: 80/20 resta la quota piena; le dissolvenze ricevono un
  margine separato per non sottrarre tempo percepibile al morphing.
- [x] **Costo**: soli mazzi di pochi identificatori; costo e memoria trascurabili.
- [x] `lowPowerMode`, background throttling, IPC e permessi non vengono toccati.

## 4. Fasi

- [x] Rendere casuale e senza ripetizioni immediate la modalità `rotation`.
- [x] Assegnare un renderer casuale diverso a ogni fotogramma in story-cycle.
- [x] Creare un mazzo esterno che alterni famiglie e preset morphing.
- [x] Aggiungere il margine delle transizioni alla finestra morphing 80/20.
- [x] Aggiornare UI, test, typecheck, lint mirato e build.
- [x] Impedire che il ricircolo durante i timeout della storia resti fissato
  sull'ultimo renderer, usando un mazzo d'attesa separato.
- [ ] Registrare la validazione live pendente.

## 5. Validation Plan

- Test deterministici con sorgenti random controllate.
- Verifica di assenza di ripetizioni consecutive e copertura del mazzo.
- Test della durata 80/20 più margine transizioni.
- Suite completa, typecheck, lint mirato, diff-check e build Electron/macOS.

## 6. Registro

- **2026-08-16**: piano aperto dopo analisi dei selettori e dei timer correnti.
- **2026-08-16**: implementazione completata; 42 file e 255 test verdi,
  typecheck, lint mirato, diff-check e build Electron/macOS riusciti.
- **2026-08-16**: la prova live ha mostrato una ricorrenza eccessiva di
  Bauhaus fra storie. Il mazzo conserva ora un conteggio delle presenze: i
  renderer meno usati hanno priorità nella storia successiva, mantenendo
  casualità nei pareggi e unicità nei quattro fotogrammi. Il log espone anche
  il `rendererId` realmente assegnato.
- **2026-08-16**: il crossfade dei morphing è stato spostato sul RAF Output e
  usa tempo visivo accumulato con recupero massimo di 50 ms per frame. Gli
  stalli non vengono più convertiti in salti di opacità.
- **2026-08-16**: i log live hanno mostrato timeout ripetuti della generazione
  testuale mentre i fotogrammi continuavano a ricircolare con Vector Morph.
  Il ricircolo usa ora un mazzo casuale senza ripetizione immediata, distinto
  dal bilanciamento dei quattro fotogrammi narrativi.
