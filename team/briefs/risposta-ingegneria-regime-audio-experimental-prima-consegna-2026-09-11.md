# Risposta Ingegneria — Regime Audio `experimental`, prima consegna

> **Destinatario:** Vice Consigliere del Capo Supremo  
> **Data:** 11 settembre 2026  
> **Stato:** prima rappresentazione osservabile; classificazione non ancora autorizzata

## ARCHITETTURA EXPERIMENTAL

`BrainBioPerceptionExperimentalClock` possiede ora una memoria temporale
autonoma. Continua a ricevere lo stesso ingresso della baseline, ma non ne
modifica stato, segnali o tarature. La baseline continua a produrre il
contratto pubblico; il nuovo stato interno è esposto separatamente da
`getExperimentalDiagnostics()`.

Il Visual è intenzionalmente scollegato: `bioPerceptionSource` e
`bioRegimeReasonSource` continuano a restituire la baseline anche quando la
modalità selezionata è `experimental`. Il logger 1 Hz registra invece anche
la diagnostica sperimentale, per il collaudo reale.

## SEGNALI RIUTILIZZATI

- quattro bande `low`, `lowMid`, `mid`, `high`, mantenute distinte;
- fronti positivi delle quattro bande come eventi materiali;
- timestamp Audio già disponibile;
- `bandTransients`, `beatPhase`, `beatPulse`, `kickEnvelope` e clock restano
  disponibili nel confronto A/B, ma non sono assunti come autorità: il corpus
  ha mostrato zero beat del clock nei due campioni Respiro Alto.

Baseline `rhythmConstraint`, `perceptualPressure`, `classifyLevel` e
`pressureLanded` non sono stati modificati.

## MEMORIA TEMPORALE

Finestra circolare di 8 secondi, quantizzata a 25 ms. Ogni cella conserva:

- materia corrente per ciascuna banda;
- fronte d'attacco per ciascuna banda.

L'analisi avviene ogni 500 ms. I gap vengono rappresentati esplicitamente,
senza trasformare un singolo pacchetto tardivo in esperienza accumulata.
L'ancoraggio ha attacco e rilascio distinti e conserva se sia comparso,
perso o recuperato.

## ORGANIZZAZIONE RITMICA

L'organizzazione è osservata come ricorrenza temporale multibanda, non come
conteggio di kick o transienti. Il periodo candidato viene cercato fra 240 e
1200 ms tramite correlazione normalizzata dei fronti. La materia resta
vettoriale: non viene compressa preventivamente in una quantità acustica.

## ENTRAINMENT

La ricorrenza propone una previsione temporale. La conferma fisica viene
letta separatamente sulla relazione `low`/`lowMid` allo stesso periodo. La
previsione non basta: i cicli vengono segmentati e confrontati come firme di
materia più distribuzione in otto fasi.

## ANCORAGGIO

L'ancoraggio nasce soltanto quando ricorrenza e persistenza inter-ciclo sono
entrambe presenti. È una memoria continua con comparsa, consolidamento,
perdita e recupero; un evento isolato non la attiva.

## COSTRIZIONE

Prima rappresentazione, non formula finale: presa temporale persistente
moltiplicata per la quota di attività realmente organizzata nella finestra.
Non è `rhythmConstraint v3`: non somma pulse, low-end e gridDensity e non usa
i pesi della baseline. Una traiettoria separata osserva crescita, stabilità e
cessione della presa.

Sul corpus nominato disponibile:

- C03 (`respiro-alto-0`): costrizione media **0,351**;
- C04 (`respiro-profondo`): **0,109**;
- C06 (`respiro-alto-1`): **0,252**.

La prima rappresentazione soddisfa quindi `C03 > C04` e `C06 > C04` senza
usare il nome del file nella misura.

## ASSESTAMENTO

È mantenuto distinto dal livello: confronto materiale fra cicli successivi
e persistenza della configurazione fra le due metà della finestra. Una
periodicità non diventa automaticamente assestamento.

Il caso reale `test-1.mp3` resta però aperto: ricorrenza e persistenza
inter-ciclo risultano ancora alte. Il discriminante sintetico riconosce una
migrazione fra cicli, ma il corpus dimostra che non basta ancora a evitare il
falso respiro reale. Per questo nessun regime sperimentale è stato emesso e
nessuna soglia di classificazione è stata promossa.

## CORPUS

- Mappa verificata: C03=`respiro-alto-0`, C04=`respiro-profondo`,
  C06=`respiro-alto-1`.
- C02, C08 e C09: la corrispondenza con i file non è conservata nel
  repository. I file nominati di pressurizzazione, decompressione e respiro
  sono stati comunque elaborati tutti nello stesso confronto A/B.
- `test-1.mp3`: elaborato, limite di assestamento registrato.

## LIMITI

- `test-1.mp3` non è ancora discriminato come trasformazione bidirezionale
  dalla sola memoria inter-ciclo corrente;
- la direzione della costrizione è una prima traiettoria diagnostica, non
  ancora certificata su C02/C09 perché la loro mappa manca;
- nessuna classificazione finale e nessun collegamento Visual;
- la finestra da 8 s e le costanti di memoria sono valori iniziali di
  osservazione, non tarature percettive definitive.

## NUOVE ENTITÀ

- `ExperimentalBin`: necessaria per conservare materia e fronti separati nel
  tempo;
- `ExperimentalMotorDiagnostics`: necessaria per rendere verificabili
  organizzazione, entrainment, ancoraggio, costrizione e assestamento senza
  alterare il contratto della baseline.

Nessun nuovo stato del vocabolario e nessun nuovo score nominale di
ballabilità, groove o libertà motoria.
