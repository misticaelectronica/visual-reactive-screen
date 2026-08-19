import type { BrainRendererPluginContext } from './brainRendererPlugin'
import { BrainRendererRegistry } from './brainRendererPlugin'
import { createBrainPrint2dScene } from './brainPrint2dCanvas'
import { createBrainPsycho2dWindowScene } from './brainPsycho2dWindowCanvas'
import { createBrainVectorMorphScene } from './brainVectorMorphScene'
import { createBrainMaterialMorphScene } from './brainMaterialMorphCanvas'
import { createBrainFilterPsicheScene } from './brainFilterPsicheCanvas'
import { createBrainBauhausMorphScene } from './brainBauhausMorphCanvas'
import { createBrainDreamSegmentationScene } from './brainDreamSegmentationCanvas'

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
  registry.register({
    id: 'material-morph',
    label: 'Materia Morph — sedimentale',
    capabilities: {
      multipleImages: true,
      semanticMetadata: false,
      lowPowerMode: true,
    },
    create: createBrainMaterialMorphScene,
  })
  registry.register({
    id: 'filter-psiche',
    label: 'FilterPsiche — cromatico',
    capabilities: {
      multipleImages: false,
      semanticMetadata: false,
      lowPowerMode: true,
    },
    create: createBrainFilterPsicheScene,
  })
  registry.register({
    id: 'bauhaus-morph',
    label: 'Bauhaus Morph — pittorico',
    capabilities: {
      multipleImages: true,
      semanticMetadata: false,
      lowPowerMode: true,
    },
    create: createBrainBauhausMorphScene,
  })
  registry.register({
    id: 'dream-segmentation',
    label: 'Dream Segmentation — immaginazione',
    capabilities: {
      multipleImages: true,
      semanticMetadata: true,
      lowPowerMode: true,
    },
    create: createBrainDreamSegmentationScene,
  })
  return registry
}
