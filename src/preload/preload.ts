import { contextBridge, ipcRenderer } from 'electron'
import {
  IPC_CHANNELS,
  type AppSettings,
  type ControlApi,
  type DisplayInfo,
  type OutputApi,
  type VisualStatePayload,
} from '@shared/types'

const controlApi: ControlApi = {
  getDisplays: () => ipcRenderer.invoke(IPC_CHANNELS.getDisplays) as Promise<DisplayInfo[]>,
  openOutput: (displayId: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.openOutput, displayId) as Promise<{
      ok: boolean
      error?: string
    }>,
  closeOutput: () => ipcRenderer.invoke(IPC_CHANNELS.closeOutput) as Promise<void>,
  saveSettings: (settings: AppSettings) =>
    ipcRenderer.invoke(IPC_CHANNELS.saveSettings, settings) as Promise<void>,
  loadSettings: () =>
    ipcRenderer.invoke(IPC_CHANNELS.loadSettings) as Promise<AppSettings | null>,
  sendVisualState: (state: VisualStatePayload) => {
    ipcRenderer.send(IPC_CHANNELS.sendVisualState, state)
  },
  onOutputClosed: (cb: () => void) => {
    const channel = IPC_CHANNELS.outputClosed
    const handler = () => cb()
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },
}

const outputApi: OutputApi = {
  onVisualState: (cb: (state: VisualStatePayload) => void) => {
    const handler = (_event: unknown, state: VisualStatePayload) => {
      cb(state)
    }
    ipcRenderer.on(IPC_CHANNELS.visualStatePush, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.visualStatePush, handler)
  },
}

function isOutputEntry(): boolean {
  const href = window.location.href
  return href.includes('output.html')
}

const role = isOutputEntry() ? 'output' : 'control'
console.log(`[preload] href=${window.location.href} role=${role}`)

if (isOutputEntry()) {
  contextBridge.exposeInMainWorld('fxOutput', outputApi)
  console.log('[preload] exposed fxOutput')
} else {
  contextBridge.exposeInMainWorld('fxControl', controlApi)
  console.log('[preload] exposed fxControl')
}
