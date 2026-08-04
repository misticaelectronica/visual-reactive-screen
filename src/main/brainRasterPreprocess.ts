export type BrainRasterPreprocessOptions = {
  spatialCleanupPasses: number
  denoiseRadius: number
  denoiseStrength: number
  localContrast: number
  colorSeparation: number
  minimumEdgeRetention: number
}

function byte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function luminance(rgba: Uint8Array, offset: number): number {
  return rgba[offset] * 0.2126 + rgba[offset + 1] * 0.7152 + rgba[offset + 2] * 0.0722
}

function edgeMagnitude(
  rgba: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
): number {
  const left = (y * width + Math.max(0, x - 1)) * 4
  const right = (y * width + Math.min(width - 1, x + 1)) * 4
  const top = (Math.max(0, y - 1) * width + x) * 4
  const bottom = (Math.min(height - 1, y + 1) * width + x) * 4
  return Math.hypot(
    luminance(rgba, right) - luminance(rgba, left),
    luminance(rgba, bottom) - luminance(rgba, top),
  )
}

export function measureRasterEdgeRetention(
  source: Uint8Array,
  processed: Uint8Array,
  width: number,
  height: number,
): number {
  let sourceEdgeWeight = 0
  let retainedEdgeWeight = 0
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const sourceEdge = edgeMagnitude(source, width, height, x, y)
      if (sourceEdge < 8) continue
      const processedEdge = edgeMagnitude(processed, width, height, x, y)
      sourceEdgeWeight += sourceEdge
      retainedEdgeWeight += sourceEdge * Math.min(1, processedEdge / sourceEdge)
    }
  }
  return sourceEdgeWeight > 0 ? retainedEdgeWeight / sourceEdgeWeight : 1
}

function edgePreservingSmooth(
  rgba: Uint8Array,
  width: number,
  height: number,
  radius: number,
  strength: number,
): Uint8Array {
  const output = new Uint8Array(rgba.length)
  const rangeSigma = 26 + strength * 18
  const rangeLimit = rangeSigma * rangeSigma * 3
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4
      const centerR = rgba[offset]
      const centerG = rgba[offset + 1]
      const centerB = rgba[offset + 2]
      let red = 0
      let green = 0
      let blue = 0
      let totalWeight = 0
      for (let dy = -radius; dy <= radius; dy++) {
        const sampleY = Math.max(0, Math.min(height - 1, y + dy))
        for (let dx = -radius; dx <= radius; dx++) {
          const sampleX = Math.max(0, Math.min(width - 1, x + dx))
          const sampleOffset = (sampleY * width + sampleX) * 4
          const deltaR = rgba[sampleOffset] - centerR
          const deltaG = rgba[sampleOffset + 1] - centerG
          const deltaB = rgba[sampleOffset + 2] - centerB
          const rangeDistance = deltaR * deltaR + deltaG * deltaG + deltaB * deltaB
          if (rangeDistance >= rangeLimit) continue
          const spatialDistance = dx * dx + dy * dy
          const spatialWeight = 1 / (1 + spatialDistance)
          const weight = spatialWeight * (1 - rangeDistance / rangeLimit)
          red += rgba[sampleOffset] * weight
          green += rgba[sampleOffset + 1] * weight
          blue += rgba[sampleOffset + 2] * weight
          totalWeight += weight
        }
      }
      output[offset] = byte(centerR + (red / totalWeight - centerR) * strength)
      output[offset + 1] = byte(centerG + (green / totalWeight - centerG) * strength)
      output[offset + 2] = byte(centerB + (blue / totalWeight - centerB) * strength)
      output[offset + 3] = rgba[offset + 3]
    }
  }
  return output
}

function photographicTracingFinish(
  rgba: Uint8Array,
  width: number,
  height: number,
  localContrast: number,
  colorSeparation: number,
): Uint8Array {
  if (localContrast <= 0 && colorSeparation <= 0) return rgba
  const output = new Uint8Array(rgba.length)
  const radius = 2
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4
      let localLuminance = 0
      let samples = 0
      for (let dy = -radius; dy <= radius; dy++) {
        const sampleY = Math.max(0, Math.min(height - 1, y + dy))
        for (let dx = -radius; dx <= radius; dx++) {
          const sampleX = Math.max(0, Math.min(width - 1, x + dx))
          localLuminance += luminance(
            rgba,
            (sampleY * width + sampleX) * 4,
          )
          samples += 1
        }
      }
      const pixelLuminance = luminance(rgba, offset)
      const contrastOffset =
        (pixelLuminance - localLuminance / samples) * localContrast
      for (let channel = 0; channel < 3; channel++) {
        const contrasted = rgba[offset + channel] + contrastOffset
        const separated =
          pixelLuminance +
          (contrasted - pixelLuminance) * (1 + colorSeparation)
        output[offset + channel] = byte(separated)
      }
      output[offset + 3] = rgba[offset + 3]
    }
  }
  return output
}

export function preprocessBrainRaster(
  rgba: Uint8Array,
  width: number,
  height: number,
  options: BrainRasterPreprocessOptions,
): Uint8Array {
  if (width <= 0 || height <= 0 || rgba.length !== width * height * 4) {
    throw new Error('Raster RGBA non valido per il pretrattamento')
  }

  // La quantizzazione cromatica avviene una sola volta dentro VTracer.
  // Qui togliamo esclusivamente rumore locale senza riclassificare i pixel.
  let processed: Uint8Array<ArrayBufferLike> = new Uint8Array(rgba)
  const passes = Math.max(0, Math.min(2, Math.round(options.spatialCleanupPasses)))
  const radius = Math.max(1, Math.min(3, Math.round(options.denoiseRadius)))
  const strength = Math.max(0, Math.min(1, options.denoiseStrength))
  for (let pass = 0; pass < passes; pass++) {
    processed = edgePreservingSmooth(
      processed,
      width,
      height,
      radius,
      strength,
    )
  }
  processed = photographicTracingFinish(
    processed,
    width,
    height,
    Math.max(0, Math.min(0.6, options.localContrast)),
    Math.max(0, Math.min(0.5, options.colorSeparation)),
  )

  // Se anche la pulizia conservativa cancella una parte significativa dei
  // bordi, usiamo direttamente l'originale: una forma persa non è recuperabile
  // nelle fasi successive di tracing e arrotondamento.
  return measureRasterEdgeRetention(rgba, processed, width, height) >=
    Math.max(0.7, Math.min(1, options.minimumEdgeRetention))
    ? processed
    : new Uint8Array(rgba)
}
