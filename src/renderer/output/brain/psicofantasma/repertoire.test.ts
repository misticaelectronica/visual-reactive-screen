import { describe, expect, it } from 'vitest'
import { loadPsicoFantasmaCurated, loadPsicoFantasmaRepertoire, validatePsicoFantasmaV1 } from './repertoire'
import { decidePsicoFantasma, rankPsicoFantasma } from './recognition'
import { describeSilhouette } from './shape'

// Artificial polygons are unit-test fixtures, never a bundled Visual repertoire.
type Ring = [number, number][]
const square: Ring = [[0.15, 0.15], [0.85, 0.15], [0.85, 0.85], [0.15, 0.85]]
const roundedSquare: Ring = [[0.2, 0.15], [0.8, 0.15], [0.85, 0.2], [0.85, 0.8],
  [0.8, 0.85], [0.2, 0.85], [0.15, 0.8], [0.15, 0.2]]
const triangle: Ring = [[0.5, 0.12], [0.88, 0.88], [0.12, 0.88]]
const bar: Ring = [[0.05, 0.44], [0.95, 0.44], [0.95, 0.56], [0.05, 0.56]]

const entry = (id: string, archetype = id, rings: Ring[] = [square]) => ({
  id, archetype, rings, label: id, family: 'animal' as const,
  source: 'test fixture', license: 'test only', approvedBy: 'test fixture',
})
const manifest = (silhouettes = [entry('a'), entry('b', 'b', [triangle])]) => ({
  version: 1, silhouettes,
})
const thresholds = { affinity: 0.8, margin: 0.1, structure: 0.6, persistenceMs: 2000 }

describe('PsicoFantasma curated repertoire', () => {
  it('rejects wrong version, missing provenance and invalid geometry', () => {
    expect(() => loadPsicoFantasmaRepertoire({ ...manifest(), version: 2 })).toThrow()
    expect(() => loadPsicoFantasmaRepertoire(manifest([{ ...entry('a'), approvedBy: '' }, entry('b')]))).toThrow()
    expect(() => loadPsicoFantasmaRepertoire(manifest([entry('a'), entry('a')]))).toThrow('Duplicate')
    expect(() => loadPsicoFantasmaRepertoire(
      manifest([{ ...entry('a'), rings: [[[2, 0], [0, 1], [1, 1]]] }, entry('b')]))).toThrow()
    expect(() => loadPsicoFantasmaRepertoire(
      manifest([{ ...entry('a'), rings: [[[0, 0], [1, 1], [0.5, 0.5]]] }, entry('b')]))).toThrow('Degenerate')
  })
  it('requires at least two distinct archetypes for the margin', () => {
    expect(() => loadPsicoFantasmaRepertoire(manifest([entry('a', 'same'), entry('b', 'same', [triangle])]))).toThrow()
  })
  it('checks the V1 slice separately from future expansion', () => {
    expect(() => validatePsicoFantasmaV1(loadPsicoFantasmaRepertoire(manifest()))).toThrow('at least 120')
    const expanded = loadPsicoFantasmaCurated(
      manifest(Array.from({ length: 80 }, (_, i) => entry(`a${i}`, `a${i}`))))
    expect(expanded.silhouettes).toHaveLength(80)
  })
})

describe('PsicoFantasma open-set recognition — matcher geometrico', () => {
  it('an identical shape is the candidate with full affinity', () => {
    const repertoire = loadPsicoFantasmaRepertoire(manifest([entry('sq', 'square'), entry('tri', 'triangle', [triangle])]))
    const evidence = rankPsicoFantasma(describeSilhouette([square]), repertoire)
    expect(evidence.candidate?.silhouette.archetype).toBe('square')
    expect(evidence.candidate?.affinity).toBeCloseTo(1, 5)
    expect(evidence.margin ?? 0).toBeGreaterThan(0)
  })
  it('canonical variants of one concept never compete for the margin', () => {
    const repertoire = loadPsicoFantasmaRepertoire(manifest([
      entry('sq-sharp', 'square', [square]),
      entry('sq-round', 'square', [roundedSquare]),
      entry('tri', 'triangle', [triangle]),
    ]))
    const evidence = rankPsicoFantasma(describeSilhouette([square]), repertoire)
    expect(evidence.candidate?.silhouette.archetype).toBe('square')
    // Il secondo classificato è il concetto 'triangle', non la variante 'sq-round'.
    expect(evidence.secondAffinity).toBeLessThan(evidence.candidate!.affinity)
  })
  it('refuses weak absolute similarity even with an unambiguous winner', () => {
    const repertoire = loadPsicoFantasmaRepertoire(manifest([entry('sq', 'square'), entry('tri', 'triangle', [triangle])]))
    const evidence = rankPsicoFantasma(describeSilhouette([bar]), repertoire)
    expect(evidence.candidate).not.toBeNull()
    expect(decidePsicoFantasma(evidence, 1, 3000, thresholds).reason).toBe('affinity')
  })
  it('refuses ambiguity, structural coincidence and short observation separately', () => {
    const repertoire = loadPsicoFantasmaRepertoire(manifest([
      entry('sq', 'square', [square]), entry('round', 'round', [roundedSquare]),
    ]))
    const ambiguous = rankPsicoFantasma(describeSilhouette([square]), repertoire)
    expect(decidePsicoFantasma(ambiguous, 1, 3000, { ...thresholds, affinity: 0.4 }).reason).toBe('margin')
    const good = { candidate: { silhouette: entry('x') as never, affinity: 0.95 }, secondAffinity: 0.4, margin: 0.55 }
    expect(decidePsicoFantasma(good, 0.3, 3000, thresholds).reason).toBe('structure')
    expect(decidePsicoFantasma(good, 1, 1999, thresholds).reason).toBe('persistence')
    expect(decidePsicoFantasma(good, 1, 2000, thresholds).recognized).toBe(true)
    expect(decidePsicoFantasma(good, NaN, 3000, thresholds).recognized).toBe(false)
  })
  it('reports absence independently of thresholds and rejects invalid calibration', () => {
    const absent = { candidate: null, secondAffinity: null, margin: null }
    expect(decidePsicoFantasma(absent, 0, 5000, thresholds).reason).toBe('no-candidate')
    expect(() => decidePsicoFantasma(absent, 0, 5000, { ...thresholds, persistenceMs: 0 })).toThrow()
  })
})

describe('PsicoFantasma silhouette rasterization', () => {
  it('retains inner voids via even-odd fill', async () => {
    const { rasterizePsicoFantasmaSilhouette } = await import('./preparation')
    const rgba = rasterizePsicoFantasmaSilhouette({
      ...entry('ring'),
      rings: [
        [[0, 0], [1, 0], [1, 1], [0, 1]],
        [[0.25, 0.25], [0.75, 0.25], [0.75, 0.75], [0.25, 0.75]],
      ],
    })
    expect(rgba[(112 * 224 + 112) * 4]).toBe(255)
    expect(rgba[(20 * 224 + 20) * 4]).toBe(0)
  })
})
