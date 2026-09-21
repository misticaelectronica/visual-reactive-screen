# Brief — ANIMATRONIX, nuova fase/ciclo di Brain

> **Destinatari:** Capo Supremo dei Designer/Visual VJ; Capo Supremo degli Ingegneri; Capo Supremo dell'Analisi Audio; Vicario  
> **Mittente:** Capo Supremo  
> **Data:** 21 settembre 2026  
> **Stato:** decisione presa; da progettare e implementare

## DECISIONE

Brain ha una nuova fase, **ANIMATRONIX**. Si attiva alla **fine di ogni
storia** e **anima** la storia appena conclusa, cioè i raster dei suoi
fotogrammi prodotti da Psichedel.

Sostituisce l'ipotesi di "video oltre l'immagine" del brief del 21 settembre
(`brief-video-oltre-immagine-2026-09-21.md`): niente video generativo, il
movimento nasce dall'animazione dei raster già esistenti.

## DEROGA ESPLICITA AL PROTOCOLLO FILOSOFIA VISIVA

In ANIMATRONIX sono **consentiti** parallasse, Ken Burns, zoom, derive,
scale e ogni movimento applicato all'intero quadro. Il controllo Camera del
protocollo (agents.md) **non si applica a questa fase**.

La deroga è limitata ad ANIMATRONIX. Tutto il resto di Brain (renderer
Material-Morph, base layer, Psichedel in produzione) resta soggetto ai
cinque controlli invariati. Il Vicario aggiorna agents.md perché il
protocollo dichiari la deroga in modo preciso e circoscritto, senza
lasciarla implicita.

Restano validi per ANIMATRONIX gli altri principi: Silenzio (in assenza di
segnale il movimento deve poter quietarsi), Beatmatch (ritmo riallineato al
beat reale, non oscillazioni autonome finte) e Transizione (ingresso e uscita
dalla fase senza stacchi). Sono da confermare dal Designer/Visual VJ come
vincoli o come liberi.

## COSA SERVE

**Designer/Visual VJ:** linguaggio di movimento di ANIMATRONIX per fase
onirica: quali gesti di camera (spinta, deriva, parallasse a strati),
durata, curva, come cambia fra i quattro fotogrammi, come si lega all'audio.

**Ingegneri:** dove vive la fase nel ciclo Brain (dopo la chiusura della
storia, prima della successiva), come consuma i raster già in memoria senza
nuova inferenza GPU, budget e gating, ingresso/uscita senza stacchi.
Parallasse a strati richiede una separazione di profondità: valutare se
serve una stima di depth economica o se bastano stratificazioni più
semplici.

**Analisi Audio:** quali segnali pilotano la fase e cosa fa in silenzio.

**Vicario:** continuità con i brief esistenti, verifica di sovrapposizione
con meccanismi già presenti (transizioni, passthrough, riuso fotogrammi),
aggiornamento di agents.md per la deroga, registrazione della nuova fase in
working/STATE.md e skills.md.

## CONFINI

Autonomia dei renderer: analisi, grammatica e taratura restano dentro il
modulo di ANIMATRONIX, nessun refactor verso moduli condivisi. Nessuna
nuova generazione di immagini per questa fase.
