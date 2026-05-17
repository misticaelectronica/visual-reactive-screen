# Origine FX (MVP)

Applicazione desktop **Electron + TypeScript + Vite + React** che analizza l’audio in ingresso (Web Audio API) e comanda una **seconda finestra fullscreen** (tipicamente monitor HDMI o proiettore) mostrando solo un **colore a schermo intero** (rosa / bianco) in sincrono con ritmo ed energia per banda di frequenza.

## Requisiti

- [Node.js](https://nodejs.org/) LTS consigliato  
- [pnpm](https://pnpm.io/)

## Installazione

```bash
pnpm install
```

## Sviluppo

```bash
pnpm dev
```

Si aprono il processo Electron e il server Vite. La finestra **Controllo** carica `control.html`; la finestra **Uscita** carica `output.html` quando la apri dal pannello.

## Build e avvio produzione (locale)

```bash
pnpm build
```

Genera `dist/`, `dist-electron/` e un pacchetto con **electron-builder** (cartella `release/` su macOS).

Per provare senza installer:

```bash
pnpm typecheck && pnpm exec vite build && pnpm start
```

(`pnpm start` esegue `electron .` usando `main` in `package.json`, che punta a `dist-electron/main.js`.)

## Script npm/pnpm

| Script      | Descrizione                          |
|------------|---------------------------------------|
| `pnpm dev` | Sviluppo Vite + Electron              |
| `pnpm build` | `typecheck` + `vite build` + `electron-builder` |
| `pnpm start` | Avvio Electron su artefatti buildati |
| `pnpm typecheck` | Controllo TypeScript senza emit |
| `pnpm lint` | ESLint su `src` |

## Uso rapido

1. Avvia l’app (`pnpm dev`).
2. In **Display di uscita**, scegli il monitor HDMI / proiettore (lista da `screen.getAllDisplays()`).
3. Clic **Apri uscita fullscreen**: si apre una finestra **senza cornice**, fullscreen, solo colore.
4. In **Ingresso audio**, scegli la sorgente (es. loopback, scheda audio, microfono).
5. Clic **Avvia analisi audio** (richiede permesso microfono / audio a Electron).
6. Osserva i **meter** Low / Low-mid / Mid / High e regola **soglie**, **durata flash**, **cooldown**, **max flash/s**, **sensibilità** e colori.
7. **Test flash**: flash bianco manuale. **Panic / Off**: output immediato su colore idle (nero/rosa molto scuro).

Le impostazioni vengono salvate in automatico nella cartella dati utente di Electron (`userData`) in un file JSON.

## Sicurezza (luci intermittenti)

L’app include limiti sensati: **cooldown**, **massimo numero di flash al secondo**, **durata flash breve**, **decay**, **modalità soft** e **Panic**.  
Non sostituiscono il giudizio umano né consulenze mediche: chi è fotosensibile o in dubbio non dovrebbe usare effetti lampeggianti.

## Limitazioni note (MVP)

- **Prestazioni IPC**: lo stato visivo viene inviato ogni frame dalla finestra di controllo al processo principale e poi all’uscita; su macchine molto lente potrebbe essere utile un throttling dedicato (non implementato in questo MVP).
- **Permessi macOS**: microfono / cattura audio possono richiedere consensi di sistema.
- **Etichette dispositivi**: finché il sistema non espone etichette reali, alcuni ingressi possono apparire generici fino al primo `getUserMedia` riuscito.
- **Fullscreen multi-monitor**: dipendono dal compositor del sistema; in caso anomalo usa **Aggiorna display** e riapri l’uscita.
- **Code signing**: il pacchetto macOS non è firmato di default; Gatekeeper può richiedere passaggi manuali per l’apertura.

## Messaggi in terminale (spesso innocui)

- **`Most NODE_OPTIONs are not supported in packaged apps`**: la shell (o Cursor) esporta `NODE_OPTIONS` con flag che Chromium non accetta. Gli script `dev`, `start` e la parte `vite build` di `build` usano `env -u NODE_OPTIONS` (macOS / Linux) per non ereditarlo. Su **Windows** puoi fare `set NODE_OPTIONS=` in `cmd` o usare un terminale senza quella variabile.
- **Errori in DevTools** (`Autofill`, `language-mismatch`, ecc.): rumore noto di Chromium quando i DevTools sono aperti; puoi ignorarli o non aprire i DevTools (di default sono chiusi; per aprirli in dev: `ORIGINE_OPEN_DEVTOOLS=1 pnpm dev`).
- **Main process**: il bundle è **ESM** (`dist-electron/main.js`) con `import` da `electron` (non `require('electron')` nel bundle CJS, che rischierebbe di risolvere il pacchetto npm e restituire solo il path dell’eseguibile). I file statici si risolvono con `app.getAppPath()` + `dist/` / `dist-electron/`.

## Architettura (cartelle principali)

- `src/main/` — processo principale Electron ( finestre, IPC, persistenza ).
- `src/preload/` — bridge `contextBridge` sicuro.
- `src/renderer/control/` — UI di controllo React.
- `src/renderer/output/` — superficie fullscreen senza UI.
- `src/shared/` — tipi, default, matematica audio, bande frequenza, motore visivo puro TypeScript.

## Licenza

MIT (o come preferisci definirla nel tuo repository).
