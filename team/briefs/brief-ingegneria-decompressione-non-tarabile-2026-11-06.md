# AL CAPO SUPREMO DELL'ANALISI AUDIO

## Oggetto

Perché la decompressione del regime `experimental` non si può tarare, e quale
decisione percettiva serve prima di qualunque intervento.

## Mittente e perimetro

Il Capo Supremo degli Ingegneri, su richiesta del Capo Supremo, dopo il replay
dei nuovi campioni `decompressione-8.mp3` e `decompressione-9.mp3`
(2026-11-06).

Questo documento:

- spiega il meccanismo con cui il motore oggi traduce la norma
  `AUDIO-REGIMI-POSTCOLLAUDO-01` sulla decompressione;
- mostra dove la traduzione e i campioni divergono;
- separa ogni volta **fatto misurato**, **interpretazione** e **ipotesi**;
- non propone formule né soglie: la definizione dell'osservabile è di tua
  competenza.

Non è stato modificato alcun codice. Audit preventivo dei deprecati: DEP-001 e
DEP-002 `NON COINVOLTO`.

Dati completi e metodo:
`working/calibration-v1/decompressione-8-9-replay-2026-11-06.md` e, per il
corpus precedente,
`working/calibration-v1/decompressione-conflitto-livelli-2026-10-07.md`.

---

## 1. L'esito in una riga

**Fatto misurato.** Sui 7 campioni etichettati decompressione, il regime
`experimental` (quello collegato al Visual) emette `DECOMPRESSION` per **0
secondi su 7 file**. Nessun valore delle soglie esistenti cambia questo esito,
per le ragioni dei §3–§6.

## 2. Cosa chiede la tua norma

Da `AUDIO-REGIMI-POSTCOLLAUDO-01`, riportato testualmente:

- §3: «`PRESSURIZED` e `DECOMPRESSION` descrivono il verso corrente della
  trasformazione della costrizione corporea» — «costrizione che diminuisce →
  `DECOMPRESSION`».
- §6: «La perdita consistente della griglia corporeamente sostenuta
  costituisce `DECOMPRESSION` anche con massa sonora elevata.»
- §6, l'inverso: «una sezione scarna con kick netto, low-end corporeo e
  griglia stabile può essere pienamente `RESPIRO ALTO`. Bassa densità non
  equivale a respiro profondo.»
- §12: «Breakdown denso → `RESPIRO ALTO → DECOMPRESSION → RESPIRO PROFONDO`».

Ne ricavo due proprietà, che sono una mia lettura della norma e non il suo
testo:

1. la decompressione è un **verso** (un processo nel tempo), non uno stato;
2. il suo luogo è **la griglia che tiene il corpo nel passo**, non la massa,
   il timbro o l'energia.

## 3. Come il motore traduce la norma oggi

**Fatto** (codice in `src/renderer/output/brain/brainBioPerceptionExperimental.ts`).

Catena, dal segnale alla decisione:

1. **Materia.** Bande `low` (40–160 Hz), `lowMid` (160–400), `mid`
   (400–2.000), `high` (2.000–8.000), lette da `getByteFrequencyData` con
   scala −90…−10 dB → 0…255. Raccolte in bin da 25 ms, finestra di memoria di
   8 s.
2. **Onset.** Per ogni banda, solo l'incremento positivo rispetto al bin
   precedente.
3. **Organizzazione.** `recurrence` = massima correlazione di Pearson degli
   onset con sé stessi a un ritardo fra 240 e 1.200 ms, sulle quattro bande a
   peso uguale. Il ritardo vincente è il periodo.
4. **Entrainment.** `cyclePersistence` = somiglianza fra cicli consecutivi
   (fino a 6) di quel periodo: energia media per banda + onset per ottavo di
   ciclo. `physicalConfirmation` = la stessa correlazione ristretta a `low` +
   `lowMid`: è calcolata e mostrata in diagnostica, ma **non entra in nessuna
   decisione**.
5. **Ancoraggio.** `anchor` = media mobile di `recurrence × cyclePersistence`
   (salita 2 s, discesa 4,5 s).
6. **Costrizione.** `constraint = anchor × √eventActivity`, dove
   `eventActivity` è la quantità media di onset per bin.
7. **Verso.** Si confronta `constraint` con il proprio valore di 6 s prima:
   se è sceso di più di 0,07 → `falling` → `DECOMPRESSION`; se è salito di
   più di 0,07 → `PRESSURIZED`; altrimenti si passa alla stasi.

Il motore resta `unresolved` per i primi ~9,5 s (8 s di finestra + 1,5 s di
grazia dell'ancoraggio), e ogni cambio di regime deve persistere 2 s.

## 4. Primo problema: `constraint` misura la regolarità, non la costrizione

**Interpretazione della formula**, confermata dalle misure del 7 ottobre.

Pearson e la somiglianza fra cicli sono misure **normalizzate**: tolgono
l'ampiezza e misurano solo quanto il disegno si ripete. Valgono 1 sia per un
kick pieno sia per un charleston isolato, purché siano regolari. L'unico
termine di quantità è `eventActivity`, e entra sotto radice quadrata.

Conseguenza: quando si sottrae materia e resta un pattern più semplice, il
pattern che resta è **più** ripetitivo, quindi `recurrence` e
`cyclePersistence` salgono. **Fatto misurato** il 7 ottobre: su
`decompresisone` `constraint` passa da 0,021 a 0,407, su `decompresisone-1` da
0,044 a 0,420, sempre in salita e mai in discesa.

L'osservabile che dovrebbe scendere nella decompressione, per come è
costruito, tende a salire proprio nella sottrazione che la norma descrive.

Aggravante, **fatto misurato** il 7 ottobre: gli onset delle quattro bande
pesano uguale, e charleston, ride e shaker sono la sorgente di onset più densa
e regolare. Così `constraint` funziona anche da rilevatore di alti: `high`
medio ≤ 0,12 → respiro-profondo 3 file su 3, ≥ 0,26 → respiro-alto 8 file su
9.

## 5. Secondo problema: nei nuovi campioni cambia il timbro, non la griglia

**Fatti misurati** su `decompressione-8` e `-9`.

Fuori dal motore (ffmpeg, medie su 2 s):

| | centroide spettrale | rolloff | RMS |
|---|---|---|---|
| `-8` | 3.790 Hz (0–8 s) → 2.395 Hz (12–14 s) | 8.970 → 5.737 Hz | −7/−8 dB, stabile |
| `-9` | ~1.900 Hz (0–14 s) → 1.056 Hz (20 s) | ~4.300 → 2.061 Hz | −7 dB, stabile fino all'ultimo secondo |

Dentro il motore, per tutta la durata:

- `low` 0,97–0,99, `lowMid` ~0,83, `mid` ~0,55: invariati;
- `high` da ~0,35 a ~0,27 sul solo `-9`, negli ultimi 5 s;
- `eventActivity` 0,31–0,36, `recurrence` 0,4–0,5, `cyclePersistence`
  ~0,96: invariati;
- periodo rilevato fisso a 275 ms su entrambi i file.

L'unica cosa che cambia è la brillantezza: lo spettro si chiude dall'alto,
a volume e griglia costanti. Che sia un filtro passa-basso che si chiude è una
mia **interpretazione della misura**, non verificata all'ascolto.

**Qui c'è il conflitto concettuale.** Se la decompressione sta nella griglia
(§6 della norma), una chiusura timbrica che lascia intatti kick, griglia e
volume non è una diminuzione della costrizione. Per l'inverso del §6
somiglia piuttosto a «griglia stabile» che resta in stasi. Eppure il Capo
Supremo ha etichettato questi file come decompressione.

Le possibilità sono due, e scegliere fra loro è una decisione percettiva:

- **(a)** la chiusura spettrale è una decompressione corporea reale, e la
  norma oggi non la copre (la costrizione non vive solo nella griglia);
- **(b)** la norma è giusta, e questi file contengono una decompressione
  timbrica che non va letta come `DECOMPRESSION`.

Nessuna taratura può scegliere al posto tuo: in (a) manca la grandezza, in (b)
il motore ha già ragione a non emettere `DECOMPRESSION`.

## 6. Terzo problema: i campioni non danno un bersaglio da tarare

**Fatti misurati.**

**Tre forme acustiche diverse sotto la stessa etichetta.** Medie su 5 s:

- `-8`, `-9`: chiusura spettrale a volume costante (§5);
- `-7`: centroide irregolare, RMS da −9 a −27 dB negli ultimi 6 s, cioè una
  dissolvenza di volume; la coda di `-5` cade negli ultimi ~0,5 s;
- `decompresisone`, `-1`, `-2`: centroide e volume stazionari per tutta la
  durata (es. `-1`: 605–710 Hz, −18 dB costanti).

**Interpretazione.** Il §3 definisce la decompressione come un verso. Un file
stazionario per 50 s non può essere un verso per tutta la sua durata: al più
contiene un passaggio breve in un punto che il nome del file non dice, oppure
è già lo stato decompresso, che la norma chiama `RESPIRO PROFONDO`.

**Perché questo blocca la taratura.** Tarare vuol dire spostare una soglia
finché l'uscita coincide con un'attesa. L'etichetta oggi è per file, mentre il
regime è deciso istante per istante. Senza sapere *da quando a quando* in ogni
file c'è la decompressione, non esiste un valore atteso con cui confrontare
l'uscita.

## 7. Quarto problema: in `-8` e `-9` la griglia corporea non è misurabile

**Fatto misurato.** La correlazione della griglia sulle sole bande corporee
(`physicalConfirmation`) è 0,00–0,06 su `-8` e 0,00–0,26 su `-9`, contro
~0,6 costanti su `decompresisone-1`. La periodicità `low` della baseline è
0,00 su `-8` e 0,03 su `-9`, contro 0,57 su `decompresisone-1`.

**Fatto.** I due file sono masterizzati molto più forte del resto del corpus
(RMS −7 dB contro −17/−25 dB). La scala di produzione (−90…−10 dB, la stessa
dell'harness) porta `low` a 0,97–0,99 per tutto il file.

**Ipotesi, non verificata.** `low` è schiacciata contro il tetto della scala:
il kick non produce più un incremento leggibile, quindi gli onset di `low`
spariscono e la griglia viene letta solo da `mid`/`high`. Se è così, su questo
livello d'ingresso il motore non può vedere né la presenza né la perdita della
griglia corporea, cioè proprio ciò che il §6 chiede di osservare. Dal vivo
dipende dal guadagno dell'ingresso audio. Rientra nella tua responsabilità di
robustezza rispetto alle variazioni del segnale, quindi la segnalo a parte.

## 8. Quinto problema: i campioni sono più corti dell'avvio

**Fatto.** Per i primi ~9,5 s il motore è `unresolved`, e il verso si legge
con un ritardo di 6 s.

- `-8` (14,9 s): la chiusura comincia verso 8 s, dentro il tratto
  `unresolved`. In replay è invisibile con qualunque osservabile.
- `-9` (20,9 s): la chiusura comincia verso 15 s, con soli ~5 s di materiale
  stabile visibile davanti, e quei 5 s sono occupati dalla salita
  dell'ancoraggio dall'avvio a freddo. Per questo entrambi i file escono
  `PRESSURIZED`: `constraint` sale da 0,01 a 0,28 senza che il materiale
  cambi.

## 9. Perché non si tara: riassunto

Una taratura funziona se valgono due condizioni. Qui non ne vale nessuna.

1. **La grandezza deve muoversi nel verso giusto, oltre il rumore.** Il calo
   massimo di `constraint` è 0,005 su `-9` e 0,009 su `-8` (durante la
   dissolvenza finale), mentre la soglia di verso è 0,07. Già a 0,05 si
   rompono `respiro-profondo.mp3` (dominanza da 47 s a 13,6 s) e
   `respiro-alto-3.mp3` (misura del 2026-09-13). Sui campioni lunghi
   `constraint` sale. Le quattro varianti con ancoraggio a
   `physicalConfirmation` provate il 7 ottobre hanno dato 0 decompressioni su
   4 file.
2. **Deve esistere un'attesa istante per istante.** Le etichette sono per
   file e coprono tre forme diverse (§6).

Non è una soglia sbagliata. L'osservabile e il fenomeno etichettato non sono
la stessa cosa, e la regola di `agents.md` dice: «Se un criterio non scatta
mai dal vivo, non va tarato: va rimosso» o ridefinito.

## 10. Decisioni che ti chiedo

Nessuna è stata presa. Le elenco con la conseguenza tecnica di ciascuna
risposta, senza raccomandarne una.

**D1 — La chiusura spettrale a griglia intatta (`-8`, `-9`) è
`DECOMPRESSION`?**

- Se sì: la norma va estesa oltre la griglia, e serve una grandezza di
  brillantezza letta con lo stesso confronto a 6 s. Oggi non esiste, perché
  `spectralOccupancy` della baseline è un'occupazione binaria per banda e con
  `high` a 0,27 la banda resta occupata. Sarebbe un osservabile nuovo, da
  disporre prima di implementarlo.
- Se no: i due file escono dal corpus della decompressione, o vengono
  rietichettati.

**D2 — I tre `decompresisone*` contengono un passaggio o sono già lo stato
decompresso?** Nel primo caso servono i tempi del passaggio; nel secondo
l'attesa corretta è `RESPIRO PROFONDO`, non `DECOMPRESSION`.

**D3 — Marcatura nel tempo.** Chiedo se il corpus di trasformazione debba
avere, per ogni campione, istante di inizio e di fine della decompressione
percepita. Senza questo nessuna soglia è verificabile.

**D4 — Durata.** Campioni di almeno ~40 s, con ~20 s di materiale stabile
prima della decompressione, perché il passaggio cada dopo l'avvio del motore.

**D5 — Livello d'ingresso.** Se l'ipotesi del §7 regge, la griglia corporea
non è misurabile su ingressi forti. Chiedo se la lettura della griglia debba
essere robusta al livello d'ingresso. È una questione di affidabilità delle
feature, prima che di classificazione.

**D6 — Il problema del §4.** Anche con D1–D5 risolte, `constraint` misura la
regolarità e non la quantità di costrizione. Chiedo se la definizione di
costrizione debba includere quanto pesa la griglia (ampiezza, banda), e non
solo quanto si ripete.

Finché non arrivano queste decisioni l'Ingegneria non tocca pesi, soglie,
bande né classificazione della decompressione.
