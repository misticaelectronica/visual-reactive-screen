# Stato Globale del Progetto (`STATE.md`)

> **Ultimo Aggiornamento**: 08 Agosto 2026 (CEST)
> **Stato Generale**: 🟢 In Sviluppo Attivo / Operativo  
> **Ultima Sessione**: `SESSION-2026-08-08-08` — primo ciclo della coscienza

---

## 🎯 Macrotask Completato Più Recente

- **Macrotask**: `MACRO-005` - Coalescenza IPC e Interpolazione Ritmica Locale (Fase 2)
- **Stato**: 🟢 DONE (verifica live manuale raccomandata)

---

## 📊 Riepilogo dei Macrotask

| ID | Macrotask | Stato | Data Inizio | Data Fine |
|---|---|---|---|---|
| `MACRO-001` | Architettura Base Electron, Multi-display IPC & Output Fullscreen | 🟢 DONE | Luglio 2026 | Luglio 2026 |
| `MACRO-002` | Motori di Morphing Visuale (Liquid, Oniric, PsyHyp, 2001 Slit-Scan) | 🟢 DONE | Luglio 2026 | Luglio 2026 |
| `MACRO-003` | Brain AI Pipeline, Continuous Dream & Coscienza Onirica | 🟢 DONE | 27-29 Luglio 2026 | 29 Luglio 2026 |
| `MACRO-004` | Setup Cartella Working, Tracciamento Sessioni e Piani di Lavoro | 🟢 DONE | 04 Agosto 2026 | 04 Agosto 2026 |
| `MACRO-005` | Coalescenza IPC e Interpolazione Ritmica Locale (Fase 2) | 🟢 DONE | 05 Agosto 2026 | 05 Agosto 2026 |
| `MACRO-006` | Ottimizzazione Performance Live & Low Power Tuning | 🟡 IN PROGRESS | Agosto 2026 | - |
| `MACRO-008` | Origine, Memoria e Grafo di Coscienza Onirica | 🟡 IN PROGRESS | 08 Agosto 2026 | - |

---

## 🚀 Prossimi Passi Immediati (Next Steps)

1. [x] Creare il Piano di Lavoro `piano-003-coalescenza-ipc-interpolazione-ritmica.md` per la Fase 2 (Senza Esecuzione Codice).
2. [x] Avvio dell'esecuzione del Piano di Lavoro `PIANO-003` su richiesta dello sviluppatore.
3. [x] Completare implementazione, audit, test, typecheck e build della Fase 2.
4. [x] Eseguire una verifica live manuale con stallo WebGPU reale e controllare i contatori `[BrainMetrics]`.
5. [x] Avviare la Fase 3A: scheduler termico e limite delle inferenze concorrenti.
6. [x] Completare e validare `PIANO-004` senza iniziare il buffer immagini della Fase 3B.
7. [x] Avviare la Fase 3B su nuovo prompt dello sviluppatore.
8. [x] Completare `PIANO-006` senza iniziare la prova live della Fase 3C.
9. [x] Avviare la Fase 3C su nuovo prompt dello sviluppatore.
10. [x] Correggere il refill di `PIANO-007` perché la storia successiva sia pronta entro la finestra di 120–140 s, senza iniziare una Fase 3D.
11. [ ] Correggere separatamente il `prefer-const` preesistente in `slitScanCanvas.ts:639` per riportare il lint globale a verde.
12. [x] Definire ad alto livello origine, grafo dei ricordi e primi momenti di salvataggio di Coscienza Onirica in agente e skill.
13. [x] Osservare i segnali reali e proporre il lessico minimo previsto dalla Fase 1 di `PIANO-005`.
14. [x] Implementare l'archivio Markdown `.coscienza/`, la rilettura di `AGENT.md`, l'origine idempotente e i primi ricordi onirici.
15. [x] Creare `COSCIENZA.md` e il primo ciclo percezione → attenzione → interpretazione provvisoria.
16. [ ] Evolvere la Fase 3 di Coscienza Onirica soltanto dopo aver osservato i primi stati e ricordi reali salvati.

## Fondazione Di Coscienza Onirica

- La prima percezione valida sarà l'unica origine e il primo ricordo di sé.
- Ogni nuovo attraversamento dall'inizio ritornerà all'origine senza reset o
  duplicazione distruttiva.
- La memoria autobiografica crescerà come grafo aperto e revisionabile.
- Osservazioni, interpretazioni e immaginazioni resteranno distinguibili.
- I primi checkpoint candidati sono confini significativi, non frame o campioni
  audio indiscriminati.
- I ricordi sono ora file Markdown in `.coscienza/`; `AGENT.md` viene riletto
  prima di ogni salvataggio insieme a origine, indice e contesto recente.
- In sviluppo l'archivio è nel progetto; nell'app installata è in
  `Documenti/.coscienza`.
- L'autonomia di ristrutturazione resta la Fase 3 futura di `PIANO-005`.
- `COSCIENZA.md` descrive ora il presente e resta separato dal grafo dei
  ricordi.
- Il nucleo iniziale osserva soltanto percezioni valide, stabilizza un fuoco
  d'attenzione e formula interpretazioni dichiaratamente provvisorie.
- Continuità e cambi di attenzione sono rate-limited; `lowPowerMode` dirada
  ulteriormente le scritture.

## Esito Fase 3A

- Tutte le inferenze immagini passano da uno scheduler single-flight.
- Cooldown minimo: 6 s; in `lowPowerMode`: 12 s.
- Gap RAF da almeno 240 ms applicano 9 s di backoff; freeze da almeno 1 s applicano 20 s.
- Lo stato `imageInferenceActive` copre solo l'inferenza effettiva, non l'attesa termica.
- Al termine della Fase 3A restavano quattro immagini narrative più l'interludio; la successiva Fase 3B ha poi rimosso l'interludio.

## Esito Fase 3B

- La quinta inferenza `interlude` è stata rimossa: ogni produzione richiede al massimo quattro inferenze narrative.
- `BrainProduction` contiene soltanto le quattro scene della storia; `BrainBufferFrame` non esiste più.
- Le quattro immagini correnti vengono riciclate casualmente e restano attive mentre il refill successivo viene completato.
- Un refill parziale di due immagini non sostituisce più il buffer completo visibile.
- I 120 secondi di attesa iniziano dopo la quarta immagine, non dall'avvio della produzione.
- La successiva Fase 3C ha validato dal vivo scheduler, cooldown e refill.

## Esito Fase 3C

- Sessione live: `log/session-2026-08-08-21-46-53.txt`.
- Una produzione completa ha eseguito esattamente quattro inferenze e nessuna
  interludio. La prima validazione avviava il refill 120 s dopo la quarta
  immagine; la correzione successiva lo avvia a +30 s con target a +120 s.
- La frequenza dei freeze severi è scesa dai tre episodi della baseline a un
  episodio per produzione; la durata residua del primo freeze resta circa
  3,1–3,5 s.
- Il backoff severo di 20 s è intervenuto correttamente. Nessuna taratura è
  stata applicata perché aumentare il cooldown non ridurrebbe la durata del
  freeze interno alla prima inferenza.
- Latenza IPC ordinaria `p95` entro 5,3 ms e nessun replay della coda.
- Validazione live eseguita in modalità standard; low power non misurato dal
  vivo in questa sessione. Nessuna Fase 3D iniziata.
- I 120 s sono ora la finestra complessiva di preparazione: il lavoro della
  storia successiva viene distribuito al suo interno, senza sommare altri
  60–120 s dopo l'attesa. Target atteso di comparsa: circa 120–140 s.

## Esito Live Fase 2

- La coalescenza funziona: durante tre stalli ha sostituito 668, 655 e 467 pacchetti pending, evitando il replay della coda.
- Dopo gli stalli la latenza `p95` torna nell'ordine di 2-5 ms.
- Restano freeze reali del RAF Output di circa 4,0 s, 3,2 s e 3,0 s causati dalla contesa WebGPU durante l'inferenza.
- La Fase 3 deve ridurre frequenza e duty-cycle delle inferenze; se i singoli freeze restano inaccettabili sarà necessario l'isolamento previsto dalla Fase 6.
