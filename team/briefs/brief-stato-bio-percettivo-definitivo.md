# Stato bio-percettivo — Brief definitivo del Capo Supremo

**Versione finale, in esecuzione.** Recepisce la revisione del Capo Supremo del Visual
Design (4 correzioni + 1 criterio di prova), quella del Capo Supremo dell'Analisi
Audio (3 definizioni normative + 2 precisazioni), e le sette integrazioni finali
recepite dalla verifica fattuale del Capo Supremo degli Ingegneri (§A–§G in coda).
Tutti e tre i domini hanno firmato. **Il brief è chiuso.**

Destinatario operativo: **Capo Supremo degli Ingegneri**.

Consolida e chiude le ambiguità fra i tre brief esistenti:

1. [`docs/stato-bio-percettivo-brief.md`](../../docs/stato-bio-percettivo-brief.md) — brief Audio esplorativo (6 dimensioni, **superato**);
2. [`brief-stato-bio-percettivo-respiro-gpu.md`](brief-stato-bio-percettivo-respiro-gpu.md) — brief Visual (eleggibilità, respiro, sovraccarico GPU);
3. [`brief-audio-persistence-pressure-respiro.md`](brief-audio-persistence-pressure-respiro.md) — brief Audio operativo (5 segnali, **fa fede**).

Tiene conto di [`docs/brain-renderer-plugin-system.md`](../../docs/brain-renderer-plugin-system.md),
[`docs/classificazione-renderer-brain.md`](../../docs/classificazione-renderer-brain.md),
[`docs/pipeline-audio.md`](../../docs/pipeline-audio.md) e
[`docs/varco-percettivo.md`](../../docs/varco-percettivo.md).

Questo documento decide. Non aggiunge un quarto modello.

---

## 1. Vocabolario: il modello a 5 segnali supera quello a 6 dimensioni

Il brief Audio esplorativo proponeva sei dimensioni (`mobilization`, `tension`,
`pulsation`, `corporeality`, `instability`, `recovery`) su tre scale temporali. Il
brief Audio operativo propone cinque segnali: `persistence`, `change`, `residual`,
`perceptualPressure`, `pressureTrend`.

**Non sono due modelli paralleli: il secondo supera il primo.** Il modello a sei
dimensioni resta valido come cornice fenomenologica, ma **non è il vocabolario da
implementare**. L'unico insieme di segnali da rendere disponibile è quello dei cinque.

**Conseguenza terminologica (richiesta Audio).** La parola `recovery` esce dal
vocabolario runtime: appartiene al modello superato e riusarla come nome di regime
riapre l'ambiguità appena chiusa. Nel contratto tecnico si usa **regime di bassa
pressione percettiva**; nel linguaggio Visual, **regime di respiro**. `recovery` resta
ammesso solo in prosa fenomenologica.

**Confine della rimozione di `recovery` (integrazione A, decisa dal Capo Supremo).** La
parola esce dal **contratto runtime** — nomi di variabili, enum, campi, chiavi di
configurazione, etichette di log e di osservabilità — dove non deve comparire in
nessuna forma. Resta **ammessa nella prosa** dei documenti come descrizione
fenomenologica, a una condizione: non può essere usata come **nome di un regime**.

Non è quindi richiesta la riscrittura integrale del brief Visual: vanno corretti i
punti in cui `recovery` nomina il regime, non quelli in cui descrive un fenomeno.
*(Motivo: la formulazione precedente — "rimuovere ovunque compaia" — implicava la
revisione di un documento intero; sproporzionato rispetto al problema reale.)*

---

## 2. Chi deriva il regime: il Visual, non l'Audio

Questa è la definizione normativa che mancava e senza la quale l'Ingegneria potrebbe
legittimamente implementare la cosa sbagliata.

Tutto il presente documento condiziona comportamenti a un "regime", e il §12 chiede di
mostrarlo in fase di collaudo. **Il regime non è un sesto segnale Audio.**

- L'**Analisi Audio** espone esclusivamente i cinque segnali. Non produce
  `breath = true`, `recovery = true`, né alcun booleano o enum di stato musicale.
  Produrlo significherebbe reintrodurre la macchina a stati che il §13 del brief Audio
  vieta esplicitamente.
- Il **regime è un'interpretazione derivata a valle**, di competenza della regia
  Visual, costruita a partire dai cinque segnali insieme allo stato Visual corrente,
  alla storia, al renderer e all'immagine.
- L'Ingegneria implementa il luogo dove questa derivazione avviene; **non ne decide il
  contenuto semantico**, che appartiene alla Direzione Visual.

*(Vedi §14 punto 4: la regola di derivazione concreta non è ancora stata scritta — è
una dipendenza da consegnare prima della prova.)*

---

## 3. Invarianti semantici dei cinque segnali (contratto Audio)

Non sono algoritmi: sono **test di verità** del modello. Servono perché diverse
implementazioni formalmente plausibili sarebbero percettivamente sbagliate, e
l'Ingegneria non può saperlo da sola.

- **`persistence` e `change` non sono complementari.** `change = 1 - persistence` è
  una implementazione vietata. Un transient forte può aumentare molto la variazione
  locale lasciando `persistence` sostanzialmente alta.
- **`perceptualPressure` non coincide con l'energia.** Sono possibili energia alta con
  pressione ridotta ed energia moderata con pressione molto elevata. Una diminuzione
  energetica può avvenire con pressione ancora alta.
- **`pressureTrend` è una tendenza percettivamente consolidata**, non la derivata
  istantanea del valore precedente.
- **`residual` dipende dalla storia precedente**: non può esistere residuo
  significativo se prima non esisteva uno stato sufficientemente presente. Non è un
  decadimento generico del volume.
- **`change` non deve scattare a ogni transient.** Descrive la perdita progressiva di
  adeguatezza dello stato precedente, non un evento.

*(Vedi §14 punto 2: la fattibilità di questi invarianti con i soli dati disponibili
lato Output va verificata prima di implementare — integrazione F.)*

---

## 4. Eleggibilità dei renderer

Pool del brief Visual §11, **modificato dal Capo Supremo** (§5).

**Compatibili con il regime di respiro:** Vector-Morph, Material-Morph, Bauhaus-Morph,
Dream-Segmentation (componente neuronale sospesa, §8), **Filter-Psiche parametrizzato**
(§5).

**Non compatibili:** Psycho2D, Fractal Spiral Degeneration, Print2D.

**Condizionale:** Glitch-Morph — utilizzabile in condizioni intermedie, mai come
renderer naturale della quiete.

Nota tecnica: `AUTOMATICALLY_EXCLUDED_RENDERERS` in `brainRendererSelector.ts` esiste
già ed è oggi vuoto — punto di innesto naturale per un'esclusione per regime, senza
inventare meccanismi nuovi. La forma concreta resta materia dell'Ingegneria.

### 4.1 Divieto di mapping: cosa vieta esattamente (richiesta Visual)

> **Non è ammesso un mapping diretto da un singolo segnale percettivo a una decisione
> estetica. È invece ammesso che il regime percettivo complessivo definisca vincoli di
> eleggibilità e compatibilità artistica stabiliti dalla Direzione Visual.**

`pressureTrend falling → Bauhaus` è vietato.
`regime riflessivo → Psycho2D non è artisticamente compatibile` è ciò che abbiamo
deciso.

### 4.2 Il regime basso non è un blocco unico (richiesta Visual)

> Il regime basso definisce l'**eleggibilità**. I cinque segnali continuano però a
> descriverne la **dinamica interna**: entrare nel respiro, permanere nel respiro e
> vivere un residuo non sono la stessa condizione Visual.

Tre casi distinti che condividono il pool ma non necessariamente il metabolismo:

- `pressureTrend falling` — la musica **sta entrando** nel respiro;
- `perceptualPressure` bassa + `pressureTrend stable` — la musica **è già** in uno
  stato basso stabile;
- `residual` alto — rarefazione con il passato ancora fortemente presente.

Questo protegge il sistema dal degenerare in una macchina binaria HIGH/LOW, che sarebbe
esattamente la semplificazione che stiamo superando.

---

## 5. Decisione del Capo Supremo: Filter-Psiche rientra, parametrizzato

**Ribalta il §8 del brief Visual**, che escludeva Filter-Psiche dai regimi bassi per la
sua grammatica — hue rotation, `difference`, flash, inversioni, alterazioni RGB. È
scritto apertamente come ribaltamento. La motivazione originale della Direzione Visual
resta valida per Filter-Psiche **non parametrizzato**.

Filter-Psiche è consentito nel regime di respiro se parametrizzato verso **colori
scuri, psichedelia dark, light non invasiva**. Non entra com'è: entra addolcito.

### 5.1 Criterio percettivo di accettazione (Direzione Visual)

> In regime basso Filter-Psiche può rimanere psichedelico, ma non deve produrre
> stroboscopia, picchi bianchi dominanti, inversioni aggressive o instabilità cromatica
> tanto rapida da diventare il principale oggetto attentivo della scena.

**Dark non significa abbassare la luminosità: significa ridurre la competizione
visiva.** È questo il criterio con cui il risultato verrà giudicato.

### 5.2 Leve disponibili nella grammatica attuale

1. **quali delle cinque varianti** (inverted-pulse, acid-duotone, solarized-echo,
   chromatic-negative, thermal-dream) restano disponibili in regime basso;
2. **l'ampiezza dell'hue-rotate** guidato da `cos(beatPhase·2π)`, oggi l'unica
   rotazione cromatica continua del sistema;
3. **la soglia oltre cui il blend mode passa a `difference`**, momento in cui il
   renderer diventa aggressivo.

### 5.3 Autorizzazione già concessa

Se la parametrizzazione dark richiede un **ramo nuovo**, si fa. Il sospetto è che i
colori scuri lo richiedano, perché Filter-Psiche lavora sui canali RGB e non ha un
concetto di palette da comprimere.

Condizioni: al valore di default il comportamento resta **invariato** — il ramo si
attiva solo in regime basso — e la verifica va comunque svolta e dichiarata prima di
implementare, perché serve sapere **quanto costa**, non se è permesso.

**Rimando esplicito al §9.1 (integrazione B).** L'autorizzazione al ramo nuovo è **già
concessa** e non è oggetto della verifica del punto 2 dell'ordine dei lavori. Quella
verifica serve a stabilire **quanto costa e cosa comporta**, non se è permesso. Chi
legge il §9.1 isolatamente non deve concludere che la decisione sia ancora aperta.

---

## 6. Il fatto strutturale che nessuno dei tre brief aveva rilevato

Incrociando l'eleggibilità Visual con `HEAVY_RENDERERS_UNDER_PRESSURE`
(`bauhaus-morph`, `material-morph`, `dream-segmentation`,
`fractal-spiral-degeneration`):

**tre dei quattro renderer originariamente eleggibili per il respiro sono esattamente
quelli esclusi sotto pressione GPU reale.** Prima della decisione del §5,
l'intersezione fra "eleggibile per il respiro" e "non escluso sotto pressione"
conteneva **un solo renderer: Vector-Morph**.

Il rientro di Filter-Psiche — indicato dalla classificazione come *preferito* sotto
pressione, senza stalli osservati nei log — ripristina varietà percettiva proprio dove
il vincolo computazionale la toglieva: il pool diventa Vector-Morph più Filter-Psiche
dark, con Glitch-Morph come riserva condizionale.

**Risolve anche un secondo buco**, presente oggi indipendentemente dalla pressione GPU:
la rete di sicurezza dell'host per il fallimento del controllo qualità di un renderer
(`hasFailed()` → passthrough) è `filter-psiche`, o `print2d` durante la Riattivazione.
Con il vecchio pool quella via faceva entrare un renderer vietato durante il respiro.
Ora resta valida **a condizione che il passthrough usi la parametrizzazione del regime
corrente**, non i valori di default.

### 6.1 Print2D / Riattivazione — verifica obbligatoria, non assunzione

Il Visual non accetta che questo punto resti chiuso per deduzione, e ha ragione.

Va **verificato realmente** che una Riattivazione tecnica non possa scattare mentre la
musica è ancora in condizione riflessiva. Se accadesse, avremmo Print2D in scena in
regime basso: una contraddizione diretta. Il modo di risolverla, se il caso si presenta,
è competenza dell'Ingegneria — ma la verifica va fatta, non dedotta.

---

## 7. Chi vince fra regime di respiro e Varco Percettivo: il regime

Corregge una posizione errata sostenuta in discussione preliminare («durante il Varco
il respiro si sospende»). **È il contrario.** Il brief Visual lo stabilisce in tre
punti: §16, §18, §22 — la pressione GPU non deve determinare autonomamente l'estetica.

Senza questa priorità avremmo il paradosso: Brain capisce finalmente che la musica sta
respirando, la GPU soffre, e Brain risponde sparando Psycho2D e flash. Il sistema
percettivo funzionerebbe fino all'istante esatto in cui diventa tecnicamente rilevante.

- In **regime pressurizzato**: il Varco nella forma attuale — MIX
  Filter-Psiche/Psycho2D, glitch, flash — resta valido. Il disturbo non contraddice lo
  stato, lo abita.
- In **regime di respiro**: **Psycho2D è fuori dal Varco.** Deciso dal Capo Supremo.
  L'apertura del §5 riguarda Filter-Psiche e solo Filter-Psiche. Psycho2D è
  stroboscopico per costruzione e non è addolcibile per parametri. Il Varco usa
  Filter-Psiche parametrizzato **da solo**, senza il secondo strato
  `denoisingPsycho2d` in `lighten`, coerentemente con il §22 del brief Visual.
- **L'overlay flash/glitch resta, ridotto.** Flash fortemente ridotto o assente (brief
  Visual §21), glitch **secco, breve e minimo** (§20). Non si toglie tutto: senza alcun
  segno il blocco tecnico torna leggibile come blocco, che è il problema per cui il
  Varco esiste.

Nota tecnica che rende tutto implementabile senza smontare nulla: la documentazione del
Varco chiarisce che il **MIX di passthrough** e l'**overlay CSS flash/glitch** sono
meccanismi distinti — l'overlay copre il fronte di salita indipendentemente dal
renderer di passthrough. Sono rendibili condizionali al regime **separatamente**. I due
layer di passthrough sono già separati nell'host (`denoisingFilterPsiche` principale,
`denoisingPsycho2d` sopra a opacità ridotta): sopprimere il secondo in regime basso è
una condizione, non uno smontaggio.

---

## 8. Dream-Segmentation: il vocabolario neuronale dipende dal regime

Il brief Visual §9 chiedeva di rimuovere neuroni, filamenti e scariche elettriche.

**Decisione del Capo Supremo: non è una rimozione, è una condizione di regime.** Il
vocabolario neuronale ed elettrico è **sospeso durante il respiro** e **torna quando si
esce dal regime basso**. Il codice non si cancella e non si riscrive: si rende
condizionale.

- **Sempre identitario, in ogni regime:** membrane, regioni, condensazione, ghost,
  trasformazione lenta.
- **Dipendente dal regime:** scariche, neuroni, filamenti.

Questo preserva l'identità del renderer invece di impoverirlo in tutti i contesti
perché una sua componente è inadatta al respiro.

---

## 9. Vincolo sui renderer: non si modificano, si parametrizzano — con due eccezioni

**In questa fase nessun renderer viene modificato nella propria grammatica o logica
interna.** L'unica leva consentita è la parametrizzazione di comportamento e colori.

Criterio operativo, adottato dall'analisi dell'Ingegneria
(`brain-renderer-plugin-system.md` §5c):

> Una costante resa modulabile deve lasciare **invariati tutti gli output** al valore
> di default: il vecchio comportamento resta un caso particolare raggiungibile. Se al
> valore di default il comportamento osservabile cambia, è comportamento nuovo —
> indipendentemente da quante righe tocca il diff.

### 9.1 Le due sole eccezioni autorizzate (richiesta Visual)

Il §9 e il §8 confliggerebbero letti alla lettera. Si dichiara quindi esplicitamente:

1. **Filter-Psiche** — eventuale ramo dark dedicato (§5.3);
2. **Dream-Segmentation** — gating della componente neuronale in regime basso (§8).

**Nessun'altra eccezione è autorizzata.** Ogni ulteriore comportamento nuovo richiede
autorizzazione caso per caso del Capo Supremo. Nessuno legga il §9 come divieto di
implementare il §8.

**Per Filter-Psiche l'eccezione è già autorizzata in anticipo (integrazione C, §5.3):**
resta da misurarne il costo, non da concederne il permesso.

L'ampliamento dei parametri si fa **su un renderer alla volta e quando serve**, non in
blocco e non prima di sapere se i segnali producono qualcosa di percepibile.

Conseguenza sulla prova: l'accumulatore di sorpresa percettiva di Dream-Segmentation
**non si sostituisce**. Resta dov'è; i cinque segnali possono al massimo modularne
soglie e tempi.

---

## 10. Architettura

Si adotta l'analisi dell'Ingegneria (`brain-renderer-plugin-system.md` §5a).

- Lo stato percettivo si calcola **lato Output**, accanto a `rhythm` e **non dentro**
  `BrainRhythmState`: la ricostruzione ritmica è frame-locale e si azzera sui gap RAF
  oltre 1500ms, la memoria percettiva è multi-secondo e non deve ereditare quel reset.
- **`AppSettings` è escluso.** È l'oggetto che rappresenta ciò che l'utente imposta:
  uno stato derivato dal segnale non ci appartiene, viaggerebbe intero via IPC a ogni
  frame anche quando nessuno lo consuma, e verrebbe esposto a tutti i lettori attuali
  di `AppSettings` per motivi estranei.
- Se emergessero feature calcolabili **solo in Control**, andrebbero aggiunte a
  `VisualStatePayload` accanto a `bandEnergies`/`movingAverages` — mai a `AppSettings`.

### 10.1 Lifecycle: cosa è risolto e cosa è deciso (precisazione Audio)

La collocazione fuori da `BrainRhythmState` risolve il **gap RAF**. Non risolve
automaticamente la perdita di memoria se l'intera Output Window viene ricreata.

**Decisione, non effetto collaterale:** un restart o una ricreazione della Output
Window **azzera intenzionalmente lo stato bio-percettivo**, coerentemente con quanto
già stabilito per tutto lo stato narrativo di Brain (cursore delle frasi, memo,
`coscienzaCore`). Nessuna persistenza su disco è richiesta.

Requisito del Visual da rispettare entro questo limite: **cambio renderer, glitch
tecnico o gap di rendering non devono cancellare la memoria percettiva.** Solo la
ricreazione della finestra lo fa.

### 10.2 Forma del canale — decisione dell'Ingegneria

Fra un argomento opzionale in più su `update()` e un setter dedicato sul modello di
`setResourcePressure()`, decida l'Ingegneria e lo motivi. I cinque segnali variano a
**bassa frequenza** e non hanno bisogno di viaggiare a ogni RAF; il setter ha già un
precedente nel contratto, l'argomento ha già un precedente in `rhythm`.

Vincolo di forma in entrambi i casi: **un unico oggetto opzionale comune a tutti i
plugin**, non parametri diversi per renderer. Il contratto resta uguale per tutti.

---

## 11. La prova: un solo renderer, due validazioni distinte

Prima di qualunque estensione si verifica che i segnali servano davvero.

**Renderer:** Dream-Segmentation, componente neuronale sospesa.
**Intervento consentito:** modulazione dei tempi e soglie già esistenti (dwell minimo
8s, transizione minima 3,2s, dissolvenza ghost 32s) tramite i cinque segnali, senza
toccare l'accumulatore né la grammatica.

### 11.1 Validazione Visual — il consumer

Non basta vedere che un parametro si muove. La prova è positiva se:

1. **si sente visivamente la differenza fra pressione e respiro senza cambiare
   renderer;**
2. Dream-Segmentation **conserva la propria identità** in entrambe le condizioni;
3. la fase bassa **non sembra né un rallentamento artificiale né una modalità
   low-power**.

Criterio sintetico della Direzione Visual:

> Dobbiamo vedere che **lo stesso renderer cambia metabolismo** in modo chiaramente
> percepibile, **senza cambiare identità**.

### 11.2 Validazione Audio — i segnali (richiesta Audio)

La 11.1 dimostra che la modulazione modifica Dream-Segmentation. **Non dimostra che i
cinque segnali rappresentino correttamente la musica.** Sono due validazioni diverse e
vanno fatte **nella stessa sessione**, usando l'osservabilità del §12:

- in condizione stabile e pressurizzata, i segnali stanno raccontando quello?
- in apertura senza cambio di stato, `persistence` resta significativa e
  `pressureTrend` è realmente discendente?
- in trasformazione strutturale, `change` reagisce **senza scattare a ogni transient**?
- in rarefazione dopo uno stato forte, `residual` conserva realmente memoria?

Se la 11.1 fallisce, il consumer è sbagliato o i segnali non servono. Se fallisce la
11.2, il modello Audio va corretto prima di qualunque estensione.

---

## 12. Osservabilità: si progetta prima, non dopo

Vincolo non negoziabile. La ragione è un fatto appena accaduto: per un tempo imprecisato
la pipeline narrativa ha mostrato a schermo il **seme** invece della storia, perché il
parser scartava per formato output validi per contenuto e il fallback produceva testo
plausibile. Nessuno se ne è accorto guardando, e il log attribuiva la causa alla parte
sbagliata.

Il livello bio-percettivo ha lo **stesso profilo di rischio, amplificato**: cinque
segnali interni, nessuna manifestazione diretta, verifica possibile solo all'ascolto.
Senza strumenti, sembrerà funzionare comunque.

Requisiti minimi, da avere **insieme** al livello e non dopo:

- i cinque valori leggibili in tempo reale durante una sessione, con il **regime
  derivato** e la sua provenienza;
- ogni esclusione di renderer per regime tracciata **con il motivo**;
- ogni ingresso del Varco Percettivo dichiari **quale forma ha usato e sotto quale
  regime**;
- quando Filter-Psiche è in scena, sia leggibile **quale parametrizzazione è attiva**
  (default o dark);
- quando Dream-Segmentation è in scena, sia leggibile se la **componente neuronale** è
  attiva o sospesa;
- **regime e renderer attivo registrati sulla stessa timeline temporale** (richiesta
  Visual), così da poter rileggere una performance e chiedersi: *qui la musica ha
  iniziato a respirare — cosa stava mostrando Brain?*

L'overlay eventuale è strumento di collaudo, non di spettacolo, e non deve restare
attivo in produzione live (regola in `agents.md`).

---

## 13. Cosa non viene richiesto

Confermato integralmente il §17 del brief Audio operativo. In aggiunta:

- **nessun renderer nuovo.** La proposta di un decimo renderer dedicato al respiro è
  respinta: Dream-Segmentation copre già la grammatica richiesta, e un renderer nato
  per un segnale non ancora validato sarebbe la lezione delle figure Bauhaus pagata più
  cara;
- **nessun segnale di regime prodotto dall'Audio** (§2);
- nessuna modifica ai meccanismi di scarto, alla beat detection, alle bande, allo
  smoothing, ad `active`, al flash engine, al trasporto IPC;
- nessun mapping diretto segnale → renderer, palette, velocità o morph (§4.1);
- nessuna persistenza su disco dello stato bio-percettivo (§10.1).

---

## 14. Ordine dei lavori

1. **Correzioni documentali.**
   - **Brief Visual §8** — rientro di Filter-Psiche, come ribaltamento dichiarato con
     rimando a questo §5.
   - **Brief Visual §27 — ancora da correggere.** La verifica dell'Ingegneria ha
     accertato che elenca tuttora tutte e undici le voci, con una nota esplicativa
     aggiunta sotto. **Annotare non è correggere**: una nota verrà letta come «sono
     tutte disponibili, alcune deprecate». Il §27 va **riscritto** lasciando i soli
     cinque segnali.
   - **`recovery`** — rimuovere dal contratto runtime; nella prosa del brief Visual
     correggere solo i punti in cui nomina un regime (vedi §1).
   - **`campionamento-brainphrases.md`** — **verificato, già pulito.** Nessun
     intervento richiesto.
2. **Verifica preliminare Filter-Psiche** (§5.3): la parametrizzazione dark è
   esposizione di costanti o ramo nuovo? Dichiararlo **prima** di implementare.
   L'autorizzazione c'è già: serve la misura.
   **Verifica di fattibilità degli invarianti del §3** (integrazione F): esiste
   un'implementazione dei cinque segnali che li rispetti **tutti**, con i soli dati
   disponibili lato Output — bande, medie mobili, `BrainRhythmState`? Il §3 vieta
   quattro implementazioni plausibili senza confermare che ne esista una possibile: gli
   invarianti sono vincoli, non ricette. Se qualcuno dei cinque segnali non risulta
   calcolabile entro quei vincoli, va detto **adesso**: si corregge il modello Audio,
   non si implementa un segnale che mente. È mezz'ora di analisi contro la scoperta a
   metà implementazione.
3. **Verifica Print2D / Riattivazione** (§6.1): una Riattivazione tecnica può scattare
   in condizione musicale riflessiva? Verifica reale, non deduzione.
4. **Definizione della derivazione del regime — Direzione Visual** (integrazione E).
   Il §2 stabilisce che il regime è interpretazione Visual a valle dei cinque segnali,
   non un segnale Audio. Quella interpretazione **non è ancora stata scritta**: senza
   di essa l'Ingegneria non può implementare l'osservabilità del §12 né eseguire la
   prova del §11. La Direzione Visual deve fornire, prima del punto 6:
   - quali combinazioni dei cinque segnali definiscono **regime di respiro**, **regime
     pressurizzato** ed eventuali **condizioni intermedie**;
   - con quale **isteresi** — un regime che oscilla a ogni frame non è un regime;
   - quale comportamento al **primo avvio**, prima che esista storia sufficiente a
     derivare alcunché.

   Non serve una formula: serve un criterio abbastanza preciso da essere implementato
   senza inventarlo. Vale il §4.2: la derivazione stabilisce l'**eleggibilità**, non
   annulla le differenze fra `pressureTrend falling`, basso stabile e `residual` alto.
5. **Decisione sulla forma del canale** (§10.2), motivata.
6. **Prova su Dream-Segmentation** (§11), con l'osservabilità del §12 **già in piedi**,
   e con entrambe le validazioni 11.1 e 11.2 nella stessa sessione.
7. Solo dopo, e solo se la prova è positiva: piano di lavoro completo, e
   parametrizzazione di Filter-Psiche come secondo consumer.

**Nessun PIANO viene aperto prima del punto 6, e il punto 6 non può iniziare prima che
il punto 4 sia stato consegnato dalla Direzione Visual.**

---

## 15. Criterio di riuscita

Coincidente in entrambi i domini (brief Visual §30, brief Audio §19):

> Brain distingue ciò che accade **dentro** uno stato da ciò che **modifica** lo stato;
> e, dentro lo stesso stato, **pressione** da **respiro**. Un problema tecnico non lo
> costringe a tradire quella distinzione.

La verifica è l'ascolto dal vivo di un set reale, con GPU realmente sotto pressione in
almeno un passaggio di respiro. **Nessun test verde chiude questo brief.**

---

## 16. Esiti delle verifiche §14 punti 2 e 3 (Ingegneria)

### 16.1 Filter-Psiche: esposizione o ramo nuovo? (§5.3)

Letto `brainFilterPsicheCanvas.ts` per intero. Tre leve sono **esposizione di
costanti**, invariata a default:

1. **variante disponibile** — `selectFilterPsicheVariant` già filtra su una lista;
   restringerla in regime basso non cambia nulla se la lista resta completa altrove;
2. **ampiezza dell'hue-rotate** — `hueDegrees` è già un prodotto di coefficienti
   (34/42/20 in `calculateFilterPsicheColorDynamics`); scalarli con un moltiplicatore
   di regime, di default 1, non cambia l'output di default;
3. **soglia `difference`** — la soglia è già scritta in chiaro
   (`motion.flash > 0.18 || motion.beat > 0.52`); alzarla in regime basso è lo stesso
   pattern.

**"Colori scuri" è invece confermato comportamento nuovo**, come sospettato dal brief.
Due fatti tecnici lo dimostrano:

- `variantPixel` calcola il colore mescolando i canali RGB del pixel sorgente con i
  colori della `palette` della storia — non esiste un concetto di palette compressa/
  scura da cui attingere, la luminosità dipende dall'immagine sorgente più le costanti
  di missaggio del variant scelto;
- `calculateFilterPsicheColorDynamics` produce **solo moltiplicatori ≥ 1** per
  `contrast`, `saturation`, `brightness` (rispettivamente `1.06+`, `1.15+`, `1+`): la
  grammatica attuale sa solo intensificare, non esiste un ramo che scenda sotto 1.

**Dichiarazione richiesta dal §5.3: è un ramo nuovo.** Serve una palette scura derivata
(es. compressione di lightness/saturazione della palette esistente, coerente col
principio del brief Visual §13 — "non cambiare colore, ridurre la competizione") più
un percorso alternativo per `calculateFilterPsicheColorDynamics` attivo solo in regime
basso. L'autorizzazione è già concessa (§5.3); questa è la misura richiesta, non
un'implementazione — resta rinviata al momento in cui Filter-Psiche diventa il secondo
consumer (§14 punto 7).

### 16.2 Fattibilità degli invarianti del §3 (integrazione F)

Verificati i dati disponibili lato Output (`BandEnergies` correnti, `movingAverages`,
`BrainRhythmState`) contro i cinque invarianti. Nessun blocco: sono tutti calcolabili
con tecniche note (inviluppi a doppia costante di tempo), **a condizione che
l'implementazione non ceda alla scorciatoia che il §3 vieta esplicitamente**:

- `persistence`/`change` non complementari → richiede **due EMA indipendenti** con
  costanti di tempo diverse (una lenta per lo stato di riferimento, una più reattiva
  per la variazione locale), non una singola formula `1 - persistence`;
- `perceptualPressure` ≠ energia → richiede una combinazione di più feature (densità
  di transient, dispersione spettrale fra bande, non la sola somma di `bands`), che i
  dati disponibili permettono ma nessuna feature singola già esistente fornisce da
  sola;
- `pressureTrend` come tendenza consolidata → richiede uno smoothing/isteresi sulla
  derivata di `perceptualPressure`, non la differenza fra due campioni consecutivi;
- `residual` dipendente dalla storia → richiede uno stato con memoria esplicita
  (accumulatore che si carica solo quando un livello precedente è stato
  sufficientemente presente, poi decade), non un semplice decadimento del volume
  corrente — pattern coerente con l'accumulatore già esistente in Dream-Segmentation;
- `change` non scattato dal transient → richiede che la feature osservi una finestra
  multi-secondo, non il campione corrente; `BrainRhythmState.bandTransients` da solo
  non basta e non va usato come input diretto di `change`.

**Nessuno dei cinque segnali risulta incalcolabile.** Confermano quanto già deciso al
§10: la sede naturale è un nuovo stato Output multi-secondo accanto a `rhythm`, perché
tutti gli input necessari sono già disponibili lì oggi, senza bisogno di nulla da
Control.

### 16.3 Print2D / Riattivazione (§6.1) — conflitto confermato, non ipotetico

**La verifica ribalta l'assunzione ottimistica del §6.** Il trigger del Ciclo di
Revisione (`pickStoriesUntilNextRevisionCycle` in `dreamRevisionCycle.ts`, invocato da
`brainController.ts`) è un contatore **puramente casuale su numero di storie** (ogni
2-4 storie, a confine di storia) — **nessuna dipendenza da energia, pressione o
qualunque segnale musicale.** La Riattivazione non è "per definizione un'uscita dal
regime basso": può scattare in qualunque momento, indipendentemente da cosa sta
facendo la musica.

Conseguenza diretta: `getBoostHint() === true` in `brainRendererHost.ts:476` fa
scegliere `print2d` come rete di sicurezza anche se in quel preciso istante la musica è
in regime di respiro — la contraddizione diretta che il §6.1 chiedeva di escludere per
verifica, non per deduzione. **Non è un caso limite raro: con una finestra di 2-4
storie, la probabilità che una Riattivazione cada durante un passaggio di respiro in un
set reale non è trascurabile.**

**Questo punto non lo risolve l'Ingegneria da sola — richiede una decisione del Capo
Supremo** fra letture alternative, ad esempio: (a) durante la Riattivazione in regime
basso la rete di sicurezza usa Filter-Psiche parametrizzato invece di Print2D anche
nel ramo `boosted`; (b) la Riattivazione stessa viene rinviata se il regime corrente è
basso; (c) si accetta che Print2D compaia brevemente come eccezione dichiarata. Nessuna
di queste tre è già stata scelta nei brief esistenti.

### 16.4 Approfondimento richiesto dal Capo Supremo — Riattivazione, lag Print2D, transitorio

**(b) è scartata per decisione del Capo Supremo**: la Riattivazione non si rinvia mai
in regime basso, va semmai intensificata.

**1. Durata e velocità della Riattivazione, e separabilità integrità/velocità.**

Dati misurati dal codice (`dreamRevisionCycle.ts`, `brainRendererSelector.ts`,
`brainRenderingConfig.ts` default `frameDurationMs: 14_000`):

- immagini per Riattivazione: 5–9 (`pickRevisionImageCount`);
- 3 giri (`REVISION_CYCLE_LAPS`), durata per fotogramma 9800ms (giro 1, fattore 0.7),
  7000ms (giri 2–3, fattore 0.5);
- **durata totale: da ~2 minuti (5 immagini) a ~3'34" (9 immagini)**
  (`immagini × (9800 + 7000 + 7000)` ms);
- **cambi di renderer nello stesso intervallo: circa 10–18** — hold ridotto a 1–2
  fotogrammi (`MINIMUM/MAXIMUM_BOOSTED_HOLD_FRAMES`) contro 2–3 fuori Riattivazione, su
  15–27 fotogrammi totali (immagini × giri).

**Integrità e velocità sono tecnicamente separabili — sono due `if (boosted)`
indipendenti**, non la stessa leva:

1. `storyCycleIds()` disattiva il filtro pressione quando `boosted` → questa è
   l'**integrità** (copertura completa dei renderer, nessuna esclusione per
   `HEAVY_RENDERERS_UNDER_PRESSURE`);
2. `selectBrainRendererHoldFrames(..., boosted)` restringe l'hold a 1–2 fotogrammi
   quando `boosted` → questa è la **velocità** (alternanza rapida, l'effetto
   bioenergetico "carica/scarica" voluto dal brief PIANO-034).

Nulla nel codice le lega: sono due controlli separati sullo stesso flag booleano
`getBoostHint()`, non un unico meccanismo. **Esiste quindi, in linea di principio, una
Riattivazione che resta integra (copertura completa, nessun renderer escluso) ma con
hold meno compresso in regime basso** — es. un terzo range di hold (2 fotogrammi fisso,
o 2–3 come il regime ordinario) selezionato quando `boosted && regimeBasso`, lasciando
1–2 per `boosted && !regimeBasso`. Coerente col §4.2: la risposta può non essere unica
fra "entrare nel respiro" e "residuo alto" — un hold intermedio è compatibile con
entrambi i casi senza introdurre una terza costante per ciascuno.

**2. Sensibilità al lag di Print2D — meccanismo trovato nel codice, non ancora
misurato in isolamento.**

Nessuna metrica esistente segmenta `brainPerformanceMetrics` per renderer o traccia
esplicitamente un "evento di desync": la segnalazione del Capo Supremo del 2026-08-25
(`working/STATE.md`, sessione reale) descrive un problema diverso e già risolto — Print
2D restava in scena troppo a lungo per un mazzo bloccato su un fallimento di Vector
Morph (fino a ~20s), non un artefatto della sua animazione interna. Non è quindi la
stessa causa, ma **conferma che la Riattivazione genera gap RAF reali**, non solo
teorici: "l'alternanza rapidissima della Riattivazione stessa (hold [1,2] fotogrammi)
genera gap RAF che il `thermalScheduler` legge come pressione reale" (stesso file).

Il meccanismo che risponde alla domanda del Capo Supremo — **"vivo→freeze→impulso→
decadimento che si desincronizza"** — esiste davvero, in `brainPrint2dCanvas.ts`:

- `advancePrintLifeState` è guidato dal tempo reale (`time - phaseStartedAt`), non dai
  fotogrammi, e avanza **un solo passo per chiamata**, qualunque sia l'ampiezza del
  gap;
- durata nominale dell'intera sequenza vivo→freeze(130ms)→impulso(170ms)→
  decadimento(620ms): **~920ms**;
- un gap RAF più lungo di una fase in corso non salta quella fase gradualmente: la
  chiude di colpo al fotogramma di ripresa (`phaseStartedAt` si resetta al momento
  della ripresa) e la fase successiva riparte da zero con la sua durata piena. Se il
  gap supera l'intera sequenza (~920ms, plausibile con gap RAF da secondi durante
  contesa GPU), **il "colpo interno alla stampa" — l'impulso, il picco visivo
  dell'evento — rischia di comprimersi in un singolo fotogramma renderizzato invece che
  nella coreografia prevista**: esattamente la desincronizzazione ipotizzata.
- la marcia dei layer (`marchStep`) è invece guidata dal beat (`rhythm.beatIndex`), non
  dal tempo reale: non soffre lo stesso meccanismo.

**Non è quindi impressione: è un meccanismo reale e concreto, ma non ancora misurato
in sessione dal vivo con dati isolati su Print2D.** Produrre quella misura costa poco
— basterebbe loggare (temporaneamente, in overlay di collaudo, coerente col §12) i
salti di `lifeState.phase` con delta-time anomalo — ma non è stato ancora fatto.

**3. Transitorio: Filter-Psiche non parametrizzato come rete di sicurezza in regime
basso.**

**È la stessa riga, non lavoro separato.** Oggi `brainRendererHost.ts:476` è già:

```ts
const safetyNetId: BrainRendererId = getBoostHint?.() === true ? 'print2d' : 'filter-psiche'
```

Il ramo `else` — Filter-Psiche **non parametrizzato** — è già il comportamento fuori
Riattivazione oggi, non va scritto da zero. Il transitorio richiesto è: quando
`getBoostHint()` è vero **e** il regime corrente è basso, scegliere comunque
`filter-psiche` invece di `print2d`. È letteralmente la stessa condizione che diventerà
la (a) quando il ramo dark esiste — cambia solo *quale* Filter-Psiche viene scelto in
quel punto (di default oggi, parametrizzato domani), non la struttura della decisione.
**Costo del transitorio: una condizione in più su una riga già esistente, più il
segnale di regime del punto 4 — nessun lavoro che verrà buttato.**

**In sintesi per il Capo Supremo:** il transitorio proposto al punto 3 è corretto ed è
a costo marginale. Non risolve però da solo il punto 1 (Print2D non è l'unico
sintomo — l'intera Riattivazione è la fase più veloce del sistema, e la sua velocità è
voluta) né il punto 2 (il meccanismo di desync è reale ma non misurato). Entrambi
restano aperti come richiesto, in attesa di una decisione su hold differenziato per
regime e, se il Capo Supremo lo ritiene utile, di una misura dal vivo del desync prima
di scegliere quanto è urgente risolverlo.

---

## 17. Derivazione del regime — consegna della Direzione Visual (§14 punto 4)

**Consegnato.** Cinque condizioni, non un binario HIGH/LOW — sono interpretazioni
Visual dei cinque segnali Audio, non nuovi segnali:

| Regime | Condizione sui 5 segnali |
|---|---|
| **PRESSURIZZATO** | `perceptualPressure` chiaramente alta, oppure `pressureTrend` stabilmente rising con pressione non bassa. `persistence` può essere alta indipendentemente: uno stato può restare lo stesso a lungo e continuare a essere pressurizzato. |
| **DECOMPRESSIONE** | `pressureTrend` stabilmente falling, pressione non più chiaramente alta, nessuna nuova crescita persistente. `persistence` può restare alta — è ancora lo stesso mondo, sta lasciando spazio. |
| **RESPIRO STABILE** | pressione bassa/medio-bassa, `pressureTrend` stable, `persistence` alta, `change` basso. |
| **RESIDUALE / SOSPENSIONE** | pressione bassa, `residual` alto, trend non rising, nuova configurazione non ancora dominante. |
| **INTERMEDIO / NON RISOLTO** | combinazioni conflittuali, `change` significativo, `persistence` insufficiente, pressione media senza direzione stabile, o storia insufficiente. |

`change` non determina da solo pressione/respiro: descrive la stabilità della
configurazione, ortogonale alle altre quattro condizioni. `residual` non implica da
solo regime basso: distingue vuoto da presenza del passato dentro il vuoto.

**Isteresi (vincolante, non un suggerimento):**
- ogni nuovo regime richiede **due valutazioni lente consecutive coerenti**; una
  lettura isolata contraddittoria non cambia nulla — vince il regime corrente;
- l'ingresso in RESPIRO STABILE **deve passare per DECOMPRESSIONE** (o per una fase
  non risolta) — mai `PRESSURIZZATO → RESPIRO STABILE` diretto per un singolo crollo;
- l'uscita `RESPIRO STABILE → PRESSURIZZATO` richiede crescita persistente confermata,
  non un kick o un transient — ma **quando confermata, è immediata**, senza dover
  attraversare a ritroso DECOMPRESSIONE;
- transient, Riattivazione e pressione GPU **non modificano mai il regime** — solo
  l'evoluzione dei 5 segnali Audio può farlo.

**Primo avvio:** stato `UNRESOLVED` esplicito finché non esistono almeno due letture
coerenti. Pool conservativo trasversale: Vector-Morph, Material-Morph, Bauhaus-Morph,
Dream-Segmentation, Filter-Psiche non aggressivo — mai Psycho2D o Fractal Spiral
Degeneration in avvio.

**Riattivazione per regime (§12 della nota Visual) — il regime vince sempre
sull'evento tecnico:**

| Regime | Comportamento della Riattivazione |
|---|---|
| PRESSURIZZATO | dichiarata pienamente; pool ampio disponibile, velocità e discontinuità parte del linguaggio |
| DECOMPRESSIONE | visibile ma contenuta — scompiglio percettivo leggibile, mai renderer vietati dal regime |
| RESPIRO STABILE | mimetizzata — deve apparire come riorganizzazione interna, non come "modalità nuova" |
| RESIDUALE/SOSPENSIONE | fortemente mimetizzata — priorità a continuità cromatica, ghost, tracce della materia |

Nessuna Riattivazione, in nessun regime basso, riabilita Psycho2D, Fractal Spiral
Degeneration o Print2D per il solo fatto di essere un evento tecnico. Se il pool si
riapre durante una Riattivazione, è perché la musica è realmente passata a
PRESSURIZZATO — non la Riattivazione ad autorizzarlo.

**Filtro GPU e regime restano distinti** (§14 della nota Visual): la sospensione
tecnica del filtro pressione durante `boosted` non sospende l'esclusione per regime
bio-percettivo — sono due filtri indipendenti, entrambi attivi.

**Riattivazione ≠ Varco** (§16 della nota Visual): la Riattivazione può attraversare
più Varchi, ma non deve diventare "un Varco di due minuti" — il suo carattere dipende
dal regime, non è un'estetica autonoma.

**Criterio di prova, innalzato** (§19 della nota Visual): durante il collaudo si deve
distinguere **senza overlay diagnostico** "sta entrando nel respiro" da "sta
respirando" da "è rimasta una memoria sospesa". Una derivazione che produce solo
"modalità lenta" indistinta è dichiarata **insufficiente** — sostituisce il criterio
più debole della validazione 11.1 originale.

### 17.1 Le tre riconciliazioni del braccio destro — risposta dell'Ingegneria

**Riconciliazione 1 — hold/transitorio/esclusione erano approvati su un binario,
vanno rimappati sui 5 regimi.** Confermato, e concretizzato:

| Regime | Hold Riattivazione | Rete di sicurezza | Esclusione renderer |
|---|---|---|---|
| PRESSURIZZATO | 1–2 (approvato, invariato) | `print2d` (approvato, invariato) | nessuna |
| DECOMPRESSIONE | **2 fisso** (leggibile ma contenuta — meno compresso dell'1–2 pieno) | `filter-psiche` (transitorio §16.4) | Psycho2D, Fractal Spiral, Print2D |
| RESPIRO STABILE | **2–3** (range ordinario — la Riattivazione rallenta fino a mimetizzarsi) | `filter-psiche` (transitorio §16.4) | idem + solo Filter-Psiche dark quando esiste |
| RESIDUALE/SOSPENSIONE | rimane definito ma **non implementato in questo giro** — vedi §17.2 | — | — |

`storyCycleIds()` mantiene per DECOMPRESSIONE/RESPIRO STABILE lo skip del filtro
pressione GPU (integrità/copertura, invariato da §16.3), ma l'hold non è più un
booleano `boosted` unico: diventa una funzione del regime derivato, non solo del flag
tecnico. Questo è esattamente il punto 5 (forma del canale) applicato a un consumer
concreto: il regime deve arrivare a `BrainRendererSelector` con la stessa via decisa
per gli altri consumer (§17.3).

**Riconciliazione 2 — INTERMEDIO eredita il regime precedente o adotta il pool
conservativo?** Per lo scope ridotto di questo primo giro (§17.2) la domanda non si
pone ancora nella sua forma piena: INTERMEDIO non viene implementato come stato
separato. Resta però una vera domanda di merito per quando verrà implementato, non
risolvibile in sede tecnica — segnalata alla Direzione Visual per quel momento: il §18
("in caso di dubbio vince il regime corrente") e il §6/§11 ("comportamento
conservativo", "pool ristretto all'avvio") si contraddicono solo nel caso specifico
`PRESSURIZZATO → INTERMEDIO`, dove "vince il regime corrente" manterrebbe Psycho2D e
Fractal Spiral disponibili in una condizione dichiaratamente non risolta.

**Riconciliazione 3 — criterio di prova alzato (§19).** Recepito come sostituzione
della validazione 11.1 originaria — vedi §17 sopra.

### 17.2 Decisione sullo scope della prova — accolto il consiglio del braccio destro

**Il punto 6 (prova su Dream-Segmentation) parte con tre regimi implementati:
PRESSURIZZATO, DECOMPRESSIONE, RESPIRO STABILE.** RESIDUALE/SOSPENSIONE e
INTERMEDIO/NON RISOLTO restano definiti in questo documento (§17) ma **non
implementati in questo giro** — stesso principio per cui la prova usa un solo renderer
e una domanda binaria (§11): se cinque regimi non si distinguono, non si saprebbe quale
dei cinque non funziona.

Conseguenza operativa per il primo avvio (`UNRESOLVED`, §17): nello scope ridotto,
finché non esistono due letture coerenti che classifichino uno dei tre regimi
implementati, il sistema resta nel pool conservativo dell'avvio — la stessa funzione
che INTERMEDIO svolgerebbe a regime, senza bisogno di uno stato nominato a parte. Non è
un'approssimazione nascosta: è la stessa condizione (storia insufficiente/segnali non
coerenti) con lo stesso comportamento Visual richiesto, semplicemente senza un'etichetta
propria finché INTERMEDIO non viene implementato per esteso.

### 17.3 Punto 5 — forma del canale, decisione dell'Ingegneria

**Setter dedicato, sul modello di `setResourcePressure()`.** Non un argomento in più su
`update()`. Motivazione: i 5 segnali e il regime derivato variano a bassa frequenza
(scala multi-secondo, per esplicita natura fenomenologica — brief Audio §4-8), mentre
`update()` è invocato a ogni RAF: un argomento opzionale in più lì costringerebbe ogni
plugin a ricevere e ignorare un valore quasi sempre identico al frame precedente, 60
volte al secondo. Un setter (`setPerception(state: BrainPerceptionState)`), chiamato
solo quando il valore lento effettivamente cambia — dopo le due letture di isteresi del
§17 — è la stessa forma già in uso per `setResourcePressure` e `setMorphPattern`:
stato che persiste finché non richiamato, non un parametro per-frame.

`BrainPerceptionState` (un solo oggetto, comune a tutti i plugin, come richiesto dal
vincolo di forma del §10): i cinque segnali grezzi più il regime derivato — i renderer
consumer (Dream-Segmentation, poi Filter-Psiche) leggono entrambi i livelli, perché la
modulazione di soglie/tempi (§11) può voler reagire a `residual` o `pressureTrend`
direttamente, non solo alla categoria discreta.
