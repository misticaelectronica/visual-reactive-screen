import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { PSICOFANTASMA_THRESHOLDS } from '../brainPsicoFantasmaCanvas'
import { psicoFantasmaStructuralCoherence, type PsicoFantasmaRegion } from './analysis'
import { rasterizePsicoFantasmaSilhouette } from './preparation'
import { decidePsicoFantasma, rankPsicoFantasma } from './recognition'
import { loadPsicoFantasmaRepertoire, PSICOFANTASMA_FAMILIES, validatePsicoFantasmaV1 } from './repertoire'
import { describeSilhouette } from './shape'

const repertoire = loadPsicoFantasmaRepertoire(JSON.parse(fs.readFileSync(
  path.resolve(process.cwd(), 'config/psicofantasma/repertoire.json'), 'utf8',
)))

function exactRegion(index: number): PsicoFantasmaRegion {
  const silhouette = repertoire.silhouettes[index]
  const rgba = rasterizePsicoFantasmaSilhouette(silhouette)
  const mask = Uint8Array.from({ length: 224 * 224 }, (_, pixel) => rgba[pixel * 4] < 128 ? 255 : 0)
  return { id: `exact-${silhouette.id}`, x: 0, y: 0, width: 224, height: 224, mask, contour: [] }
}

describe('PsicoFantasma approved V1 repertoire', () => {
  it('loads all 120 silhouettes with 24 entries in every family and 40 guide archetypes', () => {
    expect(() => validatePsicoFantasmaV1(repertoire)).not.toThrow()
    expect(repertoire.silhouettes).toHaveLength(120)
    expect(new Set(repertoire.silhouettes.map(item => item.archetype)).size).toBe(40)
    for (const family of PSICOFANTASMA_FAMILIES) {
      expect(repertoire.silhouettes.filter(item => item.family === family)).toHaveLength(24)
    }
  })

  it('generates finite descriptors, ranks every exact shape and remains compatible with structural coherence', () => {
    for (const [index, silhouette] of repertoire.silhouettes.entries()) {
      const descriptor = describeSilhouette(silhouette.rings)
      expect([...descriptor.hu, ...descriptor.harmonics, descriptor.elongation, descriptor.compactness]
        .every(Number.isFinite), silhouette.id).toBe(true)
      const evidence = rankPsicoFantasma(descriptor, repertoire)
      expect(evidence.candidate, silhouette.id).not.toBeNull()
      expect(evidence.candidate?.affinity, silhouette.id).toBeCloseTo(1, 8)
      expect(psicoFantasmaStructuralCoherence(exactRegion(index), silhouette), silhouette.id).toBeCloseTo(1, 8)
    }
  })

  it('applies margin and persistence as open-set gates without imposing a recognition quota', () => {
    let recognized = 0
    let ambiguous = 0
    const rejectedByMargin: Array<{ asset: string; winner: string | null; margin: number | null }> = []
    const wrongArchetypeWinner: Array<{ asset: string; winner: string | null; margin: number | null }> = []
    const started = performance.now()
    for (const [index, silhouette] of repertoire.silhouettes.entries()) {
      const evidence = rankPsicoFantasma(describeSilhouette(silhouette.rings), repertoire)
      if (evidence.candidate?.silhouette.archetype !== silhouette.archetype) {
        wrongArchetypeWinner.push({ asset: silhouette.id,
          winner: evidence.candidate?.silhouette.id ?? null, margin: evidence.margin })
      }
      const coherence = psicoFantasmaStructuralCoherence(exactRegion(index), silhouette)
      const early = decidePsicoFantasma(
        evidence, coherence, PSICOFANTASMA_THRESHOLDS.persistenceMs - 1, PSICOFANTASMA_THRESHOLDS,
      )
      const settled = decidePsicoFantasma(
        evidence, coherence, PSICOFANTASMA_THRESHOLDS.persistenceMs, PSICOFANTASMA_THRESHOLDS,
      )
      if ((evidence.margin ?? 0) >= PSICOFANTASMA_THRESHOLDS.margin) {
        expect(early.reason, silhouette.id).toBe('persistence')
        expect(settled.recognized, silhouette.id).toBe(true)
        recognized++
      } else {
        expect(early.reason, silhouette.id).toBe('margin')
        expect(settled.reason, silhouette.id).toBe('margin')
        ambiguous++
        rejectedByMargin.push({ asset: silhouette.id,
          winner: evidence.candidate?.silhouette.id ?? null, margin: evidence.margin })
      }
    }
    expect(recognized + ambiguous).toBe(120)
    expect(recognized).toBeGreaterThan(0)
    if (process.env.PSICOFANTASMA_AUDIT === '1') {
      console.info(JSON.stringify({ recognizedExactShapes: recognized, rejectedByMargin,
        wrongArchetypeWinner, elapsedMs: Number((performance.now() - started).toFixed(2)) }, null, 2))
    }
  })
})
