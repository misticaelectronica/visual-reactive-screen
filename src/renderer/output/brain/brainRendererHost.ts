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
import { createBrainDenoisingPassthrough } from './brainDenoisingPassthrough'

const SWITCH_DURATION_MS = 1_800
const SWITCH_TIMEOUT_MS = 15_000

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
  let incoming: RendererLayer | null = null
  const denoisingPassthrough = createBrainDenoisingPassthrough(
    root,
    pluginContext.raster,
    pluginContext.palette,
  )
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
    },
    setResourcePressure(activePressure) {
      if (resourcePressure === activePressure) return
      resourcePressure = activePressure
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
      if (
        BRAIN_CONFIG.lightweightDenoisingRender &&
        resourcePressure &&
        denoisingPassthrough.isReady()
      ) return
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
      if (offlineHold) return
      const passthroughReady =
        BRAIN_CONFIG.lightweightDenoisingRender &&
        denoisingPassthrough.isReady()
      const shouldSuspendPlugin = resourcePressure && passthroughReady
      if (shouldSuspendPlugin) {
        if (passthroughState === 'idle' || passthroughState === 'exiting') {
          passthroughState = 'entering'
          passthroughStartedAt = time
          passthroughStartOpacity = passthroughOpacity
          root.dataset.brainDenoisingPassthrough = 'entering'
          brainLog('render', 'denoising-passthrough: active', {
            renderer: active.id,
          })
        }
        const progress = smootherstep(
          (time - passthroughStartedAt) /
            BRAIN_CONFIG.denoisingPassthroughCrossfadeMs,
        )
        passthroughOpacity = passthroughStartOpacity +
          (1 - passthroughStartOpacity) * progress
        denoisingPassthrough.setOpacity(passthroughOpacity)
        denoisingPassthrough.update(bands, settings, time, rhythm)
        const pluginFrameInterval = settings.lowPowerMode
          ? 1_000 / BRAIN_CONFIG.lowPowerDenoisingPassthroughPluginFps
          : 1_000 / BRAIN_CONFIG.denoisingPassthroughPluginFps
        if (
          passthroughState === 'entering' &&
          time - lastPassthroughPluginUpdateAt >= pluginFrameInterval
        ) {
          lastPassthroughPluginUpdateAt = time
          active.controller.update(bands, settings, time, rhythm, movingAverages, flash)
        }
        if (progress >= 1) {
          passthroughState = 'active'
          root.dataset.brainDenoisingPassthrough = 'active'
        }
        return
      }

      if (passthroughState === 'entering' || passthroughState === 'active') {
        passthroughState = 'exiting'
        passthroughStartedAt = time
        passthroughStartOpacity = passthroughOpacity
        root.dataset.brainDenoisingPassthrough = 'exiting'
      }
      if (passthroughState === 'exiting') {
        const progress = smootherstep(
          (time - passthroughStartedAt) /
            BRAIN_CONFIG.denoisingPassthroughCrossfadeMs,
        )
        passthroughOpacity = passthroughStartOpacity * (1 - progress)
        denoisingPassthrough.setOpacity(passthroughOpacity)
        denoisingPassthrough.update(bands, settings, time, rhythm)
        if (progress >= 1) {
          passthroughState = 'idle'
          passthroughOpacity = 0
          denoisingPassthrough.setOpacity(0)
          root.dataset.brainDenoisingPassthrough = 'idle'
          brainLog('render', 'denoising-passthrough: idle', {
            renderer: active.id,
          })
        }
      }

      const desired = getRendererId(settings, time)
      const frameTransitionComplete = transitionProgress >= 1 && transitionRole === 'enter'
      if (frameTransitionComplete && desired !== active.id) requestRenderer(desired, time)

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
      const duration = settings.lowPowerMode || resourcePressure
        ? SWITCH_DURATION_MS * 0.6
        : SWITCH_DURATION_MS
      const progress = smootherstep((time - switchStartedAt) / duration)
      active.root.style.opacity = String(1 - progress)
      incoming.root.style.opacity = String(progress)
      if (progress < 1) return

      const previous = active
      active = incoming
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
      denoisingPassthrough.destroy()
      incoming = null
      root.remove()
    },
  }
}
