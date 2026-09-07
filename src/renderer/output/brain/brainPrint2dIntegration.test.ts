import { afterEach, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import { BRAIN_PRINT2D_MODES, createBrainPrint2dScene } from './brainPrint2dCanvas'

vi.mock('./brainLog', () => ({ brainLog: vi.fn(), brainWarn: vi.fn() }))
afterEach(() => vi.unstubAllGlobals())

it.each(BRAIN_PRINT2D_MODES)('%s draws persistent local offsets and releases its canvas', async mode => {
  const context = {
    save: vi.fn(), restore: vi.fn(), translate: vi.fn(), rotate: vi.fn(),
    transform: vi.fn(), scale: vi.fn(), drawImage: vi.fn(), clearRect: vi.fn(),
    putImageData: vi.fn(),
    getImageData: () => ({ data: new Uint8ClampedArray(240 * 135 * 4) }),
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
  vi.stubGlobal('ImageData', class { constructor(public data: Uint8ClampedArray) {} })
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 240, height: 135, close: vi.fn() }))
  const container = document.createElement('div')
  const controller = createBrainPrint2dScene(container,
    { frameId: 'test-region', description: 'print', svg: '' }, new Blob(), ['#112233', '#bbccdd'], mode)
  await vi.waitFor(() => expect(controller.isReady?.()).toBe(true))
  const bands = { low: 0.4, lowMid: 0.3, mid: 0.2, high: 0.1 }
  const rhythm = {
    active: true, beat: false, beatIndex: 0, beatPhase: 0.1, musicalPosition: 0.1,
    beatPulse: 0, kickEnvelope: 0, beatDurationMs: 500,
    bandTransients: { low: 0, lowMid: 0, mid: 0, high: 0 },
  }
  for (let time = 0; time <= 1000; time += 10) controller.update(bands, DEFAULT_SETTINGS, time, rhythm)
  const positions = context.translate.mock.calls.map(args => [...args])
  expect(positions.length).toBeGreaterThan(0)
  expect(positions.some(([x, y]) => Math.abs(x - 240) + Math.abs(y - 135) > 0.01)).toBe(true)
  context.translate.mockClear()
  const silence = { low: 0, lowMid: 0, mid: 0, high: 0 }
  controller.update(silence, DEFAULT_SETTINGS, 1100, { ...rhythm, active: false })
  // No origin reset and no new geometry from the clock advancing in silence:
  // keep the already painted, displaced artwork without a redundant draw.
  controller.update(silence, DEFAULT_SETTINGS, 2100, { ...rhythm, active: false, beatPhase: 0.9 })
  expect(context.translate).not.toHaveBeenCalled()
  controller.destroy()
  expect(container.children.length).toBe(0)
})
