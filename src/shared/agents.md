# src/shared/agents.md

Guida per agenti che modificano la logica condivisa.

## Responsabilita

- tipi e canali IPC
- default settings
- visual engine puro
- audio math e frequency bands
- preset morphing e profili percettivi

## File

- `types.ts`: tipi, IPC channels, contratti renderer/main
- `defaults.ts`: default app
- `visualEngine.ts`: colore, flash, brightness, stato visuale
- `audioMath.ts`: calcolo e smoothing bande
- `frequencyBands.ts`: mapping frequenze/bin FFT
- `morphingPresets.ts`: preset Liquid/Oniric
- `morphingThemeProfiles.ts`: profili percettivi
- `psyHypMorphingShapes.ts`: forme e preset PsyHyp

## Regole

- `visualEngine.ts` deve restare puro e testabile.
- Cambi a `types.ts` richiedono aggiornamento main/preload/renderer.
- Cambi a default devono considerare settings salvati e normalizzazione.
- Non cambiare range/frequenze senza valutare effetto su preset flash.
- Non rendere `idleColor` troppo scuro durante debugging senza un fallback visivo altrove.

## Checklist

- tipi coerenti in tutto il progetto
- default compatibili con `settings.ts`
- `Test flash` resta indipendente da audio
- `Panic` forza stato sicuro
- `flashMode: off` disattiva flash audio ma non test flash
