# AL CAPO SUPREMO DEGLI INGEGNERI

## BRAIN (MeRS) — RIATTIVAZIONE COMPATTA E NUOVE SEQUENZE VISUALI

**Mittente:** Vicario del Capo Supremo  
**Stato:** direttiva per valutazione e implementazione  
**Ambito:** Riattivazione + supporto a sequenze raster pre-generate

### 1. Riattivazione — problema osservato

La Riattivazione attuale tende a diventare troppo lunga, soprattutto con l'aumentare del numero di storie presenti nella sessione.

Dal vivo il comportamento rischia di diventare:

- ripetitivo;
- prevedibile;
- sproporzionato rispetto al resto del ciclo;
- troppo concentrato sulla riproposizione di materiale già visto.

La Riattivazione deve quindi essere compressa.

### 2. Principio di memoria progressivamente compressa

Le storie più recenti possono conservare una presenza maggiore.

Procedendo verso il passato, la rappresentazione deve ridursi.

Riferimento iniziale:

- storia appena conclusa: rappresentazione più ricca;
- storia precedente: ancora sufficientemente presente;
- dalla terza storia precedente in poi: **massimo un raster per storia**.

Il principio è:

`memoria recente = più dettagliata`

`memoria lontana = più sintetica`

Le storie vecchie devono essere richiamate, non riprodotte nuovamente per esteso.

### 3. Durata

La durata della Riattivazione non deve crescere linearmente insieme al numero di storie.

Aumentare la memoria della sessione deve aumentare la profondità del passato disponibile, non produrre una Riattivazione sempre più lunga.

Come riferimento iniziale per il collaudo:

`circa 6–12 secondi`

con un limite indicativo nell'ordine dei:

`15 secondi`

Questi valori non sono ancora una specifica percettiva definitiva e potranno essere tarati dal vivo.

### 4. Scelta del raster rappresentativo

Quando una storia vecchia deve essere ridotta a un solo raster, utilizzare inizialmente un criterio semplice, stabile e deterministico.

Non introdurre ora:

- analisi semantiche aggiuntive;
- ranking complessi;
- nuovi modelli;
- sistemi di scoring non necessari.

La qualità percettiva del criterio verrà valutata successivamente.

---

# NUOVE SEQUENZE DI RASTER

### 5. Obiettivo

Brain deve poter utilizzare anche **sequenze di immagini generate anticipatamente**.

Il principio è:

`Brain genera immagini statiche in anticipo`

`→ le immagini vengono salvate`

`→ organizzate in una sequenza ordinata`

`→ caricate`

`→ richiamate durante il ciclo`

`→ riprodotte come sequenza`

Queste immagini non vengono generate in tempo reale durante la riproduzione della sequenza.

### 6. Asset

Una sequenza deve poter contenere un numero arbitrario di raster ordinati.

Esempio concettuale:

`sequence_01`

- frame_001
- frame_002
- frame_003
- ...
- frame_N

L'ordine deve essere preservato.

### 7. Riproduzione

La prima infrastruttura deve permettere almeno:

- caricamento della sequenza;
- mantenimento dell'ordine;
- avvio;
- avanzamento fra i raster;
- controllo della velocità;
- conclusione;
- restituzione corretta del controllo al ciclo di Brain.

### 8. Animazione

La grammatica definitiva di animazione non è ancora decisa.

Non introdurre automaticamente:

- optical flow;
- interpolazione AI;
- morphing;
- zoom;
- glitch;
- dissolvenze;
- effetti aggiuntivi.

La prima versione deve poter funzionare anche come semplice successione temporale di raster.

Il comportamento verrà valutato con materiale reale prima di decidere come animarlo.

### 9. Rapporto con le sequenze/fasi già in sviluppo

L'Ingegneria sta già lavorando o valutando l'organizzazione delle diverse sequenze/fasi di Brain, incluse strutture legate a:

- Soglia;
- Metamorfosi;
- Condensazione;
- Eco;
- altri passaggi Visual.

Non assumiamo che il nuovo requisito sia già coperto.

Si chiede però al Capo Supremo degli Ingegneri di verificare se la gestione delle nuove sequenze raster possa essere integrata coerentemente nell'architettura già in corso.

Se esiste già un meccanismo generale adatto:

**preferire il riuso e l'estensione.**

Se invece il requisito è sostanzialmente diverso:

**separarlo senza forzare l'architettura esistente.**

Non creare doppioni soltanto per aderire letteralmente al termine “slot”.

### 10. Confine fra Visual e Ingegneria

Il requisito Visual è:

> poter richiamare una sequenza pre-generata e farla vivere temporalmente dentro Brain.

L'Ingegneria decide:

- struttura dati;
- lifecycle;
- caching;
- caricamento;
- scheduling;
- integrazione con il ciclo esistente;
- eventuale riuso delle strutture già sviluppate.

La grammatica percettiva della sequenza verrà definita successivamente dal Visual.

### 11. Vincoli

Questa modifica non deve alterare automaticamente:

- ANIMATRONIX;
- Psichedel;
- generazione ordinaria dei quattro raster;
- Audio;
- Coscienza Onirica;
- Color Direction;
- fase Raster/Filtri.

Eventuali interazioni con questi componenti devono essere esplicite e motivate.

### 12. Failure e fallback

Una sequenza mancante, incompleta o non caricabile non deve bloccare Brain.

In caso di failure:

- loggare la causa;
- saltare la sequenza;
- proseguire con il ciclo previsto.

### 13. Osservabilità minima

Loggare:

`sequence loaded`

`sequence started`

`sequence frame count`

`sequence completed`

`sequence skipped`

`failure reason`

Per Riattivazione:

`stories available`

`rasters selected`

`selected raster per story`

`reactivation duration`

### 14. Criteri di riuscita

**Riattivazione**

La fase deve risultare sensibilmente più breve e meno ripetitiva, pur mantenendo la percezione della memoria accumulata nella sessione.

**Sequenze**

Il sistema deve poter:

1. caricare una sequenza raster pre-generata;
2. mantenerne l'ordine;
3. riprodurla;
4. controllarne il tempo;
5. terminarla senza interferire con il resto di Brain.

### 15. Punto ancora aperto

La grammatica definitiva di animazione delle sequenze resta volutamente aperta.

Prima costruiamo l'infrastruttura e guardiamo materiale reale.

Poi decidiamo come farlo muovere.

---

**Vicario del Capo Supremo — Brain (MeRS)**
