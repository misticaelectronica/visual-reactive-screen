# Piano di Lavoro: ogni riga degli scribacchini è una quartina

- **ID**: PIANO-051 (MACRO-039)
- **Data**: 2026-10-19 (riprogettato lo stesso giorno)
- **Stato**: IMPLEMENTATO (2026-10-19) — collaudo aperto (TASK-051-10)

## Disposizioni del Capo Supremo (2026-10-19, testo originale)

- «togliamo la riscrittura di brain? va bene però usiamola, portandoci dentro
  le regole degli scribacchini, soltanto quando prendiamo le righe dalle
  sessioni pubbliche, riscriviamo solo quelle, rispettando le regole che
  passiamo a qwen 0.5, quindi direi che le scriviamo in brainPhrases.txt già
  riscritte».
- «non possiamo in qualche modo mantenere i concetti del visual plan?»
- «ogni frase del pubblico deve generare una quartina basata sulla frase e su
  un legame con i principali elementi della storia in corso».
- «ogni frase che prendo dal testo degli scribacchini è una quartina».
- Opzione d'emergenza «testo esplicito»: «per tutti».
- Fallback: «nessuna frase del pubblico va persa».

## 1. 🎯 Obiettivo

**Una riga = un episodio = una quartina di quattro immagini**, nelle quattro
fasi di `filosofia.md` §2: Soglia, Metamorfosi, Condensazione, Eco.

1. **Riga degli scribacchini.** Brain prende **una riga alla volta**. La
   riga, **alla lettera e senza riscrittura**, è la Soglia (immagine 1). Qwen
   scrive soltanto le altre tre fasi a partire da quella riga: Metamorfosi,
   Condensazione, Eco. I concetti del Visual Plan restano, applicati a una
   riga sola.
2. **Frase del pubblico.** Qwen la riscrive in una riga con le regole degli
   scribacchini, **legata ai principali elementi della storia in corso**
   (protagonista, elemento che ritorna, luogo), e la scrive **già riscritta**
   in `brainPhrases.txt` nel punto in cui si trova Brain. Da lì è una riga
   come le altre: diventa la Soglia della sua quartina.
3. **Nessun prompt passa concetti fra immagini** («chi sogna non è Stable
   Diffusion»): ogni immagine riceve solo il proprio testo; la continuità
   nasce nella scrittura delle quattro fasi.

## 2. 📋 Contesto (fatti verificati)

- Log `session-2026-10-19-11-36-52`: la storia costruita dalle righe quasi
  alla lettera ha prodotto Marta in ogni immagine; le storie riscritte da
  Qwen 0.5B hanno inventato contenuti assenti (*Martina*, *chic mansion*,
  *coffee mug*), frasi senza soggetto, primi piani, invarianti come parti del
  corpo.
- Visual Plan: 0 accettati su 8 nei log del 10 e 17 ottobre. Chiedeva a Qwen
  quattro descrizioni lunghe da una storia intera ed esauriva ~200 token
  prima della quarta. Qui Qwen scrive tre righe brevi da una riga sola.
- Le frasi pubbliche entrano oggi in `brainPhrases.txt` via
  `insertOnlinePhraseIntoSessionSequence` (`brainController.ts`), senza
  riscrittura.
- Finestra attuale: 4–5 righe per storia, 2 ripetute fra storie
  consecutive (`phraseSampleMin/MaxCount`, `phraseWindowOverlapCount`).

## 3. ⚠️ Regole e vincoli

- **Audit deprecati**: DEP-001 `NON COINVOLTO`.
- **Protocollo visivo**: Camera, Materia, Silenzio, Beatmatch, Transizione
  invariati. Cambia solo l'origine del testo dei prompt raster.
- **Costo**: per episodio una chiamata Qwen breve (tre righe) al posto di
  storia (~21 s) + Visual Plan (~19 s). Più una chiamata breve per ogni
  frase del pubblico. Serializzate con le inferenze immagine.
- **Divieto di sovrastrutturazione**: si tolgono storia Qwen, Visual Plan a
  quattro parti e taglio per frasi; resta un solo meccanismo (le tre fasi da
  una riga), usato sia per le righe curate sia per quelle del pubblico.
- **Nessun filtro**: le istruzioni a Qwen non ammorbidiscono né edulcorano.
  Resta la regola degli adulti per il contenuto sessuale.
- **Opzione «testo esplicito» per tutti**: se attiva, Qwen deve riportare
  alla lettera le azioni fisiche esplicite della riga in tutte e tre le fasi,
  per le righe curate e per quelle del pubblico.
- **Ritmo di lettura**: un episodio consuma **una riga**, non 2–3. In un'ora
  (~12 episodi misurati il 17 ottobre) Brain legge ~12 righe, non 30. Va
  rimisurato col nuovo flusso, che è più veloce, e le linee guida vanno
  aggiornate.

## 4. 🛠️ Fasi di implementazione

### Fase 1: una riga = una quartina

- [x] TASK-051-01: Brain prende una riga alla volta (finestra 1, nessuna
  ripetizione fra episodi).
- [x] TASK-051-02: `generatePhaseLines(line, context)` — una chiamata Qwen
  che scrive `METAMORPHOSIS:`, `CONDENSATION:`, `ECHO:` (tre righe, 15–30
  parole, regole degli scribacchini; l'Eco richiama la Soglia deformata).
  Contesto: protagonista ed elementi delle righe precedenti.
- [x] TASK-051-03: validazione: tre righe, 12–40 parole, nessuna etichetta
  residua, nessuna copia identica della Soglia. Fallback: la riga della
  Soglia usata per tutte e quattro le immagini (seed diversi). Nessun
  episodio perso.
- [x] TASK-051-04: la storia dell'episodio: Soglia = riga letterale, poi le
  tre fasi; titolo, sinossi, bridge e invariante ricavati localmente
  (`fallbackUiCore`). Dismessi prompt storia e `generateVisualPlan`.
- [x] TASK-051-05: verificare cosa dipende ancora dalla storia Qwen (bridge
  di continuità, influenza della coscienza, didascalie, zoom annidato,
  ANIMATRONIX) e adattare senza aggiungere meccanismi. Nessuna modifica a
  `coscienzaCore.ts`.

### Fase 2: frasi del pubblico

- [x] TASK-051-06: `rewritePublicPhrase(phrase, context)` — una riga con le
  regole degli scribacchini, legata a protagonista, elemento che ritorna e
  luogo della riga in corso; contenuto non filtrato.
- [x] TASK-051-07: validazione (una riga, 12–40 parole). Se fallisce: entra
  la frase tradotta in inglese così com'è. **Nessuna frase del pubblico va
  persa.**
- [x] TASK-051-08: in `insertOnlinePhraseIntoSessionSequence` la riga viene
  riscritta prima di essere scritta in `brainPhrases.txt`; log di frase
  originale, contesto e riga scritta.

### Fase 3: verifica

- [x] TASK-051-09: test su lettura a riga singola, fasi, validazioni e
  fallback; typecheck, lint, suite completa.
- [ ] TASK-051-10: collaudo del Capo Supremo — un'ora con storia curata e
  frasi pubbliche; misura di episodi e righe per ora.

### Fase 4: documentazione

- [x] TASK-051-11: linee guida (una riga = un episodio; righe per ora
  rimisurate; ogni riga deve reggere un episodio intero), `config/README.md`,
  `skills.md`, `working/`.

## 5. 🧪 Validation plan

- `pnpm typecheck`, `pnpm lint`, `pnpm exec vitest run`.
- Collaudo: l'immagine 1 di ogni episodio ha come prompt la riga letterale;
  le frasi pubbliche compaiono riscritte in `brainPhrases.txt`; nessuna frase
  del pubblico manca; tempo fra episodi confrontato con il 17 ottobre.

## 6. ❓ Decisione aperta

- **D3 — Memo di sessione e «Questo sogno».** Oggi, ogni 3–5 storie, Qwen
  scrive tre frasi in italiano che riassumono la serata («memo») e le usa per
  ispirare le storie successive; ogni tanto genera una storia speciale,
  «Questo sogno», che riassume la serata. Entrambi servono solo a scrivere
  storie con Qwen, che spariscono. Proposta: dismetterli.

## 7. 📝 Registro

- 2026-10-19: implementato su «implementa il piano 51». D3 applicata come
  proposta (memo di sessione, memoria lunga del sogno e «Questo sogno» tolti
  dal controller). `generateEpisode` e `rewritePublicPhrase` in
  `coscienzaOnirica.ts`; il controller legge una riga per episodio e inserisce
  in `brainPhrases.txt` la frase del pubblico già riscritta. Vecchia catena
  registrata come DEP-002. Aggiunta mia alle regole date a Qwen, da
  confermare: niente primi piani anche di occhi e labbra (dai log dei troppi
  volti), oltre a mani e dita. 805 test verdi, typecheck e lint verdi.
  Nessuna generazione reale eseguita in sessione.
- 2026-10-19, correzioni del Capo Supremo: (1) ritirata la mia aggiunta
  «niente primi piani di occhi e labbra» dalle regole date a Qwen: restano
  solo mani e dita, come nelle linee guida; (2) D3 non era stata decisa:
  memo di sessione, memoria lunga del sogno e «Questo sogno» ripristinati
  com'erano. «Questo sogno» passa ancora dal percorso storico; proposta di
  compatibilità in attesa di decisione.
- 2026-10-19, collaudo: 0 episodi su 2 con le fasi; Qwen ignorava le tre
  etichette e, in greedy, andava in loop con la stessa risposta: quattro
  immagini uguali. Correzione su disposizione del Capo Supremo: una fase per
  richiesta (`buildEpisodePhasePrompt(line, phaseIndex, written, …)`,
  `parseEpisodePhaseLine`); ogni immagine è la sua fase del sogno e completa
  la frase iniziale con nuovi elementi della stessa scena; fase non valida →
  la Soglia al suo posto; campionamento con penalità di ripetizione per il
  task `scene`. Nessun parametro di generazione immagini toccato. 811 test.

