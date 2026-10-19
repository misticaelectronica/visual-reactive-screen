# Piano di Lavoro: Visual Plan e quattro fasi oniriche

> **ID Piano**: PIANO-046
> **Macrotask**: MACRO-036
> **Data**: 2026-09-18
> **Stato**: IN_PROGRESS — pipeline reintegrata, collaudo visivo dal vivo residuo
> **Autore**: Ingegneria

## 1. Obiettivo

Chiudere il lavoro residuo di PIANO-045 (TASK-045-05): far sì che le quattro
immagini appartengano davvero alla stessa storia immaginativa (Soglia →
Metamorfosi → Condensazione → Eco), non a quattro prompt quasi indipendenti.
Lettera di riferimento: brief del Vice Consigliere, 21 sezioni, 2026-09-18.

## 2. Contesto e audit

Letti STATE, macrotasks, PIANO-045, `dreamRevisionCycle.ts` (dove
`OneiricPhase`/`deriveOneiricPhase` esistevano già, usati solo dal ciclo di
Riattivazione). Verificato con `Explore`: `generateVisualPlan()` esisteva ma
non era mai chiamata in produzione; i 4 prompt nascevano da
`splitIntoFourMoments()` (segmentazione meccanica per frasi); nessun
invariante persistente; il prompt raster concatenava momento corrente +
stimolo associato + residuo del fotogramma precedente + argomento generale;
la palette veniva riestratta per singolo fotogramma (`story.id:frame.id`); la
qualità/denoising dipendeva da uno scheduler probabilistico session-wide
(`HighQualityRenderScheduler` + `selectLowQualityFrameIndices`), scollegato
dal ruolo narrativo del fotogramma.

## 3. Regole

- [x] Camera, materia, silenzio, beat e transizioni: nessun cambio ai renderer.
- [x] Nessun nuovo enum: riuso di `OneiricPhase`/`deriveOneiricPhase` già
  esistenti per il ciclo di Riattivazione.
- [x] Checkpoint invariato; nessun img2img/latent sharing/ControlNet/nuovo
  classificatore introdotto (fuori perimetro §19 della lettera).
- [x] `buildColorDirectionBlock` non cambia firma (test `arity === 1`
  deliberato — solo la seed key passata dal chiamante cambia).
- [x] Preservare i meccanismi di sicurezza GPU esistenti
  (`downgradeModeUnderPressure`, disattivazione alta qualità dopo OOM).

## 4. Fasi

- [x] TASK-046-01: invariante della storia, estratto dal modello con fallback
  locale (`inferInvariant`), mai un fallimento della storia solo per la sua
  assenza.
- [x] TASK-046-02: `generateVisualPlan()` reintegrata nella pipeline
  produttiva reale, progetta i 4 momenti per fase onirica prima della
  generazione raster; fallback su `splitIntoFourMoments` se rifiutata/non
  disponibile.
- [x] TASK-046-03: prompt raster semplificato a momento-corrente +
  invariante; rimossi stimolo associato, residuo del fotogramma precedente,
  argomento generale. Palette Color Direction seedata sulla storia.
- [x] TASK-046-04: qualità/denoising deterministici per fase (Soglia e
  Condensazione → profilo alta qualità; Metamorfosi ed Eco → profilo
  intermedio); rimosso lo scheduler probabilistico. Log del tipo di
  immagine/profilo in basso a destra.
- [ ] TASK-046-05: collaudo visivo reale a 4 storie e confronto controllato
  di risoluzione 512×512 — richiede l'app Electron/WebGPU dal vivo.

## 5. Costo GPU dichiarato

Con TASK-046-04 ogni storia genera sempre 2 fotogrammi a `high-quality`
(Soglia + Condensazione) invece della vecchia media probabilistica
(~1 ogni 2-5 disegni sull'intera sessione). Aumento di costo reale e
intenzionale, richiesto esplicitamente dalla lettera (Soglia e Condensazione
"obbligatoriamente forti"). Le uniche valvole di sicurezza rimaste sono
pressione GPU reale e disattivazione dopo OOM (`highQualityAvailable`) — non
introdotto un nuovo throttling. Da verificare nel collaudo dal vivo (TASK-046-05)
se il costo aggiuntivo è accettabile in sessione prolungata/`lowPowerMode`.

## 6. Validation Plan

`pnpm typecheck`, `pnpm lint`, suite completa (`pnpm test`, 77 file / 716
test) — tutti verdi. Nessuna verifica visiva WebGPU reale eseguita
dall'Ingegneria in questa sessione (nessun Electron/GPU disponibile):
il collaudo a 4 storie (Soglia/Metamorfosi/Condensazione/Eco) e il confronto
512×512 restano da eseguire dal vivo (procedura già usata in PIANO-045:
stessa storia/Visual Plan/prompt/invariante/seed/checkpoint/parametri di
inferenza, isolando solo la geometria).

## 7. Registro

2026-09-18: apertura su lettera del Vice Consigliere (21 sezioni). Esplorato
il codice esistente con due agenti `Explore` in parallelo (pipeline
Visual Plan/quattro momenti; profili qualità/denoising e log). Trovato
`OneiricPhase`/`deriveOneiricPhase` già pronti in `dreamRevisionCycle.ts` —
riusati come vocabolario condiviso invece di introdurre un enum duplicato.

Implementato: `DreamStory.invariant`; riga `INVARIANT(E):` nel prompt storia
(nativo e tradotto) con parsing `labeledBlock` e fallback `inferInvariant`;
`generateVisualPlan(synopsis, invariant)` riscritta con istruzioni esplicite
per fase (Soglia fonda, Metamorfosi trasforma, Condensazione è il punto di
massima densità concettuale, Eco è il ritorno deformato) e richiamata in
`CoscienzaOnirica.generate()` con fallback a `splitIntoFourMoments` se
rifiutata; `buildPsychedelImagePrompt` semplificato (momento + invariante +
Color Direction seedato su `story.id`); `frameRenderModeForPhase` sostituisce
`HighQualityRenderScheduler`/`selectLowQualityFrameIndices` (rimossi, col
relativo parametro del costruttore `Psichedel`); dataset
`framePhase`/`frameQualityProfile` su `applyFrame` (`brainController.ts`),
letto e mostrato in `OutputApp.tsx`.

Aggiornati i test esistenti che assumevano il comportamento precedente
(prompt con stimolo associato/residuo/argomento generale, scheduler
probabilistico) — nessun test rimasto a testare codice rimosso. Un
comportamento preesistente è stato esposto (non introdotto) dalla
determinizzazione: un fallimento infrastrutturale (es. backend WebGPU
assente) sul primo fotogramma (Soglia, sempre alta qualità) ottiene un
tentativo di retry in più prima di essere riconosciuto come tale, perché il
ramo di retry dedicato all'alta qualità non distingue un errore
infrastrutturale da uno di memoria — comportamento preesistente al codice
toccato, lasciato invariato e solo documentato nel test corrispondente.

Suite 77 file / 716 test, typecheck e lint verdi. Nessuna generazione raster
reale eseguita (niente Electron/GPU in questa sessione) — TASK-046-05
(collaudo visivo + confronto 512×512) resta aperto e richiede il Capo
Supremo dal vivo.
