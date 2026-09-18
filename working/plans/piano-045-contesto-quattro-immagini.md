# Piano di Lavoro: Contesto delle quattro immagini

> **ID Piano**: PIANO-045  
> **Macrotask**: MACRO-036  
> **Data**: 2026-09-17  
> **Stato**: IN_PROGRESS — criterio visivo non raggiunto  
> **Autore**: Ingegneria

## 1. Obiettivo
Consegnare al generatore momento corrente, continuità narrativa e Color Direction
senza perdita silenziosa; verificare sequenza, compatibilità e costo.

## 2. Contesto e audit
Letti STATE, macrotasks, DEPRECATED, filosofia e lettera Ingegneria.
DEP-001 — NON COINVOLTO: nessuna modifica alla programmazione 80/20.
Modifiche preesistenti presenti: preservarle. Piani 040/042/043/044 e blocco
prestazioni 009/020 restano indipendenti; nessuna memoria autobiografica modificata.
Difetto verificato: tokenizer tronca a 77 token, Color Direction in coda.
Artefatto ONNX locale: UNet ha sequence_length dinamica, CLIP resta a 77 posizioni.

## 3. Regole
- [x] Camera, materia, silenzio, beat e transizioni: nessun cambio ai renderer.
- [x] Audit deprecati completato; alternanza non coinvolta.
- [x] Preservare lowPowerMode, scheduler, step, risoluzioni, permessi e throttling.
- [x] Nessun DevTools automatico; nessuna nuova inferenza narrativa.
- [x] Budget esplicito del contesto e verifica del costo reale.

## 4. Fasi
- [x] TASK-045-01: diagnosticare prompt e contratto degli artefatti.
- [x] TASK-045-02: contesto narrativo e codifica completa in blocchi CLIP.
- [x] TASK-045-03: test regressione, tokenizer reale e compatibilità modello.
- [x] TASK-045-04: collaudo immagini e prestazioni; distinguere evidenze e limiti.

## 5. Validation Plan
Test unitari e integrazione al confine text encoder/UNet; pnpm typecheck e lint.
Test su artefatti locali con contesto esteso, conteggio token e misura comparativa.
Build per rendere la modifica collaudabile nell'app.
Valutazione dei quattro raster: stesso nucleo, momenti distinti, progressione,
Color Direction, costo; il test testuale da solo non certifica qualità percettiva.

## 6. Registro
2026-09-17: apertura su brief del Vice Consigliere. Tecnica di blocchi CLIP
riscontrata anche nell'implementazione primaria Diffusers:
https://github.com/huggingface/diffusers/blob/main/examples/community/lpw_stable_diffusion.py


### Esito della sessione
- Implementato budget massimo 6×75 token di contenuto; test confini, CFG e
  FP16. Suite 77 file / 717 test, poi 82 test mirati dopo ritiro sinossi.
- Generati 16 raster reali: 6 primo confronto, 4 CFG ridotto, 2 confronto
  controllato CFG12, 4 finali (16 raster complessivi). Misure e ispezione in
  `../validation/piano-045/README.md`.
- Sinossi completa in ogni prompt ritirata dopo esito negativo. Non cambiate
  le impostazioni live; la correzione adottata rimuove solo la perdita di
  testo. Color Direction ricevuto non significa Color Direction rispettato.
- [ ] TASK-045-05: criterio visivo ancora da raggiungere e prova live lunga.
- Build: prima compilazione riuscita; packaging DMG non consentito nella
  sandbox, interrotto. Il rilancio autorizzato ha trovato due costanti inutilizzate
  in `brainRendererHost.ts` introdotte da modifiche concorrenti fuori scope
  (PRESSURE_DARKEN_MS, PRESSURE_DARKEN_PEAK_OPACITY). Non alterate.
  Terminato quel passaggio concorrente, typecheck nuovamente verde e build
  normale completa riuscita: app, ZIP e DMG arm64 (18:01).
