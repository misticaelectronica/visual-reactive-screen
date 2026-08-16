# Piano di Lavoro: Moti Di Coscienza Brain

> **ID Piano**: `PIANO-018`  
> **Macrotask di Riferimento**: `MACRO-016`  
> **Data Creazione**: 2026-08-16  
> **Stato**: `COMPLETATO` (verifica artistica live pendente)  
> **Autore/Agente**: Codex

---

## 1. Obiettivo del Piano

Permettere a Brain di riconoscere un ricordo saliente e pertinente alla storia
in corso, usarlo come influenza dichiarata su storia, forme e colori e
manifestarlo per un tempo limitato in regioni locali. Una didascalia rossa in
basso a destra spiega il cambiamento; al termine riprende la normale rotazione.

## 2. Prerequisiti e Contesto

- Archivio Markdown con provenienza distinta e origine già attiva.
- Clock ritmico globale Output già disponibile ai renderer Brain.
- Moduli coinvolti: `src/main/consciousnessArchive.ts`, IPC/preload, generatore
  narrativo e controller Brain.

## 3. Regole e Vincoli

- [x] Check Camera: nessuna trasformazione di camera o quadro.
- [x] Check Materia: influenza limitata a maschere, forme e cromie locali;
  raster principale riconoscibile.
- [x] Check Silenzio: nessun avanzamento geometrico senza clock attivo.
- [x] Check Beatmatch: ingresso e uscita quantizzati, pulse/fase/bande separati.
- [x] Check Transizione: dissolvenza locale continua e ritorno alla rotazione.
- [x] Check Alternanza: nessuna modifica alla regola Brain/morphing 80/20.
- [x] Check Costo: buffer locale piccolo, pochi elementi e riduzione low power.
- [x] Nessuna scrittura automatica del moto nell'archivio autobiografico.

## 4. Fasi di Implementazione

### Fase 1: Costituzione e selezione
- [x] Aggiornare protocollo e skill prima del codice runtime.
- [x] Aggiungere contratto tipizzato e selezione tracciabile del ricordo.

### Fase 2: Influenza narrativa e visuale
- [x] Iniettare l'influenza nella prossima storia conservando provenienza.
- [x] Creare moto locale beat-matched con didascalia rossa e cleanup.
- [x] Riprendere la normale timeline Brain alla conclusione.

### Fase 3: Verifica
- [x] Testare selezione, pertinenza, durata, silenzio e prompt.
- [x] Eseguire typecheck, test, lint mirato e build.
- [x] Registrare stato e sessione; lasciare la prova fullscreen come verifica
  artistica se non disponibile automaticamente.

## 5. Validation Plan

- `pnpm typecheck`
- test Vitest mirati e suite completa
- lint sui file modificati
- `pnpm build`
- prova manuale: storia correlata, didascalia in basso a destra, area locale,
  freeze nel silenzio, uscita sul beat e prosecuzione della rotazione.

## 6. Registro Avanzamento

- **2026-08-16**: archivio e ricordi recenti riletti; definiti provenienza,
  limiti visivi, cooldown e non-persistenza automatica del moto.
- **2026-08-16**: implementati selettore, IPC, influenza narrativa/cromatica,
  overlay locale e parcheggio della timeline per otto beat. Suite completa:
  46 file / 270 test; typecheck, lint mirato e diff check riusciti. Build Vite,
  Electron e ZIP macOS riuscita; DMG fermato dal noto errore esterno `hdiutil`.
- **2026-08-16**: dopo la prova di leggibilità, la permanenza è stata estesa a
  un minimo di 12 secondi e almeno 16 beat. L'uscita resta quantizzata sul beat
  e il tempo di lettura non avanza durante il silenzio.
