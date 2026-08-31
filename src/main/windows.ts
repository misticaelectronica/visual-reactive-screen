import path from 'node:path'
import { app, BrowserWindow, globalShortcut, screen } from 'electron'
import {
  IPC_CHANNELS,
  type PublicSessionStatus,
  type VisualStateAck,
  type VisualStatePayload,
} from '@shared/types'
import { attachRendererLogging } from './sessionLogger'
import { VisualStateCoalescer } from './visualStateCoalescer'

let controlWindow: BrowserWindow | null = null
let outputWindow: BrowserWindow | null = null
let latestVisualState: VisualStatePayload | null = null
let outputRendererReady = false

const visualStateCoalescer = new VisualStateCoalescer<VisualStatePayload>(
  (payload, stats) => {
    const win = outputWindow
    if (!win || win.isDestroyed()) return
    const performanceTelemetry = payload.performanceTelemetry
      ? {
          ...payload.performanceTelemetry,
          replacedPendingCount: stats.replacedPendingCount,
        }
      : undefined
    win.webContents.send(IPC_CHANNELS.visualStatePush, {
      ...payload,
      ...(performanceTelemetry ? { performanceTelemetry } : {}),
    })
  },
  (payload) => payload.sequenceNumber,
)

export function resetOutputAckState(): void {
  outputRendererReady = false
  visualStateCoalescer.reset()
}

export function handleVisualStateAck(ack: VisualStateAck): void {
  if (ack.ready) {
    // Handshake (anche dopo reload/StrictMode): riparte sempre dall'ultimo stato.
    outputRendererReady = true
    visualStateCoalescer.reset()
    if (latestVisualState) visualStateCoalescer.enqueue(latestVisualState)
    return
  }
  if (!outputRendererReady) return
  visualStateCoalescer.acknowledge(ack.sequenceNumber)
}

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
  attachRendererLogging(controlWindow.webContents, 'control')

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

// PIANO-040: Maiusc+B per l'overlay diagnostico bio-percettivo. Registrato a
// livello OS (non un keydown del renderer Output) perché nella
// configurazione a due finestre l'Output — fullscreen, sempre in primo
// piano sul proiettore — quasi mai ha il fuoco della tastiera: chi opera il
// set lo preme mentre guarda/lavora sulla finestra Control. Attivo solo
// mentre l'Output esiste, per non sottrarre la combinazione altrove
// nell'app o al sistema quando non serve.
const BIO_OVERLAY_SHORTCUT = 'Shift+B'

function registerBioOverlayShortcut(): void {
  if (globalShortcut.isRegistered(BIO_OVERLAY_SHORTCUT)) return
  globalShortcut.register(BIO_OVERLAY_SHORTCUT, () => {
    const win = outputWindow
    if (!win || win.isDestroyed()) return
    win.webContents.send(IPC_CHANNELS.toggleBioOverlay)
  })
}

function unregisterBioOverlayShortcut(): void {
  if (globalShortcut.isRegistered(BIO_OVERLAY_SHORTCUT)) {
    globalShortcut.unregister(BIO_OVERLAY_SHORTCUT)
  }
}

export function closeOutputWindow(): void {
  resetOutputAckState()
  unregisterBioOverlayShortcut()
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

  let outputShouldBeFullscreen = true
  const windowedBounds = {
    x: target.workArea.x + Math.round(target.workArea.width * 0.1),
    y: target.workArea.y + Math.round(target.workArea.height * 0.1),
    width: Math.round(target.workArea.width * 0.8),
    height: Math.round(target.workArea.height * 0.8),
  }

  const leaveOutputFullscreen = () => {
    const win = outputWindow
    if (!win || win.isDestroyed() || !outputShouldBeFullscreen) return

    outputShouldBeFullscreen = false
    console.log('[main] leaving output fullscreen via Escape')
    win.setKiosk(false)
    win.setFullScreen(false)
    if (process.platform === 'darwin') {
      win.setSimpleFullScreen(false)
      win.setVisibleOnAllWorkspaces(false)
    }
    win.setAlwaysOnTop(false)
    win.setBounds(windowedBounds)
    win.show()
    win.focus()
  }

  const ensureOutputVisible = () => {
    const win = outputWindow
    if (!win || win.isDestroyed()) return

    console.log('[main] ensuring output window is visible')
    win.setBounds(outputShouldBeFullscreen ? target.bounds : windowedBounds)
    win.show()
    if (outputShouldBeFullscreen) {
      if (process.platform === 'darwin') {
        win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
        win.setKiosk(true)
      } else {
        win.setFullScreen(true)
      }
      win.setAlwaysOnTop(true, 'screen-saver')
    }
    win.focus()
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
  attachRendererLogging(outputWindow.webContents, 'output')
  outputWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') {
      event.preventDefault()
      leaveOutputFullscreen()
    }
  })
  outputWindow.webContents.on('did-fail-load', () => {
    clearTimeout(showFallback)
  })
  outputWindow.webContents.on('did-start-loading', resetOutputAckState)

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
    resetOutputAckState()
    unregisterBioOverlayShortcut()
    outputWindow = null
    const cw = controlWindow
    if (cw && !cw.isDestroyed()) {
      cw.webContents.send(IPC_CHANNELS.outputClosed)
    }
  })

  registerBioOverlayShortcut()

  return { ok: true }
}

export function broadcastVisualState(payload: VisualStatePayload): void {
  latestVisualState = payload
  if (!outputWindow || outputWindow.isDestroyed()) {
    resetOutputAckState()
    return
  }
  if (!outputRendererReady) return
  visualStateCoalescer.enqueue(payload)
}

export function pushPublicSessionStatus(status: PublicSessionStatus): void {
  if (controlWindow && !controlWindow.isDestroyed()) {
    controlWindow.webContents.send(IPC_CHANNELS.publicSessionStatus, status)
  }
  if (outputWindow && !outputWindow.isDestroyed()) {
    outputWindow.webContents.send(IPC_CHANNELS.publicSessionStatus, status)
  }
}

/** Un nuovo input online: Brain gli dedica subito una storia (vedi brainController.ts). */
export function pushPublicOnlinePhrase(text: string): void {
  if (!outputWindow || outputWindow.isDestroyed()) {
    console.warn(
      '[windows] pushPublicOnlinePhrase: nessuna finestra di uscita aperta, input online perso',
      { preview: text.slice(0, 80) },
    )
    return
  }
  console.log('[windows] pushPublicOnlinePhrase inviato alla finestra di uscita', {
    preview: text.slice(0, 80),
  })
  outputWindow.webContents.send(IPC_CHANNELS.publicOnlinePhrase, text)
}
