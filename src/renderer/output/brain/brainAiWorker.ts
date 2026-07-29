/// <reference lib="webworker" />

import { pipeline, TextStreamer } from '@huggingface/transformers'
import { BRAIN_CONFIG } from '@shared/brain/brainConfig'
import type { BrainAiRequest, BrainAiResponse, BrainAiTask } from '@shared/brain/brainTypes'
import {
  formatWorkerLog,
  inspectTextModelCache,
  inspectTranslationModelCache,
  isDegenerateGeneratedText,
  isPermanentOnnxGraphError,
} from './brainAiLoadDiagnostics'
import { BrainAiRequestQueue } from './brainAiRequestQueue'

type Generator = Awaited<ReturnType<typeof createGenerator>>
type Translator = Awaited<ReturnType<typeof createTranslator>>
type GeneratorLoadMode = 'auto' | 'wasm-q4'
type GeneratorProfile = {
  backend: 'WebGPU' | 'WASM'
  dtype: string
}

const generators = new Map<string, Generator>()
const generatorLoads = new Map<string, Promise<Generator>>()
const generatorProfiles = new Map<string, GeneratorProfile>()
const translators = new Map<string, Translator>()
const translatorLoads = new Map<string, Promise<Translator>>()
const unhealthyModels = new Set<string>()
const requestQueue = new BrainAiRequestQueue()

function modelForTask(task: BrainAiTask): string {
  if (task === 'translate-input') return BRAIN_CONFIG.inputTranslationModelId
  if (task === 'translate-ui') return BRAIN_CONFIG.uiTranslationModelId
  if (task === 'story') {
    return unhealthyModels.has(BRAIN_CONFIG.storyModelId)
      ? BRAIN_CONFIG.storyFallbackModelId
      : BRAIN_CONFIG.storyModelId
  }
  if (task === 'memo') return BRAIN_CONFIG.memoModelId
  return BRAIN_CONFIG.visualModelId
}

function isTranslationTask(
  task: BrainAiTask,
): task is Extract<BrainAiTask, 'translate-input' | 'translate-ui'> {
  return task === 'translate-input' || task === 'translate-ui'
}

async function releaseTranslationModels(
  id: string,
): Promise<BrainAiResponse> {
  const loaded = [...translators.entries()]
  await Promise.all(
    loaded.map(async ([model, translator]) => {
      await translator.dispose()
      translators.delete(model)
    }),
  )
  translatorLoads.clear()
  console.info(
    formatWorkerLog(
      '[Brain][worker][MEMORIA LIBERATA] traduttori rimossi prima di Psichedel',
      {
        models: loaded.map(([model]) => model),
        downloadOnNextUse: false,
        sourceOnNextUse: 'cache locale',
      },
    ),
  )
  return { id, ok: true, text: 'translation models released' }
}

async function releaseAllAiModels(id: string): Promise<BrainAiResponse> {
  const loadedGenerators = [...generators.entries()]
  const loadedTranslators = [...translators.entries()]
  await Promise.all([
    ...loadedGenerators.map(([, generator]) => generator.dispose()),
    ...loadedTranslators.map(([, translator]) => translator.dispose()),
  ])
  generators.clear()
  generatorLoads.clear()
  generatorProfiles.clear()
  translators.clear()
  translatorLoads.clear()
  console.info(
    formatWorkerLog(
      '[Brain][worker][MEMORIA LIBERATA] modelli testuali rimossi prima di Psichedel',
      {
        generators: loadedGenerators.map(([model]) => model),
        translators: loadedTranslators.map(([model]) => model),
        sourceOnNextUse: 'cache locale',
      },
    ),
  )
  return { id, ok: true, text: 'all text models released' }
}

async function createTranslator(
  task: Extract<BrainAiTask, 'translate-input' | 'translate-ui'>,
  forceWasm = false,
) {
  const model = modelForTask(task)
  const dtype = BRAIN_CONFIG.translationModelDtype
  const cacheState = await inspectTranslationModelCache(model, dtype)
  const loadStartedAt = performance.now()
  const sourceLabel = cacheState.complete ? 'CACHE LOCALE' : 'DOWNLOAD RETE'
  console.info(
    formatWorkerLog(
      `[Brain][worker][${sourceLabel}] preparazione traduttore ${task}`,
      {
        model,
        dtype,
        cachedFiles: cacheState.cachedFiles.size,
        missingFiles: cacheState.missingFiles,
      },
    ),
  )
  const loggedProgress = new Map<string, number>()
  const startedResources = new Set<string>()
  const loadingOptions = {
    dtype,
    progress_callback: (event: unknown) => {
      const progressEvent = event as {
        status?: string
        progress?: number
        loaded?: number
        total?: number
        file?: string
      }
      const resource = progressEvent.file ?? 'modello traduzione'
      const resourceSource = cacheState.cachedFiles.has(resource)
        ? 'CACHE LOCALE'
        : sourceLabel
      const progress =
        typeof progressEvent.progress === 'number'
          ? Math.floor(progressEvent.progress / 10) * 10
          : -1
      if (progressEvent.status === 'download' && !startedResources.has(resource)) {
        startedResources.add(resource)
        console.info(
          `[Brain][worker][${resourceSource}] ${task} ${resource} ${
            resourceSource === 'CACHE LOCALE'
              ? 'lettura dalla copia salvata'
              : 'trasferimento dalla rete avviato'
          }`,
        )
      }
      if (progress >= 0 && progress !== loggedProgress.get(resource)) {
        loggedProgress.set(resource, progress)
        console.info(
          formatWorkerLog(
            `[Brain][worker][${resourceSource}] ${task} ${progress}%`,
            {
              resource,
              loadedBytes: progressEvent.loaded,
              totalBytes: progressEvent.total,
            },
          ),
        )
      } else if (progressEvent.status === 'done') {
        console.info(
          formatWorkerLog(
            `[Brain][worker][${resourceSource}] ${task} risorsa pronta`,
            {
              resource,
              durationMs: Math.round(performance.now() - loadStartedAt),
            },
          ),
        )
      }
    },
  }
  const webGpuAvailable =
    !forceWasm && typeof navigator !== 'undefined' && 'gpu' in navigator
  try {
    console.info(
      `[Brain][worker] backend ${task}: ${webGpuAvailable ? 'WebGPU' : 'WASM'}`,
    )
    const translator = await pipeline('translation', model, {
      ...loadingOptions,
      ...(webGpuAvailable ? { device: 'webgpu' as const } : {}),
    })
    console.info(
      formatWorkerLog(
        `[Brain][worker][CREAZIONE SESSIONE] traduttore ${task} pronto`,
        {
          model,
          backend: webGpuAvailable ? 'WebGPU' : 'WASM',
          totalPreparationMs: Math.round(performance.now() - loadStartedAt),
          source: cacheState.complete ? 'cache locale' : 'rete + cache locale',
        },
      ),
    )
    return translator
  } catch (error) {
    if (webGpuAvailable) {
      console.warn(
        `[Brain][worker] WebGPU ${task} non disponibile; ripiego su WASM`,
        error,
      )
      return createTranslator(task, true)
    }
    throw error
  }
}

async function translatorForTask(
  task: Extract<BrainAiTask, 'translate-input' | 'translate-ui'>,
): Promise<Translator> {
  const model = modelForTask(task)
  const loaded = translators.get(model)
  if (loaded) {
    console.info(
      formatWorkerLog(`[Brain][worker][SESSIONE RIUSATA] ${task}`, {
        model,
        download: false,
        sessionCreation: false,
      }),
    )
    return loaded
  }
  const pending = translatorLoads.get(model)
  if (pending) return pending
  const loading = createTranslator(task)
    .then((translator) => {
      translators.set(model, translator)
      return translator
    })
    .finally(() => translatorLoads.delete(model))
  translatorLoads.set(model, loading)
  return loading
}

function translatedText(output: unknown): string {
  if (!Array.isArray(output) || output.length === 0) {
    throw new Error('Traduzione AI vuota')
  }
  const translated = (output[0] as { translation_text?: unknown }).translation_text
  if (typeof translated !== 'string' || !translated.trim()) {
    throw new Error('Il modello di traduzione non ha restituito testo')
  }
  return translated.trim()
}

async function handleTranslationRequest(
  request: BrainAiRequest & {
    task: Extract<BrainAiTask, 'translate-input' | 'translate-ui'>
  },
): Promise<BrainAiResponse> {
  const inferenceStartedAt = performance.now()
  const translator = await translatorForTask(request.task)
  const maxNewTokens = Math.max(
    16,
    Math.min(BRAIN_CONFIG.sceneMaxNewTokens, request.maxNewTokens ?? 160),
  )
  console.info(
    formatWorkerLog(`[Brain][worker][TRADUZIONE] ${request.task} avviata`, {
      model: modelForTask(request.task),
      sourceCharacters: request.prompt.length,
      maxNewTokens,
    }),
  )
  const output = await translator(request.prompt, {
    max_new_tokens: maxNewTokens,
  })
  const text = translatedText(output)
  console.info(
    formatWorkerLog(`[Brain][worker][TRADUZIONE] ${request.task} completata`, {
      id: request.id,
      durationMs: Math.round(performance.now() - inferenceStartedAt),
      characters: text.length,
    }),
  )
  return { id: request.id, ok: true, text }
}

async function createGenerator(task: BrainAiTask, mode: GeneratorLoadMode = 'auto') {
  const model = modelForTask(task)
  const webGpuAvailable =
    mode !== 'wasm-q4' && typeof navigator !== 'undefined' && 'gpu' in navigator
  const dtype =
    webGpuAvailable && mode === 'auto'
      ? BRAIN_CONFIG.webGpuModelDtype
      : BRAIN_CONFIG.modelDtype
  const cacheState = await inspectTextModelCache(model, dtype)
  const loadStartedAt = performance.now()
  let lastAssetCompletedAt = loadStartedAt
  const sourceLabel = cacheState.complete ? 'CACHE LOCALE' : 'DOWNLOAD RETE'
  console.info(
    formatWorkerLog(
      `[Brain][worker][${sourceLabel}] preparazione modello ${task}`,
      {
        model,
        dtype,
        cachedFiles: cacheState.cachedFiles.size,
        missingFiles: cacheState.missingFiles,
      },
    ),
  )
  const loggedProgress = new Map<string, number>()
  const startedResources = new Set<string>()
  const loadingOptions = {
    dtype,
    progress_callback: (event: unknown) => {
      const progressEvent = event as {
        status?: string
        progress?: number
        loaded?: number
        total?: number
        file?: string
      }
      const progress = typeof progressEvent.progress === 'number' ? Math.floor(progressEvent.progress / 10) * 10 : -1
      const resource = progressEvent.file ?? 'modello'
      const resourceSource =
        cacheState.cachedFiles.has(resource) ? 'CACHE LOCALE' : sourceLabel
      if (
        progressEvent.status === 'download' &&
        !startedResources.has(resource)
      ) {
        startedResources.add(resource)
        console.info(
          `[Brain][worker][${resourceSource}] ${task} ${resource} ${
            resourceSource === 'CACHE LOCALE'
              ? 'lettura dalla copia salvata'
              : 'trasferimento dalla rete avviato'
          }`,
        )
      }
      if (progress >= 0 && progress !== loggedProgress.get(resource)) {
        loggedProgress.set(resource, progress)
        console.info(
          formatWorkerLog(
            `[Brain][worker][${resourceSource}] ${task} ${progress}%`,
            {
              resource,
              loadedBytes: progressEvent.loaded,
              totalBytes: progressEvent.total,
            },
          ),
        )
      } else if (progressEvent.status === 'done') {
        lastAssetCompletedAt = performance.now()
        console.info(
          formatWorkerLog(
            `[Brain][worker][${resourceSource}] ${task} risorsa pronta`,
            {
              resource,
              durationMs: Math.round(lastAssetCompletedAt - loadStartedAt),
            },
          ),
        )
      } else if (progressEvent.status === 'ready') {
        console.info(`[Brain][worker][CREAZIONE SESSIONE] pipeline ${task} pronta`)
      }
    },
  }
  let generator: Awaited<ReturnType<typeof pipeline<'text-generation'>>>
  let selectedBackend: 'WebGPU' | 'WASM'
  if (webGpuAvailable) {
    try {
      console.info(`[Brain][worker] backend ${task}: WebGPU`)
      generator = await pipeline('text-generation', model, {
        ...loadingOptions,
        dtype,
        device: 'webgpu',
      })
      selectedBackend = 'WebGPU'
    } catch (error) {
      if (isPermanentOnnxGraphError(error)) {
        console.error(
          `[Brain][worker][GRAFO ONNX INCOMPATIBILE] ${task}: ${
            error instanceof Error ? error.message : String(error)
          }; fallback WASM annullato`,
        )
        throw error
      }
      console.warn(`[Brain][worker] WebGPU ${task} non disponibile; ripiego su WASM`, error)
      return createGenerator(task, 'wasm-q4')
    }
  } else {
    console.info(`[Brain][worker] backend ${task}: WASM`)
    generator = await pipeline('text-generation', model, loadingOptions)
    selectedBackend = 'WASM'
  }
  const readyAt = performance.now()
  console.info(
    formatWorkerLog(
      `[Brain][worker][CREAZIONE SESSIONE] modello ${task} pronto`,
      {
        model,
        backend: selectedBackend,
        sessionDurationMs: Math.round(readyAt - lastAssetCompletedAt),
        totalPreparationMs: Math.round(readyAt - loadStartedAt),
        source: cacheState.complete ? 'cache locale' : 'rete + cache locale',
      },
    ),
  )
  generatorProfiles.set(model, { backend: selectedBackend, dtype })
  return generator
}

async function generatorForTask(task: BrainAiTask): Promise<Generator> {
  const model = modelForTask(task)
  const loaded = generators.get(model)
  if (loaded) {
    console.info(
      formatWorkerLog(`[Brain][worker][SESSIONE RIUSATA] ${task}`, {
        model,
        download: false,
        sessionCreation: false,
      }),
    )
    return loaded
  }
  const pending = generatorLoads.get(model)
  if (pending) {
    console.info(
      `[Brain][worker][CARICAMENTO CONDIVISO] ${task} attende il modello già in preparazione`,
    )
    return pending
  }
  const loading = createGenerator(task)
    .then((generator) => {
      generators.set(model, generator)
      return generator
    })
    .finally(() => {
      generatorLoads.delete(model)
    })
  generatorLoads.set(model, loading)
  return loading
}

function generatedText(output: unknown): string {
  if (!Array.isArray(output) || output.length === 0) throw new Error('Risposta AI vuota')
  const first = output[0] as { generated_text?: unknown }
  if (typeof first.generated_text === 'string' && first.generated_text.trim()) {
    return first.generated_text
  }
  if (Array.isArray(first.generated_text)) {
    const messages = first.generated_text as Array<{ role?: unknown; content?: unknown }>
    for (let index = messages.length - 1; index >= 0; index--) {
      const message = messages[index]
      if (
        message?.role === 'assistant' &&
        typeof message.content === 'string' &&
        message.content.trim()
      ) {
        return message.content
      }
    }
  }
  console.error('[Brain][worker] output AI senza contenuto assistant', summarizeOutput(output))
  throw new Error('Il modello ha terminato senza generare contenuto assistant')
}

function summarizeOutput(output: unknown): unknown {
  if (!Array.isArray(output)) return { type: typeof output }
  return output.map((item) => {
    if (typeof item !== 'object' || item === null) return { type: typeof item }
    const generated = (item as { generated_text?: unknown }).generated_text
    if (typeof generated === 'string') {
      return { generatedTextType: 'string', length: generated.length, preview: generated.slice(0, 500) }
    }
    if (Array.isArray(generated)) {
      return {
        generatedTextType: 'messages',
        messages: generated.map((message) => {
          const data = message as { role?: unknown; content?: unknown }
          return {
            role: data.role,
            contentType: typeof data.content,
            length: typeof data.content === 'string' ? data.content.length : null,
            preview: typeof data.content === 'string' ? data.content.slice(0, 500) : null,
          }
        }),
      }
    }
    return { generatedTextType: typeof generated }
  })
}

function progressStreamer(generator: Generator, task: BrainAiTask, attempt: number): TextStreamer {
  let tokenCount = 0
  let nextLogAt = 25
  return new TextStreamer(generator.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: () => undefined,
    token_callback_function: (tokens) => {
      tokenCount += tokens.length
      if (tokenCount >= nextLogAt) {
        console.info(`[Brain][worker][INFERENZA] ${task} tentativo=${attempt} token=${tokenCount}`)
        nextLogAt += 25
      }
    },
  })
}

async function handleRequest(request: BrainAiRequest): Promise<BrainAiResponse> {
  try {
    console.info(`[Brain][worker] elaborazione ${request.task}`, request.id)
    if (request.task === 'release-translators') {
      return await releaseTranslationModels(request.id)
    }
    if (request.task === 'release-ai-models') {
      return await releaseAllAiModels(request.id)
    }
    if (isTranslationTask(request.task)) {
      return await handleTranslationRequest({
        ...request,
        task: request.task,
      })
    }
    let model = modelForTask(request.task)
    let generator = await generatorForTask(request.task)
    const messages = [
      {
        role: 'system' as const,
        content:
          request.task === 'story'
            ? 'You are CoscienzaOnirica, an original dream-story writer. Preserve the concrete source content without sanitizing, euphemizing or replacing physical actions with metaphors. When the source contains consensual sexual activity between adults, keep it explicit and ensure every participant is an adult. Write in the language explicitly requested by the user prompt. Never explain the task, copy field descriptions, or print placeholders. Output only concrete original content in the exact labelled format.'
            : request.task === 'memo'
              ? 'Sei la memoria riflessiva di Brain. Comprendi il significato generale della sessione e scrivi soltanto tre frasi concise in italiano, nel formato richiesto, senza markdown o spiegazioni.'
              : 'Sei Psichedel, un illustratore vettoriale. Progetta composizioni narrative coerenti e segui esattamente il formato richiesto, senza markdown.',
      },
      {
        role: 'user' as const,
        content: model.includes('Qwen3') ? `${request.prompt}\n/no_think` : request.prompt,
      },
    ]
    const inferenceStartedAt = performance.now()
    const configuredMaxNewTokens =
      request.task === 'story' ? BRAIN_CONFIG.storyMaxNewTokens : BRAIN_CONFIG.sceneMaxNewTokens
    const configuredMinNewTokens =
      request.task === 'story' ? BRAIN_CONFIG.storyMinNewTokens : BRAIN_CONFIG.sceneMinNewTokens
    const maxNewTokens = Math.max(
      32,
      Math.min(configuredMaxNewTokens, request.maxNewTokens ?? configuredMaxNewTokens),
    )
    const minNewTokens = Math.max(
      0,
      Math.min(maxNewTokens, request.minNewTokens ?? configuredMinNewTokens),
    )
    console.info(
      formatWorkerLog(`[Brain][worker][INFERENZA] ${request.task} avviata`, {
        maxNewTokens,
        minNewTokens,
      }),
    )
    const creativeStory = request.task === 'story'
    const reflectiveMemo = request.task === 'memo'
    let output: unknown = await generator(messages, {
      max_new_tokens: maxNewTokens,
      min_new_tokens: minNewTokens,
      do_sample: creativeStory || reflectiveMemo,
      ...(creativeStory
        ? { temperature: 0.78, top_p: 0.92, repetition_penalty: 1.08 }
        : reflectiveMemo
          ? { temperature: 0.58, top_p: 0.86, repetition_penalty: 1.05 }
          : {}),
      streamer: progressStreamer(generator, request.task, 1),
    })
    let text: string
    try {
      text = generatedText(output)
    } catch (firstError) {
      console.warn(`[Brain][worker] primo tentativo ${request.task} vuoto; nuova inferenza campionata`, firstError)
      output = await generator(messages, {
        max_new_tokens: maxNewTokens,
        min_new_tokens: minNewTokens,
        do_sample: true,
        temperature: 0.72,
        top_p: 0.9,
        streamer: progressStreamer(generator, request.task, 2),
      })
      text = generatedText(output)
    }
    if (isDegenerateGeneratedText(text)) {
      const failedProfile = generatorProfiles.get(model)
      console.error(
        formatWorkerLog(
          `[Brain][worker][OUTPUT CORROTTO] ${request.task}; cambio backend/quantizzazione`,
          {
            backend: failedProfile?.backend ?? 'sconosciuto',
            dtype: failedProfile?.dtype ?? 'sconosciuto',
            length: text.length,
            preview: text.slice(0, 240),
          },
        ),
      )
      await generator.dispose()
      generators.delete(model)
      generatorProfiles.delete(model)
      if (
        failedProfile?.backend === 'WASM' &&
        failedProfile.dtype === BRAIN_CONFIG.modelDtype
      ) {
        throw new Error(
          `Output ${request.task} degenerato anche con WASM ${BRAIN_CONFIG.modelDtype}`,
        )
      }
      if (
        request.task !== 'story' ||
        model !== BRAIN_CONFIG.storyModelId ||
        BRAIN_CONFIG.storyFallbackModelId === model
      ) {
        throw new Error(
          `Output ${request.task} degenerato con ${failedProfile?.backend ?? 'backend sconosciuto'}/${failedProfile?.dtype ?? 'dtype sconosciuto'}; nessun modello di fallback distinto`,
        )
      }
      unhealthyModels.add(model)
      model = modelForTask(request.task)
      console.warn(
        formatWorkerLog(
          '[Brain][worker][FALLBACK MODELLO] modello story principale escluso per questa sessione',
          {
            failedModel: BRAIN_CONFIG.storyModelId,
            fallbackModel: model,
            reason: 'output privo di contenuto linguistico',
            additionalQ4Download: false,
          },
        ),
      )
      generator = await generatorForTask(request.task)
      output = await generator(messages, {
        max_new_tokens: maxNewTokens,
        min_new_tokens: minNewTokens,
        do_sample: creativeStory || reflectiveMemo,
        ...(creativeStory
          ? { temperature: 0.78, top_p: 0.92, repetition_penalty: 1.08 }
          : reflectiveMemo
            ? { temperature: 0.58, top_p: 0.86, repetition_penalty: 1.05 }
            : {}),
        streamer: progressStreamer(generator, request.task, 3),
      })
      text = generatedText(output)
      if (isDegenerateGeneratedText(text)) {
        throw new Error(
          `Output ${request.task} degenerato dopo il recupero ${generatorProfiles.get(model)?.backend ?? 'sconosciuto'}/${generatorProfiles.get(model)?.dtype ?? 'sconosciuto'}: ${JSON.stringify(text.slice(0, 240))}`,
        )
      }
    }
    console.info(
      formatWorkerLog(`[Brain][worker][INFERENZA] ${request.task} completata`, {
        id: request.id,
        durationMs: Math.round(performance.now() - inferenceStartedAt),
        characters: text.length,
      }),
    )
    return { id: request.id, ok: true, text }
  } catch (error) {
    return {
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

self.addEventListener('message', async (event: MessageEvent<BrainAiRequest>) => {
  const request = event.data
  const queuedAhead = requestQueue.size()
  if (queuedAhead > 0) {
    console.info(
      formatWorkerLog(
        `[Brain][worker][CODA INFERENZA] ${request.task} accodata`,
        {
          id: request.id,
          queuedAhead,
          reason: 'una sola inferenza alla volta per sessione WebGPU',
        },
      ),
    )
  }
  const response = await requestQueue.run(() => handleRequest(request))
  self.postMessage(response)
})
