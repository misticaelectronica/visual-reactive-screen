import { app, net, protocol } from 'electron'
import { access } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const BRAIN_MODEL_SCHEME = 'brain-model'

const ALLOWED_MODEL_FILES = new Set([
  'pornmaster-sd15-onnx/text_encoder/model.onnx',
  'pornmaster-sd15-onnx/unet/model.onnx',
  'psicofantasma/repertoire.json',
])

export function registerBrainModelScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: BRAIN_MODEL_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ])
}

function modelDirectories(): string[] {
  if (!app.isPackaged) {
    return [path.join(app.getAppPath(), '.model-artifacts')]
  }
  return [
    path.join(process.resourcesPath, 'brain-models'),
    path.join(path.dirname(process.execPath), 'brain-models'),
    path.join(app.getPath('userData'), 'brain-models'),
  ]
}

export function brainModelRelativePath(requestUrl: string): string | null {
  const url = new URL(requestUrl)
  const relativePath = decodeURIComponent(url.pathname)
    .replace(/^\/+/, '')
    .replaceAll('\\', '/')
  return ALLOWED_MODEL_FILES.has(relativePath) ? relativePath : null
}

async function findModelFile(relativePath: string): Promise<string | null> {
  const directories = relativePath.startsWith('psicofantasma/')
    ? app.isPackaged
      ? [path.join(app.getAppPath(), 'dist/brain-models')]
      : [path.join(app.getAppPath(), relativePath.endsWith('.json') ? 'config' : '.model-artifacts')]
    : modelDirectories()
  for (const directory of directories) {
    const candidate = path.resolve(directory, relativePath)
    if (!candidate.startsWith(`${path.resolve(directory)}${path.sep}`)) continue
    try {
      await access(candidate)
      return candidate
    } catch {
      // Prova la successiva cartella persistente consentita.
    }
  }
  return null
}

export function configureBrainModelProtocol(): void {
  protocol.handle(BRAIN_MODEL_SCHEME, async (request) => {
    const relativePath = brainModelRelativePath(request.url)
    if (!relativePath) {
      return new Response('Risorsa modello non consentita', { status: 403 })
    }
    const modelFile = await findModelFile(relativePath)
    if (!modelFile) {
      return new Response(
        `Modello locale assente: ${relativePath}`,
        { status: 404 },
      )
    }
    return net.fetch(pathToFileURL(modelFile).href)
  })
}
