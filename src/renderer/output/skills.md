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

## Skill: Fallback Visivo

Usare quando debugging output/proiezione.

Regole:

- fallback deve essere visibile ma non confondersi con visual live
- rimuovere o nascondere overlay se non richiesto in build finale
- base surface iniziale non deve essere nero assoluto durante diagnostica
