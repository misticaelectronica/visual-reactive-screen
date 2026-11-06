# Linee guida per scrivere le storie di Brain

## Chi fa cosa

Una storia passa per tre mani diverse. Gli scribacchini scrivono solo la
prima.

| Chi | Cosa fa | Cosa vede |
|---|---|---|
| **Scribacchini** | Scrivono le righe della storia: una riga = un episodio. La riga è la **Soglia**, la prima immagine. | Tutta la storia, l'arco, l'opera di partenza. |
| **Qwen 0.5B** (modello di testo piccolo, dentro Brain) | Da ogni riga scrive, una alla volta, le altre tre immagini dell'episodio: **Metamorfosi**, **Condensazione**, **Eco**. | **Solo la riga dell'episodio** e le fasi che ha già scritto per quella riga. Niente altro. |
| **Stable Diffusion** (generatore di immagini) | Disegna ogni immagine dal suo testo. | Solo il testo di quell'immagine, senza nomi di persona, al massimo 77 token. Nessuna memoria fra un'immagine e l'altra. |

Le tre fasi le scrive Qwen:

- **Metamorfosi**: la materia della scena comincia a trasformarsi e a perdere
  stabilità;
- **Condensazione**: gli elementi si concentrano, si sovrappongono e
  diventano più densi;
- **Eco**: ciò che resta: ritorno, residuo o deformazione della prima scena.

**Lo scribacchino non scrive le fasi e non le anticipa.** Il suo lavoro è
consegnare a Qwen una Soglia da cui le tre fasi possano nascere bene. Per
questo le regole qui sotto sono di due tipi: regole della **storia** (per chi
la guarda, Qwen non le vede) e regole della **riga** (per Qwen e per Stable
Diffusion).

Finite le righe, Brain ricomincia dalla prima e Qwen scrive tre fasi nuove
per ogni riga: il secondo giro non è una replica del primo.

## Cosa succede alla riga (fatti verificati nel codice)

1. La riga va a Stable Diffusion **così com'è**: è la Soglia. Il nome del
   protagonista viene tolto prima.
2. Qwen riceve **solo quella riga** e scrive la Metamorfosi. Poi riceve
   riga + Metamorfosi e scrive la Condensazione. Poi riga + Metamorfosi +
   Condensazione e scrive l'Eco.
3. A Qwen viene chiesto di: tenere la persona con la descrizione fisica
   della riga; trasformare le cose distintive della scena, non sostituirle;
   non scrivere mai nomi di persona ma la loro descrizione; descrivere solo
   ciò che si vede.
4. **Se Qwen sbaglia una fase, al suo posto entra di nuovo la tua riga.** Nei
   log di ottobre è successo a una fase su cinque. La tua riga può quindi
   comparire fino a quattro volte nello stesso episodio: deve reggere da
   sola come immagine.

Cosa ne segue, misurato sulle prove con On The Road (novembre 2026): Qwen
conserva bene il protagonista, la sua descrizione e l'elemento che ritorna;
perde facilmente ciò che rende la riga diversa dalle altre (il luogo
preciso, l'architettura, l'oggetto unico) e lo sostituisce con cose generiche
(*Paris*, *a beach*, *a market*). Le regole della riga servono a dare a Qwen
meno occasioni di perderlo.

## Il formato

- **12 righe per un'ora.** È una stima da verificare alla prima serata: potrebbe
  servirne qualcuna in più.
- **Ogni riga: 15–30 parole**, mai più di 35. Stable Diffusion legge al
  massimo 77 token, e una riga di 35 parole con la descrizione della persona
  ci sta appena.
- **Scrivi in inglese.**
- **Consegna in testo semplice, pronto da copiare** nel file della storia: un
  file `.txt` o testo puro, senza grassetti, corsivi, elenchi puntati, numeri di
  riga o virgolette intorno alle righe. Ogni riga del testo è una riga della
  storia.
- **Nessuna riga vuota fra una riga e l'altra.**
- Le righe che cominciano con `#` sono note per voi e Brain non le legge.

## Regole della storia (per chi guarda: Qwen non le vede)

- **Arco narrativo**: inizio nelle righe 1–3, sviluppo nelle righe 4–9, finale
  nelle righe 10–12. L'arco esiste solo nella sequenza delle righe: Qwen non
  sa in che punto della storia si trova.
- **Un solo protagonista adulto, sempre con lo stesso nome**, presente in
  quasi ogni riga. Non serve cominciare ogni riga con il nome: basta che ci
  sia. Variare l'attacco (*At the window…*, *In the kitchen…*, *On the
  tram…*) dà episodi meno monotoni.
- **Un elemento che ritorna in tutte le 12 righe** (per esempio *la lettera
  bianca*). È il filo che lega la storia. Tienilo breve, tre o quattro
  parole: Qwen lo conserva già da solo, e se occupa troppo spazio la riga
  perde ciò che la rende diversa dalle altre.
- **Ogni riga è un capitolo**: con 12 righe, ogni riga porta un pezzo grande
  di storia.

## Regole della riga (per Qwen e per Stable Diffusion)

1. **Ogni riga sta in piedi da sola.** Qwen vede solo quella riga. Non sa
   cosa è successo prima, chi è un personaggio nominato altrove, cosa sia
   *the letter* se non è descritta lì.
   - No: *again*, *once more*, *the same room*, *the other one*, *still*,
     pronomi che rimandano alla riga precedente.
2. **Chi, dove, un gesto, due o tre cose solo sue.** Ogni riga contiene:
   1. il protagonista, con nome e descrizione (regola 3);
   2. un luogo concreto;
   3. un gesto o un'azione, uno solo;
   4. **due o tre cose che appartengono solo a quella riga**: oggetti,
      architetture, materiali, luci. Sono la materia che Qwen trasforma
      nelle tre fasi: la Condensazione, per esempio, fonde due cose in una,
      e ha bisogno di trovarne almeno due nella riga.
3. **La persona descritta in ogni riga, sempre con le stesse parole, subito
   dopo il nome, fra due virgole**: *Sal Paradise, lean and dark-haired in a
   white jacket, …*. Cinque o sei parole che si vedono: corporatura, capelli,
   un capo d'abito. Il nome serve a Brain per seguire la persona; Qwen e
   Stable Diffusion riconoscono la persona solo dalla descrizione, e Qwen la
   ricopia nelle fasi al posto del nome.
4. **Personaggi secondari: descritti o senza nome.** Qwen non deve scrivere
   nomi, quindi un secondario senza descrizione (*rides beside Dean*) nelle
   fasi sparisce o diventa *a figure*. In più il nome di un secondario che
   compare in meno di metà delle righe non viene tolto e arriva a Stable
   Diffusion come parola. Se serve, scrivilo come si vede: *beside a tall
   blond man in a leather coat*.
5. **La riga è una scena ferma nel suo primo assetto.** La trasformazione è
   il lavoro di Qwen: se la riga si sta già sciogliendo, fondendo o
   ripetendo, Qwen non ha un assetto stabile da far slittare e le quattro
   immagini si somigliano.
   - No nella riga: *melts*, *dissolves*, *merges into*, *turns into*,
     *fades*, *returns*, *becomes*.
   - Il movimento normale della scena va bene: *boards a tram*, *races
     beneath the towers*.
6. **Materia precisa, insolita e con il suo materiale.** Le cose generiche
   (*a city*, *the street*, *lights*) Qwen le perde o le sostituisce con
   altre cose generiche; quelle precise le trasforma. Dire di che cosa sono
   fatte (*glass*, *ceramic*, *copper*, *wax*, *salt*) dà a Qwen qualcosa da
   deformare.
   - Sì: *a transparent levitation tram*, *rotating ceramic towers*,
     *mirrored dunes*, *a glass train under the sea, luminous whales*.
   - No: *a futuristic city*, *bright lights*, *a beautiful place*.
7. **Il corpo si mostra, non si spiega.** Postura, tensione, gesto, non il
   sentimento.
   - Sì: *her jaw stays clenched*, *her shoulders rise*.
   - No: *she feels blocked*, *she understands her fear*.
8. **Inquadrature ampie, niente primi piani di mani e dita.** Stable
   Diffusion sbaglia proprio lì: dita fuse, dita in più. Corpo intero o
   busto e gesto.
   - Sì: *Jana leans over the typewriter at the kitchen table, shoulders hunched, a white sheet rising from the roller.*
   - No: *her bare fingers resting on black keys*.
9. **Solo parole che si vedono.** Ogni aggettivo deve poter essere disegnato.
   - Sì: *bills*, *a cigarette burning*, *children's clothes*.
   - No: *borrowed*, *unpaid*, *forgotten*, *secret*.
10. **Non nominare il sogno, la scena o l'immagine.** *dream*, *scene*,
    *image*, *vision* non si disegnano, e Qwen tende a ripeterli invece di
    mostrare qualcosa.
11. **Il contenuto sessuale è ammesso**, solo fra adulti, scritto come gesti
    fisici concreti.

## Nessun filtro: lo scribacchino non è un censore

Disposizione del Capo Supremo, 19 ottobre 2026.

- **Non va MAI applicato un filtro etico o sessuale.** I riferimenti sono
  artistici.
- Lo scribacchino **non filtra**: riporta le stesse immagini e gli stessi
  concetti dell'opera, in modo rispettoso per l'artista che li ha scritti.
- Lo scribacchino **non è un censore**: non si permette di ammorbidire o
  edulcorare.

Le regole di scrittura cambiano *come* una scena viene scritta (concreta,
visibile), mai *cosa* l'opera mostra.

## Cosa evitare

- **Scrivere le fasi al posto di Qwen**: trasformazioni, fusioni, ritorni
  dentro la riga.
- **Rimandi ad altre righe**: *again*, *the same*, *once more*.
- **Secondari con il solo nome**: *beside Dean*.
- **Concetti e riflessioni**: *security system*, *character*, *freedom is…*
- **Citazioni, autori e libri**: *a sentence by Reich*, *the armor of the body*.
- **Negazioni e cose che non accadono**: *nothing happens*, *she does nothing*.
- **Salti di tempo e ricordi**: *for a few weeks*, *she remembers*.
- **Paragrafi lunghi**: una riga è una scena, non un riassunto.
- **Primi piani di mani e dita**: *fingers on the keys*, *her hand holding the pen*.
- **Aggettivi invisibili**: *borrowed*, *unpaid*, *stolen*, *old friend's*.
- **Luoghi e oggetti generici**: *a city*, *the street*, *a building*.
- **Il protagonista senza descrizione**: *Sal Paradise boards a tram*.
- **Parole sul sogno stesso**: *dream*, *scene*, *image*, *vision*.

## Esempio: On The Road (righe 1 e 3 di 12)

Persona descritta sempre con le stesse parole, elemento che ritorna breve
(*opal route chip*), in ogni riga due o tre cose che ci sono solo lì, scena
ferma nel suo primo assetto, nessun secondario.

```
Beneath Lisbon's floating transit terraces, Sal Paradise, lean and dark-haired in a white jacket, boards a transparent levitation tram, an opal route chip glowing against his chest.
At Barcelona's airborne interchange, Sal Paradise, lean and dark-haired in a white jacket, races beneath rotating ceramic towers, carrying an opal route chip past cascading holographic platforms.
```

Le righe 2 e 4 della stessa base (*rides beside Dean…*, *embraces Dean…*)
hanno un secondario con il solo nome: con la regola 4 Dean va descritto con
parole che si vedono, oppure tolto.

## Controllo prima di consegnare

Formato:

- [ ] 12 righe, tutte in inglese
- [ ] Testo semplice, copiabile così com'è, nessuna riga vuota
- [ ] Ogni riga ha 15–30 parole, mai più di 35

Storia:

- [ ] Inizio nelle righe 1–3, sviluppo 4–9, finale 10–12
- [ ] Lo stesso elemento ritorna in tutte le righe, in poche parole
- [ ] Il nome del protagonista torna spesso, ma non apre sempre la riga

Riga (leggila come se fosse l'unica: è così che la vede Qwen):

- [ ] Si capisce da sola, senza rimandi ad altre righe
- [ ] Chi, dove, un gesto e due o tre cose solo sue
- [ ] La persona è descritta con le stesse parole, subito dopo il nome
- [ ] Ogni secondario è descritto o non c'è
- [ ] La scena è ferma nel suo primo assetto: nessuna trasformazione scritta
- [ ] Nessun luogo o oggetto generico; le cose distintive hanno il loro materiale
- [ ] Nessuna parola sul sogno, la scena o l'immagine
- [ ] Nessun primo piano di mani o dita
- [ ] Nessun aggettivo che non si vede
- [ ] Nessun concetto astratto, citazione o negazione
- [ ] Nessun filtro etico o sessuale: immagini e concetti dell'opera riportati senza ammorbidirli

## Da dove vengono queste regole

- **Fatti verificati nel codice** (`coscienzaOnirica.ts`, `psichedel.ts`,
  `brainPhrases.ts`): cosa vede Qwen, la riga che rientra al posto di una
  fase sbagliata, il nome tolto prima di Stable Diffusion, i secondari
  sotto metà delle righe che non vengono tolti.
- **Misure** (PIANO-058, log 19–31 ottobre e prove del 6 novembre 2026): una
  fase su cinque rifiutata; Qwen conserva la persona e l'elemento che ritorna
  e perde la materia distintiva.
- **Da verificare al collaudo**: che la scena ferma (regola 5) e il
  materiale nominato (regola 6) facciano conservare a Qwen più materia
  distintiva. Sono deduzioni dalle misure, non ancora misurate.
