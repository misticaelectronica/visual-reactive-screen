# src/preload/skills.md

Skill operative per `src/preload`.

## Skill: Debug Bridge Mancante

Usare quando `window.fxControl` o `window.fxOutput` e' undefined.

Passi:

1. Verificare che `preloadPath()` punti a `dist-electron/preload.cjs`.
2. Verificare URL renderer: `control.html` o `output.html`.
3. Verificare `isOutputEntry()`.
4. Verificare che `contextIsolation` sia `true`.
5. Verificare canali in `IPC_CHANNELS`.

## Skill: Aggiungere Canale IPC

Passi:

1. Aggiungere canale in `src/shared/types.ts`.
2. Aggiungere metodo tipizzato in `ControlApi` o `OutputApi`.
3. Implementare nel preload.
4. Implementare handler/listener nel main.
5. Aggiornare renderer interessato.
