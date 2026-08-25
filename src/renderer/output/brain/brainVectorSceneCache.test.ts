import { describe, expect, it, vi } from 'vitest'
import type { BrainRendererImageSource } from './brainRendererPlugin'
import type { PsychedelVectorizer } from './brainVectorQuality'
import { BrainVectorSceneCache } from './brainVectorSceneCache'

function source(id: string, raster: Blob): BrainRendererImageSource {
  return {
    id,
    role: 'current',
    raster,
    narrativeHints: [],
    scene: {
      frameId: id,
      description: id,
      svg: '<svg/>',
      raster,
    },
  }
}

function vectorizer(): PsychedelVectorizer & { vectorize: ReturnType<typeof vi.fn> } {
  return {
    vectorize: vi.fn(async () => ({
      svg: '<svg viewBox="0 0 10 10"><path d="M0 0L10 10"/></svg>',
      quality: {
        accepted: true,
        issues: [],
        svgLength: 58,
        drawableCount: 5,
        pathCount: 4,
        pathCommands: 12,
        colorCount: 3,
        viewBox: [0, 0, 10, 10] as [number, number, number, number],
      },
      durationMs: 12,
    })),
  }
}

describe('Brain Vector Scene cache', () => {
  it('vettorializza una Blob una sola volta e riusa la stessa promessa', async () => {
    const engine = vectorizer()
    const cache = new BrainVectorSceneCache(engine)
    const raster = new Blob(['same'])
    const image = source('image-a', raster)

    const [first, second] = await Promise.all([
      cache.get(image),
      cache.get(image),
    ])

    expect(engine.vectorize).toHaveBeenCalledTimes(1)
    expect(first.svg).toBe(second.svg)
  })

  it('invalida la cache quando cambia la Blob definitiva dello stesso frame', async () => {
    const engine = vectorizer()
    const cache = new BrainVectorSceneCache(engine)
    await cache.get(source('image-a', new Blob(['provisional'])))
    await cache.get(source('image-a', new Blob(['definitive'])))
    expect(engine.vectorize).toHaveBeenCalledTimes(2)
  })

  it('limita il numero di immagini conservate', async () => {
    const engine = vectorizer()
    const cache = new BrainVectorSceneCache(engine, 2)
    await cache.get(source('a', new Blob(['a'])))
    await cache.get(source('b', new Blob(['b'])))
    await cache.get(source('c', new Blob(['c'])))
    expect(cache.size).toBe(2)
  })
})
