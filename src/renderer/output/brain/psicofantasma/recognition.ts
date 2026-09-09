import { describeSilhouette, shapeAffinity, type ShapeDescriptor } from './shape'
import type { Repertoire, Silhouette } from './repertoire'

export type RankedCandidate = { silhouette: Silhouette; affinity: number }
export type RecognitionEvidence = {
  candidate: RankedCandidate | null
  secondAffinity: number | null
  margin: number | null
}

const shapeCache = new WeakMap<Silhouette, ShapeDescriptor>()
function silhouetteShape(silhouette: Silhouette): ShapeDescriptor {
  let descriptor = shapeCache.get(silhouette)
  if (!descriptor) {
    descriptor = describeSilhouette(silhouette.rings)
    shapeCache.set(silhouette, descriptor)
  }
  return descriptor
}

/** Matcher geometrico open-set (PIANO-043 034-17, Opzione B). Confronto di
 * forma fra il contorno della regione emersa e le silhouette del repertorio —
 * stesso dominio, nessun embedding, nessun veto semantico. Le varianti
 * canoniche di uno stesso concetto non competono per il margine. */
export function rankPsicoFantasma(query: ShapeDescriptor, repertoire: Repertoire): RecognitionEvidence {
  const concepts = new Map<string, RankedCandidate>()
  for (const silhouette of repertoire.silhouettes) {
    const affinity = shapeAffinity(query, silhouetteShape(silhouette))
    const previous = concepts.get(silhouette.archetype)
    if (!previous || affinity > previous.affinity) concepts.set(silhouette.archetype, { silhouette, affinity })
  }
  const ranked = [...concepts.values()].sort((a, b) => b.affinity - a.affinity
    || a.silhouette.id.localeCompare(b.silhouette.id))
  return { candidate: ranked[0] ?? null, secondAffinity: ranked[1]?.affinity ?? null,
    margin: ranked.length > 1 ? ranked[0].affinity - ranked[1].affinity : null }
}
export type RecognitionThresholds = {
  affinity: number
  margin: number
  structure: number
  persistenceMs: number
}
export type RecognitionDecision = {
  recognized: boolean
  archetype: string | null
  candidateId: string | null
  affinity: number | null
  margin: number | null
  structuralCoherence: number
  observedMs: number
  reason: 'recognized' | 'no-candidate' | 'affinity' | 'margin' | 'structure' | 'persistence'
}
/** Thresholds must be supplied by the calibration, never inferred from a success quota. */
export function decidePsicoFantasma(
  evidence: RecognitionEvidence, structuralCoherence: number, observedMs: number,
  thresholds: RecognitionThresholds,
): RecognitionDecision {
  if (!Object.values(thresholds).every(Number.isFinite)
    || thresholds.affinity < 0 || thresholds.affinity > 1
    || thresholds.margin <= 0 || thresholds.margin > 2
    || thresholds.structure <= 0 || thresholds.structure > 1 || thresholds.persistenceMs <= 0) {
    throw new Error('Invalid recognition thresholds')
  }
  const { candidate, margin } = evidence
  const reason = !candidate ? 'no-candidate'
    : !Number.isFinite(candidate.affinity) || candidate.affinity < thresholds.affinity ? 'affinity'
      : margin === null || !Number.isFinite(margin) || margin < thresholds.margin ? 'margin'
        : !Number.isFinite(structuralCoherence) || structuralCoherence < thresholds.structure
          || structuralCoherence > 1 ? 'structure'
          : !Number.isFinite(observedMs) || observedMs < thresholds.persistenceMs ? 'persistence'
            : 'recognized'
  return { recognized: reason === 'recognized',
    archetype: reason === 'recognized' ? candidate!.silhouette.archetype : null,
    candidateId: candidate?.silhouette.id ?? null, affinity: candidate?.affinity ?? null,
    margin, structuralCoherence, observedMs, reason }
}
