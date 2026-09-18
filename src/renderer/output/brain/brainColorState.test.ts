import { describe, expect, it } from 'vitest'
import { buildColorDirectionBlock } from './brainColorState'

describe('buildColorDirectionBlock', () => {
  it('always produces an identifiable COLOR DIRECTION block', () => {
    const block = buildColorDirectionBlock('story-1:frame-1')
    expect(block).toMatch(/^COLOR DIRECTION:\n/)
    expect(block).toMatch(/Colour family: .+\.$/)
  })

  it('describes chromatic relationships (competition, continuity, saturation, accents) without a colour-emotion mapping', () => {
    const block = buildColorDirectionBlock('story-1:frame-1')
    expect(block).toMatch(/low chromatic competition/)
    expect(block).toMatch(/[Cc]ontinuous colour families/)
    expect(block).toMatch(/uneven controlled saturation/)
    expect(block).toMatch(/rare deeper accents/)
    expect(block).not.toMatch(/tension|calm|energy|sadness/i)
  })

  it('keeps shadows described as dense and readable, not underexposed', () => {
    const block = buildColorDirectionBlock('story-1:frame-1')
    expect(block).toMatch(/Shadows keep density and readable detail/)
  })

  it('instructs avoiding bright/neon/pastel colours', () => {
    const block = buildColorDirectionBlock('story-1:frame-1')
    expect(block).toMatch(/Avoid bright primaries, pastel grading, neon dominance, flat monochrome/)
  })

  it('varies the palette family across seeds while keeping the same grammar', () => {
    const blocks = Array.from({ length: 12 }, (_value, index) =>
      buildColorDirectionBlock(`story:${index}`),
    )
    const paletteLines = new Set(blocks.map((block) => block.split('\n').at(-1)))
    const grammarLines = new Set(blocks.map((block) => block.split('\n').slice(0, -1).join('\n')))
    expect(paletteLines.size).toBeGreaterThan(1)
    expect(grammarLines.size).toBe(1)
  })

  it('is deterministic for a given seed', () => {
    const first = buildColorDirectionBlock('story-9:frame-3')
    const second = buildColorDirectionBlock('story-9:frame-3')
    expect(first).toBe(second)
  })

  it('does not depend on any perceptual/audio state (no such parameter exists)', () => {
    expect(buildColorDirectionBlock.length).toBe(1)
  })
})
