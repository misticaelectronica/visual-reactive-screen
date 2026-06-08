# src/shared/skills.md

Skill operative per `src/shared`.

## Skill: Modificare Visual Engine

Usare quando si cambia flash, colore, brightness o safety.

Checklist:

- input e output restano tipizzati
- panic ritorna idle sicuro
- test flash bypassa audio/soglie/cooldown
- cooldown e rate limit restano attivi per flash audio
- low dominance non blocca in modo assoluto `mid/high`
- blink/flash audio restano morbidi: picco limitato, decay curvo, rate conservativo

## Skill: Modificare Bande Audio

Usare quando cambiano range frequenze o FFT.

Checklist:

- mapping bin usa `sampleRate` e `fftSize`
- range non superano Nyquist
- smoothing non nasconde transienti importanti
- preset flash aggiornati se necessario

## Skill: Aggiungere Setting

Passi:

1. Aggiungere campo in `AppSettings`.
2. Aggiungere default in `DEFAULT_SETTINGS`.
3. Normalizzare in `src/main/settings.ts` se puo' essere invalido.
4. Aggiornare UI se controllabile.
5. Aggiornare payload se serve all'output.
6. Aggiornare docs locali/root.

Note:

- `motionProfile` richiede aggiornamenti anche ai tre renderer morphing.
- `lowPowerMode` richiede aggiornamenti a UI Safety e renderer output.

## Skill: Aggiungere Preset Morphing

Checklist:

- id stabile
- nome leggibile UI
- parametri entro budget
- profilo percettivo se usato da Oniric/Liquid
- evitare duplicati o preset indistinguibili
- se il preset deve esistere in PsyHyp, aggiungerlo a `PSY_HYP_MORPHING_PRESETS`
- verificare che UI e rotazione dinamica lo includano

Preset da preservare:

- `alien-contact`
- `solchi-abitudine`
- `materia-malleabile`
- `percorsi-laterali`
- `impronte-lavate`

## Skill: Accordare Motion Profile

Usare quando si calibra la risposta musicale dei renderer.

Checklist:

- `dub`: sub elastico, attacco non nervoso, release flessibile.
- `techno`: pulse forte ma clampato.
- `ambient`: smoothing alto, transienti attenuati.
- aggiornare Liquid, Oniric e PsyHyp insieme.
- non usare `motionProfile` per cambiare i colori o il concept del preset.
