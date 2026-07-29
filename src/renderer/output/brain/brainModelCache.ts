import { BRAIN_CONFIG } from '@shared/brain/brainConfig'
import { PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE } from '@shared/brain/imageModelManifest'
import { brainLog, brainWarn } from './brainLog'

const TRANSFORMERS_CACHE = 'transformers-cache'
const IMAGE_CACHE = 'web-txt2img-v1'

const EXPLICIT_IMAGE_REPOSITORIES = [
  PSYCHEDEL_EXPLICIT_QUALITY_PROTOTYPE.tokenizerRepository,
  'Zhare-AI/sd-1-5-webgpu',
] as const

export type BrainCacheConfiguration = {
  transformersRepositories: ReadonlySet<string>
  imageRepositories: ReadonlySet<string>
}

export function configuredBrainCache(): BrainCacheConfiguration {
  const imageRepositories = new Set<string>([
    ...EXPLICIT_IMAGE_REPOSITORIES,
  ])
  return {
    transformersRepositories: new Set([
      BRAIN_CONFIG.storyModelId,
      BRAIN_CONFIG.storyFallbackModelId,
      BRAIN_CONFIG.memoModelId,
      BRAIN_CONFIG.visualModelId,
      BRAIN_CONFIG.inputTranslationModelId,
      BRAIN_CONFIG.uiTranslationModelId,
      ...imageRepositories,
    ]),
    imageRepositories: new Set([
      ...EXPLICIT_IMAGE_REPOSITORIES,
    ]),
  }
}

export function huggingFaceRepositoryFromUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl)
    if (url.hostname !== 'huggingface.co') return null
    const segments = decodeURIComponent(url.pathname).split('/').filter(Boolean)
    const resolveIndex = segments.indexOf('resolve')
    if (resolveIndex !== 2) return null
    return `${segments[0]}/${segments[1]}`
  } catch {
    return null
  }
}

export function obsoleteBrainCacheUrls(
  urls: readonly string[],
  activeRepositories: ReadonlySet<string>,
): string[] {
  return urls.filter((url) => {
    const repository = huggingFaceRepositoryFromUrl(url)
    return repository !== null && !activeRepositories.has(repository)
  })
}

async function reconcileCache(
  cacheName: string,
  activeRepositories: ReadonlySet<string>,
): Promise<number> {
  const cache = await caches.open(cacheName)
  const requests = await cache.keys()
  const obsolete = obsoleteBrainCacheUrls(
    requests.map((request) => request.url),
    activeRepositories,
  )
  await Promise.all(obsolete.map((url) => cache.delete(url)))
  return obsolete.length
}

export async function reconcileBrainModelCache(): Promise<void> {
  if (typeof caches === 'undefined') {
    brainWarn('cache', 'Cache Storage non disponibile; i modelli non possono essere conservati')
    return
  }
  const configured = configuredBrainCache()
  try {
    const [removedTextAssets, removedImageAssets] = await Promise.all([
      reconcileCache(
        TRANSFORMERS_CACHE,
        configured.transformersRepositories,
      ),
      reconcileCache(IMAGE_CACHE, configured.imageRepositories),
    ])
    brainLog('cache', 'cache modelli riconciliata con brainConfig', {
      configuredTextModels: [
        BRAIN_CONFIG.storyModelId,
        BRAIN_CONFIG.storyFallbackModelId,
        BRAIN_CONFIG.memoModelId,
        BRAIN_CONFIG.visualModelId,
        BRAIN_CONFIG.inputTranslationModelId,
        BRAIN_CONFIG.uiTranslationModelId,
      ],
      configuredImageModels: [
        BRAIN_CONFIG.imageModelId,
        BRAIN_CONFIG.highQualityImageModelId,
      ],
      removedTextAssets,
      removedImageAssets,
      policy: 'download una volta; conserva finché il modello resta in configurazione',
    })
  } catch (error) {
    brainWarn('cache', 'riconciliazione cache non completata; la pipeline continua', error)
  }
}
