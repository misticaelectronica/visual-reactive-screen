# Piano di Lavoro: DMX Color Controller — attuatore cromatico autonomo

> **ID Piano**: `PIANO-048`
> **Macrotask di Riferimento**: `MACRO-037`
> **Data Creazione**: 2026-10-10
> **Stato**: `IN_PROGRESS` — implementato, collaudo hardware pendente
> **Autore/Agente**: Agente AI / Capo Supremo
> **Branch**: `feature/dmx-color-controller` (aperto da `feature/animatronix-v1-grammatiche` @ `1.0.0-rc.9`)
> **Brief di origine**: `team/briefs/brief-dmx-color-controller-2026-10-10.md` (Vicario → Capo Supremo degli Ingegneri)

---

## 1. 🎯 Obiettivo del Piano

Realizzare un controller DMX di alto livello, indipendente da Brain e da
Morphing, che riceve uno stato cromatico (colori per fixture logica, durata
della transizione, intensità master) e lo realizza fisicamente sulle luci.

Criterio di riuscita (brief §20): *«porta queste quattro luci a questi
quattro colori in 8 secondi»*, eseguito dall'interfaccia manuale senza che il
chiamante conosca canali, indirizzi o chipset. Lo stesso comando dovrà poi
arrivare da Brain e Morphing senza cambiare il motore.

Questo piano copre **solo il controller e l'interfaccia manuale**.
L'integrazione di Brain (§14) e Morphing (§15) è fuori da questo piano: va
pianificata dopo il collaudo hardware.

---

## 2. 📋 Prerequisiti e Contesto

- **Audit preventivo `working/DEPRECATED.md`**:
  - `DEP-001 — NON COINVOLTO`: l'alternanza Brain/Morphing non tocca il
    controller DMX; il controller non conosce i producer per nome.
- **Fatti verificati**:
  - nessuna dipendenza seriale presente oggi in `package.json`;
  - il main process ha già `ipc.ts`, `settings.ts`, `sessionLogger.ts`
    riusabili per canali, configurazione e log.
- **Decisioni aperte (servono al Capo Supremo prima della Fase 2)**:
  1. **Modello del dongle USB-DMX.** Determina il driver:
     - *Enttec DMX USB Pro* (o compatibili «Pro»): protocollo a pacchetti su
       seriale, timing DMX gestito dal dongle — il caso più semplice;
     - *Open DMX / FTDI generico*: il break DMX va generato dal software,
       timing più fragile;
     - altro (es. uDMX, DMXking): da verificare.
  2. **Profilo canali dei PAR** (dal manuale): numero di canali, ordine
     (es. `dimmer, R, G, B, W, strobo, macro, velocità`), valore neutro per
     strobo/macro/programmi automatici, indirizzi DMX dei quattro PAR.
  3. **Meccanismo di trasporto seriale** — proposta, non decisione:
     controller nel **main process** con la libreria `serialport` (modulo
     nativo: richiede rebuild per Electron e `asarUnpack` in
     electron-builder). Alternativa senza dipendenze native: Web Serial di
     Chromium in un renderer, che però lega il controller a una finestra e
     contraddice l'autonomia richiesta da §1 e §17.

---

## 3. ⚠️ Regole e Vincoli di Sviluppo (da `agents.md`)

- [ ] Nessuna modifica a `backgroundThrottling`, switch Chromium, permessi
      microfono macOS, `lowPowerMode`, DevTools.
- [ ] **Confine architetturale (brief §3)**: nessun file di Brain o Morphing
      importa moduli `dmx/`; il controller non importa nulla da `brain/` o
      dai renderer morphing.
- [ ] **Divieto di sovrastrutturazione**: prima versione con transizione
      lineare RGB, un solo owner, nessun easing, nessuna coda di comandi.
- [ ] **Check Silenzio, applicato alle luci**: il controller non genera
      animazioni autonome. Fra un comando e l'altro mantiene lo stato
      raggiunto; si muove solo durante una transizione comandata.
- [ ] **Sicurezza percettiva**: strobo, macro e programmi automatici dei PAR
      restano sempre al valore neutro (§7). Nessuno strobo in questa versione.
- [ ] Il controller resta inattivo finché non viene chiesto `connect()`:
      nessuna apertura di porte all'avvio dell'app.

---

## 4. 🛠️ Fasi di Implementazione e Checklist Task

### Fase 1: Analisi e Preparazione
- [x] TASK-048-01: brief archiviato in `team/briefs/`, branch aperto, piano
      creato, audit deprecati.
- [ ] TASK-048-02: raccogliere dal Capo Supremo modello del dongle e profilo
      canali dei PAR (decisioni aperte 1-2).
- [ ] TASK-048-03: decisione sul trasporto seriale (decisione aperta 3).

### Fase 2: Motore puro (senza hardware)
Proposta di struttura in `src/main/dmx/`, da confermare:
- [ ] TASK-048-04: `dmxFixtureProfile.ts` — profilo dichiarativo (RGB/RGBW,
      offset canali, valori neutri) e traduzione colore + intensità → byte.
      RGBW nella prima versione: W = 0 salvo decisione diversa.
- [ ] TASK-048-05: `dmxColorEngine.ts` — `currentState`, `targetState`,
      `transitionStart`, `transitionDuration`; interpolazione lineare;
      un nuovo comando a metà dissolvenza riparte dal colore effettivamente
      raggiunto (§5). Funzione pura `sample(now)` → universo da 512 byte.
- [ ] TASK-048-06: test unitari: interpolazione, interruzione a metà fade
      senza salti, master intensity separata dal colore, blackout, canali
      neutri, numero di fixture variabile.

### Fase 3: Driver, controller e failure isolation
- [ ] TASK-048-07: driver del dongle scelto, dietro un'interfaccia minima
      (`open`, `writeUniverse`, `close`) per poter sostituire l'hardware.
- [ ] TASK-048-08: `dmxController.ts` — API `connect`, `disconnect`,
      `acquire`/`release`, `setColors`, `setMasterIntensity`, `blackout`,
      `getStatus`; invio continuo dell'universo a frequenza fissa; blackout
      ammesso a prescindere dall'owner (§12); errori catturati, stato
      aggiornato, riconnessione, notifica al producer (§17).
- [ ] TASK-048-09: log degli eventi di §18 tramite il logger esistente,
      mai per frame.
- [ ] TASK-048-10: configurazione delle fixture caricata da file
      (percorso e formato da decidere con il Capo Supremo).

### Fase 4: IPC e interfaccia manuale
- [ ] TASK-048-11: canali `fx:dmx-*` in `src/shared/types.ts`, handler in
      `ipc.ts`, esposizione in `preload.ts` solo per la Control Window.
- [ ] TASK-048-12: pannello tecnico minimo (§13): connessione, colore per
      fixture, intensità, durata fade, applica, blackout, stato connessione.
      Non una console luci.

### Fase 5: Verifica
- [ ] TASK-048-13: `pnpm typecheck`, test, `pnpm build`.
- [ ] TASK-048-14: collaudo hardware con i quattro PAR, a cura del Capo
      Supremo: 4 colori in 8 s, nuovo comando a metà fade, blackout,
      scollegamento del dongle durante la trasmissione.

---

## 5. 🧪 Strategia di Verifica e Validation Plan

- **Comandi**: `pnpm typecheck`, test unitari del motore, `pnpm build`
  (modifiche a main/preload/packaging).
- **Verifica manuale**:
  - app avviata senza dongle: nessun errore, Brain e output invariati;
  - connessione, 4 colori in 8 s, dissolvenza continua;
  - nuovo comando a metà dissolvenza: nessun salto visibile;
  - blackout immediato e controllato;
  - dongle scollegato durante la trasmissione: stato «disconnesso»,
    l'output video continua, riconnessione al reinserimento.

---

## 6. 📝 Note e Registro Avanzamento

- **2026-10-10**: creazione del piano, archiviazione del brief del Vicario,
  apertura del branch. Nessun codice scritto: in attesa delle decisioni
  aperte 1-3.
- **2026-10-10 (sera)**: implementazione su disposizione del Capo Supremo
  («modulare, attivabile da configurazione», niente sovraingegnerizzazione).
  Decisioni prese:
  - PAR xkl-A4 (manuale fotografato): profilo `7ch` = 1 master, 2 R, 3 G,
    4 B, 5 vuoto, 6 funzione, 7 velocità; 6-7 sempre a 0. Per i PAR futuri
    sconosciuti c'è il profilo `3ch` RGB, scelto per fixture dal pannello.
  - Fixture in cascata con indirizzi consecutivi da 1 (7ch → 1, 8, 15, 22):
    l'indirizzo va impostato sul display del PAR (`d001`, `d008`, ...).
  - Trasporto: **Web Serial** nella Control Window, non `serialport`: il
    pacchetto non include `node_modules`, un modulo nativo avrebbe chiesto
    di cambiare il packaging. Dongle: `usb-pro` (Enttec e compatibili) o
    `open-dmx` (FTDI, break via `setSignals`), scelta nel pannello; modello
    del dongle ancora da verificare dal vivo.
  - Attivazione: impostazione `dmxEnabled` (default spento); il modulo
    `src/renderer/control/dmx/` è caricato con `lazy()` solo se attivo.
  - Ownership minima `acquire`/`release`; blackout senza ownership.
  Typecheck verde, suite 787 test verdi. `pnpm build` e collaudo pendenti.
