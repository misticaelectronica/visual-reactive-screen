# Piano di Lavoro: FilterPsiche — Presenza e Dinamica

> **ID Piano**: `PIANO-027`
> **Macrotask di Riferimento**: `MACRO-025`
> **Data Creazione**: 2026-08-16
> **Stato**: `COMPLETATO`
> **Autore/Agente**: Codex

---

## 1. Obiettivo

Rendere FilterPsiche più frequente nella modalità “Tutti per storia” e più
incisivo nella risposta musicale, senza aumentare il budget di rendering né
alterare camera, quadro, silenzio o continuità delle transizioni.

## 2. Moduli coinvolti

- `src/renderer/output/brain/brainRendererSelector.ts`
- `src/renderer/output/brain/brainFilterPsicheCanvas.ts`
- relativi test mirati

## 3. Verifica dei vincoli visuali

- [x] **Camera**: nessuna scala, rotazione, zoom o traslazione del quadro.
- [x] **Materia**: dinamica applicata a cromia, contrasto e fusioni interne del
  raster, che resta riconoscibile; nessuna slice orizzontale.
- [x] **Silenzio**: tutti i contributi dinamici restano nulli senza attività.
- [x] **Beatmatch**: kick, `lowMid`, `mid` e `high` mantengono funzioni distinte.
- [x] **Transizione**: contratto di ingresso/uscita invariato.
- [x] **Costo**: invariati risoluzione, FPS e buffer; `lowPowerMode` e pressione
  risorse restano invariati.

## 4. Implementazione

- [x] Garantire FilterPsiche nella finestra corrente di quattro renderer della
  modalità “Tutti per storia”, preservando il bilanciamento degli altri.
- [x] Aumentare la risposta cromatica e locale alle bande senza moto autonomo.
- [x] Aggiungere test su presenza, dinamica e silenzio.
- [x] Eseguire typecheck, suite completa, lint e diff-check.

## 5. Validation Plan

- `pnpm typecheck`
- `pnpm test`
- `pnpm lint`
- `git diff --check`
- verifica percettiva fullscreen consigliata dopo la consegna.

## 6. Registro

- **2026-08-16**: analisi completata; avviata la taratura minima.
- **2026-08-16**: FilterPsiche garantito una volta per episodio in “Tutti per
  storia” e mantenuto il 50% più a lungo in rotazione. Intensificate le
  modulazioni interne senza aumentare FPS, risoluzione o slice massime.
  Validazione completa: 50 file / 301 test, typecheck, lint e diff-check verdi.
- **2026-08-16**: rimossa la micro-slice esattamente centrale che appariva come
  una riga orizzontale fissa; mantenute le slice superiori e inferiori.

## 7. Ripristino dinamica cromatica beatmatch 2026-08-16

- [x] Eliminare la saturazione percettivamente statica dei blend a pieno quadro.
- [x] Mappare beat/low, low-mid, mid e high su proprietà cromatiche distinte.
- [x] Usare la fase ritmica soltanto per la direzione del cambio colore.
- [x] Conservare camera stabile, silenzio immobile e assenza totale di righe.
- [x] Aggiungere test mirati e completare la validazione automatica.

- **2026-08-16**: ripristinata la dinamica cromatica continua: kick/beat
  accentuano luminosità e inversione breve, `lowMid` orienta la palette, `mid`
  governa il contrasto e `high` la separazione cromatica. La fase ritmica
  orienta soltanto la variazione di tinta. Nessuna trasformazione geometrica,
  nessuna riga e valori neutri nel silenzio. Validazione: 52 file / 309 test,
  typecheck, lint, bundle Vite/Electron e diff-check verdi.
