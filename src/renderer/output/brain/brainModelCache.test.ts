import { describe, expect, it } from 'vitest'
import {
  configuredBrainCache,
  huggingFaceRepositoryFromUrl,
  obsoleteBrainCacheUrls,
} from './brainModelCache'

describe('cache persistente dei modelli Brain', () => {
  it('ricava il repository Hugging Face dalla risorsa scaricata', () => {
    expect(
      huggingFaceRepositoryFromUrl(
        'https://huggingface.co/onnx-community/Qwen2.5-1.5B-abliterated-ONNX/resolve/main/onnx/model_q4.onnx',
      ),
    ).toBe('onnx-community/Qwen2.5-1.5B-abliterated-ONNX')
    expect(huggingFaceRepositoryFromUrl('http://localhost:5173/ort-wasm/runtime.wasm')).toBeNull()
  })

  it('conserva i modelli configurati e rimuove soltanto quelli sostituiti', () => {
    const active = new Set(['autore/modello-attivo'])
    const urls = [
      'https://huggingface.co/autore/modello-attivo/resolve/main/model.onnx',
      'https://huggingface.co/autore/modello-vecchio/resolve/main/model.onnx',
      'http://localhost:5173/ort-wasm/runtime.wasm',
    ]

    expect(obsoleteBrainCacheUrls(urls, active)).toEqual([
      'https://huggingface.co/autore/modello-vecchio/resolve/main/model.onnx',
    ])
  })

  it('deriva l’elenco attivo esclusivamente dagli ID presenti in brainConfig', () => {
    const configured = configuredBrainCache()

    expect(configured.transformersRepositories.has(
      'onnx-community/Qwen2.5-0.5B-Instruct-abliterated-v3-ONNX',
    )).toBe(true)
    expect(configured.transformersRepositories.has(
      'onnx-community/Qwen2.5-1.5B-abliterated-ONNX',
    )).toBe(false)
    expect(configured.transformersRepositories.has(
      'onnx-community/Qwen2.5-1.5B-Instruct',
    )).toBe(false)
    expect(configured.transformersRepositories.has(
      'onnx-community/opus-mt-it-en',
    )).toBe(true)
    expect(configured.transformersRepositories.has(
      'Xenova/opus-mt-en-it',
    )).toBe(true)
    expect(configured.transformersRepositories.size).toBe(5)
    expect(configured.transformersRepositories.has(
      'onnx-community/Qwen3-0.6B-heretic-abliterated-uncensored-ONNX',
    )).toBe(false)
    expect(configured.imageRepositories.has('schmuell/sd-turbo-ort-web')).toBe(false)
    expect(configured.imageRepositories.has('Zhare-AI/sd-1-5-webgpu')).toBe(true)
  })
})
