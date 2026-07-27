import { BRAIN_CONFIG } from '@shared/brain/brainConfig'
import type {
  BrainProduction,
  BrainStatus,
} from '@shared/brain/brainTypes'
import type { BandEnergies, VisualStatePayload } from '@shared/types'
import { BrainAiClient } from './brainAiClient'
import { CoscienzaOnirica, type DreamStoryMemory } from './coscienzaOnirica'
import {
  Psichedel,
  PsychedelInfrastructureError,
  type PsychedelRasterPreview,
} from './psichedel'
import { sampleBrainPhrases, sampleContinuityPhrase } from './brainPhrases'
import { createBrainSvgScene, type BrainSvgController } from './brainSvgScene'
import { BrainRhythmClock } from './brainRhythm'
import { brainLog, brainWarn } from './brainLog'
import {
  createBrainInterlude,
  interludePayload,
  selectBrainInterlude,
  type BrainInterludeController,
  type BrainInterludeSpec,
} from './brainInterlude'

const SILENT_BANDS: BandEnergies = { low: 0, lowMid: 0, mid: 0, high: 0 }

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function smootherstep(value: number): number {
  const x = clamp01(value)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

export function createBrainController(container: HTMLElement) {
  brainLog('pipeline', 'inizializzazione Brain', {
    pipelineRevision: BRAIN_CONFIG.pipelineRevision,
  })
  const root = document.createElement('div')
  Object.assign(root.style, {
    position: 'absolute',
    inset: '0',
    overflow: 'hidden',
    pointerEvents: 'none',
  })
  const svgHost = document.createElement('div')
  Object.assign(svgHost.style, { position: 'absolute', inset: '0', zIndex: '1' })
  const interludeHost = document.createElement('div')
  Object.assign(interludeHost.style, {
    position: 'absolute',
    inset: '0',
    zIndex: '2',
    overflow: 'hidden',
  })
  const storyElement = document.createElement('div')
  Object.assign(storyElement.style, {
    position: 'absolute',
    left: '0',
    bottom: '14px',
    zIndex: '3',
    width: 'min(430px, 34vw)',
    maxHeight: '62vh',
    boxSizing: 'border-box',
    padding: '11px 13px 12px 14px',
    overflow: 'hidden',
    color: '#73ef8a',
    background:
      'repeating-linear-gradient(0deg, rgba(92,255,122,0.035) 0, rgba(92,255,122,0.035) 1px, transparent 1px, transparent 4px), rgba(2, 13, 6, 0.72)',
    border: '1px solid rgba(87, 221, 110, 0.24)',
    borderLeft: '0',
    borderRadius: '0 2px 2px 0',
    boxShadow:
      '0 0 12px rgba(29,150,53,0.08), inset 0 0 18px rgba(31,111,48,0.08)',
    fontFamily: '"SFMono-Regular", "IBM Plex Mono", "Courier New", monospace',
    fontSize: 'clamp(11px, 0.7vw, 13px)',
    fontWeight: '500',
    lineHeight: '1.42',
    letterSpacing: '0.035em',
    opacity: '0.88',
    whiteSpace: 'pre-line',
    textShadow: '0 0 4px rgba(84,255,115,0.28)',
  })
  const statusElement = document.createElement('div')
  Object.assign(statusElement.style, {
    position: 'absolute',
    right: 'calc(min(180px, 14vw) + 10px)',
    bottom: '14px',
    zIndex: '3',
    color: '#e7dff1',
    fontFamily: 'monospace',
    fontSize: '10px',
    lineHeight: '1.35',
    letterSpacing: '0.08em',
    textTransform: 'lowercase',
    opacity: String(BRAIN_CONFIG.statusOpacity),
    textAlign: 'right',
    whiteSpace: 'pre-line',
  })
  const rasterMonitor = document.createElement('div')
  Object.assign(rasterMonitor.style, {
    position: 'absolute',
    top: '12px',
    right: '0',
    zIndex: '3',
    width: 'min(180px, 14vw)',
    maxHeight: 'calc(100vh - 24px)',
    boxSizing: 'border-box',
    padding: '9px 8px 10px',
    overflow: 'hidden',
    color: '#6bea83',
    background:
      'repeating-linear-gradient(0deg, rgba(88,255,115,0.025) 0, rgba(88,255,115,0.025) 1px, transparent 1px, transparent 4px), rgba(2,13,6,0.68)',
    border: '1px solid rgba(87,221,110,0.22)',
    borderRight: '0',
    borderRadius: '2px 0 0 2px',
    fontFamily: '"SFMono-Regular", "IBM Plex Mono", "Courier New", monospace',
    fontSize: '9px',
    lineHeight: '1.3',
    letterSpacing: '0.045em',
    opacity: '0.78',
  })
  const rasterHeader = document.createElement('div')
  rasterHeader.textContent = 'PSICHEDEL // RAW BUFFER'
  Object.assign(rasterHeader.style, {
    marginBottom: '7px',
    paddingBottom: '5px',
    borderBottom: '1px solid rgba(87,221,110,0.22)',
  })
  const rasterList = document.createElement('div')
  Object.assign(rasterList.style, {
    display: 'grid',
    gap: '7px',
  })
  rasterMonitor.append(rasterHeader, rasterList)
  root.append(svgHost, interludeHost, storyElement, rasterMonitor, statusElement)
  container.appendChild(root)

  const rasterUrls = new Set<string>()
  const showRawRaster = (preview: PsychedelRasterPreview) => {
    if (destroyed) return
    const url = URL.createObjectURL(preview.blob)
    rasterUrls.add(url)
    const entry = document.createElement('div')
    entry.dataset.url = url
    Object.assign(entry.style, {
      padding: '4px',
      background: 'rgba(1,8,3,0.72)',
      border: '1px solid rgba(92,238,115,0.2)',
    })
    const lens = document.createElement('div')
    Object.assign(lens.style, {
      position: 'relative',
      width: '100%',
      aspectRatio: '1',
      overflow: 'hidden',
      marginBottom: '4px',
      borderRadius: '44% 48% 46% 42% / 34% 38% 46% 42%',
      background: '#031008',
      boxShadow:
        'inset 0 0 16px rgba(0,0,0,0.9), inset 0 0 5px rgba(129,255,159,0.36), 0 0 7px rgba(73,225,107,0.12)',
    })
    const image = document.createElement('img')
    image.src = url
    image.alt = `Raster grezzo ${preview.frameTitle}`
    Object.assign(image.style, {
      display: 'block',
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      filter: 'saturate(0.82) contrast(1.12) blur(0.45px)',
      transform: 'scale(1.055)',
    })
    const dreamLensOverlay = document.createElement('div')
    Object.assign(dreamLensOverlay.style, {
      position: 'absolute',
      inset: '0',
      background:
        'radial-gradient(ellipse at 46% 42%, transparent 0 34%, rgba(102,255,139,0.055) 48%, rgba(2,18,8,0.38) 72%, rgba(0,5,2,0.88) 100%), radial-gradient(ellipse at 32% 24%, rgba(215,255,226,0.2) 0 2%, transparent 11%)',
      boxShadow:
        'inset 10px 4px 17px rgba(168,255,190,0.08), inset -12px -8px 22px rgba(0,0,0,0.72)',
      backdropFilter: 'blur(0.65px)',
    })
    const bottleRings = document.createElement('div')
    Object.assign(bottleRings.style, {
      position: 'absolute',
      inset: '5%',
      borderRadius: '50%',
      border: '1px solid rgba(137,255,163,0.15)',
      boxShadow:
        '0 0 0 4px rgba(5,30,12,0.16), inset 0 0 9px rgba(159,255,180,0.08)',
    })
    lens.append(image, dreamLensOverlay, bottleRings)
    const label = document.createElement('div')
    const qualityLabel =
      preview.mode === 'high-quality'
        ? 'HQ'
        : preview.mode === 'enhanced'
          ? 'ENHANCED'
          : 'STD'
    label.textContent = `${preview.frameId.toUpperCase()} // TRY_${preview.attempt} // ${qualityLabel}\n${preview.model}`
    Object.assign(label.style, {
      whiteSpace: 'pre-line',
      fontSize: '8px',
      opacity: '0.62',
      marginBottom: '4px',
    })
    const dreamCaption = document.createElement('div')
    const compactMeaning =
      preview.dreamMeaning.length > 150
        ? `${preview.dreamMeaning.slice(0, 147).trimEnd()}…`
        : preview.dreamMeaning
    dreamCaption.textContent = `DREAM > ${preview.frameTitle.toLocaleUpperCase()}\n${compactMeaning}`
    Object.assign(dreamCaption.style, {
      whiteSpace: 'pre-line',
      color: '#88f19a',
      fontSize: '8.5px',
      lineHeight: '1.35',
      letterSpacing: '0.025em',
      textShadow: '0 0 3px rgba(84,255,115,0.24)',
    })
    entry.append(lens, label, dreamCaption)
    rasterList.appendChild(entry)
    while (rasterList.children.length > 5) {
      const oldest = rasterList.firstElementChild as HTMLElement | null
      const oldestUrl = oldest?.dataset.url
      if (oldestUrl) {
        URL.revokeObjectURL(oldestUrl)
        rasterUrls.delete(oldestUrl)
      }
      oldest?.remove()
    }
  }

  let destroyed = false
  const psychedel = new Psichedel(undefined, undefined, showRawRaster)
  const rhythmClock = new BrainRhythmClock()
  let storyAi: BrainAiClient | null = null
  let status: BrainStatus | null = null
  let currentProduction: BrainProduction | null = null
  let nextProduction: BrainProduction | null = null
  let pendingStory: BrainProduction['story'] | null = null
  const storyQueue: BrainProduction['story'][] = []
  let junctionActive = false
  let junctionStartedAt = 0
  let interludeController: BrainInterludeController | null = null
  let interludeSpec: BrainInterludeSpec | null = null
  let previousInterludeSpec: BrainInterludeSpec | null = null
  let generating = false
  let frameIndex = 0
  let frameStartedAt = 0
  let transitionStartedAt = 0
  let currentSvg: BrainSvgController | null = null
  let previousSvg: BrainSvgController | null = null
  let latestPayload: VisualStatePayload | null = null
  let recentPhrases: string[] = []
  let recentStories: DreamStoryMemory[] = []
  const generationFailures = new Map<string, number>()
  let retryAttempt = 0
  let rafId = 0
  let retryTimerId = 0

  const scheduleGenerationRetry = (infrastructureFailure: boolean) => {
    retryAttempt += 1
    const delayMs = Math.min(
      BRAIN_CONFIG.retryMaximumDelayMs,
      BRAIN_CONFIG.retryInitialDelayMs * 2 ** Math.min(6, retryAttempt - 1),
    )
    window.clearTimeout(retryTimerId)
    retryTimerId = window.setTimeout(() => {
      retryTimerId = 0
      void generateNext()
    }, delayMs)
    brainWarn('pipeline', 'ciclo infinito: nuova generazione programmata', {
      retryAttempt,
      delayMs,
      infrastructureFailure,
      retainedStoryId: pendingStory?.id ?? null,
      queuedStories: storyQueue.length,
    })
    statusElement.textContent = currentProduction
      ? `brain · rendering\nretry generation in ${Math.ceil(delayMs / 1_000)}s`
      : `brain · generation\nretry in ${Math.ceil(delayMs / 1_000)}s`
  }

  const setStatus = (nextStatus: BrainStatus) => {
    if (status === nextStatus) return
    status = nextStatus
    statusElement.textContent =
      status === 'generation'
        ? 'brain · generation\nwaiting for story…'
        : status === 'rendering+generation'
          ? 'brain · rendering + generation'
          : 'brain · rendering'
    brainLog('status', nextStatus)
  }

  const dreamMonitorText = (
    story: BrainProduction['story'],
    frame?: BrainProduction['story']['frames'][number],
    frameNumber?: number,
  ) =>
    [
      'COSCIENZA_ONIRICA // DREAM STREAM',
      `STORY_ID > ${story.id}`,
      `SUBJECT  > ${story.title.toLocaleUpperCase()}`,
      '----------------------------------------',
      story.synopsis,
      ...(story.continuityPhrase
        ? ['', `CARRY_OVER > ${story.continuityPhrase}`]
        : []),
      ...(frame
        ? [
            '',
            `FRAME_${String((frameNumber ?? 0) + 1).padStart(2, '0')} > ${frame.title.toLocaleUpperCase()}`,
            frame.description,
          ]
        : []),
      '',
      '█ SIGNAL ACTIVE',
    ].join('\n')

  const destroyPreviousLayers = () => {
    previousSvg?.destroy()
    previousSvg = null
  }

  const destroyInterlude = () => {
    interludeController?.destroy()
    interludeController = null
    interludeSpec = null
    interludeHost.replaceChildren()
  }

  const applyFrame = (index: number) => {
    if (!currentProduction) return
    const scene = currentProduction.scenes[index]
    if (!scene) return
    const hadVisibleFrame = currentSvg !== null
    destroyPreviousLayers()
    previousSvg = currentSvg
    const frame = currentProduction.story.frames[index]
    currentSvg = createBrainSvgScene(
      svgHost,
      scene,
      currentProduction.story.palette,
      {
        frameEnergy: frame?.energy ?? 0.5,
        frameIndex: index,
        frameCount: currentProduction.story.frames.length,
      },
    )
    currentSvg.setOpacity(1)
    frameIndex = index
    frameStartedAt = performance.now()
    transitionStartedAt = hadVisibleFrame
      ? frameStartedAt
      : frameStartedAt - BRAIN_CONFIG.transitionDurationMs
    if (!hadVisibleFrame) {
      currentSvg.setOpacity(1)
    } else {
      currentSvg.setTransition(0, 'enter', previousSvg?.getMorphShapes())
      previousSvg?.setOpacity(0)
    }
    storyElement.textContent = dreamMonitorText(currentProduction.story, frame, index)
    brainLog('render', `fotogramma ${index + 1}/${currentProduction.story.frames.length}`, {
      storyId: currentProduction.story.id,
      storyTitle: currentProduction.story.title,
      frameTitle: frame?.title,
      description: frame?.description,
      visualIntent: frame?.visualIntent,
      durationMs: frame?.durationMs,
      image: {
        description: scene.description,
        svgLength: scene.svg.length,
      },
    })
  }

  const startInterstoryJunction = () => {
    if (!currentProduction || junctionActive) return
    const incomingStory =
      nextProduction?.story ??
      pendingStory ??
      storyQueue[0] ??
      null
    destroyInterlude()
    interludeSpec = selectBrainInterlude(previousInterludeSpec)
    previousInterludeSpec = interludeSpec
    interludeController = createBrainInterlude(interludeHost, interludeSpec)
    interludeController.setOpacity?.(1)
    if (latestPayload) {
      interludeController.updateState(interludePayload(latestPayload, interludeSpec))
    }
    currentSvg?.setOpacity(0)
    previousSvg?.setOpacity(0)
    junctionActive = true
    junctionStartedAt = performance.now()
    storyElement.textContent = incomingStory
      ? [
          'BRAIN // INTERSTORY LINK',
          `FROM > ${currentProduction.story.title.toLocaleUpperCase()}`,
          `TO   > ${incomingStory.title.toLocaleUpperCase()}`,
          `MORPH > ${interludeSpec.algorithm.toLocaleUpperCase()} / ${interludeSpec.presetId.toLocaleUpperCase()}`,
          '----------------------------------------',
          `CARRY_OVER > ${incomingStory.continuityPhrase ?? 'origine autonoma'}`,
          '',
          incomingStory.synopsis,
          '',
          '◉ NATIVE MORPHING ACTIVE // IMAGE SYNTHESIS',
        ].join('\n')
      : [
          'BRAIN // INTERSTORY LINK',
          `FROM > ${currentProduction.story.title.toLocaleUpperCase()}`,
          'TO   > DREAM BUFFER',
          `MORPH > ${interludeSpec.algorithm.toLocaleUpperCase()} / ${interludeSpec.presetId.toLocaleUpperCase()}`,
          '----------------------------------------',
          'Nuove associazioni narrative in elaborazione.',
          '',
          '◉ NATIVE MORPHING ACTIVE // GENERATION',
        ].join('\n')
    brainLog('pipeline', 'morphing nativo casuale fra storie attivato', {
      completedStoryId: currentProduction.story.id,
      incomingStoryId: incomingStory?.id ?? null,
      incomingStoryTitle: incomingStory?.title ?? null,
      algorithm: interludeSpec.algorithm,
      presetId: interludeSpec.presetId,
    })
  }

  const startProduction = (production: BrainProduction) => {
    const completedInterlude = interludeSpec
    destroyInterlude()
    brainLog('pipeline', 'inizio rendering storia', {
      id: production.story.id,
      title: production.story.title,
      synopsis: production.story.synopsis,
      palette: production.story.palette,
      frameCount: production.story.frames.length,
      completedInterlude,
    })
    currentProduction = production
    junctionActive = false
    storyElement.textContent = dreamMonitorText(production.story)
    nextProduction = null
    applyFrame(0)
    window.setTimeout(() => void generateNext(), 0)
  }

  const generateStoryBatch = async (targetCount: number) => {
    const missingCount = Math.max(0, targetCount - storyQueue.length)
    if (missingCount === 0) return
    const maximumAttempts = Math.max(missingCount, missingCount * 2)
    let attempts = 0
    brainLog('pipeline', 'ciclo associazioni narrative avviato', {
      requestedStories: missingCount,
      queuedStories: storyQueue.length,
    })
    storyAi = new BrainAiClient()
    try {
      while (
        !destroyed &&
        storyQueue.length < targetCount &&
        attempts < maximumAttempts
      ) {
        attempts += 1
        const previousStory = recentStories.at(-1) ?? null
        const continuityPhrase = previousStory
          ? sampleContinuityPhrase(previousStory.synopsis)
          : null
        const randomPhraseCount = Math.max(
          1,
          BRAIN_CONFIG.phraseSampleCount - (continuityPhrase ? 1 : 0),
        )
        const randomPhrases = sampleBrainPhrases(randomPhraseCount, recentPhrases)
        const phrases = continuityPhrase
          ? [...randomPhrases, continuityPhrase]
          : randomPhrases
        recentPhrases = [...recentPhrases, ...randomPhrases].slice(
          -BRAIN_CONFIG.phraseMemoryCount,
        )
        brainLog('pipeline', 'nuova associazione casuale inviata a CoscienzaOnirica', {
          batchAttempt: attempts,
          requested: BRAIN_CONFIG.phraseSampleCount,
          randomPhrases,
          continuityPhrase,
          previousStoryId: previousStory?.title ?? null,
          phrases,
        })
        try {
          const story = await new CoscienzaOnirica(storyAi).generate(phrases, recentStories)
          story.continuityPhrase = continuityPhrase
          storyQueue.push(story)
          recentStories = [
            ...recentStories,
            {
              title: story.title,
              synopsis: story.synopsis,
            },
          ].slice(-BRAIN_CONFIG.storyMemoryCount)
          brainLog('pipeline', 'nuova storia inserita nel buffer narrativo', {
            id: story.id,
            title: story.title,
            synopsis: story.synopsis,
            sourcePhrases: story.sourcePhrases,
            queueLength: storyQueue.length,
            targetCount,
          })
          if (!currentProduction && storyQueue.length === 1) {
            storyElement.textContent = `${dreamMonitorText(story)}\nIMAGE SYNTHESIS > QUEUED`
          }
        } catch (error) {
          if (destroyed) throw error
          brainWarn('pipeline', 'associazione narrativa rifiutata; provo nuove frasi', {
            batchAttempt: attempts,
            error,
          })
        }
      }
    } finally {
      storyAi.destroy()
      storyAi = null
      brainLog('pipeline', 'ciclo associazioni narrative completato; modello rilasciato', {
        generatedStories: storyQueue.length,
        targetCount,
        attempts,
      })
      await new Promise<void>((resolve) => window.setTimeout(resolve, 100))
    }
    if (storyQueue.length === 0) {
      throw new Error('CoscienzaOnirica non ha inserito storie nel buffer narrativo')
    }
  }

  const generateNext = async () => {
    if (destroyed || generating || nextProduction) return
    window.clearTimeout(retryTimerId)
    retryTimerId = 0
    generating = true
    setStatus(currentProduction ? 'rendering+generation' : 'generation')
    try {
      let story = pendingStory
      if (!story) {
        await generateStoryBatch(
          currentProduction ? BRAIN_CONFIG.storyQueueTarget : 1,
        )
        story = storyQueue.shift() ?? null
        if (!story) throw new Error('Buffer narrativo vuoto dopo la generazione')
        pendingStory = story
        brainLog('pipeline', 'storia conservata; avvio Psichedel', {
          id: story.id,
          title: story.title,
          synopsis: story.synopsis,
          frames: story.frames,
          remainingStories: storyQueue.length,
        })
        if (!currentProduction) {
          storyElement.textContent = `${dreamMonitorText(story)}\nIMAGE SYNTHESIS > ACTIVE`
        }
      } else {
        brainLog('pipeline', 'nuovo tentativo Psichedel sulla storia conservata', {
          id: story.id,
          title: story.title,
        })
      }
      const scenes = await psychedel.generate(story)
      if (destroyed) return
      const production = { story, scenes }
      pendingStory = null
      generationFailures.delete(story.id)
      retryAttempt = 0
      brainLog('pipeline', 'produzione completa', {
        storyId: story.id,
        frames: story.frames.length,
        images: scenes.length,
      })
      if (!currentProduction) {
        startProduction(production)
      } else {
        nextProduction = production
        brainLog('pipeline', 'storia successiva inserita nel buffer', {
          id: story.id,
          title: story.title,
        })
      }
    } catch (error) {
      if (destroyed) return
      brainWarn('pipeline', 'errore imprevisto nella generazione', error)
      if (error instanceof PsychedelInfrastructureError) {
        scheduleGenerationRetry(true)
        return
      }
      if (pendingStory) {
        const failures = (generationFailures.get(pendingStory.id) ?? 0) + 1
        generationFailures.set(pendingStory.id, failures)
        if (failures >= 3) {
          const discardedStory = pendingStory
          pendingStory = null
          generationFailures.delete(discardedStory.id)
          await psychedel.discard(discardedStory.id)
          brainWarn('pipeline', 'storia scartata dopo tre cicli immagini non validi; genero una nuova storia', {
            id: discardedStory.id,
            title: discardedStory.title,
          })
        }
      }
      scheduleGenerationRetry(false)
    } finally {
      generating = false
      if (!destroyed && currentProduction) {
        setStatus('rendering')
      }
    }
  }

  const advanceTimeline = (now: number, onBeat: boolean) => {
    if (!currentProduction) return
    if (junctionActive) {
      const junctionElapsed = now - junctionStartedAt
      if (
        nextProduction &&
        junctionElapsed >= BRAIN_CONFIG.interstoryMinimumDurationMs &&
        (onBeat || junctionElapsed >= BRAIN_CONFIG.interstoryMinimumDurationMs + 800)
      ) {
        brainLog('pipeline', 'morphing intermedio completato; apertura della storia successiva', {
          nextStoryId: nextProduction.story.id,
          junctionDurationMs: Math.round(junctionElapsed),
        })
        startProduction(nextProduction)
      }
      return
    }
    const frame = currentProduction.story.frames[frameIndex]
    if (!frame) return
    const elapsed = now - frameStartedAt
    if (elapsed < frame.durationMs) return
    if (!onBeat && elapsed < frame.durationMs + 2_000) return
    if (frameIndex < currentProduction.story.frames.length - 1) {
      applyFrame(frameIndex + 1)
      return
    }
    brainLog('pipeline', 'storia terminata; ingresso nel morphing nativo casuale', {
      storyId: currentProduction.story.id,
      nextStoryId: nextProduction?.story.id ?? pendingStory?.id ?? null,
      generationActive: generating,
    })
    startInterstoryJunction()
    if (generating) setStatus('rendering+generation')
    if (!generating) void generateNext()
  }

  const render = (now: number) => {
    rafId = requestAnimationFrame(render)
    if (destroyed) return
    const bands = latestPayload?.bandEnergies ?? SILENT_BANDS
    const rhythm = rhythmClock.update(bands, now)
    advanceTimeline(now, rhythm.beat)
    const tempoTransitionMs = clamp01(
      (rhythm.beatDurationMs * 16 - 5_000) / 7_000,
    ) * 7_000 + 5_000
    const transition = smootherstep((now - transitionStartedAt) / tempoTransitionMs)
    currentSvg?.setOpacity(junctionActive ? 0 : 1)
    currentSvg?.setTransition(transition, 'enter', previousSvg?.getMorphShapes())
    previousSvg?.setOpacity(0)
    if (transition >= 1 && previousSvg) destroyPreviousLayers()

    if (latestPayload?.settings) {
      currentSvg?.update(bands, latestPayload.settings, now, rhythm)
      previousSvg?.update(bands, latestPayload.settings, now, rhythm)
    }
  }

  setStatus('generation')
  rafId = requestAnimationFrame(render)
  brainLog('pipeline', 'attesa produzione AI reale; nessun fotogramma simulato')
  void generateNext()

  return {
    setOpacity(opacity: number) {
      root.style.opacity = String(clamp01(opacity))
    },
    updateState(payload: VisualStatePayload) {
      latestPayload = payload
      if (interludeController && interludeSpec) {
        interludeController.updateState(interludePayload(payload, interludeSpec))
      }
    },
    destroy() {
      brainLog('pipeline', 'arresto Brain')
      destroyed = true
      cancelAnimationFrame(rafId)
      window.clearTimeout(retryTimerId)
      storyAi?.destroy()
      psychedel.destroy()
      currentSvg?.destroy()
      previousSvg?.destroy()
      destroyInterlude()
      for (const url of rasterUrls) URL.revokeObjectURL(url)
      rasterUrls.clear()
      root.remove()
    },
  }
}

// React Fast Refresh preserva gli effect di OutputApp. Un modulo Brain aggiornato
// non deve lasciare in esecuzione worker e controller della revisione precedente.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.location.reload()
  })
}
