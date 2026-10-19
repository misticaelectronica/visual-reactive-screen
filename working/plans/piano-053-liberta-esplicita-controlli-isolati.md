# Piano di Lavoro: Libertà esplicita e blocco immagini d'emergenza

> **ID Piano**: `PIANO-053`  
> **Macrotask di Riferimento**: `MACRO-039`  
> **Data Creazione**: 2026-10-19  
> **Stato**: `COMPLETATO`  
> **Autore/Agente**: Agente AI, su disposizione del Capo Supremo  

---

## 1. 🎯 Obiettivo del Piano

Il sistema deve avere soltanto questi due controlli, indipendenti:

1. nella **Sessione pubblica**, il checkbox
   `Evita bambini nelle immagini vicine a scene esplicite` continua a operare
   esattamente come ora, senza scartare o riscrivere testi;
2. il vecchio checkbox
   `Emergenza: ripristina il testo esplicito delle frasi` viene rifatto e
   diventa `Emergenza: impedisci la generazione di immagini esplicite`.

Il nuovo interruttore d'emergenza non ripristina, conserva, corregge o
riscrive alcun testo. Quando è acceso, se il prompt finale di una immagine è
riconosciuto come esplicito, Stable Diffusion non viene chiamata per quel
fotogramma. Al suo posto si usa il fallback neutro già esistente. Quando è
spento, non esegue alcun controllo e il modello è libero.

### Matrice comportamentale richiesta

| Sessione pubblica | Bambini | Blocco immagini esplicite | Comportamento |
| --- | --- | --- | --- |
| no | irrilevante | spento | libertà totale; tutte le immagini vengono generate |
| no | irrilevante | acceso | i soli prompt immagine espliciti non vengono generati |
| sì | spento | spento | libertà totale; tutte le immagini vengono generate |
| sì | acceso | spento | libertà totale sul sesso; solo negative prompt bambini sulle immagini interessate |
| sì | spento/acceso | acceso | i prompt espliciti non vengono generati; il controllo bambini resta indipendente sugli altri fotogrammi |

### Definizione precisa di “impedire”

- Il blocco è **prima dell'inferenza**: un prompt classificato esplicito non
  arriva mai al generatore immagini.
- Il fotogramma bloccato usa `RASTER_FALLBACK_SVG`, già presente in
  `psichedel.ts`; non si introduce una riscrittura “sicura”, un'altra chiamata
  AI o un nuovo effetto.
- Il piano non introduce un classificatore dei pixel dopo la generazione.
  Quindi garantisce che i prompt riconosciuti come espliciti non vengano
  generati; non può garantire che un modello generativo non produca
  inaspettatamente nudità da un prompt non riconosciuto come esplicito.
- Il blocco usa soltanto azioni sessuali esplicite. I criteri larghi storici
  (`finger(s)`, `pleasure`, `intimacy`) restano esclusivamente nel controllo
  bambini, la cui semantica deve restare invariata.

---

## 2. 📋 Prerequisiti e Contesto

- **File / Moduli Coinvolti**:
  - `src/renderer/output/brain/coscienzaOnirica.ts`
  - `src/renderer/output/brain/psichedel.ts`
  - `src/renderer/output/brain/brainController.ts`
  - `src/renderer/control/components/VisualControls.tsx`
  - `src/shared/types.ts`
  - `src/shared/defaults.ts`
  - `src/main/settings.ts`
  - test Brain, Coscienza Onirica, Psichedel, settings e UI interessati
  - documentazione operativa e registri `working/`
- **UI esistente**:
  - il checkbox bambini resta nel solo riquadro Sessione pubblica;
  - il checkbox d'emergenza cambia significato e testo;
  - non è previsto un terzo controllo.
- **Meccanismi già presenti da riusare**:
  - il prompt finale viene costruito in `buildPsychedelImagePrompt` subito
    prima di `imageGenerator.generate`;
  - `RASTER_FALLBACK_SVG` fornisce già un fotogramma neutro senza inferenza;
  - il crossfade esistente gestisce la transizione, senza un nuovo renderer.
- **Audit preventivo `working/DEPRECATED.md`**:
  - `DEP-001 — NON COINVOLTO`: l'alternanza Brain 80/20 non partecipa al
    blocco.
  - `DEP-002 — AGGIORNARE`: dal percorso deprecato
    `CoscienzaOnirica.generate`, ancora raggiungibile da «Questo sogno», vanno
    rimossi ripristino e verifica dell'esplicito. È un aggiornamento limitato
    richiesto dalla nuova semantica; non estende il percorso e non cambia il
    criterio di dismissione.

---

## 3. ⚠️ Regole e Vincoli di Sviluppo

- [x] Audit preventivo dei deprecati completato prima del piano.
- [x] `filosofia.md` riletto integralmente.
- [x] Verifica anti-sovrastrutturazione: si usa il punto di confine già
  esistente prima dell'inferenza e il fallback già presente; nessuna seconda
  AI, nessun filtro successivo e nessuna riscrittura.
- [x] Protocollo visivo: Camera, Materia, Silenzio, Beatmatch e Costo non
  cambiano. La Transizione continua a usare il crossfade esistente verso il
  fallback neutro.
- [x] Mantenere invariati `backgroundThrottling`, permessi microfono,
  `lowPowerMode`, DevTools e architettura IPC.
- [x] Non scartare frasi del pubblico e non censurare il testo generato.
- [x] Non modificare la semantica del checkbox bambini: solo episodi con
  `onlineSourceText`, scena corrente/precedente/successiva nello stesso
  episodio, lista negativa e default attuali.
- [x] Il blocco immagini non deve modificare prompt positivo, storia,
  quartina, memoria, frase pubblica o file `brainPhrases.txt`.
- [x] Con il blocco spento, il rilevatore di esplicito non deve essere
  eseguito per questa funzione.

---

## 4. 🛠️ Fasi di Implementazione e Checklist Task

### Fase 1: Rimuovere il vecchio “ripristino testo esplicito”

- [x] **TASK-053-01**: eliminare dai percorsi `generate`, `generateEpisode` e
  `rewritePublicPhrase` le istruzioni che impongono di conservare letteralmente
  il sesso, le verifiche di conservazione, la diagnostica e i fallback che
  reinseriscono il testo sorgente.
- [x] **TASK-053-02**: rimuovere da Coscienza Onirica le funzioni rimaste senza
  chiamanti (`preserveExplicitSourceContent`,
  `preservesExplicitAdultContent`, `explicitContentDiagnostics`) e i relativi
  test.
- [x] **TASK-053-03**: eliminare la classificazione esplicita incondizionata
  da `inferMainArgument`: il testo narrativo e il soggetto non devono più
  essere indirizzati dal vecchio controllo.
- [x] **TASK-053-04**: rimuovere `preserveExplicitSource` dalle opzioni di
  Coscienza Onirica e dal passaggio controller → Qwen. Nessun comportamento
  testuale deve dipendere dal nuovo interruttore immagini.

### Fase 2: Collocare l'unico blocco al confine del generatore immagini

- [x] **TASK-053-05**: collocare in Psichedel il rilevatore del prompt
  immagine, rinominandolo in modo coerente con il suo solo uso, per esempio
  `containsExplicitImageContent`. Rimuovere da Coscienza Onirica i nomi e le
  costanti del vecchio ripristino, compreso `STRONG_EXPLICIT_ADULT_TERMS`.
- [x] **TASK-053-06**: valutare il blocco sul prompt finale prodotto da
  `buildPsychedelImagePrompt`, immediatamente prima della prima inferenza e
  soltanto se `blockExplicitImages === true`.
- [x] **TASK-053-07**: se il prompt è esplicito, non chiamare
  `imageGenerator.generate`, non tentare retry e creare direttamente la scena
  con `RASTER_FALLBACK_SVG`, descrizione originale e modalità del fotogramma.
- [x] **TASK-053-08**: registrare un log asciutto con storia, fotogramma e
  motivo `explicit-image-block`; non riportare il testo sessuale nel log.
- [x] **TASK-053-09**: con il blocco spento, mantenere il percorso identico a
  quello libero attuale e non valutare il rilevatore d'emergenza.

### Fase 3: Conservare separata la protezione bambini

- [x] **TASK-053-10**: mantenere in `childSafetyNegativePrompt` la semantica
  attuale di scena esplicita e vicinanza, ma renderla locale alla pipeline
  immagini, senza import da Coscienza Onirica.
- [x] **TASK-053-11**: eseguire quel controllo solo con checkbox bambini
  acceso e `story.onlineSourceText` presente. Il suo unico effetto resta
  aggiungere `child, children, kid, young girl, young boy` al negative prompt.
- [x] **TASK-053-12**: non subordinare il checkbox bambini al blocco immagini:
  restano due comandi indipendenti.

### Fase 4: UI e migrazione impostazioni

- [x] **TASK-053-13**: sostituire il testo UI con
  `Emergenza: impedisci la generazione di immagini esplicite (di norma spento: il modello è libero)`.
- [x] **TASK-053-14**: sostituire l'impostazione fuorviante
  `preserveExplicitSource` con `blockExplicitImages`, booleano e spento di
  default, in tipi, default, normalizzazione e payload.
- [x] **TASK-053-15**: non convertire automaticamente un vecchio valore
  `preserveExplicitSource: true` nel nuovo blocco: la semantica è opposta e
  una migrazione automatica potrebbe bloccare immagini senza una scelta
  consapevole. La vecchia chiave viene ignorata; il nuovo checkbox parte
  spento dopo l'aggiornamento.
- [x] **TASK-053-16**: mantenere invariati posizione, impostazione e default
  del checkbox bambini nel riquadro Sessione pubblica.

### Fase 5: Test e chiusura

- [x] **TASK-053-17**: testare che con blocco spento prompt espliciti e non
  espliciti chiamino entrambi il generatore e che Coscienza Onirica non
  contenga più rami di ripristino.
- [x] **TASK-053-18**: testare che con blocco acceso un prompt esplicito non
  chiami mai il generatore, produca il fallback neutro e non esegua retry;
  un prompt non esplicito deve continuare a essere generato normalmente.
- [x] **TASK-053-19**: mantenere i test della protezione bambini su: solo
  pubblico, toggle acceso/spento, scena precedente/corrente/successiva, bordi
  dell'episodio, termini negativi esatti ed esclusione delle righe curate.
- [x] **TASK-053-20**: testare default e normalizzazione di
  `blockExplicitImages`, compresa la mancata migrazione automatica della
  vecchia chiave.
- [x] **TASK-053-21**: eseguire test mirati, `pnpm typecheck`, `pnpm lint`,
  suite completa e `pnpm build`.
- [x] **TASK-053-22**: collaudo della matrice della sezione 1,
  verificando dai log che il generatore non parta per i frame bloccati e che
  nessun testo venga riscritto o scartato.

---

## 5. 🧪 Strategia di Verifica e Validation Plan

### Test automatici

- test mirati di Coscienza Onirica, Psichedel, child safety e settings
- `pnpm typecheck`
- `pnpm lint`
- suite completa Vitest prevista dal progetto
- `pnpm build`

### Asserzioni obbligatorie

1. **Blocco OFF**: nessun controllo dell'esplicito da parte della funzione
   d'emergenza; tutti i prompt arrivano al generatore.
2. **Blocco ON + prompt esplicito**: zero chiamate al generatore, zero retry,
   scena neutra disponibile al renderer.
3. **Blocco ON + prompt non esplicito**: generazione normale.
4. Nessun ramo di ripristino, verifica o reinserimento del testo esplicito
   resta in Coscienza Onirica.
5. **Bambini OFF**: nessun termine bambini aggiunto al negative prompt.
6. **Bambini ON + pubblico**: termini aggiunti con la regola di vicinanza
   attuale, indipendentemente dal blocco immagini.
7. **Bambini ON + riga curata**: nessun termine aggiunto.
8. La vecchia chiave `preserveExplicitSource` non abilita il nuovo blocco.

### Verifica manuale

- Provare una quartina con frame espliciti e non espliciti, prima con il
  blocco spento e poi acceso.
- Con blocco spento, verificare che le scene esplicite arrivino normalmente
  al generatore.
- Con blocco acceso, verificare l'assenza della chiamata di inferenza per i
  soli frame riconosciuti espliciti e la presenza del fallback neutro.
- Ripetere in Sessione pubblica con il checkbox bambini acceso e spento per
  confermare che il suo unico effetto sia il negative prompt dedicato.

---

## 6. 📝 Note e Registro Avanzamento

- **2026-10-19**: piano creato e corretto sulla successiva precisazione del
  Capo Supremo. Nessuna modifica runtime eseguita.
- **2026-10-19**: implementazione completata. Test mirati 104/104, suite
  completa 816/816, typecheck, lint e build app/ZIP/DMG verdi. Avvio reale
  della Control Window riuscito; ispezione visiva automatizzata non
  disponibile per permessi macOS, etichetta verificata nel bundle compilato.
- **Decisione vincolante**: il vecchio ripristino testuale viene dismesso; il
  checkbox d'emergenza blocca soltanto la generazione dei frame riconosciuti
  espliciti.
- **Decisione vincolante**: fuori dal checkbox bambini della Sessione
  pubblica e dal blocco immagini acceso, Brain non applica alcun controllo
  sull'esplicito.
- **Non-obiettivo**: correggere i falsi positivi del rilevatore bambini o
  cambiare la sua lista negativa.
