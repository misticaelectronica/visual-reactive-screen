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

Fuori perimetro, come da brief §19: beat-sync, audio, strobo, estrazione
colore dalle immagini, palette per raster.

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
- **Blackout**: resta indipendente dall'owner (già così).
- **Se `dmxEnabled` è spento**, i messaggi dei producer vengono ignorati e
  Brain/Morphing non se ne accorgono (brief §17).

---

## 4. ✅ Verifica dei vincoli

- **Protocollo visivo**: le luci non toccano camera, raster o renderer.
  *Silenzio*: le luci restano ferme fra un comando e l'altro, nessuna
  oscillazione autonoma. *Transizione*: ogni cambio è una dissolvenza
  lineare dal colore raggiunto, mai un taglio. *Beatmatch*: non coinvolto,
  il beat-sync è fuori perimetro.
- **Interpretazione, non principio stabilito**: in `filosofia.md` §2 la
  palette appartiene alla storia intera, come «qualità luminosa» che resta
  mentre i 4 fotogrammi si trasformano. Una luce che cambia solo al cambio
  storia, con dissolvenza lenta, è coerente con questa lettura. Spetta alla
  Direzione VJ confermarla.
- **Sicurezza**: nessuno strobo. I flash del motore visivo (`whiteFlashColor`,
  `Test flash`) **non** vanno alle luci.
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

### Fase 4 — Verifica
- [ ] `pnpm typecheck`, test, `pnpm build`.
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
5. **Intensità**: costante a 100% in questa fase (brief §10)? Proposta: sì.

---

## 8. 📝 Registro

- **2026-10-11**: piano di alto livello creato dopo il collaudo del
  controller.
