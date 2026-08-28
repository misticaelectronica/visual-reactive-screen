import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import {
  advanceBauhausAbstraction,
  bauhausGeometryScaleForRegime,
  calculateBauhausMotion,
  computeBauhausFigureEnvelope,
  computeBauhausUnderlayOpacity,
  createBauhausFigure,
  createBrainBauhausMorphScene,
  selectBauhausSilhouette,
  updateBauhausFigureAccumulator,
  updateBauhausFigureProximity,
} from './brainBauhausMorphCanvas'
import { BAUHAUS_SILHOUETTES, BAUHAUS_SILHOUETTE_POINT_COUNT } from './brainBauhausSilhouettes'
import type { BrainRhythmState } from './brainRhythm'

const silent = { low: 0, lowMid: 0, mid: 0, high: 0 }

function rhythm(overrides: Partial<BrainRhythmState> = {}): BrainRhythmState {
  return {
    active: true,
    beat: false,
    beatIndex: 2,
    beatPhase: 0.35,
    musicalPosition: 2.35,
    beatPulse: 0,
    kickEnvelope: 0,
    beatDurationMs: 500,
    bandTransients: silent,
    ...overrides,
  }
}

describe('Bauhaus Morph motion', () => {
  it('calma il moto locale in decompressione e ancora di più nel respiro profondo', () => {
    const normal = bauhausGeometryScaleForRegime('pressurized')
    const decompression = bauhausGeometryScaleForRegime('decompression')
    const deepBreath = bauhausGeometryScaleForRegime('respiro-profondo')
    expect(normal).toBe(1)
    expect(decompression).toBeLessThan(normal)
    expect(deepBreath).toBeLessThan(decompression)
  })

  it('mantiene progresso e moto fermi nel silenzio', () => {
    const stoppedRhythm = rhythm({ active: false, musicalPosition: 12 })
    const motion = calculateBauhausMotion(
      { low: 0.7, lowMid: 0.6, mid: 0.5, high: 0.4 },
      DEFAULT_SETTINGS,
      stoppedRhythm,
    )
    expect(motion.activity).toBe(0)
    expect(motion.phase).toBe(0)
    expect(motion.mass + motion.surface + motion.lines + motion.detail).toBe(0)
    expect(advanceBauhausAbstraction(0.42, 2, stoppedRhythm, motion)).toBe(0.42)
  })

  it('fa avanzare il morph soltanto con posizione musicale e attività', () => {
    const activeRhythm = rhythm({
      musicalPosition: 2.5,
      beat: true,
      beatPulse: 0.8,
      kickEnvelope: 0.9,
      bandTransients: { low: 0.4, lowMid: 0.5, mid: 0.2, high: 0.1 },
    })
    const motion = calculateBauhausMotion(
      { low: 0.72, lowMid: 0.66, mid: 0.38, high: 0.2 },
      DEFAULT_SETTINGS,
      activeRhythm,
    )
    expect(motion.mass).toBeGreaterThan(0)
    expect(motion.surface).toBeGreaterThan(0)
    expect(motion.lines).toBeGreaterThan(0)
    expect(advanceBauhausAbstraction(0.2, 2.35, activeRhythm, motion)).toBeGreaterThan(0.2)
  })

  it('mantiene le alte sui dettagli senza aumentare il peso delle masse', () => {
    const highOnly = calculateBauhausMotion(
      { low: 0, lowMid: 0, mid: 0, high: 0.8 },
      DEFAULT_SETTINGS,
      rhythm({ bandTransients: { ...silent, high: 0.7 } }),
    )
    expect(highOnly.detail).toBeGreaterThan(0.5)
    expect(highOnly.mass).toBe(0)
  })
})

describe('computeBauhausUnderlayOpacity', () => {
  it('resta al soffitto durante la fase di reveal delle forme', () => {
    const silentMotion = { activity: 0, beat: 0 }
    expect(computeBauhausUnderlayOpacity(0, silentMotion)).toBeCloseTo(0.24, 5)
    expect(computeBauhausUnderlayOpacity(0.2, silentMotion)).toBeCloseTo(0.24, 5)
    expect(computeBauhausUnderlayOpacity(0.4, silentMotion)).toBeCloseTo(0.24, 5)
  })

  it('scende dal soffitto al pavimento soltanto nella fase di fade successiva', () => {
    const silentMotion = { activity: 0, beat: 0 }
    const midFade = computeBauhausUnderlayOpacity(0.7, silentMotion)
    const fullFade = computeBauhausUnderlayOpacity(1, silentMotion)
    expect(midFade).toBeLessThan(0.24)
    expect(midFade).toBeGreaterThan(0.08)
    expect(fullFade).toBeCloseTo(0.08, 5)
  })

  it('non modula col beat in silenzio', () => {
    const value = computeBauhausUnderlayOpacity(0.2, { activity: 0, beat: 1 })
    expect(value).toBeCloseTo(0.24, 5)
  })

  it('respira leggermente col beat quando c’è attività, senza sfondare il range', () => {
    const withBeat = computeBauhausUnderlayOpacity(0.2, { activity: 1, beat: 1 })
    const withoutBeat = computeBauhausUnderlayOpacity(0.2, { activity: 1, beat: 0 })
    expect(withBeat).toBeGreaterThan(withoutBeat)
    // Il respiro ha un margine dedicato oltre soffitto/pavimento, ma resta piccolo.
    expect(withBeat - withoutBeat).toBeCloseTo(0.04, 5)
    expect(withBeat).toBeLessThan(0.29)
    expect(withBeat).toBeGreaterThan(0.24)
  })
})

describe('updateBauhausFigureAccumulator', () => {
  const activeMotion = { activity: 0.8, beat: 0.6 }

  it('resta a zero e non scatta mai in silenzio (Check Silenzio)', () => {
    const state = { accumulator: 0.9, lastEventAt: Number.NEGATIVE_INFINITY }
    const result = updateBauhausFigureAccumulator(state, activeMotion, 5_000, 5_000, false)
    expect(result.state.accumulator).toBe(0)
    expect(result.triggered).toBe(false)
  })

  it('scatta dopo abbastanza energia sostenuta', () => {
    let state = { accumulator: 0, lastEventAt: Number.NEGATIVE_INFINITY }
    let triggered = false
    let now = 0
    for (let step = 0; step < 400 && !triggered; step += 1) {
      now += 1_000
      const result = updateBauhausFigureAccumulator(state, activeMotion, 1_000, now, true)
      state = result.state
      triggered = result.triggered
    }
    expect(triggered).toBe(true)
  })

  it('scatta entro un hold tipico (~20-84s reali) anche con energia solo moderata, non ai massimi', () => {
    // Bauhaus Morph resta attivo solo 2-3 fotogrammi storia (~20-84s reali,
    // skills.md "Renderer Brain") prima di essere sostituito, e lo stato
    // dell'accumulatore si azzera ad ogni nuova istanza — una soglia che
    // richiede più tempo di un hold tipico con audio realistico (non
    // sostenuto ai massimi) di fatto non scatta mai (segnalato dal
    // Capo Supremo: "raro sì ma non rarissimo").
    const moderateMotion = { activity: 0.4, beat: 0.15 }
    let state = { accumulator: 0, lastEventAt: Number.NEGATIVE_INFINITY }
    let triggered = false
    let now = 0
    const TYPICAL_HOLD_MS = 20_000
    while (now < TYPICAL_HOLD_MS && !triggered) {
      now += 1_000
      const result = updateBauhausFigureAccumulator(state, moderateMotion, 1_000, now, true)
      state = result.state
      triggered = result.triggered
    }
    expect(triggered).toBe(true)
  })

  it('non ri-scatta entro il tempo minimo di attesa dopo un trigger', () => {
    const justTriggered = { accumulator: 0, lastEventAt: 10_000 }
    const result = updateBauhausFigureAccumulator(justTriggered, activeMotion, 500, 10_800, true)
    expect(result.triggered).toBe(false)
  })

  it('decade verso zero senza energia, mai sotto zero', () => {
    const state = { accumulator: 0.05, lastEventAt: Number.NEGATIVE_INFINITY }
    const result = updateBauhausFigureAccumulator(
      state,
      { activity: 0, beat: 0 },
      50_000,
      50_000,
      true,
    )
    expect(result.state.accumulator).toBe(0)
  })
})

describe('createBauhausFigure', () => {
  const composition = { palette: ['#111111', '#222222', '#333333', '#444444', '#555555'] }

  it('è deterministico per lo stesso trigger', () => {
    const a = createBauhausFigure(12_345, 8.5, composition)
    const b = createBauhausFigure(12_345, 8.5, composition)
    expect(a).toEqual(b)
  })

  it('varia forma/posizione fra trigger diversi', () => {
    const samples = Array.from({ length: 12 }, (_, index) =>
      createBauhausFigure(index * 4_133, index * 1.7, composition))
    const shapes = new Set(samples.map((figure) => figure.plane.shape))
    const positions = new Set(samples.map((figure) =>
      `${figure.plane.centerX.toFixed(3)}:${figure.plane.centerY.toFixed(3)}`))
    expect(shapes.size).toBeGreaterThan(1)
    expect(positions.size).toBeGreaterThan(1)
  })

  it('resta entro i vincoli geometrici e di stato iniziale', () => {
    const figure = createBauhausFigure(999, 3.2, composition)
    expect(['rect', 'ellipse', 'triangle']).toContain(figure.plane.shape)
    expect(figure.plane.centerX).toBeGreaterThanOrEqual(0)
    expect(figure.plane.centerX).toBeLessThanOrEqual(1)
    expect(figure.plane.centerY).toBeGreaterThanOrEqual(0)
    expect(figure.plane.centerY).toBeLessThanOrEqual(1)
    expect(composition.palette).toContain(figure.plane.color)
    expect(figure.plane.outline.length).toBe(BAUHAUS_SILHOUETTE_POINT_COUNT)
    expect(figure.becomeState).toBe('abstract')
    expect(figure.nearMs).toBe(0)
    expect(figure.targetPlane).toBeNull()
  })
})

describe('computeBauhausFigureEnvelope', () => {
  it('parte da opacità zero e resta viva', () => {
    const envelope = computeBauhausFigureEnvelope(0)
    expect(envelope.opacity).toBe(0)
    expect(envelope.alive).toBe(true)
  })

  it('resta a piena opacità durante la tenuta', () => {
    const envelope = computeBauhausFigureEnvelope(2_500)
    expect(envelope.opacity).toBe(1)
    expect(envelope.alive).toBe(true)
  })

  it('termina la vita oltre la durata totale', () => {
    const envelope = computeBauhausFigureEnvelope(5_600)
    expect(envelope.alive).toBe(false)
  })

  it('opacità non decrescente in ingresso, non crescente in uscita', () => {
    const fadeIn = [0, 300, 600, 900].map((ms) => computeBauhausFigureEnvelope(ms).opacity)
    for (let index = 1; index < fadeIn.length; index += 1) {
      expect(fadeIn[index]).toBeGreaterThanOrEqual(fadeIn[index - 1])
    }
    const fadeOut = [4_100, 4_500, 4_900, 5_300].map((ms) => computeBauhausFigureEnvelope(ms).opacity)
    for (let index = 1; index < fadeOut.length; index += 1) {
      expect(fadeOut[index]).toBeLessThanOrEqual(fadeOut[index - 1])
    }
  })
})

describe('updateBauhausFigureProximity', () => {
  it('fa crescere nearMs quando un piano è entro soglia', () => {
    const nearby = [{ centerX: 0.51, centerY: 0.5, width: 0.2, height: 0.2, shape: 'rect' as const }]
    const result = updateBauhausFigureProximity(0.5, 0.5, nearby, 500, 200)
    expect(result.nearMs).toBe(700)
    expect(result.nearestPlane).not.toBeNull()
  })

  it('azzera nearMs quando nessun piano è abbastanza vicino', () => {
    const far = [{ centerX: 0.95, centerY: 0.95, width: 0.2, height: 0.2, shape: 'rect' as const }]
    const result = updateBauhausFigureProximity(0.1, 0.1, far, 1_200, 200)
    expect(result.nearMs).toBe(0)
    expect(result.nearestPlane).toBeNull()
  })

  it('azzera nearMs senza piani vicini', () => {
    const result = updateBauhausFigureProximity(0.5, 0.5, [], 900, 200)
    expect(result.nearMs).toBe(0)
  })

  it('sceglie sempre il piano più vicino fra più candidati', () => {
    const planes = [
      { centerX: 0.9, centerY: 0.9, width: 0.1, height: 0.1, shape: 'rect' as const },
      { centerX: 0.52, centerY: 0.5, width: 0.1, height: 0.1, shape: 'ellipse' as const },
    ]
    const result = updateBauhausFigureProximity(0.5, 0.5, planes, 0, 100)
    expect(result.nearestPlane?.shape).toBe('ellipse')
  })
})

describe('selectBauhausSilhouette', () => {
  it('è deterministico per lo stesso piano e seme', () => {
    const plane = { width: 0.2, height: 0.4 }
    expect(selectBauhausSilhouette(plane, 42)).toEqual(selectBauhausSilhouette(plane, 42))
  })

  it('può variare fra semi diversi a parità di piano', () => {
    const plane = { width: 0.2, height: 0.2 }
    const ids = new Set(
      Array.from({ length: 10 }, (_, seed) => selectBauhausSilhouette(plane, seed * 71).id),
    )
    expect(ids.size).toBeGreaterThan(1)
  })

  it('preferisce sagome con proporzioni vicine a quelle del piano', () => {
    const narrowTall = { width: 0.1, height: 0.5 }
    const chosen = selectBauhausSilhouette(narrowTall, 7)
    const aspectRatio = narrowTall.width / narrowTall.height
    const sortedByCloseness = [...BAUHAUS_SILHOUETTES].sort(
      (a, b) => Math.abs(a.aspectRatio - aspectRatio) - Math.abs(b.aspectRatio - aspectRatio),
    )
    expect(sortedByCloseness.slice(0, 3).map((silhouette) => silhouette.id)).toContain(chosen.id)
  })

  it('ogni sagoma della libreria ha lo stesso numero di punti', () => {
    for (const silhouette of BAUHAUS_SILHOUETTES) {
      expect(silhouette.points.length).toBe(BAUHAUS_SILHOUETTE_POINT_COUNT)
    }
  })
})

describe('createBrainBauhausMorphScene — integrazione con Canvas2D reale', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('esegue molti fotogrammi con audio sostenuto (figura + becoming) senza eccezioni', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({
      width: 320,
      height: 180,
      close: vi.fn(),
    })))
    const createPixels = (width: number, height: number) => {
      const data = new Uint8ClampedArray(width * height * 4)
      for (let offset = 0; offset < data.length; offset += 4) {
        const light = (offset / 4) % width < width / 2
        data[offset] = light ? 210 : 40
        data[offset + 1] = light ? 160 : 60
        data[offset + 2] = light ? 90 : 80
        data[offset + 3] = 255
      }
      return data
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      function (this: HTMLCanvasElement) {
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
          rotate: vi.fn(),
          scale: vi.fn(),
          beginPath: vi.fn(),
          closePath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          quadraticCurveTo: vi.fn(),
          ellipse: vi.fn(),
          arc: vi.fn(),
          fill: vi.fn(),
          fillRect: vi.fn(),
          stroke: vi.fn(),
          clip: vi.fn(),
          globalAlpha: 1,
          globalCompositeOperation: 'source-over',
          fillStyle: '#000000',
          strokeStyle: '#000000',
          lineWidth: 1,
        } as unknown as CanvasRenderingContext2D
      },
    )
    const raster = new Blob(['bauhaus'])
    const scene = { frameId: 'bauhaus-frame', description: 'bauhaus', svg: '<svg/>', raster }
    const container = document.createElement('div')
    const controller = createBrainBauhausMorphScene({
      container,
      scene,
      raster,
      palette: ['#160b18', '#4a2438', '#8d4c4e', '#dc8f5a', '#f0d7b0'],
      printMode: 'living-ink',
      getImageSources: () => [{
        id: 'story:bauhaus-frame',
        role: 'current',
        scene,
        raster,
        narrativeHints: ['bauhaus'],
      }],
      getVectorScene: async () => scene,
      frameEnergy: 0.5,
      frameIndex: 0,
      frameCount: 4,
    })

    const lively: BrainRhythmState = {
      active: true,
      beat: true,
      beatIndex: 0,
      beatPhase: 0,
      musicalPosition: 0,
      beatPulse: 0.9,
      kickEnvelope: 0.85,
      beatDurationMs: 400,
      bandTransients: { low: 0.5, lowMid: 0.4, mid: 0.3, high: 0.2 },
    }
    const bands = { low: 0.75, lowMid: 0.68, mid: 0.55, high: 0.4 }

    let time = 0
    controller.update(bands, DEFAULT_SETTINGS, time)
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(controller.isReady?.()).toBe(true)
    expect(controller.hasFailed?.()).toBe(false)

    // ~90s simulati a passi di 33ms (~30fps), musica sempre attiva: deve
    // bastare a far scattare almeno una figura e farla diventare oggetto,
    // senza mai lanciare eccezioni né restare "fermo" (hasFailed).
    const observedFigureStates = new Set<string>()
    for (let step = 0; step < 2_700; step += 1) {
      time += 33
      const rhythm: BrainRhythmState = {
        ...lively,
        musicalPosition: time / 400,
        beatIndex: Math.floor(time / 400),
        beatPhase: (time % 400) / 400,
      }
      expect(() => controller.update(bands, DEFAULT_SETTINGS, time, rhythm)).not.toThrow()
      const canvas = controller.element.querySelector<HTMLCanvasElement>('[data-brain-renderer="bauhaus-morph"]')
      const figureState = canvas?.dataset.brainBauhausFigure
      if (figureState) observedFigureStates.add(figureState)
    }

    // Verifica che il codice della figura sia stato davvero esercitato, non
    // solo che non abbia lanciato eccezioni (con musica sostenuta per 90s
    // ci si aspetta almeno una comparsa).
    expect(observedFigureStates.has('abstract')).toBe(true)
    expect(controller.hasFailed?.()).toBe(false)
    controller.destroy()
    expect(container.contains(controller.element)).toBe(false)
  })
})
