import { BRAIN_CONFIG } from '@shared/brain/brainConfig'
import type {
  BrainProduction,
  BrainStatus,
  DreamFrame,
  DreamStory,
  PsychedelScene,
} from '@shared/brain/brainTypes'
import {
  REVISION_CYCLE_LAPS,
  combineRevisionTag,
  computeRevisionLapDurationMs,
  deriveBioenergeticState,
  deriveOneiricPhase,
  pickRevisionEntries,
  pickRevisionImageCount,
  pickStoriesUntilNextRevisionCycle,
  selectRevisionPool,
  type DreamImageArchiveEntry,
} from '@shared/brain/dreamRevisionCycle'
import type {
  BandEnergies,
  ConsciousnessMotionCandidate,
  VisualStatePayload,
} from '@shared/types'
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
  buildPrint2dModeSequence,
  type BrainPrint2dMode,
} from './brainPrint2dCanvas'
import { createDefaultBrainRendererRegistry } from './brainRendererRegistry'
import { createBrainRendererHost } from './brainRendererHost'
import { BrainOfflineGenerationWindow } from './brainOfflineWindow'
import { BrainRendererSelector } from './brainRendererSelector'
import type { BrainRendererImageSource } from './brainRendererPlugin'
import type { BrainRhythmState } from './brainRhythm'
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
  setBrainRevisionBoost,
} from './brainRenderingConfig'
import { brainPerformanceMetrics } from './brainPerformanceMetrics'
import {
  BrainThermalScheduler,
  type BrainThermalSchedulerEvent,
} from './brainThermalScheduler'
import {
  isCompleteBrainImageBuffer,
  shouldActivateProgressiveImageBuffer,
  shouldRetainImageModelBetweenStories,
} from './brainImageBuffer'
import {
  calculateNextStoryRefillWindowForMode,
} from './brainStoryCycleRefill'
import {
  createOriginMemoryDraft,
  createStoryMemoryDraft,
} from './brainConsciousnessMemory'
import { CoscienzaCore } from './coscienzaCore'
import { createBrainConsciousnessMotionLayer } from './brainConsciousnessMotion'
import { BrainVectorizer } from './brainVectorQuality'
import { BrainVectorSceneCache } from './brainVectorSceneCache'

const SILENT_BANDS: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }
const RASTER_MONITOR_WIDTH = 'min(180px, 14vw, 12.5vh)'
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

function transitionPatternRandom(
  frameIndex: number,
  beatIndex: number,
  rendererPass: number,
): () => number {
  const value = Math.abs(
    (frameIndex * 31 + beatIndex * 13 + rendererPass * 17 + 7) % 997,
  )
  return () => value / 997
}

export type BrainStoryCycleCompletion = {
  storyId: string
  brainDurationMs: number
  rendererPasses: number
}

export type BrainControllerOptions = {
  onStoryCycleComplete?: (completion: BrainStoryCycleCompletion) => void
  rhythmSource?: () => BrainRhythmState
}

export function createBrainController(
  container: HTMLElement,
  options: BrainControllerOptions = {},
) {
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
    edgeSoftener,
    storyElement,
    rasterMonitor,
    currentImageCaption,
    statusElement,
  )
  container.appendChild(root)
  const consciousnessMotionLayer = createBrainConsciousnessMotionLayer(root)
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
    // Ciclo di Revisione (PIANO-034): solo immagini a qualità piena
    // entrano nell'archivio — 'interlude' (4 step) non viene mai
    // archiviata, non solo esclusa al recupero.
    if (preview.mode !== 'interlude') {
      const story = findStoryById(preview.storyId)
      const frameIndexInStory = story?.frames.findIndex((frame) => frame.id === preview.frameId) ?? -1
      const frame = frameIndexInStory >= 0 ? story?.frames[frameIndexInStory] : undefined
      if (story && frame && frameIndexInStory >= 0) {
        void archiveHighQualityFrame(story, frame, frameIndexInStory, preview.blob)
      }
    }
  }

  let destroyed = false
  // `longFrameBlockedUntil` (9-20s) serve al pacing della PROSSIMA
  // generazione, non alla ricchezza visiva del renderer attivo: con gap
  // RAF frequenti quella finestra resta quasi sempre estesa, e
  // propagarla a `setResourcePressure` degradava i renderer per la
  // maggior parte del tempo, non solo durante gli stalli reali
  // (segnalato dal Capo Supremo: "ridotto mobilità e sensibilità
  // musicale"). Il passthrough/flash ha bisogno solo di coprire il
  // momento dello stallo, non l'intera finestra di backoff — un impulso
  // breve, dedicato, distinto dalla finestra lunga di generazione.
  const VISUAL_PRESSURE_PULSE_MS = 2_500
  // Varco Percettivo armato in coda per il moto di coscienza (vedi
  // `requestConsciousnessInfluence`): da quando il candidato è "in coda"
  // all'attivazione vera passa fino a un'intera durata di beat (il layer
  // aspetta `rhythm.beat`, non un tempo fisso) — più lungo del breve
  // impulso GPU, serve un margine che sopravviva a un beat irregolare.
  const CONSCIOUSNESS_MOTION_PULSE_LEAD_MS = 4_000
  let visualPressurePulseUntil = 0
  const reportThermalEvent = (event: BrainThermalSchedulerEvent) => {
    if (event.type === 'long-frame') {
      visualPressurePulseUntil = performance.now() + VISUAL_PRESSURE_PULSE_MS
      brainWarn('thermal', 'gap RAF: estendo la pausa prima della prossima inferenza', event)
      return
    }
    brainLog('thermal', `scheduler inferenza: ${event.type}`, event)
  }
  // Semaforo davanti al carico GPU (segnalato dal Capo Supremo: il mix
  // FilterPsiche+Psycho2D scattava sempre con lo stallo già in corso,
  // perché `visualPressurePulseUntil` veniva armato solo REATTIVAMENTE,
  // dopo che il thermalScheduler misurava un gap RAF già avvenuto). Qui
  // siamo NOI a iniziare il carico (una singola chiamata GPU per
  // fotogramma dentro `Psichedel.generate`, vedi `runInference`), quindi
  // possiamo armare il passthrough PRIMA di prendere la GPU invece di
  // reagire a stallo avvenuto: rosso (flash/glitch/mix armati) → breve
  // attesa perché il crossfade sia già in scena → verde (si procede con
  // l'inferenza). Se il passthrough è già attivo (fotogrammi ravvicinati
  // della stessa storia) non si attende di nuovo — l'attesa serve solo al
  // fronte di salita.
  const PROACTIVE_PRESSURE_LEAD_MS = 260
  const armVisualPressureBeforeGpuLoad = async (): Promise<void> => {
    const now = performance.now()
    const alreadyArmed = now < visualPressurePulseUntil
    visualPressurePulseUntil = Math.max(
      visualPressurePulseUntil,
      now + PROACTIVE_PRESSURE_LEAD_MS + VISUAL_PRESSURE_PULSE_MS,
    )
    if (alreadyArmed) return
    await new Promise<void>((resolve) => window.setTimeout(resolve, PROACTIVE_PRESSURE_LEAD_MS))
  }
  const thermalScheduler = new BrainThermalScheduler({
    cooldownMs: BRAIN_CONFIG.imageInferenceCooldownMs,
    lowPowerCooldownMs: BRAIN_CONFIG.lowPowerImageInferenceCooldownMs,
    longFrameThresholdMs: BRAIN_CONFIG.imageInferenceLongFrameThresholdMs,
    severeLongFrameThresholdMs:
      BRAIN_CONFIG.imageInferenceSevereFrameThresholdMs,
    longFrameBackoffMs: BRAIN_CONFIG.imageInferenceLongFrameBackoffMs,
    severeLongFrameBackoffMs:
      BRAIN_CONFIG.imageInferenceSevereFrameBackoffMs,
    onEvent: reportThermalEvent,
  })
  const psychedel = new Psichedel(
    undefined,
    undefined,
    showRawRaster,
    undefined,
    async (active) => {
      brainPerformanceMetrics.setInference(active)
      // Ogni anteprima resta visibile mentre UNet prepara la successiva.
      rasterList.style.display = 'grid'
      edgeSoftener.style.display = active ? 'none' : 'block'
      root.setAttribute(
        'data-brain-image-inference',
        active ? 'active' : 'idle',
      )
      if (active) await armVisualPressureBeforeGpuLoad()
    },
    thermalScheduler,
  )
  let storyAi: BrainAiClient | null = null
  let brainTranslator: BrainTranslator | null = null
  let status: BrainStatus | null = null
  let currentProduction: BrainProduction | null = null
  let nextProduction: BrainProduction | null = null
  let pendingStory: BrainProduction['story'] | null = null
  let storyPanelTimerId = 0
  let visibleStoryPanelId: string | null = null
  const storyQueue: BrainProduction['story'][] = []
  let recyclingStoryFrames = false
  let generating = false
  let frameIndex = 0
  let frameStartedAt = 0
  let transitionStartedAt = 0
  let silenceStartedAt: number | null = null
  let currentFrameMorphPattern: BrainFrameMorphPattern = 'marea'
  let activeFrameTiming = calculateBrainFrameTiming(
    500,
    getBrainRenderingConfig().timing.frameDurationMs,
    'marea',
  )
  let previousFrameMorphPattern: BrainFrameMorphPattern | null = null
  let currentSvg: BrainSvgController | null = null
  let outgoingSvg: BrainSvgController | null = null
  const offlineWindow = new BrainOfflineGenerationWindow({
    maxDurationMs: BRAIN_CONFIG.offlineWindowMaxMs,
    onBeginOffline: () => {
      currentSvg?.setOfflineHold?.(true)
      brainLog('offline-gen', 'generazione concorrente iniziata: visuale dinamica alleggerita')
    },
    onEndOffline: () => {
      currentSvg?.setOfflineHold?.(false)
      brainLog('offline-gen', 'generazione concorrente conclusa: renderer pieno ripristinato')
    },
  })
  const print2dModes = new Map<string, BrainPrint2dMode>()
  const brainRendererRegistry = createDefaultBrainRendererRegistry()
  const brainVectorSceneCache = new BrainVectorSceneCache(
    new BrainVectorizer(),
    BRAIN_CONFIG.renderFrameCount * 2,
  )
  const brainRendererSelector = new BrainRendererSelector(
    brainRendererRegistry.ids(),
    undefined,
    undefined,
    () => performance.now() < thermalScheduler.getSnapshot().longFrameBlockedUntil,
    () => revisionCycleActive,
  )
  let transitionCounterpartShapes: BrainMorphShape[] = []
  let latestPayload: VisualStatePayload | null = null
  let recentPhrases: string[] = []
  let recentStories: DreamStoryMemory[] = []
  let nextContinuityPhrase: string | null = null
  let recentBridges: string[] = []
  let sessionMemo: SessionMemo | null = null
  let ordinaryStoriesSinceSynthesis = 0
  let nextSessionSynthesisAt = selectSessionSynthesisInterval()
  const consciousnessEpisodeId = `brain-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const consciousnessCore = new CoscienzaCore(consciousnessEpisodeId)
  let consciousnessBeginningState: 'idle' | 'saving' | 'done' = 'idle'
  let nextConsciousnessBeginningAttemptAt = 0
  const generationFailures = new Map<string, number>()
  let retryAttempt = 0
  let rafId = 0
  let retryTimerId = 0
  let generationCooldownTimerId = 0
  let nextGenerationAllowedAt = 0
  let nextGenerationTargetAt = 0
  let completedStoryRendererPasses = 0
  let storyStartedAt = 0
  let storyCycleCompletionReported = false
  let storyCycleInterludeCompleted = false
  let consciousnessMotionPausedAt: number | null = null
  const consciousnessMotionMemoryIds = new Set<string>()
  const consciousnessMotionStoryIds = new Set<string>()
  // Ciclo di Revisione (PIANO-034): ogni 2-4 storie (casuale, sempre a
  // confine di storia) la generazione si sospende e immagini già
  // generate ad alta qualità ritornano, deformate da un morphing
  // intensificato — filosofia.md §1 (Lowen: carica/scarica) e §2
  // (invarianti onirici, "un elemento ritorna deformato").
  let storiesUntilNextRevisionCycle = pickStoriesUntilNextRevisionCycle()
  let revisionCycleActive = false
  let revisionCycleActiveUntil = 0
  let pendingProductionAfterRevisionCycle: BrainProduction | null = null
  // `beginRevisionCycle` attende una IPC async (`loadDreamImages`) prima
  // di chiamare `startProduction`: finché non risolve, `nextProduction`
  // resta non nullo e `recyclingStoryFrames` resta vero, quindi
  // `advanceTimeline` può rientrare nello stesso ramo più volte durante
  // l'attesa e innescare il ciclo due volte in parallelo. Questa guardia
  // lo impedisce.
  let revisionCycleStarting = false
  let cachedDreamImageEntries: DreamImageArchiveEntry[] = []
  const applySurfaceConfig = () => {
    const { edgeFeatherPx, edgeDarkness } =
      getBrainRenderingConfig().composition
    edgeSoftener.style.boxShadow =
      edgeFeatherPx > 0
        ? `inset 0 0 ${edgeFeatherPx}px rgba(0, 0, 0, ${edgeDarkness})`
        : 'none'
  }
  applySurfaceConfig()

  const rememberBeginning = (payload: VisualStatePayload): void => {
    const now = performance.now()
    if (
      consciousnessBeginningState !== 'idle' ||
      now < nextConsciousnessBeginningAttemptAt
    ) return
    const draft = createOriginMemoryDraft(payload, consciousnessEpisodeId)
    if (!draft) return
    const outputApi = window.fxOutput
    if (!outputApi) return
    consciousnessBeginningState = 'saving'
    void outputApi.saveConsciousnessMemory(draft).then((result) => {
      consciousnessBeginningState = 'done'
      brainLog('memoria', 'origine o ritorno all’origine salvato in Markdown', {
        kind: result.kind,
        memoryId: result.memoryId,
        relativePath: result.relativePath,
        consultedFiles: result.consultedFiles,
      })
    }).catch((error) => {
      consciousnessBeginningState = 'idle'
      nextConsciousnessBeginningAttemptAt = performance.now() + 10_000
      brainWarn('memoria', 'salvataggio dell’origine rimandato', error)
    })
  }

  const rememberStory = (
    story: BrainProduction['story'],
    memo: readonly string[],
  ): void => {
    const draft = createStoryMemoryDraft(
      story,
      consciousnessEpisodeId,
      memo,
    )
    const outputApi = window.fxOutput
    if (!outputApi) return
    void outputApi.saveConsciousnessMemory(draft).then((result) => {
      brainLog('memoria', 'ricordo onirico salvato in Markdown', {
        created: result.created,
        kind: result.kind,
        memoryId: result.memoryId,
        relativePath: result.relativePath,
        consultedFiles: result.consultedFiles,
      })
    }).catch((error) => {
      brainWarn(
        'memoria',
        'ricordo onirico non salvato: origine assente o archivio non disponibile',
        error,
      )
    })
  }

  const updatePresentConsciousness = (payload: VisualStatePayload): void => {
    const observedAt = payload.audioTimestampMs ?? (
      performance.timeOrigin + performance.now()
    )
    const snapshot = consciousnessCore.observe(payload, observedAt)
    if (!snapshot) return
    const outputApi = window.fxOutput
    if (!outputApi) return
    void outputApi.updateConsciousnessState(snapshot).then((result) => {
      brainLog('coscienza', 'struttura presente aggiornata in Markdown', {
        revision: result.revision,
        relativePath: result.relativePath,
        attention: snapshot.attentionTarget,
        checkpointReason: snapshot.checkpointReason,
        consultedFiles: result.consultedFiles,
      })
    }).catch((error) => {
      brainWarn(
        'coscienza',
        'aggiornamento della struttura presente rimandato',
        error,
      )
    })
  }

  const requestConsciousnessInfluence = async (
    story: BrainProduction['story'] | null,
  ): Promise<ConsciousnessMotionCandidate | null> => {
    const outputApi = window.fxOutput
    if (!outputApi || !story || consciousnessMotionStoryIds.has(story.id)) return null
    consciousnessMotionStoryIds.add(story.id)
    try {
      const candidate = await outputApi.suggestConsciousnessMotion({
        storyId: story.id,
        storyTitle: story.title,
        storySynopsis: story.synopsis,
        frameDescription: story.frames[frameIndex]?.description ?? null,
        excludedMemoryIds: [...consciousnessMotionMemoryIds],
      })
      if (!candidate) return null
      const accepted = consciousnessMotionLayer.offer(
        candidate,
        story.id,
        performance.now(),
      )
      if (!accepted) return null
      // Varco Percettivo in anticipo reale (segnalato dal Capo Supremo:
      // armarlo solo al fronte di salita dell'attivazione non basta, il
      // blocco si vede comunque perché il crossfade parte troppo tardi).
      // Da qui il candidato è "in coda": diventerà attivo al PROSSIMO
      // beat rilevato (`consciousnessMotionLayer.update`, non prima) — un
      // margine reale fino a un'intera durata di beat, non un singolo
      // fotogramma. Si arma qui, non al momento dell'attivazione.
      visualPressurePulseUntil = Math.max(
        visualPressurePulseUntil,
        performance.now() + CONSCIOUSNESS_MOTION_PULSE_LEAD_MS,
      )
      consciousnessMotionMemoryIds.add(candidate.memoryId)
      brainLog('coscienza', 'moto di coscienza preparato', {
        storyId: story.id,
        memoryId: candidate.memoryId,
        kind: candidate.kind,
        relevance: candidate.relevanceReason,
        consultedFiles: candidate.consultedFiles,
      })
      return candidate
    } catch (error) {
      brainWarn('coscienza', 'moto di coscienza rimandato', error)
      return null
    }
  }

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

  const showStoryPanelFor = (storyId: string): void => {
    if (visibleStoryPanelId === storyId) return
    visibleStoryPanelId = storyId
    window.clearTimeout(storyPanelTimerId)
    // Riattivazione (PIANO-034): la sidebar del testo/storia deve restare
    // nascosta per tutta la durata del ciclo, non solo all'inizio — senza
    // questo controllo la produzione sintetica richiama comunque
    // `setDreamMonitor` per ogni fotogramma e la riporterebbe visibile a
    // metà ciclo.
    if (revisionCycleActive) return
    storyElement.style.transition = 'opacity 900ms ease'
    storyElement.style.opacity = '0.616'
    storyPanelTimerId = window.setTimeout(() => {
      storyElement.style.opacity = '0'
      storyPanelTimerId = 0
    }, 60_000)
  }

  const setDreamMonitor = (
    story: BrainProduction['story'],
    frame?: BrainProduction['story']['frames'][number],
    frameNumber?: number,
    suffix?: string,
  ) => {
    showStoryPanelFor(story.id)
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

  const applyFrame = (
    index: number,
    beatDurationMs = 500,
    beatIndex = 0,
  ) => {
    if (!currentProduction) return
    const scene = currentProduction.scenes[index]
    const frame = currentProduction.story.frames[index]
    if (!scene || !frame) return
    const hadVisibleFrame = currentSvg !== null
    outgoingSvg?.destroy()
    outgoingSvg = currentSvg
    transitionCounterpartShapes = currentSvg?.getMorphShapes() ?? []
    if (!outgoingSvg) svgHost.textContent = ''
    else outgoingSvg.element.style.zIndex = '2'
    currentFrameMorphPattern = selectBrainFrameMorphPattern(
      previousFrameMorphPattern,
      transitionPatternRandom(index, beatIndex, completedStoryRendererPasses),
    )
    previousFrameMorphPattern = currentFrameMorphPattern
    activeFrameTiming = calculateBrainFrameTiming(
      beatDurationMs,
      frame.durationMs,
      currentFrameMorphPattern,
    )
    const frameKey = `${currentProduction.story.id}:${frame.id}`
    const synchronizedRaster = scene.raster ?? rasterPreviewBlobs.get(frameKey)
    const productionForRenderer = currentProduction
    const getRendererImageSources = (): BrainRendererImageSource[] => {
      const sources: BrainRendererImageSource[] = []
      const append = (
        sourceIndex: number,
        role: BrainRendererImageSource['role'],
        production: BrainProduction,
      ) => {
        const sourceScene = production.scenes[sourceIndex]
        const sourceFrame = production.story.frames[sourceIndex]
        const raster = sourceScene?.raster ?? (
          sourceFrame
            ? rasterPreviewBlobs.get(`${production.story.id}:${sourceFrame.id}`)
            : undefined
        )
        if (!sourceScene || !sourceFrame || !raster) return
        const id = `${production.story.id}:${sourceFrame.id}`
        if (sources.some((source) => source.id === id)) return
        sources.push({
          id,
          role,
          scene: sourceScene,
          raster,
          narrativeHints: [
            sourceFrame.description,
            sourceFrame.visualIntent,
            sourceFrame.imagePrompt ?? '',
          ],
        })
      }
      append(index, 'current', productionForRenderer)
      if (productionForRenderer.scenes.length > 1) {
        append(
          (index - 1 + productionForRenderer.scenes.length) %
            productionForRenderer.scenes.length,
          'previous',
          productionForRenderer,
        )
      }
      if (nextProduction?.scenes[0]) append(0, 'next', nextProduction)
      else if (productionForRenderer.scenes.length > 1) {
        append(
          (index + 1) % productionForRenderer.scenes.length,
          'next',
          productionForRenderer,
        )
      }
      return sources
    }
    consciousnessMotionLayer.setImageSources(
      productionForRenderer.scenes.flatMap((sourceScene, sourceIndex) => {
        const sourceFrame = productionForRenderer.story.frames[sourceIndex]
        const raster = sourceScene.raster ?? (
          sourceFrame
            ? rasterPreviewBlobs.get(
                `${productionForRenderer.story.id}:${sourceFrame.id}`,
              )
            : undefined
        )
        return sourceFrame && raster
          ? [{
              id: `${productionForRenderer.story.id}:${sourceFrame.id}`,
              raster,
            }]
          : []
      }),
      `${productionForRenderer.story.id}:${frame.id}`,
    )
    currentSvg = synchronizedRaster
      ? createBrainRendererHost(
          svgHost,
          brainRendererRegistry,
          {
            scene,
            raster: synchronizedRaster,
            palette: currentProduction.story.palette,
            printMode: print2dModes.get(frameKey) ?? 'living-ink',
            getImageSources: getRendererImageSources,
            getVectorScene: async () => {
              const source = getRendererImageSources().find(
                (candidate) => candidate.role === 'current',
              )
              if (!source) {
                throw new Error('Raster corrente assente per Vector Morph')
              }
              return brainVectorSceneCache.get(source)
            },
            frameEnergy: frame.energy,
            frameIndex: index,
            frameCount: currentProduction.story.frames.length,
          },
          (settings, now) => brainRendererSelector.resolve(settings, now),
          latestPayload?.settings
            ? brainRendererSelector.resolve(
                latestPayload.settings,
                performance.now(),
              )
            : 'print2d',
          () => revisionCycleActive,
          (id, settings, now) => brainRendererSelector.reportRendererFailure(id, settings, now),
        )
      : createBrainSvgScene(
          svgHost,
          scene,
          currentProduction.story.palette,
          {
            frameEnergy: frame?.energy ?? 0.5,
            frameIndex: index,
            frameCount: currentProduction.story.frames.length,
          },
        )
    currentSvg.element.style.zIndex = '3'
    currentSvg.setOfflineHold?.(offlineWindow.isActive)
    currentSvg.setMorphPattern(currentFrameMorphPattern)
    currentSvg.setOpacity(hadVisibleFrame ? 0 : 1)
    frameIndex = index
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
      `PSICHEDEL // ${frame.title}`,
      scene.description,
    ].join('  ·  ')
    brainLog('render', `fotogramma ${index + 1}/${currentProduction.story.frames.length}`, {
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

  const recycleCurrentStoryFrame = (beatDurationMs = 500, beatIndex = 0) => {
    if (!currentProduction) return
    recyclingStoryFrames = true
    const recyclableFrameCount = currentProduction.scenes.length
    const nextFrameIndex = selectBrainRecycledFrameIndex(
      recyclableFrameCount,
      frameIndex,
    )
    applyFrame(nextFrameIndex, beatDurationMs, beatIndex)
    const recycledFrame = currentProduction.story.frames[nextFrameIndex]
    setDreamMonitor(
      currentProduction.story,
      recycledFrame,
      nextFrameIndex,
      'RICIRCOLO ONIRICO > IMMAGINI ESISTENTI IN MOVIMENTO\nATTESA > NUOVA STORIA',
    )
    brainLog('pipeline', 'ricircolo leggero dei fotogrammi durante l’attesa', {
      storyId: currentProduction.story.id,
      frameIndex: nextFrameIndex,
      imageBufferSize: recyclableFrameCount,
      morphPattern: currentFrameMorphPattern,
    })
  }

  const startProduction = (production: BrainProduction, beatDurationMs = 500, beatIndex = 0) => {
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
      }
    }
    print2dModes.clear()
    const visualFrames = production.story.frames
    const modeSequence = buildPrint2dModeSequence(visualFrames.length)
    visualFrames.forEach((frame, index) => {
      print2dModes.set(
        `${production.story.id}:${frame.id}`,
        modeSequence[index] ?? 'living-ink',
      )
    })
    currentProduction = production
    recyclingStoryFrames = false
    completedStoryRendererPasses = 0
    storyStartedAt = performance.now()
    storyCycleCompletionReported = false
    storyCycleInterludeCompleted = false
    brainRendererSelector.beginStory(
      production.story.id,
      latestPayload?.settings,
    )
    setDreamMonitor(production.story)
    nextProduction = null
    applyFrame(0, beatDurationMs, beatIndex)
    window.setTimeout(() => void generateNext(), 0)
  }

  // --- Ciclo di Revisione (PIANO-034) ---------------------------------

  const refreshDreamImageArchiveCache = (): void => {
    const api = window.fxOutput
    if (!api) return
    void api.queryDreamImageEntries()
      .then((entries) => { cachedDreamImageEntries = entries })
      .catch(() => undefined)
  }

  const findStoryById = (storyId: string): DreamStory | null => {
    if (currentProduction?.story.id === storyId) return currentProduction.story
    if (nextProduction?.story.id === storyId) return nextProduction.story
    if (pendingStory?.id === storyId) return pendingStory
    return storyQueue.find((story) => story.id === storyId) ?? null
  }

  const archiveHighQualityFrame = async (
    story: DreamStory,
    frame: DreamFrame,
    frameIndexInStory: number,
    blob: Blob,
  ): Promise<void> => {
    const api = window.fxOutput
    if (!api) return
    try {
      const bytes = new Uint8Array(await blob.arrayBuffer())
      const previousEnergy = frameIndexInStory > 0
        ? story.frames[frameIndexInStory - 1]?.energy ?? null
        : null
      const phase = deriveOneiricPhase(frameIndexInStory, story.frames.length)
      const state = deriveBioenergeticState(frame.energy, previousEnergy)
      await api.saveDreamImage({
        tag: combineRevisionTag(phase, state),
        storyId: story.id,
        frameId: frame.id,
        frameIndex: frameIndexInStory,
        energy: frame.energy,
        title: frame.title,
        bytes,
      })
      refreshDreamImageArchiveCache()
    } catch (error) {
      brainWarn('render', 'salvataggio nell’archivio del Ciclo di Revisione fallito', { error })
    }
  }

  const buildRevisionProduction = (
    loaded: readonly { fileName: string; bytes: Uint8Array }[],
    entriesByFileName: ReadonlyMap<string, DreamImageArchiveEntry>,
    palette: DreamStory['palette'],
  ): BrainProduction | null => {
    const storyId = `revision:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`
    const usable = loaded.filter((image) => entriesByFileName.has(image.fileName))
    if (usable.length === 0) return null
    const baseDurationMs = getBrainRenderingConfig().timing.frameDurationMs
    const shuffleImages = <T,>(list: readonly T[]): T[] => {
      const copy = [...list]
      for (let index = copy.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1))
        ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
      }
      return copy
    }
    const frames: DreamFrame[] = []
    const scenes: PsychedelScene[] = []
    // Le immagini scelte non passano una volta sola: girano per
    // REVISION_CYCLE_LAPS giri, ciascuno più breve del precedente (un
    // ricordo richiamato ripetutamente si consuma più in fretta) — ordine
    // rimescolato a ogni giro per varietà.
    for (let lap = 0; lap < REVISION_CYCLE_LAPS; lap += 1) {
      const order = shuffleImages(usable)
      const lapDurationMs = computeRevisionLapDurationMs(baseDurationMs, lap)
      order.forEach((image, index) => {
        const entry = entriesByFileName.get(image.fileName)
        if (!entry) return
        const frameId = `${storyId}-lap${lap}-${index}`
        frames.push({
          id: frameId,
          title: entry.title || 'Eco',
          description: entry.title || '',
          visualIntent: '',
          energy: entry.energy,
          durationMs: lapDurationMs,
        })
        scenes.push({
          frameId,
          description: entry.title || '',
          svg: '<svg xmlns="http://www.w3.org/2000/svg"/>',
          raster: new Blob([new Uint8Array(image.bytes)], { type: 'image/webp' }),
        })
      })
    }
    if (frames.length === 0) return null
    const story: DreamStory = {
      id: storyId,
      title: 'Riattivazione',
      synopsis: 'Un ricordo già immaginato riaffiora e si ridepone, deformato dal morphing.',
      bridge: null,
      continuityPhrase: null,
      palette,
      sourcePhrases: [],
      frames,
    }
    return { story, scenes }
  }

  const beginRevisionCycle = async (
    realNextProduction: BrainProduction,
    beatDurationMs: number,
    beatIndex: number,
  ): Promise<void> => {
    const api = window.fxOutput
    const referenceStory = currentProduction?.story ?? null
    const referenceFrame = referenceStory?.frames[frameIndex] ?? null
    const currentPhase = referenceStory && referenceFrame
      ? deriveOneiricPhase(frameIndex, referenceStory.frames.length)
      : 'eco'
    const currentState = referenceFrame
      ? deriveBioenergeticState(
        referenceFrame.energy,
        frameIndex > 0 ? referenceStory?.frames[frameIndex - 1]?.energy ?? null : null,
      )
      : 'quiete'
    const pool = api ? selectRevisionPool(cachedDreamImageEntries, currentPhase, currentState) : null
    if (!api || !pool) {
      // Archivio vuoto o bridge non disponibile: si salta silenziosamente
      // il ciclo, la storia successiva parte normalmente.
      startProduction(realNextProduction, beatDurationMs, beatIndex)
      return
    }
    const chosen = pickRevisionEntries(pool.entries, pickRevisionImageCount())
    const loaded = await api.loadDreamImages(chosen.map((entry) => entry.fileName))
      .catch(() => [])
    if (destroyed) return
    if (loaded.length === 0) {
      startProduction(realNextProduction, beatDurationMs, beatIndex)
      return
    }
    const entriesByFileName = new Map(chosen.map((entry) => [entry.fileName, entry]))
    const palette = currentProduction?.story.palette ?? realNextProduction.story.palette
    const revisionProduction = buildRevisionProduction(loaded, entriesByFileName, palette)
    if (!revisionProduction) {
      startProduction(realNextProduction, beatDurationMs, beatIndex)
      return
    }
    pendingProductionAfterRevisionCycle = realNextProduction
    revisionCycleActive = true
    root.dataset.revisionCycleActive = 'true'
    // Le sidebar laterali (testo/storia a sinistra, galleria raster a
    // destra) spariscono per tutta la Riattivazione — riappaiono da sole
    // quando la produzione normale riprende (segnalato dal Capo Supremo).
    window.clearTimeout(storyPanelTimerId)
    storyPanelTimerId = 0
    storyElement.style.transition = 'opacity 600ms ease'
    storyElement.style.opacity = '0'
    rasterMonitor.style.transition = 'opacity 600ms ease'
    rasterMonitor.style.opacity = '0'
    revisionCycleActiveUntil = performance.now() +
      revisionProduction.story.frames.reduce((total, frame) => total + frame.durationMs, 0)
    setBrainRevisionBoost(true)
    brainLog('pipeline', 'riattivazione iniziata', {
      tag: pool.tagUsed,
      images: revisionProduction.story.frames.length,
    })
    startProduction(revisionProduction, beatDurationMs, beatIndex)
  }

  const advanceToNextProduction = (
    readyNextProduction: BrainProduction,
    beatDurationMs: number,
    beatIndex: number,
  ): void => {
    if (storiesUntilNextRevisionCycle > 0) {
      storiesUntilNextRevisionCycle -= 1
      startProduction(readyNextProduction, beatDurationMs, beatIndex)
      return
    }
    if (revisionCycleStarting || revisionCycleActive) return
    revisionCycleStarting = true
    void beginRevisionCycle(readyNextProduction, beatDurationMs, beatIndex)
      .finally(() => { revisionCycleStarting = false })
  }

  // ---------------------------------------------------------------------

  const generateStoryBatch = async (targetCount: number) => {
    await modelCacheReady
    await loadBrainRenderingConfig()
    applySurfaceConfig()
    const missingCount = Math.max(0, targetCount - storyQueue.length)
    if (missingCount === 0) return
    if (currentProduction) {
      const retainImageModel = shouldRetainImageModelBetweenStories(
        BRAIN_CONFIG.retainImageModelBetweenStories,
        latestPayload?.settings?.lowPowerMode === true,
      )
      if (retainImageModel) {
        brainLog('pipeline', 'sessioni immagini mantenute residenti fra storie', {
          currentStoryId: currentProduction.story.id,
          imageModelRetainedDuringDisplay: true,
          lowPowerMode: false,
          experiment: 'retain-image-model-between-stories',
        })
      } else {
        const releaseStartedAt = performance.now()
        brainLog(
          'pipeline',
          'passaggio GPU tra storie: rilascio il modello immagini prima dell’AI testuale',
          {
            currentStoryId: currentProduction.story.id,
            imageModelRetainedDuringDisplay: true,
            lowPowerMode: latestPayload?.settings?.lowPowerMode === true,
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
          const consciousnessInfluence = await requestConsciousnessInfluence(
            currentProduction?.story ?? null,
          )
          const story = await coscienza.generate(phrases, recentStories, {
            sessionMemo: sessionMemo ?? undefined,
            sessionSynthesis,
            continuitySeed: continuityPhrase,
            recentBridges,
            consciousnessInfluence,
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
          rememberStory(story, sessionMemo)
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
    // Ciclo di Revisione (PIANO-034): durante la rielaborazione la
    // generazione è sospesa del tutto, non solo allungata — il budget GPU
    // liberato va alla qualità visiva. Riprende da sola non appena il
    // ciclo termina (vedi `advanceTimeline`).
    if (destroyed || generating || nextProduction || revisionCycleActive) return
    const cooldownRemainingMs =
      nextGenerationAllowedAt - performance.now()
    if (cooldownRemainingMs > 0) {
      if (generationCooldownTimerId === 0) {
        generationCooldownTimerId = window.setTimeout(() => {
          generationCooldownTimerId = 0
          void generateNext()
        }, cooldownRemainingMs)
        brainLog('pipeline', 'attesa prima del refill distribuito', {
          refillStartsInMs: Math.round(cooldownRemainingMs),
          targetInMs: Math.max(
            0,
            Math.round(nextGenerationTargetAt - performance.now()),
          ),
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
    const hardDeadlineAt =
      productionStartedAt + BRAIN_CONFIG.nextStoryHardDeadlineMs
    const productionDeadlineAt =
      currentProduction && nextGenerationTargetAt > productionStartedAt
        ? Math.min(hardDeadlineAt, nextGenerationTargetAt)
        : hardDeadlineAt
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
      const generateScenes = (signal: AbortSignal) => {
        void signal
        return psychedel.generate(
          story,
          productionDeadlineAt,
          (scene, sceneIndex) => {
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
            const startRenderingImmediately =
              shouldActivateProgressiveImageBuffer(Boolean(currentProduction))
            if (startRenderingImmediately) {
              startProduction(progressiveProduction)
            }
            brainLog('pipeline', 'refill progressivo preparato dopo due fotogrammi AI', {
              storyId: story.id,
              readyFrames: progressiveScenes.size,
              reusedFrames: progressiveProduction.scenes.length - progressiveScenes.size,
              startRenderingImmediately,
              currentBufferRetainedUntilComplete: !startRenderingImmediately,
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
          () => performance.now() < thermalScheduler.getSnapshot().longFrameBlockedUntil,
        )
      }
      const scenes = BRAIN_CONFIG.offlineGenerationEnabled
        ? await offlineWindow.run(generateScenes) ?? []
        : await generateScenes(new AbortController().signal)
      if (destroyed) return
      if (!isCompleteBrainImageBuffer(
        scenes.length,
        BRAIN_CONFIG.renderFrameCount,
      )) {
        throw new Error(
          `Buffer immagini incompleto: ${scenes.length}/${BRAIN_CONFIG.renderFrameCount}`,
        )
      }
      const productionCompletedAt = performance.now()
      const rendererMode = latestPayload?.settings?.brainRendererMode ?? 'manual'
      const refillWindow = calculateNextStoryRefillWindowForMode(
        productionCompletedAt,
        rendererMode,
      )
      nextGenerationAllowedAt = refillWindow.startsAt
      nextGenerationTargetAt = refillWindow.targetAt
      brainLog(
        'pipeline',
        'buffer corrente mantenuto durante il refill distribuito',
        {
          storyId: story.id,
          imageBufferSize: scenes.length,
          refillStartsInMs: Math.max(
            0,
            Math.round(nextGenerationAllowedAt - performance.now()),
          ),
          nextStoryTargetInMs: Math.max(
            0,
            Math.round(nextGenerationTargetAt - performance.now()),
          ),
        },
      )
      const production: BrainProduction = {
        story,
        scenes,
      }
      pendingStory = null
      generationFailures.delete(story.id)
      retryAttempt = 0
      brainLog('pipeline', 'produzione completa', {
        storyId: story.id,
        frames: story.frames.length,
        images: scenes.length,
        imageBufferSize: scenes.length,
        durationMs: Math.round(performance.now() - productionStartedAt),
        refillStartDelayMs:
          refillWindow.startsAt - productionCompletedAt,
        nextStoryTargetMs: refillWindow.targetAt - productionCompletedAt,
        rendererMode,
        hardDeadlineMs: BRAIN_CONFIG.nextStoryHardDeadlineMs,
      })
      if (!currentProduction) {
        startProduction(production)
      } else if (currentProduction.story.id === story.id) {
        currentProduction.scenes = scenes
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
        if (error instanceof BrainAiInfrastructureError) {
          brainWarn(
            'pipeline',
            'errore AI con sessioni immagini residenti; libero il modello prima del retry',
          )
          await psychedel.releaseImageModel()
        }
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
    rhythmActive: boolean,
    onBeat: boolean,
    beatPhase: number,
    beatDurationMs: number,
    beatIndex: number,
  ) => {
    if (!rhythmActive) return
    if (!currentProduction) return
    if (storyCycleCompletionReported) return
    if (revisionCycleActive) {
      if (now >= revisionCycleActiveUntil) {
        revisionCycleActive = false
        root.dataset.revisionCycleActive = 'false'
        setBrainRevisionBoost(false)
        // Riappaiono: `setDreamMonitor` per la produzione ripresa richiama
        // `showStoryPanelFor` a breve, ora che il guard sopra è disattivo —
        // la galleria raster va invece ripristinata esplicitamente, non ha
        // un trigger naturale successivo (Riattivazione non genera nuove
        // anteprime).
        rasterMonitor.style.transition = 'opacity 600ms ease'
        rasterMonitor.style.opacity = '0.546'
        storiesUntilNextRevisionCycle = pickStoriesUntilNextRevisionCycle()
        const resumedProduction = pendingProductionAfterRevisionCycle
        pendingProductionAfterRevisionCycle = null
        brainLog('pipeline', 'riattivazione conclusa; generazione ripresa', {
          storyId: currentProduction.story.id,
        })
        if (resumedProduction) {
          startProduction(resumedProduction, beatDurationMs, beatIndex)
        } else {
          void generateNext()
        }
        return
      }
      // Mentre il ciclo è attivo i fotogrammi della storia sintetica
      // avanzano con la stessa logica sotto (boost già impostato altrove):
      // nessuna eccezione al di fuori del controllo di uscita sopra.
    }
    const frame =
      currentProduction.story.frames[frameIndex]
    if (!frame) return
    const elapsed = now - frameStartedAt
    if (elapsed < activeFrameTiming.totalMs) return
    const beatAligned = onBeat || beatPhase <= 0.07 || beatPhase >= 0.93
    const rendererSettings = latestPayload?.settings
    const storyCycle = rendererSettings?.brainRendererMode === 'story-cycle'
    if (!beatAligned && storyCycle) return
    if (!beatAligned && elapsed < activeFrameTiming.totalMs + 2_000) return
    if (recyclingStoryFrames) {
      if (nextProduction) {
        brainLog('pipeline', 'nuova storia pronta; uscita dal ricircolo leggero', {
          previousStoryId: currentProduction.story.id,
          nextStoryId: nextProduction.story.id,
        })
        advanceToNextProduction(nextProduction, beatDurationMs, beatIndex)
        return
      }
      const waitingRendererChanged = rendererSettings &&
        brainRendererSelector.advanceWaitingRenderer(rendererSettings, now)
      if (waitingRendererChanged) {
        brainLog('pipeline', 'renderer casuale avanzato durante l’attesa', {
          storyId: currentProduction.story.id,
          rendererId: brainRendererSelector.resolve(rendererSettings, now),
          rendererOrder: 'waiting-random-without-replacement',
        })
      }
      recycleCurrentStoryFrame(beatDurationMs, beatIndex)
      if (!generating) void generateNext()
      return
    }
    if (
      frameIndex < currentProduction.story.frames.length - 1
    ) {
      if (
        rendererSettings?.brainRendererMode === 'story-cycle' &&
        brainRendererSelector.advanceStoryRenderer(
          currentProduction.story.id,
          rendererSettings,
          now,
        )
      ) {
        completedStoryRendererPasses += 1
        brainLog('pipeline', 'renderer casuale assegnato al prossimo fotogramma', {
          storyId: currentProduction.story.id,
          nextFrameIndex: frameIndex + 1,
          rendererId: brainRendererSelector.resolve(rendererSettings, now),
          rendererOrder: 'random-without-replacement',
        })
      }
      applyFrame(frameIndex + 1, beatDurationMs, beatIndex)
      if (!generating && !nextProduction) {
        window.setTimeout(() => void generateNext(), 0)
      }
      return
    }
    if (
      storyCycle &&
      rendererSettings?.alternateBrainWithMorphing === true &&
      options.onStoryCycleComplete &&
      !storyCycleInterludeCompleted
    ) {
      storyCycleCompletionReported = true
      const completion = {
        storyId: currentProduction.story.id,
        brainDurationMs: Math.max(0, now - storyStartedAt),
        rendererPasses: completedStoryRendererPasses + 1,
      }
      brainLog('pipeline', 'storia Brain completa; interludio morphing autorizzato', completion)
      options.onStoryCycleComplete(completion)
      return
    }
    if (nextProduction) {
      brainLog('pipeline', 'storia terminata; morphing SVG verso la storia successiva', {
        storyId: currentProduction.story.id,
        nextStoryId: nextProduction.story.id,
      })
      advanceToNextProduction(nextProduction, beatDurationMs, beatIndex)
      return
    }
    brainLog('pipeline', 'storia terminata; riciclo le immagini mentre attendo', {
      storyId: currentProduction.story.id,
      pendingStoryId: pendingStory?.id ?? null,
      generationActive: generating,
    })
    recycleCurrentStoryFrame(beatDurationMs, beatIndex)
    if (generating) setStatus('rendering+generation')
    if (!generating) void generateNext()
  }

  const render = (now: number) => {
    rafId = requestAnimationFrame(render)
    if (destroyed) return
    thermalScheduler.recordFrame(now)
    brainPerformanceMetrics.recordOutputRaf(now)
    const bands = latestPayload?.bandEnergies ?? SILENT_BANDS
    const rhythm = options.rhythmSource?.() ?? {
      active: false,
      beat: false,
      beatIndex: 0,
      beatPhase: 0,
      musicalPosition: 0,
      beatPulse: 0,
      kickEnvelope: 0,
      beatDurationMs: 500,
      bandTransients: SILENT_BANDS,
    }
    if (rhythm.active === true && silenceStartedAt !== null) {
      const silenceDuration = Math.max(0, now - silenceStartedAt)
      frameStartedAt += silenceDuration
      transitionStartedAt += silenceDuration
      silenceStartedAt = null
    } else if (rhythm.active !== true && silenceStartedAt === null) {
      silenceStartedAt = now
    }
    const rhythmicNow = silenceStartedAt ?? now
    const motionState = consciousnessMotionLayer.update(
      rhythm,
      rhythmicNow,
      latestPayload?.settings?.lowPowerMode === true,
    )
    if (motionState.active && consciousnessMotionPausedAt === null) {
      consciousnessMotionPausedAt = rhythmicNow
      // Varco Percettivo (nome condiviso con la Direzione VJ, vedi
      // `brainRendererHost.ts`): lo stesso flash+glitch+mix che maschera
      // il carico GPU segnala anche qui — il fronte di salita del moto di
      // coscienza congela la timeline della storia esattamente come un
      // vero stallo, merita lo stesso segnale, non uno nuovo.
      visualPressurePulseUntil = Math.max(
        visualPressurePulseUntil,
        performance.now() + VISUAL_PRESSURE_PULSE_MS,
      )
    }
    if (motionState.completedPauseMs > 0) {
      frameStartedAt += motionState.completedPauseMs
      transitionStartedAt += motionState.completedPauseMs
      consciousnessMotionPausedAt = null
      brainLog('coscienza', 'moto concluso; rotazione Brain ripresa', {
        pauseMs: Math.round(motionState.completedPauseMs),
      })
    }
    const timelineNow = consciousnessMotionPausedAt ?? rhythmicNow
    if (!motionState.active) {
      advanceTimeline(
        timelineNow,
        rhythm.active === true,
        rhythm.beat,
        rhythm.beatPhase,
        rhythm.beatDurationMs,
        rhythm.beatIndex,
      )
    }
    const transition = smootherstep(
      (timelineNow - transitionStartedAt) / activeFrameTiming.transitionMs,
    )
    currentSvg?.setOpacity(outgoingSvg ? transition : 1)
    outgoingSvg?.setOpacity(1 - transition)
    // Impulso breve e dedicato (non la finestra lunga di backoff della
    // generazione, vedi `visualPressurePulseUntil` sopra): attiva il
    // passthrough leggero FilterPsiche+Psycho2D e il flash solo per
    // coprire il momento dello stallo, non per degradare la ricchezza
    // visiva di ogni renderer per 9-20s a ogni gap RAF.
    const resourcePressureActive = now < visualPressurePulseUntil
    currentSvg?.setResourcePressure?.(resourcePressureActive)
    outgoingSvg?.setResourcePressure?.(resourcePressureActive)
    currentSvg?.setTransition(
      transition,
      'enter',
      transitionCounterpartShapes,
    )
    outgoingSvg?.setTransition(transition, 'exit')
    // Riattivazione (PIANO-034): "più morphing tra render e immagini, non
    // solo fadein/fadeout". Applicato SOLO qui (cambio fra un fotogramma
    // e il successivo, il livello meno frequente), non nel cambio
    // renderer interno di `brainRendererHost.ts`: lì la Riattivazione
    // alterna i renderer quasi ad ogni fotogramma tenuto, e sommare un
    // blend additivo ad ogni singolo micro-cambio si accumulava in un
    // effetto "tutto glitchato" (segnalato dal Capo Supremo) invece di
    // una fusione leggibile. Un solo cambio di blend mode, mai un filtro
    // ricalcolato per frame: costo trascurabile.
    if (outgoingSvg) {
      outgoingSvg.element.style.mixBlendMode = revisionCycleActive ? 'lighter' : 'normal'
      if (currentSvg) {
        currentSvg.element.style.mixBlendMode = revisionCycleActive ? 'lighter' : 'normal'
      }
    }
    if (transition >= 1 && outgoingSvg) {
      outgoingSvg.destroy()
      outgoingSvg = null
      transitionCounterpartShapes = []
    }

    if (latestPayload?.settings) {
      currentSvg?.update(
        bands,
        latestPayload.settings,
        now,
        rhythm,
        latestPayload.movingAverages,
        {
          active: latestPayload.flashActive,
          intensity: latestPayload.flashIntensity ?? 0,
        },
      )
      outgoingSvg?.update(
        bands,
        latestPayload.settings,
        now,
        rhythm,
        latestPayload.movingAverages,
        {
          active: latestPayload.flashActive,
          intensity: latestPayload.flashIntensity ?? 0,
        },
      )
    }
  }

  setStatus('generation')
  rafId = requestAnimationFrame(render)
  brainLog('pipeline', 'attesa produzione AI reale; nessun fotogramma simulato')
  void generateNext()
  refreshDreamImageArchiveCache()

  return {
    setOpacity(opacity: number) {
      root.style.opacity = String(clamp01(opacity))
    },
    updateState(payload: VisualStatePayload) {
      const previousRendererMode = latestPayload?.settings?.brainRendererMode
      latestPayload = payload
      const rendererMode = payload.settings?.brainRendererMode ?? 'manual'
      if (
        currentProduction &&
        previousRendererMode !== rendererMode
      ) {
        completedStoryRendererPasses = 0
        if (!nextProduction && !generating) {
          window.setTimeout(() => void generateNext(), 0)
        }
      }
      rememberBeginning(payload)
      updatePresentConsciousness(payload)
      thermalScheduler.setLowPowerMode(
        payload.settings?.lowPowerMode === true,
      )
      const receivedAt = performance.timeOrigin + performance.now()
      brainPerformanceMetrics.recordVisualPacket(
        payload.performanceTelemetry,
        receivedAt,
        performance.now(),
      )
    },
    resumeStoryCycleAfterInterlude() {
      if (!storyCycleCompletionReported) return
      storyCycleCompletionReported = false
      storyCycleInterludeCompleted = true
      brainLog('pipeline', 'interludio morphing concluso; ripresa del flusso Brain', {
        storyId: currentProduction?.story.id ?? null,
      })
    },
    destroy() {
      brainLog('pipeline', 'arresto Brain')
      destroyed = true
      brainPerformanceMetrics.setGeneration(false)
      brainPerformanceMetrics.setInference(false)
      brainPerformanceMetrics.report()
      thermalScheduler.destroy()
      unsubscribeProcessMonitor()
      cancelAnimationFrame(rafId)
      window.clearTimeout(retryTimerId)
      window.clearTimeout(generationCooldownTimerId)
      window.clearTimeout(storyPanelTimerId)
      offlineWindow.abort()
      storyAi?.destroy()
      psychedel.destroy()
      consciousnessMotionLayer.destroy()
      currentSvg?.destroy()
      outgoingSvg?.destroy()
      transitionCounterpartShapes = []
      rasterPreviewBlobs.clear()
      print2dModes.clear()
      brainVectorSceneCache.clear()
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
