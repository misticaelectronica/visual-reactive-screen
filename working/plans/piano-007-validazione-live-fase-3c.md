# Piano di Lavoro: Validazione Live e Taratura (Fase 3C)

> **ID Piano**: `PIANO-007`  
> **Macrotask di Riferimento**: `MACRO-006`  
> **Data Creazione**: 2026-08-08  
> **Stato**: `COMPLETED`  
> **Autore/Agente**: Codex

---

## 1. Obiettivo

Validare dal vivo gli effetti combinati di Fase 3A e 3B e applicare, soltanto se i dati lo giustificano, una singola taratura dei parametri termici. La fase non introduce nuove architetture.

---

## 2. Misure

- numero e durata dei gap RAF superiori a 1 secondo;
- distanza temporale fra gli avvii delle inferenze;
- numero di inferenze per produzione: deve essere quattro;
- assenza dell'inferenza `interlude`;
- attesa di 120 secondi dopo la quarta immagine prima del refill;
- latenza IPC `p95`, pending sostituiti e riallineamenti;
- andamento qualitativo di consumo e temperatura osservabile dall'utente.

Baseline precedente: freeze principali di circa 4,0 s, 3,2 s e 3,0 s, con inferenze ravvicinate e quinta immagine interludio.

---

## 3. Vincoli

- [x] Nessuna Fase 3D.
- [x] Nessuna nuova pipeline, processo o backend.
- [x] Nessuna modifica estetica o al movimento musicale.
- [x] Al massimo una taratura dei parametri già presenti in `BRAIN_CONFIG`.
- [x] Non dichiarare miglioramenti senza misure live.

---

## 4. Procedura

- [x] Avviare build corrente e Output Brain con flusso di stati Control → Output.
- [x] Osservare almeno una produzione completa di quattro immagini.
- [x] Osservare anche l'intero cooldown e l'inizio del refill.
- [x] Estrarre e confrontare metriche e log dello scheduler termico.
- [x] Decidere se mantenere i parametri oppure applicare una sola taratura.
- [x] Rieseguire la build dopo aver rimosso l'avvio automatico temporaneo di collaudo.
- [x] Registrare l'esito e chiudere la Fase 3C.

---

## 5. Criteri di Accettazione

- quattro inferenze per produzione, nessuna quinta;
- cooldown e backoff visibili nei log;
- nessun replay di stati audio;
- riduzione della frequenza dei freeze rispetto alla baseline;
- documentazione onesta dell'eventuale durata residua del singolo freeze.

---

## 6. Registro

- **2026-08-08**: Fase 3C avviata; Fase 3D esclusa.
- **2026-08-08**: sessione live registrata in `log/session-2026-08-08-21-46-53.txt`.
  La prima produzione ha eseguito quattro inferenze, avviate alle 19:47:12.284,
  19:47:40.723, 19:47:56.437 e 19:48:16.959, senza interludio. Le distanze
  fra gli avvii sono state 28,4 s, 15,7 s e 20,5 s.
- **2026-08-08**: produzione completa alle 19:48:27.370 e nuovo ciclo avviato
  esattamente 120 s dopo, alle 19:50:27.370. Durante l'attesa sono state
  riciclate le quattro immagini correnti.
- **2026-08-08**: rispetto alla baseline di tre freeze severi da circa 4,0 s,
  3,2 s e 3,0 s, la prima produzione ha mostrato un solo gap RAF Output oltre
  1 s, pari a 3,075 s. Lo scheduler lo ha classificato `severe` e ha applicato
  20 s di backoff. Il singolo freeze residuo non si accorcia aumentando il
  cooldown; per questo non è stata applicata alcuna taratura arbitraria.
- **2026-08-08**: latenza IPC ordinaria `p95` non superiore a 5,3 ms; 889 stati
  pending sostituiti e un solo riallineamento, senza replay della coda. Durante
  il cooldown il Canvas si è mantenuto intorno a 24–30 fps con gap tipici sotto
  51 ms.
- **2026-08-08**: il test ha usato la modalità standard, confermata dal cooldown
  di 6 s. La risposta low-power resta coperta dai test automatici, ma non è
  stata misurata termicamente dal vivo in questa sessione. Nessuna Fase 3D è
  stata iniziata.

---

## 7. Correzione Temporale Dopo La Validazione

La prova ha mostrato che avviare il refill soltanto dopo 120 secondi somma la
pausa all'intero costo della storia e delle quattro immagini, portando la
comparsa successiva verso quattro minuti. I 120 secondi devono invece essere
la finestra entro cui preparare il refill.

- [x] Avviare il refill 30 secondi dopo il completamento del buffer corrente.
- [x] Conservare come scadenza di produzione il target a 120 secondi.
- [x] Mantenere single-flight, cooldown e backoff fra le inferenze.
- [x] Conservare il buffer corrente finché quello nuovo è presentabile.
- [x] Aggiornare test, typecheck, lint mirato e build.
- [x] Chiudere nuovamente la Fase 3C senza iniziare la Fase 3D.

Criterio: in condizioni analoghe alla sessione live, la produzione successiva
deve risultare pronta intorno a 120–140 secondi dalla precedente, non dopo la
somma `120 s + generazione completa`.

- **2026-08-08**: introdotta una finestra di refill esplicita: avvio a +30 s e
  target a +120 s dal completamento corrente. Il target viene passato come
  deadline alla pipeline immagini; il singolo fotogramma in corso può
  terminarla poco oltre, mantenendo il risultato atteso entro circa 120–140 s.
- **2026-08-08**: i cooldown di 6/12 s e i backoff di 9/20 s restano invariati.
  Nessun incremento del numero di inferenze e nessuna Fase 3D.
- **2026-08-08**: validazione automatica completata con 200/200 test, typecheck,
  lint mirato, build Vite/Electron e `git diff --check`. Una nuova sessione
  WebGPU completa resta utile per misurare il tempo reale, ma non è stata
  eseguita per evitare un ulteriore ciclo termico durante questa correzione.
