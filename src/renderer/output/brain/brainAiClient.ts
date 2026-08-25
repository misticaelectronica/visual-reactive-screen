import { BRAIN_CONFIG } from '@shared/brain/brainConfig'
import type { BrainAiRequest, BrainAiResponse, BrainAiTask } from '@shared/brain/brainTypes'
import { brainLog, brainWarn } from './brainLog'

type PendingRequest = {
  resolve: (text: string) => void
  reject: (error: Error) => void
  message: BrainAiRequest
  timeoutId: number | null
  settled: boolean
}

export class BrainAiCancelledError extends Error {
  constructor() {
    super('Brain distrutto')
    this.name = 'BrainAiCancelledError'
  }
}

const INFRASTRUCTURE_ERROR_PATTERNS = [
  /can't create a session/i,
  /no available backend/i,
  /failed to (?:create|load|initialize)/i,
  /type error: type \(tensor\(/i,
  /webassembly.*failed/i,
  /nessun modello di fallback distinto/i,
] as const

export function isBrainAiInfrastructureMessage(message: string): boolean {
  return INFRASTRUCTURE_ERROR_PATTERNS.some((pattern) => pattern.test(message))
}

export class BrainAiInfrastructureError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BrainAiInfrastructureError'
  }
}

export class BrainAiClient {
  private worker: Worker | null = null
  private readonly pending = new Map<string, PendingRequest>()
  private readonly queue: string[] = []
  private activeRequestId: string | null = null
  private destroyed = false

  constructor() {
    this.createWorker()
    brainLog(
      'ai',
      this.worker ? 'worker AI creato' : 'AI disabilitata',
      this.worker
        ? {
            pipelineRevision: BRAIN_CONFIG.pipelineRevision,
            storyModel: BRAIN_CONFIG.storyModelId,
            storyFallbackModel: BRAIN_CONFIG.storyFallbackModelId,
            memoModel: BRAIN_CONFIG.memoModelId,
            visualModel: BRAIN_CONFIG.visualModelId,
            inputTranslationModel: BRAIN_CONFIG.inputTranslationModelId,
            uiTranslationModel: BRAIN_CONFIG.uiTranslationModelId,
            dtype: {
              webGpu: BRAIN_CONFIG.webGpuModelDtype,
              wasm: BRAIN_CONFIG.modelDtype,
              translation: BRAIN_CONFIG.translationModelDtype,
            },
          }
        : undefined,
    )

  }

  private createWorker(): void {
    if (!BRAIN_CONFIG.aiEnabled || this.destroyed) return
    const worker = new Worker(new URL('./brainAiWorker.ts', import.meta.url), {
      type: 'module',
    })
    this.worker = worker
    worker.addEventListener('message', (event: MessageEvent<BrainAiResponse>) => {
      if (this.worker !== worker) return
      const response = event.data
      const request = this.pending.get(response.id)
      if (!request) return
      if (request.timeoutId !== null) window.clearTimeout(request.timeoutId)
      this.pending.delete(response.id)
      if (this.activeRequestId === response.id) this.activeRequestId = null
      if (response.ok && !request.settled) {
        brainLog('ai', `risposta ${response.id} ricevuta`)
        request.settled = true
        request.resolve(response.text)
      } else if (!response.ok && !request.settled) {
        brainWarn('ai', `richiesta ${response.id} fallita`, response.error)
        request.settled = true
        request.reject(
          isBrainAiInfrastructureMessage(response.error)
            ? new BrainAiInfrastructureError(response.error)
            : new Error(response.error),
        )
      }
      this.dispatchNext()
    })

    worker.addEventListener('error', (event) => {
      if (this.worker !== worker) return
      brainWarn('ai', 'errore worker', event.message)
      this.rejectAll(new Error(event.message || 'Brain AI worker non disponibile'))
    })
  }

  generate(
    task: BrainAiTask,
    prompt: string,
    tokenLimits?: { maxNewTokens?: number; minNewTokens?: number },
  ): Promise<string> {
    if (!this.worker) return Promise.reject(new Error('Brain AI disabilitata'))
    const id = `${task}-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const message: BrainAiRequest = { id, task, prompt, ...tokenLimits }
    brainLog('ai', `invio richiesta ${task}`, {
      id,
      pipelineRevision: BRAIN_CONFIG.pipelineRevision,
      promptLength: prompt.length,
      maxNewTokens: tokenLimits?.maxNewTokens,
    })
    return new Promise<string>((resolve, reject) => {
      this.pending.set(id, {
        resolve,
        reject,
        message,
        timeoutId: null,
        settled: false,
      })
      this.queue.push(id)
      this.dispatchNext()
    })
  }

  async releaseTranslationModels(): Promise<void> {
    await this.generate('release-translators', '', {
      maxNewTokens: 0,
      minNewTokens: 0,
    })
  }

  async releaseAllModels(): Promise<void> {
    await this.generate('release-ai-models', '', {
      maxNewTokens: 0,
      minNewTokens: 0,
    })
  }

  destroy(): void {
    brainLog('ai', 'arresto worker AI')
    this.destroyed = true
    this.rejectAll(new BrainAiCancelledError())
    this.worker?.terminate()
    this.worker = null
  }

  private rejectAll(error: Error): void {
    for (const request of this.pending.values()) {
      if (request.timeoutId !== null) window.clearTimeout(request.timeoutId)
      if (!request.settled) request.reject(error)
    }
    this.pending.clear()
    this.queue.length = 0
    this.activeRequestId = null
  }

  private dispatchNext(): void {
    if (!this.worker || this.activeRequestId !== null) return
    const id = this.queue.shift()
    if (!id) return
    const request = this.pending.get(id)
    if (!request) {
      this.dispatchNext()
      return
    }
    this.activeRequestId = id
    const timeoutMs = request.message.task === 'story'
      ? 45_000
      : request.message.task === 'release-translators' ||
          request.message.task === 'release-ai-models'
        ? 12_000
        : BRAIN_CONFIG.generationTimeoutMs
    request.timeoutId = window.setTimeout(() => {
      if (request.settled) return
      const error = new Error(`Timeout ${request.message.task}`)
      brainWarn(
        'ai',
        `timeout richiesta ${request.message.task}; worker terminato e ricreato`,
        { id },
      )
      this.worker?.terminate()
      this.worker = null
      this.rejectAll(error)
      this.createWorker()
    }, timeoutMs)
    this.worker.postMessage(request.message)
  }
}
