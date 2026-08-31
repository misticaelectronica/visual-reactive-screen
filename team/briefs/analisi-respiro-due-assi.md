# Analisi — Due assi (RESPIRO ALTO / RESPIRO PROFONDO), non un `stable-breath`

Risposta del Capo Supremo degli Ingegneri al brief "analisi preliminare" del
braccio destro, 2026-08-28. **Solo analisi, nessun codice scritto.** Ogni
affermazione sotto è verificata leggendo il codice attuale, non presunta.

---

## 1. Modello percettivo — assestato/transitorio e livello, senza meccanismi nuovi

**La domanda "assestato o transitorio" è già risposta da un segnale esistente:
`pressureTrend`.**

Da quando `pressureTrend` confronta la pressione live con `reference.pressure`
(brief Audio 2026-08-28), il suo valore *è* la distinzione richiesta:

- `'rising'` / `'falling'` = la pressione sta divergendo attivamente dal
  riferimento — per costruzione un **passaggio**, non uno stato in cui si
  abita. Corrisponde esattamente a `pressurized`/`decompression` come sono
  già trattati oggi (`advanceBioRegime` li produce senza gate, reazione
  immediata).
- `'stable'` = la pressione coincide col riferimento entro la zona neutra —
  per costruzione un **assestamento**. Oggi questo valore viene scartato nel
  bucket `'unresolved'` da `classifyRawBioRegime`, che è l'origine del
  problema descritto: un loop ipnotico pompato e stabile produce
  `pressureTrend: 'stable'` (la pressione coincide col proprio riferimento,
  che nel frattempo si è già aggiornato su quel livello alto) — e finisce
  scartato in `unresolved` invece di essere riconosciuto come uno stato
  abitato a pieno titolo.

Nessun meccanismo nuovo: `'stable'` è già il segnale "questo è un
assestamento", prodotto dalla stessa macchina che già decide
`rising`/`falling`. Va solo **letto**, non scartato.

**La domanda "che livello, una volta assestato" ha anch'essa un segnale
esistente disponibile: `pressureMedian`.**

La mediana dinamica del set è stata esplicitamente retrocessa a "informazione
contestuale" per l'*apertura* del respiro (brief Audio 2026-08-28, §4: non
deve decidere se c'è una sottrazione significativa). Ma la domanda qui è
diversa — non "sta succedendo un'apertura ora", ma "una volta che il mondo si
è assestato, quel livello è alto o basso per la serata" — è esattamente la
domanda per cui la mediana resta dichiarata valida ("continua a essere
aggiornata e conserva valore informativo", stesso paragrafo). Riusarla per
questo, non per l'asse assestato/transitorio, non è la stessa
sovrastrutturazione già respinta: è la domanda per cui era stata pensata.

**Proposta di classificazione (nessuna struttura nuova, solo lettura diversa
degli stessi segnali):**

```
pressureTrend === 'rising'   → pressurized     (passaggio)
pressureTrend === 'falling'  → decompression   (passaggio)
pressureTrend === 'stable'   → assestato: confronta reference.pressure
                                 (o perceptualPressure, sono ≈ uguali quando
                                 stable) con pressureMedian
                                 → sopra  → RESPIRO ALTO
                                 → sotto  → RESPIRO PROFONDO (ex stable-breath)
```

`residual` non entra in questa classificazione — resta segnale continuo, come
richiesto ("cessa di essere un regime e resta il segnale continuo che già
abbiamo").

**Cosa NON serve aggiungere**: nessuna nuova finestra di conferma temporale.
La macchina di `advanceBioRegime` promuove già `decompression → stable-breath`
solo dopo 3s continui di `falling`/`stable`-da-silenzio; lo stesso schema
(rinominando le destinazioni) copre `pressurized → RESPIRO ALTO` con lo
stesso principio simmetrico, senza logica nuova — solo un ramo aggiuntivo
nella stessa macchina a stati esistente.

**Cosa resta aperto e va deciso, non dedotto dal codice**: la soglia di
uscita da un respiro (`REFERENCE_PRESSURE_DEADBAND`) usa oggi
`reference.pressure` come perno. Per `RESPIRO ALTO` serve lo stesso perno
(uscita quando la pressione scende sotto `reference.pressure` in modo
sostenuto) — simmetrico, non un valore nuovo da inventare.

---

## 2. Selettore — non servono due pool distinti

Verificato in `brainRendererSelector.ts`: oggi esiste **una sola** whitelist
(`LOW_REGIME_RENDERERS`, cinque renderer) applicata quando
`regime === 'decompression' || regime === 'stable-breath'`. Fuori da questi
due, `AUTOMATICALLY_EXCLUDED_RENDERERS` è vuoto — nessuna restrizione, tutto
il pool è eleggibile (questo è lo stato di `pressurized`/`unresolved` oggi).

**Risposta diretta**: avere due stati assestati non richiede due pool.
Richiede applicare la whitelist esistente ai due stati **bassi**
(`decompression`, `RESPIRO PROFONDO`) esattamente come oggi, e **nessuna
restrizione** ai due stati **alti** (`pressurized`, `RESPIRO ALTO`) — la
stessa condizione che già vale per `pressurized` oggi, semplicemente estesa
a un nuovo valore di regime. Zero pool nuovo, una condizione con due branch
anziché uno stato in più da un lato.

`RESPIRO ALTO` ("Brain va a mille") non ha bisogno di *escludere* nulla — i
renderer esclusi dal pool basso (`psycho2d`, `fractal-spiral-degeneration`,
`print2d`) sono proprio quelli con l'identità più intensa: lasciarli
eleggibili in `RESPIRO ALTO` è coerente con "andare a mille", non un
problema da risolvere.

**Cosa invece richiede lavoro nuovo, non riuso**: la tabella di
`selectBrainRendererHoldFrames` (hold-frame per regime: oggi
`pressurized:[1,2]`, `decompression:2`, `stable-breath:[2,3]`). "Tempi corti"
per `RESPIRO ALTO` significa un hold **più breve** del default di
`pressurized` — non lo stesso valore. Serve una nuova voce nella tabella,
non solo una ridenominazione. Questo è comportamento nuovo dichiarato, non
sovrastrutturazione: il brief lo chiede esplicitamente ("tempi corti").

**Stato oggi senza pool proprio**: `unresolved`. Con la riclassificazione
sopra, `'stable'` non finisce più lì — `unresolved` resta raggiungibile solo
all'avvio (prima che `reference` esista) e come fallback difensivo per un
consumer che riceve un regime che non riconosce (già documentato nel tipo).
Non serve dargli un pool proprio: è transitorio per natura, eredita il
comportamento di `pressurized` (nessuna restrizione) come già oggi.

---

## 3. Renderer per renderer — leve esposte vs comportamento nuovo

**Verificato per ciascuno dei cinque renderer del pool basso**, distinguendo
i due stati.

### Filter-Psiche — leva esposta, ma sul modo sbagliato (da chiarire)

Ha una formula dinamica reale (`calculateFilterPsicheColorDynamics`:
hue-rotate/saturate/brightness come funzione continua del motion) e un
`FILTER_PSICHE_REGIME_PROFILE` già collegato al regime. **Ma il meccanismo
attuale MODULA** (riduce `alternateAlpha`/`inverseAlpha`/`saturation`/
`hueSwing` della formula esistente), non sovrascrive. La disposizione
ribadita in questo brief ("il respiro sovrascrive i preset dinamici dei
colori, non li modula") è in tensione diretta con l'implementazione
presente. Sovrascrivere richiederebbe una funzione di colore *dedicata* al
respiro (una palette propria, non una versione attenuata della formula
esistente) selezionata al posto di `calculateFilterPsicheColorDynamics`
quando il regime è assestato — comportamento nuovo, non parametrizzazione
di quanto c'è. **Va deciso esplicitamente prima di scrivere codice**: la
`§9.1` del brief definitivo autorizza già un "ramo dark dedicato" per
Filter-Psiche — se "dedicato" significa "funzione propria che sostituisce",
questo chiude la tensione a favore di sovrascrivere. **Riusabile**: la
struttura a profilo-per-regime (`REGIME_PROFILE`/`filterPsicheRegimeProfile`)
resta valida come dispatch fra i due stati assestati; cambia solo cosa
restituisce.

### Dream-Segmentation — leva esposta, stessa tensione, ma riusabile per entrambi gli stati

`REGIME_PROFILE`/`calculateDreamRegimeProfile` esiste, collegato al regime e
già blendato in continuo su `residual`. Stessa tensione di Filter-Psiche:
`colorBrightness`/`darkeningAdd` **modulano** il colore esistente
(`computeDreamRegimeColor` moltiplica il colore sorgente), non lo
sostituiscono. `neuronalMultiplier` (sospensione vocabolario neuronale) è
invece già un vero switch, non una modulazione — coerente con "sovrascrive"
per quella sola leva. **Riusabile integralmente per `RESPIRO PROFONDO`**
(è l'attuale `stable-breath`, zero lavoro). **Per `RESPIRO ALTO` serve una
voce nuova nello stesso `REGIME_PROFILE`**: `timingMultiplier<1` (tempi
corti), `densityMultiplier>1` (densità alta), `colorBrightness>1` o un
meccanismo di "colori accesi" mai costruito finora (oggi solo `<1` esiste,
il ramo "sopra 1" è comportamento nuovo, come per Filter-Psiche il
`saturationMultiplier`), `motionMultiplier>1` (moto locale più serrato) e
`neuronalMultiplier` verosimilmente **1 o >1** (il vocabolario neuronale
torna pienamente, forse rinforzato — da confermare col Visual, non deducibile
dal brief).

### Vector-Morph, Material-Morph, Bauhaus-Morph — zero leve, e la natura del gap è diversa da Filter-Psiche/Dream-Segmentation

Verificato: **zero occorrenze di `BrainBioRegime` nei tre file.** Nessun
collegamento al regime esiste oggi, per nessuno dei due stati.

Più rilevante di "manca il collegamento": **questi tre renderer non hanno
una formula di colore dinamica da modulare o sovrascrivere.** Filter-Psiche
calcola colore da una funzione di `motion`; Dream-Segmentation lo deriva da
`computeDreamRegimeColor` sopra un colore analizzato. Vector-Morph e
Bauhaus-Morph pescano colore da una **palette fissa dell'immagine generata**
(`pluginContext.palette`, indicizzata); Material-Morph lo deriva
dall'analisi pixel del materiale (`region.averageColor`), con solo
`context.globalAlpha` e budget/frame-interval come leve esposte oggi
(entrambi già collegati a `resourcePressure`/`lowPowerMode`, non al regime).

Questo significa che per questi tre, "colori scuri"/"colori accesi" **non è
mai una parametrizzazione di qualcosa che esiste** — è, in entrambi i casi
(alto e basso), un filtro di post-elaborazione nuovo (nello stile del
`context.filter` CSS già usato da Filter-Psiche, o un remap della palette),
oppure un secondo livello di rendering. **Stesso costo di lavoro per
`RESPIRO ALTO` e `RESPIRO PROFONDO`** su questi tre — non c'è nulla di
`stable-breath` da riusare qui perché non è mai stato costruito.

Tempi (`timingMultiplier`-equivalente) e densità (`regionBudget`/
`planeBudget`) sono invece leve già presenti nella forma di soglie
`resourcePressure`/`lowPowerMode` — riagganciarle al regime è
parametrizzazione vera, non comportamento nuovo, per entrambi gli stati.

### Sintesi tabellare

| Renderer | Collegato al regime oggi | Leva colore esiste | RESPIRO PROFONDO | RESPIRO ALTO |
|---|---|---|---|---|
| Filter-Psiche | sì | sì (formula) | riusabile, ma tensione modula/sovrascrive da chiudere | nuovo (nessun ramo "acceso" costruito) |
| Dream-Segmentation | sì | sì (formula su colore analizzato) | riusabile al 100% (è `stable-breath`) | nuovo (nessun ramo "acceso"); `neuronalMultiplier` da definire |
| Vector-Morph | no | no (palette fissa) | nuovo, palette/filtro da costruire | nuovo, stesso costo |
| Bauhaus-Morph | no | no (palette fissa) | nuovo, palette/filtro da costruire | nuovo, stesso costo |
| Material-Morph | no | no (pixel analizzati) | nuovo, filtro da costruire | nuovo, stesso costo |

---

## 4. Riuso dell'esistente — sintesi

- **Modello percettivo**: nessuna struttura nuova. `pressureTrend`/`stable`
  già distingue assestato da transitorio; `pressureMedian` già risponde
  "alto o basso" per la serata. Va solo cablato un ramo in più in
  `classifyRawBioRegime`/`advanceBioRegime`, non un meccanismo nuovo.
- **Selettore**: nessun pool nuovo. La whitelist esistente si applica ai
  due stati bassi come oggi; nessuna restrizione ai due stati alti come già
  vale per `pressurized`. Nuova solo la voce hold-frame per `RESPIRO ALTO`.
- **Renderer**: `stable-breath` → `RESPIRO PROFONDO` è riuso quasi totale
  per Dream-Segmentation, riuso parziale per Filter-Psiche (in tensione con
  "sovrascrive"). `RESPIRO ALTO` è comportamento nuovo ovunque — nessun
  renderer ha oggi un ramo "acceso"/"veloce" costruito. Vector-Morph,
  Material-Morph, Bauhaus-Morph restano a zero in entrambi gli stati:
  serve prima decidere il meccanismo di colore (filtro CSS? remap
  palette? nuovo layer?) prima di poter parlare di leve.

## 5. Punti da decidere prima di scrivere codice

1. **"Sovrascrive, non modula"**: significa sostituire la funzione di
   colore con una dedicata al respiro (Filter-Psiche, Dream-Segmentation),
   o l'attuale attenuazione era considerata sufficiente e la disposizione
   si riferisce solo a renderer dove *manca* qualunque trattamento
   (Vector/Material/Bauhaus)? Le due letture producono lavoro molto
   diverso.
2. **Meccanismo di colore per Vector/Material/Bauhaus-Morph**: filtro CSS
   post-elaborazione (stile Filter-Psiche) o remap della palette sorgente?
   Nessuno dei due esiste oggi per questi renderer — è una decisione
   nuova, non deducibile dal codice attuale.
3. **`neuronalMultiplier` in RESPIRO ALTO**: torna a 1 (comportamento di
   sempre) o si rinforza sopra 1 ("movimento serrato")? Non specificato dal
   brief Visual.

## 6. Questioni già aperte, non toccate da questa analisi

Restano esattamente come riportato: la chiusura del respiro a pressione
risalita (soluzione già in `pendingPressure`, verificata su due log reali)
e `reference` che si aggiorna solo per rottura, non per permanenza (nessuna
via oggi, meccanismo nuovo se richiesto — in attesa di decisione).

---

## 7. Ripresa successiva — perimetro implementato

La sessione successiva ha implementato il nucleo non ambiguo dell'analisi:
nuovi stati, classificazione diretta da `pressureTrend`, livello relativo alla
mediana, regia/hold, label e riuso dei profili già disponibili. Durante l'audit
sono stati rimossi due gate non previsti da questa analisi (`reference.phase`
per autorizzare il passaggio e `mad` per autorizzare il livello), perché
duplicavano segnali esistenti e producevano regressioni misurabili.

Le tre decisioni artistiche del §5 non sono state convertite in nuovi filtri:
Filter-Psiche e il vocabolario neuronale alto riusano il comportamento pieno
preesistente; Vector/Material/Bauhaus restano senza trattamento colore di
regime finché la Direzione Visual non sceglie una grammatica. Dettaglio tecnico
e validazione: PIANO-040, Task 4.4o.
