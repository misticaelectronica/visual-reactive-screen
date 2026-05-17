import path from 'node:path'
import { app, BrowserWindow, screen } from 'electron'
import { IPC_CHANNELS } from '@shared/types'

let controlWindow: BrowserWindow | null = null
let outputWindow: BrowserWindow | null = null

/** Radice dell'app (cartella del `package.json` in dev; contenuto asar/app in release). */
function appResourceRoot(): string {
  return app.getAppPath()
}

function preloadPath(): string {
  return path.join(appResourceRoot(), 'dist-electron', 'preload.cjs')
}

export function getControlWindow(): BrowserWindow | null {
  return controlWindow
}

export function getOutputWindow(): BrowserWindow | null {
  return outputWindow
}

export function createControlWindow(): BrowserWindow {
  if (controlWindow && !controlWindow.isDestroyed()) {
    controlWindow.focus()
    return controlWindow
  }

  const primary = screen.getPrimaryDisplay()
  const margin = 40
  controlWindow = new BrowserWindow({
    x: primary.workArea.x + margin,
    y: primary.workArea.y + margin,
    width: 980,
    height: 900,
    title: 'Origine FX',
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (import.meta.env.DEV && process.env.VITE_DEV_SERVER_URL) {
    void controlWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}/control.html`)
  } else {
    void controlWindow.loadFile(path.join(appResourceRoot(), 'dist', 'control.html'))
  }
  // DEBUG: always open devtools
  controlWindow.webContents.openDevTools({ mode: 'detach' })

  controlWindow.on('closed', () => {
    controlWindow = null
  })

  return controlWindow
}

export function closeOutputWindow(): void {
  if (outputWindow && !outputWindow.isDestroyed()) {
    outputWindow.close()
  }
  outputWindow = null
}

export function createOutputWindow(displayId: number): { ok: true } | { ok: false; error: string } {
  console.log(`[main] createOutputWindow called displayId=${displayId}`)
  const displays = screen.getAllDisplays()
  const target = displays.find((d) => d.id === displayId)
  if (!target) {
    return { ok: false, error: 'Display non trovato' }
  }

  closeOutputWindow()

  outputWindow = new BrowserWindow({
    x: target.bounds.x,
    y: target.bounds.y,
    width: target.bounds.width,
    height: target.bounds.height,
    frame: false,
    // On macOS, simpleFullscreen avoids the Space animation that can crash frameless windows
    simpleFullscreen: process.platform === 'darwin',
    fullscreen: process.platform !== 'darwin',
    backgroundColor: '#050005',
    show: false,   // wait for ready-to-show before displaying
    skipTaskbar: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // Show only when ready to avoid flash
  outputWindow.once('ready-to-show', () => {
    console.log('[main] output window ready-to-show')
    outputWindow?.show()
    if (process.platform === 'darwin') {
      outputWindow?.setSimpleFullScreen(true)
    } else {
      outputWindow?.setFullScreen(true)
    }
  })

  // Diagnostic logging
  outputWindow.webContents.on('did-fail-load', (_e, errCode, errDesc) => {
    console.error(`[main] output did-fail-load: ${errCode} ${errDesc}`)
  })
  outputWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error(`[main] output render-process-gone:`, details)
  })

  if (import.meta.env.DEV && process.env.VITE_DEV_SERVER_URL) {
    void outputWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}/output.html`)
  } else {
    const filePath = path.join(appResourceRoot(), 'dist', 'output.html')
    console.log(`[main] loading output.html from ${filePath}`)
    void outputWindow.loadFile(filePath)
  }

  outputWindow.setMenuBarVisibility(false)

  outputWindow.on('closed', () => {
    console.log('[main] output window CLOSED')
    outputWindow = null
    const cw = controlWindow
    if (cw && !cw.isDestroyed()) {
      cw.webContents.send(IPC_CHANNELS.outputClosed)
    }
  })

  return { ok: true }
}

let _broadcastCount = 0
export function broadcastVisualState(payload: unknown): void {
  _broadcastCount++
  if (_broadcastCount <= 5 || _broadcastCount % 120 === 0) {
    const hasWin = outputWindow !== null && !outputWindow.isDestroyed()
    console.log(`[main] broadcast #${_broadcastCount} outputWindow=${hasWin}`)
  }
  if (outputWindow && !outputWindow.isDestroyed()) {
    outputWindow.webContents.send(IPC_CHANNELS.visualStatePush, payload)
  }
}
