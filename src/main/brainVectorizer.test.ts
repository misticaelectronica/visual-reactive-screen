import { describe, expect, it } from 'vitest'
import { normalizeVTracerSvg, vectorizeBrainImage } from './brainVectorizer'

const ONE_PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

describe('Brain vectorizer IPC core', () => {
  it('converte realmente un PNG codificato in SVG', () => {
    const result = vectorizeBrainImage(Uint8Array.from(Buffer.from(ONE_PIXEL_PNG, 'base64')))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.svg).toContain('<svg')
      expect(result.svg).toContain('viewBox="0 0 1 1"')
      expect(result.profile).toBeTruthy()
      expect(result.sourceBytes).toBeGreaterThan(0)
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    }
  })

  it('deriva il viewBox dalle dimensioni prodotte da VTracer', () => {
    const svg =
      '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="512" height="384"><path d="M0 0"/></svg>'
    expect(normalizeVTracerSvg(svg)).toContain('viewBox="0 0 512 384"')
  })

  it('conserva un viewBox già presente', () => {
    const svg = '<svg width="512" height="512" viewBox="10 20 300 400"></svg>'
    expect(normalizeVTracerSvg(svg)).toBe(svg)
  })

  it('rifiuta byte che non rappresentano PNG o JPEG', () => {
    expect(vectorizeBrainImage(new Uint8Array([1, 2, 3, 4]))).toEqual({
      ok: false,
      error: 'Formato raster non supportato: attesi PNG o JPEG',
    })
  })
})
