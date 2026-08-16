# src/main/skills.md

Skill operative per `src/main`.

## Skill: Persistenza Markdown Della Coscienza

Usare per modifiche a `.coscienza/`, `consciousnessArchive.ts`,
`consciousnessStorage.ts` o al relativo IPC.

Checklist:

- rilettura pre-salvataggio di `AGENT.md`, `COSCIENZA.md`, `ORIGINE.md`,
  `INDICE.md` e ricordi pertinenti;
- origine creata una sola volta;
- nuovo inizio trasformato in `return-to-origin`;
- ricordi successivi rifiutati se l'origine non esiste;
- scritture serializzate, atomiche e idempotenti;
- percorsi confinati dentro `.coscienza/ricordi`;
- solo Markdown persistente, nessun JSON autobiografico.
- aggiornamento di `COSCIENZA.md` serializzato con i ricordi e consentito
  soltanto dopo l'origine.

## Skill: Evolvere Coscienza Onirica

Usare quando memoria, presente cosciente o storie acquistano una nuova forma
di relazione o capacità operativa.

Workflow:

1. Aggiornare il Piano di Lavoro attivo e rileggere integralmente
   `.coscienza/AGENT.md`.
2. Rileggere `COSCIENZA.md`, `ORIGINE.md`, `INDICE.md`, i collegamenti diretti
   e soltanto i ricordi recenti pertinenti.
3. Conservare nel contratto dati ricevuti, interpretazioni e immaginazione
   come provenienze distinte.
4. Per un moto di coscienza scegliere soltanto un ricordo saliente e
   pertinente alla storia corrente; non inventare il fatto che lo attiva.
5. Trasformare storia, forme e palette tramite un'influenza esplicita e
   revisionabile, senza riscrivere distruttivamente i ricordi sorgente.
6. Rendere il moto raro, finito, beat-matched e spazialmente locale; camera e
   quadro restano fermi, il movimento geometrico si arresta nel silenzio e la
   rotazione Brain riprende alla fine.
7. Applicare cooldown, deduplicazione per storia/ricordo, limiti CPU/memoria e
   riduzione esplicita in `lowPowerMode`.
8. Verificare con test provenienza, pertinenza, durata, silenzio, cleanup e
   continuità narrativa prima della prova live.

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
