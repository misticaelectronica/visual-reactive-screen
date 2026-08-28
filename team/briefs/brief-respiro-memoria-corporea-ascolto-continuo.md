# BRAIN — Respiro, memoria corporea e ascolto continuo

Brief del Capo Supremo dell'Analisi Audio, 2026-08-28. Revisione semantica
del respiro: supera la mediana come decisore, ridefinisce il respiro come
**riduzione organizzata della costrizione percettiva rispetto alla
configurazione immediatamente precedente**. Integra
[`brief-relativita-percettiva-mediana-set.md`](brief-relativita-percettiva-mediana-set.md)
(mediana/dispersione restano, ma solo come contesto) e
[`brief-stato-bio-percettivo-definitivo.md`](brief-stato-bio-percettivo-definitivo.md).

## 1. Principio fondamentale

Brain ascolta come una persona del pubblico che balla: non conosce il
brano, non anticipa la struttura, reagisce confrontando il presente con ciò
che stava accadendo immediatamente prima, e continua sempre a muoversi.

## 2-4. Il riferimento è il "prima", non la mediana

Il significato di un evento nasce dal confronto con la configurazione
immediatamente precedente, non con la posizione rispetto alla mediana del
set. Controesempio decisivo: un set molto pressato ha mediana alta; una
riduzione modesta può scendere sotto quella mediana senza che la sensazione
di pressione cambi davvero — Brain non deve dichiarare respiro in quel caso.
Mediana e dispersione restano validi come descrizione del contesto generale
della serata, ma perdono il diritto di decidere il respiro.

## 5-9. Reazione rapida, nessuna autorizzazione temporale alla prima reazione

Brain non conosce la durata futura di una fase. Deve reagire in ordine di
pochi secondi, non attendere la durata della fase per avere il diritto di
reagire. Le vecchie soglie (0-2s evento locale, 3-5s movimento leggibile,
8-12s regime eleggibile) restano ordini di grandezza diagnostici, non gate
che autorizzano retroattivamente la prima reazione. Un regime discreto può
continuare a esistere come rappresentazione lenta derivata — non deve
costituire il permesso per iniziare a seguire la trasformazione.

## 10-13. I cinque segnali, `residual` come memoria corporea, passaggio vs permanenza

Nessuno dei cinque segnali, isolato, determina il respiro. `residual`
assume ruolo centrale come memoria della configurazione precedente:
**reazione rapida, memoria lenta** — un'asimmetria, non un gate su
persistence. La distinzione fra un passaggio momentaneo e un respiro reale
non sta nella durata ma nell'organizzazione successiva (`persistence↑`,
`change↓`, `residual` che mantiene la relazione col prima) — e questa
organizzazione descrive **dopo** la reazione, non la autorizza.

## 14-17. Adattamento al contesto, causalità corta, respiro come traiettoria

Il comportamento deve emergere dai segnali, non da un'etichetta di genere.
La memoria Audio sostiene una causalità corta: il significato nasce da ciò
che accadeva immediatamente prima, non da un riconoscimento di pattern
formali. Il respiro è una traiettoria continua (grado e forma
dell'apertura), non un booleano — il regime discreto è derivato.

## 18-19. Uscita dal RESPIRO STABILE

Due sole vie: risalita consistente (non un semplice ritorno sopra la
mediana — una ricostruzione netta e persistente, ordine di grandezza
diagnostico: pochi secondi) o ripartenza ritmica pompante inequivocabile
(§18.2, **ritirato** dal brief correttivo del 2026-08-28 — vedi sotto,
"§18.2 RITIRATO"). Isteresi naturale:
entrare è percepire una sottrazione; uscire richiede evidenza di
ricostruzione o ripartenza.

## 20-21. Consegna a Ingegneria e Visual

L'Analisi Audio fornisce semantica continua, non prescrive la
manifestazione. Ventuno principi normativi finali — vedi il testo integrale
del brief nella cronologia di sessione (`working/sessions/session-history.md`,
`SESSION-2026-08-28-14`) per la lista completa.

---

## Traduzione ingegneristica (Capo Supremo degli Ingegneri, 2026-08-28)

Le soluzioni algoritmiche appartengono a questo dominio per esplicita
dichiarazione del brief. Tre cambi in `brainBioPerception.ts`:

### A. `pressureTrend` — dalla mediana al riferimento

`classifyPressureTrend(perceptualPressure, referencePressure)` sostituisce
il confronto con `median`. `reference.pressure` (nuovo campo di
`BrainBioReferenceState`) è la pressione catturata nell'istante in cui
`reference.vector` fu promosso — "la configurazione immediatamente
precedente" del brief, già rappresentata dalla macchina a stati esistente
(§1.3, PIANO-040), non una struttura nuova. Nessuna finestra di conferma su
questo confronto: è ricalcolato a ogni campione, reazione immediata per
costruzione. Mediana/dispersione restano calcolate (`advanceBioTrend`) ma
solo come contesto per l'overlay — mai più lette da una decisione.
La macchina del regime (`advanceBioRegime`) non è stata toccata: la sua
isteresi (3s per la promozione a `stable-breath`, 3s per l'uscita) resta
valida perché non gate-va la prima reazione (`decompression` è già
immediata), solo la sua rappresentazione discreta lenta — esattamente ciò
che il brief autorizza al §9.

### B. `residual` — riscritto come memoria a decadimento asimmetrico

Il vecchio meccanismo (carica gated da persistence sostenuta, plateau,
rilascio a soglia) rispondeva alla domanda sbagliata. Sostituito con un
inviluppo a due costanti di tempo: tau di salita 1.5s (insegue in fretta
una pressione che risale), tau di discesa 25s (dimentica lentamente un
calo) — "reazione rapida, memoria lenta" tradotto alla lettera, senza più
dipendenza da `persistence`.

### C. Dream-Segmentation consuma `residual` in continuo

Risposta al punto 1 della nota di trasmissione: `calculateDreamRegimeProfile`
accetta ora un secondo parametro `residual` (default 1, retrocompatibile)
che interpola linearmente fra il profilo di default e quello del regime
target — il regime discreto decide *quale* profilo raggiungere, `residual`
decide *quanto* di quel profilo è già in vigore in questo istante. Prima
estensione reale oltre il solo regime discreto letto da un consumer.

### §18.2 RITIRATO (brief correttivo del braccio destro, 2026-08-28)

Non deferito: **ritirato**. Con `pressureTrend` ora relativo a
`reference.pressure`, un kick che rientra secco dopo un breakdown produce
il salto più grande della traccia rispetto alla configurazione precedente —
la via §18.1 (risalita consistente) lo intercetta già, in fretta. Il caso
opposto (rientro filtrato/graduale su 8-16 battute) non deve chiudere il
respiro anticipatamente: il corpo ci mette anch'esso qualche secondo a
rimettersi in passo, e Brain che resta in respiro durante un rientro
graduale non sbaglia. Nessuna nuova capacità di correlazione ritmica: il
segnale esistente (§18.1) risponde già alla domanda. Vedi la nuova regola
permanente di divieto di sovrastrutturazione in
[`agents.md`](../../agents.md#regole-da-non-rompere).

### Resta aperta

- **Misura di latenza end-to-end reale** (aperta da tre giri): quanti
  secondi passano prima che `perceptualPressure` scenda quando il DJ cala
  il fader. In attesa di una cattura dal vivo col logger a 1Hz.

### Validazione

`pnpm typecheck`/`pnpm lint` puliti, suite completa **62 file / 563 test
verdi**. Dettaglio task-per-task in
`working/plans/piano-040-stato-bio-percettivo-prova-dream-segmentation.md`.
