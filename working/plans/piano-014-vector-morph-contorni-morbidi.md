# Piano di Lavoro: Vector Morph — Contorni Morbidi

> **ID Piano**: `PIANO-014`  
> **Macrotask di Riferimento**: `MACRO-012`  
> **Data Creazione**: 2026-08-16  
> **Stato**: `IN_PROGRESS — IMPLEMENTAZIONE COMPLETA, VALIDAZIONE LIVE PENDENTE`  
> **Autore/Agente**: Codex

---

## 1. Obiettivo del Piano

Ridurre gli spigoli visibili nel renderer Brain `Vector Morph` intervenendo
sulla geometria SVG prodotta sia da SNIC sia da VTracer. La finitura deve
smussare realmente le silhouette, preservare fori e bordi forti, restare
limitata a una deviazione locale e venire calcolata una sola volta prima della
cache.

## 2. Prerequisiti e Contesto

- **Moduli coinvolti**: `src/main/brainVectorizer.ts`, nuovo modulo geometrico
  in `src/main/`, tipi condivisi, qualità/cache Vector Morph e relativi test.
- I log live mostrano prevalenza dei fallback VTracer e nessun profilo SNIC
  accettato; la sola finitura stroke arrotondata non modifica la silhouette.
- Il controllo attuale rileva punte acute e dentellatura alternata, ma non la
  densità complessiva degli angoli né la continuità delle curve.

## 3. Verifica delle Regole di `agents.md`

- [x] **Camera**: nessuna scala, rotazione, zoom o deriva dell'intero quadro.
- [x] **Materia**: il raster originale resta visibile; cambia solo la geometria
  locale del livello vettoriale.
- [x] **Silenzio**: nessun nuovo clock o movimento autonomo.
- [x] **Beatmatch**: bande, `beatPulse`, `beatPhase`, kick e flash non vengono
  alterati.
- [x] **Transizione**: la stessa geometria smussata alimenta tutti gli estremi
  del morph, evitando salti.
- [x] **Alternanza**: registry, rotazioni e “Tutti per storia” restano invariati.
- [x] **Costo**: smoothing una tantum prima della cache, con tetto a punti e
  dimensione SVG; nessun costo geometrico aggiunto al RAF.
- [x] `lowPowerMode`, throttling, permessi microfono e DevTools non sono toccati.

## 4. Fasi di Implementazione

### Fase 1 — Geometria e qualità

- [x] Implementare parser/flattening dei path SVG e smoothing locale vincolato.
- [x] Preservare subpath, fori, attributi e path non supportati senza perdita.
- [x] Misurare densità degli angoli prima e dopo la finitura.

### Fase 2 — Integrazione

- [x] Applicare la finitura comune ai candidati finali SNIC e VTracer.
- [x] Ricalcolare punte e roughness sulla geometria consegnata.
- [x] Propagare metriche e telemetria nella cache Vector Morph.

### Fase 3 — Verifica

- [x] Testare riduzione spigoli, deviazione limitata e conservazione dei fori.
- [x] Eseguire test mirati, `pnpm typecheck`, lint mirato e `pnpm build`.
- [ ] Registrare esito e limiti della validazione manuale fullscreen.

## 5. Validation Plan

- Test unitari del modulo geometrico e del vettorializzatore.
- `pnpm exec vitest run --config vitest.config.ts <test mirati>`.
- `pnpm typecheck`.
- lint sui soli file modificati.
- `pnpm build`, poiché è coinvolto il processo Main.
- Verifica manuale consigliata: confrontare volti, mani, tessuti e silhouette
  organiche in Vector Morph, anche durante flash, background e story-cycle.

## 6. Registro Avanzamento

- **2026-08-16**: analisi confermata e implementazione autorizzata.
- **2026-08-16**: smoothing cubico comune integrato con deviazione massima
  1,4 px, budget adattivo di 5.200 punti e fallback sulla geometria originale
  oltre il limite di dimensione. Suite completa 41/41 file e 251/251 test,
  typecheck, lint mirato, diff-check e build macOS verdi.
