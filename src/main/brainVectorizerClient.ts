import { Worker } from 'node:worker_threads'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  BrainRasterPixels,
  BrainVectorizationOptions,
  BrainVectorizationResult,
} from '@shared/types'

type PendingRequest = {
  resolve: (result: BrainVectorizationResult) => void
  timeoutId: NodeJS.Timeout
}

type VectorizerWorkerResponse = {
  id: string
  result: BrainVectorizationResult
}

const REQUEST_TIMEOUT_MS = 30_000
let worker: Worker | null = null
let requestSequence = 0
const pending = new Map<string, PendingRequest>()

function rejectPending(message: string): void {
  for (const request of pending.values()) {
    clearTimeout(request.timeoutId)
    request.resolve({ ok: false, error: message })
  }
  pending.clear()
}

function createWorker(): Worker {
  const workerPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'brainVectorizerWorker.js',
  )
  const nextWorker = new Worker(workerPath)
  nextWorker.unref()
  nextWorker.on('message', (response: VectorizerWorkerResponse) => {
    const request = pending.get(response.id)
    if (!request) return
    clearTimeout(request.timeoutId)
    pending.delete(response.id)
    request.resolve(response.result)
  })
  nextWorker.on('error', (error) => {
    if (worker !== nextWorker) return
    worker = null
    rejectPending(`Worker vettorializzazione fallito: ${error.message}`)
  })
  nextWorker.on('exit', (code) => {
    if (worker !== nextWorker) return
    worker = null
    if (code !== 0) {
      rejectPending(`Worker vettorializzazione terminato con codice ${code}`)
    }
  })
  return nextWorker
}

function transferableBuffer(input: unknown): ArrayBuffer | null {
  const bytes = input instanceof Uint8Array
    ? input
    : typeof input === 'object' && input !== null
      ? (input as Partial<BrainRasterPixels>).rgba
      : undefined
  if (
    !(bytes instanceof Uint8Array) ||
    bytes.byteOffset !== 0 ||
    bytes.byteLength !== bytes.buffer.byteLength ||
    !(bytes.buffer instanceof ArrayBuffer)
  ) return null
  return bytes.buffer
}

export function vectorizeBrainImageOffMainThread(
  input: unknown,
  options?: BrainVectorizationOptions,
): Promise<BrainVectorizationResult> {
  worker ??= createWorker()
  const id = `vector-${Date.now()}-${requestSequence += 1}`
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      pending.delete(id)
      resolve({ ok: false, error: 'Timeout worker vettorializzazione' })
    }, REQUEST_TIMEOUT_MS)
    pending.set(id, { resolve, timeoutId })
    const transferable = transferableBuffer(input)
    worker?.postMessage(
      { id, input, options },
      transferable ? [transferable] : undefined,
    )
  })
}

export function destroyBrainVectorizerWorker(): void {
  const activeWorker = worker
  worker = null
  rejectPending('Worker vettorializzazione arrestato')
  void activeWorker?.terminate()
}
