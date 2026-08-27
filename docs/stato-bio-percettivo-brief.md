# Stato Bio-Percettivo — Brief Funzionale (esplorativo, superato)

Brief del [Capo Supremo dell'Analisi Audio / Sound Designer di Brain](../team/capo-supremo-analisi-audio.md), consegnato senza prescrizioni tecniche: studio, architettura, algoritmi, strutture dati e collocazione software restano materia del Capo Supremo degli Ingegneri e del team tecnico (vedi discussione critica in `working/STATE.md`).

**Stato**: prima formulazione, esplorativa — 6 dimensioni fenomenologiche (mobilization, tension, pulsation, corporeality, instability, recovery) su 3 scale temporali. Il modello operativo attuale, scritto in risposta al brief Visual e con scope ridotto a 5 segnali (`persistence`, `change`, `residual`, `perceptualPressure`, `pressureTrend`), è [`team/briefs/brief-audio-persistence-pressure-respiro.md`](../team/briefs/brief-audio-persistence-pressure-respiro.md) — quello fa fede per qualunque lavoro tecnico. Questo documento resta come riferimento storico delle criticità discusse e del percorso che ha portato al modello a 5 segnali, non come specifica da implementare.

## Contesto

Nel dominio Sound Design / Analisi Audio di Brain emerge la necessità di affiancare alle misure già disponibili una rappresentazione dello **stato corporeo-percettivo prodotto dal suono nel tempo**.

Il sistema attuale dispone già di informazioni affidabili relative a:

* energia nelle bande `low`, `lowMid`, `mid`, `high`;
* transient per banda;
* beat;
* beat phase;
* beat pulse;
* kick envelope;
* attività o silenzio del segnale;
* medie temporali e baseline dinamiche.

Questi dati descrivono efficacemente proprietà acustiche e ritmiche del segnale.

Non descrivono ancora, però, il fenomeno che interessa a questo nuovo livello:

**come la configurazione sonora corrente modifica lo stato percettivo e corporeo interno di Brain rispetto allo stato che esisteva precedentemente.**

Il nuovo dominio viene indicato provvisoriamente come **stato bio-percettivo**.

## 1. Significato funzionale

Lo stato bio-percettivo non rappresenta un'emozione e non tenta di stabilire cosa "significa" una musica.

Rappresenta una dinamica più elementare:

**come il suono tende a organizzare, mobilitare, comprimere, destabilizzare, sostenere o lasciare recuperare un corpo percettivo.**

Il riferimento bioenergetico viene assunto esclusivamente sul piano fenomenologico.

Sono rilevanti concetti come:

`tensione`

`attivazione`

`contrazione`

`espansione`

`pulsazione`

`carica`

`scarica`

`rilascio`

`recupero`

Questi termini non indicano energie fisiche ipotetiche.

Descrivono **configurazioni temporali dell'esperienza corporea del suono**.

## 2. Principio fondamentale: stato, non mapping

Una caratteristica acustica non determina direttamente uno stato bio-percettivo.

Non valgono equivalenze del tipo:

`bassi forti = corporeità`

`volume alto = mobilizzazione`

`transient = scarica`

`silenzio = rilassamento`

`ritmo regolare = pulsazione`

Il significato dipende dalla relazione fra:

* configurazione corrente;
* configurazione precedente;
* durata;
* persistenza;
* direzione della variazione;
* prevedibilità;
* rottura della prevedibilità;
* presenza o assenza di una periodicità;
* eventuale recupero successivo.

Lo stesso valore acustico può quindi avere significati differenti in momenti differenti.

## 3. Persistenza dello stato

Lo stato bio-percettivo possiede memoria.

Brain deve poter distinguere fra:

**variazione**

qualcosa cambia nel segnale senza modificare significativamente la condizione percettiva complessiva;

**persistenza**

il materiale acustico evolve, ma continua a sostenere sostanzialmente lo stesso stato;

**transizione**

lo stato precedente sta progressivamente perdendo validità e ne sta emergendo un altro;

**evento**

la trasformazione è sufficientemente significativa da produrre una discontinuità percettiva;

**recupero**

lo stato perde progressivamente mobilizzazione, pressione o instabilità e tende verso una condizione meno attivata;

**sospensione**

l'attività può diminuire fortemente senza che il significato dello stato precedente sia ancora completamente dissolto.

Queste condizioni sono centrali perché impediscono di interpretare ogni variazione acustica come un nuovo evento.

## 4. Dimensioni percettive fondamentali

### Mobilization

Indica quanto il corpo percettivo viene spinto verso l'attivazione.

Non coincide con il volume.

Una configurazione sonora può essere molto intensa ma stabile e quindi produrre una mobilizzazione relativamente costante.

Al contrario, un cambiamento rapido e strutturalmente rilevante può aumentare fortemente la mobilizzazione anche senza grande aumento dell'energia assoluta.

Occorre quindi distinguere:

`livello di mobilizzazione`

da

`variazione della mobilizzazione`.

Sono due fenomeni diversi.

### Tension

Descrive la presenza di una condizione di:

* pressione;
* contrazione;
* trattenimento;
* vigilanza;
* accumulo;
* difficoltà di risoluzione.

La tensione è particolarmente dipendente dal tempo.

Una configurazione stabile può progressivamente aumentare la tensione proprio perché permane senza risolversi.

Allo stesso modo una struttura molto energetica può avere tensione ridotta se è completamente prevedibile e stabilizzata.

La tensione deve quindi poter crescere anche **senza un aumento parallelo dell'energia**.

### Pulsation

Descrive la capacità del suono di produrre un'organizzazione periodica percepibile dal corpo.

Non corrisponde semplicemente alla presenza di beat.

Sono rilevanti almeno:

* chiarezza della periodicità;
* stabilità;
* continuità;
* possibilità di anticipare il prossimo evento;
* perdita temporanea della pulsazione;
* ritorno della pulsazione;
* eventuale ambiguità metrica.

Una pulsazione può continuare ad essere percettivamente presente anche quando alcuni attacchi vengono omessi.

Viceversa una successione di transient può essere ritmica senza produrre una pulsazione corporea sufficientemente stabile.

### Corporeality

Descrive quanto il suono viene percepito come presenza fisica.

È diversa dall'energia generale.

Può essere sostenuta da:

* componenti basse;
* pressione sonora percepita;
* comportamento dell'envelope;
* persistenza;
* periodicità;
* caratteristiche timbriche;
* capacità del materiale di produrre accoppiamento sensorimotorio.

Una componente bassa continua e poco articolata, una pulsazione profonda e un singolo impulso molto potente possono avere valori energetici simili ma produrre forme di corporeità molto differenti.

La corporeità deve quindi rappresentare una **qualità dello stato**, non semplicemente una quantità di low frequency energy.

### Instability

Descrive quanto ciò che sta accadendo si discosta dal modello temporale che il sistema aveva progressivamente costruito.

È fondamentale distinguere:

`complessità`

da

`instabilità`.

Una struttura molto complessa ma persistente può diventare prevedibile e quindi stabilizzarsi.

Una piccola variazione dentro una struttura estremamente prevedibile può invece generare una forte instabilità percettiva.

L'instabilità è quindi relativa alla memoria recente.

Può emergere da:

* rottura della periodicità;
* modificazione inattesa della densità;
* variazione timbrica significativa;
* cambiamenti dell'envelope;
* comparsa o scomparsa improvvisa di una componente;
* cambiamento dell'organizzazione temporale;
* deviazione rispetto alle aspettative costruite.

### Recovery

Descrive una traiettoria di ritorno da uno stato precedentemente mobilizzato, teso o instabile.

Recovery non significa semplicemente:

`energia che diminuisce`.

Per parlare di recupero deve esistere **qualcosa da cui recuperare**.

Una parte musicale poco energetica che segue un'altra parte altrettanto poco energetica non costituisce necessariamente recovery.

Una forte diminuzione dell'attività dopo un periodo di elevata mobilizzazione, invece, può rappresentare chiaramente una traiettoria di recupero.

Il valore deve quindi dipendere dalla memoria dello stato precedente.

## 5. Dinamiche bioenergetiche

La sequenza classica:

`tensione → carica → scarica → rilassamento`

viene utilizzata come descrizione di una possibile **traiettoria**, non come classificazione obbligatoria del segnale.

Brain deve poter riconoscere anche traiettorie differenti:

`tensione → maggiore tensione → sospensione`

`mobilizzazione → stabilizzazione`

`pulsazione → interruzione → instabilità`

`pressione → rarefazione → sospensione`

`instabilità → nuova stabilità`

`mobilizzazione → scarica → recupero`

`quiete → mobilizzazione improvvisa`

`stabilità → trasformazione lenta`

Non esiste quindi una macchina a stati obbligatoria nella quale ogni fase debba condurre alla successiva.

Il concetto importante è la **direzione del cambiamento**.

## 6. Il tempo è parte del significato

Lo stato bio-percettivo deve distinguere almeno tre scale temporali.

### Reazione

Fenomeni molto brevi.

Esempi:

* transient;
* attacco;
* discontinuità;
* impulso.

Possono modificare momentaneamente lo stato senza necessariamente trasformarlo.

### Condizione

Fenomeni che persistono abbastanza da costruire una configurazione riconoscibile.

Esempi:

* pulsazione stabile;
* pressione continua;
* densità persistente;
* rarefazione.

### Traiettoria

Evoluzione della condizione nel tempo.

Esempi:

* tensione che aumenta;
* corporeità che progressivamente scompare;
* mobilizzazione che cresce;
* instabilità che viene progressivamente assorbita;
* recupero dopo un periodo di forte attivazione.

Per il sound design di Brain la traiettoria è spesso più significativa del valore corrente.

## 7. Eventi percettivi

Occorre poter distinguere un **evento acustico** da un **evento percettivo**.

Un transient è un evento acustico.

Può però verificarsi dentro una struttura nella quale transient simili sono già attesi.

In quel caso il suo significato percettivo può essere minimo.

Al contrario:

* la scomparsa improvvisa della pulsazione;
* una modifica del comportamento timbrico;
* una rottura della densità;
* una rarefazione inattesa;
* una modifica strutturale dell'envelope;

possono costituire eventi percettivi anche in assenza di un grande picco energetico.

La rilevanza dell'evento deve quindi dipendere dalla relazione fra:

`novità`

`persistenza precedente`

`entità della deviazione`

`stato corrente`

`aspettativa costruita`.

## 8. Silenzio e rarefazione

Il sistema attuale possiede già un concetto di `active` che evita di continuare a proiettare attività ritmica quando il segnale scende stabilmente sotto soglia.

Nel nuovo modello occorre distinguere ulteriormente:

`silenzio`

`rarefazione`

`sospensione`

`recupero`

`quiete stabile`

Sono condizioni percettivamente differenti.

Il silenzio successivo a una forte mobilizzazione può mantenere una tensione residua.

Il silenzio dopo una fase di recupero può invece costituire quiete.

La stessa assenza di segnale deve quindi poter assumere significati differenti in funzione della memoria precedente.

## 9. Relazione con il sistema audio esistente

Il nuovo livello non sostituisce:

* beat detection;
* beat phase;
* band transients;
* kick envelope;
* band energies;
* moving averages;
* flash detection;
* stato `active`.

Queste informazioni rappresentano fenomeni acustici e ritmici già utili.

Lo stato bio-percettivo introduce una diversa domanda:

**che cosa sta facendo questo insieme di fenomeni allo stato percettivo interno di Brain?**

Il rapporto funzionale può essere espresso così:

`fenomeno acustico`
↓
`comportamento temporale`
↓
`interpretazione bio-percettiva`
↓
`persistenza / trasformazione / evento`

## 10. Relazione con Coscienza Onirica

La filosofia generale di Brain rimane:

`audio → percezione → stato affettivo e associativo → modello immaginativo → manifestazione visiva`

Lo stato bio-percettivo appartiene esclusivamente al livello:

`percezione`

Non determina direttamente:

* immagini;
* renderer;
* estetica;
* colori;
* movimento;
* metamorfosi;
* significati narrativi.

Deve fornire una descrizione più ricca dello stato prodotto dal suono affinché i livelli successivi possano utilizzarla secondo le proprie responsabilità.

## 11. Informazioni funzionali che devono risultare disponibili

Dal punto di vista Sound Design, il sistema deve rendere conoscibili almeno:

* stato corrente delle dimensioni bio-percettive;
* direzione corrente di ciascuna dimensione;
* persistenza dello stato;
* stabilità dello stato;
* differenza rispetto allo stato precedente;
* presenza di una transizione;
* presenza di un evento percettivamente significativo;
* eventuale fase di recupero;
* eventuale sospensione;
* grado di affidabilità della lettura.

La rappresentazione tecnica di queste informazioni non appartiene a questa specifica.

## 12. Casi funzionali di riferimento

### Caso A — Energia elevata e stabile

Il materiale resta intenso per diversi secondi.

L'energia assoluta è alta.

La pulsazione è stabile.

Gli eventi sono prevedibili.

Possibile lettura:

* mobilization alta;
* pulsation alta;
* instability bassa;
* tension stabile o progressivamente crescente;
* nessun nuovo evento percettivo necessario.

Serve evitare che l'energia elevata venga continuamente interpretata come trasformazione.

### Caso B — Piccola rottura dentro una struttura stabile

La configurazione energetica cambia poco.

Un elemento ritmico atteso scompare o si sposta.

Possibile lettura:

* mobilization quasi invariata;
* pulsation temporaneamente indebolita;
* instability elevata;
* evento percettivo significativo.

Il sistema deve poter riconoscere importanza senza richiedere un grande aumento energetico.

### Caso C — Progressiva rarefazione

L'energia diminuisce lentamente.

I transient diventano meno frequenti.

La periodicità perde progressivamente definizione.

Possibile lettura:

* mobilization decrescente;
* corporeality decrescente;
* pulsation decrescente;
* recovery crescente oppure sospensione, a seconda dello stato precedente.

### Caso D — Silenzio dopo forte pressione

Il segnale cade rapidamente.

Il sistema proveniva da una condizione persistente di forte mobilizzazione e tensione.

Possibile lettura:

* forte variazione istantanea;
* mobilization in diminuzione;
* tension eventualmente ancora presente;
* recovery emergente;
* possibile sospensione.

Il silenzio non deve cancellare immediatamente lo stato precedente.

### Caso E — Pattern complesso che diventa stabile

Inizialmente il materiale appare irregolare.

Dopo diversi secondi la struttura resta sostanzialmente invariata.

Possibile lettura:

* instability inizialmente alta;
* progressiva diminuzione dell'instability;
* costruzione di una nuova aspettativa;
* stabilizzazione dello stato.

Serve quindi un comportamento adattivo alla persistenza.

## 13. Criteri qualitativi

Considererei funzionalmente corretta la futura rappresentazione se soddisfacesse questi principi:

**Continuità**

Piccole oscillazioni del segnale non producono continui cambiamenti dello stato.

**Memoria**

Lo stesso input corrente può assumere significato differente a seconda della storia precedente.

**Relatività**

L'importanza di una variazione viene valutata rispetto allo stato corrente e alle aspettative costruite.

**Separazione fra energia ed evento**

Un segnale molto energetico può essere stabile.

Un segnale poco energetico può contenere un evento molto significativo.

**Separazione fra feature e percezione**

Nessuna singola feature acustica determina automaticamente una dimensione bio-percettiva.

**Riconoscimento delle traiettorie**

Il sistema rappresenta non soltanto "quanto", ma anche "verso dove".

**Validità del silenzio**

Il silenzio mantiene una relazione con ciò che lo precede.

**Instabilità produttiva**

Lo stato può restare ambiguo e trasformarsi progressivamente senza essere costretto immediatamente dentro una classificazione definitiva.

## 14. Risultato atteso

Dal dominio Sound Design non viene richiesta una nuova forma di visualizzazione né una specifica soluzione algoritmica.

Il requisito funzionale è che Brain possa passare da una descrizione prevalentemente acustico-ritmica:

`energia / banda / transient / beat / fase`

a una descrizione capace di rappresentare anche:

`corpo / stato / memoria / traiettoria / trasformazione`

Il risultato concettuale desiderato è:

`audio`
→ `fenomeni acustici`
→ `organizzazione temporale`
→ **`stato bio-percettivo persistente`**
→ `continuità / trasformazione / evento`

Lo studio tecnico, l'architettura, la collocazione delle responsabilità software, gli algoritmi, le strutture dati, le frequenze di aggiornamento e le modalità di integrazione restano materia del Capo Supremo degli Ingegneri e del team tecnico.

## Criticità emerse in discussione (2026-08-21/26)

Discusse con il team tecnico prima di aprire un piano — nessuna decisione presa, solo punti da sciogliere quando/se si apre un PIANO:

1. **Paradigma diverso da tutto ciò che esiste.** Ogni pezzo attuale (flash engine, beat detection, transient) è una mappa feature→soglia con EMA a τ fissi (28ms–900ms). Qui l'instabilità è definita relativa a "un modello temporale che il sistema ha costruito" — serve qualcosa vicino a un modello di aspettativa/predizione, non un'estensione della pipeline a soglie.
2. **Scala di memoria incompatibile con l'attuale.** I decay più lunghi oggi arrivano a τ 260ms; `OutputRhythmClock` inoltre **resetta** i transient a 0 sui gap >1500ms. Il brief richiede persistenza/traiettorie su più secondi, con memoria dello stato precedente che sopravvive al silenzio — serve un buffer di stato separato dalla rete di sicurezza sui gap RAF.
3. **Dove vive architetturalmente.** L'estrazione feature è in Control, la ricostruzione ritmica in Output (deve girare sul proprio RAF). Uno stato con memoria multi-secondo rischia di azzerarsi ad ogni riavvio/cambio renderer dell'Output se collocato solo lì.
4. **Rischio di sovrapposizione con `active`.** I 5 stati di silenzio richiesti (silenzio/rarefazione/sospensione/recupero/quiete) andrebbero sopra un'isteresi binaria (`signalActive`, soglie 0.018/0.008, hold 900ms) tarata per un compito diverso (congelare l'avanzamento di fase), non per il significato percettivo.
5. **Rischio di sovra-ingegnerizzazione senza consumer.** Nessun renderer Brain oggi consuma altro che `beat/beatPhase/beatPulse/kickEnvelope/bandTransients`. Costruire 6 dimensioni × 3 scale temporali senza un consumer concreto rischia la stessa lezione già imparata con le figure Bauhaus (test verdi, feature invisibile con audio reale) — qui amplificata, perché la sola verifica possibile è l'ascolto dal vivo.

Punto più bloccante per un piano tecnico: 2+3 insieme — dove vive la memoria e come sopravvive ai gap/reset che oggi il sistema tratta come "safe to discard".
