export type BandKey = 'low' | 'lowMid' | 'mid' | 'high'

export type MorphingAlgorithm = 'liquid' | 'oniric' | 'psy-hyp'
export type FlashMode = 'high' | 'mid' | 'low' | 'off'

export const MORPHING_ALGORITHMS: MorphingAlgorithm[] = ['liquid', 'oniric', 'psy-hyp']
export const FLASH_MODES: FlashMode[] = ['high', 'mid', 'low', 'off']

export function isMorphingAlgorithm(value: unknown): value is MorphingAlgorithm {
  return typeof value === 'string' && MORPHING_ALGORITHMS.includes(value as MorphingAlgorithm)
}

export function isFlashMode(value: unknown): value is FlashMode {
  return typeof value === 'string' && FLASH_MODES.includes(value as FlashMode)
}

export interface BandEnergies {
  low: number
  lowMid: number
  mid: number
  high: number
}

export interface AppSettings {
  fftSize: 256 | 512 | 1024 | 2048 | 4096 | 8192
  smoothingTimeConstant: number
  lowThresholdMultiplier: number
  lowMidThresholdMultiplier: number
  midThresholdMultiplier: number
  highThresholdMultiplier: number
  flashDurationMs: number
  decayMs: number
  cooldownMs: number
  sensitivity: number
  maxFlashesPerSecond: number
  flashMode: FlashMode
  idleColor: string
  basePinkColor: string
  hotPinkColor: string
  whiteFlashColor: string
  softMode: boolean
  selectedDisplayId: number | null
  selectedAudioInputId: string | null
  useMorphing: boolean
  morphingAlgorithm: MorphingAlgorithm
  morphingPresetId: string
  debugMorphingVisibility: boolean
  morphingOpacity: number
  morphingMinOpacity: number
  morphingLuminanceBoost: number
  morphingGlowIntensity: number
  morphingContrast: number
  morphingScale: number
  morphingEdgeSoftness: number
  backgroundDarkness: number
  flashTriggerBandMin: number
  flashTriggerBandMax: number
  secondaryFlashBandMin: number
  secondaryFlashBandMax: number
  flashThreshold: number
  transientDelta: number
  lowDominanceBlockRatio: number
  subMovement: number
  kickMovement: number
  flashOnKick: boolean
  selectedColorPresetId: string | null
  dynamicPresetEnabled: boolean
  dynamicColorRotationEnabled: boolean
  dynamicMorphingRotationEnabled: boolean
}

export interface DisplayInfo {
  id: number
  label: string
  bounds: { x: number; y: number; width: number; height: number }
  size: { width: number; height: number }
  scaleFactor: number
  internal: boolean
}

export interface VisualEngineDebug {
  lowTrigger: boolean
  thresholds: BandEnergies
  whiteMix: number
  pinkHotBlend: number
  overallDrive: number
  flashBlockedReason: 'none' | 'cooldown' | 'rate-limit' | 'panic'
}

export interface VisualEngineOutput {
  backgroundColor: string
  brightness: number
  flashActive: boolean
  flashIntensity: number
  flashMode: FlashMode
  debug: VisualEngineDebug
}

export interface VisualEngineState {
  lastTriggerMs: number
  flashHoldUntilMs: number
  whiteMix: number
  flashHistoryMs: number[]
  pinkHotBlend: number
  overallDrive: number
  customFlashBandAverage?: number
  prevCustomFlashBandEnergy?: number
  secondaryFlashBandAverage?: number
  flashStartedAtMs?: number
  manualFlashStartedAtMs?: number
  flashPeakIntensity?: number
  lastFlashCandidateMs?: number
  lastFlashCandidateIntervalMs?: number
  regularFlashCandidateCount?: number
}

export interface VisualEngineInput {
  nowMs: number
  /** Delta temporale dal frame precedente (per decay/attack coerenti) */
  deltaMs: number
  bandEnergies: BandEnergies
  movingAverages: BandEnergies
  prev: VisualEngineState
  settings: AppSettings
  panic: boolean
  /** Millisecond timestamp until which a manual test flash stays fully white */
  testFlashUntilMs: number
  /** Evita falsi trigger all'avvio mentre le medie non sono stabilizzate */
  audioPrimed: boolean
  rawFrequencyData?: Uint8Array
  sampleRate?: number
}

export const IPC_CHANNELS = {
  getDisplays: 'fx:get-displays',
  openOutput: 'fx:open-output',
  closeOutput: 'fx:close-output',
  saveSettings: 'fx:save-settings',
  loadSettings: 'fx:load-settings',
  sendVisualState: 'fx:send-visual-state',
  /** Main → output renderer */
  visualStatePush: 'fx:visual-state-push',
  outputClosed: 'fx:output-closed',
} as const

export interface VisualStatePayload {
  backgroundColor: string
  brightness: number
  flashActive: boolean
  flashIntensity?: number
  flashMode?: FlashMode
  useMorphing?: boolean
  bandEnergies?: BandEnergies
  settings?: AppSettings
  whiteMix?: number
}

export interface MorphingPreset {
  id: string
  name: string
  shapeCount: number
  blur: number
  opacity: number
  speed: number
  deformation: number
  scale: number
  blendMode: GlobalCompositeOperation
  lowScaleAmount: number
  lowMidDeformationAmount: number
  midOpacityAmount: number
  highNoiseAmount: number
  flashEdgeAmount: number
}

export interface ControlApi {
  getDisplays: () => Promise<DisplayInfo[]>
  openOutput: (displayId: number) => Promise<{ ok: boolean; error?: string }>
  closeOutput: () => Promise<void>
  saveSettings: (settings: AppSettings) => Promise<void>
  loadSettings: () => Promise<AppSettings | null>
  sendVisualState: (state: VisualStatePayload) => void
  onOutputClosed: (cb: () => void) => () => void
}

export interface OutputApi {
  onVisualState: (cb: (state: VisualStatePayload) => void) => () => void
}
