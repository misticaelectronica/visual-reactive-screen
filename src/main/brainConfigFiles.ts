import { app } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
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

function baseStoryFilePath(): string {
  return path.join(brainConfigDirectory(), 'brainPhrasesBaseStory.txt')
}

function brainPhrasesFilePath(): string {
  return path.join(brainConfigDirectory(), 'brainPhrases.txt')
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

/**
 * `config/brainPhrasesBaseStory.txt` è il set curato a mano, eterno, mai
 * scritto da noi. `config/brainPhrases.txt` è invece il file che Brain
 * legge davvero — durante una sessione online il suo contenuto è quello
 * raccolto dal pubblico; a sessione chiusa (compreso l'avvio dell'app,
 * quando nessuna sessione può essere aperta) torna al set curato.
 */
export async function resetBrainPhrasesToBase(): Promise<void> {
  const base = await readFile(baseStoryFilePath(), 'utf8')
  await writeFile(brainPhrasesFilePath(), base, 'utf8')
}

/** Come `resetBrainPhrasesToBase`, ma non fa crashare l'avvio se il file base manca ancora. */
export async function resetBrainPhrasesToBaseIfPossible(): Promise<void> {
  try {
    await resetBrainPhrasesToBase()
  } catch (error) {
    console.warn(
      `[brainConfigFiles] impossibile ripristinare brainPhrases.txt da brainPhrasesBaseStory.txt: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }
}

/**
 * BrainPhrasesBaseStory di Sessione (disp. Capo Supremo 2026-09-18): il
 * renderer possiede il cursore della sequenza (`phraseCursor`) e decide
 * dove inserire un input appena arrivato (`insertPhraseAtCursor` in
 * `brainPhrases.ts`); main si limita a scrivere il contenuto già composto,
 * senza conoscere la posizione.
 */
export async function writeBrainPhrasesFile(content: string): Promise<void> {
  await writeFile(brainPhrasesFilePath(), content, 'utf8')
}
