import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import type { BrainRhythmState } from './brainRhythm'
import {
  calculateBrainMaterialMotion,
  createBrainMaterialMorphScene,
  materialGeometryScaleForRegime,
  shouldRenderBrainMaterialFrame,
} from './brainMaterialMorphCanvas'

const silentRhythm: BrainRhythmState = {
  beat: false,
  beatIndex: 0,
  beatPhase: 0,
  musicalPosition: 0,
  beatPulse: 0,
  kickEnvelope: 0,
  beatDurationMs: 500,
  bandTransients: { low: 0, lowMid: 0, mid: 0, high: 0 },
}

describe('Materia Morph motion', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('calma il moto locale in decompressione e ancora di più nel respiro profondo', () => {
    const normal = materialGeometryScaleForRegime('pressurized')
    const decompression = materialGeometryScaleForRegime('decompression')
    const deepBreath = materialGeometryScaleForRegime('respiro-profondo')
    expect(normal).toBe(1)
    expect(decompression).toBeLessThan(normal)
    expect(deepBreath).toBeLessThan(decompression)
  })

  it('resta geometricamente immobile in silenzio', () => {
    const motion = calculateBrainMaterialMotion(
      { low: 0, lowMid: 0, mid: 0, high: 0 },
      DEFAULT_SETTINGS,
      silentRhythm,
    )
    expect(motion).toEqual({
      activity: 0,
      pressure: 0,
      fusion: 0,
      structure: 0,
      grain: 0,
      beat: 0,
      flash: 0,
      phaseX: 0,
      phaseY: 0,
    })
    expect(shouldRenderBrainMaterialFrame(motion, false, false)).toBe(false)
  })

  it('assegna funzioni distinte alle quattro bande', () => {
    const low = calculateBrainMaterialMotion(
      { low: 0.7, lowMid: 0, mid: 0, high: 0 },
      DEFAULT_SETTINGS,
      silentRhythm,
    )
    const lowMid = calculateBrainMaterialMotion(
      { low: 0, lowMid: 0.7, mid: 0, high: 0 },
      DEFAULT_SETTINGS,
      silentRhythm,
    )
    const mid = calculateBrainMaterialMotion(
      { low: 0, lowMid: 0, mid: 0.7, high: 0 },
      DEFAULT_SETTINGS,
      silentRhythm,
    )
    const high = calculateBrainMaterialMotion(
      { low: 0, lowMid: 0, mid: 0, high: 0.7 },
      DEFAULT_SETTINGS,
      silentRhythm,
    )
    expect(low.pressure).toBeGreaterThan(low.fusion)
    expect(lowMid.fusion).toBeGreaterThan(lowMid.structure)
    expect(mid.structure).toBeGreaterThan(mid.grain)
    expect(high.grain).toBeGreaterThan(high.pressure)
    expect(high.grain).toBeLessThan(0.6)
  })

  it('trasforma il flash globale in accento locale senza inventare un beat', () => {
    const motion = calculateBrainMaterialMotion(
      { low: 0, lowMid: 0, mid: 0, high: 0 },
      DEFAULT_SETTINGS,
      silentRhythm,
      undefined,
      { active: true, intensity: 0.75 },
    )
    expect(motion.flash).toBe(0.75)
    expect(motion.activity).toBeGreaterThan(0)
    expect(motion.beat).toBe(0)
  })

  it('mantiene leggibile il fronte del beat anche su materia poco energica', () => {
    const motion = calculateBrainMaterialMotion(
      { low: 0.08, lowMid: 0.025, mid: 0.01, high: 0.005 },
      DEFAULT_SETTINGS,
      {
        active: true,
        beat: true,
        beatIndex: 4,
        beatPhase: 0,
        musicalPosition: 4,
        beatPulse: 1,
        kickEnvelope: 1,
        beatDurationMs: 500,
        bandTransients: { low: 0.7, lowMid: 0.1, mid: 0, high: 0 },
      },
      { low: 0.07, lowMid: 0.024, mid: 0.01, high: 0.005 },
    )

    expect(motion.beat).toBeGreaterThanOrEqual(0.3)
    expect(motion.pressure).toBeGreaterThan(0.2)
  })

  it('prepara il budget low power e riceve pressione risorse e flash', async () => {
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
          globalAlpha: 1,
          globalCompositeOperation: 'source-over',
        } as unknown as CanvasRenderingContext2D
      },
    )
    const raster = new Blob(['material'])
    const scene = { frameId: 'material-frame', description: 'materia', svg: '<svg/>', raster }
    const container = document.createElement('div')
    const controller = createBrainMaterialMorphScene({
      container,
      scene,
      raster,
      palette: ['#160b18', '#4a2438', '#8d4c4e', '#dc8f5a', '#f0d7b0'],
      printMode: 'living-ink',
      getImageSources: () => [{
        id: 'story:material-frame',
        role: 'current',
        scene,
        raster,
        narrativeHints: ['materia'],
      }],
      getVectorScene: async () => scene,
      frameEnergy: 0.5,
      frameIndex: 0,
      frameCount: 4,
    })
    controller.update(
      { low: 0, lowMid: 0, mid: 0, high: 0 },
      { ...DEFAULT_SETTINGS, lowPowerMode: true },
      1_000,
    )
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(controller.isReady?.()).toBe(true)
    expect((controller.element as HTMLCanvasElement).width).toBe(240)

    controller.setResourcePressure(true)
    controller.update(
      { low: 0, lowMid: 0, mid: 0, high: 0 },
      { ...DEFAULT_SETTINGS, lowPowerMode: true },
      2_000,
      silentRhythm,
      undefined,
      { active: true, intensity: 0.7 },
    )
    expect(controller.element.dataset.brainResourcePressure).toBe('true')
    expect(controller.element.dataset.brainMaterialFlash).toBe('0.700')
    controller.destroy()
    expect(container.contains(controller.element)).toBe(false)
  })
})
