export type BandKey = 'low' | 'lowMid' | 'mid' | 'high'

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
  idleColor: string
  basePinkColor: string
  hotPinkColor: string
  whiteFlashColor: string
  softMode: boolean
  selectedDisplayId: number | null
  selectedAudioInputId: string | null
  useMorphing: boolean
  morphingAlgorithm: 'liquid' | 'oniric'
  morphingPresetId: string
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
  debug: VisualEngineDebug
}

export interface VisualEngineState {
  lastTriggerMs: number
  flashHoldUntilMs: number
  whiteMix: number
  flashHistoryMs: number[]
  pinkHotBlend: number
  overallDrive: number
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
  useMorphing?: boolean
  bandEnergies?: BandEnergies
  settings?: AppSettings
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
