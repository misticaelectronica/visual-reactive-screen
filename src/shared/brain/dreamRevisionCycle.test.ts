import { describe, expect, it } from 'vitest'
import {
  REVISION_CYCLE_MAX_IMAGES,
  REVISION_CYCLE_MAX_STORIES,
  REVISION_CYCLE_MIN_IMAGES,
  REVISION_CYCLE_MIN_STORIES,
  combineRevisionTag,
  computeRevisionLapDurationMs,
  deriveBioenergeticState,
  deriveOneiricPhase,
  pickRevisionEntries,
  pickRevisionImageCount,
  pickStoriesUntilNextRevisionCycle,
  pruneArchiveEntriesForTag,
  selectRevisionPool,
  shouldStartRevisionCycleAtBoundary,
  type DreamImageArchiveEntry,
} from './dreamRevisionCycle'

function entry(overrides: Partial<DreamImageArchiveEntry> = {}): DreamImageArchiveEntry {
  return {
    fileName: 'a.webp',
    tag: 'soglia+quiete',
    storyId: 'story-1',
    frameId: 'frame-1',
    frameIndex: 0,
    energy: 0.3,
    createdAt: 0,
    title: 'Test',
    ...overrides,
  }
}

describe('deriveOneiricPhase', () => {
  it('mappa una storia a 4 fotogrammi su soglia/metamorfosi/condensazione/eco', () => {
    expect(deriveOneiricPhase(0, 4)).toBe('soglia')
    expect(deriveOneiricPhase(1, 4)).toBe('metamorfosi')
    expect(deriveOneiricPhase(2, 4)).toBe('condensazione')
    expect(deriveOneiricPhase(3, 4)).toBe('eco')
  })

  it('una storia a un solo fotogramma è sempre eco', () => {
    expect(deriveOneiricPhase(0, 1)).toBe('eco')
  })
})

describe('deriveBioenergeticState', () => {
  it('energia bassa senza precedente è quiete', () => {
    expect(deriveBioenergeticState(0.2, null)).toBe('quiete')
  })

  it('energia alta senza precedente è tensione', () => {
    expect(deriveBioenergeticState(0.8, null)).toBe('tensione')
  })

  it('energia in aumento rispetto al precedente è tensione', () => {
    expect(deriveBioenergeticState(0.5, 0.3)).toBe('tensione')
  })

  it('energia in calo rispetto al precedente è rilascio', () => {
    expect(deriveBioenergeticState(0.3, 0.5)).toBe('rilascio')
  })

  it('energia stabile e bassa è quiete', () => {
    expect(deriveBioenergeticState(0.3, 0.3)).toBe('quiete')
  })
})

describe('combineRevisionTag', () => {
  it('combina fase e stato con un separatore stabile', () => {
    expect(combineRevisionTag('condensazione', 'tensione')).toBe('condensazione+tensione')
  })
})

describe('pickStoriesUntilNextRevisionCycle', () => {
  it('resta sempre nel range [2,4]', () => {
    for (let index = 0; index < 50; index += 1) {
      const value = pickStoriesUntilNextRevisionCycle(() => index / 50)
      expect(value).toBeGreaterThanOrEqual(REVISION_CYCLE_MIN_STORIES)
      expect(value).toBeLessThanOrEqual(REVISION_CYCLE_MAX_STORIES)
    }
  })
})

describe('shouldStartRevisionCycleAtBoundary', () => {
  it('autorizza la Riattivazione dal solo contatore, senza dipendere dalla prossima produzione', () => {
    expect(shouldStartRevisionCycleAtBoundary(0, false, false)).toBe(true)
    expect(shouldStartRevisionCycleAtBoundary(-1, false, false)).toBe(true)
    expect(shouldStartRevisionCycleAtBoundary(1, false, false)).toBe(false)
    expect(shouldStartRevisionCycleAtBoundary(0, true, false)).toBe(false)
    expect(shouldStartRevisionCycleAtBoundary(0, false, true)).toBe(false)
  })
})

describe('pickRevisionImageCount', () => {
  it('resta sempre nel range [5,9]', () => {
    for (let index = 0; index < 50; index += 1) {
      const value = pickRevisionImageCount(() => index / 50)
      expect(value).toBeGreaterThanOrEqual(REVISION_CYCLE_MIN_IMAGES)
      expect(value).toBeLessThanOrEqual(REVISION_CYCLE_MAX_IMAGES)
    }
  })
})

describe('computeRevisionLapDurationMs', () => {
  it('il primo giro dura il 30% in meno del normale', () => {
    expect(computeRevisionLapDurationMs(10_000, 0)).toBe(7_000)
  })

  it('dal secondo giro in poi dura il 50% in meno del normale', () => {
    expect(computeRevisionLapDurationMs(10_000, 1)).toBe(5_000)
    expect(computeRevisionLapDurationMs(10_000, 2)).toBe(5_000)
  })
})

describe('pruneArchiveEntriesForTag', () => {
  it('non tocca nulla se sotto al budget', () => {
    const entries = [entry({ fileName: 'a' }), entry({ fileName: 'b' })]
    const result = pruneArchiveEntriesForTag(entries, 'soglia+quiete', 5)
    expect(result.evicted).toEqual([])
    expect(result.kept).toHaveLength(2)
  })

  it('evinge le più vecchie del tag superato il budget, lascia intatti gli altri tag', () => {
    const entries = [
      entry({ fileName: 'old', createdAt: 1 }),
      entry({ fileName: 'mid', createdAt: 2 }),
      entry({ fileName: 'new', createdAt: 3 }),
      entry({ fileName: 'other-tag', tag: 'eco+rilascio', createdAt: 1 }),
    ]
    const result = pruneArchiveEntriesForTag(entries, 'soglia+quiete', 2)
    expect(result.evicted.map((e) => e.fileName)).toEqual(['old'])
    expect(result.kept.map((e) => e.fileName).sort()).toEqual(['mid', 'new', 'other-tag'])
  })
})

describe('selectRevisionPool', () => {
  it('preferisce il tag combinato esatto quando disponibile', () => {
    const entries = [
      entry({ tag: 'condensazione+tensione' }),
      entry({ tag: 'condensazione+quiete' }),
    ]
    const result = selectRevisionPool(entries, 'condensazione', 'tensione')
    expect(result?.tagUsed).toBe('condensazione+tensione')
    expect(result?.entries).toHaveLength(1)
  })

  it('ripiega sulla sola fase onirica se il tag esatto non ha immagini', () => {
    const entries = [entry({ tag: 'condensazione+quiete' })]
    const result = selectRevisionPool(entries, 'condensazione', 'tensione')
    expect(result?.tagUsed).toBe('condensazione')
    expect(result?.entries).toHaveLength(1)
  })

  it('ripiega su qualunque immagine se nessuna corrisponde alla fase', () => {
    const entries = [entry({ tag: 'eco+rilascio' })]
    const result = selectRevisionPool(entries, 'condensazione', 'tensione')
    expect(result?.tagUsed).toBe('any')
    expect(result?.entries).toHaveLength(1)
  })

  it('ritorna null se l\'archivio è vuoto — nessun fallimento rumoroso', () => {
    expect(selectRevisionPool([], 'condensazione', 'tensione')).toBeNull()
  })
})

describe('pickRevisionEntries', () => {
  it('non restituisce più elementi di quanti richiesti né di quanti disponibili', () => {
    const entries = Array.from({ length: 5 }, (_, index) => entry({ fileName: `f${index}` }))
    expect(pickRevisionEntries(entries, 10)).toHaveLength(5)
    expect(pickRevisionEntries(entries, 3)).toHaveLength(3)
  })

  it('non duplica né perde elementi nel mescolamento', () => {
    const entries = Array.from({ length: 6 }, (_, index) => entry({ fileName: `f${index}` }))
    const picked = pickRevisionEntries(entries, 6, () => 0.5)
    expect(new Set(picked.map((e) => e.fileName)).size).toBe(6)
  })
})
