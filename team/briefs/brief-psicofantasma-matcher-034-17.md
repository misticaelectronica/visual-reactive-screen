# BRIEF INGEGNERIA — Matcher PsicoFantasma (PIANO-043 034-17)

**Destinatari:** Consigliere del Capo Supremo, Capo Supremo degli Ingegneri
**Mittente:** Ingegneria
**Data:** 2026-09-08
**Riferimenti:** `MACRO-034`, `PIANO-043` voce `034-17`; brief Visual
definitivo §13–19 (open-set, quattro condizioni), §6 del piano («fermarsi e
riferire» prima di rimuovere CLIP)
**Stato:** proposta di piano. Richiede scelta A/B/C del Consigliere e, per B/C,
via libera esplicita del Capo Supremo alla rimozione del modello CLIP.

---

## 1. Difetto segnalato dal vivo

«PsicoFantasma rileva poche forme» / «non rileva forme umane». Sono due
stadi distinti; questo brief riguarda il **riconoscimento** (il gate a quattro
condizioni quasi non scatta). L'estrazione delle regioni è trattata a parte
(`034-19` + allentamento soglie in `analysis.ts`, già applicato).

## 2. Causa tecnica

Il confronto oggi è:

```
cosine( CLIP(crop foto mascherato su bianco) , CLIP(silhouette nera piena su bianco) )
```

`rankPsicoFantasma` in `psicofantasma/recognition.ts` fa il coseno fra
l'embedding del crop runtime e gli embedding del repertorio, preparati offline
rasterizzando le silhouette come **sagome nere piene su bianco**
(`rasterizePsicoFantasmaSilhouette`, preprocessing `psicofantasma-rgb-letterbox-white-v1`).

I due domini sono quasi ortogonali nello spazio CLIP:

- il crop runtime è un ritaglio fotografico con texture, illuminazione, colore;
- l'esemplare del repertorio è una silhouette binaria senza interno.

CLIP colloca «foto di una persona» e «sagoma nera a forma di persona» in
regioni lontane dello spazio. Il coseno risultante è basso e piatto per quasi
tutti i concetti → la **condizione 16.1 (affinità assoluta)** non viene mai
superata, e quando lo è il **margine (16.2)** è rumore. Il caso peggiore è
`human`, come osservato a schermo.

`psicoFantasmaStructuralCoherence` (IoU maschera↔silhouette) funziona già come
gate di struttura (16.3) ed è l'unico segnale geometrico affidabile oggi in
pista; `034-16` ha aggiunto `PsicoFantasmaRegion.contour` (Moore-neighbor +
Douglas–Peucker) pronto per un matcher di forma, non ancora usato.

## 3. Opzioni

### Opzione A — Allineare i domini, si tiene CLIP

Rendere confrontabili i due lati:

- **A1 — repertorio come esemplari resi.** Gli embedding offline non si
  calcolano più sulla silhouette nera ma su un **rendering realistico**
  dell'archetipo (o su alcune foto reali di quell'oggetto ridotte e
  letterbox-ate come il crop). Il crop runtime resta com'è.
- **A2 — crop runtime non mascherato.** Si passa a CLIP il ritaglio con il suo
  contesto (niente maschera su bianco), avvicinandolo al dominio «foto». Il
  repertorio resta silhouette → non basta da solo, va con A1.

- **Pro:** CLIP resta, nessuna rimozione di modello; l'open-set e le quattro
  condizioni restano invariate; ricalibrazione delle sole soglie.
- **Contro:** A1 richiede di produrre/rendere ~40–60 (poi centinaia) di
  esemplari realistici — è lavoro Visual, dipende da `034-04`; A2 sposta il
  problema del gate di struttura (un crop con contesto rende `structuralCoherence`
  meno selettiva).

### Opzione B — Matcher geometrico su `contour`, CLIP come veto

Il riconoscimento diventa **di forma**, non di embedding fotografico:

- descrittori invarianti sul `contour` normalizzato: **Hu moments** +
  **descrittori di Fourier** (bassa frequenza), confronto per concetto;
- `psicoFantasmaStructuralCoherence` come gate di struttura (16.3) — già c'è;
- affinità (16.1) e margine (16.2) calcolati sulla distanza dei descrittori;
- CLIP mantenuto **solo come veto** semantico opzionale (se l'embedding dice
  «chiaramente un'altra categoria», si nega) — oppure rimosso del tutto.

- **Pro:** confronta ciò che PsicoFantasma davvero vede (la sagoma emersa) con
  ciò che il repertorio davvero è (una sagoma); i domini coincidono; niente
  esemplari realistici da produrre; il repertorio silhouette curato dalla
  Direzione Visual va bene così com'è.
- **Contro:** se si rimuove CLIP si eliminano **88 MB di modello + il Worker
  dedicato** — richiede via libera esplicita (piano §6). Perdita del veto
  semantico: due oggetti con la stessa Gestalt (una foglia e una mano aperta)
  possono confondersi — mitigabile col margine (16.2) e con `human` trattato
  con più famiglie di varianti.

### Opzione C — Ibrido

Matcher geometrico (B) come motore primario di affinità/margine/struttura;
CLIP (A) mantenuto come **secondo parere** che deve concordare perché il
riconoscimento passi (AND dei due), oppure come solo veto.

- **Pro:** massima robustezza dell'open-set (serve evidenza da due spazi
  indipendenti — coerente con lo spirito delle quattro condizioni).
- **Contro:** si tengono sia gli 88 MB sia il costo di preparare esemplari
  allineati (A1); la più cara delle tre.

## 4. Raccomandazione Ingegneria

**Opzione B**, con CLIP mantenuto come **veto** finché non c'è evidenza dal
vivo che il veto non serva (poi rimozione con via libera). Motivi:

1. È l'unica opzione in cui i due lati del confronto sono nello stesso dominio
   senza produrre nuovi asset — quindi **non è bloccata da `034-04`**.
2. Riusa `contour` (`034-16`) e `psicoFantasmaStructuralCoherence` già in
   pista.
3. Mantiene intatte open-set e quattro condizioni: cambia *come* si misura
   l'affinità, non *quando* si riconosce.

## 5. Decisioni richieste

1. Opzione A, B (raccomandata) o C.
2. Se B/C con rimozione CLIP: **via libera** del Capo Supremo a eliminare il
   modello da 88 MB e il Worker `clipWorker.ts` (piano §6: «fermarsi e
   riferire» — questo è il riferire).
3. Target di calibrazione: si conferma il 20–40% di riconoscimenti riusciti
   come criterio di collaudo (brief Visual §18/§47), non come quota runtime.
4. `034-18` (persistenza fra immagini) resta subordinata a questa scelta.

## 6. Impatti dichiarati

- **Autonomia dei renderer:** il matcher geometrico vive in
  `psicofantasma/recognition.ts` (+ eventuale nuovo `psicofantasma/shape.ts`),
  nessuna analisi importata da altri renderer.
- **Contratto plugin, host, crossfade, selettore:** non toccati.
- **Gate qualità immagine (`034-20`), presenza residente (`034-19`),
  reattività musicale, sfumatura bordi:** indipendenti, non toccati.
- **Bundle:** Opzione B senza CLIP → −88 MB da `dist/brain-models/psicofantasma`
  e un Worker in meno; loader repertoire invariato (le silhouette restano).

## 7. Validation Plan proposto

`pnpm typecheck`, `pnpm lint`, Vitest mirati (`recognition`, nuovo `shape`,
`analysis`), `pnpm build`. Corpus Visual: riuscite / incompatibili / ambigue,
misura della percentuale di riconoscimento sul corpus eterogeneo (target
20–40%), verifica che `human` non sia più il caso peggiore, silenzio e
ricreazione istanza invariati.

---

Firmato: il Capo Supremo degli Ingegneri.
