import type { BrainRendererPluginContext } from './brainRendererPlugin'
import { BrainRendererRegistry } from './brainRendererPlugin'
import { createBrainPrint2dScene } from './brainPrint2dCanvas'
import { createBrainPsycho2dWindowScene } from './brainPsycho2dWindowCanvas'
import { createBrainVectorMorphScene } from './brainVectorMorphScene'

export function createDefaultBrainRendererRegistry(): BrainRendererRegistry {
  const registry = new BrainRendererRegistry()
  registry.register({
    id: 'print2d',
    label: 'Print2D — serigrafico',
    capabilities: {
      multipleImages: false,
      semanticMetadata: false,
      lowPowerMode: true,
    },
    create(context: BrainRendererPluginContext) {
      return createBrainPrint2dScene(
        context.container,
        context.scene,
        context.raster,
        context.palette,
        context.printMode,
      )
    },
  })
  registry.register({
    id: 'psycho2d',
    label: 'Psycho2D — finestre',
    capabilities: {
      multipleImages: true,
      semanticMetadata: true,
      lowPowerMode: true,
    },
    create: createBrainPsycho2dWindowScene,
  })
  registry.register({
    id: 'vector-morph',
    label: 'Vector Morph — vettoriale',
    capabilities: {
      multipleImages: false,
      semanticMetadata: false,
      lowPowerMode: true,
    },
    create: createBrainVectorMorphScene,
  })
  return registry
}
