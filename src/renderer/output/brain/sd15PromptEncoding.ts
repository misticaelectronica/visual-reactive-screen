import type { InferenceSession, Tensor } from 'onnxruntime-web'

export const CLIP_TOKEN_COUNT = 77
export const SD15_MAX_PROMPT_CHUNKS = 6
const CONTENT_TOKENS = CLIP_TOKEN_COUNT - 2
const BOS = 49_406
const EOS = 49_407

/** No truncation: every content token is encoded, or generation fails explicitly. */
export function chunkSd15Prompt(ids: readonly number[]): number[][] {
  if (ids.some((id) => !Number.isSafeInteger(id) || id < 0 || id >= BOS)) {
    throw new Error('Token CLIP non valido nel prompt')
  }
  const count = Math.max(1, Math.ceil(ids.length / CONTENT_TOKENS))
  if (count > SD15_MAX_PROMPT_CHUNKS) {
    throw new Error(`Contesto immagine troppo lungo: ${ids.length} token, budget ${SD15_MAX_PROMPT_CHUNKS * CONTENT_TOKENS}. Nessun testo è stato troncato.`)
  }
  return Array.from({ length: count }, (_, index) => {
    const content = ids.slice(index * CONTENT_TOKENS, (index + 1) * CONTENT_TOKENS)
    return [BOS, ...content, ...Array<number>(CLIP_TOKEN_COUNT - content.length - 1).fill(EOS)]
  })
}

/** CLIP encodes 77 positions at a time; UNet receives the concatenated sequence.
 * Keep CFG rows separate: [empty chunks][conditional chunks], never interleaved.
 */
export async function encodeSd15PromptChunks(
  ort: { Tensor: typeof Tensor },
  encoder: Pick<InferenceSession, 'run'>,
  chunks: readonly number[][],
  cfg: boolean,
  signal?: AbortSignal,
): Promise<Tensor> {
  const batch = cfg ? 2 : 1
  const empty = chunkSd15Prompt([])[0]
  let combined: Float32Array | Uint16Array | undefined
  let type: 'float32' | 'float16' | undefined
  let width = 0
  for (let index = 0; index < chunks.length; index++) {
    if (signal?.aborted) throw new DOMException('Generazione annullata', 'AbortError')
    const ids = new ort.Tensor('int64', BigInt64Array.from(
      cfg ? [...empty, ...chunks[index]] : chunks[index], BigInt,
    ), [batch, CLIP_TOKEN_COUNT])
    let output: Record<string, Tensor> = {}
    try {
      output = await encoder.run({ input_ids: ids })
      const embedding = output.last_hidden_state ?? Object.values(output)[0]
      if (!embedding || (embedding.type !== 'float32' && embedding.type !== 'float16')
        || embedding.dims.length !== 3 || embedding.dims[0] !== batch
        || embedding.dims[1] !== CLIP_TOKEN_COUNT) {
        throw new Error('Forma o tipo embeddings CLIP non compatibile')
      }
      if (!combined) {
        width = embedding.dims[2]
        type = embedding.type
        const length = batch * chunks.length * CLIP_TOKEN_COUNT * width
        combined = type === 'float32' ? new Float32Array(length) : new Uint16Array(length)
      }
      if (embedding.type !== type || embedding.dims[2] !== width) {
        throw new Error('Embeddings CLIP incoerenti fra blocchi')
      }
      // Recent runtimes expose native Float16Array; copy its bits, not the
      // numeric values into Uint16Array (that would corrupt half floats).
      const source = embedding.data as Float32Array | Uint16Array
      const data = type === 'float16'
        ? new Uint16Array(source.buffer, source.byteOffset, source.byteLength / 2)
        : source
      const rowSize = CLIP_TOKEN_COUNT * width
      for (let row = 0; row < batch; row++) {
        combined.set(data.subarray(row * rowSize, (row + 1) * rowSize),
          (row * chunks.length + index) * rowSize)
      }
    } finally {
      ids.dispose()
      for (const tensor of new Set(Object.values(output))) tensor.dispose()
    }
  }
  if (!combined || !type) throw new Error('Nessun blocco CLIP da codificare')
  if (signal?.aborted) throw new DOMException('Generazione annullata', 'AbortError')
  return new ort.Tensor(type, combined, [batch, chunks.length * CLIP_TOKEN_COUNT, width])
}
