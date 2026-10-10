import type {
  DreamFrame,
  DreamStory,
  PsychedelScene,
} from '@shared/brain/brainTypes'
import { brainLog, brainWarn } from './brainLog'
import type { PsychedelVectorizer } from './brainVectorQuality'
import type {
  ImageRenderMode,
  PsychedelImageGenerator,
} from './psychedelImageGenerator'
import { BrainImageWorkerClient } from './brainImageWorkerClient'
import { BRAIN_CONFIG } from '@shared/brain/brainConfig'
import type { BrainInferenceScheduler } from './brainThermalScheduler'
import { buildColorDirectionBlock } from './brainColorState'
import { deriveOneiricPhase, type OneiricPhase } from '@shared/brain/dreamRevisionCycle'

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

// Qualità/denoising per fase onirica (lettera Vice Consigliere §8-§9): Soglia
// e Condensazione sono le due immagini obbligatoriamente forti della storia
// (fondano il campo percettivo / manifestano il massimo carico immaginativo)
// e usano il profilo di risoluzione piena; Metamorfosi ed Eco tollerano
// instabilità e rarefazione come parte del proprio linguaggio e usano il
// profilo intermedio — mai una nomenclatura nuova, solo i 4 profili già
// implementati in `psychedelImageGenerator.ts`.
export function frameRenderModeForPhase(phase: OneiricPhase): ImageRenderMode {
  return phase === 'soglia' || phase === 'condensazione' ? 'high-quality' : 'enhanced'
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

export function downgradeModeUnderPressure(
  mode: ImageRenderMode,
): ImageRenderMode {
  if (mode === 'high-quality' || mode === 'enhanced') return 'standard'
  if (mode === 'standard') return 'interlude'
  return mode
}

export class PsychedelInfrastructureError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'PsychedelInfrastructureError'
  }
}

/**
 * Nome inglese della fase onirica per il prompt raster. Gli identificativi
 * interni sono italiani (`soglia`, `metamorfosi`, `condensazione`, `eco`) e
 * non devono entrare in un prompt inglese dentro CLIP — è lo stesso difetto
 * corretto il 2026-10-08 su `inferInvariant`. Qui si traduce solo il nome:
 * il brief di fase (`ONEIRIC_PHASE_BRIEF` in `coscienzaOnirica.ts`) resta
 * istruzione per il Visual Plan e **non** entra nel raster, perché è scritto
 * in lingua meta ("story", "moment", "invariant") che Stable Diffusion
 * proverebbe a disegnare.
 */
const ONEIRIC_PHASE_PROMPT_LABEL: Record<OneiricPhase, string> = {
  soglia: 'THRESHOLD',
  metamorfosi: 'METAMORPHOSIS',
  condensazione: 'CONDENSATION',
  eco: 'ECHO',
}

function frameVisualText(frame: DreamFrame): string {
  return frame.imagePrompt?.trim() || frame.description.trim() || frame.title.trim()
}

/**
 * Contesto visivo di un fotogramma: le frasi complete dei fotogrammi che lo
 * precedono e di cui è la continuazione (disp. Capo Supremo 2026-10-08).
 *
 *  - fotogramma 1 (soglia): nessun contesto. Non ha un precedente e non se
 *    ne inventa uno;
 *  - fotogrammi intermedi (metamorfosi, condensazione): il fotogramma
 *    immediatamente precedente;
 *  - ultimo fotogramma (eco): **prosegue dal secondo in avanti**, quindi
 *    riceve tutti gli intermedi in ordine cronologico — su quattro
 *    fotogrammi, il secondo e il terzo. Precisazione del Capo Supremo: l'eco
 *    NON torna al momento di soglia, prosegue la trasformazione. Il brief di
 *    fase del Visual Plan dice "return something recognizable from the
 *    threshold moment": quella resta un'indicazione al Visual Plan su come
 *    scrivere il momento, non la scelta del contesto raster.
 */
function previousFrameVisualContext(story: DreamStory, frame: DreamFrame): string {
  const index = story.frames.findIndex((candidate) => candidate.id === frame.id)
  if (index <= 0) return ''
  const isLastFrame = index === story.frames.length - 1
  // Intermedi dal secondo (indice 1) fino a quello che precede l'eco.
  const sources = isLastFrame && index >= 2
    ? story.frames.slice(1, index)
    : [story.frames[index - 1]]
  return sources
    .map((source) => (source ? frameVisualText(source) : ''))
    .filter(Boolean)
    .join(' ')
}

/**
 * Gerarchia del prompt raster (lettera Vice Consigliere §6-§7): momento
 * corrente (dal Visual Plan) + invariante stabile della storia. La palette
 * appartiene alla storia (§11): la seed key del Color Direction è
 * `story.id`, non più `story.id:frame.id`.
 *
 * RIPRISTINO CONTESTO VISIVO PER FOTOGRAMMA (disp. Capo Supremo 2026-10-08):
 * torna un secondo livello di contesto, `VISUAL CONTEXT`, con la frase
 * completa del fotogramma immediatamente precedente. Serve come memoria
 * visiva locale, non come nuova scena concorrente: PIANO-046 aveva rimosso
 * insieme due livelli — `Associated stimulus` e il residuo del fotogramma
 * precedente — e **solo il secondo rientra**. `Associated stimulus` resta
 * fuori per disposizione esplicita.
 *
 * FASE ONIRICA NEL RASTER (richiamo del Capo Supremo 2026-10-08): ogni
 * fotogramma resta una fase precisa — soglia, metamorfosi, condensazione,
 * eco (`deriveOneiricPhase`, filosofia.md §2) — e la fase è ora dichiarata
 * **anche nel prompt raster**, non solo nell'istruzione al Visual Plan.
 * Prima compariva in quattro posti (brief del Visual Plan, profilo di
 * qualità per fase, `dataset.framePhase`, ciclo di revisione) ma non qui.
 *
 * Perimetro dell'intervento: cambia soltanto la composizione di questo
 * prompt. Visual Plan, riscrittura in 18-30 parole, logica dell'invariante,
 * palette, qualità, seed, step, checkpoint e struttura della storia non sono
 * toccati.
 */
export function buildPsychedelImagePrompt(
  story: DreamStory,
  frame: DreamFrame,
  _attempt = 0,
  _mode: ImageRenderMode = 'standard',
): string {
  void _attempt
  void _mode
  const framePrompt = frameVisualText(frame)
  if (!framePrompt) {
    throw new Error(
      `prompt raster rifiutato: fotogramma "${frame.id}" della storia "${story.id}" non ha testo utilizzabile`,
    )
  }
  const frameIndex = story.frames.findIndex((candidate) => candidate.id === frame.id)
  // Fotogramma estraneo alla storia (indice -1): nessuna fase dichiarata,
  // non se ne indovina una.
  const phaseLabel =
    frameIndex >= 0
      ? ONEIRIC_PHASE_PROMPT_LABEL[deriveOneiricPhase(frameIndex, story.frames.length)]
      : ''
  const momentLabel = phaseLabel
    ? `CURRENT MOMENT ${frameIndex + 1}/${story.frames.length} — ${phaseLabel}`
    : 'CURRENT MOMENT'
  const promptParts = [`${momentLabel}: ${framePrompt}`]
  const visualContext = previousFrameVisualContext(story, frame)
  if (visualContext) {
    promptParts.push(`VISUAL CONTEXT: ${visualContext}`)
  }
  if (story.invariant?.trim()) {
    promptParts.push(`INVARIANT: ${story.invariant.trim()}`)
  }
  promptParts.push(buildColorDirectionBlock(story.id))
  return promptParts.join('\n\n')
}

export class Psichedel {
  private readonly retainedScenes = new Map<string, Map<string, PsychedelScene>>()
  private readonly generationRounds = new Map<string, number>()
  private highQualityAvailable = true

  constructor(
    private readonly imageGenerator: PsychedelImageGenerator = new BrainImageWorkerClient(),
    _vectorizer?: PsychedelVectorizer,
    private readonly onRaster?: (preview: PsychedelRasterPreview) => void,
    // Il ritorno di `active: true` può essere una Promise: il chiamante la
    // usa come semaforo — arma il passthrough visivo (flash/glitch/mix) e
    // attende che sia già in scena PRIMA che l'inferenza GPU parta
    // davvero, invece di mascherare uno stallo già iniziato (segnalato
    // dal Capo Supremo: il mix scattava sempre a lag già in corso).
    private readonly onImageGenerationState?: (active: boolean) => void | Promise<void>,
    private readonly inferenceScheduler?: BrainInferenceScheduler,
  ) {}

  private runInference<T>(task: () => Promise<T>): Promise<T> {
    return this.inferenceScheduler?.run(task) ?? task()
  }

  async generate(
    story: DreamStory,
    deadlineAt: number = Number.POSITIVE_INFINITY,
    onSceneReady?: (scene: PsychedelScene, frameIndex: number) => void,
    getPressureHint?: () => boolean,
  ): Promise<PsychedelScene[]> {
    const scenesByFrame = this.retainedScenes.get(story.id) ?? new Map<string, PsychedelScene>()
    this.retainedScenes.set(story.id, scenesByFrame)
    const baseSeed = hashSeed(`${story.title}|${story.synopsis}`)
    brainLog('psichedel', 'profili qualità selezionati per fase onirica', {
      storyId: story.id,
      phases: story.frames.map((_frame, index) =>
        deriveOneiricPhase(index, story.frames.length),
      ),
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
              renderMode: reusableScene.renderMode,
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
        const phase = deriveOneiricPhase(index, story.frames.length)
        const targetMode = frameRenderModeForPhase(phase)
        const progressiveLiveGeneration = Number.isFinite(deadlineAt)
        const baseScheduledMode: ImageRenderMode =
          targetMode === 'high-quality' && progressiveLiveGeneration
            ? 'enhanced'
            : targetMode === 'high-quality' && !this.highQualityAvailable
              ? 'enhanced'
              : targetMode
        const underPressure = getPressureHint?.() ?? false
        const scheduledMode: ImageRenderMode = underPressure
          ? downgradeModeUnderPressure(baseScheduledMode)
          : baseScheduledMode
        if (underPressure && scheduledMode !== baseScheduledMode) {
          brainLog('psichedel', 'step ridotti per pressione reale rilevata', {
            storyId: story.id,
            frameId: frame.id,
            from: baseScheduledMode,
            to: scheduledMode,
          })
        }
        if (targetMode === 'high-quality' && progressiveLiveGeneration) {
          brainLog(
            'psichedel',
            'alta qualità rinviata: completo prima tutti i fotogrammi della storia',
            {
              storyId: story.id,
              frameId: frame.id,
              phase,
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
          const baseRetryMode: ImageRenderMode =
            scheduledMode === 'high-quality' && !this.highQualityAvailable
              ? 'enhanced'
              : 'standard'
          const mode: ImageRenderMode =
            attempt === 0
              ? scheduledMode
              : underPressure
                ? downgradeModeUnderPressure(baseRetryMode)
                : baseRetryMode
          const prompt = buildPsychedelImagePrompt(story, frame, attempt, mode)
          try {
            brainLog('psichedel', `generazione raster ${index + 1}/${story.frames.length}`, {
              frameId: frame.id,
              title: frame.title,
              attempt: attempt + 1,
              mode,
              seed,
              prompt,
              promptPolicy:
                'testo narrativo AI mantenuto senza riscrittura; è ammesso un blocco Visual COLOR DIRECTION separato e identificabile',
            })
            const raster: Awaited<ReturnType<PsychedelImageGenerator['generate']>> =
              await this.runInference(async () => {
                const remainingMs = Number.isFinite(deadlineAt)
                  ? Math.max(5_000, deadlineAt - performance.now())
                  : BRAIN_CONFIG.imageGenerationTimeoutMs
                await this.onImageGenerationState?.(true)
                try {
                  return await this.imageGenerator.generate(
                    prompt,
                    seed,
                    mode,
                    remainingMs,
                    story.denoisingStepsOverride,
                  )
                } finally {
                  this.onImageGenerationState?.(false)
                }
              })
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
              renderMode: mode,
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
                  renderMode: reusableScene.renderMode,
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

  async releaseImageModel(): Promise<void> {
    await this.imageGenerator.release()
  }

  destroy(): void {
    this.imageGenerator.destroy()
  }
}
