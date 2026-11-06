# Piano di Lavoro: Vector Morph — conformità al Protocollo e forme che si muovono davvero

> **ID Piano**: `PIANO-057`  
> **Macrotask di Riferimento**: `MACRO-043`  
> **Data Creazione**: 2026-11-04  
> **Stato**: `BOZZA`  
> **Autore/Agente**: Agente AI / Capo Supremo  

---

## 1. 🎯 Obiettivo del Piano

Richiesta del Capo Supremo, 2026-11-04 (testo originale):

> vohlio un piano serio per migliorare vector mrph

La richiesta non indica un difetto preciso. La direzione di miglioramento è
proposta dall'Ingegneria a partire dai fatti della §2 e va approvata:

1. **Conformità**: togliere da Vector Morph i movimenti che il Protocollo
   Obbligatorio di Verifica Filosofia Visiva vieta (camera, blocchi interi,
   oscillazioni a orologio, residui nel silenzio).
2. **Budget coerente**: far produrre alla vettorializzazione scene che il
   renderer riesce davvero ad animare, invece di scene che due volte su tre
   finiscono nel regime più ridotto.
3. **Pulizia**: rimuovere i criteri della vettorializzazione che non cambiano
   mai l'esito (Divieto di sovrastrutturazione).

Non rientra nel piano la grammatica visiva (opacità del vettoriale, rapporto
col raster, colore): è della Direzione VJ. La §2.4 elenca i punti da portarle.

---

## 2. 📋 Diagnosi

### 2.1 Come funziona oggi (fatti verificati nel codice)

- Il plugin (`brainVectorMorphScene.ts`) mostra il raster a piena opacità e sopra
  il vettoriale al 55%. Con meno di 5 forme la scena viene scartata.
- La vettorializzazione gira in un worker del main (SNIC, con VTracer come
  ripiego) con i parametri `vectorization` di `config/brainRendering.json`
  (`snicMaximumRegions: 72`). Il controllo qualità
  (`brainVectorQuality.ts`) accetta da 5 a 180 forme.
- L'animazione vive in `brainSvgScene.ts` (`createBrainSvgScene`). Classifica la
  scena per peso:
  - **ultra pesante** (≥ 30 forme o SVG ≥ 130.000 caratteri): eco spente, 16
    livelli di profondità, al massimo 10 geometrie deformate;
  - **pesante** (≥ 18 forme o ≥ 65.000 caratteri): 1 eco, 16 livelli, 10
    geometrie;
  - **altre**: fino a 3 eco, 48 livelli, 32 geometrie.
- I tracciati composti, con più di un `M` cioè con fori, non vengono mai
  deformati: si muovono solo come blocco di profondità.
- `createBrainSvgScene` ha due chiamanti: il plugin Vector Morph e un ripiego
  del controller (`brainController.ts:1436`), usato quando manca il raster
  sincronizzato. Le sezioni `motion`, `globalRhythmicMotion` e
  `transformation` di `brainRendering.json` sono lette soltanto da
  `brainSvgScene.ts` (verificato con ricerca testuale).

### 2.2 Dal vivo (log reali dall'8 al 31 ottobre 2026, 72 sessioni)

| Misura | Valore |
|---|---|
| Scene Vector Morph andate a schermo | 346 |
| Forme per scena | minimo 5, mediana 51, massimo 174 |
| Scene **ultra pesanti** | **232 su 346 (67%)** |
| Scene pesanti | 62 (18%) |
| Scene leggere, con il comportamento pieno | 52 (15%) |
| Vettorializzazione | mediana 966 ms, massimo 2.951 ms |
| SVG rifiutati dal controllo qualità | 24: troppe forme 16, meno di 5 forme 8, tracciati insufficienti 8, poca gamma 4 |
| Plugin falliti | 6 |
| Superamenti del budget di frame | 1 (41,9 ms) |
| Ultima scena registrata | 70 forme, `contourRoughness` 0,67 contro un massimo configurato di 0,16, accettata |

**Interpretazione, non verificata a schermo**: in una scena mediana di 51
forme se ne deformano al massimo 10. Le altre restano ferme o si spostano come
blocchi rigidi. Vector Morph lavora quindi quasi sempre nel suo regime più
povero: è la causa più probabile di un renderer che sembra piatto o fermo.

### 2.3 Contrasti con il Protocollo (fatti di codice, effetto a schermo da misurare)

- **Check Camera.** `calculateBrainCameraMotion` produce moti nominati
  `deriva`, `orbita` e `carrello-laterale`. In `brainSvgScene.ts:879-1078`
  vengono applicati a tutti i livelli di profondità nella stessa direzione,
  pesati per profondità: una camera con parallasse, guidata dall'orologio
  (`timeSeconds * 0.055`). Il commento alla riga 883 dice «vietata ogni
  traslazione coordinata del quadro», ma il codice la reintroduce livello per
  livello. Il raster sotto resta fermo, quindi il vettoriale scivola rispetto
  alla sua immagine.
- **Check Camera.** Le eco (`<use>` dell'intera scena, fino a 3) traslano,
  ruotano, scalano e si specchiano come copie intere del quadro, con opacità
  massima 0,18. Oggi sono attive solo nel 33% delle scene, quelle non ultra
  pesanti.
- **Check Beatmatch.** Profondità, microdeformazioni, eco e dissoluzione hanno
  la fase legata a `time`, non a `beatPhase` o `musicalPosition`: sono
  oscillazioni a orologio la cui ampiezza è modulata dall'audio. Senza
  `rhythm` la posizione musicale ripiega su `time / 500`, cioè su un orologio.
- **Check Silenzio.** Restano pavimenti fissi: `depthActivity` vale almeno
  0,025, l'ampiezza della deformazione almeno 0,06 e il micro-moto almeno
  0,025. Quanto si veda in pixel non è misurato.
- **Filosofia §2.2.** Il lavoro cromatico a runtime dovrebbe dipendere dal
  regime bio-percettivo. In Vector Morph il regime scala solo il moto
  (`brainBioLocalMotionScale`); il colore segue la palette della storia e i
  colori del pannello.

### 2.4 Punti da portare alla Direzione VJ (fuori da questo piano)

- Il vettoriale al 55% sopra lo stesso raster a piena opacità: è una scelta di
  grammatica, non un difetto tecnico.
- Il colore del vettoriale secondo il regime bio-percettivo (§2.2): il *come*
  serve da un brief.

---

## 3. 📋 Prerequisiti e Contesto

### File / Moduli Coinvolti

- `src/renderer/output/brain/brainSvgScene.ts` e i suoi test
- `src/renderer/output/brain/brainFrameMotion.ts` (`calculateBrainCameraMotion`,
  solo se D1 lo rende inutilizzato)
- `config/brainRendering.json` (`vectorization`, `motion`, `transformation`)
- `src/main/brainVectorizer.ts` (solo per D5)
- `src/renderer/output/brain/brainVectorMorphScene.test.ts`
- `src/renderer/output/skills.md`, `working/`

### Audit preventivo `working/DEPRECATED.md`

- `DEP-001 — NON COINVOLTO`: l'80/20 programma i passaggi al confine della
  storia e non tocca la grammatica di un renderer.
- `DEP-002 — NON COINVOLTO`: testo e storie non vengono toccati.

### Decisioni da approvare

- **D1 — Togliere la camera finta.** Rimuovere `cameraParallax` e
  `cameraTravel` dai livelli di profondità. Ogni livello conserva il proprio
  moto con fase differenziata. Proposta.
- **D2 — Togliere le eco a quadro intero.** Le copie dell'intera scena
  violano il Check Camera e sono già spente in due scene su tre. Proposta:
  rimozione completa, con `maxEchoLayers` e i parametri che usano solo loro.
- **D3 — Fase dal beat, non dall'orologio.** In profondità, micro-moto e
  dissoluzione sostituire `time` con la fase musicale già disponibile
  (`liquidMotion.beatPhase`, `musicalPosition`). Senza ritmo la fase si ferma
  invece di ripiegare su `time / 500`. Proposta.
- **D4 — Silenzio a zero.** Togliere i pavimenti 0,025 / 0,06 / 0,025, così
  che in silenzio il moto geometrico sia nullo e l'immagine resti ferma e
  visibile. Proposta.
- **D5 — Budget allineato alla fonte.** Si regola la vettorializzazione, non
  il renderer: si abbassa `snicMaximumRegions` finché la maggior parte delle
  scene esce dal regime ultra pesante. Obiettivo proposto: almeno l'80% delle
  scene sotto 30 forme. Il valore esatto si misura in Fase 1 sui raster
  archiviati, non si sceglie a occhio. Alzare invece i limiti del renderer
  costerebbe CPU durante l'inferenza UNet. Proposta.
- **D6 — Criteri che non decidono.** `maximumContourRoughness` (0,16) convive
  con scene accettate a 0,67. Se la Fase 1 mostra che rugosità e penalità
  sugli spigoli non cambiano mai la scelta del profilo, vanno rimosse, non
  tarate (Divieto di sovrastrutturazione). Decisione dopo la misura.
- **D7 — Ripiego del controller.** Il ripiego di `brainController.ts:1436` usa
  la stessa scena SVG e cambierà insieme a Vector Morph. Non è un plugin, ma
  la regola di autonomia chiede di segnalarlo. Proposta: accettarlo, perché è
  lo stesso renderer vettoriale storico. In alternativa la scelta resta al
  Capo Supremo.

### Fuori dal piano

- Grammatica: opacità 55%, colore, rapporto col raster (§2.4).
- Tracciati con fori non deformabili: si misura quanti sono (Fase 1); un
  eventuale intervento è un piano successivo.
- Nessun nuovo segnale, nessuna nuova analisi del raster, nessuna nuova
  impostazione o controllo UI.

---

## 4. ⚠️ Regole e Vincoli di Sviluppo (da `agents.md`)

- [x] Audit dei deprecati completato prima di definire le modifiche.
- [ ] Nessun cambiamento a `backgroundThrottling`, permessi media, DevTools.
- [ ] `lowPowerMode` resta con i suoi budget ridotti.
- [x] **Divieto di sovrastrutturazione**: solo rimozioni e taratura di un
      parametro esistente; D6 rimuove invece di aggiungere.
- [x] **Autonomia dei renderer**: si tocca solo codice e configurazione letti
      da Vector Morph (e dal ripiego, D7). Nessun altro renderer importa
      `createBrainSvgScene`: gli altri ne importano soltanto i tipi.
- [ ] **Camera**: D1 e D2.
- [x] **Materia**: il raster resta il livello di base; la reattività resta
      nelle forme.
- [ ] **Silenzio**: D3 e D4, verificati da test.
- [ ] **Beatmatch**: D3.
- [x] **Transizione**: il morph fra forme in ingresso (`matchCounterparts`) non
      cambia.
- [x] **Costo**: D2 toglie lavoro; D5 sposta forme dalla parte ferma a quella
      animata dentro i budget esistenti (10/18/32 geometrie).

---

## 5. 🛠️ Fasi di Implementazione e Checklist Task

### Fase 1: Misura, prima di toccare

- [ ] **TASK-057-01**: test che misura lo spostamento massimo dei punti di
      `createBrainSvgScene` in silenzio, senza ritmo, per 10 s simulati.
      Stabilisce il dato di partenza per D4.
- [ ] **TASK-057-02**: passare un campione di raster archiviati
      (`dreamImageArchive`, almeno 40) nel vettorializzatore con il
      `snicMaximumRegions` attuale e con 2–3 valori più bassi. Per ognuno:
      distribuzione delle forme, quota di scene sotto 30, quota di tracciati
      con fori, rifiuti del controllo qualità, durata. Script in scratchpad,
      nessun codice nuovo nel repository.
- [ ] **TASK-057-03**: sullo stesso campione verificare se rugosità e
      penalità sugli spigoli cambiano mai il profilo scelto (D6).

### Fase 2: Conformità al Protocollo (`brainSvgScene.ts`)

- [ ] **TASK-057-04**: D1, togliere camera e parallasse coordinata dai livelli.
- [ ] **TASK-057-05**: D2, rimuovere eco e parametri usati solo da loro.
- [ ] **TASK-057-06**: D3, fase da beat e posizione musicale; senza ritmo
      nessun ripiego sull'orologio.
- [ ] **TASK-057-07**: D4, togliere i pavimenti; il test di TASK-057-01 deve
      dare spostamento nullo.

### Fase 3: Budget (`brainRendering.json`, eventualmente `brainVectorizer.ts`)

- [ ] **TASK-057-08**: D5, nuovo `snicMaximumRegions` dal valore misurato in
      TASK-057-02.
- [ ] **TASK-057-09**: D6, rimuovere i criteri che non decidono, se la misura
      lo conferma.

### Fase 4: Documentazione

- [ ] **TASK-057-10**: aggiornare la skill di Vector Morph in
      `src/renderer/output/skills.md` e i commenti superati in
      `brainSvgScene.ts`. Chiudere o assorbire TASK-012-05.

### Fase 5: Verifica, Test e Build

- [ ] **TASK-057-11**: `pnpm typecheck`, `pnpm lint`, suite completa,
      `pnpm build`.
- [ ] **TASK-057-12**: collaudo del Capo Supremo a schermo.

---

## 6. 🧪 Strategia di Verifica e Validation Plan

- **Comandi di Test**:
  - `pnpm exec vitest run src/renderer/output/brain/brainVectorMorphScene.test.ts`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm build`
- **Verifica automatica**:
  - in silenzio e senza ritmo, spostamento dei punti nullo;
  - nessuna trasformazione comune a tutti i livelli;
  - a parità di ingresso audio la fase dipende dalla posizione musicale, non
    dal tempo trascorso.
- **Verifica dai log**, almeno 30 minuti con musica:
  - quota di scene sotto 30 forme vicina all'obiettivo di D5;
  - rifiuti del controllo qualità non aumentati;
  - superamenti del budget di frame non aumentati.
- **Verifica manuale del Capo Supremo**, in fullscreen:
  - il vettoriale non scivola rispetto al raster;
  - in silenzio l'immagine è ferma e visibile;
  - sul beat si muovono più forme di prima, con fasi diverse;
  - in `lowPowerMode` il comportamento resta stabile.

---

## 7. 📝 Note e Registro Avanzamento

- **2026-11-04**: creazione del piano. Audit deprecati: DEP-001 e DEP-002
  `NON COINVOLTO`. D1–D5 e D7 attendono approvazione; D6 attende la misura
  della Fase 1.
