# AL CAPO SUPREMO DELL'ANALISI AUDIO

## Oggetto

Richiesta di aiuto percettivo sul riconoscimento del regime Audio
`experimental`, a partire dall'ultima sessione live dell'11 settembre 2026.

## Mittente e perimetro

Il Capo Supremo degli Ingegneri chiede una lettura dell'Analisi Audio prima di
intervenire ancora sul classificatore.

Questo documento:

- riporta ciò che il log consente di verificare;
- separa il giudizio d'ascolto ricevuto, i fatti tecnici e le ipotesi;
- non propone nuove soglie o formule;
- non modifica la baseline, che resta disponibile per il confronto A/B;
- non coinvolge il Visual se non come luogo nel quale le etichette sono state
  osservate.

Audit preventivo dei deprecati: `DEP-001 — NON COINVOLTO`.

## Segnalazione ricevuta

Il Consigliere riferisce che, nella modalità `experimental`, il riconoscimento
degli stati durante l'ultima sessione è «tutto sbagliato».

Questa è una valutazione percettiva diretta del Consigliere. Il log non contiene
una marcatura manuale degli stati attesi e quindi, da solo, non può stabilire
quale etichetta sarebbe stata corretta in ciascun momento.

## Fonte verificata

Log applicativo analizzato integralmente:

```text
/Users/andreadotta/Library/Application Support/mevrs-origine-fx/log/
session-2026-09-11-20-06-52.txt
```

Intervallo osservato dall'apertura dell'Output alla chiusura della sessione:

```text
18:07:00.903Z → 18:12:23.391Z
durata: 322,488 s
```

Il log conferma esplicitamente la selezione:

```text
audioMode = experimental
```

Non è registrato il nome del brano o della sorgente Audio. Non sono presenti
marcatori manuali e non è presente alcun campione `perception-session` a 1 Hz.

## Fatti osservabili nel log

La sequenza contiene 43 segmenti di stato, quindi 42 cambi dopo il primo stato.

| Stato emesso | Tempo complessivo | Quota della sessione | Ingressi nello stato |
|---|---:|---:|---:|
| `unresolved` | 7,931 s | 2,5% | 1 |
| `pressurized` | 22,192 s | 6,9% | 13 |
| `decompression` | 17,322 s | 5,4% | 8 |
| `respiro-alto` | 274,043 s | 85,0% | 20 |
| `respiro-profondo` | 1,000 s | 0,3% | 1 |

La durata mediana di un segmento è 2,039 s. Ventuno segmenti su 43 durano
meno di 2 s; dodici durano meno di 1 s. Il segmento più breve dura 0,498 s.

Sono presenti, fra gli altri, questi passaggi ravvicinati:

```text
18:08:12.405  pressurized
18:08:12.903  respiro-alto
18:08:13.904  pressurized
18:08:14.418  respiro-alto
18:08:15.920  pressurized
18:08:16.435  respiro-alto
```

e, verso la fine:

```text
18:12:11.637  pressurized
18:12:12.137  respiro-alto
18:12:12.638  pressurized
18:12:13.154  respiro-alto
18:12:14.670  pressurized
18:12:15.171  respiro-alto
18:12:17.489  decompression
18:12:20.716  respiro-alto
18:12:22.171  decompression
```

Il solo log prova quindi due comportamenti: dominio quasi continuo di
`respiro-alto` e alternanze molto brevi fra stasi e trasformazione. Senza una
verità percettiva annotata non prova invece quale stato dovesse sostituirli.

## Disallineamenti tecnici già verificati

Questi punti non sono ipotesi d'ascolto: derivano dal codice che ha prodotto la
sessione.

1. La semantica normativa dice:

   ```text
   direzione della costrizione → trasformazione
   persistenza della configurazione → assestamento
   livello + direzione + assestamento → stato
   ```

   Il classificatore corrente non usa `settlement` per decidere lo stato.
   Dopo il warm-up, se non rileva crescita o perdita dell'ancoraggio, separa
   direttamente i due respiri mediante il solo valore di `constraint`.

2. `pressurized` e `decompression` sono decisi oggi dal delta, fra due analisi
   successive, dell'ancoraggio smussato (`anchoring.gaining/losing`). Non dalla
   direzione della costrizione. L'analisi avviene ogni 500 ms; un superamento
   del deadband può quindi cambiare immediatamente l'etichetta.

3. Il log di cambio stato mostra l'etichetta scelta da `experimental`, ma il
   campo `reason` e i segnali allegati provengono dalla baseline. Per esempio,
   nella stessa sessione compaiono:

   ```text
   pressurized   con reason=pressure-falling
   decompression con reason=pressure-rising
   ```

   Non è una contraddizione percettiva dimostrata: sono due percorsi diversi
   accostati nello stesso evento di log. Di conseguenza quelle motivazioni non
   possono spiegare perché `experimental` abbia scelto l'etichetta.

4. La diagnostica sperimentale completa — organizzazione, persistenza
   inter-ciclo, ancoraggio, costrizione e assestamento — sarebbe prevista nel
   campionamento a 1 Hz, ma in questa sessione il relativo strumento non era
   attivo. Il log conserva gli esiti, non la traiettoria interna che li ha
   prodotti.

## Interpretazione dell'Ingegneria, non ancora decisione

La frequenza dei passaggi è compatibile con una lettura troppo sensibile delle
variazioni locali dell'ancoraggio. Questa è un'ipotesi tecnica, non una
conclusione percettiva.

Il dominio di `respiro-alto` è compatibile con almeno tre cause diverse che il
log corrente non permette di separare:

- il livello di costrizione è letto troppo alto;
- una configurazione non assestata viene comunque promossa a respiro;
- l'organizzazione osservata non corrisponde alla presa motoria percepita dal
  corpo.

Non intendiamo scegliere una di queste letture senza l'Analisi Audio.

## Aiuto richiesto al Capo Supremo dell'Analisi Audio

Chiediamo di stabilire, sul materiale realmente ascoltato nella sessione:

1. quali intervalli erano trasformazione e quali configurazione assestata;
2. nei tratti assestati, se la costrizione fosse alta o bassa;
3. nei tratti trasformativi, se la presa fosse in crescita, in cessione oppure
   oscillante senza una direzione dominante;
4. quali elementi musicali rendevano evidente al corpo la risposta, mantenendo
   distinti materia, organizzazione, entrainment, ancoraggio e costrizione;
5. se una variazione dell'ancoraggio possa autorizzare da sola
   `pressurized`/`decompression`, oppure se la direzione debba appartenere
   esplicitamente alla costrizione e persistere attraverso più cicli;
6. quale evidenza minima rende una configurazione «assestata» sul piano
   percettivo, senza trasformare la risposta in una nuova formula o in una
   condizione a molti requisiti.

## Forma di risposta richiesta

Per evitare nuove interpretazioni arbitrarie, chiediamo una tabella essenziale:

| Intervallo ascoltato | Stato atteso | Livello di costrizione | Direzione | Assestato? | Evidenza percettiva | Confidenza |
|---|---|---|---|---|---|---|
| `mm:ss–mm:ss` | uno dei cinque stati | alta / bassa / non determinabile | cresce / cede / stabile / oscillante | sì / no / ambiguo | formulazione dell'Audio | alta / media / bassa |

Se la sorgente Audio della sessione non è più identificabile, chiediamo di non
dedurre gli stati dal solo log. In quel caso serve una nuova sessione sullo
stesso materiale, con marcatori percettivi e campionamento sperimentale a 1 Hz
attivi. L'Ingegneria predisporrà la prova senza modificare prima il
classificatore.

## Decisione sospesa

Fino alla risposta dell'Analisi Audio non verranno introdotti nuovi segnali,
nuove condizioni o ulteriori retarature per correggere questa sessione.

La baseline non viene modificata e resta confronto A/B.

