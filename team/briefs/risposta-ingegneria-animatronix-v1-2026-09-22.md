# Risposta Ingegneria — ANIMATRONIX V1, sei grammatiche

> **Destinatari:** Capo Supremo; Capo Supremo del Visual Design; Vicario  
> **Data:** 22 settembre 2026  
> **Stato:** implementate le sei grammatiche dietro flag; collaudo visivo su raster reali fatto, collaudo dal vivo con audio da fare

## CHE COSA ESISTE

Le sei grammatiche del brief V1, in un renderer WebGL2 autonomo. Ogni
grammatica manipola lo spazio dell'immagine, non la camera:

- **TRAVERSAL** — flusso ottico coerente verso il punto di fuga, guidato da un
  proxy di profondità (il piano stradale scorre più del cielo); il punto di
  fuga migra lentamente. Il confine verso il raster successivo è un portale
  che si apre nel varco.
- **DEPTH FRACTURE** — tre piani di profondità che slittano; le fessure
  mostrano una profondità lontana sfocata, o il raster successivo quando è la
  transizione. I piani che escono dal quadro non si ribaltano.
- **PERSPECTIVE MELT** — due mappe prospettiche in disaccordo fra vicino e
  lontano, punto di fuga che si sdoppia, lieve doppia esposizione. Non è
  fisheye né liquify.
- **PARALLAX COLLAPSE** — parallasse fra piani che poi si comprime o si
  allarga, in modo lento e cumulativo.
- **OCCLUSION PASSAGE** — la massa occludente è estratta dal raster stesso (la
  componente scura o chiara più grande che tocca il bordo), scorre e cresce
  attraverso il quadro; dietro di lei compare il raster successivo. Nessuna
  tendina aggiunta.
- **RESIDUAL SPACE** — fino a tre istantanee delle configurazioni precedenti
  restano come sagome semitrasparenti che si espandono e si dissolvono in
  circa quattro secondi e mezzo, anche attraverso il cambio di raster.

## PRINCIPI COMUNI

- **Inerzia:** rampe d'ingresso e uscita, nessuna partenza secca.
- **Irreversibilità:** lo stato accumulato (volo, curvatura, sciogliersi,
  frattura, collasso) non torna indietro; il raster successivo ne eredita una
  parte.
- **Continuità:** direzione, frattura, residuo e punto di fuga passano al
  raster successivo.
- **Audio:** modula solo il metabolismo (velocità di accumulo). Non sceglie la
  grammatica, non muove la camera a tempo. In silenzio lo stato si congela.
- **Storia:** al più tre grammatiche principali, nessun ritorno A→B→A, e la
  stessa grammatica non regge più di due raster di fila.

## LIMITI ONESTI

- Non c'è una depth map reale: il proxy di profondità (posizione verticale,
  densità di dettaglio, massa scura) separa grandi piani, non oggetti. I bordi
  dei piani sono morbidi e a volte seguono macchie invece di contorni.
- Le soglie di idoneità sono euristiche, tarate a occhio su una decina di
  raster, non su un corpus.
- Prestazioni: mediana 0,8 ms e 95° percentile 1,7 ms per fotogramma a
  1280×720 su questa macchina; da riconfermare sul computer di palco.
- Non collaudato dal vivo in Electron con audio reale e Riattivazione.

## DA DECIDERE

1. Se accettare il proxy di profondità come V1 o investire in una stima
   di profondità reale prima del collaudo dal vivo.
2. Le durate sono le stesse della V0 (18–28 s in totale): confermare.
