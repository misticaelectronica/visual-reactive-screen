# Brief — Video oltre l'immagine (Psichedel)

> **Destinatari:** Capo Supremo dei Designer/Visual VJ; Vicario  
> **Mittente:** Capo Supremo (idea), redatto da Claude  
> **Data:** 21 settembre 2026  
> **Stato:** superato da `brief-animatronix-2026-09-21.md` — la deroga alla camera stabile vale per la fase ANIMATRONIX

## DOMANDA

Il Capo Supremo chiede se Psichedel possa produrre anche movimento oltre
all'immagine fissa. Si chiede parere di fattibilità e di coerenza con la
filosofia visiva prima di scrivere codice.

## STATO ATTUALE

Psichedel genera un raster per fotogramma della storia (quattro fasi
oniriche) con SD1.5 ONNX su WebGPU, in un worker dedicato. Ogni immagine
costa già secondi di GPU; la pipeline live ha deadline e riuso dei
fotogrammi già pronti. I raster sono poi resi in Canvas 2D a strisce.

## VINCOLO FILOSOFICO (importante)

Il Protocollo di Verifica Filosofia Visiva (agents.md) vieta scala,
rotazione, zoom, derive o pulsazioni applicate all'intero quadro: camera
stabile, zero mal di mare. Quindi le soluzioni tipo Ken Burns o parallasse
globale sono **escluse**. Ogni movimento deve vivere dentro la materia, per
segmenti con fasi diverse, riallineato a beat e transienti per banda; in
silenzio il movimento è quasi nullo.

## DUE STRADE

1. **Movimento interno al raster (consigliata per iniziare).** Displacement
   e deformazione per segmenti/strisce del raster già generato, più morph
   fra fotogrammi consecutivi della storia. Costo GPU vicino a zero, in Canvas
   2D, pilotato dalle quattro bande. Si integra con Transizione e Beatmatch.
2. **Video generativo vero** (modelli tipo AnimateDiff/SVD). In locale su
   WebGPU nello stesso worker è troppo pesante e mette in stallo la pipeline
   live. Percorribile solo come modalità opzionale con clip pre-generati
   offline o remoti, fuori dal percorso live.

Possibile variante intermedia da valutare: interpolazione di latenti o
seed vicini fra i quattro fotogrammi per ottenere morph generativi, da
verificare se costa meno di un'immagine intera nel worker.

## RICHIESTE

**Designer/Visual VJ:** quale linguaggio di movimento interno alla materia
è coerente con l'identità visiva? Quali fasi oniriche ne beneficiano? Passa
i cinque controlli (Camera, Materia, Silenzio, Beatmatch, Transizione)?

**Vicario:** continuità con i brief esistenti (in particolare gate qualità
immagine e visual definitivo Psicofantasma) e verifica di sovrapposizione
con meccanismi già presenti prima di approvare qualsiasi lavoro.

## CONFINI

Autonomia dei renderer: analisi, grammatica e taratura restano dentro il
modulo, nessun refactor verso moduli condivisi. Nessun cambio al gate di
qualità immagine senza decisione esplicita.
