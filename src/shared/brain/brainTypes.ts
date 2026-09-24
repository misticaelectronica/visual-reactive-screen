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
  /** Soggetto/forma/materia che deve restare riconoscibile fra i 4 fotogrammi (lettera Vice Consigliere §3). */
  invariant: string
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
  /**
   * Sostituisce lo step count derivato da `ImageRenderMode` per ogni fotogramma
   * di questa storia (HYPNOTIC ZOOM ANNIDATO, `denoisingSteps = 22` ogni 8
   * storie — disp. Capo Supremo, 2026-09-22). Non tocca la geometria
   * d'inferenza, solo gli step.
   */
  denoisingStepsOverride?: number
  /**
   * Storia destinata al ciclo ANIMATRONIX / HYPNOTIC ZOOM ANNIDATO (1 ogni 8
   * storie): A → zoom nel dettaglio A1 → B → zoom nel dettaglio B1 → C,
   * quarta immagine come ECO/uscita con la grammatica ordinaria.
   */
  nestedZoomStory?: boolean
  /** Ordinale progressivo della storia nella sessione (1-based), usato per la periodicità di HYPNOTIC ZOOM ANNIDATO. */
  storyOrdinal?: number
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
