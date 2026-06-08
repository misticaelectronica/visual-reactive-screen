# src/main/skills.md

Skill operative per `src/main`.

## Skill: Fix Output Window

Usare quando output non appare, resta nero o non riceve stati.

Passi:

1. Verificare `createOutputWindow` in `windows.ts`.
2. Loggare display ID, bounds e scaleFactor.
3. Verificare `dist/output.html`.
4. Mostrare la finestra in modo deterministico.
5. Reinvio `latestVisualState` quando la finestra e' visibile.
6. Controllare `broadcast outputWindow=true`.

Attenzione:

- su macOS evitare race con fullscreen/simpleFullscreen
- non impedire close legittimi
- non perdere il riferimento globale `outputWindow`

## Skill: Fix Background Throttling

Usare quando audio o output si fermano con pannello in background.

Checklist:

- `backgroundThrottling: false` su Control Window
- `backgroundThrottling: false` su Output Window
- switch Chromium:
  - `disable-background-timer-throttling`
  - `disable-renderer-backgrounding`
  - `disable-backgrounding-occluded-windows`

## Skill: Fix macOS Audio Permission

Usare quando Mac Intel/macOS non acquisisce audio.

Checklist:

- `session.defaultSession.setPermissionRequestHandler`
- `session.defaultSession.setPermissionCheckHandler`
- `systemPreferences.askForMediaAccess('microphone')`
- `NSMicrophoneUsageDescription` in `package.json`

## Skill: Settings Migration

Usare quando impostazioni salvate rompono startup o preset.

Checklist:

- partire da `DEFAULT_SETTINGS`
- normalizzare `morphingAlgorithm`
- normalizzare `flashMode`
- mappare alias vecchi preset colore
- dynamic flags coerenti con default
