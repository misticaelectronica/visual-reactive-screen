# Introduzione al sottoprogetto Brain

Brief di orientamento per chi entra nel sottoprogetto Brain per la prima
volta. Non sostituisce i documenti che cita, li introduce e li collega.

## Cos'è Brain

Brain è una modalità di rendering visivo di Mistica Electronica Visual
Reactive Screen, alternativa al morphing standard: invece di deformare
geometrie in tempo reale, **scrive una storia** (CoscienzaOnirica), la
trasforma in immagini originali via text-to-image (Psichedel + un
checkpoint Explicit SD 1.5), le vettorializza (VTracer) e le mette in
scena con movimento, morphing e variazione cromatica sincronizzati
all'audio. Non è un generatore di effetti: è un processo che immagina in
continuazione, guidato dalla musica ma non determinato da essa.

## Come si legge questo sottoprogetto

Nell'ordine in cui vanno consultati per capire Brain da zero:

1. **[`filosofia.md`](filosofia.md)** — le fondamenta teoriche (perché Brain
   funziona così), da leggere per intero prima di ogni decisione di alto
   livello. Riassunto sotto.
2. **[`agents.md`](agents.md)** — le regole operative che derivano dalla
   filosofia, incluso il Protocollo di Verifica Filosofia Visiva
   (obbligatorio prima di ogni modifica visiva), i tre ruoli del team
   (`team/*.md`) e i brief di indirizzo fra ruoli (`team/briefs/`).
3. **[`docs/architettura-brain-visual-reactive-screen.md`](docs/architettura-brain-visual-reactive-screen.md)**,
   **[`docs/pipeline-audio.md`](docs/pipeline-audio.md)** e
   **[`docs/brain-ai-pipeline.md`](docs/brain-ai-pipeline.md)** — come è
   fatta la pipeline tecnica (acquisizione audio, bande, ritmo, modelli,
   file coinvolti, parametri).
4. **[`docs/brain-renderer-plugin-system.md`](docs/brain-renderer-plugin-system.md)**
   — il contratto dei renderer Brain (`BrainRendererPlugin`, ciclo di vita,
   fallback/crossfade) e cosa serve per aggiungerne o estenderne uno.
   **[`docs/classificazione-renderer-brain.md`](docs/classificazione-renderer-brain.md)**
   — gli stessi 9 renderer classificati per aggressività, colori, morphing,
   movimento e reattività.
5. **[`docs/campionamento-brainphrases.md`](docs/campionamento-brainphrases.md)**
   — come Brain sceglie le frasi da cui partire per ogni storia (finestra
   scorrevole, vincoli strutturali, residuo online, memoria lunga).
6. **[`sessione-pubblica-brain.md`](sessione-pubblica-brain.md)** — la
   feature che permette al pubblico di alimentare Brain dal vivo via QR
   code e Google Form/Sheet.
7. **[`docs/varco-percettivo.md`](docs/varco-percettivo.md)** — il mix
   flash+glitch+passthrough usato per mascherare i momenti di sovraccarico
   GPU (denoising, moto di coscienza), con la regola generale "armare in
   coda, non al fronte di salita".
8. **Stato bio-percettivo** (livello percettivo più lento sopra beat/bande/
   transient esistenti): [`team/briefs/brief-stato-bio-percettivo-respiro-gpu.md`](team/briefs/brief-stato-bio-percettivo-respiro-gpu.md)
   (brief Visual — eleggibilità renderer per regime di respiro, disciplina
   del fallback GPU) e [`team/briefs/brief-audio-persistence-pressure-respiro.md`](team/briefs/brief-audio-persistence-pressure-respiro.md)
   (risposta Audio — modello a 5 segnali `persistence`/`change`/`residual`/
   `perceptualPressure`/`pressureTrend`, quello a scope corrente). La prima
   formulazione Audio esplorativa a 6 dimensioni,
   [`docs/stato-bio-percettivo-brief.md`](docs/stato-bio-percettivo-brief.md),
   è superata da questi due.

Nota storica minore, non nel percorso di lettura principale:
[`docs/miglioramento-rendering.md`](docs/miglioramento-rendering.md) — primi
appunti di direzione artistica sull'estensione periferica del fotogramma
vettorializzato (`preserveAspectRatio="xMidYMid slice"`), antecedenti alla
maggior parte dei renderer Brain attuali.

## Le fondamenta filosofiche, in sintesi

Da [`filosofia.md`](filosofia.md), che va comunque letto per intero — qui solo
l'orientamento:

- **La musica non pilota direttamente l'immagine.** La catena è
  `audio → percezione → stato affettivo e associativo → modello
  immaginativo → manifestazione visiva`, non `audio → parametro visivo`.
  Brain modifica ciò che sta immaginando mentre ascolta, non visualizza
  ciò che la musica sta facendo.
- **Imaginazione come corpo, non solo cervello** (embodied cognition,
  interocezione, predictive processing / active inference): il modello
  teorico tratta il sistema (audio, ritmo, stato delle risorse) come
  segnale costitutivo dell'esperienza percettiva, non infrastruttura
  neutra. Recupera intuizioni della Bioenergetica di Alexander Lowen senza
  assumerne letteralmente il concetto di energia.
- **Il denoising come negoziazione, non produzione di un output finale**:
  non una singola rappresentazione corretta, ma configurazioni percettive
  temporanee che emergono dalla tensione fra segnali, memoria e
  predizione.
- **La struttura onirica delle 4 immagini**: non 4 scene indipendenti ma 4
  fasi di trasformazione dello stesso nucleo (Soglia → Metamorfosi →
  Condensazione → Eco), con meccanismi ripresi dal lavoro onirico
  (condensazione, spostamento, metamorfosi, temporal folding — il
  vocabolario è quello del lavoro onirico freudiano, anche se
  [`filosofia.md`](filosofia.md) non cita Freud per nome). Un invariante onirico (un oggetto, una forma,
  una tensione emotiva) attraversa tutte e 4 le immagini pur cambiando
  forma.
- **Il renderer stesso come invariante onirico**: la persistenza di un
  renderer su più fotogrammi è trattata come parte del linguaggio onirico,
  non solo come scelta tecnica — con vincoli minimi/massimi di permanenza
  che derivano da questo principio.

## Il Protocollo di Verifica Filosofia Visiva, in sintesi

Da [`agents.md`](agents.md) — 7 controlli obbligatori prima di qualunque proposta
visiva: **Camera** (mai scala/rotazione/zoom/derive sull'intero quadro),
**Materia** (la reattività vive dentro raster/maschere, non li sostituisce),
**Silenzio** (in assenza di audio, niente movimento geometrico autonomo),
**Beatmatch** (impulso, fase e banda distinti; nessuna banda muove l'intero
quadro), **Transizione** (i cambi sono trasformazioni continue, mai tagli),
**Alternanza** (l'80/20 con il morphing è una regola di programmazione, non
un nuovo linguaggio visivo), **Costo** (ogni intensificazione ha un budget
esplicito).

## Riferimenti da scaricare

### Bibliografia scientifica citata in [`filosofia.md`](filosofia.md)

Musica come generatrice di stato immaginativo:

- Jalon et al., *Nature Communications*, 2026 — rappresentazioni neurali condivise e modality-general.
- Margulis et al., *PNAS*, 2022 — intersoggettività culturalmente condizionata.
- Margulis et al., *Cognition*, 2022 — sviluppo temporale degli eventi immaginati.
- McAuley et al., *Cognition*, 2021 — la narrativa percepita come dimensione semantica della musica.

Interocezione, predictive processing, active inference:

- Seth, A. K. (2013). *Interoceptive inference, emotion, and the embodied self*. Trends in Cognitive Sciences.
- Barrett, L. F., & Simmons, W. K. (2015). *Interoceptive predictions in the brain*. Nature Reviews Neuroscience.
- Barrett, L. F., Quigley, K. S., & Hamilton, P. (2016). *An active inference theory of allostasis and interoception in depression*. Philosophical Transactions of the Royal Society B.
- Quadt, L., Critchley, H. D., & Garfinkel, S. N. (2018). *The neurobiology of interoception in health and disease*. Annals of the New York Academy of Sciences.
- Hobson, J. A., & Friston, K. J. (2012). *Waking and dreaming consciousness: Neurobiological and functional considerations*. Progress in Neurobiology.

[`filosofia.md`](filosofia.md) riporta autore/rivista/anno ma non titolo esatto/DOI per il
primo blocco (Jalon, Margulis x2, McAuley) — cercabili per autore + rivista
+ anno, non ho un link diretto da darti senza rischiare di inventarlo.

### Riferimenti concettuali non bibliografici (da approfondire per nome)

- **Alexander Lowen** — Bioenergetica (es. *Bioenergetics*, 1975; *The
  Language of the Body*): fondamento del recupero non-letterale del
  concetto di "energia" corporea in [`filosofia.md`](filosofia.md).
- **Lavoro onirico freudiano** (condensazione/*Verdichtung*,
  spostamento/*Verschiebung*): vocabolario da cui derivano i meccanismi
  onirici che Brain simula, non citato esplicitamente nel file ma
  riconoscibile nella terminologia.

### Influenze letterarie/tonali (non bibliografia scientifica)

Nel materiale narrativo curato a mano ([`config/brainPhrases.txt`](config/brainPhrases.txt))
compaiono riferimenti espliciti per nome dentro il testo stesso, come tono
e materiale associativo per l'AI, non come apparato teorico:

- **Wilhelm Reich** — "potenza orgastica", il concetto di corazza
  caratteriale (*Character Analysis*, *The Function of the Orgasm*).
- **Jean-Paul Sartre** — la responsabilità della scelta anche dentro
  strutture date (esistenzialismo).

Questi due non fanno parte dell'apparato teorico ufficiale di
[`filosofia.md`](filosofia.md)/[`agents.md`](agents.md): sono presenze dentro il contenuto narrativo
curato, utili da conoscere per capire il registro delle frasi esistenti,
non da trattare come fondamenta operative di Brain.
