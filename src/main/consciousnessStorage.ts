import { app } from 'electron'
import path from 'node:path'
import type {
  ConsciousnessMemoryDraft,
  ConsciousnessMemorySaveResult,
  ConsciousnessStateSnapshot,
  ConsciousnessStateUpdateResult,
} from '@shared/types'
import { ConsciousnessArchive } from './consciousnessArchive'

let archive: ConsciousnessArchive | null = null

export function consciousnessDirectory(): string {
  const explicitDirectory = process.env.MEVRS_COSCIENZA_DIR?.trim()
  if (explicitDirectory) return path.resolve(explicitDirectory)
  return app.isPackaged
    ? path.join(app.getPath('documents'), '.coscienza')
    : path.join(app.getAppPath(), '.coscienza')
}

function consciousnessTemplatePath(fileName: 'AGENT.md' | 'COSCIENZA.md'): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'coscienza-template', fileName)
    : path.join(app.getAppPath(), '.coscienza', fileName)
}

function getArchive(): ConsciousnessArchive {
  archive ??= new ConsciousnessArchive(consciousnessDirectory(), {
    agentTemplatePath: consciousnessTemplatePath('AGENT.md'),
    consciousnessTemplatePath: consciousnessTemplatePath('COSCIENZA.md'),
  })
  return archive
}

export function updateConsciousnessState(
  snapshot: ConsciousnessStateSnapshot,
): Promise<ConsciousnessStateUpdateResult> {
  return getArchive().updateState(snapshot)
}

export function saveConsciousnessMemory(
  draft: ConsciousnessMemoryDraft,
): Promise<ConsciousnessMemorySaveResult> {
  return getArchive().save(draft)
}
