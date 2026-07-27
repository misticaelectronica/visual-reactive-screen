/// <reference lib="webworker" />

import { pipeline, TextStreamer } from '@huggingface/transformers'
import { BRAIN_CONFIG } from '@shared/brain/brainConfig'
import type { BrainAiRequest, BrainAiResponse, BrainAiTask } from '@shared/brain/brainTypes'

type Generator = Awaited<ReturnType<typeof createGenerator>>

const generators = new Map<string, Generator>()

async function createGenerator(task: BrainAiTask, forceWasm = false) {
  const model = task === 'story' ? BRAIN_CONFIG.storyModelId : BRAIN_CONFIG.visualModelId
  console.info(`[Brain][worker] caricamento modello ${task}`, model)
  const loggedProgress = new Map<string, number>()
  const loadingOptions = {
    dtype: BRAIN_CONFIG.modelDtype,
    progress_callback: (event: unknown) => {
      const progressEvent = event as { status?: string; progress?: number; file?: string }
      const progress = typeof progressEvent.progress === 'number' ? Math.floor(progressEvent.progress / 10) * 10 : -1
      const resource = progressEvent.file ?? 'modello'
      if (progress >= 0 && progress !== loggedProgress.get(resource)) {
        loggedProgress.set(resource, progress)
        console.info(`[Brain][worker] caricamento ${task} ${progress}%`, resource)
      } else if (progressEvent.status === 'ready') {
        console.info(`[Brain][worker] risorsa ${task} pronta`, resource)
      }
    },
  }
  const webGpuAvailable = !forceWasm && typeof navigator !== 'undefined' && 'gpu' in navigator
  let generator: Awaited<ReturnType<typeof pipeline<'text-generation'>>>
  let selectedBackend: 'WebGPU' | 'WASM'
  if (webGpuAvailable) {
    try {
      console.info(`[Brain][worker] backend ${task}: WebGPU`)
      generator = await pipeline('text-generation', model, {
        ...loadingOptions,
        dtype: BRAIN_CONFIG.webGpuModelDtype,
        device: 'webgpu',
      })
      selectedBackend = 'WebGPU'
    } catch (error) {
      console.warn(`[Brain][worker] WebGPU ${task} non disponibile; ripiego su WASM`, error)
      generator = await pipeline('text-generation', model, loadingOptions)
      selectedBackend = 'WASM'
    }
  } else {
    console.info(`[Brain][worker] backend ${task}: WASM`)
    generator = await pipeline('text-generation', model, loadingOptions)
    selectedBackend = 'WASM'
  }
  console.info(`[Brain][worker] modello ${task} pronto model=${model} backend=${selectedBackend}`)
  return generator
}

function isDegenerateText(text: string): boolean {
  const compact = text.replace(/\s/g, '')
  if (compact.length < 20) return true
  // Character-level repetition check
  const counts = new Map<string, number>()
  let mostFrequent = 0
  for (const character of compact) {
    const count = (counts.get(character) ?? 0) + 1
    counts.set(character, count)
    mostFrequent = Math.max(mostFrequent, count)
  }
  if (counts.size <= 4 || mostFrequent / compact.length > 0.72) return true
  // Phrase-level repetition check: a 40-char fragment dominates > 40% of the text
  if (compact.length >= 200) {
    const fragmentSize = 40
    const fragmentCounts = new Map<string, number>()
    for (let i = 0; i <= compact.length - fragmentSize; i += 8) {
      const fragment = compact.slice(i, i + fragmentSize)
      fragmentCounts.set(fragment, (fragmentCounts.get(fragment) ?? 0) + 1)
    }
    const maxFragmentCount = Math.max(...fragmentCounts.values())
    const maxFragmentRatio = (maxFragmentCount * fragmentSize) / compact.length
    if (maxFragmentRatio > 0.40) return true
  }
  return false
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
        console.info(`[Brain][worker] inferenza ${task} tentativo=${attempt} token=${tokenCount}`)
        nextLogAt += 25
      }
    },
  })
}

async function handleRequest(request: BrainAiRequest): Promise<BrainAiResponse> {
  try {
    console.info(`[Brain][worker] elaborazione ${request.task}`, request.id)
    const model = request.task === 'story' ? BRAIN_CONFIG.storyModelId : BRAIN_CONFIG.visualModelId
    let generator = generators.get(model)
    if (!generator) {
      generator = await createGenerator(request.task)
      generators.set(model, generator)
    }
    const messages = [
      {
        role: 'system' as const,
        content:
          request.task === 'story'
            ? 'You are CoscienzaOnirica, an original dream-story writer. Think privately in English if useful, but write only the requested final Italian story. Never explain the task, translate instructions, copy field descriptions, or print placeholders. Output only concrete original content in the exact labelled format.'
            : 'Sei Psichedel, un illustratore vettoriale. Progetta composizioni narrative coerenti e segui esattamente il formato richiesto, senza markdown.',
      },
      { role: 'user' as const, content: `${request.prompt}\n/no_think` },
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
      `[Brain][worker] inferenza ${request.task} avviata maxToken=${maxNewTokens}`,
    )
    const creativeStory = request.task === 'story'
    let output: unknown = await generator(messages, {
      max_new_tokens: maxNewTokens,
      min_new_tokens: minNewTokens,
      do_sample: creativeStory,
      ...(creativeStory ? { temperature: 0.78, top_p: 0.92, repetition_penalty: 1.08 } : {}),
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
    if (isDegenerateText(text)) {
      console.error(
        `[Brain][worker] output ${request.task} degenerato su WebGPU; riavvio pipeline su WASM lunghezza=${text.length} preview=${JSON.stringify(text.slice(0, 240))}`,
      )
      await generator.dispose()
      generators.delete(model)
      generator = await createGenerator(request.task, true)
      generators.set(model, generator)
      output = await generator(messages, {
        max_new_tokens: maxNewTokens,
        min_new_tokens: minNewTokens,
        do_sample: creativeStory,
        ...(creativeStory ? { temperature: 0.78, top_p: 0.92, repetition_penalty: 1.08 } : {}),
        streamer: progressStreamer(generator, request.task, 3),
      })
      text = generatedText(output)
      if (isDegenerateText(text)) {
        throw new Error(
          `Output ${request.task} degenerato anche su WASM: ${JSON.stringify(text.slice(0, 240))}`,
        )
      }
    }
    console.info(
      `[Brain][worker] completata ${request.task} id=${request.id} durataMs=${Math.round(performance.now() - inferenceStartedAt)} caratteri=${text.length}`,
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
  const response = await handleRequest(event.data)
  self.postMessage(response)
})
