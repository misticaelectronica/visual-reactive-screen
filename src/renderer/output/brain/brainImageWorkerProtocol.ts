import type { Sd15BrowserProgress } from './sd15OnnxWebGpu'

export type BrainImageGenerateRequest = {
  id: string
  type: 'generate'
  prompt: string
  seed: number
  mode: 'standard' | 'interlude' | 'high-quality' | 'enhanced'
  timeoutMs: number
  artifactBaseUrl: string
  wasmBaseUrl: string
  width: number
  height: number
  inferenceWidth: number
  inferenceHeight: number
  steps: number
}

export type BrainImageReleaseRequest = {
  id: string
  type: 'release'
}

export type BrainImageWorkerRequest =
  | BrainImageGenerateRequest
  | BrainImageReleaseRequest

export type BrainImageWorkerResponse =
  | { id: string; type: 'progress'; progress: Sd15BrowserProgress }
  | {
      id: string
      type: 'generated'
      blob: Blob
      durationMs: number
      model: string
    }
  | { id: string; type: 'released' }
  | { id: string; type: 'error'; error: string }
