# Piano di Lavoro: DMX — Brain e Morphing come producer

> **ID Piano**: `PIANO-049`
> **Macrotask di Riferimento**: `MACRO-037`
> **Data Creazione**: 2026-10-11
> **Stato**: `BOZZA` — piano di alto livello, in attesa delle decisioni aperte (§7)
> **Autore/Agente**: Agente AI / Capo Supremo
> **Branch**: `feature/dmx-color-controller`
> **Brief di origine**: `team/briefs/brief-dmx-color-controller-2026-10-10.md`, §14-16
> **Dipende da**: PIANO-048 (controller DMX, collaudato dal vivo il 2026-10-11)

---

## 1. 🎯 Obiettivo

Brain e Morphing diventano due producer dello stesso controller DMX, senza
che il controller sappia chi sono e senza che loro sappiano nulla di DMX
(brief §3). Entrambi mandano lo stesso comando del pannello manuale:

`setColors(producer, colori, durata)`

**Le luci vanno a tempo di musica** (disposizione del Capo Supremo,
2026-10-11). È una modifica del perimetro del brief del Vicario, che al §19
metteva beat-sync e analisi audio fuori dalla prima versione. Resta
fuori perimetro: strobo, chase, sequencer, estrazione colore dalle immagini,
palette per raster.

Divisione dei ruoli: **Brain/Morphing decidono i colori, la musica decide
l'intensità**. Il brief (§10) separa già la luminosità dal colore proprio
per questo.

---

## 2. 📋 Fatti verificati nel codice

- **Il controller vive nella Control Window**, montato solo con
  `dmxEnabled` (`src/renderer/control/dmx/`). La porta seriale vive nel main
  (`src/main/dmxSerial.ts`).
- **Brain gira nella Output Window.** La palette nominale della storia è
  `DreamStory['palette']`: 5 colori hex (`brainTypes.ts:19`).
- **Esiste già il punto in cui Brain cambia storia**:
  `startProduction` in `brainController.ts`, dove si aggiorna l'indicatore
  palette («al cambio storia, non per fotogramma»). Non serve un meccanismo
  nuovo: basta un secondo uso dello stesso evento.
- **I colori di Morphing nascono nella Control Window**: preset colore
  (`selectedColorPresetId` → `idleColor`, `basePinkColor`, `hotPinkColor`) e
  rotazione dinamica (`dynamicColorRotationEnabled`, in `ControlApp.tsx`).
  Stanno nella stessa finestra del controller, quindi qui non serve IPC.
- **La modalità attiva** è `settings.useBrain`. L'alternanza 80/20 è
  DEP-001.
- **Il ritmo esiste già** come infrastruttura condivisa: `OutputRhythmClock`
  (`brainRhythm.ts`) produce `beatPulse`, `beatPhase`, `kickEnvelope`,
  transienti per banda e `active=false` in silenzio. Oggi è istanziato solo
  nella Output Window (`OutputApp.tsx:588`). L'audio però nasce nella Control
  Window, dove vive il controller DMX: le bande arrivano lì prima che
  altrove.

---

## 3. 🧭 Architettura proposta

```
Brain (Output Window)                Morphing (Control Window)
  startProduction(story)               cambio preset colore
        │ palette (5 hex)                      │ colori del preset
        ▼                                      │
  IPC fx:dmx-producer ──► main ──► Control ────┤
                                               ▼
                         controller DMX: setColors(producer, colori, durata)
                                               ▼
                                  main (dmxSerial) ──► PAR
```

- **Brain**: in `startProduction`, oltre all'indicatore, un solo invio
  `{ producer: 'brain', colors: story.palette, transitionMs }` via preload.
  Il main lo inoltra alla Control Window. Brain non importa nulla da `dmx/`.
- **Morphing**: in `ControlApp`, quando cambia il preset colore attivo
  (manuale o rotazione), un invio `{ producer: 'morphing', colors, transitionMs }`
  allo stesso ingresso del controller. Nessun codice Morphing dentro `dmx/`.
- **Ownership** (brief §16), con l'`acquire`/`release` già presente: il
  producer è scelto dalla modalità attiva. Con `useBrain` possiede Brain,
  altrimenti Morphing. Il pannello manuale resta un producer: quando
  l'utente preme Applica prende lui il controllo, finché non lo rilascia
  (pulsante «Torna automatico»). Gli altri comandi vengono scartati, non
  accodati.
- **Ritmo → intensità**: nella Control Window una seconda istanza dello
  stesso `OutputRhythmClock`, alimentata con le stesse bande che il loop
  audio già calcola, prima del frame pacing e senza IPC aggiuntivo. A ogni
  frame il controller riceve un'intensità:
  `intensità = base + profondità × impulso` (impulso da `beatPulse`/kick).
  Nessun nuovo rilevatore di beat: riuso dell'infrastruttura esistente.
- **Blackout**: resta indipendente dall'owner (già così).
- **Se `dmxEnabled` è spento**, i messaggi dei producer vengono ignorati e
  Brain/Morphing non se ne accorgono (brief §17).

---

## 4. ✅ Verifica dei vincoli

- **Protocollo visivo**: le luci non toccano camera, raster o renderer.
  *Silenzio*: senza audio il clock è `active=false`, l'impulso è 0 e le
  luci restano ferme all'intensità base, senza alcuna pulsazione autonoma.
  *Transizione*: ogni cambio di colore è una dissolvenza lineare dal colore
  raggiunto, mai un taglio. *Beatmatch*: l'impulso modula solo l'intensità,
  `beatPhase` non muove niente da solo, `mid` e `high` non pilotano le luci.
  *Nervosismo*: profondità e rilascio cambiano con `motionProfile` (dub
  elastico, techno più marcato ma limitato, ambient quasi fermo).
- **Interpretazione, non principio stabilito**: in `filosofia.md` §2 la
  palette appartiene alla storia intera, come «qualità luminosa» che resta
  mentre i 4 fotogrammi si trasformano. Una luce che cambia solo al cambio
  storia, con dissolvenza lenta, è coerente con questa lettura. Spetta alla
  Direzione VJ confermarla.
- **Sicurezza fotosensibile**: nessuno strobo. L'intensità non scende mai
  a zero sul beat (pavimento, non lampeggio) e la frequenza resta quella del
  beat, sotto i 3 Hz alle velocità techno. Il rilascio è curvo, non a
  gradino. I flash del motore visivo (`whiteFlashColor`, `Test flash`)
  **non** vanno alle luci. `lowPowerMode` non riguarda le luci: il costo è
  un calcolo per frame.
- **Divieto di sovrastrutturazione**: nessun nuovo evento in Brain, nessuna
  coda di comandi, nessun arbitraggio a priorità. Un owner alla volta.
- **Audit `working/DEPRECATED.md`**:
  - `DEP-001 — NON COINVOLTO`: durante l'interludio morphing dell'80/20 il
    producer resta Brain (`useBrain` non cambia) e le luci mantengono la
    palette della storia. Non si estende l'alternanza alle luci.

---

## 5. 🛠️ Fasi

### Fase 1 — Ingresso producer nel controller
- [ ] Canale IPC `fx:dmx-producer` (Output → main → Control) e un unico
      punto d'ingresso nel pannello DMX che chiama `setColors(producer, …)`.
- [ ] Owner automatico secondo `useBrain`; il manuale prende il controllo
      con Applica e lo rilascia con «Torna automatico».
- [ ] Indicazione nel pannello: owner corrente e ultimo comando ricevuto.

### Fase 2 — Brain
- [ ] Invio della palette in `startProduction`, accanto all'indicatore.
- [ ] Test: un invio per storia, mai per fotogramma, e nessun import da `dmx/`.

### Fase 3 — Morphing
- [ ] Invio dei colori del preset al cambio di preset (manuale e rotazione).
- [ ] Test: i colori dei flash non partono mai verso il DMX.

### Fase 4 — Ritmo
- [ ] Clock ritmico condiviso istanziato nel modulo DMX della Control
      Window, alimentato dalle bande già calcolate.
- [ ] Intensità per frame = base + profondità × impulso, profondità e
      rilascio da `motionProfile`; pavimento minimo.
- [ ] Test: in silenzio l'intensità è costante; con kick regolare pulsa al
      beat; mai sotto il pavimento.

### Fase 5 — Verifica
- [ ] `pnpm typecheck`, test, `pnpm build`.
- [ ] Collaudo dal vivo su dub, techno e ambient: le luci respirano col
      kick senza diventare nervose, e in silenzio stanno ferme.
- [ ] Collaudo dal vivo: storia Brain → le luci sfumano alla palette;
      passaggio a Morphing → passano ai colori del preset; Applica manuale
      → il manuale vince finché non torna automatico; blackout sempre attivo.

---

## 6. 🧪 Validation Plan

- Brain in esecuzione con `dmxEnabled` spento: nessun cambiamento e nessun
  errore.
- Dongle scollegato durante una storia: Brain continua, il pannello mostra
  «non connesso» e si riconnette da solo.

---

## 7. ❓ Decisioni aperte (Capo Supremo / Direzione VJ)

1. **5 colori della palette, N luci.** Proposta: luce *i* = colore
   *i mod 5*, cioè con 4 PAR i primi quattro. In alternativa si salta lo
   sfondo, o si ruota.
2. **Durata della dissolvenza Brain.** Proposta: fissa, 8 s come
   nell'esempio del brief. In alternativa si lega alla durata del primo
   fotogramma.
3. **Quali colori di Morphing.** Proposta: `basePinkColor`, `hotPinkColor`,
   `idleColor`, ripetuti sulle luci. Esclusi i colori dei flash.
4. **`Emergenza / Spegni` → blackout DMX?** Proposta: sì, il pulsante di
   emergenza spegne anche le luci, e `Riprendi` le riaccende.
5. **Profondità del ritmo.** Proposta: base 60%, picco 100% sul kick in
   techno; 75→100% in dub; 90→100% in ambient. Da tarare dal vivo.
6. **Tutte le luci insieme o fasi diverse?** Proposta: tutte sul kick
   (`low`) nella prima versione. In alternativa, metà delle luci sul kick e
   metà su `lowMid`, per dare profondità senza un chase.
7. **Il ritmo muove anche il colore?** Proposta: no. Il colore cambia solo
   quando Brain/Morphing mandano una nuova palette; la musica muove solo
   l'intensità.

---

## 8. 📝 Registro

- **2026-10-11**: piano di alto livello creato dopo il collaudo del
  controller.
- **2026-10-11**: aggiunto il ritmo su disposizione del Capo Supremo («le
  luci devono andare a tempo di musica»): fuori dal §19 del brief originale.
