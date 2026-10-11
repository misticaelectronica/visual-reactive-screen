import { ipcMain } from 'electron'
import type {
  AppSettings,
  BrainConfigFileName,
  BrainVectorizationOptions,
  ConsciousnessMemoryDraft,
  ConsciousnessMotionQuery,
  ConsciousnessStateSnapshot,
  DmxInterface,
  DmxProducerCommand,
  SaveDreamImageRequest,
  VisualStateAck,
  VisualStatePayload,
} from '@shared/types'
import { IPC_CHANNELS } from '@shared/types'
import { getAllDisplayInfo } from './displays'
import { dmxCaptureScreen, dmxClose, dmxOpen, dmxSend } from './dmxSerial'
import { loadSettingsFromDisk, saveSettingsToDisk } from './settings'
import {
  broadcastVisualState,
  closeOutputWindow,
  createOutputWindow,
  getControlWindow,
  getOutputWindow,
  handleVisualStateAck,
} from './windows'
import { vectorizeBrainImageOffMainThread } from './brainVectorizerClient'
import { readBrainConfigFile, writeBrainPhrasesFile } from './brainConfigFiles'
import { startPublicPhraseSession, stopPublicPhraseSession } from './publicPhraseSession'
import {
  saveConsciousnessMemory,
  suggestConsciousnessMotion,
  updateConsciousnessState,
} from './consciousnessStorage'
import {
  loadDreamImages,
  queryDreamImageEntries,
  saveDreamImage,
} from './dreamImageArchiveStorage'

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
    IPC_CHANNELS.writeBrainPhrasesFile,
    (_event, content: string) => writeBrainPhrasesFile(content),
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

  ipcMain.handle(
    IPC_CHANNELS.saveDreamImage,
    (_event, request: SaveDreamImageRequest) => saveDreamImage(request),
  )

  ipcMain.handle(
    IPC_CHANNELS.queryDreamImageEntries,
    () => queryDreamImageEntries(),
  )

  ipcMain.handle(
    IPC_CHANNELS.loadDreamImages,
    (_event, fileNames: string[]) => loadDreamImages(fileNames),
  )

  ipcMain.handle(
    IPC_CHANNELS.publicSessionStart,
    (_event, csvUrl: string, formUrl: string) =>
      startPublicPhraseSession(csvUrl, formUrl),
  )

  ipcMain.handle(IPC_CHANNELS.publicSessionStop, () => stopPublicPhraseSession())
  ipcMain.handle(IPC_CHANNELS.dmxOpen, (_e, kind: DmxInterface) => dmxOpen(kind))
  ipcMain.handle(IPC_CHANNELS.dmxSend, (_e, universe: Uint8Array) => dmxSend(universe))
  ipcMain.handle(IPC_CHANNELS.dmxClose, () => dmxClose())
  ipcMain.handle(IPC_CHANNELS.dmxCaptureScreen, () => dmxCaptureScreen(getOutputWindow()))
  ipcMain.on(IPC_CHANNELS.dmxProducer, (_e, command: DmxProducerCommand) => {
    getControlWindow()?.webContents.send(IPC_CHANNELS.dmxProducerPush, command)
  })
}
