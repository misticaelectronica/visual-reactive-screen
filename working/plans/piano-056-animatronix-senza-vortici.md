# Piano di Lavoro: ANIMATRONIX senza morphing a spirale

> **ID Piano**: `PIANO-056`  
> **Macrotask di Riferimento**: `MACRO-042`  
> **Data Creazione**: 2026-10-31  
> **Stato**: `BOZZA`  
> **Autore/Agente**: Agente AI / Capo Supremo  

---

## 1. 🎯 Obiettivo del Piano

Segnalazione del Capo Supremo, 2026-10-31 (testo originale):

> ALTRO PUNTO IN ANOMATRONIX IL MORPHING A SPIRALE è ANCORA PRESENTE: FAI PIANO
> PER TOGLIERLO

Nessun passaggio di ANIMATRONIX deve più leggersi come vortice o spirale.

---

## 2. 📋 Diagnosi

### Fatti verificati

- **La spirale di PIANO-047 è davvero rimossa.** La vecchia transizione
  `kinetic` aveva una matrice di rotazione. Oggi né il sorgente né il bundle
  `dist/assets/output-CuQtnFNP.js` contengono `mat2(` o `atan(`, e la build
  usata nel log è quella.
- **Il test esistente controlla solo quella matrice**
  (`brainAnimatronix.test.ts:580`). Non può vedere un vortice prodotto in altro
  modo.
- **Il morph a flusso** (`computeMorphFlow`, disposizione 2026-09-24) sposta i
  pixel secondo un campo calcolato per blocchi fra due immagini diverse:
  griglia 32×32, ricerca ±8 celle, spostamento fino al 22% del quadro
  (`brainAnimatronix.ts:1248-1252`). Nessun vincolo impedisce a quel campo di
  girare su se stesso.
- **Quel campo agisce su quasi tutti i passaggi.** Vale per `morph` a piena
  ampiezza e per `fracture`, `residual` e `focus` al 70%
  (`brainAnimatronixGl.ts:261-267`). Nella sessione del 2026-10-31 sono 26
  passaggi su 32; ne sono esenti soltanto `datamosh` e `occlusion`.
- **`perspective-melt` ha un termine di taglio** che accoppia orizzontale e
  verticale, con segno opposto fra le due metà (`brainAnimatronixGl.ts:77`).
  È presente in 4 passaggi su 32.

### Ipotesi

La spirale che si vede oggi è il morph a flusso: per la sua diffusione è il
primo candidato, e un campo di corrispondenza fra immagini senza relazione può
formare vortici. **Non è stato misurato**: nessuna analisi del campo sui raster
reali e nessuna prova a schermo. `perspective-melt` è il secondo candidato.

---

## 3. 📋 Prerequisiti e Contesto

### File / Moduli Coinvolti

- `src/renderer/output/brain/brainAnimatronixGl.ts`
- `src/renderer/output/brain/brainAnimatronix.ts`
- `src/renderer/output/brain/brainAnimatronixStage.ts`
- `src/renderer/output/brain/brainController.ts`
- `src/renderer/output/brain/brainAnimatronix.test.ts`
- `src/renderer/output/skills.md`, `working/`

### Audit preventivo `working/DEPRECATED.md`

- `DEP-001 — NON COINVOLTO`: l'alternanza non partecipa alle transizioni di
  ANIMATRONIX.
- `DEP-002 — NON COINVOLTO`: testo e storie non vengono toccati.

### Decisioni

- **D1 — Rimuovere il flusso, senza correggerlo (proposta, da approvare).** Un
  campo reso privo di rotazione sarebbe un nuovo meccanismo sopra uno che già
  dà problemi. Lo shader ha già il comportamento di riserva: `morph` converge
  radialmente verso il punto di fuga, senza alcuna torsione (righe 268-271).
- **D2 — `perspective-melt` solo se serve (proposta, da approvare).** Il suo
  termine di taglio si toglie soltanto se, senza flusso, la spirale resta.

### Rischio da accettare

Il morph a flusso fu introdotto il 2026-09-24 perché, con la dissolvenza
piatta, il Capo Supremo chiese che «le immagini devono morphare». Toglierlo
riporta `morph` a dissolvenza con convergenza radiale, e `fracture`, `residual`
e `focus` alla loro sola logica interna. Il rischio è che i passaggi tornino a
leggersi più piatti: va valutato a schermo.

### Fuori dal piano

- **Fractal Spiral Degeneration** è un renderer Brain distinto e resta com'è.
  Non gira dentro ANIMATRONIX, ma può trovarsi sotto la fase quando questa entra
  o esce in dissolvenza.
- Durate, scelta delle grammatiche, `HYPNOTIC ZOOM` e `DATAMOSH` non cambiano.

---

## 4. ⚠️ Regole e Vincoli di Sviluppo (da `agents.md`)

- [x] Audit dei deprecati completato prima di definire le modifiche.
- [ ] Nessun cambiamento a `backgroundThrottling`, permessi media, DevTools o
      `lowPowerMode`; nessuna nuova impostazione.
- [x] **Divieto di sovrastrutturazione**: si rimuove un meccanismo e si riusa
      la riserva già presente.
- [x] **Autonomia dei renderer**: intervento confinato ad ANIMATRONIX.
- [x] **Camera**: resta la deroga ANIMATRONIX, senza estensioni.
- [x] **Silenzio** e **Beatmatch**: stato del mondo e aggancio al beat non
      cambiano.
- [ ] **Transizione**: verificare a schermo che nessun passaggio diventi uno
      stacco. Al 2026-09-24 il flusso serviva a evitare scatti al confine.
- [x] **Costo**: meno calcolo sul main thread e una texture in meno per raster.

---

## 5. 🛠️ Fasi di Implementazione e Checklist Task

### Fase 1: Togliere il flusso

- [ ] **TASK-056-01**: in `brainAnimatronixGl.ts` rimuovere `uFlow`, `uHasFlow`,
      il ramo `morphKind` e le texture `flow`, lasciando la riserva per
      `uKind == 8`.
- [ ] **TASK-056-02**: rimuovere `computeMorphFlow`, `downsampleLuma` e le
      costanti `MORPH_FLOW_*` in `brainAnimatronix.ts`; `attachMorphFlows`,
      `luma` e `flowToNext` in `brainAnimatronixStage.ts`; la chiamata in
      `brainController.ts:2387`.
- [ ] **TASK-056-03**: verificare se `boxBlur` resta usato altrove; se non lo è,
      rimuoverlo.

### Fase 2: Test e documentazione

- [ ] **TASK-056-04**: rimuovere i test del flusso ed estendere il test
      sullo shader: nessun `mat2(`, nessun `uFlow`.
- [ ] **TASK-056-05**: aggiornare i commenti delle transizioni e la
      documentazione di ANIMATRONIX in `src/renderer/output/skills.md`.

### Fase 3: Verifica

- [ ] **TASK-056-06**: `pnpm typecheck`, `pnpm lint`, suite completa, `pnpm build`.
- [ ] **TASK-056-07**: collaudo del Capo Supremo su tutte le grammatiche.
- [ ] **TASK-056-08**: solo se la spirale resta visibile, togliere il termine di
      taglio di `perspective-melt` (D2) e ripetere il collaudo.

---

## 6. 🧪 Strategia di Verifica e Validation Plan

- **Comandi di Test**:
  - `pnpm exec vitest run src/renderer/output/brain/brainAnimatronix.test.ts`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm build`
- **Verifica Manuale**, con ANIMATRONIX attivo per più storie:
  - nessun vortice nei passaggi `morph`, `fracture`, `residual`, `focus`;
  - se compare, annotare la grammatica dal log `grammars`/`transitions`;
  - nessuno stacco al confine fra raster;
  - giudizio del Capo Supremo: i passaggi si leggono ancora come morphing?

---

## 7. 📝 Note e Registro Avanzamento

- **2026-10-31**: creazione del piano. DEP-001 e DEP-002 `NON COINVOLTO`.
  D1 e D2 attendono approvazione; la causa è un'ipotesi non misurata.
