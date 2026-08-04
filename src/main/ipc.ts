import { ipcMain } from 'electron'
import type {
  AppSettings,
  BrainConfigFileName,
  BrainVectorizationOptions,
  VisualStatePayload,
} from '@shared/types'
import { IPC_CHANNELS } from '@shared/types'
import { getAllDisplayInfo } from './displays'
import { loadSettingsFromDisk, saveSettingsToDisk } from './settings'
import {
  broadcastVisualState,
  closeOutputWindow,
  createOutputWindow,
  handleVisualStateAck,
} from './windows'
import { vectorizeBrainImage } from './brainVectorizer'
import { readBrainConfigFile } from './brainConfigFiles'

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

  ipcMain.on(IPC_CHANNELS.visualStateAck, () => {
    handleVisualStateAck()
  })

  ipcMain.handle(IPC_CHANNELS.vectorizeBrainImage, (
    _event,
    bytes: unknown,
    options?: BrainVectorizationOptions,
  ) => {
    return vectorizeBrainImage(bytes, options)
  })

  ipcMain.handle(
    IPC_CHANNELS.readBrainConfigFile,
    (_event, fileName: BrainConfigFileName) => readBrainConfigFile(fileName),
  )
}
