# PIANO-035: Glitch Morph — contorno di luminanza iridescente

## Origine

Discussione a partire da un'idea generica "glitch+morph" (typo iniziale
"cgli+morph"). Analisi solo-design richiesta esplicitamente dal Capo
Supremo ("prima solo analisi"), con tre giri di iterazione prima
dell'implementazione:

1. Proposte di 3 varianti (ibrida edge-aware / pura a scanline /
   region-based onirica) — anteprima animata pubblicata come Artifact.
2. Il Capo Supremo ha scelto la variante "pura" ma ha poi interrotto la
   discussione con un'immagine di riferimento diversa e più specifica:
   glitch art olografica — dense linee di contorno orizzontali che
   seguono la luminanza/i bordi dell'immagine sottostante, con frangia
   cromatica iridescente, su sfondo nero.
3. Il Capo Supremo ha rifiutato lo sfondo nero puro del riferimento
   ("ma tra le linee possiamo vedere il raster sotto dai") e poi anche
   la proposta di raster a piena opacità ("a piena opacità anche no") —
   il raster doveva restare visibile ma attenuato, non protagonista.

Seconda anteprima pubblicata con raster attenuato (opacità regolabile,
default ~40%) e linee sopra in blend additivo. Feedback successivo:
"linee meno bianche, movimento meno uniforme e più fedeli a mia
immagine" — le 3 tinte primarie (ciano/magenta/verde) sommate in
additivo convergevano al bianco, e tutte le righe oscillavano con la
stessa sinusoide. Corretto con tonalità per-riga derivata dalla
luminanza (niente primari fissi) e semi hash per-riga (fase, frequenza,
frequenza spaziale) per un moto organico, non sincronizzato.

Confermato ("procedi, Sir") → implementazione.

## Tecnica

- **Check Materia** (motivo dell'intera revisione): il raster resta
  SEMPRE il livello di base — disegnato a opacità parziale (40%), non
  sostituito da un fondo nero. Un velo scuro in `multiply` a bassa
  opacità aumenta il contrasto locale senza nasconderlo (stesso pattern
  già usato in Dream Segmentation).
- **Prepara una volta, anima a basso costo**: alla preparazione della
  sorgente si calcola un profilo di luminanza per riga × colonna
  campionata (`buildGlitchProfile`, risoluzione indipendente dal
  canvas — 140 colonne campionate), più un seme deterministico per
  riga (`computeRowSeed`, hash stabile sull'indice — nessun tremolio fra
  un frame e l'altro). Per frame si ridisegnano solo polilinee lette dal
  profilo cacheato: nessuna rianalisi pixel per frame.
- **Colore**: la tonalità di ogni riga deriva dalla propria luminanza
  media e dal proprio seme (`computeRowHue`), non da 3 primari RGB fissi
  sommati in additivo — evita la convergenza al bianco segnalata.
  Nessuna dipendenza dal tempo nell'hue: un colore che deriva da solo
  senza musica violerebbe il Check Silenzio.
- **Movimento non uniforme**: ogni riga ha fase, frequenza e frequenza
  spaziale proprie (hash sull'indice riga), più un secondo overtone a
  frequenza doppia — rompe la sincronia a "onda unica" del primo giro.
- **Check Silenzio**: `computeLineWobble` ritorna 0 senza audio attivo
  o con ampiezza nulla — il contorno resta visibile e fermo, derivato
  dalla sola luminanza dell'immagine, mai un'animazione autonoma.
- **Check Beatmatch**: ampiezza dell'ondulazione e intensità della
  frangia cromatica scalano con `high`/`beat` (bandDrive + accento
  ritmico, stesso pattern di tutti gli altri renderer Brain).
- **Check Costo**: nessuna elaborazione per-pixel a runtime — solo
  `moveTo`/`lineTo` su punti pre-campionati, throttling per frame-rate
  identico agli altri renderer canvas (normale/low-power/pressione).
- **Check Camera**: nessuno zoom/scala/rotazione dell'intero frame.
- **Check Alternanza/Transizione**: renderer leggero a sorgente singola
  (come FilterPsiche/Vector Morph/Psycho2D), inserito nella rotazione
  storia normale (`PERSISTENT_STORY_RENDERERS`), non escluso né trattato
  come "pesante" sotto pressione GPU (nessuna analisi multi-sorgente).

## File toccati

- `src/renderer/output/brain/brainGlitchMorphCanvas.ts` (nuovo) — logica
  pura testabile (`computeRowSeed`, `buildGlitchProfile`,
  `calculateGlitchMotion`, `computeLineWobble`, `computeRowHue`,
  `shouldRenderGlitchFrame`) + controller `createBrainGlitchMorphScene`.
- `src/renderer/output/brain/brainGlitchMorphCanvas.test.ts` (nuovo).
- `src/renderer/output/brain/brainRendererRegistry.ts` — registrazione
  `glitch-morph`.
- `src/renderer/output/brain/brainRendererRegistry.test.ts` — aggiornato
  al conteggio di 8 renderer.
- `src/renderer/output/brain/brainRendererSelector.ts` — aggiunto a
  `PERSISTENT_STORY_RENDERERS` (non a `HEAVY_RENDERERS_UNDER_PRESSURE`:
  è a sorgente singola, leggero come FilterPsiche).
- `src/shared/types.ts` — `BrainRendererId`/`BRAIN_RENDERER_IDS`.
- `src/renderer/control/components/VisualControls.tsx` — voce nel
  selettore manuale.
- `src/renderer/output/OutputApp.tsx` — etichetta debug in basso a
  destra.

## Verifica

- `pnpm vitest run` — 406/406 verdi (57 file).
- `pnpm typecheck` — pulito.
- `pnpm lint` sui file toccati — pulito.
- `pnpm build` — build di produzione completa (Vite + electron-builder)
  verde.
- Non ancora verificato dal vivo (osservazione diretta durante l'uso —
  da fare al prossimo giro con musica reale).
