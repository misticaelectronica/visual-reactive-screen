import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { DreamImageArchiveEntry } from '@shared/brain/dreamRevisionCycle'
import { pruneArchiveEntriesForTag } from '@shared/brain/dreamRevisionCycle'

const INDEX_FILE_NAME = 'index.json'

export type SaveDreamImageRequest = {
  tag: string
  storyId: string
  frameId: string
  frameIndex: number
  energy: number
  title: string
  bytes: Uint8Array
}

export type LoadedDreamImage = {
  fileName: string
  bytes: Uint8Array
}

export type DreamImageArchiveOptions = {
  now?: () => number
  archiveCapPerTag?: number
}

/**
 * Archivio su disco delle immagini "già generate", indicizzate per tag
 * (fase onirica + stato bioenergetico). Separato da `.coscienza/` perché
 * è un asset tecnico (byte di immagine), non memoria autobiografica —
 * PIANO-034. Progettato per essere costruito con una directory qualunque
 * (test-friendly, vedi `consciousnessArchive.test.ts` per il precedente).
 */
export class DreamImageArchive {
  private readonly now: () => number
  private readonly capPerTag: number | undefined

  constructor(
    private readonly directory: string,
    options: DreamImageArchiveOptions = {},
  ) {
    this.now = options.now ?? (() => Date.now())
    this.capPerTag = options.archiveCapPerTag
  }

  private indexPath(): string {
    return path.join(this.directory, INDEX_FILE_NAME)
  }

  private async readIndex(): Promise<DreamImageArchiveEntry[]> {
    try {
      const text = await readFile(this.indexPath(), 'utf8')
      const parsed = JSON.parse(text)
      return Array.isArray(parsed) ? (parsed as DreamImageArchiveEntry[]) : []
    } catch {
      return []
    }
  }

  private async writeIndex(entries: DreamImageArchiveEntry[]): Promise<void> {
    await mkdir(this.directory, { recursive: true })
    await writeFile(this.indexPath(), JSON.stringify(entries, null, 2), 'utf8')
  }

  async save(request: SaveDreamImageRequest): Promise<{ ok: boolean }> {
    try {
      await mkdir(this.directory, { recursive: true })
      const fileName = `${this.now()}--${request.storyId}--${request.frameId}.webp`
      await writeFile(path.join(this.directory, fileName), Buffer.from(request.bytes))
      const entries = await this.readIndex()
      const entry: DreamImageArchiveEntry = {
        fileName,
        tag: request.tag,
        storyId: request.storyId,
        frameId: request.frameId,
        frameIndex: request.frameIndex,
        energy: request.energy,
        createdAt: this.now(),
        title: request.title,
      }
      const { kept, evicted } = pruneArchiveEntriesForTag(
        [...entries, entry],
        request.tag,
        this.capPerTag,
      )
      await Promise.all(
        evicted.map((evictedEntry) =>
          unlink(path.join(this.directory, evictedEntry.fileName)).catch(() => undefined)
        ),
      )
      await this.writeIndex(kept)
      return { ok: true }
    } catch {
      return { ok: false }
    }
  }

  async queryEntries(): Promise<DreamImageArchiveEntry[]> {
    return this.readIndex()
  }

  async loadImages(fileNames: readonly string[]): Promise<LoadedDreamImage[]> {
    const results: LoadedDreamImage[] = []
    for (const fileName of fileNames) {
      try {
        const bytes = await readFile(path.join(this.directory, fileName))
        results.push({ fileName, bytes: new Uint8Array(bytes) })
      } catch {
        // Immagine mancante/corrotta: si salta, il chiamante lavora con
        // quelle disponibili — mai un fallimento rumoroso per un file.
      }
    }
    return results
  }
}
