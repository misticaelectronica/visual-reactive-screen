# Stato bio-percettivo — Brief definitivo del Capo Supremo

Destinatari: Capo Supremo degli Ingegneri, Capo Supremo del Visual Design, Capo
Supremo dell'Analisi Audio.

Consolida e chiude le ambiguità fra i tre brief esistenti:

1. [`docs/stato-bio-percettivo-brief.md`](../../docs/stato-bio-percettivo-brief.md) — brief Audio esplorativo (6 dimensioni);
2. [`brief-stato-bio-percettivo-respiro-gpu.md`](brief-stato-bio-percettivo-respiro-gpu.md) — brief Visual (eleggibilità, respiro, sovraccarico GPU);
3. [`brief-audio-persistence-pressure-respiro.md`](brief-audio-persistence-pressure-respiro.md) — brief Audio operativo (5 segnali).

Tiene conto di [`docs/sistema-plugin-renderer-brain.md`](../../docs/sistema-plugin-renderer-brain.md),
[`docs/classificazione-renderer-brain.md`](../../docs/classificazione-renderer-brain.md),
[`docs/pipeline-audio.md`](../../docs/pipeline-audio.md) e
[`docs/varco-percettivo.md`](../../docs/varco-percettivo.md).

Questo documento decide. Non aggiunge un quarto modello.

---

## 1. Vocabolario: il modello a 5 segnali supera quello a 6 dimensioni

Il brief Audio esplorativo proponeva sei dimensioni (`mobilization`, `tension`,
`pulsation`, `corporeality`, `instability`, `recovery`) su tre scale temporali. Il
brief Audio operativo propone cinque segnali (`persistence`, `change`, `residual`,
`perceptualPressure`, `pressureTrend`).

**Non sono due modelli paralleli: il secondo supera il primo.** Il modello a sei
dimensioni resta valido come descrizione fenomenologica e va conservato come tale, ma
**non è il vocabolario da implementare**. L'unico insieme di segnali da rendere
disponibile è quello dei cinque.

Conseguenza documentale: il §27 del brief Visual elenca ancora entrambi i vocabolari
fra le informazioni che l'Audio "potrà fornire". Va corretto lasciando solo i cinque,
altrimenti l'Ingegneria è autorizzata a progettare per undici segnali.

---

## 2. Eleggibilità dei renderer

Il pool del brief Visual §11 è confermato, **con una modifica decisa dal Capo
Supremo** (§3).

**Compatibili con il regime basso/riflessivo/recovery:**
Vector-Morph, Material-Morph, Bauhaus-Morph, Dream-Segmentation (senza componente
neuronale/elettrica), **Filter-Psiche parametrizzato** (§3).

**Non compatibili:** Psycho2D, Fractal Spiral Degeneration, Print2D.

**Condizionale:** Glitch-Morph — utilizzabile in condizioni intermedie, mai come
renderer naturale della quiete.

Nota tecnica: `AUTOMATICALLY_EXCLUDED_RENDERERS` in `brainRendererSelector.ts` esiste
già ed è oggi vuoto — è il punto di innesto naturale per un'esclusione per regime, e
non richiede inventare un meccanismo nuovo. La forma concreta resta materia
dell'Ingegneria.

---

## 3. Decisione del Capo Supremo: Filter-Psiche rientra, parametrizzato

**Questa decisione ribalta il §8 del brief Visual**, che escludeva Filter-Psiche dai
regimi realmente bassi per la sua grammatica — hue rotation, `difference`, flash,
inversioni, alterazioni RGB. È scritta apertamente come ribaltamento, non nascosta in
una riga.

Filter-Psiche **è consentito nel regime bio-percettivo basso**, a condizione di essere
parametrizzato verso:

- **colori scuri**;
- **psichedelia dark**;
- **light non invasiva**.

Non entra com'è: entra addolcito. Le leve che la sua grammatica attuale offre sono
almeno tre, e l'Ingegneria valuti quali bastano:

1. **quali delle cinque varianti** (inverted-pulse, acid-duotone, solarized-echo,
   chromatic-negative, thermal-dream) restano disponibili nel regime basso — alcune
   sono per costruzione più violente di altre;
2. **l'ampiezza dell'hue-rotate** guidato da `cos(beatPhase·2π)`, oggi l'unica
   rotazione cromatica continua di tutto il sistema;
3. **la soglia oltre cui il blend mode passa a `difference`**, che è il momento in cui
   il renderer diventa aggressivo: alzarla nel regime basso è la leva più diretta.

**Verifica preliminare richiesta prima di procedere.** Vale il criterio del §6: se il
comportamento scuro si ottiene spostando parametri e al valore di default tutto resta
identico, è esposizione ed è autorizzato. Se invece richiede un ramo nuovo — una
palette compressa che oggi non esiste, una modalità che si comporta diversamente — è
comportamento nuovo e serve autorizzazione esplicita del Capo Supremo. Il sospetto è
che i colori scuri ricadano nel secondo caso, perché Filter-Psiche oggi lavora sui
canali RGB dell'immagine e non ha un concetto di palette scura da comprimere.
**L'Ingegneria lo verifichi e lo dichiari prima di implementare, non dopo.**

---

## 4. Il fatto strutturale che nessuno dei tre brief aveva rilevato

Incrociando l'eleggibilità Visual con `HEAVY_RENDERERS_UNDER_PRESSURE`
(`bauhaus-morph`, `material-morph`, `dream-segmentation`,
`fractal-spiral-degeneration`):

**tre dei quattro renderer originariamente eleggibili per il respiro sono esattamente
quelli esclusi sotto pressione GPU reale.** Prima della decisione del §3,
l'intersezione fra "eleggibile per il respiro" e "non escluso sotto pressione"
conteneva **un solo renderer: Vector-Morph**.

Il rientro di Filter-Psiche — che la classificazione indica come *preferito* sotto
pressione, senza stalli osservati nei log — risolve strutturalmente il problema: il
pool sotto pressione in regime basso diventa Vector-Morph più Filter-Psiche
parametrizzato, con Glitch-Morph come riserva condizionale.

**Risolve anche un secondo buco**, oggi presente indipendentemente dalla pressione GPU:
la rete di sicurezza dell'host per il fallimento del controllo qualità di un renderer
(`hasFailed()` → passthrough) è `filter-psiche`, o `print2d` durante la Riattivazione.
Con il vecchio pool, quella via faceva entrare in scena un renderer vietato durante il
respiro. Con Filter-Psiche eleggibile il percorso resta valido, **a condizione che il
passthrough usi la parametrizzazione del regime corrente**, non i valori di default.

Print2D resta non eleggibile: la Riattivazione, però, è per definizione un'uscita dal
regime basso (brief Visual §25), quindi il conflitto non dovrebbe presentarsi. Da
confermare in fase di verifica.

---

## 5. Chi vince fra regime di respiro e Varco Percettivo: il regime

Questa decisione corregge una posizione errata sostenuta in discussione preliminare
(«durante il Varco il respiro si sospende»). **È il contrario**, e il brief Visual lo
stabilisce già in tre punti: §18, §22, §16 — la pressione GPU non deve determinare
autonomamente l'estetica.

Quindi:

- in **regime pressurizzato**, il Varco nella forma attuale — MIX
  Filter-Psiche/Psycho2D, glitch, flash — resta valido e coerente: il disturbo non
  contraddice lo stato, lo abita;
- in **regime di respiro**, il Varco non è abolito ma deve esistere in forma
  compatibile: zona di riorganizzazione (brief Visual §19), flash fortemente ridotto o
  assente (§21), glitch secco e non decorativo (§20).

**Punto da confermare al Capo Supremo prima dell'implementazione.** L'apertura del §3
riguarda Filter-Psiche, non Psycho2D. La lettura di questo brief è quindi che nel
respiro il Varco usi **Filter-Psiche parametrizzato senza il secondo strato Psycho2D**,
coerentemente con il §22 del brief Visual che dichiara il MIX incompatibile con la vera
fase di respiro. Se l'intenzione è diversa, va detto.

Nota tecnica che rende tutto ciò implementabile senza smontare nulla: la documentazione
del Varco chiarisce che il **MIX di passthrough** e l'**overlay CSS flash/glitch** sono
due meccanismi distinti — l'overlay copre il fronte di salita indipendentemente dal
renderer di passthrough scelto. Possono quindi essere resi condizionali al regime
**separatamente**.

---

## 6. Vincolo sui renderer: non si modificano, si parametrizzano

Decisione del Capo Supremo: **in questa fase nessun renderer viene modificato nella
propria grammatica o logica interna.** L'unica leva consentita è la parametrizzazione
di comportamento e colori.

Il criterio per distinguere le due cose è quello proposto dall'Ingegneria in
`sistema-plugin-renderer-brain.md` §5c, adottato come regola operativa:

> Una costante resa modulabile deve lasciare **invariati tutti gli output** al valore
> di default: il vecchio comportamento resta un caso particolare raggiungibile. Se al
> valore di default il comportamento osservabile cambia, è comportamento nuovo —
> indipendentemente da quante righe tocca il diff.

La prima categoria è autorizzata. La seconda richiede autorizzazione caso per caso — e
il caso più probabile è proprio Filter-Psiche (§3).

L'ampliamento dei parametri si fa **su un renderer alla volta e quando serve**, non in
blocco e non prima di sapere se i segnali producono qualcosa di percepibile.

Conseguenza sulla prova: l'accumulatore di sorpresa percettiva di Dream-Segmentation
**non si sostituisce**. Resta dov'è; i cinque segnali possono al massimo modularne
soglie e tempi.

---

## 7. Dream-Segmentation: vocabolario neuronale sospeso, non rimosso

Il brief Visual §9 chiede di rimuovere neuroni, filamenti e scariche elettriche.
Precisazione del Capo Supremo: **in questa fase è una sospensione, non una
cancellazione.** Il codice resta, la riattivazione è una decisione futura del Capo
Supremo e non un lavoro da rifare.

Il resto dell'identità — membrane, regioni, condensazione, ghost, trasformazione lenta
— è confermato ed è la ragione per cui Dream-Segmentation è il primo candidato della
prova (§9).

---

## 8. Architettura: la via decisa

Si adotta l'analisi dell'Ingegneria (`sistema-plugin-renderer-brain.md` §5a), con una
precisazione.

- Lo stato percettivo si calcola **lato Output**, accanto a `rhythm` e **non dentro**
  `BrainRhythmState`: la ricostruzione ritmica è frame-locale e si azzera sui gap RAF
  oltre 1500ms, la memoria percettiva è multi-secondo e non deve ereditare quel reset.
  Questa è la risposta alle criticità 2 e 3 del brief Audio esplorativo.
- **`AppSettings` è escluso.** È l'oggetto che rappresenta ciò che l'utente imposta:
  uno stato derivato dal segnale non ci appartiene, viaggerebbe intero via IPC a ogni
  frame anche quando nessuno lo consuma, e verrebbe esposto a tutti i lettori attuali
  di `AppSettings` per motivi estranei.
- Se emergesse la necessità di feature calcolabili **solo in Control**, andrebbero
  aggiunte a `VisualStatePayload` accanto a `bandEnergies`/`movingAverages` — mai a
  `AppSettings`.

**Domanda aperta, da decidere all'Ingegneria:** fra un argomento opzionale in più su
`update()` e un setter dedicato sul modello di `setResourcePressure()`, quale è
preferibile dato che i cinque segnali variano a **bassa frequenza** e non hanno bisogno
di viaggiare a ogni RAF. Il setter ha già un precedente nel contratto; l'argomento ha
già un precedente in `rhythm`. Decida l'Ingegneria e lo motivi.

Vincolo di forma in entrambi i casi: **un unico oggetto opzionale comune a tutti i
plugin**, non parametri diversi per renderer. Il contratto resta uguale per tutti.

---

## 9. La prova: un solo renderer, una domanda binaria

Prima di qualunque estensione, si verifica che i segnali servano davvero.

**Renderer:** Dream-Segmentation, con vocabolario neuronale sospeso.
**Intervento consentito:** modulazione dei tempi e soglie già esistenti (dwell minimo
8s, transizione minima 3,2s, dissolvenza ghost 32s) tramite i cinque segnali, senza
toccare l'accumulatore né la grammatica.
**Domanda:** muovere quei parametri con i segnali produce qualcosa di **percepibile**,
o è la stessa cosa scritta meglio?

Se non cambia niente di percepibile, i cinque segnali non hanno ancora dimostrato di
servire, e si risparmia un piano intero. Se cambia, esiste il primo consumer reale e da
lì si allarga — con Filter-Psiche parametrizzato (§3) come secondo passo naturale.

---

## 10. Osservabilità: si progetta prima, non dopo

Vincolo non negoziabile, e la ragione è un fatto appena accaduto: per un tempo
imprecisato la pipeline narrativa ha mostrato a schermo il **seme** invece della
storia, perché il parser scartava per formato output validi per contenuto e il fallback
produceva testo plausibile. Nessuno se ne è accorto guardando, e il log attribuiva la
causa alla parte sbagliata.

Il livello bio-percettivo ha lo **stesso profilo di rischio, amplificato**: cinque
segnali interni, nessuna manifestazione diretta, verifica possibile solo all'ascolto.
Senza strumenti, sembrerà funzionare comunque.

Requisiti minimi, da avere **insieme** al livello e non dopo:

- i cinque valori leggibili in tempo reale durante una sessione (log periodico o
  overlay diagnostico), con il regime corrente derivato;
- ogni esclusione di renderer per regime tracciata **con il motivo**;
- ogni ingresso del Varco Percettivo deve dichiarare quale forma ha usato e in quale
  regime si trovava;
- quando Filter-Psiche è in scena, deve essere leggibile **con quale
  parametrizzazione** — default o regime basso.

L'overlay eventuale è strumento di collaudo, non di spettacolo, e non deve restare
attivo in produzione live (regola in `agents.md`).

---

## 11. Cosa non viene richiesto

Confermato integralmente il §17 del brief Audio operativo. In aggiunta:

- **nessun renderer nuovo.** La proposta di un decimo renderer dedicato al respiro è
  respinta: Dream-Segmentation copre già la grammatica richiesta, e un renderer nato
  per un segnale non ancora validato sarebbe la stessa lezione delle figure Bauhaus,
  pagata più cara;
- nessuna modifica ai meccanismi di scarto, alla beat detection, alle bande, allo
  smoothing, ad `active`, al flash engine, al trasporto IPC;
- nessun mapping diretto segnale → renderer, palette, velocità o morph. Il Visual
  decide la manifestazione; l'Audio descrive la musica.

---

## 12. Ordine dei lavori

1. Correzione documentale del brief Visual: §27 (vocabolario unico) e §8 (rientro di
   Filter-Psiche).
2. Verifica preliminare del §3: la parametrizzazione dark di Filter-Psiche è
   esposizione di costanti o comportamento nuovo? Dichiararlo **prima** di
   implementare.
3. Risposta dell'Ingegneria sulla forma del canale (§8).
4. Prova su Dream-Segmentation (§9), con l'osservabilità del §10 già in piedi.
5. Solo dopo, e solo se la prova è positiva: piano di lavoro completo, e
   parametrizzazione di Filter-Psiche come secondo consumer.

Nessun PIANO viene aperto prima del punto 4.

---

## 13. Criterio di riuscita

Resta quello del brief Visual §30 e del brief Audio §19, che coincidono:

> Brain distingue ciò che accade **dentro** uno stato da ciò che **modifica** lo stato;
> e, dentro lo stesso stato, **pressione** da **respiro**. Un problema tecnico non lo
> costringe a tradire quella distinzione.

La verifica è l'ascolto dal vivo di un set reale, con GPU realmente sotto pressione in
almeno un passaggio di respiro. Nessun test verde chiude questo brief.
