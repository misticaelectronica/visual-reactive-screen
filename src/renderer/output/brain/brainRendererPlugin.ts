import type { BrainRendererId } from '@shared/types'
import type { DreamStory, ImageRenderMode, PsychedelScene } from '@shared/brain/brainTypes'
import type { BrainPrint2dMode } from './brainPrint2dCanvas'
import type { BrainSceneRendererController } from './brainSvgScene'
import type { MaterialField } from './brainMaterialAnalysis'

export type BrainRendererImageSource = {
  id: string
  role: 'current' | 'previous' | 'next'
  scene: PsychedelScene
  raster: Blob
  narrativeHints: string[]
}

export type BrainRendererPluginContext = {
  container: HTMLElement
  scene: PsychedelScene
  raster: Blob
  palette: DreamStory['palette']
  printMode: BrainPrint2dMode
  getImageSources: () => BrainRendererImageSource[]
  getVectorScene: () => Promise<PsychedelScene>
  frameEnergy: number
  frameIndex: number
  frameCount: number
  /**
   * Modalità di resa della raster del fotogramma corrente; `undefined` per
   * fotogrammi archiviati/riusati. PsicoFantasma non gira su `interlude`
   * (4 step di denoising, 448×256): il gate vive in `brainRendererSelector`.
   */
  frameRenderMode?: ImageRenderMode
  /**
   * Material↔Dream (disposizione Vice Consigliere, brief bidirezionale
   * 2026-09-17, esteso dal PoC 2026-09-14): `MaterialField` già elaborato
   * dal renderer uscente, passato dall'host quando la coppia
   * uscente→entrante è material-morph→dream-segmentation o
   * dream-segmentation→material-morph, sullo stesso raster. Autorizzato
   * esclusivamente per questa coppia — non estendere ad altri renderer
   * senza una nuova disposizione esplicita (agents.md, Autonomia Dei
   * Renderer).
   */
  materialFieldHandoff?: MaterialField
}

export type BrainRendererPlugin = {
  id: BrainRendererId
  label: string
  capabilities: {
    multipleImages: boolean
    semanticMetadata: boolean
    lowPowerMode: boolean
  }
  create: (context: BrainRendererPluginContext) => BrainSceneRendererController
}

export class BrainRendererRegistry {
  private readonly plugins = new Map<BrainRendererId, BrainRendererPlugin>()

  register(plugin: BrainRendererPlugin): void {
    this.plugins.set(plugin.id, plugin)
  }

  get(id: BrainRendererId): BrainRendererPlugin | undefined {
    return this.plugins.get(id)
  }

  ids(): BrainRendererId[] {
    return [...this.plugins.keys()]
  }
}
