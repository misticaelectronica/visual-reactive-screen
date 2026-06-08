# src/renderer/output/skills.md

Skill operative per `src/renderer/output`.

## Skill: Debug Output Nero

Passi:

1. Verificare overlay `fxOutput`.
2. Verificare `msgs`.
3. Verificare ultimo colore.
4. Premere `Test flash`.
5. Se `msgs` resta 0, controllare preload/IPC.
6. Se `msgs` cresce ma colore e' scuro, controllare visual engine/settings.

## Skill: Gestione Morphing Controller

Passi:

1. Calcolare chiave algoritmo/preset.
2. Se algoritmo cambia, distruggere controller vecchio.
3. Se `useMorphing` false, distruggere tutto.
4. Se dynamic preset attivo, crossfade tra controller.
5. Aggiornare sempre `__settings` e `__key`.

## Skill: Performance Canvas

Controlli:

- RAF cancellato in `destroy()`
- resize listener rimosso
- canvas rimosso dal DOM
- DPR limitato
- blur e trail sotto controllo
- PsyHypMorphing non supera budget senza test reale
- `lowPowerMode` riduce FPS/layer o qualita' senza cambiare preset

## Skill: Accordare Movimento Musicale

Usare quando il visual e' troppo nervoso, troppo lento o poco musicale.

Controlli:

- `settings.motionProfile` arriva a Liquid, Oniric e PsyHyp.
- `dub` usa envelope elastici e sub morbido.
- `techno` usa pulse clampato e non deve inseguire ogni micro-transiente.
- `ambient` usa smoothing alto e movimenti continui.
- evitare gain diretti troppo alti su `kickPulse`, `beatDrive`, `highTension`, `bodyTwist`.
- preferire envelope/release e limiti sul raggio/opacita' rispetto a scatti frame-by-frame.

## Skill: Preset Morphing

Regole:

- Liquid/Oniric leggono `MORPHING_PRESETS` e `MORPHING_THEME_PROFILES`.
- PsyHyp legge `PSY_HYP_MORPHING_PRESETS`.
- `alien-contact` deve restare disponibile in tutti e tre gli algoritmi.
- I preset materici `solchi-abitudine`, `materia-malleabile`, `percorsi-laterali`, `impronte-lavate` devono restare in UI e rotazione.
- Il cambio preset PsyHyp deve fare transizione morbida e non reset visivo secco.

## Skill: Fallback Visivo

Usare quando debugging output/proiezione.

Regole:

- fallback deve essere visibile ma non confondersi con visual live
- rimuovere o nascondere overlay se non richiesto in build finale
- base surface iniziale non deve essere nero assoluto durante diagnostica
