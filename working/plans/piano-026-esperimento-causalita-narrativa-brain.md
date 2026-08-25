# Piano di Lavoro: Esperimento Causalità Narrativa Brain

> **ID Piano**: `PIANO-026`
> **Macrotask di Riferimento**: `MACRO-024`
> **Data Creazione**: 2026-08-16
> **Stato**: `COMPLETATO`
> **Autore/Agente**: Codex

---

## 1. Obiettivo del Piano

Dimostrare con il minimo intervento che Brain può avviare la generazione delle
immagini da stimoli, memoria e stato già disponibili senza richiedere prima una
`DreamStory` narrativa completa. I quattro prompt diretti sono uno strumento di
prova compatibile con la pipeline corrente, non il modello definitivo
dell'attività onirica.

---

## 2. Prerequisiti e Contesto

- Baseline approvata: commit `e21fddb`.
- Branch: `feature/brain-dream-causality-experiment`.
- Moduli principali:
  - `src/renderer/output/brain/coscienzaOnirica.ts`
  - `src/renderer/output/brain/brainController.ts`
  - test mirati in `src/renderer/output/brain/`
- `Psichedel`, renderer, buffer, timeline, scheduler e infrastruttura devono
  restare invariati per quanto possibile.

---

## 3. Regole e Vincoli

- [x] Camera e quadro non vengono modificati.
- [x] Materia visuale e comportamento in silenzio non vengono modificati.
- [x] Beat, quattro immagini e timeline sono vincoli dell'MVP corrente, non
  proprietà filosofiche di Brain.
- [x] `lowPowerMode`, alternanza e budget restano invariati.
- [x] Nessun `DreamField`, motore di stato, genealogia strutturata, embedding,
  continuità latente, state machine o framework nuovo.
- [x] Qwen può contribuire a una trasformazione semantica, ma non possiede la
  continuità dell'esperienza e non genera una storia preventiva.
- [x] Nessun ruolo fisso per sorgenti o posizioni delle quattro osservazioni.
- [x] I prompt immagine sono rappresentazioni tecniche, non la definizione del
  sogno e non un ricordo autobiografico.

---

## 4. Fasi e Checklist

### Fase 1: Preparazione

- [x] Verificare rollback, typecheck e suite completa.
- [x] Creare commit baseline e branch dedicato.
- [x] Aggiornare piano, protocollo e skill prima del confine di memoria.

### Fase 2: Percorso sperimentale minimo

- [x] Produrre quattro rappresentazioni visuali direttamente dal materiale
  disponibile, senza titolo, trama, bridge o arco obbligatorio.
- [x] Riutilizzare il formato visuale già presente e consentire ripetizione,
  persistenza, variazione minima, omissione e discontinuità.
- [x] Mantenere la continuità operativa nel controller, non nella chiamata Qwen.
- [x] Adattare localmente le osservazioni al contratto legacy necessario a
  buffer e renderer, dopo che i prompt sono già stati prodotti.
- [x] Evitare interpretazione e salvataggio autobiografico preventivi.

### Fase 3: Verifica

- [x] Testare che la generazione visuale non invochi il task Qwen `story`.
- [x] Testare prompt privi di ruoli posizionali e accettazione di ripetizioni.
- [x] Testare presenza di stimoli, memoria e stato senza mapping rigidi.
- [x] Eseguire `pnpm typecheck`, `pnpm test`, lint, build e diff-check.
- [x] Raccogliere esempi e limiti senza estendere l'architettura.

---

## 5. Validation Plan

- Controllo statico del percorso controller → rappresentazioni → Psichedel.
- Test con client Qwen osservabile: una sola chiamata semantica `scene`, zero
  chiamate `story`, `memo` o traduzione per episodio.
- Casi mirati: output ripetuto, variazione minima, omissione di uno stimolo e
  influenza mnemonica non letterale.
- `pnpm typecheck`
- `pnpm test`
- `pnpm lint`
- `git diff --check`

---

## 6. Registro

- **2026-08-16**: baseline `e21fddb`, branch dedicato e piano creati.
- **2026-08-16**: esperimento completato. Tre esecuzioni reali hanno usato una
  chiamata Qwen `scene` ciascuna, zero `story`, traduzioni o `memo`. La
  separazione causale è dimostrata, ma Qwen 0.5B copia materiale astratto,
  reintroduce un protagonista e propaga ripetizioni degenerative. Nessuna
  correzione architetturale successiva è stata introdotta.
- **2026-08-16**: taratura richiesta dopo l'osservazione. Qwen resta una
  facoltà semantica libera: associazioni, simboli e frammenti narrativi possono
  emergere spontaneamente, senza trama o ruoli posizionali obbligatori. Tolto
  anche il minimo forzato di token. Il moto di coscienza è reso esplicito fra i
  materiali disponibili, senza diventare comando o richiedere chiamate Qwen
  aggiuntive.
