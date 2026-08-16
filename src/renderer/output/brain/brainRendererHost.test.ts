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

  it('usa il vero Print2D serigrafico durante il denoising e poi riprende il renderer pieno', () => {
    const registry = new BrainRendererRegistry()
    const updates: number[] = []
    const pressureCalls: boolean[][] = []
    registry.register({
      id: 'print2d',
      label: 'Print2D',
      capabilities: {
        multipleImages: false,
        semanticMetadata: false,
        lowPowerMode: true,
      },
      create(context) {
        const instance = updates.length
        updates.push(0)
        pressureCalls.push([])
        const element = document.createElement('div')
        element.dataset.print2dInstance = String(instance)
        context.container.appendChild(element)
        return {
          element,
          isReady: () => true,
          setOpacity() {},
          getMorphShapes: () => [],
          setMorphPattern() {},
          setResourcePressure(active) {
            pressureCalls[instance].push(active)
          },
          setTransition() {},
          update() {
            updates[instance] += 1
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
    expect(updates).toEqual([1, 0])
    expect(pressureCalls[1]).toContain(true)
    expect(container.querySelector('[data-brain-denoising-print2d="true"]')).not.toBeNull()

    host.setOfflineHold?.(true)
    host.update({ low: 1, lowMid: 1, mid: 1, high: 1 }, DEFAULT_SETTINGS, 2_000)
    expect(updates).toEqual([2, 1])
    expect(host.element.dataset.brainOfflineHold).toBe('active')
    expect(host.element.dataset.brainDenoisingPrint2d).toBe('entering')

    host.update({ low: 1, lowMid: 1, mid: 1, high: 1 }, DEFAULT_SETTINGS, 10_000)
    host.update({ low: 1, lowMid: 1, mid: 1, high: 1 }, DEFAULT_SETTINGS, 10_100)
    expect(updates).toEqual([3, 3])
    expect(host.element.dataset.brainDenoisingPrint2d).toBe('active')

    host.setOfflineHold?.(false)
    host.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 11_000)
    expect(updates).toEqual([4, 4])
    expect(host.element.dataset.brainOfflineHold).toBe('idle')
    expect(host.element.dataset.brainDenoisingPrint2d).toBe('exiting')
    host.destroy()
  })

  it('inoltra audio e flash al Print2D leggero senza aggiornare continuamente il renderer pieno', () => {
    const registry = new BrainRendererRegistry()
    const received: Array<Array<{ low: number; flash: number }>> = []
    registry.register({
      id: 'print2d',
      label: 'Print2D',
      capabilities: {
        multipleImages: false,
        semanticMetadata: false,
        lowPowerMode: true,
      },
      create(context) {
        const instance = received.length
        received.push([])
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
          update(bands, _settings, _time, _rhythm, _movingAverages, flash) {
            received[instance].push({
              low: bands.low,
              flash: flash?.intensity ?? 0,
            })
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
    host.setOfflineHold?.(true)
    host.update(
      { low: 0.72, lowMid: 0.3, mid: 0.2, high: 0.1 },
      DEFAULT_SETTINGS,
      2_000,
      undefined,
      undefined,
      { active: true, intensity: 0.64 },
    )
    host.update(
      { low: 0.38, lowMid: 0.2, mid: 0.1, high: 0.05 },
      DEFAULT_SETTINGS,
      10_000,
      undefined,
      undefined,
      { active: false, intensity: 0.12 },
    )
    host.update(
      { low: 0.24, lowMid: 0.1, mid: 0.05, high: 0.02 },
      DEFAULT_SETTINGS,
      10_100,
    )

    expect(received[1]).toEqual([
      { low: 0.72, flash: 0.64 },
      { low: 0.38, flash: 0.12 },
      { low: 0.24, flash: 0 },
    ])
    expect(received[0]).toHaveLength(2)
    host.destroy()
  })
})
