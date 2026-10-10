// Colori dominanti del raster per le luci DMX (PIANO-049, disposizione del
// Capo Supremo 2026-10-11): l'immagine originale di Stable Diffusion, non
// quella trasformata dai renderer. Analisi propria e tarata solo per le
// luci: per la regola di autonomia NON riusa `analyzeMaterialPixels` né
// `extractDeliquescenceColorZones`.

const SAMPLE_WIDTH = 32
const SAMPLE_HEIGHT = 18
// 3 bit per canale: 512 gruppi, abbastanza larghi da riunire le sfumature
// di uno stesso colore.
const SHIFT = 5

const hex = (value: number) => Math.round(value).toString(16).padStart(2, '0')

// Gruppi di colore ordinati per numero di pixel; ogni gruppo restituisce la
// media reale dei suoi pixel, non il centro del gruppo.
export function dominantColors(pixels: Uint8ClampedArray, count: number): string[] {
  const bins = new Map<number, { n: number; r: number; g: number; b: number }>()
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2]
    const key = ((r >> SHIFT) << 6) | ((g >> SHIFT) << 3) | (b >> SHIFT)
    const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }
    bin.n += 1; bin.r += r; bin.g += g; bin.b += b
    bins.set(key, bin)
  }
  return [...bins.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, count)
    .map(bin => `#${hex(bin.r / bin.n)}${hex(bin.g / bin.n)}${hex(bin.b / bin.n)}`)
}

export async function rasterDominantColors(raster: Blob, count: number): Promise<string[]> {
  const bitmap = await createImageBitmap(raster, {
    resizeWidth: SAMPLE_WIDTH,
    resizeHeight: SAMPLE_HEIGHT,
    resizeQuality: 'low',
  })
  try {
    const canvas = new OffscreenCanvas(SAMPLE_WIDTH, SAMPLE_HEIGHT)
    const context = canvas.getContext('2d')
    if (!context) return []
    context.drawImage(bitmap, 0, 0)
    return dominantColors(context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT).data, count)
  } finally {
    bitmap.close()
  }
}
