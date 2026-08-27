# Come Brain sceglie le frasi da `brainPhrases.txt` per ogni storia

Meccanismo attuale, sostituito rispetto al campionamento casuale originario per
dare continuità onirica fra una storia e la successiva. Decisioni di prodotto in
[brief-campionamento-frasi-filo-onirico.md](../team/briefs/brief-campionamento-frasi-filo-onirico.md)
e [brief-campionamento-correttivo.md](../team/briefs/brief-campionamento-correttivo.md)
(quest'ultimo cambia il trattamento del materiale online rispetto al primo — fa fede
il correttivo).

## 1. Da dove arrivano le frasi

[`config/brainPhrases.txt`](../config/brainPhrases.txt): una frase per riga, righe vuote e quelle che
iniziano con `#` ignorate (`parseBrainPhrases`,
[`brainPhrases.ts`](../src/renderer/output/brain/brainPhrases.ts)). Viene
riletto da disco a ogni ciclo di generazione (`loadBrainPhrases()`), non
una volta sola all'avvio.

## 2. Finestra scorrevole con sovrapposizione (storie ordinarie)

`sampleBrainPhraseWindow(cursor, count)` in `brainPhrases.ts` non sceglie più a
caso: legge `count` righe **contigue** di `BRAIN_PHRASES` a partire da un cursore
tenuto in `brainController.ts` (`phraseCursor`, azzerato insieme a tutto lo stato
narrativo a ogni ricreazione del controller — nessuna persistenza fra sessioni).

- `count` resta 4–5 (`selectBrainPhraseCount()`, invariato).
- Il cursore avanza di un passo minore di `count`, pari a
  `count - BRAIN_CONFIG.phraseWindowOverlapCount`: due finestre consecutive
  condividono quindi `phraseWindowOverlapCount` righe (default 2 — valore da
  tarare all'ascolto, vedi il correttivo §6).
- Arrivati a fine file l'indice si avvolge (`% BRAIN_PHRASES.length`), calcolato
  al momento dell'uso: se il file cambia lunghezza sotto il cursore (sessione
  pubblica che accoda righe, o reset alla base story alla chiusura) non serve
  alcuna invalidazione esplicita, il modulo si riadatta da solo.

### Vincoli strutturali (non parametri da tarare)

Osservato dal vivo il 2026-08-26 con un pool ridotto a due righe (sessione
pubblica appena aperta): senza questi due vincoli la finestra può coincidere
con l'intero pool disponibile, restituendo sempre lo stesso contenuto — solo
riordinato — indipendentemente dal cursore. Effetto osservato: la seconda
storia ha ricevuto lo stesso seme della prima con i soli ponti invertiti (due
titoli quasi identici per la stessa immagine). Non è un problema di taratura
dei parametri, è una condizione strutturale che si ripresenta da sola ogni
volta che il pool è piccolo:

1. **La finestra non può mai coincidere con l'intero pool.** Se il pool ha più
   di una riga, `sampleBrainPhraseWindow` non chiede mai più di
   `BRAIN_PHRASES.length - 1` righe, anche se il conteggio richiesto (4–5)
   sarebbe più alto. Deve restare sempre almeno una riga fuori dalla finestra,
   altrimenti qualunque punto di partenza conterrebbe le stesse righe.
2. **L'overlap non può mai eguagliare o superare il conteggio effettivo.** Il
   passo (`count - overlap`) è sempre almeno 1, qualunque sia il valore di
   `phraseWindowOverlapCount` rispetto al conteggio richiesto.

## 3. Residuo online: peso, non quota (correttivo v2)

Ogni riga arrivata dal pubblico durante una sessione aperta resta in
`onlinePhrasesSeen` (in `brainController.ts`) per un "diritto di rientro" nel
seme delle storie ordinarie successive, **indipendente dal cursore sulla base e
senza soglia di freschezza** — la ripetizione di una riga appena usata è voluta,
non un difetto da evitare.

- Cadenza: una riga online rientra ogni `phraseWindowOnlineResidueIntervalStories`
  storie ordinarie (default 2 = alternata).
- Invecchiamento: `phraseWindowOnlineResidueAging` — `'rotate'` (rotazione
  uniforme, default) oppure `'recencyWeighted'` (le righe più recenti tornano più
  spesso). Entrambi da confrontare all'ascolto.
- Quando è di turno, la riga online occupa uno slot del seme a scapito della
  finestra sulla base curata (mai della memoria lunga): nessun tetto in nessuna
  direzione, né minimo garantito alla base né massimo all'online. In una serata
  affollata il seme può risultare interamente dominato dal materiale del
  pubblico — è accettato e voluto (il sogno diventa collettivo), non una
  degenerazione da correggere.

**Osservabilità:** il residuo online non ha alcun segno a schermo nelle storie
ordinarie (a differenza della storia dedicata, marcata nella sidebar) — è
deliberato, deve riaffiorare senza essere annunciato. In collaudo, ogni
tentativo di generazione registra comunque nel log un `brainLog('pipeline', …)`
che dichiara `onlineResidueDue`, `onlineResidueTurn`, `onlineResidueAging` e
`onlinePhrasesSeenCount` anche quando il residuo non è di turno; quando invece
rientra, una riga dedicata `brainLog('memoria', 'residuo online rientrato nel
seme di una storia ordinaria', …)` riporta la frase e il criterio con cui è
stata scelta.

## 4. Memoria lunga del sogno (`sessionMemo`)

`dreamMemoryBuffer` in `brainController.ts` accumula una voce (`title: synopsis`)
per ogni storia ordinaria andata in coda, con capacità
`BRAIN_CONFIG.dreamMemoryBufferCapacity` (~14, l'ordine di un giro completo di
cursore sulla base curata). Il residuo di una storia dedicata a un input online
entra nello stesso buffer, ma solo **dopo la messa in onda** (`startProduction()`
in `brainController.ts`), non alla generazione — il sogno ricorda di aver
sognato, non di aver ricevuto.

Ai cicli periodici `sessionSynthesis` (ogni 3–5 storie, invariato), tre voci
**distribuite nel tempo** — la più vecchia, una centrale, la più recente, non le
ultime tre — vengono campionate dal buffer (`sampleDistributedDreamMemo`) per
diventare `sessionMemo`: sono queste tre frasi, non l'intero buffer, a rientrare
nel seme della storia di sintesi. Nessun filtro per provenienza: se il buffer è
in maggioranza online, il memo lo riflette (vedi §3).

## 5. Come diventano una storia

Le frasi scelte (finestra sulla base, eventuale residuo online, eventuali 3 frasi
di `sessionMemo` nei cicli di sintesi "Questo sogno") vengono unite con
`phrases.join(' ')` in un unico testo-seme, passato a
`CoscienzaOnirica.generate()`
([`coscienzaOnirica.ts`](../src/renderer/output/brain/coscienzaOnirica.ts)).
Il modello AI **non** le usa come frasi letterali della storia: le tratta
come materiale associativo/tematico e scrive una narrazione originale
(titolo, sinossi, fotogrammi) ispirata a quel seme.

## 6. Quando succede

`generateStoryBatch()` in
[`brainController.ts`](../src/renderer/output/brain/brainController.ts)
ripete il ciclo 2–5 finché la coda di storie pronte (`storyQueue`) non
raggiunge `targetCount`, continuamente durante lo show — ogni volta avanzando
la finestra di un passo.

## Eccezione invariata: input online, storia dedicata

La sessione pubblica (vedi
[`sessione-pubblica-brain.md`](../sessione-pubblica-brain.md)) **non** passa
da questo meccanismo per la sua storia una tantum: ogni riga del CSV genera
comunque una storia dedicata con `phrases = [quella riga sola]`, priorità e
percorso separato invariati. Quella riga *inoltre* resta disponibile per il
residuo di §3 nelle storie ordinarie successive.
