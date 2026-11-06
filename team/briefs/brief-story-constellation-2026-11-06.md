# BRIEF — STORY CONSTELLATION
## Navigazione tridimensionale fra le storie di Brain basata sull’esempio ufficiale Three.js `webgl_buffergeometry_drawrange`

**Destinatari:** Capo Supremo degli Ingegneri; Capo Supremo dell’Analisi Audio; Vicario; Direzione Visual  
**Mandante:** Capo Supremo  
**Mittente:** Capo Supremo del Visual Design  
**Data di archiviazione:** 2026-11-06  
**Branch:** `feature/story-constellation`  
**Stato:** decisione del Capo Supremo + specifica Visual da progettare e implementare  
**Nome operativo:** `STORY CONSTELLATION`  
**Nota di archiviazione:** testo riportato integralmente come consegnato dal
Capo Supremo. Omessa soltanto la riga di accompagnamento iniziale del
mittente; mantenuta la nota di chiusura sui riferimenti.

---

# 0. RIFERIMENTI TECNICI OBBLIGATORI

Questi riferimenti fanno parte del brief e **non devono essere persi nelle successive riscritture, implementazioni o passaggi di consegne**.

**Esempio ufficiale Three.js fornito dal Capo Supremo:**  
[Three.js — webgl_buffergeometry_drawrange](https://threejs.org/examples/webgl_buffergeometry_drawrange?utm_source=chatgpt.com)

**Sorgente ufficiale dell’esempio:**  
[Three.js GitHub — sorgente webgl_buffergeometry_drawrange.html](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_buffergeometry_drawrange.html?utm_source=chatgpt.com)

**Documentazione ufficiale `BufferGeometry`:**  
[Three.js Docs — BufferGeometry](https://threejs.org/docs/?utm_source=chatgpt.com#api/en/core/BufferGeometry)

## ISTRUZIONE ALL’INGEGNERIA

Prima di implementare il componente, **studiare la demo e il relativo sorgente ufficiale**.

Non utilizzare l’esempio soltanto come riferimento estetico.

Esso costituisce la **baseline tecnica iniziale**.

Non ricostruire senza necessità ciò che Three.js e questo esempio forniscono già.

---

# 1. DECISIONE DEL CAPO SUPREMO

La navigazione fra una storia e quella successiva di Brain deve passare attraverso un campo tridimensionale di nodi derivato dalla grammatica tecnica dell’esempio Three.js indicato sopra.

Ogni nodo rappresenta una **storia possibile**.

Brain attraversa la rete.

Quando viene scelto un nodo:

> **Brain zooma verso quel nodo.**

Quando il nodo viene raggiunto:

> **il nodo apre una storia.**

Terminata la storia, Brain può tornare allo spazio dei nodi e orientarsi verso la storia successiva.

I nodi inoltre:

> **cambiano colore e pulsano in relazione al beat e ai parametri Audio di Brain.**

Questi punti sono decisioni del Capo Supremo.

---

# 2. CHE COS’È IL COMPONENTE

`STORY CONSTELLATION` non è:

- un renderer;
- una semplice transizione;
- un menu;
- una schermata di caricamento;
- un visualizer musicale;
- una rete neurale illustrativa.

È:

> **lo spazio attraverso il quale Brain naviga fra le proprie storie.**

Brain acquisisce così un livello che prima non esisteva:

**uno spazio fra i mondi narrativi.**

---

# 3. COSA FORNISCE GIÀ L’ESEMPIO THREE.JS

Il sorgente ufficiale non è un’immagine da imitare.

Contiene già una struttura operativa utile.

L’esempio utilizza:

- `THREE.PerspectiveCamera`;
- `THREE.Scene`;
- `THREE.Group`;
- `THREE.Points`;
- `THREE.LineSegments`;
- `THREE.BufferGeometry`;
- `THREE.BufferAttribute`;
- `THREE.DynamicDrawUsage`;
- `THREE.PointsMaterial`;
- `THREE.LineBasicMaterial`;
- `THREE.AdditiveBlending`;
- buffer dinamici di posizione;
- buffer dinamici di colore;
- `setDrawRange()` per punti e connessioni;
- movimento individuale delle particelle;
- connessioni create in funzione della distanza;
- limite opzionale al numero di connessioni. [GitHub](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_buffergeometry_drawrange.html)

Questa parte non va reinventata per principio.

---

# 4. BASeline TECNICA DA RIUSARE

La struttura iniziale deve restare concettualmente vicina all’esempio:

`posizioni dei nodi`
→
`BufferGeometry`
→
`THREE.Points`

e:

`relazioni di prossimità`
→
`buffer dinamico`
→
`THREE.LineSegments`

L’esempio ufficiale utilizza attributi dinamici per posizione e colore e aggiorna il draw range delle linee in funzione del numero effettivo di segmenti presenti. [GitHub](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_buffergeometry_drawrange.html)

Questo è esattamente il genere di infrastruttura che deve essere **riusata e adattata**, non ricostruita da zero.

---

# 5. `drawRange`

Nella demo il numero di punti visibili viene modificato attraverso:

`particles.setDrawRange(...)`

e il numero di vertici delle connessioni attraverso:

`linesMesh.geometry.setDrawRange(...)`. [GitHub](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_buffergeometry_drawrange.html)

La documentazione Three.js definisce `drawRange` come il sottoinsieme della geometria che viene effettivamente renderizzato. [threejs.org](https://threejs.org/docs/)

Per Brain questo può diventare utile per:

- numero di nodi attivi;
- densità della costellazione;
- numero di connessioni;
- degradazione sotto pressione GPU;
- comparsa progressiva di strutture.

Non significa che `drawRange` debba controllare ogni comportamento del componente.

Significa che **non va reinventato un meccanismo che Three.js possiede già**.

---

# 6. CONNESSIONI PER PROSSIMITÀ

Nel riferimento ufficiale due punti vengono connessi quando la loro distanza è inferiore a `minDistance`.

L’intensità associata alla connessione viene calcolata in funzione della vicinanza con una relazione del tipo:

`1 - distance / minDistance`. [GitHub](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_buffergeometry_drawrange.html)

Questa logica costituisce una buona prima baseline per Brain.

Per il primo PoC:

> **non serve inventare una teoria semantica delle connessioni.**

La relazione spaziale è sufficiente.

In seguito potremo decidere se la memoria di Brain debba modificare la topologia.

---

# 7. I PUNTI THREE.JS DIVENTANO STORY NODES

La particella generica della demo diventa un **nodo narrativo**.

Ogni nodo deve poter possedere uno stato Brain.

Concettualmente:

- identità della storia;
- posizione 3D;
- colore;
- intensità;
- pulse;
- stato visitato/non visitato;
- stato target/non-target;
- stato Audio corrente;
- eventuale memoria Visual.

La struttura dati esatta appartiene all’Ingegneria.

Il requisito Visual è che ogni nodo possa acquisire **identità percettiva individuale**.

---

# 8. UN NODO = UNA STORIA

Regola fondamentale stabilita dal Capo Supremo:

> **ogni nodo raggiunto/zoomato apre una storia.**

Non deve quindi esistere:

`nodo puramente decorativo`

quando quel nodo è selezionato come destinazione.

Il nodo è la forma compressa della storia.

La storia è la forma dispiegata del nodo.

---

# 9. CICLO DI BRAIN

La nuova struttura generale diventa:

`STORIA A`

→ eventuale `ANIMATRONIX`

→ uscita dalla storia

→ `STORY CONSTELLATION`

→ navigazione nella rete

→ selezione nodo

→ avvicinamento / zoom

→ nodo occupa progressivamente il campo

→ apertura

→ `STORIA B`

→ …

La rete non deve apparire come una schermata separata dalla vita di Brain.

---

# 10. TRANSIZIONE STORIA → COSTELLAZIONE

Non voglio:

`raster`
→ nero
→ rete.

La storia terminata deve poter **condensarsi** verso il proprio nodo.

Possibile grammatica percettiva:

`mondo`
→
`perdita progressiva di dettaglio`
→
`riduzione a masse / luce / colore`
→
`compressione spaziale`
→
`nodo`
→
`rete`.

La soluzione tecnica resta all’Ingegneria.

Il requisito è la continuità percettiva.

---

# 11. TRANSIZIONE NODO → STORIA

Ancora più importante.

Non:

`punto`
→ crossfade
→ raster.

Non:

`punto`
→ cerchio enorme
→ immagine.

Non:

`iride`
→ storia.

La direzione è:

`NODE`
→
`MASSA`
→
`CAMPO`
→
`RASTER`.

Il nodo si espande fino a perdere la propria identità di punto.

Progressivamente deve cominciare a contenere:

- colore della storia;
- materia della storia;
- tessitura;
- forme;
- raster.

Alla fine non stiamo più guardando un nodo.

Siamo dentro la storia.

---

# 12. NIENTE BUCO DELLA SERRATURA

Regola già consolidata nel linguaggio Brain.

Il nodo non deve diventare un foro attraverso il quale osserviamo l’immagine.

Niente:

- iride;
- cerchio-portale;
- buco nero;
- lente circolare;
- tunnel obbligatorio.

Lo zoom deve trasformare **l’intero campo percettivo**.

---

# 13. CAMERA

Qui il movimento di camera è necessario.

La camera deve poter:

- attraversare la rete;
- orientarsi;
- rallentare;
- deviare;
- agganciare un target;
- accelerare moderatamente;
- entrare nel nodo.

Questa fase necessita quindi di una deroga Camera analoga, ma distinta, da quella già riconosciuta ad ANIMATRONIX.

Il Vicario deve verificarne la formulazione normativa.

---

# 14. ORBITCONTROLS

L’esempio ufficiale utilizza `OrbitControls` per permettere l’esplorazione della demo. [GitHub](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_buffergeometry_drawrange.html)

In Brain:

> **OrbitControls non è la grammatica di navigazione finale.**

Può essere usato in debug e sviluppo.

La produzione deve avere camera autonoma controllata dal ciclo Brain.

Niente mouse obbligatorio.

Niente utente che ruota la rete come un modello 3D.

---

# 15. MOVIMENTO DEI NODI

Nel sorgente ufficiale ogni particella possiede una propria velocità e rimbalza quando raggiunge i limiti del volume. [GitHub](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_buffergeometry_drawrange.html)

Per Brain conserviamo:

> **movimento individuale.**

Non necessariamente:

> **bounce contro una scatola.**

Il bounce della demo è una soluzione tecnica per mantenere i punti nel volume.

Visualmente preferisco:

- drift;
- migrazione;
- lieve aggregazione;
- separazione lenta;
- deformazione della costellazione.

Non devono essere percepibili pareti invisibili.

---

# 16. NIENTE ROTAZIONE DA SCREENSAVER

L’intero spazio non deve ruotare continuamente soltanto per mostrare che è 3D.

Il movimento deve derivare principalmente da:

- camera;
- deriva dei nodi;
- profondità relativa;
- connessioni;
- Audio.

Fallisce se sembra un vecchio screensaver WebGL.

---

# 17. BEAT — DECISIONE

I nodi pulsano secondo il beat.

Ma:

> **pulsare non significa scalare tutta la rete simultaneamente.**

Il beat deve produrre un impulso locale riconoscibile.

Possibili caratteristiche:

- aumento rapido della dimensione apparente;
- aumento di intensità;
- espansione dell’halo;
- variazione cromatica breve;
- maggiore leggibilità delle connessioni.

Il pulse deve poi decadere.

---

# 18. PULSE NON SINUSOIDALE

Niente:

`sin(time)` permanente.

Il beat è un evento.

Quindi il comportamento deve essere:

`ATTACK`
→
`DECAY`
→
`STATO`.

Non:

`grande`
→
`piccolo`
→
`grande`
→
`piccolo`

autonomamente.

---

# 19. NON TUTTI I NODI REAGISCONO UGUALI

Questa è una condizione Visual forte.

Se 40 nodi fanno contemporaneamente:

`scale 1.0 → 1.2`

ogni kick:

abbiamo un visualizer.

Brain deve invece produrre **gerarchia**.

Possibile:

### Target
risposta più forte.

### Vicini del target
risposta intermedia.

### Rete periferica
risposta minore.

Il beat attraversa la topologia.

---

# 20. PROPAGAZIONE

Una direzione da sperimentare:

`BEAT`
→
`NODO TARGET`
→
`EDGE`
→
`NODI CONNESSI`
→
`DISSIPAZIONE`.

Questo trasformerebbe la rete da visualizer a organismo.

La struttura di prossimità calcolata per le linee può potenzialmente servire anche come base della propagazione.

È una proposta Visual, non una prescrizione algoritmica.

---

# 21. PARAMETRI AUDIO

Il Capo Supremo ha stabilito che i nodi cambino comportamento in funzione dei parametri Audio.

Non serve introdurre nuovi segnali se quelli esistenti sono sufficienti.

La divisione proposta resta coerente con Brain:

### Scala rapida

- beat;
- transienti;
- bande;
- pulse;
- microeventi.

### Scala lenta

- pressione;
- stato;
- continuità;
- colore;
- densità;
- comportamento generale della rete.

Audio descrive.

Visual interpreta.

---

# 22. COLORE DEI NODI

I nodi **cambiano colore in relazione all’Audio**.

Questo non deve diventare:

`kick = rosso`

`bass = blu`

`high = giallo`.

La trasformazione cromatica deve utilizzare la grammatica Color State già definita in Brain.

Quindi l’Audio può modificare indirettamente:

- pressione cromatica;
- luminanza;
- saturazione;
- contrasto;
- distanza cromatica;
- continuità;
- accento.

---

# 23. RESPIRO PROFONDO

La rete può diventare:

- meno competitiva;
- più continua;
- più lenta;
- più contaminata;
- cromaticamente più coesa;
- spazialmente più ampia.

I nodi continuano però a vivere.

Non diventano immobili.

---

# 24. RESPIRO ALTO

La rete può diventare:

- più definita;
- più concentrata;
- cromaticamente più competitiva;
- più sensibile al beat;
- più densa nelle connessioni.

Ma:

> pressione alta non significa automaticamente camera veloce.

---

# 25. PRESSURIZZAZIONE

Possibili manifestazioni:

- nodi maggiormente concentrati;
- differenze cromatiche più forti;
- connessioni più leggibili;
- maggiore attrazione verso il target;
- spazio percettivamente più contratto.

---

# 26. DECOMPRESSIONE

Possibili manifestazioni:

- maggiore dispersione;
- riduzione della competizione;
- legami più morbidi;
- maggiore continuità cromatica;
- camera più spaziosa.

Nessuna di queste corrispondenze diventa mapping Audio rigido senza validazione.

---

# 27. MEMORIA

Una volta che un nodo ha aperto una storia, non deve necessariamente tornare identico.

Il nodo può mantenere un residuo.

Per esempio:

- colore della storia;
- luminosità;
- halo;
- dimensione;
- densità delle connessioni;
- piccola cicatrice Visual.

Il principio Brain è:

> **ciò che è accaduto lascia conseguenze.**

---

# 28. NODO NON VISITATO / VISITATO

Non usare:

- spunta;
- label;
- testo;
- icona.

La distinzione deve essere percettiva.

### NON VISITATO
possibilità.

### VISITATO
memoria.

### TARGET
attrazione.

Lo spettatore non deve vedere una UI.

---

# 29. NO HUD

Vietato in produzione:

- titolo della storia accanto al nodo;
- numero del nodo;
- coordinate;
- tooltip;
- pannelli;
- frecce;
- reticoli;
- cursori;
- menu.

La rete non è un browser di file.

---

# 30. NON DEVE SEMBRARE “AI”

Il riferimento punti + linee ha un rischio enorme:

> estetica stock “rete neurale artificiale”.

Da evitare.

Niente:

- cervello wireframe;
- matrix code;
- circuito;
- blu digitale obbligatorio;
- grafici scientifici;
- particelle tutte identiche;
- simboli AI.

Il campo deve essere più vicino a:

> **una topologia mentale / una costellazione di possibilità.**

---

# 31. NUMERO DI NODI

La demo ufficiale prevede un massimo di 1000 particelle e ne utilizza inizialmente 500. [GitHub](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_buffergeometry_drawrange.html)

Questi numeri appartengono alla demo.

Non sono una regola Visual di Brain.

Per il primo PoC propongo:

> **32–64 nodi.**

Il numero deve essere abbastanza alto da costruire uno spazio.

Abbastanza basso da mantenere identità e leggibilità.

---

# 32. NON OVERENGINEERIZZARE IL PoC

Con 32–64 nodi:

non partire automaticamente da:

- octree;
- BVH;
- spatial hash avanzato;
- WebGPU compute;
- GPGPU;
- particle engine proprietario;
- sistema fisico generalizzato.

La demo ufficiale effettua direttamente confronti di distanza fra particelle e prevede già `minDistance`, `limitConnections` e `maxConnections`. [GitHub](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_buffergeometry_drawrange.html)

Prima misurare.

Poi eventualmente ottimizzare.

---

# 33. MATERIALI

Il riferimento ufficiale usa `PointsMaterial` per le particelle e `LineBasicMaterial` per i segmenti, con blending additivo e trasparenza. [GitHub](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_buffergeometry_drawrange.html)

Per il PoC:

> partire dai materiali standard, se sufficienti.

Non scrivere immediatamente uno shader custom per il gusto di scriverlo.

Uno shader custom è autorizzato quando esiste un requisito Visual che i materiali standard non riescono a soddisfare.

---

# 34. POSSIBILE LIMITE DA VERIFICARE

La richiesta del Capo Supremo implica:

> **colore e pulse individuali dei nodi.**

La demo base usa un unico `PointsMaterial` per il point cloud. [GitHub](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_buffergeometry_drawrange.html)

L’Ingegneria deve quindi verificare il modo più semplice e coerente con Three.js per ottenere la differenziazione necessaria per nodo.

Questo è un punto reale di estensione.

Non prescrivo ora shader, sprite o altre architetture.

Prima verificare le possibilità native più semplici.

---

# 35. TARGET SELECTION

La scelta del nodo che aprirà la prossima storia appartiene al ciclo narrativo di Brain.

L’Audio:

> **non sceglie il nodo.**

L’Audio modifica il comportamento Visual della rete durante la navigazione.

---

# 36. AGGANCIO DEL TARGET

Il target non deve diventare improvvisamente una pallina gigante.

La selezione deve svilupparsi.

Possibile sequenza:

`rete distribuita`

→ target acquista stabilità

→ nodi circostanti perdono leggermente competizione

→ alcune connessioni convergono percettivamente

→ camera devia verso il target

→ target aumenta presenza

→ campo periferico scorre

→ target occupa il quadro

→ storia.

---

# 37. ZOOM

Qui lo zoom ha una funzione narrativa precisa.

Non è:

> effetto camera.

È:

> **atto di selezione della storia.**

Più Brain si avvicina al nodo:

più quel nodo smette di essere una possibilità e diventa un mondo.

---

# 38. RELAZIONE CON HYPNOTIC ZOOM

HYPNOTIC ZOOM può offrire principi utili di:

- accumulo;
- irreversibilità;
- variazione di scala;
- continuità.

Ma STORY CONSTELLATION non deve diventare semplicemente:

> HYPNOTIC ZOOM applicato a un punto.

Qui la destinazione esiste.

Il nodo è una storia.

---

# 39. RELAZIONE CON TRAVERSAL

TRAVERSAL:

> attraversa lo spazio interno di un raster.

STORY CONSTELLATION:

> attraversa lo spazio fra le storie.

La parentela è reale.

La funzione è differente.

---

# 40. RELAZIONE CON ANIMATRONIX

ANIMATRONIX:

> la storia finisce ma le immagini continuano a vivere.

STORY CONSTELLATION:

> quelle immagini vengono lasciate e Brain torna nello spazio delle proprie possibilità narrative.

Quindi:

`STORIA`
→
`ANIMATRONIX`
→
`STORY CONSTELLATION`
→
`STORIA`.

---

# 41. SILENZIO

In assenza reale di segnale:

- nessun pulse beat;
- nessuna variazione ritmica inventata;
- connessioni non reagiscono autonomamente;
- drift può progressivamente quietarsi;
- camera può perdere impulso;
- stato raggiunto viene conservato.

Nessun reset.

---

# 42. GPU PRESSURE

In caso di pressione GPU, degradare prima ciò che è accessorio.

Ordine Visual proposto:

1. ridurre numero di connessioni;
2. ridurre nodi periferici;
3. ridurre halo/effetti;
4. mantenere target;
5. mantenere navigazione camera;
6. mantenere pulse essenziale;
7. mantenere apertura della storia.

Il significato narrativo deve sopravvivere.

---

# 43. PRIMO PoC

Il primo PoC deve essere volutamente piccolo.

## Requisiti

- Three.js;
- baseline derivata da `webgl_buffergeometry_drawrange`;
- 32–64 nodi;
- `BufferGeometry`;
- point cloud;
- `LineSegments`;
- connessioni per prossimità;
- drift 3D;
- colori dinamici;
- pulse beat;
- almeno un parametro Audio lento;
- nodo target;
- navigazione camera verso target;
- zoom;
- apertura di un raster;
- ritorno dal raster alla costellazione.

Non aggiungere altre funzioni fino a quando questo ciclo non è visivamente verificato.

---

# 44. TEST A — BASELINE THREE.JS

Prima prova:

> demo adattata a Brain ma quasi priva di grammatica aggiuntiva.

Serve a verificare:

- performance;
- integrazione;
- rendering;
- profondità;
- numero di nodi;
- connessioni.

---

# 45. TEST B — AUDIO

Confrontare:

### B1
nessuna reattività.

### B2
tutti i nodi pulsano insieme.

### B3
pulse differenziato e gerarchico.

B2 è intenzionalmente un controllo negativo.

Se B2 sembra migliore di B3, dobbiamo rivedere la grammatica.

---

# 46. TEST C — COLORE

Verificare che i parametri Audio producano cambiamenti cromatici senza trasformare la rete in:

> music visualizer RGB.

Il colore deve modificare il **metabolismo**, non illustrare direttamente le frequenze.

---

# 47. TEST D — NAVIGAZIONE

Partenza:

rete completa.

Poi:

- target;
- aggancio;
- avanzamento;
- zoom;
- nodo full-frame;
- raster.

Il test passa se si percepisce:

> **Brain sta raggiungendo qualcosa.**

Non:

> “la camera sta zoomando su un pallino”.

---

# 48. TEST E — APERTURA

Confrontare:

### E1
crossfade nodo → raster.

### E2
nodo ingrandito → raster.

### E3
nodo che progressivamente acquisisce la materia del raster finché l’intero campo diventa storia.

La direzione Visual è:

> **E3.**

---

# 49. TEST F — RITORNO

La storia termina.

Brain torna alla costellazione.

Il nodo precedente deve essere ancora identificabile come nodo, ma deve poter conservare una conseguenza.

Test:

> la rete sembra la stessa identica di prima?

Se sì, la memoria non è ancora percepibile.

---

# 50. COSA NON IMPLEMENTARE NEL PRIMO GIRO

Non serve ora:

- interazione mouse del pubblico;
- selezione manuale dei nodi;
- testi;
- nomi delle storie;
- motore fisico;
- semantic graph complesso;
- WebGPU;
- shader system generalizzato;
- centinaia di storie;
- AI depth;
- telecamera libera;
- multiplayer;
- editor di costellazioni.

Il PoC deve rispondere a una sola domanda:

> **funziona come spazio vivo fra le storie di Brain?**

---

# 51. PRINCIPIO INGEGNERISTICO

Per questo componente vale esplicitamente:

> **RIUSARE PRIMA.  
> ESTENDERE DOVE SERVE.  
> RISCRIVERE SOLO DAVANTI A UN LIMITE DIMOSTRATO.**

Non voglio che l’Ingegneria guardi la demo Three.js e poi produca un clone proprietario con altre classi e altri algoritmi senza necessità.

Il riferimento del Capo Supremo esiste precisamente per evitare questo.

---

# 52. DIVISIONE DELLE RESPONSABILITÀ

## THREE.JS / RIFERIMENTO UFFICIALE

Fornisce la base per:

- scena WebGL;
- camera;
- punti;
- segmenti;
- geometrie buffer;
- attributi dinamici;
- draw range;
- materiali;
- aggiornamento della geometria.

## INGEGNERIA BRAIN

Integra:

- ciclo delle storie;
- target;
- camera autonoma;
- stato dei nodi;
- raster;
- handoff;
- performance;
- gating.

## ANALISI AUDIO

Fornisce i segnali già esistenti utilizzabili per:

- beat;
- transienti;
- pressione;
- metabolismo lento.

Non decide le storie.

## VISUAL

Definisce:

- gerarchia del pulse;
- colore;
- continuità;
- memoria;
- comportamento spaziale;
- leggibilità del target;
- qualità della transizione nodo ↔ storia.

---

# 53. CRITERI DI FALLIMENTO

Il componente fallisce se sembra:

> uno screensaver.

Fallisce se sembra:

> una rete neurale stock.

Fallisce se sembra:

> un visualizer musicale.

Fallisce se sembra:

> un menu 3D.

Fallisce se tutti i nodi respirano insieme.

Fallisce se lo zoom è soltanto un ingrandimento.

Fallisce se la storia appare attraverso un buco.

Fallisce se il raster entra con un crossfade mascherato.

Fallisce se ogni ritorno alla rete cancella completamente ciò che è accaduto.

---

# 54. CRITERIO DI RIUSCITA

Deve accadere questo:

> Brain termina una storia.

> Torna in uno spazio più grande.

> Quello spazio vive insieme alla musica.

> I nodi rispondono.

> Le connessioni cambiano.

> Una possibilità comincia ad attirarlo.

> Brain si orienta.

> Si avvicina.

> Il nodo cresce.

> Il nodo smette di essere nodo.

> Diventa un mondo.

> La nuova storia comincia.

E dopo averla vissuta:

> quel punto dell’universo di Brain non è più esattamente quello di prima.

---

# 55. PRINCIPIO FINALE

Il riferimento Three.js fornito dal Capo Supremo risolve già una parte importante del problema tecnico:

> **come mantenere molti punti tridimensionali e le loro connessioni dinamiche in un campo WebGL efficiente.**

Non dobbiamo rifare quella parte per dimostrare di saper programmare.

Dobbiamo occuparci di ciò che il riferimento non sa fare:

> **trasformare un punto in una storia.**

> **trasformare una rete in memoria.**

> **trasformare il beat in comportamento invece che in decorazione.**

> **trasformare il passaggio fra storie in uno spazio realmente appartenente a Brain.**

La costellazione non rappresenta il cervello di Brain.

È il luogo nel quale Brain sceglie dove sognare dopo.

**Firmato: Capo Supremo del Visual Design**

I tre riferimenti ufficiali forniti e verificati restano quindi **parte normativa del brief**: demo, sorgente e documentazione `BufferGeometry`. Non li tratterò più come materiale sacrificabile nelle riscritture. [threejs.org](https://threejs.org/examples/webgl_buffergeometry_drawrange)
