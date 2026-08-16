/// <reference lib="webworker" />

import { PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE } from '@shared/brain/imageModelManifest'
import { BrainAiRequestQueue } from './brainAiRequestQueue'
import type {
  BrainImageGenerateRequest,
  BrainImageWorkerRequest,
  BrainImageWorkerResponse,
} from './brainImageWorkerProtocol'
import { Sd15OnnxWebGpuRuntime } from './sd15OnnxWebGpu'

const workerScope = self as DedicatedWorkerGlobalScope
const queue = new BrainAiRequestQueue()
let runtime: Sd15OnnxWebGpuRuntime | null = null
let runtimeBaseUrl = ''
let runtimeWasmBaseUrl = ''
let activeGeneration: AbortController | null = null

function post(response: BrainImageWorkerResponse): void {
  workerScope.postMessage(response)
}

async function runtimeFor(
  baseUrl: string,
  wasmBaseUrl: string,
): Promise<Sd15OnnxWebGpuRuntime> {
  if (
    runtime
    && runtimeBaseUrl === baseUrl
    && runtimeWasmBaseUrl === wasmBaseUrl
  ) return runtime
  if (runtime) await runtime.release()
  runtimeBaseUrl = baseUrl
  runtimeWasmBaseUrl = wasmBaseUrl
  runtime = new Sd15OnnxWebGpuRuntime(
    PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE,
    baseUrl,
    wasmBaseUrl,
  )
  return runtime
}

async function generate(request: BrainImageGenerateRequest): Promise<void> {
  const controller = new AbortController()
  activeGeneration = controller
  const timeoutId = setTimeout(() => controller.abort(), request.timeoutMs)
  const startedAt = performance.now()
  try {
    const imageRuntime = await runtimeFor(
      request.artifactBaseUrl,
      request.wasmBaseUrl,
    )
    const blob = await imageRuntime.generate({
      prompt: request.prompt,
      seed: request.seed,
      width: request.width,
      height: request.height,
      inferenceWidth: request.inferenceWidth,
      inferenceHeight: request.inferenceHeight,
      steps: request.steps,
      stepYieldMs: request.stepYieldMs,
      signal: controller.signal,
      onProgress: (progress) => post({
        id: request.id,
        type: 'progress',
        progress,
      }),
    })
    post({
      id: request.id,
      type: 'generated',
      blob,
      durationMs: performance.now() - startedAt,
      model: PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE.name,
    })
  } catch (error) {
    const message = error instanceof DOMException && error.name === 'AbortError'
      ? `Timeout generazione Explicit dopo ${request.timeoutMs} ms`
      : error instanceof Error ? error.message : String(error)
    post({ id: request.id, type: 'error', error: message })
  } finally {
    clearTimeout(timeoutId)
    if (activeGeneration === controller) activeGeneration = null
  }
}

async function handle(request: BrainImageWorkerRequest): Promise<void> {
  if (request.type === 'generate') {
    await generate(request)
    return
  }
  await runtime?.release()
  runtime = null
  runtimeBaseUrl = ''
  runtimeWasmBaseUrl = ''
  post({ id: request.id, type: 'released' })
}

workerScope.addEventListener(
  'message',
  (event: MessageEvent<BrainImageWorkerRequest>) => {
    const request = event.data
    if (request.type === 'release') activeGeneration?.abort()
    void queue.run(() => handle(request)).catch((error) => {
      post({
        id: request.id,
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      })
    })
  },
)
