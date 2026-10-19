# Brief — ANIMATRONIX / HYPNOTIC ZOOM ANNIDATO

> **Destinatario:** Capo Supremo degli Ingegneri
> **Mittente:** Capo Supremo
> **Data:** 22 settembre 2026
> **Stato:** decisione presa; da progettare e implementare

## DECISIONE

Ogni **8 storie**, Brain produce una storia speciale destinata ad ANIMATRONIX.
Questa storia usa un profilo Psichedel a **22 step di denoising**.

La storia deve contenere una struttura visiva annidata:

IMMAGINE A
→ contiene un dettaglio significativo A1
→ ANIMATRONIX entra progressivamente in A1
→ A1 diventa IMMAGINE B
→ IMMAGINE B contiene un secondo dettaglio significativo B1
→ ANIMATRONIX entra progressivamente in B1
→ B1 diventa IMMAGINE C

La quarta immagine della storia resta disponibile come ECO/uscita e deve
essere raccordata alla grammatica già esistente della storia.

## PRINCIPIO PERCETTIVO

Il riferimento concettuale è Thomas Hylland Eriksen.

Il principio da tradurre visivamente è il passaggio di scala:
dettaglio locale → sistema più grande → nuovo dettaglio → nuovo sistema.

Il dettaglio apparentemente secondario deve poter rivelare, entrando al suo
interno, un altro livello della stessa realtà.

La relazione fra le immagini deve quindi produrre:
micro → macro, locale → rete, particolare → struttura, struttura → nuovo
particolare.

Non si chiede di rappresentare letteralmente concetti antropologici. Si usa
questa relazione fra scale come grammatica dell'animazione.

## RELAZIONE CON HYPNOTIC ZOOM

Questa modalità appartiene ad ANIMATRONIX e usa il linguaggio HYPNOTIC ZOOM
già introdotto.

Lo zoom deve essere continuo e accumulativo. Il passaggio A → B e B → C non
deve apparire come: zoom → stop → cambio immagine. Deve apparire come: zoom
nel dettaglio → perdita progressiva della distinzione fra dettaglio e
quadro → emersione della nuova immagine dallo stesso dettaglio.

La nuova fotografia deve essere percepita come contenuta nella precedente.

## COSTRUZIONE DELLA STORIA SPECIALE

La storia speciale continua a utilizzare la pipeline:
STORIA → VISUAL PLAN → INVARIANTE → RASTER PSICHEDEL → ANIMATRONIX.

Il Visual Plan deve sapere che la storia appartiene al ciclo speciale e deve
produrre due relazioni esplicite: A1 collega IMMAGINE A a IMMAGINE B, B1
collega IMMAGINE B a IMMAGINE C.

A1 e B1 devono essere elementi visivamente localizzabili, abbastanza
leggibili da poter diventare target dello zoom.

Non introdurre un secondo sistema narrativo o un secondo generatore.

## GENERAZIONE

Per la storia speciale: `denoisingSteps = 22` per i raster prodotti da
Psichedel.

La periodicità è: 1 storia speciale ogni 8 storie. Non casualizzare questa
frequenza nella prima implementazione. Le altre 7 storie mantengono il
comportamento ordinario.

## TRANSIZIONE FRA LE IMMAGINI

ANIMATRONIX deve conoscere, per ciascun passaggio: raster sorgente, raster
destinazione, regione target del dettaglio, trasformazione necessaria per
portare quella regione verso il pieno quadro.

Il raster successivo entra progressivamente durante l'avvicinamento al
dettaglio. L'obiettivo percettivo è evitare il momento nel quale il
pubblico possa distinguere chiaramente "sto guardando una fotografia che
viene ingrandita" da "sto entrando in un altro livello dell'immagine".

La tecnica concreta di compositing, mascheratura e raccordo resta
competenza dell'Ingegneria.

## DUE ATTRAVERSAMENTI

La struttura minima è:
A → zoom su A1 → B → zoom su B1 → C → ECO / uscita.

I due attraversamenti devono poter avere profondità e durata differenti.
Devono comunque appartenere allo stesso gesto percettivo.

## AUDIO

Restano validi i vincoli ANIMATRONIX già stabiliti: Silenzio, Beatmatch,
Transizione. Lo zoom possiede una progressione propria, mentre il rapporto
con beat e segnali Audio deve rispettare il contratto ANIMATRONIX esistente.
Non introdurre una nuova analisi Audio per questa modalità.

## CAMERA

La modalità utilizza la deroga Camera già prevista per ANIMATRONIX. Nessuna
modifica ulteriore ad `agents.md`. La deroga resta confinata ad ANIMATRONIX.

## GPU E GENERAZIONE

La maggiore qualità della storia speciale deriva dai 22 step Psichedel.
Durante ANIMATRONIX non deve essere eseguita nuova inferenza Stable
Diffusion. A, B e C devono essere già disponibili prima dell'avvio della
fase. Il movimento e il passaggio fra raster devono essere realizzati
utilizzando esclusivamente le immagini già generate.

## FAILURE

Se uno dei raster o uno dei due target necessari non è disponibile, non
costruire una sequenza incompleta fingendo la continuità. Usare il
comportamento ANIMATRONIX ordinario e registrare nel log il motivo del
fallback.

## LOG

Per ogni ciclo speciale registrare almeno: `nestedZoomStory: true`,
`storyOrdinal`, `denoisingSteps: 22`, `targetA`, `targetB`,
`transitionAtoB`, `transitionBtoC`, `fallbackReason` (se presente).

## CONFINI

Nessun nuovo modello generativo. Nessuna depth inference obbligatoria.
Nessun ControlNet. Nessun img2img. Nessuna modifica alla Riattivazione.
Nessuna modifica ai renderer ordinari. Nessuna nuova semantica Audio.
Nessun refactor generale della pipeline Psichedel.

La prima implementazione deve verificare il principio con il minimo
intervento compatibile con l'architettura attuale.

## CRITERIO DI RIUSCITA

Il test è riuscito quando, guardando la sequenza senza conoscere il
meccanismo, il passaggio A → A1 → B → B1 → C viene percepito come un unico
approfondimento progressivo della stessa realtà visiva e non come tre
fotografie collegate da due zoom.

Il collaudo percettivo finale resta alla Direzione Designer/Visual VJ.
