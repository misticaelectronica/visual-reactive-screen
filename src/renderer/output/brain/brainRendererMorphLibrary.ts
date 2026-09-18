import type { BrainRendererId } from '@shared/types'

// Biblioteca delle relazioni fra renderer (disposizione Vice Consigliere,
// brief "Completamento della biblioteca delle sequenze" 2026-09-17).
//
// Non è una playlist: è la classificazione di QUALI continuazioni sono
// coerenti fra un renderer e il successivo, usata dal selettore
// (`brainRendererSelector.ts`) come preferenza contestuale — mai come
// concatenazione obbligatoria (brief §11). La classificazione riflette il
// comportamento reale già implementato o dichiarato, non un'aspirazione:
//
//   strutturale    → il renderer entrante riceve davvero struttura dal
//                    precedente (handoff tecnico esistente e collaudato)
//   percettiva     → nessun trasferimento strutturale, ma il passaggio è
//                    stato costruito/osservato come prosecuzione coerente
//   compatibilita  → i renderer possono succedersi senza produrre un vero
//                    morph (default per ogni coppia non altrimenti elencata)
//   rottura        → interrompe intenzionalmente la continuità precedente,
//                    per costruzione, non per assenza di lavoro fatto
export type MorphRelationKind = 'strutturale' | 'percettiva' | 'compatibilita' | 'rottura'

type RelationEntry = readonly [BrainRendererId, BrainRendererId, MorphRelationKind]

// Coppie dichiarate esplicitamente. Le altre combinazioni sono
// 'compatibilita' per default (nessuna preferenza, nessuna esclusione).
const DECLARED_RELATIONS: readonly RelationEntry[] = [
  // Material ↔ Dream: handoff del MaterialField implementato in entrambe le
  // direzioni (brainMaterialMorphCanvas.ts, brainDreamSegmentationCanvas.ts)
  // e collaudato percettivamente dal Capo Supremo (PoC 2026-09-14, esteso
  // bidirezionale 2026-09-17). Prima relazione realmente strutturale.
  ['material-morph', 'dream-segmentation', 'strutturale'],
  ['dream-segmentation', 'material-morph', 'strutturale'],

  // Vector ↔ Bauhaus: candidata strutturale secondo la Direzione Visual, ma
  // oggi le due grammatiche geometriche non condividono un formato di
  // struttura trasferibile (richiede una traduzione fra rappresentazioni
  // non ancora implementata — brief §4). Classificata 'compatibilita' finché
  // non esiste un vero canale di handoff, per non dichiarare una capacità
  // che il codice non ha (brief §3: "la classificazione deve riflettere il
  // comportamento reale").
  ['vector-morph', 'bauhaus-morph', 'compatibilita'],
  ['bauhaus-morph', 'vector-morph', 'compatibilita'],

  // Glitch ↔ Fractal Spiral: continuità percettiva/comportamentale, nessun
  // trasferimento di forma reale (brief §4).
  ['glitch-morph', 'fractal-spiral-degeneration', 'percettiva'],
  ['fractal-spiral-degeneration', 'glitch-morph', 'percettiva'],

  // Filter-Psiche: ponte percettivo (oggi un crossfade) verso/da le famiglie
  // Material/Dream e Vector/Bauhaus — raccordo, non morph strutturale, non
  // deve diventare un passaggio obbligatorio (brief §4, §15 nota precedente).
  ['material-morph', 'filter-psiche', 'percettiva'],
  ['dream-segmentation', 'filter-psiche', 'percettiva'],
  ['filter-psiche', 'vector-morph', 'percettiva'],
  ['filter-psiche', 'bauhaus-morph', 'percettiva'],
  ['filter-psiche', 'glitch-morph', 'percettiva'],

  // Material/Dream → Deliquescence: continuità percettiva valida nelle
  // sequenze (S5), senza dichiarare una struttura trasferita che non esiste
  // — Deliquescence riparte sempre dal raster (brief §4, §13 nota
  // precedente). Le dominanze di regime restano superiori (invariate).
  ['material-morph', 'deliquescence', 'percettiva'],
  ['dream-segmentation', 'deliquescence', 'percettiva'],

  // Psycho2D: rottura dichiarata — può interrompere una catena senza
  // obbligo di prosecuzione morfologica (brief §4). Nessuna preferenza in
  // ingresso o in uscita.
  ['psycho2d', 'material-morph', 'rottura'],
  ['psycho2d', 'dream-segmentation', 'rottura'],
  ['psycho2d', 'vector-morph', 'rottura'],
  ['psycho2d', 'bauhaus-morph', 'rottura'],
]

const relationLookup = new Map<string, MorphRelationKind>(
  DECLARED_RELATIONS.map(([from, to, kind]) => [`${from}->${to}`, kind]),
)

/**
 * Classifica la relazione fra il renderer uscente (`fromId`) e un possibile
 * entrante (`toId`). Coppie non dichiarate sono 'compatibilita' per
 * default: eleggibili, nessuna preferenza né penalità.
 */
export function classifyMorphRelation(
  fromId: BrainRendererId,
  toId: BrainRendererId,
): MorphRelationKind {
  if (fromId === toId) return 'compatibilita'
  return relationLookup.get(`${fromId}->${toId}`) ?? 'compatibilita'
}

/**
 * Repertorio iniziale di sequenze (brief §6) — percorsi DISPONIBILI, non
 * playlist da eseguire integralmente (brief §5, §7): il selettore non
 * itera su questa lista, la usa solo come documentazione/collaudo del
 * principio "un renderer appartiene a più percorsi possibili". La scelta
 * concreta a runtime resta governata da `classifyMorphRelation` più
 * regime/eleggibilità/balanced-exposure/hold/randomizzazione
 * (brainRendererSelector.ts).
 */
export const MORPH_SEQUENCE_LIBRARY: Readonly<Record<string, readonly BrainRendererId[]>> = {
  S1: ['material-morph', 'dream-segmentation'],
  S2: ['vector-morph', 'bauhaus-morph'],
  S3: ['bauhaus-morph', 'vector-morph'],
  S4: ['glitch-morph', 'fractal-spiral-degeneration'],
  S5: ['material-morph', 'dream-segmentation', 'deliquescence'],
  S6: ['material-morph', 'dream-segmentation', 'filter-psiche', 'vector-morph', 'bauhaus-morph'],
  S7: ['vector-morph', 'bauhaus-morph', 'filter-psiche', 'glitch-morph', 'fractal-spiral-degeneration'],
}
