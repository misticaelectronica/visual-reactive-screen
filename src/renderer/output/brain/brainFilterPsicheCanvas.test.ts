import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import type { DreamStory } from '@shared/brain/brainTypes'
import {
  applyFilterPsichePixels,
  calculateFilterPsicheMotion,
  createBrainFilterPsicheScene,
  FILTER_PSICHE_VARIANTS,
  selectFilterPsicheVariant,
  shouldRenderFilterPsicheFrame,
} from './brainFilterPsicheCanvas'

const PALETTE: DreamStory['palette'] = [
  '#100018',
  '#47204f',
  '#a62876',
  '#ef5a4c',
  '#ffe6a6',
]

describe('FilterPsiche', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('produce una trasformazione cromatica distinta per ogni variante', () => {
    const source = new Uint8ClampedArray([
      12, 42, 96, 255,
      220, 154, 64, 255,
    ])
    const signatures = FILTER_PSICHE_VARIANTS.map((variant) =>
      [...applyFilterPsichePixels(source, variant, PALETTE)].join(','),
    )

    expect(new Set(signatures).size).toBe(FILTER_PSICHE_VARIANTS.length)
    expect(signatures.every((signature) => signature.endsWith(',255'))).toBe(true)
  })

  it('seleziona casualmente una variante mantenendola nell’insieme valido', () => {
    expect(selectFilterPsicheVariant(() => 0)).toBe('inverted-pulse')
    expect(selectFilterPsicheVariant(() => 0.999)).toBe('thermal-dream')
    expect(selectFilterPsicheVariant(() => 0, 'inverted-pulse'))
      .toBe('acid-duotone')
  })

  it('rimane geometricamente immobile nel silenzio', () => {
    const motion = calculateFilterPsicheMotion(
      { low: 0, lowMid: 0, mid: 0, high: 0 },
      DEFAULT_SETTINGS,
    )

    expect(motion).toEqual({
      activity: 0,
      beat: 0,
      flash: 0,
      inverseMix: 0,
      alternateMix: 0,
      contrast: 0,
      sliceAmount: 0,
      phaseDirection: 0,
    })
    expect(shouldRenderFilterPsicheFrame(motion, false, false)).toBe(false)
  })

  it('separa kick, alte e flash nei rispettivi trattamenti', () => {
    const motion = calculateFilterPsicheMotion(
      { low: 0.7, lowMid: 0.24, mid: 0.32, high: 0.58 },
      DEFAULT_SETTINGS,
      {
        beat: true,
        beatIndex: 3,
        beatPhase: 0.5,
        musicalPosition: 3.5,
        beatPulse: 1,
        kickEnvelope: 0.9,
        beatDurationMs: 500,
        bandTransients: { low: 0.8, lowMid: 0.3, mid: 0.4, high: 0.75 },
      },
      { low: 0.2, lowMid: 0.18, mid: 0.2, high: 0.21 },
      { active: true, intensity: 0.8 },
    )

    expect(motion.beat).toBeGreaterThan(0.5)
    expect(motion.inverseMix).toBeGreaterThan(0.8)
    expect(motion.alternateMix).toBeGreaterThan(0.65)
    expect(motion.contrast).toBeGreaterThan(0.75)
    expect(motion.sliceAmount).toBeGreaterThan(0.65)
    expect(motion.sliceAmount).toBeLessThan(0.8)
    expect(motion.flash).toBe(0.8)
    expect(motion.phaseDirection).toBeLessThan(0)
  })

  it('mantiene leggibile il fronte del beat anche su un passaggio scarno', () => {
    const motion = calculateFilterPsicheMotion(
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
    expect(motion.inverseMix).toBeGreaterThan(0.2)
  })

  it('non disegna alcuna striscia orizzontale', async () => {
    const drawImage = vi.fn()
    const canvasContext = {
      drawImage,
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      getImageData: () => ({ data: new Uint8ClampedArray(480 * 270 * 4) }),
      createImageData: (width: number, height: number) => ({
        data: new Uint8ClampedArray(width * height * 4),
      }),
      putImageData: vi.fn(),
      set globalCompositeOperation(_value: GlobalCompositeOperation) {},
      set globalAlpha(_value: number) {},
      set filter(_value: string) {},
      set fillStyle(_value: string) {},
    } as unknown as CanvasRenderingContext2D
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext)
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({
      width: 640,
      height: 360,
      close: vi.fn(),
    })))
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:filter-psiche-test')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    const container = document.createElement('div')
    const raster = new Blob(['raster'])
    const controller = createBrainFilterPsicheScene({
      container,
      scene: { frameId: 'frame', description: 'frame', svg: '<svg/>', raster },
      raster,
      palette: PALETTE,
      printMode: 'living-ink',
      getImageSources: () => [],
      getVectorScene: async () => ({ frameId: 'frame', description: 'frame', svg: '<svg/>' }),
      frameEnergy: 0.5,
      frameIndex: 0,
      frameCount: 4,
    })

    controller.update(
      { low: 0.5, lowMid: 0.6, mid: 0.7, high: 1 },
      DEFAULT_SETTINGS,
      1_000,
    )
    await Promise.resolve()
    await Promise.resolve()
    controller.update(
      { low: 0.5, lowMid: 0.6, mid: 0.7, high: 1 },
      DEFAULT_SETTINGS,
      2_000,
    )

    expect(drawImage).toHaveBeenCalled()
    expect(drawImage.mock.calls.every((call) => call.length <= 5)).toBe(true)
    controller.destroy()
  })
})
