export type Psycho2DAnalysisSource = 'pixels' | 'narrative' | 'fallback'

export type Psycho2DRegion = {
  x: number
  y: number
  width: number
  height: number
  score: number
  source: Psycho2DAnalysisSource
}

export type Psycho2DImageAnalysis = {
  version: 1
  imageId: string
  aspectRatio: number
  focalRegion: Psycho2DRegion
  protectedRegions: Psycho2DRegion[]
  overlayRegions: Psycho2DRegion[]
  detailCrops: Psycho2DRegion[]
  dominantAxis: 'horizontal' | 'vertical' | 'diagonal' | 'neutral'
  palette: string[]
  luminance: number
  contrast: number
  narrativeHints: string[]
}

type Cell = Psycho2DRegion & { edge: number; luminance: number }

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value))
}

function byteHex(value: number): string {
  return Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0')
}

function regionAround(
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  score: number,
): Psycho2DRegion {
  return {
    x: clamp(centerX - width / 2, 0, 1 - width),
    y: clamp(centerY - height / 2, 0, 1 - height),
    width,
    height,
    score: clamp(score),
    source: 'pixels',
  }
}

function overlaps(left: Psycho2DRegion, right: Psycho2DRegion): boolean {
  return !(
    left.x + left.width <= right.x ||
    right.x + right.width <= left.x ||
    left.y + left.height <= right.y ||
    right.y + right.height <= left.y
  )
}

export function analyzePsycho2dPixels(
  imageId: string,
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  narrativeHints: readonly string[] = [],
): Psycho2DImageAnalysis {
  if (width <= 1 || height <= 1 || rgba.length !== width * height * 4) {
    const fallback = regionAround(0.5, 0.5, 0.34, 0.42, 0.5)
    return {
      version: 1,
      imageId,
      aspectRatio: width > 0 && height > 0 ? width / height : 16 / 9,
      focalRegion: { ...fallback, source: 'fallback' },
      protectedRegions: [{ ...fallback, source: 'fallback' }],
      overlayRegions: [
        { x: 0.04, y: 0.18, width: 0.28, height: 0.46, score: 0.3, source: 'fallback' },
      ],
      detailCrops: [{ ...fallback, source: 'fallback' }],
      dominantAxis: 'neutral',
      palette: ['#181018', '#d8cad8'],
      luminance: 0.25,
      contrast: 0.5,
      narrativeHints: narrativeHints.filter(Boolean).slice(0, 3),
    }
  }

  const columns = 4
  const rows = 3
  const cells: Cell[] = []
  const paletteBuckets = new Map<number, { red: number; green: number; blue: number; count: number }>()
  let luminanceTotal = 0
  let luminanceSquaredTotal = 0
  let horizontalGradient = 0
  let verticalGradient = 0
  let samples = 0

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const startX = Math.floor(column * width / columns)
      const endX = Math.max(startX + 1, Math.floor((column + 1) * width / columns))
      const startY = Math.floor(row * height / rows)
      const endY = Math.max(startY + 1, Math.floor((row + 1) * height / rows))
      let cellEdge = 0
      let cellLuminance = 0
      let cellSamples = 0
      for (let y = startY; y < Math.min(height, endY); y += 2) {
        for (let x = startX; x < Math.min(width, endX); x += 2) {
          const offset = (y * width + x) * 4
          const red = rgba[offset]
          const green = rgba[offset + 1]
          const blue = rgba[offset + 2]
          const luminance = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255
          const rightX = Math.min(width - 1, x + 2)
          const bottomY = Math.min(height - 1, y + 2)
          const rightOffset = (y * width + rightX) * 4
          const bottomOffset = (bottomY * width + x) * 4
          const rightLuminance = (
            rgba[rightOffset] * 0.2126 +
            rgba[rightOffset + 1] * 0.7152 +
            rgba[rightOffset + 2] * 0.0722
          ) / 255
          const bottomLuminance = (
            rgba[bottomOffset] * 0.2126 +
            rgba[bottomOffset + 1] * 0.7152 +
            rgba[bottomOffset + 2] * 0.0722
          ) / 255
          const gradientX = Math.abs(rightLuminance - luminance)
          const gradientY = Math.abs(bottomLuminance - luminance)
          horizontalGradient += gradientX
          verticalGradient += gradientY
          const edge = Math.hypot(gradientX, gradientY)
          cellEdge += edge
          cellLuminance += luminance
          luminanceTotal += luminance
          luminanceSquaredTotal += luminance * luminance
          cellSamples += 1
          samples += 1
          const bucket = (Math.round(red / 64) << 8) | (Math.round(green / 64) << 4) | Math.round(blue / 64)
          const entry = paletteBuckets.get(bucket) ?? { red: 0, green: 0, blue: 0, count: 0 }
          entry.red += red
          entry.green += green
          entry.blue += blue
          entry.count += 1
          paletteBuckets.set(bucket, entry)
        }
      }
      const averageEdge = cellEdge / Math.max(1, cellSamples)
      const averageLuminance = cellLuminance / Math.max(1, cellSamples)
      const centerBias = 1 - Math.hypot(
        (column + 0.5) / columns - 0.5,
        (row + 0.5) / rows - 0.5,
      ) * 0.45
      cells.push({
        x: column / columns,
        y: row / rows,
        width: 1 / columns,
        height: 1 / rows,
        score: clamp((averageEdge * 2.8 + averageLuminance * 0.22) * centerBias),
        edge: averageEdge,
        luminance: averageLuminance,
        source: 'pixels',
      })
    }
  }

  const focalCell = [...cells].sort((left, right) => right.score - left.score)[0]
  const focalRegion = regionAround(
    focalCell.x + focalCell.width / 2,
    focalCell.y + focalCell.height / 2,
    0.34,
    0.42,
    focalCell.score,
  )
  const overlayRegions = [...cells]
    .filter((cell) => !overlaps(cell, focalRegion))
    .sort((left, right) => (left.edge + left.luminance * 0.12) - (right.edge + right.luminance * 0.12))
    .slice(0, 3)
    .map((cell) => regionAround(
      cell.x + cell.width / 2,
      cell.y + cell.height / 2,
      0.27,
      0.4,
      1 - cell.score,
    ))
  const averageLuminance = luminanceTotal / Math.max(1, samples)
  const variance = luminanceSquaredTotal / Math.max(1, samples) - averageLuminance * averageLuminance
  const palette = [...paletteBuckets.values()]
    .sort((left, right) => right.count - left.count)
    .slice(0, 5)
    .map((entry) => `#${byteHex(entry.red / entry.count)}${byteHex(entry.green / entry.count)}${byteHex(entry.blue / entry.count)}`)

  const gradientRatio = horizontalGradient / Math.max(0.0001, verticalGradient)
  const dominantAxis = gradientRatio > 1.35
    ? 'vertical'
    : gradientRatio < 0.74
      ? 'horizontal'
      : Math.abs(gradientRatio - 1) < 0.12
        ? 'neutral'
        : 'diagonal'

  return {
    version: 1,
    imageId,
    aspectRatio: width / height,
    focalRegion,
    protectedRegions: [focalRegion],
    overlayRegions: overlayRegions.length > 0
      ? overlayRegions
      : [{ x: 0.04, y: 0.2, width: 0.27, height: 0.4, score: 0.25, source: 'fallback' }],
    detailCrops: [regionAround(
      focalRegion.x + focalRegion.width / 2,
      focalRegion.y + focalRegion.height / 2,
      0.38,
      0.48,
      focalRegion.score,
    )],
    dominantAxis,
    palette: palette.length >= 2 ? palette : ['#181018', '#d8cad8'],
    luminance: clamp(averageLuminance),
    contrast: clamp(Math.sqrt(Math.max(0, variance)) * 3.2),
    narrativeHints: narrativeHints.filter(Boolean).slice(0, 3),
  }
}
