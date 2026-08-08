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

function agentTemplatePath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'coscienza-template', 'AGENT.md')
    : path.join(app.getAppPath(), '.coscienza', 'AGENT.md')
}

function consciousnessTemplatePath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'coscienza-template', 'COSCIENZA.md')
    : path.join(app.getAppPath(), 'config', 'coscienza', 'COSCIENZA.md')
}

function getArchive(): ConsciousnessArchive {
  archive ??= new ConsciousnessArchive(consciousnessDirectory(), {
    agentTemplatePath: agentTemplatePath(),
    consciousnessTemplatePath: consciousnessTemplatePath(),
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
