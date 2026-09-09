import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import { advancePsicoFantasmaStage, createBrainPsicoFantasmaScene, featherMask, figureProgress,
  isPsicoFantasmaHesitation, pickPsicoFantasmaVariant, psicoFantasmaCompletion,
  psicoFantasmaTiming, PSICOFANTASMA_THRESHOLDS, RESIDENT_PRESENCE } from './brainPsicoFantasmaCanvas'
import { extractPsicoFantasmaRegions } from './psicofantasma/analysis'
import * as recognition from './psicofantasma/recognition'
import type { Silhouette } from './psicofantasma/repertoire'

const recognized = {
  recognized: true,
  archetype: 'bird',
  candidateId: 'bird-open',
  affinity: 0.8,
  margin: 0.2,
  structuralCoherence: 0.8,
  observedMs: 2_000,
  reason: 'recognized' as const,
}

describe('PsicoFantasma visual metabolism', () => {
  it('freezes every stage in silence', () => {
    const timing = psicoFantasmaTiming('pressurized')
    for (const stage of ['emergence', 'observation', 'attraction', 'memory', 'retreat', 'settled'] as const) {
      expect(advancePsicoFantasmaStage(stage, 321, 10_000, false, timing, recognized))
        .toEqual({ stage, elapsed: 321 })
    }
  })

  it('does not restart recognition after retreat, even over many audio cycles', () => {
    const timing = psicoFantasmaTiming('pressurized')
    const end = advancePsicoFantasmaStage('retreat', 10_000, 100, true, timing, recognized)
    expect(end.stage).toBe('settled')
    expect(advancePsicoFantasmaStage(end.stage, end.elapsed, 90_000, true, timing, recognized)).toEqual(end)
  })

  it('keeps emergence and observation separate before attraction', () => {
    const timing = psicoFantasmaTiming('pressurized')
    expect(advancePsicoFantasmaStage('emergence', timing.emergenceMs - 1, 1, true, timing, null).stage)
      .toBe('observation')
    expect(advancePsicoFantasmaStage('observation', PSICOFANTASMA_THRESHOLDS.persistenceMs - 1,
      1, true, timing, recognized).stage).toBe('attraction')
  })

  it('sends rejected candidates to a quiet retreat', () => {
    const timing = psicoFantasmaTiming('decompression')
    const rejected = { ...recognized, recognized: false, archetype: null, reason: 'margin' as const }
    expect(advancePsicoFantasmaStage('observation', 2_000, 1, true, timing, rejected).stage)
      .toBe('retreat')
  })

  it('uses one to three figures by regime and normally stops below completion', () => {
    expect(psicoFantasmaTiming('respiro-profondo').maxFigures).toBe(1)
    expect(psicoFantasmaTiming('pressurized').maxFigures).toBe(2)
    expect(psicoFantasmaTiming('respiro-alto').maxFigures).toBe(3)
    expect(psicoFantasmaCompletion(0.8)).toBeLessThanOrEqual(0.72)
    expect(psicoFantasmaCompletion(0.95)).toBe(0.92)
  })

  it('never lets a region stop being highlighted while the renderer persists', () => {
    const timing = psicoFantasmaTiming('respiro-profondo')
    const rejected = { ...recognized, recognized: false, archetype: null, reason: 'margin' as const }
    const settledRejected = figureProgress(
      { stage: 'settled', elapsed: 9_999, completion: 0, decision: rejected } as never, timing)
    expect(settledRejected.opacity).toBeGreaterThanOrEqual(RESIDENT_PRESENCE)
    const deepRetreat = figureProgress(
      { stage: 'retreat', elapsed: 9_999, completion: 0, decision: rejected } as never, timing)
    expect(deepRetreat.opacity).toBeGreaterThanOrEqual(RESIDENT_PRESENCE)
    const settledRecognised = figureProgress(
      { stage: 'settled', elapsed: 9_999, completion: 0.7, decision: recognized } as never, timing)
    expect(settledRecognised.opacity).toBeGreaterThan(settledRejected.opacity)
  })

  it('sfuma i bordi della selezione: cuore pieno, fascia di bordo graduata', () => {
    const w = 24, h = 24
    const mask = new Uint8Array(w * h)
    for (let y = 6; y < 18; y++) for (let x = 6; x < 18; x++) mask[y * w + x] = 255
    const feather = featherMask(mask, w, h)
    // cuore ancora pieno
    expect(feather[12 * w + 12]).toBeGreaterThan(240)
    // sul bordo geometrico: valore intermedio, non 0 né 255
    const edge = feather[12 * w + 17]
    expect(edge).toBeGreaterThan(0)
    expect(edge).toBeLessThan(255)
    // appena fuori dalla massa netta: alpha residua > 0 (alone morbido)
    expect(feather[12 * w + 19]).toBeGreaterThan(0)
    // lontano: ancora sfondo
    expect(feather[12 * w + 23]).toBe(0)
  })

  it('selects stable variants and admits only a narrow failed match as hesitation', () => {
    expect(pickPsicoFantasmaVariant('frame-a')).toBe(pickPsicoFantasmaVariant('frame-a'))
    expect(isPsicoFantasmaHesitation({ ...recognized, recognized: false, archetype: null,
      affinity: 0.65, reason: 'affinity' })).toBe(true)
    expect(isPsicoFantasmaHesitation({ ...recognized, recognized: false, archetype: null,
      affinity: 0.2, reason: 'affinity' })).toBe(false)
  })
})

describe('PsicoFantasma private raster analysis', () => {
  it('rejects an invalid image and does not invent a region on a flat raster', () => {
    expect(() => extractPsicoFantasmaRegions(new Uint8ClampedArray(3), 10, 10, 1)).toThrow()
    const flat = new Uint8ClampedArray(64 * 36 * 4).fill(128)
    for (let i = 3; i < flat.length; i += 4) flat[i] = 255
    expect(extractPsicoFantasmaRegions(flat, 64, 36, 3)).toEqual([])
  })

  it('estrae comunque una regione da un primo piano texturato che riempie quasi tutto il frame', () => {
    const width = 240, height = 135
    const rgba = new Uint8ClampedArray(width * height * 4).fill(18)
    for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255
    // massa ~85% del frame, con dettaglio interno che attiva quasi ogni cella:
    // prima l'intero componente superava il tetto 0.68 → nessuna regione.
    for (let y = 6; y < height - 6; y++) for (let x = 16; x < width - 16; x++) {
      const offset = (y * width + x) * 4
      const detail = ((x * 7 + y * 13) % 37) * 3
      rgba[offset] = rgba[offset + 1] = rgba[offset + 2] = 150 + detail
    }
    const regions = extractPsicoFantasmaRegions(rgba, width, height, 3)
    expect(regions.length).toBeGreaterThanOrEqual(1)
    expect(regions[0].mask.some(value => value === 255)).toBe(true)
  })

  it('extracts at most the requested coherent masses with a pixel mask and contour', () => {
    const width = 128, height = 72
    const rgba = new Uint8ClampedArray(width * height * 4).fill(20)
    for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255
    for (let y = 16; y < 58; y++) for (let x = 28; x < 92; x++) {
      const offset = (y * width + x) * 4
      rgba[offset] = rgba[offset + 1] = rgba[offset + 2] = 230
    }
    const regions = extractPsicoFantasmaRegions(rgba, width, height, 1)
    expect(regions).toHaveLength(1)
    expect(regions[0].mask.some(value => value === 255)).toBe(true)
    // A near-rectangular mass simplifies to a few points; that is correct.
    expect(regions[0].contour.length).toBeGreaterThanOrEqual(4)
    expect(regions[0].contour.every(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1)).toBe(true)
  })

  it('resolves the recognition zone at pixel resolution, not the detection grid', () => {
    const width = 240, height = 135
    const rgba = new Uint8ClampedArray(width * height * 4).fill(24)
    for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255
    const cx = width / 2, cy = height / 2, rx = width * 0.3, ry = height * 0.32
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1) continue
      const offset = (y * width + x) * 4
      rgba[offset] = rgba[offset + 1] = rgba[offset + 2] = 232
    }
    const [region] = extractPsicoFantasmaRegions(rgba, width, height, 1)
    expect(region).toBeDefined()
    // The zone must follow the real ellipse, not the 64x36 detection grid.
    // Measure each row half-width and compare with the analytic ellipse: a
    // grid-quantised mask (~7.5 px cells) lands far off; a pixel-resolved,
    // smoothed one tracks it within a couple of pixels.
    let samples = 0, absError = 0
    const distinctWidths = new Set<number>()
    for (let y = 0; y < region.height; y++) {
      let left = region.width, right = -1
      for (let x = 0; x < region.width; x++) {
        if (region.mask[y * region.width + x] > 127) { left = Math.min(left, x); right = x }
      }
      if (right < left) continue
      distinctWidths.add(right - left + 1)
      const imageY = region.y + y + 0.5
      const inside = 1 - ((imageY - cy) / ry) ** 2
      if (inside <= 0.04) continue
      const expectedHalf = rx * Math.sqrt(inside)
      absError += Math.abs((right - left + 1) / 2 - expectedHalf)
      samples++
    }
    expect(samples).toBeGreaterThan(20)
    expect(absError / samples).toBeLessThan(3)
    expect(distinctWidths.size).toBeGreaterThan(15)
    expect(region.contour.length).toBeGreaterThanOrEqual(16)
  })
})

describe('PsicoFantasma controller integration', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('prepares once, advances through real update calls and cleans up', async () => {
    vi.stubGlobal('__PSICOFANTASMA_AVAILABLE__', true)
    const width = 480, height = 270
    const rgba = new Uint8ClampedArray(width * height * 4).fill(20)
    for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255
    for (let y = 52; y < 225; y++) for (let x = 98; x < 352; x++) {
      const offset = (y * width + x) * 4
      rgba[offset] = rgba[offset + 1] = rgba[offset + 2] = 230
    }
    const drawImage = vi.fn()
    const context = {
      drawImage,
      clearRect: vi.fn(),
      createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      getImageData: () => ({ data: rgba }),
      putImageData: vi.fn(),
      filter: 'none', globalAlpha: 1, globalCompositeOperation: 'source-over',
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as never)
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width, height, close: vi.fn() })))
    const families = ['human', 'animal', 'organic', 'everyday', 'artifact'] as const
    // Sagome geometriche distinte: il matcher è di forma, non di embedding.
    const silhouettes = Array.from({ length: 40 }, (_, i): Silhouette => {
      const inset = 0.05 + (i % 5) * 0.06
      const tall = i % 2 === 0
      return {
        id: `shape-${i}`, archetype: `concept-${i}`, label: `Shape ${i}`,
        family: families[i % families.length],
        rings: [[
          [inset, tall ? 0.02 : inset], [1 - inset, tall ? 0.02 : inset],
          [1 - inset, tall ? 0.98 : 1 - inset], [inset, tall ? 0.98 : 1 - inset],
        ]],
        source: 'integration fixture', license: 'test only', approvedBy: 'test fixture',
      }
    })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ version: 1, silhouettes }), { status: 200 })))
    // Recognition quality is covered by matcher tests. Here force a valid
    // winner to exercise the actual reached-form handover between controllers.
    vi.spyOn(recognition, 'rankPsicoFantasma').mockReturnValue({
      candidate: { silhouette: silhouettes[0] as Silhouette, affinity: 0.95 }, secondAffinity: 0.1, margin: 0.85,
    })
    const container = document.createElement('div')
    const raster = new Blob(['image'])
    const controller = createBrainPsicoFantasmaScene({
      container, raster,
      scene: { frameId: 'integration-frame' },
      palette: [], printMode: 'FULL_FRAME', frameEnergy: 0.5, frameIndex: 0, frameCount: 4,
      getImageSources: () => [], getVectorScene: async () => ({ frameId: 'integration-frame' }),
    } as never)
    controller.setPerception?.({
      regime: 'pressurized',
      signals: { persistence: 0, change: 0, residual: 0, perceptualPressure: 0, pressureTrend: 'stable' },
    })
    const bands = { low: 0.3, lowMid: 0.2, mid: 0.1, high: 0.05 }
    const rhythm = { active: true, beat: false, beatIndex: 0, beatPhase: 0,
      musicalPosition: 0, beatPulse: 0, kickEnvelope: 0, beatDurationMs: 500,
      bandTransients: { low: 0, lowMid: 0, mid: 0, high: 0 } }
    controller.update(bands, DEFAULT_SETTINGS, 0, rhythm)
    for (let i = 0; i < 8 && !controller.isReady?.(); i++) await new Promise(resolve => setTimeout(resolve, 0))
    expect(controller.isReady?.()).toBe(true)
    for (let time = 250; time <= 7_000; time += 250) controller.update(bands, DEFAULT_SETTINGS, time, rhythm)
    expect(drawImage).toHaveBeenCalled()
    // Il matcher geometrico ha prodotto una decisione (riconoscimento o rifiuto
    // motivato), senza Worker né embedding.
    expect((controller.element as HTMLElement).dataset.brainPsicoFantasmaMatch0)
      .toMatch(/^(concept-\d+:|none:(affinity|margin|structure|persistence))/)
    // La regione resta dipinta per tutta la permanenza, non solo durante l'arco.
    drawImage.mockClear()
    for (let time = 7_250; time <= 13_000; time += 250) controller.update(bands, DEFAULT_SETTINGS, time, rhythm)
    expect(drawImage).toHaveBeenCalled()
    const stage = (controller.element as HTMLElement).dataset.brainPsicoFantasmaStages
    drawImage.mockClear()
    controller.setPerception?.({ regime: 'respiro-profondo' } as never)
    controller.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, { ...DEFAULT_SETTINGS, lowPowerMode: true }, 8_000,
      { ...rhythm, active: false })
    expect(drawImage).not.toHaveBeenCalled()
    expect((controller.element as HTMLElement).dataset.brainPsicoFantasmaStages).toBe(stage)
    controller.setOfflineHold?.(true)
    controller.update(bands, DEFAULT_SETTINGS, 9_000, rhythm)
    expect(drawImage).not.toHaveBeenCalled()
    controller.destroy()
    expect(container.children).toHaveLength(0)
    const restored = createBrainPsicoFantasmaScene({
      container, raster, scene: { frameId: 'integration-frame' },
    } as never)
    restored.update(bands, DEFAULT_SETTINGS, 10_000, rhythm)
    for (let i = 0; i < 8 && !restored.isReady?.(); i++) await new Promise(resolve => setTimeout(resolve, 0))
    restored.update(bands, DEFAULT_SETTINGS, 10_250, rhythm)
    expect((restored.element as HTMLElement).dataset.brainPsicoFantasmaMemory).toBe('restored')
    expect((restored.element as HTMLElement).dataset.brainPsicoFantasmaStages).toBe(stage)
    restored.destroy()

    const next = createBrainPsicoFantasmaScene({
      container, raster: new Blob(['next image']), scene: { frameId: 'next-recognized-frame' },
    } as never)
    next.setPerception?.({ regime: 'pressurized' } as never)
    next.update(bands, { ...DEFAULT_SETTINGS, lowPowerMode: true }, 0, rhythm)
    for (let i = 0; i < 8 && !next.isReady?.(); i++) await new Promise(resolve => setTimeout(resolve, 0))
    expect(next.isReady?.()).toBe(true)
    next.update(bands, DEFAULT_SETTINGS, 250, rhythm)
    expect((next.element as HTMLElement).dataset.brainPsicoFantasmaTrace).toContain('concept-0:decay')
    for (let time = 500; time <= 9_000; time += 250) next.update(bands, DEFAULT_SETTINGS, time, rhythm)
    expect((next.element as HTMLElement).dataset.brainPsicoFantasmaTrace).toContain('concept-0:morph')
    drawImage.mockClear()
    next.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 10_000, { ...rhythm, active: false })
    expect(drawImage).not.toHaveBeenCalled()
    next.destroy()

    vi.stubGlobal('__PSICOFANTASMA_AVAILABLE__', false)
    vi.mocked(fetch).mockClear()
    const preview = createBrainPsicoFantasmaScene({
      container, raster: new Blob(['preview']), scene: { frameId: 'manual-preview' },
    } as never)
    preview.update(bands, DEFAULT_SETTINGS, 0, rhythm)
    for (let i = 0; i < 8 && !preview.isReady?.(); i++) await new Promise(resolve => setTimeout(resolve, 0))
    expect(preview.isReady?.()).toBe(true)
    expect(preview.hasFailed?.()).toBe(false)
    for (let time = 250; time <= 10_000; time += 250) preview.update(bands, DEFAULT_SETTINGS, time, rhythm)
    expect((preview.element as HTMLElement).dataset.brainPsicoFantasmaRepertoire).toBe('absent-preview')
    expect((preview.element as HTMLElement).dataset.brainPsicoFantasmaMatch0).toContain('none:no-candidate')
    expect((preview.element as HTMLElement).dataset.brainPsicoFantasmaTrace).toContain(':decay')
    for (let time = 10_250; time <= 30_000; time += 250) preview.update(bands, DEFAULT_SETTINGS, time, rhythm)
    expect((preview.element as HTMLElement).dataset.brainPsicoFantasmaTrace).toContain(':expired')
    expect(fetch).not.toHaveBeenCalled()
    preview.destroy()
  })
})
