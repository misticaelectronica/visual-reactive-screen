export type BrainLogEntry = {
  level: 'info' | 'warn'
  stage: string
  message: string
  data?: unknown
  timestamp: number
}

type BrainLogListener = (entry: BrainLogEntry) => void

const listeners = new Set<BrainLogListener>()

export function subscribeBrainLog(listener: BrainLogListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function publish(entry: BrainLogEntry): void {
  for (const listener of listeners) {
    try {
      listener(entry)
    } catch {
      // Il monitor visivo non deve mai interrompere la pipeline che osserva.
    }
  }
}

export function brainLog(stage: string, message: string, data?: unknown): void {
  const prefix = `[Brain][${stage}] ${message}`
  if (data === undefined) console.info(prefix)
  else console.info(`${prefix}\n${serialize(data)}`)
  publish({
    level: 'info',
    stage,
    message,
    data,
    timestamp: performance.now(),
  })
}

export function brainWarn(stage: string, message: string, data?: unknown): void {
  const prefix = `[Brain][${stage}] ${message}`
  if (data === undefined) console.warn(prefix)
  else console.warn(`${prefix}\n${serialize(data)}`)
  publish({
    level: 'warn',
    stage,
    message,
    data,
    timestamp: performance.now(),
  })
}

function serialize(data: unknown): string {
  try {
    return JSON.stringify(
      data,
      (_key, value: unknown) => {
        if (!(value instanceof Error)) return value
        return {
          name: value.name,
          message: value.message,
          stack: value.stack,
          cause: value.cause,
        }
      },
      2,
    )
  } catch {
    return String(data)
  }
}
