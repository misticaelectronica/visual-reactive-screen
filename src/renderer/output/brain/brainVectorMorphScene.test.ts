import { afterEach, describe, expect, it, vi } from 'vitest'
import { createBrainVectorMorphScene, MIN_VECTOR_SHAPES } from './brainVectorMorphScene'

function svgWithPaths(count: number): string {
  const paths = Array.from(
    { length: count },
    (_, index) => `<path fill="#123456" d="M${index * 10} 10 L${index * 10 + 8} 10 L${index * 10 + 4} 20 Z"/>`,
  ).join('')
  return `<svg viewBox="0 0 512 512">${paths}</svg>`
}

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

  it('scarta la scena vettoriale con troppe poche forme rilevate', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:vector-background')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const container = document.createElement('div')
    const raster = new Blob(['raster'])
    const scene = {
      frameId: 'frame-poche-forme',
      description: 'frame',
      svg: svgWithPaths(MIN_VECTOR_SHAPES - 1),
      raster,
    }
    const controller = createBrainVectorMorphScene({
      container,
      scene,
      raster,
      palette: ['#111111', '#eeeeee', '#ff00aa', '#00ffaa', '#ffffff'],
      printMode: 'living-ink',
      getImageSources: () => [],
      getVectorScene: () => Promise.resolve(scene),
      frameEnergy: 0.5,
      frameIndex: 0,
      frameCount: 4,
    })

    await Promise.resolve()
    await Promise.resolve()

    expect(controller.hasFailed?.()).toBe(true)
    expect(controller.isReady?.()).toBe(false)
    controller.destroy()
  })

  it('accetta la scena vettoriale con abbastanza forme rilevate', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:vector-background')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const container = document.createElement('div')
    const raster = new Blob(['raster'])
    const scene = {
      frameId: 'frame-abbastanza-forme',
      description: 'frame',
      svg: svgWithPaths(MIN_VECTOR_SHAPES + 3),
      raster,
    }
    const controller = createBrainVectorMorphScene({
      container,
      scene,
      raster,
      palette: ['#111111', '#eeeeee', '#ff00aa', '#00ffaa', '#ffffff'],
      printMode: 'living-ink',
      getImageSources: () => [],
      getVectorScene: () => Promise.resolve(scene),
      frameEnergy: 0.5,
      frameIndex: 0,
      frameCount: 4,
    })

    await Promise.resolve()
    await Promise.resolve()

    expect(controller.hasFailed?.()).toBe(false)
    expect(controller.isReady?.()).toBe(true)
    controller.destroy()
  })
})
