import { BRAIN_CONFIG } from '@shared/brain/brainConfig'
import type {
  BrainProduction,
  BrainStatus,
} from '@shared/brain/brainTypes'
import type { BandEnergies, VisualStatePayload } from '@shared/types'
import {
  BrainAiClient,
  BrainAiInfrastructureError,
} from './brainAiClient'
import {
  CoscienzaOnirica,
  selectSessionSynthesisInterval,
  type DreamStoryMemory,
  type SessionMemo,
} from './coscienzaOnirica'
import {
  Psichedel,
  PsychedelInfrastructureError,
  type PsychedelRasterPreview,
} from './psichedel'
import {
  loadBrainPhrases,
  sampleBrainPhrases,
  selectBrainPhraseCount,
} from './brainPhrases'
import {
  createBrainSvgScene,
  type BrainMorphShape,
  type BrainSvgController,
} from './brainSvgScene'
import {
  buildPsycho2dModeSequence,
  createBrainPsycho2dScene,
  type BrainPsycho2dMode,
} from './brainPsycho2dCanvas'
import { BrainRhythmClock } from './brainRhythm'
import {
  brainLog,
  brainWarn,
  subscribeBrainLog,
  type BrainLogEntry,
} from './brainLog'
import {
  calculateBrainFrameTiming,
  selectBrainFrameMorphPattern,
  selectBrainRecycledFrameIndex,
  type BrainFrameMorphPattern,
} from './brainFrameMotion'
import { reconcileBrainModelCache } from './brainModelCache'
import { BrainTranslator } from './brainTranslator'
import {
  getBrainRenderingConfig,
  loadBrainRenderingConfig,
} from './brainRenderingConfig'
import { brainPerformanceMetrics } from './brainPerformanceMetrics'

const SILENT_BANDS: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }
const RASTER_MONITOR_WIDTH = 'min(180px, 14vw, 12.5vh)'
const RASTER_PREVIEW_MAX_OPACITY = 0.2
const RASTER_PREVIEW_FADE_IN_MS = 900
const RASTER_PREVIEW_FADE_OUT_MIN_MS = 3_000
const RASTER_PREVIEW_FADE_OUT_MAX_MS = 10_000
const PROCESS_DATA_KEYS = [
  'phrases',
  'randomPhrases',
  'italian',
  'english',
  'title',
  'storyTitle',
  'synopsis',
  'description',
  'visualIntent',
  'intent',
  'prompt',
  'effectivePrompts',
  'imagePrompt',
  'translatedStory',
  'response',
  'frameTitle',
  'mode',
  'model',
  'steps',
  'attempt',
  'pct',
] as const

function updateSessionMemoLocally(
  previousMemo: SessionMemo | null,
  story: BrainProduction['story'],
): SessionMemo {
  const latest = `${story.title}: ${story.synopsis}`.slice(0, 420)
  if (previousMemo) {
    return [previousMemo[1], previousMemo[2], latest]
  }
  const moments = story.frames
    .slice(0, 3)
    .map((frame) => `${story.title}: ${frame.description}`.slice(0, 420))
  return [
    moments[0] ?? latest,
    moments[1] ?? latest,
    moments[2] ?? latest,
  ]
}

function compactProcessValue(value: unknown, depth = 0): string {
  if (value instanceof Error) return value.message
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, 8)
      .map((item, index) => {
        const rendered = compactProcessValue(item, depth + 1)
        return typeof item === 'object'
          ? `[${index + 1}] ${rendered}`
          : `• ${rendered}`
      })
      .join('\n')
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const preferred = PROCESS_DATA_KEYS.filter((key) => key in record)
    const keys = preferred.length > 0
      ? preferred
      : Object.keys(record).filter((key) => key !== 'stack').slice(0, 8)
    return keys
      .map((key) => {
        const rendered = compactProcessValue(record[key], depth + 1)
        return depth === 0
          ? `${key.toLocaleUpperCase()} > ${rendered}`
          : `${key}: ${rendered}`
      })
      .join('\n')
  }
  return value == null ? '' : String(value)
}

function processMonitorText(entry: BrainLogEntry): string {
  const data = compactProcessValue(entry.data).trim()
  return [
    entry.message.toLocaleUpperCase(),
    ...(data ? ['------------------------', data] : []),
  ]
    .join('\n')
    .slice(0, 2_400)
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function smootherstep(value: number): number {
  const x = clamp01(value)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

export function createBrainController(container: HTMLElement) {
  brainLog('pipeline', 'inizializzazione Brain', {
    pipelineRevision: BRAIN_CONFIG.pipelineRevision,
  })
  const root = document.createElement('div')
  Object.assign(root.style, {
    position: 'absolute',
    inset: '0',
    overflow: 'hidden',
    pointerEvents: 'none',
    contain: 'layout style paint',
  })
  const svgHost = document.createElement('div')
  Object.assign(svgHost.style, {
    position: 'absolute',
    inset: '0',
    zIndex: '1',
    willChange: 'transform',
    transform: 'translateZ(0)',
    contain: 'layout style paint',
  })
  const edgeSoftener = document.createElement('div')
  Object.assign(edgeSoftener.style, {
    position: 'absolute',
    inset: '0',
    zIndex: '2',
    pointerEvents: 'none',
  })
  const rasterPreviewStage = document.createElement('div')
  Object.assign(rasterPreviewStage.style, {
    position: 'absolute',
    inset: '0',
    zIndex: '0',
    overflow: 'hidden',
    pointerEvents: 'none',
    contain: 'layout style paint',
  })
  const rasterPreviewImage = document.createElement('img')
  rasterPreviewImage.alt = ''
  rasterPreviewImage.setAttribute('aria-hidden', 'true')
  Object.assign(rasterPreviewImage.style, {
    display: 'block',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    opacity: '0',
    willChange: 'opacity',
    transform: 'translateZ(0)',
  })
  rasterPreviewStage.appendChild(rasterPreviewImage)
  const storyElement = document.createElement('div')
  Object.assign(storyElement.style, {
    position: 'absolute',
    left: '0',
    top: '12px',
    bottom: '12px',
    zIndex: '3',
    width: 'min(310px, 23vw)',
    boxSizing: 'border-box',
    padding: '12px 12px 14px 13px',
    overflow: 'hidden',
    color: '#73ef8a',
    background:
      'repeating-linear-gradient(0deg, rgba(92,255,122,0.035) 0, rgba(92,255,122,0.035) 1px, transparent 1px, transparent 4px), rgba(2, 13, 6, 0.72)',
    border: '1px solid rgba(87, 221, 110, 0.24)',
    borderLeft: '0',
    borderRadius: '0 2px 2px 0',
    boxShadow:
      '0 0 12px rgba(29,150,53,0.08), inset 0 0 18px rgba(31,111,48,0.08)',
    fontFamily: '"SFMono-Regular", "IBM Plex Mono", "Courier New", monospace',
    fontSize: 'clamp(11px, 0.7vw, 13px)',
    fontWeight: '500',
    lineHeight: '1.42',
    letterSpacing: '0.035em',
    opacity: '0.616',
    whiteSpace: 'pre-line',
    textShadow: '0 0 4px rgba(84,255,115,0.28)',
    display: 'flex',
    flexDirection: 'column',
    willChange: 'transform',
    transform: 'translateZ(0)',
    contain: 'layout style paint',
  })
  const italianStoryElement = document.createElement('div')
  Object.assign(italianStoryElement.style, {
    minHeight: '0',
    overflow: 'hidden',
    flex: '1 1 auto',
  })
  const englishStoryElement = document.createElement('div')
  Object.assign(englishStoryElement.style, {
    display: 'none',
    maxHeight: '27%',
    minHeight: '0',
    marginTop: '9px',
    paddingTop: '7px',
    overflow: 'hidden',
    borderTop: '1px solid rgba(87, 221, 110, 0.16)',
    color: '#6eba78',
    fontSize: '0.76em',
    lineHeight: '1.3',
    letterSpacing: '0.02em',
    opacity: '0.46',
  })
  const processMonitor = document.createElement('div')
  processMonitor.setAttribute('aria-live', 'polite')
  processMonitor.dataset.brainProcessMonitor = 'true'
  Object.assign(processMonitor.style, {
    position: 'relative',
    flex: '0 0 clamp(118px, 18vh, 168px)',
    minHeight: '0',
    margin: '9px -4px -5px',
    padding: '7px 7px 6px',
    overflow: 'hidden',
    border: '1px solid rgba(92,238,115,0.2)',
    background:
      'repeating-linear-gradient(0deg, rgba(92,255,122,0.03) 0, rgba(92,255,122,0.03) 1px, transparent 1px, transparent 4px), rgba(0,8,3,0.86)',
    boxShadow: 'inset 0 0 14px rgba(21,105,39,0.12)',
    color: '#74e68a',
    fontSize: '0.72em',
    lineHeight: '1.28',
    letterSpacing: '0.025em',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    opacity: '0.82',
  })
  const processHeader = document.createElement('div')
  Object.assign(processHeader.style, {
    marginBottom: '5px',
    paddingBottom: '4px',
    borderBottom: '1px solid rgba(92,238,115,0.2)',
    color: '#9dffac',
    fontSize: '0.9em',
    letterSpacing: '0.08em',
  })
  processHeader.textContent = 'BRAIN // PROCESSO'
  const processBody = document.createElement('div')
  processBody.textContent = 'IN ATTESA DEL PRIMO PASSAGGIO'
  processMonitor.append(processHeader, processBody)
  storyElement.append(
    italianStoryElement,
    englishStoryElement,
    processMonitor,
  )
  const statusElement = document.createElement('div')
  Object.assign(statusElement.style, {
    position: 'absolute',
    right: `calc(${RASTER_MONITOR_WIDTH} + 10px)`,
    bottom: '14px',
    zIndex: '3',
    color: '#e7dff1',
    fontFamily: 'monospace',
    fontSize: '10px',
    lineHeight: '1.35',
    letterSpacing: '0.08em',
    textTransform: 'lowercase',
    opacity: String(BRAIN_CONFIG.statusOpacity),
    textAlign: 'right',
    whiteSpace: 'pre-line',
    willChange: 'transform',
    transform: 'translateZ(0)',
  })
  const currentImageCaption = document.createElement('div')
  currentImageCaption.setAttribute('aria-live', 'polite')
  currentImageCaption.dataset.brainCurrentImage = 'true'
  Object.assign(currentImageCaption.style, {
    position: 'absolute',
    left: '50%',
    bottom: '16px',
    zIndex: '3',
    width: 'min(640px, 54vw)',
    maxHeight: '3.2em',
    padding: '6px 12px',
    overflow: 'hidden',
    color: '#f7fff4',
    background: 'rgba(2, 9, 5, 0.64)',
    border: '1px solid rgba(207, 255, 216, 0.34)',
    borderRadius: '4px',
    boxShadow: '0 2px 14px rgba(0, 0, 0, 0.46)',
    fontFamily: '"SFMono-Regular", "IBM Plex Mono", "Courier New", monospace',
    fontSize: 'clamp(9px, 0.64vw, 11px)',
    fontWeight: '500',
    lineHeight: '1.38',
    letterSpacing: '0.035em',
    textAlign: 'center',
    whiteSpace: 'normal',
    opacity: '0.92',
    textShadow: '0 1px 5px rgba(0, 0, 0, 0.92)',
    willChange: 'transform',
    transform: 'translate3d(-50%, 0, 0)',
    pointerEvents: 'none',
  })
  const rasterMonitor = document.createElement('div')
  Object.assign(rasterMonitor.style, {
    position: 'absolute',
    top: '12px',
    right: '0',
    zIndex: '3',
    width: RASTER_MONITOR_WIDTH,
    maxHeight: 'calc(100vh - 24px)',
    boxSizing: 'border-box',
    padding: '6px 6px 7px',
    overflow: 'hidden',
    color: '#6bea83',
    background:
      'repeating-linear-gradient(0deg, rgba(88,255,115,0.025) 0, rgba(88,255,115,0.025) 1px, transparent 1px, transparent 4px), rgba(2,13,6,0.68)',
    border: '1px solid rgba(87,221,110,0.22)',
    borderRight: '0',
    borderRadius: '2px 0 0 2px',
    fontFamily: '"SFMono-Regular", "IBM Plex Mono", "Courier New", monospace',
    fontSize: '9px',
    lineHeight: '1.3',
    letterSpacing: '0.045em',
    opacity: '0.546',
    willChange: 'transform',
    transform: 'translateZ(0)',
    contain: 'layout style paint',
  })
  const rasterHeader = document.createElement('div')
  rasterHeader.textContent = 'PSICHEDEL // BUFFER GREZZO'
  Object.assign(rasterHeader.style, {
    marginBottom: '4px',
    paddingBottom: '3px',
    borderBottom: '1px solid rgba(87,221,110,0.22)',
  })
  const rasterList = document.createElement('div')
  Object.assign(rasterList.style, {
    display: 'grid',
    gap: '4px',
  })
  rasterMonitor.append(rasterHeader, rasterList)
  root.append(
    svgHost,
    rasterPreviewStage,
    edgeSoftener,
    storyElement,
    rasterMonitor,
    currentImageCaption,
    statusElement,
  )
  container.appendChild(root)
  const unsubscribeProcessMonitor = subscribeBrainLog((entry) => {
    processHeader.textContent =
      `BRAIN // ${entry.stage.toLocaleUpperCase()} // ${
        entry.level === 'warn' ? 'ATTENZIONE' : 'PROCESSO'
      }`
    processHeader.style.color =
      entry.level === 'warn' ? '#e6b66f' : '#9dffac'
    processBody.textContent = processMonitorText(entry)
  })

  const rasterUrls = new Set<string>()
  const rasterPreviewBlobs = new Map<string, Blob>()
  const vectorizedRasterFrameKeys = new Set<string>()
  const rasterPreviewQueue: Array<{ frameKey: string; blob: Blob }> = []
  let activeVectorFrameKey: string | null = null
  let rasterPreviewRunning = false
  let rasterPreviewAnimation: Animation | null = null
  let activeRasterPreviewUrl: string | null = null
  let rasterPreviewVersion = 0

  const runRasterPreviewQueue = async () => {
    if (rasterPreviewRunning || destroyed) return
    rasterPreviewRunning = true
    try {
      while (!destroyed && rasterPreviewQueue.length > 0) {
        const preview = rasterPreviewQueue.shift()
        if (!preview || preview.frameKey !== activeVectorFrameKey) continue
        const version = rasterPreviewVersion

        const url = URL.createObjectURL(preview.blob)
        activeRasterPreviewUrl = url
        rasterPreviewImage.src = url
        await rasterPreviewImage.decode().catch(() => undefined)
        if (destroyed) break
        if (
          version !== rasterPreviewVersion ||
          preview.frameKey !== activeVectorFrameKey
        ) {
          rasterPreviewImage.src = ''
          URL.revokeObjectURL(url)
          activeRasterPreviewUrl = null
          continue
        }

        rasterPreviewAnimation = rasterPreviewImage.animate(
          [
            { opacity: 0 },
            { opacity: RASTER_PREVIEW_MAX_OPACITY },
          ],
          {
            duration: RASTER_PREVIEW_FADE_IN_MS,
            easing: 'ease-out',
            fill: 'forwards',
          },
        )
        await rasterPreviewAnimation.finished.catch(() => undefined)
        if (destroyed) break
        if (
          version !== rasterPreviewVersion ||
          preview.frameKey !== activeVectorFrameKey
        ) {
          rasterPreviewImage.src = ''
          URL.revokeObjectURL(url)
          activeRasterPreviewUrl = null
          continue
        }

        const fadeOutMs =
          RASTER_PREVIEW_FADE_OUT_MIN_MS +
          Math.random() *
            (RASTER_PREVIEW_FADE_OUT_MAX_MS -
              RASTER_PREVIEW_FADE_OUT_MIN_MS)
        rasterPreviewAnimation = rasterPreviewImage.animate(
          [
            { opacity: RASTER_PREVIEW_MAX_OPACITY },
            { opacity: 0 },
          ],
          {
            duration: fadeOutMs,
            easing: 'ease-in-out',
            fill: 'forwards',
          },
        )
        await rasterPreviewAnimation.finished.catch(() => undefined)
        rasterPreviewAnimation = null
        rasterPreviewImage.src = ''
        URL.revokeObjectURL(url)
        activeRasterPreviewUrl = null
      }
    } finally {
      rasterPreviewRunning = false
    }
  }

  const queueRasterPreview = (frameKey: string, blob: Blob) => {
    // Mantiene soltanto la richiesta più recente: un raster non può apparire
    // quando il fotogramma corrispondente non è più attivo.
    rasterPreviewVersion += 1
    rasterPreviewAnimation?.cancel()
    rasterPreviewAnimation = null
    rasterPreviewImage.style.opacity = '0'
    rasterPreviewQueue.length = 0
    rasterPreviewQueue.push({ frameKey, blob })
    void runRasterPreviewQueue()
  }

  const showRawRaster = (preview: PsychedelRasterPreview) => {
    if (destroyed) return
    rasterPreviewBlobs.set(
      `${preview.storyId}:${preview.frameId}`,
      preview.blob,
    )
    const url = URL.createObjectURL(preview.blob)
    rasterUrls.add(url)
    const entry = document.createElement('div')
    entry.dataset.url = url
    Object.assign(entry.style, {
      padding: '3px',
      background: 'rgba(1,8,3,0.72)',
      border: '1px solid rgba(92,238,115,0.2)',
    })
    const lens = document.createElement('div')
    const imageConfig = getBrainRenderingConfig().image
    Object.assign(lens.style, {
      position: 'relative',
      width: '100%',
      aspectRatio: `${imageConfig.width} / ${imageConfig.height}`,
      overflow: 'hidden',
      marginBottom: '2px',
      borderRadius: '44% 48% 46% 42% / 34% 38% 46% 42%',
      background: '#031008',
      boxShadow:
        'inset 0 0 16px rgba(0,0,0,0.9), inset 0 0 5px rgba(129,255,159,0.36), 0 0 7px rgba(73,225,107,0.12)',
    })
    const image = document.createElement('img')
    image.src = url
    image.alt = `Raster grezzo ${preview.frameTitle}`
    image.loading = 'eager'
    image.decoding = 'async'
    Object.assign(image.style, {
      display: 'block',
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      objectPosition: 'center',
    })
    const dreamLensOverlay = document.createElement('div')
    Object.assign(dreamLensOverlay.style, {
      position: 'absolute',
      inset: '0',
      background:
        'radial-gradient(ellipse at 46% 42%, transparent 0 34%, rgba(102,255,139,0.055) 48%, rgba(2,18,8,0.38) 72%, rgba(0,5,2,0.88) 100%), radial-gradient(ellipse at 32% 24%, rgba(215,255,226,0.2) 0 2%, transparent 11%)',
      boxShadow:
        'inset 10px 4px 17px rgba(168,255,190,0.08), inset -12px -8px 22px rgba(0,0,0,0.72)',
    })
    const bottleRings = document.createElement('div')
    Object.assign(bottleRings.style, {
      position: 'absolute',
      inset: '5%',
      borderRadius: '50%',
      border: '1px solid rgba(137,255,163,0.15)',
      boxShadow:
        '0 0 0 4px rgba(5,30,12,0.16), inset 0 0 9px rgba(159,255,180,0.08)',
    })
    lens.append(image, dreamLensOverlay, bottleRings)
    const label = document.createElement('div')
    const qualityLabel =
      preview.mode === 'high-quality'
        ? 'ALTA QUALITÀ'
        : preview.mode === 'enhanced'
          ? 'MIGLIORATA'
          : preview.mode === 'interlude'
            ? 'INTERLUDIO 4 STEP'
          : 'STANDARD'
    label.textContent = `${preview.frameId.toUpperCase()} // TENTATIVO_${preview.attempt} // ${qualityLabel}\n${preview.model}`
    Object.assign(label.style, {
      whiteSpace: 'pre-line',
      fontSize: '7px',
      opacity: '0.62',
      marginBottom: '2px',
    })
    const dreamCaption = document.createElement('div')
    const compactMeaning =
      preview.dreamMeaning.length > 84
        ? `${preview.dreamMeaning.slice(0, 81).trimEnd()}…`
        : preview.dreamMeaning
    dreamCaption.textContent = `PROMPT IMMAGINE > ${preview.frameTitle.toLocaleUpperCase()}\n${compactMeaning}`
    Object.assign(dreamCaption.style, {
      whiteSpace: 'pre-line',
      color: '#88f19a',
      fontSize: '7px',
      lineHeight: '1.2',
      maxHeight: '2.4em',
      overflow: 'hidden',
      letterSpacing: '0.025em',
      textShadow: '0 0 3px rgba(84,255,115,0.24)',
    })
    entry.append(lens, label, dreamCaption)
    rasterList.appendChild(entry)
    while (rasterList.children.length > BRAIN_CONFIG.renderFrameCount) {
      const oldest = rasterList.firstElementChild as HTMLElement | null
      const oldestUrl = oldest?.dataset.url
      if (oldestUrl) {
        const oldestImage = oldest?.querySelector<HTMLImageElement>('img')
        if (oldestImage) oldestImage.src = ''
        URL.revokeObjectURL(oldestUrl)
        rasterUrls.delete(oldestUrl)
      }
      oldest?.remove()
    }
  }

  let destroyed = false
  let imageInferenceActive = false
  const psychedel = new Psichedel(
    undefined,
    undefined,
    showRawRaster,
    undefined,
    (active) => {
      imageInferenceActive = active
      brainPerformanceMetrics.setInference(active)
      // Ogni anteprima resta visibile mentre UNet prepara la successiva.
      rasterList.style.display = 'grid'
      edgeSoftener.style.display = active ? 'none' : 'block'
      root.setAttribute(
        'data-brain-image-inference',
        active ? 'active' : 'idle',
      )
    },
  )
  const rhythmClock = new BrainRhythmClock()
  let storyAi: BrainAiClient | null = null
  let brainTranslator: BrainTranslator | null = null
  let status: BrainStatus | null = null
  let currentProduction: BrainProduction | null = null
  let nextProduction: BrainProduction | null = null
  let pendingStory: BrainProduction['story'] | null = null
  const storyQueue: BrainProduction['story'][] = []
  let recyclingStoryFrames = false
  let generating = false
  let frameIndex = 0
  let frameStartedAt = 0
  let transitionStartedAt = 0
  let currentFrameMorphPattern: BrainFrameMorphPattern = 'marea'
  let previousFrameMorphPattern: BrainFrameMorphPattern | null = null
  let currentSvg: BrainSvgController | null = null
  let outgoingSvg: BrainSvgController | null = null
  const psycho2dModes = new Map<string, BrainPsycho2dMode>()
  let transitionCounterpartShapes: BrainMorphShape[] = []
  let latestPayload: VisualStatePayload | null = null
  let recentPhrases: string[] = []
  let recentStories: DreamStoryMemory[] = []
  let nextContinuityPhrase: string | null = null
  let recentBridges: string[] = []
  let sessionMemo: SessionMemo | null = null
  let ordinaryStoriesSinceSynthesis = 0
  let nextSessionSynthesisAt = selectSessionSynthesisInterval()
  const generationFailures = new Map<string, number>()
  let retryAttempt = 0
  let rafId = 0
  let retryTimerId = 0
  let generationCooldownTimerId = 0
  let nextGenerationAllowedAt = 0
  const applySurfaceConfig = () => {
    const { edgeFeatherPx, edgeDarkness } =
      getBrainRenderingConfig().composition
    edgeSoftener.style.boxShadow =
      edgeFeatherPx > 0
        ? `inset 0 0 ${edgeFeatherPx}px rgba(0, 0, 0, ${edgeDarkness})`
        : 'none'
  }
  applySurfaceConfig()
  const modelCacheReady = Promise.all([
    reconcileBrainModelCache(),
    loadBrainRenderingConfig().then(applySurfaceConfig),
  ])

  const scheduleGenerationRetry = (infrastructureFailure: boolean) => {
    retryAttempt += 1
    const delayMs = infrastructureFailure
      ? Math.min(
          BRAIN_CONFIG.retryMaximumDelayMs,
          BRAIN_CONFIG.retryInitialDelayMs * 2 ** Math.min(6, retryAttempt - 1),
        )
      : BRAIN_CONFIG.retryInitialDelayMs
    window.clearTimeout(retryTimerId)
    retryTimerId = window.setTimeout(() => {
      retryTimerId = 0
      void generateNext()
    }, delayMs)
    brainWarn('pipeline', 'ciclo infinito: nuova generazione programmata', {
      retryAttempt,
      delayMs,
      infrastructureFailure,
      retainedStoryId: pendingStory?.id ?? null,
      queuedStories: storyQueue.length,
    })
    statusElement.textContent = currentProduction
      ? `brain · visualizzazione\nnuova generazione tra ${Math.ceil(delayMs / 1_000)}s`
      : `brain · generazione\nnuovo tentativo tra ${Math.ceil(delayMs / 1_000)}s`
  }

  const setStatus = (nextStatus: BrainStatus) => {
    if (status === nextStatus) return
    status = nextStatus
    statusElement.textContent =
      status === 'generation'
        ? 'brain · generazione\nin attesa della storia…'
        : status === 'rendering+generation'
          ? 'brain · visualizzazione + generazione'
          : 'brain · visualizzazione'
    brainLog('status', nextStatus)
  }

  const dreamMonitorText = (
    story: BrainProduction['story'],
    frame?: BrainProduction['story']['frames'][number],
    frameNumber?: number,
  ) =>
    [
      'COSCIENZA_ONIRICA // FLUSSO ONIRICO',
      `ID_STORIA > ${story.id}`,
      `SOGGETTO   > ${story.title.toLocaleUpperCase()}`,
      '----------------------------------------',
      story.synopsis,
      ...(story.sessionSynthesis
        ? ['', 'QUESTO SOGNO > SINTESI DELLA SESSIONE']
        : []),
      ...(story.sessionMemo
        ? [
            '',
            'MEMO DI BRAIN',
            ...story.sessionMemo.map(
              (sentence, index) => `${index + 1}. ${sentence}`,
            ),
          ]
        : []),
      ...(story.continuityPhrase
        ? ['', `CONTINUITÀ > ${story.continuityPhrase}`]
        : []),
      ...(frame
        ? [
            '',
            `FOTOGRAMMA_${String((frameNumber ?? 0) + 1).padStart(2, '0')} > ${frame.title.toLocaleUpperCase()}`,
            frame.description,
          ]
        : []),
      '',
      '█ SEGNALE ATTIVO',
    ].join('\n')

  const setDreamMonitor = (
    story: BrainProduction['story'],
    frame?: BrainProduction['story']['frames'][number],
    frameNumber?: number,
    suffix?: string,
  ) => {
    italianStoryElement.textContent = [
      dreamMonitorText(story, frame, frameNumber),
      ...(suffix ? ['', suffix] : []),
    ].join('\n')
    const englishText = story.englishSynopsis?.trim()
    englishStoryElement.style.display = englishText ? 'block' : 'none'
    englishStoryElement.textContent = englishText
      ? [
          'ENGLISH SOURCE // ORIGINAL NARRATIVE',
          story.englishTitle ? `TITLE > ${story.englishTitle}` : '',
          englishText,
          ...(frame?.imagePrompt ? ['', `FRAME SOURCE > ${frame.imagePrompt}`] : []),
        ]
          .filter(Boolean)
          .join('\n')
      : ''
  }

  const applyFrame = (index: number) => {
    if (!currentProduction) return
    const isBufferFrame =
      index === currentProduction.story.frames.length &&
      currentProduction.bufferFrame !== undefined
    const scene = isBufferFrame
      ? currentProduction.bufferFrame?.scene
      : currentProduction.scenes[index]
    const frame = isBufferFrame
      ? currentProduction.bufferFrame?.frame
      : currentProduction.story.frames[index]
    if (!scene || !frame) return
    const hadVisibleFrame = currentSvg !== null
    outgoingSvg?.destroy()
    outgoingSvg = currentSvg
    transitionCounterpartShapes = currentSvg?.getMorphShapes() ?? []
    if (!outgoingSvg) svgHost.textContent = ''
    else outgoingSvg.element.style.zIndex = '2'
    currentFrameMorphPattern = selectBrainFrameMorphPattern(
      previousFrameMorphPattern,
    )
    previousFrameMorphPattern = currentFrameMorphPattern
    const frameKey = `${currentProduction.story.id}:${frame.id}`
    const synchronizedRaster = scene.raster ?? rasterPreviewBlobs.get(frameKey)
    currentSvg = synchronizedRaster
      ? createBrainPsycho2dScene(
          svgHost,
          scene,
          synchronizedRaster,
          currentProduction.story.palette,
          psycho2dModes.get(frameKey) ?? 'living-ink',
        )
      : createBrainSvgScene(
          svgHost,
          scene,
          currentProduction.story.palette,
          {
            frameEnergy: frame?.energy ?? 0.5,
            frameIndex: index,
            frameCount:
              currentProduction.story.frames.length +
              (currentProduction.bufferFrame ? 1 : 0),
          },
        )
    currentSvg.element.style.zIndex = '3'
    currentSvg.setMorphPattern(currentFrameMorphPattern)
    currentSvg.setOpacity(hadVisibleFrame ? 0 : 1)
    frameIndex = index
    activeVectorFrameKey = frameKey
    if (synchronizedRaster) {
      queueRasterPreview(activeVectorFrameKey, synchronizedRaster)
    }
    frameStartedAt = performance.now()
    transitionStartedAt = hadVisibleFrame
      ? frameStartedAt
      : frameStartedAt -
        getBrainRenderingConfig().timing.firstFrameTransitionMs
    if (!hadVisibleFrame) {
      currentSvg.setOpacity(1)
    } else {
      currentSvg.setTransition(0, 'enter', transitionCounterpartShapes)
    }
    setDreamMonitor(currentProduction.story, frame, index)
    currentImageCaption.textContent = [
      isBufferFrame
        ? `PSICHEDEL // COLLEGAMENTO ASSOCIATIVO // ${currentProduction.bufferFrame?.associationType.toLocaleUpperCase('it-IT') ?? 'IMPLICITO'}`
        : `PSICHEDEL // ${frame.title}`,
      scene.description,
    ].join('  ·  ')
    brainLog('render', isBufferFrame
      ? 'collegamento associativo in ricircolo'
      : `fotogramma ${index + 1}/${currentProduction.story.frames.length}`, {
      storyId: currentProduction.story.id,
      storyTitle: currentProduction.story.title,
      frameTitle: frame?.title,
      description: frame?.description,
      visualIntent: frame?.visualIntent,
      durationMs: frame?.durationMs,
      morphPattern: currentFrameMorphPattern,
      image: {
        description: scene.description,
        svgLength: scene.svg.length,
      },
    })
  }

  const recycleCurrentStoryFrame = () => {
    if (!currentProduction) return
    recyclingStoryFrames = true
    const recyclableFrameCount =
      currentProduction.scenes.length +
      (currentProduction.bufferFrame ? 1 : 0)
    const nextFrameIndex = selectBrainRecycledFrameIndex(
      recyclableFrameCount,
      frameIndex,
    )
    applyFrame(nextFrameIndex)
    const recycledFrame =
      nextFrameIndex === currentProduction.story.frames.length
        ? currentProduction.bufferFrame?.frame
        : currentProduction.story.frames[nextFrameIndex]
    setDreamMonitor(
      currentProduction.story,
      recycledFrame,
      nextFrameIndex,
      'RICIRCOLO ONIRICO > IMMAGINI ESISTENTI IN MOVIMENTO\nATTESA > NUOVA STORIA',
    )
    brainLog('pipeline', 'ricircolo leggero dei fotogrammi durante l’attesa', {
      storyId: currentProduction.story.id,
      frameIndex: nextFrameIndex,
      bufferFrame: nextFrameIndex === currentProduction.story.frames.length,
      morphPattern: currentFrameMorphPattern,
    })
  }

  const startProduction = (production: BrainProduction) => {
    brainLog('pipeline', 'inizio rendering storia', {
      id: production.story.id,
      title: production.story.title,
      synopsis: production.story.synopsis,
      palette: production.story.palette,
      frameCount: production.story.frames.length,
    })
    for (const frameKey of rasterPreviewBlobs.keys()) {
      if (!frameKey.startsWith(`${production.story.id}:`)) {
        rasterPreviewBlobs.delete(frameKey)
        vectorizedRasterFrameKeys.delete(frameKey)
      }
    }
    psycho2dModes.clear()
    const visualFrames = [
      ...production.story.frames,
      ...(production.bufferFrame ? [production.bufferFrame.frame] : []),
    ]
    const modeSequence = buildPsycho2dModeSequence(visualFrames.length)
    visualFrames.forEach((frame, index) => {
      psycho2dModes.set(
        `${production.story.id}:${frame.id}`,
        modeSequence[index] ?? 'living-ink',
      )
    })
    currentProduction = production
    recyclingStoryFrames = false
    setDreamMonitor(production.story)
    nextProduction = null
    applyFrame(0)
    window.setTimeout(() => void generateNext(), 0)
  }

  const generateStoryBatch = async (targetCount: number) => {
    await modelCacheReady
    await loadBrainRenderingConfig()
    applySurfaceConfig()
    const missingCount = Math.max(0, targetCount - storyQueue.length)
    if (missingCount === 0) return
    if (currentProduction) {
      const releaseStartedAt = performance.now()
      brainLog(
        'pipeline',
        'passaggio GPU tra storie: rilascio il modello immagini prima dell’AI testuale',
        {
          currentStoryId: currentProduction.story.id,
          imageModelRetainedDuringDisplay: true,
        },
      )
      await psychedel.releaseImageModel()
      await new Promise<void>((resolve) => window.setTimeout(
        resolve,
        BRAIN_CONFIG.interStoryGpuHandoffMs,
      ))
      brainLog('pipeline', 'memoria GPU pronta per la storia successiva', {
        currentStoryId: currentProduction.story.id,
        handoffMs: Math.round(performance.now() - releaseStartedAt),
        imageModelReloadSource: 'cache locale',
      })
    }
    const maximumAttempts = Math.max(2, missingCount * 2)
    let attempts = 0
    brainLog('pipeline', 'ciclo associazioni narrative avviato', {
      requestedStories: missingCount,
      queuedStories: storyQueue.length,
    })
    storyAi ??= new BrainAiClient()
    brainTranslator ??= new BrainTranslator(storyAi, {
      translateInputs: true,
      translateUi: false,
    })
    try {
      while (
        !destroyed &&
        storyQueue.length < targetCount &&
        attempts < maximumAttempts
      ) {
        attempts += 1
        await loadBrainPhrases()
        const previousStory = recentStories.at(-1) ?? null
        const continuityPhrase = nextContinuityPhrase
        const sessionSynthesis =
          sessionMemo !== null &&
          ordinaryStoriesSinceSynthesis >= nextSessionSynthesisAt
        const requestedPhraseCount = sessionSynthesis
          ? BRAIN_CONFIG.phraseSampleMaxCount
          : selectBrainPhraseCount()
        const memoPhrases: readonly string[] =
          sessionSynthesis && sessionMemo ? sessionMemo : []
        const randomPhraseCount = Math.max(
          1,
          requestedPhraseCount -
            memoPhrases.length,
        )
        const randomPhrases = sampleBrainPhrases(randomPhraseCount, recentPhrases)
        const phrases = [...randomPhrases, ...memoPhrases]
        recentPhrases = [...recentPhrases, ...randomPhrases].slice(
          -BRAIN_CONFIG.phraseMemoryCount,
        )
        brainLog('pipeline', 'nuova associazione casuale inviata a CoscienzaOnirica', {
          batchAttempt: attempts,
          requested: requestedPhraseCount,
          randomPhrases,
          continuityPhrase,
          previousStoryId: previousStory?.title ?? null,
          sessionMemo,
          sessionSynthesis,
          ordinaryStoriesSinceSynthesis,
          nextSessionSynthesisAt,
          phrases,
        })
        try {
          const coscienza = new CoscienzaOnirica(
            storyAi,
            brainTranslator,
          )
          const story = await coscienza.generate(phrases, recentStories, {
            sessionMemo: sessionMemo ?? undefined,
            sessionSynthesis,
            continuitySeed: continuityPhrase,
            recentBridges,
          })
          nextContinuityPhrase = story.bridge
          recentBridges = story.bridge
            ? [...recentBridges, story.bridge].slice(
                -BRAIN_CONFIG.storyMemoryCount,
              )
            : recentBridges
          try {
            const promptsFromOriginalStory = story.frames.map(
              (frame) => frame.imagePrompt?.trim() || null,
            )
            if (promptsFromOriginalStory.every(
              (prompt): prompt is string => prompt !== null,
            )) {
              brainLog(
                'psichedel',
                'uso diretto dei fotogrammi inglesi originali della storia AI',
                {
                  storyId: story.id,
                  effectivePrompts: promptsFromOriginalStory,
                  roundTripTranslation: false,
                  manipulation: false,
                },
              )
            } else {
              story.frames.forEach((frame) => {
                frame.imagePrompt = frame.description
              })
              brainLog(
                'psichedel',
                'descrizioni inglesi riusate senza una seconda traduzione',
                {
                  storyId: story.id,
                  effectivePrompts: story.frames.map(
                    (frame) => frame.imagePrompt,
                  ),
                  roundTripTranslation: false,
                  manipulation: false,
                },
              )
            }
          } catch (visualPlanError) {
            if (destroyed) throw visualPlanError
            brainWarn(
              'psichedel',
              'traduzione letterale non disponibile; passo la descrizione originale senza modificarla',
              {
                storyId: story.id,
                error: visualPlanError,
              },
            )
          }
          sessionMemo = updateSessionMemoLocally(sessionMemo, story)
          story.sessionMemo = sessionMemo
          brainLog(
            'memoria',
            'memo aggiornato localmente senza occupare il modello narrativo',
            { storyId: story.id, sessionMemo },
          )
          if (sessionSynthesis) {
            ordinaryStoriesSinceSynthesis = 0
            nextSessionSynthesisAt = selectSessionSynthesisInterval()
            brainLog('memoria', 'storia periodica “Questo sogno” completata', {
              storyId: story.id,
              nextSessionSynthesisAt,
              sessionMemo,
            })
          } else {
            ordinaryStoriesSinceSynthesis += 1
          }
          storyQueue.push(story)
          recentStories = [
            ...recentStories,
            {
              title: story.title,
              synopsis: story.synopsis,
            },
          ].slice(-BRAIN_CONFIG.storyMemoryCount)
          brainLog('pipeline', 'nuova storia inserita nel buffer narrativo', {
            id: story.id,
            title: story.title,
            synopsis: story.synopsis,
            incomingBridge: story.continuityPhrase,
            outgoingBridge: story.bridge,
            sourcePhrases: story.sourcePhrases,
            queueLength: storyQueue.length,
            targetCount,
          })
          if (!currentProduction && storyQueue.length === 1) {
            setDreamMonitor(story, undefined, undefined, 'SINTESI IMMAGINI > IN CODA')
          }
        } catch (error) {
          if (destroyed) throw error
          if (error instanceof BrainAiInfrastructureError) throw error
          brainWarn('pipeline', 'associazione narrativa rifiutata; provo nuove frasi', {
            batchAttempt: attempts,
            error,
          })
        }
      }
    } finally {
      if (destroyed) {
        storyAi?.destroy()
        storyAi = null
        brainTranslator = null
      }
      brainLog('pipeline', 'ciclo associazioni narrative completato', {
        generatedStories: storyQueue.length,
        targetCount,
        attempts,
        textModelSessionRetained: !destroyed,
      })
      await new Promise<void>((resolve) => window.setTimeout(resolve, 100))
    }
    if (storyQueue.length === 0) {
      throw new Error('CoscienzaOnirica non ha inserito storie nel buffer narrativo')
    }
  }

  const generateNext = async () => {
    if (destroyed || generating || nextProduction) return
    const cooldownRemainingMs =
      nextGenerationAllowedAt - performance.now()
    if (cooldownRemainingMs > 0) {
      if (generationCooldownTimerId === 0) {
        generationCooldownTimerId = window.setTimeout(() => {
          generationCooldownTimerId = 0
          void generateNext()
        }, cooldownRemainingMs)
        brainLog('pipeline', 'pausa termica prima della prossima produzione', {
          cooldownMs: Math.round(cooldownRemainingMs),
          imageModelRetained: true,
        })
      }
      return
    }
    window.clearTimeout(generationCooldownTimerId)
    generationCooldownTimerId = 0
    window.clearTimeout(retryTimerId)
    retryTimerId = 0
    generating = true
    brainPerformanceMetrics.setGeneration(true)
    const productionStartedAt = performance.now()
    const productionDeadlineAt =
      productionStartedAt + BRAIN_CONFIG.nextStoryHardDeadlineMs
    setStatus(currentProduction ? 'rendering+generation' : 'generation')
    try {
      let story = pendingStory
      let progressiveProduction: BrainProduction | null = null
      let progressiveReadyFrames = 0
      const progressiveScenes = new Map<number, BrainProduction['scenes'][number]>()
      if (!story) {
        await generateStoryBatch(
          currentProduction ? BRAIN_CONFIG.storyQueueTarget : 1,
        )
        story = storyQueue.shift() ?? null
        if (!story) throw new Error('Buffer narrativo vuoto dopo la generazione')
        pendingStory = story
        brainLog('pipeline', 'storia conservata; avvio Psichedel', {
          id: story.id,
          title: story.title,
          synopsis: story.synopsis,
          frames: story.frames,
          remainingStories: storyQueue.length,
        })
        if (!currentProduction) {
          setDreamMonitor(story, undefined, undefined, 'SINTESI IMMAGINI > ATTIVA')
        }
      } else {
        brainLog('pipeline', 'nuovo tentativo Psichedel sulla storia conservata', {
          id: story.id,
          title: story.title,
        })
      }
      await storyAi?.releaseAllModels()
      const scenes = await psychedel.generate(
        story,
        productionDeadlineAt,
        (scene, sceneIndex) => {
          const frameKey = `${story.id}:${scene.frameId}`
          vectorizedRasterFrameKeys.add(frameKey)
          const synchronizedRaster = rasterPreviewBlobs.get(frameKey)
          if (
            synchronizedRaster &&
            activeVectorFrameKey === frameKey
          ) {
            queueRasterPreview(frameKey, synchronizedRaster)
          }
          progressiveScenes.set(sceneIndex, scene)
          progressiveReadyFrames = progressiveScenes.size
          if (!progressiveProduction) {
            // Due immagini reali sono sufficienti per mettere in moto il
            // sogno. Le altre posizioni usano temporaneamente una delle due
            // immagini già validate e vengono sostituite appena pronte.
            if (progressiveScenes.size < 2) return
            const readyScenes = [...progressiveScenes.entries()]
              .sort(([left], [right]) => left - right)
              .map(([, readyScene]) => readyScene)
            const previousScenes = currentProduction?.scenes ?? readyScenes
            progressiveProduction = {
              story,
              scenes: story.frames.map((frame, index) => {
                const provisional =
                  progressiveScenes.get(index) ??
                  readyScenes[index % readyScenes.length] ??
                  previousScenes[index % previousScenes.length]
                return {
                  frameId: frame.id,
                  description: `${frame.title}: ${frame.description}`,
                  svg: provisional.svg,
                  raster: provisional.raster,
                }
              }),
            }
            const startRenderingImmediately = !currentProduction
            if (currentProduction) {
              nextProduction = progressiveProduction
            } else {
              startProduction(progressiveProduction)
            }
            brainLog('pipeline', 'nuova storia resa disponibile dopo due fotogrammi AI', {
              storyId: story.id,
              readyFrames: progressiveScenes.size,
              reusedFrames: progressiveProduction.scenes.length - progressiveScenes.size,
              startRenderingImmediately,
            })
          }
          progressiveProduction.scenes[sceneIndex] = scene
          if (currentProduction?.story.id === story.id) {
            currentProduction.scenes[sceneIndex] = scene
          }
          brainLog('pipeline', 'fotogramma nuovo inserito progressivamente nel renderer', {
            storyId: story.id,
            frameIndex: sceneIndex,
            completedFrames: progressiveReadyFrames,
            totalFrames: story.frames.length,
          })
        },
      )
      if (destroyed) return
      let bufferFrame: BrainProduction['bufferFrame']
      try {
        bufferFrame = await psychedel.generateLowQualityBufferFrame(story)
        const bufferFrameKey = `${story.id}:${bufferFrame.frame.id}`
        vectorizedRasterFrameKeys.add(bufferFrameKey)
      } catch (bufferError) {
        if (destroyed) return
        brainWarn(
          'psichedel',
          'collegamento associativo non disponibile; mantengo i quattro fotogrammi narrativi',
          {
            storyId: story.id,
            error: bufferError,
          },
        )
      }
      nextGenerationAllowedAt =
        productionStartedAt + BRAIN_CONFIG.nextStoryTargetMs
      brainLog(
        'pipeline',
        'sessioni immagini mantenute in memoria durante la pausa termica',
        {
          storyId: story.id,
          nextGenerationInMs: Math.max(
            0,
            Math.round(nextGenerationAllowedAt - performance.now()),
          ),
        },
      )
      const production: BrainProduction = {
        story,
        scenes,
        ...(bufferFrame ? { bufferFrame } : {}),
      }
      pendingStory = null
      generationFailures.delete(story.id)
      retryAttempt = 0
      brainLog('pipeline', 'produzione completa', {
        storyId: story.id,
        frames: story.frames.length,
        images: scenes.length,
        lowQualityBufferReady: Boolean(bufferFrame),
        durationMs: Math.round(performance.now() - productionStartedAt),
        targetMs: BRAIN_CONFIG.nextStoryTargetMs,
        hardDeadlineMs: BRAIN_CONFIG.nextStoryHardDeadlineMs,
      })
      if (!currentProduction) {
        startProduction(production)
      } else if (currentProduction.story.id === story.id) {
        currentProduction.scenes = scenes
        currentProduction.bufferFrame = bufferFrame
      } else {
        nextProduction = production
        brainLog('pipeline', 'storia successiva inserita nel buffer', {
          id: story.id,
          title: story.title,
        })
      }
    } catch (error) {
      if (destroyed) return
      brainWarn('pipeline', 'errore imprevisto nella generazione', error)
      if (
        error instanceof PsychedelInfrastructureError ||
        error instanceof BrainAiInfrastructureError
      ) {
        scheduleGenerationRetry(true)
        return
      }
      if (pendingStory) {
        const failures = (generationFailures.get(pendingStory.id) ?? 0) + 1
        generationFailures.set(pendingStory.id, failures)
        if (failures >= 3) {
          const discardedStory = pendingStory
          pendingStory = null
          generationFailures.delete(discardedStory.id)
          await psychedel.discard(discardedStory.id)
          brainWarn('pipeline', 'storia scartata dopo tre cicli immagini non validi; genero una nuova storia', {
            id: discardedStory.id,
            title: discardedStory.title,
          })
        }
      }
      scheduleGenerationRetry(false)
    } finally {
      generating = false
      brainPerformanceMetrics.setGeneration(false)
      if (!destroyed && currentProduction) {
        setStatus('rendering')
        if (!nextProduction && retryTimerId === 0) {
          window.setTimeout(() => void generateNext(), 0)
        }
      }
    }
  }

  const advanceTimeline = (
    now: number,
    onBeat: boolean,
    minimumFrameDurationMs: number,
  ) => {
    if (!currentProduction) return
    const frame =
      frameIndex === currentProduction.story.frames.length
        ? currentProduction.bufferFrame?.frame
        : currentProduction.story.frames[frameIndex]
    if (!frame) return
    const elapsed = now - frameStartedAt
    if (elapsed < minimumFrameDurationMs) return
    if (!onBeat && elapsed < minimumFrameDurationMs + 2_000) return
    if (recyclingStoryFrames) {
      if (nextProduction) {
        brainLog('pipeline', 'nuova storia pronta; uscita dal ricircolo leggero', {
          previousStoryId: currentProduction.story.id,
          nextStoryId: nextProduction.story.id,
        })
        startProduction(nextProduction)
        return
      }
      recycleCurrentStoryFrame()
      if (!generating) void generateNext()
      return
    }
    if (frameIndex < currentProduction.story.frames.length - 1) {
      applyFrame(frameIndex + 1)
      return
    }
    if (nextProduction) {
      brainLog('pipeline', 'storia terminata; morphing SVG verso la storia successiva', {
        storyId: currentProduction.story.id,
        nextStoryId: nextProduction.story.id,
      })
      startProduction(nextProduction)
      return
    }
    brainLog('pipeline', 'storia terminata; riciclo le immagini mentre attendo', {
      storyId: currentProduction.story.id,
      pendingStoryId: pendingStory?.id ?? null,
      generationActive: generating,
    })
    recycleCurrentStoryFrame()
    if (generating) setStatus('rendering+generation')
    if (!generating) void generateNext()
  }

  const render = (now: number) => {
    rafId = requestAnimationFrame(render)
    if (destroyed) return
    brainPerformanceMetrics.recordOutputRaf(now)
    const bands = latestPayload?.bandEnergies ?? SILENT_BANDS
    const rhythm = rhythmClock.projectState(now)
    const frameBeforeAdvance =
      currentProduction &&
      frameIndex === currentProduction.story.frames.length
        ? currentProduction.bufferFrame?.frame
        : currentProduction?.story.frames[frameIndex]
    const timingBeforeAdvance = calculateBrainFrameTiming(
      rhythm.beatDurationMs,
      frameBeforeAdvance?.durationMs ??
        getBrainRenderingConfig().timing.frameDurationMs,
      currentFrameMorphPattern,
    )
    advanceTimeline(now, rhythm.beat, timingBeforeAdvance.totalMs)
    const activeFrame =
      currentProduction &&
      frameIndex === currentProduction.story.frames.length
        ? currentProduction.bufferFrame?.frame
        : currentProduction?.story.frames[frameIndex]
    const activeTiming = calculateBrainFrameTiming(
      rhythm.beatDurationMs,
      activeFrame?.durationMs ??
        getBrainRenderingConfig().timing.frameDurationMs,
      currentFrameMorphPattern,
    )
    const transition = smootherstep(
      (now - transitionStartedAt) / activeTiming.transitionMs,
    )
    currentSvg?.setOpacity(outgoingSvg ? transition : 1)
    outgoingSvg?.setOpacity(1 - transition)
    currentSvg?.setTransition(
      transition,
      'enter',
      transitionCounterpartShapes,
    )
    outgoingSvg?.setTransition(transition, 'exit')
    if (transition >= 1 && outgoingSvg) {
      outgoingSvg.destroy()
      outgoingSvg = null
      transitionCounterpartShapes = []
    }

    if (latestPayload?.settings) {
      // La generazione testuale o l'attesa della pipeline non sono pressione
      // grafica. Soltanto l'inferenza immagini contende realmente WebGPU.
      currentSvg?.setResourcePressure(imageInferenceActive)
      outgoingSvg?.setResourcePressure(imageInferenceActive)
      currentSvg?.update(
        bands,
        latestPayload.settings,
        now,
        rhythm,
        latestPayload.movingAverages,
      )
      outgoingSvg?.update(
        bands,
        latestPayload.settings,
        now,
        rhythm,
        latestPayload.movingAverages,
      )
    }
  }

  setStatus('generation')
  rafId = requestAnimationFrame(render)
  brainLog('pipeline', 'attesa produzione AI reale; nessun fotogramma simulato')
  void generateNext()

  return {
    setOpacity(opacity: number) {
      root.style.opacity = String(clamp01(opacity))
    },
    updateState(payload: VisualStatePayload) {
      latestPayload = payload
      if (window.fxOutput?.sendVisualStateAck) {
        window.fxOutput.sendVisualStateAck()
      }
      brainPerformanceMetrics.recordVisualPacket(
        payload.performanceTelemetry,
        performance.timeOrigin + performance.now(),
        performance.now(),
      )
      if (payload.bandEnergies) {
        rhythmClock.ingestSample(
          payload.bandEnergies,
          payload.audioTimestampMs,
          payload.movingAverages,
          payload.sequenceNumber,
        )
      }
    },
    destroy() {
      brainLog('pipeline', 'arresto Brain')
      destroyed = true
      brainPerformanceMetrics.setGeneration(false)
      brainPerformanceMetrics.setInference(false)
      brainPerformanceMetrics.report()
      unsubscribeProcessMonitor()
      cancelAnimationFrame(rafId)
      window.clearTimeout(retryTimerId)
      window.clearTimeout(generationCooldownTimerId)
      storyAi?.destroy()
      psychedel.destroy()
      currentSvg?.destroy()
      outgoingSvg?.destroy()
      transitionCounterpartShapes = []
      activeVectorFrameKey = null
      rasterPreviewBlobs.clear()
      psycho2dModes.clear()
      vectorizedRasterFrameKeys.clear()
      rasterPreviewQueue.length = 0
      rasterPreviewAnimation?.cancel()
      rasterPreviewAnimation = null
      rasterPreviewImage.src = ''
      if (activeRasterPreviewUrl) {
        URL.revokeObjectURL(activeRasterPreviewUrl)
        activeRasterPreviewUrl = null
      }
      rasterList
        .querySelectorAll<HTMLImageElement>('img')
        .forEach((image) => {
          image.src = ''
        })
      for (const url of rasterUrls) URL.revokeObjectURL(url)
      rasterUrls.clear()
      root.remove()
    },
  }
}

// React Fast Refresh preserva gli effect di OutputApp. Un modulo Brain aggiornato
// non deve lasciare in esecuzione worker e controller della revisione precedente.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.location.reload()
  })
}
