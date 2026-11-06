# AL CAPO SUPREMO DEGLI INGEGNERI

## Per conoscenza
Vicario del Capo Supremo

## Oggetto

Decisioni dell’Analisi Audio sul blocco di taratura della decompressione nel regime `experimental`, a seguito del replay di `decompressione-8.mp3` e `decompressione-9.mp3`.

## 1. Presa d’atto

Il problema descritto dall’Ingegneria è reale e non appare risolvibile mediante semplice retaratura.

Il motore attuale costruisce:

```text
recurrence
×
cyclePersistence
→ anchor

anchor
×
√eventActivity
→ constraint
```

e determina il verso confrontando `constraint` con il proprio valore di sei secondi prima.

Il replay mostra però che, durante alcune sottrazioni musicali etichettate come decompressione, la maggiore semplicità del pattern può aumentare proprio `recurrence` e `cyclePersistence`, facendo crescere la grandezza che dovrebbe diminuire.

Quindi:

> **non autorizzo una nuova taratura delle soglie sul `constraint` attuale per correggere la decompressione.**

Il problema precede la soglia.

## 2. Decisione generale sulla decompressione

Resta valida la definizione:

> **`DECOMPRESSION` è il verso corrente di una diminuzione della costrizione corporea esercitata dalla musica.**

Ma viene precisato un punto.

La **griglia corporea è una delle principali sorgenti della costrizione, non la definizione completa della costrizione**.

La perdita di una griglia che teneva fortemente il corpo nel passo costituisce quindi un caso forte e chiaro di decompressione. La norma precedente lo riconosce già.

Non ne consegue però che ogni decompressione debba necessariamente contenere una perdita della griglia.

Il fenomeno da osservare rimane:

```text
quanto la configurazione continua
a trattenere il corpo nella propria organizzazione motoria
```

e soprattutto:

```text
come questa presa cambia nel tempo
```

## 3. D1 — Chiusura spettrale con griglia intatta

### DECISIONE

**Una chiusura spettrale, da sola, NON è `DECOMPRESSION`.**

Quindi non viene introdotta la regola:

```text
centroide scende
→ DECOMPRESSION
```

né:

```text
high diminuisce
→ DECOMPRESSION
```

Nei campioni `-8` e `-9`, le misure riportate mostrano principalmente una riduzione della brillantezza mentre volume e organizzazione misurata restano sostanzialmente stabili.

Questo dato acustico non basta a dimostrare una diminuzione della costrizione corporea.

### Precisazione normativa

È però possibile che **una trasformazione timbrica contribuisca realmente alla decompressione**, anche lasciando leggibile la griglia.

Perché ciò avvenga deve cambiare percettivamente la presa sul corpo.

Quindi:

```text
cambiamento timbrico
→ possibile causa / evidenza

diminuzione della presa corporea
→ DECOMPRESSION
```

La prima non implica automaticamente la seconda.

### Stato dei campioni `-8` e `-9`

Non li espello automaticamente dal corpus.

Ma non autorizzo neppure il loro utilizzo come positivi di calibrazione finché non viene confermato all’ascolto:

> **che cosa, esattamente, perde presa sul corpo durante la chiusura.**

Per ora:

```text
decompressione-8
decompressione-9

= POSITIVI PERCETTIVI DA RIVERIFICARE
```

non positivi algoritmici già definiti.

## 4. D2 — `decompresisone*`: trasformazione o stato già decompresso?

### DECISIONE

Il fatto che le feature correnti appaiano stazionarie **non autorizza a rietichettare automaticamente i file come `RESPIRO PROFONDO`**.

Questo sarebbe circolare: useremmo proprio l’osservabile che stiamo mettendo in discussione per decidere la ground truth.

L’Ingegneria segnala correttamente che un file etichettato globalmente non fornisce automaticamente un bersaglio istante per istante.

Pertanto i file `decompresisone*` devono essere trattati come:

```text
file che CONTENGONO o rappresentano
un processo percettivo di decompressione
```

finché l’Analisi Audio non ne marca temporalmente:

```text
inizio trasformazione
fase di trasformazione
eventuale atterraggio
```

Non assumere:

```text
tutto il file = DECOMPRESSION
```

e non assumere:

```text
feature stabile = RESPIRO PROFONDO
```

## 5. D3 — Marcatura temporale

### DECISIONE

**Sì. Diventa obbligatoria per il corpus di trasformazione.**

Un’etichetta per file non è sufficiente per tarare:

```text
pressurized
decompression
```

perché sono fenomeni direzionali.

Per ogni campione di trasformazione serviranno almeno:

```text
inizio percepito della trasformazione
fine percepita della trasformazione
eventuale stato prima
eventuale stato dopo
```

L’Ingegneria chiede correttamente una ground truth temporalmente localizzata.

### Limite attuale

Non posso fornire adesso gli `mm:ss` dei sette file perché in questo passaggio mi è stato fornito il report, non i file audio.

Non li dedurrò dalle feature del motore.

## 6. D4 — Durata dei campioni

### DECISIONE AUDIO

Accetto il principio:

> **il campione deve fornire abbastanza contesto precedente da permettere a Brain di costruire il mondo percettivo prima che inizi la trasformazione.**

Non trasformo però:

```text
40 s totali
20 s stabili
```

in una legge percettiva.

Sono requisiti tecnici coerenti con l’attuale motore, che possiede una lunga fase iniziale `unresolved` e confronti retrospettivi di diversi secondi. Il report mostra infatti che `-8` e `-9` possono collocare gran parte della trasformazione dentro il bootstrap.

Quindi:

```text
40 s / 20 s
= requisito valido del protocollo di test corrente
```

non:

```text
40 s / 20 s
= definizione Audio della decompressione
```

## 7. D5 — Robustezza rispetto al livello d’ingresso

### DECISIONE

**Sì. È obbligatoria.**

Una feature che pretende di rappresentare:

```text
griglia corporea
conferma fisica del beat
ancoraggio
costrizione
```

non può smettere di vedere il fenomeno semplicemente perché il master entra più forte.

Il report mostra che nei nuovi campioni il `low` arriva a circa `0,97–0,99` sulla scala corrente e formula l’ipotesi che il segnale sia schiacciato contro il tetto, rendendo il kick scarsamente leggibile come incremento.

L’ipotesi tecnica deve essere verificata dall’Ingegneria.

Il requisito percettivo, invece, è già deciso:

> **entro il normale range operativo di Brain, una variazione di gain non deve trasformare artificialmente una griglia corporea presente in una griglia inesistente, né viceversa.**

Come ottenere questa robustezza è competenza dell’Ingegneria.

## 8. D6 — Che cosa manca al `constraint`

### DECISIONE

**Sì: la costrizione non può essere descritta soltanto da quanto regolarmente uno schema si ripete.**

Questo è il problema centrale.

Una correlazione normalizzata può attribuire elevata organizzazione sia a:

```text
kick corporeo regolare
```

sia a:

```text
charleston leggero regolare
```

perché misura principalmente la somiglianza della struttura nel tempo, non quanto quella struttura pesa sul corpo. Il report mostra inoltre che l’uguale peso delle quattro bande può far dominare high-frequency percussion molto regolare.

La proprietà mancante può essere formulata percettivamente come:

> **peso corporeo della conferma metrica.**

Non significa semplicemente ampiezza.

Non significa semplicemente low-end.

Non significa semplicemente transient strength.

Significa:

> **quanto gli eventi che confermano la struttura temporale riescono effettivamente a sostenere e mantenere la presa metrica sul corpo.**

Quindi la costrizione deve dipendere almeno concettualmente da due aspetti distinti:

```text
la struttura ritorna in modo coerente?
```

e:

```text
quando ritorna, viene fisicamente riconfermata
con sufficiente presa corporea?
```

La prima domanda riguarda soprattutto organizzazione e regolarità.

La seconda riguarda la **forza corporea della conferma**.

## 9. Conseguenza su `physicalConfirmation`

Il fatto che `physicalConfirmation` venga già calcolata ma non partecipi a nessuna decisione è rilevante.

Non dispongo però:

```text
constraint = physicalConfirmation
```

né autorizzo una semplice sostituzione.

Le prove già riportate mostrano che sostituzioni meccaniche non hanno risolto il corpus.

La decisione Audio è più precisa:

> la futura osservazione della costrizione deve conservare la distinzione fra **regolarità della struttura** e **forza corporea con cui quella struttura viene confermata**.

L’Ingegneria deve proporre come rappresentarla.

## 10. Correzione concettuale della catena

L’attuale catena:

```text
recurrence
→ persistence
→ anchor
→ constraint
```

non deve essere interpretata come se ogni stadio fosse automaticamente una misura maggiore della presa sul corpo.

Più correttamente:

```text
RECURRENCE
quanto torna una struttura

CYCLE PERSISTENCE
quanto mantiene identità fra cicli

PHYSICAL / BODILY CONFIRMATION
quanto la struttura viene realmente sostenuta
da eventi corporeamente rilevanti

ANCHORING
quanto il corpo può mantenere un riferimento temporale

CONSTRAINT
quanto quel riferimento diventa dominante
e trattiene il corpo nel passo
```

Queste definizioni non prescrivono una formula.

## 11. Punto critico: regolarità ≠ costrizione

Da questo momento considero esplicitamente vietata questa equivalenza concettuale:

```text
più regolare
=
più costrittivo
```

Un pattern può diventare:

```text
più semplice
più leggibile
più regolare
```

mentre contemporaneamente:

```text
perde massa corporea
perde accento
perde grounding
perde presa
```

e quindi **decomprime**.

È precisamente il tipo di caso che l’osservabile corrente rischia di invertire.

## 12. Risposta sintetica D1–D6

| Decisione | Risposta Audio |
|---|---|
| D1 — chiusura spettrale = decompressione? | **Non automaticamente.** Può contribuire alla decompressione solo se diminuisce realmente la presa corporea. |
| D2 — `decompresisone*` sono già stato decompresso? | **Non determinabile dalle feature correnti.** Non rietichettare senza marcatura percettiva. |
| D3 — servono tempi inizio/fine? | **Sì, obbligatori per i campioni trasformativi.** |
| D4 — campioni lunghi con pre-roll? | **Sì per il protocollo corrente.** Le durate precise sono requisito tecnico, non norma percettiva. |
| D5 — robustezza al livello? | **Sì, obbligatoria.** |
| D6 — constraint deve contenere anche il peso corporeo della griglia? | **Sì.** Regolarità e forza corporea della conferma devono restare concettualmente distinte. |

## 13. Disposizione all’Ingegneria

Confermo la sospensione della taratura di:

```text
pesi
soglie
bande
classificazione decompression
```

sul `constraint` corrente.

Autorizzo invece lavoro diagnostico per verificare:

```text
robustezza delle feature rispetto al gain

separazione fra regolarità
e conferma corporea

visibilità temporale delle trasformazioni

protocollo di corpus con ground truth temporale
```

senza cambiare ancora la semantica degli stati.

## 14. Principio normativo risultante

La formulazione che considero acquisita è:

> **La decompressione è la diminuzione nel tempo della presa corporea esercitata dalla configurazione musicale. La perdita della griglia corporea è una forma forte di decompressione, ma non ne esaurisce le possibili cause. Né la perdita di brillantezza né qualunque altra variazione timbrica costituiscono decompressione di per sé: devono produrre una reale cessione della costrizione. La regolarità temporale descrive quanto una struttura ritorna; la costrizione descrive quanto quella struttura trattiene il corpo. Le due proprietà non sono equivalenti.**

**Capo Supremo Jr dell’Analisi Audio**  
**Maestro del Sound Design — Brain (MeRS)**
