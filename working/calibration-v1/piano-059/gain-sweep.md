# Gain sweep delle feature experimental — PIANO-059 Fase 2

Generato da `scripts/calibration/gain-sweep-features.mjs` su 19 campioni, livelli -18, -12, -6, 0, 6, 12 dB. Dati completi in `gain-sweep.json`.

## Livelli esclusi e riferimenti

Picco per canale della sorgente; il motore riceve il downmix ½(L+R), come in produzione.

| Campione | picco a 0 dB | livelli con clipping (esclusi) | riferimento | guadagno lineare |
|---|---:|---|---:|---|
| `decompresisone-1.mp3` | -0.1 dBFS | 6, 12 | 0 dB | sì |
| `decompresisone-2.mp3` | -0.1 dBFS | 6, 12 | 0 dB | sì |
| `decompresisone.mp3` | -0.1 dBFS | 6, 12 | 0 dB | sì |
| `decompressione-5.mp3` | -0.1 dBFS | 6, 12 | 0 dB | sì |
| `decompressione-7.mp3` | -0.1 dBFS | 6, 12 | 0 dB | sì |
| `decompressione-8.mp3` | -0.1 dBFS | 6, 12 | 0 dB | sì |
| `decompressione-9.mp3` | -0.1 dBFS | 6, 12 | 0 dB | sì |
| `pressurizzazione-2.mp3` | -0.1 dBFS | 6, 12 | 0 dB | sì |
| `pressurizzazione.mp3` | -0.1 dBFS | 6, 12 | 0 dB | sì |
| `pressurizzazione1.mp3` | -0.1 dBFS | 6, 12 | 0 dB | sì |
| `respiro-alto-0.mp3` | -0.1 dBFS | 6, 12 | 0 dB | sì |
| `respiro-alto-1.mp3` | -0.1 dBFS | 6, 12 | 0 dB | sì |
| `respiro-alto-2.mp3` | -0.1 dBFS | 6, 12 | 0 dB | sì |
| `respiro-alto-3.mp3` | -0.1 dBFS | 6, 12 | 0 dB | sì |
| `respiro-alto-4.mp3` | -0.1 dBFS | 6, 12 | 0 dB | sì |
| `respiro-profondo-1.mp3` | -0.1 dBFS | 6, 12 | 0 dB | sì |
| `respiro-profondo.mp3` | -0.1 dBFS | 6, 12 | 0 dB | sì |
| `respirto-profondo-3.mp3` | -0.1 dBFS | 6, 12 | 0 dB | sì |
| `test-1.mp3` | -0.1 dBFS | 6, 12 | 0 dB | sì |

Le tabelle seguenti raggruppano per **scarto dal riferimento** (non per livello assoluto), così un file con riferimento a −6 dB entra nella colonna giusta. `n` = campioni che contribuiscono.

## `recurrence`

| scarto | n | Δ media (mediana) | Δ relativa (mediana / peggiore) | r traiettoria (mediana / minimo) | inversioni del verso a 6 s (mediana / peggiore) |
|---:|---:|---:|---|---|---|
| -18 dB | 19 | -0.006 | -1 % / 17 % (`respirto-profondo-3.mp3`) | 0.94 / 0.29 (`respiro-alto-4.mp3`) | 0 % / 20 % (`decompressione-5.mp3`) |
| -12 dB | 19 | -0.000 | -0 % / 12 % (`respirto-profondo-3.mp3`) | 0.99 / 0.37 (`pressurizzazione.mp3`) | 0 % / 9 % (`respiro-profondo-1.mp3`) |
| -6 dB | 19 | 0.000 | 0 % / -11 % (`respiro-profondo.mp3`) | 1.00 / 0.85 (`decompresisone-1.mp3`) | 0 % / 4 % (`respiro-profondo.mp3`) |

## `cyclePersistence`

| scarto | n | Δ media (mediana) | Δ relativa (mediana / peggiore) | r traiettoria (mediana / minimo) | inversioni del verso a 6 s (mediana / peggiore) |
|---:|---:|---:|---|---|---|
| -18 dB | 19 | -0.033 | -4 % / -9 % (`decompressione-5.mp3`) | 0.96 / 0.22 (`decompressione-5.mp3`) | 0 % / 27 % (`pressurizzazione-2.mp3`) |
| -12 dB | 19 | -0.019 | -2 % / -5 % (`pressurizzazione-2.mp3`) | 0.99 / 0.80 (`decompresisone-1.mp3`) | 0 % / 13 % (`respiro-profondo-1.mp3`) |
| -6 dB | 19 | -0.009 | -1 % / -3 % (`respiro-profondo.mp3`) | 1.00 / 0.81 (`respiro-profondo.mp3`) | 0 % / 0 % |

## `physicalConfirmation`

| scarto | n | Δ media (mediana) | Δ relativa (mediana / peggiore) | r traiettoria (mediana / minimo) | inversioni del verso a 6 s (mediana / peggiore) |
|---:|---:|---:|---|---|---|
| -18 dB | 19 | -0.000 | -0 % / 14 % (`respiro-profondo-1.mp3`) | 0.99 / 0.32 (`pressurizzazione.mp3`) | 0 % / 13 % (`respiro-alto-4.mp3`) |
| -12 dB | 19 | -0.000 | -0 % / -14 % (`decompressione-9.mp3`) | 0.99 / 0.32 (`pressurizzazione.mp3`) | 0 % / 12 % (`respiro-profondo.mp3`) |
| -6 dB | 19 | -0.001 | -0 % / -12 % (`decompressione-9.mp3`) | 1.00 / 0.67 (`respiro-profondo.mp3`) | 0 % / 10 % (`respiro-profondo.mp3`) |

## `eventActivity`

| scarto | n | Δ media (mediana) | Δ relativa (mediana / peggiore) | r traiettoria (mediana / minimo) | inversioni del verso a 6 s (mediana / peggiore) |
|---:|---:|---:|---|---|---|
| -18 dB | 19 | -0.048 | -7 % / -42 % (`decompresisone-1.mp3`) | 0.96 / -0.03 (`respiro-alto-0.mp3`) | 0 % / 41 % (`respiro-alto-4.mp3`) |
| -12 dB | 19 | -0.015 | -2 % / -32 % (`decompresisone-1.mp3`) | 0.98 / 0.72 (`respiro-alto-4.mp3`) | 0 % / 0 % |
| -6 dB | 19 | -0.001 | -0 % / -16 % (`decompresisone-1.mp3`) | 1.00 / 0.91 (`decompresisone-1.mp3`) | 0 % / 0 % |

## `anchor`

| scarto | n | Δ media (mediana) | Δ relativa (mediana / peggiore) | r traiettoria (mediana / minimo) | inversioni del verso a 6 s (mediana / peggiore) |
|---:|---:|---:|---|---|---|
| -18 dB | 19 | -0.021 | -5 % / -20 % (`respiro-profondo.mp3`) | 1.00 / 0.67 (`respiro-profondo.mp3`) | 0 % / 6 % (`respiro-alto-3.mp3`) |
| -12 dB | 19 | -0.011 | -3 % / -15 % (`respiro-profondo.mp3`) | 1.00 / 0.85 (`respiro-profondo.mp3`) | 0 % / 0 % |
| -6 dB | 19 | -0.004 | -1 % / -16 % (`respiro-profondo.mp3`) | 1.00 / 0.79 (`respiro-profondo.mp3`) | 0 % / 0 % |

## `constraint`

| scarto | n | Δ media (mediana) | Δ relativa (mediana / peggiore) | r traiettoria (mediana / minimo) | inversioni del verso a 6 s (mediana / peggiore) |
|---:|---:|---:|---|---|---|
| -18 dB | 19 | -0.027 | -9 % / -28 % (`respiro-profondo.mp3`) | 0.99 / 0.78 (`respiro-profondo.mp3`) | 0 % / 0 % |
| -12 dB | 19 | -0.009 | -3 % / -21 % (`respiro-profondo.mp3`) | 1.00 / 0.90 (`respiro-profondo.mp3`) | 0 % / 0 % |
| -6 dB | 19 | -0.004 | -1 % / -19 % (`respiro-profondo.mp3`) | 1.00 / 0.85 (`respiro-profondo.mp3`) | 0 % / 0 % |

## Saturazioni per banda

Quota media dei bin FFT della banda al tetto della scala (255, cioè ≥ −10 dB) e al pavimento (0, cioè ≤ −90 dB), per livello assoluto, mediana sul corpus e caso peggiore.

| livello | low tetto | lowMid tetto | mid tetto | high tetto | low pavimento | lowMid pavimento | mid pavimento | high pavimento |
|---:|---|---|---|---|---|---|---|---|
| -18 dB | 0 % / 0 % | 0 % / 0 % | 0 % / 0 % | 0 % / 0 % | 1 % / 5 % | 1 % / 6 % | 3 % / 63 % | 29 % / 99 % |
| -12 dB | 0 % / 0 % | 0 % / 0 % | 0 % / 0 % | 0 % / 0 % | 1 % / 5 % | 1 % / 6 % | 2 % / 42 % | 10 % / 98 % |
| -6 dB | 0 % / 0 % | 0 % / 0 % | 0 % / 0 % | 0 % / 0 % | 1 % / 4 % | 1 % / 5 % | 1 % / 10 % | 2 % / 95 % |
| 0 dB | 1 % / 30 % | 0 % / 3 % | 0 % / 0 % | 0 % / 0 % | 0 % / 4 % | 0 % / 5 % | 1 % / 6 % | 2 % / 79 % |
| +6 dB | 26 % / 81 % | 4 % / 12 % | 0 % / 0 % | 0 % / 0 % | 0 % / 4 % | 0 % / 5 % | 1 % / 6 % | 2 % / 50 % |
| +12 dB | 61 % / 94 % | 16 % / 24 % | 0 % / 1 % | 0 % / 0 % | 0 % / 3 % | 0 % / 4 % | 1 % / 5 % | 1 % / 30 % |

## Onset per banda rispetto al riferimento

Rapporto fra l'incremento positivo medio per fotogramma della banda al livello e quello al riferimento (1 = invariato, < 1 = onset che collassano). Mediana / minimo.

| scarto | low | lowMid | mid | high |
|---:|---|---|---|---|
| -18 dB | 1.00 / 0.99 | 0.99 / 0.95 | 0.99 / 0.42 | 0.76 / 0.01 |
| -12 dB | 1.00 / 0.99 | 0.99 / 0.97 | 0.99 / 0.72 | 0.93 / 0.06 |
| -6 dB | 1.00 / 0.99 | 1.00 / 0.98 | 1.00 / 0.95 | 0.98 / 0.33 |

## Verso e regime emessi rispetto al riferimento

Quota di tick (0,5 s, solo dopo l'avvio) in cui verso di `constraint` o regime emesso differiscono dal riferimento. Mediana / peggiore.

| scarto | verso diverso | regime diverso |
|---:|---|---|
| -18 dB | 3 % / 31 % (`pressurizzazione-2.mp3`) | 2 % / 50 % (`pressurizzazione-2.mp3`) |
| -12 dB | 1 % / 19 % (`pressurizzazione-2.mp3`) | 1 % / 28 % (`pressurizzazione-2.mp3`) |
| -6 dB | 0 % / 18 % (`respiro-profondo.mp3`) | 0 % / 15 % (`respiro-profondo.mp3`) |
