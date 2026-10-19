# Decompressione e conflitto fra livelli — replay del corpus 2026-10-07

Richiesta del Capo Supremo: `decompressione-5.mp3` aggiunto ai campioni,
ritarare la decompressione, verificare che non ci sia conflitto fra livelli,
e correggere il fatto che «il respiro alto parte troppo spesso quando ci sono
lavori con gli alti».

Replay sui **16** file di `docs/campioni/` (15 precedenti + il nuovo) con i
moduli di produzione reali e lo stesso decode di
`scripts/calibration/compare-audio-regimes.mjs` (ffmpeg, warm-up di rumore
rosa 40s, FFT locale, clock di produzione guidati sugli stessi fotogrammi).
Il clock experimental è istanziato all'inizio del contenuto reale, come in
`scripts/calibration/assert-regime-corpus.mjs`.

**Nessuna modifica è stata portata al runtime audio.** Le quattro varianti
provate sono state misurate e scartate: sotto il perché.

## 1. Esito: la decompressione non è taratile, perché il suo osservabile sale

Quote di tempo per regime, regime **experimental** (quello collegato al
Visual, `audioMode: 'experimental'`):

| File | Atteso | `decompression` | Stato dominante osservato |
|---|---|---:|---|
| `decompresisone.mp3` | decompressione | **0 %** | respiro-alto 0,65 |
| `decompresisone-1.mp3` | decompressione | **0 %** | respiro-alto 0,58 |
| `decompresisone-2.mp3` | decompressione | **0 %** | respiro-alto 0,37 |
| `decompressione-5.mp3` | decompressione | **0 %** | pressurized 0,46 |

Su tutto il corpus di 16 file la direzione `falling` compare soltanto su tre
file — `pressurizzazione-2` (0,114), `respiro-profondo` (0,104),
`respiro-alto-2` (0,040) — e **su nessuno dei quattro file etichettati
decompressione**. Il regime `decompression` è di fatto irraggiungibile.

La causa non è una soglia mal posta. La timeline per finestra di analisi
mostra che su entrambi i file lunghi `constraint` **sale monotonicamente per
l'intera durata e non scende mai**:

| File | durata | `constraint` inizio → fine |
|---|---:|---|
| `decompresisone.mp3` | 55,0s | 0,021 → 0,407 (plateau con deriva in salita) |
| `decompresisone-1.mp3` | 50,6s | 0,044 → 0,420 (plateau con deriva in salita) |

`classifyExperimentalRegime` chiede `constraint.direction === 'falling'` per
emettere `decompression`. Nessun valore di `CONSTRAINT_TREND_DEADBAND` —
assoluto, relativo o misto — può produrre `falling` su un ingresso che sale:
**l'osservabile si muove nella direzione opposta al fenomeno che deve
rilevare.**

Il motivo è leggibile nella formula esistente:
`constraint = anchor · √eventActivity`, con
`anchor = EMA(recurrence × cyclePersistence)`. Una decompressione toglie
materia: il pattern che resta è *più* ricorrente e *più* persistente di
quello denso da cui proviene, quindi `recurrence` e `cyclePersistence`
salgono entrambe. `constraint` misura quanto il materiale è anellato e
prevedibile, e una decompressione lo è più del passaggio che la precede.

Vale il criterio di `agents.md`: «Se un criterio non scatta mai dal vivo,
non va tarato: va rimosso» — o ridefinito. Tararlo sarebbe stato tarare un
criterio che non scatta.

## 2. Il conflitto fra livelli esiste, ed è strutturale

La verifica richiesta ha esito negativo: il conflitto è totale, e i due assi
sono in un compromesso misurato, non in un disallineamento di taratura.

**Regime baseline** (`pressureTrend` su `perceptualPressure`) — *vede* la
decompressione:

| File | `decompression` baseline |
|---|---:|
| `decompressione-5.mp3` | **0,733** (dominante) |
| `decompresisone-1.mp3` | **0,677** (dominante) |
| `decompresisone-2.mp3` | 0,362 |
| `decompresisone.mp3` | 0,297 |

Presente su 4 file su 4, dominante su 2. Ma il prezzo è che `pressureTrend`
non è quasi mai `stable`: il tempo residuo per i respiri è **≈ 0 % su quasi
tutto il corpus** (es. `respiro-profondo-1`: pressurized 0,470 +
decompression 0,529 = 0,999; `respiro-alto-0`: 0,585 + 0,414; `test-1`:
0,709 + 0,290). Nel baseline i livelli alto/profondo sono a loro volta
irraggiungibili.

**Regime experimental** (`constraint.direction`) — si assesta nei respiri,
ma non vede mai la decompressione, e il materiale di decompressione finisce
letto come respiro-alto (3 file su 4) o pressurized (1 su 4).

I due regimi si escludono: uno vede i passaggi e non le stasi, l'altro le
stasi e non i passaggi. Prendere la direzione dal `pressureTrend` del
baseline — che il clock experimental **ha già in mano** a ogni campione,
poiché incapsula `BrainBioPerceptionClock` — è il primo riuso da valutare per
la regola anti-sovrastrutturazione, ed è escluso da questo stesso dato:
porterebbe il tempo di respiro a zero, cioè riprodurrebbe esattamente il
problema dei «42 cambi in 322s» per cui il regime experimental è nato.

## 3. «Il respiro alto parte troppo spesso con gli alti» — riprodotto

Il rilievo dal vivo è riprodotto sul corpus. Nel regime experimental l'asse
alto/profondo è predetto quasi monotonamente dall'energia media di banda
`high`:

| Banda `high` media | Stato dominante |
|---|---|
| ≤ 0,12 (`respiro-profondo`, `-1`, `respirto-profondo-3`) | respiro-profondo, 3 su 3 |
| ≥ 0,26 (9 file) | respiro-alto dominante in 8 su 9 |

`ALTO_CONSTRAINT_THRESHOLD = 0.18` su `constraint` funziona di fatto come un
rilevatore di alti, perché `eventActivity` somma gli onset delle quattro
bande a peso uguale e `recurrence` correla le quattro bande a peso uguale:
charleston, ride e shaker sono la sorgente di onset più densa e più regolare
di questo materiale, quindi gonfiano entrambi i fattori di `constraint`.

**Una ritaratura della sola soglia non può separare il corpus.** Le medie di
`constraint` si sovrappongono: `decompresisone` 0,2945 sta *sopra*
`respiro-alto-1` 0,2113 e `respiro-alto-3` 0,2357. Nessuna soglia singola
divide i falsi positivi dai veri respiri alti.

## 4. Varianti provate e scartate

`physicalConfirmation` — correlazione al periodo rilevato ristretta a
`low`+`lowMid` — è già calcolata a ogni finestra, già esposta nelle
diagnostiche, e **non è usata né in `constraint` né nella
classificazione**. È il candidato naturale della regola
anti-sovrastrutturazione: risponde esattamente alla domanda «questa griglia
è radicata nelle bande del corpo o è solo lavoro sugli alti?». Sulle medie
separa i falsi positivi (0,203–0,292) dai respiri alti genuini
(0,397–0,510).

Provata come ancoraggio graduato della costrizione,
`constraint = anchor · √eventActivity · (f + (1-f) · physicalConfirmation)`,
in quattro combinazioni, replay completo sul corpus per ognuna:

| Variante | Decompressione rilevata | Asse alto/profondo |
|---|---|---|
| `f=0.4`, soglia 0,12 | 0 su 4 | corpus invariato; `decompresisone-2` → respiro-profondo |
| `f=0.4`, soglia 0,14 | 0 su 4 | `respiro-alto-1` scende a 0,53 |
| `f=0`, soglia 0,07 | 0 su 4 | `decompressione-5` → respiro-alto 0,54 |
| `f=0`, soglia 0,09 | 0 su 4 | **rompe `respiro-alto-1`** → respiro-profondo 0,48 |

Nessuna variante produce `decompression` su alcun file, e nessuna separa
l'asse alto/profondo: i falsi positivi non passano allo stato corretto, si
limitano a oscillare fra respiro-alto e respiro-profondo, mentre
`respiro-alto-1` — che `assert-regime-corpus.mjs` richiede dominante ≥ 0,6 —
si degrada. L'ipotesi è **scartata e non portata al runtime**.

Il controllo di validità dell'harness è passato: con `f=1` (nessun
ancoraggio) riproduce esattamente la baseline misurata
(`respiro-alto-1`: respiro-alto 0,63, `constraint` 0,2113).

## 5. `decompressione-5.mp3` non può certificare una taratura

Dura **20,9s**, il file più corto del corpus, contro una finestra di memoria
`WINDOW_MS` di 8s più la salita dell'ancoraggio. Conseguenza misurata: 45,6 %
del file è strutturalmente `unresolved`, e il 46,4 % di `pressurized` è
l'ancoraggio che esce dal proprio avvio a freddo, non il materiale — la
timeline lo mostra a bande piatte (`constraint` 0,035 → 0,31 fra t=8s e
t=13s mentre `low` e `high` non cambiano). La decompressione udibile cade
negli ultimi ~0,5s (`low` 0,319 → 0, `high` 0,244 → 0), quando il confronto a
6s di ritardo non ha più file davanti a sé.

Per entrare nel corpus probatorio della decompressione il campione dovrebbe
essere di almeno ~40s, o il metodo di replay dovrebbe dichiarare
esplicitamente il tempo di avvio come non valutabile.

## 6. Rilievo collaterale: `pressurized` all'avvio su tutti i 16 file

Lo stesso avvio a freddo produce un artefatto di runtime, non solo di
collaudo: appena la memoria diventa `ready`, `anchor` sale da zero e la
direzione legge `rising` per ~9s **indipendentemente dal materiale**.
`ANCHOR_WARMUP_GRACE_MS` (1.500ms) copre solo il primo sesto di quella
salita. Visibile su tutti i 16 file: quota `pressurized` fra 0,108 e 0,464,
sempre in apertura. Dal vivo significa che ogni avvio di sessione — e ogni
ripresa dopo un vuoto che svuota la finestra — dichiara una pressurizzazione
che non c'è.

## 7. Cosa resta da decidere, e a chi

La definizione dell'osservabile della decompressione è lettura
audio-percettiva: compete al Capo Supremo dell'Analisi Audio, non
all'implementazione. I dati sopra circoscrivono la domanda senza risolverla:

- serve un osservabile che **scenda** quando la materia viene sottratta,
  mentre `constraint` per costruzione sale;
- il `pressureTrend` del baseline scende correttamente ma non si assesta mai:
  usato così com'è azzera i respiri;
- la soglia alto/profondo non è separabile su `constraint` così com'è
  definita, né ancorandola a `physicalConfirmation`.

Fino a quella decisione nessun peso, soglia, banda, detector o
`classifyLevel` è stato modificato.

## Metodo e riproducibilità

Harness di sessione, fuori dal runtime, in scratchpad: replay del corpus con
dump per file delle quote di regime di entrambi i regimi e delle osservabili
(`constraint`, `anchor`, `recurrence`, `physicalConfirmation`,
`eventActivity`, `cyclePersistence`, `configurationPersistence`,
`settlementEvidence`, `perceptualPressure`, bande), più una modalità timeline
per finestra di analisi. Le varianti girano su copie parametrizzate dei
moduli, mai sui sorgenti di produzione.
