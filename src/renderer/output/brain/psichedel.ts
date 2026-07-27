import type { DreamFrame, DreamStory, PsychedelScene } from '@shared/brain/brainTypes'
import { brainLog, brainWarn } from './brainLog'
import {
  BrainVectorizer,
  type PsychedelVectorizer,
} from './brainVectorQuality'
import {
  LocalPsychedelImageGenerator,
  type ImageRenderMode,
  type PsychedelImageGenerator,
} from './psychedelImageGenerator'
import { BRAIN_CONFIG } from '@shared/brain/brainConfig'

export type PsychedelRasterPreview = {
  storyId: string
  frameId: string
  frameTitle: string
  dreamMeaning: string
  attempt: number
  mode: ImageRenderMode
  model: string
  blob: Blob
}

export class HighQualityRenderScheduler {
  private remaining: number

  constructor(private readonly random: () => number = Math.random) {
    this.remaining = this.nextInterval()
  }

  next(): ImageRenderMode {
    this.remaining -= 1
    if (this.remaining > 0) return 'standard'
    this.remaining = this.nextInterval()
    return 'high-quality'
  }

  private nextInterval(): number {
    return 2 + Math.floor(this.random() * 4)
  }
}

function hashSeed(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function isInfrastructureError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /webgpu|webassembly|wasm|backend|tokenizer|caricamento del modello|verifica webgpu/i.test(message)
}

export class PsychedelInfrastructureError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'PsychedelInfrastructureError'
  }
}

export function buildPsychedelImagePrompt(
  story: DreamStory,
  frame: DreamFrame,
  attempt = 0,
  mode: ImageRenderMode = 'standard',
): string {
  const compositionOptions = [
    'Wide lateral composition with a strong horizon and separated depth planes.',
    'Intimate close composition focused on one tactile action and expressive material detail.',
    'Low oblique viewpoint with a clear diagonal flow and a single dominant silhouette.',
    'Overhead spatial composition with an asymmetric focal point and generous negative space.',
    'Frontal monumental composition with layered foreground, subject and distant environment.',
  ]
  const compositionIndex =
    hashSeed(`${story.title}|${frame.id}|${frame.description}`) %
    compositionOptions.length
  return [
    `Scene: ${frame.description.slice(0, 240)}`,
    `Visual: ${frame.visualIntent.slice(0, 180)}`,
    compositionOptions[compositionIndex],
    `Exact palette: ${story.palette.join(', ')}.`,
    'Museum-grade psychedelic cinematic realism, legible action, clear focal depth.',
    'Only named subjects. Avoid clip-art, text, collage, patterns and random fragments.',
    attempt > 0
      ? 'Alternative interpretation with a stronger subject.'
      : 'Keep recurring characters coherent.',
    mode === 'high-quality' || mode === 'enhanced'
      ? 'Natural anatomy, believable materials, precise light, fine detail, photographic depth.'
      : '',
    mode === 'enhanced'
      ? 'Enhanced alternate composition with richer detail.'
      : '',
  ].join(' ')
}

export class Psichedel {
  private readonly retainedScenes = new Map<string, Map<string, PsychedelScene>>()
  private readonly generationRounds = new Map<string, number>()
  private highQualityAvailable = true

  constructor(
    private readonly imageGenerator: PsychedelImageGenerator = new LocalPsychedelImageGenerator(),
    private readonly vectorizer: PsychedelVectorizer = new BrainVectorizer(),
    private readonly onRaster?: (preview: PsychedelRasterPreview) => void,
    private readonly renderScheduler: HighQualityRenderScheduler = new HighQualityRenderScheduler(),
  ) {}

  async generate(story: DreamStory): Promise<PsychedelScene[]> {
    const scenesByFrame = this.retainedScenes.get(story.id) ?? new Map<string, PsychedelScene>()
    this.retainedScenes.set(story.id, scenesByFrame)
    const baseSeed = hashSeed(`${story.title}|${story.synopsis}`)
    const generationRound = this.generationRounds.get(story.id) ?? 0
    this.generationRounds.set(story.id, generationRound + 1)
    brainLog('psichedel', 'pipeline raster AI → vettorializzazione avviata', {
      storyId: story.id,
      model: 'sd-turbo',
      vectorizer: 'VTracer color spline',
      frames: story.frames.length,
      baseSeed,
      generationRound: generationRound + 1,
    })

    try {
      for (let index = 0; index < story.frames.length; index++) {
        const frame = story.frames[index]
        if (scenesByFrame.has(frame.id)) {
          brainLog('psichedel', `fotogramma ${index + 1} già vettorializzato; riuso risultato`)
          continue
        }

        let scene: PsychedelScene | null = null
        let lastError: unknown = null
        const requestedMode = this.renderScheduler.next()
        const scheduledMode: ImageRenderMode =
          requestedMode === 'high-quality' && !this.highQualityAvailable
            ? 'enhanced'
            : requestedMode
        for (let attempt = 0; attempt < 2 && !scene; attempt++) {
          const seed = (
            baseSeed +
            index * 1_000_003 +
            generationRound * 104_729 +
            attempt * 7_919
          ) >>> 0
          const mode: ImageRenderMode =
            attempt === 0
              ? scheduledMode
              : scheduledMode === 'high-quality' && !this.highQualityAvailable
                ? 'enhanced'
                : 'standard'
          const prompt = buildPsychedelImagePrompt(story, frame, attempt, mode)
          try {
            brainLog('psichedel', `generazione raster ${index + 1}/${story.frames.length}`, {
              frameId: frame.id,
              title: frame.title,
              attempt: attempt + 1,
              mode,
              seed,
              prompt,
            })
            const raster = await this.imageGenerator.generate(prompt, seed, mode)
            this.onRaster?.({
              storyId: story.id,
              frameId: frame.id,
              frameTitle: frame.title,
              dreamMeaning: frame.description,
              attempt: attempt + 1,
              mode,
              model:
                raster.model ??
                (mode === 'high-quality'
                  ? BRAIN_CONFIG.highQualityImageModelId
                  : BRAIN_CONFIG.imageModelId),
              blob: raster.blob,
            })
            brainLog('psichedel', `vettorializzazione ${index + 1}/${story.frames.length}`, {
              model: raster.model,
              mode,
              rasterBytes: raster.blob.size,
              rasterDurationMs: Math.round(raster.durationMs),
            })
            const vector = await this.vectorizer.vectorize(raster.blob)
            scene = {
              frameId: frame.id,
              description: `${frame.title}: ${frame.description}`,
              svg: vector.svg,
            }
            brainLog('psichedel', `fotogramma ${index + 1} superato controllo qualità`, {
              vectorDurationMs: vector.durationMs,
              vectorProfile: vector.profile,
              quality: vector.quality,
            })
          } catch (error) {
            lastError = error
            brainWarn('psichedel', `fotogramma ${index + 1} tentativo ${attempt + 1} rifiutato`, {
              error,
            })
            if (mode === 'high-quality') {
              this.highQualityAvailable = false
              brainWarn(
                'psichedel',
                'render high-quality disattivato per questa sessione; fallback reale a SD-Turbo',
                {
                  error,
                  reason:
                    'il modello HQ ha esaurito o non può allocare la memoria; non verrà ricaricato a ogni storia',
                },
              )
              continue
            }
            if (isInfrastructureError(error)) {
              throw new PsychedelInfrastructureError(
                error instanceof Error ? error.message : String(error),
                { cause: error },
              )
            }
          }
        }

        if (!scene) {
          throw new Error(
            `Psichedel non ha prodotto un'immagine vettoriale di qualità per il fotogramma ${index + 1}: ${
              lastError instanceof Error ? lastError.message : String(lastError)
            }`,
          )
        }
        scenesByFrame.set(frame.id, scene)
      }

      const scenes = story.frames.map((frame) => scenesByFrame.get(frame.id))
      if (scenes.some((scene) => !scene)) {
        throw new Error('Psichedel ha perso uno o più fotogrammi vettoriali verificati')
      }
      this.retainedScenes.delete(story.id)
      this.generationRounds.delete(story.id)
      await this.imageGenerator.release()
      return scenes as PsychedelScene[]
    } catch (error) {
      brainWarn('psichedel', 'pipeline immagini fallita; mantengo i fotogrammi validi', {
        error,
        retainedFrames: [...scenesByFrame.keys()],
      })
      if (error instanceof PsychedelInfrastructureError) {
        await this.imageGenerator.release()
      }
      throw error
    }
  }

  async discard(storyId: string): Promise<void> {
    this.retainedScenes.delete(storyId)
    this.generationRounds.delete(storyId)
    await this.imageGenerator.release()
  }

  destroy(): void {
    this.imageGenerator.destroy()
  }
}
