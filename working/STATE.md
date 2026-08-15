# Stato Globale del Progetto (`STATE.md`)

> **Ultimo Aggiornamento**: 10 Agosto 2026 (CEST)
> **Stato Generale**: 🟢 In Sviluppo Attivo / Operativo  
> **Ultima Sessione**: `SESSION-2026-08-10-22` — Alternanza Brain 80/20 calcolata per storia completa

---

## 🎯 Macrotask Completato Più Recente

- **Macrotask**: `MACRO-006` - Ottimizzazione Performance Live & Low Power Tuning
- **Stato**: 🟢 DONE (test manuale finale affidato allo sviluppatore)

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
26. [x] Implementare l'opzione Brain “Tutti per storia”: ogni renderer
    attraversa i quattro fotogrammi, in ordine casuale senza ripetizioni,
    prima del takeover della storia successiva.

## Modalità Tutti i Renderer per Storia

- Nuova opzione Control Window: `Tutti per storia — ordine casuale`.
- Per ogni storia viene estratto un mazzo dei tre plugin registrati; ciascun
  renderer attraversa l'intera sequenza di quattro fotogrammi una sola volta.
- La storia successiva può essere preparata nel buffer ma non entra finché il
  mazzo corrente non è esaurito.
- Il ritorno dal quarto al primo fotogramma usa la transizione morphing lunga
  esistente; non viene eseguito alcun taglio diretto del canvas.
- La modalità manuale e la rotazione temporizzata precedente restano
  disponibili e invariate.

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

- Il primo attraversamento completo dei quattro fotogrammi è ora protetto:
  nessuna generazione della storia successiva può iniziare.
- Al passaggio verso il secondo renderer il gate si apre, ma una guardia di 10
  secondi lascia terminare morphing e preparazione del nuovo plugin.
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
