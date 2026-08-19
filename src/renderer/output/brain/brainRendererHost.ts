import type { AppSettings, BandEnergies, BrainRendererId } from '@shared/types'
import { BRAIN_CONFIG } from '@shared/brain/brainConfig'
import type { BrainFrameMorphPattern } from './brainFrameMotion'
import type { BrainRhythmState } from './brainRhythm'
import type {
  BrainFlashState,
  BrainMorphShape,
  BrainSceneRendererController,
} from './brainSvgScene'
import type {
  BrainRendererPluginContext,
  BrainRendererRegistry,
} from './brainRendererPlugin'
import { brainLog, brainWarn } from './brainLog'

const SWITCH_DURATION_MS = 1_800
const SWITCH_TIMEOUT_MS = 15_000
// `resourcePressure` diventa vero SOLO dopo che il thermalScheduler ha già
// rilevato un vero stallo (è reattivo, non predittivo): il salto visivo fra
// l'ultimo fotogramma fermo di Bauhaus/Materia Morph e il passthrough
// leggero arriva quindi sempre a stallo già avvenuto. Non eliminabile con
// uno scheduling più furbo; si maschera con un breve flash — tecnica VJ
// comune per coprire un taglio tecnico invece di farlo leggere come un
// glitch. Non è reattività musicale (Check Silenzio): scatta solo sul
// fronte di salita di una pressione GPU reale rilevata, non su base audio.
const PRESSURE_FLASH_ATTACK_MS = 40
const PRESSURE_FLASH_DECAY_MS = 160
const PRESSURE_FLASH_PEAK_OPACITY = 0.55

type RendererLayer = {
  id: BrainRendererId
  root: HTMLDivElement
  controller: BrainSceneRendererController
  requestedAt: number
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function smootherstep(value: number): number {
  const x = clamp(value)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

export function createBrainRendererHost(
  container: HTMLElement,
  registry: BrainRendererRegistry,
  pluginContext: Omit<BrainRendererPluginContext, 'container'>,
  getRendererId: (settings: AppSettings, now: number) => BrainRendererId,
  initialRendererId: BrainRendererId,
): BrainSceneRendererController {
  const root = document.createElement('div')
  Object.assign(root.style, {
    position: 'absolute',
    inset: '0',
    overflow: 'hidden',
    pointerEvents: 'none',
    contain: 'layout style paint',
  })
  container.appendChild(root)

  let destroyed = false
  let morphPattern: BrainFrameMorphPattern = 'marea'
  let resourcePressure = false
  let offlineHold = false
  let transitionProgress = 1
  let transitionRole: 'enter' | 'exit' = 'enter'
  let switchStartedAt: number | null = null
  const retryRendererAfter = new Map<BrainRendererId, number>()

  let pressureFlashOverlay: HTMLDivElement | null = null
  let pressureFlashStartedAt: number | null = null
  // `setResourcePressure` non riceve il tempo di `update()`: il fronte di
  // salita si registra qui e l'orologio del flash parte al successivo
  // `update()`, restando nello stesso dominio temporale di `time` (RAF).
  let pressureFlashArmed = false
  const ensurePressureFlashOverlay = (): HTMLDivElement => {
    if (!pressureFlashOverlay) {
      pressureFlashOverlay = document.createElement('div')
      Object.assign(pressureFlashOverlay.style, {
        position: 'absolute',
        inset: '0',
        opacity: '0',
        pointerEvents: 'none',
        backgroundColor: '#ffffff',
        mixBlendMode: 'screen',
        zIndex: '3',
      })
      root.appendChild(pressureFlashOverlay)
    }
    return pressureFlashOverlay
  }

  const createLayer = (id: BrainRendererId, now: number): RendererLayer => {
    const plugin = registry.get(id) ?? registry.get('print2d')
    if (!plugin) throw new Error(`Renderer Brain non registrato: ${id}`)
    const layerRoot = document.createElement('div')
    Object.assign(layerRoot.style, {
      position: 'absolute',
      inset: '0',
      opacity: '1',
      pointerEvents: 'none',
      contain: 'layout style paint',
      zIndex: '1',
    })
    root.appendChild(layerRoot)
    const controller = plugin.create({ ...pluginContext, container: layerRoot })
    controller.setMorphPattern(morphPattern)
    controller.setResourcePressure(resourcePressure)
    controller.setTransition(transitionProgress, transitionRole)
    return { id: plugin.id, root: layerRoot, controller, requestedAt: now }
  }

  let active = createLayer(initialRendererId, performance.now())
  root.dataset.activeRenderer = active.id
  let incoming: RendererLayer | null = null
  // Costruiti solo alla prima vera pressione risorse, non a ogni cambio di
  // fotogramma: quasi sempre non serve (nessuna transizione lo richiede),
  // quindi non vale la pena pagarne il costo di creazione ogni volta.
  let denoisingFilterPsiche: RendererLayer | null = null
  const ensureDenoisingFilterPsiche = (now: number): RendererLayer => {
    if (!denoisingFilterPsiche) {
      denoisingFilterPsiche = createLayer('filter-psiche', now)
      denoisingFilterPsiche.root.dataset.brainDenoisingFilterPsiche = 'true'
      denoisingFilterPsiche.root.style.opacity = '0'
      denoisingFilterPsiche.root.style.zIndex = '2'
      denoisingFilterPsiche.controller.setResourcePressure(true)
    }
    return denoisingFilterPsiche
  }
  // Secondo strato, leggero quanto il primo (stessa risoluzione/fps ridotti
  // del passthrough): sovrapposto in 'lighten' a FilterPsiche per dare il
  // "mix" di movimento richiesto durante il denoising, senza sostituirlo —
  // resta un accento (opacità ridotta rispetto al primo), non un secondo
  // renderer a pieno carico.
  let denoisingPsycho2d: RendererLayer | null = null
  const ensureDenoisingPsycho2d = (now: number): RendererLayer => {
    if (!denoisingPsycho2d) {
      denoisingPsycho2d = createLayer('psycho2d', now)
      denoisingPsycho2d.root.dataset.brainDenoisingPsycho2d = 'true'
      denoisingPsycho2d.root.style.opacity = '0'
      denoisingPsycho2d.root.style.zIndex = '2'
      denoisingPsycho2d.root.style.mixBlendMode = 'lighten'
      denoisingPsycho2d.controller.setResourcePressure(true)
    }
    return denoisingPsycho2d
  }
  const DENOISING_MIX_OPACITY_FACTOR = 0.6
  let passthroughState: 'idle' | 'entering' | 'active' | 'exiting' = 'idle'
  let passthroughStartedAt = 0
  let passthroughStartOpacity = 0
  let passthroughOpacity = 0
  let lastPassthroughPluginUpdateAt = Number.NEGATIVE_INFINITY

  const destroyLayer = (layer: RendererLayer | null): void => {
    if (!layer) return
    layer.controller.destroy()
    layer.root.remove()
  }

  const requestRenderer = (id: BrainRendererId, now: number): void => {
    if (id === active.id) {
      if (incoming) {
        destroyLayer(incoming)
        incoming = null
        switchStartedAt = null
        active.root.style.opacity = '1'
      }
      return
    }
    if (now < (retryRendererAfter.get(id) ?? 0)) return
    if (incoming?.id === id) return
    destroyLayer(incoming)
    incoming = null
    switchStartedAt = null
    try {
      incoming = createLayer(id, now)
      incoming.root.style.opacity = '0'
      brainLog('render', 'cambio renderer Brain preparato', {
        from: active.id,
        to: incoming.id,
      })
    } catch (error) {
      brainWarn('render', 'renderer Brain non creato; mantengo quello attivo', {
        requested: id,
        active: active.id,
        error,
      })
    }
  }

  return {
    element: root,
    isReady: () => active.controller.isReady?.() !== false,
    setOpacity(opacity) {
      root.style.opacity = String(clamp(opacity))
    },
    getMorphShapes(): BrainMorphShape[] {
      return active.controller.getMorphShapes()
    },
    setMorphPattern(pattern) {
      morphPattern = pattern
      active.controller.setMorphPattern(pattern)
      incoming?.controller.setMorphPattern(pattern)
      denoisingFilterPsiche?.controller.setMorphPattern(pattern)
      denoisingPsycho2d?.controller.setMorphPattern(pattern)
    },
    setResourcePressure(activePressure) {
      if (resourcePressure === activePressure) return
      resourcePressure = activePressure
      if (activePressure) {
        ensurePressureFlashOverlay()
        pressureFlashArmed = true
      }
      active.controller.setResourcePressure(activePressure)
      incoming?.controller.setResourcePressure(activePressure)
    },
    setOfflineHold(activeHold) {
      if (offlineHold === activeHold) return
      offlineHold = activeHold
      root.dataset.brainOfflineHold = activeHold ? 'active' : 'idle'
    },
    setTransition(progress, role, counterpartShapes) {
      transitionProgress = clamp(progress)
      transitionRole = role
      denoisingFilterPsiche?.controller.setTransition(progress, role, counterpartShapes)
      denoisingPsycho2d?.controller.setTransition(progress, role, counterpartShapes)
      active.controller.setTransition(progress, role, counterpartShapes)
      incoming?.controller.setTransition(progress, role, counterpartShapes)
    },
    update(
      bands: BandEnergies,
      settings: AppSettings,
      time: number,
      rhythm?: BrainRhythmState,
      movingAverages?: BandEnergies,
      flash?: BrainFlashState,
    ) {
      if (destroyed) return
      if (pressureFlashArmed) {
        pressureFlashArmed = false
        pressureFlashStartedAt = time
      }
      if (pressureFlashStartedAt !== null) {
        const elapsed = time - pressureFlashStartedAt
        const totalMs = PRESSURE_FLASH_ATTACK_MS + PRESSURE_FLASH_DECAY_MS
        if (elapsed >= totalMs) {
          pressureFlashStartedAt = null
          if (pressureFlashOverlay) pressureFlashOverlay.style.opacity = '0'
        } else if (pressureFlashOverlay) {
          const intensity = elapsed < PRESSURE_FLASH_ATTACK_MS
            ? elapsed / PRESSURE_FLASH_ATTACK_MS
            : 1 - (elapsed - PRESSURE_FLASH_ATTACK_MS) / PRESSURE_FLASH_DECAY_MS
          pressureFlashOverlay.style.opacity = String(clamp(intensity) * PRESSURE_FLASH_PEAK_OPACITY)
        }
      }
      if (resourcePressure && BRAIN_CONFIG.lightweightDenoisingRender) {
        const passthrough = ensureDenoisingFilterPsiche(time)
        const mix = ensureDenoisingPsycho2d(time)
        const passthroughReady = passthrough.controller.isReady?.() !== false
        if (passthroughReady) {
          if (passthroughState === 'idle' || passthroughState === 'exiting') {
            passthroughState = 'entering'
            passthroughStartedAt = time
            passthroughStartOpacity = passthroughOpacity
            root.dataset.brainDenoisingFilterPsiche = 'entering'
            brainLog('render', 'denoising-filter-psiche: active', {
              renderer: active.id,
            })
          }
          const progress = smootherstep(
            (time - passthroughStartedAt) /
              BRAIN_CONFIG.denoisingPassthroughCrossfadeMs,
          )
          passthroughOpacity = passthroughStartOpacity +
            (1 - passthroughStartOpacity) * progress
          passthrough.root.style.opacity = String(passthroughOpacity)
          passthrough.controller.update(
            bands,
            settings,
            time,
            rhythm,
            movingAverages,
            flash,
          )
          // Psycho2D si aggiunge solo quando è pronto (createImageBitmap
          // può richiedere qualche frame in più della prima volta): finché
          // non lo è resta a opacità 0, senza bloccare FilterPsiche.
          const mixReady = mix.controller.isReady?.() !== false
          mix.root.style.opacity = mixReady
            ? String(passthroughOpacity * DENOISING_MIX_OPACITY_FACTOR)
            : '0'
          mix.controller.update(bands, settings, time, rhythm, movingAverages, flash)
          const pluginFrameInterval = settings.lowPowerMode
            ? 1_000 / BRAIN_CONFIG.lowPowerDenoisingPassthroughPluginFps
            : 1_000 / BRAIN_CONFIG.denoisingPassthroughPluginFps
          if (
            (passthroughState === 'entering' || passthroughState === 'active') &&
            time - lastPassthroughPluginUpdateAt >= pluginFrameInterval
          ) {
            lastPassthroughPluginUpdateAt = time
            active.controller.update(bands, settings, time, rhythm, movingAverages, flash)
          }
          if (progress >= 1) {
            passthroughState = 'active'
            root.dataset.brainDenoisingFilterPsiche = 'active'
          }
          return
        }
      }

      if (passthroughState === 'entering' || passthroughState === 'active') {
        passthroughState = 'exiting'
        passthroughStartedAt = time
        passthroughStartOpacity = passthroughOpacity
        root.dataset.brainDenoisingFilterPsiche = 'exiting'
      }
      if (passthroughState === 'exiting' && denoisingFilterPsiche) {
        const progress = smootherstep(
          (time - passthroughStartedAt) /
            BRAIN_CONFIG.denoisingPassthroughCrossfadeMs,
        )
        passthroughOpacity = passthroughStartOpacity * (1 - progress)
        denoisingFilterPsiche.root.style.opacity = String(passthroughOpacity)
        denoisingFilterPsiche.controller.update(
          bands,
          settings,
          time,
          rhythm,
          movingAverages,
          flash,
        )
        if (denoisingPsycho2d) {
          denoisingPsycho2d.root.style.opacity =
            String(passthroughOpacity * DENOISING_MIX_OPACITY_FACTOR)
          denoisingPsycho2d.controller.update(
            bands,
            settings,
            time,
            rhythm,
            movingAverages,
            flash,
          )
        }
        if (progress >= 1) {
          passthroughState = 'idle'
          passthroughOpacity = 0
          denoisingFilterPsiche.root.style.opacity = '0'
          if (denoisingPsycho2d) denoisingPsycho2d.root.style.opacity = '0'
          root.dataset.brainDenoisingFilterPsiche = 'idle'
          brainLog('render', 'denoising-filter-psiche: idle', {
            renderer: active.id,
          })
        }
      }

      const desired = getRendererId(settings, time)
      const frameTransitionComplete = transitionProgress >= 1 && transitionRole === 'enter'
      if (frameTransitionComplete && desired !== active.id) requestRenderer(desired, time)

      // Un fallimento del renderer ATTIVO (non solo di quello entrante,
      // già gestito sotto) non deve restare a schermo per l'intera durata
      // del fotogramma — es. Vector Morph quando la vettorializzazione
      // viene respinta dal controllo qualità mostra solo il raster di
      // sfondo finché nessuno lo nota. Print2D è la rete di sicurezza:
      // renderer semplice, non fallisce mai per lo stesso motivo.
      if (active.controller.hasFailed?.() === true && active.id !== 'print2d') {
        brainWarn('render', 'renderer Brain attivo fallito; passo a Print2D come rete di sicurezza', {
          active: active.id,
        })
        retryRendererAfter.set(active.id, time + 30_000)
        requestRenderer('print2d', time)
      }

      active.controller.update(bands, settings, time, rhythm, movingAverages, flash)
      incoming?.controller.update(bands, settings, time, rhythm, movingAverages, flash)
      if (!incoming) return

      if (incoming.controller.hasFailed?.() === true) {
        brainWarn('render', 'renderer Brain entrante fallito; cambio annullato', {
          active: active.id,
          incoming: incoming.id,
        })
        retryRendererAfter.set(incoming.id, time + 30_000)
        destroyLayer(incoming)
        incoming = null
        switchStartedAt = null
        active.root.style.opacity = '1'
        return
      }
      const incomingReady = incoming.controller.isReady?.() !== false
      if (!incomingReady) {
        if (time - incoming.requestedAt >= SWITCH_TIMEOUT_MS) {
          brainWarn('render', 'timeout renderer Brain entrante; cambio annullato', {
            active: active.id,
            incoming: incoming.id,
          })
          retryRendererAfter.set(incoming.id, time + 10_000)
          destroyLayer(incoming)
          incoming = null
        }
        return
      }
      if (switchStartedAt === null) switchStartedAt = time
      const duration = settings.lowPowerMode || resourcePressure || offlineHold
        ? SWITCH_DURATION_MS * 0.6
        : SWITCH_DURATION_MS
      const progress = smootherstep((time - switchStartedAt) / duration)
      active.root.style.opacity = String(1 - progress)
      incoming.root.style.opacity = String(progress)
      if (progress < 1) return

      const previous = active
      active = incoming
      root.dataset.activeRenderer = active.id
      incoming = null
      switchStartedAt = null
      active.root.style.opacity = '1'
      destroyLayer(previous)
      brainLog('render', 'cambio renderer Brain completato', {
        active: active.id,
      })
    },
    destroy() {
      destroyed = true
      destroyLayer(incoming)
      destroyLayer(active)
      destroyLayer(denoisingFilterPsiche)
      destroyLayer(denoisingPsycho2d)
      pressureFlashOverlay = null
      incoming = null
      root.remove()
    },
  }
}
