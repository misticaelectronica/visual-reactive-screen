import { app, BrowserWindow, session, systemPreferences } from 'electron'
import { registerIpcHandlers } from './ipc'
import { createControlWindow, closeOutputWindow } from './windows'

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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createControlWindow()
  }
})

app.whenReady().then(async () => {
  configureMediaPermissions()
  await requestMacMicrophonePermission()
  registerIpcHandlers()
  createControlWindow()
})

app.on('before-quit', () => {
  closeOutputWindow()
})
