# Risposta Ingegneria — ANIMATRONIX Wave 2, cinque grammatiche ad alta salienza

> **Destinatari:** Capo Supremo; Capo Supremo del Visual Design; Vicario  
> **Data:** 22 settembre 2026  
> **Stato:** implementate dietro flag; collaudo visivo su raster reali fatto, collaudo dal vivo con audio da fare

## CHE COSA ESISTE

Le cinque grammatiche del brief Wave 2, aggiunte alle sei di V1 (undici
totali):

- **KINETIC MATCH** — un punto locale saliente di A (volto, ruota, apertura:
  rilevato come picco di densità di bordo, `anchor`) resta identico mentre
  tutto il resto si torce in modo palesemente impossibile; superata metà
  corsa, l'area bloccata rivela lo stesso punto di schermo appartenente a B.
- **VERTIGO LOCK** — attorno all'ancora il campionamento resta invariato; la
  profondità del resto della scena si deforma come un dolly zoom, con una
  breve instabilità a metà corsa prima di un nuovo equilibrio.
- **RECURSIVE PORTAL** — entra in un varco interno di A (finestra, foro,
  ombra: rilevato come regione compatta non a contatto col bordo, `portal`),
  ne occupa progressivamente il quadro, poi rivela B.
- **TIME CRUSH** — durante un tratto TRAVERSAL-simile, un impulso breve (non
  un accumulo) rallenta drasticamente primo piano o sfondo mentre l'altro
  continua, poi si riallineano.
- **FOCUS INVERSION** — il piano di attenzione scivola dal primo piano
  (nitido, saturo) allo sfondo, che acquista nitidezza e saturazione; il
  vecchio primo piano resta come presenza sfocata prima che B emerga.

## VINCOLI DEL BRIEF

- Al più **due** grammatiche ad alta salienza per storia.
- Nessuna di quelle usate nella storia appena conclusa può ripresentarsi
  nella successiva (propagato dal controller storia dopo storia).
- Restano applicabili le sei V1 come "riempimento" continuo.

## LIMITI ONESTI — PIÙ IMPORTANTI DI QUELLI GIÀ NOTI IN V1

- **KINETIC MATCH non fa un vero riconoscimento di forma fra A e B.** Il
  brief chiede "una struttura visivamente compatibile" nel raster
  successivo; qui uso lo stesso rilevatore di ancora su entrambi i raster
  indipendentemente, senza verificare che le due ancore si somiglino. Nella
  maggior parte dei casi il risultato legge comunque come "qualcosa resta
  fermo mentre il resto diventa impossibile", ma non è garantito un
  abbinamento di forma.
- **TIME CRUSH è la più approssimata delle cinque.** Un raster è
  un'immagine statica: non ha un proprio tempo da desincronizzare. Quello
  che ho costruito modula la *velocità del warp spaziale* diversamente per
  primo piano e sfondo — un proxy onesto del principio, non una vera
  dissociazione temporale come nel bullet time citato dal brief.
- **VERTIGO LOCK inizialmente liquificava l'intera immagine** (la profondità
  grezza, per-pixel e rumorosa, produceva una deformazione caotica invece di
  un dolly zoom leggibile). Corretto quantizzando la deformazione sugli
  stessi due piani di profondità già usati da PARALLAX COLLAPSE. Resta
  un'approssimazione: senza depth map reale, il piano bloccato può non
  coincidere esattamente col soggetto percepito.
- **`anchor` e `portal`** sono euristiche nuove, tarate a occhio su una
  decina di raster come le altre, non su un corpus.

## VERIFICA

Suite (750 test), typecheck e lint verdi. Collaudo visivo con lo stesso
banco di prova Electron del V1 (fuori repo), su raster reali, per ciascuna
delle cinque grammatiche isolata. Nessun collaudo dal vivo in Electron con
audio reale, Riattivazione, o le sei grammatiche V1 mescolate a queste
cinque nella stessa sessione.

## DA DECIDERE

1. Se il proxy di KINETIC MATCH (nessun abbinamento di forma reale) è
   accettabile per un primo collaudo dal vivo o se serve un rilevatore più
   mirato prima.
2. Se TIME CRUSH, così com'è, comunica "il tempo si è fermato" o se il
   Visual Design vuole un'esplorazione diversa prima di portarlo in scena.
