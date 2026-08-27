# Brief Audio — Persistence, Change, Residual, Perceptual Pressure

# Destinatari

Capo Supremo degli Ingegneri
Capo Supremo del Visual Design

# Obiettivo

Integrare in Brain una lettura audio-percettiva più evoluta senza ristrutturare la pipeline audio esistente e senza sostituire la reattività Visual Reactive già presente.

L'obiettivo è permettere a Brain di distinguere due scale differenti:

**reattività locale**
beat, transient, phase, band energies, kick envelope e altri segnali continuano a guidare il comportamento immediato dei renderer;

**stato percettivo**
una lettura più lenta descrive se la configurazione musicale sta permanendo, si sta trasformando, sta lasciando una traccia oppure sta aumentando o diminuendo la propria pressione percettiva.

Il sistema audio attuale resta quindi la base del funzionamento. Il nuovo livello deve utilizzare per quanto possibile ciò che Brain produce già oggi.

# 1. Principio fondamentale

Brain non deve interpretare la musica come una successione:

`build-up → climax → drop → rilascio`

Il materiale musicale può attraversare stati differenti senza che uno sia la preparazione narrativa del successivo.

La grammatica percettiva di riferimento è:

`stato`

→ `variazioni locali`

→ `eventuale perdita di coerenza`

→ `riorganizzazione`

→ `nuovo stato`

oppure semplicemente:

`stato`

→ `modificazione del metabolismo interno`

→ `stesso stato`

Il Visual ha già formalizzato questa distinzione fra animazione interna dello stato e trasformazione dello stato visivo stesso.

# 2. Vincolo sul sistema esistente

Non viene richiesta una revisione generale di:

* acquisizione audio;
* bande esistenti;
* smoothing;
* beat detection;
* transient detection;
* `beatPhase`;
* `beatPulse`;
* `kickEnvelope`;
* `active`;
* flash engine;
* trasporto IPC;
* reattività locale dei renderer.

Il clock ritmico mantiene la propria responsabilità attuale.

Il nuovo livello rappresenta una lettura ulteriore e più lenta del comportamento musicale.

# 3. Che cosa deve descrivere l'Audio

Uno stato musicale non coincide con una singola feature.

Non è:

`BPM`

`energia`

`low`

`transient`

`beat`

`volume`

È una configurazione coerente del comportamento musicale nel tempo.

Il dominio Audio deve quindi descrivere:

**la configurazione musicale corrente continua a essere percettivamente la stessa?**

**sta progressivamente cambiando?**

**quello che la precedeva continua ancora a lasciare una traccia?**

**la sua pressione percettiva sta aumentando, rimanendo stabile oppure diminuendo?**

# 4. Persistence

`persistence` descrive quanto la configurazione corrente continua ad appartenere allo stesso stato percettivo.

Una persistence alta non significa assenza di movimento.

La musica può contenere:

* beat;
* transient;
* oscillazioni energetiche;
* variazioni di densità;
* variazioni timbriche locali;

e continuare comunque a sostenere lo stesso stato.

Il concetto serve soprattutto a evitare che un'elevata attività musicale venga interpretata automaticamente come necessità di cambiare mondo visivo.

# 5. Change

`change` descrive quanto la configurazione musicale corrente sta progressivamente perdendo coerenza rispetto allo stato precedente.

Non equivale a un transient.

Non significa:

`esegui una transizione`.

Può crescere attraverso modificazioni lente:

* densità;
* distribuzione spettrale;
* periodicità;
* organizzazione ritmica;
* comportamento energetico;
* rarefazione;
* trasformazioni persistenti.

Il significato è:

**lo stato precedente descrive sempre meno adeguatamente ciò che sta accadendo.**

# 6. Residual

`residual` descrive quanto lo stato precedente continua a essere percettivamente presente dopo una riduzione, una rarefazione o una trasformazione del materiale.

Il concetto impedisce l'equivalenza:

`silenzio = reset`

Lo stato `active` conserva il proprio significato tecnico e ritmico attuale.

`residual` appartiene invece alla memoria percettiva.

Una perdita di attività può quindi fermare correttamente il clock ritmico senza cancellare immediatamente la presenza dello stato precedente.

# 7. Perceptual Pressure

Il brief Visual ha introdotto una seconda necessità: riconoscere quando la musica continua a occupare fortemente lo spazio percettivo e quando invece comincia a lasciarlo respirare.

Introduciamo quindi una sola nuova dimensione qualitativa:

`perceptualPressure`

Essa descrive quanto il comportamento musicale esercita complessivamente una condizione di:

* densità;
* pressione;
* contrazione;
* presenza;
* occupazione percettiva.

Non coincide con l'energia.

Possiamo avere:

`energia alta + pressione ridotta`

oppure:

`energia moderata + pressione molto elevata`.

La pressione deve quindi essere interpretata come proprietà complessiva del comportamento musicale nel tempo.

# 8. Pressure Trend

Oltre al livello di pressione interessa soprattutto la sua direzione:

`rising`

`stable`

`falling`

Questo consente di riconoscere una fase di apertura senza trasformarla in uno stato discreto obbligatorio.

Il concetto Visual di **respiro** non viene quindi rappresentato da un trigger:

`breath = true`

Può emergere, per esempio, da:

`persistence alta`

`change basso`

`pressureTrend falling`

Significato:

**la musica continua ad appartenere allo stesso stato, ma sta progressivamente lasciando spazio.**

Questa è una delle condizioni più importanti che il sistema attuale non descrive esplicitamente.

# 9. Bioenergetica

La bioenergetica viene utilizzata come riferimento fenomenologico, non come modello fisico dell'energia.

La filosofia di Brain assume come rilevanti fenomeni corporei quali respirazione, attivazione e tensione, reinterpretati attraverso embodied cognition, interocezione e modelli contemporanei della percezione.

Per questo lavoro il principio utile è:

**un organismo può essere contratto, denso, mobile, rarefatto, aperto o in recupero senza essere obbligato a seguire una traiettoria narrativa.**

Non viene quindi richiesta una macchina:

`carica → scarica → rilassamento`.

Il concetto operativo è invece quello di **metabolismo percettivo**.

# 10. Il concetto di respiro

Il respiro non è:

* silenzio;
* inattività;
* volume basso;
* assenza di beat;
* nuovo stato obbligatorio.

È un diverso modo della musica di occupare il tempo e lo spazio percettivo.

Può manifestarsi attraverso:

* minore densità;
* maggiore spazio fra eventi;
* riduzione della pressione;
* continuità maggiore;
* rarefazione;
* minore aggressività ritmica;
* stabilizzazione;
* dissoluzione progressiva della pressione precedente.

Dal lato Audio il requisito è quindi:

**distinguere la riduzione della pressione percettiva dalla semplice riduzione dell'energia.**

# 11. Modello percettivo complessivo

Il set minimo di informazioni proposto è:

`persistence`

`change`

`residual`

`perceptualPressure`

`pressureTrend`

Le prime tre descrivono la relazione temporale fra configurazioni.

Le ultime due descrivono il metabolismo interno dello stato corrente.

Queste due famiglie sono indipendenti.

Esempi:

`persistence alta`
`change basso`
`pressure alta`
`pressureTrend stable`

stesso stato, fortemente pressurizzato.

`persistence alta`
`change basso`
`pressureTrend falling`

stesso stato che comincia a respirare.

`change crescente`
`pressureTrend falling`

perdita di pressione dentro una trasformazione più ampia.

`residual alto`
`pressure bassa`

rarefazione con forte memoria dello stato precedente.

`change basso`
`pressureTrend rising`

lo stesso stato aumenta la propria pressione senza diventare necessariamente un nuovo stato.

# 12. Relazione con il Visual

Queste informazioni non devono diventare comandi.

Non valgono equivalenze come:

`persistence = resta`

`change = morph`

`residual = congela`

`pressure falling = rallenta`

Il Capo Supremo del Visual Design ha esplicitamente richiesto che queste rimangano informazioni percettive utilizzabili insieme allo stato Visual corrente, alla sua storia, al renderer, all'immagine e alla direzione artistica.

Il dominio Visual mantiene quindi integralmente la decisione su:

* renderer;
* palette;
* morph;
* velocità;
* densità;
* colore;
* Varco Percettivo;
* natura e magnitudine del cambio.

# 13. Relazione con il Visual Reactive Screen esistente

La reattività rapida resta invariata.

Un renderer può continuare a reagire a:

* beat;
* transient;
* kick;
* fase;
* bande.

La lettura percettiva interviene su una scala diversa.

Questo consente contemporaneamente:

**reattività locale intensa**

e

**identità Visual persistente**.

Oppure:

**reattività locale ancora presente**

ma

**metabolismo Visual progressivamente più respirato**.

Il Visual ha richiesto esplicitamente la convivenza fra scala rapida e scala lenta.

# 14. Cambio di stato

La lettura Audio non deve determinare direttamente il cambio di stato Visual.

Deve fornire informazioni sufficienti perché il Visual possa comprendere quando:

* lo stato musicale permane;
* la trasformazione è locale;
* la configurazione precedente sta perdendo validità;
* una nuova configurazione si sta stabilizzando;
* lo stato corrente sta semplicemente cambiando metabolismo.

Questo permette di ridurre la dipendenza percettiva del cambio di stato da:

* secondi trascorsi;
* cicli;
* rotazioni;
* contatori.

Tali strumenti possono continuare a esistere per motivi tecnici, ma non devono essere l'unica motivazione percettiva del cambiamento.

# 15. Riorganizzazione

Una fase con:

`change significativo`

e

`nuova persistence ancora debole`

può rappresentare una zona di riorganizzazione.

Dal lato Audio non viene assegnato alcun significato Visual specifico.

Il Visual può eventualmente interpretarla come:

* morph;
* contaminazione;
* Varco Percettivo;
* trasformazione materica;
* sovrapposizione fra organizzazioni.

Il Varco Percettivo rimane concettualmente il territorio nel quale il vecchio stato non domina più completamente e il nuovo non domina ancora completamente.

# 16. Rarefazione e recupero

La perdita di pressione non implica necessariamente un nuovo stato.

Possiamo avere:

`persistence alta`

e contemporaneamente:

`pressureTrend falling`.

Questo è il caso nel quale il Visual può restare nello stesso mondo ma modificarne il metabolismo.

È il punto centrale del brief Visual sul recupero.

Il sistema non deve quindi confondere:

**cambio di stato**

con

**cambio di pressione dentro lo stesso stato**.

# 17. Cosa non viene richiesto

Non viene richiesta:

* una nuova macchina a stati musicale;
* una classificazione emozionale;
* una nuova beat detection;
* una nuova interpretazione del BPM;
* una revisione delle bande;
* una revisione generale dello smoothing;
* la sostituzione di `active`;
* un trigger `recovery`;
* un trigger `breath`;
* un mapping diretto Audio → Visual;
* una grammatica build-up/drop;
* una ristrutturazione generale della pipeline audio.

# 18. Criteri funzionali di verifica

La soluzione è percettivamente utile se consente di distinguere credibilmente casi come questi.

### Caso A — Attività elevata, stato stabile

Molti transient, beat forte, energia alta.

Risultato:

`persistence alta`

`change basso`

La musica può continuare a spingere senza obbligare il Visual a cambiare mondo.

### Caso B — Stesso stato, perdita di pressione

La struttura generale permane ma il materiale comincia ad aprirsi.

Risultato:

`persistence alta`

`change basso`

`pressureTrend falling`

Il Visual può cambiare metabolismo senza cambiare necessariamente stato.

### Caso C — Trasformazione lenta

La configurazione musicale cambia progressivamente.

Risultato:

`persistence decrescente`

`change crescente`.

La trasformazione può essere riconosciuta anche senza transient spettacolare.

### Caso D — Rarefazione

Il segnale si riduce fortemente.

Risultato possibile:

`pressure bassa`

`residual alto`.

La memoria dello stato precedente rimane presente.

### Caso E — Intensificazione senza cambio di stato

La musica aumenta progressivamente la pressione mantenendo la stessa organizzazione.

Risultato:

`persistence alta`

`change basso`

`pressureTrend rising`.

L'intensificazione non viene confusa con una trasformazione di stato.

# 19. Criterio percettivo principale

La verifica più importante è questa:

**quando la musica apre realmente una fase di respiro, Brain smette di comportarsi come se fosse ancora sotto la stessa pressione senza perdere la propria continuità Visual?**

Parallelamente:

**quando la musica resta nello stesso stato ma aumenta o diminuisce di pressione, Brain riesce a modificare il proprio metabolismo senza trasformare automaticamente il proprio mondo?**

# 20. Sintesi delle responsabilità

## Analisi Audio

Descrive:

**«il modo di essere della musica permane, si trasforma o continua a lasciare una traccia?»**

e:

**«la pressione percettiva sta aumentando, rimane stabile oppure sta diminuendo?»**

## Visual Design

Decide:

**«questa informazione modifica il metabolismo del mondo corrente oppure richiede una riorganizzazione più profonda dello stato Visual?»**

## Ingegneria

Definisce autonomamente la soluzione tecnica, architetturale e implementativa necessaria a rendere disponibili queste proprietà nel sistema.

# Principio finale

Brain deve poter distinguere:

**cambiamento dentro uno stato**

da

**cambiamento dello stato**

e, all'interno dello stesso stato:

**pressione**

da

**respiro**.

La finalità non è aumentare la quantità di reattività.

È permettere a Brain di riconoscere **come la musica occupa il proprio spazio percettivo nel tempo** e fornire al Visual informazioni sufficienti per far cambiare metabolismo alla materia senza trasformare ogni variazione musicale in un nuovo evento.
