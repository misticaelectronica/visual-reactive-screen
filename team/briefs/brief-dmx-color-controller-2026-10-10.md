# BRIEF DI PROGETTO — HIGH LEVEL DMX COLOR CONTROLLER

> **Destinatari:** Capo Supremo degli Ingegneri
> **Mittente:** Vicario del Capo Supremo
> **Stato:** decisione architetturale
> **Ambito:** motore autonomo per il controllo delle luci DMX
> **Archiviato:** 2026-10-10, testo riportato integralmente senza riscritture.
> **Piano di Lavoro:** `working/plans/piano-048-dmx-color-controller.md`

## 1. DECISIONE

Realizzare un motore DMX autonomo e indipendente da Brain.

Il componente deve funzionare come controller di alto livello:

`SISTEMA CLIENT`
`→ COLORI / PALETTE / TRANSIZIONE`
`→ DMX COLOR CONTROLLER`
`→ FIXTURE DMX`

Il controller non deve conoscere il significato dei colori ricevuti.

Deve semplicemente ricevere uno stato cromatico desiderato e realizzarlo fisicamente sulle luci.

I primi sistemi che successivamente lo utilizzeranno saranno:

- Brain;
- Morphing.

Il controller deve però poter funzionare anche autonomamente e accettare in futuro altri producer.

## 2. RESPONSABILITÀ DEL CONTROLLER

Il motore deve occuparsi di:

1. gestione dell'interfaccia DMX;
2. configurazione delle fixture;
3. mapping logico → canali DMX;
4. ricezione dei colori target;
5. interpolazione cromatica;
6. gestione delle dissolvenze;
7. gestione della luminosità;
8. mantenimento dello stato corrente;
9. trasmissione DMX continua;
10. gestione delle condizioni di errore.

Il producer esterno specifica **cosa vuole ottenere**.

Il controller decide **come tradurlo nel protocollo e nell'hardware DMX configurato**.

## 3. CONFINE ARCHITETTURALE

Brain non deve:

- aprire direttamente porte seriali;
- conoscere canali DMX;
- conoscere RGB/RGBW;
- conoscere indirizzi DMX;
- conoscere chipset USB-DMX;
- generare frame DMX;
- gestire timing DMX.

Morphing deve rispettare lo stesso confine.

Entrambi comunicano esclusivamente con l'API di alto livello del controller.

## 4. MODELLO DI COMANDO

Il controller deve ricevere comandi semantici semplici.

Esempio concettuale:

`setColors(colors, transition)`

oppure:

`setPalette(colors, transition)`

Dati minimi:

- lista dei colori;
- durata della transizione;
- eventuale luminosità globale.

Esempio:

`colors = [#A82431, #D78A45, #273C72, #72517E]`

`transition = 8000 ms`

Il producer non deve specificare valori DMX raw.

## 5. STATO INTERNO

Il motore deve mantenere almeno:

`currentState`

`targetState`

`transitionStart`

`transitionDuration`

`fixtureConfiguration`

Durante una transizione deve interpolare continuamente:

`CURRENT COLOR → TARGET COLOR`

Il passaggio deve rimanere continuo anche se arriva un nuovo comando prima che la dissolvenza precedente sia terminata.

In quel caso il nuovo movimento deve partire dallo **stato cromatico effettivamente raggiunto in quel momento**, evitando salti.

## 6. FIXTURE ASTRATTE

Il software deve ragionare in termini di fixture logiche.

Esempio:

`LIGHT 1`
`LIGHT 2`
`LIGHT 3`
`LIGHT 4`

La configurazione hardware stabilisce poi:

`LIGHT 1 → fixture DMX address X`
`LIGHT 2 → fixture DMX address Y`
`LIGHT 3 → fixture DMX address Z`
`LIGHT 4 → fixture DMX address W`

Il client deve poter dire:

`LIGHT 1 = #FF3200`

senza conoscere il corrispondente canale DMX.

## 7. FIXTURE PROFILE

Prevedere un livello di configurazione per descrivere il dispositivo reale.

Esempio concettuale:

`RGB`

oppure:

`RGBW`

con eventuali:

- master dimmer;
- strobo;
- macro;
- programmi automatici.

Il profilo traduce il comando cromatico astratto nei canali realmente utilizzati dalla fixture.

Le funzioni non richieste devono essere mantenute in uno stato neutro/disabilitato.

## 8. HARDWARE INIZIALE

Prima configurazione prevista:

`USB-DMX`
`→ PAR 1`
`→ PAR 2`
`→ PAR 3`
`→ PAR 4`

Quattro PAR con indirizzi distinti.

La prima implementazione deve supportare questa configurazione senza vincolare l'architettura specificamente a quattro fixture.

Il numero di fixture deve essere configurabile.

## 9. TRANSIZIONI

La dissolvenza deve essere responsabilità del controller.

Il producer comunica:

`target colors`
+
`transition duration`

Il controller realizza autonomamente il movimento.

Prima versione:

- interpolazione continua RGB;
- durata configurabile;
- nessun salto;
- nessun programma automatico interno ai PAR.

Non serve nella prima versione introdurre curve di easing elaborate.

Una transizione lineare è sufficiente come comportamento iniziale.

## 10. LUMINOSITÀ

Il controller deve prevedere una luminosità globale separata dal colore.

Concettualmente:

`masterIntensity = 0..1`

Questo permette successivamente a Brain, Morphing o altri sistemi di controllare il livello luminoso senza alterare la palette.

Per il primo utilizzo può restare costante.

## 11. API DI ALTO LIVELLO

L'Ingegneria sceglie il meccanismo tecnico più coerente con l'architettura esistente.

L'interfaccia funzionale deve permettere almeno:

`connect()`

`disconnect()`

`setColors(...)`

`setMasterIntensity(...)`

`blackout()`

`getStatus()`

Non viene prescritta dal brief la tecnologia di comunicazione interna.

## 12. BLACKOUT

Il controller deve avere un comando esplicito:

`BLACKOUT`

che porta tutte le fixture a emissione zero in modo controllato.

Il blackout deve essere disponibile indipendentemente dal producer attualmente collegato.

## 13. CONTROLLER MANUALE

Il motore deve poter essere testato e utilizzato senza Brain e senza Morphing.

Prevedere quindi una piccola interfaccia tecnica che permetta almeno:

- connessione DMX;
- selezione colore per ogni fixture;
- luminosità;
- durata fade;
- applicazione del nuovo stato;
- blackout;
- visualizzazione dello stato della connessione.

Questa interfaccia serve sia al collaudo hardware sia all'utilizzo autonomo del sistema.

Non deve diventare una console luci complessa.

## 14. INTEGRAZIONE FUTURA — BRAIN

Brain diventerà un producer del controller.

Prima integrazione prevista:

`PALETTE NOMINALE DELLA STORIA`
`→ DMX COLOR CONTROLLER`

Brain potrà inviare, per esempio:

`4 colori + durata dissolvenza`

Il controller ignora completamente:

- storia;
- Soglia;
- Metamorfosi;
- Condensazione;
- Eco;
- ANIMATRONIX;
- Psichedel;
- Audio.

Riceve esclusivamente il comando cromatico.

## 15. INTEGRAZIONE FUTURA — MORPHING

Morphing dovrà utilizzare lo stesso controller.

Quando Morphing determina uno stato cromatico o una trasformazione cromatica:

`MORPHING`
`→ target cromatico`
`→ DMX COLOR CONTROLLER`

Il motore DMX non deve contenere codice specifico per Morphing.

Brain e Morphing devono risultare semplicemente due producer differenti dello stesso sistema.

## 16. ARBITRAGGIO DEI PRODUCER

Il controller deve avere un solo producer attivo alla volta oppure una regola esplicita di ownership.

Prima versione consigliata:

`un producer possiede il controller`

Finché mantiene l'ownership, gli altri producer non devono sovrascriverne lo stato accidentalmente.

Prevedere quindi concettualmente:

`acquire`
`release`

oppure un meccanismo equivalente scelto dall'Ingegneria.

Questo evita conflitti quando Brain e Morphing saranno entrambi disponibili.

## 17. FAILURE ISOLATION

Un errore DMX non deve propagarsi al producer.

Se:

- la porta USB scompare;
- il dongle viene scollegato;
- una scrittura fallisce;
- la fixture non risponde come previsto;

il controller:

1. registra l'errore;
2. aggiorna il proprio stato;
3. tenta il comportamento di recupero previsto;
4. comunica il failure al producer.

Brain e Morphing devono poter continuare a funzionare indipendentemente.

## 18. OSSERVABILITÀ

Loggare eventi significativi:

`controller started`

`DMX connected`

`DMX disconnected`

`producer acquired`

`producer released`

`target colors received`

`transition started`

`transition completed`

`blackout`

`configuration loaded`

`failure reason`

Evitare il log di ogni frame DMX.

## 19. FUORI PERIMETRO DELLA PRIMA VERSIONE

Non introdurre ancora:

- beat-sync;
- analisi audio;
- estrazione colore dalle immagini;
- palette per raster;
- strobo narrativo;
- chase;
- sequencer;
- timeline;
- moving head;
- Art-Net;
- sACN;
- cue list;
- lighting scene editor;
- interpretazione semantica dei colori.

Il motore deve rimanere un **esecutore cromatico ad alto livello**.

## 20. CRITERIO DI RIUSCITA

Il componente è valido quando può essere avviato autonomamente e ricevere un comando equivalente a:

`porta queste quattro luci a questi quattro colori in 8 secondi`

e realizzarlo senza che il chiamante debba conoscere alcun dettaglio DMX.

Successivamente lo stesso identico comando deve poter provenire da:

`interfaccia manuale`

oppure:

`Brain`

oppure:

`Morphing`

senza cambiare il motore sottostante.

## PRINCIPIO ARCHITETTURALE

Il controller DMX è un **attuatore cromatico indipendente**.

Brain immagina.

Morphing trasforma.

Il controller DMX riceve uno stato cromatico e lo realizza fisicamente nello spazio.

---

**Vicario del Capo Supremo — Brain (MeRS)**
