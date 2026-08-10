# Piano di Lavoro: Modalità Grafica Ultra-Leggera Durante Il Denoising

> **ID Piano**: `PIANO-010`  
> **Macrotask di Riferimento**: `MACRO-009`  
> **Data Creazione**: 2026-08-10  
> **Stato**: `COMPLETATO COME PROTEZIONE VISIVA — NON SOLUZIONE LATENZA`  
> **Autore/Agente**: Codex / Sviluppatore  

---

## 1. Obiettivo Del Piano

Verificare se i blocchi residui del denoising WebGPU dipendono dalla contesa
con i plugin Brain. Durante `imageInferenceActive`, il Renderer Host riduce le
chiamate `update()` del plugin a 5 FPS (3 in low power) e mostra una matrice
serigrafica 1-bit del raster corrente preparata una sola volta. Tre densità
precalcolate rispondono a `lowMid`; beat/`low` produce una breve inversione e
`mid`/`high` pochi disallineamenti orizzontali, senza filtri pixel nel RAF.

La prova prestazionale ha mostrato che il passthrough costa 0–0,2 ms ma non
riduce il lavoro atomico UNet: i gap restano circa 250–525 ms. Viene conservato
per esplicita decisione artistica come protezione visiva durante lo stallo, non
come soluzione della contesa hardware.

---

## 2. Prerequisiti E Contesto

- `src/renderer/output/brain/brainController.ts` possiede già
  `imageInferenceActive` e lo inoltra come pressione grafica.
- `src/renderer/output/brain/brainRendererHost.ts` è l'unico regista dei
  plugin Print2D, Psycho2D e Vector Morph.
- Il ramo UNet batch 1 resta attivo e la geometria resta 448×256.
- La palette narrativa corrente è già disponibile nel contesto del Renderer
  Host; i colori del preset selezionato arrivano attraverso `AppSettings`.

File previsti:

- `src/shared/brain/brainConfig.ts`
- `src/renderer/output/brain/brainRendererHost.ts`
- `src/renderer/output/brain/brainDenoisingPassthrough.ts`
- `src/renderer/output/brain/brainPerformanceMetrics.ts`
- test mirati dei moduli precedenti

---

## 3. Regole E Vincoli Di Sviluppo

- [x] Non modificare `backgroundThrottling`, switch Chromium, IPC o audio.
- [x] Non modificare UNet, seed, step, scheduler, geometria o prompt.
- [x] Non distruggere o ricreare il plugin durante l'inferenza; mantenerne un
  movimento attenuato a cadenza ridotta.
- [x] Conservare `lowPowerMode` e ridurre ulteriormente il frame rate leggero.
- [x] Mantenere stabile la camera globale; nessun movimento o taglio del
  raster durante il passthrough.
- [x] In silenzio il movimento deve diventare quasi nullo.
- [x] Preservare opacità e fade esterni applicati dal controller Brain.
- [x] Nessun DevTools o overlay diagnostico permanente.

---

## 4. Fasi Di Implementazione

### Fase 1: Renderer Passthrough

- [x] Preparare una sola volta il raster corrente a 320×180 e tre varianti
  serigrafiche a due inchiostri derivate da palette narrativa e preset.
- [x] Eliminare zone cromatiche e forme geometriche dal loop di sospensione.
- [x] Derivare densità, inversione e micro-glitch da `lowMid`, beat/`low` e
  transienti `mid`/`high`.
- [x] Applicare frame pacing dedicato e variante più lenta in `lowPowerMode`.

### Fase 2: Integrazione Nel Renderer Host

- [x] Attivare la modalità attraverso il segnale esistente di inferenza.
- [x] Ridurre `update()` del plugin a 5 FPS, o 3 FPS in low power, soltanto
  quando il passthrough è pronto.
- [x] Conservare istanze, stato, pattern e transizioni dei plugin.
- [x] Usare un crossfade breve in ingresso; riprendere il plugin sul clock
  corrente alla fine dell'inferenza.
- [x] Rinviare i cambi plugin mentre il passthrough è attivo.

### Fase 3: Metriche E Validazione

- [x] Distinguere nei `[BrainMetrics]` frame plugin e passthrough, includendo il
  costo CPU del disegno leggero.
- [x] Aggiungere test di moto, silenzio, sospensione, ripresa e cleanup.
- [x] Eseguire test completi, typecheck, lint mirato, build e diff-check.
- [x] Eseguire una produzione live di quattro immagini con plugin visibile.
- [x] Registrare l'esito negativo sulla latenza e mantenere il passthrough
  esclusivamente come protezione visiva richiesta.

---

## 5. Validation Plan

```bash
pnpm test -- --run
pnpm typecheck
pnpm exec eslint <file coinvolti>
env -u NODE_OPTIONS pnpm exec vite build
git diff --check
```

Verifica live:

1. confermare nei log `denoising-passthrough: active`;
2. completare quattro immagini con Print2D o altro plugin già visibile;
3. estrarre gap RAF soltanto fra inizio e fine inferenza;
4. verificare `denoisingPassthrough.frames` e `renderMs`;
5. controllare continuità del fade, movimento musicale e ripresa del plugin;
6. rimuovere l'esperimento se il massimo ricorrente resta oltre 150 ms.

---

## 6. Registro

- **2026-08-10**: piano creato dopo approvazione della qualità batch 1 e
  conferma manuale che i blocchi residui restano fastidiosi.
- **2026-08-10**: implementazione completata e validata con 34 file/223 test,
  typecheck, lint mirato, build Vite e diff-check. Il primo avvio di prova è
  stato fermato senza inferenza perché l'Output non è stato aperto; resta il
  confronto live, senza conclusioni prestazionali anticipate.
- **2026-08-10**: su feedback visivo rimossi i quattro tagli raster. Il
  passthrough usa ora soltanto zone di colore della palette narrativa fuse con
  il preset globale corrente e flash audio-reattivi limitati. Validazione
  aggiornata: 34 file/224 test, typecheck, lint mirato, build e diff-check.
- **2026-08-10**: precisato il comportamento visivo: il raster corrente resta
  riconoscibile, il movimento originale continua attenuato a 5/3 FPS e le zone
  cromatiche trasparenti attraversano l'immagine senza sostituirla.
- **2026-08-10**: prova live conclusa: costo passthrough 0–0,2 ms, gap UNet
  250–525 ms. Successiva revisione artistica: eliminate le zone cromatiche e
  introdotte tre matrici 1-bit precompute con inversione e micro-glitch.
