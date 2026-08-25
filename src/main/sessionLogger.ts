import { app, type WebContents } from 'electron'
import { createWriteStream, mkdirSync, type WriteStream } from 'node:fs'
import path from 'node:path'
import { formatWithOptions } from 'node:util'

type ConsoleLevel = 'debug' | 'info' | 'log' | 'warn' | 'error'

const SESSION_STARTED_AT = new Date()
const originalConsole = {
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
}

let logStream: WriteStream | null = null
let sessionLogPath: string | null = null
let installed = false

function twoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

export function sessionLogFileName(startedAt: Date): string {
  return [
    'session',
    startedAt.getFullYear(),
    twoDigits(startedAt.getMonth() + 1),
    twoDigits(startedAt.getDate()),
    twoDigits(startedAt.getHours()),
    twoDigits(startedAt.getMinutes()),
    twoDigits(startedAt.getSeconds()),
  ].join('-') + '.txt'
}

export function sessionLogDirectory(): string {
  const root = app.isPackaged
    ? path.dirname(process.execPath)
    : app.getAppPath()
  return path.join(root, 'log')
}

function appendLine(level: ConsoleLevel, args: unknown[]): void {
  if (!logStream) return
  const timestamp = new Date().toISOString()
  const message = formatWithOptions(
    {
      colors: false,
      depth: null,
      maxArrayLength: null,
      maxStringLength: null,
      breakLength: 120,
      compact: false,
    },
    ...args,
  )
  logStream.write(`[${timestamp}] [${level.toUpperCase()}] ${message}\n`)
}

function replaceConsoleMethod(level: ConsoleLevel): void {
  console[level] = (...args: unknown[]) => {
    appendLine(level, args)
    originalConsole[level](...args)
  }
}

function serializeFailure(error: unknown): unknown {
  if (!(error instanceof Error)) return error
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    cause: error.cause,
  }
}

export function installSessionLogger(): string {
  if (installed && sessionLogPath) return sessionLogPath
  installed = true
  const directory = sessionLogDirectory()
  mkdirSync(directory, { recursive: true })
  sessionLogPath = path.join(directory, sessionLogFileName(SESSION_STARTED_AT))
  logStream = createWriteStream(sessionLogPath, {
    flags: 'a',
    encoding: 'utf8',
  })
  logStream.on('error', (error) => {
    logStream = null
    originalConsole.error('[session-log] scrittura fallita', error)
  })

  for (const level of ['debug', 'info', 'log', 'warn', 'error'] as const) {
    replaceConsoleMethod(level)
  }

  process.on('uncaughtExceptionMonitor', (error, origin) => {
    appendLine('error', [
      '[process] eccezione non gestita',
      { origin, error: serializeFailure(error) },
    ])
  })
  process.on('unhandledRejection', (reason) => {
    appendLine('error', [
      '[process] Promise rifiutata senza gestione',
      serializeFailure(reason),
    ])
  })

  appendLine('info', [
    '[session] avvio',
    {
      startedAt: SESSION_STARTED_AT.toISOString(),
      pid: process.pid,
      appPath: app.getAppPath(),
      packaged: app.isPackaged,
    },
  ])
  console.log(`[main] session log: ${sessionLogPath}`)
  return sessionLogPath
}

export function attachRendererLogging(
  webContents: WebContents,
  label: 'control' | 'output',
): void {
  webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[${label} renderer:${level}] ${message} (${sourceId}:${line})`)
  })
  webContents.on('render-process-gone', (_event, details) => {
    console.error(`[main] ${label} render-process-gone`, details)
  })
  webContents.on('unresponsive', () => {
    console.error(`[main] ${label} renderer non risponde`)
  })
  webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedUrl) => {
    console.error(
      `[main] ${label} did-fail-load: ${errorCode} ${errorDescription} ${validatedUrl}`,
    )
  })
}

export function closeSessionLogger(): void {
  if (!logStream) return
  appendLine('info', ['[session] chiusura'])
  logStream.end()
  logStream = null
}
