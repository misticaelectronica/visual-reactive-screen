import {
  detectCapabilities,
  generateImage,
  loadModel,
  unloadModel,
} from 'web-txt2img'
import type { ModelId } from 'web-txt2img'
import { AutoTokenizer } from '@huggingface/transformers'
import { BRAIN_CONFIG } from '@shared/brain/brainConfig'
import { PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE } from '@shared/brain/imageModelManifest'
import { brainLog, brainWarn } from './brainLog'
import { Sd15OnnxWebGpuRuntime } from './sd15OnnxWebGpu'
import { getBrainRenderingConfig } from './brainRenderingConfig'

export interface PsychedelImageGenerator {
  generate(
    prompt: string,
    seed: number,
    mode?: ImageRenderMode,
    timeoutMs?: number,
  ): Promise<{ blob: Blob; durationMs: number; model?: string }>
  release(): Promise<void>
  destroy(): void
}

export type ImageRenderMode = 'standard' | 'high-quality' | 'enhanced'

const LEGACY_STANDARD_MODEL: ModelId = 'sd-turbo'
const LEGACY_HIGH_QUALITY_MODEL: ModelId = 'janus-pro-1b'

type ImageResult =
  | { ok: true; blob: Blob; timeMs: number }
  | { ok: false; reason?: string; message?: string }

async function createClipTokenizer() {
  brainLog('psichedel-image', 'caricamento tokenizer CLIP avviato', {
    model: 'Xenova/clip-vit-base-patch16',
  })
  const loggedProgress = new Map<string, number>()
  const tokenizer = await AutoTokenizer.from_pretrained('Xenova/clip-vit-base-patch16', {
    progress_callback: (event: unknown) => {
      const progressEvent = event as { progress?: number; file?: string }
      if (typeof progressEvent.progress !== 'number') return
      const progress = Math.floor(progressEvent.progress / 10) * 10
      const resource = progressEvent.file ?? 'tokenizer'
      if (loggedProgress.get(resource) === progress) return
      loggedProgress.set(resource, progress)
      brainLog('psichedel-image', `caricamento tokenizer ${progress}%`, { resource })
    },
  })
  tokenizer.pad_token_id = 0
  brainLog('psichedel-image', 'tokenizer CLIP pronto')

  return async (text: string) => {
    const encoded = tokenizer(text, {
      padding: 'max_length',
      max_length: 77,
      truncation: true,
      return_tensor: false,
    }) as { input_ids?: unknown }
    if (!Array.isArray(encoded.input_ids)) {
      throw new Error('Il tokenizer CLIP non ha restituito input_ids')
    }
    const inputIds = (
      Array.isArray(encoded.input_ids[0]) ? encoded.input_ids[0] : encoded.input_ids
    ).map(Number)
    if (inputIds.length !== 77 || inputIds.some((value) => !Number.isFinite(value))) {
      throw new Error(`Il tokenizer CLIP ha restituito ${inputIds.length} token invece di 77`)
    }
    return { input_ids: inputIds }
  }
}

export class LocalPsychedelImageGenerator implements PsychedelImageGenerator {
  private readyPromise: Promise<void> | null = null
  private lastLoadProgress = -10
  private loadedModel: ModelId | null = null
  private loadingModel: ModelId | null = null
  private destroyed = false

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs)
      promise.then(
        (value) => {
          window.clearTimeout(timeoutId)
          resolve(value)
        },
        (error) => {
          window.clearTimeout(timeoutId)
          reject(error)
        },
      )
    })
  }

  private async ensureReady(model: ModelId): Promise<void> {
    if (this.destroyed) throw new Error('Psichedel è stato arrestato')
    if (this.loadedModel === model && this.readyPromise) return this.readyPromise
    if (this.loadedModel && this.loadedModel !== model) await this.release()
    if (this.readyPromise && this.loadingModel === model) return this.readyPromise
    this.loadingModel = model
    this.readyPromise = (async () => {
      brainLog('psichedel-image', 'verifica WebGPU avviata')
      const capabilities = await this.withTimeout(
        detectCapabilities(),
        BRAIN_CONFIG.imageCapabilityTimeoutMs,
        'Timeout durante la verifica WebGPU',
      )
      if (!capabilities.webgpu) {
        throw new Error('Psichedel richiede WebGPU per generare immagini reali')
      }
      brainLog('psichedel-image', 'WebGPU disponibile', capabilities)
      brainLog('psichedel-image', 'caricamento modello text-to-image reale', {
        pipelineRevision: BRAIN_CONFIG.pipelineRevision,
        model,
        quality: model === LEGACY_HIGH_QUALITY_MODEL ? 'high-quality' : 'standard',
        backend: 'WebGPU',
        downloadApprox:
          model === LEGACY_HIGH_QUALITY_MODEL
            ? '2.25 GB (solo al primo avvio, poi cache locale)'
            : '2.34 GB (solo al primo avvio, poi cache locale)',
      })
      const runtimeBase = new URL('.', window.location.href)
      runtimeBase.pathname = `${runtimeBase.pathname.replace(/\/+$/, '')}/ort-wasm/`
      const wasmPaths = runtimeBase.href
      const ortRuntime = await import('onnxruntime-web/webgpu')
      ortRuntime.env.wasm.wasmPaths = wasmPaths
      brainLog('psichedel-image', 'runtime ONNX configurato', { wasmPaths })
      const loaded = await this.withTimeout(
        loadModel(model, {
          backendPreference: ['webgpu'],
          ort: ortRuntime,
          wasmPaths,
          ...(model === LEGACY_STANDARD_MODEL
            ? { tokenizerProvider: createClipTokenizer }
            : {}),
          onProgress: (progress: { pct?: number; phase?: string; message?: string }) => {
            const rounded = Math.floor((progress.pct ?? 0) / 10) * 10
            if (rounded <= this.lastLoadProgress) return
            this.lastLoadProgress = rounded
            brainLog('psichedel-image', `caricamento modello ${rounded}%`, {
              phase: progress.phase,
              message: progress.message,
            })
          },
        }),
        BRAIN_CONFIG.imageModelLoadTimeoutMs,
        'Timeout durante il caricamento del modello immagini',
      )
      if (!loaded.ok) {
        throw new Error(loaded.message ?? loaded.reason ?? 'caricamento modello immagini fallito')
      }
      this.loadedModel = model
      brainLog('psichedel-image', 'modello text-to-image pronto', {
        model,
        backend: loaded.backendUsed,
      })
    })().catch(async (error) => {
      const failedModel = this.loadingModel
      if (failedModel) {
        try {
          await unloadModel(failedModel)
        } catch (releaseError) {
          brainWarn('psichedel-image', 'pulizia modello fallito non completata', releaseError)
        }
      }
      this.loadedModel = null
      this.readyPromise = null
      this.loadingModel = null
      this.lastLoadProgress = -10
      throw error
    })
    return this.readyPromise
  }

  async generate(
    prompt: string,
    seed: number,
    mode: ImageRenderMode = 'standard',
    timeoutMs: number = BRAIN_CONFIG.imageGenerationTimeoutMs,
  ): Promise<{ blob: Blob; durationMs: number; model?: ModelId }> {
    const model =
      mode === 'high-quality'
        ? LEGACY_HIGH_QUALITY_MODEL
        : LEGACY_STANDARD_MODEL
    await this.ensureReady(model)
    brainLog('psichedel-image', 'inferenza immagine AI avviata', {
      model,
      quality: mode,
      seed,
      prompt,
    })
    const abortController = new AbortController()
    const renderingConfig = getBrainRenderingConfig()
    try {
      const result = (await this.withTimeout(
        generateImage({
          model,
          prompt,
          seed,
          width: renderingConfig.image.width,
          height: renderingConfig.image.height,
          signal: abortController.signal,
          onProgress: (progress) => {
            brainLog('psichedel-image', `fase ${progress.phase}`, { pct: progress.pct })
          },
        }),
        Math.min(BRAIN_CONFIG.imageGenerationTimeoutMs, timeoutMs),
        'Timeout generazione immagine AI',
      )) as ImageResult
      if (!result.ok) {
        throw new Error(result.message ?? result.reason ?? 'generazione immagine AI fallita')
      }
      brainLog('psichedel-image', 'immagine raster AI generata', {
        model,
        quality: mode,
        bytes: result.blob.size,
        type: result.blob.type,
        durationMs: Math.round(result.timeMs),
      })
      return { blob: result.blob, durationMs: result.timeMs, model }
    } catch (error) {
      abortController.abort()
      throw error
    }
  }

  async release(): Promise<void> {
    if (!this.loadedModel && !this.readyPromise) return
    const model = this.loadedModel ?? this.loadingModel
    brainLog('psichedel-image', 'rilascio modello immagini WebGPU', { model })
    try {
      if (model) await unloadModel(model)
    } catch (error) {
      brainWarn('psichedel-image', 'rilascio modello immagini fallito', error)
    } finally {
      this.loadedModel = null
      this.loadingModel = null
      this.readyPromise = null
      this.lastLoadProgress = -10
    }
  }

  destroy(): void {
    this.destroyed = true
    void this.release()
  }
}

export class ExplicitPsychedelImageGenerator implements PsychedelImageGenerator {
  private readonly runtime = new Sd15OnnxWebGpuRuntime(
    PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE,
    window.location.protocol === 'file:'
      ? BRAIN_CONFIG.imageModelLocalBaseUrl
      : BRAIN_CONFIG.imageModelBaseUrl,
  )
  private activeGeneration: AbortController | null = null
  private destroyed = false
  private lastProgressKey = ''

  async generate(
    prompt: string,
    seed: number,
    mode: ImageRenderMode = 'standard',
    timeoutMs: number = BRAIN_CONFIG.imageGenerationTimeoutMs,
  ): Promise<{ blob: Blob; durationMs: number; model?: string }> {
    if (this.destroyed) throw new Error('Psichedel è stato arrestato')
    this.activeGeneration?.abort()
    const controller = new AbortController()
    this.activeGeneration = controller
    const renderingConfig = getBrainRenderingConfig()
    const steps =
      mode === 'high-quality'
        ? renderingConfig.image.qualitySteps
        : mode === 'enhanced'
          ? renderingConfig.image.enhancedSteps
          : renderingConfig.image.standardSteps
    const inferenceGeometry =
      mode === 'high-quality'
        ? {
            width: renderingConfig.image.width,
            height: renderingConfig.image.height,
          }
        : mode === 'enhanced'
          ? { width: 512, height: 320 }
          : { width: 448, height: 256 }
    const startedAt = performance.now()
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      Math.min(BRAIN_CONFIG.imageGenerationTimeoutMs, timeoutMs),
    )
    brainLog('psichedel-image', 'inferenza Explicit ONNX avviata', {
      model: PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE.id,
      source: PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE.sourceRepository,
      mode,
      steps,
      seed,
      prompt,
      backend: 'WebGPU',
      safetyChecker: false,
    })
    try {
      const blob = await this.runtime.generate({
        prompt,
        seed,
        width: renderingConfig.image.width,
        height: renderingConfig.image.height,
        inferenceWidth: inferenceGeometry.width,
        inferenceHeight: inferenceGeometry.height,
        steps,
        signal: controller.signal,
        onProgress: (progress) => {
          const rounded = progress.pct === undefined
            ? null
            : Math.floor(progress.pct / 10) * 10
          const progressKey = `${progress.phase}:${progress.component ?? ''}:${rounded ?? ''}:${progress.source ?? ''}`
          if (progressKey === this.lastProgressKey) return
          this.lastProgressKey = progressKey
          brainLog('psichedel-image', `${progress.phase}: ${progress.message}`, {
            model: PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE.id,
            pct: progress.pct,
            component: progress.component,
            source: progress.source,
          })
        },
      })
      const durationMs = performance.now() - startedAt
      brainLog('psichedel-image', 'immagine Explicit ONNX generata', {
        model: PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE.id,
        mode,
        steps,
        width: renderingConfig.image.width,
        height: renderingConfig.image.height,
        bytes: blob.size,
        durationMs: Math.round(durationMs),
      })
      return {
        blob,
        durationMs,
        model: PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE.name,
      }
    } catch (error) {
      if (
        error instanceof DOMException
        && error.name === 'AbortError'
        && !this.destroyed
      ) {
        throw new Error(
          `Timeout generazione Explicit dopo ${Math.min(BRAIN_CONFIG.imageGenerationTimeoutMs, timeoutMs)} ms`,
          { cause: error },
        )
      }
      throw error
    } finally {
      window.clearTimeout(timeoutId)
      if (this.activeGeneration === controller) this.activeGeneration = null
    }
  }

  async release(): Promise<void> {
    this.activeGeneration?.abort()
    this.activeGeneration = null
    await this.runtime.release()
  }

  destroy(): void {
    this.destroyed = true
    void this.release()
  }
}

if (import.meta.hot) {
  import.meta.hot.accept(() => window.location.reload())
}
