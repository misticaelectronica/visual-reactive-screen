# Gain sweep delle feature experimental — sintesi (PIANO-059 Fase 2)

2026-11-06. Esperimento offline autorizzato dal brief
`team/briefs/brief-audio-autorizzazione-piano-059-2026-11-06.md` (§3–§5).
Tabelle complete in `gain-sweep.md`, dati per file e per livello in
`gain-sweep.json`. Nessuna feature è stata corretta e il runtime non è
cambiato: si descrive soltanto quali feature sono sensibili al guadagno, e
come.

## 1. Metodo

- 19 campioni di `docs/campioni/`, livelli −18, −12, −6, 0, +6, +12 dB.
  Moduli di produzione invariati (`brainRhythm`, `brainBioPerception`,
  `brainBioPerceptionExperimental`).
- **Gain tecnico puro.** È lo stesso segnale moltiplicato per una costante
  (`volume`, `precision=float`), senza limiter, compressione o
  normalizzazione. Verificato sull'RMS del contenuto: su tutti i 114
  replay lo scarto dal nominale è sotto 10⁻⁶ dB. La dinamica interna del
  brano non cambia.
- **Clipping.** Tutti i master hanno picco per canale fra −0,14 e −0,10 dBFS,
  quindi +6 e +12 dB li porterebbero oltre 0 dBFS in qualunque catena reale.
  Per il §4 del brief quei livelli sono segnalati e **esclusi** dai giudizi.
  Restano nella tabella delle saturazioni, marcati come fuori dal range
  reale.
- **Riferimento**: 0 dB, cioè il file a piena scala con downmix ½(L+R), come
  lo riceve l'AnalyserNode in produzione. I confronti sono quindi a −6, −12 e
  −18 dB.
- Per ogni feature, a tick di 0,5 s dopo l'avvio del motore: media, scarto
  dal riferimento, correlazione della traiettoria temporale (r), quota di
  inversioni del verso a 6 s (stesso ritardo con cui il motore legge la
  direzione), più verso e regime emessi.

## 2. Rilievo di metodo: gli script storici giravano ~3 dB più caldi

**Fatto misurato.** Gli script di calibrazione esistenti
(`assert-regime-corpus.mjs`, `compare-audio-regimes.mjs` e l'harness di
sessione) lasciano negoziare il downmix stereo→mono al grafo `concat` di
ffmpeg. Quel downmix somma i canali senza dimezzarli: su master a −0,1 dBFS
il contenuto arriva al motore a +2,9 dBFS. Il downmix della produzione (Web
Audio) e quello di `ffmpeg -ac 1` restano a −0,1 dBFS.

**Fatto misurato.** L'effetto sulle conclusioni passate è piccolo: fra 0 dB
e +3 dB il regime dominante non cambia su nessuno dei 19 file. La quota di
tempo per regime cambia al massimo di 0,115 (`respiro-profondo`), e di 0,063
sul secondo caso (`pressurizzazione-2`).

La libreria nuova (`scripts/calibration/lib/corpusReplay.mjs`) usa il
downmix della produzione. Gli script storici non sono stati toccati, per non
cambiare le misure già registrate.

## 3. Correzione di una misura del mattino

**Correzione.** Nella §7 di `../decompressione-8-9-replay-2026-11-06.md` ho
scritto che +12 dB su `decompresisone-1` porta `physicalConfirmation` da
0,64 a 0,35, e ne ho tratto che la sensibilità al guadagno «esiste lo
stesso». Quella misura era fatta con lo scarto di +3 dB del §2, cioè a circa
+15 dB sopra la piena scala, in pieno clipping reale. Per il §4 del brief non
può giudicare l'invarianza. Questo gain sweep la sostituisce. Resta vero il
fatto che su `-8`/`-9` la saturazione non spiega l'assenza di griglia nelle
basse.

## 4. Risultati per feature, nel range valido (−18…0 dB)

Mediana sul corpus e caso peggiore. Δ relativa solo dove la media di
riferimento è ≥ 0,05.

| feature | Δ relativa a −6 dB | Δ relativa a −18 dB | r traiettoria a −18 dB | inversioni del verso a −18 dB |
|---|---|---|---|---|
| `recurrence` | 0 % / −11 % | −1 % / +17 % | 0,94 / **0,29** (`respiro-alto-4`) | 0 % / 20 % (`decompressione-5`) |
| `cyclePersistence` | −1 % / −3 % | −4 % / −9 % | 0,96 / **0,22** (`decompressione-5`) | 0 % / 27 % (`pressurizzazione-2`) |
| `physicalConfirmation` | 0 % / −12 % | 0 % / +14 % | 0,99 / **0,32** (`pressurizzazione`) | 0 % / 13 % (`respiro-alto-4`) |
| `eventActivity` | 0 % / −16 % | −7 % / **−42 %** (`decompresisone-1`) | 0,96 / **−0,03** (`respiro-alto-0`) | 0 % / **41 %** (`respiro-alto-4`) |
| `anchor` | −1 % / −16 % | −5 % / −20 % | 1,00 / 0,67 | 0 % / 6 % |
| `constraint` | −1 % / −19 % | −9 % / −28 % (`respiro-profondo`) | 0,99 / 0,78 | 0 % / 0 % |

Verso di `constraint` e regime emesso, quota di tick diversi dal
riferimento:

| scarto | verso diverso | regime diverso |
|---|---|---|
| −6 dB | 0 % / 18 % (`respiro-profondo`) | 0 % / 15 % (`respiro-profondo`) |
| −12 dB | 1 % / 19 % (`pressurizzazione-2`) | 1 % / 28 % (`pressurizzazione-2`) |
| −18 dB | 3 % / 31 % (`pressurizzazione-2`) | 2 % / **50 %** (`pressurizzazione-2`) |

**Fatti.** In mediana tutte e sei le feature reggono il guadagno fino a
−18 dB. Il problema sta nelle code: su alcuni file la traiettoria temporale
si scompone (r fra −0,03 e 0,32) e il regime emesso cambia fino a metà del
tempo.

**Fatto.** L'unica feature con uno scarto sistematico, e non solo di coda, è
`eventActivity`: −7 % in mediana a −18 dB, fino a −42 %. `constraint`, che ne
dipende, scende di −9 % in mediana e fino a −28 %. Il suo verso però non si
inverte mai: 0 % di inversioni su tutti i file e a tutti i livelli.

## 5. Dove nasce la sensibilità: il pavimento della scala, non il tetto

Quota dei bin FFT al pavimento (≤ −90 dB, byte 0), mediana / peggiore:

| livello | `mid` | `high` |
|---|---|---|
| 0 dB | 1 % / 6 % | 2 % / 79 % |
| −6 dB | 1 % / 10 % | 2 % / 95 % |
| −12 dB | 2 % / 42 % | 10 % / 98 % |
| −18 dB | 3 % / 63 % | 29 % / 99 % |

Onset per banda rispetto al riferimento (1 = invariati), mediana / minimo:

| scarto | `low` | `lowMid` | `mid` | `high` |
|---|---|---|---|---|
| −6 dB | 1,00 / 0,99 | 1,00 / 0,98 | 1,00 / 0,95 | 0,98 / 0,33 |
| −18 dB | 1,00 / 0,99 | 0,99 / 0,95 | 0,99 / 0,42 | 0,76 / **0,01** |

**Fatti.**

- Attenuando, `high` e poi `mid` scendono sotto −90 dB per bin e gli onset
  di `high` collassano. Su materiale con alti già deboli il collasso è
  completo già a −6 dB (minimo 0,33) e totale a −18 dB (0,01).
- `low` e `lowMid` restano invariati fino a −18 dB (onset ≥ 0,95).
- Al tetto della scala (≥ −10 dB per bin) nel range valido arriva solo
  `low` a 0 dB: 1 % in mediana, 30 % sul caso peggiore. Oltre lo 0 dB il
  tetto cresce (+6 dB: 26 % / 81 %), ma quei livelli sono in clipping.

**Interpretazione.** In questo motore il guadagno non agisce in modo
uniforme sulle bande: la scala fissa −90…−10 dB taglia prima gli alti in
basso e i bassi in alto. Le feature che sommano gli onset delle quattro
bande a peso uguale (`eventActivity`, e tramite lei `constraint`; `recurrence`
e `cyclePersistence` per la parte di correlazione) perdono il contributo
degli alti quando il segnale scende. Questo collega il gain sweep al rilievo
del 7 ottobre: gli alti sono la sorgente di onset più densa e regolare.
Quando spariscono per ragioni di livello, la lettura dell'organizzazione
cambia senza che la musica sia cambiata.

## 6. Risposta ai punti del §5 del brief

| richiesta | esito |
|---|---|
| variazione al cambiare del gain | piccola in mediana; sistematica solo per `eventActivity` (−7 % a −18 dB) e di riflesso `constraint` (−9 %) |
| stabilità della traiettoria temporale | buona in mediana (r ≥ 0,94); rotta su singoli file per `recurrence`, `cyclePersistence`, `physicalConfirmation`, `eventActivity` |
| saturazioni | nel range valido: pavimento di `high`/`mid` attenuando; tetto di `low` solo a piena scala e solo su alcuni master |
| collassi degli onset | `high` sì (fino a 0,01), `mid` parziale (0,42), `low`/`lowMid` no |
| inversioni qualitative | nessuna sul verso di `constraint`; fino al 41 % sul verso di `eventActivity` e fino al 50 % di regime emesso diverso, su singoli file |

Niente di questo decide come correggere: per il brief §12 nessuna
normalizzazione runtime è autorizzata. I file più sensibili
(`pressurizzazione-2`, `respiro-profondo`, `respiro-alto-4`, `decompresisone-1`,
`decompressione-5`) sono il materiale naturale per la Fase 3.
