# src/main/agents.md

Guida per agenti che modificano il processo main Electron.

## Responsabilita

- lifecycle app Electron
- permessi media/microfono
- creazione Control Window e Output Window
- display discovery
- IPC main handlers
- persistenza settings su disco

## File

- `main.ts`: lifecycle app, permessi, switch Chromium
- `windows.ts`: finestre Control/Output, fullscreen/output, replay ultimo stato visuale
- `ipc.ts`: canali IPC main
- `displays.ts`: lista display via Electron `screen`
- `settings.ts`: load/save e normalizzazione settings

## Regole

- Non aprire DevTools automaticamente in `pnpm start`.
- Non rimuovere i permessi `media` e la richiesta microfono macOS.
- Non rimuovere gli switch anti-background throttling in `main.ts`.
- Non rendere Mac Intel/x64 parte del build normale.
- Non bloccare `close` della Output Window salvo ragione molto chiara: puo' lasciare finestre orfane.
- Non usare fullscreen macOS se una finestra frameless grande quanto il display e' sufficiente e piu' stabile.

## Output Window

La Output Window deve essere robusta anche su display esterni:

- creare la finestra sulle bounds del display selezionato
- usare `backgroundColor` visibile durante boot
- chiamare `setBounds(target.bounds)` quando la finestra viene resa visibile
- su macOS preferire frameless + bounds, evitando transizioni Space quando possibile
- inviare `latestVisualState` appena l'output e' visibile
- inoltrare log renderer output se serve diagnosi

## Background Audio

La Control Window contiene il loop audio/visuale. Per evitare throttling quando va in background:

- `backgroundThrottling: false` nelle `webPreferences`
- switch Chromium impostati prima di `app.whenReady()`

## Checklist

- `pnpm typecheck`
- se main/preload cambia: `pnpm build`
- `pnpm start` non deve aprire DevTools
- `openOutput` deve ritornare `{ ok: true }` solo dopo creazione finestra riuscita
- log utili: `createOutputWindow`, `target display`, `broadcast outputWindow=true`
