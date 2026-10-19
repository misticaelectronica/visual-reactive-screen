# Brief — ANIMATRONIX: via i "buco della serratura", HYPNOTIC ZOOM, fase più lunga

> **Destinatari:** Capo Supremo dei Designer/Visual VJ di Brain; Vicario; Capo Supremo degli Ingegneri
> **Mittente:** Capo Supremo
> **Data:** 22 settembre 2026
> **Stato:** decisione presa; prima implementazione fatta (dietro flag), collaudo visivo da fare

## DECISIONE

Tre cambi ad ANIMATRONIX (la fase che anima i raster della storia appena
conclusa, vedi `brief-animatronix-2026-09-21.md`):

1. **Via ogni effetto "buco della serratura".** Qualunque transizione che
   rivela il raster successivo aprendo un foro/iride nell'immagine è
   vietata in ANIMATRONIX, non solo la grammatica che lo faceva più
   esplicitamente.
2. **Nuovo linguaggio: motion graphics ipnotico.** Zoom continui e
   transizioni fluide dentro fotografie e grafiche vettoriali — non un
   attraversamento a scatti, un avvicinamento ininterrotto.
3. **Fase più lunga.** Più tempo per percepire lo zoom, non solo
   attraversarlo.

## COSA C'ERA E PERCHÉ VA VIA

**RECURSIVE PORTAL** (Wave 2) entrava in un varco interno del raster —
finestra, foro, specchio, ombra — con uno zoom sul proprio dettaglio, poi
rivelava il raster successivo nello stesso punto. Era l'esempio più
letterale del "buco della serratura".

Meno ovvio ma della stessa famiglia: **TRAVERSAL** e **PERSPECTIVE MELT**
(le due grammatiche V1 più vicine al varco/punto di fuga) usavano la stessa
iride — un cerchio che si allarga dal punto di fuga — come propria
transizione d'uscita verso il raster successivo. Anche questa è stata
tolta: ora dissolvono a piena inquadratura.

Le altre otto grammatiche (DEPTH FRACTURE, PARALLAX COLLAPSE, OCCLUSION
PASSAGE, RESIDUAL SPACE, KINETIC MATCH, VERTIGO LOCK, TIME CRUSH, FOCUS
INVERSION) non aprivano varchi e restano come sono.

## COSA C'È ORA: HYPNOTIC ZOOM

Al posto di RECURSIVE PORTAL, una nuova grammatica: uno zoom continuo e
ininterrotto verso il punto di fuga del raster, senza mai accelerare a
scatti né fermarsi — l'accumulo è lento apposta, pensato per restare
percepibile per l'intera fase (26–40s), non per saturare a metà. Il
passaggio al raster successivo è la stessa dissolvenza fluida a piena
inquadratura di TRAVERSAL e PERSPECTIVE MELT ora, mai un'apertura
localizzata.

A differenza di quasi tutte le altre grammatiche, non richiede una
struttura particolare nel raster (nessun varco da trovare, nessuna massa,
nessuna coerenza di linee): funziona ugualmente su una fotografia o su una
grafica vettoriale piatta. È quindi sempre disponibile nella rotazione, non
solo quando il raster la rende leggibile — coerente con l'idea di un
linguaggio di movimento continuo più che di un evento che scatta solo a
condizioni ricorrenti.

Resta dentro la deroga Camera già approvata per ANIMATRONIX (zoom
sull'intero quadro consentito solo qui, `agents.md`), e dentro gli altri tre
vincoli tuttora attivi per la fase: **Silenzio** (l'accumulo rallenta e si
congela in assenza di segnale, non si azzera ma non finge nemmeno di
muoversi da solo), **Beatmatch** (l'audio modula solo il metabolismo
dell'accumulo, mai la scelta della grammatica) e **Transizione** (la
dissolvenza è sempre una trasformazione continua, mai un taglio).

## FASE PIÙ LUNGA

Durata totale della fase: 26–40s (era 18–28s). Più margine per percepire lo
zoom come tale invece di un pass rapido — motion graphics ipnotico ha
bisogno di tempo per leggersi, non di velocità.

## COSA SERVE DAL CAPO SUPREMO DEI DESIGNER/VISUAL VJ

- Validare dal vivo, appena pronto il collaudo, se lo zoom ipnotico legge
  davvero come linguaggio unico e riconoscibile (non un TRAVERSAL senza
  deformazioni) e se la curva di accumulo (lenta, lineare nel tempo) è
  quella giusta o va ridisegnata con una curva propria.
- Giudicare se la dissolvenza a piena inquadratura che sostituisce l'iride
  di TRAVERSAL e PERSPECTIVE MELT mantiene la stessa forza di transizione,
  o se serve un linguaggio di uscita più caratterizzato (comunque mai a
  foro/iride).
- Confermare se 26–40s è la durata giusta o va ritarata dopo il collaudo.

## COSA SERVE DAL VICARIO

- Verificare continuità con questo brief e con `brief-animatronix-2026-09-21.md`
  (nessun'altra deroga o vincolo da riconciliare).
- `agents.md` non richiede modifiche: la deroga Camera esistente già
  copriva esplicitamente lo zoom continuo come movimento ammesso.
- Registrazione già fatta in `working/STATE.md`; verificare se `skills.md`
  merita una voce tecnica su HYPNOTIC ZOOM (canale di stato `zoom`,
  irreversibile, VIABILITY 0) quando la implementazione avrà avuto un primo
  collaudo dal vivo.

## LIMITI ONESTI — DA SAPERE PRIMA DEL COLLAUDO

- HYPNOTIC ZOOM non è ancora stato visto dal vivo in Electron: solo suite
  automatica (typecheck, lint, 648 test) verde. Nessun collaudo visivo su
  raster reali.
- La dissolvenza `dissolve` che sostituisce l'iride di TRAVERSAL e
  PERSPECTIVE MELT è la stessa matematica già in uso per altre transizioni
  del sistema (crossfade a piena inquadratura); nel collaudo visivo verificare
  che l'ingresso/uscita restino leggibili quanto l'iride che sostituiscono,
  non solo "meno un buco".
- Nessun corpus di raster per tarare quanto lo zoom debba avvicinarsi entro
  fine fase: la velocità di accumulo (`RATE.zoom`) è una prima stima a
  occhio, come le altre costanti del sistema.
