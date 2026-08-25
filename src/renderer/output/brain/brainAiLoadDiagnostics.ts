import { huggingFaceRepositoryFromUrl } from './brainModelCache'

const TRANSFORMERS_CACHE = 'transformers-cache'

export type TextModelCacheState = {
  complete: boolean
  cachedFiles: Set<string>
  missingFiles: string[]
}

export function isPermanentOnnxGraphError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return [
    /type error: type \(tensor\(.+?\)\).+does not match expected type/i,
    /invalid graph/i,
    /type inference error/i,
    /duplicate definition/i,
  ].some((pattern) => pattern.test(message))
}

export function formatWorkerLog(
  message: string,
  details?: Record<string, unknown>,
): string {
  return details ? `${message} ${JSON.stringify(details)}` : message
}

export function isDegenerateGeneratedText(text: string): boolean {
  const compact = text.replace(/\s/gu, '')
  if (compact.length < 20) return true

  const letters = compact.match(/\p{L}/gu)?.length ?? 0
  const words = text.match(/\p{L}{2,}/gu)?.length ?? 0
  if (letters / compact.length < 0.2 || words < 2) return true

  const counts = new Map<string, number>()
  let mostFrequent = 0
  for (const character of compact) {
    const count = (counts.get(character) ?? 0) + 1
    counts.set(character, count)
    mostFrequent = Math.max(mostFrequent, count)
  }
  if (counts.size <= 4 || mostFrequent / compact.length > 0.72) return true

  if (compact.length >= 200) {
    const fragmentSize = 40
    const fragmentCounts = new Map<string, number>()
    for (let index = 0; index <= compact.length - fragmentSize; index += 8) {
      const fragment = compact.slice(index, index + fragmentSize)
      fragmentCounts.set(fragment, (fragmentCounts.get(fragment) ?? 0) + 1)
    }
    const maxFragmentCount = Math.max(...fragmentCounts.values())
    if ((maxFragmentCount * fragmentSize) / compact.length > 0.4) return true
  }

  return false
}

function modelFileForDtype(dtype: string): string {
  return dtype === 'fp32'
    ? 'onnx/model.onnx'
    : `onnx/model_${dtype}.onnx`
}

export function inspectTextModelCacheUrls(
  urls: readonly string[],
  model: string,
  dtype: string,
): TextModelCacheState {
  const requiredFiles = [
    'config.json',
    'tokenizer.json',
    modelFileForDtype(dtype),
  ]
  const cachedFiles = new Set<string>()
  for (const rawUrl of urls) {
    if (huggingFaceRepositoryFromUrl(rawUrl) !== model) continue
    try {
      const path = decodeURIComponent(new URL(rawUrl).pathname)
      const resolveMarker = '/resolve/'
      const markerIndex = path.indexOf(resolveMarker)
      if (markerIndex < 0) continue
      const revisionEnd = path.indexOf('/', markerIndex + resolveMarker.length)
      if (revisionEnd < 0) continue
      cachedFiles.add(path.slice(revisionEnd + 1))
    } catch {
      // Una chiave non URL non appartiene alla cache remota del modello.
    }
  }
  const missingFiles = requiredFiles.filter((file) => !cachedFiles.has(file))
  return {
    complete: missingFiles.length === 0,
    cachedFiles,
    missingFiles,
  }
}

export function inspectTranslationModelCacheUrls(
  urls: readonly string[],
  model: string,
  dtype: string,
): TextModelCacheState {
  const suffix = dtype === 'fp32' ? '' : `_${dtype}`
  const requiredFiles = [
    'config.json',
    'tokenizer.json',
    `onnx/encoder_model${suffix}.onnx`,
    `onnx/decoder_model_merged${suffix}.onnx`,
  ]
  const cachedFiles = new Set<string>()
  for (const rawUrl of urls) {
    if (huggingFaceRepositoryFromUrl(rawUrl) !== model) continue
    try {
      const path = decodeURIComponent(new URL(rawUrl).pathname)
      const resolveMarker = '/resolve/'
      const markerIndex = path.indexOf(resolveMarker)
      if (markerIndex < 0) continue
      const revisionEnd = path.indexOf('/', markerIndex + resolveMarker.length)
      if (revisionEnd < 0) continue
      cachedFiles.add(path.slice(revisionEnd + 1))
    } catch {
      // Una chiave non URL non appartiene alla cache remota del modello.
    }
  }
  const missingFiles = requiredFiles.filter((file) => !cachedFiles.has(file))
  return {
    complete: missingFiles.length === 0,
    cachedFiles,
    missingFiles,
  }
}

export async function inspectTextModelCache(
  model: string,
  dtype: string,
): Promise<TextModelCacheState> {
  if (typeof caches === 'undefined') {
    return { complete: false, cachedFiles: new Set(), missingFiles: ['Cache Storage'] }
  }
  try {
    const cache = await caches.open(TRANSFORMERS_CACHE)
    const requests = await cache.keys()
    return inspectTextModelCacheUrls(
      requests.map((request) => request.url),
      model,
      dtype,
    )
  } catch {
    return { complete: false, cachedFiles: new Set(), missingFiles: ['cache non leggibile'] }
  }
}

export async function inspectTranslationModelCache(
  model: string,
  dtype: string,
): Promise<TextModelCacheState> {
  if (typeof caches === 'undefined') {
    return { complete: false, cachedFiles: new Set(), missingFiles: ['Cache Storage'] }
  }
  try {
    const cache = await caches.open(TRANSFORMERS_CACHE)
    const requests = await cache.keys()
    return inspectTranslationModelCacheUrls(
      requests.map((request) => request.url),
      model,
      dtype,
    )
  } catch {
    return { complete: false, cachedFiles: new Set(), missingFiles: ['cache non leggibile'] }
  }
}
