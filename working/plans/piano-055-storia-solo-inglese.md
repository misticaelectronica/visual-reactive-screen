# Piano di Lavoro: Nessun italiano nella generazione delle storie

> **ID Piano**: `PIANO-055`  
> **Macrotask di Riferimento**: `MACRO-041`  
> **Data Creazione**: 2026-10-31  
> **Stato**: `BOZZA`  
> **Autore/Agente**: Agente AI / Capo Supremo  

---

## 1. 🎯 Obiettivo del Piano

Segnalazione del Capo Supremo, 2026-10-31 (testo originale):

> contorell PERCHé HO SCRITTO LA BASE STORY IN INGLESE MA VECHO CHE SCRIVE A
> VIDEO LA STORIA IN ITALIANO, E' UNO SPRECO DI RISORSE. SOLO PIANO

Con una base curata in inglese, tutta la catena testuale di Brain deve restare
in inglese: nessuna storia scritta in italiano, nessun prompt immagine in
italiano e nessuna traduzione caricata senza motivo.

---

## 2. 📋 Diagnosi

Fonte: log reale `session-2026-10-31-13-22-27.txt`, storia di Sal Paradise, con
build corrente (`packaged: false`, `dist/`).

### Fatti verificati

- **Le righe base non vengono tradotte.** Nelle 7 storie ordinarie il testo
  resta inglese. `translateUi` è già spento (`brainController.ts:1855`) e nel
  log `translate-ui` non compare mai.
- **L'italiano nasce nelle sole storie «Questo sogno»**: 2 su 9 in questa
  sessione. Passano dal percorso compatibile `CoscienzaOnirica.generate`
  (DEP-002), mantenuto per disposizione del 2026-10-19. Qui Qwen ha scritto
  l'intera storia in italiano, nonostante la richiesta «natural English».
- **Il testo italiano viene accettato**: passa il parser e finisce a video.
  `splitIntoFourMoments` lo trasforma nei **prompt di Stable Diffusion**. Il
  log `uso diretto dei fotogrammi inglesi originali` dichiara inglesi quattro
  prompt che iniziano con `Questo sogno Spinto dal suo passato…`.
- **L'italiano si propaga.** Il `LEGAME` italiano diventa frase di continuità
  della storia successiva. Il riassunto entra nella memoria lunga, e il secondo
  «Questo sogno» (12:51) lo riceve in ingresso: per questo è stato caricato il
  traduttore italiano → inglese, usato solo per quell'evento.
- **Il prompt di «Questo sogno» contiene tre innesti italiani**:
  - `The title must be exactly: Questo sogno` (`coscienzaOnirica.ts:984`), che
    è ridondante: il titolo viene già imposto dal codice alla riga 907;
  - il blocco `AUTHORITATIVE ORIGINAL ITALIAN PROMPTS`
    (`coscienzaOnirica.ts:1036`), che ripete le stesse frasi inglesi sotto
    un'etichetta che le dichiara italiane e autorevoli;
  - il seme di continuità, che termina con la frase fissa italiana
    `apre un dettaglio inatteso oltre la soglia successiva`
    (`coscienzaOnirica.ts:460`).
- **Quella frase fissa compare in ogni storia**, unita alla riga inglese, nella
  voce `CONTINUITÀ` del pannello a video.
- `generateSessionMemo`, l'unico prompt che chiede italiano, non viene mai
  chiamato.
- Il system prompt del compito `scene` è in italiano
  (`brainAiWorker.ts:525`). Nel log nessuna fase degli episodi è uscita in
  italiano, mentre il Visual Plan di «Questo sogno» sì.

### Interpretazione

I tre innesti spiegano perché Qwen 0.5B passa all'italiano solo in «Questo
sogno», l'unico percorso che li contiene. Il nesso causale è dedotto, non
provato: lo conferma solo il collaudo.

### Costo misurato di una singola «Questo sogno» in questa sessione

| Voce | Costo |
|---|---:|
| Storia Qwen | 24–30 s |
| Visual Plan, rifiutato 2 volte su 2 | ~17 s |
| 4 raster da prompt italiani | ~15–29 s ciascuno |
| Traduttore (solo la seconda volta) | ~4 s |

Sono 8 raster su 36 prodotti da testo italiano. Quanto Stable Diffusion li
legga male è un'ipotesi, non misurata.

---

## 3. 📋 Prerequisiti e Contesto

### File / Moduli Coinvolti

- `src/renderer/output/brain/coscienzaOnirica.ts` e relativi test
- `src/renderer/output/brain/brainAiWorker.ts`
- `working/DEPRECATED.md`, `working/`

### Audit preventivo `working/DEPRECATED.md`

- `DEP-001 — NON COINVOLTO`: nessuna relazione con il testo delle storie.
- `DEP-002 — AGGIORNARE`: intervento limitato a togliere dal prompt gli innesti
  italiani, su richiesta esplicita del Capo Supremo. Nessuna nuova capacità;
  stato, sostituto e criterio di dismissione restano invariati.

### Decisioni

- **D1 — «Questo sogno» resta.** È stato ripristinato dal Capo Supremo il
  2026-10-19: il piano lo corregge e non lo dismette. Il titolo a video resta
  `Questo sogno`, imposto dal codice a costo zero.
- **D2 — System prompt `scene` in inglese (proposta, da approvare).** Stessa
  posizione di partenza del compito `story`, già in inglese. È una traduzione
  fedele: libertà e limite sugli adulti consenzienti restano identici nel
  significato. Il log non prova che oggi causi italiano nelle fasi.
- **D3 — Nessun filtro preventivo (proposta, da approvare).** Si tolgono le
  cause senza aggiungere controlli, come chiede il Divieto di
  sovrastrutturazione. Solo se il collaudo mostra ancora storie italiane si
  valuterà di riusare `isLikelyEnglishInput` per scartarle verso il fallback
  esistente.

### Fuori dal piano

- Etichette fisse del pannello (`SOGGETTO`, `CONTINUITÀ`, `Apertura`…): sono
  interfaccia, non generano e non costano nulla.
- La traduzione italiano → inglese resta per le frasi della Sessione pubblica.
  Si salta già da sola sugli input inglesi.
- Ricordi già salvati in `.coscienza/`: non si riscrivono.
- Il Visual Plan rifiutato 2 volte su 2: resta da osservare al collaudo.
- Istruzioni copiate da Qwen nei prompt immagine (vedi §7): problema distinto.

---

## 4. ⚠️ Regole e Vincoli di Sviluppo (da `agents.md`)

- [x] Audit dei deprecati completato prima di definire le modifiche.
- [ ] Nessun cambiamento a `backgroundThrottling`, permessi media, DevTools o
      `lowPowerMode`.
- [x] **Divieto di sovrastrutturazione**: solo rimozioni e traduzioni di testo;
      nessun nuovo meccanismo.
- [x] **Decisioni etiche**: il limite sugli adulti e `blockExplicitImages` non
      cambiano portata; la traduzione di D2 non altera nessuna misura.
- [x] **Protocollo visivo**: nessun effetto su renderer, camera, silenzio,
      beat, transizioni.
- [x] **Costo**: riduce lavoro, non ne aggiunge.

---

## 5. 🛠️ Fasi di Implementazione e Checklist Task

### Fase 1: Togliere l'italiano dal prompt di «Questo sogno»

- [ ] **TASK-055-01**: rimuovere la riga `The title must be exactly: Questo
      sogno`, lasciando l'imposizione del titolo nel codice.
- [ ] **TASK-055-02**: rimuovere il blocco `AUTHORITATIVE ORIGINAL ITALIAN
      PROMPTS`, lasciando soltanto `ENGLISH INPUT PROMPTS`.

### Fase 2: Togliere l'italiano dalle frasi fisse

- [ ] **TASK-055-03**: rendere inglese la frase fissa del legame in
      `fallbackUiCore`.
- [ ] **TASK-055-04**: tradurre il system prompt `scene` (se approvata D2).

### Fase 3: Documentazione e test

- [ ] **TASK-055-05**: aggiornare i test che fissano testi modificati e
      aggiungere un test: il prompt di sintesi non contiene `Questo sogno` né
      `ITALIAN`.
- [ ] **TASK-055-06**: aggiornare `working/DEPRECATED.md` con l'audit del
      2026-10-31 su DEP-002.

### Fase 4: Verifica

- [ ] **TASK-055-07**: `pnpm typecheck`, `pnpm lint`, suite completa, `pnpm build`.
- [ ] **TASK-055-08**: collaudo del Capo Supremo sulla base in inglese.

---

## 6. 🧪 Strategia di Verifica e Validation Plan

- **Comandi di Test**:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm build`
- **Verifica Manuale**, con almeno due «Questo sogno» nella sessione. Dai log:
  - `effectivePrompts` sempre in inglese;
  - nessun `translate-input` con base inglese;
  - nessuna frase italiana in `CONTINUITÀ` o in `SOGGETTO`, a parte il titolo
    `Questo sogno`;
  - il Visual Plan con storia inglese viene accettato o rifiutato: annotare
    quale dei due casi avviene, per la scelta su DEP-002.

---

## 7. 📝 Note e Registro Avanzamento

- **2026-10-31**: creazione del piano. DEP-001 `NON COINVOLTO`; DEP-002
  `AGGIORNARE`. D2 e D3 attendono approvazione. Indipendente da PIANO-054.
- **2026-10-31**: rilievo a margine, non incluso. Nello stesso log Qwen copia
  la propria istruzione e diventa prompt immagine: `The densest moment: the
  elements of images 1 and 2 overlap in a single image.` compare alla lettera
  in 2 episodi su 7 e in variante in altri 2.
