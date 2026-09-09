/** Private PsicoFantasma vocabulary. No raster analysis from another renderer. */
export const PSICOFANTASMA_FAMILIES = ['human', 'animal', 'organic', 'everyday', 'artifact'] as const
export type PsicoFantasmaFamily = typeof PSICOFANTASMA_FAMILIES[number]
export type Point = readonly [number, number]

export type Silhouette = {
  id: string
  archetype: string
  label: string
  family: PsicoFantasmaFamily
  /** Closed implicitly, coordinates in [0,1]. Multiple rings use even-odd fill. */
  rings: Point[][]
  source: string
  license: string
  approvedBy: string
}
/** Storicamente le silhouette portavano anche un embedding CLIP offline; il
 * matcher è ora geometrico (PIANO-043 034-17, Opzione B) e il repertorio è
 * pura curatela di sagome. Alias conservato per i call-site. */
export type CuratedSilhouette = Silhouette
export type CuratedRepertoire = { version: 1; silhouettes: Silhouette[] }
export type Repertoire = CuratedRepertoire

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected object')
  return value as Record<string, unknown>
}
function string(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048) throw new Error(`Invalid ${field}`)
  return value
}

/** Validates the Visual delivery. Does not generate, trace or curate shapes. */
export function loadPsicoFantasmaCurated(value: unknown): CuratedRepertoire {
  const root = record(value)
  if (root.version !== 1) throw new Error('Incompatible repertoire version')
  if (!Array.isArray(root.silhouettes) || root.silhouettes.length < 2 || root.silhouettes.length > 2048) {
    throw new Error('Repertoire must contain 2–2048 silhouettes')
  }
  const ids = new Set<string>()
  const concepts = new Map<string, string>()
  const silhouettes = root.silhouettes.map((value): Silhouette => {
    const entry = record(value)
    const id = string(entry.id, 'id')
    if (ids.has(id)) throw new Error(`Duplicate silhouette ${id}`)
    ids.add(id)
    const archetype = string(entry.archetype, 'archetype')
    const family = string(entry.family, 'family') as PsicoFantasmaFamily
    if (!PSICOFANTASMA_FAMILIES.includes(family)) throw new Error('Unknown family')
    if (concepts.has(archetype) && concepts.get(archetype) !== family) throw new Error('Archetype spans families')
    concepts.set(archetype, family)
    if (!Array.isArray(entry.rings) || !entry.rings.length || entry.rings.length > 32) throw new Error('Invalid rings')
    let total = 0
    const rings = entry.rings.map((ring): Point[] => {
      if (!Array.isArray(ring) || ring.length < 3 || ring.length > 512) throw new Error('Invalid contour')
      total += ring.length
      let area = 0
      const points = ring.map((point): Point => {
        if (!Array.isArray(point) || point.length !== 2
          || !point.every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1)) {
          throw new Error('Contour coordinates must be finite and normalized')
        }
        return [point[0], point[1]]
      })
      points.forEach((p, i) => {
        const q = points[(i + 1) % points.length]
        area += p[0] * q[1] - q[0] * p[1]
      })
      if (Math.abs(area) < 1e-6) throw new Error('Degenerate contour')
      return points
    })
    if (total > 2048) throw new Error('Contour budget exceeded')
    return {
      id, archetype, family, rings, label: string(entry.label, 'label'),
      source: string(entry.source, 'source'), license: string(entry.license, 'license'),
      approvedBy: string(entry.approvedBy, 'approvedBy'),
    }
  })
  if (concepts.size < 2) throw new Error('At least two distinct archetypes required for margin')
  return { version: 1, silhouettes }
}

/** Accepts only prepared, approved curated data. */
export function loadPsicoFantasmaRepertoire(value: unknown): Repertoire {
  return loadPsicoFantasmaCurated(value)
}

/** Acceptance of the approved V1 base, not a permanent limit on repertoire growth. */
export function validatePsicoFantasmaV1(repertoire: Repertoire): void {
  const count = repertoire.silhouettes.length
  if (count < 120) throw new Error('V1 requires at least 120 curated silhouettes')
  for (const family of PSICOFANTASMA_FAMILIES) {
    const familyCount = repertoire.silhouettes.filter(s => s.family === family).length
    if (familyCount < 24) throw new Error(`V1 family requires at least 24 silhouettes: ${family}`)
  }
}
