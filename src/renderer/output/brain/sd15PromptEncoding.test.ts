import { describe, expect, it, vi } from 'vitest'
import { Tensor } from 'onnxruntime-web'
import { chunkSd15Prompt, encodeSd15PromptChunks } from './sd15PromptEncoding'

const ort = { Tensor }
describe('contesto CLIP completo', () => {
  it('conserva ogni token attraverso i confini 75/150, con BOS/EOS e padding', () => {
    for (const length of [0, 1, 75, 76, 150, 151, 450]) {
      const content = Array.from({ length }, (_, i) => i + 1)
      const chunks = chunkSd15Prompt(content)
      expect(chunks.every((row) => row.length === 77 && row[0] === 49406 && row[76] === 49407)).toBe(true)
      expect(chunks.flatMap((row) => row.filter((id) => id < 49406))).toEqual(content)
    }
    expect(() => chunkSd15Prompt(Array(451).fill(1))).toThrow('Nessun testo è stato troncato')
    expect(() => chunkSd15Prompt([NaN])).toThrow('non valido')
  })

  for (const cfg of [true, false]) {
    for (const type of ['float32', 'float16'] as const) {
      it(`consegna tutti i blocchi al tensore UNet, CFG=${cfg}, ${type}`, async () => {
        const chunks = chunkSd15Prompt(Array.from({ length: 151 }, (_, i) => i + 1))
        const outputs: Tensor[] = []
        const run = vi.fn(async (feeds: Record<string, Tensor>) => {
          const data = Array.from(feeds.input_ids.data as BigInt64Array, Number)
          const values = type === 'float32' ? new Float32Array(data) : new Uint16Array(data)
          const tensor = new Tensor(type, values, [cfg ? 2 : 1, 77, 1])
          vi.spyOn(tensor, 'dispose')
          outputs.push(tensor)
          return { last_hidden_state: tensor }
        })
        const result = await encodeSd15PromptChunks(ort, { run }, chunks, cfg)
        expect(result.dims).toEqual([cfg ? 2 : 1, 231, 1])
        const resultData = result.data as Float32Array | Uint16Array
        const values = Array.from(type === 'float16'
          ? new Uint16Array(resultData.buffer, resultData.byteOffset, resultData.byteLength / 2)
          : resultData)
        expect(values.slice(cfg ? 231 : 0)).toEqual(chunks.flat())
        if (cfg) expect(values.slice(0, 231)).toEqual(Array(3).fill(chunkSd15Prompt([])[0]).flat())
        expect(outputs.every((tensor) => vi.mocked(tensor.dispose).mock.calls.length === 1)).toBe(true)
        result.dispose()
      })
    }
  }

  it('annulla fra blocchi e libera gli output già codificati', async () => {
    const controller = new AbortController()
    const tensor = new Tensor('float32', new Float32Array(77), [1, 77, 1])
    const disposed = vi.spyOn(tensor, 'dispose')
    const run = vi.fn(async () => {
      controller.abort()
      return { last_hidden_state: tensor }
    })
    await expect(encodeSd15PromptChunks(ort, { run }, chunkSd15Prompt(Array(76).fill(1)), false, controller.signal))
      .rejects.toThrow('annullata')
    expect(run).toHaveBeenCalledTimes(1)
    expect(disposed).toHaveBeenCalledOnce()
  })
})
