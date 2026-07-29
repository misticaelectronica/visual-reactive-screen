import { AutoTokenizer } from '@huggingface/transformers'
import type { InferenceSession, Tensor } from 'onnxruntime-web'
import type { ImageModelManifest } from '@shared/brain/imageModelManifest'
import {
  classifierFreeGuidance,
  createSd15EulerSchedule,
  eulerStep,
} from './sd15Scheduler'

export const SD15_MODEL_CACHE = 'psychedel-sd15-onnx-v1'
export const SD15_MIN_DEVICE_MEMORY_GIB = 8
const LATENT_CHANNELS = 4
const TOKEN_COUNT = 77
const VAE_SCALE = 0.18215
// L'UNet SD 1.5 effettua tre downsample. Le dimensioni latenti devono quindi
// essere divisibili per 8, cioè l'immagine di inferenza deve usare multipli
// di 64. Una richiesta 640×360 produceva un latente 80×45 e rompeva i Concat
// dei blocchi di risalita (23 contro 24).
const UNET_IMAGE_MULTIPLE = 64

type OrtWebGpu = typeof import('onnxruntime-web/webgpu')

export type Sd15BrowserPhase =
  | 'download'
  | 'caricamento'
  | 'generazione'
  | 'completato'
  | 'annullato'
  | 'errore'

export type Sd15BrowserProgress = {
  phase: Sd15BrowserPhase
  message: string
  pct?: number
  component?: string
  source?: 'rete' | 'cache locale' | 'file locale'
}

export type Sd15GenerateOptions = {
  prompt: string
  seed: number
  width?: number
  height?: number
  inferenceWidth?: number
  inferenceHeight?: number
  steps?: number
  signal?: AbortSignal
  onProgress?: (progress: Sd15BrowserProgress) => void
}

type LoadedSessions = {
  textEncoder: InferenceSession
  unet: InferenceSession
  vaeDecoder: InferenceSession
}

export function createClassifierFreePromptBatch(prompt: string): ['', string] {
  return ['', prompt]
}

export function resolveSd15ImageShape(
  width: number,
  height: number,
  inferenceWidthLimit = width,
  inferenceHeightLimit = height,
): {
  width: number
  height: number
  inferenceWidth: number
  inferenceHeight: number
  latentWidth: number
  latentHeight: number
} {
  const roundedWidth = Math.round(width)
  const roundedHeight = Math.round(height)
  if (
    roundedWidth < 256 ||
    roundedHeight < 256 ||
    roundedWidth % 8 !== 0 ||
    roundedHeight % 8 !== 0
  ) {
    throw new Error(
      `Dimensioni immagine non valide: ${roundedWidth}×${roundedHeight}; servono multipli di 8 da almeno 256 px`,
    )
  }
  const targetRatio = roundedWidth / roundedHeight
  const maximumInferenceWidth = Math.max(
    256,
    Math.floor(
      Math.min(roundedWidth, inferenceWidthLimit) / UNET_IMAGE_MULTIPLE,
    ) * UNET_IMAGE_MULTIPLE,
  )
  const maximumInferenceHeight = Math.max(
    256,
    Math.floor(
      Math.min(roundedHeight, inferenceHeightLimit) / UNET_IMAGE_MULTIPLE,
    ) * UNET_IMAGE_MULTIPLE,
  )
  let inferenceWidth = 256
  let inferenceHeight = 256
  let bestRatioDistance = Number.POSITIVE_INFINITY
  let bestArea = 0
  for (
    let candidateWidth = 256;
    candidateWidth <= maximumInferenceWidth;
    candidateWidth += UNET_IMAGE_MULTIPLE
  ) {
    for (
      let candidateHeight = 256;
      candidateHeight <= maximumInferenceHeight;
      candidateHeight += UNET_IMAGE_MULTIPLE
    ) {
      const ratioDistance = Math.abs(
        Math.log((candidateWidth / candidateHeight) / targetRatio),
      )
      const area = candidateWidth * candidateHeight
      if (
        ratioDistance < bestRatioDistance - 1e-9 ||
        (Math.abs(ratioDistance - bestRatioDistance) <= 1e-9 && area > bestArea)
      ) {
        inferenceWidth = candidateWidth
        inferenceHeight = candidateHeight
        bestRatioDistance = ratioDistance
        bestArea = area
      }
    }
  }
  return {
    width: roundedWidth,
    height: roundedHeight,
    inferenceWidth,
    inferenceHeight,
    latentWidth: inferenceWidth / 8,
    latentHeight: inferenceHeight / 8,
  }
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

function seededNormal(size: number, seed: number, scale: number): Float32Array {
  let state = seed >>> 0
  const random = () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
  }
  const data = new Float32Array(size)
  for (let index = 0; index < size; index += 2) {
    const first = Math.max(Number.EPSILON, random())
    const second = random()
    const radius = Math.sqrt(-2 * Math.log(first)) * scale
    data[index] = radius * Math.cos(2 * Math.PI * second)
    if (index + 1 < size) data[index + 1] = radius * Math.sin(2 * Math.PI * second)
  }
  return data
}

export function ensureSd15NotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Generazione annullata', 'AbortError')
}

export function assertSd15BrowserCompatibility(
  browser: { gpu?: unknown; deviceMemory?: number },
): void {
  if (!browser.gpu) {
    throw new Error('WebGPU non è disponibile in questo browser')
  }
  if (
    typeof browser.deviceMemory === 'number'
    && browser.deviceMemory < SD15_MIN_DEVICE_MEMORY_GIB
  ) {
    throw new Error(
      `Memoria insufficiente: servono almeno ${SD15_MIN_DEVICE_MEMORY_GIB} GB per il profilo Qualità`,
    )
  }
}

const float32Scratch = new Float32Array(1)
const uint32Scratch = new Uint32Array(float32Scratch.buffer)

function float32ToFloat16Bits(value: number): number {
  float32Scratch[0] = value
  const bits = uint32Scratch[0]
  const sign = (bits >>> 16) & 0x8000
  let exponent = ((bits >>> 23) & 0xff) - 127 + 15
  let mantissa = bits & 0x7fffff
  if (exponent <= 0) {
    if (exponent < -10) return sign
    mantissa = (mantissa | 0x800000) >>> (1 - exponent)
    return sign | ((mantissa + 0x1000) >>> 13)
  }
  if (exponent >= 31) return sign | (mantissa ? 0x7e00 : 0x7c00)
  mantissa += 0x1000
  if (mantissa & 0x800000) {
    mantissa = 0
    exponent += 1
    if (exponent >= 31) return sign | 0x7c00
  }
  return sign | (exponent << 10) | (mantissa >>> 13)
}

function toFloat16Data(source: Float32Array): Uint16Array {
  return Uint16Array.from(source, float32ToFloat16Bits)
}

function float16BitsToFloat32(bits: number): number {
  const sign = bits & 0x8000 ? -1 : 1
  const exponent = (bits >>> 10) & 0x1f
  const mantissa = bits & 0x03ff
  if (exponent === 0) return sign * 2 ** -14 * (mantissa / 1_024)
  if (exponent === 0x1f) return mantissa ? Number.NaN : sign * Number.POSITIVE_INFINITY
  return sign * 2 ** (exponent - 15) * (1 + mantissa / 1_024)
}

export async function fetchSd15ModelFile(
  url: string,
  onProgress?: (loaded: number, total?: number) => void,
  environment: {
    fetch: typeof fetch
    caches?: CacheStorage
  } = {
    // In Chromium `window.fetch` deve essere invocato con il proprio contesto.
    // Conservare il riferimento nudo (`fetch`) provoca "Illegal invocation"
    // quando il renderer viene caricato da dist tramite file://.
    fetch: (...args) => globalThis.fetch(...args),
    caches: typeof caches === 'undefined' ? undefined : caches,
  },
): Promise<{ data: ArrayBuffer; source: 'rete' | 'cache locale' | 'file locale' }> {
  const request = new Request(url)
  const isLocalModel = new URL(request.url).protocol === 'brain-model:'
  // Cache Storage accetta in modo portabile solo richieste HTTP(S). Gli
  // artefatti brain-model:// sono già file persistenti su disco: ricopiarli
  // nella cache raddoppierebbe inutilmente circa 2 GB.
  if (environment.caches && !isLocalModel) {
    const cache = await environment.caches.open(SD15_MODEL_CACHE)
    const cached = await cache.match(request)
    if (cached) {
      const data = await cached.arrayBuffer()
      onProgress?.(data.byteLength, data.byteLength)
      return { data, source: 'cache locale' }
    }
    const response = await environment.fetch(request)
    if (!response.ok) throw new Error(`Download modello fallito: HTTP ${response.status}`)
    const total = Number(response.headers.get('content-length') ?? '') || undefined
    if (!response.body) {
      const data = await response.arrayBuffer()
      await cache.put(request, new Response(data, { headers: response.headers }))
      onProgress?.(data.byteLength, data.byteLength)
      return { data, source: 'rete' }
    }
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let loaded = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      chunks.push(value)
      loaded += value.byteLength
      onProgress?.(loaded, total)
    }
    const merged = new Uint8Array(loaded)
    let offset = 0
    for (const chunk of chunks) {
      merged.set(chunk, offset)
      offset += chunk.byteLength
    }
    await cache.put(request, new Response(merged, { headers: response.headers }))
    return { data: merged.buffer, source: 'rete' }
  }
  const response = await environment.fetch(request)
  if (!response.ok) throw new Error(`Download modello fallito: HTTP ${response.status}`)
  const data = await response.arrayBuffer()
  onProgress?.(data.byteLength, data.byteLength)
  return { data, source: isLocalModel ? 'file locale' : 'rete' }
}

function floatData(tensor: Tensor): Float32Array {
  if (tensor.data instanceof Float32Array) return tensor.data
  if (tensor.type === 'float16' && ArrayBuffer.isView(tensor.data)) {
    const view = tensor.data as unknown as ArrayBufferView
    const bits = new Uint16Array(
      view.buffer,
      view.byteOffset,
      Math.floor(view.byteLength / Uint16Array.BYTES_PER_ELEMENT),
    )
    return Float32Array.from(bits, float16BitsToFloat32)
  }
  throw new Error(`Output ONNX inatteso: ${tensor.type}`)
}

function disposeOutputTensors(
  outputs: Record<string, Tensor>,
  retained?: Tensor,
): void {
  const disposed = new Set<Tensor>()
  for (const tensor of Object.values(outputs)) {
    if (tensor === retained || disposed.has(tensor)) continue
    disposed.add(tensor)
    tensor.dispose()
  }
}

function coverCrop(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const sourceRatio = sourceWidth / sourceHeight
  const targetRatio = targetWidth / targetHeight
  if (sourceRatio > targetRatio) {
    const sw = sourceHeight * targetRatio
    return { sx: (sourceWidth - sw) / 2, sy: 0, sw, sh: sourceHeight }
  }
  const sh = sourceWidth / targetRatio
  return { sx: 0, sy: (sourceHeight - sh) / 2, sw: sourceWidth, sh }
}

async function tensorToPngBlob(
  tensor: Tensor,
  targetWidth: number,
  targetHeight: number,
): Promise<Blob> {
  const [, channels, height, width] = tensor.dims.map(Number)
  if (channels !== 3 || !height || !width) {
    throw new Error(`Output VAE inatteso: ${tensor.dims.join('×')}`)
  }
  const source = floatData(tensor)
  const pixels = new Uint8ClampedArray(width * height * 4)
  let outputIndex = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      for (let channel = 0; channel < 3; channel += 1) {
        const value = source[channel * height * width + y * width + x]
        pixels[outputIndex] = Math.round(Math.max(0, Math.min(1, value / 2 + 0.5)) * 255)
        outputIndex += 1
      }
      pixels[outputIndex] = 255
      outputIndex += 1
    }
  }
  const crop = coverCrop(width, height, targetWidth, targetHeight)
  if (typeof OffscreenCanvas !== 'undefined') {
    const sourceCanvas = new OffscreenCanvas(width, height)
    const sourceContext = sourceCanvas.getContext('2d')
    if (!sourceContext) throw new Error('Canvas 2D non disponibile')
    sourceContext.putImageData(new ImageData(pixels, width, height), 0, 0)
    const outputCanvas = new OffscreenCanvas(targetWidth, targetHeight)
    const outputContext = outputCanvas.getContext('2d')
    if (!outputContext) throw new Error('Canvas 2D non disponibile')
    outputContext.drawImage(
      sourceCanvas,
      crop.sx,
      crop.sy,
      crop.sw,
      crop.sh,
      0,
      0,
      targetWidth,
      targetHeight,
    )
    return outputCanvas.convertToBlob({ type: 'image/png' })
  }
  const sourceCanvas = document.createElement('canvas')
  sourceCanvas.width = width
  sourceCanvas.height = height
  const sourceContext = sourceCanvas.getContext('2d')
  if (!sourceContext) throw new Error('Canvas 2D non disponibile')
  sourceContext.putImageData(new ImageData(pixels, width, height), 0, 0)
  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = targetWidth
  outputCanvas.height = targetHeight
  const outputContext = outputCanvas.getContext('2d')
  if (!outputContext) throw new Error('Canvas 2D non disponibile')
  outputContext.drawImage(
    sourceCanvas,
    crop.sx,
    crop.sy,
    crop.sw,
    crop.sh,
    0,
    0,
    targetWidth,
    targetHeight,
  )
  return new Promise((resolve, reject) => {
    outputCanvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Codifica PNG fallita')),
      'image/png',
    )
  })
}

export class Sd15OnnxWebGpuRuntime {
  private ort: OrtWebGpu | null = null
  private sessions: LoadedSessions | null = null
  private tokenizer: Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>> | null = null
  private loadPromise: Promise<void> | null = null

  constructor(
    readonly manifest: ImageModelManifest,
    readonly artifactBaseUrl: string,
  ) {}

  async load(onProgress?: (progress: Sd15BrowserProgress) => void): Promise<void> {
    if (this.sessions) return
    if (this.loadPromise) return this.loadPromise
    this.loadPromise = this.loadInternal(onProgress).catch((error) => {
      this.loadPromise = null
      onProgress?.({
        phase: 'errore',
        message: error instanceof Error ? error.message : String(error),
      })
      throw error
    })
    return this.loadPromise
  }

  private async loadInternal(
    onProgress?: (progress: Sd15BrowserProgress) => void,
  ): Promise<void> {
    const browser = navigator as Navigator & {
      gpu?: { requestAdapter(): Promise<unknown> }
      deviceMemory?: number
    }
    assertSd15BrowserCompatibility(browser)
    const gpu = browser.gpu!
    const adapter = await gpu.requestAdapter()
    if (!adapter) throw new Error('Nessun adattatore WebGPU disponibile')
    this.ort = await import('onnxruntime-web/webgpu')
    const runtimeBase = new URL('.', window.location.href)
    runtimeBase.pathname = `${runtimeBase.pathname.replace(/\/+$/, '')}/ort-wasm/`
    this.ort.env.wasm.wasmPaths = runtimeBase.href
    const sessionOptions: InferenceSession.SessionOptions = {
      executionProviders: ['webgpu'],
      enableMemPattern: false,
      enableCpuMemArena: false,
      graphOptimizationLevel: 'all',
      extra: {
        session: {
          disable_prepacking: '1',
          use_device_allocator_for_initializers: '1',
          use_ort_model_bytes_directly: '1',
          use_ort_model_bytes_for_initializers: '1',
        },
      },
    }
    const fileByComponent = new Map(
      this.manifest.files.map((file) => [file.component, file]),
    )
    const loadSession = async (
      component: 'text_encoder' | 'unet' | 'vae_decoder',
    ): Promise<InferenceSession> => {
      const file = fileByComponent.get(component)
      if (!file) throw new Error(`Manifest privo del componente ${component}`)
      const url = file.url ?? joinUrl(this.artifactBaseUrl, file.path)
      const downloaded = await fetchSd15ModelFile(url, (loaded, total) => {
        onProgress?.({
          phase: 'download',
          message: `${component}: ${Math.round(loaded / 1_048_576)} MB`,
          pct: total ? Math.round((loaded / total) * 100) : undefined,
          component,
        })
      })
      onProgress?.({
        phase: 'caricamento',
        message: `Creazione sessione ${component}`,
        component,
        source: downloaded.source,
      })
      return this.ort!.InferenceSession.create(downloaded.data, sessionOptions)
    }

    const textEncoder = await loadSession('text_encoder')
    const unet = await loadSession('unet')
    const vaeDecoder = await loadSession('vae_decoder')
    this.tokenizer = await AutoTokenizer.from_pretrained(
      this.manifest.tokenizerRepository,
    )
    this.tokenizer.pad_token_id = 49_407
    this.sessions = { textEncoder, unet, vaeDecoder }
    onProgress?.({
      phase: 'caricamento',
      message: `${this.manifest.name} pronto`,
      pct: 100,
    })
  }

  async generate(options: Sd15GenerateOptions): Promise<Blob> {
    const { prompt, seed, signal, onProgress } = options
    if (!prompt.trim()) throw new Error('Il prompt è vuoto')
    await this.load(onProgress)
    ensureSd15NotAborted(signal)
    const ort = this.ort!
    const sessions = this.sessions!
    const tokenizer = this.tokenizer!

    // Il prompt viene inoltrato integralmente. La stringa vuota serve
    // esclusivamente al ramo matematico unconditional del CFG.
    const encoded = tokenizer(createClassifierFreePromptBatch(prompt), {
      padding: 'max_length',
      max_length: TOKEN_COUNT,
      truncation: true,
      return_tensor: false,
    }) as { input_ids?: unknown }
    const nestedIds = encoded.input_ids
    if (!Array.isArray(nestedIds) || !Array.isArray(nestedIds[0])) {
      throw new Error('Il tokenizer CLIP non ha restituito due sequenze')
    }
    const ids = BigInt64Array.from(
      (nestedIds as number[][]).flat(),
      (value) => BigInt(value),
    )
    const inputIdsTensor = new ort.Tensor(
      'int64',
      ids,
      [2, TOKEN_COUNT],
    )
    let textOutput: Record<string, Tensor>
    try {
      textOutput = await sessions.textEncoder.run({
        input_ids: inputIdsTensor,
      })
    } finally {
      inputIdsTensor.dispose()
    }
    const embeddings = textOutput.last_hidden_state ?? Object.values(textOutput)[0]
    if (!embeddings) {
      disposeOutputTensors(textOutput)
      throw new Error('Il text encoder non ha prodotto embeddings')
    }
    disposeOutputTensors(textOutput, embeddings)

    try {
      const steps = Math.max(4, Math.min(
        this.manifest.qualitySteps,
        Math.round(options.steps ?? this.manifest.qualitySteps),
      ))
      const shape = resolveSd15ImageShape(
        options.width ?? this.manifest.defaultWidth,
        options.height ?? this.manifest.defaultHeight,
        options.inferenceWidth,
        options.inferenceHeight,
      )
      const {
        width,
        height,
        inferenceWidth,
        inferenceHeight,
        latentWidth,
        latentHeight,
      } = shape
      if (inferenceWidth !== width || inferenceHeight !== height) {
        onProgress?.({
          phase: 'generazione',
          message:
            `Geometria UNet ${inferenceWidth}×${inferenceHeight}; uscita ritagliata a ${width}×${height}`,
          component: 'unet-shape',
          pct: 0,
        })
      }
      const schedule = createSd15EulerSchedule(steps)
      const latentCount = LATENT_CHANNELS * latentWidth * latentHeight
      let latents = seededNormal(latentCount, seed, schedule[0].sigma)
      const scaled = new Float32Array(latentCount * 2)
      const startedAt = performance.now()

      for (let stepIndex = 0; stepIndex < schedule.length; stepIndex += 1) {
        ensureSd15NotAborted(signal)
        const step = schedule[stepIndex]
        const divisor = Math.sqrt(step.sigma ** 2 + 1)
        for (let index = 0; index < latentCount; index += 1) {
          const value = latents[index] / divisor
          scaled[index] = value
          scaled[latentCount + index] = value
        }
        const sampleTensor = new ort.Tensor(
          'float16',
          toFloat16Data(scaled),
          [2, LATENT_CHANNELS, latentHeight, latentWidth],
        )
        const timestepTensor = new ort.Tensor(
          'float16',
          toFloat16Data(new Float32Array([step.timestep])),
          [],
        )
        let output: Record<string, Tensor> | null = null
        try {
          output = await sessions.unet.run({
            sample: sampleTensor,
            timestep: timestepTensor,
            encoder_hidden_states: embeddings,
          })
          const prediction = output.out_sample ?? Object.values(output)[0]
          if (!prediction) throw new Error('UNet non ha prodotto la predizione')
          const guided = classifierFreeGuidance(
            floatData(prediction),
            this.manifest.guidanceScale,
          )
          latents = eulerStep(latents, guided, step.sigma, step.nextSigma)
        } finally {
          sampleTensor.dispose()
          timestepTensor.dispose()
          if (output) disposeOutputTensors(output)
        }
        onProgress?.({
          phase: 'generazione',
          message: `Denoising ${stepIndex + 1}/${schedule.length}`,
          pct: Math.round(((stepIndex + 1) / schedule.length) * 90),
        })
      }
      ensureSd15NotAborted(signal)
      const scaledLatents = Float32Array.from(
        latents,
        (value) => value / VAE_SCALE,
      )
      const latentTensor = new ort.Tensor(
        'float32',
        scaledLatents,
        [1, LATENT_CHANNELS, latentHeight, latentWidth],
      )
      let vaeOutput: Record<string, Tensor> | null = null
      try {
        vaeOutput = await sessions.vaeDecoder.run({
          latent_sample: latentTensor,
        })
        const image = vaeOutput.sample ?? Object.values(vaeOutput)[0]
        if (!image) throw new Error('VAE decoder non ha prodotto l’immagine')
        const blob = await tensorToPngBlob(image, width, height)
        onProgress?.({
          phase: 'completato',
          message: `Immagine completata in ${Math.round(performance.now() - startedAt)} ms`,
          pct: 100,
        })
        return blob
      } finally {
        latentTensor.dispose()
        if (vaeOutput) disposeOutputTensors(vaeOutput)
      }
    } finally {
      embeddings.dispose()
    }
  }

  async release(): Promise<void> {
    const sessions = this.sessions
    this.sessions = null
    this.loadPromise = null
    this.tokenizer = null
    this.ort = null
    await Promise.all([
      sessions?.textEncoder.release(),
      sessions?.unet.release(),
      sessions?.vaeDecoder.release(),
    ])
  }
}
