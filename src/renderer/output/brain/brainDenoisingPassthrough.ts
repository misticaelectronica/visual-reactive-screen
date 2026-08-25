import type { AppSettings, BandEnergies } from '@shared/types'
import { BRAIN_CONFIG } from '@shared/brain/brainConfig'
import type { DreamStory } from '@shared/brain/brainTypes'
import type { BrainRhythmState } from './brainRhythm'
import { brainPerformanceMetrics } from './brainPerformanceMetrics'
import {
  choosePsycho2dInkPalette,
  ditherPsycho2dPixels,
  selectPsycho2dDensityVariant,
} from './brainPsycho2dDither'

const DITHER_THRESHOLDS = [-30, 0, 32] as const
const INVERSION_HOLD_MS = 85

export type BrainDenoisingPassthrough = {
  element: HTMLElement
  isReady: () => boolean
  setOpacity: (opacity: number) => void
  update: (
    bands: BandEnergies,
    settings: AppSettings,
    time: number,
    rhythm?: BrainRhythmState,
  ) => void
  destroy: () => void
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value))
}

function createVariant(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  palette: readonly string[],
  threshold: number,
): HTMLCanvasElement {
  const variant = document.createElement('canvas')
  variant.width = width
  variant.height = height
  const context = variant.getContext('2d')
  if (!context) return variant
  const ink = choosePsycho2dInkPalette(palette)
  const imageData = context.createImageData(width, height)
  imageData.data.set(ditherPsycho2dPixels(
    pixels,
    width,
    height,
    ink.dark,
    ink.light,
    threshold,
  ))
  context.putImageData(imageData, 0, 0)
  return variant
}

export function createBrainDenoisingPassthrough(
  container: HTMLElement,
  raster: Blob,
  storyPalette: DreamStory['palette'],
): BrainDenoisingPassthrough {
  const width = BRAIN_CONFIG.denoisingPassthroughWidth
  const height = BRAIN_CONFIG.denoisingPassthroughHeight
  const root = document.createElement('div')
  root.dataset.brainDenoisingPassthrough = 'true'
  root.setAttribute('aria-hidden', 'true')
  Object.assign(root.style, {
    position: 'absolute',
    inset: '0',
    opacity: '0',
    zIndex: '2',
    pointerEvents: 'none',
    overflow: 'hidden',
  })
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    imageRendering: 'pixelated',
  })
  const context = canvas.getContext('2d', { alpha: false })
  root.appendChild(canvas)
  container.appendChild(root)

  let destroyed = false
  let sourcePixels: Uint8ClampedArray | null = null
  let variants: [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement] | null = null
  let paletteSignature = ''
  let lastRenderedAt = Number.NEGATIVE_INFINITY
  let inversionUntil = Number.NEGATIVE_INFINITY
  let lastInvertedBeatIndex = -1

  if (typeof createImageBitmap === 'function') {
    void createImageBitmap(raster).then((bitmap) => {
      const source = document.createElement('canvas')
      source.width = width
      source.height = height
      const sourceContext = source.getContext('2d', { willReadFrequently: true })
      if (destroyed || !sourceContext) {
        bitmap.close()
        return
      }
      const scale = Math.max(width / bitmap.width, height / bitmap.height)
      const drawWidth = bitmap.width * scale
      const drawHeight = bitmap.height * scale
      sourceContext.drawImage(
        bitmap,
        (width - drawWidth) * 0.5,
        (height - drawHeight) * 0.5,
        drawWidth,
        drawHeight,
      )
      sourcePixels = new Uint8ClampedArray(
        sourceContext.getImageData(0, 0, width, height).data,
      )
      bitmap.close()
      source.width = 1
      source.height = 1
    }).catch(() => {
      sourcePixels = null
    })
  }

  const releaseVariants = (): void => {
    variants?.forEach((variant) => {
      variant.width = 1
      variant.height = 1
    })
    variants = null
  }

  return {
    element: root,
    isReady: () => sourcePixels !== null && context !== null,
    setOpacity(opacity) {
      root.style.opacity = String(clamp(opacity))
    },
    update(bands, settings, time, rhythm) {
      if (destroyed || !context || !sourcePixels) return
      const frameInterval = settings.lowPowerMode
        ? 1_000 / BRAIN_CONFIG.lowPowerDenoisingPassthroughFps
        : 1_000 / BRAIN_CONFIG.denoisingPassthroughFps
      if (time - lastRenderedAt < frameInterval) return
      lastRenderedAt = time
      const startedAt = performance.now()
      const activePalette = [
        ...storyPalette,
        settings.idleColor,
        settings.basePinkColor,
        settings.hotPinkColor,
        settings.whiteFlashColor,
      ]
      const nextSignature = activePalette.join(':')
      if (nextSignature !== paletteSignature || !variants) {
        releaseVariants()
        paletteSignature = nextSignature
        variants = DITHER_THRESHOLDS.map((threshold) => createVariant(
          sourcePixels as Uint8ClampedArray,
          width,
          height,
          activePalette,
          threshold,
        )) as [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement]
      }

      const density = selectPsycho2dDensityVariant(
        bands.lowMid,
        rhythm?.bandTransients.lowMid ?? 0,
      )
      const artwork = variants[density]
      context.imageSmoothingEnabled = false
      context.globalCompositeOperation = 'source-over'
      context.globalAlpha = 1
      context.drawImage(artwork, 0, 0, width, height)

      const glitchDrive = clamp(
        (rhythm?.bandTransients.mid ?? 0) * 0.85 +
        (rhythm?.bandTransients.high ?? 0) * 1.2 +
        bands.high * 0.22,
      )
      const sliceCount = glitchDrive > 0.02
        ? settings.lowPowerMode ? 1 : 3
        : 0
      for (let index = 0; index < sliceCount; index += 1) {
        const sliceHeight = Math.max(2, Math.round(height * (0.025 + glitchDrive * 0.04)))
        const sourceY = (
          ((rhythm?.beatIndex ?? 0) * 37 + index * 53 + density * 19) %
          Math.max(1, height - sliceHeight)
        )
        const direction = index % 2 === 0 ? 1 : -1
        const offset = direction * Math.round(width * (0.003 + glitchDrive * 0.012))
        context.drawImage(
          artwork,
          0,
          sourceY,
          width,
          sliceHeight,
          offset,
          sourceY,
          width,
          sliceHeight,
        )
      }

      if (
        rhythm?.beat &&
        rhythm.beatIndex !== lastInvertedBeatIndex &&
        bands.low >= 0.06
      ) {
        lastInvertedBeatIndex = rhythm.beatIndex
        inversionUntil = time + INVERSION_HOLD_MS
      }
      if (time < inversionUntil) {
        context.globalCompositeOperation = 'difference'
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, width, height)
      }
      context.globalCompositeOperation = 'source-over'
      root.dataset.brainDenoisingStyle = `one-bit-${density}`
      brainPerformanceMetrics.recordDenoisingPassthroughFrame(
        time,
        performance.now() - startedAt,
      )
    },
    destroy() {
      destroyed = true
      sourcePixels = null
      releaseVariants()
      canvas.width = 1
      canvas.height = 1
      root.remove()
    },
  }
}
