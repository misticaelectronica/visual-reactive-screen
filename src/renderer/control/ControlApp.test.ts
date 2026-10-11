import { describe, expect, it } from 'vitest'
import { COLOR_ROTATION_MAX_MS, COLOR_ROTATION_MIN_MS } from './ControlApp'

describe('rotazione colori', () => {
  it('usa la finestra accelerata da 30 a 100 secondi', () => {
    expect(COLOR_ROTATION_MIN_MS).toBe(30_000)
    expect(COLOR_ROTATION_MAX_MS).toBe(100_000)
    expect((COLOR_ROTATION_MIN_MS + COLOR_ROTATION_MAX_MS) / 2).toBe(65_000)
  })
})
