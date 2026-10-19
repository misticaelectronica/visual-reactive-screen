// Colori dominanti di una cattura dello schermo di output (modalità
// «schermo»). Analisi propria del modulo luci: ha la stessa idea di
// `brainDmxRasterColors` (gruppi a 3 bit per canale, tinte distinte) ma vive
// qui, perché il modulo DMX non importa nulla da Brain.

const SHIFT = 5
const ACHROMATIC_SATURATION = 0.1
const MIN_HUE_DISTANCE = 30

const hex = (value: number) => Math.round(value).toString(16).padStart(2, '0')

function hue(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b)
  const delta = max - Math.min(r, g, b)
  if (delta === 0) return 0
  const h = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4
  return (h * 60 + 360) % 360
}

function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b)
  return max === 0 ? 0 : (max - Math.min(r, g, b)) / max
}

// Ordinati per area: sullo schermo conta ciò che occupa più spazio, buio
// compreso. Un colore entra solo se la sua tinta dista almeno 30° da quelle
// già scelte; al massimo un grigio/nero.
export function screenDominantColors(pixels: Uint8Array | Uint8ClampedArray, count: number): string[] {
  const bins = new Map<number, { n: number; r: number; g: number; b: number }>()
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2]
    const key = ((r >> SHIFT) << 6) | ((g >> SHIFT) << 3) | (b >> SHIFT)
    const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }
    bin.n += 1; bin.r += r; bin.g += g; bin.b += b
    bins.set(key, bin)
  }
  const groups = [...bins.values()]
    .map(bin => {
      const r = bin.r / bin.n, g = bin.g / bin.n, b = bin.b / bin.n
      return { n: bin.n, r, g, b, s: saturation(r, g, b), h: hue(r, g, b) }
    })
    .sort((a, b) => b.n - a.n)
  const chosen: typeof groups = []
  for (const group of groups) {
    if (chosen.length >= count) break
    const achromatic = group.s < ACHROMATIC_SATURATION
    const clash = chosen.some(other => {
      const otherAchromatic = other.s < ACHROMATIC_SATURATION
      if (achromatic || otherAchromatic) return achromatic && otherAchromatic
      const distance = Math.abs(group.h - other.h)
      return Math.min(distance, 360 - distance) < MIN_HUE_DISTANCE
    })
    if (!clash) chosen.push(group)
  }
  return chosen.map(group => `#${hex(group.r)}${hex(group.g)}${hex(group.b)}`)
}
