import { describe, expect, it, vi } from 'vitest'
import {
  assertSd15BrowserCompatibility,
  createClassifierFreePromptBatch,
  createSd15PromptBatch,
  ensureSd15NotAborted,
  fetchSd15ModelFile,
  resolveSd15ImageShape,
  SD15_MODEL_CACHE,
  Sd15OnnxWebGpuRuntime,
} from './sd15OnnxWebGpu'
import { ExplicitPsychedelImageGenerator } from './psychedelImageGenerator'

describe('runtime ONNX Explicit di Psichedel', () => {
  it('adatta il 16:9 a una geometria UNet valida e conserva l’uscita richiesta', () => {
    expect(resolveSd15ImageShape(640, 360)).toEqual({
      width: 640,
      height: 360,
      inferenceWidth: 576,
      inferenceHeight: 320,
      latentWidth: 72,
      latentHeight: 40,
    })
    expect(() => resolveSd15ImageShape(641, 360)).toThrow(
      'servono multipli di 8',
    )
  })

  it('non modifica una risoluzione già compatibile con tutti i blocchi UNet', () => {
    expect(resolveSd15ImageShape(512, 512)).toEqual({
      width: 512,
      height: 512,
      inferenceWidth: 512,
      inferenceHeight: 512,
      latentWidth: 64,
      latentHeight: 64,
    })
  })

  it('riduce la geometria live senza cambiare la risoluzione di uscita', () => {
    expect(resolveSd15ImageShape(640, 360, 448, 256)).toEqual({
      width: 640,
      height: 360,
      inferenceWidth: 448,
      inferenceHeight: 256,
      latentWidth: 56,
      latentHeight: 32,
    })
    expect(resolveSd15ImageShape(640, 360, 512, 320)).toEqual({
      width: 640,
      height: 360,
      inferenceWidth: 448,
      inferenceHeight: 256,
      latentWidth: 56,
      latentHeight: 32,
    })
  })

  it('inoltra il prompt senza censura, riscrittura o negative prompt nascosto', () => {
    const prompt = 'adult explicit horror scene, blood, controversial religious symbolism'
    const batch = createClassifierFreePromptBatch(prompt)
    expect(batch).toEqual(['', prompt])
    expect(batch[1]).toBe(prompt)
  })

  it('usa soltanto il prompt reale nella modalità condizionale batch 1', () => {
    const prompt = 'a visible subject crossing a harbour at night'
    expect(createSd15PromptBatch(prompt, 'single-conditional')).toEqual([prompt])
    expect(createSd15PromptBatch(prompt, 'cfg-batch')).toEqual(['', prompt])
  })

  it('rifiuta WebGPU assente con un errore comprensibile', () => {
    expect(() => assertSd15BrowserCompatibility({ deviceMemory: 32 })).toThrow(
      'WebGPU non è disponibile',
    )
  })

  it('rifiuta memoria dichiarata insufficiente senza tentare il caricamento', () => {
    expect(() => assertSd15BrowserCompatibility({
      gpu: {},
      deviceMemory: 4,
    })).toThrow('Memoria insufficiente')
  })

  it('riconosce la cancellazione prima di proseguire', () => {
    const controller = new AbortController()
    controller.abort()
    expect(() => ensureSd15NotAborted(controller.signal)).toThrow('Generazione annullata')
  })

  it('scarica una risorsa una sola volta e poi usa Cache Storage', async () => {
    const entries = new Map<string, Response>()
    const cache = {
      match: vi.fn(async (request: Request) => entries.get(request.url)?.clone()),
      put: vi.fn(async (request: Request, response: Response) => {
        entries.set(request.url, response.clone())
      }),
    }
    const cacheStorage = {
      open: vi.fn(async (name: string) => {
        expect(name).toBe(SD15_MODEL_CACHE)
        return cache
      }),
    } as unknown as CacheStorage
    const network = vi.fn(async () => new Response(
      new Uint8Array([1, 2, 3]),
      { status: 200, headers: { 'Content-Length': '3' } },
    ))
    const environment = {
      fetch: network as unknown as typeof fetch,
      caches: cacheStorage,
    }
    const first = await fetchSd15ModelFile(
      'https://models.invalid/unet.onnx',
      undefined,
      environment,
    )
    const second = await fetchSd15ModelFile(
      'https://models.invalid/unet.onnx',
      undefined,
      environment,
    )
    expect(first.source).toBe('rete')
    expect(second.source).toBe('cache locale')
    expect(network).toHaveBeenCalledTimes(1)
    expect(Array.from(new Uint8Array(second.data))).toEqual([1, 2, 3])
  })

  it('invoca il fetch globale con il contesto corretto nel renderer Electron', async () => {
    const originalFetch = globalThis.fetch
    const contextSensitiveFetch = vi.fn(function (
      this: typeof globalThis,
    ) {
      if (this !== globalThis) throw new TypeError('Illegal invocation')
      return Promise.resolve(new Response(
        new Uint8Array([4, 5, 6]),
        { status: 200 },
      ))
    })
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: contextSensitiveFetch,
    })
    try {
      const result = await fetchSd15ModelFile(
        'https://models.invalid/text-encoder.onnx',
        undefined,
        { fetch: (...args) => globalThis.fetch(...args) },
      )
      expect(Array.from(new Uint8Array(result.data))).toEqual([4, 5, 6])
      expect(contextSensitiveFetch).toHaveBeenCalledTimes(1)
    } finally {
      Object.defineProperty(globalThis, 'fetch', {
        configurable: true,
        value: originalFetch,
      })
    }
  })

  it('legge gli artefatti persistenti locali senza duplicarli in Cache Storage', async () => {
    const cacheStorage = {
      open: vi.fn(),
    } as unknown as CacheStorage
    const localFetch = vi.fn(async () => new Response(
      new Uint8Array([7, 8, 9]),
      { status: 200 },
    ))

    const result = await fetchSd15ModelFile(
      'brain-model://local/pornmaster-sd15-onnx/unet/model.onnx',
      undefined,
      {
        fetch: localFetch as unknown as typeof fetch,
        caches: cacheStorage,
      },
    )

    expect(result.source).toBe('file locale')
    expect(cacheStorage.open).not.toHaveBeenCalled()
    expect(localFetch).toHaveBeenCalledTimes(1)
  })

  it('espone un errore HTTP di caricamento senza output sostitutivo', async () => {
    const network = vi.fn(async () => new Response(null, { status: 503 }))
    await expect(fetchSd15ModelFile(
      'https://models.invalid/unet.onnx',
      undefined,
      { fetch: network as unknown as typeof fetch },
    )).rejects.toThrow('HTTP 503')
  })

  it('usa il checkpoint Explicit come generatore standard di Psichedel', async () => {
    const generate = vi.spyOn(
      Sd15OnnxWebGpuRuntime.prototype,
      'generate',
    ).mockResolvedValue(new Blob(['explicit'], { type: 'image/png' }))
    const generator = new ExplicitPsychedelImageGenerator()

    const result = await generator.generate(
      'prompt trasmesso integralmente',
      42,
      'standard',
    )

    expect(generate).toHaveBeenCalledWith(expect.objectContaining({
      prompt: 'prompt trasmesso integralmente',
      seed: 42,
      steps: 8,
      width: 640,
      height: 360,
      inferenceWidth: 448,
      inferenceHeight: 256,
    }))
    expect(result.model).toBe('PornMaster SD 1.5 Explicit ONNX')
    expect(result.blob.size).toBeGreaterThan(0)
    generator.destroy()
  })
})
