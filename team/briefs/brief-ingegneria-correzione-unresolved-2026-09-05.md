# Risposta Ingegneria — correzione `unresolved` per mancanza di contrasto (2026-09-05)

Eseguito l'ordine del Consigliere. Modifica minima applicata in [`brainBioPerception.ts`](../../src/renderer/output/brain/brainBioPerception.ts) (`advanceBioRegime`).

## La correzione

Un solo argomento cambiato. Prima, al fronte di atterraggio (`pressureJustLanded`):

```ts
classifyLevel(signals.perceptualPressure, median, null)
```

Ora:

```ts
classifyLevel(signals.perceptualPressure, median, previous.level)
```

`classifyLevel` in zona neutra (nessun contrasto con la mediana) restituisce il terzo argomento invariato. Passare `null` azzerava sempre il livello ereditato in quella zona, anche con memoria valida; passare `previous.level` lo mantiene finché non emerge nuova evidenza (contrasto reale sopra/sotto la mediana), esattamente come richiesto. Nessun meccanismo, segnale, timer o soglia nuovi — il livello precedente era già in `previous.level`.

## Perché produceva i tratti lunghi osservati

Fuori dal fronte di atterraggio, `settledLevel = previous.level` (il livello si limita a propagarsi tick per tick). Con `null` scritto una volta al fronte, quello zero si ripropagava identico per tutta la stasi piatta successiva — da qui gli 82,6s/23,1s/15s del log di ieri, non un problema di conferma temporale ma di un singolo valore azzerato che restava "sticky".

## `unresolved` resta possibile

Solo quando non esiste alcun `previous.level` da ereditare (avvio sessione, bootstrap — `gatedLevel` resta `null` finché `everPromoted` è falso). Aggiunto un test dedicato a questo caso, oltre a riscrivere il test che verificava il vecchio comportamento (revoca del livello).

## Validazione

64 file / 609 test, typecheck e lint puliti.

## Bootstrap

Non toccato in questo giro, come da disposizione: resta secondo bersaglio (98,8s osservati contro 37-45s attesi).

## Prossimo collaudo

Overlay 1 Hz (Maiusc+B) da accendere prima di iniziare: senza quello `pressureMedian` e `referencePressure` restano fuori dal log, come già segnalato.

Firmato: il Capo Supremo degli Ingegneri.
