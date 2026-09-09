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
  consciousnessInfluence?: {
    memoryId: string
    kind: string
    title: string
    relevanceReason: string
  }
  /** Testo grezzo dell'input online che ha generato questa storia, se dedicata. */
  onlineSourceText?: string | null
}

/**
 * Modalità di resa con cui la raster del fotogramma è stata generata. Governa
 * step di denoising e geometria d'inferenza (vedi `brainImageWorkerClient.ts`):
 * `interlude` = 4 step / 448×256, `standard` = 8 step / 448×256,
 * `enhanced` = 12 step / 512×320, `high-quality` = 20 step / risoluzione piena.
 */
export type ImageRenderMode = 'standard' | 'interlude' | 'high-quality' | 'enhanced'

export type PsychedelScene = {
  frameId: string
  description: string
  svg: string
  /** Raster originale usata dal renderer Canvas 2D; l'SVG resta solo fallback. */
  raster?: Blob
  /** Modalità di resa della raster; assente per fotogrammi archiviati/riusati. */
  renderMode?: ImageRenderMode
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
