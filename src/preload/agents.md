# src/preload/agents.md

Guida per agenti che modificano il preload Electron.

## Responsabilita

`preload.ts` espone API sicure ai renderer con `contextBridge`.

API esposte:

- `window.fxControl` per `control.html`
- `window.fxOutput` per `output.html`

## Regole

- Non abilitare `nodeIntegration` nei renderer per aggirare il preload.
- Non cambiare nomi API senza aggiornare `src/shared/types.ts`.
- Il riconoscimento ruolo si basa sull'URL che contiene `output.html`.
- Tenere i canali IPC allineati con `IPC_CHANNELS`.
- Non esporre `ipcRenderer` grezzo al renderer.

## Checklist

- Control Window deve avere `window.fxControl`.
- Output Window deve avere `window.fxOutput`.
- Se l'output mostra errore IPC, controllare preload path e `isOutputEntry()`.
