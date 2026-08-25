# Piano di Lavoro: FilterPsiche — Renderer Brain Cromatico

> **ID Piano**: `PIANO-016`  
> **Macrotask di Riferimento**: `MACRO-014`  
> **Data Creazione**: 2026-08-16  
> **Stato**: `IN_PROGRESS — IMPLEMENTAZIONE COMPLETA, VALIDAZIONE LIVE PENDENTE`  
> **Autore/Agente**: Codex

## 1. Obiettivo

Creare il renderer Brain `FilterPsiche`, basato sul raster originale e su
inversioni, solarizzazioni, duotoni, soglie e separazioni cromatiche. Deve
sostituire la percezione di una fase senza effetto con un linguaggio visivo
intenzionale, altamente psichedelico e reattivo a beat e flash.

## 2. Moduli coinvolti

- Nuovo `src/renderer/output/brain/brainFilterPsicheCanvas.ts` e test.
- Registry plugin, tipi condivisi, settings, UI e selector.
- Documentazione `working/`.

## 3. Verifica della filosofia visiva

- [x] **Camera**: il raster resta fisso e a pieno quadro; vietati zoom,
  rotazione o traslazione globale.
- [x] **Materia**: filtri, soglie, canali e micro-fasce agiscono dentro il
  raster, che rimane riconoscibile.
- [x] **Silenzio**: variante cromatica stabile; nessun movimento autonomo.
- [x] **Beatmatch**: `beatPulse`/kick guidano inversione e contrasto;
  `beatPhase` orienta soltanto micro-disallineamenti locali; bande separate.
- [x] **Transizione**: usa il crossfade beat-matched del Renderer Host e il
  progresso del fotogramma, senza tagli.
- [x] **Alternanza**: entra nel registry e nei mazzi casuali esistenti.
- [x] **Costo**: raster prefiltrati riusati, canvas 480×270 o 320×180 in low
  power/pressione, massimo poche fasce locali per frame.

## 4. Fasi

- [x] Implementare varianti cromatiche pure e selezione casuale stabile.
- [x] Preparare e riusare raster filtrati a risoluzione limitata.
- [x] Collegare bande, beat, flash, transizione e resource pressure.
- [x] Integrare tipi, registry, UI, settings e mazzi casuali.
- [x] Aggiungere test, typecheck, lint mirato e build.
- [ ] Registrare validazione artistica live pendente.

## 5. Validation Plan

- Test pixel-level delle varianti e del calcolo di motion/flash.
- Test registry/selector con cinque renderer.
- Test che in silenzio non richieda ridisegni temporali.
- Suite completa, typecheck, lint mirato, diff-check e build Electron/macOS.

## 6. Registro

- **2026-08-16**: piano aperto; architettura Canvas 2D e budget definiti.
- **2026-08-16**: implementazione completata; rimossa l'anteprima raster grezza
  fullscreen. 43 file e 260 test verdi, typecheck, lint mirato, diff-check e
  build Electron/macOS riusciti.
