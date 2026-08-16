# Piano di Lavoro: Clock Ritmico Globale Output

> **ID Piano**: `PIANO-017`  
> **Macrotask di Riferimento**: `MACRO-015`  
> **Data Creazione**: 2026-08-16  
> **Stato**: `COMPLETATO`  
> **Autore/Agente**: Agente AI

---

## 1. Obiettivo del Piano

Introdurre un solo clock ritmico nell'Output e distribuirne `beatPulse`,
`beatPhase`, `kickEnvelope` e transienti per banda a Brain, Liquid, Oniric,
PsyHyp e 2001. Quantizzare ingresso, uscita e cambio preset sul beat e arrestare
ogni avanzamento geometrico in silenzio.

## 2. Prerequisiti e Contesto

- Moduli: `OutputApp.tsx`, clock ritmico, Brain Controller e quattro morphing.
- Il trasporto IPC e l'analisi audio Control restano invariati.
- Il clock deve proiettare localmente i campioni più recenti senza replay.

## 3. Regole e Vincoli di Sviluppo

- [x] Check Camera: nessuna trasformazione di camera o quadro completo.
- [x] Check Materia: impulso, fase e bande agiscono solo dentro i renderer.
- [x] Check Silenzio: posizione ritmica e geometria congelate senza energia.
- [x] Check Beatmatch: clock unico prima del pacing dei singoli canvas.
- [x] Check Transizione: cambi applicati sul confine ritmico, senza tagli.
- [x] Check Alternanza: la regola 80/20 non cambia.
- [x] Check Costo: un solo RAF leggero; invariati i budget low power.
- [x] Nessuna modifica a DevTools, throttling, permessi o packaging.

## 4. Fasi di Implementazione

### Fase 1: Clock e contratto
- [x] Rendere il clock globale consapevole del silenzio.
- [x] Esporre una sorgente ritmica condivisa a tutti i controller.

### Fase 2: Motori e regia
- [x] Rimuovere il clock privato di Brain.
- [x] Collegare Liquid, Oniric, PsyHyp e 2001 al clock globale.
- [x] Quantizzare ingresso, uscita e cambio preset nell'Output.

### Fase 3: Verifica
- [x] Testare clock, gate ritmico e arresto in silenzio.
- [x] Eseguire test, typecheck, lint mirato, diff-check e build.
- [x] Registrare esito nei file `working/`.

### Fase 4: Correzione fluidità live
- [x] Stabilizzare l'ingresso/uscita dal silenzio con isteresi temporale.
- [x] Eliminare i salti di velocità assoluta nel tempo di Liquid.
- [x] Ripetere test, typecheck, lint e build renderer.

## 5. Validation Plan

- Test automatici del clock: una sola fase, transienti distinti, freeze reale.
- Test del gate: cambio immediato in silenzio e quantizzato con audio attivo.
- `pnpm test`, `pnpm typecheck`, lint mirato, `pnpm build`.
- Verifica live successiva: kick, silenzio, tutti i morphing e story-cycle.

## 6. Registro Avanzamento

- **2026-08-16**: analisi completata; individuati clock privato Brain e tempi
  autonomi nei quattro morphing.
- **2026-08-16**: implementazione e validazione automatica completate. La
  build applicativa e il pacchetto ZIP macOS sono riusciti; il solo target DMG
  del build generale è fallito per `hdiutil`, indipendentemente dal codice.
- **2026-08-16**: prova live ha rilevato movimento a scatti; piano riaperto per
  eliminare il gate audio frame-per-frame e l'accumulo assoluto di Liquid.
- **2026-08-16**: introdotti doppia soglia e hold di 900 ms per distinguere i
  vuoti fra kick dal silenzio; Liquid usa ora delta limitati e incrementali.
  Validazione aggiornata: 45 file / 267 test e build renderer riuscita.
- **2026-08-16**: verifica live dei log: nessun riallineamento di fase nelle
  finestre osservate, ma durante inferenza UNet il RAF raggiunge p95 99,5 ms e
  pause massime 558,4 ms. Nei nuovi renderer Canvas le ampiezze di banda sono
  ancora lette quasi istantaneamente e quantizzate nella firma del frame: il
  clock arriva, ma il gesto locale appare a gradini. Richiesta una correzione
  separata con smoothing musicale per banda e pacing adattivo, senza toccare
  camera o quadro.
- **2026-08-16**: correzione applicata con inviluppi condivisi espressi in
  frazioni di beat per `low`, `lowMid`, `mid`, `high`, attività e kick. Il
  silenzio azzera immediatamente lo stato geometrico; il profilo ambient usa
  tempi più larghi e techno tempi più pronti. La firma Bauhaus non quantizza
  più le ampiezze continue.
- **2026-08-16**: le dissolvenze di ingresso/uscita sono ora aggiornate dal RAF
  Output indipendentemente dai pacchetti audio. Il tempo visivo limita a 50 ms
  il recupero dopo uno stallo, privilegiando continuità rispetto alla durata
  assoluta della transizione.
