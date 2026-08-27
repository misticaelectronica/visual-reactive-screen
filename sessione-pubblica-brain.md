# Sessione pubblica: frasi dal pubblico per Brain

Durante uno show, il pubblico può scrivere frasi da un telefono (via QR code)
che Brain trasforma in storie dedicate, senza bisogno di un database online
gestito da noi: la sorgente è un Google Form pubblico collegato a un Google
Sheet pubblicato come CSV.

Ci sono due file in `config/`:

- **[`brainPhrasesBaseStory.txt`](config/brainPhrasesBaseStory.txt)** — il set curato a mano, eterno, **non
  viene mai scritto da noi**. È la fonte di verità di sempre.
- **[`brainPhrases.txt`](config/brainPhrases.txt)** — il file che Brain legge davvero per il
  campionamento casuale delle storie. A sessione chiusa (compreso l'avvio
  dell'app) è sempre una copia di [`brainPhrasesBaseStory.txt`](config/brainPhrasesBaseStory.txt). A sessione
  aperta, il suo contenuto **è** quello raccolto dal pubblico: alla
  apertura viene sovrascritto con tutto quello che c'è già nel foglio in
  quel momento, poi ogni riga nuova si aggiunge in coda man mano che
  arriva. Alla chiusura torna al set curato.

In più, ogni singola frase appena raccolta genera anche, indipendentemente
dal campionamento, una **storia dedicata una tantum** (vedi sotto) — quindi
un input online ha due effetti: entra nel pool di [`brainPhrases.txt`](config/brainPhrases.txt) per il
resto della sessione, *e* fa nascere subito una storia tutta sua.

## Creare il Google Form (una tantum)

1. Vai su [forms.google.com](https://forms.google.com) e crea un nuovo Form vuoto.
2. Dai un titolo (es. "Scrivi la tua frase per Brain").
3. Aggiungi **una sola domanda**, tipo "Paragrafo" (meglio di "Risposta
   breve", così chi scrive non è limitato a una riga). Non serve altro campo.
4. Nelle impostazioni del Form (icona ingranaggio):
   - **Generale** → disattiva "Limita a 1 risposta" (deve restare spento).
   - **Generale** → assicurati che non sia richiesto il login Google per
     rispondere ("Raccogli indirizzi email" spento — su account personali
     di solito è già così di default).
   - Nessuna domanda deve essere obbligatoria.

## Collegare il Google Sheet

5. Nella scheda "Risposte" del Form, clicca l'icona verde del foglio di
   calcolo (Crea foglio di calcolo) → crea un nuovo Sheet collegato. Ogni
   risposta inviata dal pubblico finisce lì in automatico, con una colonna
   Timestamp aggiunta da Google.

## Pubblicare il Sheet come CSV

6. Apri il Google Sheet appena creato.
7. Menu **File → Condividi → Pubblica sul web**.
8. Seleziona il foglio giusto (di solito "Foglio1") e come formato scegli
   **Valori separati da virgola (.csv)**.
9. Clicca **Pubblica**, conferma. L'URL generato finisce con `output=csv`:
   è l'**URL CSV** da incollare nel pannello di Brain.

## Recuperare l'URL del Form per il QR

10. Torna al Form, clicca **Invia** (in alto a destra) → tab del link
    (icona catena) → copia il link. È l'**URL Form** da incollare nel
    pannello.

Fatto questo una volta, Form e Sheet restano sempre gli stessi: non vanno
ricreati per ogni show, si apre e chiude solo la sessione da Brain.

## Uso durante lo show

Nel pannello di controllo di Brain, sezione **"Sessione pubblica (frasi dal
pubblico)"**:

1. Incolla i due URL (Form e CSV) — serve farlo una sola volta, restano
   salvati nelle impostazioni.
2. Premi **Apri sessione pubblica**: compare il QR, sia nel pannello di
   controllo sia sovraimpresso in basso a sinistra sull'uscita video (nella
   misura più piccola ancora leggibile da un telefono).
3. Il polling del foglio avviene ogni 8 secondi. Alla prima apertura viene
   preso tutto quello che c'è già nel foglio in quel momento; da lì in poi
   solo quello che non è già stato preso.
4. Ogni frase raccolta (troncata a 3000 caratteri se più lunga):
   - genera subito una **storia dedicata**, con priorità sulle storie
     casuali non ancora mostrate (quella in onda al momento non viene
     interrotta, ma è la prossima a partire);
   - si aggiunge anche in coda a [`brainPhrases.txt`](config/brainPhrases.txt), per il campionamento
     delle storie successive — una riga del CSV resta una riga del file
     anche se la risposta scritta dal pubblico va a capo più volte.
5. Nella sidebar della storia (l'overlay verde a sinistra sull'output),
   solo per le storie nate da un input online, compare un blocco in verde
   più spento con i primi 200 caratteri dell'input.
6. **Chiudi sessione** ferma il polling e riporta [`brainPhrases.txt`](config/brainPhrases.txt) al set
   curato di [`brainPhrasesBaseStory.txt`](config/brainPhrasesBaseStory.txt).
