import { parentPort } from 'node:worker_threads'
import type {
  BrainVectorizationOptions,
  BrainVectorizationResult,
} from '@shared/types'
import { vectorizeBrainImage } from './brainVectorizer'

type VectorizerWorkerRequest = {
  id: string
  input: unknown
  options?: BrainVectorizationOptions
}

type VectorizerWorkerResponse = {
  id: string
  result: BrainVectorizationResult
}

if (!parentPort) throw new Error('Worker vettorializzazione privo di parentPort')

parentPort.on('message', (request: VectorizerWorkerRequest) => {
  const response: VectorizerWorkerResponse = {
    id: request.id,
    result: vectorizeBrainImage(request.input, request.options),
  }
  parentPort?.postMessage(response)
})
