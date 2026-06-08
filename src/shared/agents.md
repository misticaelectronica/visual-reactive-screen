# src/shared/agents.md

Guida per agenti che modificano la logica condivisa.

## Responsabilita

- tipi e canali IPC
- default settings
- visual engine puro
- audio math e frequency bands
- preset morphing e profili percettivi
- profili movimento musicali
- opzioni safety/performance condivise

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
- `motionProfile` deve restare coerente tra tipi, default, UI e renderer.
- `lowPowerMode` deve essere compatibile con settings salvati vecchi.
- Flash/blink devono restare piu' morbidi possibile: evitare picchi pieni frequenti.
- I preset condivisi Liquid/Oniric e PsyHyp devono restare allineati quando un concept deve esistere in tutti gli algoritmi.

## Preset E Profili Recenti

- `alien-contact`: concept forte e riconoscibile di contatto, con due poli e ponte di segnali; presente in Liquid/Oniric/PsyHyp.
- `solchi-abitudine`: superficie incisa e ripetuta.
- `materia-malleabile`: materia intermedia, elastica e vulnerabile.
- `percorsi-laterali`: connessioni sottili tra zone distanti.
- `impronte-lavate`: tracce residue e memoria attenuata.

## Motion Profile

Valori validi:

- `dub`: default elastico e flessibile.
- `techno`: pulsante ma controllato.
- `ambient`: molto fluido, smoothing alto.

Quando si aggiunge un profilo o si cambia il comportamento:

- aggiornare `types.ts`
- aggiornare `defaults.ts`
- aggiornare UI control
- aggiornare Liquid, Oniric e PsyHyp
- verificare `pnpm typecheck`

## Checklist

- tipi coerenti in tutto il progetto
- default compatibili con `settings.ts`
- `Test flash` resta indipendente da audio
- `Panic` forza stato sicuro
- `flashMode: off` disattiva flash audio ma non test flash
- preset nuovi hanno id stabili e sono inclusi nella rotazione prevista
