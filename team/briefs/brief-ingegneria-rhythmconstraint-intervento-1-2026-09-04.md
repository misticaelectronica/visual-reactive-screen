# Risposta Ingegneria — Intervento 1: rhythmConstraint (2026-09-04)

Risposta tecnica al brief dell'Audio "AL CAPO SUPREMO DEGLI INGEGNERI — Intervento 1: rhythmConstraint". Implementato in [`src/renderer/output/brain/brainBioPerception.ts`](../../src/renderer/output/brain/brainBioPerception.ts) (`advanceBioRhythmConstraint`/`calculateRhythmConstraint`, righe ~516-611).

## Cosa è cambiato

Nessun segnale nuovo: la relazione resta esprimibile con `kickEnvelope`, `beatPulse`, `lowEnd`, `gridDensity`, `bandTransients` e il clock, come richiesto. `rhythmConstraint` da somma pesata a formula relazionale:

1. **`pulse` ridefinito.** Prima: inviluppo lento di `max(kickEnvelope, beatPulse)`. Difetto confermato leggendo `brainRhythm.ts`: `kickEnvelope` è per costruzione ≥ `beatPulse` (lo contiene all'82%), e `beatPulse` può restare a 1 su un beat *proiettato* dal clock (`projectState`, ramo `predictionHasEnergy`) quando c'è energia low/lowMid generica ma nessun attacco reale — il `max` misurava quindi l'aspettativa del clock, non l'attacco fisico. Ora `pulse` è l'inviluppo lento del solo attacco confermato da `bandTransients.low/lowMid` (già lift-gated, quindi non risponde al letto steady); il clock resta come gate binario (`rhythm.active`, silenzio → 0) ma non sostiene più il valore da solo.
2. **`anchor` (nuovo, interno).** `pulse*0.6 + gridDensity*0.4`, clampato — quanto pulsazione e griglia insieme stabiliscono un riferimento motorio. `gridDensity` può farlo salire da sola a energia invariata (proprietà 3, C02).
3. **`lowEnd` non è più additivo.** Entra come `lowEnd * anchor` ("grounded low-end"): senza ancoraggio ritmico (`anchor` ≈ 0) il basso non produce più costrizione, qualunque sia la sua ampiezza (proprietà 2, C05/C08).
4. **Combinazione finale:** `anchor*0.62 + groundedLowEnd*0.38`, clampato.

Congelato tutto il resto: `sustainedEnergy`, `spectralOccupancy`, `temporalOccupancy`, i pesi globali di `perceptualPressure`, `pressureTrend`, `reference`, `median`, `classifyLevel`, le soglie dei regimi. Una variabile concettuale sola, come richiesto.

## Verifica proprietà (ragionamento, non ancora dati sui campioni)

- **Prop. 1** (clock ≠ entrainment): `pulse` non dipende più da `beatPulse`/`kickEnvelope`, solo da `bandTransients` reali + gate `active`.
- **Prop. 2** (low-end senza grounding): `lowEnd` moltiplicato per `anchor`, non sommato — con `anchor≈0` il contributo è ≈0 indipendentemente dall'ampiezza del basso.
- **Prop. 3** (articolazione senza energia): `gridDensity` alza `anchor` indipendentemente da `lowEnd`/energia.
- **Prop. 4** (griglia stabile > respiro-profondo): con `pulse` e `gridDensity` alti, `anchor→1` e il totale può arrivare a 1.0; un respiro-profondo pieno di bassi ma senza griglia resta capato da `anchor` basso.
- **Prop. 5** (densità ≠ costrizione): invariato — `gridDensity` resta gated dal lift-detector di `brainRhythm.ts` e dalla scala esistente.

## Stato dei test

`brainBioPerception.test.ts` aveva un solo test end-to-end che simulava l'ingest senza mai passare il canale `rhythm` (4° argomento di `ingestSample`) — semplificazione tollerata dalla vecchia formula additiva, ma incompatibile con la nuova: senza `active`, `pulse` resta a 0 per costruzione e il tetto raggiungibile da `anchor`/`lowEnd` da soli scende. In produzione (`OutputApp.tsx`) il canale `rhythm` è sempre passato col clock reale; ho quindi corretto il test aggiungendo un `rhythm` con `active: true` sui campioni non silenziosi, non i pesi. Suite `brain/` completa: 507/507 verdi, typecheck pulito.

## Sul ricollaudo dei nove campioni

Il ricollaudo (PP(C03) > PP(C04), PP(C06) > PP(C04), entrambi > C08, andamento temporale su C09) richiede la pipeline/harness che ha prodotto `working/calibration-v1/*` — non presente in questo repository lato codice sorgente (nessuno script di calibrazione tracciato). Il codice è pronto e i test unitari confermano la logica descritta sopra; il confronto sui campioni reali resta da eseguire con lo stesso metodo/harness già usato per la baseline precedente.

Firmato: il Capo Supremo degli Ingegneri.


## Aggiornamento Ingegneria — replay degli ingressi registrati (2026-09-04)

Superato il blocco tecnico parziale descritto sopra: pur senza l'harness FFT
originale, i JSONL contengono tutti gli ingressi necessari alla componente.
Il comando `node scripts/replay-rhythm-constraint.mjs` usa direttamente il
modulo TypeScript di produzione e mantiene ferme le altre tre componenti.
Report: [confronto riproducibile](../../working/calibration-v1/rhythm-constraint-replay.md).

La baseline PP è ricostruita con errore zero. Esclusi i primi 20 secondi
GLOBALI del replay continuo perché il riscaldamento non è conservato;
lowEnd/gridDensity convergono ai dati registrati con errore < 4.3e-8.
Nessuna nuova analisi audio, nessuna ricostruzione dei regimi o della mediana.

**Esito: la riformulazione non dimostra ancora la separazione richiesta.**
Sui nomi file disponibili, respiro-alto-0 resta a PP mediana 0.4530, sotto
respiro-profondo-1 (0.4690) e respiro-profondo (0.4859). Anche la componente
ritmica è minore: 0.0118 contro 0.0303 e 0.0490. Quindi non basta attribuire
il problema solo ai pesi energetici: nel replay anche il ritmo non ordina
questi campioni come suggeriscono i loro nomi. Questo è un dato numerico,
non una nuova classificazione percettiva dei contenuti.

Il corpus contiene DIECI file, non nove, e non conserva la mappa C01–C09:
nessun confronto nominato C03/C04/C06/C08/C09 viene certificato per congettura.
Le finestre di 10 s nel report consentono all'Audio di valutare gli andamenti.
Serve ora il suo riscontro sulla corrispondenza e sul significato dei campioni
prima di autorizzare un'altra formula; nessuna soglia o peso è stato cambiato.

Regressioni aggiunte: basso steady + clock predetto non creano costrizione;
attacchi reali a energia invariata la creano, un singolo beat mancante non
la azzera e il silenzio la scarica; cambiare solo beatPulse/kickEnvelope non
cambia pulse. **52/52 test mirati, typecheck e lint verdi.** Queste proprietà
tecniche non certificano l'entrainment percettivo o la corretta classificazione.


## Caso bloccante `test-1.mp3` — risposta Ingegneria (2026-09-04)

Collaudo eseguito sul file reale. Il difetto non richiedeva un nuovo segnale:
il tracker `pressureLanded` esisteva già, ma una conferma di 1 s promuoveva i
vertici del ciclo a stasi. Portata a 9 s, oltre il ciclo osservato di 7,5–8 s.
Nei brevi punti neutri si conserva l’ultimo passaggio.

Risultato: `respiro-alto` da 7,55 s a 0 s. Dopo 0,84 s iniziali, il frammento
alterna esclusivamente `decompression` e `pressurized`. Suite completa verde.
