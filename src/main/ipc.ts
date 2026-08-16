import { ipcMain } from 'electron'
import type {
  AppSettings,
  BrainConfigFileName,
  BrainVectorizationOptions,
  ConsciousnessMemoryDraft,
  ConsciousnessMotionQuery,
  ConsciousnessStateSnapshot,
  VisualStateAck,
  VisualStatePayload,
} from '@shared/types'
import { IPC_CHANNELS } from '@shared/types'
import { getAllDisplayInfo } from './displays'
import { loadSettingsFromDisk, saveSettingsToDisk } from './settings'
import {
  broadcastVisualState,
  closeOutputWindow,
  createOutputWindow,
  getOutputWindow,
  handleVisualStateAck,
} from './windows'
import { vectorizeBrainImageOffMainThread } from './brainVectorizerClient'
import { readBrainConfigFile } from './brainConfigFiles'
import {
  saveConsciousnessMemory,
  suggestConsciousnessMotion,
  updateConsciousnessState,
} from './consciousnessStorage'

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.getDisplays, () => getAllDisplayInfo())

  ipcMain.handle(IPC_CHANNELS.openOutput, (_e, displayId: number) => {
    return createOutputWindow(displayId)
  })

  ipcMain.handle(IPC_CHANNELS.closeOutput, () => {
    closeOutputWindow()
  })

  ipcMain.handle(IPC_CHANNELS.saveSettings, (_e, settings: AppSettings) => {
    saveSettingsToDisk(settings)
  })

  ipcMain.handle(IPC_CHANNELS.loadSettings, () => loadSettingsFromDisk())

  ipcMain.on(IPC_CHANNELS.sendVisualState, (_event, state: VisualStatePayload) => {
    broadcastVisualState(state)
  })

  ipcMain.on(IPC_CHANNELS.visualStateAck, (event, ack?: VisualStateAck) => {
    const output = getOutputWindow()
    if (!output || output.isDestroyed() || event.sender !== output.webContents) return
    handleVisualStateAck(ack ?? {})
  })

  ipcMain.handle(IPC_CHANNELS.vectorizeBrainImage, (
    _event,
    bytes: unknown,
    options?: BrainVectorizationOptions,
  ) => {
    return vectorizeBrainImageOffMainThread(bytes, options)
  })

  ipcMain.handle(
    IPC_CHANNELS.readBrainConfigFile,
    (_event, fileName: BrainConfigFileName) => readBrainConfigFile(fileName),
  )

  ipcMain.handle(
    IPC_CHANNELS.saveConsciousnessMemory,
    (_event, draft: ConsciousnessMemoryDraft) => saveConsciousnessMemory(draft),
  )

  ipcMain.handle(
    IPC_CHANNELS.updateConsciousnessState,
    (_event, snapshot: ConsciousnessStateSnapshot) =>
      updateConsciousnessState(snapshot),
  )

  ipcMain.handle(
    IPC_CHANNELS.suggestConsciousnessMotion,
    (_event, query: ConsciousnessMotionQuery) =>
      suggestConsciousnessMotion(query),
  )
}
