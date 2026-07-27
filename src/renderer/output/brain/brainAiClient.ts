import { BRAIN_CONFIG } from '@shared/brain/brainConfig'
import type { BrainAiRequest, BrainAiResponse, BrainAiTask } from '@shared/brain/brainTypes'
import { brainLog, brainWarn } from './brainLog'

type PendingRequest = {
  resolve: (text: string) => void
  reject: (error: Error) => void
  timeoutId: number
}

export class BrainAiCancelledError extends Error {
  constructor() {
    super('Brain distrutto')
    this.name = 'BrainAiCancelledError'
  }
}

export class BrainAiClient {
  private readonly worker: Worker | null
  private readonly pending = new Map<string, PendingRequest>()

  constructor() {
    this.worker = BRAIN_CONFIG.aiEnabled
      ? new Worker(new URL('./brainAiWorker.ts', import.meta.url), { type: 'module' })
      : null
    brainLog(
      'ai',
      this.worker ? 'worker AI creato' : 'AI disabilitata',
      this.worker
        ? {
            pipelineRevision: BRAIN_CONFIG.pipelineRevision,
            storyModel: BRAIN_CONFIG.storyModelId,
            visualModel: BRAIN_CONFIG.visualModelId,
            dtype: {
              webGpu: BRAIN_CONFIG.webGpuModelDtype,
              wasm: BRAIN_CONFIG.modelDtype,
            },
          }
        : undefined,
    )

    this.worker?.addEventListener('message', (event: MessageEvent<BrainAiResponse>) => {
      const response = event.data
      const request = this.pending.get(response.id)
      if (!request) return
      window.clearTimeout(request.timeoutId)
      this.pending.delete(response.id)
      if (response.ok) {
        brainLog('ai', `risposta ${response.id} ricevuta`)
        request.resolve(response.text)
      } else {
        brainWarn('ai', `richiesta ${response.id} fallita`, response.error)
        request.reject(new Error(response.error))
      }
    })

    this.worker?.addEventListener('error', (event) => {
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
      const timeoutId = window.setTimeout(() => {
        this.pending.delete(id)
        brainWarn('ai', `timeout richiesta ${task}`, { id })
        reject(new Error(`Timeout ${task}`))
      }, BRAIN_CONFIG.generationTimeoutMs)
      this.pending.set(id, { resolve, reject, timeoutId })
      this.worker?.postMessage(message)
    })
  }

  destroy(): void {
    brainLog('ai', 'arresto worker AI')
    this.rejectAll(new BrainAiCancelledError())
    this.worker?.terminate()
  }

  private rejectAll(error: Error): void {
    for (const request of this.pending.values()) {
      window.clearTimeout(request.timeoutId)
      request.reject(error)
    }
    this.pending.clear()
  }
}
