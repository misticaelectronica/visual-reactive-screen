import type {
  BrainBufferFrame,
  DreamFrame,
  DreamStory,
  PsychedelScene,
} from '@shared/brain/brainTypes'
import { brainLog, brainWarn } from './brainLog'
import type { PsychedelVectorizer } from './brainVectorQuality'
import {
  ExplicitPsychedelImageGenerator,
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

const RASTER_FALLBACK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">' +
  '<rect width="640" height="360" fill="#050005"/></svg>'

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

export function selectLowQualityFrameIndices(
  frameCount: number,
  random: () => number = Math.random,
): Set<number> {
  const candidates = Array.from(
    { length: Math.max(0, frameCount - 1) },
    (_, index) => index + 1,
  )
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.min(
      index,
      Math.floor(Math.max(0, Math.min(0.999999, random())) * (index + 1)),
    )
    ;[candidates[index], candidates[randomIndex]] =
      [candidates[randomIndex], candidates[index]]
  }
  return new Set(candidates.slice(0, Math.min(2, candidates.length)))
}

function hashSeed(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function isPsychedelInfrastructureError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /webgpu|webassembly|wasm|backend|tokenizer|caricamento del modello|verifica webgpu|fetch|download modello|modello locale assente/i.test(message)
}

export function isPsychedelMemoryPressureError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /out of memory|memory limit|memory allocation|failed to allocate|bad_alloc|tile memory|gpu device lost/i.test(
    message,
  )
}

export function abstractPsychedelCue(text: string): string {
  const translations: Array<[RegExp, string]> = [
    [
      /(?<!\p{L})(?:fabbrica|fabbriche|stabilimento|stabilimenti|factory|factories|industrial plants?)(?!\p{L})/giu,
      'industrial matter',
    ],
    [
      /(?<!\p{L})(?:casa|case|edificio|edifici|palazzo|palazzi|grattacielo|grattacieli|houses?|buildings?|skyscrapers?)(?!\p{L})/giu,
      'enclosed living forms',
    ],
    [
      /(?<!\p{L})(?:città|villaggio|villaggi|metropoli|cities|city|villages?|towns?)(?!\p{L})/giu,
      'collective field',
    ],
    [
      /(?<!\p{L})(?:architettura|facciata|facciate|stanza|stanze|interno|interni|architecture|facades?|rooms?|interiors?)(?!\p{L})/giu,
      'layered surface',
    ],
    [
      /(?<!\p{L})(?:strada|strade|vicolo|vicoli|piazza|piazze|streets?|roads?|alleys|squares?)(?!\p{L})/giu,
      'flowing paths',
    ],
    [
      /(?<!\p{L})(?:serra|serre|greenhouses?)(?!\p{L})/giu,
      'translucent habitat',
    ],
    [
      /(?<!\p{L})(?:ciminiera|ciminiere|chimneys?|smokestacks?)(?!\p{L})/giu,
      'vertical traces',
    ],
    [
      /(?<!\p{L})(?:macchina|macchine|machinery|machines?)(?!\p{L})/giu,
      'mechanical organism',
    ],
    [
      /(?<!\p{L})(?:biblioteca|biblioteche|library|libraries)(?!\p{L})/giu,
      'archive of floating memory symbols',
    ],
    [
      /(?<!\p{L})(?:libro|libri|book|books)(?!\p{L})/giu,
      'memory fragments',
    ],
    [
      /(?<!\p{L})(?:civiltà|civilization|civilizations)(?!\p{L})/giu,
      'ancient collective trace',
    ],
  ]
  return translations
    .reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), text)
    .replace(/\s+/g, ' ')
    .trim()
}

export const PSYCHEDEL_STYLE_DIRECTIONS = [
  'Narrative realism with one recognizable organic subject in a coherent landscape.',
  'Precise figurative realism with restrained details and a readable central action.',
  'Solid objects, lucid physical space, long shadows and quiet human tension.',
  'Naturalistic study built around one identifiable organism or physical object.',
  'Cinematic realism with a clear foreground subject, middle ground and distant depth.',
] as const

const FIGURE_TERMS =
  /\b(?:lei|lui|persona|personaggio|protagonista|figura|donna|uomo|ragazza|ragazzo|bambina|bambino|custode|operaia|operaio|sciamano|sciamana|linguista|pensatore|pensatori|viaggiatore|viaggiatrice|abitante|abitanti|creatura|aliena|alieno|presenza|corpo|volto|mani|essere|she|her|he|him|human|person|character|protagonist|figure|woman|man|girl|boy|guardian|worker|shaman|linguist|thinker|thinkers|traveler|inhabitant|inhabitants|creature|alien|presence|body|face|hands|being)\b/iu

const UNUSUAL_FIGURE_TERMS =
  /\b(?:creatura|aliena|alieno|presenza|fantasma|fantasmi|spettro|spettri|ombra|ombre|ibrido|mutante|essere non umano|creature|alien|presence|phantom|phantoms|ghost|ghosts|specter|specters|shadow|shadows|hybrid|mutant|nonhuman being)\b/iu

const NON_FIGURE_SENTENCE_STARTS = new Set([
  'Il',
  'La',
  'Lo',
  'Un',
  'Una',
  'Nel',
  'Nella',
  'Quando',
  'Dopo',
  'Prima',
  'Ogni',
  'Due',
  'Segnale',
  'Bosco',
  'Luce',
  'Materia',
  'Memoria',
  'Tempo',
  'Rito',
  'Forma',
  'Radici',
  'Alberi',
])

export function hasNonTrivialFigure(text: string): boolean {
  if (FIGURE_TERMS.test(text)) return true
  const firstWord = text.trim().match(/^\p{Lu}[\p{L}'’-]*/u)?.[0]
  return !!firstWord && firstWord.length >= 3 && !NON_FIGURE_SENTENCE_STARTS.has(firstWord)
}

export function hasUnusualFigure(text: string): boolean {
  return UNUSUAL_FIGURE_TERMS.test(text)
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
  _attempt = 0,
  _mode: ImageRenderMode = 'standard',
): string {
  void _attempt
  void _mode
  const framePrompt = frame.imagePrompt?.trim() || frame.description.trim()
  return story.mainArgument?.trim()
    ? `${framePrompt}\n\nMain argument: ${story.mainArgument.trim()}`
    : framePrompt
}

export class Psichedel {
  private readonly retainedScenes = new Map<string, Map<string, PsychedelScene>>()
  private readonly generationRounds = new Map<string, number>()
  private highQualityAvailable = true

  constructor(
    private readonly imageGenerator: PsychedelImageGenerator = new ExplicitPsychedelImageGenerator(),
    _vectorizer?: PsychedelVectorizer,
    private readonly onRaster?: (preview: PsychedelRasterPreview) => void,
    private readonly renderScheduler: HighQualityRenderScheduler = new HighQualityRenderScheduler(),
    private readonly onImageGenerationState?: (active: boolean) => void,
  ) {}

  async generate(
    story: DreamStory,
    deadlineAt: number = Number.POSITIVE_INFINITY,
    onSceneReady?: (scene: PsychedelScene, frameIndex: number) => void,
  ): Promise<PsychedelScene[]> {
    const scenesByFrame = this.retainedScenes.get(story.id) ?? new Map<string, PsychedelScene>()
    this.retainedScenes.set(story.id, scenesByFrame)
    const baseSeed = hashSeed(`${story.title}|${story.synopsis}`)
    const lowQualityFrameIndices = selectLowQualityFrameIndices(story.frames.length)
    brainLog('psichedel', 'profili qualità selezionati per la storia', {
      storyId: story.id,
      lowQualityFrames: [...lowQualityFrameIndices].map((index) => index + 1),
      fastMode: 'standard',
      detailedMode: 'enhanced',
    })
    const generationRound = this.generationRounds.get(story.id) ?? 0
    this.generationRounds.set(story.id, generationRound + 1)
    brainLog('psichedel', 'pipeline raster AI → Canvas 2D avviata', {
      storyId: story.id,
      model: BRAIN_CONFIG.imageModelId,
      renderer: 'Canvas 2D raster a strisce',
      frames: story.frames.length,
      baseSeed,
      generationRound: generationRound + 1,
    })

    try {
      for (let index = 0; index < story.frames.length; index++) {
        const frame = story.frames[index]
        if (scenesByFrame.has(frame.id)) {
          brainLog('psichedel', `fotogramma raster ${index + 1} già pronto; riuso risultato`)
          continue
        }

        if (performance.now() >= deadlineAt) {
          const reusableScene = [...scenesByFrame.values()].at(-1)
          if (reusableScene) {
            const deadlineScene: PsychedelScene = {
              frameId: frame.id,
              description: `${frame.title}: ${frame.description}`,
              svg: reusableScene.svg,
              raster: reusableScene.raster,
            }
            scenesByFrame.set(frame.id, deadlineScene)
            onSceneReady?.(deadlineScene, index)
            brainWarn(
              'psichedel',
              'deadline produzione raggiunta; riuso un fotogramma raster già pronto',
              {
                storyId: story.id,
                frameId: frame.id,
                deadlineAt,
                generatedFrames: scenesByFrame.size - 1,
              },
            )
            continue
          }
        }

        let scene: PsychedelScene | null = null
        let lastError: unknown = null
        const requestedMode = this.renderScheduler.next()
        const progressiveLiveGeneration = Number.isFinite(deadlineAt)
        const lowQualityFrame = lowQualityFrameIndices.has(index)
        const scheduledMode: ImageRenderMode =
          lowQualityFrame
            ? 'standard'
            : progressiveLiveGeneration
              ? 'enhanced'
              : requestedMode === 'high-quality' && !this.highQualityAvailable
                ? 'enhanced'
                : requestedMode
        if (requestedMode === 'high-quality' && progressiveLiveGeneration) {
          brainLog(
            'psichedel',
            'alta qualità rinviata: completo prima tutti i fotogrammi della storia',
            {
              storyId: story.id,
              frameId: frame.id,
              deadlineAt,
            },
          )
        }
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
              promptPolicy: 'testo AI tradotto letteralmente; nessuna aggiunta o riscrittura',
            })
            const remainingMs = Number.isFinite(deadlineAt)
              ? Math.max(5_000, deadlineAt - performance.now())
              : BRAIN_CONFIG.imageGenerationTimeoutMs
            this.onImageGenerationState?.(true)
            let raster: Awaited<ReturnType<PsychedelImageGenerator['generate']>>
            try {
              raster = await this.imageGenerator.generate(
                prompt,
                seed,
                mode,
                remainingMs,
              )
            } finally {
              this.onImageGenerationState?.(false)
            }
            this.onRaster?.({
              storyId: story.id,
              frameId: frame.id,
              frameTitle: frame.title,
              dreamMeaning: prompt,
              attempt: attempt + 1,
              mode,
              model:
                raster.model ??
                BRAIN_CONFIG.imageModelId,
              blob: raster.blob,
            })
            brainLog('psichedel', `raster pronta ${index + 1}/${story.frames.length}`, {
              model: raster.model,
              mode,
              rasterBytes: raster.blob.size,
              rasterDurationMs: Math.round(raster.durationMs),
            })
            scene = {
              frameId: frame.id,
              description: `${frame.title}: ${frame.description}`,
              svg: RASTER_FALLBACK_SVG,
              raster: raster.blob,
            }
            brainLog('psichedel', `fotogramma raster ${index + 1} pronto per Canvas 2D`, {
              rasterBytes: raster.blob.size,
              rasterDurationMs: Math.round(raster.durationMs),
            })
          } catch (error) {
            lastError = error
            brainWarn('psichedel', `fotogramma ${index + 1} tentativo ${attempt + 1} rifiutato`, {
              error,
            })
            if (performance.now() >= deadlineAt) {
              const reusableScene = [...scenesByFrame.values()].at(-1)
              if (reusableScene) {
                scene = {
                  frameId: frame.id,
                  description: `${frame.title}: ${frame.description}`,
                  svg: reusableScene.svg,
                  raster: reusableScene.raster,
                }
                brainWarn(
                  'psichedel',
                  'deadline raggiunta durante l’inferenza; completo il fotogramma senza un secondo timeout',
                  {
                    storyId: story.id,
                    frameId: frame.id,
                    generatedFrames: scenesByFrame.size,
                  },
                )
                break
              }
            }
            if (mode === 'high-quality' && isPsychedelMemoryPressureError(error)) {
              this.highQualityAvailable = false
              brainWarn(
                'psichedel',
                'profilo alta qualità disattivato per questa sessione; continuo con un profilo ridotto dello stesso checkpoint Explicit',
                {
                  error,
                  reason:
                    'il profilo a 24 step ha esaurito o non può allocare la memoria; il checkpoint Explicit resta quello standard',
                },
              )
              continue
            }
            if (mode === 'high-quality') {
              brainWarn(
                'psichedel',
                'profilo alta qualità fallito; nuovo tentativo standard senza disattivarlo',
                { error },
              )
              continue
            }
            if (isPsychedelInfrastructureError(error)) {
              throw new PsychedelInfrastructureError(
                error instanceof Error ? error.message : String(error),
                { cause: error },
              )
            }
          }
        }

        if (!scene) {
          throw new Error(
            `Psichedel non ha prodotto una raster valida per il fotogramma ${index + 1}: ${
              lastError instanceof Error ? lastError.message : String(lastError)
            }`,
          )
        }
        scenesByFrame.set(frame.id, scene)
        onSceneReady?.(scene, index)
      }

      const scenes = story.frames.map((frame) => scenesByFrame.get(frame.id))
      if (scenes.some((scene) => !scene)) {
        throw new Error('Psichedel ha perso uno o più fotogrammi raster pronti')
      }
      this.retainedScenes.delete(story.id)
      this.generationRounds.delete(story.id)
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
  }

  async generateLowQualityBufferFrame(
    story: DreamStory,
  ): Promise<BrainBufferFrame> {
    const sourceIndex = Math.floor(Math.random() * story.frames.length)
    const sourceFrame = story.frames[sourceIndex] ?? story.frames[0]
    if (!sourceFrame) {
      throw new Error('Psichedel non ha un fotogramma sorgente per il buffer')
    }
    const associationType = Math.random() < 0.5 ? 'emotivo' : 'implicito'
    const associationForLog =
      story.bridge?.trim() ||
      story.englishBridge?.trim() ||
      sourceFrame.description
    const associationForImage =
      story.englishBridge?.trim() ||
      story.bridge?.trim() ||
      sourceFrame.imagePrompt?.trim() ||
      sourceFrame.description
    const sourceImagePrompt =
      sourceFrame.imagePrompt?.trim() || sourceFrame.description.trim()
    const frame: DreamFrame = {
      ...sourceFrame,
      id: `${story.id}-buffer`,
      title: 'Collegamento associativo',
      description: `Collegamento associativo ${associationType}: ${associationForLog}`,
      visualIntent:
        associationType === 'emotivo'
          ? `Immagine-ponte emotiva verso la storia successiva, in continuità con: ${sourceFrame.visualIntent}`
          : `Immagine-ponte implicita verso la storia successiva, in continuità con: ${sourceFrame.visualIntent}`,
      imagePrompt:
        associationType === 'emotivo'
          ? `${sourceImagePrompt}. Emotional associative bridge: ${associationForImage}`
          : `${sourceImagePrompt}. Implicit associative bridge: ${associationForImage}`,
      energy: Math.min(0.56, sourceFrame.energy),
    }
    const prompt = buildPsychedelImagePrompt(story, frame, 0, 'interlude')
    const seed = hashSeed(
      `${story.id}|buffer|${sourceIndex}|${Math.random()}`,
    )
    brainLog('psichedel', 'generazione collegamento associativo bassa qualità dopo il quarto fotogramma', {
      storyId: story.id,
      frameId: frame.id,
      sourceFrameId: sourceFrame.id,
      associationType,
      association: associationForLog,
      mode: 'interlude',
      seed,
      prompt,
    })
    this.onImageGenerationState?.(true)
    try {
      const raster = await this.imageGenerator.generate(
        prompt,
        seed,
        'interlude',
        BRAIN_CONFIG.imageGenerationTimeoutMs,
      )
      this.onRaster?.({
        storyId: story.id,
        frameId: frame.id,
        frameTitle: frame.title,
        dreamMeaning: prompt,
        attempt: 1,
        mode: 'interlude',
        model: raster.model ?? BRAIN_CONFIG.imageModelId,
        blob: raster.blob,
      })
      const scene: PsychedelScene = {
        frameId: frame.id,
        description: `${frame.title}: ${frame.description}`,
        svg: RASTER_FALLBACK_SVG,
        raster: raster.blob,
      }
      brainLog('psichedel', 'collegamento associativo pronto per il ricircolo casuale', {
        storyId: story.id,
        frameId: frame.id,
        rasterDurationMs: Math.round(raster.durationMs),
        renderer: 'Canvas 2D raster a strisce',
      })
      return { frame, scene, associationType }
    } finally {
      this.onImageGenerationState?.(false)
    }
  }

  async releaseImageModel(): Promise<void> {
    await this.imageGenerator.release()
  }

  destroy(): void {
    this.imageGenerator.destroy()
  }
}
