import { BRAIN_CONFIG } from '@shared/brain/brainConfig'
import { PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE } from '@shared/brain/imageModelManifest'
import { brainLog, brainWarn } from './brainLog'
import type {
  BrainImageGenerateRequest,
  BrainImageWorkerRequest,
  BrainImageWorkerResponse,
} from './brainImageWorkerProtocol'
import { getBrainRenderingConfig } from './brainRenderingConfig'
import type {
  ImageRenderMode,
  PsychedelImageGenerator,
} from './psychedelImageGenerator'

type GenerationResult = { blob: Blob; durationMs: number; model?: string }
type PendingRequest = {
  resolve: (value: GenerationResult | undefined) => void
  reject: (error: Error) => void
  timeoutId: number
}

export function createBrainImageGenerateRequest(
  id: string,
  prompt: string,
  seed: number,
  mode: ImageRenderMode,
  requestedTimeoutMs: number,
  documentUrl: string,
): BrainImageGenerateRequest {
  const renderingConfig = getBrainRenderingConfig()
  const locationUrl = new URL(documentUrl)
  const runtimeBase = new URL('.', locationUrl)
  runtimeBase.pathname = `${runtimeBase.pathname.replace(/\/+$/, '')}/ort-wasm/`
  const steps = mode === 'high-quality'
    ? renderingConfig.image.qualitySteps
    : mode === 'enhanced'
      ? renderingConfig.image.enhancedSteps
      : mode === 'interlude'
        ? renderingConfig.image.interludeSteps
        : renderingConfig.image.standardSteps
  const inferenceGeometry = mode === 'high-quality'
    ? { width: renderingConfig.image.width, height: renderingConfig.image.height }
    : mode === 'enhanced'
      ? { width: 512, height: 320 }
      : { width: 448, height: 256 }
  return {
    id,
    type: 'generate',
    prompt,
    seed,
    mode,
    timeoutMs: Math.min(BRAIN_CONFIG.imageGenerationTimeoutMs, requestedTimeoutMs),
    artifactBaseUrl: locationUrl.protocol === 'file:'
      ? BRAIN_CONFIG.imageModelLocalBaseUrl
      : BRAIN_CONFIG.imageModelBaseUrl,
    wasmBaseUrl: runtimeBase.href,
    width: renderingConfig.image.width,
    height: renderingConfig.image.height,
    inferenceWidth: inferenceGeometry.width,
    inferenceHeight: inferenceGeometry.height,
    steps,
  }
}

export class BrainImageWorkerClient implements PsychedelImageGenerator {
  private worker: Worker | null
  private readonly pending = new Map<string, PendingRequest>()
  private destroyed = false
  private lastProgressKey = ''

  constructor() {
    this.worker = new Worker(new URL('./brainImageWorker.ts', import.meta.url), {
      type: 'module',
    })
    this.worker.addEventListener('message', this.handleMessage)
    this.worker.addEventListener('error', this.handleError)
    brainLog('psichedel-image', 'worker immagini ONNX creato', {
      model: PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE.id,
      isolation: 'dedicated-worker',
    })
  }

  generate(
    prompt: string,
    seed: number,
    mode: ImageRenderMode = 'standard',
    timeoutMs: number = BRAIN_CONFIG.imageGenerationTimeoutMs,
  ): Promise<GenerationResult> {
    if (this.destroyed || !this.worker) {
      return Promise.reject(new Error('Psichedel è stato arrestato'))
    }
    const id = `image-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const request = createBrainImageGenerateRequest(
      id,
      prompt,
      seed,
      mode,
      timeoutMs,
      window.location.href,
    )
    brainLog('psichedel-image', 'inferenza inviata al worker ONNX', {
      id,
      mode,
      steps: request.steps,
      inference: `${request.inferenceWidth}x${request.inferenceHeight}`,
    })
    return new Promise<GenerationResult>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Worker immagini non ha risposto dopo ${request.timeoutMs + 2_000} ms`))
      }, request.timeoutMs + 2_000)
      this.pending.set(id, {
        resolve: resolve as PendingRequest['resolve'],
        reject,
        timeoutId,
      })
      this.worker?.postMessage(request)
    })
  }

  async release(): Promise<void> {
    if (!this.worker || this.destroyed) return
    const id = `release-image-${Date.now()}-${Math.random().toString(36).slice(2)}`
    await new Promise<void>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        this.pending.delete(id)
        reject(new Error('Timeout rilascio worker immagini'))
      }, 10_000)
      this.pending.set(id, {
        resolve: () => resolve(),
        reject,
        timeoutId,
      })
      this.worker?.postMessage({ id, type: 'release' } satisfies BrainImageWorkerRequest)
    })
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    for (const request of this.pending.values()) {
      window.clearTimeout(request.timeoutId)
      request.reject(new Error('Psichedel è stato arrestato'))
    }
    this.pending.clear()
    this.worker?.terminate()
    this.worker = null
  }

  private readonly handleMessage = (
    event: MessageEvent<BrainImageWorkerResponse>,
  ): void => {
    const response = event.data
    if (response.type === 'progress') {
      const rounded = response.progress.pct === undefined
        ? null
        : Math.floor(response.progress.pct / 10) * 10
      const key = `${response.progress.phase}:${response.progress.component ?? ''}:${rounded ?? ''}:${response.progress.source ?? ''}`
      if (key !== this.lastProgressKey) {
        this.lastProgressKey = key
        brainLog('psichedel-image', `${response.progress.phase}: ${response.progress.message}`, {
          pct: response.progress.pct,
          component: response.progress.component,
          source: response.progress.source,
          worker: true,
        })
      }
      return
    }
    const pending = this.pending.get(response.id)
    if (!pending) return
    window.clearTimeout(pending.timeoutId)
    this.pending.delete(response.id)
    if (response.type === 'error') {
      pending.reject(new Error(response.error))
      return
    }
    if (response.type === 'released') {
      pending.resolve(undefined)
      return
    }
    brainLog('psichedel-image', 'raster ONNX ricevuto dal worker', {
      bytes: response.blob.size,
      durationMs: Math.round(response.durationMs),
    })
    pending.resolve({
      blob: response.blob,
      durationMs: response.durationMs,
      model: response.model,
    })
  }

  private readonly handleError = (event: ErrorEvent): void => {
    brainWarn('psichedel-image', 'errore worker immagini ONNX', event.message)
    const error = new Error(event.message || 'Worker immagini ONNX non disponibile')
    for (const request of this.pending.values()) {
      window.clearTimeout(request.timeoutId)
      request.reject(error)
    }
    this.pending.clear()
    this.worker?.terminate()
    this.worker = null
  }
}
