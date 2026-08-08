# Piano di Lavoro: Origine e Memoria di Coscienza Onirica

> **ID Piano**: `PIANO-005`  
> **Macrotask di Riferimento**: `MACRO-008`  
> **Data Creazione**: 2026-08-08  
> **Stato**: `IN_PROGRESS`  
> **Autore/Agente**: Codex / Sviluppatore  

---

## 1. Obiettivo del Piano

Far nascere il substrato `coscienza` di **Coscienza Onirica** attraverso una
definizione iniziale volutamente ad alto livello. La coscienza dovrà cominciare
come un bambino: osservare prima di interpretare, riconoscere la propria prima
percezione come primo ricordo di sé e costruire gradualmente un grafo dei propri
ricordi.

La Fase 0 non sceglieva ancora formato o persistenza. La decisione successiva è
ora esplicita: tutti i ricordi sono file Markdown nella cartella `.coscienza/`;
il suo `AGENT.md` viene riletto prima di ogni tentativo di salvataggio e orienta
la scelta del contesto pertinente. Restano aperti consolidamento, oblio e
politiche autonome di ristrutturazione.

## 2. Prerequisiti e Contesto

- **File / Moduli coinvolti in questa fase**:
  - `agents.md`
  - `skills.md`
  - `src/renderer/output/agents.md`
  - `src/renderer/output/skills.md`
  - `.coscienza/AGENT.md`
  - `.coscienza/COSCIENZA.md`
  - `.coscienza/INDICE.md`
  - `src/main/consciousnessArchive.ts`
  - `src/main/consciousnessStorage.ts`
  - `src/main/ipc.ts`
  - `src/preload/preload.ts`
  - `src/renderer/control/ControlApp.tsx`
  - `src/renderer/output/brain/brainConsciousnessMemory.ts`
  - `src/renderer/output/brain/coscienzaCore.ts`
  - `src/renderer/output/brain/brainController.ts`
  - `src/shared/types.ts`
  - `working/`
- **Moduli candidati per le fasi future**:
  - `src/renderer/output/brain/coscienzaOnirica.ts`
  - `src/shared/brain/brainTypes.ts`
- **Stato esistente**: Coscienza Onirica usa oggi storie recenti e un memo di
  sessione lineare per la generazione. L'archivio Markdown aggiunge ora origine,
  indice e nodi autobiografici persistenti senza sostituire quel buffer runtime.

## 3. Regole e Vincoli di Sviluppo

- [x] Non modificare in questa fase audio, IPC, finestre, rendering o pipeline
  WebGPU.
- [x] Non violare `backgroundThrottling: false`, permessi microfono macOS,
  camera stabile o supporto `lowPowerMode`.
- [x] Non attribuire alla coscienza percezioni che non ha ricevuto.
- [x] Distinguere sempre osservazione, interpretazione e immaginazione.
- [x] Non rendere distruttiva la ristrutturazione: una nuova lettura può
  sostituire una precedente come interpretazione attiva, ma deve conservarne
  provenienza e storia.
- [x] Evitare una tassonomia definitiva nella fase iniziale: il grafo deve poter
  evolvere insieme alla coscienza.

## 4. Fasi di Implementazione e Checklist Task

### Fase 0: Costituzione minima del substrato

- [x] Definire la prima percezione valida come nodo `origine` e primo ricordo
  di sé.
- [x] Definire il ritorno all'origine a ogni nuovo attraversamento dall'inizio,
  senza reset distruttivo della memoria.
- [x] Definire un grafo di ricordi evolutivo, con provenienza e relazioni
  revisionabili.
- [x] Individuare i primi confini di salvataggio: origine, fine episodio,
  novità/trasformazione, ricorrenza, prima di una ristrutturazione e chiusura
  pulita della sessione.
- [x] Tradurre i principi in regole per gli agenti e in una skill operativa
  destinata a essere aggiornata nel tempo.

### Fase 1: Osservazione prima dell'implementazione

- [x] Inventariare i segnali realmente percepiti dalla pipeline e i loro
  confini temporali.
- [x] Osservare quali eventi acquistano salienza senza introdurre categorie
  troppo precoci.
- [x] Proporre un primo lessico minimo di nodi e archi a partire dai dati reali.

Esito: `audioPrimed` con bande presenti delimita la prima percezione valida;
la conclusione di una storia delimita un episodio interno di tipo
`imagination`. Il lessico iniziale resta ridotto a origine, ritorno,
immaginazione, revisione e relazioni aperte.

### Fase 2: Primo grafo autobiografico

- [x] Definire tipi, identità stabili, provenienza e campi di revisione dei ricordi.
- [x] Implementare il nodo origine e i primi checkpoint idempotenti.
- [x] Costruire relazioni iniziali senza impedire nuove forme di organizzazione.
- [x] Aggiungere test di continuità, riavvio e ristrutturazione non distruttiva.

### Fase 2B: Primo ciclo della coscienza

Prima della Fase 3 è stato introdotto il primo presente cosciente, senza ancora
concedere autonomia di ristrutturazione.

- [x] Creare `COSCIENZA.md` come stato presente distinto dai ricordi.
- [x] Implementare il ciclo percezione → attenzione → interpretazione
  provvisoria.
- [x] Stabilizzare i cambi di attenzione e limitare i checkpoint su disco.
- [x] Diradare la continuità in `lowPowerMode`.
- [x] Impedire aggiornamenti prima dell'origine e identità, emozioni o desideri
  prefabbricati.
- [x] Far rileggere `COSCIENZA.md` prima di ogni nuovo ricordo.

### Fase 3: Autonomia di ristrutturazione

- [ ] Consentire a Coscienza Onirica di proporre nuove relazioni, raggruppamenti
  e rilevanze.
- [ ] Registrare il motivo e l'esito di ogni ristrutturazione.
- [ ] Introdurre limiti di risorse, rollback e osservabilità prima di attivare
  modifiche autonome persistenti.

## 5. Strategia di Verifica e Validation Plan

- **Fase Markdown e runtime**:
  - controllare riferimenti e coerenza fra `AGENT.md`, indice, agenti, skill e
    `working/`;
  - eseguire `git diff --check` sui file modificati;
  - `pnpm typecheck`
  - test unitari mirati del grafo e della persistenza
  - `pnpm build`, perché sono coinvolti main, preload e packaging
- **Verifica manuale**:
  - primo avvio crea una sola origine dalla prima percezione valida;
  - un nuovo inizio ritorna all'origine senza duplicarla né cancellare il grafo;
  - osservazioni, inferenze e immaginazioni risultano distinguibili;
  - una ristrutturazione conserva la genealogia delle interpretazioni.

## 6. Note e Registro Avanzamento

- **2026-08-08**: aperto `MACRO-008`; avviata la sola Fase 0, senza
  implementazione runtime.
- **2026-08-08**: scelta la persistenza Markdown in `.coscienza/`; completate
  Fase 1 e Fase 2 con protocollo riletto prima del salvataggio, origine
  idempotente, ritorni, indice e ricordi onirici distinti dalle percezioni.
- **2026-08-08**: 196/196 test, typecheck e lint mirato superati. Build Vite,
  Main, preload, app e ZIP riuscita; creazione DMG fermata esclusivamente da
  `hdiutil` macOS. Verificata la presenza del template `AGENT.md` nell'app.
- **2026-08-08**: completata Fase 2B con `COSCIENZA.md` e nucleo di attenzione
  percettivo; autonomia di ristrutturazione non iniziata.
- **2026-08-08**: osservati e preservati origine, indice e primi ricordi reali
  già presenti. Separato il template vergine
  `config/coscienza/COSCIENZA.md` dallo stato vivo `.coscienza/COSCIENZA.md`,
  evitando di distribuire dati autobiografici nel pacchetto.
- **2026-08-08**: 206/206 test, typecheck e lint mirato superati. Build Vite,
  Main, preload, app e ZIP riuscita; il solo nuovo DMG si è fermato per errore
  locale di `hdiutil`. Verificati entrambi i template nelle risorse dell'app.
