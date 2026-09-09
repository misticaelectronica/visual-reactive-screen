# PsicoFantasma — consegna del repertorio e stato Ingegneria

Riferimenti: `team/briefs/brief-psicofantasma-visual-definitivo.md`,
`team/briefs/brief-psicofantasma-matcher-034-17.md` e
`working/plans/piano-043-psicofantasma.md`.

## Stato

Il matcher è **geometrico** (PIANO-043 034-17, Opzione B, autorizzata dal
Consigliere 2026-09-08): il contorno della figura emersa dal raster è
confrontato con le silhouette del repertorio nello stesso dominio della
forma — momenti di Hu, armoniche di contorno, allungamento e compattezza
dell'ellisse d'inerzia. **Niente CLIP, niente embedding, niente Worker,
niente modello da 88 MB.** Nessun veto semantico: che una foglia e una mano
aperta condividano la Gestalt è il risultato voluto (brief Visual §12/§52).

Il repertorio V2 approvato il 2026-09-08 è integrato: 120 sagome, 24 per
famiglia e 40 archetipi guida. La voce UI resta selezionabile manualmente e
il plugin può partecipare alla rotazione normale, salvo il gate qualità già
previsto per i fotogrammi `interlude`. Le soglie non sono state adattate a
una percentuale di riconoscimenti.

## Consegna Visual: formato normalizzato

Il formato runtime è un documento JSON con `version: 1` e `silhouettes`.
La base V1 approvata contiene almeno 120 elementi e almeno 24 elementi per
ciascuna famiglia. Ogni elemento contiene:

| Campo | Contenuto |
| --- | --- |
| `id` | Identificatore stabile e univoco della sagoma canonica |
| `archetype` | Identificatore concettuale, uguale nelle varianti (es. uccello) |
| `label` | Nome leggibile per la diagnostica |
| `family` | `human`, `animal`, `organic`, `everyday`, `artifact` |
| `rings` | Array di contorni; ciascuno contiene punti `[x,y]` in `[0,1]` |
| `source` | Provenienza verificabile della forma |
| `license` | Licenza e attribuzione richiesta dalla fonte |
| `approvedBy` | Responsabile della curatela Visual |

Tutte e cinque le famiglie presenti nella V1. La validazione tecnica dei
campi non sostituisce l'approvazione artistica né la verifica della licenza.

Contorni implicitamente chiusi, almeno tre punti, massimo 512 punti per
contorno, 32 contorni e 2048 punti totali per sagoma. Riempimento pari/dispari
per conservare i vuoti. Nessuno script SVG, URL di immagine o path eseguibile.
Normalizzazione Visual: **proporzioni originali conservate**, figura centrata
in un quadrato, asse canonico, sfondo vuoto. Non stirare la sagoma per
riempire il quadrato — l'allungamento è un tratto distintivo che il matcher
misura. Non aggiungere geometrie o eliminare concavità per soddisfare il
formato. La curatela esclude forme geometriche elementari, clipart e
pittogrammi: il loader non può certificare questi criteri.

## Import deterministico

Il passo di inferenza degli embedding è stato rimosso. Gli SVG consegnati e
i file originali di revisione vivono immutati in
`docs/psicofantasma-repertoire-v2/`. Lo script
`scripts/import-psicofantasma-repertoire.mjs` verifica ID, hash, impronte e
distribuzione, quindi converte l'impronta morfologica 32×32 già consegnata in
contorni normalizzati. Non sceglie, sostituisce o rigenera silhouette.

Il risultato è `config/psicofantasma/repertoire.json`. La build valida schema,
almeno 120 sagome e almeno 24 per famiglia. L'espansione è ammessa senza
modifiche al codice fino al budget di 2048 sagome.

## Matching e gate

Affinità di forma in `[0,1]` (`psicofantasma/shape.ts`): 1 = stessa Gestalt,
~0.3 = forme estranee. Per ogni concetto si tiene il massimo fra le varianti
canoniche, poi si confronta con il **secondo archetipo distinto** per il
margine. Le quattro condizioni del brief restano: affinità assoluta, margine,
coerenza strutturale (`psicoFantasmaStructuralCoherence`, IoU maschera↔
silhouette del solo candidato), persistenza dell'osservazione. Soglie passate
esplicitamente dalla taratura, mai adattate a una quota di successi. Il
20–40% è criterio di collaudo (brief Visual §18/§47), non quota runtime.

Il silenzio sospende osservazione, attrazione e rientro; la memoria della
deformazione permane.

## Bundle e percorsi

Nell'app installata il bundler include il solo `repertoire.json` in
`dist/brain-models/psicofantasma/`, letto attraverso
`brain-model://local/psicofantasma/repertoire.json`. Non serve più
`.model-artifacts/psicofantasma/` né alcun encoder. I percorsi dei modelli SD
di Psichedel restano invariati.

## Collaudo

Consegna e verifica tecnica 034-04 completate. Il rapporto è in
`docs/psicofantasma-repertorio-collaudo.md`. Resta aperta la parte percettiva
di 034-11: Test Visual 1–12 e giudizio a schermo sul 20–40%, che rimane un
criterio di accettazione e non una quota introdotta nel runtime.

## Persistenza fra immagini — 034-18

Implementata: uno slot fuori istanza conserva la forma effettivamente
raggiunta e la sua posizione, anche se la trasformazione era incompleta.
All'immagine successiva resta come traccia. Un nuovo riconoscimento valido
autorizza il morph verso la nuova silhouette; il ricordo non influenza le
soglie o la scelta del candidato. Senza match decade in 12 secondi percettivi,
senza tornare alla fotografia precedente. Silenzio e hold lo sospendono.

La continuità prepara al massimo 18 stadi raster (9 low power) una volta
per immagine. A runtime usa solo crossfade. Il ricordo trattiene due stadi
già preparati; nessun archivio parallelo e nessun legame con `.coscienza/`.
Prova Canvas reale con fixture tecniche A→B→C e low power superata;
il giudizio percettivo sul repertorio curato resta da fare.
