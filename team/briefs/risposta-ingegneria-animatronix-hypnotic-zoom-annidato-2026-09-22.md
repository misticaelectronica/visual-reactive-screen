# Risposta Ingegneria — ANIMATRONIX / HYPNOTIC ZOOM ANNIDATO

> **Destinatari:** Capo Supremo; Capo Supremo dei Designer/Visual VJ di Brain; Vicario
> **Data:** 22 settembre 2026
> **Stato:** implementata a minimo intervento dietro flag; collaudo visivo da fare

## CHE COSA ESISTE

Ogni 8 storie generate (contatore di sessione, mai casualizzato):
`story.nestedZoomStory = true`, `story.denoisingStepsOverride = 22`. Alla
chiusura di quella storia, ANIMATRONIX forza i primi due segmenti a
HYPNOTIC ZOOM con bersaglio il dettaglio significativo del rispettivo
raster sorgente (A → zoom in A1 → B, B → zoom in B1 → C); il quarto
segmento (C → ECO/uscita) resta quello scelto dal planner ordinario, non
forzato.

## SCELTA DI IMPLEMENTAZIONE PIÙ RILEVANTE

Il brief chiedeva al Visual Plan di produrre due relazioni esplicite A1/B1,
ma vietava anche un secondo sistema narrativo. **Non ho toccato la
generazione narrativa** (`coscienzaOnirica.ts`): A1 e B1 sono il campo
`anchor` che `AnimatronixStructure` già calcola per ogni raster (la stessa
euristica usata da KINETIC MATCH e VERTIGO LOCK per trovare "una struttura
locale saliente e compatta" — volto, ruota, apertura). Il dettaglio target
di A è il suo stesso `anchor`; quello di B è il suo. Zero analisi nuova,
riuso di infrastruttura già in produzione.

Di conseguenza il piano non è costruito da zero: `applyNestedZoomTargets`
(`brainAnimatronix.ts`) prende il piano che il planner ordinario avrebbe
comunque prodotto e forza i primi due segmenti con `withForcedGrammars`
(la stessa utility già usata dai test per i collaudi mirati) più un nuovo
campo `zoomTarget: 'anchor'` sul segmento. Nessuna logica di piano
duplicata.

## MECCANISMO VISIVO

HYPNOTIC ZOOM (introdotto stamattina nel brief precedente) zoomava sempre
verso il punto di fuga del raster. Nuovo uniform shader `uZoomUsesAnchor`:
quando attivo, lo zoom converge verso `anchor` invece che verso il punto di
fuga — l'effetto percettivo cercato dal brief ("zoom nel dettaglio →
perdita della distinzione fra dettaglio e quadro → emersione della nuova
immagine") è lo stesso zoom continuo e irreversibile di HYPNOTIC ZOOM, solo
puntato su un bersaglio diverso, più la stessa dissolvenza `dissolve` senza
foro/iride già introdotta.

## GENERAZIONE

`DreamStory.denoisingStepsOverride` (nuovo campo opzionale) sostituisce lo
step count derivato da `ImageRenderMode` in tutti e tre gli implementatori
di `PsychedelImageGenerator`. Il percorso realmente in produzione è
`BrainImageWorkerClient` (worker ONNX); l'ho verificato esplicitamente,
non solo la classe `Explicit*` che sembrava la più ovvia a prima vista.
Il percorso legacy `LocalPsychedelImageGenerator` (web-txt2img) non ha un
concetto di step: ignora il parametro, nessuna regressione possibile lì.

## FAILURE

Se i raster sono meno di tre, o se il punteggio di leggibilità
dell'`anchor` su A o su B è sotto soglia (0.15 — stessa scala di
VIABILITY per KINETIC MATCH), `applyNestedZoomTargets` lascia il piano
ordinario invariato e riporta `fallbackReason`: nessuna sequenza annidata
incompleta va mai in scena.

## LOG

`brainLog('animatronix', 'fase ANIMATRONIX avviata', ...)` include, solo
per le storie speciali: `nestedZoomStory`, `storyOrdinal`, `denoisingSteps`,
`targetA`, `targetB`, `transitionAtoB`, `transitionBtoC`, `fallbackReason`.
Log dedicato anche al momento della generazione della storia speciale.

## LIMITI ONESTI

- **Nessun collaudo visivo dal vivo.** Solo suite automatica (751 test, +3
  su `applyNestedZoomTargets`), typecheck e lint verdi. Non verificato se
  `anchor` individua davvero un dettaglio abbastanza leggibile e centrato
  da reggere l'illusione "sto entrando in un altro livello dell'immagine"
  — è un'euristica tarata a occhio su una decina di raster, non su un
  corpus, come tutte le altre di ANIMATRONIX.
- **`anchor` non garantisce coerenza semantica fra A1 e la struttura di B.**
  Il brief chiede che B "contenga" davvero A1; qui non c'è verifica che il
  dettaglio rilevato su A abbia una relazione visiva con B oltre alla
  posizione sullo schermo — la continuità è affidata interamente al
  crossfade, non a una corrispondenza di contenuto.
- **22 step non è stato collaudato per tempo di generazione.** Rispetto
  allo step count ordinario più alto in uso (`qualitySteps`, 24 di
  default) è comparabile, ma non ho misurato l'impatto reale sul tempo di
  produzione della storia speciale sul computer di palco.
- Frequenza fissa a 8: nessuna verifica di come si comporta se una storia
  fallisce e viene rigenerata — l'ordinale conta i tentativi riusciti,
  quindi un fallimento non salta un multiplo di 8, ma non è stato
  osservato dal vivo.

## DA DECIDERE

1. Se il proxy `anchor` per A1/B1 è accettabile per un primo collaudo dal
   vivo o se la Direzione Designer/Visual VJ vuole un rilevatore dedicato
   (probabilmente serve comunque un secondo giro dopo aver visto il primo
   risultato).
2. Se 22 step è il punto giusto costo/qualità o va ritarato dopo aver
   visto il tempo di generazione reale.
