# Campionamento delle frasi — Brief correttivo v2

Corregge il brief
[brief-campionamento-frasi-filo-onirico.md](brief-campionamento-frasi-filo-onirico.md)
dopo il piano di implementazione del Capo Supremo degli Ingegneri. Sostituisce
integralmente la v1 di questo correttivo (mai messa per iscritto come documento a sé,
solo discussa) — quanto segue è la versione valida.

Il piano resta approvato nella sua ossatura: cursore nella closure, nessuna
invalidazione, finestra scorrevole con sovrapposizione, buffer lungo per il memo,
residuo agganciato a `startProduction()`. **Cambia però il trattamento del materiale
online**, in modo sostanziale rispetto sia al brief originale sia alla v1 di questo
correttivo. Leggere §1 prima di implementare.

## 1. La decisione che cambia tutto

Il brief originale (§4) chiedeva un tetto al residuo online, per proteggere il filo
curato. La v1 di questo correttivo rimuoveva il tetto ma si fermava lì: "se capita che
il pubblico domini, va bene".

**Entrambe le formulazioni sono sbagliate, per lo stesso motivo: trattano il materiale
del pubblico come un contenuto che concorre con la base.** Non concorre.

Il set curato è una **base di partenza**. Deve esserci, e la sua traversata non si
ferma mai. Ma ciò che il pubblico scrive **influenza tanto**, anche quando è poco:
poche righe non producono un contributo piccolo, producono un'ossessione. Il sogno
diventa collettivo — che è il punto della sessione pubblica.

## 2. Come si traduce: peso, non quota

Il materiale online **non** va trattato come righe qualsiasi accodate al file, da
raggiungere quando il cursore ci arriva. Serve un meccanismo distinto:

- la finestra scorrevole sulla base **continua come da piano**, senza fermarsi, senza
  saltare, senza attendere il pubblico;
- ogni riga raccolta dal pubblico acquisisce un **diritto di rientro nel seme molto più
  alto**, indipendente dalla posizione del cursore;
- il rientro **non è vincolato alla freschezza**: una riga del pubblico può tornare nel
  seme anche se è già stata usata poco prima. In questo caso la ripetizione non è un
  difetto da evitare — è il meccanismo. È il frammento arrivato da fuori che torna, e
  torna, e deforma il resto.

Il seme di una storia ordinaria in sessione aperta diventa quindi: finestra corrente
della base **più** materiale del pubblico ripreso.

Conseguenza da assumere: la logica di esclusione delle frasi usate di recente
(`recentPhrases`, finestra di 12) **non deve applicarsi al materiale online**. È stata
scritta per evitare ripetizioni sulla base; qui la ripetizione è voluta.

Nessun tetto, in nessuna direzione: né minimo garantito alla base, né massimo
all'online.

## 3. Cosa resta della v1

Un solo punto della v1 sopravvive, e va mantenuto: **le voci campionate per il memo
devono restare distribuite nel tempo**, mai tutte dagli ultimi minuti. Non per
proteggere la base, ma perché altrimenti la memoria lunga diventa "cosa ha scritto il
pubblico adesso" invece di "cosa è stato il sogno finora", ricadendo nel cortocircuito
già identificato in `updateSessionMemoLocally` (`brainController.ts:128`).

Il resto della v1 — tetto di 1 slot su 3, gestione degli slot vuoti — è ritirato.

## 4. Due parametri da decidere all'ascolto

Non sono determinabili a tavolino e vanno tenuti modificabili a caldo.

**Invecchiamento del residuo.** Se il pubblico ha scritto dieci righe, tornano tutte a
rotazione oppure le più recenti tornano più spesso? Cioè: il residuo invecchia durante
la serata, o resta vivo dall'inizio alla fine? Da provare in entrambe le forme.

**Cadenza del ritorno.** Il materiale online rientra in ogni storia, o alternato — una
storia con residuo, una senza? La differenza si sente: il ritorno continuo satura e
smette di essere un riaffiorare; il ritorno alternato fa respirare e rende più forte
ogni ricomparsa. Raccomandazione di partenza: alternato, poi si valuta.

## 5. Invariati rispetto al piano

- una riga del CSV = una storia dedicata, priorità e percorso separato invariati;
- il residuo entra nel buffer lungo **dopo** la messa in onda, in `startProduction()`,
  non alla generazione;
- alla chiusura della sessione `brainPhrases.txt` torna al set curato, e con esso il
  seme torna interamente alla base;
- cursore nella closure, azzerato con lo stato narrativo;
- nessuna invalidazione esplicita quando il file cambia sotto.

## 6. Overlap: da tarare, non da fissare

Il piano fissa `phraseWindowOverlapCount: 2`. Su 35 righe con conteggio 4–5 significa
che due storie consecutive condividono circa metà del seme: valore alto, con rischio
simmetrico a quello che stiamo risolvendo — non più storie scollegate ma ridondanti.
Va confrontato all'ascolto almeno con `overlap: 1`, parametro modificabile a caldo.

## 7. Frequenza del memo: aritmetica da verificare

Il campionamento avviene ai cicli `sessionSynthesis` esistenti, ogni 3–5 storie: il
memo viene rinfrescato tre o quattro volte per giro di cursore. Con sovrapposizione
2–3, non è una scala nettamente più lunga come chiedeva il brief originale §5. Il
campionamento distribuito nel tempo mitiga molto e può bastare; se non basta, **la leva
è la frequenza di `sessionSynthesis`, non la capacità del buffer**.

## 8. Criterio di chiusura

Ascolto dal vivo che copra almeno un giro completo di cursore (~14 storie ordinarie coi
parametri attuali), in **entrambi** i regimi: sessione chiusa, e sessione pubblica con
input reali — non simulati.

Le domande:

- storie consecutive condividono un elemento che ritorna trasformato, senza essere
  ridondanti;
- **con poche righe del pubblico, quelle righe si sentono tornare**, e influenzano
  visibilmente le storie successive invece di passare una volta e sparire;
- il ritorno insiste senza saturare.
