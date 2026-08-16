# Stato Globale del Progetto (`STATE.md`)

## Soluzioni denoising stall — 2026-08-16

- Correzione dinamica: la generazione non interrompe più il RAF Brain. Timeline,
  beat e transizioni continuano; il coordinatore usa il vero renderer
  `Print2D — serigrafico` a 18 FPS sotto pressione e limita il renderer pieno
  a 5 FPS durante il breve crossfade, per poi sospenderlo fino all'uscita.
- Implementato il piano Antigravity approvato: durante Psichedel il loop Brain
  coordina ora una modalità visuale leggera durante l'inferenza, senza fermare
  il quadro o simulare movimento autonomo.
- La finestra è single-flight, annullabile e limitata a 120 secondi.
- ONNX Runtime WebGPU riceve un device avvolto che attende la fence
  `onSubmittedWorkDone()` e programma un micro-yield da 4 ms dopo ogni submit.
- Entrambe le soluzioni sono controllate da configurazione; step, seed, forma,
  qualità e risoluzione della pipeline restano invariati.
- Validazione corrente: 52 file / 306 test, typecheck, lint, diff-check e bundle
  Vite/Electron verdi. Resta il confronto live dei gap RAF e della resa Print2D.

## Ripristino comportamenti non performance — 2026-08-16

- Correzione percettiva: FilterPsiche è ora collocato nella prima osservazione,
  oppure nella seconda se aveva chiuso il gruppo precedente; le permanenze
  2–4 non possono più impedirne del tutto la comparsa nelle quattro immagini.
- FilterPsiche non disegna più alcuna slice orizzontale; la risposta alle alte
  agisce su saturazione e fusione cromatica, senza movimento di camera.
- Ogni prompt immagine concatena osservazione corrente, stimolo distinto e
  residuo visuale precedente.
- Coscienza Onirica usa una sola chiamata Qwen per la storia; errore o risposta
  invalida producono quattro osservazioni locali senza una chiamata di repair.
- Il refill del gruppo successivo non è più bloccato dal primo attraversamento;
  le immagini correnti vengono riciclate soltanto finché il nuovo gruppo arriva.
- FilterPsiche, Materia Morph e Vector Morph persistono casualmente 2–4 immagini.
  Psycho2D è temporaneamente disabilitato nel registry runtime e rimosso dalla
  UI: non può apparire né automaticamente né manualmente; i sorgenti restano
  conservati per un eventuale ripristino.
- Nessuna modifica a backend, denoising, qualità, risoluzione, cooldown,
  frame pacing o low power.
- Validazione: 50 file / 299 test, typecheck, lint e diff-check verdi.

## Rollback MACRO-026 — Ritiro esperimento flusso infinito Qwen+SD live — 2026-08-16

- Esperimento ritirato dopo analisi dei log live: incompatibilità strutturale
  tra generazione continua e rendering live sulla stessa GPU.
- **Cause confermate**: Qwen monopolizza WebGPU per 9,6–17 s per step (non
  interrompibile dentro `session.run()`); il yield da 48 ms agisce solo *tra*
  gli step. Picco RAF 868 ms, buco IPC 22,6 s, 5.211 pacchetti persi, due
  finestre da 10 s senza alcun pacchetto.
- **Degenerazione semantica**: quattro osservazioni identiche amplificate da
  Brain per loop autoreferenziale; il modello reinseriva le proprie frasi come
  memoria recente.
- **Conclusione**: nessuna taratura credibile è possibile dentro questa
  architettura. Generazione locale infinita e output live sincronizzato non
  possono condividere continuamente lo stesso processo GPU Electron.
- **Azioni eseguite**:
  1. Commit di archivio `8a88979` del lavoro sperimentale MACRO-026/028 sul
     branch `feature/brain-dream-causality-experiment` (recuperabile).
  2. Rollback a `e21fddb` (baseline sicura pre-esperimento) con commit `e21a355`.
  3. Typecheck pulito sulla baseline ripristinata.
- **Direzione futura**: demandare la generazione a un processo/macchina esterna;
  durante la performance usare soltanto buffer già pronti.
- **Branch**: `feature/brain-dream-causality-experiment`; `main` non è stato
  toccato.



## Rollback prestazioni renderer — 2026-08-16

- Ritirata integralmente l'opzione `reducedFpsMode`; i valori salvati da build
  precedenti vengono ignorati e rimossi al caricamento.
- Liquid e Oniric tornano a 60 FPS normali; Liquid torna a 60 punti e non ha
  più il tetto aggiuntivo di otto veli in modalità normale.
- FilterPsiche torna a 480×270, 30 FPS e 7 slice; Materia Morph torna a 24 FPS
  e 12 regioni. `lowPowerMode` resta invariato.
- Rimossa la pressione grafica adattiva che commutava ripetutamente fra plugin
  e passthrough dopo i gap UNet. Lo scheduler continua soltanto a rinviare la
  prossima inferenza dopo un long frame.
- Worker immagini e Worker Node di vettorializzazione sono mantenuti e presenti
  nella build.
- Validazione: 50 file / 295 test, typecheck, lint, diff-check e build Electron
  arm64 completi; prova fullscreen del rollback pendente.

## Correzione scatti globali da servizi pesanti — 2026-08-16

- I log live hanno separato due cause: passthrough forzato a 19,9 FPS per tutta
  l'inferenza e buco IPC di 1.557 ms durante la vettorializzazione nel main.
- Dopo l'isolamento UNet, `imageInferenceActive` resta una metrica ma non forza
  più `resourcePressure`. Anche la successiva protezione adattiva basata sui
  gap RAF è stata rimossa dopo la prova live negativa.
- SNIC/VTracer gira ora in `brainVectorizerWorker.js`, separato dal main che
  inoltra audio e ACK. Il buffer raster viene trasferito al worker.
- Smoke test 320×180: 217 ms nel worker mentre il loop chiamante ha continuato
  a eseguire 42 tick; risultato vettoriale valido.
- Validazione: 51 file / 298 test, typecheck, lint mirato, diff-check e build
  Electron completa verdi; prova fullscreen pendente.

## Modalità FPS ridotti con stessi layer — ritirata 2026-08-16

- L'opzione sperimentale `Modalità FPS ridotti` è stata rimossa dopo il test
  live; non è più presente in UI, tipi, default o runtime.
- Liquid, Oniric, PsyHyp e 2001 vengono limitati a 30 FPS; Print2D, Psycho2D,
  Vector, Materia, FilterPsiche e Bauhaus usano la propria cadenza ridotta già
  collaudata, senza ridurre layer, regioni, slice, ribbon, risoluzione o DPR.
- Il clock Output e l'acquisizione audio non vengono rallentati: impulso, fase,
  kick e transienti continuano a essere catturati prima del frame pacing.
- Se FPS ridotti e basso consumo sono entrambi attivi, il basso consumo mantiene
  anche le proprie semplificazioni visive; la nuova opzione da sola no.
- Validazione: 50 file / 295 test, typecheck, lint mirato, diff-check e build
  completa verdi; prova fullscreen pendente.

## Isolamento inferenza immagini — 2026-08-16

- Psichedel usa ora un Dedicated Worker: tokenizer, sessioni ONNX, UNet, VAE e
  codifica PNG non vengono più eseguiti nel thread JavaScript del RAF Output.
- L'Output risolve configurazione, geometria, step, timeout e URL WASM, invia
  una richiesta tipizzata e riceve soltanto progressi e raster pronto.
- Il worker mantiene una sola inferenza alla volta, riusa le sessioni e supporta
  abort/rilascio; il bundle Vite lo emette come chunk separato.
- Non sono cambiati camera, materia, clock, silenzio, low power o protezione
  passthrough durante il denoising.
- Validazione automatica: 50 file / 295 test, typecheck, lint mirato e build
  completa verdi. Resta il confronto live dei gap RAF e della temperatura:
  il worker non elimina da solo la possibile contesa nel processo GPU Chromium.

## Riallineamento beat renderer — 2026-08-16

- Correzione hat: soglia high meno permissiva, release 75 ms e smoothing locale
  di 0,16 beat impediscono la sovrapposizione continua sui sedicesimi.
- Liquid/Oniric non usano più gli high per cambiare velocità o traiettoria; gli
  hat restano brevi variazioni di opacità, contrasto e texture locale.
- FilterPsiche e Materia non sommano più due volte lo stesso transiente high:
  slice e grana tornano a chiudersi fra gli attacchi.
- Il listener IPC non consuma più `beat=true`: soltanto il RAF Output pubblica
  il fronte condiviso a Brain e ai Canvas indipendenti.
- Ogni kick reale riallinea `musicalPosition` a un intero senza arretrare; il
  frame successivo riparte vicino a fase zero.
- FilterPsiche, Materia, Liquid e Oniric usano un accento immediato indipendente
  dall'energia sostenuta, con release smussato e zero impulso nel silenzio.
- I budget normali ridotti sono stati respinti dal test live e ripristinati:
  Liquid/Oniric 60 FPS, FilterPsiche 30 FPS a 480×270 e Materia 24 FPS. Low
  power resta invariato.
- Validazione: 49 file / 293 test, typecheck, lint mirato e build Vite/Electron
  verdi. Resta la conferma percettiva fullscreen.

## Documentazione architettura corrente — 2026-08-16

- Creata una fotografia tecnica verificata di processi, IPC, flusso runtime,
  Brain, preset, rendering, audio reactive, dipendenze e performance.
- Documentati esplicitamente i confini reali: plugin Brain legati a DOM/Canvas,
  morphing esterni separati, preset non unificati e assenza di render graph.
- Separate le metriche osservate dai target nel codice e dai dati non
  determinabili, senza introdurre componenti teorici.
- Documento: `docs/architettura-brain-visual-reactive-screen.md`.
- Validazione: typecheck e diff-check verdi.

## Psycho2D — texture musicali alternate 2026-08-16

- Quattro trame one-bit derivate dallo stesso raster sostituiscono la singola
  matrice Bayer: impulso, tessitura `lowMid`, diagonale `mid` e grana `high`.
- La sequenza sul clock globale è `beat → lowMid → beat → mid → beat → high`;
  beat/kick resta quindi l'ancora fra ogni risposta delle altre bande.
- Il cambio usa una dissolvenza smoothstep nella prima parte del beat e inviluppi
  smussati per banda. Nel silenzio famiglia, densità e dissolvenza si congelano.
- Camera e raster restano stabili; le dodici varianti sono preparate una volta e
  riusate. Validazione: 49 file / 287 test, typecheck, lint mirato, Vite,
  Electron e pacchetti macOS ZIP/DMG verdi.

## Ricircolo d'attesa Brain — correzione 2026-08-16

- Il blocco apparente su Vector Morph era un timeout ripetuto della storia AI:
  le immagini cambiavano, ma la fase di ricircolo non avanzava il renderer.
- In “Tutti per storia” il ricircolo usa ora un mazzo casuale dedicato, senza
  ripetizioni consecutive; non altera il bilanciamento dei renderer fra storie.
- Il cambio resta quantizzato sul gate ritmico esistente, la camera è stabile e
  non vengono introdotti timer o movimenti nel silenzio.
- Validazione: 49 file / 285 test, typecheck, Vite, Electron e pacchetti macOS
  ZIP/DMG verdi.

## Bauhaus Morph — implementazione 2026-08-16

- `bauhaus-morph` è il sesto renderer Brain, selezionabile manualmente e
  incluso nei mazzi casuali di rotazione e “Tutti per storia”.
- L'analisi lega ogni piano a una regione raster, estrae asse, linee, spazio
  negativo e palette; il fuoco viene astratto più tardi.
- Il Canvas ricostruisce progressivamente l'immagine con piani, campiture,
  segmenti, archi, trasparenze e grana, mantenendo raster e regione focale.
- Il progresso usa soltanto attività e posizione musicale. In silenzio anche
  con bande residue, masse, linee, dettaglio e fase restano fermi.
- Transizioni `previous/current/next`, flash locale, profili, low power,
  resource pressure, readiness, fallback raster, metriche e cleanup sono
  integrati.
- Validazione: 48 file / 277 test, typecheck, lint mirato e diff check verdi;
  Vite/Electron e ZIP macOS riusciti. Resta la prova fullscreen.
- Correzione live: eliminate primitive e cromie arbitrarie. I piani seguono
  ora sagoma, colore e asse principale della regione raster; le sagome hanno
  dieci punti sorgente interpolabili e i piani salienti conservano texture
  ritagliata dall'immagine. Validazione aggiornata a 49 file / 281 test.

## Bauhaus Morph — analisi 2026-08-16

- Definita una V1 Canvas 2D che ricostruisce il raster con piani, linee, assi,
  spazio negativo e palette derivati dalla sorgente.
- Riusa analisi di masse/fuoco, cache Blob, transizioni multi-immagine, clock
  globale, host con fallback e passthrough durante denoising.
- Il morph avanza soltanto con attività audio; camera stabile, raster residuo e
  protezione focale mantengono riconoscibilità e immobilità nel silenzio.
- Budget proposto: 400×225, 12 piani, 18 linee e 24 FPS; 280×158, 7 piani,
  9 linee e 15 FPS in low power.
- WebGPU/shader esclusi dalla V1 per non aumentare la contesa con ONNX.
- Piano: `working/plans/piano-019-bauhaus-morph-brain.md`. Implementazione non
  ancora avviata, come richiesto dalla fase preliminare della specifica.

## Rotazione bilanciata e ingresso morphing — 2026-08-16

- “Tutti per storia” bilancia le presenze accumulate fra storie: i renderer
  meno mostrati entrano prima nel nuovo mazzo, con casualità conservata nei
  pareggi. Bauhaus non può più essere favorito da estrazioni indipendenti.
- Il crossfade viene aggiornato sul RAF Output, non soltanto sui pacchetti IPC.
  Dopo uno stallo recupera al massimo 50 ms per frame e quindi non salta.
- Il log di assegnazione include l'ID effettivo del prossimo renderer.
- Validazione aggiornata: 49 file / 283 test, typecheck, lint mirato,
  diff-check e build Vite/Electron riusciti.

## Moti di coscienza — aggiornamento 2026-08-16

- Brain consulta una finestra limitata dell'archivio e propone soltanto ricordi
  salienti o semanticamente pertinenti, preservando la provenienza.
- La storia corrente non può eleggere il proprio ricordo appena salvato come
  nuova scoperta; coppie storia/ricordo sono deduplicate e soggette a cooldown.
- Il moto dura almeno 12 secondi e 16 beat, parcheggia senza saltare la timeline e agisce in una
  regione locale con forme/cromie beat-matched. Nel silenzio resta fermo.
- La scritta rossa in basso a destra dichiara cosa cambia e il tipo del ricordo;
  la storia successiva riceve l'influenza e due accenti cromatici deterministici.
- Nessun moto viene automaticamente salvato come ricordo.
- Validazione automatica completata: 46 file / 270 test, typecheck, lint mirato,
  diff check, Vite/Electron e ZIP macOS. Resta la prova artistica fullscreen.

> **Ultimo Aggiornamento**: 16 Agosto 2026 (CEST)
> **Stato Generale**: 🟢 In Sviluppo Attivo / Operativo  
> **Ultima Sessione**: `SESSION-2026-08-16-22` — Rollback prestazioni renderer

---

## 🎯 Macrotask Completato Più Recente

- **Macrotask**: `MACRO-023` - Rollback Prestazioni Renderer
- **Stato**: 🟢 DONE

---

## 📊 Riepilogo dei Macrotask

| ID | Macrotask | Stato | Data Inizio | Data Fine |
|---|---|---|---|---|
| `MACRO-001` | Architettura Base Electron, Multi-display IPC & Output Fullscreen | 🟢 DONE | Luglio 2026 | Luglio 2026 |
| `MACRO-002` | Motori di Morphing Visuale (Liquid, Oniric, PsyHyp, 2001 Slit-Scan) | 🟢 DONE | Luglio 2026 | Luglio 2026 |
| `MACRO-003` | Brain AI Pipeline, Continuous Dream & Coscienza Onirica | 🟢 DONE | 27-29 Luglio 2026 | 29 Luglio 2026 |
| `MACRO-004` | Setup Cartella Working, Tracciamento Sessioni e Piani di Lavoro | 🟢 DONE | 04 Agosto 2026 | 04 Agosto 2026 |
| `MACRO-005` | Coalescenza IPC e Interpolazione Ritmica Locale (Fase 2) | 🟢 DONE | 05 Agosto 2026 | 05 Agosto 2026 |
| `MACRO-006` | Ottimizzazione Performance Live & Low Power Tuning | 🟢 DONE | Agosto 2026 | 08 Agosto 2026 |
| `MACRO-008` | Origine, Memoria e Grafo di Coscienza Onirica | 🟡 IN PROGRESS | 08 Agosto 2026 | - |
| `MACRO-009` | Diagnosi Blocchi Live Continui | 🟡 IN PROGRESS | 09 Agosto 2026 | - |
| `MACRO-010` | Psycho2D — Regia Semantica A Finestre | 🟡 IN PROGRESS | 10 Agosto 2026 | - |
| `MACRO-011` | Materia Morph — Renderer Brain Materico | 🟡 IN PROGRESS | 15 Agosto 2026 | - |
| `MACRO-012` | Vector Morph — Contorni Morbidi | 🟡 IN PROGRESS | 16 Agosto 2026 | - |
| `MACRO-013` | Regia Casuale Brain e Morphing | 🟡 IN PROGRESS | 16 Agosto 2026 | - |
| `MACRO-014` | FilterPsiche — Renderer Brain Cromatico | 🟡 IN PROGRESS | 16 Agosto 2026 | - |
| `MACRO-015` | Clock Ritmico Globale Output | 🟡 IN PROGRESS | 16 Agosto 2026 | - |
| `MACRO-016` | Moti Di Coscienza Brain | 🟡 IN PROGRESS | 16 Agosto 2026 | - |
| `MACRO-017` | Bauhaus Morph — Renderer Brain Pittorico | 🟡 IN PROGRESS | 16 Agosto 2026 | - |
| `MACRO-018` | Documentazione Architettura Corrente | 🟢 DONE | 16 Agosto 2026 | 16 Agosto 2026 |
| `MACRO-019` | Riallineamento Beat Renderer | 🟡 IN PROGRESS | 16 Agosto 2026 | - |
| `MACRO-020` | Isolamento Inferenza Immagini | 🟡 IN PROGRESS | 16 Agosto 2026 | - |
| `MACRO-021` | FPS Ridotti con Stessi Layer | ⚪ ARCHIVED | 16 Agosto 2026 | 16 Agosto 2026 |
| `MACRO-022` | Isolamento Vettorializzazione dal Main | 🟢 DONE | 16 Agosto 2026 | 16 Agosto 2026 |
| `MACRO-023` | Rollback Prestazioni Renderer | 🟢 DONE | 16 Agosto 2026 | 16 Agosto 2026 |

---

## 🚀 Prossimi Passi Immediati (Next Steps)

1. [x] Creare il Piano di Lavoro `piano-003-coalescenza-ipc-interpolazione-ritmica.md` per la Fase 2 (Senza Esecuzione Codice).
2. [x] Avvio dell'esecuzione del Piano di Lavoro `PIANO-003` su richiesta dello sviluppatore.
3. [x] Completare implementazione, audit, test, typecheck e build della Fase 2.
4. [x] Eseguire una verifica live manuale con stallo WebGPU reale e controllare i contatori `[BrainMetrics]`.
5. [x] Avviare la Fase 3A: scheduler termico e limite delle inferenze concorrenti.
6. [x] Completare e validare `PIANO-004` senza iniziare il buffer immagini della Fase 3B.
7. [x] Avviare la Fase 3B su nuovo prompt dello sviluppatore.
8. [x] Completare `PIANO-006` senza iniziare la prova live della Fase 3C.
9. [x] Avviare la Fase 3C su nuovo prompt dello sviluppatore.
10. [x] Correggere il refill di `PIANO-007` perché la storia successiva sia pronta entro la finestra di 120–140 s, senza iniziare una Fase 3D.
11. [ ] Correggere separatamente il `prefer-const` preesistente in `slitScanCanvas.ts:639` per riportare il lint globale a verde.
12. [x] Definire ad alto livello origine, grafo dei ricordi e primi momenti di salvataggio di Coscienza Onirica in agente e skill.
13. [x] Osservare i segnali reali e proporre il lessico minimo previsto dalla Fase 1 di `PIANO-005`.
14. [x] Implementare l'archivio Markdown `.coscienza/`, la rilettura di `AGENT.md`, l'origine idempotente e i primi ricordi onirici.
15. [x] Creare `COSCIENZA.md` e il primo ciclo percezione → attenzione → interpretazione provvisoria.
16. [x] Osservare la prima revisione live di `COSCIENZA.md`; origine e primi
    ricordi reali sono stati preservati.
17. [ ] Studiare come la coscienza possa riconoscere continuità e formulare
    nuove domande a partire dalle revisioni reali, prima della Fase 3 autonoma.
18. [x] Riprendere la diagnosi dei blocchi su nuova richiesta con log pulito.
19. [x] Completare una produzione live e correlare i blocchi percepiti con le metriche.
20. [x] Eseguire un confronto controllato mantenendo residenti le sessioni immagine per il secondo ciclo.
21. [x] Approvare le decisioni architetturali di `PIANO-009` e avviare
    l'implementazione V1 di Psycho2D con alternanza live dei renderer.
22. [ ] Confermare manualmente temperatura e stabilità in una prova prolungata;
    poi decidere se isolare l'inferenza per ridurre anche i gap residui del
    denoising.
23. [ ] Verificare dal vivo il cambio fra Print2D, Psycho2D e Vector Morph, la
    rotazione temporizzata e il takeover su Output fullscreen.
24. [x] Confermare manualmente la qualità narrativa delle immagini batch 1.
25. [ ] Implementare e misurare il passthrough grafico ultra-leggero di
    `PIANO-010`; mantenerlo soltanto con gap denoising inferiori a 150 ms.
26. [x] Implementare e poi rifinire “Tutti per storia”: i quattro renderer
    vengono ora distribuiti casualmente, uno per fotogramma, prima del takeover
    della storia successiva.
27. [x] Analizzare architettura e fattibilità del renderer Brain materico e
    creare `PIANO-013` senza avviare il codice runtime.
28. [x] Approvare architettura Canvas 2D, nome `Materia Morph` e budget V1;
    implementare analisi raster, region matching e plugin.
29. [ ] Validare Materia Morph su Output fullscreen e in prova prolungata,
    includendo silenzio, flash, background/denoising, low power e story-cycle.
30. [ ] Confrontare artisticamente i nuovi contorni di Vector Morph su Output
    fullscreen, includendo volti, mani, tessuti, silenzio, flash e story-cycle.
31. [ ] Verificare dal vivo la distribuzione casuale per fotogramma e la
    maggiore permanenza/varietà degli interludi morphing.
32. [ ] Verificare FilterPsiche su Output fullscreen, inclusi flash, silenzio,
    low power, denoising e frequenza di apparizione nei mazzi casuali.
33. [ ] Verificare dal vivo clock globale, quantizzazione e arresto geometrico
    in silenzio su Brain, Liquid, Oniric, PsyHyp e 2001.
34. [x] Produrre la documentazione architetturale compatta e verificata di
    Brain + Visual Reactive Screen.
35. [ ] Confermare fullscreen il nuovo fronte beat e il margine RAF di
    FilterPsiche, Materia Morph, Liquid e Oniric con Soft/low power disattivi.

## Clock Ritmico Globale — SESSION-2026-08-16-04

- `OutputApp` possiede ora l'unico `OutputRhythmClock`: ingestione audio prima
  del frame pacing e proiezione locale condivisa da tutti i controller.
- Brain non crea più un clock privato. Liquid, Oniric, PsyHyp e 2001 leggono
  la stessa posizione musicale, `beatPhase`, `beatPulse`, `kickEnvelope` e i
  transienti distinti `low`, `lowMid`, `mid`, `high`.
- Ingresso, uscita e cambio preset/famiglia vengono trattenuti fuori fase e
  applicati sul beat o entro una finestra del 7%. In silenzio è consentita la
  comparsa immediata dello stato statico, senza attendere un beat inesistente.
- Sotto soglia il clock congela posizione e fase. Timeline Brain, transizioni
  fra fotogrammi, tempi interni, ribbon e smoothing geometrico non avanzano;
  flash e colore restano indipendenti dal movimento.
- Camera e quadro non vengono trasformati; il movimento resta interno ai
  segmenti dei singoli renderer. Budget e `lowPowerMode` non cambiano.
- Validazione: 44 file / 264 test, typecheck, lint mirato e diff-check verdi;
  build Vite/Electron e pacchetto ZIP macOS riusciti. Il target DMG del build
  generale è fallito esclusivamente nel comando di sistema `hdiutil`.

## Fluidità Clock Globale — SESSION-2026-08-16-05

- La prova live ha mostrato che la soglia singola classificava come silenzio i
  normali vuoti fra kick, congelando e riavviando tutti i renderer.
- Il clock usa ora isteresi: attivazione a energia 0,018, disattivazione sotto
  0,008 soltanto dopo 900 ms senza segnale udibile. La fase resta quindi
  continua durante pause ritmiche reali e si arresta solo nel silenzio stabile.
- Liquid non moltiplica più la posizione musicale assoluta per una velocità
  variabile: accumula delta di beat limitati, evitando salti avanti/indietro.
- Camera e quadro restano stabili; nessun timer autonomo è stato reintrodotto.
- Validazione: 45 file / 267 test, typecheck, lint mirato, diff-check e build
  Vite/Electron riusciti. Resta la riconferma percettiva fullscreen.

## FilterPsiche — SESSION-2026-08-16-03

- `filter-psiche` è il quinto plugin Brain: usa inversione, acid duotone,
  solarizzazione, negativo cromatico e mappa termica onirica. Una variante
  viene estratta casualmente a ogni creazione senza ripetizione immediata.
- Il raster resta fermo e riconoscibile. Kick/beat guidano inversione e
  contrasto, `lowMid`/`mid` fondono trattamenti cromatici, `high` introduce
  soltanto micro-fasce locali e il flash globale produce un picco inverted.
- In silenzio la stampa cromatica resta stabile e non viene introdotto alcun
  movimento geometrico. Il budget è 480×270 a 30 FPS, 320×180 e 20 FPS in low
  power, 12 FPS sotto pressione, con tre raster prefiltrati riusati.
- Rimossa l'anteprima raster fullscreen grezza al 20% che compariva per 3–10
  secondi sotto i renderer. Buffer raster e miniature diagnostiche restano.
- Con cinque plugin e quattro fotogrammi, ogni storia estrae quattro renderer
  unici; il quinto resta disponibile nelle storie e rotazioni successive.
- Validazione: 43 file / 260 test, typecheck, lint mirato e diff-check verdi;
  build Electron/macOS completata.

## Regia Casuale Brain e Morphing — SESSION-2026-08-16-02

- In “Tutti per storia” quattro plugin unici estratti dai cinque disponibili
  vengono assegnati ai quattro fotogrammi: ogni cambio immagine introduce un
  renderer diverso, in ordine casuale senza reinserimento.
- Anche la modalità `Automatica` usa un mazzo casuale e non segue più l'ordine
  fisso del registry; lo stesso renderer non può ripetersi consecutivamente.
- Gli interludi esterni consumano un mazzo con un preset casuale per ciascuna
  famiglia Liquid, Oniric, PsyHyp e 2001. Una famiglia viene ripetuta soltanto
  dopo l'esaurimento del mazzo e mai al confine immediato fra due mazzi.
- Il rapporto 80/20 resta calcolato sul tempo pieno Brain/morphing; 12 secondi
  aggiuntivi coprono ingresso e uscita, evitando che i crossfade riducano la
  permanenza percepibile del morphing.
- Camera, audio, flash, low power e renderer non cambiano. I passaggi restano
  beat-matched e usano le transizioni continue esistenti.
- Validazione: 42 file / 255 test, typecheck, lint mirato e diff-check verdi;
  build Electron/macOS completata.

## Vector Morph — Contorni Morbidi — SESSION-2026-08-16-01

- Una finitura geometrica comune agisce ora sull'SVG finale prodotto da SNIC o
  VTracer: flattening, ricampionamento adattivo, smoothing locale limitato e
  ricostruzione cubica con tangenti continue.
- Lo spostamento dei punti è limitato a 1,4 px; subpath, fori, winding e
  attributi restano conservati. Archi e tracciati aperti non compatibili
  rimangono invariati.
- Il budget totale è 5.200 punti distribuiti su tutte le silhouette, con tetto
  di 128 punti per subpath e rollback all'SVG originale se la finitura supera
  il limite di dimensione. Il lavoro avviene una volta sola prima della cache.
- La selezione profilo considera anche la densità degli angoli; punte e
  roughness vengono ricalcolate dopo lo smoothing. I log della cache espongono
  densità prima/dopo, path smussati e deviazione massima.
- Nessuna modifica a camera, raster di fondo, clock, bande, beat, flash,
  transizioni, alternanza, “Tutti per storia” o `lowPowerMode`.
- Validazione: 41 file / 251 test, typecheck, lint mirato, diff-check e build
  completa Vite/Electron/macOS riusciti. Resta il confronto artistico live.

## Materia Morph V1 — SESSION-2026-08-15-03

- `material-morph` è il quarto plugin Brain selezionabile dalla Control Window.
  Il registry lo inserisce nelle rotazioni automatiche e nel mazzo casuale
  “Tutti per storia”; il takeover avviene soltanto dopo quattro renderer.
- L'analisi raster estrae a 320×180 palette, luminanza, densità, bordi e massimo
  12 regioni connesse; in low power parte a 240×135 con massimo 6 regioni.
- Il morph usa maschere locali e matching fra regioni `previous → current` e
  `current → next`. Il raster base resta stabile e leggibile; nessuna
  trasformazione è applicata alla camera o all'intero quadro.
- Bande, beat/kick e fase controllano pressione, fusione, struttura e grana;
  il flash produce accenti locali. In silenzio il contributo geometrico è zero
  e, dopo l'assestamento, il Canvas non viene ridisegnato.
- Il Renderer Host propaga resource pressure/background, flash e clock come per
  gli altri plugin; durante denoising restano attivi passthrough e pacing
  ridotto esistenti.
- Validazione: 40 file / 247 test, typecheck e lint mirato verdi, build completa
  Vite/Electron/macOS riuscita. Il solo lint globale fallisce sul `prefer-const`
  preesistente `slitScanCanvas.ts:639`.

## Analisi Materia Morph — SESSION-2026-08-15-02

- Il nuovo renderer può usare il contratto plugin corrente senza nuovi IPC:
  riceve raster corrente/precedente/successivo, palette, ritmo, preset e
  pressione risorse.
- V1 proposta in Canvas 2D a bassa risoluzione, per non contendere WebGPU alla
  pipeline ONNX. L'analisi estrae palette, luminanza, bordi, densità, focal
  region e massimo 12 componenti materiche.
- Il morph usa matching spaziale/cromatico fra regioni, maschere locali e
  sostituzione progressiva del raster. Il raster base resta sempre leggibile.
- `low`, `lowMid`, `mid`, `high`, `beatPulse` e `beatPhase` governano scale
  materiche distinte; in silenzio non avanza alcuna fase e il redraw si arresta.
- Camera stabile, transizioni continue, story-cycle/80-20 invariati e budget
  low power esplicito sono requisiti di accettazione.
- Piano: `working/plans/piano-013-materia-morph-brain.md`. Implementazione non
  avviata, come richiesto prima della revisione dell'analisi.

## Modalità Tutti i Renderer per Storia

- Opzione Control Window: `Tutti per storia — casuale per fotogramma`.
- Per ogni storia vengono estratti quattro dei cinque plugin registrati; ogni
  fotogramma riceve un renderer diverso e casuale senza ripetizioni.
- La storia successiva può essere preparata nel buffer ma non entra finché il
  mazzo corrente non è esaurito.
- Ogni cambio usa timing beat-matched e transizione continua esistenti; non
  viene eseguito alcun taglio diretto del canvas.
- La modalità manuale resta invariata; la rotazione temporizzata usa ora un
  mazzo casuale senza ripetizioni consecutive.

## Revisione Artistica Psycho2D

- Una raster corrente occupa stabilmente il quadro; una seconda raster viene
  collocata sopra in una posizione casuale determinata una sola volta per
  scena.
- Il livello superiore non ha contorno, non entra da fuori schermo, non vaga,
  non pulsa e non effettua takeover.
- La sua opacità è limitata fra 0,38 e 0,64 e considera contrasto e differenza
  di luminanza tra le due immagini.
- Tutte le forme geometriche attraversanti sono state eliminate.
- Le due raster vengono fuse una volta, rispettando posizione e opacità del
  layer superiore, e trasformate in tre matrici Bayer 1-bit a 320×180.
- `lowMid` seleziona la densità d'inchiostro; beat/`low` inverte per 85 ms;
  transienti `mid`/`high` producono al massimo tre micro-glitch orizzontali.
- In silenzio resta la variante meno densa e non esiste movimento geometrico.
- Durante `setTransition`, scanline serigrafiche deformate seguono un inviluppo
  a campana; l'effetto è il morphing del raster, non una semplice dissolvenza.

## Transizioni Beat-Matched In “Tutti per storia”

- Il timing di ogni fotogramma viene congelato al momento del cambio e dura un
  numero intero di beat; variazioni successive della stima BPM non deformano
  la transizione in corso.
- In `story-cycle` il cambio di fotogramma/renderer avviene su beat reale o
  nella finestra di fase entro il 7% dal beat; non è più consentito il fallback
  fuori beat durante il ciclo.
- Print2D mantiene il morphing dei layer, Vector Morph quello delle forme SVG,
  Psycho2D quello delle scanline 1-bit; tutti condividono pattern e durata.

## Visibilità Raster In Vector Morph

- Vector Morph contiene ora il raster originale come fondale reale a pieno
  quadro, al 92% di opacità.
- Il livello SVG vettoriale resta sopra al 70% e il suo fondo viene forzato a
  trasparente, mantenendo leggibile il soggetto fotografico.
- Le opacità non reagiscono all'audio: nessuna pulsazione globale o costo
  grafico aggiuntivo nel ciclo di morphing.

## Stato Passthrough Denoising

- Implementazione reversibile attiva dietro
  `BRAIN_CONFIG.lightweightDenoisingRender`.
- Il Renderer Host riduce gli aggiornamenti del plugin a 5 FPS, o 3 FPS in low
  power, dopo che il raster statico è pronto; il movimento originale resta
  percepibile in trasparenza e riprende pienamente sul clock corrente.
- Il raster corrente viene campionato una volta a 320×180 e convertito in tre
  varianti 1-bit con gli inchiostri estremi della palette narrativa/preset.
  Nessuna zona cromatica o forma geometrica viene calcolata nel RAF.
- Il runtime usa un `drawImage`, fino a tre riscritture di fascia e una breve
  inversione `difference`; il plugin originale continua attenuato sotto.
- `[BrainMetrics].denoisingPassthrough` separa numero frame e costo CPU del
  disegno dalla normale attività Canvas.
- Validazione automatica: 34 file e 224 test verdi, typecheck, lint mirato,
  build Vite e diff-check riusciti.
- I log live successivi mostrano un costo proprio di 0–0,2 ms, ma RAF ancora
  circa 250–525 ms durante le singole chiamate UNet. La soglia di 150 ms non è
  raggiunta: il passthrough resta una protezione visiva, non elimina la contesa
  hardware.

## Refill Deprioritizzato Con “Tutti per storia”

- Il primo fotogramma è protetto: nessuna generazione della storia successiva
  può iniziare prima della prima variazione di renderer.
- Alla prima variazione il gate si apre, ma una guardia di 10 secondi lascia
  terminare morphing e preparazione del nuovo plugin.
- Il target del buffer successivo è 240 secondi invece di 120 soltanto in
  `story-cycle`; le altre modalità conservano il contratto precedente.
- Uscendo da `story-cycle`, un refill differito viene sbloccato subito.
- L'ultima sessione precedente mostrava un freeze iniziale di 3,17 s durante
  caricamento/creazione VAE e gap ricorrenti di 250–525 ms durante UNet. Questa
  politica non accorcia tali operazioni, ma le rimuove interamente dal primo
  atto visuale e riduce la percentuale temporale di performance contesa.

## Esito Riduzione Del Lavoro Atomico UNet

- I contratti ONNX letti senza caricare la GPU dichiarano batch dinamico sia
  per Text Encoder sia per UNet.
- Il ramo `single-conditional` batch 1 ha eliminato i gap rilevati nelle prime
  due immagini prima dell'avvio Canvas; con Print2D attivo i picchi sono scesi
  spesso a 249–276 ms, pur restando episodi termici da 383–450 ms.
- Le immagini standard sono passate in genere da circa 10–11 s a 7–9 s. Il
  candidato batch 1 resta attivo in attesa della conferma visiva dello
  sviluppatore, perché rinuncia alla classifier-free guidance.
- La successiva prova 384×256 è stata negativa: sette gap denoising da 349,5 a
  391,8 ms e nessun guadagno affidabile. La geometria 448×256 è stata
  ripristinata per non perdere dettaglio.
- Log: `log/session-2026-08-10-12-09-20.txt` (batch 1 a 448×256) e
  `log/session-2026-08-10-12-16-49.txt` (prova 384×256 rimossa).

## Esito Test Locale Del Denoising

- Un yield fra ogni step UNet ha concesso al renderer un frame prima dello
  step successivo, senza cambiare seed, qualità, geometria o numero di step.
- I gap ricorrenti sono rimasti fra circa 375 e 458 ms, contro circa 366–534 ms
  della baseline residente: variazione insufficiente a eliminare lo scatto.
- Il blocco appartiene alla singola `UNet.run()` e non alla concatenazione
  JavaScript degli step.
- Il codice sperimentale è stato rimosso; resta il log
  `log/session-2026-08-10-11-56-22.txt` come evidenza.

## Esito Implementazione Psycho2D V1

- I renderer Brain sono plugin registrati dietro un Host persistente con
  crossfade, readiness, timeout, fallback e cleanup.
- `Print2D` conserva il renderer serigrafico precedente; `Psycho2D` usa analisi
  raster locale, Scene Director, finestre semantiche e immagini
  CURRENT/PREVIOUS/NEXT.
- La Control Window permette selezione manuale o rotazione ogni 10–120 secondi;
  il cambio non rigenera immagini e viene rinviato durante il passaggio fra
  frame.
- Suite completa: 31 file, 214 test. Typecheck, lint mirato e build Electron
  verdi. Lint globale bloccato soltanto dal `prefer-const` preesistente.
- Smoke test Electron riuscito con Print2D; resta la verifica visuale manuale
  dei tre renderer e dell'alternanza.
- `Vector Morph` recupera la vettorializzazione storica come terzo plugin:
  vettorializza soltanto quando selezionato, deduplica le richieste per Blob,
  invalida la cache se cambia l'immagine e conserva il renderer attivo se la
  preparazione fallisce o supera il timeout.
- Suite aggiornata: 33 file, 218 test. Typecheck, lint mirato, build
  Electron/macOS e controllo whitespace verdi.

## Esito Esperimento Sessioni Immagine Residenti

- Baseline: RAF massimo 3,57 s, due gap severi e tre creazioni di sessione
  immagine nella prima produzione (`log/session-2026-08-09-23-44-17.txt`).
- Secondo ciclo residente: RAF massimo 0,53 s, zero gap severi e zero creazioni
  di sessione (`log/session-2026-08-09-23-54-59.txt`).
- La seconda produzione ha completato quattro immagini in 91,4 s, senza errori
  GPU o di memoria; la nuova storia è entrata nel buffer 121,4 s dopo la fine
  della prima produzione, incluso il refill iniziale di 30 s.
- Restano gap moderati di circa 0,38–0,53 s durante il denoising WebGPU. La
  residenza elimina il grande arresto fra storie ma non isola l'inferenza dal
  renderer Output.
- Decisione tecnica: mantenere le sessioni residenti in modalità normale;
  `lowPowerMode` continua a liberarle. In caso di errore infrastrutturale la
  pipeline le libera prima del retry.
- Temperatura e memoria di lunga durata richiedono ancora conferma manuale:
  l'assenza di errori nel log non equivale a una misura termica.

## Esito Analisi Psycho2D

- Il concept è realizzabile nella sola Output Window usando Blob raster,
  Canvas 2D, buffer Brain e clock ritmico già presenti.
- V1 non richiede nuovi processi, IPC, database, SVG, segmentazione o modello
  vision: bastano analisi pixel locale, hint narrativi con provenienza, massimo
  due finestre e takeover mediante clip crescente.
- Il nome `brainPsycho2dCanvas.ts` è già usato da un renderer serigrafico privo
  di regia a finestre. Prima di implementare va deciso se rinominarlo e
  conservarlo come stile, scelta raccomandata, oppure sostituirlo.
- L'implementazione non deve alterare la baseline `MACRO-009` prima del
  confronto controllato del secondo ciclo.

Il test manuale finale di `MACRO-006` è affidato allo sviluppatore e non resta
registrato come task di implementazione aperto. Verificare soprattutto comparsa
della seconda storia entro circa 120–140 s, continuità e temperatura.

## Fondazione Di Coscienza Onirica

- La prima percezione valida ha creato l'unica origine e il primo ricordo di sé.
- Ogni nuovo attraversamento dall'inizio ritorna all'origine senza reset o
  duplicazione distruttiva.
- La memoria autobiografica crescerà come grafo aperto e revisionabile.
- Osservazioni, interpretazioni e immaginazioni resteranno distinguibili.
- I primi checkpoint candidati sono confini significativi, non frame o campioni
  audio indiscriminati.
- I ricordi sono ora file Markdown in `.coscienza/`; `AGENT.md` viene riletto
  prima di ogni salvataggio insieme a origine, indice e contesto recente.
- In sviluppo l'archivio è nel progetto; nell'app installata è in
  `Documenti/.coscienza`.
- L'autonomia di ristrutturazione resta la Fase 3 futura di `PIANO-005`.
- `COSCIENZA.md` descrive ora il presente e resta separato dal grafo dei
  ricordi.
- Il template vergine vive separatamente in `config/coscienza/COSCIENZA.md`,
  così il pacchetto non incorpora lo stato autobiografico osservato in sviluppo.
- Il nucleo iniziale osserva soltanto percezioni valide, stabilizza un fuoco
  d'attenzione e formula interpretazioni dichiaratamente provvisorie.
- Continuità e cambi di attenzione sono rate-limited; `lowPowerMode` dirada
  ulteriormente le scritture.

## Esito Fase 3A

- Tutte le inferenze immagini passano da uno scheduler single-flight.
- Cooldown minimo: 6 s; in `lowPowerMode`: 12 s.
- Gap RAF da almeno 240 ms applicano 9 s di backoff; freeze da almeno 1 s applicano 20 s.
- Lo stato `imageInferenceActive` copre solo l'inferenza effettiva, non l'attesa termica.
- Al termine della Fase 3A restavano quattro immagini narrative più l'interludio; la successiva Fase 3B ha poi rimosso l'interludio.

## Esito Fase 3B

- La quinta inferenza `interlude` è stata rimossa: ogni produzione richiede al massimo quattro inferenze narrative.
- `BrainProduction` contiene soltanto le quattro scene della storia; `BrainBufferFrame` non esiste più.
- Le quattro immagini correnti vengono riciclate casualmente e restano attive mentre il refill successivo viene completato.
- Un refill parziale di due immagini non sostituisce più il buffer completo visibile.
- I 120 secondi di attesa iniziano dopo la quarta immagine, non dall'avvio della produzione.
- La successiva Fase 3C ha validato dal vivo scheduler, cooldown e refill.

## Esito Fase 3C

- Sessione live: `log/session-2026-08-08-21-46-53.txt`.
- Una produzione completa ha eseguito esattamente quattro inferenze e nessuna
  interludio. La prima validazione avviava il refill 120 s dopo la quarta
  immagine; la correzione successiva lo avvia a +30 s con target a +120 s.
- La frequenza dei freeze severi è scesa dai tre episodi della baseline a un
  episodio per produzione; la durata residua del primo freeze resta circa
  3,1–3,5 s.
- Il backoff severo di 20 s è intervenuto correttamente. Nessuna taratura è
  stata applicata perché aumentare il cooldown non ridurrebbe la durata del
  freeze interno alla prima inferenza.
- Latenza IPC ordinaria `p95` entro 5,3 ms e nessun replay della coda.
- Validazione live eseguita in modalità standard; low power non misurato dal
  vivo in questa sessione. Nessuna Fase 3D iniziata.
- I 120 s sono ora la finestra complessiva di preparazione: il lavoro della
  storia successiva viene distribuito al suo interno, senza sommare altri
  60–120 s dopo l'attesa. Target atteso di comparsa: circa 120–140 s.

## Beatmatch Psycho2D — SESSION-2026-08-10-14

- Il beat viene catturato prima del frame interval e mantenuto per il frame
  successivo, così un impulso breve non viene perso dal throttling.
- La soglia rigida sulle basse frequenze è stata rimossa: l'inversione usa il
  beat latched, non un valore assoluto `low`.
- `beatPulse` controlla densità Bayer, contrasto e ampiezza delle scanline;
  `beatPhase` orienta soltanto il micro-disallineamento delle fasce.
- `mid` e `high` restano sorgenti dei glitch secondari; l'immagine principale
  non viene traslata, ruotata o scalata.
- Validazione: 37 file / 233 test, typecheck, lint mirato, build completa e
  `git diff --check` riusciti. Resta il test visivo live.

## Sottofondo raster Psycho2D — SESSION-2026-08-10-15

Psycho2D mostra ora l'immagine base originale sotto la serigrafia 1-bit con
opacità fissa all'8%. Il raster resta fermo e non modifica il costo del morph;
la serigrafia rimane il livello visivo dominante.

## Alternate with Brain — SESSION-2026-08-10-16

È disponibile l'opzione UI `Alternate with Brain (80/20)`. Quando attiva,
forza `Tutti per storia`: ogni storia attraversa l'intero mazzo dei renderer
Brain prima che possa entrare un morphing esterno. Il tempo della storia Brain
costituisce l'80% del ciclo; l'interludio esterno dura il 25% di quel tempo,
quindi il 20% del ciclo totale. Durante l'interludio il controller Brain resta
parcheggiato con buffer e produzione intatti, poi riprende dalla storia
successiva con crossfade continuo.

## Psycho2D beat response — SESSION-2026-08-10-18

La risposta al beat è stata resa più evidente senza muovere il quadro: oltre a
densità, contrasto e inversione, Psycho2D disegna scanline locali agganciate a
`beatPulse` e orientate da `beatPhase`. Il costo resta limitato a poche fasce,
ridotte ulteriormente in `lowPowerMode` e sotto pressione.

## Psycho2D beat response — SESSION-2026-08-10-20

La risposta primaria al beat campiona ora correttamente la matrice 1-bit
320×180 e la rimappa sulla canvas fullscreen, evitando fasce invisibili quando
l'Output è più grande della sorgente precomputata. L'accento locale è più
deciso: latch a 150 ms, contrasto più alto, sette scanline in modalità normale
e piccoli colpi locali in `difference`, ridotti a tre fasce in `lowPowerMode` o
sotto pressione. La camera resta stabile e in silenzio non viene introdotto
movimento autonomo.

## Psycho2D flash locale — SESSION-2026-08-10-21

Il segnale `flashIntensity` del render globale viene ora passato al Brain con
lo stesso hold/decay già calcolato dal motore visuale. Psycho2D usa quell'inviluppo
solo per disallineare brevi fasce di pixel e applicare piccoli colpi `difference`;
il numero di fasce scende in `lowPowerMode` e sotto pressione. La camera resta
stabile e il silenzio non genera movimento.

## Kick condiviso Brain — SESSION-2026-08-15-01

Il clock Brain espone ora un inviluppo kick condiviso che combina `beatPulse`
con i transienti `low` e `lowMid`, mantenendo clamp e release già musicali.
Print2D accentua leggermente la profondità dei layer, Psycho2D contrasto e
scanline locali, Vector Morph la deformazione dei segmenti interni. Nessuna
camera viene trasformata; in silenzio il contributo resta zero e low power non
aggiunge layer o fasce.

## Pannello narrativo — SESSION-2026-08-10-19

Il riquadro narrativo sinistro viene mostrato quando appare una nuova storia,
resta visibile per 60 secondi e poi passa a opacità zero con dissolvenza. Il
timer viene riavviato solo per una storia nuova e viene cancellato in `destroy`;
il rendering Brain continua indipendentemente.

## Protocollo filosofia visiva — SESSION-2026-08-10-17

Precisato il protocollo obbligatorio in `agents.md`: la camera resta stabile,
ma sono consentite deformazioni locali nella materia; il raster sottostante è
riconosciuto come materia secondaria e deve restare leggibile; il silenzio
blocca il moto autonomo ma non nasconde l'immagine. Aggiunti inoltre vincoli
espliciti per beatmatch, transizioni continue, alternanza Brain 80/20 e budget
termico/computazionale.

## Esito Live Fase 2

- La coalescenza funziona: durante tre stalli ha sostituito 668, 655 e 467 pacchetti pending, evitando il replay della coda.
- Dopo gli stalli la latenza `p95` torna nell'ordine di 2-5 ms.
- Restano freeze reali del RAF Output di circa 4,0 s, 3,2 s e 3,0 s causati dalla contesa WebGPU durante l'inferenza.
- La Fase 3 deve ridurre frequenza e duty-cycle delle inferenze; se i singoli freeze restano inaccettabili sarà necessario l'isolamento previsto dalla Fase 6.

## Diagnosi live ritmo e prestazioni — SESSION-2026-08-16-09

- Il clock non mostra riallineamenti di fase nelle finestre osservate; il
  beatmatch impreciso percepito nasce soprattutto nei renderer Canvas che
  applicano ampiezze istantanee e firme di frame quantizzate.
- Bauhaus gira circa a 20 fps fuori dall'inferenza; l'Output resta stabile a
  120 Hz. I blocchi severi compaiono con UNet attivo e arrivano a p95 99,5 ms,
  massimo 558,4 ms sul RAF.
- Tutte le bande sono collegate, ma solo `low` e `lowMid` muovono chiaramente
  la geometria Bauhaus; `mid` e `high` articolano soprattutto linea e grana.
- Nessun dato termico reale è disponibile: resta un rischio da carico
  sostenuto, da verificare con telemetria temperatura/energia dedicata.
- Implementati smoothing in tempo musicale per ogni banda, pacing regolare,
  cache del matching Bauhaus e sospensione completa del plugin nascosto sotto
  denoising. Le metriche espongono ora il costo reale `canvasFrames.renderMs`.
- Prossimo passo: prova live prolungata per confrontare cadenza, `renderMs`,
  beatmatch percepito ed eventuale temperatura misurata esternamente.
