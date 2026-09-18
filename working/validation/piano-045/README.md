# Verifica quattro immagini — PIANO-045 — 2026-09-17

**Esito complessivo: NON SUPERATO.** Corretto il troncamento; non dimostrata
la leggibilità di quattro momenti della stessa storia. Non confondere i test
verdi con il criterio artistico di accettazione.

## Diagnosi verificata
Il prompt composto arriva integro al worker, ma il tokenizer lo troncava a
77 posizioni (75 di contenuto). Il blocco Color Direction misura circa 68
token ed era in fondo. Residuo precedente, argomento e Color Direction
potevano quindi essere tagliati. L'UNet locale dichiara sequence_length
dinamica; il text encoder conserva il limite posizionale CLIP di 77.

## Correzione adottata
Tokenizzazione completa senza truncation; finestre da 75 token con BOS/EOS;
codifica separata e concatenazione degli embeddings nell'asse sequenza.
Nessuna media che mescoli i momenti, nessun riordino del testo o riscrittura
cromatica. CFG conserva separatamente le righe non condizionata e condizionata.
Gestiti float32 e float16 (inclusi runtime con Float16Array nativa), disposal
ed annullamento. Massimo 6 finestre / 450 token di contenuto; oltre il budget
si segnala errore, non si genera con un prompt mutilato. Il backend legacy,
non usato dal worker corrente, rifiuta ora l'overflow invece di troncarlo.
Nessuna modifica a seed, step, guidance mode, renderer o scheduler in produzione.

La tecnica è riscontrabile anche nella sorgente primaria Diffusers:
https://github.com/huggingface/diffusers/blob/main/examples/community/lpw_stable_diffusion.py
L'effettiva compatibilità del nostro artefatto è stata verificata generando
raster con ONNX Runtime Web/WebGPU in Electron, non dedotta dal solo riferimento.

## Metodo e risultati
Storia controllata completa in inglese: Mara, albero spoglio, riva, ciotola
crepata e radice argentea; apertura, legame ai polsi, fusione albero/radici,
ritorno alla ciotola con traccia dell'albero. Testo integrale nei JSON.
Fixture composta manualmente, non una nuova generazione Qwen. Seed 450–453;
non è un collaudo end-to-end audio→Qwen→scheduler→output.

Artefatti Realistic Vision V6 B1 FP16 correnti. Output 640×360, inferenza
448×256; 12 step single-conditional nel collaudo finale, come dichiarato
esplicitamente nel harness (i profili live possono usare altri numeri).

| Prova finale | Token completi | Blocchi | Codifica | Denoising + VAE |
|---|---:|---:|---:|---:|
| frame 1 | 89 | 2 | 166 ms | 11.312 s |
| frame 2 | 124 | 2 | 105 ms | 11.138 s |
| frame 3 | 121 | 2 | 105 ms | 11.297 s |
| frame 4 | 120 | 2 | 107 ms | 11.340 s |

Riferimento caldo con solo primo momento: 23 token, 1 blocco, codifica 53 ms,
denoising + VAE 10.820 s, totale 10.874 s. Totali caldi della versione finale:
11.244–11.448 s (circa +3–5% in questa breve prova). Il primo fotogramma include
caricamento e non va confrontato tramite wall time. Non è un benchmark
statistico né una prova termica/live prolungata; il massimo di 6 blocchi non
è stato profilato su GPU. I 6 blocchi sono coperti nei test di conservazione
dei token. Raster: [fotogramma 1](final-frame-1.png), [fotogramma 2](final-frame-2.png),
[fotogramma 3](final-frame-3.png), [fotogramma 4](final-frame-4.png).

**Ispezione visiva:** primo quadro dominato da materia astratta sulla riva;
secondo da una ciotola; terzo da un volto/oggetto senza azione coerente;
quarto da figure umane ripetute. La protagonista non è riconoscibile lungo
la sequenza, né si legge la trasformazione ai polsi→albero→traccia finale.
Il Color Direction arriva al text encoder in tutti i casi, ma colori brillanti
restano visibili: la sua efficacia percettiva non è certificata.

## Ipotesi provate e ritirate
- Sinossi completa ripetuta in ogni prompt: 202–237 token, 3–4 blocchi,
  codifica 199–251 ms a caldo. Immagini `frame-*.png`, `measurement.json`.
  Non risolve: lo stesso oggetto prevale sulle azioni; aggiunta ritirata.
- CFG 6 step anziché single-conditional 12, sul contesto completo: tempi caldi
  7.89–7.94 s, ma sequenza ancora insufficiente (`cfg-frame-*`,
  `measurement-cfg.json`). Nessun cambio delle impostazioni di produzione.
- CFG 12 step, stesso seed 450 e geometria: confronto primo momento solo vs
  contesto completo (`cfg12-*`, `measurement-diagnostic.json`). Non recupera
  una scena fedele. Nessuna attribuzione certa del difetto alla sola modalità
  single-conditional: anche CFG ha fallito il criterio nel caso controllato.

## Verifica automatica
Suite completa: 77 file / 717 test verdi prima del ritiro della sinossi;
poi rieseguiti i test coinvolti (82 verdi), typecheck e lint sulla versione
finale. Verificati confini 75/76/150/151/450/451 token, ordine CFG,
conservazione bit FP16, annullamento/disposal, quattro prompt e Color Direction.
Build finale normale riuscita: app, ZIP e DMG arm64 (18:01).

## Riproduzione
Dalla root avviare `PSYCHEDEL_PROTOTYPE=1 pnpm exec vite --host 127.0.0.1 --port 5175`.
In un secondo terminale:
`env -u NODE_OPTIONS pnpm exec electron working/validation/piano-045/reproduce.cjs`.
Serve il modello locale già presente e il tokenizer scaricabile o in cache.
Il harness usa un'istanza nascosta dedicata, salva i quattro raster e le misure
in questa cartella e la chiude. Sovrascrive soltanto gli artefatti finali di
questa verifica. Le prove scartate restano come evidenza storica.

## Lavoro residuo
Il criterio del Vice Consigliere resta aperto. Occorre verificare come ottenere
quattro descrizioni inglesi autosufficienti e coerenti (riferimenti espliciti,
azioni rappresentabili, richiamo della soglia nell'eco) nella chiamata narrativa
esistente, poi dimostrare sui raster che il modello le segue. Non è stato
introdotto un nuovo generatore, né promossa una riscrittura automatica non
collaudata. Verificare inoltre costo e cadenza in una vera sessione live.
