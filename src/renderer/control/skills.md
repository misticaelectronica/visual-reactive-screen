# src/renderer/control/skills.md

Skill operative per `src/renderer/control`.

## Skill: Debug Audio Analyzer

Usare quando meter fermi o audio non parte.

Passi:

1. Verificare device selezionato.
2. Provare fallback a device default.
3. Verificare `getUserMedia`.
4. Verificare `AudioContext.resume()`.
5. Verificare `AnalyserNode` e buffer FFT.
6. Controllare `pullFrame()`.

## Skill: Debug Control -> Output

Usare quando output non riceve stati.

Passi:

1. Verificare `window.fxControl`.
2. Verificare che il loop RAF parta.
3. Verificare `api.sendVisualState`.
4. Guardare log main `sendVisualState #`.
5. Guardare log main `broadcast outputWindow=true`.

## Skill: Test Flash

Usare per distinguere audio rotto da output rotto.

Aspettativa:

- deve funzionare senza audio
- deve ignorare cooldown, soglie, `flashMode`, soft mode e low dominance block
- deve produrre output visibile

## Skill: Preset E Dynamic Preset

Quando modificare preset:

- aggiornare `PresetsSelector.tsx`
- controllare `DEFAULT_SETTINGS`
- verificare normalizzazione settings se si aggiungono nuovi id
- assicurare che Match Genere/Colore resti coerente
