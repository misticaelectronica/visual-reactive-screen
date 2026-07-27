export type BrainStatus = 'generation' | 'rendering' | 'rendering+generation'

export type DreamFrame = {
  id: string
  title: string
  description: string
  visualIntent: string
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
  frames: DreamFrame[]
}

export type PsychedelScene = {
  frameId: string
  description: string
  svg: string
}

export type BrainProduction = {
  story: DreamStory
  scenes: PsychedelScene[]
}

export type BrainAiTask = 'story' | 'scene'

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
