# Piano di Lavoro: Figure Umane Più Fotografiche/Realistiche

> **ID Piano**: `PIANO-033`
> **Macrotask di Riferimento**: nessuno (nuova richiesta)
> **Data Creazione**: 2026-08-19
> **Stato**: `BOZZA — SOLO PIANO, NON IMPLEMENTATO` (richiesto esplicitamente:
> "fai solo il piano")
> **Autore/Agente**: Agente AI / Sviluppatore

---

## 1. 🎯 Obiettivo del Piano

Le figure umane generate da Brain (SD1.5/UNet locale) risultano troppo
"anime"/stilizzate; lo sviluppatore vuole un aspetto più fotografico/
realistico, **tenendo conto delle performance** — questa sessione ha
lavorato a lungo per ridurre la contesa GPU (step ridotti sotto pressione
reale, cooldown fra generazioni, `MACRO-009` che dimezza il batch UNet
disattivando il CFG). Qualunque leva proposta qui deve essere valutata
esplicitamente contro quel budget, non solo contro la qualità visiva.

## 2. 📋 Diagnosi: Cosa Determina Lo Stile Oggi

- **Il checkpoint SD1.5 in uso è la causa dominante, non il prompt.**
  `src/shared/brain/imageModelManifest.ts:45-87` — modello
  `stablediffusionapi/pornmaster` ("PornMaster SD 1.5 Explicit ONNX",
  `uncensored: true`, `safetyChecker: false`), ~2.02 GiB totali (text
  encoder + UNet + VAE decoder). È un merge semi-realistico orientato a
  contenuti NSFW: tende a una pelle "airbrushed"/CGI e volti stilizzati,
  non a fotografia vera — coerente con la percezione "anime".
- **Il prompt positivo non contiene tag di stile.**
  `buildPsychedelImagePrompt()` (`psichedel.ts:220-257`) concatena solo
  contenuto narrativo (descrizione, stimolo associato, traccia residua,
  argomento principale) — zero tag qualità/stile ("photorealistic",
  "35mm", ecc.).
- **Esiste una politica esplicita anti-riscrittura del prompt**
  (`psichedel.ts:399`, log `promptPolicy: 'testo AI tradotto letteralmente;
  nessuna aggiunta o riscrittura'`) — qualunque tag di stile aggiunto in
  automatico va deciso esplicitamente come eccezione a questa politica,
  non aggiunto silenziosamente.
- **Non esiste un prompt negativo nella pipeline.** `Sd15GenerateOptions`
  (`sd15OnnxWebGpu.ts:48-59`) ha solo `prompt: string`. Il meccanismo di
  classifier-free guidance (`createClassifierFreePromptBatch`, righe
  69-71) userebbe `['', prompt]` (il ramo "unconditional" è sempre stringa
  vuota) — ma **oggi il CFG è disattivato**:
  `brainConfig.ts:67-69` imposta `imageGuidanceMode: 'single-conditional'`
  esplicitamente per **dimezzare il batch UNet** (`MACRO-009`,
  `working/STATE.md` — vincolo esplicito a non alterare questa baseline
  senza un confronto controllato). Con `single-conditional` gira **un solo
  forward UNet per step**; `guidanceScale: 7` nel manifest non viene mai
  applicato.
- Nessun piano precedente in `working/plans/` discute checkpoint o stile —
  non c'è una decisione da rispettare o invertire, il tema è aperto.

## 3. 🔀 Leve Disponibili, In Ordine Di Costo

### A. Cambio checkpoint SD1.5 (consigliata come leva primaria)

- **Costo prestazionale**: **zero aggiuntivo** — stessa architettura
  (UNet/CLIP/VAE stesse shape), stesso numero di step, stesso
  `single-conditional`. Solo un nuovo download/cache (~2 GiB) e
  aggiornamento hash/versione cache (`SD15_MODEL_CACHE`).
- **File da toccare**: `src/shared/brain/imageModelManifest.ts` (nuova
  entry o sostituzione di `PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE`: url dei
  3 componenti, dimensioni, sha256), `src/shared/brain/brainConfig.ts:28-35`
  (`imageModelId`/`imageModelBaseUrl`/`imageModelLocalBaseUrl`),
  `src/shared/brain/imageModelManifest.test.ts` (asserzioni che oggi
  fissano esplicitamente `sourceRepository === 'stablediffusionapi/pornmaster'`
  e `uncensored === true` — da aggiornare consapevolmente).
- **Decisione non solo tecnica**: il checkpoint attuale è esplicitamente
  `uncensored: true`/senza safety checker — una scelta consapevole
  pregressa. Cambiarlo con un checkpoint SD1.5 fotorealistico (es. una
  famiglia tipo "Realistic Vision"/"epiCRealism" o equivalente, stesso
  formato ONNX fp16 con licenza compatibile con l'uso locale) va deciso
  esplicitamente dallo sviluppatore, non assunto — è la leva col maggior
  impatto ma anche l'unica che tocca la policy di contenuto del progetto.
- **Verifica**: confrontare visivamente 8-10 generazioni con lo stesso seed
  prima/dopo su un frame di riferimento, senza toccare step/CFG, per
  isolare l'effetto del solo checkpoint.

### B. Tag di stile nel prompt positivo (leva economica, effetto minore)

- **Costo prestazionale**: zero — è solo testo in più nella stessa singola
  passata UNet.
- **File**: `buildPsychedelImagePrompt()` (`psichedel.ts:220-257`).
- **Tradeoff**: viola la politica esplicita "nessuna aggiunta o
  riscrittura" (riga 399) — da trattare come eccezione dichiarata (es. un
  suffisso fisso tipo "fotografia realistica, dettaglio pelle naturale,
  illuminazione fotografica" aggiunto SEMPRE, distinto dal testo narrativo
  letterale) o da scartare se la politica va rispettata alla lettera.
- Da sola, con l'attuale checkpoint semi-realistico, l'effetto è
  probabilmente modesto — i checkpoint SD1.5 rispondono ai tag di stile
  ma non superano il bias stilistico intrinseco del modello.

### C. Prompt negativo reale via CFG (sconsigliata per ora)

- **Costo prestazionale**: **raddoppia il costo UNet per step** (da 1 a 2
  forward per step, `cfg-batch` invece di `single-conditional`) — annulla
  esattamente l'ottimizzazione `MACRO-009` che questa sessione (e le
  precedenti) hanno protetto esplicitamente. Con `qualitySteps: 24` questo
  raddoppierebbe una delle voci di costo più pesanti della pipeline,
  proprio nell'area su cui si è lavorato di più per ridurre i lag.
  `working/STATE.md` ha un vincolo esplicito a non alterare quella
  baseline senza confronto controllato.
- **File coinvolti se mai attivata**: `createClassifierFreePromptBatch`
  (`sd15OnnxWebGpu.ts:69-71`, oggi hardcoded a `['', prompt]` — andrebbe
  parametrizzato con un vero prompt negativo), `brainConfig.ts:67-69`
  (passare a `imageGuidanceMode: 'cfg-batch'`), più l'aggiunta di
  `negativePrompt` lungo tutta la catena (`Psichedel.generate` →
  `PsychedelImageGenerator.generate` → protocollo worker →
  `Sd15GenerateOptions`).
- **Raccomandazione**: non attivarla come parte di questo cambiamento.
  Se in futuro si vuole valutarla, va proposta come esperimento a sé,
  con confronto A/B controllato sul budget GPU (stessa metodologia già
  usata per `MACRO-009`), non come parte di un fix di stile.

### D. LoRA/adapter (fuori scope)

Nessuna infrastruttura esistente (`grep lora` non trova nulla). Costo di
sviluppo alto, nessun beneficio immediato rispetto a un cambio checkpoint
diretto. Da scartare per questa richiesta.

## 4. ✅ Raccomandazione

**Leva A (cambio checkpoint) come intervento principale**, eventualmente
combinata con **Leva B (tag di stile)** come rifinitura a costo zero, se
lo sviluppatore accetta l'eccezione alla politica "nessuna riscrittura".
**Non toccare la Leva C** (prompt negativo/CFG) — costerebbe esattamente
il tipo di regressione prestazionale che questa sessione ha speso per
eliminare.

## 5. ⚠️ Decisioni Che Servono Dallo Sviluppatore Prima Di Implementare

1. Quale checkpoint SD1.5 fotorealistico usare al posto di
   `stablediffusionapi/pornmaster` (nome/fonte specifico, formato ONNX
   fp16 disponibile, licenza per uso locale) — o se preferisce che lo
   proponga io con 2-3 alternative concrete da valutare.
2. Se `uncensored: true`/assenza di safety checker deve restare invariato
   col nuovo checkpoint o va rivisto insieme al cambio.
3. Se accettare l'eccezione alla policy "nessuna aggiunta o riscrittura"
   del prompt per un suffisso di stile fisso (Leva B).

## 6. 🧪 Piano Di Verifica (quando si passerà all'implementazione)

- `pnpm typecheck`, `pnpm lint`, `pnpm vitest run` (incl.
  `imageModelManifest.test.ts` aggiornato).
- Confronto visivo A/B stesso seed/step/CFG, solo checkpoint cambiato.
- Verifica che `imageGuidanceMode` resti `single-conditional` (nessuna
  regressione del budget GPU) salvo decisione esplicita contraria.
- Verifica dal vivo: tempo di generazione per immagine invariato rispetto
  alla baseline attuale.

---

## 📝 Note

- **2026-08-19**: Creazione del piano su richiesta esplicita ("fai solo il
  piano più performante") — nessuna implementazione eseguita in questa
  sessione.
