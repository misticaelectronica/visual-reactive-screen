# BRIEF INGEGNERIA — Gate di qualità immagine per PsicoFantasma

**Destinatari:** Consigliere del Capo Supremo, Capo Supremo degli Ingegneri
**Mittente:** Ingegneria
**Data:** 2026-09-08
**Riferimenti:** `MACRO-034`, `PIANO-043` (voce proposta `034-20`);
brief Visual definitivo `team/briefs/brief-psicofantasma-visual-definitivo.md`
**Stato:** proposta di piano. Richiede autorizzazione prima di implementare.

---

## 1. Disposizione del Capo Supremo

Durante la revisione a schermo del 2026-09-08, oltre alla presenza residente
della regione (già applicata, `034-19`), il Capo Supremo ha disposto un gate
di qualità sull'immagine su cui PsicoFantasma può girare.

Prima formulazione: «sulle immagini a bassa risoluzione non può girare;
quando gira, devono ruotare solo raster ad alta qualità». Dopo aver visto la
tabella delle modalità di resa (§3), il Capo Supremo ha **precisato**:

> **PsicoFantasma non può girare sui fotogrammi `interlude`. Su tutti gli
> altri (`standard`, `enhanced`, `high-quality`) sì.**

Quindi non è un gate «solo alta qualità»: è l'esclusione della **sola
categoria più povera**. Due requisiti accoppiati:

- **R1 — Gate d'ingresso.** PsicoFantasma non viene mai attivato quando il
  fotogramma corrente è `interlude` (o non ha un `raster`, cioè fallback SVG).
- **R2 — Rotazione sotto il renderer.** Finché PsicoFantasma permane in scena
  (2–3 fotogrammi consecutivi), nessun fotogramma `interlude` deve scorrergli
  sotto. In pratica: se un downgrade sotto pressione porterebbe un fotogramma
  dell'hold a `interlude`, PsicoFantasma cede quel fotogramma.

## 2. Perché la soglia è `interlude` e non più in alto

PsicoFantasma è l'unico renderer Brain la cui identità dipende dalla
**materia del raster dentro la figura** e da un'**analisi di forma a livello
di pixel**:

- `extractPsicoFantasmaRegions` risolve la maschera figura/fondo al pixel
  (split di luminanza, due passate box-blur+soglia, componente connessa,
  contorno Moore-neighbour + Douglas–Peucker). Con soli **4 step di
  denoising** (`interlude`) la massa esce sfaldata e piena di grana: il
  contorno si squadra e la coerenza strutturale crolla — proprio il difetto
  «bordi a scala» che `034-16` ha corretto lato analisi ma che un input a 4
  step reintroduce a monte. A **8 step** (`standard`) il raster è già
  abbastanza coerente perché l'analisi regga: per questo il Capo Supremo lo
  ammette.
- Il crop CLIP 224² viene ricavato dallo stesso raster: a 4 step gli
  embedding sono rumorosi e sale il tasso di match spurî al limite del gate.
- La grammatica Visual (§22–23 «emersione», §33 «la separazione è ottica»)
  chiede **sfondo sfocato + figura nitida**. A 4 step la figura di partenza è
  già molle: non esiste il contrasto nitido/sfocato che regge il renderer.

Gli altri renderer (Deliquescence, Filter-Psiche, Psycho2D…) tollerano bene
anche `interlude` perché lo dissolvono, lo filtrano o lo astraggono.
PsicoFantasma no: lo **osserva**.

## 3. Il tag di qualità esiste già — questo brief lo legge, non lo crea

- **`ImageRenderMode = 'standard' | 'interlude' | 'enhanced' | 'high-quality'`**
  (`psychedelImageGenerator.ts` / `brainImageWorkerProtocol.ts`). La modalità
  è decisa **per fotogramma** in `psichedel.ts`:
  `HighQualityRenderScheduler.next()` promuove un fotogramma a `high-quality`
  ogni 2–5; `selectLowQualityFrameIndices` marca 1–2 fotogrammi per storia
  come «leggeri» (`standard`), incluso **sempre** l'ultimo — l'«eco» della
  struttura onirica; `downgradeModeUnderPressure` abbassa la modalità sotto
  pressione reale, ed è **l'unico percorso** che porta un fotogramma di
  storia a `interlude`.
- **Step di denoising e geometria d'inferenza** (default
  `brainRenderingConfig.ts` + `brainImageWorkerClient.ts`):

  | modalità | step | geometria d'inferenza |
  |---|---|---|
  | `interlude` | 4 | 448 × 256 |
  | `standard` | 8 | 448 × 256 |
  | `enhanced` | 12 | 512 × 320 |
  | `high-quality` | 20 | piena (config immagine) |

- **La modalità è già propagata fino al controller.** Il preview emesso da
  `psichedel.ts` porta `mode: ImageRenderMode` ed è già letto in
  `brainController.ts` (`preview.mode === 'high-quality'` …).
- **Ciò che manca:** la modalità **non arriva al renderer né al selettore**.
  `PsychedelScene` porta solo `frameId`, `description`, `svg`, `raster?`;
  `BrainRendererPluginContext` porta `scene`, `raster`, `frameEnergy`,
  `frameIndex`, `frameCount` — nessun campo di modalità. Va aggiunto un
  campo additivo (es. `frameRenderMode: ImageRenderMode`) e propagato da
  `psichedel.ts` → `PsychedelScene` → `brainController.applyFrame` →
  contesto plugin.
- **Eleggibilità del renderer.** `brainRendererSelector.ts`
  (`excludedForRegime`) esclude già `psicofantasma` quando
  `isPsicoFantasmaBundled()` è falso. È il punto naturale dove aggiungere il
  secondo motivo di esclusione «fotogramma `interlude`», senza toccare i pool
  per regime (`LOW_REGIME_RENDERERS`, `HIGH_REGIME_*`) né la dominanza 95%
  di DELIQUESCENCE nel Respiro Profondo.
- **Permanenza.** `selectBrainRendererHoldFrames` /
  `PERSISTENT_STORY_RENDERERS`: PsicoFantasma tiene 2–3 fotogrammi. Il
  crossfade fra fotogrammi è quello ESTERNO di `brainController.ts`
  (6–9 s), l'host viene ricreato a ogni fotogramma.

## 4. Definizione di «idoneo»

**Idoneo ≡ `frameRenderMode !== 'interlude'` e `raster` presente.**
Nessuna soglia in pixel, nessun campo nuovo oltre alla propagazione di
`frameRenderMode`. Non idonei: `interlude` e il fallback SVG senza `raster`.

## 5. Opzioni di implementazione

### Opzione A — Gate puro (raccomandata)

1. Propagare `frameRenderMode` fino a selettore e contesto plugin (§3).
2. In `excludedForRegime`: `psicofantasma` non eleggibile se il fotogramma
   corrente è `interlude` o senza `raster`.
3. Durante l'hold, se il fotogramma successivo risulta `interlude` (solo via
   `downgradeModeUnderPressure`), il selettore avanza il mazzo con il
   meccanismo già esistente `reportRendererFailure` / `onRendererFailed`:
   PsicoFantasma cede quel fotogramma, senza passthrough bloccato.

- **Pro:** minima; **nessun** costo di generazione aggiuntivo; nessuna
  modifica allo scheduler o a `selectLowQualityFrameIndices`; `interlude` su
  un fotogramma di storia è già raro (solo pressione reale), e sotto
  pressione reale PsicoFantasma è comunque escluso
  (`HEAVY_RENDERERS_UNDER_PRESSURE`) — quindi R2 nella pratica quasi non
  morde.
- **Contro:** nei rari casi di downgrade a metà hold, PsicoFantasma perde un
  fotogramma della permanenza. Accettabile: è lo stesso comportamento di un
  renderer che fallisce il proprio QC interno.

### Opzione B — Gate + blocco del downgrade a `interlude` durante l'hold

Come A, ma `downgradeModeUnderPressure` non scende sotto `standard` per i
fotogrammi appartenenti a un hold di PsicoFantasma già prenotato (il mazzo è
deciso prima della generazione della storia).

- **Pro:** preserva l'intera permanenza 2–3 anche sotto pressione.
- **Contro:** tocca la pipeline immagine e il percorso di pressione; contende
  step di denoising proprio quando il sistema li sta tagliando. Ingegneria la
  sconsiglia: contraddice il motivo per cui il downgrade esiste.

### Opzione C — Upscale/denoise locale del fotogramma `interlude`

PsicoFantasma resta escluso all'ingresso su `interlude`, ma per un
`interlude` che cade a metà hold applica un denoise/upscale locale del raster
**dentro il proprio modulo** invece di cedere il fotogramma.

- **Pro:** conserva la permanenza senza rigenerare.
- **Contro:** a 4 step non c'è dettaglio da recuperare; il crop CLIP
  resterebbe debole. Solo come ultima risorsa in low power, non come
  meccanismo principale.

## 6. Raccomandazione

**Opzione A.** Il gate è un secondo predicato di esclusione in
`excludedForRegime` più la propagazione di `frameRenderMode`. Nessun costo
GPU, nessun tocco alla pipeline immagine, riuso completo dei meccanismi di
cessione fotogramma già esistenti.

## 7. Decisioni richieste al Consigliere

1. Confermare la soglia: escludere **solo `interlude`** (disposizione del
   Capo Supremo del 2026-09-08), non anche `standard`.
2. Opzione A (raccomandata), B o C per il caso «downgrade a `interlude` a
   metà hold».
3. Selezione manuale da tendina: oggi **ignora** le esclusioni di regime —
   deve ignorare anche questo gate (mostrando emersione/osservazione anche su
   un `interlude`) o no? Proposta: la selezione manuale ignora il gate, con
   indicazione nel pannello, coerente con `034-15`.

## 8. Impatti dichiarati

- **Pool per regime e dominanza DELIQUESCENCE:** invariati. Il gate è un
  secondo motivo di esclusione in `excludedForRegime`, non un ri-ranking.
- **Autonomia dei renderer** (`agents.md`): nessuna analisi importata.
  `frameRenderMode` è un dato di contesto propagato dall'host, non
  un'analisi condivisa. Un eventuale upscale (Opzione C) vive nel modulo
  PsicoFantasma.
- **Contratto plugin:** aggiunta additiva di `frameRenderMode: ImageRenderMode`
  a `PsychedelScene` / `BrainRendererPluginContext`, propagata da
  `brainController.applyFrame`.
- **Costo di generazione:** nullo in Opzione A.
- **Silenzio, camera, transizioni, Panic, background throttling, low power,
  microfono, DevTools:** non toccati.

## 9. Verifica filosofia (5 punti, `agents.md`)

- **Camera:** nessun effetto sull'inquadratura.
- **Materia:** il gate *protegge* la materia del raster — è il suo scopo.
- **Silenzio:** il gate agisce alla selezione, mai durante la resa; il
  congelamento nel silenzio resta invariato.
- **Beatmatch:** nessun nuovo segnale audio; ortogonale al ritmo.
- **Transizione:** si riusa il crossfade esterno dell'host; se PsicoFantasma
  cede un fotogramma, avanza il mazzo con `reportRendererFailure`, senza
  passthrough bloccato.

## 10. Validation Plan proposto

`pnpm typecheck`, `pnpm lint`, Vitest mirati (`brainRendererSelector`,
`brainPsicoFantasmaCanvas`), `pnpm build`. Test: `frameRenderMode` propagato
end-to-end; selezione negata su `interlude` e su fotogramma senza `raster`;
cessione pulita del fotogramma su downgrade a `interlude` a metà hold;
selezione manuale non filtrata; nessun impatto sulla quota DELIQUESCENCE su
~200–300 storie simulate.

---

Firmato: il Capo Supremo degli Ingegneri.
