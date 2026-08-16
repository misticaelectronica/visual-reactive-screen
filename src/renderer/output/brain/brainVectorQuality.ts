import { sanitizeBrainSvg } from './sanitizeBrainSvg'
import { getBrainRenderingConfig } from './brainRenderingConfig'
import { brainWarn } from './brainLog'
import type { BrainRasterPixels } from '@shared/types'

const DRAWABLE_SELECTOR = 'path,circle,ellipse,rect,line,polyline,polygon'
const COLOR_PATTERN = /^(?:#[0-9a-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-z]+)$/i

export type BrainVectorQuality = {
  accepted: boolean
  issues: string[]
  svgLength: number
  drawableCount: number
  pathCount: number
  pathCommands: number
  colorCount: number
  viewBox: [number, number, number, number] | null
}

function viewBoxOf(root: Element): [number, number, number, number] | null {
  const values = (root.getAttribute('viewBox') ?? '')
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) return null
  const [x, y, width, height] = values
  return width > 0 && height > 0 ? [x, y, width, height] : null
}

export function inspectBrainVector(markup: string): BrainVectorQuality {
  const issues: string[] = []
  if (/<(?:image|foreignObject|script|text)\b/i.test(markup)) {
    issues.push('contiene elementi raster, testo o codice non ammessi')
  }
  const documentNode = new DOMParser().parseFromString(markup, 'image/svg+xml')
  const root = documentNode.documentElement
  if (documentNode.querySelector('parsererror') || root.localName !== 'svg') {
    return {
      accepted: false,
      issues: [...issues, 'SVG non valido'],
      svgLength: markup.length,
      drawableCount: 0,
      pathCount: 0,
      pathCommands: 0,
      colorCount: 0,
      viewBox: null,
    }
  }

  const drawables = Array.from(root.querySelectorAll(DRAWABLE_SELECTOR))
  const paths = Array.from(root.querySelectorAll('path'))
  const pathCommands = paths.reduce(
    (sum, path) => sum + (path.getAttribute('d')?.match(/[a-df-z]/gi)?.length ?? 0),
    0,
  )
  const colors = new Set<string>()
  for (const element of Array.from(root.querySelectorAll('*'))) {
    for (const attribute of ['fill', 'stroke']) {
      const value = element.getAttribute(attribute)?.trim().toLowerCase()
      if (value && value !== 'none' && value !== 'transparent' && COLOR_PATTERN.test(value)) {
        colors.add(value)
      }
    }
  }
  const viewBox = viewBoxOf(root)

  if (markup.length < 2_500) issues.push('vettorializzazione troppo povera')
  if (markup.length > 600_000) issues.push('SVG troppo pesante per il rendering live')
  if (!viewBox) issues.push('viewBox assente o non valido')
  if (drawables.length < 5) issues.push('meno di cinque forme riconoscibili')
  if (drawables.length > 180) issues.push('troppe forme per il rendering live')
  if (paths.length < 4) issues.push('numero di tracciati insufficiente')
  // Questo controllo resta una barriera strutturale, non una misura estetica:
  // premiare molti comandi favorirebbe proprio la frammentazione da eliminare.
  if (pathCommands < 12) issues.push('geometria vettoriale incompleta')
  if (colors.size < 3) issues.push('gamma cromatica insufficiente')

  return {
    accepted: issues.length === 0,
    issues,
    svgLength: markup.length,
    drawableCount: drawables.length,
    pathCount: paths.length,
    pathCommands,
    colorCount: colors.size,
    viewBox,
  }
}

export interface PsychedelVectorizer {
  vectorize(blob: Blob): Promise<{
    svg: string
    quality: BrainVectorQuality
    durationMs: number
    profile?: string
    detectedSpikes?: number
    contourRoughness?: number
    cornerDensityBefore?: number
    cornerDensity?: number
    smoothedPathCount?: number
    maximumSmoothingDeviation?: number
  }>
}

async function rasterPixels(blob: Blob): Promise<BrainRasterPixels> {
  const bitmap = await createImageBitmap(blob)
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Canvas 2D non disponibile')
    context.drawImage(bitmap, 0, 0)
    const image = context.getImageData(0, 0, bitmap.width, bitmap.height)
    return {
      rgba: new Uint8Array(image.data),
      width: bitmap.width,
      height: bitmap.height,
    }
  } finally {
    bitmap.close()
  }
}

export class BrainVectorizer implements PsychedelVectorizer {
  async vectorize(blob: Blob) {
    const api = window.fxOutput
    if (!api?.vectorizeBrainImage) {
      throw new Error('Servizio di vettorializzazione Brain non disponibile nel preload')
    }
    let source: Uint8Array | BrainRasterPixels
    try {
      source = await rasterPixels(blob)
    } catch (error) {
      brainWarn(
        'vettorializzazione',
        'pretrattamento raster non disponibile; uso il file codificato',
        error,
      )
      source = new Uint8Array(await blob.arrayBuffer())
    }
    const result = await api.vectorizeBrainImage(
      source,
      getBrainRenderingConfig().vectorization,
    )
    if (!result.ok) throw new Error(`Vettorializzazione fallita: ${result.error}`)

    const quality = inspectBrainVector(result.svg)
    if (!quality.accepted) {
      throw new Error(`SVG rifiutato dal controllo qualità: ${quality.issues.join('; ')}`)
    }
    const svg = sanitizeBrainSvg(result.svg)
    if (!svg) throw new Error('SVG rifiutato dalla sanitizzazione')
    return {
      svg,
      quality,
      durationMs: result.durationMs,
      profile: result.profile,
      detectedSpikes: result.detectedSpikes,
      contourRoughness: result.contourRoughness,
      cornerDensityBefore: result.cornerDensityBefore,
      cornerDensity: result.cornerDensity,
      smoothedPathCount: result.smoothedPathCount,
      maximumSmoothingDeviation: result.maximumSmoothingDeviation,
    }
  }
}
