# Piano di Lavoro: ANIMATRONIX — varietà a parametri e DATAMOSH cyberpunk

> **ID Piano**: `PIANO-047`
> **Macrotask di Riferimento**: `MACRO-ANIMATRONIX`
> **Data Creazione**: 2026-10-08
> **Stato**: `IN_PROGRESS`
> **Autore/Agente**: Agente AI / Capo Supremo

---

## 1. 🎯 Obiettivo del Piano

Due interventi distinti, chiesti dal Capo Supremo dopo l'analisi della
ripetitività di ANIMATRONIX:

1. **Correggere la ripetitività agendo solo su parametri già esistenti.**
   Nessun meccanismo nuovo: si modificano il passo del cursore di rotazione,
   la tabella `TRANSITION_OF`, la tabella `CARRY` e il guadagno delle durate
   dei segmenti. Cause misurate nel codice:
   - 7 grammatiche su 11 finivano nella stessa dissolvenza (`residual` ×4,
     `morph` ×3) e `residual` è una crossfade pura;
   - `nextCursor = (c + 3) % 11` con finestra di 4 voci: l'ultima grammatica
     di una storia era **sempre** la prima della successiva;
   - `CARRY` alto su `zoom`/`camera`/`bend` (0,55–0,6): ogni segmento
     ripartiva da uno stato già carico, quindi l'arco della fase era sempre
     lo stesso accumulo crescente;
   - durate dei 4 segmenti fra 1,0 e 1,5 (`1 + 0.5 * max(...)`): metro
     sempre uguale, nessun contrasto fra tratto breve e tratto lungo.

2. **Sostituire il morphing a spirale con un'alternativa cyberpunk.** La
   transizione `kinetic` applicava la **sola rotazione di tutto il motore**
   (matrice di rotazione con angolo modulato sul raggio, `brainAnimatronixGl`
   `uKind == 5`): vortice non desiderato dal Capo Supremo. Al suo posto
   **DATAMOSH**: l'ancora resta il solo frammento di segnale integro mentre
   intorno l'immagine si corrompe come un fotogramma inter-frame senza
   riferimento — bande di scansione che slittano a scatti quantizzati,
   macroblocchi che restano indietro, separazione dei canali sul bordo dello
   slittamento. Nessuna rotazione.

**Fuori perimetro**: VIDEODROME è **sospeso** per decisione del Capo Supremo —
nessun file, nessuna impostazione, nessuna deroga aggiuntiva in `agents.md`.

---

## 2. 📋 Prerequisiti e Contesto

- **File / Moduli Coinvolti**:
  - `src/renderer/output/brain/brainAnimatronix.ts` (parametri, unione delle
    transizioni)
  - `src/renderer/output/brain/brainAnimatronixGl.ts` (branch `uKind == 5`)
  - `src/renderer/output/brain/brainAnimatronix.test.ts` (nuovi invarianti)
  - `working/STATE.md`, `working/tasks/tasks-registry.md`,
    `working/sessions/session-history.md`
- **Dipendenze Operative**: nessuna. Il piano dei 4 segmenti, il contratto
  del plugin, lo stage, il warm-up e l'hold GPU restano invariati.
- **Audit preventivo `working/DEPRECATED.md`**:
  - `DEP-001 — NON COINVOLTO`: l'alternanza 80/20 non partecipa alla
    rotazione delle grammatiche ANIMATRONIX, alle transizioni, allo stato del
    mondo né alle durate dei segmenti. Nessuna impostazione salvata cambia
    significato.

---

## 3. ⚠️ Regole e Vincoli di Sviluppo (da `agents.md`)

- [x] **Check Camera**: la deroga ANIMATRONIX resta quella già registrata e
  **non viene estesa**. DATAMOSH non introduce movimento del quadro intero:
  lo slittamento è per bande con fasi diverse, l'ancora resta ferma.
- [x] **Check Materia**: la corruzione vive dentro la materia (campionamento,
  quantizzazione, canali), il soggetto resta riconoscibile e il raster non
  viene rimpiazzato.
- [x] **Check Silenzio**: nessun `uTime`. Tutto deriva da `uTrans`, che
  avanza solo con l'orologio della fase — in silenzio l'orologio scende al
  piano minimo già esistente.
- [x] **Check Beatmatch**: invariato, la fase legge `rhythm.active`/`energy`
  come prima.
- [x] **Check Transizione**: DATAMOSH mantiene la continuità agli estremi già
  corretta in precedenza (parte da `cA`, finisce in `cB`), mai un taglio.
- [x] **Check Costo**: nessun passaggio, buffer o texture in più; il branch
  sostituito costa come quello rimosso.
- [x] **Divieto di sovrastrutturazione**: nessun meccanismo nuovo per la
  varietà. Si ritarano quattro tabelle/costanti già presenti.
- [x] **Autonomia dei renderer**: tutto resta dentro il modulo ANIMATRONIX.
- [x] `lowPowerMode` e DevTools non toccati.

---

## 4. 🛠️ Fasi di Implementazione e Checklist Task

### Fase 1: Correzioni a parametri
- [x] 1.1 `nextCursor`: passo 3 → 5 (coprimo con 11, nessuna grammatica
  condivisa fra il confine di una storia e l'inizio della successiva).
- [x] 1.2 `TRANSITION_OF`: `parallax-collapse` → `fracture`,
  `vertigo-lock` → `focus`, `time-crush` → `datamosh`. `residual` scende da
  4 grammatiche a 1, nessuna transizione ne copre più di 3.
- [x] 1.3 `CARRY`: `zoom` 0,55 → 0,30, `camera` 0,60 → 0,35,
  `bend` 0,60 → 0,35.
- [x] 1.4 Durate: **correzione in corso d'opera**. Il solo guadagno 0,5 → 1,2
  era inerte: `max(traversalAxis, depthConfidence, massScore)` satura a ~1 su
  qualunque raster strutturato (misurato: 0,966 / 1,000 / 1,000 / 0,966), così
  i pesi restavano identici a qualunque guadagno. La riduzione è passata da
  `max` a `min` sugli stessi tre segnali: un raster ricco su tutti i fronti
  prende la battuta lunga, uno che regge una sola grammatica la corta
  (contrasto misurato 1,6× sui raster di prova; resta 1,0 quando i quattro
  raster sono equivalenti, che è il comportamento corretto).

### Fase 2: DATAMOSH
- [x] 2.1 Unione `AnimatronixTransition`: `kinetic` → `datamosh`;
  `TRANSITION_START` e `KIND_INDEX` aggiornati (indice 5 invariato).
- [x] 2.2 Riscrittura del branch `uKind == 5` senza alcuna rotazione.
- [x] 2.3 Helper `hash21` deterministico (stessa banda/scatto → stesso
  slittamento: il blocco resta fermo fra un salto e l'altro).

### Fase 3: Verifica, Test e Build
- [x] 3.1 Nuovi test sugli invarianti introdotti.
- [x] 3.2 `pnpm typecheck`, `pnpm lint`, suite completa.
- [ ] 3.3 Collaudo a schermo del Capo Supremo (fuori sessione).

### Fase 4: Moto dentro la figura (disp. 2026-10-09)
Rilievo del Capo Supremo dal vivo: ANIMATRONIX non deve avere livelli che si
staccano e si muovono fuori scena — è un'animazione **della figura**, alla
quale dare l'idea del moto, non un'animazione della schermata. Indirizzo
scelto: **riscrivere le due grammatiche dentro la figura**, non rimuoverle.
Le tre cause misurate nello shader:
- [x] 4.1 **OCCLUSION PASSAGE** (`uKind == 3`): la sagoma veniva scalata fino
  a 6× (`scaleEnd = min(6, max(1.8, 1.35/altezza))`) e traslata fino a
  `endX = 1.05` / `-0.05`, cioè oltre il bordo del quadro — un ritaglio che
  attraversava lo schermo. Ora il passaggio è **in posizione**: il raster
  successivo prende possesso prima dell'interno della sagoma, poi il fronte
  si propaga al campo attorno seguendo la forma della figura (`massFront`,
  alone graduato dalla sola maschera di massa). Ritirate le tre uniformi di
  centroide, punto d'arrivo e scala della massa, con il calcolo che le
  alimentava.
- [x] 4.2 **DEPTH FRACTURE** (`fractureWorld`, grammatica e transizione): i
  tre piani traslavano rigidamente in direzioni opposte — `0.30 * F` e, in
  transizione, fino a `tr * 1.5`, una volta e mezza il quadro — lasciando
  vuoti riempiti da uno sfondo scuro (`darkBeyond`, rimosso). Ora lo scarto
  fra i piani è un micro-disallineamento (~2,2% a `F` pieno, +1,2% a
  transizione piena: sotto la soglia in cui un piano scoprirebbe il bordo
  dell'immagine, quindi nessun vuoto) e la transizione arriva come **cessione
  ordinata per profondità** — prima il primo piano, poi il medio, infine il
  fondo. Appartenenza ai piani morbida, quindi nessun bordo di maschera
  netto. Un solo campionamento di profondità invece di tre: costo in calo.
- [x] 4.3 **PARALLAX COLLAPSE** (`parallaxMap`): stessa classe di difetto,
  ampiezza minore. Guadagno 1,6 → 1,15 e passo 0,16 → 0,07: lo scorrimento
  del primo piano rispetto al fondo scende da ~13% a ~4% del quadro.
- [x] 4.4 Test nuovo sugli invarianti: nessuna uniforme di traslazione della
  massa nel sorgente, nessuno sfondo dei vuoti, ampiezza dello scarto fra
  piani ≤ 0,03.

**Nota di metodo**: nessun meccanismo nuovo. Sono stati **rimossi** due
meccanismi di traslazione e riusati segnali già presenti (maschera di massa,
soglie dei piani, `tr`). La continuità ai due estremi della transizione è
verificata per costruzione: a `tr = 0` si vede `cA`, a `tr = 1` esattamente
`cB` in entrambe le transizioni riscritte.

---

## 5. 🧪 Strategia di Verifica e Validation Plan

- **Comandi**: `pnpm typecheck`, `pnpm lint`, `pnpm test`.
- **Invarianti nuovi da coprire con test**:
  - su una catena di storie, l'ultima grammatica di una storia non è la prima
    della successiva;
  - nessuna transizione copre più di 3 grammatiche e ne compaiono almeno 5
    distinte sulle 11;
  - il rapporto fra segmento più lungo e più corto supera quello precedente a
    parità di strutture;
  - nessuna rotazione nello shader (nessuna matrice di rotazione nel
    sorgente GLSL).
- **Verifica manuale**: ANIMATRONIX attivo, 3–4 storie di seguito; controllo
  che il confine fra raster non sia più sempre la stessa dissolvenza, che la
  fase non apra con il gesto con cui si è chiusa la precedente e che
  l'evento KINETIC MATCH non torca più l'immagine.

---

## 6. 📝 Note e Registro Avanzamento

- **2026-10-09 — CONSEGNATA la Fase 4** (moto dentro la figura). Suite
  completa verde: **782 test su 79 file**, di cui 1 nuovo sugli invarianti dei
  livelli. `pnpm typecheck` e `pnpm lint` segnalano **un solo errore,
  preesistente e fuori da questo perimetro**: in
  `src/renderer/output/brain/brainFrameMotion.ts:392` `speedFactor` usa
  `REVISION_CYCLE_FRAME_SPEED_FACTOR` senza importarlo e non è mai letto —
  lavoro in corso d'opera di un'altra sessione, lasciato intatto. Resta il
  collaudo a schermo (TASK-047-12).

- **2026-10-08 — CONSEGNATO**. Typecheck, lint e **768 test verdi su 79
  file**, di cui 6 nuovi sugli invarianti introdotti. Resta il collaudo a
  schermo (3.3), che non può essere eseguito qui: in particolare la
  compilazione reale dello shader DATAMOSH. Degrado noto e sicuro se fallisse:
  `AnimatronixGl` lancia, `start()` ritorna `false` e la fase viene saltata
  con il `brainWarn` già esistente — nessuno schermo nero.
- **2026-10-08**: creazione del piano. VIDEODROME sospeso su decisione del
  Capo Supremo; l'analisi che lo riguarda resta agli atti della sessione e
  non apre alcun file.
