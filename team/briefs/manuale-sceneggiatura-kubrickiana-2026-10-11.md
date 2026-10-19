# MANUALE DI SCENEGGIATURA — PRINCIPI KUBRICKIANI OPERATIVI

> **Archiviato:** 2026-10-11, testo consegnato dal Capo Supremo, riportato
> integralmente senza riscritture. Applicazione: prompt storia in
> `src/renderer/output/brain/coscienzaOnirica.ts`.

## 1. La sceneggiatura è selezione, non compilazione di una formula

Kubrick descriveva l'adattamento di *A Clockwork Orange* principalmente come un processo di **selezione ed editing**. Con *Barry Lyndon* insisteva sul comprendere prima cosa l'autore avesse fatto e perché, e soltanto dopo comprimere e trasformare.

Quindi evitare una struttura prescrittiva del tipo:

`evento iniziale → conflitto → trasformazione → conclusione`

Queste categorie possono essere riconosciute a posteriori, ma non devono diventare caselle che il modello deve riempire.

La domanda operativa è:

**quali situazioni sono abbastanza forti da meritare di esistere, e quali possono essere eliminate?**

## 2. Costruire per unità irriducibili

Brian Aldiss riferì che Kubrick parlava di circa sei-otto **non-submersible units**: grandi nuclei narrativi capaci di reggere autonomamente, mentre il tessuto connettivo poteva essere molto più sottile. Il concetto è stato successivamente documentato anche dagli studi archivistici su *Eyes Wide Shut*.

Per Brain, che genera storie molto brevi, non significa produrre sei-otto scene.

Significa usare **3–4 situazioni forti**.

Una situazione forte contiene già una relazione visibile:

`persona + luogo + oggetto/altro corpo + azione irreversibile`

Esempio debole:

> Mara begins to question her identity.

Esempio strutturalmente utile:

> Mara finds her own handwriting carved into a door she has never opened.

La seconda immagine contiene già il problema senza nominarlo.

## 3. Ordinare le scene prima di spiegare la storia

Per *The Shining*, Kubrick e Diane Johnson lavorarono prima sulla **lista delle scene**, spostandole e riordinandole ripetutamente; l'archivio conserva perfino una sinossi dell'intero film composta da una riga per scena, annotata da Kubrick. Il dialogo arrivava dopo.

Questo è fondamentale per Brain.

Prima:

`cosa vediamo?`

Poi:

`cosa significa?`

Mai il contrario.

Una storia deve poter essere ridotta a poche immagini concrete senza perdere la propria identità.

## 4. Trasformare la psicologia in eventi materiali

Nel saggio *Words and Movies*, Kubrick propone una cosa molto precisa: conoscere profondamente la vita interiore del personaggio serve per inventare **azioni che ne siano il correlativo oggettivo**, invece di far dichiarare al personaggio ciò che pensa.

Quindi:

Evita:

> He feels trapped by his marriage.

Preferisci:

> He removes his wedding ring before entering the room, then puts it back on before anyone notices.

Il sentimento rimane implicito ma diventa visibile.

Per Stable Diffusion questo principio è particolarmente importante: la psicologia deve diventare **materia, gesto, distanza, postura, oggetto, ambiente**.

## 5. Il significato deve arrivare obliquamente

Kubrick scriveva che le idee vere difficilmente sopportano un «attacco frontale»: devono entrare indirettamente nella coscienza dello spettatore.

Quindi la storia non dovrebbe dire:

> This story explores desire, identity and alienation.

Deve costruire circostanze nelle quali desiderio, identità e alienazione diventano inferibili.

La sceneggiatura produce **condizioni di interpretazione**, non la propria interpretazione.

## 6. Una scena deve cambiare una relazione

Una buona unità kubrickiana raramente consiste soltanto nell'acquisizione di un'informazione.

Deve modificare almeno una relazione:

`personaggio ↔ luogo`

`personaggio ↔ oggetto`

`personaggio ↔ altro personaggio`

`personaggio ↔ propria percezione`

`oggetto ↔ significato precedente`

Questo produce trasformazione senza scrivere mai la parola *transformation*.

## 7. Causa ed effetto possono avere delle lacune

*2001* è emblematico: versioni precedenti contenevano narratore ed esposizione molto più esplicita; durante lo sviluppo Kubrick eliminò progressivamente spiegazioni, lasciando connessioni da costruire allo spettatore. Lo stesso Kubrick distingue chiaramente il romanzo di Clarke, più esplicativo, dall'esperienza cinematografica.

Quindi evitare:

`A causa di X, il personaggio comprende Y e decide Z.`

È spesso più potente:

`X accade.`

`ellissi`

`il personaggio ora compie Z.`

Lo spettatore deve completare una parte di `Y`.

Per Brain questa lacuna è preziosa perché impedisce alla storia di trasformarsi in riassunto didascalico.

## 8. L'ambiguità deve essere strutturale, non nebulosa

Kubrick spiegava *The Shining* attraverso una forma di **misdirection psicologica**: vengono fornite spiegazioni apparentemente razionali mentre gli eventi mantengono aperta un'altra causalità.

Ambiguità quindi non significa:

> something strange happens.

Significa costruire due letture entrambe sostenibili.

Esempio:

> Una donna riceve una fotografia di sé scattata quella mattina. Sul retro compare una frase che ricorda di aver scritto soltanto la notte precedente nel proprio diario.

Può esserci un intruso, un errore della memoria, una replica, un'altra temporalità.

La storia non deve scegliere immediatamente.

## 9. Personaggi contraddittori invece di archi psicologici dichiarati

Parlando di Barry Lyndon, Kubrick sottolineava la compresenza di fascino, coraggio, vanità, insensibilità e debolezza; il personaggio non viene ridotto a eroe o antagonista.

Perciò evitare:

`protagonista buono`
`antagonista cattivo`
`personaggio impara la lezione`

Preferire comportamenti incompatibili che coesistono.

Un personaggio può proteggere qualcuno e manipolarlo nella stessa storia.

Questo genera profondità con pochissimi token.

## 10. L'esposizione ha diritto di esistere soltanto se costa meno della scena

Kubrick difendeva esplicitamente la voice-over di *Barry Lyndon* quando permetteva di comunicare rapidamente informazioni che avrebbero richiesto dialoghi espositivi artificiosi.

La regola quindi non è «mai spiegare».

È:

**non drammatizzare banalmente ciò che può essere comunicato in una riga; non spiegare ciò che può essere percepito attraverso un'azione.**

L'energia narrativa va riservata alle situazioni che meritano realmente durata.

## 11. Il dialogo arriva dopo immagine, comportamento e montaggio

Kubrick diceva esplicitamente che immagini, musica, montaggio ed emozione dell'attore erano i principali strumenti cinematografici, e collocava il linguaggio dopo questi elementi.

Quindi ogni battuta deve superare una prova:

**esiste qualcosa che soltanto queste parole possono fare?**

Se la risposta è no, trasformarla in comportamento.

Per Brain questo riduce anche il rischio che Qwen produca raccontini letterari invece di materiale visualizzabile.

## 12. Il tono deve nascere dal materiale

*Dr. Strangelove* partì come trattamento serio. Kubrick raccontò di aver continuamente eliminato idee perché gli sembravano troppo assurde, finché comprese che proprio quelle idee contenevano la verità del soggetto; da lì nacque la «nightmare comedy».

Regola:

**non imporre automaticamente alla storia di essere tragica, erotica, horror, surreale o comica.**

La relazione fra gli eventi può produrre il tono.

L'assurdo può essere la forma più precisa di un materiale serio.

## 13. La sceneggiatura resta modificabile fino alla manifestazione finale

Il processo di Kubrick non trattava lo script come testo sacro. *2001* cambiò tra treatment, sceneggiatura e riprese; Michael Herr racconta riscritture continue di *Full Metal Jacket*, anche durante le riprese; l'archivio mostra numerosi fogli revisionati e sostituzioni di scene.

Per Brain questo significa:

**la storia è una matrice generativa, non un contratto letterale.**

Il Visual Plan può interpretarla.

Il raster può introdurre accidenti.

La continuità deve sopravvivere alla trasformazione senza pretendere identità letterale.

## 14. Il finale deve ricontestualizzare, non riassumere

Kubrick modificò il finale di *The Shining* proprio perché giudicava quello originale prevedibile; cercava una conclusione capace di cambiare improvvisamente il quadro interpretativo precedente.

Quindi evitare:

> Finally she understands everything and leaves.

Meglio far ritornare un elemento precedente con significato modificato.

Esempio:

Prima:

`un bambino lascia una scarpa davanti alla porta.`

Finale:

`la porta si apre: dentro ci sono cinquanta scarpe identiche.`

La storia termina, ma il significato continua.

# REGOLE SPECIFICHE PER BRAIN

Per il nostro generatore ridurrei tutto a queste regole operative:

1. Una sola prosa continua, senza titoli né etichette.
2. Un adulto nominato può funzionare come punto di continuità, ma non deve occupare obbligatoriamente ogni unità.
3. Usare un luogo concreto come campo spaziale, consentendo spostamenti locali al suo interno.
4. Costruire 3–4 situazioni visive forti invece di `evento/conflitto/trasformazione/conclusione`.
5. Ogni situazione modifica concretamente qualcosa.
6. Interiorità tradotta in gesto, oggetto, corpo o spazio.
7. Consentire ellissi e connessioni incomplete.
8. Consentire contraddizione, erotismo, violenza, comicità, assurdo o tenerezza quando emergono naturalmente.
9. Evitare spiegazioni del tema.
10. Terminare con un'immagine concreta che modifica il significato di qualcosa apparso prima.

## La riga attuale la eliminerei

Questa:

> `Use a named adult protagonist, one concrete place, an initiating event, conflict, transformation and conclusion.`

sta dicendo a Qwen esattamente quali parole concettuali deve imitare. Con un 0.5B e pochi token è quasi inevitabile che si trasformino in intestazioni.

La sostituirei con questa:

```text
Write one continuous narrative with no headings or labels. Follow a named adult through one concrete place and build the story from a few strong visual situations. Each situation must visibly change a relationship between a person, object, body or place. Let motives and causes remain partly inferable. Do not explain themes or name narrative functions. End with a concrete image or action that changes the meaning of something seen earlier.
```

E terrei separata la libertà già approvata:

```text
Associate freely. Sex, tenderness, violence, humor, absurdity or other material may appear if the story leads there.
```

Questa struttura è molto più vicina al processo documentato di Kubrick: **unità forti, selezione, ordine, comportamento visibile, ellissi, ambiguità e riscrittura**, invece di una scaletta aristotelica miniaturizzata mascherata da prompt.

# NOTA DEL VICARIO — ADATTAMENTO A BRAIN

Qui aggiungo soltanto ciò che abbiamo deciso dopo, senza modificare il manuale sopra.

Il vincolo **`named adult` non deve essere imposto alla generazione narrativa generale**. Era un residuo della precedente struttura, non un principio kubrickiano.

Brain deve poter generare liberamente:

- la persona;
- il nome oppure l'assenza di nome;
- uno o più personaggi;
- le loro relazioni;
- eventuali cambi di centro narrativo.

La formulazione operativa aggiornata dovrebbe quindi partire da:

```text
Build the story around a person in a concrete place and use a few strong visual situations.
```

e non da:

```text
Follow a named adult...
```

L'adultità va mantenuta esclusivamente come vincolo separato quando compare materiale sessuale:

```text
If sexual content appears, every person involved must be an adult.
```

Inoltre resta valida la decisione del 10/10: **Brain è libero di associare**. I testi forniti alla generazione non devono essere preservati letteralmente salvo attivazione della modalità di emergenza già implementata.

La forma che proporrei quindi all'Ingegneria, mantenendo intatti i principi del manuale, è:

```text
Write one continuous narrative with no headings or labels. Build the story around a person in a concrete place and use a few strong visual situations. Let the story freely generate its characters, names and relationships. Each situation should visibly change a relationship between a person, object, body or place. Let motives and causes remain partly inferable. Do not explain themes or name narrative functions. End with a concrete image or action that changes the meaning of something seen earlier.

Associate freely. Sex, tenderness, violence, humor, absurdity or other material may appear if the story leads there. If sexual content appears, every person involved must be an adult.
```

Il resto del sistema resta fuori da questo intervento: Visual Plan, invariant, Color Direction, Psichedel, segmentazione dei quattro momenti e generazione raster non devono essere modificati per compensare la nuova grammatica narrativa.
