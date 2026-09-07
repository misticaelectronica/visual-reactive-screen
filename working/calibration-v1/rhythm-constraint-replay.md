# Replay isolato rhythmConstraint — 2026-09-04

Confronto sugli stessi ingressi registrati, usando il modulo di produzione attuale.
Le altre tre componenti sono quelle della baseline: nessuna nuova analisi FFT o simulazione del corpus.
Sequenza continua originale; stato ritmico iniziale zero. Esclusi i primi 20 s globali perché il warm-up non è registrato.
Il residuo massimo teorico dello stato pulse iniziale (0–1) dopo 20 s è exp(-20000/1800) < 0.000015.
Non vengono ricalcolati regime, reference o mediana: questo è un confronto della sola pressione, non un collaudo live.
Dieci file presenti; nessuna mappa verificabile C01–C09. Non attribuire gli identificativi per congettura.

- Input SHA256: 7c8bb694b7fa85ec53c15ec7d1ab4309c2072ce7e002604d256003d8c0b99484
- Modulo SHA256: 1ac0f9d32f826b8b49637ea1e5b5215f578923de15c68baceb3e96da809a68ce
- Errore massimo ricostruzione PP baseline: 0
- Errore massimo lowEnd/gridDensity dopo esclusione: 4.2427376167886166e-8

| File | N | PP prima (mediana) | PP dopo (mediana) | Ritmo dopo | Pulse dopo |
|---|---:|---:|---:|---:|---:|
| decompresisone-1.mp3 | 1317 | 0.5456 | 0.4420 | 0.0619 | 0.0458 |
| decompresisone.mp3 | 2370 | 0.6334 | 0.5179 | 0.0445 | 0.0213 |
| pressurizzazione-2.mp3 | 2115 | 0.5872 | 0.4549 | 0.0240 | 0.0128 |
| pressurizzazione.mp3 | 2370 | 0.6341 | 0.5383 | 0.1185 | 0.0776 |
| pressurizzazione1.mp3 | 1218 | 0.6263 | 0.5240 | 0.0913 | 0.0683 |
| respiro-alto-0.mp3 | 2115 | 0.5776 | 0.4530 | 0.0118 | 0.0068 |
| respiro-alto-1.mp3 | 2115 | 0.6252 | 0.5007 | 0.0248 | 0.0099 |
| respiro-profondo-1.mp3 | 2115 | 0.5881 | 0.4690 | 0.0303 | 0.0177 |
| respiro-profondo.mp3 | 2115 | 0.5984 | 0.4859 | 0.0490 | 0.0281 |
| respirto-profondo-3.mp3 | 2115 | 0.4105 | 0.2955 | 0.0068 | 0.0039 |

## Andamento in finestre di 10 secondi

Mediane per finestre locali, senza inferire le etichette Audio. Prima finestra del primo file esclusa dal warm-up.

- decompresisone-1.mp3: 20–30s: 0.5497 → 0.4461; 30–40s: 0.5407 → 0.4373; 40–50s: 0.5451 → 0.4413; 50–60s: 0.5328 → 0.4265
- decompresisone.mp3: 0–10s: 0.6248 → 0.5141; 10–20s: 0.6374 → 0.5234; 20–30s: 0.6271 → 0.5142; 30–40s: 0.6321 → 0.5181; 40–50s: 0.6415 → 0.5206; 50–60s: 0.6352 → 0.5148
- pressurizzazione-2.mp3: 0–10s: 0.5874 → 0.4837; 10–20s: 0.5791 → 0.4432; 20–30s: 0.5830 → 0.4471; 30–40s: 0.6104 → 0.4715; 40–50s: 0.5799 → 0.4416
- pressurizzazione.mp3: 0–10s: 0.6261 → 0.5295; 10–20s: 0.6281 → 0.5335; 20–30s: 0.6291 → 0.5347; 30–40s: 0.6395 → 0.5424; 40–50s: 0.6392 → 0.5425; 50–60s: 0.6402 → 0.5434
- pressurizzazione1.mp3: 0–10s: 0.6252 → 0.5262; 10–20s: 0.6263 → 0.5231; 20–30s: 0.6280 → 0.5229
- respiro-alto-0.mp3: 0–10s: 0.5613 → 0.4472; 10–20s: 0.5931 → 0.4656; 20–30s: 0.5424 → 0.4154; 30–40s: 0.5903 → 0.4636; 40–50s: 0.5851 → 0.4580
- respiro-alto-1.mp3: 0–10s: 0.6355 → 0.5143; 10–20s: 0.6165 → 0.4912; 20–30s: 0.6393 → 0.5136; 30–40s: 0.6192 → 0.4933; 40–50s: 0.5967 → 0.4702
- respiro-profondo-1.mp3: 0–10s: 0.5477 → 0.4456; 10–20s: 0.5867 → 0.4725; 20–30s: 0.6091 → 0.4867; 30–40s: 0.5952 → 0.4675; 40–50s: 0.5959 → 0.4672
- respiro-profondo.mp3: 0–10s: 0.5908 → 0.4809; 10–20s: 0.6043 → 0.4872; 20–30s: 0.5954 → 0.4838; 30–40s: 0.6038 → 0.4929; 40–50s: 0.5940 → 0.4837
- respirto-profondo-3.mp3: 0–10s: 0.5083 → 0.4082; 10–20s: 0.3999 → 0.2840; 20–30s: 0.3826 → 0.2672; 30–40s: 0.4538 → 0.3391; 40–50s: 0.3741 → 0.2586
