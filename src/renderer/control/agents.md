# src/renderer/control/agents.md

Guida per agenti che modificano la Control Window.

## Responsabilita

- UI di controllo live
- selezione display e audio input
- analisi audio Web Audio
- loop `requestAnimationFrame` che produce `VisualStatePayload`
- preset genere/colore e dynamic preset
- safety controls
- profilo movimento musicale (`dub`, `techno`, `ambient`)
- modalita' basso consumo

## File

- `ControlApp.tsx`: stato globale UI, loop audio/visuale, IPC verso output
- `hooks/useAudioAnalyzer.ts`: acquisizione e analisi audio
- `hooks/useDisplays.ts`: lista display
- `hooks/useSettings.ts`: persistenza settings
- `components/*`: controlli UI

## Regole

- Il loop in `ControlApp.tsx` deve continuare a mandare `sendVisualState`.
- `Test flash` deve funzionare anche senza audio.
- `Panic / Off` deve mandare stato sicuro immediato.
- Non cambiare preset o settings senza aggiornare default/normalizzazione se serve.
- Non rendere `softMode` automatico: resta scelta manuale salvo reset/preset.
- Non spostare Web Audio fuori dalla finestra Electron senza ridisegnare permessi e IPC.
- `motionProfile` e' un controllo artistico principale: dub elastico, techno pulsante, ambient fluido.
- `lowPowerMode` deve restare in Safety e non deve cambiare identita' dei preset, solo il costo render.
- Quando si modifica la sensibilita' del visual, verificare sia reattivita' sia nervosismo.

## Diagnosi Output Nero

Se output e' nero ma Control gira:

- controllare log main `sendVisualState`
- controllare colore inviato
- premere `Test flash`
- verificare che `settings.idleColor` non sia l'unico stato inviato

## Checklist

- meter audio si aggiornano
- soglie visibili
- pulsanti output funzionano
- `sendVisualState` chiamato anche senza audio
- background window non blocca il loop
- cambio `Profilo movimento` arriva nell'output tramite `settings`
- modalita' basso consumo viene salvata e ripristinata
