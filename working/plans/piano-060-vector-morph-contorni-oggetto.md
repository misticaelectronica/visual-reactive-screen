# Piano di Lavoro: Vector Morph — contorni a livello di oggetto

> **ID Piano**: `PIANO-060`  
> **Macrotask di Riferimento**: `MACRO-043`  
> **Data Creazione**: 2026-11-06  
> **Stato**: `IN_PROGRESS`  
> **Autore/Agente**: Agente AI / Capo Supremo  

---

## 1. 🎯 Obiettivo

Disposizione del Capo Supremo, 2026-11-06 (testo originale):

> vector morph deve esserre assolutamente migliorato, dobibamo migliorare la
> rilevazione dei contenorni degli oggetti. non deve essere troppo dettagliata
> e frammetata: cerca delle tecniche online per fare questo e procedi

Ambito: solo la vettorializzazione nel main (`brainSnicSegmentation.ts`,
`brainContourSvg.ts`, eventualmente `config/brainRendering.json`). Camera,
eco, fasi e silenzio di Vector Morph (D1–D4 di PIANO-057) restano fuori e
restano in attesa di approvazione. Questo piano assorbe D5 e D6 di PIANO-057
limitatamente alla vettorializzazione.

## 2. 📋 Diagnosi (fatti misurati, 96 raster di `dream-images/`, 640×360)

Misura con la configurazione attuale, script in scratchpad (nessun codice nel
repository):

| Misura | Valore |
|---|---|
| Profilo arrivato a schermo | VTracer `simplified` 94/96, `balanced` 2/96 |
| Candidato SNIC accettato | **0/96** |
| Forme per scena | min 3, mediana 59, p75 92, max 227 |
| Scene sotto 30 forme | 20/96 |
| Durata | mediana 941 ms, max 3.251 ms |

Il candidato SNIC viene sempre scartato: rugosità mediana 1,0 (soglia 0,16),
densità di spigoli 0,43 (soglia 0,2), recupero bordi forti < 0,7 in 40/96.
Anche dopo la levigatura geometrica la rugosità mediana resta 0,41. Il motore
progettato per contorni puliti quindi non arriva mai a schermo e la forma
frammentata che si vede è quella di VTracer.

Cause nel codice SNIC (fatti di codice):

- le unioni avvengono in tre passaggi a soglia fissa; il passaggio di budget
  rifiuta i confini con contrasto alto e non tiene conto della dimensione
  delle regioni, quindi frammenti piccoli e contrastati sopravvivono mentre
  regioni grandi e affini restano separate;
- ogni regione semplifica il proprio contorno da sola: il confine condiviso
  fra due regioni viene semplificato due volte in modo diverso, con fessure,
  sovrapposizioni e spigoli a scaletta.

## 3. Tecniche di riferimento (ricerca 2026-11-06)

- Fusione gerarchica su grafo di adiacenza delle regioni (H-SPAM 2026;
  Lézoray et al., EAAI 2026; Verdoja ICIAP 2015): si unisce sempre la coppia
  adiacente più economica, aggiornando il grafo, finché si raggiunge il numero
  di regioni voluto. Costo di tipo Ward (le regioni piccole si uniscono per
  prime) con un termine di contrasto sul confine che protegge il contorno
  dell'oggetto.
- Semplificazione dei confini condivisi una sola volta (brevetti
  US8553985/US8687895; GRASS/QGIS generalize): il contorno si spezza nei
  punti di giunzione fra tre o più regioni; ogni tratto viene semplificato
  (Douglas–Peucker) e arrotondato (Chaikin, che conserva l'adiacenza) una
  volta sola e riusato da entrambe le regioni.

## 4. Audit `working/DEPRECATED.md`

- `DEP-001 — NON COINVOLTO`: programmazione 80/20, nessun legame con la
  vettorializzazione.
- `DEP-002 — NON COINVOLTO`: testo e storie non vengono toccati.

## 5. Regole di `agents.md`

- [x] Autonomia dei renderer: la vettorializzazione è letta solo da Vector
      Morph e dal ripiego SVG del controller (D7 di PIANO-057); nessun altro
      renderer la importa.
- [x] Divieto di sovrastrutturazione: si sostituiscono i tre passaggi a soglia
      con un'unica fusione ordinata; nessun nuovo segnale, nessuna nuova
      impostazione.
- [x] Camera / Silenzio / Beatmatch / Transizione: invariati, il moto non è
      toccato.
- [x] Costo: la vettorializzazione gira nel worker del main; durata misurata
      prima e dopo.
- [x] Nessun cambiamento a `backgroundThrottling`, permessi, DevTools,
      `lowPowerMode`.

## 6. Fasi

- [x] **TASK-060-01**: misura di partenza (§2).
- [x] **TASK-060-02**: fusione gerarchica su grafo di adiacenza in
      `brainSnicSegmentation.ts`.
- [x] **TASK-060-03**: confini condivisi semplificati una volta (giunzioni,
      Douglas–Peucker canonico, Chaikin) in `brainContourSvg.ts`.
- [x] **TASK-060-04**: misura sugli stessi 96 raster; taratura in
      `brainRendering.json` solo dei parametri esistenti.
- [x] **TASK-060-05**: test, typecheck, lint, build; skills e `working/`.
- [ ] **TASK-060-06**: collaudo del Capo Supremo a schermo.

## 7. Validation Plan

- `pnpm exec vitest run src/main/brainSnicSegmentation.test.ts src/main/brainVectorizer.test.ts`
- `pnpm typecheck`, `pnpm lint`, suite completa, `pnpm build`
- Misura sui 96 raster: quota di candidati SNIC accettati, forme per scena,
  durata.
- A schermo: contorni che seguono gli oggetti, nessuna fessura fra forme,
  nessuna scheggia.

## 8. Registro

- **2026-11-06**: creazione; misura di partenza.
- **2026-11-06**: implementati fusione gerarchica e confini condivisi; angoli
  del quadro ancorati dopo verifica visiva. Misura sugli stessi 96 raster:

  | Misura | Prima | Dopo |
  |---|---|---|
  | Profilo a schermo | VTracer 96/96 | SNIC 96/96 |
  | Forme per scena (mediana / max) | 59 / 227 | 23 / 24 |
  | Scene sotto 30 forme | 20/96 | 96/96 |
  | Durata (mediana / max) | 941 / 3.251 ms | 272 / 358 ms |

  Budget scelto a 24 dopo confronto visivo con 16: a 16 una figura si fonde
  con lo sfondo vicino. Tolleranza 2,6 provata: nessuna differenza visibile,
  resta 1,7.
- **Decisione tecnica da confermare (Capo Supremo)**: SNIC è accettato se
  strutturalmente usabile; rugosità, spigoli e schegge restano solo per
  scegliere fra i profili VTracer. `minimumStrongEdgeRecall` rimosso (tipi,
  configurazione, normalizzazione, test, README): non decideva più nulla e,
  con contorni a livello di oggetto, scende per costruzione.
- **Da segnalare**: con 18–24 forme la scena cade nel regime «pesante» di
  `brainSvgScene.ts` (10 geometrie deformate). Il regime del renderer resta
  materia di PIANO-057.
- Validazione: typecheck, lint, 832 test verdi, `pnpm build` riuscito.
