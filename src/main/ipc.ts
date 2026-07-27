import { ipcMain } from 'electron'
import type { AppSettings, VisualStatePayload } from '@shared/types'
import { IPC_CHANNELS } from '@shared/types'
import { getAllDisplayInfo } from './displays'
import { loadSettingsFromDisk, saveSettingsToDisk } from './settings'
import {
  broadcastVisualState,
  closeOutputWindow,
  createOutputWindow,
} from './windows'
import { vectorizeBrainImage } from './brainVectorizer'

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

  ipcMain.handle(IPC_CHANNELS.vectorizeBrainImage, (_event, bytes: unknown) => {
    return vectorizeBrainImage(bytes)
  })
}
