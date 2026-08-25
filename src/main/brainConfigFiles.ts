import { app } from 'electron'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { BrainConfigFileName } from '@shared/types'

const ALLOWED_BRAIN_CONFIG_FILES = new Set<BrainConfigFileName>([
  'brainPhrases.txt',
  'brainRendering.json',
])

export function brainConfigDirectory(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'config')
    : path.join(app.getAppPath(), 'config')
}

export async function readBrainConfigFile(
  fileName: BrainConfigFileName,
): Promise<string> {
  if (!ALLOWED_BRAIN_CONFIG_FILES.has(fileName)) {
    throw new Error(`File di configurazione Brain non consentito: ${fileName}`)
  }
  const configDirectory = brainConfigDirectory()
  const filePath = path.join(configDirectory, fileName)
  if (path.dirname(filePath) !== configDirectory) {
    throw new Error(`Percorso di configurazione Brain non valido: ${fileName}`)
  }
  try {
    return await readFile(filePath, 'utf8')
  } catch (error) {
    throw new Error(
      `Impossibile leggere ${filePath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    )
  }
}
