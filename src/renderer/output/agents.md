# src/renderer/output/agents.md

Guida per agenti che modificano la Output Window.

## Responsabilita

- ricevere `VisualStatePayload` via `window.fxOutput`
- renderizzare base color layer
- creare/distruggere renderer morphing
- gestire crossfade dynamic preset
- mostrare diagnostica minima quando non arrivano stati
- applicare `motionProfile` ai renderer morphing
- rispettare `lowPowerMode` nei canvas

## File

- `OutputApp.tsx`: ricezione IPC, gestione controller morphing, overlay diagnostico
- `visualSurface.ts`: base color layer
- `morphingCanvas.ts`: Liquid Morphing
- `oniricMorphingCanvas.ts`: Oniric Morphing
- `psyHypMorphingCanvas.ts`: PsyHypMorphing
- `main.tsx`: mount React

## Regole

- Non assumere che il primo stato IPC arrivi subito.
- Mostrare un fallback visibile finche' non arrivano stati.
- Ogni renderer morphing deve avere `destroy()` completo.
- Cambio algoritmo deve distruggere il vecchio controller.
- `Use morphing OFF` deve distruggere il controller.
- Non lasciare overlay debug in produzione se non richiesto.
- `motionProfile` deve cambiare comportamento musicale senza cambiare identita' del preset.
- In `lowPowerMode`, ridurre costo render senza rompere cleanup, crossfade o fullscreen.
- PsyHyp deve leggere `morphingPresetId`: i preset non devono restare sempre `default`.

## Movimento Musicale

Profili:

- `dub`: movimento elastico, sub morbido, release piu' flessibile.
- `techno`: pulse visibile ma clampato, niente tremolio su ogni transiente.
- `ambient`: smoothing alto, deformazioni lente, continuita' fluida.

Regola pratica:

- Se il visual sembra scollegato dal ritmo, aumentare aggancio con smoothing e gain controllati.
- Se il visual sembra nervoso, ridurre transienti diretti e usare piu' envelope/release.

## Output Nero

Il nero puo' essere:

- nessun IPC ricevuto
- stato idle molto scuro
- renderer/preload rotto
- finestra dietro altro Space/display

Distinzione:

- `OUTPUT READY - waiting for visual state`: output caricato, IPC assente
- overlay `msgs` cresce: IPC presente
- `Test flash` visibile: output ok, problema audio/stato

## Checklist

- `window.fxOutput` esiste
- `onVisualState` riceve messaggi
- base layer cambia colore
- morphing si crea solo se `useMorphing`
- cleanup avviene su unmount/cambio algoritmo
