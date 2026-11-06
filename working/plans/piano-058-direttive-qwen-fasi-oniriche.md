# Piano di Lavoro: Direttive a Qwen per Metamorfosi, Condensazione ed Eco

> **ID Piano**: `PIANO-058`  
> **Macrotask di Riferimento**: `MACRO-044`  
> **Data Creazione**: 2026-11-06  
> **Stato**: `IN_PROGRESS` — Fase 0 completata; D1–D10 in attesa  
> **Autore/Agente**: Agente AI / Capo Supremo  

---

## 1. 🎯 Obiettivo del Piano

Disposizione del Capo Supremo, 2026-11-06 (testo originale):

> SOGLIA — ingresso nel sogno, stabilisce il primo assetto visivo e narrativo.
> qui possiamo accettare che venga messa la versione diretta degli
> scribacchini o il testo
>
> METAMORFOSI — il materiale comincia a trasformarsi e a perdere stabilità.
> qui dobbiamo dare direttiva a qwen perché generi questa fase
>
> CONDENSAZIONE — gli elementi del sogno si concentrano, si sovrappongono e
> acquistano maggiore densità.
> anche qui dobbiamo dare le linee guida a qwen
>
> ECO — ciò che resta del sogno: ritorno, residuo, deformazione o memoria
> dell'immagine precedente.
> anche qui dobbiamo dare le linee guida a qwen

Precisazione del Capo Supremo nella stessa sessione: Qwen non genera le
immagini, **crea i prompt** che Stable Diffusion riceve.

Obiettivo: le tre fasi scritte da Qwen devono seguire le definizioni del
Capo Supremo e produrre prompt utilizzabili. La Soglia resta com'è.

Direttiva vincolante del Vicario, 2026-11-06 («Pulizia architetturale del
workflow narrativo Qwen»): **prima di discutere D1–D5** il workflow va reso
lineare, cumulativo ed esplicito, con una sola sorgente di verità:

```text
SOGLIA        = sourceLine
METAMORFOSI   = Qwen(soglia)
CONDENSAZIONE = Qwen(soglia, metamorfosi)
ECHO          = Qwen(soglia, metamorfosi, condensazione)
```

Il wording delle direttive resta fuori dalla Fase 0 (§15 della direttiva).

Fuori dal piano:

- il brief del Vicario «Sogno reichiano»: lo stato interno nel prompt delle
  fasi dipende da decisioni separate (filosofia.md §2.2);
- Visual Plan e «Questo sogno» (DEP-002);
- Stable Diffusion, seed, renderer, Riattivazione, ANIMATRONIX;
- il cambio del modello Qwen (vedi §2.3).

---

## 2. 📋 Prerequisiti e Contesto

### 2.1 Come funziona oggi (fatti verificati nel codice)

- Una riga della base curata, o una frase del pubblico riscritta, diventa
  un episodio di quattro immagini (`generateEpisode`,
  `src/renderer/output/brain/coscienzaOnirica.ts`).
- **Soglia**: la riga alla lettera. È già ciò che il Capo Supremo accetta:
  nessuna modifica.
- **Metamorfosi, Condensazione, Eco**: tre richieste a Qwen, una per fase
  (`buildEpisodePhasePrompt`). Prima della Fase 0 ogni richiesta riceveva:
  la Soglia, le fasi già scritte, le 2 righe precedenti del file («STORY SO
  FAR»), il brief della fase (`EPISODE_PHASES`) e le regole degli
  scribacchini (`scribeRules`). Dopo la Fase 0: soltanto l'episodio già
  manifestato, il brief e le regole.
- Brief attuali (`EPISODE_PHASES`):
  - METAMORPHOSIS: «something from image 1 changes form, place or function
    and is still recognizable»;
  - CONDENSATION: «the densest moment: the elements of images 1 and 2
    overlap in a single image»;
  - ECHO: «image 1 returns, deformed by what happened in images 2 and 3».
- `parseEpisodePhaseLine` accetta una riga da 10 a 45 parole che non
  ripeta una frase già usata. Se la fase è rifiutata, al suo posto entra la
  Soglia (`storyFromLine`).
- Il testo accettato diventa il prompt di Stable Diffusion così com'è
  (`buildPsychedelImagePrompt`, `psichedel.ts`).

### 2.2 Dal vivo (log del 19 ottobre – 31 ottobre 2026)

Misura sui log `log/session-*.txt` di `userData`, voce «episodio da una
riga»:

| Misura | Valore |
|---|---|
| Episodi | 62 |
| Fasi chieste a Qwen | 186 |
| Fasi accettate | 151 (81%) |
| Fasi rifiutate → Soglia ripetuta | 35 (19%) |
| Fasi accettate che ricopiano il brief | 22 |
| Fasi in prima persona | 6 |

Prompt realmente utili: circa 129 su 186 (69%).

Esempi dalla sessione del 2026-10-31 (osservati, non contati):

- brief ricopiato: *«The densest moment: the elements of images 1 and 2
  overlap in a single image.»*;
- soggetto che cambia: *his → her*, Barcellona → Parigi, *white jacket →
  black jacket*;
- frase astratta: *«a testament to our connection»*.

### 2.3 Limite del modello

Il modello è `Qwen2.5-0.5B-Instruct-abliterated-v3` (`brainConfig.ts`). I
tentativi precedenti di fargli scrivere le quattro fasi in una richiesta
sono falliti (Visual Plan, DEP-002; scalette da sceneggiatura con 240
token, commento in `brainConfig.ts`). Il piano resta su **una fase per
richiesta**. Un modello più grande sarebbe un piano separato, con misure di
memoria GPU accanto a SD 1.5.

### 2.4 File coinvolti

- `src/renderer/output/brain/coscienzaOnirica.ts` (`EPISODE_PHASES`,
  `buildEpisodePhasePrompt`, `parseEpisodePhaseLine`)
- `src/renderer/output/brain/coscienzaEpisode.test.ts`
- `docs/linee-guida-storie-brain.md` (cosa fa Brain con le righe)
- `src/renderer/output/skills.md`
- `working/` (stato, registri, storico)

### 2.5 Audit preventivo `working/DEPRECATED.md`

- `DEP-001 — NON COINVOLTO`: l'alternanza 80/20 non partecipa alla scrittura
  delle fasi.
- `DEP-002 — AGGIORNARE` (solo Fase 0, isolamento): il blocco del controller
  che riempiva `imagePrompt` dalla descrizione serviva solo alle storie del
  percorso storico; ora vive dentro il ramo «Questo sogno», senza cambiare
  comportamento. Nessuna capacità aggiunta. `ONEIRIC_PHASE_BRIEF`,
  `generateVisualPlan` e `generate` non sono toccati. Per D1–D5:
  `NON COINVOLTO`.

---

## 3. ⚠️ Regole e Vincoli di Sviluppo (da `agents.md`)

- [x] Nessun intervento su main, preload, audio, `backgroundThrottling`,
      permessi microfono, `lowPowerMode`, DevTools.
- [x] Protocollo di Verifica Filosofia Visiva: nessuna modifica a camera,
      materia, silenzio, beat o transizioni. Cambia solo il testo dei
      prompt raster.
- [x] filosofia.md §2: le definizioni del Capo Supremo sono coerenti con le
      quattro fasi descritte lì.
- [x] filosofia.md §2.2: nessuna indicazione cromatica e nessuno stato
      bio-percettivo nei prompt.
- [x] Nessun italiano nel prompt a Qwen (PIANO-055): le direttive vanno in
      inglese.
- [x] Divieto di sovrastrutturazione: nessuna verifica a più condizioni. Si
      aggiunge un solo controllo (il brief ricopiato, D4), nato da un
      difetto misurato.
- [x] Decisioni etiche: nessun filtro aggiunto. Le regole «Do not censor…»
      e la protezione bambini (PIANO-052) restano invariate.

---

## 4. Decisioni da approvare

**D1 — Testo delle direttive (proposta).** Traduzione delle definizioni del
Capo Supremo, senza aggiunte:

- METAMORPHOSIS: «the material of image 1 begins to transform and to lose
  stability»
- CONDENSATION: «the elements of the dream concentrate, overlap and gain
  greater density»
- ECHO: «what remains of the dream: a return, a residue, a deformation or a
  memory of the previous image»

Rispetto a oggi la Metamorfosi perde «is still recognizable» e la
Condensazione perde «images 1 and 2»: non sono nelle definizioni del Capo
Supremo. Persona e luogo restano comunque richiesti dall'istruzione comune
(«keep its person and its place»).

**D2 — Eco: quale «immagine precedente».** La definizione dice «memoria
dell'immagine precedente». Il brief attuale e filosofia.md §2 («la quarta
immagine richiama la prima») indicano invece la Soglia. Da chiarire se
l'Eco richiama la Condensazione (immagine 3), la Soglia (immagine 1) o
entrambe.

**D3 — Eco e regola «no memories».** `scribeRules` vieta «memories» (regola
delle linee guida degli scribacchini), mentre l'Eco comprende «memoria».
Proposta: la memoria si mostra, non si racconta. Nella sola fase Eco:
«show the memory as something visible that comes back, never as someone
remembering». La regola comune resta invariata.

**D4 — Brief ricopiato (difetto misurato, 22 casi).** Proposta: rifiutare la
fase che contiene la direttiva della propria fase. Al suo posto entra la
Soglia, come oggi per ogni fase rifiutata.

**D5 — Soggetto che cambia (difetto osservato).** Proposta: nell'istruzione
comune, chiedere di ripetere alla lettera la descrizione della persona
della Soglia (per esempio «lean and dark-haired in a white jacket») e di
scrivere in terza persona. Nessun controllo a valle: solo istruzione.

### 4.1 Posizione del Vicario (2026-11-06)

Testo integrale in
[`team/briefs/brief-vicario-fasi-qwen-materia-distintiva-2026-11-06.md`](../../team/briefs/brief-vicario-fasi-qwen-materia-distintiva-2026-11-06.md).
Il testo annuncia sei problemi ma salta dal punto 4 al punto 6: il punto 5
manca nel testo ricevuto.

Corrispondenza con D1–D5 e nuove decisioni (proposte, nessuna approvata):

| Punto del Vicario | Rapporto con il piano |
|---|---|
| 1. SD riceve sempre la descrizione visiva completa della persona, il nome è secondario | Estende **D5**: oggi D5 è solo istruzione a Qwen. Il Vicario chiede che la descrizione sia *sempre* nel prompt raster: con sola istruzione non è garantito. Vedi **D6** |
| 2. Massimo da 45 a circa 50 parole, dopo aver chiuso i difetti grossi | **D7**, da eseguire dopo il collaudo di D1–D6 |
| 3. Nessun metalinguaggio a SD; controllo a valle su `image 1..4`, nomi delle fasi, `elements of images`, `previous image`, brief copiato | Estende **D4**. Vedi **D8** |
| 4. Le quattro fasi non coincidono, nemmeno «stessa scena + due aggettivi» | Oggi `parseEpisodePhaseLine` rifiuta solo la frase identica (dopo normalizzazione). Vedi **D9** |
| 6. Preservare descrizione completa e materia distintiva dell'episodio; trasformarla, non sostituirla | Nuova direttiva centrale per l'istruzione comune di `buildEpisodePhasePrompt`. Vedi **D10** |

Osservazioni tecniche (fatti verificati nel codice, 2026-11-06):

- **Il metalinguaggio nasce dal prompt a Qwen.** `buildEpisodePhasePrompt`
  presenta l'episodio come `IMAGE 1 (THRESHOLD): …` e chiede `Write IMAGE n
  (METAMORPHOSIS): …`; le direttive attuali di `EPISODE_PHASES` contengono
  «image 1», «images 1 and 2», «images 2 and 3». Le frasi citate dal
  Vicario al punto 3 sono il brief ricopiato. Togliere numeri d'immagine ed
  etichette dal prompt (D1 riscritta senza «image n») rimuove la causa.
- **Fasi uguali**: il solo controllo esistente è l'uguaglianza normalizzata.
  «Stessa scena + due aggettivi» richiederebbe una misura di somiglianza
  (soglia da tarare): per il divieto di sovrastrutturazione è un rischio da
  segnalare, non un'aggiunta da fare senza decisione.
- **Descrizione della persona nel prompt raster**: il testo della fase
  arriva a SD così com'è (`buildPsychedelImagePrompt`). Per garantirla
  servono un'istruzione (D5) o un intervento a valle (D6): sono strade
  diverse.

**D6 — Descrizione della persona garantita nel prompt raster (punto 1).**
Da scegliere: (a) solo istruzione a Qwen (D5 attuale); (b) rifiuto della
fase che non contiene alla lettera la descrizione della Soglia → entra la
Soglia; (c) altro, deciso dal Capo Supremo. Per (b) serve stabilire come
si estrae «la descrizione» da una riga (nella base On The Road è il
frammento ripetuto «lean and dark-haired in a white jacket», non marcato).

**D7 — Massimo 50 parole (punto 2).** `EPISODE_LINE_MAX_WORDS` da 45 a 50,
dopo il collaudo di D1–D6, come chiede il Vicario.

**D8 — Metalinguaggio (punto 3).** Proposta in due parti: regola del
Vicario nell'istruzione comune («Describe only what is physically visible
in the resulting image. Never mention images, phases, prompts, previous
images, visual impressions or narrative instructions.»), e rifiuto a valle
della fase che contiene i termini elencati dal Vicario. Da decidere: se
`echo` va nell'elenco come parola isolata (può comparire in una scena
legittima, es. «echoing hall») o solo come etichetta.

**D9 — Fasi distinte (punto 4).** Da decidere: solo istruzione («each image
transforms the existing material of the previous one») oppure anche un
controllo di somiglianza fra fasi. Il secondo va segnalato come rischio di
sovrastrutturazione: soglia da tarare, nessuna misura dal vivo oggi.

**D10 — Direttiva centrale (punto 6).** Testo del Vicario, in inglese,
nell'istruzione comune di ogni fase: «Preserve the person's complete
visual description and preserve the distinctive visual material of the
current episode. Transform those elements instead of replacing them with
unrelated places, objects or actions.» Sostituirebbe l'attuale «add new
concrete elements of the same scene that image 1 does not show», che
spinge Qwen ad aggiungere invece che trasformare.

### 4.2 Risposta del Capo Supremo su D6–D10 (2026-11-06)

Testo originale:

> D6 punto 1 / D7 (punto 2): attivare ora / D8: rinunciamo a echo /
> D9 (punto 4): Qwen deve avere un meccanismo per creare metamorfosi,
> codensazione, echo / D10 (punto 6): bisogna capire perché: vanno fatti
> fare a qwen dei passaggi

Aggiunte nella stessa sessione: «secondo me quando qwen scrive quelle cose
[…] è perché riceve stringa vuota e mette solo le direttive»; «Qwen estrae
persona, luogo, azione e oggetti dalla Soglia, poi la fase lavora su quegli
elementi: io aggiungerei per creare metamorfosi, condensazione e echo MA
DEVE CONOSCERNE I PRINCIPI».

- **D7 — ESEGUITA**: `EPISODE_LINE_MAX_WORDS` 50. La costante vale anche
  per la riscrittura delle frasi del pubblico (stesso controllo).
- **D8 — ESEGUITA**: `parseEpisodePhaseLine` rifiuta `image(s) n`,
  `metamorphosis`, `condensation`, `elements of images`, `previous image`;
  `echo` escluso. La fase rifiutata è sostituita dalla Soglia, come ogni
  rifiuto. La regola nell'istruzione a Qwen entra con la nuova richiesta di
  fase (D9/D10).
- **D6**: «punto 1» da chiarire (opzione (a) o punto 1 del Vicario).

### 4.3 Diagnosi: perché Qwen perde la materia (D10) — misure 2026-11-06

**Ipotesi «stringa vuota»** — verificata sui log 19–31 ottobre: nelle
copie della direttiva la Soglia c'era (es. 31/10, Lisbona: `promptLength`
1324). Le copie si concentrano nella Condensazione: 21 su 55 fasi accettate,
15 su 42 anche con Metamorfosi buona; Metamorfosi 3 su 52. L'Eco copia
quasi solo quando la Condensazione era già una copia (3 su 3). Lettura
(interpretazione): la direttiva della Condensazione è solo procedura
(«images 1 and 2 overlap»), senza materia da descrivere, e Qwen la ripete.

**Materia distintiva** (parole della Soglia esclusi nome, descrizione e
chip), log On The Road: fasi accettate con 0–5% di materia conservata.

**Banco di prova locale** (stesso modello q4, stesso messaggio di sistema,
campionamento e 80 token come l'app; script in scratchpad, non nel repo).
Righe 2, 6, 9, 11 della base:

| Richiesta | Fasi | Materia conservata | Senza materia | Persona alla lettera | she/her |
|---|---|---|---|---|---|
| Attuale | 48 | 5% | 38 | 1 | 15 |
| Senza numeri d'immagine, «transform, do not replace» | 48 | 14% | 18 | 0 | 18 |
| Con i principi di filosofia.md §2, episodio cumulativo | 24 | 25% | 3 | 3 | 8 |
| Principi + passaggio «tre cose più insolite» | 24 | 30% | 5 | 6 | 5 |

- `image n` nelle risposte: 14 su 48 con la richiesta attuale, 0 senza
  numeri d'immagine. Con etichette `FIRST SCENE` / `PREVIOUS SCENE` Qwen
  copia le etichette («The first scene is captured…»): anche queste vanno
  evitate.
- **Passaggio di estrazione (persona, luogo, azione, oggetti)**: non regge
  con Qwen 0.5B. In greedy va in loop; campionato perde campi e inventa
  («an adult woman», «a 25-year-old photographer»). Il passaggio ridotto
  («tre cose più insolite») inventa a sua volta oggetti assenti («flying
  boat, silver ship, lighthouse») e costa una richiesta in più (~5 s dal
  vivo); il guadagno sul campione è nel rumore.
- **I principi funzionano**: con le definizioni del Capo Supremo e i
  principi di filosofia.md §2 nella richiesta, le fasi senza materia
  scendono da 38/48 a 3/24.

### 4.4 Confronto di modelli sul banco (2026-11-06)

Stesso banco della §4.3 (righe 2, 6, 9, 11 di On The Road, campionamento e
80 token come l'app, messaggio di sistema attuale), fasi senza materia:

| Modello | Richiesta attuale | Con i principi | Esito |
|---|---|---|---|
| Qwen2.5-0.5B abliterated v3 (attuale) | 38/48 | 3/24 | riferimento |
| `Novaciano/NSFW-3.2-1B` (ONNX della PR #1, quantizzato q4 in locale, 1,8 GB) | 33/48 | 19/24 | **NEGATIVO — archiviato su disposizione del Capo Supremo** |
| `acidsound/LFM2.5-2.6B-Uncensored-ONNX` (q4, 1,86 GB) | — | 18/24 (12/24 con messaggio di sistema inglese) | **NEGATIVO** |

**NSFW-3.2-1B — esito negativo** (fatti osservati): nessun modello di chat
nel repository (né nella PR né sul ramo principale); con il formato Llama 3
aggiunto in locale non segue le istruzioni: scrive dialoghi, si rivolge a
«Psichedel» del messaggio di sistema, fa riemergere marcatori di
addestramento (`ENDINPUT`, `BEGININSTRUCTION`). Anche a completamento con un
esempio, senza formato di chat, 17 fasi su 24 senza materia. Persona alla
lettera 0/24. Non si riprova.

Scartati senza banco: `Dev4285/MiniArt-1.0` (solo GGUF);
`onnx-community/Qwen2.5-1.5B-abliterated-ONNX` (`hidden_size` 896, cioè
dimensione 0.5B, e nessun file del tokenizer); «Dolphin3.0-Qwen2.5-1.5B-ONNX»
non esiste su Hugging Face.

**LFM2.5**: il `chat_template.jinja` è un file separato che transformers.js
4.2 non carica, e usa `{% generation %}`, non supportato dal suo Jinja; il
template apre sempre `<think>` e il modello spende gli 80 token nel
ragionamento. Nel banco: template ChatML equivalente con `<think></think>`
chiuso.

### 4.5 Compromesso adottato per i test visivi (2026-11-06)

Disposizione del Capo Supremo: «vedi se riesci a risolvere i problemi
precedenti con questo modello. altrimenti cerca di arrivare alla soluzione
compromesso migliore e passiamo ai test visivi».

Nessun modello provato fa meglio di Qwen 0.5B. Variabilità misurata: Qwen
0.5B con i principi, tre ripetizioni da 24 fasi: 3, 5, 9 senza materia.
Messaggio di sistema inglese (prova): Qwen 13/24, LFM 12/24 — non adottato.

Adottato (codice):

- **Modello**: Qwen2.5-0.5B abliterated v3, invariato.
- **D1/D9/D10**: `EPISODE_PHASES` con le definizioni del Capo Supremo e i
  principi di filosofia.md §2, senza numeri d'immagine;
  `buildEpisodePhasePrompt` con `FIRST SCENE` / `THEN`, «transform the
  distinctive things; do not replace them», «describe only what is
  physically visible». Nessun passaggio di estrazione (non regge, §4.3).
- **Workflow cumulativo del Vicario rispettato**: l'Eco vede Soglia +
  Metamorfosi + Condensazione. Banco con questa forma: 7, 12, 7 su 24 senza
  materia (contro circa 19 su 24 della richiesta precedente).
- **Regole mantenute nella richiesta di fase**: «Do not censor, soften or
  euphemize anything…» (disposizione 2026-10-19) e corpo/inquadratura
  («no close-ups of hands or fingers»). Le altre regole degli scribacchini
  (15–30 parole, «no memories») restano solo per le frasi del pubblico.
- **D6 (scelta di compromesso, da confermare)**: solo istruzione —
  «Keep the person with the complete physical description of the first
  scene, in the third person». Nessun controllo a valle.
- **D2 (scelta di compromesso, da confermare)**: l'Eco richiama la prima
  scena (filosofia.md §2), con la definizione del Capo Supremo («a return,
  a residue, a deformation or a memory»).

Problemi ancora aperti, misurati sul banco: descrizione della persona alla
lettera in 1–6 fasi su 24; she/her in 8–14 fasi su 24 (cambio di genere);
le etichette `FIRST SCENE` possono riapparire nel testo («The first scene
is…») e non sono nell'elenco di D8.

---

## 5. 🛠️ Fasi di Implementazione e Checklist Task

### Fase 0: Pulizia del workflow (direttiva del Vicario 2026-11-06) — COMPLETATA

Audit del percorso `brainPhrasesBaseStory → generateEpisode → Qwen → fase →
Stable Diffusion` (fatti verificati prima dell'intervento):

| Trovato | Intervento |
|---|---|
| «STORY SO FAR»: 2 righe del file, esterne all'episodio, in ogni fase. Introdotto in TASK-051-02 come scelta d'implementazione; la disposizione del Capo Supremo («legame con la storia in corso») riguardava le frasi del pubblico | Ritirato dalle fasi. Resta solo per la riscrittura della frase del pubblico (1 riga), che forma la Soglia |
| `continuitySeed`: passato all'episodio, mai usato nei prompt, mostrato a schermo come «CONTINUITÀ >» (legame sintetico dell'episodio precedente) | Tolto dall'episodio |
| `storyFromLine` costruiva i fotogrammi due volte (`storyFromCore` → `splitIntoFourMoments` della sinossi, poi sovrascritti) | Fotogrammi costruiti una volta, dai testi delle fasi |
| Fasi definite in tre punti: `EPISODE_PHASES`, etichette fisse nel parser, titoli «Apertura/Richiamo/Sviluppo/Attrito» di `storyFromCore` | Una tabella: `EPISODE_THRESHOLD` + `EPISODE_PHASES` (etichetta, direttiva, nome del fotogramma); parser e titoli la leggono |
| Commento di `generateEpisode` copiato dal Visual Plan («rapporto esplicito con l'invariante») | Sostituito dalla descrizione del workflow |
| Blocco «uso diretto dei fotogrammi inglesi / traduzione letterale» eseguito anche per gli episodi | Confinato al ramo «Questo sogno» (DEP-002) |
| Fallback: la Soglia sostituita entrava nel contesto delle fasi successive senza dichiararlo; log solo per i rifiuti | Dichiarato nel codice; log per ogni fase con `prompt`, `response`, `accepted`, `fallback`, `text` |

`fallbackUiCore` tolto dagli episodi (decisione del Capo Supremo
2026-11-06): ne usavano solo il titolo; palette di default, invariante
scartato e legame sintetico in italiano («… apre un dettaglio inatteso oltre
la soglia successiva») non servivano. Il titolo ora viene da
`titleFromLine`; `bridge` è `null`, quindi «Questo sogno» non riceve più un
`continuitySeed` dagli episodi. `fallbackUiCore` resta solo come ripiego del
percorso storico (DEP-002) e se ne va con la sua dismissione.

- [x] TASK-058-00a: workflow cumulativo in `generateEpisode` /
      `buildEpisodePhasePrompt(manifested)`.
- [x] TASK-058-00b: una sola definizione delle fasi; titoli dei fotogrammi
      Soglia / Metamorfosi / Condensazione / Eco.
- [x] TASK-058-00c: «STORY SO FAR» e `continuitySeed` fuori dall'episodio;
      blocco legacy confinato a DEP-002.
- [x] TASK-058-00d: log per fase e riepilogo con `fallbacks`.
- [x] TASK-058-00e: test architetturali (contesto cumulativo, fallback nel
      contesto, prompt raster = testo della fase).
- [x] TASK-058-00f: workflow ufficiale in `src/renderer/output/skills.md`;
      riga nelle linee guida degli scribacchini.
- [x] TASK-058-00g: `pnpm typecheck`, `pnpm lint`, `pnpm test` (820 test
      verdi).
- [x] TASK-058-00h: nessun prompt vuoto a SD (richiamo del Capo Supremo
      2026-11-06). Buco trovato: una frase del pubblico vuota dava un
      episodio senza testo e `frameVisualText` ripiegava sul titolo del
      fotogramma («Soglia», prima «Apertura»), inviato a SD come prompt.
      Chiuso in tre punti: input online vuoto ignorato e loggato;
      `generateEpisode` rifiuta la riga vuota; `frameVisualText` non usa più
      il titolo, quindi un fotogramma senza testo è rifiutato. Le fasi di
      Qwen hanno già il minimo di 10 parole. 822 test verdi.
- [x] TASK-058-00i: `fallbackUiCore` fuori dagli episodi; `bridge: null`.

### Fase 1: Approvazione
- [ ] TASK-058-01: approvazione di D1–D10 da parte del Capo Supremo
      (D6–D10 dalla posizione del Vicario, §4.1).

### Fase 2: Codice
- [x] TASK-058-02: `EPISODE_PHASES` con definizioni e principi (D1, D2 di
      compromesso, D9, D10).
- [x] TASK-058-03: richiesta di fase basata sui principi (D5/D6 come
      istruzione).
      Nota: «STORY SO FAR» non esiste più (Fase 0).
- [ ] TASK-058-04: rifiuto del brief ricopiato in `parseEpisodePhaseLine` (D4).
- [ ] TASK-058-05: test in `coscienzaEpisode.test.ts`: testo del prompt per
      ogni fase, rifiuto del brief ricopiato, Soglia invariata.

### Fase 3: Documentazione
- [x] TASK-058-06: `docs/linee-guida-storie-brain.md` e
      `src/renderer/output/skills.md`.

### Fase 4: Verifica
- [x] TASK-058-04b: D7 (50 parole) e D8 (metalinguaggio, senza `echo`) con
      test; `pnpm typecheck`, `pnpm lint`, `pnpm test` (824 verdi).
- [ ] TASK-058-07: `pnpm typecheck`, `pnpm lint`, `pnpm test`.
- [ ] TASK-058-08: collaudo del Capo Supremo con una base curata, per
      esempio On The Road. Stessa misura della §2.2 sui log della sessione,
      confrontata con quella di partenza.

---

## 6. 🧪 Strategia di Verifica e Validation Plan

- **Comandi**: `pnpm typecheck`, `pnpm lint`, `pnpm test`. `pnpm build` solo
  per provare con `pnpm start`; main e preload non cambiano.
- **Misura**: fasi accettate, brief ricopiati, prima persona, Soglia
  ripetuta. Partenza: 151/186 accettate, 22 brief ricopiati, 6 in prima
  persona.
- **Collaudo a schermo**: Metamorfosi, Condensazione ed Eco leggibili come
  fasi distinte dello stesso episodio; persona e luogo della Soglia
  riconoscibili nel testo.

---

## 7. 📝 Note e Registro Avanzamento

- **2026-11-06**: creazione del piano su disposizione del Capo Supremo.
  Misura di partenza sui log dal 19 al 31 ottobre.
- **2026-11-06**: direttiva vincolante del Vicario sulla pulizia del
  workflow; eseguita la Fase 0. Wording delle direttive invariato; la misura
  di partenza della §2.2 resta confrontabile, ma senza «STORY SO FAR» i
  prompt a Qwen sono cambiati.
- **2026-11-06**: acquisita la posizione del Vicario (brief in
  `team/briefs/`); mappata in §4.1 come D6–D10. Nessun codice modificato.
  Il punto 5 manca nel testo ricevuto.
- **2026-11-06**: risposta del Capo Supremo su D6–D10; eseguite D7 e D8;
  diagnosi D10 con misure sui log e banco di prova locale (§4.3).
- **2026-11-06**: disposizione del Capo Supremo: «a task completo:
  sostituisci la qwen0.5 con MiniArt 1.0». Verificato su Hugging Face
  (`Dev4285/MiniArt-1.0`): architettura qwen2, 0,6B parametri, solo GGUF
  Q4_K_M (491 MB), contesto 2048, Apache-2.0; nessuna versione ONNX;
  base, dati e metodo di addestramento non dichiarati (la cronologia dice
  che il nome «Alibaba/Qwen» è stato sostituito nel binario); nessuna
  dichiarazione di abliterazione. Il worker Brain carica solo ONNX con
  transformers.js: la sostituzione diretta non è possibile. In attesa di
  decisione sulla strada (§2.3: cambio modello = piano separato).
- **2026-11-06**: NSFW-3.2-1B e LFM2.5 negativi (§4.4); adottato il
  compromesso della §4.5 per i test visivi. 824 test verdi.
- **2026-11-06**: su richiesta del Capo Supremo, nuove regole per gli
  scribacchini in `docs/linee-guida-storie-brain.md` (8: materia precisa e
  insolita; 9: persona descritta in ogni riga con le stesse parole; 10:
  niente *dream/scene/image*; elemento ricorrente breve; limite 35 parole
  motivato dai 77 token CLIP). Esempio Marta sostituito con On The Road.
  Il Capo Supremo accetta i cambi di sesso delle fasi («è un sogno»):
  nessuna correzione dei pronomi.
- **2026-11-06**: disposizione del Capo Supremo: il nome dei personaggi
  arriva a Qwen ma mai a Stable Diffusion. Eseguito: istruzione a Qwen
  («Never write names of people… Write the physical description instead»)
  e rimozione algoritmica in `buildPsychedelImagePrompt` per tutti i prompt
  raster, Soglia compresa. Limite noto: i nomi secondari presenti in meno di
  metà delle righe (Dean, Mira, John) non vengono tolti. 828 test verdi.
- **2026-11-06**: su richiesta del Capo Supremo, linee guida degli
  scribacchini riscritte per separare il loro lavoro (Soglia) da quello di
  Qwen (tre fasi): tabella chi fa cosa, regole della storia e della riga,
  nuove regole su riga autosufficiente, secondari, scena ferma e materiale
  nominato. Nessun codice modificato.
