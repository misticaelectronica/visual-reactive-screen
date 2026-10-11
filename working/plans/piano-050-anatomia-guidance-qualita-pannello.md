# Piano di Lavoro: Anatomia dei corpi, guidance, qualità e pannello di controllo

- **ID**: PIANO-050 (MACRO-038)
- **Data**: 2026-10-11
- **Stato**: DONE — collaudo superato dal Capo Supremo (2026-10-11), rilasciato in 1.0.0-rc.10
- **Disposizione**: Capo Supremo, 2026-10-11 — «i corpi delle donne e delle
  persone, ma delle donne soprattutto, non possono essere deformi così nelle
  immagini generate».

## 1. 🎯 Obiettivo del Piano

Ridurre le deformazioni anatomiche dei corpi nei raster generati da Brain e
rendere governabili da pannello il negative prompt e il livello di qualità.
Riordinare leggermente la Control Window per usabilità.

## 2. 📋 Prerequisiti e Contesto

Fatti verificati nel codice:

- `BRAIN_CONFIG.imageGuidanceMode` è `single-conditional` (MACRO-009): un solo
  forward UNet per step, nessuna classifier-free guidance, `guidanceScale` del
  manifest mai applicato. Senza guidance SD 1.5 non tiene la coerenza
  anatomica.
- Il ramo non condizionato della CFG è fisso a stringa vuota: un negative
  prompt oggi non avrebbe effetto.
- Il checkpoint attivo nel codice è PornMaster (`brainConfig.ts`, manifest,
  hash SHA-256 dei pesi verificati su disco). La sostituzione con Realistic
  Vision descritta in `skills.md`/`docs/psychedel-explicit-v1.md` non risulta
  in nessun commit del codice.
- La prova CFG di PIANO-045 misurava la fedeltà alla storia, non l'anatomia.

Decisioni del Capo Supremo (2026-10-11):

- negative prompt anatomico, modificabile da UI;
- livelli di qualità `low` / `mid` / `high` selezionabili; default `low` con
  10 step enhanced e 14 high-quality, più un valore intermedio;
- scala di guidance a discrezione dell'implementazione se coerente con la
  filosofia di Brain;
- pannello di controllo da riordinare leggermente.

## 3. ⚠️ Regole e Vincoli di Sviluppo (da `agents.md`)

- **Audit deprecati**: DEP-001 (Alternate with Brain 80/20) `MANTENERE` —
  ragione e criterio di uscita invariati (compatibilità delle impostazioni
  salvate). Il controllo resta nella Control Window, spostato nel riquadro
  «Avanzate» con lo stesso comportamento; il titolo del riquadro segnala
  quando è attivo. Nessuna estensione.
- **Camera / Materia / Silenzio / Beatmatch / Transizione**: non toccati; la
  modifica cambia solo la qualità del raster generato, non il moto a runtime.
- **Costo**: la CFG raddoppia il batch UNet per step. Compensazione: il
  livello `low` (default) abbassa gli step (enhanced 16→10, high-quality
  24→14, standard 12→8). L'interludio resta a ramo singolo (fotogrammi
  eco/transizione a bassa risoluzione, mai pensati per la leggibilità del
  corpo). `high` riproduce gli step di `config/brainRendering.json`.
- **Explicit V1**: il negative prompt contiene soltanto difetti anatomici;
  nessun termine su nudità, contenuto o abbigliamento.
- **Sovrastrutturazione**: si riusa la CFG già implementata (`cfg-batch`), non
  si aggiunge un meccanismo nuovo.
- **Scala di guidance 7**, quella del manifest (disposizione del Capo
  Supremo 2026-10-11). Criterio: coerenza dei corpi, non colore —
  filosofia.md §2.2 esclude ogni ingerenza cromatica sulla generazione.
  Una prima stesura usava 5,5 motivandolo col colore e attribuendo a §2.2
  un contenuto che non ha; ritirata lo stesso giorno.

## 4. 🛠️ Fasi di Implementazione e Checklist Task

### Fase 1: Generazione

- [x] TASK-050-01: `AppSettings.brainImageQuality` e
  `AppSettings.brainNegativePrompt` con default, normalizzazione e test.
- [x] TASK-050-02: resolver unico step/guidance per modo e livello
  (`brainImageGeneration.ts`), usato dal worker client e dal generatore
  in-thread; impostazioni aggiornate dal controller a ogni payload.
- [x] TASK-050-03: negative prompt nel ramo non condizionato
  (`encodeSd15PromptChunks`), scala di guidance da `BRAIN_CONFIG`,
  `cfg-batch` come modo predefinito; mai troncamento silenzioso.

### Fase 2: Pannello

- [x] TASK-050-04: `VisualControls` diviso in riquadri distinti: Sorgente
  visiva (Solo colore / Morphing / Brain, mutuamente esclusivi), Brain con
  sottosezione Generazione immagini, Morphing con debug onirico richiudibile e
  mostrato solo con Oniric attivo, Risposta musicale e flash, Colori,
  Avanzate (FFT, livellamento, alternanza deprecata). In ControlApp i
  riquadri visivi precedono preset, sicurezza e soglie.

### Fase 3: Verifica

- [x] TASK-050-05: typecheck, lint, suite completa.
- [x] TASK-050-06: collaudo a schermo del Capo Supremo — stesso seed con e
  senza guidance su storie con figure femminili a corpo intero; tempi di
  generazione sui tre livelli.

## 5. 🧪 Strategia di Verifica e Validation Plan

- `pnpm typecheck`, `pnpm lint`, `pnpm exec vitest run`.
- Collaudo manuale: confronto raster e tempi a caldo per `low`/`mid`/`high`;
  verificare che la storia continui a essere pronta prima della fine della
  precedente (riciclo fotogrammi raro).

## 6. 📝 Note e Registro Avanzamento

- Lo zoom annidato (`NESTED_ZOOM_DENOISING_STEPS = 22`, disposizione
  2026-09-22) mantiene il suo override: con la CFG costa il doppio. Da
  rivalutare al collaudo, non modificato senza disposizione.
- 2026-10-11: implementazione completata. Typecheck, lint e suite completa
  verdi (801 test su 84 file). Nessuna generazione raster reale eseguita in
  sessione: tempi e qualità dei corpi restano da collaudare a schermo.
- 2026-10-11: «test ok» del Capo Supremo; Brain dichiarato pronto per
  l'esordio in pubblico. Rilascio 1.0.0-rc.10.
