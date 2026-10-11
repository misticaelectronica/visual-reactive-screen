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

// Sotto questa saturazione la tinta non è affidabile: il colore resta
// com'è (luce bianca) invece di inventarne una.
const ACHROMATIC_SATURATION = 0.1
// Effetto scenico (Capo Supremo 2026-10-11): i raster nascono poco saturi e
// su un PAR RGB un colore pallido diventa bianco. Saturazione minima e
// luminosità piena; l'intensità resta al master e al ritmo.
const STAGE_MIN_SATURATION = 0.8
// I gruppi più estesi sono spesso sfumature della stessa tinta: dopo la
// saturazione diventano lo stesso colore (log 2026-10-11: #33b3ff #33caff
// #33beff #33b4ff). Un colore entra solo se la sua tinta dista almeno
// tanto da quelle già scelte; al massimo un bianco.
const MIN_HUE_DISTANCE = 30

const hex = (value: number) => Math.round(value).toString(16).padStart(2, '0')

function hue(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b)
  const delta = max - Math.min(r, g, b)
  if (delta === 0) return 0
  const h = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4
  return (h * 60 + 360) % 360
}

function distinctHues(groups: Array<{ r: number; g: number; b: number; s: number }>, count: number) {
  const chosen: typeof groups = []
  for (const group of groups) {
    if (chosen.length >= count) break
    const achromatic = group.s < ACHROMATIC_SATURATION
    const clash = chosen.some(other => {
      const otherAchromatic = other.s < ACHROMATIC_SATURATION
      if (achromatic || otherAchromatic) return achromatic && otherAchromatic
      const distance = Math.abs(hue(group.r, group.g, group.b) - hue(other.r, other.g, other.b))
      return Math.min(distance, 360 - distance) < MIN_HUE_DISTANCE
    })
    if (!clash) chosen.push(group)
  }
  return chosen
}

function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b)
  return max === 0 ? 0 : (max - Math.min(r, g, b)) / max
}

export function stageColor(r: number, g: number, b: number): string {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const s = saturation(r, g, b)
  if (max === 0) return '#000000'
  if (s < ACHROMATIC_SATURATION) return `#${hex(255)}${hex(255)}${hex(255)}`
  // HSV: stessa tinta, saturazione alzata, valore pieno.
  const target = Math.max(s, STAGE_MIN_SATURATION)
  const channel = (c: number) => 255 * (1 - target * (max - c) / (max - min))
  return `#${hex(channel(r))}${hex(channel(g))}${hex(channel(b))}`
}

// Gruppi di colore pesati per estensione × saturazione × luminosità: domina
// il colore più esteso fra quelli che hanno una tinta visibile, non il
// grigio né il nero di fondo (nei quasi neri la saturazione è rumore). Se
// l'immagine è tutta grigia vale la sola estensione. Ogni gruppo usa la
// media reale dei suoi pixel, poi portata a colore da palco.
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
  const groups = [...bins.values()].map(bin => {
    const r = bin.r / bin.n, g = bin.g / bin.n, b = bin.b / bin.n
    const weight = saturation(r, g, b) * (Math.max(r, g, b) / 255)
    return { n: bin.n, r, g, b, s: saturation(r, g, b), weight }
  })
  const chromatic = groups.some(group => group.s >= ACHROMATIC_SATURATION)
  const ranked = groups.sort((a, b) => (chromatic ? b.n * b.weight - a.n * a.weight : b.n - a.n))
  return distinctHues(ranked, count).map(group => stageColor(group.r, group.g, group.b))
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

// Modalità «render» (disp. Capo Supremo 2026-10-11): colori di ciò che il
// renderer attivo ha appena disegnato. Va chiamata nello stesso frame
// dell'aggiornamento del renderer: un canvas WebGL senza
// preserveDrawingBuffer (ANIMATRONIX) viene svuotato dopo la composizione.
let renderSample: HTMLCanvasElement | null = null

export function renderSurfaceColors(surface: Element, count: number): string[] {
  let largest: HTMLCanvasElement | null = null
  for (const canvas of surface.querySelectorAll('canvas')) {
    if (canvas.width === 0 || canvas.height === 0) continue
    if (!largest || canvas.width * canvas.height > largest.width * largest.height) largest = canvas
  }
  if (!largest) return []
  renderSample ??= Object.assign(document.createElement('canvas'), { width: SAMPLE_WIDTH, height: SAMPLE_HEIGHT })
  const context = renderSample.getContext('2d', { willReadFrequently: true })
  if (!context) return []
  context.drawImage(largest, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT)
  const colors = dominantColors(context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT).data, count)
  // Un buffer vuoto o tutto nero non è un colore del render: si tiene il precedente.
  return colors.every(color => color === '#000000') ? [] : colors
}
