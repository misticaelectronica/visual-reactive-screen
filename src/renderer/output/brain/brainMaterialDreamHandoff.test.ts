// Material↔Dream (disposizione Vice Consigliere, brief bidirezionale
// 2026-09-17, consolidato dal PoC 2026-09-14 già collaudato positivamente).
// Verifica che l'handoff del `MaterialField` funzioni in entrambe le
// direzioni sullo stesso raster: Material→Dream arma la trasformazione di
// Dream sul primo fotogramma (osservabile già esistente,
// `dataset.brainDreamTransforming`); Dream→Material fa migrare le regioni
// di Material dalla posizione ricevuta verso la propria geometria reale
// (osservabile nuovo, `dataset.brainMaterialHandoff`).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import { createBrainMaterialMorphScene } from './brainMaterialMorphCanvas'
import { createBrainDreamSegmentationScene } from './brainDreamSegmentationCanvas'
import type { MaterialField } from './brainMaterialAnalysis'

const silentBands = { low: 0, lowMid: 0, mid: 0, high: 0 }

async function flushAsyncPreparation(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await new Promise((resolve) => setTimeout(resolve, 0))
}

function stubCanvasPipeline(): void {
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({
    width: 640,
    height: 360,
    close: vi.fn(),
  })))
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    function (this: HTMLCanvasElement) {
      const createPixels = (width: number, height: number) => {
        const data = new Uint8ClampedArray(width * height * 4)
        for (let offset = 0; offset < data.length; offset += 4) {
          const light = (offset / 4) % width < width / 2
          data[offset] = light ? 220 : 24
          data[offset + 1] = light ? 150 : 32
          data[offset + 2] = light ? 90 : 58
          data[offset + 3] = 255
        }
        return data
      }
      return {
        canvas: this,
        drawImage: vi.fn(),
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        stroke: vi.fn(),
        createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
        createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
        getImageData: (_x: number, _y: number, width: number, height: number) => ({
          data: createPixels(width, height),
        }),
        createImageData: (width: number, height: number) => ({
          data: new Uint8ClampedArray(width * height * 4),
        }),
        putImageData: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        fillStyle: '#000000',
        strokeStyle: '#000000',
        lineWidth: 1,
      } as unknown as CanvasRenderingContext2D
    },
  )
}

describe('Material↔Dream — handoff bidirezionale del MaterialField', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('Material → Dream: senza handoff, Dream riparte flat dal raster', async () => {
    stubCanvasPipeline()
    const raster = new Blob(['stesso-raster-a'])
    const scene = { frameId: 'frame-a', description: 'scena', svg: '<svg/>', raster }
    const dream = createBrainDreamSegmentationScene({
      container: document.createElement('div'),
      scene,
      raster,
      palette: ['#160b18', '#4a2438', '#8d4c4e', '#dc8f5a', '#f0d7b0'],
      printMode: 'living-ink',
      getImageSources: () => [{
        id: 'story:frame-a',
        role: 'current',
        scene,
        raster,
        narrativeHints: ['scena'],
      }],
      getVectorScene: async () => scene,
      frameEnergy: 0.5,
      frameIndex: 0,
      frameCount: 4,
    })

    dream.update(silentBands, DEFAULT_SETTINGS, 1_000)
    await flushAsyncPreparation()
    dream.update(silentBands, DEFAULT_SETTINGS, 1_016)

    expect(dream.element.dataset.brainDreamSegmentation).toBe('ready')
    expect(dream.element.dataset.brainDreamTransforming).toBe('false')
    dream.destroy()
  })

  it('Material → Dream: con il MaterialField di Material-Morph, Dream arma la trasformazione già sul primo fotogramma', async () => {
    stubCanvasPipeline()
    const raster = new Blob(['stesso-raster-b'])
    const scene = { frameId: 'frame-b', description: 'scena', svg: '<svg/>', raster }
    const imageSources = () => [{
      id: 'story:frame-b',
      role: 'current' as const,
      scene,
      raster,
      narrativeHints: ['scena'],
    }]

    const material = createBrainMaterialMorphScene({
      container: document.createElement('div'),
      scene,
      raster,
      palette: ['#160b18', '#4a2438', '#8d4c4e', '#dc8f5a', '#f0d7b0'],
      printMode: 'living-ink',
      getImageSources: imageSources,
      getVectorScene: async () => scene,
      frameEnergy: 0.5,
      frameIndex: 0,
      frameCount: 4,
    })
    material.update(silentBands, DEFAULT_SETTINGS, 1_000)
    await flushAsyncPreparation()

    const handoffField = material.exportHandoff?.() as MaterialField | undefined
    expect(handoffField).toBeDefined()
    expect(handoffField!.regions.length).toBeGreaterThan(0)
    material.destroy()

    const dream = createBrainDreamSegmentationScene({
      container: document.createElement('div'),
      scene,
      raster,
      palette: ['#160b18', '#4a2438', '#8d4c4e', '#dc8f5a', '#f0d7b0'],
      printMode: 'living-ink',
      getImageSources: imageSources,
      getVectorScene: async () => scene,
      frameEnergy: 0.5,
      frameIndex: 0,
      frameCount: 4,
      materialFieldHandoff: handoffField,
    })
    dream.update(silentBands, DEFAULT_SETTINGS, 1_000)
    await flushAsyncPreparation()
    dream.update(silentBands, DEFAULT_SETTINGS, 1_016)

    expect(dream.element.dataset.brainDreamSegmentation).toBe('ready')
    expect(dream.element.dataset.brainDreamTransforming).toBe('true')
    dream.destroy()
  })

  it('Dream → Material: senza handoff, Material non marca alcuna migrazione', async () => {
    stubCanvasPipeline()
    const raster = new Blob(['stesso-raster-c'])
    const scene = { frameId: 'frame-c', description: 'scena', svg: '<svg/>', raster }
    const material = createBrainMaterialMorphScene({
      container: document.createElement('div'),
      scene,
      raster,
      palette: ['#160b18', '#4a2438', '#8d4c4e', '#dc8f5a', '#f0d7b0'],
      printMode: 'living-ink',
      getImageSources: () => [{
        id: 'story:frame-c',
        role: 'current',
        scene,
        raster,
        narrativeHints: ['scena'],
      }],
      getVectorScene: async () => scene,
      frameEnergy: 0.5,
      frameIndex: 0,
      frameCount: 4,
    })

    material.update(silentBands, DEFAULT_SETTINGS, 1_000)
    await flushAsyncPreparation()
    material.update(silentBands, DEFAULT_SETTINGS, 1_016)

    expect(material.element.dataset.brainMaterialHandoff).toBeUndefined()
    material.destroy()
  })

  it('Dream → Material: con il MaterialField di Dream, Material arma la migrazione delle regioni e la esaurisce nel tempo previsto', async () => {
    stubCanvasPipeline()
    const raster = new Blob(['stesso-raster-d'])
    const scene = { frameId: 'frame-d', description: 'scena', svg: '<svg/>', raster }
    const imageSources = () => [{
      id: 'story:frame-d',
      role: 'current' as const,
      scene,
      raster,
      narrativeHints: ['scena'],
    }]

    const dream = createBrainDreamSegmentationScene({
      container: document.createElement('div'),
      scene,
      raster,
      palette: ['#160b18', '#4a2438', '#8d4c4e', '#dc8f5a', '#f0d7b0'],
      printMode: 'living-ink',
      getImageSources: imageSources,
      getVectorScene: async () => scene,
      frameEnergy: 0.5,
      frameIndex: 0,
      frameCount: 4,
    })
    dream.update(silentBands, DEFAULT_SETTINGS, 1_000)
    await flushAsyncPreparation()

    const handoffField = dream.exportHandoff?.() as MaterialField | undefined
    expect(handoffField).toBeDefined()
    expect(handoffField!.regions.length).toBeGreaterThan(0)
    dream.destroy()

    const material = createBrainMaterialMorphScene({
      container: document.createElement('div'),
      scene,
      raster,
      palette: ['#160b18', '#4a2438', '#8d4c4e', '#dc8f5a', '#f0d7b0'],
      printMode: 'living-ink',
      getImageSources: imageSources,
      getVectorScene: async () => scene,
      frameEnergy: 0.5,
      frameIndex: 0,
      frameCount: 4,
      materialFieldHandoff: handoffField,
    })
    // Bande leggermente attive: forza il render a ogni chiamata
    // indipendentemente dal gate di stabilità della firma (motion invariata
    // = nessun nuovo render), cosi' possiamo osservare l'esaurimento nel
    // tempo dell'interpolazione senza dipendere da quel dettaglio interno.
    const activeBands = { low: 0.05, lowMid: 0.05, mid: 0.05, high: 0.05 }
    material.update(activeBands, DEFAULT_SETTINGS, 1_000)
    await flushAsyncPreparation()
    material.update(activeBands, DEFAULT_SETTINGS, 1_016)
    expect(material.element.dataset.brainMaterialHandoff).toBe('active')

    // Oltre la durata prevista dell'interpolazione, la migrazione si esaurisce.
    material.update(activeBands, DEFAULT_SETTINGS, 1_016 + 2_000)
    expect(material.element.dataset.brainMaterialHandoff).toBe('done')
    material.destroy()
  })
})
