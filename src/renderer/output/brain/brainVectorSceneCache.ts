import type { PsychedelScene } from '@shared/brain/brainTypes'
import type { BrainRendererImageSource } from './brainRendererPlugin'
import type { PsychedelVectorizer } from './brainVectorQuality'
import { brainLog, brainWarn } from './brainLog'

type CacheEntry = {
  raster: Blob
  promise: Promise<PsychedelScene>
  lastUsedAt: number
}

export class BrainVectorSceneCache {
  private readonly entries = new Map<string, CacheEntry>()

  constructor(
    private readonly vectorizer: PsychedelVectorizer,
    private readonly maximumEntries = 8,
  ) {}

  get(source: BrainRendererImageSource): Promise<PsychedelScene> {
    const existing = this.entries.get(source.id)
    if (existing?.raster === source.raster) {
      existing.lastUsedAt = performance.now()
      return existing.promise
    }
    if (existing) this.entries.delete(source.id)

    const startedAt = performance.now()
    const promise = this.vectorizer.vectorize(source.raster).then((result) => {
      brainLog('vettorializzazione', 'scena Vector Morph pronta e conservata', {
        imageId: source.id,
        durationMs: Math.round(result.durationMs),
        svgLength: result.quality.svgLength,
        drawableCount: result.quality.drawableCount,
        profile: result.profile ?? null,
      })
      return {
        ...source.scene,
        svg: result.svg,
      }
    }).catch((error) => {
      const current = this.entries.get(source.id)
      if (current?.promise === promise) this.entries.delete(source.id)
      brainWarn('vettorializzazione', 'scena Vector Morph non disponibile', {
        imageId: source.id,
        elapsedMs: Math.round(performance.now() - startedAt),
        error,
      })
      throw error
    })
    this.entries.set(source.id, {
      raster: source.raster,
      promise,
      lastUsedAt: performance.now(),
    })
    this.prune(source.id)
    return promise
  }

  clear(): void {
    this.entries.clear()
  }

  get size(): number {
    return this.entries.size
  }

  private prune(protectedId: string): void {
    while (this.entries.size > Math.max(1, this.maximumEntries)) {
      const candidate = [...this.entries.entries()]
        .filter(([id]) => id !== protectedId)
        .sort((left, right) => left[1].lastUsedAt - right[1].lastUsedAt)[0]
      if (!candidate) return
      this.entries.delete(candidate[0])
    }
  }
}
