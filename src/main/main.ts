import { app, BrowserWindow } from 'electron'
import { registerIpcHandlers } from './ipc'
import { createControlWindow, closeOutputWindow } from './windows'

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

app.whenReady().then(() => {
  registerIpcHandlers()
  createControlWindow()
})

app.on('before-quit', () => {
  closeOutputWindow()
})
