export type ImageModelFamily = 'sd15' | 'sdxl' | 'illustrious'
export type ImageModelPrecision = 'fp16' | 'fp32' | 'int8'
export type ImageModelPredictionType = 'epsilon' | 'v_prediction'
export type ImageModelProfile = 'turbo' | 'quality'

export type ImageModelFile = {
  component: 'text_encoder' | 'unet' | 'vae_decoder'
  path: string
  bytes: number
  url?: string
  externalDataPath?: string
  sha256?: string
}

export type ImageModelManifest = {
  id: string
  name: string
  repository: string
  sourceRepository: string
  sourceRevision: string
  tokenizerRepository: string
  family: ImageModelFamily
  uncensored: boolean
  format: 'onnx'
  precision: ImageModelPrecision
  files: readonly ImageModelFile[]
  scheduler: 'euler-discrete' | 'lcm' | 'hyper-sd'
  predictionType: ImageModelPredictionType
  defaultWidth: number
  defaultHeight: number
  turboSteps: number
  qualitySteps: number
  guidanceScale: number
  license: string
  safetyChecker: false
  profile: ImageModelProfile
  browserValidated: boolean
}

/**
 * Il repository degli artefatti viene assegnato dopo il collaudo WebGPU e la
 * pubblicazione. Il sorgente è fissato a una revisione precisa per rendere
 * riproducibile la conversione offline.
 */
export const PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE: ImageModelManifest = {
  id: 'pornmaster-sd15-explicit-onnx-fp16',
  name: 'PornMaster SD 1.5 Explicit ONNX',
  repository: 'local-prototype/pornmaster-sd15-onnx',
  sourceRepository: 'stablediffusionapi/pornmaster',
  sourceRevision: '0f8590a83a85e267a9cc12eaf657baa222938f08',
  tokenizerRepository: 'Xenova/clip-vit-base-patch16',
  family: 'sd15',
  uncensored: true,
  format: 'onnx',
  precision: 'fp16',
  files: [
    {
      component: 'text_encoder',
      path: 'text_encoder/model.onnx',
      bytes: 246_422_069,
      sha256: 'f086ffb78c4629700ebff959fa2c3378a00dd792b50440d3cde9dd4e5e7c249f',
    },
    {
      component: 'unet',
      path: 'unet/model.onnx',
      bytes: 1_720_013_896,
      sha256: '701a2ff9bfd64d026aa0af0c0139589b49d7961dfde614c74d75604b7925ee64',
    },
    {
      component: 'vae_decoder',
      path: 'onnx/vae_decoder.onnx',
      bytes: 198_078_223,
      url: 'https://huggingface.co/Zhare-AI/sd-1-5-webgpu/resolve/f17fc687a06b8cb3ee3d5ce4cb40c425ef94afe3/onnx/vae_decoder.onnx',
    },
  ],
  scheduler: 'euler-discrete',
  predictionType: 'epsilon',
  defaultWidth: 512,
  defaultHeight: 512,
  turboSteps: 0,
  qualitySteps: 24,
  guidanceScale: 7,
  license: 'CreativeML OpenRAIL-M',
  safetyChecker: false,
  profile: 'quality',
  browserValidated: true,
}

export function validateImageModelManifest(manifest: ImageModelManifest): string[] {
  const errors: string[] = []
  const components = new Set(manifest.files.map((file) => file.component))
  for (const required of ['text_encoder', 'unet', 'vae_decoder'] as const) {
    if (!components.has(required)) errors.push(`componente mancante: ${required}`)
  }
  if (manifest.family === 'sd15' && (
    manifest.defaultWidth !== 512 || manifest.defaultHeight !== 512
  )) {
    errors.push('il profilo SD 1.5 iniziale deve usare 512×512')
  }
  if (manifest.profile === 'turbo' && manifest.turboSteps < 1) {
    errors.push('un profilo Turbo deve dichiarare almeno uno step')
  }
  if (manifest.profile === 'quality' && manifest.qualitySteps < 10) {
    errors.push('un profilo Quality deve dichiarare almeno dieci step')
  }
  if (manifest.safetyChecker !== false) {
    errors.push('il safety checker non deve essere incluso')
  }
  if (!manifest.license.trim()) errors.push('licenza mancante')
  if (!manifest.repository.trim()) errors.push('repository artefatti mancante')
  return errors
}
