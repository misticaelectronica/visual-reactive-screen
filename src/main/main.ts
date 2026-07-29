import path from 'node:path'
import { app, BrowserWindow, nativeImage, session, systemPreferences } from 'electron'
import { registerIpcHandlers } from './ipc'
import { createControlWindow, closeOutputWindow } from './windows'
import {
  configureBrainModelProtocol,
  registerBrainModelScheme,
} from './brainModelProtocol'
import { closeSessionLogger, installSessionLogger } from './sessionLogger'

installSessionLogger()
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.commandLine.appendSwitch('force-gpu-mem-available-mb', '4096')
app.commandLine.appendSwitch('max-gpu-memory-buffer-size', '4096')
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('ignore-gpu-blocklist')
registerBrainModelScheme()

function configureMediaPermissions(): void {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media')
  })

  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    return permission === 'media'
  })
}

async function requestMacMicrophonePermission(): Promise<void> {
  if (process.platform !== 'darwin') return

  const status = systemPreferences.getMediaAccessStatus('microphone')
  if (status !== 'not-determined') return

  await systemPreferences.askForMediaAccess('microphone').catch(() => false)
}

function configureAppIcon(): void {
  const icon = nativeImage.createFromPath(path.join(app.getAppPath(), 'build', 'icon.png'))
  if (icon.isEmpty()) return
  if (process.platform === 'darwin') {
    app.dock?.setIcon(icon)
  }
}

app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createControlWindow()
  }
})

app.whenReady().then(async () => {
  configureAppIcon()
  configureMediaPermissions()
  configureBrainModelProtocol()
  await requestMacMicrophonePermission()
  registerIpcHandlers()
  createControlWindow()
})

app.on('before-quit', () => {
  closeOutputWindow()
  closeSessionLogger()
})
