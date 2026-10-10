# Luci DMX — Documentazione Tecnica

Modulo che porta i colori di Brain e Morphing sulle luci fisiche via DMX e ne
modula l'intensità a tempo di musica. Origine: brief del Vicario
[`brief-dmx-color-controller-2026-10-10.md`](../team/briefs/brief-dmx-color-controller-2026-10-10.md);
piani [`PIANO-048`](../working/plans/piano-048-dmx-color-controller.md)
(controller) e [`PIANO-049`](../working/plans/piano-049-dmx-producer-brain-morphing.md)
(producer e ritmo). Il beat-sync, escluso dal §19 del brief, è stato aggiunto
su disposizione del Capo Supremo il 2026-10-11.

## 1. Principio

Il controller DMX è un **attuatore cromatico**: riceve
`{ producer, colors, transitionMs }` e lo realizza sulle luci. Non sa cosa
siano Brain o Morphing; Brain e Morphing non sanno nulla di canali,
indirizzi o chipset.

**I producer decidono il colore, la musica decide l'intensità.**

## 2. Architettura

```
Brain (Output Window)                     Morphing (Control Window)
  startProduction(story)                    cambio preset colore
        │ palette storia, 8 s                       │ basePink, hotPink, idle, 4 s
        ▼                                           │
  fx:dmx-producer ──► main ──► fx:dmx-producer-push ┤
                                                    ▼
                               DmxPanel (Control Window, solo con dmxEnabled)
                                 owner: brain | morphing | manual
                                 dmxController ◄── dmxRhythm (OutputRhythmClock,
                                   │                bande del loop Control)
                                   │ universo 512 byte ogni 25 ms
                                   ▼ fx:dmx-send
                               main: dmxSerial (serialport) ──► USB-DMX ──► PAR
```

| File | Ruolo |
|---|---|
| [`src/renderer/control/dmx/dmxEngine.ts`](../src/renderer/control/dmx/dmxEngine.ts) | Motore puro: stato corrente/target, dissolvenza lineare, profili fixture, universo |
| [`src/renderer/control/dmx/dmxController.ts`](../src/renderer/control/dmx/dmxController.ts) | Loop di invio, ownership, blackout, riconnessione, log |
| [`src/renderer/control/dmx/dmxRhythm.ts`](../src/renderer/control/dmx/dmxRhythm.ts) | Ritmo → intensità |
| [`src/renderer/control/dmx/DmxPanel.tsx`](../src/renderer/control/dmx/DmxPanel.tsx) | Pannello manuale, scelta dell'owner, ingressi Brain/Morphing, Emergenza |
| [`src/main/dmxSerial.ts`](../src/main/dmxSerial.ts) | Porta seriale e protocollo Open DMX / USB Pro |

Il modulo è **attivabile da configurazione**: `dmxEnabled` (default spento).
Da spento il codice DMX non viene nemmeno caricato (`lazy()` in
`ControlApp.tsx`) e i comandi dei producer vengono ignorati.

Impostazioni: `dmxEnabled`, `dmxInterface` (`open-dmx` | `usb-pro`),
`dmxFixtureProfiles` (lista di `7ch` | `3ch`, in cascata).

## 3. Chi comanda (ownership)

Un solo owner alla volta:

- `useBrain` attivo → **brain**; altrimenti → **morphing**;
- **Applica** nel pannello → **manual**, finché non si preme **Torna
  automatico**.

I comandi di chi non è owner vengono scartati, non accodati. Quando l'owner
cambia, le luci vanno subito all'ultimo comando ricevuto da lui. Il
**blackout** non richiede ownership. L'alternanza 80/20 (DEP-001) non cambia
l'owner: durante l'interludio morphing resta Brain.

## 4. Ritmo

`intensità = pavimento + (1 − pavimento) × beatPulse`, moltiplicata per il
master del pannello. `beatPulse` viene da una seconda istanza di
`OutputRhythmClock` alimentata con le stesse bande del loop audio della
Control Window. Il beat è letto prima del frame pacing e senza IPC
aggiuntivo.

| `motionProfile` | Pavimento | Picco |
|---|---|---|
| techno | 60% | 100% |
| dub | 75% | 100% |
| ambient | 90% | 100% |

- In silenzio il clock è inattivo, l'impulso è 0 e le luci restano ferme al
  pavimento. Non c'è nessuna pulsazione autonoma.
- La salita è smussata (60 ms). La discesa segue il decadimento del
  `beatPulse` (180 ms).
- Il colore non è mai mosso dal ritmo. `mid` e `high` non pilotano le luci.
- Nessuno strobo. L'intensità non scende mai a zero sul beat.

## 5. Hardware collaudato

- **Interfaccia**: DSD TECH SH-RS09B, chip FTDI FT232R (`0403:6001`), tipo
  **Open DMX**: nessun firmware, il timing lo genera il software.
- **Luce**: PAR LED xkl-A4 (LED Digital Display PAR Light), modalità DMX a 7
  canali:

| Canale | Funzione | Valore inviato |
|---|---|---|
| 1 | master dimmer | intensità × 255 |
| 2 | R | rosso |
| 3 | G | verde |
| 4 | B | blu |
| 5 | vuoto | 0 |
| 6 | funzione (strobo/salti/sfumature/audio) | 0, sempre |
| 7 | velocità funzione | 0, sempre |

Profilo `3ch`: R, G, B, con l'intensità moltiplicata nei colori. Va usato per
PAR sconosciuti, che quasi sempre hanno una modalità RGB a 3 canali.

**Indirizzi in cascata**: consecutivi da 1, il pannello li mostra. Con 4 PAR
a 7 canali: `d001`, `d008`, `d015`, `d022`.

## 6. Impostare il PAR xkl-A4

Il PAR **ignora il DMX finché non è in modalità indirizzo**. Con un
programma interno attivo (`A000`, `P050`, `L050`, `E050`, `Soud`, `r255`…)
non reagisce, anche se il segnale arriva.

1. Premere **A** (Function) finché il display mostra `d` + numero.
2. Con **B** (+) e **C** (−) impostare l'indirizzo (es. `d001`).
3. Premere **D** (Save): il display lampeggia tre volte.
4. Il cavo DMX dall'interfaccia entra nella presa **IN**.

## 7. Open DMX su macOS: il break

Il DMX richiede, prima di ogni frame, un **break**: linea bassa per almeno
88 µs. Fatti verificati sul collaudo del 2026-10-11:

- **Il break via `TIOCSBRK`/`TIOCCBRK`** (usato da Web Serial `setSignals`)
  con il driver FTDI integrato in macOS (`AppleUSBFTDI`) **lascia la linea in
  break**. Il buffer non si svuota più, `tcdrain` resta bloccato, il driver
  si inchioda (processo in stato `U`) e il PAR non riceve mai dati. Per
  sbloccarlo bisogna scollegare l'interfaccia.
- **Funziona invece il break emulato**: un byte `0x00` a **57600 baud**
  (~156 µs di linea bassa), poi i dati a **250000 baud**, 8N2. Circa 30
  frame/s.
- Web Serial non può cambiare baud a porta aperta. Per questo il trasporto
  vive nel main con `serialport`.
- **`serialport` deve essere ≥ 13.** La 12 passa `-1` a `IOSSIOSPEED` in
  `update()` e non torna più a 250000 baud.
- Su macOS si apre `/dev/cu.*`, non `/dev/tty.*`.

`usb-pro` (Enttec DMX USB Pro e compatibili) usa invece il pacchetto
`0x7E 6 … 0xE7`. Il timing lo gestisce il firmware dell'interfaccia. Non è
stato collaudato.

## 8. Packaging

`serialport` è una dipendenza di produzione. electron-builder la include
nel pacchetto e mette il binario N-API in `app.asar.unpacked`. In
`vite.config.ts` è dichiarata `external` nella build del main. Verificato
con `pnpm build` su macOS arm64.

## 9. Troubleshooting

| Sintomo | Causa probabile | Verifica |
|---|---|---|
| «Nessun dongle USB-DMX trovato» | Interfaccia non enumerata: cavo, connettore, adattatore | `ls /dev/cu.usbserial*`, `ioreg -p IOUSB -l -w0 \| grep "USB Product Name"` |
| Connesso, la luce non cambia | PAR non in `d…`, cavo nell'OUT | Display del PAR, sezione 6 |
| Connesso, la luce non cambia, PAR in `d001` | Interfaccia impostata su `usb-pro` | Pannello: `Open DMX (FTDI FT232R generico)` |
| La porta resta occupata, i processi non si chiudono | Driver FTDI inchiodato (break `TIOCSBRK`) | `lsof /dev/cu.usbserial*`; scollegare e ricollegare l'interfaccia |
| «The port is closed» dopo un ricaricamento a caldo | Controller vecchio rimasto vivo con l'HMR | Rilanciare `pnpm dev` |
| Colori sbagliati o luce che lampeggia da sola | Profilo diverso da quello del PAR | Provare `3ch` sul PAR e nel pannello |

Log utili (console della Control Window): `[dmx] connected`, `target colors
received`, `transition completed`, `producer acquired/released`, `blackout`,
`failure: …`. Il main logga `[dmx] serial open <path> (<kind>)`. Non si
logga mai il singolo frame.

## 10. Limiti noti

- La palette di Brain oggi è nell'89% delle storie il ripiego fisso
  `DEFAULT_DREAM_PALETTE`: le luci 1-2 risultano quasi sempre uguali. È
  tracciato come TASK-049-03 e va corretto in Brain, non nel modulo DMX.
- Collaudo dal vivo su dub, techno e ambient ancora da fare (TASK-049-02).
- Fuori perimetro: strobo, chase, sequencer, Art-Net, sACN, moving head,
  colore dalle immagini.
