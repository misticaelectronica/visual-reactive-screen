import { describe, expect, it } from 'vitest'
import {
  PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE,
  validateImageModelManifest,
} from './imageModelManifest'
import { BRAIN_CONFIG } from './brainConfig'

describe('manifesto modelli immagini Psichedel', () => {
  it('registra il checkpoint Explicit reale senza safety checker', () => {
    expect(PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE.sourceRepository).toBe(
      'stablediffusionapi/pornmaster',
    )
    expect(PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE.uncensored).toBe(true)
    expect(PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE.safetyChecker).toBe(false)
    expect(PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE.family).toBe('sd15')
    expect(BRAIN_CONFIG.imageModelId).toBe(
      PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE.id,
    )
    expect(BRAIN_CONFIG.imageModelId).not.toBe('sd-turbo')
  })

  it('richiede tutti i componenti ONNX della pipeline', () => {
    expect(validateImageModelManifest(
      PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE,
    )).toEqual([])
  })

  it('non presenta un normale checkpoint con pochi step come Turbo', () => {
    const invalidTurbo = {
      ...PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE,
      profile: 'turbo' as const,
      turboSteps: 0,
    }
    expect(validateImageModelManifest(invalidTurbo)).toContain(
      'un profilo Turbo deve dichiarare almeno uno step',
    )
  })
})
