# Risposta Ingegneria — ANIMATRONIX, prima consegna

> **Destinatari:** Capo Supremo; Capo Supremo del Visual Design; Capo Supremo dell'Analisi Audio; Vicario  
> **Data:** 21 settembre 2026  
> **Stato:** modulo autonomo consegnato e testato; integrazione nel ciclo NON eseguita, in attesa di decisione sulle sovrapposizioni

## CONSEGNATO

`brainAnimatronix.ts` (con test), modulo autonomo e puro, nessuna dipendenza
da altri renderer, nessuna generazione di immagini:

- **Analisi struttura raster** su griglia in scala di grigi: piattezza,
  confidenza di profondità, asse percorribile, dominanza e posizione del
  soggetto. Se l'analisi non è affidabile degrada a "piatto".
- **Cinque grammatiche** (TRAVERSAL, PARALLAX, PROXIMITY, DRIFT,
  RECESSION) scelte dalla struttura del singolo raster. PARALLAX è
  vietato sotto una soglia di profondità credibile.
- **Frase di movimento per storia:** un invariante cinetico presente in
  almeno due raster e una mutazione garantita al terzo. Pose continue fra
  segmenti, seed dalla storia.
- **Durata** 18–28 s per l'intera fase, ripartita per fertilità spaziale;
  metabolismo per stato (pressione e velocità non coincidono).
- **Camera:** posa (scala, pan, fuoco) sempre entro i bordi, mai margini
  scoperti. Inerzia con rampe, nessun easing avanti/indietro.
- **Silenzio:** la velocità decade e lo stato raggiunto resta congelato;
  alla ripresa si riparte da lì.
- **Beat:** la camera non lo segue mai. Solo micro-modulazione locale di
  profondità e luce, nulla in silenzio.

## SOVRAPPOSIZIONI CON LA RIATTIVAZIONE (da decidere prima di toccare il controller)

1. **Stesso confine.** Riattivazione e ANIMATRONIX vivono alla chiusura
   della storia (`brainController.ts` ~2267). Serve un ordine esplicito.
   Proposta: ANIMATRONIX prima, poi Riattivazione, poi storia successiva,
   con una sola coda post-storia.
2. **Raster perduti.** `startProduction` (Riattivazione) potatura
   `rasterPreviewBlobs` e il terna della Riattivazione tiene solo 3 immagini
   su 4. ANIMATRONIX ne serve 4: ne trattiene i riferimenti Blob
   autonomamente e non usa il terna.
3. **Silenzio.** Il timer di fine Riattivazione è a orologio reale e non
   viene spostato dal silenzio, quindi può scadere in silenzio. ANIMATRONIX
   usa l'orologio proprio del modulo e non ha questo difetto. È un
   difetto preesistente della Riattivazione, segnalato e non toccato.
4. **Blocco storia-ciclo.** `storyCycleCompletionReported` blocca la
   timeline durante l'interludio. Va coordinato.
5. **Doppio confine.** Il ramo "recycling" richiama
   `requestRevisionCycleAtBoundary` come il ramo principale: l'aggancio
   va messo in entrambi.

## PROBLEMA CRITICO DI INGRESSO (aperto)

Il pubblico vede il raster attraverso lo stato del renderer finale.
Un ingresso che passa dal raster sorgente produce un reset percettivo.
Il modulo accetta una `entryPose` e restituisce una `exitPose` per la
continuità di camera; l'ereditarietà visiva del renderer finale (cross-fade
dal suo ultimo stato al raster animato) richiede l'integrazione e un
collaudo dal vivo. Non risolto in questa consegna.

## NON FATTO / DA COLLAUDARE

- Aggancio nel controller e nella coda post-storia: non eseguito.
- Disegno a canvas (trasformazione dei raster, livelli parallasse): non
  eseguito. Per il parallasse serve una stima di profondità economica;
  senza, la degradazione è verso DRIFT/PROXIMITY.
- Le soglie dell'analisi sono euristiche non tarate su raster reali.
  Serve il PoC con i tre raster scelti dal Visual (spazio percorribile,
  piani, quasi piatto) e la verifica del silenzio, dal vivo.
- DELIQUESCENCE 95%: la regola è un sorteggio per selezione, senza
  denominatore. ANIMATRONIX che non passa dal selettore non la altera.
  Conferma normativa (lettura A) ancora richiesta al Capo Supremo/Vicario.

## DECISIONE CHIESTA

Conferma dell'ordine `ANIMATRONIX → Riattivazione → storia successiva` con
coda unica, così da procedere all'integrazione nel controller.
