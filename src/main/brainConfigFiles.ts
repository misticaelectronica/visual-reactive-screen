import { app } from 'electron'
import { appendFile, readFile, writeFile } from 'node:fs/promises'
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
 * Una riga del CSV può contenere newline al suo interno (risposta
 * multi-riga del Form): se finisse così com'è dentro `brainPhrases.txt`,
 * il campionamento a riga (`parseBrainPhrases`) la spezzerebbe in più frasi
 * scollegate. Una riga del CSV deve restare una riga del file.
 */
function collapseToSingleLine(text: string): string {
  return text.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Apertura sessione: sovrascrive brainPhrases.txt con tutto ciò che è già nel foglio online. */
export async function overwriteBrainPhrasesWithOnlineRows(rows: string[]): Promise<void> {
  const content = rows.map((row) => `${collapseToSingleLine(row)}\n`).join('')
  await writeFile(brainPhrasesFilePath(), content, 'utf8')
}

/** Nuova riga online durante la sessione: si aggiunge in coda a brainPhrases.txt. */
export async function appendOnlinePhraseToBrainPhrases(text: string): Promise<void> {
  await appendFile(brainPhrasesFilePath(), `${collapseToSingleLine(text)}\n`, 'utf8')
}
