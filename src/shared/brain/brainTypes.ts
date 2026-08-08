export type BrainStatus = 'generation' | 'rendering' | 'rendering+generation'

export type DreamFrame = {
  id: string
  title: string
  description: string
  visualIntent: string
  imagePrompt?: string
  energy: number
  durationMs: number
}

export type DreamStory = {
  id: string
  title: string
  synopsis: string
  bridge: string | null
  continuityPhrase: string | null
  palette: [string, string, string, string, string]
  sourcePhrases: string[]
  /** Contesto tematico invariabile inviato a Psichedel con ogni fotogramma. */
  mainArgument?: string
  frames: DreamFrame[]
  englishTitle?: string
  englishSynopsis?: string
  englishBridge?: string | null
  sessionMemo?: [string, string, string]
  sessionSynthesis?: boolean
}

export type PsychedelScene = {
  frameId: string
  description: string
  svg: string
  /** Raster originale usata dal renderer Canvas 2D; l'SVG resta solo fallback. */
  raster?: Blob
}

export type BrainProduction = {
  story: DreamStory
  scenes: PsychedelScene[]
}

export type BrainAiTask =
  | 'story'
  | 'memo'
  | 'scene'
  | 'translate-input'
  | 'translate-ui'
  | 'release-translators'
  | 'release-ai-models'

export type BrainAiRequest = {
  id: string
  task: BrainAiTask
  prompt: string
  maxNewTokens?: number
  minNewTokens?: number
}

export type BrainAiResponse =
  | { id: string; ok: true; text: string }
  | { id: string; ok: false; error: string }
