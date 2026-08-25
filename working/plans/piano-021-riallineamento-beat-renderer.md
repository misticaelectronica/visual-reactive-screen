# Piano di Lavoro: Riallineamento Beat Renderer

> **ID Piano**: `PIANO-021`
> **Macrotask di Riferimento**: `MACRO-019`
> **Data Creazione**: 2026-08-16
> **Stato**: `COMPLETATO`
> **Autore/Agente**: Codex

## 1. Obiettivo

Correggere la risposta fuori tempo di FilterPsiche, Materia Morph, Liquid e
Oniric intervenendo sul clock condiviso, sulla leggibilità dell'attacco locale
e sul budget della modalità normale. La modalità Soft + low power, riferita
come sensibilmente migliore, viene usata come indizio prestazionale e
percettivo, non come requisito permanente.

## 2. Diagnosi iniziale

- Il listener IPC chiama `projectState()` subito dopo `ingestSample()` e può
  consumare `beat=true` prima del RAF Output condiviso.
- Un beat rilevato restituisce fase zero per una chiamata, ma
  `musicalPosition` può restare fra due interi e ripartire fuori fase.
- Liquid e Oniric disegnano 5–12 layer con blur a 60 FPS; il gesto continuo può
  saturare il frame budget e coprire l'accento.
- FilterPsiche e Materia moltiplicano il kick per l'attività e smussano anche
  il fronte d'attacco, rendendolo debole o tardivo.
- I log mostrano finestre Output a circa 13–20 FPS anche senza inferenza
  immagine attiva; il miglioramento in low power conferma che il margine RAF è
  parte del problema.

## 3. Vincoli

- [x] Check Camera: nessuna trasformazione dell'intero quadro.
- [x] Check Materia: l'accento agisce solo su colore, densità e regioni locali.
- [x] Check Silenzio: nessun avanzamento o impulso quando il clock è inattivo.
- [x] Check Beatmatch: un solo clock Output; fronte, fase e bande restano distinti.
- [x] Check Transizione: nessun taglio o cambio di lifecycle dei renderer.
- [x] Check Alternanza: invariata la regia Brain/morphing 80/20.
- [x] Check Costo: riduzione del budget normale più costoso, low power preservato.

## 4. Fasi

- [x] Conservare il beat fino al RAF Output e riallineare la posizione musicale.
- [x] Introdurre un accento ritmico condiviso, immediato e nullo in silenzio.
- [x] Rendere leggibile l'attacco locale in FilterPsiche e Materia Morph.
- [x] Rendere leggibile l'attacco locale in Liquid e Oniric.
- [x] Ridurre il costo normale di Liquid/Oniric senza degradare low power.
- [x] Aggiungere test di regressione per clock, silenzio e attacco.
- [x] Eseguire test, typecheck, lint mirato, build renderer e diff-check.
- [x] Aggiornare il tracciamento `working/`.
- [x] Accorciare l'envelope high e impedire che gli hat sostengano movimento
  geometrico continuo nei quattro renderer segnalati.
- [x] Ripetere validazione completa dopo la taratura high.

## 5. Validation Plan

- Test clock: il beat viene consumato dal solo RAF e la fase successiva parte
  vicino a zero; nessun arretramento della posizione musicale.
- Test motion: un kick produce un accento minimo visibile anche con energia
  sostenuta bassa; in silenzio l'accento è zero.
- Test budget: normale e low power hanno cap distinti e deterministici.
- `pnpm test`, `pnpm typecheck`, lint sui file modificati, build Vite/Electron e
  `git diff --check`.

## 6. Registro

- **2026-08-16**: diagnosi avviata usando codice, log live e indicazione che
  Soft + low power migliorano nettamente il comportamento.
- **2026-08-16**: corretto il consumo anticipato del latch, riallineata la fase,
  introdotto un fronte condiviso e ridotti i budget normali. 49 file / 291
  test, typecheck, lint mirato e build Vite/Electron verdi; resta la conferma
  percettiva fullscreen.
- **2026-08-16**: piano riaperto dopo feedback live: la banda high mantiene
  troppo a lungo gli hat e domina slice, grana e tensione geometrica.
- **2026-08-16**: high release ridotto a 75 ms, smoothing high a 0,16 beat e
  doppio conteggio rimosso. Gli hat modulano dettagli materici, non velocità o
  traiettoria. 49 file / 293 test e build renderer/Electron verdi.
