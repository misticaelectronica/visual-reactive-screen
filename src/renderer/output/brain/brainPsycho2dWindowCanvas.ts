import type { AppSettings, BandEnergies } from '@shared/types'
import type { BrainFrameMorphPattern } from './brainFrameMotion'
import type { BrainRhythmState } from './brainRhythm'
import type { BrainFlashState, BrainSceneRendererController } from './brainSvgScene'
import type { BrainRendererPluginContext, BrainRendererImageSource } from './brainRendererPlugin'
import {
  analyzePsycho2dPixels,
  type Psycho2DImageAnalysis,
  type Psycho2DRegion,
} from './brainPsycho2dAnalysis'
import {
  createPsycho2dScenePlan,
  type Psycho2DDirectorSource,
  type Psycho2DScenePlan,
} from './brainPsycho2dDirector'
import { getBrainRenderingConfig } from './brainRenderingConfig'
import { brainLog, brainWarn } from './brainLog'
import { brainPerformanceMetrics } from './brainPerformanceMetrics'
import {
  choosePsycho2dInkPalette,
  ditherPsycho2dPixels,
  selectPsycho2dDensityVariant,
} from './brainPsycho2dDither'

const ANALYSIS_WIDTH = 160
const ANALYSIS_HEIGHT = 90
const NORMAL_FRAME_INTERVAL_MS = 1_000 / 24
const LOW_POWER_FRAME_INTERVAL_MS = 1_000 / 20
const PRESSURE_FRAME_INTERVAL_MS = 1_000 / 18
const DITHER_WIDTH = 320
const DITHER_HEIGHT = 180
const DITHER_THRESHOLDS = [-30, 0, 32] as const
const INVERSION_HOLD_MS = 85
const BEAT_LATCH_HOLD_MS = 150
const RASTER_UNDERLAY_OPACITY = 0.08

type PreparedSource = {
  source: BrainRendererImageSource
  bitmap: ImageBitmap
  analysis: Psycho2DImageAnalysis
}

type PreparedArtwork = {
  planId: string
  variants: [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement]
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value))
}

function hashText(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function drawCoverCrop(
  context: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  crop: Psycho2DRegion,
  destination: Psycho2DRegion,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const sourceX = clamp(crop.x) * bitmap.width
  const sourceY = clamp(crop.y) * bitmap.height
  const sourceWidth = Math.max(1, clamp(crop.width) * bitmap.width)
  const sourceHeight = Math.max(1, clamp(crop.height) * bitmap.height)
  context.drawImage(
    bitmap,
    sourceX,
    sourceY,
    Math.min(sourceWidth, bitmap.width - sourceX),
    Math.min(sourceHeight, bitmap.height - sourceY),
    destination.x * canvasWidth,
    destination.y * canvasHeight,
    destination.width * canvasWidth,
    destination.height * canvasHeight,
  )
}

function drawDitherSlice(
  context: CanvasRenderingContext2D,
  artwork: HTMLCanvasElement,
  canvasWidth: number,
  canvasHeight: number,
  sourceY: number,
  sliceHeight: number,
  offsetX: number,
): void {
  const normalizedY = clamp(sourceY / Math.max(1, canvasHeight))
  const normalizedHeight = clamp(
    sliceHeight / Math.max(1, canvasHeight),
    1 / DITHER_HEIGHT,
    1,
  )
  const ditherY = Math.min(DITHER_HEIGHT - 1, Math.floor(normalizedY * DITHER_HEIGHT))
  const ditherHeight = Math.max(
    1,
    Math.min(DITHER_HEIGHT - ditherY, Math.ceil(normalizedHeight * DITHER_HEIGHT)),
  )
  const destinationY = ditherY / DITHER_HEIGHT * canvasHeight
  const destinationHeight = ditherHeight / DITHER_HEIGHT * canvasHeight
  context.drawImage(
    artwork,
    0,
    ditherY,
    DITHER_WIDTH,
    ditherHeight,
    offsetX,
    destinationY,
    canvasWidth,
    destinationHeight,
  )
}

const FULL_REGION: Psycho2DRegion = {
  x: 0,
  y: 0,
  width: 1,
  height: 1,
  score: 1,
  source: 'pixels',
}

function analysisForBitmap(
  source: BrainRendererImageSource,
  bitmap: ImageBitmap,
): Psycho2DImageAnalysis {
  const canvas = document.createElement('canvas')
  canvas.width = ANALYSIS_WIDTH
  canvas.height = ANALYSIS_HEIGHT
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    return analyzePsycho2dPixels(source.id, new Uint8ClampedArray(), 0, 0, source.narrativeHints)
  }
  context.drawImage(bitmap, 0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT)
  const pixels = context.getImageData(0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT)
  const analysis = analyzePsycho2dPixels(
    source.id,
    pixels.data,
    ANALYSIS_WIDTH,
    ANALYSIS_HEIGHT,
    source.narrativeHints,
  )
  canvas.width = 1
  canvas.height = 1
  return analysis
}

export function createBrainPsycho2dWindowScene(
  pluginContext: BrainRendererPluginContext,
): BrainSceneRendererController {
  const imageConfig = getBrainRenderingConfig().image
  const canvas = document.createElement('canvas')
  canvas.width = imageConfig.width
  canvas.height = imageConfig.height
  canvas.dataset.brainRenderer = 'psycho2d'
  canvas.setAttribute('aria-hidden', 'true')
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    display: 'block',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    transform: 'translateZ(0)',
  })
  const context = canvas.getContext('2d', { alpha: false })
  pluginContext.container.appendChild(canvas)

  const assets = new Map<string, PreparedSource>()
  const loading = new Set<string>()
  let destroyed = false
  let resourcePressure = false
  let morphPattern: BrainFrameMorphPattern = 'marea'
  let lastSyncAt = Number.NEGATIVE_INFINITY
  let lastRenderedAt = Number.NEGATIVE_INFINITY
  let plan: Psycho2DScenePlan | null = null
  let artwork: PreparedArtwork | null = null
  let inversionUntil = Number.NEGATIVE_INFINITY
  let lastInvertedBeatIndex = -1
  let lastLatchedBeatIndex = -1
  let latchedBeatUntil = Number.NEGATIVE_INFINITY
  let lastBeatPhase = 0
  let transitionProgress = 1
  let transitionRole: 'enter' | 'exit' = 'enter'
  let flashGestureIndex = 0
  let flashWasActive = false

  const releaseArtwork = (): void => {
    if (!artwork) return
    artwork.variants.forEach((variant) => {
      variant.width = 1
      variant.height = 1
    })
    artwork = null
  }

  const invalidatePlan = (): void => {
    plan = null
    releaseArtwork()
  }

  const syncSources = (): void => {
    const requested = pluginContext.getImageSources()
    const requestedIds = new Set(requested.map((source) => source.id))
    for (const [id, prepared] of assets) {
      if (!requestedIds.has(id)) {
        prepared.bitmap.close()
        assets.delete(id)
        invalidatePlan()
      }
    }
    for (const source of requested) {
      if (assets.has(source.id) || loading.has(source.id)) continue
      loading.add(source.id)
      const startedAt = performance.now()
      void createImageBitmap(source.raster).then((bitmap) => {
        if (destroyed || !pluginContext.getImageSources().some((candidate) => candidate.id === source.id)) {
          bitmap.close()
          return
        }
        assets.set(source.id, {
          source,
          bitmap,
          analysis: analysisForBitmap(source, bitmap),
        })
        invalidatePlan()
        brainPerformanceMetrics.recordArtworkPreparation(performance.now() - startedAt)
      }).catch((error) => {
        if (!destroyed) {
          brainWarn('render', 'sorgente Psycho2D non decodificabile', {
            imageId: source.id,
            error,
          })
        }
      }).finally(() => loading.delete(source.id))
    }
  }

  const prepareArtwork = (activePlan: Psycho2DScenePlan): PreparedArtwork | null => {
    const base = assets.get(activePlan.baseImageId)
    if (!base) return null
    const full: Psycho2DRegion = {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      score: 1,
      source: 'pixels',
    }
    const composite = document.createElement('canvas')
    composite.width = DITHER_WIDTH
    composite.height = DITHER_HEIGHT
    const compositeContext = composite.getContext('2d', { willReadFrequently: true })
    if (!compositeContext) return null
    drawCoverCrop(
      compositeContext,
      base.bitmap,
      full,
      full,
      DITHER_WIDTH,
      DITHER_HEIGHT,
    )
    activePlan.windows.slice(0, 1).forEach((window) => {
      const overlay = assets.get(window.sourceImageId)
      if (!overlay) return
      compositeContext.save()
      compositeContext.globalAlpha = window.opacity
      drawCoverCrop(
        compositeContext,
        overlay.bitmap,
        window.crop,
        window.to,
        DITHER_WIDTH,
        DITHER_HEIGHT,
      )
      compositeContext.restore()
    })
    const sourcePixels = compositeContext.getImageData(
      0,
      0,
      DITHER_WIDTH,
      DITHER_HEIGHT,
    )
    const analyzedPalette = [
      ...pluginContext.palette,
      ...base.analysis.palette,
      ...activePlan.windows.flatMap(
        (window) => assets.get(window.sourceImageId)?.analysis.palette ?? [],
      ),
    ]
    const ink = choosePsycho2dInkPalette(analyzedPalette)
    const variants = DITHER_THRESHOLDS.map((threshold) => {
      const variant = document.createElement('canvas')
      variant.width = DITHER_WIDTH
      variant.height = DITHER_HEIGHT
      const variantContext = variant.getContext('2d')
      if (!variantContext) return variant
      const imageData = variantContext.createImageData(DITHER_WIDTH, DITHER_HEIGHT)
      imageData.data.set(ditherPsycho2dPixels(
        sourcePixels.data,
        DITHER_WIDTH,
        DITHER_HEIGHT,
        ink.dark,
        ink.light,
        threshold,
      ))
      variantContext.putImageData(imageData, 0, 0)
      return variant
    }) as [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement]
    composite.width = 1
    composite.height = 1
    return { planId: activePlan.id, variants }
  }

  const ensurePlan = (settings: AppSettings): void => {
    if (plan) return
    const directorSources: Psycho2DDirectorSource[] = [...assets.values()].map((asset) => ({
      id: asset.source.id,
      role: asset.source.role,
      analysis: asset.analysis,
    }))
    const current = directorSources.find((source) => source.role === 'current')
    if (!current) return
    plan = createPsycho2dScenePlan(
      directorSources,
      hashText(`${pluginContext.scene.frameId}:${morphPattern}`),
      settings.lowPowerMode,
    )
    if (plan) {
      const startedAt = performance.now()
      artwork = prepareArtwork(plan)
      brainPerformanceMetrics.recordArtworkPreparation(performance.now() - startedAt)
      brainLog('render', 'piano Psycho2D attivato', {
        planId: plan.id,
        windows: plan.windows.length,
        rendering: 'one-bit-precomputed',
        variants: artwork?.variants.length ?? 0,
      })
    }
  }

  syncSources()

  return {
    element: canvas,
    isReady: () => [...assets.values()].some((asset) => asset.source.role === 'current'),
    setOpacity(opacity) {
      canvas.style.opacity = String(clamp(opacity))
    },
    getMorphShapes: () => [],
    setMorphPattern(pattern) {
      if (morphPattern !== pattern) {
        morphPattern = pattern
        invalidatePlan()
      }
    },
    setResourcePressure(active) {
      resourcePressure = active
      canvas.dataset.brainResourcePressure = active ? 'true' : 'false'
    },
    setTransition(progress, role) {
      transitionProgress = clamp(progress)
      transitionRole = role
    },
    update(
      bands: BandEnergies,
      settings: AppSettings,
      time: number,
      rhythm?: BrainRhythmState,
      _movingAverages?: BandEnergies,
      flash?: BrainFlashState,
    ) {
      if (!context || destroyed) return
      if (rhythm) {
        lastBeatPhase = rhythm.beatPhase
        if (rhythm.beat && rhythm.beatIndex !== lastLatchedBeatIndex) {
          lastLatchedBeatIndex = rhythm.beatIndex
          latchedBeatUntil = time + BEAT_LATCH_HOLD_MS
        }
      }
      if (time - lastSyncAt >= 1_000) {
        lastSyncAt = time
        syncSources()
      }
      ensurePlan(settings)
      if (!plan || !artwork || artwork.planId !== plan.id) return

      const frameInterval = resourcePressure
        ? PRESSURE_FRAME_INTERVAL_MS
        : settings.lowPowerMode
          ? LOW_POWER_FRAME_INTERVAL_MS
          : NORMAL_FRAME_INTERVAL_MS
      if (time - lastRenderedAt < frameInterval) return
      lastRenderedAt = time
      const latchedBeatPulse = time < latchedBeatUntil
        ? 1 - Math.max(0, time - (latchedBeatUntil - BEAT_LATCH_HOLD_MS)) / BEAT_LATCH_HOLD_MS
        : 0
      const beatPulse = Math.max(latchedBeatPulse, clamp(rhythm?.beatPulse ?? 0))
      const beatPhase = rhythm?.beatPhase ?? lastBeatPhase
      const flashDrive = clamp(flash?.intensity ?? 0)
      const flashActive = flash?.active === true && flashDrive > 0.04
      if (flashActive && !flashWasActive) flashGestureIndex += 1
      flashWasActive = flashActive
      const densityVariant = selectPsycho2dDensityVariant(
        bands.lowMid,
        rhythm?.bandTransients.lowMid ?? 0,
        beatPulse,
      )
      const activeArtwork = artwork.variants[densityVariant]
      context.save()
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.filter = 'none'
      context.imageSmoothingEnabled = true
      const base = assets.get(plan.baseImageId)
      if (base) {
        context.globalAlpha = RASTER_UNDERLAY_OPACITY
        drawCoverCrop(
          context,
          base.bitmap,
          FULL_REGION,
          FULL_REGION,
          canvas.width,
          canvas.height,
        )
      }
      context.globalAlpha = 1
      context.filter = `contrast(${(1 + beatPulse * 0.52).toFixed(2)})`
      context.imageSmoothingEnabled = false
      context.drawImage(activeArtwork, 0, 0, canvas.width, canvas.height)
      context.filter = 'none'
      context.restore()

      // Risposta primaria al beat: la matrice resta ferma, ma alcune scanline
      // interne respirano e si riallineano alla fase. È un movimento locale,
      // quindi non trascina mai il quadro intero.
      const beatScanDrive = clamp(beatPulse * 1.35)
      if (beatScanDrive > 0.025) {
        const beatSliceCount = resourcePressure || settings.lowPowerMode ? 3 : 7
        context.save()
        context.globalCompositeOperation = 'source-over'
        context.globalAlpha = 0.22 + beatScanDrive * 0.34
        for (let index = 0; index < beatSliceCount; index += 1) {
          const phase = beatPhase * Math.PI * 2 + index * 1.43
          const sourceY = Math.floor(
            ((beatPhase + index / beatSliceCount * 0.63) % 1) *
            Math.max(1, canvas.height - 12),
          )
          const sliceHeight = Math.max(
            4,
            Math.round(canvas.height * (0.022 + beatScanDrive * 0.03)),
          )
          const offset = Math.round(
            Math.sin(phase) * canvas.width * (0.012 + beatScanDrive * 0.044),
          )
          drawDitherSlice(
            context,
            activeArtwork,
            canvas.width,
            canvas.height,
            sourceY,
            sliceHeight,
            offset,
          )
          if (beatScanDrive > 0.38 && index % 2 === 0) {
            context.save()
            context.globalCompositeOperation = 'difference'
            context.globalAlpha = 0.08 + beatScanDrive * 0.14
            context.fillStyle = '#ffffff'
            context.fillRect(0, sourceY, canvas.width, Math.max(2, sliceHeight * 0.42))
            context.restore()
          }
        }
        context.restore()
      }

      // Il flash globale fornisce già hold breve e decadimento curvo. Qui
      // quell'inviluppo diventa uno spostamento di blocchi di pixel, senza
      // mai traslare, scalare o ruotare l'immagine nel suo insieme.
      const flashPixelDrive = clamp(flashDrive * 1.55)
      if (flashPixelDrive > 0.02) {
        const flashSliceCount = resourcePressure || settings.lowPowerMode ? 3 : 6
        context.save()
        context.globalCompositeOperation = 'source-over'
        context.globalAlpha = 0.18 + flashPixelDrive * 0.44
        for (let index = 0; index < flashSliceCount; index += 1) {
          const sliceSeed = hashText(`${plan.seed}:flash:${flashGestureIndex}:${index}`)
          const sourceY = sliceSeed % Math.max(1, canvas.height - 8)
          const sliceHeight = Math.max(
            3,
            Math.round(canvas.height * (0.014 + flashPixelDrive * 0.024)),
          )
          const direction = (sliceSeed & 1) === 0 ? 1 : -1
          const phase = Math.sin(beatPhase * Math.PI * 2 + index * 1.91)
          const offset = Math.round(
            direction * (0.48 + Math.abs(phase) * 0.52) *
            canvas.width * (0.018 + flashPixelDrive * 0.052),
          )
          drawDitherSlice(
            context,
            activeArtwork,
            canvas.width,
            canvas.height,
            sourceY,
            sliceHeight,
            offset,
          )
          if (index % 2 === 0) {
            context.save()
            context.globalCompositeOperation = 'difference'
            context.globalAlpha = 0.06 + flashPixelDrive * 0.16
            context.fillStyle = '#ffffff'
            context.fillRect(0, sourceY, canvas.width, Math.max(2, sliceHeight * 0.3))
            context.restore()
          }
        }
        context.restore()
      }

      const profileScale = settings.motionProfile === 'ambient'
        ? 0.55
        : settings.motionProfile === 'techno'
          ? 1
          : 0.78
      const glitchDrive = clamp(
        (rhythm?.bandTransients.mid ?? 0) * 0.85 +
        (rhythm?.bandTransients.high ?? 0) * 1.2 +
        bands.high * 0.22,
      ) * profileScale
      const sliceCount = glitchDrive > 0.02
        ? resourcePressure || settings.lowPowerMode ? 1 : 3
        : 0
      for (let index = 0; index < sliceCount; index += 1) {
        const sliceHeight = Math.max(2, Math.round(DITHER_HEIGHT * (0.025 + glitchDrive * 0.04)))
        const sliceSeed = hashText(`${plan.seed}:${rhythm?.beatIndex ?? 0}:${index}`)
        const sourceY = sliceSeed % Math.max(1, DITHER_HEIGHT - sliceHeight)
        const direction = index % 2 === 0 ? 1 : -1
        const phaseDirection = Math.sin(beatPhase * Math.PI * 2 + index * 1.7)
        const offset = direction * phaseDirection * Math.round(
          canvas.width * (0.003 + glitchDrive * 0.012),
        )
        context.drawImage(
          activeArtwork,
          0,
          sourceY,
          DITHER_WIDTH,
          sliceHeight,
          offset,
          sourceY / DITHER_HEIGHT * canvas.height,
          canvas.width,
          sliceHeight / DITHER_HEIGHT * canvas.height,
        )
      }

      // Il passthrough 1-bit non usa forme decorative, ma durante ogni
      // transizione ricompone l'immagine in scanline deformate. Il progresso
      // arriva dal BrainRendererHost e viene avviato sul beat dal controller;
      // l'inviluppo a campana evita sia il taglio iniziale sia l'atterraggio
      // brusco sull'immagine successiva.
      const morphEnvelope = Math.sin(transitionProgress * Math.PI)
      if (morphEnvelope > 0.01) {
        const patternIndex = ['marea', 'fioritura', 'corrente', 'spirale']
          .indexOf(morphPattern)
        const morphSlices = settings.lowPowerMode ? 3 : 6
        context.globalCompositeOperation = 'source-over'
        context.globalAlpha = (transitionRole === 'enter' ? 0.34 : 0.26) * morphEnvelope
        for (let slice = 0; slice < morphSlices; slice += 1) {
          const sliceHeight = Math.max(2, Math.floor(canvas.height / (morphSlices * 1.8)))
          const sourceY = Math.floor(
            slice * canvas.height / morphSlices + sliceHeight * 0.4,
          )
          const wave = Math.sin(
            transitionProgress * Math.PI * 2 + slice * 1.17 + patternIndex * 0.8,
          )
          const direction = transitionRole === 'enter' ? 1 : -1
          const offset = Math.round(
            direction * wave * morphEnvelope * (1 + beatPulse * 0.9) * canvas.width * 0.035,
          )
          drawDitherSlice(
            context,
            activeArtwork,
            canvas.width,
            canvas.height,
            sourceY,
            sliceHeight,
            offset,
          )
        }
        context.globalAlpha = 1
      }
      if (lastLatchedBeatIndex !== lastInvertedBeatIndex && time < latchedBeatUntil) {
        lastInvertedBeatIndex = lastLatchedBeatIndex
        inversionUntil = time + INVERSION_HOLD_MS
      }
      if (time < inversionUntil) {
        context.save()
        context.globalCompositeOperation = 'difference'
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.restore()
      }
      context.filter = 'none'
      brainPerformanceMetrics.recordCanvasFrame(time, resourcePressure)
      canvas.dataset.brainPsycho2dPlan = plan.id
      canvas.dataset.brainPsycho2dProgress = `one-bit-${densityVariant}`
      canvas.dataset.brainPsycho2dMorph = `${transitionRole}-${transitionProgress.toFixed(3)}`
      canvas.dataset.brainPsycho2dBeat = beatScanDrive.toFixed(3)
      canvas.dataset.brainPsycho2dFlash = flashPixelDrive.toFixed(3)
    },
    destroy() {
      destroyed = true
      for (const asset of assets.values()) asset.bitmap.close()
      assets.clear()
      loading.clear()
      releaseArtwork()
      canvas.width = 1
      canvas.height = 1
      canvas.remove()
    },
  }
}
