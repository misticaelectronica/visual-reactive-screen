# BRAIN — Filosofia aggiuntiva Audio — Relatività percettiva della pressione rispetto alla mediana dinamica del set

> Addendum filosofico e revisione del modello percettivo, Capo Supremo dell'Analisi
> Audio, 2026-08-27. Recepito integralmente in
> [`brainBioPerception.ts`](../../src/renderer/output/brain/brainBioPerception.ts) —
> vedi [PIANO-040](../../working/plans/piano-040-stato-bio-percettivo-prova-dream-segmentation.md)
> Task 4.4d per il registro dell'implementazione. Riferimento normativo per la
> semantica di `pressureTrend` e la derivazione del regime, in sostituzione del
> modello a derivata temporale precedente (§4.4c dello stesso piano, superato da
> questo documento).

## 1. Direttiva

Brain non valuta la pressione musicale rispetto a una scala assoluta.

Brain valuta continuamente la musica **rispetto alla storia della stessa serata**.

Il riferimento fondamentale dell'analisi della pressione è la **mediana dinamica della
`perceptualPressure` dell'intero set fino all'istante corrente**.

La mediana:

* nasce con il set;
* rimane aperta per tutta la durata del set;
* viene aggiornata continuamente;
* incorpora ogni nuovo dato valido;
* non viene mai congelata;
* costituisce il riferimento rispetto al quale Brain interpreta la pressione corrente.

Questa è una filosofia Audio del sistema. Non è una taratura. Non è una soglia. Non è
un parametro da ottimizzare per ottenere un particolare comportamento visuale. È il
modo in cui Brain ascolta.

## 2. Principio di relatività percettiva

La domanda fondamentale non è più "quanto è alta la pressione?" ma "dove si trova la
pressione attuale rispetto alla pressione che ha caratterizzato questa serata fino a
questo momento?"

Formalmente il riferimento è `setPressureMedian(t)`, calcolata sull'intera storia
valida di `perceptualPressure(0...t)`.

La mediana viene preferita alla media perché deve resistere agli eventi isolati. Un
kick particolarmente forte, un fill, un transient, un picco breve o un singolo momento
di alta energia concorrono alla storia ma non devono poter ridefinire in modo
significativo il centro percettivo del set.

Brain costruisce quindi progressivamente il proprio riferimento dall'esperienza
accumulata. Ogni serata produce il proprio centro.

## 3. Invarianti del modello Audio

### 3.1 `persistence`

Descrive quanto una configurazione percettiva continua a mantenere identità nel tempo.
Alta persistence significa continuità dello stato, non necessariamente alta pressione
né immobilità. Una decompressione può mantenere persistence molto alta se la materia
sonora continua a essere riconoscibile mentre cambia pressione.

### 3.2 `change`

Descrive la quantità di trasformazione percettivamente significativa in corso.
`persistence` e `change` non sono complementari: possono essere contemporaneamente
elevati. Una struttura può mantenere identità mentre attraversa una trasformazione
importante.

### 3.3 `residual`

Rappresenta ciò che dello stato precedente continua a essere percettivamente presente
nello stato attuale. Richiede memoria. Non deriva dalla sola pressione corrente e non
deriva dalla sola persistence. Può quindi verificarsi `persistence alta` insieme a
`perceptualPressure sotto la mediana` e `residual in decadimento`, senza alcuna
contraddizione.

Il residual deve poter scaricare quando Brain riconosce una permanenza sufficientemente
lunga sotto il riferimento percettivo precedente. La sua scala è più lenta rispetto al
riconoscimento immediato della posizione rispetto alla mediana.

### 3.4 `perceptualPressure`

Descrive la pressione complessivamente percepita dal sistema. Non coincide con volume,
RMS, presenza del kick, quantità di basse frequenze, densità spettrale o energia
istantanea — questi elementi possono concorrere alla sua costruzione, ma la pressione è
un livello percettivo superiore.

Il suo valore assoluto perde significato classificatorio una volta disponibile una
storia affidabile del set: `0.64`, `0.40` o `0.75` non rappresentano in sé
rispettivamente pressione alta, media o bassa. Il significato dipende dalla posizione
che quei valori occupano all'interno della serata corrente.

### 3.5 `pressureTrend`

La semantica precedente (derivata della pressione, velocità di variazione, pendenza
temporale, confronto fra pressione presente e immediatamente precedente) viene
**sostituita**.

`pressureTrend` rappresenta la **posizione percettiva corrente rispetto alla mediana
dinamica dell'intero set**:

- `perceptualPressure > setPressureMedian` → `rising`
- `perceptualPressure ≈ setPressureMedian` → `stable`
- `perceptualPressure < setPressureMedian` → `falling`

I nomi restano per continuità del modello, ma il significato cambia. `falling`
significa "mi trovo nella regione inferiore rispetto alla pressione tipica costruita da
questa serata", non necessariamente "nell'ultimo secondo la pressione è diminuita".
Analogamente per `rising`.

### 3.6 Mediana dinamica del set

`setPressureMedian` è un invariante fondamentale. La sua proprietà essenziale è la
**persistenza storica**: il riferimento del minuto 70 contiene anche ciò che Brain ha
vissuto nei primi 69 minuti. Non viene sostituito da una finestra mobile breve — una
finestra mobile descriverebbe il contesto locale, la mediana del set descrive la
**memoria percettiva della serata**.

La stessa pressione sonora può quindi assumere significati differenti in due set
differenti, e significati differenti nello stesso set man mano che la sua storia si
modifica. Brain non possiede una definizione universale di "forte" e "debole": la
costruisce progressivamente, interna alla performance.

## 4. La zona intorno alla mediana

La mediana è un valore puntuale, la percezione richiede una regione di indifferenza.
Non deve valere `0.50001 > mediana → rising` e `0.49999 < mediana → falling`.

Serve una zona percettiva attorno alla mediana entro la quale `pressureTrend = stable`.
Questa zona **non** va definita con soglie assolute arbitrarie: la sua ampiezza va
derivata dalla variabilità osservata nel set stesso. Vincolo Audio: la normale
oscillazione interna del materiale resta `stable`; uno spostamento significativo
rispetto alla distribuzione della serata produce `rising` o `falling`. La definizione
matematica concreta della banda appartiene all'Ingegneria.

## 5. Bootstrap iniziale

All'inizio della performance la mediana non ha ancora piena affidabilità percettiva. Ciò
che cambia è la **fiducia attribuita al riferimento**, non l'esistenza della mediana.
Ordini di grandezza:

- **0-60s**: mediana embrionale, osservabile ma non deve produrre classificazioni forti
  del regime. Le soglie assolute preesistenti possono fungere da fallback temporaneo.
- **60-180s**: mediana progressivamente affidabile, il sistema inizia a usare
  prevalentemente il riferimento relativo con cautela sui cambi di regime.
- **Dopo ~180s**: la mediana diventa il riferimento primario pienamente operativo, le
  soglie assolute cessano di avere funzione ordinaria.

Questi intervalli sono ordini di grandezza percettivi. L'Ingegneria può costruire un
indice continuo di affidabilità della storia anziché tre interruttori netti — principio
da preservare: la transizione dal bootstrap alla relatività completa deve essere
progressiva.

## 6. Conseguenze sul regime

Il regime resta un livello più lento dei segnali continui: descrivono ciò che sta
accadendo, il regime uno stato sufficientemente persistente da essere riconosciuto. La
derivazione cambia:

### 6.1 Respiro

Candidato fondamentale: `perceptualPressure sotto setPressureMedian`, cioè
`pressureTrend = falling`. Non richiede più una combinazione arbitraria di pressione
assolutamente bassa + persistence + change + residual + soglie indipendenti. La
condizione percettiva primaria è: Brain si trova sotto il centro di pressione
costruito dalla serata. È lì che esiste lo spazio relativo, è lì che Brain riconosce il
respiro.

### 6.2 Conferma temporale

Essere sotto la mediana per un istante non modifica il regime — un transient resta un
transient, una breve sottrazione resta un evento locale. La posizione relativa si
percepisce immediatamente attraverso `pressureTrend`, il regime richiede permanenza.
Ordine di grandezza: 0-2s evento locale; 3-5s posizione relativa percettibilmente
leggibile; 6-10s movimento strutturale candidato; 8-12s regime eleggibile alla conferma.
L'isteresi opera sulla permanenza nella regione relativa, non costringe `pressureTrend`
stesso ad aspettare venti secondi.

## 7. Regime pressurizzato

Simmetricamente, `perceptualPressure sopra setPressureMedian` (`pressureTrend =
rising`) è la condizione primaria per riconoscere una regione di pressione superiore
alla norma interna della serata. Anche qui il regime richiede conferma temporale: Brain
può sapere immediatamente di trovarsi sopra la mediana senza dichiarare subito un nuovo
regime.

## 8. Regione stabile

Quando `perceptualPressure ≈ setPressureMedian`, Brain è nella regione `stable`. Questa
condizione **non deve automaticamente produrre `UNRESOLVED`**. La vicinanza alla
mediana è essa stessa informazione: appartiene alla regione centrale costruita dal set.
`UNRESOLVED` resta disponibile esclusivamente quando i segnali non consentono
realmente una lettura coerente — non deve diventare il risultato normale della zona
centrale.

## 9. Ruolo di persistence, change e residual nella derivazione del regime

La mediana determina il **versante** della pressione. Gli altri invarianti descrivono
la qualità percettiva di ciò che avviene all'interno di quel versante.

- `falling` + persistence alta + change basso → sotto la pressione tipica, mantenendo
  una configurazione molto continua.
- `falling` + persistence media + change alto → sotto la pressione tipica,
  attraversando contemporaneamente una trasformazione significativa.

Entrambi appartengono alla regione del respiro — non vanno esclusi perché
persistence/change non soddisfano una combinazione prefissata. `residual` descrive
invece quanto della pressione/stato precedente continua ad accompagnare la nuova
regione. Sintesi: la mediana decide dove siamo rispetto alla serata; persistence,
change e residual descrivono come ci troviamo lì.

## 10. Revisione delle soglie assolute

Le precedenti soglie (pressione bassa/media/alta/molto alta) **decadono come criterio
primario**. Possono sopravvivere esclusivamente per: bootstrap iniziale; diagnostica;
protezioni contro valori manifestamente anomali; controlli tecnici indipendenti dal
significato percettivo. Non devono determinare ordinariamente `pressureTrend`, respiro,
regime pressurizzato o l'interpretazione della pressione. Una `perceptualPressure =
0.64` può essere sopra, intorno o sotto la mediana — dipende dalla serata.

## 11. Conseguenza filosofica

Brain non possiede un ascolto esterno alla performance. Accumula esperienza durante la
performance e usa quella esperienza per interpretare ciò che viene dopo. Una
decompressione non è definita da un livello energetico universalmente basso: è definita
dal fatto che ciò che sta accadendo ora esercita meno pressione di ciò che questa serata
ha insegnato a Brain a considerare normale.

Il respiro è quindi **relazionale**. La pressione è **contestuale**. La memoria del set
diventa parte dell'atto percettivo. Coerente con la struttura generale di Brain: `audio
→ percezione → stato affettivo e associativo → modello immaginativo → manifestazione
visiva`. Brain non converte un numero in una categoria: costruisce progressivamente il
contesto necessario affinché quel numero possa assumere significato.

## 12. Direttiva all'Ingegneria

Invarianti da rispettare nell'implementazione:

1. mantenere una mediana dinamica dell'intera storia valida della `perceptualPressure`;
2. aggiornarla continuamente senza congelarla durante il set;
3. usarla come riferimento primario della pressione;
4. reinterpretare `pressureTrend` come posizione relativa alla mediana, non derivata
   temporale;
5. definire `stable` attraverso una regione adattiva attorno alla mediana;
6. evitare soglie assolute di pressione nella normale derivazione di `pressureTrend`;
7. usare le soglie assolute esclusivamente durante bootstrap o per esigenze tecniche
   indipendenti;
8. derivare il candidato al regime di respiro dalla permanenza sotto la mediana;
9. derivare il candidato al regime pressurizzato dalla permanenza sopra la mediana;
10. mantenere separati riconoscimento immediato della posizione relativa e conferma
    lenta del regime;
11. preservare persistence/change/residual come dimensioni indipendenti che qualificano
    lo stato senza sostituire il riferimento relativo;
12. evitare che la regione intorno alla mediana venga automaticamente classificata come
    `UNRESOLVED`.

Le decisioni algoritmiche, le strutture dati, la modalità di calcolo incrementale della
mediana, la rappresentazione della distribuzione e l'implementazione della banda
adattiva appartengono al Capo degli Ingegneri e al team tecnico. Il vincolo Audio è
semantico: Brain ascolta ogni momento della serata rispetto alla storia percettiva che
la serata stessa gli ha costruito.

---

## Nota di trasmissione al Capo Supremo degli Ingegneri (braccio destro, 2026-08-27)

Il brief Audio va recepito integralmente. Quattro cose da tenere presenti mentre si
implementa.

**Primo**, la questione che il brief non affronta: la mediana insegue. Se la pressione
resta sotto la mediana abbastanza a lungo, la mediana stessa scende — perché ogni
campione la aggiorna — e la pressione si ritrova di nuovo "intorno". Un passaggio
ambient lungo cesserebbe di essere letto come respiro dopo qualche minuto, non perché
la musica è cambiata ma perché il riferimento si è spostato. È intrinseco al modello e
non è un errore: la serata riscrive il proprio centro. Ma va misurato quanto è veloce, e
riportato dopo il primo collaudo. Se un respiro di cinque minuti si autoannulla, il
modello va discusso con l'Audio — non risolto in silenzio con un fattore di
dimenticanza.

**Secondo**: la mediana va calcolata su ciò che Brain sente, non sui vuoti. Se il set
include silenzi, cambi di traccia, pause tecniche, quei campioni a pressione quasi nulla
entrano nella storia e abbassano il centro. Va deciso cosa rende un campione valido, e
la scelta va scritta nel piano perché nessuno la potrà dedurre dal codice.

**Terzo**: `UNRESOLVED` deve smettere di essere l'esito normale. Il §8 è esplicito e
nasce dal collaudo di stasera, dove il regime era `UNRESOLVED` con valori non ambigui.
La regione centrale è informazione, non assenza di informazione. Verificare che dopo la
modifica `UNRESOLVED` compaia solo nel bootstrap e in caso di letture davvero
incoerenti.

**Quarto**: il bootstrap è progressivo, non a tre scalini. Il brief lo dice e la sua
stessa proposta di un indice continuo di affidabilità è la strada giusta.

Una cosa che resta vera anche dopo questo giro: nessun renderer consuma i segnali
continui — Dream-Segmentation legge solo il regime. Una decompressione breve, che con
questo modello sarà finalmente leggibile come `falling`, resterà comunque invisibile a
schermo. La correzione rende il modello giusto; non rende visibile ciò che il modello
ora sa. È il limite della prova come è stata disegnata, e va affrontato dopo il
prossimo collaudo, non adesso.

---

## 13. Addendum — Autorizzazione adattiva del respiro (2026-08-27)

### Principio

Il respiro non viene autorizzato dopo un numero fisso di secondi trascorsi sotto la
mediana della `perceptualPressure`. La permanenza diventa significativa quando **si
organizza percettivamente**.

La mediana indica il versante: sopra la mediana, regione di maggiore pressione;
intorno alla mediana, regione centrale; sotto la mediana, regione potenziale di
respiro. Essere sotto la mediana, da solo, non basta a dichiarare il respiro — la
condizione deve acquisire una firma.

### Firma del respiro

Il respiro emerge quando la permanenza sotto la mediana mostra progressivamente
`persistence ↑` insieme a `change ↓`. La pressione non sta semplicemente attraversando
una zona inferiore: sta **stabilizzandosi dentro quella zona**.

> La mediana dice in quale versante Brain si trova. Persistence e change dicono se
> Brain sta abitando quel versante oppure lo sta soltanto attraversando.

`residual` conserva la memoria dello stato precedente e può continuare a qualificare la
transizione senza determinare, da solo, l'autorizzazione del respiro.

### Abbandono della durata fissa

Le precedenti indicazioni temporali (3-5s, 8-12s) non devono diventare soglie
normative per il cambio di regime — restano esclusivamente ordini di grandezza
diagnostici. La durata necessaria alla conferma emerge dal comportamento del segnale
nel contesto reale del set: una configurazione inequivocabile viene riconosciuta
rapidamente, una ambigua richiede naturalmente più storia.

### Il contesto musicale non viene dichiarato a Brain

Brain deve funzionare senza sapere se sta ascoltando ambient, ambient techno, minimal,
hypnotic techno, techno, tech-house o altro. Il sistema ricava il contesto dalla
distribuzione della propria `perceptualPressure`, attraverso due proprietà:
`setPressureMedian` (il centro relativo della serata) e `setPressureDispersion` (quanto
naturalmente quella pressione oscilla intorno al proprio centro).

In una configurazione techno ipnotica: mediana relativamente alta, dispersione
contenuta, pressione molto persistente — una permanenza sotto mediana è rara, e quando
avviene con la firma organizzativa il respiro può diventare riconoscibile rapidamente.
In una configurazione ambient: mediana relativamente bassa, dispersione più ampia,
frequenti attraversamenti — essere sotto il valore centrale è poco informativo, serve
una firma più consolidata.

### Dispersione come regolatore della conferma

> Quanto più è normale oscillare intorno alla mediana, tanto maggiore deve essere
> l'evidenza necessaria per considerare organizzata una permanenza sotto di essa.
> Simmetricamente, quanto più la distribuzione è compatta, tanto più uno spostamento
> persistente fuori dalla regione abituale diventa percettivamente significativo.

La dispersione non stabilisce direttamente il regime: stabilisce quanto sia eccezionale
o ordinaria la posizione corrente rispetto alla storia della serata. Il significato di
"sotto la mediana" va quindi valutato rispetto alla distribuzione del set — lo stesso
scarto assoluto vale diversamente in una distribuzione stretta e in una ampia.

### Regola del respiro

Il regime di respiro diventa eleggibile quando sono contemporaneamente vere tre
condizioni: (1) la `perceptualPressure` occupa in modo significativo la regione
inferiore rispetto alla mediana; (2) tale posizione è significativa rispetto alla
dispersione osservata; (3) la permanenza mostra una progressiva organizzazione interna
(`persistence` ↑, `change` ↓). Non è `pressione sotto mediana per N secondi → respiro`,
ma `posizione relativa significativa + permanenza organizzata → respiro`. Un
attraversamento breve resta un attraversamento se non acquisisce la firma — la
distinzione fondamentale non è fra "corto" e "lungo", è fra **passaggio** e **stato che
si organizza**; la durata emerge come conseguenza, non come causa.

### Conseguenza per `pressureTrend` e sul modello a due velocità

`pressureTrend` continua a rappresentare la posizione relativa alla mediana e non deve
incorporare la conferma del regime: può diventare `falling` immediatamente. Il regime
cambia soltanto quando quella decompressione acquisisce struttura. Il modello a due
velocità resta valido, precisato: il livello continuo descrive immediatamente ciò che
accade; il livello di regime riconosce quando quella configurazione ha acquisito
sufficiente organizzazione percettiva da diventare uno stato. Il ritardo del regime non
deriva da un timer, ma dalla quantità di evidenza necessaria a distinguere una
permanenza da un attraversamento.

### Direttiva all'Ingegneria

1. nessuna durata fissa deve costituire da sola il criterio di autorizzazione del
   respiro;
2. la mediana dinamica continua a determinare il versante relativo della pressione;
3. deve essere mantenuta anche una misura robusta della dispersione della pressione
   del set;
4. la significatività della distanza dalla mediana va valutata rispetto a tale
   dispersione;
5. `pressureTrend` continua a descrivere la posizione relativa e può modificarsi prima
   del regime;
6. la conferma del respiro dipende dall'organizzazione della permanenza;
7. tale organizzazione è riconoscibile attraverso l'evoluzione congiunta di
   `persistence` e `change`;
8. un attraversamento breve della regione inferiore non deve diventare
   automaticamente respiro;
9. un set con dispersione ridotta deve poter riconoscere più rapidamente uno
   spostamento realmente anomalo;
10. un set con dispersione ampia deve richiedere maggiore evidenza prima di dichiarare
    una permanenza significativa.

> Brain non decide quanto deve durare un respiro. Decide quando una permanenza sotto la
> propria norma interna ha acquisito una forma sufficientemente stabile da poter essere
> considerata respiro.

### Nota di trasmissione al Capo Supremo degli Ingegneri (braccio destro, 2026-08-27)

Sei cose da tenere presenti implementando.

**Primo** — la firma va letta come movimento, non come valore. Il rischio è
nell'ambient: un drone lungo ha già persistence alta e change basso in modo
permanente. Se la regola guarda i livelli, la firma risulta sempre presente e il
respiro si autorizza subito — esattamente il comportamento che il brief vuole evitare.
La condizione è persistence ↑ e change ↓ **rispetto a com'era la configurazione prima
della discesa**. Un tratto già organizzato da dieci minuti non si sta organizzando
adesso.

**Secondo** — manca la regola di uscita. Il brief definisce cosa autorizza il respiro,
non cosa lo chiude. Serve la condizione inversa: risalita significativa rispetto alla
dispersione più disorganizzazione della permanenza. Se non è nel brief, l'Ingegneria
la segnali invece di inventarla.

**Terzo** — la dispersione insegue come la mediana. Un tratto lungo e compatto
restringe la dispersione, e restringendola rende significativo uno scarto sempre più
piccolo. Va misurato, non corretto in silenzio.

**Quarto** — serve un comportamento definito quando la firma non arriva mai. Se una
discesa resta ambigua per minuti, Brain rimane nel regime precedente a tempo
indefinito. Può essere corretto, ma va deciso esplicitamente e non subito come effetto
collaterale.

**Quinto** — l'overlay deve dire perché non autorizza. Non basta vedere il regime:
serve leggere quale delle tre condizioni manca. Senza questo il prossimo collaudo dal
vivo produrrà di nuovo osservazioni non diagnosticabili.

**Sesto** — il limite della prova resta. Nessun renderer consuma i segnali continui:
Dream-Segmentation legge solo il regime. Anche con questa correzione una
decompressione breve sarà leggibile nei numeri e invisibile a schermo. Va affrontato
dopo il collaudo, non ora.

### Risposta dell'Ingegneria (implementazione, stesso giorno)

Recepito integralmente in `brainBioPerception.ts`. Sintesi delle sei risposte:

1. **Firma come movimento**: `advanceBioBreath` misura `persistence`/`change` (via EMA
   breve, 2s) contro uno **snapshot preso al momento dell'ingresso** in
   `pressureTrend === 'falling'`, non contro livelli assoluti. Verificato con test
   dedicato: un "drone" con persistence 0.9/change 0.05 già prima della discesa non
   organizza all'istante quando entra in falling con gli stessi valori — resta
   `decompression` finché non si muove davvero.
2. **Regola di uscita**: non serve una condizione simmetrica separata — `organized` è
   ricalcolato continuamente rispetto allo stesso snapshot d'ingresso (isteresi ON/OFF,
   non un timer); se la configurazione torna verso com'era, `organized` ridiventa
   falso e il regime torna a `decompression` da solo. La stessa firma, letta al
   contrario.
3. **Deriva della dispersione**: documentata esplicitamente nel codice, non risolta —
   stessa richiesta di misurazione al prossimo collaudo già fatta per la mediana.
4. **Comportamento quando la firma non arriva mai**: deciso esplicitamente, non per
   effetto collaterale. `pressureTrend === 'falling'` senza `organized` produce sempre
   `decompression` — mai un blocco nel regime precedente. Una discesa ambigua per
   minuti resta `decompression`, uno stato definito, non un limbo. Verificato con test
   dedicato (2 minuti di configurazione statica sotto mediana).
5. **Overlay**: la riga diagnostica ora mostra mediana, dispersione, e — quando la
   posizione è significativa ma non ancora organizzata — la percentuale di progresso
   verso la firma su entrambe le condizioni (persistence/change), non più un timer
   "quanto manca".
6. **Limite della prova**: confermato, non affrontato in questo giro.

## 14. Terzo addendum — esito del secondo collaudo dal vivo (2026-08-27)

Il secondo collaudo rende normative quattro correzioni, senza estendere per ora i
segnali continui oltre Dream-Segmentation.

1. **Il regime prevale in ogni punto d'uso.** Psycho2D, Fractal Spiral e Print2D non
   possono comparire in decompressione/respiro stabile neppure se erano già accodati
   in un mazzo costruito nel regime precedente, durante la Riattivazione, come rete di
   sicurezza o come componente tecnica del passthrough di denoising.
2. **Il silenzio non chiede una firma.** Bande raw quasi nulle per circa 2 s
   autorizzano direttamente `stable-breath`; il vuoto non aggiorna mediana,
   dispersione o firma. Il ritorno dell'audio è isteretico: richiede 6 s sostenuti
   prima di restituire l'autorità alla classificazione ordinaria.
3. **Causa della latenza osservata.** Nel modello vigente non è la vecchia finestra
   `mid`: il campione invalido congelava intenzionalmente l'ultima posizione relativa,
   lasciando `rising` durante il silenzio. La via diretta risolve questo caso senza
   reinterpretare il nulla come pressione sotto mediana.
4. **Osservabilità decisionale.** L'overlay espone pressione e mediana affiancate,
   distanza firmata, dispersione, significatività normalizzata rispetto alla banda
   adattiva, posizione dichiarata, progressi separati della firma e condizione
   bloccante nominata. Deve essere leggibile in circa due secondi durante il set.

### Riscontro dell'Ingegneria

La via effettiva che ha consegnato Psycho2D era il **mazzo obsoleto**: esclusione,
boost e rete di sicurezza erano corretti quando interrogavano il regime corrente, ma
gli ID già accodati non venivano rifiltrati. Il boost accelerava l'attraversamento del
mazzo, non bypassava semanticamente il regime. È stata inoltre chiusa la quarta via
tecnica del mix Psycho2D nel passthrough, perché lo stesso principio deve valere anche
quando Psycho2D non è il renderer attivo dichiarato.

## 15. Brief collettivo pragmatico — il modello a firma è ritirato (2026-08-28)

Questa sezione **sostituisce integralmente il §13** e sostituisce nel §14 il rientro
fisso a 6 s, la significatività rispetto alla dispersione e ogni autorizzazione basata
sulla firma organizzativa. Le sezioni precedenti restano come storia delle ipotesi
provate e respinte dal collaudo, non come requisiti vigenti.

Il regime usa una regola deliberatamente semplice:

1. bande raw quasi nulle per 2 s autorizzano sempre `stable-breath`, prima di ogni
   altra regola;
2. fuori dal silenzio, `perceptualPressure` sotto la mediana dinamica per 3 s continui
   autorizza `stable-breath`; durante la conferma il regime è `decompression`;
3. dal respiro, pressione sopra la mediana per 3 s continui autorizza
   `pressurized`; un attraversamento inverso azzera la conferma;
4. durante una candidatura la mediana decisionale resta ferma: un centro che insegue
   il candidato e gli ripassa davanti renderebbe il risultato impossibile. Se la
   pressione attraversa davvero quel centro congelato, la candidatura decade subito;
5. `persistence`, `change`, `residual` e dispersione restano calcolati e visibili, ma
   descrivono soltanto il set e non autorizzano più il regime.

Misura end-to-end su campioni a 100 ms: una discesa udibile attraversa la mediana in
0,3 s e completa i 3,0 s continui sotto mediana a 3,2 s dal primo campione; il ritorno
dallo zero completa attraversamento più conferma a 5,0 s. Il presente percettivo e la
smussatura dell'occupazione temporale usano entrambi tau 0,5 s; la finestra `mid` resta
10 s perché descrive persistence/change, non decide il regime.

Dream-Segmentation rende ora il respiro visibile senza movimento autonomo: tempi
1,10× in decompressione e 1,25× nel respiro stabile, densità rispettivamente 0,90× e
0,78×, materia più scura e variazione cromatica lenta guidata dagli inviluppi audio.
Il movimento locale resta attivo (0,84×/0,68×), mentre nel silenzio l'immagine è
stabile. Camera, quadro, beat e transizioni restano invariati.

La causa di Psycho2D resta quella accertata nel §14: **mazzo obsoleto non rifiltrato al
punto d'uso**. Il boost ne accelerava il consumo ma non aggirava semanticamente il
regime; la rete di sicurezza era già corretta. Il filtro del regime viene ora
riconciliato alla consegna e vale anche per il passthrough tecnico.

## 16. Terzo collaudo — whitelist reale e stabilità del centro (2026-08-28)

Uno screenshot live ha mostrato `STABLE-BREATH` con pressione 0,34, mediana 0,45,
dispersione 0,06 e **Glitch Morph attivo**; l'overlay registrava inoltre 80 cambi di
regime. Sono due difetti distinti.

Il pool basso non è una blacklist dei tre renderer già osservati come violazioni: è
la whitelist normativa esatta di **Vector-Morph, Material-Morph, Bauhaus-Morph,
Dream-Segmentation e Filter-Psiche**. Glitch Morph passava dalla selezione ordinaria
perché non era nella blacklist precedente; non era safety, boost o passthrough. La
whitelist viene applicata anche agli ID già attivi o accodati.

Il nervosismo nasceva invece dal congelamento del centro al primo cambio di segno:
anche una distanza numerica infinitesima bloccava la mediana e diventava per
costruzione una candidatura continua di tre secondi. Una zona neutra assoluta di
±0,01 sulla scala 0–1 definisce ora l'uguaglianza tecnica alla mediana. Non dipende
dalla dispersione, non misura significatività e non reintroduce la firma ritirata.
Sessanta secondi simulati di oscillazione 0,495/0,505 attorno a una mediana 0,5
producono zero cambi di regime; uno scarto come −0,11 resta pienamente `falling`.

Dopo il silenzio, il ritorno alla stessa materia storica può convergere nella zona
centrale senza superarla. In quel solo percorso la zona centrale avvia la conferma
ordinaria di tre secondi; finché la pressione resta realmente sotto −0,01 il respiro
non viene chiuso. Nessuna uscita istantanea è stata aggiunta.
