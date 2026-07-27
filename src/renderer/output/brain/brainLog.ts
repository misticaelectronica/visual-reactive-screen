export function brainLog(stage: string, message: string, data?: unknown): void {
  const prefix = `[Brain][${stage}] ${message}`
  if (data === undefined) console.info(prefix)
  else console.info(`${prefix}\n${serialize(data)}`)
}

export function brainWarn(stage: string, message: string, data?: unknown): void {
  const prefix = `[Brain][${stage}] ${message}`
  if (data === undefined) console.warn(prefix)
  else console.warn(`${prefix}\n${serialize(data)}`)
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
