import { describe, expect, it } from 'vitest'
import {
  formatWorkerLog,
  inspectTextModelCacheUrls,
  inspectTranslationModelCacheUrls,
  isDegenerateGeneratedText,
  isPermanentOnnxGraphError,
} from './brainAiLoadDiagnostics'

const MODEL = 'onnx-community/Qwen2.5-0.5B-Instruct-abliterated-v3-ONNX'
const BASE = `https://huggingface.co/${MODEL}/resolve/main`

describe('diagnostica caricamento modello testuale', () => {
  it('riconosce una pipeline Marian completa nella cache', () => {
    const model = 'onnx-community/opus-mt-it-en'
    const root = `https://huggingface.co/${model}/resolve/main`
    const state = inspectTranslationModelCacheUrls(
      [
        `${root}/config.json`,
        `${root}/tokenizer.json`,
        `${root}/onnx/encoder_model_q4.onnx`,
        `${root}/onnx/decoder_model_merged_q4.onnx`,
      ],
      model,
      'q4',
    )

    expect(state.complete).toBe(true)
    expect(state.missingFiles).toEqual([])
  })

  it('distingue una copia locale completa da un download necessario', () => {
    const complete = inspectTextModelCacheUrls(
      [
        `${BASE}/config.json`,
        `${BASE}/tokenizer.json`,
        `${BASE}/onnx/model_q4f16.onnx`,
      ],
      MODEL,
      'q4f16',
    )
    expect(complete.complete).toBe(true)
    expect(complete.missingFiles).toEqual([])

    const incomplete = inspectTextModelCacheUrls(
      [`${BASE}/config.json`, `${BASE}/tokenizer.json`],
      MODEL,
      'q4f16',
    )
    expect(incomplete.complete).toBe(false)
    expect(incomplete.missingFiles).toEqual(['onnx/model_q4f16.onnx'])
  })

  it('ignora i file appartenenti a un modello diverso', () => {
    const state = inspectTextModelCacheUrls(
      [
        'https://huggingface.co/autore/altro-modello/resolve/main/config.json',
        'https://huggingface.co/autore/altro-modello/resolve/main/tokenizer.json',
        'https://huggingface.co/autore/altro-modello/resolve/main/onnx/model_q4.onnx',
      ],
      MODEL,
      'q4',
    )

    expect(state.complete).toBe(false)
    expect(state.cachedFiles.size).toBe(0)
  })

  it('riconosce un grafo ONNX incompatibile e non lo tratta come fallback WebGPU', () => {
    expect(
      isPermanentOnnxGraphError(
        new Error(
          'Type Error: Type (tensor(float16)) of output arg does not match expected type (tensor(float)).',
        ),
      ),
    ).toBe(true)
    expect(isPermanentOnnxGraphError(new Error('WebGPU adapter unavailable'))).toBe(false)
  })

  it('serializza i dettagli del Worker senza object Object', () => {
    const message = formatWorkerLog('[Brain][worker][DOWNLOAD RETE] story 10%', {
      resource: 'onnx/model_q4f16.onnx',
      loadedBytes: 100,
      totalBytes: 1_000,
    })

    expect(message).toContain('"resource":"onnx/model_q4f16.onnx"')
    expect(message).not.toContain('[object Object]')
  })

  it('riconosce come corrotta una risposta WebGPU composta da simboli', () => {
    const corrupted =
      `.,$$0(,/)%(2'&2#",,4+*&!&/&2)%1&)!(**,+-/4(+".)!($$-'3#%2$1-43-` +
      `*3%!%10*//.2!''(/+$$)%$*-44111(4!$3'!0/"/4"0%/(-#).*'',!`

    expect(isDegenerateGeneratedText(corrupted)).toBe(true)
    expect(
      isDegenerateGeneratedText(
        'TITOLO: La soglia verde\nSTORIA: Elisa attraversa il bosco e scopre una presenza capace di trasformare i suoi ricordi.',
      ),
    ).toBe(false)
  })
})
