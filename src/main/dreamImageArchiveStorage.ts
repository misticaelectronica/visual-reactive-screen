import { app } from 'electron'
import path from 'node:path'
import type { DreamImageArchiveEntry } from '@shared/brain/dreamRevisionCycle'
import { DreamImageArchive, type LoadedDreamImage, type SaveDreamImageRequest } from './dreamImageArchive'

let archive: DreamImageArchive | null = null

export function dreamImageArchiveDirectory(): string {
  const explicitDirectory = process.env.MEVRS_DREAM_IMAGES_DIR?.trim()
  if (explicitDirectory) return path.resolve(explicitDirectory)
  return app.isPackaged
    ? path.join(app.getPath('documents'), 'dream-images')
    : path.join(app.getAppPath(), 'dream-images')
}

function getArchive(): DreamImageArchive {
  archive ??= new DreamImageArchive(dreamImageArchiveDirectory())
  return archive
}

export function saveDreamImage(request: SaveDreamImageRequest): Promise<{ ok: boolean }> {
  return getArchive().save(request)
}

export function queryDreamImageEntries(): Promise<DreamImageArchiveEntry[]> {
  return getArchive().queryEntries()
}

export function loadDreamImages(fileNames: readonly string[]): Promise<LoadedDreamImage[]> {
  return getArchive().loadImages(fileNames)
}
