# Replay `spectralOccupancy` continua — 2026-09-25

Replay sui 15 file di `docs/campioni/` con il modulo di produzione reale e
lo stesso decode FFT di `scripts/calibration/compare-audio-regimes.mjs`.
I valori sono medie sul contenuto reale dopo il warm-up sintetico.

## Modifica sottoposta a prova

Il floor spettrale esistente resta invariato. Ogni banda non contribuisce più
tutto-o-niente: contribuisce con `peso * clamp(valore / floor)`. Non sono
stati aggiunti pesi, floor, bande, detector o soglie di regime. `classifyLevel`
è invariata.

## Gate certificabili

La sola mappa conservata nel repository è C03=`respiro-alto-0`,
C04=`respiro-profondo`, C06=`respiro-alto-1`. C05/C08/C09 non sono associati
a file in nessun registro: non sono certificabili e non vengono congetturati.

| Caso | PP | Spectral | Rhythm | Anchor | Grounded low-end | Persistence | Constraint experimental |
|---|---:|---:|---:|---:|---:|---:|---:|
| C03 / respiro-alto-0 | 0.4956 | 0.9725 | 0.0108 | 0.0114 | 0.0098 | 0.9337 | 0.3710 |
| C04 / respiro-profondo | 0.5188 | 0.8799 | 0.0502 | 0.0547 | 0.0429 | 0.8637 | 0.1045 |
| C06 / respiro-alto-1 | 0.5510 | 0.9944 | 0.0237 | 0.0250 | 0.0215 | 0.9253 | 0.2523 |
| test-1 | 0.5751 | 0.9912 | 0.0621 | 0.0683 | 0.0522 | 0.8822 | 0.2915 |

Esito PP: C06>C04 passa; C03>C04 fallisce. La componente ritmica baseline
non domina semanticamente: su C03 resta sotto C04 e il suo contributo reale
alla pressione è minimo. Anchor e low-end qualificato conservano la stessa
inversione. La persistenza semplice ordina C03/C06 sopra C04, ma resta alta
anche su `test-1`: promuoverla da sola riprodurrebbe il falso assestamento.

La relazione temporale utile esiste già nel clock experimental
(`recurrence × cyclePersistence`): ordina C03/C06 sopra C04, ma anche il suo
constraint resta alto su `test-1` (0.2915). `OutputRhythmClock` non espone un
segnale persistente equivalente: conserva intervalli privati e proietta beat,
percorso già smentito dai due campioni alti. Riutilizzare la memoria
experimental nella pressione richiederebbe promuovere un osservatore
stateful condiviso e risolvere prima il falso positivo `test-1`; non è una
correzione minima autorizzata da questi dati.

Esito applicativo del criterio stabilito dall'Audio: **PROPOSTA RITIRATA**.
Il gate C03>C04 è bloccante; la continuità spettrale non resta nel runtime. Nessuna modifica ad
anchor, grounded low-end, persistenza, pesi o classificazione. Il report e i
risultati restano come esperimento negativo, non come baseline attiva.

## File nominali — evidenza di non regressione

| File | PP | Spectral | Rhythm | Constraint experimental |
|---|---:|---:|---:|---:|
| decompresisone-1.mp3 | 0.5199 | 0.8314 | 0.0698 | 0.4089 |
| decompresisone-2.mp3 | 0.5621 | 1.0000 | 0.0270 | 0.1763 |
| decompresisone.mp3 | 0.5725 | 0.9943 | 0.0466 | 0.3444 |
| pressurizzazione-2.mp3 | 0.5129 | 0.9586 | 0.0272 | 0.1651 |
| pressurizzazione.mp3 | 0.5958 | 0.9706 | 0.1283 | 0.3612 |
| pressurizzazione1.mp3 | 0.5635 | 0.9027 | 0.0975 | 0.4296 |
| respiro-alto-0.mp3 | 0.4956 | 0.9725 | 0.0108 | 0.3710 |
| respiro-alto-1.mp3 | 0.5510 | 0.9944 | 0.0237 | 0.2523 |
| respiro-alto-2.mp3 | 0.5112 | 0.9758 | 0.0192 | 0.3588 |
| respiro-alto-3.mp3 | 0.5256 | 0.9420 | 0.0212 | 0.3283 |
| respiro-alto-4.mp3 | 0.5737 | 0.9633 | 0.0351 | 0.3813 |
| respiro-profondo-1.mp3 | 0.4844 | 0.8579 | 0.0301 | 0.0801 |
| respiro-profondo.mp3 | 0.5188 | 0.8799 | 0.0502 | 0.1045 |
| respirto-profondo-3.mp3 | 0.3751 | 0.7895 | 0.0071 | 0.0629 |
| test-1.mp3 | 0.5751 | 0.9912 | 0.0621 | 0.2915 |

Regressione experimental: tutti i cinque `respiro-alto-*` restano dominanti
nel proprio stato (quote sul tempo risolto: 0.755, 0.781, 0.808, 0.539,
0.699), senza `respiro-profondo`; sui campioni 3 e 4 resta vietata anche
`decompression`.

Validazione dell'esperimento prima del ritiro: 79 file / 762 test, typecheck e
lint verdi. Dopo il ripristino: 56 test bio-percettivi mirati, typecheck, lint
e diff-check verdi.
