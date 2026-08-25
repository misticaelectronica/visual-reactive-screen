# Piano di Lavoro: Refill Deprioritizzato con “Tutti per storia”

> **ID Piano**: `PIANO-012`  
> **Macrotask di Riferimento**: `MACRO-009`  
> **Data Creazione**: 2026-08-10  
> **Stato**: `IMPLEMENTAZIONE COMPLETATA — TEST LIVE PENDING`  
> **Autore/Agente**: Codex / Capo Supremo

---

## 1. 🎯 Obiettivo

Ridurre i blocchi percepiti evitando di generare prematuramente la storia
successiva quando la modalità Brain “Tutti per storia” prolunga naturalmente
la vita del buffer corrente. Il primo attraversamento dei quattro fotogrammi
deve restare privo di refill; la generazione viene sbloccata all'inizio del
secondo attraversamento, dopo la conclusione del morphing iniziale.

## 2. 📋 Evidenza e Contesto

- Nei log `session-2026-08-10-13-04-30.txt` il passthrough costa 0–0,2 ms, ma
  durante UNet il RAF raggiunge circa 250–458 ms.
- La generazione testuale successiva produce picchi RAF fino a circa 550–787
  ms anche con `inferenceActiveRatio: 0`.
- Il refill corrente parte dopo 30 secondi secondo il contratto precedente,
  indipendentemente dal numero di renderer ancora da attraversare.
- Con tre renderer, un refill avviato dopo il primo attraversamento conserva
  due attraversamenti di margine senza contendere il primo atto della storia.

## 3. ⚠️ Vincoli

- [x] Non modificare UNet, qualità, geometria o numero di immagini.
- [x] Non alterare modalità manuale e rotazione temporizzata.
- [x] Conservare scheduler termico, low power e passthrough.
- [x] Nessuna cancellazione distruttiva di una generazione già iniziata.
- [x] Nessun nuovo timer grafico o movimento autonomo.

## 4. 🛠️ Implementazione

- [x] Aggiungere un gate di refill specifico per `story-cycle`.
- [x] Bloccare il refill per tutto il primo attraversamento.
- [x] Sbloccarlo al secondo attraversamento con guardia di 10 secondi per
  completare il morphing fra renderer.
- [x] Estendere il target della storia successiva da 120 a 240 secondi solo in
  questa modalità, lasciando allo scheduler tempo reale dopo il rinvio.
- [x] Sbloccare immediatamente se l'utente esce da `story-cycle`.
- [x] Aggiungere test puri del contratto di pianificazione.

## 5. 🧪 Validation Plan

- Test unitari del calcolo finestra refill standard/story-cycle.
- Test del gate: primo passaggio bloccato, secondo sbloccato, uscita modalità
  sbloccante.
- Suite completa, typecheck, lint mirato e build Vite/Main/Preload.
- Test live successivo: confrontare tempo senza generazione, RAF max durante
  primo attraversamento e puntualità del buffer prima del quarto finale.

## 6. 📝 Stato

- **2026-08-10**: correlazione confermata sui log; implementazione avviata.
- **2026-08-10**: gate e target esteso implementati. 36 file e 230 test verdi;
  typecheck, lint mirato, build Vite/Main/Preload e diff-check riusciti. Resta
  la prova live per misurare il primo attraversamento privo di generazione.
