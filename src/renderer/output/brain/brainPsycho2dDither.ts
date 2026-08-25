type Rgb = readonly [number, number, number]

export type Psycho2DTextureBand = 'beat' | 'lowMid' | 'mid' | 'high'

export const PSYCHO2D_TEXTURE_BANDS: readonly Psycho2DTextureBand[] = [
  'beat',
  'lowMid',
  'mid',
  'high',
]

const PSYCHO2D_TEXTURE_SEQUENCE: readonly Psycho2DTextureBand[] = [
  'beat',
  'lowMid',
  'beat',
  'mid',
  'beat',
  'high',
]

const BAYER_4X4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
] as const

function clamp(value: number, minimum = 0, maximum = 255): number {
  return Math.max(minimum, Math.min(maximum, value))
}

function parseHexColor(value: string): Rgb | null {
  const normalized = value.trim().replace(/^#/, '')
  if (!/^[\da-f]{6}$/i.test(normalized)) return null
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ]
}

function luminance(color: Rgb): number {
  return color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722
}

function textureThreshold(
  x: number,
  y: number,
  texture: Psycho2DTextureBand,
): number {
  const bayer = BAYER_4X4[(y % 4) * 4 + (x % 4)] - 7.5
  if (texture === 'lowMid') {
    const weave = (Math.floor(x / 2) + Math.floor(y / 4)) % 2 === 0 ? -1 : 1
    return bayer * 2.8 + weave * 18
  }
  if (texture === 'mid') {
    const diagonal = ((x + y * 2) % 9) - 4
    return bayer * 2.2 + diagonal * 6
  }
  if (texture === 'high') {
    const grain = ((Math.imul(x + 11, 37) ^ Math.imul(y + 7, 53)) & 15) - 7.5
    return bayer * 1.5 + grain * 4.2
  }
  return bayer * 5
}

export function selectPsycho2dTextureBand(beatIndex: number): Psycho2DTextureBand {
  const index = Math.abs(Math.trunc(beatIndex)) % PSYCHO2D_TEXTURE_SEQUENCE.length
  return PSYCHO2D_TEXTURE_SEQUENCE[index]
}

export function choosePsycho2dInkPalette(colors: readonly string[]): {
  dark: Rgb
  light: Rgb
} {
  const parsed = colors.map(parseHexColor).filter((color): color is Rgb => color !== null)
  if (parsed.length === 0) return { dark: [8, 8, 10], light: [238, 236, 222] }
  const ordered = [...parsed].sort((left, right) => luminance(left) - luminance(right))
  return {
    dark: ordered[0],
    light: ordered.at(-1) ?? ordered[0],
  }
}

export function ditherPsycho2dPixels(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  dark: Rgb,
  light: Rgb,
  thresholdOffset = 0,
  texture: Psycho2DTextureBand = 'beat',
): Uint8ClampedArray {
  if (width <= 0 || height <= 0 || rgba.length !== width * height * 4) {
    return new Uint8ClampedArray()
  }
  const output = new Uint8ClampedArray(rgba.length)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4
      const sourceLuminance =
        rgba[offset] * 0.2126 +
        rgba[offset + 1] * 0.7152 +
        rgba[offset + 2] * 0.0722
      const orderedThreshold =
        128 + thresholdOffset + textureThreshold(x, y, texture)
      const color = sourceLuminance < clamp(orderedThreshold) ? dark : light
      output[offset] = color[0]
      output[offset + 1] = color[1]
      output[offset + 2] = color[2]
      output[offset + 3] = 255
    }
  }
  return output
}

export function selectPsycho2dDensityVariant(
  lowMid: number,
  lowMidTransient: number,
  beatPulse = 0,
): 0 | 1 | 2 {
  const drive = Math.max(
    0,
    Math.min(1, lowMid * 0.72 + lowMidTransient * 1.1 + beatPulse * 0.82),
  )
  if (drive >= 0.58) return 2
  if (drive >= 0.2) return 1
  return 0
}
