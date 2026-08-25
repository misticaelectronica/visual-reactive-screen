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

// Raster a piena opacità e senza desaturazione, vettoriale più leggero
// sopra: prima il raster risultava poco visibile sotto le forme
// vettoriali (segnalato dal Capo Supremo) — Check Materia, il raster
// resta il livello di base, non oscurato dall'overlay.
const RASTER_BACKGROUND_OPACITY = 1
const VECTOR_FOREGROUND_OPACITY = 0.55
// Con solo poche forme rilevate (3/4) il vettoriale legge come un errore
// di vettorializzazione, non come una scena — va scartato come un
// fallimento vero e proprio, non tenuto a schermo (segnalato dal
// Capo Supremo). Riusa lo stesso meccanismo di `hasFailed`/fallback già
// gestito da `brainRendererHost.ts` per gli altri casi di rigetto.
export const MIN_VECTOR_SHAPES = 5

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
    const candidate = createBrainSvgScene(
      vectorForeground,
      scene,
      context.palette,
      {
        frameEnergy: context.frameEnergy,
        frameIndex: context.frameIndex,
        frameCount: context.frameCount,
      },
    )
    const shapeCount = candidate.getMorphShapes().length
    if (shapeCount < MIN_VECTOR_SHAPES) {
      candidate.destroy()
      failed = true
      brainWarn('render', 'plugin Vector Morph scartato: troppe poche forme rilevate', {
        frameId: scene.frameId,
        shapeCount,
        minimo: MIN_VECTOR_SHAPES,
      })
      return
    }
    inner = candidate
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
      shapeCount,
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
