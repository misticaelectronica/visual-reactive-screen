import { describe, expect, it, vi } from 'vitest'
import type { PsicoFantasmaFormTrace } from './formMemory'

const fixture = (): PsicoFantasmaFormTrace => ({
  frameId: 'a', silhouette: { id: 'bird', archetype: 'bird' } as never,
  completion: 0.43, bbox: { x: 0.2, y: 0.3, width: 0.4, height: 0.5 },
  lower: document.createElement('canvas'), upper: document.createElement('canvas'),
  mix: 0.27, opacity: 0.7, remainingMs: 12_000,
})

describe('PsicoFantasma rotating form memory', () => {
  it('inherits reached shape across images, protects metadata and rejects outgoing updates', async () => {
    vi.resetModules()
    const memory = await import('./formMemory')
    const first = memory.beginPsicoFantasmaFormFrame('a'), value = fixture()
    memory.retainPsicoFantasmaForm(first.generation, value)
    const second = memory.beginPsicoFantasmaFormFrame('b')
    expect(second.inherited?.completion).toBe(0.43)
    expect(second.inherited?.lower).toBe(value.lower)
    second.inherited!.bbox.x = 0.9
    memory.retainPsicoFantasmaForm(first.generation, { ...value, completion: 0.99 })
    const third = memory.beginPsicoFantasmaFormFrame('c')
    expect(third.inherited?.completion).toBe(0.43)
    expect(third.inherited?.bbox.x).toBe(0.2)
  })

  it('decays through unmatched images without resetting lifetime; silence does not consume it', async () => {
    vi.resetModules()
    const memory = await import('./formMemory')
    const first = memory.beginPsicoFantasmaFormFrame('a')
    memory.retainPsicoFantasmaForm(first.generation, fixture())
    const second = memory.beginPsicoFantasmaFormFrame('b')
    memory.decayPsicoFantasmaForm(second.generation, 3_000)
    memory.decayPsicoFantasmaForm(second.generation, 0)
    const third = memory.beginPsicoFantasmaFormFrame('c')
    expect(third.inherited?.remainingMs).toBe(9_000)
    memory.decayPsicoFantasmaForm(third.generation, 9_000)
    expect(memory.beginPsicoFantasmaFormFrame('d').inherited).toBeNull()
  })

  it('does not treat recreation of the same image as a new image', async () => {
    vi.resetModules()
    const memory = await import('./formMemory')
    const first = memory.beginPsicoFantasmaFormFrame('a')
    memory.retainPsicoFantasmaForm(first.generation, fixture())
    expect(memory.beginPsicoFantasmaFormFrame('a').inherited).toBeNull()
  })
})
