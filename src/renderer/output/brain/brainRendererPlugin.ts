import type { BrainRendererId } from '@shared/types'
import type { DreamStory, PsychedelScene } from '@shared/brain/brainTypes'
import type { BrainPrint2dMode } from './brainPrint2dCanvas'
import type { BrainSceneRendererController } from './brainSvgScene'

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
