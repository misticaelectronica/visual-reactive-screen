# Piano di Lavoro: Flusso Infinito, Permanenza Renderer e Denoising

> **ID Piano**: `PIANO-028`
> **Macrotask di Riferimento**: `MACRO-026`
> **Data Creazione**: 2026-08-16
> **Stato**: `COMPLETED — VALIDAZIONE LIVE PENDENTE`
> **Autore/Agente**: Codex

---

## 1. Obiettivo

Garantire che Brain continui a preparare nuovi gruppi di immagini dopo le prime
quattro, introdurre permanenze casuali di 2–4 fotogrammi per i renderer materici
indicati e rimuovere i blocchi prodotti dal denoising WebGPU condiviso con il
compositore Electron.

## 2. Evidenza di partenza

- Il ciclo esistente riparte, ma in “Tutti per storia” sospende il refill per
  un attraversamento e usa una finestra di 240 secondi.
- In `lowPowerMode` SD viene rilasciato e ricaricato: ogni nuovo ciclo rilegge
  circa 2,06 GB; Qwen rilegge altri 769 MB.
- Il Worker immagini condivide comunque il processo GPU Electron: 18 gap RAF
  da 240–347 ms, processo GPU oltre il 100% CPU e ultimo raster a 30,8 s.

## 3. Vincoli visuali e di costo

- [x] Camera e quadro restano stabili.
- [x] La dinamica resta interna alla materia e nulla nel silenzio.
- [x] Transizioni esistenti mantenute.
- [x] Nessun aumento di FPS, risoluzione, layer o numero di inferenze.
- [x] Qwen resta una facoltà semantica con una sola richiesta per episodio.

## 4. Implementazione

- [x] Avviare il refill successivo senza sospensione dopo il primo giro.
- [x] Mantenere SD residente; usare Qwen WebGPU in modo sequenziale e
  rilasciarlo prima di SD. Il tentativo WASM è stato ritirato dopo timeout live.
- [x] Usare il profilo standard per tutte le immagini prodotte durante il live.
- [x] Cedere tempo al compositore fra gli step UNet.
- [x] Applicare permanenza casuale 2–4 fotogrammi a FilterPsiche, Materia Morph
  e Vector Morph; Psycho2D resta estratto casualmente.
- [x] Completare test, typecheck, lint, build e diff-check.

## 5. Validation Plan

- Test mirati su refill, residenza, profili live, richiesta Worker e selettore.
- `pnpm typecheck`
- `pnpm test`
- `pnpm lint`
- `pnpm build`
- `git diff --check`
- Nuova prova runtime dopo riavvio completo, necessaria per azzerare gli
  allocator WebGPU già saturi nell’esecuzione corrente.

## 6. Registro

- **2026-08-16**: diagnosi live completata e implementazione avviata.
- **2026-08-16**: implementazione completata; 302 test, typecheck, lint,
  diff-check e pacchetti macOS verdi. Prova live rinviata al riavvio completo.
- **2026-08-16**: test live ha dimostrato che Qwen WASM supera il timeout dopo
  soli 25 token. Ripristinato WebGPU sequenziale; aggiunti concatenazione dei
  prompt e fallback senza retry Qwen. Pipeline immagini ripartita a 7,65 s per
  il primo raster standard; validazione aggiornata a 304 test.
- **2026-08-16**: prova live completa del ciclo: buffer 4/4, nuovo refill dopo
  30 s e produzione successiva avviata. Prompt concatenati e distinti verificati
  nei log. Suite aggiornata a 305 test; build runtime e ZIP verdi, DMG finale
  bloccato esclusivamente da `hdiutil`.
