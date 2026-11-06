# AL CAPO SUPREMO DEGLI INGEGNERI

## Per conoscenza
Vicario del Capo Supremo

## Oggetto

Autorizzazione all’apertura di `PIANO-059` — diagnostica decompressione `experimental`.

La proposta è approvata nel perimetro indicato:

```text
diagnostica
corpus
replay
studio delle feature
```

senza:

```text
modifica degli stati
nuove soglie runtime
nuovi pesi runtime
retuning del classificatore
```

Il brief precedente richiede effettivamente ground truth temporale per le trasformazioni e separazione fra regolarità e peso corporeo della conferma.

## 1. Protocollo del corpus con marcature

APPROVATO.

È il primo lavoro da eseguire.

Per i campioni trasformativi la ground truth non può più essere:

```text
file = decompressione
```

ma deve diventare almeno:

```text
stato precedente
inizio trasformazione
fine trasformazione
stato successivo
```

### Vincolo

Se le marcature sono assenti:

```text
expected = UNKNOWN
```

Il replay può funzionare tecnicamente, ma quella regione non deve:

```text
contare come corretta
contare come errata
entrare in accuracy
entrare in score
```

Deve risultare semplicemente:

```text
NON ANNOTATA
```

Questo evita che l’assenza di ground truth diventi implicitamente una conferma del motore.

## 2. Chi marca i campioni

La ground truth percettiva appartiene all’**Analisi Audio**.

Quindi:

```text
Ingegneria
→ prepara formato e strumenti

Analisi Audio
→ assegna le marcature percettive
```

L’Ingegneria non deve dedurre le marcature dalle feature.

Non deve dedurle dal filename.

Non deve dedurle dallo stato attualmente emesso.

Quando i file sono disponibili all’Analisi Audio, verranno marcati all’ascolto.

Per i casi ambigui è ammesso:

```text
confidence = media / bassa
```

oppure una regione:

```text
unresolved-ground-truth
```

piuttosto che forzare una precisione inesistente.

## 3. Robustezza al guadagno

APPROVATO come esperimento diagnostico.

Il range proposto:

```text
-18 dB → +12 dB
```

può essere utilizzato per stressare le feature.

Ma serve una distinzione fondamentale.

### Ciò che vogliamo rendere robusto

Il sistema deve essere robusto a:

> **variazioni del livello tecnico con cui lo stesso identico segnale arriva a Brain.**

Per esempio:

```text
stesso brano
stessa struttura
stessa dinamica interna
diverso gain della catena d’ingresso
```

Non vogliamo che questo trasformi artificialmente:

```text
griglia presente → griglia assente
```

o viceversa.

### Ciò che NON vogliamo cancellare

Non disponiamo:

```text
ampiezza non conta
```

né:

```text
tutto deve essere completamente gain-invariant
```

La quantità e il peso degli eventi possono avere significato percettivo.

Quindi bisogna distinguere:

```text
GAIN TECNICO DELL’INGRESSO
```

da:

```text
DINAMICA MUSICALE INTERNA
```

La prima è una nuisance variable.

La seconda può essere informazione.

## 4. Vincolo sul test di gain

Il test deve controllare che l’applicazione del gain non introduca:

```text
clipping
limiting
compressione
normalizzazione ulteriore
```

altrimenti non staremmo più confrontando lo stesso segnale a livelli differenti.

Se una parte del range produce clipping, quella regione deve essere segnalata separatamente e non utilizzata per giudicare l’invarianza della feature.

## 5. Output richiesto per il test gain

Per ogni feature significativa voglio vedere almeno:

```text
variazione al cambiare del gain
stabilità della traiettoria temporale
eventuali saturazioni
eventuali collassi degli onset
eventuali inversioni qualitative
```

In particolare per:

```text
recurrence
cyclePersistence
physicalConfirmation
eventActivity
anchor
constraint
```

Non serve ancora decidere come correggerle.

Prima voglio sapere quali sono realmente sensibili al gain e in quale modo.

## 6. Regolarità contro conferma corporea

APPROVATO come studio e proposta tecnica.

L’Ingegneria deve proporre un osservabile candidato per ciò che l’Audio ha definito:

> **peso corporeo della conferma metrica.**

Ma la proposta non deve partire dalla conclusione:

```text
più low-end = più conferma
```

oppure:

```text
più ampiezza = più conferma
```

oppure:

```text
physicalConfirmation attuale = soluzione
```

Queste sono ipotesi da verificare.

## 7. Forma richiesta della proposta tecnica

Per ogni candidato:

```text
CHE COSA MISURA FISICAMENTE

PERCHÉ POTREBBE RAPPRESENTARE
LA CONFERMA CORPOREA

DA QUALI FEATURE DIPENDE

COME REAGISCE AL GAIN

QUALI CAMPIONI DEL CORPUS DISCRIMINA

DOVE FALLISCE

QUAL È IL CONTROESEMPIO
```

Il controesempio è obbligatorio.

Non voglio una feature che funziona soltanto sui campioni scelti per dimostrarla.

## 8. Rapporto con `physicalConfirmation`

`physicalConfirmation` va incluso nell’analisi perché esiste già ed è diagnostico.

Ma resta:

```text
CANDIDATO / EVIDENZA
```

non:

```text
DEFINIZIONE DELLA CONFERMA CORPOREA
```

Il report precedente mostra già che la sua sostituzione meccanica nell’ancoraggio non ha risolto la decompressione.

## 9. Campioni lunghi

APPROVATA la richiesta.

Per il motore attuale:

```text
~40 s totali
~20 s di materiale precedente stabile
```

è un protocollo di test ragionevole perché permette alla trasformazione di avvenire dopo il bootstrap.

Il report mostra che nei campioni corti la trasformazione può cadere dentro la fase iniziale `unresolved`, rendendola di fatto inosservabile al regime.

Ribadisco:

```text
40 s / 20 s
= requisito del test corrente
```

non:

```text
40 s / 20 s
= proprietà percettiva della decompressione
```

## 10. Non bloccare PIANO-059 sui nuovi campioni

I campioni lunghi migliorano il corpus ma non sono prerequisito per iniziare.

L’Ingegneria può procedere subito con:

```text
schema delle annotazioni
harness temporale
gain sweep
diagnostica delle feature
studio regolarità/conferma corporea
```

usando il corpus esistente.

Le parti prive di ground truth temporale devono semplicemente rimanere non valutabili.

## 11. Ordine operativo autorizzato

```text
FASE 1
schema ground truth temporale
+
supporto harness

FASE 2
gain sweep delle feature attuali

FASE 3
misura delle failure mode

FASE 4
proposta tecnica:
regolarità vs conferma corporea

FASE 5
revisione Audio

FASE 6
solo dopo approvazione:
eventuale esperimento implementativo
```

## 12. Cosa non autorizzo ancora

Non autorizzo:

```text
nuovo constraint

nuova formula di anchoring

nuovo peso di banda

nuova soglia di decompressione

centroid come detector di decompressione

spectral brightness come detector di decompressione

normalizzazione runtime definitiva

modifica della classificazione
```

Tutto questo viene dopo la diagnostica.

## 13. Decisione

`PIANO-059` può essere aperto immediatamente.

Il punto 1 può partire subito.

Il punto 2 può partire subito come esperimento offline controllato.

Il punto 3 può produrre una proposta, ma non entra in runtime senza nuova decisione Audio.

Il principio da preservare durante tutto il piano è:

> **Non stiamo cercando una feature che “faccia uscire DECOMPRESSION”. Stiamo cercando di capire quali osservabili descrivano correttamente la differenza fra una struttura che si ripete e una struttura che continua realmente a esercitare presa sul corpo.**

**Capo Supremo Jr dell’Analisi Audio**  
**Maestro del Sound Design — Brain (MeRS)**
