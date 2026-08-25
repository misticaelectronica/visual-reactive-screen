import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import {
  advanceDegenerationProgress,
  calculateFractalSpiralMotion,
  computeBackgroundSpiralPoints,
  computeLevelReveal,
  computeSpiralArmPoints,
  computeSpiralDirection,
  computeSpiralFillPhase,
  computeUnderlayOpacity,
  createBrainFractalSpiralScene,
} from './brainFractalSpiralCanvas'
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

describe('calculateFractalSpiralMotion', () => {
  it('resta ferma nel silenzio (Check Silenzio)', () => {
    const motion = calculateFractalSpiralMotion(
      { low: 0.7, lowMid: 0.6, mid: 0.5, high: 0.4 },
      DEFAULT_SETTINGS,
      rhythm({ active: false }),
    )
    expect(motion.activity).toBe(0)
    expect(motion.phase).toBe(0)
    expect(motion.macro + motion.torsion + motion.density + motion.detail).toBe(0)
  })

  it('cresce con energia sostenuta e beat reale', () => {
    const motion = calculateFractalSpiralMotion(
      { low: 0.72, lowMid: 0.66, mid: 0.5, high: 0.3 },
      DEFAULT_SETTINGS,
      rhythm({ beat: true, beatPulse: 0.8, kickEnvelope: 0.9 }),
    )
    expect(motion.activity).toBeGreaterThan(0)
    expect(motion.macro).toBeGreaterThan(0)
    expect(motion.beat).toBeGreaterThan(0)
  })
})

describe('advanceDegenerationProgress', () => {
  it('non avanza mai senza musica attiva o posizione musicale', () => {
    const stoppedRhythm = rhythm({ active: false, musicalPosition: 12 })
    const motion = calculateFractalSpiralMotion(
      { low: 0.7, lowMid: 0.6, mid: 0.5, high: 0.4 },
      DEFAULT_SETTINGS,
      stoppedRhythm,
    )
    expect(advanceDegenerationProgress(0.42, 2, stoppedRhythm, motion)).toBe(0.42)
    expect(advanceDegenerationProgress(0.42, null, rhythm(), motion)).toBe(0.42)
  })

  it('avanza con musica attiva e attività reale', () => {
    const activeRhythm = rhythm({ musicalPosition: 2.5, beat: true, beatPulse: 0.8 })
    const motion = calculateFractalSpiralMotion(
      { low: 0.72, lowMid: 0.66, mid: 0.5, high: 0.3 },
      DEFAULT_SETTINGS,
      activeRhythm,
    )
    expect(advanceDegenerationProgress(0.2, 2.35, activeRhythm, motion)).toBeGreaterThan(0.2)
  })

  it('resta sempre entro [0,1]', () => {
    const activeRhythm = rhythm({ musicalPosition: 100, beat: true, beatPulse: 1 })
    const motion = calculateFractalSpiralMotion(
      { low: 1, lowMid: 1, mid: 1, high: 1 },
      DEFAULT_SETTINGS,
      activeRhythm,
    )
    expect(advanceDegenerationProgress(0.99, 2, activeRhythm, motion)).toBeLessThanOrEqual(1)
  })
})

describe('computeUnderlayOpacity', () => {
  it('non scende mai a zero: il raster di contesto resta leggibile sotto gli oggetti ricalcati', () => {
    expect(computeUnderlayOpacity(0)).toBeGreaterThan(0.2)
    expect(computeUnderlayOpacity(1)).toBeGreaterThan(0)
    expect(computeUnderlayOpacity(1)).toBeLessThan(computeUnderlayOpacity(0))
  })

  it('scende monotonicamente con la degenerazione', () => {
    const samples = [0, 0.25, 0.5, 0.75, 1].map((p) => computeUnderlayOpacity(p))
    for (let index = 1; index < samples.length; index += 1) {
      expect(samples[index]).toBeLessThanOrEqual(samples[index - 1])
    }
  })
})

describe('computeSpiralArmPoints', () => {
  it('parte dal centro e arriva a maxRadius', () => {
    const points = computeSpiralArmPoints(100, 100, 50, 2, 0, 40)
    expect(Math.hypot(points[0].x - 100, points[0].y - 100)).toBeCloseTo(0, 5)
    const last = points[points.length - 1]
    expect(Math.hypot(last.x - 100, last.y - 100)).toBeCloseTo(50, 5)
  })

  it('più giri (`turns`) percorrono più angolo totale', () => {
    const fewTurns = computeSpiralArmPoints(0, 0, 100, 1, 0, 40)
    const manyTurns = computeSpiralArmPoints(0, 0, 100, 3, 0, 40)
    const midFew = fewTurns[Math.floor(fewTurns.length / 2)]
    const midMany = manyTurns[Math.floor(manyTurns.length / 2)]
    expect(Math.abs(midMany.rotation)).toBeGreaterThan(Math.abs(midFew.rotation))
  })

  it('angleOffset trasla l\'intero braccio in modo continuo', () => {
    const withoutOffset = computeSpiralArmPoints(0, 0, 50, 1, 0, 10)
    const withOffset = computeSpiralArmPoints(0, 0, 50, 1, 1.5, 10)
    expect(withOffset[5].rotation).toBeCloseTo(withoutOffset[5].rotation + 1.5, 5)
  })

  it('restituisce un array vuoto se pointCount non è utilizzabile', () => {
    expect(computeSpiralArmPoints(0, 0, 50, 1, 0, 1)).toEqual([])
    expect(computeSpiralArmPoints(0, 0, 50, 1, 0, 0)).toEqual([])
  })

  it('`direction` inverte il verso di avvolgimento (segnalato: giravano tutte dalla stessa parte)', () => {
    const clockwise = computeSpiralArmPoints(0, 0, 100, 2, 0, 40, 1)
    const counterClockwise = computeSpiralArmPoints(0, 0, 100, 2, 0, 40, -1)
    const midClockwise = clockwise[Math.floor(clockwise.length / 2)]
    const midCounter = counterClockwise[Math.floor(counterClockwise.length / 2)]
    // Stesso raggio (stessa geometria radiale), rotazione di segno opposto.
    expect(Math.hypot(midClockwise.x, midClockwise.y)).toBeCloseTo(
      Math.hypot(midCounter.x, midCounter.y), 5,
    )
    expect(midClockwise.rotation).toBeCloseTo(-midCounter.rotation, 5)
  })

  it('il verso predefinito resta orario (compatibilità con le chiamate esistenti)', () => {
    const withDefault = computeSpiralArmPoints(0, 0, 100, 2, 0, 40)
    const withExplicitOne = computeSpiralArmPoints(0, 0, 100, 2, 0, 40, 1)
    expect(withDefault).toEqual(withExplicitOne)
  })
})

describe('computeSpiralDirection', () => {
  it('è deterministico per lo stesso indice', () => {
    expect(computeSpiralDirection(3)).toBe(computeSpiralDirection(3))
  })

  it('restituisce sempre 1 o -1', () => {
    for (let index = 0; index < 30; index += 1) {
      expect([1, -1]).toContain(computeSpiralDirection(index))
    }
  })

  it('non produce lo stesso segno per tutti gli indici piccoli 0-11 (il range tipico del numero di oggetti in scena)', () => {
    const directions = new Set(
      Array.from({ length: 12 }, (_, index) => computeSpiralDirection(index)),
    )
    expect(directions.size).toBe(2)
  })

  it('non ha una sequenza di più di 4 indici consecutivi con lo stesso segno, nei primi 20', () => {
    let run = 1
    let maxRun = 1
    for (let index = 1; index < 20; index += 1) {
      if (computeSpiralDirection(index) === computeSpiralDirection(index - 1)) {
        run += 1
        maxRun = Math.max(maxRun, run)
      } else {
        run = 1
      }
    }
    expect(maxRun).toBeLessThanOrEqual(4)
  })
})

describe('computeSpiralFillPhase', () => {
  it('resta un valore contenuto anche a piena degenerazione (mai una rivoluzione libera)', () => {
    const motion = { torsion: 1, beat: 1 }
    const phase = computeSpiralFillPhase(0, 1, motion)
    expect(Number.isFinite(phase)).toBe(true)
  })

  it('oggetti diversi hanno fasi diverse (non pulsano mai in sincrono perfetto)', () => {
    const motion = { torsion: 0.5, beat: 0.2 }
    const phases = new Set(
      Array.from({ length: 6 }, (_, index) => computeSpiralFillPhase(index, 0.4, motion).toFixed(4)),
    )
    expect(phases.size).toBeGreaterThan(1)
  })

  it('è deterministico per lo stesso indice/progresso/motion', () => {
    const motion = { torsion: 0.3, beat: 0.1 }
    expect(computeSpiralFillPhase(2, 0.5, motion)).toBe(computeSpiralFillPhase(2, 0.5, motion))
  })
})

describe('computeLevelReveal', () => {
  it('il primo livello si rivela prima degli altri', () => {
    const levelCount = 4
    const early = computeLevelReveal(0, 0.1, levelCount, 0)
    const late = computeLevelReveal(3, 0.1, levelCount, 0)
    expect(early).toBeGreaterThan(late)
  })

  it('a degenerazione piena tutti i livelli sono rivelati', () => {
    const levelCount = 4
    for (let level = 0; level < levelCount; level += 1) {
      expect(computeLevelReveal(level, 1, levelCount, 0)).toBeCloseTo(1, 1)
    }
  })

  it('a degenerazione zero e senza bump nessun livello è rivelato', () => {
    expect(computeLevelReveal(0, 0, 4, 0)).toBeCloseTo(0, 5)
  })

  it('il beatBump anticipa temporaneamente il reveal senza uno scatto', () => {
    const withoutBump = computeLevelReveal(1, 0.28, 4, 0)
    const withBump = computeLevelReveal(1, 0.28, 4, 0.15)
    expect(withBump).toBeGreaterThanOrEqual(withoutBump)
  })

  it('restituisce 0 se non ci sono livelli', () => {
    expect(computeLevelReveal(0, 1, 0, 0)).toBe(0)
  })
})

describe('computeBackgroundSpiralPoints', () => {
  it('restituisce esattamente `count` punti, tutti in [0,1]', () => {
    const points = computeBackgroundSpiralPoints(10)
    expect(points).toHaveLength(10)
    for (const point of points) {
      expect(point.x).toBeGreaterThanOrEqual(0)
      expect(point.x).toBeLessThanOrEqual(1)
      expect(point.y).toBeGreaterThanOrEqual(0)
      expect(point.y).toBeLessThanOrEqual(1)
    }
  })

  it('è deterministico (stesso conteggio → stesso risultato)', () => {
    expect(computeBackgroundSpiralPoints(8)).toEqual(computeBackgroundSpiralPoints(8))
  })

  it('i punti hanno versi di avvolgimento diversi, non tutti uguali', () => {
    const points = computeBackgroundSpiralPoints(20)
    const directions = new Set(points.map((point) => point.direction))
    expect(directions.has(1)).toBe(true)
    expect(directions.has(-1)).toBe(true)
  })

  it('i primi punti (pochi oggetti in scena) hanno già entrambi i versi', () => {
    // Regressione: con la vecchia hashUnit(index, 4, 29) gli indici piccoli
    // (0-5, il caso più comune per il numero di oggetti visibili) davano
    // sempre lo stesso segno — segnalato due volte dal Capo Supremo.
    const points = computeBackgroundSpiralPoints(6)
    const directions = new Set(points.map((point) => point.direction))
    expect(directions.size).toBe(2)
  })

  it('restituisce un array vuoto per conteggio zero o negativo', () => {
    expect(computeBackgroundSpiralPoints(0)).toEqual([])
    expect(computeBackgroundSpiralPoints(-3)).toEqual([])
  })
})

describe('createBrainFractalSpiralScene — integrazione con Canvas2D reale', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('esegue molti fotogrammi con audio sostenuto senza eccezioni e avanza la degenerazione', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({
      width: 320,
      height: 180,
      close: vi.fn(),
    })))
    const createPixels = (width: number, height: number) => {
      const data = new Uint8ClampedArray(width * height * 4)
      for (let offset = 0; offset < data.length; offset += 4) {
        const light = (offset / 4) % width < width / 2
        data[offset] = light ? 200 : 40
        data[offset + 1] = light ? 140 : 70
        data[offset + 2] = light ? 90 : 100
        data[offset + 3] = 255
      }
      return data
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      function (this: HTMLCanvasElement) {
        return {
          canvas: this,
          drawImage: vi.fn(),
          fillRect: vi.fn(),
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
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          stroke: vi.fn(),
          arc: vi.fn(),
          fill: vi.fn(),
          createRadialGradient: () => ({ addColorStop: vi.fn() }),
          globalAlpha: 1,
          globalCompositeOperation: 'source-over',
          fillStyle: '#000000',
          strokeStyle: '#000000',
          lineWidth: 1,
          lineCap: 'butt',
        } as unknown as CanvasRenderingContext2D
      },
    )
    const raster = new Blob(['fractal'])
    const scene = { frameId: 'fractal-frame', description: 'fractal', svg: '<svg/>', raster }
    const container = document.createElement('div')
    const controller = createBrainFractalSpiralScene({
      container,
      scene,
      raster,
      palette: ['#160b18', '#4a2438', '#8d4c4e', '#dc8f5a', '#f0d7b0'],
      printMode: 'living-ink',
      getImageSources: () => [{
        id: 'story:fractal-frame',
        role: 'current',
        scene,
        raster,
        narrativeHints: ['fractal'],
      }],
      getVectorScene: async () => scene,
      frameEnergy: 0.5,
      frameIndex: 0,
      frameCount: 4,
    })

    let time = 0
    controller.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, time)
    for (let flush = 0; flush < 8; flush += 1) await Promise.resolve()
    expect(controller.isReady?.()).toBe(true)
    expect(controller.hasFailed?.()).toBe(false)

    const lively: BrainRhythmState = {
      active: true,
      beat: true,
      beatIndex: 0,
      beatPhase: 0,
      musicalPosition: 0,
      beatPulse: 0.7,
      kickEnvelope: 0.7,
      beatDurationMs: 400,
      bandTransients: { low: 0.4, lowMid: 0.35, mid: 0.3, high: 0.2 },
    }
    const bands = { low: 0.6, lowMid: 0.55, mid: 0.5, high: 0.4 }

    for (let step = 0; step < 600; step += 1) {
      time += 33
      const rhythm: BrainRhythmState = {
        ...lively,
        musicalPosition: time / 400,
        beatIndex: Math.floor(time / 400),
        beatPhase: (time % 400) / 400,
      }
      expect(() => controller.update(bands, DEFAULT_SETTINGS, time, rhythm)).not.toThrow()
    }

    const canvas = controller.element as HTMLCanvasElement
    const degeneration = Number(canvas.dataset.brainFractalDegeneration ?? '0')
    expect(degeneration).toBeGreaterThan(0)
    expect(controller.hasFailed?.()).toBe(false)
    controller.destroy()
    expect(container.contains(controller.element)).toBe(false)
  })
})
