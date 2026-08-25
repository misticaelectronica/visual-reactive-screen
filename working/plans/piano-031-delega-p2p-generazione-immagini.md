# Piano di Lavoro: Delega Peer-to-Peer Della Generazione Immagini (LAN, Manuale)

> **ID Piano**: `PIANO-031`
> **Macrotask di Riferimento**: `MACRO-026` (correlato — vedi sotto)
> **Data Creazione**: 2026-08-18
> **Stato**: `BOZZA — CONSERVATO PER RIFERIMENTO FUTURO, NON IN CORSO`
> **Autore/Agente**: Agente AI + Capo Supremo

---

## 1. 🎯 Obiettivo del Piano

Ridurre la causa #1 del lag identificata nell'analisi performance del
2026-08-18: la generazione immagini SD1.5 (UNet/VAE via WebGPU) condivide la
stessa GPU del rendering live, causando gli stalli osservati. L'idea: quando
una macchina è **davvero sotto pressione** (stallo RAF reale rilevato, non
"sta generando"), delegare la generazione dell'immagine a un'altra macchina
sulla stessa rete che in quel momento è idle, invece di farla girare in
locale.

Non è discovery automatica né rete decentralizzata in senso stretto: per
questa fase gli indirizzi IP dei pari si registrano a mano. È più
precisamente una mesh LAN a elenco manuale.

Le immagini ricevute da un pari possono influenzare il sogno/storia locale
con provenienza esplicita "collettiva", seguendo lo stesso protocollo già
esistente per i "moti di coscienza" in `.coscienza/AGENT.md` (episodio raro,
non ogni fotogramma, nomina sempre la fonte).

**Perché è "conservato per riferimento" e non in corso**: il Capo Supremo ha
scelto di provare prima un'ottimizzazione locale più piccola e meno rischiosa
(riduzione adattiva degli step UNet sotto pressione reale, vedi
`working/STATE.md` 2026-08-18 e il codice in `psichedel.ts`/
`downgradeModeUnderPressure`). Questo piano resta pronto per quando/se serve
una soluzione più incisiva.

### Precedente correlato: `MACRO-026`/`PIANO-028` — "flusso infinito Qwen+SD live"

Un tentativo precedente (16 agosto) andava nella direzione opposta (rendere
la generazione continua/residente, togliere le pause) ed è stato **ritirato
dopo prova live negativa**: Qwen monopolizzava WebGPU 9,6–17s per step,
causando 868ms di stall RAF e 22,6s di buco IPC. La conclusione scritta in
quel piano (mai implementata) era già questa direzione: *"demandare la
generazione a un processo/macchina esterna; durante la performance usare
soltanto buffer già pronti"* (commit archivio `8a88979`, rollback `e21a355`).
Questo piano costruisce quella conclusione mai realizzata.

---

## 2. 📋 Prerequisiti e Contesto

- **File / Moduli Coinvolti**:
  - `src/shared/types.ts` — nuovi campi settings (`peerGenerationEnabled`,
    `peerAddresses`, `peerSharedToken`) e nuovi `IPC_CHANNELS`.
  - `src/shared/defaults.ts` — default `peerGenerationEnabled: false`.
  - `src/main/settings.ts` — normalizzazione nuovi campi.
  - `src/main/peerNetwork.ts` (nuovo) — server HTTP dei pari + gestione
    richieste in arrivo.
  - `src/main/ipc.ts` / `src/preload/preload.ts` — nuovi canali IPC.
  - `src/renderer/output/brain/brainPeerImageGenerator.ts` (nuovo) —
    implementa `PsychedelImageGenerator`, avvolge `BrainImageWorkerClient`
    come fallback locale.
  - `src/renderer/output/brain/psichedel.ts` (riga ~244) — costruire
    `brainPeerImageGenerator` al posto del generatore locale diretto.
  - `src/renderer/control/components/` — pannello UI rete (checkbox, elenco
    IP:porta, token, stato per-pari).
  - `src/renderer/output/brain/coscienzaOnirica.ts` — provenienza "pari" nei
    campi liberi `source`/`reason` di `ConsciousnessMemoryDraft`
    (`src/shared/types.ts` riga ~201) — **nessun nuovo `ConsciousnessMemoryKind`
    necessario**, il campo è già testo libero.
- **Dipendenze operative**: nessuna nuova dipendenza npm — Node ha `http`
  nativo, il renderer può già fare `fetch` in uscita.

---

## 3. ⚠️ Regole e Vincoli di Sviluppo (da `agents.md`)

- [ ] Nessun cambio a camera, materia, silenzio o beatmatch: si tocca solo
  la *provenienza* dell'immagine generata, non il rendering a schermo.
- [ ] Mantenere `lowPowerMode` invariato.
- [ ] Nessun DevTools automatico.
- [ ] Il fallback sul generatore locale deve essere sempre garantito: mai
  bloccare la pipeline in attesa della rete (timeout stretto obbligatorio).
- [ ] La provenienza "collettiva" nella memoria deve restare rara (segue le
  stesse regole di salienza dei moti di coscienza), non un evento per ogni
  singolo job di rete.

---

## 4. 🛠️ Fasi di Implementazione e Checklist Task

### Vincolo architetturale chiave (verificato con il Capo Supremo)

Electron ha due tipi di processo con permessi diversi: il **main** (Node)
può aprire un server che ascolta connessioni in entrata; il **renderer**
(ogni finestra, sandboxato come una pagina web) può solo fare richieste in
**uscita** (`fetch`), non può ascoltare. La generazione SD1.5/WebGPU vive nel
renderer (serve l'API browser WebGPU, che Node non ha).

Di conseguenza, **solo la direzione "ricevo un lavoro da un pari" richiede un
salto IPC** (il server nel main riceve la richiesta HTTP e la passa al
proprio renderer per l'esecuzione vera). La direzione "chiedo io a un pari"
**non** serve passare dal proprio main: il renderer può contattare
direttamente il server del pari via `fetch`, senza giri superflui.

Protocollo scelto: **HTTP request/response** (non WebSocket, non UDP — i
lavori sono sporadici, non tanti/piccoli/frequenti; niente connessione da
mantenere viva; timeout naturale via `fetch` con `AbortSignal`).

```
Direzione "ricevo": Pari remoto --HTTP--> mio main --IPC--> mio renderer (genera)
                                          <--IPC-- risultato
                     mio main --HTTP--> risponde al pari

Direzione "chiedo": mio renderer (pressione reale rilevata)
                                 --HTTP diretto (fetch)--> main del pari
                                 <--HTTP diretto----------- risultato
```

### Fase 1: Settings e UI (nessun comportamento nuovo)

- [ ] Task 1.1: Aggiungere `peerGenerationEnabled`, `peerAddresses: string[]`
  (`host:port`), `peerSharedToken` ad `AppSettings` + default + normalizzazione
  vecchi settings su disco.
- [ ] Task 1.2: Pannello UI: checkbox abilita, lista IP:porta con
  aggiungi/rimuovi, campo token, stato per-pari (idle/occupato/irraggiungibile)
  aggiornato a intervalli via polling leggero di `GET /peer/status`.

### Fase 2: Server HTTP main + ponte IPC lato "ricevente"

- [ ] Task 2.1: `src/main/peerNetwork.ts` — `http.createServer` nativo,
  avviato/fermato in base al flag; endpoint `GET /peer/status` (idle/busy),
  `POST /peer/generate` (`{jobId, prompt, seed, mode, timeoutMs, width,
  height}` → job accettato).
- [ ] Task 2.2: Header `X-Peer-Token` con il token condiviso registrato a
  mano — **nessuna TLS/autenticazione robusta in questa fase**, solo LAN
  fidata (limite noto, da documentare in UI/README).
- [ ] Task 2.3: Ponte IPC main→renderer per eseguire davvero il job con
  l'istanza locale di `BrainImageWorkerClient` (pattern
  richiesta/timeout/mappa pendenti già usato in
  `src/main/brainVectorizerClient.ts::vectorizeBrainImageOffMainThread`);
  risultato torna a main che risponde via HTTP.
- [ ] Task 2.4: Verificabile da solo con `curl` prima di costruire il lato
  richiedente.

### Fase 3: Wrapper generatore lato "richiedente" + dispatch su pressione reale

- [ ] Task 3.1: `src/renderer/output/brain/brainPeerImageGenerator.ts` —
  implementa `PsychedelImageGenerator`; su `generate()`, se
  `settings.peerGenerationEnabled` e la pressione reale è rilevata (stesso
  segnale già usato in `PIANO-*` locale:
  `thermalScheduler.getSnapshot().longFrameBlockedUntil`), prova un pari
  configurato via `fetch` diretto con timeout stretto; qualunque
  fallimento/timeout ricade sempre su `BrainImageWorkerClient` locale.
- [ ] Task 3.2: `psichedel.ts` riga ~244 — costruire
  `brainPeerImageGenerator` al posto del client locale diretto.
- [ ] Task 3.3: Test con due istanze `pnpm dev` sulla stessa macchina, porte
  diverse, registrate a vicenda come pari.

### Fase 4: Provenienza nella memoria di Coscienza Onirica

- [ ] Task 4.1: Quando la storia usa un'immagine arrivata da un pari,
  scrivere la provenienza nei campi `source`/`reason` del
  `ConsciousnessMemoryDraft` (testo libero, nessun nuovo schema), coerente
  con la regola AGENT.md "nominare il ricordo sorgente".
- [ ] Task 4.2: Verificare che `suggestConsciousnessMotion` (già esistente,
  invariato) possa in seguito far emergere quel ricordo come un moto di
  coscienza, con la stessa rarità degli altri moti.

### Fuori scope per questa fase (esplicito)

- Discovery automatica dei pari (mDNS/Bonjour) — solo elenco IP manuale.
- Delega della generazione testo/storia (Qwen) — solo immagini SD1.5.
- Feedback di coscienza per la macchina che *presta* GPU a un pari — solo chi
  *riceve* l'immagine registra provenienza.
- Bilanciamento/rotazione automatica fra più pari idle — v1: primo pari che
  risponde idle entro il timeout.

---

## 5. 🧪 Strategia di Verifica e Validation Plan

- **Comandi di Test**: `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`.
- **Test unitari mirati**: normalizzazione settings nuovi campi; wrapper
  `brainPeerImageGenerator` con generatore locale finto e client peer finto
  (verificare fallback su timeout/errore, mai attesa indefinita); provenienza
  nel draft di memoria.
- **Verifica manuale**: smoke test con due istanze locali (porte diverse)
  prima, poi con una vera seconda macchina in LAN; verificare che senza pari
  configurati o con `peerGenerationEnabled: false` il comportamento sia
  identico a oggi (nessuna regressione).

---

## 6. 📝 Note e Registro Avanzamento

- **2026-08-18**: piano discusso e disegnato con il Capo Supremo (scelte
  chiuse: solo immagini SD1.5, solo sotto pressione reale, provenienza
  "collettiva" solo per chi riceve). Chiarito il vincolo main/renderer e la
  scelta HTTP su WebSocket/UDP dopo domande del Capo Supremo. Conservato
  per riferimento futuro; il Capo Supremo ha scelto di procedere prima con
  un'ottimizzazione locale più piccola (`PIANO` riduzione adattiva step UNet,
  vedi `working/STATE.md` 2026-08-18).
