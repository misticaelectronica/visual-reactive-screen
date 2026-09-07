# CALIBRATION CORPUS V1 — Passo A, riesecuzione con riscaldamento

Riscaldamento: 40s di rumore rosa sintetico (ffmpeg lavfi anoisesrc), non appartenente al corpus, non loggato. Bootstrap risolto durante il riscaldamento: SÌ.
Sequenza reale (continuità, stesso clock del riscaldamento): decompresisone-1.mp3, decompresisone.mp3, pressurizzazione-2.mp3, pressurizzazione.mp3, pressurizzazione1.mp3, respiro-alto-0.mp3, respiro-alto-1.mp3, respiro-profondo-1.mp3, respiro-profondo.mp3, respirto-profondo-3.mp3.

## decompresisone-1.mp3
- frame totali: 2179, scartati (bootstrapping): 0
- perceptualPressure (mediana): 0.5448
  - sustainedEnergy: 0.4445  spectralOccupancy: 0.5800 (livelli osservati: {"1.000":20,"0.810":36,"0.580":2123})  temporalOccupancy: 0.9654  rhythmConstraint: 0.3847
  - pulse: 0.3408  lowEnd: 0.6964  gridDensity: 0.1014
- pressureTrend prevalente: stable — distribuzione: {"stable":2020,"falling":80,"rising":79}
- regime prevalente: respiro-alto — distribuzione: {"unresolved":791,"decompression":80,"pressurized":79,"respiro-alto":1229}
- reason prevalente: stasis-held — distribuzione: {"stasis-level-indeterminate":791,"pressure-falling":80,"pressure-rising":79,"stasis-held":1228,"stasis-settled-alto":1}

## decompresisone.mp3
- frame totali: 2370, scartati (bootstrapping): 0
- perceptualPressure (mediana): 0.6334
  - sustainedEnergy: 0.5705  spectralOccupancy: 0.8100 (livelli osservati: {"0.580":12,"0.810":2047,"1.000":311})  temporalOccupancy: 0.9327  rhythmConstraint: 0.4010
  - pulse: 0.3931  lowEnd: 0.6978  gridDensity: 0.0876
- pressureTrend prevalente: stable — distribuzione: {"falling":342,"stable":1748,"rising":280}
- regime prevalente: respiro-alto — distribuzione: {"decompression":342,"unresolved":748,"pressurized":280,"respiro-alto":1000}
- reason prevalente: stasis-held — distribuzione: {"pressure-falling":342,"stasis-level-indeterminate":748,"pressure-rising":280,"stasis-held":999,"stasis-settled-alto":1}

## pressurizzazione-2.mp3
- frame totali: 2115, scartati (bootstrapping): 0
- perceptualPressure (mediana): 0.5872
  - sustainedEnergy: 0.5363  spectralOccupancy: 0.8100 (livelli osservati: {"0.810":1571,"0.580":544})  temporalOccupancy: 0.8180  rhythmConstraint: 0.4497
  - pulse: 0.4973  lowEnd: 0.7331  gridDensity: 0.0476
- pressureTrend prevalente: stable — distribuzione: {"falling":570,"stable":899,"rising":646}
- regime prevalente: pressurized — distribuzione: {"decompression":570,"unresolved":482,"pressurized":646,"respiro-profondo":267,"respiro-alto":150}
- reason prevalente: pressure-rising — distribuzione: {"pressure-falling":570,"stasis-level-indeterminate":482,"pressure-rising":646,"stasis-held":417}

## pressurizzazione.mp3
- frame totali: 2370, scartati (bootstrapping): 0
- perceptualPressure (mediana): 0.6341
  - sustainedEnergy: 0.5279  spectralOccupancy: 0.8100 (livelli osservati: {"0.580":4,"0.810":2366})  temporalOccupancy: 0.9968  rhythmConstraint: 0.4178
  - pulse: 0.3467  lowEnd: 0.6880  gridDensity: 0.2186
- pressureTrend prevalente: stable — distribuzione: {"falling":9,"stable":2217,"rising":144}
- regime prevalente: unresolved — distribuzione: {"decompression":9,"unresolved":2217,"pressurized":144}
- reason prevalente: stasis-level-indeterminate — distribuzione: {"pressure-falling":9,"stasis-level-indeterminate":2217,"pressure-rising":144}

## pressurizzazione1.mp3
- frame totali: 1218, scartati (bootstrapping): 0
- perceptualPressure (mediana): 0.6263
  - sustainedEnergy: 0.5213  spectralOccupancy: 0.8100 (livelli osservati: {"0.810":1215,"0.580":3})  temporalOccupancy: 0.9788  rhythmConstraint: 0.4130
  - pulse: 0.3503  lowEnd: 0.7244  gridDensity: 0.1536
- pressureTrend prevalente: stable — distribuzione: {"stable":1179,"falling":39}
- regime prevalente: unresolved — distribuzione: {"unresolved":1179,"decompression":39}
- reason prevalente: stasis-level-indeterminate — distribuzione: {"stasis-level-indeterminate":1179,"pressure-falling":39}

## respiro-alto-0.mp3
- frame totali: 2115, scartati (bootstrapping): 0
- perceptualPressure (mediana): 0.5776
  - sustainedEnergy: 0.5940  spectralOccupancy: 0.8100 (livelli osservati: {"0.580":2,"0.810":2113})  temporalOccupancy: 0.6090  rhythmConstraint: 0.4075
  - pulse: 0.3865  lowEnd: 0.7709  gridDensity: 0.0224
- pressureTrend prevalente: rising — distribuzione: {"falling":836,"stable":323,"rising":956}
- regime prevalente: pressurized — distribuzione: {"decompression":836,"unresolved":316,"pressurized":956,"respiro-alto":7}
- reason prevalente: pressure-rising — distribuzione: {"pressure-falling":836,"stasis-level-indeterminate":316,"pressure-rising":956,"stasis-held":7}

## respiro-alto-1.mp3
- frame totali: 2115, scartati (bootstrapping): 0
- perceptualPressure (mediana): 0.6252
  - sustainedEnergy: 0.6075  spectralOccupancy: 0.8100 (livelli osservati: {"0.810":2105,"0.580":10})  temporalOccupancy: 0.8250  rhythmConstraint: 0.4173
  - pulse: 0.3900  lowEnd: 0.7729  gridDensity: 0.0528
- pressureTrend prevalente: stable — distribuzione: {"falling":526,"stable":1041,"rising":548}
- regime prevalente: unresolved — distribuzione: {"decompression":526,"respiro-alto":395,"pressurized":529,"unresolved":665}
- reason prevalente: stasis-level-indeterminate — distribuzione: {"pressure-falling":526,"stasis-held":376,"pressure-rising":529,"stasis-inherited-alto":19,"stasis-level-indeterminate":665}

## respiro-profondo-1.mp3
- frame totali: 2115, scartati (bootstrapping): 0
- perceptualPressure (mediana): 0.5881
  - sustainedEnergy: 0.5128  spectralOccupancy: 0.8100 (livelli osservati: {"0.580":67,"0.810":2045,"0.300":3})  temporalOccupancy: 0.8007  rhythmConstraint: 0.4093
  - pulse: 0.3980  lowEnd: 0.7352  gridDensity: 0.0568
- pressureTrend prevalente: rising — distribuzione: {"falling":535,"stable":775,"rising":805}
- regime prevalente: pressurized — distribuzione: {"decompression":535,"unresolved":503,"pressurized":805,"respiro-alto":272}
- reason prevalente: pressure-rising — distribuzione: {"pressure-falling":535,"stasis-level-indeterminate":503,"pressure-rising":805,"stasis-held":272}

## respiro-profondo.mp3
- frame totali: 2115, scartati (bootstrapping): 0
- perceptualPressure (mediana): 0.5984
  - sustainedEnergy: 0.4960  spectralOccupancy: 0.8100 (livelli osservati: {"0.300":1,"0.580":63,"0.810":2051})  temporalOccupancy: 0.8921  rhythmConstraint: 0.3975
  - pulse: 0.3747  lowEnd: 0.6908  gridDensity: 0.0926
- pressureTrend prevalente: stable — distribuzione: {"falling":438,"stable":1019,"rising":658}
- regime prevalente: unresolved — distribuzione: {"decompression":438,"unresolved":1019,"pressurized":658}
- reason prevalente: stasis-level-indeterminate — distribuzione: {"pressure-falling":438,"stasis-level-indeterminate":1019,"pressure-rising":658}

## respirto-profondo-3.mp3
- frame totali: 2115, scartati (bootstrapping): 0
- perceptualPressure (mediana): 0.4105
  - sustainedEnergy: 0.4654  spectralOccupancy: 0.5800 (livelli osservati: {"0.580":2115})  temporalOccupancy: 0.2099  rhythmConstraint: 0.3669
  - pulse: 0.3228  lowEnd: 0.7369  gridDensity: 0.0131
- pressureTrend prevalente: falling — distribuzione: {"falling":874,"stable":757,"rising":484}
- regime prevalente: decompression — distribuzione: {"decompression":827,"unresolved":44,"respiro-profondo":760,"pressurized":484}
- reason prevalente: pressure-falling — distribuzione: {"pressure-falling":827,"stasis-level-indeterminate":44,"stasis-held":713,"pressure-rising":484,"stasis-inherited-profondo":47}

## Quantizzazione strutturale di `spectralOccupancy`
`occupiedWeight` è una somma di sottoinsieme dei 4 pesi di banda (low 0.30, lowMid 0.28, mid 0.23, high 0.19): 16 combinazioni possibili, indipendentemente da quanto ciascuna banda superi il pavimento — un gradino, non una quantità continua.

| bande sopra il pavimento | valore |
|---|---|
| (nessuna) | 0 |
| high | 0.19 |
| mid | 0.23 |
| lowMid | 0.28 |
| low | 0.3 |
| mid+high | 0.42 |
| lowMid+high | 0.47 |
| low+high | 0.49 |
| lowMid+mid | 0.51 |
| low+mid | 0.53 |
| low+lowMid | 0.58 |
| lowMid+mid+high | 0.7 |
| low+mid+high | 0.72 |
| low+lowMid+high | 0.77 |
| low+lowMid+mid | 0.81 |
| low+lowMid+mid+high | 1 |

Valori realmente osservati nell'intero corpus (riscaldato): {"1.000":331,"0.810":15549,"0.580":4943,"0.300":4}