import path from 'node:path'
import { app, BrowserWindow, screen } from 'electron'
import { IPC_CHANNELS } from '@shared/types'

let controlWindow: BrowserWindow | null = null
let outputWindow: BrowserWindow | null = null
let latestVisualState: unknown = null

/** Radice dell'app (cartella del `package.json` in dev; contenuto asar/app in release). */
function appResourceRoot(): string {
  return app.getAppPath()
}

function preloadPath(): string {
  return path.join(appResourceRoot(), 'dist-electron', 'preload.cjs')
}

function iconPath(): string {
  return path.join(appResourceRoot(), 'build', 'icon.png')
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
    title: 'Mistica Electronica Visual Reactive Screen',
    icon: iconPath(),
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  })

  if (import.meta.env.DEV && process.env.VITE_DEV_SERVER_URL) {
    void controlWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}/control.html`)
  } else {
    void controlWindow.loadFile(path.join(appResourceRoot(), 'dist', 'control.html'))
  }
  controlWindow.on('closed', () => {
    controlWindow = null
    closeOutputWindow()
    app.quit()
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

  console.log(`[main] target display: id=${target.id} bounds=${JSON.stringify(target.bounds)} scaleFactor=${target.scaleFactor}`)

  closeOutputWindow()

  const ensureOutputVisible = () => {
    const win = outputWindow
    if (!win || win.isDestroyed()) return

    console.log('[main] ensuring output window is visible')
    win.setBounds(target.bounds)
    if (process.platform === 'darwin') {
      win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    }
    win.setAlwaysOnTop(true, 'screen-saver')
    win.show()
    if (process.platform === 'darwin') {
      win.setKiosk(true)
    } else {
      win.setFullScreen(true)
    }
    win.focus()

    if (latestVisualState) {
      win.webContents.send(IPC_CHANNELS.visualStatePush, latestVisualState)
    }
  }

  outputWindow = new BrowserWindow({
    x: target.bounds.x,
    y: target.bounds.y,
    width: target.bounds.width,
    height: target.bounds.height,
    frame: false,
    backgroundColor: '#170204',
    show: true,
    skipTaskbar: true,
    autoHideMenuBar: true,
    icon: iconPath(),
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  })

  outputWindow.once('ready-to-show', ensureOutputVisible)
  outputWindow.webContents.once('did-finish-load', ensureOutputVisible)
  const showFallback = setTimeout(ensureOutputVisible, 500)

  // Diagnostic logging
  outputWindow.webContents.on('did-fail-load', (_e, errCode, errDesc) => {
    clearTimeout(showFallback)
    console.error(`[main] output did-fail-load: ${errCode} ${errDesc}`)
  })
  outputWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error(`[main] output render-process-gone:`, details)
  })
  outputWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    console.log(`[output renderer:${level}] ${message} (${sourceId}:${line})`)
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
    clearTimeout(showFallback)
    console.log('[main] output window CLOSED')
    outputWindow = null
    const cw = controlWindow
    if (cw && !cw.isDestroyed()) {
      cw.webContents.send(IPC_CHANNELS.outputClosed)
    }
  })

  return { ok: true }
}

export function broadcastVisualState(payload: unknown): void {
  latestVisualState = payload
  if (outputWindow && !outputWindow.isDestroyed()) {
    outputWindow.webContents.send(IPC_CHANNELS.visualStatePush, payload)
  }
}
