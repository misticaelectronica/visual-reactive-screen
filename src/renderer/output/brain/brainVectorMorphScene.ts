import type { AppSettings, BandEnergies } from '@shared/types'
import type { BrainFrameMorphPattern } from './brainFrameMotion'
import type { BrainRhythmState } from './brainRhythm'
import type { BrainRendererPluginContext } from './brainRendererPlugin'
import {
  createBrainSvgScene,
  type BrainFlashState,
  type BrainMorphShape,
  type BrainSceneRendererController,
} from './brainSvgScene'
import { brainLog, brainWarn } from './brainLog'

const RASTER_BACKGROUND_OPACITY = 0.92
const VECTOR_FOREGROUND_OPACITY = 0.7

export function createBrainVectorMorphScene(
  context: BrainRendererPluginContext,
): BrainSceneRendererController {
  const root = document.createElement('div')
  root.dataset.brainRenderer = 'vector-morph'
  Object.assign(root.style, {
    position: 'absolute',
    inset: '0',
    overflow: 'hidden',
    pointerEvents: 'none',
    contain: 'layout style paint',
  })
  context.container.appendChild(root)

  const rasterUrl = URL.createObjectURL(context.raster)
  const rasterBackground = document.createElement('img')
  rasterBackground.dataset.brainVectorRasterBackground = 'true'
  rasterBackground.src = rasterUrl
  rasterBackground.alt = ''
  Object.assign(rasterBackground.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: String(RASTER_BACKGROUND_OPACITY),
    filter: 'saturate(0.9) contrast(0.96)',
    pointerEvents: 'none',
    zIndex: '1',
  })
  const vectorForeground = document.createElement('div')
  vectorForeground.dataset.brainVectorForeground = 'true'
  Object.assign(vectorForeground.style, {
    position: 'absolute',
    inset: '0',
    opacity: String(VECTOR_FOREGROUND_OPACITY),
    pointerEvents: 'none',
    zIndex: '2',
  })
  root.append(rasterBackground, vectorForeground)

  let destroyed = false
  let failed = false
  let inner: BrainSceneRendererController | null = null
  let opacity = 1
  let morphPattern: BrainFrameMorphPattern = 'marea'
  let resourcePressure = false
  let transitionProgress = 1
  let transitionRole: 'enter' | 'exit' = 'enter'
  let transitionCounterparts: BrainMorphShape[] = []

  void context.getVectorScene().then((scene) => {
    if (destroyed) return
    inner = createBrainSvgScene(
      vectorForeground,
      scene,
      context.palette,
      {
        frameEnergy: context.frameEnergy,
        frameIndex: context.frameIndex,
        frameCount: context.frameCount,
      },
    )
    inner.setOpacity(1)
    inner.element.style.backgroundColor = 'transparent'
    inner.setMorphPattern(morphPattern)
    inner.setResourcePressure(resourcePressure)
    inner.setTransition(
      transitionProgress,
      transitionRole,
      transitionCounterparts,
    )
    root.style.opacity = String(opacity)
    brainLog('render', 'plugin Vector Morph pronto', {
      frameId: scene.frameId,
      svgLength: scene.svg.length,
    })
  }).catch((error) => {
    if (destroyed) return
    failed = true
    brainWarn('render', 'plugin Vector Morph fallito; mantengo il renderer corrente', {
      frameId: context.scene.frameId,
      error,
    })
  })

  return {
    element: root,
    isReady: () => inner !== null,
    hasFailed: () => failed,
    setOpacity(nextOpacity) {
      opacity = Math.max(0, Math.min(1, nextOpacity))
      root.style.opacity = String(opacity)
    },
    getMorphShapes(): BrainMorphShape[] {
      return inner?.getMorphShapes() ?? []
    },
    setMorphPattern(pattern) {
      morphPattern = pattern
      inner?.setMorphPattern(pattern)
    },
    setResourcePressure(active) {
      resourcePressure = active
      inner?.setResourcePressure(active)
    },
    setTransition(progress, role, counterpartShapes = []) {
      transitionProgress = progress
      transitionRole = role
      transitionCounterparts = counterpartShapes
      inner?.setTransition(progress, role, counterpartShapes)
    },
    update(
      bands: BandEnergies,
      settings: AppSettings,
      time: number,
      rhythm?: BrainRhythmState,
      movingAverages?: BandEnergies,
      flash?: BrainFlashState,
    ) {
      inner?.update(bands, settings, time, rhythm, movingAverages, flash)
    },
    destroy() {
      destroyed = true
      inner?.destroy()
      inner = null
      rasterBackground.src = ''
      URL.revokeObjectURL(rasterUrl)
      root.remove()
    },
  }
}
