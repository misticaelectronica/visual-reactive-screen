import { describe, expect, it } from 'vitest'
import { COLOR_PRESETS } from './PresetsSelector'

describe('COLOR_PRESETS', () => {
  it.each([
    ['intense-purple-pantone-2623-c', '#5c1d6b'],
    ['italian-blue-pantone-293-c', '#0b32b0'],
  ])('espone il Pantone richiesto nel preset %s', (id, pantoneHex) => {
    const preset = COLOR_PRESETS.find((candidate) => candidate.id === id)

    expect(preset).toBeDefined()
    expect(preset?.settings.hotPinkColor).toBe(pantoneHex)
    expect(preset?.settings).toMatchObject({
      idleColor: expect.stringMatching(/^#[0-9a-f]{6}$/),
      basePinkColor: expect.stringMatching(/^#[0-9a-f]{6}$/),
      whiteFlashColor: expect.stringMatching(/^#[0-9a-f]{6}$/),
    })
  })
})
