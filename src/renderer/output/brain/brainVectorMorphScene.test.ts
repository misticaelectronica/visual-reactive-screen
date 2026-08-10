import { afterEach, describe, expect, it, vi } from 'vitest'
import { createBrainVectorMorphScene } from './brainVectorMorphScene'

describe('Brain Vector Morph scene', () => {
  afterEach(() => vi.restoreAllMocks())

  it('mantiene la raster originale ben visibile sotto il vettoriale', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:vector-background')
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const container = document.createElement('div')
    const raster = new Blob(['raster'])
    const controller = createBrainVectorMorphScene({
      container,
      scene: { frameId: 'frame', description: 'frame', svg: '<svg/>', raster },
      raster,
      palette: ['#111111', '#eeeeee', '#ff00aa', '#00ffaa', '#ffffff'],
      printMode: 'living-ink',
      getImageSources: () => [],
      getVectorScene: () => new Promise(() => {}),
      frameEnergy: 0.5,
      frameIndex: 0,
      frameCount: 4,
    })

    const background = container.querySelector<HTMLImageElement>(
      '[data-brain-vector-raster-background="true"]',
    )
    const foreground = container.querySelector<HTMLDivElement>(
      '[data-brain-vector-foreground="true"]',
    )
    expect(background?.src).toContain('blob:vector-background')
    expect(Number(background?.style.opacity)).toBeGreaterThanOrEqual(0.9)
    expect(Number(foreground?.style.opacity)).toBeLessThanOrEqual(0.72)

    controller.destroy()
    expect(revoke).toHaveBeenCalledWith('blob:vector-background')
  })
})
