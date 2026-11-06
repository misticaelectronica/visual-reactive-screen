# AL CAPO SUPREMO

## BRAIN (MeRS) — FASI ONIRICHE SCRITTE DA QWEN: CONTINUITÀ, METALINGUAGGIO, MATERIA DISTINTIVA

**Mittente:** Vicario del Capo Supremo  
**Data:** 2026-11-06  
**Piano collegato:** [`PIANO-058`](../../working/plans/piano-058-direttive-qwen-fasi-oniriche.md)  
**Nota di archiviazione:** testo riportato integralmente come consegnato dal
Capo Supremo. La numerazione salta dal punto 4 al punto 6: il punto 5 non è
presente nel testo ricevuto.

---

Sì, Capo Supremo. Qui ci sono **sei problemi distinti**, e il sesto è quello che spiega gran parte della sensazione di ripetitività.

### 1. Nome del personaggio vs descrizione fisica

Corretto: per **PornMaster / SD1.5**, `Sal Paradise` da solo non basta. Stable Diffusion non ha memoria dell'episodio e quel nome non garantisce continuità visiva.

Quindi distinguerei nettamente:

**Qwen può usare il nome per ragionare sulla continuità.**  
**Stable Diffusion deve ricevere sempre la descrizione visiva completa.**

Per esempio, Qwen può lavorare con:

`Sal Paradise`

ma il prompt raster deve contenere sempre:

`lean and dark-haired, wearing a white jacket`

o una descrizione equivalente completa e stabile.

Anzi, nel prompt finale SD il nome può anche essere secondario. La parte che conta davvero è:

`lean dark-haired man, white jacket, ...`

La continuità visuale viene dalla **descrizione**, non dal nome.

---

### 2. Aumentare i token del 10%

**Sì, lo farei, ma dopo aver chiuso i difetti grossi.**

Se oggi il limite accettato è circa **45 parole**, porterei il massimo a circa **50 parole**.

Benefici:
- più spazio per ambiente;
- più dettagli materiali;
- più relazioni spaziali;
- più possibilità di descrivere davvero la trasformazione;
- meno frasi povere tipo `moves gracefully over crystals`.

Rischi:
- Qwen 0.5B può usare lo spazio extra per divagare;
- aumenta il rischio di astrazione;
- aumenta il rischio di copiare il brief;
- aumenta la possibilità di introdurre elementi estranei;
- prompt SD più lunghi possono diluire il peso dei concetti principali.

Quindi la mia posizione è:

**+10% sì.**
Ma solo dopo aver imposto che ogni parola aggiunta vada verso **materia visuale concreta**, non verso spiegazioni.

Non aumenterei del 30–50%. Dieci per cento è un test sensato.

---

### 3. Metalinguaggio che non deve mai arrivare a SD

Queste frasi sono effettivamente inaccettabili:

> `The densest moment: the elements of images 1 and 2 intersect in this single image.`

> `image 4 (echo) returns, deformed by what happened in image 1.`

> `The first visual impression...`

Stable Diffusion deve ricevere **la scena risultante**, mai la descrizione del procedimento.

La regola deve essere:

> **Describe only what is physically visible in the resulting image. Never mention images, phases, prompts, previous images, visual impressions or narrative instructions.**

E a valle serve almeno un controllo semplice contro:
- `image 1`, `image 2`, `image 3`, `image 4`;
- `metamorphosis`, `condensation`, `echo`;
- `elements of images`;
- `previous image`;
- copie sostanziali del brief della fase.

Questa è una barriera necessaria.

---

### 4. Le quattro fasi non possono coincidere

Concordo senza riserve.

Deve valere:

```text
SOGLIA ≠ METAMORFOSI
METAMORFOSI ≠ CONDENSAZIONE
CONDENSAZIONE ≠ ECHO
```

e aggiungerei:

```text
SOGLIA ≠ CONDENSAZIONE
SOGLIA ≠ ECHO
METAMORFOSI ≠ ECHO
```

Non soltanto uguaglianza letterale.

Anche questo:

> stessa scena + due aggettivi diversi

non è una vera fase nuova.

Il requisito percettivo dovrebbe essere:

**ogni fase deve introdurre almeno una trasformazione visuale sostanziale rispetto a ciò che la precede.**

Non necessariamente una nuova città o un nuovo soggetto. Anzi: proprio il contrario. Deve cambiare **il materiale esistente**.

---

## 6. Il vero problema della ripetitività

Qui la storia base è molto interessante, perché **non è così ripetitiva come sembrano i risultati**.

Ha degli invarianti intenzionali:

- Sal Paradise;
- magro;
- capelli scuri;
- giacca bianca;
- opal route chip.

Questi servono alla continuità.

Ma ogni riga contiene invece **molta varietà specifica**.

La storia originale fa questo:

| Luogo | Azione unica | Elemento visuale distintivo |
|---|---|---|
| Lisbona | sale sul tram | tram trasparente, terrazze sospese |
| Porto | viaggia con Dean | giardini sospesi, archi magnetici |
| Barcellona | corre | torri ceramiche rotanti, piattaforme olografiche |
| Marsiglia | abbraccia Dean | gigantesco terminal oceanico, hydrofoil sospesi |
| Roma | danza | musicisti levitanti, orchidee |
| Mediterraneo | osserva balene | treno di vetro sott'acqua |
| Alessandria | segue Dean | passerelle di cristallo, collettori a vela |
| Cairo | condivide frutta con una danzatrice | bazar aereo, isole mercato |
| Sahara | pilota un glider | dune specchianti, stazioni flottanti |
| Nairobi | insegue Dean | foresta sospesa, nastri pedonali antigravità |
| Mumbai | gira/danza | sculture di luce liquida, orchestre volanti |
| Kyoto | guarda l'alba con Dean | ascensore orbitale, megastrutture fiorite |

Questa roba è **molto più varia** dei risultati che abbiamo visto.

### Cosa viene rappresentato bene

Qwen/SD mantengono ossessivamente:

- Sal;
- capelli scuri;
- giacca bianca;
- chip opalescente;
- atmosfera futuristica;
- elementi sospesi / levitanti / luminosi.

Quindi gli **invarianti** sono sovrarappresentati.

### Cosa viene rappresentato male o perso

Viene perso proprio ciò che rende ogni storia diversa:

- azione specifica;
- relazione specifica;
- architettura specifica;
- oggetto/scena specifica.

Per esempio:

**Glass Train Crossing**

Originale:

> treno di vetro sott'acqua + Mediterraneo + balene luminose.

Metamorfosi:

> spiaggia al tramonto.

Qui abbiamo perso quasi **tutto il DNA distintivo della riga**.

**Barcelona**

Originale:

> interscambio aereo + torri ceramiche rotanti + piattaforme olografiche.

Metamorfosi:

> monumenti di Parigi + bussola.

Di nuovo, Qwen butta via gli elementi più originali e li sostituisce con roba generica.

**Sahara**

Originale:

> autostrada solare sopraelevata + glider + dune specchianti + stazioni flottanti.

Echo:

> mercato di Baghdad + compratori + artigiani.

Il materiale distintivo sparisce completamente.

---

## Diagnosi del Vicario

La ripetitività non nasce principalmente dalla storia base.

La storia base possiede una struttura molto precisa:

```text
INVARIANTE:
Sal + aspetto + giacca + chip

VARIAZIONE:
città + relazione + azione + architettura + tecnologia
```

Qwen sta facendo quasi l'opposto di quello che ci serve:

```text
mantiene moltissimo:
Sal + giacca + chip

perde:
azione + architettura + elemento unico

e poi inventa:
Parigi + bicicletta + spiaggia + Baghdad + generic cityscape...
```

Perciò le immagini diventano ripetitive **non perché mantengono troppo la continuità**, ma perché Qwen conserva gli elementi meno informativi e butta via quelli che differenziano davvero ciascun sogno.

La direttiva centrale secondo me deve diventare:

> **Preserve the person's complete visual description and preserve the distinctive visual material of the current episode. Transform those elements instead of replacing them with unrelated places, objects or actions.**

Italiano:

> **Mantieni la descrizione visiva completa della persona e conserva il materiale visivo distintivo dell'episodio corrente. Trasforma questi elementi invece di sostituirli con luoghi, oggetti o azioni non collegati.**

E questa è probabilmente la regola più importante di tutto il prossimo intervento: **non chiediamo a Qwen più fantasia; gli chiediamo di usare meglio la materia che ha già davanti.**
