import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import type { BrainRendererId } from '@shared/types'
import { BrainRendererRegistry } from './brainRendererPlugin'
import { createBrainRendererHost } from './brainRendererHost'

describe('Brain renderer host', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
  it('mantiene il renderer corrente finché quello entrante è pronto', () => {
    const registry = new BrainRendererRegistry()
    const destroyed: BrainRendererId[] = []
    let psychoReady = false
    for (const id of ['print2d', 'psycho2d'] as const) {
      registry.register({
        id,
        label: id,
        capabilities: {
          multipleImages: id === 'psycho2d',
          semanticMetadata: id === 'psycho2d',
          lowPowerMode: true,
        },
        create(context) {
          const element = document.createElement('div')
          element.dataset.fakeRenderer = id
          context.container.appendChild(element)
          return {
            element,
            isReady: () => id === 'print2d' || psychoReady,
            setOpacity() {},
            getMorphShapes: () => [],
            setMorphPattern() {},
            setResourcePressure() {},
            setTransition() {},
            update() {},
            destroy() {
              destroyed.push(id)
              element.remove()
            },
          }
        },
      })
    }

    let requested: BrainRendererId = 'print2d'
    const container = document.createElement('div')
    const raster = new Blob(['raster'])
    const host = createBrainRendererHost(
      container,
      registry,
      {
        scene: { frameId: 'frame', description: 'frame', svg: '<svg/>', raster },
        raster,
        palette: ['#000000', '#333333', '#666666', '#aaaaaa', '#ffffff'],
        printMode: 'living-ink',
        getImageSources: () => [],
        getVectorScene: async () => ({
          frameId: 'frame',
          description: 'frame',
          svg: '<svg/>',
        }),
        frameEnergy: 0.5,
        frameIndex: 0,
        frameCount: 4,
      },
      () => requested,
      'print2d',
    )
    host.setTransition(1, 'enter')
    host.update(
      { low: 0, lowMid: 0, mid: 0, high: 0 },
      DEFAULT_SETTINGS,
      1_000,
    )
    requested = 'psycho2d'
    host.update(
      { low: 0, lowMid: 0, mid: 0, high: 0 },
      DEFAULT_SETTINGS,
      2_000,
    )
    expect(destroyed).toEqual([])

    psychoReady = true
    host.update(
      { low: 0, lowMid: 0, mid: 0, high: 0 },
      DEFAULT_SETTINGS,
      3_000,
    )
    host.update(
      { low: 0, lowMid: 0, mid: 0, high: 0 },
      DEFAULT_SETTINGS,
      4_800,
    )
    expect(destroyed).toContain('print2d')
    expect(container.querySelector('[data-fake-renderer="psycho2d"]')).not.toBeNull()
    host.destroy()
    expect(destroyed).toContain('psycho2d')
  })

  it('propaga il flash globale ai renderer attivo ed entrante', () => {
    const registry = new BrainRendererRegistry()
    const receivedFlash = new Map<BrainRendererId, number[]>()
    for (const id of ['print2d', 'psycho2d'] as const) {
      receivedFlash.set(id, [])
      registry.register({
        id,
        label: id,
        capabilities: {
          multipleImages: id === 'psycho2d',
          semanticMetadata: id === 'psycho2d',
          lowPowerMode: true,
        },
        create(context) {
          const element = document.createElement('div')
          context.container.appendChild(element)
          return {
            element,
            isReady: () => true,
            setOpacity() {},
            getMorphShapes: () => [],
            setMorphPattern() {},
            setResourcePressure() {},
            setTransition() {},
            update(_bands, _settings, _time, _rhythm, _movingAverages, flash) {
              receivedFlash.get(id)?.push(flash?.intensity ?? 0)
            },
            destroy() {
              element.remove()
            },
          }
        },
      })
    }

    let requested: BrainRendererId = 'print2d'
    const container = document.createElement('div')
    const raster = new Blob(['raster'])
    const host = createBrainRendererHost(
      container,
      registry,
      {
        scene: { frameId: 'frame', description: 'frame', svg: '<svg/>', raster },
        raster,
        palette: ['#000000', '#333333', '#666666', '#aaaaaa', '#ffffff'],
        printMode: 'living-ink',
        getImageSources: () => [],
        getVectorScene: async () => ({ frameId: 'frame', description: 'frame', svg: '<svg/>' }),
        frameEnergy: 0.5,
        frameIndex: 0,
        frameCount: 4,
      },
      () => requested,
      'print2d',
    )
    host.setTransition(1, 'enter')
    requested = 'psycho2d'
    host.update(
      { low: 0, lowMid: 0, mid: 0, high: 0 },
      DEFAULT_SETTINGS,
      1_000,
      undefined,
      undefined,
      { active: true, intensity: 0.68 },
    )

    expect(receivedFlash.get('print2d')).toEqual([0.68])
    expect(receivedFlash.get('psycho2d')).toEqual([0.68])
    host.destroy()
  })

  it('mantiene dinamico il plugin durante la generazione se il passthrough non è pronto', () => {
    const registry = new BrainRendererRegistry()
    let updates = 0
    registry.register({
      id: 'print2d',
      label: 'Print2D',
      capabilities: {
        multipleImages: false,
        semanticMetadata: false,
        lowPowerMode: true,
      },
      create(context) {
        const element = document.createElement('div')
        context.container.appendChild(element)
        return {
          element,
          isReady: () => true,
          setOpacity() {},
          getMorphShapes: () => [],
          setMorphPattern() {},
          setResourcePressure() {},
          setTransition() {},
          update() {
            updates += 1
          },
          destroy() {
            element.remove()
          },
        }
      },
    })
    const container = document.createElement('div')
    const raster = new Blob(['raster'])
    const host = createBrainRendererHost(
      container,
      registry,
      {
        scene: { frameId: 'frame', description: 'frame', svg: '<svg/>', raster },
        raster,
        palette: ['#000000', '#333333', '#666666', '#aaaaaa', '#ffffff'],
        printMode: 'living-ink',
        getImageSources: () => [],
        getVectorScene: async () => ({ frameId: 'frame', description: 'frame', svg: '<svg/>' }),
        frameEnergy: 0.5,
        frameIndex: 0,
        frameCount: 4,
      },
      () => 'print2d',
      'print2d',
    )

    host.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 1_000)
    host.setOfflineHold?.(true)
    host.update({ low: 1, lowMid: 1, mid: 1, high: 1 }, DEFAULT_SETTINGS, 2_000)
    expect(updates).toBe(2)
    expect(host.element.dataset.brainOfflineHold).toBe('active')

    host.setOfflineHold?.(false)
    host.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 3_000)
    expect(updates).toBe(3)
    expect(host.element.dataset.brainOfflineHold).toBe('idle')
    host.destroy()
  })

  it('rallenta il plugin durante il passthrough e lo riprende sul clock corrente', async () => {
    const drawImage = vi.fn()
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({
      width: 640,
      height: 360,
      close: vi.fn(),
    })))
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: () => ({
        data: new Uint8ClampedArray(320 * 180 * 4),
      }),
      createImageData: (width: number, height: number) => ({
        data: new Uint8ClampedArray(width * height * 4),
      }),
      putImageData: vi.fn(),
      set fillStyle(_value: string) {},
      set globalAlpha(_value: number) {},
      set globalCompositeOperation(_value: GlobalCompositeOperation) {},
    } as unknown as CanvasRenderingContext2D)

    const registry = new BrainRendererRegistry()
    let pluginUpdates = 0
    registry.register({
      id: 'print2d',
      label: 'Print2D',
      capabilities: {
        multipleImages: false,
        semanticMetadata: false,
        lowPowerMode: true,
      },
      create(context) {
        const element = document.createElement('div')
        context.container.appendChild(element)
        return {
          element,
          isReady: () => true,
          setOpacity() {},
          getMorphShapes: () => [],
          setMorphPattern() {},
          setResourcePressure() {},
          setTransition() {},
          update() {
            pluginUpdates += 1
          },
          destroy() {
            element.remove()
          },
        }
      },
    })
    const container = document.createElement('div')
    const raster = new Blob(['raster'])
    const host = createBrainRendererHost(
      container,
      registry,
      {
        scene: { frameId: 'frame', description: 'frame', svg: '<svg/>', raster },
        raster,
        palette: ['#000000', '#333333', '#666666', '#aaaaaa', '#ffffff'],
        printMode: 'living-ink',
        getImageSources: () => [],
        getVectorScene: async () => ({ frameId: 'frame', description: 'frame', svg: '<svg/>' }),
        frameEnergy: 0.5,
        frameIndex: 0,
        frameCount: 4,
      },
      () => 'print2d',
      'print2d',
    )
    await Promise.resolve()
    await Promise.resolve()
    host.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 1_000)
    expect(pluginUpdates).toBe(1)
    host.setResourcePressure(true)
    host.update({ low: 0.5, lowMid: 0.3, mid: 0.2, high: 0.1 }, DEFAULT_SETTINGS, 2_000)
    expect(pluginUpdates).toBe(2)
    expect(drawImage).toHaveBeenCalled()
    expect(container.querySelector('[data-brain-denoising-passthrough="true"]')).not.toBeNull()
    host.update({ low: 0.5, lowMid: 0.3, mid: 0.2, high: 0.1 }, DEFAULT_SETTINGS, 2_100)
    expect(pluginUpdates).toBe(2)

    host.setResourcePressure(false)
    host.update({ low: 0.5, lowMid: 0.3, mid: 0.2, high: 0.1 }, DEFAULT_SETTINGS, 2_300)
    expect(pluginUpdates).toBe(3)

    host.setOfflineHold?.(true)
    host.update({ low: 0.5, lowMid: 0.3, mid: 0.2, high: 0.1 }, DEFAULT_SETTINGS, 2_500)
    expect(pluginUpdates).toBe(4)
    host.update({ low: 0.5, lowMid: 0.3, mid: 0.2, high: 0.1 }, DEFAULT_SETTINGS, 2_600)
    expect(pluginUpdates).toBe(4)
    expect(host.element.dataset.brainOfflineHold).toBe('active')
    host.setOfflineHold?.(false)
    host.destroy()
  })
})
