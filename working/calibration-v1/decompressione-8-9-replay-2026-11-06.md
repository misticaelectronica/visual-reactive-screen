# Decompressione: replay di `decompressione-8` e `-9` — 2026-11-06

Richiesta del Capo Supremo: usare i nuovi campioni `decompressione-8.mp3` e
`decompressione-9.mp3` per migliorare la taratura delle fasi di
decompressione.

**Nessuna modifica è stata portata al runtime audio.** Il motivo è nei dati
qui sotto: sui due campioni nessun parametro esistente del regime
experimental può produrre `decompression`. Questa nota prosegue
`decompressione-conflitto-livelli-2026-10-07.md`.

## 1. Esito del replay (fatto verificato)

Replay sui 7 campioni di decompressione con
`scripts/calibration/compare-audio-regimes.mjs`, codice di produzione
invariato:

| File | durata | experimental | baseline `decompression` |
|---|---:|---|---:|
| `decompressione-8.mp3` | 14,9 s | unresolved 9,5 s, pressurized 5,4 s | 8,3 s (8 transizioni) |
| `decompressione-9.mp3` | 20,9 s | unresolved 9,5 s, pressurized 11,2 s | 8,3 s (14 transizioni) |
| `decompressione-7.mp3` | 19,4 s | unresolved 9,5 s, pressurized 9,9 s | 10,3 s |
| `decompressione-5.mp3` | 20,9 s | pressurized 9,7 s, respiro-alto 1,7 s | 15,5 s |
| `decompresisone*.mp3` (3 file lunghi) | 33–55 s | pressurized + respiro-alto/profondo | presente su tutti |

Il regime experimental, quello collegato al Visual, emette `decompression`
su **0 file su 7**. `decompressione-7` non era mai stato messo nel replay
prima di oggi: dà lo stesso esito.

## 2. Perché la taratura non può bastare (fatto verificato)

Nella timeline per finestra di analisi, su entrambi i nuovi file:

- le bande del motore restano piatte per tutta la durata (`low` ≈ 0,98,
  `lowMid` ≈ 0,83, `mid` ≈ 0,55, `high` ≈ 0,33), e anche `eventActivity`
  (0,31–0,36), `recurrence` (0,4–0,5) e `cyclePersistence` (≈ 0,96)
  restano costanti;
- l'unica grandezza che si muove è `anchor`, che sale da 0 a ~0,45 uscendo
  dall'avvio a freddo; `constraint` lo segue (0,01 → 0,28 su `-9`,
  0,01 → 0,25 su `-8`) e la direzione resta `rising`, cioè `pressurized`;
- il calo massimo di `constraint` su tutto il file è di **0,005** (`-9`) e
  **0,009** (`-8`, durante la dissolvenza finale). Il deadband attuale è
  0,07, e già a 0,05 si rompono `respiro-profondo.mp3` e `respiro-alto-3.mp3`
  (misura del 2026-09-13 in `STATE.md`).

È la stessa causa già documentata il 7 ottobre: `constraint` misura quanto
la griglia è anellata e prevedibile, e su questo materiale la griglia non
cambia.

## 3. Cosa cambia davvero nei due campioni (fatto verificato)

Misura fuori dal motore (ffmpeg `aspectralstats` + `astats`, medie su 2 s):

| File | centroide spettrale | rolloff | RMS |
|---|---|---|---|
| `decompressione-8` | 3.790 Hz (0–8 s) → 2.395 Hz (12–14 s) | 8.970 → 5.737 Hz | stabile, −7/−8 dB |
| `decompressione-9` | ~1.900 Hz (0–14 s) → 1.056 Hz (20 s) | ~4.300 → 2.061 Hz | stabile, −7 dB fino all'ultimo secondo |

In entrambi il materiale ritmico e il volume restano dov'erano, e a scendere
è la brillantezza: lo spettro si chiude dall'alto. Nelle quattro bande del
motore questo arriva come un calo di `high` da circa 0,35 a 0,27, perché la
scala in dB compressa su 0–255 lo appiattisce, e su `low`/`lowMid` non si
vede.

Il "filtro che si chiude" è il mio nome per questa forma: è
un'interpretazione della misura e non è stato verificato all'ascolto.

## 4. La stessa forma non c'è nel resto del corpus (fatto verificato)

Stessa misura, medie su 5 s:

- `decompresisone`, `decompresisone-1`, `decompresisone-2`: centroide e RMS
  stazionari per tutta la durata (es. `-1`: 605–710 Hz, −18 dB costanti);
- `decompressione-7`: centroide irregolare, RMS che cala da −9 a −27 dB
  negli ultimi 6 s, cioè una dissolvenza di volume;
- `decompressione-5`: centroide irregolare, la caduta avviene negli ultimi
  ~0,5 s (vedi nota del 7 ottobre §5).

I 7 file etichettati decompressione hanno quindi almeno tre forme acustiche
diverse: chiusura spettrale (`-8`, `-9`), dissolvenza di volume (`-7`, la
coda di `-5`), materiale stazionario (i tre `decompresisone*`). Nessuna
singola grandezza le copre tutte.

## 5. I due campioni sono più corti della finestra di avvio (fatto verificato)

Il regime experimental è `unresolved` per i primi ~9,5 s di ogni file
(8 s di finestra `WINDOW_MS` + 1,5 s di `ANCHOR_WARMUP_GRACE_MS`), e poi
confronta con un ritardo di 6 s (`CONSTRAINT_TREND_LAG_MS`).

- `decompressione-8`: la chiusura spettrale comincia intorno a 8 s, cioè
  **dentro** il tratto `unresolved`. In replay il motore non la può vedere,
  qualunque osservabile si usi.
- `decompressione-9`: la chiusura comincia intorno a 15 s e finisce a
  20,9 s, a ridosso del confronto a 6 s. Il materiale stabile davanti è di
  ~5 s, ancora dentro l'ancoraggio che sale.

Come già scritto il 7 ottobre per `decompressione-5`: per certificare una
taratura servono campioni di almeno ~40 s, con ~20 s di materiale stabile
prima della decompressione.

## 6. Cosa resta da decidere, e a chi

La definizione dell'osservabile della decompressione è lettura
audio-percettiva: compete al Capo Supremo dell'Analisi Audio. La regola
anti-sovrastrutturazione chiede di dire prima che nessun segnale esistente
risponde: `spectralOccupancy` della baseline è un'occupazione binaria per
banda sopra soglia, e con `high` a 0,27 la banda resta occupata.

Domande aperte, nessuna decisa:

1. La decompressione è la chiusura spettrale di `-8`/`-9`, la sottrazione di
   materia del brief originale, o entrambe? I file `decompresisone*` sono
   un *passaggio* o uno *stato* già decompresso?
2. Se la chiusura spettrale conta, serve una grandezza di brillantezza
   (equilibrio alti/bassi, o centroide) letta con lo stesso confronto a lungo
   raggio della costrizione. Sarebbe un osservabile nuovo, e va disposto
   prima di essere implementato.
3. Servono campioni più lunghi (≥ 40 s) prima di poter tarare qualunque
   soglia su questa fase.

## Metodo

- Replay: `scripts/calibration/compare-audio-regimes.mjs` sui 7 file. Lo
  script sovrascrive `audio-regimes-compare.json` e `motor-observables.json`
  con il solo sottoinsieme passato: i due file tracciati sono stati
  ripristinati dopo il replay.
- Timeline: harness di sessione in scratchpad con lo stesso decode, la stessa
  FFT e gli stessi moduli di produzione trascritti, e l'experimental clock
  istanziato all'inizio del contenuto reale, come in
  `assert-regime-corpus.mjs`. Una riga ogni 0,5 s.
- Misure spettrali: ffmpeg `aspectralstats=measure=centroid+rolloff` e
  `astats` RMS, medie su 2 s o 5 s.

## 7. Verifica dell'ipotesi sul livello d'ingresso (D5) — stessa data

Richiesta da `team/briefs/brief-audio-decisioni-decompressione-2026-11-06.md`
§7: «L'ipotesi tecnica deve essere verificata dall'Ingegneria». Solo
diagnostica, codice di produzione invariato. Medie sul tratto risolto;
`lowSat` = quota di fotogrammi con `low` ≥ 0,97.

| File | guadagno | `low` | `lowSat` | `physicalConfirmation` | `constraint` | regime |
|---|---:|---:|---:|---:|---:|---|
| `decompressione-8` | 0 dB | 0,91 | 57 % | 0,03 | 0,211 | invariato |
| `decompressione-8` | −18 dB | 0,72 | 0 % | 0,00 | 0,198 | invariato |
| `decompressione-9` | 0 dB | 0,98 | 75 % | 0,10 | 0,233 | invariato |
| `decompressione-9` | −18 dB | 0,78 | 0 % | 0,06 | 0,217 | invariato |
| `decompresisone-1` | 0 dB | 0,87 | 1 % | 0,64 | 0,420 | invariato |
| `decompresisone-1` | +12 dB | 0,98 | 79 % | 0,35 | 0,327 | invariato |
| `respiro-alto-1` | 0 dB | 0,91 | 3 % | 0,32 | 0,259 | invariato |
| `respiro-alto-1` | +12 dB | 0,98 | 97 % | 0,35 | 0,252 | invariato |

(Righe intermedie a −6/−12 dB e +6 dB coerenti con quelle mostrate.)

Esito, fatti misurati:

1. **Sui due nuovi file l'ipotesi è smentita.** Senza saturazione la conferma
   corporea resta 0,00–0,07: lo schiacciamento al tetto non è la causa.
2. **La sensibilità al guadagno esiste lo stesso.** Amplificando di +12 dB un
   file con griglia corporea netta (`decompresisone-1`), la saturazione passa
   dall'1 % al 79 % e `physicalConfirmation` scende da 0,64 a 0,35 (−45 %).
   È la violazione del requisito D5 nella direzione «griglia presente →
   griglia indebolita». Su `respiro-alto-1` l'effetto non si vede (0,32 →
   0,35). Il regime emesso non cambia in nessun caso, perché
   `physicalConfirmation` non entra nella decisione.
3. **Nemmeno il periodo spiega -8/-9.** Periodicità di `low`+`lowMid` al loro
   periodo migliore, finestre di 8 s: 0,06–0,25, con periodi che saltano
   (275–1.100 ms). Sulle quattro bande: 0,38–0,53, fisse a 275 ms. Per
   confronto `decompresisone-1` ha 0,61–0,68 a 975 ms sulle basse.
4. **Il materiale sotto i 150 Hz ha pochi attacchi.** Escursione
   dell'inviluppo sotto i 150 Hz (RMS su 10 ms, p10–p90, misura relativa e
   quindi indipendente dal guadagno): 7,0 dB (`-8`) e 7,9 dB (`-9`), contro
   12,3 dB (`respiro-alto-1`), 21,1 dB (`decompresisone-1`) e 21,8 dB
   (`respiro-profondo`).

Interpretazione, non verificata all'ascolto: in `-8`/`-9` le basse sono una
massa quasi continua (basso sostenuto o master molto compresso), e la griglia
che il motore legge viene dalle bande alte. La presenza o assenza di un kick
percepibile resta da confermare all'ascolto, prima di usarli come positivi
(§3 del brief Audio); chi la esegue lo stabilisce il Capo Supremo.

## 8. Revisione della §7 — PIANO-059, stessa data

Il punto 2 della §7 («la sensibilità al guadagno esiste lo stesso»,
`decompresisone-1` +12 dB → `physicalConfirmation` 0,64 → 0,35) è
**superato**. L'harness di sessione usava il downmix negoziato dal grafo
`concat` di ffmpeg, che porta il contenuto ~+3 dB sopra il downmix della
produzione. Quel +12 dB era quindi circa +15 dB sopra la piena scala, in
clipping per qualunque catena reale, e per il §4 del brief di autorizzazione
non può giudicare l'invarianza.

I punti 1, 3 e 4 restano validi: la saturazione non spiega l'assenza di
griglia nelle basse di `-8`/`-9`. Il gain sweep corretto, su tutto il corpus
e solo nel range senza clipping, è in `piano-059/gain-sweep-sintesi.md`.
