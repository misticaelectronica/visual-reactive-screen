import { describe, expect, it } from 'vitest'
import {
  BRAIN_FRAME_MORPH_PATTERNS,
  brainPresetMotionTuning,
  calculateBrainCameraMotion,
  calculateBrainDepthMotion,
  calculateBrainFrameTiming,
  calculateBrainKickDisplacement,
  calculateBrainMicroMotion,
  calculateBrainMotionFrameInterval,
  calculateBrainSpectrumEnvelope,
  createBrainDepthProfile,
  selectBrainFrameMorphPattern,
  selectBrainRecycledFrameIndex,
} from './brainFrameMotion'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import { DEFAULT_BRAIN_RENDERING_CONFIG } from './brainRenderingConfig'

describe('movimento dei fotogrammi Brain', () => {
  it('mantiene il movimento fluido a 60 FPS e non scende sotto 50 FPS sulle scene pesanti', () => {
    expect(calculateBrainMotionFrameInterval(false, 80_000)).toBeCloseTo(1_000 / 60)
    expect(calculateBrainMotionFrameInterval(false, 220_000)).toBe(20)
    expect(calculateBrainMotionFrameInterval(true, 80_000)).toBeCloseTo(1_000 / 30)
  })

  it('fa evolvere i contorni con micromovimenti continui e contenuti', () => {
    const samples = [0, 1 / 60, 2 / 60, 3 / 60].map((time) =>
      calculateBrainMicroMotion(42, 3, 0.25, time, 0.4, 0.58),
    )
    expect(new Set(samples.map(({ normal }) => normal.toFixed(6))).size).toBe(4)
    for (let index = 1; index < samples.length; index++) {
      expect(
        Math.abs(samples[index].normal - samples[index - 1].normal),
      ).toBeLessThan(0.01)
      expect(
        Math.abs(samples[index].tangent - samples[index - 1].tangent),
      ).toBeLessThan(0.01)
    }
    expect(samples.every(({ normal }) => Math.abs(normal) < 1)).toBe(true)
  })

  it('collega l’impulso a tutte le bande e al beat reale', () => {
    const silence = { low: 0, lowMid: 0, mid: 0, high: 0 }
    expect(calculateBrainSpectrumEnvelope(silence, 0)).toBe(0)
    for (const band of ['low', 'lowMid', 'mid', 'high'] as const) {
      expect(calculateBrainSpectrumEnvelope({ ...silence, [band]: 1 }, 0))
        .toBeGreaterThan(0)
    }
    expect(calculateBrainSpectrumEnvelope(silence, 1)).toBeGreaterThan(0)
  })

  it('rende il kick visibile senza una trasformazione globale della scena', () => {
    expect(calculateBrainKickDisplacement(1_400, 0.72, 0, 1, 1)).toBe(0)
    expect(calculateBrainKickDisplacement(1_400, 0.72, 1, 1, 1))
      .toBeCloseTo(10.08)
    expect(calculateBrainKickDisplacement(1_400, 0.72, 1, 1, 1, 0.82))
      .toBeCloseTo(8.2656)
  })

  it('non ripete consecutivamente lo stesso pattern di trasformazione', () => {
    for (const previous of BRAIN_FRAME_MORPH_PATTERNS) {
      expect(selectBrainFrameMorphPattern(previous, () => 0)).not.toBe(previous)
      expect(selectBrainFrameMorphPattern(previous, () => 0.999)).not.toBe(previous)
    }
  })

  it('lascia una permanenza musicale dopo il morphing', () => {
    for (const pattern of BRAIN_FRAME_MORPH_PATTERNS) {
      const timing = calculateBrainFrameTiming(
        500,
        DEFAULT_BRAIN_RENDERING_CONFIG.timing.frameDurationMs,
        pattern,
      )
      expect(timing.transitionMs).toBeGreaterThanOrEqual(
        DEFAULT_BRAIN_RENDERING_CONFIG.timing.transitionMinMs,
      )
      expect(timing.transitionMs).toBeLessThanOrEqual(
        DEFAULT_BRAIN_RENDERING_CONFIG.timing.transitionMaxMs,
      )
      expect(timing.holdMs).toBeGreaterThanOrEqual(
        DEFAULT_BRAIN_RENDERING_CONFIG.timing.holdMinMs,
      )
      expect(timing.totalMs - timing.transitionMs).toBeGreaterThanOrEqual(
        DEFAULT_BRAIN_RENDERING_CONFIG.timing.holdMinMs,
      )
    }
  })

  it('adatta la durata al ritmo senza rendere nervosa la trasformazione', () => {
    const veloce = calculateBrainFrameTiming(300, 0, 'marea')
    const lento = calculateBrainFrameTiming(1_000, 0, 'marea')

    expect(veloce.transitionMs).toBe(
      DEFAULT_BRAIN_RENDERING_CONFIG.timing.transitionMinMs,
    )
    expect(lento.transitionMs).toBe(
      DEFAULT_BRAIN_RENDERING_CONFIG.timing.transitionMaxMs,
    )
    expect(lento.holdMs).toBeGreaterThan(veloce.holdMs)
  })

  it('ricicla un fotogramma diverso da quello attualmente visibile', () => {
    expect(selectBrainRecycledFrameIndex(4, 0, () => 0)).toBe(1)
    expect(selectBrainRecycledFrameIndex(4, 3, () => 0.999)).toBe(2)
    expect(selectBrainRecycledFrameIndex(5, 0, () => 0.999)).toBe(4)
    expect(selectBrainRecycledFrameIndex(1, 0, () => 0.5)).toBe(0)
  })

  it('deriva movimento e colore dai parametri dei preset correnti', () => {
    const base = brainPresetMotionTuning(DEFAULT_SETTINGS)
    const dynamic = brainPresetMotionTuning({
      ...DEFAULT_SETTINGS,
      dynamicPresetEnabled: true,
      dynamicColorRotationEnabled: true,
      motionProfile: 'techno',
      sensitivity: 1.1,
      kickMovement: 0.52,
      selectedColorPresetId: 'techno-rituale-tribale-industriale',
    })

    expect(dynamic.movementScale).toBeGreaterThan(base.movementScale)
    expect(dynamic.kickScale).toBeGreaterThan(base.kickScale)
    expect(dynamic.colorInfluence).toBeGreaterThan(base.colorInfluence)
    expect(dynamic.colorSpeed).toBeGreaterThan(base.colorSpeed)
  })

  it('assegna profondità diverse ma riproducibili alle forme', () => {
    const first = createBrainDepthProfile(2, 12, 4242)
    const repeated = createBrainDepthProfile(2, 12, 4242)
    const neighbour = createBrainDepthProfile(3, 12, 4242)

    expect(repeated).toEqual(first)
    expect(neighbour.depth).not.toBe(first.depth)
    expect(first.depth).toBeGreaterThanOrEqual(-1)
    expect(first.depth).toBeLessThanOrEqual(1)
  })

  it('produce traiettorie 3D continue e non riducibili a una singola onda', () => {
    const profile = createBrainDepthProfile(4, 16, 99)
    const samples = [0, 1, 2, 3].map((seconds) =>
      calculateBrainDepthMotion(
        profile,
        seconds,
        seconds * 2,
        0.45,
        0.3,
        'corrente',
      ),
    )

    for (let index = 1; index < samples.length; index++) {
      expect(Math.abs(samples[index].x - samples[index - 1].x)).toBeLessThan(8)
      expect(Math.abs(samples[index].y - samples[index - 1].y)).toBeLessThan(8)
    }
    expect(new Set(samples.map(({ z }) => z.toFixed(3))).size).toBeGreaterThan(2)
    expect(new Set(samples.map(({ light }) => light.toFixed(3))).size).toBeGreaterThan(2)
    expect(samples.some(({ rotateX, rotateY }) => rotateX !== rotateY)).toBe(true)
  })

  it('cambia punto di osservazione senza introdurre una scala o uno zoom', () => {
    const samples = [0, 1, 2, 3].map((seconds) =>
      calculateBrainCameraMotion(4242, seconds, seconds * 2, 0.4, 'spirale'),
    )

    expect(samples.every(({ mode }) => mode === 'orbita')).toBe(true)
    expect(new Set(samples.map(({ x }) => x.toFixed(4))).size).toBeGreaterThan(2)
    expect(new Set(samples.map(({ yaw }) => yaw.toFixed(4))).size).toBeGreaterThan(2)
    for (let index = 1; index < samples.length; index++) {
      expect(Math.abs(samples[index].x - samples[index - 1].x)).toBeLessThan(0.15)
      expect(Math.abs(samples[index].y - samples[index - 1].y)).toBeLessThan(0.15)
    }
    expect(samples.every((sample) => !('scale' in sample))).toBe(true)
  })
})
