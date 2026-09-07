# Collaudo negativo dei quattro stati bio-percettivi

> **Esito recepito.** Le decisioni normative successive sono consolidate in
> [`AUDIO-REGIMI-POSTCOLLAUDO-01`](brief-audio-regimi-postcollaudo-01.md), che
> prevale su ogni ipotesi o richiesta decisionale contenuta qui.

**Al Capo Supremo dell'Analisi Audio**  
**Da:** Capo Supremo / Capo Supremo degli Ingegneri del Sistema VJ  
**Data:** 31 agosto 2026  
**Oggetto:** PRESSURIZZATO, DECOMPRESSIONE, RESPIRO ALTO e RESPIRO PROFONDO non corrispondono alla lettura uditiva del set

---

## 1. Esito in una frase

Il collaudo è **negativo e bloccante**: il modello assegna frequentemente
`pressurized` e `respiro-alto` a passaggi che all'ascolto sono stati riconosciuti
come DECOMPRESSIONE o RESPIRO PROFONDO; dopo l'ultima correzione compare inoltre
molto spesso `stasis-level-indeterminate`. In queste condizioni i quattro stati
non sono affidabili come regia del comportamento visivo.

## 2. Integrità del dato: il log numerico non è stato salvato

Il collaudo è stato realmente eseguito con l'overlay bio-percettivo, ma **non
esiste un file `session-*.txt` recuperabile**. Sono state verificate senza esito
le cartelle del progetto, della build, Applicazioni, Documenti, Download,
Scrivania, cartelle temporanee e volumi montati.

Di conseguenza questo brief separa rigorosamente:

- **osservazioni certe del Capo Supremo durante l'ascolto**, riportate sotto;
- **architettura certa del codice attuale**, verificata nel sorgente;
- **ipotesi diagnostiche**, che non diventano conclusioni senza i campioni 1 Hz.

Non vengono inventati timestamp, conteggi, bande o valori di pressione mancanti.

### Causa tecnica corretta dopo il collaudo

Al momento del collaudo, nell'app pacchettizzata il logger costruiva la cartella
`log` accanto a `process.execPath`, quindi poteva tentare di scrivere dentro il
bundle o il DMG. Dopo il riscontro, l'Ingegneria ha spostato il percorso in
`app.getPath('userData')/log`: la cartella applicativa scrivibile e persistente
del profilo utente. Nessun log viene scritto sulla Scrivania. La correzione
garantisce i prossimi collaudi, ma non può ricostruire i campioni perduti di
questa sessione.

## 3. Osservazioni certe del collaudo

### 3.1 Passaggi bassi letti come PRESSURIZZATO

Durante fasi riconosciute all'ascolto come decompressione o respiro profondo,
l'overlay ha mostrato momenti di `pressurized`.

Non si tratta soltanto di un ritardo nell'ingresso del RESPIRO PROFONDO: viene
letta la **direzione opposta**. Il modello dichiara costruzione di pressione
mentre il corpo e l'ascolto riconoscono apertura, perdita di costrizione o stasi
bassa.

### 3.2 RESPIRO ALTO troppo frequente

`respiro-alto` compare troppo spesso e invade anche fasi che all'ascolto
appartengono a DECOMPRESSIONE o RESPIRO PROFONDO. Non è quindi soltanto un errore
fra due passaggi: anche l'asse del livello alto/profondo è sbilanciato verso
l'alto.

### 3.3 LIVELLO INDETERMINATO troppo frequente

Dopo la correzione che consente al livello di rivalutarsi quando la pressione
atterra, `stasis-level-indeterminate` compare molto spesso. La correzione ha
rimosso la permanenza infinita di un latch errato, ma il risultato operativo è
un nuovo stato non risolto troppo presente.

### 3.4 Conseguenza visiva

Il difetto non resta diagnostico. I regimi governano pool, permanenza e profili
dei renderer: una fase bassa letta come `pressurized` o `respiro-alto` mantiene
un vocabolario visivo intenso quando dovrebbe aprirsi o abitare una stasi
profonda. DELIQUESCENCE, costruita per il RESPIRO PROFONDO, non può ricevere una
regia affidabile finché il classificatore scambia questi stati.

## 4. Matrice del fallimento osservato

| Stato riconosciuto all'ascolto | Stato atteso | Stato comparso | Esito |
|---|---|---|---|
| aumento reale della costrizione | `pressurized` | presente, ma non isolato ai soli aumenti | parzialmente leggibile |
| apertura/perdita di costrizione | `decompression` | anche `pressurized` e `respiro-alto` | fallimento di direzione |
| stasi alta realmente sostenuta | `respiro-alto` | molto frequente, anche fuori contesto | sovra-classificazione |
| stasi bassa/profonda | `respiro-profondo` | anche `pressurized`, `respiro-alto` o indeterminato | fallimento di livello/stasi |
| pressione atterrata vicina alla mediana | livello da giudicare | spesso `stasis-level-indeterminate` | stato non risolto troppo presente |

La matrice è qualitativa: il file numerico della sessione manca.

## 5. Macchina attuale, per il giudizio Audio

### 5.1 Direzione del passaggio

`pressureTrend` non misura direttamente la derivata della pressione. Confronta
la `perceptualPressure` live con `reference.pressure`:

- sopra il riferimento oltre la banda di ingresso → `rising` →
  `pressurized`;
- sotto il riferimento oltre la banda → `falling` → `decompression`;
- vicino al riferimento → `stable`.

L'isteresi conserva il trend precedente finché la distanza non rientra quasi a
zero. Questo significa che "dove sono rispetto al riferimento" viene usato per
rispondere a "in quale direzione mi sto muovendo adesso".

### 5.2 Livello della stasi

Quando la pressione viene considerata atterrata, `classifyLevel` confronta la
pressione live con la mediana del set:

- sopra `mediana + 0.02` → `alto`;
- sotto `mediana - 0.02` → `profondo`;
- dentro la banda → `null`, quindi `stasis-level-indeterminate` quando il
  trend è stabile.

La rivalutazione parte deliberatamente da `null`, così un vecchio livello
ereditato può essere revocato. Questo spiega meccanicamente la nuova frequenza
di LIVELLO INDETERMINATO, ma non dice ancora se la banda, la mediana o il
momento di consultazione siano percettivamente corretti.

### 5.3 Pressione percettiva

`perceptualPressure` combina:

- energia sostenuta: peso 0.30;
- occupazione spettrale: peso 0.20;
- occupazione temporale: peso 0.18;
- costrizione ritmica: peso 0.32.

La costrizione ritmica contiene inviluppi sostenuti di pulse, low-end e densità
della griglia. Il collaudo precedente aveva già mostrato un range pratico
compresso e un pavimento strutturale; in questo giro non sono stati ritarati.

## 6. Lettura diagnostica da sottoporre all'Audio

Le osservazioni indicano almeno tre problemi distinti. Senza log numerico non è
possibile stabilire il loro peso relativo.

### A. Posizione rispetto al riferimento usata come direzione

Se `reference.pressure` è bassa o in ritardo, una fase che si sta realmente
decomprimendo può restare sopra il riferimento ed essere chiamata `rising`.
Questo corrisponde esattamente al sintomo "DECOMPRESSIONE letta come
PRESSURIZZATO". La domanda per l'Audio è se la direzione corporea debba dipendere
dalla posizione rispetto a un mondo precedente oppure dal verso effettivo della
pressione nel tempo.

### B. Pressione tenuta alta dalla componente ritmica

Il pulse usa `max(kickEnvelope, beatPulse)` e la componente ritmica ha il peso
singolo maggiore. Un kick o una griglia ancora leggibile possono mantenere alta
la pressione anche durante un'apertura percepita come decompressione. Questa era
già una delle quattro cause aperte del collaudo precedente e non è stata toccata
nel giro appena autorizzato.

### C. Rivalutazione del livello troppo spesso neutra o alta

Al confine di atterraggio, il confronto live-contro-mediana può produrre:

- `alto` troppo facilmente se il range pratico è compresso e 0.02 è piccolo
  rispetto alla quantizzazione/oscillazione reale;
- `null` molto spesso quando pressione e mediana coincidono, perché la
  rivalutazione non conserva più il livello precedente nella zona neutra.

Il nuovo indeterminato frequente non è casuale: è l'esito diretto e previsto
della revoca del latch quando il dato non distingue alto da profondo. Il
collaudo dimostra però che, così consultata, la classificazione non risolve
abbastanza spesso il livello.

## 7. Decisioni richieste al Capo Supremo dell'Analisi Audio

1. **Direzione:** `pressurized`/`decompression` devono esprimere la posizione
   rispetto a `reference.pressure` o il verso effettivo della pressione nel
   tempo? Il collaudo mostra che oggi le due cose divergono.
2. **Kick e griglia:** una pulsazione ancora leggibile deve poter mantenere
   `perceptualPressure` alta durante un breakdown, oppure pulse deve essere
   qualificato dall'energia low/lowMid effettiva?
3. **Livello:** quando una pressione atterrata cade nella banda neutra, il
   livello corretto è davvero "indeterminato", oppure va conservata una memoria
   del livello precedente fino a evidenza contraria?
4. **Riferimento del livello:** la mediana dell'intero set resta il termine
   percettivo corretto per distinguere RESPIRO ALTO e PROFONDO dopo che la
   definizione di `perceptualPressure` ha cambiato scala?
5. **Criterio minimo di accettazione:** quale sequenza uditiva concreta deve
   produrre senza ambiguità i quattro stati prima di riattivare DELIQUESCENCE
   come dominante del RESPIRO PROFONDO?

## 8. Richiesta operativa dell'Ingegneria

Non autorizzare una correzione cumulativa di soglie, pesi e latch nello stesso
giro. Il prossimo intervento deve seguire la decisione Audio sul punto 1:
**che cosa significa direzione**. Se quella definizione cambia, molte tarature a
valle cambiano significato e non vanno aggiustate prima.

Prima del prossimo collaudo, l'Ingegneria deve inoltre rendere il percorso del
log certamente scrivibile e mostrare nell'interfaccia il path del file. Il
collaudo successivo deve produrre un allegato persistente con un campione al
secondo e marcatori manuali dei quattro intervalli riconosciuti all'ascolto.

## 9. Allegato numerico richiesto per il prossimo giro

Per ogni secondo:

- timestamp audio e sequence number;
- bande raw `low`, `lowMid`, `mid`, `high`;
- transienti per banda;
- `persistence`, `change`, `residual`, `perceptualPressure`;
- componenti della pressione: energia, occupazione spettrale, occupazione
  temporale, pulse, low-end, grid density e rhythm constraint;
- `referencePressure`, mediana, distanza dal riferimento e dalla mediana;
- `pressureTrend`, livello, regime e `regimeReason`;
- renderer attivo;
- marcatore manuale Audio: PRESSURIZZATO / DECOMPRESSIONE / RESPIRO ALTO /
  RESPIRO PROFONDO secondo l'ascolto.

Il logger attuale contiene gran parte di questi campi, ma non espone le quattro
componenti interne della pressione né il marcatore manuale Audio. Soprattutto,
in questa sessione non ha lasciato un file recuperabile.

---

**Conclusione:** il problema non è una sfumatura. La macchina confonde sia il
verso del passaggio sia il livello della stasi. Il RESPIRO ALTO domina troppo;
il RESPIRO PROFONDO non è riconosciuto con affidabilità; il nuovo LIVELLO
INDETERMINATO è troppo frequente. Serve prima una decisione Audio sul significato
di direzione, poi un solo intervento misurato e un nuovo collaudo con file
persistente.
