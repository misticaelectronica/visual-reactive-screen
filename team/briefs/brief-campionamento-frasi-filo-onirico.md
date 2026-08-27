# Campionamento delle frasi: dal pool casuale al filo onirico — Brief

Brief del Capo Supremo, indirizzato al [Capo Supremo degli Ingegneri](../capo-supremo-ingegneri.md).
Contiene decisioni di prodotto e vincoli filosofici, non prescrizioni tecniche:
architettura, strutture dati, collocazione del cursore, parametri e piano di lavoro
restano materia dell'Ingegneria.

Sostituisce la sezione "Da rivedere" di
[`campionamento-brainphrases.md`](../../docs/campionamento-brainphrases.md).

## 1. Cosa non va nel meccanismo attuale

Oggi `sampleBrainPhrases()` estrae 4–5 righe **distinte a caso**, con indice
uniforme, escludendo le ultime 12 usate. Ogni storia è quindi un'interpretazione
indipendente dello stesso pool.

Questo è il punto contro filosofico: `filosofia.md` §2 stabilisce che la continuità
onirica è "cosa continua a ritornare mentre cambia forma", e Brain applica il
principio **dentro** la storia (Soglia → Metamorfosi → Condensazione → Eco) e persino
al renderer, trattato come invariante che persiste su 2–3 fotogrammi. Ma **fra** una
storia e l'altra non esiste alcun invariante. È esattamente il caso che `filosofia.md`
elenca fra ciò che non funziona — "immagini che cambiano tema a ogni passo" — solo
scalato alla serata invece che al fotogramma.

La macchina non deve produrre sogni scollegati. Deve sognare.

## 2. Decisione: finestra scorrevole con sovrapposizione

Per le storie ordinarie (non online), il campionamento uniforme è sostituito da una
**traversata sequenziale del file con sovrapposizione fra storie consecutive**.

Il principio richiesto, non i numeri:

- ogni storia legge un blocco di righe **contigue**, non sparse;
- il blocco successivo **si sovrappone parzialmente** al precedente, così che ogni
  storia condivida materiale con quella prima e ne ceda a quella dopo;
- arrivati in fondo al file, si riparte dall'inizio.

La quantità di righe per storia resta quella attuale (4–5): il seme deve restare
compatibile con il budget di token del modello (storia normale 90–360 nuovi token) e
con la sua dimensione. **Non** aumentare il seme è un vincolo, non un dettaglio.

Perché così: la sovrapposizione è *partial recurrence*, un elemento che ritorna
deformato. Il ritorno all'inizio dopo il giro completo è la quarta immagine che
richiama la prima, alla scala della serata. Il costo in token e in codice resta
quello di oggi, perché cambia solo il modo di scegliere gli indici.

Nota di rischio da verificare prima di implementare: il filo non nasce dal
meccanismo, nasce dall'**ordine del file**. Se `brainPhrasesBaseStory.txt` è scritto
come sequenza, la traversata funziona; se è un pool sparso senza ordine narrativo, si
ottengono blocchi arbitrari e non si guadagna nulla rispetto al random. Verificare
prima com'è realmente ordinato e quante righe contiene: da lì dipende anche la durata
di un giro completo del cursore.

## 3. Decisione: l'input online non muove il cursore

Il percorso della sessione pubblica **non cambia**: ogni riga del CSV continua a
generare una storia dedicata con `phrases = [quella riga sola]`, con priorità sulle
storie casuali non ancora mostrate, senza interrompere quella in onda.

Quella storia dedicata **non sposta il cursore** della traversata. Il filo curato
riprende da dove era.

## 4. Decisione: ma l'input lascia un residuo

Una parentesi non esiste, in un sogno. Se qualcosa entra dall'esterno, deve lasciare
traccia: è il residuo diurno, il frammento che non diventa la trama ma continua a
riaffiorare deformato.

Il residuo **non** viene iniettato come riga grezza nella finestra successiva. Passa
attraverso il `sessionMemo`, che è già la memoria lunga del sogno e rientra già nei
semi delle storie successive. Requisiti:

- **Dopo, non prima.** Il contributo entra nel memo quando la storia dedicata è
  andata in onda, non quando la frase arriva dal foglio. Il sogno ricorda di aver
  sognato, non di aver ricevuto.
- **Condensato, non copiato.** Arriva deformato perché passa dalla sintesi. Questo
  è anche ciò che lo fa svanire da solo con l'andare della serata, senza scrivere un
  decadimento esplicito: riaffiora nelle storie immediatamente successive, poi si
  diluisce.
- **Con un tetto.** In una serata affollata il memo rischia di diventare interamente
  materiale del pubblico, cancellando la traccia del filo curato dalla memoria lunga.
  Serve un limite alla quota di memo occupabile da contributi online. Il residuo
  diurno non deve diventare la trama.

## 5. Vincolo: memo e finestra non devono pestarsi i piedi

Con la finestra scorrevole attiva, le storie consecutive condividono già materiale per
costruzione. Se il `sessionMemo` sintetizza una scala corta — le ultime due o tre
storie — ripete alla coscienza ciò che la finestra le sta già dando: il seme si
autoconferma e si ottiene sempre la stessa cosa detta due volte, che è il contrario
della metamorfosi.

Il memo deve quindi operare su una scala **nettamente più lunga** della
sovrapposizione: dell'ordine di un giro completo del cursore, non di due storie.
Finestra = memoria corta (cosa arriva dalla storia appena passata); memo = memoria
lunga (cosa è stato il sogno finora).

## 6. Cosa resta invariato

- una riga del CSV = una storia dedicata, percorso separato, priorità invariata;
- rilettura di `brainPhrases.txt` da disco a ogni ciclo di generazione;
- parsing invariato (righe vuote e `#` ignorate);
- comportamento apertura/chiusura sessione pubblica: a sessione chiusa
  `brainPhrases.txt` è copia del set curato, a sessione aperta è il raccolto;
- prefetch della coda: la generazione anticipata resta, il cursore corre avanti
  rispetto a ciò che si vede ed è accettabile.

## 7. Punti aperti, di competenza dell'Ingegneria

1. **Ordine e dimensione reali di `brainPhrasesBaseStory.txt`** — condiziona sia
   l'efficacia del meccanismo sia la durata di un giro, e quindi la taratura del memo.
2. **Parametri di finestra e passo**, entro il vincolo di §2 (seme invariato per
   dimensione).
3. **Dove vive il cursore e cosa succede ai riavvii**: se sopravvive alla sessione,
   se riparte da zero, se un cambio renderer o un reload dell'Output lo azzera.
   Vale la pena guardare come è collocata la memoria di `coscienzaCore`, che opera già
   su scala multi-secondo e riceve `VisualStatePayload` direttamente, fuori dal clock
   ritmico e dal suo reset sui gap.
4. **Il cursore durante la sessione pubblica.** In sessione aperta
   `brainPhrases.txt` viene sovrascritto all'apertura e **cresce in coda** a ogni
   polling: il file cambia sotto il cursore. Conseguenza voluta e da confermare — in
   quel regime la traversata scorre sulle righe del pubblico in ordine di arrivo,
   diventando un filo collettivo. Va deciso il comportamento del cursore quando il
   file viene sovrascritto all'apertura e quando si allunga durante lo show.
5. **Interazione fra cursore e `storyQueue`**: cosa accade alle storie già in coda se
   il file cambia sotto, e se le storie prefetchate vadano invalidate o lasciate.
6. **Tetto del residuo online nel memo**: forma concreta del limite di §4.

## 8. Verifica

Il criterio non è un test verde. Serve un ascolto dal vivo di durata sufficiente a
coprire almeno un giro completo del cursore, con due domande:

- storie consecutive condividono un elemento riconoscibile che ritorna trasformato,
  o restano scollegate come oggi;
- una storia nata da un input del pubblico lascia traccia nelle due o tre successive,
  senza dirottarle.

Vale la lezione delle figure Bauhaus, già registrata dal team: test verdi e feature
invisibile con audio reale. Qui la sola verifica possibile è ascoltare e guardare.
