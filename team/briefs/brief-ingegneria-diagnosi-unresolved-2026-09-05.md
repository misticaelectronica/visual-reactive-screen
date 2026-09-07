# Risposta Ingegneria — diagnosi dei tratti `unresolved` (2026-09-05)

Risposta alla richiesta del Consigliere: estrazione dal log dell'ultima sessione live (`session-2026-09-04-23-54-15.txt` nel `userData/log` applicativo, 21:55:01→22:02:20 UTC, 160 cambi di regime), nessuna correzione applicata.

## Tabella dei tratti `unresolved`

| inizio (UTC) | durata | reason | perceptualPressure | pressureTrend | persistence | change |
|---|---|---|---|---|---|---|
| 21:55:01.320 | 0,3 s | bootstrap | 0,0024 | stable | 0,981 | 0,001 |
| 21:55:27.399 | **98,8 s** | bootstrap | 0,1548 | stable | 0,921 | 0,245 |
| 21:57:22.866 | 6,3 s | stasis-level-indeterminate | 0,1935 | stable | 0,976 | 0,084 |
| 21:57:34.186 | 0,1 s | stasis-level-indeterminate | 0,0028 | stable | 0,625 | 0,184 |
| 21:58:11.167 | 3,6 s | stasis-level-indeterminate | 0,0010 | stable | 0,810 | 0,385 |
| 21:58:15.717 | 1,3 s | stasis-level-indeterminate | 0,0010 | stable | 0,877 | 0,451 |
| 21:59:10.163 | 3,6 s | stasis-level-indeterminate | 0,2006 | stable | 0,933 | 0,597 |
| 21:59:59.118 | 4,1 s | stasis-level-indeterminate | 0,1905 | stable | 0,941 | 0,020 |
| 22:00:59.618 | 15,0 s | stasis-level-indeterminate | 0,1983 | stable | 0,989 | 0,046 |
| 22:01:29.685 | 23,1 s | stasis-level-indeterminate | 0,2044 | stable | 0,960 | 0,067 |
| 22:02:04.617 | 1,3 s | stasis-level-indeterminate | 0,0017 | stable | 0,796 | 0,414 |
| 22:02:20.676 | **82,6 s** | stasis-level-indeterminate | 0,1865 | stable | 0,893 | 0,153 |

**Totale `unresolved`: 240,1 s.** Per causa: `bootstrap` 99,1 s (un solo tratto, a inizio sessione), `stasis-level-indeterminate` 141,0 s (11 tratti, distribuiti su tutta la sessione).

## Quale prevale

**`stasis-level-indeterminate`.** Non solo per tempo totale (141,0 s contro 99,1 s), ma soprattutto perché **ricorre**: 11 volte lungo l'intera sessione osservata, incluso un tratto di 82,6 s a 7 minuti dall'avvio — molto dopo che il bootstrap si è concluso. Il bootstrap è per costruzione un evento singolo a inizio sessione; qui è successo una volta sola.

Corrisponde alla segnalazione: nei tratti `stasis-level-indeterminate` più lunghi `persistence` è alta (0,80–0,99, in un caso 0,989) — la configurazione è riconosciuta assestata — ma il livello resta non attribuito. Per costruzione (`classifyLevel`) questo accade quando `|perceptualPressure − mediana| ≤ REFERENCE_PRESSURE_DEADBAND` (0,02) e non c'è un `previous.level` ereditato da attribuire: mancanza di contrasto, non un `reference` che non si promuove.

## Correzione alla stima precedente

Nella diagnosi a voce del giro precedente avevo indicato "due minuti e diciannove secondi" per il tratto di bootstrap iniziale — stima approssimata guardando il log a occhio. Il parsing esatto dei timestamp dà **98,8 s**, non 139 s. Resta comunque ben oltre i 37-45 s documentati come bootstrap tipico, ma non si ripete nel resto della sessione: non è il caso prevalente.

## Dato mancante

Il log di regime porta solo `perceptualPressure`, `pressureTrend`, `persistence`, `change` (i cinque segnali già loggati a ogni cambio). **`pressureMedian` e `referencePressure` non sono nel log**: l'overlay diagnostico 1 Hz (Maiusc+B in `OutputApp.tsx`) non è stato attivato in questa sessione — nessuna riga `registrazione bio-percettiva avviata` nel file. Per avere mediana e reference accanto alla pressione serve riattivarlo nella prossima sessione live.

## Nota a verbale registrata

`TREND_HYSTERESIS` (ingresso+uscita) è stata anticipata dalla fase conclusiva del piano per il comportamento live (cambi da 375 a 38 su un log registrato). I valori di questa e delle prossime sessioni non sono confrontabili con la baseline di calibrazione precedente a quell'anticipo. Registrato in [`working/STATE.md`](../../working/STATE.md).

Nessuna correzione applicata, come richiesto, in attesa del riscontro dell'Audio su quale caso trattare.

Firmato: il Capo Supremo degli Ingegneri.
